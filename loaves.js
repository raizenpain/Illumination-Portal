// ============================================
// LOAVES AND FISHES — pick the right group to feed first, against the
// clock. Vanilla-JS port of the original React design (LoavesAndFishes.jsx)
// — this project ships no bundler/React, so the component's state machine
// and render tree are reproduced here with plain DOM updates instead, but
// every visual detail (parchment, hourglass, thumbs, the basket banner) is
// carried over unchanged. See vault-loaves.html for the CSS, copied
// verbatim from the component's own <style> block.
//
// THE MECHANIC
//   Each round sets out a crowd. One group among them is the right one to
//   feed first. Choose it and a thumbs up appears and the next round opens
//   itself after a moment. Choose wrong and a thumbs down appears and an
//   attempt is spent. Spend all three and the hillside empties for 30
//   seconds, after which a new crowd gathers.
//
//   Rounds grow: 4 groups, 5, 6, 7, then 8. Each guess is on a 15 second
//   glass. Letting it run out costs an attempt.
//
// The original component deliberately awards nothing itself (see its own
// header comment) and leaves rewards to the host app. Here, finishing all
// five rounds writes the Arcane of Generosity reward, then the mandatory
// catechism, then the reward popup — same shape as Scriptorium's flow.
//
// Once vaultGames.loaves.completed is true, this is a one-time challenge
// with no replay (see vaultGames.js) — init() checks that before drawing
// a single round.
// ============================================

import { db, doc, getDoc, updateDoc, runTransaction, increment, arrayUnion } from './firebase.js';
import { requireLogin } from './auth.js';
import { logActivity } from './activity.js';
import { vaultGameBadgeId, VAULT_UNLOCKED } from './vaultGames.js';
import { showTreasureReveal } from './treasureReveal.js';
import { TICKETS } from './vaultTickets.js';
import {
  TIME_PER_GUESS, ADVANCE_DELAY, ATTEMPTS_PER_ROUND, COOLDOWN, LEVELS, LOAVES, FISH,
  CROWD, ARCANE_OF_GENEROSITY_REWARD, CATECHISM, CATECHISM_MIN_SECONDS
} from './loavesContent.js';

const { email, name } = requireLogin();

const root = document.getElementById('lnfRoot');

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/** Draw the crowd for a round: level + 3 groups, one of them the right one. */
function makeRound(level) {
  const n = level + 3;
  const picked = [];
  const bag = [...CROWD];
  for (let i = 0; i < n; i++) {
    picked.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  }
  return {
    id: 'L' + level + '-' + Math.random().toString(36).slice(2, 8),
    level,
    groups: picked.map((n) => ({ name: n })),
    correctIndex: Math.floor(Math.random() * n),
  };
}

/* ---------------------------------------------------------------------------
 * HOW TO PLAY — a one-time guide before round 1, identical mechanism to
 * Scriptorium's (see scriptorium.js): step cards, dots, Back/Next, Skip.
 * ------------------------------------------------------------------------- */

const GUIDE_STEPS = [
  {
    title: 'Welcome to the Hillside',
    body: 'A crowd has gathered, arranged into groups. One group is the right one to feed first. Choose it before the sand runs out.'
  },
  {
    title: 'The Clock',
    body: "Each guess gives you 15 seconds, shown by the hourglass. Letting it run out costs you an attempt, same as guessing wrong."
  },
  {
    title: 'Three Attempts',
    body: 'You get three tries per round. A wrong guess marks that group and costs an attempt — pick again among what remains. A right guess and the next hillside gathers on its own.'
  },
  {
    title: 'The Crowd Grows',
    body: 'Five rounds, each harder than the last: 4 groups, then 5, 6, 7, and finally 8. The right group is chosen at random every time — nothing can be learned or predicted between attempts.'
  },
  {
    title: 'If a Round Is Lost',
    body: "Spending all three attempts empties the hillside for 30 seconds. A new crowd gathers afterward, arranged differently — losing a round doesn't end your run."
  },
  {
    title: 'The Reward',
    body: 'Feed every hillside — all five rounds — to open the Arcane of Generosity. The reward is the same whether you finish clean or with marks against you, so take your time and learn as you go.'
  }
];

function showGuide(onDone) {
  let step = 0;

  const overlay = document.createElement('div');
  overlay.className = 'lnf-guide-overlay';
  overlay.innerHTML = `
    <div class="lnf-sheet lnf-guide-card">
      <p class="lnf-guide-step-label" id="guideStepLabel"></p>
      <h3 class="lnf-guide-title" id="guideTitle"></h3>
      <p class="lnf-guide-body" id="guideBody"></p>
      <div class="lnf-guide-dots" id="guideDots"></div>
      <div class="lnf-guide-actions">
        <button type="button" class="lnf-ghost" id="guideBackBtn">Back</button>
        <button type="button" class="lnf-go" id="guideNextBtn">Next</button>
      </div>
      <button type="button" class="lnf-guide-skip" id="guideSkipBtn">Skip the guide</button>
    </div>
  `;
  root.appendChild(overlay);

  const stepLabelEl = overlay.querySelector('#guideStepLabel');
  const titleEl = overlay.querySelector('#guideTitle');
  const bodyEl = overlay.querySelector('#guideBody');
  const dotsEl = overlay.querySelector('#guideDots');
  const backBtn = overlay.querySelector('#guideBackBtn');
  const nextBtn = overlay.querySelector('#guideNextBtn');
  const skipBtn = overlay.querySelector('#guideSkipBtn');

  dotsEl.innerHTML = GUIDE_STEPS.map(() => '<span class="lnf-guide-dot"></span>').join('');
  const dots = Array.from(dotsEl.children);

  function renderGuideStep() {
    const s = GUIDE_STEPS[step];
    stepLabelEl.textContent = `Page ${step + 1} of ${GUIDE_STEPS.length}`;
    titleEl.textContent = s.title;
    bodyEl.textContent = s.body;
    dots.forEach((d, i) => d.classList.toggle('is-active', i === step));
    backBtn.style.visibility = step === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = step === GUIDE_STEPS.length - 1 ? 'Begin' : 'Next';
  }

  function close() {
    overlay.remove();
    onDone();
  }

  backBtn.addEventListener('click', () => { if (step > 0) { step -= 1; renderGuideStep(); } });
  nextBtn.addEventListener('click', () => {
    if (step < GUIDE_STEPS.length - 1) { step += 1; renderGuideStep(); }
    else close();
  });
  skipBtn.addEventListener('click', close);

  renderGuideStep();
}

function markGuideSeen() {
  updateDoc(doc(db, 'students', email), { 'seenGameGuides.loaves': true }).catch((err) => {
    console.error('Failed to save Loaves and Fishes guide completion:', err);
  });
}

/* ---------------------------------------------------------------------------
 * THE CATECHISM — shown once, between the last basket and the Arcane of
 * Generosity popup. Identical mechanism to Scriptorium's: no skip, no
 * close, gated on both a minimum read-timer and scrolling to the end.
 * ------------------------------------------------------------------------- */

function showCatechism(onDone) {
  let secondsLeft = CATECHISM_MIN_SECONDS;
  let reachedEnd = false;

  const overlay = document.createElement('div');
  overlay.className = 'lnf-guide-overlay lnf-catechism-overlay';
  overlay.innerHTML = `
    <div class="lnf-sheet lnf-guide-card lnf-catechism-card">
      <div class="lnf-catechism-scroll" id="catechismScroll">
        <h3 class="lnf-guide-title">${esc(CATECHISM.title)}</h3>
        <p class="lnf-catechism-intro">${esc(CATECHISM.intro)}</p>
        ${CATECHISM.sections.map((s) => `
          <div class="lnf-catechism-section">
            <h4 class="lnf-catechism-heading">${esc(s.heading)}</h4>
            ${s.body ? `<p class="lnf-guide-body">${esc(s.body)}</p>` : ''}
            ${s.list ? `
              <ul class="lnf-catechism-list">
                ${s.list.map((item) => `<li><strong>${esc(item.label)}</strong> — ${esc(item.body)}</li>`).join('')}
              </ul>
            ` : ''}
            ${s.quote ? `
              <blockquote class="lnf-catechism-quote">
                “${esc(s.quote)}”
                <cite>— ${esc(s.quoteSource)}</cite>
              </blockquote>
            ` : ''}
          </div>
        `).join('')}
        <div id="catechismEndMarker"></div>
      </div>
      <div class="lnf-catechism-footer">
        <p class="lnf-catechism-status" id="catechismStatus"></p>
        <button type="button" class="lnf-go" id="catechismContinue" disabled>Continue</button>
      </div>
    </div>
  `;
  root.appendChild(overlay);

  const scrollEl = overlay.querySelector('#catechismScroll');
  const endMarker = overlay.querySelector('#catechismEndMarker');
  const statusEl = overlay.querySelector('#catechismStatus');
  const continueBtn = overlay.querySelector('#catechismContinue');

  function updateButton() {
    if (secondsLeft > 0) {
      continueBtn.disabled = true;
      statusEl.textContent = `Take your time — ${secondsLeft}s`;
    } else if (!reachedEnd) {
      continueBtn.disabled = true;
      statusEl.textContent = 'Scroll to the end to continue.';
    } else {
      continueBtn.disabled = false;
      statusEl.textContent = 'You may continue.';
    }
  }

  const tickHandle = setInterval(() => {
    secondsLeft = Math.max(0, secondsLeft - 1);
    updateButton();
    if (secondsLeft === 0) clearInterval(tickHandle);
  }, 1000);

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      reachedEnd = true;
      updateButton();
    }
  }, { root: scrollEl, threshold: 0.99 });
  observer.observe(endMarker);

  continueBtn.addEventListener('click', () => {
    if (continueBtn.disabled) return;
    clearInterval(tickHandle);
    observer.disconnect();
    overlay.remove();
    onDone();
  });

  updateButton();
}

/* ---------------------------------------------------------------------------
 * Drawings — the basket banner, thumbs, and hourglass. All inline SVG,
 * ported verbatim from the component.
 * ------------------------------------------------------------------------- */

function basketBannerSvg() {
  return `
    <svg class="lnf-banner" viewBox="0 0 640 250" aria-hidden="true">
      <defs>
        <radialGradient id="lnf-halo-g" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#f6e8c4" stop-opacity="0.9" />
          <stop offset="55%" stop-color="#dcc094" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#a9885a" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="lnf-loaf-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e2b877" />
          <stop offset="100%" stop-color="#a06c2c" />
        </linearGradient>
        <linearGradient id="lnf-fish-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#a9ac9c" />
          <stop offset="100%" stop-color="#5c6357" />
        </linearGradient>
        <linearGradient id="lnf-basket-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#b98c4f" />
          <stop offset="100%" stop-color="#5f3f1c" />
        </linearGradient>
        <clipPath id="lnf-inside">
          <path d="M176 132 H464 C458 190 400 214 320 214 C240 214 182 190 176 132 Z" />
        </clipPath>
      </defs>

      <ellipse cx="320" cy="120" rx="300" ry="118" fill="url(#lnf-halo-g)" />
      <path class="lnf-hill" d="M0 186 q90 -36 190 -8 q120 36 240 -14 q120 -48 210 4 V250 H0 Z" />

      <g class="lnf-b-loaf">
        <ellipse cx="268" cy="82" rx="50" ry="37" />
        <ellipse cx="374" cy="80" rx="52" ry="38" />
        <ellipse cx="228" cy="108" rx="46" ry="36" />
        <ellipse cx="320" cy="98" rx="54" ry="40" />
        <ellipse cx="412" cy="106" rx="48" ry="37" />
        <path
          class="lnf-b-crust"
          d="M240 76 q28 -20 56 -2 M348 74 q26 -20 54 -2 M202 102 q26 -18 52 -2 M294 92 q26 -20 54 -2 M386 100 q26 -18 52 -2"
          fill="none"
        />
      </g>

      <g class="lnf-b-fish">
        <ellipse class="lnf-b-shadow" cx="286" cy="114" rx="74" ry="13" />
        <ellipse class="lnf-b-shadow" cx="358" cy="126" rx="72" ry="12" />

        <g transform="rotate(-5 282 106)">
          <path d="M204 106 C244 76 320 76 360 106 C320 136 244 136 204 106 Z" />
          <path d="M360 106 L398 88 L398 124 Z" />
          <path class="lnf-b-gill" d="M244 86 C236 98 236 114 244 126" fill="none" />
          <circle class="lnf-b-eye" cx="228" cy="100" r="5" />
        </g>

        <g transform="rotate(4 345 120)">
          <path d="M278 120 C316 94 386 94 424 120 C386 146 316 146 278 120 Z" />
          <path d="M424 120 L458 103 L458 137 Z" />
          <path class="lnf-b-gill" d="M316 101 C309 112 309 127 316 138" fill="none" />
          <circle class="lnf-b-eye" cx="301" cy="114" r="5" />
        </g>
      </g>

      <g class="lnf-b-basket">
        <path d="M176 132 C182 196 240 224 320 224 C400 224 458 196 464 132 C440 168 380 182 320 182 C260 182 200 168 176 132 Z" />
        <ellipse class="lnf-b-rim" cx="320" cy="134" rx="146" ry="30" />
        <g class="lnf-b-weave" fill="none">
          <path d="M186 152 C226 190 414 190 454 152" />
          <path d="M194 168 C232 202 408 202 446 168" />
          <path d="M206 186 C240 214 400 214 434 186" />
          <path d="M238 146 L246 200 M286 152 L292 212 M334 154 L336 216 M382 152 L378 212 M428 146 L420 200" />
        </g>
      </g>
    </svg>
  `;
}

function thumbSvg(up, extraClass) {
  return `
    <svg class="lnf-thumb${up ? ' is-up' : ' is-down'}${extraClass ? ' ' + extraClass : ''}" viewBox="0 0 64 64" aria-hidden="true">
      <g transform="${up ? '' : 'rotate(180 32 32)'}">
        <rect class="lnf-thumb-cuff" x="8" y="30" width="14" height="24" rx="3" />
        <path
          class="lnf-thumb-hand"
          d="M24 54 V30 C24 30 30 27 32 21 C33 17 32 12 35 10 C39 8 43 11 42 17 L40 27 H52 C56 27 58 30 57 34 L54 49 C53 53 50 54 47 54 Z"
        />
      </g>
    </svg>
  `;
}

const GLASS_TOP = 16, GLASS_NECK = 52, GLASS_BOTTOM = 88;

function hourglassSvg(seconds, total, low) {
  const frac = Math.max(0, Math.min(1, seconds / total));
  const upperH = (GLASS_NECK - GLASS_TOP) * frac;
  const upperY = GLASS_NECK - upperH;
  const heapH = 4 + (GLASS_BOTTOM - GLASS_NECK - 6) * (1 - frac);
  const heapY = GLASS_BOTTOM - heapH;
  const running = seconds > 0;

  return `
    <svg class="lnf-glass${low ? ' is-low' : ''}" viewBox="0 0 64 104" aria-hidden="true">
      <defs>
        <clipPath id="lnf-bulb-top">
          <path d="M12 16 H52 C52 34 38 46 32 52 C26 46 12 34 12 16 Z" />
        </clipPath>
        <clipPath id="lnf-bulb-bottom">
          <path d="M12 88 H52 C52 70 38 58 32 52 C26 58 12 70 12 88 Z" />
        </clipPath>
      </defs>
      <rect class="lnf-glass-wood" x="6" y="6" width="52" height="8" rx="3" />
      <rect class="lnf-glass-wood" x="6" y="90" width="52" height="8" rx="3" />
      <rect class="lnf-glass-post" x="11" y="12" width="3" height="80" rx="1.5" />
      <rect class="lnf-glass-post" x="50" y="12" width="3" height="80" rx="1.5" />
      <path class="lnf-glass-bulb" d="M12 16 H52 C52 34 38 46 32 52 C26 46 12 34 12 16 Z" />
      <path class="lnf-glass-bulb" d="M12 88 H52 C52 70 38 58 32 52 C26 58 12 70 12 88 Z" />
      <g clip-path="url(#lnf-bulb-top)">
        <rect class="lnf-sandfill" x="8" y="${upperY}" width="48" height="${upperH + 1}" />
      </g>
      <g clip-path="url(#lnf-bulb-bottom)">
        <path class="lnf-sandfill" d="M6 ${GLASS_BOTTOM} H58 V${heapY} Q32 ${heapY - 9} 6 ${heapY} Z" />
      </g>
      ${running && frac > 0.02 ? `
        <rect class="lnf-stream" x="31" y="52" width="2" height="${heapY - 52}" />
        <circle class="lnf-grain g1" cx="32" cy="58" r="1.4" />
        <circle class="lnf-grain g2" cx="32" cy="58" r="1.1" />
      ` : ''}
      <path class="lnf-glass-shine" d="M18 20 C18 30 24 40 29 47" fill="none" />
    </svg>
  `;
}

/* ===========================================================================
 * GAME STATE
 * ========================================================================= */

let levelIdx = 0;
let round = null;

let wrong = [];
let attemptsLeft = ATTEMPTS_PER_ROUND;
let marks = 0;
let roundsLost = 0;

let seconds = TIME_PER_GUESS;
let screen = 'play'; // play | right | cooldown | done
let cool = COOLDOWN;
let verdict = null; // { up, text }

let timerHandle = null;
let advanceHandle = null;
let coolHandle = null;

function begin(r) {
  round = r;
  wrong = [];
  attemptsLeft = ATTEMPTS_PER_ROUND;
  seconds = TIME_PER_GUESS;
  verdict = null;
  screen = 'play';
}

function miss(gname, text) {
  const left = attemptsLeft - 1;
  marks += 1;
  attemptsLeft = left;
  seconds = TIME_PER_GUESS;
  verdict = { up: false, text };
  if (gname) wrong = [...wrong, gname];
  if (left <= 0) {
    roundsLost += 1;
    cool = COOLDOWN;
    screen = 'cooldown';
    stopTimer();
    render();
    startCooldown();
  } else {
    render();
  }
}

function choose(g, i) {
  if (screen !== 'play' || wrong.includes(g.name)) return;
  if (i === round.correctIndex) {
    verdict = { up: true, text: `${g.name} are fed first, and rightly.` };
    screen = 'right';
    stopTimer();
    render();
    startAdvance();
  } else {
    miss(g.name, `Not ${g.name}. Look again at what is asked.`);
  }
}

function newCrowd() {
  cool = COOLDOWN;
  begin(makeRound(LEVELS[levelIdx]));
  render();
  startTimer();
}

function nextRound() {
  if (levelIdx + 1 < LEVELS.length) {
    levelIdx += 1;
    begin(makeRound(LEVELS[levelIdx]));
    render();
    startTimer();
  } else {
    finish();
  }
}

function finish() {
  screen = 'done';
  stopTimer();
  render();
  revealTreasure();
}

/* ===========================================================================
 * TIMERS
 * ========================================================================= */

function startTimer() {
  stopTimer();
  timerHandle = setInterval(() => {
    if (screen !== 'play') return;
    seconds -= 1;
    if (seconds <= 0) {
      miss(null, 'The sand runs out. You have not chosen.');
      return;
    }
    renderTimerOnly();
  }, 1000);
}

function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

function startAdvance() {
  if (advanceHandle) clearTimeout(advanceHandle);
  advanceHandle = setTimeout(() => { advanceHandle = null; nextRound(); }, ADVANCE_DELAY * 1000);
}

function startCooldown() {
  if (coolHandle) clearInterval(coolHandle);
  coolHandle = setInterval(() => {
    cool -= 1;
    if (cool <= 0) {
      clearInterval(coolHandle);
      coolHandle = null;
      newCrowd();
      return;
    }
    render();
  }, 1000);
}

/* ===========================================================================
 * FIRESTORE — award once, guarded on vaultGames.loaves.completed
 * ========================================================================= */

async function awardCompletion() {
  const studentRef = doc(db, 'students', email);

  try {
    const alreadyDone = await runTransaction(db, async (tx) => {
      const snap = await tx.get(studentRef);
      const data = snap.data() || {};
      const existing = (data.vaultGames || {}).loaves;
      if (existing && existing.completed) return true;

      const updates = {
        'vaultGames.loaves.completed': true,
        'vaultGames.loaves.completedAt': new Date().toISOString(),
        achievements: arrayUnion(vaultGameBadgeId('loaves')),
        unlockTokens: increment(ARCANE_OF_GENEROSITY_REWARD.unlockTokens)
      };
      ARCANE_OF_GENEROSITY_REWARD.tickets.forEach(({ key, count }) => {
        const ticketField = TICKETS[key].ticket;
        updates[`tickets.${ticketField}`] = increment(count);
      });
      tx.update(studentRef, updates);
      return false;
    });

    if (!alreadyDone) {
      logActivity({
        email, name, type: 'vaultgame',
        title: 'Fed every hillside in Loaves and Fishes and opened the Arcane of Generosity',
        icon: '🗝️'
      });
    }
    return !alreadyDone;
  } catch (err) {
    console.error('Failed to award Loaves and Fishes completion:', err);
    return false;
  }
}

/** Every hillside is fed. Award the reward immediately (safe even if the
 *  student closes the tab during the catechism that follows), then make
 *  them sit with the catechism before they ever see the popup. */
async function revealTreasure() {
  await awardCompletion();
  showCatechism(() => {
    showTreasureReveal({
      iconSrc: 'assets/arcane-of-generosity.jpg',
      kicker: 'Loaves and Fishes Complete',
      heading: 'The Arcane of Generosity',
      subheading: 'Every hillside fed. What was given freely comes back to you multiplied.',
      chips: [
        ...ARCANE_OF_GENEROSITY_REWARD.tickets.map(({ key, count }) => `+${count} ${TICKETS[key].name}`),
        `+${ARCANE_OF_GENEROSITY_REWARD.unlockTokens} Artifact Unlock Tokens`
      ]
    });
  });
}

/* ===========================================================================
 * RENDER
 * ========================================================================= */

function subLine() {
  if (screen === 'done') return 'The baskets are gathered in.';
  if (screen === 'cooldown') return 'The hillside is quiet.';
  if (screen === 'right') return 'Well chosen.';
  return 'One group among them is to be fed first. Choose.';
}

function renderTimerOnly() {
  const timerEl = root.querySelector('.lnf-timer');
  if (!timerEl) { render(); return; }
  timerEl.innerHTML = `
    ${hourglassSvg(seconds, TIME_PER_GUESS, seconds <= 5)}
    <span class="lnf-clock${seconds <= 5 ? ' is-low' : ''}">${Math.max(0, seconds)}s</span>
  `;
}

function render() {
  const level = LEVELS[levelIdx];
  const playing = screen === 'play' || screen === 'right';

  let body = '';

  if (playing) {
    body += `
      <div class="lnf-bar">
        <div class="lnf-pips">
          ${LEVELS.map((_, i) => `<span class="lnf-pip${i < levelIdx ? ' is-done' : ''}${i === levelIdx ? ' is-here' : ''}"></span>`).join('')}
          <span class="lnf-level">Round ${level} of ${LEVELS.length} &middot; ${round.groups.length} groups</span>
        </div>
        <div class="lnf-bar-right">
          <span class="lnf-attempts">
            <span class="lnf-attempts-l">attempts</span>
            ${Array.from({ length: ATTEMPTS_PER_ROUND }).map((_, i) => `<span class="lnf-att${i >= attemptsLeft ? ' is-spent' : ''}"></span>`).join('')}
          </span>
          <div class="lnf-timer">
            ${hourglassSvg(screen === 'right' ? TIME_PER_GUESS : seconds, TIME_PER_GUESS, screen === 'play' && seconds <= 5)}
            <span class="lnf-clock${screen === 'play' && seconds <= 5 ? ' is-low' : ''}">${screen === 'right' ? '—' : `${Math.max(0, seconds)}s`}</span>
          </div>
        </div>
      </div>

      <div class="lnf-scroll">
        <div class="lnf-sheet">
          <div class="lnf-offering">
            ${basketBannerSvg()}
            <p class="lnf-offering-l">${LOAVES} loaves and ${FISH} fish</p>
          </div>

          ${verdict ? `
            <div class="lnf-verdict${verdict.up ? ' is-up' : ' is-down'}">
              ${thumbSvg(verdict.up)}
              <p>${esc(verdict.text)}</p>
            </div>
          ` : ''}

          <ul class="lnf-groups">
            ${round.groups.map((g, i) => {
              const isWrong = wrong.includes(g.name);
              const isRight = screen === 'right' && i === round.correctIndex;
              const cls = 'lnf-group' +
                (isWrong ? ' is-wrong' : '') +
                (isRight ? ' is-right' : '') +
                (screen === 'right' && i !== round.correctIndex ? ' is-dimmed' : '');
              return `
                <li>
                  <button type="button" class="${cls}" data-index="${i}" ${isWrong || screen === 'right' ? 'disabled' : ''}>
                    <span class="lnf-group-name">${esc(g.name)}</span>
                    ${isWrong ? thumbSvg(false) : ''}
                    ${isRight ? thumbSvg(true) : ''}
                  </button>
                </li>
              `;
            }).join('')}
          </ul>

          ${screen === 'right' ? `
            <div class="lnf-foot">
              <p class="lnf-advance">${levelIdx + 1 < LEVELS.length ? 'The next hillside is already gathering…' : 'Gathering the baskets…'}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } else if (screen === 'cooldown') {
    body += `
      <div class="lnf-stage">
        ${thumbSvg(false)}
        <p class="lnf-lost-line">Three attempts spent. The crowd drifts away still hungry.</p>
        <p class="lnf-cool-n">${cool}</p>
        <p class="lnf-cool-l">They gather again in ${cool === 1 ? 'a second' : `${cool} seconds`}.</p>
        <p class="lnf-cool-note">The next crowd is arranged differently, and asks something else of you.</p>
      </div>
    `;
  } else if (screen === 'done') {
    body += `
      <div class="lnf-stage">
        ${thumbSvg(true)}
        <p class="lnf-done-line">Every hillside fed.</p>
        <p class="lnf-done-sub">${marks === 0 ? 'Not one wrong hand chosen.' : `${marks} ${marks === 1 ? 'mark' : 'marks'} against you along the way.`}</p>
        <button type="button" class="lnf-go" id="lnfReturn">Return to the Cloister</button>
      </div>
    `;
  }

  root.innerHTML = `
    <header class="lnf-head">
      <div class="lnf-head-text">
        <div class="lnf-crest">
          <svg class="lnf-flourish" viewBox="0 0 64 20" aria-hidden="true">
            <path d="M0 10 H34" />
            <path d="M40 10 q6 -7 12 0 q-6 7 -12 0" />
            <circle cx="58" cy="10" r="2.2" />
          </svg>
          <h1 class="lnf-title">Loaves and Fishes</h1>
          <svg class="lnf-flourish is-right" viewBox="0 0 64 20" aria-hidden="true">
            <path d="M0 10 H34" />
            <path d="M40 10 q6 -7 12 0 q-6 7 -12 0" />
            <circle cx="58" cy="10" r="2.2" />
          </svg>
        </div>
        <p class="lnf-sub">${subLine()}</p>
      </div>
      <button type="button" class="lnf-help" id="lnfHelp">How to Play</button>
      <button type="button" class="lnf-exit" id="lnfExit">Leave</button>
    </header>
    ${body}
  `;

  wireEvents();
}

function wireEvents() {
  root.querySelectorAll('.lnf-group:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => choose(round.groups[Number(btn.dataset.index)], Number(btn.dataset.index)));
  });

  const returnBtn = root.querySelector('#lnfReturn');
  if (returnBtn) returnBtn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });

  const exitBtn = root.querySelector('#lnfExit');
  if (exitBtn) exitBtn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });

  const helpBtn = root.querySelector('#lnfHelp');
  if (helpBtn) helpBtn.addEventListener('click', () => {
    // Pause the round's clock while re-reading the guide -- it shouldn't
    // cost time just to look up how a round works.
    const wasTiming = screen === 'play' && !!timerHandle;
    if (wasTiming) stopTimer();
    showGuide(() => { if (wasTiming) startTimer(); });
  });
}

/* ===========================================================================
 * INIT — a one-time challenge. If it's already been completed, don't
 * draw a single round; show the closed-hillside notice instead.
 * ========================================================================= */

async function init() {
  // The dashboard card already hides itself while the Vault is locked, but
  // this page is still reachable by direct URL -- bounce back rather than
  // let a real awardCompletion() transaction fire before release.
  if (!VAULT_UNLOCKED) { window.location.href = 'dashboard.html'; return; }

  let data = {};
  try {
    const snap = await getDoc(doc(db, 'students', email));
    data = snap.exists() ? snap.data() : {};
  } catch (err) {
    console.error('Failed to load student record:', err);
  }

  const progress = (data.vaultGames || {}).loaves;
  if (progress && progress.completed) {
    root.innerHTML = `
      <header class="lnf-head">
        <div class="lnf-head-text">
          <div class="lnf-crest">
            <svg class="lnf-flourish" viewBox="0 0 64 20" aria-hidden="true">
              <path d="M0 10 H34" /><path d="M40 10 q6 -7 12 0 q-6 7 -12 0" /><circle cx="58" cy="10" r="2.2" />
            </svg>
            <h1 class="lnf-title">Loaves and Fishes</h1>
            <svg class="lnf-flourish is-right" viewBox="0 0 64 20" aria-hidden="true">
              <path d="M0 10 H34" /><path d="M40 10 q6 -7 12 0 q-6 7 -12 0" /><circle cx="58" cy="10" r="2.2" />
            </svg>
          </div>
          <p class="lnf-sub">The hillside is closed to you now.</p>
        </div>
        <button type="button" class="lnf-exit" id="lnfExit">Leave</button>
      </header>
      <div class="lnf-stage">
        ${thumbSvg(true)}
        <p class="lnf-lost-line" style="color: var(--gold);">You have already fed every hillside.</p>
        <p class="lnf-lost-sub">Loaves and Fishes is a hillside fed once. Its reward is already on your desk${progress.completedAt ? ` — sealed ${new Date(progress.completedAt).toLocaleDateString()}` : ''}.</p>
        <button type="button" class="lnf-go" id="lnfReturn">Return to the Cloister</button>
      </div>
    `;
    root.querySelector('#lnfExit').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    root.querySelector('#lnfReturn').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    return;
  }

  function beginPlay() {
    begin(makeRound(LEVELS[0]));
    render();
    startTimer();
  }

  const seenGuide = !!(data.seenGameGuides || {}).loaves;
  if (seenGuide) {
    beginPlay();
  } else {
    showGuide(() => { markGuideSeen(); beginPlay(); });
  }
}

init();
