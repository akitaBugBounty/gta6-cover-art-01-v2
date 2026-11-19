// Cover lettering: title, subtitle, badge and heat stars, all drawn on the
// canvas (never DOM overlays) so the exported PNG matches the preview.

const TITLE_FONT = 'Anton, "Arial Narrow", Impact, sans-serif';
const SCRIPT_FONT = 'Pacifico, cursive';
const BODY_FONT = 'system-ui, sans-serif';

// Shrink the font until the text fits maxWidth; never below minPx.
export function fitFont(ctx, text, startPx, maxWidth, minPx, family) {
  let px = startPx;
  ctx.font = `${px}px ${family}`;
  while (px > minPx && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${px}px ${family}`;
  }
  return px;
}

function strokeTextThick(ctx, text, x, y, px) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, px * 0.09);
  ctx.strokeStyle = 'rgba(0,0,0,0.92)';
  ctx.strokeText(text, x, y);
}

// Big display title: gradient white -> sunset yellow, thick black outline.
export function drawTitleLettering(ctx, text, band, H, accent, align = 'left') {
  const label = (text || 'NEON COAST').toUpperCase();
  const maxWidth = band.w * 0.92;
  const startPx = Math.max(28, H * 0.13);
  const px = fitFont(ctx, label, startPx, maxWidth, 22, TITLE_FONT);
  const grad = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, accent);
  ctx.save();
  ctx.font = `${px}px ${TITLE_FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = align === 'center' ? 'center' : 'left';
  const x = align === 'center' ? band.x + band.w / 2 : band.x + band.w * 0.04;
  const y = band.y + band.h * 0.52;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = px * 0.12;
  ctx.shadowOffsetY = px * 0.04;
  strokeTextThick(ctx, label, x, y, px);
  ctx.fillStyle = grad;
  ctx.fillText(label, x, y);
  ctx.restore();
  return px;
}

// Neon script subtitle under the title, tilted -2 degrees.
export function drawSubtitleLettering(ctx, text, band, H, color) {
  const label = text || 'vice city nights';
  const maxWidth = band.w * 0.86;
  const startPx = Math.max(16, H * 0.045);
  const px = fitFont(ctx, label, startPx, maxWidth, 13, SCRIPT_FONT);
  ctx.save();
  ctx.translate(band.x + band.w * 0.05, band.y + band.h * 0.80);
  ctx.rotate((-2 * Math.PI) / 180);
  ctx.font = `${px}px ${SCRIPT_FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.shadowColor = color;
  ctx.shadowBlur = px * 0.55;
  ctx.fillStyle = color;
  ctx.fillText(label, 0, 0);
  ctx.restore();
  return px;
}

// Small solid ribbon badge in the top-right corner, tilted -4 degrees.
export function drawBadgeRibbon(ctx, text, W, H, color = '#ff2e88') {
  const label = (text || '').toUpperCase();
  if (!label) return;
  const px = Math.max(11, Math.round(H * 0.018));
  ctx.save();
  ctx.font = `700 ${px}px ${BODY_FONT}`;
  const tw = ctx.measureText(label).width;
  const padX = px * 0.9;
  const padY = px * 0.55;
  const bw = tw + padX * 2;
  const bh = px + padY * 2;
  ctx.translate(W - bw - W * 0.02, H * 0.03);
  ctx.rotate((-4 * Math.PI) / 180);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(label, padX, bh / 2 + 1);
  ctx.restore();
}

// Heat meter: filled stars, drawn as text glyphs.
export function drawHeatStars(ctx, count, band, H) {
  const n = Math.max(0, Math.min(5, count | 0));
  if (n === 0) return;
  const px = Math.max(14, Math.round(H * 0.028));
  ctx.save();
  ctx.font = `${px}px ${BODY_FONT}`;
  ctx.fillStyle = '#ffd166';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  const stars = '★'.repeat(n) + '☆'.repeat(5 - n);
  ctx.fillText(stars, band.x + band.w * 0.97, band.y + band.h * 0.24);
  ctx.restore();
}

// Small credit line under the subtitle.
export function drawCreditLine(ctx, text, band, H) {
  if (!text) return;
  const px = Math.max(11, Math.round(H * 0.02));
  ctx.save();
  ctx.font = `600 ${px}px ${BODY_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  // 0.93 keeps the line inside the band; 0.97 clipped descenders at the edge.
  ctx.fillText(text, band.x + band.w * 0.05, band.y + band.h * 0.93);
  ctx.restore();
}

// Editor-only panel number tag (preview, never exports): a small chip in
// the panel's top-left corner so the panel list and the preview agree.
export function drawPanelNumber(ctx, index, x, y) {
  const label = String(index + 1);
  const px = 13;
  ctx.save();
  ctx.font = `700 ${px}px ${BODY_FONT}`;
  const tw = ctx.measureText(label).width;
  const pad = 6;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 6, tw + pad * 2, px + pad, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 6 + pad, y + 6 + (px + pad) / 2 + 1);
  ctx.restore();
}
