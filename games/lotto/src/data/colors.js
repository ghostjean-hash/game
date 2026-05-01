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
