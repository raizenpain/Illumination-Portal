// ============================================
// GIFTS — sharing between students (Jornie, Portal Update 2.2):
//
//   Send tickets      any ticket type to another student, by school email.
//                     At most DAILY_TICKET_LIMIT (50) tickets to the same
//                     student per day, all types added together.
//   Sell an artifact  a Tier 1-4 artifact back for its price minus
//                     ARTIFACT_FEE (5) Unlock Tokens.
//   Gift an artifact  it leaves the sender's collection; the receiver
//                     gets Unlock Tokens (price minus 5), never the
//                     artifact itself. The same artifact can be gifted
//                     once a day.
//   Receive           a gift waits in the `gifts` collection until the
//                     receiver opens it: a wrapped gift pops up on the
//                     dashboard, and the 🎁 button in the header lists
//                     everything received and sent.
//
// A student can only ever write their own students/{email} record, so
// the gift document is the hand-over point: the sender's transaction
// takes the tickets/artifact off their record and creates the gift; the
// receiver's transaction marks it opened and credits their record.
// firestore.rules checks both halves (see GIFTS there) and the daily
// limit, via giftLimits/{from}__{to}__{day}.
//
// Document ids are fixed on purpose (the rules require them):
//   tickets    `${from}__${to}__${day}__${dayTotalAfterThisGift}`
//   artifact   `${from}__art__${artifactId}__${day}`
//
// All CSS is injected from here with its own .gf-* classes. Every
// button restates its :hover background, since style.css's global
// button:hover (0,1,1) outranks a plain class selector (0,1,0).
// ============================================

import { db, doc, getDoc, getDocs, collection, query, where, onSnapshot, runTransaction, serverTimestamp } from './firebase.js';
import { TICKET_INFO } from './ticketTrader.js';
import { CRAFTING_CHAINS, artifactIconPath, findArtifact, tierOfArtifact, tokenCostFor } from './artifacts.js';
import { findBannedWord, looksLikeGibberish } from './contentFilter.js';
import { startCooldown } from './cooldown.js';
import { blockPasteInto } from './noCopyPaste.js';
import { logActivity } from './activity.js';

export const DAILY_TICKET_LIMIT = 50;
export const ARTIFACT_FEE = 5;
const NOTE_MAX = 140;
const TOKEN_ICON = 'assets/unlock-token.png';

export const LIMIT_MESSAGE = `You can only gift ${DAILY_TICKET_LIMIT} tickets per student per day. You need to wait for tomorrow to share another ${DAILY_TICKET_LIMIT} tickets.`;

// ---------- pure helpers (exported for testing) ----------

/** The calendar day in Philippine time (UTC+8), as a whole number of days. Mirrors giftDayNow() in firestore.rules. */
export const giftDay = (now = Date.now()) => Math.floor((now + 8 * 60 * 60 * 1000) / 86400000);

/** Unlock Tokens a Tier 1-4 artifact is worth when sold or gifted, or null if it can't be. */
export function artifactTokenValue(id) {
  const tier = tierOfArtifact(id);
  if (!tier || tier > 4) return null;
  return tokenCostFor(id, tier) - ARTIFACT_FEE;
}

/** Why this artifact can't be sold or gifted, or null if it can. */
export function artifactLockReason(data, id) {
  const tier = tierOfArtifact(id);
  if (!tier || tier > 4) return 'Legendary artifacts cannot be sold or gifted.';
  const owned = (data && data.ownedArtifacts) || [];
  if (!owned.includes(id)) return 'You do not own this artifact.';
  // The four artifacts that went (or are going) into a Legendary stay with it.
  const forging = data.legendaryForgeStartedAt ? (data.legendaryForgeChain || data.chosenLegendaryChain) : null;
  const used = CRAFTING_CHAINS.some((c) => c.chain.includes(id) && (owned.includes(c.tier5Id) || forging === c.tier5Id));
  return used ? 'This artifact is part of your Legendary.' : null;
}

/**
 * What is wrong with a gift note, as a message for the sender, or null if
 * it is fine. The same two checks, with the same strict word list, as a
 * class chat message (classChat.js) -- not the looser coursework list.
 * findBannedWord() also catches disguises: "b o b o", "8080", "bobooo".
 */
export function noteProblem(note) {
  const text = String(note || '').trim();
  if (!text) return null;
  const banned = findBannedWord(text);
  if (banned) return `Your note contains a word that isn’t allowed here: “${banned}”. Please reword it and try again.`;
  // looksLikeGibberish only recognizes Latin letters, so an emoji-only note is left alone.
  if (/[a-zA-Z]/.test(text) && looksLikeGibberish(text)) return "That doesn't look like a real note. Please write a few real words.";
  return null;
}

/**
 * A gift's note as it may be SHOWN. The check above runs in the sender's
 * browser and firestore.rules cannot read words, so a note written around
 * the app could still arrive with a banned word in it: such a note is
 * simply never displayed, to the receiver or back to the sender.
 */
export function shownNote(gift) {
  const text = String((gift && gift.note) || '').trim().slice(0, NOTE_MAX);
  return text && !findBannedWord(text) ? text : '';
}

export const ticketGiftId = (from, to, day, totalAfter) => `${from}__${to}__${day}__${totalAfter}`;
export const artifactGiftId = (from, artifactId, day) => `${from}__art__${artifactId}__${day}`;
const limitId = (from, to, day) => `${from}__${to}__${day}`;

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const firstName = (full) => String(full || '').trim().split(/\s+/)[0] || 'them';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What a gift holds, in words and as an icon. */
function describeGift(g) {
  if (g.kind === 'artifact') {
    const art = findArtifact(g.artifactId);
    return { icon: `<img src="${TOKEN_ICON}" alt="">`, amountText: `+${g.tokens}`, label: plural(g.tokens, 'Unlock Token').replace(/^\d+ /, ''), detail: art ? `From the artifact ${art.name}` : '' };
  }
  const info = TICKET_INFO[g.ticketType] || { icon: '🎫', label: 'Ticket' };
  return { icon: info.icon, amountText: `+${g.amount}`, label: info.label, detail: '' };
}

// ---------- state ----------

let me = null; // { email, name, data, onChange }
let pending = []; // unopened gifts for me, oldest first
let firstSnapshot = null; // resolves once the listener has reported
let autoPopup = false; // after the dashboard's own popups: show new arrivals at once
const snoozed = new Set(); // gifts the student chose to open later (this visit)
let presenting = false;

// ---------- database ----------

async function findRecipient(raw) {
  const to = String(raw || '').trim().toLowerCase();
  if (!/^[^@\s]+@hcdc\.edu\.ph$/.test(to)) return { error: 'Type the full school email, ending in @hcdc.edu.ph.' };
  if (to === me.email.toLowerCase()) return { error: 'You cannot send a gift to yourself.' };
  // The public leaderboard entry (name only) is the one record of another
  // student this account may read; firestore.rules checks enrollment.
  const snap = await getDoc(doc(db, 'leaderboard', to));
  if (!snap.exists()) return { error: 'No student with that email was found. Check the spelling. They also need to have opened their dashboard at least once.' };
  return { recipient: { email: to, name: snap.data().name || to } };
}

async function ticketsLeftToday(to) {
  const snap = await getDoc(doc(db, 'giftLimits', limitId(me.email, to, giftDay())));
  return Math.max(0, DAILY_TICKET_LIMIT - (snap.exists() ? snap.data().total || 0 : 0));
}

// A line in the dashboard's Community Activity feed. Names what was
// given and to whom -- never the note, which stays between the two.
// Not awaited: logActivity() never throws, and the gift is already done.
function announce(title) {
  logActivity({ email: me.email, name: me.name, type: 'gift', title, icon: '🎁' });
}

function codedError(code) { const err = new Error(code); err.code = code; return err; }

async function sendTickets({ to, toName, ticketType, amount, note }) {
  const day = giftDay();
  const meRef = doc(db, 'students', me.email);
  const limitRef = doc(db, 'giftLimits', limitId(me.email, to, day));
  let left = 0;
  await runTransaction(db, async (tx) => {
    const [mine, limit] = [await tx.get(meRef), await tx.get(limitRef)];
    const have = ((mine.data() || {}).tickets || {})[ticketType] || 0;
    const used = limit.exists() ? limit.data().total || 0 : 0;
    if (have < amount) throw codedError('not-enough');
    if (used + amount > DAILY_TICKET_LIMIT) throw codedError('limit');
    const gift = { from: me.email, fromName: me.name, to, toName, kind: 'tickets', ticketType, amount, day, createdAt: serverTimestamp(), claimed: false };
    if (note) gift.note = note;
    tx.set(doc(db, 'gifts', ticketGiftId(me.email, to, day, used + amount)), gift);
    tx.set(limitRef, { from: me.email, to, day, total: used + amount });
    tx.update(meRef, { [`tickets.${ticketType}`]: have - amount });
    left = have - amount;
  });
  me.data.tickets = { ...(me.data.tickets || {}), [ticketType]: left };
  me.onChange();
  announce(`Sent ${amount} × ${TICKET_INFO[ticketType].label} to ${firstName(toName)} as a gift`);
}

async function giftArtifact({ to, toName, artifactId, note }) {
  const day = giftDay();
  const meRef = doc(db, 'students', me.email);
  const giftRef = doc(db, 'gifts', artifactGiftId(me.email, artifactId, day));
  let ownedAfter = null;
  await runTransaction(db, async (tx) => {
    const [mine, existing] = [await tx.get(meRef), await tx.get(giftRef)];
    const data = mine.data() || {};
    if (artifactLockReason(data, artifactId)) throw codedError('not-owned');
    if (existing.exists()) throw codedError('once-a-day');
    ownedAfter = (data.ownedArtifacts || []).filter((id) => id !== artifactId);
    const gift = { from: me.email, fromName: me.name, to, toName, kind: 'artifact', artifactId, tokens: artifactTokenValue(artifactId), day, createdAt: serverTimestamp(), claimed: false };
    if (note) gift.note = note;
    tx.set(giftRef, gift);
    tx.update(meRef, { ownedArtifacts: ownedAfter });
  });
  me.data.ownedArtifacts = ownedAfter;
  me.onChange();
  const art = findArtifact(artifactId);
  announce(`Gifted the artifact ${art ? art.name : artifactId} to ${firstName(toName)}`);
}

async function sellArtifact(artifactId) {
  const meRef = doc(db, 'students', me.email);
  let after = null;
  await runTransaction(db, async (tx) => {
    const data = (await tx.get(meRef)).data() || {};
    if (artifactLockReason(data, artifactId)) throw codedError('not-owned');
    after = {
      ownedArtifacts: (data.ownedArtifacts || []).filter((id) => id !== artifactId),
      unlockTokens: (data.unlockTokens || 0) + artifactTokenValue(artifactId)
    };
    tx.update(meRef, after);
  });
  Object.assign(me.data, after);
  me.onChange();
}

async function claimGift(gift) {
  const meRef = doc(db, 'students', me.email);
  const giftRef = doc(db, 'gifts', gift.id);
  let patch = null;
  await runTransaction(db, async (tx) => {
    const [live, mine] = [await tx.get(giftRef), await tx.get(meRef)];
    if (!live.exists()) throw codedError('gone');
    const g = live.data();
    if (g.claimed) { patch = null; return; } // opened in another tab
    const data = mine.data() || {};
    if (g.kind === 'tickets') {
      const total = ((data.tickets || {})[g.ticketType] || 0) + g.amount;
      tx.update(meRef, { [`tickets.${g.ticketType}`]: total });
      patch = { tickets: { [g.ticketType]: total } };
    } else {
      const total = (data.unlockTokens || 0) + g.tokens;
      tx.update(meRef, { unlockTokens: total });
      patch = { unlockTokens: total };
    }
    tx.update(giftRef, { claimed: true, claimedAt: serverTimestamp() });
  });
  if (patch) {
    if (patch.tickets) me.data.tickets = { ...(me.data.tickets || {}), ...patch.tickets };
    else me.data.unlockTokens = patch.unlockTokens;
    me.onChange();
    const what = gift.kind === 'tickets'
      ? `${gift.amount} × ${(TICKET_INFO[gift.ticketType] || { label: 'Ticket' }).label}`
      : plural(gift.tokens, 'Unlock Token');
    announce(`Opened a gift from ${firstName(gift.fromName)}: ${what}`);
  }
  pending = pending.filter((g) => g.id !== gift.id);
  updateBadge();
}

// ---------- styles ----------

const CSS = `
@keyframes gfFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes gfRise { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes gfWobble { 0%, 100% { transform: rotate(0); } 20% { transform: rotate(-5deg); } 40% { transform: rotate(5deg); } 60% { transform: rotate(-3deg); } 80% { transform: rotate(3deg); } }
@keyframes gfLid { to { transform: translate(-46px, -92px) rotate(-28deg); opacity: 0; } }
@keyframes gfRays { to { transform: rotate(360deg); } }
@keyframes gfPop { 0% { opacity: 0; transform: scale(.5); } 70% { opacity: 1; transform: scale(1.08); } 100% { transform: scale(1); } }

/* The 🎁 button in the dashboard header, with its count. */
.gift-inbox-btn { position: relative; font-size: 19px; }
.gift-badge { position: absolute; top: -7px; right: -7px; min-width: 21px; height: 21px; padding: 0 5px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; font: 700 11px 'Segoe UI', sans-serif; line-height: 1; color: #fff; background: #E11D48; border: 2px solid #fff; border-radius: 999px; }
.gift-badge.hidden { display: none; }

/* Sell / Gift under an owned artifact. */
.artifact-actions { display: flex; gap: 5px; margin-top: 7px; }
.artifact-actions .artifact-action, .artifact-actions .artifact-action:hover { flex: 1; min-width: 0; margin: 0; padding: 6px 2px; font: 700 10.5px 'Segoe UI', sans-serif; letter-spacing: .3px; color: #D7E3F0; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.18); border-radius: 8px; cursor: pointer; transition: background .2s ease, border-color .2s ease, color .2s ease; }
.artifact-actions .artifact-action:hover { color: #fff; background: rgba(86,178,187,.22); border-color: rgba(127,212,220,.7); }
.artifact-actions .artifact-action:focus-visible { outline: 2px solid #7FD4DC; outline-offset: 2px; }
@media (pointer: coarse) { .artifact-actions .artifact-action, .artifact-actions .artifact-action:hover { padding: 9px 2px; } }
/* On a phone the artifact cards are narrow: one button per line is easier to hit. */
@media (max-width: 480px) { .artifact-actions { flex-direction: column; } }

.gf-overlay { position: fixed; inset: 0; z-index: 10050; display: flex; align-items: center; justify-content: center; padding: 12px; box-sizing: border-box; background: rgba(6,9,20,.84); animation: gfFade .25s ease; }
.gf-card { position: relative; display: flex; flex-direction: column; width: min(460px, 100%); max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px); overflow: hidden; box-sizing: border-box; text-align: left; font-family: 'Segoe UI', system-ui, sans-serif; color: #D7E3F0; background: linear-gradient(165deg, #1C2238 0%, #0D1226 100%); border: 1px solid rgba(86,178,187,.4); border-radius: 18px; box-shadow: 0 24px 64px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06); animation: gfRise .3s ease; }
.gf-head { display: flex; align-items: center; gap: 12px; padding: 16px 16px 14px 20px; border-bottom: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(86,178,187,.1), transparent); }
.gf-head-icon { flex: none; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; line-height: 1; border-radius: 12px; background: rgba(251,191,36,.12); border: 1px solid rgba(251,191,36,.4); }
.gf-head h2 { flex: 1; min-width: 0; margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 700; letter-spacing: .5px; color: #EAFBFD; }
.gf-card .gf-x, .gf-card .gf-x:hover { flex: none; width: 34px; height: 34px; margin: 0; padding: 0; font-size: 14px; line-height: 1; color: #9CA9C4; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 8px; cursor: pointer; }
.gf-card .gf-x:hover { color: #fff; background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.3); }
.gf-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 20px 18px; scrollbar-width: thin; scrollbar-color: rgba(86,178,187,.5) transparent; }
.gf-body::-webkit-scrollbar { width: 8px; }
.gf-body::-webkit-scrollbar-thumb { background: rgba(86,178,187,.5); border-radius: 4px; }
.gf-foot { display: flex; gap: 10px; padding: 12px 20px 16px; border-top: 1px solid rgba(255,255,255,.08); }
.gf-label { margin: 16px 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: #7FD4DC; }
.gf-label:first-child { margin-top: 0; }
.gf-text { margin: 0 0 10px; font-size: 13.5px; line-height: 1.5; color: #B7C3D9; }
.gf-text b { color: #EAFBFD; }
.gf-card .gf-input { display: block; width: 100%; margin: 0; padding: 11px 12px; box-sizing: border-box; font: 14px 'Segoe UI', sans-serif; color: #EAFBFD; background: rgba(10,15,34,.6); border: 1px solid rgba(255,255,255,.16); border-radius: 9px; }
.gf-card .gf-input::placeholder { color: #6F7C98; }
.gf-card .gf-input:focus-visible, .gf-card .gf-btn:focus-visible, .gf-card .gf-x:focus-visible, .gf-card .gf-tile:focus-visible, .gf-card .gf-tab:focus-visible, .gf-card .gf-chip:focus-visible { outline: 2px solid #7FD4DC; outline-offset: 2px; }
.gf-row { display: flex; gap: 8px; align-items: stretch; }
.gf-row .gf-input { flex: 1; min-width: 0; }
.gf-card .gf-btn, .gf-card .gf-btn:hover { flex: 1; margin: 0; padding: 11px 16px; min-height: 44px; box-sizing: border-box; font: 700 13.5px 'Segoe UI', sans-serif; color: #06222A; background: linear-gradient(180deg, #7FD4DC, #56B2BB); border: 1px solid #A6E6EC; border-radius: 10px; cursor: pointer; transition: filter .2s ease; }
.gf-card .gf-btn:hover { filter: brightness(1.08); }
.gf-card .gf-btn.gf-small, .gf-card .gf-btn.gf-small:hover { flex: none; padding: 9px 14px; }
.gf-card .gf-btn.gf-ghost, .gf-card .gf-btn.gf-ghost:hover { color: #C7D2E3; background: transparent; border-color: rgba(255,255,255,.22); }
.gf-card .gf-btn.gf-ghost:hover { color: #fff; background: rgba(255,255,255,.08); filter: none; }
.gf-card .gf-btn.gf-gold, .gf-card .gf-btn.gf-gold:hover { color: #2A1A05; background: linear-gradient(180deg, #FCD34D, #F59E0B); border-color: #FDE68A; }
.gf-card .gf-btn:disabled, .gf-card .gf-btn:disabled:hover { color: #8B97B0; background: transparent; border-color: rgba(255,255,255,.14); cursor: not-allowed; filter: none; }
.gf-person { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 12px; background: rgba(86,178,187,.1); border: 1px solid rgba(86,178,187,.4); }
.gf-person-icon { flex: none; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font: 700 15px 'Segoe UI', sans-serif; color: #06222A; background: #7FD4DC; border-radius: 50%; }
.gf-person-text { flex: 1; min-width: 0; }
.gf-person-text b { display: block; font-size: 14.5px; color: #EAFBFD; overflow-wrap: anywhere; }
.gf-person-text span { display: block; font-size: 12px; color: #9CA9C4; overflow-wrap: anywhere; }
.gf-tiles { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px; }
.gf-card .gf-tile, .gf-card .gf-tile:hover { display: flex; flex-direction: column; align-items: center; gap: 3px; margin: 0; padding: 9px 3px 8px; font: inherit; color: #D7E3F0; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; cursor: pointer; }
.gf-card .gf-tile:hover { background: rgba(255,255,255,.08); }
.gf-card .gf-tile.on, .gf-card .gf-tile.on:hover { background: rgba(86,178,187,.18); border-color: #7FD4DC; box-shadow: 0 0 0 1px #7FD4DC; }
.gf-card .gf-tile:disabled, .gf-card .gf-tile:disabled:hover { opacity: .4; cursor: not-allowed; background: rgba(255,255,255,.04); }
.gf-tile-icon { height: 24px; display: flex; align-items: center; justify-content: center; font-size: 19px; line-height: 1; }
.gf-tile-icon .inline-icon { width: 24px; height: 24px; vertical-align: 0; }
.gf-tile b { font-size: 15px; line-height: 1.1; color: #fff; font-variant-numeric: tabular-nums; }
.gf-tile-name { font-size: 10px; line-height: 1.2; color: #9CA9C4; }
.gf-amount { display: flex; gap: 8px; align-items: stretch; }
.gf-amount .gf-input { flex: 1; min-width: 0; font-size: 17px; font-weight: 700; text-align: center; font-variant-numeric: tabular-nums; }
.gf-card .gf-chip, .gf-card .gf-chip:hover { flex: none; margin: 0; padding: 0 13px; min-height: 44px; font: 700 13px 'Segoe UI', sans-serif; color: #D7E3F0; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.18); border-radius: 9px; cursor: pointer; }
.gf-card .gf-chip:hover { background: rgba(86,178,187,.22); border-color: rgba(127,212,220,.7); }
.gf-hint { margin: 8px 0 0; font-size: 12.5px; line-height: 1.45; color: #9CA9C4; }
.gf-hint b { color: #EAFBFD; }
.gf-note { margin: 12px 0 0; padding: 10px 12px; font-size: 13px; line-height: 1.45; border-radius: 9px; }
.gf-note.is-error { color: #FECACA; background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.4); }
.gf-note.is-warn { color: #FDE68A; background: rgba(251,191,36,.1); border: 1px solid rgba(251,191,36,.4); }
.gf-note.is-ok { color: #BBF7D0; background: rgba(34,197,94,.12); border: 1px solid rgba(34,197,94,.4); }
.gf-artifact { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); }
.gf-artifact img { flex: none; width: 56px; height: 56px; object-fit: cover; border-radius: 10px; border: 1px solid rgba(255,255,255,.15); }
.gf-artifact b { display: block; font-family: 'Cinzel', Georgia, serif; font-size: 15px; color: #EAFBFD; }
.gf-artifact span { display: block; margin-top: 2px; font-size: 12.5px; color: #9CA9C4; }
.gf-math { margin: 12px 0 0; padding: 4px 14px; border-radius: 12px; background: rgba(251,191,36,.07); border: 1px solid rgba(251,191,36,.3); }
.gf-math div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; font-size: 13.5px; color: #C7D2E3; }
.gf-math div + div { border-top: 1px solid rgba(255,255,255,.08); }
.gf-math div:last-child { font-weight: 700; color: #FFE9B0; }
.gf-math img { width: 18px; height: 18px; margin-right: 5px; vertical-align: -4px; border-radius: 50%; object-fit: cover; }
.gf-done { padding: 12px 0 4px; text-align: center; }
.gf-done-icon { font-size: 44px; line-height: 1; }
.gf-done h3 { margin: 12px 0 6px; font-family: 'Cinzel', Georgia, serif; font-size: 20px; color: #EAFBFD; }
.gf-done p { margin: 0; font-size: 13.5px; line-height: 1.5; color: #B7C3D9; }

/* The inbox. */
.gf-tabs { display: flex; gap: 6px; padding: 12px 20px 0; }
.gf-card .gf-tab, .gf-card .gf-tab:hover { flex: 1; margin: 0; padding: 9px 8px; font: 700 13px 'Segoe UI', sans-serif; color: #9CA9C4; background: transparent; border: 1px solid rgba(255,255,255,.12); border-radius: 9px; cursor: pointer; }
.gf-card .gf-tab:hover { color: #fff; background: rgba(255,255,255,.06); }
.gf-card .gf-tab.on, .gf-card .gf-tab.on:hover { color: #06222A; background: #7FD4DC; border-color: #A6E6EC; }
.gf-list { display: flex; flex-direction: column; gap: 8px; }
.gf-item { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 12px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.1); }
.gf-item.is-new { background: rgba(251,191,36,.08); border-color: rgba(251,191,36,.45); }
.gf-item-icon { flex: none; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; font-size: 20px; line-height: 1; border-radius: 10px; background: rgba(255,255,255,.06); }
.gf-item-icon img { width: 26px; height: 26px; object-fit: cover; border-radius: 50%; }
.gf-item-icon .inline-icon { border-radius: 0; object-fit: contain; }
.gf-item-text { flex: 1; min-width: 0; }
.gf-item-text b { display: block; font-size: 13.5px; color: #EAFBFD; overflow-wrap: anywhere; }
.gf-item-text span { display: block; margin-top: 1px; font-size: 12px; line-height: 1.4; color: #9CA9C4; overflow-wrap: anywhere; }
.gf-item-text em { display: block; margin-top: 3px; font-size: 12px; color: #B7C3D9; overflow-wrap: anywhere; }
.gf-state { flex: none; font-size: 11.5px; font-weight: 600; color: #8B97B0; }
.gf-state.is-wait { color: #FDE68A; }
.gf-empty { padding: 26px 10px; text-align: center; font-size: 13.5px; line-height: 1.5; color: #9CA9C4; }

/* The wrapped gift. */
.gf-present { align-items: center; padding: 26px 22px 22px; text-align: center; overflow: visible; background: radial-gradient(ellipse at 50% 0%, rgba(251,191,36,.16), transparent 60%), linear-gradient(165deg, #1C2238 0%, #0D1226 100%); border-color: rgba(251,191,36,.5); }
.gf-present-kicker { margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #FBBF24; }
.gf-present h2 { margin: 8px 0 4px; font-family: 'Cinzel', Georgia, serif; font-size: 23px; color: #FFF4D6; overflow-wrap: anywhere; }
.gf-present-from { margin: 0; font-size: 14px; color: #C7D2E3; overflow-wrap: anywhere; }
.gf-present-from b { color: #fff; }
.gf-quote { margin: 12px 0 0; padding: 9px 14px; max-width: 100%; box-sizing: border-box; font-size: 13.5px; font-style: italic; line-height: 1.45; color: #E7ECF5; background: rgba(255,255,255,.06); border-radius: 10px; overflow-wrap: anywhere; }
.gf-stage { position: relative; width: 170px; height: 170px; margin: 18px auto 6px; }
.gf-rays { position: absolute; inset: -30px; border-radius: 50%; background: repeating-conic-gradient(from 0deg, rgba(251,191,36,.22) 0deg 8deg, transparent 8deg 22deg); -webkit-mask-image: radial-gradient(circle, #000 30%, transparent 70%); mask-image: radial-gradient(circle, #000 30%, transparent 70%); animation: gfRays 18s linear infinite; }
.gf-box { position: absolute; left: 25px; bottom: 14px; width: 120px; height: 122px; animation: gfWobble 2.4s ease-in-out infinite; transform-origin: 50% 100%; }
.gf-box-body { position: absolute; left: 6px; right: 6px; bottom: 0; height: 84px; border-radius: 6px; background: linear-gradient(160deg, #E11D48, #9F1239); box-shadow: inset 0 -10px 18px rgba(0,0,0,.25), 0 10px 22px rgba(0,0,0,.45); }
.gf-box-lid { position: absolute; left: 0; right: 0; top: 22px; height: 26px; border-radius: 6px; background: linear-gradient(160deg, #F43F5E, #BE123C); box-shadow: 0 4px 8px rgba(0,0,0,.3); }
.gf-ribbon-v { position: absolute; left: 50%; top: 22px; bottom: 0; width: 20px; margin-left: -10px; background: linear-gradient(90deg, #F59E0B, #FCD34D, #F59E0B); }
.gf-bow { position: absolute; left: 50%; top: 0; width: 76px; height: 28px; margin-left: -38px; }
.gf-bow::before, .gf-bow::after { content: ''; position: absolute; top: 2px; width: 34px; height: 24px; border: 6px solid #FCD34D; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; box-sizing: border-box; }
.gf-bow::before { left: 0; transform: rotate(-18deg); }
.gf-bow::after { right: 0; transform: rotate(18deg); }
.gf-box.is-open { animation: none; }
.gf-box.is-open .gf-box-lid, .gf-box.is-open .gf-bow { animation: gfLid .6s ease-in forwards; }
.gf-prize { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; animation: gfPop .5s ease both; }
.gf-prize-icon { width: 76px; height: 76px; display: flex; align-items: center; justify-content: center; font-size: 42px; line-height: 1; border-radius: 50%; background: radial-gradient(circle, rgba(251,191,36,.35), rgba(251,191,36,.05)); border: 2px solid rgba(251,191,36,.7); box-shadow: 0 0 34px rgba(251,191,36,.45); }
.gf-prize-icon img { width: 54px; height: 54px; object-fit: cover; border-radius: 50%; }
.gf-prize-icon .inline-icon { border-radius: 0; object-fit: contain; }
.gf-prize b { font-size: 30px; line-height: 1.1; color: #FFE9B0; font-variant-numeric: tabular-nums; }
.gf-prize-label { font-size: 14px; font-weight: 600; color: #F2E3BC; }
.gf-present-detail { min-height: 18px; margin: 6px 0 0; font-size: 12.5px; color: #9CA9C4; }
.gf-present-actions { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 14px; }
.gf-present-count { margin: 10px 0 0; font-size: 12px; color: #8B97B0; }

@media (max-width: 440px) {
  .gf-head { padding: 14px 12px 12px 16px; }
  .gf-head h2 { font-size: 18px; }
  .gf-body { padding: 14px 16px 16px; }
  .gf-foot { padding: 10px 16px 14px; }
  .gf-tabs { padding: 10px 16px 0; }
  .gf-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .gf-row { flex-wrap: wrap; }
  .gf-row .gf-btn.gf-small, .gf-row .gf-btn.gf-small:hover { flex: 1 1 100%; }
}
/* A phone held sideways: the gift box shrinks so the buttons stay on screen. */
@media (max-height: 480px) {
  .gf-present { padding: 14px 18px 14px; overflow-y: auto; }
  .gf-present h2 { font-size: 19px; }
  .gf-stage { width: 110px; height: 110px; margin: 8px auto 2px; }
  .gf-box { left: 16px; bottom: 6px; transform: scale(.62); transform-origin: 50% 100%; animation: none; }
  .gf-prize-icon { width: 52px; height: 52px; font-size: 28px; }
  .gf-prize-icon img { width: 36px; height: 36px; }
  .gf-prize b { font-size: 22px; }
  .gf-present-actions { flex-direction: row; margin-top: 8px; }
  .gf-quote { margin-top: 6px; padding: 6px 10px; }
}
`;

function injectStyles() {
  if (typeof document === 'undefined' || document.getElementById('giftStyles')) return;
  const style = document.createElement('style');
  style.id = 'giftStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}
injectStyles(); // crafting.js draws Sell / Gift buttons as soon as it loads

// ---------- modal shell ----------

/** Opens an overlay holding one card. dismissible: Escape / a tap on the backdrop close it. */
function openOverlay(cardClass, { dismissible = true, label } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'gf-overlay';
  const card = document.createElement('div');
  card.className = `gf-card ${cardClass || ''}`;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  if (label) card.setAttribute('aria-label', label);
  overlay.appendChild(card);
  let closed = false;
  let onClose = () => {};
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape' && dismissible) close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay && dismissible) close(); });
  document.body.appendChild(overlay);
  return { overlay, card, close, whenClosed: (fn) => { onClose = fn; } };
}

const headHtml = (icon, title) => `
  <div class="gf-head">
    <span class="gf-head-icon" aria-hidden="true">${icon}</span>
    <h2>${title}</h2>
    <button type="button" class="gf-x" data-act="close" aria-label="Close">✕</button>
  </div>`;

function errorText(err) {
  if (err && err.code === 'limit') return LIMIT_MESSAGE;
  if (err && err.code === 'not-enough') return 'You no longer have that many of this ticket.';
  if (err && err.code === 'not-owned') return 'You no longer own this artifact.';
  if (err && err.code === 'once-a-day') return 'You already gifted this artifact today. You can gift it again tomorrow.';
  if (err && err.code === 'gone') return 'This gift is no longer available.';
  return 'Something went wrong. Please check your connection and try again.';
}

// ---------- send a gift (tickets, or one artifact) ----------

function openSendGift({ artifactId = null } = {}) {
  if (!me) return;
  const isArtifact = !!artifactId;
  const art = isArtifact ? findArtifact(artifactId) : null;
  const modal = openOverlay('', { label: 'Send a gift' });
  const state = { recipient: null, left: null, ticketType: null, amount: 1, note: '', busy: false, message: null, lookup: '', done: false };

  const tickets = () => me.data.tickets || {};
  const maxAmount = () => Math.min(tickets()[state.ticketType] || 0, state.left ?? 0);

  const render = () => {
    const c = modal.card;
    if (state.done) {
      c.innerHTML = `${headHtml('🎁', 'Gift Sent')}
        <div class="gf-body"><div class="gf-done">
          <div class="gf-done-icon" aria-hidden="true">🎁</div>
          <h3>On its way to ${escapeHtml(firstName(state.recipient.name))}!</h3>
          <p>${escapeHtml(state.doneText)}</p>
          <p style="margin-top:8px">${escapeHtml(firstName(state.recipient.name))} will see it the next time they open their dashboard.</p>
        </div></div>
        <div class="gf-foot"><button type="button" class="gf-btn" data-act="close">Done</button></div>`;
      c.querySelectorAll('[data-act="close"]').forEach((b) => { b.onclick = modal.close; });
      c.querySelector('.gf-foot .gf-btn').focus({ preventScroll: true });
      return;
    }

    let body = '';
    if (isArtifact) {
      const worth = artifactTokenValue(artifactId);
      body += `<p class="gf-label">The artifact</p>
        <div class="gf-artifact"><img src="${artifactIconPath(artifactId)}" alt=""><div><b>${escapeHtml(art.name)}</b><span>Leaves your collection when you send it</span></div></div>
        <div class="gf-math"><div><span>They receive</span><span><img src="${TOKEN_ICON}" alt="">${plural(worth, 'Unlock Token')}</span></div></div>
        <p class="gf-hint">The artifact itself is not passed on. It turns into Unlock Tokens, ${ARTIFACT_FEE} fewer than its price of ${worth + ARTIFACT_FEE}.</p>`;
    }

    body += `<p class="gf-label">Who is it for?</p>`;
    if (!state.recipient) {
      body += `<p class="gf-text">Type their school email. We will show you their name before anything is sent.</p>
        <div class="gf-row"><input class="gf-input" id="gfEmail" type="email" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="name@hcdc.edu.ph" value="${escapeHtml(state.lookup)}"><button type="button" class="gf-btn gf-small" id="gfFind">${state.busy ? 'Looking…' : 'Find'}</button></div>`;
    } else {
      body += `<div class="gf-person"><span class="gf-person-icon" aria-hidden="true">${escapeHtml(state.recipient.name.trim().charAt(0).toUpperCase() || '?')}</span>
        <div class="gf-person-text"><b>${escapeHtml(state.recipient.name)}</b><span>${escapeHtml(state.recipient.email)}</span></div>
        <button type="button" class="gf-btn gf-small gf-ghost" id="gfChange">Change</button></div>`;

      if (!isArtifact) {
        const out = state.left === 0;
        body += `<p class="gf-label">Which ticket?</p><div class="gf-tiles">${Object.entries(TICKET_INFO).map(([key, info]) => `
          <button type="button" class="gf-tile${state.ticketType === key ? ' on' : ''}" data-ticket="${key}" ${(tickets()[key] || 0) < 1 || out ? 'disabled' : ''} aria-pressed="${state.ticketType === key}">
            <span class="gf-tile-icon">${info.icon}</span><b>${tickets()[key] || 0}</b><span class="gf-tile-name">${escapeHtml(info.label)}</span></button>`).join('')}</div>`;
        if (out) {
          body += `<p class="gf-note is-warn">${escapeHtml(LIMIT_MESSAGE)}</p>`;
        } else {
          if (state.ticketType) {
            body += `<p class="gf-label">How many?</p>
              <div class="gf-amount"><button type="button" class="gf-chip" data-step="-1" aria-label="One fewer">−</button>
                <input class="gf-input" id="gfAmount" type="number" inputmode="numeric" min="1" max="${maxAmount()}" value="${state.amount}" aria-label="How many tickets">
                <button type="button" class="gf-chip" data-step="1" aria-label="One more">+</button>
                <button type="button" class="gf-chip" data-step="max">Max</button></div>`;
          }
          body += `<p class="gf-hint">You can send ${escapeHtml(firstName(state.recipient.name))} <b>${state.left} more ${state.left === 1 ? 'ticket' : 'tickets'}</b> today. The limit is ${DAILY_TICKET_LIMIT} tickets per student per day.</p>`;
        }
      }
      if (isArtifact || (state.ticketType && state.left > 0)) {
        body += `<p class="gf-label">Add a note (optional)</p>
          <input class="gf-input" id="gfNote" type="text" maxlength="${NOTE_MAX}" placeholder="A few kind words" value="${escapeHtml(state.note)}">`;
      }
    }
    if (state.message) body += `<p class="gf-note is-${state.message.kind}" role="alert">${escapeHtml(state.message.text)}</p>`;

    const canSend = state.recipient && !state.busy && (isArtifact || (state.ticketType && state.amount >= 1 && state.amount <= maxAmount()));
    const sendLabel = state.busy && state.recipient ? 'Sending…' : !state.recipient ? 'Send Gift'
      : isArtifact ? `Send to ${escapeHtml(firstName(state.recipient.name))}`
        : state.ticketType ? `Send ${state.amount} to ${escapeHtml(firstName(state.recipient.name))}` : 'Send Gift';
    c.innerHTML = `${headHtml('🎁', isArtifact ? 'Gift an Artifact' : 'Send a Gift')}
      <div class="gf-body">${body}</div>
      <div class="gf-foot"><button type="button" class="gf-btn gf-ghost" data-act="close">Cancel</button><button type="button" class="gf-btn gf-gold" id="gfSend" ${canSend ? '' : 'disabled'}>${sendLabel}</button></div>`;

    c.querySelectorAll('[data-act="close"]').forEach((b) => { b.onclick = modal.close; });
    const emailEl = c.querySelector('#gfEmail');
    if (emailEl) {
      emailEl.oninput = () => { state.lookup = emailEl.value; };
      emailEl.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); find(); } };
      c.querySelector('#gfFind').onclick = find;
    }
    const change = c.querySelector('#gfChange');
    if (change) change.onclick = () => { state.recipient = null; state.left = null; state.ticketType = null; state.message = null; render(); focusEmail(); };
    c.querySelectorAll('[data-ticket]').forEach((b) => {
      b.onclick = () => { state.ticketType = b.dataset.ticket; state.amount = Math.max(1, Math.min(state.amount, maxAmount())); state.message = null; render(); };
    });
    const amountEl = c.querySelector('#gfAmount');
    if (amountEl) {
      const sync = () => {
        const sendBtn = c.querySelector('#gfSend');
        const ok = state.amount >= 1 && state.amount <= maxAmount();
        sendBtn.disabled = !ok || state.busy;
        sendBtn.textContent = `Send ${state.amount || 0} to ${firstName(state.recipient.name)}`;
      };
      amountEl.oninput = () => { state.amount = Math.floor(Number(amountEl.value)) || 0; sync(); };
      amountEl.onblur = () => { state.amount = Math.max(1, Math.min(state.amount || 1, maxAmount())); amountEl.value = state.amount; sync(); };
      c.querySelectorAll('[data-step]').forEach((b) => {
        b.onclick = () => {
          const step = b.dataset.step;
          state.amount = step === 'max' ? maxAmount() : Math.max(1, Math.min((state.amount || 0) + Number(step), maxAmount()));
          amountEl.value = state.amount;
          sync();
        };
      });
    }
    const noteEl = c.querySelector('#gfNote');
    if (noteEl) {
      // Type-only, like every other box a student writes in. Wired before
      // oninput so a refused paste is already undone when the note is read.
      blockPasteInto(noteEl, () => { state.message = { kind: 'error', text: "Pasting isn't allowed here. Please type your note yourself." }; });
      noteEl.oninput = () => { state.note = noteEl.value; };
    }
    c.querySelector('#gfSend').onclick = send;
  };

  const focusEmail = () => { const e = modal.card.querySelector('#gfEmail'); if (e) e.focus({ preventScroll: true }); };

  const find = async () => {
    if (state.busy) return;
    state.busy = true; state.message = null; render();
    try {
      const found = await findRecipient(state.lookup);
      if (found.error) {
        state.message = { kind: 'error', text: found.error };
      } else {
        state.recipient = found.recipient;
        if (!isArtifact) state.left = await ticketsLeftToday(found.recipient.email);
      }
    } catch (err) {
      console.error('Could not look up the recipient:', err);
      state.message = { kind: 'error', text: errorText(err) };
    }
    state.busy = false;
    render();
    if (!state.recipient) focusEmail();
  };

  const send = async () => {
    if (state.busy || !state.recipient) return;
    const note = state.note.trim().slice(0, NOTE_MAX);
    const problem = noteProblem(note);
    const banned = findBannedWord(note);
    if (banned) startCooldown({ email: me.email, word: banned, where: 'a gift note' });
    if (problem) { state.message = { kind: 'error', text: problem }; render(); const n = modal.card.querySelector('#gfNote'); if (n) n.focus({ preventScroll: true }); return; }
    state.busy = true; state.message = null; render();
    try {
      const to = state.recipient.email;
      const toName = state.recipient.name;
      if (isArtifact) {
        await giftArtifact({ to, toName, artifactId, note });
        state.doneText = `${art.name} has left your collection. ${firstName(toName)} will receive ${plural(artifactTokenValue(artifactId), 'Unlock Token')}.`;
      } else {
        await sendTickets({ to, toName, ticketType: state.ticketType, amount: state.amount, note });
        state.doneText = `You sent ${state.amount} × ${TICKET_INFO[state.ticketType].label}.`;
      }
      state.done = true;
    } catch (err) {
      if (!err.code) console.error('Gift failed:', err);
      state.message = { kind: err.code === 'limit' ? 'warn' : 'error', text: errorText(err) };
      if (err.code === 'limit') state.left = await ticketsLeftToday(state.recipient.email).catch(() => state.left);
    }
    state.busy = false;
    render();
  };

  render();
  focusEmail();
}

export function openSendTickets() { openSendGift(); }

/** Opened from an owned artifact's Gift button (crafting.js). */
export function openGiftArtifact(artifactId) {
  if (!me || artifactLockReason(me.data, artifactId)) return;
  openSendGift({ artifactId });
}

// ---------- sell an artifact ----------

/** Opened from an owned artifact's Sell button (crafting.js). */
export function openSellArtifact(artifactId) {
  if (!me || artifactLockReason(me.data, artifactId)) return;
  const art = findArtifact(artifactId);
  const worth = artifactTokenValue(artifactId);
  const modal = openOverlay('', { label: `Sell ${art.name}` });
  const render = ({ busy = false, error = null, sold = false } = {}) => {
    const c = modal.card;
    if (sold) {
      c.innerHTML = `${headHtml('🪙', 'Artifact Sold')}
        <div class="gf-body"><div class="gf-done"><div class="gf-done-icon" aria-hidden="true">🪙</div>
          <h3>+${plural(worth, 'Unlock Token')}</h3><p>${escapeHtml(art.name)} has been sold. You now have ${plural(me.data.unlockTokens || 0, 'Unlock Token')}.</p></div></div>
        <div class="gf-foot"><button type="button" class="gf-btn" data-act="close">Done</button></div>`;
    } else {
      c.innerHTML = `${headHtml('🪙', 'Sell an Artifact')}
        <div class="gf-body">
          <div class="gf-artifact"><img src="${artifactIconPath(artifactId)}" alt=""><div><b>${escapeHtml(art.name)}</b><span>Tier ${tierOfArtifact(artifactId)} artifact</span></div></div>
          <div class="gf-math">
            <div><span>Its price</span><span><img src="${TOKEN_ICON}" alt="">${worth + ARTIFACT_FEE}</span></div>
            <div><span>Selling fee</span><span>− ${ARTIFACT_FEE}</span></div>
            <div><span>You receive</span><span><img src="${TOKEN_ICON}" alt="">${plural(worth, 'Unlock Token')}</span></div>
          </div>
          <p class="gf-hint">The artifact leaves your collection. To own it again you would pay its full price of ${worth + ARTIFACT_FEE}.</p>
          ${error ? `<p class="gf-note is-error" role="alert">${escapeHtml(error)}</p>` : ''}
        </div>
        <div class="gf-foot"><button type="button" class="gf-btn gf-ghost" data-act="close">Keep It</button><button type="button" class="gf-btn gf-gold" id="gfSell" ${busy ? 'disabled' : ''}>${busy ? 'Selling…' : `Sell for ${worth}`}</button></div>`;
      c.querySelector('#gfSell').onclick = async () => {
        render({ busy: true });
        try { await sellArtifact(artifactId); render({ sold: true }); } catch (err) {
          if (!err.code) console.error('Sell failed:', err);
          render({ error: errorText(err) });
        }
      };
    }
    c.querySelectorAll('[data-act="close"]').forEach((b) => { b.onclick = modal.close; });
    (c.querySelector('.gf-foot .gf-ghost') || c.querySelector('.gf-foot .gf-btn')).focus({ preventScroll: true });
  };
  render();
}

// ---------- the wrapped gift ----------

/** Shows one waiting gift. Resolves when the student has opened it or put it off. */
function presentGift(gift, moreAfter) {
  return new Promise((resolve) => {
    const modal = openOverlay('gf-present', { dismissible: false, label: `A gift from ${gift.fromName}` });
    const what = describeGift(gift);
    modal.whenClosed(resolve);
    const c = modal.card;
    c.innerHTML = `
      <p class="gf-present-kicker">✦ A Gift for You ✦</p>
      <h2 id="gfPresentTitle">You received a gift!</h2>
      <p class="gf-present-from">From <b>${escapeHtml(gift.fromName)}</b></p>
      ${shownNote(gift) ? `<p class="gf-quote">“${escapeHtml(shownNote(gift))}”</p>` : ''}
      <div class="gf-stage"><div class="gf-rays" aria-hidden="true"></div>
        <div class="gf-box" aria-hidden="true"><div class="gf-box-body"></div><div class="gf-ribbon-v"></div><div class="gf-box-lid"></div><div class="gf-bow"></div></div></div>
      <p class="gf-present-detail" role="status"></p>
      <div class="gf-present-actions"><button type="button" class="gf-btn gf-gold" data-act="open">Open Gift</button><button type="button" class="gf-btn gf-ghost" data-act="later">Open Later</button></div>
      ${moreAfter ? `<p class="gf-present-count">${plural(moreAfter, 'more gift')} waiting</p>` : ''}`;
    const detail = c.querySelector('.gf-present-detail');
    const openBtn = c.querySelector('[data-act="open"]');
    const laterBtn = c.querySelector('[data-act="later"]');
    laterBtn.onclick = () => { snoozed.add(gift.id); modal.close(); };
    openBtn.onclick = async () => {
      openBtn.disabled = true; laterBtn.disabled = true;
      openBtn.textContent = 'Opening…';
      detail.textContent = '';
      try {
        await claimGift(gift);
      } catch (err) {
        if (!err.code) console.error('Could not open the gift:', err);
        detail.textContent = errorText(err);
        openBtn.disabled = false; laterBtn.disabled = false;
        openBtn.textContent = 'Try Again';
        return;
      }
      c.querySelector('.gf-box').classList.add('is-open');
      setTimeout(() => {
        const stage = c.querySelector('.gf-stage');
        stage.querySelector('.gf-box').remove();
        stage.insertAdjacentHTML('beforeend', `<div class="gf-prize"><span class="gf-prize-icon">${what.icon}</span><b>${what.amountText}</b><span class="gf-prize-label">${escapeHtml(what.label)}</span></div>`);
        c.querySelector('#gfPresentTitle').textContent = 'It is yours!';
        detail.textContent = what.detail;
        c.querySelector('.gf-present-actions').innerHTML = `<button type="button" class="gf-btn gf-gold" data-act="done">${moreAfter ? 'Next Gift' : 'Thank You!'}</button>`;
        const done = c.querySelector('[data-act="done"]');
        done.onclick = modal.close;
        done.focus({ preventScroll: true });
      }, 520);
    };
    openBtn.focus({ preventScroll: true });
  });
}

async function presentPending() {
  if (presenting) return;
  presenting = true;
  try {
    for (;;) {
      const queue = pending.filter((g) => !snoozed.has(g.id));
      if (!queue.length) break;
      await presentGift(queue[0], queue.length - 1);
    }
  } finally {
    presenting = false;
  }
}

/**
 * Shows any gifts waiting when the dashboard opens; awaited in the
 * dashboard's own popup sequence so nothing stacks. After it resolves,
 * a gift that arrives while the dashboard is open pops up at once.
 */
export async function showPendingGifts() {
  if (!me || !firstSnapshot) return;
  await Promise.race([firstSnapshot, new Promise((r) => setTimeout(r, 4000))]);
  await presentPending();
  autoPopup = true;
}

// ---------- the inbox ----------

const whenText = (ts) => {
  const d = ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
  return d ? d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Just now';
};
const millis = (ts) => (ts && typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now());

function openInbox() {
  if (!me) return;
  const modal = openOverlay('', { label: 'Your gifts' });
  const state = { tab: 'received', received: null, sent: null, error: null };

  const itemHtml = (g, mine) => {
    const what = describeGift(g);
    const title = `${what.amountText.replace('+', '')} ${what.label}`;
    const who = mine ? `To ${g.toName || g.to}` : `From ${g.fromName || g.from}`;
    const isNew = !mine && !g.claimed;
    const side = isNew ? `<button type="button" class="gf-btn gf-small gf-gold" data-open="${escapeHtml(g.id)}">Open</button>`
      : `<span class="gf-state${!g.claimed ? ' is-wait' : ''}">${g.claimed ? 'Opened' : 'Not opened yet'}</span>`;
    return `<div class="gf-item${isNew ? ' is-new' : ''}"><span class="gf-item-icon">${what.icon}</span>
      <div class="gf-item-text"><b>${escapeHtml(title)}</b><span>${escapeHtml(who)} · ${escapeHtml(whenText(g.createdAt))}</span>${shownNote(g) ? `<em>“${escapeHtml(shownNote(g))}”</em>` : ''}</div>${side}</div>`;
  };

  const render = () => {
    const list = state[state.tab];
    const mine = state.tab === 'sent';
    let body;
    if (state.error) body = `<p class="gf-note is-error" role="alert">${escapeHtml(state.error)}</p>`;
    else if (!list) body = `<p class="gf-empty">Loading…</p>`;
    else if (!list.length) body = `<p class="gf-empty">${mine ? 'You have not sent any gifts yet.' : 'No gifts yet. When a classmate sends you one, it will appear here.'}</p>`;
    else body = `<div class="gf-list">${list.map((g) => itemHtml(g, mine)).join('')}</div>`;
    const waiting = (state.received || []).filter((g) => !g.claimed).length;
    modal.card.innerHTML = `${headHtml('🎁', 'Your Gifts')}
      <div class="gf-tabs" role="tablist">
        <button type="button" class="gf-tab${!mine ? ' on' : ''}" role="tab" aria-selected="${!mine}" data-tab="received">Received${waiting ? ` (${waiting} new)` : ''}</button>
        <button type="button" class="gf-tab${mine ? ' on' : ''}" role="tab" aria-selected="${mine}" data-tab="sent">Sent</button>
      </div>
      <div class="gf-body">${body}</div>
      <div class="gf-foot"><button type="button" class="gf-btn gf-ghost" data-act="close">Close</button><button type="button" class="gf-btn" data-act="send">Send a Gift</button></div>`;
    modal.card.querySelectorAll('[data-act="close"]').forEach((b) => { b.onclick = modal.close; });
    modal.card.querySelector('[data-act="send"]').onclick = () => { modal.close(); openSendGift(); };
    modal.card.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { state.tab = b.dataset.tab; render(); }; });
    modal.card.querySelectorAll('[data-open]').forEach((b) => {
      b.onclick = async () => {
        const gift = state.received.find((g) => g.id === b.dataset.open);
        if (!gift) return;
        snoozed.delete(gift.id);
        modal.close();
        await presentGift(gift, 0);
        openInbox();
      };
    });
  };

  const load = async () => {
    try {
      const gifts = collection(db, 'gifts');
      const [toMe, fromMe] = await Promise.all([
        getDocs(query(gifts, where('to', '==', me.email))),
        getDocs(query(gifts, where('from', '==', me.email)))
      ]);
      const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
      // Unopened first, then newest first.
      state.received = rows(toMe).sort((a, b) => Number(a.claimed) - Number(b.claimed));
      state.sent = rows(fromMe);
    } catch (err) {
      console.error('Could not load gifts:', err);
      state.error = errorText(err);
    }
    render();
  };

  render();
  load();
}

// ---------- wiring ----------

function updateBadge() {
  const badge = document.getElementById('giftBadge');
  if (!badge) return;
  badge.textContent = pending.length > 9 ? '9+' : String(pending.length);
  badge.classList.toggle('hidden', pending.length === 0);
  const btn = document.getElementById('giftInboxBtn');
  if (btn) btn.setAttribute('aria-label', pending.length ? `Your gifts: ${pending.length} to open` : 'Your gifts');
}

/**
 * Called once by the dashboard. onChange runs whenever tickets, tokens
 * or artifacts on studentData change, so the wallet and the artifact
 * grid can redraw.
 */
export function initGifts({ email, name, studentData, onChange = () => {} }) {
  if (!email || !studentData) return;
  me = { email, name: studentData.name || name || email, data: studentData, onChange };

  const inboxBtn = document.getElementById('giftInboxBtn');
  if (inboxBtn) { inboxBtn.classList.remove('hidden'); inboxBtn.onclick = openInbox; }
  const sendBtn = document.getElementById('sendGiftBtn');
  if (sendBtn) sendBtn.onclick = () => openSendGift();

  let reported;
  firstSnapshot = new Promise((resolve) => { reported = resolve; });
  onSnapshot(
    query(collection(db, 'gifts'), where('to', '==', email), where('claimed', '==', false)),
    (snap) => {
      pending = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(a.createdAt) - millis(b.createdAt));
      updateBadge();
      reported();
      if (autoPopup) presentPending();
    },
    (err) => { console.error('Gift listener failed:', err); reported(); }
  );
}
