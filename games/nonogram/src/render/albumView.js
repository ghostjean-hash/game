// 도감 렌더 (DOM): 모은 개수 강조 + 클리어 그림은 컬러, 미클리어는 잠금 실루엣.

import { PUZZLES } from '../data/puzzles.js';
import { fillPicture } from './pixel.js';

export function renderAlbum(container, progress) {
  const total = PUZZLES.length;
  const got = PUZZLES.filter((p) => progress[p.id] && progress[p.id].cleared).length;

  container.innerHTML = '';

  const summary = document.createElement('div');
  summary.className = 'album-summary';
  summary.innerHTML = `<b>${got}</b> / ${total} 모았어요`;
  container.appendChild(summary);

  const grid = document.createElement('div');
  grid.className = 'album-grid';
  for (const p of PUZZLES) {
    const cleared = !!(progress[p.id] && progress[p.id].cleared);
    const card = document.createElement('div');
    card.className = 'album-card' + (cleared ? '' : ' locked');

    const pic = document.createElement('div');
    pic.className = 'album-pic';
    fillPicture(pic, p.grid, { mono: !cleared, palette: p.palette });

    const name = document.createElement('div');
    name.className = 'album-name';
    name.textContent = cleared ? p.title : '???';

    card.append(pic, name);
    grid.appendChild(card);
  }
  container.appendChild(grid);
}
