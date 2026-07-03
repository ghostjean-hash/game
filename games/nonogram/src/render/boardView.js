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

// 방금 완성된 줄만 파도처럼 순차 반짝. lines=[{type:'row'|'col', idx}], forward=드래그 방향.
// 각 줄의 칠한 칸을 방향 순서로 stepMs씩 지연시켜 연쇄 효과를 준다.
export function waveHighlight(boardEl, lines, n, forward, stepMs) {
  for (const line of lines) {
    for (let i = 0; i < n; i++) {
      const r = line.type === 'row' ? line.idx : i;
      const c = line.type === 'col' ? line.idx : i;
      const el = boardEl.children[r * n + c];
      if (!el || !el.classList.contains('filled')) continue;
      const order = forward ? i : (n - 1 - i);
      el.classList.remove('wave');
      void el.offsetWidth; // 리플로우로 애니메이션 재시작
      el.style.animationDelay = `${order * stepMs}ms`;
      el.classList.add('wave');
    }
  }
}

// 클리어 시 컬러 변신: 채운 칸을 정답 색으로. 왼쪽 위부터 대각선 파도(순차 지연).
// palette를 주면 그 퍼즐 전용 색표, 없으면 전역 PALETTE.
export function revealColors(boardEl, grid, stepMs, palette) {
  const pal = palette || PALETTE;
  const cells = boardEl.children;
  let i = 0;
  const n = grid.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      const el = cells[i++];
      el.classList.remove('wrong', 'wave'); // 완성 반짝(wave) 잔재 제거 - 정답 색과 섞이지 않게
      el.style.animationDelay = '';
      if (v !== 0) {
        el.style.transitionDelay = `${(r + c) * stepMs}ms`;
        el.classList.add('reveal');
        el.style.setProperty('--rc', pal[v]);
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

// 이번 드래그로 지나간 칸들(시작~현재 직선)에 강조 링을 둘러 범위를 보여준다.
let dragRunCells = [];
export function markDragRun(boardEl, coords, n) {
  clearDragRun();
  for (const [r, c] of coords) {
    const el = boardEl.children[r * n + c];
    if (el) { el.classList.add('drag-run'); dragRunCells.push(el); }
  }
}
export function clearDragRun() {
  for (const el of dragRunCells) el.classList.remove('drag-run');
  dragRunCells = [];
}

// 드래그 중 "지금 몇 칸째"를 마지막(현재) 칸 우상단 모서리에 원 안 숫자로.
export function showDragCount(boardEl, el, r, c, n, count) {
  const cell = boardEl.children[r * n + c];
  if (!el || !cell) return;
  const b = cell.getBoundingClientRect();
  // 배지의 좌표 기준은 offsetParent(.puzzle)이지 board가 아니다. board는 힌트만큼 안쪽에 있다.
  const wrap = (boardEl.parentElement || boardEl).getBoundingClientRect();
  el.hidden = false;
  el.textContent = `${count}`;
  el.style.left = `${b.right - wrap.left}px`; // 셀 우측 모서리
  el.style.top = `${b.top - wrap.top}px`;     // 셀 상단 모서리
}
export function hideDragCount(el) { if (el) el.hidden = true; }

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
