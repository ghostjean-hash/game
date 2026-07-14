// 게임 수치 정의 (매직넘버 SSOT). 밸런스 조정은 이 파일에서만.
// 색상은 colors.js, 발사 패턴 계산은 core/fire.js가 담당한다.

export const CFG = {
  player: { r: 14, speed: 340, fireEvery: 0.154, maxLives: 3, invAfterHit: 1.6, yRatio: 0.82 },
  // 적 출현 가로 영역: 화면(캔버스)이 넓어도 적 스폰 x를 중앙 고정폭 안으로 제한한다(사용자 지시 2026-07-10).
  //   width = 플레이필드 최대 가로폭(px). 화면이 이보다 좁으면 화면폭을 그대로 쓴다(min). 좌우 여백은 균등 분할.
  //   보너스 기체(화면 가로지르기)·보스(중앙 유영)는 예외 - 이 제한을 받지 않는다.
  field: { width: 960 },
  // 난이도 모드(시작 화면에서 선택). 어린이 모드는 적·보스 발사 주기를 배수로 늘려 총알을 덜 쏘게 하고,
  //   시작 화력도 조금 얹어 더 쉽게 출발한다.
  //   enemyFireMul = 적 발사 간격 배수(1 = 일반, 2.2 = 발사 간격 2.2배 → 총알 절반 이하). 탄 수·패턴은 그대로.
  //   startFront = 시작 메인 총알 수(front 값, 1 = 기본 1발), startTail = 시작 꼬리 비행기 대수(0 = 없음).
  //   enemyShotsMax = 적·보스의 조준 연발(gunner·turret·보스 3연발 등) 한 발 묶음의 탄 수 상한.
  //     어린이 모드는 1 = 여러 발 확산 조준을 정중앙 단발로 줄인다(사용자 지시 2026-07-10). 부채 방사 패턴은 제외.
  //   radialMul = 방사·자폭 탄(기뢰 자폭 파편·결정체 반사탄) 개수 배수. 조준 연발(enemyShotsMax)로 안 줄던
  //     21~30 이질 적의 방사 탄막을 어린이 모드에서 함께 감축한다(사용자 지시 2026-07-12). 1 = 감축 없음.
  //   maxLives = 목숨 최대값(= 시작 목숨 + 회복 상한). 어린이 모드는 5로 늘려 더 여유롭게(사용자 지시 2026-07-12).
  difficulty: {
    normal: { enemyFireMul: 1,   startFront: 1, startTail: 0, enemyShotsMax: 99, radialMul: 1,   maxLives: 3 },
    kid:    { enemyFireMul: 2.2, startFront: 2, startTail: 1, enemyShotsMax: 1,  radialMul: 0.4, maxLives: 5 },
  },
  // 무기 강화 = 발별 순차 진화 10단계(사용자 확정 2026-07-10). 강화 아이템마다 총알 하나씩 순차로 진화.
  //   메인·사이드는 가운데(안쪽)부터, 유도탄은 낮은 것부터. 각 탄 tier 0(무강화)~10. 형태는 단계마다 다른 패턴(view가 tier로 그린다).
  bullet: {
    // 사이드 총알·유도탄 속도는 강화 3단계마다 한 계단 빨라진다. 실제 = base * (1 + floor(tier/3) * speedPer3).
    //   메인 총알(전방화력)만 예외: 강화 단계와 무관하게 항상 speed 고정으로 발사한다(사용자 지시 2026-07-12).
    speed: 360, speedPer3: 0.15,
    // 메인 빔 크기: 단계(tier 0~10)로 길이·굵기 증가. 빔 형태 패턴은 view.drawMainBeam이 tier로 그린다.
    //   0강화·중간 단계 모두 절반으로 축소(사용자 지시 2026-07-10).
    // 반폭 W = mainWBase + tier*mainWPer. 가로 폭은 view가 cap(laneGap/2)로 잘라 옆칸 침범을 막는다.
    //   mainLenPer 1.5 = 단계가 오를수록 빔이 더 길어진다(물결 굽이 등 세로 무늬 여유, 뒤쪽 단계도 모두 그만큼 길게).
    mainLenBase: 13, mainLenPer: 1.5, mainWBase: 1.3, mainWPer: 0.2,
  },
  enemyBullet: { speed: 250, r: 5 },
  // 4계통 파워 파츠 (docs/05_power-parts.md). 전방 화력 / 옵션기 / 에너지존 / 꼬리 비행기.
  parts: {
    // 전방 화력(= 메인 총알): front 1~88 = 강화 단계. 사용자 확정 2026-07-10(발별 순차 - 총알 하나씩):
    //   1~8단계 = 발 1개씩 추가(1→8발). 9단계~ = 8발 고정, 가운데 탄부터 한 발씩 모양 진화(8스텝마다 그 탄 tier +1).
    //   tierMax = 모양 티어 최대(10), shapeDmg = 티어당 데미지 증가. rGrow=0(탄 크기 고정). vStagger = V자 대형.
    //   88 = 8(탄수) + 80(8발×10티어). 빔 형태 패턴은 view가 각 탄 tier로 그린다.
    front: { max: 88, rBase: 3.0, rGrow: 0, laneGap: 12, tierMax: 10, shapeDmg: 1, vStagger: 0.42 },
    option: {
      maxPerSide: 4,          // 좌우 각 4대 → 총 8대
      baseX: 30, stepX: 15,   // 안쪽부터 바깥으로 x 간격
      baseY: 4, stepY: 14,    // 슬롯 뒤로 갈수록 약간 아래
      follow: 9,              // 플레이어 추종 속도(초당 비율)
      // 8대 전부 레이저(= 사이드 총알). 8대 채운 뒤 안쪽(rank 0)부터 한 발씩 모양 진화(발별 순차, 8스텝마다 티어↑).
      //   옵션 수↑ → 굵기(laserR)·데미지 상승. 진화 tier↑ → 데미지·형태·속도 상승. 부채: laserDiagBase + slot×laserDiagStep.
      //   laserSpeed는 각 탄 tier로 3단계마다↑(fire.speedMul). 진화 최대 단계는 색 배열 길이로 산출(parts).
      laserEvery: 0.176, laserDmg: 1, laserDmgGrow: 0.5, laserSpeed: 640,
      laserR: 1.1, laserRGrow: 0.15, laserDiagBase: 6, laserDiagStep: 5.5,
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
    // 꼬리 비행기(T): 플레이어 뒤 유도탄 발사기. 4대 먼저 채운 뒤 1번→2번→…→4번 순서로 무기 진화(발별 순차, 사용자 확정).
    //   weapon 1(무강화)~11(10단계). 4대 후 가장 낮은 무기부터 한 단계씩. tier = weapon-1(0~10). 형태가 점→삼각→화살→미사일.
    //   배치: 세로 일렬 체인 - 각자 앞 개체를 개별 추종(뱀 꼬리처럼 출렁). 단계↑ → 유도탄 크기·데미지·속도 상승.
    tail: {
      maxCount: 4, weaponMax: 11,   // weapon 1~11 = 무강화 + 10단계
      gap: 10, r: 5.5, follow: 10,
      missileEvery: 2.7, missileSpeed: 240, missileTurn: 3.2, missileAccel: 520,
      missileR: 2.6, missileRGrow: 0.16, missileDmgBase: 3, missileDmgGrow: 1.5, // base↑(0강화 가시성)·grow↓로 만렙 크기는 유지
    },
  },
  // 친구 비행기(어린이 모드 전용, docs/09_friend.md). 메인 총알만 있고 강화 10단계로 부채꼴이 넓어진다.
  //   아이템은 플레이어와 공유(누가 먹든 level +1). hp 5개(플레이어 목숨과 별개). 피해는 각자, 회복(H)은 공유.
  friend: {
    maxHp: 5, levelMax: 10, startLevel: 0, r: 12,
    // 완전 독립 유영(플레이어 무관, 사용자 지시). 자기 세로 밴드(homeYRatio)에서 가까운 적 x로 스스로 이동.
    homeYRatio: 0.72, // 친구가 머무는 세로 위치. 플레이어(0.82)보다 위 = 별도 줄이라 겹쳐 헷갈리지 않는다
    follow: 3,        // 자기 목표로 이동하는 속도(초당 비율)
    bobSpeed: 3.2, bobAmp: 10, // 위아래 살짝 흔들림
    enterTime: 1.2,   // 날아 들어오는 동안(이 시간 지나야 발사 시작)
    reEnterTime: 0.6, // 부활 시 재정렬 시간
    inv: 1.2,         // 피격 후 무적(초)
    fireEvery: 0.22,  // 발사 주기
    bulletSpeed: 340,
    // 발 수 = shotsBase + level*shotsPerLevel(1~11), 총 부채각(도) = spreadBase + level*spreadPer.
    //   부채각은 좁게(사용자 "좌우로 너무 퍼진다") - 앞으로 모아 쏘되 레벨↑에 살짝만 넓어진다(만렙 ≈ 25도).
    shotsBase: 1, shotsPerLevel: 1, spreadBase: 5, spreadPer: 2,
    bulletR: 3, bulletRGrow: 0.12, dmgBase: 1, dmgGrow: 0.6, // 총알 크기 최소(사용자 "안 헷갈리게 최소로")
    speech: ['안녕!', '난 친구야', '같이 게임하자!'], speechEach: 1.1,
    reviveMsg: '다시 왔어!', reviveMsgTime: 1.4,
    // 플레이 중 가끔 이야기(사용자 지시): chatterEvery(+jitter)마다 한 줄을 chatterShowTime 동안 말풍선으로.
    chatter: ['좋아 좋아!', '이겨보자!', '내가 도와줄게', '잘한다!', '조심해!', '거의 다 왔어!', '재밌다!', '같이 하니까 좋아'],
    chatterEvery: 6, chatterJitter: 4, chatterShowTime: 1.6,
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
    // ── 2차 이질 적(docs/08 3.3·3.4). 연결선·체인 - 위치 잡기를 압박한다 ──
    // coil: 노드 2개가 전기 아크로 연결된 쌍. nodeGap 간격으로 나란히 하강, 두 노드 사이 아크 선(arcThick 두께)에
    //   플레이어가 닿으면 피해. 노드 하나를 부수면 아크가 사라진다(노드별 hp 낮음). 26구역부터.
    coil:     { r: 13, hp: 2, speed: 100, score: 250, nodeGap: 128, arcThick: 9 },
    // serpent: 머리 + 몸통 마디(segCount) 체인. 머리만 약점(몸통은 무적 - 아군탄을 막는다). 머리가 사인파
    //   (amp/freq)로 하강하고 몸통이 지연 추종해 구불거린다. 머리를 잡아야 전체가 격파된다. 28구역부터.
    serpent:  { r: 15, hp: 6, speed: 90,  score: 500, segCount: 5, segGap: 21, segFollow: 11, amp: 96, freq: 1.5 },
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
  // 중보스(1~29구역): 작고 hp 낮음 + 호위 비행체 주기 소환. 최종보스(30구역): 크고 단단한 2패턴.
  // hp는 3계통 화력 성장에 맞춰 상향(중보스 baseHp 55→90·구역당 22→32, 최종 420→980).
  miniBoss: { rx: 30, ry: 26, baseHp: 66, hpPerStage: 34, score: 900, escortEvery: 4.5, escortInit: 2 },
  // 최종보스는 30구역. 그때까지 화력이 최대로 성장하므로 hp를 크게 상향.
  finalBoss: { rx: 50, ry: 44, hp: 1500, score: 12000 },
  // spawnTop = 보스가 멈춰 서는 중심 y(상단 체력 바와 겹치지 않게 바 아래로 내린다). targetY = spawnTop + ry.
  // bobRamp = 등장 완료 후 좌우 유영이 0에서 최대 속도(bobFreq)까지 서서히 빨라지는 시간(초, 사용자 지시 2026-07-12).
  boss: { bobAmp: 0.32, bobFreq: 0.15, bobRamp: 7, spawnTop: 62 },
  // 부위 파괴형 보스(docs/06). 스타일 = 코어 + 부위(weapon 포탑 / shield 방어구).
  //   총 hp(miniBoss/finalBoss 공식)를 coreRatio(코어) + 각 부위 hpRatio 합으로 나눈다(합 = 1).
  //   role weapon = 자기 발사 패턴 보유(부수면 그 패턴 영구 정지). role shield = 코어를 가림(다 부수면 코어 노출).
  //   pattern: fan(아래 부채) / aim3(조준 3연발) / ring(원형 방사). ox/oy = 코어 기준 위치(px).
  //   orbit=true면 코어 주위 회전(초기각 angle + 공통 orbitR/orbitSpeed). shape = 렌더 형태. fireEvery = 발사 주기.
  //   corePattern/coreEvery = 코어 자체 공격(노출 시). enrage = sentinel 광폭화(부위 하나 깰 때마다 남은 weapon 주기 배수).
  //   partScore = 부위 하나 파괴 점수.
  bossStyles: {
    battleship: { coreRatio: 0.5, partScore: 200, parts: [
      { id: 'gunL', role: 'weapon', pattern: 'fan',  ox: -42, oy: 8, r: 14, hpRatio: 0.25, fireEvery: 1.5, shape: 'turret' },
      { id: 'gunR', role: 'weapon', pattern: 'aim3', ox:  42, oy: 8, r: 14, hpRatio: 0.25, fireEvery: 1.4, shape: 'turret' },
    ] },
    bio: { coreRatio: 0.34, partScore: 180, corePattern: 'aim3', coreEvery: 1.6, parts: [
      { id: 'armL', role: 'shield', ox: -38, oy: 4,   r: 13, hpRatio: 0.22, shape: 'tentacle' },
      { id: 'armR', role: 'shield', ox:  38, oy: 4,   r: 13, hpRatio: 0.22, shape: 'tentacle' },
      { id: 'armT', role: 'shield', ox:   0, oy: -34, r: 12, hpRatio: 0.22, shape: 'tentacle' },
    ] },
    orbiter: { coreRatio: 0.4, partScore: 160, corePattern: 'ring', coreEvery: 2.0, orbitR: 48, orbitSpeed: 1.3, parts: [
      { id: 'sh0', role: 'shield', orbit: true, angle: 0,      r: 12, hpRatio: 0.15, shape: 'shard' },
      { id: 'sh1', role: 'shield', orbit: true, angle: 1.5708, r: 12, hpRatio: 0.15, shape: 'shard' },
      { id: 'sh2', role: 'shield', orbit: true, angle: 3.1416, r: 12, hpRatio: 0.15, shape: 'shard' },
      { id: 'sh3', role: 'shield', orbit: true, angle: 4.7124, r: 12, hpRatio: 0.15, shape: 'shard' },
    ] },
    sentinel: { coreRatio: 0.3, partScore: 400, enrage: 0.72, parts: [
      { id: 'head',  role: 'weapon', pattern: 'ring', ox:   0, oy: -44, r: 16, hpRatio: 0.18, fireEvery: 2.2, shape: 'turret' },
      { id: 'armL',  role: 'weapon', pattern: 'fan',  ox: -54, oy: 2,   r: 15, hpRatio: 0.16, fireEvery: 1.5, shape: 'turret' },
      { id: 'armR',  role: 'weapon', pattern: 'aim3', ox:  54, oy: 2,   r: 15, hpRatio: 0.16, fireEvery: 1.4, shape: 'turret' },
      { id: 'chest', role: 'shield', ox:   0, oy: 16,  r: 20, hpRatio: 0.20, shape: 'plate' },
    ] },
  },
  // 구역 → 보스 스타일 매핑 경계(docs/06 §4). 이 구역부터 해당 스타일. 30(최종)은 sentinel 고정.
  bossStyleFrom: { bio: 11, orbiter: 21 },
  // 11구역~ 신규 적(splitter/shielder/rusher), 21구역~ 이질 기계 적(turret/prism/mine/warper). 30구역이 최종.
  stageCount: 30,
  // 11구역 이후 추가 체력 배수(신규 적 구간 난이도 가속). 최종 hp = 기존 스케일 × (구역>=11이면 이 배수).
  hardStage: { from: 11, hpMul: 1.35 },
  // 21구역 이후 추가 체력 배수(4계통 만렙 근접 구간 - 순삭 방지). hardStage 위에 곱해진다. dev 훅 실측 후 조정.
  //   coilFrom / serpentFrom = 2차 이질 적(연결선·체인)이 웨이브에 합류하는 구역(docs/08 - 후반 압박 가중).
  voidStage: { from: 21, hpMul: 1.7, coilFrom: 26, serpentFrom: 28 },
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
      // 전반 상향(2026-07-14 사용자 지시 "초보도 똑똑하게"): 예측 시간 sim·동시 위협 threats↑, 반응 react↓.
      //   실력 차이(단조 증가)는 유지. sim은 2단계 빔서치에서 각 수 sim/2초 지평이 된다.
      beginner:     { react: 0.30, aimDeg: 8,   sim: 0.9, threats: 7 },
      intermediate: { react: 0.25, aimDeg: 4,   sim: 1.3, threats: 10 },
      advanced:     { react: 0.20, aimDeg: 2,   sim: 1.7, threats: 14 },
      pro:          { react: 0.16, aimDeg: 0.8, sim: 2.1, threats: 999 },
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
