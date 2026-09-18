// ============================================
// THE MUSTARD SEED — dedicated game page controller. Same shape as
// vault-evangelization.js/scriptorium.js: one page-specific script that
// owns all the DOM under #msdRoot, built entirely on top of the shared
// mustardSeed.js (game logic/writes, already verified against the
// firestore.rules anti-cheat suite) and mustardSeedContent.js (content/
// stage schedule) modules the dashboard card already uses too.
//
// Growth-stage art here is a CSS/emoji placeholder (a soil mound + the
// stage's own icon, with a warm glow that grows with the plant), per
// the spec's own "use placeholders until final assets supplied"
// instruction -- swappable for real illustrations later without
// touching any game logic.
// ============================================

import { db, doc, getDoc } from './firebase.js';
import { requireLogin } from './auth.js';
import { ADMIN_EMAILS } from './admins.js';
import {
  plant, water, fertilize, submitReflection, claimFruit, checkAndAdvanceStage,
  currentStageInfo, nextStageCountdown, daysSincePlanted,
  hasWateredToday, hasFertilizedToday, hasReflectedToday, isFertilizeOnCooldown,
  todaysReflectionPrompt
} from './mustardSeed.js';
import { INTRO_TEXT, GROWTH_STAGES, MESSAGES, MAX_HEALTH, FERTILIZE_COOLDOWN_DAYS, MUSTARD_SEED_UNLOCKED } from './mustardSeedContent.js';

const user = requireLogin();
// Locked for everyone except admins while MUSTARD_SEED_UNLOCKED is
// false -- same "typed the URL directly" defense the Vault Games pages
// already use (see e.g. evangelization.js), except this one also lets
// an admin straight through, so testing doesn't need the flag flipped
// live for every student first.
if (user && (MUSTARD_SEED_UNLOCKED || ADMIN_EMAILS.includes(user.email))) {
  init(user);
} else if (user) {
  window.location.href = 'dashboard.html';
}

async function init({ email, name }) {
  const root = document.getElementById('msdRoot');
  root.innerHTML = '<p class="msd-loading">Loading your garden&hellip;</p>';

  const ref = doc(db, 'students', email);
  const snap = await getDoc(ref);
  const data = snap.data() || {};

  // Lazy catch-up, same idiom dashboard.html now also runs on every
  // load -- doing it again here means opening the game page directly
  // (not via the dashboard card) still catches a student up.
  const advancedTo = await checkAndAdvanceStage({ email, name: data.name || name, data });

  render({ email, name: data.name || name, data, advancedTo });
}

function render({ email, name, data, advancedTo }) {
  const root = document.getElementById('msdRoot');
  const ms = data.mustardSeed;

  if (!ms || !ms.plantedAt) {
    renderIntro(root, { email, name });
    return;
  }
  if (ms.gameStatus === 'completed') {
    renderCompleted(root);
    return;
  }
  renderGarden(root, { email, name, data });

  if (advancedTo) {
    const stage = GROWTH_STAGES.find((s) => s.id === advancedTo);
    if (stage) showStageUnlock(stage);
  }
}

function renderIntro(root, { email, name }) {
  root.innerHTML = `
    <div class="msd-intro">
      <div class="msd-stage-icon msd-intro-icon">🌰</div>
      <h1>${INTRO_TEXT.heading}</h1>
      <p class="msd-intro-body">${INTRO_TEXT.body}</p>
      <ul class="msd-intro-list">
        ${INTRO_TEXT.instructions.map((line) => `<li>${line}</li>`).join('')}
      </ul>
      <button type="button" class="msd-btn msd-btn-primary" id="msdPlantBtn">Plant Your Mustard Seed</button>
    </div>
  `;
  root.querySelector('#msdPlantBtn').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Planting…';
    await plant({ email, name });
    await init({ email, name });
  });
}

function renderCompleted(root) {
  root.innerHTML = `
    <div class="msd-intro msd-completed">
      <div class="msd-stage-icon">🍎</div>
      <h1>${MESSAGES.completionHeading}</h1>
      <p class="msd-intro-body">${MESSAGES.completionBody}</p>
      <a class="msd-btn msd-btn-primary" href="dashboard.html">Back to Dashboard</a>
    </div>
  `;
}

function renderGarden(root, { email, name, data }) {
  const ms = data.mustardSeed;
  const stageInfo = currentStageInfo(ms);
  const countdown = nextStageCountdown(ms);
  const days = daysSincePlanted(ms);
  const health = ms.health ?? MAX_HEALTH;
  const watered = hasWateredToday(ms);
  const fertilized = hasFertilizedToday(ms);
  const reflected = hasReflectedToday(ms);
  const cooldown = !fertilized && isFertilizeOnCooldown(ms);
  const canClaim = stageInfo.id === 'forbiddenFruit';
  const prompt = todaysReflectionPrompt();

  root.innerHTML = `
    <div class="msd-garden">
      <div class="msd-stage-stage">
        <div class="msd-glow msd-glow-stage-${stageInfo.order}"></div>
        <div class="msd-mound"></div>
        <div class="msd-stage-icon">${stageInfo.icon}</div>
      </div>
      <h1 class="msd-stage-title">${stageInfo.title}</h1>
      <p class="msd-stage-hint">${stageInfo.hint}</p>

      <div class="msd-stats">
        <span class="msd-stat-label">Health</span>
        <div class="msd-bar"><div class="msd-bar-fill" style="width:${health}%"></div></div>
        <div class="msd-stat-row">
          <span>🔥 Streak: ${ms.currentStreak || 0}d (best ${ms.longestStreak || 0}d)</span>
          <span>🕐 Day ${days}</span>
        </div>
        ${countdown ? `<p class="msd-next">${countdown.stage.title} in ${countdown.daysRemaining} day${countdown.daysRemaining === 1 ? '' : 's'}</p>` : ''}
      </div>

      <div class="msd-actions">
        <button type="button" class="msd-btn" id="msdWaterBtn" ${watered ? 'disabled' : ''}>${watered ? '✅ Watered Today' : '💧 Water'}</button>
        <button type="button" class="msd-btn" id="msdFertBtn" ${(fertilized || cooldown) ? 'disabled' : ''}>${fertilized ? '✅ Fertilized Today' : cooldown ? '⏳ Fertilizer Resting' : '🌾 Fertilize'}</button>
      </div>

      <div class="msd-reflection">
        ${reflected ? `
          <p class="msd-reflection-done">✅ ${MESSAGES.reflected}</p>
        ` : `
          <label class="msd-reflection-prompt" for="msdReflectionInput">${prompt}</label>
          <textarea id="msdReflectionInput" class="msd-reflection-input" maxlength="400" placeholder="Write a short reflection..."></textarea>
          <button type="button" class="msd-btn msd-btn-primary" id="msdReflectBtn">Submit Reflection</button>
        `}
      </div>

      ${canClaim ? '<button type="button" class="msd-btn msd-btn-claim" id="msdClaimBtn">🍎 Claim the Forbidden Fruit of Knowledge</button>' : ''}

      <p class="msd-toast" id="msdToast" hidden></p>
    </div>
  `;

  const toast = (msg) => {
    const el = root.querySelector('#msdToast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 3200);
  };

  const waterBtn = root.querySelector('#msdWaterBtn');
  if (waterBtn && !watered) {
    waterBtn.addEventListener('click', async () => {
      waterBtn.disabled = true;
      const result = await water({ email });
      if (result === 'ok') { toast(MESSAGES.watered); await init({ email, name }); }
      else { waterBtn.disabled = false; toast('Already watered today.'); }
    });
  }

  const fertBtn = root.querySelector('#msdFertBtn');
  if (fertBtn && !fertilized && !cooldown) {
    fertBtn.addEventListener('click', async () => {
      fertBtn.disabled = true;
      const result = await fertilize({ email });
      if (result === 'ok') { toast(MESSAGES.fertilized); await init({ email, name }); }
      else {
        fertBtn.disabled = false;
        toast(result === 'cooldown' ? MESSAGES.fertilizeCooldown(FERTILIZE_COOLDOWN_DAYS) : 'Not available right now.');
      }
    });
  }

  const reflectBtn = root.querySelector('#msdReflectBtn');
  if (reflectBtn) {
    reflectBtn.addEventListener('click', async () => {
      const textEl = root.querySelector('#msdReflectionInput');
      const text = textEl.value;
      if (!text.trim()) { toast('Write a short reflection first.'); return; }
      reflectBtn.disabled = true;
      const result = await submitReflection({ email, text });
      if (result === 'ok') { toast(MESSAGES.reflected); await init({ email, name }); }
      else {
        reflectBtn.disabled = false;
        toast(result === 'too-long' ? 'Please keep it under 400 characters.' : 'Already reflected today.');
      }
    });
  }

  const claimBtn = root.querySelector('#msdClaimBtn');
  if (claimBtn) {
    claimBtn.addEventListener('click', async () => {
      claimBtn.disabled = true;
      const claimed = await claimFruit({ email, name });
      if (claimed) { await init({ email, name }); }
      else { claimBtn.disabled = false; toast('Not ready yet.'); }
    });
  }
}

// The stage-transition moment -- a brief overlay naming the stage just
// reached, with a soft glow pulse and rising firefly-like particles
// (same lightweight span-burst technique treasureReveal.js's
// spawnConfetti already uses, just a different shape/motion), echoing
// the night-glow reference art without needing any real art assets.
function showStageUnlock(stage) {
  const overlay = document.createElement('div');
  overlay.className = 'msd-unlock-overlay';
  overlay.innerHTML = `
    <div class="msd-unlock-card">
      <div class="msd-unlock-glow"></div>
      <div class="msd-unlock-icon">${stage.icon}</div>
      <h2>${stage.title}</h2>
      <p>${stage.unlockMessage}</p>
      <button type="button" class="msd-btn msd-btn-primary" id="msdUnlockClose">Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);
  spawnFireflies(overlay.querySelector('.msd-unlock-card'));
  overlay.querySelector('#msdUnlockClose').addEventListener('click', () => overlay.remove());
}

function spawnFireflies(container) {
  const wrap = document.createElement('div');
  wrap.className = 'msd-fireflies';
  for (let i = 0; i < 18; i++) {
    const dot = document.createElement('span');
    dot.className = 'msd-firefly';
    dot.style.setProperty('--x', `${Math.random() * 100}%`);
    dot.style.setProperty('--duration', `${2.4 + Math.random() * 1.8}s`);
    dot.style.setProperty('--delay', `${Math.random() * 1.2}s`);
    dot.style.setProperty('--drift', `${(Math.random() - 0.5) * 60}px`);
    wrap.appendChild(dot);
  }
  container.appendChild(wrap);
  setTimeout(() => wrap.remove(), 4500);
}
