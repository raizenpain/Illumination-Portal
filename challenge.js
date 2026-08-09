import { db, doc, getDoc, updateDoc } from './firebase.js';
import { requireLogin } from './auth.js';
import { CHALLENGES } from './questions.js';

// ================================
// SETTINGS — adjust freely
// ================================
const MAX_ATTEMPTS = 3;        // wrong attempts allowed before cooldown
const COOLDOWN_SECONDS = 60;   // cooldown length in seconds

const { email } = requireLogin();

const params = new URLSearchParams(window.location.search);
const gate = params.get('gate'); // "puzzle2" or "puzzle3"

const titleEl = document.getElementById('challengeTitle');
const subtitleEl = document.getElementById('challengeSubtitle');
const quizContainer = document.getElementById('quizContainer');
const statusEl = document.getElementById('challengeStatus');

const GATE_INFO = {
  puzzle2: { title: 'Challenge Gate — Puzzle 2', unlockField: 'puzzle2Unlocked', nextPage: 'puzzle.html?puzzle=2' },
  puzzle3: { title: 'Challenge Gate — Puzzle 3', unlockField: 'puzzle3Unlocked', nextPage: 'puzzle.html?puzzle=3' }
};

const gateInfo = GATE_INFO[gate];
const questions = CHALLENGES[gate];

if (!gateInfo || !questions) {
  titleEl.textContent = 'Challenge Not Found';
  statusEl.textContent = 'This challenge link is invalid.';
} else {
  init();
}

async function init() {
  titleEl.textContent = gateInfo.title;

  const studentRef = doc(db, 'students', email);
  const snap = await getDoc(studentRef);
  const data = snap.exists() ? snap.data() : {};

  if (data[gateInfo.unlockField]) {
    showAlreadyUnlocked();
    return;
  }

  if (isOnCooldown()) {
    renderCooldown();
    return;
  }

  renderQuiz();
}

function showAlreadyUnlocked() {
  subtitleEl.textContent = 'You already unlocked this puzzle!';
  quizContainer.innerHTML = `<button class="submit-quiz-btn" id="goToPuzzleBtn">Go to Puzzle</button>`;
  document.getElementById('goToPuzzleBtn').onclick = () => {
    window.location.href = gateInfo.nextPage;
  };
}

function renderQuiz() {
  subtitleEl.textContent = 'Answer all questions correctly to unlock';
  quizContainer.innerHTML = '';

  questions.forEach((q, index) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question';

    const qText = document.createElement('div');
    qText.className = 'quiz-question-text';
    qText.textContent = `${index + 1}. ${q.question}`;
    qDiv.appendChild(qText);

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'quiz-options';

    q.options.forEach((opt, optIndex) => {
      const label = document.createElement('label');
      label.className = 'quiz-option';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `question-${index}`;
      radio.value = optIndex;

      label.appendChild(radio);
      label.append(opt);
      optionsDiv.appendChild(label);
    });

    qDiv.appendChild(optionsDiv);
    quizContainer.appendChild(qDiv);
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'submit-quiz-btn';
  submitBtn.textContent = 'Submit Answers';
  submitBtn.onclick = handleSubmit;
  quizContainer.appendChild(submitBtn);

  statusEl.textContent = '';
}

async function handleSubmit() {
  let allCorrect = true;
  let allAnswered = true;

  questions.forEach((q, index) => {
    const selected = document.querySelector(`input[name="question-${index}"]:checked`);
    if (!selected) {
      allAnswered = false;
      return;
    }
    if (parseInt(selected.value) !== q.correctIndex) {
      allCorrect = false;
    }
  });

  if (!allAnswered) {
    statusEl.textContent = 'Please answer every question before submitting.';
    return;
  }

  if (allCorrect) {
    await unlockPuzzle();
  } else {
    registerFailedAttempt();
  }
}

async function unlockPuzzle() {
  statusEl.textContent = '🎉 Correct! Unlocking...';

  try {
    const studentRef = doc(db, 'students', email);
    await updateDoc(studentRef, {
      [gateInfo.unlockField]: true
    });

    clearAttempts();

    setTimeout(() => {
      window.location.href = gateInfo.nextPage;
    }, 1500);

  } catch (err) {
    console.error('Failed to unlock puzzle:', err);
    statusEl.textContent = 'Something went wrong. Please try again.';
  }
}

// ================================
// COOLDOWN / ATTEMPT TRACKING (per browser)
// ================================

function attemptsKey() {
  return `challenge_attempts_${gate}_${email}`;
}

function cooldownKey() {
  return `challenge_cooldown_${gate}_${email}`;
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
    statusEl.textContent = `Not quite right — try again! (${remaining} attempt${remaining === 1 ? '' : 's'} left before a short cooldown)`;
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
  quizContainer.innerHTML = '';
  subtitleEl.textContent = 'Take a short breather, Seeker';

  const cooldownEl = document.createElement('p');
  cooldownEl.className = 'puzzle-status';
  quizContainer.appendChild(cooldownEl);

  function updateCountdown() {
    const end = parseInt(localStorage.getItem(cooldownKey()) || '0');
    const remainingMs = end - Date.now();

    if (remainingMs <= 0) {
      clearAttempts();
      renderQuiz();
      return;
    }

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const display = `${mins}:${secs.toString().padStart(2, '0')}`;

    cooldownEl.textContent = `⏳ Whoa there! You've tried a few times — recharge and come back in ${display}.`;

    setTimeout(updateCountdown, 500);
  }

  updateCountdown();
  statusEl.textContent = '';
}