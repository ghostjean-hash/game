// 요일 규칙에서 그 달의 날짜별 계획을 찍어낸다 (01_spec.md 3.7).
//
// 지난 날짜에는 만들지 않는다(01_spec.md 3.7.1). 달 중간에 처음 만들면 1일부터
// 어제까지가 곧바로 미실시가 되어, 앱을 쓰지도 않던 기간이 실패 기록으로 쌓인다.
//
// 여기가 참조를 끊는 첫 자리다. 생성이 끝나면 날짜별 계획은 요일 규칙·루틴·
// 운동 템플릿·앱 설정을 더 이상 보지 않는다(01_spec.md 3.3).

import {
  monthDateKeysOnWeekdays, weekdayOf, monthKeyOf, monthKeyFrom, compareDateKey, isDateKey,
} from './datekey.js';
import { expandRoutine, indexById } from './resolve.js';

/**
 * 그 달에 계획을 만들 수 있는가 (01_spec.md 3.7.1).
 *
 * 지난 달은 만들지 않는다. 앱을 쓰기 시작하기 전 날짜에 계획이 생기면 그 날짜는
 * 곧바로 미실시가 되고, 쓰지도 않던 기간이 달성률의 분모로 들어간다.
 * 월 키도 0 패딩된 고정 폭이라 사전순이 곧 시간순이다(datekey 의 같은 전제).
 */
export function canMakeMonthPlans({ year, month, today }) {
  return compareDateKey(monthKeyFrom(year, month), monthKeyOf(today)) >= 0;
}

/** 쓰는 요일만 추려 요일 번호로 찾아 쓸 수 있게 만든다. */
function activeRulesByWeekday(weeklyRules) {
  const map = Object.create(null);
  for (const rule of weeklyRules) {
    if (rule.enabled && rule.routineId) map[rule.weekday] = rule;
  }
  return map;
}

/**
 * 그 달의 날짜별 계획 목록. 거름이 둘이고 둘 다 통과한 날짜만 만들어진다.
 *
 * 1. 대상 기간 - 이번 달이면 오늘부터 월말까지(오늘 포함), 다음 달 이후면 그 달 전체,
 *    지난 달이면 없음(01_spec.md 3.7.1). today 는 날짜 키로 반드시 받는다 -
 *    기본값을 두면 넘기는 것을 잊은 자리가 조용히 옛 규칙으로 돈다.
 * 2. 이미 있는 날짜 - existingDates 를 건너뛴다(01_spec.md 3.7.2 / 3.8).
 */
export function buildMonthPlans({
  year,
  month,
  weeklyRules,
  routines,
  exercises,
  settings,
  createdAt,
  today,
  existingDates = [],
}) {
  if (!isDateKey(today)) throw new Error('buildMonthPlans: today 가 날짜 키여야 한다');
  if (!canMakeMonthPlans({ year, month, today })) return [];

  const rules = activeRulesByWeekday(weeklyRules);
  const weekdays = Object.keys(rules).map(Number);
  if (weekdays.length === 0) return [];

  const routinesById = indexById(routines);
  const exercisesById = indexById(exercises);
  const skip = new Set(existingDates);

  const plans = [];
  for (const date of monthDateKeysOnWeekdays(year, month, weekdays)) {
    if (compareDateKey(date, today) < 0) continue; // 지난 날짜는 만들지 않는다
    if (skip.has(date)) continue;
    const rule = rules[weekdayOf(date)];
    const routine = routinesById[rule.routineId];
    if (!routine) continue;

    const planExercises = expandRoutine(routine, exercisesById, settings);
    if (planExercises.length === 0) continue; // 빈 루틴은 계획을 만들지 않는다

    plans.push({
      date,
      time: rule.time,
      routineName: routine.name,
      createdAt,
      exercises: planExercises,
    });
  }
  return plans;
}

/** 생성 전에 보여줄 미리보기 (01_spec.md 3.7 6단계). */
export function previewMonthPlans(plans) {
  return {
    count: plans.length,
    days: plans.map((p) => ({
      date: p.date,
      time: p.time,
      routineName: p.routineName,
      exerciseCount: p.exercises.length,
    })),
  };
}
