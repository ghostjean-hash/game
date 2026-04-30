import { createInput } from "../../shared/input.js";
import { createStorage } from "../../shared/storage.js";
import { createLoop } from "../../shared/loop.js";
import { showModal, registerServiceWorker } from "../../shared/ui.js";

registerServiceWorker("/service-worker.js");

const COLS = 10;
const ROWS = 20;
const VANISH = 2; // 위쪽 보이지 않는 여유 행
const TOTAL_ROWS = ROWS + VANISH;

// 색 (tokens.css의 --c1..7과 시각적으로 매칭)
const COLORS = {
  I: "#7cf3c4",
  O: "#f7c948",
  T: "#b48cff",
  S: "#4ad8a3",
  Z: "#ff6b81",
  J: "#5aa9ff",
  L: "#ffa05c",
};

// 표준 SRS 모양. 4x4 그리드 안에 정의.
// 각 항목 = 회전 상태별 셀 좌표 [ [ [x,y], ... ], ... ]
const SHAPES = {
  I: [
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]],
  ],
  O: [
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
  ],
  T: [
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]],
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]],
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]],
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]],
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]],
  ],
};

// SRS 월킥. JLSTZ 공통.
const KICK_JLSTZ = {
  "0->1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "1->0": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "1->2": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "2->1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "2->3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "3->2": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "3->0": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "0->3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};
const KICK_I = {
  "0->1": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "1->0": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "1->2": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  "2->1": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  "2->3": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "3->2": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "3->0": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  "0->3": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};

const TYPES = ["I","O","T","S","Z","J","L"];

// 7-bag 랜덤
function makeBag() {
  const arr = TYPES.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class Piece {
  constructor(type) {
    this.type = type;
    this.r = 0;
    this.x = 3;
    this.y = 0; // top of 4x4 box (vanish 영역 포함 좌표)
  }
  cells(rotation = this.r) {
    return SHAPES[this.type][rotation].map(([cx, cy]) => [this.x + cx, this.y + cy]);
  }
}

const board = document.getElementById("board");
const ctx = board.getContext("2d");

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const bestEl = document.getElementById("best");
const pauseBtn = document.getElementById("btn-pause");

const store = createStorage("tetris");

let state;

function newState() {
  return {
    grid: Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null)),
    bag: [],
    queue: [],
    current: null,
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    gravity: levelGravity(1),
    softDrop: false,
    fallTimer: 0,
    lockTimer: 0,
    locking: false,
    over: false,
    paused: false,
    flashRows: null, // { rows:[...], t:number }
  };
}

function levelGravity(level) {
  // 초당 셀 수 (정수 단계)
  const speeds = [0, 1, 1.5, 2, 3, 4, 5, 7, 9, 12, 16, 22, 30];
  return speeds[Math.min(level, speeds.length - 1)] || 30;
}

function ensureBag() {
  while (state.queue.length < 5) {
    if (state.bag.length === 0) state.bag = makeBag();
    state.queue.push(state.bag.shift());
  }
}

function spawn(type) {
  const t = type || state.queue.shift();
  ensureBag();
  const p = new Piece(t);
  // 시작 위치 보정 (I는 한 칸 위)
  p.y = (t === "I") ? 0 : 0;
  state.current = p;
  state.canHold = true;
  state.locking = false;
  state.lockTimer = 0;
  if (collides(p, p.x, p.y, p.r)) {
    state.over = true;
  }
}

function collides(p, x, y, r) {
  const cells = SHAPES[p.type][r];
  for (const [cx, cy] of cells) {
    const nx = x + cx;
    const ny = y + cy;
    if (nx < 0 || nx >= COLS || ny >= TOTAL_ROWS) return true;
    if (ny < 0) continue; // 위쪽 vanish 안은 충돌 아님
    if (state.grid[ny][nx]) return true;
  }
  return false;
}

function tryMove(dx, dy) {
  const p = state.current;
  if (!p) return false;
  if (!collides(p, p.x + dx, p.y + dy, p.r)) {
    p.x += dx; p.y += dy;
    if (state.locking && dy === 0) state.lockTimer = 0; // 무브 락 리셋
    if (dy !== 0) {
      state.locking = false;
      state.lockTimer = 0;
    }
    return true;
  }
  return false;
}

function tryRotate(dir) {
  const p = state.current;
  if (!p) return false;
  if (p.type === "O") return true;
  const from = p.r;
  const to = (p.r + (dir > 0 ? 1 : 3)) % 4;
  const key = `${from}->${to}`;
  const table = (p.type === "I") ? KICK_I : KICK_JLSTZ;
  const kicks = table[key] || [[0,0]];
  for (const [kx, ky] of kicks) {
    if (!collides(p, p.x + kx, p.y - ky, to)) {
      p.x += kx;
      p.y -= ky;
      p.r = to;
      state.lockTimer = 0;
      return true;
    }
  }
  return false;
}

function hardDrop() {
  const p = state.current;
  if (!p) return;
  let drop = 0;
  while (!collides(p, p.x, p.y + 1, p.r)) {
    p.y += 1;
    drop += 1;
  }
  state.score += drop * 2;
  lockPiece();
}

function softDropTick(dt) {
  if (!state.softDrop) return;
  state.fallTimer += dt * 20; // 빠른 하강
  step();
}

function step() {
  const p = state.current;
  if (!p) return;
  // 한 칸 단위 적용
  while (state.fallTimer >= 1) {
    if (!collides(p, p.x, p.y + 1, p.r)) {
      p.y += 1;
      state.fallTimer -= 1;
      if (state.softDrop) state.score += 1;
    } else {
      state.fallTimer = 0;
      // 락 진입
      if (!state.locking) {
        state.locking = true;
        state.lockTimer = 0;
      }
      break;
    }
  }
}

function lockPiece() {
  const p = state.current;
  if (!p) return;
  for (const [x, y] of p.cells()) {
    if (y >= 0) state.grid[y][x] = p.type;
  }
  state.current = null;
  // 라인 체크
  const cleared = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    if (state.grid[y].every((c) => c !== null)) cleared.push(y);
  }
  if (cleared.length) {
    state.flashRows = { rows: cleared, t: 0 };
    // 점수 (간단 모델)
    const bonus = [0, 100, 300, 500, 800][cleared.length] * state.level;
    state.score += bonus;
    state.lines += cleared.length;
    const newLevel = 1 + Math.floor(state.lines / 10);
    if (newLevel !== state.level) {
      state.level = newLevel;
      state.gravity = levelGravity(newLevel);
    }
  } else {
    spawn();
  }
}

function applyClear() {
  const rows = state.flashRows.rows;
  for (const r of rows) state.grid.splice(r, 1);
  for (let i = 0; i < rows.length; i++) state.grid.unshift(Array(COLS).fill(null));
  state.flashRows = null;
  spawn();
}

function holdPiece() {
  if (!state.canHold || !state.current) return;
  const cur = state.current.type;
  if (state.hold) {
    const swap = state.hold;
    state.hold = cur;
    spawn(swap);
  } else {
    state.hold = cur;
    spawn();
  }
  state.canHold = false;
}

function ghostY(p) {
  let y = p.y;
  while (!collides(p, p.x, y + 1, p.r)) y += 1;
  return y;
}

// === 렌더 ===
let cellSize = 24;
function resize() {
  const stage = board.parentElement;
  const rect = stage.getBoundingClientRect();
  const padding = 8;
  const maxW = rect.width - padding * 2;
  const maxH = rect.height - padding * 2;
  const sizeByW = Math.floor(maxW / COLS);
  const sizeByH = Math.floor(maxH / ROWS);
  cellSize = Math.max(12, Math.min(sizeByW, sizeByH));
  const dpr = window.devicePixelRatio || 1;
  board.width = COLS * cellSize * dpr;
  board.height = ROWS * cellSize * dpr;
  board.style.width = (COLS * cellSize) + "px";
  board.style.height = (ROWS * cellSize) + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawCell(x, y, color, alpha = 1) {
  const px = x * cellSize;
  const py = (y - VANISH) * cellSize;
  if (py + cellSize <= 0) return; // vanish
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
  // 안쪽 하이라이트
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(px + 1, py + 1, cellSize - 2, 3);
  ctx.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize + 0.5, 0);
    ctx.lineTo(x * cellSize + 0.5, ROWS * cellSize);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize + 0.5);
    ctx.lineTo(COLS * cellSize, y * cellSize + 0.5);
    ctx.stroke();
  }
}

function render() {
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg-elev") || "#161823";
  ctx.fillRect(0, 0, board.width, board.height);
  drawGrid();
  // 고정 블록
  for (let y = 0; y < TOTAL_ROWS; y++) {
    const flash = state.flashRows && state.flashRows.rows.includes(y);
    for (let x = 0; x < COLS; x++) {
      const t = state.grid[y][x];
      if (t) {
        if (flash) {
          const a = 1 - state.flashRows.t / 0.18;
          drawCell(x, y, "#ffffff", Math.max(0, a));
        } else {
          drawCell(x, y, COLORS[t]);
        }
      }
    }
  }
  // 고스트
  if (state.current && !state.over) {
    const p = state.current;
    const gy = ghostY(p);
    const cells = SHAPES[p.type][p.r];
    for (const [cx, cy] of cells) {
      drawCell(p.x + cx, gy + cy, COLORS[p.type], 0.22);
    }
    // 현재 피스
    for (const [x, y] of p.cells()) {
      drawCell(x, y, COLORS[p.type]);
    }
  }
}

// === 입력/루프 ===
let input;
let loop;

function setupInput() {
  input = createInput(board, {
    onTap: () => { if (canPlay()) tryRotate(1); },
    onSwipe: (dir) => {
      if (!canPlay()) return;
      if (dir === "left") tryMove(-1, 0);
      else if (dir === "right") tryMove(1, 0);
      else if (dir === "down") hardDrop();
      else if (dir === "up") holdPiece();
    },
    onHold: () => { if (canPlay()) holdPiece(); },
    onKey: (key, ev) => {
      if (ev.type !== "keydown") return;
      if (!canPlay()) {
        if (key.toLowerCase() === "p" || key === "Escape") togglePause();
        return;
      }
      switch (key) {
        case "ArrowLeft": tryMove(-1, 0); break;
        case "ArrowRight": tryMove(1, 0); break;
        case "ArrowDown": state.softDrop = true; break;
        case "ArrowUp":
        case "x":
        case "X":
          tryRotate(1); break;
        case "z":
        case "Z":
        case "Control":
          tryRotate(-1); break;
        case " ":
          ev.preventDefault?.();
          hardDrop(); break;
        case "Shift":
        case "c":
        case "C":
          holdPiece(); break;
        case "p":
        case "P":
        case "Escape":
          togglePause(); break;
      }
    },
  });
  // softDrop 해제 (keyup도 onKey로 옴)
  window.addEventListener("keyup", (ev) => {
    if (ev.key === "ArrowDown") state.softDrop = false;
  });
}

function canPlay() {
  return state && !state.over && !state.paused && !state.flashRows;
}

function update(dt) {
  if (state.paused || state.over) return;
  if (state.flashRows) {
    state.flashRows.t += dt;
    if (state.flashRows.t >= 0.18) applyClear();
    return;
  }
  if (!state.current) return;

  // 중력
  state.fallTimer += dt * (state.softDrop ? state.gravity * 6 : state.gravity);
  step();
  softDropTick(dt);

  // 락 딜레이
  if (state.locking) {
    state.lockTimer += dt;
    if (state.lockTimer >= 0.5) {
      lockPiece();
    }
  }
}

function updateHud() {
  scoreEl.textContent = state.score;
  linesEl.textContent = state.lines;
  levelEl.textContent = state.level;
  const best = store.get("highscore", 0);
  bestEl.textContent = best;
}

async function gameOver() {
  const best = store.get("highscore", 0);
  if (state.score > best) store.set("highscore", state.score);
  updateHud();
  const choice = await showModal({
    title: "Game Over",
    body: `점수 ${state.score} · 라인 ${state.lines} · 레벨 ${state.level}`,
    actions: [
      { label: "다시 시작", primary: true, value: "restart" },
      { label: "메뉴로", value: "menu" },
    ],
  });
  if (choice === "restart") restart();
  else location.href = "../../";
}

async function togglePause() {
  if (state.over) return;
  state.paused = true;
  pauseBtn.textContent = "재개";
  const choice = await showModal({
    title: "일시정지",
    body: "계속 플레이하려면 재개를 누르세요.",
    actions: [
      { label: "재개", primary: true, value: "resume" },
      { label: "다시 시작", value: "restart" },
      { label: "메뉴로", value: "menu" },
    ],
  });
  if (choice === "menu") { location.href = "../../"; return; }
  if (choice === "restart") { restart(); return; }
  state.paused = false;
  pauseBtn.textContent = "일시정지";
}

function restart() {
  state = newState();
  ensureBag();
  spawn();
  updateHud();
  pauseBtn.textContent = "일시정지";
}

function tickHud() {
  updateHud();
  if (state.over) gameOver();
}

function init() {
  state = newState();
  ensureBag();
  spawn();
  updateHud();
  setupInput();
  resize();
  window.addEventListener("resize", resize);
  pauseBtn.addEventListener("click", togglePause);

  loop = createLoop({
    update: (dt) => { update(dt); tickHud(); },
    render: () => render(),
  });
  loop.start();
}

init();
