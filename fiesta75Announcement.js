// ============================================
// HCDC 75TH ANNIVERSARY FIESTA ANNOUNCEMENT — a one-time info popup
// shown on dashboard entry, announcing the Fiesta and that the Vault
// (all 5 Vault Games) opens the next day. Skip is the only way to
// close it; "seen" is persisted to the student doc via
// hasSeenFiesta75Announcement so it never shows again, same one-time
// pattern as dashboardTour.js's hasSeenDashboardTour.
//
// Admins previewing the dashboard get it too, but have no student doc
// to write to (admins never enroll) -- their "seen" state is just a
// localStorage flag, once per browser, not synced like a real
// student's.
//
// Returns a Promise that resolves once Skip is clicked (or
// immediately, if already seen) -- callers use this to sequence
// anything else that shouldn't visually stack on top of this popup
// (see dashboard.html: the dashboard tour and Vault Capstone reveal
// both wait for this to resolve first).
//
// Also time-boxed: stops appearing after Fri Sept 18, 2026, 5:00 PM
// Philippine time, regardless of whether any given student has seen
// it yet -- an unseen popup past that point should just quietly never
// show rather than surprise a student the following week.
// ============================================

import { db, doc, updateDoc } from './firebase.js';

const ADMIN_SEEN_KEY = 'adminHasSeenFiesta75Announcement';
const EXPIRES_AT = '2026-09-18T17:00:00+08:00';

export function maybeShowFiesta75Announcement({ email, hasSeen, isAdmin }) {
  return new Promise((resolve) => {
    if (Date.now() > new Date(EXPIRES_AT).getTime()) { resolve(); return; }

    const seen = isAdmin ? localStorage.getItem(ADMIN_SEEN_KEY) === 'true' : hasSeen;
    if (seen) { resolve(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'fiesta-popup';
    overlay.innerHTML = `
      <div class="fiesta-card">
        <img class="fiesta-card-img" src="assets/fiesta-75th-card.jpg" alt="Hail, Holy Cross! Happy Fiesta, HCDC Community! September 14, 2026">
        <div class="fiesta-card-body">
          <p class="fiesta-kicker">🎉 HCDC 75th Anniversary</p>
          <h2 class="fiesta-heading">Hail, Holy Cross!</h2>
          <p>Today, the whole HCDC community celebrates a milestone worth pausing for: 75 years of Holy Cross of Davao College. Seventy-five years of forming hearts and minds in faith. Seventy-five years of a Catholic community that keeps saying yes to God's call. And seventy-five years of students just like you, carrying that mission forward. Happy Fiesta, HCDC!</p>
          <p>As our own way of joining the celebration, <strong>The Sanctuarium — all five Vault Games — opens tomorrow!</strong> Step into the Scriptorium, feed the crowd in Loaves and Fishes, keep the watch in The Vigil, climb toward the light in Illumination, and carry the Cross in The Evangelization. Play them, and you'll do more than earn tickets and treasures — you'll learn more of your faith, discover truths worth keeping, and walk a little closer with God along the way. See you in the Vault!</p>
          <button type="button" class="fiesta-skip-btn">Skip</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.fiesta-skip-btn').addEventListener('click', () => {
      overlay.remove();
      if (isAdmin) {
        localStorage.setItem(ADMIN_SEEN_KEY, 'true');
      } else {
        updateDoc(doc(db, 'students', email), { hasSeenFiesta75Announcement: true }).catch((err) => {
          console.error('Failed to save Fiesta announcement dismissal:', err);
        });
      }
      resolve();
    });
  });
}
