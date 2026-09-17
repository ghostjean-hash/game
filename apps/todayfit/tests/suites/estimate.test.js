import { suite, test, assertEqual } from '../core.js';
import { estimatePlanSeconds, estimateRemainingSeconds, toDisplayMinutes } from '../../src/core/estimate.js';

const settings = { prepSeconds: 5, transitionSeconds: 30, workSeconds: 45, restSeconds: 60 };
const ex = (sets, work = 45, rest = 60) => ({ name: 'x', sets, reps: 10, workSeconds: work, restSeconds: rest });

suite('estimate - 예상 총 운동시간');

test('운동 하나 세트 하나 - 휴식도 전환도 없다', () => {
  // 5 + 45
  assertEqual(estimatePlanSeconds([ex(1)], settings), 50);
});

test('운동 하나 세 세트 - 휴식은 세트보다 하나 적다', () => {
  // 5 + (45*3 + 60*2)
  assertEqual(estimatePlanSeconds([ex(3)], settings), 5 + 135 + 120);
});

test('운동 둘 - 전환은 운동보다 하나 적다', () => {
  // 5 + (45+0) + (45+0) + 30
  assertEqual(estimatePlanSeconds([ex(1), ex(1)], settings), 5 + 45 + 45 + 30);
});

test('운동 셋 - 전환 둘', () => {
  assertEqual(estimatePlanSeconds([ex(1), ex(1), ex(1)], settings), 5 + 135 + 60);
});

test('빈 계획은 0 - 준비시간도 붙지 않는다', () => {
  assertEqual(estimatePlanSeconds([], settings), 0);
});

test('운동마다 다른 시간을 쓴다', () => {
  // 5 + (50*2 + 90*1) + 30 + (45*1)
  assertEqual(estimatePlanSeconds([ex(2, 50, 90), ex(1, 45, 60)], settings), 5 + 190 + 30 + 45);
});

test('전환시간 0 도 값이다', () => {
  const s = { ...settings, transitionSeconds: 0 };
  assertEqual(estimatePlanSeconds([ex(1), ex(1)], s), 5 + 45 + 45);
});

suite('estimate - 남은 시간');

test('남은 세트만 센다', () => {
  // 5 + (45*1) = 50
  assertEqual(estimateRemainingSeconds([ex(3)], [1], settings), 50);
});

test('남은 세트 둘이면 사이 휴식 하나', () => {
  assertEqual(estimateRemainingSeconds([ex(3)], [2], settings), 5 + 90 + 60);
});

test('건너뛴 자리는 0 이라 빠지고 전환도 줄어든다', () => {
  // 가운데 운동이 0 → 남은 운동 둘, 전환 하나
  const out = estimateRemainingSeconds([ex(1), ex(1), ex(1)], [1, 0, 1], settings);
  assertEqual(out, 5 + 45 + 45 + 30);
});

test('남은 것이 없으면 0', () => {
  assertEqual(estimateRemainingSeconds([ex(3)], [0], settings), 0);
});

suite('estimate - 화면 표기');

test('분 단위 반올림', () => {
  assertEqual(toDisplayMinutes(100), 2);
  assertEqual(toDisplayMinutes(89), 1);
  assertEqual(toDisplayMinutes(90), 2);
});

test('0 분으로 떨어지지 않는다 - 짧아도 1분', () => {
  assertEqual(toDisplayMinutes(10), 1);
});

test('0 초는 0 분', () => {
  assertEqual(toDisplayMinutes(0), 0);
});
