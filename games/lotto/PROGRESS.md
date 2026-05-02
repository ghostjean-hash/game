# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-02 (Sprint 015 - 폴리싱 묶음: 5세트 chip + 의식 글로우 + 역추첨 펼치기).
1.4. **적용 표준**: html-game v0.2.

# 2. 완료 마일스톤

## 2.36. Sprint 015 완료 - 폴리싱 묶음 (2026-05-02)

자율 진행. 결정 보류 옵션 채택 - 사용자 결정 0개로 폴리싱 3건. 모두 직전 sprint(013/014) 상위에 자연 확장.

### 2.36.1. S5-T1 5세트 #2~#5 과거 매칭 chip

#2~#5 컴팩트 카드 우측에 `과거 최고 N등 (M회)` chip. 5세트 가치 가시화 ("왜 5세트?" 답변).

- core/reverse.js: 기존 `reverseSearch` 재활용 (호출만).
- src/render/main.js: `computeFiveSetsMatchInfos(sets, draws)` 헬퍼 - sets 길이 배열 반환 ([0]은 hero가 처리하므로 null).
- src/render/draw-card.js: `fiveSetsExtraHtml(sets, matchInfos)` 시그니처 확장 (matchInfos 옵션). chip 두 가지 톤 (`has-rank` 골드 + 일반 회색). 면책 카피 "과거 매칭 횟수는 미래 적중률과 무관" 추가.
- styles/main.css: `.five-set-chip` + `.has-rank` 골드. 모바일은 chip을 다음 줄로 (`grid-column: 1 / -1`).

### 2.36.2. S5-T2 의식 만땅 추천 카드 #1 골드 글로우

만땅 보상 가시화 강화. 게이지 바뿐 아니라 추천 카드 #1에도 골드 펄스.

- src/render/main.js: `homeTabHtml`에서 `state.ritual.appliedBonus`로 `ritualFilled` 계산 → `drawCardHtml`에 옵션 전달.
- src/render/draw-card.js: `drawCardHtml(drwNo, rec, fortune, opts)` 시그니처 확장. `opts.ritualFilled` true면 `.is-blessed-ritual` 클래스 추가.
- styles/main.css: `@keyframes blessed-ritual-pulse` 2.4s ease-in-out 무한. `prefers-reduced-motion` 시 정적 골드 외곽 fallback.
- 5세트 #2~#5는 미적용 (서사 표시 전용 일관성).

### 2.36.3. S5-T3 역추첨 동률 다회차 펼치기

기존: 가장 최근 매칭 회차 1건만 표시. 동률 K회 시 사용자가 나머지 매칭 회차 확인 불가.

- core/reverse.js: `findMatchingDraws(userNumbers, draws, rank)` 신설. drwNo 내림차순 정렬 (가장 최근 우선).
- src/render/reverse-page.js:
  - `bestRankCount > 1`일 때 결과 카드 아래 "전체 보기 (N건)" 버튼.
  - 클릭 시 `showModal`로 모든 매칭 회차 리스트 (회차 + 추첨일 + 발표 번호 + 일치 강조).
- styles/main.css: `.reverse-best-expand` 버튼 + `.reverse-all-modal` / `.reverse-all-list` / `.reverse-all-item`.
- tests/suites/reverse.test.js: 5 케이스 추가 (5등 동률 3건 / 1등 1건 / 매칭 0건 / 잘못된 rank / 빈 draws).

### 2.36.4. 영향 파일 (10건)

- 신규 0건.
- 수정 10건: docs/01_spec.md / src/core/reverse.js / src/render/main.js / src/render/draw-card.js / src/render/reverse-page.js / styles/main.css / tests/suites/reverse.test.js / PROGRESS.md.

### 2.36.5. QA 결과

- core/ DOM 의존성: 0건 (`findMatchingDraws` 순수 함수).
- 사행성 표현 위반: 0건 (chip / 모달 모두 부정 톤 - "과거 매칭은 미래 적중률과 무관" 명시).
- 옛 라벨 잔존: 0건.
- 매직 넘버: 0건 (rank 검증은 `[1,2,3,4,5]` 리터럴이지만 게임 규칙 그 자체이며 `numbers.js` import 형태 아님 - 기존 reverseSearch와 동일 패턴).
- docs SSOT 정합: 01_spec.md 5.1.3.2 / 5.6.7 / 5.7.8 갱신.
- 회귀: Sprint 014 12 케이스 모두 통과 + 신규 8 케이스 통과.

### 2.36.6. 다음 sprint 후보

- Sprint 016 (Decision-blocked): #10 명망 로직 / #7 OCR - 사용자 결정 필요 항목.
- 폴리싱 후순위: 통계 페이지 갱신 토스트 위치 미세 / 기간 필터 / 결제 시스템 (별도 윤리 가이드).

## 2.35. Sprint 014 완료 - 5세트 동시 추천 + 의식 폴리싱 (2026-05-02)

Charm 우선. 콘텐츠 풍부함 + 라이트 사용자 비노출(기본 OFF) 유지.

### 2.35.1. S4-T1 5세트 동시 추천 (#3)

"한 회차의 다양한 시도"를 시드 변형으로 5장 결정론 추천. 다중 모드와 직교(병행 가능).

- numbers.js: `FIVE_SETS_COUNT=5` / `FIVE_SETS_SALT_BASE=0x5E7A` 신설.
- recommend.js: `recommendFiveSets(ctx, opts)` 신설.
  - `i=0` = baseSeed 그대로(메인, 기존 동작 호환).
  - `i=1..4` = `mixSeeds(baseSeed, FIVE_SETS_SALT_BASE + i)` 변형(시드 의존 전략).
  - 객관 전략은 캐릭터 시드 무관 → drwNo 분기 솔트로 회차 내부 5분기(객관성 유지, 시드 영향 0).
  - 다중 모드 호환: `opts.multi=true`이면 각 세트 안에서 `recommendMulti`.
- storage.js: `options.fiveSets` 신설(기본 false).
- main.js:
  - `getRecAndFortune`을 `(rec, sets)` 반환으로 확장. 5세트 OFF면 `sets=null`.
  - `homeTabHtml`에 `sets` 인자 추가 + hero 안에 `fiveSetsExtraHtml(sets)` 삽입.
  - 이력 / Luck / 의식 보너스 영향은 `#1`만(서사 표시 #2~#5는 표시 전용). 백캐스트 영향 없음.
  - `OPTIONS_DEFAULT` reset 시 `multiStrategy / fiveSets` 명시 reset.
- draw-card.js: `fiveSetsExtraHtml(sets)` export(SSOT). #2~#5만 컴팩트 카드(인덱스 + 본번호 + 보너스). 면책 카피 1회 노출.
- settings-page.js: "5세트 동시 추천" 토글 + `onFiveSetsToggle` 핸들러.
- styles/main.css: `.five-sets-extra` / `.five-set-row` / `.five-set-balls`(6fr:auto:1fr) / `.five-set-main`(repeat-6) / 모바일 반응형 30px → 26px.
- 테스트: 7 케이스(길이 / numbers / [0]=메인 / 시드 변형 / 결정론 / 객관 변형 / 다중 호환).

### 2.35.2. S4-T2 의식 폴리싱 - Canvas 파티클

만땅 진입 직후(`appliedBonus` false → true 전환) 0.9초 단발 방사형 파티클. `prefers-reduced-motion` 시 비활성.

- 신규 파일: `src/render/ritual-particles.js`.
  - `spawnRitualBurst(anchor)`: anchor 중심에서 30개 입자, RADIUS_MAX=140px, ease-out + alpha 페이드.
  - body에 fixed canvas 마운트, `requestAnimationFrame` 단일 루프, 종료 후 자동 detach + setTimeout 안전 가드.
  - `matchMedia('(prefers-reduced-motion: reduce)')` 즉시 종료(canvas 마운트 자체 스킵).
- main.js `openRitualModalForActive` 안 `onPerform`:
  - `result.justFilled && bonus.applied`인 순간 `burstNow=true` 플래그.
  - 모달 재렌더 후 `requestAnimationFrame` 1단 늦춰 `.ritual-complete-banner`를 anchor로 spawn(좌표 측정 안전성).
- styles/main.css: `@media (prefers-reduced-motion: reduce) { .ritual-burst-canvas { display: none !important; } }` (JS 가드 + CSS 이중 가드).

### 2.35.3. 영향 파일 (10건)

- 신규 1건: `src/render/ritual-particles.js`.
- 수정 9건: docs/01_spec.md / docs/02_data.md / docs/03_architecture.md / src/data/numbers.js / src/data/storage.js / src/core/recommend.js / src/render/main.js / src/render/draw-card.js / src/render/settings-page.js / styles/main.css / tests/suites/recommend.test.js / PROGRESS.md.

### 2.35.4. QA 결과

- core/ DOM 의존성: 0건(`recommendFiveSets`는 순수 함수, ritual-particles.js는 render/).
- 사행성 표현 위반: 0건(컴팩트 카드 면책에 "5장 구매 권유 아님 / 당첨 확률 변화 없음" 명시).
- 옛 라벨 잔존: 0건.
- 매직 넘버: 0건(`FIVE_SETS_COUNT` / `FIVE_SETS_SALT_BASE` 모두 numbers.js. 파티클 시각 효과 파라미터는 ritual-widget 패턴 따라 모듈 내부 상수).
- docs SSOT 정합: 3종 갱신(02 1.5.5 / 3.2 / 3.6.5, 01 5.1.3.2 / 5.6.7~8, 03 폴더 트리).
- 시뮬 회귀: 영향 없음(객관 전략 5세트 변형 검증).
- Node 스모크 49/49 통과(단일/다중/5세트/결정론/분배 카운트).

### 2.35.5. 다음 sprint 후보

- Sprint 015 (Depth): #10 명망 로직(사주/별자리/MBTI 매핑 출처 결정 필요) + #1 4분면 행운 번호.
- Sprint 016 (Tech): #7 OCR(영수증 형식 결정 필요).
- 폴리싱 후보: 5세트 결과를 휠링 시드 풀로 활용 / 5세트 매칭 회차 표시 / 의식 만땅 시 5세트 #1 강조 글로우.

## 2.34. Sprint 013 완료 - 다중 전략 + 전적 강화 + 4종 행운 토글 (2026-05-02)

Trust 우선. 사용자 "전략 추출 신뢰 없다" 결손 정면 해결.

### 2.34.1. S3-T1 다중 전략 분배 + 번호별 출처 라벨 (#2)

추천 신뢰성의 가시화. 사용자가 카드를 보면 "어느 번호가 어느 전략에서 나왔는지" 즉시 인지.

- numbers.js: STRATEGY_CATEGORIES 매핑 + MULTI_STRATEGY_MAX=6 신설.
- recommend.js:
  - distributeCounts(n) export: 6/N 균등 + 나머지 첫 N에 +1.
  - recommendMulti(ctx) export: 각 전략 순회 + 중복 제외 + fallback (blessed 균등) + 보너스 본번호 겹침 시 균등 재추출.
  - strategySources 필드 반환 (다중 모드만).
- storage.js: options.multiStrategy 신규 (기본 false).
- character-form.js: lastUsedStrategies 배열 초기값 추가.
- main.js:
  - getRecAndFortune 분기 (단일 / 다중).
  - activeStrategyIds 헬퍼 (lastUsedStrategies → fallback lastUsedStrategy).
  - 전략 탭 클릭 핸들러 다중 모드 토글 + 만선 비활성 + 최소 1개 보장.
  - onMultiStrategyToggle 핸들러로 즉시 재렌더.
- strategy-tabs.js: activeIds 배열 받음 + multi 옵션 + 만선 비활성 (.is-disabled) + multiHint 줄.
- draw-card.js: numHtml(n, label, source) → 카테고리 색 dot 추가 (단일 모드는 dot 미표시).
- settings-page.js: "다중 전략 모드" 토글 추가.
- styles/main.css: .num-cell 컬럼 + .num-source-dot 4색 + .strategy-tab.is-disabled + .strategy-multi-hint.
- recommend.test.js: 신규 7 케이스 (distributeCounts 1~6 + 범위 밖 에러 + recommendMulti 단일/2/6 전략 + 보너스 ∉ numbers + 빈 배열 에러).
- 02_data.md 1.5.4 신설 + 3.6 / 3.6.5 스키마 갱신.
- 01_spec.md 5.1.3.1 신설.

### 2.34.2. S3-T2 전적 페이지 강화 (#6 자율 부분)

기존 단일 리스트 → 4섹션. 사용자 정의 못 받은 부분(캘린더 등)은 별도 작업으로 분리.

- history-page.js:
  - summaryHtml 강화: 적중률(%) + Luck 추가, 6셀 그리드.
  - rankChartHtml 신규: horizontalBarsHtml로 1~5등 + 미적중 막대 (등수별 색).
  - timelineHtml 신규: 최근 30회 도트 + legend (등수별 + 미적중).
  - 면책 카피: "참고용. 매 회차 독립 시행이므로 누적 분포가 미래 적중률을 보장하지 않습니다."
- styles/main.css: .summary-grid (3-2 반응형) + .timeline-dots + .timeline-legend.
- 01_spec.md 5.8 신설.

### 2.34.3. S3-T3 캐릭터 카드 4종 행운 토글 (T3 Sprint 011 후속)

T3 사주 단독 → 4종 토글로 확장. 사용자 발화 "사주에 따른 행운의 번호 같은 것" 의도 충족.

- character-card.js:
  - collectLuckySources(character): 4종 매핑 수집 (사주 → 별자리 → 4원소 → MBTI 우선순위).
  - 데이터 없는 종류는 탭 미생성 (마이그레이션 케이스 안전).
  - luckyNumbersHtml: 탭 + panels 구조. 기본 활성 = 첫 종류.
- main.js: 카드 행운 토글 핸들러 (탭 클릭 → panel hidden 속성 토글).
- styles/main.css: .lucky-tabs / .lucky-tab / .lucky-element-* 4색.
- 01_spec.md 5.9 신설.

### 2.34.4. 영향 파일 (13건)

- 신규 0건.
- 수정: docs/01_spec.md / docs/02_data.md / src/data/numbers.js / src/data/storage.js / src/core/recommend.js / src/render/main.js / src/render/character-card.js / src/render/character-form.js / src/render/draw-card.js / src/render/history-page.js / src/render/settings-page.js / src/render/strategy-tabs.js / styles/main.css / tests/suites/recommend.test.js / PROGRESS.md.

### 2.34.5. QA 결과

- core/ DOM 의존성: 0건
- 사행성 표현 위반: 0건 (부정 톤 유지)
- 옛 라벨 잔존: 0건
- 매직 넘버 직접 사용: 0건 (MULTI_STRATEGY_MAX / STRATEGY_CATEGORIES 모두 numbers.js)
- docs SSOT 정합: 2종 갱신
- 시뮬 회귀: 영향 없음 (분배 로직 추가, 단일 추천 영향 없음)

### 2.34.6. 다음 sprint 후보

- Sprint 014 (Charm): #3 5세트 동시 추천 (S3-T1 위에 자연 확장) + 의식 폴리싱 (Canvas 파티클)
- Sprint 015 (Depth): #10 명망 로직 (사주/별자리/MBTI 매핑 출처 결정 필요) + #1 4분면 행운 번호
- Sprint 016 (Tech): #7 OCR (영수증 형식 결정 필요)
- 폴리싱 후보: 다중 모드 전체 매칭 회차 보기 / 기간 필터 / 결제 시스템 (별도 윤리 가이드)

## 2.33. Sprint 012 완료 - 역추첨 게임 + 휠링 백 버튼 (2026-05-02)

자율 진행. 결정 필요 없는 즉시 가능 작업 2건.

### 2.33.1. S2-T1 역추첨 게임 탭 (#4)

사용자 발화 "번호 6개를 고르면 가장 높은 순위의 회차와 순위가 표시되는 게임" 구현.

- 신규 파일:
  - `src/core/reverse.js`: `reverseSearch(numbers, draws)` + `validateUserNumbers(numbers)`. matchRank 재사용.
  - `src/render/reverse-page.js`: 9칸 그리드 + 선택 요약 + 결과 카드 + 등수별 카운트.
  - `tests/suites/reverse.test.js`: 11 케이스 (검증 + 1~5등 + 미적중 + 동률 회차 + 보너스 일치 2등).
- 하단 탭 4 → 5 복귀 (역추첨 추가, grid 아이콘 재사용).
- 사용자 입력은 모듈 변수로 보존 (탭 이동 후 복귀 시 유지).
- 동률 시 가장 최근 회차 매칭 표시 + bestRankCount로 매칭 횟수도 함께 안내.
- "랜덤 6개 선택" 보조 버튼.
- 면책 카피: "로또 6/45는 매 회차 독립 시행이므로 과거 매칭 횟수가 미래 적중률을 보장하지 않습니다. 참고용."
- docs/01_spec.md 5.7 신설 + 4장 5탭 갱신.
- 03_architecture.md 폴더 트리에 reverse.js / reverse-page.js / reverse.test.js 추가.
- styles/main.css: .reverse-grid (9-7-6 컬럼 반응형) / .reverse-cell / .reverse-best (골드 그라디언트 애니메이션) / .rank-counts.

### 2.33.2. S2-T2 휠링 페이지 백 버튼 (폴리싱)

T2(Sprint 011)로 하단 탭에서 휠링이 빠진 후, 휠링 페이지에서 설정으로 돌아오는 명시적 동선 부재 → 헤더에 "← 설정" 버튼 추가.

- wheeling-page.js: backButtonHtml 헬퍼 + onBack 콜백 받음 (renderWheelingPage / renderWheelingDisabled 모두).
- main.js: onBack = setTab('settings') 전달.
- 하단 탭으로 돌아가는 길은 그대로 유지 (선택지 추가 + 명시 동선).
- styles/main.css: .wheel-back (chevronLeft 아이콘 + "설정" 라벨).

### 2.33.3. 영향 파일

- 신규: src/core/reverse.js / src/render/reverse-page.js / tests/suites/reverse.test.js
- 수정: src/render/bottom-tabs.js / src/render/main.js / src/render/wheeling-page.js / styles/main.css / docs/01_spec.md / docs/03_architecture.md / tests/runner.js / PROGRESS.md

### 2.33.4. QA 결과

- core/ DOM 의존성: 0건
- 사행성 표현 위반: 0건 (부정 톤 유지)
- 옛 라벨 잔존: 0건
- 매직 넘버: 0건 (NUMBER_MIN/MAX/PICK_COUNT 모두 import)
- docs SSOT 정합: 2종 갱신
- 시뮬 회귀: 없음 (신규 파일이라 영향 없음)

### 2.33.5. 다음 후보

- #1 행운 번호 4분면 (영구/주간 × 공통/개별) - 결정 필요
- #2 다중 전략 분배 - 결정 필요
- #3 5세트 - 결정 필요
- #6 전적 강화 - 정의 필요
- #7 카메라 OCR - 범위 필요
- #10 명망 로직 - 출처 필요
- 폴리싱: 역추첨 매칭 동률 모든 회차 보기 / 기간 필터 / 보너스 입력

## 2.32. Sprint 011 완료 - T1/T2/T3/T4 (2026-05-02)

FM 프로세스(플랜 → 세부 기획 → 구현 → QA → 리뷰 → 개선) 첫 적용 결과.

### 2.32.1. T1 - 캐릭터 관리 추첨 → 설정 이동

- 추첨 탭 슬롯의 + 추가 / × 삭제 버튼 폐지. 슬롯은 빠른 전환만.
- 설정 탭에 "캐릭터 관리" 섹션 신설 (목록 / 활성 토글 / 행별 삭제 / + 추가).
- 마지막 1명 삭제 비활성 (UX 보호).
- main.js: deleteCharacterById / activateCharacterById 신규 핸들러.
- styles/main.css: .char-list / .char-row / .char-row-del 등.
- docs/01_spec.md 4장 갱신.

### 2.32.2. T2 - 휠링 설정 안 통합 (라이트 사용자 비노출 강화)

- 하단 탭 5 → 4 (휠링 제거). bottom-tabs.js TABS 갱신.
- 다구좌 모드 ON 시 설정 탭에 "휠링 페이지 열기" 버튼 노출 (단일 진입 동선).
- wheeling 라우트는 유지 (직접 setTab 호출 시 기존 동작).
- docs/01_spec.md 5.5.3 명문화 갱신.

### 2.32.3. T3 - 사주 행운 번호 캐릭터 카드 영구 표시

- character-card.js: luckyNumbersHtml 신규. dayPillar.stem → 천간 오행 → 행운 번호 7개.
- 추첨 결과의 큰 공과 시각 차별화 (작은 28px 컬러볼).
- "참고용 / 추첨 확률 영향 없음" 면책 캡션.
- dayPillar 없는 마이그레이션 캐릭터는 표시 생략 (안전 fallback).
- docs/01_spec.md 4장 캐릭터 카드 항목 갱신.

### 2.32.4. T4 - 행운 의식 시스템 (해석 B, 콘텐츠 게이지)

사용자 요청 "당첨 확률 높이기" 기능을 게임 컨셉(spec 1)에 정합하게 **해석 B (정성 콘텐츠)**로 재해석.

- **컨셉 정합성**: "확률" / "필승" / "당첨" 단어 코드/docs/UI 0건 유지. 추첨 알고리즘 영향 0. 만땅 시 캐릭터 Luck +5 1회 보너스만.
- **신규 파일**: src/core/ritual.js (순수 로직), src/render/ritual-widget.js (게이지 위젯 + 8행위 모달), tests/suites/ritual.test.js (16 케이스).
- **데이터 상수**: RITUAL_GAUGE_MAX=100 / RITUAL_GAIN_PER_ACTION=12.5 / LUCK_BONUS_RITUAL=5 / RITUAL_LIST 8종.
- **행위 8종**: 명상 / 수련(108배) / 정화수 / 기 모으기 / 가문 / 부적 / 행운 동전 / 별빛.
- **종교 / IP 회피**: 굿 / 원기옥(드래곤볼) / "기도하기"는 라벨 변경 또는 제외.
- **UI**: 추첨 탭 위젯 (게이지 바 + "의식 시작" 버튼) → 8행위 그리드 모달 → 카드 클릭 시 0.8초 CSS 애니메이션 (scale + glow) + 게이지 +12.5 + 카드 비활성.
- **만땅 애니메이션**: linear-gradient flow + radial-gradient pulse (CSS 키프레임).
- **회차 / 캐릭터 변경 시 자동 리셋** (`ensureCurrentState`).
- **prefers-reduced-motion 대응**: 모든 ritual 애니메이션 0.
- **저장**: localStorage `lotto_rituals` 단일 객체.
- docs/01_spec.md 5.6 신설 / docs/02_data.md 1.19 신설 + 3.2 lotto_rituals.

### 2.32.5. 산출물 영향

- docs: 01_spec.md 4 / 5.5.3 / 5.6 / 02_data.md 1.19 / 3.2 / 03_architecture.md 폴더 트리 / PROGRESS.md
- 코드: numbers.js / character-card.js / character-slots.js / settings-page.js / bottom-tabs.js / main.js / ritual-widget.js (신규) / ritual.js (신규) / storage.js
- 스타일: main.css 약 200줄 추가 (T1/T3/T4)
- 테스트: ritual.test.js 신규 16 케이스 + runner.js 등록

### 2.32.6. QA 결과

- core/ DOM 의존성: 0건
- 사행성 표현 위반: 0건 (모두 부정 톤 유지)
- 옛 라벨 잔존: 0건
- 매직 넘버 직접 사용: 0건 (RITUAL 상수 모두 numbers.js)
- docs SSOT 정합: 4종 모두 갱신 완료
- 시뮬레이션 회귀: power 보정 영향 없음 (statistician 1.601 / regressionist 46 / 동일)

### 2.32.7. 다음 sprint 후보 (이번 sprint 비범위)

- #1 행운 번호 4분면 분류 (영구/주간 × 공통/개별)
- #2 다중 전략 분량 분배
- #3 5세트 동시 추천
- #4 역추첨 게임 탭
- #6 전적 강화 (정의 필요)
- #7 카메라 OCR 등록
- #10 명망 로직 + 차선 알고리즘 (사주/별자리/MBTI 매핑 출처)
- 폴리싱: 휠링 페이지 헤더에 "← 설정" 백 버튼 / Canvas 파티클 / 신규 Faith 스탯

## 2.31. 통계 power 보정 실측 시뮬레이션 + trendFollower 보정 제거 (2026-05-02)

2.30 직후 검증. 1221회 실데이터로 STATS_POWER / GAP_POWER 효과 측정.

### 2.31.1. 시뮬레이션 스크립트 신설

- `scripts/simulate-stats-power.mjs` (게임 허브 루트).
- 1221회 본번호 통계 산출 → 보정 전/후 weight 분포 + 10000회 가중 추출 시뮬.
- 재측정 가능 (페치 후 회차 늘어나면 재실행).

### 2.31.2. statistician 실측 결과 (STATS_POWER=1.5)

| 지표 | 추정치 (도입 시 docs) | 실측 (1221회) |
|---|---|---|
| count 범위 | 145~180 (±10%) | 133~182 (±19%) |
| 보정 전 weight ratio | 1.24배 | **1.368배** |
| 보정 후 weight ratio | 1.38배 | **1.601배** |
| 10000회 추출 빈도 ratio | - | **1.587배** |

- 사용자 인지 가능 수준 (mean 1333, max 1590, min 1002 / 번호당 추출).
- "확률 향상" 톤 회피 유지. STATS_POWER=1.5 적정.

### 2.31.3. regressionist 실측 결과 (GAP_POWER=1.3)

- gap 0~19 → weight ratio 19 → 46 (2.42배 증폭). 적정.

### 2.31.4. trendFollower 보정 제거 결정

- recent30 raw ratio = **9배** (이미 충분히 두드러짐).
- 1.5 보정 시 ratio 27배로 증폭. **과도하다 판단**.
- raw 자연 분포가 더 정직 → power 보정 제거.
- recommend.js trendWeights 함수에서 STATS_POWER 적용 제거 + 주석 명시.
- 02_data.md 1.5 표 갱신: trendFollower 가중치 정책 "raw, recent30 0~9 자연 분포".
- 02_data.md 1.7.4 신설 (제거 사유).

### 2.31.5. STATS_POWER 사용자 옵션화 보류

- 4.2 잔존 후보였으나 실측에서 1.5 / 1.3 적정 확인 → 옵션화 불필요.
- 게임 도메인 원칙(단일 결정 / 라이트 사용자 부담 회피) 유지.
- 향후 회차 누적으로 분포 변동 시 재시뮬 후 상수 조정으로 충분.

### 2.31.6. docs / 코드 정정 영향

- 02_data.md 1.7 추정치 → 실측치로 교체 + 1.7.7 시뮬레이션 스크립트 인덱스.
- recommend.js trendWeights raw 복귀 + 헤더 주석.
- numbers.js STATS_POWER 적용 범위 주석 갱신 (statistician / secondStar에 한정).

## 2.30. 통계 효과 증폭 + README 동기화 (2026-05-02)

전략 4분류(2.29) 직후 후속. 통계 카테고리의 효과 가시성 향상.

### 2.30.1. 통계 weight power 보정 (배경)

- 1222회 데이터 기준 본번호 totalCount는 평균 ≈ 163, 편차 ±10% 수준.
- 비복원 가중 추출에서 weight 비율 0.85~1.15는 거의 균등과 구분 안 됨.
- 사용자가 statistician / trendFollower 선택 시 "그냥 랜덤" 인상 받는 합리적 원인.

### 2.30.2. STATS_POWER / GAP_POWER 신설

- `numbers.js`: STATS_POWER = 1.5, GAP_POWER = 1.3 export.
- `02_data.md` 1.7에 power 상수 + 1.7.1~1.7.5 정책 신설.
- 1.5 표 가중치 정책 컬럼에 `count^STATS_POWER` / `gap^GAP_POWER` 명시.

### 2.30.3. 적용 함수

- `statsToWeights`: count^1.5. statistician / secondStar 본번호 + 보너스에 적용.
- `trendWeights`: recent30^1.5. trendFollower.
- `gapWeights`: gap^1.3. regressionist (이미 편차 큼 → 약한 증폭).

### 2.30.4. 효과 추정

- count 145 → 145^1.5 ≈ 1746
- count 180 → 180^1.5 ≈ 2415
- 비율 1.24배 → **1.38배** 증폭. 사용자 인지 가능 수준.
- "확률 향상" 톤 회피 (본질은 콘텐츠 가시성, 실제 당첨 확률 무관).

### 2.30.5. 테스트

- 압도적 가중 번호 6개 → 본번호 6개 중 4개 이상 포함 검증 3 케이스 추가 (statistician / regressionist / trendFollower).
- 기존 객관성 / 결정론 테스트는 power 보정 영향 없음 (분포 비율만 변경).

### 2.30.6. README.md 동기화 (2.29 작업의 외부 문서 후속)

- 11종 → 12종 전략 표 갱신.
- 4카테고리(통계 / 운세 매핑 / 사주 / 랜덤) 그룹 표시.
- 페치 가능 전략 목록을 새 라벨로 갱신.
- 페치 시간 "약 12분" → smok95 미러 bundle "1초 미만" 정정.
- 테스트 케이스 수 170+ → 200+.

## 2.29. 전략 4분류 + 사주 카테고리 신설 + secondStar 결손 정정 (2026-05-02)

사용자 지적 ("전략 번호 추출에 신뢰가 없다, 멋대로 랜덤 같다") 정정.
11전략을 통계 / 운세 매핑 / 사주 / 랜덤 4카테고리로 재분류 + 빈 사주 카테고리 채움.

### 2.29.1. 전략 카테고리 4분류 (콘텐츠 차원)

- 02_data.md 1.5 표에 카테고리 컬럼 추가 + 1.5.2 신설.
- 결정론 차원(객관/시드 의존, 1.5.1)과 직교하는 별도 차원.

| 카테고리 | 본질 | 멤버 |
|---|---|---|
| 통계 | 회차 데이터 weight 소스 | statistician / secondStar / regressionist / trendFollower / pairTracker |
| 운세 매핑(서양) | 별자리 / MBTI 임의 매핑 | astrologer / mbti / zodiacElement |
| 사주(동양) | 일주 천간 오행 임의 매핑 | fiveElements (신설) |
| 랜덤 | 균등 + 시드 / 필터 | blessed / intuitive / balancer |

### 2.29.2. 사주 카테고리 신설: `fiveElements` (12번째 전략)

- 캐릭터 dayPillar.stem → 천간 오행(목/화/토/금/수) → 행운 번호 매핑.
- 사주 자산(이미 캐릭터 생성 시 dateToDayPillar로 산출)을 추첨에 활용.
- 4원소(서양 zodiacElement) vs 5원소(동양 fiveElements) 의도적 병렬.
- numbers.js: STRATEGY_FIVE_ELEMENTS / FIVE_ELEMENTS_LUCKY / STEM_TO_ELEMENT export.
- recommend.js: ctx.dayPillar 받음 + fiveElementsWeights 함수 + 분기.
- 02_data.md 1.18 신설 (5원소별 행운 번호 표).
- 시드 의존 (캐릭터별 다른 결과). 객관 5 / 시드 의존 7로 갱신.
- **임의 매핑이라 추첨 확률 영향 없음**. 콘텐츠 / 캐릭터 정체성 강화 목적.

### 2.29.3. secondStar 결손 정정 (라벨-동작 미스매치)

- 기존: 본번호 균등 + 보너스만 빈도 가중. 라벨 "보너스볼로 자주 나온 번호 위주"인데 본번호와 무관.
- 정정: 본번호도 bonusStats 가중 적용. 보너스볼 빈도 높은 번호는 본번호로도 자주 등장 경향.
- recommend.js secondStar 분기: `mainWeights = statsToWeights(bonusStats)` (기존 uniformWeights 대체).
- 새 테스트: 압도적 가중 6개 번호 → 본번호 6개 중 4개 이상 포함 검증.
- 결과: 라벨 정직성 + 통계 의미 모두 회복. 객관 카테고리 유지.

### 2.29.4. UI 카테고리 배지

- strategy-tabs.js 활성 전략 desc 앞에 카테고리 배지 표시 (통계 / 운세 매핑 / 사주 / 랜덤).
- 배지 색상 4종: is-stats(파랑) / is-mapping(분홍) / is-saju(황) / is-random(회색).
- 사용자가 선택 전략의 본질을 한눈에 파악 → 신뢰 격차 해소.
- main.css `.strategy-category` + 4 카테고리 클래스.

### 2.29.5. 옛 라벨 잔존 결손 동시 정정

- recommend.test.js의 reasons 검사가 옛 라벨("통계학자"/"회귀주의자"/"짝궁추적자"/"점성술사"/"추세추종자"/"직감주의자"/"균형주의자"/"2등의 별")에 묶여 깨진 상태였음.
- 2.26.8 라벨 직관화 시 테스트 갱신 누락. CLAUDE.md 2장 워크플로우 위반 사례.
- 모두 새 톤("통계 추첨"/"미출현 회귀"/"짝꿍 번호"/"별자리 행운"/"최근 트렌드"/"직감"/"균형 조합"/"보너스볼 사냥")으로 동기화.

### 2.29.6. 영향 파일

- docs: 02_data.md(1.5 / 1.5.1 / 1.5.2 / 1.18) / 01_spec.md(5.1.3 / 5.4)
- 코드: numbers.js / recommend.js / history.js / render/main.js / strategy-picker.js / strategy-tabs.js
- 스타일: main.css (.strategy-category 배지)
- 테스트: recommend.test.js (라벨 동기화 + secondStar 가중 검증 + fiveElements 4 케이스)

## 2.28. 전체 검증 + 결손 4건 정정 (2026-05-02)

전체 코드 / docs / 룰 검증 후 발견된 4건 일괄 정정.

### 2.28.1. docs/03_architecture.md 폴더 트리 갱신

- 신규 파일 13개 누락 상태였음. 갱신 완료:
  - core/: schedule.js 추가 (12개로).
  - render/: next-draw-card / settings-page / bottom-tabs / icons / strategy-tabs 추가 (16개로).
  - tests/suites/: storage / fortune / match / zodiac / saju / wheeling / schedule / history 추가 (13개로).
- 데이터 흐름 다이어그램의 `data/draws.js` → `data/draws.json` (정적 JSON, 모듈 아님).
- 4장 책임 표 갱신: input/은 분리 보류, render/는 SVG 아이콘 포함, core/는 객관 5 + 시드 의존 6 분기 명시.

### 2.28.2. core/schedule.js 헤더 주석 stale 정정

- 코드는 20:00(판매 마감)이지만 주석은 20:35(실제 방송) 표기였음.
- 함수 주석 line 16/21/32-34 모두 20:00 + "실제 방송은 20:35지만 사이트 카운트다운은 20:00에 0" 컨텍스트로 정리.

### 2.28.3. games/lotto/CLAUDE.md 7장 실행 안내 갱신

- `python -m http.server` → 게임 허브 표준인 `node scripts/dev-server.mjs 8000` 권장.
- 페치 .bat / 자동화 워크플로우(매주 일 03:00 KST GitHub Actions) 안내 추가.

### 2.28.4. DEFAULT_DRWNO 매직 넘버 → numbers.js 이동

- `src/render/main.js`에서 직접 정의되어 있던 `const DEFAULT_DRWNO = 1222`가 CLAUDE.md 4장 "매직 넘버 0개" 룰 위반.
- `src/data/numbers.js`에 `DEFAULT_DRWNO_FALLBACK` export로 이동.
- `docs/02_data.md` 1.17 신설 (의미 / 무력화 조건 / 시점 결정 명시).
- 트레이드오프: 본질이 fallback인데 데이터 상수처럼 보임. 그러나 SSOT 일관성 우선.

## 2.27. 객관 전략 캐릭터 무관 분리 (2026-05-02)

사용자 지적 ("통계 추첨이 사람마다 다른 게 이상함") 정정.

### 2.27.1. 결손 진단

- `statistician` 등 5개 객관 전략(통계/빈도 데이터)이 캐릭터 시드 + Luck에 의존했음.
- 두 경로:
  1. `applyLuck(weights, drawSeed, luck)`이 시드 6개에 +boost
  2. `weightedSample`의 PRNG 시드 = `mixSeeds(seed, drwNo)` → 캐릭터별 다른 추출
- 의도와 어긋남: "통계"는 객관이어야.

### 2.27.2. 분류 도입

- `numbers.js` `OBJECTIVE_STRATEGIES` Set + `OBJECTIVE_SEED_SALT` 신설.
- 객관(5): statistician / secondStar / regressionist / trendFollower / balancer.
- 시드 의존(6): blessed / pairTracker / astrologer / intuitive / mbti / zodiacElement.

### 2.27.3. recommend.js 분기

- `objectiveSeed = mixSeeds(drwNo, OBJECTIVE_SEED_SALT)`. 캐릭터 무관, 회차로만 결정.
- 객관 전략: `applyLuck` 미적용 + `weightedSample` seed = `objectiveSeed`.
- 시드 의존: 기존 `drawSeed` + `applyLuck` 유지.
- 보너스 시드도 동일 분기 (`objectiveBonusSeed`).

### 2.27.4. 검증

- 새 테스트 (recommend.test.js): "객관 5개 = seed/luck 달라도 같은 결과", "drwNo 다르면 다른 결과", "시드 의존 3개 = seed 다르면 다른 결과".
- 결정론은 강화 (객관은 회차로만, 시드 의존은 시드+회차로).

### 2.27.5. spec / data 갱신

- 02_data.md 1.5: "의존성" 컬럼 추가. 1.5.1 객관 vs 시드 의존 정책 신설.
- 01_spec.md 5.4: 결정론 분류 명문화.

## 2.26. 동행복권 결과 페이지 정합성 + 게임 메커닉 정리 (2026-05-02)

대형 정합성 작업. 디자인 / 메커닉 / UX 다층 변경.

### 2.26.1. 동행복권 결과 페이지 호환 디자인

- **번호공 5색 진한 톤**: 추첨 영상 표준색 → **결과 페이지 변종**으로 교체. `#f5a200` / `#1c41a1` / `#c4253a` / `#8a8a8a` / `#80b438`. 02_data.md 2.4 신설.
- **번호공 완전 평면화**: 그라디언트 / 외곽 그림자 / inset 음영 / text-shadow / letter-spacing 모두 제거. 단색 평면 원 + 흰 글자.
- **라벨 양옆 가로선 패턴**: 번호 패널 위 가로선 제거, 라벨이 가로선의 일부로 박힘 (`.draw-label::before/::after` flex 1px). 본번호 영역 = "추천번호", 보너스 영역 = "보너스번호".
- **그리드 비율 통일**: 본번호 6칸 / + / 보너스 1칸을 `6fr : auto : 1fr`로 매핑 → 본번호 칸 폭 = 보너스 칸 폭 → 공 크기 자동 동일.
- **Noto Sans KR 웹폰트**: Google Fonts로 명시 로드 (index.html). `--font-sans` 우선순위 1 = Noto Sans KR. 동행복권과 동일 본고딕 자형.
- **사행성 회피**: 라벨은 "추천번호" 사용 (당첨번호 X). CLAUDE.md 6.3 일관성. spec 5.2.1.5.

### 2.26.2. SVG 아이콘 시스템 (텍스트 글리프 폐기)

- `src/render/icons.js` 신규. 모든 UI 텍스트 아이콘(`<` `>` `+` `×` `↻` `▾`)을 SVG 헬퍼로 교체.
- 헬퍼: `chevronLeft / chevronRight / chevronDown / plus / close / refresh` + 하단 탭용 5개(`sparkles / barChart / clock / grid / gear`).
- 색은 `currentColor`로 부모 위임. 크기는 `.icon` / `.icon-sm` / `.icon-lg` 클래스로.
- 적용처: draw-card 회차 nav (이후 폐기), character-slots +/×, stats-page 갱신, strategy 캐럿, history-page 분리자, modal 닫기 버튼, 하단 탭 5개.
- docs/04_conventions.md 8장 신설 (텍스트 글리프 금지 + SSOT).

### 2.26.3. 카운트다운 카드 + 추천 카드 통합 Hero

- `src/core/schedule.js` 신규 (`nextDraw / nextDrawTimeFromNow / drawDateToEpochMs / diffParts / formatKstDate`). DOM 미사용, 결정론.
- `src/render/next-draw-card.js` 신규. 동행복권 결과 페이지 카운트다운 카드 1:1 모사:
  - "제N회" 28px / 800 / 검정 (`--font-size-2xl` 신규 토큰).
  - "YYYY-MM-DD 추첨 예정" 핑크빨강 (`--color-lotto-red: #ee2738` 신규, `--color-danger`와 다른 톤).
  - 카운트다운 4컬럼: 64px 옅은 회색 동그라미(`--color-surface-soft: #f0f0f2`) + 22px 핑크빨강 숫자 + 회색 단위 라벨.
  - 1초 tick 텍스트 노드만 갱신 (리플로우 최소화). 추첨 시각 도달 시 자동 재렌더.
- 추첨 시각: `20:35` → **`20:00`**. 동행복권 사이트 카운트다운은 판매 마감 시각 기준 (실제 추첨 방송은 20:35).
- `tests/suites/schedule.test.js` 17 케이스.
- **회차 nav 폐기**. 카운트다운 카드의 "제N회"가 단일 회차 SSOT. `state.drwNo`는 `nextInfo.drwNo`로 자동 고정. 결정론 검증은 전적 탭의 history.
- **`.home-hero` wrapper**: 카운트다운 + 추천 카드를 한 박스로 묶음. 사이 1px 가로 구분선. 흉/대길 외곽 톤 wrapper에 부여.

### 2.26.4. 백캐스트 (Luck 부트스트랩)

- 다음 추첨 회차(미래)는 발표 전이라 매칭 영원히 불가 → Luck 영원히 10. 구조적 결손.
- `src/core/history.js` `backfillRecommendations(character, draws, strategyId, stats, lastN=30)` 신규.
- 캐릭터 첫 추첨 탭 진입 시 최근 30회 결정론적 추천 + 매칭을 history에 backfill. idempotent.
- 같은 시점 통계를 모든 백필에 사용 (의미: "현재 능력으로 과거 N회 시뮬").
- `src/data/numbers.js` `BACKFILL_RECENT_COUNT: 30`. 02_data.md 1.16 / 01_spec.md 7.5.
- `tests/suites/history.test.js` 신규.

### 2.26.5. 6/45 룰 보너스 제약 버그 수정

- 보너스 추출 시 본번호 6개를 풀에서 제외 안 해서 `bonus ∈ numbers` 가능했음.
- `core/recommend.js` `weightedSample(weights, count, seed, exclude)` 4번째 인자 추가. 보너스 호출 시 `new Set(numbers)` 전달.
- 50개 시드 + 11개 전략 모두에서 `bonus ∉ numbers` 검증 (recommend.test.js).
- 01_spec.md 5.2 / 5.2.0.1 명문화.

### 2.26.6. 캐릭터 폼 개선

- **별자리 자동 계산**: 별자리 select 제거, 생년월일 입력 시 `zodiacFromBirthDate` 호출해 자동 계산. 02_data.md 2.6 신설 (12별자리 경계일 표).
- **모달 닫기 버튼**: SVG × 우상단. 면책 모달은 `dismissible: false`로 강제 확인 유지.
- **input/select 세로 높이 통일**: 모두 `height: 44px` + `box-sizing: border-box` + `line-height: 1`. select는 커스텀 화살표 SVG 배경.
- `core/zodiac.js` `zodiacFromBirthDate(YYYY-MM-DD)` + 21 케이스 테스트 (경계일 포함).

### 2.26.7. 운세 카드 카피 + 띠 관계

- spec 5.1.2 결손 보강. 평/길도 카피 표시.
- `character-card.js` `FORTUNE_COPY` 4종 + `RELATION_LABEL` 4종 (same/sahap/chung/normal).
- `fortuneRelation` 호출로 캐릭터 띠 ↔ 회차 일진 관계 표시.

### 2.26.8. 전략 가로 스크롤 탭 (시트 모달 폐기)

- `src/render/strategy-tabs.js` 신규. 11개 전략을 한 줄 가로 스크롤. 클릭 즉시 활성 변경.
- `strategy-sheet.js` 삭제 (시트 모달 폐기).
- **PC 휠 → 가로 변환**: `wheel` 이벤트에서 `|deltaY| > |deltaX|`이면 `scrollBy(deltaY)`. 트랙패드 가로 스와이프는 OS 기본 유지.
- **fade gradient affordance**: 양옆 24px `mask-image`. `.is-start` / `.is-end` 클래스로 끝 도달 시 fade 자동 제거.
- **활성 탭 잘림 보정**: 재렌더 후 활성 탭이 fade 영역에 잘려있으면 안으로 스크롤. 완전히 보이는 경우 변동 0.
- **scroll-snap 미사용**: 초기 적용했으나 활성 탭 폭 변동 + snap 자동 보정으로 클릭마다 미끄러짐 → 제거. 활성/비활성 모두 `font-weight: 600` 고정으로 폭 변동 자체 차단.
- **mousedown preventDefault**: button focus → 자동 scrollIntoView 차단.
- **라벨/설명 직관화**: 11개 전략 라벨 + 설명을 보자마자 이해되는 톤으로. 설명 줄에서 라벨 단어 반복 제거. 02_data.md 1.5 표 갱신.

### 2.26.9. 하단 탭 SVG 아이콘

- 5개 탭 (추첨/통계/전적/휠링/설정)에 아이콘 추가: sparkles / barChart / clock / grid / gear.
- `.tab-item`을 flex column으로 변경 (아이콘 + 라벨 stack).
- 480px / 360px 미디어 쿼리에서 아이콘 / 폰트 사이즈 비례 축소.

### 2.26.10. 추첨 탭 정리

- 헤더 부제 "참고용 추천 - 매 회차 1/8,145,060" 삭제 (Hero 카드와 중복).
- 추천 카드 reasons 영역 삭제 (전략 바와 중복. 데이터는 history에 보존).
- 푸터 "본 추천은 참고용..." 삭제 (면책 모달 + 설정 탭으로 충분).
- 캐릭터 슬롯을 추천 카드 **아래로** 이동 (Hero 카드 직후가 회차 헤더와 시각 연결).

### 2.26.11. 새 토큰 (tokens.css)

- `--color-lotto-red: #ee2738` (동행복권 결과 페이지 강조 빨강).
- `--color-surface-soft: #f0f0f2` (카운트다운 동그라미 등 카드 안 보조 면).
- `--font-size-2xl: 28px` (회차 타이틀 등).

## 2.1. M0 (기획 골격 + 표준 적용)

- 폴더 환경 + html-game v0.2 표준 적용 + docs 4종.

## 2.2. M1 (MVP)

- 1단계: 시드(FNV-1a) + 데이터 골격 + 페치 스크립트.
- 2단계: random / luck / stats / recommend / fortune 코어 + 테스트 58개.
- 3단계-A: storage + colors + 면책 모달 + bootstrap.
- 3단계-B: 캐릭터 생성 폼 + 캐릭터 카드 + 추천 카드 + 메인 화면 wire-up.
- 부수: 개발환경 SW 차단(`shared/ui.js`), 정적 dev 서버(`scripts/dev-server.mjs`), `_registry.json` network-first.

## 2.3. M2 1단계 (캐릭터 슬롯)

- `src/render/character-slots.js` 신규 (슬롯 목록 + 추가 / 삭제 버튼).
- `src/render/main.js` 갱신 (슬롯 영역 + 캐릭터 전환 / 추가 모달 / 삭제).
- `src/render/modal.js` 갱신 (showModal이 close 함수 반환).
- `styles/main.css` 슬롯 스타일 추가.
- `docs/01_spec.md` 4장 화면 흐름 갱신 (슬롯 / 모달 / 다중 캐릭터).
- `docs/03_architecture.md` 폴더 트리에 character-slots.js 반영.

## 2.4. M3 (통계 시각화)

- `src/render/charts.js` 신규 (가로 막대 차트 헬퍼, 외부 lib 없음).
- `src/render/stats-page.js` 신규 (본번호 빈도 / 보너스 분리 / 동시출현 top 20 / Cold top 10).
- `src/render/main.js` 갱신 (`통계 보기` 버튼 + 진입 핸들러).
- `styles/main.css` 갱신 (통계 섹션 / empty-state / 막대 차트).
- `docs/03_architecture.md` 폴더 트리에 charts.js / stats-page.js 반영.
- 데이터 없을 때(`draws.json` 비어 있음) empty-state로 페치 명령 안내.

## 2.25. 회차 이동을 추천 카드 헤더에 통합 (회차 = 리소스 명시)

- 추천 카드 헤더를 grid 3컬럼으로: `‹ {회차} ›`. 좌우 화살표가 회차 이동.
- 별도 `.actions-draw` 영역 제거 (메인 액션 자리를 부수 액션이 차지하던 문제).
- 회차가 `recommend()` ctx + `fortuneFor()` 입력으로 들어가는 **리소스**임을 UI 컨텍스트로 명확화 (회차 = 추천의 입력).
- `.draw-nav` 원형 버튼 (44×44, 디스에이블 시 흐림). drwNo ≤ 1이면 prev 비활성.
- `.draw-tag` "추천" 배지 폰트 축소 + 대문자 letter-spacing.

## 2.24. 번호 공 시각 보강 + 보너스 표시 재설계

- `.num` 라이팅 강화: `radial-gradient` 좌상단 하이라이트 + 진한 inset 그림자(우하) + 외곽 드롭 그림자 + `text-shadow` 강화 + `font-weight: 900` + `font-variant-numeric: tabular-nums` + `letter-spacing`. 단조로운 단색 원에서 동행복권 영상 톤의 입체 공으로.
- 인라인 style 키 변경: `background:${bg}` → `background-color:${bg}` (CSS의 `background-image` 그라디언트와 분리).
- **보너스 표시 재설계**: 외곽 링(outline) 제거 (떠 있는 링 어색). 새 구조 = "+ 디바이더 + 보너스 라벨 + 같은 공 디자인".
  - `.bonus-divider` (전 `.bonus-plus`) - 본번호와 보너스 셀 사이 + 기호.
  - `.bonus-cell` - 라벨 위, 공 아래 column.
  - `.bonus-label` - 작은 대문자 라벨 ("보너스").
  - 보너스볼도 본번호와 똑같은 공 디자인. 차별화는 라벨로.
- history-page의 `.bonus-plus` → `.bonus-divider` 클래스 통합.

## 2.23. 정보 구조 재설계 (5탭 + 전략 시트 + 번호 hero + 한국 6/45 표준 컬러볼)

- **5탭 모델**: 추첨 / 통계 / 전적 / 휠링 / 설정. 하단 fixed 탭. 백 버튼 폐기.
- **추첨 탭 재배치 (번호 hero)**: 슬롯 → 추천 카드(hero) → 회차 이동 → 전략 한 줄 바 → 캐릭터 카드(압축).
- **전략 시트**: 11개 칩 평면 노출 → 한 줄 바("전략 ▾ {이름} - {설명}") + 탭 시 시트 그리드.
  - `src/render/strategy-sheet.js` 신규 (`strategyBarHtml` / `openStrategySheet`).
  - 기존 `strategy-picker.js`는 `STRATEGY_LIST`만 export로 남김.
- **하단 탭**: `src/render/bottom-tabs.js` 신규 (5탭 + 활성 표시).
- **설정 탭**: `src/render/settings-page.js` 신규.
  - 옵션 필터 / 다구좌 토글 / 면책 다시 보기 / 데이터 메타 / 전체 초기화.
- **휠링 탭 통합**:
  - `renderWheelingDisabled` 신규 (다구좌 OFF 시 안내 + 활성화 버튼).
  - 다구좌 ON이면 기존 휠링 본문. "‹ 메인" 버튼 제거.
- **통계 / 전적 페이지**: `onBack` 인자 제거, 백 버튼 제거 (탭 전환으로 대체).
- **한국 6/45 공식 컬러볼 적용**:
  - `src/data/colors.js` `NUMBER_RANGE_COLORS` 검증값 (1-10 #fbc400 / 11-20 #69c8f2 / 21-30 #ff7272 / 31-40 #aaaaaa / 41-45 #b0d840). 동행복권 영상 표준, 다수 미러 일치 검증.
  - `numberColor(n)` 헬퍼 (bg 반환).
  - `.num` CSS: 흰 텍스트 + `text-shadow: 0 1px 1px rgba(0,0,0,0.3)` + `box-shadow: inset -2px -2px 4px rgba(0,0,0,0.2)` (입체감) + 테두리 제거.
  - draw-card / history-page / wheeling-page 모든 번호 표시에 적용.
  - 통계 페이지 본번호 빈도 차트 막대도 동일 색상.
  - 보너스볼은 같은 색 + accent 색 외곽 링(`outline`)으로 차별화.
- **번호 카드 반응형 한 줄 강제**:
  - `.draw-numbers`: `grid-template-columns: repeat(6, 1fr)` + `aspect-ratio: 1` + `font-size: clamp(13px, 4vw, 18px)`.
  - 좁은 폭에서도 6개 한 줄, 셀 크기 자동 축소.
- **CSS 신규**: `.bottom-tabs / .tab-item / .strategy-bar / .sheet-card / .sheet-strategy / .actions-draw / .settings-row / .danger-zone / .home-header / .tab-header`.
- **CSS 모바일 보강 (480/360px)**:
  - 하단 탭 폰트 / padding 축소.
  - 전략 바 desc 다음 줄로.
  - 번호 카드 max-width 축소.
- `docs/01_spec.md` 4장 5탭 모델로 재작성.

## 2.22. 모바일 최적화 2차 (통계 sticky 헤더 + 차트 가독성)

- `styles/main.css`:
  - `.stats-header`: `position: sticky; top: 0` + `safe-area-inset-top` padding + `border-bottom` + `z-overlay`. 긴 차트 스크롤 중에도 갱신 / 메인 버튼 접근.
  - `.bar-row` grid를 `minmax`로 전환. 페어 라벨("12 - 34") 같은 긴 라벨도 잘림 없이 표시 + 트랙 최소 80px 보장.
  - `.bar-label` `white-space: nowrap`.
  - 480px 이하: `.bar-row` minmax 폭 축소 (48/64/36) + `.bar-label/.bar-value` 11px + 트랙 12px.
  - 360px 이하: minmax 폭 추가 축소 (40/48/28) + 폰트 10px + 트랙 10px.

## 2.21. 모바일 최적화 1차 (theme / safe-area / 브레이크포인트 / 터치 / input)

- `index.html`:
  - viewport에 `viewport-fit=cover` 추가.
  - `theme-color` `#0e0e10` → `#c9a050` (라이트 테마 일치).
  - `apple-mobile-web-app-capable` / `apple-mobile-web-app-title` / `format-detection telephone=no` 추가.
- `styles/main.css`:
  - 글로벌 `input/select/textarea { font-size: 16px }` (iOS Safari 자동 zoom 방지).
  - 글로벌 `button/role=button/strategy/slot { min-height: 44px }` (iOS HIG 터치 타겟).
  - `#app` padding에 `safe-area-inset` 적용.
  - `.character-form input/select` / `.pool-input input` 패딩 + min-height 44 보강.
  - `.slot-add / .slot-del` 36×36 → 44×44.
  - `.pool-num` 36×36 → 44×44.
  - `@media (max-width: 480px)` 모바일 브레이크포인트 신규 (패딩 / 폰트 / 카드 / 모달 미세 조정).
  - `@media (max-width: 360px)` 추가 보정 (iPhone SE 등).
- `src/render/character-form.js`:
  - 이름 / 행운 단어 input에 `autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"` 추가.
- `src/render/wheeling-page.js`:
  - 풀 번호 입력 / 티켓 수 입력에 `inputmode="numeric" pattern="[0-9]*" autocomplete="off"` 추가.

## 2.20. 통계 페이지 갱신 흐름 (날짜 기준 자동/명시)

- `src/data/storage.js` `syncDrawsIfNewer()` 신규.
  - 미러 `latest.json` 한 방 peek → cached max drwNo와 비교.
  - 새 회차 있을 때만 정적 `draws.json` 다시 fetch + `saveDraws()`.
  - 결과 객체 `{ updated, reason, draws, latestDrwNo, latestDrwDate }` 반환.
- `src/render/stats-page.js` 갱신 UI:
  - 헤더 우측에 "↻ 갱신" 버튼.
  - 헤더 아래 메타 라인 "{N}회까지 반영 · 최근 추첨 YYYY-MM-DD".
  - 페이지 진입 시 자동 sync (조용히, 새 회차 있을 때만 토스트).
  - 갱신 버튼 클릭 시 모든 결과 토스트로 통보 (이미 최신 / 미러 실패 / CI 지연).
- `styles/main.css`: `.btn-refresh` / `.stats-meta` / `.stats-toast` + `.stats-header` grid 3컬럼.
- `docs/01_spec.md` 5.3.1 신규.
- `docs/02_data.md` 4.3 클라이언트 동기화 두 갈래(boot syncDraws / 통계 syncDrawsIfNewer) 명시.
- 사용자 결정(2026-05-01): "날짜 기준 새 정보 있을 때만". 새 회차 없으면 무동작 + 화면 깜빡임 없음.

## 2.19. 페치 사용성 개선 (.bat + 메시지 톤 + 데이터 배너)

- `scripts/fetch-lotto-draws.bat` 신규 (Windows 더블클릭. ASCII 영문만, cp949 인코딩 충돌 회피).
- `src/render/stats-page.js` empty-state 톤 부드럽게 + .bat 안내 우선.
- `src/render/main.js` 데이터 없을 때 메인 상단 `.data-banner` 자동 노출.
- `styles/main.css` `.data-banner` (옅은 골드 배너).
- `src/render/main.js` `DEFAULT_DRWNO` 1100 → 1222 (사용자 확인: 2026-05-02 토 추첨).
- `README.md` 충실히 채움 (메커닉 / 11전략 / 운세 / 휠링 / 실행 / 페치 / 테스트 / 윤리 / 표준).

## 2.18. MBTI + 별자리 원소 전략 추가 (11종)

- `src/data/numbers.js`:
  - `STRATEGY_MBTI` / `STRATEGY_ZODIAC_ELEMENT` 추가.
  - `MBTI_TYPES` (16종) + `MBTI_LUCKY` 매핑 (각 7개 번호).
  - `ZODIAC_ELEMENTS` (fire/earth/air/water) + `ZODIAC_ELEMENT_LUCKY` 매핑.
- `src/core/recommend.js`:
  - `mbtiWeights` / `zodiacElementWeights` / `zodiacElementOf` 헬퍼.
  - 2개 전략 분기 추가. ctx에 `mbti` 필드 받음.
- `src/render/character-form.js`:
  - MBTI select 필드 (선택, 미지정 가능).
  - Character에 `mbti` 보관.
- `src/render/character-card.js`:
  - 카드 메타에 MBTI 라벨 (녹색 톤 + 모노스페이스).
- `src/render/strategy-picker.js`: 11개 STRATEGIES.
- `src/render/main.js`: recommend ctx에 `mbti` 전달.
- `styles/main.css`: `.char-mbti` 스타일.
- `tests/suites/recommend.test.js`: 5 케이스 추가 (mbti / zodiacElement / 그룹 매핑 검증).
- `docs/02_data.md` 1.5 11종 표 + 1.13 MBTI + 1.14 별자리 원소 + 3.6 Character.mbti.
- `docs/01_spec.md` 5.1 11종 명시.

## 2.17. 축약휠 (Abbreviated Wheel) + 4-if-4 보장 검증

- `src/core/wheeling.js` 갱신:
  - `abbreviatedWheel(pool, ticketCount, seed)`: mulberry32 기반 결정론적 N장 셔플 + 선택.
  - `isCovering4if4(tickets, pool)`: 풀의 모든 4개 조합에 대해 어떤 티켓이든 4개 모두 포함 여부 확인.
  - `validatePool` / `combinations` 모듈 내 헬퍼로 정리.
- `src/render/wheeling-page.js` 갱신:
  - 휠 타입 토글(Full / Abbreviated).
  - Abbreviated 선택 시 티켓 수 입력 (기본 = Full / 4).
  - 4-if-4 보장 검증 결과 배너 표시 (통과 = 골드 / 미통과 = 빨강).
- `styles/main.css` `.wheel-type-list` 추가.
- `tests/suites/wheeling.test.js` 11 케이스 추가 (abbreviatedWheel + isCovering4if4 검증).
- `docs/01_spec.md` 5.5.4 휠 종류 갱신.
- 정직성: 4-if-4 보장 미통과 시 명확히 표시. Full Wheel만 자동 보장 명시.

## 2.16. 전략 라인업 확장 (9종)

- `src/data/numbers.js` `STRATEGY_TREND_FOLLOWER` / `STRATEGY_INTUITIVE` / `STRATEGY_BALANCER` 추가.
- `src/core/recommend.js` 3개 전략 분기 + `trendWeights` / `intuitiveWeights` / `passesBalanceFilters` / `balancedSample` 함수 추가.
- `src/render/strategy-picker.js` 9개 STRATEGIES (추/직/균 약자).
- `tests/suites/recommend.test.js` 5 케이스 추가 (각 전략 동작 + intuitive 결정론 + balancer 필터 통과율).
- `docs/02_data.md` 1.5 9종 표.
- `docs/01_spec.md` 5.1 전략 9종 명시.
- 균형주의자: 합 121~160 + 홀짝 3:3 필터. 최대 50회 시드 변형 재추첨, 못 찾으면 fallback (균등 결과).
- 직감주의자: 매 회차 mulberry32로 0.5~2.0 분포. 같은 시드+회차 = 같은 분포 (결정론).
- 추세추종자: 최근 30회 빈도(`recent30`) 가중.

## 2.15. 휠링 시스템 (다구좌 모드 옵션)

- `src/core/wheeling.js` 신규 (`fullWheel(pool)` + `combinationCount(n,k)` + 풀 검증).
- `src/render/wheeling-page.js` 신규 (풀 입력 / 추가 / 제거 / 전체비우기 + Full Wheel 결과 + 비용 + 1등 보장 조건).
- `src/data/storage.js` 옵션에 `advancedMode` 추가 + 누락 키 마이그레이션.
- `src/render/main.js` "다구좌 모드 ON/OFF" 토글 + ON 시 "휠링 보기" 버튼 노출 + 첫 ON 시 윤리 안내 모달 강제.
- `styles/main.css` 휠링 페이지 스타일 (.pool-display / .pool-input / .wheel-tickets / .wheel-ticket).
- `tests/suites/wheeling.test.js` 신규 (20 케이스: combinationCount / fullWheel 검증).
- `docs/02_data.md` 3.2 옵션 키 명시 + advancedMode.
- `docs/01_spec.md` 5.5 휠링 절 신규 (목적 / 노출 정책 / 휠 종류 / 윤리).
- `docs/03_architecture.md` wheeling.js / wheeling-page.js.
- 기본값 OFF (라이트 사용자 비노출). 첫 ON 시 윤리 안내 강제. "확률 향상" 표현 절대 금지.

- `src/core/saju.js` 신규 (천간 10 / 지지 12 / 오행 5 / 상생·상극 / `dateToDayPillar` / `dayPillarLabel` / `pillarElement` / `elementRelation`).
- `src/core/fortune.js` 갱신: 띠 분포 + 오행 관계 6종 보정 가산 후 정규화. 회차 drwDate 있을 때만 활성. (`fortuneFor` 시그니처에 `charPillar` 추가.)
- `src/render/character-form.js` 캐릭터 생성 시 `dateToDayPillar(birth)` → `dayPillar` 보관.
- `src/render/character-card.js` 카드 메타에 일주 라벨 (`갑자일` 형태) 표시 + 모노스페이스 미세 강조.
- `src/render/main.js` `fortuneFor` 호출에 `active.dayPillar` 전달.
- `styles/main.css` `.char-pillar` 스타일 (모노스페이스 + 옅은 골드 배경).
- `tests/suites/saju.test.js` 신규 (22 케이스: 일주 / 라벨 / 오행 / 관계 / 한글).
- `tests/runner.js` saju.test.js 등록.
- `docs/02_data.md` 1.12 신규 (천간 / 지지 / 오행 / 관계 / 보정값) + 3.6 Character 스키마에 `dayPillar`.
- `docs/01_spec.md` 5.1 / 5.1.4 신규 (사주 보정 명시).
- `docs/03_architecture.md` 폴더 트리에 saju.js.
- 보정 강도 ±0.07 이내 (분포 자체 뒤집히진 않음). 확률 영향 없음.

## 2.13. 캐릭터-전략 분리 + 명명 변경

- **개념 분리**: 캐릭터(정체성) + 전략(추첨 도구). 같은 캐릭터로 6 전략 모두 시도 가능.
- **명명 변경**: `className` → `strategyId` / `CLASS_*` → `STRATEGY_*` / "클래스" → "전략" 일괄 rename.
- `src/data/numbers.js` `STRATEGY_*` + `STRATEGY_DEFAULT` (`blessed`).
- `src/core/recommend.js` ctx 인자 `strategyId`로 변경.
- `src/render/character-form.js` 클래스 선택 UI 제거 + 캐릭터에 `lastUsedStrategy` 기본값 저장.
- `src/render/character-card.js` 클래스 라벨 자리 → 별자리 라벨 추가 (띠 + 별자리 함께 표시).
- `src/render/character-slots.js` `CLASS_SHORT` 제거 → 캐릭터 이름 첫 글자.
- `src/render/strategy-picker.js` 신규 (메인 화면 상단, 6개 전략 버튼 + 활성 강조).
- `src/render/main.js` 전략 picker 통합. 활성 캐릭터의 `lastUsedStrategy` 사용 + 클릭 시 갱신 / 저장.
- `styles/main.css` `.strategy-picker` / `.strategy` / `.char-zodiac` 스타일 추가.
- `tests/suites/recommend.test.js` strategyId로 일괄 변경 + 전략 분리 케이스 추가.
- `docs/02_data.md` 1.5 / 3.6 갱신 (전략은 캐릭터 속성 아님 명시).
- `docs/01_spec.md` 5.1 / 5.1.3 캐릭터-전략 분리 명시.
- `docs/03_architecture.md` 폴더 트리에 strategy-picker.js.
- 기존 캐릭터 자동 마이그레이션 (`lastUsedStrategy` 누락 시 `STRATEGY_DEFAULT`).

## 2.12. 캐릭터 확장 (3종 추가)

- `src/data/numbers.js` 새 클래스 ID (`CLASS_REGRESSIONIST` / `CLASS_PAIR_TRACKER` / `CLASS_ASTROLOGER`) + `ZODIAC_LUCKY` 매핑.
- `src/core/recommend.js` 3종 추첨 가중치 정책:
  - 회귀주의자: `gapWeights` (currentGap 가중).
  - 짝궁추적자: 시드 → keyNumber + 동시출현 페어 가중.
  - 점성술사: 별자리 → 행운 번호 5배 boost.
- `src/render/character-form.js` 클래스 6종 옵션 + Character에 `zodiac` 보관.
- `src/render/character-card.js` `CLASS_LABELS` 6종.
- `src/render/character-slots.js` `CLASS_SHORT` 6종 (회/짝/점).
- `src/render/main.js` recommend ctx에 `cooccur` / `zodiac` 전달 + `state.cooccur` 캐시.
- `tests/suites/recommend.test.js` 4 케이스 추가.
- `docs/02_data.md` 1.5 / 3.6 / 1.11 ZODIAC_LUCKY.
- `docs/01_spec.md` 5.1 클래스 6종 명시.

## 2.11. 폴리싱 2단계 (라이트 테마 전환)

- `styles/tokens.css` UI 토큰 라이트 톤으로 전환 (배경 #f7f7f9 / surface #ffffff / text #1a1a1f / accent #c9a050).
- `src/data/colors.js` 게임 색상 라이트 톤 (FORTUNE / NUMBER_CARD / RANK_GLOW).
- `styles/main.css` 인라인 hex 라이트 보정 (.num / .bonus-num / .modal-confirm) + 카드 미세 box-shadow 추가.
- `src/render/history-page.js` / `src/render/stats-page.js` 인라인 색상 라이트 톤.
- `docs/02_data.md` 2.1~2.3 색상 표 갱신.
- 페이지 스코프 라이트(다른 게임은 다크 유지). sudoku와 같은 분리 패턴.

## 2.10. 폴리싱 1단계 (접근성)

- `styles/main.css` `prefers-reduced-motion` + `:focus-visible` + `.sr-only` 추가.
- `src/render/modal.js` ESC/Enter 키 / `tabindex` / 포커스 자동 이동.
- `src/render/character-slots.js` `aria-pressed` / `aria-label` / `role="group"`.
- `src/render/character-card.js` `role="progressbar"` (Luck 바) / 카드/운세 aria-label.
- `src/render/draw-card.js` 본번호 `role="list"` + 각 번호 `role="listitem"` + aria-label.
- `index.html` `<meta description / theme-color>` + 스킵 링크 + `aria-live="polite"`.
- `docs/04_conventions.md` 4장 접근성 절 추가 (5/6/7장으로 번호 재정렬).

## 2.9. M6 (갱신 자동화)

- `scripts/fetch-lotto-draws.mjs` 증분 모드 추가:
  - 인자 없으면 기존 `draws.json` 로드 → 마지막 drwNo + 1 ~ 최신만 페치.
  - `--full` 플래그로 강제 전수.
  - 기존 + 신규 병합 (drwNo 기준 dedupe).
- `src/data/storage.js`에 `syncDraws()` 추가 (페이지 진입 시 정적 JSON → localStorage 동기화).
- `src/main.js` boot에서 `await syncDraws()`.
- `service-worker.js` `NETWORK_FIRST_PATHS`에 `draws.json` 추가.
- `.github/workflows/fetch-lotto.yml` 신규 (매주 일요일 03:00 KST 자동 페치 + commit & push).
- `docs/02_data.md` 4.3 / 4.4 갱신 (자동화 / 증분 / 클라이언트 동기화 / SW 정책).
- `docs/03_architecture.md` storage.js 책임 갱신.

## 2.8. M5 3단계 (일진 정밀화 + 길일 UI)

- `src/core/zodiac.js`에 `dateToAnimalSign(dateStr)` + `drawToAnimalSign(drawOrDrwNo)` 추가.
- 60갑자 기준일 1984-02-02 (갑자일 = rat). 일자 차이 mod 12로 정밀 일진.
- `src/core/fortune.js` 갱신: draw 객체 인자 받아 정밀 일진 활용. drwDate 없으면 drwNo mod 12 fallback.
- `src/render/main.js` 갱신: `state.draws`에서 현재 drwNo의 draw 찾아 fortune 계산에 전달.
- `src/render/character-card.js` 갱신: 운세 등급에 따라 `is-bad` / `is-great` 클래스.
- `src/render/draw-card.js` 갱신: 운세 인자 + 흉일 / 대길 배너 표시.
- `styles/main.css` 갱신: 카드 외곽 톤 + 배너 스타일.
- `tests/suites/zodiac.test.js` 9 케이스 추가 (date / draw 헬퍼).
- `docs/02_data.md` 1.10.2 정밀화 명시.
- `docs/01_spec.md` 5.1.1.2 갱신 + 5.1.2 길일 UI 절 추가.

## 2.7. M5 2단계 (Luck 성장 룰)

- `src/core/luck.js`에 `applyLuckGrowth(character)` + `rankLuckBonus(rank)` 추가.
- 등수별 보너스: 1등 +20 / 2등 +15 / 3등 +10 / 4등 +5 / 5등 +2.
- `src/core/history.js`의 `recordRecommendation` 갱신 (luckApplied: false 기본, 같은 drwNo 재기록 시 기존 luckApplied 보존).
- `src/render/main.js`에서 추천 표시 시 `applyLuckGrowth` 호출 → 매칭된 항목 1회 적용 보장.
- `tests/suites/luck.test.js`에 9 케이스 추가 (보너스 / 잠금 / 재호출 / 누적 / cap).
- `docs/02_data.md` 3.7 Recommendation 스키마에 luckApplied + 3.8 등수 보너스 표.
- `docs/01_spec.md` 7.2 갱신.

## 2.6. M5 1단계 (12간지 + 운세 정밀화)

- `src/core/zodiac.js` 신규 (yearToAnimalSign / drwNoToAnimalSign / zodiacRelation).
- `src/data/numbers.js` 1.10 ANIMAL_SIGNS 추가.
- `src/render/character-form.js` 생성 시 birthYMD 연도 → animalSign 자동 저장.
- `src/core/fortune.js` 갱신 (띠 관계별 분포 - same / sahap / chung / normal).
- `src/render/character-card.js` 띠 라벨 표시 (`쥐띠`, `용띠` 등).
- `src/render/main.js` fortuneFor 호출에 animalSign 전달.
- `styles/main.css` char-meta / char-animal 스타일.
- `tests/suites/zodiac.test.js` 신규 (16 케이스).
- `tests/suites/fortune.test.js` 갱신 (관계 분포 검증).
- `docs/02_data.md` 1.10 12간지 + Character 스키마에 animalSign.
- `docs/01_spec.md` 5.1 / 5.1.1 운세 분포 표 추가.
- `docs/03_architecture.md` 폴더 트리에 zodiac.js.

## 2.5. M4 (이력 / 적중)

- `src/core/match.js` 신규 (1~5등 + null 매칭, 한국 6/45 룰 정확 적용).
- `src/core/history.js` 신규 (recordRecommendation / matchHistory / characterStats).
- `src/render/history-page.js` 신규 (전적 요약 + 등수 카운트 + 이력 카드 목록).
- `src/render/main.js` 갱신 (추천 표시 시 자동 기록 + 매칭 + saveCharacters, `전적 보기` 버튼).
- `tests/suites/match.test.js` 신규 (8 케이스, 등수 경계 / 보너스 룰).
- `tests/runner.js` 등록.
- `styles/main.css` 전적 / 이력 카드 스타일.
- `docs/03_architecture.md` 폴더 트리.

# 3. 다음 액션

## 3.-4. Sprint 015 (완료, 2026-05-02 - Polish 묶음)

자율 진행. 결정 0개 옵션 채택. 결과는 2.36 영구 이력 참조.

### 3.-4.1. 작업 범위 (3건)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S5-T1 | 5세트 #2~#5 과거 매칭 chip (reverseSearch 재활용) | 중 | **완료** |
| S5-T2 | 의식 만땅 시 추천 카드 #1 골드 글로우 | 작 | **완료** |
| S5-T3 | 역추첨 동률 다회차 펼치기 (`findMatchingDraws` 신설) | 작 | **완료** |

### 3.-4.2. 자율 결정 사항

- S5-T1: chip은 #2~#5에만. #1 hero는 정보 과밀 회피. `bestRank=null`은 "과거 매칭 없음" 회색 chip.
- S5-T2: `.is-blessed-ritual` 클래스. 운세 외곽(`is-bad`/`is-great`)과 별도 레이어. `prefers-reduced-motion` 시 정적 fallback.
- S5-T3: `findMatchingDraws` 함수 신설 (drwNo 내림차순). 모달은 `showModal` 재활용. `bestRankCount=1`이면 버튼 미노출 (현재 표시 동일).

### 3.-4.3. 비범위

- 5세트 #2~#5 매칭 회차의 발표 번호 표시 (chip만, 자세한 발표 번호는 역추첨 페이지로 위임)
- 의식 만땅 5세트 전체에 글로우 (현재는 #1만 - 일관성 유지)
- 역추첨 펼치기 모달의 페이징 (현재는 단일 스크롤, 매칭 100건 이상도 동작)

## 3.-3. Sprint 014 (완료, 2026-05-02 - Charm 우선)

자율 진행. 사용자 "다음 진행" 위임. 결과는 2.35 영구 이력 참조.

### 3.-3.1. 작업 범위 (2건)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S4-T1 | #3 5세트 동시 추천 (시드 변형, 다중 모드 호환) | 큼 | **완료** |
| S4-T2 | 의식 폴리싱 - Canvas 파티클 (만땅 진입 트리거 + reduced-motion) | 중 | **완료** |

### 3.-3.2. 자율 결정 사항

- 5세트 의미 = A안(시드 변형). 다중 모드(B)와 의미 분리. `i=0`은 baseSeed 그대로(메인=기존 호환), `i=1..4`는 `mixSeeds(baseSeed, FIVE_SETS_SALT_BASE + i)`.
- 객관 전략은 캐릭터 시드 무관 → 시드 변형 의미 없음. 대신 drwNo 분기 솔트로 회차 내부 5분기(객관성 유지, 시드 영향 0).
- 진입 = 설정 탭 "5세트 동시 추천" 토글. 기본 OFF(라이트 사용자 비노출, multiStrategy와 동일 노출 정책).
- 이력 / Luck / 의식 보너스 = #1만(추천 알고리즘 영향 없음 원칙 유지). #2~#5는 표시 전용.
- UI = #1 hero 카드 + #2~#5 컴팩트 4장(인덱스 + 본번호줄 + 보너스, 30px 컬러볼). 면책 카피 1회 노출.
- 의식 파티클 = 만땅 진입(`appliedBonus` false→true 전환) 직후 0.9초 단발. `prefers-reduced-motion` 시 비활성.

### 3.-3.3. 비범위

- 5세트 매칭 회차 표시(현재는 표시 전용, 이력/Luck #1만)
- 5세트 결과를 휠링 시드 풀로 활용
- 의식 만땅 보너스의 #1 강조 글로우(폴리싱 후순위)
- 다중 매칭 회차 보기 / 기간 필터 (Sprint 013 후보 그대로 유지)

## 3.-2. Sprint 013 (완료, 2026-05-02 - Trust 우선)

자비스 권장안 A안 채택. 사용자 "전략 추출 신뢰 없다" 결손을 정면으로.

### 3.-2.1. 작업 범위 (3건)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S3-T1 | #2 다중 전략 분배 + 번호별 출처 라벨 (Trust 핵심) | 큼 | **완료** |
| S3-T2 | #6 전적 강화 - 자율 가능 4항목 (등수별 차트 / 누적 통계 / 회차 타임라인 / history 페이지 분리) | 중 | **완료** |
| S3-T3 | 캐릭터 카드 4종 행운 토글 (T3 Sprint 011 후속) | 작 | **완료** |

### 3.-2.2. 자율 결정 사항

- 분배 룰 = A안 (균등). 6/N 베이스 + 나머지 첫 N개 전략에 +1. N=7 이상 비활성.
- 다중 전략 진입 = 설정 탭 "다중 전략 모드" 토글. 기본 OFF (현재 동작 유지, 라이트 사용자 비노출).
- 출처 라벨 = 다중 모드일 때만 본번호 아래 카테고리 색 dot (통계/운세 매핑/사주/랜덤 4색).
- 카드 4종 행운 = 토글로 1종 보기. 기본 = 사주.
- character 스키마 마이그레이션: lastUsedStrategy → lastUsedStrategies(배열). 기존 단일은 자동 변환.

### 3.-2.3. 비범위

- 슬롯 기반 분배 / 우선순위 가중 분배 (B/C 옵션은 보류)
- 분배 변경 즉시 미리보기 / 비율 표시
- 5세트 동시 추천 (#3, Sprint 014로 분리)
- 캘린더 시각화 (#6 자율 비범위, 정의 받은 후)
- 그래프 종류 추가 (선 그래프 / 도넛 등)

### 3.-2.4. S3-T1 분배 룰 (A안 균등)

| N | 분배 |
|---|---|
| 1 | 6 |
| 2 | 3 + 3 |
| 3 | 2 + 2 + 2 |
| 4 | 2 + 2 + 1 + 1 |
| 5 | 2 + 1 + 1 + 1 + 1 |
| 6 | 1 + 1 + 1 + 1 + 1 + 1 |
| 7+ | 비활성 (선택 불가) |

## 3.-1. Sprint 012 (완료, 2026-05-02)

자율 진행. 결과는 2.33 영구 이력 참조.

### 3.-1.1. 작업 범위 (모두 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S2-T1 | 역추첨 게임 탭 (#4) - 6개 골라 최고 등수 확인 | 중 | **완료** |
| S2-T2 | 휠링 페이지 헤더 "← 설정" 백 버튼 (폴리싱) | 작 | **완료** |

### 3.-1.2. 자율 결정 사항

- S2-T1 입력: 본번호 6개만 (보너스 미입력).
- 알고리즘: 모든 회차 순회 → 최고 등수 + 가장 최근 매칭 회차. matchRank 재사용.
- 결과: 최고 등수 + 매칭 회차 + 발표 번호 + 등수별 카운트(1~5등 + 미적중).
- 탭 위치: 하단 탭 4 → 5 복귀 (역추첨 추가). 모바일 폰트 축소로 대응.
- S2-T2: 휠링 페이지 좌상단 "← 설정" 버튼.

### 3.-1.3. 비범위

- 보너스 번호 입력 (2차)
- 동률 다회차 매칭 결과 전체 목록 (현재는 최근 1건만)
- 기간 필터 (특정 회차 범위만)
- 카드 / 시각 글로우 강화

## 3.0. Sprint 011 (완료, 2026-05-02)

FM 프로세스(플랜 → 세부 기획 → 구현 → QA → 리뷰 → 개선) 1차 적용. **결과는 2.32 영구 이력 참조**.

### 3.0.1. 작업 범위 (4건, 모두 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| T1 | 캐릭터 관리 추첨 → 설정 이동 | 작 | **완료** |
| T2 | 휠링 설정 안 통합 (라이트 사용자 비노출 강화) | 작 | **완료** |
| T3 | 사주 행운 번호 캐릭터 카드 영구 표시 | 작 | **완료** |
| T4 | 행운 의식 시스템 (해석 B, 라벨 정직성 유지) | 큼 | **완료** |

### 3.0.2. 자율 결정 사항 (사용자 부재 중 결정, 2026-05-02)

- T1: 슬롯의 + 추가 / × 삭제 버튼 모두 제거. 슬롯 본체(빠른 전환)는 유지.
- T2: 하단 탭 5 → 4 (휠링 제거). 다구좌 모드 ON 시 설정 탭 안에서 진입.
- T3: 1차는 사주(일주 오행) 행운 번호만. 4종 통합 표시는 별도 작업.
- T4: 게이지 위치 = 추첨 탭. 만땅 보상 = Luck +5 (`LUCK_BONUS_RITUAL`). 회차 변경 시 게이지 + 쿨다운 리셋.

### 3.0.3. T4 행운 의식 권장안 (해석 B)

- 라벨: "행운 의식" / "정성 게이지". "확률" 단어 코드/문서/UI 0건 유지.
- 행위 8종: 명상하기 / 수련하기(108배 동작) / 정화수 의식 / 기 모으기 / 가문 의식 / 부적 그리기 / 행운 동전 던지기 / 별빛 의식.
- 굿 / 원기옥 / "기도하기" 라벨은 종교 / IP 회피로 제외 또는 변경.
- 게이지 0~100. 8 행위 × 12.5 = 100. 회차당 행위별 1회 쿨다운.
- 만땅 시 Luck +5 + 카드 외곽 골드 빛 효과 (CSS 키프레임).
- prefers-reduced-motion 대응 필수.

### 3.0.4. 비범위 (이번 sprint에서 안 함)

- T1: 슬롯 자체 폐지
- T2: 다구좌 모드 토글 자체 폐지 / 휠링 알고리즘 변경
- T3: 매핑 출처 갱신 (#10 명망 로직으로 분리)
- T4: Canvas 파티클 / 신규 Faith 스탯 / 행위별 개별 쿨다운 시간 / 의식 history 기록 / 회차 누적 통계
- 기타: #1 4분면 분류 / #2 다중 전략 / #3 5세트 / #4 역추첨 게임 / #6 전적 강화 / #7 OCR / #10 명망 로직

### 3.0.5. 종료 조건

- 4 작업 모두 절대 규칙 5종(DOM / 매직 넘버 / 사행성 / docs SSOT / 옛 라벨) 위반 0건.
- 자동 테스트 통과.
- PROGRESS 2.32~2.35 영구 이력으로 흡수 + 본 3.0 절 제거.

## 3.1. 페치 (사용자 액션 대기)

- `scripts/fetch-lotto-draws.bat` 더블클릭 (또는 `node scripts/fetch-lotto-draws.mjs`).
- 데이터 출처: smok95/lotto GitHub Pages 미러 (`all.json` bundle, 1회~1221회 단일 GET).
- **1초 미만** 페치 후 통계 / 전적 / 일진 정밀화 / 데이터 의존 4전략(통계학자 / 2등의 별 / 회귀주의자 / 추세추종자) 모두 실데이터 동작.

## 3.2. 보류 / 후순위 옵션

- i18n 영문 메시지 테이블.
- 모바일 가로 모드 미세 조정 (현재 max-width 640px로 동작).
- sudoku / tetris의 html-game v0.2 표준 적용 (작업량 큼).
- 결제 시스템 (캐릭터 슬롯 / 스킨, 별도 윤리 가이드 통과 필요).
- 명당 판매점 데이터 (외부 정합성 검증 비용).

# 4. 결정 이력 (마일스톤별)

4.1. **M0 확정**: html-game 표준 위치 / 진화 룰 / 캐릭터 라인업 / 본번호·보너스 분리 / 매직넘버 0개.
4.2. **M1 1단계 확정**: 적재 범위 1회차 전수 / 시드 FNV-1a / 갱신 정적 JSON.
4.3. **M2 1단계 확정**:
- 캐릭터 슬롯은 메인 화면 상단에 인라인 배치 (별도 사이드바 / 탭 안 함).
- 추가 캐릭터는 모달 안 폼 (첫 캐릭터는 직접 폼).
- 마지막 1명 삭제 금지 (UX 보호).
- 클래스 약자 표시: 축 / 통 / 별.
4.4. **개발환경 처리 결정**:
- localhost / 127.0.0.1에서는 SW 자동 차단 + 캐시 클리어 + 1회 자동 reload.
- `scripts/dev-server.mjs` 정적 서버를 표준 dev 환경으로 권장 (Live Server 대체).
4.5. 살아있는 룰의 단일 소스는 `CLAUDE.md` + `standards/html-game/STANDARD.md`.
4.6. **데이터 출처 변경 (2026-05-01)**: 동행복권 `common.do` API + 결과 페이지 외부 직접 접근 영구 차단 확인. smok95/lotto GitHub Pages 미러로 전환. 미러는 매주 토 GitHub Actions 자동 갱신. 미러 갱신 끊김 시 사용자 수동 입력 fallback (`docs/02_data.md` 4.6).

# 5. 미해결 / 개선 여지

5.0. **2026-05-01 시점 정보 (사용자 확인)**: 1221회까지 발표 / 1222회 = 2026-05-02 토 추첨 예정 / 1등 예상 당첨금 약 183.7억. `DEFAULT_DRWNO` = 1222로 설정.
5.1. accent 컬러(`#d4a657`) 임시값, 시안 단계 재결정.
5.2. 운세 산출 로직: 현재 시드 + 회차 단순 mix + 가중 분포. 사주 십이지 적용은 M5에서 정밀화.
5.3. 휠링 시스템 비스코프 (윤리 검토 후 재논의).
5.4. sudoku / tetris의 html-game 표준 적용 여부 (사용자 결정 - 나중).
5.5. core/ 모든 모듈 테스트 작성 완료. render/ 모듈 테스트는 선택 (현재 미작성).
5.6. 페치 스크립트 첫 실행 (사용자 액션 대기). smok95 미러 채택 후 표본 검증 끝(1/500/1100/1221회 200 OK, 평균 240ms).
5.7. 표준 위반 작은 이슈: render/main.js가 직접 이벤트 리스너 등록 (input/ 책임 일부 흡수). MVP 단순성 우선. M2 마무리 단계에서 input/ 분리 검토.

# 6. 커밋 히스토리

| 커밋 | 내용 |
|---|---|
| (예정) | M0 + M1 일괄: html-game v0.2 표준 + lotto 적용 + 코어 + UI MVP |
| (예정) | M2 1단계: 캐릭터 슬롯 / 추가 모달 / 전환 / 삭제 |
| (예정) | dev 환경: SW 차단 + dev-server.mjs 정적 서버 |
| 2026-05-02 | 2.26 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 + 보너스 버그 수정 + 폼/탭 개선 + 11전략 직관화 |
| 2026-05-02 | 2.27 객관 전략(통계/빈도/필터) 캐릭터 무관 분리 - "통계 추첨이 사람마다 다른" 결손 정정 |
