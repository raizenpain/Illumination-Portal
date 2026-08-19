// ============================================
// DASHBOARD EMBER BACKGROUND — small glowing particles drifting
// upward behind the dashboard's existing light page background.
// Self-initializing (like clickSound.js) -- just include the
// <script> tag, nothing to call. Dashboard-only by design: task
// pages (puzzle, challenge, season, reflection) stay plain so
// nothing competes with actual reading/quiz focus.
//
// Runs on a <canvas> the script creates and prepends to <body>,
// position:fixed with z-index:-1 so it paints above the page's own
// background color but behind every other element regardless of
// their DOM order -- and pointer-events:none, so it never blocks a
// click. Respects prefers-reduced-motion by simply not animating
// (particles still render, just hold still) rather than hiding the
// effect outright.
// ============================================

const DENSITY = 60; // "strong"
const EMBER_COLORS = ['#FBBF24', '#FFE9B0', '#FF8A3D', '#F97316'];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.createElement('canvas');
canvas.id = 'emberCanvas';
canvas.setAttribute('aria-hidden', 'true');
Object.assign(canvas.style, {
  position: 'fixed',
  inset: '0',
  zIndex: '-1',
  pointerEvents: 'none'
});
document.body.prepend(canvas);

const ctx = canvas.getContext('2d');

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Ember {
  constructor() {
    this.reset(true);
  }

  reset(initial) {
    this.x = rand(0, canvas.width);
    this.y = initial ? rand(0, canvas.height) : canvas.height + rand(10, 60);
    this.size = rand(1.4, 3.6);
    this.speedY = rand(0.25, 0.75);
    this.swaySpeed = rand(0.005, 0.018);
    this.swayOffset = rand(0, Math.PI * 2);
    this.baseAlpha = rand(0.35, 0.9);
    this.flickerSpeed = rand(0.02, 0.06);
    this.flickerOffset = rand(0, Math.PI * 2);
    this.color = EMBER_COLORS[Math.floor(rand(0, EMBER_COLORS.length))];
    this.life = 0;
  }

  update() {
    this.life += 1;
    this.y -= this.speedY;
    this.x += Math.sin(this.life * this.swaySpeed + this.swayOffset) * 0.6;
    if (this.y < -20) this.reset(false);
  }

  draw() {
    const flicker = 0.6 + 0.4 * Math.sin(this.life * this.flickerSpeed + this.flickerOffset);
    const alpha = this.baseAlpha * flicker;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = this.size * 4;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const embers = Array.from({ length: DENSITY }, () => new Ember());

function tick() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  embers.forEach((ember) => {
    if (!prefersReducedMotion) ember.update();
    ember.draw();
  });
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
