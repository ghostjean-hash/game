// 스테이지 맵 렌더 (DOM). 난이도 섹션 + 잠금/별점 표시.

import { PUZZLES } from '../data/puzzles.js';
import { LARGE_UNLOCK_CLEARS } from '../data/constants.js';
import { fillPicture } from './pixel.js';

const SECTIONS = [
  { title: '튜토리얼', diff: 'tutorial' },
  { title: '초급', diff: 'easy' },
  { title: '중급', diff: 'medium' },
  { title: '고급', diff: 'hard' },
];

export function renderMap(container, progress, onSelect) {
  const clears = Object.values(progress).filter((p) => p.cleared).length;
  const largeUnlocked = clears >= LARGE_UNLOCK_CLEARS;

  container.innerHTML = '';
  for (const s of SECTIONS) {
    const puzzles = PUZZLES.filter((p) => p.difficulty === s.diff);
    if (!puzzles.length) continue;
    const locked = s.diff === 'hard' && !largeUnlocked;

    const h = document.createElement('div');
    h.className = 'stage-section-title';
    h.textContent = locked
      ? `${s.title} 🔒 (중급까지 ${LARGE_UNLOCK_CLEARS}개 완성하면 열려요)`
      : s.title;
    container.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'stage-grid';
    for (const p of puzzles) {
      const prog = progress[p.id];
      const cleared = !!(prog && prog.cleared);
      const card = document.createElement('button');
      card.className = 'stage-card' + (locked ? ' locked' : '');

      const thumb = document.createElement('div');
      thumb.className = 'stage-thumb';
      fillPicture(thumb, p.grid, { mono: !cleared });

      const name = document.createElement('div');
      name.className = 'stage-name';
      name.textContent = p.title;

      const stars = document.createElement('div');
      stars.className = 'stage-stars';
      stars.textContent = cleared ? '★'.repeat(prog.stars) : '';

      card.append(thumb, name, stars);
      if (!locked) card.addEventListener('click', () => onSelect(p));
      grid.appendChild(card);
    }
    container.appendChild(grid);
  }
}
