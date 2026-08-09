// Pulls today's Gospel reading from Evangelizo (evangelizo.org) and trims it
// down to a short excerpt for the dashboard's inspirational quote card.
// Cached in localStorage per calendar day so we only fetch once per visit.

const EVANGELIZO_BASE = 'https://feed.evangelizo.org/v2/reader.php';

const FALLBACK_QUOTES = [
  { text: 'Come to me, all who labor and are heavy laden, and I will give you rest.', ref: 'Matthew 11:28' },
  { text: 'I am the light of the world; whoever follows me will not walk in darkness.', ref: 'John 8:12' },
  { text: 'Let the little children come to me, and do not hinder them.', ref: 'Matthew 19:14' },
  { text: 'Ask, and it will be given to you; seek, and you will find.', ref: 'Matthew 7:7' },
  { text: 'Love one another, as I have loved you.', ref: 'John 13:34' }
];

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function cacheKey(dateStr) {
  return `gospel_quote_${dateStr}`;
}

function decodeAndStrip(html) {
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n');
  const div = document.createElement('div');
  div.innerHTML = withBreaks;
  return div.textContent.trim();
}

function pickShortExcerpt(fullText, maxLen = 150) {
  const sentences = fullText
    .split('\n')
    .join(' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let excerpt = sentences[0] || fullText;
  if (excerpt.length < 40 && sentences[1]) {
    excerpt += ' ' + sentences[1];
  }
  if (excerpt.length > maxLen) {
    excerpt = excerpt.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
  }
  return excerpt;
}

function formatRef(rawRef) {
  return rawRef
    .replace(/(\d+),(\d)/, '$1:$2')
    .replace(/\.\s*$/, '')
    .trim();
}

async function fetchGospelQuote(dateStr) {
  const [textRes, refRes] = await Promise.all([
    fetch(`${EVANGELIZO_BASE}?date=${dateStr}&type=reading&lang=AM&content=GSP`),
    fetch(`${EVANGELIZO_BASE}?date=${dateStr}&type=reading_st&lang=AM&content=GSP`)
  ]);

  if (!textRes.ok || !refRes.ok) throw new Error('Gospel service unavailable');

  const fullText = decodeAndStrip(await textRes.text());
  const ref = formatRef(decodeAndStrip(await refRes.text()));

  if (!fullText) throw new Error('Empty gospel text');

  return { text: pickShortExcerpt(fullText), ref };
}

export async function loadGospelQuote() {
  const dateStr = todayString();
  const cached = localStorage.getItem(cacheKey(dateStr));

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // corrupted cache entry — fall through and refetch
    }
  }

  try {
    const quote = await fetchGospelQuote(dateStr);
    localStorage.setItem(cacheKey(dateStr), JSON.stringify(quote));
    return quote;
  } catch (err) {
    console.warn('Falling back to offline gospel quote:', err);
    return FALLBACK_QUOTES[new Date().getDate() % FALLBACK_QUOTES.length];
  }
}
