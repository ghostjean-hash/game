// 진입점: 화면 전환 오케스트레이션 + 저장 연결. core를 조립하고 render/input에 위임한다.

import { createGameFrame, SCREEN } from '../../../shared/frame/index.js';
import { setupFullscreen } from '../../../shared/fullscreen.js';
import { CELL, MODE, MAX_STARS, ANIM, PRAISE, PRAISE_STREAK, CELL_FIT, ZOOM } from './data/constants.js';
import { PUZZLES } from './data/puzzles.js';
import { makeClues } from './core/hints.js';
import {
  createBoard, toSolution, setCell, isSolved,
  revealLine, serializeBoard, deserializeBoard,
} from './core/board.js';
import { lineFlags, completedCount } from './core/lines.js';
import { starsFor } from './core/stars.js';
import {
  renderClues, applyClueDim, renderBoard, applyState, revealColors,
  setCursor, popCell, waveHighlight, pointFinger, showDragCount, hideDragCount,
  markDragRun, clearDragRun, clearWaves, markFlow,
} from './render/boardView.js';
import { renderMap } from './render/mapView.js';
import { renderResult } from './render/resultView.js';
import { attachBoardInput } from './input/boardInput.js';
import { attachBoardZoom } from './input/boardZoom.js';
import { planBoardFit, clampCell } from './core/zoom.js';
import { SOUNDS } from './audio/sound.js';

// --- DOM 참조 ---
const el = (id) => document.getElementById(id);
const boardEl = el('board');
const puzzleEl = boardEl.parentElement;

// 플레이 화면 소리 버튼(이 게임의 4코너 UI에 있는 것). 프레임 상단 띠는 플레이에서 감추므로
// 그 자리를 이 버튼이 대신하고, 상태는 프레임이 알려주는 대로 따라간다.
const ICON_SOUND = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>';
const ICON_MUTE = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';
function syncPlaySoundBtn(muted) {
  const b = el('sound-toggle');
  if (b) b.innerHTML = muted ? ICON_MUTE : ICON_SOUND;
}

// 시작 화면 배경. 이 게임은 배경 그림이 없어 게임 자체 요소로 대신한다(규격 5.1) -
// 실제 퍼즐 하나를 완성한 모습의 격자를 흐리게 깐다. 이 게임의 결과물이 곧 그림이라
// 배경 대용으로 가장 자연스럽다(Ⅰ권 6.5).
function titleBackdrop() {
  const puzzle = PUZZLES.find((p) => p.title === '고양이' && p.size === 15) || PUZZLES[PUZZLES.length - 1];
  const wrap = document.createElement('div');
  wrap.className = 'title-grid';
  wrap.style.setProperty('--n', puzzle.size);
  puzzle.grid.forEach((row) => row.forEach((v) => {
    const cell = document.createElement('i');
    if (v) cell.className = 'on';
    wrap.appendChild(cell);
  }));
  return wrap;
}

// --- 공용 프레임(기획서 Ⅰ권 / html-game 표준 4.8) ---
// 다섯 화면 골격·되돌아가기 계단·상단 띠·결과 카드·소리·저장을 여기서 한 번에 받는다.
// 이 게임은 판이 344개라 "골라 들어가는 형"이다 - 시작 화면과 플레이 사이에 지도 한 칸이 들어간다.
const frame = createGameFrame({
  root: el('app'),
  gameId: 'nonogram',
  title: '노노그램',
  light: true,                       // 흰 바탕 게임이라 배경 결·그림자를 밝은 쪽으로 뒤집는다
  hasSelect: true,
  background: { className: 'title-deco', el: titleBackdrop() },
  buttons: ['sound', 'fullscreen'],  // 환경설정은 이 게임에 없다(설정 항목 자체가 없음)
  sounds: SOUNDS,
  pauseOnHide: false,                // 실패도 시간 제한도 없는 게임이라 자리를 비워도 잃을 것이 없다

  resume: { enabled: false, detail: '' },
  startHint: '누르면 그림 고르는 지도로 감',
  onStart: () => openMap(),
  onResume: () => resumeLast(),
  onMuted: (m) => syncPlaySoundBtn(m),
});
const sound = frame.audio;
const store = frame.save;            // 기존 저장 키(progress/inprogress/mode/muted)를 그대로 쓴다

// 기존 화면 요소를 프레임에 등록한다. 표시는 프레임이 화면 이름으로 가른다.
frame.screens.register(SCREEN.SELECT, el('screen-map'));
frame.screens.register(SCREEN.PLAY, el('screen-play'));

// --- 영속 상태 ---
let progress = store.get('progress', {});   // { [id]: { cleared, stars, bestMistakes } }

// --- 현재 판 상태 ---
let cur = null;

const DIFF = {
  tutorial: { icon: '🎓', name: '튜토리얼' },
  easy: { icon: '🌱', name: '초급' },
  medium: { icon: '⭐', name: '중급' },
  hard: { icon: '🔥', name: '고급' },
};

const COACH = {
  1: '가로줄·세로줄 앞의 <b>숫자</b>만큼 칸을 이어서 칠해요. 손가락을 따라 눌러 봐요!',
  2: '칠하지 않을 칸은 <b>표시(×)</b>로 막아두면 헷갈리지 않아요.',
  3: '이제 자유롭게! 숫자 힌트만 보고 그림을 완성해 봐요.',
};

// --- 맵(그림 고르는 화면) ---
function openMap() {
  renderMap(el('map-body'), progress, startPuzzle);
  frame.screens.go(SCREEN.SELECT);
}

// 시작 화면의 이어서 하기 - 마지막에 풀던 그림으로 곧장 들어간다.
function resumeLast() {
  const saved = frame.save.readResume();
  const p = saved && PUZZLES.find((q) => q.id === saved.data?.id);
  if (p) startPuzzle(p);
  else openMap();
}

// 시작 화면 기록 줄과 이어서 하기 칸을 지금 상태로 맞춘다.
// 이 게임은 점수가 없어 수집 현황(완성한 그림 수·모은 별)이 기록 자리에 온다(Ⅰ권 6.7).
function refreshTitle() {
  const done = Object.values(progress).filter((v) => v && v.cleared).length;
  const stars = Object.values(progress).reduce((sum, v) => sum + (v?.stars || 0), 0);
  frame.title.setRecord(`완성한 그림 ${done} / ${PUZZLES.length} · 모은 별 ${stars}`);

  const saved = frame.save.readResume();
  const p = saved && PUZZLES.find((q) => q.id === saved.data?.id);
  frame.title.setResume({
    enabled: !!p,
    detail: p ? `${DIFF[p.difficulty].name} · ${p.title}` : '풀던 그림 없음',
  });
}

// 난이도 내 순번.
function puzzleRank(p) {
  const same = PUZZLES.filter((q) => q.difficulty === p.difficulty);
  return { idx: same.findIndex((q) => q.id === p.id) + 1, total: same.length };
}

// 중도 저장.
function saveInProgress() {
  const ip = store.get('inprogress', {});
  ip[cur.puzzle.id] = serializeBoard(cur.board);
  store.set('inprogress', ip);
}
function clearInProgress(id) {
  const ip = store.get('inprogress', {});
  if (ip[id]) { delete ip[id]; store.set('inprogress', ip); }
}
function loadInProgress(id, size) {
  const ip = store.get('inprogress', {});
  const b = deserializeBoard(ip[id]);
  return b && b.size === size ? b : createBoard(size);
}

// --- 플레이 ---
function startPuzzle(puzzle) {
  cur = {
    puzzle,
    clues: makeClues(puzzle.grid),
    solution: toSolution(puzzle.grid),
    board: loadInProgress(puzzle.id, puzzle.size),
    mode: MODE.FILL,
    dragAction: null,
    dragStart: null,       // 드래그 시작 칸(범위·방향 계산)
    dragLast: null,        // 드래그 마지막 칸(파도 방향)
    completedBefore: null, // 드래그 직전 완성 줄 스냅샷
    cursor: { r: 0, c: 0 },
    history: [],
    helpUsed: 0,
    streak: 0,
    prevCompleted: 0,
  };

  puzzleEl.dataset.size = puzzle.size;
  puzzleEl.style.setProperty('--n', puzzle.size);
  el('col-clues').style.setProperty('--n', puzzle.size);
  el('row-clues').style.setProperty('--n', puzzle.size);

  renderBoard(boardEl, puzzle.size);
  renderClues(el('col-clues'), el('row-clues'), cur.clues);

  // 헤더 정보
  const d = DIFF[puzzle.difficulty];
  const { idx, total } = puzzleRank(puzzle);
  // 퍼즐 이름은 정답 스포일러라 HUD에 아예 표시하지 않는다(클리어 결과 화면에서만 공개).
  // 난이도 배지(난이도별 색) + 진행 위치만 두어 깔끔하게. (배지의 d.name은 난이도명)
  el('puzzle-info').innerHTML =
    `<span class="pi-badge pi-${puzzle.difficulty}">${d.name}</span>` +
    `<span class="pi-prog">${idx}/${total}</span>`;

  el('mode-fill').disabled = false;
  el('mode-mark').disabled = false;
  setMode(MODE.FILL);
  cur.prevCompleted = completedCount(lineFlags(cur.board, cur.clues));
  refresh();

  // 튜토리얼 코치 + 안내문
  const coach = el('coach');
  const isTut = puzzle.difficulty === 'tutorial';
  if (isTut && COACH[puzzle.tutorialStep]) {
    coach.innerHTML = COACH[puzzle.tutorialStep];
    coach.hidden = false;
  } else {
    coach.hidden = true;
  }
  el('hint-line').hidden = !isTut;

  // 지금 이 그림을 이어서 하기 대상으로 남긴다(규격 8장 - 저장이 있으면 시작 화면에서 눌린다).
  frame.save.saveResume({ id: puzzle.id }, `${d.name} · ${puzzle.title}`);

  frame.screens.go(SCREEN.PLAY);
  // 화면 전환으로 레이아웃이 잡힌 다음 프레임에 격자 크기를 화면에 맞춘다.
  // 새 그림이므로 확대 배율도 기본값에서 다시 시작한다(reset).
  requestAnimationFrame(() => { fitBoard(true); updateFinger(); });
}

// --- 격자 크기·확대 상태 ---
// cell   지금 화면에 적용 중인 셀 크기(px)
// minCell 축소 하한 = 그림 전체가 화면에 들어오는 크기
// basePannable 이 화면·판에서는 전체를 넣으면 손가락보다 작아져 처음부터 확대·이동 모드인가
// marginRight 전체 맞춤일 때만 주는 우측 대칭 여백(확대·이동 중엔 0)
const view = { cell: 0, minCell: 0, basePannable: false, marginRight: 0, pannable: false };

// 확대·이동 모드 on/off. 스크롤 영역(.puzzle-wrap)과 가로 방향 열 배분(#screen-play)이 함께 바뀐다.
function setPannable(on) {
  if (view.pannable === on) return;
  view.pannable = on;
  puzzleEl.parentElement.classList.toggle('pannable', on);
  el('screen-play').classList.toggle('has-pan', on);
}

// 셀 크기 하나를 실제 화면에 반영한다. 전체 맞춤 크기를 넘어서면 밀어 볼 수 있어야 하므로
// 그 순간부터 확대·이동 모드로 전환한다(작은 판에서 손가락으로 확대한 경우).
function applyCell(px) {
  view.cell = px;
  const pan = view.basePannable || px > view.minCell;
  setPannable(pan);
  puzzleEl.style.marginRight = pan ? '0px' : `${view.marginRight}px`;
  puzzleEl.style.setProperty('--cell', `${px}px`);
}

// 격자를 현재 화면에 앉힌다.
// 머리말·모드바가 쓰고 남은 .puzzle-wrap 공간에서 힌트 영역을 뺀 뒤, 폭·높이 중 작은 쪽으로
// 전체 맞춤 크기를 구한다. 그 크기가 손가락보다 작으면 전체 넣기를 포기하고 확대·이동에 맡긴다
// (판정은 core/zoom.js planBoardFit). 힌트 폭·높이는 글자 기반이라 셀 크기와 사실상 무관하므로
// 한 번 측정으로 충분하다. CSS clamp는 JS 미동작 시 fallback.
// reset=false면 사용자가 확대해 둔 배율을 지키고 한계값만 다시 잡는다(화면 회전·크기 변경).
function fitBoard(reset = true) {
  if (!cur) return;
  const n = cur.puzzle.size;
  const wrap = puzzleEl.parentElement; // .puzzle-wrap
  const center = puzzleEl.closest('.play-center');
  if (!center) return;
  // 격자 가용 공간 = play-center에서 형제(모드바·코치·힌트)와 그 사이 gap을 뺀 나머지.
  // 이래야 격자가 남는 공간에 딱 맞고, 모드바가 격자 바로 아래에 붙는다.
  const cs = getComputedStyle(center);
  const gap = parseFloat(cs.rowGap) || 0;
  let sibH = 0, sibCount = 0;
  for (const ch of center.children) {
    if (ch === wrap || ch.offsetParent === null) continue; // 자기 자신·숨김 제외
    sibH += ch.offsetHeight; sibCount += 1;
  }
  // 가로(태블릿 눕힘)에선 보드 열 폭이 auto라 center 폭을 병목으로 쓸 수 없다.
  // 대신 화면 전체 폭에서 좌·우 UI 열과 열 간격을 뺀 값이 실제 가용 폭이다.
  // 폭을 병목에서 빼면(무한대) 옆으로 긴 창에서 보드+UI가 화면을 넘친다(STANDARD 4.7-7).
  const isLandscape = window.innerWidth > window.innerHeight;
  let availW;
  if (isLandscape) {
    const screen = el('screen-play');
    const colGap = parseFloat(getComputedStyle(screen).columnGap) || 0;
    // offsetWidth는 좁은 창에서 이미 눌린 트랙 폭이 나와 순환 측정이 된다.
    // scrollWidth(내용물 고유 폭)와 큰 쪽을 써야 UI 열이 실제 필요한 폭을 확보한다.
    const contentW = (sel) => {
      const ui = screen.querySelector(sel);
      return ui ? Math.max(ui.offsetWidth, ui.scrollWidth) : 0;
    };
    const tlW = contentW('.pc-tl');
    const sideW = Math.max(contentW('.pc-tr'), contentW('.pc-br'));
    availW = screen.clientWidth - tlW - sideW - colGap * 2;
  } else {
    availW = center.clientWidth;
  }
  const availH = center.clientHeight - sibH - gap * sibCount;
  if (availH <= 0 || availW <= 0) return;        // 아직 레이아웃 전(display:none 등)
  const clueLeft = el('row-clues').offsetWidth;  // 좌측 행 힌트 폭
  const clueTop = el('col-clues').offsetHeight;  // 상단 열 힌트 높이
  // 보드 오른쪽 여백: 세로에선 좌측 힌트 폭만큼 줘 격자(board)를 화면 정중앙에.
  // 가로에선 그 1/3만 줘 우측 UI를 보드에 가깝게 붙인다(RIGHT_MARGIN_RATIO).
  // 단 그 여백 탓에 칸이 손가락보다 작아지면 planBoardFit이 여백을 걷어낸다.
  const wantMargin = isLandscape
    ? Math.round(clueLeft * CELL_FIT.RIGHT_MARGIN_RATIO)
    : clueLeft;
  // 가로에선 보드가 배정 영역(높이)을 꽉 채워야 UI가 보드 모서리에 정확히 붙는다.
  // cap을 두면 보드가 영역보다 작아져 그 여백만큼 UI가 보드 밖으로 벗어난다.
  const plan = planBoardFit({
    availW, availH, clueW: clueLeft, clueH: clueTop, marginRight: wantMargin, n,
    gutter: CELL_FIT.GUTTER_PX, minPx: CELL_FIT.MIN_PX,
    maxPx: isLandscape ? null : (CELL_FIT.MAX[n] || CELL_FIT.DEFAULT_MAX),
    fitMin: ZOOM.FIT_MIN_PX, startPx: ZOOM.START_PX,
  });
  view.minCell = plan.minCell;
  view.basePannable = plan.pannable;
  view.marginRight = plan.marginRight;
  applyCell(reset ? plan.cell : clampCell(view.cell || plan.cell, plan.minCell, ZOOM.MAX_PX));
  // 새 퍼즐을 열 때는 좌상단부터(노노그램은 왼쪽 위부터 푼다).
  if (reset) { wrap.scrollLeft = 0; wrap.scrollTop = 0; }
}

// 화면 갱신: 셀 상태 + 완성 줄 흐리게 + 별 예고 + 실수 + 중도 저장.
function refresh() {
  applyState(boardEl, cur.board, cur.solution);
  applyClueDim(el('col-clues'), el('row-clues'), lineFlags(cur.board, cur.clues));
  updateStarPreview();
  updateMistake();
  saveInProgress();
}

function updateMistake() {
  el('mistake-count').textContent = cur.board.mistakes;
}

// 지금 받을 별(실수 + 도움 양보 반영).
function currentStars() {
  return Math.max(1, Math.min(starsFor(cur.board.mistakes), MAX_STARS - cur.helpUsed));
}
function updateStarPreview() {
  const sp = el('star-preview');
  if (!sp) return; // 플레이 중 예상 별점 표시는 제거됨(요소 없음)
  const s = currentStars();
  sp.innerHTML = Array.from({ length: MAX_STARS }, (_, i) =>
    `<span class="${i < s ? 'on' : 'off'}">★</span>`).join('');
}

function setMode(mode) {
  cur.mode = mode;
  el('mode-fill').classList.toggle('active', mode === MODE.FILL);
  el('mode-mark').classList.toggle('active', mode === MODE.MARK);
  store.set('mode', mode);
}

// 맞게 칠한 칸(정답 칠칸)은 잠긴다: 지우기 불가.
function isCorrectFilled(r, c) {
  return cur.board.cells[r][c] === CELL.FILLED && cur.solution[r][c] === true;
}

// 이 칸을 눌렀을 때의 동작을 정한다.
// 칠하기 모드: 빈 칸·맞은 칸은 fill(맞은 칸은 무변화라 유지되며 드래그가 이어짐), 틀린 칸(붉은)만 erase.
// 표시 모드: X 토글(있으면 erase, 없으면 mark).
function decideAction(r, c) {
  const st = cur.board.cells[r][c];
  if (cur.mode === MODE.FILL) {
    if (st === CELL.FILLED) return cur.solution[r][c] === false ? 'erase' : 'fill';
    return 'fill';
  }
  return st === CELL.MARKED ? 'erase' : 'mark';
}

function applyAction(r, c) {
  if (!cur.dragAction) return; // 잠긴 맞은 칸(무동작)
  // 지우기 드래그가 맞게 칠한 칸을 지나가도 그 칸은 건너뛴다(잠금 유지).
  if (cur.dragAction === 'erase' && isCorrectFilled(r, c)) return;
  const target = cur.dragAction === 'fill' ? CELL.FILLED
    : cur.dragAction === 'mark' ? CELL.MARKED
      : CELL.EMPTY;
  const before = cur.board;
  cur.board = setCell(before, r, c, target, cur.solution);
  if (cur.board === before) return;
  refresh();
  popCell(boardEl, r, c, cur.puzzle.size);
  if (cur.board.mistakes > before.mistakes) sound.play('mistake');
  else sound.play(cur.dragAction);
  updateFinger();
}

// 이번 동작으로 "새로 완성된" 줄만 파도 반짝 + 연속 칭찬.
// before=동작 직전 완성 flags, forward=드래그 방향. 이미 완성돼 있던 줄은 다시 반짝하지 않는다.
function highlightNewCompletions(before, forward) {
  const n = cur.puzzle.size;
  // 이 동작으로 퍼즐이 완성되면 줄 파도를 그리지 않는다(전체 컬러 변신과 겹쳐 지저분해짐).
  if (isSolved(cur.board, cur.solution)) return;
  const after = lineFlags(cur.board, cur.clues);
  const newLines = [];
  for (let r = 0; r < n; r++) if (after.rows[r] && !before.rows[r]) newLines.push({ type: 'row', idx: r });
  for (let c = 0; c < n; c++) if (after.cols[c] && !before.cols[c]) newLines.push({ type: 'col', idx: c });
  if (newLines.length) {
    waveHighlight(boardEl, newLines, n, forward, ANIM.SPARKLE_STEP_MS);
    sound.play('fill');
  }
  const now = completedCount(after);
  if (now > cur.prevCompleted) {
    cur.streak += 1;
    if (cur.streak >= PRAISE_STREAK) showPraise();
  } else if (now < cur.prevCompleted) {
    cur.streak = 0;
  }
  cur.prevCompleted = now;
}

let praiseTimer = null;
function showPraise() {
  const t = el('praise-toast');
  t.textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  t.hidden = false;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(praiseTimer);
  praiseTimer = setTimeout(() => t.classList.remove('show'), ANIM.PRAISE_MS);
}

// 튜토리얼 손가락: 아직 첫 칸도 안 칠했으면 첫 정답 칠칸을 가리킨다.
function updateFinger() {
  if (!cur) return; // 맵/결과 화면에서 resize로 불릴 수 있어 가드
  const fingerEl = el('finger');
  if (cur.puzzle.difficulty !== 'tutorial') { fingerEl.hidden = true; return; }
  const anyFilled = cur.board.cells.some((row) => row.some((v) => v === CELL.FILLED));
  if (anyFilled) { fingerEl.hidden = true; return; }
  const n = cur.puzzle.size;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (cur.solution[r][c]) { pointFinger(boardEl, fingerEl, r, c, n); return; }
    }
  }
}

// 되돌리기: 드래그 한 묶음 전으로.
function pushHistory() {
  cur.history.push(cur.board);
  if (cur.history.length > 200) cur.history.shift();
}
function undo() {
  if (!cur.history.length) return;
  cur.board = cur.history.pop();
  cur.prevCompleted = completedCount(lineFlags(cur.board, cur.clues));
  cur.streak = 0;
  refresh();
  updateFinger();
  sound.play('erase');
}

// 도움: 한 줄 열기(별 하나 양보).
function useHelp() {
  const before = cur.board;
  const beforeFlags = lineFlags(before, cur.clues);
  const next = revealLine(before, cur.solution);
  if (next === before) return; // 이미 다 맞음
  pushHistory();
  cur.board = next;
  cur.helpUsed += 1;
  refresh();
  if (isSolved(cur.board, cur.solution)) { win(); return; }
  highlightNewCompletions(beforeFlags, true);
}

// 힌트 숫자를 누르면: 그 줄이 완성됐을 때만 남은 빈 칸을 자동으로 X로 채운다.
// 아직 못 맞춘 줄은 아무 동작도 하지 않는다(type='row'|'col', idx=줄 번호).
function fillLineMarks(type, idx) {
  if (!cur) return;
  const n = cur.puzzle.size;
  // "맞춘 줄" 판정을 정답 기준으로: 정답 칠칸은 모두 칠했고 잘못 칠한 칸이 없어야 한다.
  // (빈 줄=힌트 0 은 칠할 칸이 없으므로, 잘못 칠한 게 없으면 맞춘 것으로 본다.)
  for (let i = 0; i < n; i++) {
    const r = type === 'row' ? idx : i;
    const c = type === 'col' ? idx : i;
    const filled = cur.board.cells[r][c] === CELL.FILLED;
    if (filled !== (cur.solution[r][c] === true)) return; // 아직 못 맞춘 줄이면 무동작
  }
  // 남은 빈 칸 목록을 줄 방향 순서로 모은다(누른 쪽=힌트에서 흘러가는 파도).
  const empties = [];
  for (let i = 0; i < n; i++) {
    const r = type === 'row' ? idx : i;
    const c = type === 'col' ? idx : i;
    if (cur.board.cells[r][c] === CELL.EMPTY) empties.push([r, c]);
  }
  if (!empties.length) return; // 채울 빈 칸이 없으면 무동작
  pushHistory();
  sound.play('mark');
  // 칸별로 순차 지연을 줘 X가 파도처럼 흘러가며 채워지게 한다.
  empties.forEach(([r, c], k) => {
    setTimeout(() => {
      if (!cur) return;
      cur.board = setCell(cur.board, r, c, CELL.MARKED, cur.solution);
      applyState(boardEl, cur.board, cur.solution);
      markFlow(boardEl, r, c, cur.puzzle.size);
    }, k * ANIM.MARK_STEP_MS);
  });
  setTimeout(() => { if (cur) refresh(); }, empties.length * ANIM.MARK_STEP_MS + 20);
}

function onPaintStart(r, c) {
  cur.completedBefore = lineFlags(cur.board, cur.clues); // 드래그 전 완성 줄 스냅샷
  cur.dragAction = decideAction(r, c);
  cur.cursor = { r, c };
  cur.dragStart = { r, c };
  cur.dragLast = { r, c };
  if (!cur.dragAction) return; // 잠긴 맞은 칸: 히스토리도 남기지 않음
  pushHistory();
  applyAction(r, c);
}
function onPaintMove(r, c) {
  applyAction(r, c);
  cur.dragLast = { r, c };
  // X(표시) 드래그는 칸 수 배지/색 강조를 쓰지 않는다(칠하기 전용).
  const s = cur.dragStart;
  if (s && cur.dragAction !== 'mark') {
    const len = Math.abs(r - s.r) + Math.abs(c - s.c) + 1;
    const coords = [];
    if (r === s.r) {
      for (let cc = Math.min(s.c, c); cc <= Math.max(s.c, c); cc++) coords.push([s.r, cc]);
    } else {
      for (let rr = Math.min(s.r, r); rr <= Math.max(s.r, r); rr++) coords.push([rr, s.c]);
    }
    markDragRun(boardEl, coords, cur.puzzle.size);
    showDragCount(boardEl, el('drag-count'), r, c, cur.puzzle.size, len);
  }
}
function onPaintEnd() {
  clearDragRun();
  hideDragCount(el('drag-count'));
  // 드래그 방향(파도 순서용): 시작→마지막이 오른쪽/아래면 정방향.
  const s = cur.dragStart, last = cur.dragLast;
  const forward = !s || !last ? true : (last.c - s.c) + (last.r - s.r) >= 0;
  const before = cur.completedBefore || lineFlags(cur.board, cur.clues);
  cur.dragStart = null;
  if (isSolved(cur.board, cur.solution)) { win(); return; }
  // 마우스를 놓은 지금, 이번 드래그로 새로 온전히 맞춰진 줄만 하이라이트.
  highlightNewCompletions(before, forward);
}

function win() {
  const stars = currentStars();
  const id = cur.puzzle.id;
  const prev = progress[id];
  const bestMistakes = prev ? Math.min(prev.bestMistakes, cur.board.mistakes) : cur.board.mistakes;
  const bestStars = prev ? Math.max(prev.stars, stars) : stars;
  progress = { ...progress, [id]: { cleared: true, stars: bestStars, bestMistakes } };
  store.set('progress', progress);
  clearInProgress(id);
  // 이 그림은 끝났으니 이어서 할 대상에서 뺀다(끝난 판으로 다시 들어가지 않게).
  frame.save.clearResume();

  el('finger').hidden = true;
  // 다 맞췄으니 모드 버튼을 잠근다(완성 연출 중 조작 방지 + 완료 표현).
  el('mode-fill').disabled = true;
  el('mode-mark').disabled = true;
  clearWaves(boardEl); // 진행 중이던 줄 파도를 지우고 나서 전체 컬러 변신(겹침 방지)
  revealColors(boardEl, cur.puzzle.grid, ANIM.REVEAL_STEP_MS, cur.puzzle.palette);
  setCursor(boardEl, -1, -1, cur.puzzle.size);
  sound.play('clear');
  const waveMs = (cur.puzzle.size * 2) * ANIM.REVEAL_STEP_MS + ANIM.RESULT_DELAY_MS;
  setTimeout(() => {
    // 결과는 전용 화면이 아니라 플레이를 덮는 카드다(규격 3.5). 완성 그림·제목·별점은
    // 글자가 아니라 그림이라 카드 본문에 통째로 넣는다.
    const body = el('result-body').content.cloneNode(true).firstElementChild;
    renderResult(
      body.querySelector('#result-pic'),
      body.querySelector('#result-title'),
      body.querySelector('#result-stars'),
      cur.puzzle, stars,
    );
    frame.result.show({ title: '', bodyEl: body, newRecord: !prev?.cleared });
    frame.screens.go(SCREEN.RESULT);
    sound.playRepeat('star', stars);
  }, waveMs);
}

function nextPuzzle() {
  const idx = PUZZLES.findIndex((p) => p.id === cur.puzzle.id);
  const next = PUZZLES[idx + 1];
  if (next) startPuzzle(next);
  else openMap();
}

// --- 키보드(보조) ---
function moveCursor(dr, dc) {
  const n = cur.puzzle.size;
  cur.cursor.r = Math.min(n - 1, Math.max(0, cur.cursor.r + dr));
  cur.cursor.c = Math.min(n - 1, Math.max(0, cur.cursor.c + dc));
  setCursor(boardEl, cur.cursor.r, cur.cursor.c, n);
}

function onKey(e) {
  if (frame.screens.current() !== SCREEN.PLAY || !cur) return;
  const { r, c } = cur.cursor;
  switch (e.key) {
    case 'ArrowUp': moveCursor(-1, 0); break;
    case 'ArrowDown': moveCursor(1, 0); break;
    case 'ArrowLeft': moveCursor(0, -1); break;
    case 'ArrowRight': moveCursor(0, 1); break;
    case ' ': case 'Enter':
      setMode(MODE.FILL);
      cur.dragAction = decideAction(r, c);
      if (cur.dragAction) { pushHistory(); applyAction(r, c); }
      if (isSolved(cur.board, cur.solution)) win();
      break;
    case 'x': case 'X':
      setMode(MODE.MARK);
      cur.dragAction = decideAction(r, c);
      if (cur.dragAction) { pushHistory(); applyAction(r, c); }
      break;
    case 'z': case 'Z': undo(); break;
    default: return;
  }
  e.preventDefault();
}

// --- 배선 ---
// 음소거 저장·오디오 열기·화면 이탈 처리는 공용 프레임이 맡는다. 다만 이 게임의 플레이 화면은
// 보드를 화면 가득 쓰려고 UI를 네 모서리에 붙이는 구조라, 규격의 상단 띠를 그대로 얹으면
// 보드 공간이 줄고 가로 방향 재배치가 깨진다. 그래서 플레이 화면에서만 띠를 감추고
// 그 자리의 게임 버튼을 프레임에 연결한다(2단계에서 드러난 규격의 빈틈, 기획서에 기록).
// 소리 버튼 아이콘·동기화는 파일 위쪽(프레임 생성 전)에 정의돼 있다 - 프레임이 만들어질 때
// 지난 음소거 상태를 되살리며 곧바로 이 함수를 부르기 때문이다.
function init() {
  const paint = attachBoardInput(boardEl, { onStart: onPaintStart, onMove: onPaintMove, onEnd: onPaintEnd });
  // 두 손가락 확대·이동. 손가락이 둘이 되는 순간 칠하기를 끊고, 그 칠하기가 아주 짧았으면
  // "확대하려다 첫 손가락이 먼저 닿은 것"으로 보고 되돌린다(실수로 세지 않게).
  attachBoardZoom(puzzleEl.parentElement, {
    getCell: () => view.cell,
    setCell: (px) => applyCell(px),
    getLimits: () => ({ min: view.minCell, max: ZOOM.MAX_PX }),
    getClueSize: () => ({ w: el('row-clues').offsetWidth, h: el('col-clues').offsetHeight }),
    onGestureStart: () => {
      const r = paint.cancelDrag();
      if (r.cancelled && r.elapsedMs < ZOOM.CANCEL_MS) undo();
    },
  });
  el('mode-fill').addEventListener('click', () => setMode(MODE.FILL));
  el('mode-mark').addEventListener('click', () => setMode(MODE.MARK));
  // 플레이 화면의 왼쪽 위 화살표도 계단을 따른다 - 한 칸 위(지도)로만 간다.
  el('play-back').addEventListener('click', () => frame.screens.back());
  // 결과 카드 버튼. 이 게임은 "다시 하기"가 같은 그림을 또 푸는 것이 아니라 다음 그림으로
  // 넘어가는 흐름이라 그 자리 문구만 바꾼다(뜻이 다르므로, 규격 5.3 고정 문구 예외).
  frame.result.setActionLabel('retry', '다음 그림');
  frame.result.on('retry', () => nextPuzzle());
  frame.result.on('quit', () => openMap());
  el('sound-toggle').addEventListener('click', () => frame.audio.setMuted(!frame.audio.isMuted()));
  syncPlaySoundBtn(frame.audio.isMuted());
  // 플레이 화면 전용 전체화면 버튼도 같은 공용 모듈에 건다(막힌 기기 안내·자동 복귀 포함).
  setupFullscreen({ button: el('fs-toggle') });
  el('undo-btn').addEventListener('click', undo);
  el('help-btn').addEventListener('click', useHelp);
  // 힌트 숫자 누르면 완성된 줄의 빈 칸을 자동 X로.
  el('row-clues').addEventListener('click', (e) => {
    const line = e.target.closest('.clue-row');
    if (line) fillLineMarks('row', [...el('row-clues').children].indexOf(line));
  });
  el('col-clues').addEventListener('click', (e) => {
    const line = e.target.closest('.clue-col');
    if (line) fillLineMarks('col', [...el('col-clues').children].indexOf(line));
  });
  document.addEventListener('keydown', onKey);
  // 창 크기·방향(가로/세로 회전)·전체화면 전환이 바뀌면 격자를 다시 화면에 맞춘다.
  window.addEventListener('resize', () => { fitBoard(false); updateFinger(); });
  window.addEventListener('orientationchange', () => {
    requestAnimationFrame(() => { fitBoard(false); updateFinger(); });
  });
  const onFsChange = () => requestAnimationFrame(() => { fitBoard(false); updateFinger(); });
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  // 소리 열기·음소거 저장·화면 이탈 시 재우기는 공용 프레임이 이미 하고 있다.

  // 화면이 바뀔 때 옛 CSS가 쓰던 활성 표시를 함께 맞춘다. 이 게임의 레이아웃 규칙이
  // #screen-play.active 같은 선택자에 걸려 있어, 표시 판단은 프레임이 하되 그 결과만 알려준다.
  const syncLegacyActive = (now) => {
    el('screen-map').classList.toggle('active', now === SCREEN.SELECT);
    el('screen-play').classList.toggle('active', now === SCREEN.PLAY || now === SCREEN.PAUSE || now === SCREEN.RESULT);
    if (now === SCREEN.TITLE) refreshTitle();
    if (now === SCREEN.PLAY) requestAnimationFrame(() => { fitBoard(false); updateFinger(); });
  };
  frame.screens.onChange(syncLegacyActive);
  syncLegacyActive(frame.screens.current());

  // 첫 화면은 시작 화면이다(규격 3.2). 지도는 시작을 누른 뒤 나온다.
  refreshTitle();
}

init();
