// 차 색상(게임 데이터). UI 색은 shared/tokens.css 토큰을 쓴다(docs/04_conventions.md §3).
// 초등 저학년 대상이라 산리오풍 파스텔 톤으로 통일한다.

// 주인공 토끼(target) 색. 고정 파스텔 핑크.
export const TARGET_COLOR = '#f7a8c4';

// 동물 종류별 파스텔 색 후보. 같은 종류라도 블록 위치에 따라 다른 색을 고른다(render.js).
export const KIND_COLORS = {
  cat: ['#cfd6e6', '#a8d5f7', '#f3d9a4', '#d7c3e8'],   // 회색 / 하늘 / 크림 / 모브 고양이
  dog: ['#f9b98a', '#e0c7a8', '#f7c59f', '#eac9a0'],   // 주황 / 베이지 강아지
  chick: ['#f9d57e', '#fde7a0', '#f7cf6a'],            // 노랑 병아리
  penguin: ['#a8dadc', '#9fb6d4', '#bcd4e6'],          // 청록 / 블루 펭귄
};
