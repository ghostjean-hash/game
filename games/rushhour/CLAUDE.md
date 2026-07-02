# Rush Hour

## 1. 게임 한 줄
6x6 주차장에서 앞뒤 차를 밀어 가로막힌 빨간 차를 오른쪽 출구로 빼내는 슬라이딩 블록 퍼즐.

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
- `cars` 배열은 불변. 이동은 새 배열을 반환, 원본 변형 금지
- 매직 넘버 금지. 모든 수치는 `src/data/constants.js`에서
- 퍼즐 최소 이동수는 하드코딩 금지. `src/core/solver.js`(BFS)가 계산, 테스트가 검증
- docs와 코드가 충돌하면 docs가 진실

## 5. 기술 환경
- ES Modules 직접 사용. 빌드 / 번들러 / TypeScript 금지
- import는 상대경로 + .js 확장자 명시
- 외부 라이브러리 없음(vanilla). 영속 데이터는 shared/storage.js(`createStorage("rushhour")`)

## 6. 색상과 스타일
- 차 색(게임 데이터): src/data/colors.js 상수만 사용
- UI 색 / 간격 / 폰트: shared/tokens.css 변수만 사용
- 셀 크기는 `--cell` 한 곳에서 파생. px 하드코딩 금지

## 7. 실행
- 로컬: 루트에서 `node scripts/dev-server.mjs 8000` 후 http://127.0.0.1:8000/games/rushhour/
- 테스트: tests/test.html을 브라우저에서 열기 (전체 자동 실행, 상단에 PASS/FAIL)
- 배포: main 브랜치 push → GitHub Pages 자동 배포

## 8. 변경 이력
- 2026-06-26: html-game v0.2 적용 (초기 셋업 + 표준 기능 + 내장 퍼즐 세트)
- 2026-07-01: 쌍둥이 퍼즐 28쌍 재생성(인접 형태 유사도 제거, 다양성) + 말랑이(C) 표정 그리드 캐릭터 스타일(16컷 단일 시트, 발밑·좌우 자동 정렬, 눈 깜빡+표정 순환, 블럭 단위 통일·겹침 방지) + 클리어 팝업 확대
- 2026-07-01: 소스 최적화 - 미사용 PNG 3개 삭제 + 사용 PNG 10개 pngquant 압축(assets 1.7M→332KB, 81%↓) + 스프라이트 순환 데드코드 제거(render.js·style.css·styles.js, 71줄↓, docs 02_data §2.4 정정)
- 2026-07-02: 상점 스킨색/장식/표정 죽은 입력 복구 + 별 효과음 / 스타일 정리(모찌 삭제·포니·밥풀이) + 설정 통합 + 밥풀이 셀 단위 표정 + 클리어/시간위기 감정 + 상단 SVG 아이콘 / dev-server 포트 충돌 안내
- 2026-07-02: 2모드 추가 - 오리지널(자체 186개) / 보드게임(ThinkFun, `puzzles-boardgame.js`, 임시 6개). 진행·별은 모드별 저장(`progress.modes`), 골드·꾸미기는 공유. 옛 저장 데이터는 `migrateProgress`가 오리지널 모드로 이관
- 2026-07-02: 모드 선택을 진행 맵 안 탭으로 이동(상단 즉시 전환 폐지, `mapViewMode` 미리보기 → 퍼즐 선택 시 확정) + 전체 팝업 라이트 테마(`.modal` 스코프 색 토큰 재정의)
- 2026-07-02: 밥풀이 표정 블록 단위 통일(깜빡 타이밍만 셀별) + 모드/난이도 배지(`#stage-mode`/`#stage-diff`) 화면 표시
- 2026-07-02: Fogleman 모드 추가(`puzzles-fogleman.js`, DB에서 400개 추출, 4단계 곡선). `optimal` 필드로 고난도 런타임 solve 생략 + 힌트 `HINT_MAX_OPTIMAL` 가드. MIT 출처: 소스 헤더 + `LICENSE-fogleman` + 맵 탭 credit. `migrateProgress` MODES 순회 동적화
- 2026-07-02: 상점 전면 개편 - 색 스킨(filter, 무지개 포니에 부적합) 완전 제거, 명칭 토끼→포니, 테마 '적용'/장식 '장착' 표현 구분. 상점 2종(테마 적용 + 포니 머리 장식 장착)
