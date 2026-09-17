// 화면 표기 helper. 값을 글자로 바꾸기만 하고 상태를 바꾸지 않는다(04_conventions.md 8.1).

import { TEXT } from '../data/phrases.js';

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 분:초. 큰 시계에 쓰므로 한 자리 분도 두 자리로 맞춰 글자 폭이 흔들리지 않게 한다. */
export function clock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const m = Math.floor(whole / SECONDS_PER_MINUTE);
  const s = whole % SECONDS_PER_MINUTE;
  if (m < MINUTES_PER_HOUR) return `${pad2(m)}:${pad2(s)}`;
  const h = Math.floor(m / MINUTES_PER_HOUR);
  return `${h}:${pad2(m % MINUTES_PER_HOUR)}:${pad2(s)}`;
}

/** 남은 시간은 올림이다 - 0.4초 남았는데 0으로 보이면 이미 끝난 것처럼 읽힌다. */
export function clockUp(seconds) {
  return clock(Math.ceil(Math.max(0, seconds)));
}

/** 분 단위 표기. 예상 시간처럼 대략만 보여 주는 자리에 쓴다(01_spec.md 6.1). */
export function minutes(seconds) {
  const m = seconds <= 0 ? 0 : Math.max(1, Math.round(seconds / SECONDS_PER_MINUTE));
  return `${m}${TEXT.unitMinutes}`;
}

/**
 * '38분 12초'. 시계 표기(38:12)는 한 시간 반으로 읽힐 여지가 있어
 * 지나간 시간을 알리는 자리에는 단위를 붙인다.
 */
export function duration(value) {
  const whole = Math.max(0, Math.round(value));
  const m = Math.floor(whole / SECONDS_PER_MINUTE);
  const s = whole % SECONDS_PER_MINUTE;
  if (m === 0) return `${s}${TEXT.unitSeconds}`;
  if (s === 0) return `${m}${TEXT.unitMinutes}`;
  return `${m}${TEXT.unitMinutes} ${s}${TEXT.unitSeconds}`;
}

export function seconds(value) {
  return `${Math.round(value)}${TEXT.unitSeconds}`;
}

/** 'YYYY-MM-DD' → '9월 17일 (수)'. 날짜 키를 Date 로 돌리지 않고 글자만 자른다. */
export function dayLabel(dateKey, weekdayLabel) {
  const [, month, day] = dateKey.split('-');
  const md = `${Number(month)}월 ${Number(day)}일`;
  return weekdayLabel ? `${md} (${weekdayLabel})` : md;
}

/** 'HH:MM' 은 그대로 보인다. 비어 있으면 자리를 만들지 않는다. */
export function timeLabel(value) {
  return value || '';
}
