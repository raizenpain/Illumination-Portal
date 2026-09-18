// ============================================
// LEGENDARY COUNTDOWN — a mandatory 25-day wait a student hits right
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
// anyone is looking at it. Once it ends, the Comprehensive Final Exam
// chapter itself is what the student reaches next -- the wait sits in
// front of it, not after it.
//
// Deliberately does NOT grant the Legendary (Tier 5) artifact itself
// once the countdown ends -- that stays exactly as it already worked
// in crafting.js's checkTier5AutoUnlock(): still gated separately on
// the student submitting the Apostle reflection and owning all 4
// artifacts in their chosen chain. This is purely an added wait
// bolted in front of that, not a shortcut past it.
//
// Never shown to admin/teacher accounts (ADMIN_EMAILS) -- they have
// no student doc and must never be blocked from previewing the site.
// ============================================

import { db, doc, getDoc, runTransaction } from './firebase.js';
import { ADMIN_EMAILS } from './admins.js';
import { SEASON_CONTENT } from './seasonContent.js';

const COUNTDOWN_DAYS = 25;
const COUNTDOWN_MS = COUNTDOWN_DAYS * 24 * 60 * 60 * 1000;

// True the instant a student has finished every Final Season chapter
// EXCEPT the last one (final_ch11, "The Comprehensive Final Exam") --
// deliberately BEFORE that exam, not after it, so the exam itself sits
// behind the 25-day wait rather than being one more thing to finish
// before the wait begins. Computed from the chapter list itself (last
// chapter = whichever one is actually last), not a hardcoded chapter
// id, so this keeps working if Final Season's chapters are ever
// reordered or added to.
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

function showOverlay(endAt) {
  if (document.querySelector('.legendary-countdown-overlay')) return; // already showing

  const overlay = document.createElement('div');
  overlay.className = 'legendary-countdown-overlay';
  overlay.innerHTML = `
    <div class="legendary-countdown-card">
      <p class="legendary-countdown-kicker">⚔️ Forging the Legendary</p>
      <h2 class="legendary-countdown-heading">Before the Comprehensive Final Exam</h2>
      <p class="legendary-countdown-sub">You have finished every chapter leading up to the Comprehensive Final Exam. Before you may attempt it, the Legendary Artifact itself must be forged — a trial of patience, not skill. The portal reopens to you, exam included, the moment the forge is done.</p>
      <div class="legendary-countdown-timer">
        <div class="legendary-countdown-unit"><span id="lcDays">--</span><label>Days</label></div>
        <div class="legendary-countdown-unit"><span id="lcHours">--</span><label>Hours</label></div>
        <div class="legendary-countdown-unit"><span id="lcMinutes">--</span><label>Minutes</label></div>
        <div class="legendary-countdown-unit"><span id="lcSeconds">--</span><label>Seconds</label></div>
        <div class="legendary-countdown-unit legendary-countdown-ms"><span id="lcMs">---</span><label>Ms</label></div>
      </div>
      <p class="legendary-countdown-note">Signing out won't pause the forge — the countdown keeps running either way.</p>
      <button type="button" class="legendary-countdown-signout">Sign Out</button>
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

  overlay.querySelector('.legendary-countdown-signout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });
}

async function init() {
  // ?previewCountdown=1 shows the overlay immediately with a fake
  // 25-day end time, touching zero Firestore reads/writes -- same
  // "content preview via URL param" pattern already used elsewhere
  // (see maybeShowCapstonePreview in vaultCapstone.js).
  const params = new URLSearchParams(window.location.search);
  if (params.get('previewCountdown')) {
    showOverlay(Date.now() + COUNTDOWN_MS);
    return;
  }

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

  if (!isReadyForFinalExam(data)) return;

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

  const endAt = new Date(startedAt).getTime() + COUNTDOWN_MS;
  if (Date.now() >= endAt) return; // already finished

  showOverlay(endAt);
}

init();
