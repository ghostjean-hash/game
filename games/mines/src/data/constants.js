// 이 게임의 모든 수치. docs/02_data.md가 SSOT이며 이 파일은 그 값의 코드 실체다.
// 값을 바꾸려면 문서를 먼저 고친다(docs/04_conventions.md 3.3).

// 난이도 - 모바일 맞춤 3단(02_data.md 1장, 2026-08-21 확정).
// 세로 화면에서 칸이 손가락 판정 하한 아래로 내려가지 않도록 가로 칸 수를 14 이하로 묶었다.
export const DIFFICULTY = {
  easy:   { key: 'easy',   name: '쉬움',   w: 9,  h: 9,  mines: 10 },
  normal: { key: 'normal', name: '보통',   w: 12, h: 12, mines: 25 },
  hard:   { key: 'hard',   name: '어려움', w: 14, h: 18, mines: 55 },
};

export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];

// 처음 들어온 사용자에게 골라져 있는 난이도(02_data.md 1.3).
export const DEFAULT_DIFFICULTY = 'normal';

// 칸 크기 산정(02_data.md 2장). 가용 폭과 가용 높이를 둘 다 재서 작은 쪽에 맞춘다.
export const CELL = {
  min: 24,   // 이보다 작아지면 손가락으로 정확히 누를 수 없다
  compactMin: 20, // 낮은 가로 화면에서는 하단 조작과 격자 겹침을 막기 위한 예외 하한
  max: 48,   // 넓은 화면에서 판이 과하게 커지지 않게 묶는다
  gap: 2,
};

export const BOARD = {
  pad: 12,
  narrowPad: 6,
  // 어려움 판의 최소 폭(362px)에 기본 좌우 여백을 더한 값(02_data.md 2.4).
  narrowViewportWidth: 386,
  uiTop: 56,
  uiBottom: 104,
  compactHeight: 640,
};

// 조작 판정(02_data.md 3장). 400ms는 웹 관례 500ms보다 짧다 -
// 판 하나에 깃발을 수십 번 꽂는 게임이라 대기 시간이 곧 조작 피로가 된다.
export const TOUCH = {
  longPressMs: 400,
  moveTolerance: 10,
  tapMaxMs: 399,
};

// 칸 하나의 상태. 문자열을 코드에 직접 쓰지 않는다(04_conventions.md 1.4).
export const CELL_STATE = {
  CLOSED: 'closed',
  OPEN: 'open',
  FLAG: 'flag',
};

// 조작 모드. 어느 모드에 있든 길게 누르면 반대 동작이 일어난다(01_spec.md 4.2).
export const MODE = {
  OPEN: 'open',
  FLAG: 'flag',
};

// 판 하나의 진행 상태.
export const GAME = {
  READY: 'ready',       // 첫 칸을 열기 전. 지뢰가 아직 놓이지 않았고 시간도 흐르지 않는다
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
};

// 이 게임 고유 화면 문구. 공용 문구(시작·이어서 하기 등)는 shared/frame/text.js가 가진다.
export const LABEL = {
  modeOpen: '열기',
  modeFlag: '깃발',
  minesLeft: '남은 지뢰',
  time: '시간',
  win: '다 찾았습니다',
  lose: '지뢰를 밟았습니다',
  cellsLeft: '남은 칸',
  best: '최고 기록',
};

// 시간 표시 갱신 주기(02_data.md 7.2). 내부 계측은 밀리초, 표시만 초로 내린다.
export const TIMER = {
  tickMs: 1000,
};

// 인접 여덟 칸의 상대 좌표. 규칙 전부가 이 목록 위에서 돌아간다.
export const NEIGHBORS = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];
