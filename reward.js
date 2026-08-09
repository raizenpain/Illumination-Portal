import { functions, httpsCallable } from './firebase.js';

const email = localStorage.getItem('studentEmail');

if (!email) {
window.location.href = 'login.html';
}

const params = new URLSearchParams(window.location.search);
const piece = parseInt(params.get('piece'));

const message = document.getElementById('rewardMessage');

async function awardPiece() {
try {
const claimPuzzlePiece = httpsCallable(functions, 'claimPuzzlePiece');
const result = await claimPuzzlePiece({ puzzleNumber: 1, pieceNumber: piece });

message.textContent = result.data.alreadyHad
? `You've already collected Piece ${piece}.`
: `Congratulations! You collected Piece ${piece}!`;

} catch (err) {
console.error('Failed to claim piece:', err);
message.textContent = err.message || `Piece ${piece} has not been released by Jornie yet.`;
}
}

awardPiece();
