import { db, doc, getDoc, functions, httpsCallable } from './firebase.js';
import { requireLogin } from './auth.js';
import { PUZZLE_CONFIG } from './puzzles.js';

const { email, name } = requireLogin();

const params = new URLSearchParams(window.location.search);
const puzzleNumber = parseInt(params.get('puzzle')) || 1;
const config = PUZZLE_CONFIG[puzzleNumber];

const board = document.getElementById('board');
const upload = document.getElementById('pieceUpload');
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

function showAchievement(title, text, icon = '🏅') {
  const popup = document.getElementById('achievementPopup');
  document.getElementById('achievementTitle').textContent = title;
  document.getElementById('achievementText').textContent = text;
  document.querySelector('.achievement-icon').textContent = icon;

  popup.classList.remove('hidden');
  setTimeout(() => popup.classList.add('hidden'), 3000);
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
  attachUploadHandler();
}

function renderBoard() {
  if (!board) return;
  board.innerHTML = '';

  for (let i = 1; i <= config.totalPieces; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';

    if (uploadedPieces.includes(i)) {
      const img = document.createElement('img');
      img.src = `assets/puzzle${puzzleNumber}/piece${i}.png`;
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

function attachUploadHandler() {
  if (!upload) {
    console.warn('Upload input (#pieceUpload) not found in the DOM.');
    return;
  }

  upload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const match = file.name.match(/^piece(\d+)\.(png|jpg|jpeg)$/i);

    if (!match) {
      if (status) status.textContent = 'Invalid file. Upload only official puzzle pieces.';
      return;
    }

    const pieceNumber = parseInt(match[1]);
    const releasedPieces = await getReleasedPieces();

    if (!releasedPieces.includes(pieceNumber)) {
      if (status) status.textContent = `Piece ${pieceNumber} has not been released by your instructor yet.`;
      upload.value = '';
      return;
    }

    if (pieceNumber < 1 || pieceNumber > config.totalPieces) {
      if (status) status.textContent = 'This puzzle piece does not belong to this puzzle.';
      return;
    }

    if (uploadedPieces.includes(pieceNumber)) {
      if (status) status.textContent = 'You already uploaded this puzzle piece.';
      return;
    }

    let result;

    try {
      const claimPuzzlePiece = httpsCallable(functions, 'claimPuzzlePiece');
      result = await claimPuzzlePiece({ puzzleNumber, pieceNumber });
    } catch (err) {
      console.error('Failed to save progress:', err);
      if (status) status.textContent = err.message || 'Error saving progress. Please try again.';
      return;
    }

    if (!result.data.alreadyHad) {
      uploadedPieces.push(pieceNumber);
    }

    (result.data.newAchievements || []).forEach((a) => showAchievement(a.title, a.text, a.icon));

    renderBoard();
    if (status) status.textContent = `Piece ${pieceNumber} accepted!`;

    if (result.data.completed) {
      setTimeout(() => {
        window.location.href = 'completion.html';
      }, 3000);
    }

    upload.value = '';
  });
}