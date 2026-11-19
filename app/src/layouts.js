// Cover layouts: every template returns panel rects plus the title band rect,
// all in relative coordinates (0..1), so one layout scales to any export size.
// A panel: { x, y, w, h, angle } — angle rotates the panel around its centre.

export const TEMPLATES = [
  { id: 'vice-grid', name: 'Vice Grid' },
  { id: 'hero-bleed', name: 'Hero Bleed' },
  { id: 'nine-panel', name: 'Nine Panel' },
  { id: 'tilted-snaps', name: 'Tilted Snaps' },
  { id: 'duel-split', name: 'Duel Split' },
  { id: 'story-strip', name: 'Story Strip' },
];

function rect(x, y, w, h, angle = 0) {
  return { x, y, w, h, angle };
}

// Title band: the strip the lettering sits on. `angle` tilts it slightly.
function band(x, y, w, h, angle = 0) {
  return { x, y, w, h, angle };
}

export function layoutFor(templateId, W, H) {
  const portrait = H > W;
  switch (templateId) {
    case 'hero-bleed': {
      // One photo full-bleed, two strips along the bottom.
      return {
        panels: [
          rect(0, 0, 1, 1),
          rect(0.03, 0.70, 0.57, 0.24),
          rect(0.63, 0.70, 0.34, 0.24),
        ],
        band: band(0, 0.70, 1, 0.30),
      };
    }
    case 'nine-panel': {
      // 3x3 grid; the centre cell becomes the solid title block.
      const cells = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (r === 1 && c === 1) continue;
          cells.push(rect(c / 3 + 0.008, r / 3 + 0.008, 1 / 3 - 0.016, 1 / 3 - 0.016));
        }
      }
      return {
        panels: cells,
        band: band(1 / 3 + 0.01, 1 / 3 + 0.01, 1 / 3 - 0.02, 1 / 3 - 0.02),
        titleBlock: true,
      };
    }
    case 'tilted-snaps': {
      // Three snapshots leaning over a full sunset backdrop.
      return {
        panels: [
          rect(0.06, 0.08, 0.52, 0.55, -6),
          rect(0.44, 0.16, 0.50, 0.48, 5),
          rect(0.22, 0.52, 0.56, 0.36, -3),
        ],
        band: band(0, 0.74, 1, 0.26, -1),
      };
    }
    case 'duel-split': {
      // Two tall halves with a diagonal title band across the middle.
      return {
        panels: [rect(0, 0, 0.5, 1), rect(0.5, 0, 0.5, 1)],
        band: band(-0.05, 0.60, 1.10, 0.20, -4),
      };
    }
    case 'story-strip': {
      // Portrait: a vertical stack. Landscape: three columns.
      if (portrait) {
        return {
          panels: [
            rect(0.04, 0.03, 0.92, 0.30),
            rect(0.04, 0.35, 0.92, 0.28),
            rect(0.04, 0.65, 0.92, 0.28),
          ],
          band: band(0, 0.78, 1, 0.22),
        };
      }
      return {
        panels: [
          rect(0.02, 0.05, 0.30, 0.90),
          rect(0.35, 0.05, 0.30, 0.90),
          rect(0.68, 0.05, 0.30, 0.90),
        ],
        band: band(0, 0.68, 1, 0.32),
      };
    }
    case 'vice-grid':
    default: {
      // Hero on the left, three small panels stacked on the right.
      // In portrait the hero sits on top and the small panels form a row.
      if (portrait) {
        return {
          panels: [
            rect(0.02, 0.02, 0.96, 0.55),
            rect(0.02, 0.59, 0.31, 0.33),
            rect(0.345, 0.59, 0.31, 0.33),
            rect(0.67, 0.59, 0.31, 0.33),
          ],
          band: band(0, 0.74, 1, 0.26),
        };
      }
      return {
        panels: [
          rect(0.02, 0.02, 0.53, 0.96),
          rect(0.57, 0.02, 0.41, 0.31),
          rect(0.57, 0.345, 0.41, 0.31),
          rect(0.57, 0.67, 0.41, 0.31),
        ],
        band: band(0, 0.74, 1, 0.26),
      };
    }
  }
}

// Map a layout panel to absolute pixels for a canvas of W x H.
export function panelPixels(panel, W, H) {
  return {
    x: panel.x * W,
    y: panel.y * H,
    w: panel.w * W,
    h: panel.h * H,
    angle: panel.angle || 0,
    cx: (panel.x + panel.w / 2) * W,
    cy: (panel.y + panel.h / 2) * H,
  };
}

// How many photo slots the layout offers.
export function panelCount(templateId, W, H) {
  return layoutFor(templateId, W, H).panels.length;
}

// Grow or shrink a state's panels array to the layout's panel count.
// Keeps each panel's photo and crop when it already exists; new slots start
// from the first photo. Call whenever the template changes.
export function ensurePanels(state, templateId, emptyPanel) {
  const count = panelCount(templateId, 100, 100);
  while (state.panels.length < count) {
    state.panels.push(emptyPanel(state.photos.length ? 0 : 0));
  }
  if (state.panels.length > count) state.panels.length = count;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}
