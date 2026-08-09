import { functions, httpsCallable } from './firebase.js';
import { requireLogin } from './auth.js';

const { email, name } = requireLogin();

const ADMIN_EMAIL = 'jornie.hinay@hcdc.edu.ph';

if (email === ADMIN_EMAIL) {
  window.location.href = 'teacher.html';
}

const studentNameEl = document.getElementById('studentName');
if (studentNameEl) {
  studentNameEl.textContent = name;
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
      // Profile creation (and default rank/achievements/progress) happens
      // server-side so a returning student re-enrolling never wipes their
      // existing progress, and so those fields can't be forged from the client.
      const enrollStudent = httpsCallable(functions, 'enrollStudent');
      await enrollStudent({ section, name });

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