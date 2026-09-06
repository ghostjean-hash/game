# 03 아키텍처 (Rush Hour)

## 1. 폴더 / 모듈

```
games/rushhour/
├── index.html          진입 HTML (shared 토큰/베이스 + style.css)
├── style.css           이 게임 전용 레이아웃 / 차 스타일
├── assets/             캐릭터 그림 시트(머리 장식은 이모지라 파일이 없다)
├── src/
│   ├── main.js         진입점. 상태 관리 + UI 바인딩 + 모듈 조립
│   ├── core/
│   │   ├── board.js    순수 게임 로직(이동 범위, 이동, 클리어 판정, 점유 격자)
│   │   └── solver.js   BFS 최단 해 솔버(최소 이동수, 퍼즐 검증, 힌트용 다음 한 수)
│   ├── render/
│   │   └── render.js   보드 / 차 DOM 렌더 + 위치 갱신 + 캐릭터 그림 시트 표정
│   ├── audio/
│   │   └── sound.js    이 게임의 음색표(이동/클리어/힌트/구매/거부). 그릇은 공용
│   ├── input/
│   │   └── drag.js     Pointer Events 드래그 → 이동 의도 산출
│   └── data/
│       ├── constants.js   보드 수치 / enum
│       ├── colors.js      차 색상(파스텔)
│       ├── shop.js        상점 품목(보드 테마 · 포니 머리 장식)
│       ├── styles.js      블록 이미지 스타일 세트
│       ├── puzzles-fogleman.js  Fogleman 세트(외부 DB 400개)
│       ├── save-shape.js  저장 판 옮기기 + 저장 칸 ↔ 게임이 읽는 모양 변환(순수 함수)
│       └── puzzles.js     내장 퍼즐 세트
└── tests/
    ├── test.html       브라우저 테스트 진입
    └── runner.js       테스트 케이스 + 미니 러너
```

## 2. 의존성 방향 (단방향, 위에서 아래로만)

```
main.js
 ├─→ core/board.js      (DOM 금지, 순수 함수)
 ├─→ core/solver.js  ─→ core/board.js, data/constants.js
 ├─→ render/render.js ─→ data/constants.js, data/colors.js, data/styles.js, data/shop.js
 ├─→ audio/sound.js     이 게임의 음색표만. 소리 그릇은 공용 프레임이 갖는다
 ├─→ input/drag.js   ─→ core/board.js, data/constants.js
 ├─→ data/*           (의존 없음, 값만 export)
 └─→ shared/frame/index.js   공용 프레임 - 화면 골격·시작 화면·결과 카드·소리·저장·
                              진행 부품·진행 맵. 이 게임은 판 목록과 규칙만 넘긴다
```

2.1. `core/`는 DOM / Canvas / window / document를 일체 import하지 않는다. 순수 함수 + 불변 데이터.
2.2. 게임 로직(`core/`)과 렌더링(`render/`)은 절대 한 모듈에 두지 않는다.
2.3. `data/`는 값만 export하고 아무것도 import하지 않는다. 예외 하나 - `save-shape.js`는 값이 아니라 순수 함수를 내보낸다(저장 모양 변환). 화면 없이 검사하려고 그 자리에 뒀고, 여전히 아무것도 import하지 않는다.

2.4. 공용 프레임은 **한 방향으로만** 쓴다 - 게임이 프레임을 부르고, 프레임은 게임을 모른다. 게임이 넘긴 콜백(`onPickStage`·`onStart` 등)으로만 되돌아온다.

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
  els,             // 차 id → DOM 요소 맵(보드를 다시 그릴 때 교체)
  face,            // 주인공 현재 표정(neutral/worried/cry/happy)
  timer,           // setInterval 핸들(퍼즐 전환·클리어 시 정리)
}
누적 골드와 퍼즐별 최고 별은 state가 아니라 저장에 남긴다 - 골드는 지갑 칸, 별·깬 표시·최고 기록은 공용 진행 부품이 진행 칸에 담는다(02_data §4).
지갑·산 것·쓰는 것도 공용 부품(`shared/frame/wallet.js` · `shop.js`)이 자기 칸을
캐시하며 직접 읽고 쓴다 - 걸음 A가 두었던 임시 변환기는 걸음 C에서 사라졌다(02_data §4.1).
main.js가 저장을 직접 만지는 자리는 게임 칸 하나뿐이다(캐릭터별 배경·테두리).
localStorage를 직접 만지는 곳은 없다.
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

5.1. Canvas가 아니라 DOM. 차는 절대 위치 `<div>`이고 칸 좌표 → CSS 변수(`--cell`) 배수로 배치한다. 차 안쪽에는 캐릭터 그림을 한 칸 크기 정사각으로 배치한다(그림 = styles.js의 시트, 색조 = colors.js를 render.js가 조합).
5.2. 이동 / 스냅 애니메이션은 CSS `transition`. 드래그 중에는 transition을 꺼 손가락을 1:1로 따라온다. 손을 떼면 칸 위치(`left`/`top`)는 transition 없이 즉시 목표 칸으로 옮기되 같은 순간 `transform`으로 손 뗀 시각 위치를 상쇄(점프 0)하고, 다음 프레임에 `transform`만 0으로 트랜지션해 목표 칸으로 정착한다(FLIP). `left`/`top`과 `transform`을 동시에 트랜지션하면 iPad 등에서 레이아웃 경로와 컴포지터 경로의 타이밍 차로 차가 좌우로 흔들리므로, 정착은 컴포지터 단일 속성(`transform`)으로만 애니메이션한다.

5.4. 제한시간 타이머는 `main.js`가 1초 간격으로 `elapsed`를 올리며 보드 위 카드의 남은 시간을 갱신하고(§01 spec 8.2), 경과/제한 비율로 토끼 표정(`render.updateTargetFace`)을 무표정→어두움→울상으로 바꾼다. 클리어 시 타이머를 멈추고 표정을 활짝 웃음으로 바꾼 뒤 별·골드를 계산해 저장한다. 시간 초과가 확정되면(`elapsed > limit`, 시간 내 판정에 딱 1초만 초과분이 필요) 타이머를 멈춰 무한 구동을 막고, `visibilitychange`로 탭이 백그라운드면 타이머·오디오를 재웠다가 복귀 시 되살린다(§01 spec 6.4·10.5). 표정 순환 타이머(render.js `startFaceCycle`)도 백그라운드에서는 틱을 건너뛴다. 시간 내 클리어면 연속 콤보(공용 진행 부품의 갈래별 게임 고유 값 `extra.combo`)를 1 올리고 2연속부터 콤보 보너스 골드를 더한다. 시간 초과 클리어면 콤보를 0으로 끊는다(§01 spec 6.7).

5.5. 힌트(§01 spec 7.6): `main.js`가 공용 지갑에 `spend(HINT_COST)`를 부르고(모자라면 지갑이 막고 흔들림·쪽지·거부음까지 낸다) 통과하면 `solver.solveStep(cars)`로 최적의 다음 한 수(`{id, pos}` 또는 null)를 구해 `render.showHint(els, move)`로 해당 차를 잠깐 강조 + 목표 방향으로 살짝 움직여 보여준다. 자동 이동은 하지 않는다(플레이어가 직접 민다).

5.6. 진행 맵(§01 spec 7.7): **공용 화면이다**(걸음 B, 기획서 Ⅲ권 4.3). `shared/frame/mapscreen.js`가 고르는 화면(SELECT) 안에 갈래 탭·요약 줄·묶음별 칩 격자를 그리고, 진행은 공용 진행 부품(`shared/frame/progress.js`)에서 읽는다. `main.js`는 판 목록(`MODES`)과 묶는 규칙(난이도)만 프레임에 넘기고, 칩을 고르면 `onPickStage`로 `loadPuzzle(id)` + 플레이 화면 이동을 한다. 한 칸 위로 돌아가는 문은 맵이 갖는다.

5.8. 상점과 꾸미기(§01 spec 7.5): 화면·격자·가격 표시·살 수 있는지 판정·부족 거절·보유와 장착 저장은 전부 공용 상점 부품이 갖는다(`shared/frame/shop.js` + `shopcard.js`, 기획서 Ⅲ권 4.6·4.7). `main.js`는 상점 정의 둘(`SHOPS`)만 넘긴다 - 값이 있는 **상점**(보드 테마 `BOARD_THEMES` · 포니 머리 장식 `ACCESSORY_ITEMS`)과 값이 없는 **꾸미기**(블록 캐릭터 `PONY_STYLES`)다. 시작 화면 추가 항목에 이름이 스스로 서고 누르면 공용 덮는 카드가 뜬다. 게임에 남는 것은 미리 보기 그림(`themeSwatch` · 그림 글자)과 `onEquip`의 실제 반영뿐이다 - 테마는 `.rushhour`의 `--rh-*` 변수 인라인 덮어쓰기, 장식은 `render.setTargetAccessory`, 캐릭터는 `redrawBlocks()`다. 캐릭터별 배경·테두리 켜고 끄기는 고르기가 아니라 켜고 끄기라 꾸미기 카드 아래 **게임 조각**(`blockOptRows`)으로 붙고 값은 게임 칸에 담긴다. 로드 시 저장된 테마·장식을 적용한다. (색 스킨은 무지개 갈기 포니에 CSS filter가 맞지 않아 2026-07-02에 없앴다.)

5.7. 사운드(§01 spec 10): **소리 그릇은 공용 프레임이 갖는다**(`shared/frame/audio.js`). 음원 파일 없이 oscillator/gain으로 합성하는 것, 첫 재생 시점 lazy 생성, iOS 잠금 해제, 화면을 가렸을 때 재우기가 전부 그쪽 몫이다. 이 게임에 남은 것은 **음색표 하나**뿐이다 - `audio/sound.js`가 `SOUNDS`(이동·클리어·힌트·구매·거부의 주파수·길이)를 내보내고, `main.js`가 프레임을 만들 때 넘긴다. 재생은 `frame.audio.play(name)`, 음소거는 공용 환경설정과 소리 칸(`muted`)이 맡는다. 합성 파라미터는 sound.js 내부 디자인 상수다(04 §2.1 예외).
5.3. 보드 크기는 CSS가 화면 너비에 맞춰 정사각형으로 잡고, 셀 크기는 한 곳(`--cell`)에서 파생한다.
