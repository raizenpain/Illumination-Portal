// ============================================
// ASCENT OF MOUNT SINAI — the Final Season's second game chapter (Jornie,
// 2026-10-05), after "The Covenant at Sinai". No questions, no star; it
// must be cleared to continue (season.js awards the node on victory).
//
// Climb the mountain as Moses (Ex 19:20). He leaps from ledge to ledge on
// his own; the student only steers:
//   ◀ ▶ (hold) / arrow keys / hold a side of the mountain   steer
//   Stone ledges        safe footing
//   Cracked ledges      crumble after one step
//   Drifting ledges     slide from side to side (higher up)
//   Lightning           a flashing column is about to be struck — leave it
//   Falling rocks       tumble down the slope — step aside
//   Manna               restores one Strength
// A fall, a bolt or a rock costs one Strength (4). Reach the summit
// (400 m) to receive the tablets. Running out costs nothing: "Try Again".
//
// Logic (newClimb / stepClimb) is pure and exported for testing; drawing
// and input live in playSinaiAscent({ rewards }) -> Promise<'win' | 'quit'>.
// ============================================

export const GOAL_M = 400;
export const WORLD_W = 360;
export const VIEW_H = 560;
export const STRENGTH_MAX = 4;
const PX_PER_M = 10;
const GOAL_Y = GOAL_M * PX_PER_M;
const GRAVITY = 900;
const JUMP_V = 445;   // leap height ≈ 110
const MOVE_V = 200;
const HALF = 9;       // how far past a ledge's edge the feet still catch
const CAM_LEAD = 230; // the climber stays this far above the bottom edge

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- pure game logic ----------

export function newClimb() {
  const ground = { x: 0, w: WORLD_W, y: 0, type: 'ground' };
  return {
    t: 0, x: WORLD_W / 2, y: 0, vy: 0, cam: -40, strength: STRENGTH_MAX, invuln: 0,
    manna: 0, hits: 0, falls: 0, ledges: [ground], items: [], bolts: [], rocks: [],
    safe: ground, last: ground, genY: 0, genX: WORLD_W / 2, genDone: false,
    nextBolt: 0, nextRock: 0, outcome: null, events: []
  };
}

// The main chain of ledges is always climbable (solid or drifting, never
// cracked); cracked ledges are only ever extras off to the side.
function generate(s, upTo) {
  while (!s.genDone && s.genY < upTo) {
    const p = s.genY / GOAL_Y;
    const remaining = GOAL_Y - s.genY;
    if (remaining <= 78) {
      s.ledges.push({ x: 0, w: WORLD_W, y: GOAL_Y, type: 'summit' });
      s.genDone = true;
      break;
    }
    const gap = remaining < 126 ? remaining / 2 : rand(48, 60 + 18 * p);
    const w = 72 - 20 * p;
    const y = s.genY + gap;
    const cx = clamp(s.genX + rand(-1, 1) * (70 + 45 * p), w / 2 + 10, WORLD_W - w / 2 - 10);
    const ledge = { x: cx - w / 2, w, y, type: 'rock' };
    if (p > 0.3 && Math.random() < 0.24) {
      ledge.type = 'moving';
      ledge.vx = (Math.random() < 0.5 ? -1 : 1) * rand(32, 55);
      ledge.min = clamp(ledge.x - 45, 8, WORLD_W - w - 8);
      ledge.max = clamp(ledge.x + 45, 8, WORLD_W - w - 8);
    } else if (y > 250 && Math.random() < 0.07) {
      s.items.push({ x: cx, y: y + 30, taken: false });
    }
    s.ledges.push(ledge);
    if (y > 150 && Math.random() < 0.38) {
      const side = cx > WORLD_W / 2 ? -1 : 1;
      const ex = clamp(cx + side * rand(115, 170), 35, WORLD_W - 35);
      s.ledges.push({ x: ex - 25, w: 50, y: y + rand(-14, 20), type: 'crumble', broken: false });
    }
    s.genY = y;
    s.genX = cx;
  }
}

function hurt(s, type) {
  s.strength -= 1;
  s.hits += 1;
  s.invuln = 1.5;
  s.events.push({ type });
  if (s.strength <= 0) { s.strength = 0; s.outcome = 'lose'; }
}

/** Advances the climb by dt seconds. dir: -1, 0 or +1 (steering). */
export function stepClimb(s, dt, dir = 0) {
  s.events = [];
  if (s.outcome) return s;
  s.t += dt;
  s.invuln = Math.max(0, s.invuln - dt);
  generate(s, s.cam + VIEW_H + 200);
  const p = clamp(s.y / GOAL_Y, 0, 1);

  for (const l of s.ledges) {
    if (l.type !== 'moving') continue;
    l.x += l.vx * dt;
    if (l.x <= l.min) { l.x = l.min; l.vx = Math.abs(l.vx); }
    if (l.x >= l.max) { l.x = l.max; l.vx = -Math.abs(l.vx); }
  }

  // The climber: steer sideways, leap again on every landing.
  const prevY = s.y;
  s.x = clamp(s.x + dir * MOVE_V * dt, 12, WORLD_W - 12);
  s.vy -= GRAVITY * dt;
  s.y += s.vy * dt;
  if (s.vy <= 0) {
    for (const l of s.ledges) {
      if (l.broken || prevY < l.y || s.y > l.y || s.x < l.x - HALF || s.x > l.x + l.w + HALF) continue;
      s.y = l.y;
      s.vy = JUMP_V;
      s.last = l;
      if (l.type === 'summit') { s.vy = 0; s.outcome = 'win'; return s; }
      if (l.type === 'crumble') { l.broken = true; s.events.push({ type: 'crumble' }); }
      else s.safe = l;
      break;
    }
  }
  s.cam = Math.max(s.cam, s.y - CAM_LEAD);

  // A fall: lose one Strength and start again from the last sure footing.
  if (s.y < s.cam - 30) {
    s.falls += 1;
    hurt(s, 'fall');
    if (s.outcome) return s;
    const l = s.safe;
    s.x = l.x + l.w / 2; s.y = l.y; s.vy = JUMP_V; s.last = l;
    s.cam = Math.max(-40, l.y - 150);
    s.invuln = 1.8;
    s.rocks = [];
  }

  // Lightning (from 40 m): a column flashes, then is struck.
  if (s.y > 400) {
    if (!s.nextBolt) s.nextBolt = s.t + 1.5;
    if (s.t >= s.nextBolt) {
      const x = Math.random() < 0.45 ? s.x : rand(40, WORLD_W - 40);
      s.bolts.push({ x: clamp(x, 32, WORLD_W - 32), w: 64, warn: 1.3, active: 0.18 });
      s.nextBolt = s.t + rand(4.4, 7) - 1.0 * p;
    }
  }
  for (const b of s.bolts) {
    if (b.warn > 0) { b.warn -= dt; continue; }
    b.active -= dt;
    if (b.active > 0 && s.invuln <= 0 && Math.abs(s.x - b.x) < b.w / 2 + 4) hurt(s, 'bolt');
  }
  s.bolts = s.bolts.filter((b) => b.warn > 0 || b.active > 0);

  // Falling rocks (from 150 m).
  if (s.y > 1500) {
    if (!s.nextRock) s.nextRock = s.t + 1;
    if (s.t >= s.nextRock) {
      const x = Math.random() < 0.35 ? s.x + rand(-45, 45) : rand(20, WORLD_W - 20);
      s.rocks.push({ x: clamp(x, 16, WORLD_W - 16), y: s.cam + VIEW_H + 20, vy: -rand(135, 185), r: 11, spin: rand(0, 6) });
      s.nextRock = s.t + rand(3.4, 5.6) - 1.0 * p;
    }
  }
  for (const r of s.rocks) {
    r.y += r.vy * dt;
    if (!r.done && s.invuln <= 0 && Math.abs(r.x - s.x) < r.r + 8 && Math.abs(r.y - (s.y + 14)) < r.r + 13) {
      r.done = true;
      hurt(s, 'rock');
    }
  }
  s.rocks = s.rocks.filter((r) => !r.done && r.y > s.cam - 30);

  for (const m of s.items) {
    if (m.taken || Math.abs(m.x - s.x) > 18 || Math.abs(m.y - (s.y + 14)) > 22) continue;
    m.taken = true;
    s.manna += 1;
    s.strength = Math.min(STRENGTH_MAX, s.strength + 1);
    s.events.push({ type: 'manna' });
  }

  s.ledges = s.ledges.filter((l) => l === s.safe || l.y > s.cam - 80);
  s.items = s.items.filter((m) => !m.taken && m.y > s.cam - 40);
  return s;
}

// ---------- presentation ----------

const CSS = `
@keyframes saFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes saRise { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
.sa-overlay {
  position: fixed; inset: 0; z-index: 10400; display: flex; align-items: center; justify-content: center;
  padding: 10px; box-sizing: border-box; overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, rgba(255,190,90,.22), transparent 55%), radial-gradient(ellipse at 50% 110%, rgba(110,50,20,.5), transparent 55%), #070504;
  font-family: 'Segoe UI', system-ui, sans-serif; color: #E8DCC4; animation: saFade .4s ease;
}
.sa-card {
  position: relative; width: min(440px, 100%); max-height: calc(100vh - 20px); max-height: calc(100dvh - 20px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
  background: linear-gradient(170deg, #1B1410 0%, #0F0B09 60%, #080605 100%);
  border: 1px solid #5A4226; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #0B0806, inset 0 0 0 5px rgba(201,146,58,.45), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.85), 0 0 90px rgba(255,170,60,.14);
  animation: saRise .5s cubic-bezier(.2,.9,.3,1.1);
}
.sa-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px 6px; }
.sa-kicker { margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A; }
.sa-top-btns { display: flex; gap: 6px; }
.sa-small, .sa-small:hover { margin: 0; padding: 5px 9px; border-radius: 3px; cursor: pointer; font: 600 11px 'Segoe UI', sans-serif; letter-spacing: .5px; text-transform: uppercase; color: #C9B79A; background: transparent; border: 1px solid #5A4226; }
.sa-small:hover { color: #FFF1D6; border-color: #C9923A; }
/* While climbing, the card takes the screen height (capped), and the
   canvas is sized by JS to the largest 360:560 box that fits the stage —
   so it fits short laptop windows and small phones alike. */
.sa-card.running { height: min(calc(100vh - 20px), 860px); height: min(calc(100dvh - 20px), 860px); }
.sa-stage { position: relative; flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 10px; overflow: hidden; }
.sa-stage canvas { display: block; border-radius: 4px; touch-action: none; background: #120D0A; border: 1px solid #3A2A18; }
.sa-pause { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(8,5,3,.72); font-family: 'Cinzel', Georgia, serif; font-size: 18px; color: #FFF1D6; cursor: pointer; }
.sa-pause[hidden] { display: none; }
.sa-pad { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 12px 12px; }
.sa-pad button, .sa-pad button:hover {
  margin: 0; padding: 14px 6px; cursor: pointer; border-radius: 6px; font-size: 22px; line-height: 1;
  color: #FFF1D6; background: linear-gradient(180deg, #33261A, #1A130D); border: 1px solid #5A4226;
  -webkit-user-select: none; user-select: none; touch-action: none; -webkit-touch-callout: none;
}
.sa-pad button:active, .sa-pad button.held, .sa-pad button.held:hover { background: linear-gradient(180deg, #5A4226, #33261A); border-color: #E9B85A; }
.sa-pad button:focus-visible, .sa-go:focus-visible, .sa-small:focus-visible { outline: 2px solid #FFD98A; outline-offset: 2px; }
.sa-screen { flex: 1 1 auto; min-height: 0; padding: 20px 20px 18px; text-align: center; overflow-y: auto; }
@media (max-height: 520px) { .sa-screen { padding: 12px 16px 12px; } .sa-screen h2 { font-size: 20px; } .sa-how { font-size: 12px; } .sa-go, .sa-go:hover { margin-top: 10px; padding: 10px 14px; } }
.sa-screen h2 { margin: 6px 0 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 25px; line-height: 1.2; color: #FFD9A0; text-shadow: 0 0 16px rgba(255,160,60,.45); }
.sa-screen.win h2 { color: #FFE9B8; text-shadow: 0 0 20px rgba(255,210,110,.6); }
.sa-screen p { margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #D6C8AE; }
.sa-how { margin: 14px 0 0; padding: 10px 12px; text-align: left; font-size: 13px; line-height: 1.55; color: #D6C8AE; background: rgba(0,0,0,.3); border: 1px solid rgba(201,146,58,.35); border-radius: 4px; }
.sa-how b { color: #FFE2A8; }
.sa-rewards { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 14px 0 0; }
.sa-rewards span { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #FFE2A8; background: rgba(233,184,90,.14); border: 1px solid rgba(233,184,90,.5); }
.sa-rewards img { width: 16px; height: 16px; }
.sa-go, .sa-go:hover {
  display: block; width: 100%; margin: 16px 0 0; padding: 13px 16px; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
}
.sa-go:hover { filter: brightness(1.1); }
.sa-go.ghost, .sa-go.ghost:hover { margin-top: 8px; color: #D6C8AE; font-size: 12.5px; background: rgba(255,255,255,.04); border-color: #5A4226; box-shadow: none; }
.sa-guide { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; background: #0A0705; }
.sa-guide[hidden] { display: none; }
.sa-guide-scroll { flex: 1; overflow-y: auto; padding: 18px 18px 6px; }
.sa-guide h3 { margin: 0 0 10px; text-align: center; font-family: 'Cinzel', Georgia, serif; font-size: 20px; color: #FFE2A8; }
.sa-guide h4 { margin: 14px 0 6px; font-family: 'Cinzel', Georgia, serif; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #E0A050; }
.sa-guide p, .sa-guide li { font-size: 13.5px; line-height: 1.55; color: #D6C8AE; }
.sa-guide p { margin: 0 0 6px; }
.sa-guide ul { margin: 0; padding-left: 18px; }
.sa-guide b { color: #FFE2A8; }
.sa-guide .tip { margin-top: 12px; padding: 9px 11px; border-radius: 4px; background: rgba(233,184,90,.1); border: 1px solid rgba(233,184,90,.4); }
.sa-guide-foot { padding: 8px 18px 16px; }
@media (max-height: 700px) { .sa-pad button, .sa-pad button:hover { padding: 10px 6px; } .sa-top { padding: 7px 10px 4px; } .sa-pad { padding: 7px 10px 9px; } }
@media (max-width: 400px) {
  .sa-kicker { font-size: 10px; letter-spacing: 1.5px; white-space: nowrap; }
  .sa-small, .sa-small:hover { padding: 5px 7px; font-size: 10px; white-space: nowrap; }
}
`;

const GUIDE_HTML = `
  <div class="sa-guide-scroll">
    <h3>How to Play</h3>
    <p>God is calling Moses to the top of the mountain. Climb through the storm and reach the <b>summit (400 m)</b> to receive the tablets of the covenant.</p>
    <h4>Climbing</h4>
    <ul>
      <li>Moses <b>leaps by himself</b> every time he lands. You only steer him.</li>
      <li><b>Hold ◀ or ▶</b>, hold the <b>arrow keys</b> (or A / D), or <b>press and hold the left or right side</b> of the mountain.</li>
      <li>Land on a ledge higher up to keep climbing. You can pass through a ledge from below.</li>
    </ul>
    <h4>The Ledges</h4>
    <ul>
      <li><b>Stone ledges</b>: safe footing.</li>
      <li><b>Cracked ledges</b> (pale, with cracks): they crumble after one step. Do not stay on them.</li>
      <li><b>Drifting ledges</b> (with gold marks): they slide from side to side higher up the mountain.</li>
    </ul>
    <h4>The Storm</h4>
    <ul>
      <li><b>Lightning</b>: a flashing column marked <b>!</b> is about to be struck. Steer out of it!</li>
      <li><b>Falling rocks</b>: they tumble down the slope. Step aside.</li>
      <li><b>Manna</b> (glowing bread): restores one Strength.</li>
    </ul>
    <h4>Strength</h4>
    <p>You have <b>4 Strength</b>. A fall, a lightning bolt or a rock costs one. After a fall, Moses starts again from the last stone ledge he stood on.</p>
    <p class="tip">💡 <b>Tip:</b> There is no timer, so do not rush. Keep leaping on a safe ledge until the lightning passes, then go up. If your Strength runs out, nothing is lost: tap <b>Try Again</b>.</p>
  </div>
  <div class="sa-guide-foot"><button type="button" class="sa-go" data-act="guide-close">Back to the Mountain</button></div>`;

function injectStyles() {
  if (document.getElementById('sinaiAscentStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'sinaiAscentStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const CW = WORLD_W;
const CH = VIEW_H;

function drawLedge(ctx, l, sy, t) {
  if (l.type === 'summit' || l.type === 'ground') {
    const g = ctx.createLinearGradient(0, sy, 0, sy + 60);
    g.addColorStop(0, l.type === 'summit' ? '#8A6A44' : '#5E452B'); g.addColorStop(1, '#1E1610');
    ctx.fillStyle = g;
    ctx.fillRect(0, sy, CW, 80);
    ctx.fillStyle = l.type === 'summit' ? 'rgba(255,225,150,.75)' : 'rgba(255,220,160,.18)';
    ctx.fillRect(0, sy, CW, 3);
    return;
  }
  const crumble = l.type === 'crumble';
  const h = 13;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(l.x + l.w / 2, sy + h + 5, l.w / 2, 4, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, sy, 0, sy + h);
  if (crumble) { g.addColorStop(0, '#B79C74'); g.addColorStop(1, '#6E5A3E'); } else { g.addColorStop(0, '#7C6E62'); g.addColorStop(1, '#3B332D'); }
  ctx.fillStyle = g;
  ctx.strokeStyle = crumble ? '#4A3A24' : '#1C1714';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(l.x + 3, sy); ctx.lineTo(l.x + l.w - 3, sy); ctx.lineTo(l.x + l.w, sy + 5); ctx.lineTo(l.x + l.w - 7, sy + h); ctx.lineTo(l.x + 7, sy + h); ctx.lineTo(l.x, sy + 5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = crumble ? 'rgba(255,245,220,.35)' : 'rgba(255,255,255,.22)';
  ctx.fillRect(l.x + 4, sy + 1, l.w - 8, 2);
  if (crumble) {
    ctx.strokeStyle = '#3A2C18'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(l.x + l.w * 0.3, sy + 1); ctx.lineTo(l.x + l.w * 0.38, sy + 6); ctx.lineTo(l.x + l.w * 0.32, sy + h - 1);
    ctx.moveTo(l.x + l.w * 0.66, sy + 1); ctx.lineTo(l.x + l.w * 0.6, sy + 7); ctx.lineTo(l.x + l.w * 0.7, sy + h - 1);
    ctx.stroke();
  } else if (l.type === 'moving') {
    ctx.fillStyle = '#E9B85A';
    const a = Math.sin(t * 6) * 1.5;
    for (const side of [-1, 1]) {
      const ax = l.x + l.w / 2 + side * (l.w / 2 - 12) + side * a;
      ctx.beginPath(); ctx.moveTo(ax + side * 5, sy + 7); ctx.lineTo(ax - side * 2, sy + 3.5); ctx.lineTo(ax - side * 2, sy + 10.5); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

function drawMoses(ctx, x, sy, s, t, facing) {
  const stretch = clamp(s.vy / JUMP_V, -1, 1) * 0.12;
  ctx.save();
  ctx.translate(x, sy);
  ctx.scale(1 - stretch * 0.6, 1 + stretch);
  // staff
  ctx.strokeStyle = '#9A7440'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(facing * 10, 0); ctx.lineTo(facing * 12, -36); ctx.stroke();
  // robe
  ctx.shadowColor = 'rgba(255,235,190,.55)'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#D8C39A';
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-9, 0); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#8A3A2A';
  ctx.beginPath(); ctx.moveTo(-2, -22); ctx.lineTo(3, -22); ctx.lineTo(7, -2); ctx.lineTo(3, -2); ctx.closePath(); ctx.fill();
  // head, hair and beard
  ctx.fillStyle = '#E7C9A0';
  ctx.beginPath(); ctx.arc(0, -28, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ECECEC';
  ctx.beginPath(); ctx.arc(0, -29.5, 5.2, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4, -26.5); ctx.lineTo(4, -26.5); ctx.lineTo(0, -19); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function render(ctx, s, view) {
  const t = view.time;
  const p = clamp((s.cam + CAM_LEAD) / GOAL_Y, 0, 1);
  const sy = (alt) => CH - (alt - s.cam);

  // Sky: desert dusk at the foot, storm near the top.
  const sky = ctx.createLinearGradient(0, 0, 0, CH);
  const mix = (a, b) => Math.round(a + (b - a) * p);
  sky.addColorStop(0, `rgb(${mix(58, 14)},${mix(44, 12)},${mix(78, 20)})`);
  sky.addColorStop(1, `rgb(${mix(176, 44)},${mix(96, 30)},${mix(58, 30)})`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, CH);

  // The mountain face, with rock strata drifting past as you climb.
  const face = ctx.createLinearGradient(0, 0, CW, 0);
  face.addColorStop(0, 'rgba(20,14,10,.78)'); face.addColorStop(.5, 'rgba(52,38,27,.62)'); face.addColorStop(1, 'rgba(20,14,10,.78)');
  ctx.fillStyle = face;
  ctx.fillRect(0, 0, CW, CH);
  ctx.strokeStyle = 'rgba(255,220,170,.06)';
  ctx.lineWidth = 2;
  const off = (s.cam * 0.6) % 46;
  for (let y = -46 + off; y < CH + 46; y += 46) {
    ctx.beginPath();
    for (let x = 0; x <= CW; x += 20) ctx.lineTo(x, y + Math.sin(x / 40 + Math.floor((y - off) / 46)) * 5 + x * 0.05);
    ctx.stroke();
  }

  // The cloud and fire on the summit (Ex 19:18), nearer as you climb.
  const glowY = Math.max(-140, sy(GOAL_Y) - 60);
  if (glowY < CH) {
    const reach = 260 + 120 * p;
    const g = ctx.createRadialGradient(CW / 2, glowY, 10, CW / 2, glowY, reach);
    g.addColorStop(0, `rgba(255,236,180,${0.25 + 0.5 * p})`); g.addColorStop(.4, `rgba(255,150,50,${0.1 + 0.2 * p})`); g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, glowY - reach, CW, reach * 2);
  }
  // Storm clouds rolling along the top edge.
  if (p > 0.1) {
    ctx.fillStyle = `rgba(16,14,22,${Math.min(0.85, p)})`;
    for (let i = 0; i < 7; i++) {
      const cx = ((i * 70 + t * (10 + i * 2)) % (CW + 140)) - 70;
      ctx.beginPath(); ctx.ellipse(cx, 44 + Math.sin(i * 2.1) * 8, 62, 22 + (i % 3) * 5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Lightning: warning column, then the strike.
  for (const b of s.bolts) {
    const x0 = b.x - b.w / 2;
    if (b.warn > 0) {
      ctx.fillStyle = `rgba(255,240,150,${0.14 + 0.14 * Math.sin(t * 20)})`;
      ctx.fillRect(x0, 0, b.w, CH);
      ctx.strokeStyle = 'rgba(255,240,150,.5)'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
      ctx.strokeRect(x0 + 0.5, -2, b.w - 1, CH + 4);
      ctx.setLineDash([]);
      ctx.fillStyle = '#FFF4C0';
      ctx.font = '700 22px Cinzel, Georgia, serif';
      ctx.textAlign = 'center';
      for (let y = 90; y < CH; y += 130) ctx.fillText('!', b.x, y);
    } else {
      ctx.fillStyle = 'rgba(255,250,210,.4)';
      ctx.fillRect(x0, 0, b.w, CH);
      ctx.save();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; ctx.lineJoin = 'bevel';
      ctx.shadowColor = '#FFE680'; ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(b.x, 0);
      for (let y = 40, i = 0; y <= CH; y += 40, i++) ctx.lineTo(b.x + ((i % 2) ? 14 : -14) + Math.sin(i * 7 + b.x) * 8, y);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Ledges and manna.
  for (const l of s.ledges) {
    if (l.broken) continue;
    const y = sy(l.y);
    if (y < -30 || y > CH + 30) continue;
    drawLedge(ctx, l, y, t);
  }
  for (const m of s.items) {
    if (m.taken) continue;
    const y = sy(m.y) + Math.sin(t * 4 + m.x) * 2.5;
    if (y < -20 || y > CH + 20) continue;
    ctx.save();
    ctx.shadowColor = 'rgba(255,235,160,.95)'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#FFF3D0';
    ctx.beginPath(); ctx.ellipse(m.x, y, 9, 6.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#D9A441'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(m.x - 4, y - 2); ctx.lineTo(m.x + 4, y + 2); ctx.moveTo(m.x + 4, y - 2); ctx.lineTo(m.x - 4, y + 2); ctx.stroke();
    ctx.restore();
  }

  // Falling rocks.
  for (const r of s.rocks) {
    const y = sy(r.y);
    if (y < -30 || y > CH + 30) continue;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,220,170,.22)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(r.x - 5, y - 16); ctx.lineTo(r.x - 5, y - 34); ctx.moveTo(r.x + 5, y - 14); ctx.lineTo(r.x + 5, y - 28); ctx.stroke();
    ctx.translate(r.x, y);
    ctx.rotate(r.spin + t * 5);
    ctx.fillStyle = '#5A514A'; ctx.strokeStyle = '#231E1A'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-11, 2); ctx.lineTo(-7, -9); ctx.lineTo(4, -11); ctx.lineTo(11, -3); ctx.lineTo(8, 9); ctx.lineTo(-4, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(2, -8); ctx.lineTo(4, -3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Moses.
  const blink = s.invuln > 0 && !s.outcome && Math.floor(t * 12) % 2 === 0;
  if (!blink) drawMoses(ctx, s.x, sy(s.y), s, t, view.facing);

  // Victory: the tablets are given in light.
  if (view.glory > 0) {
    const c = Math.min(1, view.glory);
    const gy = sy(GOAL_Y) - 96;
    const g = ctx.createRadialGradient(CW / 2, gy, 6, CW / 2, gy, 320);
    g.addColorStop(0, `rgba(255,250,225,${0.95 * c})`); g.addColorStop(.3, `rgba(255,210,120,${0.55 * c})`); g.addColorStop(1, 'rgba(255,160,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CW, CH);
    ctx.save();
    ctx.globalAlpha = c;
    ctx.translate(CW / 2, gy + (1 - c) * 20);
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#B9B2A6'; ctx.strokeStyle = '#5A544A'; ctx.lineWidth = 2;
      ctx.beginPath();
      const x0 = side === -1 ? -27 : 1;
      ctx.moveTo(x0, 22); ctx.lineTo(x0, -12); ctx.arc(x0 + 13, -12, 13, Math.PI, 0); ctx.lineTo(x0 + 26, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#6A6258'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x0 + 5, -10 + i * 7); ctx.lineTo(x0 + 21, -10 + i * 7); ctx.stroke(); }
    }
    ctx.restore();
  }

  // HUD: height climbed + Strength.
  ctx.fillStyle = 'rgba(8,5,3,.74)';
  ctx.fillRect(0, 0, CW, 46);
  const climbed = Math.max(0, Math.min(GOAL_M, Math.floor(s.last.y / PX_PER_M)));
  ctx.textAlign = 'left';
  ctx.font = '700 11px Cinzel, Georgia, serif';
  ctx.fillStyle = '#FFE2A8';
  ctx.fillText(`SUMMIT  ${climbed} / ${GOAL_M} m`, 10, 15);
  ctx.fillStyle = '#2A2018'; ctx.fillRect(10, 20, 160, 7);
  ctx.fillStyle = '#E9B85A'; ctx.fillRect(10, 20, 160 * (climbed / GOAL_M), 7);
  ctx.textAlign = 'right';
  ctx.fillStyle = s.strength <= 1 ? '#FF6B81' : '#FFE2A8';
  ctx.fillText('STRENGTH', CW - 10, 15);
  for (let i = 0; i < STRENGTH_MAX; i++) {
    ctx.fillStyle = i < s.strength ? (s.strength <= 1 ? '#FF4D6D' : '#F0A93C') : '#2A2018';
    ctx.fillRect(CW - 170 + i * 41, 20, 37, 7);
  }
  ctx.textAlign = 'left';
  ctx.font = '600 11px Segoe UI, sans-serif';
  ctx.fillStyle = '#D6C8AE';
  ctx.fillText(`Manna: ${s.manna}`, 10, 41);
  if (view.msg && view.msgT > 0) {
    ctx.textAlign = 'center';
    ctx.font = '700 16px Cinzel, Georgia, serif';
    ctx.fillStyle = `rgba(255,236,190,${Math.min(1, view.msgT)})`;
    ctx.fillText(view.msg, CW / 2, 80);
  }
}

/** Plays the ascent. Resolves 'win' after the victory screen, or 'quit'. */
export function playSinaiAscent({ rewards = [] } = {}) {
  return new Promise((resolve) => {
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'sa-overlay';
    overlay.innerHTML = `<div class="sa-card" role="dialog" aria-modal="true" aria-label="Ascent of Mount Sinai"></div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    const card = overlay.querySelector('.sa-card');
    let stopLoop = () => {};

    const finish = (result) => {
      stopLoop();
      overlay.remove();
      document.documentElement.style.overflow = '';
      resolve(result);
    };

    const openGuide = (returnFocus, onClose) => {
      let guide = card.querySelector('.sa-guide');
      if (!guide) {
        guide = document.createElement('div');
        guide.className = 'sa-guide';
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
      guide.querySelector('.sa-guide-scroll').scrollTop = 0;
      guide.querySelector('[data-act="guide-close"]').focus({ preventScroll: true });
    };

    const showTitle = () => {
      card.innerHTML = `
        <div class="sa-screen">
          <p class="sa-kicker">✦ The Ascent ✦</p>
          <h2>Ascent of Mount Sinai</h2>
          <p>"There were peals of thunder and lightning, and a heavy cloud over the mountain" (Ex 19:16). God is calling Moses to the summit to give His people the covenant. Climb!</p>
          <div class="sa-how">
            Moses <b>leaps by himself</b>. You steer him.<br>
            <b>Hold ◀ ▶</b> (or arrow keys, or hold a side of the mountain).<br>
            <b>Cracked ledges</b> crumble after one step.<br>
            <b>Flashing columns (!)</b>: lightning is coming. Get out!<br>
            <b>Falling rocks</b>: step aside. <b>Manna</b> restores Strength.<br>
            Reach the <b>summit (400 m)</b> before your Strength runs out.
          </div>
          <button type="button" class="sa-go" data-act="begin">⛰️ Begin the Climb</button>
          <button type="button" class="sa-go ghost" data-act="guide">❔ How to Play</button>
          <button type="button" class="sa-go ghost" data-act="quit">Not yet</button>
        </div>`;
      card.querySelector('[data-act="begin"]').onclick = () => run();
      card.querySelector('[data-act="guide"]').onclick = (e) => openGuide(e.currentTarget);
      card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
      card.querySelector('[data-act="begin"]').focus({ preventScroll: true });
    };

    const run = () => {
      card.innerHTML = `
        <div class="sa-top"><p class="sa-kicker">✦ The Ascent ✦</p><div class="sa-top-btns"><button type="button" class="sa-small" data-act="guide">❔ Guide</button><button type="button" class="sa-small" data-act="retreat">Descend</button></div></div>
        <div class="sa-stage"><canvas width="${CW}" height="${CH}" aria-label="The slope of Mount Sinai"></canvas><div class="sa-pause" hidden>Paused — tap to continue</div></div>
        <div class="sa-pad"><button type="button" data-move="-1" aria-label="Steer left">◀</button><button type="button" data-move="1" aria-label="Steer right">▶</button></div>`;
      card.classList.add('running');
      const canvas = card.querySelector('canvas');
      const pauseEl = card.querySelector('.sa-pause');
      // Largest 360:560 canvas that fits the space the stage really has.
      const stage = card.querySelector('.sa-stage');
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

      const s = newClimb();
      const view = { time: 0, msg: 'Climb! The LORD is calling.', msgT: 2.2, glory: 0, facing: 1 };
      // Steering is held, not tapped: keys, the two buttons, or a side of the canvas.
      const held = { keyL: false, keyR: false, btnL: false, btnR: false, touch: 0 };
      const steer = () => clamp((held.keyR || held.btnR ? 1 : 0) - (held.keyL || held.btnL ? 1 : 0) + held.touch, -1, 1);
      const release = () => { held.keyL = held.keyR = held.btnL = held.btnR = false; held.touch = 0; card.querySelectorAll('[data-move]').forEach((b) => b.classList.remove('held')); };
      let paused = false;
      let raf = 0;
      let last = performance.now();
      let ended = false;

      const setPaused = (p) => { paused = p; pauseEl.hidden = !p; last = performance.now(); if (p) release(); };
      pauseEl.onclick = () => setPaused(false);
      const onVisibility = () => { if (document.hidden && !ended) setPaused(true); };
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('blur', release);

      const keyDir = (e) => (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ? -1 : (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ? 1 : 0));
      const onKeyDown = (e) => {
        const d = keyDir(e);
        if (d) { e.preventDefault(); if (d < 0) held.keyL = true; else held.keyR = true; }
        else if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && !e.repeat) setPaused(!paused);
      };
      const onKeyUp = (e) => { const d = keyDir(e); if (d < 0) held.keyL = false; else if (d > 0) held.keyR = false; };
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      card.querySelectorAll('[data-move]').forEach((b) => {
        const left = Number(b.dataset.move) < 0;
        const set = (on) => { if (left) held.btnL = on; else held.btnR = on; b.classList.toggle('held', on); };
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (b.setPointerCapture) { try { b.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ } } set(true); });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, () => set(false)));
        b.addEventListener('contextmenu', (e) => e.preventDefault());
      });
      // Press and hold a side of the mountain to steer that way.
      const touchSide = (e) => {
        const rect = canvas.getBoundingClientRect();
        held.touch = (e.clientX - rect.left) < rect.width / 2 ? -1 : 1;
      };
      canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ } } touchSide(e); });
      canvas.addEventListener('pointermove', (e) => { if (held.touch) touchSide(e); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => canvas.addEventListener(ev, () => { held.touch = 0; }));
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      card.querySelector('[data-act="guide"]').onclick = (e) => { setPaused(true); pauseEl.hidden = true; openGuide(e.currentTarget, () => setPaused(false)); };
      card.querySelector('[data-act="retreat"]').onclick = () => {
        setPaused(true);
        if (confirm('Leave the mountain? You can try again any time.')) finish('quit');
        else setPaused(false);
      };

      stopLoop = () => {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', fit);
        card.classList.remove('running');
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('blur', release);
      };

      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!paused) {
          view.time += dt;
          if (!ended) {
            const dir = steer();
            if (dir) view.facing = dir;
            // Two half-steps keep landings exact on slow devices.
            for (let i = 0; i < 2 && !s.outcome; i++) {
              stepClimb(s, dt / 2, dir);
              for (const ev of s.events) {
                if (ev.type === 'fall') { view.msg = 'You slipped! Climb again.'; view.msgT = 1.4; }
                if (ev.type === 'bolt') { view.msg = 'Struck by lightning!'; view.msgT = 1.3; }
                if (ev.type === 'rock') { view.msg = 'Hit by a falling rock!'; view.msgT = 1.3; }
                if (ev.type === 'manna') { view.msg = 'Manna! Strength restored.'; view.msgT = 1.2; }
                if (ev.type === 'crumble') { view.msg = 'The ledge crumbles!'; view.msgT = 0.9; }
              }
            }
            if (typeof window.__sinaiTestHook === 'function') window.__sinaiTestHook(s); // screenshot tests only
            if (s.outcome) {
              ended = true;
              if (s.outcome === 'win') { view.msg = 'The summit!'; view.msgT = 3; }
              setTimeout(() => (s.outcome === 'win' ? victory() : defeat()), s.outcome === 'win' ? 2800 : 900);
            }
          } else if (s.outcome === 'win') {
            view.glory = Math.min(1, view.glory + dt * 0.6);
          }
          view.msgT = Math.max(0, view.msgT - dt);
        }
        render(ctx, s, view);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      card.querySelector('[data-move="1"]').focus({ preventScroll: true });

      const victory = () => {
        stopLoop();
        card.innerHTML = `
          <div class="sa-screen win">
            <p class="sa-kicker">✦ Victory ✦</p>
            <h2>The Summit Reached</h2>
            <p>"The LORD summoned Moses to the top of the mountain, and Moses went up" (Ex 19:20). There God gave him "the stone tablets inscribed by God's own finger" (Ex 31:18): the covenant that made Israel His own people.</p>
            ${rewards.length ? `<div class="sa-rewards">${rewards.map((x) => `<span>${x}</span>`).join('')}</div>` : ''}
            <button type="button" class="sa-go" data-act="done">Claim Your Rewards</button>
          </div>`;
        const done = card.querySelector('[data-act="done"]');
        done.onclick = () => finish('win');
        done.focus({ preventScroll: true });
      };

      const defeat = () => {
        stopLoop();
        card.innerHTML = `
          <div class="sa-screen">
            <p class="sa-kicker">✦ Strength Spent ✦</p>
            <h2>The Mountain Is Steep</h2>
            <p>You climbed ${Math.max(0, Math.floor(s.last.y / PX_PER_M))} of ${GOAL_M} m. "Be strong and steadfast… he will never fail you or forsake you" (Dt 31:6). Rest a moment, then climb again. Wait out the lightning on a safe ledge!</p>
            <button type="button" class="sa-go" data-act="again">⛰️ Try Again</button>
            <button type="button" class="sa-go ghost" data-act="quit">Leave for now</button>
          </div>`;
        card.querySelector('[data-act="again"]').onclick = () => run();
        card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
        card.querySelector('[data-act="again"]').focus({ preventScroll: true });
      };
    };

    showTitle();
  });
}
