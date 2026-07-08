# 02 게임 데이터 (Sky Raider)

매직 넘버는 코드에 0개. 모든 수치는 `src/data/numbers.js`, 모든 게임 색상은 `src/data/colors.js`가 SSOT다. 이 문서는 스키마와 위치만 정의한다.

## 1. 수치 (`src/data/numbers.js` → `CFG`)

- `player`: r(반지름) / speed(키보드 이동 px/s) / fireEvery(발사 간격 s) / maxLives / invAfterHit(피격 무적 s) / yRatio(시작 세로 위치 비율).
- `bullet.speed`, `bullet.shapes[]`(P 진화 티어별 렌더 배율, 인덱스 0=기본 + 1~4 진화 티어: 각 원소 `{ry}`=세로 배율 미세 증가, 크기 급증 금지). `enemyBullet`(speed, r).
- `parts.front.max`: 40(= 8 + 진화티어수 4 × 8발), `parts.front.rGrow`: 0(개별 탄 크기 고정), `parts.front.shapeDmg`(진화 1티어당 탄 데미지 증가, 기본 1). `parts.option`: maxPerSide 4 / baseX,stepX,baseY,stepY(배치) / follow(추종) / laserEvery,laserDmg,laserDmgGrow,laserSpeed,laserR,laserRGrow(8대 전부 레이저, 미사일 제거). `parts.tail`(신규): maxCount 4 / 배치·추종 / 무기 4단계별 missileR·missileRGrow·missileDmgBase·missileDmgGrow / missileEvery,missileSpeed,missileTurn,missileAccel. `parts.zone`: radius[0~5] / tick(0.5s).
- `enemy.{drone,weaver,gunner}`: r / hp(구역1 기준) / speed(낙하 px/s) / score / (weaver amp,freq) / (gunner fireEvery).
- `enemyHpScale`: 0.28. 실제 hp = `ceil(base × (1 + (stage-1)×scale))` (spawn.js에서 구역별 적용).
- `drop`: chance(드롭 확률) / weights{P,S,E,T,H,B}(6종 배분, 합 1 - T 꼬리기 아이템 신규).
- `miniBoss`: rx,ry / baseHp / hpPerStage / score / escortEvery(호위 소환 간격) / escortInit(등장 시 호위 수).
- `finalBoss`: rx,ry / hp / score.
- `boss`: bobAmp / bobFreq(좌우 유영 폭·속도).
- `stageCount`: 10. `stageIntro`: 구역 시작 배너 표시 + 적 스폰 정지 시간(초). `starCount`: 배경 별 수.
- `STAGE_NAMES`: 구역 1~10 이름 배열.

## 2. 전방 화력 (`src/core/fire.js` → `frontSpec(front)`)

화력 레벨 front(1~40) → 탄별 `{ angle: 각도(도), tier: 진화 티어(0~4), dmg }` 배열. 정면 부채만(측면·후방은 옵션기·꼬리기가 담당).
- shots(정면 갈래) = `min(front, 8)`. 9단계부터는 8발 고정.
- 탄 수 구간(front 1~8) baseDmg = `1 + floor((L-1)/2)` → 1,1,2,2,3,3,4,4. 개별 탄은 크기·모양·색 동일. 진화 구간(front 9~40)은 각 탄이 자기 진화 티어를 가진다.
- 탄별 dmg = `P8 기준(4) + 그 탄 tier × shapeDmg`. 가운데 탄이 먼저 진화해 바깥 탄보다 세다.
- 발별 진화 티어는 `evoSteps = max(0, front-8)`를 중앙 근접 순번 8발에 분배(05_power-parts.md 1.1.1 공식). 티어는 아군 차가운색(시안·흰·하늘·민트) + 글로우 계단으로 즉시 구분(적탄과 안 겹침).
- r = `rBase + baseDmg*rGrow`, rGrow=0이라 개별 탄 크기 고정. 부채폭 = `min((min(front,8)-1)*7, 84)`.
- 옵션기(레이저)·에너지존·꼬리기(유도탄) 로직은 `src/core/parts.js` → 05_power-parts.md.

## 3. 색상 (`src/data/colors.js` → `COLORS`)

- player / playerCore / engine.
- bullet(+glow, 기본 시안) / bulletShapeTier[](진화 티어별 차가운색: 순백·하늘·민트·흰빛시안) / enemyBullet(+glow) / star.
- hitSpark / clearSpark / playerHitSpark.
- enemy.{drone,weaver,gunner,gunnerEye}.
- boss.{mini,final,gunMini,gunFinal,coreDark,coreLight}.
- powerup.{P,S,E,T,H,B} (T 꼬리기 아이템 신규).
- option / laser / zone (옵션기·에너지존 색).
- tail / tailMissileByStage[](꼬리 비행기·무기 4단계별 유도탄 색) / missileTrail.

UI(메뉴/HUD/버튼) 색·간격·폰트는 게임 데이터가 아니라 `styles/main.css` + 공유 `shared/tokens.css` CSS 변수 담당(역할 분리).

## 4. 저장 스키마 (localStorage)

- 네임스페이스: `gg.flightshooting.` (`shared/storage.js`).
- `best`: number - 최고 점수.
