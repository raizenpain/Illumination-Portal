import { db, doc, setDoc } from '../core/firebase.js';
import { requireLogin } from '../core/auth.js';
import { ADMINS, ADMIN_EMAILS } from '../core/admins.js';
import { isPrelimLocked, openNewClasses } from '../core/prelimDeadline.js';

const { email } = requireLogin();

if (ADMIN_EMAILS.includes(email)) {
  window.location.href = 'teacher.html';
}

const grid = document.getElementById('teacherGrid');
const status = document.getElementById('teacherSelectStatus');

let selecting = false;

function renderTeacherCards() {
  grid.innerHTML = '';

  // After the Prelim lock, only a teacher with a class still taking new
  // students (see PRELIM_EXTENSIONS) can be picked.
  const teachers = isPrelimLocked()
    ? ADMINS.filter((teacher) => openNewClasses().some((ext) => ext.teacherEmail === teacher.email))
    : ADMINS;
  if (!teachers.length) {
    status.textContent = 'Enrollment has closed.';
    return;
  }

  teachers.forEach((teacher) => {
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

    // Teacher is now picked first, so the next onboarding step is
    // enrollment (class schedule) — not the dashboard directly.
    window.location.href = 'enroll.html';

  } catch (err) {
    console.error('Failed to save teacher assignment:', err);
    status.textContent = 'Something went wrong. Please try again.';
    selecting = false;
  }
}

renderTeacherCards();
