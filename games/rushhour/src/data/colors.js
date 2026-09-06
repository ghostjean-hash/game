// 차 색상(게임 데이터). UI 색은 shared/tokens.css 토큰을 쓴다(docs/04_conventions.md §3).
// 초등 저학년 대상이라 산리오풍 파스텔 톤으로 통일한다.

// 주인공 블록 안쪽 테두리(붉은 계열). 배경은 투명이라 이 테두리만 주인공을 표시한다.
export const TARGET_BORDER = '#e0555f';

// 블록 색조 후보. 블록 위치에 따라 하나를 골라 캐릭터에 얹는다(render.js).
export const BLOCK_TINTS = ['#ffb0c8', '#a6d3ff', '#a8e6b8', '#cdb0ff', '#ffd873', '#ffb894'];
