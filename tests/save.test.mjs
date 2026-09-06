// 플랫폼 저장 칸과 러시아워 저장 옮기기 검사 (설계 docs/plans/design-2026-09-06-platform-store.md 7.1).
//
// 목적: 이미 놀고 있는 사람의 진행·골드·산 물건이 저장 판을 옮기면서 사라지는 사고를
// 커밋 전에 잡는다. 옮기기와 변환기를 순수 함수로 둔 것이 바로 이 검사를 위해서다.
// 여기서 잡히지 않는 것: 실제 화면·실제 브라우저 저장 (설계 7.3이 담당).
// 실행: node tests/save.test.mjs

import assert from 'node:assert/strict';

// 저장 그릇은 브라우저 저장을 쓴다. 가짜를 먼저 심고 나서 불러온다.
function fakeLocalStorage(seed = {}) {
  const map = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); },
  };
}
globalThis.localStorage = fakeLocalStorage();

const { createSave } = await import('../shared/frame/save.js');
const { isExcludedKey } = await import('../shared/cloud/policy.js');
const {
  SAVE_SCHEMA, looksCurrent, migrateToPlatform,
} = await import('../games/rushhour/src/data/save-shape.js');

const OPTS = {
  modeIds: ['original', 'fogleman'],
  defaultMode: 'original',
  defaultTheme: 'cream',
  defaultAccessory: 'none',
  defaultStyle: 'c',
};

// 실제로 놀던 사람의 저장을 본떴다. 품목·캐릭터 이름은 게임에 실제로 있는 것을 쓴다. 두 갈래 진행 + 골드 + 산 것 + 쓰는 것 + 꾸미기.
function oldSave() {
  return {
    progress: {
      gold: 1350,
      ownedThemes: ['cream', 'mint', 'sky'],
      equippedTheme: 'mint',
      ownedAccessories: ['none', 'ribbon', 'crown'],
      equippedAccessory: 'crown',
      ponyStyle: 'a',
      blockOpts: { a: true, c: false, target: { bg: true, border: false } },
      muted: false,
      activeMode: 'fogleman',
      modes: {
        original: {
          cleared: [1, 2, 3, 7], best: { 1: 1, 2: 1, 3: 2, 7: 5 }, stars: { 1: 3, 2: 3, 3: 2, 7: 1 },
          current: 7, combo: 2, bestCombo: 4,
        },
        fogleman: {
          cleared: [1], best: { 1: 8 }, stars: { 1: 3 }, current: 1, combo: 1, bestCombo: 1,
        },
      },
    },
    muted: false,
  };
}

const results = [];
function test(name, fn) {
  try { fn(); results.push({ ok: true, name }); }
  catch (err) { results.push({ ok: false, name, err }); }
}

// 검사마다 저장을 새로 깐다.
function freshSave(seed = {}, opts = {}) {
  globalThis.localStorage = fakeLocalStorage(
    Object.fromEntries(Object.entries(seed).map(([k, v]) => [`gg.rushhour.${k}`, v])),
  );
  return createSave('rushhour', {
    schema: opts.schema === undefined ? SAVE_SCHEMA : opts.schema,
    migrate: opts.migrate === undefined ? ((old, ctx) => migrateToPlatform(old, OPTS, ctx)) : opts.migrate,
    verify: opts.verify || null,
  });
}

// --- 1. 옮기기가 값을 잃지 않는가 ---

test('옮기면 골드·산 것·쓰는 것이 값 하나까지 같다', () => {
  const out = migrateToPlatform(oldSave(), OPTS);
  assert.equal(out.wallet.gold, 1350);
  assert.deepEqual(out.owned.theme, ['cream', 'mint', 'sky']);
  assert.deepEqual(out.owned.accessory, ['none', 'ribbon', 'crown']);
  assert.equal(out.equipped.theme, 'mint');
  assert.equal(out.equipped.accessory, 'crown');
  assert.equal(out.equipped.style, 'a');
  assert.deepEqual(out.game.blockOpts, { a: true, c: false, target: { bg: true, border: false } });
});

test('옮기면 갈래별 진행이 판마다 그대로 옮겨진다', () => {
  const out = migrateToPlatform(oldSave(), OPTS);
  assert.equal(out.progress.active, 'fogleman');

  const org = out.progress.modes.original;
  assert.deepEqual(Object.keys(org.stages).sort(), ['1', '2', '3', '7']);
  assert.deepEqual(org.stages['3'], { cleared: true, stars: 2, best: { value: 2, at: null } });
  assert.equal(org.current, 7);
  assert.deepEqual(org.extra, { combo: 2, bestCombo: 4 });

  const fog = out.progress.modes.fogleman;
  assert.deepEqual(fog.stages['1'], { cleared: true, stars: 3, best: { value: 8, at: null } });
});

test('갈래가 없던 더 옛 구조는 오리지널 갈래로 들어간다', () => {
  const out = migrateToPlatform({
    progress: { gold: 40, cleared: [1, 2], best: { 1: 1, 2: 3 }, stars: { 1: 3, 2: 2 } },
    current: 2,
  }, OPTS);
  assert.equal(out.wallet.gold, 40);
  assert.deepEqual(Object.keys(out.progress.modes.original.stages).sort(), ['1', '2']);
  assert.equal(out.progress.modes.original.current, 2);
  // 없던 갈래도 빈 채로 자리를 잡는다.
  assert.deepEqual(out.progress.modes.fogleman.stages, {});
});

test('저장이 비어 있어도 기본값으로 채워지고 죽지 않는다', () => {
  const out = migrateToPlatform({}, OPTS);
  assert.equal(out.wallet.gold, 0);
  assert.deepEqual(out.owned.theme, ['cream']);
  assert.equal(out.equipped.style, 'c');
  assert.equal(out.progress.active, 'original');
});

test('모양이 깨진 저장을 넣어도 죽지 않는다', () => {
  for (const broken of [null, 'string', 42, [], { progress: 'nope' }, { progress: { modes: 7 } }]) {
    const out = migrateToPlatform(broken, OPTS);
    assert.equal(typeof out.progress.modes.original.stages, 'object');
  }
});

test('소리 설정은 공용 칸이 비어 있을 때만 옛 값을 옮긴다', () => {
  // 공용 칸에 값이 있으면 옛 값을 옮기지 않는다.
  assert.equal(migrateToPlatform({ progress: { muted: true }, muted: false }, OPTS).muted, undefined);
  // 공용 칸이 비어 있고 옛 값이 켜져 있으면 옮긴다.
  assert.equal(migrateToPlatform({ progress: { muted: true } }, OPTS).muted, true);
  // 옛 값도 꺼져 있으면 옮길 것이 없다.
  assert.equal(migrateToPlatform({ progress: { muted: false } }, OPTS).muted, undefined);
});

// --- 2. 옮긴 값이 그대로 저장 칸에 놓이는가 ---
//
// 걸음 A가 두었던 임시 변환기 검사는 여기서 사라졌다. 걸음 C에서 지갑·산 것·쓰는 것을
// 공용 부품이 자기 칸에서 직접 읽고 쓰게 되어 변환기 자체가 없어졌다.
// 그 부품들의 검사는 tests/wallet.test.mjs · tests/shop.test.mjs가 갖는다.

test('옮긴 결과가 지갑·산 것·쓰는 것 칸에 그대로 놓인다', () => {
  const cells = migrateToPlatform(oldSave(), OPTS);
  assert.equal(cells.wallet.gold, 1350);
  assert.equal(cells.equipped.theme, 'mint');
  assert.equal(cells.equipped.accessory, 'crown');
  assert.equal(cells.equipped.style, 'a');
  assert.deepEqual(cells.owned.theme, ['cream', 'mint', 'sky']);
  // 켜고 끄는 값은 규격이 뜻을 정하지 않는 게임 칸에 담긴다.
  assert.deepEqual(cells.game.blockOpts, { a: true, c: false, target: { bg: true, border: false } });
});

// 기록을 세운 시각을 이어받는 검사는 공용 진행 부품으로 옮겼다(tests/progress.test.mjs).

// --- 3. 저장 그릇이 옮기기를 제대로 도는가 ---

test('옮기기 전 원본이 백업 칸에 남는다', () => {
  const s = freshSave({ progress: oldSave().progress });
  const backup = s.get('__backup', null);
  assert.ok(backup && backup.data && backup.data.progress);
  assert.equal(backup.data.progress.gold, 1350);
  assert.equal(backup.schema, 0);
});

test('옮기고 나면 판 번호가 올라가고 새 칸에 값이 들어 있다', () => {
  const s = freshSave({ progress: oldSave().progress });
  assert.equal(s.readSchema(), SAVE_SCHEMA);
  assert.equal(s.readWallet().gold, 1350);
  assert.equal(s.readEquipped().theme, 'mint');
  assert.equal(s.readProgress().active, 'fogleman');
});

test('이미 옮긴 저장은 다시 옮기지 않는다', () => {
  const s = freshSave({ progress: oldSave().progress });
  s.writeWallet({ gold: 9999 });          // 그 뒤에 벌었다고 치고
  const again = createSave('rushhour', {  // 같은 저장으로 다시 연다
    schema: SAVE_SCHEMA, migrate: (old, ctx) => migrateToPlatform(old, OPTS, ctx),
  });
  assert.equal(again.readWallet().gold, 9999); // 옛 값 1350으로 되돌아가지 않는다
});

test('백업이 이미 있으면 덮지 않는다', () => {
  freshSave({ progress: oldSave().progress });
  // 판 번호를 지워 옮기기를 한 번 더 돌게 만든다. 백업은 처음 것이 남아야 한다.
  const s2 = createSave('rushhour', { schema: SAVE_SCHEMA, migrate: () => ({ wallet: { gold: 1 } }) });
  s2.remove('schema');
  const s3 = createSave('rushhour', { schema: SAVE_SCHEMA, migrate: () => ({ wallet: { gold: 1 } }) });
  assert.equal(s3.get('__backup', null).data.progress.gold, 1350);
});

test('저장이 아예 없으면 판 번호만 적고 옮기기를 돌리지 않는다', () => {
  let called = false;
  const s = freshSave({}, { migrate: () => { called = true; return {}; } });
  assert.equal(called, false);
  assert.equal(s.readSchema(), SAVE_SCHEMA);
  assert.equal(s.get('__backup', null), null);
});

test('판 번호를 넘기지 않은 게임에는 아무 일도 일어나지 않는다', () => {
  let called = false;
  const s = freshSave({ progress: oldSave().progress }, { schema: 0, migrate: () => { called = true; return {}; } });
  assert.equal(called, false);
  assert.equal(s.get('__backup', null), null);
  // 옛 저장이 그대로 남아 있다.
  assert.equal(s.get('progress', null).gold, 1350);
});

test('기존 저장 함수는 이름도 동작도 그대로다', () => {
  const s = freshSave({});
  s.saveResume({ stage: 3 }, '3판');
  assert.deepEqual(s.readResume().data, { stage: 3 });
  assert.equal(s.hasResume(), true);
  s.clearResume();
  assert.equal(s.hasResume(), false);
  assert.equal(s.saveBest('easy', 100), true);
  assert.equal(s.saveBest('easy', 50), false);
  assert.equal(s.readBest('easy'), 100);
  s.saveMuted(true);
  assert.equal(s.readMuted(), true);
});

test('깨진 칸을 읽어도 빈 뼈대가 나온다', () => {
  const s = freshSave({ progress: 'broken', wallet: 7, owned: [], equipped: null }, { schema: 0 });
  assert.deepEqual(s.readProgress(), { active: null, modes: {} });
  assert.deepEqual(s.readWallet(), {});
  assert.deepEqual(s.readOwned(), {});
  assert.deepEqual(s.readEquipped(), {});
});

// --- 4. 옛 모양이 되돌아오거나 판 번호를 올려도 값을 잃지 않는가 ---
//
// 둘 다 1회차 검사가 실제로 재현해 낸 값 손실 경로다.

test('다른 기기의 옛 빌드가 올린 진행이 내려오면 모양이 옛것임을 알아본다', () => {
  const current = migrateToPlatform(oldSave(), OPTS);
  assert.equal(looksCurrent(current), true);
  // 갈래 안이 stages가 아니라 cleared면 옛 모양이다.
  assert.equal(looksCurrent({ progress: { modes: { original: { cleared: [1, 2] } } } }), false);
  // 진행 칸이 아직 없으면 판정할 것이 없다.
  assert.equal(looksCurrent({}), true);
  assert.equal(looksCurrent(null), true);
});

test('옛 모양이 내려와도 다시 옮기고 그 사이 번 골드를 잃지 않는다', () => {
  const s = freshSave({ progress: oldSave().progress }, { verify: looksCurrent });
  s.writeWallet({ gold: 5000 }); // 옮긴 뒤 더 벌었다고 치고
  // 다른 기기가 올린 옛 모양 진행이 내려온 상황. 판 번호는 그대로 2다.
  s.set('progress', { modes: { original: { cleared: [1, 2, 3, 9], stars: { 9: 3 } } } });

  const again = createSave('rushhour', {
    schema: SAVE_SCHEMA, migrate: (old, ctx) => migrateToPlatform(old, OPTS, ctx), verify: looksCurrent,
  });
  // 진행은 내려온 옛 값으로 다시 옮겨졌다.
  assert.deepEqual(Object.keys(again.readProgress().modes.original.stages).sort(), ['1', '2', '3', '9']);
  // 진행 밖 칸은 옛 값에 없으므로 지금 값을 그대로 지킨다.
  assert.equal(again.readWallet().gold, 5000);
  assert.equal(again.readEquipped().theme, 'mint');
});

test('다시 옮길 때 옛 덩어리 안의 골드·산 것이 지금 값을 이기지 못한다', () => {
  // 2회차 검사가 재현한 자리. 옛 모양 진행 덩어리 안에는 골드·산 것도 함께 들어 있다.
  const s = freshSave({ progress: oldSave().progress }, { verify: looksCurrent });
  s.writeWallet({ gold: 5000 });
  s.writeOwned({ theme: ['cream', 'mint', 'sky'], accessory: ['none', 'ribbon', 'crown'] });
  // 옛 기기가 올린 덩어리에는 그보다 적은 골드와 적게 산 목록이 들어 있다.
  s.set('progress', {
    gold: 1500, ownedThemes: ['cream', 'mint'], equippedTheme: 'cream',
    modes: { original: { cleared: [1, 2], stars: { 1: 3 } } },
  });

  const again = createSave('rushhour', {
    schema: SAVE_SCHEMA, migrate: (old, ctx) => migrateToPlatform(old, OPTS, ctx), verify: looksCurrent,
  });
  assert.equal(again.readWallet().gold, 5000);                       // 되돌아가지 않는다
  assert.deepEqual(again.readOwned().theme, ['cream', 'mint', 'sky']); // 산 것도 그대로
  assert.equal(again.readEquipped().theme, 'mint');
  // 진행은 내려온 것으로 바뀐다(그것이 다시 옮기는 이유다).
  assert.deepEqual(Object.keys(again.readProgress().modes.original.stages).sort(), ['1', '2']);
});

test('다시 옮길 때 게임 칸의 다른 항목을 잃지 않는다', () => {
  const s = freshSave({ progress: oldSave().progress }, { verify: looksCurrent });
  s.writeGame({ blockOpts: { a: true }, somethingElse: 42 }); // 게임 칸에 항목이 늘었다고 치고
  s.set('progress', { modes: { original: { cleared: [1] } }, blockOpts: { c: true } });

  const again = createSave('rushhour', {
    schema: SAVE_SCHEMA, migrate: (old, ctx) => migrateToPlatform(old, OPTS, ctx), verify: looksCurrent,
  });
  assert.equal(again.readGame().somethingElse, 42);
  assert.deepEqual(again.readGame().blockOpts, { a: true }); // 지금 값이 이긴다
});

test('갈래 이전의 더 옛 모양도 옛것으로 알아본다', () => {
  // 진행은 있는데 갈래(modes)가 없는 구조, 갈래는 있는데 stages가 없는 구조 둘 다.
  assert.equal(looksCurrent({ progress: { cleared: [1, 2], stars: { 1: 3 } } }), false);
  assert.equal(looksCurrent({ progress: { modes: { original: { best: { 1: 5 } } } } }), false);
  // 지금 모양은 갈래마다 stages를 갖는다.
  assert.equal(looksCurrent({ progress: { modes: { original: { stages: {} } } } }), true);
});

test('판 번호를 올려도 이미 새 모양인 진행과 지갑이 초기화되지 않는다', () => {
  const s = freshSave({ progress: oldSave().progress });
  const before = { wallet: s.readWallet(), progress: s.readProgress(), owned: s.readOwned() };

  // 다음 판이 생겼다고 치고 번호만 올려 다시 연다.
  const next = createSave('rushhour', {
    schema: SAVE_SCHEMA + 1, migrate: (old, ctx) => migrateToPlatform(old, OPTS, ctx), verify: looksCurrent,
  });
  assert.equal(next.readWallet().gold, before.wallet.gold);
  assert.deepEqual(next.readProgress().modes.original.stages, before.progress.modes.original.stages);
  assert.deepEqual(next.readOwned(), before.owned);
  assert.equal(next.readProgress().active, 'fogleman');
});

test('백업 칸은 계정에 올리지 않는다', () => {
  assert.equal(isExcludedKey('gg.rushhour', '__backup'), true);
  assert.equal(isExcludedKey('gg.tetris', '__backup'), true);
  assert.equal(isExcludedKey('gg.rushhour', 'progress'), false);
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
