// ============================================
// SEASON COMPLETION CERTIFICATE
// Mirrors completion.js's exact pattern (verification code generated
// once and stored, QR code, PDF download) — just parameterized by
// ?season= and themed per season instead of hardcoded to Puzzle 1.
// ============================================

import { db, doc, getDoc, setDoc } from './firebase.js';
import { SEASON_CONTENT } from './seasonContent.js';

const email = localStorage.getItem('studentEmail');
const name = localStorage.getItem('studentName');

if (!email) {
  window.location.href = 'login.html';
}

const params = new URLSearchParams(window.location.search);
const seasonId = params.get('season');
const season = SEASON_CONTENT[seasonId];

const SEASON_CODE = { midterm: 'MID', semifinal: 'SEM', final: 'FIN' };
const SEASON_SEAL = { midterm: '🌅', semifinal: '🌑', final: '🌄' };

if (!season) {
  window.location.href = 'dashboard.html';
} else {
  document.getElementById('certificate').dataset.theme = seasonId;
  document.getElementById('certificateSeal').textContent = SEASON_SEAL[seasonId] || '🏅';
  document.getElementById('certTitle').textContent = `Certificate of ${season.seasonName} Completion`;
  document.getElementById('seasonTitle').textContent = season.seasonName;
  document.getElementById('seasonSubtitleText').textContent = `— ${season.subtitle} —`;
  loadCertificate();
}

const studentRef = doc(db, 'students', email);

async function loadCertificate() {
  const snap = await getDoc(studentRef);

  if (!snap.exists()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const data = snap.data();
  const codeField = `${seasonId}VerificationCode`;

  let verificationCode = data[codeField];

  if (!verificationCode) {
    verificationCode = `HCDC-${SEASON_CODE[seasonId]}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await setDoc(studentRef, { [codeField]: verificationCode }, { merge: true });
  }

  const teacherName = data.teacherName || 'Jornie Hinay';

  document.getElementById('studentName').textContent = data.name || name;
  document.getElementById('studentEmail').textContent = email;
  document.getElementById('completionDate').textContent = new Date().toLocaleString();
  document.getElementById('verificationCode').textContent = verificationCode;
  document.getElementById('instructorName').textContent = teacherName;
  document.getElementById('signatureName').textContent = teacherName;

  const qr = document.createElement('img');
  qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${verificationCode}`;
  document.getElementById('qrContainer').appendChild(qr);
}

document.getElementById('classroomBtn').onclick = () => {
  window.open('https://classroom.google.com/', '_blank');
};

document.getElementById('dashboardBtn').onclick = () => {
  window.location.href = 'dashboard.html';
};

document.getElementById('downloadBtn').onclick = () => {
  const element = document.getElementById('certificate');

  html2pdf()
    .set({
      margin: 0.5,
      filename: `HCDC_${season.seasonName.replace(/\s+/g, '_')}_Certificate.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    })
    .from(element)
    .save();
};
