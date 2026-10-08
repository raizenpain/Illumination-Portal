// ============================================
// PRELIM BADGES — display info (icon, title, sub) for the puzzle-piece
// achievements granted during the Prelim phase (app.js). Season-phase
// badges (task/chapter/season completion) are derived dynamically
// instead — see seasonBadges.js's resolveSeasonBadge().
//
// Single source of truth for dashboard.html and student-view.js so an
// achievement's displayed title can't drift between the two.
// ============================================

export const PRELIM_BADGE_INFO = {
  first_step: { icon: '🥉', title: 'First Step', sub: 'Collected first piece' },
  faith_explorer: { icon: '🧭', title: 'Faith Explorer', sub: 'Collected 3 pieces' },
  mission_builder: { icon: '🛠️', title: 'Mission Builder', sub: 'Collected 6 pieces' },
  beatitudes_master: { icon: '👑', title: 'Cross Master', sub: 'Completed Puzzle 1' },
  sacraments_master: { icon: '👑', title: 'Spirituality Master', sub: 'Completed Puzzle 2' },
  vocation_master: { icon: '👑', title: 'Vocation Master', sub: 'Completed Puzzle 3' },
  formation_champion: { icon: '🏆', title: 'Formation Champion', sub: 'Completed all puzzles' }
};
