import { db, doc, getDoc, setDoc } from './firebase.js';
import { requireLogin } from './auth.js';
import { SEASON_CONTENT, mergeSeasonContent } from './seasonContent.js';
import { logActivity } from './activity.js';

const { email, name } = requireLogin();

const params = new URLSearchParams(window.location.search);
const seasonId = params.get('season');

const TICKET_INFO = {
  quiz_ticket: { icon: '📝', label: 'Quiz' },
  task_ticket: { icon: '🎯', label: 'Task' },
  journal_ticket: { icon: '📖', label: 'Journal' },
  recitation_ticket: { icon: '🗣️', label: 'Recitation' },
  scrap_ticket: { icon: '♻️', label: 'Scrap' }
};

const NODE_TYPE_ICON = { quiz: '📝', task: '🎯', journal: '📖', recitation: '🗣️' };
const NODE_TYPE_HEADING_ICON = { quiz: '📝', task: '🎯', journal: '📖', recitation: '🗣️' };

const seasonShell = document.getElementById('seasonShell');
const seasonNameEl = document.getElementById('seasonName');
const seasonSubtitleEl = document.getElementById('seasonSubtitle');
const seasonModuleLabel = document.getElementById('seasonModuleLabel');
const ticketBar = document.getElementById('ticketBar');
const chapterTitleEl = document.getElementById('chapterTitle');
const chapterBasedOnEl = document.getElementById('chapterBasedOn');
const chapterProgressEl = document.getElementById('chapterProgress');
const seasonPathEl = document.getElementById('seasonPath');
const prevChapterBtn = document.getElementById('prevChapterBtn');
const nextChapterBtn = document.getElementById('nextChapterBtn');

const nodeModal = document.getElementById('nodeModal');
const nodeModalBox = document.getElementById('nodeModalBox');

let studentData = {};
let content = null;
let chapterIndex = 0;

if (!seasonId || !SEASON_CONTENT[seasonId]) {
  window.location.href = 'dashboard.html';
} else {
  init();
}

async function init() {
  const studentRef = doc(db, 'students', email);
  const snap = await getDoc(studentRef);
  studentData = snap.exists() ? snap.data() : {};

  // Gate checks use the JS defaults (not admin overrides) so entering a
  // season never requires an extra fetch of the PRIOR season's override
  // doc. Fine while overrides are rare/empty (M4 hasn't shipped yet);
  // if an admin later removes/adds nodes in a prior season, revisit this.
  if (!isSeasonUnlocked(seasonId, studentData)) {
    window.location.href = 'dashboard.html';
    return;
  }

  const overrideSnap = await getDoc(doc(db, 'settings', `seasonContent_${seasonId}`));
  const override = overrideSnap.exists() ? overrideSnap.data() : null;
  content = mergeSeasonContent(seasonId, override);

  seasonShell.dataset.theme = content.theme;
  seasonNameEl.textContent = content.seasonName;
  seasonSubtitleEl.textContent = content.subtitle;
  seasonModuleLabel.textContent = content.moduleAlignment;

  // Resume at the first chapter that isn't fully complete yet.
  chapterIndex = content.chapters.findIndex((ch) => !isChapterComplete(ch, studentData));
  if (chapterIndex === -1) chapterIndex = content.chapters.length - 1;

  renderChapter();

  prevChapterBtn.onclick = () => {
    if (chapterIndex > 0) { chapterIndex--; renderChapter(); }
  };
  nextChapterBtn.onclick = () => {
    if (chapterIndex < content.chapters.length - 1) { chapterIndex++; renderChapter(); }
  };
}

// ================================
// GATING / COMPLETION (derived, nothing stored redundantly —
// mirrors the existing prelimSeasonDone() pattern in dashboard.html)
// ================================

function isSeasonUnlocked(id, data) {
  if (id === 'midterm') return !!data.midtermUnlocked;
  if (id === 'semifinal') return isSeasonComplete('midterm', data);
  if (id === 'final') return isSeasonComplete('semifinal', data);
  return false;
}

function isSeasonComplete(id, data) {
  const seasonDefaults = SEASON_CONTENT[id];
  if (!seasonDefaults) return false;
  return seasonDefaults.chapters.every((ch) => isChapterComplete(ch, data));
}

function isChapterComplete(chapter, data) {
  const completed = data.completedNodes || {};
  return chapter.nodes.every((n) => !!completed[n.nodeId]);
}

// ================================
// RENDERING
// ================================

function renderChapter() {
  const chapter = content.chapters[chapterIndex];
  chapterTitleEl.textContent = chapter.chapterTitle;
  chapterBasedOnEl.textContent = chapter.basedOn;
  chapterProgressEl.textContent = `Chapter ${chapterIndex + 1} of ${content.chapters.length}`;

  prevChapterBtn.disabled = chapterIndex === 0;
  nextChapterBtn.disabled = chapterIndex === content.chapters.length - 1;

  // Chapters before this one must be fully done for THIS chapter's nodes
  // to be interactive — chapters themselves are always freely browsable
  // for preview (per the spec's "preview or advance" language), only the
  // nodes inside a not-yet-reached chapter render locked.
  const priorChaptersComplete = content.chapters
    .slice(0, chapterIndex)
    .every((ch) => isChapterComplete(ch, studentData));

  const completedNodes = studentData.completedNodes || {};

  seasonPathEl.innerHTML = '';

  chapter.nodes.forEach((node, i) => {
    const completed = !!completedNodes[node.nodeId];
    const priorNodeDone = i === 0 || !!completedNodes[chapter.nodes[i - 1].nodeId];
    const available = !completed && priorChaptersComplete && priorNodeDone;
    const state = completed ? 'completed' : available ? 'available' : 'locked';

    const nodeEl = document.createElement('button');
    nodeEl.type = 'button';
    nodeEl.className = `path-node state-${state}`;
    nodeEl.disabled = state !== 'available';

    const icon = completed ? '🚩' : state === 'locked' ? '🔒' : NODE_TYPE_ICON[node.type];
    nodeEl.innerHTML = `
      <span class="path-node-icon">${icon}</span>
      <span class="path-node-label">${node.title}</span>
    `;

    if (state === 'available') {
      nodeEl.onclick = () => openNodeModal(node);
    }

    seasonPathEl.appendChild(nodeEl);

    if (i < chapter.nodes.length - 1) {
      const connector = document.createElement('div');
      connector.className = `path-connector${completed ? ' is-lit' : ''}`;
      seasonPathEl.appendChild(connector);
    }
  });

  renderTicketBar(chapter);
}

function renderTicketBar(chapter) {
  const completedNodes = studentData.completedNodes || {};
  const required = {};
  const current = {};

  Object.keys(TICKET_INFO).forEach((key) => { required[key] = 0; current[key] = 0; });

  chapter.nodes.forEach((node) => {
    required[node.ticketReward] = (required[node.ticketReward] || 0) + 1;
    if (completedNodes[node.nodeId]) {
      current[node.ticketReward] = (current[node.ticketReward] || 0) + 1;
    }
  });

  const scrapTotal = (studentData.tickets && studentData.tickets.scrap_ticket) || 0;

  ticketBar.innerHTML = '';

  Object.entries(TICKET_INFO).forEach(([key, info]) => {
    const slot = document.createElement('div');
    slot.className = 'ticket-slot';
    const countText = key === 'scrap_ticket' ? `${scrapTotal}` : `${current[key]}/${required[key]}`;
    slot.innerHTML = `
      <span class="ticket-slot-icon">${info.icon}</span>
      <span class="ticket-slot-count">${countText}</span>
    `;
    slot.title = info.label;
    ticketBar.appendChild(slot);
  });
}

// ================================
// NODE MODAL — one modal, content swapped per node type
// ================================

function openNodeModal(node) {
  nodeModal.classList.remove('hidden');

  if (node.type === 'quiz') renderQuizModal(node);
  else if (node.type === 'journal') renderTextModal(node, { minLength: 100 });
  else if (node.type === 'recitation') renderTextModal(node, { minLength: 40 });
  else if (node.type === 'task') renderTaskModal(node);
}

function closeNodeModal() {
  nodeModal.classList.add('hidden');
  nodeModalBox.innerHTML = '';
}

function modalCloseButtonHtml() {
  return `<button class="back-btn" id="nodeModalCloseBtn">Close</button>`;
}

function wireCloseButton() {
  const btn = document.getElementById('nodeModalCloseBtn');
  if (btn) btn.onclick = closeNodeModal;
}

// --- Quiz ---

function quizCooldownKey(node) {
  return `season_quiz_cooldown_${node.nodeId}_${email}`;
}

function isQuizOnCooldown(node) {
  const end = parseInt(localStorage.getItem(quizCooldownKey(node)) || '0');
  return end > Date.now();
}

function renderQuizModal(node) {
  if (isQuizOnCooldown(node)) {
    renderQuizCooldown(node);
    return;
  }

  nodeModalBox.innerHTML = `
    <h2>${NODE_TYPE_HEADING_ICON.quiz} ${node.title}</h2>
    <p class="reflection-hint">${node.prompt}</p>
    <div id="seasonQuizContainer"></div>
    <p id="seasonQuizStatus" class="puzzle-status"></p>
    <div class="reflection-modal-actions">
      ${modalCloseButtonHtml()}
    </div>
  `;
  wireCloseButton();

  const quizContainer = document.getElementById('seasonQuizContainer');
  const statusEl = document.getElementById('seasonQuizStatus');

  node.questions.forEach((q, index) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question';

    const qText = document.createElement('div');
    qText.className = 'quiz-question-text';
    qText.textContent = `${index + 1}. ${q.text}`;
    qDiv.appendChild(qText);

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'quiz-options';

    q.choices.forEach((choice, choiceIndex) => {
      const label = document.createElement('label');
      label.className = 'quiz-option';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `season-question-${index}`;
      radio.value = choiceIndex;

      label.appendChild(radio);
      label.append(choice);
      optionsDiv.appendChild(label);
    });

    qDiv.appendChild(optionsDiv);
    quizContainer.appendChild(qDiv);
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'submit-quiz-btn';
  submitBtn.textContent = 'Submit Answers';
  submitBtn.onclick = () => handleQuizSubmit(node, statusEl);
  quizContainer.appendChild(submitBtn);
}

async function handleQuizSubmit(node, statusEl) {
  let allAnswered = true;
  let allCorrect = true;

  node.questions.forEach((q, index) => {
    const selected = document.querySelector(`input[name="season-question-${index}"]:checked`);
    if (!selected) { allAnswered = false; return; }
    if (parseInt(selected.value) !== q.correctIndex) allCorrect = false;
  });

  if (!allAnswered) {
    statusEl.textContent = 'Please answer every question before submitting.';
    return;
  }

  if (allCorrect) {
    statusEl.textContent = '🎉 Correct! Ticket awarded.';
    await awardNode(node);
    setTimeout(closeNodeModal, 1200);
  } else {
    const cooldownEnd = Date.now() + 30 * 1000;
    localStorage.setItem(quizCooldownKey(node), cooldownEnd);
    renderQuizCooldown(node);
  }
}

function renderQuizCooldown(node) {
  nodeModalBox.innerHTML = `
    <h2>${NODE_TYPE_HEADING_ICON.quiz} ${node.title}</h2>
    <p class="puzzle-status" id="seasonQuizCooldownText"></p>
    <div class="reflection-modal-actions">
      ${modalCloseButtonHtml()}
    </div>
  `;
  wireCloseButton();

  const cooldownText = document.getElementById('seasonQuizCooldownText');

  const tick = () => {
    if (!nodeModalBox.contains(cooldownText)) return;

    const end = parseInt(localStorage.getItem(quizCooldownKey(node)) || '0');
    const remaining = end - Date.now();

    if (remaining <= 0) {
      renderQuizModal(node);
      return;
    }

    cooldownText.textContent = `⏳ Not quite right — try again in ${Math.ceil(remaining / 1000)}s`;
    setTimeout(tick, 250);
  };

  tick();
}

// --- Journal / Recitation (written response) ---

function renderTextModal(node, { minLength }) {
  const icon = NODE_TYPE_HEADING_ICON[node.type];

  nodeModalBox.innerHTML = `
    <h2>${icon} ${node.title}</h2>
    <p class="reflection-hint">${node.prompt}</p>
    <textarea id="seasonTextInput" class="reflection-textarea" placeholder="Write your response here…"></textarea>
    <p class="reflection-hint" id="seasonTextHint">Write at least a short response (${minLength} characters) in your own words — pasting is disabled.</p>
    <div class="reflection-modal-actions">
      ${modalCloseButtonHtml()}
      <button class="submit-quiz-btn" id="seasonTextSubmitBtn">Submit</button>
    </div>
  `;
  wireCloseButton();

  const textarea = document.getElementById('seasonTextInput');
  const hint = document.getElementById('seasonTextHint');

  blockPasteInto(textarea, () => {
    hint.textContent = "Pasting isn't allowed here — please write it yourself.";
  });

  document.getElementById('seasonTextSubmitBtn').onclick = async () => {
    const text = textarea.value.trim();

    if (text.length < minLength) {
      hint.textContent = `Please write a bit more — ${minLength - text.length} characters to go.`;
      return;
    }

    await awardNode(node);
    closeNodeModal();
  };
}

function blockPasteInto(textarea, onBlocked) {
  const block = (event) => {
    event.preventDefault();
    onBlocked();
  };

  textarea.addEventListener('paste', block);
  textarea.addEventListener('drop', block);
  textarea.addEventListener('contextmenu', (event) => event.preventDefault());
}

// --- Task (simple confirmation) ---

function renderTaskModal(node) {
  nodeModalBox.innerHTML = `
    <h2>${NODE_TYPE_HEADING_ICON.task} ${node.title}</h2>
    <p class="reflection-hint">${node.prompt}</p>
    <div class="reflection-modal-actions">
      ${modalCloseButtonHtml()}
      <button class="submit-quiz-btn" id="seasonTaskCompleteBtn">Mark Complete</button>
    </div>
  `;
  wireCloseButton();

  document.getElementById('seasonTaskCompleteBtn').onclick = async () => {
    await awardNode(node);
    closeNodeModal();
  };
}

// ================================
// AWARD — ticket + node completion, "boss moment" activity posts
// ================================

async function awardNode(node) {
  const studentRef = doc(db, 'students', email);

  const tickets = { ...(studentData.tickets || {}) };
  tickets[node.ticketReward] = (tickets[node.ticketReward] || 0) + 1;

  const completedNodes = { ...(studentData.completedNodes || {}), [node.nodeId]: true };

  await setDoc(studentRef, { tickets, completedNodes }, { merge: true });

  studentData.tickets = tickets;
  studentData.completedNodes = completedNodes;

  const chapter = content.chapters[chapterIndex];

  if (isChapterComplete(chapter, studentData)) {
    logActivity({
      email, name, type: 'season',
      title: `Completed "${chapter.chapterTitle}" in ${content.seasonName}`,
      icon: '🏁'
    });
  }

  if (content.chapters.every((ch) => isChapterComplete(ch, studentData))) {
    logActivity({
      email, name, type: 'season',
      title: `Completed ${content.seasonName} — ${content.subtitle}`,
      icon: '👑'
    });
  }

  renderChapter();
}
