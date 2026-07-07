// 게임 수치 정의 (매직넘버 SSOT). 밸런스 조정은 이 파일에서만.
// 색상은 colors.js, 발사 패턴 계산은 core/fire.js가 담당한다.

export const CFG = {
  player: { r: 14, speed: 340, fireEvery: 0.14, maxLives: 3, invAfterHit: 1.6, yRatio: 0.82 },
  bullet: { speed: 620 },
  enemyBullet: { speed: 250, r: 5 },
  // 3계통 파워 파츠 (docs/05_power-parts.md). 전방 화력 / 좌우 옵션기 / 에너지존.
  parts: {
    // 전방 화력: 8단계로 분화(탄 수↑). 개별 탄 굵기는 완만하게 = rBase + dmg × rGrow.
    front: { max: 8, rBase: 2.8, rGrow: 0.42 },
    option: {
      maxPerSide: 4,          // 좌우 각 4대 → 총 8대
      baseX: 30, stepX: 15,   // 안쪽부터 바깥으로 x 간격
      baseY: 4, stepY: 14,    // 슬롯 뒤로 갈수록 약간 아래
      follow: 9,              // 플레이어 추종 속도(초당 비율)
      // 발사체 크기(r)는 옵션기가 늘수록 커진다: r = base + 옵션수 × grow. 화력 성장이 눈에 보이게.
      laserEvery: 0.16, laserDmg: 1, laserSpeed: 880, laserR: 2.2, laserRGrow: 0.28,
      missileEvery: 1.4, missileDmg: 3, missileSpeed: 300, missileTurn: 3.2, missileAccel: 520, missileR: 4, missileRGrow: 0.45,
    },
    zone: {
      radius: [0, 34, 52, 70, 88, 106], // 레벨 0~5 반경
      tick: 0.5,                        // 데미지 주기(초)
    },
  },
  // 적 종류별 수치 (speed = 세로 낙하 속도, amp = weaver 가로 흔들 폭). 색은 colors.js.
  // bonus = 보너스 기체: 화면을 가로질러(speed = 가로 이동 속도) 지나가며, 잡으면 파워업 확정 드롭.
  enemy: {
    drone:  { r: 15, hp: 1, speed: 150, score: 100 },
    // weaver도 이제 가끔 조준 사격(fireEvery). gunner는 3발 확산(shots·spread)으로 탄막을 조밀하게.
    weaver: { r: 16, hp: 2, speed: 120, score: 150, amp: 70, freq: 2.4, fireEvery: 2.6 },
    gunner: { r: 18, hp: 3, speed: 70,  score: 250, fireEvery: 1.1, shots: 3, spread: 46 },
    bonus:  { r: 17, hp: 5, speed: 130, score: 500 },
    // ── 11~20 구역 전용 신규 적 (docs/01_spec.md 5.6) ──
    // splitter: 죽으면 shard 조각으로 분열. shard: 그 조각(작고 빠름, 재분열 없음).
    splitter: { r: 19, hp: 4, speed: 105, score: 300, shardCount: 2, shardSpread: 150 },
    shard:    { r: 9,  hp: 1, speed: 250, score: 50 },
    // shielder: 정면(아래) 직진탄·레이저를 막는 방패. 유도 미사일(옵션기)로만 피해. 측면 우회 유도.
    shielder: { r: 18, hp: 3, speed: 85,  score: 350, fireEvery: 2.0 },
    // rusher: charge초 동안 조준하며 천천히 내려오다, 저장한 방향으로 rush 속도로 급강하 돌진.
    rusher:   { r: 14, hp: 2, score: 320, drift: 45, charge: 0.9, rush: 540 },
  },
  // 구역이 오를수록 적 체력 상승: hp = ceil(base * (1 + (stage-1)*scale)). 10구역 ≈ 3.5배.
  enemyHpScale: 0.28,
  // 파워업은 일반 잡몹에선 나오지 않는다. 보스·보너스 기체 격파 시에만 확정 드롭한다.
  // weights = 드롭 종류 확률(합 1): P 전방화력 / S 옵션기 / E 에너지존 / H 회복 / B 봄.
  // chance = 일반 잡몹 처치 시 드롭 확률(초반 화력 성장 숨통). 보스·보너스는 확정 드롭(별도).
  drop: { chance: 0.09, weights: { P: 0.24, S: 0.34, E: 0.20, H: 0.12, B: 0.10 } },
  // 보너스 기체 등장: every초마다 화면 좌/우에서 등장, yRatio 높이로 가로질러 감. 잡으면 dropCount개 드롭.
  bonusShip: { every: 10, dropCount: 1, yRatio: 0.22 },
  // 보스 격파 시 확정 드롭 수(중보스 / 최종보스).
  bossDrop: { mini: 2, final: 4 },
  // 중보스(1~9구역): 작고 hp 낮음 + 호위 비행체 주기 소환. 최종보스(10구역): 크고 단단한 2패턴.
  // hp는 3계통 화력 성장에 맞춰 상향(중보스 baseHp 55→90·구역당 22→32, 최종 420→980).
  miniBoss: { rx: 30, ry: 26, baseHp: 90, hpPerStage: 32, score: 900, escortEvery: 3.2, escortInit: 3 },
  // 최종보스는 이제 20구역. 20구역까지 화력이 최대로 성장하므로 hp를 크게 상향.
  finalBoss: { rx: 50, ry: 44, hp: 2400, score: 12000 },
  // spawnTop = 보스가 멈춰 서는 중심 y(상단 체력 바와 겹치지 않게 바 아래로 내린다). targetY = spawnTop + ry.
  boss: { bobAmp: 0.32, bobFreq: 0.5, spawnTop: 62 },
  // 11구역부터는 신규 적(splitter/shielder/rusher) 위주로 난이도가 오른다. 20구역이 최종.
  stageCount: 20,
  // 11구역 이후 추가 체력 배수(신규 적 구간 난이도 가속). 최종 hp = 기존 스케일 × (구역>=11이면 이 배수).
  hardStage: { from: 11, hpMul: 1.35 },
  stageIntro: 2.2, // 구역 시작 배너 표시 동안 적 스폰 정지(초)
  starCount: 70,
  // 발열/성능: 화면에 쌓이는 오브젝트 상한(초과분은 오래된 것부터 제거).
  limits: { bullets: 160, eBullets: 140, particles: 240 },
};

// 구역 이름 (1~20). 11구역부터는 미지의 심우주 - 전혀 다른 적들이 출현한다.
export const STAGE_NAMES = [
  '소행성 지대', '적 함대 전선', '폐허 정거장', '운석 회랑', '적 보급선',
  '전자 폭풍', '궤도 방어선', '침묵의 성역', '모함 외곽', '모함 최심부',
  '차원의 경계', '분열체 군집', '수호벽 지대', '혜성 폭류', '암흑 성운',
  '반란 함대', '플라스마 지옥', '파멸의 궤도', '최후 방어선', '최종 결전',
];
