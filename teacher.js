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
} from './firebase.js';
import { requireAdmin } from './auth.js';
import { PUZZLE_CONFIG } from './puzzles.js';
import { PIECE_CODES } from './codes.js';
import { ADMIN_EMAILS, ADMINS } from './admins.js';
import { getRankProgress } from './rank.js';
import { initSeasonEditor } from './seasonEditor.js';
import { CLASS_OFFERINGS } from './classOfferings.js';
import { containsBannedWord, looksLikeGibberish } from './contentFilter.js';

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
      chatLogEmojiPicker.classList.toggle('hidden');
    };
    chatLogEmojiPicker.querySelectorAll('.chat-emoji-option').forEach((btn) => {
      btn.onclick = () => {
        chatLogInput.value += btn.textContent;
        chatLogInput.focus();
        chatLogEmojiPicker.classList.add('hidden');
      };
    });
  }

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
        data._docId = student.id; // the real document ID — may differ from data.email if that field is blank/stale
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
      const isRealTeacher = teacherEmail !== UNASSIGNED_KEY;

      if (!isRealTeacher && count === 0) return;

      const card = document.createElement('div');
      card.className = 'roster-nav-card';
      card.innerHTML = `
        ${isRealTeacher ? '<div class="roster-teacher-avatar">🧙</div>' : ''}
        <h3 class="${isRealTeacher ? 'roster-teacher-name' : ''}">${group.name}</h3>
        <p>${count} seeker${count === 1 ? '' : 's'}</p>
      `;
      card.onclick = () => showClassList(teacherEmail);
      teacherListView.appendChild(card);
    });
  }

  function teacherNameHtml(name, isRealTeacher) {
    return isRealTeacher ? `<span class="roster-teacher-name">${name}</span>` : name;
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

    rosterSubtitle.innerHTML = `${teacherNameHtml(currentTeacher.name, currentTeacher.isRealTeacher)} — ${section} (${students.length} seeker${students.length === 1 ? '' : 's'})`;
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
        <td>${data.name || '(no name)'}</td>
        <td>${data.email || data._docId || ''}</td>
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

  function openContextMenu(event, data, section) {
    contextMenuStudent = data;
    contextMenuSection = section;

    contextMenu.classList.remove('hidden');

    const menuWidth = 200;
    const menuHeight = 160;
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

  // --- Re-assign Class ---
  // Section (class offering) and teacher are independent choices a
  // student makes at enroll.html/teacher-select.html — there's no
  // fixed "this teacher's sections" list, so both dropdowns here draw
  // from the same fixed master list (classOfferings.js) / ADMINS
  // roster instead of whatever happens to already exist among
  // currently-enrolled students, which can be empty in a small class.

  function openReassignModal(data, section) {
    const modal = document.getElementById('reassignModal');
    const label = document.getElementById('reassignStudentLabel');
    const teacherWrap = document.getElementById('reassignTeacherWrap');
    const teacherSelect = document.getElementById('reassignTeacherSelect');
    const sectionSelect = document.getElementById('reassignSectionSelect');

    sectionSelect.innerHTML = '';
    CLASS_OFFERINGS.forEach((offering) => {
      const opt = document.createElement('option');
      opt.value = offering;
      opt.textContent = offering;
      sectionSelect.appendChild(opt);
    });

    if (currentTeacher.isRealTeacher) {
      // Same teacher, different class offering — the common case.
      label.textContent = `Move ${data.name || data.email} out of "${section}" into:`;
      teacherWrap.classList.add('hidden');
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

      const card = document.createElement('div');
      card.className = 'student-view-submission-card chat-log-entry' + (msg.reported ? ' reported' : '');

      const header = document.createElement('div');
      header.className = 'student-view-submission-header';

      const title = document.createElement('strong');
      title.textContent = msg.senderName || msg.senderEmail || 'Unknown';
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
        deleteDoc(doc(db, 'classChatMessages', docSnap.id)).catch((err) => {
          console.error('Failed to delete message:', err);
        });
      });

      card.appendChild(header);
      card.appendChild(text);
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