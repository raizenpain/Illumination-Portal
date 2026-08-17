// ============================================
// RANK / STAR POPUP
//
// The "Congratulations!" badge popup shown when a student earns a star
// or reaches a new rank. Injects its own markup into the page on first
// use, so puzzle.html and season.html (the only two pages that ever
// trigger it, via app.js / season.js) don't need to hand-carry it.
//
// Two render functions only — no show/hide/timing logic here. Each
// caller's own popup queue (already handling sequencing + auto-dismiss
// timers for the existing achievement popup) owns that; this module
// just fills in the DOM for whichever variant is being shown.
// ============================================

import { RANK_ICON } from './rank.js';

const POPUP_HTML = `
  <div id="rankPopup" class="popup-overlay hidden">
    <div class="popup-box">
      <p class="popup-kicker" id="rankPopupKicker">Congratulations!</p>
      <p class="popup-sub" id="rankPopupSub">You have now reached:</p>
      <div class="popup-body">
        <div class="popup-badge">
          <div class="rays"></div>
          <div class="glow"></div>
          <div class="ring" id="rankPopupIcon">⭐</div>
        </div>
        <div class="popup-info">
          <p class="eyebrow-small" id="rankPopupEyebrow">New Rank</p>
          <h2 id="rankPopupHeading">Disciple</h2>
          <div class="popup-stars hidden" id="rankPopupStars"></div>
          <p id="rankPopupDetail"></p>
        </div>
      </div>
      <button class="popup-continue hidden" id="rankPopupContinue" type="button">Continue</button>
    </div>
  </div>
`;

export function ensureRankPopup() {
  if (document.getElementById('rankPopup')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = POPUP_HTML.trim();
  document.body.appendChild(wrap.firstElementChild);
}

function renderStars(container, stars, justEarnedIndex) {
  container.innerHTML = '';
  stars.forEach((earned, i) => {
    const span = document.createElement('span');
    span.textContent = '★';
    if (earned) span.classList.add('earned');
    if (i === justEarnedIndex) span.classList.add('just-earned');
    container.appendChild(span);
  });
}

// info: { rank, stars, justEarnedIndex, subtitle }
export function renderStarPopup(info) {
  document.getElementById('rankPopupKicker').textContent = 'A Star Ignites!';
  document.getElementById('rankPopupSub').textContent = info.subtitle;
  document.getElementById('rankPopupIcon').textContent = '★';
  document.getElementById('rankPopupEyebrow').textContent = info.rank;

  const earnedCount = info.stars.filter(Boolean).length;
  document.getElementById('rankPopupHeading').textContent = `Star ${earnedCount} of ${info.stars.length}`;

  const starsEl = document.getElementById('rankPopupStars');
  starsEl.classList.remove('hidden');
  renderStars(starsEl, info.stars, info.justEarnedIndex);

  const remaining = info.stars.length - earnedCount;
  document.getElementById('rankPopupDetail').textContent = remaining > 0
    ? `${remaining} more star${remaining === 1 ? '' : 's'} in ${info.rank}.`
    : '';

  document.getElementById('rankPopupContinue').classList.add('hidden');
}

// info: { rank, seasonName }
export function renderRankPopup(info) {
  document.getElementById('rankPopupKicker').textContent = 'Congratulations!';
  document.getElementById('rankPopupSub').textContent = 'You have now reached:';
  document.getElementById('rankPopupIcon').textContent = RANK_ICON[info.rank] || '⭐';
  document.getElementById('rankPopupEyebrow').textContent = 'New Rank';
  document.getElementById('rankPopupHeading').textContent = info.rank;
  document.getElementById('rankPopupStars').classList.add('hidden');
  document.getElementById('rankPopupDetail').textContent =
    info.seasonName ? `${info.seasonName} now tracks your next set of stars.` : '';

  document.getElementById('rankPopupContinue').classList.remove('hidden');
}
