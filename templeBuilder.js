// ============================================
// BUILDING SOLOMON'S TEMPLE — the Final Season's fourth game chapter
// (Jornie, 2026-10-05), after "David and Goliath". No questions, no star;
// it must be cleared to continue (season.js awards the node on victory).
//
// Raise the wall of the First Temple (1 Kgs 6), one course at a time:
//   A dressed stone swings across on the hoist. "Set the Stone" drops it.
//   Whatever hangs over the wall is cut away, so the next stone is smaller.
//   A stone set almost perfectly keeps its size and even widens the wall.
//   A stone that misses the wall (or leaves too little) cracks: one of
//   three chances is lost.
//   From the seventh course the wind rises: the swing speeds up and slows.
// Lay twelve courses to finish. Losing costs nothing: "Try Again".
//
// Logic (newBuild / stepBuild) is pure and exported for testing; drawing
// and input live in playTempleBuilder({ rewards }) -> Promise<'win' | 'quit'>.
// ============================================

export const COURSES = 12;
export const CHANCES = 3;
export const WORLD_W = 360;
const W0 = 150;      // the foundation course, and the widest a stone can be
const MIN_W = 20;    // less than this left on the wall and the stone cracks
const PERFECT = 4;   // how close counts as a perfect set
const EDGE = 6;

// ---------- pure game logic ----------

export function newBuild() {
  return {
    t: 0, placed: 0, misses: 0, perfects: 0,
    top: { x: (WORLD_W - W0) / 2, w: W0 }, stack: [],
    w: W0, x: EDGE, dir: 1, wait: 0.6, outcome: null, events: []
  };
}

/** How fast the stone swings: faster with every course, and gusty once the wall is high. */
export const WIND_FROM = 6; // courses laid before the wind rises
export const stoneSpeed = (s) => (150 + 14 * s.placed) * (s.placed >= WIND_FROM ? 1 + 0.35 * Math.sin(s.t * 3.1) : 1);

function nextStone(s, wait) {
  s.w = s.top.w;
  s.dir = s.placed % 2 ? -1 : 1;
  s.x = s.dir > 0 ? EDGE : WORLD_W - EDGE - s.w;
  s.wait = wait;
}

/** Advances the build by dt seconds. drop: true on the frame the stone is set. */
export function stepBuild(s, dt, drop = false) {
  s.events = [];
  if (s.outcome) return s;
  s.t += dt;
  if (s.wait > 0) { s.wait -= dt; return s; } // the next stone is being hoisted
  s.x += s.dir * stoneSpeed(s) * dt;
  const maxX = WORLD_W - EDGE - s.w;
  if (s.x >= maxX) { s.x = maxX; s.dir = -1; }
  if (s.x <= EDGE) { s.x = EDGE; s.dir = 1; }
  if (!drop) return s;

  const top = s.top;
  const from = { x: s.x, w: s.w };
  if (Math.abs(s.x - top.x) <= PERFECT) {
    // A master's stone: it keeps its size and widens the wall a little.
    const w = Math.min(W0, top.w + 6);
    const placed = { x: Math.max(EDGE, Math.min(WORLD_W - EDGE - w, top.x - (w - top.w) / 2)), w };
    s.stack.push(top); s.top = placed; s.placed += 1; s.perfects += 1;
    s.events.push({ type: 'perfect', from, placed });
  } else {
    const left = Math.max(s.x, top.x);
    const right = Math.min(s.x + s.w, top.x + top.w);
    if (right - left < MIN_W) {
      s.misses += 1;
      s.events.push({ type: 'miss', from });
      if (s.misses >= CHANCES) { s.outcome = 'lose'; return s; }
      nextStone(s, 0.75);
      return s;
    }
    const placed = { x: left, w: right - left };
    const cut = s.x < top.x ? { x: s.x, w: top.x - s.x } : { x: right, w: s.x + s.w - right };
    s.stack.push(top); s.top = placed; s.placed += 1;
    s.events.push({ type: 'set', from, placed, cut });
  }
  if (s.placed >= COURSES) { s.outcome = 'win'; return s; }
  nextStone(s, 0.5);
  return s;
}

// ---------- presentation ----------

const CSS = `
@keyframes tbFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes tbRise { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
.tb-overlay {
  position: fixed; inset: 0; z-index: 10400; display: flex; align-items: center; justify-content: center;
  padding: 10px; box-sizing: border-box; overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, rgba(255,190,90,.22), transparent 55%), radial-gradient(ellipse at 50% 110%, rgba(110,50,20,.5), transparent 55%), #070504;
  font-family: 'Segoe UI', system-ui, sans-serif; color: #E8DCC4; animation: tbFade .4s ease;
}
.tb-card {
  position: relative; width: min(440px, 100%); max-height: calc(100vh - 20px); max-height: calc(100dvh - 20px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
  background: linear-gradient(170deg, #1B1410 0%, #0F0B09 60%, #080605 100%);
  border: 1px solid #5A4226; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #0B0806, inset 0 0 0 5px rgba(201,146,58,.45), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.85), 0 0 90px rgba(255,170,60,.14);
  animation: tbRise .5s cubic-bezier(.2,.9,.3,1.1);
}
.tb-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px 6px; }
.tb-kicker { margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A; }
.tb-top-btns { display: flex; gap: 6px; }
.tb-small, .tb-small:hover { margin: 0; padding: 5px 9px; border-radius: 3px; cursor: pointer; font: 600 11px 'Segoe UI', sans-serif; letter-spacing: .5px; text-transform: uppercase; color: #C9B79A; background: transparent; border: 1px solid #5A4226; }
.tb-small:hover { color: #FFF1D6; border-color: #C9923A; }
/* While building, the card takes the screen height (capped), and the
   canvas is sized by JS to the largest 360:560 box that fits the stage —
   so it fits short laptop windows and small phones alike. */
.tb-card.running { height: min(calc(100vh - 20px), 860px); height: min(calc(100dvh - 20px), 860px); }
.tb-stage { position: relative; flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 10px; overflow: hidden; }
.tb-stage canvas { display: block; border-radius: 4px; touch-action: none; background: #120D0A; border: 1px solid #3A2A18; }
.tb-pause { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(8,5,3,.72); font-family: 'Cinzel', Georgia, serif; font-size: 18px; color: #FFF1D6; cursor: pointer; }
.tb-pause[hidden] { display: none; }
.tb-pad { display: grid; grid-template-columns: 1fr; padding: 10px 12px 12px; }
.tb-pad button, .tb-pad button:hover {
  margin: 0; padding: 15px 6px; cursor: pointer; border-radius: 6px; line-height: 1;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; border: 1px solid #FFE7A8; background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  -webkit-user-select: none; user-select: none; touch-action: none; -webkit-touch-callout: none;
}
.tb-pad button:active { filter: brightness(1.2); }
.tb-pad button:focus-visible, .tb-go:focus-visible, .tb-small:focus-visible { outline: 2px solid #FFD98A; outline-offset: 2px; }
.tb-screen { flex: 1 1 auto; min-height: 0; padding: 20px 20px 18px; text-align: center; overflow-y: auto; }
@media (max-height: 520px) { .tb-screen { padding: 12px 16px 12px; } .tb-screen h2 { font-size: 20px; } .tb-how { font-size: 12px; } .tb-go, .tb-go:hover { margin-top: 10px; padding: 10px 14px; } }
.tb-screen h2 { margin: 6px 0 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 25px; line-height: 1.2; color: #FFD9A0; text-shadow: 0 0 16px rgba(255,160,60,.45); }
.tb-screen.win h2 { color: #FFE9B8; text-shadow: 0 0 20px rgba(255,210,110,.6); }
.tb-screen p { margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #D6C8AE; }
.tb-how { margin: 14px 0 0; padding: 10px 12px; text-align: left; font-size: 13px; line-height: 1.55; color: #D6C8AE; background: rgba(0,0,0,.3); border: 1px solid rgba(201,146,58,.35); border-radius: 4px; }
.tb-how b { color: #FFE2A8; }
.tb-rewards { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 14px 0 0; }
.tb-rewards span { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #FFE2A8; background: rgba(233,184,90,.14); border: 1px solid rgba(233,184,90,.5); }
.tb-rewards img { width: 16px; height: 16px; }
.tb-go, .tb-go:hover {
  display: block; width: 100%; margin: 16px 0 0; padding: 13px 16px; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
}
.tb-go:hover { filter: brightness(1.1); }
.tb-go.ghost, .tb-go.ghost:hover { margin-top: 8px; color: #D6C8AE; font-size: 12.5px; background: rgba(255,255,255,.04); border-color: #5A4226; box-shadow: none; }
.tb-guide { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; background: #0A0705; }
.tb-guide[hidden] { display: none; }
.tb-guide-scroll { flex: 1; overflow-y: auto; padding: 18px 18px 6px; }
.tb-guide h3 { margin: 0 0 10px; text-align: center; font-family: 'Cinzel', Georgia, serif; font-size: 20px; color: #FFE2A8; }
.tb-guide h4 { margin: 14px 0 6px; font-family: 'Cinzel', Georgia, serif; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #E0A050; }
.tb-guide p, .tb-guide li { font-size: 13.5px; line-height: 1.55; color: #D6C8AE; }
.tb-guide p { margin: 0 0 6px; }
.tb-guide ul { margin: 0; padding-left: 18px; }
.tb-guide b { color: #FFE2A8; }
.tb-guide .tip { margin-top: 12px; padding: 9px 11px; border-radius: 4px; background: rgba(233,184,90,.1); border: 1px solid rgba(233,184,90,.4); }
.tb-guide-foot { padding: 8px 18px 16px; }
@media (max-height: 700px) { .tb-pad button, .tb-pad button:hover { padding: 10px 6px; } .tb-top { padding: 7px 10px 4px; } .tb-pad { padding: 7px 10px 9px; } }
@media (max-width: 400px) {
  .tb-kicker { font-size: 10px; letter-spacing: 1.5px; white-space: nowrap; }
  .tb-small, .tb-small:hover { padding: 5px 7px; font-size: 10px; white-space: nowrap; }
}
`;

const GUIDE_HTML = `
  <div class="tb-guide-scroll">
    <h3>How to Play</h3>
    <p>King Solomon is building a house for the LORD. Help the builders raise the wall: lay <b>twelve courses</b> of stone, one on top of another.</p>
    <h4>Setting a Stone</h4>
    <ul>
      <li>A stone swings from side to side on the hoist.</li>
      <li>Tap <b>Set the Stone</b> (or press <b>Space</b>, or tap the wall) when it is right above the course below.</li>
      <li>Any part that hangs over the edge is <b>cut away</b>, so the wall, and your next stone, become narrower.</li>
    </ul>
    <h4>Perfect and Cracked Stones</h4>
    <ul>
      <li><b>Perfect</b>: set a stone almost exactly on the one below and it keeps its full size. The wall even grows a little wider.</li>
      <li><b>Cracked</b>: if the stone misses the wall, or too little of it rests on the wall, it cracks and falls. You have <b>3 chances</b>.</li>
      <li>The higher the wall, the faster the stone swings.</li>
      <li><b>The wind</b>: from the seventh course, gusts make the stone speed up and slow down. Watch it closely before you set it.</li>
    </ul>
    <p class="tip">💡 <b>Tip:</b> Do not hurry. Watch one full swing, then set the stone on the next pass. A wide wall at the start makes the top courses much easier. If the wall fails, nothing is lost: tap <b>Try Again</b>.</p>
  </div>
  <div class="tb-guide-foot"><button type="button" class="tb-go" data-act="guide-close">Back to the Wall</button></div>`;

function injectStyles() {
  if (document.getElementById('templeBuilderStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'templeBuilderStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

// Canvas layout (logical units; scaled for the device).
const CW = WORLD_W;
const CH = 560;
const BASE_Y = 486;  // top of the platform the wall stands on
const BH = 24;       // height of one course
const courseY = (i) => BASE_Y - (i + 1) * BH; // i = 0 is the foundation course

function drawStone(ctx, x, y, w, seed, glow) {
  ctx.save();
  if (glow) { ctx.shadowColor = 'rgba(255,225,140,.9)'; ctx.shadowBlur = 14; }
  const g = ctx.createLinearGradient(0, y, 0, y + BH);
  g.addColorStop(0, '#EADBB8'); g.addColorStop(1, '#B49D72');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, BH);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#6E5A3A'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, BH - 1.5);
  ctx.strokeStyle = 'rgba(110,90,58,.55)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let jx = x + 22 + (seed % 2) * 17; jx < x + w - 8; jx += 34) { ctx.moveTo(jx, y + 2); ctx.lineTo(jx, y + BH - 2); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  ctx.restore();
}

function render(ctx, s, view) {
  const t = view.time;
  // Dawn over Jerusalem.
  const sky = ctx.createLinearGradient(0, 0, 0, BASE_Y);
  sky.addColorStop(0, '#2A2748'); sky.addColorStop(.55, '#B5694A'); sky.addColorStop(1, '#F2C27A');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, CH);
  ctx.fillStyle = 'rgba(255,236,180,.85)';
  ctx.beginPath(); ctx.arc(74, 396, 30, 0, Math.PI * 2); ctx.fill();
  // The hills and the city below the Temple mount.
  ctx.fillStyle = '#6A4634';
  ctx.beginPath(); ctx.moveTo(0, 440); ctx.quadraticCurveTo(90, 380, 190, 430); ctx.quadraticCurveTo(280, 392, CW, 436); ctx.lineTo(CW, BASE_Y); ctx.lineTo(0, BASE_Y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4E3226';
  for (let i = 0; i < 12; i++) { const hx = 6 + i * 30; const hh = 14 + ((i * 7) % 16); ctx.fillRect(hx, 462 - hh, 22, hh + 24); ctx.fillStyle = i % 2 ? '#4E3226' : '#573A2C'; }
  // The platform.
  const plat = ctx.createLinearGradient(0, BASE_Y, 0, CH);
  plat.addColorStop(0, '#9A8662'); plat.addColorStop(1, '#3E3222');
  ctx.fillStyle = plat;
  ctx.fillRect(0, BASE_Y, CW, CH - BASE_Y);
  ctx.fillStyle = 'rgba(255,240,200,.3)';
  ctx.fillRect(0, BASE_Y, CW, 2);
  ctx.strokeStyle = 'rgba(40,30,18,.4)'; ctx.lineWidth = 1;
  for (let y = BASE_Y + 18; y < CH; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

  // The wall so far.
  const courses = [...s.stack, s.top];
  const landing = view.land && view.land.k < 1 ? view.land : null;
  courses.forEach((c, i) => {
    let y = courseY(i);
    if (landing && i === courses.length - 1) {
      const from = courseY(i) - 44;
      y = from + (courseY(i) - from) * landing.k;
      drawStone(ctx, landing.fromX + (c.x - landing.fromX) * 0, y, c.w, i, false);
      return;
    }
    drawStone(ctx, c.x, y, c.w, i, view.shine > 0 && i === courses.length - 1);
  });

  // Pieces cut away, and cracked stones, tumbling down.
  for (const d of view.debris) {
    ctx.save();
    ctx.translate(d.x + d.w / 2, d.y + BH / 2);
    ctx.rotate(d.rot);
    ctx.globalAlpha = Math.max(0, 1 - d.age / 1.1);
    ctx.fillStyle = d.cracked ? '#A89678' : '#D2C29C';
    ctx.fillRect(-d.w / 2, -BH / 2, d.w, BH);
    ctx.strokeStyle = '#6E5A3A'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-d.w / 2, -BH / 2, d.w, BH);
    if (d.cracked) { ctx.beginPath(); ctx.moveTo(-d.w * 0.1, -BH / 2); ctx.lineTo(d.w * 0.06, 0); ctx.lineTo(-d.w * 0.05, BH / 2); ctx.stroke(); }
    ctx.restore();
  }

  // Gusts of wind once the wall is high.
  if (s.placed >= WIND_FROM && !s.outcome) {
    const gust = 0.5 + 0.5 * Math.sin(s.t * 3.1);
    ctx.strokeStyle = `rgba(255,255,255,${0.1 + 0.22 * gust})`; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const wy = 70 + i * 34; const wx = ((t * (120 + 160 * gust) + i * 97) % (CW + 80)) - 60;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 22, wy - 5, wx + 46, wy); ctx.stroke();
    }
  }

  // The stone on the hoist.
  if (!s.outcome && s.wait <= 0) {
    const y = courseY(courses.length) - 44;
    ctx.strokeStyle = '#3A2A1A'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s.x + s.w / 2, 46); ctx.lineTo(s.x + s.w / 2, y - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s.x + s.w / 2, y - 8); ctx.lineTo(s.x + 8, y); ctx.moveTo(s.x + s.w / 2, y - 8); ctx.lineTo(s.x + s.w - 8, y); ctx.stroke();
    drawStone(ctx, s.x, y, s.w, courses.length, false);
    // Guide lines down to the course below.
    ctx.strokeStyle = 'rgba(255,240,200,.22)'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(s.top.x, y + BH); ctx.lineTo(s.top.x, courseY(courses.length - 1)); ctx.moveTo(s.top.x + s.top.w, y + BH); ctx.lineTo(s.top.x + s.top.w, courseY(courses.length - 1)); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Finished: the two bronze pillars (1 Kgs 7:21), the roof, and the glory.
  if (view.glory > 0) {
    const c = Math.min(1, view.glory);
    const topY = courseY(courses.length - 1);
    const cx = s.top.x + s.top.w / 2;
    ctx.save();
    ctx.globalAlpha = c;
    const gl = ctx.createRadialGradient(cx, topY, 8, cx, topY, 300);
    gl.addColorStop(0, 'rgba(255,248,215,.95)'); gl.addColorStop(.35, 'rgba(255,205,110,.5)'); gl.addColorStop(1, 'rgba(255,160,40,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, CW, CH);
    for (const side of [-1, 1]) {
      const px = cx + side * 118;
      const pg = ctx.createLinearGradient(px - 9, 0, px + 9, 0);
      pg.addColorStop(0, '#7A4E1E'); pg.addColorStop(.5, '#E2A85A'); pg.addColorStop(1, '#7A4E1E');
      ctx.fillStyle = pg;
      ctx.fillRect(px - 8, BASE_Y - 250 * c, 16, 250 * c);
      ctx.fillStyle = '#F0CE86';
      ctx.fillRect(px - 12, BASE_Y - 250 * c - 12, 24, 14);
    }
    ctx.fillStyle = '#C9A24E';
    ctx.fillRect(cx - 104, topY - 12, 208, 12);
    ctx.fillStyle = '#F6DE9A';
    ctx.fillRect(cx - 104, topY - 14, 208, 3);
    ctx.restore();
  }

  // HUD: courses laid + chances left.
  ctx.fillStyle = 'rgba(8,5,3,.74)';
  ctx.fillRect(0, 0, CW, 46);
  ctx.textAlign = 'left';
  ctx.font = '700 11px Cinzel, Georgia, serif';
  ctx.fillStyle = '#FFE2A8';
  ctx.fillText(`COURSES  ${s.placed} / ${COURSES}`, 10, 15);
  ctx.fillStyle = '#2A2018'; ctx.fillRect(10, 20, 160, 7);
  ctx.fillStyle = '#E9B85A'; ctx.fillRect(10, 20, 160 * (s.placed / COURSES), 7);
  ctx.textAlign = 'right';
  const left = CHANCES - s.misses;
  ctx.fillStyle = left <= 1 ? '#FF6B81' : '#FFE2A8';
  ctx.fillText('CHANCES', CW - 10, 15);
  for (let i = 0; i < CHANCES; i++) {
    ctx.fillStyle = i < left ? (left <= 1 ? '#FF4D6D' : '#F0A93C') : '#2A2018';
    ctx.fillRect(CW - 136 + i * 43, 20, 39, 7);
  }
  ctx.textAlign = 'left';
  ctx.font = '600 11px Segoe UI, sans-serif';
  ctx.fillStyle = '#D6C8AE';
  ctx.fillText(`Perfect stones: ${s.perfects}`, 10, 41);
  if (view.msg && view.msgT > 0) {
    ctx.textAlign = 'center';
    ctx.font = '700 16px Cinzel, Georgia, serif';
    ctx.fillStyle = `rgba(255,236,190,${Math.min(1, view.msgT)})`;
    ctx.fillText(view.msg, CW / 2, 76);
  }
}

/** Plays the build. Resolves 'win' after the victory screen, or 'quit'. */
export function playTempleBuilder({ rewards = [] } = {}) {
  return new Promise((resolve) => {
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'tb-overlay';
    overlay.innerHTML = `<div class="tb-card" role="dialog" aria-modal="true" aria-label="Building Solomon's Temple"></div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    const card = overlay.querySelector('.tb-card');
    let stopLoop = () => {};

    const finish = (result) => {
      stopLoop();
      overlay.remove();
      document.documentElement.style.overflow = '';
      resolve(result);
    };

    const openGuide = (returnFocus, onClose) => {
      let guide = card.querySelector('.tb-guide');
      if (!guide) {
        guide = document.createElement('div');
        guide.className = 'tb-guide';
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
      guide.querySelector('.tb-guide-scroll').scrollTop = 0;
      guide.querySelector('[data-act="guide-close"]').focus({ preventScroll: true });
    };

    const showTitle = () => {
      card.innerHTML = `
        <div class="tb-screen">
          <p class="tb-kicker">✦ The House of the LORD ✦</p>
          <h2>Building Solomon's Temple</h2>
          <p>"I intend to build a house for the name of the LORD, my God" (1 Kgs 5:19). Help King Solomon's builders raise the wall of the Temple, one stone at a time.</p>
          <div class="tb-how">
            A stone swings across on the hoist.<br>
            Tap <b>Set the Stone</b> when it is right above the wall.<br>
            Whatever <b>hangs over</b> is cut away, and the wall narrows.<br>
            A <b>perfect</b> stone keeps its size and widens the wall.<br>
            A stone that <b>misses</b> cracks. You have 3 chances.<br>
            High up, the <b>wind</b> makes the stone swing unevenly.<br>
            Lay <b>twelve courses</b> to finish the wall.
          </div>
          <button type="button" class="tb-go" data-act="begin">🏛️ Begin Building</button>
          <button type="button" class="tb-go ghost" data-act="guide">❔ How to Play</button>
          <button type="button" class="tb-go ghost" data-act="quit">Not yet</button>
        </div>`;
      card.querySelector('[data-act="begin"]').onclick = () => run();
      card.querySelector('[data-act="guide"]').onclick = (e) => openGuide(e.currentTarget);
      card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
      card.querySelector('[data-act="begin"]').focus({ preventScroll: true });
    };

    const run = () => {
      card.innerHTML = `
        <div class="tb-top"><p class="tb-kicker">✦ The Temple ✦</p><div class="tb-top-btns"><button type="button" class="tb-small" data-act="guide">❔ Guide</button><button type="button" class="tb-small" data-act="retreat">Leave</button></div></div>
        <div class="tb-stage"><canvas width="${CW}" height="${CH}" aria-label="The wall of the Temple being built"></canvas><div class="tb-pause" hidden>Paused — tap to continue</div></div>
        <div class="tb-pad"><button type="button" data-do="drop">Set the Stone</button></div>`;
      card.classList.add('running');
      const canvas = card.querySelector('canvas');
      const pauseEl = card.querySelector('.tb-pause');
      // Largest 360:560 canvas that fits the space the stage really has.
      const stage = card.querySelector('.tb-stage');
      const fit = () => {
        const r = stage.getBoundingClientRect();
        const scale = Math.max(0.3, Math.min((r.width - 20) / CW, r.height / CH));
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

      const s = newBuild();
      const view = { time: 0, msg: 'Set each stone squarely on the wall.', msgT: 2.4, debris: [], land: null, shine: 0, glory: 0 };
      let pendingDrop = false;
      let paused = false;
      let raf = 0;
      let last = performance.now();
      let ended = false;

      const setPaused = (p) => { paused = p; pauseEl.hidden = !p; last = performance.now(); };
      pauseEl.onclick = () => setPaused(false);
      const onVisibility = () => { if (document.hidden && !ended) setPaused(true); };
      document.addEventListener('visibilitychange', onVisibility);

      const press = () => { if (!paused && !ended && s.wait <= 0) pendingDrop = true; };
      const onKey = (e) => {
        if (e.repeat) return;
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); press(); }
        else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') setPaused(!paused);
      };
      document.addEventListener('keydown', onKey);
      const dropBtn = card.querySelector('[data-do="drop"]');
      dropBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
      canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });

      card.querySelector('[data-act="guide"]').onclick = (e) => { setPaused(true); pauseEl.hidden = true; openGuide(e.currentTarget, () => setPaused(false)); };
      card.querySelector('[data-act="retreat"]').onclick = () => {
        setPaused(true);
        if (confirm('Leave the building site? You can try again any time.')) finish('quit');
        else setPaused(false);
      };

      stopLoop = () => {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', fit);
        card.classList.remove('running');
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVisibility);
      };

      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!paused) {
          view.time += dt;
          if (!ended) {
            const hoverY = courseY(s.stack.length + 1) - 44;
            stepBuild(s, dt, pendingDrop);
            pendingDrop = false;
            if (typeof window.__templeTestHook === 'function') window.__templeTestHook(s); // screenshot tests only
            for (const ev of s.events) {
              if (ev.type === 'perfect') { view.msg = s.placed === WIND_FROM ? 'Perfect! But the wind is rising…' : 'Perfect! The wall grows wider.'; view.msgT = s.placed === WIND_FROM ? 1.8 : 1.3; view.land = { k: 0, fromX: ev.placed.x }; view.shine = 0.6; }
              if (ev.type === 'set') {
                view.msg = s.placed === WIND_FROM ? 'The wind is rising!' : `Stone set. ${s.placed} of ${COURSES}`; view.msgT = s.placed === WIND_FROM ? 1.8 : 1; view.land = { k: 0, fromX: ev.placed.x };
                view.debris.push({ x: ev.cut.x, w: ev.cut.w, y: hoverY, vy: 40, vx: ev.cut.x < ev.placed.x ? -50 : 50, rot: 0, vr: ev.cut.x < ev.placed.x ? -3 : 3, age: 0, cracked: false });
              }
              if (ev.type === 'miss') {
                view.msg = 'The stone cracked!'; view.msgT = 1.3;
                view.debris.push({ x: ev.from.x, w: ev.from.w, y: hoverY, vy: 60, vx: 0, rot: 0, vr: 1.2, age: 0, cracked: true });
              }
            }
            if (s.outcome) {
              ended = true;
              if (s.outcome === 'win') { view.msg = 'The wall is raised!'; view.msgT = 3; }
              setTimeout(() => (s.outcome === 'win' ? victory() : defeat()), s.outcome === 'win' ? 2800 : 1100);
            }
          } else if (s.outcome === 'win') {
            view.glory = Math.min(1, view.glory + dt * 0.6);
          }
          if (view.land) { view.land.k = Math.min(1, view.land.k + dt * 7); if (view.land.k >= 1) view.land = null; }
          for (const d of view.debris) { d.age += dt; d.vy += 900 * dt; d.y += d.vy * dt; d.x += d.vx * dt; d.rot += d.vr * dt; }
          view.debris = view.debris.filter((d) => d.age < 1.1);
          view.shine = Math.max(0, view.shine - dt);
          view.msgT = Math.max(0, view.msgT - dt);
        }
        render(ctx, s, view);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      dropBtn.focus({ preventScroll: true });

      const victory = () => {
        stopLoop();
        card.innerHTML = `
          <div class="tb-screen win">
            <p class="tb-kicker">✦ Victory ✦</p>
            <h2>The Temple Is Raised</h2>
            <p>Twelve courses laid${s.perfects ? `, ${s.perfects} of them perfect` : ''}. When the Temple was finished, "the glory of the LORD had filled the house of the LORD" (1 Kgs 8:11). God had come to dwell among His people.</p>
            ${rewards.length ? `<div class="tb-rewards">${rewards.map((x) => `<span>${x}</span>`).join('')}</div>` : ''}
            <button type="button" class="tb-go" data-act="done">Claim Your Rewards</button>
          </div>`;
        const done = card.querySelector('[data-act="done"]');
        done.onclick = () => finish('win');
        done.focus({ preventScroll: true });
      };

      const defeat = () => {
        stopLoop();
        card.innerHTML = `
          <div class="tb-screen">
            <p class="tb-kicker">✦ Three Stones Cracked ✦</p>
            <h2>The Wall Must Wait</h2>
            <p>You laid ${s.placed} of ${COURSES} courses. "Unless the LORD build the house, they labor in vain who build" (Ps 127:1). Take a breath, watch one full swing, and build again.</p>
            <button type="button" class="tb-go" data-act="again">🏛️ Try Again</button>
            <button type="button" class="tb-go ghost" data-act="quit">Leave for now</button>
          </div>`;
        card.querySelector('[data-act="again"]').onclick = () => run();
        card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
        card.querySelector('[data-act="again"]').focus({ preventScroll: true });
      };
    };

    showTitle();
  });
}
