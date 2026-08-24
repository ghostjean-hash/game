// 플레이 화면과 분리된 조립 하네스. main.js와 테스트가 같은 규칙 경로를 쓴다.
import { GAME } from './data/constants.js';
import { createBoard, openCell, toggleFlag, chord, countFlags, serialize, restore } from './core/board.js';

export function createGameHarness({ difficulty, now = () => Date.now(), rng = Math.random } = {}) {
  let board = null;
  let key = difficulty?.key || '';
  let elapsedMs = 0;
  let startedAt = 0;

  const elapsed = () => elapsedMs + (board?.status === GAME.PLAYING ? now() - startedAt : 0);
  const freeze = (value = elapsed()) => { elapsedMs = value; startedAt = 0; return elapsedMs; };

  return {
    start(nextDifficulty) {
      key = nextDifficulty.key;
      board = createBoard(nextDifficulty);
      elapsedMs = 0;
      startedAt = 0;
      return board;
    },
    open(x, y) {
      if (!board) return { opened: [], won: false, lost: false };
      if (board.status === GAME.READY) startedAt = now();
      const atAction = elapsed();
      const result = openCell(board, x, y, rng);
      if (result.won || result.lost) freeze(atAction);
      return result;
    },
    flag(x, y) {
      if (!board) return false;
      const atAction = elapsed();
      const changed = toggleFlag(board, x, y);
      if (changed && (board.status === GAME.WON || board.status === GAME.LOST)) freeze(atAction);
      return changed;
    },
    chord(x, y) {
      if (!board) return { opened: [], won: false, lost: false };
      const atAction = elapsed();
      const result = chord(board, x, y);
      if (result.won || result.lost) freeze(atAction);
      return result;
    },
    snapshot() { return board ? { board: serialize(board), key, elapsedMs: freeze() } : null; },
    resume(value) {
      const next = restore(value?.board);
      if (!next) return null;
      board = next; key = value.key; elapsedMs = value.elapsedMs || 0;
      startedAt = board.status === GAME.PLAYING ? now() : 0;
      return board;
    },
    board: () => board,
    key: () => key,
    elapsed,
    minesLeft: () => board ? board.mines - countFlags(board) : 0,
  };
}
