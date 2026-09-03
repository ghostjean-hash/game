# 03. 아키텍처 (architecture)

> 폴더 / 모듈 구조, 의존성 방향, 데이터 흐름의 SSOT.

## 1. 폴더 구조

```
nonogram/
├── index.html          # 앱 셸(맵/플레이/결과 컨테이너 + iOS 홈 화면 메타 태그)
├── app.webmanifest     # 홈 화면 앱 이름·아이콘·시작 경로·standalone 표시 모드
├── styles/             # tokens.css(디자인 토큰) + main.css
├── src/
│   ├── main.js         # 진입점: 조립 + 화면 전환 오케스트레이션
│   ├── core/           # 순수 게임 로직 (DOM/Canvas/window/document 금지)
│   │   ├── hints.js    #   격자 → 행/열 힌트 생성
│   │   ├── solver.js   #   줄 논리 솔버 + 유일해/추측불필요 검증 + 난이도
│   │   ├── board.js    #   보드 상태(불변): 셀 토글·기계적 줄 자동입력·정답 잠금, 승리/실수, 도움(한 줄 열기), 저장 직렬화
│   │   ├── lines.js    #   행/열 완성 판정(완성 줄 흐리게 + 칭찬)
│   │   ├── stars.js    #   실수 → 별점 계산
│   │   └── zoom.js     #   확대·이동 계산(전체 맞춤 셀 크기·배율 클램프·중심 유지 보정)
│   ├── render/         # 화면 그리기 (core 결과를 DOM으로)
│   │   ├── boardView.js#   격자 + 힌트 렌더
│   │   ├── mapView.js  #   스테이지 맵
│   │   └── resultView.js#  결과(변신+별점)
│   ├── input/          # 입력 처리 (터치/마우스/키보드 → core 액션)
│   │   ├── boardInput.js#  한 손가락: 탭/드래그로 칠하기·지우기
│   │   └── boardZoom.js #  격자 위 두 손가락: 확대·이동(core/zoom 계산을 DOM에 반영)
│   │   └── boardPanPad.js# 보드 아래 빈 영역 한 손가락: 가로 이동만 viewport에 반영
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
2. `board.js`가 빈 보드 상태 생성(불변). 입력이 올 때마다 새 상태를 반환한다. 힌트 자동 입력은 힌트와 현재 보드만으로 기계적으로 상태를 바꾸고, 그 결과가 실제 정답인 칸만 `lockedCells`에 기록한다.
3. `input/boardInput.js`가 탭/드래그/키를 받아 board 액션(칠함/X/지움) 호출 → 새 상태.
   격자 위에서 손가락이 둘로 늘면 `input/boardZoom.js`가 두 포인터를 모두 격자에 고정해 확대·이동으로 전환하고, 진행 중이던 드래그는 `boardInput.cancelDrag()`로 끝낸다(아주 짧았으면 `main.js`가 되돌린다). 확대·이동 상태의 보드 아래 빈 영역은 `input/boardPanPad.js`가 별도로 받아 한 손가락 가로 이동만 스크롤 영역에 반영하므로 칠하기와 충돌하지 않는다.
4. 상태가 바뀌면 `render/boardView.js`가 다시 그림. 승리 판정 시 `main.js`가 결과 화면으로 전환.
5. 결과에서 `stars.js`로 별점 계산 → `storage`에 progress 저장 → 맵 썸네일이 컬러로 갱신.

핵심 원칙: 상태는 core가 소유하고 불변으로 반환하며, render는 상태를 읽어 그리기만 한다(상태 변형 금지).

## 4. 홈 화면 실행

- iOS Safari의 공유 → 홈 화면에 추가는 `index.html`의 Apple 전용 메타 태그와 터치 아이콘을 사용한다. `viewport-fit=cover`와 공용 `mobile-shell.css`의 safe-area padding이 노치·홈 인디케이터를 피한다.
- 웹 매니페스트는 `display: standalone`, 시작 경로 `./`, 세로·가로 게임 레이아웃을 모두 허용하는 `orientation: any`를 선언한다.
- 오프라인 캐시는 게임별 Service Worker를 추가하지 않는다. 배포 루트의 기존 Service Worker가 공용 정적 자산을 관리하며, iOS의 홈 화면 standalone 실행 자체에는 별도 Service Worker가 필요하지 않다.
