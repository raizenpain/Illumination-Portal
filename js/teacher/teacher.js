import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy,
  addDoc,
  onSnapshot,
  serverTimestamp
} from '../core/firebase.js';
import { requireAdmin } from '../core/auth.js';
import { PUZZLE_CONFIG } from '../puzzles/puzzles.js';
import { PIECE_CODES } from '../puzzles/codes.js';
import { ADMIN_EMAILS, ADMINS } from '../core/admins.js';
import { getRankProgress } from '../core/rank.js';
import { initSeasonEditor } from './seasonEditor.js';
import { getOfferingsForTeacher } from '../core/classOfferings.js';
import { containsBannedWord, looksLikeGibberish } from '../core/contentFilter.js';
import { COOLDOWN_DAYS, isOnCooldown, cooldownEndsAt } from '../core/cooldown.js';
import { maybePostDailyGreeting } from '../dashboard/dailyGreeting.js';
import { createImageSlot, loadInto, deleteChatImage } from '../dashboard/chatImages.js';
import { publishMidtermHonorRoll } from '../dashboard/midtermHonorRoll.js';

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

  // Starts unselected on purpose -- piece codes are sensitive (they're
  // literally the unlock passwords), so nothing renders them until the
  // admin actively clicks a puzzle tab, rather than defaulting to
  // Puzzle 1 and showing its codes on page load with no interaction.
  let activePuzzle = null;

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
        // Clicking the already-open tab collapses it back to hidden
        // instead of just re-rendering the same codes on top of
        // themselves -- a real toggle, not a one-way reveal.
        activePuzzle = activePuzzle === puzzleNumber ? null : puzzleNumber;
        renderTabs();
        loadReleasedPieces();
      };

      tabsContainer.appendChild(tab);
    });
  }

  async function loadReleasedPieces() {
    if (activePuzzle === null) {
      container.innerHTML = '<p>Choose a puzzle above to reveal and manage its relic codes.</p>';
      return;
    }

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
  const viewChatLogBtn = document.getElementById('viewChatLogBtn');
  const classChatLogModal = document.getElementById('classChatLogModal');
  const chatLogClassLabel = document.getElementById('chatLogClassLabel');
  const chatLogList = document.getElementById('chatLogList');
  const chatLogError = document.getElementById('chatLogError');
  const chatLogInput = document.getElementById('chatLogInput');
  const chatLogSendBtn = document.getElementById('chatLogSendBtn');
  const chatLogCloseBtn = document.getElementById('chatLogCloseBtn');
  const chatLogEmojiBtn = document.getElementById('chatLogEmojiBtn');
  const chatLogEmojiPicker = document.getElementById('chatLogEmojiPicker');

  if (chatLogEmojiBtn && chatLogEmojiPicker) {
    chatLogEmojiBtn.onclick = () => {
      chatLogEmojiPicker.classList.toggle('open');
    };
    chatLogEmojiPicker.querySelectorAll('.chat-emoji-option').forEach((btn) => {
      btn.onclick = () => {
        chatLogInput.value += btn.textContent;
        chatLogInput.focus();
        chatLogEmojiPicker.classList.remove('open');
      };
    });
  }

  let teacherGroups = {}; // { teacherEmail: { name, bySection: { section: [studentData] } } }
  let currentTeacher = null; // { email, name }
  let currentSection = null;

  // completed:true with count < 9 can't happen through any real write
  // path (app.js/healStuckPuzzleCompletions/vaultCapstone all only set
  // the flag alongside a full 9-piece array) -- Firestore rules only
  // validate field NAMES, not values, so this combination means the
  // flag was set directly (e.g. via devtools), not earned. Flagged here
  // so it's visible while paging the roster, since rank.js no longer
  // trusts the flag for star/rank purposes either way.
  //
  // The opposite mismatch -- all 9 pieces but the flag still false -- is
  // NOT suspicious: it's the completion write failing after the last
  // piece saved (typically the free-tier read quota running out), which
  // the student's own dashboard repairs on its next load (see
  // healStuckPuzzleCompletions in dashboard.html). So a full piece count
  // shows as complete here regardless of the flag, same as rank.js.
  function progressPill(count, completed) {
    const mismatch = completed && count < 9;
    const done = count >= 9;
    const state = mismatch ? 'flagged' : done ? 'complete' : count > 0 ? 'in-progress' : '';
    const label = `${count}/9${(done || completed) ? ' ✅' : ''}`;
    const title = mismatch ? ' title="Flagged as completed but fewer than 9 pieces on record — likely edited outside the app"' : '';
    return `<span class="progress-pill${state ? ' ' + state : ''}"${title}>${label}</span>`;
  }

  function progressText(count, completed) {
    if (completed && count < 9) return `${count}/9 (FLAGGED — completed but incomplete)`;
    return (completed || count >= 9) ? `${count}/9 (Completed)` : `${count}/9`;
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
        data._docId = student.id; // the real document ID — may differ from data.email if that field is blank/stale
        const teacherEmail = data.teacherEmail && teacherGroups[data.teacherEmail]
          ? data.teacherEmail
          : UNASSIGNED_KEY;
        const section = data.section || 'No class offering selected';

        const group = teacherGroups[teacherEmail];
        if (!group.bySection[section]) group.bySection[section] = [];
        group.bySection[section].push(data);
      });

      // Every student is already in hand here, so this is where the
      // Midterm Roll of Honor gets refreshed (see midtermHonorRoll.js) --
      // not awaited, the roster shouldn't wait on it.
      publishMidtermHonorRoll(snapshot.docs.map((student) => student.data()));

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
      const isRealTeacher = teacherEmail !== UNASSIGNED_KEY;

      if (!isRealTeacher && count === 0) return;

      const card = document.createElement('div');
      card.className = 'roster-nav-card';
      card.innerHTML = `
        ${isRealTeacher ? '<div class="roster-teacher-avatar">🧙</div>' : ''}
        <h3 class="${isRealTeacher ? 'roster-teacher-name' : ''}">${escapeHtml(group.name)}</h3>
        <p>${count} seeker${count === 1 ? '' : 's'}</p>
      `;
      card.onclick = () => showClassList(teacherEmail);
      teacherListView.appendChild(card);
    });
  }

  // Student records are student-writable (rules validate field names, not
  // values), so name/email/section must be escaped before innerHTML --
  // otherwise a planted string runs as script in an admin's session.
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function teacherNameHtml(name, isRealTeacher) {
    const safe = escapeHtml(name);
    return isRealTeacher ? `<span class="roster-teacher-name">${safe}</span>` : safe;
  }

  function showClassList(teacherEmail) {
    const group = teacherGroups[teacherEmail];
    const isRealTeacher = teacherEmail !== UNASSIGNED_KEY;
    currentTeacher = { email: teacherEmail, name: group.name, isRealTeacher };

    rosterSubtitle.innerHTML = `Choose a class for ${teacherNameHtml(group.name, isRealTeacher)}.`;
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
        <h3>${escapeHtml(section)}</h3>
        <p>${list.length} seeker${list.length === 1 ? '' : 's'}</p>
      `;
      card.onclick = () => showRoster(section);
      classListGrid.appendChild(card);
    });
  }

  function showRoster(section) {
    currentSection = section;
    const students = teacherGroups[currentTeacher.email].bySection[section] || [];

    rosterSubtitle.innerHTML = `${teacherNameHtml(currentTeacher.name, currentTeacher.isRealTeacher)} — ${escapeHtml(section)} (${students.length} seeker${students.length === 1 ? '' : 's'})`;
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
        <td>${escapeHtml(data.name || '(no name)')}${isOnCooldown(data) ? ` <span title="On a ${COOLDOWN_DAYS}-day cooldown for a banned word. Right-click to lift it.">⏳</span>` : ''}</td>
        <td>${escapeHtml(data.email || data._docId || '')}</td>
        <td>${progressPill(p1, data.puzzle1Completed)}</td>
        <td>${progressPill(p2, data.puzzle2Completed)}</td>
        <td>${progressPill(p3, data.puzzle3Completed)}</td>
        <td><span class="rank-chip" data-rank="${getRankProgress(data).rank}">${getRankProgress(data).rank}</span></td>
      `;

      row.title = 'Click to review this student — right-click for more actions';
      row.onclick = () => {
        window.location.href = `student-view.html?student=${encodeURIComponent(data.email || data._docId)}`;
      };
      row.oncontextmenu = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openContextMenu(event, data, section);
      };

      const actionCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'roster-delete-btn';
      deleteBtn.title = 'Remove this student';
      deleteBtn.textContent = '🗑️';
      deleteBtn.onclick = (event) => {
        event.stopPropagation();
        deleteStudent(data, section);
      };
      actionCell.appendChild(deleteBtn);
      row.appendChild(actionCell);

      tableBody.appendChild(row);
    });
  }

  // ================================
  // ROSTER ROW CONTEXT MENU — delete / re-assign class / gift tickets
  // ================================

  const contextMenu = document.getElementById('studentContextMenu');
  let contextMenuStudent = null;
  let contextMenuSection = null;

  const GIFT_TICKET_OPTIONS = [
    ['quiz_ticket', '📝 Sigil of Insight'],
    ['task_ticket', '🎯 Seal of Diligence'],
    ['journal_ticket', '📖 Scroll of Reflection'],
    ['recitation_ticket', "🗣️ Herald's Voice"],
    ['scrap_ticket', '♻️ Ember Shard']
  ];

  // Puzzles whose completedField is true despite fewer than 9 pieces on
  // record -- can't happen through any real write path (see the comment
  // on progressPill above), so this is what the roster's Fix Flagged
  // Completion action targets.
  function findFlaggedPuzzles(data) {
    return Object.values(PUZZLE_CONFIG).filter((config) => {
      const count = pieceCount(data, config.piecesField);
      return !!data[config.completedField] && count < config.totalPieces;
    });
  }

  function openContextMenu(event, data, section) {
    contextMenuStudent = data;
    contextMenuSection = section;

    contextMenu.classList.remove('hidden');
    document.getElementById('ctxFixFlag').classList.toggle('hidden', findFlaggedPuzzles(data).length === 0);
    document.getElementById('ctxLiftCooldown').classList.toggle('hidden', !isOnCooldown(data));

    const menuWidth = 200;
    const menuHeight = 200;
    contextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - menuWidth - 10)}px`;
    contextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - menuHeight - 10)}px`;
  }

  function closeContextMenu() {
    contextMenu.classList.add('hidden');
  }

  document.addEventListener('click', closeContextMenu);
  document.addEventListener('contextmenu', (event) => {
    if (!contextMenu.contains(event.target)) closeContextMenu();
  });

  document.getElementById('ctxDelete').onclick = () => {
    closeContextMenu();
    if (contextMenuStudent) deleteStudent(contextMenuStudent, contextMenuSection);
  };

  document.getElementById('ctxReassign').onclick = () => {
    closeContextMenu();
    if (contextMenuStudent) openReassignModal(contextMenuStudent, contextMenuSection);
  };

  document.getElementById('ctxGift').onclick = () => {
    closeContextMenu();
    if (contextMenuStudent) openGiftModal(contextMenuStudent);
  };

  document.getElementById('ctxFixFlag').onclick = () => {
    closeContextMenu();
    if (contextMenuStudent) fixFlaggedCompletion(contextMenuStudent, contextMenuSection);
  };

  document.getElementById('ctxLiftCooldown').onclick = () => {
    closeContextMenu();
    if (contextMenuStudent) liftCooldown(contextMenuStudent, contextMenuSection);
  };

  // Ends a student's banned-word cooldown early (cooldown.js). Only a
  // teacher can: firestore.rules stops the student clearing it themselves.
  async function liftCooldown(data, section) {
    if (!isOnCooldown(data)) return;

    const label = data.name || data.email || data._docId;
    const { word, where } = data.cooldown;
    const ends = new Date(cooldownEndsAt(data)).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' });
    if (!confirm(`Lift the cooldown for ${label}?\n\nWord: "${word || '(not recorded)'}"${where ? `\nWhere: ${where}` : ''}\nEnds on its own: ${ends}\n\nThey will be able to open the portal again right away.`)) {
      return;
    }

    try {
      await setDoc(doc(db, 'students', data._docId || data.email), { cooldown: null }, { merge: true });
      data.cooldown = null;
      showRoster(section);
    } catch (err) {
      console.error('Failed to lift cooldown:', err);
      alert("Could not lift this student's cooldown. Please try again.");
    }
  }

  // Clears a *Completed flag that's out of sync with actual pieces
  // collected -- e.g. set directly via devtools rather than earned.
  // Only ever writes `false`; firestore.rules' isValidAdminCompletionFix()
  // enforces that server-side too, so this can't be used to fake a
  // completion the other direction. Doesn't touch pieces, tickets, or
  // achievements -- rank.js already ignores the flag either way (see
  // isPuzzleComplete()), so this is purely a data-hygiene cleanup.
  async function fixFlaggedCompletion(data, section) {
    const flagged = findFlaggedPuzzles(data);
    if (!flagged.length) return;

    const label = data.name || data.email || data._docId;
    const titles = flagged.map((config) => config.title).join(', ');
    if (!confirm(`Clear the completed flag for ${titles} on ${label}?\n\nTheir pieces, tickets, and achievements are untouched -- this only corrects a flag that no longer matches how many pieces they've actually collected.`)) {
      return;
    }

    const updates = {};
    flagged.forEach((config) => { updates[config.completedField] = false; });

    try {
      await setDoc(doc(db, 'students', data._docId || data.email), updates, { merge: true });
      flagged.forEach((config) => { data[config.completedField] = false; });
      showRoster(section);
    } catch (err) {
      console.error('Failed to fix flagged completion:', err);
      alert("Could not update this student's record. Please try again.");
    }
  }

  // --- Re-assign Class ---
  // Section (class offering) is scoped to whichever teacher is being
  // assigned — each teacher only teaches their own offerings
  // (classOfferings.js), so the section dropdown must be re-populated
  // whenever the target teacher changes.

  function populateSectionSelect(sectionSelect, teacherEmail) {
    sectionSelect.innerHTML = '';
    getOfferingsForTeacher(teacherEmail).forEach((offering) => {
      const opt = document.createElement('option');
      opt.value = offering;
      opt.textContent = offering;
      sectionSelect.appendChild(opt);
    });
  }

  function openReassignModal(data, section) {
    const modal = document.getElementById('reassignModal');
    const label = document.getElementById('reassignStudentLabel');
    const teacherWrap = document.getElementById('reassignTeacherWrap');
    const teacherSelect = document.getElementById('reassignTeacherSelect');
    const sectionSelect = document.getElementById('reassignSectionSelect');

    if (currentTeacher.isRealTeacher) {
      // Same teacher, different class offering — the common case.
      label.textContent = `Move ${data.name || data.email} out of "${section}" into:`;
      teacherWrap.classList.add('hidden');
      teacherSelect.onchange = null;
      populateSectionSelect(sectionSelect, currentTeacher.email);
    } else {
      // Unassigned students have no teacher to "stay the same" with —
      // let the admin pick one along with the class offering.
      label.textContent = `Assign ${data.name || data.email} to a teacher and class:`;
      teacherWrap.classList.remove('hidden');

      teacherSelect.innerHTML = '';
      ADMINS.forEach((admin) => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify({ teacherEmail: admin.email, teacherName: admin.name });
        opt.textContent = admin.name;
        teacherSelect.appendChild(opt);
      });

      populateSectionSelect(sectionSelect, ADMINS[0].email);
      teacherSelect.onchange = () => {
        populateSectionSelect(sectionSelect, JSON.parse(teacherSelect.value).teacherEmail);
      };
    }

    modal.classList.remove('hidden');

    document.getElementById('reassignConfirmBtn').onclick = () => {
      const target = currentTeacher.isRealTeacher
        ? { teacherEmail: currentTeacher.email, teacherName: currentTeacher.name, section: sectionSelect.value }
        : { ...JSON.parse(teacherSelect.value), section: sectionSelect.value };

      if (target.teacherEmail === currentTeacher.email && target.section === section) {
        alert('Please choose a different class offering.');
        return;
      }

      handleReassignConfirm(data, section, target, modal);
    };
    document.getElementById('reassignCancelBtn').onclick = () => {
      modal.classList.add('hidden');
    };
  }

  async function handleReassignConfirm(data, oldSection, target, modal) {
    try {
      await setDoc(doc(db, 'students', data._docId), {
        teacherEmail: target.teacherEmail,
        teacherName: target.teacherName,
        section: target.section
      }, { merge: true });

      const oldGroup = teacherGroups[currentTeacher.email];
      const oldList = oldGroup.bySection[oldSection];
      const index = oldList.indexOf(data);
      if (index !== -1) oldList.splice(index, 1);

      data.teacherEmail = target.teacherEmail;
      data.teacherName = target.teacherName;
      data.section = target.section;

      if (!teacherGroups[target.teacherEmail]) {
        teacherGroups[target.teacherEmail] = { name: target.teacherName, bySection: {} };
      }
      if (!teacherGroups[target.teacherEmail].bySection[target.section]) {
        teacherGroups[target.teacherEmail].bySection[target.section] = [];
      }
      teacherGroups[target.teacherEmail].bySection[target.section].push(data);

      modal.classList.add('hidden');

      if (oldList.length === 0) {
        delete oldGroup.bySection[oldSection];
        showClassList(currentTeacher.email);
      } else {
        showRoster(oldSection);
      }

    } catch (err) {
      console.error('Failed to reassign student:', err);
      alert('Something went wrong while re-assigning this student. Please try again.');
    }
  }

  // --- Gift Tickets ---

  function openGiftModal(data) {
    const modal = document.getElementById('giftTicketsModal');
    const label = document.getElementById('giftStudentLabel');
    const select = document.getElementById('giftTicketSelect');
    const qtyInput = document.getElementById('giftQuantityInput');

    label.textContent = `Gift tickets to ${data.name || data.email}:`;

    select.innerHTML = '';
    GIFT_TICKET_OPTIONS.forEach(([value, text]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      select.appendChild(opt);
    });
    qtyInput.value = 1;

    modal.classList.remove('hidden');

    document.getElementById('giftConfirmBtn').onclick = () => {
      handleGiftConfirm(data, select.value, parseInt(qtyInput.value) || 1, modal);
    };
    document.getElementById('giftCancelBtn').onclick = () => {
      modal.classList.add('hidden');
    };
  }

  async function handleGiftConfirm(data, ticketType, quantity, modal) {
    const safeQuantity = Math.max(1, Math.min(50, quantity));

    try {
      const snap = await getDoc(doc(db, 'students', data._docId));
      const currentTickets = (snap.exists() ? snap.data().tickets : null) || {};
      const tickets = { ...currentTickets, [ticketType]: (currentTickets[ticketType] || 0) + safeQuantity };

      await setDoc(doc(db, 'students', data._docId), { tickets }, { merge: true });

      modal.classList.add('hidden');
      alert(`Gifted ${safeQuantity}x to ${data.name || data.email}.`);

    } catch (err) {
      console.error('Failed to gift tickets:', err);
      alert('Something went wrong while gifting tickets. Please try again.');
    }
  }

  async function deleteStudent(data, section) {
    const label = data.name
      ? `${data.name} (${data.email || data._docId})`
      : (data.email || data._docId || 'this record');

    if (!confirm(`Remove ${label} from the roster?\n\nThis permanently deletes their enrollment, puzzle progress, and achievements. This cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'students', data._docId));

      // Also remove their public leaderboard entry, if any -- otherwise
      // it lingers in the Top 5 forever, frozen at its last-known pace.
      deleteDoc(doc(db, 'leaderboard', data._docId)).catch(() => {});

      const list = teacherGroups[currentTeacher.email].bySection[section];
      const index = list.indexOf(data);
      if (index !== -1) list.splice(index, 1);

      if (list.length === 0) {
        delete teacherGroups[currentTeacher.email].bySection[section];
        showClassList(currentTeacher.email);
      } else {
        showRoster(section);
      }

    } catch (err) {
      console.error('Failed to delete student:', err);
      alert('Something went wrong while removing this student. Please try again.');
    }
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
      data.email || data._docId || '',
      progressText(pieceCount(data, 'puzzle1'), data.puzzle1Completed),
      progressText(pieceCount(data, 'puzzle2'), data.puzzle2Completed),
      progressText(pieceCount(data, 'puzzle3'), data.puzzle3Completed),
      getRankProgress(data).rank
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

  // ================================
  // CLASS CHAT LOG — live, two-way for the teacher/admin: everything
  // a student sees in that class's chat, plus a send box so the
  // teacher can actually participate, not just review. Live via
  // onSnapshot (not the one-shot getDocs a pure review log would use)
  // specifically because sending needs to see replies arrive without
  // reopening the modal. The listener is torn down on close/switch so
  // hopping between classes never stacks up old listeners.
  // ================================

  let chatLogUnsubscribe = null;

  function renderChatLogEntries(docs) {
    if (!docs.length) {
      chatLogList.innerHTML = '<p class="chat-log-empty">No messages in this class yet.</p>';
      return;
    }

    chatLogList.innerHTML = '';

    docs.forEach((docSnap) => {
      const msg = docSnap.data();

      const isGreeting = msg.type === 'greeting';

      const card = document.createElement('div');
      card.className = 'student-view-submission-card chat-log-entry' + (msg.reported ? ' reported' : '') + (isGreeting ? ' chat-log-greeting' : '');

      const header = document.createElement('div');
      header.className = 'student-view-submission-header';

      const title = document.createElement('strong');
      // A daily greeting is technically posted under whichever real
      // account happened to open the chat first that day (see
      // dailyGreeting.js) -- shown here as its own system label
      // instead of that (effectively random) name.
      title.textContent = isGreeting ? '🌅 Daily Greeting' : (msg.senderName || msg.senderEmail || 'Unknown');
      if (msg.reported) {
        const tag = document.createElement('span');
        tag.className = 'chat-log-entry-reported-tag';
        tag.textContent = 'Reported';
        title.appendChild(tag);
      }

      const meta = document.createElement('span');
      meta.textContent = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString() : 'Sending…';

      header.appendChild(title);
      header.appendChild(meta);

      const text = document.createElement('p');
      text.className = 'student-view-submission-text';
      text.textContent = msg.text || '';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'msg-report-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (!confirm('Delete this message for everyone? This cannot be undone.')) return;
        deleteDoc(doc(db, 'classChatMessages', docSnap.id))
          .then(() => { if (msg.imageId) deleteChatImage(msg.imageId); })
          .catch((err) => {
            console.error('Failed to delete message:', err);
          });
      });

      card.appendChild(header);
      if (msg.imageId) {
        const slot = createImageSlot(msg.imageId, msg.text);
        card.appendChild(slot);
        loadInto(slot);
      }
      if (msg.text) card.appendChild(text);
      card.appendChild(deleteBtn);
      chatLogList.appendChild(card);
    });

    chatLogList.scrollTop = chatLogList.scrollHeight;
  }

  function showChatLogError(message) {
    chatLogError.textContent = message;
    chatLogError.classList.toggle('show', !!message);
  }

  function closeChatLog() {
    classChatLogModal.classList.add('hidden');
    if (chatLogUnsubscribe) {
      chatLogUnsubscribe();
      chatLogUnsubscribe = null;
    }
  }

  function openChatLog(teacherEmail, section) {
    if (!classChatLogModal) return;

    if (chatLogUnsubscribe) {
      chatLogUnsubscribe();
      chatLogUnsubscribe = null;
    }

    chatLogClassLabel.textContent = `${section} — ${teacherEmail}`;
    chatLogList.innerHTML = '<p class="chat-log-empty">Loading…</p>';
    showChatLogError('');
    chatLogInput.value = '';
    classChatLogModal.classList.remove('hidden');

    maybePostDailyGreeting({ teacherEmail, section, email, name });

    chatLogCloseBtn.onclick = closeChatLog;

    const chatQuery = query(
      collection(db, 'classChatMessages'),
      where('teacherEmail', '==', teacherEmail),
      where('section', '==', section),
      orderBy('timestamp', 'desc')
    );

    chatLogUnsubscribe = onSnapshot(chatQuery, (snapshot) => {
      // Query is newest-first; render oldest-first like a normal chat.
      renderChatLogEntries([...snapshot.docs].reverse());
    }, (err) => {
      console.error('Failed to load class chat log:', err);
      chatLogList.innerHTML = '<p class="chat-log-empty">Could not load the chat log.</p>';
    });

    const send = () => {
      const text = chatLogInput.value.trim();
      if (!text) return;

      // Only judge actual text as gibberish -- a pure-emoji message
      // has no Latin letters for that check to work with at all.
      if (/[a-zA-Z]/.test(text) && looksLikeGibberish(text)) {
        showChatLogError("That doesn't look like a real message — try again.");
        return;
      }
      if (containsBannedWord(text)) {
        showChatLogError('That message contains language that isn’t allowed here.');
        return;
      }
      showChatLogError('');

      const senderName = (ADMINS.find((a) => a.email === email) || {}).name || name;

      chatLogInput.disabled = true;
      chatLogSendBtn.disabled = true;

      addDoc(collection(db, 'classChatMessages'), {
        senderEmail: email,
        senderName,
        teacherEmail,
        section,
        text,
        timestamp: serverTimestamp(),
        reported: false
      }).then(() => {
        chatLogInput.value = '';
      }).catch((err) => {
        console.error('Failed to send class chat message:', err);
        showChatLogError('Could not send that message — try again.');
      }).finally(() => {
        chatLogInput.disabled = false;
        chatLogSendBtn.disabled = false;
        chatLogInput.focus();
      });
    };

    chatLogSendBtn.onclick = send;
    chatLogInput.onkeydown = (event) => {
      if (event.key === 'Enter') send();
    };
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

  if (viewChatLogBtn) {
    viewChatLogBtn.onclick = () => openChatLog(currentTeacher.email, currentSection);
  }

  renderTabs();
  loadReleasedPieces();
  loadStudents();
  initSeasonEditor();
}