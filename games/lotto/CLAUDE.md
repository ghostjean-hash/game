# Blessed Lotto

## 1. 게임 한 줄
한국 6/45 로또 번호를 캐릭터 시드로 추천하는 PWA. 당첨 확률 향상이 아닌 선택의 서사화.

## 2. 작업 워크플로우 (반드시 지킬 것)
1. 사용자 요구사항을 받으면, 먼저 어떤 문서를 수정해야 하는지 식별
2. 해당 문서를 수정 (단 하나의 진실의 원천)
3. 변경된 문서 기반으로 코드 수정
4. 테스트 코드도 함께 수정

## 3. 문서 인덱스
- docs/01_spec.md - 게임 규칙, 조작, 화면 흐름
- docs/02_data.md - 게임 데이터, 수치, 색상
- docs/03_architecture.md - 폴더/모듈 구조, 의존성 규칙
- docs/04_conventions.md - 네이밍, 주석, 테스트, 토큰 규칙

## 4. 절대 규칙
- 게임 로직과 렌더링은 절대 한 모듈에 두지 않는다
- 매직 넘버 금지. 모든 수치는 docs/02_data.md 정의 상수에서
- core/는 DOM/Canvas/window/document 일체 import 금지
- 핵심 로직 변경 시 반드시 테스트 코드 업데이트
- docs와 코드가 충돌하면 docs가 진실. 코드를 docs에 맞춰 수정

## 5. 기술 환경
- ES Modules 직접 사용. 빌드/번들러/TypeScript 금지
- import는 상대경로 + .js 확장자 명시
- 외부 라이브러리 최소화. 필요시 CDN ESM 빌드만
- 영속 데이터는 localStorage, 키 prefix는 lotto_

## 6. 색상과 스타일
- 게임 데이터(블록 색 등): src/data/colors.js 상수만 사용
- 디자인 토큰(UI 색/간격/폰트): styles/tokens.css 변수만 사용
- 인라인 매직 값 금지

## 7. 실행
- 로컬 dev 서버 (권장): 게임 허브 루트에서 `node scripts/dev-server.mjs 8000` → `http://127.0.0.1:8000/games/lotto/`. Cache-Control no-store, SW 무관.
- Live Server (VS Code): 5500 포트로도 동작하나 SW / 캐시 충돌 가능. 개발환경 자동 SW 차단은 `shared/ui.js`가 처리.
- 테스트:
  - 브라우저: `tests/test.html`을 열기 (DOM 결과 시각화).
  - Node CLI (자동 회귀): `node tests/run-node.js` (lotto 폴더에서). 0 의존성. GitHub Actions(`test-lotto.yml`)가 push/PR마다 자동 실행.
- 페치: `scripts/fetch-lotto-draws.bat` 더블클릭(Windows) 또는 `node scripts/fetch-lotto-draws.mjs`. smok95/lotto 미러 bundle 한 방, 1초 미만.
- 배포: main 브랜치 push → GitHub Pages 자동 배포. 회차 데이터는 매주 일요일 03:00 KST에 GitHub Actions가 자동 페치 + commit.

## 8. 변경 이력
- 2026-05-01: html-game v0.1 적용 (초기 셋업)
- 2026-05-01: html-game v0.2 마이그레이션 (8.4 항목 일반화 반영)
- 2026-05-02: 7장 실행 안내를 dev-server.mjs / .bat 페치 / 자동화 워크플로우 기준으로 갱신.
- 2026-05-02: Sprint 017 - Node CLI 테스트(`tests/run-node.js`) + GitHub Actions(`test-lotto.yml`) 자동 회귀 환경 도입.
