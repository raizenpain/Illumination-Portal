// ============================================
// THE MUSTARD SEED — game logic. plant()/water()/fertilize()/
// submitReflection() each follow the exact shape dashboard.html's own
// awardDailyVisitShard() and dailyGreeting.js's maybePostDailyGreeting()
// already use: re-read live Firestore state inside a runTransaction
// before granting anything, so a double-click or two open tabs can't
// double-grant. Every write here uses Firestore dot-path field names
// (e.g. 'mustardSeed.totalWaterings') rather than replacing the whole
// mustardSeed map, matching exactly what firestore.rules' anti-cheat
// checks were built and verified against (see firestore.rules'
// isValidMustardSeedWrite() and its comments) -- replacing the whole
// field after planting is deliberately rejected by the rules, so every
// function below must keep using dot-paths.
//
// checkAndAdvanceStage() is the lazy catch-up pass (same idiom as
// dashboard.html's healStuckPuzzleCompletions()) -- a student who
// doesn't open the app for two weeks still gets caught up to their
// rightful stage on their next visit, without needing to click
// anything to "unlock" it themselves.
// ============================================

import { db, doc, getDoc, updateDoc, runTransaction, serverTimestamp, increment, arrayUnion } from './firebase.js';
import { logActivity } from './activity.js';
import {
  GROWTH_STAGES, stageAfter, FERTILIZE_COOLDOWN_DAYS,
  WATER_HEALTH_GAIN, FERTILIZE_HEALTH_GAIN, MAX_HEALTH,
  reflectionPromptForDate, mustardSeedBadgeId
} from './mustardSeedContent.js';

function todayPH(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function studentRefFor(email) { return doc(db, 'students', email); }

/** Real elapsed days since plantedAt, from the student's OWN loaded
 *  data -- display/UI only. The rules independently re-derive this
 *  from the server-written plantedAt when a stage-advance write is
 *  actually attempted, so a client miscalculation here can't unlock
 *  anything early; it can only make the countdown text wrong. */
export function daysSincePlanted(ms) {
  if (!ms || !ms.plantedAt) return 0;
  const plantedMs = ms.plantedAt.toMillis ? ms.plantedAt.toMillis() : new Date(ms.plantedAt).getTime();
  return Math.floor((Date.now() - plantedMs) / 86400000);
}

export function currentStageInfo(ms) {
  return GROWTH_STAGES.find((s) => s.id === (ms && ms.currentStage)) || GROWTH_STAGES[0];
}

export function nextStageCountdown(ms) {
  const next = stageAfter((ms && ms.currentStage) || 'seed');
  if (!next) return null;
  const days = daysSincePlanted(ms);
  const remaining = Math.max(0, next.minDays - days);
  return { stage: next, daysRemaining: remaining };
}

function hasCareToday(ms, field) {
  const entry = ms && ms.dailyCare && ms.dailyCare[todayPH()];
  return !!(entry && entry[field]);
}
export function hasWateredToday(ms) { return hasCareToday(ms, 'watered'); }
export function hasFertilizedToday(ms) { return hasCareToday(ms, 'fertilized'); }
export function hasReflectedToday(ms) { return hasCareToday(ms, 'reflectionCompleted'); }

export function isFertilizeOnCooldown(ms) {
  if (!ms || !ms.dailyCare) return false;
  for (let i = 0; i < FERTILIZE_COOLDOWN_DAYS; i++) {
    const entry = ms.dailyCare[todayPH(-i)];
    if (entry && entry.fertilized) return true;
  }
  return false;
}

/** Plants the one-and-only seed. Returns true if THIS call planted it
 *  (false if already planted). firestore.rules independently enforces
 *  "exactly once" via plantedAt immutability -- this transaction guard
 *  is just to avoid a wasted round-trip and a confusing rejected-write
 *  error on an obvious double-click. */
export async function plant({ email, name }) {
  const ref = studentRefFor(email);
  let planted = false;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const live = snap.data() || {};
    if (live.mustardSeed && live.mustardSeed.plantedAt) return;
    tx.update(ref, {
      mustardSeed: {
        plantedAt: serverTimestamp(),
        currentStage: 'seed',
        gameStatus: 'active',
        health: MAX_HEALTH,
        currentStreak: 0,
        longestStreak: 0,
        lastCareDate: null,
        totalWaterings: 0,
        totalFertilizers: 0,
        totalReflections: 0,
        fruitClaimedAt: null,
        dailyCare: {}
      },
      achievements: arrayUnion(mustardSeedBadgeId('first_plant'))
    });
    planted = true;
  });
  if (planted) {
    logActivity({ email, name, type: 'mustardseed', title: 'Planted a Mustard Seed', icon: '🌰' });
  }
  return planted;
}

/** Shared shape for water()/fertilize()/submitReflection(): re-reads
 *  live state, checks the field-specific "already done today" guard,
 *  updates the streak if this is the day's FIRST qualifying action
 *  (watering is what counts toward the streak -- fertilizing/
 *  reflecting are bonus, not required), and writes via dot-paths only. */
async function recordCare(email, { field, extraUpdates = {}, healthGain = 0, dayEntryExtra = {} }) {
  const ref = studentRefFor(email);
  let result = 'ok';
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const live = snap.data() || {};
    const ms = live.mustardSeed;
    if (!ms || !ms.plantedAt) { result = 'not-planted'; return; }
    if (ms.gameStatus === 'completed') { result = 'completed'; return; }

    const today = todayPH();
    const existing = (ms.dailyCare || {})[today];
    if (existing && existing[field]) { result = 'already-done'; return; }

    const updates = { ...extraUpdates };
    const dayEntry = existing
      ? { ...existing, [field]: true, ...dayEntryExtra }
      : { watered: false, fertilized: false, reflectionCompleted: false, [field]: true, ...dayEntryExtra };
    updates[`mustardSeed.dailyCare.${today}`] = dayEntry;
    updates['mustardSeed.lastCareDate'] = today;
    if (healthGain) {
      updates['mustardSeed.health'] = Math.min(MAX_HEALTH, (ms.health ?? MAX_HEALTH) + healthGain);
    }

    // Streak: only the FIRST qualifying action of a new day advances
    // it, and only watering counts (see module comment above).
    if (field === 'watered' && !existing) {
      const yesterday = (ms.dailyCare || {})[todayPH(-1)];
      const continuing = !!(yesterday && yesterday.watered);
      const newStreak = continuing ? (ms.currentStreak || 0) + 1 : 1;
      updates['mustardSeed.currentStreak'] = newStreak;
      updates['mustardSeed.longestStreak'] = Math.max(ms.longestStreak || 0, newStreak);
      if (newStreak === 7) {
        updates.achievements = arrayUnion(mustardSeedBadgeId('faithful_gardener'));
      } else if (newStreak === 14) {
        updates.achievements = arrayUnion(mustardSeedBadgeId('dedicated_nurturer'));
      }
    }

    tx.update(ref, updates);
  });
  return result;
}

export async function water({ email }) {
  return recordCare(email, {
    field: 'watered',
    extraUpdates: { 'mustardSeed.totalWaterings': increment(1) },
    healthGain: WATER_HEALTH_GAIN
  });
}

export async function fertilize({ email }) {
  const ref = studentRefFor(email);
  const snap = await getDoc(ref);
  const ms = (snap.data() || {}).mustardSeed;
  if (isFertilizeOnCooldown(ms)) return 'cooldown';
  return recordCare(email, {
    field: 'fertilized',
    extraUpdates: { 'mustardSeed.totalFertilizers': increment(1) },
    healthGain: FERTILIZE_HEALTH_GAIN
  });
}

export async function submitReflection({ email, text }) {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'empty';
  if (trimmed.length > 400) return 'too-long';
  return recordCare(email, {
    field: 'reflectionCompleted',
    extraUpdates: { 'mustardSeed.totalReflections': increment(1) },
    dayEntryExtra: { reflectionText: trimmed }
  });
}

/** Lazy catch-up: advances currentStage as far as real elapsed time
 *  actually allows, one stage at a time (mirrors the rule's own
 *  monotonic-threshold check), and marks gameStatus/fruitClaimedAt
 *  handling is left to claimFruit() below -- reaching forbiddenFruit
 *  here does NOT auto-complete the game, the student must actively
 *  claim it. Call on every load of the dashboard/game page. */
export async function checkAndAdvanceStage({ email, name, data }) {
  const ms = data.mustardSeed;
  if (!ms || !ms.plantedAt || ms.gameStatus === 'completed') return null;

  const days = daysSincePlanted(ms);
  let target = ms.currentStage;
  for (const stage of GROWTH_STAGES) {
    if (days >= stage.minDays) target = stage.id;
  }
  if (target === ms.currentStage) return null;

  const targetOrder = GROWTH_STAGES.find((s) => s.id === target)?.order ?? 0;
  const fruitFormationOrder = GROWTH_STAGES.find((s) => s.id === 'fruitFormation')?.order ?? Infinity;

  const ref = studentRefFor(email);
  let advancedTo = null;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const live = snap.data() || {};
    const liveMs = live.mustardSeed;
    if (!liveMs || liveMs.currentStage === target) return;
    const updates = { 'mustardSeed.currentStage': target };
    const badges = [mustardSeedBadgeId('patient_cultivator')];
    if (targetOrder >= fruitFormationOrder) badges.push(mustardSeedBadgeId('fruitful'));
    updates.achievements = arrayUnion(...badges);
    tx.update(ref, updates);
    advancedTo = target;
  });

  if (advancedTo) {
    data.mustardSeed.currentStage = advancedTo;
    const stageInfo = GROWTH_STAGES.find((s) => s.id === advancedTo);
    logActivity({
      email, name,
      title: `The Mustard Seed: reached ${stageInfo ? stageInfo.title : advancedTo}`,
      type: 'mustardseed', icon: stageInfo ? stageInfo.icon : '🌱'
    });
  }
  return advancedTo;
}

/** Claims the Forbidden Fruit -- only succeeds once the student has
 *  actually reached that stage (client check here is UX only; the
 *  real gate is firestore.rules' mustardSeedStatusValid(), which
 *  independently re-derives real elapsed time from the server-written
 *  plantedAt before allowing gameStatus to become 'completed'). */
export async function claimFruit({ email, name }) {
  const ref = studentRefFor(email);
  let claimed = false;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const live = snap.data() || {};
    const ms = live.mustardSeed;
    if (!ms || ms.currentStage !== 'forbiddenFruit' || ms.gameStatus === 'completed') return;
    tx.update(ref, {
      'mustardSeed.gameStatus': 'completed',
      'mustardSeed.fruitClaimedAt': serverTimestamp(),
      achievements: arrayUnion(mustardSeedBadgeId('bearer_of_knowledge'))
    });
    claimed = true;
  });
  if (claimed) {
    logActivity({ email, name, title: 'Claimed the Forbidden Fruit of Knowledge', type: 'mustardseed', icon: '🍎' });
  }
  return claimed;
}

/** Admin-only reset -- see firestore.rules' isAdmin() update branch,
 *  which now also allows the 'mustardSeed' key. Logged for an audit
 *  trail rather than being a silent console-only fix. */
export async function resetMustardSeed({ studentEmail, adminEmail, adminName }) {
  const ref = studentRefFor(studentEmail);
  await updateDoc(ref, { mustardSeed: null });
  logActivity({
    email: adminEmail, name: adminName,
    title: `Reset a Mustard Seed for ${studentEmail}`,
    type: 'mustardseed', icon: '🔧'
  });
}

export function todaysReflectionPrompt() {
  return reflectionPromptForDate(todayPH());
}
