// ============================================
// PER-CLASS CHAT — a floating bubble on the dashboard that expands
// into a live chat panel scoped to the student's own (teacherEmail,
// section) pair. Classmates only, never site-wide.
//
// Moderation, per agreed policy:
//   - block-before-send, reusing contentFilter.js (same checks as
//     reflections/journals) -- a flagged message never reaches
//     classmates at all.
//   - report-only for students, no delete/edit -- nothing can be
//     quietly removed before a teacher sees it. The read-only teacher
//     log lives in teacher.js/teacher.html.
//
// Real-time via onSnapshot, mirroring the Community Activity feed's
// pattern in dashboard.html. Security is enforced server-side in
// firestore.rules (a student can only read/write messages in the
// class their OWN student doc says they're in) -- this module trusts
// that and just builds the matching client query.
// ============================================

import { db, collection, doc, addDoc, updateDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp } from './firebase.js';
import { containsBannedWord, looksLikeGibberish } from './contentFilter.js';

const MAX_MESSAGES = 50;
const MAX_LENGTH = 500;

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function escapeForAttr(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

export function initClassChat({ email, name, teacherEmail, section }) {
  const lastSeenKey = `classChatLastSeen_${teacherEmail}_${section}`;

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
        <h2>${escapeForAttr(section)}</h2>
        <p>Only students in this class can see this</p>
      </div>
      <button type="button" class="chat-close-btn" id="chatCloseBtn" aria-label="Close chat">✕</button>
    </div>
    <div class="chat-messages" id="chatMessages">
      <p class="chat-empty">No messages yet — say hello 👋</p>
    </div>
    <p class="chat-error" id="chatError"></p>
    <div class="chat-input-row">
      <input type="text" class="chat-input" id="chatInput" placeholder="Message your class…" maxlength="${MAX_LENGTH}">
      <button type="button" class="chat-send-btn" id="chatSendBtn">Send</button>
    </div>
  `;

  overlay.appendChild(panel);
  overlay.appendChild(bubble);
  document.body.appendChild(overlay);

  const badge = bubble.querySelector('#chatBadge');
  const messagesEl = panel.querySelector('#chatMessages');
  const errorEl = panel.querySelector('#chatError');
  const inputEl = panel.querySelector('#chatInput');
  const sendBtn = panel.querySelector('#chatSendBtn');
  const closeBtn = panel.querySelector('#chatCloseBtn');

  let latestMessages = [];
  let isOpen = false;

  function getLastSeen() {
    const raw = localStorage.getItem(lastSeenKey);
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

      row.appendChild(avatar);
      row.appendChild(body);
      messagesEl.appendChild(row);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    const latestTimestamp = latestMessages[0]?.timestamp;
    if (latestTimestamp?.toMillis) {
      localStorage.setItem(lastSeenKey, String(latestTimestamp.toMillis()));
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

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
    clearTimeout(showError._t);
    showError._t = setTimeout(() => errorEl.classList.remove('show'), 3200);
  }

  function send() {
    const text = inputEl.value.trim();
    if (!text) return;

    if (looksLikeGibberish(text)) {
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
      teacherEmail,
      section,
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

  const chatQuery = query(
    collection(db, 'classChatMessages'),
    where('teacherEmail', '==', teacherEmail),
    where('section', '==', section),
    orderBy('timestamp', 'desc'),
    limit(MAX_MESSAGES)
  );

  onSnapshot(chatQuery, (snapshot) => {
    latestMessages = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderMessages();
    updateBadge();
  }, (err) => {
    console.error('Failed to load class chat:', err);
  });
}
