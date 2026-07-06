# 02 게임 데이터 (Sky Raider)

매직 넘버는 코드에 0개. 모든 수치는 `src/data/numbers.js`, 모든 게임 색상은 `src/data/colors.js`가 SSOT다. 이 문서는 스키마와 위치만 정의한다.

## 1. 수치 (`src/data/numbers.js` → `CFG`)

- `player`: r(반지름) / speed(키보드 이동 px/s) / fireEvery(발사 간격 s) / maxLives / invAfterHit(피격 무적 s) / yRatio(시작 세로 위치 비율).
- `bullet.speed`, `enemyBullet`(speed, r).
- `maxPower`: 20.
- `enemy.{drone,weaver,gunner}`: r / hp / speed(낙하 px/s) / score / (weaver amp,freq) / (gunner fireEvery).
- `drop`: chance(드롭 확률) / powerWeight / healWeight / bombWeight(P·H·B 배분).
- `miniBoss`: rx,ry / baseHp / hpPerStage / score / escortEvery(호위 소환 간격) / escortInit(등장 시 호위 수).
- `finalBoss`: rx,ry / hp / score.
- `boss`: bobAmp / bobFreq(좌우 유영 폭·속도).
- `stageCount`: 10. `starCount`: 배경 별 수.
- `STAGE_NAMES`: 구역 1~10 이름 배열.

## 2. 화력 단계 (`src/core/fire.js` → `fireSpec(L)`)

레벨 L(1~20) → `{ angles: 발사 각도(도) 배열, dmg: 탄 데미지, r: 탄 반지름 }`.
- shots(정면 갈래) = `min(ceil(L/2), 10)`.
- dmg = `1 + floor(L/2)`.
- r = `3 + dmg*0.9` (위력이 굵기에 연동).
- L≥12 측면탄(±72°), L≥17 후방탄(150·210°).

## 3. 색상 (`src/data/colors.js` → `COLORS`)

- player / playerCore / engine.
- bullet(+glow) / enemyBullet(+glow) / star.
- hitSpark / clearSpark / playerHitSpark.
- enemy.{drone,weaver,gunner,gunnerEye}.
- boss.{mini,final,gunMini,gunFinal,coreDark,coreLight}.
- powerup.{P,H,B}.

UI(메뉴/HUD/버튼) 색·간격·폰트는 게임 데이터가 아니라 `styles/main.css` + 공유 `shared/tokens.css` CSS 변수 담당(역할 분리).

## 4. 저장 스키마 (localStorage)

- 네임스페이스: `gg.flightshooting.` (`shared/storage.js`).
- `best`: number - 최고 점수.
