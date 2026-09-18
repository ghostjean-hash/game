// 지움이 번지는 자리와 참조 세기 (05_manage-screens.md 5.2).
//
// 운동 템플릿을 지우면 그것을 쓰던 루틴 항목이 남고, 루틴을 지우면 그것을 걸어 둔
// 요일이 남는다. 그 뒤처리를 여기 모은다 - 화면마다 흩으면 한 자리를 빠뜨렸을 때
// 가리키는 곳이 없는 참조가 조용히 살아남는다.
//
// 넷 다 새 값을 돌려주고 받은 것을 고치지 않는다. 저장은 manage.js 가 한다.

/** 그 운동을 쓰는 루틴들. 삭제 확인 창이 개수를 보이는 데 쓴다. */
export function routinesUsingExercise(routines, exerciseId) {
  return routines.filter((r) => r.items.some((it) => it.exerciseId === exerciseId));
}

/** 그 루틴을 건 요일 번호들 (1..7). */
export function weekdaysUsingRoutine(weeklyRules, routineId) {
  return weeklyRules.filter((r) => r.routineId === routineId).map((r) => r.weekday);
}

/**
 * 그 운동 항목을 뺀 루틴 목록.
 * 항목이 빠져 빈 루틴이 되어도 루틴 자체는 지우지 않는다 - 빈 루틴은 월간 계획 생성에서
 * 건너뛰어지므로 해가 없고, 사용자가 다시 채울 수 있다(05_manage-screens.md 5.2.3).
 */
export function removeExerciseFromRoutines(routines, exerciseId) {
  return routines.map((r) => {
    if (!r.items.some((it) => it.exerciseId === exerciseId)) return r;
    return { ...r, items: r.items.filter((it) => it.exerciseId !== exerciseId) };
  });
}

/**
 * 그 루틴 연결을 푼 요일 규칙.
 *
 * 사용 여부는 건드리지 않는다. 루틴 없이 켜져 있는 요일은 요일 규칙 화면이 경고로
 * 알리고(05_manage-screens.md 4.6.6) 사용자가 다른 루틴을 고르면 된다 - 여기서 함께
 * 꺼 버리면 사용자가 정해 둔 것을 말없이 바꾸는 것이 되고 그 경고 자리도 사라진다.
 */
export function unlinkRoutineFromWeekly(weeklyRules, routineId) {
  return weeklyRules.map((r) => {
    if (r.routineId !== routineId) return r;
    return { ...r, routineId: null };
  });
}

/** 항목 하나를 앞뒤로 옮긴 새 배열. 끝에서 더 가려 하면 그대로 돌려준다. */
export function moveItem(list, index, delta) {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [row] = next.splice(index, 1);
  next.splice(to, 0, row);
  return next;
}
