// ============================================
// DAILY CLASS GREETING — one system-styled encouragement message
// posted automatically into each class's chat room per calendar day
// (Philippine time). This app has no backend/cron, so this is
// triggered client-side by whichever student or teacher opens that
// room's chat first that day. A transaction on a small per-room
// tracking doc (classChatGreetings) guards against two people opening
// the room around the same moment both posting it twice.
//
// The message is still attributed to whoever's account actually
// triggered it (firestore.rules requires senderEmail == the real
// caller) -- but it carries type:'greeting', which classChat.js and
// teacher.js both use to render it as a system-styled bubble instead
// of showing that real (effectively random) sender's name.
// ============================================

import { db, doc, addDoc, collection, runTransaction, serverTimestamp } from './firebase.js';

const MESSAGES = [
  "🌞 Good morning! Whatever today brings, you don't have to carry it alone — one step, one prayer, one puzzle piece at a time.",
  "✨ Small effort today still counts as real progress. Proud of you for showing up.",
  "🙏 A little reminder before your day gets busy: you are known, and you are enough.",
  "🔥 Today's a good day to try again on something that felt hard yesterday. You've got this.",
  "💛 However your day is going, remember — grace doesn't wait for you to get it all right first.",
  "🌱 Growth is quiet most days. Keep going, even when it doesn't feel like much is happening.",
  "📖 Take one good thought with you today — even five minutes of quiet can reset the whole day.",
  "🕊️ Peace isn't the absence of a busy day — it's knowing Who's walking through it with you.",
  "🌟 You don't need to have today figured out by 8am. Just take the next right step.",
  "🤝 If today's hard, that's allowed. Ask for help, lean on a classmate, and keep moving.",
  "💪 Discipline today is a gift to who you'll be tomorrow. Small consistent steps win.",
  "🌤️ However today unfolds, it's not wasted — every effort here is forming something in you."
];

function todayPH() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function messageForDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  return MESSAGES[hash % MESSAGES.length];
}

// Fire-and-forget: safe to call every time a class chat room is
// opened. Does nothing on every call except the first one that day,
// for that room.
export function maybePostDailyGreeting({ teacherEmail, section, email, name }) {
  if (!teacherEmail || !section) return;

  const today = todayPH();
  const roomRef = doc(db, 'classChatGreetings', `${teacherEmail}__${section}`);

  runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef);
    const live = snap.exists() ? snap.data() : {};
    if (live.lastDate === today) return false;
    tx.set(roomRef, { teacherEmail, section, lastDate: today });
    return true;
  }).then((posted) => {
    if (!posted) return;
    return addDoc(collection(db, 'classChatMessages'), {
      senderEmail: email,
      senderName: name,
      teacherEmail,
      section,
      text: messageForDate(today),
      type: 'greeting',
      timestamp: serverTimestamp(),
      reported: false
    });
  }).catch((err) => {
    console.error('Failed to post daily class greeting:', err);
  });
}
