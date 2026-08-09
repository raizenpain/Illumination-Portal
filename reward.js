import { db, doc, getDoc, setDoc } from './firebase.js';

const email = localStorage.getItem('studentEmail');
const name = localStorage.getItem('studentName');

if (!email) {
window.location.href = 'login.html';
}

const params = new URLSearchParams(window.location.search);
const piece = parseInt(params.get('piece'));

const message = document.getElementById('rewardMessage');

async function awardPiece() {
const settingsRef = doc(db, 'settings', 'puzzle1');
const settingsSnap = await getDoc(settingsRef);

const released = settingsSnap.exists()
? settingsSnap.data().released || []
: [];

if (!released.includes(piece)) {
message.textContent =
`Piece ${piece} has not been released by Jornie yet.`;
return;
}

const studentRef = doc(db, 'students', email);
const studentSnap = await getDoc(studentRef);

let puzzle1 = [];

if (studentSnap.exists()) {
puzzle1 = studentSnap.data().puzzle1 || [];
}

if (!puzzle1.includes(piece)) {
puzzle1.push(piece);
}

await setDoc(studentRef, {
name,
email,
puzzle1
}, { merge: true });

message.textContent =
`Congratulations! You collected Piece ${piece}!`;
}

awardPiece();
