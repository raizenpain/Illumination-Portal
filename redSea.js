// ============================================
// CROSSING THE RED SEA — the Final Season's game chapter (Jornie,
// 2026-10-05), after "Out of Egypt". No questions, no star; it must be
// cleared to continue (season.js awards the node on victory).
//
// Lead Moses and the Israelites up the dry path between the walls of
// water (Ex 14:21–22) before Pharaoh's chariots catch up:
//   ◀ ▶ / swipe / tap a side   move between the five lanes
//   Rocks                       stumble: the chariots gain on you
//   Warning lanes               a wave is about to crash through — leave it
//   Seabirds                    swoop sideways across the path — time it
//   Stragglers                  rescue them: the people rally, you gain ground
// The pillar of fire glows behind the people (Ex 14:19–20). Reach the
// far shore (1,000 m) and the waters close over the chariots (Ex 14:28).
// Getting caught costs nothing: "Try Again" restarts.
//
// Logic (newRun / stepRun) is pure and exported for testing; drawing and
// input live in playRedSea({ rewards }) -> Promise<'win' | 'quit'>.
// ============================================

export const LANES = 5;
export const GOAL_M = 1000;
const BASE_SPEED = 13; // metres per second
const GAP_MAX = 100;

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- pure game logic ----------

export function newRun() {
  return {
    t: 0, dist: 0, lane: 2, gap: GAP_MAX, people: 0, rescued: 0, hits: 0,
    stumble: 0, invuln: 0, obstacles: [], waves: [], birds: [],
    nextSpawn: 28, nextWave: 140, nextBird: 170, outcome: null, events: []
  };
}

// Rows of rocks (more and denser the further you go — Jornie asked for a
// harder crossing). Always at least two open lanes in a row.
function spawnRow(s, d) {
  const lanes = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
  const r = Math.random();
  const three = s.dist > 450 ? 0.2 : (s.dist > 250 ? 0.1 : 0);
  const two = s.dist > 250 ? 0.6 : 0.45;
  const rocks = r < three ? 3 : (r < three + two ? 2 : 1);
  lanes.slice(0, rocks).forEach((lane) => s.obstacles.push({ type: 'rock', lane, d, done: false }));
  if (Math.random() < 0.35) s.obstacles.push({ type: 'person', lane: lanes[rocks], d: d + rand(-2, 2), done: false });
}

// A seabird swooping sideways across the path at a fixed spot (d): it
// starts moving once that spot comes into view, so its timing matters.
function spawnBird(s, d) {
  const fromLeft = Math.random() < 0.5;
  // trigger: how far ahead of the people the bird takes off, chosen so it
  // crosses the path right about when they reach its spot.
  s.birds.push({ d, x: fromLeft ? -0.8 : LANES - 0.2, vx: (fromLeft ? 1 : -1) * rand(2.4, 3.4), trigger: rand(13, 19), done: false });
}
export const birdLane = (b) => Math.round(b.x);

/** Advances the run by dt seconds. move: -1, 0 or +1 (one lane step). */
export function stepRun(s, dt, move = 0) {
  s.events = [];
  if (s.outcome) return s;
  s.t += dt;
  if (move) s.lane = Math.max(0, Math.min(LANES - 1, s.lane + move));

  const speed = BASE_SPEED * (1 + s.dist / 4000) * (s.stumble > 0 ? 0.45 : 1);
  s.dist += speed * dt;
  s.stumble = Math.max(0, s.stumble - dt);
  s.invuln = Math.max(0, s.invuln - dt);
  s.gap = s.stumble > 0 ? s.gap - 10 * dt : Math.min(GAP_MAX, s.gap + 1.9 * dt);

  // Spawning, a little denser the further you go.
  while (s.dist + 45 >= s.nextSpawn && s.nextSpawn < GOAL_M - 25) {
    spawnRow(s, s.nextSpawn);
    s.nextSpawn += Math.max(11, rand(14, 22) - s.dist * 0.004);
  }
  while (s.dist + 45 >= s.nextBird && s.nextBird < GOAL_M - 40) {
    spawnBird(s, s.nextBird);
    s.nextBird += Math.max(45, rand(70, 110) - s.dist * 0.03);
  }
  for (const b of s.birds) {
    if (b.d - s.dist < b.trigger) b.x += b.vx * dt; // takes off as the people approach
    if (!b.done && Math.abs(b.d - s.dist) < 1.4 && birdLane(b) === s.lane && b.x > -0.5 && b.x < LANES - 0.5 && s.invuln <= 0) {
      b.done = true; s.hits += 1; s.gap -= 12; s.stumble = 0.8; s.invuln = 1.2;
      s.events.push({ type: 'bird' });
    }
  }
  s.birds = s.birds.filter((b) => b.d > s.dist - 20 && b.x > -2 && b.x < LANES + 1);
  if (s.dist >= s.nextWave && s.nextWave < GOAL_M - 60) {
    const lane = Math.random() < 0.5 ? s.lane : pick([0, 1, 2, 3, 4]);
    s.waves.push({ lane, warn: 1.3, active: 0.55 });
    s.nextWave += rand(90, 140);
  }

  // Collisions with things at the people's position.
  for (const o of s.obstacles) {
    if (o.done || o.lane !== s.lane || Math.abs(o.d - s.dist) > 1.3) continue;
    if (o.type === 'person') {
      o.done = true; s.people += 1; s.rescued += 1; s.gap = Math.min(GAP_MAX, s.gap + 3);
      s.events.push({ type: 'rescue' });
    } else if (s.invuln <= 0) {
      o.done = true; s.hits += 1; s.gap -= 16; s.stumble = 1.0; s.invuln = 1.4;
      s.events.push({ type: 'rock' });
    }
  }
  s.obstacles = s.obstacles.filter((o) => o.d > s.dist - 20);

  for (const w of s.waves) {
    if (w.warn > 0) { w.warn -= dt; continue; }
    w.active -= dt;
    if (w.active > 0 && w.lane === s.lane && s.invuln <= 0) {
      s.hits += 1; s.gap -= 26; s.stumble = 1.2; s.invuln = 1.6;
      s.events.push({ type: 'wave' });
    }
  }
  s.waves = s.waves.filter((w) => w.warn > 0 || w.active > 0);

  if (s.gap <= 0) { s.gap = 0; s.outcome = 'lose'; }
  else if (s.dist >= GOAL_M) { s.dist = GOAL_M; s.outcome = 'win'; }
  return s;
}

// ---------- presentation ----------

const CSS = `
@keyframes rsFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rsRise { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes rsPulse { 0%, 100% { box-shadow: 0 0 0 1px #000, 0 0 10px rgba(120,200,255,.3); } 50% { box-shadow: 0 0 0 1px #000, 0 0 22px rgba(120,200,255,.7); } }
.rs-overlay {
  position: fixed; inset: 0; z-index: 10400; display: flex; align-items: center; justify-content: center;
  padding: 10px; box-sizing: border-box; overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, rgba(30,70,120,.5), transparent 60%), radial-gradient(ellipse at 50% 110%, rgba(150,60,10,.45), transparent 55%), #03060B;
  font-family: 'Segoe UI', system-ui, sans-serif; color: #E8DCC4; animation: rsFade .4s ease;
}
.rs-card {
  position: relative; width: min(440px, 100%); max-height: calc(100vh - 20px); max-height: calc(100dvh - 20px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
  background: linear-gradient(170deg, #0F1722 0%, #080C13 60%, #05070B 100%);
  border: 1px solid #2D4A66; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #080C13, inset 0 0 0 5px rgba(201,146,58,.45), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.85), 0 0 90px rgba(60,140,220,.16);
  animation: rsRise .5s cubic-bezier(.2,.9,.3,1.1);
}
.rs-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px 6px; }
.rs-kicker { margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A; }
.rs-top-btns { display: flex; gap: 6px; }
.rs-small, .rs-small:hover { margin: 0; padding: 5px 9px; border-radius: 3px; cursor: pointer; font: 600 11px 'Segoe UI', sans-serif; letter-spacing: .5px; text-transform: uppercase; color: #A8B9CC; background: transparent; border: 1px solid #2D4A66; }
.rs-small:hover { color: #E6F2FF; border-color: #6FA8DC; }
/* While running, the card takes the screen height (capped), and the
   canvas is sized by JS to the largest 360:560 box that fits the stage —
   so it fits short laptop windows and small phones alike. */
.rs-card.running { height: min(calc(100vh - 20px), 860px); height: min(calc(100dvh - 20px), 860px); }
.rs-stage { position: relative; flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 10px; overflow: hidden; }
.rs-stage canvas { display: block; border-radius: 4px; touch-action: none; background: #0A1220; border: 1px solid #1D3044; }
.rs-pause { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(3,6,11,.7); font-family: 'Cinzel', Georgia, serif; font-size: 18px; color: #E6F2FF; cursor: pointer; }
.rs-pause[hidden] { display: none; }
.rs-pad { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 12px 12px; }
.rs-pad button, .rs-pad button:hover {
  margin: 0; padding: 14px 6px; cursor: pointer; border-radius: 6px; font-size: 22px; line-height: 1;
  color: #E6F2FF; background: linear-gradient(180deg, #16263A, #0C1522); border: 1px solid #2D4A66;
  -webkit-user-select: none; user-select: none; touch-action: manipulation;
}
.rs-pad button:active { background: linear-gradient(180deg, #24405E, #13243A); border-color: #6FA8DC; }
.rs-pad button:focus-visible, .rs-go:focus-visible, .rs-small:focus-visible { outline: 2px solid #9CCBF2; outline-offset: 2px; }
.rs-screen { flex: 1 1 auto; min-height: 0; padding: 20px 20px 18px; text-align: center; overflow-y: auto; }
@media (max-height: 520px) { .rs-screen { padding: 12px 16px 12px; } .rs-screen h2 { font-size: 20px; } .rs-how { display: none; } .rs-go, .rs-go:hover { margin-top: 10px; padding: 10px 14px; } }
.rs-screen h2 { margin: 6px 0 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 25px; line-height: 1.2; color: #CFE6FF; text-shadow: 0 0 16px rgba(80,160,240,.45); }
.rs-screen.win h2 { color: #FFE2A8; text-shadow: 0 0 18px rgba(255,200,90,.5); }
.rs-screen p { margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #D6C8AE; }
.rs-how { margin: 14px 0 0; padding: 10px 12px; text-align: left; font-size: 13px; line-height: 1.55; color: #D6C8AE; background: rgba(0,0,0,.3); border: 1px solid rgba(111,168,220,.3); border-radius: 4px; }
.rs-how b { color: #FFE2A8; }
.rs-rewards { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 14px 0 0; }
.rs-rewards span { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #FFE2A8; background: rgba(233,184,90,.14); border: 1px solid rgba(233,184,90,.5); }
.rs-rewards img { width: 16px; height: 16px; }
.rs-go, .rs-go:hover {
  display: block; width: 100%; margin: 16px 0 0; padding: 13px 16px; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
}
.rs-go:hover { filter: brightness(1.1); }
.rs-go.ghost, .rs-go.ghost:hover { margin-top: 8px; color: #C8D6E6; font-size: 12.5px; background: rgba(255,255,255,.04); border-color: #2D4A66; box-shadow: none; }
.rs-guide { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; background: rgba(5,8,13,.97); }
.rs-guide[hidden] { display: none; }
.rs-guide-scroll { flex: 1; overflow-y: auto; padding: 18px 18px 6px; }
.rs-guide h3 { margin: 0 0 10px; text-align: center; font-family: 'Cinzel', Georgia, serif; font-size: 20px; color: #FFE2A8; }
.rs-guide h4 { margin: 14px 0 6px; font-family: 'Cinzel', Georgia, serif; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #7FB8EC; }
.rs-guide p, .rs-guide li { font-size: 13.5px; line-height: 1.55; color: #D6C8AE; }
.rs-guide p { margin: 0 0 6px; }
.rs-guide ul { margin: 0; padding-left: 18px; }
.rs-guide b { color: #FFE2A8; }
.rs-guide .tip { margin-top: 12px; padding: 9px 11px; border-radius: 4px; background: rgba(233,184,90,.1); border: 1px solid rgba(233,184,90,.4); }
.rs-guide-foot { padding: 8px 18px 16px; }
@media (max-height: 700px) { .rs-pad button, .rs-pad button:hover { padding: 10px 6px; } .rs-top { padding: 7px 10px 4px; } .rs-pad { padding: 7px 10px 9px; } }
/* A phone held sideways (.wide, set by JS): the controls move to the sides
   of the canvas and Guide / Leave to the corner, so the canvas gets the
   card's full height. */
.rs-card.running.wide { width: min(820px, 100%); display: grid; grid-template-columns: minmax(104px, 1fr) minmax(0, 2fr) minmax(104px, 1fr); grid-template-rows: auto minmax(0, 1fr); }
.rs-card.wide .rs-top { grid-column: 1; grid-row: 1; justify-content: center; padding: 8px 8px 6px; }
.rs-card.wide .rs-kicker { display: none; }
.rs-card.wide .rs-top-btns { flex-wrap: wrap; justify-content: center; }
.rs-card.wide .rs-small, .rs-card.wide .rs-small:hover { padding: 5px 6px; font-size: 10px; white-space: nowrap; }
.rs-card.wide .rs-stage { grid-column: 2; grid-row: 1 / 3; padding: 0; margin: 8px 0; }
.rs-card.wide .rs-pad { display: contents; }
.rs-card.wide .rs-pad button, .rs-card.wide .rs-pad button:hover { margin: 0 8px 8px; padding: 6px 2px; line-height: 1.3; }
.rs-card.wide .rs-pad button[data-move="-1"] { grid-column: 1; grid-row: 2; }
.rs-card.wide .rs-pad button[data-move="1"] { grid-column: 3; grid-row: 1 / 3; margin-top: 8px; }
@media (max-width: 400px) {
  .rs-kicker { font-size: 10px; letter-spacing: 1.5px; white-space: nowrap; }
  .rs-small, .rs-small:hover { padding: 5px 7px; font-size: 10px; white-space: nowrap; }
}
`;

const GUIDE_HTML = `
  <div class="rs-guide-scroll">
    <h3>How to Play</h3>
    <p>Pharaoh's army is chasing you! Lead Moses and the Israelites up the dry path through the sea and reach the <b>far shore (1,000 m)</b> before the chariots catch up.</p>
    <h4>Moving</h4>
    <ul>
      <li>Tap <b>◀ / ▶</b>, press the <b>arrow keys</b> (or A / D), <b>swipe</b>, or <b>tap the left or right side</b> of the path to change lanes.</li>
    </ul>
    <h4>On the Path</h4>
    <ul>
      <li><b>Rocks</b>: running into one makes the people stumble, and the chariots gain on you.</li>
      <li><b>Warning lanes</b>: when a lane flashes with <b>!</b>, a wave is about to crash through it. Move out!</li>
      <li><b>Seabirds</b>: they swoop sideways across the path. Watch their shadow on the sand and time your move so you are not where they cross.</li>
      <li><b>Stragglers</b> (glowing figures): rescue them. The people rally and you gain ground.</li>
    </ul>
    <h4>The Chariots</h4>
    <p>The <b>Chariots</b> bar shows how far behind they are. It slowly recovers while you run cleanly. If it empties, they catch you.</p>
    <p class="tip">💡 <b>Tip:</b> Keep your eyes a little ahead, not on your feet, and always leave a flashing lane at once. If you are caught, nothing is lost: tap <b>Try Again</b>.</p>
  </div>
  <div class="rs-guide-foot"><button type="button" class="rs-go" data-act="guide-close">Back to the Crossing</button></div>`;

function injectStyles() {
  if (document.getElementById('redSeaStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'redSeaStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

// Canvas layout (logical units; scaled for the device).
const CW = 360;
const CH = 560;
const PATH_L = 62;
const PATH_R = 298;
const LANE_W = (PATH_R - PATH_L) / LANES;
const PLAYER_Y = 400;
const PX_PER_M = 12;
const laneX = (lane) => PATH_L + LANE_W * (lane + 0.5);

function drawFigure(ctx, x, y, s, robe, glow) {
  ctx.save();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 12; }
  ctx.fillStyle = robe;
  ctx.beginPath(); ctx.moveTo(x, y - 6 * s); ctx.lineTo(x - 6 * s, y + 9 * s); ctx.lineTo(x + 6 * s, y + 9 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#E7C9A0';
  ctx.beginPath(); ctx.arc(x, y - 8 * s, 3.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function render(ctx, s, view) {
  const t = view.time;
  // Night sky band at the top + the far shore when close.
  ctx.fillStyle = '#071021';
  ctx.fillRect(0, 0, CW, CH);

  // Dry seabed path.
  const sand = ctx.createLinearGradient(0, 0, 0, CH);
  sand.addColorStop(0, '#5E4A2C'); sand.addColorStop(1, '#3A2C18');
  ctx.fillStyle = sand;
  ctx.fillRect(PATH_L, 0, PATH_R - PATH_L, CH);
  // Ripples in the sand, scrolling with the distance.
  ctx.strokeStyle = 'rgba(255,230,180,.08)';
  ctx.lineWidth = 2;
  const off = (s.dist * PX_PER_M) % 34;
  for (let y = -34 + off; y < CH; y += 34) {
    ctx.beginPath();
    for (let x = PATH_L; x <= PATH_R; x += 12) ctx.lineTo(x, y + Math.sin(x / 18) * 3);
    ctx.stroke();
  }
  // Lane hints.
  ctx.strokeStyle = 'rgba(255,240,210,.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i < LANES; i++) { ctx.beginPath(); ctx.moveTo(PATH_L + LANE_W * i, 0); ctx.lineTo(PATH_L + LANE_W * i, CH); ctx.stroke(); }

  // The far shore appears in the last stretch.
  const shoreY = PLAYER_Y - (GOAL_M - s.dist) * PX_PER_M;
  if (shoreY > -80) {
    const g = ctx.createLinearGradient(0, shoreY - 120, 0, shoreY);
    g.addColorStop(0, '#2E4A1E'); g.addColorStop(1, '#6E5A30');
    ctx.fillStyle = g;
    ctx.fillRect(0, shoreY - 400, CW, 400);
    ctx.fillStyle = 'rgba(255,220,140,.25)';
    ctx.fillRect(0, shoreY - 6, CW, 6);
  }

  // Waves: warning, then the crash.
  for (const w of s.waves) {
    const x = PATH_L + LANE_W * w.lane;
    if (w.warn > 0) {
      const a = 0.18 + 0.18 * Math.sin(t * 18);
      ctx.fillStyle = `rgba(120,190,255,${a})`;
      ctx.fillRect(x, 0, LANE_W, CH);
      ctx.fillStyle = '#E6F2FF';
      ctx.font = '700 22px Cinzel, Georgia, serif';
      ctx.textAlign = 'center';
      for (let y = 60; y < CH; y += 120) ctx.fillText('!', x + LANE_W / 2, y);
    } else {
      const g = ctx.createLinearGradient(x, 0, x + LANE_W, 0);
      g.addColorStop(0, 'rgba(40,110,200,.9)'); g.addColorStop(.5, 'rgba(200,235,255,.95)'); g.addColorStop(1, 'rgba(40,110,200,.9)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, LANE_W, CH);
    }
  }

  // Rocks and stragglers.
  for (const o of s.obstacles) {
    if (o.done) continue;
    const y = PLAYER_Y - (o.d - s.dist) * PX_PER_M;
    if (y < -30 || y > CH + 30) continue;
    const x = laneX(o.lane);
    if (o.type === 'rock') {
      ctx.save();
      ctx.fillStyle = '#4A4540';
      ctx.strokeStyle = '#2A2622';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 17, y + 8); ctx.lineTo(x - 13, y - 9); ctx.lineTo(x - 2, y - 15); ctx.lineTo(x + 12, y - 10); ctx.lineTo(x + 18, y + 6); ctx.lineTo(x + 6, y + 13); ctx.lineTo(x - 9, y + 12);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath(); ctx.moveTo(x - 10, y - 6); ctx.lineTo(x - 1, y - 11); ctx.lineTo(x + 6, y - 7); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      drawFigure(ctx, x, y, 1.1, '#8A6FB0', 'rgba(255,230,140,.95)');
    }
  }

  // Seabirds swooping across: a shadow on the sand + flapping wings.
  for (const b of s.birds || []) {
    if (b.done) continue;
    const y = PLAYER_Y - (b.d - s.dist) * PX_PER_M;
    if (y < -30 || y > CH + 30) continue;
    const x = PATH_L + LANE_W * (b.x + 0.5);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(x, y + 10, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
    const flap = Math.sin(t * 14 + b.d) * 7;
    const dir = Math.sign(b.vx) || 1;
    ctx.save();
    ctx.translate(x, y - 8);
    ctx.scale(dir, 1);
    ctx.strokeStyle = '#F4F7FA';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-15, -flap); ctx.quadraticCurveTo(-7, -4 - flap / 2, 0, 0);
    ctx.quadraticCurveTo(7, -4 - flap / 2, 15, -flap);
    ctx.stroke();
    ctx.fillStyle = '#F4F7FA';
    ctx.beginPath(); ctx.ellipse(1, 1, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E9A53A';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(11, 1.5); ctx.lineTo(7, 2.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(4.5, 0, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Walls of water on both sides, with moving foam edges.
  for (const side of [0, 1]) {
    const x0 = side ? PATH_R : 0;
    const w = side ? CW - PATH_R : PATH_L;
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    if (side) { g.addColorStop(0, '#2E7BC4'); g.addColorStop(1, '#08223F'); } else { g.addColorStop(0, '#08223F'); g.addColorStop(1, '#2E7BC4'); }
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, CH);
    ctx.strokeStyle = 'rgba(160,215,255,.35)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      const bx = side ? x0 + 10 + k * 12 : x0 + w - 10 - k * 12;
      for (let y = 0; y <= CH; y += 10) ctx.lineTo(bx + Math.sin(y / 30 + t * 2 + k) * 3, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(235,248,255,.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const ex = side ? PATH_R : PATH_L;
    for (let y = 0; y <= CH; y += 8) ctx.lineTo(ex + Math.sin(y / 14 + t * 5) * 2.5 * (side ? 1 : -1), y);
    ctx.stroke();
  }

  // The people following Moses (more figures as stragglers join).
  const px = view.px;
  const crowd = Math.min(14, 6 + s.people);
  for (let i = 0; i < crowd; i++) {
    const row = Math.floor(i / 3) + 1;
    const col = (i % 3) - 1;
    const bob = Math.sin(t * 9 + i) * 1.2;
    drawFigure(ctx, px + col * 13 + (row % 2 ? 5 : -5), PLAYER_Y + row * 16 + bob, 0.8, ['#7A5C3A', '#5E6E8A', '#8A4E3A', '#6A7A4A'][i % 4]);
  }
  // Moses with his staff raised.
  const blink = s.invuln > 0 && Math.floor(t * 12) % 2 === 0;
  if (!blink) {
    drawFigure(ctx, px, PLAYER_Y, 1.25, '#C9B48A', 'rgba(255,240,200,.6)');
    ctx.strokeStyle = '#8A6A3A'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px + 8, PLAYER_Y + 10); ctx.lineTo(px + 11, PLAYER_Y - 22); ctx.stroke();
  }

  // The pillar of fire behind the people (Ex 14:19–20).
  const fireY = PLAYER_Y + 95;
  const fg = ctx.createRadialGradient(CW / 2, fireY, 4, CW / 2, fireY, 70);
  fg.addColorStop(0, 'rgba(255,240,190,.9)'); fg.addColorStop(.35, 'rgba(255,150,40,.55)'); fg.addColorStop(1, 'rgba(255,90,0,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(PATH_L, fireY - 70, PATH_R - PATH_L, 140);

  // Pharaoh's chariots: closer on screen as the gap shrinks.
  const cy = PLAYER_Y + 70 + s.gap * 1.25;
  if (cy < CH + 40) {
    for (let i = 0; i < 4; i++) {
      const x = PATH_L + 30 + i * 60 + Math.sin(t * 6 + i) * 3;
      ctx.fillStyle = '#140D0A';
      ctx.fillRect(x - 14, cy - 4, 28, 14);
      ctx.beginPath(); ctx.arc(x - 9, cy + 12, 6, 0, Math.PI * 2); ctx.arc(x + 9, cy + 12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, cy - 16, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF3B3B';
      ctx.fillRect(x - 4, cy - 20, 2.5, 2.5); ctx.fillRect(x + 2, cy - 20, 2.5, 2.5);
    }
    ctx.fillStyle = 'rgba(120,90,60,.25)';
    ctx.fillRect(PATH_L, cy + 16, PATH_R - PATH_L, 20);
  }

  // Closing waters (victory cutscene).
  if (view.closing > 0) {
    const c = Math.min(1, view.closing);
    const reach = (PATH_R - PATH_L) / 2 * c;
    const g = ctx.createLinearGradient(0, 0, CW, 0);
    g.addColorStop(0, '#08223F'); g.addColorStop(.5, '#4A9BE0'); g.addColorStop(1, '#08223F');
    ctx.fillStyle = g;
    ctx.fillRect(PATH_L, PLAYER_Y + 60, reach, CH);
    ctx.fillRect(PATH_R - reach, PLAYER_Y + 60, reach, CH);
  }

  // HUD: distance to the far shore + the chariots' gap.
  ctx.fillStyle = 'rgba(3,6,11,.72)';
  ctx.fillRect(0, 0, CW, 46);
  ctx.textAlign = 'left';
  ctx.font = '700 11px Cinzel, Georgia, serif';
  ctx.fillStyle = '#FFE2A8';
  ctx.fillText(`FAR SHORE  ${Math.floor(s.dist)} / ${GOAL_M} m`, 10, 15);
  ctx.fillStyle = '#1E2A38'; ctx.fillRect(10, 20, 160, 7);
  ctx.fillStyle = '#E9B85A'; ctx.fillRect(10, 20, 160 * (s.dist / GOAL_M), 7);
  ctx.textAlign = 'right';
  ctx.fillStyle = s.gap < 35 ? '#FF6B81' : '#CFE6FF';
  ctx.fillText('CHARIOTS', CW - 10, 15);
  ctx.fillStyle = '#1E2A38'; ctx.fillRect(CW - 170, 20, 160, 7);
  ctx.fillStyle = s.gap < 35 ? '#FF4D6D' : '#5FA8E8'; ctx.fillRect(CW - 170, 20, 160 * (s.gap / GAP_MAX), 7);
  ctx.textAlign = 'left';
  ctx.font = '600 11px Segoe UI, sans-serif';
  ctx.fillStyle = '#C8D6E6';
  ctx.fillText(`Rescued: ${s.rescued}`, 10, 41);
  if (view.msg && view.msgT > 0) {
    ctx.textAlign = 'center';
    ctx.font = '700 16px Cinzel, Georgia, serif';
    ctx.fillStyle = `rgba(255,226,168,${Math.min(1, view.msgT)})`;
    ctx.fillText(view.msg, CW / 2, 80);
  }
}

/** Plays the crossing. Resolves 'win' after the victory screen, or 'quit'. */
export function playRedSea({ rewards = [] } = {}) {
  return new Promise((resolve) => {
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'rs-overlay';
    overlay.innerHTML = `<div class="rs-card" role="dialog" aria-modal="true" aria-label="Crossing the Red Sea"></div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    const card = overlay.querySelector('.rs-card');
    let stopLoop = () => {};

    const finish = (result) => {
      stopLoop();
      overlay.remove();
      document.documentElement.style.overflow = '';
      resolve(result);
    };

    const openGuide = (returnFocus, onClose) => {
      let guide = card.querySelector('.rs-guide');
      if (!guide) {
        guide = document.createElement('div');
        guide.className = 'rs-guide';
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
      guide.querySelector('.rs-guide-scroll').scrollTop = 0;
      guide.querySelector('[data-act="guide-close"]').focus({ preventScroll: true });
    };

    const showTitle = () => {
      card.innerHTML = `
        <div class="rs-screen">
          <p class="rs-kicker">✦ The Crossing ✦</p>
          <h2>Crossing the Red Sea</h2>
          <p>"The Israelites marched into the midst of the sea on dry land, with the water as a wall to their right and to their left" (Ex 14:22). Pharaoh's chariots are close behind. Lead God's people to the far shore!</p>
          <div class="rs-how">
            <b>◀ ▶</b> Change lanes (or arrow keys, swipe, tap a side).<br>
            <b>Rocks</b> make you stumble, and the chariots gain.<br>
            <b>Flashing lanes (!)</b>: a wave is coming. Get out!<br>
            <b>Seabirds</b> swoop across the path. Time your moves!<br>
            <b>Glowing stragglers</b>: rescue them to gain ground.<br>
            Reach <b>1,000 m</b> before the chariots catch you.
          </div>
          <button type="button" class="rs-go" data-act="begin">🌊 Lead the People</button>
          <button type="button" class="rs-go ghost" data-act="guide">❔ How to Play</button>
          <button type="button" class="rs-go ghost" data-act="quit">Not yet</button>
        </div>`;
      card.querySelector('[data-act="begin"]').onclick = () => run();
      card.querySelector('[data-act="guide"]').onclick = (e) => openGuide(e.currentTarget);
      card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
      card.querySelector('[data-act="begin"]').focus({ preventScroll: true });
    };

    const run = () => {
      card.innerHTML = `
        <div class="rs-top"><p class="rs-kicker">✦ The Crossing ✦</p><div class="rs-top-btns"><button type="button" class="rs-small" data-act="guide">❔ Guide</button><button type="button" class="rs-small" data-act="retreat">Retreat</button></div></div>
        <div class="rs-stage"><canvas width="${CW}" height="${CH}" aria-label="The path through the Red Sea"></canvas><div class="rs-pause" hidden>Paused — tap to continue</div></div>
        <div class="rs-pad"><button type="button" data-move="-1" aria-label="Move left">◀</button><button type="button" data-move="1" aria-label="Move right">▶</button></div>`;
      card.classList.add('running');
      const canvas = card.querySelector('canvas');
      const pauseEl = card.querySelector('.rs-pause');
      // Largest 360:560 canvas that fits the space the stage really has.
      const stage = card.querySelector('.rs-stage');
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

      let s = newRun();
      const view = { time: 0, px: laneX(s.lane), msg: 'Go! The sea is open!', msgT: 2, closing: 0 };
      let pendingMove = 0;
      let paused = false;
      let raf = 0;
      let last = performance.now();
      let ended = false;

      const setPaused = (p) => { paused = p; pauseEl.hidden = !p; last = performance.now(); };
      pauseEl.onclick = () => setPaused(false);
      const onVisibility = () => { if (document.hidden && !ended) setPaused(true); };
      document.addEventListener('visibilitychange', onVisibility);

      const queueMove = (m) => { if (!paused && !ended) pendingMove = Math.max(-1, Math.min(1, pendingMove + m)); };
      const onKey = (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); queueMove(-1); }
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); queueMove(1); }
        else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') setPaused(!paused);
      };
      document.addEventListener('keydown', onKey);
      card.querySelectorAll('[data-move]').forEach((b) => {
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); queueMove(Number(b.dataset.move)); });
      });
      // Swipe, or tap a side of the path.
      let touchX = null;
      canvas.addEventListener('pointerdown', (e) => { touchX = e.clientX; });
      canvas.addEventListener('pointerup', (e) => {
        if (touchX === null) return;
        const dx = e.clientX - touchX;
        if (Math.abs(dx) > 24) queueMove(dx > 0 ? 1 : -1);
        else {
          const rect = canvas.getBoundingClientRect();
          const tapX = ((e.clientX - rect.left) / rect.width) * CW;
          queueMove(tapX < view.px ? -1 : 1);
        }
        touchX = null;
      });

      card.querySelector('[data-act="guide"]').onclick = (e) => { setPaused(true); pauseEl.hidden = true; openGuide(e.currentTarget, () => setPaused(false)); };
      card.querySelector('[data-act="retreat"]').onclick = () => {
        setPaused(true);
        if (confirm('Leave the crossing? You can try again any time.')) finish('quit');
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
            stepRun(s, dt, pendingMove);
            if (typeof window.__redSeaTestHook === 'function') window.__redSeaTestHook(s); // screenshot tests only
            pendingMove = 0;
            for (const ev of s.events) {
              if (ev.type === 'rock') { view.msg = 'Stumbled on a rock!'; view.msgT = 1.2; }
              if (ev.type === 'wave') { view.msg = 'Swept by a wave!'; view.msgT = 1.3; }
              if (ev.type === 'rescue') { view.msg = 'A straggler rescued!'; view.msgT = 1; }
              if (ev.type === 'bird') { view.msg = 'A seabird swooped in!'; view.msgT = 1.2; }
            }
            if (s.outcome) {
              ended = true;
              if (s.outcome === 'win') { view.msg = 'The waters return!'; view.msgT = 3; }
              setTimeout(() => (s.outcome === 'win' ? victory() : defeat()), s.outcome === 'win' ? 2600 : 900);
            }
          } else if (s.outcome === 'win') {
            view.closing = Math.min(1, view.closing + dt * 0.6);
          }
          view.px += (laneX(s.lane) - view.px) * Math.min(1, dt * 18);
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
          <div class="rs-screen win">
            <p class="rs-kicker">✦ Victory ✦</p>
            <h2>Safe on the Far Shore</h2>
            <p>"The water flowed back and covered the chariots and the charioteers of Pharaoh's whole army" (Ex 14:28). You led God's people through the sea${s.rescued ? `, and rescued ${s.rescued} straggler${s.rescued === 1 ? '' : 's'} on the way` : ''}.</p>
            ${rewards.length ? `<div class="rs-rewards">${rewards.map((x) => `<span>${x}</span>`).join('')}</div>` : ''}
            <button type="button" class="rs-go" data-act="done">Claim Your Rewards</button>
          </div>`;
        const done = card.querySelector('[data-act="done"]');
        done.onclick = () => finish('win');
        done.focus({ preventScroll: true });
      };

      const defeat = () => {
        stopLoop();
        card.innerHTML = `
          <div class="rs-screen">
            <p class="rs-kicker">✦ Overtaken ✦</p>
            <h2>The Chariots Caught Up</h2>
            <p>"Do not fear! Stand your ground… The LORD will fight for you" (Ex 14:13–14). Gather the people and cross again. Watch for the flashing lanes!</p>
            <button type="button" class="rs-go" data-act="again">🌊 Try Again</button>
            <button type="button" class="rs-go ghost" data-act="quit">Leave for now</button>
          </div>`;
        card.querySelector('[data-act="again"]').onclick = () => run();
        card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
        card.querySelector('[data-act="again"]').focus({ preventScroll: true });
      };
    };

    showTitle();
  });
}
