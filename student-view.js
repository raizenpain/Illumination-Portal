// ============================================
// STUDENT REVIEW (Dungeon Master console)
// Read-only summary of a single student — profile, Prelim + Season
// progress, and every written submission (Prelim reflection +
// journal/recitation node responses) in one place, so an admin can
// actually read what a student wrote without touching their data.
// Reached by clicking a student row in the roster (teacher.js).
// ============================================

import { db, doc, getDoc } from './firebase.js';
import { requireAdmin } from './auth.js';
import { ADMIN_EMAILS } from './admins.js';
import { PUZZLE_CONFIG } from './puzzles.js';
import { SEASON_CONTENT } from './seasonContent.js';

const user = requireAdmin(ADMIN_EMAILS);

if (user) {
  const params = new URLSearchParams(window.location.search);
  const studentEmail = params.get('student');

  if (!studentEmail) {
    window.location.href = 'teacher.html';
  } else {
    loadStudent(studentEmail);
  }
}

async function loadStudent(studentEmail) {
  const headerInfo = document.getElementById('studentHeaderInfo');

  try {
    const snap = await getDoc(doc(db, 'students', studentEmail));

    if (!snap.exists()) {
      headerInfo.textContent = 'Student not found.';
      return;
    }

    const data = snap.data();
    headerInfo.textContent = `${data.name || studentEmail} (${studentEmail})`;

    renderProfile(data, studentEmail);
    renderPrelimProgress(data);
    renderSeasonProgress(data);
    renderSubmissions(data);

  } catch (err) {
    console.error('Failed to load student:', err);
    headerInfo.textContent = 'Failed to load this student.';
  }
}

function renderProfile(data, studentEmail) {
  const grid = document.getElementById('profileGrid');

  const rows = [
    ['Name', data.name || '—'],
    ['Email', studentEmail],
    ['Student ID', data.studentId || '—'],
    ['Section', data.section || '—'],
    ['Teacher', data.teacherName || '—'],
    ['Rank', data.rank || 'Seeker']
  ];

  grid.innerHTML = '';

  rows.forEach(([label, value]) => {
    const field = document.createElement('div');
    field.className = 'student-view-field';

    const labelEl = document.createElement('span');
    labelEl.className = 'student-view-field-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'student-view-field-value';
    valueEl.textContent = value;

    field.appendChild(labelEl);
    field.appendChild(valueEl);
    grid.appendChild(field);
  });
}

function progressPillClass(count, total) {
  if (count >= total && total > 0) return 'progress-pill complete';
  if (count > 0) return 'progress-pill in-progress';
  return 'progress-pill';
}

function renderPrelimProgress(data) {
  const container = document.getElementById('prelimProgress');
  container.innerHTML = '';

  Object.keys(PUZZLE_CONFIG).forEach((num) => {
    const config = PUZZLE_CONFIG[num];
    const count = (data[config.piecesField] || []).length;
    const completed = !!data[config.completedField];

    const row = document.createElement('div');
    row.className = 'student-view-progress-row';

    const label = document.createElement('span');
    label.textContent = `${config.title} — ${config.subtitle}`;

    const pill = document.createElement('span');
    pill.className = progressPillClass(count, config.totalPieces);
    pill.textContent = `${count}/${config.totalPieces}${completed ? ' ✅' : ''}`;

    row.appendChild(label);
    row.appendChild(pill);
    container.appendChild(row);
  });
}

function renderSeasonProgress(data) {
  const container = document.getElementById('seasonProgress');
  container.innerHTML = '';

  const completedNodes = data.completedNodes || {};

  Object.values(SEASON_CONTENT).forEach((season) => {
    const totalNodes = season.chapters.reduce((sum, ch) => sum + ch.nodes.length, 0);
    const doneNodes = season.chapters.reduce(
      (sum, ch) => sum + ch.nodes.filter((n) => completedNodes[n.nodeId]).length,
      0
    );

    const row = document.createElement('div');
    row.className = 'student-view-progress-row';

    const label = document.createElement('span');
    label.textContent = `${season.seasonName} — ${season.subtitle}`;

    const pill = document.createElement('span');
    pill.className = progressPillClass(doneNodes, totalNodes);
    pill.textContent = `${doneNodes}/${totalNodes}`;

    row.appendChild(label);
    row.appendChild(pill);
    container.appendChild(row);
  });
}

function findNode(nodeId) {
  for (const season of Object.values(SEASON_CONTENT)) {
    for (const chapter of season.chapters) {
      const node = chapter.nodes.find((n) => n.nodeId === nodeId);
      if (node) return { node, chapter, season };
    }
  }
  return null;
}

function renderSubmissions(data) {
  const container = document.getElementById('submissionsList');
  container.innerHTML = '';

  const items = [];

  if (data.puzzle3Reflection) {
    items.push({
      title: 'Prelim Reflection',
      meta: data.puzzle3ReflectionSubmittedAt ? new Date(data.puzzle3ReflectionSubmittedAt).toLocaleDateString() : '',
      text: data.puzzle3Reflection
    });
  }

  Object.entries(data.nodeSubmissions || {}).forEach(([nodeId, text]) => {
    const found = findNode(nodeId);
    items.push({
      title: found ? found.node.title : nodeId,
      meta: found ? `${found.season.seasonName} — ${found.chapter.chapterTitle}` : '',
      text
    });
  });

  if (items.length === 0) {
    container.innerHTML = '<p>No written submissions yet.</p>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'student-view-submission-card';

    const header = document.createElement('div');
    header.className = 'student-view-submission-header';

    const title = document.createElement('strong');
    title.textContent = item.title;

    const meta = document.createElement('span');
    meta.textContent = item.meta;

    header.appendChild(title);
    header.appendChild(meta);

    const text = document.createElement('p');
    text.className = 'student-view-submission-text';
    text.textContent = item.text;

    card.appendChild(header);
    card.appendChild(text);
    container.appendChild(card);
  });
}
