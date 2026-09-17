# 오늘운동 (TodayFit)

## 1. 앱 한 줄
월 단위로 짜 둔 운동 계획을 그날 실행하고, 계획 대비 실제 수행 결과를 남기는 개인 전용 앱.

## 2. 작업 워크플로우 (반드시 지킬 것)
1. 요구사항 → 영향받는 문서 식별
2. 해당 문서 수정 (단일 진실의 원천)
3. 변경된 문서 기반으로 코드 수정
4. 테스트 코드도 함께 수정

## 3. 문서 인덱스
- **docs/planning-todayfit.html - 기획서. 무엇을 왜 그렇게 정했는가의 SSOT (도면 2장 포함)**
- docs/01_spec.md - 화면, 상태 전환, 날짜 판정, 집계, 소리를 구현자가 읽는 형태로
- docs/02_data.md - 수치 / 코드값 / 저장 스키마 / 소리 값
- docs/03_architecture.md - 폴더 / 모듈 / 의존성 / **설계 시 검토 여섯의 결론** / 테스트 경계
- docs/04_conventions.md - 이름 짓기, 시간, 저장, 주석, 테스트, 토큰 규칙

기획서와 나머지가 어긋나면 기획서가 진실이다. 결정을 바꾸려면 기획서를 먼저 고친다.

## 4. 절대 규칙
- **운동 구간은 시간으로 끝나지 않는다.** 권장 수행시간이 지나도 자동 종료·자동 일시정지를 하지 않고 초과 시간을 계속 센다. 세트 완료는 사용자가 `다음`을 눌러야 확정된다 (01_spec.md 4.1.2)
- 준비 · 휴식 · 전환 셋만 시간으로 자동 이동한다
- `src/core/`는 DOM / window / localStorage / `Date.now` 일체 금지. 지금 시각은 인자로 받는다 (03_architecture.md 2.2)
- 저장은 `src/store/repo.js` 경유, 그 안에서 `createStorage("todayfit")`. **localStorage 직접 접근 금지** (클라우드 동기 신호가 끊긴다)
- 경과 시간은 시각 차이로 구한다. 틱을 세어 더하지 않는다 (04_conventions.md 3.1)
- 매직 넘버 금지. 모든 수치는 `src/data/constants.js`에서 (정의는 02_data.md)
- 브라우저 사정을 다루는 코드(화면 꺼짐 방지 · 음성 · 시각)는 `src/platform/` 셋 안에만 둔다
- 게임 프레임(`shared/frame/index.js`의 시작 화면 · 상점 · 지갑 · 진행맵)은 쓰지 않는다. `shared/frame/audio.js`만 예외로 쓴다
- 스냅샷 두 자리를 깨지 않는다 - 월간 계획 생성 시점과 운동 시작 시점에 값을 복사하고 참조를 끊는다 (01_spec.md 3.3 / 3.4)
- docs와 코드가 충돌하면 docs가 진실

## 5. 기술 환경
- ES Modules 직접 사용. 빌드 / 번들러 / TypeScript 금지
- import는 상대경로 + `.js` 확장자 명시
- 외부 라이브러리 없음
- 저장 키는 공용 규칙대로 `gg.todayfit.<키>`가 된다

## 6. 공용 자산
- `shared/tokens.css` → `shared/base.css` → `styles/tokens.css` → `styles/main.css` 순서로 링크
- **밝은 바탕이다.** `styles/tokens.css`가 `:root`에서 공용 토큰 값을 덮어쓴다. 토큰 이름은 그대로 두고 값만 바꾼다(03_architecture.md 3.7)
- `shared/storage.js`(저장) · `shared/ui.js`(확인 창 · 알림 · 작업자 등록) · `shared/frame/audio.js`(비프음)
- `shared/cloud/auto.js`는 index.html에서 script로 로드
- **손대야 하는 공용 파일 셋** - `shared/cloud/policy.js`(이 앱 슬롯 항목), `apps/_registry.json`(등록), `service-worker.js`(배포 시 판 번호). 그 밖은 고치지 않는다

## 7. 실행
- 로컬: 저장소 루트에서 `node scripts/dev-server.mjs 8000` → `http://127.0.0.1:8000/apps/todayfit/`
- 테스트: `node tests/run-node.js` (작업 폴더 `apps/todayfit`)
- 배포: main 브랜치 push → GitHub Pages

## 8. 현재 상태
기획 확정, 설계 완료. 구현은 규칙(`core/`)·저장(`store/`)·브라우저 층(`platform/` · `input/`)과 화면 셋(오늘 · 운동 실행 · 종료 요약)까지 왔고 테스트 151건이 통과한다(`node tests/run-node.js`).

아직 없는 것 - 달력 `S-02` · 날짜 상세 `S-04` · 날짜별 계획 수정 `S-05` · 요일 규칙 `S-06` · 루틴 `S-07`/`S-08` · 운동 템플릿 `S-09`/`S-10` · 기본값과 소리 `S-11`. 이 화면들이 없어 **앱 안에서 운동 템플릿·루틴·계획을 만들 길이 아직 없다.**

허브 등록부(`apps/_registry.json`)에 등재했고 배포 판 번호(`service-worker.js` v238)도 올렸다(사용자 지시 2026-09-17). **카드로 들어가면 지금은 `오늘 예정된 운동 없음`만 보인다** - 계획을 만들 화면이 없어서다. 실행 화면을 보려면 저장소에 `gg.todayfit.plans` 를 직접 심어야 한다.

남은 기획 결정 일곱은 기획서 11.1에 있고 전부 화면 하나 수준이라 남은 구현을 막지 않는다.

## 9. 변경 이력
- 2026-09-17: 허브 등록부 등재 + 배포 판 번호 v238. GitHub Pages 에서 열리는 상태가 됐다
- 2026-09-17: 저장·브라우저 층 + 화면 셋(오늘 · 운동 실행 · 종료 요약) 구현. `render/format.js` 신설(설계에 없던 파일, 03_architecture.md 1.1 에 기재). 아이폰 세로 390x844 로 전 구간 확인
- 2026-09-17: html-game v0.4.4 적용. 시작 흐름 공용 프레임(시작 화면 · 상점 · 지갑 · 진행맵)은 적용 대상 밖 - 앱이라 그 부품이 쓰이는 자리가 없다. `shared/frame/audio.js`만 쓴다
- 2026-09-17: 기획 확정, 설계 완료. 구현 미착수
