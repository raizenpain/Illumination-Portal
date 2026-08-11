import { db, doc, getDoc, setDoc, updateDoc } from './firebase.js';
import { requireLogin } from './auth.js';
import { PUZZLE_CONFIG } from './puzzles.js';
import { PIECE_CODES } from './codes.js';
import { PIECE_LESSONS } from './lessons.js';

// ================================
// SETTINGS — adjust freely
// ================================
const MAX_ATTEMPTS = 3;        // wrong attempts allowed before cooldown
const COOLDOWN_SECONDS = 60;   // cooldown length in seconds

const { email, name } = requireLogin();

const params = new URLSearchParams(window.location.search);
const puzzleNumber = parseInt(params.get('puzzle')) || 1;
const config = PUZZLE_CONFIG[puzzleNumber];

const board = document.getElementById('board');
const codeInput = document.getElementById('pieceCode');
const submitCodeBtn = document.getElementById('submitCodeBtn');
const status = document.getElementById('status');
const info = document.getElementById('studentInfo');
const titleEl = document.getElementById('puzzleTitle');
const subtitleEl = document.getElementById('puzzleSubtitle');

const uploadedPieces = [];

if (!config) {
  titleEl.textContent = 'Puzzle Not Found';
  if (status) status.textContent = 'This puzzle does not exist.';
} else {
  init();
}

// A piece unlock can trigger more than one popup at once (a lesson note
// plus a milestone/completion achievement) — queue them so each one gets
// its own moment on screen instead of overwriting the one before it.
const popupQueue = [];
let popupBusy = false;

function queuePopup(popup) {
  popupQueue.push(popup);
  processPopupQueue();
}

function processPopupQueue() {
  if (popupBusy || popupQueue.length === 0) return;
  popupBusy = true;

  const { heading = 'Achievement Unlocked!', title, text, icon = '🏅' } = popupQueue.shift();
  const popup = document.getElementById('achievementPopup');
  document.getElementById('achievementHeading').textContent = heading;
  document.getElementById('achievementTitle').textContent = title;
  document.getElementById('achievementText').textContent = text;
  document.querySelector('.achievement-icon').textContent = icon;

  popup.classList.remove('hidden');
  setTimeout(() => {
    popup.classList.add('hidden');
    popupBusy = false;
    setTimeout(processPopupQueue, 300);
  }, 3000);
}

function showAchievement(title, text, icon = '🏅') {
  queuePopup({ title, text, icon });
}

function showLesson(lesson) {
  queuePopup({ heading: '📖 Catechism Moment', title: lesson.title, text: lesson.text, icon: '✝️' });
}

async function init() {
  titleEl.textContent = config.title;
  subtitleEl.textContent = config.subtitle;
  if (info) info.textContent = `${name} (${email})`;

  const studentRef = doc(db, 'students', email);
  const snap = await getDoc(studentRef);
  const data = snap.exists() ? snap.data() : {};

  // Gate check — must have unlocked this puzzle first
  if (config.requiresGate && !data[config.requiresGate]) {
    window.location.href = `challenge.html?gate=puzzle${puzzleNumber}`;
    return;
  }

  if (data[config.piecesField]) {
    uploadedPieces.push(...data[config.piecesField]);
  }

  renderBoard();
  attachCodeHandler();
}

function renderBoard() {
  if (!board) return;
  board.innerHTML = '';

  for (let i = 1; i <= config.totalPieces; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';

    if (uploadedPieces.includes(i)) {
      const img = document.createElement('img');
      img.src = `assets/puzzle${puzzleNumber}/piece${i}.${config.pieceImageExt || 'png'}`;
      slot.appendChild(img);
    } else {
      slot.textContent = i;
    }

    board.appendChild(slot);
  }
}

async function getReleasedPieces() {
  const ref = doc(db, 'settings', `puzzle${puzzleNumber}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().released || []) : [];
}

function attachCodeHandler() {
  if (!codeInput || !submitCodeBtn) {
    console.warn('Code entry elements (#pieceCode / #submitCodeBtn) not found in the DOM.');
    return;
  }

  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase();
  });

  codeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCodeSubmit();
    }
  });

  submitCodeBtn.addEventListener('click', handleCodeSubmit);

  if (isOnCooldown()) {
    renderCooldown();
  }
}

async function handleCodeSubmit() {
  if (isOnCooldown()) return;

  const code = codeInput.value.trim().toUpperCase();

  if (!code) {
    if (status) status.textContent = 'Please enter a code.';
    return;
  }

  const puzzleCodes = PIECE_CODES[`puzzle${puzzleNumber}`] || {};
  const matchedKey = Object.keys(puzzleCodes).find((key) => puzzleCodes[key] === code);

  if (!matchedKey) {
    registerFailedAttempt();
    return;
  }

  const pieceNumber = parseInt(matchedKey);

  if (uploadedPieces.includes(pieceNumber)) {
    if (status) status.textContent = 'You have already collected this piece.';
    return;
  }

  const releasedPieces = await getReleasedPieces();

  if (!releasedPieces.includes(pieceNumber)) {
    if (status) status.textContent = '🔒 That piece has not been released yet.';
    return;
  }

  uploadedPieces.push(pieceNumber);

  try {
    const studentRef = doc(db, 'students', email);

    await setDoc(studentRef, {
      name,
      email,
      [config.piecesField]: uploadedPieces
    }, { merge: true });

    const snap = await getDoc(studentRef);
    if (snap.exists()) {
      const data = snap.data();
      const achievements = data.achievements || [];

      for (const milestone of config.milestoneAchievements) {
        if (uploadedPieces.length >= milestone.count && !achievements.includes(milestone.id)) {
          achievements.push(milestone.id);
          await updateDoc(studentRef, { achievements });
          showAchievement(milestone.title, milestone.text, milestone.icon);
        }
      }
    }

  } catch (err) {
    console.error('Failed to save progress:', err);
    uploadedPieces.pop();
    if (status) status.textContent = 'Error saving progress. Please try again.';
    return;
  }

  clearAttempts();
  renderBoard();
  if (status) status.textContent = `✅ Piece ${pieceNumber} unlocked!`;
  codeInput.value = '';

  let popupsQueued = 0;

  const lesson = (PIECE_LESSONS[`puzzle${puzzleNumber}`] || {})[pieceNumber];
  if (lesson) {
    showLesson(lesson);
    popupsQueued++;
  }

  if (uploadedPieces.length === config.totalPieces) {
    const studentRef = doc(db, 'students', email);
    const snap = await getDoc(studentRef);

    if (snap.exists()) {
      const data = snap.data();
      const achievements = data.achievements || [];
      const comp = config.completionAchievement;

      if (!achievements.includes(comp.id)) {
        achievements.push(comp.id);
        await updateDoc(studentRef, {
          achievements,
          rank: comp.rank,
          [config.completedField]: true
        });
        showAchievement(comp.title, comp.text, comp.icon);
        popupsQueued++;
      }
    }

    setTimeout(() => {
      window.location.href = 'completion.html';
    }, Math.max(3000, popupsQueued * 3300));
  }
}

// ================================
// COOLDOWN / ATTEMPT TRACKING (per browser)
// ================================

function attemptsKey() {
  return `piece_attempts_puzzle${puzzleNumber}_${email}`;
}

function cooldownKey() {
  return `piece_cooldown_puzzle${puzzleNumber}_${email}`;
}

function registerFailedAttempt() {
  const current = parseInt(localStorage.getItem(attemptsKey()) || '0') + 1;
  localStorage.setItem(attemptsKey(), current);

  if (current >= MAX_ATTEMPTS) {
    const cooldownEnd = Date.now() + COOLDOWN_SECONDS * 1000;
    localStorage.setItem(cooldownKey(), cooldownEnd);
    renderCooldown();
  } else {
    const remaining = MAX_ATTEMPTS - current;
    if (status) status.textContent = `Not quite right — try again! (${remaining} attempt${remaining === 1 ? '' : 's'} left before a short cooldown)`;
  }
}

function clearAttempts() {
  localStorage.removeItem(attemptsKey());
  localStorage.removeItem(cooldownKey());
}

function isOnCooldown() {
  const end = parseInt(localStorage.getItem(cooldownKey()) || '0');
  return end > Date.now();
}

function renderCooldown() {
  codeInput.disabled = true;
  submitCodeBtn.disabled = true;

  function updateCountdown() {
    const end = parseInt(localStorage.getItem(cooldownKey()) || '0');
    const remainingMs = end - Date.now();

    if (remainingMs <= 0) {
      clearAttempts();
      codeInput.disabled = false;
      submitCodeBtn.disabled = false;
      if (status) status.textContent = '';
      return;
    }

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const display = `${mins}:${secs.toString().padStart(2, '0')}`;

    if (status) status.textContent = `⏳ Too many tries! Take a breather — try again in ${display}`;

    setTimeout(updateCountdown, 500);
  }

  updateCountdown();
}
