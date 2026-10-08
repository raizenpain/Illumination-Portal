// ============================================
// CHAT IMAGES — admin-only image posts in Class Chat.
//
// Firebase Storage needs the paid Blaze plan, so images live in
// Firestore instead: compressed to a small JPEG in the admin's browser,
// then saved as a data URL in its OWN doc (classChatImages/{id}), with
// the chat message itself only carrying `imageId` (same id). Keeping
// the bytes out of classChatMessages matters: every student's dashboard
// keeps a live listener on their room's last 50 messages just for the
// unread badge, so an image stored inline would be re-downloaded on
// every dashboard load whether or not the chat is ever opened. Here an
// image is only fetched (one read) once a viewer actually opens the
// chat, and then cached for the rest of the page's life.
//
// firestore.rules: only isAdmin() can create an image doc or a message
// with imageId; readers need the same class membership as the message.
// ============================================

import { db, doc, getDoc, deleteDoc } from '../core/firebase.js';

const IMAGE_MAX_DIM = 1280;
const IMAGE_TARGET_BYTES = 250 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not-an-image')); };
    img.src = url;
  });
}

/** Shrinks to IMAGE_MAX_DIM on the long side, then steps JPEG quality
 *  (and, if still too big, the dimensions) down until it fits
 *  IMAGE_TARGET_BYTES. Rejects with 'not-an-image' or 'too-big'. */
export async function compressImage(file) {
  const img = await loadImage(file);
  let scale = Math.min(1, IMAGE_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  for (let attempt = 0; attempt < 6; attempt++) {
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.82, 0.7, 0.6, 0.5]) {
      const dataUrl = canvas.toDataURL('image/jpeg', q);
      const bytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);
      if (bytes <= IMAGE_TARGET_BYTES) {
        return { dataUrl, bytes, width: canvas.width, height: canvas.height };
      }
    }
    scale *= 0.8;
  }
  throw new Error('too-big');
}

const cache = new Map(); // imageId -> Promise<dataUrl|null>

/** One read per image per page load; null if it's gone or unreadable. */
export function fetchChatImage(imageId) {
  if (!cache.has(imageId)) {
    cache.set(imageId, getDoc(doc(db, 'classChatImages', imageId))
      .then((snap) => (snap.exists() ? snap.data().data : null))
      .catch((err) => {
        console.error('Failed to load chat image:', err);
        cache.delete(imageId); // let a later open retry
        return null;
      }));
  }
  return cache.get(imageId);
}

/** Admin-only (rules enforce it). Deleting the message alone would
 *  leave the image doc orphaned in the free storage quota. */
export function deleteChatImage(imageId) {
  cache.delete(imageId);
  return deleteDoc(doc(db, 'classChatImages', imageId)).catch((err) => {
    console.error('Failed to delete chat image:', err);
  });
}

/** Builds the tappable image (or a placeholder until it loads) and
 *  returns the element; call loadInto() on it to fetch + show. */
export function createImageSlot(imageId, altText) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'msg-image-wrap loading';
  btn.dataset.imageId = imageId;
  btn.setAttribute('aria-label', 'View image full size');
  btn.textContent = '🖼️ Image';
  btn.dataset.alt = altText || 'Image from your teacher';
  return btn;
}

export function loadInto(slot, onShown) {
  if (slot.dataset.loaded) return;
  slot.dataset.loaded = '1';
  fetchChatImage(slot.dataset.imageId).then((dataUrl) => {
    if (!dataUrl) {
      slot.textContent = '🖼️ Image unavailable';
      delete slot.dataset.loaded;
      return;
    }
    const img = document.createElement('img');
    img.className = 'msg-image';
    img.src = dataUrl;
    img.alt = slot.dataset.alt;
    if (onShown) img.addEventListener('load', onShown, { once: true });
    slot.textContent = '';
    slot.classList.remove('loading');
    slot.appendChild(img);
    slot.addEventListener('click', () => openLightbox(dataUrl, slot.dataset.alt));
  });
}

export function openLightbox(src, altText) {
  const box = document.createElement('div');
  box.className = 'chat-lightbox';
  box.innerHTML = '<button type="button" class="chat-lightbox-close" aria-label="Close image">✕</button>';
  const img = document.createElement('img');
  img.src = src;
  img.alt = altText || 'Image from your teacher';
  box.appendChild(img);
  const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  box.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(box);
}
