// 차 색상(게임 데이터). UI 색은 shared/tokens.css 토큰을 쓴다(docs/04_conventions.md §3).

// 빨간 차(target) 색. 고정 강조색.
export const TARGET_COLOR = '#e5484d';

// 일반 차 색 팔레트. 차 id 순서(target 제외)로 순환 배정한다.
export const CAR_PALETTE = [
  '#f2c14e', // 노랑
  '#4e9af2', // 파랑
  '#57c98a', // 초록
  '#b07cf2', // 보라
  '#f29e4e', // 주황
  '#4ec9c9', // 청록
  '#d98ab0', // 분홍
  '#9aa0a6', // 회색
  '#8a6d3b', // 갈색(트럭 톤)
  '#6c8a3b', // 올리브
];
