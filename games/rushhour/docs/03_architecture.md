# 03 아키텍처 (Rush Hour)

## 1. 폴더 / 모듈

```
games/rushhour/
├── index.html          진입 HTML (shared 토큰/베이스 + style.css)
├── style.css           이 게임 전용 레이아웃 / 차 스타일
├── src/
│   ├── main.js         진입점. 상태 관리 + UI 바인딩 + 모듈 조립
│   ├── core/
│   │   ├── board.js    순수 게임 로직(이동 범위, 이동, 클리어 판정, 점유 격자)
│   │   └── solver.js   BFS 최단 해 솔버(최소 이동수, 퍼즐 검증, 힌트용 다음 한 수)
│   ├── render/
│   │   └── render.js   보드 / 차 DOM 렌더 + 위치 갱신 + 동물 얼굴 SVG
│   ├── audio/
│   │   └── sound.js    Web Audio 효과음 합성(이동/클리어/힌트/구매/거부) + 음소거
│   ├── input/
│   │   └── drag.js     Pointer Events 드래그 → 이동 의도 산출
│   └── data/
│       ├── constants.js   보드 수치 / enum
│       ├── colors.js      차 색상(파스텔)
│       ├── characters.js  동물 종류(주인공 토끼 / 친구들)
│       ├── shop.js        상점 품목(토끼 색 스킨)
│       └── puzzles.js     내장 퍼즐 세트
└── tests/
    ├── test.html       브라우저 테스트 진입
    └── runner.js       테스트 케이스 + 미니 러너
```

## 2. 의존성 방향 (단방향, 위에서 아래로만)

```
main.js
 ├─→ core/board.js      (DOM 금지, 순수 함수)
 ├─→ core/solver.js  ─→ core/board.js
 ├─→ render/render.js ─→ data/colors.js, data/characters.js, data/constants.js
 ├─→ audio/sound.js     (Web Audio API, DOM 무관 / core 아님)
 ├─→ input/drag.js   ─→ core/board.js, data/constants.js
 └─→ data/*           (의존 없음, 값만 export)
```

2.1. `core/`는 DOM / Canvas / window / document를 일체 import하지 않는다. 순수 함수 + 불변 데이터.
2.2. 게임 로직(`core/`)과 렌더링(`render/`)은 절대 한 모듈에 두지 않는다.
2.3. `data/`는 값만 export하고 아무것도 import하지 않는다.

## 3. 상태 모델

3.1. 단일 상태 객체는 `main.js`가 보유한다.

```
state = {
  puzzleId,        // 현재 퍼즐 id
  cars,            // 현재 차 배열(불변 갱신: 이동 시 새 배열로 교체)
  moves,           // 사용한 수
  history,         // 이전 cars 스냅샷 스택(undo용)
  optimal,         // 솔버가 계산한 최소 수
  solved,          // 클리어 여부
  limit,           // 제한시간(초) = optimal × TIME_PER_OPTIMAL_S + TIME_BASE_S
  elapsed,         // 경과 시간(초, 1초 타이머로 증가)
  face,            // 토끼 현재 표정(neutral/worried/cry/happy)
  timer,           // setInterval 핸들(퍼즐 전환·클리어 시 정리)
}
누적 골드와 퍼즐별 최고 별은 state가 아니라 localStorage `progress`에 저장한다(02_data §4).
```

3.2. `core/board.js`의 함수는 `cars`를 입력받아 새 `cars`(또는 판정값)를 반환한다. 상태를 직접 변형하지 않는다.
3.3. 한 수 = `history`에 직전 `cars`를 push + `moves` += 1.

## 4. 데이터 흐름 (한 번의 이동)

1. `drag.js`가 pointerdown으로 잡은 차 id와 드래그 변위를 추적한다.
2. `board.js`의 `slideRange(cars, id)`로 그 차의 이동 가능 칸 범위를 구한다.
3. 드래그 변위를 범위 안으로 클램프해 `render.js`가 차를 실시간으로 따라 그린다.
4. pointerup 시 포인터 이동이 셀의 `DRAG_TAP_RATIO` 미만이면 탭으로 보고 누른 쪽으로 한 칸, 아니면 `DRAG_SNAP_RATIO`로 목표 칸을 정한다. 변화가 있으면 `board.js`의 `moveCar`로 새 `cars`를 만든다.
5. `main.js`가 상태를 갱신(`moves`, `history`)하고 `board.js`의 `isSolved`로 클리어를 판정, `render.js`가 최종 위치를 그린다. 클리어면 `render.playClear`로 토끼를 출구 길로 미끄러뜨리고 별·하트 파티클을 터뜨린 뒤(`CLEAR_EXIT_MS`) 결과 오버레이를 띄운다.

## 5. 렌더링 방식

5.1. Canvas가 아니라 DOM. 차는 절대 위치 `<div>`이고 칸 좌표 → CSS 변수(`--cell`) 배수로 배치한다. 차 안쪽에는 동물 얼굴 인라인 SVG를 한 칸 크기 정사각으로 중앙 배치한다(색 = colors.js, 종류 = characters.js를 render.js가 조합).
5.2. 이동 / 스냅 애니메이션은 CSS `transition`. 드래그 중에는 transition을 꺼 손가락을 1:1로 따라오고, 손을 떼면 `transform`(드래그 변위)과 `left`/`top`(칸 위치)을 함께 트랜지션해 손 뗀 자리에서 목표 칸으로 점프 없이 정착한다.

5.4. 제한시간 타이머는 `main.js`가 1초 간격으로 `elapsed`를 올리며 상단바 남은 시간을 갱신하고, 경과/제한 비율로 토끼 표정(`render.updateTargetFace`)을 무표정→어두움→울상으로 바꾼다. 클리어 시 타이머를 멈추고 표정을 활짝 웃음으로 바꾼 뒤 별·골드를 계산해 저장한다. 시간 내 클리어면 연속 콤보(`progress.combo`)를 1 올리고 2연속부터 콤보 보너스 골드를 더한다. 시간 초과 클리어면 콤보를 0으로 끊는다(§01 spec 6.7).

5.5. 힌트(§01 spec 7.6): `main.js`가 골드를 확인(부족하면 흔들림)하고 차감한 뒤 `solver.solveStep(cars)`로 최적의 다음 한 수(`{id, pos}` 또는 null)를 구해 `render.showHint(els, move)`로 해당 차를 잠깐 강조 + 목표 방향으로 살짝 움직여 보여준다. 자동 이동은 하지 않는다(플레이어가 직접 민다).

5.6. 진행 맵(§01 spec 7.7): `main.js`가 `PUZZLES`(번호·난이도)와 localStorage `progress`(cleared·stars)를 읽어 난이도별 칩 격자를 모달에 그린다. 별도 데이터를 저장하지 않는 읽기 전용 화면이다. 칩 클릭 시 `loadPuzzle(id)`로 그 퍼즐로 점프하고 모달을 닫는다.

5.8. 상점(§01 spec 7.5): `main.js`가 `RABBIT_SKINS`(토끼 색)·`BOARD_THEMES`(보드 색 세트)·`ACCESSORY_ITEMS`(토끼 머리 장식)를 모달에 그린다. 구매·장착(`buyOrEquip(kind, id)`)은 골드 확인(부족 시 흔들림+거부음) 후 `progress`의 보유/장착 키를 갱신한다. 스킨 장착은 `render.setTargetColor`, 테마 장착은 `.rushhour`의 `--rh-*` 변수 인라인 덮어쓰기, 액세서리 장착은 `render.setTargetAccessory`로 즉시 반영한다. 로드 시 저장된 스킨·테마·액세서리를 적용한다.

5.7. 사운드(§01 spec 10): `audio/sound.js`가 `AudioContext`를 첫 재생 시점에 lazy 생성(자동재생 정책)하고 oscillator/gain으로 효과음을 합성한다. 음원 파일은 없다. `main.js`가 이동·클리어·힌트·구매·거부 시점에 `sound.play(name)`을 호출하고, 음소거 토글(🔊/🔇)은 `progress.muted`에 저장한다. 합성 파라미터(주파수·길이)는 sound.js 내부 디자인 상수다(04 §2.1 예외).
5.3. 보드 크기는 CSS가 화면 너비에 맞춰 정사각형으로 잡고, 셀 크기는 한 곳(`--cell`)에서 파생한다.
