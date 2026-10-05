// ============================================
// RANK / STAR / CHAMPION POPUP
//
// The big celebration popup for earning a star ("A Star Ignites!"),
// reaching a new rank, and finishing a whole season ("<Season>
// Champion"). Dark fantasy design (2026-10-03): obsidian card, gold
// frame, a medallion with light rays and a flare, rising embers.
// Injects its own markup on first use, so puzzle.html and season.html
// (the only pages that trigger it, via app.js / season.js) don't need
// to carry it.
//
// Every variant now waits for the student to tap Continue (Jornie: the
// old 3-second auto-close was too fast to read). The button wakes up
// after a short beat so a tap meant for the page behind can't skip it.
// Render functions only fill in the DOM; each caller's popup queue owns
// showing, hiding and sequencing.
// ============================================

import { RANK_ICON } from './rank.js';

const CONTINUE_DELAY_MS = 1200;

const CORNER_SVG = `<svg viewBox="0 0 46 46" fill="none" aria-hidden="true"><path d="M2 30 V8 Q2 2 8 2 H30" stroke="#C9923A" stroke-width="1.6"/><path d="M7 22 V11 Q7 7 11 7 H22" stroke="#E9B85A" stroke-width="1" opacity=".7"/><path d="M2 8 Q14 10 16 16 Q10 14 8 2" fill="#C9923A" opacity=".85"/><circle cx="16" cy="16" r="2.4" fill="#FFD9A0"/></svg>`;

const POPUP_HTML = `
  <div id="rankPopup" class="popup-overlay hidden">
    <div class="popup-embers" aria-hidden="true"></div>
    <div class="popup-box" role="dialog" aria-modal="true" aria-labelledby="rankPopupHeading">
      ${['tl', 'tr', 'bl', 'br'].map((c) => `<span class="popup-corner ${c}">${CORNER_SVG}</span>`).join('')}
      <p class="popup-kicker" id="rankPopupKicker">Congratulations!</p>
      <p class="popup-sub" id="rankPopupSub">You have now reached:</p>
      <div class="popup-divider"><i></i></div>
      <div class="popup-badge">
        <div class="rays"></div>
        <div class="glow"></div>
        <div class="burst"></div>
        <div class="ring" id="rankPopupIcon">⭐</div>
      </div>
      <p class="eyebrow-small" id="rankPopupEyebrow">New Rank</p>
      <h2 id="rankPopupHeading">Disciple</h2>
      <div class="popup-stars hidden" id="rankPopupStars"></div>
      <p class="popup-detail" id="rankPopupDetail"></p>
      <div class="popup-rewards hidden" id="rankPopupRewards"></div>
      <button class="popup-continue" id="rankPopupContinue" type="button">Continue</button>
    </div>
  </div>
`;

export function ensureRankPopup() {
  if (document.getElementById('rankPopup')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const wrap = document.createElement('div');
  wrap.innerHTML = POPUP_HTML.trim();
  const overlay = wrap.firstElementChild;
  const embers = overlay.querySelector('.popup-embers');
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('span');
    s.style.cssText = `--x:${Math.random() * 100}%;--s:${3 + Math.random() * 5}px;--d:${7 + Math.random() * 7}s;--delay:${-Math.random() * 12}s;--drift:${(Math.random() - 0.5) * 120}px`;
    embers.appendChild(s);
  }
  document.body.appendChild(overlay);
}

/**
 * Shows the popup (already rendered) and resolves when the student taps
 * Continue and it has faded out. Shared by app.js and season.js.
 */
export function openRankPopup() {
  return new Promise((resolve) => {
    const overlay = document.getElementById('rankPopup');
    const btn = document.getElementById('rankPopupContinue');
    overlay.classList.remove('hidden');
    // Restart the entrance animations for every popup in a queue.
    overlay.classList.remove('show');
    void overlay.offsetWidth;
    requestAnimationFrame(() => overlay.classList.add('show'));

    btn.disabled = true;
    const wake = setTimeout(() => { btn.disabled = false; btn.focus({ preventScroll: true }); }, CONTINUE_DELAY_MS);
    const onClick = () => {
      if (btn.disabled) return;
      btn.removeEventListener('click', onClick);
      clearTimeout(wake);
      overlay.classList.remove('show');
      setTimeout(() => { overlay.classList.add('hidden'); resolve(); }, 350);
    };
    btn.addEventListener('click', onClick);
  });
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

function setVariant(kind) {
  document.getElementById('rankPopup').dataset.kind = kind;
}

function setRewards(items) {
  const el = document.getElementById('rankPopupRewards');
  el.innerHTML = '';
  (items || []).forEach((html) => {
    const chip = document.createElement('span');
    chip.className = 'popup-reward';
    chip.innerHTML = html;
    el.appendChild(chip);
  });
  el.classList.toggle('hidden', !items || items.length === 0);
}

// info: { rank, stars, justEarnedIndex, subtitle, rewards? }
// rewards: [{ icon, label, amount }] — the chapter's ticket bonus.
export function renderStarPopup(info) {
  setVariant('star');
  document.getElementById('rankPopupKicker').textContent = '✦ A Star Ignites! ✦';
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
    : `Every star of ${info.rank} now burns bright.`;
  setRewards((info.rewards || []).map((r) => `<span class="popup-reward-icon">${r.icon}</span> +${r.amount} ${r.label}`));
}

// info: { rank, seasonName }
export function renderRankPopup(info) {
  setVariant('rank');
  document.getElementById('rankPopupKicker').textContent = '✦ Congratulations! ✦';
  document.getElementById('rankPopupSub').textContent = 'You have now reached:';
  document.getElementById('rankPopupIcon').textContent = RANK_ICON[info.rank] || '⭐';
  document.getElementById('rankPopupEyebrow').textContent = 'New Rank';
  document.getElementById('rankPopupHeading').textContent = info.rank;
  document.getElementById('rankPopupStars').classList.add('hidden');
  document.getElementById('rankPopupDetail').textContent =
    info.seasonName ? `${info.seasonName} now tracks your next set of stars.` : '';
  setRewards(null);
}

// info: { seasonName, subtitle, tokenBonus }
export function renderChampionPopup(info) {
  setVariant('champion');
  document.getElementById('rankPopupKicker').textContent = '✦ Season Complete ✦';
  document.getElementById('rankPopupSub').textContent = info.subtitle ? `— ${info.subtitle} —` : '';
  document.getElementById('rankPopupIcon').textContent = '👑';
  document.getElementById('rankPopupEyebrow').textContent = 'Champion';
  document.getElementById('rankPopupHeading').textContent = `${info.seasonName} Champion`;
  document.getElementById('rankPopupStars').classList.add('hidden');
  document.getElementById('rankPopupDetail').textContent = `You have conquered the ${info.seasonName}. Your certificate awaits.`;
  setRewards(info.tokenBonus
    ? [`<img src="assets/unlock-token.png" alt=""> +${info.tokenBonus} Unlock Token${info.tokenBonus === 1 ? '' : 's'}`]
    : null);
}
