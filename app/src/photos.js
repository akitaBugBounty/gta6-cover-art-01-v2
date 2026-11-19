// Photo handling: load images (downscaled to a 2400px longest side), keep
// per-panel crop state (photo, zoom, offset, fit/fill), and draw a photo
// inside a panel rect. No photo is ever uploaded anywhere.

import { layoutFor, panelPixels } from './layouts.js';

export const MAX_SIDE = 2400;

export function emptyPanel(photoIndex = 0) {
  return { photoIndex, zoom: 1, offsetX: 0, offsetY: 0, mode: 'fill' };
}

// Load File objects into { img, name, w, h }. Large photos are downscaled
// once on an offscreen canvas so exports stay fast and memory stays small.
export async function loadPhotoFiles(files) {
  const out = [];
  for (const file of files) {
    if (!file.type || !file.type.startsWith('image/')) {
      throw new Error(`"${file.name}" is not an image — try a JPG or PNG.`);
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      out.push(await downscalePhoto(img, file.name));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return out;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image file.'));
    img.src = src;
  });
}

async function downscalePhoto(img, name) {
  // Always return a data-URL-backed image: the blob URL used to load the
  // file is revoked right after, so the photo must not keep pointing at it
  // (revoked blob URLs break thumbnails and re-renders).
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  off.getContext('2d').drawImage(img, 0, 0, w, h);
  const flat = new Image();
  flat.src = off.toDataURL('image/jpeg', 0.92);
  try {
    await flat.decode();
  } catch (e) {
    // decode() is a hint; the image still draws once loaded.
  }
  return { img: flat, name, w, h };
}

// Draw one photo into a panel rect using the panel's crop state.
// offsetX/offsetY are fractions of the panel (0 = centred); zoom multiplies
// the cover scale. Offsets are clamped so the photo never leaves the panel.
export function drawPhotoInPanel(ctx, photo, slot, x, y, w, h) {
  const iw = photo.w;
  const ih = photo.h;
  let scale;
  if (slot.mode === 'fit') {
    scale = Math.min(w / iw, h / ih) * slot.zoom;
  } else {
    scale = Math.max(w / iw, h / ih) * slot.zoom;
  }
  const dw = iw * scale;
  const dh = ih * scale;
  // Clamp the centre offset so no gap opens at the panel edge (fill mode).
  let ox = slot.offsetX || 0;
  let oy = slot.offsetY || 0;
  if (slot.mode === 'fill') {
    const maxOx = Math.max(0, (dw - w) / 2 / w);
    const maxOy = Math.max(0, (dh - h) / 2 / h);
    ox = Math.max(-maxOx, Math.min(maxOx, ox));
    oy = Math.max(-maxOy, Math.min(maxOy, oy));
  }
  const dx = x + (w - dw) / 2 + ox * w;
  const dy = y + (h - dh) / 2 + oy * h;
  try {
    ctx.filter = 'saturate(1.15) contrast(1.08)';
  } catch (e) {
    // Older canvas: draw unfiltered, the grade still applies.
  }
  ctx.drawImage(photo.img, dx, dy, dw, dh);
  try {
    ctx.filter = 'none';
  } catch (e) {
    /* noop */
  }
}

// Which panel (index) contains point (px, py) on a W x H canvas?
export function hitTestPanel(state, px, py, W, H) {
  const layout = layoutFor(state.template, W, H);
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = panelPixels(layout.panels[i], W, H);
    if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return i;
  }
  return -1;
}

// Fill every panel from one photo, with a different crop per panel so a
// single photo still looks like a multi-photo cover.
export function useOnePhotoEverywhere(state, photoIndex) {
  const crops = [
    { zoom: 1.0, offsetX: 0, offsetY: 0 },
    { zoom: 1.5, offsetX: -0.18, offsetY: -0.08 },
    { zoom: 1.5, offsetX: 0.18, offsetY: 0.10 },
    { zoom: 2.0, offsetX: 0, offsetY: -0.15 },
  ];
  state.panels = state.panels.map((slot, i) => ({
    ...emptyPanel(photoIndex),
    zoom: crops[i % crops.length].zoom,
    offsetX: crops[i % crops.length].offsetX,
    offsetY: crops[i % crops.length].offsetY,
    mode: slot.mode || 'fill',
  }));
}

// Swap the photos (with their crops) of two panels.
export function swapPanelPhotos(state, a, b) {
  if (a === b) return;
  const tmp = state.panels[a];
  state.panels[a] = state.panels[b];
  state.panels[b] = tmp;
}

// When several panels share one photo (the sample default: three panels
// on the pier photo), give each a different crop so the cover does not
// repeat the same rectangle three times. Panels with their own photo keep
// the crop the user set.
export function diversifyPanelCrops(state) {
  const crops = [
    { zoom: 1.0, offsetX: 0, offsetY: 0 },
    { zoom: 1.5, offsetX: -0.18, offsetY: -0.08 },
    { zoom: 1.5, offsetX: 0.18, offsetY: 0.10 },
    { zoom: 2.0, offsetX: 0, offsetY: -0.15 },
  ];
  const seen = new Map();
  state.panels.forEach((slot) => {
    const n = seen.get(slot.photoIndex) || 0;
    seen.set(slot.photoIndex, n + 1);
    if (n === 0) return;
    const crop = crops[n % crops.length];
    slot.zoom = crop.zoom;
    slot.offsetX = crop.offsetX;
    slot.offsetY = crop.offsetY;
  });
}
