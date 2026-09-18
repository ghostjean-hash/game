import { suite, test, assertEqual, assert, assertDeep } from '../core.js';
import {
  routinesUsingExercise, weekdaysUsingRoutine,
  removeExerciseFromRoutines, unlinkRoutineFromWeekly, moveItem,
} from '../../src/core/cascade.js';

const item = (exerciseId) => ({ exerciseId, sets: null, reps: null, workSeconds: null, restSeconds: null });

function routines() {
  return [
    { id: 'r1', name: '상체', items: [item('e1'), item('e2')] },
    { id: 'r2', name: '하체', items: [item('e3')] },
    { id: 'r3', name: '전신', items: [item('e1'), item('e3')] },
  ];
}

function weekly() {
  return [
    { weekday: 1, enabled: true, time: '07:00', routineId: 'r1' },
    { weekday: 2, enabled: false, time: '', routineId: null },
    { weekday: 3, enabled: true, time: '07:00', routineId: 'r2' },
    { weekday: 4, enabled: false, time: '', routineId: null },
    { weekday: 5, enabled: true, time: '19:00', routineId: 'r1' },
    { weekday: 6, enabled: false, time: '', routineId: null },
    { weekday: 7, enabled: false, time: '', routineId: null },
  ];
}

suite('cascade - 참조 세기');

test('그 운동을 쓰는 루틴을 찾는다', () => {
  const found = routinesUsingExercise(routines(), 'e1');
  assertDeep(found.map((r) => r.id), ['r1', 'r3']);
});

test('아무도 안 쓰는 운동은 빈 목록', () => {
  assertEqual(routinesUsingExercise(routines(), 'e9').length, 0);
});

test('그 루틴을 건 요일을 찾는다', () => {
  assertDeep(weekdaysUsingRoutine(weekly(), 'r1'), [1, 5]);
});

test('아무 요일도 안 쓰는 루틴은 빈 목록', () => {
  assertEqual(weekdaysUsingRoutine(weekly(), 'r9').length, 0);
});

suite('cascade - 운동 템플릿 지움이 루틴에 번진다');

test('그 운동 항목만 빠진다', () => {
  const after = removeExerciseFromRoutines(routines(), 'e1');
  assertDeep(after[0].items.map((i) => i.exerciseId), ['e2']);
  assertDeep(after[2].items.map((i) => i.exerciseId), ['e3']);
});

test('그 운동을 안 쓰던 루틴은 그대로다', () => {
  const before = routines();
  const after = removeExerciseFromRoutines(before, 'e1');
  assertEqual(after[1], before[1], '손대지 않은 루틴은 같은 객체');
});

test('받은 목록을 고치지 않는다', () => {
  const before = routines();
  removeExerciseFromRoutines(before, 'e1');
  assertEqual(before[0].items.length, 2);
});

test('마지막 운동이 빠져 루틴이 비어도 루틴은 남는다', () => {
  const after = removeExerciseFromRoutines(routines(), 'e3');
  assertEqual(after.length, 3);
  assertEqual(after[1].items.length, 0);
});

suite('cascade - 루틴 지움이 요일 규칙에 번진다');

test('그 루틴을 건 요일의 연결이 풀린다', () => {
  const after = unlinkRoutineFromWeekly(weekly(), 'r1');
  assertEqual(after[0].routineId, null);
  assertEqual(after[4].routineId, null);
});

test('사용 여부는 건드리지 않는다 - 그 자리는 화면이 경고로 알린다', () => {
  const after = unlinkRoutineFromWeekly(weekly(), 'r1');
  assertEqual(after[0].enabled, true);
  assertEqual(after[4].enabled, true);
});

test('다른 루틴을 건 요일은 그대로다', () => {
  const after = unlinkRoutineFromWeekly(weekly(), 'r1');
  assertEqual(after[2].routineId, 'r2');
  assertEqual(after[2].enabled, true);
});

test('예정 시간은 지우지 않는다 - 다시 걸 때 그대로 쓴다', () => {
  const after = unlinkRoutineFromWeekly(weekly(), 'r1');
  assertEqual(after[0].time, '07:00');
});

test('받은 규칙을 고치지 않는다', () => {
  const before = weekly();
  unlinkRoutineFromWeekly(before, 'r1');
  assertEqual(before[0].routineId, 'r1');
});

test('일곱 행 길이를 지킨다', () => {
  assertEqual(unlinkRoutineFromWeekly(weekly(), 'r1').length, 7);
});

suite('cascade - 순서 옮기기');

test('위로 한 칸', () => {
  assertDeep(moveItem(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c']);
});

test('아래로 한 칸', () => {
  assertDeep(moveItem(['a', 'b', 'c'], 1, 1), ['a', 'c', 'b']);
});

test('맨 위에서 더 위로 가려 하면 그대로', () => {
  assertDeep(moveItem(['a', 'b'], 0, -1), ['a', 'b']);
});

test('맨 아래에서 더 아래로 가려 하면 그대로', () => {
  assertDeep(moveItem(['a', 'b'], 1, 1), ['a', 'b']);
});

test('없는 자리를 옮기려 하면 그대로', () => {
  assertDeep(moveItem(['a', 'b'], 5, -1), ['a', 'b']);
});

test('하나뿐인 목록은 움직이지 않는다', () => {
  assertDeep(moveItem(['a'], 0, 1), ['a']);
});

test('받은 목록을 고치지 않는다', () => {
  const before = ['a', 'b', 'c'];
  moveItem(before, 0, 1);
  assertDeep(before, ['a', 'b', 'c']);
});
