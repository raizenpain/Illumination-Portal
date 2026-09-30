import { enforcePrelimLockout } from './prelimDeadline.js';

export function requireLogin() {
  const email = localStorage.getItem('studentEmail');
  const name = localStorage.getItem('studentName');

  if (!email) {
    window.location.href = 'login.html';
    return null;
  }

  // Every student page comes through here, so this is the one place
  // the Prelim lockout needs to hook in (admins are skipped inside).
  enforcePrelimLockout(email);

  return { email, name };
}

export function requireAdmin(adminEmails) {
  const user = requireLogin();
  if (!user) return null;

  if (!adminEmails.includes(user.email)) {
    alert('Access denied.');
    window.location.href = 'dashboard.html';
    return null;
  }

  return user;
}
