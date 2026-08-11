import { db, doc, setDoc } from './firebase.js';
import { requireLogin } from './auth.js';
import { ADMINS } from './admins.js';

const { email } = requireLogin();

const grid = document.getElementById('teacherGrid');
const status = document.getElementById('teacherSelectStatus');

let selecting = false;

function renderTeacherCards() {
  grid.innerHTML = '';

  ADMINS.forEach((teacher) => {
    const card = document.createElement('div');
    card.className = 'teacher-select-card-btn';
    card.innerHTML = `
      <div class="teacher-select-avatar">🧑‍🏫</div>
      <h3>${teacher.name}</h3>
      <p>Tap to select</p>
    `;
    card.onclick = () => selectTeacher(teacher);
    grid.appendChild(card);
  });
}

async function selectTeacher(teacher) {
  if (selecting) return;
  selecting = true;
  status.textContent = `Saving ${teacher.name}...`;

  try {
    const studentRef = doc(db, 'students', email);
    await setDoc(studentRef, {
      teacherName: teacher.name,
      teacherEmail: teacher.email
    }, { merge: true });

    window.location.href = 'dashboard.html';

  } catch (err) {
    console.error('Failed to save teacher assignment:', err);
    status.textContent = 'Something went wrong. Please try again.';
    selecting = false;
  }
}

renderTeacherCards();
