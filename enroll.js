import { db, doc, getDoc, setDoc } from './firebase.js';
import { requireLogin } from './auth.js';
import { ADMIN_EMAILS } from './admins.js';
import { getOfferingsForTeacher } from './classOfferings.js';

const { email, name } = requireLogin();

if (ADMIN_EMAILS.includes(email)) {
  window.location.href = 'teacher.html';
}

const studentNameEl = document.getElementById('studentName');
if (studentNameEl) {
  studentNameEl.textContent = name;
}

const sectionSelectEl = document.getElementById('sectionSelect');

// Teacher-select runs BEFORE this page, so the student doc already has
// teacherEmail by the time they get here — only show that teacher's
// offerings, never the whole school's.
(async () => {
  if (!sectionSelectEl) return;

  const studentSnap = await getDoc(doc(db, 'students', email));
  const teacherEmail = studentSnap.exists() ? studentSnap.data().teacherEmail : null;

  if (!teacherEmail) {
    // Shouldn't happen given the onboarding order, but don't strand the
    // student on a dead dropdown if it does.
    window.location.href = 'teacher-select.html';
    return;
  }

  getOfferingsForTeacher(teacherEmail).forEach((offering) => {
    const opt = document.createElement('option');
    opt.value = offering;
    opt.textContent = offering;
    sectionSelectEl.appendChild(opt);
  });
})();

// Generate a unique HCDC Student ID
function generateStudentId() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `HCDC-REED-2026-${random}`;
}

const enrollBtn = document.getElementById('enrollBtn');

if (enrollBtn) {
  enrollBtn.onclick = async () => {
    const section = document.getElementById('sectionSelect').value;

    if (!section) {
      alert('Please select your section.');
      return;
    }

    enrollBtn.disabled = true;
    enrollBtn.textContent = 'Enrolling...';

    try {
      const studentRef = doc(db, 'students', email);
      const snap = await getDoc(studentRef);
      // Teacher-select now runs BEFORE this page, so the record already
      // exists (with just teacherName/teacherEmail) by the time a brand
      // new student gets here — "already enrolled" has to mean "already
      // has a studentId", not just "the doc exists".
      const alreadyEnrolled = snap.exists() && !!snap.data().studentId;

      const payload = {
        name,
        email,
        section,
        studentId: alreadyEnrolled && snap.data().studentId ? snap.data().studentId : generateStudentId()
      };

      // Only set starting defaults for a brand-new profile — never overwrite
      // an existing student's progress just because they re-submitted this form.
      if (!alreadyEnrolled) {
        payload.achievements = [];
        payload.totalPieces = 0;
        payload.puzzle1 = [];
        payload.puzzle1Completed = false;
        payload.createdAt = new Date().toISOString();
      }

      await setDoc(studentRef, payload, { merge: true });

      // Enrollment is now the LAST onboarding step (teacher is picked
      // first), so this goes straight to the dashboard.
      window.location.href = 'dashboard.html';

    } catch (err) {
      console.error('Failed to save student profile:', err);
      alert('Something went wrong while enrolling. Check the console for details.');
      enrollBtn.disabled = false;
      enrollBtn.textContent = 'Enroll';
    }
  };
} else {
  console.warn('Enroll button (#enrollBtn) not found in the DOM.');
}
