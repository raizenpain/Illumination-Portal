// ============================================
// LEADERBOARD — community-wide Top 5, restricted to students with a
// completely clean record (never gotten a quiz question, puzzle code,
// journal, or reflection wrong/rejected), ranked among themselves by
// pace (overall progress % divided by days since enrollment). One
// mistake, anywhere, and a student is simply not eligible — this isn't
// a tiebreaker, it's a hard filter. Shown on the dashboard beside the
// Community Activity feed.
//
// Reads/writes a slim public "leaderboard" collection — name, rank,
// star count, mistake count, progressPercent, and createdAt, one doc
// per student, keyed by email (see firestore.rules) — instead of
// granting every student read access to the full students collection,
// which also carries email, section, teacher, tickets, and
// achievements that should stay private.
//
// progressPercent and mistakeCount only drive the internal pace sort
// and eligibility filter — neither is ever rendered. What's shown to
// other students is just name + rank + stars, same summary they'd see
// on someone's dashboard card.
//
// mistakeCount only started being tracked as of this feature's launch —
// there was never anywhere to record wrong attempts before, so nothing
// from before that date counts against anyone. A missing/undefined
// mistakeCount is treated as a clean record for that reason.
// ============================================

import { db, doc, setDoc, collection, getDocs } from './firebase.js';
import { RANK_ICON as RANK_TIER_ICON } from './rank.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PLACE_ICON = ['🥇', '🥈', '🥉'];

// Floors at one hour so a student who enrolled minutes ago doesn't
// divide by (near) zero and rocket to the top on a single piece.
function daysSince(isoString) {
  const start = new Date(isoString).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max((Date.now() - start) / MS_PER_DAY, 1 / 24);
}

function paceFor(entry) {
  const days = daysSince(entry.createdAt);
  if (days === null || typeof entry.progressPercent !== 'number') return null;
  return entry.progressPercent / days;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTopStudents(listEl, entries) {
  if (entries.length === 0) {
    listEl.innerHTML = '<p class="community-feed-empty">No ranked progress yet — be the first!</p>';
    return;
  }

  listEl.innerHTML = entries.map((entry, i) => `
    <div class="top-student-row">
      <span class="top-student-rank">${PLACE_ICON[i] || `#${i + 1}`}</span>
      <span class="top-student-name">${escapeHtml(entry.name)}</span>
      <span class="top-student-rate">${RANK_TIER_ICON[entry.rank] || ''} ${escapeHtml(entry.rank)} · ${entry.starsEarned}★</span>
    </div>
  `).join('');
}

// info: { email, name, progressPercent, createdAt, rank, starsEarned, starsTarget, mistakeCount }
export async function initLeaderboard(info) {
  const listEl = document.getElementById('topStudentsList');
  if (!listEl) return;

  // Publish this student's own slim public entry. Skipped without a
  // createdAt (students enrolled before that field existed) rather
  // than writing a bad value that would wrongly rank them at the top.
  if (info.createdAt) {
    try {
      await setDoc(doc(db, 'leaderboard', info.email), {
        name: info.name || info.email,
        progressPercent: info.progressPercent,
        createdAt: info.createdAt,
        rank: info.rank,
        starsEarned: info.starsEarned,
        mistakeCount: info.mistakeCount || 0
      }, { merge: true });
    } catch (err) {
      console.error('Failed to update leaderboard entry:', err);
    }
  }

  try {
    const snap = await getDocs(collection(db, 'leaderboard'));
    const entries = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if ((data.mistakeCount || 0) > 0) return; // strict clean-record filter

      const pace = paceFor(data);
      if (pace !== null && pace > 0) {
        entries.push({
          name: data.name || 'A Seeker',
          pace,
          rank: data.rank || 'Seeker',
          starsEarned: typeof data.starsEarned === 'number' ? data.starsEarned : 0
        });
      }
    });

    entries.sort((a, b) => b.pace - a.pace);
    renderTopStudents(listEl, entries.slice(0, 5));
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
    listEl.innerHTML = '<p class="community-feed-empty">Could not load rankings.</p>';
  }
}
