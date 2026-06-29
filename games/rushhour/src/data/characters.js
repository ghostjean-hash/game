// 차를 동물 친구로 그리기 위한 종류 정의(docs/02_data.md §2.2).
// 색은 갖지 않는다(색은 colors.js, data/끼리 import 금지 규칙). 종류만 정의하고
// render.js가 색(colors.js)과 종류를 id별로 조합해 캐릭터 얼굴 SVG를 그린다.
// 얼굴 그리기 좌표는 render.js의 SVG 마크업에 둔다(디자인 상수, docs/04 §3.4).

// 주인공(target) 동물. 고정.
export const TARGET_KIND = 'rabbit';

// 친구 동물 종류. 친구 차 id 순서로 순환 배정한다.
export const FRIEND_KINDS = ['bear', 'cat', 'dog', 'chick', 'penguin'];
