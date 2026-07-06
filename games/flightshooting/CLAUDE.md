# Sky Raider (flightshooting) 작업 컨텍스트

flightshooting 게임 작업 시 자동 로드되는 컨텍스트. 인덱스 + 절대 규칙 + 주의점. 진행 로그는 `PROGRESS.md`.
html-game 표준 v0.3.2 적용(문서 우선 워크플로우 - docs가 SSOT).

# 1. 게임 정의

1.1. **한 줄**: 세로(종) 스크롤 캐주얼 비행 슈팅. 플레이어 하단, 적은 위→아래. 드래그 이동 + 자동발사. 모바일 우선 PWA.
1.2. **상태**: playable. 표준 구조(src 모듈 분리 + docs + tests) 적용.
1.3. **성격**: 캐주얼 아케이드(누구나 픽업). 하드코어 탄막 아님.

# 2. 파일 구조

```
games/flightshooting/
├── CLAUDE.md / PROGRESS.md / README.md
├── index.html            # 메뉴 + 게임 화면
├── .standard             # html-game v0.3.2
├── styles/main.css       # .shooter 스타일 (tokens는 shared 재사용)
├── src/
│   ├── main.js           # 엔트리: 상태·루프·플로우·HUD·이벤트 소비
│   ├── data/             # numbers.js(CFG), colors.js(COLORS) - 순수 상수
│   ├── core/             # fire·waves·stars·spawn·world - 순수 로직
│   ├── render/view.js    # 캔버스 그리기 전용
│   ├── input/controls.js # 드래그·키보드
│   └── audio/sound.js    # Web Audio 합성
├── docs/                 # 01_spec ~ 04_conventions (SSOT)
└── tests/                # test.html + runner.js (core 순수함수)
```

# 3. 문서 인덱스 (SSOT - 코드보다 문서 우선)

- `docs/01_spec.md` - 게임 규칙, 조작, 코어 루프, 보스, 화면 흐름
- `docs/02_data.md` - 수치(numbers.js)·색상(colors.js) 스키마와 위치
- `docs/03_architecture.md` - 폴더/모듈 구조, 의존성 방향, 데이터 흐름
- `docs/04_conventions.md` - 네이밍, core 순수성, 매직넘버, 테스트 규칙

# 4. 절대 규칙 (표준 4.3 + 게임 고유)

4.1. **게임 로직과 렌더는 절대 한 모듈에 두지 않는다.** 로직 core/, 그리기 render/.
4.2. **core/는 DOM/Canvas/window/document/오디오 import 금지.** 순수 함수로 `game` 상태만 변이. 부수효과는 `game.sfx`(사운드 이름)·`game.events`(화면 전환 신호)로만 알리고 main이 소비.
4.3. **매직 넘버 0.** 수치는 `src/data/numbers.js`(CFG), 게임 색은 `src/data/colors.js`(COLORS). 예외: sound.js 합성 파라미터.
4.4. 핵심 로직(발사/웨이브/충돌) 변경 시 `tests/`의 대응 테스트 함께 갱신.
4.5. docs와 코드가 충돌하면 docs가 진실.

# 5. 핵심 사양 (상세 → docs/01_spec.md)

5.1. **전진 방향**: 위쪽(-y). 플레이어 하단(yRatio 0.82), 적 위→아래 낙하. 아군 탄 vy<0.
5.2. **조작**: 드래그 상대 이동(손가락 가림 방지) + 키보드. 자동발사 0.14s.
5.3. **화력 1~20**: `core/fire.js`의 fireSpec. 홀수=탄 추가, 짝수=데미지+굵기(위력 교대). L≥12 측면, L≥17 후방.
5.4. **진행**: 10구역. 1~9 웨이브+중보스(호위 동반), 10 최종보스. 화력·목숨은 구역 넘어가도 유지.
5.5. **화면 전환 타이머**: setTimeout 아닌 dt 기반(pendingTimer/transitionTimer/winTimer) - 일시정지 안전.

# 6. 작업 시 주의

6.1. **[hidden] 덮임(#190)**: `.menu-screen`/`.game-screen`의 `display:flex`가 `[hidden]{display:none}`을 명시도로 덮는다. styles/main.css에서 `[hidden]{display:none !important}`로 눌러야 화면 안 겹침.
6.2. **sr-only 자체 정의**: 공유 CSS에 sr-only 없어 styles/main.css에 직접 정의.
6.3. **DPR·리사이즈**: main.js `resize()`가 stage 부모 rect 기준. startGame에서 gameScreen 표시 후 호출해야 세로 공간 확보.
6.4. **사운드 톤은 실청 영역**: browser-shot 무음이라 재생 호출 무결성만 자동 확인 가능.

# 7. 변경 이력

- 2026-07-06: html-game v0.3.2 적용 (game.js 단일 → src 모듈 분리 + docs + tests + 전체화면 버튼).
- 진행/완료/다음 작업은 `PROGRESS.md` 참조.
