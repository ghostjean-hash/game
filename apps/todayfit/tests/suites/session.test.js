import { suite, test, assertEqual, assertClose, assertNull, assert, assertDeep } from '../core.js';
import {
  startSession, resumeSession, recover, markAlive, advance, view, pressNext, skipExercise,
  undoSkip, pause, unpause, endSession, toRecord, remainingSets, hasResumeTarget,
  activeSecondsAt, nextTargetIndex,
} from '../../src/core/session.js';
import { PHASE, EXERCISE_RESULT, CUE } from '../../src/data/constants.js';

const T0 = 1_700_000_000_000;
const at = (sec) => T0 + (sec * 1000);

const settings = { prepSeconds: 5, transitionSeconds: 10, workSeconds: 45, restSeconds: 60 };

// A: 2세트 40초 / 휴식 20초,  B: 1세트 30초
const plan = {
  date: '2026-09-17',
  time: '22:00',
  routineName: '팔',
  createdAt: 0,
  exercises: [
    { order: 1, name: 'A', sets: 2, reps: 10, workSeconds: 40, restSeconds: 20 },
    { order: 2, name: 'B', sets: 1, reps: 8, workSeconds: 30, restSeconds: 20 },
  ],
};

const start = () => startSession({ plan, settings, now: T0 });
const step = (s, sec) => advance(s, at(sec));

/** 준비 구간을 지나 1번 운동 1세트에 들어간 상태. */
function atFirstSet() {
  return step(start(), 5).session;
}

suite('session - 시작과 준비 구간');

test('시작하면 준비 구간이다', () => {
  assertEqual(start().phase, PHASE.PREP);
});

test('준비 구간이 끝나면 첫 운동 1세트로 자동 이동', () => {
  const s = atFirstSet();
  assertEqual(s.phase, PHASE.WORK);
  assertEqual(s.exerciseIndex, 0);
  assertEqual(s.setNumber, 1);
});

test('준비 구간에서 다음을 누르면 잔여 시간을 건너뛴다', () => {
  const s = pressNext(start(), at(1)).session;
  assertEqual(s.phase, PHASE.WORK);
});

test('준비 구간 마지막 3초에 카운트다운이 울린다', () => {
  // 준비 5초. 2초 지난 시점에 남은 시간이 3초다.
  const r = step(start(), 2);
  assert(r.cues.includes(`${CUE.COUNTDOWN}:3`), '3초 알림이 없다');
});

test('남은 시간과 다른 숫자를 세지 않는다', () => {
  const r = step(start(), 3); // 남은 2초
  assertEqual(r.cues.includes(`${CUE.COUNTDOWN}:3`), false);
  assert(r.cues.includes(`${CUE.COUNTDOWN}:2`), '2초 알림이 없다');
});

test('같은 알림을 두 번 울리지 않는다', () => {
  const first = step(start(), 2);
  const second = advance(first.session, at(2.1));
  assertEqual(second.cues.includes(`${CUE.COUNTDOWN}:3`), false);
});

suite('session - 운동 구간은 시간으로 끝나지 않는다');

test('권장 수행시간이 지나도 구간이 그대로다', () => {
  const s = step(atFirstSet(), 5 + 40 + 1).session;
  assertEqual(s.phase, PHASE.WORK);
  assertEqual(s.setNumber, 1);
});

test('한참 지나도 세트가 저절로 완료되지 않는다', () => {
  const s = step(atFirstSet(), 5 + 600).session;
  assertEqual(s.phase, PHASE.WORK);
  assertEqual(s.results[0].doneSets, 0);
});

test('초과 시간을 센다', () => {
  const s = atFirstSet();
  const v = view(s, at(5 + 55));
  assertEqual(v.isOverrun, true);
  assertClose(v.overrunSeconds, 15, 0.01);
  assertEqual(v.remainSeconds, 0);
});

test('권장 시간에 닿으면 한 번 알린다', () => {
  const r = step(atFirstSet(), 5 + 40);
  assert(r.cues.includes(CUE.OVERRUN), '초과 알림이 없다');
});

test('30초 더 지나면 한 번 더 알린다', () => {
  const a = step(atFirstSet(), 5 + 40);
  const b = advance(a.session, at(5 + 70));
  assert(b.cues.includes(CUE.OVERRUN_AGAIN), '재안내가 없다');
});

test('그 뒤로는 더 울리지 않는다', () => {
  let s = atFirstSet();
  s = advance(s, at(5 + 40)).session;
  s = advance(s, at(5 + 70)).session;
  const later = advance(s, at(5 + 300));
  assertEqual(later.cues.length, 0);
});

suite('session - 다음 버튼');

test('세트를 완료로 확정하고 휴식으로 간다', () => {
  const r = pressNext(atFirstSet(), at(5 + 35));
  assertEqual(r.session.phase, PHASE.REST);
  assertEqual(r.session.results[0].doneSets, 1);
  assert(r.cues.includes(CUE.SET_DONE), '완료 알림이 없다');
});

test('휴식이 끝나면 같은 운동 다음 세트', () => {
  const s = pressNext(atFirstSet(), at(40)).session;
  const next = step(s, 40 + 20).session;
  assertEqual(next.phase, PHASE.WORK);
  assertEqual(next.setNumber, 2);
  assertEqual(next.exerciseIndex, 0);
});

test('마지막 세트 시작에 마지막 세트라고 알린다', () => {
  const s = pressNext(atFirstSet(), at(40)).session;
  const r = step(s, 40 + 20);
  assert(r.cues.includes(CUE.LAST_SET_START), '마지막 세트 알림이 없다');
});

test('마지막 세트를 마치면 그 운동이 완료되고 전환으로 간다', () => {
  let s = pressNext(atFirstSet(), at(40)).session;
  s = step(s, 60).session;
  const r = pressNext(s, at(100));
  assertEqual(r.session.phase, PHASE.TRANSITION);
  assertEqual(r.session.results[0].result, EXERCISE_RESULT.COMPLETE);
  assertEqual(r.session.results[0].doneSets, 2);
});

test('전환이 끝나면 다음 운동 1세트', () => {
  let s = pressNext(atFirstSet(), at(40)).session;
  s = step(s, 60).session;
  s = pressNext(s, at(100)).session;
  const next = step(s, 110).session;
  assertEqual(next.exerciseIndex, 1);
  assertEqual(next.setNumber, 1);
  assertEqual(next.phase, PHASE.WORK);
});

test('휴식 구간에서 다음을 누르면 잔여 휴식을 건너뛴다', () => {
  const s = pressNext(atFirstSet(), at(40)).session;
  const r = pressNext(s, at(45));
  assertEqual(r.session.phase, PHASE.WORK);
  assertEqual(r.session.setNumber, 2);
});

suite('session - 끝내기');

/** 계획대로 전부 마친 세션. */
function finishAll() {
  let s = atFirstSet();
  s = pressNext(s, at(40)).session;   // A 1세트
  s = step(s, 60).session;            // 휴식 끝 → A 2세트
  s = pressNext(s, at(100)).session;  // A 2세트 → 전환
  s = step(s, 110).session;           // 전환 끝 → B 1세트
  return pressNext(s, at(140));       // B 1세트 → 종료
}

test('마지막 운동의 마지막 세트를 마치면 끝난다', () => {
  const r = finishAll();
  assertNull(r.session.phase);
  assertEqual(r.session.status, 'complete');
  assert(r.cues.includes(CUE.FINISH), '완료 알림이 없다');
});

test('마지막 운동 뒤에는 전환 구간이 없다', () => {
  const r = finishAll();
  assertEqual(r.session.endedAt, at(140));
});

test('종료 시각과 전체 상태가 남는다', () => {
  const rec = toRecord(finishAll().session);
  assertEqual(rec.status, 'complete');
  assertEqual(rec.results[0].result, EXERCISE_RESULT.COMPLETE);
  assertEqual(rec.results[1].result, EXERCISE_RESULT.COMPLETE);
});

test('운동 종료로 끊으면 잔여가 미완료가 되고 부분 완료다', () => {
  const s = pressNext(atFirstSet(), at(40)).session;
  const r = endSession(s, at(50));
  assertEqual(r.session.status, 'partial');
  assertEqual(r.session.results[0].result, EXERCISE_RESULT.INCOMPLETE);
  assertEqual(r.session.results[0].doneSets, 1);
  assertEqual(r.session.results[1].result, EXERCISE_RESULT.INCOMPLETE);
});

test('시작 직후 끊어도 부분 완료다 - 미실시와 다르다', () => {
  const r = endSession(atFirstSet(), at(6));
  assertEqual(r.session.status, 'partial');
  assertEqual(r.session.results[0].doneSets, 0);
});

suite('session - 건너뛰기와 되돌리기');

test('완료 세트는 남고 그 운동은 건너뜀이 된다', () => {
  const s = pressNext(atFirstSet(), at(40)).session; // A 1세트 완료
  const r = skipExercise(s, at(45));
  assertEqual(r.session.results[0].result, EXERCISE_RESULT.SKIPPED);
  assertEqual(r.session.results[0].doneSets, 1);
  assertEqual(r.session.phase, PHASE.TRANSITION);
  assert(r.cues.includes(CUE.SKIP), '건너뛰기 알림이 없다');
});

test('되돌리기를 기다리는 동안 다음 구간 시계가 멈춘다', () => {
  const r = skipExercise(atFirstSet(), at(10));
  const later = view(r.session, at(30));
  assertEqual(later.undoPending, true);
  assertEqual(later.remainSeconds, settings.transitionSeconds);
});

test('되돌리면 직전 구간과 잔여 시간이 되살아난다', () => {
  const before = atFirstSet();
  const skipped = skipExercise(before, at(25)).session;
  const back = undoSkip(skipped, at(26)).session;
  assertEqual(back.phase, PHASE.WORK);
  assertEqual(back.exerciseIndex, 0);
  assertEqual(back.setNumber, 1);
  assertNull(back.results[0].result);
  assertClose(view(back, at(26)).remainSeconds, 40 - 20, 0.01);
});

test('되돌리면 완료 세트 수도 그대로다', () => {
  const s = pressNext(atFirstSet(), at(40)).session;
  const skipped = skipExercise(s, at(45)).session;
  const back = undoSkip(skipped, at(46)).session;
  assertEqual(back.results[0].doneSets, 1);
});

test('되돌리기 시간이 지나면 확정되고 시계가 다시 돈다', () => {
  const skipped = skipExercise(atFirstSet(), at(10)).session;
  const after = advance(skipped, at(13.1)).session;
  assertEqual(after.undo, null);
  const moved = advance(after, at(23.2)).session;
  assertEqual(moved.exerciseIndex, 1);
});

test('마지막 운동을 건너뛰면 종료 요약으로 간다', () => {
  let s = pressNext(atFirstSet(), at(40)).session;
  s = step(s, 60).session;
  s = pressNext(s, at(100)).session;   // A 완료 → 전환
  s = step(s, 110).session;            // B 1세트
  const r = skipExercise(s, at(115));
  assertNull(r.session.phase);
  assertEqual(r.session.status, 'partial');
  assertEqual(r.session.results[1].result, EXERCISE_RESULT.SKIPPED);
});

suite('session - 일시정지');

test('멈춘 동안 시간이 흐르지 않는다', () => {
  const s = pause(atFirstSet(), at(15));
  const v = view(s, at(300));
  assertClose(v.remainSeconds, 40 - 10, 0.01);
  assertEqual(v.paused, true);
});

test('멈춘 동안 총 운동시간이 늘지 않는다', () => {
  const s = pause(atFirstSet(), at(15));
  assertClose(activeSecondsAt(s, at(15)), activeSecondsAt(s, at(300)), 0.01);
});

test('계속을 누르면 잔여 시간부터 이어간다', () => {
  let s = pause(atFirstSet(), at(15));
  s = unpause(s, at(300));
  assertClose(view(s, at(305)).remainSeconds, 40 - 15, 0.01);
});

test('멈춘 동안 다음 버튼을 먹지 않는다', () => {
  const s = pause(atFirstSet(), at(15));
  assertEqual(pressNext(s, at(20)).session.results[0].doneSets, 0);
});

suite('session - 앱 중단 복구');

test('현재 세트를 처음부터 다시 시작하고 멈춰 둔다', () => {
  const s = advance(atFirstSet(), at(30)).session;
  const back = recover(s);
  assertEqual(back.phase, PHASE.WORK);
  assertEqual(back.paused, true);
  assertClose(view(back, at(9999)).remainSeconds, 40, 0.01);
});

test('완료한 세트는 그대로 남는다', () => {
  const s = pressNext(atFirstSet(), at(40)).session;
  assertEqual(recover(s).results[0].doneSets, 1);
});

test('닫혀 있던 동안 구간이 지나가지 않는다', () => {
  const s = atFirstSet();
  const back = recover(s);
  const later = advance(back, at(100000)).session;
  assertEqual(later.phase, PHASE.WORK);
  assertEqual(later.setNumber, 1);
});

test('닫혀 있던 시간은 총 운동시간에 들지 않는다', () => {
  const s = advance(atFirstSet(), at(30)).session;
  const back = recover(s);
  assertClose(activeSecondsAt(back, at(100000)), s.activeSeconds, 0.01);
});

test('휴식 도중 죽으면 남은 휴식만 이어서 쉰다', () => {
  // 휴식 20초. 15초 지난 시점에 살아 있던 표식을 남기고 죽는다.
  let s = pressNext(atFirstSet(), at(40)).session;
  s = markAlive(s, at(55));
  const back = recover(s);
  assertEqual(back.phase, PHASE.REST);
  assertEqual(back.paused, true);
  assertClose(view(back, at(99999)).remainSeconds, 5, 0.01);
});

test('전환 도중 죽어도 남은 전환만 이어간다', () => {
  let s = pressNext(atFirstSet(), at(40)).session;
  s = step(s, 60).session;
  s = pressNext(s, at(100)).session;   // 전환 시작
  s = markAlive(s, at(104));
  const back = recover(s);
  assertEqual(back.phase, PHASE.TRANSITION);
  assertClose(view(back, at(99999)).remainSeconds, 6, 0.01);
});

test('살아 있던 표식 없이 죽으면 그 구간을 처음부터 한다', () => {
  const s = pressNext(atFirstSet(), at(40)).session; // 휴식 시작, 표식 없음
  const back = recover(s);
  assertClose(view(back, at(99999)).remainSeconds, 20, 0.01);
});

test('운동 도중에는 표식이 있어도 그 세트를 처음부터 한다', () => {
  let s = advance(atFirstSet(), at(30)).session;
  s = markAlive(s, at(30));
  const back = recover(s);
  assertClose(view(back, at(99999)).remainSeconds, 40, 0.01);
});

test('복구 뒤 계속을 누르면 남은 시간부터 이어간다', () => {
  let s = pressNext(atFirstSet(), at(40)).session;
  s = markAlive(s, at(55));
  const back = unpause(recover(s), at(9000));
  assertClose(view(back, at(9002)).remainSeconds, 3, 0.01);
});

suite('session - 같은 날 재개');

/** A 1세트만 하고 끊은 기록. */
function partialRecord() {
  const s = pressNext(atFirstSet(), at(40)).session;
  return toRecord(endSession(s, at(50)).session);
}

test('남은 세트가 있으면 재개 대상이다', () => {
  assertEqual(hasResumeTarget(partialRecord()), true);
  assertDeep(remainingSets(partialRecord()), [1, 1]);
});

test('남은 세트부터 시작한다 - 이미 한 세트를 다시 하지 않는다', () => {
  const r = resumeSession({ session: partialRecord(), settings, now: at(1000) });
  const s = advance(r, at(1005)).session;
  assertEqual(s.exerciseIndex, 0);
  assertEqual(s.setNumber, 2);
});

test('재개해도 준비 구간을 한 번 거친다', () => {
  const r = resumeSession({ session: partialRecord(), settings, now: at(1000) });
  assertEqual(r.phase, PHASE.PREP);
  assertEqual(r.resumed, true);
});

test('첫 시작 시각은 그대로고 누적 시간이 이어진다', () => {
  const rec = partialRecord();
  const r = resumeSession({ session: rec, settings, now: at(1000) });
  assertEqual(r.startedAt, T0);
  assertEqual(r.activeSeconds, rec.activeSeconds);
});

test('세션 사이의 중단 기간은 총 운동시간에 들지 않는다', () => {
  const rec = partialRecord();
  const r = resumeSession({ session: rec, settings, now: at(1000) });
  assertClose(activeSecondsAt(r, at(1000)), rec.activeSeconds, 0.01);
});

test('건너뛴 운동은 재개 대상 밖이다', () => {
  let s = atFirstSet();
  s = skipExercise(s, at(10)).session;      // A 건너뜀 → 전환
  s = advance(s, at(30)).session;           // B 1세트
  const rec = toRecord(endSession(s, at(35)).session);
  assertDeep(remainingSets(rec), [0, 1]);
  const r = resumeSession({ session: rec, settings, now: at(1000) });
  assertEqual(r.exerciseIndex, 1);
});

test('건너뛴 운동만 남으면 재개하지 않는다', () => {
  let s = atFirstSet();
  s = pressNext(s, at(40)).session;
  s = step(s, 60).session;
  s = pressNext(s, at(100)).session;  // A 완료 → 전환
  s = step(s, 110).session;           // B 1세트
  s = skipExercise(s, at(115)).session; // B 건너뜀 → 종료
  const rec = toRecord(s);
  assertEqual(hasResumeTarget(rec), false);
  assertNull(resumeSession({ session: rec, settings, now: at(1000) }));
});

test('재개해서 남은 것을 다 채우면 완료가 된다', () => {
  const r = resumeSession({ session: partialRecord(), settings, now: at(1000) });
  let s = advance(r, at(1005)).session;   // A 2세트
  s = pressNext(s, at(1040)).session;     // A 완료 → 전환
  s = advance(s, at(1055)).session;       // B 1세트
  const done = pressNext(s, at(1090)).session;
  assertEqual(done.status, 'complete');
});

test('건너뛴 운동이 있으면 재개해도 완료가 되지 않는다', () => {
  let s = atFirstSet();
  s = skipExercise(s, at(10)).session;
  s = advance(s, at(30)).session;
  const rec = toRecord(endSession(s, at(35)).session);
  const r = resumeSession({ session: rec, settings, now: at(1000) });
  let t = advance(r, at(1005)).session;   // B 1세트
  t = pressNext(t, at(1040)).session;
  assertEqual(t.status, 'partial');
});

suite('session - 기록 모양');

test('기록에 진행 중에만 쓰는 값이 남지 않는다', () => {
  const rec = toRecord(finishAll().session);
  assertEqual('phase' in rec, false);
  assertEqual('undo' in rec, false);
  assertEqual('cueFlags' in rec, false);
});

test('운동별로 예정과 실제를 함께 남긴다', () => {
  const rec = toRecord(finishAll().session);
  assertDeep(rec.results[0], {
    name: 'A', plannedReps: 10, plannedSets: 2, doneSets: 2, result: EXERCISE_RESULT.COMPLETE,
  });
});

test('총 운동시간은 정수 초다', () => {
  const rec = toRecord(finishAll().session);
  assertEqual(Number.isInteger(rec.activeSeconds), true);
  assert(rec.activeSeconds > 0, '진행 시간이 0이다');
});

test('계획 스냅샷을 통째로 갖는다', () => {
  const rec = toRecord(finishAll().session);
  assertEqual(rec.plan.exercises.length, 2);
  assertEqual(rec.date, '2026-09-17');
});

suite('session - 다음 재개 대상 찾기');

// 화면이 전환 구간에서 다음 운동의 세트 수·횟수를 미리 보이는 데 쓴다.
test('바로 뒤의 남은 운동을 가리킨다', () => {
  assertEqual(nextTargetIndex(atFirstSet(), 0), 1);
});

test('마지막 운동 뒤에는 없다', () => {
  assertEqual(nextTargetIndex(atFirstSet(), 1), -1);
});

test('건너뛴 운동은 대상이 아니다', () => {
  const skipped = skipExercise(atFirstSet(), at(10)).session;
  assertEqual(nextTargetIndex(skipped, 0), 1);
  assertEqual(nextTargetIndex(skipped, 1), -1);
});
