// ============================================
// PRELIM DEADLINE -- the Prelim Season closes for good at
// PRELIM_LOCKS_AT. Two pieces, one shared dark-fantasy look:
//
// 1. maybeShowPrelimReminder() -- a dashboard popup with a live
//    countdown, shown until the lock. Students who haven't unlocked
//    Midterm see it on EVERY dashboard visit; students who already
//    have see it once (hasSeenPrelimReminder). Admins see it on every
//    visit too (Jornie's request, 2026-10-01).
//
// 2. enforcePrelimLockout() -- called from requireLogin() in auth.js,
//    so it covers every student page. From PRELIM_LOCKS_AT on, a
//    student whose midtermUnlocked isn't true gets a full-screen,
//    unclosable "Prelim Season has closed" screen. There is no way
//    back in (Jornie's call) -- admins can't set midtermUnlocked either
//    (see firestore.rules). ADMIN_EMAILS (the teachers) are never
//    affected. firestore.rules enforces the same lock server-side, so
//    deleting the overlay in devtools doesn't let a locked student
//    save anything.
//
//    Fails OPEN on a read error: the recurring free-tier quota cap
//    (see project notes) must never lock out a student who did unlock
//    Midterm. The rules still block a truly locked student's writes.
//
// All CSS is injected from here (own .prelim-* classes only) rather
// than added to style.css, so the lockout also renders correctly on
// the game pages that load their own stylesheets.
// ============================================

import { db, doc, getDoc, updateDoc, auth, signOut } from './firebase.js';
import { ADMIN_EMAILS } from './admins.js';

// Keep in sync with prelimLockPassed() in firestore.rules. Moved from
// October 5 to October 10 at Jornie's request (2026-10-02).
export const PRELIM_LOCKS_AT = '2026-10-10T00:00:00+08:00';
const LOCK_MS = new Date(PRELIM_LOCKS_AT).getTime();
// "October 10, 2026" -- the popup and lockout wording read the date from
// here so they can't drift from the real lock time. (The time of day in
// that wording is still the literal "12:00 AM".)
const LOCK_DATE_TEXT = new Date(PRELIM_LOCKS_AT).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' });

export function isPrelimLocked() {
  return Date.now() >= LOCK_MS;
}

// ---------- shared styles ----------

const CSS = `
@keyframes prFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes prRise { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes prEmber {
  0% { transform: translate(0, 0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translate(var(--drift), -110vh) scale(.4); opacity: 0; }
}
@keyframes prRunePulse { 0%, 100% { box-shadow: inset 0 0 12px rgba(0,0,0,.8), 0 0 0 rgba(255,120,40,0); } 50% { box-shadow: inset 0 0 12px rgba(0,0,0,.8), 0 0 14px rgba(255,120,40,.35); } }
@keyframes prSealGlow { 0%, 100% { filter: drop-shadow(0 0 4px var(--seal)); } 50% { filter: drop-shadow(0 0 10px var(--seal)); } }

.prelim-reminder-overlay {
  position: fixed; inset: 0; z-index: 10100;
  display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box; overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 110%, rgba(140,40,10,.45), transparent 55%),
    radial-gradient(ellipse at center, rgba(12,8,6,.88), rgba(0,0,0,.96));
  animation: prFadeIn .45s ease;
  font-family: 'Segoe UI', system-ui, sans-serif;
}
/* The lockout sits above everything, including the Legendary Countdown (20000). */
.prelim-reminder-overlay.prelim-lockout { z-index: 30000; background: radial-gradient(ellipse at 50% 110%, rgba(140,40,10,.5), transparent 55%), radial-gradient(ellipse at center, #120c0a, #000); }
.prelim-veil { position: fixed; inset: 0; z-index: 30000; background: #050303; }
.prelim-reminder-embers { position: absolute; inset: 0; pointer-events: none; }
.prelim-reminder-embers span {
  position: absolute; bottom: -10px; left: var(--x);
  width: var(--s); height: var(--s); border-radius: 50%;
  background: radial-gradient(circle, #FFD08A 0%, #FF7A1A 45%, rgba(255,80,0,0) 70%);
  animation: prEmber var(--d) linear var(--delay) infinite;
  opacity: 0;
}
.prelim-reminder-card {
  position: relative; width: min(500px, 100%); max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px);
  /* The card itself never scrolls: the frame, its corner ornaments and
     the button stay put, and only .prelim-reminder-scroll moves. When
     the whole card scrolled, a white native scrollbar cut into the
     frame, the bottom corners sat on top of the button, and the button
     itself was cut off on laptop-height screens. */
  display: flex; flex-direction: column; overflow: hidden;
  box-sizing: border-box; padding: 0;
  color: #E8DCC4; text-align: center;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(201,146,58,.16), transparent 60%),
    radial-gradient(circle at 20% 80%, rgba(90,20,10,.25), transparent 50%),
    linear-gradient(170deg, #1B1512 0%, #0E0A09 55%, #070505 100%);
  border: 1px solid #6B4E1F;
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 4px #0E0A09,
    inset 0 0 0 5px rgba(201,146,58,.55),
    inset 0 0 60px rgba(0,0,0,.7),
    0 0 0 1px #000,
    0 30px 80px rgba(0,0,0,.8),
    0 0 70px rgba(255,110,30,.12);
  animation: prRise .55s cubic-bezier(.2,.9,.3,1.1);
}
/* 6px side/top margin keeps the scrollbar inside the gold inner frame. */
.prelim-reminder-scroll {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
  margin: 6px 6px 0; padding: 24px 24px 14px;
  scrollbar-width: thin; scrollbar-color: #6B4E1F transparent;
}
.prelim-reminder-scroll::-webkit-scrollbar { width: 8px; }
.prelim-reminder-scroll::-webkit-scrollbar-track { background: transparent; }
.prelim-reminder-scroll::-webkit-scrollbar-thumb { background: #6B4E1F; border-radius: 4px; }
.prelim-reminder-foot { position: relative; flex-shrink: 0; padding: 4px 30px 24px; }
/* A soft fade above the button: phones hide scrollbars, so this is the
   cue that there is more to read when the middle part scrolls. */
.prelim-reminder-foot::before {
  content: ''; position: absolute; left: 6px; right: 6px; top: -18px; height: 18px; pointer-events: none;
  background: linear-gradient(180deg, rgba(9,6,5,0), rgba(9,6,5,.95));
}
.prelim-reminder-corner { position: absolute; width: 46px; height: 46px; pointer-events: none; z-index: 1; }
.prelim-reminder-corner svg { display: block; width: 100%; height: 100%; }
.prelim-reminder-corner.tl { top: 2px; left: 2px; }
.prelim-reminder-corner.tr { top: 2px; right: 2px; transform: scaleX(-1); }
.prelim-reminder-corner.bl { bottom: 2px; left: 2px; transform: scaleY(-1); }
.prelim-reminder-corner.br { bottom: 2px; right: 2px; transform: scale(-1, -1); }
.prelim-reminder-kicker {
  margin: 0 0 10px; font-family: 'Cinzel', Georgia, serif; font-weight: 700;
  font-size: 11.5px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A;
}
.prelim-reminder-heading {
  margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700;
  font-size: 27px; line-height: 1.2; letter-spacing: .5px; text-wrap: balance;
  background: linear-gradient(180deg, #FFF1C9 0%, #E9B85A 55%, #9C6A22 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,.8)) drop-shadow(0 0 14px rgba(233,184,90,.25));
}
.prelim-reminder-divider { display: flex; align-items: center; gap: 10px; margin: 14px 0 18px; }
.prelim-reminder-divider::before, .prelim-reminder-divider::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, #C9923A 40%, #C9923A 60%, transparent);
}
.prelim-reminder-divider i { width: 8px; height: 8px; transform: rotate(45deg); background: #E9B85A; box-shadow: 0 0 8px rgba(233,184,90,.7); }
.prelim-reminder-gift {
  margin: 0 0 16px; padding: 10px 14px; border-radius: 4px; font-size: 13.5px; line-height: 1.55; text-align: center;
  color: #F3E7CC; background: linear-gradient(135deg, rgba(233,184,90,.22), rgba(120,70,10,.14));
  border: 1px solid rgba(233,184,90,.55); box-shadow: 0 0 16px rgba(233,184,90,.12);
}
.prelim-reminder-gift strong { color: #FFE2A8; }
.prelim-reminder-deadline-label {
  margin: 0 0 10px; font-family: 'Cinzel', Georgia, serif; font-weight: 700;
  font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #D98A4A;
}
.prelim-reminder-countdown { display: flex; align-items: stretch; justify-content: center; gap: 6px; margin: 0 0 20px; }
.prelim-reminder-rune {
  flex: 1; max-width: 88px; padding: 10px 4px 8px; border-radius: 4px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: linear-gradient(180deg, #2A221D 0%, #15100D 100%);
  border: 1px solid #4A3820;
  box-shadow: inset 0 0 12px rgba(0,0,0,.8);
  animation: prRunePulse 3s ease-in-out infinite;
}
.prelim-reminder-rune b {
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 30px; line-height: 1;
  color: #FFD9A0; font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px rgba(255,130,40,.6), 0 2px 0 #000;
}
.prelim-reminder-rune span { font-family: 'Cinzel', Georgia, serif; font-size: 9.5px; letter-spacing: 1.5px; text-transform: uppercase; color: #A89272; }
.prelim-reminder-sep { align-self: center; color: #6B4E1F; font-family: 'Cinzel', Georgia, serif; font-size: 20px; padding-bottom: 14px; }
.prelim-reminder-text { margin: 0 0 12px; font-size: 14.5px; line-height: 1.65; color: #D6C8AE; text-align: left; }
.prelim-reminder-text strong { color: #FFE2A8; font-weight: 700; }
.prelim-reminder-seal {
  --seal: rgba(220,60,40,.8);
  display: flex; gap: 12px; align-items: center; text-align: left;
  margin: 16px 0 6px; padding: 12px 14px; border-radius: 4px; font-size: 14px; line-height: 1.5;
}
.prelim-reminder-seal svg { flex: none; width: 38px; height: 38px; animation: prSealGlow 2.4s ease-in-out infinite; }
.prelim-reminder-seal.warn { background: linear-gradient(90deg, rgba(120,20,15,.45), rgba(60,10,8,.25)); border: 1px solid rgba(200,60,40,.55); color: #F5C6B8; }
.prelim-reminder-seal.safe { --seal: rgba(90,200,120,.8); background: linear-gradient(90deg, rgba(20,80,40,.45), rgba(10,40,20,.25)); border: 1px solid rgba(90,190,110,.5); color: #C8EFD2; }
.prelim-reminder-seal strong { display: block; font-family: 'Cinzel', Georgia, serif; font-size: 14px; letter-spacing: .5px; margin-bottom: 2px; }
.prelim-reminder-seal.warn strong { color: #FF9C84; }
.prelim-reminder-seal.safe strong { color: #8EE6A8; }
.prelim-reminder-btn {
  display: block; width: 100%; cursor: pointer; margin: 0;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 16px; letter-spacing: 2px; text-transform: uppercase;
  color: #2A1A05; padding: 15px 20px; border-radius: 4px;
  border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 0 rgba(0,0,0,.25), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
  text-shadow: 0 1px 0 rgba(255,240,200,.6);
}
/* Restates the background: style.css's global button:hover (0,1,1)
   outranks the plain class above (0,1,0) and would turn it teal. */
.prelim-reminder-btn:hover { filter: brightness(1.1); background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%); }
.prelim-reminder-btn:focus-visible { outline: 2px solid #FFE7A8; outline-offset: 3px; }
.prelim-reminder-btn.ghost {
  margin-top: 10px; color: #D6C8AE; text-shadow: none; font-size: 13px; padding: 12px 18px;
  background: rgba(255,255,255,.04); border: 1px solid #4A3820; box-shadow: none;
}
.prelim-lockout-icon { width: 78px; height: 78px; margin: 4px auto 12px; display: block; filter: drop-shadow(0 0 14px rgba(255,110,30,.45)); }
/* Laptop-height screens and phones: tighten everything a little so the
   card fits without scrolling wherever it can. */
@media (max-height: 760px), (max-width: 480px) {
  .prelim-reminder-scroll { padding-top: 18px; }
  .prelim-reminder-heading { font-size: 23px; }
  .prelim-reminder-divider { margin: 9px 0 11px; }
  .prelim-reminder-gift { font-size: 13px; padding: 8px 12px; margin-bottom: 11px; }
  .prelim-reminder-deadline-label { margin-bottom: 7px; }
  .prelim-reminder-countdown { margin-bottom: 13px; }
  .prelim-reminder-rune { padding: 7px 4px 6px; }
  .prelim-reminder-rune b { font-size: 25px; }
  .prelim-reminder-text { font-size: 13.5px; line-height: 1.55; margin-bottom: 9px; }
  .prelim-reminder-seal { margin-top: 11px; padding: 9px 12px; font-size: 13px; }
  .prelim-reminder-seal svg { width: 32px; height: 32px; }
  .prelim-reminder-foot { padding: 4px 30px 20px; }
  .prelim-reminder-btn { padding: 13px 20px; font-size: 15px; }
  .prelim-lockout-icon { width: 64px; height: 64px; margin-bottom: 8px; }
}
@media (max-width: 480px) {
  .prelim-reminder-scroll { padding: 18px 14px 14px; }
  .prelim-reminder-foot { padding: 4px 18px 18px; }
  .prelim-reminder-kicker { font-size: 10.5px; letter-spacing: 2px; }
  .prelim-reminder-deadline-label { font-size: 10.5px; letter-spacing: 1px; }
  .prelim-reminder-seal strong { font-size: 13px; }
  .prelim-reminder-heading { font-size: 21px; }
  .prelim-reminder-rune b { font-size: 22px; }
  .prelim-reminder-rune span { font-size: 8.5px; letter-spacing: 1px; }
  .prelim-reminder-sep { font-size: 16px; }
  .prelim-reminder-text { font-size: 13.5px; }
  .prelim-reminder-corner { width: 34px; height: 34px; }
}
@media (prefers-reduced-motion: reduce) {
  .prelim-reminder-overlay, .prelim-reminder-card, .prelim-reminder-rune, .prelim-reminder-seal svg { animation: none; }
  .prelim-reminder-embers { display: none; }
}
`;

function injectStyles() {
  if (document.getElementById('prelimDeadlineStyles')) return;
  // Cinzel is already loaded on the dashboard; the game pages may not
  // have it, so pull it in here (Georgia is the fallback either way).
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'prelimDeadlineStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

// ---------- shared markup ----------

const CORNER_SVG = `
  <svg viewBox="0 0 46 46" fill="none" aria-hidden="true">
    <path d="M2 30 V8 Q2 2 8 2 H30" stroke="#C9923A" stroke-width="1.6"/>
    <path d="M7 22 V11 Q7 7 11 7 H22" stroke="#E9B85A" stroke-width="1" opacity=".7"/>
    <path d="M2 8 Q14 10 16 16 Q10 14 8 2" fill="#C9923A" opacity=".85"/>
    <circle cx="16" cy="16" r="2.4" fill="#FFD9A0"/>
  </svg>`;

const SEAL_WARN = `
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="#5A120C" stroke="#E0553C" stroke-width="2"/>
    <circle cx="20" cy="20" r="12.5" fill="none" stroke="#E0553C" stroke-width="1" stroke-dasharray="2 2.5"/>
    <path d="M20 10 V23" stroke="#FFC2B2" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="20" cy="29" r="2" fill="#FFC2B2"/>
  </svg>`;

const SEAL_SAFE = `
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="#0F3A1E" stroke="#5CCB7E" stroke-width="2"/>
    <circle cx="20" cy="20" r="12.5" fill="none" stroke="#5CCB7E" stroke-width="1" stroke-dasharray="2 2.5"/>
    <path d="M13 20.5 L18 25.5 L27.5 14.5" fill="none" stroke="#C8F5D6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

const PADLOCK_SVG = `
  <svg class="prelim-lockout-icon" viewBox="0 0 80 80" aria-hidden="true">
    <path d="M24 36 V26 Q24 12 40 12 Q56 12 56 26 V36" fill="none" stroke="#9C6A22" stroke-width="6" stroke-linecap="round"/>
    <rect x="16" y="34" width="48" height="36" rx="5" fill="#2A1C12" stroke="#E9B85A" stroke-width="2.5"/>
    <rect x="21" y="39" width="38" height="26" rx="3" fill="none" stroke="#6B4E1F" stroke-width="1"/>
    <circle cx="40" cy="49" r="5" fill="#FFB060"/>
    <path d="M40 52 L40 60" stroke="#FFB060" stroke-width="4" stroke-linecap="round"/>
  </svg>`;

function cornersHtml() {
  return ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="prelim-reminder-corner ${c}">${CORNER_SVG}</span>`).join('');
}

function embersHtml() {
  let out = '';
  for (let i = 0; i < 22; i++) {
    out += `<span style="--x:${Math.random() * 100}%;--s:${3 + Math.random() * 5}px;--d:${7 + Math.random() * 7}s;--delay:${-Math.random() * 12}s;--drift:${(Math.random() - 0.5) * 120}px"></span>`;
  }
  return out;
}

// ---------- 1. the reminder ----------

/** Returns a Promise that resolves once the popup is dismissed (or
 *  immediately if it doesn't apply), so dashboard.html can sequence
 *  the tour and other reveals after it. */
export function maybeShowPrelimReminder({ email, midtermUnlocked, hasSeen, isAdmin }) {
  return new Promise((resolve) => {
    if (isPrelimLocked()) { resolve(); return; }

    // Admins: every visit (Jornie asked to keep seeing it). Behind
    // students: every visit. Safe students: once.
    const seen = !isAdmin && midtermUnlocked && hasSeen;
    if (seen) { resolve(); return; }

    injectStyles();
    const seal = midtermUnlocked
      ? `<div class="prelim-reminder-seal safe">${SEAL_SAFE}<div><strong>Your path is secured</strong>You've already unlocked the Midterm Season. You're all set. Keep going!</div></div>`
      : `<div class="prelim-reminder-seal warn">${SEAL_WARN}<div><strong>Your path is not yet secured</strong>You haven't unlocked the Midterm Season yet. Finish your puzzles now so you don't lose access.</div></div>`;

    const overlay = document.createElement('div');
    overlay.className = 'prelim-reminder-overlay';
    overlay.innerHTML = `
      <div class="prelim-reminder-embers">${embersHtml()}</div>
      <div class="prelim-reminder-card" role="dialog" aria-modal="true" aria-labelledby="prelimReminderHeading">
        ${cornersHtml()}
        <div class="prelim-reminder-scroll">
        <p class="prelim-reminder-kicker">✦ A Warning to All Seekers ✦</p>
        <h2 class="prelim-reminder-heading" id="prelimReminderHeading">The Prelim Season Closes Soon</h2>
        <div class="prelim-reminder-divider"><i></i></div>

        <p class="prelim-reminder-gift">🍎 <strong>A Teachers' Day gift:</strong> the deadline has been extended from October 5 to <strong>${LOCK_DATE_TEXT}</strong>. Use these extra days well!</p>

        <p class="prelim-reminder-deadline-label">The gate seals ${LOCK_DATE_TEXT} · 12:00 AM</p>
        <div class="prelim-reminder-countdown" role="timer" aria-label="Time left before the Prelim Season locks">
          <div class="prelim-reminder-rune"><b data-cd="d">00</b><span>Days</span></div>
          <span class="prelim-reminder-sep">:</span>
          <div class="prelim-reminder-rune"><b data-cd="h">00</b><span>Hours</span></div>
          <span class="prelim-reminder-sep">:</span>
          <div class="prelim-reminder-rune"><b data-cd="m">00</b><span>Mins</span></div>
          <span class="prelim-reminder-sep">:</span>
          <div class="prelim-reminder-rune"><b data-cd="s">00</b><span>Secs</span></div>
        </div>

        <p class="prelim-reminder-text">After the Prelim Season is locked, <strong>only students who have unlocked the Midterm Season will be able to open the portal.</strong></p>
        <p class="prelim-reminder-text">If you haven't yet, <strong>solve all three Prelim puzzles</strong> and submit your reflection to unlock the Midterm Season. Don't wait until the last day!</p>

        ${seal}
        </div>

        <div class="prelim-reminder-foot"><button type="button" class="prelim-reminder-btn">I Understand</button></div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Stops at 00:00:00:00 instead of going negative.
    const tick = () => {
      const ms = Math.max(0, LOCK_MS - Date.now());
      const s = Math.floor(ms / 1000);
      const parts = { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
      Object.entries(parts).forEach(([k, v]) => {
        overlay.querySelector(`[data-cd="${k}"]`).textContent = String(v).padStart(2, '0');
      });
      if (ms === 0) clearInterval(timer);
    };
    tick();
    const timer = setInterval(tick, 1000);

    overlay.querySelector('.prelim-reminder-btn').addEventListener('click', () => {
      clearInterval(timer);
      overlay.remove();
      if (!isAdmin && midtermUnlocked && !hasSeen) {
        updateDoc(doc(db, 'students', email), { hasSeenPrelimReminder: true }).catch((err) => {
          console.error('Failed to save Prelim reminder dismissal:', err);
        });
      }
      resolve();
    });
  });
}

// ---------- 2. the lockout ----------

function showLockoutScreen() {
  injectStyles();
  document.querySelector('.prelim-veil')?.remove();
  if (document.querySelector('.prelim-lockout')) return;

  const overlay = document.createElement('div');
  overlay.className = 'prelim-reminder-overlay prelim-lockout';
  overlay.innerHTML = `
    <div class="prelim-reminder-embers">${embersHtml()}</div>
    <div class="prelim-reminder-card" role="alertdialog" aria-modal="true" aria-labelledby="prelimLockoutHeading">
      ${cornersHtml()}
      <div class="prelim-reminder-scroll">
      <p class="prelim-reminder-kicker">✦ The Gate Is Sealed ✦</p>
      ${PADLOCK_SVG}
      <h2 class="prelim-reminder-heading" id="prelimLockoutHeading">The Prelim Season Has Closed</h2>
      <div class="prelim-reminder-divider"><i></i></div>
      <p class="prelim-reminder-text">The Prelim Season was sealed on <strong>${LOCK_DATE_TEXT} at 12:00 AM</strong>. Only students who unlocked the Midterm Season may enter the portal.</p>
      <div class="prelim-reminder-seal warn">${SEAL_WARN}<div><strong>Your path was not secured in time</strong>Your Midterm Season was not unlocked before the deadline, so your access to the portal has ended.</div></div>
      </div>
      <div class="prelim-reminder-foot"><button type="button" class="prelim-reminder-btn" id="prelimLockoutSignOut">Sign Out</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.documentElement.style.overflow = 'hidden';

  overlay.querySelector('#prelimLockoutSignOut').addEventListener('click', async () => {
    try { await signOut(auth); } catch (err) { /* still clear the local session below */ }
    try {
      localStorage.removeItem('studentEmail');
      localStorage.removeItem('studentName');
    } catch (err) { /* nothing else to clear */ }
    window.location.href = 'login.html';
  });
}

async function checkLockout(email) {
  // A plain dark veil while the record loads, so a locked student never
  // sees (or clicks) the page underneath first. Only ever shown after
  // the lock time, and removed as soon as the student is cleared.
  let veil = null;
  if (document.body) {
    injectStyles();
    veil = document.createElement('div');
    veil.className = 'prelim-veil';
    document.body.appendChild(veil);
  }

  let allowed = true; // fail open -- see the header comment
  try {
    const snap = await getDoc(doc(db, 'students', email));
    allowed = snap.exists() && snap.data().midtermUnlocked === true;
  } catch (err) {
    console.error('Could not check the Prelim lockout, letting the page load:', err);
  }

  if (allowed) {
    veil?.remove();
  } else {
    showLockoutScreen();
  }
}

/** Called by requireLogin() on every student page. Admins/teachers are
 *  never affected. Before the lock time it only arms a timer, so a page
 *  left open across midnight still locks on the dot. */
export function enforcePrelimLockout(email) {
  if (!email || ADMIN_EMAILS.includes(email)) return;

  const wait = LOCK_MS - Date.now();
  if (wait > 0) {
    // setTimeout can't hold more than ~24.8 days; a later reload will arm it.
    if (wait < 2147483647) setTimeout(() => checkLockout(email), wait + 1000);
    return;
  }

  if (document.body) {
    checkLockout(email);
  } else {
    document.addEventListener('DOMContentLoaded', () => checkLockout(email), { once: true });
  }
}
