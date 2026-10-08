// ============================================
// SITE-WIDE CLICK SOUND — plays assets/sounds/click.wav on every
// interactive click, everywhere: teacher-select, enroll, dashboard,
// Prelim puzzles, Season Path chapters/nodes, the Dungeon Master
// console, all of it. One <script> include per page (see the <head>
// of each .html file); nothing else needs to change per page.
//
// Decoded once via the Web Audio API and replayed through a fresh
// AudioBufferSourceNode per click (rather than a shared <audio>
// element) so rapid clicks can overlap cleanly instead of one click
// cutting the previous one off mid-sound.
//
// A single delegated listener on `document` (capture phase, so it
// still fires even if a page's own handler calls stopPropagation)
// decides what counts as "interactive" generically -- real buttons/
// links, plus anything styled with cursor:pointer -- rather than
// hard-coding every custom card/tab/node class across every page,
// which would silently miss whatever gets added next.
// ============================================

const CLICK_SOUND_URL = 'assets/sounds/click.wav';
const CLICK_SOUND_VOLUME = 0.5;

let audioCtx = null;
let clickBufferPromise = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getClickBuffer(ctx) {
  if (!clickBufferPromise) {
    clickBufferPromise = fetch(CLICK_SOUND_URL)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data));
  }
  return clickBufferPromise;
}

function playClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    getClickBuffer(ctx).then((buffer) => {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = buffer;
      gain.gain.value = CLICK_SOUND_VOLUME;

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    }).catch(() => {
      // Sound is a nice-to-have -- never worth breaking a click over.
    });
  } catch (err) {
    // Sound is a nice-to-have -- never worth breaking a click over.
  }
}

const INTERACTIVE_SELECTOR =
  'button, a[href], input[type="button"], input[type="submit"], ' +
  'input[type="checkbox"], input[type="radio"], select, [role="button"], label';

function findInteractiveAncestor(start) {
  let node = start;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node.nodeType !== 1) {
      node = node.parentElement;
      continue;
    }
    if ((node.disabled || node.getAttribute?.('aria-disabled') === 'true')) {
      return null;
    }
    if (node.matches(INTERACTIVE_SELECTOR)) {
      return node;
    }
    if (window.getComputedStyle(node).cursor === 'pointer') {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

document.addEventListener('click', (event) => {
  const target = findInteractiveAncestor(event.target);
  if (target) {
    playClickSound();
  }
}, true);
