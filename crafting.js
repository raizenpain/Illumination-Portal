// ============================================
// ARTIFACT CRAFTING — Crafting Status chain view + the 30-artifact
// grid, nested together in one panel per dashboard placement (main
// column, above Recent Activity).
//
// Purchase rule: tiers 1-4 artifacts OUTSIDE the student's chosen
// Legendary chain are free-order collectibles (token cost only).
// Artifacts INSIDE the chosen chain must be bought tier1->2->3->4 in
// order for that specific chain — already-owned items (e.g. bought
// before choosing this chain) already count, per the source spec's
// "extra items... contribute if the student switches" note. Tier 5
// is never purchased directly; it auto-unlocks once all 4 chain
// prerequisites are owned.
// ============================================

import { db, doc, setDoc, updateDoc, arrayUnion, runTransaction } from './firebase.js';
import { logActivity } from './activity.js';
import {
  TIERS, ARTIFACTS, CRAFTING_CHAINS,
  artifactIconPath, chainForTier5, tokenCostFor
} from './artifacts.js';
import { getRankProgress } from './rank.js';

let email = null;
let name = null;
let studentData = null;

export async function initCrafting({ email: e, name: n, studentData: data, prelimDone }) {
  const wrap = document.getElementById('craftingWrap');
  if (!wrap) return;

  email = e;
  name = n;
  studentData = data;

  const overlay = document.getElementById('craftingLockOverlay');

  if (prelimDone) {
    wrap.classList.remove('is-locked');
    overlay.classList.add('hidden');
  } else {
    // Render for real even while locked — the CSS blur needs actual
    // content behind it to create the "indistinct shapes" preview
    // effect the spec asks for, not an empty box with a lock icon.
    wrap.classList.add('is-locked');
    overlay.classList.remove('hidden');
  }

  // Catches the case where a student already owned the full chain
  // before reaching Apostle — the legendary should grant itself the
  // moment they rank up, not wait for their next purchase click.
  await checkTier5AutoUnlock();

  renderCrafting();
}

function ownedList() {
  return studentData.ownedArtifacts || [];
}

function isOwned(id) {
  return ownedList().includes(id);
}

function renderCrafting() {
  renderChainArea();
  renderGridArea();
}

// ================================
// CHAIN AREA — legendary picker, or the 5-node chain progress view
// ================================

function renderChainArea() {
  const area = document.getElementById('craftingChainArea');
  const chosen = studentData.chosenLegendaryChain;

  if (!chosen) {
    area.innerHTML = `<p class="section-subtitle">Choose the Legendary Artifact you want to forge — the tickets/tokens you already have carry over.</p>`;

    const grid = document.createElement('div');
    grid.className = 'legendary-picker-grid';

    CRAFTING_CHAINS.forEach((chainInfo) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'legendary-pick-btn';
      btn.innerHTML = `
        <img src="${artifactIconPath(chainInfo.tier5Id)}" alt="${chainInfo.tier5Name}">
        <span>${chainInfo.tier5Name}</span>
      `;
      btn.onclick = () => chooseChain(chainInfo.tier5Id);
      grid.appendChild(btn);
    });

    area.appendChild(grid);
    return;
  }

  const chainInfo = chainForTier5(chosen);
  const fullChain = [...chainInfo.chain, chosen]; // 4 prerequisites + the legendary itself

  area.innerHTML = `
    <div class="crafting-chain-header">
      <span class="section-subtitle">Pursuing: <strong>${chainInfo.tier5Name}</strong></span>
      <button type="button" class="back-btn crafting-change-btn" id="craftingChangeBtn">Change Target</button>
    </div>
  `;

  const row = document.createElement('div');
  row.className = 'crafting-chain-row';

  fullChain.forEach((id, i) => {
    const owned = isOwned(id);
    const node = document.createElement('div');
    node.className = `crafting-chain-node ${owned ? 'state-owned' : 'state-pending'}`;
    node.innerHTML = `
      <div class="crafting-chain-icon-frame">
        <img src="${artifactIconPath(id)}" alt="${findArtifactName(id)}">
      </div>
      <span class="crafting-chain-label">${findArtifactName(id)}</span>
    `;
    row.appendChild(node);

    if (i < fullChain.length - 1) {
      const connector = document.createElement('div');
      connector.className = `crafting-chain-connector${owned ? ' is-lit' : ''}`;
      row.appendChild(connector);
    }
  });

  area.appendChild(row);

  document.getElementById('craftingChangeBtn').onclick = () => {
    if (!confirm(`Change your target Legendary Artifact away from ${chainInfo.tier5Name}? Any artifacts you already own are kept — chain order will just apply to your new target instead.`)) return;
    chooseChain(null);
  };
}

function findArtifactName(id) {
  for (const tierArtifacts of Object.values(ARTIFACTS)) {
    const match = tierArtifacts.find((a) => a.id === id);
    if (match) return match.name;
  }
  return id;
}

async function chooseChain(tier5Id) {
  await setDoc(doc(db, 'students', email), { chosenLegendaryChain: tier5Id }, { merge: true });
  studentData.chosenLegendaryChain = tier5Id;
  await checkTier5AutoUnlock();
  renderCrafting();
}

// ================================
// GRID AREA — all 30 artifacts, grouped by tier
// ================================

function artifactState(id, tier) {
  if (isOwned(id)) return { kind: 'owned' };

  if (tier === 5) {
    if (studentData.chosenLegendaryChain !== id) return { kind: 'tier5-other' };

    const chainInfo = chainForTier5(id);
    const chainComplete = chainInfo.chain.every((cid) => isOwned(cid));
    if (chainComplete && !getRankProgress(studentData).legendaryEligible) {
      return { kind: 'tier5-rank-locked' };
    }
    return { kind: 'tier5-pending' };
  }

  const chosen = studentData.chosenLegendaryChain;
  const chainInfo = chosen ? chainForTier5(chosen) : null;
  const chainIndex = chainInfo ? chainInfo.chain.indexOf(id) : -1;

  if (chainIndex > 0) {
    const priorOwned = chainInfo.chain.slice(0, chainIndex).every((cid) => isOwned(cid));
    if (!priorOwned) return { kind: 'chain-locked' };
  }

  const cost = tokenCostFor(id, tier);
  const tokens = studentData.unlockTokens || 0;

  return tokens < cost ? { kind: 'need-tokens', cost } : { kind: 'buyable', cost };
}

// Tier 1+2 and Tier 3+4 pair up side by side (they're the "basic"
// tiers students churn through fastest); Tier 5 stays its own
// full-width row since there's only ever one to show at a time.
const TIER_ROWS = [[1, 2], [3, 4], [5]];

function renderGridArea() {
  const area = document.getElementById('craftingGridArea');
  area.innerHTML = '';

  TIER_ROWS.forEach((tierNumbers) => {
    const row = document.createElement('div');
    row.className = tierNumbers.length === 2 ? 'artifact-tier-pair' : 'artifact-tier-solo';

    tierNumbers.forEach((tierNumber) => {
      const tierMeta = TIERS.find((t) => t.tier === tierNumber);
      row.appendChild(buildTierBlock(tierMeta));
    });

    area.appendChild(row);
  });
}

function buildTierBlock({ tier, name: tierName, accent }) {
  const tierBlock = document.createElement('div');
  tierBlock.className = 'artifact-tier-block';
  tierBlock.style.setProperty('--tier-accent', accent);

  const heading = document.createElement('h4');
  heading.className = 'artifact-tier-heading';
  heading.textContent = `Tier ${tier} — ${tierName}`;
  tierBlock.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = tier < 5 ? 'artifact-grid artifact-grid-compact' : 'artifact-grid artifact-grid-tier5';

  ARTIFACTS[tier].forEach((a) => {
    grid.appendChild(buildArtifactCard(a, tier));
  });

  tierBlock.appendChild(grid);
  return tierBlock;
}

function buildArtifactCard(a, tier) {
  const state = artifactState(a.id, tier);

  const card = document.createElement('div');
  card.className = `artifact-card state-${state.kind}${tier === 5 ? ' artifact-card-tier5' : ''}`;

  let statusHtml = '';
  if (state.kind === 'owned') {
    statusHtml = `<span class="artifact-status-badge">✓ Owned</span>`;
  } else if (state.kind === 'tier5-pending') {
    statusHtml = `<span class="artifact-status-badge">🔒 Complete the chain</span>`;
  } else if (state.kind === 'tier5-rank-locked') {
    statusHtml = `<span class="artifact-status-badge">🔒 Reach Apostle — all stars</span>`;
  } else if (state.kind === 'tier5-other') {
    statusHtml = `<span class="artifact-status-badge">🔒 Not your target</span>`;
  } else if (state.kind === 'chain-locked') {
    statusHtml = `<span class="artifact-status-badge">🔒 Unlock earlier tier first</span>`;
  } else if (state.kind === 'need-tokens') {
    statusHtml = `<span class="artifact-status-badge">Need ${state.cost}<img src="assets/unlock-token.png" class="inline-icon" alt=""></span>`;
  } else if (state.kind === 'buyable') {
    statusHtml = `<button type="button" class="submit-quiz-btn artifact-buy-btn" data-artifact-id="${a.id}" data-tier="${tier}">Buy · ${state.cost}<img src="assets/unlock-token.png" class="inline-icon" alt=""></button>`;
  }

  card.innerHTML = `
    <div class="artifact-icon-frame">
      <img src="${artifactIconPath(a.id)}" alt="${a.name}">
    </div>
    <div class="artifact-name">${a.name}</div>
    ${statusHtml}
  `;

  const buyBtn = card.querySelector('.artifact-buy-btn');
  if (buyBtn) {
    buyBtn.disabled = purchasing;
    buyBtn.onclick = () => purchaseArtifact(a.id, tier);
  }

  return card;
}

let purchasing = false;

async function purchaseArtifact(id, tier) {
  if (purchasing) return;

  const state = artifactState(id, tier);
  if (state.kind !== 'buyable') return;

  purchasing = true;
  renderCrafting();

  let insufficientTokens = false;

  try {
    const studentRef = doc(db, 'students', email);
    let finalTokens = null;
    let finalOwned = null;

    // Reads the LIVE token balance/owned list inside the transaction,
    // not the cached studentData this panel loaded with — otherwise
    // two purchases (or a purchase racing a ticket trade) in different
    // tabs could clobber each other's whole-object write.
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(studentRef);
      const data = snap.data() || {};
      const liveTokens = data.unlockTokens || 0;
      const liveOwned = data.ownedArtifacts || [];

      if (liveOwned.includes(id)) {
        finalTokens = liveTokens;
        finalOwned = liveOwned;
        return;
      }
      if (liveTokens < state.cost) {
        insufficientTokens = true;
        throw new Error('insufficient-tokens');
      }

      finalTokens = liveTokens - state.cost;
      finalOwned = [...liveOwned, id];
      tx.update(studentRef, { unlockTokens: finalTokens, ownedArtifacts: finalOwned });
    });

    studentData.unlockTokens = finalTokens;
    studentData.ownedArtifacts = finalOwned;
    await checkTier5AutoUnlock();
  } catch (err) {
    if (!insufficientTokens) console.error('Artifact purchase failed:', err);
  }

  purchasing = false;
  renderCrafting();
}

async function checkTier5AutoUnlock() {
  const chosen = studentData.chosenLegendaryChain;
  if (!chosen || isOwned(chosen)) return;

  const chainInfo = chainForTier5(chosen);
  if (!chainInfo) return;

  const allOwned = chainInfo.chain.every((id) => isOwned(id));
  if (!allOwned) return;

  if (!getRankProgress(studentData).legendaryEligible) return;

  const ownedArtifacts = [...ownedList(), chosen];

  await updateDoc(doc(db, 'students', email), { ownedArtifacts: arrayUnion(chosen) });
  studentData.ownedArtifacts = ownedArtifacts;

  logActivity({
    email, name, type: 'artifact',
    title: `Forged the Legendary ${chainInfo.tier5Name}!`,
    icon: '🏆'
  });
}
