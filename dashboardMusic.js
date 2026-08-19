// ============================================
// DASHBOARD BACKGROUND MUSIC — loops a low-volume ambient track while
// a student is on the dashboard. Browsers block autoplay, so it only
// starts after the first click/keypress/touch anywhere on the page
// (mirroring how clickSound.js already listens site-wide). A mute
// toggle, remembered in localStorage across visits, lets a student
// turn it off entirely -- ambient music isn't for everyone.
// ============================================

const MUSIC_URL = 'assets/sounds/dashboard-bgm.mp3';
const MUSIC_VOLUME = 0.19;
const MUTE_KEY = 'dashboardMusicMuted';

const audio = new Audio(MUSIC_URL);
audio.loop = true;
audio.volume = MUSIC_VOLUME;
audio.preload = 'none'; // don't fetch ~7MB until the student actually interacts

let started = false;
let muted = localStorage.getItem(MUTE_KEY) === 'true';

function updateToggleButton(btn) {
  btn.textContent = muted ? '🔇' : '🔊';
  btn.setAttribute('aria-pressed', String(!muted));
  btn.title = muted ? 'Unmute background music' : 'Mute background music';
}

function tryStart() {
  if (started || muted) return;
  started = true;
  audio.play().catch(() => {
    // Autoplay still blocked for some reason -- allow a retry on the
    // next interaction instead of giving up silently forever.
    started = false;
  });
}

export function initDashboardMusic(toggleButtonId) {
  const btn = document.getElementById(toggleButtonId);

  if (btn) {
    updateToggleButton(btn);
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      muted = !muted;
      localStorage.setItem(MUTE_KEY, String(muted));
      updateToggleButton(btn);
      if (muted) {
        audio.pause();
      } else {
        tryStart();
      }
    });
  }

  function kickoff(event) {
    if (btn && event.target.closest && event.target.closest(`#${toggleButtonId}`)) {
      return; // the toggle button's own handler already decides for itself
    }
    tryStart();
  }

  window.addEventListener('click', kickoff, true);
  window.addEventListener('keydown', kickoff, true);
  window.addEventListener('touchstart', kickoff, true);

  // Leaving the dashboard for a task page (a puzzle, a chapter, a
  // quiz...) is a real navigation, so this whole script -- and the
  // music with it -- is torn down naturally; nothing special is
  // needed for "stops when you open a task." The one gap is the
  // browser's back/forward cache: navigating Back can restore this
  // exact page (and its still-playing Audio object) instead of
  // re-running the script from scratch. `pagehide` fires in both
  // cases, so resetting here guarantees a return trip to the
  // dashboard always starts the song over from 0:00, never resumes
  // mid-track.
  window.addEventListener('pagehide', () => {
    audio.pause();
    audio.currentTime = 0;
    started = false;
  });
}
