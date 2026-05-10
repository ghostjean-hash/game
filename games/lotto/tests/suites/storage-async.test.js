// 비동기 storage 테스트 (S64.1, 2026-05-10).
// SSOT: docs/02_data.md 3장 (storage / sync 흐름).
//
// 대상: syncDraws / syncDrawsIfNewer (fetch 의존). 4분기 + 보조 케이스.
// 분기 list (storage.js syncDrawsIfNewer):
//   1. new-rounds         : 미러 latest > cached → 정적 draws.json 받아 갱신 → updated=true
//   2. already-latest     : 미러 latest <= cached → updated=false
//   3. mirror-unreachable : 미러 fetch 실패 → updated=false, draws=cached
//   4. sync-failed        : 미러는 새거지만 정적 draws.json 비거나 fetchedMax <= cached → updated=false
//
// fetch mock 패턴: globalThis.fetch를 일시 교체 후 finally로 원복.
// URL 식별 = url.includes('latest') (미러) / url.includes('draws.json') (정적).

import { asyncSuite, asyncTest, assertEqual, assertTrue } from '../core.js';
import {
  loadDraws, saveDraws, clearAll,
  syncDraws, syncDrawsIfNewer,
} from '../../src/data/storage.js';

function reset() { clearAll(); }

// fetch mock factory.
// handlers = {
//   latest: { drwNo, date } | 'unreachable' | 'not-ok' | null,
//   draws:  Array<{drwNo,...}> | 'unreachable' | 'not-ok' | null,
// }
function mockFetch(handlers) {
  return async (url) => {
    if (url.includes('latest')) {
      const r = handlers.latest;
      if (r === 'unreachable') throw new Error('network down');
      if (r === 'not-ok' || r == null) return { ok: false, json: async () => null };
      return { ok: true, json: async () => ({ draw_no: r.drwNo, date: r.date }) };
    }
    if (url.includes('draws.json')) {
      const r = handlers.draws;
      if (r === 'unreachable') throw new Error('network down');
      if (r === 'not-ok' || r == null) return { ok: false, json: async () => null };
      return { ok: true, json: async () => r };
    }
    return { ok: false, json: async () => null };
  };
}

async function withFetch(mock, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await fn();
  } finally {
    globalThis.fetch = orig;
  }
}

function fakeDraw(drwNo, drwDate = '2026-01-03') {
  return { drwNo, drwDate, numbers: [1, 2, 3, 4, 5, 6], bonus: 7 };
}

await asyncSuite('data/storage - syncDrawsIfNewer 4분기 (S64.1)', async () => {
  // 분기 1: new-rounds.
  //   cached max = 1000, 미러 latest = 1001, 정적 draws.json도 1001까지 → save + updated=true.
  await asyncTest('new-rounds: 미러가 새 회차 + 정적 번들 갱신 시 saveDraws + updated=true', async () => {
    reset();
    saveDraws([fakeDraw(999), fakeDraw(1000)]);
    const fetched = [fakeDraw(999), fakeDraw(1000), fakeDraw(1001)];
    const mock = mockFetch({
      latest: { drwNo: 1001, date: '2026-01-10' },
      draws: fetched,
    });
    const result = await withFetch(mock, () => syncDrawsIfNewer());
    assertEqual(result.updated, true, 'updated 플래그');
    assertEqual(result.reason, 'new-rounds');
    assertEqual(result.latestDrwNo, 1001);
    assertEqual(loadDraws().length, 3, 'storage 갱신');
  });

  // 분기 2: already-latest.
  //   cached max = 1001, 미러 latest = 1001 → updated=false, reason=already-latest.
  await asyncTest('already-latest: 미러 latest === cached max', async () => {
    reset();
    saveDraws([fakeDraw(1000), fakeDraw(1001, '2026-01-09')]);
    const mock = mockFetch({
      latest: { drwNo: 1001, date: '2026-01-09' },
      draws: null, // 호출되면 안 됨
    });
    const result = await withFetch(mock, () => syncDrawsIfNewer());
    assertEqual(result.updated, false);
    assertEqual(result.reason, 'already-latest');
    assertEqual(result.latestDrwNo, 1001);
    assertEqual(loadDraws().length, 2, 'cached 보존');
  });

  // 분기 3: mirror-unreachable.
  //   미러 fetch 실패 → reason=mirror-unreachable, draws=cached.
  await asyncTest('mirror-unreachable: 미러 fetch 실패 시 cached 유지', async () => {
    reset();
    saveDraws([fakeDraw(1000)]);
    const mock = mockFetch({
      latest: 'unreachable',
      draws: null,
    });
    const result = await withFetch(mock, () => syncDrawsIfNewer());
    assertEqual(result.updated, false);
    assertEqual(result.reason, 'mirror-unreachable');
    assertEqual(result.draws.length, 1);
    assertEqual(result.latestDrwNo, 1000, 'cached max');
  });

  // 분기 3-b: 미러 not-ok 응답 - mirror-unreachable과 동일 분기.
  await asyncTest('mirror-unreachable: 미러 ok=false 응답도 동일 분기', async () => {
    reset();
    saveDraws([fakeDraw(1000)]);
    const mock = mockFetch({
      latest: 'not-ok',
      draws: null,
    });
    const result = await withFetch(mock, () => syncDrawsIfNewer());
    assertEqual(result.reason, 'mirror-unreachable');
  });

  // 분기 4: sync-failed - 미러는 새거지만 정적 draws.json fetch 실패.
  await asyncTest('sync-failed: 미러 새거 + 정적 draws.json 비어있음', async () => {
    reset();
    saveDraws([fakeDraw(1000)]);
    const mock = mockFetch({
      latest: { drwNo: 1001, date: '2026-01-10' },
      draws: 'not-ok',
    });
    const result = await withFetch(mock, () => syncDrawsIfNewer());
    assertEqual(result.updated, false);
    assertEqual(result.reason, 'sync-failed');
    assertEqual(loadDraws().length, 1, 'cached 보존');
  });

  // 분기 4-b: 정적 draws.json은 받아왔지만 fetchedMax <= cachedMax (CI 지연).
  await asyncTest('sync-failed: 정적 번들 fetchedMax <= cachedMax', async () => {
    reset();
    saveDraws([fakeDraw(1000)]);
    const mock = mockFetch({
      latest: { drwNo: 1001, date: '2026-01-10' },
      draws: [fakeDraw(999), fakeDraw(1000)], // 1001 미반영
    });
    const result = await withFetch(mock, () => syncDrawsIfNewer());
    assertEqual(result.reason, 'sync-failed');
    assertEqual(loadDraws().length, 1, 'cached 그대로');
  });
});

await asyncSuite('data/storage - syncDraws 단독 (S64.1)', async () => {
  // syncDraws는 미러 체크 없이 정적 draws.json만 받아 비교.
  await asyncTest('syncDraws: 정적 fetched가 cached보다 새거면 saveDraws + 새 list 반환', async () => {
    reset();
    saveDraws([fakeDraw(999)]);
    const fetched = [fakeDraw(999), fakeDraw(1000)];
    const mock = mockFetch({ latest: null, draws: fetched });
    const result = await withFetch(mock, () => syncDraws());
    assertEqual(result.length, 2);
    assertEqual(loadDraws().length, 2);
  });

  await asyncTest('syncDraws: fetched 비어있으면 cached 반환 + storage 보존', async () => {
    reset();
    saveDraws([fakeDraw(1000)]);
    const mock = mockFetch({ latest: null, draws: 'not-ok' });
    const result = await withFetch(mock, () => syncDraws());
    assertEqual(result.length, 1);
    assertEqual(result[0].drwNo, 1000);
  });

  await asyncTest('syncDraws: fetchedMax >= cachedMax (등호 포함)면 saveDraws', async () => {
    reset();
    saveDraws([fakeDraw(1000)]);
    const fetched = [fakeDraw(1000)]; // 같은 회차 (재발행 케이스)
    const mock = mockFetch({ latest: null, draws: fetched });
    const result = await withFetch(mock, () => syncDraws());
    assertEqual(result.length, 1);
    assertEqual(loadDraws()[0].drwNo, 1000);
  });
});

// 정리
clearAll();
