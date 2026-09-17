// 달성률과 진행 (01_spec.md 6.4).
//
//   달성률 = 그 기간의 완료 일수 ÷ 그 기간의 도래 계획 일수
//   진행   = 그 기간의 완료 일수 / 그 기간의 계획일 전체
//
// 주간과 월간에 같은 식을 적용한다. 앞으로 남은 예정일 때문에 달성률이 낮게 보이지 않도록
// 분모에서 빼는 것이 이 두 지표를 가르는 이유다.

import { DAY_STATUS } from '../data/constants.js';
import { weekDateKeys, monthDateKeys } from './datekey.js';

/** 결과가 확정된 상태 셋. 이 셋만 달성률 분모에 든다(01_spec.md 6.5). */
const ARRIVED = [DAY_STATUS.COMPLETE, DAY_STATUS.PARTIAL, DAY_STATUS.MISSED];

/**
 * @param dateKeys   집계할 기간의 모든 날짜
 * @param statusOf   날짜 키 → 상태 문자열
 */
export function periodStats(dateKeys, statusOf) {
  let planned = 0;
  let complete = 0;
  let partial = 0;
  let missed = 0;

  for (const key of dateKeys) {
    const status = statusOf(key);
    if (status === DAY_STATUS.NONE) continue;
    planned += 1;
    if (status === DAY_STATUS.COMPLETE) complete += 1;
    else if (status === DAY_STATUS.PARTIAL) partial += 1;
    else if (status === DAY_STATUS.MISSED) missed += 1;
  }

  const arrived = complete + partial + missed;
  return {
    planned,
    complete,
    partial,
    missed,
    arrived,
    // 도래한 계획이 없으면 비율을 만들지 않는다. 화면은 해당 없음을 표시한다(01_spec.md 6.7).
    rate: arrived > 0 ? complete / arrived : null,
    progress: { done: complete, total: planned },
  };
}

/** 월요일부터 일요일까지 (01_spec.md 6.8). */
export function weekStats(todayKey, statusOf) {
  return periodStats(weekDateKeys(todayKey), statusOf);
}

export function monthStats(year, month, statusOf) {
  return periodStats(monthDateKeys(year, month), statusOf);
}

const PERCENT = 100;

/** 화면 표기용 퍼센트. 비율이 없으면 null 을 그대로 흘린다. */
export function toPercent(rate) {
  if (rate === null) return null;
  return Math.round(rate * PERCENT);
}

/** 오늘 이후로 가장 가까운 계획일. 오늘은 넣지 않는다(기획서 4.1 다음 예정 운동). */
export function nextPlannedDate(dateKeys, todayKey, plans) {
  for (const key of dateKeys) {
    if (key <= todayKey) continue;
    if (plans[key]) return key;
  }
  return null;
}

/** ARRIVED 를 밖에서도 볼 수 있게 둔다 - 화면이 같은 기준으로 설명을 쓴다. */
export { ARRIVED as ARRIVED_STATUSES };
