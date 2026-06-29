// 차를 동물 친구로 그리기 위한 종류·표정 정의(docs/02_data.md §2.2).
// 색은 갖지 않는다(색은 colors.js, data/끼리 import 금지 규칙). render.js가 색과 조합한다.
// 그리기 좌표는 render.js의 SVG 마크업에 둔다(디자인 상수, docs/04 §3.4).

// 주인공(target) 동물. 고정.
export const TARGET_KIND = 'rabbit';

// 블록 크기 → 동물. 키는 방향+길이(`${orient}${len}`): h2 가로2, h3 가로3, v2 세로2, v3 세로3.
export const KIND_BY_SHAPE = {
  h2: 'cat',
  h3: 'dog',
  v2: 'chick',
  v3: 'penguin',
};

// 표정 종류. 블록 위치로 하나를 고른다.
export const FACES = ['normal', 'happy', 'wink', 'surprised'];

// 액세서리 종류. none을 여러 개 둬서 일부 블록만 부착되게 한다.
export const ACCESSORIES = ['none', 'none', 'none', 'ribbon', 'bowtie', 'flower'];
