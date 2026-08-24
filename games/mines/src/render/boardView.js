import { CELL_STATE, GAME } from '../data/constants.js';

const MINE = '✹';
const FLAG = '⚑';

export function renderBoard(el, board, { cursor = null } = {}) {
  el.style.setProperty('--cols', board.w);
  el.replaceChildren(...board.cells.map((cell, idx) => {
    const x = idx % board.w;
    const y = Math.floor(idx / board.w);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'cell'; button.dataset.x = x; button.dataset.y = y;
    if ((x + y) % 2) button.classList.add('alt');
    if (cursor && cursor.x === x && cursor.y === y) button.classList.add('cursor');
    if (cell.state === CELL_STATE.OPEN) {
      button.classList.add('open');
      if (cell.adjacent) { button.dataset.n = cell.adjacent; button.textContent = cell.adjacent; }
    } else if (cell.state === CELL_STATE.FLAG) {
      button.classList.add('flag'); button.textContent = board.markerSymbol || FLAG;
      if (board.status === GAME.LOST && !cell.mine) button.classList.add('flag-wrong');
    } else if (board.status === GAME.LOST && cell.mine) {
      button.classList.add(cell.hit ? 'mine-hit' : 'mine-shown'); button.textContent = MINE;
    }
    button.setAttribute('aria-label', `가로 ${x + 1}, 세로 ${y + 1}`);
    return button;
  }));
}
