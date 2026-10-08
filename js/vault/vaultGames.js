// ============================================
// VAULT GAMES — permanent, always-accessible mini-games. Unlike Side
// Quests (sideQuests.js), these have no startsAt/endsAt window and
// every entry shows at once on the dashboard, not just one "featured"
// game. Each is a strictly one-time challenge: once completed, it's
// locked from replay for good (not just its reward) -- there's
// nothing left to open a second time.
//
// A game can be registered before it's actually playable -- leave
// `page` (and `reward`/`treasureIcon`) null/omitted and it renders as
// a locked "Coming Soon" card instead of "Play Now". Fill those in
// once the real game file + reward numbers are ready; nothing else
// needs to change.
//
// Student progress lives in a `vaultGames` map field on the student
// doc (vaultGames.<id>.completed/.completedAt), same shape as
// `sideQuests` -- see studentSelfFields() in firestore.rules.
// ============================================

// Master switch: the Vault section and its cards are always visible to
// students once VAULT_GAMES has entries, but while this is false every
// card renders locked ("Coming Soon") regardless of its own `page`,
// so the section can be shown off before it's actually playable.
//
// Date-gated rather than a hand-flipped boolean, same startsAt-style
// pattern as sideQuests.js's own date checks -- announced (Fiesta
// announcement popup, 2026-09-14) to open "tomorrow", so it opens
// itself the moment that day begins in Philippine time, with nothing
// left to remember to go do by hand.
const VAULT_RELEASE_AT = '2026-09-15T00:00:00+08:00';
export const VAULT_UNLOCKED = Date.now() >= new Date(VAULT_RELEASE_AT).getTime();

export const VAULT_GAMES = {
  scriptorium: {
    id: 'scriptorium',
    page: 'vault-scriptorium.html',
    icon: '<img src="assets/vault-scriptorium-icon.png" class="vault-game-icon" alt="">',
    treasureIcon: null, // the reward popup (Book of Knowledge) has its own art, awarded inside the game itself
    title: 'The Scriptorium',
    subtitle: 'A quiet challenge for the mind and the pen.',
    reward: null // flat, not tiered -- see BOOK_OF_KNOWLEDGE_REWARD in scriptoriumContent.js
  },
  loaves: {
    id: 'loaves',
    page: 'vault-loaves.html',
    icon: '<img src="assets/vault-loaves-icon.png" class="vault-game-icon" alt="">',
    treasureIcon: null, // the reward popup (Arcane of Generosity) has its own art, awarded inside the game itself
    title: 'Loaves and Fishes',
    subtitle: 'Choose wisely, and the crowd is fed.',
    reward: null // flat -- see ARCANE_OF_GENEROSITY_REWARD in loavesContent.js
  },
  vigil: {
    id: 'vigil',
    page: 'vault-vigil.html',
    icon: '<img src="assets/vault-vigil-icon.png" class="vault-game-icon" alt="">',
    treasureIcon: null, // the reward popup (Sacred Light) has its own art, awarded inside the game itself
    title: 'The Vigil',
    subtitle: 'Seven candles against the dark.',
    reward: null // flat -- see SACRED_LIGHT_REWARD in vigilContent.js
  },
  illumination: {
    id: 'illumination',
    page: 'vault-illumination.html',
    icon: '<img src="assets/vault-illumination-icon.png" class="vault-game-icon" alt="">',
    treasureIcon: null, // the reward popup (The Lumiere) has its own art, awarded inside the game itself
    title: 'Illumination',
    subtitle: 'Climb toward the tower, one small circle of lantern-light at a time.',
    reward: null // two-stage -- see SHARDS_REWARD / BEACON_REWARD in illuminationContent.js
  },
  evangelization: {
    id: 'evangelization',
    page: 'vault-evangelization.html',
    icon: '<img src="assets/vault-evangelization-icon.png" class="vault-game-icon" alt="">',
    treasureIcon: null, // the reward popup (Bearer of the Cross) has its own art, awarded inside the game itself
    title: 'The Evangelization',
    subtitle: 'Find the Cross, evade the patrol, and carry it safely to the village.',
    reward: null // flat -- see BEARER_OF_THE_CROSS_REWARD in evangelizationContent.js
  }
};

// Badge id convention (stored in the student's achievements array),
// matching task_/chapter_/season_/sidequest_ from the other badge
// registries: vault_<id>
export function vaultGameBadgeId(gameId) { return `vault_${gameId}`; }

// Returns { icon, title, sub } for a vault_ badge id, or null --
// derived straight from VAULT_GAMES instead of a separate hardcoded
// table, so a game's badge can never drift out of sync with its own
// title. Caller falls back to this last, after
// PRELIM_BADGE_INFO / resolveSeasonBadge / resolveSideQuestBadge.
export function resolveVaultGameBadge(id) {
  if (!id.startsWith('vault_')) return null;
  const game = VAULT_GAMES[id.replace(/^vault_/, '')];
  if (!game) return null;
  // game.icon is sized for the dashboard's 72px card chip (.vault-game-icon,
  // 60px) -- swapped here to the smaller badge-sized class so it doesn't
  // render oversized in the ~32px achievement badge grid / inline rows.
  const icon = (game.icon || '🎮').replace('vault-game-icon', 'vault-badge-icon');
  return { icon, title: game.title, sub: 'Vault Game completed' };
}
