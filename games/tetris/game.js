import { createInput } from "../../shared/input.js";
import { createStorage } from "../../shared/storage.js";
import { createLoop } from "../../shared/loop.js";
import { showModal, showToast, registerServiceWorker } from "../../shared/ui.js";
import * as sound from "./sound.js";

registerServiceWorker("/service-worker.js");

const CONTROLS_HELP =
  "터치: 좌우 드래그 이동 · 탭 회전 · 아래 드래그 빨리 내리기 · 위 스와이프 즉시 내리기\n" +
  "키보드: ←→ 이동 · ↑/X 회전 · Z 반대회전 · ↓ 소프트드롭 · Space 하드드롭 · Shift/C 홀드 · P 일시정지";

const COLS = 10;
const ROWS = 20;
const VANISH = 2; // 위쪽 보이지 않는 여유 행
const TOTAL_ROWS = ROWS + VANISH;
const LOCK_DELAY = 0.5;       // 락 딜레이 (초)
const LOCK_RESET_MAX = 15;    // 정통 SRS Move/Rotate Reset Limit
const SOFT_DROP_MULT = 20;    // 소프트드롭 가속 배수 (정통 SRS *20G 정렬)

// === T-spin (docs/tspin.md) ===
const T_SPIN_BIG_KICK_INDEX = 4; // KICK_JLSTZ table 인덱스 4. TST 격상 판정용 (Mini → 정식).
const T_SPIN_SCORE = {
  miniNoLine: 100,
  miniSingle: 200,
  noLine: 400,
  single: 800,
  double: 1200,
  triple: 1600,
};
const B2B_MULT = 1.5;          // T-spin Lines / Tetris 연속 시 점수 배수 (Tetris Guideline)
const TOAST_TSPIN_MS = 1400;

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
const levelLabelEl = document.getElementById("level-label");
const linesLabelEl = document.getElementById("lines-label");
const bestEl = document.getElementById("best");
const pauseBtn = document.getElementById("btn-pause");
const fsBtn = document.getElementById("btn-fs");
const muteBtn = document.getElementById("btn-mute");
const nextEl = document.getElementById("next");
const nextCtx = nextEl?.getContext("2d") || null;
const holdEl = document.getElementById("hold");
const holdCtx = holdEl?.getContext("2d") || null;

const store = createStorage("tetris");

let state;

function newState(mode = getCurrentMode()) {
  return {
    mode,
    grid: Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null)),
    bag: [],
    queue: [],
    current: null,
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    gravity: MODES[mode].gravity(1),
    softDrop: false,
    fallTimer: 0,
    lockTimer: 0,
    locking: false,
    lockResets: 0,            // 락 한 번 동안 lockTimer를 리셋한 횟수. LOCK_RESET_MAX 도달 시 더 이상 리셋 안 함(정통 SRS Move/Rotate Reset Limit).
    lastMoveWasRotation: false, // T-spin 후보 가드. 마지막 동작이 회전이어야 T-spin 인정.
    lastKickIndex: -1,        // 마지막 회전에서 사용한 kick table 인덱스. TST 격상 판정용.
    b2bChain: 0,              // T-spin Lines / Tetris 연속 카운트. 일반 라인이 끼면 0으로 리셋.
    over: false,
    overHandled: false,
    paused: false,
    flashRows: null, // { rows:[...], t:number }
    capNoticed: false,
    elapsed: 0,       // 활성 게임 시간(초). 일시정지/플래시 동안에도 누적은 update 분기에서 결정
    finished: false,  // 모드 종료 조건 충족 (예: 스프린트 40라인). over=true와 함께 set
  };
}

// 난이도 1차 패치 (docs/difficulty-redesign.md): 곡선 완만화 + 모바일 L10/PC L12 캡 + 모바일 시작 보정.
const SPEED_CURVE_MOBILE = [0, 0.91, 1.05, 1.22, 1.67, 2.04, 2.56, 3.23, 3.85, 4.55, 5.00];
const SPEED_CURVE_PC = [0, 1.00, 1.18, 1.39, 1.67, 2.04, 2.56, 3.23, 3.85, 4.55, 5.00, 5.71, 6.67];
const CAP_LEVEL_MOBILE = 10;
const CAP_LEVEL_PC = 12;

function isCoarsePointer() {
  return matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

function levelGravity(level) {
  const mobile = isCoarsePointer();
  const curve = mobile ? SPEED_CURVE_MOBILE : SPEED_CURVE_PC;
  const cap = mobile ? CAP_LEVEL_MOBILE : CAP_LEVEL_PC;
  return curve[Math.min(level, cap)];
}

function applyLevelChange(newLevel) {
  const mode = MODES[state.mode];
  if (!mode.levelUp) return;
  if (newLevel === state.level) return;
  state.level = newLevel;
  state.gravity = mode.gravity(newLevel);
  sound.play("levelup");
  if (!mode.capToast) return;
  const cap = isCoarsePointer() ? CAP_LEVEL_MOBILE : CAP_LEVEL_PC;
  if (!state.capNoticed && newLevel >= cap) {
    state.capNoticed = true;
    showToast("리듬에 들어왔다.", 1800);
  }
}

// === 모드 시스템 (docs/difficulty-redesign.md 4장) ===
const MODE_MARATHON = "marathon";
const MODE_ZEN = "zen";
const MODE_SPRINT = "sprint";
const MODE_KIDS = "kids";
const VALID_MODES = [MODE_MARATHON, MODE_ZEN, MODE_SPRINT, MODE_KIDS];

const ZEN_GRAVITY = 1 / 0.500;        // 0.500초/라인 (기획서 4.2.1)
const SPRINT_GRAVITY = 1 / 0.300;     // 0.300초/라인 (기획서 4.3.1)
const SPRINT_TARGET_LINES = 40;       // 기획서 4.3.2
const KIDS_GRAVITY = 1 / 2.000;       // 2.000초/라인. 초보(초등) 여유 학습용. 젠보다 4배 느림.
const KIDS_HINT_MIN = 1;              // 완성까지 남은 빈칸이 이 값 이상 (수학 힌트 표시 하한)
const KIDS_HINT_MAX = 3;              // 이하일 때만 "몇 칸 더" 힌트 노출. 임박 행만 강조해 산만함 회피.
const KIDS_CHEERS = ["잘했어! 🎉", "멋져! ✨", "최고야! 👍", "대단해! 🌟"];

const MODES = {
  [MODE_MARATHON]: {
    label: "마라톤",
    levelUp: true,
    gravity: (lv) => levelGravity(lv),
    capToast: true,
    endCondition: () => false,
    hud: "level",
  },
  [MODE_ZEN]: {
    label: "젠",
    levelUp: false,
    gravity: () => ZEN_GRAVITY,
    capToast: false,
    endCondition: () => false,
    hud: "zen",
  },
  [MODE_SPRINT]: {
    label: "스프린트",
    levelUp: false,
    gravity: () => SPRINT_GRAVITY,
    capToast: false,
    endCondition: (st) => st.lines >= SPRINT_TARGET_LINES,
    hud: "sprint",
  },
  [MODE_KIDS]: {
    label: "배움",
    levelUp: false,          // 가속 없음. 좌절 없이 감각 익히기.
    gravity: () => KIDS_GRAVITY,
    capToast: false,
    endCondition: () => false, // 시간·라인 종료 없음. 천장에 닿을 때(top-out)만 종료.
    hud: "kids",
  },
};

function getCurrentMode() {
  const m = new URL(location.href).searchParams.get("mode");
  return VALID_MODES.includes(m) ? m : MODE_MARATHON;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const t = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${t}`;
}

function setupHudLabels() {
  if (!levelLabelEl || !linesLabelEl) return;
  const hud = MODES[state.mode].hud;
  if (hud === "level") {
    levelLabelEl.textContent = "LV";
    linesLabelEl.textContent = "L";
  } else if (hud === "zen") {
    levelLabelEl.textContent = "젠";
    linesLabelEl.textContent = "L";
  } else if (hud === "sprint") {
    levelLabelEl.textContent = "⏱";
    linesLabelEl.textContent = "남";
  } else if (hud === "kids") {
    levelLabelEl.textContent = "모드";
    linesLabelEl.textContent = "줄";
  }
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
  state.current = p;
  state.canHold = true;
  state.locking = false;
  state.lockTimer = 0;
  state.lockResets = 0;
  state.lastMoveWasRotation = false;
  state.lastKickIndex = -1;
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

// 이동/회전 성공 후 락 상태 갱신. 정통 SRS 락 딜레이 룰 정렬.
//   - 새 위치 아래가 비어 있으면 → locking 해제(공중 락 방지). 다시 fall.
//   - 여전히 바닥이면 → lockTimer 리셋. 단 리셋 한도(LOCK_RESET_MAX) 도달하면 리셋 안 함.
function refreshLockAfterMove() {
  if (!state.locking || !state.current) return;
  const p = state.current;
  if (!collides(p, p.x, p.y + 1, p.r)) {
    state.locking = false;
    state.lockTimer = 0;
  } else if (state.lockResets < LOCK_RESET_MAX) {
    state.lockTimer = 0;
    state.lockResets += 1;
  }
  // 리셋 한도 초과: lockTimer 그대로 두어 자연스럽게 락 진행.
}

function tryMove(dx, dy) {
  const p = state.current;
  if (!p) return false;
  if (!collides(p, p.x + dx, p.y + dy, p.r)) {
    p.x += dx; p.y += dy;
    state.lastMoveWasRotation = false;
    if (dy !== 0) {
      // 세로 이동(중력/소프트드롭): 락 상태 즉시 해제. step에서 다음 충돌 시 다시 진입.
      state.locking = false;
      state.lockTimer = 0;
    } else {
      sound.play("move");
      refreshLockAfterMove();
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
  for (let i = 0; i < kicks.length; i++) {
    const [kx, ky] = kicks[i];
    if (!collides(p, p.x + kx, p.y - ky, to)) {
      p.x += kx;
      p.y -= ky;
      p.r = to;
      state.lastMoveWasRotation = true;
      state.lastKickIndex = i;
      sound.play("rotate");
      refreshLockAfterMove();
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
  state.lastMoveWasRotation = false;
  sound.play("drop");
  lockPiece();
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
        state.lockResets = 0;
      }
      break;
    }
  }
}

// === T-spin 감지 (docs/tspin.md 2장 - 3-corner 룰) ===

// 코너 셀 막힘 검사. 보드 밖 / 벽 / 기존 블록 = 막힘. vanish 영역 위쪽(y<0)은 빈 칸으로 간주.
function isCornerBlocked(p, dx, dy) {
  const x = p.x + dx;
  const y = p.y + dy;
  if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return true;
  if (y < 0) return false;
  return state.grid[y][x] !== null;
}

// 락 직전 호출. 반환: "none" / "mini" / "tspin".
function detectTSpin() {
  const p = state.current;
  if (!p || p.type !== "T") return "none";
  if (!state.lastMoveWasRotation) return "none";
  // 4 코너 (T 박스 4x4 기준 (0,0), (2,0), (0,2), (2,2))
  const tl = isCornerBlocked(p, 0, 0);
  const tr = isCornerBlocked(p, 2, 0);
  const bl = isCornerBlocked(p, 0, 2);
  const br = isCornerBlocked(p, 2, 2);
  const blockedCount = (tl ? 1 : 0) + (tr ? 1 : 0) + (bl ? 1 : 0) + (br ? 1 : 0);
  if (blockedCount < 3) return "none";
  // front / back 분류 (회전 상태 기준 머리쪽 2 코너 = front)
  let frontA, frontB, backA, backB;
  switch (p.r) {
    case 0: frontA = tl; frontB = tr; backA = bl; backB = br; break;
    case 1: frontA = tr; frontB = br; backA = tl; backB = bl; break;
    case 2: frontA = bl; frontB = br; backA = tl; backB = tr; break;
    case 3: frontA = tl; frontB = bl; backA = tr; backB = br; break;
  }
  const frontBlocked = (frontA ? 1 : 0) + (frontB ? 1 : 0);
  const backBlocked = (backA ? 1 : 0) + (backB ? 1 : 0);
  if (frontBlocked === 2 && backBlocked >= 1) return "tspin";
  if (frontBlocked === 1 && backBlocked === 2) {
    // TST 격상: 마지막 회전이 큰 kick(인덱스 4)이면 Mini → 정식.
    if (state.lastKickIndex === T_SPIN_BIG_KICK_INDEX) return "tspin";
    return "mini";
  }
  return "none";
}

function lockPiece() {
  const p = state.current;
  if (!p) return;
  // 락 셀이 vanish 영역(y < VANISH)에 걸쳤는지 추적. 정통 테트리스 top-out 정의.
  let lockedInVanish = false;
  for (const [x, y] of p.cells()) {
    if (y >= 0) state.grid[y][x] = p.type;
    if (y < VANISH) lockedInVanish = true;
  }
  gridVersion++; // 고정 블록 변동 → 다음 render에서 재그리기.
  // top-out: 보이지 않는 위쪽에 락이 박힌 상태. 다음 피스가 보이지 않는 잔재와 충돌해 시각상 "공중 정지"로 보이는 증상 차단.
  if (lockedInVanish) {
    state.current = null;
    state.over = true;
    state.flashRows = null;
    return;
  }
  // T-spin 감지는 state.current가 살아 있는 상태에서 (코너 셀 검사용). 락 후에 state.current 정리.
  const tspinKind = detectTSpin();
  state.current = null;

  // 라인 체크
  const cleared = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    if (state.grid[y].every((c) => c !== null)) cleared.push(y);
  }
  const linesCount = cleared.length;
  const isSprint = state.mode === MODE_SPRINT;

  // 점수 / 토스트 / B2B 분기 (스프린트는 T-spin 보너스 미적용)
  let scoreGain = 0;
  let kindLabel = "";
  let isSpecial = false; // B2B chain 갱신 대상: T-spin Lines / Tetris

  if (!isSprint && tspinKind !== "none") {
    if (tspinKind === "tspin") {
      if (linesCount === 0) { scoreGain = T_SPIN_SCORE.noLine;  kindLabel = "T-스핀"; }
      else if (linesCount === 1) { scoreGain = T_SPIN_SCORE.single;  kindLabel = "T-스핀 싱글";  isSpecial = true; }
      else if (linesCount === 2) { scoreGain = T_SPIN_SCORE.double;  kindLabel = "T-스핀 더블";  isSpecial = true; }
      else if (linesCount === 3) { scoreGain = T_SPIN_SCORE.triple;  kindLabel = "T-스핀 트리플"; isSpecial = true; }
    } else { // mini
      if (linesCount === 0) { scoreGain = T_SPIN_SCORE.miniNoLine; kindLabel = "미니 T-스핀"; }
      else if (linesCount === 1) { scoreGain = T_SPIN_SCORE.miniSingle; kindLabel = "미니 T-스핀 싱글"; isSpecial = true; }
    }
  } else if (linesCount > 0) {
    scoreGain = [0, 100, 300, 500, 800][linesCount];
    if (linesCount === 4) { kindLabel = "테트리스"; isSpecial = !isSprint; }
  }

  // B2B 보너스: 직전이 special이고 이번도 special일 때만 ×1.5
  let b2bMult = 1;
  if (isSpecial && state.b2bChain > 0) b2bMult = B2B_MULT;
  const finalScore = Math.round(scoreGain * state.level * b2bMult);
  state.score += finalScore;

  // B2B chain 갱신 (스프린트 외)
  if (!isSprint && linesCount > 0) {
    if (isSpecial) state.b2bChain += 1;
    else state.b2bChain = 0;
  }

  // 토스트
  if (kindLabel) {
    const chainTag = (b2bMult > 1) ? ` B2B ×${state.b2bChain}` : "";
    showToast(`${kindLabel}!${chainTag}`, TOAST_TSPIN_MS);
  }

  // 라인 처리
  if (linesCount > 0) {
    state.flashRows = { rows: cleared, t: 0 };
    state.lines += linesCount;
    sound.play(linesCount === 4 ? "tetris" : "line");
    // 배움 모드: 라인 성공마다 큰 격려. (T-spin 등 특수 라벨보다 우선 노출)
    if (state.mode === MODE_KIDS) {
      showToast(KIDS_CHEERS[state.lines % KIDS_CHEERS.length], TOAST_TSPIN_MS);
    }
    const mode = MODES[state.mode];
    if (mode.levelUp) {
      applyLevelChange(1 + Math.floor(state.lines / 10));
    }
    if (mode.endCondition(state)) {
      state.finished = true;
      state.over = true;
    }
  } else {
    sound.play("lock");
    spawn();
  }
}

function applyClear() {
  // 큰 인덱스부터 지워야 하위 인덱스가 어긋나지 않는다.
  const rows = state.flashRows.rows.slice().sort((a, b) => b - a);
  for (const r of rows) state.grid.splice(r, 1);
  for (let i = 0; i < rows.length; i++) state.grid.unshift(Array(COLS).fill(null));
  gridVersion++; // 라인 제거로 고정 블록 재배치 → 다음 render에서 재그리기.
  state.flashRows = null;
  if (state.over) return; // 모드 종료 조건 충족(예: 스프린트 클리어). 다음 피스 띄우지 않는다.
  spawn();
}

function holdPiece() {
  if (!state.canHold || !state.current) return;
  sound.play("hold");
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

// 발열 개선: 매 프레임 풀 재렌더 회피.
//  - 보드 캔버스는 "그릴 거리(피스 위치/회전/고정 블록/플래시/일시정지/오버)"가 직전 프레임과 다를 때만 다시 그린다.
//  - gridVersion은 고정 블록 변동(락/라인 제거)마다 증가시켜 grid 전체 비교 없이 변화를 감지.
//  - 배경색은 매 프레임 getComputedStyle을 부르지 않고 1회 읽어 캐시.
let gridVersion = 0;
let bgColor = "#161823";
let lastRenderKey = "";

// HUD/미니 블록 dirty 캐시(값이 바뀐 항목만 DOM/캔버스 갱신).
const hudCache = { score: null, level: null, lines: null, best: null };
let lastNextType;
let lastHoldType;
let lastHoldDim;

function refreshBgColor() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--bg-elev").trim();
  if (v) bgColor = v;
}

// 보드 한 프레임의 렌더 상태 서명. 같으면 render를 건너뛴다.
function renderKey() {
  const p = state.current;
  const piece = (p && !state.over) ? `${p.type}:${p.x}:${p.y}:${p.r}` : "none";
  const flash = state.flashRows
    ? `f${state.flashRows.rows.join(",")}:${state.flashRows.t.toFixed(3)}`
    : "";
  return `${gridVersion}|${piece}|${flash}|${state.over ? 1 : 0}|${state.paused ? 1 : 0}`;
}

// 렌더/HUD dirty 캐시 리셋(상태 교체·캔버스 크기 변경 시 강제 1회 재그리기 유도).
function resetRenderCaches() {
  lastRenderKey = "";
  lastNextType = undefined;
  lastHoldType = undefined;
  lastHoldDim = undefined;
  for (const k in hudCache) hudCache[k] = null;
}

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
  refreshBgColor();
  // 캔버스 크기가 바뀌면 버퍼가 비므로 즉시 강제 재그리기.
  resetRenderCaches();
  if (state) render();
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

// 배움(초등) 모드 수학 힌트: 완성까지 조금 남은 행의 빈 칸을 강조하고 "몇 칸 더" 숫자를 표시.
// 10칸 중 채운 칸을 세어 남은 칸(10의 보수)을 스스로 세게 하는 것이 목적. 고정 블록 기준(낙하 중 피스 제외).
function drawKidsHints() {
  ctx.save();
  ctx.font = `bold ${Math.floor(cellSize * 0.62)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let y = VANISH; y < TOTAL_ROWS; y++) {
    let filled = 0;
    for (let x = 0; x < COLS; x++) if (state.grid[y][x]) filled++;
    const remain = COLS - filled;
    if (filled === 0 || remain < KIDS_HINT_MIN || remain > KIDS_HINT_MAX) continue;
    const py = (y - VANISH) * cellSize;
    // 빈 칸 노란 테두리 강조
    ctx.strokeStyle = "rgba(255,214,0,0.9)";
    ctx.lineWidth = 2;
    for (let x = 0; x < COLS; x++) {
      if (state.grid[y][x]) continue;
      ctx.strokeRect(x * cellSize + 2, py + 2, cellSize - 4, cellSize - 4);
    }
    // 첫 빈 칸에 남은 칸 수 배지
    const fx = state.grid[y].indexOf(null);
    if (fx < 0) continue;
    const cx = fx * cellSize + cellSize / 2;
    const cy = py + cellSize / 2;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd600";
    ctx.fillText(String(remain), cx, cy + 0.5);
  }
  ctx.restore();
}

function render() {
  // 직전 프레임과 그릴 거리가 같으면 캔버스 재그리기를 건너뛴다(idle 발열의 본질 해결).
  const key = renderKey();
  if (key === lastRenderKey) return;
  lastRenderKey = key;

  ctx.fillStyle = bgColor;
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
  // 배움 모드 수학 힌트(고정 블록 위, 낙하 피스 아래)
  if (state.mode === MODE_KIDS && !state.over) drawKidsHints();
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
  // 입력 영역을 캔버스(board)가 아닌 페이지 전체로 확장.
  // 보드 외 잉여 영역(stage 좌우/상하 여백, 안전영역 패딩 등)에서도 탭/스와이프가 동작.
  // topbar의 button/a는 input.js의 가드가 처리.
  const inputTarget = document.querySelector(".page.tetris") || board;
  // 드래그(pan) 진입 시점의 피스 좌표/손가락 dy 스냅샷.
  let panAnchorX = 0;
  let panAnchorY = 0;
  let panEntryDy = 0;
  input = createInput(inputTarget, {
    onTap: () => { if (canPlay()) tryRotate(1); },
    onSwipe: (dir) => {
      // 가로/세로(아래) 이동은 pan(드래그 추적)에서 처리. 위 스와이프 = 즉시 내리기(하드드롭).
      if (!canPlay()) return;
      if (dir === "up") hardDrop();
    },
    // 터치 길게누름 → 홀드 매핑 폐기. 보드 본체에서 손가락 정지 시 오발 방지. (키보드 Shift/C는 유지)
    onHold: () => {},
    onPanStart: (info = {}) => {
      if (!canPlay() || !state.current) return;
      panAnchorX = state.current.x;
      panAnchorY = state.current.y;
      panEntryDy = info.dy || 0;
    },
    onPan: ({ dx, dy }) => {
      // 손가락 이동량을 셀 단위로 환산해, 시작 위치 + offset만큼 따라감.
      // 매 호출에서 목표 좌표까지 한 칸씩 tryMove로 진행(벽/충돌이 있으면 거기서 멈춤).
      if (!canPlay() || !state.current || !cellSize) return;
      // 가로: 양방향 추적
      const targetX = panAnchorX + Math.round(dx / cellSize);
      while (state.current.x < targetX) {
        if (!tryMove(1, 0)) break;
      }
      while (state.current.x > targetX) {
        if (!tryMove(-1, 0)) break;
      }
      // 세로: 진입 시점 기준 추가 이동량만, 단방향(아래로만). 칸당 +1점.
      const dyAfterEntry = dy - panEntryDy;
      if (dyAfterEntry > 0) {
        const targetY = panAnchorY + Math.floor(dyAfterEntry / cellSize);
        while (state.current.y < targetY) {
          if (!tryMove(0, 1)) break;
          state.score += 1;
        }
      }
    },
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

function updateMuteBtn() {
  if (!muteBtn) return;
  const m = sound.isMuted();
  muteBtn.textContent = m ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-label", m ? "소리 켜기" : "소리 끄기");
}

function toggleMute() {
  const next = !sound.isMuted();
  sound.setMuted(next);
  store.set("muted", next);
  updateMuteBtn();
  if (!next) sound.play("move"); // 켜는 순간 짧은 확인음
}

function update(dt) {
  if (state.paused || state.over) return;
  state.elapsed += dt; // 활성 게임 시간 누적 (스프린트 시간 / 젠 플레이 시간 표기)
  if (state.flashRows) {
    state.flashRows.t += dt;
    if (state.flashRows.t >= 0.18) applyClear();
    return;
  }
  if (!state.current) return;

  // 중력. softDrop = 정상 중력 * SOFT_DROP_MULT (정통 SRS 정렬, 이중 가속 제거).
  state.fallTimer += dt * (state.softDrop ? state.gravity * SOFT_DROP_MULT : state.gravity);
  step();

  // 락 딜레이
  if (state.locking) {
    state.lockTimer += dt;
    if (state.lockTimer >= LOCK_DELAY) {
      lockPiece();
    }
  }
}

// 값이 직전과 같으면 DOM write를 건너뛴다(불필요한 reflow 회피).
function setHudText(el, key, val) {
  if (hudCache[key] === val) return;
  hudCache[key] = val;
  el.textContent = val;
}

function updateHud() {
  setHudText(scoreEl, "score", String(state.score));
  const hud = MODES[state.mode].hud;
  if (hud === "level") {
    setHudText(levelEl, "level", String(state.level));
    setHudText(linesEl, "lines", String(state.lines));
  } else if (hud === "zen") {
    setHudText(levelEl, "level", "∞");
    setHudText(linesEl, "lines", String(state.lines));
  } else if (hud === "sprint") {
    setHudText(levelEl, "level", formatTime(state.elapsed));
    setHudText(linesEl, "lines", String(Math.max(0, SPRINT_TARGET_LINES - state.lines)));
  } else if (hud === "kids") {
    setHudText(levelEl, "level", "배움");
    setHudText(linesEl, "lines", String(state.lines));
  }
  setHudText(bestEl, "best", formatModeBest(state.mode));
  drawNext();
  drawHold();
}

// === 모드별 베스트 (docs/difficulty-redesign.md 4.6) ===
// 키 체계: best.marathon (점수 number), best.zen (점수 number), best.sprint (시간 ms 또는 null)
function getModeBest(mode) {
  if (mode === MODE_SPRINT) return store.get("best.sprint", null);
  return store.get(`best.${mode}`, 0);
}
function formatModeBest(mode) {
  if (mode === MODE_SPRINT) {
    const ms = getModeBest(mode);
    return ms === null ? "—" : formatTime(ms / 1000);
  }
  return String(getModeBest(mode));
}
function maybeSaveModeBest(mode, value) {
  if (mode === MODE_SPRINT) {
    if (typeof value !== "number") return false;
    const prev = store.get("best.sprint", null);
    if (prev === null || value < prev) {
      store.set("best.sprint", value);
      return true;
    }
    return false;
  }
  const prev = store.get(`best.${mode}`, 0);
  if (value > prev) {
    store.set(`best.${mode}`, value);
    return true;
  }
  return false;
}

// 미니 피스 슬롯(NEXT/HOLD) 공통 렌더러.
// dim=true면 흐리게 표시(예: 홀드 락 상태).
function drawPieceMini(canvas, c, type, dim = false) {
  if (!canvas || !c) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 32;
  const cssH = canvas.clientHeight || 32;
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  c.clearRect(0, 0, cssW, cssH);
  if (!type) return; // 빈 슬롯
  const cells = SHAPES[type][0];
  let minX = 4, maxX = -1, minY = 4, maxY = -1;
  for (const [cx, cy] of cells) {
    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const padding = 3;
  const sz = Math.max(2, Math.floor(Math.min((cssW - padding * 2) / w, (cssH - padding * 2) / h)));
  const offX = Math.floor((cssW - sz * w) / 2);
  const offY = Math.floor((cssH - sz * h) / 2);
  c.globalAlpha = dim ? 0.35 : 1;
  c.fillStyle = COLORS[type];
  for (const [cx, cy] of cells) {
    const px = offX + (cx - minX) * sz;
    const py = offY + (cy - minY) * sz;
    c.fillRect(px + 1, py + 1, sz - 2, sz - 2);
  }
  c.fillStyle = "rgba(255,255,255,0.18)";
  for (const [cx, cy] of cells) {
    const px = offX + (cx - minX) * sz;
    const py = offY + (cy - minY) * sz;
    c.fillRect(px + 1, py + 1, sz - 2, 2);
  }
  c.globalAlpha = 1;
}

function drawNext() {
  if (!state || !state.queue || !state.queue.length) return;
  const t = state.queue[0];
  if (t === lastNextType) return; // 다음 피스가 그대로면 재그리기 불필요.
  lastNextType = t;
  drawPieceMini(nextEl, nextCtx, t);
}

function drawHold() {
  if (!state) return;
  // 홀드 락(현 피스 동안 이미 사용)이면 흐리게.
  const t = state.hold || null;
  const dim = !state.canHold;
  if (t === lastHoldType && dim === lastHoldDim) return;
  lastHoldType = t;
  lastHoldDim = dim;
  drawPieceMini(holdEl, holdCtx, t, dim);
}

async function gameOver() {
  sound.play("gameover");
  let title;
  let body;
  let isNewBest = false;
  if (state.mode === MODE_SPRINT && state.finished) {
    // 스프린트 클리어: 시간(ms) 짧을수록 베스트
    const ms = Math.round(state.elapsed * 1000);
    isNewBest = maybeSaveModeBest(MODE_SPRINT, ms);
    title = "Sprint Clear";
    body = [
      `시간 ${formatTime(state.elapsed)}${isNewBest ? "  (신기록!)" : ""}`,
      `최고 ${formatModeBest(MODE_SPRINT)}`,
    ].join("\n");
  } else if (state.mode === MODE_SPRINT) {
    // 스프린트 토핑아웃 (실패): 베스트 갱신 없음
    title = "Game Over";
    body = [
      `${state.lines} / ${SPRINT_TARGET_LINES} 라인에서 종료`,
      `시간 ${formatTime(state.elapsed)}`,
      `최고 ${formatModeBest(MODE_SPRINT)}`,
    ].join("\n");
  } else if (state.mode === MODE_ZEN) {
    isNewBest = maybeSaveModeBest(MODE_ZEN, state.score);
    title = "젠 종료";
    body = [
      `점수 ${state.score}${isNewBest ? "  (신기록!)" : ""}`,
      `라인 ${state.lines} · 시간 ${formatTime(state.elapsed)}`,
      `최고 ${formatModeBest(MODE_ZEN)}`,
    ].join("\n");
  } else if (state.mode === MODE_KIDS) {
    isNewBest = maybeSaveModeBest(MODE_KIDS, state.score);
    title = "잘했어! 🎉";
    body = [
      `지운 줄 ${state.lines}`,
      `점수 ${state.score}${isNewBest ? "  (새 기록!)" : ""}`,
      `최고 ${formatModeBest(MODE_KIDS)}`,
      "다시 해볼까?",
    ].join("\n");
  } else {
    // 마라톤 토핑아웃
    isNewBest = maybeSaveModeBest(MODE_MARATHON, state.score);
    title = "Game Over";
    body = [
      `점수 ${state.score}${isNewBest ? "  (신기록!)" : ""}`,
      `라인 ${state.lines} · 레벨 ${state.level}`,
      `최고 ${formatModeBest(MODE_MARATHON)}`,
    ].join("\n");
  }
  updateHud();
  // 배움 모드는 좌절 없이 바로 재도전할 수 있게 "다시 하기"를 기본 버튼으로.
  const actions = state.mode === MODE_KIDS
    ? [
        { label: "다시 하기", primary: true, value: "restart" },
        { label: "모드 선택", value: "menu" },
        { label: "홈으로", value: "home" },
      ]
    : [
        { label: "모드 선택", primary: true, value: "menu" },
        { label: "홈으로", value: "home" },
      ];
  const choice = await showModal({ title, body, actions });
  if (choice === "restart") restart();
  else if (choice === "menu") goToMenu();
  else location.href = "../../";
}

async function togglePause() {
  if (state.over) return;
  state.paused = true;
  pauseBtn.textContent = "▶";
  const choice = await showModal({
    title: "일시정지",
    body: CONTROLS_HELP,
    actions: [
      { label: "재개", primary: true, value: "resume" },
      { label: "다시 시작", value: "restart" },
      { label: "모드 선택", value: "menu" },
      { label: "홈으로", value: "home" },
    ],
  });
  if (choice === "home") { location.href = "../../"; return; }
  if (choice === "menu") { goToMenu(); return; }
  if (choice === "restart") { restart(); return; }
  state.paused = false;
  pauseBtn.textContent = "⏸";
}

function restart() {
  state = newState();
  ensureBag();
  spawn();
  resetRenderCaches(); // 새 상태 → HUD/보드 강제 1회 재그리기.
  setupHudLabels();
  updateHud();
  pauseBtn.textContent = "⏸";
}

function tickHud() {
  updateHud();
  // 게임 오버 모달은 단 한 번만 띄운다(매 프레임 호출 방지)
  if (state.over && !state.overHandled) {
    state.overHandled = true;
    gameOver();
  }
}

function init() {
  state = newState();
  ensureBag();
  spawn();
  setupHudLabels();
  updateHud();
  setupInput();
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 100));
  pauseBtn.addEventListener("click", togglePause);

  // 사운드: 저장된 음소거 설정 반영 + 첫 사용자 제스처에서 오디오 잠금 해제(브라우저 자동재생 정책).
  sound.setMuted(store.get("muted", false));
  updateMuteBtn();
  const unlockOnce = () => { sound.unlockAudio(); };
  window.addEventListener("pointerdown", unlockOnce, { once: true });
  window.addEventListener("keydown", unlockOnce, { once: true });
  if (muteBtn) muteBtn.addEventListener("click", toggleMute);
  // 탭이 백그라운드로 가면 오디오를 재우고 복귀 시 되살린다(발열·배터리).
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) sound.suspendAudio();
    else sound.resumeAudio();
  });
  // 전체화면 토글(STANDARD 4.7 규칙 6). 미지원 기기(iOS Safari 등)는 버튼을 숨긴다.
  if (document.documentElement.requestFullscreen) {
    fsBtn.hidden = false;
    fsBtn.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.();
    });
  }

  loop = createLoop({
    update: (dt) => { update(dt); tickHud(); },
    render: () => render(),
  });
  loop.start();

  // 마라톤 외 모드는 진입 시 모드명 안내 (URL 쿼리로 진입한 사용자가 모드 진입을 즉시 인지하도록)
  if (state.mode !== MODE_MARATHON) {
    showToast(`${MODES[state.mode].label} 모드`, 1800);
  }
  // 첫 방문 안내 토스트(한 번만)
  if (!store.get("seen-help", false)) {
    showToast("일시정지 버튼 ⏸ 에서 컨트롤 가이드 확인", 2800);
    store.set("seen-help", true);
  }
}

// === 라우팅 + 메뉴 (2차 2단계, docs/difficulty-redesign.md 4.4) ===
const menuScreenEl = document.getElementById("menu-screen");
const gameScreenEl = document.getElementById("game-screen");

function isMenuRoute() {
  return !new URL(location.href).searchParams.get("mode");
}

function showMenuScreen() {
  if (menuScreenEl) menuScreenEl.hidden = false;
  if (gameScreenEl) gameScreenEl.hidden = true;
}
function showGameScreen() {
  if (menuScreenEl) menuScreenEl.hidden = true;
  if (gameScreenEl) gameScreenEl.hidden = false;
}

function goToMenu() {
  // 쿼리 제거 → 메뉴 라우트로 복귀
  location.href = location.pathname;
}

async function maybeShowBestPurgeNotice() {
  // 기획서 4.6.1: 기존 단일 베스트 폐기, 마이그레이션 없음. 1회 안내.
  if (store.get("bestNoticeShown", false)) return;
  const old = store.get("highscore", 0);
  if (old <= 0) {
    store.set("bestNoticeShown", true);
    return;
  }
  await showModal({
    title: "베스트 분리 안내",
    body: [
      "모드별로 베스트가 분리됩니다.",
      "이전 단일 베스트는 더 이상 사용하지 않습니다.",
      "새 모드와 함께 점수도 새로 시작한다.",
    ].join("\n"),
    actions: [{ label: "확인", primary: true, value: "ok" }],
  });
  store.set("bestNoticeShown", true);
}

async function setupMenu() {
  showMenuScreen();
  await maybeShowBestPurgeNotice();
  const last = store.get("lastMode", MODE_MARATHON);
  const cards = document.querySelectorAll(".mode-card");
  cards.forEach((card) => {
    const mode = card.dataset.mode;
    if (mode === last) card.classList.add("active");
    const bestCell = card.querySelector("[data-best]");
    if (bestCell) {
      if (mode === MODE_SPRINT) {
        const ms = store.get("best.sprint", null);
        bestCell.textContent = ms === null ? "⏱ —" : `⏱ ${formatTime(ms / 1000)}`;
      } else {
        bestCell.textContent = `★ ${store.get(`best.${mode}`, 0)}`;
      }
    }
    card.addEventListener("click", () => {
      store.set("lastMode", mode);
      location.href = `?mode=${mode}`;
    });
  });
  // 모바일 젠 [추천] 뱃지 (기획서 4.2.4)
  if (isCoarsePointer()) {
    const badge = document.querySelector("[data-zen-badge]");
    if (badge) badge.hidden = false;
  }
}

function bootstrap() {
  if (isMenuRoute()) {
    setupMenu();
  } else {
    showGameScreen();
    init();
  }
}

bootstrap();
