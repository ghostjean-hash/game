import { suite, test, assertEqual, assert, assertNull } from '../core.js';
import { checkNumber, checkName, checkTime } from '../../src/core/validate.js';
import { LIMITS, NAME_MAX_LENGTH } from '../../src/data/constants.js';

suite('validate - 수 입력 범위 (02_data.md 1.3)');

test('범위 안 값은 받는다', () => {
  const r = checkNumber('sets', '5');
  assert(r.ok);
  assertEqual(r.value, 5);
});

test('글자로 온 값을 수로 바꾼다', () => {
  assertEqual(checkNumber('reps', '12').value, 12);
});

test('최소값과 최대값은 범위 안이다', () => {
  assert(checkNumber('sets', String(LIMITS.sets.min)).ok);
  assert(checkNumber('sets', String(LIMITS.sets.max)).ok);
});

test('최소값보다 하나 작으면 막는다', () => {
  const r = checkNumber('sets', String(LIMITS.sets.min - 1));
  assert(!r.ok);
  assertEqual(r.reason, 'range');
});

test('최대값보다 하나 크면 막는다', () => {
  const r = checkNumber('reps', String(LIMITS.reps.max + 1));
  assert(!r.ok);
  assertEqual(r.reason, 'range');
});

test('준비시간은 0 을 받는다 - 0 은 빈 값이 아니다', () => {
  const r = checkNumber('prepSeconds', '0');
  assert(r.ok);
  assertEqual(r.value, 0);
});

test('수가 아니면 막는다', () => {
  assertEqual(checkNumber('sets', '셋').reason, 'nan');
});

test('소수는 막는다 - 세트와 초는 정수다', () => {
  assertEqual(checkNumber('workSeconds', '45.5').reason, 'nan');
});

test('비울 수 없는 칸을 비우면 막는다', () => {
  assertEqual(checkNumber('sets', '').reason, 'blank');
});

test('공백만 있어도 빈 값이다', () => {
  assertEqual(checkNumber('sets', '   ').reason, 'blank');
});

test('비울 수 있는 칸을 비우면 null 을 돌려준다', () => {
  const r = checkNumber('workSeconds', '', true);
  assert(r.ok);
  assertNull(r.value);
});

test('비울 수 있는 칸이어도 범위 밖 값은 막는다', () => {
  assertEqual(checkNumber('workSeconds', '1', true).reason, 'range');
});

test('허용 범위를 함께 돌려준다 - 화면이 숫자를 따로 적지 않게', () => {
  const r = checkNumber('restSeconds', '3');
  assertEqual(r.min, LIMITS.restSeconds.min);
  assertEqual(r.max, LIMITS.restSeconds.max);
});

suite('validate - 이름');

test('앞뒤 공백을 뗀다', () => {
  assertEqual(checkName('  덤벨 컬  ').value, '덤벨 컬');
});

test('빈 이름은 막는다', () => {
  assertEqual(checkName('').reason, 'blank');
});

test('공백만 있는 이름도 막는다', () => {
  assertEqual(checkName('   ').reason, 'blank');
});

test('상한 길이는 받는다', () => {
  assert(checkName('가'.repeat(NAME_MAX_LENGTH)).ok);
});

test('상한을 넘으면 막는다', () => {
  assertEqual(checkName('가'.repeat(NAME_MAX_LENGTH + 1)).reason, 'long');
});

test('같은 이름을 막지 않는다 - 열쇠는 id 다', () => {
  assert(checkName('벤치프레스').ok);
  assert(checkName('벤치프레스').ok);
});

suite('validate - 예정 시간');

test('HH:MM 을 받는다', () => {
  assertEqual(checkTime('07:30').value, '07:30');
});

test('자정과 하루의 끝을 받는다', () => {
  assert(checkTime('00:00').ok);
  assert(checkTime('23:59').ok);
});

test('빈 시간은 받는다 - 안 정한 요일이 있다', () => {
  const r = checkTime('');
  assert(r.ok);
  assertEqual(r.value, '');
});

test('24 시는 막는다', () => {
  assertEqual(checkTime('24:00').reason, 'format');
});

test('60 분은 막는다', () => {
  assertEqual(checkTime('12:60').reason, 'format');
});

test('한 자리 시는 막는다 - 저장 형식이 HH:MM 이다', () => {
  assertEqual(checkTime('7:30').reason, 'format');
});
