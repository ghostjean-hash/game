# Mines (지뢰찾기)

## 1. 게임 한 줄
숫자를 단서로 지뢰를 피해 안전한 칸을 모두 열어내는 고전 추리 퍼즐.

## 2. 작업 워크플로우 (반드시 지킬 것)
1. 요구사항 → 영향받는 문서 식별
2. 해당 문서 수정 (단일 진실의 원천)
3. 변경된 문서 기반으로 코드 수정
4. 테스트 코드도 함께 수정

## 3. 문서 인덱스
- **docs/planning-mines.html - 기획서. 무엇을 왜 그렇게 정했는가의 SSOT (화면 그림 3장 포함)**
- docs/01_spec.md - 판 규칙, 조작, 화면 흐름을 구현자가 읽는 형태로
- docs/02_data.md - 난이도 / 칸 크기 / 조작 판정 / 색 / 소리 / 저장 스키마
- docs/03_architecture.md - 폴더 / 모듈 구조, 의존성 방향, 테스트 경계
- docs/04_conventions.md - 이름 짓기, 주석, 테스트, 토큰 규칙

기획서와 나머지가 어긋나면 기획서가 진실이다. 결정을 바꾸려면 기획서를 먼저 고친다.

## 4. 절대 규칙
- 게임 로직(`src/core/`)과 렌더링(`src/render/`)은 절대 한 모듈에 두지 않는다
- `src/core/`는 DOM / Canvas / window / document 일체 import 금지 (순수 함수)
- 매직 넘버 금지. 모든 수치는 `src/data/constants.js` · `colors.js`에서
- 좌표는 `x`(가로) / `y`(세로)로만 쓴다. `row` / `col` 금지 (뒤바뀐 버그 예방)
- 지뢰 배치는 판 생성 시점이 아니라 **첫 칸을 여는 시점**에 한다 (01_spec.md 3.2)
- 저장은 `shared/frame/save.js` 경유. localStorage 직접 접근 금지 (클라우드 동기 신호 끊김)
- 시작 흐름(다섯 화면 · 상단 띠 · 되돌아가기 계단 · 결과 카드 · 소리)은 `shared/frame/`을 쓴다. 새로 만들지 않는다
- docs와 코드가 충돌하면 docs가 진실

## 5. 기술 환경
- ES Modules 직접 사용. 빌드 / 번들러 / TypeScript 금지
- import는 상대경로 + .js 확장자 명시
- 외부 라이브러리 없음(vanilla). 저장 네임스페이스는 `mines` (`gg.mines.*`)

## 6. 색상과 스타일
- 게임 데이터 색(숫자 색 1~8, 칸 상태 색): `src/data/colors.js` 상수만 사용
- UI 색 / 간격 / 폰트: `styles/tokens.css` 변수만 사용
- 라이트 톤. 뷰포트·safe-area·터치 골격은 `shared/base.css` 링크로 받는다
- 칸 크기는 CSS 변수 한 곳에서 파생. px 하드코딩 금지

## 7. 실행
- 로컬: 루트에서 `node scripts/dev-server.mjs 8000` 후 http://127.0.0.1:8000/games/mines/
- 테스트: tests/test.html을 브라우저에서 열기 (전체 자동 실행, 상단에 PASS/FAIL)
- 배포: main 브랜치 push → GitHub Pages 자동 배포

## 8. 변경 이력
- 2026-08-21: html-game v0.4.2 적용 (초기 셋업 + 사양 확정). 난이도 모바일 맞춤 3단, 깃발은 길게 누르기 + 모드 전환 둘 다
