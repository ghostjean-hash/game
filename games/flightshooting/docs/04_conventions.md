# 04 컨벤션 (Sky Raider)

## 1. 기술 환경

- ES Modules 직접 사용(`<script type="module">`). 빌드/번들러/TypeScript 금지.
- import는 상대경로 + `.js` 확장자 명시.
- 외부 라이브러리 없음(vanilla). 공유 자산은 `../../../shared/`(loop·storage·ui) + `../../shared/`(index.html의 tokens·base css).

## 2. 네이밍

- 함수: camelCase 동사구(`spawnBoss`, `stepWorld`).
- 상수 묶음: 대문자(`CFG`, `COLORS`, `STAGE_NAMES`).
- 파일: 소문자. core 로직 파일은 역할명(`fire.js`, `waves.js`, `world.js`).

## 3. 매직 넘버 / 색상

- 수치는 `src/data/numbers.js`(CFG), 게임 색은 `src/data/colors.js`(COLORS)에서만. 인라인 매직 값 금지.
- 예외: `src/audio/sound.js`의 합성 파라미터(주파수/길이/게인)는 오디오 디자인 상수로 그 파일에 둔다.

## 4. core 순수성 규칙

- `core/`는 DOM/Canvas/window/document/오디오 import 금지.
- 부수효과 금지 → `game.sfx`(사운드 이름), `game.events`(화면 전환 신호)로만 바깥에 알린다.
- 시간 지연은 `setTimeout` 대신 dt 기반 타이머 필드.

## 5. 주석

- 각 모듈 상단 1~2줄로 역할·순수성 여부 명시.
- 왜(설계 의도)를 적고 무엇(코드가 말하는 것)은 반복하지 않는다.

## 6. 테스트

- `tests/test.html`을 브라우저로 열면 `core/`의 순수 함수(frontSpec·optionSlot·gain/loseLastPart·buildWaves·hit) 테스트가 자동 실행된다.
- core 로직(발사 패턴·웨이브·충돌) 변경 시 대응 테스트를 함께 갱신한다.
- 렌더·입력·오디오·플로우는 browser-shot 스크린샷 + 실플레이로 확인(순수 단위 테스트 대상 아님).

## 7. 실행

- 로컬: 루트에서 `node scripts/dev-server.mjs 8000` 후 `http://127.0.0.1:8000/games/flightshooting/`.
- 테스트: `tests/test.html`을 브라우저에서 열기.
- 배포: main push → GitHub Pages.
