// 운동 실행 상태 기계 (01_spec.md 4장).
//
// 순수 함수만 둔다. 지금 시각을 스스로 읽지 않고 인자로 받는다 -
// 자정 넘김·긴 초과·앱 중단 복구를 테스트로 재현하려면 시각이 밖에서 들어와야 한다
// (03_architecture.md 2.2).
//
// 모든 함수는 받은 세션을 고치지 않고 새 세션을 돌려준다.

import {
  PHASE,
  AUTO_PHASES,
  EXERCISE_RESULT,
  CUE,
  COUNTDOWN_FROM,
  OVERRUN_NOTICE_SECONDS,
  UNDO_WINDOW_SECONDS,
} from '../data/constants.js';

const MS_PER_SECOND = 1000;
const MAX_ADVANCE_STEPS = 8; // 준비시간·전환시간이 0이어도 맴돌지 않게 하는 빗장

// --- 읽기 -------------------------------------------------------------------

export function currentExercise(s) {
  return s.plan.exercises[s.exerciseIndex] || null;
}

export function phaseDurationSeconds(s) {
  const ex = currentExercise(s);
  switch (s.phase) {
    case PHASE.PREP: return s.prepSeconds;
    case PHASE.WORK: return ex ? ex.workSeconds : 0;
    case PHASE.REST: return ex ? ex.restSeconds : 0;
    case PHASE.TRANSITION: return s.transitionSeconds;
    default: return 0;
  }
}

/** 일시정지 중이거나 되돌리기를 기다리는 동안에는 시간이 흐르지 않는다(01_spec.md 4.3.4). */
function frozen(s) {
  return s.paused || s.undo !== null || s.phaseStartedAt === null;
}

export function phaseElapsedSeconds(s, now) {
  if (frozen(s)) return s.phaseElapsedBefore;
  return s.phaseElapsedBefore + ((now - s.phaseStartedAt) / MS_PER_SECOND);
}

/** 이 세션이 지금까지 실제로 진행한 시간. 멈춰 있던 시간은 들지 않는다. */
export function activeSecondsAt(s, now) {
  return s.activeSeconds + phaseElapsedSeconds(s, now);
}

/** 재개 대상이 될 수 있는 자리인가. 건너뛴 운동과 다 채운 운동은 아니다. */
function isTarget(s, index) {
  const ex = s.plan.exercises[index];
  if (!ex) return false;
  const r = s.results[index];
  if (r.result === EXERCISE_RESULT.SKIPPED) return false;
  return r.doneSets < ex.sets;
}

function firstTargetIndex(s) {
  for (let i = 0; i < s.plan.exercises.length; i += 1) if (isTarget(s, i)) return i;
  return -1;
}

function nextTargetIndex(s, from) {
  for (let i = from + 1; i < s.plan.exercises.length; i += 1) if (isTarget(s, i)) return i;
  return -1;
}

/** 운동별 남은 세트 수. 재개 화면이 쓴다. */
export function remainingSets(session) {
  return session.plan.exercises.map((ex, i) => {
    const r = session.results[i];
    if (r.result === EXERCISE_RESULT.SKIPPED) return 0;
    return Math.max(0, ex.sets - r.doneSets);
  });
}

export function hasResumeTarget(session) {
  return remainingSets(session).some((n) => n > 0);
}

/** 전체 상태 판정 (01_spec.md 5.2 / 5.3). */
export function judgeStatus(results) {
  const allDone = results.every((r) => r.result === EXERCISE_RESULT.COMPLETE);
  return allDone ? 'complete' : 'partial';
}

/** 화면이 읽는 값 한 묶음. */
export function view(s, now) {
  const ex = currentExercise(s);
  const duration = phaseDurationSeconds(s);
  const elapsed = phaseElapsedSeconds(s, now);
  const nextIndex = nextTargetIndex(s, s.exerciseIndex);
  const isWork = s.phase === PHASE.WORK;
  const overrun = isWork ? Math.max(0, elapsed - duration) : 0;
  return {
    phase: s.phase,
    exerciseName: ex ? ex.name : null,
    setNumber: s.setNumber,
    totalSets: ex ? ex.sets : 0,
    reps: ex ? ex.reps : 0,
    isLastSet: !!ex && s.setNumber >= ex.sets,
    remainSeconds: Math.max(0, duration - elapsed),
    overrunSeconds: overrun,
    isOverrun: overrun > 0,
    nextExerciseName: nextIndex >= 0 ? s.plan.exercises[nextIndex].name : null,
    isLastExercise: nextIndex < 0,
    elapsedSeconds: activeSecondsAt(s, now),
    paused: s.paused,
    undoPending: s.undo !== null,
    ended: s.phase === null,
  };
}

// --- 만들기 -----------------------------------------------------------------

function blankResults(plan) {
  return plan.exercises.map(() => ({ doneSets: 0, result: null }));
}

function baseSession({ plan, settings, now, startedAt, activeSeconds, results, resumed }) {
  return {
    date: plan.date,
    plan,
    startedAt,
    endedAt: null,
    activeSeconds,
    status: null,
    results,
    prepSeconds: settings.prepSeconds,
    transitionSeconds: settings.transitionSeconds,
    exerciseIndex: 0,
    setNumber: 1,
    phase: PHASE.PREP,
    phaseStartedAt: now,
    phaseElapsedBefore: 0,
    paused: false,
    resumed,
    undo: null,
    savedAt: now,
    cueFlags: {},
    // 마지막으로 살아 있던 시점의 구간 경과. recover 만 읽는다.
    aliveElapsed: 0,
  };
}

/**
 * 화면이 숨거나 페이지가 내려갈 때 부른다.
 * 앱이 그대로 죽어도 휴식·전환의 남은 시간을 살릴 수 있게 그 시점 경과를 적어 둔다
 * (01_spec.md 4.5.5).
 */
export function markAlive(s, now) {
  if (s.phase === null) return s;
  return { ...s, aliveElapsed: phaseElapsedSeconds(s, now), savedAt: now };
}

/** 그날 첫 시작 (01_spec.md 4.1). */
export function startSession({ plan, settings, now }) {
  return baseSession({
    plan,
    settings,
    now,
    startedAt: now,
    activeSeconds: 0,
    results: blankResults(plan),
    resumed: false,
  });
}

/**
 * 같은 날 재개 (01_spec.md 4.6).
 * 완료한 세트와 건너뛴 운동은 그대로 두고, 남은 세트가 있는 첫 운동부터 시작한다.
 * 남은 자리가 없으면 null 을 돌려준다 - 재개 조작을 내지 않는 상태다(01_spec.md 2.8).
 */
export function resumeSession({ session, settings, now }) {
  if (!hasResumeTarget(session)) return null;
  const results = session.results.map((r) => ({
    doneSets: r.doneSets,
    // 건너뜀은 그대로 두고, 미완료였던 자리는 다시 채울 수 있게 비운다
    result: r.result === EXERCISE_RESULT.SKIPPED ? EXERCISE_RESULT.SKIPPED
      : (r.result === EXERCISE_RESULT.COMPLETE ? EXERCISE_RESULT.COMPLETE : null),
  }));
  const s = baseSession({
    plan: session.plan,
    settings,
    now,
    startedAt: session.startedAt,
    activeSeconds: session.activeSeconds,
    results,
    resumed: true,
  });
  const first = firstTargetIndex(s);
  return {
    ...s,
    exerciseIndex: first,
    setNumber: s.results[first].doneSets + 1,
  };
}

/**
 * 앱 중단 뒤 복구 (01_spec.md 4.5.2).
 * 닫혀 있던 동안 구간이 지나가지 않는다. 언제나 멈춘 상태로 되살아난다.
 *
 * 준비·운동은 그 구간을 처음부터 다시 한다. 휴식·전환은 마지막으로 살아 있던 시점의
 * 남은 시간을 되살린다 - 쉬던 시간을 두 번 쉬게 하지 않기 위해서다.
 * 그 표식이 없는 채로 죽었으면(딱딱한 중단) 그 구간도 처음부터 간다.
 */
export function recover(s) {
  if (s.phase === null) return s;
  const keepsProgress = s.phase === PHASE.REST || s.phase === PHASE.TRANSITION;
  const elapsed = keepsProgress
    ? Math.min(s.aliveElapsed || 0, phaseDurationSeconds(s))
    : 0;
  return {
    ...s,
    phaseElapsedBefore: elapsed,
    phaseStartedAt: null,
    paused: true,
    undo: null,
    cueFlags: {},
  };
}

// --- 구간 옮기기 -------------------------------------------------------------

/** 끝낸 구간의 진행분을 총 운동시간에 넣는다. */
function bank(s, now) {
  return { ...s, activeSeconds: s.activeSeconds + phaseElapsedSeconds(s, now) };
}

function enter(s, phase, now, extra = {}) {
  return {
    ...s,
    ...extra,
    phase,
    phaseStartedAt: now,
    phaseElapsedBefore: 0,
    cueFlags: {},
  };
}

function finish(s, now) {
  const results = s.results.map((r, i) => {
    if (r.result !== null) return r;
    const done = r.doneSets >= s.plan.exercises[i].sets;
    return { ...r, result: done ? EXERCISE_RESULT.COMPLETE : EXERCISE_RESULT.INCOMPLETE };
  });
  return {
    ...s,
    results,
    phase: null,
    phaseStartedAt: null,
    phaseElapsedBefore: 0,
    endedAt: now,
    status: judgeStatus(results),
    undo: null,
    cueFlags: {},
  };
}

/** 자동 구간이 시간을 다 썼을 때 갈 자리. */
function afterAutoPhase(s, now) {
  if (s.phase === PHASE.PREP) {
    const first = s.exerciseIndex >= 0 ? s.exerciseIndex : firstTargetIndex(s);
    return enter(bank(s, now), PHASE.WORK, now, { exerciseIndex: first });
  }
  if (s.phase === PHASE.REST) {
    return enter(bank(s, now), PHASE.WORK, now, { setNumber: s.setNumber + 1 });
  }
  // 전환 - 다음 재개 대상으로
  const next = nextTargetIndex(s, s.exerciseIndex);
  if (next < 0) return finish(bank(s, now), now);
  return enter(bank(s, now), PHASE.WORK, now, {
    exerciseIndex: next,
    setNumber: s.results[next].doneSets + 1,
  });
}

// --- 알릴 거리 ---------------------------------------------------------------

function dueCues(s, now) {
  if (s.phase === null || s.paused || s.undo !== null) return [];
  const elapsed = phaseElapsedSeconds(s, now);
  const duration = phaseDurationSeconds(s);
  const out = [];

  if (s.phase === PHASE.WORK) {
    const ex = currentExercise(s);
    out.push(s.setNumber >= ex.sets ? CUE.LAST_SET_START : CUE.SET_START);
    if (elapsed >= duration) out.push(CUE.OVERRUN);
    if (elapsed >= duration + OVERRUN_NOTICE_SECONDS) out.push(CUE.OVERRUN_AGAIN);
    return out.filter((k) => !s.cueFlags[k]);
  }

  if (s.phase === PHASE.PREP) out.push(CUE.PREP_START);
  if (s.phase === PHASE.REST) out.push(CUE.REST_START);
  if (s.phase === PHASE.TRANSITION) out.push(CUE.TRANSITION_START);

  // 각 숫자는 자기 1초 구간에서만 울린다. 남은 시간이 2초인데 3을 세면 안 된다.
  const remain = duration - elapsed;
  for (let n = COUNTDOWN_FROM; n >= 1; n -= 1) {
    if (remain <= n && remain > n - 1) out.push(`${CUE.COUNTDOWN}:${n}`);
  }
  return out.filter((k) => !s.cueFlags[k]);
}

function markCues(s, keys) {
  if (keys.length === 0) return s;
  const cueFlags = { ...s.cueFlags };
  for (const k of keys) cueFlags[k] = true;
  return { ...s, cueFlags };
}

// --- 시간 흐르기 -------------------------------------------------------------

/**
 * 시각이 흐른 만큼 상태를 앞으로 민다. 화면 갱신 주기마다 부른다.
 * 운동 구간은 여기서 절대 끝나지 않는다 - 다음 버튼만이 끝낸다(01_spec.md 4.1.2).
 */
export function advance(s, now) {
  let cur = s;
  const cues = [];

  // 되돌리기 시간이 지났으면 건너뛰기를 확정하고 멈춰 둔 시계를 다시 돌린다
  if (cur.undo !== null && now >= cur.undo.expiresAt) {
    cur = { ...cur, undo: null, phaseStartedAt: now };
  }
  if (cur.phase === null || cur.paused || cur.undo !== null) return { session: cur, cues };

  for (let step = 0; step < MAX_ADVANCE_STEPS; step += 1) {
    const due = dueCues(cur, now);
    if (due.length > 0) {
      cues.push(...due);
      cur = markCues(cur, due);
    }
    const auto = AUTO_PHASES.includes(cur.phase);
    if (!auto || phaseElapsedSeconds(cur, now) < phaseDurationSeconds(cur)) break;
    cur = afterAutoPhase(cur, now);
    if (cur.phase === null) { cues.push(CUE.FINISH); break; }
  }
  return { session: cur, cues };
}

// --- 조작 -------------------------------------------------------------------

/** 되돌리기를 기다리는 중에 다른 조작이 들어오면 건너뛰기를 확정한다(01_spec.md 4.3.5). */
function settleUndo(s, now) {
  if (s.undo === null) return s;
  return { ...s, undo: null, phaseStartedAt: now };
}

/** 다음 짧게 누름 (01_spec.md 4.3.1). */
export function pressNext(s, now) {
  if (s.phase === null || s.paused) return { session: s, cues: [] };
  const cur = settleUndo(s, now);

  if (cur.phase !== PHASE.WORK) {
    const moved = afterAutoPhase(cur, now);
    if (moved.phase === null) return { session: moved, cues: [CUE.FINISH] };
    return advanceAfterAction(moved, now, []);
  }

  const ex = currentExercise(cur);
  const results = cur.results.slice();
  const done = results[cur.exerciseIndex].doneSets + 1;
  results[cur.exerciseIndex] = { ...results[cur.exerciseIndex], doneSets: done };

  const banked = { ...bank(cur, now), results };
  const cues = [CUE.SET_DONE];

  if (cur.setNumber < ex.sets) {
    return advanceAfterAction(enter(banked, PHASE.REST, now, { setNumber: cur.setNumber }), now, cues);
  }

  // 이 운동의 마지막 세트를 마쳤다
  results[cur.exerciseIndex] = { ...results[cur.exerciseIndex], result: EXERCISE_RESULT.COMPLETE };
  const withResult = { ...banked, results };
  const next = nextTargetIndex(withResult, withResult.exerciseIndex);
  if (next < 0) {
    const ended = finish(withResult, now);
    return { session: ended, cues: [...cues, CUE.FINISH] };
  }
  return advanceAfterAction(enter(withResult, PHASE.TRANSITION, now), now, cues);
}

/** 조작으로 구간을 옮긴 뒤, 그 구간의 시작 알림을 바로 집어 온다. */
function advanceAfterAction(s, now, cues) {
  const stepped = advance(s, now);
  return { session: stepped.session, cues: [...cues, ...stepped.cues] };
}

/** 다음 길게 누름 - 현재 운동 건너뛰기 (01_spec.md 4.3.2). */
export function skipExercise(s, now) {
  if (s.phase === null || s.paused) return { session: s, cues: [] };
  const cur = settleUndo(s, now);

  const snapshot = {
    phase: cur.phase,
    phaseElapsedBefore: phaseElapsedSeconds(cur, now),
    exerciseIndex: cur.exerciseIndex,
    setNumber: cur.setNumber,
    doneSets: cur.results[cur.exerciseIndex].doneSets,
    result: cur.results[cur.exerciseIndex].result,
    activeSeconds: cur.activeSeconds,
    expiresAt: now + (UNDO_WINDOW_SECONDS * MS_PER_SECOND),
  };

  const results = cur.results.slice();
  results[cur.exerciseIndex] = {
    ...results[cur.exerciseIndex],
    result: EXERCISE_RESULT.SKIPPED,
  };
  const banked = { ...bank(cur, now), results };

  const next = nextTargetIndex(banked, banked.exerciseIndex);
  if (next < 0) {
    return { session: finish(banked, now), cues: [CUE.SKIP, CUE.FINISH] };
  }
  // 되돌리기를 기다리는 동안 다음 구간 시계를 멈춰 둔다(01_spec.md 4.3.4)
  const moved = enter(banked, PHASE.TRANSITION, now, { undo: snapshot });
  return { session: { ...moved, phaseStartedAt: null }, cues: [CUE.SKIP] };
}

/** 되돌리기 (01_spec.md 4.3.4). */
export function undoSkip(s, now) {
  if (s.undo === null) return { session: s, cues: [] };
  const u = s.undo;
  const results = s.results.slice();
  results[u.exerciseIndex] = { doneSets: u.doneSets, result: u.result };
  return {
    session: {
      ...s,
      results,
      activeSeconds: u.activeSeconds,
      exerciseIndex: u.exerciseIndex,
      setNumber: u.setNumber,
      phase: u.phase,
      phaseElapsedBefore: u.phaseElapsedBefore,
      phaseStartedAt: now,
      undo: null,
      cueFlags: {},
    },
    cues: [],
  };
}

export function pause(s, now) {
  if (s.phase === null || s.paused) return s;
  return {
    ...s,
    paused: true,
    phaseElapsedBefore: phaseElapsedSeconds(s, now),
    phaseStartedAt: null,
  };
}

export function unpause(s, now) {
  if (s.phase === null || !s.paused) return s;
  return { ...s, paused: false, phaseStartedAt: now };
}

/** 운동 종료 - 잔여 세트와 잔여 운동을 전부 미완료로 남긴다 (01_spec.md 4.2). */
export function endSession(s, now) {
  if (s.phase === null) return { session: s, cues: [] };
  const cur = settleUndo(s, now);
  return { session: finish(bank(cur, now), now), cues: [CUE.FINISH] };
}

/** 저장에 넣을 수행 기록. 진행 중에만 쓰는 값은 떼어낸다 (02_data.md 5.5). */
export function toRecord(s) {
  return {
    date: s.date,
    plan: s.plan,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    activeSeconds: Math.round(s.activeSeconds),
    status: s.status,
    results: s.plan.exercises.map((ex, i) => ({
      name: ex.name,
      plannedReps: ex.reps,
      plannedSets: ex.sets,
      doneSets: s.results[i].doneSets,
      result: s.results[i].result,
    })),
  };
}

/** 수행 기록을 다시 재개할 수 있는 모양으로 되돌린다. */
export function fromRecord(record) {
  return {
    ...record,
    results: record.results.map((r) => ({ doneSets: r.doneSets, result: r.result })),
  };
}
