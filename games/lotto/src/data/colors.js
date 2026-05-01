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

// 한국 6/45 로또 공식 번호 색상 (10단위 구간).
// SSOT: docs/02_data.md 2.4.
// 출처: 동행복권 영상/디자인 표준 (다수 미러 / 분석 사이트 일치 검증).
//   1-10 #fbc400, 11-20 #69c8f2, 21-30 #ff7272, 31-40 #aaaaaa, 41-45 #b0d840.
//   텍스트는 모두 흰색 + text-shadow + 입체감용 box-shadow inset (CSS .num에서 처리).
export const NUMBER_RANGE_COLORS = Object.freeze([
  { from: 1, to: 10, bg: '#fbc400' },   // 노랑
  { from: 11, to: 20, bg: '#69c8f2' },  // 파랑
  { from: 21, to: 30, bg: '#ff7272' },  // 빨강
  { from: 31, to: 40, bg: '#aaaaaa' },  // 회색
  { from: 41, to: 45, bg: '#b0d840' },  // 초록
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
