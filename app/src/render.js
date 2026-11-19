// The one render function: preview and export call exactly this, so what
// you see is what the PNG holds. Draws backdrop -> panels (photo + grade +
// frame) -> title band -> lettering -> grain.

import { layoutFor, panelPixels } from './layouts.js';
import { applyGrade, gradeById, paintBackdrop, paintGrain } from './grades.js';
import {
  drawTitleLettering,
  drawSubtitleLettering,
  drawBadgeRibbon,
  drawHeatStars,
  drawCreditLine,
  drawPanelNumber,
} from './lettering.js';
import { drawPhotoInPanel } from './photos.js';

export function renderCover(canvas, state, W, H) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = gradeById(state.grade);
  const layout = layoutFor(state.template, W, H);

  paintBackdrop(ctx, W, H);

  // Panels: photo, grade, then a thick white comic frame.
  layout.panels.forEach((panel, i) => {
    const slot = state.panels[i] || { photoIndex: 0, zoom: 1, offsetX: 0, offsetY: 0, mode: 'fill' };
    const p = panelPixels(panel, W, H);
    ctx.save();
    ctx.translate(p.cx, p.cy);
    if (p.angle) ctx.rotate((p.angle * Math.PI) / 180);
    ctx.translate(-p.cx, -p.cy);
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    const photo = state.photos[slot.photoIndex];
    if (photo) {
      drawPhotoInPanel(ctx, photo, slot, p.x, p.y, p.w, p.h);
    } else {
      // Empty panel: dark placeholder with a hint, never a white hole.
      const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      g.addColorStop(0, '#241b3d');
      g.addColorStop(1, '#120e1f');
      ctx.fillStyle = g;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `600 ${Math.max(12, Math.round(H * 0.02))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add a photo', p.x + p.w / 2, p.y + p.h / 2);
    }
    applyGrade(ctx, grade, p.x, p.y, p.w, p.h);
    ctx.restore();
    drawPanelFrame(ctx, p);
    // Editor preview only: number each panel so the panel list matches.
    if (state.showPanelNumbers) drawPanelNumber(ctx, i, p.x, p.y);
  });

  // Title band: a dark sunset wash the lettering sits on.
  const band = {
    x: layout.band.x * W,
    y: layout.band.y * H,
    w: layout.band.w * W,
    h: layout.band.h * H,
    angle: layout.band.angle || 0,
  };
  if (layout.titleBlock) {
    // Nine-panel: the centre cell is a solid dark block.
    ctx.save();
    ctx.fillStyle = 'rgba(16,10,32,0.94)';
    ctx.fillRect(band.x, band.y, band.w, band.h);
    ctx.restore();
  } else {
    const wash = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
    wash.addColorStop(0, 'rgba(20,8,32,0)');
    wash.addColorStop(0.35, 'rgba(20,8,32,0.72)');
    wash.addColorStop(1, 'rgba(20,8,32,0.92)');
    ctx.fillStyle = wash;
    ctx.fillRect(band.x, band.y, band.w, band.h);
  }

  ctx.save();
  if (band.angle) {
    const cx = band.x + band.w / 2;
    const cy = band.y + band.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((band.angle * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  drawTitleLettering(ctx, state.title, band, H, grade.accent, state.align);
  drawSubtitleLettering(ctx, state.subtitle, band, H, grade.subtitle);
  drawHeatStars(ctx, state.stars, band, H);
  drawCreditLine(ctx, state.credit || '', band, H);
  ctx.restore();

  drawBadgeRibbon(ctx, state.badge, W, H);
  paintGrain(ctx, W, H);
  return canvas;
}

// Thick white frame with a thin black inner line — the poster-comic look.
function drawPanelFrame(ctx, p) {
  const frame = Math.max(3, Math.round(Math.min(p.w, p.h) * 0.012));
  ctx.save();
  ctx.translate(p.cx, p.cy);
  if (p.angle) ctx.rotate((p.angle * Math.PI) / 180);
  ctx.translate(-p.cx, -p.cy);
  ctx.lineWidth = frame;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(p.x + frame / 2, p.y + frame / 2, p.w - frame, p.h - frame);
  ctx.lineWidth = Math.max(1, frame * 0.18);
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeRect(p.x + frame * 1.4, p.y + frame * 1.4, p.w - frame * 2.8, p.h - frame * 2.8);
  ctx.restore();
}
