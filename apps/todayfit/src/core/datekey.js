// 날짜 키와 기간 경계. 순수 함수만 둔다(03_architecture.md 2.1).
//
// 날짜 키는 'YYYY-MM-DD' 로컬 달력 날짜다. 시간대 변환을 하지 않는다 -
// UTC 로 한 번 돌리면 자정 언저리에 하루가 밀린다(04_conventions.md 3.4).

import { WEEK_START, DAYS_IN_WEEK } from '../data/constants.js';

const MONTHS_IN_YEAR = 12;

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Date 객체 → 날짜 키. 로컬 달력 날짜를 그대로 쓴다. */
export function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 날짜 키 → 그 날 로컬 자정의 Date. */
export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** epoch ms → 날짜 키. */
export function dateKeyOf(ms) {
  return toDateKey(new Date(ms));
}

export function isDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** 문자열 비교로 충분하다 - 0 패딩된 고정 폭이라 사전순이 곧 날짜순이다. */
export function compareDateKey(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function addDays(key, days) {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** 월요일 1 .. 일요일 7. JS 의 일요일 0 을 7 로 옮긴다. */
export function weekdayOf(key) {
  const js = fromDateKey(key).getDay();
  return js === 0 ? DAYS_IN_WEEK : js;
}

/** 그 날짜가 든 주의 월요일. */
export function startOfWeek(key) {
  const offset = weekdayOf(key) - WEEK_START;
  return addDays(key, -offset);
}

/** 그 날짜가 든 주의 일요일. */
export function endOfWeek(key) {
  return addDays(startOfWeek(key), DAYS_IN_WEEK - 1);
}

/** 월요일부터 일요일까지 7개 키. */
export function weekDateKeys(key) {
  const first = startOfWeek(key);
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(first, i));
}

export function monthKeyOf(key) {
  return key.slice(0, 'YYYY-MM'.length);
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** 그 달의 모든 날짜 키. month 는 1..12 다. */
export function monthDateKeys(year, month) {
  const last = daysInMonth(year, month);
  return Array.from({ length: last }, (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`);
}

/** 그 달에서 주어진 요일들에 드는 날짜 키. weekdays 는 1..7 모음이다. */
export function monthDateKeysOnWeekdays(year, month, weekdays) {
  const wanted = new Set(weekdays);
  return monthDateKeys(year, month).filter((k) => wanted.has(weekdayOf(k)));
}

export function shiftMonth(year, month, delta) {
  const zero = (year * MONTHS_IN_YEAR) + (month - 1) + delta;
  return { year: Math.floor(zero / MONTHS_IN_YEAR), month: (zero % MONTHS_IN_YEAR) + 1 };
}
