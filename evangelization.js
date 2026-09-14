// ============================================
// THE EVANGELIZATION — Mission 1: The Cross (Vault Game 5)
// Top-down stealth/exploration engine. See evangelizationContent.js for
// the map/content data this file renders and reacts to.
//
// GAMEPLAY FEATURE: 3-minute timer, Mystery Treasure Boxes (exactly one
// holds the Cross, others hold a protective Buff, a Seven-Deadly-Sins
// trap, or come up empty), a health/damage/revive system, and a Game
// Over -> 30s cooldown -> full-reset retry loop. None of the player-vs-
// soldier interaction is combat -- buffs only ever help evasion/recovery,
// sins only ever hinder it, per explicit design instruction.
// ============================================

import { db, doc, getDoc, runTransaction, increment, arrayUnion, updateDoc } from './firebase.js';
import { requireLogin } from './auth.js';
import { vaultGameBadgeId } from './vaultGames.js';
import { logActivity } from './activity.js';
import { showTreasureReveal } from './treasureReveal.js';
import {
  TILE, WORLD_COLS, WORLD_ROWS, MAP_REGIONS, START_TILE, CHECKPOINTS,
  BOX_TILES, EMPTY_BOX_TILES, BUFFS, SINS, TIME_LIMIT_SECONDS, GAME_OVER_COOLDOWN_SECONDS,
  MAX_HP, DAMAGE_PER_CATCH, START_REVIVE_POTIONS, REVIVE_HEAL_AMOUNT, BIRDS, BIRD_DAMAGE, SHEEP,
  SOLDIER_PATROLS, VILLAGE_TRIGGER, CROSS_OF_SALVATION_REWARD,
  TREASURE_ICON, GUIDE_STEPS, CATECHISM, CATECHISM_MIN_SECONDS, TICKETS
} from './evangelizationContent.js';

const { email, name } = requireLogin();

const root = document.getElementById('evgRoot');
const VIEW_W = 800, VIEW_H = 576;

/* ===========================================================================
 * ASSET LOADING
 * ========================================================================= */

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // fail soft -- a missing asset shouldn't hard-crash the mission
    img.src = src;
  });
}

async function loadAssets() {
  const [peter, paul, soldierImg, crossImg, treetop, trunk, mountains, bridges, house, chests] = await Promise.all([
    loadImage('assets/evangelization/st_peter.png'),
    loadImage('assets/evangelization/st_paul.png'),
    loadImage('assets/evangelization/roman_soldier.png'),
    loadImage('assets/evangelization/cross-item-icon.png'),
    loadImage('assets/evangelization/tiles/treetop.png'),
    loadImage('assets/evangelization/tiles/trunk.png'),
    loadImage('assets/evangelization/tiles/mountains.png'),
    loadImage('assets/evangelization/tiles/bridges.png'),
    loadImage('assets/evangelization/tiles/house.png'),
    loadImage('assets/evangelization/tiles/chests.png')
  ]);
  return { peter, paul, soldierImg, crossImg, treetop, trunk, mountains, bridges, house, chests };
}

/* ===========================================================================
 * MAP GRID
 * ========================================================================= */

function buildTerrainGrid() {
  const grid = [];
  for (let r = 0; r < WORLD_ROWS; r++) grid.push(new Array(WORLD_COLS).fill('G'));
  MAP_REGIONS.forEach((region) => {
    if (region.type === 'fill' || region.type === 'rect') {
      const [x, y, w, h] = region.rect;
      for (let r = y; r < y + h; r++) {
        for (let c = x; c < x + w; c++) {
          if (r >= 0 && r < WORLD_ROWS && c >= 0 && c < WORLD_COLS) grid[r][c] = region.code;
        }
      }
    } else if (region.type === 'cells') {
      region.cells.forEach(([c, r]) => { grid[r][c] = region.code; });
    }
  });
  return grid;
}

const BLOCKING = new Set(['M', 'T', 'W', 'H']);
function isBlockedTile(grid, col, row) {
  if (col < 0 || row < 0 || col >= WORLD_COLS || row >= WORLD_ROWS) return true;
  return BLOCKING.has(grid[row][col]);
}
function isBlockedBox(grid, x, y, w, h) {
  const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
  return corners.some(([px, py]) => isBlockedTile(grid, Math.floor(px / TILE), Math.floor(py / TILE)));
}

function tileCenter(col, row) { return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 }; }

/* ===========================================================================
 * STATIC WORLD LAYER (pre-rendered once -- ground + trees + rock + water +
 * bridge + house -- so the per-frame render is just a camera-cropped blit
 * plus the handful of things that actually move)
 * ========================================================================= */

function renderStaticLayer(grid, assets) {
  const world = document.createElement('canvas');
  world.width = WORLD_COLS * TILE;
  world.height = WORLD_ROWS * TILE;
  const ctx = world.getContext('2d');

  const GROUND_COLORS = { G: [58, 84, 46], D: [110, 84, 56], W: [36, 74, 98], R: [110, 84, 56], M: [46, 38, 34], H: [46, 38, 34], T: [58, 84, 46], V: [124, 96, 64] };
  for (let r = 0; r < WORLD_ROWS; r++) {
    for (let c = 0; c < WORLD_COLS; c++) {
      const code = grid[r][c];
      const [cr, cg, cb] = GROUND_COLORS[code] || GROUND_COLORS.G;
      const n = ((c * 928371 + r * 123457) % 17) - 8;
      ctx.fillStyle = `rgb(${cr + n},${cg + n},${cb + n})`;
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }

  // water shimmer bands (purely decorative, drawn once into the static layer)
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let r = 0; r < WORLD_ROWS; r++) {
    for (let c = 0; c < WORLD_COLS; c++) {
      if (grid[r][c] === 'W' && (c + r) % 4 === 0) ctx.fillRect(c * TILE, r * TILE + TILE / 2 - 2, TILE, 3);
    }
  }

  // bridge deck (stretched crop over every 'R' tile run)
  if (assets.bridges.complete) {
    for (let r = 0; r < WORLD_ROWS; r++) {
      for (let c = 0; c < WORLD_COLS; c++) {
        if (grid[r][c] === 'R') ctx.drawImage(assets.bridges, 0, 96, 64, 64, c * TILE, r * TILE, TILE, TILE);
      }
    }
  }

  // mountain / rock faces
  if (assets.mountains.complete) {
    for (let r = 0; r < WORLD_ROWS; r++) {
      for (let c = 0; c < WORLD_COLS; c++) {
        if (grid[r][c] === 'M') {
          const isBorder = c === 0 || r === 0 || c === WORLD_COLS - 1 || r === WORLD_ROWS - 1;
          const sx = isBorder ? 192 : 0;
          ctx.drawImage(assets.mountains, sx, 0, 96, 96, c * TILE - TILE / 2, r * TILE - TILE / 2, TILE * 2, TILE * 2);
        }
      }
    }
  }

  // house walls + roof + door (drawn as one composed block over the H/V footprint)
  if (assets.house.complete) {
    for (let r = 0; r < WORLD_ROWS; r++) {
      for (let c = 0; c < WORLD_COLS; c++) {
        if (grid[r][c] === 'H') ctx.drawImage(assets.house, 0, 0, 96, 96, c * TILE, r * TILE, TILE, TILE);
      }
    }
    // roof cap along the top row of the house footprint
    for (let c = 34; c < 39; c++) ctx.drawImage(assets.house, 0, 96, 96, 96, c * TILE, 10 * TILE - TILE, TILE, TILE);
    ctx.drawImage(assets.house, 96, 0, 32, 64, VILLAGE_TRIGGER.col * TILE, VILLAGE_TRIGGER.row * TILE - TILE / 2, TILE, TILE * 1.5);
  }

  // trees (trunk + rounded pine top, drawn per 'T' cell)
  if (assets.treetop.complete && assets.trunk.complete) {
    for (let r = 0; r < WORLD_ROWS; r++) {
      for (let c = 0; c < WORLD_COLS; c++) {
        if (grid[r][c] === 'T') {
          ctx.drawImage(assets.trunk, 96, 0, 96, 96, c * TILE - TILE / 2, r * TILE, TILE * 1.5, TILE);
          ctx.drawImage(assets.treetop, 96, 96, 96, 128, c * TILE - TILE / 2, r * TILE - TILE * 1.4, TILE * 1.5, TILE * 2);
        }
      }
    }
  }

  return world;
}

/* ===========================================================================
 * MYSTERY TREASURE BOXES — content shuffled fresh every game. Exactly one
 * box holds the Cross; the rest are drawn from Buffs, Sins, and a couple
 * of empty duds, then shuffled across the fixed candidate tile positions.
 * ========================================================================= */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateBoxes() {
  const pool = [
    { type: 'buff', def: BUFFS[0] }, { type: 'buff', def: BUFFS[1] },
    { type: 'buff', def: BUFFS[2] }, { type: 'buff', def: BUFFS[3] },
    { type: 'sin', def: SINS[0] }, { type: 'sin', def: SINS[1] },
    { type: 'sin', def: SINS[2] }
  ];
  const shuffledPool = shuffle(pool);
  const tiles = shuffle(BOX_TILES);
  const crossIndex = Math.floor(Math.random() * tiles.length);

  const realBoxes = tiles.map((tile, i) => ({
    col: tile.col,
    row: tile.row,
    content: i === crossIndex ? { type: 'cross' } : (shuffledPool[i > crossIndex ? i - 1 : i] || { type: 'empty' }),
    opened: false
  }));
  // A second, fixed set of always-empty decoy boxes -- separate from the
  // shuffled pool above so they never eat into the odds of a real box
  // holding the Cross/a Buff/a Sin, just more ground worth exploring.
  const emptyBoxes = EMPTY_BOX_TILES.map((tile) => ({
    col: tile.col,
    row: tile.row,
    content: { type: 'empty' },
    opened: false
  }));
  return [...realBoxes, ...emptyBoxes];
}

/* ===========================================================================
 * GAME STATE
 * ========================================================================= */

const grid = buildTerrainGrid();

function freshState() {
  const s = {
    player: { x: START_TILE.col * TILE, y: START_TILE.row * TILE, dir: 'down', frame: 0, frameTimer: 0, moving: false, carrying: false },
    soldiers: SOLDIER_PATROLS.map((patrol) => ({
      x: patrol[0].col * TILE, y: patrol[0].row * TILE, dir: 'down', frame: 0, frameTimer: 0,
      patrol, patrolIndex: 0, mode: 'patrol', searchTimer: 0, lastSeen: null
    })),
    itemCollected: false,
    checkpoint: { id: 'start', pos: tileCenter(START_TILE.col, START_TILE.row), hadItem: false },
    lastCheckpointId: 'start',
    character: 'peter',
    running: false,
    frozen: false,
    respawnGrace: 0,
    revealed: [],
    keys: new Set(),
    boxes: generateBoxes(),
    birds: BIRDS.map(([x0, y0, range, speed]) => ({ x0, y0, range, speed, x: x0, y: y0, ph: Math.random() * 6, hitCooldown: 0, clock: 0 })),
    sheep: SHEEP.map(([x0, y0]) => ({ x0, y0, x: x0, y: y0, ph: Math.random() * 6, clock: 0 })),
    hp: MAX_HP,
    revivePotions: START_REVIVE_POTIONS,
    activeBuffs: {},
    activeSins: {},
    timeRemaining: TIME_LIMIT_SECONDS,
    timerWarned60: false,
    timerWarned30: false,
    gameOver: null,
    cooldownRemaining: 0,
    lastGuardianToast: 0
  };
  for (let r = 0; r < WORLD_ROWS; r++) s.revealed.push(new Array(WORLD_COLS).fill(false));
  return s;
}

let state = freshState();

const PLAYER_SPEED = 150;
const SOLDIER_PATROL_SPEED = 90;
const SOLDIER_CHASE_SPEED = 130;
const DETECT_RADIUS = 130;
const LOSE_RADIUS = 240;
const CATCH_RADIUS = 20;
const REVEAL_RADIUS_TILES = 5;

function hitbox(entity) { return { x: entity.x + 22, y: entity.y + 42, w: 20, h: 16 }; }
function hasBuff(id) { return !!state.activeBuffs[id]; }
function hasSin(id) { return !!state.activeSins[id]; }

/* ===========================================================================
 * UI WIRING (canvas + HUD live in vault-evangelization.html)
 * ========================================================================= */

let canvas, ctx, minimapCanvas, minimapCtx, staticLayer, assets;
let objectiveEl, itemStatusEl, villagesEl, toastEl, gameOverModal, headerGuideBtn;
let hpFillEl, hpTextEl, timerTextEl, timerWrapEl, statusRowEl;

function setObjective(text) { if (objectiveEl) objectiveEl.textContent = text; }
function setItemStatus(text) { if (itemStatusEl) itemStatusEl.textContent = text; }
function showToast(text, kind = 'normal') {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.className = 'on';
  if (kind === 'bad') toastEl.classList.add('evg-toast-bad');
  if (kind === 'good') toastEl.classList.add('evg-toast-good');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toastEl.classList.remove('on'); }, 2800);
}

// Box-opening reveal -- a proper card (icon badge, title, description),
// not just a text pill, since this is the moment the brief calls out
// specifically ("Reveal the Cross... clearly indicate..."). Non-blocking:
// the game keeps running underneath it, same as the plain toast, just
// held on screen noticeably longer and dressed for the occasion.
const BOX_REVEAL_KIND = {
  cross: { border: 'rgba(243,180,95,0.7)', glow: 'rgba(243,180,95,0.35)', titleColor: '#f3b45f' },
  buff: { border: 'rgba(90,200,120,0.7)', glow: 'rgba(90,200,120,0.3)', titleColor: '#8fe3a8' },
  sin: { border: 'rgba(226,75,75,0.7)', glow: 'rgba(226,75,75,0.3)', titleColor: '#e77b7b' },
  empty: { border: 'rgba(255,255,255,0.25)', glow: 'rgba(255,255,255,0.1)', titleColor: 'rgba(246,230,194,0.8)' }
};

function showBoxReveal(kind, icon, title, note) {
  const existing = document.getElementById('evgBoxReveal');
  if (existing) existing.remove();

  const palette = BOX_REVEAL_KIND[kind] || BOX_REVEAL_KIND.empty;
  const card = document.createElement('div');
  card.id = 'evgBoxReveal';
  card.className = 'evg-box-reveal';
  card.style.setProperty('--evg-reveal-border', palette.border);
  card.style.setProperty('--evg-reveal-glow', palette.glow);
  card.innerHTML = `
    <div class="evg-box-reveal-icon">${icon}</div>
    <div class="evg-box-reveal-text">
      <p class="evg-box-reveal-title" style="color:${palette.titleColor}">${title}</p>
      <p class="evg-box-reveal-note">${note}</p>
    </div>
  `;
  card.addEventListener('click', () => dismiss());
  document.body.appendChild(card);

  function dismiss() {
    if (!card.isConnected) return;
    card.classList.add('evg-box-reveal-out');
    setTimeout(() => card.remove(), 320);
  }

  clearTimeout(showBoxReveal._t);
  showBoxReveal._t = setTimeout(dismiss, 5200);
}

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateHud() {
  if (hpFillEl) hpFillEl.style.width = `${Math.max(0, state.hp / MAX_HP * 100)}%`;
  if (hpTextEl) hpTextEl.textContent = `❤️ LIFE: ${Math.max(0, Math.round(state.hp))}/${MAX_HP}`;
  if (timerTextEl) timerTextEl.textContent = `⏱ TIME: ${formatTime(state.timeRemaining)}`;
  if (timerWrapEl) timerWrapEl.classList.toggle('evg-timer-urgent', state.timeRemaining <= 10);
  if (statusRowEl) {
    const chips = [];
    Object.entries(state.activeBuffs).forEach(([id, remaining]) => {
      const def = BUFFS.find((b) => b.id === id);
      if (def) chips.push(`<span class="evg-status-chip evg-status-buff">${def.icon} ${Math.ceil(remaining)}s</span>`);
    });
    Object.entries(state.activeSins).forEach(([id, remaining]) => {
      const def = SINS.find((sn) => sn.id === id);
      if (def) chips.push(`<span class="evg-status-chip evg-status-sin">${def.icon} ${Math.ceil(remaining)}s</span>`);
    });
    statusRowEl.innerHTML = chips.join('');
  }
}

/* ===========================================================================
 * INPUT
 * ========================================================================= */

const KEY_MAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
};
window.addEventListener('keydown', (e) => { if (KEY_MAP[e.code]) { state.keys.add(KEY_MAP[e.code]); e.preventDefault(); } });
window.addEventListener('keyup', (e) => { if (KEY_MAP[e.code]) state.keys.delete(KEY_MAP[e.code]); });

function wireTouchPad() {
  document.querySelectorAll('#evgPad .evg-pad-btn').forEach((btn) => {
    const dir = btn.dataset.dir;
    const press = (e) => { e.preventDefault(); state.keys.add(dir); };
    const release = (e) => { e.preventDefault(); state.keys.delete(dir); };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
  });
}

/* ===========================================================================
 * UPDATE
 * ========================================================================= */

function tryMove(entity, dx, dy) {
  const box = hitbox(entity);
  if (dx !== 0 && !isBlockedBox(grid, box.x + dx, box.y, box.w, box.h)) entity.x += dx;
  if (dy !== 0 && !isBlockedBox(grid, box.x, box.y + dy, box.w, box.h)) entity.y += dy;
}

function updatePlayer(dt) {
  // Lust freezes the player in place -- the timer, soldier, and every
  // other system keep running around them regardless.
  if (hasSin('lust')) { state.player.moving = false; animate(state.player, dt, false); return; }

  let dx = 0, dy = 0;
  if (state.keys.has('up')) dy -= 1;
  if (state.keys.has('down')) dy += 1;
  if (state.keys.has('left')) dx -= 1;
  if (state.keys.has('right')) dx += 1;
  const moving = dx !== 0 || dy !== 0;
  if (moving) {
    let speed = PLAYER_SPEED;
    if (hasBuff('swift_feet')) speed *= BUFFS.find((b) => b.id === 'swift_feet').multiplier;
    if (hasSin('sloth')) speed *= SINS.find((sn) => sn.id === 'sloth').multiplier;
    const len = Math.hypot(dx, dy) || 1;
    dx = (dx / len) * speed * dt;
    dy = (dy / len) * speed * dt;
    if (Math.abs(dx) > Math.abs(dy)) state.player.dir = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) state.player.dir = dy > 0 ? 'down' : 'up';
    tryMove(state.player, dx, dy);
  }
  state.player.moving = moving;
  animate(state.player, dt, moving);
}

const DIR_ROW = { up: 0, left: 1, down: 2, right: 3 };
function animate(entity, dt, moving) {
  if (!moving) { entity.frame = 0; entity.frameTimer = 0; return; }
  entity.frameTimer += dt;
  if (entity.frameTimer > 0.12) {
    entity.frameTimer = 0;
    entity.frame = (entity.frame + 1) % 8;
  }
}

function updateOneSoldier(s, dt, wrath) {
  const p = state.player;
  const dist = Math.hypot(p.x - s.x, p.y - s.y);
  const detectRadius = DETECT_RADIUS * wrath;

  if (s.mode !== 'chase' && dist < detectRadius) { s.mode = 'chase'; }
  else if (s.mode === 'chase' && dist > LOSE_RADIUS) { s.mode = 'search'; s.searchTimer = 3; s.lastSeen = { x: p.x, y: p.y }; }

  let targetX, targetY;
  if (s.mode === 'chase') {
    targetX = p.x; targetY = p.y;
  } else if (s.mode === 'search') {
    s.searchTimer -= dt;
    targetX = s.lastSeen.x; targetY = s.lastSeen.y;
    if (s.searchTimer <= 0 || Math.hypot(targetX - s.x, targetY - s.y) < 6) s.mode = 'patrol';
  } else {
    const wp = s.patrol[s.patrolIndex];
    const c = tileCenter(wp.col, wp.row);
    targetX = c.x - 16; targetY = c.y - 32;
    if (Math.hypot(targetX - s.x, targetY - s.y) < 4) s.patrolIndex = (s.patrolIndex + 1) % s.patrol.length;
  }

  const ddx = targetX - s.x, ddy = targetY - s.y;
  const dd = Math.hypot(ddx, ddy);
  let speed = s.mode === 'chase' ? SOLDIER_CHASE_SPEED : SOLDIER_PATROL_SPEED;
  if (s.mode === 'chase') speed *= wrath;
  const moving = dd > 3;
  if (moving) {
    const mx = (ddx / dd) * speed * dt;
    const my = (ddy / dd) * speed * dt;
    if (Math.abs(mx) > Math.abs(my)) s.dir = mx > 0 ? 'right' : 'left';
    else s.dir = my > 0 ? 'down' : 'up';
    tryMove(s, mx, my);
  }
  animate(s, dt, moving);

  if (state.respawnGrace > 0) return;
  if (Math.hypot(p.x - s.x, p.y - s.y) < CATCH_RADIUS) handleCatch();
}

function updateSoldiers(dt) {
  const wrath = hasSin('wrath') ? SINS.find((sn) => sn.id === 'wrath').multiplier : 1;
  state.soldiers.forEach((s) => updateOneSoldier(s, dt, wrath));
}

const BIRD_CATCH_RADIUS = 18;
function updateBirds(dt) {
  const p = state.player;
  state.birds.forEach((b) => {
    b.clock = (b.clock || 0) + dt;
    b.x = b.x0 + Math.sin(b.clock * b.speed + b.ph) * b.range;
    b.y = b.y0 + Math.sin(b.clock * 2 + b.ph) * 4;
    if (b.hitCooldown > 0) { b.hitCooldown -= dt; return; }
    if (Math.hypot(p.x - b.x, p.y - b.y) < BIRD_CATCH_RADIUS) {
      b.hitCooldown = 1.5;
      handleBirdHit();
    }
  });
}

// Purely decorative -- no collision, just wanders slowly around its own
// home point so the meadow doesn't feel empty.
function updateSheep(dt) {
  state.sheep.forEach((s) => {
    s.clock = (s.clock || 0) + dt;
    s.x = s.x0 + Math.sin(s.clock * 0.3 + s.ph) * 14;
    s.y = s.y0 + Math.sin(s.clock * 0.22 + s.ph * 1.4) * 6;
  });
}

/* ===========================================================================
 * CATCH / DAMAGE / DEATH — no combat either direction. Getting caught costs
 * health and sends the player back to their last checkpoint; it never
 * pauses the game or the timer. Health hitting 0 checks for a Revive
 * Potion before ending the mission.
 * ========================================================================= */

function handleCatch() {
  if (hasBuff('guardian_angel')) {
    if (performance.now() - state.lastGuardianToast > 3000) {
      showToast('😇 Guardian Angel shields you from the soldier!', 'good');
      state.lastGuardianToast = performance.now();
    }
    respawnAtCheckpoint();
    return;
  }
  applyDamage(DAMAGE_PER_CATCH, 'Caught by the soldier');
  respawnAtCheckpoint();
}

// Unlike handleCatch(), a bird hit does NOT respawn the player to a
// checkpoint -- it only costs HP. Losing the mission from birds alone
// still has to go through hitting 0 HP (handleDeath, via applyDamage),
// same as every other damage source.
function handleBirdHit() {
  if (hasBuff('guardian_angel')) {
    if (performance.now() - state.lastGuardianToast > 3000) {
      showToast('😇 Guardian Angel shields you from the bird!', 'good');
      state.lastGuardianToast = performance.now();
    }
    return;
  }
  applyDamage(BIRD_DAMAGE, 'Struck by a bird');
}

function respawnAtCheckpoint() {
  const cp = state.checkpoint;
  state.player.x = cp.pos.x - 32;
  state.player.y = cp.pos.y - 48;
  state.player.carrying = cp.hadItem;
  state.itemCollected = cp.hadItem;
  if (!cp.hadItem) setObjective('Find the Mystery Treasure Box with the Cross.');
  setItemStatus(cp.hadItem ? 'Carrying: The Cross' : 'Not carrying an item');
  state.soldiers.forEach((s) => { s.mode = 'patrol'; s.lastSeen = null; });
  // a checkpoint can legitimately sit close to the patrol loop (CP2/CP3
  // guard the item clearing) -- without this, a respawn can land the
  // player right back next to the soldier and get caught again instantly
  state.respawnGrace = 1.5;
}

function applyDamage(amount, reason) {
  if (state.gameOver) return;
  state.hp = Math.max(0, state.hp - amount);
  showToast(`${reason}! -${amount} HP`, 'bad');
  updateHud();
  if (state.hp <= 0) handleDeath();
}

function handleDeath() {
  if (state.revivePotions > 0) {
    state.revivePotions -= 1;
    state.hp = REVIVE_HEAL_AMOUNT;
    showToast(`✝️ A Revive Potion saved you! (${state.revivePotions} left)`, 'good');
    updateHud();
    return;
  }
  triggerGameOver('death');
}

/* ===========================================================================
 * MYSTERY TREASURE BOXES
 * ========================================================================= */

function updateBoxes() {
  state.boxes.forEach((box) => {
    if (box.opened) return;
    const c = tileCenter(box.col, box.row);
    const d = Math.hypot(state.player.x + 32 - c.x, state.player.y + 48 - c.y);
    if (d < 24) openBox(box);
  });
}

function openBox(box) {
  box.opened = true;
  const content = box.content;

  if (content.type === 'cross') {
    state.itemCollected = true;
    state.player.carrying = true;
    showBoxReveal('cross', '✝️', 'THE CROSS HAS BEEN FOUND!', 'Return it safely to the village.');
    setObjective('Return The Cross to the Village.');
    setItemStatus('Carrying: The Cross');
    return;
  }

  if (content.type === 'buff') {
    const b = content.def;
    if (b.kind === 'heal') {
      state.hp = Math.min(MAX_HP, state.hp + b.amount);
    } else {
      state.activeBuffs[b.id] = b.duration;
    }
    showBoxReveal('buff', b.icon, b.name, b.note);
    updateHud();
    return;
  }

  if (content.type === 'sin') {
    const s = content.def;
    if (s.kind === 'alert_soldier') {
      const nearest = state.soldiers.reduce((best, sol) => {
        const d = Math.hypot(state.player.x - sol.x, state.player.y - sol.y);
        return d < best.d ? { sol, d } : best;
      }, { sol: state.soldiers[0], d: Infinity }).sol;
      nearest.mode = 'chase';
    } else {
      state.activeSins[s.id] = s.duration;
    }
    showBoxReveal('sin', s.icon, s.name, s.note);
    updateHud();
    return;
  }

  showBoxReveal('empty', '📦', 'Empty', 'Nothing but dust in this one.');
}

function updateTimedEffects(dt) {
  Object.keys(state.activeBuffs).forEach((id) => {
    state.activeBuffs[id] -= dt;
    if (state.activeBuffs[id] <= 0) delete state.activeBuffs[id];
  });
  Object.keys(state.activeSins).forEach((id) => {
    if (id === 'gluttony') applyDamage(SINS.find((s) => s.id === 'gluttony').dps * dt, 'Gluttony');
    state.activeSins[id] -= dt;
    if (state.activeSins[id] <= 0) delete state.activeSins[id];
  });
}

function updateCheckpoints() {
  CHECKPOINTS.forEach((cp) => {
    const c = tileCenter(cp.col, cp.row);
    const d = Math.hypot(state.player.x + 32 - c.x, state.player.y + 48 - c.y);
    if (d < 24 && state.lastCheckpointId !== cp.id) {
      state.lastCheckpointId = cp.id;
      state.checkpoint = { id: cp.id, pos: c, hadItem: state.player.carrying };
    }
  });
}

function updateVillage() {
  if (state.player.carrying && !state.frozen) {
    const c = tileCenter(VILLAGE_TRIGGER.col, VILLAGE_TRIGGER.row);
    const d = Math.hypot(state.player.x + 32 - c.x, state.player.y + 48 - c.y);
    if (d < 26 && state.timeRemaining > 0) triggerMissionComplete();
  }
}

function updateFog() {
  if (hasSin('envy')) return; // Envy: fixated on what you lack, no new ground is revealed
  const pc = Math.floor((state.player.x + 32) / TILE);
  const pr = Math.floor((state.player.y + 48) / TILE);
  for (let r = pr - REVEAL_RADIUS_TILES; r <= pr + REVEAL_RADIUS_TILES; r++) {
    for (let c = pc - REVEAL_RADIUS_TILES; c <= pc + REVEAL_RADIUS_TILES; c++) {
      if (r >= 0 && r < WORLD_ROWS && c >= 0 && c < WORLD_COLS) {
        if (Math.hypot(c - pc, r - pr) <= REVEAL_RADIUS_TILES) state.revealed[r][c] = true;
      }
    }
  }
}

/* ===========================================================================
 * TIMER — independent of buffs, sins, damage, and revival. Only pauses
 * while state.frozen (character-select banner, guide, catechism, treasure
 * reveal, game over) -- i.e. while the real game loop itself isn't running.
 * ========================================================================= */

function updateTimer(dt) {
  if (state.gameOver) return;
  state.timeRemaining -= dt;
  if (!state.timerWarned60 && state.timeRemaining <= 60) {
    state.timerWarned60 = true;
    showToast('⚠️ 1 MINUTE REMAINING!', 'bad');
  }
  if (!state.timerWarned30 && state.timeRemaining <= 30) {
    state.timerWarned30 = true;
    showToast('⚠️ 30 SECONDS REMAINING!', 'bad');
  }
  if (state.timeRemaining <= 0) {
    state.timeRemaining = 0;
    triggerGameOver('time');
  }
}

/* ===========================================================================
 * RENDER
 * ========================================================================= */

function drawSprite(sheet, entity, offsetX, offsetY) {
  if (!sheet || !sheet.complete) return;
  const row = DIR_ROW[entity.dir];
  const frameCol = entity.frame % 8;
  ctx.drawImage(sheet, frameCol * 64, row * 64, 64, 64, entity.x - offsetX, entity.y - offsetY - 24, 64, 64);
}

// Plain canvas shapes, not a sprite sheet -- purely decorative, so no
// asset was worth adding just for this.
function drawSheep(s, offsetX, offsetY) {
  const x = s.x - offsetX, y = s.y - offsetY;
  ctx.fillStyle = '#e8e4d8';
  ctx.beginPath(); ctx.ellipse(x, y, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2622';
  ctx.beginPath(); ctx.ellipse(x + 10, y - 2, 4.5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 7, y + 6, 2, 5); ctx.fillRect(x + 4, y + 6, 2, 5);
}

function drawBird(b, offsetX, offsetY) {
  const x = b.x - offsetX, y = b.y - offsetY;
  const flap = Math.sin(b.clock * 9) * 6;
  ctx.strokeStyle = 'rgba(10,10,12,.92)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 10, y + flap * .6); ctx.quadraticCurveTo(x - 4, y - 3, x, y);
  ctx.quadraticCurveTo(x + 4, y - 3, x + 10, y + flap * .6);
  ctx.stroke();
}

function render(camX, camY) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.drawImage(staticLayer, camX, camY, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);

  // Mystery Treasure Boxes -- closed until opened; contents are never
  // shown on the box itself, only in the toast at the moment it opens.
  if (assets.chests.complete) {
    state.boxes.forEach((box) => {
      const c = tileCenter(box.col, box.row);
      const sy = box.opened ? 32 : 0;
      ctx.drawImage(assets.chests, 0, sy, 32, 32, c.x - 16 - camX, c.y - 16 - camY, 32, 32);
    });
  }

  const sheet = state.character === 'paul' ? assets.paul : assets.peter;
  const entities = [
    ...state.soldiers.map((s) => ({ y: s.y, draw: () => drawSprite(assets.soldierImg, s, camX, camY) })),
    ...state.sheep.map((s) => ({ y: s.y, draw: () => drawSheep(s, camX, camY) })),
    { y: state.player.y, draw: () => drawSprite(sheet, state.player, camX, camY) }
  ].sort((a, b) => a.y - b.y);
  entities.forEach((it) => it.draw());

  // birds fly above everything else
  state.birds.forEach((b) => drawBird(b, camX, camY));

  renderMinimap();
}

function renderMinimap() {
  if (!minimapCtx) return;
  const mw = minimapCanvas.width, mh = minimapCanvas.height;

  if (hasSin('pride')) {
    minimapCtx.fillStyle = '#000';
    minimapCtx.fillRect(0, 0, mw, mh);
    minimapCtx.fillStyle = '#c9a3ff';
    minimapCtx.font = '10px sans-serif';
    minimapCtx.textAlign = 'center';
    minimapCtx.fillText('👑', mw / 2, mh / 2 + 3);
    return;
  }

  const sx = mw / WORLD_COLS, sy = mh / WORLD_ROWS;
  const fullReveal = hasBuff('lantern_of_clarity');
  minimapCtx.fillStyle = '#000';
  minimapCtx.fillRect(0, 0, mw, mh);
  const COLORS = { G: '#2b4a22', D: '#6b5334', W: '#1c4a63', R: '#6b5334', M: '#3a2a1c', H: '#55525a', T: '#234a1c', V: '#7c6040' };
  for (let r = 0; r < WORLD_ROWS; r++) {
    for (let c = 0; c < WORLD_COLS; c++) {
      if (fullReveal || state.revealed[r][c]) {
        minimapCtx.fillStyle = COLORS[grid[r][c]] || '#2b4a22';
        minimapCtx.fillRect(c * sx, r * sy, sx + 0.5, sy + 0.5);
      }
    }
  }
  // village marker pierces fog -- you always know your destination
  minimapCtx.fillStyle = '#f3b45f';
  minimapCtx.fillRect(VILLAGE_TRIGGER.col * sx - 1, VILLAGE_TRIGGER.row * sy - 1, sx + 2, sy + 2);

  state.boxes.forEach((box) => {
    if (!box.opened && (fullReveal || state.revealed[box.row][box.col])) {
      minimapCtx.fillStyle = '#ffd75e';
      minimapCtx.beginPath();
      minimapCtx.arc(box.col * sx, box.row * sy, 2, 0, Math.PI * 2);
      minimapCtx.fill();
    }
  });

  minimapCtx.fillStyle = '#e24b4b';
  state.soldiers.forEach((s) => {
    minimapCtx.beginPath();
    minimapCtx.arc((s.x + 32) / TILE * sx, (s.y + 48) / TILE * sy, 2.2, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  minimapCtx.fillStyle = '#1a1a1e';
  state.birds.forEach((b) => {
    minimapCtx.beginPath();
    minimapCtx.arc(b.x / TILE * sx, b.y / TILE * sy, 1.8, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  minimapCtx.fillStyle = '#5be26b';
  minimapCtx.beginPath();
  minimapCtx.arc((state.player.x + 32) / TILE * sx, (state.player.y + 48) / TILE * sy, 2.4, 0, Math.PI * 2);
  minimapCtx.fill();
}

/* ===========================================================================
 * MISSION EVENTS
 * ========================================================================= */

function triggerMissionComplete() {
  state.frozen = true;
  state.keys.clear();
  setObjective('Mission Complete!');
  if (villagesEl) villagesEl.textContent = 'Villages Evangelized: 1/1';
  awardCompletion().then(() => {
    showMissionCompletePopup(() => {
      showCatechism(() => {
        showTreasureReveal({
          iconSrc: TREASURE_ICON,
          kicker: 'The Evangelization Complete',
          heading: 'The Cross of Salvation',
          subheading: 'The first village has been evangelized.',
          chips: [
            ...CROSS_OF_SALVATION_REWARD.tickets.map(({ key, count }) => `+${count} ${TICKETS[key].name}`),
            `+${CROSS_OF_SALVATION_REWARD.unlockTokens} Artifact Unlock Tokens`
          ]
        });
      });
    });
  });
}

// A small, quick, unmistakably readable confirmation the instant the Cross
// reaches the village -- separate from the fuller catechism/treasure
// sequence that follows it, so the moment of actually finishing the
// mission gets its own clear beat instead of sliding straight into reading.
function showMissionCompletePopup(onDone) {
  const card = document.createElement('div');
  card.className = 'evg-mission-complete';
  card.innerHTML = `
    <div class="evg-mission-complete-icon">✝️</div>
    <p class="evg-mission-complete-title">MISSION COMPLETE</p>
    <p class="evg-mission-complete-sub">The Cross has been returned to the village.</p>
  `;
  document.body.appendChild(card);
  setTimeout(() => {
    card.classList.add('evg-mission-complete-out');
    setTimeout(() => {
      card.remove();
      onDone();
    }, 300);
  }, 2400);
}

async function awardCompletion() {
  const studentRef = doc(db, 'students', email);
  try {
    const alreadyDone = await runTransaction(db, async (tx) => {
      const snap = await tx.get(studentRef);
      const data = snap.data() || {};
      const existing = (data.vaultGames || {}).evangelization;
      if (existing && existing.completed) return true;
      const updates = {
        'vaultGames.evangelization.completed': true,
        'vaultGames.evangelization.completedAt': new Date().toISOString(),
        achievements: arrayUnion(vaultGameBadgeId('evangelization')),
        unlockTokens: increment(CROSS_OF_SALVATION_REWARD.unlockTokens)
      };
      CROSS_OF_SALVATION_REWARD.tickets.forEach(({ key, count }) => {
        updates[`tickets.${TICKETS[key].ticket}`] = increment(count);
      });
      tx.update(studentRef, updates);
      return false;
    });
    if (!alreadyDone) {
      logActivity({ email, name, type: 'vaultgame', title: 'Carried the Cross safely to the village and opened the Cross of Salvation', icon: '✝' });
    }
  } catch (err) {
    console.error('Failed to award Evangelization completion:', err);
  }
}

/* ===========================================================================
 * GAME OVER — timer hit zero, or health hit zero with no Revive Potion
 * left. Hard-freezes everything (this DOES pause the timer, unlike a
 * normal catch), then a 30s cooldown before "Play Again" resets the
 * whole attempt from scratch.
 * ========================================================================= */

function triggerGameOver(reason) {
  if (state.gameOver) return;
  state.gameOver = reason;
  state.frozen = true;
  state.keys.clear();

  const headingEl = document.getElementById('evgGameOverHeading');
  const messageEl = document.getElementById('evgGameOverMessage');
  const cooldownEl = document.getElementById('evgGameOverCooldown');
  const restartBtn = document.getElementById('evgRestartBtn');

  if (reason === 'time') {
    headingEl.textContent = "⏰ TIME'S UP!";
    messageEl.textContent = 'You failed to return the Cross to the village in time.';
  } else {
    headingEl.textContent = 'YOUR MISSION HAS ENDED';
    messageEl.textContent = 'The soldier caught you once too often, and no Revive Potion remained.';
  }

  state.cooldownRemaining = GAME_OVER_COOLDOWN_SECONDS;
  restartBtn.disabled = true;
  const tick = () => {
    cooldownEl.textContent = `Restart available in: ${Math.ceil(state.cooldownRemaining)}`;
    if (state.cooldownRemaining <= 0) {
      cooldownEl.textContent = '';
      restartBtn.disabled = false;
      clearInterval(cooldownHandle);
    }
  };
  tick();
  const cooldownHandle = setInterval(() => {
    state.cooldownRemaining -= 1;
    tick();
  }, 1000);

  gameOverModal.classList.add('on');
}

function restartMission() {
  const restartBtn = document.getElementById('evgRestartBtn');
  if (restartBtn.disabled) return;

  gameOverModal.classList.remove('on');
  toastEl.classList.remove('on');
  state = freshState();
  updateHud();
  setObjective('Find the Mystery Treasure Box with the Cross.');
  setItemStatus('Not carrying an item');
  if (villagesEl) villagesEl.textContent = 'Villages Evangelized: 0/1';
  updateFog();
}

/* ===========================================================================
 * CATECHISM — mandatory, no skip/close, gated on BOTH a minimum read-timer
 * AND scrolling to the end. Same pattern as every other Vault Game's
 * catechism (see scriptorium.js's showCatechism for the original).
 * ========================================================================= */

function showCatechism(onDone) {
  let secondsLeft = CATECHISM_MIN_SECONDS;
  let reachedEnd = false;

  const overlay = document.createElement('div');
  overlay.className = 'evg-catechism-overlay';
  overlay.innerHTML = `
    <div class="evg-catechism-card">
      <div class="evg-catechism-scroll" id="evgCatechismScroll">
        <p class="evg-learning-kicker">Learning Moment</p>
        <h2 class="evg-catechism-title">${CATECHISM.title}</h2>
        <p class="evg-catechism-intro">${CATECHISM.intro}</p>
        ${CATECHISM.sections.map((s) => `
          <div class="evg-catechism-section">
            <h4 class="evg-catechism-heading">${s.heading}</h4>
            <p class="evg-catechism-body">${s.body}</p>
            ${s.quote ? `
              <blockquote class="evg-catechism-quote">
                &ldquo;${s.quote}&rdquo;
                <cite>&mdash; ${s.quoteSource}</cite>
              </blockquote>
            ` : ''}
          </div>
        `).join('')}
        <div id="evgCatechismEndMarker"></div>
      </div>
      <div class="evg-catechism-footer">
        <p class="evg-catechism-status" id="evgCatechismStatus"></p>
        <button type="button" class="evg-continue-btn" id="evgCatechismContinue" disabled>Continue</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const scrollEl = overlay.querySelector('#evgCatechismScroll');
  const endMarker = overlay.querySelector('#evgCatechismEndMarker');
  const statusEl = overlay.querySelector('#evgCatechismStatus');
  const continueBtn = overlay.querySelector('#evgCatechismContinue');

  function updateButton() {
    if (secondsLeft > 0) {
      continueBtn.disabled = true;
      statusEl.textContent = `Take your time — ${secondsLeft}s`;
    } else if (!reachedEnd) {
      continueBtn.disabled = true;
      statusEl.textContent = 'Scroll to the end to continue.';
    } else {
      continueBtn.disabled = false;
      statusEl.textContent = 'You may continue.';
    }
  }

  const tickHandle = setInterval(() => {
    secondsLeft = Math.max(0, secondsLeft - 1);
    updateButton();
    if (secondsLeft === 0) clearInterval(tickHandle);
  }, 1000);

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      reachedEnd = true;
      updateButton();
    }
  }, { root: scrollEl, threshold: 0.99 });
  observer.observe(endMarker);

  continueBtn.addEventListener('click', () => {
    if (continueBtn.disabled) return;
    clearInterval(tickHandle);
    observer.disconnect();
    overlay.remove();
    onDone();
  });

  updateButton();
}

/* ===========================================================================
 * GUIDE
 * ========================================================================= */

function showGuide(onDone) {
  let step = 0;
  const overlay = document.createElement('div');
  overlay.className = 'evg-guide-overlay';
  document.body.appendChild(overlay);

  function draw() {
    const s = GUIDE_STEPS[step];
    overlay.innerHTML = `
      <div class="evg-guide-box">
        <p class="evg-guide-kicker">How to Play &mdash; ${step + 1} / ${GUIDE_STEPS.length}</p>
        <h2>${s.heading}</h2>
        <p class="evg-guide-body">${s.body}</p>
        <div class="evg-guide-dots">${GUIDE_STEPS.map((_, i) => `<span class="evg-dot${i === step ? ' on' : ''}"></span>`).join('')}</div>
        <div class="evg-guide-actions">
          <button type="button" class="evg-guide-skip">Skip</button>
          <div>
            ${step > 0 ? '<button type="button" class="evg-guide-back">Back</button>' : ''}
            <button type="button" class="evg-guide-next">${step === GUIDE_STEPS.length - 1 ? 'Begin' : 'Next'}</button>
          </div>
        </div>
      </div>
    `;
    overlay.querySelector('.evg-guide-skip').addEventListener('click', finish);
    overlay.querySelector('.evg-guide-next').addEventListener('click', () => {
      if (step < GUIDE_STEPS.length - 1) { step++; draw(); } else finish();
    });
    const back = overlay.querySelector('.evg-guide-back');
    if (back) back.addEventListener('click', () => { step--; draw(); });
  }

  function finish() {
    overlay.remove();
    updateDoc(doc(db, 'students', email), { 'seenGameGuides.evangelization': true }).catch(() => {});
    onDone();
  }

  draw();
}

/* ===========================================================================
 * CHARACTER SELECT
 * ========================================================================= */

function showCharacterSelect(onChosen) {
  const overlay = document.getElementById('evgCharSelect');
  overlay.classList.add('on');
  overlay.querySelectorAll('.evg-char-card').forEach((card) => {
    card.addEventListener('click', () => {
      state.character = card.dataset.char;
      overlay.classList.remove('on');
      document.getElementById('evgBeginBanner').classList.add('on');
      setTimeout(() => {
        document.getElementById('evgBeginBanner').classList.remove('on');
        onChosen();
      }, 1400);
    }, { once: true });
  });
}

/* ===========================================================================
 * MAIN LOOP
 * ========================================================================= */

let lastTime = 0;
function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05) || 0;
  lastTime = ts;
  if (!state.frozen) {
    if (state.respawnGrace > 0) state.respawnGrace -= dt;
    updateTimer(dt);
    updateTimedEffects(dt);
    updatePlayer(dt);
    updateSoldiers(dt);
    updateBirds(dt);
    updateSheep(dt);
    updateCheckpoints();
    updateBoxes();
    updateVillage();
    updateFog();
    updateHud();
  }
  const camX = Math.max(0, Math.min(state.player.x + 32 - VIEW_W / 2, WORLD_COLS * TILE - VIEW_W));
  const camY = Math.max(0, Math.min(state.player.y + 48 - VIEW_H / 2, WORLD_ROWS * TILE - VIEW_H));
  render(camX, camY);
  requestAnimationFrame(loop);
}

/* ===========================================================================
 * INIT
 * ========================================================================= */

async function startGameplay() {
  canvas = document.getElementById('evgCanvas');
  canvas.width = VIEW_W; canvas.height = VIEW_H;
  ctx = canvas.getContext('2d');
  minimapCanvas = document.getElementById('evgMinimap');
  minimapCtx = minimapCanvas.getContext('2d');
  objectiveEl = document.getElementById('evgObjective');
  itemStatusEl = document.getElementById('evgItemStatus');
  villagesEl = document.getElementById('evgVillages');
  toastEl = document.getElementById('evgToast');
  gameOverModal = document.getElementById('evgGameOver');
  hpFillEl = document.getElementById('evgHpFill');
  hpTextEl = document.getElementById('evgHpText');
  timerTextEl = document.getElementById('evgTimerText');
  timerWrapEl = document.getElementById('evgTimerWrap');
  statusRowEl = document.getElementById('evgStatusRow');

  document.getElementById('evgRestartBtn').addEventListener('click', restartMission);
  wireTouchPad();

  headerGuideBtn = document.getElementById('evgGuideBtn');
  headerGuideBtn.addEventListener('click', () => {
    const wasFrozen = state.frozen;
    state.frozen = true;
    showGuide(() => { state.frozen = wasFrozen; });
  });

  assets = await loadAssets();
  staticLayer = renderStaticLayer(grid, assets);

  setObjective('Find the Mystery Treasure Box with the Cross.');
  setItemStatus('Not carrying an item');
  updateHud();
  updateFog();

  document.getElementById('evgLoading').classList.remove('on');
  document.getElementById('evgHud').classList.add('on');
  requestAnimationFrame(loop);
}

// Quick-look shortcuts for previewing the catechism or the reward popup
// without having to actually play through the mission. Never touches
// Firestore (no award is granted) -- pure UI preview, same real code the
// finished mission calls. Reached via ?preview=catechism / ?preview=reward.
function maybeShowPreview() {
  const mode = new URLSearchParams(window.location.search).get('preview');
  if (!mode) return false;

  document.getElementById('evgLoading').classList.remove('on');

  if (mode === 'catechism') {
    showCatechism(() => {
      document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#f3b45f;font-size:13px;">Preview finished — reload this page to see it again.</p>');
    });
  } else if (mode === 'reward') {
    showTreasureReveal({
      iconSrc: TREASURE_ICON,
      kicker: 'The Evangelization Complete',
      heading: 'The Cross of Salvation',
      subheading: 'The first village has been evangelized.',
      chips: [
        ...CROSS_OF_SALVATION_REWARD.tickets.map(({ key, count }) => `+${count} ${TICKETS[key].name}`),
        `+${CROSS_OF_SALVATION_REWARD.unlockTokens} Artifact Unlock Tokens`
      ]
    });
  }
  return true;
}

async function init() {
  if (maybeShowPreview()) return;

  let data = {};
  try {
    const snap = await getDoc(doc(db, 'students', email));
    data = snap.exists() ? snap.data() : {};
  } catch (err) {
    console.error('Failed to load student record:', err);
  }

  const progress = (data.vaultGames || {}).evangelization;
  if (progress && progress.completed) {
    root.innerHTML = `
      <div class="evg-locked">
        <h1>THE EVANGELIZATION</h1>
        <p class="evg-locked-sub">The Cross has already been carried to the village.</p>
        <p class="evg-locked-note">This mission is a path walked once. Its treasure is already yours${progress.completedAt ? ` — earned ${new Date(progress.completedAt).toLocaleDateString()}` : ''}.</p>
        <a class="evg-locked-btn" href="dashboard.html">Return to the Dashboard</a>
      </div>
    `;
    return;
  }

  const hasSeenGuide = !!(data.seenGameGuides || {}).evangelization;

  showCharacterSelect(() => {
    if (hasSeenGuide) startGameplay();
    else showGuide(startGameplay);
  });
}

// TEST-ONLY debug hook is appended by the scratchpad test copy, never here.

init();
