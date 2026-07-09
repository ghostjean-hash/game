// 게임 수치 정의 (매직넘버 SSOT). 밸런스 조정은 이 파일에서만.
// 색상은 colors.js, 발사 패턴 계산은 core/fire.js가 담당한다.

export const CFG = {
  player: { r: 14, speed: 340, fireEvery: 0.154, maxLives: 3, invAfterHit: 1.6, yRatio: 0.82 },
  // 난이도 모드(시작 화면에서 선택). 어린이 모드는 적·보스 발사 주기를 배수로 늘려 총알을 덜 쏘게 한다.
  //   enemyFireMul = 적 발사 간격 배수(1 = 일반, 2.2 = 발사 간격 2.2배 → 총알 절반 이하). 탄 수·패턴은 그대로.
  difficulty: {
    normal: { enemyFireMul: 1 },
    kid:    { enemyFireMul: 2.2 },
  },
  // bullet.shapes: 전방화력 발별 진화 티어별 탄 렌더(docs/05 1.1.1). 인덱스 0=진화 전 기본, 1~4=진화 티어.
  //   모양이 원→타원→긴형→링으로 뚜렷이 바뀐다(색만이 아니라 형태로 성장을 보인다, 사용자 지시 2026-07-08).
  //   rx/ry = 기본 반경 대비 가로/세로 배율, glow = 발광 강도, ring = 도넛(고리)이면 뚫린 안쪽 반경 비율.
  bullet: {
    speed: 496,
    // 사이드 총알(옵션기) 진화 외형: 둥근 계열(원→타원→긴형→링). 인덱스 0=진화 전 기본.
    shapes: [
      { rx: 1.0, ry: 2.0, glow: 0 },              // 0 기본(진화 전, 작은 세로 타원)
      { rx: 2.6, ry: 2.6, glow: 6 },              // 1 원(확 큰 동그란 구슬 - 타원과 뚜렷이 대비)
      { rx: 2.2, ry: 3.6, glow: 9 },              // 2 타원(큰 럭비공)
      { rx: 1.5, ry: 4.8, glow: 12 },             // 3 긴형(길고 뚜렷한 빔)
      { rx: 2.8, ry: 2.8, glow: 15, ring: 0.5 },  // 4 링(큰 발광 고리, 최종)
    ],
    // 메인 총알(전방화력) 진화 외형: 레이저 빔(빛줄기)을 유지한 채 강화(사용자 지시 2026-07-09).
    //   각진 도형이 아니라 '광선' 형태 그대로, 발별 진화 티어↑일수록 빔이 길고 굵고 밝아지며 흰 코어가 강해진다.
    //   w = 빔 반폭 배율(기본 반경 대비), len = 빔 길이(px), core = 흰 코어 폭 비율(0~1), glow = 발광 강도.
    //   seg = 흰 코어를 몇 마디로 끊어 그릴지(0=실선). 고티어일수록 마디가 늘어 '에너지 빔' 무늬가 생긴다
    //         (여러 발이 나란히 나가도 벽처럼 완전히 뭉치지 않고 패턴으로 보이게, 사용자 지시 2026-07-09).
    mainBeams: [
      { w: 0.42, len: 18, core: 0.42, glow: 0,  seg: 0 },  // 0 무강화(가는 실선 빔)
      { w: 0.50, len: 23, core: 0.44, glow: 6,  seg: 0 },  // 1 강화1(조금 굵고 김, 실선)
      { w: 0.60, len: 28, core: 0.44, glow: 9,  seg: 2 },  // 2 강화2(마디 2 - 무늬 시작)
      { w: 0.70, len: 33, core: 0.46, glow: 12, seg: 3 },  // 3 강화3(마디 3)
      { w: 0.82, len: 39, core: 0.48, glow: 16, seg: 4 },  // 4 강화4(최종, 길고 밝은 광선 + 촘촘한 마디 4)
    ],
  },
  enemyBullet: { speed: 250, r: 5 },
  // 4계통 파워 파츠 (docs/05_power-parts.md). 전방 화력 / 옵션기 / 에너지존 / 꼬리 비행기.
  parts: {
    // 전방 화력(= 메인 총알, 내 비행기가 쏜다): front 1~40. 1~8=탄 수, 9~40=발별 진화(사이드와 같은 구조).
    //   메인 총알은 직진으로 나간다(부채 없음). 여러 발이면 laneGap 간격으로 가로로 나란히 평행 발사.
    //   9단계부터 8발 고정, 가운데 탄부터 한 발씩 mainBeams 티어로 진화(레이저 빔이 굵고 길고 밝아진다).
    //   tierMax = 진화 티어 수, shapeDmg = 티어 1당 탄 데미지 증가.
    // vStagger = 여러 발일 때 바깥 탄일수록 살짝 뒤(아래)에서 출발시키는 V자 대형 오프셋(px/가로거리).
    //   8발이 같은 높이에 일렬로 뭉쳐 격자처럼 보이던 것을 은은한 화살촉 대형으로 풀어준다(사용자 지시 2026-07-09).
    front: { max: 40, rBase: 3.2, rGrow: 0, laneGap: 11, tierMax: 4, shapeDmg: 1, vStagger: 0.42 },
    option: {
      maxPerSide: 4,          // 좌우 각 4대 → 총 8대
      baseX: 30, stepX: 15,   // 안쪽부터 바깥으로 x 간격
      baseY: 4, stepY: 14,    // 슬롯 뒤로 갈수록 약간 아래
      follow: 9,              // 플레이어 추종 속도(초당 비율)
      // 8대 전부 레이저(= 사이드 총알, 사이드 비행기가 쏜다). 옵션 수↑ → 굵기(laserR)·데미지(laserDmg) 상승.
      //   사이드 총알은 부채로 퍼진다: 각 비행기의 대각선 각 = laserDiagBase + slot×laserDiagStep.
      //   안쪽(slot 0) 비행기는 살짝, 바깥(slot 3)으로 갈수록 더 크게 벌어져 부채를 펼친다. side로 좌/우 방향.
      laserEvery: 0.176, laserDmg: 1, laserDmgGrow: 0.5, laserSpeed: 880, laserR: 1.1, laserRGrow: 0.15, laserDiagBase: 6, laserDiagStep: 5.5,
    },
    // 에너지존(E) = 펄스파: 플레이어 중심에서 링이 주기적으로 바깥으로 퍼지고, 링이 지나가는 순간
    //   링 위(두께 판정 내)에 있는 적·보스에게만 dmg = level 피해(상시 장판 아님, 사용자 지시 2026-07-09).
    //   강화(레벨 1~5)할수록: 파동 주기↓(자주) · 최대 반경↑(멀리) · 링 두께↑(맞추기 쉬움) · 데미지↑(=level).
    zone: {
      levelMax: 5,
      period:    [0, 1.4, 1.15, 0.9, 0.7, 0.55], // 레벨별 파동 발생 주기(초). L↑ 자주
      maxRadius: [0, 62, 82, 104, 126, 150],     // 레벨별 파동 최대 도달 반경
      thick:     [0, 12, 15, 19, 23, 28],        // 레벨별 링 두께(= 피해 판정 폭 + 시각 굵기)
      speed: 200,                                // 파동 확장 속도(px/s, 공통)
    },
    // 꼬리 비행기(T): 플레이어 뒤 유도탄 발사기. 4대 먼저 채운 뒤 1~4번 순서로 무기 진화(무기 4단계).
    //   배치: 세로 일렬 체인 - 1번은 플레이어를, 2번은 1번을, …각자 앞 개체를 개별 추종(뱀 꼬리처럼 출렁).
    //   gap = 앞 개체와의 간격. 무기 단계↑ → 유도탄 크기(missileR)·데미지 상승(작은→큰).
    tail: {
      maxCount: 4, weaponMax: 4,
      gap: 10, r: 5.5,          // 앞 개체 뒤 간격(px) + 꼬리기 반경(체인 간격 계산·렌더 공용)
      follow: 10,               // 앞 개체 추종 속도(초당 비율) - 클수록 덜 늘어진다
      missileEvery: 2.7, missileSpeed: 300, missileTurn: 3.2, missileAccel: 520,
      missileR: 2.4, missileRGrow: 0.6,
      missileDmgBase: 3, missileDmgGrow: 1.5,
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
    // ── 21~30 구역 전용 신규 적 (docs/08). 기존 둥근 정령류와 반대인 각진 기계·결정·에너지 계열 ──
    // turret: 부유 포대 - 거의 정지(느린 하강)하며 포신이 플레이어를 3방향(spread) 연사. 단단.
    turret:   { r: 18, hp: 6, speed: 40,  score: 400, fireEvery: 1.5, shots: 3, spread: 42 },
    // prism: 결정체 - 직하하되 피격당할 때마다 사방으로 반사탄 몇 발(reflect) 튕겨 함부로 못 쏘게.
    prism:    { r: 16, hp: 4, speed: 110, score: 350, reflect: 3, reflectSpeed: 240 },
    // mine: 부유 기뢰 - 느리게 표류하다 플레이어가 trigger 거리 내로 오면 자폭(shards 방향 파편탄).
    mine:     { r: 15, hp: 2, speed: 45,  score: 300, trigger: 84, shards: 10, shardSpeed: 230 },
    // warper: 공간 왜곡체 - warpEvery마다 아래(warpDown)+가로 랜덤으로 순간이동. 이동 직후 vulnerable초 취약(정지).
    warper:   { r: 15, hp: 3, speed: 0,   score: 380, warpEvery: 1.15, warpDown: 96, warpJitter: 120, vulnerable: 0.45 },
  },
  // 구역이 오를수록 적 체력 상승: hp = ceil(base * (1 + (stage-1)*scale)). 10구역 ≈ 3.5배.
  enemyHpScale: 0.28,
  // 파워업은 일반 잡몹에선 나오지 않는다. 보스·보너스 기체 격파 시에만 확정 드롭한다.
  // weights = 드롭 종류 확률(합 1): P 전방화력 / S 옵션기 / E 에너지존 / T 꼬리기 / H 회복 / B 봄.
  // chance = 일반 잡몹 처치 시 드롭 확률(초반 화력 성장 숨통). 보스·보너스는 확정 드롭(별도).
  drop: { chance: 0.11, weights: { P: 0.24, S: 0.22, E: 0.16, T: 0.16, H: 0.12, B: 0.10 } },
  // 보너스 기체 등장: every초마다 화면 좌/우에서 등장, yRatio 높이로 가로질러 감. 잡으면 dropCount개 드롭.
  bonusShip: { every: 10, dropCount: 1, yRatio: 0.22 },
  // 보스 격파 시 확정 드롭 수(중보스 / 최종보스).
  bossDrop: { mini: 2, final: 4 },
  // 중보스(1~9구역): 작고 hp 낮음 + 호위 비행체 주기 소환. 최종보스(10구역): 크고 단단한 2패턴.
  // hp는 3계통 화력 성장에 맞춰 상향(중보스 baseHp 55→90·구역당 22→32, 최종 420→980).
  miniBoss: { rx: 30, ry: 26, baseHp: 66, hpPerStage: 34, score: 900, escortEvery: 4.5, escortInit: 2 },
  // 최종보스는 이제 20구역. 20구역까지 화력이 최대로 성장하므로 hp를 크게 상향.
  finalBoss: { rx: 50, ry: 44, hp: 1500, score: 12000 },
  // spawnTop = 보스가 멈춰 서는 중심 y(상단 체력 바와 겹치지 않게 바 아래로 내린다). targetY = spawnTop + ry.
  boss: { bobAmp: 0.32, bobFreq: 0.5, spawnTop: 62 },
  // 11구역~ 신규 적(splitter/shielder/rusher), 21구역~ 이질 기계 적(turret/prism/mine/warper). 30구역이 최종.
  stageCount: 30,
  // 11구역 이후 추가 체력 배수(신규 적 구간 난이도 가속). 최종 hp = 기존 스케일 × (구역>=11이면 이 배수).
  hardStage: { from: 11, hpMul: 1.35 },
  // 21구역 이후 추가 체력 배수(4계통 만렙 근접 구간 - 순삭 방지). hardStage 위에 곱해진다. dev 훅 실측 후 조정.
  voidStage: { from: 21, hpMul: 1.7 },
  stageIntro: 2.2, // 구역 시작 배너 표시 동안 적 스폰 정지(초)
  maxedBonus: 300, // 파츠·목숨이 이미 최대일 때 파워업 획득 시 대신 주는 점수
  starCount: 70,
  // 발열/성능: 화면에 쌓이는 오브젝트 상한(초과분은 오래된 것부터 제거).
  limits: { bullets: 160, eBullets: 140, particles: 240 },
  // 자동 플레이(autopilot) 실력 티어. 인간 실측 근거 → docs/plans/research-2026-07-09-human-like-game-ai.md.
  //   react = 조작 갱신 주기(초, 반응 지연). 사람은 초당 대여섯 번만 방향을 바꾼다(문헌 반응 250~410ms).
  //   aimDeg = 조준 각오차 표준편차(도). 사람은 프로도 완벽 조준 못 함(FPS 히트율 77~87%).
  //   sim = 회피·조준 예측 지평(초). 얼마나 앞을 내다보나(고수일수록 멀리).
  //   threats = 동시에 고려하는 위협 수(가까운 것부터). 사람 MOT 한계 약 4~5개(고수·프로는 상향).
  autopilot: {
    default: 'beginner',
    tiers: {
      beginner:     { react: 0.38, aimDeg: 12, sim: 0.5, threats: 4 },
      intermediate: { react: 0.30, aimDeg: 6,  sim: 0.9, threats: 6 },
      advanced:     { react: 0.25, aimDeg: 3,  sim: 1.3, threats: 9 },
      pro:          { react: 0.21, aimDeg: 1.2, sim: 1.7, threats: 999 },
    },
  },
};

// 구역 이름 (1~30). 11구역부터 미지의 심우주, 21구역부터 이질 기계 문명 - 완전 다른 적들이 출현한다.
export const STAGE_NAMES = [
  '소행성 지대', '적 함대 전선', '폐허 정거장', '운석 회랑', '적 보급선',
  '전자 폭풍', '궤도 방어선', '침묵의 성역', '모함 외곽', '모함 최심부',
  '차원의 경계', '분열체 군집', '수호벽 지대', '혜성 폭류', '암흑 성운',
  '반란 함대', '플라스마 지옥', '파멸의 궤도', '최후 방어선', '심연의 관문',
  '기계 성역', '결정 동굴', '방전 회로', '기뢰 지대', '왜곡 성운',
  '강철 함대', '침묵의 기계신', '무한 회랑', '종말 관측소', '최종 결전',
];
