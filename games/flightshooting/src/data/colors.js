// 게임 플레이 색상 정의 (SSOT). 렌더에서 쓰는 모든 색은 이 상수에서만 가져온다.
// UI(메뉴/HUD/버튼)의 색·간격·폰트는 styles/tokens.css의 CSS 변수 담당(역할 분리).

export const COLORS = {
  player: '#22d3ee',
  playerCore: '#e8fbff',
  engine: 'rgba(255,180,90,0.85)',
  bullet: '#c9fbff',
  bulletGlow: '#22d3ee',
  enemyBullet: '#ffb0bd',
  enemyBulletGlow: '#ff6b81',
  star: '#9fd8ff',
  hitSpark: '#ff9a4d',   // 아군 탄 명중 스파크 / 보스 피격
  clearSpark: '#ffd36b', // 격파 연출 보조 색
  playerHitSpark: '#22d3ee',
  // 적 종류별 색
  enemy: {
    drone: '#ff6b81',
    weaver: '#ffa05c',
    gunner: '#b48cff',
    gunnerEye: '#0a0e18',
  },
  // 보스 색 (중보스 mini / 최종 final)
  boss: {
    mini: '#ffa05c',
    final: '#c0455c',
    gunMini: '#ffd08a',
    gunFinal: '#ff6b81',
    coreDark: '#2a0f16',
    coreLight: '#ffd36b',
  },
  // 파워업 아이템 색 (P 화력 / H 회복 / B 봄)
  powerup: {
    P: '#f7c948',
    H: '#ff6b81',
    B: '#7cf3c4',
  },
};
