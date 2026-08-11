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
import { ADMIN_EMAILS, ADMINS } from './admins.js';

const UNASSIGNED_KEY = '__unassigned__';

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

  // ================================
  // ROSTER — Teacher -> Class -> Roster drill-down
  // ================================

  const rosterSubtitle = document.getElementById('rosterSubtitle');
  const teacherListView = document.getElementById('teacherListView');
  const classListView = document.getElementById('classListView');
  const classListGrid = document.getElementById('classListGrid');
  const rosterView = document.getElementById('rosterView');
  const backToTeachersBtn = document.getElementById('backToTeachers');
  const backToClassesBtn = document.getElementById('backToClasses');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  let teacherGroups = {}; // { teacherEmail: { name, bySection: { section: [studentData] } } }
  let currentTeacher = null; // { email, name }
  let currentSection = null;

  function progressPill(count, completed) {
    const state = completed ? 'complete' : count > 0 ? 'in-progress' : '';
    const label = `${count}/9${completed ? ' ✅' : ''}`;
    return `<span class="progress-pill${state ? ' ' + state : ''}">${label}</span>`;
  }

  function progressText(count, completed) {
    return completed ? `${count}/9 (Completed)` : `${count}/9`;
  }

  function pieceCount(data, field) {
    return data[field] ? data[field].length : 0;
  }

  async function loadStudents() {
    if (!teacherListView) return;

    try {
      const snapshot = await getDocs(collection(db, 'students'));

      teacherGroups = {};
      ADMINS.forEach((admin) => {
        teacherGroups[admin.email] = { name: admin.name, bySection: {} };
      });
      teacherGroups[UNASSIGNED_KEY] = { name: 'Unassigned', bySection: {} };

      snapshot.forEach((student) => {
        const data = student.data();
        const teacherEmail = data.teacherEmail && teacherGroups[data.teacherEmail]
          ? data.teacherEmail
          : UNASSIGNED_KEY;
        const section = data.section || 'No class offering selected';

        const group = teacherGroups[teacherEmail];
        if (!group.bySection[section]) group.bySection[section] = [];
        group.bySection[section].push(data);
      });

      renderTeacherListView();

    } catch (err) {
      console.error('Failed to load students:', err);
      teacherListView.innerHTML = '<p>Failed to load student data.</p>';
    }
  }

  function teacherStudentCount(group) {
    return Object.values(group.bySection).reduce((sum, list) => sum + list.length, 0);
  }

  function renderTeacherListView() {
    rosterSubtitle.textContent = 'Choose a teacher to view their classes.';
    teacherListView.innerHTML = '';
    classListView.classList.add('hidden');
    rosterView.classList.add('hidden');
    teacherListView.classList.remove('hidden');

    [...ADMINS.map((a) => a.email), UNASSIGNED_KEY].forEach((teacherEmail) => {
      const group = teacherGroups[teacherEmail];
      const count = teacherStudentCount(group);

      if (teacherEmail === UNASSIGNED_KEY && count === 0) return;

      const card = document.createElement('div');
      card.className = 'roster-nav-card';
      card.innerHTML = `
        <h3>${group.name}</h3>
        <p>${count} seeker${count === 1 ? '' : 's'}</p>
      `;
      card.onclick = () => showClassList(teacherEmail);
      teacherListView.appendChild(card);
    });
  }

  function showClassList(teacherEmail) {
    const group = teacherGroups[teacherEmail];
    currentTeacher = { email: teacherEmail, name: group.name };

    rosterSubtitle.textContent = `Choose a class for ${group.name}.`;
    teacherListView.classList.add('hidden');
    rosterView.classList.add('hidden');
    classListView.classList.remove('hidden');

    classListGrid.innerHTML = '';

    const sections = Object.keys(group.bySection).sort();

    if (sections.length === 0) {
      classListGrid.innerHTML = '<p>No students yet.</p>';
      return;
    }

    sections.forEach((section) => {
      const list = group.bySection[section];
      const card = document.createElement('div');
      card.className = 'roster-nav-card';
      card.innerHTML = `
        <h3>${section}</h3>
        <p>${list.length} seeker${list.length === 1 ? '' : 's'}</p>
      `;
      card.onclick = () => showRoster(section);
      classListGrid.appendChild(card);
    });
  }

  function showRoster(section) {
    currentSection = section;
    const students = teacherGroups[currentTeacher.email].bySection[section] || [];

    rosterSubtitle.textContent = `${currentTeacher.name} — ${section} (${students.length} seeker${students.length === 1 ? '' : 's'})`;
    classListView.classList.add('hidden');
    rosterView.classList.remove('hidden');

    const tableBody = document.querySelector('#studentTable tbody');
    tableBody.innerHTML = '';

    students.forEach((data) => {
      const p1 = pieceCount(data, 'puzzle1');
      const p2 = pieceCount(data, 'puzzle2');
      const p3 = pieceCount(data, 'puzzle3');

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
  }

  // ================================
  // CSV EXPORT — current class only
  // ================================

  function sanitizeFilename(str) {
    return str.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  }

  function csvCell(value) {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }

  function buildCsv(students) {
    const header = ['Name', 'Email', 'Puzzle 1', 'Puzzle 2', 'Puzzle 3', 'Rank'];

    const rows = students.map((data) => [
      data.name || '',
      data.email || '',
      progressText(pieceCount(data, 'puzzle1'), data.puzzle1Completed),
      progressText(pieceCount(data, 'puzzle2'), data.puzzle2Completed),
      progressText(pieceCount(data, 'puzzle3'), data.puzzle3Completed),
      data.rank || 'Seeker'
    ]);

    return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  }

  function downloadCsv(filename, csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  if (backToTeachersBtn) {
    backToTeachersBtn.onclick = renderTeacherListView;
  }

  if (backToClassesBtn) {
    backToClassesBtn.onclick = () => showClassList(currentTeacher.email);
  }

  if (exportCsvBtn) {
    exportCsvBtn.onclick = () => {
      const students = teacherGroups[currentTeacher.email].bySection[currentSection] || [];
      const filename = `${sanitizeFilename(currentTeacher.name)}_${sanitizeFilename(currentSection)}.csv`;
      downloadCsv(filename, buildCsv(students));
    };
  }

  renderTabs();
  loadReleasedPieces();
  loadStudents();
}