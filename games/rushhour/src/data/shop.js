// 상점 판매 품목(docs/02_data.md §5). 1차는 주인공 토끼 색 스킨.
// 골드로 구매(해금)하고 장착한다. 보유/장착 상태는 localStorage progress에 저장.
// 첫 번째(price 0)는 기본 스킨이라 처음부터 보유·장착된다.

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
