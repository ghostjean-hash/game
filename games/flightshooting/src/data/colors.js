// 게임 플레이 색상 정의 (SSOT). 렌더에서 쓰는 모든 색은 이 상수에서만 가져온다.
// UI(메뉴/HUD/버튼)의 색·간격·폰트는 styles/tokens.css의 CSS 변수 담당(역할 분리).

export const COLORS = {
  player: '#22d3ee',
  playerCore: '#e8fbff',
  engine: 'rgba(255,180,90,0.85)',
  bullet: '#c9fbff',
  bulletGlow: '#22d3ee',
  // 전방 화력(P) 단계별 탄 색: 1단계 청록 → 8단계 붉은색(강해질수록 뜨겁게).
  // 아군 기본탄: 화력이 올라도 '차가운 시안~흰'으로만 밝아진다(적탄과 색이 겹치지 않게). 성장은 밝기로.
  bulletByLevel: ['#cffaff', '#b3f2ff', '#93e9ff', '#79dfff', '#8ef0dd', '#b0ffe6', '#d8fff2', '#ffffff'],
  // 적탄: 선명한 빨강 몸 + 노란 코어(view에서). 아군(시안/흰)과 뚜렷이 대비되는 '뜨거운' 경고색.
  enemyBullet: '#ff2d3a',
  enemyBulletCore: '#ffd24a',
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
    bonus: '#a6ff4d',   // 보너스 기체(눈에 띄는 라임 + 글로우)
    // 11~20 구역 신규 적
    splitter: '#ff7ac0', // 분열체(핑크 마젠타)
    shard: '#ffa9d8',    // 분열 조각(연한 핑크)
    shielder: '#6fd0ff', // 방패병(시안)
    shielderShield: 'rgba(111,208,255,0.35)', // 방패막(반투명)
    rusher: '#ff5470',   // 돌격기(강렬한 레드)
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
  // 파워업 아이템 색 (P 전방화력 / S 옵션기 / E 에너지존 / H 회복 / B 봄)
  powerup: {
    P: '#f7c948',
    S: '#5fe8ff',
    E: '#a98bff',
    H: '#ff6b81',
    B: '#7cf3c4',
  },
  // 옵션기·파츠 무기 색
  option: '#5fe8ff',      // 부속 비행기 본체
  laser: '#b6ffff',       // 레이저 빔(얇고 밝은 시안)
  missile: '#ffd36b',     // 유도 미사일
  missileTrail: 'rgba(255,180,90,0.7)',
  zone: '#a98bff',        // 에너지존 오라(반투명으로 렌더 시 alpha 적용)
  // 에너지존(E) 레벨별 색(1~5, rgb 문자열 - drawZone이 alpha를 붙여 gradient 생성). 보라 → 라임으로 성장.
  zoneRgbByLevel: ['169,139,255', '139,180,255', '110,220,235', '110,240,180', '150,255,120'],
  // 배경 성운: 구역별로 순환하는 은은한 색조(깊이감 + 구역마다 다른 분위기). drawBackground가 radial gradient로.
  stageNebula: ['rgba(70,100,180,0.13)', 'rgba(150,80,150,0.13)', 'rgba(80,150,140,0.13)', 'rgba(185,120,70,0.12)', 'rgba(110,90,195,0.13)', 'rgba(190,80,110,0.12)'],
  // 캐릭터: 플레이어 = 와라와라(하얀 둥근 정령), 옵션기 = 토토로(회색). 작은 실루엣으로 표현.
  warawara: '#f6f8ff', warawaraGlow: '#dfe7ff', warawaraEye: '#33343d',
  totoro: { laser: '#9aa0ab', missile: '#6b7280', belly: '#e6e8ec', eye: '#2b2b30' },
};
