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
  state.undo.push({ cell: i, before: state.cells[i] });
  state.cells[i] = value;
  return true;
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
