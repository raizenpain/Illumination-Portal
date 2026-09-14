// ============================================
// TREASURE REVEAL — shared "open the treasure" reward moment for
// every Side Quest (see sideQuests.js's per-quest treasureIcon).
// Builds its own DOM at call time so each quest page just needs one
// import + one call, rather than hand-authoring the popup markup on
// three separate HTML pages. Styling lives in style.css (.treasure-*).
//
// Returns a Promise that resolves once the student dismisses it via
// "Nice!" — the "Back to Dashboard" button (shown by default, pass
// dashboardButton: false to hide it) navigates away instead, so callers
// awaiting this only need to handle "stayed here". Hide it for any
// multi-stage sequence (see vaultCapstone.js) where navigating away
// mid-sequence would cut the reveal short.
//
// Pass celebration: true for a bigger moment (currently only the Vault
// Capstone uses this) -- a richer gold double-ring, a bolder heading
// pop, a confetti burst, and a short achievement chime on open. Every
// other caller (Side Quests, individual Vault Games) is untouched by
// this, since it's purely additive/opt-in.
// ============================================

const CONFETTI_COLORS = ['#FBBF24', '#FDE68A', '#F59E0B', '#FFF3D6', '#EF4444', '#56B2BB'];

// Exported so vaultCapstone.js's hand-built Silver Key picker (which
// needs its own interactive markup showTreasureReveal() can't provide)
// can still trigger the same confetti/chime moment for visual
// consistency with the other 3 celebration-mode reveal stages.
export function spawnConfetti(container) {
  const burst = document.createElement('div');
  burst.className = 'treasure-confetti';
  let maxLife = 0;
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const duration = 1.8 + Math.random() * 0.9;
    const delay = Math.random() * 0.35;
    maxLife = Math.max(maxLife, duration + delay);
    piece.style.setProperty('--x', `${Math.random() * 100}%`);
    piece.style.setProperty('--color', CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
    piece.style.setProperty('--size', `${5 + Math.random() * 6}px`);
    piece.style.setProperty('--duration', `${duration}s`);
    piece.style.setProperty('--delay', `${delay}s`);
    piece.style.setProperty('--spin', `${(Math.random() > 0.5 ? 1 : -1) * (320 + Math.random() * 400)}deg`);
    burst.appendChild(piece);
  }
  container.appendChild(burst);
  setTimeout(() => burst.remove(), (maxLife + 0.2) * 1000);
}

// A short, self-contained ascending chime -- plain oscillators, no
// audio asset needed (same lightweight approach the Vault Games' own
// sfx already use), separate from the generic site-wide click sound in
// clickSound.js since this is meant to feel like a bigger moment than
// an ordinary button press.
export function playAchievementChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch (err) {
    // Sound is a nice-to-have -- never worth breaking the reveal over.
  }
}

export function showTreasureReveal({ iconSrc, kicker = 'Side Quest Complete', heading, subheading, chips = [], dashboardButton = true, celebration = false }) {
  return new Promise((resolve) => {
    const boxClass = celebration ? 'treasure-box celebration' : 'treasure-box';
    const overlay = document.createElement('div');
    overlay.className = 'treasure-popup';
    overlay.innerHTML = `
      <div class="${boxClass}" data-stage="chest">
        <p class="treasure-kicker">${kicker}</p>
        <div class="treasure-stage">
          <div class="treasure-glow"></div>
          <div class="treasure-icon-frame">
            <img src="${iconSrc}" alt="">
            <div class="treasure-shine"></div>
          </div>
          <div class="treasure-sparkles">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
        <h2 class="treasure-heading">${heading}</h2>
        ${subheading ? `<p class="treasure-sub">${subheading}</p>` : ''}
        <button type="button" class="treasure-open-btn">Open the Treasure</button>
      </div>
      <div class="${boxClass} hidden" data-stage="reveal">
        <div class="treasure-reveal-icon">🎉</div>
        <h2 class="treasure-heading">${heading}</h2>
        <p class="treasure-sub">Here's what you earned:</p>
        <div class="treasure-reward-chips">
          ${chips.map((chip) => `<span class="treasure-chip">${chip}</span>`).join('')}
        </div>
        <div class="treasure-actions">
          <button type="button" class="treasure-close-btn">Nice!</button>
          ${dashboardButton ? '<button type="button" class="treasure-dashboard-btn">Back to Dashboard</button>' : ''}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const chestStage = overlay.querySelector('[data-stage="chest"]');
    const revealStage = overlay.querySelector('[data-stage="reveal"]');

    overlay.querySelector('.treasure-open-btn').addEventListener('click', () => {
      chestStage.classList.add('hidden');
      revealStage.classList.remove('hidden');
      if (celebration) {
        spawnConfetti(revealStage);
        playAchievementChime();
      }
    });
    overlay.querySelector('.treasure-close-btn').addEventListener('click', () => {
      overlay.remove();
      resolve();
    });
    const dashboardBtn = overlay.querySelector('.treasure-dashboard-btn');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
      });
    }
  });
}
