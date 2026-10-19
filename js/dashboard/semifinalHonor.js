// ============================================
// SEMIFINAL ROLL OF HONOR (Jornie, 2026-10-19) -- acknowledges the
// first student to complete the Semifinal Season, by name, on a
// dashboard popup every student sees, and lists anyone who has finished
// it since. Shown on every dashboard visit until HONOR_ENDS_AT.
//
// A student counts once finalUnlocked is true (their Semifinal
// reflection is in: the field names run a season behind), in the order
// they submitted it (finalReflectionSubmittedAt). The first is
// spotlighted.
//
// Where the names come from: the same pattern as midtermHonorRoll.js.
// Students can't read each other's records, so the list is ONE doc,
// announcements/semifinalHonorRoll, rewritten by
// publishSemifinalHonorRoll() whenever an admin loads the roster in
// teacher.js. Nothing shows until a teacher has opened the roster once.
// The look reuses the .honor-* styles from midtermHonorRoll.js.
// ============================================

import { db, doc, getDoc, setDoc, serverTimestamp } from '../core/firebase.js';
import { ADMIN_EMAILS } from '../core/admins.js';
import { getRankProgress, RANK_ICON } from '../core/rank.js';
import { injectStyles, escapeHtml, CORNER_SVG, CREST_SVG, sparksHtml } from './midtermHonorRoll.js';
import { resolveSeasonBadge } from '../seasons/seasonBadges.js';
import { PRELIM_BADGE_INFO } from './prelimBadges.js';
import { resolveVaultGameBadge } from '../vault/vaultGames.js';
import { resolveSideQuestBadge } from '../sidequests/sideQuests.js';
import { CERTIFICATES, isCertificateEarned, certificateByKey } from '../core/certificates.js';
import { SEASON_CONTENT } from '../seasons/seasonContent.js';

const HONOR_ENDS_AT = '2026-10-26T00:00:00+08:00';
const HONOR_DOC = ['announcements', 'semifinalHonorRoll'];

export function isSemifinalHonorActive() {
  return Date.now() < new Date(HONOR_ENDS_AT).getTime();
}

// ---------- data ----------

// Achievements, counted by kind and shown as small icons. The season
// icons are the ones the dashboard's Achievements panel uses
// (seasonBadges.js); anything else is grouped as the panel groups it.
const BADGE_KINDS = [
  { icon: '👑', label: 'Season Champion' },
  { icon: '🏁', label: 'Chapters' },
  { icon: '📝', label: 'Quizzes' },
  { icon: '🎯', label: 'Tasks' },
  { icon: '📖', label: 'Journals' },
  { icon: '🗣️', label: 'Recitations' },
  { icon: '⚔️', label: 'Games' },
  { icon: '🎖️', label: 'Other tasks' },
  { icon: '🧩', label: 'Prelim' },
  { icon: '🗝️', label: 'Sanctuarium' },
  { icon: '🧭', label: 'Side Quests' }
];

function badgeKind(id) {
  const season = resolveSeasonBadge(id);
  if (season) return season.icon;
  if (PRELIM_BADGE_INFO[id]) return '🧩';
  if (resolveVaultGameBadge(id)) return '🗝️';
  if (resolveSideQuestBadge(id)) return '🧭';
  return null;
}

/** [{ icon, label, count }] for the kinds this student has, in BADGE_KINDS order. */
function badgeSummary(achievements) {
  const counts = {};
  (Array.isArray(achievements) ? achievements : []).forEach((id) => {
    const kind = typeof id === 'string' ? badgeKind(id) : null;
    if (kind) counts[kind] = (counts[kind] || 0) + 1;
  });
  return BADGE_KINDS.filter((k) => counts[k.icon]).map((k) => ({ ...k, count: counts[k.icon] }));
}

/** What publishSemifinalHonorRoll() stores, first finisher first. */
export function semifinalHonorEntries(allStudents) {
  return allStudents
    .filter((d) => d && d.finalUnlocked === true && d.name && !ADMIN_EMAILS.includes(d.email))
    .sort((a, b) => String(a.finalReflectionSubmittedAt || '9').localeCompare(String(b.finalReflectionSubmittedAt || '9')))
    .map((d) => {
      const progress = getRankProgress(d);
      return {
        name: String(d.name).slice(0, 80),
        rank: progress.rank,
        stars: progress.stars.filter(Boolean).length,
        starTarget: progress.stars.length,
        badges: badgeSummary(d.achievements),
        certificates: CERTIFICATES.filter((c) => isCertificateEarned(c, d)).map((c) => c.key),
        ...finalProgress(d),
        at: d.finalReflectionSubmittedAt || ''
      };
    });
}

/** How far into the Final Season: chapters done, the total, the next
 *  chapter's title, and whether the season (its reflection) is complete. */
function finalProgress(d) {
  const done = d.completedNodes || {};
  const chapters = SEASON_CONTENT.final.chapters;
  const isDone = (c) => c.nodes.every((n) => !!done[n.nodeId]);
  const next = chapters.find((c) => !isDone(c));
  return {
    finalDone: chapters.filter(isDone).length,
    finalTotal: chapters.length,
    finalNext: next ? next.chapterTitle : '',
    finalComplete: d.apostleUnlocked === true
  };
}

// The spotlight's rank badge: the rank large, with its stars beneath it,
// earned ones lit and the rest dim.
const CSS = `
.sfh-rank { display: flex; flex-direction: column; align-items: center; gap: 4px; margin: 8px 0 2px; }
.sfh-rank-name {
  display: inline-flex; align-items: center; gap: 8px; padding: 5px 16px; border-radius: 999px;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 17px; letter-spacing: 3px; text-transform: uppercase;
  color: #2A1A05; background: linear-gradient(180deg, #FFF1C9 0%, #E9B85A 55%, #B9852E 100%);
  border: 1px solid #FFF6D8; box-shadow: 0 0 18px rgba(255,200,90,.55), inset 0 1px 0 rgba(255,255,255,.6);
}
.sfh-rank-name i { font-style: normal; font-size: 18px; }
.sfh-stars { font-size: 22px; letter-spacing: 3px; line-height: 1; }
.sfh-stars b { color: #FFD45A; text-shadow: 0 0 10px rgba(255,200,70,.9), 0 1px 0 #000; font-weight: 400; }
.sfh-stars s { color: rgba(233,184,90,.28); text-decoration: none; }
.sfh-stars-count { font-family: 'Cinzel', Georgia, serif; font-size: 10.5px; letter-spacing: 1.5px; text-transform: uppercase; color: #E9B85A; }
.sfh-badges { display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 10px 0 2px; }
.sfh-badges-title { font-family: 'Cinzel', Georgia, serif; font-size: 10.5px; letter-spacing: 1.5px; text-transform: uppercase; color: #E9B85A; }
.sfh-badges-title b { color: #FFF1C9; font-size: 13px; }
.sfh-badge-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; }
.sfh-badge {
  display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px 2px 5px; border-radius: 999px;
  font-size: 13px; line-height: 1.3; color: #F3E7CC; background: rgba(10,8,6,.55); border: 1px solid rgba(233,184,90,.4);
}
.sfh-badge b { font-size: 11.5px; font-weight: 700; color: #FFE2A8; }
.sfh-badge.crown { border-color: #FFE7A8; background: linear-gradient(135deg, rgba(233,184,90,.35), rgba(120,70,10,.3)); }
.sfh-cert {
  display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px 2px 3px; border-radius: 999px;
  font-size: 12px; line-height: 1.3; color: #FFF1C9; font-weight: 600;
  background: linear-gradient(135deg, rgba(233,184,90,.28), rgba(120,70,10,.25)); border: 1px solid rgba(255,231,168,.7);
}
.sfh-cert img { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
/* Very short screens (a phone held sideways): drop the crest and slim the
   heading and button, so the spotlight gets the room. Scoped to this popup. */
@media (max-height: 480px) {
  .sfh .honor-crest { display: none; }
  .sfh .honor-scroll { padding-top: 12px; }
  .sfh .honor-kicker { margin-bottom: 2px; font-size: 10px; }
  .sfh .honor-heading { font-size: 18px; }
  .sfh .honor-divider { margin: 6px 0; }
  .sfh .honor-foot { padding: 4px 22px 12px; }
  .sfh .honor-btn, .sfh .honor-btn:hover { padding: 9px 16px; font-size: 13px; }
}
@media (max-width: 480px) {
  .sfh-rank-name { font-size: 14px; letter-spacing: 2px; padding: 4px 12px; }
  .sfh-badge { font-size: 12px; }
  .sfh-stars { font-size: 17px; letter-spacing: 2px; }
}`;

function injectRankStyles() {
  if (document.getElementById('semifinalHonorStyles')) return;
  const style = document.createElement('style');
  style.id = 'semifinalHonorStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

// Certificates earned (certificates.js decides, as on the dashboard's
// "My Certificates" shelf), as small seal chips. Unknown keys are skipped.
function certificatesHtml(entry) {
  const certs = (Array.isArray(entry.certificates) ? entry.certificates : []).map(certificateByKey).filter(Boolean);
  if (!certs.length) return '';
  return `<span class="sfh-badges">
    <span class="sfh-badges-title"><b>${certs.length}</b> certificate${certs.length === 1 ? '' : 's'}</span>
    <span class="sfh-badge-row">${certs.map((c) => `<span class="sfh-cert" title="${escapeHtml(c.certTitle)}">${c.sealImage
      ? `<img src="${c.sealImage}" alt="" onerror="this.replaceWith(document.createTextNode('${c.seal}'))">`
      : c.seal}<span>${escapeHtml(c.title)}</span></span>`).join('')}</span>
  </span>`;
}

// The spotlight's story: the Semifinal won, and how close the Final
// Season is, from the live counts (so it stays true as they progress).
function legendHtml(entry) {
  const name = `<strong>${escapeHtml(entry.name)}</strong>`;
  const rank = `<strong>${escapeHtml(entry.rank)}</strong>`;
  const total = Math.max(0, Number(entry.finalTotal) || 0);
  const done = Math.max(0, Math.min(total, Number(entry.finalDone) || 0));
  const opening = `The Destruction has been overcome. ${name} was the first to break through the <strong>Semifinal Season</strong> and now walks the realm as an ${rank}.`;
  if (entry.finalComplete) {
    return `${opening} And the legend is complete: the <strong>Final Season, God's Action</strong>, has been conquered as well. <strong>All hail the champion!</strong>`;
  }
  if (!total || done === 0) {
    return `${opening} The gates of the <strong>Final Season, God's Action</strong>, now stand open, and the last quest begins. <strong>Onward, champion!</strong>`;
  }
  const remaining = total - done;
  const last = remaining === 0
    ? 'only the final reflection stands between this champion and the end of the quest'
    : remaining === 1 && entry.finalNext
      ? `only <strong>${escapeHtml(entry.finalNext)}</strong> stands between this champion and the end of the quest`
      : `just <strong>${remaining}</strong> chapters remain`;
  return `${opening} Now the <strong>Final Season, God's Action</strong>, trembles: <strong>${done} of ${total} chapters</strong> have already fallen, and ${last}. The last page of this legend is about to be written. <strong>Onward, champion!</strong>`;
}

// Only the known kinds are drawn, whatever the stored doc holds.
function badgesHtml(entry) {
  const known = new Map(BADGE_KINDS.map((k) => [k.icon, k.label]));
  const list = (Array.isArray(entry.badges) ? entry.badges : [])
    .filter((b) => b && known.has(b.icon) && Number(b.count) > 0)
    .map((b) => ({ icon: b.icon, label: known.get(b.icon), count: Math.min(9999, Math.floor(Number(b.count))) }));
  if (!list.length) return '';
  const total = list.reduce((n, b) => n + b.count, 0);
  return `<span class="sfh-badges">
    <span class="sfh-badges-title"><b>${total}</b> achievements</span>
    <span class="sfh-badge-row">${list.map((b) => `<span class="sfh-badge${b.icon === '👑' ? ' crown' : ''}" title="${b.label}: ${b.count}" aria-label="${b.label}: ${b.count}">${b.icon}<b>${b.count}</b></span>`).join('')}</span>
  </span>`;
}

function rankBadgeHtml(entry) {
  const target = Math.max(0, Math.min(20, Number(entry.starTarget) || 0));
  const stars = Math.max(0, Math.min(target, Number(entry.stars) || 0));
  return `<span class="sfh-rank">
    <span class="sfh-rank-name"><i>${RANK_ICON[entry.rank] || '⭐'}</i>${escapeHtml(entry.rank)}</span>
    ${target ? `<span class="sfh-stars" aria-label="${stars} of ${target} stars"><b>${'★'.repeat(stars)}</b><s>${'★'.repeat(target - stars)}</s></span>
    <span class="sfh-stars-count">${stars} of ${target} stars</span>` : ''}
  </span>`;
}

/** Called by teacher.js with every student record it just loaded. */
export function publishSemifinalHonorRoll(allStudents) {
  if (!isSemifinalHonorActive()) return Promise.resolve();
  return setDoc(doc(db, ...HONOR_DOC), { students: semifinalHonorEntries(allStudents), updatedAt: serverTimestamp() }).catch((err) => {
    console.error('Failed to publish the Semifinal Roll of Honor:', err);
  });
}

function loadRoll() {
  if (!isSemifinalHonorActive()) return Promise.resolve(null);
  return getDoc(doc(db, ...HONOR_DOC))
    .then((snap) => {
      const list = (snap.exists() ? snap.data().students : []) || [];
      const clean = list.filter((s) => s && typeof s.name === 'string' && s.name.trim());
      return clean.length ? clean : null;
    })
    .catch((err) => {
      console.error('Failed to load the Semifinal Roll of Honor:', err);
      return null;
    });
}

const dateText = (iso) => {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric' }) : '';
};

// ---------- markup ----------

/** Exported so a preview page can drive the exact same markup. */
export function openSemifinalHonorPopup(list, viewerName, onClose) {
  document.querySelector('.honor-overlay')?.remove();
  injectStyles();
  injectRankStyles();
  const [first, ...others] = list;
  const isFirst = !!viewerName && first.name === viewerName;
  const isOther = !!viewerName && others.some((s) => s.name === viewerName);
  const when = dateText(first.at);

  const overlay = document.createElement('div');
  overlay.className = 'honor-overlay sfh';
  overlay.innerHTML = `
    <div class="honor-sparks">${sparksHtml()}</div>
    <div class="honor-card" role="dialog" aria-modal="true" aria-labelledby="semifinalHonorHeading">
      ${['tl', 'tr', 'bl', 'br'].map((c) => `<span class="honor-corner ${c}">${CORNER_SVG}</span>`).join('')}
      <div class="honor-scroll">
      <div class="honor-pad">
        <div class="honor-crest">${CREST_SVG}</div>
        <p class="honor-kicker">✦ A First in the Portal ✦</p>
        <h2 class="honor-heading" id="semifinalHonorHeading">The Semifinal Season Has Been Conquered!</h2>
        <div class="honor-divider"><i></i></div>
        <div class="honor-spotlight">
          <span class="honor-spotlight-label">🏆 First to Complete the Semifinal Season</span>
          <span class="honor-spotlight-names">${escapeHtml(first.name)}</span>
          ${rankBadgeHtml(first)}
          ${badgesHtml(first)}
          ${certificatesHtml(first)}
          ${when ? `<span class="honor-spotlight-rank">Completed ${when}</span>` : ''}
        </div>
        <p class="honor-text">${legendHtml(first)}</p>
        ${isFirst
          ? `<p class="honor-you">🎉 <strong>${escapeHtml(viewerName)}</strong>, this honor is yours. Well done, and keep going to the Final Season!</p>`
          : isOther
          ? `<p class="honor-you">🎉 <strong>${escapeHtml(viewerName)}</strong>, you have completed the Semifinal Season too. Well done!</p>`
          : `<p class="honor-text">The road is open to every seeker. Keep going, and your name could be next on this roll.</p>`}
        ${others.length ? `<p class="honor-text">Also completed the Semifinal Season: ${others.map((s) => `<strong>${escapeHtml(s.name)}</strong>`).join(', ')}</p>` : ''}
      </div>
      </div>
      <div class="honor-foot"><button type="button" class="honor-btn">Congratulations!</button></div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('.honor-btn').addEventListener('click', () => {
    overlay.remove();
    if (onClose) onClose();
  });
}

// ---------- public API for dashboard.html ----------

/** Resolves once the popup is dismissed -- or immediately when there's
 *  nothing to show -- so the dashboard can queue the next popup after it. */
export function showSemifinalHonorPopup({ viewerName }) {
  return loadRoll().then((list) => new Promise((resolve) => {
    if (!list) { resolve(); return; }
    openSemifinalHonorPopup(list, viewerName, resolve);
  }));
}
