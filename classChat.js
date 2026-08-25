// ============================================
// PER-CLASS CHAT — a floating bubble that expands into a live chat
// panel scoped to one (teacherEmail, section) room. Classmates only,
// never site-wide.
//
// Two callers:
//   - Students (dashboard.html): fixed to their own class, no picker.
//   - Admins (dashboard.html, admin preview): admins have no
//     students/{email} doc of their own, so there's no single fixed
//     room -- this module looks up which section(s) they actually
//     teach (students whose teacherEmail == them) and either opens
//     straight into the one class they have, or shows a small picker
//     if they teach more than one. Mirrors the same "teach multiple
//     sections" reality teacher.html's roster already handles.
//
// Moderation, per agreed policy:
//   - block-before-send, reusing contentFilter.js (same checks as
//     reflections/journals) -- a flagged message never reaches
//     classmates at all.
//   - report-only for students, no delete/edit -- nothing can be
//     quietly removed before a teacher sees it. The full read/reply
//     teacher log lives in teacher.js/teacher.html.
//
// Real-time via onSnapshot, mirroring the Community Activity feed's
// pattern in dashboard.html. Security is enforced server-side in
// firestore.rules -- this module trusts that and just builds the
// matching client query.
// ============================================

import { db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, getDocs, serverTimestamp } from './firebase.js';
import { containsBannedWord, looksLikeGibberish } from './contentFilter.js';

const MAX_MESSAGES = 50;
const MAX_LENGTH = 500;

// A small curated set, not the full system emoji picker -- keeps
// this to wholesome, classroom-appropriate reactions.
const EMOJI_SET = ['👍', '👏', '🙋', '❤️', '🙏', '😊', '🎉', '✅', '😂', '🔥', '👀', '💯'];

function initials(str) {
  return (str || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function initClassChat({ email, name, teacherEmail, section, isAdmin }) {
  const overlay = document.createElement('div');
  overlay.id = 'classChatRoot';

  const bubble = document.createElement('button');
  bubble.type = 'button';
  bubble.className = 'chat-bubble';
  bubble.setAttribute('aria-label', 'Open class chat');
  bubble.innerHTML = '💬<span class="chat-badge hidden" id="chatBadge">0</span>';

  const panel = document.createElement('div');
  panel.className = 'chat-panel';
  panel.innerHTML = `
    <div class="chat-header">
      <div>
        <span class="chat-kicker">Live · Classmates Only</span>
        <h2 id="chatRoomTitle">Class Chat</h2>
        <p>Only students in this class can see this</p>
      </div>
      <button type="button" class="chat-close-btn" id="chatCloseBtn" aria-label="Close chat">✕</button>
    </div>
    <div class="chat-room-picker hidden" id="chatRoomPicker">
      <button type="button" class="chat-room-picker-btn" id="chatRoomPickerBtn">
        <span id="chatRoomPickerLabel"></span>
        <span class="chat-room-picker-caret">▾</span>
      </button>
      <div class="chat-room-picker-menu" id="chatRoomPickerMenu"></div>
    </div>
    <div class="chat-messages" id="chatMessages">
      <p class="chat-empty">Loading…</p>
    </div>
    <p class="chat-error" id="chatError"></p>
    <div class="chat-emoji-picker" id="chatEmojiPicker">
      ${EMOJI_SET.map((e) => `<button type="button" class="chat-emoji-option">${e}</button>`).join('')}
    </div>
    <div class="chat-input-row">
      <button type="button" class="chat-emoji-btn" id="chatEmojiBtn" aria-label="Insert emoji">😊</button>
      <input type="text" class="chat-input" id="chatInput" placeholder="Message your class…" maxlength="${MAX_LENGTH}">
      <button type="button" class="chat-send-btn" id="chatSendBtn">Send</button>
    </div>
  `;

  overlay.appendChild(panel);
  overlay.appendChild(bubble);
  document.body.appendChild(overlay);

  const badge = bubble.querySelector('#chatBadge');
  const titleEl = panel.querySelector('#chatRoomTitle');
  const roomPicker = panel.querySelector('#chatRoomPicker');
  const roomPickerBtn = panel.querySelector('#chatRoomPickerBtn');
  const roomPickerLabel = panel.querySelector('#chatRoomPickerLabel');
  const roomPickerMenu = panel.querySelector('#chatRoomPickerMenu');
  const messagesEl = panel.querySelector('#chatMessages');
  const errorEl = panel.querySelector('#chatError');
  const inputEl = panel.querySelector('#chatInput');
  const sendBtn = panel.querySelector('#chatSendBtn');
  const closeBtn = panel.querySelector('#chatCloseBtn');
  const emojiBtn = panel.querySelector('#chatEmojiBtn');
  const emojiPicker = panel.querySelector('#chatEmojiPicker');

  emojiBtn.addEventListener('click', () => {
    emojiPicker.classList.toggle('open');
  });
  emojiPicker.querySelectorAll('.chat-emoji-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      inputEl.value += btn.textContent;
      inputEl.focus();
      emojiPicker.classList.remove('open');
    });
  });

  let activeTeacherEmail = teacherEmail || null;
  let activeSection = section || null;
  let latestMessages = [];
  let isOpen = false;
  let unsubscribe = null;

  function lastSeenKey() {
    return `classChatLastSeen_${activeTeacherEmail}_${activeSection}`;
  }

  function getLastSeen() {
    const raw = localStorage.getItem(lastSeenKey());
    return raw ? Number(raw) : 0;
  }

  function updateBadge() {
    if (isOpen) {
      badge.classList.add('hidden');
      return;
    }
    const lastSeen = getLastSeen();
    const unread = latestMessages.filter((m) => {
      if (m.senderEmail === email) return false;
      const ms = m.timestamp?.toMillis ? m.timestamp.toMillis() : 0;
      return ms > lastSeen;
    }).length;

    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function renderMessages() {
    if (!latestMessages.length) {
      messagesEl.innerHTML = '<p class="chat-empty">No messages yet — say hello 👋</p>';
      return;
    }

    messagesEl.innerHTML = '';
    // latestMessages arrives newest-first (query order); render oldest-first.
    [...latestMessages].reverse().forEach((msg) => {
      const isMe = msg.senderEmail === email;

      const row = document.createElement('div');
      row.className = 'msg' + (isMe ? ' me' : '');

      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.textContent = isMe ? 'You' : initials(msg.senderName);

      const body = document.createElement('div');
      body.className = 'msg-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'msg-name';
      nameEl.textContent = isMe ? 'You' : (msg.senderName || 'Classmate');

      const bubbleEl = document.createElement('div');
      bubbleEl.className = 'msg-bubble';
      bubbleEl.textContent = msg.text;

      body.appendChild(nameEl);
      body.appendChild(bubbleEl);

      if (!isMe) {
        if (msg.reported) {
          const reportedNote = document.createElement('div');
          reportedNote.className = 'msg-reported-note';
          reportedNote.textContent = 'Reported to your teacher';
          body.appendChild(reportedNote);
        } else {
          const reportBtn = document.createElement('button');
          reportBtn.type = 'button';
          reportBtn.className = 'msg-report-btn';
          reportBtn.textContent = 'Report';
          reportBtn.addEventListener('click', () => {
            updateDoc(doc(db, 'classChatMessages', msg.id), { reported: true }).catch((err) => {
              console.error('Failed to report message:', err);
            });
          });
          body.appendChild(reportBtn);
        }
      }

      // Only admins can actually delete (firestore.rules: allow
      // delete: if isAdmin()) -- students never get this button, only
      // report. Shown on every message here, not just the admin's
      // own, so a teacher can remove anything after reviewing it.
      if (isAdmin) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'msg-report-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
          if (!confirm('Delete this message for everyone? This cannot be undone.')) return;
          deleteDoc(doc(db, 'classChatMessages', msg.id)).catch((err) => {
            console.error('Failed to delete message:', err);
          });
        });
        body.appendChild(deleteBtn);
      }

      row.appendChild(avatar);
      row.appendChild(body);
      messagesEl.appendChild(row);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
    clearTimeout(showError._t);
    showError._t = setTimeout(() => errorEl.classList.remove('show'), 3200);
  }

  function send() {
    const text = inputEl.value.trim();
    if (!text || !activeTeacherEmail || !activeSection) return;

    // looksLikeGibberish only recognizes Latin letters, so a pure-
    // emoji message (e.g. just "👏") would otherwise get wrongly
    // flagged as gibberish -- only run that check when there's
    // actual text to judge.
    if (/[a-zA-Z]/.test(text) && looksLikeGibberish(text)) {
      showError("That doesn't look like a real message — try again.");
      return;
    }
    if (containsBannedWord(text)) {
      showError('That message contains language that isn’t allowed here.');
      return;
    }

    inputEl.disabled = true;
    sendBtn.disabled = true;

    addDoc(collection(db, 'classChatMessages'), {
      senderEmail: email,
      senderName: name,
      teacherEmail: activeTeacherEmail,
      section: activeSection,
      text,
      timestamp: serverTimestamp(),
      reported: false
    }).then(() => {
      inputEl.value = '';
    }).catch((err) => {
      console.error('Failed to send class chat message:', err);
      showError('Could not send that message — try again.');
    }).finally(() => {
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    });
  }

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') send();
  });

  // Switches the live room the panel is subscribed to -- used once at
  // startup, and again if an admin picks a different class from the
  // room picker. Always tears down the previous listener first so
  // switching classes never leaves an old one still updating the UI.
  function subscribeToRoom(nextTeacherEmail, nextSection) {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    activeTeacherEmail = nextTeacherEmail;
    activeSection = nextSection;
    titleEl.textContent = nextSection;
    latestMessages = [];
    messagesEl.innerHTML = '<p class="chat-empty">Loading…</p>';

    const chatQuery = query(
      collection(db, 'classChatMessages'),
      where('teacherEmail', '==', nextTeacherEmail),
      where('section', '==', nextSection),
      orderBy('timestamp', 'desc'),
      limit(MAX_MESSAGES)
    );

    unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      latestMessages = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      renderMessages();
      updateBadge();
    }, (err) => {
      console.error('Failed to load class chat:', err);
      messagesEl.innerHTML = '<p class="chat-empty">Could not load this chat.</p>';
    });
  }

  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    const latestTimestamp = latestMessages[0]?.timestamp;
    if (activeTeacherEmail && activeSection && latestTimestamp?.toMillis) {
      localStorage.setItem(lastSeenKey(), String(latestTimestamp.toMillis()));
    }
    updateBadge();
    messagesEl.scrollTop = messagesEl.scrollHeight;
    inputEl.focus();
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
  }

  bubble.addEventListener('click', () => {
    isOpen ? closePanel() : openPanel();
  });
  closeBtn.addEventListener('click', closePanel);

  if (!isAdmin) {
    // Student path: exactly one room, known up front.
    subscribeToRoom(teacherEmail, section);
    return;
  }

  // Admin path: figure out which section(s) this admin actually
  // teaches (their own email as a student's teacherEmail), since
  // there's no single fixed class the way a student has one.
  messagesEl.innerHTML = '<p class="chat-empty">Loading your classes…</p>';

  getDocs(query(collection(db, 'students'), where('teacherEmail', '==', email)))
    .then((snapshot) => {
      const sections = [...new Set(snapshot.docs.map((d) => d.data().section).filter(Boolean))].sort();

      if (sections.length === 0) {
        titleEl.textContent = 'Class Chat';
        messagesEl.innerHTML = '<p class="chat-empty">You have no assigned classes yet.</p>';
        inputEl.disabled = true;
        sendBtn.disabled = true;
        return;
      }

      if (sections.length > 1) {
        roomPicker.classList.remove('hidden');
        roomPickerLabel.textContent = sections[0];

        roomPickerMenu.innerHTML = '';
        sections.forEach((s) => {
          const option = document.createElement('button');
          option.type = 'button';
          option.className = 'chat-room-picker-option' + (s === sections[0] ? ' active' : '');
          option.textContent = s;
          option.addEventListener('click', () => {
            roomPickerLabel.textContent = s;
            roomPickerMenu.querySelectorAll('.chat-room-picker-option').forEach((opt) => {
              opt.classList.toggle('active', opt === option);
            });
            roomPicker.classList.remove('open');
            subscribeToRoom(email, s);
          });
          roomPickerMenu.appendChild(option);
        });

        roomPickerBtn.addEventListener('click', () => {
          roomPicker.classList.toggle('open');
        });

        // Close the menu on an outside click, so it doesn't stay open
        // and cover the messages/input below it.
        document.addEventListener('click', (event) => {
          if (!roomPicker.contains(event.target)) {
            roomPicker.classList.remove('open');
          }
        });
      }

      subscribeToRoom(email, sections[0]);
    })
    .catch((err) => {
      console.error('Failed to load admin class list for chat:', err);
      messagesEl.innerHTML = '<p class="chat-empty">Could not load your classes.</p>';
    });
}
