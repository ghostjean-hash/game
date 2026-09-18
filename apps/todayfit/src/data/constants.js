// 02_data.md 수치의 코드 실체. 값을 바꿀 때는 그 문서를 먼저 고친다(04_conventions.md 2.3).

// --- 1. 앱 설정 기본값 (02_data.md 1장) ---------------------------------------
export const DEFAULT_SETTINGS = Object.freeze({
  prepSeconds: 5,
  workSeconds: 45,
  restSeconds: 60,
  transitionSeconds: 30,
  voiceOn: true,
  beepOn: true,
});

// 입력 허용 범위 (02_data.md 1.3). 범위 밖 값은 저장하지 않는다.
export const LIMITS = Object.freeze({
  prepSeconds: Object.freeze({ min: 0, max: 60 }),
  workSeconds: Object.freeze({ min: 5, max: 600 }),
  restSeconds: Object.freeze({ min: 5, max: 600 }),
  transitionSeconds: Object.freeze({ min: 0, max: 600 }),
  sets: Object.freeze({ min: 1, max: 20 }),
  reps: Object.freeze({ min: 1, max: 200 }),
});

// --- 2. 실행 판정 값 (02_data.md 2장) -----------------------------------------
export const LONG_PRESS_MS = 600;
export const UNDO_WINDOW_SECONDS = 3;
export const COUNTDOWN_FROM = 3;
export const OVERRUN_NOTICE_SECONDS = 30;
export const TICK_MS = 250;

// 세상이 정한 환산값 (02_data.md 2.0). 코드 어디에도 숫자를 적지 않으려고 여기 둔다.
export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const DAYS_IN_WEEK = 7;

// 관리 화면이 쓰는 값 (02_data.md 2.0.1)
export const NAME_MAX_LENGTH = 20;

// 새 운동 템플릿의 처음 값 (02_data.md 2.0.2).
// 시간 둘은 비운 채로 시작한다 - 그래야 앱 기본값을 따라간다(01_spec.md 3.5)
export const NEW_EXERCISE = Object.freeze({
  sets: 3,
  reps: 10,
  workSeconds: null,
  restSeconds: null,
});

// --- 3. 코드값 (02_data.md 3장) -----------------------------------------------
export const PHASE = Object.freeze({
  PREP: 'prep',
  WORK: 'work',
  REST: 'rest',
  TRANSITION: 'transition',
});

// 시간이 지나면 스스로 다음 구간으로 가는 구간들.
// work 가 여기 없는 것이 이 앱의 핵심 규칙이다(01_spec.md 4.1.2).
export const AUTO_PHASES = Object.freeze([PHASE.PREP, PHASE.REST, PHASE.TRANSITION]);

export const DAY_STATUS = Object.freeze({
  NONE: 'none',
  PLANNED: 'planned',
  PARTIAL: 'partial',
  COMPLETE: 'complete',
  MISSED: 'missed',
});

export const EXERCISE_RESULT = Object.freeze({
  COMPLETE: 'complete',
  INCOMPLETE: 'incomplete',
  SKIPPED: 'skipped',
});

// 소리로 알릴 거리들. 화면과 소리가 같은 이름을 쓴다.
export const CUE = Object.freeze({
  PREP_START: 'prepStart',
  SET_START: 'setStart',
  LAST_SET_START: 'lastSetStart',
  OVERRUN: 'overrun',
  OVERRUN_AGAIN: 'overrunAgain',
  SET_DONE: 'setDone',
  REST_START: 'restStart',
  TRANSITION_START: 'transitionStart',
  COUNTDOWN: 'countdown',
  SKIP: 'skip',
  FINISH: 'finish',
});

// --- 4. 주와 달의 경계 (02_data.md 3.5 / 4장) ---------------------------------
// 월요일 1 .. 일요일 7. 주는 월요일에 시작한다.
export const WEEK_START = 1;

// --- 5. 저장 (02_data.md 5장) -------------------------------------------------
export const STORAGE_NAMESPACE = 'todayfit';
export const SCHEMA_VERSION = 1;

export const STORAGE_KEYS = Object.freeze({
  SCHEMA: 'schema',
  SETTINGS: 'settings',
  EXERCISES: 'exercises',
  ROUTINES: 'routines',
  WEEKLY: 'weekly',
  PLANS: 'plans',
  SESSIONS: 'sessions',
  ACTIVE: 'active',
});

// --- 6. 소리 (02_data.md 6장) -------------------------------------------------
export const SOUND = Object.freeze({
  beepHz: 880,
  beepMs: 120,
  beepLongMs: 500,
  beepGain: 0.2,
  voiceLang: 'ko-KR',
  voiceRate: 1.0,
});
