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
  position: relative; margin: 18px 0 0; padding: 22px 20px 22px; border-radius: 10px; overflow: hidden; text-align: center; color: #E8DCC4;
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
.lh-you { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); padding: 2px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px; color: #2A1A05; background: linear-gradient(180deg, #F6D98A, #D9A441); white-space: nowrap; }

/* Before anyone has claimed one: the six Legendaries, dimmed. */
.lh-relics { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
.lh-relic-slot { width: 96px; }
.lh-relic-slot img { width: 78px; height: 78px; object-fit: cover; border-radius: 50%; border: 1px solid rgba(233,184,90,.45); filter: grayscale(.85) brightness(.45); }
.lh-relic-slot span { display: block; margin-top: 6px; font-size: 11px; line-height: 1.3; color: #A89272; }
.lh-call { margin: 16px auto 0; max-width: 520px; padding: 11px 14px; border-radius: 6px; font-size: 13.5px; line-height: 1.55; color: #FFE9C2; background: linear-gradient(135deg, rgba(233,184,90,.2), rgba(120,70,10,.14)); border: 1px solid rgba(233,184,90,.5); }
.lh-call strong { color: #FFD27A; }
@media (max-width: 560px) {
  .lh-hall { padding: 18px 12px; }
  .lh-title { font-size: 23px; }
  .lh-card { width: calc(50% - 8px); min-width: 140px; }
  .lh-art { width: 100px; height: 100px; }
  .lh-relic-slot { width: 84px; } .lh-relic-slot img { width: 64px; height: 64px; }
}
@media (prefers-reduced-motion: reduce) { .lh-title, .lh-card, .lh-art::before, .lh-art img { animation: none; } }
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

/** Exported so a preview page can drive the exact same markup. */
export function fillLegendHall(mount, legends, viewerName) {
  injectStyles();
  const corners = ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="lh-corner ${c}">${CORNER_SVG}</span>`).join('');
  const body = legends.length
    ? `<p class="lh-sub">${legends.length === 1 ? 'One pilgrim has' : `${legends.length} pilgrims have`} walked the whole portal and forged a <strong>Legendary Artifact</strong>. ${legends.length === 1 ? 'Their name is' : 'Their names are'} written here for good.</p>
       <div class="lh-divider"><i></i></div>
       <div class="lh-grid">${legends.map((l) => {
         const you = !!viewerName && l.name === viewerName;
         return `<div class="lh-card${you ? ' you' : ''}">
           ${you ? '<span class="lh-you">✦ That\'s you ✦</span>' : ''}
           <div class="lh-art"><img src="${legendaryArtPath(l.legendary)}" alt="${escapeHtml(LEGENDARY[l.legendary])}" loading="lazy"></div>
           <p class="lh-relic">${escapeHtml(LEGENDARY[l.legendary])}</p>
           <p class="lh-tier">Tier V · Legendary</p>
           <p class="lh-name">${escapeHtml(l.name)}</p>
           ${dateText(l.at) ? `<p class="lh-date">Forged ${dateText(l.at)}</p>` : ''}
         </div>`;
       }).join('')}</div>`
    : `<p class="lh-sub">Six Legendary Artifacts wait in the forge. <strong>No pilgrim has claimed one yet.</strong></p>
       <div class="lh-divider"><i></i></div>
       <div class="lh-relics">${CRAFTING_CHAINS.map((c) => `<div class="lh-relic-slot"><img src="${legendaryArtPath(c.tier5Id)}" alt="" loading="lazy"><span>${escapeHtml(c.tier5Name)}</span></div>`).join('')}</div>
       <p class="lh-call">⚒️ Finish the whole portal and forge your Legendary, and <strong>your name will be the first written in this hall.</strong></p>`;
  mount.innerHTML = `
    <section class="lh-hall" aria-labelledby="lhTitle">
      ${corners}
      <p class="lh-kicker">✦ Tier V · The Legendary ✦</p>
      <h2 class="lh-title" id="lhTitle">Hall of Legends</h2>
      ${body}
    </section>`;
}

/** Fills `mount` with the Hall of Legends. */
export function renderLegendHall(mount, { viewerName }) {
  if (!mount) return;
  loadHall().then((legends) => fillLegendHall(mount, legends, viewerName));
}
