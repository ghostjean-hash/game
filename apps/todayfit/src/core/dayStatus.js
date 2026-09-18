// 날짜 상태 판정 (01_spec.md 5.1).
//
// 저장하는 것은 계획의 존재 여부와 기록의 status 뿐이다. 상태 없음·예정·미실시 셋은
// 여기서 계산한다 - 앱이 꺼진 채 자정이 지나도 미실시로 읽혀야 하기 때문이다.

import { DAY_STATUS } from '../data/constants.js';
import { compareDateKey } from './datekey.js';

/**
 * @param dateKey    보려는 날짜
 * @param todayKey   조회 시점의 오늘
 * @param plan       그 날짜의 계획 (없으면 null)
 * @param record     그 날짜의 수행 기록 (없으면 null)
 * @param activeDate 진행 중 세션이 귀속된 날짜 (없으면 null)
 */
export function dayStatus({ dateKey, todayKey, plan = null, record = null, activeDate = null }) {
  if (!plan) return { status: DAY_STATUS.NONE, running: false };

  const running = activeDate === dateKey;

  if (record && record.status === 'complete') {
    return { status: DAY_STATUS.COMPLETE, running };
  }
  if (record && record.status === 'partial') {
    return { status: DAY_STATUS.PARTIAL, running };
  }

  // 기록이 아직 없다. 진행 중이면 그 날짜는 미실시로 넘어가지 않는다(01_spec.md 5.6).
  if (running) return { status: DAY_STATUS.PLANNED, running: true };

  const past = compareDateKey(dateKey, todayKey) < 0;
  return { status: past ? DAY_STATUS.MISSED : DAY_STATUS.PLANNED, running: false };
}

/** 여러 날짜를 한 번에. 달력 한 달을 그릴 때 쓴다. */
export function dayStatusMap({ dateKeys, todayKey, plans, records, activeDate = null }) {
  const out = Object.create(null);
  for (const dateKey of dateKeys) {
    out[dateKey] = dayStatus({
      dateKey,
      todayKey,
      plan: plans[dateKey] || null,
      record: records[dateKey] || null,
      activeDate,
    });
  }
  return out;
}

/**
 * 그 날짜의 계획을 수정할 수 있는가 (01_spec.md 3.9).
 *
 * 진행 중 세션이 붙은 날짜도 잠근다(3.9.1). 그 날짜는 아직 기록이 없지만 운동이
 * 돌고 있어서, 계획을 지우면 끝난 뒤 저장되는 기록이 계획 없는 날에 놓인다 -
 * 달력과 달성률이 그 기록을 찾지 못한다.
 */
export function canEditPlan({ dateKey, todayKey, record, activeDate = null }) {
  if (record) return false;
  if (activeDate === dateKey) return false;
  return compareDateKey(dateKey, todayKey) >= 0;
}
