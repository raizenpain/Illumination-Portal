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
    page: 'sidequest-crossword.html',
    icon: '<img src="assets/sidequest-badge.png" class="sidequest-badge-icon" alt="">',
    title: 'Word of Faith',
    subtitle: "A crossword built from everything you've learned so far — HCDC's Fiesta Novena begins here.",
    completedCta: 'Tap to revisit your finished puzzle.',
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
  },

  fishing_shore_2026: {
    id: 'fishing_shore_2026',
    kind: 'fishing',
    page: 'sidequest-fishing.html',
    icon: '🎣',
    title: 'The Quiet Shore',
    subtitle: "“I will make you fishers of men” (Mt 4:19) — cast your line by the Sea of Galilee.",
    completedCta: "Cast and catch — go get 'em!",
    startsAt: '2026-09-07T00:00:00+08:00',
    endsAt: '2026-09-08T23:59:59+08:00',
    // Every ticket type a catch can grant, for the "full bundle" reward
    // (trophy/legendary fish, and every Blessed Object).
    fullBundle: { quiz_ticket: 1, task_ticket: 1, journal_ticket: 1, recitation_ticket: 1, scrap_ticket: 1 },
    startingBait: 8,
    maxBait: 8,
    cast: {
      waitMsMin: 900,
      waitMsMax: 4100,
      hookWindowMs: 1200,
      objectChance: 0.12,
      fillRatePerSec: 27,
      drainRatePerSec: 18,
      graceSec: 1.5,
      timeoutSec: 30
    },
    weightBands: {
      undersized: { max: 0.4 },
      standard: { max: 0.85 }
      // trophy is anything above standard's max
    },
    species: [
      { id: 'kinneret_sardine', name: 'Puyo', weightKg: [0.1, 0.4], darting: 0.49, barWidth: 30, rollWeight: 28, color: '#639922', standardTicket: 'scrap_ticket', verse: 'They left their nets at once and followed him. — Mk 1:18', note: 'The small catch that fed crowds. Nothing is too little to be multiplied.' },
      { id: 'st_peters_fish', name: 'Tilapia', weightKg: [0.4, 1.6], darting: 0.63, barWidth: 30, rollWeight: 24, color: '#BA7517', standardTicket: 'task_ticket', verse: 'Come after me, and I will make you fishers of men. — Mt 4:19', note: 'The tilapia of Galilee, named for the fisherman who became a shepherd.' },
      { id: 'jordan_barbel', name: 'Barb', weightKg: [0.8, 3.2], darting: 0.77, barWidth: 28, rollWeight: 18, color: '#D4537E', standardTicket: 'journal_ticket', verse: 'Put out into deep water and lower your nets for a catch. — Lk 5:4', note: 'It holds to the riverbed. You have to go down to find it.' },
      { id: 'blue_tilapia', name: 'Gourami', weightKg: [1.5, 5.5], darting: 0.91, barWidth: 26, rollWeight: 14, color: '#1D9E75', standardTicket: 'quiz_ticket', verse: 'Master, we have worked hard all night and caught nothing. — Lk 5:5', note: 'Some nights the water gives nothing. You cast again in the morning.' },
      { id: 'galilee_catfish', name: 'Freshwater Eel', weightKg: [3.0, 12.0], darting: 0.7, barWidth: 27, rollWeight: 9, color: '#888780', standardTicket: 'recitation_ticket', verse: 'The kingdom of heaven is like a net thrown into the sea. — Mt 13:47', note: 'The net gathers every kind. Sorting comes later, and not by you.' },
      { id: 'great_carp', name: 'Cichlid', weightKg: [4.0, 14.0], darting: 1.12, barWidth: 23, rollWeight: 5.5, color: '#7F77DD', standardTicket: 'student_choice', verse: 'The net was not torn, though there were so many. — Jn 21:11', note: 'A weight you were sure would break the line, and it held.' },
      { id: 'silver_stater', name: 'Silver stater fish', weightKg: [2.0, 6.0], darting: 1.4, barWidth: 22, rollWeight: 1.5, color: '#EF9F27', legendary: true, verse: 'Open its mouth and you will find a coin. — Mt 17:27', note: 'Provision arrives from the last place you would think to look.' }
    ],
    // barWidth/darting scale with rarity (rollWeight) like the fish do --
    // the rarer the object, the harder the reel before it's granted.
    blessedObjects: [
      { id: 'rosary', name: 'The Rosary', rollWeight: 30, darting: 0.45, barWidth: 34, text: 'Beads worn smooth by repetition. The same prayer, said again, is not the same prayer.' },
      { id: 'bible', name: 'The Bible', rollWeight: 26, darting: 0.6, barWidth: 30, text: 'Your word is a lamp for my feet, a light for my path. — Ps 119:105' },
      { id: 'chalice', name: 'The Chalice', rollWeight: 18, darting: 0.85, barWidth: 25, text: 'The cup that we bless, is it not a participation in the blood of Christ? — 1 Cor 10:16' },
      { id: 'monstrance', name: 'The Monstrance', rollWeight: 14, darting: 1.05, barWidth: 22, text: 'Made to hold what cannot be held, and to be looked at rather than used.' },
      { id: 'the_cross', name: 'The Cross', rollWeight: 9, darting: 1.3, barWidth: 18, text: 'Whoever wishes to come after me must deny himself, take up his cross, and follow me. — Mt 16:24' },
      { id: 'hcdc_75', name: 'HCDC 75th Anniversary Emblem', rollWeight: 3, darting: 1.6, barWidth: 15, useOfficialArtwork: true, text: 'Seventy-five years of the same work, handed on.' }
    ],
    copy: {
      idle: 'The water is calm', idleHint: 'Cast your line to start',
      casting: 'Line is out', castingHint: 'Wait for the float to dip',
      bite: "Something's biting", biteHint: 'Hook it now',
      reeling: 'Fish on the line — press and hold!', reelingHint: 'Keep holding to bring it in — let go and it swims free',
      tooEarly: 'You reeled in too early. Nothing there.',
      missedHook: 'It slipped the hook.',
      lost: 'The line went slack. It got away.',
      undersizedPopup: "Nice catch! It's a bit small to keep — cast again for a bigger one.",
      trophy: 'A trophy catch.',
      legendary: 'A legendary catch.',
      onHookObject: 'Something rests in the net — press and hold!', onHookObjectHint: 'Keep holding to bring it in — let go and it slips away',
      noBait: 'No bait left — come back for the next Side Quest.'
    }
  },

  illumination_2026: {
    id: 'illumination_2026',
    kind: 'illumination',
    page: 'sidequest-illumination.html',
    icon: '🏮',
    title: 'Illumination',
    subtitle: 'A 2D adventure of light and discovery — hold your lantern high and climb toward the tower.',
    completedCta: 'Tap to walk the path again.',
    startsAt: '2026-09-09T00:00:00+08:00',
    endsAt: '2026-09-13T23:59:59+08:00',
    // Two separate one-time grants, additive: collecting all 6 shards pays
    // out shardsReward once; reaching the Beacon (at all, regardless of
    // shard count) pays out beaconReward once. A full run nets both.
    shardsReward: { quiz_ticket: 4, task_ticket: 4, journal_ticket: 4, recitation_ticket: 4, scrap_ticket: 4 },
    beaconReward: { quiz_ticket: 6, task_ticket: 6, journal_ticket: 6, recitation_ticket: 6, scrap_ticket: 6 },
    // Short reflections shown the moment each shard is picked up (own
    // phrasing, not verbatim Catechism/Scripture citations beyond the
    // short attributed Bible verses) -- and one longer reflection shown
    // once the Beacon is reached, tying the game's light/dark theme to
    // the Church's own old name for Baptism: "Illumination."
    shardReflections: [
      { verse: '"The people who walked in darkness have seen a great light." — Isaiah 9:2',
        note: 'Every act of faith starts as a small flame — small enough to fit in one hand, but strong enough to take the first step.' },
      { verse: '"Your word is a lamp for my feet and a light for my path." — Psalm 119:105',
        note: "God rarely shows the whole road at once. He shows enough of it for the next step — and then the next." },
      { verse: '"The light shines in the darkness, and the darkness has not overcome it." — John 1:5',
        note: 'The dark parts of life — grief, doubt, a hard season — were never stronger than the light. They only look that way up close.' },
      { verse: '"Even the darkness is not dark to you; the night is as bright as the day." — Psalm 139:12',
        note: "God isn't waiting on the other side of your darkest season for you to arrive. He's already walking through it with you." },
      { verse: '"You, Lord, keep my lamp burning; my God turns my darkness into light." — Psalm 18:28',
        note: "The oil runs low because the walk is hard, not because you're doing it wrong. It gets refilled — that's the whole point of the lamps along the way." },
      { verse: '"I am the light of the world. Whoever follows me will never walk in darkness." — John 8:12',
        note: "Six shards in, the lantern reaches further — not because the dark got smaller, but because you're carrying more of the light now." }
    ],
    beaconReflection: {
      heading: 'The Beacon Is Lit',
      text: "You crossed the whole valley in the dark, one small circle of lantern-light at a time — and the tower was there waiting the entire way.\n\nThat isn't only how this game works. From the earliest days of the Church, the moment a person is baptized has been called \"Illumination\" — the point where someone stops merely holding on to a light from the outside, and starts being lit up by one from within.\n\nThe darkness doesn't fully disappear — not in this game, and not in life. Grief still comes. Doubt still comes. Seasons still come that make no sense while you're inside them. But none of it gets the last word: \"The light shines in the darkness, and the darkness has not overcome it.\" (John 1:5)\n\nWhatever quagmire you're walking through right now, you are not walking through it alone, and you are not walking toward nothing. There is a light on the other side of it — and it was never one you had to make yourself."
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
