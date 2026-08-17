// ============================================
// RANK + STARS
//
// Rank is derived, never stored — same philosophy as isSeasonComplete()
// in dashboard.html. Four tiers, one per season. Each tier has a FIXED
// star target (Seeker 3, Disciple 4, Missionary 8, Apostle 12) — these
// are deliberately hardcoded, not derived from today's chapter counts,
// because Semifinal/Final are still being built out with more chapters.
// A tier only fully lights up (and promotes to the next rank) once its
// target is met; until there's enough real content to reach it, the
// remaining stars just sit unearned rather than being unreachable by
// design — they're waiting on chapters that don't exist yet.
//
// Each season (except Prelim) contributes one star per chapter, plus
// ONE bonus star for the capstone reflection that gates the next step
// (see REFLECTION_GATES) — same "derived from real content" star as a
// chapter, just sourced from a reflection instead.
// ============================================

import { PUZZLE_CONFIG } from './puzzles.js';
import { SEASON_CONTENT } from './seasonContent.js';

export const RANK_TIERS = [
  { seasonId: 'prelim', rank: 'Seeker', seasonName: 'Prelim Season', starTarget: 3 },
  { seasonId: 'midterm', rank: 'Disciple', seasonName: 'Midterm Season', starTarget: 4 },
  { seasonId: 'semifinal', rank: 'Missionary', seasonName: 'Semifinal Season', starTarget: 8 },
  { seasonId: 'final', rank: 'Apostle', seasonName: 'Final Season', starTarget: 12 }
];

export const RANK_ICON = { Seeker: '🕯️', Disciple: '📖', Missionary: '⚔️', Apostle: '👑' };

// The capstone reflection that gates each step onward — one bonus star
// for the season just finished, once submitted. Prelim's own reflection
// (gate: 'midterm') is deliberately excluded: Seeker stays pure-puzzle
// stars, no bonus. Keyed by the ?gate= value reflection.html reads.
export const REFLECTION_GATES = {
  semifinal: { unlockField: 'semifinalUnlocked', bonusForSeason: 'midterm' },
  final: { unlockField: 'finalUnlocked', bonusForSeason: 'semifinal' },
  apostle: { unlockField: 'apostleUnlocked', bonusForSeason: 'final' }
};

function chaptersDone(seasonId, data) {
  const completed = data.completedNodes || {};
  return SEASON_CONTENT[seasonId].chapters.filter((chapter) =>
    chapter.nodes.every((n) => !!completed[n.nodeId])
  ).length;
}

// True once every chapter in a season is complete — the real-content
// signal reflection.js/season.js gate on, independent of the star math
// below (which pads out to a tier's fixed target).
export function isSeasonChaptersComplete(seasonId, data) {
  return chaptersDone(seasonId, data) === SEASON_CONTENT[seasonId].chapters.length;
}

function bonusStarEarned(seasonId, data) {
  const gate = Object.values(REFLECTION_GATES).find((g) => g.bonusForSeason === seasonId);
  return gate ? !!data[gate.unlockField] : false;
}

function filledStars(seasonId, data) {
  if (seasonId === 'prelim') {
    return Object.values(PUZZLE_CONFIG).filter((c) => !!data[c.completedField]).length;
  }
  return chaptersDone(seasonId, data) + (bonusStarEarned(seasonId, data) ? 1 : 0);
}

function starsForSeason(seasonId, data) {
  const tier = RANK_TIERS.find((t) => t.seasonId === seasonId);
  const filled = filledStars(seasonId, data);
  return Array.from({ length: tier.starTarget }, (_, i) => i < filled);
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
