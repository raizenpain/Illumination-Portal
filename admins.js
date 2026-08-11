// ============================================
// ADMIN LIST
// Anyone on this list gets Dungeon Master access.
// Keep firestore.rules' isAdmin() list in sync with this —
// Firestore rules can't import this file directly.
// ============================================

export const ADMINS = [
  { email: 'jornie.hinay@hcdc.edu.ph', name: 'Prof. Jornie Joy Hinay' },
  { email: 'iris.miranda@hcdc.edu.ph', name: 'Prof. Iris Miranda' }
];

export const ADMIN_EMAILS = ADMINS.map((admin) => admin.email);
