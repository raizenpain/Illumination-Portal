import { db, doc, getDoc, updateDoc, increment, arrayUnion } from './firebase.js';
import { requireLogin } from './auth.js';
import { SEASON_CONTENT, mergeSeasonContent } from './seasonContent.js';
import { CHAPTER_LESSONS } from './chapterLessons.js';
import { ADMIN_EMAILS } from './admins.js';
import { logActivity } from './activity.js';
import { taskBadgeId, chapterBadgeId, seasonBadgeId } from './seasonBadges.js';
import { containsBannedWord, looksLikeGibberish, isOffTopic } from './contentFilter.js';
import { getRankProgress, getSeasonStars, RANK_TIERS } from './rank.js';
import { ensureRankPopup, renderStarPopup, renderRankPopup } from './rankPopup.js';

const { email, name } = requireLogin();
const isSeasonPreviewAdmin = ADMIN_EMAILS.includes(email);

const params = new URLSearchParams(window.location.search);
const seasonId = params.get('season');

const TICKET_INFO = {
  quiz_ticket: { icon: '📝', label: 'Sigil of Insight' },
  task_ticket: { icon: '🎯', label: 'Seal of Diligence' },
  journal_ticket: { icon: '📖', label: 'Scroll of Reflection' },
  recitation_ticket: { icon: '🗣️', label: "Herald's Voice" },
  scrap_ticket: { icon: '♻️', label: 'Ember Shard' }
};

const NODE_TYPE_ICON = { quiz: '📝', task: '🎯', journal: '📖', recitation: '🗣️', identification: '🔍' };
const NODE_TYPE_HEADING_ICON = { quiz: '📝', task: '🎯', journal: '📖', recitation: '🗣️', identification: '🔍' };

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
  if (isSeasonPreviewAdmin) return true; // Dungeon Master accounts can preview any season for testing
  if (id === 'midterm') return !!data.midtermUnlocked;
  if (id === 'semifinal') return isSeasonComplete('midterm', data) && !!data.semifinalUnlocked;
  if (id === 'final') return isSeasonComplete('semifinal', data) && !!data.finalUnlocked;
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
    if (!node.ticketReward) return;
    const amount = ticketAmountFor(node);
    required[node.ticketReward] = (required[node.ticketReward] || 0) + amount;
    if (completedNodes[node.nodeId]) {
      current[node.ticketReward] = (current[node.ticketReward] || 0) + amount;
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

  if (node.type === 'quiz' || node.type === 'identification') renderQuizModal(node);
  else if (node.type === 'journal') renderTextModal(node, { minLength: 100 });
  else if (node.type === 'recitation') renderTextModal(node, { minLength: 40 });
  else if (node.type === 'task') renderTextModal(node, { minLength: 100 });
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

// Fisher-Yates — used to reshuffle question order on every render, so
// two students (or the same student retrying after a cooldown) don't
// see item 1 land on the same question, discouraging "the answer to
// number 3 is B" answer-sharing.
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Feeds the "no mistakes" leaderboard filter (see leaderboard.js) — a
// running count on the student's own record, never reset, never shown
// to the student directly. Fire-and-forget: a failed write here should
// never block the retry/cooldown flow the student is actually waiting on.
function recordMistake() {
  updateDoc(doc(db, 'students', email), { mistakeCount: increment(1) })
    .catch((err) => console.error('Failed to record mistake:', err));
}

function renderQuizModal(node) {
  if (isQuizOnCooldown(node)) {
    renderQuizCooldown(node);
    return;
  }

  // A shuffled-order copy, not node.questions directly — awardNode()
  // and the cooldown helpers only ever read nodeId/ticketReward/type/
  // title, so this shallow copy flows through them safely.
  const displayNode = { ...node, questions: shuffleArray(node.questions) };

  nodeModalBox.innerHTML = `
    <h2>${NODE_TYPE_HEADING_ICON[node.type]} ${node.title}</h2>
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

  displayNode.questions.forEach((q, index) => {
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
  submitBtn.onclick = () => handleQuizSubmit(displayNode, statusEl, submitBtn);
  quizContainer.appendChild(submitBtn);
}

async function handleQuizSubmit(node, statusEl, submitBtn) {
  if (submitBtn.disabled) return;

  if (node.questions.length === 0) {
    statusEl.textContent = 'This quiz has no questions yet — please let your teacher know.';
    return;
  }

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

  submitBtn.disabled = true;

  if (allCorrect) {
    statusEl.textContent = '🎉 Correct! Ticket awarded.';
    await awardNode(node);
    setTimeout(closeNodeModal, 1200);
  } else {
    recordMistake();
    const cooldownEnd = Date.now() + 30 * 1000;
    localStorage.setItem(quizCooldownKey(node), cooldownEnd);
    renderQuizCooldown(node);
  }
}

function renderQuizCooldown(node) {
  nodeModalBox.innerHTML = `
    <h2>${NODE_TYPE_HEADING_ICON[node.type]} ${node.title}</h2>
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

  const textSubmitBtn = document.getElementById('seasonTextSubmitBtn');
  textSubmitBtn.onclick = async () => {
    if (textSubmitBtn.disabled) return;

    const text = textarea.value.trim();

    if (text.length < minLength) {
      hint.textContent = `Please write a bit more — ${minLength - text.length} characters to go.`;
      return;
    }

    if (containsBannedWord(text)) {
      hint.textContent = "That response contains language that isn't allowed here — please rewrite it.";
      recordMistake();
      return;
    }

    if (looksLikeGibberish(text)) {
      hint.textContent = "That doesn't look like a real written response — please write in complete sentences.";
      recordMistake();
      return;
    }

    if (isOffTopic(text, node.prompt, node.title)) {
      hint.textContent = "Your response doesn't seem to address the question — make sure you're actually answering what's asked.";
      recordMistake();
      return;
    }

    textSubmitBtn.disabled = true;
    await awardNode(node, text);
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

// ================================
// ACHIEVEMENT POPUPS — queued so a node that also completes its
// chapter and/or season gets a popup for each, one after another,
// same pattern as app.js's piece-collection popups.
// ================================

const popupQueue = [];
let popupBusy = false;

function queuePopup(popup) {
  popupQueue.push(popup);
  processPopupQueue();
}

function processPopupQueue() {
  if (popupBusy || popupQueue.length === 0) return;
  popupBusy = true;

  const item = popupQueue.shift();

  if (item.kind === 'star' || item.kind === 'rank') {
    ensureRankPopup();
    const overlay = document.getElementById('rankPopup');
    if (item.kind === 'star') renderStarPopup(item);
    else renderRankPopup(item);

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('show'));

    const dismiss = () => {
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.classList.add('hidden');
        popupBusy = false;
        setTimeout(processPopupQueue, 300);
      }, 300);
    };

    if (item.kind === 'rank') {
      const btn = document.getElementById('rankPopupContinue');
      const onClick = () => { btn.removeEventListener('click', onClick); dismiss(); };
      btn.addEventListener('click', onClick);
    } else {
      setTimeout(dismiss, 3200);
    }
    return;
  }

  const { heading = 'Achievement Unlocked!', title, text, icon = '🏅' } = item;
  const popup = document.getElementById('achievementPopup');
  document.getElementById('achievementHeading').textContent = heading;
  document.getElementById('achievementTitle').textContent = title;
  document.getElementById('achievementText').textContent = text;
  popup.querySelector('.achievement-icon').textContent = icon;

  popup.classList.remove('hidden');
  setTimeout(() => {
    popup.classList.add('hidden');
    popupBusy = false;
    setTimeout(processPopupQueue, 300);
  }, 3000);
}

function showAchievement(title, text, icon) {
  queuePopup({ title, text, icon });
}

function showLesson(lesson) {
  queuePopup({ heading: '📖 Catechism Moment', title: lesson.title, text: lesson.text, icon: '✝️' });
}

function showStarPopup(info) {
  queuePopup({ kind: 'star', ...info });
}

function showRankPopup(info) {
  queuePopup({ kind: 'rank', ...info });
}

// ================================
// AWARD — ticket + node completion, achievement badges, "boss
// moment" activity posts, and a certificate redirect on season completion
// ================================

// Per-node ticket amount, scaled by season (and, in Semifinal, by
// whether the node is a quiz/identification vs a written response —
// they share the ticketReward field, quiz_ticket, so that's what
// distinguishes them here).
function ticketAmountFor(node) {
  if (seasonId === 'midterm') return 3;
  if (seasonId === 'semifinal') return node.ticketReward === 'quiz_ticket' ? 5 : 3;
  if (seasonId === 'final') return 5;
  return 1;
}

// The Semifinal and Final comprehensive-exam capstone chapters award
// no per-node tickets (see their nodes' missing ticketReward) — instead
// they pay out a one-time bonus of every ticket type on full-chapter
// completion, handled below via chapterJustCompleted.
const CAPSTONE_BONUS = { semifinal_ch7: 2, final_ch11: 8 };

// Finishing the ENTIRE Semifinal or Final season is worth an Artifact
// Unlock Token outright, on top of whatever tickets/tokens the
// student earned along the way. Prelim/Midterm deliberately excluded.
const SEASON_COMPLETION_TOKEN_BONUS = { semifinal: 1, final: 1 };

async function awardNode(node, submissionText) {
  const studentRef = doc(db, 'students', email);

  // Local projection used only to DECIDE what just happened (chapter/
  // season completion, which achievements are new, rank before/after)
  // — never written to Firestore directly. The actual write below uses
  // per-field increment()/arrayUnion() so a concurrent write from
  // another tab (a trade, another node, etc.) can never clobber it.
  const ticketDeltas = {};
  const addTicketDelta = (type, amount) => {
    ticketDeltas[type] = (ticketDeltas[type] || 0) + amount;
  };

  const tickets = { ...(studentData.tickets || {}) };
  if (node.ticketReward) {
    const amount = ticketAmountFor(node);
    tickets[node.ticketReward] = (tickets[node.ticketReward] || 0) + amount;
    addTicketDelta(node.ticketReward, amount);
  }
  // Ember Shard — awarded on every node completion, regardless of
  // ticketReward, so even the no-ticket capstone chapters still feed
  // the Ember Shard catch-up trade. Always exactly 1, never scaled.
  tickets.scrap_ticket = (tickets.scrap_ticket || 0) + 1;
  addTicketDelta('scrap_ticket', 1);

  const completedNodes = { ...(studentData.completedNodes || {}), [node.nodeId]: true };
  const checkData = { ...studentData, completedNodes };

  const nodeSubmissions = { ...(studentData.nodeSubmissions || {}) };
  if (submissionText) {
    nodeSubmissions[node.nodeId] = submissionText;
  }

  const chapter = content.chapters[chapterIndex];
  const chapterJustCompleted = isChapterComplete(chapter, checkData);
  const seasonJustCompleted = content.chapters.every((ch) => isChapterComplete(ch, checkData));

  const capstoneBonus = CAPSTONE_BONUS[chapter.chapterId];
  if (chapterJustCompleted && capstoneBonus) {
    ['quiz_ticket', 'task_ticket', 'journal_ticket', 'recitation_ticket'].forEach((type) => {
      tickets[type] = (tickets[type] || 0) + capstoneBonus;
      addTicketDelta(type, capstoneBonus);
    });
  }

  const rankBefore = getRankProgress(studentData);
  const rankAfter = getRankProgress(checkData);

  const achievements = [...(studentData.achievements || [])];
  const newAchievementIds = [];
  let popupsQueued = 0;

  const taskId = taskBadgeId(node.nodeId);
  if (!achievements.includes(taskId)) {
    achievements.push(taskId);
    newAchievementIds.push(taskId);
    showAchievement(node.title, `Task completed — ${content.seasonName}`, NODE_TYPE_ICON[node.type]);
    popupsQueued++;
  }

  const chId = chapterBadgeId(chapter.chapterId);
  if (chapterJustCompleted && !achievements.includes(chId)) {
    achievements.push(chId);
    newAchievementIds.push(chId);
    showAchievement(chapter.chapterTitle, `Chapter completed — ${content.seasonName}`, '🏁');
    popupsQueued++;

    const lesson = CHAPTER_LESSONS[chapter.chapterId];
    if (lesson) {
      showLesson(lesson);
      popupsQueued++;
    }
  }

  let unlockTokens = studentData.unlockTokens || 0;
  let unlockTokenDelta = 0;

  const seId = seasonBadgeId(seasonId);
  if (seasonJustCompleted && !achievements.includes(seId)) {
    achievements.push(seId);
    newAchievementIds.push(seId);
    showAchievement(`${content.seasonName} Champion`, content.subtitle, '👑');
    popupsQueued++;

    const tokenBonus = SEASON_COMPLETION_TOKEN_BONUS[seasonId];
    if (tokenBonus) {
      unlockTokens += tokenBonus;
      unlockTokenDelta += tokenBonus;
    }
  }

  const update = {
    [`completedNodes.${node.nodeId}`]: true
  };
  Object.entries(ticketDeltas).forEach(([type, amount]) => {
    update[`tickets.${type}`] = increment(amount);
  });
  if (newAchievementIds.length > 0) {
    update.achievements = arrayUnion(...newAchievementIds);
  }
  if (submissionText) {
    update[`nodeSubmissions.${node.nodeId}`] = submissionText;
  }
  if (unlockTokenDelta > 0) {
    update.unlockTokens = increment(unlockTokenDelta);
  }

  await updateDoc(studentRef, update);

  studentData.tickets = tickets;
  studentData.completedNodes = completedNodes;
  studentData.achievements = achievements;
  studentData.nodeSubmissions = nodeSubmissions;
  studentData.unlockTokens = unlockTokens;

  if (chapterJustCompleted) {
    logActivity({
      email, name, type: 'season',
      title: `Completed "${chapter.chapterTitle}" in ${content.seasonName}`,
      icon: '🏁'
    });

    showStarPopup({
      rank: rankBefore.rank,
      stars: getSeasonStars(seasonId, checkData),
      justEarnedIndex: chapterIndex,
      subtitle: `${chapter.chapterTitle} — ${content.seasonName}`
    });
    popupsQueued++;
  }

  if (rankAfter.rank !== rankBefore.rank) {
    logActivity({
      email, name, type: 'rank',
      title: `Reached ${rankAfter.rank} Rank`,
      icon: '⭐'
    });

    const nextTier = RANK_TIERS.find((t) => t.rank === rankAfter.rank);
    showRankPopup({ rank: rankAfter.rank, seasonName: nextTier ? nextTier.seasonName : null });
    popupsQueued++;
  }

  if (seasonJustCompleted) {
    logActivity({
      email, name, type: 'season',
      title: `Completed ${content.seasonName} — ${content.subtitle}`,
      icon: '👑'
    });

    setTimeout(() => {
      window.location.href = `season-completion.html?season=${seasonId}`;
    }, Math.max(3000, popupsQueued * 3300));
  }

  renderChapter();
}
