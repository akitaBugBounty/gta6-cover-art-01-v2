// Screenshot scenes (?shot=...): load the samples, apply a fixed state
// from the query string, render, then flag window.__shotReady after two
// animation frames so the screenshot runner knows the cover is painted.

import { renderCover } from './render.js';
import { diversifyPanelCrops, emptyPanel } from './photos.js';
import { ensurePanels } from './layouts.js';

const SHOT_SIZES = {
  square: { label: 'Square 1080×1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080×1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920×1080', w: 1920, h: 1080 },
};

function waitFrames(n) {
  return new Promise((resolve) => {
    const step = (left) => {
      if (left <= 1) resolve();
      else requestAnimationFrame(() => step(left - 1));
    };
    requestAnimationFrame(() => step(n));
  });
}

function applyShotParams(params, state) {
  const template = params.get('template');
  if (template) state.template = template;
  const grade = params.get('grade');
  if (grade) state.grade = grade;
  const title = params.get('title');
  if (title) state.title = title;
  const subtitle = params.get('subtitle');
  if (subtitle) state.subtitle = subtitle;
  const badge = params.get('badge');
  if (badge !== null) state.badge = badge;
  const stars = params.get('stars');
  if (stars !== null) state.stars = parseInt(stars, 10) || 0;
  const size = params.get('size');
  if (size && SHOT_SIZES[size]) state.exportSize = size;
}

export async function runShot(params, state, helpers) {
  const shot = params.get('shot') || 'cover';
  document.body.classList.toggle('shot-cover', shot === 'cover');
  applyShotParams(params, state);
  await helpers.loadSamples();
  // Size the panel slots to this template (shot mode never renders the
  // editor's panel list, which normally does this).
  ensurePanels(state, state.template, emptyPanel);
  // Re-apply the query state after the samples land (loadSamples resets
  // nothing, but the panel photos must point at the fresh samples).
  state.panels.forEach((slot, i) => {
    slot.photoIndex = Math.min(i, state.photos.length - 1);
  });
  // ?photo=N puts sample N in the hero panel (0 = boulevard, 1 = pier).
  const photo = params.get('photo');
  if (photo !== null) {
    const idx = parseInt(photo, 10);
    if (!Number.isNaN(idx) && state.photos.length) {
      state.panels[0].photoIndex = Math.max(0, Math.min(state.photos.length - 1, idx));
    }
  }
  diversifyPanelCrops(state);
  const size = SHOT_SIZES[state.exportSize] || SHOT_SIZES.wide;
  const canvas = document.getElementById('previewCanvas');
  // Shots are exports, never the editor: no panel numbers.
  state.showPanelNumbers = false;
  renderCover(canvas, state, size.w, size.h);
  helpers.setStatus(`Shot "${shot}" ready.`);
  await waitFrames(2);
  window.__shotReady = true;
}
