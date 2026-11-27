// ============================================
// HALL OF LEGENDS (Jornie, 2026-11-27) -- a permanent section on the
// dashboard, not a popup, honoring every student who forged and claimed
// a Legendary Artifact: the artifact's art and name, the student's name,
// and the day it was forged. Before anyone has, it shows the six
// Legendaries as unclaimed relics and invites students to be the first.
//
// Where the names come from: the same pattern as midtermHonorRoll.js.
// Students can't read each other's records, so the list is ONE doc,
// announcements/legendHall, rewritten by publishLegendHall() whenever an
// admin loads the roster in teacher.js. A student counts once they have
// claimed their Legendary (legendaryForgeSeen).
//
// All CSS is injected from here (own .lh-* classes).
// ============================================

import { db, doc, getDoc, setDoc, serverTimestamp } from '../core/firebase.js';
import { ADMIN_EMAILS } from '../core/admins.js';
import { CRAFTING_CHAINS } from './artifacts.js';
import { legendaryArtPath, forgedDateFor } from './legendaryCard.js';
import { FORGE_DAYS } from './legendaryForge.js';

const HALL_DOC = ['announcements', 'legendHall'];
// How many Legend cards show before "See all": 8 on tablets and
// computers, 4 on phones (keep in sync with the :nth-child(n+9) and
// :nth-child(n+5) rules in the CSS below).
const SHOWN_AT_FIRST = 8;
const SHOWN_ON_PHONES = 4;
const FORGE_MS = FORGE_DAYS * 24 * 60 * 60 * 1000;
const LEGENDARY = Object.fromEntries(CRAFTING_CHAINS.map((c) => [c.tier5Id, c.tier5Name]));

// ---------- data ----------

/** What publishLegendHall() stores, first forged first. */
export function legendHallEntries(allStudents) {
  return allStudents
    .filter((d) => d && d.legendaryForgeSeen === true && d.name && !ADMIN_EMAILS.includes(d.email))
    .map((d) => {
      const legendary = d.legendaryForgeChain || d.chosenLegendaryChain;
      const forged = forgedDateFor(d, FORGE_MS);
      return { name: String(d.name).slice(0, 80), legendary, at: forged ? forged.toISOString() : '' };
    })
    .filter((e) => LEGENDARY[e.legendary])
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/** Called by teacher.js with every student record it just loaded. */
export function publishLegendHall(allStudents) {
  return setDoc(doc(db, ...HALL_DOC), { students: legendHallEntries(allStudents), updatedAt: serverTimestamp() }).catch((err) => {
    console.error('Failed to publish the Hall of Legends:', err);
  });
}

function loadHall() {
  return getDoc(doc(db, ...HALL_DOC))
    .then((snap) => ((snap.exists() ? snap.data().students : []) || [])
      .filter((s) => s && typeof s.name === 'string' && s.name.trim() && LEGENDARY[s.legendary]))
    .catch((err) => {
      console.error('Failed to load the Hall of Legends:', err);
      return [];
    });
}

// ---------- markup ----------

const CSS = `
@keyframes lhShine { 0%, 60% { background-position: -150% 0; } 100% { background-position: 250% 0; } }
@keyframes lhGlow { 0%, 100% { box-shadow: 0 0 0 1px #000, 0 0 26px rgba(255,190,80,.28); } 50% { box-shadow: 0 0 0 1px #000, 0 0 44px rgba(255,190,80,.55); } }
@keyframes lhRays { to { transform: rotate(360deg); } }
@keyframes lhFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

.lh-hall {
  position: relative; margin: 18px 0 34px; padding: 22px 20px 22px; border-radius: 10px; overflow: hidden; text-align: center; color: #E8DCC4;
  background: radial-gradient(ellipse at 50% 0%, rgba(233,184,90,.22), transparent 60%), radial-gradient(ellipse at 50% 110%, rgba(150,45,10,.35), transparent 60%), linear-gradient(170deg, #1B1512 0%, #0E0A09 55%, #070505 100%);
  border: 1px solid #8A6626;
  box-shadow: inset 0 0 0 4px #0E0A09, inset 0 0 0 5px rgba(233,184,90,.55), inset 0 0 60px rgba(0,0,0,.6), 0 14px 40px rgba(0,0,0,.45);
}
.lh-corner { position: absolute; width: 40px; height: 40px; pointer-events: none; }
.lh-corner svg { display: block; width: 100%; height: 100%; }
.lh-corner.tl { top: 3px; left: 3px; } .lh-corner.tr { top: 3px; right: 3px; transform: scaleX(-1); }
.lh-corner.bl { bottom: 3px; left: 3px; transform: scaleY(-1); } .lh-corner.br { bottom: 3px; right: 3px; transform: scale(-1,-1); }
.lh-kicker { margin: 0 0 6px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11.5px; letter-spacing: 3.5px; text-transform: uppercase; color: #D98A4A; }
.lh-title {
  margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 30px; line-height: 1.15; letter-spacing: 1px;
  background: linear-gradient(100deg, #E9B85A 0%, #FFF6D8 45%, #E9B85A 55%, #9C6A22 100%); background-size: 250% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,.8)); animation: lhShine 5s ease-in-out infinite;
}
.lh-sub { margin: 8px auto 0; max-width: 620px; font-size: 14px; line-height: 1.6; color: #D6C8AE; }
.lh-sub strong { color: #FFE2A8; }
.lh-divider { display: flex; align-items: center; gap: 10px; margin: 16px auto 18px; max-width: 520px; }
.lh-divider::before, .lh-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #C9923A 40%, #C9923A 60%, transparent); }
.lh-divider i { width: 8px; height: 8px; transform: rotate(45deg); background: #E9B85A; box-shadow: 0 0 8px rgba(233,184,90,.7); }

.lh-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
.lh-card {
  position: relative; width: 200px; padding: 14px 12px 14px; border-radius: 8px; box-sizing: border-box;
  background: linear-gradient(180deg, #2A1F15 0%, #140E0A 100%); border: 1px solid #E9B85A; animation: lhGlow 3s ease-in-out infinite;
}
.lh-art { position: relative; width: 132px; height: 132px; margin: 4px auto 10px; }
.lh-art::before { content: ''; position: absolute; inset: -26px; border-radius: 50%; background: repeating-conic-gradient(from 0deg, rgba(255,210,120,.2) 0deg 7deg, transparent 7deg 18deg); -webkit-mask-image: radial-gradient(circle, #000 30%, transparent 70%); mask-image: radial-gradient(circle, #000 30%, transparent 70%); animation: lhRays 30s linear infinite; }
.lh-art img { position: relative; width: 100%; height: 100%; object-fit: cover; border-radius: 50%; border: 2px solid #FFE7A8; box-shadow: 0 0 22px rgba(255,190,80,.5); animation: lhFloat 4s ease-in-out infinite; }
.lh-relic { margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; color: #FFE2A8; letter-spacing: .5px; }
.lh-tier { margin: 2px 0 8px; font-size: 10.5px; letter-spacing: 2px; text-transform: uppercase; color: #E9B85A; }
.lh-name { margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 16px; line-height: 1.3; color: #FFF6D8; text-shadow: 0 0 12px rgba(255,200,90,.45); }
.lh-date { margin: 6px 0 0; font-size: 11.5px; color: #A89272; }
.lh-card.you { border-color: #FFF1C9; }
/* Many Legends: only the first SHOWN_AT_FIRST show until "See all" is
   pressed, so the hall never pushes the rest of the dashboard far down.
   The viewer's own card always shows. */
.lh-grid.collapsed .lh-card:nth-child(n+9):not(.you) { display: none; }
.lh-more.phone-only { display: none; }
@media (max-width: 560px) {
  /* Phones: 4 cards (two rows) before "See all". */
  .lh-grid.collapsed .lh-card:nth-child(n+5):not(.you) { display: none; }
  .lh-more.phone-only, .lh-more.phone-only:hover { display: inline-block; }
}
.lh-more, .lh-more:hover {
  display: inline-block; margin: 16px auto 0; padding: 9px 20px; border-radius: 999px; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #FFE2A8; background: rgba(0,0,0,.35); border: 1px solid #C9923A;
}
.lh-more:hover { color: #2A1A05; background: linear-gradient(180deg, #F6D98A, #D9A441); }
.lh-more:focus-visible { outline: 2px solid #FFE7A8; outline-offset: 3px; }
.lh-you { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); padding: 2px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px; color: #2A1A05; background: linear-gradient(180deg, #F6D98A, #D9A441); white-space: nowrap; }

/* Before anyone has claimed one: the six Legendaries, dimmed. */
.lh-relics { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
.lh-relic-slot { width: 96px; }
.lh-relic-slot img { width: 78px; height: 78px; object-fit: cover; border-radius: 50%; border: 1px solid rgba(233,184,90,.45); filter: grayscale(.85) brightness(.45); }
.lh-relic-slot span { display: block; margin-top: 6px; font-size: 11px; line-height: 1.3; color: #A89272; }
.lh-call { margin: 16px auto 0; max-width: 520px; padding: 11px 14px; border-radius: 6px; font-size: 13.5px; line-height: 1.55; color: #FFE9C2; background: linear-gradient(135deg, rgba(233,184,90,.2), rgba(120,70,10,.14)); border: 1px solid rgba(233,184,90,.5); }
.lh-call strong { color: #FFD27A; }
/* ---- effects (behind the content): forge fire, smoke, embers, lightning ---- */
@keyframes lhFlicker { 0%, 100% { opacity: .75; transform: scaleY(1); } 25% { opacity: .95; transform: scaleY(1.08); } 50% { opacity: .65; transform: scaleY(.94); } 75% { opacity: .9; transform: scaleY(1.04); } }
@keyframes lhSmoke { 0% { transform: translate(0, 30%) scale(.8); opacity: 0; } 20% { opacity: .55; } 100% { transform: translate(var(--sx), -90%) scale(1.6); opacity: 0; } }
@keyframes lhEmber { 0% { transform: translate(0, 0) scale(1); opacity: 0; } 8% { opacity: 1; } 100% { transform: translate(var(--drift), calc(-1 * var(--rise))) scale(.3); opacity: 0; } }
.lh-hall > :not(.lh-fx):not(.lh-corner) { position: relative; z-index: 1; }
.lh-fx { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; border-radius: inherit; }
.lh-fire { position: absolute; left: -10%; right: -10%; bottom: -40px; height: 210px; transform-origin: 50% 100%;
  background: radial-gradient(ellipse 40% 75% at 22% 100%, rgba(255,110,25,.85), transparent 70%), radial-gradient(ellipse 38% 70% at 78% 100%, rgba(255,75,15,.8), transparent 70%), radial-gradient(ellipse 55% 60% at 50% 100%, rgba(255,200,90,.6), transparent 70%);
  filter: blur(8px); mix-blend-mode: screen; animation: lhFlicker 1.6s ease-in-out infinite; }
.lh-fire.two { height: 150px; opacity: .8; animation-duration: 2.3s; animation-direction: reverse;
  background: radial-gradient(ellipse 30% 70% at 40% 100%, rgba(255,150,40,.8), transparent 70%), radial-gradient(ellipse 30% 65% at 62% 100%, rgba(255,90,20,.75), transparent 70%); }
.lh-smoke { position: absolute; bottom: -20px; left: var(--x); width: 340px; height: 280px; border-radius: 50%;
  background: radial-gradient(circle, rgba(200,180,160,.38) 0%, rgba(140,120,105,.18) 45%, transparent 70%);
  filter: blur(16px); animation: lhSmoke var(--d) linear var(--delay) infinite; opacity: 0; }
.lh-ember { position: absolute; bottom: -8px; left: var(--x); width: var(--s); height: var(--s); border-radius: 50%;
  background: radial-gradient(circle, #FFF6D0 0%, #FFAA33 45%, rgba(255,90,0,0) 72%); box-shadow: 0 0 8px rgba(255,150,50,.95), 0 0 16px rgba(255,110,30,.5);
  animation: lhEmber var(--d) linear var(--delay) infinite; opacity: 0; }
/* Lightning is drawn by startLightning(): a new bolt for every strike. */
.lh-flash { position: absolute; inset: 0; opacity: 0; background: radial-gradient(ellipse 60% 90% at var(--fx) 0%, rgba(215,232,255,.7), rgba(160,190,255,.12) 55%, transparent 80%); }
.lh-bolt { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; overflow: visible; }
.lh-bolt .glow { stroke: rgba(150,185,255,.55); filter: blur(5px); }
.lh-bolt .core { stroke: #F6F9FF; }
.lh-bolt path { fill: none; stroke-linecap: round; stroke-linejoin: round; }

@media (max-width: 560px) {
  .lh-hall { padding: 18px 12px; margin-bottom: 26px; }
  .lh-smoke { width: 180px; height: 160px; }
  .lh-title { font-size: 23px; }
  .lh-card { width: calc(50% - 8px); min-width: 140px; }
  .lh-art { width: 100px; height: 100px; }
  .lh-relic-slot { width: 84px; } .lh-relic-slot img { width: 64px; height: 64px; }
}
@media (prefers-reduced-motion: reduce) {
  .lh-title, .lh-card, .lh-art::before, .lh-art img, .lh-fire { animation: none; }
  .lh-smoke, .lh-ember, .lh-flash, .lh-bolt { display: none; }
}
`;

function injectStyles() {
  if (document.getElementById('legendHallStyles')) return;
  const style = document.createElement('style');
  style.id = 'legendHallStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CORNER_SVG = `<svg viewBox="0 0 46 46" fill="none" aria-hidden="true"><path d="M2 30 V8 Q2 2 8 2 H30" stroke="#C9923A" stroke-width="1.6"/><path d="M7 22 V11 Q7 7 11 7 H22" stroke="#E9B85A" stroke-width="1" opacity=".7"/><path d="M2 8 Q14 10 16 16 Q10 14 8 2" fill="#C9923A" opacity=".85"/><circle cx="16" cy="16" r="2.4" fill="#FFD9A0"/></svg>`;
const dateText = (iso) => {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' }) : '';
};

// ---- lightning: a fresh bolt each strike, at random moments ----

const rand = (a, b) => a + Math.random() * (b - a);

// A jagged line from (x1,y1) to (x2,y2) by midpoint displacement: each
// pass halves every segment and nudges the new point sideways, less each
// time, which gives lightning's large zigzags with fine jitter on top.
function jagged(x1, y1, x2, y2, spread) {
  let pts = [[x1, y1], [x2, y2]];
  let offset = spread;
  for (let pass = 0; pass < 6; pass++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      next.push([(ax + bx) / 2 + rand(-offset, offset), (ay + by) / 2 + rand(-offset, offset) * 0.25], pts[i]);
    }
    pts = next;
    offset *= 0.55;
  }
  return pts;
}

const pathOf = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

/** One bolt as SVG markup sized to w x h: a trunk from the top edge
 *  down most of the hall, and a few thinner forks off it. */
function boltSvg(w, h) {
  const x0 = rand(w * 0.06, w * 0.94);
  const trunk = jagged(x0, -4, x0 + rand(-w * 0.12, w * 0.12), h * rand(0.62, 0.95), Math.min(90, w * 0.08));
  const forks = [];
  const count = Math.floor(rand(1, 4));
  for (let f = 0; f < count; f++) {
    const [sx, sy] = trunk[Math.floor(rand(0.15, 0.7) * trunk.length)];
    const len = h * rand(0.18, 0.4);
    const ang = rand(0.35, 1.1) * (Math.random() < 0.5 ? -1 : 1);
    forks.push(jagged(sx, sy, sx + Math.sin(ang) * len, sy + Math.cos(ang) * len, 26));
  }
  const draw = (pts, core, glow) => `<path class="glow" d="${pathOf(pts)}" stroke-width="${glow}"/><path class="core" d="${pathOf(pts)}" stroke-width="${core}"/>`;
  return {
    x: (x0 / w) * 100,
    svg: `<svg class="lh-bolt" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${draw(trunk, 2.6, 9)}${forks.map((p) => draw(p, 1.2, 5)).join('')}</svg>`
  };
}

/** Strikes at random intervals while `fx` is on the page. Each strike is
 *  either a bolt (a bright return stroke, a dip, a second stroke, then a
 *  fading afterglow) or, now and then, sheet lightning: only the glow. */
function startLightning(fx) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof Element.prototype.animate !== 'function') return;
  const strike = () => {
    if (!fx.isConnected) return; // the hall was replaced or removed
    const w = fx.clientWidth || 800;
    const h = fx.clientHeight || 300;
    const sheet = Math.random() < 0.3;
    const { x, svg } = boltSvg(w, h);
    const flash = document.createElement('span');
    flash.className = 'lh-flash';
    flash.style.setProperty('--fx', `${x.toFixed(0)}%`);
    fx.appendChild(flash);
    const duration = rand(420, 620);
    flash.animate(sheet
      ? [{ opacity: 0 }, { opacity: 0.35, offset: 0.15 }, { opacity: 0.1, offset: 0.3 }, { opacity: 0.28, offset: 0.45 }, { opacity: 0 }]
      : [{ opacity: 0 }, { opacity: 0.6, offset: 0.06 }, { opacity: 0.12, offset: 0.16 }, { opacity: 0.5, offset: 0.26 }, { opacity: 0.08 }],
    { duration, easing: 'ease-out' }).onfinish = () => flash.remove();
    if (!sheet) {
      fx.insertAdjacentHTML('beforeend', svg);
      const bolt = fx.lastElementChild;
      bolt.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.04 }, { opacity: 0.15, offset: 0.12 }, { opacity: 1, offset: 0.2 }, { opacity: 0.5, offset: 0.45 }, { opacity: 0 }],
        { duration, easing: 'ease-out' }
      ).onfinish = () => bolt.remove();
    }
    setTimeout(strike, rand(2500, 9000));
  };
  setTimeout(strike, rand(1200, 4000));
}

/** The effects layer: fire glow, smoke and rising embers. Lightning is
 *  added by startLightning(). Decorative only (aria-hidden). */
function effectsHtml() {
  const rnd = (a, b) => a + Math.random() * (b - a);
  let embers = '';
  for (let i = 0; i < 40; i++) {
    embers += `<span class="lh-ember" style="--x:${rnd(2, 98).toFixed(1)}%;--s:${rnd(3, 8).toFixed(1)}px;--d:${rnd(3.5, 8).toFixed(1)}s;--delay:${(-rnd(0, 8)).toFixed(1)}s;--drift:${rnd(-90, 90).toFixed(0)}px;--rise:${rnd(180, 380).toFixed(0)}px"></span>`;
  }
  let smoke = '';
  for (let i = 0; i < 6; i++) {
    smoke += `<span class="lh-smoke" style="--x:${(i * 18 - 10 + rnd(-5, 5)).toFixed(0)}%;--d:${rnd(9, 14).toFixed(1)}s;--delay:${(-rnd(0, 13)).toFixed(1)}s;--sx:${rnd(-70, 70).toFixed(0)}px"></span>`;
  }
  return `<div class="lh-fx" aria-hidden="true">
    ${smoke}<div class="lh-fire"></div><div class="lh-fire two"></div>${embers}
  </div>`;
}

/** Exported so a preview page can drive the exact same markup. */
export function fillLegendHall(mount, legends, viewerName) {
  injectStyles();
  const corners = ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="lh-corner ${c}">${CORNER_SVG}</span>`).join('');
  const body = legends.length
    ? `<p class="lh-sub">${legends.length === 1 ? 'One pilgrim has' : `${legends.length} pilgrims have`} walked the whole portal and forged a <strong>Legendary Artifact</strong>. ${legends.length === 1 ? 'Their name is' : 'Their names are'} written here for good.</p>
       <div class="lh-divider"><i></i></div>
       <div class="lh-grid${legends.length > SHOWN_ON_PHONES ? ' collapsed' : ''}" id="lhGrid">${legends.map((l) => {
         const you = !!viewerName && l.name === viewerName;
         return `<div class="lh-card${you ? ' you' : ''}">
           ${you ? '<span class="lh-you">✦ That\'s you ✦</span>' : ''}
           <div class="lh-art"><img src="${legendaryArtPath(l.legendary)}" alt="${escapeHtml(LEGENDARY[l.legendary])}" loading="lazy"></div>
           <p class="lh-relic">${escapeHtml(LEGENDARY[l.legendary])}</p>
           <p class="lh-tier">Tier V · Legendary</p>
           <p class="lh-name">${escapeHtml(l.name)}</p>
           ${dateText(l.at) ? `<p class="lh-date">Forged ${dateText(l.at)}</p>` : ''}
         </div>`;
       }).join('')}</div>
       ${legends.length > SHOWN_ON_PHONES ? `<button type="button" class="lh-more${legends.length <= SHOWN_AT_FIRST ? ' phone-only' : ''}" aria-controls="lhGrid" aria-expanded="false">See all ${legends.length} Legends</button>` : ''}`
    : `<p class="lh-sub">Six Legendary Artifacts wait in the forge. <strong>No pilgrim has claimed one yet.</strong></p>
       <div class="lh-divider"><i></i></div>
       <div class="lh-relics">${CRAFTING_CHAINS.map((c) => `<div class="lh-relic-slot"><img src="${legendaryArtPath(c.tier5Id)}" alt="" loading="lazy"><span>${escapeHtml(c.tier5Name)}</span></div>`).join('')}</div>
       <p class="lh-call">⚒️ Finish the whole portal and forge your Legendary, and <strong>your name will be the first written in this hall.</strong></p>`;
  mount.innerHTML = `
    <section class="lh-hall" aria-labelledby="lhTitle">
      ${effectsHtml()}
      ${corners}
      <p class="lh-kicker">✦ Tier V · The Legendary ✦</p>
      <h2 class="lh-title" id="lhTitle">Hall of Legends</h2>
      ${body}
    </section>`;
  startLightning(mount.querySelector('.lh-fx'));

  const more = mount.querySelector('.lh-more');
  if (more) {
    more.addEventListener('click', () => {
      const grid = mount.querySelector('.lh-grid');
      const open = grid.classList.toggle('collapsed') === false;
      more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? 'Show fewer' : `See all ${legends.length} Legends`;
    });
  }
}

/** Fills `mount` with the Hall of Legends. */
export function renderLegendHall(mount, { viewerName }) {
  if (!mount) return;
  loadHall().then((legends) => fillLegendHall(mount, legends, viewerName));
}
