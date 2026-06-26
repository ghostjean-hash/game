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
│   │   └── solver.js   BFS 최단 해 솔버(최소 이동수, 퍼즐 검증)
│   ├── render/
│   │   └── render.js   보드 / 차 DOM 렌더 + 위치 갱신
│   ├── input/
│   │   └── drag.js     Pointer Events 드래그 → 이동 의도 산출
│   └── data/
│       ├── constants.js  보드 수치 / enum
│       ├── colors.js     차 색상
│       └── puzzles.js    내장 퍼즐 세트
└── tests/
    ├── test.html       브라우저 테스트 진입
    └── runner.js       테스트 케이스 + 미니 러너
```

## 2. 의존성 방향 (단방향, 위에서 아래로만)

```
main.js
 ├─→ core/board.js      (DOM 금지, 순수 함수)
 ├─→ core/solver.js  ─→ core/board.js
 ├─→ render/render.js ─→ data/colors.js, data/constants.js
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
}
```

3.2. `core/board.js`의 함수는 `cars`를 입력받아 새 `cars`(또는 판정값)를 반환한다. 상태를 직접 변형하지 않는다.
3.3. 한 수 = `history`에 직전 `cars`를 push + `moves` += 1.

## 4. 데이터 흐름 (한 번의 이동)

1. `drag.js`가 pointerdown으로 잡은 차 id와 드래그 변위를 추적한다.
2. `board.js`의 `slideRange(cars, id)`로 그 차의 이동 가능 칸 범위를 구한다.
3. 드래그 변위를 범위 안으로 클램프해 `render.js`가 차를 실시간으로 따라 그린다.
4. pointerup 시 `DRAG_SNAP_RATIO`로 목표 칸을 정하고, 변화가 있으면 `board.js`의 `moveCar`로 새 `cars`를 만든다.
5. `main.js`가 상태를 갱신(`moves`, `history`)하고 `board.js`의 `isSolved`로 클리어를 판정, `render.js`가 최종 위치를 그린다.

## 5. 렌더링 방식

5.1. Canvas가 아니라 DOM. 차는 절대 위치 `<div>`이고 칸 좌표 → CSS 변수(`--cell`) 배수로 배치한다.
5.2. 이동 / 스냅 애니메이션은 CSS `transition`(드래그 중에는 transition 끔, 스냅 시 켬).
5.3. 보드 크기는 CSS가 화면 너비에 맞춰 정사각형으로 잡고, 셀 크기는 한 곳(`--cell`)에서 파생한다.
