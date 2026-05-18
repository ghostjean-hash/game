// docs/02_data.md 1장 수치 상수 export.
// 매직 넘버 0개 원칙: 코드는 본 파일 import만.

// 1.1. 6/45 룰
export const NUMBER_MIN = 1;
export const NUMBER_MAX = 45;
export const PICK_COUNT = 6;
export const BONUS_COUNT = 1;

// 1.2. ~~Luck 스탯~~ (S089, 2026-05-17 전면 폐기)
// 사용자 명시 "Luck을 게임요소로 추가하고 싶은 생각 없음" + 낮은 점수 부정적 인상 유발.
// 폐기 상수: LUCK_MIN / LUCK_MAX / LUCK_INITIAL / LUCK_BONUS_HIT / LUCK_BONUS_DAILY / LUCK_BONUS_RITUAL.

// 1.3. 통계 윈도우
export const RECENT_SHORT = 10;
export const RECENT_MID = 30;
export const RECENT_LONG = 100;

// 1.3.1. 통계 카테고리 라벨 매핑 top K (S72/S73, 2026-05-16).
//   assignSourceForNumber가 통계 전략(trendFollower/statistician/regressionist/secondStar)의
//   "어떤 번호가 통계 매칭인지" 시각 라벨 부여 시 사용. 추첨 영향 0.
//   K=10 = 한국 hot/cold 통상 표시 단위. 6번호 추첨이라 평균 1~2개 라벨링.
export const STAT_LABEL_TOP_K = 10;

// 1.3.2. 출처 표시 모드 (S79, 2026-05-17).
//   추천 번호공 아래 출처 라벨 표시 방식. 사용자가 설정에서 선택.
//   'dot' = 색점만 (작은 원, 한글 없음. 다중 매칭 시 점 N개 나란히). 간결.
//   'label' = 한글 머리글자 (옛 동작. 다중 매칭 시 "별사" 같이 다글자).
//   'off' = 출처 표시 안 함 (S088 후속, 2026-05-17 사용자 명시 "색점을 표시하지 않는 설정 옵션"). 번호공만 노출.
//   기본값 = 'dot' (사용자 명시 "훨씬 간결").
//   프리셋 슬롯의 strategyLabel 앞 색점은 본 설정 무관 = 항상 표시.
export const SOURCE_DISPLAY_DOT = 'dot';
export const SOURCE_DISPLAY_LABEL = 'label';
export const SOURCE_DISPLAY_OFF = 'off';
export const SOURCE_DISPLAY_MODES = Object.freeze([SOURCE_DISPLAY_DOT, SOURCE_DISPLAY_LABEL, SOURCE_DISPLAY_OFF]);
export const SOURCE_DISPLAY_DEFAULT = SOURCE_DISPLAY_DOT;

// 1.4. ~~비율 필터~~ S43.4 (2026-05-08, Sprint 054) 폐기.
//   옛 architecture의 balancer post-filter용. 새 architecture는 풀 1-45 균등 가중 추첨이라 필터 미사용.
//   AC_VALUE는 미구현 상태로 잔존. 폐기 검토.

// 1.5. 추첨 전략 ID (캐릭터 속성이 아니라 추첨 시 사용자가 선택하는 가중치 정책)
export const STRATEGY_BLESSED = 'blessed';
export const STRATEGY_STATISTICIAN = 'statistician';
export const STRATEGY_SECOND_STAR = 'secondStar';
export const STRATEGY_REGRESSIONIST = 'regressionist';
// S34 (2026-05-08): STRATEGY_PAIR_TRACKER('pairTracker') 폐기.
//   페어 동행 보장 못 함 + 사용자 가치 의문으로 통계 카테고리 5종 → 4종 단순화.
//   동시출현 매트릭스(cooccur)는 통계 탭에서 학습 자산으로 유지.
export const STRATEGY_ASTROLOGER = 'astrologer';
export const STRATEGY_TREND_FOLLOWER = 'trendFollower';
export const STRATEGY_INTUITIVE = 'intuitive';
export const STRATEGY_BALANCER = 'balancer';
export const STRATEGY_ZODIAC_ELEMENT = 'zodiacElement';
export const STRATEGY_FIVE_ELEMENTS = 'fiveElements';
export const STRATEGY_DEFAULT = STRATEGY_BLESSED;

// 1.5.3. 전략 카테고리 ID (다중 전략 모드 출처 라벨 dot 색용. SSOT: docs/02_data.md 1.5.2).
// S10(2026-05-02): fiveElements 'saju' → 'mapping' 통합. 운세 단일 카테고리.
// S34 (2026-05-08): pairTracker 항목 제거 (폐기 동반).
export const STRATEGY_CATEGORIES = Object.freeze({
  blessed: 'random', statistician: 'stats', secondStar: 'stats', regressionist: 'stats',
  astrologer: 'mapping', trendFollower: 'stats', intuitive: 'random',
  balancer: 'random', zodiacElement: 'mapping', fiveElements: 'mapping',
});

// 다중 전략 모드 최대 선택 수 (분배 1+1+1+1+1+1 = 6).
export const MULTI_STRATEGY_MAX = 6;

// S25 (2026-05-03): 다중 전략 정규화 순서 (E안). UI 클릭 순서와 무관하게 결정론 보장.
// recommendMulti가 strategyIds를 본 순서로 sort 후 처리.
// 사유: 사용자가 같은 N개 strategy를 어떤 순서로 켜든 같은 결과 + 같은 source 매핑.
// 기준: 카테고리(운세 → 랜덤 → 통계) + 카테고리 안 의미 순 (UI 노출 순서와 일치).
// SSOT: docs/02_data.md 1.5.4.
// S34 (2026-05-08): STRATEGY_PAIR_TRACKER 제거. 통계 4종.
export const STRATEGY_ORDER = Object.freeze([
  // 운세
  STRATEGY_ASTROLOGER, STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
  // 랜덤
  STRATEGY_BLESSED, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  // 통계
  STRATEGY_TREND_FOLLOWER, STRATEGY_STATISTICIAN,
  STRATEGY_SECOND_STAR, STRATEGY_REGRESSIONIST,
]);

// S18 (2026-05-02): 통계계 5전략의 풀 크기. 상위 N등 풀에서 균등 추첨.
// "어정쩡한 weight 비례 PRNG" 회피.
// S40 (2026-05-08): 10 → 25. 사용자 통찰 "10번 이하가 안 나올 수 있는데 무조건 나옴".
//   풀 10이라 1-9 안 번호가 풀에 1-2개 들어가면 6번호 추첨에서 거의 확정 노출. 한국 6/45 실제로는 24% 회차가 1-9 0개.
//   풀 25 = 1-45의 절반 이상 → 1-9 가중 자연 약화 → 추천 분포가 한국 실제 분포에 가까워짐.
// ~~STATS_POOL_SIZE~~ S43.4 (2026-05-08, Sprint 054) 폐기. 새 architecture는 풀 컷팅 폐기.

// 1.5.5. 5세트 동시 추천 (S4-T1, 2026-05-02 신설). SSOT: docs/02_data.md 1.5.5.
// "한 회차의 다양한 시도"를 5장 카드로 한 번에 노출. 사행성 톤 회피 (구매 권유 X, 확률 변화 X).
// 시드 변형: setIndex i (0~4)에 대해 mixSeeds(baseSeed, FIVE_SETS_SALT_BASE + i) (i=0은 base 그대로).
export const FIVE_SETS_COUNT = 5;
export const FIVE_SETS_SALT_BASE = 0x5E7A;

// S26 (2026-05-03): 누적 추천 세트 (조립식 N장 누적). SSOT: docs/02_data.md 1.5.8.
// 사용자가 strategy 조합을 바꿔가며 N세트 누적. 회차 단위 격납 + 다음 회차 자동 비움.
// "여러 세트 = 적중 ↑" 사행성 톤 회피용 cap.
export const SAVED_SETS_CAP = 20;
// 같은 조립식으로 한 번에 만들 수 있는 batch 단위 (UI "+ N세트" 버튼).
export const SAVED_SETS_BATCH_SMALL = 1;
export const SAVED_SETS_BATCH_LARGE = 5;
// 누적 세트 시드 변형 솔트 베이스 (FIVE_SETS_SALT_BASE와 충돌 회피).
export const SAVED_SETS_SALT_BASE = 0x5A1ED;
// S32 (2026-05-07): 풀 한계 시 dedupe 재시도 상한. SSOT: docs/02_data.md 1.5.8.2.
//   별자리 / 사주 행운 / 원소 등 풀 좁은 전략에서 시드 변형해도 새 unique 조합이 안 나오는 한계 검출용.
//   batchN개 추첨 후 dedupe 미달분만큼 시드 offset 증가 + 재추첨, 누적 시도 RETRY_MAX 도달 시 종료.
export const SAVED_SETS_RETRY_MAX = 50;
// S32 (2026-05-07): 누적 세트 결과 토스트 노출 시간 (밀리초). SSOT: docs/02_data.md 1.5.8.2.
export const SAVED_SETS_TOAST_NORMAL_MS = 1500;
export const SAVED_SETS_TOAST_PARTIAL_MS = 2500;
// S60 (2026-05-10): 추가된 세트 카드 펄스 시간(밀리초). SSOT: docs/02_data.md 1.5.8.2 / 1.5.8.6.
//   토스트와 동시 시작, 토스트보다 먼저 종료. 토스트 = "몇 세트", 펄스 = "어디에" 역할 분리.
export const SAVED_SETS_JUST_ADDED_MS = 1000;

// ~~OBJECTIVE_STRATEGIES / OBJECTIVE_SEED_SALT~~ S43.4 (2026-05-08, Sprint 054) 폐기.
//   객관 vs 시드 의존 분기 폐기. 새 architecture는 모든 strategy가 samplingSeed = mix(seed, drwNo) 의존.

// 1.6. 운세 등급 ID
export const FORTUNE_GREAT = 'great';
export const FORTUNE_GOOD = 'good';
export const FORTUNE_NEUTRAL = 'neutral';
export const FORTUNE_BAD = 'bad';

// 1.7. 추첨 가중치 한계 + 통계 효과 증폭
// SSOT: docs/02_data.md 1.7.
// WEIGHT_MIN_FLOOR: weightedSample 안전망 (weight 0 합 방지). 보존.
export const WEIGHT_MIN_FLOOR = 0.0001;

// ~~WEIGHT_MAX_BIAS / STATS_POWER / GAP_POWER~~ S43.4 (2026-05-08, Sprint 054) 폐기.
//   옛 architecture(applyLuck / statsToWeights / gapWeights)만 사용. 새 architecture는 직접 가중치 합성.

// 1.19. 행운 의식 (T4, 2026-05-02 신설)
// SSOT: docs/02_data.md 1.19, docs/01_spec.md 5.6.
// 해석 B: 정성 / 콘텐츠 게이지. 추첨 확률 영향 없음.
// S089 (2026-05-17): ~~만땅 시 Luck +5 보너스~~ 폐기. 만땅 보상은 잠금만 유지 (회차당 1회 의식 완료 인정).
// 회차 변경 시 게이지 + 행위 쿨다운 모두 리셋.
export const RITUAL_GAUGE_MAX = 100;
export const RITUAL_GAIN_PER_ACTION = 12.5;  // 8 행위 × 12.5 = 100
// ~~LUCK_BONUS_RITUAL~~ S089 폐기 (Luck 자산 전면 폐기).

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

// 1.19.7. 만땅 진입 파티클 버스트 상수 (S58, 2026-05-09 명문화).
// SSOT: docs/02_data.md 1.19.7. 색상은 colors.js RITUAL_PARTICLE_COLORS.
// 추첨 결과 영향 0. prefers-reduced-motion 시 비활성.
export const RITUAL_PARTICLE_COUNT = 30;
export const RITUAL_PARTICLE_DURATION_MS = 900;
export const RITUAL_PARTICLE_RADIUS_MAX = 140;  // 최대 비행 반경(px)
export const RITUAL_PARTICLE_SIZE = 4;          // 입자 base 반지름(px)

// 1.16. ~~백캐스트~~ (S090, 2026-05-17 전면 폐기 / S093 cleanup 2026-05-18 dead 상수 제거)
// 사용자 명시 "진짜를 돌리고 싶다" + "추천 번호를 직접 선택해야 한다".
// 백캐스트 = 캐릭터 첫 진입 시 가짜 30회 history 자동 채움 → 사용자 명시 선택 없는 자동 누적 = 정직성 부족.
// S089 Luck 폐기 후 명분도 약했음(원래 Luck 부트스트랩 목적).
// S093 (2026-05-18): BACKFILL_RECENT_COUNT 상수 자체 제거 (코드 호출 0건 확인. tests/suites/history.test.js의 export 부재 검증은 유지하여 회귀 차단).
// S090 신설: HISTORY_REGISTER_CAP_PER_ROUND - 회차당 history 등록 cap (한국 로또 1구좌 = 5게임 max 모방).

// ~~1.16-A. history 등록 cap~~ (S090-후속 7, 2026-05-18 폐기)
// 사용자 명시 "5개 제한 없애줘". saved-sets cap(20)이 자연 상한 역할.
// 상수 자체는 호환을 위해 dead 잔존 (코드 호출 0건).
export const HISTORY_REGISTER_CAP_PER_ROUND = 20;

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

// 1.20. 프리셋 시스템 (S36, 2026-05-08 / S63 부제 폐기, 2026-05-10). SSOT: docs/02_data.md 1.20.
// 사용자가 자주 쓰는 전략 묶음을 1버튼으로. 메인 = 3슬롯 고정.
// 사용자 편집 가능 (라벨 / 묶음). 슬롯 추가 / 삭제는 불가.
// S63 (2026-05-10): 부제 필드 폐기. 추천 탭 슬롯 두 번째 행은 묶인 전략 label list 자동 표시.
export const PRESET_SLOT_COUNT = 3;
export const PRESET_LABEL_MAX = 8;
// ~~PRESET_SUBTITLE_MAX~~ S63 (2026-05-10) 폐기. 부제 필드 자체 폐기.

// 기본 프리셋 3종 (사용자 첫 진입 또는 reset 시 주입).
// S43.7 (2026-05-09): 모든 프리셋이 직감 단독으로 동일 묶음이라 "전략 내용 똑같다" 불만.
//   새 architecture(S43)는 가중 보너스 합성 + 단일 추첨이라 1번대 편향 / 인접 클러스터링 없음 (시뮬 검증).
//   → 옛 차별화 묶음 복원 안전.
// S63 (2026-05-10): subtitle 필드 제거.
// S75 (2026-05-16): 사용자 명시 순서/라벨/묶음 재정렬.
//   슬롯 1 운세 (별자리·사주·4원소) / 슬롯 2 균형 (최신·별자리·직감) / 슬롯 3 분산 (균형·사주).
//   옛 (S43.7~S74): 슬롯 1 균형 / 2 분산파 / 3 운세파. storage.js loadPresets 마이그레이션이 옛 기본값 자동 갱신.
export const DEFAULT_PRESETS = Object.freeze([
  Object.freeze({
    id: 'preset-1',
    label: '운세',
    strategyIds: Object.freeze([STRATEGY_ASTROLOGER, STRATEGY_FIVE_ELEMENTS, STRATEGY_ZODIAC_ELEMENT]),
  }),
  Object.freeze({
    id: 'preset-2',
    label: '균형',
    strategyIds: Object.freeze([STRATEGY_TREND_FOLLOWER, STRATEGY_ASTROLOGER, STRATEGY_INTUITIVE]),
  }),
  Object.freeze({
    id: 'preset-3',
    label: '분산',
    strategyIds: Object.freeze([STRATEGY_BALANCER, STRATEGY_FIVE_ELEMENTS]),
  }),
]);
