import { db, doc, getDoc, updateDoc } from './firebase.js';
import { requireLogin } from './auth.js';
import { PUZZLE_CONFIG } from './puzzles.js';
import { containsBannedWord, looksLikeGibberish, isOffTopic } from './contentFilter.js';
import { getRankProgress, getSeasonStars, isSeasonChaptersComplete, RANK_TIERS } from './rank.js';
import { ensureRankPopup, renderStarPopup, renderRankPopup } from './rankPopup.js';

// ================================
// SETTINGS — adjust freely
// ================================
const MIN_LENGTH = 150; // characters required before a reflection counts as "written"

function prelimSeasonDone(data) {
  return Object.values(PUZZLE_CONFIG).every((config) => !!data[config.completedField]);
}

// One entry per capstone reflection. "midterm" is the original Prelim
// exit gate; the rest were added later, gating Semifinal/Final and,
// for "apostle", nothing further to unlock — it's the last star toward
// legendaryEligible. bonusSeasonId is which tier's star this reflection
// fills (null for midterm, which stays a pure access-gate — see rank.js).
const GATE_INFO = {
  midterm: {
    title: 'Prelim Reflection',
    subtitle: 'Look back before you move forward',
    placeholder: 'What did you learn about yourself, your faith, or your formation journey this Prelim Season?',
    prerequisite: (data) => prelimSeasonDone(data),
    textField: 'puzzle3Reflection',
    unlockField: 'midtermUnlocked',
    timestampField: 'puzzle3ReflectionSubmittedAt',
    alreadyUnlockedNote: "You've already unlocked Midterm Season — feel free to revise your reflection.",
    successNote: '🎉 Reflection saved! Midterm Season unlocked.',
    bonusSeasonId: null
  },
  semifinal: {
    title: 'Midterm Reflection',
    subtitle: 'Look back before you move forward',
    placeholder: 'What did you learn about yourself, your faith, or your formation journey this Midterm Season?',
    prerequisite: (data) => isSeasonChaptersComplete('midterm', data),
    textField: 'semifinalReflection',
    unlockField: 'semifinalUnlocked',
    timestampField: 'semifinalReflectionSubmittedAt',
    alreadyUnlockedNote: "You've already unlocked Semifinal Season — feel free to revise your reflection.",
    successNote: '🎉 Reflection saved! Semifinal Season unlocked.',
    bonusSeasonId: 'midterm'
  },
  final: {
    title: 'Semifinal Reflection',
    subtitle: 'Look back before you move forward',
    placeholder: 'What did you learn about yourself, your faith, or your formation journey this Semifinal Season?',
    prerequisite: (data) => isSeasonChaptersComplete('semifinal', data),
    textField: 'finalReflection',
    unlockField: 'finalUnlocked',
    timestampField: 'finalReflectionSubmittedAt',
    alreadyUnlockedNote: "You've already unlocked Final Season — feel free to revise your reflection.",
    successNote: '🎉 Reflection saved! Final Season unlocked.',
    bonusSeasonId: 'semifinal'
  },
  apostle: {
    title: 'Final Reflection',
    subtitle: 'The last word before the last star',
    placeholder: 'Looking back on the whole journey from Prelim to Final — what did God show you?',
    prerequisite: (data) => isSeasonChaptersComplete('final', data),
    textField: 'apostleReflection',
    unlockField: 'apostleUnlocked',
    timestampField: 'apostleReflectionSubmittedAt',
    alreadyUnlockedNote: "You've already written this reflection — feel free to revise it.",
    successNote: '🎉 Reflection saved!',
    bonusSeasonId: 'final'
  }
};

const { email } = requireLogin();

const params = new URLSearchParams(window.location.search);
const gateKey = params.get('gate') || 'midterm';
const gate = GATE_INFO[gateKey];

const titleEl = document.getElementById('reflectionTitle');
const subtitleEl = document.getElementById('reflectionSubtitle');
const inputEl = document.getElementById('reflectionInput');
const submitBtn = document.getElementById('submitReflectionBtn');
const statusEl = document.getElementById('reflectionStatus');

const studentRef = doc(db, 'students', email);
let studentData = {};

if (!gate) {
  titleEl.textContent = 'Reflection Not Found';
  statusEl.textContent = 'This reflection link is invalid.';
} else {
  init();
}

async function init() {
  const snap = await getDoc(studentRef);
  studentData = snap.exists() ? snap.data() : {};

  if (!gate.prerequisite(studentData)) {
    window.location.href = 'dashboard.html';
    return;
  }

  document.title = gate.title;
  titleEl.textContent = gate.title;
  subtitleEl.textContent = gate.subtitle;
  inputEl.placeholder = gate.placeholder;

  if (studentData[gate.textField]) {
    inputEl.value = studentData[gate.textField];
  }

  if (studentData[gate.unlockField]) {
    subtitleEl.textContent = gate.alreadyUnlockedNote;
  }

  submitBtn.onclick = handleSubmit;
}

function blockPasteInto(textarea, onBlocked) {
  const block = (event) => {
    event.preventDefault();
    onBlocked();
  };

  textarea.addEventListener('paste', block);
  textarea.addEventListener('drop', block);
  textarea.addEventListener('contextmenu', (event) => event.preventDefault());
}

blockPasteInto(inputEl, () => {
  statusEl.textContent = "Pasting isn't allowed here — please write your reflection yourself.";
});

async function handleSubmit() {
  const text = inputEl.value.trim();

  if (text.length < MIN_LENGTH) {
    statusEl.textContent = `Please write a bit more — ${MIN_LENGTH - text.length} characters to go.`;
    return;
  }

  if (containsBannedWord(text)) {
    statusEl.textContent = "That reflection contains language that isn't allowed here — please rewrite it.";
    return;
  }

  if (looksLikeGibberish(text)) {
    statusEl.textContent = "That doesn't look like a real written reflection — please write in complete sentences.";
    return;
  }

  if (isOffTopic(text, gate.placeholder, gate.title)) {
    statusEl.textContent = "Your reflection doesn't seem to address the prompt — make sure you're actually reflecting on what's asked.";
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = 'Saving your reflection...';

  const alreadyUnlocked = !!studentData[gate.unlockField];

  try {
    const rankBefore = getRankProgress(studentData);

    await updateDoc(studentRef, {
      [gate.textField]: text,
      [gate.unlockField]: true,
      [gate.timestampField]: new Date().toISOString()
    });

    statusEl.textContent = gate.successNote;

    let popupsQueued = 0;

    if (!alreadyUnlocked && gate.bonusSeasonId) {
      const afterData = { ...studentData, [gate.unlockField]: true };
      const rankAfter = getRankProgress(afterData);
      const bonusStars = getSeasonStars(gate.bonusSeasonId, afterData);

      showStarPopup({
        rank: rankBefore.rank,
        stars: bonusStars,
        justEarnedIndex: bonusStars.filter(Boolean).length - 1,
        subtitle: gate.title
      });
      popupsQueued++;

      if (rankAfter.rank !== rankBefore.rank) {
        const nextTier = RANK_TIERS.find((t) => t.rank === rankAfter.rank);
        showRankPopup({ rank: rankAfter.rank, seasonName: nextTier ? nextTier.seasonName : null });
        popupsQueued++;
      }
    }

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, Math.max(1500, popupsQueued * 3300));

  } catch (err) {
    console.error('Failed to save reflection:', err);
    statusEl.textContent = 'Something went wrong. Please try again.';
    submitBtn.disabled = false;
  }
}

// ================================
// STAR / RANK POPUPS — same queue-free pattern as app.js/season.js
// would use, simplified since a reflection only ever fires one star
// (+ maybe one rank-up) popup, never a burst of several at once.
// ================================

let popupBusy = false;
const popupQueue = [];

function queuePopup(item) {
  popupQueue.push(item);
  processPopupQueue();
}

function processPopupQueue() {
  if (popupBusy || popupQueue.length === 0) return;
  popupBusy = true;

  const item = popupQueue.shift();
  ensureRankPopup();
  const overlay = document.getElementById('rankPopup');
  if (item.kind === 'star') renderStarPopup(item);
  else renderRankPopup(item);

  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.add('show'));

  const dismiss = () => {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.classList.add('hidden');
      popupBusy = false;
      setTimeout(processPopupQueue, 300);
    }, 300);
  };

  if (item.kind === 'rank') {
    const btn = document.getElementById('rankPopupContinue');
    const onClick = () => { btn.removeEventListener('click', onClick); dismiss(); };
    btn.addEventListener('click', onClick);
  } else {
    setTimeout(dismiss, 3200);
  }
}

function showStarPopup(info) {
  queuePopup({ kind: 'star', ...info });
}

function showRankPopup(info) {
  queuePopup({ kind: 'rank', ...info });
}
