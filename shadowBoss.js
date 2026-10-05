// ============================================
// THE SHADOW OF SIN — the Semifinal boss battle (Jornie, 2026-10-05).
// A game chapter that guards the Comprehensive Exam: no questions, no
// star, but it must be won (season.js awards the node on victory).
//
// Turn-based so it plays as well on a phone as on a laptop. Each turn
// the Shadow ANNOUNCES its next move, and the student answers:
//   ⚔ Strike      11–15 damage, +1 Holy Light charge (absorbed by a Veil)
//   🛡 Guard       take only a quarter of the next blow
//   🙏 Prayer      restore 30 Faith (2 per battle)
//   ✨ Holy Light  needs 3 charges: 34–40 damage and shatters any Veil
// The Shadow's moves: Claw, Dark Surge (big — guard it), Veil of Shadow
// (blocks your next two strikes), Whisper of Temptation (steals a charge).
// Below half health it enrages: harder hits, more surges.
// Losing costs nothing: "Rise Again" restarts the fight.
//
// playShadowBoss({ rewards }) -> Promise<'win' | 'quit'>
// ============================================

const BOSS_MAX = 140;
const FAITH_MAX = 100;
const LIGHT_NEEDED = 3;
const PRAYERS = 2;

const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const MOVES = {
  claw: { icon: '🗡️', name: 'Claw of Envy', tell: 'The Shadow raises its claws.' },
  surge: { icon: '☄️', name: 'Dark Surge', tell: 'Darkness gathers… a mighty blow is coming. Guard!' },
  veil: { icon: '🌫️', name: 'Veil of Shadow', tell: 'The Shadow wraps itself in a veil. Strikes will be absorbed.' },
  whisper: { icon: '🌀', name: 'Whisper of Temptation', tell: 'The Shadow whispers… it will try to steal your Light.' }
};

const CSS = `
@keyframes sbFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sbRise { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes sbFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes sbSmoke { 0% { transform: scale(.9) rotate(0deg); opacity: .55; } 50% { transform: scale(1.08) rotate(8deg); opacity: .8; } 100% { transform: scale(.9) rotate(0deg); opacity: .55; } }
@keyframes sbEyes { 0%, 92%, 100% { opacity: 1; } 95% { opacity: .1; } }
@keyframes sbHit { 0% { filter: brightness(3) saturate(0); transform: translateX(0); } 25% { transform: translateX(-10px); } 50% { transform: translateX(8px); } 75% { transform: translateX(-4px); } 100% { filter: none; transform: none; } }
@keyframes sbShake { 0%, 100% { transform: translate(0,0); } 20% { transform: translate(-7px,4px); } 40% { transform: translate(6px,-4px); } 60% { transform: translate(-4px,-2px); } 80% { transform: translate(3px,2px); } }
@keyframes sbHurt { 0% { opacity: 0; } 20% { opacity: .55; } 100% { opacity: 0; } }
@keyframes sbBeam { 0% { opacity: 0; transform: translateX(-50%) scaleY(0); } 30% { opacity: 1; transform: translateX(-50%) scaleY(1); } 100% { opacity: 0; transform: translateX(-50%) scaleY(1); } }
@keyframes sbNum { 0% { opacity: 0; transform: translate(-50%, 0) scale(.6); } 15% { opacity: 1; transform: translate(-50%, -14px) scale(1.15); } 100% { opacity: 0; transform: translate(-50%, -70px) scale(1); } }
@keyframes sbEmber { 0% { transform: translate(0,0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(var(--drift), -105vh); opacity: 0; } }
@keyframes sbVanish { 0% { opacity: 1; filter: none; transform: scale(1); } 40% { filter: brightness(4) saturate(0); } 100% { opacity: 0; filter: brightness(6) blur(8px); transform: scale(1.3) translateY(-20px); } }
@keyframes sbPulse { 0%, 100% { box-shadow: 0 0 0 1px #000, 0 0 12px rgba(255,210,110,.35); } 50% { box-shadow: 0 0 0 1px #000, 0 0 26px rgba(255,210,110,.85); } }

.sb-overlay {
  position: fixed; inset: 0; z-index: 10400;
  display: flex; align-items: center; justify-content: center;
  padding: 12px; box-sizing: border-box; overflow: hidden;
  background: radial-gradient(ellipse at 50% 30%, rgba(90,20,60,.55), transparent 60%), radial-gradient(ellipse at 50% 110%, rgba(150,40,10,.5), transparent 55%), #050307;
  font-family: 'Segoe UI', system-ui, sans-serif; color: #E8DCC4;
  animation: sbFade .4s ease;
}
.sb-embers { position: absolute; inset: 0; pointer-events: none; }
.sb-embers span { position: absolute; bottom: -10px; left: var(--x); width: var(--s); height: var(--s); border-radius: 50%; background: radial-gradient(circle, #FFB08A 0%, #C2185B 50%, rgba(120,0,60,0) 70%); animation: sbEmber var(--d) linear var(--delay) infinite; opacity: 0; }
.sb-hurt { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at center, transparent 30%, rgba(200,0,30,.75) 100%); }
.sb-hurt.go { animation: sbHurt .6s ease-out; }

.sb-card {
  position: relative; width: min(560px, 100%); max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
  background: linear-gradient(170deg, #17101A 0%, #0C080E 60%, #060407 100%);
  border: 1px solid #5A2A4A; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #0C080E, inset 0 0 0 5px rgba(201,146,58,.45), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.85), 0 0 90px rgba(194,24,91,.18);
  animation: sbRise .5s cubic-bezier(.2,.9,.3,1.1);
}
.sb-card.shake { animation: sbShake .4s ease; }
.sb-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px 4px; }
.sb-kicker { margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A; }
.sb-retreat, .sb-retreat:hover { margin: 0; padding: 5px 10px; border-radius: 3px; cursor: pointer; font: 600 11px 'Segoe UI', sans-serif; letter-spacing: 1px; text-transform: uppercase; color: #A89272; background: transparent; border: 1px solid #4A3820; }
.sb-retreat:hover { color: #FFE2A8; border-color: #8A6626; }
.sb-top-btns { display: flex; gap: 6px; }
/* How to Play — slides over the battle, which waits underneath. */
.sb-guide { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; background: rgba(8,5,10,.97); }
.sb-guide[hidden] { display: none; }
.sb-guide-scroll { flex: 1; overflow-y: auto; padding: 18px 18px 6px; scrollbar-width: thin; scrollbar-color: #6B4E1F transparent; }
.sb-guide h3 { margin: 0 0 10px; text-align: center; font-family: 'Cinzel', Georgia, serif; font-size: 20px; color: #FFE2A8; }
.sb-guide h4 { margin: 14px 0 6px; font-family: 'Cinzel', Georgia, serif; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #D98A4A; }
.sb-guide p, .sb-guide li { font-size: 13.5px; line-height: 1.55; color: #D6C8AE; }
.sb-guide p { margin: 0 0 6px; }
.sb-guide ul { margin: 0; padding-left: 18px; }
.sb-guide li { margin: 3px 0; }
.sb-guide b { color: #FFE2A8; }
.sb-guide .tip { margin-top: 12px; padding: 9px 11px; border-radius: 4px; background: rgba(233,184,90,.1); border: 1px solid rgba(233,184,90,.4); }
.sb-guide-foot { padding: 8px 18px 16px; }

/* Boss name + HP */
.sb-bossbar { padding: 4px 14px 0; }
.sb-name { display: flex; justify-content: space-between; align-items: baseline; margin: 0 0 4px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase; color: #F4C6D9; }
.sb-name small { font-family: 'Segoe UI', sans-serif; font-size: 12px; letter-spacing: 0; color: #C48AA6; }
.sb-bar { position: relative; height: 12px; border-radius: 2px; background: #1E0F18; border: 1px solid #5A2A4A; overflow: hidden; }
.sb-bar i { position: absolute; inset: 0 auto 0 0; width: 100%; background: linear-gradient(180deg, #E0457B, #8E1240); transition: width .45s ease; }
.sb-bar.faith i { background: linear-gradient(180deg, #F6D98A, #B8801F); }
.sb-phase { margin: 4px 0 0; font-size: 11.5px; color: #FF7A9A; font-style: italic; min-height: 15px; }

/* Arena */
.sb-arena { position: relative; height: 230px; flex-shrink: 0; }
.sb-boss { position: absolute; left: 50%; top: 18px; width: 190px; height: 190px; margin-left: -95px; animation: sbFloat 3.4s ease-in-out infinite; }
.sb-boss svg { display: block; width: 100%; height: 100%; overflow: visible; }
.sb-boss .smoke { transform-origin: 100px 120px; animation: sbSmoke 4s ease-in-out infinite; }
.sb-boss .eyes { animation: sbEyes 4.5s infinite; }
.sb-boss.hit svg { animation: sbHit .45s ease; }
.sb-boss.veiled svg { filter: drop-shadow(0 0 18px rgba(170,140,255,.85)) saturate(.5); }
.sb-boss.enraged .eyes circle { fill: #FF2D2D; }
.sb-boss.vanish { animation: sbVanish 1.6s ease-in forwards; }
.sb-intent {
  position: absolute; left: 50%; top: 4px; transform: translateX(-50%); z-index: 2;
  display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
  padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;
  color: #FFE2E9; background: rgba(60,10,30,.85); border: 1px solid #8E1240;
}
.sb-intent.danger { color: #fff; background: rgba(140,0,30,.9); border-color: #FF4D6D; box-shadow: 0 0 14px rgba(255,60,90,.6); }
.sb-beam { position: absolute; left: 50%; top: -20px; width: 70px; height: 260px; pointer-events: none; opacity: 0; transform-origin: 50% 0; background: linear-gradient(180deg, rgba(255,250,220,.95), rgba(255,210,110,.6) 60%, transparent); filter: blur(2px); }
.sb-beam.go { animation: sbBeam .8s ease-out; }
.sb-num { position: absolute; left: 50%; top: 90px; z-index: 3; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 30px; pointer-events: none; text-shadow: 0 2px 0 #000, 0 0 12px rgba(0,0,0,.8); animation: sbNum 1s ease-out forwards; }
.sb-num.dmg { color: #FFE2A8; }
.sb-num.big { color: #FFF6C8; font-size: 38px; }
.sb-num.block { color: #B9A6FF; font-size: 20px; }
.sb-num.you { top: 190px; color: #FF6B81; font-size: 24px; }
.sb-num.heal { top: 190px; color: #8BF0B0; font-size: 24px; }

/* Player */
.sb-player { padding: 0 14px; }
.sb-pips { display: flex; align-items: center; gap: 6px; margin: 7px 0 0; font-size: 12px; color: #A89272; }
.sb-pips i { width: 12px; height: 12px; transform: rotate(45deg); border: 1px solid #C9923A; }
.sb-pips i.on { background: #FFD45A; box-shadow: 0 0 10px rgba(255,200,90,.85); }
.sb-pips .sb-prayers { margin-left: auto; }
.sb-log { margin: 8px 0 0; min-height: 38px; font-size: 13.5px; line-height: 1.45; color: #D6C8AE; text-align: center; }
.sb-log strong { color: #FFE2A8; }

.sb-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 10px 14px 14px; }
.sb-btn, .sb-btn:hover {
  display: flex; flex-direction: column; align-items: center; gap: 1px; margin: 0; padding: 9px 6px; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;
  color: #FFE2A8; border-radius: 4px; border: 1px solid #6B4E1F;
  background: linear-gradient(180deg, #2A1E16 0%, #15100D 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 0 0 1px #000;
}
.sb-btn small { font-family: 'Segoe UI', sans-serif; font-weight: 400; font-size: 10.5px; letter-spacing: 0; text-transform: none; color: #A89272; }
.sb-btn:hover { border-color: #E9B85A; background: linear-gradient(180deg, #3A2A1A 0%, #1B140F 100%); }
.sb-btn:disabled, .sb-btn:disabled:hover { opacity: .4; cursor: default; border-color: #3A2E22; background: linear-gradient(180deg, #2A1E16 0%, #15100D 100%); }
.sb-btn.light:not(:disabled) { color: #2A1A05; border-color: #FFE7A8; background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%); animation: sbPulse 1.6s ease-in-out infinite; }
.sb-btn.light:not(:disabled) small { color: #4A3008; }
.sb-btn:focus-visible { outline: 2px solid #FFE7A8; outline-offset: 2px; }

/* Title / result screens */
.sb-screen { flex: 1 1 auto; min-height: 0; padding: 22px 22px 20px; text-align: center; overflow-y: auto; }
.sb-screen h2 { margin: 6px 0 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 26px; line-height: 1.2; color: #F4C6D9; text-shadow: 0 0 16px rgba(224,69,123,.45); }
.sb-screen.win h2 { color: #FFE2A8; text-shadow: 0 0 18px rgba(255,200,90,.5); }
.sb-screen p { margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #D6C8AE; }
.sb-how { margin: 14px 0 0; padding: 10px 12px; text-align: left; font-size: 13px; line-height: 1.55; color: #D6C8AE; background: rgba(0,0,0,.3); border: 1px solid rgba(201,146,58,.3); border-radius: 4px; }
.sb-how b { color: #FFE2A8; }
.sb-rewards { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 14px 0 0; }
.sb-rewards span { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #FFE2A8; background: rgba(233,184,90,.14); border: 1px solid rgba(233,184,90,.5); }
.sb-rewards img { width: 16px; height: 16px; }
.sb-go, .sb-go:hover {
  display: block; width: 100%; margin: 18px 0 0; padding: 13px 16px; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
}
.sb-go:hover { filter: brightness(1.1); }
.sb-go.ghost, .sb-go.ghost:hover { margin-top: 8px; color: #D6C8AE; font-size: 12.5px; background: rgba(255,255,255,.04); border-color: #4A3820; box-shadow: none; }
.sb-go:focus-visible { outline: 2px solid #FFE7A8; outline-offset: 3px; }

@media (max-width: 480px), (max-height: 680px) {
  .sb-arena { height: 190px; }
  .sb-boss { width: 156px; height: 156px; margin-left: -78px; top: 22px; }
  .sb-num.you, .sb-num.heal { top: 156px; }
  .sb-btn, .sb-btn:hover { padding: 7px 4px; font-size: 12.5px; }
  .sb-log { min-height: 34px; font-size: 13px; }
  .sb-screen h2 { font-size: 22px; }
}
/* Short screens (phones held sideways, small laptop windows): a compact
   arena and all four moves in one row, and the card scrolls if needed. */
.sb-card { overflow-y: auto; overflow-x: hidden; }
@media (max-height: 520px) {
  .sb-top { padding: 6px 12px 2px; }
  .sb-bossbar { padding-top: 0; }
  .sb-name { font-size: 12.5px; margin-bottom: 2px; }
  .sb-bar { height: 9px; }
  .sb-phase { min-height: 0; margin-top: 2px; font-size: 10.5px; }
  .sb-arena { height: 118px; }
  .sb-boss { width: 104px; height: 104px; margin-left: -52px; top: 16px; }
  .sb-intent { font-size: 11px; padding: 2px 8px; }
  .sb-num { top: 44px; font-size: 22px; }
  .sb-num.you, .sb-num.heal { top: 96px; font-size: 18px; }
  .sb-pips { margin-top: 4px; }
  .sb-log { min-height: 0; margin-top: 4px; font-size: 12px; }
  .sb-actions { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: 6px 12px 10px; }
  .sb-btn, .sb-btn:hover { padding: 6px 2px; font-size: 11px; letter-spacing: .3px; }
  .sb-btn small { display: none; }
  .sb-screen { padding: 14px 16px 12px; }
  .sb-screen h2 { font-size: 20px; }
  .sb-how { font-size: 12px; }
}
@media (max-width: 400px) {
  .sb-kicker { font-size: 10px; letter-spacing: 1.5px; white-space: nowrap; }
  .sb-retreat, .sb-retreat:hover { padding: 5px 7px; font-size: 10px; white-space: nowrap; }
}
@media (prefers-reduced-motion: reduce) {
  .sb-boss, .sb-boss .smoke, .sb-boss .eyes, .sb-btn.light:not(:disabled) { animation: none; }
  .sb-embers { display: none; }
}
`;

// A hooded wraith in smoke, drawn in SVG (no image assets needed).
const BOSS_SVG = `
<svg viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <radialGradient id="sbAura" cx="50%" cy="55%" r="50%"><stop offset="0%" stop-color="#C2185B" stop-opacity=".55"/><stop offset="100%" stop-color="#C2185B" stop-opacity="0"/></radialGradient>
    <linearGradient id="sbCloak" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2A1530"/><stop offset="100%" stop-color="#07030A"/></linearGradient>
    <radialGradient id="sbHood" cx="50%" cy="40%" r="55%"><stop offset="0%" stop-color="#000"/><stop offset="100%" stop-color="#1A0B1F"/></radialGradient>
  </defs>
  <circle cx="100" cy="110" r="95" fill="url(#sbAura)"/>
  <g class="smoke" fill="#1A0B1F" opacity=".7">
    <circle cx="55" cy="160" r="26"/><circle cx="145" cy="162" r="24"/><circle cx="100" cy="175" r="30"/><circle cx="75" cy="182" r="18"/><circle cx="128" cy="184" r="20"/>
  </g>
  <path d="M100 18 C 62 22, 44 60, 42 98 C 40 130, 30 150, 22 176 C 48 166, 60 178, 74 170 C 84 182, 100 172, 100 172 C 100 172, 116 182, 126 170 C 140 178, 152 166, 178 176 C 170 150, 160 130, 158 98 C 156 60, 138 22, 100 18 Z" fill="url(#sbCloak)" stroke="#5A2A4A" stroke-width="1.5"/>
  <path d="M70 34 C 58 22, 48 10, 34 4 C 44 18, 50 32, 60 46 Z M130 34 C 142 22, 152 10, 166 4 C 156 18, 150 32, 140 46 Z" fill="#1E0C22" stroke="#6E2A55" stroke-width="1.5"/>
  <path d="M100 32 C 74 36, 64 62, 66 90 C 70 108, 84 118, 100 118 C 116 118, 130 108, 134 90 C 136 62, 126 36, 100 32 Z" fill="url(#sbHood)"/>
  <path d="M42 112 C 28 118, 18 132, 12 150 C 24 142, 32 140, 40 142 Z M158 112 C 172 118, 182 132, 188 150 C 176 142, 168 140, 160 142 Z" fill="#12081A" stroke="#5A2A4A" stroke-width="1"/>
  <path d="M12 150 l-6 10 M16 151 l-2 12 M21 150 l2 11 M188 150 l6 10 M184 151 l2 12 M179 150 l-2 11" stroke="#8E1240" stroke-width="2.4" stroke-linecap="round"/>
  <g class="eyes">
    <polygon points="72,70 96,80 76,86" fill="#FF4D6D" opacity=".28" transform="translate(-2,-2) scale(1.04)"/>
    <polygon points="128,70 104,80 124,86" fill="#FF4D6D" opacity=".28" transform="translate(-6,-2) scale(1.04)"/>
    <polygon points="74,72 94,80 77,84" fill="#FF4D6D"/>
    <polygon points="126,72 106,80 123,84" fill="#FF4D6D"/>
    <circle cx="84" cy="80" r="1.8" fill="#FFE2E9"/><circle cx="116" cy="80" r="1.8" fill="#FFE2E9"/>
  </g>
  <path d="M80 98 L86 106 L91 99 L96 108 L100 100 L104 108 L109 99 L114 106 L120 98 L114 102 L100 104 L86 102 Z" fill="#3A0A1E" stroke="#B0204F" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`;

const GUIDE_HTML = `
  <div class="sb-guide-scroll">
    <h3>How to Play</h3>
    <p>Bring the Shadow of Sin's health to <b>0</b> before your <b>Faith</b> runs out. The battle is turn by turn: you choose one move, then the Shadow answers.</p>
    <h4>Your Moves</h4>
    <ul>
      <li><b>⚔ Strike</b>: deal 11–15 damage and gain <b>1 Holy Light</b> charge (up to 3).</li>
      <li><b>🛡 Guard</b>: take only a quarter of the Shadow's next blow.</li>
      <li><b>🙏 Prayer</b>: restore 30 Faith. You have <b>2 prayers</b> per battle.</li>
      <li><b>✨ Holy Light</b>: when all 3 diamonds glow, deal 34–40 damage. It also <b>shatters the Veil</b>.</li>
    </ul>
    <h4>The Shadow's Moves</h4>
    <p>The Shadow always shows its <b>next move</b> above its head. Read it before you choose!</p>
    <ul>
      <li><b>🗡️ Claw of Envy</b>: a normal hit (about 8–13 damage).</li>
      <li><b>☄️ Dark Surge</b>: a huge blow (22–30 damage). The label turns <b>red</b>. <b>Guard!</b></li>
      <li><b>🌫️ Veil of Shadow</b>: absorbs your next 2 Strikes. Break it with Holy Light, or strike through it.</li>
      <li><b>🌀 Whisper of Temptation</b>: steals one Holy Light charge and deals 4 damage.</li>
    </ul>
    <h4>Enraged</h4>
    <p>Below half health, the Shadow becomes <b>enraged</b>: its blows grow heavier and Dark Surges come more often.</p>
    <p class="tip">💡 <b>Winning strategy:</b> Guard every Dark Surge, pray when your Faith drops below half, and use Holy Light as soon as it is ready. If you fall, nothing is lost. Tap <b>Rise Again</b> and try as many times as you need.</p>
  </div>
  <div class="sb-guide-foot"><button type="button" class="sb-go" data-act="guide-close">Back to the Battle</button></div>`;

function injectStyles() {
  if (document.getElementById('shadowBossStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'shadowBossStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

function embersHtml() {
  let out = '';
  for (let i = 0; i < 22; i++) out += `<span style="--x:${Math.random() * 100}%;--s:${3 + Math.random() * 4}px;--d:${7 + Math.random() * 7}s;--delay:${-Math.random() * 12}s;--drift:${(Math.random() - 0.5) * 120}px"></span>`;
  return out;
}

/** Picks the Shadow's next move. Never two Surges in a row; enraged = more Surges. */
export function chooseBossMove(state) {
  if (state.turn === 1) return 'claw';
  const enraged = state.bossHp <= BOSS_MAX / 2;
  const pool = enraged
    ? [['claw', 3], ['surge', 4], ['veil', 2], ['whisper', 2]]
    : [['claw', 5], ['surge', 3], ['veil', 2], ['whisper', 2]];
  const options = pool.filter(([m]) => !(m === state.lastMove && (m === 'surge' || m === 'veil')) && !(m === 'veil' && state.veil > 0) && !(m === 'whisper' && state.light === 0));
  let roll = Math.random() * options.reduce((s, [, w]) => s + w, 0);
  for (const [m, w] of options) { roll -= w; if (roll <= 0) return m; }
  return 'claw';
}

/** Applies one full turn (player action, then the announced boss move). Pure, for testing. */
export function resolveTurn(state, action) {
  const s = { ...state };
  const events = [];
  // --- player ---
  s.guarding = false;
  if (action === 'strike') {
    if (s.veil > 0) { s.veil -= 1; events.push({ who: 'boss', type: 'block' }); }
    else { const d = rand(11, 15); s.bossHp = Math.max(0, s.bossHp - d); events.push({ who: 'boss', type: 'dmg', n: d }); }
    s.light = Math.min(LIGHT_NEEDED, s.light + 1);
  } else if (action === 'guard') {
    s.guarding = true;
    events.push({ who: 'you', type: 'guard' });
  } else if (action === 'pray' && s.prayers > 0) {
    s.prayers -= 1;
    const h = Math.min(30, FAITH_MAX - s.faith);
    s.faith += h;
    events.push({ who: 'you', type: 'heal', n: h });
  } else if (action === 'light' && s.light >= LIGHT_NEEDED) {
    s.light = 0;
    const hadVeil = s.veil > 0;
    s.veil = 0;
    const d = rand(34, 40);
    s.bossHp = Math.max(0, s.bossHp - d);
    events.push({ who: 'boss', type: 'light', n: d, shattered: hadVeil });
  }
  if (s.bossHp <= 0) return { state: s, events, outcome: 'win' };

  // --- the Shadow ---
  const enraged = s.bossHp <= BOSS_MAX / 2;
  const move = s.intent;
  let dmg = 0;
  if (move === 'claw') dmg = enraged ? rand(10, 13) : rand(8, 11);
  else if (move === 'surge') dmg = enraged ? rand(26, 30) : rand(22, 26);
  else if (move === 'whisper') { dmg = 4; if (s.light > 0) { s.light -= 1; events.push({ who: 'you', type: 'stolen' }); } }
  else if (move === 'veil') { s.veil = 2; events.push({ who: 'boss', type: 'veil' }); }
  if (dmg) {
    if (s.guarding) dmg = Math.ceil(dmg / 4);
    s.faith = Math.max(0, s.faith - dmg);
    events.push({ who: 'you', type: 'hurt', n: dmg, move, guarded: s.guarding });
  }
  s.lastMove = move;
  s.turn += 1;
  if (s.faith <= 0) return { state: s, events, outcome: 'lose' };
  s.intent = chooseBossMove(s);
  return { state: s, events, outcome: null };
}

export function newBattle() {
  const s = { bossHp: BOSS_MAX, faith: FAITH_MAX, light: 0, prayers: PRAYERS, veil: 0, guarding: false, turn: 1, lastMove: null };
  s.intent = chooseBossMove(s);
  return s;
}

/** Plays the battle. Resolves 'win' after the victory screen, or 'quit'. */
export function playShadowBoss({ rewards = [] } = {}) {
  return new Promise((resolve) => {
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'sb-overlay';
    overlay.innerHTML = `<div class="sb-embers">${embersHtml()}</div><div class="sb-hurt"></div><div class="sb-card" role="dialog" aria-modal="true" aria-label="Boss battle: The Shadow of Sin"></div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    const card = overlay.querySelector('.sb-card');

    const finish = (result) => {
      overlay.remove();
      document.documentElement.style.overflow = '';
      resolve(result);
    };

    // The How to Play guide slides over whatever screen is showing.
    const openGuide = (returnFocus) => {
      let guide = card.querySelector('.sb-guide');
      if (!guide) {
        guide = document.createElement('div');
        guide.className = 'sb-guide';
        guide.setAttribute('role', 'dialog');
        guide.setAttribute('aria-label', 'How to play');
        guide.innerHTML = GUIDE_HTML;
        card.appendChild(guide);
        guide.querySelector('[data-act="guide-close"]').onclick = () => {
          guide.hidden = true;
          if (returnFocus) returnFocus.focus({ preventScroll: true });
        };
      }
      guide.hidden = false;
      guide.querySelector('.sb-guide-scroll').scrollTop = 0;
      guide.querySelector('[data-act="guide-close"]').focus({ preventScroll: true });
    };

    const showTitle = () => {
      card.innerHTML = `
        <div class="sb-screen">
          <p class="sb-kicker">✦ Boss Battle ✦</p>
          <h2>The Shadow of Sin</h2>
          <p>Before the Comprehensive Exam, the Shadow of Sin bars your way. Drive it back with courage, wisdom, and grace.</p>
          <div class="sb-how">
            <b>⚔ Strike</b>: wound the Shadow and charge your Holy Light.<br>
            <b>🛡 Guard</b>: block most of the next blow. Use it when a <b>Dark Surge</b> is coming!<br>
            <b>🙏 Prayer</b>: restore your Faith (twice per battle).<br>
            <b>✨ Holy Light</b>: after 3 strikes, a mighty blow that also shatters the Shadow's Veil.<br>
            The Shadow always shows its next move. Read it, and answer wisely.
          </div>
          <button type="button" class="sb-go" data-act="begin">⚔ Face the Shadow</button>
          <button type="button" class="sb-go ghost" data-act="guide">❔ How to Play</button>
          <button type="button" class="sb-go ghost" data-act="quit">Not yet</button>
        </div>`;
      card.querySelector('[data-act="begin"]').onclick = () => fight();
      card.querySelector('[data-act="guide"]').onclick = (e) => openGuide(e.currentTarget);
      card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
      card.querySelector('[data-act="begin"]').focus({ preventScroll: true });
    };

    const fight = () => {
      let s = newBattle();
      let busy = false;
      card.innerHTML = `
        <div class="sb-top"><p class="sb-kicker">✦ Boss Battle ✦</p><div class="sb-top-btns"><button type="button" class="sb-retreat" data-act="guide">❔ Guide</button><button type="button" class="sb-retreat" data-act="retreat">Retreat</button></div></div>
        <div class="sb-bossbar">
          <p class="sb-name">The Shadow of Sin <small data-r="bossNum"></small></p>
          <div class="sb-bar"><i data-r="bossBar"></i></div>
          <p class="sb-phase" data-r="phase"></p>
        </div>
        <div class="sb-arena">
          <div class="sb-intent" data-r="intent"></div>
          <div class="sb-beam" data-r="beam"></div>
          <div class="sb-boss" data-r="boss">${BOSS_SVG}</div>
        </div>
        <div class="sb-player">
          <p class="sb-name" style="color:#FFE2A8">Your Faith <small data-r="faithNum"></small></p>
          <div class="sb-bar faith"><i data-r="faithBar"></i></div>
          <div class="sb-pips"><span>Holy Light</span><i></i><i></i><i></i><span class="sb-prayers" data-r="prayers"></span></div>
          <p class="sb-log" data-r="log" role="status" aria-live="polite"></p>
        </div>
        <div class="sb-actions">
          <button type="button" class="sb-btn" data-a="strike">⚔ Strike<small>11–15 damage, +1 Light</small></button>
          <button type="button" class="sb-btn" data-a="guard">🛡 Guard<small>block the next blow</small></button>
          <button type="button" class="sb-btn" data-a="pray">🙏 Prayer<small data-r="praySub">+30 Faith</small></button>
          <button type="button" class="sb-btn light" data-a="light">✨ Holy Light<small>34–40, breaks Veil</small></button>
        </div>`;
      const r = Object.fromEntries([...card.querySelectorAll('[data-r]')].map((el) => [el.dataset.r, el]));
      const pips = [...card.querySelectorAll('.sb-pips i')];
      const btns = Object.fromEntries([...card.querySelectorAll('[data-a]')].map((b) => [b.dataset.a, b]));
      card.querySelector('[data-act="retreat"]').onclick = () => { if (confirm('Retreat from the battle? You can face the Shadow again any time.')) finish('quit'); };
      card.querySelector('.sb-top [data-act="guide"]').onclick = (e) => openGuide(e.currentTarget);

      const draw = (logHtml) => {
        r.bossBar.style.width = `${(s.bossHp / BOSS_MAX) * 100}%`;
        r.bossNum.textContent = `${s.bossHp} / ${BOSS_MAX}`;
        r.faithBar.style.width = `${(s.faith / FAITH_MAX) * 100}%`;
        r.faithNum.textContent = `${s.faith} / ${FAITH_MAX}`;
        pips.forEach((p, i) => p.classList.toggle('on', i < s.light));
        r.prayers.textContent = `🙏 ${s.prayers} left`;
        const enraged = s.bossHp <= BOSS_MAX / 2;
        r.phase.textContent = enraged ? 'The Shadow is enraged — its blows grow heavier!' : (s.veil > 0 ? `Veil of Shadow: absorbs your next ${s.veil === 1 ? 'strike' : '2 strikes'}` : '');
        r.boss.classList.toggle('enraged', enraged);
        r.boss.classList.toggle('veiled', s.veil > 0);
        const m = MOVES[s.intent];
        r.intent.className = `sb-intent${s.intent === 'surge' ? ' danger' : ''}`;
        r.intent.textContent = `Next: ${m.icon} ${m.name}`;
        btns.pray.disabled = busy || s.prayers === 0 || s.faith >= FAITH_MAX;
        r.praySub.textContent = s.prayers ? `+30 Faith (${s.prayers} left)` : 'no prayers left';
        btns.light.disabled = busy || s.light < LIGHT_NEEDED;
        btns.strike.disabled = busy;
        btns.guard.disabled = busy;
        if (logHtml !== undefined) r.log.innerHTML = logHtml;
      };
      const num = (text, cls) => {
        const el = document.createElement('span');
        el.className = `sb-num ${cls}`;
        el.textContent = text;
        card.querySelector('.sb-arena').appendChild(el);
        setTimeout(() => el.remove(), 1000);
      };
      const retrigger = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

      const act = async (action) => {
        if (busy) return;
        busy = true;
        draw();
        const intentBefore = s.intent;
        const { state, events, outcome } = resolveTurn(s, action);
        const lines = [];
        // Player's half
        for (const e of events.filter((x) => x.who === 'boss' || x.type === 'guard' || x.type === 'heal')) {
          if (e.type === 'dmg') { retrigger(r.boss, 'hit'); num(`-${e.n}`, 'dmg'); lines.push(`You strike for <strong>${e.n}</strong>.`); }
          if (e.type === 'block') { num('Absorbed', 'block'); lines.push('Your strike sinks into the Veil of Shadow.'); }
          if (e.type === 'light') { retrigger(r.beam, 'go'); retrigger(r.boss, 'hit'); num(`-${e.n}`, 'big'); lines.push(`<strong>Holy Light!</strong> ${e.n} damage${e.shattered ? ', and the Veil shatters' : ''}.`); }
          if (e.type === 'guard') lines.push('You raise your shield of faith.');
          if (e.type === 'heal') { num(`+${e.n}`, 'heal'); lines.push(`You pray, and grace restores <strong>${e.n}</strong> Faith.`); }
        }
        // Show the moment after YOUR move, before the Shadow answers: the
        // final state with the Shadow's own effects undone.
        const hurtEv = events.find((e) => e.type === 'hurt');
        const stole = events.some((e) => e.type === 'stolen');
        const veilAfterYou = action === 'light' ? 0 : Math.max(0, s.veil - (action === 'strike' && s.veil > 0 ? 1 : 0));
        s = {
          ...state,
          faith: state.faith + (hurtEv ? hurtEv.n : 0),
          light: state.light + (stole ? 1 : 0),
          veil: veilAfterYou,
          intent: intentBefore
        };
        draw(lines.join(' '));
        await wait(750);

        if (outcome === 'win') { s = state; draw(); return victory(); }

        // The Shadow's half
        const m = MOVES[intentBefore];
        const hurt = events.find((e) => e.type === 'hurt');
        const enemyLine = [];
        if (intentBefore === 'veil') enemyLine.push('The Shadow cloaks itself in a <strong>Veil of Shadow</strong>.');
        if (hurt) {
          retrigger(card, 'shake');
          retrigger(overlay.querySelector('.sb-hurt'), 'go');
          num(`-${hurt.n}`, 'you');
          enemyLine.push(`${m.icon} <strong>${m.name}</strong> hits you for ${hurt.n}${hurt.guarded ? ' (guarded)' : ''}.`);
        }
        if (events.some((e) => e.type === 'stolen')) enemyLine.push('It steals one of your Holy Light charges!');
        s = state;
        busy = false;
        draw(enemyLine.join(' '));
        if (outcome === 'lose') { await wait(900); return defeat(); }
        btns.strike.focus({ preventScroll: true });
      };
      Object.entries(btns).forEach(([a, b]) => { b.onclick = () => act(a); });
      draw(`The Shadow of Sin rises before you. ${MOVES[s.intent].tell}`);
      btns.strike.focus({ preventScroll: true });

      const victory = async () => {
        busy = true;
        Object.values(btns).forEach((b) => { b.disabled = true; });
        r.intent.style.visibility = 'hidden';
        r.boss.classList.add('vanish');
        r.log.innerHTML = '<strong>The Shadow shrieks and dissolves into the light!</strong>';
        await wait(1700);
        card.innerHTML = `
          <div class="sb-screen win">
            <p class="sb-kicker">✦ Victory ✦</p>
            <h2>The Shadow Is Vanquished</h2>
            <p>"Where sin increased, grace abounded all the more." (Rom 5:20) The way to the Comprehensive Exam is open.</p>
            ${rewards.length ? `<div class="sb-rewards">${rewards.map((x) => `<span>${x}</span>`).join('')}</div>` : ''}
            <button type="button" class="sb-go" data-act="done">Claim Your Rewards</button>
          </div>`;
        const done = card.querySelector('[data-act="done"]');
        done.onclick = () => finish('win');
        done.focus({ preventScroll: true });
      };

      const defeat = () => {
        card.innerHTML = `
          <div class="sb-screen">
            <p class="sb-kicker">✦ Fallen ✦</p>
            <h2>The Shadow Prevails… for Now</h2>
            <p>Even the saints stumbled, but grace lifts the fallen. Rise, remember to <strong>Guard</strong> against the Dark Surge, and face it again.</p>
            <button type="button" class="sb-go" data-act="again">⚔ Rise Again</button>
            <button type="button" class="sb-go ghost" data-act="quit">Leave for now</button>
          </div>`;
        card.querySelector('[data-act="again"]').onclick = () => fight();
        card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
        card.querySelector('[data-act="again"]').focus({ preventScroll: true });
      };
    };

    showTitle();
  });
}
