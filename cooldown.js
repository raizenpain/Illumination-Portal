// ============================================
// COOLDOWN -- a student who tries to submit a banned word (see
// contentFilter.js) loses the portal for COOLDOWN_DAYS days.
//
// 1. startCooldown() -- called by every free-text box right where it
//    rejects a banned word: class chat, reflections, season tasks and
//    gift notes. Saves `cooldown: { startedAt, word, where }` on the
//    student's own record and puts up the lock screen at once.
//
// 2. enforceCooldown() -- called from requireLogin() in auth.js, so it
//    covers every student page. While the cooldown runs, the student
//    gets a full-screen, unclosable screen with a live countdown.
//
// firestore.rules enforces the same thing server-side: a student on
// cooldown cannot write their own record (so no progress, tickets,
// trades or gifts) or post in the class chat, and cannot clear or
// shorten the cooldown. Only a teacher can lift it (teacher.js,
// right-click a student in the roster).
//
// ADMIN_EMAILS (the teachers) are never affected.
//
// A copy is kept in localStorage so the screen appears instantly and
// still appears when the record can't be read. That copy only ever
// keeps a student OUT; the record is what lets them back in.
//
// All CSS is injected from here (own .cdn-* classes only), so the
// screen also renders on the game pages that load their own stylesheets.
// ============================================

import { db, doc, getDoc, updateDoc, serverTimestamp, auth, signOut } from './firebase.js';
import { ADMIN_EMAILS } from './admins.js';

// Keep in sync with onCooldown() in firestore.rules.
export const COOLDOWN_DAYS = 30;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// Listed words that are still rejected but never start a cooldown,
// because honest writing uses them: "imo" is everyday Bisaya for
// "you/yours", and a lone "L" or "W" is an initial or a letter grade.
const NO_COOLDOWN_WORDS = new Set(['imo', 'l', 'w']);

const cacheKey = (email) => `portalCooldown:${email}`;

function readCache(email) {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(email)) || 'null');
    return cached && typeof cached.startedAt === 'number' ? cached : null;
  } catch (err) {
    return null;
  }
}

function writeCache(email, cached) {
  try {
    if (cached) localStorage.setItem(cacheKey(email), JSON.stringify(cached));
    else localStorage.removeItem(cacheKey(email));
  } catch (err) { /* private mode: the record still holds the cooldown */ }
}

/** When the cooldown on a student record ends, in ms, or 0 if there is none. */
export function cooldownEndsAt(studentData) {
  const startedAt = studentData && studentData.cooldown && studentData.cooldown.startedAt;
  if (!startedAt || typeof startedAt.toMillis !== 'function') return 0;
  return startedAt.toMillis() + COOLDOWN_MS;
}

export function isOnCooldown(studentData) {
  return cooldownEndsAt(studentData) > Date.now();
}

// ---------- the screen ----------

const CSS = `
@keyframes cdnFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cdnRise { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
.cdn-veil { position: fixed; inset: 0; z-index: 31000; background: #050303; }
.cdn-overlay {
  position: fixed; inset: 0; z-index: 31000;
  display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box;
  background: radial-gradient(ellipse at 50% 110%, rgba(120,20,15,.5), transparent 55%), radial-gradient(ellipse at center, #120c0a, #000);
  font-family: 'Segoe UI', system-ui, sans-serif;
  animation: cdnFade .4s ease;
}
.cdn-card {
  width: min(480px, 100%); max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
  color: #E8DCC4; text-align: center;
  background: linear-gradient(170deg, #1B1512 0%, #0E0A09 55%, #070505 100%);
  border: 1px solid #6B2A1F; border-radius: 8px;
  box-shadow: inset 0 0 0 4px #0E0A09, inset 0 0 0 5px rgba(200,70,50,.5), 0 30px 80px rgba(0,0,0,.8);
  animation: cdnRise .5s cubic-bezier(.2,.9,.3,1.1);
}
.cdn-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; margin: 6px 6px 0; padding: 22px 22px 12px; scrollbar-width: thin; scrollbar-color: #6B2A1F transparent; }
.cdn-foot { flex-shrink: 0; padding: 8px 28px 22px; }
.cdn-kicker { margin: 0 0 8px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11.5px; letter-spacing: 3px; text-transform: uppercase; color: #E0553C; }
.cdn-icon { display: block; width: 66px; height: 66px; margin: 2px auto 8px; filter: drop-shadow(0 0 12px rgba(224,85,60,.45)); }
.cdn-heading {
  margin: 0 0 14px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 25px; line-height: 1.2; text-wrap: balance;
  color: #FFD9A0; text-shadow: 0 2px 0 #000;
}
.cdn-label { margin: 0 0 8px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11.5px; letter-spacing: 2px; text-transform: uppercase; color: #D98A4A; }
.cdn-count { display: flex; align-items: stretch; justify-content: center; gap: 6px; margin: 0 0 16px; }
.cdn-unit {
  flex: 1; max-width: 86px; padding: 9px 4px 7px; border-radius: 4px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: linear-gradient(180deg, #2A221D 0%, #15100D 100%); border: 1px solid #4A3820;
  box-shadow: inset 0 0 12px rgba(0,0,0,.8);
}
.cdn-unit b { font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 28px; line-height: 1; color: #FFD9A0; font-variant-numeric: tabular-nums; }
.cdn-unit span { font-family: 'Cinzel', Georgia, serif; font-size: 9.5px; letter-spacing: 1.5px; text-transform: uppercase; color: #A89272; }
.cdn-text { margin: 0 0 10px; font-size: 14.5px; line-height: 1.6; color: #D6C8AE; text-align: left; }
.cdn-text strong { color: #FFE2A8; }
.cdn-reason {
  margin: 0 0 12px; padding: 11px 14px; border-radius: 4px; font-size: 14px; line-height: 1.5; text-align: left;
  color: #F5C6B8; background: linear-gradient(90deg, rgba(120,20,15,.45), rgba(60,10,8,.25)); border: 1px solid rgba(200,60,40,.55);
}
.cdn-reason strong { color: #FF9C84; }
.cdn-btn {
  display: block; width: 100%; margin: 0; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 2px; text-transform: uppercase;
  color: #2A1A05; padding: 14px 20px; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
}
/* Restates the background: style.css's global button:hover outranks a plain class. */
.cdn-overlay .cdn-btn:hover { filter: brightness(1.1); background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%); }
.cdn-btn:focus-visible { outline: 2px solid #FFE7A8; outline-offset: 3px; }
@media (max-height: 700px), (max-width: 480px) {
  .cdn-scroll { padding: 16px 14px 10px; }
  .cdn-foot { padding: 6px 16px 16px; }
  .cdn-icon { width: 50px; height: 50px; margin-bottom: 6px; }
  .cdn-heading { font-size: 20px; margin-bottom: 10px; }
  .cdn-unit { padding: 7px 3px 6px; }
  .cdn-unit b { font-size: 22px; }
  .cdn-unit span { font-size: 8.5px; letter-spacing: 1px; }
  .cdn-count { margin-bottom: 12px; }
  .cdn-text, .cdn-reason { font-size: 13.5px; }
  .cdn-btn { padding: 12px 18px; font-size: 14px; }
}
/* Phones held sideways: countdown beside the explanation. */
@media (max-height: 480px) and (min-width: 560px) {
  .cdn-card { width: min(760px, 100%); }
  .cdn-scroll { display: grid; grid-template-columns: 1fr 1fr; column-gap: 18px; align-items: start; }
  .cdn-kicker, .cdn-heading { grid-column: 1 / -1; }
  .cdn-icon { display: none; }
  .cdn-heading { font-size: 18px; margin-bottom: 8px; }
}
@media (prefers-reduced-motion: reduce) { .cdn-overlay, .cdn-card { animation: none; } }
`;

const HOURGLASS_SVG = `
  <svg class="cdn-icon" viewBox="0 0 80 80" aria-hidden="true">
    <path d="M22 12 H58 M22 68 H58" stroke="#E9B85A" stroke-width="5" stroke-linecap="round"/>
    <path d="M26 14 V24 Q26 34 40 40 Q54 46 54 56 V66 H26 V56 Q26 46 40 40 Q54 34 54 24 V14 Z" fill="#2A1C12" stroke="#C9923A" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M32 62 Q40 50 48 62 Z" fill="#E0553C"/>
    <path d="M34 24 H46 L40 33 Z" fill="#E0553C"/>
  </svg>`;

function injectStyles() {
  if (document.getElementById('cooldownStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'cooldownStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showCooldownScreen({ endsAt, word, where }) {
  injectStyles();
  document.querySelector('.cdn-veil')?.remove();
  if (document.querySelector('.cdn-overlay')) return;

  const endText = new Date(endsAt).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const reason = word
    ? `You tried to send a word that is not allowed${where ? ` in ${escapeHtml(where)}` : ''}: <strong>“${escapeHtml(word)}”</strong>.`
    : `You tried to send a word that is not allowed${where ? ` in ${escapeHtml(where)}` : ''}.`;

  const overlay = document.createElement('div');
  overlay.className = 'cdn-overlay';
  overlay.innerHTML = `
    <div class="cdn-card" role="alertdialog" aria-modal="true" aria-labelledby="cooldownHeading">
      <div class="cdn-scroll">
        <p class="cdn-kicker">✦ ${COOLDOWN_DAYS}-Day Cooldown ✦</p>
        <h2 class="cdn-heading" id="cooldownHeading">Your Portal Access Is Paused</h2>
        <div>
          ${HOURGLASS_SVG}
          <p class="cdn-label">You may return in</p>
          <div class="cdn-count" role="timer" aria-label="Time left on your cooldown">
            <div class="cdn-unit"><b data-cd="d">00</b><span>Days</span></div>
            <div class="cdn-unit"><b data-cd="h">00</b><span>Hours</span></div>
            <div class="cdn-unit"><b data-cd="m">00</b><span>Mins</span></div>
            <div class="cdn-unit"><b data-cd="s">00</b><span>Secs</span></div>
          </div>
        </div>
        <div>
          <p class="cdn-reason">${reason}</p>
          <p class="cdn-text">Bad, hurtful or disrespectful words have no place in the portal. Your access is paused for <strong>${COOLDOWN_DAYS} days</strong>, until <strong>${endText}</strong>. Your progress is safe and will be waiting for you.</p>
          <p class="cdn-text">If you believe this was a mistake, please talk to your teacher.</p>
        </div>
      </div>
      <div class="cdn-foot"><button type="button" class="cdn-btn" id="cooldownSignOut">Sign Out</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.documentElement.style.overflow = 'hidden';

  const tick = () => {
    const ms = Math.max(0, endsAt - Date.now());
    const s = Math.ceil(ms / 1000);
    const parts = { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
    Object.entries(parts).forEach(([k, v]) => {
      overlay.querySelector(`[data-cd="${k}"]`).textContent = String(v).padStart(2, '0');
    });
    // The cooldown is over: reload so the page starts clean.
    if (ms === 0) { clearInterval(timer); window.location.reload(); }
  };
  const timer = setInterval(tick, 1000);
  tick();

  overlay.querySelector('#cooldownSignOut').addEventListener('click', async () => {
    try { await signOut(auth); } catch (err) { /* still clear the local session below */ }
    try {
      localStorage.removeItem('studentEmail');
      localStorage.removeItem('studentName');
    } catch (err) { /* nothing else to clear */ }
    window.location.href = 'login.html';
  });
}

// ---------- 1. starting a cooldown ----------

function saveCooldown(email, { word, where }) {
  return updateDoc(doc(db, 'students', email), {
    cooldown: { startedAt: serverTimestamp(), word: String(word || '').slice(0, 40), where: String(where || '').slice(0, 40) }
  });
}

/** Call where a free-text box rejects a banned word. `word` is what
 *  findBannedWord() returned; `where` finishes "in ...", e.g. "the Class
 *  Chat". Does nothing for teachers, or for the words in NO_COOLDOWN_WORDS. */
export function startCooldown({ email, word, where }) {
  if (!email || ADMIN_EMAILS.includes(email)) return;
  if (NO_COOLDOWN_WORDS.has(String(word || '').toLowerCase())) return;

  const cached = { startedAt: Date.now(), word, where, saved: false };
  writeCache(email, cached);
  showCooldownScreen({ endsAt: cached.startedAt + COOLDOWN_MS, word, where });

  saveCooldown(email, { word, where })
    .then(() => writeCache(email, { ...cached, saved: true }))
    .catch((err) => {
      // Stays unsaved in the cache; enforceCooldown() tries again on the next page load.
      console.error('Could not save the cooldown yet:', err);
    });
}

// ---------- 2. enforcing it ----------

async function checkCooldown(email) {
  const cached = readCache(email);
  const cachedActive = !!cached && cached.startedAt + COOLDOWN_MS > Date.now();

  // A plain dark veil while the record loads, so a student on cooldown
  // never sees (or clicks) the page underneath first.
  if (cachedActive) {
    injectStyles();
    const veil = document.createElement('div');
    veil.className = 'cdn-veil';
    document.body.appendChild(veil);
  }

  let data = null;
  let readFailed = false;
  try {
    const snap = await getDoc(doc(db, 'students', email));
    data = snap.exists() ? snap.data() : null;
  } catch (err) {
    readFailed = true;
    console.error('Could not check the cooldown:', err);
  }

  if (isOnCooldown(data)) {
    const { word, where } = data.cooldown;
    writeCache(email, { startedAt: cooldownEndsAt(data) - COOLDOWN_MS, word, where, saved: true });
    showCooldownScreen({ endsAt: cooldownEndsAt(data), word, where });
    return;
  }

  if (cachedActive && (readFailed || !cached.saved)) {
    // Either the record can't be read right now, or the cooldown never
    // reached it (the student went offline or closed the tab): keep them
    // out, and try the save again.
    if (!readFailed && data) {
      saveCooldown(email, cached).then(() => writeCache(email, { ...cached, saved: true })).catch(() => {});
    }
    showCooldownScreen({ endsAt: cached.startedAt + COOLDOWN_MS, word: cached.word, where: cached.where });
    return;
  }

  // No cooldown on the record: it ran out, or a teacher lifted it.
  if (cached && !readFailed) writeCache(email, null);
  document.querySelector('.cdn-veil')?.remove();
}

/** Called by requireLogin() on every student page. Teachers are never affected. */
export function enforceCooldown(email) {
  if (!email || ADMIN_EMAILS.includes(email)) return;
  if (document.body) {
    checkCooldown(email);
  } else {
    document.addEventListener('DOMContentLoaded', () => checkCooldown(email), { once: true });
  }
}
