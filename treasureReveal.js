// ============================================
// TREASURE REVEAL — shared "open the treasure" reward moment for
// every Side Quest (see sideQuests.js's per-quest treasureIcon).
// Builds its own DOM at call time so each quest page just needs one
// import + one call, rather than hand-authoring the popup markup on
// three separate HTML pages. Styling lives in style.css (.treasure-*).
//
// Returns a Promise that resolves once the student dismisses it via
// "Nice!" — the "Back to Dashboard" button navigates away instead, so
// callers awaiting this only need to handle "stayed here".
// ============================================

export function showTreasureReveal({ iconSrc, kicker = 'Side Quest Complete', heading, subheading, chips = [] }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'treasure-popup';
    overlay.innerHTML = `
      <div class="treasure-box" data-stage="chest">
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
      <div class="treasure-box hidden" data-stage="reveal">
        <div class="treasure-reveal-icon">🎉</div>
        <h2 class="treasure-heading">${heading}</h2>
        <p class="treasure-sub">Here's what you earned:</p>
        <div class="treasure-reward-chips">
          ${chips.map((chip) => `<span class="treasure-chip">${chip}</span>`).join('')}
        </div>
        <div class="treasure-actions">
          <button type="button" class="treasure-close-btn">Nice!</button>
          <button type="button" class="treasure-dashboard-btn">Back to Dashboard</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const chestStage = overlay.querySelector('[data-stage="chest"]');
    const revealStage = overlay.querySelector('[data-stage="reveal"]');

    overlay.querySelector('.treasure-open-btn').addEventListener('click', () => {
      chestStage.classList.add('hidden');
      revealStage.classList.remove('hidden');
    });
    overlay.querySelector('.treasure-close-btn').addEventListener('click', () => {
      overlay.remove();
      resolve();
    });
    overlay.querySelector('.treasure-dashboard-btn').addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  });
}
