# 05. 3계통 파워 파츠 시스템

기존 단일 `power`(1~20) 화력을 세 갈래 파츠로 분리한다. 사용자 확정(2026-07-07): 파츠별 전용 아이템으로 성장, 피격 시 마지막 얻은 파츠 1개 손실.

## 1. 세 계통

### 1.1. 전방 화력 (front, 아이템 P)
- 정면 부채탄만 담당. 레벨 1~8 (`CFG.parts.front.max`).
- 단계당 정면 탄 +1(1~8발), 데미지는 완만 상승(1,1,2,2,3,3,4,4).
- 기존 fireSpec의 측면·후방 지원탄은 제거 - 그 역할은 옵션기가 대체.

### 1.2. 옵션기 (option, 아이템 S)
- 좌우에 붙는 부속 비행기. S 획득당 좌우 번갈아 1대씩, 최대 8대(좌4·우4, `maxPerSide` 4).
- n번째(0-based) 옵션: `side = n%2==0 ? 왼(-1) : 오(+1)`, `slot = floor(n/2)` (안→밖 0~3).
- 슬롯 0·1 = 레이저(빠른 연사, 얇고 빠른 직진탄, 저데미지), 슬롯 2·3 = 유도 미사일(가까운 적 추적, 느린 연사, 고데미지).
- 위치는 플레이어 기준 대칭 오프셋. 플레이어를 부드럽게 따라온다.

### 1.3. 에너지존 (zone, 아이템 E)
- 플레이어 주변 원형 오라. 레벨 0~5, 레벨↑ 반경↑(`zone.radius[]`).
- `tick`(0.5초)마다 존 반경 내 모든 적·보스에게 `dmg = level` 피해.

## 2. 성장·손실

- 획득 순서를 `game.partHistory` 스택에 계통 이름('front'|'option'|'zone')으로 기록.
- 피격 시 스택 pop → 해당 계통 1단계 되돌림(front -1(최소 1)/option 마지막 1대 제거/zone -1). front 시작값 1은 스택에 없음(P로 2 이상 올릴 때만 push).
- 회복(H)·봄(B)은 기존 유지.

## 3. 드롭 (spawn.dropItem)

5종 가중치(합 1): P 0.34 / S 0.28 / E 0.16 / H 0.12 / B 0.10. 드롭 확률 `chance`는 기존 유지.

## 4. 바뀌는 파일

- `data/numbers.js` - `parts` 수치, `maxPower` 제거.
- `data/colors.js` - powerup S·E, option/laser/missile/zone 색.
- `core/fire.js` - `fireSpec`→`frontSpec`(정면만), `playerFire`는 `game.front` 사용.
- `core/parts.js` (신설) - 옵션 배치·발사(레이저/미사일), 미사일 유도, 존 tick, 파츠 손실.
- `core/world.js` - grabItem 5종, playerHit 역순 손실, stepWorld에 옵션·미사일·존 갱신 추가.
- `core/spawn.js` - dropItem 5종.
- `render/view.js` - 옵션기·레이저·미사일·존 오라 렌더, 파워업 라벨 S·E.
- `main.js` / `index.html` - game 상태(front/options/zone/partHistory), HUD 4칸(구역/전방/옵션/존).
- `audio/sound.js` - laser·missile 효과음 추가.
- `tests/` - frontSpec 8단계, 옵션 슬롯 배치·타입, 존 tick, 역순 손실.

## 5. 밸런스 기본값 (플레이 조정 대상)

- front dmg: `1 + floor((L-1)/2)`, 탄 굵기 `3 + dmg*0.8`, 부채 폭 `(L-1)*7`(최대 84도).
- 레이저: dmg 1, 속도 1.4배, 연사 0.16초. 미사일: dmg 3, 연사 0.75초, 유도 선회.
- zone 반경: [0,34,52,70,88,106], tick 0.5초, dmg = level.
