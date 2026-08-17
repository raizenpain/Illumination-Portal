// ============================================
// RANK + STARS
//
// Rank is derived, never stored — same philosophy as isSeasonComplete()
// in dashboard.html. Four tiers, one per season, each with its own set
// of "stars": one star per puzzle in Prelim, one star per chapter in
// Midterm/Semifinal/Final. A tier's rank name is what the student holds
// while working through that tier; filling every star in a tier
// promotes them into the next tier's rank. Apostle is terminal — once
// there, the displayed stars track Final Season's chapters instead of
// a further rank-up.
//
// Chapter counts aren't hardcoded: they're read live off SEASON_CONTENT,
// so adding chapters/seasons later doesn't require touching this file.
// ============================================

import { PUZZLE_CONFIG } from './puzzles.js';
import { SEASON_CONTENT } from './seasonContent.js';

export const RANK_TIERS = [
  { seasonId: 'prelim', rank: 'Seeker', seasonName: 'Prelim Season' },
  { seasonId: 'midterm', rank: 'Disciple', seasonName: 'Midterm Season' },
  { seasonId: 'semifinal', rank: 'Missionary', seasonName: 'Semifinal Season' },
  { seasonId: 'final', rank: 'Apostle', seasonName: 'Final Season' }
];

export const RANK_ICON = { Seeker: '🕯️', Disciple: '📖', Missionary: '⚔️', Apostle: '👑' };

function starsForSeason(seasonId, data) {
  if (seasonId === 'prelim') {
    return Object.values(PUZZLE_CONFIG).map((config) => !!data[config.completedField]);
  }

  const completed = data.completedNodes || {};
  return SEASON_CONTENT[seasonId].chapters.map((chapter) =>
    chapter.nodes.every((n) => !!completed[n.nodeId])
  );
}

// Exposed so a popup can show the star count for a SPECIFIC tier even
// after the student's overall rank has already advanced past it (e.g.
// the 3rd Prelim star lighting up in the same moment rank flips to
// Disciple — the popup still needs Prelim's own 3-star array, not
// Disciple's fresh Midterm one).
export function getSeasonStars(seasonId, data) {
  return starsForSeason(seasonId, data);
}

// { rank, stars: [bool,...] for the CURRENT tier, seasonId, legendaryEligible }
export function getRankProgress(data) {
  let tierIndex = 0;
  while (
    tierIndex < RANK_TIERS.length - 1 &&
    starsForSeason(RANK_TIERS[tierIndex].seasonId, data).every(Boolean)
  ) {
    tierIndex += 1;
  }

  const tier = RANK_TIERS[tierIndex];
  const legendaryEligible = RANK_TIERS.every((t) =>
    starsForSeason(t.seasonId, data).every(Boolean)
  );

  return {
    rank: tier.rank,
    stars: starsForSeason(tier.seasonId, data),
    seasonId: tier.seasonId,
    legendaryEligible
  };
}
