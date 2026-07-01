// 블록 이미지 스타일 세트. 설정 화면에서 전환한다(docs/02_data.md).
// render가 `${id}_${방향}${길이}.png`로 로드하고, 해당 스타일에 없는 블록은 a_로 폴백한다.
// 주인공(target)은 현재 스타일 공용(target.png).

export const PONY_STYLES = [
  { id: 'a', name: '조랑말', emoji: '🦄' },
  { id: 'b', name: '모찌', emoji: '🍡' },
];

export const DEFAULT_STYLE = 'a';
