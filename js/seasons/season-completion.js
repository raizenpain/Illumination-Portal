// ============================================
// SEASON / ACHIEVEMENT CERTIFICATE — season-completion.html?season=KEY
// for KEY = prelim | vault | midterm | semifinal | final. Everything
// about each certificate (title, wording, colour, code) comes from
// certificates.js; the puzzle certificates use completion.html.
//
// Verification code generated once and stored, QR code, PDF download.
// Only shows a certificate the student has earned, and the issue date is
// saved once so re-opening it later (from the dashboard's "My
// Certificates") shows when it was earned, not today.
// ============================================

import { db, doc, getDoc, setDoc } from '../core/firebase.js';
import { enforcePrelimLockout } from '../core/prelimDeadline.js';
import { enforceCooldown } from '../core/cooldown.js';
import { certificateByKey, isCertificateEarned, certificateDate, formatCertificateDate } from '../core/certificates.js';

const email = localStorage.getItem('studentEmail');
const name = localStorage.getItem('studentName');
enforcePrelimLockout(email);
enforceCooldown(email);

if (!email) {
  window.location.href = 'login.html';
}

const cert = certificateByKey(new URLSearchParams(window.location.search).get('season'));

// Rising embers behind the dark fantasy certificate (outside #certificate,
// so they never end up in the PDF).
const embers = document.querySelector('.cert-embers');
if (embers) {
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.style.cssText = `--x:${Math.random() * 100}%;--s:${3 + Math.random() * 5}px;--d:${7 + Math.random() * 8}s;--delay:${-Math.random() * 12}s;--drift:${(Math.random() - 0.5) * 120}px`;
    embers.appendChild(s);
  }
}

const studentRef = doc(db, 'students', email);

if (!cert || cert.kind === 'puzzle') {
  window.location.href = cert ? cert.url : 'dashboard.html';
} else {
  document.getElementById('certificate').dataset.theme = cert.theme;
  const sealEl = document.getElementById('certificateSeal');
  if (cert.sealImage) {
    // The season's rune stone; falls back to the emoji if it can't load.
    const img = document.createElement('img');
    img.alt = '';
    img.onerror = () => { sealEl.classList.remove('has-image'); sealEl.textContent = cert.seal; };
    img.src = cert.sealImage;
    sealEl.classList.add('has-image');
    sealEl.replaceChildren(img);
  } else {
    sealEl.textContent = cert.seal;
  }
  document.getElementById('certTitle').textContent = cert.certTitle;
  document.getElementById('seasonTitle').textContent = cert.title;
  document.getElementById('seasonSubtitleText').textContent = `— ${cert.subtitle} —`;
  document.getElementById('certLine').textContent = cert.line;
  loadCertificate();
}

async function loadCertificate() {
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
      filename: `HCDC_${cert.title.replace(/^The\s+/, '').replace(/\s+/g, '_')}_Certificate.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    })
    .from(document.getElementById('certificate'))
    .save();
};
