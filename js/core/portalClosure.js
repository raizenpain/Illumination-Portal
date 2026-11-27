// ============================================
// PORTAL CLOSURE (Jornie, 2026-11-27) -- the whole portal closes for
// students at PORTAL_CLOSES_AT: December 20, 2026, 11:59 PM Philippine
// time (the lock falls at midnight). Two pieces:
//
// 1. maybeShowClosurePoster() -- a poster popup with a live countdown,
//    on every dashboard visit until the close, shown first (before the
//    patch notes). Teachers see it too.
//
// 2. enforcePortalClosure() -- called from requireLogin() in auth.js (and
//    reward.js), so it covers every student page. From the close on, a
//    student sees a full-screen, unclosable "The Portal Has Closed"
//    screen listing the certificates they earned, each one a link. The
//    certificate pages (season-completion.js, completion.js) don't call
//    it, so certificates can still be opened and downloaded. Teachers
//    (ADMIN_EMAILS) are never affected, and neither are students who
//    finished the portal and claimed their Legendary Artifact
//    (legendaryForgeSeen): they keep full access, as their reward.
//
// firestore.rules enforces the same close server-side (portalClosed() /
// keepsPortalAfterClose()): after it, other students can save nothing
// but the fields that issue a certificate. Keep PORTAL_CLOSES_AT in sync
// with the ms value there.
//
// All CSS is injected from here (own .pc-* classes), as in prelimDeadline.js.
// ============================================

import { db, doc, getDoc, auth, signOut } from './firebase.js';
import { ADMIN_EMAILS } from './admins.js';
import { CERTIFICATES, isCertificateEarned } from './certificates.js';

export const PORTAL_CLOSES_AT = '2026-12-21T00:00:00+08:00';
const CLOSE_MS = new Date(PORTAL_CLOSES_AT).getTime();
const CLOSE_TEXT = 'December 20, 2026 · 11:59 PM';

export function isPortalClosed(now = Date.now()) {
  return now >= CLOSE_MS;
}

/** Finished the portal and claimed their Legendary: keeps full access
 *  after the close. Mirrors keepsPortalAfterClose() in firestore.rules. */
export function keepsPortalAfterClose(data) {
  return !!data && data.legendaryForgeSeen === true;
}

// The device's clock can be set back, so ask the web host for the time
// (the Date header of a tiny same-site request), as prelimDeadline.js does.
let clockOffset = null;
async function trustedNow() {
  if (clockOffset === null) {
    clockOffset = 0;
    try {
      const res = await fetch(new URL('./admins.js', import.meta.url), { method: 'HEAD', cache: 'no-store' });
      const hostMs = new Date(res.headers.get('Date')).getTime();
      if (Number.isFinite(hostMs)) clockOffset = hostMs - Date.now();
    } catch (err) { /* keep the device clock */ }
  }
  return Date.now() + clockOffset;
}

const CSS = `
@keyframes pcFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pcRise { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes pcEmber { 0% { transform: translate(0, 0) scale(1); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(var(--drift), -110vh) scale(.4); opacity: 0; } }
@keyframes pcSand { 0% { transform: translateY(-4px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(26px); opacity: 0; } }
@keyframes pcGlow { 0%, 100% { filter: drop-shadow(0 0 10px rgba(255,190,80,.45)); } 50% { filter: drop-shadow(0 0 22px rgba(255,190,80,.8)); } }
@keyframes pcShine { 0%, 60% { background-position: -150% 0; } 100% { background-position: 250% 0; } }
@keyframes pcRays { to { transform: rotate(360deg); } }
@keyframes pcRune { 0%, 100% { box-shadow: inset 0 0 12px rgba(0,0,0,.8); } 50% { box-shadow: inset 0 0 12px rgba(0,0,0,.8), 0 0 14px rgba(255,140,50,.35); } }

.pc-overlay {
  position: fixed; inset: 0; z-index: 10400; display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box; overflow: hidden; animation: pcFade .45s ease;
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: radial-gradient(ellipse at 50% 0%, rgba(233,150,60,.25), transparent 55%), radial-gradient(ellipse at 50% 110%, rgba(150,40,10,.5), transparent 55%), radial-gradient(ellipse at center, rgba(14,9,6,.93), rgba(0,0,0,.97));
}
/* The closed screen sits above everything, the Prelim lockout included. */
.pc-overlay.pc-closed { z-index: 31000; background: radial-gradient(ellipse at 50% 110%, rgba(140,40,10,.5), transparent 55%), radial-gradient(ellipse at center, #120c0a, #000); }
.pc-veil { position: fixed; inset: 0; z-index: 31000; background: #050303; }
.pc-embers { position: absolute; inset: 0; pointer-events: none; }
.pc-embers span { position: absolute; bottom: -10px; left: var(--x); width: var(--s); height: var(--s); border-radius: 50%; background: radial-gradient(circle, #FFD08A 0%, #FF7A1A 45%, rgba(255,80,0,0) 70%); animation: pcEmber var(--d) linear var(--delay) infinite; opacity: 0; }
.pc-card {
  position: relative; width: min(560px, 100%); max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; color: #E8DCC4; text-align: center;
  background: radial-gradient(ellipse at 50% 0%, rgba(233,170,80,.2), transparent 55%), radial-gradient(circle at 20% 85%, rgba(90,20,10,.25), transparent 50%), linear-gradient(170deg, #1B1512 0%, #0E0A09 55%, #070505 100%);
  border: 1px solid #8A6626; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #0E0A09, inset 0 0 0 5px rgba(233,184,90,.6), inset 0 0 60px rgba(0,0,0,.7), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.8), 0 0 90px rgba(255,160,60,.16);
  animation: pcRise .55s cubic-bezier(.2,.9,.3,1.1);
}
.pc-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; margin: 6px 6px 0; padding: 22px 22px 12px; scrollbar-width: thin; scrollbar-color: #8A6626 transparent; }
.pc-scroll::-webkit-scrollbar { width: 8px; } .pc-scroll::-webkit-scrollbar-thumb { background: #8A6626; border-radius: 4px; }
.pc-foot { position: relative; flex-shrink: 0; padding: 4px 28px 22px; }
.pc-foot::before { content: ''; position: absolute; left: 6px; right: 6px; top: -18px; height: 18px; pointer-events: none; background: linear-gradient(180deg, rgba(9,6,5,0), rgba(9,6,5,.95)); }
.pc-corner { position: absolute; width: 46px; height: 46px; pointer-events: none; z-index: 1; }
.pc-corner svg { display: block; width: 100%; height: 100%; }
.pc-corner.tl { top: 2px; left: 2px; } .pc-corner.tr { top: 2px; right: 2px; transform: scaleX(-1); }
.pc-corner.bl { bottom: 2px; left: 2px; transform: scaleY(-1); } .pc-corner.br { bottom: 2px; right: 2px; transform: scale(-1,-1); }
.pc-emblem { position: relative; width: 110px; height: 128px; margin: 0 auto 6px; }
.pc-emblem::before { content: ''; position: absolute; inset: -40px; border-radius: 50%; background: repeating-conic-gradient(from 0deg, rgba(255,200,110,.18) 0deg 7deg, transparent 7deg 18deg); -webkit-mask-image: radial-gradient(circle, #000 28%, transparent 68%); mask-image: radial-gradient(circle, #000 28%, transparent 68%); animation: pcRays 40s linear infinite; }
.pc-emblem svg { position: relative; width: 100%; height: 100%; animation: pcGlow 3s ease-in-out infinite; }
.pc-sand { animation: pcSand 1.4s linear infinite; }
.pc-kicker { margin: 0 0 8px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11.5px; letter-spacing: 3.5px; text-transform: uppercase; color: #D98A4A; }
.pc-heading {
  margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 30px; line-height: 1.15; text-wrap: balance;
  background: linear-gradient(100deg, #E9B85A 0%, #FFF6D8 45%, #E9B85A 55%, #9C6A22 100%); background-size: 250% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,.8)); animation: pcShine 5s ease-in-out infinite;
}
.pc-date { margin: 10px 0 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 2px; text-transform: uppercase; color: #FFD9A0; }
.pc-date small { display: block; margin-top: 2px; font-family: 'Segoe UI', system-ui, sans-serif; font-weight: 400; font-size: 11.5px; letter-spacing: 1px; text-transform: none; color: #A89272; }
.pc-divider { display: flex; align-items: center; gap: 10px; margin: 14px 0 14px; }
.pc-divider::before, .pc-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #C9923A 40%, #C9923A 60%, transparent); }
.pc-divider i { width: 8px; height: 8px; transform: rotate(45deg); background: #E9B85A; box-shadow: 0 0 8px rgba(233,184,90,.7); }
.pc-countdown { display: flex; align-items: stretch; justify-content: center; gap: 6px; margin: 0 0 16px; }
.pc-rune { flex: 1; max-width: 90px; padding: 10px 4px 8px; border-radius: 4px; display: flex; flex-direction: column; align-items: center; gap: 4px; background: linear-gradient(180deg, #2A221D 0%, #15100D 100%); border: 1px solid #4A3820; animation: pcRune 3s ease-in-out infinite; }
.pc-rune b { font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 30px; line-height: 1; color: #FFD9A0; font-variant-numeric: tabular-nums; text-shadow: 0 0 10px rgba(255,130,40,.6), 0 2px 0 #000; }
.pc-rune span { font-family: 'Cinzel', Georgia, serif; font-size: 9.5px; letter-spacing: 1.5px; text-transform: uppercase; color: #A89272; }
.pc-sep { align-self: center; color: #6B4E1F; font-family: 'Cinzel', Georgia, serif; font-size: 20px; padding-bottom: 14px; }
.pc-text { margin: 0 0 12px; font-size: 14.5px; line-height: 1.65; color: #D6C8AE; }
.pc-text strong { color: #FFE2A8; }
.pc-list-title { margin: 4px 0 8px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #E9B85A; }
.pc-list { list-style: none; margin: 0 0 14px; padding: 0; display: flex; flex-direction: column; gap: 7px; text-align: left; }
.pc-list li { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 4px; font-size: 14px; line-height: 1.4; color: #EFE3C8; background: rgba(0,0,0,.3); border: 1px solid rgba(233,184,90,.28); }
.pc-list li i { flex: none; font-style: normal; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 14px; background: rgba(233,184,90,.16); border: 1px solid rgba(233,184,90,.5); }
.pc-keep { display: flex; gap: 12px; align-items: center; text-align: left; margin: 0 0 6px; padding: 11px 14px; border-radius: 4px; font-size: 13.5px; line-height: 1.5; color: #C8EFD2; background: linear-gradient(90deg, rgba(20,80,40,.45), rgba(10,40,20,.25)); border: 1px solid rgba(90,190,110,.5); }
.pc-keep strong { display: block; font-family: 'Cinzel', Georgia, serif; font-size: 13.5px; color: #8EE6A8; }
.pc-keep span.pc-keep-icon { flex: none; font-size: 26px; }
.pc-keep.pc-legend { margin: 0 0 14px; color: #FFE9C2; background: linear-gradient(90deg, rgba(233,184,90,.28), rgba(120,70,10,.18)); border-color: #E9B85A; box-shadow: 0 0 18px rgba(255,190,80,.18); }
.pc-keep.pc-legend strong { color: #FFD27A; }
.pc-certs { display: flex; flex-direction: column; gap: 8px; margin: 0 0 8px; }
.pc-cert, .pc-cert:hover {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 4px; text-decoration: none; text-align: left;
  color: #FFF1C9; font-weight: 600; font-size: 14.5px; background: linear-gradient(135deg, rgba(233,184,90,.24), rgba(120,70,10,.2)); border: 1px solid rgba(255,231,168,.6);
}
.pc-cert:hover { filter: brightness(1.15); }
.pc-cert img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.pc-cert em { margin-left: auto; font-style: normal; font-size: 12px; color: #E9B85A; }
.pc-btn, .pc-btn:hover {
  display: block; width: 100%; margin: 0; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 2px; text-transform: uppercase;
  color: #2A1A05; padding: 15px 20px; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 0 rgba(0,0,0,.25), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
  text-shadow: 0 1px 0 rgba(255,240,200,.6);
}
.pc-btn:hover { filter: brightness(1.1); }
.pc-btn:focus-visible, .pc-cert:focus-visible { outline: 2px solid #FFE7A8; outline-offset: 3px; }
@media (max-height: 760px), (max-width: 480px) {
  .pc-scroll { padding-top: 16px; }
  .pc-emblem { width: 78px; height: 92px; }
  .pc-heading { font-size: 24px; }
  .pc-rune b { font-size: 24px; }
  .pc-text { font-size: 13.5px; line-height: 1.55; }
  .pc-list li { padding: 7px 10px; font-size: 13px; }
  .pc-btn, .pc-btn:hover { padding: 13px 18px; font-size: 14px; }
}
@media (max-height: 480px) { .pc-emblem { display: none; } .pc-heading { font-size: 20px; } }
@media (max-width: 480px) {
  .pc-scroll { padding: 16px 14px 12px; } .pc-foot { padding: 4px 18px 18px; }
  .pc-heading { font-size: 22px; } .pc-rune b { font-size: 21px; } .pc-rune span { font-size: 8.5px; letter-spacing: 1px; }
  .pc-corner { width: 34px; height: 34px; }
}
@media (prefers-reduced-motion: reduce) {
  .pc-overlay, .pc-card, .pc-heading, .pc-emblem::before, .pc-emblem svg, .pc-rune, .pc-sand { animation: none; }
  .pc-embers { display: none; }
}
`;

function injectStyles() {
  if (document.getElementById('portalClosureStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'portalClosureStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CORNER_SVG = `<svg viewBox="0 0 46 46" fill="none" aria-hidden="true"><path d="M2 30 V8 Q2 2 8 2 H30" stroke="#C9923A" stroke-width="1.6"/><path d="M7 22 V11 Q7 7 11 7 H22" stroke="#E9B85A" stroke-width="1" opacity=".7"/><path d="M2 8 Q14 10 16 16 Q10 14 8 2" fill="#C9923A" opacity=".85"/><circle cx="16" cy="16" r="2.4" fill="#FFD9A0"/></svg>`;
const corners = () => ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="pc-corner ${c}">${CORNER_SVG}</span>`).join('');

// An hourglass, its sand running (or run out, once closed).
function hourglassSvg(empty) {
  return `<svg viewBox="0 0 110 128" aria-hidden="true">
    <defs>
      <linearGradient id="pcGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1C9"/><stop offset=".5" stop-color="#E9B85A"/><stop offset="1" stop-color="#9C6A22"/></linearGradient>
      <linearGradient id="pcSandG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE2A0"/><stop offset="1" stop-color="#F08A2A"/></linearGradient>
    </defs>
    <rect x="14" y="6" width="82" height="10" rx="4" fill="url(#pcGold)"/>
    <rect x="14" y="112" width="82" height="10" rx="4" fill="url(#pcGold)"/>
    <path d="M24 16 V22 Q24 50 52 62 Q24 74 24 104 V112 M86 16 V22 Q86 50 58 62 Q86 74 86 104 V112" fill="none" stroke="url(#pcGold)" stroke-width="4" stroke-linecap="round"/>
    <path d="M28 18 Q28 48 55 62 Q82 48 82 18 Z" fill="rgba(255,240,210,.06)" stroke="rgba(255,231,168,.35)" stroke-width="1"/>
    <path d="M28 110 Q28 76 55 62 Q82 76 82 110 Z" fill="rgba(255,240,210,.06)" stroke="rgba(255,231,168,.35)" stroke-width="1"/>
    ${empty
      ? '<path d="M30 110 Q34 92 55 86 Q76 92 80 110 Z" fill="url(#pcSandG)"/>'
      : `<path d="M36 34 Q44 48 55 54 Q66 48 74 34 Z" fill="url(#pcSandG)"/>
         <path d="M34 110 Q40 98 55 94 Q70 98 76 110 Z" fill="url(#pcSandG)"/>
         <circle class="pc-sand" cx="55" cy="66" r="1.8" fill="#FFD08A"/>
         <circle class="pc-sand" cx="55" cy="66" r="1.6" fill="#FFB060" style="animation-delay:-.45s"/>
         <circle class="pc-sand" cx="55" cy="66" r="1.8" fill="#FFD08A" style="animation-delay:-.9s"/>`}
    <circle cx="19" cy="11" r="2.4" fill="#FFF6D8"/><circle cx="91" cy="11" r="2.4" fill="#FFF6D8"/>
  </svg>`;
}

function embersHtml() {
  let out = '';
  for (let i = 0; i < 24; i++) {
    out += `<span style="--x:${Math.random() * 100}%;--s:${3 + Math.random() * 5}px;--d:${7 + Math.random() * 7}s;--delay:${-Math.random() * 12}s;--drift:${(Math.random() - 0.5) * 120}px"></span>`;
  }
  return out;
}

// ---------- 1. the poster ----------

/** The countdown poster, shown on every dashboard visit until the close.
 *  Resolves once dismissed (or at once if the portal has closed), so the
 *  dashboard can show its other popups after it. */
export function maybeShowClosurePoster() {
  return new Promise((resolve) => {
    if (isPortalClosed()) { resolve(); return; }
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'pc-overlay';
    overlay.innerHTML = `
      <div class="pc-embers">${embersHtml()}</div>
      <div class="pc-card" role="dialog" aria-modal="true" aria-labelledby="pcPosterHeading">
        ${corners()}
        <div class="pc-scroll">
          <div class="pc-emblem">${hourglassSvg(false)}</div>
          <p class="pc-kicker">✦ The Final Seal ✦</p>
          <h2 class="pc-heading" id="pcPosterHeading">The Portal Is Closing</h2>
          <p class="pc-date">${CLOSE_TEXT}<small>Philippine time</small></p>
          <div class="pc-divider"><i></i></div>
          <div class="pc-countdown" role="timer" aria-label="Time left before the portal closes">
            <div class="pc-rune"><b data-pc="d">00</b><span>Days</span></div><span class="pc-sep">:</span>
            <div class="pc-rune"><b data-pc="h">00</b><span>Hours</span></div><span class="pc-sep">:</span>
            <div class="pc-rune"><b data-pc="m">00</b><span>Mins</span></div><span class="pc-sep">:</span>
            <div class="pc-rune"><b data-pc="s">00</b><span>Secs</span></div>
          </div>
          <p class="pc-text">When the last grain falls, the <strong>HCDC Illumination Portal</strong> seals. After that, <strong>no quest can be finished and nothing more can be earned.</strong></p>
          <div class="pc-keep pc-legend"><span class="pc-keep-icon">⚔️</span><div><strong>Only the Legendary may pass</strong>Finish the whole portal and claim your Legendary Artifact before the seal, and the gate stays open for you after it closes.</div></div>
          <p class="pc-list-title">Before the gate seals</p>
          <ul class="pc-list">
            <li><i>📜</i><span>Finish your seasons and submit your reflections</span></li>
            <li><i>⚒️</i><span>Forge and claim your Legendary Artifact</span></li>
            <li><i>🏅</i><span>Open and download every certificate you have earned</span></li>
          </ul>
          <div class="pc-keep"><span class="pc-keep-icon">🛡️</span><div><strong>Your certificates stay yours</strong>Even if the gate seals before you finish, you can still open and download the certificates you earned.</div></div>
        </div>
        <div class="pc-foot"><button type="button" class="pc-btn">I Will Finish My Journey</button></div>
      </div>`;
    document.body.appendChild(overlay);

    const tick = () => {
      const ms = Math.max(0, CLOSE_MS - Date.now());
      const s = Math.floor(ms / 1000);
      const parts = { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
      Object.entries(parts).forEach(([k, v]) => { overlay.querySelector(`[data-pc="${k}"]`).textContent = String(v).padStart(2, '0'); });
      if (ms === 0) clearInterval(timer);
    };
    tick();
    const timer = setInterval(tick, 1000);
    overlay.querySelector('.pc-btn').addEventListener('click', () => {
      clearInterval(timer);
      overlay.remove();
      resolve();
    });
  });
}

// ---------- 2. the closed screen ----------

function showClosedScreen(data) {
  injectStyles();
  document.querySelector('.pc-veil')?.remove();
  if (document.querySelector('.pc-closed')) return;
  const certs = data ? CERTIFICATES.filter((c) => isCertificateEarned(c, data)) : [];
  const certHtml = certs.length
    ? `<p class="pc-list-title">Your certificates</p>
       <div class="pc-certs">${certs.map((c) => `<a class="pc-cert" href="${c.url}">${c.sealImage
         ? `<img src="${c.sealImage}" alt="">` : `<span aria-hidden="true">${c.seal}</span>`}<span>${escapeHtml(c.kind === 'puzzle' ? `${c.title} · ${c.subtitle}` : c.title)}</span><em>Open ›</em></a>`).join('')}</div>`
    : `<p class="pc-text">${data ? 'You have no certificates on record.' : ''}</p>`;

  const overlay = document.createElement('div');
  overlay.className = 'pc-overlay pc-closed';
  overlay.innerHTML = `
    <div class="pc-embers">${embersHtml()}</div>
    <div class="pc-card" role="alertdialog" aria-modal="true" aria-labelledby="pcClosedHeading">
      ${corners()}
      <div class="pc-scroll">
        <div class="pc-emblem">${hourglassSvg(true)}</div>
        <p class="pc-kicker">✦ The Gate Is Sealed ✦</p>
        <h2 class="pc-heading" id="pcClosedHeading">The Portal Has Closed</h2>
        <p class="pc-date">${CLOSE_TEXT}<small>Philippine time</small></p>
        <div class="pc-divider"><i></i></div>
        <p class="pc-text">The <strong>HCDC Illumination Portal</strong> has closed. Nothing more can be completed or earned. <strong>Thank you for walking this pilgrimage.</strong></p>
        ${certHtml}
      </div>
      <div class="pc-foot"><button type="button" class="pc-btn" id="pcSignOut">Sign Out</button></div>
    </div>`;
  document.body.appendChild(overlay);
  document.documentElement.style.overflow = 'hidden';

  overlay.querySelector('#pcSignOut').addEventListener('click', async () => {
    try { await signOut(auth); } catch (err) { /* still clear the local session below */ }
    try {
      localStorage.removeItem('studentEmail');
      localStorage.removeItem('studentName');
    } catch (err) { /* nothing else to clear */ }
    window.location.href = 'login.html';
  });
}

async function checkClosure(email) {
  const now = await trustedNow();
  if (!isPortalClosed(now)) {
    // A page left open closes on the dot.
    const left = CLOSE_MS - now;
    if (left < 2147483647) setTimeout(() => checkClosure(email), left + 1000);
    return;
  }
  // A dark veil while the record loads, so the page underneath is never usable.
  let veil = null;
  if (document.body && !document.querySelector('.pc-closed')) {
    injectStyles();
    veil = document.createElement('div');
    veil.className = 'pc-veil';
    document.body.appendChild(veil);
  }
  let data = null;
  try {
    const snap = await getDoc(doc(db, 'students', email));
    data = snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('Could not load the student record for the closed screen:', err);
  }
  if (keepsPortalAfterClose(data)) {
    veil?.remove();
    return;
  }
  showClosedScreen(data);
}

/** Called by requireLogin() on every student page. Teachers are never affected. */
export function enforcePortalClosure(email) {
  if (!email || ADMIN_EMAILS.includes(email)) return;
  if (document.body) {
    checkClosure(email);
  } else {
    document.addEventListener('DOMContentLoaded', () => checkClosure(email), { once: true });
  }
}
