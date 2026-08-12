// ============================================
// SEASON PATH EDITOR (Dungeon Master console)
// Lets an admin rewrite any season's chapter titles and node content
// (title, prompt, ticket reward, quiz questions) without touching
// code. Edits are written to settings/seasonContent_{seasonId} and
// merged over the JS defaults at runtime by seasonContent.js's
// mergeSeasonContent() — the exact same function this editor uses to
// show the CURRENTLY effective content (defaults + any prior edits).
//
// Node type and node count are intentionally not editable here (would
// strand quiz `questions` data or otherwise desync season.js's
// rendering) — retitle/reword/re-reward freely, but the task skeleton
// itself (how many nodes, what kind) stays as shipped.
// ============================================

import { db, doc, getDoc, setDoc } from './firebase.js';
import { SEASON_ORDER, SEASON_CONTENT, mergeSeasonContent } from './seasonContent.js';

const SEASON_IDS = SEASON_ORDER.filter((id) => id !== 'prelim');

const TICKET_OPTIONS = [
  ['quiz_ticket', '📝 Quiz Ticket'],
  ['task_ticket', '🎯 Task Ticket'],
  ['journal_ticket', '📖 Journal Ticket'],
  ['recitation_ticket', '🗣️ Recitation Ticket']
];

const NODE_TYPE_LABEL = { quiz: '📝 Quiz', task: '🎯 Task', journal: '📖 Journal', recitation: '🗣️ Recitation' };

let seasonTabsEl, chapterTabsEl, nodeListEl, statusEl;

const overridesCache = {};
const mergedCache = {};
let currentSeasonId = SEASON_IDS[0];
let currentChapterIndex = 0;
let draftChapter = null;

export function initSeasonEditor() {
  seasonTabsEl = document.getElementById('seasonEditorTabs');
  if (!seasonTabsEl) return;

  chapterTabsEl = document.getElementById('chapterEditorTabs');
  nodeListEl = document.getElementById('nodeEditorList');
  statusEl = document.getElementById('seasonEditorStatus');

  document.getElementById('saveChapterBtn').onclick = saveChapter;
  document.getElementById('resetChapterBtn').onclick = resetChapter;

  selectSeason(SEASON_IDS[0]);
}

async function loadSeasonOverride(seasonId) {
  if (overridesCache[seasonId] !== undefined) return overridesCache[seasonId];

  const snap = await getDoc(doc(db, 'settings', `seasonContent_${seasonId}`));
  const data = snap.exists() ? snap.data() : null;
  overridesCache[seasonId] = data;
  return data;
}

async function selectSeason(seasonId) {
  currentSeasonId = seasonId;
  currentChapterIndex = 0;
  statusEl.textContent = 'Loading…';

  const override = await loadSeasonOverride(seasonId);
  mergedCache[seasonId] = mergeSeasonContent(seasonId, override);

  renderSeasonTabs();
  selectChapter(0);
}

function renderSeasonTabs() {
  seasonTabsEl.innerHTML = '';

  SEASON_IDS.forEach((id) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'puzzle-tab' + (id === currentSeasonId ? ' active' : '');
    tab.textContent = SEASON_CONTENT[id].seasonName;
    tab.onclick = () => selectSeason(id);
    seasonTabsEl.appendChild(tab);
  });
}

function renderChapterTabs() {
  chapterTabsEl.innerHTML = '';

  mergedCache[currentSeasonId].chapters.forEach((ch, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'puzzle-tab' + (i === currentChapterIndex ? ' active' : '');
    tab.textContent = ch.chapterTitle;
    tab.onclick = () => selectChapter(i);
    chapterTabsEl.appendChild(tab);
  });
}

function selectChapter(i) {
  currentChapterIndex = i;
  draftChapter = JSON.parse(JSON.stringify(mergedCache[currentSeasonId].chapters[i]));
  renderChapterTabs();
  renderNodeEditor();
  statusEl.textContent = '';
}

function renderNodeEditor() {
  nodeListEl.innerHTML = '';

  const chapterCard = document.createElement('div');
  chapterCard.className = 'node-editor-card';

  const header = document.createElement('div');
  header.className = 'node-editor-header';
  const badge = document.createElement('span');
  badge.className = 'node-editor-type-badge';
  badge.textContent = 'Chapter';
  header.appendChild(badge);
  chapterCard.appendChild(header);

  const titleLabel = document.createElement('label');
  titleLabel.className = 'node-editor-label';
  titleLabel.textContent = 'Chapter Title';
  chapterCard.appendChild(titleLabel);

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'node-editor-input';
  titleInput.value = draftChapter.chapterTitle;
  titleInput.oninput = (e) => { draftChapter.chapterTitle = e.target.value; };
  chapterCard.appendChild(titleInput);

  const basedOnLabel = document.createElement('label');
  basedOnLabel.className = 'node-editor-label';
  basedOnLabel.textContent = 'Based On (shown under the chapter title)';
  chapterCard.appendChild(basedOnLabel);

  const basedOnInput = document.createElement('textarea');
  basedOnInput.className = 'node-editor-textarea';
  basedOnInput.value = draftChapter.basedOn;
  basedOnInput.oninput = (e) => { draftChapter.basedOn = e.target.value; };
  chapterCard.appendChild(basedOnInput);

  nodeListEl.appendChild(chapterCard);

  draftChapter.nodes.forEach((node, nodeIndex) => {
    nodeListEl.appendChild(buildNodeCard(nodeIndex));
  });
}

function buildNodeCard(nodeIndex) {
  const node = draftChapter.nodes[nodeIndex];

  const card = document.createElement('div');
  card.className = 'node-editor-card';

  const header = document.createElement('div');
  header.className = 'node-editor-header';

  const typeBadge = document.createElement('span');
  typeBadge.className = 'node-editor-type-badge';
  typeBadge.textContent = NODE_TYPE_LABEL[node.type] || node.type;
  header.appendChild(typeBadge);

  const idLabel = document.createElement('span');
  idLabel.className = 'node-editor-id';
  idLabel.textContent = node.nodeId;
  header.appendChild(idLabel);

  card.appendChild(header);

  const titleLabel = document.createElement('label');
  titleLabel.className = 'node-editor-label';
  titleLabel.textContent = 'Title';
  card.appendChild(titleLabel);

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'node-editor-input';
  titleInput.value = node.title;
  titleInput.oninput = (e) => { draftChapter.nodes[nodeIndex].title = e.target.value; };
  card.appendChild(titleInput);

  const promptLabel = document.createElement('label');
  promptLabel.className = 'node-editor-label';
  promptLabel.textContent = 'Prompt';
  card.appendChild(promptLabel);

  const promptInput = document.createElement('textarea');
  promptInput.className = 'node-editor-textarea';
  promptInput.value = node.prompt;
  promptInput.oninput = (e) => { draftChapter.nodes[nodeIndex].prompt = e.target.value; };
  card.appendChild(promptInput);

  const rewardLabel = document.createElement('label');
  rewardLabel.className = 'node-editor-label';
  rewardLabel.textContent = 'Ticket Reward';
  card.appendChild(rewardLabel);

  const rewardSelect = document.createElement('select');
  rewardSelect.className = 'node-editor-input';
  TICKET_OPTIONS.forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    rewardSelect.appendChild(opt);
  });
  rewardSelect.value = node.ticketReward;
  rewardSelect.onchange = (e) => { draftChapter.nodes[nodeIndex].ticketReward = e.target.value; };
  card.appendChild(rewardSelect);

  if (node.type === 'quiz') {
    card.appendChild(buildQuestionsEditor(nodeIndex));
  }

  return card;
}

function buildQuestionsEditor(nodeIndex) {
  const wrap = document.createElement('div');
  wrap.className = 'node-editor-questions';

  const heading = document.createElement('label');
  heading.className = 'node-editor-label';
  heading.textContent = 'Quiz Questions — students must answer every one correctly to pass';
  wrap.appendChild(heading);

  const list = document.createElement('div');
  wrap.appendChild(list);

  const renderQuestions = () => {
    list.innerHTML = '';
    draftChapter.nodes[nodeIndex].questions.forEach((q, qIndex) => {
      list.appendChild(buildQuestionRow(nodeIndex, qIndex, renderQuestions));
    });
  };
  renderQuestions();

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'back-btn node-editor-add-q';
  addBtn.textContent = '+ Add Question';
  addBtn.onclick = () => {
    draftChapter.nodes[nodeIndex].questions.push({ text: '', choices: ['', '', '', ''], correctIndex: 0 });
    renderQuestions();
  };
  wrap.appendChild(addBtn);

  return wrap;
}

function buildQuestionRow(nodeIndex, qIndex, onChange) {
  const q = draftChapter.nodes[nodeIndex].questions[qIndex];

  const row = document.createElement('div');
  row.className = 'node-editor-question';

  const qLabel = document.createElement('label');
  qLabel.className = 'node-editor-label';
  qLabel.textContent = `Question ${qIndex + 1} (pick the correct choice with the radio button)`;
  row.appendChild(qLabel);

  const qInput = document.createElement('input');
  qInput.type = 'text';
  qInput.className = 'node-editor-input';
  qInput.value = q.text;
  qInput.oninput = (e) => { q.text = e.target.value; };
  row.appendChild(qInput);

  const choicesWrap = document.createElement('div');
  choicesWrap.className = 'node-editor-choices';

  q.choices.forEach((choice, choiceIndex) => {
    const choiceRow = document.createElement('div');
    choiceRow.className = 'node-editor-choice';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `correct-${nodeIndex}-${qIndex}`;
    radio.checked = q.correctIndex === choiceIndex;
    radio.onchange = () => { q.correctIndex = choiceIndex; };
    choiceRow.appendChild(radio);

    const choiceInput = document.createElement('input');
    choiceInput.type = 'text';
    choiceInput.className = 'node-editor-input';
    choiceInput.value = choice;
    choiceInput.oninput = (e) => { q.choices[choiceIndex] = e.target.value; };
    choiceRow.appendChild(choiceInput);

    choicesWrap.appendChild(choiceRow);
  });

  row.appendChild(choicesWrap);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'back-btn node-editor-remove-q';
  removeBtn.textContent = 'Remove Question';
  removeBtn.onclick = () => {
    draftChapter.nodes[nodeIndex].questions.splice(qIndex, 1);
    onChange();
  };
  row.appendChild(removeBtn);

  return row;
}

async function saveChapter() {
  statusEl.textContent = 'Saving…';

  try {
    const currentOverride = (await loadSeasonOverride(currentSeasonId)) || { chapters: [] };
    const chapters = (currentOverride.chapters || []).filter((ch) => ch.chapterId !== draftChapter.chapterId);
    chapters.push(draftChapter);

    await setDoc(doc(db, 'settings', `seasonContent_${currentSeasonId}`), { chapters }, { merge: true });

    overridesCache[currentSeasonId] = { ...currentOverride, chapters };
    mergedCache[currentSeasonId] = mergeSeasonContent(currentSeasonId, overridesCache[currentSeasonId]);

    statusEl.textContent = '✅ Saved! Students see this the next time they open the season.';
  } catch (err) {
    console.error('Failed to save season content:', err);
    statusEl.textContent = 'Something went wrong saving. Please try again.';
  }
}

async function resetChapter() {
  if (!confirm(`Reset "${draftChapter.chapterTitle}" back to the default coursepack content? This removes any admin edits for this chapter.`)) {
    return;
  }

  statusEl.textContent = 'Resetting…';

  try {
    const currentOverride = await loadSeasonOverride(currentSeasonId);
    const chapters = (currentOverride?.chapters || []).filter((ch) => ch.chapterId !== draftChapter.chapterId);

    await setDoc(doc(db, 'settings', `seasonContent_${currentSeasonId}`), { chapters }, { merge: true });

    overridesCache[currentSeasonId] = { ...(currentOverride || {}), chapters };
    mergedCache[currentSeasonId] = mergeSeasonContent(currentSeasonId, overridesCache[currentSeasonId]);

    selectChapter(currentChapterIndex);
    statusEl.textContent = '↩️ Reset to default content.';
  } catch (err) {
    console.error('Failed to reset season content:', err);
    statusEl.textContent = 'Something went wrong. Please try again.';
  }
}
