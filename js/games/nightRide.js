// ============================================
// NEHEMIAH'S NIGHT RIDE — the Final Season's sixth game chapter (Jornie,
// 2026-10-07), after "Return and Rebuilding". No questions, no star; it
// must be cleared to continue (season.js awards the node on victory).
//
// Ride with Nehemiah as he inspects the ruined walls of Jerusalem by
// night (Neh 2:12–15): out by the Valley Gate, past the Dung Gate and the
// Fountain Gate, and back to the Valley Gate. A side-scrolling run; the
// mount never stops, and it goes faster the farther it gets:
//   Jump (tap / Space / ↑)      over rubble, fallen pillars and breaches
//   Duck (hold ↓ / the button)  under broken arches; in the air it drops fast
//   Lantern                     only its circle of light shows the road. The
//                               oil burns down; jars of oil (a jump) refill it
//   Gates                       passing one gives back one lost chance
// Three stumbles end the ride (1,000 m to finish). Losing costs nothing:
// "Try Again", from the Valley Gate.
//
// Logic (newRide / stepRide) is pure and exported for testing; drawing
// and input live in playNightRide({ rewards }) -> Promise<'win' | 'quit'>.
// ============================================

export const GOAL_M = 1000;
export const CHANCES = 3;
export const WORLD_W = 360;
export const PX_PER_M = 16;
export const GOAL_PX = GOAL_M * PX_PER_M;
export const GATES = [0, GOAL_PX / 3, (GOAL_PX * 2) / 3, GOAL_PX]; // Valley, Dung, Fountain, Valley
const GRAVITY = 2300;
const JUMP_V = 560;                 // a short, sharp leap about 68 high
export const AIR_T = (2 * JUMP_V) / GRAVITY;
const FAST_FALL = 3.2;              // ducking in the air
const HALF_W = 11;                  // half the rider's width
const STAND_H = 40;
const DUCK_H = 24;
const ARCH_Y = 30;                  // the underside of a broken arch
const OIL_S = 17;                   // seconds a full lantern burns
const JAR_Y = 84;

const rand = (min, max) => min + Math.random() * (max - min);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** How fast the mount runs, by how far along the ride is (0..1). */
export const speedAt = (p) => lerp(215, 340, clamp(p, 0, 1));

// ---------- pure game logic ----------

export function newRide() {
  return {
    t: 0, dist: 0, y: 0, vy: 0, duck: false, jumpBuf: 0, chances: CHANCES, invuln: 0, slow: 0,
    oil: 1, jars: 0, stumbles: 0, gate: 1, obstacles: [], pickups: [],
    genEnd: 420, last: null, lastJar: 0, outcome: null, events: []
  };
}

const isLeap = (type) => type !== 'arch';

// Every stretch can be ridden clean: the gaps between obstacles always
// leave room to land from one leap and take off for the next, or to get
// low in time for an arch. What changes is how little room is left.
function generate(s, upTo) {
  while (s.genEnd < upTo && s.genEnd < GOAL_PX - 300) {
    const p = s.genEnd / GOAL_PX;
    const v = speedAt(p);
    const air = v * AIR_T;
    const stage = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
    const weights = [['rubble', 4], ['pillar', 2], ['breach', [1.5, 3, 3][stage]], ['arch', [1.5, 3, 4][stage]]];
    let roll = Math.random() * weights.reduce((n, w) => n + w[1], 0);
    const type = weights.find((w) => (roll -= w[1]) <= 0)[0];
    const w = type === 'rubble' ? 26 : type === 'pillar' ? v * 0.16 : type === 'breach' ? v * rand(0.2, 0.27 + 0.05 * p) : rand(40, 64) + (stage === 2 && Math.random() < 0.3 ? v * 0.3 : 0);
    const prev = s.last;
    let min = 0;
    if (prev) {
      if (isLeap(prev.type) && isLeap(type)) min = air - (prev.w + w) / 2 + v * 0.07;
      else if (isLeap(prev.type)) min = v * 0.36;                    // leap, then get low
      else if (isLeap(type)) min = air / 2 - w / 2 + HALF_W + 4 + v * 0.05; // out from the arch, then leap
      else min = v * 0.15;
    }
    let open = Math.max(min, v * lerp(1.0, 0.5, p) * rand(0.85, 1.3));
    const from = prev ? prev.x + prev.w : s.genEnd;
    // Every few seconds the road opens just enough for one more leap, and
    // a jar of oil hangs there.
    const jarDue = prev && from - s.lastJar > v * 5;
    if (jarDue) open = Math.max(open, air + v * 0.6);
    let x = from + open;
    // The gates stand clear.
    for (const g of GATES) if (x < g + 170 && x + w > g - 170) x = g + 170;
    if (jarDue) {
      const jx = (from + x) / 2;
      if (!GATES.some((g) => Math.abs(jx - g) < 120)) { s.pickups.push({ x: jx, y: JAR_Y }); s.lastJar = jx; }
    }
    const ob = { type, x, w, y0: type === 'arch' ? ARCH_Y : 0, y1: type === 'rubble' ? 24 : type === 'pillar' ? 20 : type === 'arch' ? 170 : 0 };
    s.obstacles.push(ob);
    s.last = ob;
    s.genEnd = x + w;
  }
}

function stumble(s, kind) {
  s.chances -= 1; s.stumbles += 1; s.invuln = 1.3; s.slow = 0.5;
  s.events.push({ type: 'stumble', kind });
  if (s.chances <= 0) s.outcome = 'lose';
}

/**
 * Advances the ride by dt seconds.
 * input: { jump: true on the frame it is pressed, duck: true while held }.
 */
export function stepRide(s, dt, input = {}) {
  s.events = [];
  if (s.outcome) return s;
  s.t += dt;
  const v = speedAt(s.dist / GOAL_PX) * (s.slow > 0 ? 0.6 : 1);
  s.slow = Math.max(0, s.slow - dt);
  s.dist += v * dt;
  generate(s, s.dist + 800);

  s.jumpBuf = input.jump ? 0.13 : Math.max(0, s.jumpBuf - dt);
  s.duck = !!input.duck;
  if (s.y <= 0 && s.vy <= 0 && s.jumpBuf > 0) { s.vy = JUMP_V; s.jumpBuf = 0; s.events.push({ type: 'jump' }); }
  if (s.y > 0 || s.vy > 0) {
    s.vy -= GRAVITY * (s.duck ? FAST_FALL : 1) * dt;
    s.y += s.vy * dt;
    if (s.y <= 0) { s.y = 0; s.vy = 0; s.events.push({ type: 'land' }); }
  }
  s.invuln = Math.max(0, s.invuln - dt);
  s.oil = Math.max(0, s.oil - dt / OIL_S);

  const X = s.dist;
  const H = s.duck ? DUCK_H : STAND_H;
  if (s.invuln <= 0) {
    for (const ob of s.obstacles) {
      if (ob.x > X + HALF_W) break;
      if (ob.type === 'breach') {
        if (s.y <= 0 && X > ob.x + 8 && X < ob.x + ob.w - 8) { stumble(s, 'breach'); break; }
      } else if (ob.x + ob.w > X - HALF_W && s.y < ob.y1 && s.y + H > ob.y0) { stumble(s, ob.type); break; }
    }
    if (s.outcome) return s;
  }
  for (const jar of s.pickups) {
    if (!jar.got && Math.abs(jar.x - X) < 20 && jar.y > s.y - 8 && jar.y < s.y + H + 8) {
      jar.got = true; s.jars += 1; s.oil = Math.min(1, s.oil + 0.5);
      s.events.push({ type: 'jar' });
    }
  }
  if (s.gate < GATES.length && X >= GATES[s.gate]) {
    if (s.gate === GATES.length - 1) { s.outcome = 'win'; return s; }
    const healed = s.chances < CHANCES;
    if (healed) s.chances += 1;
    s.events.push({ type: 'gate', gate: s.gate, healed });
    s.gate += 1;
  }
  s.obstacles = s.obstacles.filter((ob) => ob.x + ob.w > X - 260);
  s.pickups = s.pickups.filter((jar) => jar.x > X - 260);
  return s;
}

// ---------- presentation ----------

const CSS = `
@keyframes nrFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes nrRise { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
.nr-overlay {
  position: fixed; inset: 0; z-index: 10400; display: flex; align-items: center; justify-content: center;
  padding: 10px; box-sizing: border-box; overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, rgba(120,140,230,.2), transparent 55%), radial-gradient(ellipse at 50% 110%, rgba(255,180,80,.14), transparent 55%), #04050A;
  font-family: 'Segoe UI', system-ui, sans-serif; color: #E8DCC4; animation: nrFade .4s ease;
}
.nr-card {
  position: relative; width: min(440px, 100%); max-height: calc(100vh - 20px); max-height: calc(100dvh - 20px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
  background: linear-gradient(170deg, #14151F 0%, #0B0C13 60%, #06060A 100%);
  border: 1px solid #5A4226; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #07070B, inset 0 0 0 5px rgba(201,146,58,.45), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.85), 0 0 90px rgba(120,140,255,.12);
  animation: nrRise .5s cubic-bezier(.2,.9,.3,1.1);
}
.nr-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px 6px; }
.nr-kicker { margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A; }
.nr-top-btns { display: flex; gap: 6px; }
.nr-small, .nr-small:hover { margin: 0; padding: 5px 9px; border-radius: 3px; cursor: pointer; font: 600 11px 'Segoe UI', sans-serif; letter-spacing: .5px; text-transform: uppercase; color: #C9B79A; background: transparent; border: 1px solid #5A4226; }
.nr-small:hover { color: #FFF1D6; border-color: #C9923A; }
/* While riding, the card takes the screen height (capped), and the
   canvas is sized by JS to the largest 360:560 box that fits the stage —
   so it fits short laptop windows and small phones alike. */
.nr-card.running { height: min(calc(100vh - 20px), 860px); height: min(calc(100dvh - 20px), 860px); }
.nr-stage { position: relative; flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 10px; overflow: hidden; }
.nr-stage canvas { display: block; border-radius: 4px; touch-action: none; cursor: pointer; background: #05060C; border: 1px solid #2A2A3E; }
.nr-pause { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(4,5,10,.76); font-family: 'Cinzel', Georgia, serif; font-size: 18px; color: #FFF1D6; cursor: pointer; }
.nr-pause[hidden] { display: none; }
.nr-pad { display: grid; grid-template-columns: 1fr 1.35fr; gap: 8px; padding: 10px 12px 12px; }
.nr-pad button, .nr-pad button:hover {
  margin: 0; padding: 15px 6px; cursor: pointer; border-radius: 6px; line-height: 1;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; border: 1px solid #FFE7A8; background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  -webkit-user-select: none; user-select: none; touch-action: none; -webkit-touch-callout: none;
}
.nr-pad button[data-do="duck"], .nr-pad button[data-do="duck"]:hover { color: #E6ECFF; border-color: #9FB0E8; background: linear-gradient(180deg, #5B6AA8 0%, #3A4680 55%, #232B55 100%); }
.nr-pad button:active, .nr-pad button.held { filter: brightness(1.3); }
.nr-pad button:focus-visible, .nr-go:focus-visible, .nr-small:focus-visible { outline: 2px solid #FFD98A; outline-offset: 2px; }
.nr-screen { flex: 1 1 auto; min-height: 0; padding: 20px 20px 18px; text-align: center; overflow-y: auto; }
@media (max-height: 520px) { .nr-screen { padding: 12px 16px 12px; } .nr-screen h2 { font-size: 20px; } .nr-how { display: none; } .nr-go, .nr-go:hover { margin-top: 10px; padding: 10px 14px; } }
.nr-screen h2 { margin: 6px 0 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 25px; line-height: 1.2; color: #FFD9A0; text-shadow: 0 0 16px rgba(255,160,60,.45); }
.nr-screen.win h2 { color: #FFE9B8; text-shadow: 0 0 20px rgba(255,210,110,.6); }
.nr-screen p { margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #D6C8AE; }
.nr-how { margin: 14px 0 0; padding: 10px 12px; text-align: left; font-size: 13px; line-height: 1.55; color: #D6C8AE; background: rgba(0,0,0,.3); border: 1px solid rgba(201,146,58,.35); border-radius: 4px; }
.nr-how b { color: #FFE2A8; }
.nr-rewards { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 14px 0 0; }
.nr-rewards span { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #FFE2A8; background: rgba(233,184,90,.14); border: 1px solid rgba(233,184,90,.5); }
.nr-rewards img { width: 16px; height: 16px; }
.nr-go, .nr-go:hover {
  display: block; width: 100%; margin: 16px 0 0; padding: 13px 16px; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
}
.nr-go:hover { filter: brightness(1.1); }
.nr-go.ghost, .nr-go.ghost:hover { margin-top: 8px; color: #D6C8AE; font-size: 12.5px; background: rgba(255,255,255,.04); border-color: #5A4226; box-shadow: none; }
/* The guide covers the card. Opened from the title screen the card is
   short, so it grows while the guide is up (.guiding). */
.nr-card.guiding { min-height: min(660px, calc(100vh - 20px)); min-height: min(660px, calc(100dvh - 20px)); }
.nr-guide { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; text-align: left; background: linear-gradient(170deg, #12131C 0%, #090A10 60%, #06060A 100%); }
.nr-guide[hidden] { display: none; }
.nr-guide-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 18px 16px 8px; scrollbar-width: thin; scrollbar-color: #8A6A32 transparent; }
.nr-guide-scroll::-webkit-scrollbar { width: 8px; }
.nr-guide-scroll::-webkit-scrollbar-track { background: transparent; }
.nr-guide-scroll::-webkit-scrollbar-thumb { background: #8A6A32; border-radius: 4px; }
.nr-guide h3 { margin: 0; text-align: center; font-family: 'Cinzel', Georgia, serif; font-size: 21px; color: #FFE2A8; text-shadow: 0 0 14px rgba(255,170,70,.35); }
.nr-guide-lead { margin: 8px 0 14px; text-align: center; font-size: 13.5px; line-height: 1.55; color: #D6C8AE; }
.nr-guide b { color: #FFE2A8; }
.nr-rule { display: grid; grid-template-columns: 40px 1fr; gap: 12px; align-items: start; margin-top: 8px; padding: 11px 12px; border-radius: 6px; background: rgba(255,255,255,.035); border: 1px solid rgba(201,146,58,.28); }
.nr-rule-ico { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 19px; line-height: 1; background: rgba(233,184,90,.12); border: 1px solid rgba(233,184,90,.45); }
.nr-rule h4 { margin: 1px 0 5px; font-family: 'Cinzel', Georgia, serif; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #E0A050; }
.nr-rule p { margin: 0 0 4px; font-size: 13.5px; line-height: 1.5; color: #D6C8AE; }
.nr-rule p:last-child { margin-bottom: 0; }
.nr-keys { display: flex; flex-wrap: wrap; gap: 5px; margin: 0 0 6px; }
.nr-keys span { padding: 2px 8px; border-radius: 4px; font: 600 11.5px 'Segoe UI', sans-serif; white-space: nowrap; color: #FFE2A8; background: #1B1711; border: 1px solid #6B5530; box-shadow: 0 1px 0 #000; }
.nr-guide .tip { margin: 10px 0 0; padding: 10px 12px; border-radius: 6px; font-size: 13.5px; line-height: 1.5; color: #D6C8AE; background: rgba(233,184,90,.1); border: 1px solid rgba(233,184,90,.4); }
.nr-guide-foot { padding: 10px 16px 16px; border-top: 1px solid rgba(201,146,58,.25); }
.nr-guide-foot .nr-go, .nr-guide-foot .nr-go:hover { margin-top: 0; }
@media (max-height: 700px) { .nr-pad button, .nr-pad button:hover { padding: 10px 6px; } .nr-top { padding: 7px 10px 4px; } .nr-pad { padding: 7px 10px 9px; } }
/* A phone held sideways (.wide, set by JS): Duck | the road | Jump under a
   slim top bar, one button under each thumb. */
.nr-card.running.wide { width: min(820px, 100%); display: grid; grid-template-columns: minmax(104px, 1fr) minmax(0, 2fr) minmax(104px, 1fr); grid-template-rows: auto minmax(0, 1fr); }
.nr-card.wide .nr-top { grid-column: 1 / -1; padding: 6px 10px 4px; }
.nr-card.wide .nr-stage { grid-column: 2; grid-row: 2; padding: 0 0 8px; }
.nr-card.wide .nr-pad { display: contents; }
.nr-card.wide .nr-pad button, .nr-card.wide .nr-pad button:hover { grid-row: 2; margin: 0 8px 8px; padding: 6px 2px; font-size: 13px; letter-spacing: .5px; }
.nr-card.wide .nr-pad button[data-do="duck"] { grid-column: 1; }
.nr-card.wide .nr-pad button[data-do="jump"] { grid-column: 3; }
@media (max-width: 400px) {
  .nr-kicker { font-size: 10px; letter-spacing: 1.5px; white-space: nowrap; }
  .nr-small, .nr-small:hover { padding: 5px 7px; font-size: 10px; white-space: nowrap; }
}
`;

const GUIDE_HTML = `
  <div class="nr-guide-scroll">
    <h3>How to Play</h3>
    <p class="nr-guide-lead">Ride <b>1,000 m</b> around the ruined walls, from the Valley Gate and back to it. The mount never stops, and it runs <b>faster</b> the farther you go.</p>
    <div class="nr-rule">
      <div class="nr-rule-ico" aria-hidden="true">⬆️</div>
      <div>
        <h4>Jump</h4>
        <div class="nr-keys"><span>Jump button</span><span>Tap the road</span><span>Space</span><span>↑</span></div>
        <p>Clears <b>rubble</b>, <b>fallen pillars</b> and <b>breaches</b> (holes in the road).</p>
        <p>A long pillar or a wide breach needs good timing: not too early, not too late.</p>
      </div>
    </div>
    <div class="nr-rule">
      <div class="nr-rule-ico" aria-hidden="true">⬇️</div>
      <div>
        <h4>Duck</h4>
        <div class="nr-keys"><span>Hold the Duck button</span><span>Hold ↓</span></div>
        <p>Rides under a <b>broken arch</b>. You cannot jump over one.</p>
        <p>Duck <b>in the air</b> to drop fast, for an arch that comes right after a jump.</p>
      </div>
    </div>
    <div class="nr-rule">
      <div class="nr-rule-ico" aria-hidden="true">🏮</div>
      <div>
        <h4>The Lantern</h4>
        <p>You see only as far as the lantern shines, and its oil <b>burns down</b> as you ride.</p>
        <p>Jump to catch a <b>jar of oil</b> and the light spreads wide again.</p>
      </div>
    </div>
    <div class="nr-rule">
      <div class="nr-rule-ico" aria-hidden="true">❤️</div>
      <div>
        <h4>Chances</h4>
        <p>You have <b>3 chances</b>. Every stumble costs one.</p>
        <p>The <b>Dung Gate</b> and the <b>Fountain Gate</b> each give one lost chance back.</p>
      </div>
    </div>
    <div class="nr-rule">
      <div class="nr-rule-ico" aria-hidden="true">⚠️</div>
      <div>
        <h4>The Last Stretch</h4>
        <p>After the Fountain Gate the way narrows: more arches, wider breaches, and less room between them.</p>
      </div>
    </div>
    <p class="tip">💡 <b>Tip:</b> Keep the lantern full, and watch for the faint shapes beyond the light. This ride is meant to be hard. If you fall, nothing is lost: tap <b>Try Again</b>.</p>
  </div>
  <div class="nr-guide-foot"><button type="button" class="nr-go" data-act="guide-close">Back to the Ride</button></div>`;

function injectStyles() {
  if (document.getElementById('nightRideStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'nightRideStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

// Canvas layout (logical units; scaled for the device).
const CW = WORLD_W;
const CH = 560;
const WIDE_H = 380; // the view on a phone held sideways: the same road, less empty sky
const GY = 432;   // the road
const RX = 84;    // where the rider stays on screen
const GATE_NAMES = ['The Valley Gate', 'The Dung Gate', 'The Fountain Gate', 'The Valley Gate'];
const LEG_NAMES = ['Toward the Dung Gate', 'Toward the Fountain Gate', "Past the King's Pool"];
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function drawSkyline(ctx, scroll, step, base, tall, color, seed) {
  ctx.fillStyle = color;
  const first = Math.floor(scroll / step) - 1;
  for (let k = first; k < first + CW / step + 3; k++) {
    const r = hash(k + seed);
    const h = r < 0.22 ? base * 0.3 : base + hash(k * 3 + seed) * tall; // a breach in the wall
    const x = k * step - scroll;
    ctx.fillRect(x, GY - h, step + 1, h);
    if (r > 0.6) ctx.fillRect(x + step * 0.2, GY - h - 7, step * 0.25, 7);  // a merlon left standing
  }
}

function drawGate(ctx, x, name, lit) {
  ctx.fillStyle = '#3B3A44';
  ctx.fillRect(x - 62, GY - 168, 30, 168);
  ctx.fillRect(x + 32, GY - 168, 30, 168);
  ctx.fillStyle = '#4A4852';
  ctx.fillRect(x - 66, GY - 176, 38, 10);
  ctx.fillRect(x + 28, GY - 176, 38, 10);
  // What the fire left of the lintel. Nothing of the gate lies on the
  // road itself, so it is never mistaken for something to jump.
  ctx.fillStyle = '#1B1412';
  ctx.save(); ctx.translate(x - 32, GY - 150); ctx.rotate(0.12); ctx.fillRect(0, 0, 46, 9); ctx.restore();
  ctx.save(); ctx.translate(x + 32, GY - 138); ctx.rotate(Math.PI - 0.3); ctx.fillRect(0, 0, 26, 8); ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
  for (let y = GY - 150; y < GY; y += 22) { ctx.beginPath(); ctx.moveTo(x - 62, y); ctx.lineTo(x - 32, y); ctx.moveTo(x + 32, y); ctx.lineTo(x + 62, y); ctx.stroke(); }
  ctx.textAlign = 'center';
  ctx.font = '700 12px Cinzel, Georgia, serif';
  ctx.fillStyle = lit ? '#FFE2A8' : 'rgba(255,226,168,.7)';
  ctx.fillText(name.toUpperCase(), x, GY - 188);
}

function drawObstacle(ctx, ob, x) {
  if (ob.type === 'breach') {
    const pit = ctx.createLinearGradient(0, GY, 0, CH);
    pit.addColorStop(0, '#0B0806'); pit.addColorStop(1, '#000');
    ctx.fillStyle = pit;
    ctx.fillRect(x, GY - 1, ob.w, CH - GY + 1);
    ctx.fillStyle = '#8A7A62';
    ctx.beginPath(); ctx.moveTo(x - 6, GY); ctx.lineTo(x, GY - 5); ctx.lineTo(x + 5, GY + 9); ctx.lineTo(x - 2, GY + 16); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + ob.w + 6, GY); ctx.lineTo(x + ob.w, GY - 5); ctx.lineTo(x + ob.w - 5, GY + 9); ctx.lineTo(x + ob.w + 2, GY + 16); ctx.closePath(); ctx.fill();
    return;
  }
  if (ob.type === 'rubble') {
    ctx.fillStyle = '#9A8A70'; ctx.strokeStyle = '#D8CBB0'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - 2, GY); ctx.lineTo(x + 3, GY - 13); ctx.lineTo(x + 10, GY - 24); ctx.lineTo(x + 18, GY - 20); ctx.lineTo(x + 24, GY - 10); ctx.lineTo(x + 28, GY); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,30,20,.6)';
    ctx.beginPath(); ctx.moveTo(x + 6, GY - 10); ctx.lineTo(x + 20, GY - 12); ctx.moveTo(x + 12, GY - 23); ctx.lineTo(x + 13, GY - 11); ctx.stroke();
    return;
  }
  if (ob.type === 'pillar') {
    const g = ctx.createLinearGradient(0, GY - 20, 0, GY);
    g.addColorStop(0, '#D8CBB0'); g.addColorStop(1, '#7E6F58');
    ctx.fillStyle = g;
    ctx.fillRect(x, GY - 20, ob.w, 20);
    ctx.fillStyle = '#B5A68A';
    ctx.fillRect(x - 3, GY - 22, 7, 22);
    ctx.fillRect(x + ob.w - 4, GY - 22, 7, 22);
    ctx.strokeStyle = 'rgba(60,48,32,.55)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let fy = GY - 15; fy < GY; fy += 5) { ctx.moveTo(x + 5, fy); ctx.lineTo(x + ob.w - 5, fy); }
    ctx.stroke();
    return;
  }
  // A broken arch: its columns stand behind the road, its stones hang over it.
  ctx.fillStyle = '#2C2B36';
  ctx.fillRect(x - 5, GY - 150, 8, 150);
  ctx.fillRect(x + ob.w - 3, GY - 150, 8, 150);
  const top = GY - 170;
  const low = GY - ARCH_Y;
  const g = ctx.createLinearGradient(0, top, 0, low);
  g.addColorStop(0, '#5A5560'); g.addColorStop(1, '#A39884');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - 6, top); ctx.lineTo(x + ob.w + 6, top); ctx.lineTo(x + ob.w + 6, low - 10); ctx.lineTo(x + ob.w - 4, low); ctx.lineTo(x + 6, low); ctx.lineTo(x - 6, low - 12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#E2D6BC'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 6, low - 12); ctx.lineTo(x + 6, low); ctx.lineTo(x + ob.w - 4, low); ctx.lineTo(x + ob.w + 6, low - 10); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,26,34,.5)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let by = low - 22; by > top; by -= 22) { ctx.moveTo(x - 6, by); ctx.lineTo(x + ob.w + 6, by); }
  ctx.stroke();
}

function drawJar(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 4 + x) * 2.5);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
  glow.addColorStop(0, 'rgba(255,214,120,.55)'); glow.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = glow; ctx.fillRect(-22, -22, 44, 44);
  ctx.fillStyle = '#C8793A';
  ctx.beginPath(); ctx.ellipse(0, 2, 7, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-3.5, -10, 7, 5);
  ctx.fillStyle = '#F3C98A';
  ctx.fillRect(-4.5, -11.5, 9, 2.5);
  ctx.fillStyle = 'rgba(255,240,200,.5)';
  ctx.beginPath(); ctx.ellipse(-2.5, -1, 1.6, 4, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRider(ctx, s, view) {
  const air = s.y > 0;
  const stride = view.run;
  ctx.save();
  ctx.translate(RX, GY - s.y);
  if (s.invuln > 0 && !s.outcome && Math.floor(view.time * 14) % 2) ctx.globalAlpha = 0.4;
  ctx.rotate(air ? clamp(-s.vy / 2600, -0.22, 0.25) : view.tumble);
  // Legs.
  ctx.strokeStyle = '#5E564C'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  [[-11, 0], [-6, Math.PI], [8, Math.PI * 0.6], [13, Math.PI * 1.6]].forEach(([lx, ph]) => {
    const sw = air ? (lx < 0 ? -0.9 : 0.9) : Math.sin(stride + ph) * 0.7;
    const len = air ? 10 : 15;
    ctx.beginPath(); ctx.moveTo(lx, -15); ctx.lineTo(lx + Math.sin(sw) * len, -15 + Math.cos(sw) * len); ctx.stroke();
  });
  // The mount.
  ctx.fillStyle = '#8D8477';
  ctx.beginPath(); ctx.ellipse(1, -22, 17, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8D8477'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(13, -25); ctx.lineTo(20, -33); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(23, -35, 7.5, 5, 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#C9C0B2';
  ctx.beginPath(); ctx.ellipse(28, -33, 3.2, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6E665C'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(19, -39); ctx.lineTo(16, -50); ctx.moveTo(23, -40); ctx.lineTo(23, -51); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-16, -24); ctx.lineTo(-23, -14 + Math.sin(stride) * 2); ctx.stroke();
  ctx.fillStyle = '#1C1612';
  ctx.beginPath(); ctx.arc(25, -37, 1.2, 0, Math.PI * 2); ctx.fill();
  // Nehemiah, low over the mount's neck when he ducks.
  ctx.save();
  ctx.translate(-1, -29);
  ctx.rotate(s.duck ? 1.2 : 0.06);
  ctx.fillStyle = '#2F4A7A';
  ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-5, -20); ctx.lineTo(5, -20); ctx.lineTo(8, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#C59A6C';
  ctx.beginPath(); ctx.arc(0, -25, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#E8DFCB';
  ctx.beginPath(); ctx.arc(0, -26.5, 5.4, Math.PI, 0); ctx.fill();
  ctx.fillRect(-5.4, -27, 3, 9);
  ctx.restore();
  // The lantern on its pole.
  const lx = 24; const ly = s.duck ? -44 : -58;
  ctx.strokeStyle = '#6B4E2E'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(s.duck ? 8 : 3, s.duck ? -36 : -44); ctx.lineTo(lx, ly); ctx.stroke();
  ctx.fillStyle = '#FFE08A';
  ctx.fillRect(lx - 3.5, ly, 7, 9);
  ctx.strokeStyle = '#5A4226'; ctx.lineWidth = 1.2;
  ctx.strokeRect(lx - 3.5, ly, 7, 9);
  ctx.lineCap = 'butt';
  ctx.restore();
}

function render(ctx, s, view) {
  const t = view.time;
  const sx = (wx) => RX + (wx - s.dist);
  ctx.save();
  ctx.translate(0, (view.h || CH) - CH);

  // Night over the ruined city.
  const sky = ctx.createLinearGradient(0, 0, 0, GY);
  sky.addColorStop(0, '#0A0E26'); sky.addColorStop(.7, '#1D2247'); sky.addColorStop(1, '#3A3358');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, CH);
  for (let i = 0; i < 46; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.45 * hash(i * 7) * (0.7 + 0.3 * Math.sin(t * 2 + i))})`;
    ctx.fillRect(hash(i) * CW, 50 + hash(i + 50) * 250, 1.4, 1.4);
  }
  ctx.fillStyle = '#F2EBD0';
  ctx.beginPath(); ctx.arc(292, 104, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0D122C';
  ctx.beginPath(); ctx.arc(301, 98, 20, 0, Math.PI * 2); ctx.fill();
  drawSkyline(ctx, s.dist * 0.18, 46, 78, 74, '#161B3A', 0);
  drawSkyline(ctx, s.dist * 0.45, 34, 30, 44, '#0F1228', 400);

  // The road.
  const road = ctx.createLinearGradient(0, GY, 0, CH);
  road.addColorStop(0, '#4A4034'); road.addColorStop(1, '#17120E');
  ctx.fillStyle = road;
  ctx.fillRect(0, GY, CW, CH - GY);
  ctx.fillStyle = 'rgba(255,240,210,.18)';
  ctx.fillRect(0, GY, CW, 2);
  const firstStone = Math.floor((s.dist - RX) / 38) - 1;
  for (let k = firstStone; k < firstStone + 13; k++) {
    ctx.fillStyle = hash(k) > 0.5 ? '#5C5144' : '#3A322A';
    ctx.fillRect(sx(k * 38 + hash(k + 9) * 20), GY + 10 + hash(k + 3) * 90, 7 + hash(k + 5) * 9, 4);
  }

  GATES.forEach((g, i) => { const x = sx(g); if (x > -90 && x < CW + 90) drawGate(ctx, x, GATE_NAMES[i], true); });
  for (const ob of s.obstacles) { const x = sx(ob.x); if (x < CW + 20 && x + ob.w > -20) drawObstacle(ctx, ob, x); }
  for (const jar of s.pickups) { const x = sx(jar.x); if (!jar.got && x > -30 && x < CW + 30) drawJar(ctx, x, GY - jar.y - 12, t); }
  for (const d of view.dust) {
    ctx.fillStyle = `rgba(190,170,140,${0.5 * (1 - d.age / 0.45)})`;
    ctx.beginPath(); ctx.arc(d.x - d.age * 110, GY - 3 - d.age * 16, 3 + d.age * 12, 0, Math.PI * 2); ctx.fill();
  }
  drawRider(ctx, s, view);

  // The dark, and the lantern's circle in it.
  if (view.glory < 1) {
    const lx = RX + 24; const ly = GY - s.y - (s.duck ? 40 : 54);
    const reach = lerp(118, 205, s.oil) * (1 + 0.025 * Math.sin(t * 13)) * (view.flash > 0 ? 1.25 : 1);
    const dark = ctx.createRadialGradient(lx, ly, reach * 0.3, lx, ly, reach);
    const deep = 0.9 * (1 - view.glory);
    dark.addColorStop(0, 'rgba(3,4,10,0)'); dark.addColorStop(.6, `rgba(3,4,10,${deep * 0.35})`); dark.addColorStop(1, `rgba(3,4,10,${deep})`);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 46, CW, CH - 46);
    const warm = ctx.createRadialGradient(lx, ly, 2, lx, ly, reach * 0.75);
    warm.addColorStop(0, 'rgba(255,214,130,.3)'); warm.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 46, CW, CH - 46);
  }
  if (view.hurt > 0) { ctx.fillStyle = `rgba(200,40,40,${0.3 * view.hurt})`; ctx.fillRect(0, 46, CW, CH - 46); }
  // Finished: the dawn comes up over the wall.
  if (view.glory > 0) {
    const c = Math.min(1, view.glory);
    const gl = ctx.createRadialGradient(CW / 2, GY - 60, 10, CW / 2, GY - 60, 340);
    gl.addColorStop(0, `rgba(255,244,205,${0.8 * c})`); gl.addColorStop(.45, `rgba(255,190,110,${0.38 * c})`); gl.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 46, CW, CH - 46);
  }

  ctx.restore();

  // HUD: the ride so far, chances left, and the lantern's oil.
  ctx.fillStyle = 'rgba(4,5,10,.82)';
  ctx.fillRect(0, 0, CW, 46);
  const m = Math.min(GOAL_M, Math.floor(s.dist / PX_PER_M));
  ctx.textAlign = 'left';
  ctx.font = '700 11px Cinzel, Georgia, serif';
  ctx.fillStyle = '#FFE2A8';
  ctx.fillText(`${m} / ${GOAL_M} M`, 10, 15);
  ctx.fillStyle = '#23233A'; ctx.fillRect(10, 20, 170, 7);
  ctx.fillStyle = '#8FB4E8'; ctx.fillRect(10, 20, 170 * Math.min(1, s.dist / GOAL_PX), 7);
  ctx.fillStyle = '#FFE2A8';
  ctx.fillRect(10 + 170 / 3 - 1, 18, 2, 11);
  ctx.fillRect(10 + 340 / 3 - 1, 18, 2, 11);
  ctx.textAlign = 'right';
  ctx.fillStyle = s.chances <= 1 ? '#FF6B81' : '#FFE2A8';
  ctx.fillText('CHANCES', CW - 10, 15);
  for (let i = 0; i < CHANCES; i++) {
    ctx.fillStyle = i < s.chances ? (s.chances <= 1 ? '#FF4D6D' : '#F0A93C') : '#23233A';
    ctx.fillRect(CW - 136 + i * 43, 20, 39, 7);
  }
  ctx.font = '600 11px Segoe UI, sans-serif';
  ctx.fillStyle = '#D6C8AE';
  ctx.fillText(LEG_NAMES[Math.min(2, s.gate - 1)], CW - 10, 41);
  ctx.textAlign = 'left';
  ctx.fillStyle = s.oil < 0.25 ? '#FF9A8A' : '#D6C8AE';
  ctx.fillText('Lantern', 10, 41);
  ctx.fillStyle = '#23233A'; ctx.fillRect(58, 34, 90, 6);
  ctx.fillStyle = s.oil < 0.25 ? '#FF6B4D' : '#FFD27A'; ctx.fillRect(58, 34, 90 * s.oil, 6);
  if (view.msg && view.msgT > 0) {
    ctx.textAlign = 'center';
    ctx.font = '700 14px Cinzel, Georgia, serif';
    // A long line shrinks to fit rather than running off the canvas.
    const wide = ctx.measureText(view.msg).width;
    if (wide > CW - 24) ctx.font = `700 ${(14 * (CW - 24) / wide).toFixed(1)}px Cinzel, Georgia, serif`;
    const a = Math.min(1, view.msgT);
    ctx.fillStyle = `rgba(4,5,10,${0.6 * a})`;
    ctx.fillRect(0, 56, CW, 28);
    ctx.fillStyle = `rgba(255,236,190,${a})`;
    ctx.fillText(view.msg, CW / 2, 75);
  }
}

const STUMBLE_TEXT = { rubble: 'The mount stumbles on the rubble!', pillar: 'Caught on a fallen pillar!', arch: 'Struck by a broken arch!', breach: 'Into a breach in the road!' };

/** Plays the ride. Resolves 'win' after the victory screen, or 'quit'. */
export function playNightRide({ rewards = [] } = {}) {
  return new Promise((resolve) => {
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'nr-overlay';
    overlay.innerHTML = `<div class="nr-card" role="dialog" aria-modal="true" aria-label="Nehemiah's Night Ride"></div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    const card = overlay.querySelector('.nr-card');
    let stopLoop = () => {};

    const finish = (result) => {
      stopLoop();
      overlay.remove();
      document.documentElement.style.overflow = '';
      resolve(result);
    };

    const openGuide = (returnFocus, onClose) => {
      let guide = card.querySelector('.nr-guide');
      if (!guide) {
        guide = document.createElement('div');
        guide.className = 'nr-guide';
        guide.setAttribute('role', 'dialog');
        guide.setAttribute('aria-label', 'How to play');
        guide.innerHTML = GUIDE_HTML;
        card.appendChild(guide);
      }
      guide.querySelector('[data-act="guide-close"]').onclick = () => {
        guide.hidden = true;
        card.classList.remove('guiding');
        if (returnFocus) returnFocus.focus({ preventScroll: true });
        if (onClose) onClose();
      };
      guide.hidden = false;
      card.classList.add('guiding');
      guide.querySelector('.nr-guide-scroll').scrollTop = 0;
      guide.querySelector('[data-act="guide-close"]').focus({ preventScroll: true });
    };

    const showTitle = () => {
      card.innerHTML = `
        <div class="nr-screen">
          <p class="nr-kicker">✦ The Ruins of Jerusalem ✦</p>
          <h2>Nehemiah's Night Ride</h2>
          <p>Before he said a word about rebuilding, Nehemiah rode out by night to see the broken walls and the burned gates for himself (Neh 2:12–15). Ride with him, by the light of one lantern.</p>
          <div class="nr-how">
            The mount never stops, and it keeps getting <b>faster</b>.<br>
            <b>Jump</b> over rubble, fallen pillars and breaches in the road.<br>
            Hold <b>Duck</b> to pass under a broken arch.<br>
            You see only what the <b>lantern</b> lights. Catch jars of <b>oil</b>.<br>
            You have <b>3 chances</b>. Each gate gives one back.<br>
            Ride <b>1,000 m</b>, back to the Valley Gate.
          </div>
          <button type="button" class="nr-go" data-act="begin">🏮 Ride Out</button>
          <button type="button" class="nr-go ghost" data-act="guide">❔ How to Play</button>
          <button type="button" class="nr-go ghost" data-act="quit">Not yet</button>
        </div>`;
      card.querySelector('[data-act="begin"]').onclick = () => run();
      card.querySelector('[data-act="guide"]').onclick = (e) => openGuide(e.currentTarget);
      card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
      card.querySelector('[data-act="begin"]').focus({ preventScroll: true });
    };

    const run = () => {
      card.innerHTML = `
        <div class="nr-top"><p class="nr-kicker">✦ The Night Ride ✦</p><div class="nr-top-btns"><button type="button" class="nr-small" data-act="guide">❔ Guide</button><button type="button" class="nr-small" data-act="retreat">Leave</button></div></div>
        <div class="nr-stage"><canvas width="${CW}" height="${CH}" aria-label="Nehemiah riding past the ruined walls of Jerusalem at night"></canvas><div class="nr-pause" hidden>Paused — tap to continue</div></div>
        <div class="nr-pad"><button type="button" data-do="duck">▼ Duck</button><button type="button" data-do="jump">▲ Jump</button></div>`;
      card.classList.add('running');
      const canvas = card.querySelector('canvas');
      const pauseEl = card.querySelector('.nr-pause');
      // Largest canvas that fits the space the stage really has: 360:560
      // upright, or 360:380 with the buttons at the sides when a phone is
      // held sideways (and it re-fits if the phone is turned mid-ride).
      const stage = card.querySelector('.nr-stage');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const ctx = canvas.getContext('2d');
      let viewH = 0;
      const fit = () => {
        const wide = window.innerHeight < 520 && window.innerWidth > window.innerHeight * 1.2;
        card.classList.toggle('wide', wide);
        const h = wide ? WIDE_H : CH;
        if (h !== viewH) {
          viewH = h;
          canvas.width = CW * dpr;
          canvas.height = h * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        const r = stage.getBoundingClientRect();
        const scale = Math.max(0.3, Math.min((r.width - (wide ? 0 : 20)) / CW, r.height / h));
        canvas.style.width = `${Math.floor(CW * scale)}px`;
        canvas.style.height = `${Math.floor(h * scale)}px`;
      };
      fit();
      const ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
      if (ro) ro.observe(stage);
      window.addEventListener('resize', fit);

      const s = newRide();
      const view = { time: 0, run: 0, msg: 'Out by the Valley Gate, into the night.', msgT: 2.6, dust: [], hurt: 0, flash: 0, tumble: 0, glory: 0 };
      const say = (msg, secs = 1.4) => { view.msg = msg; view.msgT = secs; };
      let jumpPressed = false;
      const ducking = { key: false, btn: false };
      let paused = false;
      let raf = 0;
      let last = performance.now();
      let ended = false;
      let warnedOil = false;

      const jumpBtn = card.querySelector('[data-do="jump"]');
      const duckBtn = card.querySelector('[data-do="duck"]');
      const setPaused = (p) => { paused = p; pauseEl.hidden = !p; last = performance.now(); if (p) { ducking.key = false; ducking.btn = false; duckBtn.classList.remove('held'); } };
      pauseEl.onclick = () => setPaused(false);
      const onVisibility = () => { if (document.hidden && !ended) setPaused(true); };
      document.addEventListener('visibilitychange', onVisibility);

      const jump = () => { if (!paused && !ended) jumpPressed = true; };
      const onKey = (e) => {
        const k = e.key;
        if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); ducking.key = true; return; }
        if (e.repeat) return;
        if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); jump(); }
        else if (k === 'Escape' || k === 'p' || k === 'P') setPaused(!paused);
      };
      const onKeyUp = (e) => { if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') ducking.key = false; };
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKeyUp);
      jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
      canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
      const duckOn = (e) => { e.preventDefault(); if (paused || ended) return; ducking.btn = true; duckBtn.classList.add('held'); try { duckBtn.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ } };
      const duckOff = () => { ducking.btn = false; duckBtn.classList.remove('held'); };
      duckBtn.addEventListener('pointerdown', duckOn);
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => duckBtn.addEventListener(type, duckOff));
      duckBtn.addEventListener('contextmenu', (e) => e.preventDefault());

      card.querySelector('[data-act="guide"]').onclick = (e) => { setPaused(true); pauseEl.hidden = true; openGuide(e.currentTarget, () => setPaused(false)); };
      card.querySelector('[data-act="retreat"]').onclick = () => {
        setPaused(true);
        if (confirm('Turn back from the ride? You can try again any time.')) finish('quit');
        else setPaused(false);
      };

      stopLoop = () => {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        window.removeEventListener('resize', fit);
        card.classList.remove('running', 'wide');
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('visibilitychange', onVisibility);
      };

      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!paused) {
          view.time += dt;
          if (!ended) {
            stepRide(s, dt, { jump: jumpPressed, duck: ducking.key || ducking.btn });
            jumpPressed = false;
            if (typeof window.__nightRideTestHook === 'function') window.__nightRideTestHook(s); // screenshot tests only
            if (s.y <= 0) view.run += dt * (9 + 5 * (s.dist / GOAL_PX));
            for (const ev of s.events) {
              if (ev.type === 'jump' || ev.type === 'land') view.dust.push({ x: RX - 6, age: 0 });
              if (ev.type === 'stumble') { say(s.chances > 0 ? STUMBLE_TEXT[ev.kind] : 'The ride is over.', 1.5); view.hurt = 1; view.tumble = 0.35; }
              if (ev.type === 'jar') { say('Oil for the lantern!', 1.1); view.flash = 0.35; }
              if (ev.type === 'gate') say(`${GATE_NAMES[ev.gate]}${ev.healed ? ': one chance restored' : ''}${ev.gate === 2 ? '. The way narrows!' : ''}`, 2.2);
            }
            if (!warnedOil && s.oil < 0.25) { warnedOil = true; say('The lantern is burning low!', 1.6); }
            if (s.oil > 0.5) warnedOil = false;
            if (s.outcome) {
              ended = true;
              if (s.outcome === 'win') say('Back at the Valley Gate!', 3);
              setTimeout(() => (s.outcome === 'win' ? victory() : defeat()), s.outcome === 'win' ? 2600 : 1300);
            }
          } else if (s.outcome === 'win') {
            view.glory = Math.min(1, view.glory + dt * 0.55);
          }
          for (const d of view.dust) d.age += dt;
          view.dust = view.dust.filter((d) => d.age < 0.45);
          view.hurt = Math.max(0, view.hurt - dt * 2.2);
          view.flash = Math.max(0, view.flash - dt);
          view.tumble = Math.max(0, view.tumble - dt * 0.9);
          view.msgT = Math.max(0, view.msgT - dt);
        }
        view.h = viewH;
        render(ctx, s, view);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      jumpBtn.focus({ preventScroll: true });

      const victory = () => {
        stopLoop();
        card.innerHTML = `
          <div class="nr-screen win">
            <p class="nr-kicker">✦ Victory ✦</p>
            <h2>The Whole Wall Seen</h2>
            <p>You rode the full circuit with ${s.stumbles ? `${s.stumbles} stumble${s.stumbles === 1 ? '' : 's'}` : 'not a single stumble'}${s.jars ? ` and ${s.jars} jar${s.jars === 1 ? '' : 's'} of oil` : ''}. Now Nehemiah knew the worst of it, and he could say to the people: "Come, let us rebuild the wall of Jerusalem" (Neh 2:17). And they answered, "Let us begin building!" (Neh 2:18).</p>
            ${rewards.length ? `<div class="nr-rewards">${rewards.map((x) => `<span>${x}</span>`).join('')}</div>` : ''}
            <button type="button" class="nr-go" data-act="done">Claim Your Rewards</button>
          </div>`;
        const done = card.querySelector('[data-act="done"]');
        done.onclick = () => finish('win');
        done.focus({ preventScroll: true });
      };

      const defeat = () => {
        stopLoop();
        const m = Math.floor(s.dist / PX_PER_M);
        card.innerHTML = `
          <div class="nr-screen">
            <p class="nr-kicker">✦ Three Stumbles ✦</p>
            <h2>The Night Is Too Dark</h2>
            <p>You rode ${m} of ${GOAL_M} m. "Your word is a lamp for my feet, a light for my path" (Ps 119:105). Keep the lantern full, watch the edge of the light, and ride out again.</p>
            <button type="button" class="nr-go" data-act="again">🏮 Try Again</button>
            <button type="button" class="nr-go ghost" data-act="quit">Leave for now</button>
          </div>`;
        card.querySelector('[data-act="again"]').onclick = () => run();
        card.querySelector('[data-act="quit"]').onclick = () => finish('quit');
        card.querySelector('[data-act="again"]').focus({ preventScroll: true });
      };
    };

    showTitle();
  });
}
