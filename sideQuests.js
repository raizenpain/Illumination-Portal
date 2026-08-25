// ============================================
// SIDE QUESTS — time-limited bonus events shown on the dashboard,
// separate from the Prelim puzzles and Season path. Each entry is
// keyed by a stable id (also used in students.sideQuests / activity
// logs), and startsAt/endsAt are real ISO timestamps a student's
// device compares against, not something an admin toggles by hand.
//
// startsAt/endsAt are fixed at Asia/Manila time (+08:00) regardless
// of the viewer's own timezone, since this is an HCDC-only event.
//
// Adding a NEW side quest later: just add another entry here (own id,
// own crossword/reward) -- nothing else needs to change per-quest,
// since dashboard.html/sidequest.js pick whichever quest is currently
// upcoming/active from this list rather than hardcoding an id.
// ============================================

export const SIDE_QUESTS = {
  crossword_fiesta_2026: {
    id: 'crossword_fiesta_2026',
    kind: 'crossword',
    icon: '<img src="assets/sidequest-badge.png" class="sidequest-badge-icon" alt="">',
    title: 'Word of Faith',
    subtitle: "A crossword built from everything you've learned so far — HCDC's Fiesta Novena begins here.",
    startsAt: '2026-09-05T00:00:00+08:00',
    endsAt: '2026-09-06T23:59:59+08:00',
    reward: { quiz_ticket: 1, task_ticket: 1, journal_ticket: 1, recitation_ticket: 1 },
    crossword: {
      rows: 31,
      cols: 23,
      words: [
        { number: 1, word: 'ILLUMINATION', clue: "God opening an author's mind to divine truth beyond human understanding", row: 0, col: 7, dir: 'down' },
        { number: 2, word: 'PENTATEUCH', clue: 'The first five books of the Bible; another name for the Torah', row: 6, col: 12, dir: 'down' },
        { number: 3, word: 'ISRAELITES', clue: 'Descendants of Jacob who made a covenant with Yahweh', row: 7, col: 0, dir: 'down' },
        { number: 4, word: 'THANKSGIVING', clue: "Joyfully acknowledging God's goodness and blessings (a letter in ACTS)", row: 7, col: 5, dir: 'down' },
        { number: 5, word: 'EXODUS', clue: "The Israelites' escape from slavery in Egypt", row: 7, col: 12, dir: 'across' },
        { number: 6, word: 'TESTAMENT', clue: "A name for the Bible that reflects God's covenant with His people", row: 8, col: 3, dir: 'down' },
        { number: 7, word: 'REVELATION', clue: "God making Himself known to humanity; also the Bible's final book", row: 9, col: 0, dir: 'across' },
        { number: 8, word: 'APOCRYPHAL', clue: 'Term for writings the Church does not accept as inspired Scripture', row: 10, col: 12, dir: 'across' },
        { number: 9, word: 'PRAYER', clue: 'The natural response to realizing the presence of God', row: 12, col: 10, dir: 'down' },
        { number: 10, word: 'MAGISTERIUM', clue: "The Church's living teaching authority", row: 13, col: 3, dir: 'across' },
        { number: 11, word: 'STEWARDSHIP', clue: "Responsibly caring for God's creation and the gifts entrusted to us", row: 13, col: 7, dir: 'down' },
        { number: 12, word: 'COVENANT', clue: 'The sacred agreement God made with His chosen people', row: 13, col: 15, dir: 'down' },
        { number: 13, word: 'DIALOGUE', clue: 'An HCDC core value: engaging others with respect and harmony', row: 14, col: 20, dir: 'down' },
        { number: 14, word: 'VOCATION', clue: "God's call to a particular way of life", row: 15, col: 15, dir: 'across' },
        { number: 15, word: 'ADORATION', clue: 'Worshiping God for who He is, not just for what He does (a letter in ACTS)', row: 17, col: 7, dir: 'across' },
        { number: 16, word: 'GOSPEL', clue: "The 'Good News' of Jesus Christ, told in four books", row: 19, col: 17, dir: 'down' },
        { number: 17, word: 'SUPPLICATION', clue: "The prayer of humble petition — 'to beg or ask earnestly' (a letter in ACTS)", row: 20, col: 7, dir: 'across' },
        { number: 18, word: 'CANON', clue: "The Church's official list of divinely inspired books", row: 20, col: 13, dir: 'down' },
        { number: 19, word: 'TORAH', clue: "Hebrew name for the Law, the Bible's first five books", row: 21, col: 3, dir: 'down' },
        { number: 20, word: 'CONTRITION', clue: "Genuine sorrow for sin that turns us back to God's mercy (a letter in ACTS)", row: 22, col: 2, dir: 'across' },
        { number: 21, word: 'TRADITION', clue: "The Church's living transmission of the Gospel, alongside Scripture", row: 22, col: 5, dir: 'down' },
        { number: 22, word: 'HEBREWS', clue: 'Yahweh’s pre-covenant people, once enslaved in Egypt', row: 23, col: 16, dir: 'across' },
        { number: 23, word: 'INSPIRATION', clue: "The Holy Spirit's influence that led the Bible's human authors to write God's truth", row: 26, col: 5, dir: 'across' },
        { number: 24, word: 'KAIROS', clue: "The Hebrew concept of God's 'appointed moment,' not measured by the clock", row: 28, col: 3, dir: 'across' },
        { number: 25, word: 'KENOSIS', clue: "Christ's example of self-giving, self-emptying love", row: 30, col: 3, dir: 'across' }
      ]
    }
  }
};

// Badge id convention (stored in the student's achievements array),
// matching task_/chapter_/season_ from seasonBadges.js: sidequest_<id>
export function sideQuestBadgeId(questId) { return `sidequest_${questId}`; }

// Returns { icon, title, sub } for a sidequest_ badge id, or null --
// derived straight from SIDE_QUESTS instead of a separate hardcoded
// table, so a quest's badge can never drift out of sync with its own
// title. Caller falls back to PRELIM_BADGE_INFO / resolveSeasonBadge
// first, same three-way chain dashboard.html already uses.
export function resolveSideQuestBadge(id) {
  if (!id.startsWith('sidequest_')) return null;
  const quest = SIDE_QUESTS[id.replace(/^sidequest_/, '')];
  if (!quest) return null;
  return { icon: quest.icon || '🧩', title: quest.title, sub: 'Side Quest completed' };
}

export function getQuestStatus(quest, now = new Date()) {
  const start = new Date(quest.startsAt);
  const end = new Date(quest.endsAt);
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

// The one side quest a student should be shown right now: prefers an
// ACTIVE quest, falls back to the soonest UPCOMING one, otherwise null
// (nothing to show -- e.g. every quest so far has ended).
export function getFeaturedQuest(now = new Date()) {
  const quests = Object.values(SIDE_QUESTS);
  const active = quests.find((q) => getQuestStatus(q, now) === 'active');
  if (active) return active;

  const upcoming = quests
    .filter((q) => getQuestStatus(q, now) === 'upcoming')
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  return upcoming[0] || null;
}
