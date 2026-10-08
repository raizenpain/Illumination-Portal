// ============================================
// REVISION REQUESTS (Jornie, 2026-10-06; reasons and reflections added
// 2026-10-08)
//
// A teacher can send a written answer back to be rewritten. The admin
// sets, on students/{email}:
//   revisionRequests.<id> = true      (the request)
//   revisionReasons.<id>  = '...'     (why, shown to the student; optional)
//
// Two kinds of <id>:
//
// 1. A season task's nodeId. The admin also clears
//    completedNodes.<nodeId>, so the task reopens. The season page then
//    opens at that chapter by itself, and later chapters and seasons
//    stay locked until the answer is rewritten.
//
// 2. A reflection, by its key in REFLECTION_REVISIONS. Nothing else is
//    cleared: the season the reflection unlocked STAYS unlocked on the
//    record (re-locking Midterm would trip the Prelim lockout in
//    prelimDeadline.js for good). Instead every season is closed to the
//    student, on the dashboard and on the season page, until the
//    reflection is rewritten from the dashboard.
//
// Resubmitting sets revisionRequests.<id> back to false. A rewrite earns
// no tickets, since the work was already paid for. It must meet the
// same MIN_WORDS as a first answer and not be the same answer again.
//
// This file: the helpers both pages share, and the dashboard reminder
// (shown every visit while a request is open).
// ============================================

import { SEASON_CONTENT } from './seasonContent.js';
import { ensureRankPopup, renderNoticePopup, openRankPopup } from './rankPopup.js';

/** Reflections that can be sent back. `textField` is where the reflection is stored. */
export const REFLECTION_REVISIONS = {
  reflection_midterm: { seasonName: 'Prelim Season', title: 'Prelim Reflection', textField: 'puzzle3Reflection' }
};

/** Fewest words a piece of writing may have, first time or rewritten
 *  (Jornie, 2026-10-08; before this the minimums were 150 / 100 / 40
 *  characters, which let one-line answers through). `season` covers
 *  tasks, journals and recitations. */
export const MIN_WORDS = { reflection: 100, season: 50 };

/** "12 more words to go", for the hint under a box that is still too short. */
export const wordsToGo = (text, min) => { const left = min - wordCount(text); return `${left} more word${left === 1 ? '' : 's'} to go`; };

export const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

/** Ids (node ids and reflection keys) this student has been asked to rewrite. */
export function pendingRevisions(data) {
  const requests = (data && data.revisionRequests) || {};
  return Object.keys(requests).filter((id) => requests[id] === true);
}

export const isRevisionPending = (data, nodeId) => pendingRevisions(data).includes(nodeId);

/** Reflection keys this student has been asked to rewrite. While any is open, every season is closed. */
export const pendingReflectionRevisions = (data) => pendingRevisions(data).filter((id) => REFLECTION_REVISIONS[id]);

/** Why the teacher sent this one back, or '' if no reason was recorded. */
export function revisionReason(data, id) {
  const reason = ((data && data.revisionReasons) || {})[id];
  return typeof reason === 'string' ? reason.trim() : '';
}

function describe(id) {
  if (REFLECTION_REVISIONS[id]) return { id, isReflection: true, ...REFLECTION_REVISIONS[id] };
  for (const season of Object.values(SEASON_CONTENT)) {
    for (const chapter of season.chapters) {
      const node = chapter.nodes.find((n) => n.nodeId === id);
      if (node) return { id, seasonName: season.seasonName, chapterTitle: chapter.chapterTitle, title: node.title };
    }
  }
  return null;
}

/** The reasons behind a set of requests as one short paragraph, each reason once. '' if none were recorded. */
export function reasonsText(data, ids) {
  const reasons = [...new Set(ids.map((id) => revisionReason(data, id)).filter(Boolean))];
  return reasons.length ? `Why: ${reasons.join(' ')}` : '';
}

/** "50 words each", "100 words", or both, for a notice covering these many tasks and reflections. */
export function minWordsText(taskCount, reflectionCount) {
  if (taskCount && reflectionCount) return `${MIN_WORDS.season} words for a season answer and ${MIN_WORDS.reflection} for a reflection`;
  if (reflectionCount) return `${MIN_WORDS.reflection} words`;
  return `${MIN_WORDS.season} words${taskCount > 1 ? ' each' : ''}`;
}

/** True when two answers are the same, or nearly the same, piece of writing. */
export function isSameAnswer(a, b) {
  const words = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const wa = words(a); const wb = words(b);
  if (!wa.length || !wb.length) return false;
  if (wa.join(' ') === wb.join(' ')) return true;
  const setB = new Set(wb);
  const shared = wa.filter((w) => setB.has(w)).length;
  return shared / Math.max(wa.length, wb.length) > 0.8;
}

/** Dashboard reminder; resolves when closed (or right away if nothing is pending). */
export async function maybeShowRevisionNotice({ data, isAdmin }) {
  if (isAdmin) return;
  const items = pendingRevisions(data).map(describe).filter(Boolean);
  if (!items.length) return;
  const seasons = [...new Set(items.map((i) => i.seasonName))];
  const reflections = items.filter((i) => i.isReflection);
  const tasks = items.filter((i) => !i.isReflection);
  const one = items.length === 1;

  const where = [];
  if (reflections.length) where.push('Tap the 📝 on Puzzle 3, or any season card, to rewrite your reflection. Every season stays closed until you do.');
  if (tasks.length) where.push(`Open the ${tasks[0].seasonName} and it will take you straight to ${tasks.length === 1 ? 'the task' : 'the first task'}. The chapters after it reopen as soon as you finish.`);

  ensureRankPopup();
  renderNoticePopup({
    kicker: '✦ A Note from Your Teacher ✦',
    sub: seasons.join(' & '),
    icon: '✏️',
    eyebrow: one ? 'One answer to revise' : `${items.length} answers to revise`,
    heading: 'Please Revise Your Work',
    detail: [
      `Your teacher has asked you to rewrite ${one ? 'this answer' : 'these answers'} in your own words, in at least ${minWordsText(tasks.length, reflections.length)}.`,
      reasonsText(data, items.map((i) => i.id)),
      ...where,
      'Your tickets and rewards stay as they are.'
    ].filter(Boolean).join(' '),
    rewards: items.map((i) => `<span class="popup-reward-icon">✏️</span> ${i.title}`)
  });
  await openRankPopup();
}
