// 플레이 격자 + 행/열 힌트 렌더 (DOM). core 상태를 읽어 그리기만 한다(상태 변형 금지).

import { CELL } from '../data/constants.js';
import { PALETTE } from '../data/colors.js';

// 힌트 렌더. 값 0(빈 줄)은 표시하지 않는다.
export function renderClues(colEl, rowEl, clues) {
  colEl.innerHTML = clues.colClues.map((col) =>
    `<div class="clue-col">${col.filter((x) => x !== 0).map((x) => `<span>${x}</span>`).join('')}</div>`,
  ).join('');
  rowEl.innerHTML = clues.rowClues.map((row) =>
    `<div class="clue-row">${row.filter((x) => x !== 0).map((x) => `<span>${x}</span>`).join('')}</div>`,
  ).join('');
}

// 빈 격자 DOM 생성. 5칸마다 굵은 구분선 class 부여.
export function renderBoard(boardEl, n) {
  boardEl.dataset.size = n;
  boardEl.style.setProperty('--n', n);
  let html = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cls = ['cell'];
      if ((c + 1) % 5 === 0 && c < n - 1) cls.push('blk-r');
      if ((r + 1) % 5 === 0 && r < n - 1) cls.push('blk-b');
      html += `<button class="${cls.join(' ')}" data-r="${r}" data-c="${c}"></button>`;
    }
  }
  boardEl.innerHTML = html;
}

// board 상태 → 셀 class 갱신(구분선 class는 유지).
export function applyState(boardEl, board) {
  const cells = boardEl.children;
  let i = 0;
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      const st = board.cells[r][c];
      const el = cells[i++];
      el.classList.toggle('filled', st === CELL.FILLED);
      el.classList.toggle('marked', st === CELL.MARKED);
    }
  }
}

// 클리어 시 컬러 변신: 채운 칸을 정답 색으로.
export function revealColors(boardEl, grid) {
  const cells = boardEl.children;
  let i = 0;
  const n = grid.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      const el = cells[i++];
      if (v !== 0) {
        el.classList.add('reveal');
        el.style.setProperty('--rc', PALETTE[v]);
      }
    }
  }
}

// 키보드 커서 하이라이트.
export function setCursor(boardEl, r, c, n) {
  const cells = boardEl.children;
  for (let i = 0; i < cells.length; i++) cells[i].classList.remove('cursor');
  const idx = r * n + c;
  if (cells[idx]) cells[idx].classList.add('cursor');
}
