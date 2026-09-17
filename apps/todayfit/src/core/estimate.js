// 예상 총 운동시간 (01_spec.md 6.1).
//
//   T = P + Σ( Wi × Si + Ri × (Si − 1) ) + C × (N − 1)
//
// 마지막 운동 뒤에는 전환이 없어 전환 항의 계수가 N − 1 이다.
// 운동 구간이 사용자 조작으로 끝나므로 실제 시간과는 늘 다르다(01_spec.md 6.3).

/** 운동 하나가 잡아먹는 시간. 세트 사이 휴식은 세트 수보다 하나 적다. */
function exerciseSeconds(ex, sets) {
  if (sets <= 0) return 0;
  return (ex.workSeconds * sets) + (ex.restSeconds * (sets - 1));
}

export function estimatePlanSeconds(exercises, settings) {
  const n = exercises.length;
  if (n === 0) return 0;
  let total = settings.prepSeconds;
  for (const ex of exercises) total += exerciseSeconds(ex, ex.sets);
  total += settings.transitionSeconds * (n - 1);
  return total;
}

/**
 * 남은 운동만으로 다시 센다. 같은 날 재개 화면이 쓴다(기획서 4.1).
 * remainingSets 는 계획의 운동 순서와 같은 길이이고, 재개 대상이 아닌 자리는 0 이다.
 */
export function estimateRemainingSeconds(exercises, remainingSets, settings) {
  const live = exercises
    .map((ex, i) => ({ ex, sets: remainingSets[i] || 0 }))
    .filter((row) => row.sets > 0);
  if (live.length === 0) return 0;
  let total = settings.prepSeconds;
  for (const row of live) total += exerciseSeconds(row.ex, row.sets);
  total += settings.transitionSeconds * (live.length - 1);
  return total;
}

const SECONDS_PER_MINUTE = 60;

/** 화면 표기는 분 단위 반올림이다(01_spec.md 6.1). 0 분으로 떨어지면 1 분으로 올린다. */
export function toDisplayMinutes(seconds) {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / SECONDS_PER_MINUTE));
}
