# 03. 구조 (architecture)

폴더·모듈 구조와 의존성 방향. 무엇이 어디에 있는지와, 무엇이 무엇을 부를 수 있는지만 적는다. 규칙과 수치는 `01_spec.md` / `02_data.md`가 SSOT다.

## 1. 폴더

```
games/mines/
├── CLAUDE.md              세션 진입점 (인덱스 + 절대 규칙)
├── README.md              사람용 (플레이 링크, 조작법, 실행법)
├── PROGRESS.md            진행 로그
├── index.html             화면 뼈대
├── app.webmanifest        홈 화면 앱 설정 (전체화면)
├── .nojekyll / .standard
├── docs/
│   ├── planning-mines.html   기획서 (결정과 근거의 SSOT, 화면 그림 포함)
│   └── 01_spec / 02_data / 03_architecture / 04_conventions
├── src/
│   ├── main.js            조립 + 화면 전환 오케스트레이션
│   ├── gameHarness.js     화면과 무관한 플레이 조립 하네스
│   ├── core/              규칙 (DOM 금지)
│   │   ├── board.js       판 상태와 규칙 전부
│   │   └── fit.js         칸 크기 산정
│   ├── render/            화면에 그리기
│   │   ├── boardView.js   격자 DOM 생성과 상태 반영
│   │   └── resultView.js  결과 카드 내용
│   ├── input/
│   │   └── boardInput.js  손가락·마우스·키보드 → 의도로 번역
│   ├── data/
│   │   ├── constants.js   02_data 수치의 코드 실체
│   │   └── colors.js      02_data 색의 코드 실체
│   └── audio/
│       └── sound.js       이 게임 음색표
├── styles/
│   ├── tokens.css         디자인 토큰
│   └── main.css           이 게임 화면
└── tests/
    ├── test.html          브라우저에서 여는 테스트 화면
    ├── runner.js          외부 라이브러리 없는 러너 + 코어 케이스
    └── gameHarness.js     시작·입력·저장 조립 경로 자동 검사
```

## 2. 의존성 방향

한 방향으로만 흐른다. 화살표를 거스르는 import는 금지다.

```
main.js ──> core/   ──> data/
   │
   ├─────> render/  ──> data/
   │
   ├─────> input/   ──> data/
   │
   └─────> shared/frame, shared/storage, shared/fullscreen (공용 자산)
```

2.1. `core/`는 `document` / `window` / DOM / 캔버스를 일체 부르지 않는다. 순수 함수와 상태 객체만이며, 그래서 브라우저 없이 테스트할 수 있다.

2.2. `render/`는 상태를 읽어 화면을 갱신한다. 상태를 바꾸지 않는다.

2.3. `input/`은 손가락·키 입력을 "무엇을 하려는가"(열기 / 깃발 / 빠른 열기)로 번역해 콜백으로 넘긴다. 규칙 판단은 하지 않는다.

2.4. `main.js`만이 셋을 알고 있다. 상태를 바꾸는 것은 `core/`를 거치고, 바뀐 결과를 `render/`에 넘긴다.

## 3. 판 상태 (core/board.js)

3.1. 판 하나는 다음을 가진다 - 가로·세로 크기, 지뢰 수, 칸 배열, 지뢰 배치 여부, 판 상태(진행 / 승리 / 패배).

3.2. 칸 하나는 다음을 가진다 - 지뢰인가, 인접 지뢰 수, 상태(닫힘 / 열림 / 깃발).

3.3. 지뢰 배치는 첫 칸을 여는 시점에 이뤄진다(`01_spec.md` 3.2). 그래서 판을 만드는 함수와 지뢰를 놓는 함수가 나뉘어 있고, 지뢰를 놓는 함수는 "이 칸과 그 이웃은 비워 둘 것"을 인자로 받는다.

3.4. 밖으로 내보내는 함수는 판 만들기 / 지뢰 놓기 / 칸 열기 / 깃발 토글 / 빠른 열기 / 승패 판정 / 직렬화·복원이다. 각 함수는 무엇이 바뀌었는지(열린 칸 목록 등)를 돌려주어 `render/`가 그 부분만 갱신할 수 있게 한다.

## 4. 공용 자산 사용

4.1. 다섯 화면 골격·상단 띠·되돌아가기 계단·잠깐 멈춤·결과 카드·소리·저장은 `shared/frame/index.js` 하나로 받는다. 이 게임이 다시 만들지 않는다(표준 4.8-10).

4.2. 플레이 화면에서는 공용 상단 띠를 감추고 네 모서리 UI를 프레임 동작에 연결한다(표준 4.8-11, `01_spec.md` 5.2).

4.3. 전체화면은 `shared/fullscreen.js`, 뷰포트·safe-area·터치 골격은 `shared/base.css`(다크 톤이므로 base를 링크하면 `mobile-shell.css`가 함께 온다).

4.4. 저장은 `shared/frame/save.js`를 거친다. localStorage 직접 접근 금지(클라우드 동기화 신호가 끊긴다).

## 5. 테스트 경계

5.1. `tests/runner.js`가 검사하는 것은 `core/`다. 지뢰 배치가 첫 탭 이웃을 비우는지, 연쇄 열기가 0 영역과 그 경계까지만 여는지, 빠른 열기가 깃발 수 조건을 지키는지, 승패 판정, 직렬화 왕복이 핵심 케이스다.

5.2. `gameHarness.js`는 DOM 없이 `main.js`가 쓰는 플레이 조립 경로를 검사한다. 시작 직후 READY, 첫 열기 후 PLAYING, 깃발 토글, 빠른 열기, 저장·복원, 승패 종료 뒤 저장 삭제를 모두 자동으로 확인한다.

5.3. `render/` / `input/`은 브라우저 화면 검증(browser-shot)으로 확인한다. 하네스가 통과하지 않은 상태에서 화면만 고쳐 문제를 가리는 것은 금지한다.
