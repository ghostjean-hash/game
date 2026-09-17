// 값 적용 순서 - 루틴 지정값 → 운동 템플릿 기본값 → 앱 기본값 (01_spec.md 3.5).
//
// 이 사다리를 타고 나면 빈 값이 사라진다. 그 결과만 날짜별 계획에 담기므로
// 실행 코드는 빈 값을 다시 만나지 않는다(01_spec.md 3.3).

/** 앞에서부터 처음 만나는 값. null 과 undefined 만 건너뛴다(0 은 값이다). */
function firstSet(...values) {
  for (const v of values) {
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

/**
 * 루틴 항목 하나를 확정값으로 편다.
 * 세트 수와 반복 횟수는 앱 기본값이 없다 - 운동 템플릿이 반드시 갖는다.
 */
export function resolveItem(item, exercise, settings) {
  return {
    name: exercise.name,
    sets: firstSet(item.sets, exercise.sets),
    reps: firstSet(item.reps, exercise.reps),
    workSeconds: firstSet(item.workSeconds, exercise.workSeconds, settings.workSeconds),
    restSeconds: firstSet(item.restSeconds, exercise.restSeconds, settings.restSeconds),
  };
}

/** 각 값이 어디서 왔는지. 루틴 편집 화면이 출처를 표시하는 데 쓴다(기획서 4.6). */
export function sourceOfItem(item, exercise) {
  const pick = (itemValue, exerciseValue) => {
    if (itemValue !== null && itemValue !== undefined) return 'routine';
    if (exerciseValue !== null && exerciseValue !== undefined) return 'exercise';
    return 'settings';
  };
  return {
    sets: pick(item.sets, exercise.sets),
    reps: pick(item.reps, exercise.reps),
    workSeconds: pick(item.workSeconds, exercise.workSeconds),
    restSeconds: pick(item.restSeconds, exercise.restSeconds),
  };
}

/**
 * 루틴 전체를 날짜별 계획의 운동 목록으로 편다.
 * 없는 운동 템플릿을 가리키는 항목은 건너뛴다 - 템플릿이 지워졌는데 루틴에 남은 경우다.
 */
export function expandRoutine(routine, exercisesById, settings) {
  const out = [];
  for (const item of routine.items) {
    const exercise = exercisesById[item.exerciseId];
    if (!exercise) continue;
    out.push({ order: out.length + 1, ...resolveItem(item, exercise, settings) });
  }
  return out;
}

export function indexById(list) {
  const map = Object.create(null);
  for (const row of list) map[row.id] = row;
  return map;
}
