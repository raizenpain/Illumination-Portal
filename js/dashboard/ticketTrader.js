// ============================================
// TICKET TRADER — nested under the dashboard's Milestones panel.
// Three trade options, per artifact-system.json:
//   1. Same SAME_COUNT tickets (one chosen type)        -> 1 Unlock Token
//   2. Any ANY_COUNT tickets (mixed, no Ember Shards)    -> 1 Unlock Token
//   3. SCRAP_COUNT Ember Shards (catch-up path)          -> 1 Unlock Token
//
// Ember Shards (internal id: scrap_ticket) are earned automatically
// on every season node completion (see awardNode() in season.js) —
// they're deliberately excluded from options 1 and 2, and need a much
// steeper count (SCRAP_COUNT) than the "real" ticket types, since a
// student racks them up passively just by doing anything at all.
//
// Tokens are a single fungible balance (unlockTokens on the student
// doc) spendable on any artifact later — there's no per-artifact
// earmarking, even for the Ember Shard trade's "student's choice"
// framing.
// ============================================

import { db, doc, runTransaction } from '../core/firebase.js';

// Tripled on 2026-10-05 (were 12 / 24 / 45) to balance the bigger
// season rewards (+5 of every ticket per task and per chapter). The
// matching labels are in dashboard.html's Ticket Trader modal.
const SAME_COUNT = 36;
const ANY_COUNT = 72;
const SCRAP_COUNT = 135;

export const TICKET_INFO = {
  quiz_ticket: { icon: '📝', label: 'Sigil of Insight' },
  task_ticket: { icon: '🎯', label: 'Seal of Diligence' },
  journal_ticket: { icon: '📖', label: 'Scroll of Reflection' },
  recitation_ticket: { icon: '🗣️', label: "Herald's Voice" },
  scrap_ticket: { icon: '<img src="assets/ember-shard.png" class="inline-icon" alt="">', label: 'Ember Shard' }
};

const TRADEABLE_TYPES = ['quiz_ticket', 'task_ticket', 'journal_ticket', 'recitation_ticket'];

let modalEmail = null;
let modalStudentData = null;
let modalSidebarWallet = null;

export function initTicketTrader({ email, studentData, prelimDone }) {
  const wrap = document.getElementById('ticketTraderWrap');
  if (!wrap) return;

  const overlay = document.getElementById('ticketTraderLockOverlay');
  const openBtn = document.getElementById('openTicketTraderBtn');
  const wallet = document.getElementById('ticketWallet');

  renderWallet(wallet, studentData);

  if (!prelimDone) {
    wrap.classList.add('is-locked');
    overlay.classList.remove('hidden');
    openBtn.disabled = true;
    openBtn.onclick = null;
    return;
  }

  wrap.classList.remove('is-locked');
  overlay.classList.add('hidden');
  openBtn.disabled = false;
  openBtn.onclick = () => openTraderModal(email, studentData, wallet);

  // Close by either button, a tap on the dimmed backdrop, or Escape.
  const modal = document.getElementById('ticketTraderModal');
  const close = () => modal.classList.add('hidden');
  ['ticketTraderCloseBtn', 'ticketTraderXBtn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = close;
  });
  modal.onclick = (e) => { if (e.target === modal) close(); };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });
}

/** Redraws the sidebar wallet after tickets or tokens change elsewhere (gifts.js). */
export function refreshTicketWallet(studentData) {
  renderWallet(document.getElementById('ticketWallet'), studentData);
}

function renderWallet(walletEl, studentData) {
  if (!walletEl) return;

  const tickets = studentData.tickets || {};
  const tokens = studentData.unlockTokens || 0;

  walletEl.innerHTML = '';

  Object.entries(TICKET_INFO).forEach(([key, info]) => {
    const slot = document.createElement('div');
    slot.className = 'ticket-slot';
    slot.title = info.label;
    slot.innerHTML = `<span class="ticket-slot-icon">${info.icon}</span><span class="ticket-slot-count">${tickets[key] || 0}</span>`;
    walletEl.appendChild(slot);
  });

  const tokenSlot = document.createElement('div');
  tokenSlot.className = 'ticket-slot ticket-slot-token';
  tokenSlot.title = 'Artifact Unlock Tokens';
  tokenSlot.innerHTML = `<span class="ticket-slot-icon"><img src="assets/unlock-token.png" class="inline-icon" alt=""></span><span class="ticket-slot-count">${tokens}</span>`;
  walletEl.appendChild(tokenSlot);
}

function openTraderModal(email, studentData, sidebarWallet) {
  modalEmail = email;
  modalStudentData = studentData;
  modalSidebarWallet = sidebarWallet;

  setStatus('');
  document.getElementById('ticketTraderModal').classList.remove('hidden');
  renderTraderModal();
}

// The modal's own balance: the token total on its own, and each ticket
// as a labelled tile (the sidebar keeps the compact renderWallet pills).
function renderModalBalance() {
  const tickets = modalStudentData.tickets || {};
  document.getElementById('traderTokenCount').textContent = modalStudentData.unlockTokens || 0;

  const grid = document.getElementById('traderModalWallet');
  grid.innerHTML = '';
  Object.entries(TICKET_INFO).forEach(([key, info]) => {
    const tile = document.createElement('div');
    tile.className = 'trader-ticket';
    tile.innerHTML = `<span class="trader-ticket-icon">${info.icon}</span><b>${tickets[key] || 0}</b><span class="trader-ticket-name">${info.label}</span>`;
    grid.appendChild(tile);
  });
}

// One trade option: how far along the student is, and a button that
// says how many more are needed instead of just greying out.
function setTradeProgress({ barId, countId, btn, have, need }) {
  const ready = have >= need;
  const bar = document.getElementById(barId);
  bar.style.width = `${Math.min(100, (have / need) * 100)}%`;
  bar.classList.toggle('is-ready', ready);
  document.getElementById(countId).textContent = `${Math.min(have, need)} / ${need}`;
  btn.disabled = !ready;
  btn.textContent = ready ? 'Trade' : `Need ${need - have} more`;
}

function setStatus(text, kind) {
  const statusEl = document.getElementById('ticketTraderStatus');
  statusEl.textContent = text;
  statusEl.className = `trader-status${text ? ` is-${kind}` : ''}`;
}

function renderTraderModal() {
  const tickets = modalStudentData.tickets || {};

  renderModalBalance();

  // --- Same 3 ---
  const select = document.getElementById('sameThreeSelect');
  const previousSelection = select.value || TRADEABLE_TYPES[0];
  select.innerHTML = '';
  TRADEABLE_TYPES.forEach((type) => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = `${TICKET_INFO[type].icon} ${TICKET_INFO[type].label} (${tickets[type] || 0})`;
    select.appendChild(opt);
  });
  select.value = previousSelection;

  const sameThreeBtn = document.getElementById('sameThreeTradeBtn');
  const updateSameThreeBtn = () => setTradeProgress({
    barId: 'sameThreeBar', countId: 'sameThreeCount', btn: sameThreeBtn, have: tickets[select.value] || 0, need: SAME_COUNT
  });
  select.onchange = updateSameThreeBtn;
  updateSameThreeBtn();

  sameThreeBtn.onclick = () => {
    const deduction = { quiz_ticket: 0, task_ticket: 0, journal_ticket: 0, recitation_ticket: 0, scrap_ticket: 0 };
    deduction[select.value] = SAME_COUNT;
    handleTrade(deduction, `${TICKET_INFO[select.value].label} x${SAME_COUNT}`);
  };

  // --- Any ANY_COUNT ---
  const nonScrapTotal = TRADEABLE_TYPES.reduce((sum, t) => sum + (tickets[t] || 0), 0);
  const anyFourBtn = document.getElementById('anyFourTradeBtn');
  setTradeProgress({ barId: 'anyFourBar', countId: 'anyFourInputLabel', btn: anyFourBtn, have: nonScrapTotal, need: ANY_COUNT });
  anyFourBtn.onclick = () => {
    const deduction = pickAnyFourDeduction(tickets);
    if (!deduction) return;
    handleTrade(deduction, `Any ${ANY_COUNT} tickets`);
  };

  // --- Scrap ---
  const scrapCount = tickets.scrap_ticket || 0;
  const sixScrapBtn = document.getElementById('sixScrapTradeBtn');
  setTradeProgress({ barId: 'sixScrapBar', countId: 'sixScrapCount', btn: sixScrapBtn, have: scrapCount, need: SCRAP_COUNT });
  sixScrapBtn.onclick = () => {
    handleTrade(
      { quiz_ticket: 0, task_ticket: 0, journal_ticket: 0, recitation_ticket: 0, scrap_ticket: SCRAP_COUNT },
      `${SCRAP_COUNT} Ember Shards`
    );
  };
}

// Spreads the ANY_COUNT cost across as many different types as
// possible before doubling up on any one type — matches the "rewards
// well-rounded participation" rationale from the source spec.
function pickAnyFourDeduction(tickets) {
  const remaining = {};
  TRADEABLE_TYPES.forEach((t) => { remaining[t] = tickets[t] || 0; });

  const deduction = { quiz_ticket: 0, task_ticket: 0, journal_ticket: 0, recitation_ticket: 0, scrap_ticket: 0 };
  let need = ANY_COUNT;

  while (need > 0) {
    let takenThisPass = false;

    for (const t of TRADEABLE_TYPES) {
      if (need === 0) break;
      if (remaining[t] > 0) {
        remaining[t]--;
        deduction[t]++;
        need--;
        takenThisPass = true;
      }
    }

    if (!takenThisPass) return null; // not actually enough tickets
  }

  return deduction;
}

async function handleTrade(deduction, label) {
  setStatus('');
  setTradeRowsBusy(true);
  let succeeded = false;
  let insufficientTickets = false;
  let finalTickets = null;
  let finalTokens = null;

  try {
    const studentRef = doc(db, 'students', modalEmail);

    // Runs against the LIVE server balance, not the cached copy this
    // modal loaded with — closes the race where a trade in one tab
    // could otherwise be silently undone (or let through with a real
    // shortfall) by a stale whole-object write from another tab.
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(studentRef);
      const liveTickets = { ...((snap.data() || {}).tickets || {}) };
      const liveTokens = (snap.data() || {}).unlockTokens || 0;

      const shortfall = Object.entries(deduction).some(
        ([type, amount]) => amount > 0 && (liveTickets[type] || 0) < amount
      );
      if (shortfall) {
        insufficientTickets = true;
        throw new Error('insufficient-tickets');
      }

      Object.entries(deduction).forEach(([type, amount]) => {
        liveTickets[type] = (liveTickets[type] || 0) - amount;
      });

      finalTickets = liveTickets;
      finalTokens = liveTokens + 1;
      tx.update(studentRef, { tickets: finalTickets, unlockTokens: finalTokens });
    });

    modalStudentData.tickets = finalTickets;
    modalStudentData.unlockTokens = finalTokens;
    succeeded = true;
  } catch (err) {
    if (!insufficientTickets) console.error('Trade failed:', err);
  }

  setTradeRowsBusy(false);
  renderTraderModal();
  renderWallet(modalSidebarWallet, modalStudentData);

  if (insufficientTickets) {
    setStatus("You don't have enough tickets for that trade anymore.", 'error');
  } else if (succeeded) {
    setStatus(`Traded for 1 Artifact Unlock Token (${label}).`, 'ok');
  } else {
    setStatus('Something went wrong. Please try again.', 'error');
  }
}

function setTradeRowsBusy(busy) {
  ['sameThreeTradeBtn', 'anyFourTradeBtn', 'sixScrapTradeBtn', 'sameThreeSelect'].forEach((id) => {
    document.getElementById(id).disabled = busy;
  });
}
