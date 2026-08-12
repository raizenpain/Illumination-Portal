import { db, doc, getDoc, updateDoc } from './firebase.js';
import { requireLogin } from './auth.js';
import { PUZZLE_CONFIG } from './puzzles.js';
import { containsBannedWord } from './contentFilter.js';

// ================================
// SETTINGS — adjust freely
// ================================
const MIN_LENGTH = 150; // characters required before a reflection counts as "written"

const { email } = requireLogin();

const subtitleEl = document.getElementById('reflectionSubtitle');
const inputEl = document.getElementById('reflectionInput');
const submitBtn = document.getElementById('submitReflectionBtn');
const statusEl = document.getElementById('reflectionStatus');

const studentRef = doc(db, 'students', email);

init();

function prelimSeasonDone(data) {
  return Object.values(PUZZLE_CONFIG).every((config) => !!data[config.completedField]);
}

async function init() {
  const snap = await getDoc(studentRef);
  const data = snap.exists() ? snap.data() : {};

  if (!prelimSeasonDone(data)) {
    window.location.href = 'dashboard.html';
    return;
  }

  if (data.puzzle3Reflection) {
    inputEl.value = data.puzzle3Reflection;
  }

  if (data.midtermUnlocked) {
    subtitleEl.textContent = "You've already unlocked Midterm Season — feel free to revise your reflection.";
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

  submitBtn.disabled = true;
  statusEl.textContent = 'Saving your reflection...';

  try {
    await updateDoc(studentRef, {
      puzzle3Reflection: text,
      midtermUnlocked: true,
      puzzle3ReflectionSubmittedAt: new Date().toISOString()
    });

    statusEl.textContent = '🎉 Reflection saved! Midterm Season unlocked.';

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);

  } catch (err) {
    console.error('Failed to save reflection:', err);
    statusEl.textContent = 'Something went wrong. Please try again.';
    submitBtn.disabled = false;
  }
}
