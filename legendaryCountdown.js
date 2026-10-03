// ============================================
// LEGENDARY COUNTDOWN — a mandatory 15-day wait a student hits right
// BEFORE the Comprehensive Final Exam (final_ch11, the last chapter of
// Final Season) -- not after finishing it. One <script> include per
// student-facing page (same "nothing else needs to change" pattern as
// clickSound.js) -- this file runs itself on import, no exported
// function to call.
//
// Trigger: the instant isReadyForFinalExam(data) is first true (every
// Final Season chapter done EXCEPT the last one), legendaryCountdown
// StartedAt is written once (guarded against a race across multiple
// open tabs) and can never re-trigger. From that moment, every page
// shows a full-screen overlay with a live days/hours/minutes/seconds/
// milliseconds countdown -- no skip or close button, by explicit
// choice over a dismissible banner, so the wait is unavoidable rather
// than merely visible. Signing out is still reachable so nobody is
// left with zero options, but it does NOT pause or reset the
// countdown -- it keeps running in Firestore regardless of whether
// anyone is looking at it.
//
// When the 15 days are up, the same overlay turns into the KEY screen
// (Jornie's design, 2026-10-03): the Legendary Key appears, and the
// student taps it to open the Comprehensive Final Exam. Turning the key
// saves legendaryKeyUsedAt, after which this overlay never shows again
// on any device. (Was 25 days with the overlay simply vanishing at zero.)
// If that save fails (e.g. the free-tier quota), a per-device
// localStorage flag still lets the student through on this device, and
// the save is retried quietly on their next page load.
//
// Deliberately does NOT grant the Legendary (Tier 5) artifact itself --
// that stays exactly as it already worked in crafting.js's
// checkTier5AutoUnlock(): still gated separately on the student
// submitting the Apostle reflection and owning all 4 artifacts in
// their chosen chain. This is purely an added wait bolted in front of
// that exam, not a shortcut past anything.
//
// Never shown to admin/teacher accounts (ADMIN_EMAILS) -- they have
// no student doc and must never be blocked from previewing the site.
//
// Previews (no Firestore reads/writes): ?previewCountdown=1 shows the
// 15-day countdown, ?previewCountdown=10 a 10-SECOND countdown that
// turns into the key, ?previewKey=1 the key screen directly.
// ============================================

import { db, doc, getDoc, updateDoc, runTransaction } from './firebase.js';
import { ADMIN_EMAILS } from './admins.js';
import { SEASON_CONTENT } from './seasonContent.js';
import { runForgeGate, maybePreviewForge } from './legendaryForge.js';

const COUNTDOWN_DAYS = 15;
const COUNTDOWN_MS = COUNTDOWN_DAYS * 24 * 60 * 60 * 1000;
const EXAM_URL = 'season.html?season=final'; // opens at the first unfinished chapter = the exam
const KEY_IMAGE = 'assets/legendary-key.webp'; // transparent cut-out of the key

// True the instant a student has finished every Final Season chapter
// EXCEPT the last one (final_ch11, "The Comprehensive Final Exam") --
// deliberately BEFORE that exam, not after it, so the exam itself sits
// behind the wait rather than being one more thing to finish before
// the wait begins. Computed from the chapter list itself (last chapter
// = whichever one is actually last), not a hardcoded chapter id, so
// this keeps working if Final Season's chapters are ever reordered or
// added to.
function isReadyForFinalExam(data) {
  const chapters = SEASON_CONTENT.final.chapters;
  if (!chapters.length) return false;
  const completed = data.completedNodes || {};
  const chapterDone = (ch) => ch.nodes.every((n) => !!completed[n.nodeId]);

  const priorChapters = chapters.slice(0, -1);
  const finalExamChapter = chapters[chapters.length - 1];

  return priorChapters.every(chapterDone) && !chapterDone(finalExamChapter);
}

function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

const localKeyFlag = (email) => `legendaryKeyUsed_${email}`;
function readLocalKey(email) {
  try { return localStorage.getItem(localKeyFlag(email)) === '1'; } catch (err) { return false; }
}
function writeLocalKey(email) {
  try { localStorage.setItem(localKeyFlag(email), '1'); } catch (err) { /* best effort */ }
}

// ---- dark fantasy dressing (styles live in style.css, LEGENDARY COUNTDOWN) ----

// Cinzel is loaded on the dashboard; some game pages don't load it, so
// pull it in here (Georgia is the fallback either way).
function ensureCinzel() {
  if ([...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) return;
  const font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
  document.head.appendChild(font);
}

const CORNER_SVG = `
  <svg viewBox="0 0 46 46" fill="none" aria-hidden="true">
    <path d="M2 30 V8 Q2 2 8 2 H30" stroke="#C9923A" stroke-width="1.6"/>
    <path d="M7 22 V11 Q7 7 11 7 H22" stroke="#E9B85A" stroke-width="1" opacity=".7"/>
    <path d="M2 8 Q14 10 16 16 Q10 14 8 2" fill="#C9923A" opacity=".85"/>
    <circle cx="16" cy="16" r="2.4" fill="#FFD9A0"/>
  </svg>`;

function cornersHtml() {
  return ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="legendary-countdown-corner ${c}">${CORNER_SVG}</span>`).join('');
}

function embersHtml() {
  let out = '';
  for (let i = 0; i < 22; i++) {
    out += `<span style="--x:${Math.random() * 100}%;--s:${3 + Math.random() * 5}px;--d:${7 + Math.random() * 7}s;--delay:${-Math.random() * 12}s;--drift:${(Math.random() - 0.5) * 120}px"></span>`;
  }
  return out;
}

function signOutButton(overlay) {
  const btn = overlay.querySelector('.legendary-countdown-signout');
  if (!btn) return;
  btn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });
}

// The countdown card. When it reaches zero it swaps itself for the key
// screen in place (onDone), instead of just disappearing.
function showOverlay(endAt, onDone) {
  if (document.querySelector('.legendary-countdown-overlay')) return; // already showing

  ensureCinzel();
  const overlay = document.createElement('div');
  overlay.className = 'legendary-countdown-overlay';
  overlay.innerHTML = `
    <div class="legendary-countdown-embers">${embersHtml()}</div>
    <div class="legendary-countdown-card" role="dialog" aria-modal="true" aria-labelledby="lcHeading">
      ${cornersHtml()}
      <div class="legendary-countdown-scroll">
        <p class="legendary-countdown-kicker">✦ Forging the Legendary ✦</p>
        <h2 class="legendary-countdown-heading" id="lcHeading">Before the Comprehensive Final Exam</h2>
        <div class="legendary-countdown-divider"><i></i></div>
        <p class="legendary-countdown-sub">You have finished every chapter leading up to the Comprehensive Final Exam. Before you may attempt it, <strong>the Legendary Key must be forged</strong> — a trial of patience, not skill. When the forge is done, the key will appear for you to unlock the exam.</p>
        <p class="legendary-countdown-label">The forge burns for</p>
        <div class="legendary-countdown-timer" role="timer" aria-label="Time left until the Legendary Key is forged">
          <div class="legendary-countdown-unit"><span id="lcDays">--</span><label>Days</label></div>
          <div class="legendary-countdown-unit"><span id="lcHours">--</span><label>Hours</label></div>
          <div class="legendary-countdown-unit"><span id="lcMinutes">--</span><label>Mins</label></div>
          <div class="legendary-countdown-unit"><span id="lcSeconds">--</span><label>Secs</label></div>
          <div class="legendary-countdown-unit legendary-countdown-ms"><span id="lcMs">---</span><label>Ms</label></div>
        </div>
        <p class="legendary-countdown-note">Signing out won't pause the forge — the countdown keeps running either way.</p>
      </div>
      <div class="legendary-countdown-foot"><button type="button" class="legendary-countdown-signout">Sign Out</button></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const daysEl = overlay.querySelector('#lcDays');
  const hoursEl = overlay.querySelector('#lcHours');
  const minutesEl = overlay.querySelector('#lcMinutes');
  const secondsEl = overlay.querySelector('#lcSeconds');
  const msEl = overlay.querySelector('#lcMs');

  function tick() {
    const remaining = endAt - Date.now();
    if (remaining <= 0) {
      overlay.remove();
      if (onDone) onDone();
      return;
    }
    daysEl.textContent = Math.floor(remaining / 86400000);
    hoursEl.textContent = pad(Math.floor((remaining % 86400000) / 3600000));
    minutesEl.textContent = pad(Math.floor((remaining % 3600000) / 60000));
    secondsEl.textContent = pad(Math.floor((remaining % 60000) / 1000));
    msEl.textContent = pad(Math.floor(remaining % 1000), 3);
    requestAnimationFrame(tick);
  }
  tick();
  signOutButton(overlay);
}

// The key screen. useKey() must resolve true once it's safe to open the
// exam (saved, or at least remembered on this device); the animation
// plays while it runs.
function showKeyScreen(useKey) {
  if (document.querySelector('.legendary-countdown-overlay')) return;

  ensureCinzel();
  const overlay = document.createElement('div');
  overlay.className = 'legendary-countdown-overlay';
  overlay.innerHTML = `
    <div class="legendary-countdown-embers">${embersHtml()}</div>
    <div class="legendary-countdown-card legendary-key-card" role="dialog" aria-modal="true" aria-labelledby="lcKeyHeading">
      ${cornersHtml()}
      <div class="legendary-countdown-scroll">
        <p class="legendary-countdown-kicker">✦ The Forge Is Complete ✦</p>
        <h2 class="legendary-countdown-heading" id="lcKeyHeading">The Legendary Key Is Yours</h2>
        <div class="legendary-countdown-divider"><i></i></div>
        <p class="legendary-countdown-sub">Your patience has been proven. <strong>Take the key</strong> and open the way to the Comprehensive Final Exam.</p>
        <div class="legendary-key-stage">
          <button type="button" class="legendary-key-btn" aria-label="Turn the key to open the Comprehensive Final Exam">
            <span class="legendary-key-glow" aria-hidden="true"></span>
            <img src="${KEY_IMAGE}" alt="The Legendary Key">
          </button>
        </div>
        <p class="legendary-key-hint" role="status">Tap the key to unlock the exam</p>
      </div>
      <div class="legendary-countdown-foot"><button type="button" class="legendary-countdown-signout">Sign Out</button></div>
    </div>
    <div class="legendary-key-flash" aria-hidden="true"></div>
  `;
  document.body.appendChild(overlay);
  signOutButton(overlay);

  const keyBtn = overlay.querySelector('.legendary-key-btn');
  const hint = overlay.querySelector('.legendary-key-hint');
  keyBtn.addEventListener('click', async () => {
    if (keyBtn.disabled) return;
    keyBtn.disabled = true;
    overlay.classList.add('turning');
    hint.textContent = 'The lock is turning…';

    const minAnimation = new Promise((resolve) => setTimeout(resolve, 1600));
    const [ok] = await Promise.all([useKey(), minAnimation]);
    if (!ok) {
      overlay.classList.remove('turning');
      keyBtn.disabled = false;
      hint.textContent = 'The key slipped. Check your connection and tap it again.';
      return;
    }
    overlay.classList.add('opened');
    hint.textContent = 'The gate is open!';
    setTimeout(() => { window.location.href = EXAM_URL; }, 900);
  });
}

async function saveKeyUsed(studentRef) {
  await updateDoc(studentRef, { legendaryKeyUsedAt: new Date().toISOString() });
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  // Previews -- zero Firestore reads/writes.
  const previewSeconds = Number(params.get('previewCountdown'));
  if (params.get('previewKey') || params.get('previewCountdown')) {
    const previewUse = () => new Promise((resolve) => setTimeout(() => resolve(true), 300));
    const keyPreview = () => showKeyScreen(previewUse);
    if (params.get('previewKey')) { keyPreview(); return; }
    const ms = previewSeconds > 1 && previewSeconds < 3600 ? previewSeconds * 1000 : COUNTDOWN_MS;
    showOverlay(Date.now() + ms, keyPreview);
    return;
  }
  if (await maybePreviewForge()) return; // ?previewForge / ?previewForging / ?previewForgeDone

  const email = localStorage.getItem('studentEmail');
  if (!email || ADMIN_EMAILS.includes(email)) return;

  const studentRef = doc(db, 'students', email);
  let data;
  try {
    const snap = await getDoc(studentRef);
    if (!snap.exists()) return;
    data = snap.data();
  } catch (err) {
    console.error('Legendary countdown: failed to load student record:', err);
    return;
  }

  // Not at the exam gate: this same record also tells us whether the
  // student is in the Legendary Forge (ritual / 5-day forging / reveal),
  // which blocks every page the same way -- see legendaryForge.js.
  if (!isReadyForFinalExam(data)) {
    runForgeGate({ email, name: localStorage.getItem('studentName') || data.name, data });
    return;
  }

  // Key already turned: on record, or at least on this device (a save
  // that failed last time is quietly retried here).
  if (data.legendaryKeyUsedAt) return;
  if (readLocalKey(email)) {
    saveKeyUsed(studentRef).catch((err) => console.error('Legendary countdown: retrying key save failed:', err));
    return;
  }

  let startedAt = data.legendaryCountdownStartedAt;
  if (!startedAt) {
    const candidate = new Date().toISOString();
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(studentRef);
        const live = snap.data() || {};
        if (live.legendaryCountdownStartedAt) return; // another tab/session already started it
        tx.update(studentRef, { legendaryCountdownStartedAt: candidate });
      });
      // Re-read rather than trust `candidate` -- another tab may have won
      // the race with a different timestamp; every tab must count down
      // from the SAME instant, not whichever one happened to run first.
      const fresh = await getDoc(studentRef);
      startedAt = fresh.data().legendaryCountdownStartedAt || candidate;
    } catch (err) {
      console.error('Legendary countdown: failed to start countdown:', err);
      return;
    }
  }

  const useKey = async () => {
    writeLocalKey(email); // this device lets them through even if the save below fails
    try {
      await saveKeyUsed(studentRef);
    } catch (err) {
      console.error('Legendary countdown: failed to save the key (this device will still open the exam):', err);
    }
    return true;
  };

  const endAt = new Date(startedAt).getTime() + COUNTDOWN_MS;
  if (Date.now() >= endAt) {
    showKeyScreen(useKey);
  } else {
    showOverlay(endAt, () => showKeyScreen(useKey));
  }
}

init();
