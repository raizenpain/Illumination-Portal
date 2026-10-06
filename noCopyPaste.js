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

/** Makes a text box type-only. onBlocked() runs whenever something is refused. */
export function blockPasteInto(textarea, onBlocked) {
  if (!textarea || isAdminViewer()) return;
  textarea.dataset.noPaste = '1';
  textarea.setAttribute('autocomplete', 'off');

  const block = (event) => {
    event.preventDefault();
    onBlocked();
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
  installWatermark();

  const stop = (event) => event.preventDefault();
  document.addEventListener('copy', stop, true);
  document.addEventListener('cut', stop, true);
  document.addEventListener('dragstart', stop, true);
  document.addEventListener('contextmenu', (event) => {
    // An ordinary box (the class chat, a crossword square) keeps its menu.
    const el = event.target;
    const typingBox = el && el.closest && el.closest('input, textarea');
    if (typingBox && !typingBox.dataset.noPaste) return;
    event.preventDefault();
  }, true);
}

// 3. Screenshots cannot be blocked from a web page, so they are made
//    traceable instead: the student's own name and account, faintly
//    repeated across every page (above popups and games too, never in the
//    way of a tap). A printed page comes out blank.
function installWatermark() {
  let name = ''; let email = '';
  try {
    name = localStorage.getItem('studentName') || '';
    email = localStorage.getItem('studentEmail') || '';
  } catch (_) { /* storage blocked */ }
  const label = [name, email].filter(Boolean).join(' · ');
  if (!label) return;

  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const w = Math.max(320, Math.min(620, label.length * 9 + 80));
  // Light fill with a dark edge, so it shows on dark and light screens alike.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="210">`
    + `<text x="${w / 2}" y="112" text-anchor="middle" transform="rotate(-22 ${w / 2} 105)" `
    + `font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="600" `
    + `fill="rgba(255,255,255,0.09)" stroke="rgba(0,0,0,0.1)" stroke-width="0.5">${esc(label)}</text></svg>`;

  const mark = document.createElement('div');
  mark.id = 'accountWatermark';
  mark.setAttribute('aria-hidden', 'true');
  mark.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;'
    + `background-image:url("data:image/svg+xml,${encodeURIComponent(svg)}");background-repeat:repeat;`;
  const place = () => { if (document.body && !mark.isConnected) document.body.appendChild(mark); };
  if (document.body) place(); else document.addEventListener('DOMContentLoaded', place);
  // Put it back if it is removed from the page.
  setInterval(place, 3000);

  const print = document.createElement('style');
  print.id = 'noPrintStyles';
  print.textContent = '@media print { body { display: none !important; } }';
  document.head.appendChild(print);
}

installCopyGuard();
