// ============================================
// MIDTERM ROLL OF HONOR -- congratulates every student who has entered
// the Midterm Season, by name and rank. Two pieces, shown until
// HONOR_ENDS_AT (the end of October 9, 2026, Philippine time):
//
//   - showHonorPopup(): a celebratory popup on EVERY dashboard visit
//     (Jornie's call), sequenced by dashboard.html ahead of the Prelim
//     deadline reminder. Names scroll in two carousel rows; a viewer who
//     is on the roll gets a personal line (but no highlight of their own).
//   - renderHonorStrip(): a scrolling "Roll of Honor" row under the
//     dashboard's logo carousel; tapping it reopens the popup.
//
// The highlight (gold chip + "Leading the Way" spotlight) always goes to
// whoever holds the HIGHEST rank on the roll, decided from the data --
// unless everyone shares that rank, in which case nobody is singled out.
//
// Where the names come from: students can't read each other's records
// (firestore.rules), so the roll is ONE doc, announcements/midtermHonorRoll,
// rewritten by publishMidtermHonorRoll() whenever an admin loads the
// roster in teacher.js (which already has every student in hand). That
// keeps it to a single read per dashboard visit, keeps the names out of
// the public site code, and picks up newly unlocked students the next
// time a teacher opens the roster.
//
// All CSS is injected from here with its own .honor-* classes. Every
// button restates its :hover background, since style.css's global
// button:hover (0,1,1) outranks a plain class selector (0,1,0).
// ============================================

import { db, doc, getDoc, setDoc, serverTimestamp } from './firebase.js';
import { ADMIN_EMAILS } from './admins.js';
import { getRankProgress, RANK_ICON, RANK_TIERS } from './rank.js';

const HONOR_ENDS_AT = '2026-10-10T00:00:00+08:00';
const HONOR_DOC = ['announcements', 'midtermHonorRoll'];
const RANK_ORDER = Object.fromEntries(RANK_TIERS.map((t, i) => [t.rank, i]));

export function isHonorRollActive() {
  return Date.now() < new Date(HONOR_ENDS_AT).getTime();
}

const CSS = `
@keyframes honorScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes honorScrollRev { from { transform: translateX(-50%); } to { transform: translateX(0); } }
@keyframes honorFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes honorRise { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes honorRays { to { transform: rotate(360deg); } }
@keyframes honorSpark { 0% { transform: translate(0,0) scale(1); opacity: 0; } 12% { opacity: 1; } 100% { transform: translate(var(--drift), -105vh) scale(.4); opacity: 0; } }
@keyframes honorShine { 0%, 60% { background-position: -150% 0; } 100% { background-position: 250% 0; } }

/* --- the dashboard strip --- */
.honor-strip {
  margin: 12px 0 0; border-radius: 14px; color: inherit; font-size: inherit; overflow: hidden; cursor: pointer; display: block; width: 100%; text-align: left; padding: 0;
  font-family: inherit;
  background: linear-gradient(135deg, rgba(201,146,58,.16), rgba(120,70,10,.10));
  border: 1px solid rgba(233,184,90,.45);
  box-shadow: 0 0 22px rgba(233,184,90,.10);
}
.honor-strip:hover { background: linear-gradient(135deg, rgba(201,146,58,.22), rgba(120,70,10,.14)); border-color: rgba(233,184,90,.7); }
.honor-strip:focus-visible { outline: 2px solid #FFE7A8; outline-offset: 2px; }
.honor-strip-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 14px 2px; }
.honor-strip-title { font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 12px; letter-spacing: 1.6px; text-transform: uppercase; color: #E9B85A; }
.honor-strip-sub { font-size: 11px; color: #C9B892; }
.honor-marquee { overflow: hidden; padding: 8px 0 12px; -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent); mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent); }
.honor-track { display: flex; align-items: center; gap: 10px; width: max-content; animation: honorScroll var(--dur, 80s) linear infinite; }
.honor-track.rev { animation-name: honorScrollRev; }
.honor-strip:hover .honor-track, .honor-marquee:hover .honor-track { animation-play-state: paused; }

.honor-chip {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
  padding: 6px 12px 6px 8px; border-radius: 999px;
  background: rgba(10,8,6,.55); border: 1px solid rgba(233,184,90,.4);
  color: #F3E7CC; font-size: 12.5px; line-height: 1.2;
}
.honor-chip i { font-style: normal; font-size: 14px; }
.honor-chip b { font-weight: 600; }
.honor-chip em { font-style: normal; font-family: 'Cinzel', Georgia, serif; font-size: 9.5px; letter-spacing: 1px; text-transform: uppercase; color: #E9B85A; padding-left: 8px; border-left: 1px solid rgba(233,184,90,.35); }
.honor-chip em span { color: #FFD45A; letter-spacing: 0; margin-left: 3px; }
.honor-chip.top { border-color: #FFE7A8; background: linear-gradient(135deg, rgba(233,184,90,.32), rgba(120,70,10,.3)); box-shadow: 0 0 12px rgba(255,200,90,.35); }
.honor-chip.top em { color: #FFF1C9; }

/* --- the popup --- */
.honor-overlay {
  position: fixed; inset: 0; z-index: 10100; display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box; overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, rgba(233,184,90,.28), transparent 55%), radial-gradient(ellipse at center, rgba(14,10,6,.9), rgba(0,0,0,.96));
  animation: honorFadeIn .45s ease; font-family: 'Segoe UI', system-ui, sans-serif;
}
.honor-sparks { position: absolute; inset: 0; pointer-events: none; }
.honor-sparks span { position: absolute; bottom: -10px; left: var(--x); width: var(--s); height: var(--s); border-radius: 50%; background: radial-gradient(circle, #FFF4C9 0%, #FFC94A 45%, rgba(255,180,0,0) 70%); animation: honorSpark var(--d) linear var(--delay) infinite; opacity: 0; }
.honor-card {
  position: relative; width: min(560px, 100%); max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); box-sizing: border-box;
  /* The card itself never scrolls: the frame, its corner ornaments and
     the button stay put, and only .honor-scroll moves (same structure as
     the Prelim reminder card -- see prelimDeadline.js for why). */
  display: flex; flex-direction: column; overflow: hidden;
  padding: 0; color: #E8DCC4; text-align: center;
  background: radial-gradient(ellipse at 50% 0%, rgba(233,184,90,.22), transparent 55%), linear-gradient(170deg, #1B1512 0%, #0E0A09 55%, #070505 100%);
  border: 1px solid #8A6626; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #0E0A09, inset 0 0 0 5px rgba(233,184,90,.6), inset 0 0 60px rgba(0,0,0,.7), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.8), 0 0 90px rgba(255,190,70,.18);
  animation: honorRise .55s cubic-bezier(.2,.9,.3,1.1);
}
/* 6px side/top margin keeps the scrollbar inside the gold inner frame. */
.honor-scroll {
  flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden;
  margin: 6px 6px 0; padding: 22px 0 14px;
  scrollbar-width: thin; scrollbar-color: #8A6626 transparent;
}
.honor-scroll::-webkit-scrollbar { width: 8px; }
.honor-scroll::-webkit-scrollbar-track { background: transparent; }
.honor-scroll::-webkit-scrollbar-thumb { background: #8A6626; border-radius: 4px; }
.honor-foot { position: relative; flex-shrink: 0; padding: 4px 28px 24px; }
/* A soft fade above the button: phones hide scrollbars, so this is the
   cue that there is more to read when the middle part scrolls. */
.honor-foot::before {
  content: ''; position: absolute; left: 6px; right: 6px; top: -18px; height: 18px; pointer-events: none;
  background: linear-gradient(180deg, rgba(9,6,5,0), rgba(9,6,5,.95));
}
.honor-pad { padding: 0 22px; }
.honor-corner { position: absolute; width: 46px; height: 46px; pointer-events: none; z-index: 1; }
.honor-corner svg { display: block; width: 100%; height: 100%; }
.honor-corner.tl { top: 2px; left: 2px; } .honor-corner.tr { top: 2px; right: 2px; transform: scaleX(-1); }
.honor-corner.bl { bottom: 2px; left: 2px; transform: scaleY(-1); } .honor-corner.br { bottom: 2px; right: 2px; transform: scale(-1,-1); }
.honor-crest { position: relative; width: 96px; height: 96px; margin: 0 auto 8px; }
.honor-crest::before { content: ''; position: absolute; inset: -34px; border-radius: 50%; background: repeating-conic-gradient(from 0deg, rgba(255,210,110,.20) 0deg 8deg, transparent 8deg 20deg); -webkit-mask-image: radial-gradient(circle, #000 30%, transparent 70%); mask-image: radial-gradient(circle, #000 30%, transparent 70%); animation: honorRays 40s linear infinite; }
.honor-crest svg { position: relative; width: 100%; height: 100%; filter: drop-shadow(0 0 14px rgba(255,200,90,.55)); }
.honor-kicker { margin: 0 0 8px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11.5px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A; }
.honor-heading {
  margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 27px; line-height: 1.2; text-wrap: balance;
  background: linear-gradient(100deg, #E9B85A 0%, #FFF6D8 45%, #E9B85A 55%, #9C6A22 100%); background-size: 250% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,.8)); animation: honorShine 5s ease-in-out infinite;
}
.honor-count { margin: 12px 0 0; font-family: 'Cinzel', Georgia, serif; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #D6C8AE; }
.honor-count b { font-size: 26px; color: #FFD9A0; text-shadow: 0 0 12px rgba(255,170,60,.6); margin-right: 4px; vertical-align: -3px; }
.honor-divider { display: flex; align-items: center; gap: 10px; margin: 14px 0 14px; }
.honor-divider::before, .honor-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #C9923A 40%, #C9923A 60%, transparent); }
.honor-divider i { width: 8px; height: 8px; transform: rotate(45deg); background: #E9B85A; box-shadow: 0 0 8px rgba(233,184,90,.7); }
.honor-text { margin: 0 0 12px; font-size: 14.5px; line-height: 1.65; color: #D6C8AE; }
.honor-text strong { color: #FFE2A8; }
.honor-you { margin: 0 0 14px; padding: 11px 14px; border-radius: 4px; font-size: 14px; line-height: 1.5; background: linear-gradient(90deg, rgba(20,80,40,.5), rgba(10,40,20,.25)); border: 1px solid rgba(90,190,110,.55); color: #C8EFD2; }
.honor-you strong { color: #8EE6A8; font-family: 'Cinzel', Georgia, serif; }
.honor-spotlight {
  position: relative; margin: 2px 0 14px; padding: 12px 14px 13px; border-radius: 4px; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: linear-gradient(135deg, rgba(233,184,90,.30), rgba(120,70,10,.22));
  border: 1px solid #FFE7A8; box-shadow: 0 0 22px rgba(255,200,90,.28), inset 0 0 18px rgba(255,220,140,.10);
}
.honor-spotlight-label { font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 10.5px; letter-spacing: 2px; text-transform: uppercase; color: #FFE7A8; }
.honor-spotlight-names { font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 19px; line-height: 1.25; color: #FFF6D8; text-shadow: 0 0 14px rgba(255,200,90,.6), 0 2px 0 #000; text-wrap: balance; }
.honor-spotlight-rank { font-size: 11.5px; letter-spacing: 1.5px; text-transform: uppercase; color: #E9B85A; }
.honor-all li.top { color: #FFE7A8; font-weight: 700; }
.honor-card .honor-marquee { padding: 5px 0; }
.honor-rows { margin: 4px 0 12px; padding: 8px 0; background: rgba(0,0,0,.28); border-top: 1px solid rgba(233,184,90,.2); border-bottom: 1px solid rgba(233,184,90,.2); }
.honor-all-btn, .honor-all-btn:hover { margin: 0 0 8px; padding: 0; background: none; border: none; color: #E9B85A; font: 600 12.5px 'Segoe UI', system-ui, sans-serif; text-decoration: underline; cursor: pointer; }
.honor-all { display: none; margin: 0 0 6px; max-height: 220px; overflow-y: auto; text-align: left; padding: 10px 12px; border: 1px solid rgba(233,184,90,.25); border-radius: 4px; background: rgba(0,0,0,.3); }
.honor-all.open { display: block; }
.honor-all ol { margin: 0; padding-left: 26px; columns: 2; column-gap: 22px; font-size: 12.5px; line-height: 1.75; color: #E8DCC4; }
.honor-all li { break-inside: avoid; }
.honor-all li small { color: #C9923A; font-family: 'Cinzel', Georgia, serif; font-size: 9px; letter-spacing: .8px; text-transform: uppercase; margin-left: 4px; }
.honor-btn, .honor-btn:hover {
  display: block; width: 100%; margin: 0; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 16px; letter-spacing: 2px; text-transform: uppercase;
  color: #2A1A05; padding: 15px 20px; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 0 rgba(0,0,0,.25), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
  text-shadow: 0 1px 0 rgba(255,240,200,.6);
}
.honor-btn:hover { filter: brightness(1.1); }
.honor-btn:focus-visible { outline: 2px solid #FFE7A8; outline-offset: 3px; }
/* Laptop-height screens and phones: tighten everything a little so the
   card fits without scrolling wherever it can. */
@media (max-height: 760px), (max-width: 480px) {
  .honor-scroll { padding-top: 14px; }
  .honor-crest { width: 66px; height: 66px; margin-bottom: 4px; }
  .honor-crest::before { inset: -24px; }
  .honor-kicker { margin-bottom: 5px; }
  .honor-heading { font-size: 23px; }
  .honor-count { margin-top: 8px; font-size: 12px; }
  .honor-count b { font-size: 22px; }
  .honor-divider { margin: 10px 0; }
  .honor-text { font-size: 13.5px; line-height: 1.55; margin-bottom: 9px; }
  .honor-you { font-size: 13px; padding: 8px 12px; margin-bottom: 10px; }
  .honor-spotlight { padding: 8px 12px 9px; margin-bottom: 10px; gap: 1px; }
  .honor-spotlight-names { font-size: 17px; }
  .honor-rows { margin: 2px 0 9px; padding: 4px 0; }
  .honor-foot { padding: 4px 28px 20px; }
  .honor-btn, .honor-btn:hover { padding: 13px 20px; font-size: 15px; }
}
@media (max-width: 480px) {
  .honor-scroll { padding-top: 14px; } .honor-pad { padding: 0 14px; }
  .honor-foot { padding: 4px 18px 18px; }
  .honor-kicker { font-size: 10.5px; letter-spacing: 2px; }
  .honor-count { font-size: 10.5px; letter-spacing: .6px; }
  .honor-count b { font-size: 20px; }
  .honor-spotlight-label { font-size: 9.5px; letter-spacing: 1px; }
  .honor-spotlight-names { font-size: 16px; }
  .honor-heading { font-size: 21px; } .honor-text { font-size: 13.5px; }
  .honor-all ol { columns: 1; } .honor-corner { width: 34px; height: 34px; }
  .honor-crest { width: 58px; height: 58px; }
}
@media (prefers-reduced-motion: reduce) {
  .honor-overlay, .honor-card, .honor-heading, .honor-crest::before { animation: none; }
  .honor-sparks { display: none; }
  .honor-track { animation: none; }
  .honor-marquee { overflow-x: auto; }
}
`;

function injectStyles() {
  if (document.getElementById('midtermHonorStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'midtermHonorStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- data ----------

/** Turns the stored list into what the UI needs. Exported for testing. */
export function buildHonorModel(list) {
  const clean = (list || [])
    .filter((s) => s && typeof s.name === 'string' && s.name.trim())
    .map((s) => ({ name: s.name.trim(), rank: RANK_ORDER[s.rank] !== undefined ? s.rank : 'Disciple', stars: Math.max(0, Math.min(12, Number(s.stars) || 0)) }));
  if (!clean.length) return null;

  // Highest rank first, then most stars, then name.
  const sorted = clean.sort((a, b) => (RANK_ORDER[b.rank] - RANK_ORDER[a.rank]) || (b.stars - a.stars) || a.name.localeCompare(b.name));
  const topRank = sorted[0].rank;
  const leaders = sorted.filter((s) => s.rank === topRank);
  const hasLeaders = leaders.length < sorted.length;
  return { sorted, topRank, leaders, hasLeaders, isLeader: (s) => hasLeaders && s.rank === topRank };
}

/** What publishMidtermHonorRoll() stores. Exported for testing. */
export function honorEntriesFrom(allStudents) {
  return allStudents
    .filter((d) => d && d.midtermUnlocked === true && d.name && !ADMIN_EMAILS.includes(d.email))
    .map((d) => {
      const progress = getRankProgress(d);
      return { name: String(d.name).slice(0, 80), rank: progress.rank, stars: progress.stars.filter(Boolean).length };
    });
}

let rollPromise = null;

/** One read per page load. Resolves to a model, or null when there's
 *  nothing to show (expired, doc missing, empty, or the read failed). */
function loadRoll() {
  if (!rollPromise) {
    rollPromise = !isHonorRollActive() ? Promise.resolve(null) : getDoc(doc(db, ...HONOR_DOC))
      .then((snap) => buildHonorModel(snap.exists() ? snap.data().students : []))
      .catch((err) => {
        console.error('Failed to load the Midterm Roll of Honor:', err);
        return null;
      });
  }
  return rollPromise;
}

/** Called by teacher.js with every student record it just loaded. */
export function publishMidtermHonorRoll(allStudents) {
  if (!isHonorRollActive()) return Promise.resolve();
  return setDoc(doc(db, ...HONOR_DOC), { students: honorEntriesFrom(allStudents), updatedAt: serverTimestamp() }).catch((err) => {
    console.error('Failed to publish the Midterm Roll of Honor:', err);
  });
}

// ---------- markup ----------

function chipHtml(model, s, viewerName) {
  const cls = ['honor-chip'];
  if (model.isLeader(s)) cls.push('top');
  const stars = s.stars > 0 ? `<span>${'★'.repeat(s.stars)}</span>` : '';
  return `<span class="${cls.join(' ')}"><i>${RANK_ICON[s.rank] || '⭐'}</i><b>${escapeHtml(s.name)}</b><em>${s.rank}${stars}</em></span>`;
}

// One seamless marquee row: the list twice, sliding by exactly half.
function marqueeHtml(model, list, viewerName, reverse) {
  const chips = list.map((s) => chipHtml(model, s, viewerName)).join('');
  return `<div class="honor-marquee"><div class="honor-track${reverse ? ' rev' : ''}" style="--dur:${Math.max(30, list.length * 3.2)}s">${chips}${chips}</div></div>`;
}

const CORNER_SVG = `<svg viewBox="0 0 46 46" fill="none" aria-hidden="true"><path d="M2 30 V8 Q2 2 8 2 H30" stroke="#C9923A" stroke-width="1.6"/><path d="M7 22 V11 Q7 7 11 7 H22" stroke="#E9B85A" stroke-width="1" opacity=".7"/><path d="M2 8 Q14 10 16 16 Q10 14 8 2" fill="#C9923A" opacity=".85"/><circle cx="16" cy="16" r="2.4" fill="#FFD9A0"/></svg>`;
const CREST_SVG = `<svg viewBox="0 0 96 96" aria-hidden="true">
  <g fill="none" stroke="#E9B85A" stroke-width="2.2" stroke-linecap="round">
    <path d="M30 78 Q10 60 16 30"/><path d="M66 78 Q86 60 80 30"/>
  </g>
  <g fill="#C9923A">
    <ellipse cx="15" cy="38" rx="4" ry="8" transform="rotate(-20 15 38)"/><ellipse cx="14" cy="52" rx="4" ry="8" transform="rotate(-42 14 52)"/><ellipse cx="20" cy="65" rx="4" ry="8" transform="rotate(-62 20 65)"/>
    <ellipse cx="81" cy="38" rx="4" ry="8" transform="rotate(20 81 38)"/><ellipse cx="82" cy="52" rx="4" ry="8" transform="rotate(42 82 52)"/><ellipse cx="76" cy="65" rx="4" ry="8" transform="rotate(62 76 65)"/>
  </g>
  <path d="M48 16 L55.5 34 L75 35.5 L60 48 L65 67 L48 56.5 L31 67 L36 48 L21 35.5 L40.5 34 Z" fill="#FFD45A" stroke="#FFF1C9" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M30 80 Q48 88 66 80" fill="none" stroke="#E9B85A" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;

function sparksHtml() {
  let out = '';
  for (let i = 0; i < 26; i++) {
    out += `<span style="--x:${Math.random() * 100}%;--s:${3 + Math.random() * 5}px;--d:${6 + Math.random() * 7}s;--delay:${-Math.random() * 12}s;--drift:${(Math.random() - 0.5) * 140}px"></span>`;
  }
  return out;
}

/** Exported so a preview page can drive the exact same markup. */
export function openHonorPopup(model, viewerName, onClose) {
  document.querySelector('.honor-overlay')?.remove();
  injectStyles();
  const { sorted, topRank, leaders, hasLeaders } = model;
  const isHonoree = !!viewerName && sorted.some((s) => s.name === viewerName);
  const half = Math.ceil(sorted.length / 2);

  const overlay = document.createElement('div');
  overlay.className = 'honor-overlay';
  overlay.innerHTML = `
    <div class="honor-sparks">${sparksHtml()}</div>
    <div class="honor-card" role="dialog" aria-modal="true" aria-labelledby="honorHeading">
      ${['tl', 'tr', 'bl', 'br'].map((c) => `<span class="honor-corner ${c}">${CORNER_SVG}</span>`).join('')}
      <div class="honor-scroll">
      <div class="honor-pad">
        <div class="honor-crest">${CREST_SVG}</div>
        <p class="honor-kicker">✦ Roll of Honor ✦</p>
        <h2 class="honor-heading" id="honorHeading">Congratulations, Pilgrims of the Midterm Season!</h2>
        <p class="honor-count"><b>${sorted.length}</b> student${sorted.length === 1 ? ' has' : 's have'} crossed the gate</p>
        <div class="honor-divider"><i></i></div>
        <p class="honor-text">These students finished the Prelim Season and have entered the <strong>Midterm Season</strong>. Their perseverance, their faith, and their hard work brought them here. <strong>We are proud of each one of you!</strong></p>
        ${isHonoree
          ? `<p class="honor-you">🎉 <strong>${escapeHtml(viewerName)}</strong>, your name is on this roll. Well done, and keep climbing!</p>`
          : `<p class="honor-text">Look for the names of your classmates below, and cheer them on.</p>`}
      </div>
      ${hasLeaders ? `<div class="honor-pad"><div class="honor-spotlight">
        <span class="honor-spotlight-label">${RANK_ICON[topRank] || '⭐'} Leading the Way · Highest Rank</span>
        <span class="honor-spotlight-names">${leaders.slice(0, 3).map((s) => escapeHtml(s.name)).join(' · ')}${leaders.length > 3 ? ` and ${leaders.length - 3} more` : ''}</span>
        <span class="honor-spotlight-rank">${topRank}</span>
      </div></div>` : ''}
      <div class="honor-rows">
        ${marqueeHtml(model, sorted.slice(0, half), viewerName, false)}
        ${sorted.length > 1 ? marqueeHtml(model, sorted.slice(half), viewerName, true) : ''}
      </div>
      <div class="honor-pad">
        <button type="button" class="honor-all-btn" aria-expanded="false">See all ${sorted.length} names</button>
        <div class="honor-all"><ol>${sorted.map((s) => `<li class="${model.isLeader(s) ? 'top' : ''}">${escapeHtml(s.name)}<small>${s.rank}${s.stars ? ' ' + '★'.repeat(s.stars) : ''}</small></li>`).join('')}</ol></div>
      </div>
      </div>
      <div class="honor-foot"><button type="button" class="honor-btn">Hail, Pilgrims!</button></div>
    </div>`;
  document.body.appendChild(overlay);

  const allBtn = overlay.querySelector('.honor-all-btn');
  const all = overlay.querySelector('.honor-all');
  allBtn.addEventListener('click', () => {
    const open = all.classList.toggle('open');
    allBtn.setAttribute('aria-expanded', String(open));
    allBtn.textContent = open ? 'Hide the full list' : `See all ${sorted.length} names`;
  });
  overlay.querySelector('.honor-btn').addEventListener('click', () => {
    overlay.remove();
    if (onClose) onClose();
  });
}

/** Exported so a preview page can drive the exact same markup. */
export function fillHonorStrip(mount, model, viewerName) {
  injectStyles();
  const { sorted } = model;
  mount.innerHTML = `
    <button type="button" class="honor-strip" aria-label="Open the Midterm Season Roll of Honor">
      <span class="honor-strip-head">
        <span class="honor-strip-title">🏅 Midterm Season · Roll of Honor</span>
        <span class="honor-strip-sub">${sorted.length} student${sorted.length === 1 ? '' : 's'} · tap to see everyone</span>
      </span>
      ${marqueeHtml(model, sorted, viewerName, false)}
    </button>`;
  mount.querySelector('.honor-strip').addEventListener('click', () => openHonorPopup(model, viewerName));
}

// ---------- public API for dashboard.html ----------

/** Resolves once the popup is dismissed -- or immediately when there's
 *  nothing to show -- so the dashboard can queue the next popup after it. */
export function showHonorPopup({ viewerName }) {
  return loadRoll().then((model) => new Promise((resolve) => {
    if (!model) { resolve(); return; }
    openHonorPopup(model, viewerName, resolve);
  }));
}

/** Fills `mount` with the scrolling strip (or leaves it empty). */
export function renderHonorStrip(mount, { viewerName }) {
  if (!mount) return;
  loadRoll().then((model) => { if (model) fillHonorStrip(mount, model, viewerName); });
}
