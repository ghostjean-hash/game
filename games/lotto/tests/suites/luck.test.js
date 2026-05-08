import { suite, test, assertEqual, assertTrue } from '../core.js';
import { applyLuckGrowth, rankLuckBonus } from '../../src/core/luck.js';

// S43.3 (2026-05-08, Sprint 053): preferredNumbers / applyLuck 폐기.
//   새 architecture(`recommendMulti`)는 시드 6번호 inline shuffle + Luck 비례 가중을 직접 처리.
//   본 파일은 applyLuckGrowth(등수 적중 보너스) + rankLuckBonus만 검증.

suite('core/luck - applyLuckGrowth', () => {
  test('미발표(matchedRank=null) 항목은 luck 변화 없음', () => {
    const ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: null }] };
    assertEqual(applyLuckGrowth(ch).luck, 10);
  });

  test('5등 적중 = +2', () => {
    const ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 5, luckApplied: false }] };
    assertEqual(applyLuckGrowth(ch).luck, 12);
  });

  test('4등 = +5', () => {
    const ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 4, luckApplied: false }] };
    assertEqual(applyLuckGrowth(ch).luck, 15);
  });

  test('1등 = +20', () => {
    const ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 1, luckApplied: false }] };
    assertEqual(applyLuckGrowth(ch).luck, 30);
  });

  test('적용 후 luckApplied=true 잠금', () => {
    const ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 5, luckApplied: false }] };
    const r = applyLuckGrowth(ch);
    assertTrue(r.history[0].luckApplied === true);
  });

  test('재호출 시 중복 적용 안 됨', () => {
    let ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 5, luckApplied: false }] };
    ch = applyLuckGrowth(ch);
    ch = applyLuckGrowth(ch);
    assertEqual(ch.luck, 12);
  });

  test('Luck 100 cap', () => {
    const ch = { luck: 95, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 1, luckApplied: false }] };
    assertEqual(applyLuckGrowth(ch).luck, 100);
  });

  test('여러 항목 누적', () => {
    const ch = {
      luck: 10,
      history: [
        { drwNo: 1, numbers: [], bonus: 0, matchedRank: 5, luckApplied: false },
        { drwNo: 2, numbers: [], bonus: 0, matchedRank: 4, luckApplied: false },
      ],
    };
    assertEqual(applyLuckGrowth(ch).luck, 17);
  });

  test('rankLuckBonus 룩업', () => {
    assertEqual(rankLuckBonus(1), 20);
    assertEqual(rankLuckBonus(5), 2);
    assertEqual(rankLuckBonus(null), 0);
  });
});
