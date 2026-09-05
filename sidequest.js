// ============================================
// SIDE QUEST — crossword page. Renders whichever quest is currently
// active (or the soonest upcoming one) from sideQuests.js, handles
// the interactive grid, checks answers client-side, and awards
// tickets exactly once per student via a transaction guarded on
// students.sideQuests.<id>.completed.
// ============================================

import { db, doc, getDoc, runTransaction, increment, arrayUnion } from './firebase.js';
import { requireLogin } from './auth.js';
import { SIDE_QUESTS, getQuestStatus, getFeaturedQuest, sideQuestBadgeId } from './sideQuests.js';
import { logActivity } from './activity.js';
import { showTreasureReveal } from './treasureReveal.js';

const { email, name } = requireLogin();

const titleEl = document.getElementById('questTitle');
const subtitleEl = document.getElementById('questSubtitle');
const statusBanner = document.getElementById('questStatusBanner');
const playArea = document.getElementById('crosswordArea');
const gridEl = document.getElementById('crosswordGrid');
const acrossListEl = document.getElementById('acrossClues');
const downListEl = document.getElementById('downClues');
const actionsEl = document.getElementById('questActions');
const checkBtn = document.getElementById('checkAnswersBtn');
const feedbackEl = document.getElementById('questFeedback');

const TICKET_LABELS = {
  quiz_ticket: 'Sigil of Insight',
  task_ticket: 'Seal of Diligence',
  journal_ticket: 'Scroll of Reflection',
  recitation_ticket: "Herald's Voice"
};

const params = new URLSearchParams(window.location.search);
const requestedId = params.get('quest');
const quest = requestedId ? SIDE_QUESTS[requestedId] : getFeaturedQuest();

let inputs = []; // inputs[row][col] -> <input> or null
let cellWords = []; // cellWords[row][col] -> { across: wordObj|null, down: wordObj|null }
let activeDir = 'across';
let activeWord = null;

init();

async function init() {
  if (!quest) {
    titleEl.textContent = 'No Side Quest Right Now';
    subtitleEl.textContent = 'Check back soon — a new one is on the way.';
    return;
  }

  titleEl.textContent = quest.title;
  subtitleEl.textContent = quest.subtitle;

  const status = getQuestStatus(quest);

  let studentData = {};
  try {
    const snap = await getDoc(doc(db, 'students', email));
    studentData = snap.exists() ? snap.data() : {};
  } catch (err) {
    console.error('Failed to load student record:', err);
  }

  const progress = (studentData.sideQuests || {})[quest.id];
  const alreadyCompleted = !!(progress && progress.completed);

  if (status === 'upcoming') {
    showBanner(`This quest unlocks ${formatDate(quest.startsAt)}. Come back then!`);
    startCountdown(quest.startsAt);
    return;
  }

  if (status === 'ended' && !alreadyCompleted) {
    showBanner('This side quest has ended. Watch the dashboard for the next one!');
    return;
  }

  if (alreadyCompleted) {
    showBanner('✅ You already completed this side quest — nice work!');
  }

  buildCrossword(quest.crossword, alreadyCompleted ? quest.crossword.words : null);

  if (alreadyCompleted) {
    actionsEl.classList.add('hidden');
  } else {
    actionsEl.classList.remove('hidden');
    checkBtn.addEventListener('click', () => checkAnswers(alreadyCompleted));
  }
}

function showBanner(text) {
  statusBanner.textContent = text;
  statusBanner.classList.remove('hidden');
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function startCountdown(startsAtIso) {
  const target = new Date(startsAtIso).getTime();
  const tick = () => {
    const diff = target - Date.now();
    if (diff <= 0) {
      statusBanner.textContent = 'It\'s time! Refresh the page to begin.';
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    statusBanner.textContent = `This quest unlocks in ${days}d ${hours}h ${mins}m — ${formatDate(startsAtIso)}.`;
  };
  tick();
  setInterval(tick, 30000);
}

// ================================
// GRID BUILDING
// ================================

function buildCrossword(crossword, prefillWords) {
  playArea.classList.remove('hidden');

  const { rows, cols, words } = crossword;

  cellWords = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ across: null, down: null })));
  inputs = Array.from({ length: rows }, () => Array(cols).fill(null));

  words.forEach((w) => {
    for (let i = 0; i < w.word.length; i++) {
      const r = w.dir === 'down' ? w.row + i : w.row;
      const c = w.dir === 'across' ? w.col + i : w.col;
      cellWords[r][c][w.dir] = w;
    }
  });

  gridEl.style.gridTemplateColumns = `repeat(${cols}, var(--cw-cell-size))`;
  gridEl.style.gridTemplateRows = `repeat(${rows}, var(--cw-cell-size))`;
  gridEl.innerHTML = '';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const info = cellWords[r][c];
      const cell = document.createElement('div');

      if (!info.across && !info.down) {
        cell.className = 'crossword-cell crossword-cell-blocked';
        gridEl.appendChild(cell);
        continue;
      }

      cell.className = 'crossword-cell';

      const startWord = words.find((w) => w.row === r && w.col === c);
      if (startWord) {
        const numEl = document.createElement('span');
        numEl.className = 'crossword-cell-number';
        numEl.textContent = startWord.number;
        cell.appendChild(numEl);
      }

      const input = document.createElement('input');
      input.className = 'crossword-cell-input';
      input.maxLength = 1;
      input.autocomplete = 'off';
      input.dataset.row = r;
      input.dataset.col = c;

      input.addEventListener('focus', () => onCellFocus(r, c));
      input.addEventListener('click', () => onCellClick(r, c));
      input.addEventListener('input', (e) => onCellInput(e, r, c));
      input.addEventListener('keydown', (e) => onCellKeydown(e, r, c));

      cell.appendChild(input);
      gridEl.appendChild(cell);
      inputs[r][c] = input;
    }
  }

  if (prefillWords) {
    prefillWords.forEach((w) => {
      for (let i = 0; i < w.word.length; i++) {
        const r = w.dir === 'down' ? w.row + i : w.row;
        const c = w.dir === 'across' ? w.col + i : w.col;
        if (inputs[r][c]) {
          inputs[r][c].value = w.word[i];
          inputs[r][c].disabled = true;
        }
      }
    });
  }

  renderClueList(words);
}

function renderClueList(words) {
  const across = words.filter((w) => w.dir === 'across').sort((a, b) => a.number - b.number);
  const down = words.filter((w) => w.dir === 'down').sort((a, b) => a.number - b.number);

  acrossListEl.innerHTML = across.map((w) => clueLi(w)).join('');
  downListEl.innerHTML = down.map((w) => clueLi(w)).join('');

  [...acrossListEl.querySelectorAll('li'), ...downListEl.querySelectorAll('li')].forEach((li) => {
    li.addEventListener('click', () => {
      const num = parseInt(li.dataset.number);
      const dir = li.dataset.dir;
      const word = (dir === 'across' ? across : down).find((w) => w.number === num);
      if (!word) return;
      activeDir = dir;
      focusCell(word.row, word.col);
    });
  });
}

function clueLi(w) {
  return `<li data-number="${w.number}" data-dir="${w.dir}"><strong>${w.number}.</strong> ${w.clue} <span class="crossword-clue-length">(${w.word.length})</span></li>`;
}

// ================================
// INPUT NAVIGATION
// ================================

function onCellFocus(r, c) {
  const info = cellWords[r][c];
  if (!(activeDir === 'across' ? info.across : info.down)) {
    activeDir = info.across ? 'across' : 'down';
  }
  activeWord = activeDir === 'across' ? info.across : info.down;
  highlightActiveWord();
}

function onCellClick(r, c) {
  const info = cellWords[r][c];
  if (info.across && info.down) {
    // toggle direction on a second click of an already-focused intersection
    if (document.activeElement === inputs[r][c]) {
      activeDir = activeDir === 'across' ? 'down' : 'across';
      activeWord = activeDir === 'across' ? info.across : info.down;
      highlightActiveWord();
    }
  }
}

function highlightActiveWord() {
  document.querySelectorAll('.crossword-cell-active').forEach((el) => el.classList.remove('crossword-cell-active'));
  document.querySelectorAll('.crossword-clue-active').forEach((el) => el.classList.remove('crossword-clue-active'));
  if (!activeWord) return;

  for (let i = 0; i < activeWord.word.length; i++) {
    const r = activeWord.dir === 'down' ? activeWord.row + i : activeWord.row;
    const c = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
    if (inputs[r][c]) inputs[r][c].parentElement.classList.add('crossword-cell-active');
  }

  const list = activeWord.dir === 'across' ? acrossListEl : downListEl;
  const li = list.querySelector(`li[data-number="${activeWord.number}"]`);
  if (li) li.classList.add('crossword-clue-active');
}

function focusCell(r, c) {
  if (inputs[r] && inputs[r][c] && !inputs[r][c].disabled) inputs[r][c].focus();
}

function onCellInput(e, r, c) {
  const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
  e.target.value = val.slice(-1);

  if (!e.target.value) return;

  const word = activeWord;
  if (!word) return;

  const idx = word.dir === 'across' ? c - word.col : r - word.row;
  const nextIdx = idx + 1;
  if (nextIdx < word.word.length) {
    const nr = word.dir === 'down' ? word.row + nextIdx : word.row;
    const nc = word.dir === 'across' ? word.col + nextIdx : word.col;
    focusCell(nr, nc);
  }
}

function onCellKeydown(e, r, c) {
  if (e.key === 'Backspace' && !e.target.value && activeWord) {
    const idx = activeWord.dir === 'across' ? c - activeWord.col : r - activeWord.row;
    const prevIdx = idx - 1;
    if (prevIdx >= 0) {
      const pr = activeWord.dir === 'down' ? activeWord.row + prevIdx : activeWord.row;
      const pc = activeWord.dir === 'across' ? activeWord.col + prevIdx : activeWord.col;
      focusCell(pr, pc);
    }
  } else if (e.key === 'ArrowRight') { moveTo(r, c, 0, 1); }
  else if (e.key === 'ArrowLeft') { moveTo(r, c, 0, -1); }
  else if (e.key === 'ArrowDown') { moveTo(r, c, 1, 0); }
  else if (e.key === 'ArrowUp') { moveTo(r, c, -1, 0); }
}

function moveTo(r, c, dr, dc) {
  const nr = r + dr, nc = c + dc;
  if (inputs[nr] && inputs[nr][nc]) focusCell(nr, nc);
}

// ================================
// CHECK + AWARD
// ================================

// Whichever word (across or down) occupies (r, c), pick that word and
// return its expected letter at that cell -- either word gives the
// same letter at a real intersection, since the generator only ever
// crosses words at matching letters.
function expectedLetterAt(r, c) {
  const info = cellWords[r][c];
  const word = info.across || info.down;
  const idx = word.dir === 'across' ? c - word.col : r - word.row;
  return word.word[idx];
}

function checkAnswers() {
  const { words } = quest.crossword;

  // Unique cells, not per-word -- a shared intersection would
  // otherwise be counted (and checked) twice.
  const seen = new Set();
  let correctCells = 0, totalCells = 0;
  words.forEach((w) => {
    for (let i = 0; i < w.word.length; i++) {
      const r = w.dir === 'down' ? w.row + i : w.row;
      const c = w.dir === 'across' ? w.col + i : w.col;
      const key = `${r},${c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      totalCells++;
      const val = inputs[r][c] ? inputs[r][c].value : '';
      if (val === expectedLetterAt(r, c)) correctCells++;
    }
  });

  if (correctCells === totalCells) {
    feedbackEl.textContent = '';
    awardCompletion();
  } else {
    feedbackEl.textContent = `${correctCells} of ${totalCells} letters correct so far — keep going!`;
  }
}

async function awardCompletion() {
  checkBtn.disabled = true;
  const studentRef = doc(db, 'students', email);

  try {
    const alreadyDone = await runTransaction(db, async (tx) => {
      const snap = await tx.get(studentRef);
      const data = snap.data() || {};
      const existing = (data.sideQuests || {})[quest.id];
      if (existing && existing.completed) return true;

      const updates = {
        [`sideQuests.${quest.id}.completed`]: true,
        [`sideQuests.${quest.id}.completedAt`]: new Date().toISOString(),
        achievements: arrayUnion(sideQuestBadgeId(quest.id))
      };
      Object.entries(quest.reward).forEach(([ticketType, qty]) => {
        updates[`tickets.${ticketType}`] = increment(qty);
      });
      tx.update(studentRef, updates);
      return false;
    });

    if (!alreadyDone) {
      logActivity({
        email, name, type: 'sidequest',
        title: `Completed the "${quest.title}" side quest`,
        icon: '🧩'
      });
    }

    showRewardPopup();
  } catch (err) {
    console.error('Failed to award side quest completion:', err);
    feedbackEl.textContent = 'Solved it, but saving your reward failed — please try Check again.';
    checkBtn.disabled = false;
  }
}

function showRewardPopup() {
  actionsEl.classList.add('hidden');
  showTreasureReveal({
    iconSrc: quest.treasureIcon,
    heading: quest.title,
    subheading: 'A treasure has been earned for finishing this Side Quest.',
    chips: Object.entries(quest.reward).map(([type, qty]) => `+${qty} ${TICKET_LABELS[type] || type}`)
  });
}
