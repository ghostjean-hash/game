// 색 인덱스 격자를 픽셀 그림 요소로 채우는 공통 유틸(썸네일/도감/결과 공용).
// DOM을 만지므로 render 계층. 색은 colors.js PALETTE.

import { PALETTE } from '../data/colors.js';

// el 안에 grid를 <i> 픽셀로 채운다. mono=true면 채운 칸을 단색(미클리어 실루엣).
export function fillPicture(el, grid, { mono = false } = {}) {
  const n = grid.length;
  el.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  let html = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      const bg = v === 0 ? 'transparent' : (mono ? 'var(--fill-mono)' : PALETTE[v]);
      html += `<i style="background:${bg}"></i>`;
    }
  }
  el.innerHTML = html;
}
