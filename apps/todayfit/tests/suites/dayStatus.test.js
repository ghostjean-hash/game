import { suite, test, assertEqual } from '../core.js';
import { dayStatus, dayStatusMap, canEditPlan } from '../../src/core/dayStatus.js';
import { DAY_STATUS } from '../../src/data/constants.js';

const TODAY = '2026-09-17';
const plan = { date: TODAY, time: '22:00', routineName: 'A', createdAt: 0, exercises: [] };
const st = (over) => dayStatus({ dateKey: TODAY, todayKey: TODAY, ...over }).status;

suite('dayStatus - 판정표');

test('계획이 없으면 상태 없음', () => {
  assertEqual(st({ plan: null }), DAY_STATUS.NONE);
});

test('계획이 있고 기록이 없는 오늘은 예정', () => {
  assertEqual(st({ plan }), DAY_STATUS.PLANNED);
});

test('미래도 예정', () => {
  assertEqual(dayStatus({ dateKey: '2026-09-20', todayKey: TODAY, plan }).status, DAY_STATUS.PLANNED);
});

test('기록 없이 지나간 날은 미실시', () => {
  assertEqual(dayStatus({ dateKey: '2026-09-15', todayKey: TODAY, plan }).status, DAY_STATUS.MISSED);
});

test('기록의 상태를 그대로 쓴다', () => {
  assertEqual(st({ plan, record: { status: 'complete' } }), DAY_STATUS.COMPLETE);
  assertEqual(st({ plan, record: { status: 'partial' } }), DAY_STATUS.PARTIAL);
});

test('계획이 없으면 기록이 있어도 상태 없음', () => {
  assertEqual(st({ plan: null, record: { status: 'complete' } }), DAY_STATUS.NONE);
});

suite('dayStatus - 진행 중과 자정');

test('진행 중인 날짜는 예정에 진행 중 표기가 붙는다', () => {
  const r = dayStatus({ dateKey: TODAY, todayKey: TODAY, plan, activeDate: TODAY });
  assertEqual(r.status, DAY_STATUS.PLANNED);
  assertEqual(r.running, true);
});

test('자정을 넘겨 진행 중이면 시작한 날짜가 미실시로 바뀌지 않는다', () => {
  const r = dayStatus({ dateKey: TODAY, todayKey: '2026-09-18', plan, activeDate: TODAY });
  assertEqual(r.status, DAY_STATUS.PLANNED);
  assertEqual(r.running, true);
});

test('자정을 넘겼고 진행 중이 아니면 미실시다', () => {
  const r = dayStatus({ dateKey: TODAY, todayKey: '2026-09-18', plan, activeDate: null });
  assertEqual(r.status, DAY_STATUS.MISSED);
});

test('다른 날짜가 진행 중이면 이 날짜는 영향받지 않는다', () => {
  const r = dayStatus({ dateKey: TODAY, todayKey: '2026-09-18', plan, activeDate: '2026-09-18' });
  assertEqual(r.status, DAY_STATUS.MISSED);
  assertEqual(r.running, false);
});

suite('dayStatus - 여러 날짜');

test('한 번에 여러 날짜를 판정한다', () => {
  const map = dayStatusMap({
    dateKeys: ['2026-09-15', '2026-09-17', '2026-09-19'],
    todayKey: TODAY,
    plans: { '2026-09-15': plan, '2026-09-17': plan },
    records: {},
  });
  assertEqual(map['2026-09-15'].status, DAY_STATUS.MISSED);
  assertEqual(map['2026-09-17'].status, DAY_STATUS.PLANNED);
  assertEqual(map['2026-09-19'].status, DAY_STATUS.NONE);
});

suite('dayStatus - 계획 수정 잠김');

test('오늘과 미래는 고칠 수 있다', () => {
  assertEqual(canEditPlan({ dateKey: TODAY, todayKey: TODAY, record: null }), true);
  assertEqual(canEditPlan({ dateKey: '2026-09-20', todayKey: TODAY, record: null }), true);
});

test('지나간 날짜는 잠긴다', () => {
  assertEqual(canEditPlan({ dateKey: '2026-09-15', todayKey: TODAY, record: null }), false);
});

test('기록이 있으면 오늘이어도 잠긴다', () => {
  assertEqual(canEditPlan({ dateKey: TODAY, todayKey: TODAY, record: { status: 'partial' } }), false);
});
