// ============================================
// THE SCRIPTORIUM — content data (passage pool, ticket glyphs, chest
// tiers). Split out from scriptorium.js purely to keep the game engine
// readable; nothing here is engine logic.
//
// CONTENT SHAPE
//   {
//     id: "p_cr_001",
//     level: 1,                      // 1, 2 or 3 — which slot it can fill
//     text: "In the {0} God created the {1} and the {2}.",
//     answers: ["beginning", "heavens", "earth"],
//     accepted: { 0: ["beginning"] },// extra spellings, TYPED slots only
//     typed: [],                     // slot indices with no bank word
//     distractors: ["heaven", "firmament"],
//     bank: true,                    // false = no bank unless margin consulted
//     book: "Genesis",
//     chapter: "1",
//     bookOptions: [...],
//     chapterOptions: [...]
//   }
//
// CONTENT SOURCE: every passage below is quoted in the ReEd 101 course pack.
// The wording follows the course pack, not a single translation -- the course
// pack itself mixes Jerusalem Bible, RSV, NIV and NRSV renderings, and quotes
// Genesis 2:7 twice in two different wordings. Where it gives two, the
// Jerusalem-style rendering was used. If the course pack is ever standardised
// on one translation, the `answers` and `accepted` arrays must be updated to
// match, or students will be marked wrong for knowing the text they were
// taught.
//
// AUTHORING: three passages per level, so a student who loses two leaves in a
// row still meets fresh text on the third attempt. Keep that floor of three.
// ============================================

export const TIME_PER_LEAF = 60;
export const COOLDOWN = 30;
export const FAILS_BEFORE_COOLDOWN = 2;
/** Tries allowed at any one blank before the leaf is lost. */
export const MAX_ATTEMPTS = 3;
export const LEVELS = [1, 2, 3, 4, 5];

/**
 * Every entry carries a `source` flag:
 *   "quoted"  -- the wording appears verbatim in the ReEd 101 course pack.
 *   "cited"   -- the course pack cites this reference but does not print the
 *               text, so the wording here is a standard rendering that YOU
 *               MUST CHECK against the Bible your modules use before this
 *               ships. These are marked so you can find them fast.
 */
export const SAMPLE_POOL = [
  /* ================= Leaf 1 - full bank, plain decoys ================= */
  {
    id: "p1a",
    level: 1,
    source: "quoted",
    text: "Darkness was upon the {0} of the {1}.",
    answers: ["face", "deep"],
    typed: [],
    distractors: ["surface", "waters", "abyss", "void"],
    bank: true,
    book: "Genesis",
    chapter: "1",
    bookOptions: ["Genesis", "Job", "Isaiah", "Psalms"],
    chapterOptions: ["1", "2", "3", "8"],
  },
  {
    id: "p1b",
    level: 1,
    source: "quoted",
    text: "You will be like {0}, knowing {1} and {2}.",
    answers: ["God", "good", "evil"],
    typed: [],
    distractors: ["gods", "angels", "right", "wrong"],
    bank: true,
    book: "Genesis",
    chapter: "3",
    bookOptions: ["Genesis", "Wisdom", "Sirach", "Romans"],
    chapterOptions: ["1", "2", "3", "4"],
  },
  {
    id: "p1c",
    level: 1,
    source: "quoted",
    text: "At that pivotal time there will be a new {0} and a new {1}.",
    answers: ["heaven", "earth"],
    typed: [],
    distractors: ["heavens", "world", "creation", "kingdom"],
    bank: true,
    book: "Isaiah",
    chapter: "65",
    bookOptions: ["Isaiah", "Jeremiah", "Revelation", "Ezekiel"],
    chapterOptions: ["6", "21", "40", "65"],
  },
  {
    id: "p1d",
    level: 1,
    source: "quoted",
    text: "The believers were {0} and had all things in {1}.",
    answers: ["together", "common"],
    typed: [],
    distractors: ["gathered", "united", "order", "peace"],
    bank: true,
    book: "Acts",
    chapter: "2",
    bookOptions: ["Acts", "Romans", "1 Corinthians", "James"],
    chapterOptions: ["1", "2", "4", "10"],
  },
  {
    id: "p1e",
    level: 1,
    source: "quoted",
    text: "No one can enter the kingdom of God without being born of {0} and {1}.",
    answers: ["water", "Spirit"],
    typed: [],
    distractors: ["fire", "blood", "wind", "flesh"],
    bank: true,
    book: "John",
    chapter: "3",
    bookOptions: ["John", "Matthew", "Acts", "Romans"],
    chapterOptions: ["1", "3", "6", "14"],
  },
  {
    id: "p1f",
    level: 1,
    source: "cited",
    text: "Our {0} in heaven, {1} be your name.",
    answers: ["Father", "hallowed"],
    typed: [],
    distractors: ["Lord", "God", "holy", "blessed"],
    bank: true,
    book: "Matthew",
    chapter: "6",
    bookOptions: ["Matthew", "Luke", "Mark", "John"],
    chapterOptions: ["5", "6", "11", "22"],
  },

  /* ============= Leaf 2 - full bank, near-miss decoys ================= */
  {
    id: "p2a",
    level: 2,
    source: "quoted",
    text:
      "The Lord God then exiled him from the garden of Eden, to {0} the ground from which he had been {1}.",
    answers: ["till", "taken"],
    typed: [],
    distractors: ["work", "tend", "formed", "made"],
    bank: true,
    book: "Genesis",
    chapter: "3",
    bookOptions: ["Genesis", "Ezekiel", "Isaiah", "Joel"],
    chapterOptions: ["2", "3", "4", "11"],
  },
  {
    id: "p2b",
    level: 2,
    source: "quoted",
    text:
      "Go therefore and make {0} of all {1}, teaching them to observe all that I have {2} you.",
    answers: ["disciples", "nations", "commanded"],
    typed: [],
    distractors: ["followers", "peoples", "taught", "given"],
    bank: true,
    book: "Matthew",
    chapter: "28",
    bookOptions: ["Matthew", "Mark", "Luke", "Acts"],
    chapterOptions: ["1", "16", "24", "28"],
  },
  {
    id: "p2c",
    level: 2,
    source: "quoted",
    text: "The {0} you put here with me — she gave me some {1} from the tree, and I ate it.",
    answers: ["woman", "fruit"],
    typed: [],
    distractors: ["serpent", "wife", "food", "branch"],
    bank: true,
    book: "Genesis",
    chapter: "3",
    bookOptions: ["Genesis", "Tobit", "Sirach", "1 Timothy"],
    chapterOptions: ["2", "3", "4", "6"],
  },
  {
    id: "p2d",
    level: 2,
    source: "quoted",
    text: "Am I my {0}'s {1}?",
    answers: ["brother", "keeper"],
    typed: [],
    distractors: ["neighbour", "kinsman", "guardian", "shepherd"],
    bank: true,
    book: "Genesis",
    chapter: "4",
    bookOptions: ["Genesis", "Exodus", "Proverbs", "1 John"],
    chapterOptions: ["3", "4", "5", "9"],
  },
  {
    id: "p2e",
    level: 2,
    source: "cited",
    text: "I am the {0}, the {1}, and the {2}.",
    answers: ["way", "truth", "life"],
    typed: [],
    distractors: ["light", "vine", "road", "word"],
    bank: true,
    book: "John",
    chapter: "14",
    bookOptions: ["John", "Matthew", "Colossians", "Hebrews"],
    chapterOptions: ["1", "8", "14", "20"],
  },
  {
    id: "p2f",
    level: 2,
    source: "quoted",
    text: "God saw everything that he had {0}, and it was very {1}.",
    answers: ["made", "good"],
    typed: [],
    distractors: ["created", "formed", "holy", "pleasing"],
    bank: true,
    book: "Genesis",
    chapter: "1",
    bookOptions: ["Genesis", "Sirach", "Psalms", "Wisdom"],
    chapterOptions: ["1", "2", "8", "31"],
  },

  /* ============ Leaf 3 - one blank must be written ==================== */
  {
    id: "p3a",
    level: 3,
    source: "quoted",
    text:
      "And the Lord God planted a garden in {0}, in the east, and there he placed the man whom he had {1}.",
    answers: ["Eden", "formed"],
    accepted: { 0: ["eden"] },
    typed: [0],
    distractors: ["Nod", "Havilah", "made", "created"],
    bank: true,
    book: "Genesis",
    chapter: "2",
    bookOptions: ["Genesis", "Ezekiel", "Isaiah", "Revelation"],
    chapterOptions: ["1", "2", "3", "8"],
  },
  {
    id: "p3b",
    level: 3,
    source: "quoted",
    text: "Did God truly say, You shall not {0} of any {1} in the garden?",
    answers: ["eat", "tree"],
    accepted: { 0: ["eat"] },
    typed: [0],
    distractors: ["taste", "touch", "fruit", "plant"],
    bank: true,
    book: "Genesis",
    chapter: "3",
    bookOptions: ["Genesis", "Job", "Wisdom", "2 Corinthians"],
    chapterOptions: ["1", "2", "3", "11"],
  },
  {
    id: "p3c",
    level: 3,
    source: "quoted",
    text:
      "Stand firm, then, brothers, and hold fast to the {0} that you were taught, either by our spoken {1} or by our letter.",
    answers: ["traditions", "word"],
    accepted: { 0: ["traditions", "tradition"] },
    typed: [0],
    distractors: ["teachings", "customs", "voice", "preaching"],
    bank: true,
    book: "2 Thessalonians",
    chapter: "2",
    bookOptions: ["2 Thessalonians", "1 Corinthians", "Galatians", "Hebrews"],
    chapterOptions: ["1", "2", "3", "9"],
  },
  {
    id: "p3d",
    level: 3,
    source: "quoted",
    text:
      "He placed cherubim with flaming, turning {0} at the eastern edge of the garden, to guard the way to the tree of {1}.",
    answers: ["swords", "life"],
    accepted: { 0: ["swords", "sword"] },
    typed: [0],
    distractors: ["spears", "wings", "knowledge", "wisdom"],
    bank: true,
    book: "Genesis",
    chapter: "3",
    bookOptions: ["Genesis", "Ezekiel", "Revelation", "Exodus"],
    chapterOptions: ["2", "3", "4", "22"],
  },
  {
    id: "p3e",
    level: 3,
    source: "cited",
    text: "There is a {0} for everything, and a season for every matter under the {1}.",
    answers: ["time", "heavens"],
    accepted: { 0: ["time"] },
    typed: [0],
    distractors: ["season", "hour", "heaven", "sun"],
    bank: true,
    book: "Ecclesiastes",
    chapter: "3",
    bookOptions: ["Ecclesiastes", "Proverbs", "Sirach", "Psalms"],
    chapterOptions: ["1", "3", "7", "12"],
  },
  {
    id: "p3f",
    level: 3,
    source: "cited",
    text: "Your name shall no longer be Jacob, but {0}, for you have striven with God and with men, and have {1}.",
    answers: ["Israel", "prevailed"],
    accepted: { 0: ["israel"] },
    typed: [0],
    distractors: ["Judah", "Abraham", "endured", "overcome"],
    bank: true,
    book: "Genesis",
    chapter: "32",
    bookOptions: ["Genesis", "Exodus", "Hosea", "Joshua"],
    chapterOptions: ["12", "28", "32", "35"],
  },

  /* ============ Leaf 4 - two blanks must be written =================== */
  {
    id: "p4a",
    level: 4,
    source: "quoted",
    text:
      "There are also many other things that Jesus did; if every one of them were written down, I suppose that the {0} itself could not contain the {1} that would be written.",
    answers: ["world", "books"],
    accepted: { 0: ["world"], 1: ["books"] },
    typed: [0, 1],
    distractors: ["earth", "heavens", "scrolls", "pages"],
    bank: true,
    book: "John",
    chapter: "21",
    bookOptions: ["John", "Luke", "Acts", "Revelation"],
    chapterOptions: ["1", "20", "21", "22"],
  },
  {
    id: "p4b",
    level: 4,
    source: "quoted",
    text:
      "You are free to eat the fruit of the trees, except the fruit of the tree of {0} of right and {1}.",
    answers: ["understanding", "wrong"],
    accepted: { 0: ["understanding", "knowledge"], 1: ["wrong", "evil"] },
    typed: [0, 1],
    distractors: ["wisdom", "judgement", "good", "life"],
    bank: true,
    book: "Genesis",
    chapter: "2",
    bookOptions: ["Genesis", "Wisdom", "Proverbs", "Sirach"],
    chapterOptions: ["1", "2", "3", "9"],
  },
  {
    id: "p4c",
    level: 4,
    source: "cited",
    text: "Be fruitful and {0}, fill the {1} and subdue it.",
    answers: ["multiply", "earth"],
    accepted: { 0: ["multiply", "increase"], 1: ["earth"] },
    typed: [0, 1],
    distractors: ["prosper", "flourish", "world", "land"],
    bank: true,
    book: "Genesis",
    chapter: "1",
    bookOptions: ["Genesis", "Psalms", "Sirach", "Wisdom"],
    chapterOptions: ["1", "2", "9", "12"],
  },
  {
    id: "p4d",
    level: 4,
    source: "cited",
    text: "And the {0} became {1} and lived among us.",
    answers: ["Word", "flesh"],
    accepted: { 0: ["word"], 1: ["flesh"] },
    typed: [0, 1],
    distractors: ["Light", "Son", "man", "spirit"],
    bank: true,
    book: "John",
    chapter: "1",
    bookOptions: ["John", "Hebrews", "Colossians", "Philippians"],
    chapterOptions: ["1", "3", "8", "14"],
  },
  {
    id: "p4e",
    level: 4,
    source: "cited",
    text:
      "In many and various ways God spoke of old to our ancestors by the {0}; in these last days he has spoken to us by a {1}.",
    answers: ["prophets", "Son"],
    accepted: { 0: ["prophets", "prophet"], 1: ["son"] },
    typed: [0, 1],
    distractors: ["patriarchs", "apostles", "servant", "messenger"],
    bank: true,
    book: "Hebrews",
    chapter: "1",
    bookOptions: ["Hebrews", "Romans", "2 Timothy", "1 Peter"],
    chapterOptions: ["1", "2", "8", "9"],
  },
  {
    id: "p4f",
    level: 4,
    source: "cited",
    text:
      "Ever since the creation of the world his invisible {0} — his eternal power and divine nature — have been understood through the things he has {1}.",
    answers: ["attributes", "made"],
    accepted: { 0: ["attributes", "qualities"], 1: ["made", "created"] },
    typed: [0, 1],
    distractors: ["works", "wonders", "formed", "shown"],
    bank: true,
    book: "Romans",
    chapter: "1",
    bookOptions: ["Romans", "Wisdom", "Acts", "Colossians"],
    chapterOptions: ["1", "5", "8", "11"],
  },

  /* ============ Leaf 5 - no bank, written from memory ================= */
  {
    id: "p5a",
    level: 5,
    source: "quoted",
    text:
      "Yahweh God created man from the {0} of the earth and breathed the breath of {1} into his nostrils, and the man became a living being.",
    answers: ["dust", "life"],
    accepted: { 0: ["dust"], 1: ["life"] },
    typed: [0, 1],
    distractors: ["clay", "soil", "spirit", "breath"],
    bank: false,
    book: "Genesis",
    chapter: "2",
    bookOptions: ["Genesis", "Job", "Ezekiel", "1 Corinthians"],
    chapterOptions: ["1", "2", "3", "7"],
  },
  {
    id: "p5b",
    level: 5,
    source: "quoted",
    text: "Let us make man in our {0}, after our {1}.",
    answers: ["image", "likeness"],
    accepted: { 0: ["image"], 1: ["likeness"] },
    typed: [0, 1],
    distractors: ["form", "pattern", "spirit", "shadow"],
    bank: false,
    book: "Genesis",
    chapter: "1",
    bookOptions: ["Genesis", "Wisdom", "Colossians", "James"],
    chapterOptions: ["1", "2", "3", "5"],
  },
  {
    id: "p5c",
    level: 5,
    source: "quoted",
    text:
      "Yahweh God took the man and placed him in the Garden of {0} to {1} it and take care of it.",
    answers: ["Eden", "till"],
    accepted: { 0: ["eden"], 1: ["till", "tend", "cultivate"] },
    typed: [0, 1],
    distractors: ["Paradise", "Canaan", "keep", "guard"],
    bank: false,
    book: "Genesis",
    chapter: "2",
    bookOptions: ["Genesis", "Ezekiel", "Song of Songs", "Isaiah"],
    chapterOptions: ["1", "2", "3", "15"],
  },
  {
    id: "p5d",
    level: 5,
    source: "quoted",
    text: "After they had sinned, they realized they were {0}, and they hid from the {1} of the Lord God.",
    answers: ["naked", "presence"],
    accepted: { 0: ["naked"], 1: ["presence", "face", "sight"] },
    typed: [0, 1],
    distractors: ["ashamed", "afraid", "voice", "anger"],
    bank: false,
    book: "Genesis",
    chapter: "3",
    bookOptions: ["Genesis", "Job", "Isaiah", "Romans"],
    chapterOptions: ["2", "3", "4", "6"],
  },
  {
    id: "p5e",
    level: 5,
    source: "cited",
    text: "The {0} is fulfilled, and the kingdom of God is at hand; repent, and believe in the {1}.",
    answers: ["time", "gospel"],
    accepted: { 0: ["time"], 1: ["gospel", "good news"] },
    typed: [0, 1],
    distractors: ["hour", "age", "word", "promise"],
    bank: false,
    book: "Mark",
    chapter: "1",
    bookOptions: ["Mark", "Matthew", "Luke", "Acts"],
    chapterOptions: ["1", "4", "10", "16"],
  },
  {
    id: "p5f",
    level: 5,
    source: "cited",
    text: "Whether you eat or {0}, or whatever you do, do everything for the {1} of God.",
    answers: ["drink", "glory"],
    accepted: { 0: ["drink"], 1: ["glory"] },
    typed: [0, 1],
    distractors: ["fast", "rest", "honour", "praise"],
    bank: false,
    book: "1 Corinthians",
    chapter: "10",
    bookOptions: ["1 Corinthians", "Colossians", "1 Thessalonians", "Romans"],
    chapterOptions: ["5", "10", "12", "15"],
  },
];

// Ticket metadata now lives in vaultTickets.js, shared across every Vault
// Game -- re-exported here so existing imports of TICKETS from this file
// keep working.
export { TICKETS } from './vaultTickets.js';

// THE BOOK OF KNOWLEDGE — the one reward for sealing the manuscript. Flat,
// not tiered by performance: every student who finishes all five leaves
// gets the same haul, regardless of marks. (`marks` is still tracked and
// shown during play as a personal-best kind of stat, it just no longer
// gates the reward.) `unlockTokens` isn't a ticket -- it's the separate
// top-level `unlockTokens` counter field on the student doc.
export const BOOK_OF_KNOWLEDGE_REWARD = {
  tickets: [
    { key: "sigil", count: 10 },
    { key: "seal", count: 10 },
    { key: "scroll", count: 10 },
    { key: "herald", count: 10 },
    { key: "shard", count: 25 },
  ],
  unlockTokens: 4,
};

// THE CATECHISM — shown once, between sealing the manuscript and opening
// the Book of Knowledge. Mandatory: no skip, no close button. Gated on
// BOTH a minimum read time and scrolling to the end, so it can't be
// clicked through instantly -- see scriptorium.js's showCatechism().
//
// Content is real catechesis, not filler: every citation below is a real,
// checkable source (Dei Verbum 21, 2 Timothy 3:16, Romans 10:17, and the
// St. Jerome line the Catechism itself quotes at CCC 133). If this is ever
// revised, keep every quote attributable to an actual document -- nothing
// invented or paraphrased into a fake citation.
export const CATECHISM_MIN_SECONDS = 90;

export const CATECHISM = {
  title: "Why We Guard These Words",
  intro: "Before you open your reward, sit with why this book was ever worth restoring in the first place.",
  sections: [
    {
      heading: "Not Just Old Stories",
      body: "What you just restored were not literary curiosities. They are Sacred Scripture — the Word of God, set down in human words. The Church teaches that in the Bible, God is not merely described; God speaks. When you read Scripture, you are not only studying history. You are being addressed.",
      quote: "In the sacred books, the Father who is in heaven meets his children with great love and speaks with them.",
      quoteSource: "Dei Verbum, 21"
    },
    {
      heading: "One Author, One Story",
      body: "The Old and New Testaments were written across more than a thousand years, by dozens of human authors, in three different languages — yet the Church has always read them as one story, with one divine Author, fulfilled in Jesus Christ. Every passage you restored today, from Genesis to the Gospels, points toward the same Word made flesh.",
      quote: "All Scripture is inspired by God and is useful for teaching, for reproof, for correction, and for training in righteousness.",
      quoteSource: "2 Timothy 3:16"
    },
    {
      heading: "Especially for You, Baptized in Christ",
      body: "If you are a baptized Catholic, Scripture is not optional reading — it is part of what you were claimed for at the font. Faith is not only believing a set of facts; it grows the way it was given: through hearing and reading the Word. A Doctor of the Church put it more bluntly than most homilies dare to.",
      quote: "Faith comes from what is heard, and what is heard comes through the word of Christ.",
      quoteSource: "Romans 10:17"
    },
    {
      heading: "What the Monks Knew",
      body: "Long before printing presses, monks spent entire lifetimes in rooms like the one you just sat in — real scriptoria — copying the Bible one letter at a time by candlelight, because they believed these words were worth more than their own comfort, eyesight, or years. You spent a few minutes restoring a handful of worn phrases. They spent their lives making sure none were ever lost. That is how seriously the Church has always taken this book.",
      quote: "Ignorance of Scripture is ignorance of Christ.",
      quoteSource: "St. Jerome, quoted in the Catechism of the Catholic Church, 133"
    },
    {
      heading: "What Now?",
      body: "You don't need a scriptorium to keep this going. Open a Bible — or an app — and read one short passage today, even five verses. Ask what it says about God, and what it asks of you. That is the beginning of praying with Scripture, a practice the Church has handed down for centuries under a Latin name: lectio divina. The manuscript in this game is only ever restored once. The real one is never finished. It's meant to be read again, for the rest of your life."
    }
  ]
};
