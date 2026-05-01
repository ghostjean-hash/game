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
