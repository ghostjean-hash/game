// 게임 수치 정의 (매직넘버 SSOT). 밸런스 조정은 이 파일에서만.
// 색상은 colors.js, 발사 패턴 계산은 core/fire.js가 담당한다.

export const CFG = {
  player: { r: 14, speed: 340, fireEvery: 0.154, maxLives: 3, invAfterHit: 1.6, yRatio: 0.82 },
  // 표정·죽는 연출 시간(초). emoCry = 총알 맞았을 때 우는 표정 지속, emoHappy = 아이템 먹었을 때 웃는 표정 지속.
  //   deathTime = 목숨이 0이 됐을 때 폭발 연출을 보여주고 결과 팝업을 띄우기까지의 시간(사용자 지시 2026-07-16).
  emote: { cry: 1.2, happy: 0.9, deathTime: 1.1 },
  // B(봄) 획득 시 화면 전체에 번지는 은은한 폭발 섬광 지속(초). 폭탄임을 눈에 알리는 연출.
  bombFlash: 0.55,
  // 적 출현 가로 영역: 화면(캔버스)이 넓어도 적 스폰 x를 중앙 고정폭 안으로 제한한다(사용자 지시 2026-07-10).
  //   width = 플레이필드 최대 가로폭(px). 화면이 이보다 좁으면 화면폭을 그대로 쓴다(min). 좌우 여백은 균등 분할.
  //   보너스 기체(화면 가로지르기)·보스(중앙 유영)는 예외 - 이 제한을 받지 않는다.
  field: { width: 960 },
  // 난이도(시작 화면에서 선택, 사용자 지시 2026-07-16). 쉬움/보통/어려움/매우 어려움 4단계.
  //   난이도가 함께 바꾸는 3축 = 적이 쏘는 총알 양(enemyFireMul) + 적 체력(enemyHpMul) + 내 목숨(maxLives).
  //   쉬움일수록 적이 덜 쏘고, 적 체력이 낮고, 목숨이 많다. 매우 어려움은 반대.
  //   '쉬움'은 옛 어린이 모드의 배려(정중앙 단발 사격·시작 화력·방사 탄 감축)를 그대로 흡수한다(사용자 확정).
  //   친구 비행기는 더 이상 난이도에 묶이지 않는다 - 홈의 '친구 동행' 토글로 어느 난이도든 켤 수 있다.
  //   enemyFireMul = 적 발사 간격 배수(1 = 보통, 2.2 = 간격 2.2배 → 총알 절반 이하, 0.5 = 간격 절반 → 두 배로 쏨).
  //   enemyHpMul   = 잡몹 체력 배수(구역 스케일 위에 곱함). 보스 체력은 별도 공식이라 이 배수 미적용.
  //   startFront   = 시작 메인 총알 수(1 = 기본 1발), startTail = 시작 꼬리 비행기 대수(0 = 없음).
  //   enemyShotsMax= 적·보스 조준 연발(gunner·turret·보스 3연발 등) 한 묶음 탄 수 상한(1 = 정중앙 단발화, 99 = 제한 없음).
  //   radialMul    = 방사·자폭 탄(기뢰 파편·결정체 반사탄) 개수 배수(1 = 감축 없음, 0.4 = 감축).
  //   maxLives     = 목숨 최대값(= 시작 목숨 + 회복 상한).
  difficulty: {
    easy:   { enemyFireMul: 2.2, enemyHpMul: 0.85, startFront: 2, startTail: 1, enemyShotsMax: 1,  radialMul: 0.4, maxLives: 5 },
    normal: { enemyFireMul: 1,   enemyHpMul: 1,    startFront: 1, startTail: 0, enemyShotsMax: 99, radialMul: 1,   maxLives: 3 },
    hard:   { enemyFireMul: 0.7, enemyHpMul: 1.3,  startFront: 1, startTail: 0, enemyShotsMax: 99, radialMul: 1,   maxLives: 3 },
    insane: { enemyFireMul: 0.5, enemyHpMul: 1.6,  startFront: 1, startTail: 0, enemyShotsMax: 99, radialMul: 1,   maxLives: 3 },
  },
  // 무기 강화 = 발별 순차 진화 10단계(사용자 확정 2026-07-10). 강화 아이템마다 총알 하나씩 순차로 진화.
  //   메인·사이드는 가운데(안쪽)부터, 유도탄은 낮은 것부터. 각 탄 tier 0(무강화)~10. 형태는 단계마다 다른 패턴(view가 tier로 그린다).
  bullet: {
    // 사이드 총알·유도탄 속도는 강화 3단계마다 한 계단 빨라진다. 실제 = base * (1 + floor(tier/3) * speedPer3).
    //   메인 총알(전방화력)만 예외: 강화 단계와 무관하게 항상 speed 고정으로 발사한다(사용자 지시 2026-07-12).
    speed: 432, speedPer3: 0.15, // 메인 총알·키위새 총알 발사 속도(사이드·유도탄은 별도 값). 360→432(120%, 사용자 지시)
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
  // 친구 비행기(어린이 모드 전용, docs/09_friend.md). 키위새 모양. 회색 직선 레이저만 쏜다(강화 10단계).
  //   아이템은 플레이어와 공유(누가 먹든 level +1). hp 5개(플레이어 목숨과 별개). 피해는 각자, 회복(H)은 공유.
  friend: {
    maxHp: 5, levelMax: 10, startLevel: 0, r: 12,
    startXRatio: 0.16, // 등장 시작 x(화면 폭 비율). 화면 안 왼쪽 = 밖으로 안 나간다(사용자 지시)
    // 이동: 플레이어 자동조종과 같은 빔서치 AI로 회피+조준(docs/09 3장). 이동 속도는 플레이어와 동일(CFG.player.speed).
    homeYRatio: 0.80, // 친구가 머무는 세로 위치(화면 하단부 = 적 경로 끝자락). 여기서 조준+회피가 양립한다.
                      // 너무 위(적 경로 한복판)면 늘 위험 판정이라 회피만 하고 조준을 못 한다(플레이어 0.82 바로 위)
    decideEvery: 0.15, // 목표를 새로 계산하는 주기(초). 그 사이엔 정한 방향 유지(플레이어 AI와 동일)
    aiDeadzone: 12,    // 안전할 때 이 픽셀 이내 목표 편차는 무시(떨림 방지)
    aiSim: 0.7,        // 앞을 내다보는 시간(초). 플레이어(1.5)보다 짧게 = 먼 적은 위협으로 안 보고 조준 유지,
                       //   코앞 위협만 회피(hp 5개라 좀 더 대담하게 싸운다). 너무 짧으면 회피 늦어 잘 맞는다
    enterTime: 1.2,    // 날아 들어오는 동안(이 시간 지나야 발사 시작)
    reEnterTime: 0.6,  // 부활 시 재정렬 시간
    inv: 1.2,          // 피격 후 무적(초)
    // 발사: 회색 직선 발사체(부리 모양, 부채 확산 없음). 발 수 = min(shotsMax, shotsBase+level)(최대 4).
    //   강화해도 개별 총알 외형(길이·색·크기)은 고정, 발 수와 데미지만 증가(사용자 지시). 만렙에서도 직선 유지.
    //   발사 속도는 플레이어 메인 총알과 동일(CFG.bullet.speed - 별도 값 두지 않음, 사용자 지시).
    fireEvery: 0.22,
    shotsBase: 1, shotsMax: 4, laneGap: 11, // 발사체 최대 4발(사용자 지시). laneGap = 나란한 발사체 사이 가로 간격
    beamW: 2.6, beamLen: 24, // 발사체 폭(충돌 반경)·길이 - 강화해도 고정(외형 불변, 사용자 지시)
    dmgBase: 1, dmgGrow: 0.6, // 데미지만 강화로 증가(파워)
    mergeDist: 20, mergeRadius: 11, // 플레이어 메인 총알과 겹칠 때 합체 발광: 이 거리 안이면 중간에 발광(반경)
    speech: ['안녕!', '난 친구야', '같이 게임하자!'], speechEach: 1.1,
    // 대사 3종(사용자 지시 - 앵무새 반복 금지). 상황마다 다양한 표현에서 매번 다르게 고른다.
    // 1) 맞았을 때  2) 플레이어가 살려줬을 때  3) 적을 연달아 잡아 잘했을 때.
    hitMsgs: ['아야!', '으악 맞았어!', '아 따가워!', '방금 위험했다!', '큭... 아직 버텨!', '아파아파!', '조심했어야 했는데!', '괜찮아, 쌩쌩해!'],
    hitMsgTime: 1.3,
    reviveMsgs: ['다시 왔어!', '고마워, 살려줘서!', '덕분에 살았어!', '역시 넌 최고야!', '다시 힘내볼게!', '이제 갚아줄 차례야!', '부활 완료!', '너 없으면 큰일 날 뻔!'],
    reviveMsgTime: 1.4,
    // 잘했을 때: 짧은 시간(praiseWindow) 안에 적 praiseKills마리 이상 처치 + 마지막 칭찬 후 praiseCooldown초
    //   지났을 때만 칭찬 한 줄(연달아 쏟아지지 않게). 강화되면 적을 우수수 잡아 자주 나오던 걸 억제.
    praiseMsgs: ['우와 잘한다!', '완전 멋져!', '대박이야!', '이 기세로 가자!', '너 진짜 잘한다!', '적들이 쓸려나가!', '환상적이야!', '역시 에이스!'],
    praiseShowTime: 1.5, praiseKills: 8, praiseWindow: 2.5, praiseCooldown: 12,
    // 평상시 잡담(인트로 후 가끔): chatterEvery(+jitter)마다 한 줄을 chatterShowTime 동안. 너무 잦지 않게 뜸하게.
    chatter: ['좋아 좋아!', '이겨보자!', '내가 도와줄게', '재밌다!', '같이 하니까 좋아', '거의 다 왔어!', '집중하자!', '우리 팀 최고!'],
    chatterEvery: 18, chatterJitter: 12, chatterShowTime: 1.6,
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
    // ── 31~40 구역 전용 신규 적(docs/12). 빛·에너지 생명체 - 곡선·발광·반투명으로 정령(둥근 유기체)·기계(각진 강철)와 확연히 대비 ──
    // wisp: 도깨비불 - 지그재그(사인)로 부유 하강하며 splitEvery마다 작은 자식 도깨비불을 낳는다(splitMax까지). 약하고 빠름.
    //   childScale = 자식 크기 비율(부모보다 작다). 자식은 재분열하지 않는다.
    wisp:   { r: 13, hp: 2, speed: 96,  score: 300, amp: 62, freq: 3.0, splitEvery: 1.5, splitMax: 2, childScale: 0.6 },
    // jelly: 빛해파리 - 느리게 하강하며 좌우로 부드럽게 유영(sway). 발사 없이 접촉 피해만(느린 대신 크고 단단).
    jelly:  { r: 22, hp: 6, speed: 54,  score: 450, sway: 0.9, swayAmp: 24 },
    // bloom: 빛꽃 - 잠깐 하강 후 멈춰 방사형 탄을 '개화'하고 다시 하강하기를 반복. petals = 개화 꽃잎(탄) 수(radialMul 반영).
    //   descendTime = 첫 하강 시간, holdTime = 개화(정지) 유지, bloomEvery = 재개화까지 하강 주기.
    bloom:  { r: 17, hp: 4, speed: 72,  score: 400, descendTime: 1.2, holdTime: 0.8, bloomEvery: 2.2, petals: 12, petalSpeed: 175 },
    // whale: 빛고래 - 크고 느린 유영체. 좌우 곡선 유영(driftAmp/driftFreq) + 하강, 발광 약점 코어. 매우 단단(대형).
    whale:  { r: 30, hp: 14, speed: 40, score: 900, driftAmp: 70, driftFreq: 0.6, fireEvery: 2.4, shots: 3, spread: 38 },
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
  // 중보스(1~39구역): 작고 hp 낮음 + 호위 비행체 주기 소환. 최종보스(40구역): 크고 단단한 2패턴.
  // hp는 3계통 화력 성장에 맞춰 상향(중보스 baseHp 55→90·구역당 22→32, 최종 420→980).
  miniBoss: { rx: 30, ry: 26, baseHp: 66, hpPerStage: 34, score: 900, escortEvery: 4.5, escortInit: 2 },
  // 최종보스는 40구역. 그때까지 화력이 최대로 성장하므로 hp를 크게 상향.
  finalBoss: { rx: 50, ry: 44, hp: 1500, score: 12000 },
  // spawnTop = 보스가 멈춰 서는 중심 y(상단 체력 바와 겹치지 않게 바 아래로 내린다). targetY = spawnTop + ry.
  // bobRamp = 등장 완료 후 좌우 유영이 0에서 최대 속도(bobFreq)까지 서서히 빨라지는 시간(초, 사용자 지시 2026-07-12).
  boss: { bobAmp: 0.32, bobFreq: 0.15, bobRamp: 7, spawnTop: 62 },
  // 보스 사망 연출: 즉시 사라지지 않고 dur초 동안 몸 전체에서 연쇄 폭발 + 화면 흔들림, 끝에 큰 폭발.
  //   burstEvery=연쇄 폭발 간격(초), burstN=폭발당 파티클, shake=화면 흔들림 최대 픽셀, dur/finalDur=중보스/최종보스 연출 길이.
  bossDeath: { burstEvery: 0.1, burstN: 16, shake: 13, dur: 1.6, finalDur: 2.8, finalBurstN: 52 },
  // 부위 파괴형 보스(docs/06). 스타일 = 코어 + 부위(weapon 포탑 / shield 방어구).
  //   총 hp(miniBoss/finalBoss 공식)를 coreRatio(코어) + 각 부위 hpRatio 합으로 나눈다(합 = 1).
  //   role weapon = 자기 발사 패턴 보유(부수면 그 패턴 영구 정지). role shield = 코어를 가림(다 부수면 코어 노출).
  //   pattern: fan(아래 부채) / aim3(조준 3연발) / ring(원형 방사). ox/oy = 코어 기준 위치(px).
  //   orbit=true면 코어 주위 회전(초기각 angle + 공통 orbitR/orbitSpeed). shape = 렌더 형태. fireEvery = 발사 주기.
  //   corePattern/coreEvery = 코어 자체 공격(노출 시). enrage = sentinel 광폭화(부위 하나 깰 때마다 남은 weapon 주기 배수).
  //   partScore = 부위 하나 파괴 점수.
  // 각 스타일의 강화판(upgrade): 후반 5구역(6~10·16~20·26~30)에서 적용. 사용자 지시 2026-07-16.
  //   extraParts = 추가로 붙는 부위(겉모습·화력 강화), fireMul = 부위 발사 주기 배수(<1 = 더 자주),
  //   coreMul = 코어 자체 공격 주기 배수. hp는 spawnBoss가 (코어+전체 부위) 비율 합으로 정규화한다.
  bossStyles: {
    battleship: { coreRatio: 0.5, partScore: 200, parts: [
      { id: 'gunL', role: 'weapon', pattern: 'fan',  ox: -42, oy: 8, r: 14, hpRatio: 0.25, fireEvery: 1.5, shape: 'turret' },
      { id: 'gunR', role: 'weapon', pattern: 'aim3', ox:  42, oy: 8, r: 14, hpRatio: 0.25, fireEvery: 1.4, shape: 'turret' },
    ], upgrade: { fireMul: 0.7, extraParts: [
      { id: 'gunT', role: 'weapon', pattern: 'ring', ox: 0, oy: -34, r: 13, hpRatio: 0.22, fireEvery: 1.7, shape: 'turret' },
    ] } },
    bio: { coreRatio: 0.34, partScore: 180, corePattern: 'aim3', coreEvery: 1.6, parts: [
      { id: 'armL', role: 'shield', ox: -38, oy: 4,   r: 13, hpRatio: 0.22, shape: 'tentacle' },
      { id: 'armR', role: 'shield', ox:  38, oy: 4,   r: 13, hpRatio: 0.22, shape: 'tentacle' },
      { id: 'armT', role: 'shield', ox:   0, oy: -34, r: 12, hpRatio: 0.22, shape: 'tentacle' },
    ], upgrade: { fireMul: 0.7, coreMul: 0.7, extraParts: [
      { id: 'armW', role: 'weapon', pattern: 'fan', ox: 0, oy: 34, r: 12, hpRatio: 0.2, fireEvery: 1.5, shape: 'tentacle' },
    ] } },
    orbiter: { coreRatio: 0.4, partScore: 160, corePattern: 'ring', coreEvery: 2.0, orbitR: 48, orbitSpeed: 1.3, parts: [
      { id: 'sh0', role: 'shield', orbit: true, angle: 0,      r: 12, hpRatio: 0.15, shape: 'shard' },
      { id: 'sh1', role: 'shield', orbit: true, angle: 1.5708, r: 12, hpRatio: 0.15, shape: 'shard' },
      { id: 'sh2', role: 'shield', orbit: true, angle: 3.1416, r: 12, hpRatio: 0.15, shape: 'shard' },
      { id: 'sh3', role: 'shield', orbit: true, angle: 4.7124, r: 12, hpRatio: 0.15, shape: 'shard' },
    ], upgrade: { fireMul: 0.7, coreMul: 0.7, extraParts: [
      { id: 'gunT', role: 'weapon', pattern: 'fan', ox: 0, oy: -44, r: 13, hpRatio: 0.2, fireEvery: 1.6, shape: 'turret' },
    ] } },
    sentinel: { coreRatio: 0.3, partScore: 400, enrage: 0.72, parts: [
      { id: 'head',  role: 'weapon', pattern: 'ring', ox:   0, oy: -44, r: 16, hpRatio: 0.18, fireEvery: 2.2, shape: 'turret' },
      { id: 'armL',  role: 'weapon', pattern: 'fan',  ox: -54, oy: 2,   r: 15, hpRatio: 0.16, fireEvery: 1.5, shape: 'turret' },
      { id: 'armR',  role: 'weapon', pattern: 'aim3', ox:  54, oy: 2,   r: 15, hpRatio: 0.16, fireEvery: 1.4, shape: 'turret' },
      { id: 'chest', role: 'shield', ox:   0, oy: 16,  r: 20, hpRatio: 0.20, shape: 'plate' },
    ] },
  },
  // 구역 → 보스 스타일 매핑 경계(docs/06 §4). 이 구역부터 해당 스타일. 40(최종)은 sentinel 고정.
  //   31~39는 세 부위파괴형(battleship/bio/orbiter)을 순환 재활용한다(spawn.bossStyleFor).
  bossStyleFrom: { bio: 11, orbiter: 21 },
  // 강화판 경계: 10구역 묶음 안에서 이 위치(0-based)부터 강화판 보스. 5 = 각 묶음의 뒤 5개(6~10·16~20·26~30).
  bossUpgradeFrom: 5,
  // 11구역~ 신규 적(splitter/shielder/rusher), 21구역~ 이질 기계 적(turret/prism/mine/warper),
  //   31구역~ 빛·에너지 생명체(wisp/jelly/bloom/whale, docs/12). 40구역이 최종.
  stageCount: 40,
  // 11구역 이후 추가 체력 배수(신규 적 구간 난이도 가속). 최종 hp = 기존 스케일 × (구역>=11이면 이 배수).
  hardStage: { from: 11, hpMul: 1.35 },
  // 21구역 이후 추가 체력 배수(4계통 만렙 근접 구간 - 순삭 방지). hardStage 위에 곱해진다. dev 훅 실측 후 조정.
  //   coilFrom / serpentFrom = 2차 이질 적(연결선·체인)이 웨이브에 합류하는 구역(docs/08 - 후반 압박 가중).
  voidStage: { from: 21, hpMul: 1.7, coilFrom: 26, serpentFrom: 28 },
  // 31구역 이후 추가 체력 배수(빛 생명체 구간 - 최종 10구역 난이도). voidStage 위에 곱해진다. dev 훅 실측 후 조정.
  aeonStage: { from: 31, hpMul: 1.3 },
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
    default: 'pro', // 자동 플레이 AI 기본 실력(사용자 지시 2026-07-16). 환경설정에서 바꿀 수 있다.
    // 자동 플레이(보조) 켠 상태에서 손으로 조작하면 그동안 수동, 손을 떼면 resumeDelay초 뒤 자동으로 복귀한다
    //   (하이브리드 조작, 사용자 지시 2026-07-16). 조작 중엔 계속 수동 유지, 마지막 조작 후 이 시간이 지나야 자동.
    resumeDelay: 0.5,
    tiers: {
      // 전반 상향(2026-07-14 사용자 지시 "초보도 똑똑하게"): 예측 시간 sim·동시 위협 threats↑, 반응 react↓.
      //   실력 차이(단조 증가)는 유지. sim은 2단계 빔서치에서 각 수 sim/2초 지평이 된다.
      beginner:     { react: 0.30, aimDeg: 8,   sim: 0.9, threats: 7 },
      intermediate: { react: 0.25, aimDeg: 4,   sim: 1.3, threats: 10 },
      advanced:     { react: 0.20, aimDeg: 2,   sim: 1.7, threats: 14 },
      pro:          { react: 0.16, aimDeg: 0.8, sim: 2.1, threats: 999 },
    },
  },
  // 세계 여행(docs/10): 구역 보스 격파 후 세계지도가 떠 다음 목적지(이웃 나라)를 고른다.
  //   flyTime = 목적지로 비행기가 날아가는 연출(초), cardTime = 도착 후 '나라-수도' 카드 표시(초).
  //   지도는 세계 전체가 아니라 현재 위치+후보를 감싸는 영역으로 확대해 핀을 손가락으로 누를 수 있게 한다(사용자 지시).
  //     zoomPad = 확대 영역 여백(지도 좌표), zoomMinW = 최소 가로폭(너무 확대 방지), aspect = 지도 창 가로:세로 비율.
  //     zoomRefW = 화면 기준 폭(px) - 확대해도 핀·글자가 이 폭 기준 일정 픽셀로 보이게 크기를 역보정한다.
  //   mark = 지도 위 도시 마크 크기(지도 좌표, 렌더 시 확대배율 s를 곱함). 상태별로 점 크기·라벨 폰트를 달리한다.
  //     cur=현재 위치, cand=고를 수 있는 이웃, visited=지나온 곳, other=아직 안 간 나머지. name=나라이름 폰트, cap=수도 폰트.
  //     labelGap=점과 수도라벨 세로 간격. zoomStep=확대/축소 버튼 배율, zoomWMin/Max=viewBox 가로폭 한계(확대·축소 상한).
  tour: {
    enabled: true, flyTime: 1.4, cardTime: 1.6, zoomPad: 40, zoomMinW: 260, aspect: 1.35, zoomRefW: 560,
    mark: {
      // name(나라이름) = 기존 값의 70%로 축소(사용자 지시). cap(수도)·dot은 유지.
      cur: { dot: 8, name: 7.7, cap: 15 },
      cand: { dot: 11, name: 7.7, cap: 15 },
      visited: { dot: 5, name: 5.95, cap: 10 },
      other: { dot: 3, name: 5.25, cap: 8 },
      labelGap: 4,
      nameLift: 5, // 나라이름(윗줄)을 수도 위로 추가로 올리는 화면 px(사용자 지시)
    },
    zoomStep: 1.35, zoomWMin: 90, zoomWMax: 1400,
    bossDeathTime: 1.5, // 보스 격파 후 폭발 연출을 보여주고 이 시간 뒤에 지도를 띄운다(사용자 지시)
    borderW: 0.9, // 국가 경계선 굵기(지도 좌표, s 곱) - 잘 보이게 키움(사용자 지시)
  },
};

// 구역 이름 (1~40). 11~ 미지의 심우주, 21~ 이질 기계 문명, 31~ 빛·에너지 생명체 - 구간마다 완전 다른 적들이 출현한다.
export const STAGE_NAMES = [
  '소행성 지대', '적 함대 전선', '폐허 정거장', '운석 회랑', '적 보급선',
  '전자 폭풍', '궤도 방어선', '침묵의 성역', '모함 외곽', '모함 최심부',
  '차원의 경계', '분열체 군집', '수호벽 지대', '혜성 폭류', '암흑 성운',
  '반란 함대', '플라스마 지옥', '파멸의 궤도', '최후 방어선', '심연의 관문',
  '기계 성역', '결정 동굴', '방전 회로', '기뢰 지대', '왜곡 성운',
  '강철 함대', '침묵의 기계신', '무한 회랑', '종말 관측소', '기계 심연',
  '여명의 성단', '빛의 해류', '오로라 회랑', '광휘의 정원', '성광 군무',
  '프리즘 바다', '백광 지대', '영광의 문', '창천의 눈', '최종 결전',
];
