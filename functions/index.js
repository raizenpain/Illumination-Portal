const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { CHALLENGES } = require('./questions');
const { PUZZLE_CONFIG } = require('./puzzles');

initializeApp();
const db = getFirestore();

const GATE_FIELDS = { puzzle2: 'puzzle2Unlocked', puzzle3: 'puzzle3Unlocked' };

function requireStudentAuth(request) {
  const email = request.auth && request.auth.token && request.auth.token.email;
  if (!email) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  if (!email.endsWith('@hcdc.edu.ph')) {
    throw new HttpsError('permission-denied', 'HCDC account required.');
  }
  return email;
}

// Creates the student's Firestore profile, or updates just the section if
// they already have one. All progress fields (rank, achievements, puzzle
// pieces, completion flags) are only ever set here or in the functions
// below — never by client code — so they can't be forged from devtools.
exports.enrollStudent = onCall(async (request) => {
  const email = requireStudentAuth(request);
  const { section, name } = request.data || {};

  if (!section || typeof section !== 'string') {
    throw new HttpsError('invalid-argument', 'Section is required.');
  }

  const studentRef = db.collection('students').doc(email);
  const snap = await studentRef.get();

  if (snap.exists) {
    await studentRef.set({ section }, { merge: true });
    return { studentId: snap.data().studentId, alreadyEnrolled: true };
  }

  const random = Math.floor(1000 + Math.random() * 9000);
  const studentId = `HCDC-REED-2026-${random}`;

  await studentRef.set({
    name: name || '',
    email,
    section,
    studentId,
    rank: 'Seeker',
    achievements: [],
    totalPieces: 0,
    puzzle1: [],
    puzzle1Completed: false,
    createdAt: new Date().toISOString()
  });

  return { studentId, alreadyEnrolled: false };
});

// Grades a challenge-gate quiz server-side (the correct answers never reach
// the client) and unlocks the next puzzle only if every answer is correct.
exports.submitChallengeAnswers = onCall(async (request) => {
  const email = requireStudentAuth(request);
  const { gate, answers } = request.data || {};

  const questions = CHALLENGES[gate];
  const gateField = GATE_FIELDS[gate];

  if (!questions || !gateField) {
    throw new HttpsError('invalid-argument', 'Unknown challenge gate.');
  }
  if (!Array.isArray(answers) || answers.length !== questions.length) {
    throw new HttpsError('invalid-argument', 'Answers do not match the question count.');
  }

  const allCorrect = questions.every((q, i) => Number(answers[i]) === q.correctIndex);

  if (!allCorrect) {
    return { correct: false };
  }

  await db.collection('students').doc(email).set({ [gateField]: true }, { merge: true });

  return { correct: true };
});

// Records a puzzle piece as collected, after re-checking (server-side) that
// the piece was actually released and, for gated puzzles, that the student
// has already cleared the challenge quiz. Also computes achievement/
// completion/rank updates so the client never gets to set those directly.
exports.claimPuzzlePiece = onCall(async (request) => {
  const email = requireStudentAuth(request);
  const { puzzleNumber, pieceNumber } = request.data || {};

  const config = PUZZLE_CONFIG[puzzleNumber];
  if (!config) {
    throw new HttpsError('invalid-argument', 'Unknown puzzle.');
  }
  if (!Number.isInteger(pieceNumber) || pieceNumber < 1 || pieceNumber > config.totalPieces) {
    throw new HttpsError('invalid-argument', 'Invalid piece number.');
  }

  const studentRef = db.collection('students').doc(email);
  const settingsRef = db.collection('settings').doc(`puzzle${puzzleNumber}`);

  return db.runTransaction(async (tx) => {
    const [studentSnap, settingsSnap] = await Promise.all([
      tx.get(studentRef),
      tx.get(settingsRef)
    ]);

    const released = settingsSnap.exists ? (settingsSnap.data().released || []) : [];
    if (!released.includes(pieceNumber)) {
      throw new HttpsError('failed-precondition', 'This piece has not been released yet.');
    }

    const data = studentSnap.exists ? studentSnap.data() : {};

    if (config.requiresGate && !data[config.requiresGate]) {
      throw new HttpsError('failed-precondition', 'Complete the challenge gate first.');
    }

    const pieces = new Set(data[config.piecesField] || []);
    const alreadyHad = pieces.has(pieceNumber);
    pieces.add(pieceNumber);
    const piecesArr = Array.from(pieces).sort((a, b) => a - b);

    const achievements = new Set(data.achievements || []);
    const newAchievements = [];

    for (const milestone of config.milestoneAchievements || []) {
      if (piecesArr.length >= milestone.count && !achievements.has(milestone.id)) {
        achievements.add(milestone.id);
        newAchievements.push(milestone);
      }
    }

    const update = {
      [config.piecesField]: piecesArr,
      achievements: Array.from(achievements)
    };

    let completed = false;
    if (piecesArr.length === config.totalPieces && !data[config.completedField]) {
      completed = true;
      update[config.completedField] = true;
      update.rank = config.completionAchievement.rank;
      if (!achievements.has(config.completionAchievement.id)) {
        achievements.add(config.completionAchievement.id);
        update.achievements = Array.from(achievements);
        newAchievements.push(config.completionAchievement);
      }
    }

    tx.set(studentRef, update, { merge: true });

    return { alreadyHad, newAchievements, completed };
  });
});
