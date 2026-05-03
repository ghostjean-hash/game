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
export const STRATEGY_ZODIAC_ELEMENT = 'zodiacElement';
export const STRATEGY_FIVE_ELEMENTS = 'fiveElements';
export const STRATEGY_DEFAULT = STRATEGY_BLESSED;

// 1.5.3. 전략 카테고리 ID (다중 전략 모드 출처 라벨 dot 색용. SSOT: docs/02_data.md 1.5.2).
// S10(2026-05-02): fiveElements 'saju' → 'mapping' 통합. 운세 단일 카테고리.
export const STRATEGY_CATEGORIES = Object.freeze({
  blessed: 'random', statistician: 'stats', secondStar: 'stats', regressionist: 'stats',
  pairTracker: 'stats', astrologer: 'mapping', trendFollower: 'stats', intuitive: 'random',
  balancer: 'random', zodiacElement: 'mapping', fiveElements: 'mapping',
});

// 다중 전략 모드 최대 선택 수 (분배 1+1+1+1+1+1 = 6).
export const MULTI_STRATEGY_MAX = 6;

// S18 (2026-05-02): 통계계 5전략의 풀 크기. 상위 N등 풀에서 균등 추첨.
// "어정쩡한 weight 비례 PRNG" 회피.
// SSOT: docs/02_data.md 1.5.6.
export const STATS_POOL_SIZE = 10;

// 1.5.5. 5세트 동시 추천 (S4-T1, 2026-05-02 신설). SSOT: docs/02_data.md 1.5.5.
// "한 회차의 다양한 시도"를 5장 카드로 한 번에 노출. 사행성 톤 회피 (구매 권유 X, 확률 변화 X).
// 시드 변형: setIndex i (0~4)에 대해 mixSeeds(baseSeed, FIVE_SETS_SALT_BASE + i) (i=0은 base 그대로).
export const FIVE_SETS_COUNT = 5;
export const FIVE_SETS_SALT_BASE = 0x5E7A;

// 1.5.1. 객관 전략 (캐릭터 시드 / Luck 무관. 회차 데이터로만 결정).
// 같은 회차에서 모든 캐릭터가 같은 결과를 받음. SSOT: docs/02_data.md 1.5.
export const OBJECTIVE_STRATEGIES = Object.freeze(new Set([
  STRATEGY_STATISTICIAN,
  STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST,
  STRATEGY_TREND_FOLLOWER,
  STRATEGY_BALANCER,
]));

// 객관 전략용 PRNG salt. drwNo와 mix해 회차별 분포를 분산하되 캐릭터 무관 보장.
export const OBJECTIVE_SEED_SALT = 0xCAFEBABE;

// 1.6. 운세 등급 ID
export const FORTUNE_GREAT = 'great';
export const FORTUNE_GOOD = 'good';
export const FORTUNE_NEUTRAL = 'neutral';
export const FORTUNE_BAD = 'bad';

// 1.7. 추첨 가중치 한계 + 통계 효과 증폭
// SSOT: docs/02_data.md 1.7.
export const WEIGHT_MIN_FLOOR = 0.0001;
export const WEIGHT_MAX_BIAS = 50.0;
// 누적 빈도 weight 증폭 지수. 1221회 실측 ±19% 편차 (133~182)로 거의 균등 인상 → 분포 차이 증폭.
// statistician / secondStar에 적용. trendFollower는 raw 유지 (recent30 ratio 9배로 이미 두드러짐).
// 실측 효과: weight ratio 1.368 → 1.601, 10000회 추출 빈도 ratio 1.587. SSOT: docs/02_data.md 1.7.2.
export const STATS_POWER = 1.5;
// 미출현 갭 weight 증폭 지수. gap은 이미 편차 큼 → 약한 증폭. regressionist에 적용.
// 실측: gap ratio 19 → 46 (2.42배). SSOT: docs/02_data.md 1.7.3.
export const GAP_POWER = 1.3;

// 1.19. 행운 의식 (T4, 2026-05-02 신설)
// SSOT: docs/02_data.md 1.19, docs/01_spec.md 5.6.
// 해석 B: 정성 / 콘텐츠 게이지. 추첨 확률 영향 없음. 만땅 시 Luck +5 보너스만.
// 회차 변경 시 게이지 + 행위 쿨다운 모두 리셋.
export const RITUAL_GAUGE_MAX = 100;
export const RITUAL_GAIN_PER_ACTION = 12.5;  // 8 행위 × 12.5 = 100
export const LUCK_BONUS_RITUAL = 5;          // 만땅 1회 Luck 보너스

// 행위 8종. 라벨에 "확률" / "필승" 단어 0건. 종교 / IP 회피 톤.
export const RITUAL_LIST = Object.freeze([
  { id: 'meditate',   label: '명상하기',     desc: '마음을 가라앉히고 호흡을 정돈한다',          short: '명' },
  { id: 'training',   label: '수련하기',     desc: '108배 동작으로 몸과 정신을 단련한다',        short: '수' },
  { id: 'water',      label: '정화수 의식',  desc: '새벽 정화수를 떠놓고 정성을 기울인다',       short: '정' },
  { id: 'qi',         label: '기 모으기',    desc: '하늘의 기를 두 손에 모은다',                short: '기' },
  { id: 'ancestor',   label: '가문 의식',    desc: '가문의 인연에 감사를 전한다',               short: '가' },
  { id: 'talisman',   label: '부적 그리기',  desc: '한 획 한 획 정성껏 부적을 완성한다',         short: '부' },
  { id: 'coin',       label: '행운 동전',    desc: '동전 한 닢을 던져 길흉을 점친다',           short: '동' },
  { id: 'starlight',  label: '별빛 의식',    desc: '밤하늘의 별 운행에 마음을 맞춘다',          short: '별' },
]);

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

// 1.17. draws 캐시 비어있을 때 fallback 회차 번호.
// SSOT: docs/02_data.md 1.17.
// 페치 후엔 자동으로 latest + 1로 덮어써짐. 이 값은 "데이터가 전혀 없는 첫 진입" 한정.
// PROGRESS.md 5.0의 시점 결정값 (2026-05-02 = 1222회).
// spec 시점이 크게 변경되면 본 값을 갱신하거나, draws.json을 페치해 자연스럽게 무력화.
export const DEFAULT_DRWNO_FALLBACK = 1222;

// 1.11. 별자리별 행운 번호 (S15, 2026-05-02 학설 기반 재작성).
// 출처: 점성술 numerology 전통 - 각 별자리별 (Sun Sign Number + Ruler Planet Number) 합집합 + 끝자리 동일 1~45 확장.
//   Sun Sign Number = 12궁 순서 (Aries=1 ... Pisces=12, 12는 3으로 reduce).
//   Ruler Planet Number = Sephariel / Cheiro 등 numerological astrology 행성 매핑:
//     Sun=1, Moon=2, Jupiter=3, Uranus=4, Mercury=5, Venus=6, Neptune=7, Saturn=8, Mars=9.
//   전통 통치자(traditional ruler) 채택 - 현대 통치자(Pluto/Uranus/Neptune) 대신.
// SSOT: docs/02_data.md 1.11. 학설 자체는 과학 검증 없음, 추첨 결과 보장 없음 (면책 강제).
export const ZODIAC_LUCKY = Object.freeze({
  aries:       [1, 9, 11, 19, 21, 29, 31, 39, 41],          // Sun#1 + Ruler Mars#9
  taurus:      [2, 6, 12, 16, 22, 26, 32, 36, 42],          // Sun#2 + Ruler Venus#6
  gemini:      [3, 5, 13, 15, 23, 25, 33, 35, 43, 45],      // Sun#3 + Ruler Mercury#5
  cancer:      [2, 4, 12, 14, 22, 24, 32, 34, 42, 44],      // Sun#4 + Ruler Moon#2
  leo:         [1, 5, 11, 15, 21, 25, 31, 35, 41, 45],      // Sun#5 + Ruler Sun#1
  virgo:       [5, 6, 15, 16, 25, 26, 35, 36, 45],          // Sun#6 + Ruler Mercury#5
  libra:       [6, 7, 16, 17, 26, 27, 36, 37],              // Sun#7 + Ruler Venus#6
  scorpio:     [8, 9, 18, 19, 28, 29, 38, 39],              // Sun#8 + Ruler Mars#9 (전통)
  sagittarius: [3, 9, 13, 19, 23, 29, 33, 39, 43],          // Sun#9 + Ruler Jupiter#3
  capricorn:   [8, 10, 18, 20, 28, 30, 38, 40],             // Sun#10 + Ruler Saturn#8
  aquarius:    [1, 4, 11, 14, 21, 24, 31, 34, 41, 44],      // Sun#11→1 + Ruler Saturn#8 전통/Uranus#4 현대 → 4 채택
  pisces:      [2, 3, 12, 13, 22, 23, 32, 33, 42, 43],      // Sun#12→3 + Ruler Jupiter#3 전통 → 3 / 보조 Moon#2
});

// 1.14. 별자리 4원소 분류 + 원소별 행운 번호 (S15, 2026-05-02 학설 기반).
// 출처: 점성술 4원소 - 각 원소에 속한 3별자리의 Ruler Number 합집합 + 끝자리 동일 1~45 확장.
//   불(Aries/Leo/Sag) Ruler = Mars#9 + Sun#1 + Jupiter#3 → 1, 3, 9
//   땅(Taurus/Virgo/Cap) Ruler = Venus#6 + Mercury#5 + Saturn#8 → 5, 6, 8
//   공기(Gemini/Libra/Aqu) Ruler = Mercury#5 + Venus#6 + Uranus#4(현대)/Saturn#8(전통) → 4, 5, 6
//   물(Cancer/Sco/Pisces) Ruler = Moon#2 + Mars#9 전통 + Jupiter#3 전통 → 2, 3, 9
// SSOT: docs/02_data.md 1.14.
export const ZODIAC_ELEMENTS = Object.freeze({
  fire:  ['aries', 'leo', 'sagittarius'],
  earth: ['taurus', 'virgo', 'capricorn'],
  air:   ['gemini', 'libra', 'aquarius'],
  water: ['cancer', 'scorpio', 'pisces'],
});

export const ZODIAC_ELEMENT_LUCKY = Object.freeze({
  fire:  [1, 3, 9, 11, 13, 19, 21, 23, 29, 31, 33, 39, 41, 43],         // 1 / 3 / 9
  earth: [5, 6, 8, 15, 16, 18, 25, 26, 28, 35, 36, 38, 45],             // 5 / 6 / 8
  air:   [4, 5, 6, 14, 15, 16, 24, 25, 26, 34, 35, 36, 44, 45],         // 4 / 5 / 6
  water: [2, 3, 9, 12, 13, 19, 22, 23, 29, 32, 33, 39, 42, 43],         // 2 / 3 / 9
});

// 1.18. 천간 오행 5원소 + 행운 번호 (S15, 2026-05-02 河圖數 학설 기반).
// 출처: 河圖 (易經 / 河圖洛書, BC 약 2000년, public domain).
//   "天一生水, 地六成之" → 水 = 1, 6
//   "地二生火, 天七成之" → 火 = 2, 7
//   "天三生木, 地八成之" → 木 = 3, 8
//   "地四生金, 天九成之" → 金 = 4, 9
//   "天五生土, 地十成之" → 土 = 5, 10
// 1~45 확장: 끝자리 동일 (河圖數의 "끝자리 = 오행" 자연 해석). 5×9=45 균등 분포.
// SSOT: docs/02_data.md 1.18.
export const FIVE_ELEMENTS_LUCKY = Object.freeze({
  water: [1, 6, 11, 16, 21, 26, 31, 36, 41],   // 河圖 1, 6
  fire:  [2, 7, 12, 17, 22, 27, 32, 37, 42],   // 河圖 2, 7
  wood:  [3, 8, 13, 18, 23, 28, 33, 38, 43],   // 河圖 3, 8
  metal: [4, 9, 14, 19, 24, 29, 34, 39, 44],   // 河圖 4, 9
  earth: [5, 10, 15, 20, 25, 30, 35, 40, 45],  // 河圖 5, 10
});

// 1.18.7. 사주 행운 추첨일 일진 보너스 (S16, 2026-05-02 일진 강화).
// 캐릭터 출생 일주 오행 × 추첨일 일주 오행의 통변성 관계별 추가 boost.
// 출처: 명리학 통변성(通變星) - BC 음양가, 한대 정착.
//   self        (비견): 같은 오행 → 균형 / 자기 강화
//   generate    (식상): 캐릭터가 회차를 생함 → 표현 / 행동
//   beGenerated (인성): 회차가 캐릭터를 생함 → 도움 받음 (가장 유리)
//   overcome    (재성): 캐릭터가 회차를 극함 → 재물 추구
//   beOvercome  (관성): 회차가 캐릭터를 극함 → 압박 / 의무 (보너스 없음)
//   normal     : 무관계 (실제로는 발생 안 함, 안전 fallback)
// 본 boost는 추첨일 일주 오행의 河圖 lucky 9개에 추가 적용 (출생 일주 lucky × 5와 별도).
export const SAJU_RELATION_BOOST = Object.freeze({
  self: 1.5,         // 비견
  generate: 2.0,     // 식상
  beGenerated: 3.0,  // 인성 (가장 유리)
  overcome: 1.5,     // 재성
  beOvercome: 1.0,   // 관성 (페널티 없음, 무영향)
  normal: 1.0,
});

// 천간(stem) → 오행 매핑. SSOT: docs/02_data.md 1.12.1.
// (saju.js의 STEM_TO_ELEMENT와 동일하지만 data 레이어에서도 직접 참조 가능하도록 export.)
export const STEM_TO_ELEMENT = Object.freeze({
  gap: 'wood', eul: 'wood',
  byeong: 'fire', jeong: 'fire',
  mu: 'earth', gi: 'earth',
  gyeong: 'metal', sin: 'metal',
  im: 'water', gye: 'water',
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
