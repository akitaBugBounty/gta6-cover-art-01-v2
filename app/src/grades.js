// Vice City color grades. Each grade is a set of overlays painted over a photo
// with Canvas 2D (gradients + composite ops), never a CSS filter — so the
// exported PNG matches the live preview exactly.

export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    top: '#ff7a18',
    topAlpha: 0.16,
    bottom: '#c2187a',
    bottomAlpha: 0.42,
    washA: '#ff2e88',
    washB: '#22e6ff',
    accent: '#ffd166',
    subtitle: '#ff2e88',
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    top: '#7b2fff',
    topAlpha: 0.22,
    bottom: '#ff2e88',
    bottomAlpha: 0.45,
    washA: '#7b2fff',
    washB: '#22e6ff',
    accent: '#ff2e88',
    subtitle: '#22e6ff',
  },
  {
    id: 'vice-teal',
    name: 'Vice Teal',
    top: '#00e5c0',
    topAlpha: 0.15,
    bottom: '#0b3d91',
    bottomAlpha: 0.50,
    washA: '#00e5c0',
    washB: '#0b3d91',
    accent: '#22e6ff',
    subtitle: '#22e6ff',
  },
  {
    id: 'heat-haze',
    name: 'Heat Haze',
    top: '#ffc93c',
    topAlpha: 0.25,
    bottom: '#e63b2e',
    bottomAlpha: 0.45,
    washA: '#ffc93c',
    washB: '#e63b2e',
    accent: '#ff7a18',
    subtitle: '#ff7a18',
  },
  {
    id: 'mono-noir',
    name: 'Mono Noir',
    top: '#9aa0a6',
    topAlpha: 0.10,
    bottom: '#000000',
    bottomAlpha: 0.60,
    washA: '#ffffff',
    washB: '#000000',
    accent: '#ffffff',
    subtitle: '#ff2e88',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// CSS gradient for a grade's picker swatch dot.
export function gradeCss(grade) {
  return `linear-gradient(135deg, ${grade.top}, ${grade.bottom})`;
}

// Paint a grade over a panel rect. Assumes the caller already clipped to the
// panel (or passes the full rect) — overlays are confined to the rect.
export function applyGrade(ctx, grade, x, y, w, h) {
  // Vertical sunset wash: clear at the top, grade color at the bottom.
  const vertical = ctx.createLinearGradient(x, y, x, y + h);
  vertical.addColorStop(0, hexA(grade.top, 0));
  vertical.addColorStop(0.45, hexA(grade.top, grade.topAlpha * 0.6));
  vertical.addColorStop(1, hexA(grade.bottom, grade.bottomAlpha));
  ctx.fillStyle = vertical;
  ctx.fillRect(x, y, w, h);

  // Diagonal color wash, low opacity, soft-light when supported.
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const diagonal = ctx.createLinearGradient(x, y, x + w, y + h);
  diagonal.addColorStop(0, hexA(grade.washA, 0.55));
  diagonal.addColorStop(1, hexA(grade.washB, 0.55));
  ctx.fillStyle = diagonal;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // Vignette: darkened edges keep the eye on the centre.
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = Math.max(w, h) * 0.72;
  const vig = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
}

// Full-canvas sunset backdrop, used behind panels and for empty states.
export function paintBackdrop(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2b1055');
  g.addColorStop(0.55, '#ff7a18');
  g.addColorStop(1, '#ff2e88');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Grain tile: a small noise canvas reused across the render, tiled at low alpha.
let grainTile = null;
export function grainPattern(ctx) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 128;
    grainTile.height = 128;
    const g = grainTile.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 28;
    }
    g.putImageData(img, 0, 0);
  }
  return ctx.createPattern(grainTile, 'repeat');
}

export function paintGrain(ctx, W, H) {
  const pattern = grainPattern(ctx);
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function hexA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
