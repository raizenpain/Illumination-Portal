// ============================================
// JOURNEY FINALE — the two last moments of the whole portal, both in the
// dark fantasy family of the Prelim reminder / Legendary Key screens:
//
//   1. "Your Pilgrimage Is Complete" -- once, right after the student
//      submits the Final (Apostle) Reflection, the very last task. The
//      crown banner, the Seeker -> Apostle rank path with stars, journey
//      stats, a farewell letter from their teacher and 2 Timothy 4:7.
//      Saves journeyCompleteSeen when closed.
//   2. Then the Legendary Forge (legendaryForge.js): the 7-strike ritual,
//      the 5-day forging and the reveal, if the student qualifies.
//
// dashboard.html calls maybeShowFinale(); the pilgrimage always comes
// before the forge (legendaryForge.js waits for journeyCompleteSeen).
// Never for admin preview accounts.
//
// Image: assets/journey-crown.webp (Jornie's pick, 2026-10-03).
//
// All CSS is injected from here with its own .finale-* classes. Every
// button restates its :hover background, since style.css's global
// button:hover (0,1,1) outranks a plain class selector (0,1,0).
//
// Preview (no Firestore writes): ?previewJourney=1 on the dashboard.
// ============================================

import { db, doc, updateDoc, runTransaction, increment } from '../core/firebase.js';
import { RANK_TIERS, RANK_ICON, getSeasonStars } from '../core/rank.js';
import { chainForTier5 } from './artifacts.js';
import { VAULT_GAMES } from '../vault/vaultGames.js';
import { runForgeGate } from './legendaryForge.js';
import { TICKET_INFO } from './ticketTrader.js';

// The Final Gift (Jornie, 2026-10-03): 10 of every ticket type, once, for
// finishing the Final Season. Shown inside the pilgrimage screen.
const FINAL_GIFT_PER_TYPE = 10;

const CROWN_IMAGE = 'assets/journey-crown.webp';
const CERTIFICATE_URL = 'season-completion.html?season=final';
const TOTAL_ARTIFACTS = 30;

const FAREWELL = [
  'You did it. From the very first puzzle of the Prelim Season to the last word of your Final Reflection, you walked every step of this pilgrimage, and you never gave up.',
  'There were questions that tested you, deadlines that pressed on you, and days when going on felt hard. Still, you rose and kept going. That perseverance is not small. It is the mark of a true disciple.',
  'Remember this: what you learned here was never only for a grade. It was for your life. Carry your faith into every classroom, every home, every friendship and every choice you make. Be the light the world needs: bright, humble and unafraid.',
  'I am proud of you, and God walks with you. Go forth, Apostle. Your greatest chapter begins now.'
];
const VERSE = { text: 'I have fought the good fight, I have finished the race, I have kept the faith.', ref: '2 Timothy 4:7' };

// ---------- styles ----------

const CSS = `
@keyframes finFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes finRise { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes finEmber { 0% { transform: translate(0,0) scale(1); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(var(--drift), -110vh) scale(.4); opacity: 0; } }
@keyframes finShine { 0%, 60% { background-position: -150% 0; } 100% { background-position: 250% 0; } }
@keyframes finFlame { 0%, 100% { opacity: .55; transform: scaleY(1); } 50% { opacity: .9; transform: scaleY(1.06); } }
@keyframes finShake { 0%, 100% { transform: translate(0,0); } 20% { transform: translate(-5px,3px); } 40% { transform: translate(5px,-3px); } 60% { transform: translate(-4px,-2px); } 80% { transform: translate(3px,2px); } }
@keyframes finStrikeFlash { 0% { opacity: 0; } 15% { opacity: 1; } 100% { opacity: 0; } }
@keyframes finSpark { 0% { opacity: 1; transform: translate(0,0) scale(1); } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.3); } }
@keyframes finRays { to { transform: rotate(360deg); } }
@keyframes finArtifactRise { 0% { opacity: 0; transform: translateY(40px) scale(.6); filter: brightness(3) blur(6px); } 60% { opacity: 1; filter: brightness(1.8) blur(0); } 100% { opacity: 1; transform: none; filter: brightness(1.1) drop-shadow(0 0 22px rgba(255,190,80,.7)); } }
@keyframes finPop { 0% { opacity: 0; transform: scale(.7); } 70% { opacity: 1; transform: scale(1.06); } 100% { transform: scale(1); } }
@keyframes finPulse { 0%, 100% { box-shadow: 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25); } 50% { box-shadow: 0 0 0 1px #000, 0 8px 34px rgba(255,150,50,.55); } }

.finale-overlay {
  position: fixed; inset: 0; z-index: 10200;
  display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box; overflow: hidden;
  background: radial-gradient(ellipse at 50% 110%, rgba(150,45,10,.45), transparent 55%), radial-gradient(ellipse at center, rgba(16,10,7,.92), rgba(0,0,0,.97));
  animation: finFadeIn .45s ease;
  font-family: 'Segoe UI', system-ui, sans-serif;
}
.finale-embers { position: absolute; inset: 0; pointer-events: none; }
.finale-embers span { position: absolute; bottom: -10px; left: var(--x); width: var(--s); height: var(--s); border-radius: 50%; background: radial-gradient(circle, #FFD08A 0%, #FF7A1A 45%, rgba(255,80,0,0) 70%); animation: finEmber var(--d) linear var(--delay) infinite; opacity: 0; }

.finale-card {
  position: relative; width: min(600px, 100%);
  max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
  color: #E8DCC4; text-align: center;
  background: radial-gradient(ellipse at 50% 0%, rgba(201,146,58,.18), transparent 60%), radial-gradient(circle at 20% 85%, rgba(90,20,10,.25), transparent 50%), linear-gradient(170deg, #1B1512 0%, #0E0A09 55%, #070505 100%);
  border: 1px solid #6B4E1F; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #0E0A09, inset 0 0 0 5px rgba(201,146,58,.55), inset 0 0 60px rgba(0,0,0,.7), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.85), 0 0 80px rgba(255,140,40,.16);
  animation: finRise .55s cubic-bezier(.2,.9,.3,1.1);
}
.finale-corner { position: absolute; width: 46px; height: 46px; pointer-events: none; z-index: 3; }
.finale-corner svg { display: block; width: 100%; height: 100%; }
.finale-corner.tl { top: 2px; left: 2px; } .finale-corner.tr { top: 2px; right: 2px; transform: scaleX(-1); }
.finale-corner.bl { bottom: 2px; left: 2px; transform: scaleY(-1); } .finale-corner.br { bottom: 2px; right: 2px; transform: scale(-1,-1); }

.finale-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; margin: 6px 6px 0; padding: 0 0 14px; scrollbar-width: thin; scrollbar-color: #6B4E1F transparent; }
.finale-scroll::-webkit-scrollbar { width: 8px; }
.finale-scroll::-webkit-scrollbar-track { background: transparent; }
.finale-scroll::-webkit-scrollbar-thumb { background: #6B4E1F; border-radius: 4px; }
.finale-pad { padding: 0 24px; }
.finale-foot { position: relative; flex-shrink: 0; padding: 4px 26px 22px; display: flex; gap: 10px; }
.finale-foot::before { content: ''; position: absolute; left: 6px; right: 6px; top: -18px; height: 18px; pointer-events: none; background: linear-gradient(180deg, rgba(9,6,5,0), rgba(9,6,5,.95)); }

/* Banner art (crown / forge), fading into the card at the bottom. */
.finale-banner { position: relative; height: 190px; overflow: hidden; border-radius: 2px 2px 0 0; }
.finale-banner img { display: block; width: 100%; height: 100%; object-fit: cover; -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent 100%); mask-image: linear-gradient(180deg, #000 55%, transparent 100%); }

.finale-kicker { margin: 0 0 8px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11.5px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A; }
.finale-heading {
  margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 28px; line-height: 1.2; text-wrap: balance;
  background: linear-gradient(100deg, #E9B85A 0%, #FFF6D8 45%, #E9B85A 55%, #9C6A22 100%); background-size: 250% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,.8)) drop-shadow(0 0 14px rgba(233,184,90,.25));
  animation: finShine 6s ease-in-out infinite;
}
.finale-divider { display: flex; align-items: center; gap: 10px; margin: 14px 0 14px; }
.finale-divider::before, .finale-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #C9923A 40%, #C9923A 60%, transparent); }
.finale-divider i { width: 8px; height: 8px; transform: rotate(45deg); background: #E9B85A; box-shadow: 0 0 8px rgba(233,184,90,.7); }
.finale-text { margin: 0 0 16px; font-size: 14.5px; line-height: 1.65; color: #D6C8AE; }
.finale-text strong { color: #FFE2A8; }
.finale-section-label { margin: 0 0 10px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11.5px; letter-spacing: 2px; text-transform: uppercase; color: #D98A4A; }

/* Rank path: Seeker -> Disciple -> Missionary -> Apostle */
.finale-path { display: flex; align-items: stretch; justify-content: center; gap: 6px; margin: 0 0 18px; }
.finale-step { flex: 1 1 0; min-width: 0; max-width: 120px; padding: 10px 4px 9px; border-radius: 4px; background: linear-gradient(180deg, #2A221D 0%, #15100D 100%); border: 1px solid #4A3820; box-shadow: inset 0 0 12px rgba(0,0,0,.8); }
.finale-step i { display: block; font-style: normal; font-size: 22px; line-height: 1.1; }
.finale-step b { display: block; margin-top: 4px; font-family: 'Cinzel', Georgia, serif; font-size: 12px; letter-spacing: .5px; color: #FFE2A8; }
.finale-step small { display: block; margin-top: 3px; font-size: 11px; letter-spacing: 1px; color: #FFD45A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.finale-step.apostle { border-color: #FFE7A8; background: linear-gradient(180deg, rgba(233,184,90,.32), rgba(120,70,10,.3)); box-shadow: 0 0 16px rgba(255,200,90,.35), inset 0 0 12px rgba(0,0,0,.4); }
.finale-arrow { align-self: center; color: #6B4E1F; font-size: 14px; }

/* Journey stats */
.finale-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 0 0 12px; }
.finale-stat { padding: 10px 4px 8px; border-radius: 4px; background: rgba(0,0,0,.3); border: 1px solid rgba(233,184,90,.22); }
.finale-stat b { display: block; font-family: 'Cinzel', Georgia, serif; font-size: 22px; line-height: 1.1; color: #FFD9A0; text-shadow: 0 0 10px rgba(255,130,40,.45); font-variant-numeric: tabular-nums; }
.finale-stat span { display: block; margin-top: 4px; font-size: 10.5px; line-height: 1.3; letter-spacing: .5px; text-transform: uppercase; color: #A89272; }
.finale-legend-line { margin: 0 0 18px; padding: 9px 12px; border-radius: 4px; font-size: 13px; line-height: 1.5; color: #E8DCC4; background: linear-gradient(135deg, rgba(233,184,90,.18), rgba(120,70,10,.12)); border: 1px solid rgba(233,184,90,.45); }
.finale-legend-line strong { color: #FFE2A8; font-family: 'Cinzel', Georgia, serif; }

/* The Final Gift: one chip per ticket type */
@keyframes finGiftIn { 0% { transform: translateY(10px) scale(.9); filter: brightness(2); } 100% { transform: none; filter: none; } }
.finale-gift { margin: 0 0 18px; padding: 14px 12px 12px; border-radius: 4px; background: radial-gradient(ellipse at 50% 0%, rgba(233,184,90,.22), transparent 70%), rgba(0,0,0,.3); border: 1px solid rgba(233,184,90,.5); box-shadow: 0 0 22px rgba(255,180,60,.12), inset 0 0 20px rgba(0,0,0,.4); }
.finale-gift .finale-section-label { margin-bottom: 4px; color: #FFD45A; }
.finale-gift-sub { margin: 0 0 12px; font-size: 12.5px; color: #A89272; }
.finale-gift-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.finale-gift-chip { min-width: 0; padding: 9px 3px 8px; border-radius: 4px; background: linear-gradient(180deg, #2A221D 0%, #15100D 100%); border: 1px solid #8A6626; box-shadow: inset 0 0 12px rgba(0,0,0,.7); animation: finGiftIn .7s cubic-bezier(.2,.9,.3,1.2) backwards; animation-delay: calc(var(--i) * .12s + .4s); }
.finale-gift-chip i { display: flex; align-items: center; justify-content: center; height: 26px; font-style: normal; font-size: 22px; line-height: 1; }
.finale-gift-chip i img { display: block; width: 26px; height: 26px; margin: 0; object-fit: contain; }
.finale-gift-chip b { display: block; margin-top: 3px; font-family: 'Cinzel', Georgia, serif; font-size: 18px; color: #FFD9A0; text-shadow: 0 0 10px rgba(255,130,40,.5); }
.finale-gift-chip span { display: block; margin-top: 2px; font-size: 10px; line-height: 1.25; color: #D6C8AE; }

/* Farewell letter */
.finale-letter { position: relative; margin: 0 0 16px; padding: 18px 18px 14px; text-align: left; border-radius: 4px; background: linear-gradient(180deg, rgba(60,42,22,.45), rgba(25,17,10,.55)); border: 1px solid rgba(201,146,58,.4); box-shadow: inset 0 0 30px rgba(0,0,0,.45); }
.finale-letter p { margin: 0 0 10px; font-size: 14px; line-height: 1.7; color: #E8DCC4; }
.finale-letter .finale-salute { font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 14px; color: #FFE2A8; letter-spacing: .5px; }
.finale-letter .finale-sign { margin: 4px 0 0; text-align: right; font-family: 'Cinzel', Georgia, serif; font-size: 13px; color: #E9B85A; }
.finale-verse { margin: 0 0 4px; font-family: 'Cinzel', Georgia, serif; font-size: 14px; line-height: 1.6; color: #FFE2A8; font-style: italic; }
.finale-verse cite { display: block; margin-top: 4px; font-style: normal; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #C9923A; }

/* Buttons */
.finale-btn, .finale-btn:hover {
  flex: 1 1 0; display: block; margin: 0; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; padding: 14px 16px; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 0 rgba(0,0,0,.25), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
  text-shadow: 0 1px 0 rgba(255,240,200,.6);
}
.finale-btn:hover { filter: brightness(1.1); }
.finale-btn.ghost, .finale-btn.ghost:hover { color: #E8DCC4; text-shadow: none; background: rgba(255,255,255,.04); border-color: #6B4E1F; box-shadow: none; font-size: 13px; }
.finale-btn.ghost:hover { background: rgba(233,184,90,.08); color: #FFE2A8; filter: none; }
.finale-btn:focus-visible { outline: 2px solid #FFE7A8; outline-offset: 3px; }
.finale-btn.pulse { animation: finPulse 1.8s ease-in-out infinite; }

/* Laptop-height screens and phones */
@media (max-height: 760px), (max-width: 480px) {
  .finale-banner { height: 140px; }
  .finale-heading { font-size: 24px; }
  .finale-divider { margin: 10px 0 11px; }
  .finale-text { font-size: 13.5px; line-height: 1.55; margin-bottom: 12px; }
  .finale-path { margin-bottom: 14px; }
  .finale-letter p { font-size: 13.5px; line-height: 1.6; }
  .finale-foot { padding: 4px 26px 18px; }
  .finale-btn, .finale-btn:hover { padding: 12px 14px; font-size: 14px; }
}
@media (max-width: 480px) {
  .finale-pad { padding: 0 14px; }
  .finale-foot { padding: 4px 16px 16px; flex-direction: column-reverse; gap: 8px; }
  .finale-corner { width: 34px; height: 34px; }
  .finale-banner { height: 120px; }
  .finale-heading { font-size: 21px; }
  .finale-kicker { font-size: 10.5px; letter-spacing: 2px; }
  .finale-path { gap: 3px; }
  .finale-arrow { display: none; }
  .finale-step i { font-size: 18px; }
  .finale-step b { font-size: 10px; letter-spacing: 0; }
  .finale-step small { font-size: 9.5px; letter-spacing: 0; }
  .finale-stats { grid-template-columns: repeat(2, 1fr); }
  .finale-stat b { font-size: 20px; }
  .finale-letter { padding: 14px 13px 10px; }
  .finale-gift-grid { display: flex; flex-wrap: wrap; justify-content: center; }
  .finale-gift-chip { flex: 0 1 calc((100% - 12px) / 3); }
}
@media (prefers-reduced-motion: reduce) {
  .finale-overlay, .finale-card, .finale-heading, .finale-btn.pulse, .finale-gift-chip { animation: none; }
  .finale-embers { display: none; }
}
`;

function injectStyles() {
  if (document.getElementById('journeyFinaleStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'journeyFinaleStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CORNER_SVG = `<svg viewBox="0 0 46 46" fill="none" aria-hidden="true"><path d="M2 30 V8 Q2 2 8 2 H30" stroke="#C9923A" stroke-width="1.6"/><path d="M7 22 V11 Q7 7 11 7 H22" stroke="#E9B85A" stroke-width="1" opacity=".7"/><path d="M2 8 Q14 10 16 16 Q10 14 8 2" fill="#C9923A" opacity=".85"/><circle cx="16" cy="16" r="2.4" fill="#FFD9A0"/></svg>`;
const cornersHtml = () => ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="finale-corner ${c}">${CORNER_SVG}</span>`).join('');

function embersHtml() {
  let out = '';
  for (let i = 0; i < 24; i++) {
    out += `<span style="--x:${Math.random() * 100}%;--s:${3 + Math.random() * 5}px;--d:${7 + Math.random() * 7}s;--delay:${-Math.random() * 12}s;--drift:${(Math.random() - 0.5) * 120}px"></span>`;
  }
  return out;
}

function openOverlay(innerHtml, labelId) {
  injectStyles();
  const overlay = document.createElement('div');
  overlay.className = 'finale-overlay';
  overlay.innerHTML = `
    <div class="finale-embers">${embersHtml()}</div>
    <div class="finale-card" role="dialog" aria-modal="true" aria-labelledby="${labelId}">
      ${cornersHtml()}
      ${innerHtml}
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

// ---------- journey summary (exported for testing) ----------

/** Everything the pilgrimage screen shows, derived from the record. */
export function journeySummary(data) {
  const ranks = RANK_TIERS.map((t) => {
    const stars = getSeasonStars(t.seasonId, data);
    return { rank: t.rank, earned: stars.filter(Boolean).length, total: stars.length };
  });

  const start = Date.parse(data.createdAt || '');
  const end = Date.parse(data.apostleReflectionSubmittedAt || '') || Date.now();
  const days = Number.isFinite(start) ? Math.max(1, Math.ceil((end - start) / 86400000)) : null;

  const owned = data.ownedArtifacts || [];
  const vault = Object.keys(VAULT_GAMES).filter((id) => ((data.vaultGames || {})[id] || {}).completed).length;

  const chain = data.chosenLegendaryChain ? chainForTier5(data.chosenLegendaryChain) : null;
  let legendary;
  if (chain && owned.includes(chain.tier5Id)) {
    legendary = { state: 'forged', name: chain.tier5Name };
  } else if (chain && data.legendaryForgeStartedAt) {
    legendary = { state: 'forging', name: chain.tier5Name };
  } else if (chain && chain.chain.every((id) => owned.includes(id))) {
    legendary = { state: 'ready', name: chain.tier5Name };
  } else if (chain) {
    legendary = { state: 'pending', name: chain.tier5Name, have: chain.chain.filter((id) => owned.includes(id)).length };
  } else {
    legendary = { state: 'none' };
  }

  return {
    ranks, days, vault, vaultTotal: Object.keys(VAULT_GAMES).length,
    artifacts: Math.min(owned.length, TOTAL_ARTIFACTS),
    legendary,
    teacherName: data.teacherName || 'Your Teacher',
    firstName: String(data.name || '').trim().split(/\s+/)[0] || ''
  };
}

// ---------- 1. Your Pilgrimage Is Complete ----------

export function showJourneyComplete({ data, onSeen, gift = 0 }) {
  return new Promise((resolve) => {
    const s = journeySummary(data);
    const steps = s.ranks.map((r, i) => `
      ${i ? '<span class="finale-arrow" aria-hidden="true">➜</span>' : ''}
      <div class="finale-step${r.rank === 'Apostle' ? ' apostle' : ''}">
        <i aria-hidden="true">${RANK_ICON[r.rank] || '⭐'}</i>
        <b>${r.rank}</b>
        <small aria-label="${r.earned} of ${r.total} stars">★ ${r.earned}/${r.total}</small>
      </div>`).join('');

    let legendLine;
    if (s.legendary.state === 'forged') {
      legendLine = `⚔️ Legendary forged: <strong>${escapeHtml(s.legendary.name)}</strong>`;
    } else if (s.legendary.state === 'forging') {
      legendLine = `🔥 Your Legendary, <strong>${escapeHtml(s.legendary.name)}</strong>, is in the heart of the forge.`;
    } else if (s.legendary.state === 'ready') {
      legendLine = `⚒️ All four relics of <strong>${escapeHtml(s.legendary.name)}</strong> are yours. <strong>The forge awaits you next.</strong>`;
    } else if (s.legendary.state === 'pending') {
      legendLine = `⚒️ Your Legendary, <strong>${escapeHtml(s.legendary.name)}</strong>, awaits: ${s.legendary.have} of 4 chain artifacts gathered. Collect the rest and the forge will answer.`;
    } else {
      legendLine = '⚒️ One last quest remains: choose a Legendary in the Crafting hall and gather its four artifacts to forge it.';
    }

    const overlay = openOverlay(`
      <div class="finale-scroll">
        <div class="finale-banner"><img src="${CROWN_IMAGE}" alt=""></div>
        <div class="finale-pad">
          <p class="finale-kicker">✦ The Pilgrimage Is Complete ✦</p>
          <h2 class="finale-heading" id="finaleJourneyHeading">${s.firstName ? `Hail, Apostle ${escapeHtml(s.firstName)}!` : 'Hail, Apostle!'}</h2>
          <div class="finale-divider"><i></i></div>
          <p class="finale-text">From the first puzzle of the Prelim Season to the last word of your Final Reflection, <strong>you have walked the whole road.</strong> Every season is behind you, and the crown of the Apostle is yours.</p>

          <p class="finale-section-label">The road you walked</p>
          <div class="finale-path">${steps}</div>

          <div class="finale-stats">
            <div class="finale-stat"><b>${s.days ?? '—'}</b><span>Days on the journey</span></div>
            <div class="finale-stat"><b>4/4</b><span>Seasons completed</span></div>
            <div class="finale-stat"><b>${s.artifacts}</b><span>Artifacts collected</span></div>
            <div class="finale-stat"><b>${s.vault}/${s.vaultTotal}</b><span>Vault Games conquered</span></div>
          </div>
          <p class="finale-legend-line">${legendLine}</p>
          ${gift ? `
          <div class="finale-gift">
            <p class="finale-section-label">✦ Your Final Gift ✦</p>
            <p class="finale-gift-sub">For finishing the Final Season. Trade them for Unlock Tokens in the Ticket Trader.</p>
            <div class="finale-gift-grid">
              ${Object.values(TICKET_INFO).map((t, i) => `<div class="finale-gift-chip" style="--i:${i}"><i aria-hidden="true">${t.icon}</i><b>+${gift}</b><span>${escapeHtml(t.label)}</span></div>`).join('')}
            </div>
          </div>` : ''}

          <p class="finale-section-label">A word from your teacher</p>
          <div class="finale-letter">
            <p class="finale-salute">My dear Apostle,</p>
            ${FAREWELL.map((p) => `<p>${p}</p>`).join('')}
            <p class="finale-sign">— ${escapeHtml(s.teacherName)}</p>
          </div>
          <p class="finale-verse">“${VERSE.text}”<cite>${VERSE.ref}</cite></p>
        </div>
      </div>
      <div class="finale-foot">
        <button type="button" class="finale-btn ghost" data-act="cert">View My Certificate</button>
        <button type="button" class="finale-btn" data-act="close">Return to the Portal</button>
      </div>`, 'finaleJourneyHeading');

    const close = () => { overlay.remove(); if (onSeen) onSeen(); resolve(); };
    overlay.querySelector('[data-act="close"]').addEventListener('click', close);
    overlay.querySelector('[data-act="cert"]').addEventListener('click', async () => {
      // Let the "seen" save land before leaving the page (max 3 s), or
      // the navigation can cancel it and this screen would return.
      if (onSeen) await Promise.race([onSeen(), new Promise((r) => setTimeout(r, 3000))]);
      window.location.href = CERTIFICATE_URL;
    });
  });
}

// ---------- dashboard entry point ----------

function markSeen(email, field) {
  return updateDoc(doc(db, 'students', email), { [field]: true }).catch((err) => {
    console.error(`Failed to save ${field}:`, err);
  });
}

/** Grants the Final Gift once (re-checked on the live record, so two tabs
 *  can't both grant it). True if the student has it, now or before.
 *  dashboard.html calls it before drawing the ticket wallet. */
export async function awardFinalGift(email, data) {
  if (data.finalGiftGranted) return true;
  if (!data.apostleUnlocked) return false;
  try {
    const ref = doc(db, 'students', email);
    let has = false;
    let grantedNow = false;
    await runTransaction(db, async (tx) => {
      grantedNow = false;
      const live = (await tx.get(ref)).data() || {};
      has = !!live.finalGiftGranted;
      if (has || !live.apostleUnlocked) return;
      const updates = { finalGiftGranted: true };
      Object.keys(TICKET_INFO).forEach((ticket) => { updates[`tickets.${ticket}`] = increment(FINAL_GIFT_PER_TYPE); });
      tx.update(ref, updates);
      has = true;
      grantedNow = true;
    });
    if (grantedNow) {
      const tickets = { ...(data.tickets || {}) };
      Object.keys(TICKET_INFO).forEach((ticket) => { tickets[ticket] = (tickets[ticket] || 0) + FINAL_GIFT_PER_TYPE; });
      data.tickets = tickets;
    }
    if (has) data.finalGiftGranted = true;
    return has;
  } catch (err) {
    console.error('Failed to award the Final Gift:', err);
    return false;
  }
}

/** Resolves once whichever finale screens are due have been closed. */
export async function maybeShowFinale({ email, data, isAdmin }) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('previewJourney')) {
    await showJourneyComplete({ data: { ...data, apostleUnlocked: true }, gift: FINAL_GIFT_PER_TYPE });
  }
  if (isAdmin || !email || !data) return;

  if (data.apostleUnlocked) {
    const gifted = await awardFinalGift(email, data);
    if (!data.journeyCompleteSeen) {
      await showJourneyComplete({
        data,
        gift: gifted ? FINAL_GIFT_PER_TYPE : 0,
        onSeen: () => { data.journeyCompleteSeen = true; return markSeen(email, 'journeyCompleteSeen'); }
      });
    }
  }
  // Then the Legendary Forge, if the student qualifies (it no-ops otherwise,
  // or if legendaryCountdown.js already has it on screen).
  await runForgeGate({ email, name: data.name, data });
}
