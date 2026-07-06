# 03 아키텍처 (Sky Raider)

## 1. 폴더 구조

```
games/flightshooting/
├── index.html          # 메뉴 + 게임 화면 마크업
├── styles/main.css      # 게임 전용 스타일(.shooter). tokens는 shared 재사용
├── src/
│   ├── main.js          # 엔트리: 상태 소유·루프·플로우·HUD·이벤트 소비
│   ├── data/            # 순수 상수 (numbers.js, colors.js)
│   ├── core/            # 순수 로직 (fire, parts, waves, stars, spawn, world)
│   ├── render/view.js   # 캔버스 그리기 전용
│   ├── input/controls.js# 드래그/키보드 입력
│   └── audio/sound.js    # Web Audio 합성 효과음
├── docs/                # 01_spec ~ 04_conventions
└── tests/               # test.html + runner.js (core 순수함수)
```

## 2. 의존성 방향 (한 방향, 순환 없음)

```
data  ←  core  ←  main  →  render, input, audio
                    │
              (shared/loop, storage, ui)
```

- `data/`: 아무것도 import 안 함(순수 상수).
- `core/`: data만 import. **DOM/Canvas/window/document/오디오 일체 import 금지.** 순수 함수로 `game` 상태를 변이한다.
- `render/`: data(colors)만 import. `ctx`와 `game`을 받아 그리기만.
- `input/`: core(clampPlayer)만 import. 이벤트 → `game` 변이.
- `main.js`: 위 전부 + shared를 조립. 유일하게 DOM·오디오·루프를 다룬다.

## 3. 로직 ↔ 렌더 분리 (표준 4.3)

- 게임 로직(이동·충돌·진행)은 `core/`, 그리기는 `render/`. 절대 한 모듈에 두지 않는다.
- core는 부수효과를 직접 일으키지 않는다. 사운드는 `game.sfx`(이름 배열), 화면 전환은 `game.events`(신호 배열)에 담고, `main.js`가 매 프레임 소비한다.

## 4. 데이터 흐름 (한 프레임)

```
input(드래그/키) → game 상태
main.update(dt):
  applyKeyboard → stepWorld(game,dt,W,H)   # core: 이동·발사·스폰·충돌·진행
    → game.sfx / game.events 채움
  main: sfx flush(sound.play) · events flush(배너/보스바/게임오버/승리)
  main: HUD·보스 체력바 갱신
main.render(): render(ctx, game, W, H)      # render: game 읽어 그리기
```

## 5. 화면 전환 타이머

보스 소환 대기·구역 전환·승리 지연은 `setTimeout`이 아니라 `game.pendingTimer/transitionTimer/winTimer`를 dt로 감산한다. 일시정지(루프 정지) 중에는 타이머도 멈춰 오작동이 없다.
