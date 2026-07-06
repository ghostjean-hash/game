# 02 게임 데이터 (Sky Raider)

매직 넘버는 코드에 0개. 모든 수치는 `src/data/numbers.js`, 모든 게임 색상은 `src/data/colors.js`가 SSOT다. 이 문서는 스키마와 위치만 정의한다.

## 1. 수치 (`src/data/numbers.js` → `CFG`)

- `player`: r(반지름) / speed(키보드 이동 px/s) / fireEvery(발사 간격 s) / maxLives / invAfterHit(피격 무적 s) / yRatio(시작 세로 위치 비율).
- `bullet.speed`, `enemyBullet`(speed, r).
- `parts.front.max`: 8. `parts.option`: maxPerSide 4 / baseX,stepX,baseY,stepY(배치) / follow(추종) / laserEvery,laserDmg,laserSpeed / missileEvery,missileDmg,missileSpeed,missileTurn,missileAccel. `parts.zone`: radius[0~5] / tick(0.5s).
- `enemy.{drone,weaver,gunner}`: r / hp(구역1 기준) / speed(낙하 px/s) / score / (weaver amp,freq) / (gunner fireEvery).
- `enemyHpScale`: 0.28. 실제 hp = `ceil(base × (1 + (stage-1)×scale))` (spawn.js에서 구역별 적용).
- `drop`: chance(드롭 확률) / weights{P,S,E,H,B}(5종 배분, 합 1).
- `miniBoss`: rx,ry / baseHp / hpPerStage / score / escortEvery(호위 소환 간격) / escortInit(등장 시 호위 수).
- `finalBoss`: rx,ry / hp / score.
- `boss`: bobAmp / bobFreq(좌우 유영 폭·속도).
- `stageCount`: 10. `starCount`: 배경 별 수.
- `STAGE_NAMES`: 구역 1~10 이름 배열.

## 2. 전방 화력 (`src/core/fire.js` → `frontSpec(L)`)

레벨 L(1~8) → `{ angles: 발사 각도(도) 배열, dmg, r }`. 정면 부채만(측면·후방은 옵션기가 담당).
- shots(정면 갈래) = L(1~8).
- dmg = `1 + floor((L-1)/2)` → 1,1,2,2,3,3,4,4.
- r = `3 + dmg*0.8`, 부채폭 = `min((L-1)*7, 84)`.
- 옵션기(레이저/미사일)·에너지존 로직은 `src/core/parts.js` → 05_power-parts.md.

## 3. 색상 (`src/data/colors.js` → `COLORS`)

- player / playerCore / engine.
- bullet(+glow) / enemyBullet(+glow) / star.
- hitSpark / clearSpark / playerHitSpark.
- enemy.{drone,weaver,gunner,gunnerEye}.
- boss.{mini,final,gunMini,gunFinal,coreDark,coreLight}.
- powerup.{P,S,E,H,B}.
- option / laser / missile / missileTrail / zone (옵션기·파츠 무기 색).

UI(메뉴/HUD/버튼) 색·간격·폰트는 게임 데이터가 아니라 `styles/main.css` + 공유 `shared/tokens.css` CSS 변수 담당(역할 분리).

## 4. 저장 스키마 (localStorage)

- 네임스페이스: `gg.flightshooting.` (`shared/storage.js`).
- `best`: number - 최고 점수.
