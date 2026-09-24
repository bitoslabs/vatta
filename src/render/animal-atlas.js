import { animalMotion } from '../prototypes/animal-catalog.js';

const sources = {
  small: '../../assets/images/characters/small-animals-atlas-v1.png',
  forest: '../../assets/images/characters/forest-animals-atlas-v1.png',
  deer: '../../assets/images/characters/deer-atlas-v1.png',
};
const sheets = new Map();
// Measured transparent gutters: generated rows are not exactly equal-height.
// Source windows preserve whole wings and long bodies without stretching them.
const windows = {
  small: [
    { y: 120, h: 150, baseline: 250, cuts: [0, 313, 660, 949, 1254] },
    { y: 360, h: 200, baseline: 539, cuts: [0, 325, 640, 950, 1254] },
    { y: 610, h: 245, baseline: 835, cuts: [0, 315, 642, 933, 1254] },
    { y: 950, h: 205, baseline: 1134, cuts: [0, 315, 627, 940, 1254] },
  ],
  forest: [
    { y: 25, h: 275, baseline: 276, cuts: [0, 320, 625, 935, 1254] },
    { y: 320, h: 295, baseline: 591, cuts: [0, 312, 623, 933, 1254] },
    { y: 650, h: 230, baseline: 860, cuts: [0, 310, 628, 940, 1254] },
    { y: 880, h: 350, baseline: 1200, cuts: [0, 313, 627, 940, 1254] },
  ],
};
function sheetFor(key) {
  if (!sheets.has(key)) {
    const image = new Image();
    const entry = { image, status: 'loading' };
    image.onload = () => { entry.status = 'ready'; };
    image.onerror = () => { entry.status = 'error'; };
    image.src = new URL(sources[key], import.meta.url).href;
    sheets.set(key, entry);
  }
  return sheets.get(key);
}
export const atlasStatus = key => sheetFor(key).status;

/** Draw source cells directly, preserving generated alpha and the original image. */
export function drawAnimalAtlas(ctx, animal, actor, moving) {
  const deer = animal.id === 'deer';
  const sheet = sheetFor(deer ? 'deer' : animal.sheet);
  if (sheet.status !== 'ready') return false;
  let row, column, lift, alpha = 1;
  if (deer) {
    let frame = moving ? 1 + Math.floor(actor.phase) % 4 : 0;
    lift = 0;
    if (actor.jump > 0) {
      const elapsed = .95 - actor.jump;
      frame = elapsed < .16 ? 5 : elapsed < .76 ? 6 : 7;
      if (frame === 6) lift = Math.sin((elapsed - .16) / .6 * Math.PI) * 24;
    }
    row = Math.floor(frame / 4); column = frame % 4;
  } else {
    ({ column, lift, alpha } = animalMotion(animal, actor.phase, moving, actor.action));
    row = animal.row;
  }
  const width = animal.width || 66;
  const cellW = sheet.image.naturalWidth / 4;
  const cellH = sheet.image.naturalHeight / (deer ? 2 : 4);
  ctx.save();
  ctx.fillStyle = `rgba(31,39,23,${.2 - lift * .004})`;
  ctx.beginPath(); ctx.ellipse(0, 2, width * .3, Math.max(2, width * .065), 0, 0, Math.PI * 2); ctx.fill();
  if (animal.id === 'worm' && actor.action > 0) {
    ctx.strokeStyle = '#796348'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(-width * .35, 2); ctx.quadraticCurveTo(0, 8, width * .35, 0); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.translate(0, -lift); ctx.scale(actor.face, 1); ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (deer) {
    const height = width * cellH / cellW;
    ctx.drawImage(sheet.image, column * cellW, row * cellH, cellW, cellH,
      -width / 2, -height * .90, width, height);
  } else {
    const window = windows[animal.sheet][row];
    const sourceX = window.cuts[column];
    const sourceWidth = window.cuts[column + 1] - sourceX;
    const ratio = width / (1254 / 4);
    ctx.drawImage(sheet.image, sourceX, window.y, sourceWidth, window.h,
      -sourceWidth * ratio / 2, -(window.baseline - window.y) * ratio,
      sourceWidth * ratio, window.h * ratio);
  }
  ctx.restore();
  return true;
}
