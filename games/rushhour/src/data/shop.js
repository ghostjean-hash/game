// 상점 판매 품목(docs/02_data.md §5). 보드 테마(마을 길 색) 적용 + 포니 머리 장식 장착.
// 골드로 구매(해금)하고, 테마는 화면에 '적용' / 장식은 주인공에 '장착'한다.
// 보유/적용·장착 상태는 localStorage progress에 저장. 첫 항목(price 0)은 처음부터 보유·기본이다.

// 보드 테마: 바닥(board) / 격자선(line) / 출구 길(exit) 색 세트. cream이 기본(현재 색).
export const BOARD_THEMES = [
  { id: 'cream', name: '크림', price: 0, board: '#f3ead9', line: '#e3d6bf', exit: '#ffd98a' },
  { id: 'sky', name: '하늘 마을', price: 40, board: '#e3f0fa', line: '#c5dcef', exit: '#9fcdf2' },
  { id: 'mint', name: '민트 들판', price: 40, board: '#e4f4ea', line: '#c6e4d2', exit: '#8fdcb0' },
  { id: 'lavender', name: '라벤더', price: 50, board: '#efe8fa', line: '#d8cbef', exit: '#c4aef0' },
  { id: 'peach', name: '복숭아', price: 50, board: '#fbeadf', line: '#f0d2bd', exit: '#f9b48a' },
];

export const DEFAULT_THEME = 'cream';

// 포니 머리 장식. acc는 render가 그리는 장식 키, emoji는 상점 미리보기. none이 기본(장식 없음).
export const ACCESSORY_ITEMS = [
  { id: 'none', name: '없음', price: 0, acc: 'none', emoji: '🐴' },
  { id: 'ribbon', name: '리본', price: 30, acc: 'ribbon', emoji: '🎀' },
  { id: 'flower', name: '꽃', price: 40, acc: 'flower', emoji: '🌸' },
  { id: 'crown', name: '왕관', price: 60, acc: 'crown', emoji: '👑' },
  { id: 'bowtie', name: '나비넥타이', price: 40, acc: 'bowtie', emoji: '🎀' },
  { id: 'tophat', name: '중절모', price: 50, acc: 'tophat', emoji: '🎩' },
  { id: 'cap', name: '야구모자', price: 40, acc: 'cap', emoji: '🧢' },
  { id: 'grad', name: '학사모', price: 60, acc: 'grad', emoji: '🎓' },
  { id: 'sunhat', name: '밀짚모자', price: 50, acc: 'sunhat', emoji: '👒' },
  { id: 'star', name: '별', price: 40, acc: 'star', emoji: '⭐' },
  { id: 'gem', name: '보석', price: 70, acc: 'gem', emoji: '💎' },
  { id: 'clover', name: '클로버', price: 40, acc: 'clover', emoji: '🍀' },
  { id: 'heart', name: '하트', price: 50, acc: 'heart', emoji: '❤️' },
  { id: 'snow', name: '눈송이', price: 40, acc: 'snow', emoji: '❄️' },
  { id: 'music', name: '음표', price: 40, acc: 'music', emoji: '🎵' },
  { id: 'party', name: '고깔', price: 50, acc: 'party', emoji: '🎉' },
];

export const DEFAULT_ACCESSORY = 'none';
