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

  // --- 오늘 화면 (01_spec.md 2.7) ---
  todayNoPlan: '오늘 예정된 운동 없음',
  noPlanHint: '요일 규칙에서 운동하는 요일을 정하면 그 달의 계획이 만들어집니다',
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
  unitDays: '일',

  // --- 관리 화면 공통 (05_manage-screens.md 4장) ---
  backAction: '뒤로',
  deleteAction: '삭제',
  duplicateAction: '복제',
  moveUpAction: '위로',
  markChevron: '›',
  markPrevMonth: '‹',
  markUp: '↑',
  markDown: '↓',
  moveDownAction: '아래로',
  cancelAction: '그만두기',
  okAction: '확인',

  // 입력 오류 (02_data.md 1.3)
  errNameBlank: '이름을 넣어 주세요',
  errNumber: '숫자로 넣어 주세요',
  errNumberBlank: '값을 넣어 주세요',

  // --- 설정 S-03 ---
  settingsHeading: '설정',
  settingsFirstHint: '운동 템플릿부터 만들면 됩니다. 운동을 만들고 루틴으로 묶은 뒤 요일에 걸면 달력에서 한 달 계획이 만들어집니다',
  navExercises: '운동 템플릿',
  navRoutines: '루틴',
  navWeekly: '요일 규칙',
  navPrefs: '기본값과 소리',
  weeklyNoneNote: '쓰는 요일 없음',

  // --- 운동 템플릿 목록 S-09 ---
  exerciseListHeading: '운동 템플릿',
  exerciseAddAction: '새 운동',
  exerciseEmpty: '등록한 운동이 없습니다. 새 운동을 눌러 만들어 주세요',
  usedByNone: '쓰는 루틴 없음',
  exerciseDeleteTitle: '이 운동을 지울까요',

  // --- 운동 템플릿 편집 S-10 ---
  exerciseEditHeading: '운동 편집',
  exerciseNewHeading: '새 운동',
  fieldExerciseName: '운동명',
  fieldExerciseNamePlaceholder: '예 - 덤벨 컬',
  fieldSets: '기본 세트 수',
  fieldReps: '기본 반복 횟수',
  fieldWorkSeconds: '기본 권장 수행시간',
  fieldRestSeconds: '기본 휴식시간',
  exerciseEditFoot: '고친 값은 이 운동을 쓰는 루틴에 바로 반영됩니다. 이미 만든 날짜별 계획은 그대로입니다',
  newExerciseNote: '이름을 넣지 않고 나가면 만들지 않습니다',

  // --- 루틴 목록 S-07 ---
  routineListHeading: '루틴',
  routineAddAction: '새 루틴',
  routineEmpty: '등록한 루틴이 없습니다. 새 루틴을 눌러 만들어 주세요',
  routineNewName: '새 루틴',
  copySuffix: ' 사본',
  notLinked: '걸린 요일 없음',
  routineDeleteTitle: '이 루틴을 지울까요',
  routineNeedExercise: '운동 템플릿을 먼저 만들어야 루틴에 담을 수 있습니다',
  planNeedExercise: '운동 템플릿을 먼저 만들어야 이 날짜에 담을 수 있습니다',

  // --- 루틴 편집 S-08 ---
  routineEditHeading: '루틴 편집',
  fieldRoutineName: '루틴 이름',
  fieldRoutineNamePlaceholder: '예 - 상체',
  routineItemsHeading: '운동 구성',
  routineItemsEmpty: '담은 운동이 없습니다. 운동 추가를 눌러 담아 주세요',
  addExerciseAction: '운동 추가',
  pickExerciseTitle: '어떤 운동을 담을까요',
  goMakeExercise: '운동 템플릿 만들러 가기',
  overrideHeading: '이 루틴에서만 쓸 값',
  overriddenMark: '루틴 지정값 있음',
  sourceRoutine: '이 루틴에서 지정',
  sourceExercise: '운동 기본값',
  sourceSettings: '앱 기본값',
  openItemAction: '값 고치기',
  closeItemAction: '접기',

  // --- 요일 규칙 S-06 ---
  weeklyHeading: '요일 규칙',
  weeklyRoutine: '루틴',
  weeklyNoRoutine: '루틴 없음',
  weeklyNeedRoutine: '루틴을 골라야 이 요일 계획이 만들어집니다',
  weeklyEmptyRoutine: '걸린 루틴에 담은 운동이 없어 이 요일 계획이 만들어지지 않습니다',
  weeklyFoot: '여기서 바꾼 것은 다음에 만드는 달 계획부터 적용됩니다. 이미 만든 계획은 그대로입니다',
  weeklyNoRoutines: '등록한 루틴이 없습니다',
  goMakeRoutine: '루틴 만들러 가기',

  // --- 달력 S-02 ---
  calendarHeading: '달력',
  prevMonthAction: '이전 달',
  nextMonthAction: '다음 달',
  makePlanAction: '이 달 계획 만들기',
  planCountLabel: '계획',
  alreadyPlanned: '이미 있는 날짜는 그대로 둡니다. 그 날짜를 고칠 일은 날짜를 눌러 계획 수정으로 해 주세요',
  previewTitle: '이대로 만들까요',
  previewConfirm: '만들기',
  previewNothing: '만들 계획이 없습니다',
  previewWhyNoWeekday: '요일 규칙에서 쓰는 요일을 켜 주세요',
  previewWhyNoRoutine: '켠 요일에 루틴이 걸려 있지 않습니다',
  previewWhyEmptyRoutine: '걸린 루틴에 담은 운동이 없습니다',
  previewWhyAllMade: '이 달의 계획일은 이미 다 만들어져 있습니다',
  weekRateLabel: '이번 주 달성률',
  weekProgressLabel: '이번 주 진행',
  monthRateLabel: '이번 달 달성률',
  monthProgressLabel: '이번 달 진행',
  monthPartialLabel: '부분 완료',
  rateNone: '해당 없음',
  runningMark: '진행 중',

  // --- 날짜 상세 S-04 ---
  dayNoPlan: '이 날짜에는 계획이 없습니다',
  planAddAction: '운동 계획 추가',
  editPlanAction: '계획 수정',
  lockedPast: '지난 날짜는 고칠 수 없습니다',
  lockedDone: '운동한 날짜는 고칠 수 없습니다',
  lockedRunning: '지금 운동 중인 날짜라 고칠 수 없습니다',
  startedAtLabel: '시작',
  endedAtLabel: '종료',
  missedNote: '이 날은 운동하지 않았습니다',

  // --- 날짜별 계획 수정 S-05 ---
  planEditHeading: '계획 수정',
  planNewHeading: '계획 만들기',
  fieldPlanTime: '예정 시간',
  fromRoutineAction: '루틴에서 불러오기',
  fromRoutineTitle: '어떤 루틴을 불러올까요',
  fromRoutineConfirmTitle: '지금 목록을 바꿀까요',
  fromRoutineConfirmBody: '지금 담긴 운동이 사라지고 고른 루틴의 내용으로 바뀝니다',
  fromRoutineEmptyTitle: '그 루틴에는 담은 운동이 없습니다',
  fromRoutineEmptyBody: '불러올 것이 없어 지금 목록을 그대로 두었습니다. 루틴에 운동을 먼저 담아 주세요.',
  deletePlanAction: '이 날짜 계획 삭제',
  planDeleteTitle: '이 날짜 계획을 지울까요',
  planDeleteBody: '이 날짜는 계획 없는 날이 됩니다. 미실시로도 세지 않습니다',
  lastExerciseDeleteTitle: '이 날짜 계획을 지울까요',
  lastExerciseDeleteBody: '마지막 운동입니다. 이 운동을 빼면 이 날짜 계획이 사라집니다',
  planEmptyNote: '담은 운동이 없습니다. 운동을 담아야 이 날짜 계획이 만들어집니다',
  planDraftNote: '운동을 담기 전에는 이 시간이 저장되지 않습니다',
  fieldWork: '권장 수행시간',
  fieldRest: '휴식시간',
  fieldItemSets: '세트 수',
  fieldItemReps: '반복 횟수',

  // --- 기본값과 소리 S-11 ---
  prefsHeading: '기본값과 소리',
  prefsPlanGroup: '새로 만드는 계획에 쓰는 값',
  prefsPlanNote: '여기서 바꾼 것은 다음에 만드는 달 계획부터 적용됩니다. 이미 만든 계획은 그대로입니다',
  prefsRunGroup: '운동할 때 쓰는 값',
  prefsRunNote: '여기서 바꾼 것은 다음 운동부터 바로 적용됩니다',
  fieldPrepSeconds: '시작 전 준비시간',
  fieldTransitionSeconds: '운동 간 전환시간',
  fieldDefaultWork: '세트당 권장 수행시간',
  fieldDefaultRest: '세트 간 휴식시간',
  fieldVoice: '음성 안내',
  fieldBeep: '비프음',
  voiceUnavailable: '이 기기에 한국어 음성이 없어 소리가 나지 않습니다',
});

/** 수를 받아 문장을 만드는 글자. 자리 수가 바뀌면 조사도 바뀌므로 함수로 둔다. */
export const SAY = Object.freeze({
  countItems: (n) => `${n}${TEXT.unitCount}`,
  usedByRoutines: (n) => `루틴 ${n}${TEXT.unitCount}`,
  planDays: (n) => `${n}${TEXT.unitDays}`,
  dayLine: (time, routineName, count) => [time, routineName, SAY.countItems(count)]
    .filter(Boolean).join(' · '),
  makeDays: (n) => `${n}${TEXT.unitDays}을 만듭니다`,
  errNameLong: (max) => `${max}자까지 넣을 수 있습니다`,
  errRange: (min, max) => `${min}에서 ${max} 사이로 넣어 주세요`,
  blankUsesAppDefault: (n) => `비우면 앱 기본값 ${n}${TEXT.unitSeconds}`,
  deleteExerciseBody: (name, n) => (n > 0
    ? `${name}을(를) 지웁니다. 이 운동을 담은 루틴 ${n}${TEXT.unitCount}에서도 함께 빠집니다.`
    : `${name}을(를) 지웁니다.`),
  deleteRoutineBody: (name, weekdayText) => (weekdayText
    ? `${name}을(를) 지웁니다. ${weekdayText}에 걸린 연결도 함께 풀립니다.`
    : `${name}을(를) 지웁니다.`),
  setsAndReps: (sets, reps) => `${sets}${TEXT.unitSets} · ${reps}${TEXT.unitReps}`,
  progressOf: (done, total) => `${done} / ${total}`,
  percent: (n) => `${n}%`,
  yearMonth: (year, month) => `${year}. ${month}${TEXT.unitMonth}`,
  // 루틴 항목 한 줄. 세트·횟수 뒤에 실제로 쓰일 시간 둘을 붙여 사다리를 탄 결과를 보인다
  itemSpec: (v) => `${v.sets}${TEXT.unitSets} · ${v.reps}${TEXT.unitReps} · `
    + `${v.workSeconds}${TEXT.unitSeconds} / ${v.restSeconds}${TEXT.unitSeconds}`,
});
