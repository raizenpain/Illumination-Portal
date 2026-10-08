// ============================================
// PUZZLE COMPLETION CERTIFICATE — completion.html?puzzle=1|2|3
// Dark fantasy design shared with season-completion.html (2026-10-05).
// Before this, every puzzle's certificate said "Puzzle 1" and shared
// one verification code. Now each puzzle has its own title, code and
// PDF name; Puzzle 1 keeps the original `verificationCode` field so
// codes students already submitted stay valid.
//
// Only shows a certificate the student has earned (certificates.js);
// the issue date is saved once, so re-opening it later (from the
// dashboard's "My Certificates") shows the real date.
// ============================================

import { db, doc, getDoc, setDoc } from './firebase.js';
import { enforcePrelimLockout } from './prelimDeadline.js';
import { enforceCooldown } from './cooldown.js';
import { certificateByKey, isCertificateEarned, certificateDate, formatCertificateDate } from './certificates.js';

const email = localStorage.getItem('studentEmail');
const name = localStorage.getItem('studentName');
enforcePrelimLockout(email);
enforceCooldown(email);

if (!email) {
  window.location.href = 'login.html';
}

const puzzleNumber = Number(new URLSearchParams(window.location.search).get('puzzle')) || 1;
const cert = certificateByKey(`puzzle${puzzleNumber}`);

// Rising embers behind the certificate (outside #certificate, so they
// never end up in the PDF).
const embers = document.querySelector('.cert-embers');
if (embers) {
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.style.cssText = `--x:${Math.random() * 100}%;--s:${3 + Math.random() * 5}px;--d:${7 + Math.random() * 8}s;--delay:${-Math.random() * 12}s;--drift:${(Math.random() - 0.5) * 120}px`;
    embers.appendChild(s);
  }
}

const studentRef = doc(db, 'students', email);

async function loadCertificate() {
  if (!cert) {
    window.location.href = 'dashboard.html';
    return;
  }
  const snap = await getDoc(studentRef);
  if (!snap.exists()) {
    window.location.href = 'dashboard.html';
    return;
  }
  const data = snap.data();
  if (!isCertificateEarned(cert, data)) {
    window.location.href = 'dashboard.html';
    return;
  }

  document.getElementById('certificateSeal').textContent = cert.seal;
  document.getElementById('seasonTitle').textContent = cert.title;
  document.getElementById('seasonSubtitleText').textContent = `— ${cert.subtitle} —`;

  let verificationCode = data[cert.codeField];
  let issued = certificateDate(cert, data);
  const updates = {};
  if (!verificationCode) {
    verificationCode = `HCDC-${cert.codePrefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    updates[cert.codeField] = verificationCode;
  }
  if (!issued) {
    issued = new Date();
    updates.certificateDates = { [cert.key]: issued.toISOString() };
  }
  if (Object.keys(updates).length) {
    await setDoc(studentRef, updates, { merge: true });
  }

  const teacherName = data.teacherName || 'Jornie Hinay';
  document.getElementById('studentName').textContent = data.name || name;
  document.getElementById('studentEmail').textContent = email;
  document.getElementById('completionDate').textContent = formatCertificateDate(issued);
  document.getElementById('verificationCode').textContent = verificationCode;
  document.getElementById('instructorName').textContent = teacherName;
  document.getElementById('signatureName').textContent = teacherName;

  const qr = document.createElement('img');
  qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${verificationCode}`;
  qr.alt = `QR code for verification code ${verificationCode}`;
  document.getElementById('qrContainer').appendChild(qr);
}

loadCertificate();

document.getElementById('classroomBtn').onclick = () => {
  window.open('https://classroom.google.com/', '_blank');
};

document.getElementById('dashboardBtn').onclick = () => {
  window.location.href = 'dashboard.html';
};

document.getElementById('downloadBtn').onclick = () => {
  if (!cert) return;
  html2pdf()
    .set({
      margin: 0.5,
      filename: `HCDC_Puzzle${puzzleNumber}_${cert.subtitle.replace(/^The\s+/, '').replace(/\s+/g, '_')}_Certificate.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    })
    .from(document.getElementById('certificate'))
    .save();
};
