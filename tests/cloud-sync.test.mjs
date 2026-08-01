// 세이브 동기화 조립부 검사 (설계 5.3). 외부 의존 0, 순수 node.
//
// 진짜 구글 대신 메모리 위 가짜 저장소와 가짜 로그인을 끼우고, 전체 흐름이 순서대로 도는지 본다.
// 여기서 잡히지 않는 것: 실제 로그인 창, 실제 드라이브 통신, 화면 (5.4 / 5.5 담당).
// 실행: node tests/cloud-sync.test.mjs

import assert from 'node:assert/strict';
import { createLocal, META_KEY } from '../shared/cloud/local.js';
import { stampSlot, slotIdOf } from '../shared/cloud/stamp.js';
import { createMemoryRemote } from '../shared/cloud/remote.js';
import { createMockAuth } from '../shared/cloud/auth.js';
import { createSync, STATUS } from '../shared/cloud/sync.js';
import { SCHEMA } from '../shared/cloud/merge.js';

const T = 1_700_000_000_000;
const results = [];

function test(name, fn) {
  results.push({ name, fn });
}

// --- 테스트용 가짜 기기 저장소 ---
function makeStorage(init = {}) {
  const map = new Map(Object.entries(init));
  return {
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    _dump() { return Object.fromEntries(map); },
  };
}

// --- 테스트용 가짜 타이머(디바운스를 수동으로 실행) ---
function makeScheduler() {
  let seq = 0;
  const timers = new Map();
  const delays = [];
  return {
    setTimeout(fn, ms) { const id = (seq += 1); timers.set(id, fn); delays.push(ms); return id; },
    clearTimeout(id) { timers.delete(id); },
    pendingCount() { return timers.size; },
    lastDelay() { return delays[delays.length - 1]; },
    async runAll() {
      const fns = [...timers.values()];
      timers.clear();
      for (const fn of fns) await fn();
    },
  };
}

function setup({ storageInit = {}, remoteInit = null, signedIn = false, tokenFails = false } = {}) {
  const storage = makeStorage(storageInit);
  const local = createLocal({ storage });
  const remote = createMemoryRemote({ initial: remoteInit });
  const auth = createMockAuth({ signedIn, tokenFails });
  const scheduler = makeScheduler();
  let clock = T;
  const sync = createSync({
    auth, remote, local, scheduler,
    device: 'test-device',
    now: () => clock,
    debounceMs: 4000,
  });
  return {
    storage, local, remote, auth, scheduler, sync,
    tick(ms) { clock += ms; },
    read(key) {
      const raw = storage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    },
  };
}

function remoteDoc(slots, updatedAt = T) {
  return { schema: SCHEMA, updatedAt, device: 'other', slots };
}

// --- 5.3.1 미로그인 ---
test('5.3.1 미로그인 상태에서는 기기 저장만 되고 업로드를 시도하지 않는다', async () => {
  const s = setup({ storageInit: { 'gg.tetris.highscore': '12000' } });
  await s.sync.start();
  s.sync.notifyChange('tetris');
  await s.scheduler.runAll();

  assert.equal(s.remote._calls.save, 0);
  assert.equal(s.remote._calls.load, 0);
  assert.equal(s.scheduler.pendingCount(), 0);
  assert.equal(s.sync.getStatus().state, STATUS.SIGNED_OUT);
  // 기기 저장은 그대로다.
  assert.equal(s.read('gg.tetris.highscore'), 12000);
});

// --- 5.3.2 첫 로그인, 클라우드 비어 있음 ---
test('5.3.2 클라우드가 비어 있으면 기기 기록 전체가 1회 업로드된다', async () => {
  const s = setup({
    storageInit: {
      'gg.tetris.highscore': '12000',
      'gg.sudoku.cleared': '3',
      'lotto_characters': '[{"id":"c1"}]',
      'lotto_draws': '[1,2,3]', // 동기화 제외 대상
    },
    signedIn: true,
  });
  await s.sync.start();

  assert.equal(s.remote._calls.save, 1);
  const doc = s.remote._peek();
  assert.deepEqual(doc.slots['gg.tetris'].data, { highscore: 12000 });
  assert.deepEqual(doc.slots['gg.sudoku'].data, { cleared: 3 });
  assert.deepEqual(doc.slots['lotto'].data, { characters: [{ id: 'c1' }] });
  // 회차 캐시는 올라가지 않는다.
  assert.equal('draws' in doc.slots['lotto'].data, false);
  assert.equal(s.sync.getStatus().state, STATUS.SYNCED);
});

// --- 5.3.3 클라우드에 기록이 있는 경우 ---
test('5.3.3 클라우드 기록이 기기에 반영되고 게임이 다시 읽으면 그 값이 나온다', async () => {
  const s = setup({
    remoteInit: remoteDoc({ 'gg.sudoku': { updatedAt: T - 1000, data: { cleared: 7, best: 42 } } }),
    signedIn: true,
  });
  await s.sync.start();

  assert.equal(s.read('gg.sudoku.cleared'), 7);
  assert.equal(s.read('gg.sudoku.best'), 42);
  // 기기가 알고 있는 그 슬롯의 갱신 시각도 클라우드 값으로 맞춰진다.
  assert.equal(s.local.readMeta()['gg.sudoku'].updatedAt, T - 1000);
  assert.equal(s.sync.getStatus().state, STATUS.SYNCED);
});

// --- 5.3.4 업로드 실패와 재시도 ---
test('5.3.4 업로드가 실패해도 기기 기록은 남고 다음 저장 때 재시도된다', async () => {
  const s = setup({ storageInit: { 'gg.tetris.highscore': '100' }, signedIn: true });
  s.remote._failNextSave(1);
  await s.sync.start();

  assert.equal(s.sync.getStatus().state, STATUS.OFFLINE);
  assert.equal(s.remote._peek(), null); // 클라우드에는 아무것도 안 올라감
  assert.equal(s.read('gg.tetris.highscore'), 100); // 기기 기록은 무사

  // 다음 저장에서 재시도되어 성공한다.
  s.tick(1000);
  s.storage.setItem('gg.tetris.highscore', '200');
  s.sync.notifyChange('tetris');
  await s.scheduler.runAll();

  assert.equal(s.sync.getStatus().state, STATUS.SYNCED);
  assert.deepEqual(s.remote._peek().slots['gg.tetris'].data, { highscore: 200 });
});

test('5.3.4b 통신 실패로 내려받지 못하면 기기 기록을 덮지 않는다', async () => {
  const s = setup({ storageInit: { 'gg.tetris.highscore': '100' }, signedIn: true });
  s.remote._failNextLoad(1);
  await s.sync.start();

  assert.equal(s.sync.getStatus().state, STATUS.OFFLINE);
  assert.equal(s.remote._calls.save, 0);
  assert.equal(s.read('gg.tetris.highscore'), 100);
});

// --- 5.3.5 디바운스 ---
test('5.3.5 연속 저장 10회는 업로드 1회로 합쳐진다', async () => {
  const s = setup({ signedIn: true });
  await s.sync.start(); // 최초 1회(빈 상태)
  const base = s.remote._calls.save;

  for (let i = 0; i < 10; i += 1) {
    s.storage.setItem('gg.tetris.highscore', String(i));
    s.sync.notifyChange('tetris');
  }
  // 저장 10회를 해도 대기 중인 업로드는 1건뿐이다.
  assert.equal(s.scheduler.pendingCount(), 1);
  await s.scheduler.runAll();

  assert.equal(s.remote._calls.save - base, 1);
  assert.deepEqual(s.remote._peek().slots['gg.tetris'].data, { highscore: 9 });
});

test('5.3.5b 저장이 쉬지 않고 이어져도 정해진 시간 안에는 반드시 올라간다', async () => {
  const s = setup({ signedIn: true });
  await s.sync.start();
  const base = s.remote._calls.save;

  // 2초 간격 저장을 60초 동안 이어간다(대기 시간 2.5초보다 잦다).
  for (let i = 0; i < 30; i += 1) {
    s.storage.setItem('gg.tetris.best.marathon', String(i));
    s.sync.notifyChange('tetris');
    s.tick(2000);
  }
  // 계속 미루기만 했다면 대기 시간이 줄지 않았을 것이다. 상한에 걸려 0이 되어 있어야 한다.
  assert.equal(s.scheduler.lastDelay(), 0);

  await s.scheduler.runAll();
  assert.equal(s.remote._calls.save - base, 1);
});

// --- 게임마다 다른 저장 기준 (사용자 지시 2026-07-29) ---
test('이어하기가 중요한 게임은 빨리 올리고, 저장이 잦은 앱은 모아서 올린다', async () => {
  const a = setup({ signedIn: true });
  await a.sync.start();
  a.sync.notifyChange('flightshooting');
  const fast = a.scheduler.lastDelay();

  const b = setup({ signedIn: true });
  await b.sync.start();
  b.sync.notifyChange('english-reading');
  const slow = b.scheduler.lastDelay();

  assert.equal(fast, 1200);
  assert.equal(slow, 6000);
  assert.ok(fast < slow);
});

test('여러 게임이 함께 바뀌면 가장 급한 쪽 기준으로 올린다', async () => {
  const s = setup({ signedIn: true });
  await s.sync.start();
  s.sync.notifyChange('english-reading'); // 6초
  s.sync.notifyChange('flightshooting');  // 1.2초
  assert.equal(s.scheduler.lastDelay(), 1200);
});

test('기기 상태와 1회성 정리 표식은 계정에 올리지 않는다', async () => {
  const s = setup({
    storageInit: {
      'gg.tetris.best.marathon': '9000',
      'gg.tetris.muted': 'true',
      'gg.english-reading.done': '{"a":1}',
      'gg.english-reading.listScroll': '{"c1":420}',
      'lotto_characters': '[{"id":"c1"}]',
      'lotto_s090_cleared': 'true',
      'lotto_draws': '[1,2]',
    },
    signedIn: true,
  });
  await s.sync.start();
  const doc = s.remote._peek();

  assert.deepEqual(Object.keys(doc.slots['gg.tetris'].data), ['best.marathon']);
  assert.deepEqual(Object.keys(doc.slots['gg.english-reading'].data), ['done']);
  assert.deepEqual(Object.keys(doc.slots['lotto'].data), ['characters']);

  // 올리지 않은 값은 이 기기에 그대로 남아 있어야 한다.
  assert.equal(s.read('gg.tetris.muted'), true);
  assert.deepEqual(s.read('gg.english-reading.listScroll'), { c1: 420 });
  assert.equal(s.read('lotto_s090_cleared'), true);
});

test('제외 항목은 클라우드 데이터를 받아써도 지워지지 않는다', async () => {
  const s = setup({
    storageInit: {
      'gg.tetris.muted': 'true',
      'gg.tetris.best.marathon': '10',
      [META_KEY]: JSON.stringify({ 'gg.tetris': T - 9000 }),
    },
    remoteInit: remoteDoc({ 'gg.tetris': { updatedAt: T, data: { 'best.marathon': 5000 } } }),
    signedIn: true,
  });
  await s.sync.start();
  assert.equal(s.read('gg.tetris.best.marathon'), 5000);
  assert.equal(s.read('gg.tetris.muted'), true);
});

// --- 2026-07-29 모바일 데이터 유실 사고 재발 방지 ---
test('저장 시각이 없는 기존 기기 데이터는 자동으로 밀리지 않고 사용자에게 묻는다', async () => {
  // 사고 재현: 이 기기에는 클라우드 저장을 붙이기 전부터 있던 기록(시각 0),
  // 클라우드에는 다른 기기가 올린 기록(실제 시각). 예전 코드는 조용히 덮었다.
  let asked = null;
  const s = setup({
    storageInit: { 'gg.tetris.best.marathon': '999999' },
    remoteInit: remoteDoc({ 'gg.tetris': { updatedAt: T - 100, data: { 'best.marathon': 10 } } }),
    signedIn: true,
  });
  const sync = createSync({
    auth: s.auth, remote: s.remote, local: s.local, scheduler: s.scheduler,
    now: () => T, onConflicts: (c) => { asked = c; },
  });
  await sync.start();

  assert.equal(sync.getStatus().state, STATUS.CONFLICT);
  assert.equal(asked.length, 1);
  assert.equal(asked[0].reason, 'unknown-time');
  // 묻는 동안 기기 기록은 그대로다.
  assert.equal(s.read('gg.tetris.best.marathon'), 999999);
});

test('지는 쪽이 훨씬 많은 내용을 담고 있으면 자동으로 덮지 않는다', async () => {
  let asked = null;
  const many = {};
  for (let i = 0; i < 20; i += 1) many[`w${i}`] = { status: 'learned' };
  const s = setup({
    storageInit: {
      'gg.english-vocabulary.deck:1:a': JSON.stringify({ progress: many }),
      [META_KEY]: JSON.stringify({ 'gg.english-vocabulary': T - 9000 }),
    },
    remoteInit: remoteDoc({
      'gg.english-vocabulary': { updatedAt: T - 100, data: { 'deck:1:a': { progress: { w0: { status: 'active' } } } } },
    }),
    signedIn: true,
  });
  const sync = createSync({
    auth: s.auth, remote: s.remote, local: s.local, scheduler: s.scheduler,
    now: () => T, onConflicts: (c) => { asked = c; },
  });
  await sync.start();

  assert.equal(sync.getStatus().state, STATUS.CONFLICT);
  assert.equal(asked[0].reason, 'big-loss');
  assert.equal(Object.keys(s.read('gg.english-vocabulary.deck:1:a').progress).length, 20);
});

test('처음 동기화 직전 상태를 한 번 저장해 두고 되돌릴 수 있다', async () => {
  const s = setup({
    storageInit: { 'gg.tetris.best.marathon': '777', [META_KEY]: JSON.stringify({ 'gg.tetris': T - 9000 }) },
    signedIn: true,
  });
  await s.sync.start();

  const snap = s.local.readSnapshot();
  assert.ok(snap, '첫 동기화 전 상태가 저장돼야 한다');
  assert.equal(snap.slots['gg.tetris'].data['best.marathon'], 777);

  // 이후 값이 바뀌어도 되돌리면 처음 값이 돌아온다.
  s.storage.setItem('gg.tetris.best.marathon', '1');
  assert.equal(s.local.restoreSnapshot(), 1);
  assert.equal(s.read('gg.tetris.best.marathon'), 777);
});

test('되돌릴 상태는 한 번만 만들고 이후 덮어쓰지 않는다', async () => {
  const s = setup({
    storageInit: { 'gg.tetris.best.marathon': '777', [META_KEY]: JSON.stringify({ 'gg.tetris': T - 9000 }) },
    signedIn: true,
  });
  await s.sync.start();
  s.storage.setItem('gg.tetris.best.marathon', '1');
  await s.sync.flushNow();
  assert.equal(s.local.readSnapshot().slots['gg.tetris'].data['best.marathon'], 777);
});

// --- 5.3.6 로그아웃 ---
test('5.3.6 로그아웃해도 기기 기록은 지워지지 않는다', async () => {
  const s = setup({ storageInit: { 'gg.tetris.highscore': '12000' }, signedIn: true });
  await s.sync.start();
  s.auth.signOut();

  assert.equal(s.sync.getStatus().state, STATUS.SIGNED_OUT);
  assert.equal(s.read('gg.tetris.highscore'), 12000);

  // 로그아웃 뒤의 저장은 업로드를 시도하지 않는다.
  const before = s.remote._calls.save;
  s.sync.notifyChange('tetris');
  await s.scheduler.runAll();
  assert.equal(s.remote._calls.save, before);
});

// --- 5.3.7 로그인 유효기간 만료 ---
test('5.3.7 로그인을 조용히 되살리지 못하면 동기화만 끄고 게임에는 영향을 주지 않는다', async () => {
  const s = setup({ storageInit: { 'gg.tetris.highscore': '12000' }, signedIn: true, tokenFails: true });
  await s.sync.start();

  assert.equal(s.sync.getStatus().state, STATUS.DISABLED);
  assert.equal(s.remote._calls.save, 0);
  assert.equal(s.remote._calls.load, 0);
  // 게임 저장은 평소대로 동작한다.
  s.storage.setItem('gg.tetris.highscore', '13000');
  s.sync.notifyChange('tetris');
  await s.scheduler.runAll();
  assert.equal(s.read('gg.tetris.highscore'), 13000);
  assert.equal(s.sync.getStatus().state, STATUS.DISABLED);
});

// --- 충돌 흐름 (설계 4.7.3의 근거) ---
test('충돌 시 올리지 않고 사용자 선택을 기다린다', async () => {
  const s = setup({
    storageInit: { 'gg.tetris.highscore': '500', [META_KEY]: JSON.stringify({ 'gg.tetris': T - 100 }) },
    remoteInit: remoteDoc({ 'gg.tetris': { updatedAt: T - 100, data: { highscore: 700 } } }),
    signedIn: true,
  });
  let seen = null;
  const s2 = { ...s };
  s2.sync = createSync({
    auth: s.auth, remote: s.remote, local: s.local, scheduler: s.scheduler,
    now: () => T, onConflicts: (c) => { seen = c; },
  });
  await s2.sync.start();

  assert.equal(s2.sync.getStatus().state, STATUS.CONFLICT);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].slot, 'gg.tetris');
  assert.equal(s.remote._calls.save, 0); // 고르기 전에는 올리지 않는다
  assert.equal(s.read('gg.tetris.highscore'), 500); // 기기 기록도 그대로
});

test('충돌에서 클라우드를 고르면 기기에 반영되고 올라간다', async () => {
  const s = setup({
    storageInit: { 'gg.tetris.highscore': '500', [META_KEY]: JSON.stringify({ 'gg.tetris': T - 100 }) },
    remoteInit: remoteDoc({ 'gg.tetris': { updatedAt: T - 100, data: { highscore: 700 } } }),
    signedIn: true,
  });
  await s.sync.start();
  assert.equal(s.sync.getStatus().state, STATUS.CONFLICT);

  await s.sync.resolveConflicts({ 'gg.tetris': 'remote' });
  assert.equal(s.read('gg.tetris.highscore'), 700);
  assert.equal(s.sync.getStatus().state, STATUS.SYNCED);
});

test('클라우드를 고르면 같은 선택 창이 다시 뜨지 않는다 (2026-08-01 반복 신고)', async () => {
  // 이 기기에만 있는 항목(hintsUsed)이 남아 있으면, 클라우드 시각을 그대로 물려받는 순간
  // 다음 병합에서 "시각은 같은데 내용이 다르다"가 다시 성립해 같은 질문이 영원히 반복됐다.
  const s = setup({
    storageInit: {
      'gg.rushhour.progress': '{"p1":1}',
      'gg.rushhour.hintsUsed': '4',
      [META_KEY]: JSON.stringify({ 'gg.rushhour': { updatedAt: T - 100, createdAt: T - 90000, lineage: 'ln-a' } }),
    },
    remoteInit: remoteDoc({
      'gg.rushhour': { updatedAt: T - 100, createdAt: T - 90000, lineage: 'ln-a', device: 'other', data: { progress: { p9: 1 } } },
    }),
    signedIn: true,
  });
  await s.sync.start();
  assert.equal(s.sync.getStatus().state, STATUS.CONFLICT);

  await s.sync.resolveConflicts({ 'gg.rushhour': 'remote' });
  assert.equal(s.sync.getStatus().state, STATUS.SYNCED);
  assert.deepEqual(s.read('gg.rushhour.progress'), { p9: 1 }); // 클라우드 값이 반영됐다
  assert.equal(s.read('gg.rushhour.hintsUsed'), 4);            // 이 기기 것도 지워지지 않았다

  // 한 번 더 동기화해도 다시 묻지 않는다.
  await s.sync.pullNow();
  assert.equal(s.sync.getStatus().state, STATUS.SYNCED);
  assert.equal(s.sync.getPendingConflicts().length, 0);
});

test('충돌에서 이 기기를 고르면 기기 기록이 살아남는다', async () => {
  const s = setup({
    storageInit: { 'gg.tetris.highscore': '500', [META_KEY]: JSON.stringify({ 'gg.tetris': T - 100 }) },
    remoteInit: remoteDoc({ 'gg.tetris': { updatedAt: T - 100, data: { highscore: 700 } } }),
    signedIn: true,
  });
  await s.sync.start();
  await s.sync.resolveConflicts({ 'gg.tetris': 'local' });

  assert.equal(s.read('gg.tetris.highscore'), 500);
  assert.deepEqual(s.remote._peek().slots['gg.tetris'].data, { highscore: 500 });
  assert.equal(s.sync.getStatus().state, STATUS.SYNCED);
});

// --- 기기 저장 읽고 쓰기 규칙 ---
test('기기 저장 스캔은 두 가지 키 규칙을 모두 알아본다', async () => {
  const s = setup({
    storageInit: {
      'gg.english-vocabulary.deck': '{"a":1}',
      'lotto_options': '{"advancedMode":true}',
      'other_app_key': 'x',       // 우리 것이 아님
      'gg.broken': 'y',           // 네임스페이스 구분이 없음
      [META_KEY]: '{}',           // 메타 자신
    },
  });
  const slots = s.local.readAllSlots();
  assert.deepEqual(Object.keys(slots).sort(), ['gg.english-vocabulary', 'lotto']);
  assert.deepEqual(slots['gg.english-vocabulary'].data, { deck: { a: 1 } });
});

test('클라우드 데이터를 기기에 써도 기기에 있던 항목을 지우지 않는다', async () => {
  const s = setup({ storageInit: { 'lotto_draws': '[1,2,3]', 'lotto_options': '{"old":true}' } });
  s.local.writeSlot('lotto', { characters: [{ id: 'c9' }] }, T);

  // 2026-07-29 유실 사고 이후 원칙: 클라우드에 없다는 이유로 기기 저장을 지우지 않는다.
  assert.deepEqual(s.read('lotto_draws'), [1, 2, 3]);
  assert.deepEqual(s.read('lotto_options'), { old: true });
  assert.deepEqual(s.read('lotto_characters'), [{ id: 'c9' }]);
});

test('해석할 수 없는 저장 값은 동기화에서 빼되 기기 원본은 건드리지 않는다', async () => {
  const s = setup({ storageInit: { 'gg.tetris.highscore': 'not-json{{', 'gg.tetris.level': '3' } });
  const slots = s.local.readAllSlots();
  assert.deepEqual(slots['gg.tetris'].data, { level: 3 });
  assert.equal(s.storage.getItem('gg.tetris.highscore'), 'not-json{{');
});

// --- 게임 화면에서 세운 기록 지키기 (설계 9.2) ---
test('허브 밖(게임 화면)에서 세운 새 기록이 오래된 클라우드 기록에 덮이지 않는다', async () => {
  const s = setup({
    storageInit: {
      'gg.tetris.best.marathon': '100',
      [META_KEY]: JSON.stringify({ 'gg.tetris': T - 100000 }),
    },
    remoteInit: remoteDoc({ 'gg.tetris': { updatedAt: T - 50000, data: { 'best.marathon': 50 } } }),
    signedIn: true,
  });

  // 게임 화면에는 동기화 UI가 없다. 저장 창구가 남기는 것은 변경 시각뿐이다.
  s.storage.setItem('gg.tetris.best.marathon', '9999');
  stampSlot(slotIdOf('tetris'), { storage: s.storage, now: T });

  // 그 뒤 허브로 돌아와 동기화가 돌면, 새 기록이 이겨야 한다.
  await s.sync.start();
  assert.equal(s.read('gg.tetris.best.marathon'), 9999);
  assert.deepEqual(s.remote._peek().slots['gg.tetris'].data, { 'best.marathon': 9999 });
});

test('변경 시각 기록은 다른 슬롯의 시각을 건드리지 않는다', async () => {
  const s = setup({ storageInit: { [META_KEY]: JSON.stringify({ 'gg.sudoku': 111 }) } });
  stampSlot(slotIdOf('tetris'), { storage: s.storage, now: 222 });
  const meta = s.local.readMeta();
  assert.equal(meta['gg.sudoku'].updatedAt, 111); // 옛 형식(숫자)도 그대로 읽힌다
  assert.equal(meta['gg.tetris'].updatedAt, 222);
  stampSlot(slotIdOf('lotto'), { storage: s.storage, now: 333 });
  assert.equal(s.local.readMeta().lotto.updatedAt, 333);
});

test('초당 수십 번 저장하는 화면에서도 시각 기록이 저장 부담을 키우지 않는다', async () => {
  const s = setup();
  let writes = 0;
  const orig = s.storage.setItem.bind(s.storage);
  s.storage.setItem = (k, v) => { if (k === META_KEY) writes += 1; orig(k, v); };

  // 스크롤 한 번에 60번 저장되는 상황(16ms 간격). 이 앱의 기록 간격은 3초다(policy.js).
  for (let i = 0; i < 60; i += 1) {
    stampSlot('gg.english-reading', { storage: s.storage, now: T + i * 16 });
  }
  assert.equal(writes, 1);

  // 정책상 간격이 지나면 다시 기록한다.
  stampSlot('gg.english-reading', { storage: s.storage, now: T + 3500 });
  assert.equal(writes, 2);
  assert.equal(s.local.readMeta()['gg.english-reading'].updatedAt, T + 3500);
});

test('처음 생기는 기록에는 시작 시각과 줄기 표식이 함께 붙는다', async () => {
  const s = setup();
  stampSlot(slotIdOf('tetris'), { storage: s.storage, now: T, minIntervalMs: 0 });
  const first = s.local.readMeta()['gg.tetris'];
  assert.equal(first.createdAt, T);
  assert.ok(first.lineage);

  // 두 번째 저장은 시작 시각과 줄기를 바꾸지 않는다.
  stampSlot(slotIdOf('tetris'), { storage: s.storage, now: T + 5000 });
  const second = s.local.readMeta()['gg.tetris'];
  assert.equal(second.createdAt, T);
  assert.equal(second.lineage, first.lineage);
  assert.equal(second.updatedAt, T + 5000);
});

test('클라우드 기록을 받아오면 그쪽 줄기를 물려받아 다음부터 같은 줄기로 인식된다', async () => {
  const s = setup({
    remoteInit: remoteDoc({
      'gg.sudoku': { updatedAt: T - 1000, createdAt: T - 900000, lineage: 'ln-cloud', data: { cleared: 7 } },
    }),
    signedIn: true,
  });
  await s.sync.start();
  const meta = s.local.readMeta()['gg.sudoku'];
  assert.equal(meta.lineage, 'ln-cloud');
  assert.equal(meta.createdAt, T - 900000);

  // 이어서 이 기기에서 저장해도 줄기는 그대로다 = 충돌로 취급되지 않는다.
  stampSlot(slotIdOf('sudoku'), { storage: s.storage, now: T + 1000 });
  assert.equal(s.local.readMeta()['gg.sudoku'].lineage, 'ln-cloud');
  const r = await s.sync.flushNow();
  assert.equal(r.uploaded, true);
  assert.equal(s.sync.getStatus().state, STATUS.SYNCED);
});

// --- 실행 ---
const line = '─'.repeat(60);
let failed = 0;
console.log(line);
for (const t of results) {
  try {
    await t.fn();
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    failed += 1;
    console.log(`  ✗ ${t.name}\n      ${String(err.message).split('\n')[0]}`);
  }
}
console.log(line);
if (failed) {
  console.log(`FAIL — ${failed}건 실패 / 통과 ${results.length - failed}`);
  process.exit(1);
} else {
  console.log(`PASS — 통과 ${results.length} / 실패 0`);
  process.exit(0);
}
