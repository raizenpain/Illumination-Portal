import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  arrayUnion,
  arrayRemove
} from './firebase.js';
import { requireAdmin } from './auth.js';
import { PUZZLE_CONFIG } from './puzzles.js';
import { PIECE_CODES } from './codes.js';
import { ADMIN_EMAILS } from './admins.js';

const user = requireAdmin(ADMIN_EMAILS);

if (user) {
  const { email, name } = user;

  const teacherInfo = document.getElementById('teacherInfo');
  if (teacherInfo) {
    teacherInfo.textContent = `${name} (${email})`;
  }

  const tabsContainer = document.getElementById('puzzleTabs');
  const container = document.getElementById('releaseButtons');

  let activePuzzle = 1;

  function renderTabs() {
    tabsContainer.innerHTML = '';

    Object.keys(PUZZLE_CONFIG).forEach((num) => {
      const puzzleNumber = parseInt(num);
      const config = PUZZLE_CONFIG[puzzleNumber];

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'puzzle-tab' + (puzzleNumber === activePuzzle ? ' active' : '');
      tab.textContent = `${config.title} — ${config.subtitle}`;
      tab.onclick = () => {
        activePuzzle = puzzleNumber;
        renderTabs();
        loadReleasedPieces();
      };

      tabsContainer.appendChild(tab);
    });
  }

  async function loadReleasedPieces() {
    const config = PUZZLE_CONFIG[activePuzzle];
    const ref = doc(db, 'settings', `puzzle${activePuzzle}`);
    const snap = await getDoc(ref);

    let released = [];

    if (snap.exists()) {
      released = snap.data().released || [];
    }

    container.innerHTML = '';

    for (let i = 1; i <= config.totalPieces; i++) {
      const btn = document.createElement('button');

      const code = (PIECE_CODES[`puzzle${activePuzzle}`] || {})[i];

      if (released.includes(i)) {
        btn.textContent = code ? `✓ Piece ${i} — ${code}` : `Piece ${i} Released — click to unrelease`;
        btn.classList.add('released');
        btn.onclick = async () => {
          if (!confirm(`Unrelease Piece ${i}? Students will no longer be able to upload it, but anyone who already collected it keeps it.`)) {
            return;
          }

          await setDoc(ref, {
            released: arrayRemove(i)
          }, { merge: true });

          loadReleasedPieces();
        };
      } else {
        btn.textContent = code ? `Release Piece ${i} — ${code}` : `Release Piece ${i}`;
        btn.onclick = async () => {
          await setDoc(ref, {
            released: arrayUnion(i)
          }, { merge: true });

          loadReleasedPieces();
        };
      }

      container.appendChild(btn);
    }
  }

  async function loadStudents() {
    const tableBody = document.querySelector('#studentTable tbody');
    if (!tableBody) return;

    try {
      const snapshot = await getDocs(collection(db, 'students'));

      tableBody.innerHTML = '';

      const progressPill = (count, completed) => {
        const state = completed ? 'complete' : count > 0 ? 'in-progress' : '';
        const label = `${count}/9${completed ? ' ✅' : ''}`;
        return `<span class="progress-pill${state ? ' ' + state : ''}">${label}</span>`;
      };

      snapshot.forEach((student) => {
        const data = student.data();

        const p1 = data.puzzle1 ? data.puzzle1.length : 0;
        const p2 = data.puzzle2 ? data.puzzle2.length : 0;
        const p3 = data.puzzle3 ? data.puzzle3.length : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${data.name || ''}</td>
          <td>${data.email || ''}</td>
          <td>${progressPill(p1, data.puzzle1Completed)}</td>
          <td>${progressPill(p2, data.puzzle2Completed)}</td>
          <td>${progressPill(p3, data.puzzle3Completed)}</td>
          <td><span class="rank-chip" data-rank="${data.rank || 'Seeker'}">${data.rank || 'Seeker'}</span></td>
        `;

        tableBody.appendChild(row);
      });

    } catch (err) {
      console.error('Failed to load students:', err);
      tableBody.innerHTML = '<tr><td colspan="6">Failed to load student data.</td></tr>';
    }
  }

  renderTabs();
  loadReleasedPieces();
  loadStudents();
}