// 스테이지 맵 렌더 (DOM). 난이도 섹션(접기 + 진행률) + 잠금/별점 표시.

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
    const cleared = puzzles.filter((p) => progress[p.id] && progress[p.id].cleared).length;

    const section = document.createElement('section');
    section.className = 'stage-section';

    // 헤더: 제목 + 진행 + 진행바 + 접기 화살표
    const head = document.createElement('button');
    head.className = 'stage-section-head';
    head.innerHTML =
      `<span class="ss-title">${s.title}${locked ? ' 🔒' : ''}</span>` +
      `<span class="ss-count">${cleared}/${puzzles.length}</span>` +
      `<span class="ss-bar"><i style="width:${Math.round((cleared / puzzles.length) * 100)}%"></i></span>` +
      '<span class="ss-caret">▾</span>';
    section.appendChild(head);

    if (locked) {
      const note = document.createElement('div');
      note.className = 'stage-lock-note';
      note.textContent = `중급까지 ${LARGE_UNLOCK_CLEARS}개 완성하면 열려요`;
      section.appendChild(note);
    }

    const grid = document.createElement('div');
    grid.className = 'stage-grid';
    for (const p of puzzles) {
      const prog = progress[p.id];
      const isClear = !!(prog && prog.cleared);
      const card = document.createElement('button');
      card.className = 'stage-card' + (locked ? ' locked' : '');

      const thumb = document.createElement('div');
      thumb.className = 'stage-thumb';
      fillPicture(thumb, p.grid, { mono: !isClear });

      const name = document.createElement('div');
      name.className = 'stage-name';
      name.textContent = p.title;

      const stars = document.createElement('div');
      stars.className = 'stage-stars';
      stars.textContent = isClear ? '★'.repeat(prog.stars) : '';

      card.append(thumb, name, stars);
      if (!locked) card.addEventListener('click', () => onSelect(p));
      grid.appendChild(card);
    }
    section.appendChild(grid);

    // 접기 토글
    head.addEventListener('click', () => section.classList.toggle('collapsed'));

    container.appendChild(section);
  }
}
