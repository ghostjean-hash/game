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

// 완성된 줄의 힌트를 흐리게(done). flags = { rows, cols }.
export function applyClueDim(colEl, rowEl, flags) {
  const cols = colEl.children;
  const rows = rowEl.children;
  for (let c = 0; c < cols.length; c++) cols[c].classList.toggle('done', !!flags.cols[c]);
  for (let r = 0; r < rows.length; r++) rows[r].classList.toggle('done', !!flags.rows[r]);
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
// solution을 주면 "칠했지만 정답이 빈칸인 칸"을 wrong으로 표시(틀린 자리 안내).
export function applyState(boardEl, board, solution) {
  const cells = boardEl.children;
  let i = 0;
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      const st = board.cells[r][c];
      const el = cells[i++];
      el.classList.toggle('filled', st === CELL.FILLED);
      el.classList.toggle('marked', st === CELL.MARKED);
      el.classList.toggle('wrong', st === CELL.FILLED && !!solution && solution[r][c] === false);
    }
  }
}

// 방금 칠한 칸에 톡 튀는 피드백(잠깐).
export function popCell(boardEl, r, c, n) {
  const el = boardEl.children[r * n + c];
  if (!el) return;
  el.classList.remove('pop');
  // 리플로우로 애니메이션 재시작
  void el.offsetWidth;
  el.classList.add('pop');
}

// 완성된 줄 셀에 잠깐 반짝(칭찬). flags 기준으로 해당 행/열 셀에 sparkle.
export function sparkleLines(boardEl, board, flags) {
  const n = board.size;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (flags.rows[r] || flags.cols[c]) {
        const el = boardEl.children[r * n + c];
        if (el && el.classList.contains('filled')) {
          el.classList.remove('sparkle');
          void el.offsetWidth;
          el.classList.add('sparkle');
        }
      }
    }
  }
}

// 클리어 시 컬러 변신: 채운 칸을 정답 색으로. 왼쪽 위부터 대각선 파도(순차 지연).
export function revealColors(boardEl, grid, stepMs) {
  const cells = boardEl.children;
  let i = 0;
  const n = grid.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      const el = cells[i++];
      el.classList.remove('wrong', 'sparkle');
      if (v !== 0) {
        el.style.transitionDelay = `${(r + c) * stepMs}ms`;
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

// 튜토리얼 손가락: 특정 칸 위에 손가락 표시(시연). r<0이면 숨김.
export function pointFinger(boardEl, fingerEl, r, c, n) {
  if (r < 0 || !fingerEl) { if (fingerEl) fingerEl.hidden = true; return; }
  const el = boardEl.children[r * n + c];
  if (!el) { fingerEl.hidden = true; return; }
  const b = el.getBoundingClientRect();
  const wrap = boardEl.getBoundingClientRect();
  fingerEl.hidden = false;
  fingerEl.style.left = `${b.left - wrap.left + b.width * 0.5}px`;
  fingerEl.style.top = `${b.top - wrap.top + b.height * 0.6}px`;
}
