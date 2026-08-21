import { BUILDING, ITEM, createFarmHarness } from '../src/farmHarness.js';
export function runFarmHarness(test, ok) {
  test('첫 수확은 사과 6개와 베리 4개를 재고에 넣고 납품 가능한 사과 주문을 연다', () => { const farm = createFarmHarness({ rng: () => 0.99 }); farm.harvest(); const state = farm.state(); ok(state.inventory[ITEM.APPLE] === 6 && state.inventory[ITEM.BERRY] === 4); ok(state.buildings[BUILDING.SHOP] && farm.order()?.id === 'apple-basket' && farm.canFulfill()); });
  test('주문 납품은 정확한 재료를 소모하고 판매가만큼 코인을 얻는다', () => { const farm = createFarmHarness({ rng: () => 0 }); farm.harvest(); ok(farm.fulfill()); const state = farm.state(); ok(state.coins === 12 && state.inventory[ITEM.APPLE] === 3 && state.orderId === null); });
  test('시설은 보유 코인이 부족하면 지을 수 없고, 비용만큼 차감한다', () => { const farm = createFarmHarness({ rng: () => 0 }); farm.harvest(); ok(!farm.build(BUILDING.WELL)); for (let i = 0; i < 4; i += 1) { farm.fulfill(); farm.harvest(); } ok(farm.state().coins >= 40 && farm.build(BUILDING.WELL)); });
  test('설치된 우물은 다음 과수원 클리어 때 샘물 두 개를 생산한다', () => { const farm = createFarmHarness({ rng: () => 0 }); farm.harvest(); for (let i = 0; i < 4; i += 1) { farm.fulfill(); farm.harvest(); } farm.build(BUILDING.WELL); farm.harvest(); ok(farm.state().inventory[ITEM.WATER] === 2); });
}
