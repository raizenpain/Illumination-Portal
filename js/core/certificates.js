// ============================================
// CERTIFICATES — the eight certificates a student can earn, which ones
// they've earned, and the dashboard's "My Certificates" shelf
// (2026-10-05).
//
//   Puzzle 1 / 2 / 3                  completion.html?puzzle=N
//   Prelim, Sanctuarium (Vault),
//   Midterm, Semifinal, Final         season-completion.html?season=KEY
//
// Both certificate pages use isCertificateEarned() too, so a typed-in
// address can't produce a certificate the student hasn't earned.
//
// A puzzle counts as earned only when the student SOLVED it: every piece
// plus its completion badge (the same rule as the Disciple bonus;
// vaultCapstone.js's puzzle credit writes the pieces but never the
// badge) — and the Prelim Season certificate needs all three. The
// Sanctuarium certificate needs all five Vault Games completed. A season
// counts once its "<Season> Champion" badge exists.
// ============================================

import { PUZZLE_CONFIG } from '../puzzles/puzzles.js';
import { isPuzzleComplete } from './rank.js';
import { seasonBadgeId } from '../seasons/seasonBadges.js';
import { SEASON_CONTENT } from '../seasons/seasonContent.js';
import { VAULT_GAMES } from '../vault/vaultGames.js';

const VIA_PORTAL = 'through the HCDC Illumination Portal.';
// The three seasons' seals use their rune-stone art (assets/seasons/, AI
// generated, 2026-10-06); `seal` (emoji) stays as the fallback.
const seasonCert = (key, seal, code) => ({
  key, kind: 'season', season: key, seal, sealImage: `assets/seasons/${key}.webp`, theme: key, url: `season-completion.html?season=${key}`,
  title: SEASON_CONTENT[key].seasonName, subtitle: SEASON_CONTENT[key].subtitle,
  certTitle: `Certificate of ${SEASON_CONTENT[key].seasonName} Completion`, line: VIA_PORTAL,
  codeField: `${key}VerificationCode`, codePrefix: code
});
const puzzleCert = (n, seal) => ({
  key: `puzzle${n}`, kind: 'puzzle', puzzle: n, seal, theme: 'prelim', url: `completion.html?puzzle=${n}`,
  title: PUZZLE_CONFIG[n].title, subtitle: PUZZLE_CONFIG[n].subtitle,
  certTitle: 'Certificate of Puzzle Completion', line: `of the Prelim Season, ${VIA_PORTAL}`,
  // Puzzle 1 keeps the original field so codes already submitted stay valid.
  codeField: n === 1 ? 'verificationCode' : `puzzle${n}VerificationCode`, codePrefix: `P${n}`
});

export const CERTIFICATES = [
  puzzleCert(1, '✝️'),
  puzzleCert(2, '🕊️'),
  puzzleCert(3, '🙏'),
  {
    key: 'prelim', kind: 'prelim', seal: '🧩', theme: 'prelim', url: 'season-completion.html?season=prelim',
    title: 'Prelim Season', subtitle: 'The Cross · The Spirituality · The Vocation',
    certTitle: 'Certificate of Prelim Season Completion', line: VIA_PORTAL,
    codeField: 'prelimVerificationCode', codePrefix: 'PRE'
  },
  {
    key: 'vault', kind: 'vault', seal: '🗝️', theme: 'vault', url: 'season-completion.html?season=vault',
    title: 'The Sanctuarium', subtitle: 'All Five Vault Games Conquered',
    certTitle: 'Certificate of Achievement', line: VIA_PORTAL,
    codeField: 'vaultVerificationCode', codePrefix: 'VLT'
  },
  seasonCert('midterm', '🌅', 'MID'),
  seasonCert('semifinal', '🌑', 'SEM'),
  seasonCert('final', '🌄', 'FIN')
];

export const certificateByKey = (key) => CERTIFICATES.find((c) => c.key === key) || null;

function solvedPuzzle(n, data) {
  const config = PUZZLE_CONFIG[n];
  return !!config && isPuzzleComplete(config, data) && (data.achievements || []).includes(config.completionAchievement.id);
}

export function isCertificateEarned(cert, data) {
  if (!cert || !data) return false;
  if (cert.kind === 'puzzle') return solvedPuzzle(cert.puzzle, data);
  if (cert.kind === 'prelim') return Object.keys(PUZZLE_CONFIG).every((n) => solvedPuzzle(Number(n), data));
  if (cert.kind === 'vault') return Object.keys(VAULT_GAMES).every((id) => ((data.vaultGames || {})[id] || {}).completed);
  return (data.achievements || []).includes(seasonBadgeId(cert.season));
}

/** The date a certificate was first issued, saved once in
 *  certificateDates.<key>; null if it hasn't been issued yet. */
export function certificateDate(cert, data) {
  const iso = (data.certificateDates || {})[cert.key];
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? new Date(t) : null;
}

export function formatCertificateDate(date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Fills the dashboard's "My Certificates" shelf. */
export function renderCertificateShelf(container, data) {
  if (!container) return;
  const earnedCount = CERTIFICATES.filter((c) => isCertificateEarned(c, data)).length;
  container.innerHTML = `
    <p class="cert-shelf-count"><strong>${earnedCount}</strong> of ${CERTIFICATES.length} earned</p>
    <div class="cert-shelf-grid">
      ${CERTIFICATES.map((cert) => {
        const earned = isCertificateEarned(cert, data);
        const date = earned ? certificateDate(cert, data) : null;
        const status = earned ? (date ? `Earned ${formatCertificateDate(date)}` : 'Earned — tap to view') : 'Not yet earned';
        const inner = `
          <span class="cert-shelf-seal" aria-hidden="true">${earned ? (cert.sealImage ? `<img src="${cert.sealImage}" alt="">` : cert.seal) : '🔒'}</span>
          <span class="cert-shelf-text">
            <b>${escapeHtml(cert.title)}</b>
            <small>${escapeHtml(status)}</small>
          </span>`;
        return earned
          ? `<a class="cert-shelf-item earned" href="${cert.url}" aria-label="View your ${escapeHtml(cert.title)} certificate">${inner}<span class="cert-shelf-go" aria-hidden="true">View ›</span></a>`
          : `<div class="cert-shelf-item locked" aria-label="${escapeHtml(cert.title)} certificate, not yet earned">${inner}</div>`;
      }).join('')}
    </div>`;
}
