import { suite, test, assertEqual, assertNull, assertDeep } from '../core.js';
import { periodStats, weekStats, monthStats, toPercent, nextPlannedDate } from '../../src/core/stats.js';
import { DAY_STATUS } from '../../src/data/constants.js';
import { monthDateKeys } from '../../src/core/datekey.js';

const { NONE, PLANNED, COMPLETE, PARTIAL, MISSED } = DAY_STATUS;

/** 날짜 키 → 상태를 표로 준다. 표에 없으면 상태 없음. */
const from = (table) => (key) => table[key] || NONE;

suite('stats - 달성률과 진행');

test('도래한 계획만 분모에 든다', () => {
  const s = periodStats(['2026-09-15', '2026-09-17', '2026-09-19'], from({
    '2026-09-15': COMPLETE, '2026-09-17': PLANNED, '2026-09-19': PLANNED,
  }));
  assertEqual(s.arrived, 1);
  assertEqual(s.rate, 1);
  assertEqual(toPercent(s.rate), 100);
});

test('진행은 기간 전체 계획이 분모다', () => {
  const s = periodStats(['2026-09-15', '2026-09-17', '2026-09-19'], from({
    '2026-09-15': COMPLETE, '2026-09-17': PLANNED, '2026-09-19': PLANNED,
  }));
  assertDeep(s.progress, { done: 1, total: 3 });
});

test('미래 예정 때문에 달성률이 낮아지지 않는다', () => {
  const s = periodStats(['2026-09-15', '2026-09-17', '2026-09-19'], from({
    '2026-09-15': COMPLETE, '2026-09-17': PLANNED, '2026-09-19': PLANNED,
  }));
  assertEqual(toPercent(s.rate), 100);
  assertEqual(s.progress.done / s.progress.total < 1, true);
});

test('부분 완료는 분모에 들고 분자에는 들지 않는다', () => {
  const s = periodStats(['a', 'b'], from({ a: COMPLETE, b: PARTIAL }));
  assertEqual(s.arrived, 2);
  assertEqual(s.complete, 1);
  assertEqual(s.partial, 1);
  assertEqual(toPercent(s.rate), 50);
});

test('미실시도 분모에 든다', () => {
  const s = periodStats(['a', 'b'], from({ a: COMPLETE, b: MISSED }));
  assertEqual(s.arrived, 2);
  assertEqual(toPercent(s.rate), 50);
});

test('계획이 없는 날은 어디에도 들지 않는다', () => {
  const s = periodStats(['a', 'b', 'c'], from({ a: COMPLETE }));
  assertEqual(s.planned, 1);
  assertEqual(s.arrived, 1);
});

test('도래한 계획이 없으면 비율을 만들지 않는다', () => {
  const s = periodStats(['a', 'b'], from({ a: PLANNED, b: PLANNED }));
  assertNull(s.rate);
  assertNull(toPercent(s.rate));
  assertDeep(s.progress, { done: 0, total: 2 });
});

test('계획이 하나도 없는 기간', () => {
  const s = periodStats(['a', 'b'], from({}));
  assertEqual(s.planned, 0);
  assertNull(s.rate);
});

suite('stats - 주간 (월~일)');

test('지난 주 일요일은 이번 주에 들지 않는다', () => {
  const s = weekStats('2026-09-17', from({ '2026-09-14': COMPLETE, '2026-09-13': COMPLETE }));
  assertEqual(s.planned, 1);
});

test('일요일은 그 주의 끝이라 함께 센다', () => {
  const s = weekStats('2026-09-17', from({ '2026-09-20': MISSED }));
  assertEqual(s.planned, 1);
});

test('주간도 달성률과 진행이 갈린다', () => {
  const s = weekStats('2026-09-17', from({
    '2026-09-15': COMPLETE, '2026-09-17': PLANNED, '2026-09-19': PLANNED,
  }));
  assertEqual(toPercent(s.rate), 100);
  assertDeep(s.progress, { done: 1, total: 3 });
});

suite('stats - 월간');

test('그 달만 센다', () => {
  const s = monthStats(2026, 9, from({ '2026-09-01': COMPLETE, '2026-10-01': COMPLETE }));
  assertEqual(s.planned, 1);
});

test('월간도 같은 식이다', () => {
  const table = {};
  for (const k of monthDateKeys(2026, 9).slice(0, 6)) table[k] = COMPLETE;
  for (const k of monthDateKeys(2026, 9).slice(20, 26)) table[k] = PLANNED;
  const s = monthStats(2026, 9, from(table));
  assertEqual(s.arrived, 6);
  assertEqual(toPercent(s.rate), 100);
  assertDeep(s.progress, { done: 6, total: 12 });
});

suite('stats - 다음 예정 운동');

test('오늘 다음으로 가장 가까운 계획일', () => {
  const plans = { '2026-09-17': {}, '2026-09-19': {}, '2026-09-22': {} };
  assertEqual(nextPlannedDate(Object.keys(plans).sort(), '2026-09-17', plans), '2026-09-19');
});

test('오늘은 다음 예정에 들지 않는다', () => {
  const plans = { '2026-09-17': {} };
  assertNull(nextPlannedDate(Object.keys(plans), '2026-09-17', plans));
});

test('앞으로 계획이 없으면 없다', () => {
  const plans = { '2026-09-10': {} };
  assertNull(nextPlannedDate(Object.keys(plans), '2026-09-17', plans));
});
