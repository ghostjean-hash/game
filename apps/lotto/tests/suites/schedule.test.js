import { suite, test, assertEqual, assertTrue } from '../core.js';
import {
  drawDateToEpochMs,
  nextDrawTimeFromNow,
  nextDraw,
  diffParts,
  formatKstDate,
} from '../../src/core/schedule.js';

// 헬퍼: 'YYYY-MM-DDTHH:mm KST' → epoch ms
function kst(s) {
  return Date.parse(s + ':00+09:00');
}

// 카운트다운 타깃 시각 = 동행복권 사이트 기준 판매 마감 = 토 20:00 KST.
// (실제 추첨 방송은 20:35지만 사이트 카운트다운은 20:00에 0이 됨.)

suite('core/schedule - drawDateToEpochMs', () => {
  test('2026-04-25 추첨일 → 토 20:00 KST', () => {
    const ms = drawDateToEpochMs('2026-04-25');
    assertEqual(ms, kst('2026-04-25T20:00'));
  });
  test('연속 두 회차 차이 = 정확히 1주', () => {
    const a = drawDateToEpochMs('2026-04-25');
    const b = drawDateToEpochMs('2026-05-02');
    assertEqual(b - a, 7 * 86400000);
  });
});

suite('core/schedule - nextDrawTimeFromNow', () => {
  test('토요일 20:00 정각 → 다음 주 토 20:00 (이미 시작됨)', () => {
    const now = kst('2026-04-25T20:00');
    assertEqual(nextDrawTimeFromNow(now), kst('2026-05-02T20:00'));
  });
  test('토요일 19:59 → 같은 날 20:00', () => {
    const now = kst('2026-04-25T19:59');
    assertEqual(nextDrawTimeFromNow(now), kst('2026-04-25T20:00'));
  });
  test('일요일 새벽 → 다음 토 20:00', () => {
    const now = kst('2026-04-26T01:00');
    assertEqual(nextDrawTimeFromNow(now), kst('2026-05-02T20:00'));
  });
  test('금요일 23:59 → 다음 날 토 20:00', () => {
    const now = kst('2026-05-01T23:59');
    assertEqual(nextDrawTimeFromNow(now), kst('2026-05-02T20:00'));
  });
});

suite('core/schedule - nextDraw', () => {
  const draws = [
    { drwNo: 1220, drwDate: '2026-04-18' },
    { drwNo: 1221, drwDate: '2026-04-25' },
  ];
  test('마지막 회차 +1, 1주 후 추첨', () => {
    const now = kst('2026-04-26T10:00');
    const r = nextDraw(draws, now);
    assertEqual(r.drwNo, 1222);
    assertEqual(r.drawAtMs, kst('2026-05-02T20:00'));
    assertEqual(r.source, 'history');
  });
  test('캐시가 오래되면 미래 가장 가까운 토 20:00로 진행', () => {
    const now = kst('2026-05-10T10:00'); // 이미 1222회 마감도 지남
    const r = nextDraw(draws, now);
    assertTrue(r.drwNo > 1222);
    assertTrue(r.drawAtMs > now);
  });
  test('빈 draws → fallback, drwNo null', () => {
    const now = kst('2026-04-26T10:00');
    const r = nextDraw([], now);
    assertEqual(r.drwNo, null);
    assertEqual(r.source, 'fallback');
    assertEqual(r.drawAtMs, kst('2026-05-02T20:00'));
  });
});

suite('core/schedule - diffParts', () => {
  test('정확히 1일 차이', () => {
    const r = diffParts(86400000, 0);
    assertEqual(r.days, 1);
    assertEqual(r.hours, 0);
    assertEqual(r.mins, 0);
    assertEqual(r.secs, 0);
  });
  test('19시간 51분 22초', () => {
    const ms = (19 * 3600 + 51 * 60 + 22) * 1000;
    const r = diffParts(ms, 0);
    assertEqual(r.days, 0);
    assertEqual(r.hours, 19);
    assertEqual(r.mins, 51);
    assertEqual(r.secs, 22);
  });
  test('음수는 0으로 절단', () => {
    const r = diffParts(0, 1000);
    assertEqual(r.totalSec, 0);
    assertEqual(r.days, 0);
  });
});

suite('core/schedule - formatKstDate', () => {
  test('2026-05-02 20:00 KST → 2026-05-02', () => {
    assertEqual(formatKstDate(kst('2026-05-02T20:00')), '2026-05-02');
  });
  test('자정 직전 KST → 같은 날짜', () => {
    assertEqual(formatKstDate(kst('2026-05-02T23:59')), '2026-05-02');
  });
  test('자정 직후 KST → 다음 날짜', () => {
    assertEqual(formatKstDate(kst('2026-05-03T00:01')), '2026-05-03');
  });
});
