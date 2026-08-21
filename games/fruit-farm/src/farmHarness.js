export const ITEM = Object.freeze({ APPLE: 'apple', BERRY: 'berry', WATER: 'water', HONEY: 'honey', FLOUR: 'flour' });
export const BUILDING = Object.freeze({ SHOP: 'shop', WELL: 'well', JUICER: 'juicer', HIVE: 'hive', JAM: 'jam', MILL: 'mill', OVEN: 'oven' });
export const BUILDINGS = Object.freeze({
  [BUILDING.SHOP]: { name: '작은 상점', cost: 0 }, [BUILDING.WELL]: { name: '샘물 우물', cost: 40 }, [BUILDING.JUICER]: { name: '착즙대', cost: 70 },
  [BUILDING.HIVE]: { name: '벌통', cost: 95 }, [BUILDING.JAM]: { name: '잼 작업대', cost: 120 }, [BUILDING.MILL]: { name: '풍차 방앗간', cost: 150 }, [BUILDING.OVEN]: { name: '작은 오븐', cost: 190 },
});
export const MENU = Object.freeze([
  { id: 'apple-basket', name: '사과 바구니', price: 12, recipe: { [ITEM.APPLE]: 3 }, needs: [BUILDING.SHOP] },
  { id: 'berry-cup', name: '야생 베리 컵', price: 18, recipe: { [ITEM.BERRY]: 5 }, needs: [BUILDING.SHOP] },
  { id: 'apple-juice', name: '맑은 사과 주스', price: 28, recipe: { [ITEM.APPLE]: 2, [ITEM.WATER]: 1 }, needs: [BUILDING.SHOP, BUILDING.WELL, BUILDING.JUICER] },
  { id: 'berry-juice', name: '베리 주스', price: 34, recipe: { [ITEM.BERRY]: 3, [ITEM.WATER]: 1 }, needs: [BUILDING.SHOP, BUILDING.WELL, BUILDING.JUICER] },
  { id: 'apple-jam', name: '사과 꿀잼', price: 48, recipe: { [ITEM.APPLE]: 4, [ITEM.HONEY]: 1 }, needs: [BUILDING.SHOP, BUILDING.HIVE, BUILDING.JAM] },
  { id: 'berry-jam', name: '베리 꿀잼', price: 58, recipe: { [ITEM.BERRY]: 5, [ITEM.HONEY]: 1 }, needs: [BUILDING.SHOP, BUILDING.HIVE, BUILDING.JAM] },
  { id: 'apple-tart', name: '사과 타르트', price: 82, recipe: { [ITEM.APPLE]: 3, [ITEM.FLOUR]: 1, [ITEM.HONEY]: 1 }, needs: [BUILDING.SHOP, BUILDING.HIVE, BUILDING.MILL, BUILDING.OVEN] },
  { id: 'berry-tart', name: '베리 타르트', price: 96, recipe: { [ITEM.BERRY]: 4, [ITEM.FLOUR]: 1, [ITEM.HONEY]: 1 }, needs: [BUILDING.SHOP, BUILDING.HIVE, BUILDING.MILL, BUILDING.OVEN] },
]);
const emptyInventory = () => ({ [ITEM.APPLE]: 0, [ITEM.BERRY]: 0, [ITEM.WATER]: 0, [ITEM.HONEY]: 0, [ITEM.FLOUR]: 0 });
const hasBuildings = (farm, needs) => needs.every((id) => farm.buildings[id]);
const clone = (farm) => JSON.parse(JSON.stringify(farm));
export function createFarmHarness({ rng = Math.random, saved = null } = {}) {
  let farm = saved || { coins: 0, harvests: 0, buildings: { [BUILDING.SHOP]: true }, inventory: emptyInventory(), orderId: 'apple-basket', message: '상점에 첫 주문이 들어왔어요. 과수원에서 사과를 수확하세요.' };
  // 이전 저장본도 첫 진입 흐름(기본 상점 + 첫 손님 주문)으로 안전하게 이관한다.
  farm.buildings = { [BUILDING.SHOP]: true, ...(farm.buildings || {}) };
  farm.inventory = { ...emptyInventory(), ...(farm.inventory || {}) };
  if (!farm.orderId && farm.harvests === 0) farm.orderId = 'apple-basket';
  const menu = () => MENU.filter((item) => hasBuildings(farm, item.needs));
  const assignOrder = () => {
    const choices = menu();
    // 첫 수확(사과 6, 베리 4)만으로 첫 판매까지 연결되도록 시작 주문은 고정한다.
    farm.orderId = farm.harvests === 1 ? 'apple-basket' : (choices.length ? choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))].id : null);
  };
  const order = () => MENU.find((item) => item.id === farm.orderId) || null;
  return {
    state: () => clone(farm), menu, order,
    harvest(reward = { apple: 6, berry: 4 }) {
      farm.harvests += 1; farm.inventory[ITEM.APPLE] += reward.apple; farm.inventory[ITEM.BERRY] += reward.berry;
      if (farm.buildings[BUILDING.WELL]) farm.inventory[ITEM.WATER] += 2;
      if (farm.buildings[BUILDING.HIVE]) farm.inventory[ITEM.HONEY] += 1;
      if (farm.buildings[BUILDING.MILL]) farm.inventory[ITEM.FLOUR] += 1;
      farm.message = '수확을 재고에 담았어요. 상점 주문을 납품하세요.';
      if (!farm.orderId) assignOrder(); return clone(farm);
    },
    build(id) { const building = BUILDINGS[id]; if (!building || farm.buildings[id] || !farm.buildings[BUILDING.SHOP] || farm.coins < building.cost) return false; farm.coins -= building.cost; farm.buildings[id] = true; farm.message = building.name + '을 지었어요.'; return true; },
    canFulfill() { const item = order(); return !!item && Object.entries(item.recipe).every(([id, amount]) => farm.inventory[id] >= amount); },
    fulfill() { const item = order(); if (!item || !this.canFulfill()) return false; Object.entries(item.recipe).forEach(([id, amount]) => { farm.inventory[id] -= amount; }); farm.coins += item.price; farm.orderId = null; farm.message = '손님이 ' + item.name + '을 가져가고 ' + item.price + '코인을 남겼어요.'; return true; },
    restore(value) { if (value?.inventory && value?.buildings) farm = value; return clone(farm); },
  };
}
