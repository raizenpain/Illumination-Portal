// ============================================
// LEGENDARY CARD — a downloadable dark fantasy card for a student's
// forged Legendary (Tier 5) Artifact (2026-10-03).
//
// Drawn straight onto a canvas (1080 x 1512, trading-card 5:7) rather
// than captured from HTML, so glows, gradients and gold text all come out
// exactly the same on every phone and laptop. Downloads as a PNG.
//
// Shown right after the Claim in legendaryForge.js, and re-downloadable
// any time from the Legendary's card on the crafting page.
// ============================================

import { ARTIFACTS, artifactIconPath } from './artifacts.js';

const W = 1080;
const H = 1512;
const LOGO_IMAGE = 'assets/hcdc-logo.png';

/** The large square art for a Legendary (provided by Jornie, 2026-10-03);
 *  the small icon is the fallback. */
export const legendaryArtPath = (tier5Id) => `assets/legendary-art/${tier5Id}.webp`;
const ROMAN = ['I', 'II', 'III', 'IV'];

const ARTIFACT_NAMES = Object.fromEntries(Object.values(ARTIFACTS).flat().map((a) => [a.id, a.name]));

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  // Never let a slow font hold the card up for more than a few seconds.
  await Promise.race([
    Promise.all([document.fonts.load('700 60px Cinzel'), document.fonts.load('600 30px Cinzel')]),
    new Promise((r) => setTimeout(r, 3000))
  ]).catch(() => {});
}

// Same student + same Legendary -> same serial, so re-downloads match.
function serialFor(email, tier5Id) {
  let h = 2166136261;
  for (const ch of `${email}|${tier5Id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return `LEG-${h.toString(36).toUpperCase().padStart(7, '0').slice(-6)}`;
}

function seededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917); return ((s ^= s >>> 16) >>> 0) / 4294967296; };
}

// ---------- drawing helpers ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function goldGradient(ctx, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#FFF3C4');
  g.addColorStop(0.45, '#F2C96A');
  g.addColorStop(0.55, '#D9A441');
  g.addColorStop(1, '#8A5A1A');
  return g;
}

/** Letter-spaced text, centred on cx (canvas letterSpacing isn't everywhere yet). */
function spacedText(ctx, text, cx, y, spacing) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => { ctx.fillText(c, x, y); x += widths[i] + spacing; });
  ctx.textAlign = align;
}

/** Biggest font size (<= max) that fits the text in maxWidth. */
function fitFont(ctx, text, weight, family, max, min, maxWidth) {
  let size = max;
  for (; size > min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

function diamondDivider(ctx, cx, y, half) {
  const line = (x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    const toCentre = x1 > x0;
    g.addColorStop(toCentre ? 0 : 1, 'rgba(201,146,58,0)');
    g.addColorStop(toCentre ? 1 : 0, '#C9923A');
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x1), y - 1, Math.abs(x1 - x0), 2);
  };
  line(cx - half, cx - 22);
  line(cx + half, cx + 22);
  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(Math.PI / 4);
  ctx.shadowColor = 'rgba(233,184,90,.8)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#E9B85A';
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();
}

function cornerOrnament(ctx, x, y, sx, sy) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.strokeStyle = '#C9923A';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 96); ctx.lineTo(0, 18); ctx.quadraticCurveTo(0, 0, 18, 0); ctx.lineTo(96, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(233,184,90,.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(14, 70); ctx.lineTo(14, 26); ctx.quadraticCurveTo(14, 14, 26, 14); ctx.lineTo(70, 14); ctx.stroke();
  ctx.fillStyle = '#C9923A';
  ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(30, 22, 36, 36); ctx.quadraticCurveTo(22, 30, 18, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFD9A0';
  ctx.shadowColor = 'rgba(255,190,80,.9)';
  ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(36, 36, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// The artifact icons have a black frame baked in; find the picture inside
// it (rows/columns brighter than near-black) so it can be drawn without.
function innerBounds(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  let px;
  try { px = cx.getImageData(0, 0, c.width, c.height).data; } catch { return { x: 0, y: 0, w: img.width, h: img.height }; }
  const lum = (i) => (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11);
  const rowBright = (y) => { let s = 0; for (let x = 0; x < c.width; x++) s += lum((y * c.width + x) * 4); return s / c.width; };
  const colBright = (x) => { let s = 0; for (let y = 0; y < c.height; y++) s += lum((y * c.width + x) * 4); return s / c.height; };
  const T = 22;
  let top = 0, bottom = c.height - 1, left = 0, right = c.width - 1;
  while (top < c.height / 3 && rowBright(top) < T) top++;
  while (bottom > (c.height * 2) / 3 && rowBright(bottom) < T) bottom--;
  while (left < c.width / 3 && colBright(left) < T) left++;
  while (right > (c.width * 2) / 3 && colBright(right) < T) right--;
  // A couple of pixels more, to lose the soft edge of the frame.
  const m = 3;
  return { x: left + m, y: top + m, w: right - left + 1 - 2 * m, h: bottom - top + 1 - 2 * m };
}

// The icons are small originals blown up with hard pixel edges. Shrinking
// them back down first and then enlarging with high-quality smoothing
// turns the blocks into a soft, painted look instead.
function drawCover(ctx, img, x, y, w, h, soften = 1, trim = true) {
  const b = trim ? innerBounds(img) : { x: 0, y: 0, w: img.width, h: img.height };
  const scale = Math.max(w / b.w, h / b.h);
  const sw = w / scale, sh = h / scale;
  const sx = b.x + (b.w - sw) / 2, sy = b.y + (b.h - sh) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (soften > 1) {
    const t = document.createElement('canvas');
    t.width = Math.max(1, Math.round(sw / soften));
    t.height = Math.max(1, Math.round(sh / soften));
    const tc = t.getContext('2d');
    tc.imageSmoothingEnabled = true;
    tc.imageSmoothingQuality = 'high';
    tc.drawImage(img, sx, sy, sw, sh, 0, 0, t.width, t.height);
    ctx.drawImage(t, x, y, w, h);
    return;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// ---------- the card ----------

/**
 * Draws the card. chain = a CRAFTING_CHAINS entry; forgedAt = Date or
 * ISO string (optional); returns the canvas.
 */
export async function drawLegendaryCard({ chain, studentName, email = '', forgedAt = null }) {
  const [[bigArt, logo, ...relics]] = await Promise.all([
    Promise.all([
      loadImage(legendaryArtPath(chain.tier5Id)),
      loadImage(LOGO_IMAGE),
      ...chain.chain.map((id) => loadImage(artifactIconPath(id)))
    ]),
    loadFonts()
  ]);

  const art = bigArt || await loadImage(artifactIconPath(chain.tier5Id));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const cx = W / 2;
  const serial = serialFor(email, chain.tier5Id);
  const rand = seededRandom(parseInt(serial.slice(4), 36));

  // Obsidian body with a forge glow from below.
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1B1512');
  g.addColorStop(0.55, '#0E0A09');
  g.addColorStop(1, '#070505');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(cx, H + 120, 40, cx, H + 120, 900);
  g.addColorStop(0, 'rgba(200,70,15,.55)');
  g.addColorStop(1, 'rgba(200,70,15,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(cx, 0, 20, cx, 0, 700);
  g.addColorStop(0, 'rgba(201,146,58,.22)');
  g.addColorStop(1, 'rgba(201,146,58,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Embers.
  for (let i = 0; i < 70; i++) {
    const x = rand() * W, y = H * (0.25 + rand() * 0.75), r = 1.5 + rand() * 3.5;
    const eg = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    eg.addColorStop(0, `rgba(255,220,150,${0.5 + rand() * 0.5})`);
    eg.addColorStop(0.4, 'rgba(255,122,26,.5)');
    eg.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
  }

  // Double gold frame.
  ctx.lineWidth = 10;
  ctx.strokeStyle = goldGradient(ctx, 0, H);
  roundRect(ctx, 22, 22, W - 44, H - 44, 26);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(201,146,58,.7)';
  roundRect(ctx, 44, 44, W - 88, H - 88, 16);
  ctx.stroke();
  cornerOrnament(ctx, 56, 56, 1, 1);
  cornerOrnament(ctx, W - 56, 56, -1, 1);
  cornerOrnament(ctx, 56, H - 56, 1, -1);
  cornerOrnament(ctx, W - 56, H - 56, -1, -1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Kicker + name.
  ctx.font = '600 28px Cinzel, Georgia, serif';
  ctx.fillStyle = '#C9923A';
  spacedText(ctx, '✦  LEGENDARY ARTIFACT  ✦', cx, 128, 6);

  fitFont(ctx, chain.tier5Name.toUpperCase(), 700, 'Cinzel, Georgia, serif', 78, 40, 860);
  ctx.save();
  ctx.fillStyle = goldGradient(ctx, 150, 220);
  ctx.shadowColor = 'rgba(233,184,90,.5)';
  ctx.shadowBlur = 28;
  ctx.fillText(chain.tier5Name.toUpperCase(), cx, 214);
  ctx.shadowColor = 'rgba(0,0,0,.9)';
  ctx.shadowOffsetY = 4;
  ctx.shadowBlur = 6;
  ctx.fillText(chain.tier5Name.toUpperCase(), cx, 214);
  ctx.restore();

  diamondDivider(ctx, cx, 258, 330);

  // The artifact in its window, with light rays behind.
  const aw = 540, ah = 540, ax = (W - aw) / 2, ay = 300;
  const acy = ay + ah / 2;
  ctx.save();
  ctx.translate(cx, acy);
  for (let i = 0; i < 36; i++) {
    ctx.rotate((Math.PI * 2) / 36);
    const rg = ctx.createLinearGradient(0, 0, 0, -620);
    rg.addColorStop(0, 'rgba(255,210,110,.28)');
    rg.addColorStop(1, 'rgba(255,210,110,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-26, -620); ctx.lineTo(26, -620); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.shadowColor = 'rgba(255,170,60,.85)';
  ctx.shadowBlur = 60;
  ctx.fillStyle = '#000';
  roundRect(ctx, ax, ay, aw, ah, 14);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, ax, ay, aw, ah, 14);
  ctx.clip();
  if (art) {
    if (bigArt) drawCover(ctx, art, ax, ay, aw, ah, 1, false);
    else drawCover(ctx, art, ax, ay, aw, ah, 4);
  }
  g = ctx.createRadialGradient(cx, acy, ah * 0.35, cx, acy, aw * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = g;
  ctx.fillRect(ax, ay, aw, ah);
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.strokeStyle = goldGradient(ctx, ay, ay + ah);
  roundRect(ctx, ax, ay, aw, ah, 14);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  roundRect(ctx, ax + 6, ay + 6, aw - 12, ah - 12, 10);
  ctx.stroke();

  // Tier ribbon over the bottom edge of the window.
  const rw = 400, rh = 60, ry = ay + ah - rh / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(255,200,90,.6)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = goldGradient(ctx, ry, ry + rh);
  roundRect(ctx, cx - rw / 2, ry, rw, rh, rh / 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3A2408';
  roundRect(ctx, cx - rw / 2, ry, rw, rh, rh / 2);
  ctx.stroke();
  ctx.font = '700 26px Cinzel, Georgia, serif';
  ctx.fillStyle = '#2A1A05';
  spacedText(ctx, 'TIER V · LEGENDARY', cx, ry + 40, 4);

  // Forged by.
  let y = ay + ah + 92;
  ctx.font = '600 22px Cinzel, Georgia, serif';
  ctx.fillStyle = '#A89272';
  spacedText(ctx, 'FORGED BY', cx, y, 6);
  y += 64;
  const holder = (studentName || 'A Faithful Pilgrim').trim();
  fitFont(ctx, holder, 700, 'Cinzel, Georgia, serif', 56, 30, 840);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.9)';
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#FFE2A8';
  ctx.fillText(holder, cx, y);
  ctx.restore();

  diamondDivider(ctx, cx, y + 40, 260);

  // Forged from: the four chain relics.
  y += 96;
  ctx.font = '600 20px Cinzel, Georgia, serif';
  ctx.fillStyle = '#A89272';
  spacedText(ctx, 'FORGED FROM', cx, y, 6);
  const iw = 168, ih = Math.round(iw * 424 / 546), gap = 26;
  const ix0 = cx - (iw * 4 + gap * 3) / 2, iy = y + 22;
  relics.forEach((img, i) => {
    const x = ix0 + i * (iw + gap);
    ctx.save();
    ctx.shadowColor = 'rgba(255,170,60,.45)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#000';
    roundRect(ctx, x, iy, iw, ih, 8);
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, x, iy, iw, ih, 8);
    ctx.clip();
    if (img) drawCover(ctx, img, x, iy, iw, ih);
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#C9923A';
    roundRect(ctx, x, iy, iw, ih, 8);
    ctx.stroke();
    // Tier numeral badge.
    ctx.fillStyle = '#15100D';
    ctx.strokeStyle = '#C9923A';
    ctx.beginPath(); ctx.arc(x + iw / 2, iy + ih, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = '700 16px Cinzel, Georgia, serif';
    ctx.fillStyle = '#FFE2A8';
    ctx.fillText(ROMAN[i], x + iw / 2, iy + ih + 6);
  });
  const relicNames = chain.chain.map((id) => ARTIFACT_NAMES[id] || id);
  y = iy + ih + 50;
  fitFont(ctx, relicNames.join('  ·  '), 'italic 400', 'Georgia, serif', 20, 14, 880);
  ctx.fillStyle = '#8F7B5E';
  ctx.fillText(relicNames.join('  ·  '), cx, y);

  // Flavor line.
  y += 46;
  ctx.font = 'italic 400 27px Georgia, serif';
  ctx.fillStyle = '#D6C8AE';
  ctx.fillText('Four relics. Every star. Five days in the fire.', cx, y);

  // Footer: logo, portal, date, serial.
  const fy = H - 92;
  const when = forgedAt ? new Date(forgedAt) : null;
  const dateText = when && !Number.isNaN(when.getTime())
    ? when.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const footer = ['ILLUMINATION PORTAL · HCDC', dateText ? dateText.toUpperCase() : null, `No. ${serial}`].filter(Boolean).join('   ·   ');
  fitFont(ctx, footer, 600, 'Cinzel, Georgia, serif', 19, 13, 800);
  const fw = ctx.measureText(footer).width;
  const logoSize = 44;
  const startX = cx - (fw + logoSize + 14) / 2;
  if (logo) ctx.drawImage(logo, startX, fy - logoSize / 2 - 6, logoSize, logoSize);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#A89272';
  ctx.fillText(footer, startX + logoSize + 14, fy + 1);
  ctx.textAlign = 'center';

  return canvas;
}

export function legendaryCardFilename(chain, studentName) {
  const who = (studentName || 'Pilgrim').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  return `Legendary_${chain.tier5Name.replace(/\s+/g, '_')}_${who}.png`;
}

/** Saves the canvas as a PNG. */
export function saveCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(true);
    }, 'image/png');
  });
}

/** Draw + download in one go (used by the crafting page). */
export async function downloadLegendaryCard(opts) {
  const canvas = await drawLegendaryCard(opts);
  return saveCanvas(canvas, legendaryCardFilename(opts.chain, opts.studentName));
}

/** When the Legendary was (or will be) done forging, for the card's date. */
export function forgedDateFor(data, forgeMs) {
  const t = Date.parse(data?.legendaryForgeStartedAt || '');
  return Number.isFinite(t) ? new Date(t + forgeMs) : null;
}
