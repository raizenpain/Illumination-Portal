// ============================================
// THE VIGIL — light seven candles by answering questions correctly,
// against the clock, across five historical stations. Vanilla-JS port of
// the original React design (TheVigil.jsx) — this project ships no
// bundler/React, so the component's state machine and render tree are
// reproduced here with plain DOM updates instead, but every visual
// detail (the five hand-drawn stations, the hourglass, the gloom mask
// that lifts as candles light) is carried over unchanged. See
// vault-vigil.html for the CSS, copied verbatim from the component's own
// <style> block (deduplicated -- the source file had the whole block
// pasted in twice, harmless but bloated).
//
// THE MECHANIC
//   A dark cathedral (then catacomb, tomb, basilica, and St Peter's).
//   Candles stand unlit. Tap one and it asks a question from the module;
//   answer correctly and the candle takes flame on its own -- there is
//   nothing else to click. Each question is on a 30-second glass. A wrong
//   answer or an expired glass spends one of three attempts shared across
//   the whole station; spend all three and the station goes dark for 30
//   seconds before trying again with fresh questions.
//
// WHY THIS ONE HAS QUESTIONS AND THE OTHER TWO DON'T
//   Every question is drawn from the ReEd 101 course pack, so this alcove
//   is a review of the module content itself. A miss does NOT reveal the
//   right answer, though -- it just costs an attempt and clears back to
//   the nave -- since telling a student the answer after a wrong guess
//   would let them pass any question for free on the very next try at
//   that same candle, rather than actually testing whether they know it.
//
// Once vaultGames.vigil.completed is true, this is a one-time challenge
// with no replay (see vaultGames.js) — init() checks that before drawing
// a single station.
// ============================================

import { db, doc, getDoc, updateDoc, runTransaction, increment, arrayUnion } from './firebase.js';
import { requireLogin } from './auth.js';
import { logActivity } from './activity.js';
import { vaultGameBadgeId } from './vaultGames.js';
import { showTreasureReveal } from './treasureReveal.js';
import { TICKETS } from './vaultTickets.js';
import {
  TIME_PER_QUESTION, ATTEMPTS_PER_VIGIL, COOLDOWN, ADVANCE_DELAY, MARK_DELAY,
  QUESTIONS, STATIONS, SACRED_LIGHT_REWARD, CATECHISM, CATECHISM_MIN_SECONDS
} from './vigilContent.js';

const { email, name } = requireLogin();

const root = document.getElementById('lntRoot');

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * Draw n questions at random, preferring ones not yet asked in this run.
 * Five stations need 45 questions from a pool of 54, so without this a
 * student would meet the same question twice inside one vigil.
 */
function pick(pool, n, asked = []) {
  const fresh = pool.filter((q) => !asked.includes(q.id));
  const bag = fresh.length >= n ? [...fresh] : [...pool];
  const out = [];
  for (let i = 0; i < n && bag.length; i++) {
    out.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  }
  return out;
}

function shuffleOptions(q) {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    answer: order.indexOf(q.answer),
  };
}

/* ---------------------------------------------------------------------------
 * HOW TO PLAY — a one-time guide before the first candle, identical
 * mechanism to the other two games' (see scriptorium.js/loaves.js): step
 * cards, dots, Back/Next, Skip.
 * ------------------------------------------------------------------------- */

const GUIDE_STEPS = [
  {
    title: 'Welcome to the Vigil',
    body: 'A dark cathedral, and seven unlit candles. Tap one and it asks you a question from the module. Answer correctly and the candle takes flame on its own — there is nothing else to click.'
  },
  {
    title: 'The Clock',
    body: 'Each question gives you 30 seconds, shown by the hourglass. Letting it run out counts the same as answering wrong.'
  },
  {
    title: 'Three Attempts, Shared',
    body: "You get three attempts across the whole station, not per question. A wrong answer doesn't tell you the right one — it just costs one of your three, so it's worth thinking before you tap."
  },
  {
    title: 'Five Stations',
    body: 'The vigil moves through five real places in the Church’s history, each with more candles than the last: a Gothic nave, a catacomb, the empty tomb, an ancient basilica, and finally St Peter’s. Lighting every candle in a station carries you into the next.'
  },
  {
    title: 'If a Station Is Lost',
    body: 'Spending all three attempts empties that station for 30 seconds. It then begins again with a fresh set of questions drawn from the pool — same station, same candle count, different questions.'
  },
  {
    title: 'The Reward',
    body: 'Keep the vigil through all five stations to open the Sacred Light. The reward is the same whether you finish unblemished or with marks against you, so take your time and learn as you go.'
  }
];

function showGuide(onDone) {
  let step = 0;

  const overlay = document.createElement('div');
  overlay.className = 'lnt-guide-overlay';
  overlay.innerHTML = `
    <div class="lnt-sheet lnt-guide-card">
      <p class="lnt-guide-step-label" id="guideStepLabel"></p>
      <h3 class="lnt-guide-title" id="guideTitle"></h3>
      <p class="lnt-guide-body" id="guideBody"></p>
      <div class="lnt-guide-dots" id="guideDots"></div>
      <div class="lnt-guide-actions">
        <button type="button" class="lnt-ghost" id="guideBackBtn">Back</button>
        <button type="button" class="lnt-go" id="guideNextBtn">Next</button>
      </div>
      <button type="button" class="lnt-guide-skip" id="guideSkipBtn">Skip the guide</button>
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

  dotsEl.innerHTML = GUIDE_STEPS.map(() => '<span class="lnt-guide-dot"></span>').join('');
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
  updateDoc(doc(db, 'students', email), { 'seenGameGuides.vigil': true }).catch((err) => {
    console.error('Failed to save Vigil guide completion:', err);
  });
}

/* ---------------------------------------------------------------------------
 * THE CATECHISM — shown once, between keeping the vigil and the Sacred
 * Light popup. Identical mechanism to the other two games': no skip, no
 * close, gated on both a minimum read-timer and scrolling to the end.
 * ------------------------------------------------------------------------- */

function showCatechism(onDone) {
  let secondsLeft = CATECHISM_MIN_SECONDS;
  let reachedEnd = false;

  const overlay = document.createElement('div');
  overlay.className = 'lnt-guide-overlay lnt-catechism-overlay';
  overlay.innerHTML = `
    <div class="lnt-sheet lnt-guide-card lnt-catechism-card">
      <div class="lnt-catechism-scroll" id="catechismScroll">
        <h3 class="lnt-guide-title">${esc(CATECHISM.title)}</h3>
        <p class="lnt-catechism-intro">${esc(CATECHISM.intro)}</p>
        ${CATECHISM.sections.map((s) => `
          <div class="lnt-catechism-section">
            <h4 class="lnt-catechism-heading">${esc(s.heading)}</h4>
            ${s.body ? `<p class="lnt-guide-body">${esc(s.body)}</p>` : ''}
            ${s.list ? `
              <ul class="lnt-catechism-list">
                ${s.list.map((item) => `<li><strong>${esc(item.label)}</strong> — ${esc(item.body)}</li>`).join('')}
              </ul>
            ` : ''}
            ${s.quote ? `
              <blockquote class="lnt-catechism-quote">
                “${esc(s.quote)}”
                <cite>— ${esc(s.quoteSource)}</cite>
              </blockquote>
            ` : ''}
          </div>
        `).join('')}
        <div id="catechismEndMarker"></div>
      </div>
      <div class="lnt-catechism-footer">
        <p class="lnt-catechism-status" id="catechismStatus"></p>
        <button type="button" class="lnt-go" id="catechismContinue" disabled>Continue</button>
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
 * STATION ART — the five hand-drawn scenes. Each returns the inner SVG
 * markup (defs + shapes) for its station, ported verbatim from the
 * component's own Art sub-components.
 *
 * NOTE: the source JSX gave every non-nave station's background rect the
 * same class, "lnt-rock", while also defining a distinct gradient for
 * each -- but since .lnt-rock was then redeclared per station later in
 * the same global stylesheet, only the LAST declaration (the tomb's)
 * actually won the cascade, so catacomb/basilica/vatican would have
 * silently rendered with the tomb's background gradient instead of their
 * own. Fixed here by giving each station's rect its own class
 * (lnt-bg-<station>) tied to its own gradient -- a one-line authoring
 * slip, not a deliberate look, so restoring each station's intended
 * palette rather than preserving the accident.
 * ------------------------------------------------------------------------- */

function naveArtSvg() {
  const arcades = [
    { x: 62, y: 214, w: 52, h: 128 },
    { x: 168, y: 200, w: 40, h: 100 },
    { x: 472, y: 200, w: 40, h: 100 },
    { x: 578, y: 214, w: 52, h: 128 },
  ];
  return `
    <defs>
      <linearGradient id="lnt-stone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3f3a2c" />
        <stop offset="70%" stop-color="#231f17" />
        <stop offset="100%" stop-color="#15120d" />
      </linearGradient>
      <linearGradient id="lnt-floor-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2a2418" />
        <stop offset="100%" stop-color="#463c28" />
      </linearGradient>
      <radialGradient id="lnt-rose" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#f2dda0" />
        <stop offset="45%" stop-color="#c2a13f" />
        <stop offset="75%" stop-color="#8f2f26" />
        <stop offset="100%" stop-color="#2b2117" />
      </radialGradient>
      <radialGradient id="lnt-sanct" cx="50%" cy="80%" r="70%">
        <stop offset="0%" stop-color="#6b5a34" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#6b5a34" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect class="lnt-wall" x="0" y="0" width="640" height="340" />
    <g class="lnt-vault" fill="none">
      <path d="M0 4 C120 66 240 104 320 120 C400 104 520 66 640 4" />
      <path d="M0 52 C130 104 244 134 320 146 C396 134 510 104 640 52" />
      <path d="M320 0 V120 M150 30 C210 78 280 106 320 118 M490 30 C430 78 360 106 320 118" />
    </g>
    <path class="lnt-floor" d="M196 206 H444 L640 340 H0 Z" />
    <g class="lnt-flagstone" fill="none">
      <path d="M204 222 H436 M214 246 H426 M228 278 H412 M246 318 H394" />
      <path d="M196 206 L0 340 M262 206 L196 340 M320 206 L320 340 M378 206 L444 340 M444 206 L640 340" />
    </g>
    ${arcades.map((a) => `
      <g>
        <path class="lnt-arch" d="M${a.x - a.w} ${a.y + a.h} V${a.y} Q${a.x - a.w} ${a.y - a.w * 0.9} ${a.x} ${a.y - a.w * 1.15} Q${a.x + a.w} ${a.y - a.w * 0.9} ${a.x + a.w} ${a.y} V${a.y + a.h} Z" />
        <rect class="lnt-column" x="${a.x - a.w - 11}" y="${a.y - a.w * 0.6}" width="11" height="${a.h + a.w * 0.6}" />
        <rect class="lnt-column" x="${a.x + a.w}" y="${a.y - a.w * 0.6}" width="11" height="${a.h + a.w * 0.6}" />
      </g>
    `).join('')}
    <path class="lnt-arch is-sanctuary" d="M232 214 V132 Q232 52 320 40 Q408 52 408 132 V214 Z" />
    <path class="lnt-sanct-glow" d="M232 214 V132 Q232 52 320 40 Q408 52 408 132 V214 Z" />
    <circle class="lnt-rose" cx="320" cy="104" r="38" />
    <g class="lnt-tracery" fill="none">
      <circle cx="320" cy="104" r="38" />
      <circle cx="320" cy="104" r="15" />
      <path d="M320 66 V142 M282 104 H358 M293 77 L347 131 M347 77 L293 131" />
    </g>
    <path class="lnt-step" d="M262 214 H378 L392 226 H248 Z" />
    <rect class="lnt-altar" x="272" y="182" width="96" height="32" rx="2" />
    <path class="lnt-altar-cloth" d="M266 182 H374 L366 196 H274 Z" />
    <path class="lnt-cross" d="M320 154 V182 M308 164 H332" fill="none" />
  `;
}

function catacombArtSvg() {
  const niches = [
    { x: 62, y: 176, w: 44, h: 76 }, { x: 62, y: 268, w: 44, h: 62 },
    { x: 166, y: 186, w: 34, h: 62 }, { x: 166, y: 260, w: 34, h: 52 },
    { x: 474, y: 186, w: 34, h: 62 }, { x: 474, y: 260, w: 34, h: 52 },
    { x: 578, y: 176, w: 44, h: 76 }, { x: 578, y: 268, w: 44, h: 62 },
  ];
  const rings = [
    { rx: 300, ry: 210, o: 0.30 }, { rx: 250, ry: 178, o: 0.36 }, { rx: 202, ry: 148, o: 0.42 },
    { rx: 156, ry: 120, o: 0.5 }, { rx: 112, ry: 94, o: 0.58 }, { rx: 72, ry: 68, o: 0.66 },
  ];
  return `
    <defs>
      <linearGradient id="lnt-tufa" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#312a20" />
        <stop offset="60%" stop-color="#211b14" />
        <stop offset="100%" stop-color="#100d0a" />
      </linearGradient>
      <linearGradient id="lnt-dirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#251e15" />
        <stop offset="100%" stop-color="#3d3324" />
      </linearGradient>
      <radialGradient id="lnt-far" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#4a3a1c" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#4a3a1c" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect class="lnt-bg-catacomb" x="0" y="0" width="640" height="340" />
    ${rings.map((r) => `
      <path class="lnt-vault-ring" style="opacity:${r.o}" d="M${320 - r.rx} 300 V${300 - r.ry * 0.55} Q${320 - r.rx} ${300 - r.ry} 320 ${300 - r.ry} Q${320 + r.rx} ${300 - r.ry} ${320 + r.rx} ${300 - r.ry * 0.55} V300 Z" />
    `).join('')}
    <ellipse class="lnt-deep" cx="320" cy="252" rx="52" ry="48" />
    <ellipse class="lnt-farglow" cx="320" cy="250" rx="96" ry="86" />
    <path class="lnt-cata-floor" d="M226 300 H414 L640 340 H0 Z" />
    <g class="lnt-flagstone" fill="none">
      <path d="M236 312 H404 M254 326 H386" />
      <path d="M226 300 L0 340 M296 300 L240 340 M344 300 L400 340 M414 300 L640 340" />
    </g>
    ${niches.map((n) => `
      <g>
        <path class="lnt-niche" d="M${n.x - n.w} ${n.y + n.h} V${n.y} Q${n.x - n.w} ${n.y - n.w * 0.8} ${n.x} ${n.y - n.w * 0.95} Q${n.x + n.w} ${n.y - n.w * 0.8} ${n.x + n.w} ${n.y} V${n.y + n.h} Z" />
        <rect class="lnt-slab" x="${n.x - n.w + 5}" y="${n.y + n.h - 16}" width="${n.w * 2 - 10}" height="13" rx="2" />
      </g>
    `).join('')}
    <g class="lnt-graffito" fill="none">
      <path d="M96 128 V86 M96 100 L112 88 M96 100 L112 112" />
      <circle cx="96" cy="86" r="9" />
      <path d="M534 120 C548 106 574 106 588 120 C574 134 548 134 534 120 Z" />
      <path d="M588 120 L600 112 L600 128 Z" />
    </g>
  `;
}

function tombArtSvg(count, total) {
  const dawn = total ? count / total : 0;
  return `
    <defs>
      <linearGradient id="lnt-rock-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a332a" />
        <stop offset="62%" stop-color="#241f19" />
        <stop offset="100%" stop-color="#14110e" />
      </linearGradient>
      <linearGradient id="lnt-tomb-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2b251c" />
        <stop offset="100%" stop-color="#453b2c" />
      </linearGradient>
      <radialGradient id="lnt-dawn-g" cx="50%" cy="62%" r="62%">
        <stop offset="0%" stop-color="#fff3d2" stop-opacity="0.95" />
        <stop offset="45%" stop-color="#f0c06a" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#c47a26" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="lnt-linen-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#efe6cf" />
        <stop offset="100%" stop-color="#bdb094" />
      </linearGradient>
      <linearGradient id="lnt-stone-disc" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6a5f4b" />
        <stop offset="100%" stop-color="#38311f" />
      </linearGradient>
    </defs>
    <rect class="lnt-bg-tomb" x="0" y="0" width="640" height="340" />
    <g class="lnt-chisel" fill="none">
      <path d="M0 60 q90 22 180 6 M40 118 q120 26 230 4 M380 92 q120 24 230 -2 M300 44 q100 20 200 2" />
      <path d="M60 190 q80 16 150 2 M420 186 q90 18 170 0" />
    </g>
    <path class="lnt-doorway" d="M258 250 V150 Q258 96 320 88 Q382 96 382 150 V250 Z" />
    <path class="lnt-dawn" d="M258 250 V150 Q258 96 320 88 Q382 96 382 150 V250 Z" style="opacity:${0.25 + dawn * 0.75}" />
    <path class="lnt-dawn-spill" d="M266 250 H374 L470 340 H170 Z" style="opacity:${0.10 + dawn * 0.5}" />
    <path class="lnt-channel" d="M120 250 H262 L268 262 H112 Z" />
    <circle class="lnt-disc" cx="176" cy="206" r="54" />
    <circle class="lnt-disc-inner" cx="176" cy="206" r="34" />
    <circle class="lnt-disc-boss" cx="176" cy="206" r="9" />
    <path class="lnt-tomb-floor-p" d="M92 250 H556 L640 340 H0 Z" />
    <g class="lnt-flagstone" fill="none">
      <path d="M110 274 H534 M132 302 H510" />
      <path d="M92 250 L0 340 M240 250 L196 340 M400 250 L444 340 M556 250 L640 340" />
    </g>
    <path class="lnt-arcosolium" d="M430 268 V196 Q430 150 512 144 Q594 150 594 196 V268 Z" />
    <rect class="lnt-shelf" x="424" y="248" width="180" height="20" rx="3" />
    <path class="lnt-linen" d="M462 248 q16 -22 44 -18 q30 4 44 18 q-22 8 -44 6 q-24 2 -44 -6 Z" />
    <path class="lnt-linen-fold" d="M480 240 q26 -8 52 2 M472 246 q30 -4 60 4" fill="none" />
    <ellipse class="lnt-linen" cx="446" cy="242" rx="16" ry="9" />
  `;
}

function basilicaArtSvg() {
  const cols = [78, 168, 258, 382, 472, 562];
  return `
    <defs>
      <linearGradient id="lnt-plaster" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a4234" />
        <stop offset="66%" stop-color="#2b251c" />
        <stop offset="100%" stop-color="#181410" />
      </linearGradient>
      <linearGradient id="lnt-marble" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6a6250" />
        <stop offset="100%" stop-color="#39332a" />
      </linearGradient>
      <radialGradient id="lnt-apse-g" cx="50%" cy="86%" r="72%">
        <stop offset="0%" stop-color="#e8c675" />
        <stop offset="42%" stop-color="#b98c30" />
        <stop offset="100%" stop-color="#6a4c16" />
      </radialGradient>
      <linearGradient id="lnt-basil-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2d2820" />
        <stop offset="100%" stop-color="#4b4234" />
      </linearGradient>
    </defs>
    <rect class="lnt-bg-basilica" x="0" y="0" width="640" height="340" />
    <g class="lnt-truss" fill="none">
      <path d="M40 96 L320 26 L600 96" />
      <path d="M40 96 H600" />
      <path d="M320 26 V96 M180 61 V96 M460 61 V96 M110 78 V96 M530 78 V96" />
      <path d="M180 61 L320 96 M460 61 L320 96" />
    </g>
    <path class="lnt-apse" d="M236 250 V166 Q236 96 320 88 Q404 96 404 166 V250 Z" />
    <path class="lnt-apse-mosaic" d="M244 250 V168 Q244 104 320 96 Q396 104 396 168 V250 Z" />
    <g class="lnt-mosaic-line" fill="none">
      <path d="M320 108 V196 M290 140 H350" />
      <circle cx="320" cy="126" r="15" />
      <path d="M262 214 H378 M256 232 H384" />
    </g>
    <rect class="lnt-altar" x="286" y="222" width="68" height="28" rx="2" />
    <path class="lnt-altar-cloth" d="M280 222 H360 L354 234 H286 Z" />
    <g class="lnt-ciborium" fill="none">
      <path d="M272 224 V170 M368 224 V170" />
      <path d="M266 170 H374 M282 170 L320 148 L358 170" />
    </g>
    ${cols.map((x) => `
      <g>
        <rect class="lnt-col" x="${x - 9}" y="150" width="18" height="100" />
        <rect class="lnt-cap" x="${x - 14}" y="142" width="28" height="10" rx="2" />
        <rect class="lnt-base" x="${x - 13}" y="248" width="26" height="8" rx="2" />
      </g>
    `).join('')}
    <g class="lnt-round-arch" fill="none">
      <path d="M78 142 Q123 100 168 142 Q213 100 258 142" />
      <path d="M382 142 Q427 100 472 142 Q517 100 562 142" />
    </g>
    <path class="lnt-basil-floor-p" d="M60 250 H580 L640 340 H0 Z" />
    <g class="lnt-flagstone" fill="none">
      <path d="M76 274 H564 M96 304 H544" />
      <path d="M60 250 L0 340 M200 250 L168 340 M440 250 L472 340 M580 250 L640 340" />
    </g>
  `;
}

function vaticanTwist(x, top, bottom) {
  const turns = 5;
  const step = (bottom - top) / turns;
  let d = `M${x} ${bottom}`;
  for (let i = 0; i < turns; i++) {
    const y0 = bottom - i * step;
    d += ` C${x - 9} ${y0 - step * 0.35} ${x + 9} ${y0 - step * 0.65} ${x} ${y0 - step}`;
  }
  return d;
}

function vaticanArtSvg(count, total) {
  const glory = total ? count / total : 0;
  return `
    <defs>
      <linearGradient id="lnt-vat-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4e4636" />
        <stop offset="62%" stop-color="#2c2620" />
        <stop offset="100%" stop-color="#171310" />
      </linearGradient>
      <radialGradient id="lnt-dome-g" cx="50%" cy="16%" r="78%">
        <stop offset="0%" stop-color="#fdf0c8" stop-opacity="0.95" />
        <stop offset="30%" stop-color="#d9b263" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#7a5c22" stop-opacity="0.12" />
      </radialGradient>
      <radialGradient id="lnt-gloria-g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff6da" />
        <stop offset="35%" stop-color="#f2c869" />
        <stop offset="100%" stop-color="#a06f1e" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="lnt-bronze" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#9a7a34" />
        <stop offset="55%" stop-color="#5e4718" />
        <stop offset="100%" stop-color="#33270f" />
      </linearGradient>
      <linearGradient id="lnt-vat-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#332c22" />
        <stop offset="100%" stop-color="#564936" />
      </linearGradient>
    </defs>
    <rect class="lnt-bg-vatican" x="0" y="0" width="640" height="340" />
    <path class="lnt-dome" d="M150 176 Q320 -34 490 176 Z" />
    <path class="lnt-dome-light" d="M150 176 Q320 -34 490 176 Z" />
    <g class="lnt-coffer" fill="none">
      <path d="M198 176 Q320 12 442 176" />
      <path d="M246 176 Q320 58 394 176" />
      <path d="M320 20 V176 M236 60 L320 176 M404 60 L320 176 M188 112 L320 176 M452 112 L320 176" />
    </g>
    <circle class="lnt-lantern" cx="320" cy="34" r="17" />
    <rect class="lnt-pier" x="86" y="150" width="64" height="106" />
    <rect class="lnt-pier" x="490" y="150" width="64" height="106" />
    <path class="lnt-pier-arch" d="M150 176 Q170 150 190 176 V256 H150 Z" />
    <path class="lnt-pier-arch" d="M450 176 Q470 150 490 176 V256 H450 Z" />
    <ellipse class="lnt-gloria" cx="320" cy="196" rx="76" ry="52" style="opacity:${0.3 + glory * 0.7}" />
    <g class="lnt-rays" fill="none" style="opacity:${0.25 + glory * 0.65}">
      <path d="M320 196 L246 158 M320 196 L394 158 M320 196 L232 196 M320 196 L408 196 M320 196 L262 236 M320 196 L378 236 M320 196 L320 146" />
    </g>
    <g class="lnt-dove">
      <ellipse cx="320" cy="192" rx="13" ry="8" />
      <path d="M320 186 q-14 -10 -24 -2 q12 4 24 6 Z M320 186 q14 -10 24 -2 q-12 4 -24 6 Z" />
      <path d="M333 192 l10 -3 l-10 -3 Z" />
    </g>
    <g class="lnt-bald">
      <path class="lnt-twist" d="${vaticanTwist(244, 148, 250)}" fill="none" />
      <path class="lnt-twist" d="${vaticanTwist(276, 152, 250)}" fill="none" />
      <path class="lnt-twist" d="${vaticanTwist(364, 152, 250)}" fill="none" />
      <path class="lnt-twist" d="${vaticanTwist(396, 148, 250)}" fill="none" />
      <path class="lnt-canopy" d="M228 148 H412 L396 128 H244 Z" />
      <path class="lnt-canopy-swag" d="M236 148 q22 16 44 0 q22 16 44 0 q22 16 44 0 q22 16 44 0" fill="none" />
      <path class="lnt-canopy-top" d="M290 128 Q320 96 350 128 M320 96 V84 M312 90 H328" fill="none" />
    </g>
    <rect class="lnt-altar" x="286" y="228" width="68" height="24" rx="2" />
    <path class="lnt-altar-cloth" d="M280 228 H360 L354 238 H286 Z" />
    <path class="lnt-vat-floor-p" d="M40 252 H600 L640 340 H0 Z" />
    <g class="lnt-inlay" fill="none">
      <ellipse cx="320" cy="286" rx="118" ry="26" />
      <ellipse cx="320" cy="286" rx="72" ry="16" />
      <ellipse cx="320" cy="330" rx="188" ry="34" />
      <path d="M40 252 L0 340 M212 252 L176 340 M428 252 L464 340 M600 252 L640 340" />
    </g>
  `;
}

const STATION_ART = {
  nave: () => naveArtSvg(),
  catacomb: () => catacombArtSvg(),
  tomb: (count, total) => tombArtSvg(count, total),
  basilica: () => basilicaArtSvg(),
  vatican: (count, total) => vaticanArtSvg(count, total),
};

/* ---------------------------------------------------------------------------
 * CANDLE, THUMB, HOURGLASS — small reusable pieces of markup.
 * ------------------------------------------------------------------------- */

function candleSvg(spot, index, lit, asking, disabled) {
  const { x, y, s } = spot;
  const h = 46 * s;
  const w = 11 * s;
  const cls = 'lnt-candle' + (lit ? ' is-lit' : '') + (asking ? ' is-asking' : '');
  return `
    <g class="${cls}" data-index="${index}" ${disabled ? 'data-disabled="true"' : ''}
       tabindex="${disabled ? -1 : 0}" role="${disabled ? '' : 'button'}"
       aria-label="${lit ? `Candle ${index + 1}, lit` : `Light candle ${index + 1}`}">
      <rect class="lnt-hit" x="${x - 32}" y="${y - h - 34}" width="64" height="${h + 66}" />
      ${lit ? `<ellipse class="lnt-pool" cx="${x}" cy="${y + 30 * s}" rx="${64 * s}" ry="${15 * s}" />` : ''}
      <path class="lnt-stand" d="M${x - 13 * s} ${y + 30 * s} H${x + 13 * s} L${x + 6 * s} ${y + 20 * s} H${x - 6 * s} Z" />
      <rect class="lnt-stand" x="${x - 3.5 * s}" y="${y + 8 * s}" width="${7 * s}" height="${14 * s}" />
      <rect class="lnt-wax" x="${x - w / 2}" y="${y - h}" width="${w}" height="${h + 10 * s}" rx="${3 * s}" />
      <path class="lnt-wax-run" d="M${x - w / 2 + 1} ${y - h + 8 * s} q${-2 * s} ${10 * s} ${1 * s} ${18 * s}" fill="none" />
      <path class="lnt-wick" d="M${x} ${y - h} v${-5 * s}" fill="none" />
      ${lit ? `
        <g class="lnt-flame">
          <ellipse class="lnt-glow" cx="${x}" cy="${y - h - 12 * s}" rx="${26 * s}" ry="${32 * s}" />
          <path class="lnt-fire" d="M${x} ${y - h - 26 * s} C${x + 9 * s} ${y - h - 16 * s} ${x + 8 * s} ${y - h - 6 * s} ${x} ${y - h - 2 * s} C${x - 8 * s} ${y - h - 6 * s} ${x - 9 * s} ${y - h - 16 * s} ${x} ${y - h - 26 * s} Z" />
          <path class="lnt-fire-core" d="M${x} ${y - h - 18 * s} C${x + 4 * s} ${y - h - 13 * s} ${x + 4 * s} ${y - h - 7 * s} ${x} ${y - h - 4 * s} C${x - 4 * s} ${y - h - 7 * s} ${x - 4 * s} ${y - h - 13 * s} ${x} ${y - h - 18 * s} Z" />
        </g>
      ` : ''}
      ${asking ? `<circle class="lnt-marker" cx="${x}" cy="${y - h / 2}" r="${28 * s}" />` : ''}
    </g>
  `;
}

function thumbSvg(up) {
  return `
    <svg class="lnt-thumb${up ? ' is-up' : ' is-down'}" viewBox="0 0 64 64" aria-hidden="true">
      <g transform="${up ? '' : 'rotate(180 32 32)'}">
        <rect class="lnt-thumb-cuff" x="8" y="30" width="14" height="24" rx="3" />
        <path class="lnt-thumb-hand" d="M24 54 V30 C24 30 30 27 32 21 C33 17 32 12 35 10 C39 8 43 11 42 17 L40 27 H52 C56 27 58 30 57 34 L54 49 C53 53 50 54 47 54 Z" />
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
    <svg class="lnt-glass${low ? ' is-low' : ''}" viewBox="0 0 64 104" aria-hidden="true">
      <defs>
        <clipPath id="lnt-bulb-top">
          <path d="M12 16 H52 C52 34 38 46 32 52 C26 46 12 34 12 16 Z" />
        </clipPath>
        <clipPath id="lnt-bulb-bottom">
          <path d="M12 88 H52 C52 70 38 58 32 52 C26 58 12 70 12 88 Z" />
        </clipPath>
      </defs>
      <rect class="lnt-glass-wood" x="6" y="6" width="52" height="8" rx="3" />
      <rect class="lnt-glass-wood" x="6" y="90" width="52" height="8" rx="3" />
      <rect class="lnt-glass-post" x="11" y="12" width="3" height="80" rx="1.5" />
      <rect class="lnt-glass-post" x="50" y="12" width="3" height="80" rx="1.5" />
      <path class="lnt-glass-bulb" d="M12 16 H52 C52 34 38 46 32 52 C26 46 12 34 12 16 Z" />
      <path class="lnt-glass-bulb" d="M12 88 H52 C52 70 38 58 32 52 C26 58 12 70 12 88 Z" />
      <g clip-path="url(#lnt-bulb-top)">
        <rect class="lnt-sandfill" x="8" y="${upperY}" width="48" height="${upperH + 1}" />
      </g>
      <g clip-path="url(#lnt-bulb-bottom)">
        <path class="lnt-sandfill" d="M6 ${GLASS_BOTTOM} H58 V${heapY} Q32 ${heapY - 9} 6 ${heapY} Z" />
      </g>
      ${running && frac > 0.02 ? `
        <rect class="lnt-stream" x="31" y="52" width="2" height="${heapY - 52}" />
        <circle class="lnt-grain g1" cx="32" cy="58" r="1.4" />
        <circle class="lnt-grain g2" cx="32" cy="58" r="1.1" />
      ` : ''}
      <path class="lnt-glass-shine" d="M18 20 C18 30 24 40 29 47" fill="none" />
    </svg>
  `;
}

/** The full station scene: art, candles, and the gloom mask that lifts
 *  around each lit candle while the whole scene also brightens overall. */
function stationSvg(station, lit, askingIndex, busy) {
  const count = lit.filter(Boolean).length;
  const gloom = Math.max(0.12, 0.9 - count * (0.78 / station.spots.length));

  return `
    <svg class="lnt-nave is-${station.key}" viewBox="0 0 640 340" role="group" aria-label="${esc(station.name)}">
      <defs>
        <mask id="lnt-dark-${station.key}">
          <rect x="0" y="0" width="640" height="340" fill="#fff" />
          ${station.spots.map((sp, i) => lit[i] ? `<ellipse cx="${sp.x}" cy="${sp.y - 30 * sp.s}" rx="${104 * sp.s}" ry="${96 * sp.s}" fill="#000" opacity="0.9" />` : '').join('')}
        </mask>
      </defs>
      ${STATION_ART[station.art](count, station.spots.length)}
      ${station.spots.map((sp, i) => candleSvg(sp, i, lit[i], askingIndex === i, busy || lit[i])).join('')}
      <rect class="lnt-gloom" x="0" y="0" width="640" height="340" mask="url(#lnt-dark-${station.key})" style="opacity:${gloom}" />
    </svg>
  `;
}

/* ===========================================================================
 * GAME STATE
 * ========================================================================= */

let stationIdx = 0;
let asked = [];
let set = [];
let lit = [];
let openCandle = null;
let attemptsLeft = ATTEMPTS_PER_VIGIL;
let marks = 0;
let vigilsLost = 0;
let litFirstTry = 0;
let missedHere = false;
let verdict = null; // { up, text }
let picked = null;
let shownQ = null;
let seconds = TIME_PER_QUESTION;
let screen = 'nave'; // nave | asking | answered | marking | cooldown | done
let cool = COOLDOWN;

let timerHandle = null;
let advanceHandle = null;
let markingHandle = null;
let coolHandle = null;

const TOTAL_CANDLES = STATIONS.reduce((n, st) => n + st.spots.length, 0);

/** Open a station: fresh questions, every candle unlit, attempts restored. */
function beginStation(idx) {
  const station = STATIONS[idx];
  const n = station.spots.length;
  const drawn = pick(QUESTIONS, n, asked);
  stationIdx = idx;
  asked = [...asked, ...drawn.map((q) => q.id)];
  set = drawn.map(shuffleOptions);
  lit = Array(n).fill(false);
  openCandle = null;
  attemptsLeft = ATTEMPTS_PER_VIGIL;
  verdict = null;
  missedHere = false;
  seconds = TIME_PER_QUESTION;
  cool = COOLDOWN;
  screen = 'nave';
}

function openIt(i) {
  if (screen !== 'nave' || lit[i]) return;
  openCandle = i;
  missedHere = false;
  seconds = TIME_PER_QUESTION;
  verdict = null;
  picked = null;
  shownQ = null;
  screen = 'asking';
  render();
  startTimer();
}

function spend(text) {
  const question = set[openCandle];
  const left = attemptsLeft - 1;
  marks += 1;
  attemptsLeft = left;
  missedHere = true;
  verdict = { up: false, text };
  seconds = TIME_PER_QUESTION;
  stopTimer();

  if (left <= 0) {
    marks += 1;
    vigilsLost += 1;
    cool = COOLDOWN;
    screen = 'cooldown';
    render();
    startCooldown();
  } else {
    shownQ = question;
    screen = 'marking';
    render();
    if (markingHandle) clearTimeout(markingHandle);
    markingHandle = setTimeout(() => {
      markingHandle = null;
      screen = 'nave';
      openCandle = null;
      shownQ = null;
      picked = null;
      render();
    }, MARK_DELAY * 1000);
  }
}

function answer(i) {
  if (screen !== 'asking') return;
  const question = set[openCandle];
  picked = i;
  if (i === question.answer) {
    stopTimer();
    lit = [...lit];
    lit[openCandle] = true;
    if (!missedHere) litFirstTry += 1;
    verdict = { up: true, text: 'The wick takes, and the light spreads.' };
    shownQ = question;
    screen = 'answered';
    render();
    startAdvance();
  } else {
    spend('Not so. Try again.');
  }
}

function finish() {
  screen = 'done';
  render();
  revealTreasure();
}

/* ===========================================================================
 * TIMERS
 * ========================================================================= */

function startTimer() {
  stopTimer();
  timerHandle = setInterval(() => {
    if (screen !== 'asking') return;
    seconds -= 1;
    if (seconds <= 0) {
      spend('The sand runs out. You have not chosen.');
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
  advanceHandle = setTimeout(() => {
    advanceHandle = null;
    verdict = null;
    openCandle = null;
    if (lit.every(Boolean)) {
      if (stationIdx + 1 < STATIONS.length) {
        beginStation(stationIdx + 1);
        render();
      } else {
        finish();
      }
    } else {
      screen = 'nave';
      render();
    }
  }, ADVANCE_DELAY * 1000);
}

function startCooldown() {
  if (coolHandle) clearInterval(coolHandle);
  coolHandle = setInterval(() => {
    cool -= 1;
    if (cool <= 0) {
      clearInterval(coolHandle);
      coolHandle = null;
      beginStation(stationIdx);
      render();
      return;
    }
    render();
  }, 1000);
}

/* ===========================================================================
 * FIRESTORE — award once, guarded on vaultGames.vigil.completed
 * ========================================================================= */

async function awardCompletion() {
  const studentRef = doc(db, 'students', email);

  try {
    const alreadyDone = await runTransaction(db, async (tx) => {
      const snap = await tx.get(studentRef);
      const data = snap.data() || {};
      const existing = (data.vaultGames || {}).vigil;
      if (existing && existing.completed) return true;

      const updates = {
        'vaultGames.vigil.completed': true,
        'vaultGames.vigil.completedAt': new Date().toISOString(),
        achievements: arrayUnion(vaultGameBadgeId('vigil')),
        unlockTokens: increment(SACRED_LIGHT_REWARD.unlockTokens)
      };
      SACRED_LIGHT_REWARD.tickets.forEach(({ key, count }) => {
        const ticketField = TICKETS[key].ticket;
        updates[`tickets.${ticketField}`] = increment(count);
      });
      tx.update(studentRef, updates);
      return false;
    });

    if (!alreadyDone) {
      logActivity({
        email, name, type: 'vaultgame',
        title: 'Kept the Vigil through all five stations and opened the Sacred Light',
        icon: '🗝️'
      });
    }
    return !alreadyDone;
  } catch (err) {
    console.error('Failed to award Vigil completion:', err);
    return false;
  }
}

/** The vigil is kept. Award the reward immediately (safe even if the
 *  student closes the tab during the catechism that follows), then make
 *  them sit with the catechism before they ever see the popup. */
async function revealTreasure() {
  await awardCompletion();
  showCatechism(() => {
    showTreasureReveal({
      iconSrc: 'assets/sacred-light.jpg',
      kicker: 'The Vigil Complete',
      heading: 'The Sacred Light',
      subheading: 'Every candle lit, every station passed. The light you kept is yours to keep.',
      chips: [
        ...SACRED_LIGHT_REWARD.tickets.map(({ key, count }) => `+${count} ${TICKETS[key].name}`),
        `+${SACRED_LIGHT_REWARD.unlockTokens} Artifact Unlock Tokens`
      ]
    });
  });
}

/* ===========================================================================
 * RENDER
 * ========================================================================= */

function subLine() {
  if (screen === 'done') return 'The vigil is kept.';
  if (screen === 'cooldown') return 'The cathedral is dark.';
  if (screen === 'answered') return 'The wick takes.';
  if (screen === 'marking') return 'Mark the answer, and choose again.';
  if (screen === 'asking') return 'Answer, and the wick will take.';
  return 'Choose a candle and it will ask something of you.';
}

function renderTimerOnly() {
  const cell = root.querySelector('.lnt-cell.is-timer');
  if (!cell) { render(); return; }
  const low = seconds <= 8;
  cell.className = 'lnt-cell is-timer is-running' + (low ? ' is-low' : '');
  const valueEl = cell.querySelector('.lnt-cell-v');
  const fillEl = cell.querySelector('.lnt-count-fill');
  if (valueEl) {
    valueEl.innerHTML = `
      ${hourglassSvg(seconds, TIME_PER_QUESTION, low)}
      <span class="lnt-clock">${Math.max(0, seconds)}<span class="lnt-clock-u">s</span></span>
    `;
  }
  if (fillEl) fillEl.style.width = `${(Math.max(0, seconds) / TIME_PER_QUESTION) * 100}%`;
}

function render() {
  const station = STATIONS[stationIdx];
  const candleCount = station.spots.length;
  const count = lit.filter(Boolean).length;
  const inNave = screen === 'nave' || screen === 'asking' || screen === 'answered' || screen === 'marking';
  const marking = screen === 'marking' || screen === 'answered';
  const question = openCandle == null ? null : set[openCandle];
  const onShow = marking ? shownQ : question;

  let body = '';

  if (inNave) {
    body += `
      <div class="lnt-bar">
        <div class="lnt-cell">
          <span class="lnt-cell-l">Round ${stationIdx + 1} of ${STATIONS.length}</span>
          <span class="lnt-cell-v">${esc(station.name)}</span>
        </div>
        <div class="lnt-cell">
          <span class="lnt-cell-l">Candles</span>
          <span class="lnt-cell-v">
            <span class="lnt-pips">${Array.from({ length: candleCount }).map((_, i) => `<span class="lnt-pip${lit[i] ? ' is-lit' : ''}"></span>`).join('')}</span>
            <span class="lnt-cell-n">${count}/${candleCount}</span>
          </span>
        </div>
        <div class="lnt-cell">
          <span class="lnt-cell-l">Attempts</span>
          <span class="lnt-cell-v">${Array.from({ length: ATTEMPTS_PER_VIGIL }).map((_, i) => `<span class="lnt-att${i >= attemptsLeft ? ' is-spent' : ''}"></span>`).join('')}</span>
        </div>
        <div class="lnt-cell is-timer${screen === 'asking' ? ' is-running' : ' is-idle'}${screen === 'asking' && seconds <= 8 ? ' is-low' : ''}">
          <span class="lnt-cell-l">Time</span>
          <span class="lnt-cell-v">
            ${hourglassSvg(screen === 'asking' ? seconds : TIME_PER_QUESTION, TIME_PER_QUESTION, screen === 'asking' && seconds <= 8)}
            <span class="lnt-clock">${screen === 'asking' ? Math.max(0, seconds) : TIME_PER_QUESTION}<span class="lnt-clock-u">s</span></span>
          </span>
          <span class="lnt-count-track"><span class="lnt-count-fill" style="width:${screen === 'asking' ? (Math.max(0, seconds) / TIME_PER_QUESTION) * 100 : 100}%"></span></span>
        </div>
      </div>

      ${stationSvg(station, lit, openCandle, screen !== 'nave')}

      <div class="lnt-scroll">
        <div class="lnt-sheet">
          ${verdict ? `
            <div class="lnt-verdict${verdict.up ? ' is-up' : ' is-down'}">
              ${thumbSvg(verdict.up)}
              <p>${esc(verdict.text)}</p>
            </div>
          ` : ''}

          ${onShow ? `
            <p class="lnt-prompt">${esc(onShow.prompt)}</p>
            <ul class="lnt-options">
              ${onShow.options.map((opt, i) => {
                // Only ever highlight the option the student themselves picked
                // (right in green when correct, wrong in red on a miss) --
                // never the correct answer they didn't choose, or a miss
                // teaches the answer for free on the next try at the same
                // candle instead of testing whether they actually know it.
                const cls = 'lnt-option' +
                  (screen === 'answered' && i === onShow.answer ? ' is-right' : '') +
                  (marking && i === picked ? ' is-wrong' : '');
                return `<li><button type="button" class="${cls}" data-opt="${i}" ${marking ? 'disabled' : ''}>${esc(opt)}</button></li>`;
              }).join('')}
            </ul>
          ` : ''}

          ${screen === 'nave' && !verdict ? `
            <p class="lnt-idle">${esc(station.line)} Each candle holds a question from the module, and each one you light draws a little more of this place out of the dark.</p>
          ` : ''}
        </div>
      </div>
    `;
  } else if (screen === 'cooldown') {
    body += `
      <div class="lnt-stage">
        ${thumbSvg(false)}
        <p class="lnt-lost-line">Three attempts spent. Every flame gutters out.</p>
        <p class="lnt-cool-n">${cool}</p>
        <p class="lnt-cool-l">The doors open again in ${cool === 1 ? 'a second' : `${cool} seconds`}.</p>
        <p class="lnt-cool-note">${esc(station.name)} begins again with different questions drawn from the pool.</p>
      </div>
    `;
  } else if (screen === 'done') {
    body += `
      <div class="lnt-stage">
        ${thumbSvg(true)}
        <p class="lnt-done-line">The vigil is kept.</p>
        <p class="lnt-done-sub">${marks === 0 ? 'Seven candles, seven answers, and no wick lit twice.' : `${litFirstTry} of ${TOTAL_CANDLES} lit at the first asking.`}</p>
        <button type="button" class="lnt-go" id="lntReturn">Return to the Cloister</button>
      </div>
    `;
  }

  root.innerHTML = `
    <header class="lnt-head">
      <div class="lnt-head-text">
        <div class="lnt-crest">
          <svg class="lnt-flourish" viewBox="0 0 64 20" aria-hidden="true">
            <path d="M0 10 H34" />
            <path d="M40 10 q6 -7 12 0 q-6 7 -12 0" />
            <circle cx="58" cy="10" r="2.2" />
          </svg>
          <h1 class="lnt-title">The Vigil</h1>
          <svg class="lnt-flourish is-right" viewBox="0 0 64 20" aria-hidden="true">
            <path d="M0 10 H34" />
            <path d="M40 10 q6 -7 12 0 q-6 7 -12 0" />
            <circle cx="58" cy="10" r="2.2" />
          </svg>
        </div>
        <p class="lnt-tagline">Seven Candles Against the Dark</p>
        <p class="lnt-sub">${subLine()}</p>
      </div>
      <button type="button" class="lnt-help" id="lntHelp">How to Play</button>
      <button type="button" class="lnt-exit" id="lntExit">Leave</button>
    </header>
    ${body}
  `;

  wireEvents();
}

function wireEvents() {
  root.querySelectorAll('.lnt-candle[data-index]:not([data-disabled])').forEach((g) => {
    const i = Number(g.dataset.index);
    g.addEventListener('click', () => openIt(i));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter') openIt(i); });
  });

  root.querySelectorAll('.lnt-option[data-opt]:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => answer(Number(btn.dataset.opt)));
  });

  const returnBtn = root.querySelector('#lntReturn');
  if (returnBtn) returnBtn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });

  const exitBtn = root.querySelector('#lntExit');
  if (exitBtn) exitBtn.addEventListener('click', () => { window.location.href = 'dashboard.html'; });

  const helpBtn = root.querySelector('#lntHelp');
  if (helpBtn) helpBtn.addEventListener('click', () => {
    // Pause the question's clock while re-reading the guide -- it
    // shouldn't cost time just to look up how a station works.
    const wasTiming = screen === 'asking' && !!timerHandle;
    if (wasTiming) stopTimer();
    showGuide(() => { if (wasTiming) startTimer(); });
  });
}

/* ===========================================================================
 * INIT — a one-time challenge. If it's already been completed, don't
 * draw a single station; show the closed-cathedral notice instead.
 * ========================================================================= */

async function init() {
  let data = {};
  try {
    const snap = await getDoc(doc(db, 'students', email));
    data = snap.exists() ? snap.data() : {};
  } catch (err) {
    console.error('Failed to load student record:', err);
  }

  const progress = (data.vaultGames || {}).vigil;
  if (progress && progress.completed) {
    root.innerHTML = `
      <header class="lnt-head">
        <div class="lnt-head-text">
          <div class="lnt-crest">
            <svg class="lnt-flourish" viewBox="0 0 64 20" aria-hidden="true">
              <path d="M0 10 H34" /><path d="M40 10 q6 -7 12 0 q-6 7 -12 0" /><circle cx="58" cy="10" r="2.2" />
            </svg>
            <h1 class="lnt-title">The Vigil</h1>
            <svg class="lnt-flourish is-right" viewBox="0 0 64 20" aria-hidden="true">
              <path d="M0 10 H34" /><path d="M40 10 q6 -7 12 0 q-6 7 -12 0" /><circle cx="58" cy="10" r="2.2" />
            </svg>
          </div>
          <p class="lnt-tagline">Seven Candles Against the Dark</p>
          <p class="lnt-sub">The cathedral is closed to you now.</p>
        </div>
        <button type="button" class="lnt-exit" id="lntExit">Leave</button>
      </header>
      <div class="lnt-stage">
        ${thumbSvg(true)}
        <p class="lnt-lost-line" style="color: var(--gold);">You have already kept this vigil.</p>
        <p class="lnt-lost-sub">The Vigil is a watch kept once. Its reward is already on your desk${progress.completedAt ? ` — sealed ${new Date(progress.completedAt).toLocaleDateString()}` : ''}.</p>
        <button type="button" class="lnt-go" id="lntReturn">Return to the Cloister</button>
      </div>
    `;
    root.querySelector('#lntExit').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    root.querySelector('#lntReturn').addEventListener('click', () => { window.location.href = 'dashboard.html'; });
    return;
  }

  function beginPlay() {
    beginStation(0);
    render();
  }

  const seenGuide = !!(data.seenGameGuides || {}).vigil;
  if (seenGuide) {
    beginPlay();
  } else {
    showGuide(() => { markGuideSeen(); beginPlay(); });
  }
}

init();
