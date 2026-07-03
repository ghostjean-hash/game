// 결과 화면 렌더 (DOM): 컬러 그림 + 제목 + 별점(순서대로 팝).

import { MAX_STARS } from '../data/constants.js';
import { fillPicture } from './pixel.js';

export function renderResult(picEl, titleEl, starsEl, puzzle, stars) {
  fillPicture(picEl, puzzle.grid, { mono: false });
  titleEl.textContent = `${puzzle.title} 완성!`;
  // 별이 하나씩 순서대로 튀어나오도록 delay 부여.
  starsEl.innerHTML = Array.from({ length: MAX_STARS }, (_, i) => {
    const on = i < stars;
    return `<span class="${on ? 'on' : 'off'}" style="animation-delay:${i * 180}ms">★</span>`;
  }).join('');
}
