// ============================================
// SEASON BADGES — derives Achievements-panel display info (icon,
// title, sub) for task/chapter/season-completion badges straight
// from SEASON_CONTENT, instead of hand-maintaining ~50 static
// entries alongside the Prelim BADGE_INFO table. Stays in sync with
// whatever titles are currently in effect automatically.
//
// Badge id conventions (stored in the student's achievements array):
//   task_{nodeId}              — one node/task completed
//   chapter_{chapterId}        — every node in a chapter completed
//   season_{seasonId}_complete — every chapter in a season completed
// ============================================

import { SEASON_CONTENT } from './seasonContent.js';

const NODE_TYPE_ICON = { quiz: '📝', task: '🎯', journal: '📖', recitation: '🗣️' };

export function taskBadgeId(nodeId) { return `task_${nodeId}`; }
export function chapterBadgeId(chapterId) { return `chapter_${chapterId}`; }
export function seasonBadgeId(seasonId) { return `season_${seasonId}_complete`; }

function findNode(nodeId) {
  for (const season of Object.values(SEASON_CONTENT)) {
    for (const chapter of season.chapters) {
      const node = chapter.nodes.find((n) => n.nodeId === nodeId);
      if (node) return { node, chapter, season };
    }
  }
  return null;
}

function findChapter(chapterId) {
  for (const season of Object.values(SEASON_CONTENT)) {
    const chapter = season.chapters.find((c) => c.chapterId === chapterId);
    if (chapter) return { chapter, season };
  }
  return null;
}

// Returns { icon, title, sub } for a task_/chapter_/season_ badge id,
// or null if the id doesn't match one of those patterns (caller
// should fall back to the static Prelim BADGE_INFO table).
export function resolveSeasonBadge(id) {
  if (id.startsWith('task_')) {
    const found = findNode(id.replace(/^task_/, ''));
    if (!found) return null;
    return {
      icon: NODE_TYPE_ICON[found.node.type] || '🎖️',
      title: found.node.title,
      sub: `Task completed — ${found.season.seasonName}`
    };
  }

  if (id.startsWith('chapter_')) {
    const found = findChapter(id.replace(/^chapter_/, ''));
    if (!found) return null;
    return {
      icon: '🏁',
      title: found.chapter.chapterTitle,
      sub: `Chapter completed — ${found.season.seasonName}`
    };
  }

  if (id.startsWith('season_') && id.endsWith('_complete')) {
    const seasonId = id.replace(/^season_/, '').replace(/_complete$/, '');
    const season = SEASON_CONTENT[seasonId];
    if (!season) return null;
    return {
      icon: '👑',
      title: `${season.seasonName} Champion`,
      sub: season.subtitle
    };
  }

  return null;
}
