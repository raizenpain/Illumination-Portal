import { db, doc, getDoc, updateDoc, increment, arrayUnion } from './firebase.js';
import { requireLogin } from './auth.js';
import { SEASON_CONTENT, mergeSeasonContent } from './seasonContent.js';
import { CHAPTER_LESSONS } from './chapterLessons.js';
import { ADMIN_EMAILS } from './admins.js';
import { logActivity } from './activity.js';
import { taskBadgeId, chapterBadgeId, seasonBadgeId } from './seasonBadges.js';
import { findBannedWord, looksLikeGibberish, isOffTopic } from './contentFilter.js';
import { getRankProgress, getSeasonStars, RANK_TIERS, starIndexOfChapter } from './rank.js';
import { ensureRankPopup, openRankPopup, renderStarPopup, renderRankPopup, renderChampionPopup, renderNoticePopup } from './rankPopup.js';
import { TICKET_INFO } from './ticketTrader.js';

const { email, name } = requireLogin();
const isSeasonPreviewAdmin = ADMIN_EMAILS.includes(email);

const params = new URLSearchParams(window.location.search);
const seasonId = params.get('season');

const NODE_TYPE_ICON = { quiz: '📝', task: '🎯', journal: '📖', recitation: '🗣️', identification: '🔍', game: '⚔️' };
const NODE_TYPE_HEADING_ICON = { quiz: '📝', task: '🎯', journal: '📖', recitation: '🗣️', identification: '🔍', game: '⚔️' };

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
// mirrors the existing isPrelimSeasonDone() pattern in rank.js)
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

  const add = (into, rewards) => Object.entries(rewards).forEach(([k, n]) => { into[k] = (into[k] || 0) + n; });
  chapter.nodes.forEach((node) => {
    const rewards = nodeTicketRewards(node, chapter);
    add(required, rewards);
    if (completedNodes[node.nodeId]) add(current, rewards);
  });
  const bonus = chapterBonusFor(chapter);
  add(required, bonus);
  if (isChapterComplete(chapter, studentData)) add(current, bonus);

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

// A game node (the Semifinal boss battle, the Final Season's Red Sea
// crossing) runs full-screen instead of the modal, and is completed only
// by winning. Loaded on demand so no one downloads a game they can't play.
const GAME_MODULES = {
  shadowBoss: () => import('./shadowBoss.js').then((m) => m.playShadowBoss),
  redSea: () => import('./redSea.js').then((m) => m.playRedSea)
};
let gameRunning = false;
async function playGameNode(node) {
  if (gameRunning) return;
  gameRunning = true;
  try {
    const chapter = content.chapters[chapterIndex];
    const total = { ...nodeTicketRewards(node, chapter) };
    Object.entries(chapterBonusFor(chapter)).forEach(([k, n]) => { total[k] = (total[k] || 0) + n; });
    const rewards = ALL_TICKET_TYPES.filter((t) => total[t]).map((t) => `${TICKET_INFO[t].icon} +${total[t]} ${TICKET_INFO[t].label}`);
    const loader = GAME_MODULES[node.game];
    if (!loader) throw new Error(`Unknown game: ${node.game}`);
    const play = await loader();
    const result = await play({ rewards });
    if (result === 'win') await awardNode(node);
  } catch (err) {
    console.error('Game node failed:', err);
    alert('The battle could not be saved. Please check your connection and try again.');
  } finally {
    gameRunning = false;
  }
}

function openNodeModal(node) {
  if (node.type === 'game') { playGameNode(node); return; }
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
  // title, so this shallow copy flows through them safely. Question
  // order was already shuffled here; each question's own CHOICE order
  // was not, so the correct answer always sat in the same position for
  // a given question regardless of question order -- easy to memorize
  // by position alone without reading the question. Now shuffles each
  // question's choices too, remapping correctIndex to wherever the
  // originally-correct choice landed, so handleQuizSubmit's grading
  // (which just compares against q.correctIndex) keeps working
  // unchanged against the new positions.
  const shuffleChoices = (q) => {
    const order = shuffleArray(q.choices.map((_, i) => i));
    return { ...q, choices: order.map((i) => q.choices[i]), correctIndex: order.indexOf(q.correctIndex) };
  };
  const displayNode = { ...node, questions: shuffleArray(node.questions).map(shuffleChoices) };

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

    const bannedWord = findBannedWord(text, { coursework: true });
    if (bannedWord) {
      hint.textContent = `Your response contains a word that isn't allowed here: "${bannedWord}". Please reword that part and try again.`;
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

// Resolvers waiting for the queue to run dry (the season-complete
// redirect waits on this, so it never cuts a popup short).
const popupsDoneWaiters = [];

function whenPopupsDone() {
  if (!popupBusy && popupQueue.length === 0) return Promise.resolve();
  return new Promise((resolve) => popupsDoneWaiters.push(resolve));
}

function processPopupQueue() {
  if (popupBusy) return;
  if (popupQueue.length === 0) {
    popupsDoneWaiters.splice(0).forEach((resolve) => resolve());
    return;
  }
  popupBusy = true;

  const item = popupQueue.shift();

  if (item.kind === 'star' || item.kind === 'rank' || item.kind === 'champion' || item.kind === 'notice') {
    ensureRankPopup();
    if (item.kind === 'star') renderStarPopup(item);
    else if (item.kind === 'rank') renderRankPopup(item);
    else if (item.kind === 'notice') renderNoticePopup(item);
    else renderChampionPopup(item);

    // Waits for Continue (no auto-close: it was too fast to read).
    openRankPopup().then(() => {
      popupBusy = false;
      setTimeout(processPopupQueue, 250);
    });
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

function showChampionPopup(info) {
  queuePopup({ kind: 'champion', ...info });
}

function showAchievement(title, text, icon) {
  queuePopup({ title, text, icon });
}

// Catechism Moments use the dark popup and wait for Continue — they're
// meant to be read and prayed over, not flashed for 3 seconds.
function showLesson(lesson) {
  queuePopup({ kind: 'notice', kicker: '✦ Catechism Moment ✦', sub: '', icon: '✝️', eyebrow: '', heading: lesson.title, detail: lesson.text, lesson: true });
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

// Jornie 2026-10-05: every task in EVERY chapter (the exam chapters too)
// gives +10 of every ticket type on top of its usual ticket, so a full
// Legendary chain (125 tokens) stays reachable. Finishing a normal
// chapter gives +5 of every type (shown on "A Star Ignites!"); the exam
// chapters keep their CAPSTONE_BONUS instead.
const TASK_BONUS = 10;
const NORMAL_CHAPTER_BONUS = 5;
const ALL_TICKET_TYPES = ['quiz_ticket', 'task_ticket', 'journal_ticket', 'recitation_ticket', 'scrap_ticket'];
const isNormalChapter = (chapter) => !(chapter.chapterId in CAPSTONE_BONUS);

/** Every ticket one task pays out, by type (the Ember Shard included). */
function nodeTicketRewards(node, chapter) {
  const rewards = {};
  const add = (type, n) => { rewards[type] = (rewards[type] || 0) + n; };
  if (node.ticketReward) add(node.ticketReward, ticketAmountFor(node));
  // Ember Shard: 1 on every task, even the no-ticket exam chapters, so
  // they still feed the Ember Shard catch-up trade.
  add('scrap_ticket', 1);
  ALL_TICKET_TYPES.forEach((type) => add(type, TASK_BONUS));
  return rewards;
}

// Short names for the one-line "Earned:" summary on the task popup.
const TICKET_SHORT = { quiz_ticket: 'Sigil', task_ticket: 'Seal', journal_ticket: 'Scroll', recitation_ticket: 'Herald', scrap_ticket: 'Ember Shard' };
const ticketSummary = (rewards) => ALL_TICKET_TYPES.filter((t) => rewards[t]).map((t) => `+${rewards[t]} ${TICKET_SHORT[t]}`).join(' · ');

/** The one-time bonus for finishing a whole chapter, by type. */
function chapterBonusFor(chapter) {
  const rewards = {};
  if (isNormalChapter(chapter)) {
    // A chapter can set its own bonus (the Semifinal boss pays 20, so the
    // battle totals 30 of every ticket with its task reward).
    const bonus = Number.isFinite(chapter.chapterBonus) ? chapter.chapterBonus : NORMAL_CHAPTER_BONUS;
    ALL_TICKET_TYPES.forEach((type) => { rewards[type] = bonus; });
  } else {
    ['quiz_ticket', 'task_ticket', 'journal_ticket', 'recitation_ticket'].forEach((type) => { rewards[type] = CAPSTONE_BONUS[chapter.chapterId]; });
  }
  return rewards;
}

// Finishing an ENTIRE season is worth Artifact Unlock Tokens outright,
// on top of whatever tickets/tokens the student earned along the way.
// Set by Jornie on 2026-10-05 (were none / 1 / 1); Prelim has none.
const SEASON_COMPLETION_TOKEN_BONUS = { midterm: 5, semifinal: 11, final: 26 };

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
  const chapter = content.chapters[chapterIndex];
  const taskRewards = nodeTicketRewards(node, chapter);
  Object.entries(taskRewards).forEach(([type, amount]) => {
    tickets[type] = (tickets[type] || 0) + amount;
    addTicketDelta(type, amount);
  });

  const completedNodes = { ...(studentData.completedNodes || {}), [node.nodeId]: true };
  const checkData = { ...studentData, completedNodes };

  const nodeSubmissions = { ...(studentData.nodeSubmissions || {}) };
  if (submissionText) {
    nodeSubmissions[node.nodeId] = submissionText;
  }

  const chapterJustCompleted = isChapterComplete(chapter, checkData);
  const seasonJustCompleted = content.chapters.every((ch) => isChapterComplete(ch, checkData));

  const chapterBonus = chapterJustCompleted ? chapterBonusFor(chapter) : {};
  Object.entries(chapterBonus).forEach(([type, amount]) => {
    tickets[type] = (tickets[type] || 0) + amount;
    addTicketDelta(type, amount);
  });

  const rankBefore = getRankProgress(studentData);
  const rankAfter = getRankProgress(checkData);

  const achievements = [...(studentData.achievements || [])];
  const newAchievementIds = [];
  let championPopup = null;

  const taskId = taskBadgeId(node.nodeId);
  if (!achievements.includes(taskId)) {
    achievements.push(taskId);
    newAchievementIds.push(taskId);
    showAchievement(node.title, `Task completed — ${content.seasonName}\nEarned: ${ticketSummary(taskRewards)}`, NODE_TYPE_ICON[node.type]);
  }

  const chId = chapterBadgeId(chapter.chapterId);
  if (chapterJustCompleted && !achievements.includes(chId)) {
    achievements.push(chId);
    newAchievementIds.push(chId);
    showAchievement(chapter.chapterTitle, `Chapter completed — ${content.seasonName}`, '🏁');

    const lesson = CHAPTER_LESSONS[chapter.chapterId];
    if (lesson) {
      showLesson(lesson);
    }
  }

  let unlockTokens = studentData.unlockTokens || 0;
  let unlockTokenDelta = 0;

  const seId = seasonBadgeId(seasonId);
  if (seasonJustCompleted && !achievements.includes(seId)) {
    achievements.push(seId);
    newAchievementIds.push(seId);
    const tokenBonus = SEASON_COMPLETION_TOKEN_BONUS[seasonId];
    if (tokenBonus) {
      unlockTokens += tokenBonus;
      unlockTokenDelta += tokenBonus;
    }
    // Queued after the star / rank popups below, so it's the last word
    // before the certificate.
    championPopup = { seasonName: content.seasonName, subtitle: content.subtitle, tokenBonus: tokenBonus || 0 };
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

    const chapterRewards = Object.entries(chapterBonus).map(([type, amount]) => ({ icon: TICKET_INFO[type].icon, label: TICKET_INFO[type].label, amount }));
    if (chapter.noStar) {
      // A game chapter earns no star: a "chapter cleared" notice instead.
      queuePopup({
        kind: 'notice',
        kicker: '✦ Chapter Cleared ✦',
        sub: `${chapter.chapterTitle} — ${content.seasonName}`,
        icon: chapter.clearedIcon || '⚔️',
        eyebrow: chapter.clearedLabel || 'Challenge Complete',
        heading: chapter.chapterTitle,
        detail: 'No star for this challenge, but the way forward is open, and the rewards are yours.',
        rewards: chapterRewards.map((r) => `<span class="popup-reward-icon">${r.icon}</span> +${r.amount} ${r.label}`)
      });
    } else {
      showStarPopup({
        rank: rankBefore.rank,
        stars: getSeasonStars(seasonId, checkData),
        // Star position counts only star chapters (a noStar game chapter
        // before the exam would otherwise shift it by one).
        justEarnedIndex: starIndexOfChapter(seasonId, chapter.chapterId),
        subtitle: `${chapter.chapterTitle} — ${content.seasonName}`,
        rewards: chapterRewards
      });
    }
  }

  if (rankAfter.rank !== rankBefore.rank) {
    logActivity({
      email, name, type: 'rank',
      title: `Reached ${rankAfter.rank} Rank`,
      icon: '⭐'
    });

    const nextTier = RANK_TIERS.find((t) => t.rank === rankAfter.rank);
    showRankPopup({ rank: rankAfter.rank, seasonName: nextTier ? nextTier.seasonName : null });
  }

  if (seasonJustCompleted) {
    logActivity({
      email, name, type: 'season',
      title: `Completed ${content.seasonName} — ${content.subtitle}`,
      icon: '👑'
    });

    if (championPopup) showChampionPopup(championPopup);
    // On to the certificate once every popup has been read and closed.
    whenPopupsDone().then(() => {
      setTimeout(() => { window.location.href = `season-completion.html?season=${seasonId}`; }, 400);
    });
  }

  renderChapter();
}
