import { createStorage } from "../../shared/storage.js";
import { showModal, registerServiceWorker } from "../../shared/ui.js";

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

// === DOM 참조 ===
const boardEl = document.getElementById("board");
const timerEl = document.getElementById("timer");
const pauseBtn = document.getElementById("btn-pause");
const eraseBtn = document.getElementById("btn-erase");
const undoBtn = document.getElementById("btn-undo");
const padNumbers = document.getElementById("pad-numbers");
const pageEl = document.querySelector(".page.sudoku");

const store = createStorage("sudoku");

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
  timerEl.textContent = fmtTime(elapsedMs());
  if (!state.cleared) requestAnimationFrame(tickTimer);
}

// === 일시정지 / 클리어 ===
async function togglePause() {
  if (state.cleared) return;
  if (!state.paused) {
    state.paused = true;
    state.pausedAt = performance.now();
    pageEl.classList.add("is-paused");
    pauseBtn.textContent = "▶";
    const choice = await showModal({
      title: "일시정지",
      body: "셀 탭 또는 키보드 1~9 = 입력 / 0·Backspace = 지우기 / 화살표 = 이동 / U = 실행취소 / P·Esc = 일시정지",
      actions: [
        { label: "재개", primary: true, value: "resume" },
        { label: "다시 시작", value: "restart" },
        { label: "메뉴로", value: "menu" },
      ],
    });
    if (choice === "menu") { location.href = "../../"; return; }
    if (choice === "restart") { restart(); return; }
    // resume
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
  const choice = await showModal({
    title: "클리어!",
    body: `시간: ${fmtTime(finalMs)}${isNew ? "  (신기록!)" : ""}`,
    actions: [
      { label: "다시 시작", primary: true, value: "restart" },
      { label: "메뉴로", value: "menu" },
    ],
  });
  if (choice === "menu") { location.href = "../../"; return; }
  restart();
}

function restart() {
  state = newState(DEMO_PUZZLE);
  pauseBtn.textContent = "⏸";
  pageEl.classList.remove("is-paused");
  render();
  requestAnimationFrame(tickTimer);
}

// === 부팅 ===
function init() {
  buildBoard();
  pauseBtn.addEventListener("click", togglePause);
  state = newState(DEMO_PUZZLE);
  // 첫 빈칸 자동 선택(편의)
  for (let i = 0; i < 81; i++) {
    if (!state.given[i]) { state.selected = i; break; }
  }
  render();
  requestAnimationFrame(tickTimer);
}

init();
