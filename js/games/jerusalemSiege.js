// ============================================
// THE FALL OF JERUSALEM — the Final Season's fifth game chapter (Jornie,
// 2026-10-05), after "A Kingdom Divided and Exiled". No questions, no
// star; it must be cleared to continue (season.js awards the node on
// victory).
//
// 587 BC: Babylon's army is at the walls (2 Kgs 25:1–4). The city will
// fall; the task is to hold the wall long enough for a remnant to escape.
//   The wall has five sections. Rams, ladders and fire come against them,
//   each with a countdown.
//   Tap a section to send one of three bands of defenders there. A band is
//   busy for a moment after every order, so choose what to answer first.
//   Fire burns fastest, ladders next, rams slowest. Later rams are
//   iron-bound and must be answered twice.
//   A threat left unanswered breaches the wall: four breaches and the city
//   falls before the people are out.
// Hold for 70 seconds to win. Losing costs nothing: "Try Again".
//
// Logic (newSiege / stepSiege) is pure and exported for testing; drawing
// and input live in playJerusalemSiege({ rewards }) -> Promise<'win' | 'quit'>.
// ============================================

export const SECTIONS = 5;
export const DURATION = 70;
export const WALL_MAX = 4;
export const BANDS = 3;
export const THREATS = {
  fire: { time: 2.6, hold: 0.7 },
  ladder: { time: 3.6, hold: 1.2 },
  ram: { time: 5.0, hold: 1.5 }
};

const rand = (min, max) => min + Math.random() * (max - min);

// ---------- pure game logic ----------

export function newSiege() {
  return {
    t: 0, wall: WALL_MAX, bands: new Array(BANDS).fill(0), threats: [], next: 1.6,
    cracks: new Array(SECTIONS).fill(0), repelled: 0, wasted: 0, outcome: null, events: []
  };
}

function spawn(s, p) {
  const free = [];
  for (let i = 0; i < SECTIONS; i++) if (!s.threats.some((th) => th.sec === i)) free.push(i);
  if (!free.length) return;
  const sec = free[Math.floor(Math.random() * free.length)];
  const r = Math.random();
  const type = r < 0.3 ? 'fire' : (r < 0.7 ? 'ladder' : 'ram');
  const max = THREATS[type].time * (1 - 0.26 * p);
  s.threats.push({ sec, type, time: max, max, hp: type === 'ram' && p > 0.35 ? 2 : 1 });
  s.events.push({ type: 'spawn', sec });
}

/** Advances the siege by dt seconds. tap: a wall section's index, or -1. */
export function stepSiege(s, dt, tap = -1) {
  s.events = [];
  if (s.outcome) return s;
  s.t += dt;
  const p = Math.min(1, s.t / DURATION);
  for (let i = 0; i < BANDS; i++) s.bands[i] = Math.max(0, s.bands[i] - dt);

  if (s.t >= s.next && s.t < DURATION - 1.5) {
    spawn(s, p);
    if (p > 0.5 && Math.random() < 0.36) spawn(s, p); // the assault comes in waves near the end
    s.next = s.t + Math.max(0.65, rand(1.42, 2.15) - 1.15 * p);
  }

  if (tap >= 0 && tap < SECTIONS) {
    const band = s.bands.findIndex((b) => b <= 0);
    if (band < 0) s.events.push({ type: 'nobands', sec: tap });
    else {
      const th = s.threats.find((x) => x.sec === tap);
      if (!th) { s.bands[band] = 0.9; s.wasted += 1; s.events.push({ type: 'empty', sec: tap }); }
      else {
        s.bands[band] = THREATS[th.type].hold;
        th.hp -= 1;
        if (th.hp <= 0) {
          s.threats = s.threats.filter((x) => x !== th);
          s.repelled += 1;
          s.events.push({ type: 'repel', sec: tap, threat: th.type, hold: THREATS[th.type].hold });
        } else {
          th.time = Math.min(th.max, th.time + 1.2); // driven back, but not broken
          s.events.push({ type: 'push', sec: tap, threat: th.type, hold: THREATS[th.type].hold });
        }
      }
    }
  }

  for (const th of s.threats) {
    th.time -= dt;
    if (th.time <= 0) {
      th.done = true;
      s.wall -= 1;
      s.cracks[th.sec] += 1;
      s.events.push({ type: 'breach', sec: th.sec, threat: th.type });
    }
  }
  s.threats = s.threats.filter((th) => !th.done);

  if (s.wall <= 0) { s.wall = 0; s.outcome = 'lose'; }
  else if (s.t >= DURATION) { s.t = DURATION; s.outcome = 'win'; }
  return s;
}

// ---------- presentation ----------

const CSS = `
@keyframes fjFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes fjRise { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
.fj-overlay {
  position: fixed; inset: 0; z-index: 10400; display: flex; align-items: center; justify-content: center;
  padding: 10px; box-sizing: border-box; overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, rgba(255,190,90,.22), transparent 55%), radial-gradient(ellipse at 50% 110%, rgba(110,50,20,.5), transparent 55%), #070504;
  font-family: 'Segoe UI', system-ui, sans-serif; color: #E8DCC4; animation: fjFade .4s ease;
}
.fj-card {
  position: relative; width: min(440px, 100%); max-height: calc(100vh - 20px); max-height: calc(100dvh - 20px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
  background: linear-gradient(170deg, #1B1410 0%, #0F0B09 60%, #080605 100%);
  border: 1px solid #5A4226; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #0B0806, inset 0 0 0 5px rgba(201,146,58,.45), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.85), 0 0 90px rgba(255,170,60,.14);
  animation: fjRise .5s cubic-bezier(.2,.9,.3,1.1);
}
.fj-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px 6px; }
.fj-kicker { margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A; }
.fj-top-btns { display: flex; gap: 6px; }
.fj-small, .fj-small:hover { margin: 0; padding: 5px 9px; border-radius: 3px; cursor: pointer; font: 600 11px 'Segoe UI', sans-serif; letter-spacing: .5px; text-transform: uppercase; color: #C9B79A; background: transparent; border: 1px solid #5A4226; }
.fj-small:hover { color: #FFF1D6; border-color: #C9923A; }
/* During the siege, the card takes the screen height (capped), and the
   canvas is sized by JS to the largest 360:560 box that fits the stage —
   so it fits short laptop windows and small phones alike. */
.fj-card.running { height: min(calc(100vh - 20px), 860px); height: min(calc(100dvh - 20px), 860px); }
.fj-stage { position: relative; flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 10px; overflow: hidden; }
.fj-stage canvas { display: block; border-radius: 4px; touch-action: none; background: #120D0A; border: 1px solid #3A2A18; }
.fj-pause { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(8,5,3,.72); font-family: 'Cinzel', Georgia, serif; font-size: 18px; color: #FFF1D6; cursor: pointer; }
.fj-pause[hidden] { display: none; }
.fj-foot { padding: 8px 12px 11px; text-align: center; font-size: 12px; color: #B3A489; }
.fj-foot b { color: #FFE2A8; }
.fj-stage canvas:focus { outline: none; }
.fj-go:focus-visible, .fj-small:focus-visible { outline: 2px solid #FFD98A; outline-offset: 2px; }
.fj-screen { flex: 1 1 auto; min-height: 0; padding: 20px 20px 18px; text-align: center; overflow-y: auto; }
@media (max-height: 520px) { .fj-screen { padding: 12px 16px 12px; } .fj-screen h2 { font-size: 20px; } .fj-how { display: none; } .fj-go, .fj-go:hover { margin-top: 10px; padding: 10px 14px; } }
.fj-screen h2 { margin: 6px 0 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 25px; line-height: 1.2; color: #FFD9A0; text-shadow: 0 0 16px rgba(255,160,60,.45); }
.fj-screen.win h2 { color: #FFE9B8; text-shadow: 0 0 20px rgba(255,210,110,.6); }
.fj-screen p { margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #D6C8AE; }
.fj-how { margin: 14px 0 0; padding: 10px 12px; text-align: left; font-size: 13px; line-height: 1.55; color: #D6C8AE; background: rgba(0,0,0,.3); border: 1px solid rgba(201,146,58,.35); border-radius: 4px; }
.fj-how b { color: #FFE2A8; }
.fj-rewards { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 14px 0 0; }
.fj-rewards span { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #FFE2A8; background: rgba(233,184,90,.14); border: 1px solid rgba(233,184,90,.5); }
.fj-rewards img { width: 16px; height: 16px; }
.fj-go, .fj-go:hover {
  display: block; width: 100%; margin: 16px 0 0; padding: 13px 16px; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
}
.fj-go:hover { filter: brightness(1.1); }
.fj-go.ghost, .fj-go.ghost:hover { margin-top: 8px; color: #D6C8AE; font-size: 12.5px; background: rgba(255,255,255,.04); border-color: #5A4226; box-shadow: none; }
.fj-guide { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; background: #0A0705; }
.fj-guide[hidden] { display: none; }
.fj-guide-scroll { flex: 1; overflow-y: auto; padding: 18px 18px 6px; }
.fj-guide h3 { margin: 0 0 10px; text-align: center; font-family: 'Cinzel', Georgia, serif; font-size: 20px; color: #FFE2A8; }
.fj-guide h4 { margin: 14px 0 6px; font-family: 'Cinzel', Georgia, serif; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #E0A050; }
.fj-guide p, .fj-guide li { font-size: 13.5px; line-height: 1.55; color: #D6C8AE; }
.fj-guide p { margin: 0 0 6px; }
.fj-guide ul { margin: 0; padding-left: 18px; }
.fj-guide b { color: #FFE2A8; }
.fj-guide .tip { margin-top: 12px; padding: 9px 11px; border-radius: 4px; background: rgba(233,184,90,.1); border: 1px solid rgba(233,184,90,.4); }
.fj-guide-foot { padding: 8px 18px 16px; }
@media (max-height: 700px) { .fj-top { padding: 7px 10px 4px; } .fj-foot { padding: 5px 10px 7px; } }
/* A phone held sideways (.wide, set by JS): the controls move to the sides
   of the canvas and Guide / Leave to the corner, so the canvas gets the
   card's full height. */
.fj-card.running.wide { width: min(820px, 100%); display: grid; grid-template-columns: minmax(104px, 1fr) minmax(0, 2fr) minmax(104px, 1fr); grid-template-rows: auto minmax(0, 1fr); }
.fj-card.wide .fj-top { grid-column: 1; grid-row: 1; justify-content: center; padding: 8px 8px 6px; }
.fj-card.wide .fj-kicker { display: none; }
.fj-card.wide .fj-top-btns { flex-wrap: wrap; justify-content: center; }
.fj-card.wide .fj-small, .fj-card.wide .fj-small:hover { padding: 5px 6px; font-size: 10px; white-space: nowrap; }
.fj-card.wide .fj-stage { grid-column: 2; grid-row: 1 / 3; padding: 0; margin: 8px 0; }
.fj-card.wide .fj-foot { grid-column: 3; grid-row: 1 / 3; align-self: center; padding: 8px; }
@media (max-width: 400px) {
  .fj-kicker { font-size: 10px; letter-spacing: 1.5px; white-space: nowrap; }
  .fj-small, .fj-small:hover { padding: 5px 7px; font-size: 10px; white-space: nowrap; }
}
`;

const GUIDE_HTML = `
  <div class="fj-guide-scroll">
    <h3>How to Play</h3>
    <p>Babylon's army has surrounded Jerusalem. The city cannot be saved, but its people can. <b>Hold the wall for 70 seconds</b> so that a remnant can escape.</p>
    <h4>The Wall</h4>
    <ul>
      <li>The wall has <b>five sections</b>. Enemies come against them, and a red bar under each section shows how long before they break through.</li>
      <li><b>Tap a section</b> (or press <b>1 to 5</b>) to send a band of defenders there.</li>
      <li>You have only <b>three bands</b>. After every order a band is busy for a moment, so you cannot answer everything at once. Choose what is most urgent.</li>
    </ul>
    <h4>The Assault</h4>
    <ul>
      <li><b>Fire arrows</b>: the fastest. Answer them first.</li>
      <li><b>Ladders</b>: soldiers climb quickly.</li>
      <li><b>Battering rams</b>: slow but heavy. Later, iron-bound rams (marked <b>×2</b>) must be answered twice.</li>
      <li>Sending a band to a quiet section wastes it for a moment.</li>
    </ul>
    <h4>Breaches</h4>
    <p>An enemy left unanswered <b>breaches the wall</b>. After <b>four breaches</b> the city falls before the people are out.</p>
    <p class="tip">💡 <b>Tip:</b> Look at the red bars, not the enemies. Answer the fullest bar first, and keep one band free for fire. If the wall falls too soon, nothing is lost: tap <b>Try Again</b>.</p>
  </div>
  <div class="fj-guide-foot"><button type="button" class="fj-go" data-act="guide-close">Back to the Wall</button></div>`;

function injectStyles() {
  if (document.getElementById('jerusalemSiegeStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'jerusalemSiegeStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

// Canvas layout (logical units; scaled for the device).
const CW = 360;
const CH = 560;
const SEC_W = CW / SECTIONS;
const WALL_TOP = 214;
const WALL_BASE = 336;
const FIELD_END = 532;
const secX = (i) => SEC_W * (i + 0.5);

/** Which wall section a point on the canvas belongs to. */
export const sectionAt = (x) => Math.max(0, Math.min(SECTIONS - 1, Math.floor(x / SEC_W)));

function drawSoldier(ctx, x, y, sc, enemy) {
  ctx.fillStyle = enemy ? '#1A1210' : '#2A3446';
  ctx.fillRect(x - 3 * sc, y - 11 * sc, 6 * sc, 11 * sc);
  ctx.beginPath(); ctx.arc(x, y - 14 * sc, 3.4 * sc, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = enemy ? '#7A2A1E' : '#B9C4D6';
  ctx.beginPath(); ctx.arc(x, y - 15 * sc, 3.6 * sc, Math.PI, 0); ctx.fill();
}

function drawThreat(ctx, th, t) {
  const x = secX(th.sec);
  const q = 1 - th.time / th.max; // 0 just begun … 1 breaking through
  if (th.type === 'ram') {
    const y = FIELD_END - 20 - (FIELD_END - 60 - WALL_BASE) * Math.min(1, q * 1.15) + (q > 0.85 ? Math.sin(t * 40) * 2 : 0);
    ctx.fillStyle = '#2A1C12';
    ctx.beginPath(); ctx.moveTo(x - 22, y + 30); ctx.lineTo(x - 16, y - 6); ctx.lineTo(x + 16, y - 6); ctx.lineTo(x + 22, y + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4A3220';
    ctx.fillRect(x - 18, y - 10, 36, 6);
    ctx.fillStyle = th.hp > 1 ? '#8A8E96' : '#6A4A2A';
    ctx.fillRect(x - 5, y - 26, 10, 50);
    ctx.fillStyle = th.hp > 1 ? '#C9CED6' : '#3A2A1A';
    ctx.beginPath(); ctx.moveTo(x - 7, y - 26); ctx.lineTo(x + 7, y - 26); ctx.lineTo(x, y - 38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#120C08';
    ctx.beginPath(); ctx.arc(x - 17, y + 30, 6, 0, Math.PI * 2); ctx.arc(x + 17, y + 30, 6, 0, Math.PI * 2); ctx.fill();
    if (th.hp > 1) {
      ctx.font = '700 12px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFE2A8';
      ctx.fillText('×2', x + 24, y - 14);
    }
  } else if (th.type === 'ladder') {
    const top = WALL_TOP + 4; const bottom = FIELD_END - 46;
    ctx.strokeStyle = '#5A3E22'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 9, bottom); ctx.lineTo(x - 5, top); ctx.moveTo(x + 9, bottom); ctx.lineTo(x + 5, top); ctx.stroke();
    ctx.lineWidth = 2;
    for (let yy = bottom - 10; yy > top + 4; yy -= 16) { const k = (bottom - yy) / (bottom - top); ctx.beginPath(); ctx.moveTo(x - 9 + 4 * k, yy); ctx.lineTo(x + 9 - 4 * k, yy); ctx.stroke(); }
    for (let n = 0; n < 3; n++) {
      const cq = Math.max(0, q * 1.1 - n * 0.22);
      if (cq <= 0) continue;
      drawSoldier(ctx, x, bottom - (bottom - top - 6) * Math.min(1, cq), 1, true);
    }
  } else {
    // Fire arrows raining on the battlement; the blaze grows.
    ctx.strokeStyle = 'rgba(255,170,70,.85)'; ctx.lineWidth = 1.6;
    for (let n = 0; n < 4; n++) {
      const ph = (t * 1.6 + n * 0.27) % 1;
      const ax = x - 26 + n * 16; const ay = FIELD_END - 60 - (FIELD_END - 60 - WALL_TOP) * ph;
      ctx.beginPath(); ctx.moveTo(ax, ay + 12); ctx.lineTo(ax + 3, ay); ctx.stroke();
      ctx.fillStyle = '#FFD27A'; ctx.beginPath(); ctx.arc(ax + 3, ay, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    const h = 14 + 34 * q;
    for (let n = 0; n < 3; n++) {
      const fx = x - 18 + n * 18; const fl = h * (0.75 + 0.25 * Math.sin(t * 12 + n * 2));
      const g = ctx.createLinearGradient(0, WALL_TOP, 0, WALL_TOP - fl);
      g.addColorStop(0, 'rgba(255,90,20,.95)'); g.addColorStop(.6, 'rgba(255,190,60,.85)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(fx - 8, WALL_TOP); ctx.quadraticCurveTo(fx - 3, WALL_TOP - fl * 0.6, fx, WALL_TOP - fl); ctx.quadraticCurveTo(fx + 4, WALL_TOP - fl * 0.6, fx + 8, WALL_TOP); ctx.closePath(); ctx.fill();
    }
  }
  // Its countdown, under the wall.
  ctx.fillStyle = 'rgba(8,5,3,.8)';
  ctx.fillRect(x - 30, WALL_BASE + 5, 60, 8);
  ctx.fillStyle = q > 0.7 ? '#FF3B3B' : '#D9662E';
  ctx.fillRect(x - 30, WALL_BASE + 5, 60 * Math.min(1, q), 8);
  ctx.strokeStyle = q > 0.7 && Math.floor(t * 8) % 2 ? '#FFE2A8' : '#5A4226'; ctx.lineWidth = 1;
  ctx.strokeRect(x - 30 + 0.5, WALL_BASE + 5.5, 59, 7);
}

function render(ctx, s, view) {
  const t = view.time;
  const p = Math.min(1, s.t / DURATION);
  // A night sky lit by the burning land.
  const sky = ctx.createLinearGradient(0, 46, 0, WALL_TOP);
  sky.addColorStop(0, '#120A14'); sky.addColorStop(1, `rgb(${Math.round(90 + 70 * p)},${Math.round(36 + 14 * p)},22)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, WALL_TOP + 10);
  // The city and the Temple behind the wall; fires spread as the siege wears on.
  ctx.fillStyle = '#1C1210';
  for (let i = 0; i < 14; i++) { const hx = i * 27 - 4; const hh = 22 + ((i * 11) % 30); ctx.fillRect(hx, WALL_TOP - hh, 23, hh); }
  ctx.fillStyle = '#241814';
  ctx.fillRect(140, WALL_TOP - 92, 80, 92);
  ctx.fillRect(132, WALL_TOP - 100, 96, 10);
  ctx.fillStyle = '#5A4020';
  ctx.fillRect(146, WALL_TOP - 84, 8, 84); ctx.fillRect(206, WALL_TOP - 84, 8, 84);
  for (let i = 0; i < 5; i++) {
    if (p < 0.12 + i * 0.16) continue;
    const fx = 30 + ((i * 83) % 300); const fl = 22 + 10 * Math.sin(t * 9 + i * 1.7);
    const g = ctx.createRadialGradient(fx, WALL_TOP - 30, 2, fx, WALL_TOP - 30, 36 + fl);
    g.addColorStop(0, 'rgba(255,200,90,.75)'); g.addColorStop(.4, 'rgba(255,100,30,.4)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(fx - 70, WALL_TOP - 110, 140, 120);
  }

  // The field before the wall, and Babylon's host waiting in the dark.
  const field = ctx.createLinearGradient(0, WALL_BASE, 0, CH);
  field.addColorStop(0, '#2A1E16'); field.addColorStop(1, '#0E0A08');
  ctx.fillStyle = field;
  ctx.fillRect(0, WALL_BASE, CW, CH - WALL_BASE);
  for (let i = 0; i < 26; i++) {
    const ex = (i * 29 + 9) % CW; const ey = FIELD_END + 6 + ((i * 13) % 20);
    drawSoldier(ctx, ex + Math.sin(t * 2 + i) * 1.2, ey, 0.9, true);
    if (i % 4 === 0) { ctx.fillStyle = 'rgba(255,150,50,.85)'; ctx.beginPath(); ctx.arc(ex + 5, ey - 20 + Math.sin(t * 10 + i) * 1.5, 2.4, 0, Math.PI * 2); ctx.fill(); }
  }

  // The wall: five sections with battlements.
  for (let i = 0; i < SECTIONS; i++) {
    const x0 = i * SEC_W;
    const lit = view.flash[i] > 0 ? view.flashKind[i] : null;
    const g = ctx.createLinearGradient(0, WALL_TOP, 0, WALL_BASE);
    g.addColorStop(0, '#8A7658'); g.addColorStop(1, '#4A3C2A');
    ctx.fillStyle = g;
    ctx.fillRect(x0, WALL_TOP, SEC_W, WALL_BASE - WALL_TOP);
    for (let m = 0; m < 4; m++) ctx.fillRect(x0 + 3 + m * 18, WALL_TOP - 12, 12, 12);
    ctx.strokeStyle = 'rgba(30,22,14,.45)'; ctx.lineWidth = 1;
    for (let row = 0; row < 6; row++) {
      const y = WALL_TOP + row * 20;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + SEC_W, y); ctx.stroke();
      for (let bx = x0 + (row % 2 ? 12 : 30); bx < x0 + SEC_W; bx += 36) { ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y + 20); ctx.stroke(); }
    }
    ctx.strokeStyle = '#1E160E'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, WALL_TOP - 12); ctx.lineTo(x0, WALL_BASE); ctx.stroke();
    // Breaches torn in this section.
    for (let c = 0; c < s.cracks[i]; c++) {
      const cx = x0 + 18 + c * 22;
      ctx.fillStyle = '#0A0605';
      ctx.beginPath(); ctx.moveTo(cx - 9, WALL_BASE); ctx.lineTo(cx - 12, WALL_BASE - 44); ctx.lineTo(cx - 4, WALL_BASE - 60); ctx.lineTo(cx + 1, WALL_BASE - 92); ctx.lineTo(cx + 7, WALL_BASE - 58); ctx.lineTo(cx + 12, WALL_BASE - 40); ctx.lineTo(cx + 9, WALL_BASE); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,110,40,${0.35 + 0.15 * Math.sin(t * 8 + c)})`;
      ctx.beginPath(); ctx.moveTo(cx - 5, WALL_BASE); ctx.lineTo(cx - 2, WALL_BASE - 40); ctx.lineTo(cx + 4, WALL_BASE - 38); ctx.lineTo(cx + 5, WALL_BASE); ctx.closePath(); ctx.fill();
    }
    if (lit) {
      ctx.fillStyle = lit === 'breach' ? `rgba(255,50,30,${Math.min(0.6, view.flash[i] * 1.2)})` : (lit === 'bad' ? `rgba(255,255,255,${Math.min(0.12, view.flash[i])})` : `rgba(160,200,255,${Math.min(0.3, view.flash[i])})`);
      ctx.fillRect(x0, WALL_TOP - 12, SEC_W, WALL_BASE - WALL_TOP + 12);
    }
    // Defenders: a lone sentry, or the band that was sent here.
    if (view.guard[i] > 0) {
      for (let n = -1; n <= 1; n++) {
        const gx = secX(i) + n * 15;
        drawSoldier(ctx, gx, WALL_TOP - 1, 1.15, false);
        ctx.strokeStyle = '#D6DCE4'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(gx + 4, WALL_TOP - 20); ctx.lineTo(gx + 6, WALL_TOP + 6 + Math.sin(t * 22 + n) * 4); ctx.stroke();
        ctx.fillStyle = '#7A8AA6'; ctx.beginPath(); ctx.ellipse(gx - 3, WALL_TOP - 7, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else drawSoldier(ctx, secX(i), WALL_TOP - 1, 0.95, false);
    ctx.font = '700 11px Cinzel, Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,236,190,.55)';
    ctx.fillText(String(i + 1), secX(i), WALL_BASE - 8);
  }
  for (const th of s.threats) drawThreat(ctx, th, t);

  // The end: the wall is breached and the city burns, whether or not the people got out.
  if (view.fall > 0) {
    ctx.fillStyle = `rgba(255,80,20,${0.35 * Math.min(1, view.fall)})`;
    ctx.fillRect(0, 0, CW, CH);
  }

  // HUD: how far the people have got, the wall, and the bands.
  ctx.fillStyle = 'rgba(8,5,3,.82)';
  ctx.fillRect(0, 0, CW, 46);
  ctx.textAlign = 'left';
  ctx.font = '700 11px Cinzel, Georgia, serif';
  ctx.fillStyle = '#FFE2A8';
  ctx.fillText(`THE PEOPLE ESCAPING  ${Math.floor(p * 100)}%`, 10, 15);
  ctx.fillStyle = '#2A2018'; ctx.fillRect(10, 20, 170, 7);
  ctx.fillStyle = '#8FC7F2'; ctx.fillRect(10, 20, 170 * p, 7);
  ctx.textAlign = 'right';
  ctx.fillStyle = s.wall <= 1 ? '#FF6B81' : '#FFE2A8';
  ctx.fillText('WALL', CW - 10, 15);
  for (let i = 0; i < WALL_MAX; i++) {
    ctx.fillStyle = i < s.wall ? (s.wall <= 1 ? '#FF4D6D' : '#C9A26A') : '#2A2018';
    ctx.fillRect(CW - 134 + i * 32, 20, 28, 7);
  }
  ctx.textAlign = 'left';
  ctx.font = '600 11px Segoe UI, sans-serif';
  ctx.fillStyle = '#D6C8AE';
  ctx.fillText('Defenders ready:', 10, 41);
  for (let i = 0; i < BANDS; i++) {
    const ready = s.bands[i] <= 0;
    ctx.fillStyle = ready ? '#8FA6C9' : '#2E2A28';
    ctx.beginPath(); ctx.moveTo(104 + i * 20, 31); ctx.lineTo(118 + i * 20, 31); ctx.lineTo(118 + i * 20, 38); ctx.lineTo(111 + i * 20, 43); ctx.lineTo(104 + i * 20, 38); ctx.closePath(); ctx.fill();
  }
  if (view.msg && view.msgT > 0) {
    ctx.textAlign = 'center';
    ctx.font = '700 15px Cinzel, Georgia, serif';
    ctx.fillStyle = 'rgba(8,5,3,.55)';
    ctx.fillRect(30, 60, CW - 60, 26);
    ctx.fillStyle = view.msgBad ? `rgba(255,138,122,${Math.min(1, view.msgT)})` : `rgba(255,236,190,${Math.min(1, view.msgT)})`;
    ctx.fillText(view.msg, CW / 2, 78);
  }
}

/** Plays the siege. Resolves 'win' after the victory screen, or 'quit'. */
export function playJerusalemSiege({ rewards = [] } = {}) {
  return new Promise((resolve) => {
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'fj-overlay';
    overlay.innerHTML = `<div class="fj-card" role="dialog" aria-modal="true" aria-label="The Fall of Jerusalem"></div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    const card = overlay.querySelector('.fj-card');
    let stopLoop = () => {};

    const finish = (result) => {
      stopLoop();
      overlay.remove();
      document.documentElement.style.overflow = '';
      resolve(result);
    };

    const openGuide = (returnFocus, onClose) => {
      let guide = card.querySelector('.fj-guide');
      if (!guide) {
        guide = document.createElement('div');
        guide.className = 'fj-guide';
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
      guide.querySelector('.fj-guide-scroll').scrollTop = 0;
      guide.querySelector('[data-act="guide-close"]').focus({ preventScroll: true });
    };

    const showTitle = () => {
      card.innerHTML = `
        <div class="fj-screen">
          <p class="fj-kicker">✦ 587 BC ✦</p>
          <h2>The Fall of Jerusalem</h2>
          <p>"How solitary sits the city, once filled with people" (Lam 1:1). Babylon's army surrounds Jerusalem, and the wall will not stand forever. Hold it long enough for a remnant of God's people to escape.</p>
          <div class="fj-how">
            <b>Tap a section</b> of the wall to send defenders there.<br>
            You have only <b>three bands</b>, and each is busy for a moment.<br>
            <b>Fire</b> is fastest, then <b>ladders</b>, then <b>rams</b>.<br>
            The <b>red bar</b> shows how long before they break through.<br>
            <b>Four breaches</b> and the city falls too soon.<br>
            Hold the wall for <b>70 seconds</b>.
          </div>
          <button type="button" class="fj-go" data-act="begin">🔥 Man the Walls</button>
          <button type="button" class="fj-go ghost" data-act="guide">❔ How to Play</button>
          <button type="button" class="fj-go ghost" data-act="quit">Not yet</button>
        </div>`;
      card.querySelector('[data-act="begin"]').onclick = () => run();
      card.querySelector('[data-act="guide"]').onclick = (e) => openGuide(e.currentTarget);
      card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
      card.querySelector('[data-act="begin"]').focus({ preventScroll: true });
    };

    const run = () => {
      card.innerHTML = `
        <div class="fj-top"><p class="fj-kicker">✦ The Siege ✦</p><div class="fj-top-btns"><button type="button" class="fj-small" data-act="guide">❔ Guide</button><button type="button" class="fj-small" data-act="retreat">Leave</button></div></div>
        <div class="fj-stage"><canvas width="${CW}" height="${CH}" tabindex="0" aria-label="The wall of Jerusalem under attack. Press 1 to 5 to send defenders to a section."></canvas><div class="fj-pause" hidden>Paused — tap to continue</div></div>
        <div class="fj-foot">Tap a section of the wall, or press <b>1</b> to <b>5</b></div>`;
      card.classList.add('running');
      const canvas = card.querySelector('canvas');
      const pauseEl = card.querySelector('.fj-pause');
      // Largest 360:560 canvas that fits the space the stage really has.
      const stage = card.querySelector('.fj-stage');
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

      const s = newSiege();
      const zeros = () => new Array(SECTIONS).fill(0);
      const view = { time: 0, msg: 'They are coming. Hold the wall!', msgT: 2.4, msgBad: false, guard: zeros(), flash: zeros(), flashKind: new Array(SECTIONS).fill(null), fall: 0 };
      const taps = [];
      let paused = false;
      let raf = 0;
      let last = performance.now();
      let ended = false;

      const setPaused = (p) => { paused = p; pauseEl.hidden = !p; last = performance.now(); };
      pauseEl.onclick = () => setPaused(false);
      const onVisibility = () => { if (document.hidden && !ended) setPaused(true); };
      document.addEventListener('visibilitychange', onVisibility);

      const tap = (i) => { if (!paused && !ended && taps.length < 4) taps.push(i); };
      const onKey = (e) => {
        if (e.repeat) return;
        if (e.key >= '1' && e.key <= String(SECTIONS)) { e.preventDefault(); tap(Number(e.key) - 1); }
        else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') setPaused(!paused);
      };
      document.addEventListener('keydown', onKey);
      canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        tap(sectionAt(((e.clientX - rect.left) / rect.width) * CW));
      });

      card.querySelector('[data-act="guide"]').onclick = (e) => { setPaused(true); pauseEl.hidden = true; openGuide(e.currentTarget, () => setPaused(false)); };
      card.querySelector('[data-act="retreat"]').onclick = () => {
        setPaused(true);
        if (confirm('Leave the wall? You can try again any time.')) finish('quit');
        else setPaused(false);
      };

      stopLoop = () => {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', fit);
        card.classList.remove('running', 'wide');
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVisibility);
      };

      const say = (msg, secs, bad) => { view.msg = msg; view.msgT = secs; view.msgBad = !!bad; };
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!paused) {
          view.time += dt;
          if (!ended) {
            // One order per step, so quick double taps are all answered in turn.
            stepSiege(s, dt, taps.length ? taps.shift() : -1);
            if (typeof window.__siegeTestHook === 'function') window.__siegeTestHook(s, view); // screenshot tests only
            for (const ev of s.events) {
              if (ev.type === 'repel') { view.guard[ev.sec] = ev.hold; view.flash[ev.sec] = 0.3; view.flashKind[ev.sec] = 'good'; say(ev.threat === 'fire' ? 'The fire is put out!' : (ev.threat === 'ladder' ? 'The ladder is thrown down!' : 'The ram is broken!'), 0.9); }
              if (ev.type === 'push') { view.guard[ev.sec] = ev.hold; view.flash[ev.sec] = 0.3; view.flashKind[ev.sec] = 'good'; say('Driven back. Strike it again!', 1.1); }
              if (ev.type === 'empty') { view.guard[ev.sec] = 0.9; view.flash[ev.sec] = 0.2; view.flashKind[ev.sec] = 'bad'; say('Nothing there. A band is wasted.', 1, true); }
              if (ev.type === 'nobands') say('No defenders are free!', 0.9, true);
              if (ev.type === 'breach') { view.flash[ev.sec] = 0.6; view.flashKind[ev.sec] = 'breach'; say(s.wall > 0 ? `The wall is breached! ${s.wall} left.` : 'The wall has fallen!', 1.6, true); }
            }
            if (s.outcome) {
              ended = true;
              if (s.outcome === 'win') say('A remnant has escaped!', 3);
              setTimeout(() => (s.outcome === 'win' ? victory() : defeat()), s.outcome === 'win' ? 2600 : 1400);
            }
          } else {
            view.fall = Math.min(1, view.fall + dt * 0.7);
          }
          for (let i = 0; i < SECTIONS; i++) { view.guard[i] = Math.max(0, view.guard[i] - dt); view.flash[i] = Math.max(0, view.flash[i] - dt); }
          view.msgT = Math.max(0, view.msgT - dt);
        }
        render(ctx, s, view);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      canvas.focus({ preventScroll: true });

      const victory = () => {
        stopLoop();
        card.innerHTML = `
          <div class="fj-screen win">
            <p class="fj-kicker">✦ A Remnant Is Saved ✦</p>
            <h2>The City Falls, the People Live</h2>
            <p>In the end "the city walls were breached" (2 Kgs 25:4) and Jerusalem fell. But you held the wall long enough, turning back ${s.repelled} assault${s.repelled === 1 ? '' : 's'}, and a remnant went out alive. God was not finished with His people.</p>
            ${rewards.length ? `<div class="fj-rewards">${rewards.map((x) => `<span>${x}</span>`).join('')}</div>` : ''}
            <button type="button" class="fj-go" data-act="done">Claim Your Rewards</button>
          </div>`;
        const done = card.querySelector('[data-act="done"]');
        done.onclick = () => finish('win');
        done.focus({ preventScroll: true });
      };

      const defeat = () => {
        stopLoop();
        card.innerHTML = `
          <div class="fj-screen">
            <p class="fj-kicker">✦ The Wall Has Fallen ✦</p>
            <h2>Too Soon</h2>
            <p>The wall broke with only ${Math.floor((s.t / DURATION) * 100)}% of the people out. "The LORD's acts of mercy are not exhausted, his compassion is not spent" (Lam 3:22). Answer the fullest red bar first, and stand on the wall again.</p>
            <button type="button" class="fj-go" data-act="again">🔥 Try Again</button>
            <button type="button" class="fj-go ghost" data-act="quit">Leave for now</button>
          </div>`;
        card.querySelector('[data-act="again"]').onclick = () => run();
        card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
        card.querySelector('[data-act="again"]').focus({ preventScroll: true });
      };
    };

    showTitle();
  });
}
