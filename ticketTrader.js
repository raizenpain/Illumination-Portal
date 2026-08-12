// ============================================
// TICKET TRADER — nested under the dashboard's Milestones panel.
// Three trade options, per artifact-system.json:
//   1. Same 3 tickets (one chosen type)          -> 1 Unlock Token
//   2. Any 4 tickets (mixed, no Ember Shards)    -> 1 Unlock Token
//   3. 6 Ember Shards (catch-up path)            -> 1 Unlock Token
//
// Ember Shards (internal id: scrap_ticket) are deliberately excluded
// from options 1 and 2 — they're meant to be a worse, safety-net
// conversion rate (6-for-1) than the "real" ticket types, so letting
// them slide into the same-3 trade at 3-for-1 would make the
// dedicated Ember Shard trade pointless.
//
// Tokens are a single fungible balance (unlockTokens on the student
// doc) spendable on any artifact later — there's no per-artifact
// earmarking, even for the Ember Shard trade's "student's choice"
// framing.
// ============================================

import { db, doc, setDoc } from './firebase.js';

const TICKET_INFO = {
  quiz_ticket: { icon: '📝', label: 'Sigil of Insight' },
  task_ticket: { icon: '🎯', label: 'Seal of Diligence' },
  journal_ticket: { icon: '📖', label: 'Scroll of Reflection' },
  recitation_ticket: { icon: '🗣️', label: "Herald's Voice" },
  scrap_ticket: { icon: '♻️', label: 'Ember Shard' }
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

  const closeBtn = document.getElementById('ticketTraderCloseBtn');
  if (closeBtn) {
    closeBtn.onclick = () => document.getElementById('ticketTraderModal').classList.add('hidden');
  }
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
  tokenSlot.innerHTML = `<span class="ticket-slot-icon">🪙</span><span class="ticket-slot-count">${tokens}</span>`;
  walletEl.appendChild(tokenSlot);
}

function openTraderModal(email, studentData, sidebarWallet) {
  modalEmail = email;
  modalStudentData = studentData;
  modalSidebarWallet = sidebarWallet;

  document.getElementById('ticketTraderModal').classList.remove('hidden');
  renderTraderModal();
}

function renderTraderModal() {
  const tickets = modalStudentData.tickets || {};

  renderWallet(document.getElementById('traderModalWallet'), modalStudentData);

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
  const updateSameThreeBtn = () => { sameThreeBtn.disabled = (tickets[select.value] || 0) < 3; };
  select.onchange = updateSameThreeBtn;
  updateSameThreeBtn();

  sameThreeBtn.onclick = () => {
    const deduction = { quiz_ticket: 0, task_ticket: 0, journal_ticket: 0, recitation_ticket: 0, scrap_ticket: 0 };
    deduction[select.value] = 3;
    handleTrade(deduction, `${TICKET_INFO[select.value].label} x3`);
  };

  // --- Any 4 ---
  const nonScrapTotal = TRADEABLE_TYPES.reduce((sum, t) => sum + (tickets[t] || 0), 0);
  document.getElementById('anyFourInputLabel').textContent = `${Math.min(nonScrapTotal, 4)}/4`;

  const anyFourBtn = document.getElementById('anyFourTradeBtn');
  anyFourBtn.disabled = nonScrapTotal < 4;
  anyFourBtn.onclick = () => {
    const deduction = pickAnyFourDeduction(tickets);
    if (!deduction) return;
    handleTrade(deduction, 'Any 4 tickets');
  };

  // --- Six Scrap ---
  const scrapCount = tickets.scrap_ticket || 0;
  document.getElementById('sixScrapInputLabel').textContent = `♻️ ${Math.min(scrapCount, 6)}/6`;

  const sixScrapBtn = document.getElementById('sixScrapTradeBtn');
  sixScrapBtn.disabled = scrapCount < 6;
  sixScrapBtn.onclick = () => {
    handleTrade(
      { quiz_ticket: 0, task_ticket: 0, journal_ticket: 0, recitation_ticket: 0, scrap_ticket: 6 },
      '6 Ember Shards'
    );
  };
}

// Spreads the 4-ticket cost across as many different types as
// possible before doubling up on any one type — matches the "rewards
// well-rounded participation" rationale from the source spec.
function pickAnyFourDeduction(tickets) {
  const remaining = {};
  TRADEABLE_TYPES.forEach((t) => { remaining[t] = tickets[t] || 0; });

  const deduction = { quiz_ticket: 0, task_ticket: 0, journal_ticket: 0, recitation_ticket: 0, scrap_ticket: 0 };
  let need = 4;

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
  const statusEl = document.getElementById('ticketTraderStatus');
  const tickets = { ...(modalStudentData.tickets || {}) };

  const shortfall = Object.entries(deduction).find(([type, amount]) => amount > 0 && (tickets[type] || 0) < amount);
  if (shortfall) {
    statusEl.textContent = "You don't have enough tickets for that trade.";
    return;
  }

  Object.entries(deduction).forEach(([type, amount]) => {
    tickets[type] = (tickets[type] || 0) - amount;
  });

  const unlockTokens = (modalStudentData.unlockTokens || 0) + 1;

  setTradeRowsBusy(true);
  let succeeded = false;

  try {
    await setDoc(doc(db, 'students', modalEmail), { tickets, unlockTokens }, { merge: true });
    modalStudentData.tickets = tickets;
    modalStudentData.unlockTokens = unlockTokens;
    succeeded = true;
  } catch (err) {
    console.error('Trade failed:', err);
  }

  setTradeRowsBusy(false);
  renderTraderModal();
  renderWallet(modalSidebarWallet, modalStudentData);

  statusEl.textContent = succeeded
    ? `✅ Traded for 1 Artifact Unlock Token! (${label})`
    : 'Something went wrong. Please try again.';
}

function setTradeRowsBusy(busy) {
  ['sameThreeTradeBtn', 'anyFourTradeBtn', 'sixScrapTradeBtn', 'sameThreeSelect'].forEach((id) => {
    document.getElementById(id).disabled = busy;
  });
}
