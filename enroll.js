import { db, doc, getDoc, setDoc } from './firebase.js';
import { requireLogin } from './auth.js';
import { ADMIN_EMAILS } from './admins.js';

const { email, name } = requireLogin();

if (ADMIN_EMAILS.includes(email)) {
  window.location.href = 'teacher.html';
}

const studentNameEl = document.getElementById('studentName');
if (studentNameEl) {
  studentNameEl.textContent = name;
}

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
      const alreadyEnrolled = snap.exists();

      const payload = {
        name,
        email,
        section,
        studentId: alreadyEnrolled && snap.data().studentId ? snap.data().studentId : generateStudentId()
      };

      // Only set starting defaults for a brand-new profile — never overwrite
      // an existing student's progress just because they re-submitted this form.
      if (!alreadyEnrolled) {
        payload.rank = 'Seeker';
        payload.achievements = [];
        payload.totalPieces = 0;
        payload.puzzle1 = [];
        payload.puzzle1Completed = false;
        payload.createdAt = new Date().toISOString();
      }

      await setDoc(studentRef, payload, { merge: true });

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
