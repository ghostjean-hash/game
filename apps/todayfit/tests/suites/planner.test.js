import { suite, test, assertEqual, assertDeep } from '../core.js';
import { buildMonthPlans, previewMonthPlans, canMakeMonthPlans } from '../../src/core/planner.js';
import { weekdayOf } from '../../src/core/datekey.js';

const settings = { prepSeconds: 5, transitionSeconds: 30, workSeconds: 45, restSeconds: 60 };

const exercises = [
  { id: 'e1', name: '덤벨 컬', sets: 3, reps: 10, workSeconds: null, restSeconds: null },
  { id: 'e2', name: '해머 컬', sets: 3, reps: 12, workSeconds: null, restSeconds: null },
  { id: 'e3', name: '스쿼트', sets: 5, reps: 5, workSeconds: 60, restSeconds: 120 },
];

const routines = [
  { id: 'A', name: '팔', items: [{ exerciseId: 'e1' }, { exerciseId: 'e2' }] },
  { id: 'B', name: '하체', items: [{ exerciseId: 'e3', sets: 4 }] },
  { id: 'C', name: '빈 루틴', items: [] },
];

// 화 A / 목 B / 토 A
const weekly = [
  { weekday: 1, enabled: false, time: null, routineId: null },
  { weekday: 2, enabled: true, time: '22:00', routineId: 'A' },
  { weekday: 3, enabled: false, time: null, routineId: null },
  { weekday: 4, enabled: true, time: '22:00', routineId: 'B' },
  { weekday: 5, enabled: false, time: null, routineId: null },
  { weekday: 6, enabled: true, time: '22:00', routineId: 'A' },
  { weekday: 7, enabled: false, time: null, routineId: null },
];

// 오늘을 그 달 1일로 두면 대상 기간이 달 전체라, 기간 규칙이 들어오기 전 판정이
// 그대로 성립한다. 기간을 보는 시험은 아래 '대상 기간' 묶음이 today 를 옮겨 가며 본다
const build = (over = {}) => buildMonthPlans({
  year: 2026,
  month: 9,
  weeklyRules: weekly,
  routines,
  exercises,
  settings,
  createdAt: 1000,
  today: '2026-09-01',
  ...over,
});

suite('planner - 월간 계획 생성');

test('쓰는 요일에만 계획이 선다', () => {
  const plans = build();
  assertEqual(plans.every((p) => [2, 4, 6].includes(weekdayOf(p.date))), true);
});

test('2026년 9월 화·목·토는 열셋이다', () => {
  assertEqual(build().length, 13);
});

test('요일마다 다른 루틴이 붙는다', () => {
  const plans = build();
  const tue = plans.find((p) => weekdayOf(p.date) === 2);
  const thu = plans.find((p) => weekdayOf(p.date) === 4);
  assertEqual(tue.routineName, '팔');
  assertEqual(thu.routineName, '하체');
});

test('루틴 이름은 사본이라 참조가 아니다', () => {
  const plans = build();
  assertEqual(typeof plans[0].routineName, 'string');
  assertEqual('routineId' in plans[0], false);
});

test('예정 시간이 요일 규칙에서 온다', () => {
  assertEqual(build()[0].time, '22:00');
});

test('생성 시각을 남긴다', () => {
  assertEqual(build()[0].createdAt, 1000);
});

suite('planner - 값 고정');

test('템플릿에 시간이 없으면 앱 기본값이 확정값으로 박힌다', () => {
  const tue = build().find((p) => weekdayOf(p.date) === 2);
  assertEqual(tue.exercises[0].workSeconds, 45);
  assertEqual(tue.exercises[0].restSeconds, 60);
});

test('루틴 지정값이 확정값으로 박힌다', () => {
  const thu = build().find((p) => weekdayOf(p.date) === 4);
  assertEqual(thu.exercises[0].sets, 4);   // 루틴 B 가 5 를 4 로 덮어씀
  assertEqual(thu.exercises[0].reps, 5);   // 템플릿 값
  assertEqual(thu.exercises[0].workSeconds, 60);
});

test('확정 뒤에는 빈 값이 없다', () => {
  for (const p of build()) {
    for (const ex of p.exercises) {
      assertEqual(Object.values(ex).some((v) => v === null || v === undefined), false);
    }
  }
});

test('생성 뒤 앱 기본값을 바꿔도 이미 만든 계획은 그대로다', () => {
  const plans = build();
  const before = plans[0].exercises[0].workSeconds;
  settings.workSeconds = 99;
  assertEqual(plans[0].exercises[0].workSeconds, before);
  settings.workSeconds = 45;
});

suite('planner - 걸러내기');

test('쓰지 않는 요일은 계획이 없다', () => {
  const off = weekly.map((r) => ({ ...r, enabled: false }));
  assertEqual(build({ weeklyRules: off }).length, 0);
});

test('루틴이 붙지 않은 요일은 건너뛴다', () => {
  const noRoutine = weekly.map((r) => (r.weekday === 2 ? { ...r, routineId: null } : r));
  const plans = build({ weeklyRules: noRoutine });
  assertEqual(plans.some((p) => weekdayOf(p.date) === 2), false);
});

test('빈 루틴은 계획을 만들지 않는다', () => {
  const emptyRoutine = weekly.map((r) => (r.enabled ? { ...r, routineId: 'C' } : r));
  assertEqual(build({ weeklyRules: emptyRoutine }).length, 0);
});

test('이미 계획이 있는 날짜는 건드리지 않는다 - 날짜당 하나', () => {
  const plans = build({ existingDates: ['2026-09-01', '2026-09-03'] });
  assertEqual(plans.length, 11);
  assertEqual(plans.some((p) => p.date === '2026-09-01'), false);
});

suite('planner - 대상 기간 (01_spec.md 3.7.1)');

// 2026년 9월의 화·목·토는 1 3 5 8 10 12 15 17 19 22 24 26 29 열셋.
// 9월 18일(금)에 만들면 19 22 24 26 29 다섯만 남는다
test('이번 달 - 오늘 이전 날짜는 만들지 않는다', () => {
  const plans = build({ today: '2026-09-18' });
  assertDeep(plans.map((p) => p.date), ['2026-09-19', '2026-09-22', '2026-09-24', '2026-09-26', '2026-09-29']);
});

test('이번 달 - 오늘이 대상 요일이면 오늘도 만든다', () => {
  const plans = build({ today: '2026-09-19' });
  assertEqual(plans[0].date, '2026-09-19');
  assertEqual(plans.length, 5);
});

test('다음 달 이후 - 그 달 전체를 만든다', () => {
  const plans = build({ year: 2026, month: 10, today: '2026-09-18' });
  assertEqual(plans.length, 14);          // 10월 화·목·토
  assertEqual(plans[0].date, '2026-10-01');
});

test('지난 달 - 한 건도 만들지 않는다', () => {
  assertEqual(build({ year: 2026, month: 8, today: '2026-09-18' }).length, 0);
});

test('지난 달 - 만들 수 있는 달인지 묻는 답이 거짓이다', () => {
  assertEqual(canMakeMonthPlans({ year: 2026, month: 8, today: '2026-09-18' }), false);
  assertEqual(canMakeMonthPlans({ year: 2025, month: 12, today: '2026-09-18' }), false);
});

test('이번 달과 다음 달 이후는 만들 수 있다', () => {
  assertEqual(canMakeMonthPlans({ year: 2026, month: 9, today: '2026-09-18' }), true);
  assertEqual(canMakeMonthPlans({ year: 2026, month: 10, today: '2026-09-18' }), true);
  assertEqual(canMakeMonthPlans({ year: 2027, month: 1, today: '2026-09-18' }), true);
});

test('월말 - 오늘이 그 달 마지막 날이면 그날만 본다', () => {
  // 2026-09-30 은 수요일이라 화·목·토 규칙에 들지 않는다 - 만들 것이 없다
  assertEqual(build({ today: '2026-09-30' }).length, 0);
  // 12월 31일은 목요일이라 규칙에 든다 - 그 하루만 만들어진다
  assertDeep(build({ year: 2026, month: 12, today: '2026-12-31' }).map((p) => p.date), ['2026-12-31']);
});

test('연 경계 - 해가 바뀌면 지난해 달은 만들지 않는다', () => {
  assertEqual(build({ year: 2026, month: 12, today: '2027-01-05' }).length, 0);
  // 해를 넘긴 달도 '다음 달 이후'라 그 달 전체다 - 2027년 1월 화·목·토는 열셋
  const jan = build({ year: 2027, month: 1, today: '2026-12-31' });
  assertEqual(jan.length, 13);
  assertEqual(jan[0].date, '2027-01-02');
});

test('오늘을 넘기지 않으면 만들지 않고 멈춘다', () => {
  let threw = false;
  try { build({ today: undefined }); } catch { threw = true; }
  assertEqual(threw, true);
});

test('이번 달에 일부 계획이 있어도 남은 빈 날짜는 채운다', () => {
  const plans = build({ today: '2026-09-18', existingDates: ['2026-09-22', '2026-09-26'] });
  assertDeep(plans.map((p) => p.date), ['2026-09-19', '2026-09-24', '2026-09-29']);
});

test('기존 계획 날짜는 대상 기간 안이어도 덮어쓰지 않는다', () => {
  const plans = build({ today: '2026-09-18', existingDates: ['2026-09-19'] });
  assertEqual(plans.some((p) => p.date === '2026-09-19'), false);
  assertEqual(plans.length, 4);
});

suite('planner - 미리보기');

test('생성 일수와 날짜별 루틴 이름을 보인다', () => {
  const pv = previewMonthPlans(build());
  assertEqual(pv.count, 13);
  assertDeep(pv.days[0], { date: '2026-09-01', time: '22:00', routineName: '팔', exerciseCount: 2 });
});
