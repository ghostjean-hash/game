// docs/02_data.md 1장 수치 상수 export.
// 매직 넘버 0개 원칙: 코드는 본 파일 import만.

// 1.1. 6/45 룰
export const NUMBER_MIN = 1;
export const NUMBER_MAX = 45;
export const PICK_COUNT = 6;
export const BONUS_COUNT = 1;

// 1.2. Luck 스탯
export const LUCK_MIN = 0;
export const LUCK_MAX = 100;
export const LUCK_INITIAL = 10;
export const LUCK_BONUS_HIT = 5;
export const LUCK_BONUS_DAILY = 1;

// 1.3. 통계 윈도우
export const RECENT_SHORT = 10;
export const RECENT_MID = 30;
export const RECENT_LONG = 100;

// 1.4. 비율 필터
export const SUM_RANGE_MIN = 121;
export const SUM_RANGE_MAX = 160;
export const AC_VALUE_MIN = 6;
export const AC_VALUE_MAX = 10;
export const ODD_EVEN_PREFERRED = Object.freeze([3, 3]);

// 1.5. 추첨 전략 ID (캐릭터 속성이 아니라 추첨 시 사용자가 선택하는 가중치 정책)
export const STRATEGY_BLESSED = 'blessed';
export const STRATEGY_STATISTICIAN = 'statistician';
export const STRATEGY_SECOND_STAR = 'secondStar';
export const STRATEGY_REGRESSIONIST = 'regressionist';
export const STRATEGY_PAIR_TRACKER = 'pairTracker';
export const STRATEGY_ASTROLOGER = 'astrologer';
export const STRATEGY_TREND_FOLLOWER = 'trendFollower';
export const STRATEGY_INTUITIVE = 'intuitive';
export const STRATEGY_BALANCER = 'balancer';
export const STRATEGY_MBTI = 'mbti';
export const STRATEGY_ZODIAC_ELEMENT = 'zodiacElement';
export const STRATEGY_DEFAULT = STRATEGY_BLESSED;

// 1.6. 운세 등급 ID
export const FORTUNE_GREAT = 'great';
export const FORTUNE_GOOD = 'good';
export const FORTUNE_NEUTRAL = 'neutral';
export const FORTUNE_BAD = 'bad';

// 1.7. 추첨 가중치 한계
export const WEIGHT_MIN_FLOOR = 0.0001;
export const WEIGHT_MAX_BIAS = 50.0;

// 1.16. 백캐스트 (Luck 성장 부트스트랩)
// SSOT: docs/02_data.md 1.16, docs/01_spec.md 7.5.
// 캐릭터 첫 추첨 탭 진입 시 최근 N회에 대해 결정론적 추천 + 매칭을 history에 백필.
// 다음 추첨 회차(미래)는 발표 전이라 매칭 불가 → 과거 회차로 luck 부트스트랩.
export const BACKFILL_RECENT_COUNT = 30;

// 1.15. 추첨 일정 (한국 동행복권 6/45)
// SSOT: docs/02_data.md 1.15.
// 카운트다운 기준 시각은 동행복권 사이트와 동일하게 "판매 마감 시각" = 토 20:00 KST.
// 실제 추첨 방송은 20:35지만, 사이트의 카운트다운은 20:00에 0이 된다.
// (DRAW_*는 호환을 위해 이름 유지. 의미는 "카운트다운 타깃 시각".)
export const DRAW_DAY_OF_WEEK = 6;     // 토요일 (Date.getDay 기준 일=0..토=6)
export const DRAW_HOUR_KST = 20;       // 판매 마감 / 카운트다운 타깃 시
export const DRAW_MIN_KST = 0;         // 판매 마감 / 카운트다운 타깃 분
export const DRAW_TZ_OFFSET_MIN = 9 * 60; // KST = UTC+9 (분 단위)
export const COUNTDOWN_TICK_MS = 1000;

// 1.11. 별자리별 행운 번호 (점성술사 전략용. 임의 매핑, 추첨 확률에는 영향 없음)
export const ZODIAC_LUCKY = Object.freeze({
  aries:       [3, 9, 21, 27, 33, 39, 45],
  taurus:      [2, 6, 8, 14, 26, 32, 44],
  gemini:      [5, 11, 17, 23, 29, 35, 41],
  cancer:      [4, 7, 16, 22, 25, 34, 43],
  leo:         [1, 10, 19, 28, 37, 40, 42],
  virgo:       [6, 13, 15, 24, 30, 36, 42],
  libra:       [2, 8, 12, 18, 30, 36, 40],
  scorpio:     [4, 13, 22, 31, 38, 40, 44],
  sagittarius: [3, 9, 18, 24, 27, 33, 39],
  capricorn:   [5, 14, 20, 26, 32, 37, 41],
  aquarius:    [11, 17, 23, 25, 29, 35, 38],
  pisces:      [4, 12, 16, 20, 31, 33, 45],
});

// 1.13. MBTI 16종 + 행운 번호 (MBTI 전략용. 임의 매핑, 추첨 확률 영향 없음)
export const MBTI_TYPES = Object.freeze([
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]);

export const MBTI_LUCKY = Object.freeze({
  INTJ: [3, 11, 17, 24, 32, 38, 44],
  INTP: [4, 9, 16, 23, 29, 35, 41],
  ENTJ: [1, 8, 15, 22, 29, 36, 43],
  ENTP: [2, 7, 13, 21, 27, 33, 39],
  INFJ: [5, 12, 19, 26, 33, 40, 45],
  INFP: [6, 14, 20, 28, 31, 37, 42],
  ENFJ: [3, 10, 18, 25, 31, 38, 44],
  ENFP: [7, 13, 19, 27, 34, 40, 45],
  ISTJ: [4, 11, 17, 24, 30, 36, 41],
  ISFJ: [2, 9, 15, 22, 28, 35, 42],
  ESTJ: [1, 8, 14, 21, 27, 34, 40],
  ESFJ: [6, 13, 20, 26, 32, 38, 45],
  ISTP: [5, 12, 18, 25, 31, 37, 43],
  ISFP: [3, 10, 16, 23, 29, 36, 42],
  ESTP: [7, 14, 21, 28, 35, 41, 44],
  ESFP: [4, 11, 17, 24, 30, 37, 43],
});

// 1.14. 별자리 4원소 분류 + 원소별 행운 번호 (별자리 원소 전략용)
export const ZODIAC_ELEMENTS = Object.freeze({
  fire:  ['aries', 'leo', 'sagittarius'],
  earth: ['taurus', 'virgo', 'capricorn'],
  air:   ['gemini', 'libra', 'aquarius'],
  water: ['cancer', 'scorpio', 'pisces'],
});

export const ZODIAC_ELEMENT_LUCKY = Object.freeze({
  fire:  [1, 9, 19, 27, 33, 41, 45],
  earth: [2, 6, 14, 22, 28, 36, 44],
  air:   [5, 11, 17, 23, 29, 35, 39],
  water: [4, 12, 16, 22, 30, 38, 43],
});

// 1.10. 12간지 (M5)
export const ANIMAL_SIGNS = Object.freeze([
  { id: 'rat', label: '쥐' },
  { id: 'ox', label: '소' },
  { id: 'tiger', label: '호랑이' },
  { id: 'rabbit', label: '토끼' },
  { id: 'dragon', label: '용' },
  { id: 'snake', label: '뱀' },
  { id: 'horse', label: '말' },
  { id: 'goat', label: '양' },
  { id: 'monkey', label: '원숭이' },
  { id: 'rooster', label: '닭' },
  { id: 'dog', label: '개' },
  { id: 'pig', label: '돼지' },
]);
