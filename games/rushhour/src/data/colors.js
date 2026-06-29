// 차 색상(게임 데이터). UI 색은 shared/tokens.css 토큰을 쓴다(docs/04_conventions.md §3).
// 초등 저학년 대상이라 산리오풍 파스텔 톤으로 통일한다.

// 주인공 토끼(target) 색. 고정 파스텔 핑크.
export const TARGET_COLOR = '#f7a8c4';

// 친구 동물 차 색 팔레트(파스텔). 차 id 순서(target 제외)로 순환 배정한다.
export const CAR_PALETTE = [
  '#f9d57e', // 파스텔 노랑(병아리)
  '#a8d5f7', // 파스텔 하늘
  '#a8e6c1', // 파스텔 민트
  '#c9b6f0', // 파스텔 라벤더
  '#f9b98a', // 파스텔 복숭아
  '#f7c5dd', // 연분홍
  '#bfe09a', // 파스텔 연두
  '#a8dadc', // 파스텔 청록
  '#e0c7a8', // 파스텔 베이지(곰 톤)
  '#d7c3e8', // 파스텔 모브
];
