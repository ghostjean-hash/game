# Nonogram

## 1. 게임 한 줄
행/열 숫자 힌트로 칸을 채워 숨은 픽셀 그림을 완성하는 로직 퍼즐.

## 2. 작업 워크플로우 (반드시 지킬 것)
1. 요구사항 → 영향받는 문서 식별
2. 해당 문서 수정 (단일 진실의 원천)
3. 변경된 문서 기반으로 코드 수정
4. 테스트 코드도 함께 수정

## 3. 문서 인덱스
- docs/01_spec.md - 게임 규칙, 조작, 화면 흐름
- docs/02_data.md - 상수 / 색상 / 퍼즐 / 저장 스키마
- docs/03_architecture.md - 폴더 / 모듈 구조, 의존성, 데이터 흐름
- docs/04_conventions.md - 네이밍, 코드 / 색상 / 테스트 규칙

## 4. 절대 규칙
- 게임 로직(`src/core/`)과 렌더링(`src/render/`)은 절대 한 모듈에 두지 않는다
- `src/core/`는 DOM / Canvas / window / document 일체 import 금지 (순수 함수)
- 보드 상태는 불변. 변경은 새 배열/객체를 반환, 원본 변형 금지
- 매직 넘버 금지. 모든 수치는 `src/data/` 정의 상수에서
- 퍼즐은 유일해(unique solution) 검증을 통과해야 내장. 검증은 `src/core/` solver가 담당, 테스트가 확인
- docs와 코드가 충돌하면 docs가 진실

## 5. 기술 환경
- ES Modules 직접 사용. 빌드 / 번들러 / TypeScript 금지
- import는 상대경로 + .js 확장자 명시
- 외부 라이브러리 없음(vanilla). 영속 데이터는 shared/storage.js(`createStorage("nonogram")`)

## 6. 색상과 스타일
- 게임 데이터 색(퍼즐 완성 그림 색 등): src/data/colors.js 상수만 사용
- UI 색 / 간격 / 폰트: styles/tokens.css 변수만 사용 (허브 공용 shared/tokens.css 활용 여부는 컨셉 확정 시 결정)
- 셀 크기는 CSS 변수 한 곳에서 파생. px 하드코딩 금지

## 7. 실행
- 로컬: 루트에서 `node scripts/dev-server.mjs 8000` 후 http://127.0.0.1:8000/games/nonogram/
- 테스트: tests/test.html을 브라우저에서 열기 (전체 자동 실행, 상단에 PASS/FAIL)
- 배포: main 브랜치 push → GitHub Pages 자동 배포

## 8. 변경 이력
- 2026-07-02: html-game v0.2 적용 (초기 셋업, 컨셉 확정 전 골격)
- 2026-07-02: 컨셉 확정 + 1차 구현 완료. docs 4종 확정(도감 수집형·실패 없음·터치 우선·크기 3단). core(hints/solver/board/stars) + data(constants/colors/puzzles 15종) + render 4뷰 + input + main 조립. 솔버 유일해·추측불필요 전수 검증 통과, 테스트 16/16 PASS. 실제 플레이 플로우(맵→풀이→클리어 변신→도감) browser-shot 검증 완료.
- 2026-07-03 (7차): 도감(별도 화면) 제거 - 맵이 클리어 컬러 썸네일로 겸함(albumView.js 삭제, docs·코드 정리). 맵 첫 화면에 게임 허브 복귀 홈 버튼(← 화살표만, 다른 게임 표준 일치). 퍼즐 번호 접미 이름 5종을 실제 그림·색 이름으로(산토끼·노랑고양이·갈색원숭이·아기돼지·금붕어). 테스트 20/20 PASS.
