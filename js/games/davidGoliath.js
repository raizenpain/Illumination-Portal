// ============================================
// DAVID AND GOLIATH — the Final Season's third game chapter (Jornie,
// 2026-10-05), after "A Kingdom United". No questions, no star; it must
// be cleared to continue (season.js awards the node on victory).
//
// In the Valley of Elah (1 Sam 17) David faces the giant with a sling and
// five smooth stones:
//   Sling!   release while the marker is inside the gold zone to strike
//            Goliath; outside it the stone only rings off his armor
//   Dodge    when Goliath raises his spear, step aside before it lands
//   Shield   while the shield-bearer holds the shield up, stones bounce off
// Goliath walks closer the whole time; every strike drives him back. Land
// five stones before he reaches David or David's Courage (3) runs out.
// Losing costs nothing: "Try Again".
//
// Logic (newDuel / stepDuel) is pure and exported for testing; drawing
// and input live in playDavidGoliath({ rewards }) -> Promise<'win' | 'quit'>.
// ============================================

export const STONES = 5;
export const COURAGE_MAX = 3;
const DIST_MAX = 100;
const STONE_FLIGHT = 0.32;
const SPEAR_FLIGHT = 0.32;
const MISS_STEP = 5;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- pure game logic ----------

export function newDuel() {
  return {
    t: 0, p: 0.1, dir: 1, hits: 0, courage: COURAGE_MAX, dist: DIST_MAX, stun: 0, reload: 0.6,
    stone: null, dodge: 0, thrown: 0,
    shield: { state: 'down', timer: 3 },
    spear: { state: 'idle', timer: 4.2, dodged: false },
    outcome: null, lostTo: null, events: []
  };
}

/** The gold zone on the timing bar: it drifts, and narrows with every strike. */
export const zoneOf = (s) => ({ c: 0.5 + 0.27 * Math.sin(s.t * 0.7 + s.hits * 1.3), w: 0.17 - 0.017 * s.hits });
export const markerSpeed = (s) => 0.95 + 0.16 * s.hits;

/** Advances the duel by dt seconds. input: { sling, dodge } (one-shot presses). */
export function stepDuel(s, dt, input = {}) {
  s.events = [];
  if (s.outcome) return s;
  s.t += dt;
  s.p += s.dir * markerSpeed(s) * dt;
  if (s.p >= 1) { s.p = 1; s.dir = -1; }
  if (s.p <= 0) { s.p = 0; s.dir = 1; }
  s.reload = Math.max(0, s.reload - dt);
  s.dodge = Math.max(0, s.dodge - dt);
  s.stun = Math.max(0, s.stun - dt);
  if (s.stun <= 0) s.dist -= (2.7 + 0.25 * s.hits) * dt;

  // The shield-bearer: down, a short warning as he lifts it, then up.
  const sh = s.shield;
  sh.timer -= dt;
  if (sh.timer <= 0) {
    if (sh.state === 'down') { sh.state = 'raising'; sh.timer = 0.5; }
    else if (sh.state === 'raising') { sh.state = 'up'; sh.timer = rand(1.2, 1.8) + 0.1 * s.hits; }
    else { sh.state = 'down'; sh.timer = rand(1.9, 3.1); }
  }

  const sp = s.spear;
  if (input.dodge && s.dodge <= 0) {
    s.dodge = 0.55;
    s.reload = Math.max(s.reload, 0.55);
    if (sp.state !== 'idle') sp.dodged = true;
    s.events.push({ type: 'dodge' });
  } else if (input.sling && s.reload <= 0 && s.dodge <= 0 && !s.stone) {
    const z = zoneOf(s);
    s.stone = { t: STONE_FLIGHT, good: Math.abs(s.p - z.c) < z.w / 2 };
    s.reload = 1.3;
    s.thrown += 1;
    s.events.push({ type: 'throw' });
  }

  if (s.stone) {
    s.stone.t -= dt;
    if (s.stone.t <= 0) {
      if (sh.state === 'up') { s.dist -= MISS_STEP; s.events.push({ type: 'blocked' }); }
      else if (s.stone.good) {
        s.hits += 1;
        s.dist = Math.min(DIST_MAX, s.dist + 12);
        s.stun = 1.3;
        s.events.push({ type: 'hit' });
        if (sp.state === 'windup') { sp.state = 'idle'; sp.timer = rand(2.2, 3.4); } // the blow spoils his throw
        if (s.hits >= STONES) { s.outcome = 'win'; s.stone = null; return s; }
      } else { s.dist -= MISS_STEP; s.events.push({ type: 'armor' }); } // a wasted stone lets him stride closer
      s.stone = null;
    }
  }

  // Goliath's spear: a clear wind-up, then the throw.
  if (sp.state !== 'idle' || s.stun <= 0) sp.timer -= dt;
  if (sp.timer <= 0) {
    if (sp.state === 'idle') { sp.state = 'windup'; sp.timer = 0.95; sp.dodged = false; s.events.push({ type: 'windup' }); }
    else if (sp.state === 'windup') { sp.state = 'flying'; sp.timer = SPEAR_FLIGHT; }
    else {
      sp.state = 'idle';
      sp.timer = rand(3.0, 4.6) - 0.3 * s.hits;
      if (sp.dodged) s.events.push({ type: 'missed' });
      else { s.courage -= 1; s.events.push({ type: 'speared' }); }
    }
  }

  if (s.courage <= 0) { s.courage = 0; s.outcome = 'lose'; s.lostTo = 'spear'; }
  else if (s.dist <= 0) { s.dist = 0; s.outcome = 'lose'; s.lostTo = 'reach'; }
  return s;
}

// ---------- presentation ----------

const CSS = `
@keyframes dgFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes dgRise { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
.dg-overlay {
  position: fixed; inset: 0; z-index: 10400; display: flex; align-items: center; justify-content: center;
  padding: 10px; box-sizing: border-box; overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, rgba(255,190,90,.22), transparent 55%), radial-gradient(ellipse at 50% 110%, rgba(110,50,20,.5), transparent 55%), #070504;
  font-family: 'Segoe UI', system-ui, sans-serif; color: #E8DCC4; animation: dgFade .4s ease;
}
.dg-card {
  position: relative; width: min(440px, 100%); max-height: calc(100vh - 20px); max-height: calc(100dvh - 20px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
  background: linear-gradient(170deg, #1B1410 0%, #0F0B09 60%, #080605 100%);
  border: 1px solid #5A4226; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #0B0806, inset 0 0 0 5px rgba(201,146,58,.45), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.85), 0 0 90px rgba(255,170,60,.14);
  animation: dgRise .5s cubic-bezier(.2,.9,.3,1.1);
}
.dg-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px 6px; }
.dg-kicker { margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A; }
.dg-top-btns { display: flex; gap: 6px; }
.dg-small, .dg-small:hover { margin: 0; padding: 5px 9px; border-radius: 3px; cursor: pointer; font: 600 11px 'Segoe UI', sans-serif; letter-spacing: .5px; text-transform: uppercase; color: #C9B79A; background: transparent; border: 1px solid #5A4226; }
.dg-small:hover { color: #FFF1D6; border-color: #C9923A; }
/* During the duel, the card takes the screen height (capped), and the
   canvas is sized by JS to the largest 360:560 box that fits the stage —
   so it fits short laptop windows and small phones alike. */
.dg-card.running { height: min(calc(100vh - 20px), 860px); height: min(calc(100dvh - 20px), 860px); }
.dg-stage { position: relative; flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 10px; overflow: hidden; }
.dg-stage canvas { display: block; border-radius: 4px; touch-action: none; background: #120D0A; border: 1px solid #3A2A18; }
.dg-pause { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(8,5,3,.72); font-family: 'Cinzel', Georgia, serif; font-size: 18px; color: #FFF1D6; cursor: pointer; }
.dg-pause[hidden] { display: none; }
.dg-pad { display: grid; grid-template-columns: 2fr 3fr; gap: 8px; padding: 10px 12px 12px; }
.dg-pad button, .dg-pad button:hover {
  margin: 0; padding: 14px 6px; cursor: pointer; border-radius: 6px; line-height: 1;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #FFF1D6; background: linear-gradient(180deg, #33261A, #1A130D); border: 1px solid #5A4226;
  -webkit-user-select: none; user-select: none; touch-action: none; -webkit-touch-callout: none;
}
.dg-pad button.sling, .dg-pad button.sling:hover { color: #2A1A05; border-color: #FFE7A8; background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%); }
.dg-pad button:active { filter: brightness(1.25); }
.dg-pad button:focus-visible, .dg-go:focus-visible, .dg-small:focus-visible { outline: 2px solid #FFD98A; outline-offset: 2px; }
.dg-screen { flex: 1 1 auto; min-height: 0; padding: 20px 20px 18px; text-align: center; overflow-y: auto; }
@media (max-height: 520px) { .dg-screen { padding: 12px 16px 12px; } .dg-screen h2 { font-size: 20px; } .dg-how { display: none; } .dg-go, .dg-go:hover { margin-top: 10px; padding: 10px 14px; } }
.dg-screen h2 { margin: 6px 0 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 25px; line-height: 1.2; color: #FFD9A0; text-shadow: 0 0 16px rgba(255,160,60,.45); }
.dg-screen.win h2 { color: #FFE9B8; text-shadow: 0 0 20px rgba(255,210,110,.6); }
.dg-screen p { margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #D6C8AE; }
.dg-how { margin: 14px 0 0; padding: 10px 12px; text-align: left; font-size: 13px; line-height: 1.55; color: #D6C8AE; background: rgba(0,0,0,.3); border: 1px solid rgba(201,146,58,.35); border-radius: 4px; }
.dg-how b { color: #FFE2A8; }
.dg-rewards { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 14px 0 0; }
.dg-rewards span { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #FFE2A8; background: rgba(233,184,90,.14); border: 1px solid rgba(233,184,90,.5); }
.dg-rewards img { width: 16px; height: 16px; }
.dg-go, .dg-go:hover {
  display: block; width: 100%; margin: 16px 0 0; padding: 13px 16px; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
}
.dg-go:hover { filter: brightness(1.1); }
.dg-go.ghost, .dg-go.ghost:hover { margin-top: 8px; color: #D6C8AE; font-size: 12.5px; background: rgba(255,255,255,.04); border-color: #5A4226; box-shadow: none; }
.dg-guide { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; background: #0A0705; }
.dg-guide[hidden] { display: none; }
.dg-guide-scroll { flex: 1; overflow-y: auto; padding: 18px 18px 6px; }
.dg-guide h3 { margin: 0 0 10px; text-align: center; font-family: 'Cinzel', Georgia, serif; font-size: 20px; color: #FFE2A8; }
.dg-guide h4 { margin: 14px 0 6px; font-family: 'Cinzel', Georgia, serif; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #E0A050; }
.dg-guide p, .dg-guide li { font-size: 13.5px; line-height: 1.55; color: #D6C8AE; }
.dg-guide p { margin: 0 0 6px; }
.dg-guide ul { margin: 0; padding-left: 18px; }
.dg-guide b { color: #FFE2A8; }
.dg-guide .tip { margin-top: 12px; padding: 9px 11px; border-radius: 4px; background: rgba(233,184,90,.1); border: 1px solid rgba(233,184,90,.4); }
.dg-guide-foot { padding: 8px 18px 16px; }
@media (max-height: 700px) { .dg-pad button, .dg-pad button:hover { padding: 10px 6px; } .dg-top { padding: 7px 10px 4px; } .dg-pad { padding: 7px 10px 9px; } }
/* A phone held sideways (.wide, set by JS): the controls move to the sides
   of the canvas and Guide / Leave to the corner, so the canvas gets the
   card's full height. */
.dg-card.running.wide { width: min(820px, 100%); display: grid; grid-template-columns: minmax(104px, 1fr) minmax(0, 2fr) minmax(104px, 1fr); grid-template-rows: auto minmax(0, 1fr); }
.dg-card.wide .dg-top { grid-column: 1; grid-row: 1; justify-content: center; padding: 8px 8px 6px; }
.dg-card.wide .dg-kicker { display: none; }
.dg-card.wide .dg-top-btns { flex-wrap: wrap; justify-content: center; }
.dg-card.wide .dg-small, .dg-card.wide .dg-small:hover { padding: 5px 6px; font-size: 10px; white-space: nowrap; }
.dg-card.wide .dg-stage { grid-column: 2; grid-row: 1 / 3; padding: 0; margin: 8px 0; }
.dg-card.wide .dg-pad { display: contents; }
.dg-card.wide .dg-pad button, .dg-card.wide .dg-pad button:hover { margin: 0 8px 8px; padding: 6px 2px; line-height: 1.3; }
.dg-card.wide .dg-pad button[data-do="dodge"] { grid-column: 1; grid-row: 2; }
.dg-card.wide .dg-pad button[data-do="sling"] { grid-column: 3; grid-row: 1 / 3; margin-top: 8px; }
@media (max-width: 400px) {
  .dg-kicker { font-size: 10px; letter-spacing: 1.5px; white-space: nowrap; }
  .dg-small, .dg-small:hover { padding: 5px 7px; font-size: 10px; white-space: nowrap; }
}
`;

const GUIDE_HTML = `
  <div class="dg-guide-scroll">
    <h3>How to Play</h3>
    <p>The giant Goliath is walking toward you. You have a sling and <b>five smooth stones</b>. Strike him five times before he reaches you.</p>
    <h4>The Sling</h4>
    <ul>
      <li>A marker slides back and forth along the bar at the bottom.</li>
      <li>Tap <b>Sling!</b> (or press <b>Space</b>, or tap the battlefield) while the marker is inside the <b>gold zone</b>. That stone strikes Goliath and drives him back.</li>
      <li>Outside the gold zone, the stone only rings off his armor.</li>
      <li>After every strike the gold zone gets smaller and the marker faster.</li>
    </ul>
    <h4>Goliath Fights Back</h4>
    <ul>
      <li><b>Spear</b>: when Goliath raises his spear and <b>DODGE!</b> appears, tap <b>Dodge</b> (or press <b>↓</b> or <b>D</b>). If the spear lands, you lose one Courage.</li>
      <li><b>Shield</b>: when his shield-bearer lifts the shield, stones bounce off. Wait until it comes down.</li>
      <li><b>He keeps coming</b>: the Goliath bar shows how close he is. If it fills, he has reached you.</li>
    </ul>
    <h4>Courage</h4>
    <p>You have <b>3 Courage</b>. Each spear that lands costs one.</p>
    <p class="tip">💡 <b>Tip:</b> Do not throw wildly. Watch the marker, wait for the gold, and dodge first when the spear goes up. If you fall, nothing is lost: tap <b>Try Again</b>.</p>
  </div>
  <div class="dg-guide-foot"><button type="button" class="dg-go" data-act="guide-close">Back to the Valley</button></div>`;

function injectStyles() {
  if (document.getElementById('davidGoliathStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'davidGoliathStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

// Canvas layout (logical units; scaled for the device).
const CW = 360;
const CH = 560;
const DAVID_X = 76;
const DAVID_FOOT = 428;
const BAR_X = 28;
const BAR_W = CW - 56;
const BAR_Y = 492;

// Where Goliath stands, by how close he has come (k: 0 far … 1 upon David).
function goliathPose(s) {
  const k = 1 - s.dist / DIST_MAX;
  return { x: 282 - 96 * k, foot: 332 + 76 * k, sc: 0.8 + 0.55 * k };
}

function drawDavid(ctx, s, view) {
  const t = view.time;
  const dodging = s.dodge > 0;
  const x = DAVID_X - (dodging ? 26 * Math.sin((s.dodge / 0.55) * Math.PI) : 0);
  const y = DAVID_FOOT;
  ctx.save();
  ctx.translate(x, y);
  if (dodging) ctx.scale(1, 0.82);
  // legs
  ctx.strokeStyle = '#C99A6A'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -14); ctx.lineTo(-6, 0); ctx.moveTo(4, -14); ctx.lineTo(7, 0); ctx.stroke();
  // tunic
  ctx.fillStyle = '#B8573A';
  ctx.beginPath(); ctx.moveTo(-8, -36); ctx.lineTo(8, -36); ctx.lineTo(10, -12); ctx.lineTo(-10, -12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#E9D9B4';
  ctx.fillRect(-9, -24, 18, 3);
  // shepherd's bag
  ctx.fillStyle = '#7A5A34';
  ctx.beginPath(); ctx.ellipse(-9, -18, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = '#E7C9A0';
  ctx.beginPath(); ctx.arc(0, -43, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7A3E1C';
  ctx.beginPath(); ctx.arc(0, -45, 6.8, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  // sling arm + whirling sling (in step with the marker)
  const hx = 9; const hy = -42;
  ctx.strokeStyle = '#E7C9A0'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(6, -33); ctx.lineTo(hx, hy); ctx.stroke();
  if (!s.stone && !dodging && !view.over) {
    const a = t * (9 + s.hits * 1.5);
    const sx = hx + Math.cos(a) * 17; const sy = hy - 6 + Math.sin(a) * 9;
    ctx.strokeStyle = '#D9C39A'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.strokeStyle = 'rgba(217,195,154,.25)';
    ctx.beginPath(); ctx.ellipse(hx, hy - 6, 17, 9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = s.reload > 0 ? '#8A8378' : '#F2EEE6';
    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  return { hx: x + 9, hy: y - 48 };
}

function drawGoliath(ctx, s, view, pose) {
  const { x, foot, sc } = pose;
  const t = view.time;
  ctx.save();
  ctx.translate(x, foot);
  ctx.scale(sc, sc);
  if (view.fall > 0) ctx.rotate(Math.min(1, view.fall) * 1.45);
  else if (s.stun > 0) ctx.rotate(Math.sin(s.stun * 9) * 0.05 + 0.07);
  else ctx.translate(0, Math.abs(Math.sin(t * 3.2)) * -2); // his heavy stride
  // legs with greaves
  ctx.fillStyle = '#3A2A1E';
  ctx.fillRect(-17, -52, 13, 52); ctx.fillRect(4, -52, 13, 52);
  ctx.fillStyle = '#A9783A';
  ctx.fillRect(-18, -30, 15, 24); ctx.fillRect(3, -30, 15, 24);
  // coat of mail
  const mail = ctx.createLinearGradient(-26, -118, 26, -50);
  mail.addColorStop(0, '#C89A4E'); mail.addColorStop(.5, '#8A6230'); mail.addColorStop(1, '#5A3E1E');
  ctx.fillStyle = mail;
  ctx.beginPath(); ctx.moveTo(-27, -116); ctx.lineTo(27, -116); ctx.lineTo(22, -48); ctx.lineTo(-22, -48); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,24,10,.5)'; ctx.lineWidth = 1;
  for (let yy = -108; yy < -50; yy += 8) { ctx.beginPath(); ctx.moveTo(-25, yy); ctx.lineTo(25, yy); ctx.stroke(); }
  ctx.fillStyle = '#4A2E18'; ctx.fillRect(-23, -62, 46, 7);
  // shield arm
  ctx.fillStyle = '#B58A5E';
  ctx.fillRect(-36, -112, 11, 40);
  // head, beard, bronze helmet
  ctx.fillStyle = '#C9A078';
  ctx.beginPath(); ctx.arc(0, -132, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2A1A10';
  ctx.beginPath(); ctx.moveTo(-13, -128); ctx.lineTo(13, -128); ctx.lineTo(7, -110); ctx.lineTo(-7, -110); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#B5863C';
  ctx.beginPath(); ctx.arc(0, -137, 16, Math.PI, 0); ctx.fill();
  ctx.fillRect(-17, -138, 34, 4);
  ctx.fillStyle = '#7A1E1E';
  ctx.beginPath(); ctx.moveTo(-3, -153); ctx.lineTo(3, -153); ctx.lineTo(8, -166); ctx.lineTo(-8, -166); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FF4A3A';
  ctx.fillRect(-8, -132, 4, 2.5); ctx.fillRect(4, -132, 4, 2.5);
  // the mark: his unguarded forehead
  if (!view.over) {
    ctx.strokeStyle = `rgba(255,226,140,${0.55 + 0.35 * Math.sin(t * 6)})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -135, 5, 0, Math.PI * 2); ctx.stroke();
  }
  // spear arm
  const wind = s.spear.state === 'windup';
  const thrown = s.spear.state === 'flying';
  ctx.save();
  ctx.translate(27, -110);
  ctx.rotate(wind ? -2.3 + Math.sin(t * 30) * 0.03 : (thrown ? -0.9 : 0.12));
  ctx.fillStyle = '#B58A5E';
  ctx.fillRect(-5, 0, 11, 40);
  if (!thrown) {
    ctx.strokeStyle = '#5A3E22'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(wind ? -58 : 0, wind ? 38 : -62); ctx.moveTo(0, 38); ctx.lineTo(wind ? 40 : 0, wind ? 38 : 70); ctx.stroke();
    ctx.fillStyle = '#C9CED6';
    ctx.beginPath();
    if (wind) { ctx.moveTo(-58, 32); ctx.lineTo(-76, 38); ctx.lineTo(-58, 44); } else { ctx.moveTo(-6, -62); ctx.lineTo(0, -80); ctx.lineTo(6, -62); }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  return { headX: x, headY: foot - 135 * sc, handX: x + 27 * sc, handY: foot - 110 * sc };
}

function drawShieldBearer(ctx, s, view, pose) {
  const { x, foot, sc } = pose;
  const lift = view.lift; // 0 down … 1 up
  ctx.save();
  ctx.translate(x - 46 * sc, foot + 4);
  ctx.scale(sc, sc);
  // the bearer
  ctx.fillStyle = '#2E241C';
  ctx.fillRect(-7, -30, 6, 30); ctx.fillRect(2, -30, 6, 30);
  ctx.fillStyle = '#5C4A3A';
  ctx.fillRect(-9, -62, 19, 34);
  ctx.fillStyle = '#B58A5E';
  ctx.beginPath(); ctx.arc(0, -70, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8A6A3A';
  ctx.beginPath(); ctx.arc(0, -73, 8.5, Math.PI, 0); ctx.fill();
  // the great shield: at his side when down, held high across Goliath when up
  const sx = 4 + 34 * lift; const sy = -44 - 62 * lift;
  ctx.translate(sx, sy);
  const g = ctx.createLinearGradient(-26, 0, 26, 0);
  g.addColorStop(0, '#6E4E22'); g.addColorStop(.5, '#D2A254'); g.addColorStop(1, '#6E4E22');
  ctx.fillStyle = g; ctx.strokeStyle = '#2E1E0C'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 27, 46, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F0CE86';
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(46,30,12,.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 18, 34, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function render(ctx, s, view) {
  const t = view.time;
  // Sky over the Valley of Elah.
  const sky = ctx.createLinearGradient(0, 0, 0, 320);
  sky.addColorStop(0, '#2B2440'); sky.addColorStop(.6, '#8A4E3A'); sky.addColorStop(1, '#E0A25A');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, 320);
  ctx.fillStyle = 'rgba(255,220,150,.9)';
  ctx.beginPath(); ctx.arc(250, 262, 26, 0, Math.PI * 2); ctx.fill();
  // The two hills with the armies watching (1 Sam 17:3).
  ctx.fillStyle = '#3E2C24';
  ctx.beginPath(); ctx.moveTo(0, 300); ctx.quadraticCurveTo(60, 196, 150, 290); ctx.lineTo(150, 330); ctx.lineTo(0, 330); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#33221C';
  ctx.beginPath(); ctx.moveTo(190, 300); ctx.quadraticCurveTo(290, 180, CW, 262); ctx.lineTo(CW, 330); ctx.lineTo(190, 330); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(20,12,8,.8)';
  for (let i = 0; i < 9; i++) { const x = 16 + i * 13; const y = 286 - Math.sin((x / 150) * Math.PI) * 44; ctx.fillRect(x, y - 8, 3, 9); }
  for (let i = 0; i < 11; i++) { const x = 214 + i * 13; const y = 292 - Math.sin(((x - 190) / 190) * Math.PI) * 56; ctx.fillRect(x, y - 8, 3, 9); ctx.fillRect(x + 1, y - 15, 1, 7); }
  // The valley floor.
  const ground = ctx.createLinearGradient(0, 300, 0, 450);
  ground.addColorStop(0, '#8A6A3E'); ground.addColorStop(1, '#4A3620');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 300, CW, 150);
  ctx.strokeStyle = 'rgba(160,200,230,.35)'; ctx.lineWidth = 5; // the brook
  ctx.beginPath(); ctx.moveTo(0, 442); ctx.quadraticCurveTo(90, 430, 180, 444); ctx.quadraticCurveTo(270, 456, CW, 440); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  for (let i = 0; i < 14; i++) ctx.fillRect((i * 67) % CW, 312 + ((i * 41) % 120), 14, 2);

  const pose = goliathPose(s);
  // shadows
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(pose.x, pose.foot + 3, 34 * pose.sc, 7 * pose.sc, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(DAVID_X, DAVID_FOOT + 3, 14, 4, 0, 0, Math.PI * 2); ctx.fill();

  const g = drawGoliath(ctx, s, view, pose);
  if (view.fall <= 0) drawShieldBearer(ctx, s, view, pose);
  const d = drawDavid(ctx, s, view);

  // Stone in flight.
  if (s.stone) {
    const k = clamp(1 - s.stone.t / STONE_FLIGHT, 0, 1);
    const x = d.hx + (g.headX - d.hx) * k; const y = d.hy + (g.headY - d.hy) * k - Math.sin(k * Math.PI) * 26;
    ctx.fillStyle = '#F2EEE6';
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(242,238,230,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 14, y + 5); ctx.stroke();
  }
  // Spear in flight.
  if (s.spear.state === 'flying') {
    const k = clamp(1 - s.spear.timer / SPEAR_FLIGHT, 0, 1);
    const x = g.handX + (DAVID_X + 4 - g.handX) * k; const y = g.handY + (DAVID_FOOT - 30 - g.handY) * k;
    const a = Math.atan2(DAVID_FOOT - 30 - g.handY, DAVID_X + 4 - g.handX);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = '#5A3E22'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = '#D6DCE4';
    ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(24, 0); ctx.lineTo(8, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Flash where the last stone landed.
  if (view.flashT > 0) {
    const a = Math.min(1, view.flashT * 3);
    ctx.fillStyle = view.flash === 'hit' ? `rgba(255,236,170,${a})` : `rgba(200,210,225,${a * 0.8})`;
    ctx.beginPath(); ctx.arc(g.headX, g.headY, (view.flash === 'hit' ? 26 : 14) * pose.sc, 0, Math.PI * 2); ctx.fill();
  }
  // Calls to act.
  if (s.spear.state === 'windup' && Math.floor(t * 8) % 2 === 0) {
    ctx.textAlign = 'center';
    ctx.font = '700 22px Cinzel, Georgia, serif';
    ctx.fillStyle = '#FF6B5A';
    ctx.fillText('DODGE!', DAVID_X + 22, DAVID_FOOT - 72);
  }

  // The sling's timing bar.
  ctx.fillStyle = 'rgba(8,5,3,.82)';
  ctx.fillRect(0, 452, CW, CH - 452);
  const blocked = s.shield.state === 'up';
  const warn = s.shield.state === 'raising';
  ctx.textAlign = 'center';
  ctx.font = '700 11px Cinzel, Georgia, serif';
  ctx.fillStyle = blocked ? '#FF8A7A' : (warn ? '#FFC46B' : '#FFE2A8');
  ctx.fillText(blocked ? 'SHIELD UP — WAIT' : (warn ? 'THE SHIELD IS RISING…' : 'RELEASE IN THE GOLD'), CW / 2, 478);
  ctx.fillStyle = '#2A2018';
  ctx.fillRect(BAR_X, BAR_Y, BAR_W, 22);
  ctx.fillStyle = 'rgba(169,120,58,.35)'; // armor
  ctx.fillRect(BAR_X, BAR_Y, BAR_W, 22);
  const z = zoneOf(s);
  const zx = BAR_X + (z.c - z.w / 2) * BAR_W;
  const zg = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + 22);
  zg.addColorStop(0, blocked ? '#6A6258' : '#FFE9A8'); zg.addColorStop(1, blocked ? '#3E3A34' : '#D9A441');
  ctx.fillStyle = zg;
  ctx.fillRect(zx, BAR_Y, z.w * BAR_W, 22);
  ctx.strokeStyle = '#5A4226'; ctx.lineWidth = 1.5;
  ctx.strokeRect(BAR_X + 0.5, BAR_Y + 0.5, BAR_W - 1, 21);
  const mx = BAR_X + s.p * BAR_W;
  ctx.fillStyle = s.reload > 0 || s.dodge > 0 ? '#8A8378' : '#FFFFFF';
  ctx.fillRect(mx - 2, BAR_Y - 5, 4, 32);
  ctx.beginPath(); ctx.moveTo(mx - 7, BAR_Y - 9); ctx.lineTo(mx + 7, BAR_Y - 9); ctx.lineTo(mx, BAR_Y - 1); ctx.closePath(); ctx.fill();
  ctx.font = '600 10.5px Segoe UI, sans-serif';
  ctx.fillStyle = '#B3A489';
  ctx.fillText('gold = his forehead · brown = his armor', CW / 2, 540);

  // HUD: stones landed, courage, how close Goliath is.
  ctx.fillStyle = 'rgba(8,5,3,.74)';
  ctx.fillRect(0, 0, CW, 46);
  ctx.textAlign = 'left';
  ctx.font = '700 11px Cinzel, Georgia, serif';
  ctx.fillStyle = '#FFE2A8';
  ctx.fillText(`STONES  ${s.hits} / ${STONES}`, 10, 15);
  for (let i = 0; i < STONES; i++) {
    ctx.fillStyle = i < s.hits ? '#F2EEE6' : '#3A2E22';
    ctx.beginPath(); ctx.ellipse(17 + i * 19, 27, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = s.dist < 30 ? '#FF6B81' : '#FFE2A8';
  ctx.fillText('GOLIATH', CW - 10, 15);
  ctx.fillStyle = '#2A2018'; ctx.fillRect(CW - 150, 20, 140, 7);
  ctx.fillStyle = s.dist < 30 ? '#FF4D6D' : '#C4623A'; ctx.fillRect(CW - 150, 20, 140 * (1 - s.dist / DIST_MAX), 7);
  ctx.font = '600 11px Segoe UI, sans-serif';
  ctx.fillStyle = '#D6C8AE';
  ctx.fillText(`Courage: ${'♥'.repeat(s.courage)}${'♡'.repeat(COURAGE_MAX - s.courage)}`, CW - 10, 41);
  if (view.msg && view.msgT > 0) {
    ctx.textAlign = 'center';
    ctx.font = '700 16px Cinzel, Georgia, serif';
    ctx.fillStyle = `rgba(255,236,190,${Math.min(1, view.msgT)})`;
    ctx.fillText(view.msg, CW / 2, 80);
  }
}

/** Plays the duel. Resolves 'win' after the victory screen, or 'quit'. */
export function playDavidGoliath({ rewards = [] } = {}) {
  return new Promise((resolve) => {
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'dg-overlay';
    overlay.innerHTML = `<div class="dg-card" role="dialog" aria-modal="true" aria-label="David and Goliath"></div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    const card = overlay.querySelector('.dg-card');
    let stopLoop = () => {};

    const finish = (result) => {
      stopLoop();
      overlay.remove();
      document.documentElement.style.overflow = '';
      resolve(result);
    };

    const openGuide = (returnFocus, onClose) => {
      let guide = card.querySelector('.dg-guide');
      if (!guide) {
        guide = document.createElement('div');
        guide.className = 'dg-guide';
        guide.setAttribute('role', 'dialog');
        guide.setAttribute('aria-label', 'How to play');
        guide.innerHTML = GUIDE_HTML;
        card.appendChild(guide);
      }
      guide.querySelector('[data-act="guide-close"]').onclick = () => {
        guide.hidden = true;
        if (returnFocus) returnFocus.focus({ preventScroll: true });
        if (onClose) onClose();
      };
      guide.hidden = false;
      guide.querySelector('.dg-guide-scroll').scrollTop = 0;
      guide.querySelector('[data-act="guide-close"]').focus({ preventScroll: true });
    };

    const showTitle = () => {
      card.innerHTML = `
        <div class="dg-screen">
          <p class="dg-kicker">✦ The Valley of Elah ✦</p>
          <h2>David and Goliath</h2>
          <p>"You come against me with sword and spear and scimitar, but I come against you in the name of the LORD of hosts" (1 Sam 17:45). The giant is coming. You have a sling and five smooth stones.</p>
          <div class="dg-how">
            Tap <b>Sling!</b> while the marker is in the <b>gold zone</b>.<br>
            <b>Brown</b> is his armor: the stone just bounces off.<br>
            <b>DODGE!</b> appears when he raises his spear. Tap <b>Dodge</b>.<br>
            <b>Shield up</b>: stones are blocked. Wait for it to drop.<br>
            Land <b>five stones</b> before Goliath reaches you.
          </div>
          <button type="button" class="dg-go" data-act="begin">🪨 Face the Giant</button>
          <button type="button" class="dg-go ghost" data-act="guide">❔ How to Play</button>
          <button type="button" class="dg-go ghost" data-act="quit">Not yet</button>
        </div>`;
      card.querySelector('[data-act="begin"]').onclick = () => run();
      card.querySelector('[data-act="guide"]').onclick = (e) => openGuide(e.currentTarget);
      card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
      card.querySelector('[data-act="begin"]').focus({ preventScroll: true });
    };

    const run = () => {
      card.innerHTML = `
        <div class="dg-top"><p class="dg-kicker">✦ Valley of Elah ✦</p><div class="dg-top-btns"><button type="button" class="dg-small" data-act="guide">❔ Guide</button><button type="button" class="dg-small" data-act="retreat">Retreat</button></div></div>
        <div class="dg-stage"><canvas width="${CW}" height="${CH}" aria-label="David facing Goliath in the Valley of Elah"></canvas><div class="dg-pause" hidden>Paused — tap to continue</div></div>
        <div class="dg-pad"><button type="button" data-do="dodge">Dodge</button><button type="button" class="sling" data-do="sling">Sling!</button></div>`;
      card.classList.add('running');
      const canvas = card.querySelector('canvas');
      const pauseEl = card.querySelector('.dg-pause');
      // Largest 360:560 canvas that fits the space the stage really has.
      const stage = card.querySelector('.dg-stage');
      const fit = () => {
        // A phone held sideways gets the side-by-side layout (.wide in the CSS).
        const wide = window.innerHeight < 520 && window.innerWidth > window.innerHeight * 1.2;
        card.classList.toggle('wide', wide);
        const r = stage.getBoundingClientRect();
        const scale = Math.max(0.3, Math.min((r.width - (wide ? 0 : 20)) / CW, r.height / CH));
        canvas.style.width = `${Math.floor(CW * scale)}px`;
        canvas.style.height = `${Math.floor(CH * scale)}px`;
      };
      fit();
      const ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
      if (ro) ro.observe(stage); else window.addEventListener('resize', fit);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = CW * dpr;
      canvas.height = CH * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const s = newDuel();
      const view = { time: 0, msg: 'Wait for the gold, then sling!', msgT: 2.4, lift: 0, fall: 0, flash: null, flashT: 0, over: false };
      const pending = { sling: false, dodge: false };
      let paused = false;
      let raf = 0;
      let last = performance.now();
      let ended = false;

      const setPaused = (p) => { paused = p; pauseEl.hidden = !p; last = performance.now(); };
      pauseEl.onclick = () => setPaused(false);
      const onVisibility = () => { if (document.hidden && !ended) setPaused(true); };
      document.addEventListener('visibilitychange', onVisibility);

      const press = (what) => { if (!paused && !ended) pending[what] = true; };
      const onKey = (e) => {
        if (e.repeat) return;
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); press('sling'); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'd' || e.key === 'D' || e.key === 's' || e.key === 'S' || e.key === 'Shift') { e.preventDefault(); press('dodge'); }
        else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') setPaused(!paused);
      };
      document.addEventListener('keydown', onKey);
      card.querySelectorAll('[data-do]').forEach((b) => {
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(b.dataset.do); });
        b.addEventListener('click', (e) => { if (e.detail === 0) press(b.dataset.do); }); // keyboard activation
      });
      canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); press('sling'); });

      card.querySelector('[data-act="guide"]').onclick = (e) => { setPaused(true); pauseEl.hidden = true; openGuide(e.currentTarget, () => setPaused(false)); };
      card.querySelector('[data-act="retreat"]').onclick = () => {
        setPaused(true);
        if (confirm('Leave the valley? You can try again any time.')) finish('quit');
        else setPaused(false);
      };

      stopLoop = () => {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', fit);
        card.classList.remove('running', 'wide');
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVisibility);
      };

      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!paused) {
          view.time += dt;
          if (!ended) {
            stepDuel(s, dt, pending);
            pending.sling = pending.dodge = false;
            if (typeof window.__goliathTestHook === 'function') window.__goliathTestHook(s); // screenshot tests only
            for (const ev of s.events) {
              if (ev.type === 'hit') { view.msg = s.hits >= STONES ? 'The giant falls!' : `Struck! ${s.hits} of ${STONES}`; view.msgT = 1.4; view.flash = 'hit'; view.flashT = 0.35; }
              if (ev.type === 'armor') { view.msg = 'Clang! Only his armor.'; view.msgT = 1; view.flash = 'armor'; view.flashT = 0.25; }
              if (ev.type === 'blocked') { view.msg = 'The shield blocked it!'; view.msgT = 1.1; view.flash = 'armor'; view.flashT = 0.25; }
              if (ev.type === 'speared') { view.msg = 'The spear struck! Courage lost.'; view.msgT = 1.4; }
              if (ev.type === 'missed') { view.msg = 'Dodged!'; view.msgT = 0.9; }
            }
            if (s.outcome) {
              ended = true;
              view.over = true;
              if (s.outcome === 'win') { view.msg = 'The giant falls!'; view.msgT = 3; }
              setTimeout(() => (s.outcome === 'win' ? victory() : defeat()), s.outcome === 'win' ? 2600 : 900);
            }
          } else if (s.outcome === 'win') {
            view.fall = Math.min(1, view.fall + dt * 1.1);
          }
          const target = s.shield.state === 'up' ? 1 : (s.shield.state === 'raising' ? 0.45 : 0);
          view.lift += (target - view.lift) * Math.min(1, dt * 12);
          view.msgT = Math.max(0, view.msgT - dt);
          view.flashT = Math.max(0, view.flashT - dt);
        }
        render(ctx, s, view);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      card.querySelector('[data-do="sling"]').focus({ preventScroll: true });

      const victory = () => {
        stopLoop();
        card.innerHTML = `
          <div class="dg-screen win">
            <p class="dg-kicker">✦ Victory ✦</p>
            <h2>The Giant Has Fallen</h2>
            <p>David "hurled it with the sling, and struck the Philistine on the forehead" (1 Sam 17:49). The shepherd boy no one counted won with ${s.thrown} stone${s.thrown === 1 ? '' : 's'} thrown, "for the battle belongs to the LORD" (1 Sam 17:47).</p>
            ${rewards.length ? `<div class="dg-rewards">${rewards.map((x) => `<span>${x}</span>`).join('')}</div>` : ''}
            <button type="button" class="dg-go" data-act="done">Claim Your Rewards</button>
          </div>`;
        const done = card.querySelector('[data-act="done"]');
        done.onclick = () => finish('win');
        done.focus({ preventScroll: true });
      };

      const defeat = () => {
        stopLoop();
        card.innerHTML = `
          <div class="dg-screen">
            <p class="dg-kicker">✦ ${s.lostTo === 'reach' ? 'Overrun' : 'Courage Spent'} ✦</p>
            <h2>${s.lostTo === 'reach' ? 'The Giant Reached You' : 'The Spears Found You'}</h2>
            <p>You landed ${s.hits} of ${STONES} stones. "The same LORD who delivered me from the claws of the lion and the bear will deliver me from the hand of this Philistine" (1 Sam 17:37). ${s.lostTo === 'reach' ? 'Wait for the gold zone and make every stone count.' : 'When the spear goes up, dodge first, then sling.'}</p>
            <button type="button" class="dg-go" data-act="again">🪨 Try Again</button>
            <button type="button" class="dg-go ghost" data-act="quit">Leave for now</button>
          </div>`;
        card.querySelector('[data-act="again"]').onclick = () => run();
        card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
        card.querySelector('[data-act="again"]').focus({ preventScroll: true });
      };
    };

    showTitle();
  });
}
