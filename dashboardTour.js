// ============================================
// DASHBOARD GUIDED TOUR — first-visit walkthrough spotlighting the
// main sections of the dashboard. Runs once per student; completion
// (or Skip) is persisted to the student doc via hasSeenDashboardTour
// so it never shows again, on this device or any other.
// ============================================

import { db, doc, updateDoc } from './firebase.js';

const STEPS = [
  {
    selector: '.id-card',
    title: 'Your ID Card',
    body: "Your name, section, Student ID, and a daily Gospel verse — always visible at the top of your dashboard."
  },
  {
    selector: '.stats-panel',
    title: 'Progress & Rank',
    body: "Track how far you've come through each Season, and see your current Rank and stars."
  },
  {
    selector: '.puzzle-section',
    title: 'Your Formation Journey',
    body: 'Complete puzzles and chapters here to move through Prelim, Midterm, Semifinal, and Final Season.'
  },
  {
    selector: '.craft-section',
    title: 'Crafting Status',
    body: "See what artifact you're building and what you still need to unlock it."
  },
  {
    selector: '.community-section',
    title: 'Community & Rankings',
    body: 'See what fellow seekers are accomplishing right now, and check the Top 5 Hall of Fame.'
  },
  {
    // ".dashboard-sidebar > .badge-section" -- deliberately a direct-
    // child selector. ".badge-section" alone would match the nested
    // "Rankings" block inside .community-section first (DOM order),
    // not this Achievements/Ticket-Trader block.
    selector: '.dashboard-sidebar > .badge-section',
    title: 'Achievements & Ticket Trader',
    body: "View badges you've earned, and trade tickets you collect for Artifact Unlock Tokens here."
  }
];

export function initDashboardTour({ email, hasSeenTour, isAdmin }) {
  if (isAdmin || hasSeenTour) return;

  const steps = STEPS
    .map(step => ({ ...step, el: document.querySelector(step.selector) }))
    .filter(step => step.el);

  if (!steps.length) return;

  const studentRef = doc(db, 'students', email);
  let index = 0;

  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';

  const spotlight = document.createElement('div');
  spotlight.className = 'tour-spotlight';

  const card = document.createElement('div');
  card.className = 'tour-card';
  card.innerHTML = `
    <p class="tour-step-label" id="tourStepLabel"></p>
    <h3 id="tourTitle"></h3>
    <p id="tourBody"></p>
    <div class="tour-dots" id="tourDots"></div>
    <div class="tour-actions">
      <button type="button" class="back-btn" id="tourBackBtn">Back</button>
      <button type="button" class="submit-quiz-btn" id="tourNextBtn">Next</button>
    </div>
    <button type="button" class="tour-skip-btn" id="tourSkipBtn">Skip tour</button>
  `;

  overlay.appendChild(spotlight);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const titleEl = card.querySelector('#tourTitle');
  const bodyEl = card.querySelector('#tourBody');
  const labelEl = card.querySelector('#tourStepLabel');
  const dotsEl = card.querySelector('#tourDots');
  const backBtn = card.querySelector('#tourBackBtn');
  const nextBtn = card.querySelector('#tourNextBtn');
  const skipBtn = card.querySelector('#tourSkipBtn');

  dotsEl.innerHTML = steps.map(() => '<span class="tour-dot"></span>').join('');
  const dots = Array.from(dotsEl.children);

  let rafPending = false;
  function scheduleReposition() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      positionSpotlight(steps[index].el);
    });
  }

  function positionSpotlight(el) {
    const rect = el.getBoundingClientRect();
    const pad = 8;
    spotlight.style.top = Math.max(rect.top - pad, 0) + 'px';
    spotlight.style.left = Math.max(rect.left - pad, 0) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';
  }

  function renderStep() {
    const step = steps[index];
    labelEl.textContent = `Step ${index + 1} of ${steps.length}`;
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    backBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = index === steps.length - 1 ? 'Got it!' : 'Next';

    step.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    scheduleReposition();
  }

  function finish() {
    window.removeEventListener('scroll', scheduleReposition, true);
    window.removeEventListener('resize', scheduleReposition);
    overlay.remove();
    updateDoc(studentRef, { hasSeenDashboardTour: true }).catch(err => {
      console.error('Failed to save dashboard tour completion:', err);
    });
  }

  backBtn.addEventListener('click', () => {
    if (index > 0) { index -= 1; renderStep(); }
  });
  nextBtn.addEventListener('click', () => {
    if (index < steps.length - 1) { index += 1; renderStep(); }
    else finish();
  });
  skipBtn.addEventListener('click', finish);

  window.addEventListener('scroll', scheduleReposition, true);
  window.addEventListener('resize', scheduleReposition);

  renderStep();
}
