// 차 색상(게임 데이터). UI 색은 shared/tokens.css 토큰을 쓴다(docs/04_conventions.md §3).
// 초등 저학년 대상이라 산리오풍 파스텔 톤으로 통일한다.

// 주인공 토끼(target) 색. 고정 파스텔 핑크.
export const TARGET_COLOR = '#f7a8c4';

// 주인공 블록 안쪽 테두리(붉은 계열). 배경은 투명이라 이 테두리만 주인공을 표시한다.
export const TARGET_BORDER = '#e0555f';

// 동물 종류별 파스텔 색 후보. 같은 종류라도 블록 위치에 따라 다른 색을 고른다(render.js).
export const KIND_COLORS = {
  cat: ['#cfd6e6', '#a8d5f7', '#f3d9a4', '#d7c3e8'],   // 회색 / 하늘 / 크림 / 모브 고양이
  dog: ['#f9b98a', '#e0c7a8', '#f7c59f', '#eac9a0'],   // 주황 / 베이지 강아지
  chick: ['#f9d57e', '#fde7a0', '#f7cf6a'],            // 노랑 병아리
  penguin: ['#a8dadc', '#9fb6d4', '#bcd4e6'],          // 청록 / 블루 펭귄
};

// 블록 배경 파스텔 색조. 캐릭터(PNG) 뒤에 또렷하게 깔고, 블록 위치로 하나 고른다(불투명).
export const BLOCK_TINTS = ['#ffb0c8', '#a6d3ff', '#a8e6b8', '#cdb0ff', '#ffd873', '#ffb894'];
