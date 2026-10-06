// ============================================
// REVISION REQUESTS (Jornie, 2026-10-06)
//
// A teacher can send a written season answer back to be rewritten. The
// admin sets, on students/{email}:
//   revisionRequests.<nodeId> = true      (the request)
//   completedNodes.<nodeId>   = removed   (so the task reopens)
// The season page then opens at that chapter by itself, later chapters
// and seasons stay locked until the answer is rewritten, and resubmitting
// sets revisionRequests.<nodeId> back to false. A rewrite earns no
// tickets, since the task was already paid for.
//
// This file: the helpers both pages share, and the dashboard reminder
// (shown every visit while a request is open).
// ============================================

import { SEASON_CONTENT } from './seasonContent.js';
import { ensureRankPopup, renderNoticePopup, openRankPopup } from './rankPopup.js';

/** Node ids this student has been asked to rewrite. */
export function pendingRevisions(data) {
  const requests = (data && data.revisionRequests) || {};
  return Object.keys(requests).filter((id) => requests[id] === true);
}

export const isRevisionPending = (data, nodeId) => pendingRevisions(data).includes(nodeId);

function describe(nodeId) {
  for (const season of Object.values(SEASON_CONTENT)) {
    for (const chapter of season.chapters) {
      const node = chapter.nodes.find((n) => n.nodeId === nodeId);
      if (node) return { seasonName: season.seasonName, chapterTitle: chapter.chapterTitle, title: node.title };
    }
  }
  return null;
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
  ensureRankPopup();
  renderNoticePopup({
    kicker: '✦ A Note from Your Teacher ✦',
    sub: seasons.join(' & '),
    icon: '✏️',
    eyebrow: items.length === 1 ? 'One answer to revise' : `${items.length} answers to revise`,
    heading: 'Please Rewrite in Your Own Words',
    detail: `Your teacher has asked you to rewrite ${items.length === 1 ? 'this answer' : 'these answers'} in your own words. Open the ${seasons[0]} and it will take you straight there. Your tickets and rewards stay as they are; the chapters after it reopen as soon as you finish.`,
    rewards: items.map((i) => `<span class="popup-reward-icon">✏️</span> ${i.title}`)
  });
  await openRankPopup();
}
