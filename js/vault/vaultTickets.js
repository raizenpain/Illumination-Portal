// ============================================
// VAULT TICKETS — shared ticket metadata for every Vault Game (Sanctuarium)
// reward. Ticket vocabulary matches the rest of the portal (see
// ticketTrader.js) so a student sees one consistent name for each ticket
// everywhere. `ticket` is the real Firestore field under
// students/{email}.tickets.*
//
// Extracted out of scriptoriumContent.js once a second game (Loaves and
// Fishes) needed the same table, rather than copy-pasting it a second time.
// ============================================

export const TICKETS = {
  sigil: { name: "Sigil of Insight", ticket: "quiz_ticket" },
  seal: { name: "Seal of Diligence", ticket: "task_ticket" },
  scroll: { name: "Scroll of Reflection", ticket: "journal_ticket" },
  herald: { name: "Herald's Voice", ticket: "recitation_ticket" },
  shard: { name: "Ember Shard", ticket: "scrap_ticket" },
};
