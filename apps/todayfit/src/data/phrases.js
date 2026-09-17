// 화면과 음성에 나가는 글자. 코드에 문장을 직접 적지 않는다(04_conventions.md 1.2).
// 소리 시점과 문구의 짝은 01_spec.md 7.1 이 정한다.

import { CUE, PHASE, DAY_STATUS, EXERCISE_RESULT } from './constants.js';

/** 음성 안내. 값이 함수면 인자를 받아 문장을 만든다. */
export const VOICE = Object.freeze({
  [CUE.PREP_START]: ({ name }) => `준비. 첫 운동 ${name}, 1세트`,
  [CUE.SET_START]: ({ name, setNumber }) => `${name}, ${setNumber}세트`,
  [CUE.LAST_SET_START]: ({ name }) => `${name}, 마지막 세트`,
  [CUE.OVERRUN]: () => '권장 시간이 지났습니다',
  [CUE.OVERRUN_AGAIN]: () => '아직 진행 중입니다',
  [CUE.SET_DONE]: () => '세트 완료',
  [CUE.REST_START]: ({ seconds }) => `휴식 ${seconds}초`,
  [CUE.TRANSITION_START]: ({ nextName }) => `다음 운동, ${nextName}`,
  [CUE.COUNTDOWN]: ({ n }) => String(n),
  [CUE.SKIP]: ({ nextName }) => (nextName ? `건너뜁니다. 다음 운동, ${nextName}` : '건너뜁니다'),
  [CUE.FINISH]: () => '운동 완료',
});

export const PHASE_LABEL = Object.freeze({
  [PHASE.PREP]: '준비',
  [PHASE.WORK]: '운동',
  [PHASE.REST]: '휴식',
  [PHASE.TRANSITION]: '전환',
});

export const DAY_STATUS_LABEL = Object.freeze({
  [DAY_STATUS.NONE]: '계획 없음',
  [DAY_STATUS.PLANNED]: '예정',
  [DAY_STATUS.COMPLETE]: '완료',
  [DAY_STATUS.PARTIAL]: '부분 완료',
  [DAY_STATUS.MISSED]: '미실시',
});

export const RESULT_LABEL = Object.freeze({
  [EXERCISE_RESULT.COMPLETE]: '완료',
  [EXERCISE_RESULT.INCOMPLETE]: '미완료',
  [EXERCISE_RESULT.SKIPPED]: '건너뜀',
});

export const WEEKDAY_LABEL = Object.freeze(['', '월', '화', '수', '목', '금', '토', '일']);

export const TEXT = Object.freeze({
  // --- 앱 껍데기 ---
  appTitle: '오늘운동',
  navToday: '오늘',
  navCalendar: '달력',
  navSettings: '설정',
  soonScreen: '아직 만들지 않은 화면입니다',

  // --- 오늘 화면 (01_spec.md 2.7) ---
  todayNoPlan: '오늘 예정된 운동 없음',
  resumeTitle: '진행 중인 운동이 있습니다',
  resumeAction: '이어하기',
  continueTitle: '남은 운동이 있습니다',
  continueAction: '남은 운동 계속',
  startAction: '운동 시작',
  todayHeading: '오늘의 운동',
  timeLabel: '예정',
  estimateLabel: '예상',
  countLabel: '운동',
  remainLabel: '남은 운동',
  nextPlanLabel: '다음 예정',
  noNextPlan: '다음 예정 없음',
  doneToday: '오늘 운동을 마쳤습니다',

  // --- 운동 실행 화면 (01_spec.md 4장) ---
  nextAction: '다음',
  pauseAction: '일시정지',
  unpauseAction: '계속',
  endAction: '운동 종료',
  undoAction: '되돌리기',
  skipHint: '길게 누르면 이 운동 건너뛰기',
  skipped: '이 운동을 건너뛰었습니다',
  nowLabel: '지금',
  upNextLabel: '다음',
  startsSoonLabel: '곧 시작',
  restLabel: '쉬는 중',
  recommendPrefix: '권장',
  overrunNote: '권장 시간을 넘겼습니다',
  lastSetNote: '마지막 세트',
  lastExerciseNote: '마지막 운동',
  pausedNote: '멈춰 있습니다',
  positionLabel: '번째',
  positionOf: '중',
  endConfirmTitle: '운동을 끝낼까요',
  endConfirm: '지금 운동을 끝냅니다. 남은 세트는 미완료로 남습니다.',
  confirmYes: '끝내기',
  confirmNo: '계속하기',

  // --- 종료 요약 화면 (01_spec.md 2.3) ---
  summaryComplete: '계획한 운동을 모두 마쳤습니다',
  summaryPartial: '일부만 마쳤습니다',
  doneLabel: '수행',
  totalTimeLabel: '총 운동시간',
  closeAction: '닫기',

  // --- 단위 ---
  unitSets: '세트',
  unitReps: '회',
  unitMinutes: '분',
  unitSeconds: '초',
  unitCount: '개',
  unitMonth: '월',
  unitDay: '일',
});
