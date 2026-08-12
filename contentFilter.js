// ============================================
// CONTENT FILTER — lightweight client-side profanity check for
// free-text submissions (journal/recitation nodes, the Prelim
// reflection). This is a first line of defense at submit time, not
// a guarantee: creative misspellings/spacing slip past a word list,
// and no word list can judge whether text is on-topic or nonsense —
// that needs an actual human, which is what the Dungeon Master's
// read-only student review view (student-view.html) is for.
//
// Deliberately a starter list of common English profanity, not an
// exhaustive one — edit BANNED_WORDS freely to fit your classroom.
//
// Notably absent: "hell" and "damn"/"damnation". This is a Religious
// Education app whose actual coursepack covers sin, judgment, and
// salvation — students legitimately need to write those words when
// reflecting on Module 3/4 content. Also left out mild name-calling
// like "stupid"/"idiot"/"crap" since those show up constantly in
// harmless self-deprecating reflection writing ("I used to think X
// was stupid until...") and would cause more false positives than
// they're worth for a hard submit-block.
// ============================================

const BANNED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'piss',
  'cunt', 'whore', 'slut', 'douche', 'motherfucker', 'retard',
  'nigga', 'faggot'
];

export function containsBannedWord(text) {
  const normalized = text.toLowerCase();
  return BANNED_WORDS.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(normalized));
}
