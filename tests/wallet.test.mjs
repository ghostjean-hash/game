// 공용 지갑 부품 검사 (설계 docs/plans/design-2026-09-06-platform-wallet-shop.md 8.1).
//
// 목적: 재화는 사용자가 시간을 들여 모은 것이라 조용히 사라지면 되돌릴 길이 없다.
// 벌기·쓰기·거절이 한 곳에 모였으므로 그 한 곳이 틀리면 모든 게임이 함께 틀린다.
// 여기서 잡히지 않는 것: 잔액 표시 화면·숫자 올라감 효과·실제 브라우저 (설계 8.2가 담당).
// 실행: node tests/wallet.test.mjs

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

const results = [];
function test(name, fn) {
  try { fn(); results.push({ ok: true, name }); }
  catch (err) { results.push({ ok: false, name, err }); }
}

const GOLD = [{ id: 'gold', label: '골드', icon: '🪙' }];
const TWO = [{ id: 'gold', label: '골드' }, { id: 'key', label: '열쇠' }];

// 쪽지와 소리를 받아 적는 가짜 그릇. 거절이 실제로 알려졌는지 세려고 둔다.
function spies() {
  const toasts = [];
  const sounds = [];
  return {
    toasts,
    sounds,
    overlay: { toast: (t) => toasts.push(t) },
    audio: { play: (s) => sounds.push(s) },
  };
}

function freshWallet(currencies = GOLD, seed = null) {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('walletgame');
  if (seed) save.writeWallet(seed);
  const sp = spies();
  return { save, sp, wallet: createWallet({ save, currencies, overlay: sp.overlay, audio: sp.audio }) };
}

// --- 1. 벌고 쓰기 ---

test('벌면 잔액이 늘고 저장에 남는다', () => {
  const { wallet, save } = freshWallet();
  assert.equal(wallet.balance(), 0);
  assert.equal(wallet.earn(30), 30);
  assert.equal(wallet.earn(12), 42);
  assert.equal(wallet.balance(), 42);
  assert.equal(save.readWallet().gold, 42);
});

test('쓰면 잔액이 줄고 저장에 남는다', () => {
  const { wallet, save } = freshWallet(GOLD, { gold: 100 });
  assert.equal(wallet.spend(30), true);
  assert.equal(wallet.balance(), 70);
  assert.equal(save.readWallet().gold, 70);
});

test('모자라면 한 푼도 빠지지 않고 거절된다', () => {
  const { wallet, save, sp } = freshWallet(GOLD, { gold: 10 });
  assert.equal(wallet.spend(40), false);
  assert.equal(wallet.balance(), 10);          // 부분 차감이 없다
  assert.equal(save.readWallet().gold, 10);
  assert.equal(sp.toasts.length, 1);           // 왜 안 되는지 알려 준다
  assert.equal(sp.sounds[0], 'deny');
});

test('딱 맞는 값은 쓸 수 있고 0이 된다', () => {
  const { wallet } = freshWallet(GOLD, { gold: 40 });
  assert.equal(wallet.spend(40), true);
  assert.equal(wallet.balance(), 0);
});

// --- 2. 이상한 값 ---

test('음수와 숫자 아닌 값은 받지 않는다', () => {
  const { wallet } = freshWallet(GOLD, { gold: 50 });
  assert.equal(wallet.spend(-10), false);
  assert.equal(wallet.spend('30'), false);
  assert.equal(wallet.spend(Number.NaN), false);
  assert.equal(wallet.balance(), 50);          // 어느 쪽으로도 안 움직인다
  wallet.earn(-10);
  wallet.earn('20');
  assert.equal(wallet.balance(), 50);
});

test('0을 쓰는 것은 언제나 통과한다', () => {
  const { wallet } = freshWallet();
  assert.equal(wallet.spend(0), true);
  assert.equal(wallet.balance(), 0);
});

// --- 3. 재화가 여럿일 때 ---

test('재화가 여럿이어도 서로 섞이지 않는다', () => {
  const { wallet, save } = freshWallet(TWO, { gold: 100, key: 3 });
  assert.equal(wallet.spend(2, { cur: 'key' }), true);
  assert.equal(wallet.balance('key'), 1);
  assert.equal(wallet.balance('gold'), 100);   // 첫째가 기본 재화다
  assert.equal(wallet.balance(), 100);
  assert.equal(save.readWallet().key, 1);
  assert.equal(save.readWallet().gold, 100);
});

test('없는 재화를 대면 기본 재화로 본다', () => {
  const { wallet } = freshWallet(TWO, { gold: 7, key: 9 });
  assert.equal(wallet.balance('coin'), 7);
});

test('모자라다는 쪽지가 그 재화 이름을 쓴다', () => {
  const { wallet, sp } = freshWallet(TWO, { gold: 0, key: 0 });
  wallet.spend(1, { cur: 'key' });
  assert.equal(sp.toasts[0], '열쇠가 모자라요');   // 받침 없음
  wallet.spend(1, { cur: 'gold' });
  assert.equal(sp.toasts[1], '골드가 모자라요');
});

test('알리기만 하는 문은 잔액을 건드리지 않는다', () => {
  // 상점이 살 수 없는 품목을 거절할 때 쓴다 - 이미 모자란 것을 아는 자리라
  // 빼기를 시도할 이유가 없다.
  const { wallet, sp } = freshWallet(GOLD, { gold: 5 });
  wallet.refuse();
  assert.equal(wallet.balance(), 5);
  assert.equal(sp.toasts[0], '골드가 모자라요');
  assert.equal(sp.sounds[0], 'deny');
});

// --- 4. 저장이 이상할 때 ---

test('저장이 비었거나 깨져 있어도 0에서 시작한다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('brokenwallet');
  save.set('wallet', { gold: '많음' });         // 숫자가 아닌 값이 들어 있다
  const wallet = createWallet({ save, currencies: GOLD });
  assert.equal(wallet.balance(), 0);
  assert.equal(wallet.earn(5), 5);
});

test('저장에 있던 다른 재화는 선언한 것만 읽는다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('extrawallet');
  save.writeWallet({ gold: 10, ruby: 99 });
  const wallet = createWallet({ save, currencies: GOLD });
  assert.equal(wallet.balance(), 10);
  wallet.earn(1);
  // 선언하지 않은 재화는 지갑이 모른다 - 저장에서도 사라진다.
  assert.equal(save.readWallet().ruby, undefined);
});

// --- 5. 있고 없음 ---

test('재화를 선언하지 않으면 지갑이 만들어지지 않는다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('nowallet');
  assert.throws(() => createWallet({ save, currencies: [] }), /currencies required/);
  assert.throws(() => createWallet({ currencies: GOLD }), /save required/);
});

test('쪽지 그릇과 소리 그릇이 없어도 거절이 돈다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('quietwallet');
  const wallet = createWallet({ save, currencies: GOLD });
  assert.equal(wallet.spend(10), false);
  assert.equal(wallet.balance(), 0);
});

// --- 6. 바뀔 때 알리기 ---

test('잔액이 바뀌면 듣는 쪽에 알린다', () => {
  const { wallet } = freshWallet(GOLD, { gold: 20 });
  const seen = [];
  const off = wallet.onChange((cur, now, delta) => seen.push([cur, now, delta]));
  wallet.earn(10);
  wallet.spend(5);
  wallet.spend(999);                            // 거절은 알리지 않는다
  off();
  wallet.earn(100);                             // 끊은 뒤는 안 온다
  assert.deepEqual(seen, [['gold', 30, 10], ['gold', 25, -5]]);
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
