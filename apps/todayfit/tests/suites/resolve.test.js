import { suite, test, assertEqual, assertDeep } from '../core.js';
import { resolveItem, sourceOfItem, expandRoutine, indexById } from '../../src/core/resolve.js';

const settings = { workSeconds: 45, restSeconds: 60, prepSeconds: 5, transitionSeconds: 30 };

const curl = { id: 'e1', name: '덤벨 컬', sets: 3, reps: 10, workSeconds: null, restSeconds: null };
const bench = { id: 'e2', name: '벤치프레스', sets: 4, reps: 8, workSeconds: 50, restSeconds: 90 };

const empty = { exerciseId: 'e1', sets: null, reps: null, workSeconds: null, restSeconds: null };

suite('resolve - 값 적용 순서 3단');

test('아무것도 덮어쓰지 않으면 템플릿 값', () => {
  const r = resolveItem(empty, curl, settings);
  assertEqual(r.sets, 3);
  assertEqual(r.reps, 10);
});

test('템플릿에 시간이 없으면 앱 기본값', () => {
  const r = resolveItem(empty, curl, settings);
  assertEqual(r.workSeconds, 45);
  assertEqual(r.restSeconds, 60);
});

test('템플릿에 시간이 있으면 앱 기본값을 쓰지 않는다', () => {
  const r = resolveItem({ ...empty, exerciseId: 'e2' }, bench, settings);
  assertEqual(r.workSeconds, 50);
  assertEqual(r.restSeconds, 90);
});

test('루틴 지정값이 템플릿을 이긴다', () => {
  const r = resolveItem({ ...empty, sets: 4, reps: 8 }, curl, settings);
  assertEqual(r.sets, 4);
  assertEqual(r.reps, 8);
});

test('루틴 지정값이 템플릿과 앱 기본값을 모두 이긴다', () => {
  const r = resolveItem({ ...empty, workSeconds: 20, restSeconds: 30 }, bench, settings);
  assertEqual(r.workSeconds, 20);
  assertEqual(r.restSeconds, 30);
});

test('같은 운동을 루틴마다 다르게 쓴다 - 템플릿을 복제하지 않는다', () => {
  const a = resolveItem({ ...empty, sets: 3, reps: 10 }, curl, settings);
  const b = resolveItem({ ...empty, sets: 4, reps: 8 }, curl, settings);
  assertEqual(`${a.sets}x${a.reps}`, '3x10');
  assertEqual(`${b.sets}x${b.reps}`, '4x8');
  assertEqual(a.name, b.name);
});

test('0 은 빈 값이 아니다 - 덮어쓴 0 이 살아남는다', () => {
  const r = resolveItem({ ...empty, restSeconds: 0 }, bench, settings);
  assertEqual(r.restSeconds, 0);
});

test('운동명은 덮어쓰기 대상 밖이다', () => {
  const r = resolveItem({ ...empty, name: '다른 이름' }, curl, settings);
  assertEqual(r.name, '덤벨 컬');
});

suite('resolve - 값의 출처');

test('출처를 세 갈래로 가른다', () => {
  assertDeep(sourceOfItem({ ...empty, sets: 5 }, curl), {
    sets: 'routine', reps: 'exercise', workSeconds: 'settings', restSeconds: 'settings',
  });
  assertDeep(sourceOfItem(empty, bench), {
    sets: 'exercise', reps: 'exercise', workSeconds: 'exercise', restSeconds: 'exercise',
  });
});

suite('resolve - 루틴 펴기');

const byId = indexById([curl, bench]);

test('순서 번호가 1부터 붙는다', () => {
  const routine = { id: 'r1', name: 'A', items: [empty, { ...empty, exerciseId: 'e2' }] };
  const out = expandRoutine(routine, byId, settings);
  assertEqual(out.length, 2);
  assertEqual(out[0].order, 1);
  assertEqual(out[1].order, 2);
  assertEqual(out[1].name, '벤치프레스');
});

test('없는 템플릿을 가리키는 항목은 건너뛴다', () => {
  const routine = { id: 'r1', name: 'A', items: [{ ...empty, exerciseId: 'nope' }, empty] };
  const out = expandRoutine(routine, byId, settings);
  assertEqual(out.length, 1);
  assertEqual(out[0].order, 1);
  assertEqual(out[0].name, '덤벨 컬');
});

test('빈 루틴은 빈 목록', () => {
  assertEqual(expandRoutine({ id: 'r', name: 'x', items: [] }, byId, settings).length, 0);
});

test('편 결과에는 빈 값이 없다', () => {
  const routine = { id: 'r1', name: 'A', items: [empty] };
  const out = expandRoutine(routine, byId, settings);
  const values = Object.values(out[0]);
  assertEqual(values.some((v) => v === null || v === undefined), false);
});
