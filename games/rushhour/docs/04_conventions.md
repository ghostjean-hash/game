# 04 컨벤션 (Rush Hour)

## 1. 네이밍

1.1. 파일 / 폴더: 소문자 + 필요 시 하이픈. 모듈은 역할 명사(`board.js`, `render.js`).
1.2. 함수: 동사로 시작(`moveCar`, `slideRange`, `isSolved`). 판정 함수는 `is`/`can` 접두.
1.3. 상수: `UPPER_SNAKE_CASE`(`BOARD_SIZE`). enum 객체는 키도 대문자(`ORIENT.H`).
1.4. 좌표는 항상 `(row, col)` 순서, 둘 다 0부터.

## 2. 코드 규칙

2.1. 매직 넘버 0. 모든 수치는 `src/data/constants.js`에서 import.
2.2. `core/`는 DOM / window / document import 금지. 순수 함수만.
2.3. `cars` 배열은 불변으로 다룬다. 이동은 새 배열을 반환(`map` / 스프레드), 원본 변형 금지.
2.4. import는 상대경로 + `.js` 확장자 명시. 빌드 / 번들러 / TypeScript 없음.
2.5. 외부 라이브러리 없음(vanilla). 폴리필 없음, 최신 브라우저 기준.

## 3. 색상 / 스타일

3.1. 차 색(게임 데이터)은 `src/data/colors.js` 상수만 사용.
3.2. UI 색 / 간격 / 폰트는 `shared/tokens.css` CSS 변수 사용. 인라인 매직 값 금지.
3.3. 셀 크기는 `--cell` 한 곳에서 파생. px 하드코딩 금지.

## 4. 주석

4.1. 무엇이 아니라 왜를 적는다. 좌표 규약 / 카운팅 규칙 등 헷갈리는 결정에만.
4.2. 사양은 docs가 SSOT. 코드 주석에 규칙을 중복 서술하지 않는다.

## 5. 테스트

5.1. 브라우저 기반. `tests/test.html`을 열면 전체 자동 실행.
5.2. `core/` 모듈은 테스트 필수. 특히 이동 / 클리어 / 솔버.
5.3. 모든 내장 퍼즐의 유효성(02_data §3.4)과 풀 수 있음을 테스트가 강제한다.
5.4. 핵심 로직 변경 시 테스트를 함께 수정한다.

## 6. localStorage

6.1. 키 prefix는 `rushhour_`(`STORAGE_PREFIX`). 스키마는 02_data §4.
6.2. 읽기 실패 / 파싱 실패 시 기본값으로 안전 복구(throw 금지).
