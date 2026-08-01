import { createStorage } from "../../shared/storage.js";
import { registerServiceWorker } from "../../shared/ui.js";
import { setupFullscreen } from "../../shared/fullscreen.js";
import { createGameFrame, SCREEN } from "../../shared/frame/index.js";

registerServiceWorker("/service-worker.js");

// === 사전 퍼즐 (M1 데모용 1개, L1 입문 수준) ===
// 단서 54개 / 빈칸 27. 행/열/박스 검토만으로 풀 수 있는 수준.
const DEMO_PUZZLE = {
  difficulty: 1,
  given: [
    5,0,4, 0,7,8, 9,1,0,
    6,7,0, 1,0,5, 3,0,8,
    0,9,8, 3,0,2, 0,6,7,

    8,5,0, 7,6,0, 4,0,3,
    0,2,6, 8,0,3, 7,9,0,
    7,0,3, 0,2,4, 0,5,6,

    9,6,0, 5,3,0, 2,8,0,
    0,8,7, 4,1,9, 0,3,5,
    3,0,5, 2,8,0, 1,7,9,
  ],
  solution: [
    5,3,4, 6,7,8, 9,1,2,
    6,7,2, 1,9,5, 3,4,8,
    1,9,8, 3,4,2, 5,6,7,

    8,5,9, 7,6,1, 4,2,3,
    4,2,6, 8,5,3, 7,9,1,
    7,1,3, 9,2,4, 8,5,6,

    9,6,1, 5,3,7, 2,8,4,
    2,8,7, 4,1,9, 6,3,5,
    3,4,5, 2,8,6, 1,7,9,
  ],
};

// 시작 화면 배경. 배경 그림도 캐릭터도 없는 게임이라 9칸 판 자체가 배경이 된다
// (규격 4.8-5, 기획서 Ⅰ권 6.4). 실제로 들어 있는 입문 문제를 그려 - 진한 숫자가 처음부터
// 있던 단서이고 흐린 숫자가 사람이 채운 자리다.
function titleBackdrop() {
  const wrap = document.createElement("div");
  wrap.className = "title-grid";
  for (let i = 0; i < 81; i += 1) {
    const cell = document.createElement("i");
    const given = DEMO_PUZZLE.given[i];
    cell.textContent = given || DEMO_PUZZLE.solution[i];
    if (!given) cell.className = "filled";
    wrap.appendChild(cell);
  }
  return wrap;
}

// === DOM 참조 ===
const boardEl = document.getElementById("board");
const timerEl = document.getElementById("timer");
const pauseBtn = document.getElementById("btn-pause");
const eraseBtn = document.getElementById("btn-erase");
const undoBtn = document.getElementById("btn-undo");
const padNumbers = document.getElementById("pad-numbers");
const pageEl = document.querySelector(".page.sudoku");

const store = createStorage("sudoku");

// === 공용 프레임(html-game 표준 4.8) ===
// 시작 화면·상단 띠·잠깐 멈춤·결과 카드·되돌아가기 계단·소리를 여기서 한 번에 받는다.
// 이 게임은 다섯 중 유일한 흰 바탕이라 같은 규격을 밝은 톤으로 뒤집어 쓴다(light: true).
// 난이도 고르는 칸은 두지 않는다 - 지금 들어 있는 문제가 입문 하나뿐이라, 고를 것이 없는
// 칸을 만들면 눌러도 아무 일이 없는 죽은 입력이 된다. 문제가 늘면 그때 choices로 세운다.
// 소리는 이 게임에 원래 없었다. 공용 그릇의 기본 음(누름·시작·완성)을 그대로 쓴다.
const frame = createGameFrame({
  root: document.getElementById("app"),
  gameId: "sudoku",
  title: "스도쿠",
  tagline: "스마트 힌트로 배우는 스도쿠",
  light: true,
  background: { className: "title-deco", el: titleBackdrop() },
  buttons: ["sound", "fullscreen"],   // 환경설정 항목이 아직 없는 게임이라 그 자리를 만들지 않는다
  resume: { enabled: false, detail: "" },
  onStart: () => startGame(),
  onResume: () => resumeSaved(),
});

// === 상태 ===
let state;

function newState(puzzle) {
  return {
    puzzle,
    given: puzzle.given.map((v) => v !== 0),
    cells: puzzle.given.slice(),
    selected: null,
    paused: false,
    cleared: false,
    timerStart: performance.now(),
    pausedAt: null,
    pausedTotal: 0,
    undo: [],
    lastChanged: null, // 마지막으로 값이 변경된 셀 인덱스 (클리어 확산 중심)
  };
}

// === 좌표 헬퍼 ===
const rowOf = (i) => Math.floor(i / 9);
const colOf = (i) => i % 9;
const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

// === 보드 렌더(1회) ===
const cellEls = []; // index -> element

function buildBoard() {
  boardEl.innerHTML = "";
  for (let i = 0; i < 81; i++) {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "cell";
    c.dataset.index = String(i);
    c.setAttribute("role", "gridcell");
    c.setAttribute("aria-label", `${rowOf(i)+1}행 ${colOf(i)+1}열`);
    // 3x3 박스 경계
    const r = rowOf(i), col = colOf(i);
    if (col === 2 || col === 5) c.classList.add("b-right");
    if (r === 2 || r === 5) c.classList.add("b-bottom");
    c.addEventListener("click", () => onCellClick(i));
    boardEl.appendChild(c);
    cellEls.push(c);
  }
}

// === 룰 검증: 위반 셀 인덱스 Set 반환 ===
function getViolations() {
  const bad = new Set();
  // 같은 행/열/박스에 같은 값이 두 곳 이상이면 모두 표시
  const groups = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) row.push(r * 9 + c);
    groups.push(row);
  }
  for (let c = 0; c < 9; c++) {
    const col = [];
    for (let r = 0; r < 9; r++) col.push(r * 9 + c);
    groups.push(col);
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box = [];
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          box.push((br * 3 + dr) * 9 + (bc * 3 + dc));
        }
      }
      groups.push(box);
    }
  }
  for (const g of groups) {
    const seen = new Map(); // value -> index
    for (const i of g) {
      const v = state.cells[i];
      if (!v) continue;
      if (seen.has(v)) {
        bad.add(i);
        bad.add(seen.get(v));
      } else {
        seen.set(v, i);
      }
    }
  }
  return bad;
}

// === 클리어 판정 ===
function checkCleared(violations) {
  for (let i = 0; i < 81; i++) if (!state.cells[i]) return false;
  return violations.size === 0;
}

// === 렌더(상태 → 화면) ===
function render() {
  const sel = state.selected;
  const selRow = sel != null ? rowOf(sel) : -1;
  const selCol = sel != null ? colOf(sel) : -1;
  const selBox = sel != null ? boxOf(sel) : -1;
  const selVal = sel != null ? state.cells[sel] : 0;
  const violations = getViolations();

  for (let i = 0; i < 81; i++) {
    const el = cellEls[i];
    const v = state.cells[i];
    el.textContent = v ? String(v) : "";
    el.classList.toggle("given", state.given[i]);
    el.classList.toggle("user", !state.given[i] && v !== 0);
    el.classList.toggle("error", violations.has(i));
    // 영역 하이라이트
    const inRelated = sel != null && (rowOf(i) === selRow || colOf(i) === selCol || boxOf(i) === selBox);
    el.classList.toggle("related", inRelated && i !== sel);
    el.classList.toggle("same-num", selVal !== 0 && v === selVal && i !== sel);
    el.classList.toggle("selected", i === sel);
  }
  // 패드: 9개 모두 채워진 숫자는 흐리게
  const counts = [0,0,0,0,0,0,0,0,0,0];
  for (const v of state.cells) if (v) counts[v]++;
  padNumbers.querySelectorAll(".pad-num").forEach((btn) => {
    const n = Number(btn.dataset.num);
    btn.classList.toggle("depleted", counts[n] >= 9);
  });
  // 클리어 처리
  if (!state.cleared && checkCleared(violations)) {
    state.cleared = true;
    onCleared();
  }
}

// === 입력 ===
function onCellClick(i) {
  if (state.paused || state.cleared) return;
  state.selected = i;
  render();
}

function setCell(i, value) {
  frame.audio.play("tap");
  if (state.given[i]) return false;
  if (state.cells[i] === value) return false;
  const prev = state.cells.slice();
  state.undo.push({ cell: i, before: state.cells[i] });
  state.cells[i] = value;
  state.lastChanged = i;
  // 새로 완성된 행/열/박스가 있으면 웨이브 펄스. 지우기(0)는 트리거 안 함.
  if (value !== 0) {
    const comp = detectNewCompletions(prev, state.cells);
    if (comp.rows.length || comp.cols.length || comp.boxes.length) {
      triggerCompletionPulse(comp);
    }
  }
  return true;
}

// === 완성 감지 ===
function isGroupComplete(indices, cells) {
  const seen = new Set();
  for (const i of indices) {
    const v = cells[i];
    if (!v) return false;
    if (seen.has(v)) return false;
    seen.add(v);
  }
  return seen.size === 9;
}

function detectNewCompletions(prev, next) {
  const rows = [], cols = [], boxes = [];
  for (let r = 0; r < 9; r++) {
    const idx = [];
    for (let c = 0; c < 9; c++) idx.push(r * 9 + c);
    if (!isGroupComplete(idx, prev) && isGroupComplete(idx, next)) rows.push(r);
  }
  for (let c = 0; c < 9; c++) {
    const idx = [];
    for (let r = 0; r < 9; r++) idx.push(r * 9 + c);
    if (!isGroupComplete(idx, prev) && isGroupComplete(idx, next)) cols.push(c);
  }
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3, bc = (b % 3) * 3;
    const idx = [];
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) idx.push((br + dr) * 9 + (bc + dc));
    if (!isGroupComplete(idx, prev) && isGroupComplete(idx, next)) boxes.push(b);
  }
  return { rows, cols, boxes };
}

// === 펄스 적용 ===
const LINE_STEP_MS = 50;
const CLEAR_STEP_MS = 70;
const PULSE_LINE_DURATION = 520;
const PULSE_CLEAR_DURATION = 800;

function applyPulse(delays, klass, durationMs) {
  let maxDelay = 0;
  for (const [i, d] of delays.entries()) {
    if (d > maxDelay) maxDelay = d;
    const el = cellEls[i];
    el.classList.remove(klass);
    el.style.setProperty("--pulse-delay", `${d}ms`);
    // 강제 reflow로 애니메이션 재시작
    void el.offsetWidth;
    el.classList.add(klass);
  }
  // 가장 늦은 펄스가 끝난 후 클래스 제거(중첩 방지)
  setTimeout(() => {
    for (const [i] of delays.entries()) cellEls[i].classList.remove(klass);
  }, maxDelay + durationMs + 50);
}

function triggerCompletionPulse(comp) {
  // 행/열은 같은 클래스(pulse-line), 박스는 별도(pulse-box)로 톤 차별.
  // 동일 셀에 두 트리거 겹치면 더 짧은 delay 채택.
  const lineDelays = new Map();
  const boxDelays = new Map();
  for (const r of comp.rows) {
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c;
      const d = c * LINE_STEP_MS;
      if (!lineDelays.has(i) || lineDelays.get(i) > d) lineDelays.set(i, d);
    }
  }
  for (const c of comp.cols) {
    for (let r = 0; r < 9; r++) {
      const i = r * 9 + c;
      const d = r * LINE_STEP_MS;
      if (!lineDelays.has(i) || lineDelays.get(i) > d) lineDelays.set(i, d);
    }
  }
  for (const b of comp.boxes) {
    const br = Math.floor(b / 3) * 3, bc = (b % 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const i = (br + dr) * 9 + (bc + dc);
        const d = (dr * 3 + dc) * LINE_STEP_MS;
        if (!boxDelays.has(i) || boxDelays.get(i) > d) boxDelays.set(i, d);
      }
    }
  }
  if (lineDelays.size) applyPulse(lineDelays, "pulse-line", PULSE_LINE_DURATION);
  if (boxDelays.size) applyPulse(boxDelays, "pulse-box", PULSE_LINE_DURATION);
}

function triggerClearPulse(centerIdx) {
  const idx = centerIdx == null ? 40 : centerIdx;
  const r0 = Math.floor(idx / 9), c0 = idx % 9;
  const delays = new Map();
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    const dist = Math.max(Math.abs(r - r0), Math.abs(c - c0)); // 체비셰프 거리
    delays.set(i, dist * CLEAR_STEP_MS);
  }
  applyPulse(delays, "pulse-clear", PULSE_CLEAR_DURATION);
  // 기준 셀(마지막 입력)은 별도 클래스로 더 강하게 빛나서 시작점을 명확히.
  const origin = cellEls[idx];
  origin.classList.remove("pulse-clear-origin");
  void origin.offsetWidth; // 애니메이션 재시작 트릭
  origin.classList.add("pulse-clear-origin");
  setTimeout(() => origin.classList.remove("pulse-clear-origin"), 1050);
}

function inputNumber(n) {
  if (state.paused || state.cleared) return;
  if (state.selected == null) return;
  if (setCell(state.selected, n)) render();
}

function eraseCell() {
  if (state.paused || state.cleared) return;
  if (state.selected == null) return;
  if (setCell(state.selected, 0)) render();
}

function undo() {
  if (state.paused || state.cleared) return;
  const step = state.undo.pop();
  if (!step) return;
  state.cells[step.cell] = step.before;
  state.selected = step.cell;
  render();
}

// === 셀 이동(키보드) ===
function moveSelection(dx, dy) {
  if (state.paused || state.cleared) return;
  let i = state.selected;
  if (i == null) { state.selected = 40; render(); return; } // 중앙
  const r = rowOf(i), c = colOf(i);
  const nr = Math.max(0, Math.min(8, r + dy));
  const nc = Math.max(0, Math.min(8, c + dx));
  state.selected = nr * 9 + nc;
  render();
}

// === 키보드 ===
window.addEventListener("keydown", (ev) => {
  // 일시정지 토글은 paused 상태에서도 동작
  if (ev.key === "p" || ev.key === "P" || ev.key === "Escape") {
    ev.preventDefault();
    togglePause();
    return;
  }
  if (state.paused || state.cleared) return;
  if (ev.key >= "1" && ev.key <= "9") {
    inputNumber(Number(ev.key));
  } else if (ev.key === "0" || ev.key === "Backspace" || ev.key === "Delete") {
    eraseCell();
  } else if (ev.key === "ArrowLeft") { ev.preventDefault(); moveSelection(-1, 0); }
  else if (ev.key === "ArrowRight") { ev.preventDefault(); moveSelection(1, 0); }
  else if (ev.key === "ArrowUp") { ev.preventDefault(); moveSelection(0, -1); }
  else if (ev.key === "ArrowDown") { ev.preventDefault(); moveSelection(0, 1); }
  else if (ev.key === "u" || ev.key === "U") { undo(); }
});

// === 패드 ===
padNumbers.addEventListener("click", (ev) => {
  const t = ev.target;
  if (!(t instanceof HTMLElement)) return;
  const n = Number(t.dataset.num);
  if (!n) return;
  inputNumber(n);
});
eraseBtn.addEventListener("click", eraseCell);
undoBtn.addEventListener("click", undo);

// === 타이머 ===
function elapsedMs() {
  const now = performance.now();
  const paused = state.paused && state.pausedAt != null ? (now - state.pausedAt) : 0;
  return now - state.timerStart - state.pausedTotal - paused;
}
function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
function tickTimer() {
  // 시작 화면·결과 카드에서는 시계를 돌리지 않는다(예전에는 판이 늘 하나 돌고 있었다).
  if (!state || state.cleared) return;
  if (frame.screens.current() !== SCREEN.PLAY && frame.screens.current() !== SCREEN.PAUSE) return;
  timerEl.textContent = fmtTime(elapsedMs());
  requestAnimationFrame(tickTimer);
}

// === 잠깐 멈춤 / 클리어 ===
// 카드는 공용 프레임이 갖고 있고 여기서는 화면만 옮긴다(규격 4.8-8).
// 조작 안내는 카드 본문에 담아 예전 알림창이 하던 역할을 그대로 잇는다.
function togglePause() {
  if (!state || state.cleared) return;
  if (frame.screens.current() === SCREEN.PAUSE) frame.screens.back();
  else frame.screens.go(SCREEN.PAUSE);
}

// 화면이 잠깐 멈춤으로 갈 때·나올 때 게임 상태와 시계를 맞춘다.
// 화면을 벗어나 자동으로 멈춤이 된 경우도 같은 자리를 지난다.
function applyPauseState(paused) {
  if (!state || state.cleared) return;
  if (paused) {
    if (state.paused) return;
    state.paused = true;
    state.pausedAt = performance.now();
    pageEl.classList.add("is-paused");
    pauseBtn.textContent = "▶";
    saveResume();       // 규격이 정한 저장 시점 하나(플레이 → 잠깐 멈춤)
  } else {
    if (!state.paused) return;
    state.pausedTotal += performance.now() - state.pausedAt;
    state.pausedAt = null;
    state.paused = false;
    pageEl.classList.remove("is-paused");
    pauseBtn.textContent = "⏸";
  }
}

async function onCleared() {
  // 타이머 동결
  const finalMs = elapsedMs();
  timerEl.textContent = fmtTime(finalMs);
  // 라인/박스 펄스가 확산 위에 겹쳐 기준점을 흐리지 않도록 즉시 정리.
  for (const el of cellEls) {
    el.classList.remove("pulse-line", "pulse-box");
  }
  // 한 프레임 대기 후 확산 시작(시작점이 깔끔하게 보이도록).
  await new Promise((r) => requestAnimationFrame(() => r()));
  // 마지막 입력 셀 기준 확산 펄스
  triggerClearPulse(state.lastChanged);
  // 가장 먼 셀(체비셰프 거리 최대 8) + animation duration까지 보여준 뒤 모달 노출
  const maxDist = 8;
  await new Promise((r) => setTimeout(r, maxDist * CLEAR_STEP_MS + PULSE_CLEAR_DURATION + 50));
  // 베스트 갱신(M1: 단순 시간 기록)
  const key = `best.${state.puzzle.difficulty}.classic`;
  const prev = store.get(key, null);
  const isNew = !prev || finalMs < prev.time;
  if (isNew) store.set(key, { time: finalMs, date: new Date().toISOString() });
  // 다 풀었으니 이어서 할 것이 없다. 지우지 않으면 끝난 판으로 다시 들어간다.
  frame.save.clearResume();
  frame.audio.play("clear");
  // 결과는 알림창이 아니라 플레이를 덮는 카드다(규격 4.8-8).
  frame.result.show({
    title: "클리어!",
    lines: [
      { label: "시간", value: fmtTime(finalMs), highlight: isNew },
      { label: "최단", value: prev && !isNew ? fmtTime(prev.time) : fmtTime(finalMs) },
    ],
    newRecord: isNew,
  });
  frame.screens.go(SCREEN.RESULT);
}

function restart() {
  state = newState(DEMO_PUZZLE);
  pauseBtn.textContent = "⏸";
  pageEl.classList.remove("is-paused");
  selectFirstBlank();
  render();
  requestAnimationFrame(tickTimer);
}

// 첫 빈칸 자동 선택(편의).
function selectFirstBlank() {
  for (let i = 0; i < 81; i += 1) {
    if (!state.given[i]) { state.selected = i; return; }
  }
}

// === 이어서 하기 ===
// 규격이 정한 저장 시점은 둘이다 - 플레이에서 잠깐 멈춤으로 갈 때, 그리고 판이 끝날 때.
// 채운 숫자와 흐른 시간을 담아 두면 다음 방문의 시작 화면에서 이어서 하기가 눌린다.
function saveResume() {
  if (!state || state.cleared) return;
  const filled = state.cells.filter((v, i) => v && !state.given[i]).length;
  const blanks = state.given.filter((g) => !g).length;
  frame.save.saveResume(
    { cells: state.cells.slice(), elapsed: elapsedMs() },
    `${diffLabelText()} · ${filled} / ${blanks}칸 채움`,
  );
}

function resumeSaved() {
  const saved = frame.save.readResume();
  if (!saved || !Array.isArray(saved.data?.cells)) { startGame(); return; }
  state = newState(DEMO_PUZZLE);
  state.cells = saved.data.cells.slice();
  // 흐른 시간을 되살린다. 시계는 시작 시각을 뒤로 밀어 표현한다.
  state.timerStart = performance.now() - (saved.data.elapsed || 0);
  selectFirstBlank();
  render();
  frame.screens.go(SCREEN.PLAY);
  requestAnimationFrame(tickTimer);
}

function diffLabelText() {
  const el = document.getElementById("diff-label");
  return el ? el.textContent : "입문";
}

// 시작 화면 기록 줄과 이어서 하기 칸을 지금 상태로 맞춘다.
function refreshTitle() {
  // 기록이 없으면 그 자리에 한 줄 소개를 둔다. '기록 없음'만 뜨는 첫 화면은 비어 보인다.
  const best = store.get(`best.${DEMO_PUZZLE.difficulty}.classic`, null);
  frame.title.setRecord(best ? `최단 기록 ${fmtTime(best.time)}` : "스마트 힌트로 배우는 스도쿠");
  const saved = frame.save.readResume();
  frame.title.setResume({
    enabled: !!(saved && Array.isArray(saved.data?.cells)),
    detail: saved && saved.detail ? saved.detail : "풀던 문제 없음",
  });
}

// 새 판 시작.
function startGame() {
  frame.save.clearResume();
  restart();
  frame.screens.go(SCREEN.PLAY);
}

// === 부팅 ===
function init() {
  buildBoard();
  // 이 게임의 플레이 화면을 프레임에 등록한다. 등록하지 않으면 표시를 가르는 기준이 없어
  // 시작 화면 위에 보드와 숫자 패드가 그대로 겹쳐 보인다.
  frame.screens.register(SCREEN.PLAY, document.getElementById("screen-play"));
  pauseBtn.addEventListener("click", togglePause);
  // 전체화면 버튼은 공용 상단 띠에 있고 프레임이 이미 같은 모듈에 걸어 두었다.
  // 잠깐 멈춤·결과 카드 버튼을 이 게임 흐름에 잇는다.
  frame.pause.setLines([
    "셀 탭 또는 키보드 1~9 = 입력",
    "0·Backspace = 지우기 / 화살표 = 이동",
    "U = 실행취소 / P·Esc = 잠깐 멈춤",
  ]);
  frame.pause.on("continue", () => frame.screens.back());
  frame.pause.on("restart", () => { restart(); frame.screens.go(SCREEN.PLAY); });
  frame.pause.on("quit", () => { saveResume(); frame.screens.go(SCREEN.TITLE); });
  frame.result.on("retry", () => { restart(); frame.screens.go(SCREEN.PLAY); });
  frame.result.on("quit", () => frame.screens.go(SCREEN.TITLE));

  frame.screens.onChange((now) => {
    if (now === SCREEN.PAUSE) applyPauseState(true);
    else if (now === SCREEN.PLAY) applyPauseState(false);
    if (now === SCREEN.TITLE) refreshTitle();
  });

  // 보드는 미리 만들어 두되 시계는 시작을 누른 뒤에 돌기 시작한다.
  state = newState(DEMO_PUZZLE);
  selectFirstBlank();
  render();
  // 첫 화면은 시작 화면이다(규격 4.8-1). 예전에는 열면 곧바로 퍼즐이 떴다.
  refreshTitle();
}

init();
