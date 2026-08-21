import { CELL } from '../data/constants.js';

export function fitCell({ width, height, w, h, gap = CELL.gap }) {
  const byWidth = (width - gap * (w - 1)) / w;
  const byHeight = (height - gap * (h - 1)) / h;
  return Math.max(CELL.min, Math.min(CELL.max, Math.floor(Math.min(byWidth, byHeight))));
}
