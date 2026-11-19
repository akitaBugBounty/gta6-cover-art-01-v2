// Neon Coast Cover Lab — UI wiring. Owns the app state, all control events,
// the live preview, PNG export and the ?shot= scenes for screenshots.

import { TEMPLATES, layoutFor, ensurePanels } from './layouts.js';
import { GRADES, gradeById, gradeCss } from './grades.js';
import { renderCover } from './render.js';
import {
  loadPhotoFiles,
  emptyPanel,
  hitTestPanel,
  useOnePhotoEverywhere,
  diversifyPanelCrops,
  swapPanelPhotos,
} from './photos.js';
import { runShot } from './shots.js';

export const EXPORT_SIZES = {
  square: { label: 'Square 1080×1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080×1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920×1080', w: 1920, h: 1080 },
};

const state = {
  photos: [],
  panels: [emptyPanel(0), emptyPanel(1), emptyPanel(1), emptyPanel(1)],
  selectedPanel: 0,
  template: 'vice-grid',
  grade: 'sunset',
  title: 'NEON COAST',
  subtitle: 'vice city nights',
  badge: 'EST. 2026 • VICE CITY',
  stars: 5,
  align: 'left',
  credit: 'starring you',
  exportSize: 'wide',
  shotMode: false,
  showPanelNumbers: false,
};

const $ = (id) => document.getElementById(id);
const previewCanvas = $('previewCanvas');

let previewRaf = 0;
export function requestPreview() {
  // Shot scenes render once at full export size; a preview redraw would
  // shrink the canvas back to preview size, so it stays off in shot mode.
  if (state.shotMode) return;
  if (previewRaf) return;
  previewRaf = requestAnimationFrame(() => {
    previewRaf = 0;
    drawPreview();
  });
}

export function drawPreview() {
  const size = EXPORT_SIZES[state.exportSize];
  const scale = Math.min(1, 860 / size.w);
  state.showPanelNumbers = true;
  renderCover(previewCanvas, state, Math.round(size.w * scale), Math.round(size.h * scale));
  $('sizeLabel').textContent = size.label;
}

export function setStatus(msg, isError = false) {
  const el = $('statusLine');
  el.textContent = msg;
  el.classList.toggle('error', isError);
  $('headerStatus').textContent = msg;
}

function syncPanelControls() {
  const slot = state.panels[state.selectedPanel] || emptyPanel(0);
  $('zoomRange').value = String(slot.zoom);
  $('zoomValue').textContent = `${slot.zoom.toFixed(2)}×`;
  document.querySelectorAll('.panel-row').forEach((row, i) => {
    row.classList.toggle('active', i === state.selectedPanel);
  });
  document.querySelectorAll('.photo-thumb').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === slot.photoIndex);
  });
}

function renderPhotoList() {
  const list = $('photoList');
  list.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'photo-thumb';
    btn.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    btn.appendChild(img);
    const remove = document.createElement('span');
    remove.className = 'remove';
    remove.textContent = '×';
    remove.title = 'Remove photo';
    remove.addEventListener('click', (ev) => {
      ev.stopPropagation();
      removePhoto(i);
    });
    btn.appendChild(remove);
    btn.addEventListener('click', () => {
      state.panels[state.selectedPanel].photoIndex = i;
      syncPanelControls();
      requestPreview();
    });
    list.appendChild(btn);
  });
  syncPanelControls();
}

function renderPanelList() {
  const list = $('panelList');
  list.innerHTML = '';
  ensurePanels(state, state.template, emptyPanel);
  const count = layoutFor(state.template, 100, 100).panels.length;
  const names = ['Hero', 'Panel 2', 'Panel 3', 'Panel 4', 'Panel 5', 'Panel 6', 'Panel 7', 'Panel 8'];
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'panel-row';
    row.tabIndex = 0;
    const slot = state.panels[i] || emptyPanel(0);
    const photoName = state.photos[slot.photoIndex]?.name || 'no photo';
    row.innerHTML = `<span>${names[i] || 'Panel ' + (i + 1)}</span><span class="panel-photo">${photoName}</span>`;
    row.addEventListener('click', () => {
      state.selectedPanel = i;
      syncPanelControls();
      requestPreview();
    });
    list.appendChild(row);
  }
  syncPanelControls();
}

function renderTemplatePicker() {
  const picker = $('templatePicker');
  picker.innerHTML = '';
  TEMPLATES.forEach((t) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'template-thumb' + (t.id === state.template ? ' active' : '');
    btn.title = t.name;
    const mini = document.createElement('canvas');
    mini.width = 96;
    mini.height = 56;
    drawTemplateThumb(mini, t.id);
    const label = document.createElement('span');
    label.textContent = t.name;
    btn.appendChild(mini);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      state.template = t.id;
      state.selectedPanel = 0;
      ensurePanels(state, state.template, emptyPanel);
      renderTemplatePicker();
      renderPanelList();
      requestPreview();
      setStatus(`Template: ${t.name}.`);
    });
    picker.appendChild(btn);
  });
}

function drawTemplateThumb(canvas, templateId) {
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 56);
  g.addColorStop(0, '#2b1055');
  g.addColorStop(1, '#ff2e88');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 56);
  const layout = layoutFor(templateId, 96, 56);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  layout.panels.forEach((p) => {
    ctx.fillRect(p.x * 96 + 1, p.y * 56 + 1, p.w * 96 - 2, p.h * 56 - 2);
  });
}

function renderGradePicker() {
  const picker = $('gradePicker');
  picker.innerHTML = '';
  GRADES.forEach((g) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-swatch' + (g.id === state.grade ? ' active' : '');
    btn.title = g.name;
    const dot = document.createElement('span');
    dot.className = 'grade-dot';
    dot.style.background = gradeCss(g);
    const label = document.createElement('span');
    label.textContent = g.name;
    btn.appendChild(dot);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      state.grade = g.id;
      renderGradePicker();
      requestPreview();
      setStatus(`Grade: ${g.name}.`);
    });
    picker.appendChild(btn);
  });
}

async function addFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  try {
    const loaded = await loadPhotoFiles(files);
    const firstNew = state.photos.length;
    state.photos.push(...loaded);
    if (state.photos.length === loaded.length) {
      // First photos ever: spread them across the panels.
      state.panels = state.panels.map((slot, i) => ({
        ...slot,
        photoIndex: Math.min(i, state.photos.length - 1),
      }));
    }
    renderPhotoList();
    renderPanelList();
    requestPreview();
    setStatus(`${loaded.length} photo${loaded.length > 1 ? 's' : ''} added.`);
    return firstNew;
  } catch (err) {
    setStatus(err.message || 'That file is not an image — try a JPG or PNG.', true);
    return -1;
  }
}

function removePhoto(index) {
  state.photos.splice(index, 1);
  state.panels.forEach((slot) => {
    if (slot.photoIndex === index) slot.photoIndex = 0;
    else if (slot.photoIndex > index) slot.photoIndex -= 1;
  });
  renderPhotoList();
  renderPanelList();
  requestPreview();
  setStatus('Photo removed.');
}

async function loadSamples() {
  try {
    const [boulevard, pier] = await Promise.all([
      fetch('./samples/boulevard.jpg').then((r) => r.blob()),
      fetch('./samples/pier.jpg').then((r) => r.blob()),
    ]);
    const files = [
      new File([boulevard], 'boulevard.jpg', { type: 'image/jpeg' }),
      new File([pier], 'pier.jpg', { type: 'image/jpeg' }),
    ];
    await addFiles(files);
  } catch (err) {
    setStatus('Sample photos could not be loaded.', true);
  }
}

export async function exportCover(sizeId) {
  const size = EXPORT_SIZES[sizeId];
  if (!size) return;
  const off = document.createElement('canvas');
  // Exports never carry the editor's panel numbers.
  state.showPanelNumbers = false;
  renderCover(off, state, size.w, size.h);
  state.showPanelNumbers = true;
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  if (!blob) {
    setStatus('Export failed — try another size.', true);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neon-coast-${size.w}x${size.h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setStatus(`Saved ${a.download}.`);
}

async function exportAll() {
  for (const id of Object.keys(EXPORT_SIZES)) {
    await exportCover(id);
    await new Promise((r) => setTimeout(r, 350));
  }
}

function wireControls() {
  $('addPhotosBtn').addEventListener('click', () => $('photoInput').click());
  $('photoInput').addEventListener('change', (ev) => {
    addFiles(ev.target.files);
    ev.target.value = '';
  });
  $('loadSamplesBtn').addEventListener('click', loadSamples);
  $('useOnePhotoBtn').addEventListener('click', () => {
    if (!state.photos.length) {
      setStatus('Add a photo first.', true);
      return;
    }
    const slot = state.panels[state.selectedPanel];
    useOnePhotoEverywhere(state, slot.photoIndex);
    renderPanelList();
    requestPreview();
    setStatus('One photo across every panel.');
  });
  $('zoomRange').addEventListener('input', (ev) => {
    state.panels[state.selectedPanel].zoom = parseFloat(ev.target.value);
    $('zoomValue').textContent = `${state.panels[state.selectedPanel].zoom.toFixed(2)}×`;
    requestPreview();
  });
  $('fitBtn').addEventListener('click', () => {
    state.panels[state.selectedPanel].mode = 'fit';
    requestPreview();
    setStatus('Panel set to Fit.');
  });
  $('fillBtn').addEventListener('click', () => {
    state.panels[state.selectedPanel].mode = 'fill';
    requestPreview();
    setStatus('Panel set to Fill.');
  });
  $('resetPanelBtn').addEventListener('click', () => {
    const slot = state.panels[state.selectedPanel];
    state.panels[state.selectedPanel] = emptyPanel(slot.photoIndex);
    syncPanelControls();
    requestPreview();
    setStatus('Panel reset.');
  });
  $('swapBtn').addEventListener('click', () => {
    const count = layoutFor(state.template, 100, 100).panels.length;
    const next = (state.selectedPanel + 1) % count;
    swapPanelPhotos(state, state.selectedPanel, next);
    renderPanelList();
    requestPreview();
    setStatus('Panels swapped.');
  });
  $('titleInput').addEventListener('input', (ev) => {
    state.title = ev.target.value;
    requestPreview();
  });
  $('subtitleInput').addEventListener('input', (ev) => {
    state.subtitle = ev.target.value;
    requestPreview();
  });
  $('badgeInput').addEventListener('input', (ev) => {
    state.badge = ev.target.value;
    requestPreview();
  });
  $('starsRange').addEventListener('input', (ev) => {
    state.stars = parseInt(ev.target.value, 10);
    $('starsValue').textContent = String(state.stars);
    requestPreview();
  });
  $('alignBtn').addEventListener('click', (ev) => {
    state.align = state.align === 'left' ? 'center' : 'left';
    ev.target.textContent = `Title align: ${state.align}`;
    requestPreview();
  });
  $('exportSquareBtn').addEventListener('click', () => exportCover('square'));
  $('exportPortraitBtn').addEventListener('click', () => exportCover('portrait'));
  $('exportWideBtn').addEventListener('click', () => exportCover('wide'));
  $('exportAllBtn').addEventListener('click', exportAll);
  $('fitPreviewBtn').addEventListener('click', drawPreview);

  // Preview pointer: click selects a panel, drag moves its photo, wheel zooms.
  let drag = null;
  previewCanvas.addEventListener('pointerdown', (ev) => {
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const px = (ev.clientX - rect.left) * scaleX;
    const py = (ev.clientY - rect.top) * scaleX;
    const hit = hitTestPanel(state, px, py, previewCanvas.width, previewCanvas.height);
    if (hit < 0) return;
    state.selectedPanel = hit;
    syncPanelControls();
    drag = { x: px, y: py, ox: state.panels[hit].offsetX, oy: state.panels[hit].offsetY };
    previewCanvas.setPointerCapture(ev.pointerId);
  });
  previewCanvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const px = (ev.clientX - rect.left) * scaleX;
    const py = (ev.clientY - rect.top) * scaleX;
    const slot = state.panels[state.selectedPanel];
    slot.offsetX = drag.ox + (px - drag.x) / previewCanvas.width;
    slot.offsetY = drag.oy + (py - drag.y) / previewCanvas.height;
    requestPreview();
  });
  previewCanvas.addEventListener('pointerup', () => {
    drag = null;
  });
  previewCanvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const slot = state.panels[state.selectedPanel];
    const next = slot.zoom * (ev.deltaY < 0 ? 1.1 : 0.9);
    slot.zoom = Math.max(0.5, Math.min(3, next));
    $('zoomRange').value = String(slot.zoom);
    $('zoomValue').textContent = `${slot.zoom.toFixed(2)}×`;
    requestPreview();
  }, { passive: false });

  // Drag-and-drop files onto the preview.
  const wrap = document.querySelector('.preview-wrap');
  ['dragenter', 'dragover'].forEach((name) => {
    wrap.addEventListener(name, (ev) => {
      ev.preventDefault();
      wrap.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach((name) => {
    wrap.addEventListener(name, (ev) => {
      ev.preventDefault();
      wrap.classList.remove('drag-over');
    });
  });
  wrap.addEventListener('drop', (ev) => addFiles(ev.dataTransfer.files));
}

async function waitForFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('16px Anton'),
        document.fonts.load('16px Pacifico'),
        document.fonts.ready,
      ]),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch (e) {
    // Fallback fonts keep the render working.
  }
}

async function boot() {
  const params = new URLSearchParams(location.search);
  wireControls();
  renderTemplatePicker();
  renderGradePicker();
  renderPanelList();
  await waitForFonts();
  if (params.has('shot')) {
    state.shotMode = true;
    await runShot(params, state, { loadSamples, requestPreview, setStatus });
    return;
  }
  drawPreview();
  await loadSamples();
  diversifyPanelCrops(state);
  drawPreview();
  setStatus('Sample photos loaded — pick a template and export.');
}

boot();
