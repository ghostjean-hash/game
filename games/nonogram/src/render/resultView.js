// 결과 화면 렌더 (DOM): 컬러 그림 + 제목 + 별점.

import { MAX_STARS } from '../data/constants.js';
import { fillPicture } from './pixel.js';

export function renderResult(picEl, titleEl, starsEl, puzzle, stars) {
  fillPicture(picEl, puzzle.grid, { mono: false });
  titleEl.textContent = `${puzzle.title} 완성!`;
  starsEl.innerHTML = Array.from({ length: MAX_STARS }, (_, i) =>
    `<span class="${i < stars ? '' : 'off'}">★</span>`,
  ).join('');
}
