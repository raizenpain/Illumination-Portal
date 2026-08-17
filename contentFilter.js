// ============================================
// CONTENT FILTER — lightweight client-side checks for free-text
// submissions (journal/task/recitation nodes, the reflection gates).
// A first line of defense at submit time, not a guarantee: creative
// misspellings/spacing slip past the word list, and none of this is
// real language understanding — a determined student can still work a
// couple of prompt keywords into unrelated sentences. Actually judging
// whether an answer demonstrates understanding needs a human, which is
// what the Dungeon Master's read-only student review view
// (student-view.html) is for.
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

// Catches keyboard-mashing ("asdfasdf", "kjkjkjkj", one huge spaceless
// run-on), not bad spelling or bad grammar. A "word" over 20 letters
// (longer than any real English word), with too low a vowel ratio, or
// with a run of 5+ consonants in a row, essentially never happens in
// real English — all near-certain signs of mashed keys. Requiring 70%
// of words to clear that bar tolerates the occasional typo/abbreviation
// /proper noun without tolerating a submission that's mostly noise.
export function looksLikeGibberish(text) {
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  if (words.length === 0) return true;

  const realLooking = words.filter((word) => {
    if (word.length <= 2) return true;
    if (word.length > 20) return false;
    const vowelRatio = (word.match(/[aeiou]/g) || []).length / word.length;
    if (vowelRatio < 0.2) return false;
    if (/[^aeiou']{5,}/.test(word)) return false;
    return true;
  });

  return realLooking.length / words.length < 0.7;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'as', 'from',
  'and', 'or', 'but', 'if', 'that', 'this', 'these', 'those', 'it',
  'its', 'your', 'you', 'we', 'our', 'they', 'their', 'he', 'she',
  'his', 'her', 'what', 'why', 'how', 'when', 'where', 'who', 'which',
  'discuss', 'explain', 'describe', 'reflect', 'identify', 'according',
  'module', 'about', 'into', 'than', 'then', 'each', 'both', 'also'
]);

function extractKeywords(text) {
  return [...new Set(
    (text.toLowerCase().match(/[a-z']+/g) || []).filter(
      (word) => word.length >= 4 && !STOPWORDS.has(word)
    )
  )];
}

// Loose relevance check: does the answer contain at least a couple of
// the meaningful (non-stopword) words from the question itself? This
// only catches answers with essentially zero connection to what was
// asked (boilerplate, copy-paste from an unrelated source, "I don't
// know just give me credit") — a paraphrased answer that avoids the
// prompt's exact wording will still pass, which is the right failure
// mode for a check this cheap: false negatives over false positives.
export function isOffTopic(answerText, ...promptSources) {
  const keywords = [...new Set(promptSources.flatMap(extractKeywords))];
  if (keywords.length === 0) return false;

  const answerLower = answerText.toLowerCase();
  const hits = keywords.filter((k) => answerLower.includes(k));
  return hits.length < Math.min(2, keywords.length);
}
