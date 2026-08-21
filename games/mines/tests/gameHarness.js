import { createGameHarness } from '../src/gameHarness.js';
import { DIFFICULTY, GAME } from '../src/data/constants.js';

export function runGameHarness(test, ok) {
  test('하네스는 시작 후 첫 칸을 열어 진행 상태로 만든다', () => {
    const game = createGameHarness({ difficulty: DIFFICULTY.easy, rng: () => 0.37 });
    game.start(DIFFICULTY.easy); const result = game.open(4, 4);
    ok(game.board().status === GAME.PLAYING || result.won);
  });
  test('하네스는 깃발 수와 남은 지뢰 수를 함께 갱신한다', () => {
    const game = createGameHarness({ difficulty: DIFFICULTY.easy }); game.start(DIFFICULTY.easy);
    ok(game.flag(0, 0)); ok(game.minesLeft() === DIFFICULTY.easy.mines - 1);
  });
  test('하네스는 진행 중인 판을 저장하고 같은 상태로 복원한다', () => {
    let clock = 0; const game = createGameHarness({ difficulty: DIFFICULTY.easy, now: () => clock, rng: () => 0.37 });
    game.start(DIFFICULTY.easy); game.open(4, 4); clock = 1200; const saved = game.snapshot();
    const resumed = createGameHarness({ difficulty: DIFFICULTY.easy, now: () => clock }); resumed.resume(saved);
    ok(resumed.board().placed && resumed.elapsed() === 1200);
  });
}
