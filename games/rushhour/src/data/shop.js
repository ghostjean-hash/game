// 상점 판매 품목(docs/02_data.md §5). 주인공 토끼 색 스킨 + 보드 테마(마을 길 색).
// 골드로 구매(해금)하고 장착한다. 보유/장착 상태는 localStorage progress에 저장.
// 첫 번째(price 0)는 기본이라 처음부터 보유·장착된다.

export const RABBIT_SKINS = [
  { id: 'pink', name: '핑크', color: '#f7a8c4', price: 0 },
  { id: 'sky', name: '하늘', color: '#9fcdf2', price: 30 },
  { id: 'mint', name: '민트', color: '#9fe0bf', price: 30 },
  { id: 'lemon', name: '레몬', color: '#f7d774', price: 40 },
  { id: 'lavender', name: '라벤더', color: '#c4aef0', price: 40 },
  { id: 'peach', name: '복숭아', color: '#f9b48a', price: 50 },
  { id: 'coral', name: '코랄', color: '#f78a8a', price: 50 },
  { id: 'lime', name: '라임', color: '#bfe09a', price: 60 },
];

export const DEFAULT_SKIN = 'pink';

// 보드 테마: 바닥(board) / 격자선(line) / 출구 길(exit) 색 세트. cream이 기본(현재 색).
export const BOARD_THEMES = [
  { id: 'cream', name: '크림', price: 0, board: '#f3ead9', line: '#e3d6bf', exit: '#ffd98a' },
  { id: 'sky', name: '하늘 마을', price: 40, board: '#e3f0fa', line: '#c5dcef', exit: '#9fcdf2' },
  { id: 'mint', name: '민트 들판', price: 40, board: '#e4f4ea', line: '#c6e4d2', exit: '#8fdcb0' },
  { id: 'lavender', name: '라벤더', price: 50, board: '#efe8fa', line: '#d8cbef', exit: '#c4aef0' },
  { id: 'peach', name: '복숭아', price: 50, board: '#fbeadf', line: '#f0d2bd', exit: '#f9b48a' },
];

export const DEFAULT_THEME = 'cream';
