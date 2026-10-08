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
// Notably absent: "hell" and "damn"/"damnation", and "sex" on its
// own. This is a Religious Education app whose actual coursepack
// covers sin, judgment, salvation, and (via Theology of the Body /
// chastity content) human sexuality — students legitimately need to
// write those words reflecting on that coursework. These are the
// deliberate exceptions; everything else the reference document
// listed is here, plus explicit sexual vocabulary/phrases the
// original slang reference didn't cover at all.
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
  'fuck', 'fucking', 'fuckin', 'fuck you', 'shit', 'bullshit', 'bs', 'asshole',
  'bitch', 'bastard', 'dick', 'piss', 'cunt', 'whore', 'slut',
  'douche', 'motherfucker', 'retard', 'nigga', 'faggot', 'crap',
  'stfu', 'fml', 'af', 'wth', 'wtf', 'screw you', 'stupid', 'idiot',

  // English texting/internet slang the reference flags
  'lmao', 'lmfao', 'lol', 'fr', 'frfr', 'idk', 'idc', 'ikr', 'imo',
  'tbh', 'slr', 'skl',

  // Cebuano / Bisaya
  'pisti', 'peste', 'yawa', 'yawa ka', 'piste ka', 'buang', 'buang ka',
  'giatay', 'giatay ka', 'animal ka', 'atay', 'sus', 'sus nako',
  'ambot', 'samok', 'paugat', 'kapal ug nawong', 'way ayo', 'bitaw',
  'lagi', 'atik', 'bai', 'bay', 'pre', 'bes', 'beshi', 'bisdak',
  'awts', 'hala', 'pastilan', 'petmalu', 'sabaw', 'push', 'tarungun',
  '8080 ka ba', 'baho', 'bahog',

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
  'wipe',

  // Explicit sexual content -- reported missing from the earlier
  // pass (that slang reference didn't cover explicit vocabulary,
  // just profanity/insults/casual slang). "sex" itself is
  // deliberately NOT here, same reasoning as hell/damn above: a
  // Theology of the Body / chastity module legitimately uses
  // "sex"/"sexuality" academically, so only explicit phrases and
  // outright vulgar terms are blocked, not the bare word.
  'iyot', 'iyot ta', 'oten', 'bilat', 'kiss ko bilat', 'kiss ko oten',
  'chupa', 'sexual intercourse', 'phone sex', 'same sex intercourse',
  'same-sex intercourse'
];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Ordinary English words that are ALSO on the slang list above, but that a
// reflection on Catholic formation uses in their normal sense all the time
// ("tongues of fire", "carry my cross", "feed the hungry", "Jesus ate with
// sinners", "I can relate", "based on the Gospel", "mid-term"). Run against
// real coursework sentences, the full list rejected nine of ten -- and a
// rejected reflection blocks the student from unlocking the next season.
// These are exempt ONLY for graded coursework (reflections, season
// journals), never for the class chat, where the slang meaning is exactly
// what the filter is there to stop. Edit this set to tune it.
const COURSEWORK_EXEMPT = new Set([
  'fire', 'carry', 'feed', 'feeding', 'ate', 'relate', 'based', 'valid',
  'mid', 'pre', 'push', 'wipe', 'cook', 'cap', 'bet', 'buff', 'ratio', 'diff', 'op'
]);

// "Fr." before a name is Father (Fr. Pedro), not the slang "fr" (for real).
const FATHER_TITLE = /\bFr\.?(?=\s+[A-Z])/g;

// ---- disguised words ----
// Matching whole words exactly as typed lets "b o b o", "b.o.b.o",
// "8080", "b0b0" and "bobooo" all walk straight past the list, so every
// check also undoes the usual tricks and looks again (Jornie, 2026-10-07:
// "block it in the entire system of the portal"):
//   spelled out    letters split by spaces, dots, dashes, underscores
//                  or stars are joined back up ("b o b o" -> "bobo"),
//                  and a word hidden among other single letters is
//                  still found ("u r a b o b o")
//   look-alikes    digits and symbols standing in for letters inside a
//                  word are swapped back ("b0b0", "g@go", "$hit")
//   all digits     a word written entirely in digits ("8080" for bobo).
//                  Only the spellings listed in DIGIT_WORDS: turning
//                  every number into letters would start rejecting room
//                  numbers and scores ("473" reads as "ate")
//   stretched      a letter repeated three or more times is cut down
//                  ("bobooo", "gaaago")
//   run together   a listed phrase typed without its spaces
//                  ("putangina" for "putang ina")
//
// Un-disguising can only ever flag MORE text, and a wrongly rejected
// reflection blocks a student from the next season, so two limits keep
// it honest:
//   - Look-alikes and stretched letters only count for list entries of
//     four letters or more. Without that, "www.vatican.va" reads as the
//     slang "w", vitamin "B5" as "bs" and "1mo" (one month) as "imo".
//   - The coursework exemptions (COURSEWORK_EXEMPT) apply here too.
// Still not caught: misspellings ("bubu"), words run together, and any
// sentence that is unkind without using a listed word. That needs a
// human, as the note at the top of this file says.

const LOOKALIKES = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's' };
const DIGIT_WORDS = { 8080: 'bobo' };
const unswap = (token) => {
  if (DIGIT_WORDS[token]) return DIGIT_WORDS[token];
  return /[a-z]/.test(token) && /[0134578@$]/.test(token) ? token.replace(/[0134578@$]/g, (ch) => LOOKALIKES[ch]) : token;
};
// Entries long enough that a match after un-disguising is not a coincidence.
const LONG_WORDS = BANNED_WORDS.filter((word) => word.length >= 4);
// ...and, of those, the single words that can be spotted INSIDE a run of
// spelled-out letters.
const HIDEABLE_WORDS = LONG_WORDS.filter((word) => /^[a-z]+$/.test(word));
// Listed phrases with their spaces taken out ("putang ina" -> "putangina").
const SQUASHED_PHRASES = BANNED_WORDS
  .filter((word) => /^[a-z]+(?: [a-z]+)+$/.test(word))
  .map((word) => ({ word, squashed: word.replace(/ /g, '') }))
  .filter((phrase) => phrase.squashed.length >= 6);
const squashedIn = (text, coursework, wholeWord) => {
  const hit = SQUASHED_PHRASES.find((p) => allowed(p.word, coursework) &&
    (wholeWord ? new RegExp(`\\b${p.squashed}`).test(text) : text.includes(p.squashed)));
  return hit ? hit.word : null;
};

const allowed = (word, coursework) => !(coursework && COURSEWORK_EXEMPT.has(word));

/** The first entry of `words` present in `normalized` as a whole word, or null. */
function matchWholeWord(words, normalized, coursework) {
  return words.find((word) => allowed(word, coursework) && new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(normalized)) || null;
}

/** A banned word written exactly as it is on the list. */
function findPlainWord(text, coursework) {
  return matchWholeWord(BANNED_WORDS, text.replace(FATHER_TITLE, ' ').toLowerCase(), coursework);
}

/** A banned word hidden by one of the tricks described above. */
function findDisguisedWord(text, coursework) {
  const lower = text.toLowerCase();

  // Spelled out: three or more single characters in a row with only
  // separators between them.
  const runs = lower.match(/(?<![a-z0-9@$])(?:[a-z0-9@$][\s.\-_*]+){2,}[a-z0-9@$](?![a-z0-9@$])/g) || [];
  for (const run of runs) {
    const joined = unswap(run.replace(/[\s.\-_*]+/g, ''));
    const exact = matchWholeWord(BANNED_WORDS, joined, coursework);
    if (exact) return exact;
    const inside = HIDEABLE_WORDS.find((word) => allowed(word, coursework) && joined.includes(word));
    if (inside) return inside;
    const phrase = squashedIn(joined, coursework, false);
    if (phrase) return phrase;
  }

  // Look-alikes and stretched letters, word by word.
  const swapped = lower.replace(/[a-z0-9@$]+/g, unswap);
  for (const variant of [swapped, swapped.replace(/([a-z])\1{2,}/g, '$1'), swapped.replace(/([a-z])\1{2,}/g, '$1$1')]) {
    const phrase = squashedIn(variant, coursework, true);
    if (phrase) return phrase;
    if (variant === lower) continue;
    const found = matchWholeWord(LONG_WORDS, variant, coursework);
    if (found) return found;
  }
  return null;
}

/** The first banned word found in `text`, written plainly or disguised,
 *  or null. `coursework: true` applies COURSEWORK_EXEMPT (see above).
 *  Every free-text box in the portal goes through this one function:
 *  class chat, reflections, season tasks, and gift notes. */
export function findBannedWord(text, { coursework = false } = {}) {
  const value = String(text ?? '');
  return findPlainWord(value, coursework) || findDisguisedWord(value, coursework);
}

export function containsBannedWord(text, options) {
  return findBannedWord(text, options) !== null;
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
