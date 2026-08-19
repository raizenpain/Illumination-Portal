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
// Expanded per a 2026 Filipino/Bisaya/English student slang reference
// compiled for this classroom -- deliberately broad by request: every
// term the reference document flags, across English, Tagalog, and
// Cebuano/Bisaya profanity AND casual Gen-Z/internet/gaming/texting
// slang, is treated as inappropriate for this app's spiritual and
// human formation context, not just outright profanity.
//
// Notably absent: "hell" and "damn"/"damnation". This is a Religious
// Education app whose actual coursepack covers sin, judgment, and
// salvation — students legitimately need to write those words when
// reflecting on Module 3/4 content. This is the one deliberate
// exception; everything else the reference document listed is here.
//
// Also left out: the reference's own "Philippine code-switching"
// example SENTENCES (e.g. "Bro, yawa man ka.") -- those are
// illustrative combinations, not reusable list entries. Every
// individual word in them (yawa, buang, cooked, lock in, etc.) is
// already covered on its own. And "P.I." (the abbreviation for
// "Putang ina") is skipped as a bare two-letter-plus-periods token --
// too likely to false-positive on unrelated initials, and "putang
// ina" / "putang ina mo" below already cover the actual phrase.
// ============================================

const BANNED_WORDS = [
  // English profanity
  'fuck', 'fucking', 'fuck you', 'shit', 'bullshit', 'bs', 'asshole',
  'bitch', 'bastard', 'dick', 'piss', 'cunt', 'whore', 'slut',
  'douche', 'motherfucker', 'retard', 'nigga', 'faggot', 'crap',
  'stfu', 'fml', 'af', 'wth', 'wtf', 'screw you',

  // English texting/internet slang the reference flags
  'lmao', 'lmfao', 'lol', 'fr', 'frfr', 'idk', 'idc', 'ikr', 'imo',
  'tbh', 'slr', 'skl',

  // Cebuano / Bisaya
  'pisti', 'peste', 'yawa', 'yawa ka', 'piste ka', 'buang', 'buang ka',
  'giatay', 'giatay ka', 'animal ka', 'atay', 'sus', 'sus nako',
  'ambot', 'samok', 'paugat', 'kapal ug nawong', 'way ayo', 'bitaw',
  'lagi', 'atik', 'bai', 'bay', 'pre', 'bes', 'beshi', 'bisdak',
  'awts', 'hala', 'pastilan', 'petmalu', 'sabaw', 'push', 'tarungun',

  // Filipino / Tagalog
  'putang ina', 'putang ina mo', 'gago', 'gaga', 'tanga', 'bobo',
  'ulol', 'bwisit', 'leche', 'lintik', 'hayop ka', 'pakyu', 'kupal',
  'walang hiya', 'siraulo', 'pikon', 'epal', 'feelingera',
  'feelingero', 'dasurv', 'iyacc', 'naur', 'arat', 'omsim', 'oms',
  'chariz', 'charot', 'chz', 'budol', 'deins', 'keri', 'bussin',
  'nonchalant', 'main character energy',

  // Connector words from the reference doc's Philippine code-switching
  // examples (Section F) that aren't already covered above. "Wala" is
  // deliberately excluded -- it's core Bisaya/Tagalog grammar ("none/
  // nothing/there isn't"), not slang.
  'bro', 'grabe',

  // Gen-Z / internet jargon
  'no cap', 'cap', 'bet', 'lowkey', 'highkey', 'rizz', 'w', 'dub', 'l',
  'goat', 'goated', 'mid', 'fire', 'slay', 'ate', "it's giving",
  'delulu', 'cringe', 'based', 'valid', 'ratio', 'cook',
  'let him cook', 'cooked', 'skill issue', 'touch grass', 'npc',
  'yapping', 'yapper', 'brainrot', 'aura', 'aura points', 'lock in',
  'crash out',

  // Filipino social-media / relationship / everyday slang
  'sana all', 'lodi', 'werpa', 'eme', 'emz', 'chika', 'jowa',
  'ghosting', 'relate', 'flex', 'forda', 'shet', 'shuta', 'labs',
  'astig', 'kilig', 'beshie', 'oks', 'luh', 'tara', 'seen zone',
  'fomo', 'yolo', 'chibog', 'keri lang', 'walwal',

  // Gaming / online jargon
  'gg', 'ggwp', 'ez', 'diff', 'carry', 'feed', 'feeding', 'afk',
  'clutch', 'nerf', 'buff', 'op', 'noob', 'smurf', 'tilted', 'sweaty',
  'wipe'
];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsBannedWord(text) {
  const normalized = text.toLowerCase();
  return BANNED_WORDS.some((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(normalized));
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
