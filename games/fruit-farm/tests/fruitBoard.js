import { BOARD_STATUS, TILE, createFruitBoard, harvestReward, openTile, toggleHarvest } from '../src/fruitBoard.js';
export function runFruitBoardHarness(test, ok) {
  test('첫 칸과 이웃 여덟 칸에는 과일이 놓이지 않는다', () => { const board = createFruitBoard(); openTile(board, 2, 2, () => 0.37); [1,2,3].forEach((x) => [1,2,3].forEach((y) => ok(!board.cells[y * 5 + x].fruit))); });
  test('클리어는 안전 칸을 열고 과일을 사용자가 모두 표시할 때만 된다', () => { const board = createFruitBoard({ w: 3, h: 3, fruits: 1 }); openTile(board, 2, 2, () => 0.99); ok(board.status === BOARD_STATUS.PLAYING); const index = board.cells.findIndex((cell) => cell.fruit); toggleHarvest(board, index % 3, Math.floor(index / 3)); ok(board.status === BOARD_STATUS.WON); });
  test('클리어 보상은 실제로 표시한 과일의 종류별 수와 같다', () => { const board = createFruitBoard(); openTile(board, 2, 2, () => 0.37); const reward = harvestReward(board); ok(reward.apple === 6 && reward.berry === 4); });
  test('과일을 열면 패배하고, 과일은 자동으로 수확되지 않는다', () => { const board = createFruitBoard(); openTile(board, 2, 2, () => 0.37); const index = board.cells.findIndex((cell) => cell.fruit); const result = openTile(board, index % 5, Math.floor(index / 5)); ok(result.lost && board.status === BOARD_STATUS.LOST && board.cells[index].tile !== TILE.MARKED); });
}
