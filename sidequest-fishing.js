// ============================================
// SIDE QUEST — "The Quiet Shore" fishing minigame. Cast -> bite ->
// reel loop; species/objects roll client-side (same trust model the
// rest of this app already runs on — see the crossword side quest and
// project memory on devtools tampering). Every reward-granting write
// goes through a transaction so two tabs/devices can't double-spend
// bait or double-grant a catch.
// ============================================

import { db, doc, getDoc, updateDoc, runTransaction, increment, arrayUnion } from './firebase.js';
import { requireLogin } from './auth.js';
import { SIDE_QUESTS, getQuestStatus, getFeaturedQuest, sideQuestBadgeId } from './sideQuests.js';
import { logActivity } from './activity.js';
import { showTreasureReveal } from './treasureReveal.js';

const { email, name } = requireLogin();

const titleEl = document.getElementById('questTitle');
const subtitleEl = document.getElementById('questSubtitle');
const statusBanner = document.getElementById('questStatusBanner');
const shoreArea = document.getElementById('shoreArea');
const baitCountEl = document.getElementById('baitCount');
const statusTextEl = document.getElementById('shoreStatusText');
const statusHintEl = document.getElementById('shoreStatusHint');
const actionBtn = document.getElementById('actionBtn');
const reelTrack = document.getElementById('reelTrack');
const reelMarker = document.getElementById('reelMarker');
const reelBar = document.getElementById('reelBar');
const reelMeterWrap = document.getElementById('reelMeterWrap');
const reelMeterFill = document.getElementById('reelMeterFill');
const pondListEl = document.getElementById('pondList');
const reliquaryListEl = document.getElementById('reliquaryList');
const choiceModal = document.getElementById('choiceModal');
const choiceButtons = document.getElementById('choiceButtons');
const catchPopup = document.getElementById('catchPopup');
const catchBox = document.getElementById('catchBox');
const catchIcon = document.getElementById('catchIcon');
const catchHeading = document.getElementById('catchHeading');
const catchTitleEl = document.getElementById('catchTitle');
const catchTextEl = document.getElementById('catchText');
const catchTicketsEl = document.getElementById('catchTickets');
const catchCloseBtn = document.getElementById('catchCloseBtn');

const TICKET_LABELS = {
  quiz_ticket: 'Sigil of Insight',
  task_ticket: 'Seal of Diligence',
  journal_ticket: 'Scroll of Reflection',
  recitation_ticket: "Herald's Voice",
  scrap_ticket: 'Ember Shard'
};
const CHOOSABLE_TICKETS = ['quiz_ticket', 'task_ticket', 'journal_ticket', 'recitation_ticket'];

const params = new URLSearchParams(window.location.search);
const requestedId = params.get('quest');
const quest = requestedId ? SIDE_QUESTS[requestedId] : getFeaturedQuest();

let fishingState = { bait: 0, pond: [], reliquary: [], caughtSpecies: [], completed: false };
let phase = 'idle'; // idle | casting | bite | reeling
let castTimer = null;
let reelRaf = null;
let pendingCatch = null; // { kind: 'fish'|'object', ... } rolled at hook time

init();

async function init() {
  if (!quest || quest.kind !== 'fishing') {
    titleEl.textContent = 'No Side Quest Right Now';
    subtitleEl.textContent = 'Check back soon — a new one is on the way.';
    return;
  }

  titleEl.textContent = quest.title;
  subtitleEl.textContent = quest.subtitle;

  const status = getQuestStatus(quest);

  let data = {};
  try {
    const snap = await getDoc(doc(db, 'students', email));
    data = snap.exists() ? snap.data() : {};
  } catch (err) {
    console.error('Failed to load student record:', err);
  }

  const saved = (data.sideQuests || {})[quest.id];
  if (saved) {
    fishingState = {
      bait: typeof saved.bait === 'number' ? saved.bait : quest.startingBait,
      pond: saved.pond || [],
      reliquary: saved.reliquary || [],
      caughtSpecies: saved.caughtSpecies || [],
      completed: !!saved.completed
    };
  } else {
    fishingState.bait = quest.startingBait;
  }

  if (status === 'upcoming') {
    showBanner(`The shore opens ${formatDate(quest.startsAt)}. Come back then!`);
    startCountdown(quest.startsAt);
    return;
  }

  if (status === 'ended') {
    showBanner('The shore has closed for now. Watch the dashboard for the next Side Quest!');
    if (fishingState.pond.length || fishingState.reliquary.length) {
      shoreArea.classList.remove('hidden');
      actionBtn.classList.add('hidden');
      renderCollections();
    }
    return;
  }

  // First visit this event: persist the starting bait so it's stable
  // across reloads/devices instead of re-granting it every load.
  if (!saved) {
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'students', email);
        const snap = await tx.get(ref);
        const existing = ((snap.data() || {}).sideQuests || {})[quest.id];
        if (existing) return; // another tab beat us to it
        tx.update(ref, { [`sideQuests.${quest.id}.bait`]: quest.startingBait });
      });
    } catch (err) {
      console.error('Failed to initialize bait:', err);
    }
  }

  shoreArea.classList.remove('hidden');
  renderBait();
  renderCollections();
  setIdle();
  actionBtn.addEventListener('click', onActionClick);
  catchCloseBtn.addEventListener('click', () => catchPopup.classList.add('hidden'));
}

function showBanner(text) {
  statusBanner.textContent = text;
  statusBanner.classList.remove('hidden');
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-PH', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function startCountdown(startsAtIso) {
  const target = new Date(startsAtIso).getTime();
  const tick = () => {
    const diff = target - Date.now();
    if (diff <= 0) { statusBanner.textContent = "It's time! Refresh the page to begin."; return; }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    statusBanner.textContent = `The shore opens in ${days}d ${hours}h ${mins}m — ${formatDate(startsAtIso)}.`;
  };
  tick();
  setInterval(tick, 30000);
}

function renderBait() {
  baitCountEl.textContent = `${fishingState.bait} / ${quest.maxBait}`;
}

// ================================
// CAST / BITE / REEL STATE MACHINE
// ================================

function setIdle() {
  phase = 'idle';
  statusTextEl.textContent = quest.copy.idle;
  statusHintEl.textContent = fishingState.bait > 0 ? quest.copy.idleHint : quest.copy.noBait;
  actionBtn.textContent = 'Cast Line';
  actionBtn.disabled = fishingState.bait <= 0;
  reelTrack.classList.add('hidden');
  reelMeterWrap.classList.add('hidden');
}

function onActionClick() {
  if (phase === 'idle') startCast();
  else if (phase === 'bite') attemptHook();
  else if (phase === 'casting') tooEarly();
}

function startCast() {
  if (fishingState.bait <= 0) return;

  // Bait is spent the moment a cast begins, win or lose (per design).
  // Deducted optimistically and locally first -- a cast shouldn't wait
  // on a network round-trip every time, the same reasoning app.js's
  // recordMistake() already documents for its own fire-and-forget
  // write. increment(-1) is atomic on Firestore's side regardless, so
  // this doesn't need a transaction the way a real reward grant does.
  fishingState.bait -= 1;
  renderBait();
  spendBaitInBackground();

  phase = 'casting';
  statusTextEl.textContent = quest.copy.casting;
  statusHintEl.textContent = quest.copy.castingHint;
  actionBtn.textContent = 'Reel!';

  const wait = quest.cast.waitMsMin + Math.random() * (quest.cast.waitMsMax - quest.cast.waitMsMin);
  castTimer = setTimeout(enterBite, wait);
}

function spendBaitInBackground() {
  updateDoc(doc(db, 'students', email), {
    [`sideQuests.${quest.id}.bait`]: increment(-1)
  }).catch((err) => console.error('Failed to sync bait spend:', err));
}

function tooEarly() {
  clearTimeout(castTimer);
  statusTextEl.textContent = quest.copy.tooEarly;
  statusHintEl.textContent = '';
  setTimeout(setIdle, 1400);
}

function enterBite() {
  phase = 'bite';
  statusTextEl.textContent = quest.copy.bite;
  statusHintEl.textContent = quest.copy.biteHint;

  pendingCatch = rollCatch();

  castTimer = setTimeout(missedHook, quest.cast.hookWindowMs);
}

function missedHook() {
  statusTextEl.textContent = quest.copy.missedHook;
  statusHintEl.textContent = '';
  pendingCatch = null;
  setTimeout(setIdle, 1400);
}

function attemptHook() {
  clearTimeout(castTimer);
  if (phase !== 'bite' || !pendingCatch) return;
  startReel();
}

// ================================
// ROLLING WHAT'S ON THE LINE
// ================================

function weightedPick(items, weightKey) {
  const total = items.reduce((sum, i) => sum + i[weightKey], 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item[weightKey];
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function rollCatch() {
  const emblemAlreadyFound = fishingState.reliquary.some((r) => r.objectId === 'hcdc_75');
  const rollObject = Math.random() < quest.cast.objectChance;

  if (rollObject) {
    const available = quest.blessedObjects.filter((o) => {
      if (o.id === 'hcdc_75' && emblemAlreadyFound) return false;
      return !fishingState.reliquary.some((r) => r.objectId === o.id);
    });
    if (available.length > 0) {
      const obj = weightedPick(available, 'rollWeight');
      return { kind: 'object', object: obj };
    }
    // every object already found this event -- fall through to a fish
  }

  const species = weightedPick(quest.species, 'rollWeight');
  const [min, max] = species.weightKg;
  const weightKg = Math.round((min + Math.random() * (max - min)) * 10) / 10;

  let band;
  if (species.legendary) {
    band = 'legendary';
  } else {
    const frac = (weightKg - min) / (max - min);
    if (frac <= quest.weightBands.undersized.max) band = 'undersized';
    else if (frac <= quest.weightBands.standard.max) band = 'standard';
    else band = 'trophy';
  }

  return { kind: 'fish', species, weightKg, band };
}

// ================================
// REEL MINIGAME
// ================================

// Reward-bearing catches fight harder than junk ones -- a small,
// no-reward fish should be an easy reel; a trophy/legendary fish (or any
// Blessed Object, which is always a full reward) should be a real fight.
const BAND_DIFFICULTY = {
  undersized: { barWidthMult: 1.5, dartingMult: 0.55 },
  standard: { barWidthMult: 1, dartingMult: 1 },
  trophy: { barWidthMult: 0.75, dartingMult: 1.25 },
  legendary: { barWidthMult: 0.7, dartingMult: 1.3 }
};

function startReel() {
  phase = 'reeling';
  const isObject = pendingCatch.kind === 'object';
  statusTextEl.textContent = isObject ? quest.copy.onHookObject : quest.copy.reeling;
  statusHintEl.textContent = isObject ? quest.copy.onHookObjectHint : quest.copy.reelingHint;
  actionBtn.textContent = 'Hold to Reel';

  reelTrack.classList.remove('hidden');
  reelMeterWrap.classList.remove('hidden');
  reelMeterFill.style.width = '0%';

  const target = isObject ? pendingCatch.object : pendingCatch.species;
  const difficulty = isObject ? { barWidthMult: 1, dartingMult: 1 } : BAND_DIFFICULTY[pendingCatch.band];
  const barWidthPct = target.barWidth * difficulty.barWidthMult;
  const darting = target.darting * difficulty.dartingMult;
  let barCenter = 50;
  let barVelocity = 0;
  let meter = 0;
  let holding = false;
  let zeroSince = null;
  const startTime = performance.now();

  const onDown = () => { holding = true; };
  const onUp = () => { holding = false; };
  actionBtn.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);

  function frame(now) {
    const dt = 1 / 60;
    const elapsedSec = (now - startTime) / 1000;

    // marker (the fish, or the object caught in the net) darts back and forth
    const markerPos = 50 + 24 * Math.sin(elapsedSec * darting);

    // control bar moves at a constant speed the instant you hold/release --
    // no acceleration ramp, so direction changes track the fish immediately
    // instead of lagging a beat behind.
    barVelocity = holding ? 50 : -62;
    barCenter += barVelocity * dt;
    barCenter = Math.max(0, Math.min(100, barCenter));

    const overlap = Math.abs(markerPos - barCenter) <= barWidthPct / 2;
    meter += (overlap ? quest.cast.fillRatePerSec : -quest.cast.drainRatePerSec) * dt;
    meter = Math.max(0, Math.min(100, meter));

    reelMarker.style.left = `${markerPos}%`;
    reelBar.style.left = `${Math.max(0, barCenter - barWidthPct / 2)}%`;
    reelBar.style.width = `${barWidthPct}%`;
    reelMeterFill.style.width = `${meter}%`;

    if (meter <= 0) {
      if (zeroSince === null) zeroSince = now;
      else if (now - zeroSince > quest.cast.graceSec * 1000) {
        endReel(false, onDown, onUp);
        return;
      }
    } else {
      zeroSince = null;
    }

    if (meter >= 100) { endReel(true, onDown, onUp); return; }
    if (elapsedSec >= quest.cast.timeoutSec) { endReel(false, onDown, onUp); return; }

    reelRaf = requestAnimationFrame(frame);
  }

  reelRaf = requestAnimationFrame(frame);
}

function endReel(landed, onDown, onUp) {
  cancelAnimationFrame(reelRaf);
  actionBtn.removeEventListener('pointerdown', onDown);
  window.removeEventListener('pointerup', onUp);
  reelTrack.classList.add('hidden');
  reelMeterWrap.classList.add('hidden');

  if (!landed) {
    statusTextEl.textContent = quest.copy.lost;
    statusHintEl.textContent = '';
    pendingCatch = null;
    setTimeout(setIdle, 1400);
    return;
  }

  if (pendingCatch.kind === 'object') resolveObjectCatch();
  else resolveFishCatch();
}

// ================================
// RESOLUTION + REWARDS
// ================================

async function resolveFishCatch() {
  const { species, weightKg, band } = pendingCatch;
  pendingCatch = null;

  addToPond(species.id, weightKg, band);

  if (band === 'undersized') {
    renderCollections();
    showCatchPopup({ kind: 'fish', species, weightKg, band, tickets: {} });
    return;
  }

  if (species.standardTicket === 'student_choice' && band === 'standard') {
    openChoiceModal(species, weightKg);
    return;
  }

  const tickets = band === 'trophy' || band === 'legendary'
    ? { ...quest.fullBundle }
    : { [species.standardTicket]: 1 };

  await grantAndShow({
    kind: 'fish', species, weightKg, band, tickets
  });
}

function openChoiceModal(species, weightKg) {
  choiceButtons.innerHTML = '';
  CHOOSABLE_TICKETS.forEach((type) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'submit-quiz-btn';
    btn.textContent = TICKET_LABELS[type];
    btn.addEventListener('click', async () => {
      choiceModal.classList.add('hidden');
      await grantAndShow({ kind: 'fish', species, weightKg, band: 'standard', tickets: { [type]: 1 } });
    });
    choiceButtons.appendChild(btn);
  });
  choiceModal.classList.remove('hidden');
}

async function resolveObjectCatch() {
  const { object } = pendingCatch;
  pendingCatch = null;
  await grantAndShow({ kind: 'object', object, tickets: { ...quest.fullBundle } });
}

function addToPond(speciesId, weightKg, band) {
  fishingState.pond.unshift({ speciesId, weightKg, band, caughtAt: new Date().toISOString() });
  fishingState.pond = fishingState.pond.slice(0, 40);
  if (!fishingState.caughtSpecies.includes(speciesId)) fishingState.caughtSpecies.push(speciesId);
}

async function grantAndShow(result) {
  const studentRef = doc(db, 'students', email);
  const isFirstEver = !fishingState.completed;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(studentRef);
      const data = snap.data() || {};
      const current = (data.sideQuests || {})[quest.id] || {};

      const updates = {};

      if (result.kind === 'fish') {
        updates[`sideQuests.${quest.id}.pond`] = arrayUnion({
          speciesId: result.species.id,
          weightKg: result.weightKg,
          band: result.band,
          caughtAt: new Date().toISOString()
        });
        updates[`sideQuests.${quest.id}.caughtSpecies`] = arrayUnion(result.species.id);
      }

      if (result.kind === 'object') {
        const already = (current.reliquary || []).some((r) => r.objectId === result.object.id);
        if (already) return; // race guard: someone else already recorded this find
        updates[`sideQuests.${quest.id}.reliquary`] = arrayUnion({
          objectId: result.object.id, foundAt: new Date().toISOString()
        });
      }

      Object.entries(result.tickets).forEach(([type, qty]) => {
        updates[`tickets.${type}`] = increment(qty);
      });

      if (isFirstEver) {
        updates[`sideQuests.${quest.id}.completed`] = true;
        updates[`sideQuests.${quest.id}.completedAt`] = new Date().toISOString();
        updates.achievements = arrayUnion(sideQuestBadgeId(quest.id));
      }

      tx.update(studentRef, updates);
    });

    if (result.kind === 'object') {
      fishingState.reliquary.push({ objectId: result.object.id, foundAt: new Date().toISOString() });
    }
    if (isFirstEver) {
      fishingState.completed = true;
      logActivity({ email, name, type: 'sidequest', title: `Completed the "${quest.title}" side quest`, icon: '🎣' });
    }
  } catch (err) {
    console.error('Failed to save catch:', err);
  }

  renderCollections();

  const isRare = result.kind === 'object' || result.band === 'trophy' || result.band === 'legendary';
  if (!isFirstEver && !isRare) {
    showCatchPopup(result);
    return;
  }

  setIdle();
  const chips = Object.entries(result.tickets).map(([type, qty]) => `+${qty} ${TICKET_LABELS[type] || type}`);
  if (result.kind === 'object') {
    showTreasureReveal({
      iconSrc: quest.treasureIcon,
      kicker: 'A Blessed Object!',
      heading: result.object.name,
      subheading: result.object.text,
      chips
    });
  } else {
    showTreasureReveal({
      iconSrc: quest.treasureIcon,
      kicker: isFirstEver ? 'Side Quest Complete' : (result.band === 'legendary' ? 'Legendary Catch!' : 'Trophy Catch!'),
      heading: `${result.species.name} — ${result.weightKg} kg`,
      subheading: result.species.verse,
      chips
    });
  }
}

// ================================
// REVEAL + COLLECTIONS
// ================================

function showCatchPopup(result) {
  const ticketChips = Object.entries(result.tickets)
    .map(([type, qty]) => `<span class="shore-ticket-chip">+${qty} ${TICKET_LABELS[type] || type}</span>`)
    .join('');
  catchTicketsEl.innerHTML = ticketChips;

  if (result.kind === 'object') {
    catchBox.classList.add('shore-catch-object');
    catchIcon.textContent = '🕯️';
    catchHeading.textContent = 'Something rests in the net.';
    catchTitleEl.textContent = result.object.name;
    catchTextEl.textContent = result.object.text;
  } else {
    catchBox.classList.remove('shore-catch-object');
    const label = result.band === 'legendary' ? quest.copy.legendary
      : result.band === 'trophy' ? quest.copy.trophy
      : result.band === 'undersized' ? 'You caught something!'
      : 'Landed it!';
    catchIcon.textContent = '🐟';
    catchHeading.textContent = label;
    catchTitleEl.textContent = `${result.species.name} — ${result.weightKg} kg`;
    catchTextEl.textContent = result.band === 'undersized' ? quest.copy.undersizedPopup : result.species.verse;
  }

  catchPopup.classList.remove('hidden');
  setIdle();
}

function renderCollections() {
  if (fishingState.pond.length === 0) {
    pondListEl.innerHTML = `<p>${quest.copy.pondEmpty || 'Nothing swimming here yet.'}</p>`;
  } else {
    pondListEl.innerHTML = fishingState.pond.slice(0, 18).map((p) => {
      const species = quest.species.find((s) => s.id === p.speciesId);
      const name = species ? species.name : 'Unknown fish';
      const color = species ? species.color : '#7C8AAE';
      const bandLabel = p.band === 'trophy' ? ' 🏆' : p.band === 'legendary' ? ' ✨' : '';
      return `<div class="pond-fish" style="border-color:${color}"><span style="color:${color}">●</span> ${name} — ${p.weightKg} kg${bandLabel}</div>`;
    }).join('');
  }

  if (fishingState.reliquary.length === 0) {
    reliquaryListEl.innerHTML = '<p>The shelf is bare.</p>';
  } else {
    reliquaryListEl.innerHTML = fishingState.reliquary.map((r) => {
      const obj = quest.blessedObjects.find((o) => o.id === r.objectId);
      return `<div class="reliquary-item"><strong>${obj ? obj.name : r.objectId}</strong><span>${new Date(r.foundAt).toLocaleDateString()}</span></div>`;
    }).join('');
  }
}
