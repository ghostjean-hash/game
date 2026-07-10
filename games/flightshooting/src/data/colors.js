// 게임 플레이 색상 정의 (SSOT). 렌더에서 쓰는 모든 색은 이 상수에서만 가져온다.
// UI(메뉴/HUD/버튼)의 색·간격·폰트는 styles/tokens.css의 CSS 변수 담당(역할 분리).

export const COLORS = {
  player: '#22d3ee',
  playerCore: '#e8fbff',
  engine: 'rgba(255,180,90,0.85)',
  bullet: '#c9fbff',
  bulletGlow: '#22d3ee',
  // 사이드 총알(옵션기 S) 진화 단계별 색(둥근 계열, tier 0~10). 인덱스 0=무강화. 전부 아군 차가운색.
  bulletShapeTier: ['#5fe8ff', '#22d3ee', '#8ff0ff', '#7dd3fc', '#5effd0', '#c7f9ff', '#9ecbff', '#b17bff', '#e59bff', '#dff0ff', '#ffffff'],
  // 메인 총알(전방화력 P) = 레이저 빔 외곽색(tier 0~10). 단계마다 색을 달리해 진화를 보인다(빔 형태 패턴과 함께).
  //   시안→민트→하늘→파랑→보라→분홍→백금으로 올라가며 적탄 빨강·노란 코어와는 절대 안 겹친다(아군 냉색 유지).
  mainTier: ['#3fe0ff', '#4affc4', '#5effd0', '#7dd3fc', '#5b9bff', '#8f7bff', '#b17bff', '#e59bff', '#ff9bf0', '#e0f4ff', '#ffffff'],
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
    // 21~30 이질 기계·결정·에너지 계열 - 각진 형태 + 기계색으로 유기체 정령과 대비.
    turret: '#7d97bd',      // 부유 포대(강철 청)
    turretCore: '#ffd36b',  // 포대 코어(경고 발광)
    prism: '#b78bff',       // 결정체(형광 보라)
    mine: '#d0824c',        // 기뢰(녹슨 구리 - 경고톤)
    mineCore: '#ff5470',    // 기뢰 코어(자폭 경고 적)
    warper: '#3fbfa2',      // 공간 왜곡체(불안정 청록)
    // 2차 이질 적(연결선·체인)
    coil: '#4bb8ff',        // 전격 코일 노드(전기 하늘)
    coilArc: '#d6f0ff',     // 노드 사이 아크 번개(밝은 흰-하늘)
    serpent: '#7f93ba',     // 기계 뱀 몸통 마디(강철 - 무적 방어)
    serpentHead: '#ff7a48', // 기계 뱀 머리(약점 경고 주황)
  },
  // 보스 색 (중보스 mini 1~19 / 기계 중보스 machine 21~29 / 최종 final 30)
  boss: {
    mini: '#ffa05c',
    machine: '#8797b8',     // 기계 중보스(강철)
    machineCore: '#ff6b81', // 기계 보스 코어(붉은 발광)
    final: '#c0455c',
    gunMini: '#ffd08a',
    gunFinal: '#ff6b81',
    coreDark: '#2a0f16',
    coreLight: '#ffd36b',
    // 부위 파괴형 스타일 색(docs/06). core=본체 코어, weapon=포탑, shield=방어구, part=부위 기본 몸체.
    styles: {
      battleship: { core: '#ffb15c', weapon: '#ffd08a', shield: '#d98a45', part: '#d98a45' },
      bio:        { core: '#ff7ac0', weapon: '#ff9ad0', shield: 'rgba(200,100,164,0.9)', part: '#c85a9a' },
      orbiter:    { core: '#8797b8', weapon: '#9fb4d8', shield: '#9fb4d8', part: '#6f86ad' },
      sentinel:   { core: '#c0455c', weapon: '#ff6b81', shield: 'rgba(170,72,94,0.9)', part: '#8a2f42' },
    },
    partDebris: '#ffd36b', // 부위 파괴 잔해 스파크
  },
  // 파워업 아이템 색 (P 전방화력 / S 옵션기 / E 에너지존 / T 꼬리기 / H 회복 / B 봄)
  powerup: {
    P: '#f7c948',
    S: '#5fe8ff',
    E: '#a98bff',
    T: '#6ee7a8',
    H: '#ff6b81',
    B: '#7cf3c4',
  },
  // 옵션기·파츠 무기 색
  option: '#5fe8ff',      // 부속 비행기 본체
  // 레이저 빔: 라벤더 외곽 + 흰 코어의 '가는 빛줄기'. 메인탄(시안 덩어리)과 색(보라 vs 시안)·형태(빔 vs 덩어리)로 구분.
  laser: '#a78bfa',       // 레이저 외곽(라벤더)
  laserCore: '#ffffff',   // 레이저 흰 코어
  // 꼬리 비행기(T)·유도탄. 유도탄 몸체 색은 3색만 순환(tier%3, 인접 3단계 구분·반복, 사용자 지시 2026-07-10).
  tail: '#9ae6b4',        // 꼬리기 본체
  tailMissile3: ['#7cf3c4', '#5fd0e8', '#9ecbff'],
  missileTrail: 'rgba(150,255,220,0.6)',
  zone: '#a98bff',        // 에너지존 오라(반투명으로 렌더 시 alpha 적용)
  // 에너지존(E) 레벨별 색(1~5, rgb 문자열 - drawZone이 alpha를 붙여 gradient 생성). 보라 → 라임으로 성장.
  zoneRgbByLevel: ['169,139,255', '139,180,255', '110,220,235', '110,240,180', '150,255,120'],
  // 배경 성운: 구역별로 순환하는 은은한 색조(깊이감 + 구역마다 다른 분위기). drawBackground가 radial gradient로.
  stageNebula: ['rgba(70,100,180,0.13)', 'rgba(150,80,150,0.13)', 'rgba(80,150,140,0.13)', 'rgba(185,120,70,0.12)', 'rgba(110,90,195,0.13)', 'rgba(190,80,110,0.12)'],
  // 캐릭터: 플레이어 = 와라와라(하얀 둥근 정령), 옵션기 = 토토로(회색). 작은 실루엣으로 표현.
  warawara: '#f6f8ff', warawaraGlow: '#dfe7ff', warawaraEye: '#33343d',
  totoro: { laser: '#9aa0ab', missile: '#6b7280', belly: '#e6e8ec', eye: '#2b2b30' },
};
