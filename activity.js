// ============================================
// COMMUNITY ACTIVITY LOG
// Records a public, name-only line in the shared
// "activities" feed shown on everyone's dashboard.
// Never throws — a failed log must never block the
// real piece unlock / puzzle completion / challenge pass
// that triggered it.
// ============================================

import { db, addDoc, collection, serverTimestamp } from './firebase.js';
import { ADMIN_EMAILS } from './admins.js';

export async function logActivity({ email, name, type, title, icon }) {
  // A teacher playing through the portal to test it is not class news:
  // nothing an admin account does is posted to Community Activity.
  if (ADMIN_EMAILS.includes(email)) return;
  try {
    await addDoc(collection(db, 'activities'), {
      userId: email,
      studentName: name,
      type,
      title,
      icon,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn('Failed to log community activity:', err);
  }
}
