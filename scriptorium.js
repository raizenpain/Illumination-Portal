// ============================================
// THE SCRIPTORIUM — a verse-restoration game against the clock.
// Vanilla-JS port of the original React design (Scriptorium.jsx) — this
// project ships no bundler/React, so the component's state machine and
// render tree are reproduced here with plain DOM updates instead, but
// every visual detail (parchment, hourglass) is carried over unchanged.
// See vault-scriptorium.html for the CSS, copied verbatim from the
// component's own <style> block. The final reward now goes through the
// site-wide showTreasureReveal() popup (treasureReveal.js) rather than
// the original component's own bespoke tiered-chest screen.
//
// THE LOOP
//   A leaf opens with 60 seconds. Restore the missing words, then name the
//   book and chapter. Finish in time and the leaf is complete.
//
//   Run out of time and the leaf is taken from your desk — a different
//   passage of the same difficulty is set in front of you, and you begin
//   again. Two leaves lost in a row and the desk is closed for 30 seconds
//   before the next one is set down.
//
//   The run cannot be failed, only marked. There is always another passage.
//
// DIFFICULTY
//   Leaf 1 — full word bank, plain decoys.
//   Leaf 2 — full word bank, near-miss decoys.
//   Leaf 3 — one blank is not in the bank and must be written.
//   Leaf 4 — two blanks must be written.
//   Leaf 5 — no bank at all, though the margin can be consulted for a mark.
//   The student completes one leaf at each level, in order.
//
// MARKS
//   Wrong word, wrong attribution, consulted margin, or a lost leaf: 1 mark.
//   Tracked and shown during play as a personal-best kind of stat — it no
//   longer gates the reward. Finishing all five leaves, however marked up,
//   always earns the same Book of Knowledge (see BOOK_OF_KNOWLEDGE_REWARD
//   in scriptoriumContent.js).
//
// Once vaultGames.scriptorium.completed is true, this is a one-time
// challenge with no replay (see vaultGames.js) — init() checks that
// before drawing a single leaf.
// ============================================

import { db, doc, getDoc, updateDoc, runTransaction, increment, arrayUnion } from './firebase.js';
import { requireLogin } from './auth.js';
import { logActivity } from './activity.js';
import { vaultGameBadgeId, VAULT_UNLOCKED } from './vaultGames.js';
import { showTreasureReveal } from './treasureReveal.js';
import {
  TIME_PER_LEAF, COOLDOWN, FAILS_BEFORE_COOLDOWN, MAX_ATTEMPTS, LEVELS,
  SAMPLE_POOL, TICKETS, BOOK_OF_KNOWLEDGE_REWARD, CATECHISM, CATECHISM_MIN_SECONDS
} from './scriptoriumContent.js';

const { email, name } = requireLogin();

const root = document.getElementById('scrRoot');

function norm(s) {
  return s.trim().toLowerCase().replace(/[.,;:!?]/g, "");
}

function shuffle(arr, seed) {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parsePassage(text) {
  const parts = [];
  const re = /\{(\d+)\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ slot: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * Pick a passage at this level at random. Unseen passages are preferred, so a
 * student works through the whole level pool before anything repeats — but
 * within that set the choice is random, so losing the same leaf twice does not
 * produce the same replacement twice, and nobody can learn the order.
 * `avoidId` keeps the passage just played from coming straight back.
 */
function drawPassage(pool, level, seen, avoidId) {
  let atLevel = pool.filter((p) => p.level === level);
  if (!atLevel.length) return null;
  if (avoidId && atLevel.length > 1) atLevel = atLevel.filter((p) => p.id !== avoidId);
  const fresh = atLevel.filter((p) => !seen.includes(p.id));
  const from = fresh.length ? fresh : atLevel;
  return from[Math.floor(Math.random() * from.length)];
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ---------------------------------------------------------------------------
 * HOW TO PLAY — a one-time guide before leaf 1, modeled on the dashboard's
 * own guided tour (dashboardTour.js): step cards, dots, Back/Next, Skip.
 * Shown once per student (students.seenGameGuides.scriptorium in
 * Firestore), and reopenable anytime afterward via the header's "How to
 * Play" button, which doesn't touch that flag again.
 * ------------------------------------------------------------------------- */

const GUIDE_STEPS = [
  {
    title: 'Welcome to the Scriptorium',
    body: 'Five leaves of Scripture have been worn away by time. Restore each one before the sand runs out, and the manuscript is yours to seal.'
  },
  {
    title: 'The Clock',
    body: 'Each leaf gives you 60 seconds, shown by the hourglass. Fill every blank, then name the book and chapter it came from, before the sand runs out.'
  },
  {
    title: 'Restoring the Words',
    body: 'Tap a blank to focus it, then tap the matching word from the bank below. A blank drawn with a double underline has no bank word — you must write it yourself. Three wrong tries at one blank, and the leaf is lost.'
  },
  {
    title: 'Naming the Source',
    body: 'Once every word is restored, name the book, then the chapter, the passage came from. Get either wrong and it costs you a mark — but you can try again.'
  },
  {
    title: 'If a Leaf Is Lost',
    body: "Running out of time or tries doesn't end your run — a different passage of the same difficulty takes its place. Lose two leaves in a row, though, and the desk closes for 30 seconds before the next one is set down."
  },
  {
    title: 'The Reward',
    body: 'Complete all five leaves — each a little harder than the last — to seal the manuscript and open the Book of Knowledge. Its reward is the same whether you finish unblemished or covered in marks, so take your time and learn as you go.'
  }
];

function showGuide(onDone) {
  let step = 0;

  const overlay = document.createElement('div');
  overlay.className = 'scr-guide-overlay';
  overlay.innerHTML = `
    <div class="scr-sheet scr-guide-card">
      <p class="scr-guide-step-label" id="guideStepLabel"></p>
      <h3 class="scr-guide-title" id="guideTitle"></h3>
      <p class="scr-guide-body" id="guideBody"></p>
      <div class="scr-guide-dots" id="guideDots"></div>
      <div class="scr-guide-actions">
        <button type="button" class="scr-ghost" id="guideBackBtn">Back</button>
        <button type="button" class="scr-go" id="guideNextBtn">Next</button>
      </div>
      <button type="button" class="scr-guide-skip" id="guideSkipBtn">Skip the guide</button>
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

  dotsEl.innerHTML = GUIDE_STEPS.map(() => '<span class="scr-guide-dot"></span>').join('');
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
  updateDoc(doc(db, 'students', email), { 'seenGameGuides.scriptorium': true }).catch((err) => {
    console.error('Failed to save Scriptorium guide completion:', err);
  });
}

/* ---------------------------------------------------------------------------
 * THE CATECHISM — shown once, between sealing the manuscript and the
 * Book of Knowledge popup. Unlike the how-to-play guide, this is
 * mandatory: no Skip button, no close button, nothing to click away.
 * The "Continue" button stays disabled until BOTH a minimum read time
 * has elapsed and the student has scrolled to the end of the text, so
 * it can't be clicked through in half a second. Content lives in
 * scriptoriumContent.js (CATECHISM / CATECHISM_MIN_SECONDS).
 * ------------------------------------------------------------------------- */

function showCatechism(onDone) {
  let secondsLeft = CATECHISM_MIN_SECONDS;
  let reachedEnd = false;

  const overlay = document.createElement('div');
  overlay.className = 'scr-guide-overlay scr-catechism-overlay';
  overlay.innerHTML = `
    <div class="scr-sheet scr-guide-card scr-catechism-card">
      <div class="scr-catechism-scroll" id="catechismScroll">
        <h3 class="scr-guide-title">${esc(CATECHISM.title)}</h3>
        <p class="scr-catechism-intro">${esc(CATECHISM.intro)}</p>
        ${CATECHISM.sections.map((s) => `
          <div class="scr-catechism-section">
            <h4 class="scr-catechism-heading">${esc(s.heading)}</h4>
            <p class="scr-guide-body">${esc(s.body)}</p>
            ${s.quote ? `
              <blockquote class="scr-catechism-quote">
                “${esc(s.quote)}”
                <cite>— ${esc(s.quoteSource)}</cite>
              </blockquote>
            ` : ''}
          </div>
        `).join('')}
        <div id="catechismEndMarker"></div>
      </div>
      <div class="scr-catechism-footer">
        <p class="scr-catechism-status" id="catechismStatus"></p>
        <button type="button" class="scr-go" id="catechismContinue" disabled>Continue</button>
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
 * Hourglass — the running clock, drawn as draining sand.
 * All inline SVG: upper bulb empties, lower heap grows, grains fall between.
 * ------------------------------------------------------------------------- */

const GLASS_TOP = 16;
const NECK = 52;
const GLASS_BOTTOM = 88;

function hourglassSvg(seconds, total, low) {
  const frac = Math.max(0, Math.min(1, seconds / total));
  const upperH = (NECK - GLASS_TOP) * frac;
  const upperY = NECK - upperH;
  const heapH = 4 + (GLASS_BOTTOM - NECK - 6) * (1 - frac);
  const heapY = GLASS_BOTTOM - heapH;
  const running = seconds > 0;

  return `
    <svg class="scr-glass${low ? ' is-low' : ''}" viewBox="0 0 64 104" aria-hidden="true">
      <defs>
        <clipPath id="scr-bulb-top">
          <path d="M12 16 H52 C52 34 38 46 32 52 C26 46 12 34 12 16 Z" />
        </clipPath>
        <clipPath id="scr-bulb-bottom">
          <path d="M12 88 H52 C52 70 38 58 32 52 C26 58 12 70 12 88 Z" />
        </clipPath>
      </defs>
      <rect class="scr-glass-wood" x="6" y="6" width="52" height="8" rx="3" />
      <rect class="scr-glass-wood" x="6" y="90" width="52" height="8" rx="3" />
      <rect class="scr-glass-post" x="11" y="12" width="3" height="80" rx="1.5" />
      <rect class="scr-glass-post" x="50" y="12" width="3" height="80" rx="1.5" />
      <path class="scr-glass-bulb" d="M12 16 H52 C52 34 38 46 32 52 C26 46 12 34 12 16 Z" />
      <path class="scr-glass-bulb" d="M12 88 H52 C52 70 38 58 32 52 C26 58 12 70 12 88 Z" />
      <g clip-path="url(#scr-bulb-top)">
        <rect class="scr-sandfill" x="8" y="${upperY}" width="48" height="${upperH + 1}" />
      </g>
      <g clip-path="url(#scr-bulb-bottom)">
        <path class="scr-sandfill" d="M6 ${GLASS_BOTTOM} H58 V${heapY} Q32 ${heapY - 9} 6 ${heapY} Z" />
      </g>
      ${running && frac > 0.02 ? `
        <rect class="scr-stream" x="31" y="52" width="2" height="${heapY - 52}" />
        <circle class="scr-grain g1" cx="32" cy="58" r="1.4" />
        <circle class="scr-grain g2" cx="32" cy="58" r="1.1" />
      ` : ''}
      <path class="scr-glass-shine" d="M18 20 C18 30 24 40 29 47" fill="none" />
    </svg>
  `;
}

/* ===========================================================================
 * GAME STATE
 * ========================================================================= */

const pool = SAMPLE_POOL;

let levelIdx = 0;
let seen = [];
let passage = null;

let filled = {};
let focus = 0;
let used = [];
let typing = "";
let margin = false;
let stage = "restore"; // restore | attribute
let bookPick = null;
let chapterPick = null;

let marks = 0;
let lostLeaves = 0;
let streak = 0; // consecutive leaves lost
let flash = null;
let attempts = {}; // slot -> wrong tries
let lostReason = "time";

let seed = Math.floor(Math.random() * 1e6);
let seconds = TIME_PER_LEAF;
let screen = "play"; // play | lost | cooldown | sealed
let cool = COOLDOWN;

let timerHandle = null;
let coolHandle = null;

function resetLeaf() {
  filled = {};
  used = [];
  typing = "";
  margin = false;
  stage = "restore";
  bookPick = null;
  chapterPick = null;
  focus = 0;
  attempts = {};
  seed = Math.floor(Math.random() * 1e6);
  seconds = TIME_PER_LEAF;
}

function ding(key) {
  flash = key;
  render();
  setTimeout(() => { flash = null; render(); }, 420);
}

function loseLeaf(reason = "time") {
  lostReason = reason;
  marks += 1;
  lostLeaves += 1;
  streak += 1;
  screen = "lost";
  stopTimer();
  render();
}

/** Called from the lost screen, or automatically after a cooldown. */
function nextLeaf() {
  const level = LEVELS[levelIdx];
  const next = drawPassage(pool, level, [...seen, passage.id], passage.id);
  seen = [...seen, passage.id];
  passage = next || passage;
  resetLeaf();
  cool = COOLDOWN;
  screen = "play";
  render();
  startTimer();
}

function continueFromLost() {
  if (streak >= FAILS_BEFORE_COOLDOWN) {
    cool = COOLDOWN;
    screen = "cooldown";
    render();
    startCooldown();
  } else {
    nextLeaf();
  }
}

function completeLeaf() {
  streak = 0;
  if (levelIdx + 1 < LEVELS.length) {
    const nextLevel = LEVELS[levelIdx + 1];
    const next = drawPassage(pool, nextLevel, [...seen, passage.id], null);
    seen = [...seen, passage.id];
    levelIdx += 1;
    passage = next;
    resetLeaf();
    render();
    startTimer();
  } else {
    stopTimer();
    screen = "sealed";
    render();
    revealTreasure();
  }
}

function nextEmptyAfter(slot) {
  const idx = passage.answers.map((_, i) => i);
  const after = idx.filter((i) => i > slot && !filled[i]);
  if (after.length) return after[0];
  const before = idx.filter((i) => i < slot && !filled[i]);
  return before.length ? before[0] : null;
}

function place(slot, word, bankIndex) {
  filled = { ...filled, [slot]: word };
  if (bankIndex != null) used = [...used, bankIndex];
  typing = "";
  focus = nextEmptyAfter(slot);
  render();
}

/** A wrong word at the focused blank. Three of these and the leaf is gone. */
function registerMiss(flashKey) {
  marks += 1;
  const n = (attempts[focus] || 0) + 1;
  attempts = { ...attempts, [focus]: n };
  if (n >= MAX_ATTEMPTS) {
    loseLeaf("attempts");
  } else {
    ding(flashKey);
  }
}

function pickWord(word, i) {
  if (focus == null || used.includes(i)) return;
  if (norm(word) === norm(passage.answers[focus])) {
    place(focus, passage.answers[focus], i);
  } else {
    registerMiss("w" + i);
  }
}

function submitTyped() {
  if (focus == null || !typing.trim()) return;
  const list = (passage.accepted && passage.accepted[focus]) || [passage.answers[focus]];
  if (list.some((a) => norm(a) === norm(typing))) {
    place(focus, passage.answers[focus]);
  } else {
    registerMiss("typed");
    typing = "";
    render();
  }
}

function consultMargin() {
  if (margin) return;
  margin = true;
  marks += 1;
  render();
}

function pickBook(b) {
  if (b === passage.book) {
    bookPick = b;
    render();
  } else {
    marks += 1;
    ding("b" + b);
  }
}

function pickChapter(c) {
  if (c === passage.chapter) {
    chapterPick = c;
    render();
  } else {
    marks += 1;
    ding("c" + c);
  }
}

/* ===========================================================================
 * TIMERS
 * ========================================================================= */

function startTimer() {
  stopTimer();
  timerHandle = setInterval(() => {
    if (screen !== 'play' || (bookPick && chapterPick)) return;
    seconds -= 1;
    if (seconds <= 0) {
      loseLeaf('time');
      return;
    }
    renderTimerOnly();
  }, 1000);
}

function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

function startCooldown() {
  if (coolHandle) clearInterval(coolHandle);
  coolHandle = setInterval(() => {
    cool -= 1;
    if (cool <= 0) {
      clearInterval(coolHandle);
      coolHandle = null;
      nextLeaf();
      return;
    }
    render();
  }, 1000);
}

/* ===========================================================================
 * FIRESTORE — award once, guarded on vaultGames.scriptorium.completed
 * ========================================================================= */

/** Writes the reward exactly once. Returns true if this call was the one
 *  that actually granted it (false if some earlier session already had). */
async function awardCompletion() {
  const studentRef = doc(db, 'students', email);

  try {
    const alreadyDone = await runTransaction(db, async (tx) => {
      const snap = await tx.get(studentRef);
      const data = snap.data() || {};
      const existing = (data.vaultGames || {}).scriptorium;
      if (existing && existing.completed) return true;

      const updates = {
        'vaultGames.scriptorium.completed': true,
        'vaultGames.scriptorium.completedAt': new Date().toISOString(),
        achievements: arrayUnion(vaultGameBadgeId('scriptorium')),
        unlockTokens: increment(BOOK_OF_KNOWLEDGE_REWARD.unlockTokens)
      };
      BOOK_OF_KNOWLEDGE_REWARD.tickets.forEach(({ key, count }) => {
        const ticketField = TICKETS[key].ticket;
        updates[`tickets.${ticketField}`] = increment(count);
      });
      tx.update(studentRef, updates);
      return false;
    });

    if (!alreadyDone) {
      logActivity({
        email, name, type: 'vaultgame',
        title: 'Sealed the manuscript in The Scriptorium and opened the Book of Knowledge',
        icon: '🗝️'
      });
    }
    return !alreadyDone;
  } catch (err) {
    console.error('Failed to award Scriptorium completion:', err);
    return false;
  }
}

/** The manuscript is sealed. Award the reward immediately (safe even if
 *  the student closes the tab during the catechism that follows), then
 *  make them sit with the catechism before they ever see the popup. */
async function revealTreasure() {
  await awardCompletion();
  showCatechism(() => {
    showTreasureReveal({
      iconSrc: 'assets/book-of-knowledge.jpg',
      kicker: 'The Scriptorium Complete',
      heading: 'The Book of Knowledge',
      subheading: 'Five leaves restored. The manuscript is whole again — its knowledge is yours to keep.',
      chips: [
        ...BOOK_OF_KNOWLEDGE_REWARD.tickets.map(({ key, count }) => `+${count} ${TICKETS[key].name}`),
        `+${BOOK_OF_KNOWLEDGE_REWARD.unlockTokens} Artifact Unlock Tokens`
      ]
    });
  });
}

/* ===========================================================================
 * RENDER
 * ========================================================================= */

function subLine() {
  if (screen === 'sealed') return 'The manuscript is sealed.';
  if (screen === 'lost') return 'The desk is cleared.';
  if (screen === 'cooldown') return 'The scriptorium is closed.';
  if (stage === 'attribute') return 'Name the hand that wrote it.';
  return passage.bank ? 'Restore what the years have worn away.' : 'This leaf has no gloss. Restore it from memory.';
}

function renderTimerOnly() {
  const clockEl = root.querySelector('.scr-timer');
  if (!clockEl) { render(); return; }
  clockEl.innerHTML = `
    ${hourglassSvg(seconds, TIME_PER_LEAF, seconds <= 10)}
    <span class="scr-clock${seconds <= 10 ? ' is-low' : ''}">${Math.max(0, seconds)}s</span>
  `;
}

function render() {
  const parts = parsePassage(passage.text);
  const typedSlots = passage.typed || [];
  const bankWords = shuffle(
    [...passage.answers.filter((_, i) => !typedSlots.includes(i)), ...(passage.distractors || [])],
    seed
  );
  const bookChoices = shuffle(passage.bookOptions, seed + 31);
  const chapterChoices = shuffle(passage.chapterOptions, seed + 97);
  const bankOpen = passage.bank || margin;
  const solved = passage.answers.every((_, i) => filled[i]);
  const attributionDone = bookPick && chapterPick;
  const level = LEVELS[levelIdx];
  const focusIsTyped = focus != null && typedSlots.includes(focus);
  const triesLeft = focus == null ? MAX_ATTEMPTS : MAX_ATTEMPTS - (attempts[focus] || 0);

  let body = '';

  if (screen === 'play') {
    body += `
      <div class="scr-bar">
        <div class="scr-pips">
          ${LEVELS.map((_, i) => `<span class="scr-pip${i < levelIdx ? ' is-done' : ''}${i === levelIdx ? ' is-here' : ''}"></span>`).join('')}
          <span class="scr-level">Leaf ${level} of ${LEVELS.length}</span>
        </div>
        <div class="scr-bar-right">
          <span class="scr-marks">${marks === 0 ? 'unblemished' : marks === 1 ? '1 mark' : `${marks} marks`}</span>
          <div class="scr-timer">
            ${hourglassSvg(seconds, TIME_PER_LEAF, seconds <= 10)}
            <span class="scr-clock${seconds <= 10 ? ' is-low' : ''}">${Math.max(0, seconds)}s</span>
          </div>
        </div>
      </div>

      <div class="scr-scroll">
        <div class="scr-sheet">
          <div class="scr-vellum">
            <p class="scr-verse">
              ${parts.map((part) => {
                if (typeof part === 'string') return `<span>${esc(part)}</span>`;
                const isFilled = !!filled[part.slot];
                const cls = 'scr-slot' +
                  (isFilled ? ' is-filled' : '') +
                  (focus === part.slot ? ' is-focus' : '') +
                  (typedSlots.includes(part.slot) && !isFilled ? ' is-typed' : '');
                return `<button type="button" class="${cls}" data-slot="${part.slot}" ${isFilled ? 'disabled' : ''}>${isFilled ? esc(filled[part.slot]) : '&nbsp;'}</button>`;
              }).join('')}
            </p>
            ${stage === 'attribute' ? `<p class="scr-ref">${esc(bookPick || '—')} ${esc(chapterPick || '')}</p>` : ''}
          </div>

          ${stage === 'restore' && !solved ? `
            <div class="scr-tries">
              <span class="scr-tries-l">${triesLeft === 1 ? 'Last try at this blank' : `${triesLeft} tries at this blank`}</span>
              <span class="scr-tries-pips" aria-hidden="true">
                ${Array.from({ length: MAX_ATTEMPTS }).map((_, i) => `<span class="scr-try${i < MAX_ATTEMPTS - triesLeft ? ' is-spent' : ''}"></span>`).join('')}
              </span>
            </div>

            ${focusIsTyped ? `
              <div class="scr-type${flash === 'typed' ? ' is-wrong' : ''}">
                <input class="scr-input" id="scrTypeInput" value="${esc(typing)}" placeholder="Write the missing word" autocomplete="off" spellcheck="false">
                <button type="button" class="scr-go" id="scrTypeGo" ${!typing.trim() ? 'disabled' : ''}>Inscribe</button>
              </div>
            ` : bankOpen ? `
              <div class="scr-bank">
                ${bankWords.map((word, i) => `
                  <button type="button" class="scr-word${used.includes(i) ? ' is-used' : ''}${flash === 'w' + i ? ' is-wrong' : ''}"
                    data-word="${esc(word)}" data-bank-index="${i}" ${used.includes(i) || focus == null ? 'disabled' : ''}>${esc(word)}</button>
                `).join('')}
              </div>
            ` : `
              <div class="scr-bank">
                <p class="scr-empty">No word bank on this leaf. Choose a blank and write into it, or consult the margin at the cost of a mark.</p>
              </div>
            `}

            ${!passage.bank && !margin ? `<button type="button" class="scr-ghost" id="scrMarginBtn">Consult the margin (1 mark)</button>` : ''}

            ${!focusIsTyped && bankOpen && typedSlots.length > 0 ? `
              <p class="scr-note">Blanks drawn with a double rule are not in the bank. Those must be written.</p>
            ` : ''}
          ` : ''}

          ${stage === 'restore' && solved ? `
            <div class="scr-bank">
              <button type="button" class="scr-go" id="scrNameSource">Name its source</button>
            </div>
          ` : ''}

          ${stage === 'attribute' ? `
            <div class="scr-attr">
              <div class="scr-attr-row">
                <p class="scr-attr-q">Which book?</p>
                <div class="scr-bank">
                  ${bookChoices.map((b) => `
                    <button type="button" class="scr-word${bookPick === b ? ' is-right' : ''}${flash === 'b' + b ? ' is-wrong' : ''}"
                      data-book="${esc(b)}" ${bookPick ? 'disabled' : ''}>${esc(b)}</button>
                  `).join('')}
                </div>
              </div>
              ${bookPick ? `
                <div class="scr-attr-row">
                  <p class="scr-attr-q">Which chapter?</p>
                  <div class="scr-bank">
                    ${chapterChoices.map((c) => `
                      <button type="button" class="scr-word${chapterPick === c ? ' is-right' : ''}${flash === 'c' + c ? ' is-wrong' : ''}"
                        data-chapter="${esc(c)}" ${chapterPick ? 'disabled' : ''}>${esc(c)}</button>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              ${attributionDone ? `
                <button type="button" class="scr-go" id="scrCompleteLeaf">${levelIdx + 1 < LEVELS.length ? 'Take up the next leaf' : 'Seal the manuscript'}</button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } else if (screen === 'lost') {
    body += `
      <div class="scr-stage">
        <p class="scr-lost-line">${lostReason === 'attempts' ? 'Three wrong words at one blank. The leaf is ruined.' : 'The sand runs out. The leaf is taken from your desk unfinished.'}</p>
        <p class="scr-lost-sub">${streak >= FAILS_BEFORE_COOLDOWN ? 'Two lost in a row. The scriptorium closes for a while.' : 'Another passage of the same hand is set down in its place.'}</p>
        <button type="button" class="scr-go" id="scrContinueLost">${streak >= FAILS_BEFORE_COOLDOWN ? 'Stand back from the desk' : 'Begin the new leaf'}</button>
      </div>
    `;
  } else if (screen === 'cooldown') {
    body += `
      <div class="scr-stage">
        <p class="scr-cool-n">${cool}</p>
        <p class="scr-cool-l">The doors open again in ${cool === 1 ? 'a second' : `${cool} seconds`}.</p>
        <p class="scr-cool-note">Use the time. The next leaf is a different passage, not the same one again.</p>
      </div>
    `;
  } else if (screen === 'sealed') {
    body += `
      <div class="scr-stage">
        <p class="scr-lost-line" style="color: var(--gold); font-style: normal;">The manuscript is whole again.</p>
        <p class="scr-lost-sub">Five leaves restored${marks === 0 ? ', not one mark against you' : ` — ${marks} mark${marks === 1 ? '' : 's'} in the margin`}. The Book of Knowledge is opening.</p>
        <button type="button" class="scr-go" id="scrReturn">Return to the Cloister</button>
      </div>
    `;
  }

  root.innerHTML = `
    <header class="scr-head">
      <div class="scr-head-text">
        <div class="scr-crest">
          <svg class="scr-flourish" viewBox="0 0 64 20" aria-hidden="true">
            <path d="M0 10 H34" />
            <path d="M40 10 q6 -7 12 0 q-6 7 -12 0" />
            <circle cx="58" cy="10" r="2.2" />
          </svg>
          <h1 class="scr-title">The Scriptorium</h1>
          <svg class="scr-flourish is-right" viewBox="0 0 64 20" aria-hidden="true">
            <path d="M0 10 H34" />
            <path d="M40 10 q6 -7 12 0 q-6 7 -12 0" />
            <circle cx="58" cy="10" r="2.2" />
          </svg>
        </div>
        <p class="scr-sub">${subLine()}</p>
      </div>
      <button type="button" class="scr-help" id="scrHelp">How to Play</button>
      <button type="button" class="scr-exit" id="scrExit">Leave</button>
    </header>
    ${body}
  `;

  wireEvents();
}

function wireEvents() {
  root.querySelectorAll('.scr-slot:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => { focus = Number(btn.dataset.slot); render(); });
  });
  root.querySelectorAll('.scr-word[data-word]').forEach((btn) => {
    btn.addEventListener('click', () => pickWord(btn.dataset.word, Number(btn.dataset.bankIndex)));
  });
  root.querySelectorAll('.scr-word[data-book]').forEach((btn) => {
    btn.addEventListener('click', () => pickBook(btn.dataset.book));
  });
  root.querySelectorAll('.scr-word[data-chapter]').forEach((btn) => {
    btn.addEventListener('click', () => pickChapter(btn.dataset.chapter));
  });

  const input = root.querySelector('#scrTypeInput');
  if (input) {
    input.addEventListener('input', (e) => {
      typing = e.target.value;
      const go = root.querySelector('#scrTypeGo');
      if (go) go.disabled = !typing.trim();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitTyped(); });
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  const goBtn = root.querySelector('#scrTypeGo');
  if (goBtn) goBtn.addEventListener('click', submitTyped);

  const marginBtn = root.querySelector('#scrMarginBtn');
  if (marginBtn) marginBtn.addEventListener('click', consultMargin);

  const nameSourceBtn = root.querySelector('#scrNameSource');
  if (nameSourceBtn) nameSourceBtn.addEventListener('click', () => { stage = 'attribute'; render(); });

  const completeBtn = root.querySelector('#scrCompleteLeaf');
  if (completeBtn) completeBtn.addEventListener('click', completeLeaf);

  const continueLostBtn = root.querySelector('#scrContinueLost');
  if (continueLostBtn) continueLostBtn.addEventListener('click', continueFromLost);

  const returnBtn = root.querySelector('#scrReturn');
  if (returnBtn) returnBtn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });

  const exitBtn = root.querySelector('#scrExit');
  if (exitBtn) exitBtn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });

  const helpBtn = root.querySelector('#scrHelp');
  if (helpBtn) helpBtn.addEventListener('click', () => {
    // Pause the leaf's clock while re-reading the guide -- it shouldn't
    // cost time just to look up how a blank works.
    const wasTiming = screen === 'play' && !!timerHandle;
    if (wasTiming) stopTimer();
    showGuide(() => { if (wasTiming) startTimer(); });
  });
}

/* ===========================================================================
 * INIT — a one-time challenge. If it's already been completed, don't
 * draw a single leaf; show the closed-desk notice instead.
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

  const progress = (data.vaultGames || {}).scriptorium;
  if (progress && progress.completed) {
    root.innerHTML = `
      <header class="scr-head">
        <div class="scr-head-text">
          <div class="scr-crest">
            <svg class="scr-flourish" viewBox="0 0 64 20" aria-hidden="true">
              <path d="M0 10 H34" /><path d="M40 10 q6 -7 12 0 q-6 7 -12 0" /><circle cx="58" cy="10" r="2.2" />
            </svg>
            <h1 class="scr-title">The Scriptorium</h1>
            <svg class="scr-flourish is-right" viewBox="0 0 64 20" aria-hidden="true">
              <path d="M0 10 H34" /><path d="M40 10 q6 -7 12 0 q-6 7 -12 0" /><circle cx="58" cy="10" r="2.2" />
            </svg>
          </div>
          <p class="scr-sub">The desk is closed to you now.</p>
        </div>
        <button type="button" class="scr-exit" id="scrExit">Leave</button>
      </header>
      <div class="scr-stage">
        <p class="scr-lost-line" style="color: var(--gold);">You have already sealed this manuscript.</p>
        <p class="scr-lost-sub">The Scriptorium is a leaf worked once. Its reward is already on your desk${progress.completedAt ? ` — sealed ${new Date(progress.completedAt).toLocaleDateString()}` : ''}.</p>
        <button type="button" class="scr-go" id="scrReturn">Return to the Cloister</button>
      </div>
    `;
    root.querySelector('#scrExit').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    root.querySelector('#scrReturn').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    return;
  }

  function beginPlay() {
    passage = drawPassage(pool, LEVELS[0], []);
    resetLeaf();
    render();
    startTimer();
  }

  const seenGuide = !!(data.seenGameGuides || {}).scriptorium;
  if (seenGuide) {
    beginPlay();
  } else {
    showGuide(() => { markGuideSeen(); beginPlay(); });
  }
}

init();
