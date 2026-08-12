// 세이브 동기화 순수 로직 검사 (설계 5.2). 외부 의존 0, 순수 node.
//
// 목적: 기기 기록과 클라우드 기록을 합칠 때 진행 데이터가 사라지거나 뒤바뀌는 사고를 커밋 전에 잡는다.
// 여기서 잡히지 않는 것: 실제 로그인, 실제 드라이브 통신, 화면 (각각 5.3 / 5.4 / 5.5 담당).
// 실행: node tests/cloud-merge.test.mjs

import assert from 'node:assert/strict';
import {
  SCHEMA,
  MAX_BYTES,
  buildDocument,
  validateDocument,
  estimateSize,
  checkUploadable,
  mergeDocuments,
} from '../shared/cloud/merge.js';

const T = 1_700_000_000_000; // 고정 기준 시각(실제 시계에 의존하지 않는다)
const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ ok: true, name });
  } catch (err) {
    results.push({ ok: false, name, err });
  }
}

function doc(slots, updatedAt = T) {
  return { schema: SCHEMA, updatedAt, device: 'test', slots };
}
function slot(updatedAt, data) {
  return { updatedAt, data };
}

// --- 5.2.1 로컬에만 있는 슬롯 ---
test('5.2.1 로컬에만 있는 슬롯은 로컬을 채택하고 업로드 대상에 포함된다', () => {
  const local = doc({ 'gg.tetris': slot(T - 1000, { highscore: 12000 }) });
  const r = mergeDocuments(local, null, { now: T });
  assert.deepEqual(r.merged.slots['gg.tetris'].data, { highscore: 12000 });
  assert.deepEqual(r.apply.toRemote, ['gg.tetris']);
  assert.deepEqual(r.apply.toLocal, []);
  assert.equal(r.remoteStatus, 'empty');
  assert.equal(r.blockUpload, false);
});

// --- 5.2.2 클라우드에만 있는 슬롯 ---
test('5.2.2 클라우드에만 있는 슬롯은 클라우드를 채택하고 기기에 기록한다', () => {
  const remote = doc({ 'gg.sudoku': slot(T - 500, { cleared: 3 }) });
  const r = mergeDocuments(doc({}), remote, { now: T });
  assert.deepEqual(r.merged.slots['gg.sudoku'].data, { cleared: 3 });
  assert.equal(r.apply.toLocal.length, 1);
  assert.equal(r.apply.toLocal[0].slot, 'gg.sudoku');
  assert.deepEqual(r.apply.toLocal[0].data, { cleared: 3 });
  assert.deepEqual(r.apply.toRemote, []);
});

// --- 5.2.3 클라우드가 최신 ---
test('5.2.3 양쪽에 있고 클라우드가 최신이면 클라우드를 채택한다', () => {
  const local = doc({ 'gg.tetris': slot(T - 9000, { highscore: 100 }) });
  const remote = doc({ 'gg.tetris': slot(T - 1000, { highscore: 999 }) });
  const r = mergeDocuments(local, remote, { now: T });
  assert.deepEqual(r.merged.slots['gg.tetris'].data, { highscore: 999 });
  assert.equal(r.apply.toLocal.length, 1);
  assert.deepEqual(r.apply.toRemote, []);
  assert.equal(r.conflicts.length, 0);
});

// --- 5.2.4 로컬이 최신 ---
test('5.2.4 양쪽에 있고 로컬이 최신이면 로컬을 채택한다 (오래 접속 안 한 정상 상황)', () => {
  const local = doc({ 'gg.tetris': slot(T - 1000, { highscore: 999 }) });
  const remote = doc({ 'gg.tetris': slot(T - 9000, { highscore: 100 }) });
  const r = mergeDocuments(local, remote, { now: T });
  assert.deepEqual(r.merged.slots['gg.tetris'].data, { highscore: 999 });
  assert.deepEqual(r.apply.toRemote, ['gg.tetris']);
  assert.deepEqual(r.apply.toLocal, []);
  assert.equal(r.conflicts.length, 0);
});

// --- 5.2.5 완전 동일 ---
test('5.2.5 시각과 내용이 모두 같으면 아무것도 하지 않는다 (불필요한 업로드 0)', () => {
  const same = { highscore: 500, level: 3 };
  const local = doc({ 'gg.tetris': slot(T - 100, { ...same }) });
  const remote = doc({ 'gg.tetris': slot(T - 100, { ...same }) });
  const r = mergeDocuments(local, remote, { now: T });
  assert.deepEqual(r.apply.toLocal, []);
  assert.deepEqual(r.apply.toRemote, []);
  assert.equal(r.conflicts.length, 0);
  assert.equal(r.blockUpload, false);
});

// --- 5.2.6 시각 동일 + 내용 상이 ---
test('5.2.6 시각이 같은데 내용이 다르면 자동으로 덮지 않고 사용자에게 묻는다', () => {
  const local = doc({ 'gg.tetris': slot(T - 100, { highscore: 500 }) });
  const remote = doc({ 'gg.tetris': slot(T - 100, { highscore: 700 }) });
  const r = mergeDocuments(local, remote, { now: T });
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].slot, 'gg.tetris');
  assert.equal(r.conflicts[0].reason, 'same-time-diff-content');
  assert.deepEqual(r.conflicts[0].local.data, { highscore: 500 });
  assert.deepEqual(r.conflicts[0].remote.data, { highscore: 700 });
  // 고르기 전에는 올리지 않는다.
  assert.equal(r.blockUpload, true);
  assert.deepEqual(r.apply.toRemote, []);
});

test('5.2.6b 시각이 같아도 겹치는 항목의 값이 같으면 묻지 않고 합친다 (2026-08-01 반복 신고)', () => {
  // 이 기기에만 있는 항목(hintsUsed) 하나 때문에 "내용이 다르다"가 성립하던 경우.
  // 화면에는 양쪽 기록이 똑같아 보이는데 선택 창이 떠서 고를 것이 없었다.
  const local = doc({ 'gg.rushhour': slot(T - 100, { progress: { p1: 1 }, hintsUsed: 4 }) });
  const remote = doc({ 'gg.rushhour': slot(T - 100, { progress: { p1: 1 } }) });
  const r = mergeDocuments(local, remote, { now: T });
  assert.equal(r.conflicts.length, 0);
  assert.equal(r.blockUpload, false);
  // 합친 결과에는 양쪽 항목이 모두 있고, 클라우드에도 올라간다.
  assert.deepEqual(r.merged.slots['gg.rushhour'].data, { progress: { p1: 1 }, hintsUsed: 4 });
  assert.deepEqual(r.apply.toRemote, ['gg.rushhour']);
});

test('5.2.6c 겹치는 항목의 값이 실제로 다르면 종전대로 묻는다', () => {
  const local = doc({ 'gg.rushhour': slot(T - 100, { progress: { p1: 1 }, hintsUsed: 4 }) });
  const remote = doc({ 'gg.rushhour': slot(T - 100, { progress: { p9: 1 } }) });
  const r = mergeDocuments(local, remote, { now: T });
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].reason, 'same-time-diff-content');
});

// --- 5.2.7 기기 시계 오류 ---
test('5.2.7 저장 시각이 현재보다 크게 미래면 자동 판정을 포기한다 (기기 시계 오류)', () => {
  const local = doc({ 'gg.tetris': slot(T + 60 * 60 * 1000, { highscore: 1 }) });
  const remote = doc({ 'gg.tetris': slot(T - 1000, { highscore: 2 }) });
  const r = mergeDocuments(local, remote, { now: T, skewToleranceMs: 5 * 60 * 1000 });
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].reason, 'clock-skew');
  assert.equal(r.blockUpload, true);
});

test('5.2.7b 허용 오차 안의 미세한 미래 시각은 정상 처리한다', () => {
  const local = doc({ 'gg.tetris': slot(T + 1000, { highscore: 1 }) });
  const remote = doc({ 'gg.tetris': slot(T - 1000, { highscore: 2 }) });
  const r = mergeDocuments(local, remote, { now: T, skewToleranceMs: 5 * 60 * 1000 });
  assert.equal(r.conflicts.length, 0);
  assert.deepEqual(r.apply.toRemote, ['gg.tetris']);
});

// --- 5.2.8 혼합 방향 병합 (기기 두 대 사용자의 데이터 유실 방지) ---
test('5.2.8 슬롯마다 방향이 달라도 양쪽 모두 살아남는다', () => {
  const local = doc({
    'gg.tetris': slot(T - 1000, { highscore: 999 }), // 로컬이 최신
    'gg.flightshooting': slot(T - 9000, { stage: 3 }), // 클라우드가 최신
    'gg.sudoku': slot(T - 100, { cleared: 7 }), // 로컬에만 있음
  });
  const remote = doc({
    'gg.tetris': slot(T - 9000, { highscore: 100 }),
    'gg.flightshooting': slot(T - 1000, { stage: 7 }),
    'gg.nonogram': slot(T - 50, { solved: 2 }), // 클라우드에만 있음
  });
  const r = mergeDocuments(local, remote, { now: T });

  assert.deepEqual(r.merged.slots['gg.tetris'].data, { highscore: 999 });
  assert.deepEqual(r.merged.slots['gg.flightshooting'].data, { stage: 7 });
  assert.deepEqual(r.merged.slots['gg.sudoku'].data, { cleared: 7 });
  assert.deepEqual(r.merged.slots['gg.nonogram'].data, { solved: 2 });
  // 어느 슬롯도 유실되지 않는다.
  assert.equal(Object.keys(r.merged.slots).length, 4);
  assert.deepEqual(r.apply.toRemote.sort(), ['gg.sudoku', 'gg.tetris']);
  assert.deepEqual(r.apply.toLocal.map((x) => x.slot).sort(), ['gg.flightshooting', 'gg.nonogram']);
  assert.equal(r.conflicts.length, 0);
});

// --- 5.2.9 동기화 제외 목록 ---
test('5.2.9 제외 대상(회차 캐시·파생 통계)은 업로드 문서에 섞이지 않는다', () => {
  const built = buildDocument(
    {
      lotto: slot(T, {
        draws: [1, 2, 3],
        stats_numbers: { a: 1 },
        stats_bonus: { b: 2 },
        characters: [{ id: 'c1' }],
        options: { advancedMode: true },
      }),
    },
    { now: T, device: 'test' },
  );
  const keys = Object.keys(built.slots.lotto.data).sort();
  assert.deepEqual(keys, ['characters', 'options']);
});

test('5.2.9b 제외 규칙은 해당 슬롯에만 적용된다', () => {
  const built = buildDocument({ 'gg.tetris': slot(T, { draws: 5, highscore: 1 }) }, { now: T });
  assert.deepEqual(Object.keys(built.slots['gg.tetris'].data).sort(), ['draws', 'highscore']);
});

// --- 5.2.10 미래 형식 문서 ---
test('5.2.10 형식 버전이 미래인 문서는 해석하지 않고 기기 기록을 유지하며 업로드를 멈춘다', () => {
  const local = doc({ 'gg.tetris': slot(T - 1000, { highscore: 5 }) });
  const remote = { schema: 99, updatedAt: T, slots: { 'gg.tetris': slot(T, { highscore: 99999 }) } };
  const r = mergeDocuments(local, remote, { now: T });
  assert.equal(r.remoteStatus, 'invalid');
  assert.equal(r.blockUpload, true);
  assert.deepEqual(r.apply.toLocal, []);
  assert.deepEqual(r.apply.toRemote, []);
  assert.deepEqual(r.merged.slots['gg.tetris'].data, { highscore: 5 });
  assert.equal(validateDocument(remote).reason, 'schema-future');
});

// --- 5.2.11 손상 입력 ---
test('5.2.11 손상된 입력에도 예외로 죽지 않고 기기 기록을 유지한다', () => {
  const local = doc({ 'gg.tetris': slot(T - 1000, { highscore: 5 }) });
  const broken = [
    null,
    undefined,
    'not-a-document',
    42,
    {},
    { schema: SCHEMA },
    { schema: SCHEMA, slots: 'nope' },
    { schema: SCHEMA, slots: { 'gg.tetris': 'nope' } },
    { schema: SCHEMA, slots: { 'gg.tetris': { data: {} } } }, // updatedAt 누락
    { schema: SCHEMA, slots: { 'gg.tetris': { updatedAt: NaN, data: {} } } },
  ];
  for (const bad of broken) {
    const r = mergeDocuments(local, bad, { now: T });
    assert.deepEqual(
      r.merged.slots['gg.tetris'].data,
      { highscore: 5 },
      `손상 입력 처리 실패: ${JSON.stringify(bad)}`,
    );
    assert.deepEqual(r.apply.toLocal, [], `손상 입력이 기기에 기록됨: ${JSON.stringify(bad)}`);
  }
});

test('5.2.11b 손상된 기기 기록도 예외로 죽지 않는다', () => {
  for (const bad of [null, undefined, 'nope', 7, { slots: null }]) {
    const r = mergeDocuments(bad, null, { now: T });
    assert.deepEqual(r.merged.slots, {});
    assert.equal(r.blockUpload, false);
  }
});

// --- 5.2.12 용량 상한 ---
test('5.2.12 상한을 넘는 문서는 업로드를 거부하고 사유를 돌려준다 (조용한 실패 0)', () => {
  const big = doc({ 'gg.tetris': slot(T, { blob: 'x'.repeat(MAX_BYTES + 1000) }) });
  const check = checkUploadable(big);
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'too-large');
  assert.ok(check.bytes > MAX_BYTES);
});

test('5.2.12b 정상 크기 문서는 통과하고 바이트 수를 돌려준다', () => {
  const small = doc({ 'gg.tetris': slot(T, { highscore: 1 }) });
  const check = checkUploadable(small);
  assert.equal(check.ok, true);
  assert.equal(check.reason, null);
  assert.ok(check.bytes > 0 && check.bytes < MAX_BYTES);
  assert.equal(check.bytes, estimateSize(small));
});

test('5.2.12c 형식이 깨진 문서는 크기와 무관하게 업로드를 거부한다', () => {
  assert.equal(checkUploadable({ schema: 99, slots: {} }).ok, false);
  assert.equal(checkUploadable(null).ok, false);
});

// --- 5.2.13 입력 불변 ---
test('5.2.13 병합·문서생성이 입력 객체를 변형하지 않는다', () => {
  const local = doc({ 'gg.tetris': slot(T - 1000, { highscore: 1, nested: { a: [1, 2] } }) });
  const remote = doc({ 'gg.tetris': slot(T - 500, { highscore: 2, nested: { a: [3] } }) });
  const localBefore = JSON.stringify(local);
  const remoteBefore = JSON.stringify(remote);

  const r = mergeDocuments(local, remote, { now: T });
  // 병합 결과를 건드려도 원본이 따라 바뀌면 안 된다(참조 공유 금지).
  r.merged.slots['gg.tetris'].data.highscore = 12345;
  r.merged.slots['gg.tetris'].data.nested.a.push(99);

  assert.equal(JSON.stringify(local), localBefore);
  assert.equal(JSON.stringify(remote), remoteBefore);

  const src = { 'gg.tetris': slot(T, { highscore: 1 }) };
  const srcBefore = JSON.stringify(src);
  const built = buildDocument(src, { now: T });
  built.slots['gg.tetris'].data.highscore = 777;
  assert.equal(JSON.stringify(src), srcBefore);
});

// --- 기록 줄기 판별 (사용자 요구 2026-07-29) ---
test('줄기가 서로 다르면 최신이라도 자동으로 덮지 않고 사용자에게 묻는다', () => {
  const local = doc({ 'gg.tetris': { updatedAt: T - 9000, createdAt: T - 500000, lineage: 'ln-a', data: { 'best.marathon': 12000 } } });
  const remote = doc({ 'gg.tetris': { updatedAt: T - 100, createdAt: T - 800000, lineage: 'ln-b', data: { 'best.marathon': 300 } } });
  const r = mergeDocuments(local, remote, { now: T });
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].reason, 'different-lineage');
  assert.equal(r.blockUpload, true);
  // 고르기 전에는 기기 기록을 유지한다.
  assert.deepEqual(r.merged.slots['gg.tetris'].data, { 'best.marathon': 12000 });
  // 선택 화면에 쓸 시작 시각이 양쪽 다 전달된다.
  assert.equal(r.conflicts[0].local.createdAt, T - 500000);
  assert.equal(r.conflicts[0].remote.createdAt, T - 800000);
});

test('줄기가 같으면 평소대로 최신을 자동 채택한다', () => {
  const local = doc({ 'gg.tetris': { updatedAt: T - 9000, createdAt: T - 500000, lineage: 'ln-a', data: { 'best.marathon': 100 } } });
  const remote = doc({ 'gg.tetris': { updatedAt: T - 100, createdAt: T - 500000, lineage: 'ln-a', data: { 'best.marathon': 999 } } });
  const r = mergeDocuments(local, remote, { now: T });
  assert.equal(r.conflicts.length, 0);
  assert.deepEqual(r.merged.slots['gg.tetris'].data, { 'best.marathon': 999 });
  assert.equal(r.apply.toLocal[0].lineage, 'ln-a');
});

test('줄기 정보가 없는 옛 기록은 같은 줄기로 관대하게 취급한다 (기존 사용자 보호)', () => {
  const local = doc({ 'gg.tetris': slot(T - 9000, { 'best.marathon': 100 }) });
  const remote = doc({ 'gg.tetris': { updatedAt: T - 100, lineage: 'ln-b', data: { 'best.marathon': 999 } } });
  const r = mergeDocuments(local, remote, { now: T });
  assert.equal(r.conflicts.length, 0);
  assert.deepEqual(r.merged.slots['gg.tetris'].data, { 'best.marathon': 999 });
});

test('같은 줄기를 합칠 때 시작 시각은 더 이른 쪽을 남긴다', () => {
  const local = doc({ 'gg.tetris': { updatedAt: T - 100, createdAt: T - 900000, lineage: 'ln-a', data: { a: 1 } } });
  const remote = doc({ 'gg.tetris': { updatedAt: T - 9000, createdAt: T - 500000, lineage: 'ln-a', data: { a: 2 } } });
  const r = mergeDocuments(local, remote, { now: T });
  assert.equal(r.merged.slots['gg.tetris'].createdAt, T - 900000);
});

test('시작 시각과 줄기는 업로드 문서에 그대로 실린다', () => {
  const built = buildDocument(
    { 'gg.tetris': { updatedAt: T, createdAt: T - 1000, lineage: 'ln-x', data: { a: 1 } } },
    { now: T, device: 'd' },
  );
  assert.equal(built.slots['gg.tetris'].createdAt, T - 1000);
  assert.equal(built.slots['gg.tetris'].lineage, 'ln-x');
});

// --- 모아나가는 항목 합치기 (사용자 질문 2026-07-29: 단어장·문장도 공유되나) ---
test('두 기기에서 각각 담은 단어와 문장이 양쪽 다 살아남는다', () => {
  const local = doc({
    'gg.english-reading': slot(T - 5000, {
      vocab: [{ wordKey: 'apple', word: 'apple' }, { wordKey: 'sky', word: 'sky' }],
      savedSentences: [{ key: 's1', text: 'A' }],
    }),
  });
  const remote = doc({
    'gg.english-reading': slot(T - 100, {
      vocab: [{ wordKey: 'apple', word: 'apple' }, { wordKey: 'river', word: 'river' }],
      savedSentences: [{ key: 's2', text: 'B' }],
    }),
  });
  const r = mergeDocuments(local, remote, { now: T });

  const words = r.merged.slots['gg.english-reading'].data.vocab.map((v) => v.wordKey).sort();
  assert.deepEqual(words, ['apple', 'river', 'sky']); // 중복 없이 셋 다
  const keys = r.merged.slots['gg.english-reading'].data.savedSentences.map((s) => s.key).sort();
  assert.deepEqual(keys, ['s1', 's2']);
  // 합친 결과를 양쪽 모두에 반영해야 한다.
  assert.ok(r.apply.toRemote.includes('gg.english-reading'));
  assert.equal(r.apply.toLocal.length, 1);
});

test('완독 목록은 합집합, 회독수는 큰 쪽을 남긴다', () => {
  const local = doc({ 'gg.english-reading': slot(T - 100, { done: [1, 2], reads: { 1: 5, 2: 1 } }) });
  const remote = doc({ 'gg.english-reading': slot(T - 5000, { done: [2, 3], reads: { 1: 2, 3: 4 } }) });
  const r = mergeDocuments(local, remote, { now: T });
  const d = r.merged.slots['gg.english-reading'].data;
  assert.deepEqual([...d.done].sort(), [1, 2, 3]);
  assert.deepEqual(d.reads, { 1: 5, 2: 1, 3: 4 });
});

test('두 기기에서 만든 캐릭터가 모두 남는다', () => {
  const local = doc({ lotto: slot(T - 100, { characters: [{ id: 'c1' }, { id: 'c2' }] }) });
  const remote = doc({ lotto: slot(T - 200, { characters: [{ id: 'c2' }, { id: 'c3' }] }) });
  const r = mergeDocuments(local, remote, { now: T });
  assert.deepEqual(r.merged.slots.lotto.data.characters.map((c) => c.id).sort(), ['c1', 'c2', 'c3']);
});

test('합칠 항목으로 지정하지 않은 값은 종전대로 최신 것을 쓴다', () => {
  const local = doc({ 'gg.english-reading': slot(T - 5000, { progress: { p1: { sentences: [1] } } }) });
  const remote = doc({ 'gg.english-reading': slot(T - 100, { progress: { p2: { sentences: [2] } } }) });
  const r = mergeDocuments(local, remote, { now: T });
  // 읽던 자리는 합치면 깨지므로 최신 쪽을 통째로 쓴다.
  assert.deepEqual(r.merged.slots['gg.english-reading'].data.progress, { p2: { sentences: [2] } });
});

test('합칠 것이 없으면 불필요한 반영을 만들지 않는다', () => {
  const same = { vocab: [{ wordKey: 'apple' }] };
  const local = doc({ 'gg.english-reading': slot(T - 100, { ...same }) });
  const remote = doc({ 'gg.english-reading': slot(T - 5000, { ...same }) });
  const r = mergeDocuments(local, remote, { now: T });
  assert.deepEqual(r.apply.toLocal, []);
  assert.deepEqual(r.apply.toRemote, ['gg.english-reading']);
});

// --- 단어장 앱: 세트별 학습 상태 (사용자 질문 2026-07-29) ---
test('PC에서 A세트, 폰에서 B세트를 공부해도 두 세트가 모두 남는다', () => {
  const local = doc({
    'gg.english-vocabulary': slot(T - 5000, {
      'deck:1:set-a': { round: 3, queue: [1, 2] },
      settings: { shuffle: true },
    }),
  });
  const remote = doc({
    'gg.english-vocabulary': slot(T - 100, {
      'deck:1:set-b': { round: 2, queue: [7] },
      settings: { shuffle: false },
    }),
  });
  const r = mergeDocuments(local, remote, { now: T });
  const d = r.merged.slots['gg.english-vocabulary'].data;

  assert.deepEqual(d['deck:1:set-a'], { round: 3, queue: [1, 2] }); // 이긴 쪽에 없어도 살아남는다
  assert.deepEqual(d['deck:1:set-b'], { round: 2, queue: [7] });
  assert.deepEqual(d.settings, { shuffle: false }); // 설정은 종전대로 최신 것
  assert.ok(r.apply.toRemote.includes('gg.english-vocabulary'));
});

test('같은 세트를 양쪽에서 공부하면 단어마다 더 많이 진행된 쪽을 남긴다', () => {
  const local = doc({
    'gg.english-vocabulary': slot(T - 5000, {
      'deck:1:set-a': {
        round: 9,
        queue: [1, 2, 3],
        progress: {
          w1: { status: 'learned', seenCount: 5, unknownCount: 1, learnedAt: T - 6000, lastReviewedAt: T - 6000 },
          w2: { status: 'active', seenCount: 2, unknownCount: 2, learnedAt: null, lastReviewedAt: T - 7000 },
        },
      },
    }),
  });
  const remote = doc({
    'gg.english-vocabulary': slot(T - 100, {
      'deck:1:set-a': {
        round: 2,
        queue: [3],
        progress: {
          w2: { status: 'learned', seenCount: 1, unknownCount: 0, learnedAt: T - 200, lastReviewedAt: T - 200 },
          w3: { status: 'active', seenCount: 1, unknownCount: 0, learnedAt: null, lastReviewedAt: T - 300 },
        },
      },
    }),
  });
  const r = mergeDocuments(local, remote, { now: T });
  const deck = r.merged.slots['gg.english-vocabulary'].data['deck:1:set-a'];

  // 한쪽에서만 외운 단어는 외운 것으로 남는다.
  assert.equal(deck.progress.w1.status, 'learned');
  assert.equal(deck.progress.w2.status, 'learned');
  // 본 횟수는 많은 쪽.
  assert.equal(deck.progress.w2.seenCount, 2);
  assert.equal(deck.progress.w2.unknownCount, 2);
  // 한쪽에만 있던 단어도 살아남는다.
  assert.equal(deck.progress.w3.status, 'active');
  // 남은 카드 순서와 회차는 섞지 않고 최신 쪽을 그대로 쓴다.
  assert.equal(deck.round, 2);
  assert.deepEqual(deck.queue, [3]);
  // 합친 결과는 양쪽 모두에 반영한다.
  assert.ok(r.apply.toRemote.includes('gg.english-vocabulary'));
  assert.equal(r.apply.toLocal.length, 1);
});

test('방금 아카이브(buried)한 단어는 아직 안 올라간 옛 학습(learned) 기록에 덮이지 않는다 (2026-08-12 신고)', () => {
  const local = doc({
    'gg.english-vocabulary': slot(T - 500, {
      'deck:1:set-a': {
        round: 4,
        queue: [],
        progress: {
          // 방금 "완전히 외움"으로 아카이브했다. statusChangedAt이 가장 최근이다.
          w1: {
            status: 'buried', buriedTier: 2, buriedAt: T - 500, statusChangedAt: T - 500,
            seenCount: 5, unknownCount: 1, learnedAt: T - 6000, lastReviewedAt: T - 6000,
          },
        },
      },
    }),
  });
  const remote = doc({
    'gg.english-vocabulary': slot(T - 6000, {
      'deck:1:set-a': {
        round: 4,
        queue: [],
        // 업로드 지연 중이던 옛 스냅샷 - 아카이브 이전의 learned 상태.
        progress: {
          w1: { status: 'learned', buriedTier: null, buriedAt: null, statusChangedAt: T - 6000, seenCount: 5, unknownCount: 1, learnedAt: T - 6000, lastReviewedAt: T - 6000 },
        },
      },
    }),
  });
  const r = mergeDocuments(local, remote, { now: T });
  const p = r.merged.slots['gg.english-vocabulary'].data['deck:1:set-a'].progress.w1;
  assert.equal(p.status, 'buried');
  assert.equal(p.buriedTier, 2);
});

test('아카이브에서 되살린 뒤라면 반대로 옛 buried 기록에 덮이지 않는다 (되돌리기도 최근 쪽 우선)', () => {
  const local = doc({
    'gg.english-vocabulary': slot(T - 6000, {
      'deck:1:set-a': {
        round: 4,
        queue: [],
        // 이 기기에는 아직 옛 아카이브 상태가 남아 있다(다른 기기에서 되살린 것을 아직 못 받음).
        progress: {
          w1: { status: 'buried', buriedTier: 2, buriedAt: T - 6000, statusChangedAt: T - 6000, seenCount: 5, unknownCount: 1, learnedAt: T - 6000, lastReviewedAt: T - 6000 },
        },
      },
    }),
  });
  const remote = doc({
    'gg.english-vocabulary': slot(T - 100, {
      'deck:1:set-a': {
        round: 4,
        queue: [],
        // 다른 기기에서 방금 되살려 복습 목록(learned)으로 돌아갔다.
        progress: {
          w1: { status: 'learned', buriedTier: null, buriedAt: null, statusChangedAt: T - 100, seenCount: 5, unknownCount: 1, learnedAt: T - 6000, lastReviewedAt: T - 6000 },
        },
      },
    }),
  });
  const r = mergeDocuments(local, remote, { now: T });
  const p = r.merged.slots['gg.english-vocabulary'].data['deck:1:set-a'].progress.w1;
  assert.equal(p.status, 'learned');
  assert.equal(p.buriedTier, null);
});

test('이긴 쪽에 없는 항목도 버리지 않는다 (2026-07-29 유실 사고 이후 원칙)', () => {
  const local = doc({ 'gg.tetris': slot(T - 5000, { 'best.zen': 50, 'best.sprint': 12 }) });
  const remote = doc({ 'gg.tetris': slot(T - 100, { 'best.zen': 70 }) });
  const r = mergeDocuments(local, remote, { now: T });
  // 겹치는 항목은 최신 값, 한쪽에만 있던 항목은 그대로 살아남는다.
  assert.deepEqual(r.merged.slots['gg.tetris'].data, { 'best.zen': 70, 'best.sprint': 12 });
  assert.ok(r.apply.toRemote.includes('gg.tetris'));
});

// --- 같은 기기가 올린 기록 (사용자 신고 2026-07-29: 이 기기에서 저장했는데 왜 묻나) ---
test('클라우드에 있는 것이 이 기기가 올린 기록이면 되묻지 않는다', () => {
  const local = doc({ lotto: slot(0, { characters: [{ id: 'c1' }, { id: 'c2' }] }) });
  const remote = {
    schema: SCHEMA, updatedAt: 0, device: 'dev-me',
    slots: { lotto: { updatedAt: 0, device: 'dev-me', data: { characters: [{ id: 'c1' }] } } },
  };
  const r = mergeDocuments(local, remote, { now: T, device: 'dev-me' });
  assert.equal(r.conflicts.length, 0);
  assert.equal(r.blockUpload, false);
  assert.deepEqual(r.merged.slots.lotto.data.characters.map((c) => c.id).sort(), ['c1', 'c2']);
});

test('다른 기기가 올린 기록이면 종전대로 판정한다', () => {
  const local = doc({ 'gg.tetris': slot(T - 100, { 'best.zen': 10 }) });
  const remote = {
    schema: SCHEMA, updatedAt: T - 100, device: 'dev-other',
    slots: { 'gg.tetris': { updatedAt: T - 100, device: 'dev-other', data: { 'best.zen': 20 } } },
  };
  const r = mergeDocuments(local, remote, { now: T, device: 'dev-me' });
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].reason, 'same-time-diff-content');
});

test('양쪽 다 저장 시각을 모르는 옛 기록은 묻지 않고 이 기기 것을 기준으로 삼는다', () => {
  const local = doc({ 'gg.flightshooting': slot(0, { best: 545010, difficulty: 'hard' }) });
  const remote = doc({ 'gg.flightshooting': slot(0, { best: 545010 }) });
  const r = mergeDocuments(local, remote, { now: T });
  assert.equal(r.conflicts.length, 0);
  assert.deepEqual(r.merged.slots['gg.flightshooting'].data, { best: 545010, difficulty: 'hard' });
  assert.deepEqual(r.apply.toRemote, ['gg.flightshooting']);
});

test('업로드 문서에는 어느 기기가 올렸는지 남는다', () => {
  const built = buildDocument({ 'gg.tetris': slot(T, { a: 1 }) }, { now: T, device: 'dev-me' });
  assert.equal(built.slots['gg.tetris'].device, 'dev-me');
});

// --- 부가: 문서 생성 기본 동작 ---
test('부가 buildDocument는 형식 버전과 최신 갱신 시각을 채운다', () => {
  const built = buildDocument(
    { 'gg.a': slot(T - 100, {}), 'gg.b': slot(T - 50, {}) },
    { now: T, device: 'dev-1' },
  );
  assert.equal(built.schema, SCHEMA);
  assert.equal(built.device, 'dev-1');
  assert.equal(built.updatedAt, T - 50);
  assert.equal(validateDocument(built).ok, true);
});

test('부가 buildDocument는 잘못된 슬롯을 조용히 건너뛴다', () => {
  const built = buildDocument({ 'gg.a': null, 'gg.b': 'nope', 'gg.c': slot(T, { x: 1 }) }, { now: T });
  assert.deepEqual(Object.keys(built.slots), ['gg.c']);
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
