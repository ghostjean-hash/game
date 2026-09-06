// 공용 진행 부품 검사 (설계 docs/plans/design-2026-09-06-platform-progress.md 8.1).
//
// 목적: 판을 깨고 별을 받고 잠금이 풀리는 규칙이 게임마다 다시 구현되지 않도록 한 곳에
// 모았으므로, 그 한 곳이 틀리면 모든 게임이 함께 틀린다. 그것을 커밋 전에 잡는다.
// 여기서 잡히지 않는 것: 진행 맵 화면·실제 브라우저 (설계 8.2가 담당).
// 실행: node tests/progress.test.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
const { createProgress } = await import('../shared/frame/progress.js');

const results = [];
function test(name, fn) {
  try { fn(); results.push({ ok: true, name }); }
  catch (err) { results.push({ ok: false, name, err }); }
}

// 두 갈래, 묶음 둘. 판 하나는 게임이 정한 모양 그대로다(여기서는 par를 함께 담았다).
function stagesA() {
  return [
    { id: 1, kind: 'easy', par: 2 }, { id: 2, kind: 'easy', par: 3 },
    { id: 3, kind: 'hard', par: 5 }, { id: 4, kind: 'hard', par: 8 },
  ];
}
function stagesB() {
  return [{ id: 10, kind: 'easy', par: 1 }, { id: 11, kind: 'easy', par: 4 }];
}

let seq = 0;
function make(opts = {}) {
  globalThis.localStorage = fakeLocalStorage();
  seq += 1;
  const save = createSave(`t${seq}`);
  return createProgress({
    save,
    modes: [
      { id: 'one', name: '하나', stages: stagesA() },
      { id: 'two', name: '둘', stages: stagesB(), credit: '출처' },
    ],
    group: (s) => s.kind,
    groups: [{ id: 'easy', label: '쉬움' }, { id: 'hard', label: '어려움' }],
    ...opts,
  });
}

// --- 1. 깬 표시·별·최고 기록 ---

test('판을 깨면 깬 표시와 최고 기록이 남는다', () => {
  const p = make({ stars: { type: 'par', margin: 3 } });
  const r = p.finish(1, { cleared: true, value: 2, par: 2 });
  assert.equal(r.stars, 3);
  assert.equal(r.isFirstClear, true);
  assert.equal(r.isNewBest, true);
  assert.equal(r.prevBest, null);

  const rec = p.of(1);
  assert.equal(rec.cleared, true);
  assert.equal(rec.stars, 3);
  assert.equal(rec.best, 2);
  assert.ok(typeof rec.bestAt === 'number');
});

test('더 나쁜 성적으로 다시 깨도 별과 최고 기록이 깎이지 않는다', () => {
  const p = make({ stars: { type: 'par', margin: 3 } });
  p.finish(1, { cleared: true, value: 2, par: 2 });   // 별 셋
  const r = p.finish(1, { cleared: true, value: 9, par: 2 }); // 대충 다시
  assert.equal(r.stars, 3);          // 깎이지 않는다
  assert.equal(r.isNewBest, false);
  assert.equal(r.isFirstClear, false);
  assert.equal(p.of(1).best, 2);
});

test('클수록 좋은 기록은 반대로 잰다', () => {
  const p = make({ higherIsBetter: true });
  p.finish(1, { cleared: true, value: 100 });
  assert.equal(p.finish(1, { cleared: true, value: 50 }).isNewBest, false);
  assert.equal(p.finish(1, { cleared: true, value: 300 }).isNewBest, true);
  assert.equal(p.of(1).best, 300);
});

test('저장을 다시 열어도 진행이 그대로다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('persist');
  const mk = () => createProgress({
    save, modes: [{ id: 'one', name: '하나', stages: stagesA() }],
    stars: { type: 'par', margin: 3 },
  });
  mk().finish(3, { cleared: true, value: 5, par: 5 });
  const again = mk();
  assert.equal(again.of(3).cleared, true);
  assert.equal(again.of(3).stars, 3);
  assert.equal(again.of(3).best, 5);
});

// --- 2. 별 방식 넷 ---

test('별 없음이 기본이다', () => {
  const p = make();
  assert.equal(p.finish(1, { cleared: true, value: 1, par: 2 }).stars, 0);
});

test('기준값 대비는 이내 셋, margin까지 둘, 그 밖 하나', () => {
  const p = make({ stars: { type: 'par', margin: 3 } });
  assert.equal(p.finish(1, { cleared: true, value: 2, par: 2 }).stars, 3);
  assert.equal(p.finish(2, { cleared: true, value: 6, par: 3 }).stars, 2);
  assert.equal(p.finish(3, { cleared: true, value: 99, par: 5 }).stars, 1);
});

test('실수 개수는 틀린 적 없으면 셋, two까지 둘, 그 밖 하나', () => {
  const p = make({ stars: { type: 'mistakes', two: 2 } });
  assert.equal(p.finish(1, { cleared: true, mistakes: 0 }).stars, 3);
  assert.equal(p.finish(2, { cleared: true, mistakes: 2 }).stars, 2);
  assert.equal(p.finish(3, { cleared: true, mistakes: 5 }).stars, 1);
});

test('기준값을 못 받고 깬 판은 별 하나, 깨지 않았으면 없다', () => {
  const p = make({ stars: { type: 'par', margin: 3 } });
  assert.equal(p.finish(1, { cleared: true, value: 7 }).stars, 1);      // par 없음
  assert.equal(p.finish(2, { cleared: false, value: 7 }).stars, 0);
});

test('깨지 않은 판에는 기준값 방식도 별을 주지 않는다', () => {
  // 성적이 아무리 좋아도 못 깬 판이면 별이 없다. 모은 별 합계와 별 모으기 잠금이
  // 이 값을 세므로, 여기가 새면 진행 전체가 틀어진다.
  const p = make({ stars: { type: 'par', margin: 3 } });
  assert.equal(p.finish(1, { cleared: false, value: 2, par: 5 }).stars, 0);
  assert.equal(p.of(1).stars, 0);
  assert.equal(p.totals().stars, 0);
});

test('못 깬 판에는 최고 기록도 남기지 않는다', () => {
  const p = make({ stars: { type: 'par', margin: 3 } });
  const r = p.finish(1, { cleared: false, value: 2, par: 5 });
  assert.equal(r.isNewBest, false);
  assert.equal(p.of(1).best, null);
  assert.equal(p.of(1).bestAt, null);
});

test('게임이 함수를 넘기면 깼는지까지 게임이 정한다', () => {
  const p = make({ stars: (r) => (r.cleared ? 2 : 0) });
  assert.equal(p.finish(1, { cleared: false }).stars, 0);
  assert.equal(p.finish(2, { cleared: true }).stars, 2);
});

test('깨지 않은 판에는 실수 방식도 별을 주지 않는다', () => {
  const p = make({ stars: { type: 'mistakes', two: 2 } });
  assert.equal(p.finish(1, { cleared: false, mistakes: 0 }).stars, 0);
  assert.equal(p.finish(1, { cleared: true, mistakes: 0 }).stars, 3);
});

test('기록을 세운 시각은 값이 그대로면 유지되고 새 기록일 때만 바뀐다', () => {
  const p = make();
  p.finish(1, { cleared: true, value: 9 });
  const first = p.of(1).bestAt;
  assert.ok(typeof first === 'number');
  p.finish(1, { cleared: true, value: 20 });   // 더 나쁜 성적
  assert.equal(p.of(1).bestAt, first);         // 시각 그대로
  assert.equal(p.of(1).best, 9);
  p.finish(1, { cleared: true, value: 3 });    // 새 기록
  assert.equal(p.of(1).best, 3);
  assert.ok(typeof p.of(1).bestAt === 'number' && p.of(1).bestAt >= first);
});

test('게임이 함수를 넘기면 그것으로 매긴다', () => {
  const p = make({ stars: (r) => (r.value < 10 ? 2 : 1) });
  assert.equal(p.finish(1, { cleared: true, value: 5 }).stars, 2);
  assert.equal(p.finish(2, { cleared: true, value: 50 }).stars, 1);
});

// --- 3. 잠금 방식 넷 ---

test('잠금 없음이 기본이다', () => {
  const p = make();
  for (const s of stagesA()) assert.equal(p.isUnlocked(s.id), true);
});

test('차례로는 앞 판을 깨야 다음이 열린다', () => {
  const p = make({ unlock: 'sequential' });
  assert.equal(p.isUnlocked(1), true);
  assert.equal(p.isUnlocked(2), false);
  p.finish(1, { cleared: true });
  assert.equal(p.isUnlocked(2), true);
  assert.equal(p.isUnlocked(3), false);
});

test('별 모으기는 앞 묶음에서 별을 모아야 다음 묶음이 열린다', () => {
  const p = make({ stars: { type: 'par', margin: 3 }, unlock: { type: 'stars', per: 5 } });
  assert.equal(p.isUnlocked(1), true);  // 첫 묶음은 항상 열림
  assert.equal(p.isUnlocked(3), false); // 둘째 묶음은 별 5개부터
  p.finish(1, { cleared: true, value: 2, par: 2 }); // 별 3
  assert.equal(p.isUnlocked(3), false);
  p.finish(2, { cleared: true, value: 3, par: 3 }); // 별 3, 합 6
  assert.equal(p.isUnlocked(3), true);
});

test('게임이 함수를 넘기면 그것으로 막는다', () => {
  const p = make({ unlock: (stage) => stage.id !== 4 });
  assert.equal(p.isUnlocked(3), true);
  assert.equal(p.isUnlocked(4), false);
});

// --- 4. 갈래 ---

test('갈래를 바꾸면 그 갈래의 진행만 보인다', () => {
  const p = make({ stars: { type: 'par', margin: 3 } });
  p.finish(1, { cleared: true, value: 2, par: 2 });
  assert.equal(p.totals().cleared, 1);

  p.setMode('two');
  assert.equal(p.mode, 'two');
  assert.equal(p.totals().cleared, 0);
  assert.equal(p.totals().total, 2);
  assert.deepEqual(p.stages().map((s) => s.id), [10, 11]);

  p.setMode('one');
  assert.equal(p.totals().cleared, 1);
});

test('갈래를 지정해 남의 진행을 들여다볼 수 있다', () => {
  const p = make();
  p.finish(1, { cleared: true });
  p.setMode('two');
  assert.equal(p.of(1, 'one').cleared, true);
  assert.equal(p.totals('one').cleared, 1);
});

test('없는 갈래로 바꾸려 하면 무시한다', () => {
  const p = make();
  p.setMode('nope');
  assert.equal(p.mode, 'one');
});

// --- 5. 이동과 마지막 위치 ---

test('다음·이전은 목록 끝에서 null을 돌려준다', () => {
  const p = make();
  assert.equal(p.prev(1), null);
  assert.equal(p.next(1).id, 2);
  assert.equal(p.next(4), null);
  assert.equal(p.prev(4).id, 3);
});

test('마지막 위치는 갈래마다 따로 기억한다', () => {
  const p = make();
  p.setCurrent(3);
  p.setMode('two');
  assert.equal(p.current(), null);
  p.setCurrent(11);
  assert.equal(p.current('one'), 3);
  assert.equal(p.current('two'), 11);
});

// --- 6. 묶음 ---

test('묶음은 넘긴 순서대로 나오고 없는 묶음은 빠진다', () => {
  const p = make();
  const gs = p.grouped();
  assert.deepEqual(gs.map((g) => g.id), ['easy', 'hard']);
  assert.deepEqual(gs.map((g) => g.label), ['쉬움', '어려움']);
  assert.deepEqual(gs[0].stages.map((s) => s.id), [1, 2]);
  // 둘째 갈래에는 어려움 묶음이 없다.
  assert.deepEqual(p.grouped('two').map((g) => g.id), ['easy']);
});

test('묶는 규칙을 안 넘기면 한 줄로 본다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const p = createProgress({
    save: createSave('nogroup'),
    modes: [{ id: 'one', name: '하나', stages: stagesA() }],
  });
  const gs = p.grouped();
  assert.equal(gs.length, 1);
  assert.equal(gs[0].label, null);
  assert.equal(gs[0].stages.length, 4);
});

// --- 7. 게임 고유 값 ---

test('갈래별 게임 고유 값이 따로 담긴다', () => {
  const p = make();
  p.setExtra({ combo: 3, bestCombo: 7 });
  assert.deepEqual(p.extra(), { combo: 3, bestCombo: 7 });
  p.setMode('two');
  assert.deepEqual(p.extra(), {});
  assert.deepEqual(p.extra('one'), { combo: 3, bestCombo: 7 });
});

// --- 8. 판 하나의 모양은 게임 것이다 ---

test('판 하나는 넘긴 모양 그대로 돌아온다', () => {
  const p = make();
  assert.deepEqual(p.byId(3), { id: 3, kind: 'hard', par: 5 });
  assert.equal(p.byId(999), null);
});

test('갈래 정의도 넘긴 그대로 돌아온다', () => {
  const p = make();
  assert.equal(p.modeDef('two').credit, '출처');
  assert.equal(p.modeDef().name, '하나');
});

// --- 9. 저장이 깨져 있어도 죽지 않는다 ---

test('저장이 이상한 모양이어도 빈 진행으로 시작한다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('broken');
  save.set('progress', 'nope');
  const p = createProgress({ save, modes: [{ id: 'one', name: '하나', stages: stagesA() }] });
  assert.equal(p.totals().cleared, 0);
  assert.equal(p.mode, 'one');
  assert.equal(p.current(), null);
});

// --- 10. 안 넘긴 게임에는 아무 일도 없다 (설계 8.1 목록 8번) ---

test('진행을 안 넘긴 게임에는 진행 부품도 진행 맵도 생기지 않는다', () => {
  // 조립이 진행 옵션을 받았을 때만 부품과 화면을 만든다는 것을 조립 소스로 확인한다.
  // 화면이 없는 곳이라 조립을 실제로 돌릴 수는 없어, 그 분기가 있는지를 본다.
  const src = readFileSync(new URL('../shared/frame/index.js', import.meta.url), 'utf8');
  assert.match(src, /progressOpt\s*\?\s*createProgress/);      // 넘겼을 때만 만든다
  assert.match(src, /const map = progress && selectEl/);        // 부품이 있어야 맵도 만든다
  assert.match(src, /progress: progressOpt = null/);            // 기본값은 없음 쪽
});

test('진행 부품은 갈래를 안 넘기면 만들어지지 않는다', () => {
  globalThis.localStorage = fakeLocalStorage();
  const save = createSave('nomodes');
  assert.throws(() => createProgress({ save, modes: [] }), /modes required/);
  assert.throws(() => createProgress({ modes: [{ id: 'a', name: 'A', stages: [] }] }), /save required/);
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
