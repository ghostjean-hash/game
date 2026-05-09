// 게임 데이터 색상. SSOT: docs/02_data.md 2장. 라이트 톤(M6 폴리싱).
// 이건 게임 플레이의 일부. UI 토큰(메뉴 / 배경 / 폰트)은 styles/tokens.css.

export const FORTUNE_COLORS = Object.freeze({
  great: '#c9a050',   // 대길 - 어두운 골드 (라이트 배경 대비)
  good: '#10b981',    // 길 - 어두운 녹색
  neutral: '#6b6b75', // 평 - 회색
  bad: '#ef4444',     // 흉 - 어두운 빨강
});

export const NUMBER_CARD_COLORS = Object.freeze({
  bg: '#ffffff',
  text: '#1a1a1f',
  bonusBg: '#fff3d9',
  bonusText: '#b88830',
});

export const RANK_GLOW_COLORS = Object.freeze({
  1: '#c9a050',
  2: '#b88830',
  3: '#10b981',
  4: '#06b6d4',
  5: '#6b6b75',
});

// 미적중 / 미발표 색. SSOT: docs/02_data.md 2.3 (S58, 2026-05-09).
// 사용처: 이력 도넛 차트의 "미적중" 슬라이스, 회차 카드 비활성 글로우.
export const RANK_MISS_COLOR = '#d1d5db';

// 행운 의식 만땅 파티클 버스트 색. SSOT: docs/02_data.md 1.19.7.
// 입자별로 두 색 중 랜덤 선택. 골드 / 앰버.
export const RITUAL_PARTICLE_COLORS = Object.freeze(['#f6c445', '#f59e0b']);

// 한국 6/45 로또 번호 색상 (10단위 구간).
// SSOT: docs/02_data.md 2.4.
// 출처: 동행복권 결과 페이지 변종(평면 진한색). 추첨 영상 표준 5색
//   (#fbc400 / #69c8f2 / #ff7272 / #aaaaaa / #b0d840)이 아니라
//   결과 페이지에서 사용되는 진한 채도의 단색을 사용.
//   사유: 결과 페이지 시각 통일성 (사용자 요청 2026-05-02).
//   텍스트는 모두 흰색. 입체감 / 그림자 없음 (CSS .num은 완전 평면 단색).
export const NUMBER_RANGE_COLORS = Object.freeze([
  { from: 1, to: 10, bg: '#f5a200' },   // 진황금
  { from: 11, to: 20, bg: '#1c41a1' },  // 진청 (navy)
  { from: 21, to: 30, bg: '#c4253a' },  // 진홍 (carmine)
  { from: 31, to: 40, bg: '#8a8a8a' },  // 짙은 회색
  { from: 41, to: 45, bg: '#80b438' },  // 진연두
]);

/**
 * 번호값(1~45) → { bg } 색상 반환. 텍스트 색은 CSS에서 통일 (#fff + text-shadow).
 * 범위 밖이면 기본 NUMBER_CARD_COLORS 반환.
 * @param {number} n 1~45
 */
export function numberColor(n) {
  for (const range of NUMBER_RANGE_COLORS) {
    if (n >= range.from && n <= range.to) return { bg: range.bg };
  }
  return { bg: NUMBER_CARD_COLORS.bg };
}

// S23 (2026-05-03): 전략별 출처 태그 색.
// 카테고리 hue 유지 + 명도 단계로 같은 카테고리 안 식별.
// 사용자 결정 = "같은 운세라도 색 계열은 같지만 색은 다르게".
//   통계 5종: 파랑 계열 (sky-500 → blue-900) 5단계.
//   운세 3종: 분홍 계열 (pink-500 → pink-800) 3단계.
//   랜덤 3종: 회색 계열 (gray-500 → gray-700) 3단계.
// SSOT: docs/02_data.md 2.7.
// S34 (2026-05-08): pairTracker 항목 제거 (짝꿍 폐기 동반). 통계 4종.
export const STRATEGY_TAG_COLORS = Object.freeze({
  // 통계 (파랑 계열)
  trendFollower: '#0ea5e9',   // sky-500
  statistician:  '#0284c7',   // sky-600
  secondStar:    '#075985',   // sky-800
  regressionist: '#0c4a6e',   // sky-900
  // 운세 (분홍 계열)
  astrologer:    '#ec4899',   // pink-500
  zodiacElement: '#be185d',   // pink-700
  fiveElements:  '#9d174d',   // pink-800
  // 랜덤 (회색 계열)
  blessed:       '#6b7280',   // gray-500
  intuitive:     '#4b5563',   // gray-600
  balancer:      '#374151',   // gray-700
});

/**
 * 전략 ID → 출처 태그 배경색.
 * @param {string} sid strategy id
 * @returns {string} hex 색. 매핑 없으면 기본 회색.
 */
export function strategyTagColor(sid) {
  return STRATEGY_TAG_COLORS[sid] || '#6b7280';
}

// S059 (2026-05-09): main.css 게임 데이터 인라인 hex의 SSOT 정합화.
// 본 export들은 정의(SSOT)이며, 실제 사용처는 main.css 인라인 hex와 동일 값.
// 차후 sprint에서 JS render 측 inline style 또는 CSS 변수 주입 방식으로 단일 소비처화.

// 카테고리 chip 색 (전략 행 라벨 / 출처 태그 / 카테고리 chip / 운세 lucky-element).
// SSOT: docs/02_data.md 2.8 (S059 신설).
// 톤: stats=sky / mapping=pink / random=gray. STRATEGY_TAG_COLORS보다 lighter (chip 배경 톤).
export const CATEGORY_CHIP_COLORS = Object.freeze({
  stats:   { bg: '#e0f2fe', fg: '#0369a1', border: '#bae6fd' },
  mapping: { bg: '#fce7f3', fg: '#be185d', border: '#fbcfe8' },
  random:  { bg: '#f3f4f6', fg: '#4b5563', border: '#e5e7eb' },
});

// 행운 의식 chip / banner / cta 색. SSOT: docs/02_data.md 1.19.8 (S059 신설).
// 의식 row 활성 상태 + 만땅 banner + 보너스 chip에 일관 노랑/앰버 톤.
export const RITUAL_CHIP_COLORS = Object.freeze({
  bg: '#fef3c7',     // yellow-50 - row bg / cta bg
  fg: '#92400e',     // amber-900 - 텍스트
  border: '#fcd34d', // amber-300 - border
  accent: '#f59e0b', // amber-500 - 강조(아이콘 / banner gradient stop)
  warm:   '#fde68a', // amber-200 - banner gradient mid
});

// 변동성 chip 색 (lucky-variability / strategy-variability).
// SSOT: docs/02_data.md 2.9 (S059 신설).
// active = 주간 활성(녹색) / inactive = 평생 비활성(회색).
export const VARIABILITY_CHIP_COLORS = Object.freeze({
  active:   { bg: '#dcfce7', fg: '#166534', border: '#86efac' },
  inactive: { bg: '#f3f4f6', fg: '#4b5563', border: '#d1d5db' },
});
