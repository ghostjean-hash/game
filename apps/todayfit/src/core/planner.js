// 요일 규칙에서 그 달의 날짜별 계획을 찍어낸다 (01_spec.md 3.7).
//
// 여기가 참조를 끊는 첫 자리다. 생성이 끝나면 날짜별 계획은 요일 규칙·루틴·
// 운동 템플릿·앱 설정을 더 이상 보지 않는다(01_spec.md 3.3).

import { monthDateKeysOnWeekdays, weekdayOf } from './datekey.js';
import { expandRoutine, indexById } from './resolve.js';

/** 쓰는 요일만 추려 요일 번호로 찾아 쓸 수 있게 만든다. */
function activeRulesByWeekday(weeklyRules) {
  const map = Object.create(null);
  for (const rule of weeklyRules) {
    if (rule.enabled && rule.routineId) map[rule.weekday] = rule;
  }
  return map;
}

/**
 * 그 달의 날짜별 계획 목록. 이미 계획이 있는 날짜는 건드리지 않는다.
 * existingDates 를 주면 그 날짜를 건너뛴다 - 날짜당 계획 하나 규칙(01_spec.md 3.8).
 */
export function buildMonthPlans({
  year,
  month,
  weeklyRules,
  routines,
  exercises,
  settings,
  createdAt,
  existingDates = [],
}) {
  const rules = activeRulesByWeekday(weeklyRules);
  const weekdays = Object.keys(rules).map(Number);
  if (weekdays.length === 0) return [];

  const routinesById = indexById(routines);
  const exercisesById = indexById(exercises);
  const skip = new Set(existingDates);

  const plans = [];
  for (const date of monthDateKeysOnWeekdays(year, month, weekdays)) {
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

/** 생성 전에 보여줄 미리보기 (01_spec.md 3.7 5단계). */
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
