// ============================================
// NO COPY / NO PASTE (Jornie, 2026-10-06)
//
// Two guards, for students only (ADMIN_EMAILS — the teachers — are left
// alone):
//
// 1. blockPasteInto(textarea, onBlocked): for the boxes where a student
//    must write in their own words (reflections, journals, recitations,
//    tasks). Stops paste, drag-and-drop and the right-click menu, and
//    also undoes any single edit that adds a big chunk of text at once.
//    That last check is what catches phone keyboards, whose clipboard
//    button can insert text without ever firing a "paste".
//
// 2. A page-wide copy guard, switched on just by loading this file from a
//    page: no copying, cutting, selecting or dragging the portal's text,
//    and no long-press / right-click menu. Typing in any box still works.
//
// Every refused copy or paste also slides a short reminder down from the
// top of the screen, so the student knows why nothing happened.
//
// None of this can stop a screenshot or retyping by hand; it only removes
// the easy copy and paste on laptops and phones.
// ============================================

import { ADMIN_EMAILS } from './admins.js';

const MAX_JUMP = 40; // most characters one edit may add (a swiped word or two is fine)
const PASTE_TYPES = ['insertFromPaste', 'insertFromPasteAsQuotation', 'insertFromDrop', 'insertFromYank'];

function isAdminViewer() {
  try {
    return ADMIN_EMAILS.includes(localStorage.getItem('studentEmail'));
  } catch (_) {
    return false;
  }
}

// ---------- the reminder shown whenever a copy or a paste is refused
const REMINDERS = {
  copy: { icon: '🚫', title: 'Copying is not allowed', text: 'The questions and lessons are for you to read here, not to copy.' },
  paste: { icon: '✍️', title: 'Pasting is not allowed', text: 'Please type your answer yourself, in your own words.' }
};
let reminderTimer = 0;
let lastReminder = { kind: '', at: 0 };

function remind(kind) {
  if (!document.body) return;
  const now = Date.now();
  if (lastReminder.kind === kind && now - lastReminder.at < 1200) return; // one press often fires two events
  lastReminder = { kind, at: now };

  if (!document.getElementById('noCopyReminderStyles')) {
    const style = document.createElement('style');
    style.id = 'noCopyReminderStyles';
    style.textContent = `
      #noCopyReminder {
        position: fixed; left: 50%; top: 14px; z-index: 2147483000; transform: translate(-50%, -140%);
        display: flex; align-items: center; gap: 12px; box-sizing: border-box;
        width: max-content; max-width: calc(100vw - 24px); padding: 12px 16px;
        font-family: 'Segoe UI', system-ui, sans-serif; color: #E8DCC4; text-align: left;
        background: linear-gradient(170deg, #241812 0%, #120C09 100%);
        border: 1px solid #C9923A; border-radius: 8px;
        box-shadow: 0 0 0 1px #000, 0 14px 40px rgba(0,0,0,.7), 0 0 30px rgba(226,81,42,.25);
        opacity: 0; pointer-events: none; transition: transform .28s cubic-bezier(.2,.9,.3,1.1), opacity .2s ease;
      }
      #noCopyReminder.show { transform: translate(-50%, 0); opacity: 1; }
      #noCopyReminder .ncr-icon { font-size: 24px; line-height: 1; }
      #noCopyReminder strong { display: block; font-size: 14px; letter-spacing: .3px; color: #FFE2A8; }
      #noCopyReminder span { display: block; margin-top: 2px; font-size: 12.5px; line-height: 1.4; color: #D6C8AE; }
      @media (prefers-reduced-motion: reduce) { #noCopyReminder { transition: opacity .2s ease; } }
    `;
    document.head.appendChild(style);
  }
  let box = document.getElementById('noCopyReminder');
  if (!box) {
    box = document.createElement('div');
    box.id = 'noCopyReminder';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<div class="ncr-icon"></div><div><strong></strong><span></span></div>';
    document.body.appendChild(box);
  }
  const info = REMINDERS[kind] || REMINDERS.copy;
  box.querySelector('.ncr-icon').textContent = info.icon;
  box.querySelector('strong').textContent = info.title;
  box.querySelector('span').textContent = info.text;
  box.getBoundingClientRect(); // so the slide-in runs even on first use
  box.classList.add('show');
  clearTimeout(reminderTimer);
  reminderTimer = setTimeout(() => box.classList.remove('show'), 3200);
}

// Things that are pressed and held as part of normal use (game controls,
// buttons, links): a long press on these is not an attempt to copy.
const isControl = (el) => !!(el && el.closest && el.closest('button, canvas, a, select, label, summary, input, textarea, [role="button"], [draggable="true"]'));

/** Makes a text box type-only. onBlocked() runs whenever something is refused. */
export function blockPasteInto(textarea, onBlocked) {
  if (!textarea || isAdminViewer()) return;
  textarea.dataset.noPaste = '1';
  textarea.setAttribute('autocomplete', 'off');

  const block = (event) => {
    event.preventDefault();
    onBlocked();
    remind('paste');
  };
  textarea.addEventListener('paste', block);
  textarea.addEventListener('drop', block);
  textarea.addEventListener('contextmenu', (event) => event.preventDefault());

  // The text as it was just before each edit (also right after the page
  // fills the box itself, e.g. a saved reflection).
  let before = textarea.value;
  const snapshot = () => { before = textarea.value; };
  ['focus', 'keydown', 'compositionstart'].forEach((type) => textarea.addEventListener(type, snapshot));
  textarea.addEventListener('beforeinput', (event) => {
    if (PASTE_TYPES.includes(event.inputType)) { block(event); return; }
    snapshot();
  });
  textarea.addEventListener('input', () => {
    if (textarea.value.length - before.length > MAX_JUMP) {
      textarea.value = before;
      onBlocked();
      remind('paste');
    } else {
      snapshot();
    }
  });
}

function installCopyGuard() {
  if (isAdminViewer()) return;
  const style = document.createElement('style');
  style.id = 'noCopyStyles';
  style.textContent = `
    body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    input, textarea, [contenteditable="true"] { -webkit-user-select: text; user-select: text; }
  `;
  document.head.appendChild(style);
  installPrintGuard();

  const stopCopy = (event) => { event.preventDefault(); remind('copy'); };
  document.addEventListener('copy', stopCopy, true);
  document.addEventListener('cut', stopCopy, true);
  document.addEventListener('dragstart', (event) => {
    event.preventDefault();
    if (!isControl(event.target)) remind('copy');
  }, true);
  document.addEventListener('contextmenu', (event) => {
    // An ordinary box (the class chat, a crossword square) keeps its menu.
    const el = event.target;
    const typingBox = el && el.closest && el.closest('input, textarea');
    if (typingBox && !typingBox.dataset.noPaste) return;
    event.preventDefault();
    if (typingBox) remind('paste');          // right-click / long-press inside an answer box
    else if (!isControl(el)) remind('copy'); // right-click / long-press on the page's text
  }, true);

  // Phones: a long press on text is how copying starts. Some phones send
  // no menu event for it, so it is timed here as well.
  let holdTimer = 0;
  const cancelHold = () => { clearTimeout(holdTimer); holdTimer = 0; };
  document.addEventListener('touchstart', (event) => {
    cancelHold();
    if (event.touches.length !== 1 || isControl(event.target)) return;
    holdTimer = setTimeout(() => remind('copy'), 600);
  }, { capture: true, passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach((type) => document.addEventListener(type, cancelHold, { capture: true, passive: true }));
}

// 3. A printed page (or "Save as PDF") comes out blank.
function installPrintGuard() {
  const print = document.createElement('style');
  print.id = 'noPrintStyles';
  print.textContent = '@media print { body { display: none !important; } }';
  document.head.appendChild(print);
}

installCopyGuard();
