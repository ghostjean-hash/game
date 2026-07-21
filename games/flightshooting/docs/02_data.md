# 02 게임 데이터 (바푸리의 모험)

매직 넘버는 코드에 0개. 모든 수치는 `src/data/numbers.js`, 모든 게임 색상은 `src/data/colors.js`가 SSOT다. 이 문서는 스키마와 위치만 정의한다.

## 1. 수치 (`src/data/numbers.js` → `CFG`)

- `player`: r(반지름) / speed(키보드 이동 px/s) / fireEvery(발사 간격 s) / maxLives / invAfterHit(피격 무적 s) / yRatio(시작 세로 위치 비율).
- `emote`: cry / happy / deathTime(피격 우는 표정 지속 / 획득 웃는 표정 지속 / 목숨 0 후 폭발 연출→팝업까지, 초). `bombFlash`: B 획득 화면 섬광 지속(초).
- `difficulty`: {easy, normal, hard, insane}(홈 난이도 4단계). 각 항목 = enemyFireMul(적 발사 간격 배수, ↑=덜 쏨) / enemyHpMul(적 체력 배수) / startFront,startTail(시작 화력) / enemyShotsMax(조준 연발 상한, 1=정중앙 단발) / radialMul(방사·자폭 탄 개수 배수) / maxLives(목숨 최대, 쉬움5·보통3·어려움2·매우어려움1). '쉬움'만 옛 어린이 배려(단발·감축·시작 화력)를 갖는다.
- `bullet`: speed(기본 상승속도) / speedPer3(강화 3단계마다 속도 배수 증가, 0.15) / mainLenBase,mainLenPer(메인 빔 길이 = tier 비례) / mainWBase,mainWPer(메인 빔 반폭 = tier 비례). 메인 빔·사이드·유도탄의 **형태 배열은 폐기**됐고(`shapes`/`mainBeams` 삭제), 형태는 `render/view.js`가 각 총알의 `tier`로 직접 그린다. `enemyBullet`(speed, r).
- `parts.front`: max 66(= 6탄수 + 6발×10티어) / maxShots 6(진화 한 바퀴 스텝 수 = 최대 탄 수) / rBase / rGrow 0(개별 탄 크기 고정) / laneGap(나란히 간격) / tierMax 10(발별 진화 티어 최대) / shapeDmg(진화 1티어당 탄 데미지 증가, 1) / vStagger(V자 대형 세로 밀림 0.42). `parts.option`: maxPerSide 3 / baseX,stepX,baseY,stepY(배치) / follow(추종) / laserEvery,laserDmg,laserDmgGrow,laserSpeed,laserR,laserRGrow,laserDiagBase,laserDiagStep(6대 전부 레이저 + 발별 진화). `parts.tail`: maxCount 4 / weaponMax 11(무강화 + 10단계) / gap,r,follow(배치·추종) / missileEvery,missileSpeed,missileTurn,missileAccel / missileR 2.6,missileRGrow 0.16(0강화 가시성 확보 위해 base↑·grow↓로 만렙 크기는 유지) / missileDmgBase 3,missileDmgGrow 1.5. `parts.zone`: levelMax 5 / period[],maxRadius[],thick[](레벨 0~5 배열) / speed(파동 확장 px/s).
- `enemy.{drone,weaver,gunner}`: r / hp(구역1 기준) / speed(낙하 px/s) / score / (weaver amp,freq) / (gunner fireEvery).
- `enemyHpScale`: 0.28. 실제 hp = `ceil(base × (1 + (stage-1)×scale))` (spawn.js에서 구역별 적용).
- `drop`: chance(드롭 확률) / weights{P,S,E,T,H,B}(6종 배분, 합 1 - T 꼬리기 아이템 신규).
- `miniBoss`: rx,ry / baseHp / hpPerStage / score / escortEvery(호위 소환 간격) / escortInit(등장 시 호위 수).
- `finalBoss`: rx,ry / hp / score.
- `boss`: bobAmp / bobFreq(좌우 유영 폭·속도) / bobRamp / spawnTop.
- `bossStyles`: 스타일별(battleship/bio/orbiter/sentinel) coreRatio·부위(parts) 정의 + `upgrade`(강화판 - 추가 부위 extraParts + 발사 주기 배수 fireMul, 코어 배수 coreMul). `bossStyleFrom`{bio,orbiter}: 스타일 구역 경계. `bossUpgradeFrom`: 5(10구역 묶음 안에서 이 위치부터 강화판 = 뒤 5개).
- `autopilot`: default('pro' 기본 실력) / resumeDelay(0.5, 하이브리드 자동 복귀 지연 s) / tiers{beginner,intermediate,advanced,pro} 각 react·aimDeg·sim·threats(인간 실측 기준).
- `stageCount`: 30. `hardStage`: {from 11, hpMul 1.35}(신규 적 구간 추가 체력 배수). `voidStage`: {from 21, hpMul 1.7, coilFrom 26, serpentFrom 28}(이질 기계 구간 배수 + 2차 이질 적 합류 구역). `stageIntro`: 구역 시작 배너 표시 + 적 스폰 정지 시간(초). `starCount`: 배경 별 수.
- `STAGE_NAMES`: 구역 1~30 이름 배열.

## 2. 전방 화력 (`src/core/fire.js` → `frontSpec(front)`)

화력 레벨 front(1~66) → 탄별 `{ xOff: 중앙기준 가로위치(px), tier: 진화 티어(0~10), dmg }` 배열 반환. 메인 총알은 부채 없이 `laneGap` 간격으로 나란히 곧게 직진한다(측면·후방은 옵션기·꼬리기가 담당).
- shots(정면 갈래) = `min(front, 6)`. 7단계부터는 6발 고정.
- 탄 수 구간(front 1~6) baseDmg = `1 + floor((shots-1)/2)` → 1,1,2,2,3,3. 개별 탄은 크기·모양·색 동일.
- 진화 구간(front 7~66): `evoSteps = max(0, front-6)`를 중앙 근접 순번(`centerRanks`)에 분배. rank번째로 안쪽인 탄은 `evoSteps >= rank+1`일 때부터 진화하고, 이후 6스텝마다 tier +1(최대 `tierMax` 10). 가운데 탄이 먼저 진화해 바깥 탄보다 세다.
- 탄별 dmg = `baseDmg + tier × shapeDmg`. 속도 = `bullet.speed × speedMul(tier)`, `speedMul = 1 + floor(tier/3) × speedPer3`(3단계마다 계단 상승).
- r = `rBase + baseDmg*rGrow`, rGrow=0이라 개별 탄 크기 고정. 바깥 탄일수록 `vStagger`만큼 살짝 뒤(아래)로 밀려 V자 대형.
- 빔 형태는 `render/view.js`가 각 탄 tier로 직접 그린다(실선~플라즈마 10단계, 아군 냉색 `mainTier`로 적탄과 구분). 옵션기(레이저)·에너지존·꼬리기(유도탄) 로직은 `src/core/parts.js` → 05_power-parts.md.

## 3. 색상 (`src/data/colors.js` → `COLORS`)

- player / playerCore / engine.
- bullet(+glow, 기본 시안) / bulletShapeTier[](사이드 총알 S 진화 티어별 색, tier 0~10, 둥근 계열 냉색) / mainTier[](메인 총알 P 빔 진화 티어별 색, tier 0~10) / enemyBullet(+core,+glow) / star.
- hitSpark / clearSpark / playerHitSpark.
- enemy.{drone,weaver,gunner,gunnerEye}.
- boss.{mini,final,gunMini,gunFinal,coreDark,coreLight}.
- powerup.{P,S,E,T,H,B} (T 꼬리기 아이템 신규).
- option / laser / zone (옵션기·에너지존 색).
- tail(꼬리기 본체) / tailMissile3[](유도탄 몸체 3색 순환, `tier%3`) / missileTrail / zoneRgbByLevel[](에너지존 레벨별 색 1~5).
- warawara / warawaraGlow / warawaraEye / warawaraMouth(붉은 O 입) / warawaraTear(파란 눈물) - 플레이어 바푸리. totoro.{laser,missile,belly,eye} - 옵션기.
- friend.{body,glow,beak,eye,hpPip,shot,shotCore} - 친구 키위새(09_friend.md).
- bomb / bombFuse / bombSpark / bombFlash - B 폭탄 아이템 몸·도화선·불꽃·획득 섬광.

UI(메뉴/HUD/버튼) 색·간격·폰트는 게임 데이터가 아니라 `styles/main.css` + 공유 `shared/tokens.css` CSS 변수 담당(역할 분리).

## 4. 저장 스키마 (localStorage)

- 네임스페이스: `gg.flightshooting.` (`shared/storage.js`).
- `best`: number - 최고 점수.
