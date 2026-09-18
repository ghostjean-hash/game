import { suite, test, assertEqual, assertDeep } from '../core.js';
import {
  toDateKey, fromDateKey, addDays, weekdayOf, startOfWeek, endOfWeek,
  weekDateKeys, monthDateKeys, monthDateKeysOnWeekdays, daysInMonth,
  compareDateKey, shiftMonth, monthKeyOf, monthKeyFrom, isDateKey,
} from '../../src/core/datekey.js';

suite('datekey - 날짜 키');

test('로컬 달력 날짜를 그대로 쓴다', () => {
  assertEqual(toDateKey(new Date(2026, 8, 17)), '2026-09-17');
});

test('한 자리 월과 일을 0으로 채운다', () => {
  assertEqual(toDateKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('자정 직전에도 그 날짜다 - 시간대 변환을 하지 않는다', () => {
  assertEqual(toDateKey(new Date(2026, 8, 17, 23, 59, 59)), '2026-09-17');
});

test('자정 직후에는 다음 날짜다', () => {
  assertEqual(toDateKey(new Date(2026, 8, 18, 0, 0, 1)), '2026-09-18');
});

test('키에서 Date 로 돌아온다', () => {
  const d = fromDateKey('2026-09-17');
  assertEqual(d.getFullYear(), 2026);
  assertEqual(d.getMonth(), 8);
  assertEqual(d.getDate(), 17);
});

test('키 형식을 가려낸다', () => {
  assertEqual(isDateKey('2026-09-17'), true);
  assertEqual(isDateKey('2026-9-17'), false);
  assertEqual(isDateKey(20260917), false);
});

suite('datekey - 더하기와 비교');

test('날을 더한다', () => {
  assertEqual(addDays('2026-09-17', 1), '2026-09-18');
  assertEqual(addDays('2026-09-17', -1), '2026-09-16');
});

test('달을 넘는다', () => {
  assertEqual(addDays('2026-09-30', 1), '2026-10-01');
  assertEqual(addDays('2026-01-01', -1), '2025-12-31');
});

test('윤년 2월을 넘는다', () => {
  assertEqual(addDays('2028-02-28', 1), '2028-02-29');
  assertEqual(daysInMonth(2028, 2), 29);
  assertEqual(daysInMonth(2026, 2), 28);
});

test('사전순 비교가 곧 날짜순이다', () => {
  assertEqual(compareDateKey('2026-09-17', '2026-09-18'), -1);
  assertEqual(compareDateKey('2026-10-01', '2026-09-30'), 1);
  assertEqual(compareDateKey('2026-09-17', '2026-09-17'), 0);
});

suite('datekey - 주 경계 (월요일 시작)');

test('요일은 월요일 1 부터 일요일 7 까지다', () => {
  assertEqual(weekdayOf('2026-09-14'), 1); // 월
  assertEqual(weekdayOf('2026-09-17'), 4); // 목
  assertEqual(weekdayOf('2026-09-20'), 7); // 일
});

test('주의 시작은 월요일이다', () => {
  assertEqual(startOfWeek('2026-09-17'), '2026-09-14');
  assertEqual(startOfWeek('2026-09-14'), '2026-09-14');
});

test('일요일은 그 주의 끝이지 다음 주의 시작이 아니다', () => {
  assertEqual(startOfWeek('2026-09-20'), '2026-09-14');
  assertEqual(endOfWeek('2026-09-14'), '2026-09-20');
});

test('한 주는 월요일부터 일곱 날이다', () => {
  assertDeep(weekDateKeys('2026-09-17'), [
    '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17',
    '2026-09-18', '2026-09-19', '2026-09-20',
  ]);
});

test('달을 걸친 주도 이어진다', () => {
  assertEqual(startOfWeek('2026-10-01'), '2026-09-28');
});

suite('datekey - 달');

test('그 달의 모든 날짜', () => {
  const keys = monthDateKeys(2026, 9);
  assertEqual(keys.length, 30);
  assertEqual(keys[0], '2026-09-01');
  assertEqual(keys[29], '2026-09-30');
});

test('요일로 걸러낸다 - 화·목·토', () => {
  const keys = monthDateKeysOnWeekdays(2026, 9, [2, 4, 6]);
  assertEqual(keys[0], '2026-09-01'); // 화
  assertEqual(keys[1], '2026-09-03'); // 목
  assertEqual(keys[2], '2026-09-05'); // 토
  assertEqual(keys.every((k) => [2, 4, 6].includes(weekdayOf(k))), true);
});

test('달 키를 뗀다', () => {
  assertEqual(monthKeyOf('2026-09-17'), '2026-09');
});

// 0 패딩이 곧 사전순 비교의 전제다(planner 의 canMakeMonthPlans 가 이 성질에 기댄다)
test('연·월 숫자로 달 키를 만든다 - 한 자리 달도 0 을 채운다', () => {
  assertEqual(monthKeyFrom(2026, 9), '2026-09');
  assertEqual(monthKeyFrom(2026, 12), '2026-12');
  assertEqual(monthKeyFrom(2027, 1), '2027-01');
});

test('만든 달 키가 뗀 달 키와 같은 자로 비교된다', () => {
  assertEqual(monthKeyFrom(2026, 9) === monthKeyOf('2026-09-18'), true);
  assertEqual(monthKeyFrom(2026, 8) < monthKeyOf('2026-09-18'), true);
  assertEqual(monthKeyFrom(2027, 1) > monthKeyOf('2026-12-31'), true);
});

test('달을 옮긴다 - 해를 넘어도 맞다', () => {
  assertDeep(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assertDeep(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  assertDeep(shiftMonth(2026, 9, 0), { year: 2026, month: 9 });
});
