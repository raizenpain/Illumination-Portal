// ============================================
// ARTIFACT REFUND NOTICE — a one-time dashboard popup for the students
// whose Tier III + IV chain artifacts were returned on 2026-10-05, when
// artifact prices rose (Jornie's call; their old price was refunded).
//
// The admin sets students/{email}.artifactRefundNotice =
//   { removed: [artifact names], refund: tokens, bonus: tokens }
// (refund + bonus already added to unlockTokens) and this shows it once;
// Continue clears the field.
// ============================================

import { db, doc, updateDoc } from '../core/firebase.js';
import { ensureRankPopup, renderNoticePopup, openRankPopup } from '../core/rankPopup.js';

/** Resolves once the notice has been shown and closed (or right away). */
export async function maybeShowRefundNotice({ email, data, isAdmin }) {
  const notice = data && data.artifactRefundNotice;
  if (isAdmin || !email || !notice || !Array.isArray(notice.removed)) return;

  const removed = notice.removed.filter(Boolean);
  const refund = Number(notice.refund) || 0;
  const bonus = Number(notice.bonus) || 0;
  const chips = [];
  if (refund) chips.push(`<img src="assets/unlock-token.png" alt=""> +${refund} Unlock Tokens refunded`);
  if (bonus) chips.push(`<img src="assets/unlock-token.png" alt=""> +${bonus} bonus Unlock Tokens`);
  ensureRankPopup();
  renderNoticePopup({
    kicker: '✦ A Word from the Forge ✦',
    sub: 'Artifact prices have been updated',
    icon: '⚒️',
    eyebrow: 'Returned to the Forge',
    heading: removed.join(' & '),
    detail: `With the new artifact prices, your Tier III and Tier IV chain artifacts have been returned to the forge, and every token you spent on them has been refunded${bonus ? ', plus a bonus for your patience' : ''}. Your other artifacts are untouched. Earn tokens with the new, bigger task rewards and forge them again at the new rates!`,
    rewards: chips.length ? chips : null
  });
  await openRankPopup();

  data.artifactRefundNotice = null;
  try {
    await updateDoc(doc(db, 'students', email), { artifactRefundNotice: null });
  } catch (err) {
    console.error('Failed to clear the artifact refund notice:', err);
  }
}
