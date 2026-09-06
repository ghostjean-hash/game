// 공용 상점 부품 검사 (설계 docs/plans/design-2026-09-06-platform-wallet-shop.md 8.1).
//
// 목적: 사는 순간에 잔액과 보유가 함께 움직여야 한다. 한쪽만 움직이면 돈은 빠졌는데 물건이
// 없거나, 안 산 물건을 가진 상태가 저장에 남는다. 둘 다 되돌릴 길이 없는 사고다.
// 여기서 잡히지 않는 것: 상점 화면·미리 보기 그림·실제 브라우저 (설계 8.2가 담당).
// 실행: node tests/shop.test.mjs

import assert from 'node:assert/strict';

function fakeLocalStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
  };
}
globalThis.localStorage = fakeLocalStorage();

const { createSave } = await import('../shared/frame/save.js');
const { createWallet } = await import('../shared/frame/wallet.js');
const { createShop } = await import('../shared/frame/shop.js');

const results = [];
function test(name, fn) {
  try { fn(); results.push({ ok: true, name }); }
  catch (err) { results.push({ ok: false, name, err }); }
}

// 종류 둘. 값 없는 것이 하나씩 섞여 있어 기본 품목 규칙까지 함께 본다.
function kinds() {
  return [
    {
      id: 'theme',
      defaultItem: 'cream',
      items: [
        { id: 'cream', name: '크림', price: 0 },
        { id: 'sky', name: '하늘', price: 40 },
        { id: 'mint', name: '민트', price: 90 },
      ],
    },
    {
      id: 'hat',
      defaultItem: 'none',
      items: [
        { id: 'none', name: '없음', price: 0 },
        { id: 'crown', name: '왕관', price: 60 },
      ],
    },
  ];
}

function build({ gold = 100, seedOwned = null, seedEquipped = null, currency = 'gold', ks = null } = {}) {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('shopgame');
  save.writeWallet({ gold });
  if (seedOwned) save.writeOwned(seedOwned);
  if (seedEquipped) save.writeEquipped(seedEquipped);
  const equipped = [];
  const wallet = createWallet({ save, currencies: [{ id: 'gold', label: '골드' }] });
  const shop = createShop({
    save,
    wallet,
    id: 'shop',
    title: '상점',
    currency,
    kinds: ks || kinds(),
    onEquip: (k, item) => equipped.push([k, item.id]),
  });
  return { save, wallet, shop, equipped };
}

// --- 1. 처음 상태 ---

test('값 없는 품목은 처음부터 가진 것이다', () => {
  const { shop } = build();
  assert.equal(shop.isOwned('theme', 'cream'), true);
  assert.equal(shop.isOwned('theme', 'sky'), false);
});

test('저장이 비면 기본 품목을 쓰는 중이다', () => {
  const { shop } = build();
  assert.equal(shop.equipped('theme'), 'cream');
  assert.equal(shop.equipped('hat'), 'none');
});

test('기본 품목이 목록 첫째가 아니어도 그것이 기본이다', () => {
  // 목록 순서가 곧 기본값이 되면 화면에 보이는 차례를 바꿀 때 기본값이 함께 바뀐다.
  const { shop } = build({
    ks: [{
      id: 'style',
      defaultItem: 'b',
      items: [{ id: 'a', name: 'A', price: 0 }, { id: 'b', name: 'B', price: 0 }],
    }],
  });
  assert.equal(shop.equipped('style'), 'b');
});

test('없어진 품목이 저장돼 있으면 기본으로 돌아간다', () => {
  const { shop } = build({ seedEquipped: { theme: '지워진테마' } });
  assert.equal(shop.equipped('theme'), 'cream');
});

// --- 2. 사기 ---

test('사면 잔액이 값만큼 빠지고 보유와 장착이 함께 남는다', () => {
  const { shop, wallet, save, equipped } = build({ gold: 100 });
  const r = shop.select('theme', 'sky');
  assert.equal(r.ok, true);
  assert.equal(r.bought, true);
  assert.equal(wallet.balance(), 60);
  assert.equal(shop.isOwned('theme', 'sky'), true);
  assert.equal(shop.equipped('theme'), 'sky');
  assert.deepEqual(save.readOwned().theme, ['sky']);
  assert.equal(save.readEquipped().theme, 'sky');
  assert.deepEqual(equipped, [['theme', 'sky']]);
});

test('모자라면 잔액도 보유도 장착도 하나도 안 바뀐다', () => {
  const { shop, wallet, save, equipped } = build({ gold: 50 });
  const r = shop.select('theme', 'mint');   // 90골드
  assert.equal(r.ok, false);
  assert.equal(r.bought, false);
  assert.equal(wallet.balance(), 50);
  assert.equal(shop.isOwned('theme', 'mint'), false);
  assert.equal(shop.equipped('theme'), 'cream');
  assert.equal(save.readEquipped().theme, undefined);
  assert.deepEqual(equipped, []);
});

test('이미 가진 것을 누르면 값이 또 빠지지 않고 쓰는 것만 바뀐다', () => {
  const { shop, wallet } = build({ gold: 100 });
  shop.select('theme', 'sky');               // 40 빠짐
  shop.select('theme', 'cream');             // 값 없는 기본으로
  const before = wallet.balance();
  const r = shop.select('theme', 'sky');     // 이미 산 것으로 되돌리기
  assert.equal(r.ok, true);
  assert.equal(r.bought, false);
  assert.equal(wallet.balance(), before);
  assert.equal(shop.equipped('theme'), 'sky');
});

test('같은 것을 두 번 사도 보유 목록에 두 번 들어가지 않는다', () => {
  const { shop, save, wallet } = build({ gold: 200 });
  shop.select('theme', 'sky');
  shop.select('theme', 'sky');
  assert.deepEqual(save.readOwned().theme, ['sky']);
  assert.equal(wallet.balance(), 160);
});

test('없는 품목을 누르면 아무 일도 없다', () => {
  const { shop, wallet } = build({ gold: 100 });
  const r = shop.select('theme', '없는것');
  assert.equal(r.ok, false);
  assert.equal(wallet.balance(), 100);
  assert.equal(shop.select('없는종류', 'sky').ok, false);
});

test('살 수 있는지 판정이 잔액을 본다', () => {
  const { shop } = build({ gold: 50 });
  assert.equal(shop.canBuy('theme', 'cream'), true);   // 이미 가진 것
  assert.equal(shop.canBuy('theme', 'sky'), true);     // 40
  assert.equal(shop.canBuy('theme', 'mint'), false);   // 90
});

// --- 3. 종류가 여럿일 때 ---

test('종류가 여럿이어도 서로 섞이지 않는다', () => {
  const { shop, save, wallet } = build({ gold: 200 });
  shop.select('theme', 'sky');
  shop.select('hat', 'crown');
  assert.equal(wallet.balance(), 100);
  assert.equal(shop.equipped('theme'), 'sky');
  assert.equal(shop.equipped('hat'), 'crown');
  assert.deepEqual(save.readOwned().theme, ['sky']);
  assert.deepEqual(save.readOwned().hat, ['crown']);
});

test('저장에 있던 다른 종류를 지우지 않는다', () => {
  const { shop, save } = build({ gold: 200, seedOwned: { badge: ['star'] }, seedEquipped: { badge: 'star' } });
  shop.select('theme', 'sky');
  assert.deepEqual(save.readOwned().badge, ['star']);
  assert.equal(save.readEquipped().badge, 'star');
});

// --- 4. 값 없는 상점(꾸미기) ---

test('값 없는 상점은 지갑 없이도 고르기가 된다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('decorgame');
  const shop = createShop({
    save,
    id: 'decor',
    title: '꾸미기',
    kinds: [{
      id: 'style',
      defaultItem: 'c',
      items: [{ id: 'a', name: '포니', price: 0 }, { id: 'c', name: '밥풀이', price: 0 }],
    }],
  });
  assert.equal(shop.equipped('style'), 'c');
  assert.equal(shop.select('style', 'a').ok, true);
  assert.equal(shop.equipped('style'), 'a');
  assert.equal(save.readEquipped().style, 'a');
});

test('값 없는 상점에서는 값이 붙은 품목도 처음부터 가진 것이다', () => {
  // 꾸미기는 사는 절차가 없다. 값이 남아 있어도 고르기만 한다(기획서 4.7).
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('decorgame2');
  const shop = createShop({
    save,
    id: 'decor',
    title: '꾸미기',
    kinds: [{ id: 'style', items: [{ id: 'a', name: 'A', price: 0 }, { id: 'b', name: 'B', price: 50 }] }],
  });
  assert.equal(shop.isOwned('style', 'b'), true);
  assert.equal(shop.select('style', 'b').ok, true);
});

// --- 4-1. 여러 상점이 한 저장 칸을 나눠 쓸 때 (1회차 검사 1·2번) ---
//
// owned·equipped는 게임당 칸 하나이고 상점 여럿이 그 칸을 나눠 쓴다. 상점마다 캐시를
// 두었더니 (1) 한 번도 안 읽은 캐시를 내려써 산 물건이 통째로 사라지고 (2) 나중에 쓰는
// 쪽이 자기 스냅샷으로 상대의 선택을 되돌렸다. 둘 다 사람이 첫날 밟는 경로였다.

// 값 있는 상점과 값 없는 상점을 한 저장 위에 나란히 세운다(러시아워와 같은 모양).
function pair({ gold = 100 } = {}) {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('pairgame');
  save.writeWallet({ gold });
  const wallet = createWallet({ save, currencies: [{ id: 'gold', label: '골드' }] });
  const paid = createShop({ save, wallet, id: 'shop', title: '상점', currency: 'gold', kinds: kinds() });
  const free = createShop({
    save,
    id: 'decor',
    title: '꾸미기',
    kinds: [{
      id: 'style',
      defaultItem: 'c',
      items: [{ id: 'a', name: '포니', price: 0 }, { id: 'c', name: '밥풀이', price: 0 }],
    }],
  });
  return { save, wallet, paid, free };
}

test('값 없는 상점에서 골라도 산 물건이 사라지지 않는다', () => {
  const { save, paid, free } = pair();
  paid.select('theme', 'sky');                 // 40골드를 주고 산다
  assert.equal(paid.isOwned('theme', 'sky'), true);
  free.select('style', 'a');                   // 꾸미기에서 캐릭터를 고른다
  assert.equal(paid.isOwned('theme', 'sky'), true);
  assert.deepEqual(save.readOwned().theme, ['sky']);
});

test('한 상점의 선택이 다른 상점의 선택을 되돌리지 않는다', () => {
  const { save, paid, free } = pair({ gold: 200 });
  paid.select('theme', 'sky');                 // 먼저 둘 다 한 번씩 읽게 만든다
  free.select('style', 'a');
  paid.select('hat', 'crown');
  assert.equal(save.readEquipped().style, 'a');
  assert.equal(save.readEquipped().theme, 'sky');
  assert.equal(save.readEquipped().hat, 'crown');
  free.select('style', 'c');
  assert.equal(save.readEquipped().theme, 'sky');
  assert.equal(save.readEquipped().hat, 'crown');
  assert.equal(save.readEquipped().style, 'c');
});

test('이 부품이 모르는 옛 종류를 저장에서 지우지 않는다', () => {
  // 옛 빌드가 남긴 종류나 다른 상점의 종류가 저장 한 번에 사라지면 안 된다.
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('legacyshop');
  save.writeOwned({ 옛종류: ['x'] });
  save.writeEquipped({ 옛종류: 'x' });
  const shop = createShop({
    save,
    id: 'decor',
    title: '꾸미기',
    kinds: [{ id: 'style', defaultItem: 'a', items: [{ id: 'a', name: 'A', price: 0 }, { id: 'b', name: 'B', price: 0 }] }],
  });
  shop.select('style', 'b');
  assert.deepEqual(save.readOwned().옛종류, ['x']);
  assert.equal(save.readEquipped().옛종류, 'x');
});

// --- 5. 잘못 세우면 만들 때 죽는다 ---

test('지갑 없이 값 있는 상점을 세우면 만들 때 실패한다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('nowalletshop');
  assert.throws(
    () => createShop({ save, id: 'shop', currency: 'gold', kinds: kinds() }),
    /currency needs a wallet/,
  );
});

test('지갑에 없는 재화 이름을 대면 만들 때 실패한다', () => {
  // 그냥 두면 지갑이 기본 재화로 되돌려 값이 엉뚱한 재화에서 빠지는데,
  // 화면은 가격도 잔액도 안 그려 꾸미기처럼 보인다(1회차 검사 4번).
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('wrongcur');
  const wallet = createWallet({ save, currencies: [{ id: 'gold', label: '골드' }] });
  assert.throws(
    () => createShop({ save, wallet, id: 'shop', currency: 'coin', kinds: kinds() }),
    /unknown currency/,
  );
});

test('하나만 쓰는 방식이 아닌 종류를 넘기면 만들 때 실패한다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('multishop');
  assert.throws(
    () => createShop({
      save,
      id: 'shop',
      kinds: [{ id: 'badge', mode: 'multi', items: [{ id: 'a', name: 'A', price: 0 }] }],
    }),
    /only 'single'/,
  );
});

test('종류나 품목이 비면 만들 때 실패한다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('emptyshop');
  assert.throws(() => createShop({ save, id: 'shop', kinds: [] }), /kinds required/);
  assert.throws(() => createShop({ save, id: 'shop', kinds: [{ id: 'k', items: [] }] }), /items required/);
  assert.throws(() => createShop({ id: 'shop', kinds: kinds() }), /save required/);
});

// --- 6. 바뀔 때 알리기 ---

test('보유·장착이 바뀌면 듣는 쪽에 알린다', () => {
  const { shop } = build({ gold: 100 });
  const seen = [];
  const off = shop.onChange((k, item, info) => seen.push([k, item.id, info.bought]));
  shop.select('theme', 'sky');
  shop.select('theme', 'mint');   // 잔액 60, 값 90 - 거절이라 알리지 않는다
  off();
  shop.select('hat', 'crown');
  assert.deepEqual(seen, [['theme', 'sky', true]]);
});

// --- 출력 ---
const line = '─'.repeat(60);
const failed = results.filter((r) => !r.ok);
console.log(line);
for (const r of results) {
  if (r.ok) console.log(`  ✓ ${r.name}`);
  else console.log(`  ✗ ${r.name}\n      ${r.err.message.split('\n')[0]}`);
}
console.log(line);
if (failed.length) {
  console.log(`FAIL — ${failed.length}건 실패 / 통과 ${results.length - failed.length}`);
  process.exit(1);
} else {
  console.log(`PASS — 통과 ${results.length} / 실패 0`);
  process.exit(0);
}
