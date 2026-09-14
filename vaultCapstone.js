// ============================================
// VAULT CAPSTONE — the reward for finishing every one of the 5 Vault
// Games (the whole Sanctuarium: scriptorium/loaves/vigil/illumination/
// evangelization). A 4-stage popup sequence, each stage its own
// "open it" reveal reusing showTreasureReveal()'s shell:
//   1. Treasure    -- 30 of every ticket type
//   2. Shard       -- all 3 Prelim puzzles marked solved. Deliberately
//                     does NOT display the actual puzzle codes --
//                     that would recreate a real leak risk (Puzzle 1's
//                     codes already leaked once, see puzzles.js) for
//                     no extra benefit to the student, who gets full
//                     credit either way.
//   3. Magic Stone -- Midterm season unlocked, skipping both the
//                     puzzle-completion prerequisite and the usual
//                     written-reflection gate (reflection.js)
//   4. Silver Key  -- student picks TWO Tier 1 artifacts to own for
//                     free, bypassing the ticket-trade economy
//                     (crafting.js) entirely
//
// Split into two independently-resumable stages so a student who
// closes the tab mid-sequence picks up correctly next load instead of
// re-granting or losing a stage:
//   vaultCapstoneGranted -- true once stages 1-3 are written, all in
//     ONE transaction (all-or-nothing, same guarded-transaction shape
//     every Vault Game's own awardCompletion() already uses)
//   vaultCapstoneKeyUsed -- true once the Silver Key picks are
//     confirmed (a separate transaction, since it needs the
//     student's interactive choice first)
// If granted but not yet key-used, only stage 4 (the picker) shows.
// ============================================

import { db, doc, runTransaction, increment, arrayUnion } from './firebase.js';
import { VAULT_GAMES } from './vaultGames.js';
import { TICKETS } from './vaultTickets.js';
import { ARTIFACTS, artifactIconPath } from './artifacts.js';
import { showTreasureReveal, spawnConfetti, playAchievementChime } from './treasureReveal.js';
import { logActivity } from './activity.js';

const CAPSTONE_TICKETS_PER_TYPE = 30;
const KICKER = 'The Sanctuarium Conquered';

function allVaultGamesComplete(data) {
  const progress = data.vaultGames || {};
  return Object.keys(VAULT_GAMES).every((id) => !!(progress[id] || {}).completed);
}

// Every Prelim puzzle is 9 pieces (puzzles.js), redeemed normally as
// arrayUnion(pieceNumber) -- calculateOverallProgress() in dashboard.html
// sums THIS array's length, completely separately from the *Completed
// flags, so setting only the flags would leave the progress bar/percent
// permanently understated versus the puzzle cards showing "Completed".
const FULL_PUZZLE_PIECES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Writes stages 1-3 exactly once. `ok` is false only on a real error
 *  (network/permission); `grantedNow` is true only if THIS call was the
 *  one that actually wrote the grant (false if some other session
 *  already had, or if somehow not actually eligible). Callers should
 *  treat `ok` as "the flag is true in Firestore now" and use
 *  `grantedNow` only to decide whether to play the reveal animation. */
async function grantCore(email, name) {
  const studentRef = doc(db, 'students', email);
  let grantedNow = false;

  try {
    const alreadyDone = await runTransaction(db, async (tx) => {
      const snap = await tx.get(studentRef);
      const data = snap.data() || {};
      if (data.vaultCapstoneGranted) return true;
      if (!allVaultGamesComplete(data)) return true; // not actually eligible -- nothing to do

      const updates = {
        vaultCapstoneGranted: true,
        puzzle1: FULL_PUZZLE_PIECES,
        puzzle2: FULL_PUZZLE_PIECES,
        puzzle3: FULL_PUZZLE_PIECES,
        puzzle1Completed: true,
        puzzle2Completed: true,
        puzzle3Completed: true,
        puzzle2Unlocked: true,
        puzzle3Unlocked: true,
        midtermUnlocked: true
      };
      Object.values(TICKETS).forEach(({ ticket }) => {
        updates[`tickets.${ticket}`] = increment(CAPSTONE_TICKETS_PER_TYPE);
      });
      tx.update(studentRef, updates);
      return false;
    });
    grantedNow = !alreadyDone;
  } catch (err) {
    console.error('Failed to grant Vault Capstone core reward:', err);
    return { ok: false, grantedNow: false };
  }

  if (grantedNow) {
    logActivity({
      email, name, type: 'achievement',
      title: 'Conquered every game in the Sanctuarium and opened the Vault\'s full reward',
      icon: '🏆'
    });
  }
  return { ok: true, grantedNow };
}

// dashboardButton:false on every stage here -- this is a 4-stage
// sequence (3 of these plus the Silver Key picker after), and unlike a
// single game's own one-off reward, "Back to Dashboard" navigating away
// mid-sequence would cut the reveal short. The rewards themselves are
// already safely granted in Firestore by the time this runs either way
// (grantCore() writes before any popup shows), so nothing is actually
// lost by removing the shortcut -- it just stops the student from
// skipping the rest of the reveal, and the Silver Key step, early.
async function showCoreRevealSequence() {
  await showTreasureReveal({
    iconSrc: 'assets/capstone-chest.png',
    kicker: KICKER,
    heading: 'A Treasure Awaits',
    subheading: 'Every game in the Vault is behind you now.',
    chips: Object.values(TICKETS).map((t) => `+${CAPSTONE_TICKETS_PER_TYPE} ${t.name}`),
    dashboardButton: false,
    celebration: true
  });
  await showTreasureReveal({
    iconSrc: 'assets/capstone-shard.png',
    kicker: KICKER,
    heading: 'The Shard Cracks Open',
    subheading: 'Every Prelim puzzle is marked solved, full credit for all three.',
    chips: ['✅ Puzzle 1 Solved', '✅ Puzzle 2 Solved', '✅ Puzzle 3 Solved'],
    dashboardButton: false,
    celebration: true
  });
  await showTreasureReveal({
    iconSrc: 'assets/capstone-stones.png',
    kicker: KICKER,
    heading: 'The Magic Stones Awaken',
    subheading: 'The Midterm season opens before you — no gate to pass.',
    chips: ['🔓 Midterm Season Unlocked'],
    dashboardButton: false,
    celebration: true
  });
}

const SILVER_KEY_TIER = 1;
const SILVER_KEY_PICKS = 2;

/** Stage 4: an interactive picker for TWO Tier 1 artifacts not already
 *  owned (both from the same tier, per Jornie's correction — the
 *  original idea was one Tier 1 + one Tier 2, but Tier 2 was dropped).
 *  Handles the edge case where fewer than 2 unowned Tier 1 artifacts
 *  remain by lowering the required pick count to whatever's left,
 *  rather than blocking forever. */
function showSilverKeyPicker({ email, name, data, preview = false }) {
  return new Promise((resolve) => {
    const owned = new Set(data.ownedArtifacts || []);
    const choices = ARTIFACTS[SILVER_KEY_TIER].filter((a) => !owned.has(a.id));
    const requiredPicks = Math.min(SILVER_KEY_PICKS, choices.length);
    const picked = new Set();

    const overlay = document.createElement('div');
    overlay.className = 'treasure-popup';

    const gridHtml = !choices.length
      ? `<p class="capstone-key-empty">You already own every Tier 1 artifact — nothing left to pick here.</p>`
      : `
        <div class="capstone-key-grid">
          ${choices.map((a) => `
            <div class="artifact-card capstone-pick-card" data-id="${a.id}" tabindex="0" role="button">
              <div class="artifact-icon-frame"><img src="${artifactIconPath(a.id)}" alt=""></div>
              <div class="artifact-name">${a.name}</div>
            </div>
          `).join('')}
        </div>
      `;

    overlay.innerHTML = `
      <div class="treasure-box celebration" data-stage="chest">
        <p class="treasure-kicker">${KICKER}</p>
        <div class="treasure-stage">
          <div class="treasure-glow"></div>
          <div class="treasure-icon-frame">
            <img src="assets/capstone-key.png" alt="">
            <div class="treasure-shine"></div>
          </div>
          <div class="treasure-sparkles">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
        <h2 class="treasure-heading">The Silver Key</h2>
        <p class="treasure-sub">Turn it, and choose ${requiredPicks || 'your'} Tier 1 artifact${requiredPicks === 1 ? '' : 's'} to keep — no tokens spent.</p>
        <button type="button" class="treasure-open-btn">Turn the Key</button>
      </div>
      <div class="treasure-box celebration hidden" data-stage="reveal">
        <h2 class="treasure-heading">The Silver Key</h2>
        <p class="treasure-sub">Choose ${requiredPicks} Tier 1 artifact${requiredPicks === 1 ? '' : 's'}. Your pick is final.</p>
        <p class="capstone-key-tier-label">Tier 1 — Common Artifacts</p>
        ${gridHtml}
        <div class="treasure-actions">
          <button type="button" class="treasure-close-btn capstone-key-confirm" disabled>Confirm Choices</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const chestStage = overlay.querySelector('[data-stage="chest"]');
    const revealStage = overlay.querySelector('[data-stage="reveal"]');
    const confirmBtn = overlay.querySelector('.capstone-key-confirm');

    function refreshConfirm() {
      confirmBtn.disabled = requiredPicks > 0 && picked.size !== requiredPicks;
    }
    refreshConfirm();

    overlay.querySelectorAll('.capstone-pick-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        if (picked.has(id)) {
          picked.delete(id);
          card.classList.remove('selected');
        } else if (picked.size < requiredPicks) {
          picked.add(id);
          card.classList.add('selected');
        }
        refreshConfirm();
      });
    });

    overlay.querySelector('.treasure-open-btn').addEventListener('click', () => {
      chestStage.classList.add('hidden');
      revealStage.classList.remove('hidden');
      spawnConfetti(revealStage);
      playAchievementChime();
    });

    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      const toGrant = [...picked];

      if (preview) {
        // Preview mode never touches Firestore -- just show the pick was
        // "sealed" for a moment so the flow still feels complete.
        confirmBtn.textContent = 'Sealed (preview — nothing saved)';
        setTimeout(() => { overlay.remove(); resolve(); }, 900);
        return;
      }

      confirmBtn.textContent = 'Sealing…';
      const studentRef = doc(db, 'students', email);
      try {
        const updates = { vaultCapstoneKeyUsed: true };
        if (toGrant.length) updates.ownedArtifacts = arrayUnion(...toGrant);
        // Report back whether THIS call actually wrote anything, so the
        // activity log below can't fire for a no-op transaction (e.g. the
        // same student confirming in two tabs -- the second tab's write
        // is skipped by the already-used guard, but toGrant.length alone
        // can't see that).
        const wroteIt = await runTransaction(db, async (tx) => {
          const snap = await tx.get(studentRef);
          const d = snap.data() || {};
          if (d.vaultCapstoneKeyUsed) return false; // already used in another session
          tx.update(studentRef, updates);
          return true;
        });
        if (wroteIt && toGrant.length) {
          logActivity({
            email, name, type: 'artifact',
            title: `Turned the Silver Key and claimed ${toGrant.length} free artifact${toGrant.length > 1 ? 's' : ''}`,
            icon: '🗝️'
          });
        }
      } catch (err) {
        console.error('Failed to grant Silver Key artifacts:', err);
      }
      overlay.remove();
      resolve();
    });
  });
}

/** ?previewCapstone=1 in the dashboard URL plays the full 4-stage
 *  sequence for anyone, regardless of actual Vault progress -- same
 *  "content preview via URL param" pattern already used for the
 *  catechism/reward previews inside the games themselves (see
 *  maybeShowPreview() in evangelization.js). Never touches Firestore:
 *  stages 1-3 are pure UI (showCoreRevealSequence doesn't write
 *  anything on its own -- only grantCore() does, which this never
 *  calls), and the Silver Key picker is told preview:true so its own
 *  confirm step skips the real transaction too. Returns true if it
 *  showed the preview (caller can use this to skip the real check). */
export async function maybeShowCapstonePreview({ email, name, data }) {
  const params = new URLSearchParams(window.location.search);
  if (!params.get('previewCapstone')) return false;
  await showCoreRevealSequence();
  await showSilverKeyPicker({ email, name, data, preview: true });
  return true;
}

/** Call once per dashboard load, after the student's data has loaded.
 *  No-ops immediately if the 5 games aren't all complete yet. */
export async function checkVaultCapstone({ email, name, data }) {
  if (!allVaultGamesComplete(data)) return;

  let touchedAnything = false;

  if (!data.vaultCapstoneGranted) {
    const { ok, grantedNow } = await grantCore(email, name);
    // `ok` alone (not grantedNow) is enough to know the flag is true in
    // Firestore now -- grantedNow only distinguishes "this call did it"
    // from "another tab/session already had", so a concurrent duplicate
    // load still correctly falls through to the Silver Key check below
    // instead of getting stuck forever waiting for a reload.
    if (ok) {
      data.vaultCapstoneGranted = true;
      if (grantedNow) {
        touchedAnything = true;
        await showCoreRevealSequence();
      }
    }
  }

  if (data.vaultCapstoneGranted && !data.vaultCapstoneKeyUsed) {
    touchedAnything = true;
    await showSilverKeyPicker({ email, name, data });
  }

  // The dashboard's Ticket Trader/Crafting panels and progress bar were
  // already rendered from pre-grant data by the time this runs (it fires
  // near the end of loadStudentCard()) -- a full reload is the simplest
  // way to guarantee every one of those already-rendered panels picks up
  // the new tickets/pieces/artifacts rather than patching each by hand.
  if (touchedAnything) {
    window.location.reload();
  }
}
