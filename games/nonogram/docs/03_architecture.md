# 03. 아키텍처 (architecture)

> 폴더 / 모듈 구조, 의존성 방향, 데이터 흐름의 SSOT.

## 1. 폴더 구조

```
nonogram/
├── index.html          # 앱 셸(맵/플레이/결과/도감 컨테이너)
├── styles/             # tokens.css(디자인 토큰) + main.css
├── src/
│   ├── main.js         # 진입점: 조립 + 화면 전환 오케스트레이션
│   ├── core/           # 순수 게임 로직 (DOM/Canvas/window/document 금지)
│   │   ├── hints.js    #   격자 → 행/열 힌트 생성
│   │   ├── solver.js   #   줄 논리 솔버 + 유일해/추측불필요 검증 + 난이도
│   │   ├── board.js    #   플레이 보드 상태(불변): 셀 토글, 승리 판정, 실수 카운트
│   │   └── stars.js    #   실수 → 별점 계산
│   ├── render/         # 화면 그리기 (core 결과를 DOM으로)
│   │   ├── boardView.js#   격자 + 힌트 렌더
│   │   ├── mapView.js  #   스테이지 맵
│   │   ├── resultView.js#  결과(변신+별점)
│   │   └── albumView.js#   도감
│   ├── input/          # 입력 처리 (터치/마우스/키보드 → core 액션)
│   │   └── boardInput.js
│   ├── audio/          # Web Audio 효과음 합성 (음원 파일 0, core 아님)
│   │   └── sound.js
│   └── data/           # 상수 / 색상 / 퍼즐 (매직 넘버 SSOT)
│       ├── constants.js
│       ├── colors.js
│       └── puzzles.js
└── tests/              # test.html + runner.js (core 단위 + 퍼즐 전수 검증)
```

## 2. 의존성 방향

한 방향으로만 흐른다(역참조 금지).

```
data  ←  core  ←  render / input  ←  main
```

- `data/`: 순수 데이터/상수. 아무것도 import 안 함.
- `core/`: `data/`만 import. DOM/Canvas/window/document 일체 금지. 순수 함수.
- `render/`, `input/`: `core/` + `data/` 사용. DOM을 만진다.
- `main.js`: 전부 조립. 화면 전환/저장(shared/storage.js) 연결.

## 3. 데이터 흐름

1. `main.js`가 `puzzles.js`에서 퍼즐 선택 → `hints.js`로 행/열 힌트 생성.
2. `board.js`가 빈 보드 상태 생성(불변). 입력이 올 때마다 새 상태 반환.
3. `input/boardInput.js`가 탭/드래그/키를 받아 board 액션(칠함/X/지움) 호출 → 새 상태.
4. 상태가 바뀌면 `render/boardView.js`가 다시 그림. 승리 판정 시 `main.js`가 결과 화면으로 전환.
5. 결과에서 `stars.js`로 별점 계산 → `storage`에 progress 저장 → 도감 갱신.

핵심 원칙: 상태는 core가 소유하고 불변으로 반환하며, render는 상태를 읽어 그리기만 한다(상태 변형 금지).
