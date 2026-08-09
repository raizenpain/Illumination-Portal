import { db, doc, getDoc, setDoc } from './firebase.js';

const email = localStorage.getItem('studentEmail');
const name = localStorage.getItem('studentName');

if (!email) {
window.location.href = 'login.html';
}

const studentRef = doc(db, 'students', email);

async function loadCertificate() {
const snap = await getDoc(studentRef);

if (!snap.exists()) {
window.location.href = 'dashboard.html';
}

const data = snap.data();

let verificationCode = data.verificationCode;

if (!verificationCode) {
verificationCode =
`HCDC-P1-${Math.random().toString(36).substring(2,8).toUpperCase()}`;

await setDoc(studentRef, {
  verificationCode
}, { merge: true });

}

document.getElementById('studentName').textContent = name;
document.getElementById('studentEmail').textContent = email;

document.getElementById('completionDate').textContent =
new Date().toLocaleString();

document.getElementById('verificationCode').textContent =
verificationCode;

// Generate QR Code
const qr = document.createElement('img');
qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${verificationCode}`;
document.getElementById('qrContainer').appendChild(qr);
}

loadCertificate();

document.getElementById('classroomBtn').onclick = () => {
window.open(
'https://classroom.google.com/',
'_blank'
);
};
document.getElementById('dashboardBtn').onclick = () => {
window.location.href = 'dashboard.html';
};
document.getElementById('downloadBtn').onclick = () => {
  const element = document.querySelector('.certificate');

  html2pdf()
    .set({
      margin: 0.5,
      filename: 'HCDC_Puzzle1_Certificate.pdf',
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    })
    .from(element)
    .save();
};