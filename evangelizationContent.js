// ============================================
// THE EVANGELIZATION — Mission 1: The Cross (Vault Game 5)
//
// Scoped-down from Jornie's full 5-mission concept brief to just Mission
// 1 (tutorial, difficulty 2/5) sized to match the other four Vault Games.
// Missions 2-5 (The Bible, The Sacred Chalice, Bread and Wine, The Ark of
// the Covenant) are a separate future project, not built here.
//
// Sprites/tiles: Liberated Pixel Cup (LPC) Base Assets, recolored --
// Lanea Zimmerman (tiles), Stephen Challener (character walk cycles),
// Manuel Riecke (soldier, hair) -- CC-BY-SA 3.0 / OGA-BY 3.0. Credited in
// the dashboard footer alongside the site's other licensed-asset credits.
// ============================================

import { TICKETS } from './vaultTickets.js';

export const TILE = 32;
export const WORLD_COLS = 40;
export const WORLD_ROWS = 30;

// Terrain codes rasterized onto a WORLD_ROWS x WORLD_COLS grid at load
// time (see buildTerrainGrid() in evangelization.js):
//   G grass (walkable)   D dirt path (walkable)   T tree (blocked)
//   M mountain/rock (blocked, also the map border)
//   W water (blocked)    R bridge over water (walkable)
//   H house wall (blocked)   V village floor (walkable, delivery trigger)
//
// Regions are painted in order, later ones overwriting earlier ones --
// this is how a border wall + winding path + forest + item clearing +
// river + village get carved out of one blank grass field without
// hand-writing a 40x30 literal array.
export const MAP_REGIONS = [
  { type: 'fill', code: 'G', rect: [0, 0, WORLD_COLS, WORLD_ROWS] },
  // map border
  { type: 'rect', code: 'M', rect: [0, 0, WORLD_COLS, 1] },
  { type: 'rect', code: 'M', rect: [0, WORLD_ROWS - 1, WORLD_COLS, 1] },
  { type: 'rect', code: 'M', rect: [0, 0, 1, WORLD_ROWS] },
  { type: 'rect', code: 'M', rect: [WORLD_COLS - 1, 0, 1, WORLD_ROWS] },
  // dirt path: start -> spine north -> branch east -> clearing entrance
  { type: 'rect', code: 'D', rect: [4, 25, 6, 1] },
  { type: 'rect', code: 'D', rect: [9, 12, 1, 14] },
  { type: 'rect', code: 'D', rect: [9, 12, 8, 1] },
  { type: 'rect', code: 'D', rect: [16, 6, 1, 7] },
  // path onward from the clearing exit to the river/bridge/village
  { type: 'rect', code: 'D', rect: [16, 14, 20, 1] },
  { type: 'rect', code: 'D', rect: [30, 14, 6, 1] },
  // river + bridge
  { type: 'rect', code: 'W', rect: [28, 2, 3, 25] },
  { type: 'rect', code: 'R', rect: [28, 13, 3, 3] },
  // item clearing (bounded on the far side by rock)
  { type: 'rect', code: 'G', rect: [17, 5, 8, 7] },
  { type: 'rect', code: 'M', rect: [25, 4, 2, 9] },
  // village hut
  { type: 'rect', code: 'H', rect: [34, 10, 5, 8] },
  { type: 'rect', code: 'V', rect: [35, 17, 3, 2] },
  // Door tile sits on the house's own WEST edge (col 34), directly against
  // the approach path's last untouched tile at (33,14) -- the house rect
  // above is painted first and silently walls over the path's own last two
  // tiles inside its footprint (cols 34-35 at row 14), so a door carved any
  // further inside that footprint (e.g. the old (35,15)) ends up boxed in
  // by wall on all four sides with no walkable tile ever touching it.
  { type: 'rect', code: 'V', rect: [34, 14, 1, 1] }, // door tile, the actual delivery trigger
  // scattered forest trees -- obstacles + cover, not just decoration
  { type: 'cells', code: 'T', cells: [
    [3, 22], [4, 21], [6, 23], [11, 22], [12, 24], [11, 18], [13, 19],
    [6, 15], [5, 13], [7, 11], [12, 9], [13, 8], [11, 6], [6, 8],
    [18, 6], [24, 6], [18, 11], [24, 11], [20, 5],
    [31, 8], [33, 9], [32, 20], [30, 22], [22, 18], [24, 20], [20, 22],
    // denser cover added for the timer/patrol expansion -- more places to
    // break line of sight now that three patrols are watching the map
    [2, 4], [3, 6], [2, 8], [2, 15], [2, 20], [2, 26],
    [15, 2], [19, 3], [27, 3], [8, 4], [6, 3],
    [16, 17], [19, 17], [21, 17], [16, 20], [19, 22], [21, 25], [17, 25],
    [26, 19], [27, 22], [22, 9], [27, 9],
    [8, 22], [10, 16], [14, 13], [15, 16], [10, 10],
    [36, 20], [37, 22], [36, 24], [32, 23], [34, 20],
    [8, 27], [12, 27], [16, 27], [20, 27], [24, 27], [28, 27], [32, 27],
    // second density pass -- 40 more, randomized-then-spread across all
    // four map quadrants (not just scan order, which clustered badly
    // along the top border on a first attempt) and BFS-verified from
    // START_TILE afterward to confirm every checkpoint, box (real and
    // empty), patrol waypoint, and the village trigger all stay
    // reachable, per this map's standard verification step
    [1, 2], [24, 3], [38, 1], [16, 5], [33, 7], [30, 1], [33, 18], [37, 27],
    [34, 26], [31, 10], [26, 26], [11, 3], [7, 18], [22, 12], [37, 8],
    [1, 13], [38, 18], [27, 7], [10, 28], [18, 27], [36, 3], [15, 8],
    [22, 1], [19, 13], [24, 8], [13, 11], [1, 6], [4, 1], [12, 16], [5, 5],
    [26, 13], [10, 14], [13, 1], [30, 28], [19, 1], [11, 20], [1, 17],
    [14, 21], [21, 20], [4, 17]
  ] },
  // freestanding rock outcrops -- small obstacles out in the open, distinct
  // from the border wall and the clearing's bounding cliff
  { type: 'cells', code: 'M', cells: [
    [8, 13], [15, 10], [20, 17], [27, 17], [10, 24], [35, 22], [23, 24]
  ] }
];

export const START_TILE = { col: 4, row: 26 };

export const CHECKPOINTS = [
  { id: 'cp1', col: 9, row: 20 },
  { id: 'cp2', col: 15, row: 12 },
  { id: 'cp3', col: 16, row: 13 }
];

// Three rectangle-loop patrols, each guarding a different cluster of boxes
// so no single safe route exists across the whole map. All waypoints
// verified walkable against the actual terrain grid.
export const SOLDIER_PATROLS = [
  // guards the original clearing (box at 20,8) -- first corner shifted from
  // (18,6) to (19,6): that tile is one of the clearing's own decorative
  // trees, so the soldier could approach but never fully reach it, stalling
  // its patrol loop indefinitely at that corner
  [{ col: 19, row: 6 }, { col: 23, row: 6 }, { col: 23, row: 10 }, { col: 18, row: 10 }],
  // guards the forest cluster (boxes at 6,20 / 13,23)
  [{ col: 5, row: 19 }, { col: 14, row: 19 }, { col: 14, row: 24 }, { col: 5, row: 24 }],
  // guards the east side, between the clearing and the river (boxes at 33,20 / 26,16 / 22,22)
  [{ col: 24, row: 15 }, { col: 31, row: 15 }, { col: 31, row: 21 }, { col: 24, row: 21 }]
];

export const VILLAGE_TRIGGER = { col: 34, row: 14 };

/* ===========================================================================
 * 3-MINUTE TIMER + MYSTERY TREASURE BOXES + BUFFS + SEVEN DEADLY SINS
 *
 * Every game now scatters TIME_LIMIT_SECONDS worth of urgency across a
 * handful of Mystery Treasure Boxes: exactly one holds the Cross, the rest
 * hold either a protective Buff, a Seven-Deadly-Sins trap, or come up
 * empty. WHICH box holds what is reshuffled every game (see assignBoxes()
 * in evangelization.js) -- the box POSITIONS below are fixed, hand-picked
 * walkable tiles (verified against the actual terrain grid), but the
 * content-to-position mapping is randomized per attempt, so the Cross is
 * never in the same box twice in a row.
 * ========================================================================= */

export const TIME_LIMIT_SECONDS = 180;
export const GAME_OVER_COOLDOWN_SECONDS = 30;

// One of these sits inside the soldier's own patrol loop (20,8) -- the
// highest-risk, highest-certainty spot to check. The rest are spread
// through the forest and the far side of the map so exploring is real.
export const BOX_TILES = [
  { col: 20, row: 8 },
  { col: 6, row: 20 },
  { col: 13, row: 23 },
  { col: 3, row: 10 },
  { col: 33, row: 20 },
  { col: 22, row: 22 },
  { col: 10, row: 17 },
  { col: 26, row: 16 }
];

// A second, separate set of 8 box spots that always come up empty --
// pure decoys, not part of generateBoxes()'s cross/buff/sin shuffle, so
// they never dilute the odds on the original 8. Doubles how much of the
// map is worth exploring without changing what any one "real" box can
// hold. Same verification standard as BOX_TILES/SOLDIER_PATROLS: every
// tile confirmed walkable and BFS-reachable from START_TILE against the
// actual terrain grid, spread across map areas the original 8 don't
// already cover, and kept off village floor (that's the delivery
// destination, not a hidden spot).
export const EMPTY_BOX_TILES = [
  { col: 6, row: 9 },
  { col: 14, row: 4 },
  { col: 9, row: 5 },
  { col: 22, row: 25 },
  { col: 31, row: 25 },
  { col: 36, row: 6 },
  { col: 22, row: 3 },
  { col: 19, row: 20 }
];

// Buffs are support/protection ONLY, per design -- none of them let the
// player fight or harm the soldier, only evade or recover more easily.
export const BUFFS = [
  { id: 'guardian_angel', name: 'Guardian Angel', icon: '😇', duration: 15, kind: 'immunity',
    note: 'The soldier cannot catch you for 15 seconds.' },
  { id: 'swift_feet', name: 'Swift Feet', icon: '🪽', duration: 12, kind: 'speed', multiplier: 1.6,
    note: 'You move faster for 12 seconds.' },
  { id: 'lantern_of_clarity', name: 'Lantern of Clarity', icon: '🕯️', duration: 12, kind: 'reveal',
    note: 'The whole map is revealed on your minimap for 12 seconds.' },
  { id: 'second_wind', name: 'Second Wind', icon: '💚', duration: 0, kind: 'heal', amount: 30,
    note: 'You recover 30 health immediately.' }
];

// The Seven Deadly Sins -- each a real, distinct, non-lethal-on-its-own
// setback. None of these let the soldier fight the player either; they
// only make evasion harder for a while.
export const SINS = [
  { id: 'pride', name: 'Pride', icon: '👑', duration: 8, kind: 'blind_minimap',
    note: 'Too proud to check your surroundings -- the minimap goes dark for 8 seconds.' },
  { id: 'envy', name: 'Envy', icon: '👁️', duration: 10, kind: 'no_reveal',
    note: 'Fixated on what you lack -- no new ground is revealed for 10 seconds.' },
  { id: 'wrath', name: 'Wrath', icon: '🔥', duration: 12, kind: 'soldier_enrage', multiplier: 1.5,
    note: 'The soldier moves faster and sees farther for 12 seconds.' },
  { id: 'sloth', name: 'Sloth', icon: '🐌', duration: 10, kind: 'slow', multiplier: 0.5,
    note: 'Your steps grow heavy -- half speed for 10 seconds.' },
  { id: 'greed', name: 'Greed', icon: '💰', duration: 0, kind: 'alert_soldier',
    note: 'The glint gives you away -- the soldier beelines straight for you.' },
  { id: 'gluttony', name: 'Gluttony', icon: '🍖', duration: 8, kind: 'drain', dps: 3,
    note: 'A slow toll on your strength -- losing health for 8 seconds.' },
  { id: 'lust', name: 'Lust', icon: '💋', duration: 5, kind: 'freeze',
    note: 'Frozen in place for 5 seconds.' }
];

export const MAX_HP = 100;
export const DAMAGE_PER_CATCH = 25;
export const START_REVIVE_POTIONS = 1;
export const REVIVE_HEAL_AMOUNT = 50;

// Flying black birds -- a lighter, always-active hazard alongside the 3
// soldiers. Touching one costs a flat 10% of max HP (Guardian Angel
// blocks it, same immunity as a soldier catch) but, unlike a soldier
// catch, does NOT send the player back to their checkpoint -- only
// running out of HP does that, via the existing Game Over flow.
// [centerX,centerY,rangeX,speed] in pixel space, sine-driven patrol
// lanes laid over the routes the player actually walks (the corridor,
// the clearing, the row-14 path to the river, the village approach),
// not hidden off in blocked terrain no one would ever cross.
export const BIRD_DAMAGE = MAX_HP * 0.10;
export const BIRDS = [
  [304, 592, 80, 1.1],
  [816, 464, 288, 0.9],
  [656, 272, 112, 1.2],
  [1008, 496, 80, 1.0]
];

// A purely decorative flock -- no collision, no damage, just life on the
// map in the quiet meadow strip near the player's own starting point.
// Each sheep wanders slowly around its own home point rather than
// patrolling a fixed lane. [homeX,homeY] in pixel space.
export const SHEEP = [
  [2 * TILE + 16, 22 * TILE + 16],
  [2 * TILE + 16, 23 * TILE + 16],
  [2 * TILE + 16, 24 * TILE + 16],
  [3 * TILE + 16, 20 * TILE + 16],
  [3 * TILE + 16, 24 * TILE + 16]
];

export const CROSS_OF_SALVATION_REWARD = {
  tickets: [
    { key: "sigil", count: 15 },
    { key: "seal", count: 15 },
    { key: "scroll", count: 15 },
    { key: "herald", count: 15 },
    { key: "shard", count: 30 },
  ],
  unlockTokens: 10,
};

export const TREASURE_ICON = 'assets/cross-of-salvation.jpg';

export const GUIDE_STEPS = [
  {
    heading: 'Your Mission — 3 Minutes',
    body: "You are a missionary with exactly 3:00 on the clock. Somewhere among the Mystery Treasure Boxes scattered through this wilderness is a sacred Cross. Find it, carry it safely, and deliver it to the village on the far side of the river before time runs out."
  },
  {
    heading: 'Move & Explore',
    body: "Use the Arrow Keys or W A S D to walk. The map is bigger than one screen — watch the minimap in the upper right to see where you've already explored. The timer keeps running the whole time, even while you're reading a message."
  },
  {
    heading: 'Mystery Treasure Boxes',
    body: "Each box could hold the Cross, a protective Buff, or one of the Seven Deadly Sins — you won't know until you open it. Only one box holds the Cross, and it moves to a different box every attempt."
  },
  {
    heading: 'Buffs & Sins',
    body: "Buffs only ever help — extra speed, a full map reveal, healing, or brief safety from the soldier. The Seven Deadly Sins only ever hinder — they might slow you, freeze you, drain your health, or draw the soldier straight to you. Neither one lets you or the soldier fight."
  },
  {
    heading: 'The Roman Soldier',
    body: "Three separate Roman patrols guard different parts of the map — there is no single safe route. If one sees you, he will chase. You are not meant to fight — run, break line of sight, or wait for him to pass. Getting caught costs you health and sends you back to your last checkpoint — it does not cost you the mission by itself."
  },
  {
    heading: 'Health & Checkpoints',
    body: "You have 100 health. If it ever reaches 0, a Revive Potion will bring you back once — if you have no more, your mission ends. Checkpoints save your progress, including whether you're already carrying the Cross."
  },
  {
    heading: 'Deliver & Learn',
    body: "Once you have the Cross, get it to the village before the timer hits 0:00. Arriving in time completes the mission — followed by a short catechism on evangelization itself: where it began, why it matters, and how it continues today."
  }
];

// THE CATECHISM — shown once, mandatory, between delivering the Cross and
// opening the treasure. No skip, no close button anywhere. Gated on BOTH a
// minimum read-timer AND scrolling to the end, same pattern as every other
// Vault Game's catechism. Shorter than Scriptorium/Loaves/Vigil's (this is
// still the tutorial mission) but the same structure: real, checkable
// citations only, never an invented or loosely-paraphrased quote.
export const CATECHISM_MIN_SECONDS = 100;
export const CATECHISM = {
  title: 'Go and Make Disciples',
  intro: "You just carried something small and fragile through danger, to people waiting to receive it. That, in miniature, is the whole history of evangelization — carrying something precious, at some real cost, to those who have not yet been given it.",
  sections: [
    {
      heading: 'Where It Began',
      body: "Before he ascended, Jesus gave his apostles one final instruction: go, and do not stop at the borders of Israel — carry this to everyone, everywhere. Fifty days later, at Pentecost, the apostles stepped out in public for the first time and thousands believed in a single day (Acts 2). From there the mission spread fast and far: Paul alone crossed the Roman world on foot and by ship, through the same empire whose soldiers you were avoiding, risking arrest, shipwreck, and eventually his own life to bring the message to cities that had never heard it.",
      quote: 'Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.',
      quoteSource: 'Matthew 28:19'
    },
    {
      heading: 'Why It Matters',
      body: "Evangelizing was never meant to be about winning an argument or gaining followers. At its best, it is an act of love — wanting someone else to have access to what has genuinely changed you for the better. The Catholic Church does not treat this as one activity among many that she happens to do; she teaches that it is her very reason for existing.",
      quote: 'Evangelizing is in fact the grace and vocation proper to the Church, her deepest identity.',
      quoteSource: 'Pope Paul VI, Evangelii Nuntiandi, 14'
    },
    {
      heading: 'Carrying It Today',
      body: "Today, the danger is rarely a soldier at the door. More often it's indifference, distraction, or simply never having anyone show them what it looks like lived out. Saint John Paul II called the Church to a \"New Evangelization\" — the same Gospel, but carried with fresh ardor, through new methods and a new way of speaking to a world that has often stopped listening. In practice, that looks less like a speech and more like consistency: quiet honesty in daily life, real care for people who are struggling, and a willingness to talk about what you believe without shame — online as much as in person. The tone matters as much as the content.",
      quote: 'The joy of the gospel fills the hearts and lives of all who encounter Jesus.',
      quoteSource: 'Pope Francis, Evangelii Gaudium, 1'
    }
  ]
};

export { TICKETS };
