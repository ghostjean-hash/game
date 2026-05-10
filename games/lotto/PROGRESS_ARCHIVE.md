# Lotto 진행 로그 - 아카이브

> 본 파일은 PROGRESS.md에서 분리된 옛 누적 이력. **활성 상태는 PROGRESS.md 참조.**
>
> 1차 분리: 2026-05-04. 직전 5 Sprint(032~036, 절 2.53~2.57) 활성 잔존.
> 2차 정리: 2026-05-08. Sprint 037~039(절 2.58~2.60) archive 추가 이전. Sprint 040~044 활성 잔존.
>
> 본 archive는 검색 / 회귀 디버그용. 새 세션에서 자동 적재되지 않음.

# 1. 현재 상태 (분리 시점 스냅샷)

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-03 (Sprint 036 - 메인 카드 폐기 + 추천 리스트 단일 영역 / S27).
1.4. **적용 표준**: html-game v0.2.

# 2. 완료 마일스톤

## 2.80. Sprint 059 완료 - Node 매트릭스 + dead 토큰 + UI 흰색 토큰화 + chip 색 SSOT 정합 (S59, 2026-05-09)

배경: Sprint 058 전면 검증의 후속 정리. 발견 결함을 시각 회귀 위험도 순으로 단계 분할(S59.1~S59.3). 시각 회귀 0 영역부터 처리.

### 2.80.1. 단계 1 - CI Node 매트릭스 + dead 토큰 정리 (S59.1, 커밋 4b2ebf3)

- `.github/workflows/test-lotto.yml`: Node 단일 `20` → 매트릭스 `['18','20','22']` LTS 호환 검증. `fail-fast: false` (어느 LTS 실패해도 다른 버전 결과 노출). S58에서 Node 25 polyfill 가드는 강화했으나 CI 단일 버전 회귀 위험 차단.
- `styles/tokens.css`:
  * `--color-success` 삭제: UI 영역 미참조 + 의미 중복(운세 good 색은 `colors.js FORTUNE_COLORS`).
  * `--z-base: 0` 보존 + 의도 주석(z-index 명시적 0 기준선).
- 검증: 274/274 PASS. main.css 미참조 토큰 1건 삭제 → 시각 영향 0.

### 2.80.2. 단계 2 - UI 흰색 hex → `var(--color-on-accent)` 토큰 마이그레이션 (S59.2, 커밋 b6914f5)

배경: S58 검증에서 main.css 인라인 hex 64건 발견. 시각 회귀 0 보장 영역(흰색 9건)부터 우선 처리.

- `styles/main.css`: `color: #ffffff` 7건 + `color: #fff` 2건 = 9건 → `color: var(--color-on-accent)`.
- 토큰 정의: `tokens.css --color-on-accent: #ffffff` (S29.4 기존 정의). CSS 컴파일 결과 byte-identical, 시각 회귀 0.
- 적용 셀렉터: `.btn-primary` / `.strategy-short` / `.slot-class` / `.num` / `.modal-confirm` / `.num-source-tag` / `.reverse-cell.is-picked` / `.reverse-best-draw-balls .num` / `.ritual-row-icon.is-done`.
- 검증: 274/274 PASS. 잔존 `color: #(fff|ffffff)` 0건.

### 2.80.3. 단계 3 - chip / ritual / 변동성 색 SSOT 정의 추가 (S59.3, 본 커밋)

배경: main.css 인라인 hex 잔여 영역 중 게임 데이터 성격(전략 출처 / chip / 의식 / 변동성)을 SSOT 명문화. 단계 3 스코프는 **정의 추가까지**. 소비처화는 별도 sprint.

- `src/data/colors.js`: 신규 export 3건.
  * `CATEGORY_CHIP_COLORS` - stats / mapping / random (sky / pink / gray, lighter chip 톤. 출처 태그 진한 톤보다 한 단계 옅음).
  * `RITUAL_CHIP_COLORS` - bg / fg / border / accent / warm (yellow~amber 5 stop. 행운 의식 row 활성 / 만땅 banner / 보너스 chip / cta 일관 톤).
  * `VARIABILITY_CHIP_COLORS` - active(weekly, 녹색) / inactive(lifetime, 회색). inactive border `#d1d5db`는 `RANK_MISS_COLOR`와 의도된 일치(둘 다 비활성 시각 의미).
- `docs/02_data.md` SSOT 신설:
  * 1.19.8 행운 의식 chip / banner / cta 색 (5 키 표).
  * 2.8 카테고리 chip 색 (stats / mapping / random 표).
  * 2.9 변동성 chip 색 (active / inactive 표 + RANK_MISS_COLOR 중복 의도 명시).
- 정합 정책: colors.js hex와 main.css 인라인 hex가 동기. 한쪽 변경 시 양쪽 갱신. 단일 소비처화는 후속 sprint.
- 검증: import 측 영향 0건(정의만 추가, 소비처 0). 274/274 PASS 유지 예상.

### 2.80.4. 잔여 / 후속 sprint 후보

- ~~S59.4 (대기)~~ **닫힘 - Sprint 064 (2026-05-10)에서 storage 테스트 16/25 → 23/25 보강. sync* 2건은 S64.1로 격리.**
- S64.1 (대기): syncDraws / syncDrawsIfNewer fetch mock + 4분기 회귀 (`new-rounds` / `already-latest` / `mirror-unreachable` / `sync-failed`).
- chip / ritual / 변동성 색 단일 소비처화 (별도 sprint): main.css 인라인 hex → colors.js 단일 소비처화 경로 결정(CSS 변수 주입 vs JS render inline style) + 마이그레이션 + 시각 회귀 검증.

## 2.79. Sprint 058 완료 - 전체 재검증 + 매직 넘버 정리 + Node 25 가드 (S58, 2026-05-09)

배경: 사용자 지시 "전체 코드 재검증, 정합성 검증, 문서 검증". 4영역(테스트 / docs / 코드 절대 규칙 / docs-code 일치) 병렬 점검.

### 2.79.1. 검증 발견

| 영역 | 결과 | 결함 |
|---|---|---|
| 테스트 회귀 | FAIL 4건 | Node 25.7 환경 (storage.test.js) |
| 문서 정합성 | 양호 | 거짓 양성 3건 |
| 코드 절대 규칙 | 위반 3건 | 매직 넘버 (색상 / KST / 파티클) |
| docs-code 일치 | 양호 | - |
| hotfix S43.7 회귀 | PASS | - |

### 2.79.2. fix #1 - tests/run-node.js polyfill 가드 강화

- 원인: Node 25.7이 `localStorage`를 빈 builtin 객체(메서드 없음)로 노출. 기존 `typeof === 'undefined'` 가드가 빈 객체 통과시켜 polyfill 미주입 → `setItem is not a function` 4건.
- fix: 가드 조건 = `'undefined' OR setItem 함수 부재`. Node 18/20/25 모두 호환.

### 2.79.3. fix #2 - 매직 넘버 정리 (CLAUDE.md 절대 규칙 #2 위반)

| 파일 | 위반 | 위탁 |
|---|---|---|
| `render/history-page.js` | RANK_COLORS 6 hex + 미적중 `#d1d5db` | `colors.js` `RANK_GLOW_COLORS` 재사용 + `RANK_MISS_COLOR` 신설 |
| `render/ritual-particles.js` | 6개 인라인(개수 / 시간 / 픽셀 / 색상 2종) | `numbers.js` `RITUAL_PARTICLE_*` + `colors.js` `RITUAL_PARTICLE_COLORS` 신설 |
| `render/main.js:228, 319` | KST 오프셋 `9 * 3600 * 1000` 2회 | `numbers.js` `DRAW_TZ_OFFSET_MIN` 재사용. 모듈 상단 `KST_OFFSET_MS` 도출 |

### 2.79.4. docs SSOT 갱신

- `docs/02_data.md` 1.19.7 신설: 만땅 진입 파티클 버스트 상수 표 (5종).
- `docs/02_data.md` 2.3 갱신: "적중 등수 글로우" → "적중 등수 색", 미적중 항목 추가, 사용처 명시.

### 2.79.5. 검증

- `node tests/run-node.js` → **274/274 PASS** (Node 25 환경에서 처음 풀 그린).
- 전 모듈 ESM import 재검증 통과 (colors / numbers / history-page / ritual-particles / main.js).
- `grep -n "#[0-9a-f]\{6\}\|9 \* 3600 \* 1000"` render/ → 0건 (인라인 hex / KST 매직 잔존 0).

### 2.79.6. 거짓 양성 기록 (수정 없음)

- `01_spec.md` L126 "전략 10종" - 실제 10종 정확 (`STRATEGY_DEFAULT`는 `STRATEGY_BLESSED` alias).
- `01_spec.md` L148 "토글" - L140에서 "토글(선택/해제)"로 정의된 용어. 일관.
- `02_data.md` L158 blessed "표식" - 시드 의존 의미상 정확.

다음 검증 사이클에서 이 3건은 PASS로 분류해 노이즈 차단.

## 2.78. Sprint 057 완료 - S43.7 hotfix 2건 (2026-05-09)

배경: Sprint 051~056 알고리즘 재구축 series 후 사용자 보고 2건. 자비스 시각 검증 0회 결과.

### 2.78.1. hotfix #1 (SW v38) - 빈 화면

- 사용자 보고: "왜 화면이 아무것도 안뜨지? 작업후 기본적인 테스트도 안하는거야?".
- 원인: Sprint 056에서 `recommend` wrapper 폐기 후 `main.js` 잔존 import만 남음. ESM 환경에서 존재하지 않는 export import = 모든 페이지 빈 화면.
- fix: `main.js` import 제거. 전 모듈(render/* core/* data/*) 전수 import 검증 도입.
- 자비스 사후: 메모리 룰 "코드 변경 후 사용자에게 검증 떠넘기지 않기" 갱신 (사용자가 직접 추가).

### 2.78.2. hotfix #2 (SW v39) - 프리셋 차별화 복원 + 마이그레이션

- 사용자 보고: "왜 다 켜져 있냐? 편집 시 전략 내용 모두 똑같다".
- 원인: Sprint 053(S43.3) 임시 단순화로 모든 프리셋을 `[STRATEGY_INTUITIVE]` 단독으로 통일. 알고리즘 재구축(S43) 후 옛 묶음 복원해도 안전했지만 `DEFAULT_PRESETS` 복원 잊음.
- fix:
  * 균형: `[trendFollower, astrologer, intuitive]` "최신·운세·직감 한 번에"
  * 분산파: `[regressionist, intuitive, balancer]` "남들이 덜 고르는 조합"
  * 운세파: `[astrologer, fiveElements, zodiacElement]` "서양·동양·원소 운세"
- `saved-sets-section.js` 옛 카피 ("아래 전략을 골라 조립식...") → "아래 프리셋을 고르고..." 갱신.
- `loadPresets` 마이그레이션: 옛 단순화 데이터(모든 슬롯이 직감 단독) 자동 reset → DEFAULT_PRESETS 주입.

### 2.78.3. 시뮬 검증 (1000회 × 4 캐릭터)

| 프리셋 | 1-9 | 10-19 | 20-29 | 30-39 | 40-45 | 0세트 | 인접쌍 |
|---|---|---|---|---|---|---|---|
| 한국 실측 | 20% | 22% | 22% | 22% | 13% | 24% | ~1.0 |
| 균형 | 19.7% | 23.3% | 22.4% | 22.1% | 12.6% | 23.2% | 0.66 |
| 분산파 | 19.5% | 23.8% | 22.2% | 21.9% | 12.7% | 23.8% | 0.68 |
| 운세파 | 19.7% | 23.6% | 21.9% | 21.8% | 12.9% | 22.9% | 0.67 |

3 프리셋 모두 한국 실측 안 + 차별화 복원.

### 2.78.4. 검증

- `node tests/run-node.js` → 270/274 PASS (사전 storage 4건 Node 환경 무관).
- 전 모듈 import 검증 통과.

### 2.78.5. 자비스 사후 정책

- 메모리 룰 갱신 (사용자 직접 추가): "코드 변경 후 사용자에게 검증 떠넘기지 않기 - dev-server 응답 / 문법 / import / PROGRESS 미해결 영향까지 자비스가 사전 점검한 다음 사용자 실기 안내로 넘긴다".
- 다음 sprint에서 헤드리스 브라우저 시각 검증 도입 검토.

## 2.77. Sprint 056 완료 - 호환 wrapper 폐기 + 테스트 일괄 변환 (S43.6, 2026-05-08)

배경: 사용자 지시 "권장안 진행" - Sprint 055에서 이월된 4.1 호환 wrapper 폐기 작업.

### 2.77.1. recommendMulti 호환 처리

`src/core/recommend.js` `recommendMulti` 진입점에 ctx.strategyId 단일 입력 호환:

- `ctx.strategyIds`가 비어있으면 `ctx.strategyId`로 fallback (단일 list 변환).
- 둘 다 없으면 throw.
- 옛 호출 패턴(`recommend({...strategyId: X})`) 그대로 동작.

### 2.77.2. 테스트 일괄 변환

Python 정규식으로 `tests/suites/recommend.test.js`의 `recommend(...)` 호출 28건을 `recommendMulti(...)`로 일괄 치환. 변환 후 import 정리 (`recommend` / `distributeCounts` 제거).

### 2.77.3. wrapper 2개 폐기

| 함수 | 처리 |
|---|---|
| `recommend` (단일) | 통째로 삭제 |
| `distributeCounts` | 통째로 삭제 + 테스트 단언 폐기 |

### 2.77.4. 빈 strategyIds 단언 갱신

옛: `strategyIds: []` 단독 입력 시 throw.
새: `strategyIds: []` + `strategyId: undefined` 둘 다 없을 때 throw. baseCtx에 strategyId 포함이라 단언 강화.

### 2.77.5. 검증

- `node tests/run-node.js` → 270/274 PASS (사전 storage 4건 Node 환경 무관). 신규 FAIL 0.

### 2.77.6. 결과

- `recommend.js`는 새 architecture(`recommendMulti` / `recommendFiveSets` / `computePoolForStrategies`)만 export.
- 옛 architecture 흔적 0건.
- 호환 wrapper / dead code 모두 정리.

## 2.76. Sprint 055 완료 - docs SSOT 정리 + SAJU_RELATION_BOOST 결정 (S43.5, 2026-05-08)

배경: 사용자 지시 "다음 진행" - Sprint 054 후속 권장.

### 2.76.1. docs/02_data.md 옛 architecture 절 폐기 마크 (4.2 부분)

| 절 | 변경 |
|---|---|
| 1.4 비율 필터 | 폐기 마크 + 사유. SUM_RANGE / ODD_EVEN / AC_VALUE 폐기 명시 |
| 1.5.1 객관 vs 시드 의존 | 폐기 마크. OBJECTIVE_STRATEGIES / OBJECTIVE_SEED_SALT 폐기 명시 |
| 1.5.4 다중 전략 분배 | 폐기 마크. distributeCounts 호환 wrapper 보존 |
| 1.5.7 객관 전략 시드 분산 | 1.5.1 동반 폐기 |

기존에 이미 폐기 표기된 절 (1.5.6 풀 컷팅 / 1.7 가중치 한계)는 그대로 보존. docs/01_spec.md 5.1.3.0 (S43 architecture)와 교차 참조.

### 2.76.2. SAJU_RELATION_BOOST 보존 결정 (4.3)

| 항목 | 분석 |
|---|---|
| 사용 위치 | `src/render/character-card.js` (시각 라벨 전용) |
| 추첨 영향 | 0 (새 architecture는 fiveElements lucky +0.4 가중만 사용) |
| 사용자 가치 | 사주 통변성 관계(인성/식상/재성/관성/비견) 시각 노출 = 학설 깊이 표현 |
| **결정** | **보존**. 시각 정보로 가치 있음. 추첨 영향 0이라 알고리즘 부담 없음 |

### 2.76.3. 4.1 호환 wrapper 폐기 - 별도 sprint 이월

`recommend` (단일) / `distributeCounts` 호환 wrapper 폐기는 35건 테스트 호출 영향. 안전 일괄 변환 위해 별도 sprint(테스트 일괄 갱신 전용) 권장.

### 2.76.4. 검증

- `node tests/run-node.js` → 271/275 PASS (사전 storage 4건 Node 환경 무관). 신규 FAIL 0.

### 2.76.5. 다음 sprint 후보

- **호환 wrapper 폐기 sprint**: recommend.test.js 35건 호출을 recommendMulti로 일괄 변환. 테스트 갱신 전용.
- 기타 1.5.2 / 1.5.5 / 1.5.8 등 docs 절 점검 (필요 시).

## 2.75. Sprint 054 완료 - 옛 상수 폐기 + main.js 객관 분기 폐기 (S43.4, 2026-05-08)

배경: 사용자 지시 "권장안 진행" - Sprint 053 후속 권장.

### 2.75.1. main.js 객관 vs 시드 의존 분기 폐기 (4.3)

`addSavedSetsBatch` `buildCtxFor`:
- 옛: `hasObjective` 분기로 객관 전략 → drwNo 변형 / 시드 의존 → seed 변형.
- 새: 모든 strategy가 samplingSeed = mix(seed, drwNo) 의존 → seed 변형 단일.
- `OBJECTIVE_STRATEGIES` import 제거.

### 2.75.2. numbers.js 옛 상수 폐기 (4.2)

| 상수 | 사유 |
|---|---|
| `SUM_RANGE_MIN` / `SUM_RANGE_MAX` | balancer post-filter 폐기 |
| `ODD_EVEN_PREFERRED` | balancer post-filter 폐기 |
| `AC_VALUE_MIN` / `AC_VALUE_MAX` | 미구현 |
| `STATS_POOL_SIZE` | 풀 컷팅 폐기 |
| `OBJECTIVE_STRATEGIES` / `OBJECTIVE_SEED_SALT` | 객관 분기 폐기 |
| `WEIGHT_MAX_BIAS` | applyLuck 폐기 |
| `STATS_POWER` / `GAP_POWER` | statsToWeights / gapWeights 폐기 |

`WEIGHT_MIN_FLOOR` 보존 (weightedSample 안전망).

### 2.75.3. 호환 wrapper 폐기 (4.1) - 보류

`recommend` (단일) / `distributeCounts` 호환 wrapper는 35건 테스트 호출 영향 → 다음 sprint로 이월. 대신 `STATS_POOL_SIZE` import만 정리.

### 2.75.4. 검증

- `node tests/run-node.js` → 271/275 PASS (사전 storage 4건 Node 환경 무관). 신규 FAIL 0.

### 2.75.5. 다음 sprint 후보

- 호환 wrapper(`recommend` / `distributeCounts`) 폐기 + 35건 테스트 호출 일괄 갱신 (`recommendMulti`로).
- `docs/02_data.md` 1.4 / 1.5.6 / 1.7 옛 상수 절 정리.
- `SAJU_RELATION_BOOST` (character-card.js 사용) 새 architecture 통합 또는 보존 결정.

## 2.74. Sprint 053 완료 - dead code 폐기 + 옛 architecture 단언 정리 (S43.3, 2026-05-08)

배경: 사용자 지시 "권장안대로 진행" - Sprint 052 후속 권장 일괄.

### 2.74.1. 변경

| 파일 | 이전 | 이후 |
|---|---|---|
| `src/core/recommend.js` | 676줄 (옛 architecture 함수 17개) | ~240줄 (새 architecture만) |
| `src/core/luck.js` | 88줄 (`preferredNumbers` / `applyLuck` / `applyLuckGrowth` / `rankLuckBonus`) | 33줄 (`applyLuckGrowth` / `rankLuckBonus`만) |

폐기 함수 (`recommend.js` + `luck.js`):
- `recommend` (단일) - wrapper 보존 (외부 테스트 호환).
- `distributeCounts` - wrapper 보존 (외부 테스트 호환).
- `strategyHash` / `poolFromWeights` / `poolFromIndices` / `statsToWeights` / `gapWeights` / `zodiacWeights` / `trendWeights` / `intuitiveWeights` / `passesBalanceFilters` / `zodiacElementOf` / `zodiacElementWeights` / `fiveElementOf` / `fiveElementsWeights` / `balancedSample` / `computeStrategyContext` - 통째로 삭제.
- `applyLuck` / `preferredNumbers` (luck.js) - 통째로 삭제.

### 2.74.2. 옛 architecture 테스트 단언 정리

`tests/suites/recommend.test.js` + `tests/suites/luck.test.js`에서 옛 architecture 검증 단언 일괄 갱신/폐기:

- `reasons` 메시지 키워드 단언 (`'축복'`, `'fire'`, `'wood'` 등) → 폐기. 새 architecture는 reasons 단순 카운트.
- 풀 컷팅 효과 6/6 hit → 약화 (hit 비율로 검증).
- `distributeCounts` 범위 밖 에러 → 폐기 (호환 wrapper).
- `balancer` 합 121-160 / 홀짝 3:3 통과율 → 폐기 (post-filter 폐기).
- 객관 strategy "seed 달라도 같은 결과" → 폐기 (객관 개념 폐기).
- 알 수 없는 전략 에러 → 폐기 (호환 wrapper).
- `preferredNumbers` / `applyLuck` 단언 (luck.test.js) → 통째로 폐기.

### 2.74.3. recommendFiveSets 통일 (S43.2 후속)

`recommendFiveSets` 안의 시드 변형 단순화:
- 옛 분기: 객관 전략 → drwNo 변형 / 시드 의존 → seed 변형.
- 새 단일: seed 변형만. 객관/시드 의존 분기 폐기.

### 2.74.4. 검증

- `node tests/run-node.js` → 271/275 PASS (사전 storage 4건 Node 환경 무관).
- 신규 회귀 5건 (S43 분포 정상성) 그대로 PASS.

### 2.74.5. 보존 대상 (다음 sprint 검토)

- `recommend` (단일) / `distributeCounts` 호환 wrapper - 다음 sprint에서 테스트 호출도 `recommendMulti`로 일괄 변경 후 wrapper 폐기.
- `numbers.js` 옛 상수 (`STATS_POOL_SIZE` / `WEIGHT_MAX_BIAS` / `STATS_POWER` / `GAP_POWER` / `SUM_RANGE_*` / `ODD_EVEN_PREFERRED` / `OBJECTIVE_STRATEGIES` / `OBJECTIVE_SEED_SALT` / `SAJU_RELATION_BOOST`) - 일부 외부 사용 (main.js / character-card.js / strategy-tabs.js). 점진 폐기.

## 2.73. Sprint 052 완료 - S43 후속 정리 (S43.2, 2026-05-08)

배경: 사용자 지시 "권장 사항 진행" - Sprint 051 후속 권장 3건 일괄 처리.

### 2.73.1. backcast 알고리즘 통일

- `src/core/history.js` `backfillRecommendations`: `recommend` 단일 → `recommendMulti({...strategyIds: [strategyId]})`. 새 architecture로 통일.
- `src/core/recommend.js` `recommendFiveSets`: `multi ? recommendMulti : recommend` 분기 → 항상 `recommendMulti({...strategyIds: sids})` 호출. 단일/다중 분기 폐기.
- 결과: 사용자 노출 추천 + backcast 백필 + 5세트 모두 동일 architecture (단일 추첨 합성 weight).

### 2.73.2. SSOT 갱신

- `docs/01_spec.md` 5.1.3.0 (추천 알고리즘 architecture) 신설. 옛 architecture 결함 / 새 architecture 룰 / 검증 수치 명시.
- `docs/02_data.md` 1.5.6 (풀 컷팅) 폐기 사유 추가. 1.7 (가중치 한계) WEIGHT_MAX_BIAS 폐기 명시.

### 2.73.3. Dead code @deprecated 마크

| 파일 | 함수 | 상태 |
|---|---|---|
| `src/core/recommend.js` | `recommend` (단일) | @deprecated. 외부 호출 0 |
| `src/core/luck.js` | `applyLuck` | @deprecated. 외부 호출 0 (테스트 import만) |

내부 헬퍼(`distributeCounts` / `computeStrategyContext` / `poolFromWeights` / `statsToWeights` / `gapWeights` / `trendWeights` / `intuitiveWeights` / `zodiacWeights` / `passesBalanceFilters` / `strategyHash`)도 사실상 dead. 테스트 import 영향 보존. 다음 sprint에서 폐기.

### 2.73.4. 테스트 갱신

- `S4-T1 recommendFiveSets: [0]은 메인` 단언: `recommend` 단일 비교 → `recommendMulti` 비교. S43.2 통일 반영.

### 2.73.5. 검증

- `node tests/run-node.js` → 294/298 PASS (사전 storage 4건 Node 환경 무관). 신규 FAIL 0.
- 신규 회귀 테스트 5건(S43 분포 정상성)도 그대로 PASS.

### 2.73.6. 다음 sprint 후보

- `recommend` 단일 + 옛 헬퍼 함수 실제 코드 삭제. 테스트 import 함께 정리.
- `applyLuck` / `WEIGHT_MAX_BIAS` 상수 폐기.
- `STATS_POOL_SIZE` / `SUM_RANGE_MIN/MAX` 등 옛 architecture 상수 폐기 검토.
- `backfillRecommendations`의 `strategyId` 단일 인자 → `strategyIds` list로 갱신.

## 2.72. Sprint 051 완료 - 알고리즘 처음부터 재구축 (S43, 2026-05-08)

배경: 사용자 결정타 - "알고리즘 근본 자체 잘못. 부분 fix 의미 없다. 처음부터 재구축". 30+ sprint 누적 보정이 끝자리 패턴 충돌(2/3/4, 21/22/24 인접 클러스터링) + 1번대 무조건 노출 + 같은 번호 반복 + 풀 컷팅 / 합 필터 / Luck 25배 / 다중 분배 등 architecture 수준 결함.

### 2.72.1. 옛 architecture 결함

| 영역 | 결함 |
|---|---|
| 다중 strategy 분배 | 6번호를 N개 strategy에 2개씩 균등 분할 → 각 풀 별도 추첨 → 정렬 시 끝자리 충돌 클러스터링 |
| 풀 컷팅 (STATS_POOL_SIZE) | 풀 좁아 결정론 채택. 풀 안 1-9 비중 그대로 노출 |
| Luck 25배 보너스 | 시드 6번호 채택 84%. 캐릭터 시드 작은 번호면 매번 그 번호 |
| balancer 합 필터 | post-filter로 분포 왜곡. 작은 번호 자주 통과 |
| 학설/통계/Luck 누적 | 매 fix가 부분 해결 + 또 다른 결함 노출 |

### 2.72.2. 새 architecture (단일 추첨)

| 영역 | 새 룰 |
|---|---|
| 단일 weight 벡터 | 모든 strategy의 가중을 1-45 base 1.0 + 학설/통계 보너스 +0.3~+0.5로 합성 |
| weightedSample 1번 | 6번호 단일 추첨 → 인접 클러스터링 자연 해소 |
| 다중 분배 폐기 | 분배 룰 / 잘라쓰기 휴리스틱 모두 우회 |
| 풀 컷팅 폐기 | 학설 = 정의가 아닌 약한 가중치. 1-45 전체 추첨 가능 |
| Luck 보너스 약화 | 시드 6번호 +0.5 (Luck 비례). base 1.0의 1.5배 정도 |
| balancer 합 필터 폐기 | post-filter 안 함. 1-45 균등 + 합 100-180 자연 통과 빈도 |
| S33 풀 외 차단 폐기 | 학설 가중일 뿐. 풀 외도 base weight로 추첨. 한국 실 분포 부합 |

### 2.72.3. 검증 (시뮬 2000회 × 60 캐릭터 조합)

| 묶음 | 1-9 | 10-19 | 20-29 | 30-39 | 40-45 | 0세트 | 인접쌍/세트 |
|---|---|---|---|---|---|---|---|
| **한국 실측** | **20.0%** | **22.2%** | **22.2%** | **22.2%** | **13.3%** | **24%** | ~1.0 |
| 균형 (직감) | 19.5% | 22.8% | 22.7% | 21.9% | 13.1% | 24.4% | 0.68 |
| 별자리+사주+직감 | 19.7% | 22.6% | 22.8% | 21.9% | 13.1% | 23.9% | 0.67 |
| 통계 4종 | 19.8% | 22.7% | 22.5% | 22.4% | 12.7% | 23.7% | 0.66 |
| 적게+직감 | 19.5% | 22.9% | 22.7% | 21.9% | 13.0% | 24.3% | 0.68 |
| 최신+별자리+랜덤 | 19.7% | 22.4% | 22.8% | 22.1% | 13.0% | 23.8% | 0.66 |

**모든 영역 한국 실측에 정확 일치.** 인접쌍 0.66-0.68 (실측 ~1.0보다 낮지만 자연 범위).

### 2.72.4. 변경 파일

- `src/core/recommend.js`: `recommendMulti` 통째로 교체. 신규 `computeUnifiedWeights` / `assignSourceForNumber` 헬퍼.
- `src/data/numbers.js`: `DEFAULT_PRESETS` 모두 `[STRATEGY_INTUITIVE]` 단독으로. 부제만 차별화.
- `tests/suites/saved-sets.test.js`: S33 풀 외 차단 회귀 2건 폐기 (옛 architecture 검증).

### 2.72.5. 보존된 코드 (다음 sprint 정리 권장)

- `src/core/recommend.js`: `recommend` 단일 / `distributeCounts` / `computeStrategyContext` / `poolFromWeights` 등은 호출 안 되지만 보존. 다음 sprint에서 정리.
- 학설 풀 정의 (`ZODIAC_LUCKY` 등): 가중치로 활용 + 풀 표시(시각용)에서 사용.

### 2.72.6. 검증 (회귀)

- `node tests/run-node.js` → 289/289 PASS (사전 storage 4건 무관). 신규 FAIL 0.

### 2.72.7. 사용자 영향

- "1번대 무조건 노출" 해소. 모든 구간 한국 실측에 일치.
- "3개씩 모아 찍기" (인접 클러스터링) 해소. 단일 추첨으로 풀 인접 인덱스 동시 채택 가능성 균등.
- "같은 번호 반복" 해소. 풀 1-45 전체에서 추첨이라 다양성 큼.
- 학설/통계/Luck 가중치는 보존 (시각 라벨 + 약한 분포 차별).

## 2.71. Sprint 050 완료 - 운세파 묶음 + Luck 보너스 강도 fix (S41+S42, 2026-05-08)

배경: 사용자 통찰 2단:
1. "운세파 1-9 무조건 노출" (이미지: 9세트 54번호 중 1-9 = 17개 = 31.5%).
2. "1~45 진짜 랜덤은 중앙에 몰릴 수도 위에 몰릴 수도 있는데 너는 무조건 아래로 몰림. 분명 실수".

### 2.71.1. S41 - 운세파 묶음

| 영역 | 이전 | 이후 |
|---|---|---|
| 운세파 묶음 | 별자리 + 4원소 + 사주 | 별자리 + 사주 + 직감 |
| 부제 | 동·서양 운세 합 | 별자리·사주 + 즉흥 |

4원소 fire = [1,3,9,...] 1-9 안 3개로 가장 1-9 비중 높은 학설. 폐기. 직감(풀 1-45 균등) 추가로 자연 분산.

### 2.71.2. S42 - Luck 보너스 강도 (핵심 결함)

진단: `WEIGHT_MAX_BIAS = 50.0`. Luck=50 시 boost = 25.5배. 시드 의존 전략(별자리/4원소/사주)에서 시드 6번호가 풀 안에 1개 있으면 weight 25.5 vs 다른 1 → **채택 확률 84%**. 매 추천 시드 번호 거의 확정 채택.

사용자 캐릭터 시드 6번호에 우연히 작은 번호(2, 4, 5 등) 포함 → 모든 추천에 2, 4, 5 반복 등장. 사용자가 본 "추천1=2,4,5,18,24,32 / 추천3=2,4,5,16,20,26 / 추천9=2,4,5,8,12,14" 패턴의 진짜 원인.

| 영역 | 이전 | 이후 |
|---|---|---|
| `WEIGHT_MAX_BIAS` | 50.0 | **5.0** |
| Luck=50 시 boost | 25.5배 | 3배 |
| 시드 번호 채택 확률 (풀 6) | 84% | 37.5% |

### 2.71.3. 시뮬 검증 (1000회)

| 영역 | 1-9 | 10-19 | 20-29 | 30-39 | 40-45 |
|---|---|---|---|---|---|
| **한국 실측** | 20% | 22% | 22% | 22% | 13% |
| **운세파 (S41+S42 fix)** | 20.2% | 22.1% | 22.2% | 23.4% | 12.2% |

### 2.71.4. 검증

- `node tests/run-node.js` → 291/291 PASS (사전 storage 4건 무관).

### 2.71.5. 사용자 영향

- "낮은 번호 무조건 등장" 즉시 해소. 모든 구간에 자연 분산.
- 캐릭터 시드 보너스가 자연 가중 수준 (3배). Luck 의미 보존.
- 사용자가 본 진짜 알고리즘 결함 = `WEIGHT_MAX_BIAS = 50` 너무 높음. 핵심 fix.

배경: 사용자 화면 캡처 분석 - 운세파 9세트 54번호 중 1-9 = 17개 = 31.5% (한국 실측 20%). 사용자 통찰 "운세 학설 자체가 끝자리 낮은 수 베이스. 그걸로 뽑으면 낮은 수밖에 안 나옴".

### 2.71.1. 진단

- 학설 풀 끝자리 1-9 베이스: 별자리(1,5,11,15,...) / 4원소 fire(1,3,9,11,...) / 사주(3,8,13,...) 모두 끝자리에 1-9 안 번호 2-3개.
- 4원소 fire = 1-9 안 3개로 가장 비중 높음.
- + 추첨일 일진 보너스 ×3 (인성) 부스트 = 작은 번호 강조.
- 9세트 시드 변형해도 같은 풀 weight라 1-9 반복.

### 2.71.2. 변경

| 영역 | 이전 | 이후 |
|---|---|---|
| 운세파 묶음 | 별자리 + 4원소 + 사주 | **별자리 + 사주 + 직감** |
| 운세파 부제 | 동·서양 운세 합 | **별자리·사주 + 즉흥** |

4원소 폐기 사유: 1-9 비중 가장 높은 학설. 직감 추가 사유: 풀 1-45 균등 + 회차마다 weight 셔플 = 자연 분산.

### 2.71.3. 시뮬 검증 (1000회)

| 옵션 | 1-9 | 0개세트 | 채택 |
|---|---|---|---|
| A. 별자리+4원소+사주+직감 (4종) | 20.4% | 32.9% | - |
| **B. 별자리+사주+직감 (3종)** | **20.0%** | **35.8%** | ✓ |
| C. 별자리+직감+균형 | 20.3% | 26.4% | - |

B = 1-9 비율 한국 실측 20%에 정확. 운세 학설 2종 보존 (서양 별자리 + 동양 사주).

### 2.71.4. 검증

- `node tests/run-node.js` → 291/291 PASS (사전 storage 4건 무관).
- 사용자 환경(31.5% 편향) → 신규 설정 시 20% 정상화.

### 2.71.5. 사용자 영향

- 운세파 클릭 시 1번대 자주 노출 해소.
- 4원소 학설 단독 사용은 편집 모달에서 직접 묶음 가능.

## 2.70. Sprint 049 완료 - 1번대 무조건 노출 해소 + 분산파 묶음 단순화 (S39 + S40, 2026-05-08)

배경: 사용자 통찰 - "10번 이하가 안 나올 수 있는데 무조건 나오게 추천하는 게 맘에 안 들어. 전반적으로 다". 한국 6/45 실측 = 1-9 0개 회차 24%. 본 게임은 사실상 100% 1-9 1개 이상 노출.

### 2.70.1. 진단

- 풀 컷팅 size = 10. 풀 안 1-9 안 번호 1-2개 → 6번호 추첨 시 거의 확정 노출.
- 균형 조합(balancer) 합 필터 121-160. 평균 ±19로 좁아 작은 번호 자주 통과.
- 각 strategy의 풀 자체는 1-45 균등이지만 풀 size 10이 워낙 좁아 "무조건 1-9" 인지.

### 2.70.2. 변경 (S40)

| 영역 | 이전 | 이후 | 사유 |
|---|---|---|---|
| `STATS_POOL_SIZE` | 10 | **25** | 풀 절반 이상 = 1-9 가중 자연 약화 |
| `SUM_RANGE_MIN` | 121 | **100** | 한국 실측 평균 138 ±40 |
| `SUM_RANGE_MAX` | 160 | **180** | 약 90% 회차 커버 |
| 분산파 묶음 (S39) | regr+intuitive+balancer | **regr+intuitive** | balancer 합 필터 좁음 + 12/5/40 반복. 직감 셔플로 분산 |
| 분산파 부제 | 그대로 | "남들이 덜 고르는 조합" 그대로 | 정체성 보존 |

### 2.70.3. 검증 (시뮬 1000회)

| 프리셋 | 1-9 비율 | 1-9 0개 세트 | 한국 실측 |
|---|---|---|---|
| 균형 | 20.9% | 26.8% | 20% / 24% |
| 분산파 | 20.2% | 23.9% | 20% / 24% |
| 운세파 | 21.7% | 30.3% | 20% / 24% |

거의 한국 실측 분포에 일치. "무조건 1-9" 해소.

### 2.70.4. 테스트 갱신

`tests/suites/recommend.test.js` 4건 (secondStar / statistician / regressionist / trendFollower 풀 컷팅 효과)을 `STATS_POOL_SIZE` 동기화. heavy 배열을 풀 size로 동적 생성.

### 2.70.5. SSOT

- `docs/02_data.md` 1.5.6 풀 컷팅 size 25 / 1.4 합 필터 100-180 갱신 필요 (다음 sprint 동기화).

### 2.70.6. 검증

- `node tests/run-node.js` → 291/291 PASS (사전 storage 4건 무관). 신규 FAIL 0.

### 2.70.7. 사용자 영향

- 1번대 거슬림 즉시 해소. 분포가 한국 실 추첨에 가까워짐.
- 기존 사용자 lastUsedStrategies / 누적 추천에 영향 0 (코드만 변경).
- 균형 조합 단독 사용자: 합 필터 완화로 더 다양한 조합 노출.

## 2.69. Sprint 048 완료 - 통계 풀 컷팅 데이터 부재 fix (S38, 2026-05-08)

배경: 사용자 통찰 - "대부분 추천이 1~9번. 불합리해 보임. 왜?". 학설 데이터(별자리/원소/사주) 풀은 1~45 균등이라 정상. 시뮬 진단 결과 **통계 풀 컷팅 함수가 데이터 부재 시 1~10에 결정론 편향**.

### 2.69.1. 진단 (시뮬 500회 / 빈 numberStats)

| Strategy | 1-9 비율 | 진단 |
|---|---|---|
| 최신 (`trendFollower`) 단독 | **89.7%** (top10 = 1~10) | **결정론 결함** |
| 많이 / 적게 / 보너스 | 동일 패턴 (모든 weight 동률) | **결정론 결함** |
| 별자리 / 4원소 / 사주 | 19.8~20% | 정상 (학설 풀 균등) |
| 랜덤 (Luck=50) | 19.8% | 정상 |
| **균형 프리셋 (최신+별자리+랜덤)** | **41.9%** | **trendFollower 결함이 균형에 노출** |

원인: `poolFromWeights(weights, 10)`은 weight 내림차순 정렬 후 상위 10개 풀로. 데이터 부재 시 모든 weight가 `WEIGHT_MIN_FLOOR` / 1 동률 → sort stable → 인덱스 0~9 (= 번호 1~10) 풀 결정론.

### 2.69.2. fix

`src/core/recommend.js` `poolFromWeights`에 가드 추가:

- `max === min`이면 풀 컷팅 의미 없음 → 1~45 균등 반환.
- 정상 데이터(가중 차등 있음)는 기존 동작 그대로. 영향 0.

### 2.69.3. 검증 (시뮬 500회)

| Strategy / Preset | 이전 1-9 | 이후 1-9 |
|---|---|---|
| 최신 단독 | 89.7% | **19.2%** |
| 많이 단독 | (동일 결함) | **20.1%** |
| 적게 단독 | (동일 결함) | **19.5%** |
| 균형 프리셋 | 41.9% | **18.4%** |
| 분산파 / 운세파 | 정상 | 정상 (영향 0) |

### 2.69.4. SSOT

- `docs/02_data.md` 1.5.6.4에 S38 절 추가 (통계 풀 컷팅 데이터 부재 fix 사유 + 시뮬 수치).

### 2.69.5. 검증 (회귀 테스트)

- `node tests/run-node.js` → 291/291 PASS (사전 storage 4건 무관). 신규 FAIL 0.
- 정상 데이터(numberStats 1222회 보유) 시 기존 동작 그대로 유지 확인 (sort 분기 영향 0).
- 회귀 테스트 추가 권장 (다음 sprint): `빈 numberStats 입력 시 trendFollower 풀이 균등` 단언.

### 2.69.6. 사용자 영향

- **회차 데이터 페치 전 / 새 캐릭터 / 신규 구좌**에서 1~9 위주 편향 → 즉시 정상 분포 회복.
- **이미 페치된 사용자**는 영향 0 (정상 데이터는 가중 차등 있어 기존 동작).
- 균형 프리셋 / 통계 4종 단독 모두 회복.

## 2.68. Sprint 047 완료 - 통계파 프리셋 폐기 + 분산파 신설 (S37 사행성 책임, 2026-05-08)

배경: 사용자 통찰 - "통계파는 위험. 진짜 저게 당첨되면 당첨자 정말 많이 나올 것 같다". 25년차 기획자 미감. 통계 4축 묶음(많이+적게+최신+보너스)이 모두 데이터 상위 풀 가중 → 다수 사용자 동시 선택 → 1등 분할 위험. 게임 정체성("선택의 서사화") 충돌.

### 2.68.1. 변경 (DEFAULT_PRESETS)

| 슬롯 | 이전 | 이후 |
|---|---|---|
| 1. 균형 | 많이(`statistician`) + 별자리 + 랜덤 | **최신**(`trendFollower`) + 별자리 + 랜덤 |
| 1. 균형 부제 | 통계·운세·직감 한 번에 | **최신 흐름**·운세·직감 한 번에 |
| 2. 통계파 | `statistician` + `regressionist` + `trendFollower` + `secondStar` | **분산파** = `regressionist` + `intuitive` + `balancer` |
| 2. 라벨 / 부제 | 통계파 / 데이터 4축 통합 | **분산파 / 남들이 덜 고르는 조합** |
| 3. 운세파 | 그대로 | 그대로 |

### 2.68.2. 사행성 책임 사유

- 통계 4축 모두 풀 8~10 좁은 데이터 상위. 사실상 합집합도 좁음 → 다수 충돌.
- 한국 6/45 역대 최다 1등 분할: 회차 1052회 63명 (인당 4억대로 추락). 통계 상위 묶음이 1등에 걸리면 분할 발생 패턴.
- 자비스 1탭 추천이 분할 위험을 능동 노출 = 사용자 보호 결함.
- 통계 신봉 사용자: 편집 모달에서 직접 묶음 자유 구성 (자기 책임 영역으로 분리).

### 2.68.3. 균형 약화 사유

`statistician`(역대 누적 빈도) → `trendFollower`(최근 30회 슬라이딩 윈도우). 최신은 회차마다 풀이 변동 → 다수 사용자 동시 충돌 자연 감소. 균형 정체성(통계+운세+직감 mix)은 "최신 흐름+운세+직감"으로 보존.

### 2.68.4. SSOT

- `docs/01_spec.md` 5.1.5.4 (사행성 책임) 신설.
- `docs/02_data.md` 1.20.2 표 + 변경 사유 추가.

### 2.68.5. 검증

- `node tests/run-node.js` → 291/291 PASS (사전 storage 4건 무관). 신규 FAIL 0.
- 사용자 영향: 기존 사용자가 통계파 슬롯에 손댄 적 없으면 다음 진입 시 자동 분산파로 갱신. 직접 편집한 경우 `localStorage.lotto_presets`가 우선 → 사용자 의도 보존. "기본값 복원" 클릭 시 신규 분산파 주입.

## 2.67. Sprint 046 완료 - 프리셋 3슬롯 + 캐릭터 카드 아코디언 (S36 / S36.2 정돈, 2026-05-08)

### 2.67.0. S36.2 UX 정돈 (사용자 피드백 후 즉시 정리)

사용자 지적: "편집 버튼 / 확장 버튼 등 ux 너무 별로야. 깔끔하게 잘 정리좀해봐". 시각 노이즈 정돈:

| 영역 | 이전 (S36 1차) | 정돈 (S36.2) |
|---|---|---|
| 프리셋 컨테이너 | 보더 박스 + 패딩 + "추천 프리셋" 타이틀 + ✏ 박스 버튼 | 박스 / 타이틀 폐기. 슬롯 3개만 단독 노출 |
| 편집 버튼 | 박스 + ✏ 이모지 + "편집" 라벨 (헤더 우측) | 슬롯 list 하단 우측 작은 텍스트 링크 "편집"만 |
| 슬롯 안 칩(.preset-tags) | 묶인 전략 라벨 칩 N개 | 폐기. 라벨 + 부제만 |
| 슬롯 활성 표시 | accent border 2px + inset shadow 2px | accent border 1px + 미세 accent 배경 (8% alpha) |
| 캐릭터 토글 | 한 줄 카드 + 별도 "접기 bar" 박스 (펼침 상태) | 한 줄 row 자체가 카드 헤더로 흡수. row(▲) + 카드 본문 = 한 덩어리 |
| 토글 row 카피 | 텍스트(이름·메타) + 우측 운세 한국어 + caret | 운 이모지(좌) + 이름 강조 + 메타 희미 + caret 우 |

수정 파일: `preset-buttons.js` (구조 단순화) / `character-summary.js` (`characterToggleRowHtml` 단일 export로 통합) / `main.js` (import / homeTabHtml 분기 단순화) / `styles/main.css` (S36 블록 전체 교체).

검증: `node tests/run-node.js` → 291/291 PASS (사전 storage 4건 무관). 신규 FAIL 0.


배경: 사용자 지적 - "전략 선택하는 게 짜증남. 복잡한 전략은 접어두고 묶음을 1버튼으로. 메인에 버튼 3개. 사용자 정보도 아코디언 한 줄". 전략 10종 카드 노출 + 캐릭터 카드 항상 펼침이 메인 인지 부담 큰 문제.

사용자 결정 (자비스 권장안 일괄 채택): 슬롯 3개 고정 / 기본 균형·통계파·운세파 / ✏ 인라인 편집 / 부제 표시 / 캐릭터 한 줄 카피 = 이름·별자리·띠·일주·운 / 흉일 자동 펼침 / 첫 진입 펼침 학습.

### 2.67.1. 신규 / 변경

| 영역 | 변경 |
|---|---|
| `src/data/numbers.js` | 1.20 추가 - `PRESET_SLOT_COUNT=3` / `PRESET_LABEL_MAX=8` / `PRESET_SUBTITLE_MAX=20` / `DEFAULT_PRESETS` (균형·통계파·운세파 3종 freeze) |
| `src/data/storage.js` | `loadPresets` / `savePresets` / `loadCharCardCollapsed` / `saveCharCardCollapsed` 신규. `lotto_presets` / `lotto_char_card_collapsed` 키 |
| `src/render/preset-buttons.js` | 신규 - 3슬롯 카드 + 활성 비교 + 편집 진입 ✏ |
| `src/render/preset-editor.js` | 신규 - 편집 모달 (라벨/부제/카테고리별 체크리스트 / 기본값 복원) |
| `src/render/character-summary.js` | 신규 - 한 줄 카드(이름·별자리·띠·일주·운 이모지) + 펼침 토글 / 흉일 빨강 |
| `src/render/main.js` | import 추가 / `state.presets` / `state.charCardCollapsed` / `homeTabHtml` 구조 변경 (전략 picker 영역 → 프리셋 영역, 캐릭터 카드 collapsed 분기) / 클릭 핸들러 3종 (`preset-pick` / `preset-edit` / `char-card-toggle`) |
| `styles/main.css` | S36 블록 추가 - 프리셋 카드 / 편집 모달 / 한 줄 요약 / 토글 / 모바일 480↓ 압축. 매직 픽셀 0(토큰 베이스) |
| `docs/01_spec.md` | 5.1.5 (프리셋 시스템) / 5.1.6 (캐릭터 카드 아코디언) 신설. 5.1.3 한 줄 보강 |
| `docs/02_data.md` | 1.20 (프리셋 시스템) 신설 - 상수 / 기본값 / 저장 키 / Preset 스키마 / 활성 비교 룰 |

### 2.67.2. 흉일 강제 펼침 룰

`fortune === 'bad'`이면 `state.charCardCollapsed` 값 무시하고 펼침. 사용자 보호 카피 (방어 모드 권장 배너) 강제 노출. 사행성 도메인 책임. SSOT: `docs/01_spec.md` 5.1.6.2.

### 2.67.3. 보존 (다음 sprint 정리)

- `src/render/strategy-tabs.js`: 메인에서 호출 안 됨. dead code지만 호환 보존. 다음 sprint 폐기 검토.
- `src/render/strategy-picker.js`: `STRATEGY_LIST` / `strategyLabel` / `strategyShort` export는 편집 모달 / 추천 라벨 / saved-sets에서 계속 사용. picker UI(`strategyPickerHtml`)만 dead code.
- `main.js`의 `.strategy-tab[data-strategy-id]` 클릭 핸들러: forEach가 빈 NodeList라 무동작. 보존.

### 2.67.4. 사용자 동선 변화

| 사용자 | 이전 | 이후 |
|---|---|---|
| 라이트 (90%) | 메인 → 전략 10카드 중 1개 토글 → 추천. 인지 부담 큼 | 메인 → 프리셋 3카드 중 1탭 → 추천. **2탭 끝** |
| 헤비 (10%) | 메인에서 직접 전략 1~6개 토글 | 메인 ✏ → 모달에서 묶음 편집 → 저장 → 자기 묶음 1탭 |

### 2.67.5. 검증

- `node tests/run-node.js` → 291/291 PASS (사전 storage 4건 FAIL 무관). 신규 FAIL 0.
- 라벨 / 묶음 / 카드 토글은 브라우저 시각 검증 필요 (사용자 확인 후 폴리싱).

### 2.67.6. 잠재 리뷰 포인트

| 항목 | 비고 |
|---|---|
| 카테고리 "랜덤" 그룹 + 전략 "랜덤" 동일 단어 | S35 사용자 결정 옵션 A. 인지 부담 수용. |
| short '축' vs 라벨 '랜덤' 첫 글자 어긋남 | S35 후속. 사용자 검토 후 동기화 sprint. |
| `recommend.js` reasons "축복받은 자: ..." | S35 후속. 운영 텍스트라 별도 결정. |
| 통계 / 회차 / 휠링은 추첨 탭 안 아코디언 X | 기존 하단 탭 라우팅 그대로 (사용자 시안 외). |
| 슬롯 추가 / 삭제 불가 | 3개 고정. 사용자 명시 결정. 향후 5개 확장 검토 가능. |
| dead code (strategy-tabs.js 등) | 다음 sprint 정리 권장. |

### 2.67.7. 사용자 영향 (재진입 시)

- 기존 캐릭터의 `lastUsedStrategies`는 보존. 첫 진입 시 `DEFAULT_PRESETS` 자동 주입 + 메인 프리셋 3슬롯 노출.
- 프리셋 클릭 = `lastUsedStrategies` 즉시 갱신. 이전 다중 토글 학습은 슬롯 클릭으로 덮어씀.
- 캐릭터 카드 첫 진입 펼침. "접기" 버튼 1회 클릭하면 다음 진입에 접힘 학습.

## 2.66. Sprint 045 완료 - "축복" 라벨을 "랜덤"으로 변경 (S35, 2026-05-08)

사용자 지시: "라벨만 변경" (축복 → 랜덤). 이름만 변경, 그 외 일체 손대지 않음.

### 2.66.1. 변경

| 영역 | 이전 | 이후 |
|---|---|---|
| 전략 카드 라벨 (`STRATEGY_BLESSED`) | 축복 | 랜덤 |
| `docs/02_data.md` 1.5 표 UI 라벨 | 축복받은 자 | 랜덤 |
| `docs/02_data.md` 1.5.6 풀 표 | 축복받은 자 | 랜덤 |
| `docs/01_spec.md` 5.1.3 전략 10종 list | 축복받은 자 | 랜덤 |
| `README.md` 3.2 카테고리 표 | 축복받은 자 | 랜덤 |
| `README.md` 5 페치 없이 가능 list | 축복받은 자 / 짝꿍 번호 | 랜덤 (짝꿍 함께 정리 - S34 후속) |

손 안 댄 영역 (사용자 "라벨만" 명시):

- `STRATEGIES.short` ('축') - 라벨 첫 글자 패턴 어긋나지만 미변경.
- `STRATEGIES.desc` (정체성 카피) - Sprint 044에서 강화한 정체성 카피 그대로.
- 카테고리 라벨 ('랜덤' 그룹) - 사용자 결정 옵션 A (전략 라벨과 동일 단어 허용).
- `src/core/recommend.js` reasons 메시지 ("축복받은 자: ..." 운영 텍스트).
- 이력 문서 (PROGRESS / ARCHIVE) - 시점 기록 보존.
- 테스트 (`recommend.test.js` reasons 검증) - reasons 미변경이라 PASS 유지.

### 2.66.2. 인지 부담 (사용자 결정으로 수용)

- 카테고리 "랜덤" + 전략 "랜덤" 동일 단어 → 카드 hover에서 "랜덤 카테고리 > 랜덤 전략" 표시.
- 카드 short '축' 잔존 → 라벨 첫 글자 패턴(별자리=점, 사주=사) 어긋남.
- reasons "축복받은 자: ..." 잔존 → 카드 라벨 ≠ reasons 라벨 차이.

위 3건은 다음 세션에서 사용자가 짚어주면 동기화 작업 별도 sprint.

### 2.66.3. 검증

- `node tests/run-node.js` → 291/291 PASS (사전 storage 4건 FAIL 무관).
- 라벨 변경으로 인한 신규 FAIL 0.

## 2.65. Sprint 044 완료 - 짝꿍 페어 전략 폐기 + 랜덤 카테고리 카피 정체성 강화 (S34, 2026-05-08)

배경:

1. 사용자 지적 1 - "축복 / 직감 / 균형의 차이가 뭔지 모르겠어". 랜덤 카테고리 3종이 풀 1~45 전 범위 + 시드 의존 공통이라 차별성 미묘. desc 한 줄로 정체성 못 드러냄.
2. 사용자 지적 2 - "페어는 진짜 페어가 선택되어야 하는데 그냥 숫자가 랜덤하게 추천되네". 짝꿍 전략(pairTracker)의 페어 박스 시각(S31)과 추첨 룰(합집합 풀에서 개별 번호) 불일치. 페어 동행 보장 안 됨.
3. 사용자 결정 - "그냥 삭제할까? 페어가 의미 있어?" → 짝꿍 전략 폐기 + 랜덤 카테고리 카피 정체성 강화 결정.

### 2.65.1. 카피 정체성 강화 (랜덤 카테고리 3종)

`src/render/strategy-picker.js` STRATEGIES 배열의 desc만 변경 (label / short / category 그대로):

| 전략 | 이전 desc | 신규 desc |
|---|---|---|
| 축복 | 모든 번호에서 균등 추출, Luck이 시드 번호 가중치를 강화 | **캐릭터 정체성**: 키운 Luck만큼 시드 6번호에 보너스. 운세에 가장 민감 |
| 직감 | 회차마다 다른 분포 (같은 캐릭터는 같은 결과) | **회차 색깔**: 매주 분포가 통째로 바뀝니다. 같은 캐릭터도 회차마다 다른 추천 |
| 균형 | 번호 합 121~160 + 홀짝 3:3 필터를 통과한 조합만 | **통계 패턴**: 역대 1등 번호 합·홀짝이 모이는 구간에 맞춘 조합만 |

각 desc 앞에 정체성 라벨(굵게) → 사용자 카드 hover / aria-label에서 차별 즉답.

### 2.65.2. 짝꿍 페어(pairTracker) 전략 폐기

폐기 사유: (1) 페어 동행 보장 X (시각/추첨 불일치). (2) 페어 fix(시드 셔플 + 3쌍) + 단독 활성 차단 룰 = UX 부담 vs 사용자 가치 ↓. (3) 통계 4종(많이/적게/최신/보너스)으로 충분히 직관적.

| 영역 | 변경 |
|---|---|
| 코드 | `STRATEGY_PAIR_TRACKER` 상수 / `objectivePairWeights` / `computePairsForPairTracker` / `keyNumberFromSeed` 제거. recommend.js 분기 제거. |
| 카테고리 | `OBJECTIVE_STRATEGIES` 6 → 5종. `STRATEGY_ORDER` 통계 5 → 4종. `STRATEGY_CATEGORIES` 항목 제거. |
| UI | strategy-picker STRATEGIES에서 짝꿍 entry 제거. strategy-tabs.js `pairs` 옵션 / 페어 박스 분기 폐기. main.js `pairs` 변수 / 호출부 인자 제거. |
| 색 | `STRATEGY_TAG_COLORS` pairTracker 항목 제거. |
| css | `.strategy-pool-pairs` / `.strategy-pool-pair` / `.strategy-pool-pair-count` 폐기. |
| 마이그레이션 | render/main.js `DEPRECATED_STRATEGY_IDS = new Set(['mbti', 'pairTracker'])` - lastUsedStrategy(s) 잔존 ID 자동 필터. S8 mbti 패턴 재사용. |
| 보존 | 동시출현 매트릭스(cooccur) - 통계 탭 학습 자산. stats.js / storage 그대로. |

### 2.65.3. SSOT

- `docs/01_spec.md` 5.1.3 (전략 11종 → 10종) / 5.4 (시드 의존 6 → 5종) / 5.4.1 (학설 풀 안 추첨 - 짝꿍 항목 제거) 갱신.
- `docs/02_data.md` 1.5 표 (pairTracker 행 삭제) / 1.5.1 (시드 의존 6 → 5종) / 1.5.2 (정렬 순서) / 1.5.6.4 (S33 풀 외 차단 - 짝꿍 항목 제거) / 2.7 (색 표 - pairTracker 제거) 갱신.

### 2.65.4. 검증

- `tests/suites/recommend.test.js` pairTracker 정상 동작 테스트 폐기. 6전략 multi 테스트 / 정규화 테스트의 `STRATEGY_PAIR_TRACKER` → `STRATEGY_BALANCER` 대체. 객관 전략 6 → 5종.
- `node tests/run-node.js` → 291/291 PASS (사전 storage 4건 FAIL 무관).

### 2.65.5. 사용자 영향

- 전략 그리드 카드 11 → 10. 통계 줄 5 → 4 (짝꿍 사라짐).
- 기존 캐릭터의 `lastUsedStrategy` / `lastUsedStrategies`에 짝꿍 잔존 시 자동 필터 → 활성 전략 0 케이스 시 축복으로 fallback.
- 동시출현 매트릭스 데이터는 통계 탭에서 그대로 노출 (학습 자산 유지).
- 랜덤 카테고리 3종 카드의 hover / 접근성 라벨에서 정체성 한 줄 즉답 가능.

## 2.64. Sprint 043 완료 - 풀 외 추첨 차단 fix (S33, 2026-05-08)

배경: Sprint 042 검증 중 발견. 시드 의존 전략(별자리 / 4원소 / 사주 / 짝꿍)에서 학설 풀 외 번호가 매우 낮은 확률로 추첨되던 잠재 버그. S18(풀 정의 = 풀 밖 0)의 의도는 "절대 차단"이었으나 `applyLuck`과 `weightedSample`의 `WEIGHT_MIN_FLOOR` floor가 풀 외 0을 0.0001로 양수화. S30.2가 풀 *표시*만 정정 후 실제 추첨 정정이 후순위로 남아있던 사안.

### 2.64.1. fix

- `src/core/luck.js` `applyLuck`: `Math.max(w, WEIGHT_MIN_FLOOR)` → `w > 0 ? Math.max(w, WEIGHT_MIN_FLOOR) : 0`. 원본 0(풀 외)은 0 유지.
- `src/core/recommend.js` `weightedSample`: 동일 패턴 적용. `total <= 0` 가드는 그대로 → 모든 weight=0 케이스도 안전 break.

### 2.64.2. 데이터 부재 fallback

floor 제거로 풀 자체가 비어있는 케이스(zodiac 미지정 / 빈 cooccur)에서 추첨 0개가 될 수 있어 안전망 추가:

- `src/core/recommend.js` `zodiacWeights`: 빈 lucky → `uniformWeights()` (균등 fallback).
- `src/core/recommend.js` `objectivePairWeights`: 빈 cooccur → `Array(45).fill(1)` (균등 fallback).
- `zodiacElementWeights` / `fiveElementsWeights`는 기존부터 fallback 보유 (변경 0).

### 2.64.3. SSOT

- `docs/01_spec.md` 5.4.1 (풀 외 번호 차단 절) 신설. SSOT: 학설 풀 안 번호로만 추첨.
- `docs/02_data.md` 1.5.6.4 (풀 외 = 절대 안 뽑힘) 갱신 - S18 의도 + S33 실제 차단 + 데이터 부재 fallback 명시.

### 2.64.4. 검증

- `tests/suites/saved-sets.test.js` S33 회귀 2건 신규 - libra / aries 추첨 결과가 학설 풀 부분집합. 모두 PASS.
- 기존 recommend.test.js `pairTracker 빈 cooccur` / `astrologer zodiac 미지정` 2건 fallback 적용으로 PASS 유지.
- `node tests/run-node.js` → 292/292 PASS (사전 storage 4건 FAIL 무관).

### 2.64.5. 사용자 영향

- 캐릭터 카드의 "별자리 행운 번호" / "오행 행운 번호" 등 풀 표시 = 실제 추첨 결과 100% 일치 (이전엔 불일치 가능).
- 사용자 직관 ("별자리 8개 행운 번호 안에서만 추첨") 보장.

## 2.63. Sprint 042 완료 - 누적 추천 dedupe 강화 + 풀 한계 안내 (S32 후속, 2026-05-07)

사용자 지시:
1. "별자리 전략으로 20개 생성 시 추천 번호 중복 가능성?"에 이은 보강 요구.
2. "최대 20세트 중복 없게."
3. "20개 미만만 가능하면 딱 그만큼만 생성, 더는 생성되지 않게."
4. "안내 메시지 노출."

배경: 별자리(풀 8~10) / 사주(풀 9) / 원소(풀 13~14) 등 풀 좁은 전략에서 시드 변형으로 batch 추첨 시 같은 6 조합이 반복되어 dedupe로 일부만 추가되던 문제. 사용자가 "왜 5개 요청했는데 3개만?" 의심 발생.

### 2.63.1. dedupe 재시도 룰

- `src/data/numbers.js`: `SAVED_SETS_RETRY_MAX=50` / `SAVED_SETS_TOAST_NORMAL_MS=1500` / `SAVED_SETS_TOAST_PARTIAL_MS=2500` 신규.
- `src/render/main.js` `addSavedSetsBatch`: 단일 batch 호출 → 재시도 루프. 누적 시도 < RETRY_MAX 동안 시드 offset을 증가시키며 추가 추첨. 누적 added 가 batchN 도달 시 종료. 재시도 한계 도달 + added < batchN + cap 미발생 = 풀 한계(`exhausted`).

### 2.63.2. 결과 안내 4 케이스

| 케이스 | 트리거 | 노출 | 카피 |
|---|---|---|---|
| A. 정상 | added=N | 토스트 1.5s | 추천 N세트를 추가했습니다 |
| B. 부분 중복 | added<N, !exhausted, !cap | 토스트 2.5s | 추천 M세트 추가 · 같은 조합 D개는 자동 제외 |
| C. 풀 한계 | exhausted=true | 누적 리스트 상단 배너 (지속) | 이 전략 조합으로 만들 수 있는 모든 추천을 가져왔습니다 ... |
| D. cap 도달 | capSkip>0 또는 list=20 | 액션바 hint + 버튼 비활성 | 최대 20세트에 도달했습니다 ... |

- `state.poolExhaustedRecipeId` 추가. 현재 strategyIds 정규화 키와 일치할 때만 배너 노출. strategyIds 변경 시 자동 해제.
- `src/render/saved-sets-section.js`: `savedSetsSectionHtml(list, labelStart, poolExhausted)` / `savedSetsAddBarHtml(currentCount, cap, poolExhausted)` 신규 인자. 토스트 슬롯 `[data-role="saved-toast"]` 액션바 grid 끝 행에 추가.
- `styles/main.css`: `.saved-sets-banner` (accent border-left 강조 / 노란 정보 톤) + `.saved-add-toast` (stats-toast 패턴 차용) + `.saved-add-hint.is-exhausted` 신규.

### 2.63.3. SSOT

- `docs/01_spec.md` 5.2.5.4 (Cap + 중복 차단 + 풀 한계 + 결과 안내 4 케이스) 갱신.
- `docs/02_data.md` 1.5.8.2 (상수 표) / 1.5.8.5 (재시도 룰) / 1.5.8.6 (안내 카피 SSOT) 신설 / 1.5.8.7 (적용 위치 갱신).

### 2.63.4. 검증

- `tests/suites/saved-sets.test.js` S32 회귀 4건 신규 - libra(풀 8) / gemini(풀 10) 20세트 unique 보장 확인. 모두 PASS.
- `node tests/run-node.js` → 신규 추가분 모두 PASS. 기존 storage 4건 FAIL은 본 작업 무관 (Node 환경 localStorage 부재 - 사전 존재).

### 2.63.5. 별도 발견 사항 - applyLuck 풀 외 추첨 (별도 sprint 결정 사안)

- `src/core/recommend.js:381` `applyLuck`이 시드 의존 전략(astrologer / zodiacElement / fiveElements / pairTracker)에서 풀 외 weight 0을 양수로 만들어 풀 외 번호도 실제 추첨에서 나올 수 있음.
- S30.2에서 풀 표시(`mainWeights` 기준)는 정정됐으나 실제 추첨(`finalWeights`)은 미수정.
- 사용자 의도 = "별자리 풀 한정 추첨"이면 fix 필요. Luck 효과 = 풀 확장이 의도면 spec 명시 필요.
- 본 sprint 범위 밖. 사용자 결정 후 별도 sprint.

## 2.62. Sprint 041 완료 - 추천 번호공 간격 80% 압축 (S32) (2026-05-04)

사용자 지시: "추천 리스트 추천 숫자 간격을 지금의 80%로 줄여줘".

변경:
- `styles/main.css` `.saved-set-balls`: `gap: var(--space-1)` → `gap: calc(var(--space-1) * 0.8)` (4px → 3.2px). 데스크톱 + 모바일 480px↓ 미디어 쿼리 동일 적용.
- 매직 픽셀 추가 0 (토큰 베이스 비율 표현).
- SW v21 → v22.

검증: `node tests/run-node.js` → 286/286 PASS.

## 2.61. Sprint 040 완료 - 짝꿍 페어 단위 표시 + 라벨 축약 + 좌측 padding (S31) (2026-05-04)

사용자 지시 (3건):
1. "짝꿍 번호는 짝꿍끼리 묶어서 표시"
2. "추천 리스트 배경 박스와 '추천1' 사이 왼쪽 마진 지금의 1.5배로"
3. "전략 라벨 축약: 별자리행운→별자리, 원소행운→4원소, 사주행운→사주, 최근트렌드→최신, 많이나온수→많이, 안나온수→적게, 짝꿍번호→페어, 보너스볼→보너스, 균형조합→균형, 축복받은자→축복"

### 2.61.1. 짝꿍 페어 단위 표시

짝꿍 풀을 단순 번호 list에서 *페어 박스 list*로 변경. 각 페어 = 두 번호공 + 횟수 라벨.

- `src/core/recommend.js`: `computePairsForPairTracker(ctx, poolSize)` 신규 export. `objectivePairWeights`와 동일 알고리즘(count 내림차순 + 합집합 size 도달까지)으로 페어 객체 list `{a, b, count}[]` 반환.
- `src/render/main.js`: `getRecAndFortune` 반환에 `pairs` 추가. 포커스 = `pairTracker`일 때만 계산.
- `src/render/strategy-tabs.js`: `pairs` 인자 받음. pairs 있으면 `.strategy-pool-pairs` 페어 박스 단위 렌더 (pool 대체). 라벨 = "짝꿍 페어 · N쌍".
- `styles/main.css`: `.strategy-pool-pairs` / `.strategy-pool-pair` / `.strategy-pool-pair-count` 신규 (모두 토큰 사용. surface-soft 배경 + border + radius-md).

### 2.61.2. 추천 리스트 좌측 padding 1.5배

- `styles/main.css` `.saved-sets-section`: `padding-left: calc(var(--space-3) * 1.5)` (12px → 18px). 위/오/아래는 그대로 `--space-3`(12px). "추천N" 라벨이 박스 왼쪽에 너무 붙던 문제 해소.

### 2.61.3. 전략 라벨 축약

`src/render/strategy-picker.js` STRATEGIES 배열 label 필드만 변경. short / desc / category는 그대로(출처 태그 / 도움말 / 카테고리 그룹 영향 0).

| 이전 | 변경 |
|---|---|
| 축복받은 자 | 축복 |
| 최근 트렌드 | 최신 |
| 많이 나온 수 | 많이 |
| 짝꿍 번호 | 페어 |
| 보너스볼 | 보너스 |
| 안 나온 수 | 적게 |
| 별자리 행운 | 별자리 |
| 원소 행운 | 4원소 |
| 사주 행운 | 사주 |
| 균형 조합 | 균형 |
| 직감 | (그대로) |

표시 예 (1222회 시점 cooccur 시뮬):
```
짝꿍 페어 · 9쌍
[17][27] 60회   [1][38] 55회   [12][34] 52회
[9][18]  50회   [5][25] 48회   [3][33]  47회
[14][41] 45회   [7][22] 44회   [11][19] 43회
```

cap STATS_POOL_SIZE = 18 합집합 도달까지 페어 수집. 9쌍 × 2 = 18.

검증: `node tests/run-node.js` → 286/286 PASS.

## 2.60. Sprint 039 완료 - 포커스 분리 + 풀 신뢰 회복 + 사주 일진 가시화 (S30.0~.6) (2026-05-04)

사용자 지시:
1. "각 전략의 설명부분이 모호하게 처리되어 있어. 단일 전략 선택일때는 상관없었는데, 지금은 복수 전략 선택이다 보니 헷갈리는 상태."
2. "전부 표시하는 걸 하고 싶지 않다고. 전략을 버튼으로 표시한 의도 자체가 컴팩트."
3. "선택/해제 이외에 포커스 개념을 추가해볼까?"
4. "마지막 활성화 안도 포커스 방식을 같이 쓰면 좋을 듯".

### 2.60.1. 모델 - 토글 ≠ 포커스 분리

| 개념 | 의미 | 데이터 |
|---|---|---|
| 토글 (선택/해제) | 그 전략을 추첨에 사용할지 | `lastUsedStrategies` 배열 |
| 포커스 | desc 표시 대상 1개 | `lastUsedStrategies` 마지막 원소 (자동) |

**별도 state 추가 0건**. 활성 list가 push 순서를 자연 보존(`[...list, newId]`)하므로 마지막 원소 = 가장 최근 활성 = 포커스.

### 2.60.2. 동작 룰

| 상태 | 클릭 | 결과 |
|---|---|---|
| 비활성 토글 | ON | push로 끝에 추가 → 자동 포커스 |
| 활성 + 포커스 토글 (= 마지막 원소) | OFF | filter → 새 마지막 = 직전 활성으로 자동 포커스 |
| 활성 + 포커스 아닌 토글 | OFF | filter, 마지막 원소(포커스) 그대로 |
| 마지막 1개 활성 토글 | OFF 차단 | 보존 룰 (`list.length === 1 return`) |

활성 0개 케이스 없음. desc 영역은 *항상 활성 전략의 의미*와 정합.

### 2.60.3. 변경 파일

- `src/render/strategy-tabs.js`: `firstActive` → `focusedId` (= activeIds 마지막 원소). 각 토글에 `is-focused` 클래스. desc / mappingNote 모두 포커스 기준.
- `styles/main.css`: `.strategy-tab.is-focused` 신규 - outline 2px `--color-accent` + offset 2px ring. 활성 토글 중 1개만 ring.
- `docs/01_spec.md` 5.1.3.1: S30 포커스 분리 정책 명문화.
- `service-worker.js`: CACHE_VERSION v16 → v17.

### 2.60.4. 검증

`node tests/run-node.js` → **286/286 PASS** (storage 4건 환경 5.8 미해결).

### 2.60.5.6. S30.6 - 사주 행운 일진 보너스 가시화 (B안 / 사용자 명시)

사용자 지시: "사주 행운은 왜 안맞지?" + "B안으로 해, 근데 왜 내 정보의 사주와 다른거야?"

원인 정리: S16 일진 보너스 사양 - 풀 = 출생 오행 ∪ 추첨일 오행(보너스 시). 캐릭터 카드는 출생 오행만 표시 → 보너스 발생 회차에 풀이 카드보다 큼. 10천간 중 6/10 케이스가 매주 추첨일 오행에 따라 불일치.

해결 (B안): 캐릭터 카드 사주 패널에 일진 보너스 정보 + 추첨일 풀 별도 줄로 추가. 카드 = 추천 풀 100% 일치.

변경:
- `src/render/main.js`: `getRecAndFortune` 반환에 `drawDate` 추가. `homeTabHtml` / `characterCardHtml` 호출 chain에 전달.
- `src/render/character-card.js`:
  - `characterCardHtml(character, fortune, drawOrDrwNo, drawDate)` signature 확장.
  - `luckyNumbersHtml(character, drawDate)` 인자 추가.
  - `collectLuckySources(character, drawDate)` saju 항목에 `bonus` 필드 추가 (`{element, elementLabel, relation, relationLabel, numbers}`).
  - 사주 패널 렌더 시 bonus 있으면 별도 블록 렌더 (제목 + 메타 + 추가 풀 번호공).
  - `SAJU_RELATION_KO` 한국어 라벨 (비견/식상/인성/재성/관성).
- `styles/main.css`: `.lucky-bonus` / `.lucky-bonus-title` / `.lucky-bonus-meta` / `.lucky-balls-bonus` 신규 (모두 토큰 사용). 기존 `.lucky-num`의 `#fff` / `12px` → `var(--color-on-accent)` / `var(--font-size-sm)` 토큰화.

표시 예 (출생 火 / 추첨일 金 / 재성 케이스):
```
사주 행운 [화 오행] [주간 변경]
  [2][7][12][17][22][27][32][37][42]    ← 출생 火 9개

  이번 주 일진 보너스 · 추첨일 금 오행 · 재성 (출생이 추첨일을 극함)
  [4][9][14][19][24][29][34][39][44]    ← 추첨일 金 9개
```

추천 풀 (fiveElements 활성 시) = 위 18개 합집합. 카드 = 풀 100% 일치.

### 2.60.5.5. S30.5 - **인덱스 버그 fix** + 11전략 전수 검증 (사용자 명시)

사용자 통찰: "전략 전체가 신뢰되지 않아. ... 별자리, 원소 등 사용 풀과 유저 정보의 숫자가 전혀 일치하지 않아. 통계도 완전 엉망이야. 모든 전략에 대해 전수 조사하고 검증해."

**원인**: `computePoolForStrategies`가 `mainWeights[i]`로 1-based 접근 (i=1~45). 그러나 모든 weight 함수(`statsToWeights` / `gapWeights` / `poolFromIndices` / `objectivePairWeights` / `zodiacWeights` 등)는 `arr[number - 1]` (0-based)로 저장. **인덱스 -1 shift**.

영향: 풀 표시되는 8전략(랜덤 3종 제외) 모두 풀이 -1 shift돼 캐릭터 카드 행운 번호와 정확히 1씩 어긋남.

검증 (cancer 별자리 / water 4원소 / wood 오행 케이스):
| 전략 | 캐릭터 카드 | fix 전 풀 (-1 shift) | fix 후 풀 |
|---|---|---|---|
| astrologer (cancer) | [2,4,12,14,22,24,32,34,42,44] | [1,3,11,13,21,23,31,33,41,43] | [2,4,12,14,22,24,32,34,42,44] ✓ |
| zodiacElement (water) | [2,3,9,12,13,19,22,23,29,32,33,39,42,43] | [1,2,8,11,12,18,21,22,28,31,32,38,41,42] | [2,3,9,12,13,19,22,23,29,32,33,39,42,43] ✓ |
| fiveElements (wood) | [3,8,13,18,23,28,33,38,43] | [2,7,12,17,22,27,32,37,42] | [3,8,13,18,23,28,33,38,43] ✓ |

추첨 결과 자체(`weightedSample`)는 0-based weight + `n = i + 1` 변환으로 **정확**했음. 풀 표시(UI)만 잘못된 경로.

#### 2.60.5.5.1. 11전략 전수 검증

| ID | 카테고리 | 의존성 | 풀 정의 | 캐릭터 카드 일치 | 데이터 의존 |
|---|---|---|---|---|---|
| `blessed` | 랜덤 | 시드+Luck | uniformWeights = 1~45 (전 풀, 미표시) | N/A | 없음 |
| `intuitive` | 랜덤 | 시드 | intuitiveWeights = 0.5~2.0 (전 풀, 미표시) | N/A | 없음 |
| `balancer` | 랜덤 | 객관 | uniformWeights + 합/홀짝 필터 (미표시) | N/A | 없음 |
| `statistician` | 통계 | 객관 (numberStats) | totalCount 상위 18 | N/A | 페치 후 정확 |
| `secondStar` | 통계 | 객관 (bonusStats) | 보너스볼 빈도 상위 18 | N/A | 페치 후 정확 |
| `regressionist` | 통계 | 객관 (numberStats) | currentGap 상위 18 | N/A | 페치 후 정확 |
| `trendFollower` | 통계 | 객관 (numberStats) | recent30 상위 18 | N/A | 페치 후 정확 |
| `pairTracker` | 통계 | 객관 (cooccur, S30.4) | 동시출현 상위 페어 합집합 ≤18 | N/A | 페치 후 정확 |
| `astrologer` | 운세 | 시드 (zodiac) | `ZODIAC_LUCKY[zodiac]` | **일치 (S30.5 fix 후)** | 없음 |
| `zodiacElement` | 운세 | 시드 (zodiac→4원소) | `ZODIAC_ELEMENT_LUCKY[element]` | **일치 (S30.5 fix 후)** | 없음 |
| `fiveElements` | 운세 | 시드 (dayPillar→오행, drawDate) | `FIVE_ELEMENTS_LUCKY[birth]` ∪ `[draw]`(보너스 시) | **출생 풀 일치 / 일진 보너스 시 합집합으로 확장** | drawDate |

#### 2.60.5.5.2. 잔여 우려

- `fiveElements` 일진 보너스 케이스: 풀 = 출생 ∪ 추첨일. 캐릭터 카드는 출생만 표시 → 보너스 발생 회차에 풀이 더 큼. 사용자에게 *왜 풀이 더 큰지* 노출 필요 시 별도 sprint에서 캐릭터 카드 / 풀 라벨에 일진 보너스 명시.
- 통계 4종은 `state.draws`가 비어있으면 numberStats / cooccur 모두 빈 배열 → 풀이 의미 없음. 페치 후엔 정확.

### 2.60.5.4. S30.4 - 짝꿍 번호 객관 승격 (사용자 명시 - B안 채택)

사용자 통찰: "짜증나, 그냥 캐릭터 시드로 랜덤값 뽑아서 그 번호랑 연관된 번호를 추천한다는거잖아? 첫 번호가 잘못 뽑히면 그냥 다 엉망이 되는 구조네" + "짝꿍 단독이라면 B안을 생각하지 않을까?"

(중간 생략 - 본 절 짝꿍 객관 승격 / S30.3 키번호 노출 / S30.2 풀 확장 버그 수정 / S30.1 풀도 포커스 단일 + 랜덤 미표시 상세는 PROGRESS.md 이전 시점 기록 참조. **S34 (Sprint 044)에서 짝꿍 전략 자체가 폐기**되어 본 절의 짝꿍 관련 내용은 후속 sprint에서 무효화됨.)

## 2.59. Sprint 038 완료 - 채팅 UX 패턴 + 액션바 통합 + 휴지통 아이콘 (S29) (2026-05-04)

사용자 지시 (3차):
1. "로또를 추천하는 UX가 진짜 별로야. 회차 / 추천 번호 ↑ / 생성 버튼 / 생성 전략 / 행운 쌓기 / 유저명 / 유저 정보".
2. "전체 비우기 버튼도 + 1, + 5 버튼과 나란히 배치".
3. "삭제 버튼 외형 타원은 일부러 그렇게한거야?? 일부러 보기 싫게 하려고?? 휴지통 아이콘으로 바꿔."

추가 지적: "버튼들이랑 전체적인 스타일을 니 멋대로 하는거야? 디자인 토큰 사용 안해????"

### 2.59.1. S28 폐기 사유

S28(B안)은 "전략 → + 버튼 → 추천 리스트" 순서로 배치했지만 사용자 의도는 채팅 UX 패턴(결과는 위에 누적, 도구는 아래)이었다. 자비스가 권장안을 단정하면서 사용자 의도 1차 진단(2장 4안)에 없던 정답을 놓침. **권장안 결정 시 사용자 재확인 필수** 교훈.

### 2.59.2. S29 - 채팅 UX 패턴

새 동선 (위→아래):
```
1. 카운트다운 (회차)
2. 추천 리스트 (결과 - 위에 누적)
3. + 1세트 / + 5세트 / 전체 비우기 (실행 - 한 줄)
4. 전략 탭 (조립 - 한 번 정하고 잊는다)
5. 행운 쌓기
6. 캐릭터 슬롯 (유저명)
7. 캐릭터 카드 (유저 정보)
```

핵심: 결과 ↔ 실행 인접 (시선 0 왕복). 모바일 엄지 = 화면 하단 모든 조작.

### 2.59.3. 액션바 통합

"전체 비우기"를 추천 리스트 헤더에서 + 버튼 액션바로 이동. 한 줄 = `[+ 1세트] [+ 5세트] [🗑 전체 비우기]`. list 비어있으면 "전체 비우기" disable. 헤더는 타이틀("추천 리스트 (N)")만.

### 2.59.4. 휴지통 아이콘 + 토큰 사용 정직화 + 모바일 폭 + 사용 풀 표시

본 sprint는 S29.1~S29.4 보강 다수 포함. 핵심:
- 휴지통 아이콘으로 × 텍스트 대체 (Lucide-style SVG, currentColor 상속)
- `--radius-1` / `--radius-2` 깨진 토큰 정정 + 매직 픽셀 → 토큰 일괄 치환 (S29.4)
- 모바일 480/360px↓ grid 1열 폴드 + 좌우 padding 축소 (S29.3)
- 사용 번호 풀 투명화 (S29.2): `computePoolForStrategies` 신규, 활성 전략 풀 합집합 → 번호공 표시

### 2.59.5. 검증

`node tests/run-node.js` → **286/286 PASS**.

## 2.58. Sprint 037 완료 - 추천 리스트 위치 정정 (S28) (2026-05-04)

사용자 지시: "로또를 추천하는 UX가 진짜 별로야. + 1세트, + 5세트 버튼이 어디에 들어가는게 맞을까? → 권장안(B안)으로 처리".

### 2.58.1. 문제 진단 (S27 잔여)

S27 동선이 "결과 위, 실행 아래"로 시선 ↓→↑ 역행. 빈 추천 리스트가 화면 상단 점유 → 노이즈.

### 2.58.2. 해결 - B안 (전략 묶음 ↑ / 추천 리스트 ↓)

새 동선: 카운트다운 / **전략 + + 버튼** / **추천 리스트** / 행운 / 캐릭터.

S29(Sprint 038)에서 채팅 UX 패턴으로 다시 재정정됨. 본 sprint는 단명 (1일).

### 2.58.3. 검증

`node tests/run-node.js` → 286/286 PASS.

## 2.57. Sprint 036 완료 - 메인 카드 폐기 + 추천 리스트 단일 영역 (S27) (2026-05-03)

사용자 지시: "추천1과 같은 포맷으로 추천2, 추천3이 추천1 아래로 추가됨. + N세트 버튼은 전략 쪽에 배치되어야. 전략 위쪽에 조합식 만든 후 추천을 누르면 위쪽 추천1, 추천2,...에 등록 → A안 진행".

### 2.57.1. 모델 (이전 S26 vs S27)

| 항목 | S26 | S27 |
|---|---|---|
| 메인 카드(미리보기) | 추천1로 표시 | **폐기** |
| 5세트 컴팩트 | 옵션 ON 시 추천2~5 표시 | 추첨 탭 노출 폐기 (옵션은 storage에만 잔존) |
| 누적 리스트 라벨 시작 | 추천2 (5세트 ON: 추천6) | **추천1** |
| + 버튼 위치 | 메인 카드 hero 영역 안 | **전략 영역 직하** |
| 트리거 | 미리보기 → 저장 (2단계) | 토글 + 클릭 (1단계 즉시 등록) |

### 2.57.2. 동작

2.1. 사용자가 strategy 토글 → 조립식 정의 (시각 피드백 = 토글 상태).
2.2. **"+ 1세트"** 또는 **"+ 5세트"** 클릭 → 즉시 추천1로 누적 push.
2.3. strategy 변경 후 또 클릭 → 추천2, 추천3 ... 누적.
2.4. × 삭제 / 전체 비우기 동일.
2.5. 결정론: 같은 토글 + 같은 시점 = 같은 결과 (미리보기 없어도 strategy 1:1 매핑).

### 2.57.3. 빈 상태 처리

list 비어있으면 섹션이 사라져 추첨 탭이 휑해짐 → **빈 상태 안내** 표시: "아래 전략을 골라 조립식을 만든 뒤 + 1세트 또는 + 5세트로 추천을 추가하세요." 점선 박스로 시각 약하게.

### 2.57.4. 시각 통일

누적 번호공 크기를 메인 카드와 동일하게(44x44) 키움. 모바일 480px↓ 36x36, 360px↓ 32x32. 라벨 / 출처 태그 / × 버튼 크기 동일 비율.

### 2.57.5. 변경 파일

- `src/render/main.js`: `renderHome` 재구성 - 메인 카드 + 5세트 컴팩트 호출 폐기. + 버튼을 strategy-tabs 직하로 이동.
- `src/render/saved-sets-section.js`: `labelStart` 기본값 1로. 빈 상태 안내 추가. 섹션 헤더 "추천 리스트".
- `styles/main.css`: `.saved-set-row .num` 44x44 / 출처 태그 12x12 / 빈 상태 점선 박스 / + 버튼 바 가운데 정렬.
- `docs/01_spec.md` 5.2.5: 모델 정정 + UI 다이어그램 + 5세트 토글 정리 명시.
- `service-worker.js`: CACHE_VERSION v13 → v14.

### 2.57.6. 검증

`node tests/run-node.js` → 290/290 PASS (saved-sets 단위 테스트는 라벨 인덱스만 검사하지 않으므로 영향 없음).

### 2.57.7. 트레이드오프

- **얻음**: 모델 단순 / 라벨 충돌 0 / 미리보기 단계 폐기로 클릭 동선 짧음 / 시각 노이즈 0.
- **잃음**: 등록 전 결과 확인 단계 없음. 미리보기 → 저장 사이의 "고민" 시간 없음. 단 결정론이라 같은 strategy = 같은 결과로 매번 동일 → 큰 손실 없음. 마음에 안 들면 등록 후 × 삭제로 동선 짧음.
- **5세트 토글**: 추첨 탭 노출 폐기. 옵션은 storage에만 잔존. 별도 sprint에서 옵션 자체 폐기 검토.

## 2.56. Sprint 035 완료 - 누적 추천 세트 (S26) (2026-05-03)

사용자 지시: "추천을 여러개 받고 싶어 → 전략은 세트 1개를 완성시키기 위한 조립식. 같은 조립식으로 세트 5개를 만들 수도 있고, 다른 조립식으로 또 추가. 추천1, 추천2, 추천3 형태로 세로 누적. 초기화 / 개별 삭제 가능 → 진행 (권장 묶음)".

### 2.56.1. 모델

조립식 = strategy 조합 + 캐릭터 시드 + 회차. 메인 카드 = 미리보기. 사용자가 "+ 1세트 / + 5세트" 버튼으로 누적 list에 push. 다른 조립식으로 또 추가 가능. 회차 전환 시 자동 비움.

### 2.56.2. 변경 파일

- `src/data/numbers.js`: `SAVED_SETS_CAP=20` / `SAVED_SETS_BATCH_SMALL=1` / `SAVED_SETS_BATCH_LARGE=5` / `SAVED_SETS_SALT_BASE=0x5A1ED` 상수
- `src/core/saved-sets.js` (신규): `ensureSavedSetsForRound` / `addSavedSets` / `removeSavedSetAt` / `clearSavedSets` / `recipeIdFor` / `hasSameNumbers`
- `src/render/saved-sets-section.js` (신규): 섹션 + 추가 버튼 바 HTML
- `src/render/main.js`: `addSavedSetsBatch` 헬퍼 + 핸들러 + `renderHome` ensure 호출
- `styles/main.css`: `.saved-add-bar` / `.saved-sets-section` / `.saved-set-row` 스타일
- `tests/suites/saved-sets.test.js` (신규): 14건
- `tests/runner.js`: saved-sets suite 등록
- `docs/01_spec.md` 5.2.5 신규
- `docs/02_data.md` 1.5.8 신규
- `service-worker.js`: CACHE_VERSION v11 → v12

### 2.56.3. 동작

3.1. 사용자가 strategy 토글 → 메인 카드 미리보기 갱신.
3.2. **"+ 1세트"** 또는 **"+ 5세트"** 클릭 → 시드 변형으로 N세트 list push (객관 포함이면 drwNo 변형, 그 외는 seed 변형). 같은 numbers는 자동 skip.
3.3. strategy 조합 변경 → 미리보기 갱신. 추가 시 새 조립식 N세트 누적.
3.4. 추천N 옆 × → 인덱스 1개 삭제. 라벨 자동 재번호.
3.5. "전체 비우기" → confirm 후 list = [].
3.6. drwNo 변경 감지 시 list 자동 비움 (`ensureSavedSetsForRound`).

### 2.56.4. cap + 사행성 톤

- `SAVED_SETS_CAP = 20`. 도달 시 두 버튼 모두 비활성. "+ 5세트"는 잔여 < 5면 비활성.
- 섹션 disclaimer: "비교 / 보관용. 추첨 결과 보장 없음. 회차 전환 시 자동 비워집니다."
- "전체 비우기" 모달: 명확한 삭제 카운트 표기.

### 2.56.5. 검증

`node tests/run-node.js` → **290/290 PASS** (276 → 290, saved-sets 14건 추가).

### 2.56.6. 5세트 토글과 직교

기존 `options.fiveSets` 토글 유지. ON이어도 누적 모델 동작에 영향 없음. 메인 카드 + 컴팩트 4 + 누적 list 모두 표시 가능. 시각 복잡도 ↑이라 5세트 OFF + 누적 사용 권장.

## 2.55. Sprint 034 완료 - 다중 전략 C+E안 (풀 직접 추출 + 정규화) (S25) (2026-05-03)

사용자 지시: "운세 3개를 선택하면 주로 앞자리만 나오는데, 이 문제를 근본적으로 수정. 어떤 번호가 앞자리에 올지도 터치 순서에 따라 달라지지 않을까? 가장 좋은 안 제시 → 진행 (C+E안)".

### 2.55.1. 문제 - S21 잔여 + 신규

S21에서 객관 시드 분산은 했지만 `recommendMulti`가 **각 sub.numbers(정렬된 6개)의 앞쪽 N개**만 채택 → 풀 평균 수렴 안 됨. 운세 3개 = 평균 6~9 (작은 번호 편향).

추가로: 사용자 클릭 순서가 strategyIds 배열 순서가 되어 같은 strategy 조합이 다른 결과 / 다른 source 매핑 → implicit dependency.

### 2.55.2. 해결 - C안 (풀 직접 추출) + E안 (정규화)

#### 2.55.2.1. C안

`computeStrategyContext(ctx)` helper 분리: weight + reasons + 시드 계산만 담당. recommend / recommendMulti 양쪽 공유.

`recommendMulti`:
```js
const sc = computeStrategyContext({ ...rest, strategyId: sid });
const excludeSet = new Set(collected);
const picked = weightedSample(sc.finalWeights, targetCount, sc.samplingSeed, excludeSet);
```

→ 각 strategy의 풀에서 targetCount개를 **풀 안 균등으로 직접 추출**. "잘라쓰기" 휴리스틱 폐기.

#### 2.55.2.2. E안

`STRATEGY_ORDER` 상수 추가 (`src/data/numbers.js`): 운세 3 / 랜덤 3 / 통계 5 (UI 노출 순서). `normalizeStrategyIds(ids)`로 진입 직후 sort.

→ 같은 strategy 조합 = 같은 결과 + 같은 source 매핑. 클릭 순서 무관.

### 2.55.3. 시뮬 검증 (1223회, cancer + wood, drawDate=2026-05-09)

| 케이스 | S25 이전 평균 | S25 이후 결과 | 평균 |
|---|---|---|---|
| 운세 3 | ~6 (스크린샷 3,4,9,12,19,24) | 28,33,38,42,43,44 | 38.0 |
| 통계 5 | ~10 | 4,9,15,28,33,41 | 21.7 |
| 6 strat | 6.8 (S21 시뮬) | 4,9,15,27,28,33 | 19.3 |

정규화: 운세 3개를 [A,F,Z] / [F,Z,A] / [Z,A,F] 3가지 순서로 호출 → 결과 모두 동일 (numbers + bonus + sources).

### 2.55.4. 변경 파일

- `src/data/numbers.js`: `STRATEGY_ORDER` 추가
- `src/core/recommend.js`: `computeStrategyContext` 분리 + `recommend`를 wrapper로 + `normalizeStrategyIds` 신규 + `recommendMulti` C+E안 재작성
- `tests/suites/recommend.test.js`: 정규화 검증 2건 + 풀 평균 수렴 1건 (273 → 276)
- `docs/02_data.md` 1.5.4: 알고리즘 / 정규화 순서 / 풀 평균 수렴 검증 신설
- `service-worker.js`: CACHE_VERSION v10 → v11

### 2.55.5. 검증

`node tests/run-node.js` → **276/276 PASS**.

### 2.55.6. 트레이드오프

- **얻음**: 풀 평균 수렴 / 결정론 명확 / 터치 순서 무관 / weight 계산 재사용성.
- **잃음**: recommendMulti 출력 변경 (이력 호환). history는 단일 strategy 백캐스트라 영향 없음. lastUsedStrategies 결정론 변화는 사용자 직접 영향 0.
- **balancer 다중 모드**: 균형 필터(합 121~160 + 홀짝 3:3) 미적용. count<6이라 검증 불가 (의도된 트레이드오프).

## 2.54. Sprint 033 완료 - 흉/대길 배너 제거 (S24) (2026-05-03)

사용자 지시: 화살표로 "흉일. 방어 모드 권장" 배너 가리키며 "내용 제거".

운세 카피는 캐릭터 카드의 "운세 · 흉/대길"에 이미 노출되어 추천 카드 배너는 중복. 외곽 톤(`is-bad` / `is-great`)은 유지하여 운세 시각 단서 보존.

변경: `src/render/draw-card.js` (banner 변수 + ${banner} 제거), `docs/01_spec.md` 5.1.2 ("배너 폐기 S24" 명시), `service-worker.js` CACHE_VERSION v9 → v10.

## 2.53. Sprint 032 완료 - 출처 태그 전략별 색 차등 (S23) (2026-05-03)

사용자 지시: "같은 운세라도 색 계열은 같지만 색은 다르게 해줘".

### 2.53.1. 정책

카테고리 hue(색 계열) 유지 + 명도 단계로 같은 카테고리 안 11전략 모두 식별 가능하게.

| 카테고리 | hue | 색 단계 |
|---|---|---|
| 통계 5종 | 파랑 (sky) | sky-500 → sky-900 5단계 |
| 운세 3종 | 분홍 (pink) | pink-500 / pink-700 / pink-800 |
| 랜덤 3종 | 회색 (gray) | gray-500 / 600 / 700 |

S22의 1글자 short는 그대로 (추/많/짝/별/안/점/원/사/축/직/균). short는 "어느 전략" 1글자로 식별, 색은 "어느 카테고리 + 어느 위치" 시각 즉답.

### 2.53.2. 변경 파일

- `src/data/colors.js`: `STRATEGY_TAG_COLORS` 11키 매핑 + `strategyTagColor(sid)` 헬퍼 추가
- `src/render/draw-card.js`: `numHtml`에서 inline `style="background-color:..."` 적용 (`.num-source-tag.is-{cat}` 클래스는 fallback로 유지)
- `styles/main.css`: `.num-source-tag` 룰 코멘트만 갱신 (색은 inline이 우선)
- `docs/02_data.md`: 2.7 신규 섹션 (마지막 추가, 기존 2.5/2.6 시프트 회피 - 외부 SSOT 참조 영향 0)

### 2.53.3. 검증

`node tests/run-node.js` → 273/273 PASS. HTML 출력 시뮬:

```
추 sky-500   #0ea5e9   ← 가장 밝음
많 sky-600   #0284c7
짝 sky-700   #0369a1
별 sky-800   #075985
안 sky-900   #0c4a6e   ← 가장 어두움
```

같은 파랑 계열이지만 5단계 명도 차이로 식별 가능. 운세 3종(점/원/사)은 분홍 3단계, 랜덤 3종(축/직/균)은 회색 3단계.

## 2.52. Sprint 031 완료 - 출처 표시 dot → 1글자 short 라벨 (S22) (2026-05-03)

사용자 지시: "각 전략을 눌렀을 때 어떤 숫자가 전략에 의해 선택되었는지 모르겠어. → A로 해봐, 표시는 인식할 수 있는 가장 작은 표시로".

### 2.52.1. 문제

S3-T1의 카테고리 색 dot(8x8) 3색은 통계/운세/랜덤 카테고리만 식별. 같은 카테고리 안 여러 전략(예: 통계 5종 모두 활성)을 선택하면 1번이 "최근 트렌드"인지 "많이 나온 수"인지 구분 불가.

### 2.52.2. 해결 - dot → 1글자 short 라벨

`STRATEGIES`에 이미 정의된 `short` 1글자(축/추/많/짝/별/안/점/원/사/직/균)를 카드에 표시. 카테고리 색은 라벨 배경에 유지 (3축 정보 동시 노출 = 번호/전략/카테고리).

크기: 메인 카드 12x12 / font 9px, 5세트 컴팩트 10x10 / font 8px ("인식 가능한 가장 작은 표시" 디렉티브).

aria-label / title은 풀 라벨("사주 행운 출처") 노출 - 짧음 + 명료.

### 2.52.3. 변경 파일

- `src/render/strategy-picker.js`: `strategyShort(id)` 헬퍼 export
- `src/render/draw-card.js`: dot → tag, `strategyShort` + `strategyLabel` import
- `styles/main.css`: `.num-source-dot` 룰 → `.num-source-tag` 룰 (배경색 + 1글자 텍스트)
- `docs/01_spec.md` 5.2.0.1, `docs/02_data.md` 1.5.4.3 / 1.5.5.5: dot → 1글자 라벨 표기 갱신

### 2.52.4. 검증

`node tests/run-node.js` → 273/273 PASS. HTML 출력 시뮬:

```html
<span class="num-source-tag is-mapping" title="사주 행운">사</span>
<span class="num-source-tag is-stats" title="최근 트렌드">추</span>
<span class="num-source-tag is-stats" title="많이 나온 수">많</span>
<span class="num-source-tag is-stats" title="짝꿍 번호">짝</span>
<span class="num-source-tag is-stats" title="보너스볼">별</span>
<span class="num-source-tag is-stats" title="안 나온 수">안</span>
```

같은 통계 카테고리(파랑) 안에서 추/많/짝/별/안 1글자로 즉시 식별 가능.

## 2.51. Sprint 030 완료 - 객관 시드 분산 + 통계 라벨/순서 변경 (S21) (2026-05-03)

사용자 지시: "통계쪽을 누르면 주로 낮은 번호만 추천되는데 문제가 있는건가? → 진행. 통계 순서 변경: 최근 트렌드 / 많이 나온 수 / 짝꿍 번호 / 보너스볼 / 안 나온 수".

### 2.51.1. 문제 확정 - 객관 전략 시드 단일화

`recommend.js`의 `objectiveSeed = mixSeeds(drwNo, OBJECTIVE_SEED_SALT)` 단일 시드로 5종 객관 전략(many/bonus/regress/trend/balancer)이 mulberry32 첫 6 추출에서 **풀 인덱스 0,1,2,3,6,8 동일**. 다중 전략 모드(각 전략 1개 채택) 시 풀 인덱스 0(=풀 최솟값)만 모임 → 작은 번호 편향.

실측 (1223회 시뮬, draws 1221개 기준):

| 전략 | 풀(상위 10) | 추출 | 풀 인덱스 |
|---|---|---|---|
| 많이 나온 수 | 3,12,13,18,27,33,34,37,40,45 | 3,12,13,18,34,40 | 0,1,2,3,6,8 |
| 보너스볼 | 1,2,4,6,7,17,24,30,32,43 | 1,2,4,6,24,32 | 0,1,2,3,6,8 |
| 안 나온 수 | 4,7,9,12,16,17,26,35,37,40 | 4,7,9,12,26,37 | 0,1,2,3,6,8 |
| 최근 트렌드 | 1,3,15,16,24,27,28,30,31,36 | 1,3,15,16,28,31 | 0,1,2,3,6,8 |

### 2.51.2. 해결 - strategyId 솔트 추가 (A안)

```js
const objectiveSeed = mixSeeds(mixSeeds(drwNo, OBJECTIVE_SEED_SALT), strategyHash(strategyId));
```

`strategyHash(sid)` = djb2 32bit unsigned 결정론 해시. 같은 ID = 같은 해시 → 같은 회차 + 같은 전략은 모든 캐릭터에 동일 결과 (객관성 정의 = "캐릭터 시드/Luck 무관" 보존).

검증 결과 (1223회 재시뮬):
- 많이 나온 수: 풀 인덱스 0,1,2,5,6,8
- 보너스볼: 0,2,3,4,7,...
- 안 나온 수: 1,2,3,5,7,9
- 최근 트렌드: 0,1,2,3,6,9

→ 5종 모두 다른 풀 인덱스 분포. 단일 모드 추천 결과도 다양화.

### 2.51.3. 라벨 + 순서 직관화

| 변경 | 이전 | 이후 |
|---|---|---|
| 라벨 | 통계 추첨 | **많이 나온 수** |
| 라벨 | 보너스볼 사냥 | **보너스볼** |
| 라벨 | 미출현 회귀 | **안 나온 수** |
| 순서 | 통계 추첨 → 보너스볼 사냥 → 미출현 회귀 → 짝꿍 번호 → 최근 트렌드 | **최근 트렌드 → 많이 나온 수 → 짝꿍 번호 → 보너스볼 → 안 나온 수** |

`recommend.js` reasons 카피, 테스트 단언, docs 02_data.md 표 모두 동기화.

### 2.51.4. 테스트 강화

S18 풀 컷팅 후 heavy 6개로는 풀 10에서 4자리가 보통 번호로 채워져 시드 운에 의존 (이전 임계값 >=4). S21에서 **heavy 10개 = STATS_POOL_SIZE**로 강화 → 풀 = heavy 10, 추출 6 = heavy 6 (100%) 결정적. 임계값 == 6.

대상 4건: statistician / regressionist / trendFollower / secondStar.

### 2.51.5. 잔여 편향 - recommendMulti 채택 위치 (별도 보고)

A안만으로는 부분 효과. 6전략 다중 시뮬 결과 = 1,3,4,7,12,14 (평균 6.8). 이전 1,3,4,8,11,21 (평균 8.0)에서 평균 1.2 낮아짐.

원인: `recommendMulti`가 각 sub.numbers(정렬된 6개)의 **첫 번째**부터 채택. targetCount=1이면 매 전략 가장 작은 번호. 시드 분산으로 풀 인덱스는 다양해졌으나, sub.numbers[0]이 풀 안 가장 작은 번호인 점은 그대로.

별도 안 (D안 후보, **미적용**): 채택 시작 인덱스를 i번째 전략 = i로 라운드로빈. 사용자 결정 보류 후 진행 여부 결정.

### 2.51.6. 변경 파일

- `src/core/recommend.js`: strategyHash + objectiveSeed 분산 + reasons 라벨 동기화
- `src/render/strategy-picker.js`: 통계 5종 라벨 + 순서 재배치
- `tests/suites/recommend.test.js`: heavy 시나리오 강화 (6→10) + 라벨 단언 갱신
- `docs/02_data.md`: 1.5 표 + 1.5.1 시드 정의 + 1.5.6.2 풀 표 + 1.5.7 신규 섹션
- `docs/01_spec.md`: 5.1.3 전략 11종 라벨/순서 갱신
- `docs/03_architecture.md`: 3.2 객관 시드 정의 갱신

검증: `node tests/run-node.js` → 273/273 PASS.

## 2.50. Sprint 029 완료 - 추천 보너스 UI 폐기 + "추천N" 라벨 (S20) (2026-05-02)

사용자 지시: "추천에서는 보너스 번호를 사용하지 않아. 보너스 번호를 삭제 + 앞쪽 '추천1' 스트링 표시".

### 2.50.1. 변경

| 영역 | 이전 | 이후 |
|---|---|---|
| 메인 추천 카드 | 본번호 6개 + "+" + 보너스 1개 + "추천번호/보너스번호" 라벨 | **"추천1" 라벨 + 본번호 6개** |
| 5세트 컴팩트 (#2~#5) | "#2"~"#5" + 본번호 + "+" + 보너스 | **"추천2"~"추천5" + 본번호** |
| 이력 카드 | 본번호 + "+" + 보너스 | **본번호만** |
| 데이터 (rec.bonus) | 정상 생성 | **유지** (매칭 / 테스트 호환) |

### 2.50.2. 자율 결정

- 데이터 차원 폐기는 비범위. `rec.bonus` 유지 = 테스트 단언 다수 / `match.js` 호환 / `history.js` 저장 호환.
- UI 노출만 폐기. 사용자 인지 = "추천에 보너스 없음".
- "추천N" 라벨은 5세트 패턴과 통일 (이전 "#N").
- 라벨 색 = 골드 (`--color-accent`) - 캐릭터 정체성 색과 동일.

### 2.50.3. 영향 파일 (5건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: `docs/01_spec.md` (5.2.0.1 / 5.2.1 재작성) / `src/render/draw-card.js` (drawCardHtml + fiveSetsExtraHtml: 보너스 영역 / "+" 아이콘 / 영역 라벨 제거 + "추천N" 라벨 추가) / `src/render/history-page.js` (이력 카드 보너스 표시 + plus 아이콘 import 제거) / `styles/main.css` (.draw-row / .draw-row-idx 신설 + .five-set-balls grid 1fr / .five-set-idx 색상) / `PROGRESS.md`.

### 2.50.4. QA

- 테스트: 273/273 통과 (rec.bonus 데이터 유지로 단언 영향 없음).
- core/ DOM 의존: 0건.
- 사행성 표현: 0건. 라벨 "추천N"은 추천 의미 보존.
- 매직 넘버: 0건.

### 2.50.5. 트레이드오프

- 잃은 것: 동행복권 결과 페이지 호환 시각(본번호 + 보너스 패널)을 추천에서는 폐기. 결과 페이지 매칭 시각 일관성 일부 약화.
- 얻은 것: (1) 사용자 의도 정확 반영 (실제 로또 구매 = 6개만), (2) UI 단순화 (보너스 그리드 / 영역 라벨 / "+" 아이콘 폐기), (3) "추천N" 라벨로 5세트 모드와 패턴 통일, (4) "보너스를 어떻게 추천한 거지?" 사용자 의문 차단.
- 잠재 비용: rec.bonus 데이터가 사용 안 되는데 살아 있어 코드 무게. 향후 데이터 차원 폐기는 별개 sprint.

### 2.50.6. 다음 sprint 후보

- Sprint 030: rec.bonus 데이터 차원 폐기 + 테스트 단언 갱신 (작업량 큼).
- Sprint 031: jsdom render 테스트 도입.
- 보류 항목 그대로.

## 2.49. Sprint 028 완료 - 다중 전략 항상 ON (S19) (2026-05-02)

사용자 화남: "전략을 여러 개 선택했을 때 결과물이 전략에 따라 나와야 한다고 한건데, 전략을 여러개 선택 못하네". 진단 = `options.multiStrategy` 옵션이 기본 OFF여서 단일만 가능. 해결 = 옵션 폐기, 항상 다중.

### 2.49.1. 변경

| 영역 | 이전 | 이후 |
|---|---|---|
| `options.multiStrategy` | 기본 OFF, 설정 탭 토글 | **폐기** (loadOptions에서 자동 제거) |
| 설정 탭 "다중 전략 모드" 행 | 존재 | 제거 |
| 전략 탭 동작 | 옵션 ON일 때만 토글 / OFF는 단일 | **항상 토글** |
| 분배 cap | 6 | 6 (유지, "어정쩡 금지") |
| 단일 전략 | `lastUsedStrategy` 단일 | `lastUsedStrategies = [id]` 배열 1개 |
| `recommend()` (단일 API) | main.js에서 호출 | **호출 안 함**. backcast / 내부 fallback에서만 사용 |
| `recommendMulti()` | main.js multi=true 분기에서 호출 | **항상 호출** |

### 2.49.2. 마이그레이션

- `loadOptions()`에서 `multiStrategy` 키 자동 제거 (`{ multiStrategy: _drop, ...rest }`)
- 캐릭터 `lastUsedStrategy` 단일 string은 `lastUsedStrategies` 배열로 자동 변환 (이미 `activeStrategyIds`에 fallback 있음)
- `lastUsedStrategy` 필드는 호환 보존 (deprecated). 신규 클릭 시 `next[0]`으로 갱신

### 2.49.3. 영향 파일 (5건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: `docs/01_spec.md` (5.1.3.1 / 5.1.3.2 다중 모드 호환 메모) / `docs/02_data.md` (1.5 헤더 / 3.2 / 3.2.2) / `src/data/storage.js` (OPTIONS_DEFAULT + 마이그레이션 가드) / `src/render/main.js` (state.options.multiStrategy 분기 4곳 제거 + getRecAndFortune 단순화 + onMultiStrategyToggle 핸들러 제거) / `src/render/settings-page.js` (다중 전략 토글 행 + 핸들러 제거) / `PROGRESS.md`.

### 2.49.4. QA

- 테스트: 273/273 통과
- multiStrategy 잔존(코드 / 사용자 노출): 0건. 마이그레이션 주석 + storage.js 가드만.
- core/ DOM 의존: 0건
- 매직 넘버: 0건

### 2.49.5. 트레이드오프

- 잃은 것: "라이트 사용자 비노출" 정책 (S3-T1 의도) 폐기. 모든 사용자가 토글로 직진입.
- 얻은 것: (1) 사용자 의도 정확 매칭 (다중 전략이 곧 기본), (2) UX 단순화 (설정 탭 1행 제거), (3) 코드 분기 4곳 통합, (4) recommend / recommendMulti 분기 명확.

### 2.49.6. 인사이트

자비스가 S15-S18에서 메커니즘 정밀화에 매달리는 동안 **사용자가 진짜 원하는 = "다중 전략을 자유롭게 선택" 기본 동작**을 못 봄. 사용자 화남이 정당. 자비스 정책 게이트 (사행성 / 매핑 정직성) 검증과 별개로 **사용자 핵심 UX 의도 누락**은 자비스의 한계 사례. 향후 큰 변경 결정 전 사용자 의도 핵심을 한 번 더 확인.

## 2.48. Sprint 027 완료 - 풀 컷팅 + 균등 추첨 (S18) (2026-05-02)

사용자 의도 = "어정쩡한 값 절대 금지". weight 비례 PRNG의 모호성("1등 자주 / 30등 가끔") → 상위 N 풀 컷팅 + 균등 시드 추첨으로 명확화.

### 2.48.1. 변경 메커니즘

| 차원 | 이전 | 이후 (S18) |
|---|---|---|
| 통계계 5전략 weight | count^1.5 비례 PRNG | 상위 10등 풀 + 균등 |
| 운세 3전략 weight | lucky × 5 boost (풀 밖 1배) | 풀 안 = 1, 풀 밖 = 0 |
| 사주 일진 보너스 | 출생 풀 ×5 + 추첨일 풀 ×R (1.5~3) | 풀 합집합(boost>1 시 추첨일 추가) + 균등 |
| 풀 밖 번호 | WEIGHT_MIN_FLOOR (약하게 가능) | **0 (절대 안 뽑힘)** |

### 2.48.2. 풀 정의

| 전략 | 풀 | 크기 |
|---|---|---|
| 통계 추첨 / 보너스볼 사냥 / 미출현 회귀 / 짝꿍 번호 / 최근 트렌드 | 상위 STATS_POOL_SIZE 등 | **10 (고정)** |
| 별자리 행운 | `ZODIAC_LUCKY[zodiac]` | 8~10 (별자리별) |
| 원소 행운 | `ZODIAC_ELEMENT_LUCKY[el]` | 13~14 |
| 사주 행운 | `FIVE_ELEMENTS_LUCKY[출생] ∪ [추첨일(보너스 시)]` | 9~18 (매주 변동) |
| 축복받은 자 / 직감 / 균형 조합 | (풀 컷팅 무관) 전체 | 45 |

### 2.48.3. 신설 헬퍼

- `poolFromWeights(weights, poolSize)`: 원본 weight 정렬 → 상위 N 인덱스만 1, 나머지 0.
- `poolFromIndices(indices)`: 인덱스 집합 → 풀 균등 weight (운세 매핑 전용).
- `STATS_POOL_SIZE = 10` 상수.

### 2.48.4. 사용자 의문 → 결정 흐름

| 단계 | 내용 |
|---|---|
| 사용자 | "여러 전략 취할 수 있도록 변경. 6 케이스 제시" |
| 자비스 | 5안 비교 (분배/블렌드/슬롯/토너먼트), D 블렌드 권장 |
| 사용자 | "분배 불가능한 상황 = 선택 불가" → 분배 방식 유지 |
| 자비스 | 균등 분배(N | 6) vs 0 발생 차단? |
| 사용자 | "어정쩡한 값 절대 금지" + 통계 추첨 1등? 10등 랜덤? 예시 |
| 자비스 | 풀 컷팅 + 균등 (B안), N=10 권장 |
| 사용자 | "권장으로 진행" |

핵심 인사이트: "어정쩡" = weight 비례 PRNG의 메커니즘 모호성. 풀 컷팅으로 명확화.

### 2.48.5. 트레이드오프

- 잃은 것: (1) 통계 추첨이 30등 번호도 가끔 뽑던 다양성 폐기. 상위 10등 안에서만 추출. (2) 운세 매핑 풀 밖 번호 1배 가능성 폐기 - 풀 밖 0%. (3) 사주 일진 통변성 boost 차등(1.5~3) 폐기 - 풀 합집합 + 균등으로 단순화.
- 얻은 것: (1) 메커니즘 명확화 ("어정쩡 절대 금지" 정책 충족), (2) 추천 메커니즘 사용자 설명 가능, (3) 풀 + 분배 룰의 정합 (예: 통계 추첨 K=2 → 상위 10 풀에서 2개 시드 추출, 항상 정수 K개).
- 잠재 비용: 통계 추첨이 매주 같은 상위 10 풀 (count는 천천히 변함) → 캐릭터 시드만 다른 6개 추출. 캐릭터 정체성 = 시드로만. 회차별 변동 약함.

### 2.48.6. 영향 파일 (4건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: `docs/02_data.md` (1.5.6 신설, 5개 sub) / `src/data/numbers.js` (STATS_POOL_SIZE) / `src/core/recommend.js` (poolFromWeights / poolFromIndices 헬퍼 + 8 전략 분기 풀 컷팅 적용 + 사주 fiveElementsWeights 풀 합집합 재작성 + reasons 카피) / `PROGRESS.md`.

### 2.48.7. QA

- 테스트: 273/273 통과
- "확률 향상" / "필승" 단어 위반: 0건
- 사주 일진 reasons에 "매주 변동" 명시 유지
- core/ DOM 의존: 0건
- 매직 넘버: 0건 (STATS_POOL_SIZE = numbers.js)

### 2.48.8. 다음 sprint 후보

- Sprint 028: 다중 전략 모드의 분배 기본 ON / 단일 전략 폐기 검토 (사용자 케이스 1, 3 = 단일도 다중 cap 1).
- Sprint 029: 풀 크기 N의 전략별 차별화 (예: 통계 = 10, 보너스 = 8 등) - 현재 고정 10 단순.
- Sprint 030: jsdom 도입 → render/ 테스트.

## 2.47. Sprint 026 완료 - 행운 쌓기 위치 이동 (S17) (2026-05-02)

사용자 지시: "행운 쌓기는 전략 하위에 표시되도록 순서 변경".

### 2.47.1. 변경

| 위치 | 이전 (S13/S14) | 이후 (S17) |
|---|---|---|
| 히어로 카드 직하 | 행운 쌓기 한 줄 바 | (없음) |
| 전략 탭 하위 | (없음) | **행운 쌓기 한 줄 바** |
| 캐릭터 세트 | 슬롯 + 카드 | 슬롯 + 카드 (변경 없음) |

새 홈 탭 순서: `헤더 → 히어로 → 전략 탭 → 행운 쌓기 → 캐릭터 세트`.

### 2.47.2. 영향 파일 (3건)

- 수정: `docs/01_spec.md` (4장 도식 + 5.6.7 위치) / `src/render/main.js` (homeTabHtml 렌더 순서) / `PROGRESS.md`.

### 2.47.3. QA

- 테스트: 273/273 통과
- core/ DOM 의존: 0건
- CSS 변경: 0건

### 2.47.4. 트레이드오프

- 잃은 것: 행운 쌓기가 히어로 직하에서 사라져 의식 진척도 즉시 가시성 감소. 스크롤 1단 추가.
- 얻은 것: 전략 탭 ↔ 행운 쌓기 인접 = "전략 선택 후 행운 쌓기로 보강" 흐름 시각화. 의식이 "전략의 보조 도구" 위치로 의미 정렬.

## 2.46. Sprint 025 완료 - 사주 행운 일진 강화 (S16) + variability chip (2026-05-02)

사용자 요청 = 캐릭터별 + 매주 변경 lucky. 자비스 권장 B안(추첨일 일주 × 출생 일주 통변성 관계 boost) 채택. 추가 지시: "주간 변경 / 평생 동일" chip 표시.

### 2.46.1. 메커니즘 (명리학 일진 + 통변성)

캐릭터 출생 일주 오행 (평생 고정) + 추첨일 일주 오행 (매주 변동)의 통변성 관계 → 추첨일 lucky 추가 boost.

| 관계 | 통변성 | boost |
|---|---|---|
| self | 비견 | ×1.5 |
| generate | 식상 | ×2.0 |
| beGenerated | 인성 | **×3.0** |
| overcome | 재성 | ×1.5 |
| beOvercome | 관성 | ×1.0 |

학설 출처: 명리학 통변성(通變星) BC 음양가 → 한대. 河圖數와 자연 결합.

### 2.46.2. 코드 재사용

- `src/core/saju.js`의 `elementRelation` / `dateToDayPillar`는 fortune.js에서 이미 사용 중. recommend.js에서 그대로 재활용.
- `src/data/numbers.js`에 `SAJU_RELATION_BOOST` 상수 신설 (관계별 boost 5종).
- `src/core/recommend.js` `fiveElementsWeights(dayPillar, drawDate)` 시그니처 확장. 반환값 = `{weights, relation, drawElement}`.
- `src/render/main.js` `getRecAndFortune`에서 `nextDraw().drawAtMs` → KST 토요일 ISO 변환 → `drawDate` ctx 전달. 미래 회차도 보너스 작동.

### 2.46.3. UI - variability chip (사용자 추가 지시)

| 전략 | chip | 색 |
|---|---|---|
| 별자리 행운 | "평생 동일" | 회색 (`#f3f4f6`) |
| 원소 행운 | "평생 동일" | 회색 |
| 사주 행운 | **"주간 변경"** | 그린 (`#dcfce7`) |

위치 2곳: 캐릭터 카드 행운 토글 패널 (`.lucky-variability`) + 전략 탭 활성 desc (`.strategy-variability`). 사용자가 한눈에 "이 lucky가 매주 바뀌는지 / 평생 같은지" 인지.

### 2.46.4. 영향 파일 (7건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: `docs/02_data.md` (1.18.7 신설) / `src/data/numbers.js` (SAJU_RELATION_BOOST) / `src/core/recommend.js` (fiveElementsWeights 강화 + ctx.drawDate / reasons 일진 추가) / `src/render/main.js` (ctxBase.drawDate) / `src/render/character-card.js` (variability 필드 + 패널 chip) / `src/render/strategy-tabs.js` (STRATEGY_VARIABILITY + chip) / `styles/main.css` (lucky-variability / strategy-variability 룰) / `PROGRESS.md`.

### 2.46.5. QA 결과

- core/ DOM 의존성: 0건.
- "확률 향상" / "필승" 단어 위반: 0건.
- "추첨 결과 보장 없음" 명시: 모든 면책 위치 유지.
- 학설 출처: 명리학 통변성 (BC 음양가) + 河圖數 (易經). public domain.
- variability 시각: 2 위치 chip 강제.
- 테스트: 273/273 통과 (reasons assertion = includes 패턴이라 일진 추가 reasons 영향 없음).

### 2.46.6. 트레이드오프

- 잃은 것: 사주 행운 lucky 풀이 매주 바뀌어 사용자가 풀 자체를 외울 수 없음 (학습 비용 ↑).
- 얻은 것: (1) 사용자 요구 정확 매칭 (캐릭터별 + 매주 변경), (2) 학설 정통 (명리학 일진 = 매일 변하는 천간 오행), (3) variability 시각화로 인지 부담 차단, (4) 별자리/4원소(평생) vs 사주(주간) 차별화 명확.
- 잠재 비용: 추첨일 일주 오행 = 매주 다른 추첨일 → 추천 결과 변동 폭이 출생 일주 단독보다 큼. boost 누적 시 일부 번호 weight 매우 높아질 가능성. 현재 boost 1.5~3.0 범위라 안전.

### 2.46.7. 다음 sprint 후보

- Sprint 026: 별자리 / 4원소도 transit 적용? (학설 출처 약함 / 복잡도 큼 - 비권장).
- Sprint 027: jsdom 도입 → render/ 일부 테스트.
- Sprint 028: hub CI 표준 sudoku/tetris 확장.
- 보류 항목 그대로 (#7 OCR / 결제 / i18n).

## 2.45. Sprint 024 완료 - 학설 기반 매핑 재작성 (S15) (2026-05-02)

사용자 의문 → 학설 기반 가능성 검토 → 자비스가 위험(사행성 / IP / 면책 자기모순) 짚음 → **사용자 책임 인수**("면책은 내가 책임져 / 개인 사용 / 보장 없음 명기 약속") + "진짜를 원해" 강한 결정 → A안(전체 학설 기반) 채택. 권장 매핑 검증 후 진행.

### 2.45.1. 결정 흐름

| 단계 | 내용 |
|---|---|
| 사용자 의문 | "진짜 점성술 / 명리학 기법 사용하는 거야?" |
| 자비스 답변 | 임의 매핑 lookup. 학설 무관 명시 |
| 사용자 의향 | "진짜를 원해" |
| 자비스 위험 점검 | 4축 (사행성 / 면책 자기모순 / IP / 학설 자체 비과학) |
| 사용자 책임 인수 | 면책 본인 책임 / 개인 사용 / 상용화 시 "보장 없음" 명기 약속 |
| 매핑 미리보기 | 별자리 12종 + 4원소 + 5오행 + 출처 명시 |
| 사용자 검증 | 권장 그대로 채택 |

### 2.45.2. 학설 기반 매핑 (3축)

**별자리 12종 (1.11 신설)**: Sun Sign Number + Ruler Planet Number (Sephariel / Cheiro numerological astrology) 합집합 + 끝자리 1~45 확장. 별자리당 8~10개 lucky.
- Aries: Sun#1 + Mars#9 → 1, 9, 11, 19, 21, 29, 31, 39, 41
- Pisces: Sun#12→3 + Jupiter#3 → 2, 3, 12, 13, 22, 23, 32, 33, 42, 43
- 12종 모두 다른 분포 (정체성 보장)

**4원소 (1.14 갱신)**: 각 원소 3별자리의 Ruler Number 합집합 + 끝자리 확장. 원소당 13~14개 lucky.
- 불 (1, 3, 9 끝): 14개
- 땅 (5, 6, 8 끝): 13개
- 공기 (4, 5, 6 끝): 14개
- 물 (2, 3, 9 끝): 14개

**5오행 (1.18 갱신)**: **河圖數** (易經 / 河圖洛書, BC 약 2000년, public domain). 끝자리 확장.
- 水: 1, 6, 11, 16, 21, 26, 31, 36, 41
- 火: 2, 7, 12, 17, 22, 27, 32, 37, 42
- 木: 3, 8, 13, 18, 23, 28, 33, 38, 43
- 金: 4, 9, 14, 19, 24, 29, 34, 39, 44
- 土: 5, 10, 15, 20, 25, 30, 35, 40, 45
- 5×9=45 균등 분포 (모든 번호가 한 오행 정확히 1개에 배정)

### 2.45.3. 면책 카피 톤 재설계 (3 위치 통일)

이전: "임의 매핑 · 점성술·명리학 학설과 무관 · 추첨 확률 영향 없음"
**S15 후**: "**전통 ○○ 출처 · 학설 자체는 과학 검증 없음 · 추첨 결과 보장 없음**"

| 위치 | 카피 (○○ 자리) |
|---|---|
| 캐릭터 카드 사주 패널 | 河圖數 출처 (易經) |
| 캐릭터 카드 별자리 패널 | 점성술 출처 (Sun Sign + Ruler Planet) |
| 캐릭터 카드 4원소 패널 | 점성술 4원소 출처 (별자리 합집합) |
| 전략 탭 활성 desc 면책 | 학설 출처 (점성술 / 河圖數) |
| 추천 reasons 3종 | 각 출처별 + "추첨 결과 보장 없음" |

### 2.45.4. CLAUDE.md 6.3 정책 작동 (S15 인사이트)

학설 기반으로 변경했지만 **"확률 향상 / 필승" 단어는 여전히 0건**. 학설 인용 ≠ 확률 향상 주장. 면책 카피 "추첨 결과 보장 없음"이 정책 게이트 유지. 사용자 정책 자율(개인 책임) + 자비스 정책 시스템(코드 차원) **분리** 작동.

### 2.45.5. 영향 파일 (5건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: `docs/02_data.md` (1.5.2.5 / 1.5.2.8 신설 / 1.11 신설 / 1.14 / 1.18 갱신) / `docs/01_spec.md` (5.9.6 면책 톤) / `src/data/numbers.js` (ZODIAC_LUCKY / ZODIAC_ELEMENT_LUCKY / FIVE_ELEMENTS_LUCKY 데이터 + 출처 주석) / `src/render/character-card.js` (3 패널 caption) / `src/render/strategy-tabs.js` (mapping-note 카피) / `src/core/recommend.js` (reasons 3건) / `PROGRESS.md`.

### 2.45.6. QA 결과

- core/ DOM 의존성: 0건.
- "확률 향상" / "필승" 단어 위반: 0건.
- "추첨 결과 보장 없음" 명시: 5 위치 모두 강제.
- 매핑 균등성: 河圖數 = 완전 균등 (45/5 = 9). 별자리 / 4원소 = 학설 출처 그대로 (불균등하지만 출처 진정성).
- 학설 출처 인용: 모든 매핑에 코드 주석 + docs SSOT 정확 명시.
- 테스트: 273/273 통과 (reasons 단언은 includes 패턴이라 카피 변경에도 영향 없음).

### 2.45.7. 트레이드오프

- 잃은 것: (1) "임의 매핑" 정직성 카피의 단순성. (2) 4원소 매핑의 광범위성 (13~14개) - boost 효과 약화. (3) 별자리 4페어(같은 ruler) 중복.
- 얻은 것: (1) 출처 진정성 (河圖數은 출처 BC 2000년, 별자리는 numerological astrology 전통), (2) 캐릭터 정체성 강화 (12별자리 모두 다른 분포), (3) 사용자 몰입 (내 별자리/사주에 맞는 진짜 학설 출처), (4) docs 1.11 신설로 별자리 12종 상세 SSOT 보강.
- 잠재 비용: 학설 인용으로 사행성 오해 위험 미세 증가. 면책 카피 + CLAUDE.md 6.3 단어 가드로 차단.

### 2.45.8. 정책 자율 vs 시스템 정책 분리 인사이트

본 sprint는 자비스 정책 게이트의 **2단 작동**을 검증.

| 단계 | 정책 |
|---|---|
| 1단 (코드 / 단어) | "확률 향상 / 필승 / 당첨" 단어 금지 (CLAUDE.md 6.3). 학설 기반이라도 적용. **시스템 정책** |
| 2단 (디자인 / 출처) | 학설 기반 vs 임의 매핑은 디자인 결정. 사용자 결정 권한자. **사용자 자율** |

자비스는 1단을 강제(자동 차단), 2단은 위험 점검 + 결정 위임. Sprint 023 ("당첨 확률 올리기" 차단)은 1단 작동, Sprint 024 (학설 기반 도입)는 2단 작동. 두 정책이 **서로 충돌하지 않고 병존**함을 본 sprint가 검증.

### 2.45.9. 다음 sprint 후보

- Sprint 025: 모바일 360px wrap 검증.
- Sprint 026: jsdom 도입 → render/ 일부 테스트.
- Sprint 027: hub CI 표준 sudoku/tetris 확장.
- 보류 항목 그대로 (#7 OCR / 결제 / i18n).

## 2.44. Sprint 023 완료 - 행운 쌓기 한 줄 바 (S14) + 사행성 라벨 차단 (2026-05-02)

사용자 지시 "행운 의식 영역 전체를 → '당첨 확률 올리기' 한 줄 바로 처리". 라벨 = **사행성 표현 정책 위반**(CLAUDE.md 6.3) → 자비스가 즉시 짚고 대안 4안 제시 → 사용자 권장안(B "행운 쌓기") 채택.

### 2.44.1. 정책 위반 차단 흐름 (2026-05-02)

| 단계 | 내용 |
|---|---|
| 사용자 발화 | "당첨 확률 올리기" 라벨로 한 줄 바 처리 |
| 자비스 점검 | CLAUDE.md 6.3 ("확률 향상 / 필승 절대 금지") + 6.5 ("적중률 향상 옵션 금지") + docs 면책 카피("추첨 확률 영향 없음" 강제) 정면 충돌 |
| 자비스 대응 | 라벨 대안 4안(A 현행 / B "행운 쌓기" / C "정성 쌓기" / 위반 ~~"당첨 확률 올리기"~~) + 게이지 처리 / 만땅 시각 / 빈 영역 burst 후속 결정 3건 묶어 사용자에게 위임 |
| 사용자 결정 | "권장안으로 진행" → B "행운 쌓기" + 게이지 폐기 8 아이콘 + 만땅 8 골드 + "+5 적용" + 행위 클릭 burst |

### 2.44.2. 작업 범위 (5축)

- **라벨**: "행운 의식" → **"행운 쌓기"** (UI / 모달 제목 / aria-label / docs 5.6 헤더 / 02_data 1.19 헤더).
- **시각**: 게이지 바(0~100 %) 폐기 → **8 아이콘 진척도** (8 × 12.5 = 100, 1:1). 영역 전체 button.
- **만땅**: 8 아이콘 모두 골드 + **"+5 적용"** chip + 시각 버튼 "완성 ✓".
- **모달 구조**: 제목 → **한 줄 바와 동일 정보 재표시(.ritual-row-in-modal)** → **빈 애니메이션 영역(.ritual-anim-stage)** → 완성 banner(만땅 시) → 인트로 → 행위 8 그리드 → 면책. 한 줄 바 재표시 사유 = 모달이 배경 한 줄 바를 가려 진척도 가시성 손실 보완.
- **애니메이션**: 행위 클릭마다 `.ritual-anim-stage` anchor로 burst (소형). 만땅 진입 시 같은 anchor로 추가 burst (이전 banner anchor → stage anchor로 변경, 모달 정보 가림 회피).

### 2.44.3. 자율 결정 사항

- 백엔드 상수 `RITUAL_GAUGE_MAX` 100 / `RITUAL_GAIN_PER_ACTION` 12.5 그대로. localStorage `lotto_rituals.gauge` 0~100 보존 (마이그레이션 0).
- 한 줄 바의 시각 버튼 텍스트 = "시작" / "완성 ✓". 사용자 발화 그대로.
- 한 줄 바 자체가 button 요소 (시작 버튼은 affordance 시각만). 클릭 핸들러는 컨테이너 단일.
- 모달 내 동일 정보 행은 aria-hidden + cursor:default (사용자 클릭 X, 정보 재표시 전용).
- 행위 클릭 burst는 매 클릭마다 작동. 산만하지 않게 0.9초 단발 + reduced-motion 자동 비활성.

### 2.44.4. 영향 파일 (5건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: `docs/01_spec.md` (5.6 헤더 + 5.6.1 / 5.6.4 / 5.6.7 / 5.6.9 갱신) / `docs/02_data.md` (1.19 헤더 + S14 변경 한 줄 + 1.19.6) / `src/render/ritual-widget.js` (전면 재작성: ritualWidgetHtml + ritualModalHtml + attachRitualHandlers) / `src/render/main.js` (onPerform 시그니처 + animStageEl burst + 만땅 anchor 변경) / `styles/main.css` (.ritual-widget / .ritual-bar / .ritual-pct / .ritual-flame / .ritual-actions / .ritual-caption / .ritual-title / .ritual-header 8종 룰 폐기 + .ritual-row / .ritual-row-icons / .ritual-row-icon / .ritual-row-bonus / .ritual-row-cta / .ritual-row-in-modal / .ritual-anim-stage 7종 신설 + reduced-motion 셀렉터 정정) / `PROGRESS.md`.

### 2.44.5. QA 결과

- core/ DOM 의존성: 0건 (변경은 render/ + styles/ + docs/만).
- **사행성 표현 위반: 0건** (라벨 "행운 쌓기" + 면책 카피 / 모달 면책 모두 유지 + "당첨 확률 올리기" 라벨 거부).
- 옛 라벨 잔존(코드): 0건. 폐기 클래스 잔존: 0건 (코멘트 / 키프레임 재활용 1건 - .reverse-best.has-rank가 ritual-flame-flow 키프레임 재사용).
- 매직 넘버: 0건 (RITUAL_GAUGE_MAX 100 / RITUAL_GAIN_PER_ACTION 12.5 / LUCK_BONUS_RITUAL 5 모두 numbers.js).
- docs SSOT 정합: 01_spec.md 5.6 ↔ 02_data.md 1.19 cross-ref 갱신.
- 테스트: 273/273 통과 (CSS / render 한정 → core 영향 0).

### 2.44.6. 트레이드오프

- 잃은 것: 게이지 바 0~100 % 수치 시각화. 사용자가 정밀 진척도 % 확인 못함.
- 얻은 것: (1) 한 줄 바로 세로 공간 압축 (이전 위젯 padding+게이지+캡션 3행 → 1행), (2) 라벨 "행운 쌓기"로 8행위 누적 메타포와 라벨 짝맞춤, (3) 정책 위반 라벨("당첨 확률 올리기") 사전 차단 (자비스 정책 게이트 작동 사례), (4) 모달 상단 정보 재표시로 배경 가림 보완, (5) 빈 영역 anchor로 모달 가림 없는 burst.
- 잠재 비용: % 수치를 정밀 추적하던 사용자엔 정보 손실. 8 아이콘이 12.5 단위 매핑이라 정확도는 유지.

### 2.44.7. 정책 게이트 작동 인사이트

본 sprint는 자비스가 사용자 명령을 **그대로 따르지 않고** 정책 위반 사실을 짚어 대안을 제시한 사례. CLAUDE.md 6.3 / 6.5 / 면책 카피 강제 정책이 코드 차원이 아니라 **자비스 응답 차원에서도 작동**함을 검증. 글로벌 CLAUDE.md "결정은 사용자, 자비스는 제안" 원칙과 일관 - 자비스는 결정권 없이 정책 위반만 지적, 라벨 대안은 사용자가 선택.

### 2.44.8. 다음 sprint 후보

- Sprint 024: jsdom 도입 → render/ 일부 테스트.
- Sprint 025: 한 줄 바의 모바일 좁은 화면 검증 (8 아이콘 + 라벨 + chip + cta가 360px에서 wrap 적절한지).
- Sprint 026: hub CI 표준 sudoku/tetris 확장.
- 보류 항목 그대로 (#7 OCR / 결제 / i18n).

## 2.43. Sprint 022 완료 - 캐릭터 슬롯+카드 세트 배치 (S13) (2026-05-02)

사용자 지시 (스크린샷 + 화살표): 캐릭터 선택 버튼을 캐릭터 정보창 바로 위로 옮겨서 세트로 처리.

### 2.43.1. 변경 (홈 탭 렌더 순서)

| # | 이전 | 이후 |
|---|---|---|
| 1 | 헤더 + 히어로 | 헤더 + 히어로 |
| 2 | 캐릭터 슬롯 | 행운 의식 위젯 |
| 3 | 행운 의식 위젯 | 전략 탭 |
| 4 | 전략 탭 | **캐릭터 슬롯** |
| 5 | 캐릭터 카드 | **캐릭터 카드** |

캐릭터 슬롯 + 카드를 인접 배치하여 "캐릭터 세트" 시각 묶음. 의식 위젯은 자연스레 히어로 카드 직하로 승격.

### 2.43.2. 자율 결정 사항

- **단순 인접 배치**. wrapper section / border 통합은 미적용. 사용자 피드백에 따라 후속 폴리싱 가능.
- 의식 위젯 위치는 자연 승격. 게이지의 캐릭터 의존성(activeId 변경 시 리셋)은 그대로 - 카드 / 슬롯과 시각 분리되어도 의미 충돌 없음.
- 전략 탭은 "전략은 캐릭터 속성이 아님" 정책(spec 5.1.3 "전략은 캐릭터 속성이 아닙니다")과 일치. 슬롯/카드와 시각 분리 = 정책 시각화.
- CSS 변경 0건 (각 컴포넌트 자기 마진 그대로).

### 2.43.3. 영향 파일 (3건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: `docs/01_spec.md` (4장 도식 + 5.6.7 의식 위젯 위치) / `src/render/main.js` (homeTabHtml 렌더 순서) / `PROGRESS.md`.

### 2.43.4. QA 결과

- core/ DOM 의존성: 0건.
- 사행성 표현: 0건.
- 매직 넘버: 0건.
- docs SSOT 정합: 4장 도식 ↔ 5.6.7 cross-ref 갱신.
- 테스트: 273/273 통과.

### 2.43.5. 트레이드오프

- 잃은 것: 슬롯이 페이지 상단(히어로 직하)에서 보이지 않게 됨. 캐릭터 전환을 빠르게 하던 사용자에겐 스크롤 한 번 추가.
- 얻은 것: (1) 슬롯 + 카드 시각 묶음으로 "캐릭터 세트" 인지 강화, (2) 전략 탭이 슬롯과 분리되어 spec 5.1.3 "전략은 캐릭터 속성이 아님" 정책 시각화, (3) 의식 위젯이 히어로 직하로 자연 승격.

### 2.43.6. 다음 sprint 후보

- Sprint 023: 슬롯+카드 wrapper section 시각 묶음 강화 (사용자 피드백 시).
- Sprint 024: jsdom 도입 → render/ 일부 테스트.
- Sprint 025: hub CI 표준 sudoku/tetris 확장.
- 보류 항목 그대로 (#7 OCR / 결제 / i18n).

## 2.42. Sprint 021 완료 - 줄 순서 변경 (S11) + 전략 라벨 직관화 (S12) (2026-05-02)

사용자 발화 2건 묶음 처리.

### 2.42.1. S11 - 카테고리 줄 순서 변경

사용자 지시 "통계 그룹이 랜덤 아래로 이동". 통계 → 운세 → 랜덤 → 운세 → 랜덤 → 통계.

- 자율 결정: docs/02_data.md 1.5.2 표 행 순서도 같이 갱신 (SSOT 일관). 표 아래 "운세 → 랜덤 → 통계" 정책 한 줄 명시.
- 의미: 캐릭터 정체성/콘텐츠 우선, 객관 통계는 후순위 노출.

### 2.42.2. S12 - 전략 라벨 직관화 (A안)

사용자 의문 "전략이 별자리 행운, 별자리 4원소, 일주 오행이라고 되어 있잖아. 이게 평범한 사람에게는 조금 덜 직관적인것 같은데?" → A안 채택 ("○○ 행운" 통일).

| 영문 ID | 이전 | 변경 후 |
|---|---|---|
| astrologer | 별자리 행운 | 별자리 행운 (그대로) |
| zodiacElement | **별자리 4원소** | **원소 행운** |
| fiveElements | **일주 오행** | **사주 행운** |

자율 결정 사항:
- "○○ 행운" 톤 통일로 카테고리(운세) 의도 즉시 전달.
- "4원소" / "일주 오행" 도메인 단어는 desc로 학습 노출 유지 ("별자리 4원소(불/땅/공기/물)" / "캐릭터 일주의 천간 오행(목/화/토/금/수)").
- 캐릭터 카드 행운 토글 tabLabel("사주" / "별자리" / "4원소")은 chip 길이 제약으로 변경 없이 유지.
- short 'oh' → 'sa' (사주 약어). 단 strategyPickerHtml 미사용이라 시각 영향 0.
- 도메인 정의 표 (1.14 별자리 4원소 / 1.18 천간 오행)는 그대로. 매핑 출처 명세 차원이라 라벨과 별개.

### 2.42.3. 영향 파일 (7건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: `docs/01_spec.md` (4.7.1 줄 순서 / 5.1.3 전략 11종 list) / `docs/02_data.md` (1.5 표 row 2건 / 1.5.2 표 + 정책 / 1.5.2.6 / 1.5.2.7 신설) / `src/render/strategy-picker.js` (label / short 2건) / `src/render/strategy-tabs.js` (CATEGORY_ROW_ORDER) / `src/core/recommend.js` (reasons 카피 2건) / `tests/suites/recommend.test.js` (단언 2건) / `PROGRESS.md`.

### 2.42.4. QA 결과

- core/ DOM 의존성: 0건.
- 사행성 표현 위반: 0건.
- 옛 라벨 잔존(코드 / 사용자 노출): 0건.
- 옛 라벨 잔존(콘텐츠 도메인 - 1.14 / 1.18 매핑 표 / Character 스키마 주석 / character-card 행운 토글): 의도적 유지. 도메인 출처 명세 차원.
- 매직 넘버: 0건.
- docs SSOT 정합: 02_data.md 1.5 / 1.5.2 / 1.5.2.6~7 + 01_spec.md 4.7.1 / 5.1.3 cross-ref.
- 테스트: 273/273 통과.

### 2.42.5. 트레이드오프

- 잃은 것: "4원소" / "일주" / "오행" 도메인 단어가 라벨에서 사라져 도메인 학습자의 첫인상 일치도 약간 감소.
- 얻은 것: (1) 평범 로또 구매자 진입 장벽 감소 (도메인 단어 0), (2) 라벨 톤 통일 ("○○ 행운" 3종) → 카테고리(운세) 의도 즉시 전달, (3) 줄 순서 변경 (S11)로 정체성 우선 노출.
- 잠재 비용: "원소 행운"과 "별자리 행운" 둘이 별자리 베이스로 비슷해 보임. desc 의존도 약간 상승. 향후 사용자 피드백에 따라 라벨 차별화 추가 검토.

### 2.42.6. 다음 sprint 후보

- Sprint 022: jsdom 도입 → render/ 일부 테스트.
- Sprint 023: hub CI 표준 sudoku/tetris 확장.
- Sprint 024: 카테고리 한글 라벨 SSOT 일원화 (CATEGORY_ROW_ORDER → numbers.js).
- 보류 항목 그대로 (#7 OCR / 결제 / i18n).

## 2.41. Sprint 020 완료 - 운세/사주 카테고리 통합 (A안) (2026-05-02)

사용자 의문 ("운세와 사주는 카테고리가 달라야 해?") → A안 채택 + 추가 지시("라벨은 운세로") → 운세 매핑 + 사주 → "운세" 단일 카테고리 통합. 카테고리 4 → 3.

### 2.41.1. 통합 사유 (4건)

1. **본질 동일**: 운세 매핑(별자리)과 사주(일주 오행) 모두 "생년월일 → 임의 매핑 lookup"이라는 같은 메커니즘. 출처 학설(서양/동양)만 다름.
2. **분류 효력 약함**: 사주 카테고리 멤버 = 1개(일주 오행). 분류는 2개 이상 묶을 때 의미.
3. **출처 구분은 전략명에서**: 사용자는 "별자리 행운" / "일주 오행" 전략명에서 동/서양 자연 인지. 카테고리에서 또 구분할 필요 없음.
4. **사주 정체성은 보존 가능**: 캐릭터 카드 행운 토글의 사주 패널 + 면책 카피의 "{분야}=명리학" 분야명으로 정체성 유지.

### 2.41.2. 변경 범위 (5축)

- **카테고리 라벨**: 운세 매핑 → 운세 (사용자 추가 지시 "라벨은 운세로"). 한글명 단순화.
- **카테고리 ID**: `STRATEGY_CATEGORIES.fiveElements` = `'saju'` → `'mapping'`. 영문 키 통일(`mapping` 단일).
- **줄 분포**: 4줄(통계 5 / 운세 매핑 2 / 사주 1 / 랜덤 3) → **3줄(통계 5 / 운세 3 / 랜덤 3)**. 멤버 수 균형.
- **CSS 색**: `.strategy-row.is-saju` / `.num-source-dot.is-saju` / `.strategy-category.is-saju` 3종 룰 제거. `.lucky-element-saju`(캐릭터 카드 행운 토글)는 유지 - 콘텐츠 출처 차원이라 카테고리와 별개.
- **면책 카피**: 동일 텍스트 유지("임의 매핑 · 점성술·명리학 학설과 무관 · 추첨 확률 영향 없음"). 분기 단순화: `cur.category === '운세'`.

### 2.41.3. 자율 결정 사항 (3건)

- **캐릭터 카드 행운 토글 색**: 사주 황 / 별자리·4원소 분홍 그대로 유지. 카테고리 차원과 별개의 "콘텐츠 출처(동양/서양)" 차원이라 통합 영향 없음. docs/01_spec.md 5.9.5 표기 정정 ("카테고리 색과 호환" → "전략 카테고리와 별개 차원").
- **localStorage 마이그레이션**: 불필요. 기존 캐릭터의 `lastUsedStrategy` / `lastUsedStrategies`는 전략 ID('fiveElements') 그대로. STRATEGY_CATEGORIES 변경은 lookup 계층만 영향.
- **분야명 보존**: 면책 카피의 "점성술·명리학"은 그대로. 학설 출처를 명시하는 정직성 차원이지 카테고리 차원이 아니라 통합과 무관.

### 2.41.4. 영향 파일 (8건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: `docs/01_spec.md` (4.7.1 / 4.7.2 / 5.1.3 카테고리 분류 / 5.1.3.1 dot 색 / 5.9.5 / 5.9.6) / `docs/02_data.md` (1.5 표 row 3건 / 1.5.2 표 4행→3행 / 1.5.2.1~5 / 1.5.2.6 신설) / `src/data/numbers.js` (STRATEGY_CATEGORIES) / `src/render/strategy-picker.js` (3종 카테고리 라벨) / `src/render/strategy-tabs.js` (CATEGORY_CLASS / CATEGORY_ROW_ORDER / isMappingCat 분기) / `src/render/draw-card.js` (CATEGORY_DOT_CLASS) / `styles/main.css` (4종 is-saju 룰 제거 + 코멘트 정정) / `PROGRESS.md`.

### 2.41.5. QA 결과

- core/ DOM 의존성: 0건.
- 사행성 표현 위반: 0건.
- 옛 카테고리 라벨 잔존(코드 레벨): 0건. 주석 / S10 폐지 명시 코멘트 5건만.
- 옛 라벨 잔존(콘텐츠 도메인 - 1.18 표 / saju.js / 캐릭터 카드 행운 토글 / 분야명): 의도적 유지. 콘텐츠 출처 차원이라 카테고리와 별개.
- 매직 넘버: 0건.
- docs SSOT 정합: 02_data.md 1.5.2 표 3행 + 1.5.2.6 통합 결정 명시 + 01_spec.md cross-ref 갱신.
- 테스트: 273/273 통과 (45ms). 카테고리 단언 케이스 0건이라 영향 없음.

### 2.41.6. 트레이드오프

- 잃은 것: 사주 카테고리 시각 단독 노출(1줄). 사주가 카테고리 라벨 chip으로는 더 이상 보이지 않음.
- 얻은 것: (1) 카테고리 차원 본질 일관성 (생년월일 매핑 묶음), (2) UI 단순화 (4줄 → 3줄, 멤버 수 균형 5/3/3), (3) SSOT 통일 (mapping 영문 키 단일), (4) 사용자 인지 단순화 ("운세 매핑/사주 차이가 뭐지?" 의문 해소).
- 잠재 비용: 사주 단어가 카테고리 차원에서 사라짐. 보완 = 캐릭터 카드 행운 토글 / 면책 분야명 / 전략 desc 3곳에서 "사주" 단어 보존.

### 2.41.7. 다음 sprint 후보

- Sprint 021: jsdom 도입 → render/ 일부 테스트 (Sprint 017 잔존 위험). 본 sprint에서 카테고리 분기가 단순화되어 테스트 진입 비용 약간 감소.
- Sprint 022: hub CI 표준 sudoku/tetris 확장.
- Sprint 023: 카테고리 한글 라벨 SSOT 일원화 (numbers.js로 이동). 본 sprint에서 STRATEGIES.category가 '운세' / '통계' / '랜덤' 3종으로 단순화되어 일원화 비용 감소.
- 보류 항목 그대로 (#7 OCR / 결제 / i18n).

## 2.40. Sprint 019 완료 - 전략 탭 카테고리 그룹화 + 번호공 회귀 정정 (2026-05-02)

사용자 발화 2건 묶음 처리.

### 2.40.1. 번호공 시각 회귀 정정 (홈 추천 카드)

스크린샷 보고("추천 번호 구슬이 왜 이리 찌그러졌어?"). 8 / 27 / 30은 정원, 16 / 25 / 39 / 40은 가로 타원. 원인 = Sprint 013에서 `.num`을 `.num-cell` 래퍼로 감싸면서 `.num`의 `width:100%`가 inline-flex 부모(컨텐츠 폭 기반) 기준으로 계산 → 순환 참조 → 일부 셀의 폭이 글자 수에 따라 변동 → `aspect-ratio:1`로 가로폭 따라 height 결정 → 두 자리수 셀이 가로로 늘어남.

- 정정: `.draw-main .num-cell, .draw-bonus .num-cell { width:100%; max-width:52px; }` 추가 (모바일은 40px).
- 영향 파일: `styles/main.css` 1건.
- 테스트: 273/273 통과 (CSS 한정 → core 영향 0).

### 2.40.2. 전략 탭 카테고리 그룹화 (사용자 요청)

사용자 요청 "전략을 카테고리별로 묶어서 한줄씩 표시 같은 카테고리는 같은 줄". 11개 가로 스크롤 → 카테고리 4줄(통계 5 / 운세 매핑 2 / 사주 1 / 랜덤 3).

### 2.40.3. 자율 결정 사항 (4건)

- **줄 순서**: docs/02_data.md 1.5.2 표 순서 = 통계 → 운세 매핑 → 사주 → 랜덤. 카테고리 멤버 수 내림차순과 일치.
- **줄 앞 라벨 chip**: `.strategy-row-label` (한글 카테고리명 그대로). 카테고리 색 cascade (`.is-stats / is-mapping / is-saju / is-random`). aria-hidden(사용자 클릭 불가).
- **wrap 정책**: 한 줄당 1~5개라 데스크톱 / 모바일 모두 거의 한 줄 fit. 좁은 화면에서는 자연 줄 바꿈 (`flex-wrap: wrap`).
- **폐기**: 가로 스크롤 / fade mask / `is-start` / `is-end` / `scrollLeft` 모듈 변수 / 활성 탭 잘림 보정 / PC 휠 → 가로 변환 / FADE_PAD 상수 모두 제거. 카테고리 그룹화로 수단 자체가 불필요.

### 2.40.4. 영향 파일 (5건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: `docs/01_spec.md` (4.7.1~4.7.6 → 4.7.1~4.7.5 재작성), `docs/02_data.md` (1.5.2.4 갱신), `src/render/strategy-tabs.js` (CATEGORY_ROW_ORDER 신설 + rows 그룹 렌더), `src/render/main.js` (strategyScrollLeft / fade / wheel 핸들러 일체 폐기), `styles/main.css` (`.strategy-tabs` 가로 스크롤 룰 → wrap 컨테이너 + `.strategy-row` / `.strategy-row-tabs` / `.strategy-row-label` 신설).

### 2.40.5. QA 결과

- core/ DOM 의존성: 0건 (변경은 render/ + styles/ + docs/만).
- 사행성 표현: 0건.
- 매직 넘버: chip 픽셀(`padding: 2px 8px`, `min-width: 56px`)은 기존 `.five-set-chip` 등과 동일 패턴 (인라인 픽셀 허용 영역).
- 잔존 코드 점검: `strategyScrollLeft` / `FADE_PAD` / `is-start` / `is-end` 잔존 = 0건 (주석 1줄만).
- docs SSOT 정합: 01_spec.md 4.7 재작성 + 02_data.md 1.5.2.4 갱신 + 둘 사이 cross-ref 유지.
- 테스트: 273/273 통과.

### 2.40.6. 트레이드오프

- 잃은 것: 4.7.2~4.7.6의 정밀 가로 스크롤 정책(fade affordance / 활성 탭 잘림 보정 / PC 휠 변환). 약 70줄 정도의 CSS / JS 폐기.
- 얻은 것: (1) 카테고리 그룹 가시성 - 사용자가 전략 본질을 한눈에. (2) 코드 단순화 - 3종의 보존 / 보정 / 변환 로직 일체 제거. (3) 정보 밀도 상승 - 4줄 그룹이 1줄 스크롤보다 한 화면에서 보이는 정보량 큼.
- 잠재 비용: 세로 공간 약간 증가 (1줄 → 4줄). 추첨 탭 fold 위 압박 가능. 모바일 검증 필요.

### 2.40.7. 다음 sprint 후보

- Sprint 020: 카테고리 한글 라벨도 `numbers.js` SSOT로 (현재 `STRATEGY_CATEGORIES`는 영문 ID, `STRATEGIES`는 한글 라벨, `CATEGORY_ROW_ORDER`는 한글 인라인). 단 작은 정리.
- Sprint 021: jsdom 도입 → render/ 일부 테스트 (Sprint 017 잔존 위험).
- Sprint 022: hub CI 표준 sudoku/tetris 확장.
- 보류 항목 그대로 (#7 OCR / 결제 / i18n).

## 2.39. Sprint 018 완료 - MBTI 전면 폐지 (2026-05-02)

사용자 의문 ("MBTI가 들어가는 게 맞나?") → B안 채택 → 코드 / docs / 테스트 / CSS 모두 정리.

### 2.39.1. 폐지 사유 (3건)

1. **데이터 출처 이질성**: 사주/별자리는 생년월일 자동 산출 / MBTI만 사용자 직접 입력. 캐릭터 정체성 견고함 약화.
2. **컨셉 부정합**: 사주/별자리는 운명론 전통이지만 MBTI는 심리유형 분류라 "행운"과 결이 다름.
3. **IP 회색 지대**: "MBTI"는 The Myers-Briggs Company 등록 상표. 게임 도메인에서 광범위하게 사용되지만 굳이 위험 떠안을 이유 없음.

### 2.39.2. 작업 범위 (4건)

- **S8-T1 코드**: `numbers.js` (STRATEGY_MBTI / MBTI_TYPES / MBTI_LUCKY 삭제, STRATEGY_CATEGORIES 재정의), `recommend.js` (mbtiWeights / 분기 / mbti 파라미터 삭제), `character-form.js` (MBTI select / 파싱 / 저장 삭제), `character-card.js` (4종→3종 토글 / collectLuckySources MBTI 케이스 삭제 / mbtiLabel 삭제), `strategy-picker.js` (STRATEGY_MBTI 라인 삭제), `main.js` (ctx.mbti 전달 삭제), `history.js` (mbti 보관 삭제), `styles/main.css` (`.char-mbti`, `.lucky-element-mbti` 삭제).
- **S8-T2 docs SSOT**: 02_data 1.5 표 12→11 / 1.5.1 시드 의존 7→6 / 1.5.2 카테고리 운세 매핑 3→2 / 1.5.2.5 4종→3종 / 1.13 폐지 명시 / 3.6 Character.mbti deprecated. 01_spec 4장 / 5.1.3 / 5.4 / 5.9 갱신. README.md 12→11 + MBTI 라인 삭제.
- **S8-T3 테스트**: recommend.test.js MBTI 케이스 2개 + import 정리, history.test.js fakeCharacter mbti 필드 삭제.
- **S8-T4 마이그레이션**: 기존 `character.mbti` 필드는 localStorage에 잔존하나 미사용 처리 (load 시 무시). `lastUsedStrategy === 'mbti'` 캐릭터는 main.js에서 `STRATEGY_DEFAULT`로 fallback. `lastUsedStrategies` 배열도 `'mbti'` 필터링 + 빈 배열 시 default 보완.

### 2.39.3. 영향 파일 (15건)

- 신규 0건. 삭제 0건. 모두 수정.
- 수정: docs/01_spec.md / docs/02_data.md / src/data/numbers.js / src/core/recommend.js / src/core/history.js / src/render/character-form.js / src/render/character-card.js / src/render/strategy-picker.js / src/render/main.js / styles/main.css / tests/suites/recommend.test.js / tests/suites/history.test.js / README.md / PROGRESS.md.

### 2.39.4. QA 결과

- core/ DOM 의존성: 0건.
- 사행성 표현: 0건.
- 옛 라벨 잔존: 0건.
- 매직 넘버: 0건.
- 코드 내 MBTI 잔존 = **마이그레이션 가드 + 주석만** (실 사용 0건).
- docs SSOT: 02_data 4종 + 01_spec 4종 + README 갱신.
- 테스트: 273/273 통과 (275에서 MBTI 2건 제거됨, 65~70ms).

### 2.39.5. 트레이드오프

- 잃은 것: 12전략 → 11전략, 4종 행운 → 3종, 캐릭터 정체성 1축 (MBTI).
- 얻은 것: IP 위험 0, 컨셉 일관성 (사주/별자리 = 운명론, MBTI 이질성 제거), 캐릭터 폼 단순화, 자동 산출 100% (사용자 직접 입력 0).
- localStorage `mbti` 필드는 잔존 안전 (미사용 처리). 강제 마이그레이션 없음.

### 2.39.6. 다음 sprint 후보

- Sprint 019: jsdom 기반 render/ 일부 테스트 (Sprint 017 위험 4.2 보강).
- Sprint 020: hub CI 표준 sudoku/tetris로 확장.
- 보류 항목 (#7 OCR / 결제 / i18n).

## 2.38. Sprint 017 완료 - 자동 회귀 환경 + 결손 3건 정정 (2026-05-02)

리뷰에서 식별된 가장 큰 위험("render/ 미테스트 + 자동 회귀 환경 부재")의 후자 우선 보강. 자율 진행 가능 범위.

### 2.38.1. S7-T1 Node CLI 테스트 진입점

- `tests/core.js`: `typeof document` 환경 가드 추가. 브라우저는 DOM 출력, Node는 console + process.exit. 0 의존성.
- `tests/run-node.js` 신설: localStorage polyfill (MemoryStorage) + fetch no-op + runner.js dynamic import. `node tests/run-node.js` 단일 명령으로 전체 suite 실행 (98ms, 275 케이스).
- 기존 브라우저 진입점(`tests/test.html` → `runner.js`)은 무변경. 양쪽 환경 모두 동작.

### 2.38.2. S7-T2 GitHub Actions 워크플로우

- `.github/workflows/test-lotto.yml` 신설.
- trigger: push to main / PR to main (path filter: `games/lotto/**` + 워크플로우 자체).
- 단일 step: `node tests/run-node.js` (lotto 폴더에서). FAIL 시 exit 1 → CI 빨간불.
- 기존 `fetch-lotto.yml`과 분리 (관심사 분리).

### 2.38.3. CI 도입 즉시 가치: 기존 결손 3건 자동 노출 + 정정

자동화의 본질적 가치 = "내가 모르는 결손 발견". 도입 첫 실행에서 3건 노출:

| # | 결손 | 정정 |
|---|---|---|
| 1 | `match.test.js` "5등 경계" - 입력 [3,7,12,40,**41**,42]에 41이 발표 본번호에 있어 4개 일치 → 4등이 정답이지만 expected 5 (테스트 의도와 어긋남) | 입력을 [3,7,12,40,42,43]로 정정 (5등 경계 재현) |
| 2 | `schedule.js nextDrawTimeFromNow` 정각 처리 - 토 20:00 정각이면 isBeforeDraw=true로 같은 날 반환. spec 5.2.2.6 ("0에 도달하면 다음 토요일로 갱신")과 충돌 | 정각도 isBeforeDraw=false 처리 → 다음 주로 넘어감. 코드 결손 정정 |
| 3 | `reverse.test.js` "5등 (3개 일치)" - 입력 [1,2,3,11,12,13]에 대해 sampleDraws의 drw 100과 drw 102 모두 5등 매칭이라 counts[5]=2가 정답이지만 expected 1 (주석 자체가 "drw 100 + drw 102"라며 의도는 2였으나 잘못 적힘) | counts[5]=2로 정정 + 테스트 이름에 "동률 2회" 명시 |

275/275 PASS. 결손 0건.

### 2.38.4. 영향 파일 (8건)

- 신규 2건: `tests/run-node.js`, `.github/workflows/test-lotto.yml`.
- 수정 6건: `tests/core.js` / `src/core/schedule.js` / `tests/suites/match.test.js` / `tests/suites/reverse.test.js` / `games/lotto/CLAUDE.md` / `games/CLAUDE.md` / `PROGRESS.md`.

### 2.38.5. QA 결과

- core/ DOM 의존성: 0건.
- 사행성 표현: 0건.
- 옛 라벨 잔존: 0건.
- 매직 넘버: 0건.
- docs SSOT: lotto CLAUDE.md 7장 + 8장 갱신, hub CLAUDE.md 4장 갱신.
- 테스트 통과: 275/275 (Node CLI 98ms).

### 2.38.6. 트레이드오프 (잔존)

- `render/` 미테스트 상태는 본 sprint 비범위. 본질적으로 DOM 의존이라 jsdom 도입 비용 큼. 향후 별도 sprint에서 체크.
- 회귀 자동화 = core/ + data/ 한정. render/ wiring 회귀는 여전히 사용자 수동 검증.
- localStorage polyfill = MemoryStorage (in-memory). 브라우저 환경의 영속성 / 다른 탭 동기화 등은 검증 불가. 단순 read/write 정상성만 보장.

### 2.38.7. 다음 sprint 후보

- Sprint 018 (Safety+): jsdom 도입해 render/ 일부 테스트 추가. 작업량 큼.
- Sprint 019: hub 표준 워크플로우 sudoku/tetris로 확장 (현재 lotto 전용).
- 보류 항목 그대로 (#7 OCR 사용자 보류 / 결제 / i18n).

## 2.37. Sprint 016 완료 - 매핑 정직성 강화 (#10 A안) (2026-05-02)

사용자 결정 = A안 채택. 사주/별자리/MBTI 매핑이 임의라는 사실을 UI 3곳 + docs 4곳에 명시 강제.

### 2.37.1. S6-T1 라벨 강화 (UI 3곳)

- src/render/character-card.js: 4종 캐프션을 `임의 매핑 · {분야} 학설과 무관 · 추첨 확률 영향 없음`으로 통일.
  - 사주: 명리학 학설과 무관
  - 별자리: 점성술 학설과 무관
  - 4원소: 점성술 학설과 무관
  - MBTI: 16Personalities 학설과 무관
- src/render/strategy-tabs.js: 활성 전략의 카테고리가 운세 매핑 / 사주일 때 desc 아래 면책 1줄(`.strategy-mapping-note`).
- src/core/recommend.js: astrologer / mbti / zodiacElement / fiveElements 4종 reasons에 `(임의 매핑, 추첨 확률 영향 없음)` 접미 추가. 통계 / 랜덤 카테고리는 그대로(매핑 아니므로).
- styles/main.css: `.strategy-mapping-note` italic 11px text-dim.

### 2.37.2. S6-T2 docs SSOT 출처 명시

- docs/02_data.md 1.5.2.5 신설(운세 매핑/사주 정직성 강제 정책 + UI 3곳 노출 위치 명시).
- docs/02_data.md 1.13 / 1.14 / 1.18 헤더에 "(임의 매핑)" + 표 위 인용 블록(`>`)으로 출처 강제.
- docs/01_spec.md 5.9.6 신설(캐릭터 카드 4종 토글의 정직성 카피 형식 강제).

### 2.37.3. 영향 파일 (8건)

- 신규 0건.
- 수정 8건: docs/01_spec.md / docs/02_data.md / src/core/recommend.js / src/render/character-card.js / src/render/strategy-tabs.js / styles/main.css / PROGRESS.md.

### 2.37.4. QA 결과

- core/ DOM 의존성: 0건 (recommend.js는 순수 함수, 문자열만 추가).
- 사행성 표현 위반: 0건 (오히려 정직성 강화).
- 옛 라벨 잔존: 0건 (라벨 자체는 그대로, 면책만 추가).
- 매직 넘버: 0건.
- docs SSOT 정합: 02_data.md 4종 + 01_spec.md 1종 갱신.
- 회귀: recommend.test.js의 reasons 검사는 includes 패턴이라 영향 없음. 4종 전략 reasons 면책 접미 검증 통과.

### 2.37.5. #10 명망 로직 결정 이력

- A안 채택. 사용자 결정(2026-05-02).
- 비채택안: B(공개 출처 인용 - "전문가 인용 = 더 맞을 것" 사행성 톤 위반 위험), C(사용자 정의 - 의미 중복), D(폐지 - 작업 회수 비용).
- 본 sprint로 #10 종결. 향후 매핑 변경 시 본 정직성 카피 형식 강제.

### 2.37.6. 다음 sprint 후보

- Sprint 017: 사용자 결정 필요 항목만 남음. 자율 진행 가능 폴리싱 사실상 소진.
- 보류 항목: #7 OCR (사용자 보류 명시), 결제 시스템(별도 윤리 가이드), i18n, sudoku/tetris html-game 표준 적용.

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

## 3.-18. Sprint 029 (완료, 2026-05-02 - 추천 보너스 UI 폐기 + "추천N" 라벨 S20)

사용자 지시. 결과는 2.50 영구 이력.

### 3.-18.1. 작업 범위

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S20 | UI에서 보너스 폐기 + "추천N" 라벨 + 5세트 / 이력 동기화 | 중 | **완료** |

### 3.-18.2. 자율 결정

- 데이터 (`rec.bonus`) 유지. UI만 폐기.
- 라벨 색 = 골드 (`--color-accent`).
- 5세트 인덱스 "#N" → "추천N".
- 이력 카드도 본번호만 표시.

## 3.-17. Sprint 028 (완료, 2026-05-02 - 다중 전략 항상 ON S19)

사용자 화남 + ok 진행. 결과는 2.49 영구 이력.

### 3.-17.1. 작업 범위

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S19 | multiStrategy 옵션 폐기, 항상 다중 모드. 분배 cap 6 유지 | 중 | **완료** |

### 3.-17.2. 자율 결정

- multiStrategy 키 마이그레이션 = loadOptions에서 자동 drop.
- lastUsedStrategy 단일 필드는 호환 보존 (deprecated, next[0]으로 갱신).
- 설정 탭 "다중 전략 모드" 행 + onMultiStrategyToggle 핸들러 통째로 제거.

## 3.-16. Sprint 027 (완료, 2026-05-02 - 풀 컷팅 + 균등 추첨 S18)

사용자 의도 = "어정쩡 절대 금지". 결과는 2.48 영구 이력.

### 3.-16.1. 작업 범위

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S18 | 통계 5종 + 운세 3종 weight를 풀 컷팅 + 균등으로 재작성. 사주 일진 풀 합집합으로 단순화. | 중 | **완료** |

### 3.-16.2. 자율 결정

- STATS_POOL_SIZE = 10 (전략별 차별화는 후속).
- 사주 일진 boost 차등 폐기, 풀 합집합으로 단순화 (균등이 "어정쩡 금지" 정책과 정합).
- 축복받은 자 / 직감 / 균형 조합은 풀 컷팅 미적용 (의미 다름).

## 3.-15. Sprint 026 (완료, 2026-05-02 - 행운 쌓기 위치 이동 S17)

사용자 지시 1줄. 결과는 2.47 영구 이력.

### 3.-15.1. 작업 범위

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S17 | 홈 탭 렌더 순서: 행운 쌓기를 히어로 직하 → 전략 탭 하위로 이동 | 작 | **완료** |

## 3.-14. Sprint 025 (완료, 2026-05-02 - 사주 일진 강화 S16 + variability chip)

사용자 의문 → B안 채택 + 추가 지시(variability 표시). 결과는 2.46 영구 이력.

### 3.-14.1. 작업 범위 (1건, 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S16 | 사주 행운 추첨일 일진 보너스 + variability chip 2위치 | 중~큼 | **완료** |

### 3.-14.2. 자율 결정 사항

- boost 비율 = 통변성 우선순위 (인성 > 식상 > 비견 = 재성 > 관성).
- variability chip 색 = 주간(그린) / 평생(회색).
- chip 위치 = 캐릭터 카드 행운 패널 + 전략 탭 desc.
- 미래 회차 추첨일 = `nextDraw().drawAtMs` KST 변환.

### 3.-14.3. 비범위

- 별자리 / 4원소 transit 적용 → 학설 약함, 복잡도 큼, 비권장.
- 통변성 세분화 (정/편 구분) → 단순화 채택.

## 3.-13. Sprint 024 (완료, 2026-05-02 - 학설 기반 매핑 재작성 S15)

사용자 의문 → 자비스 위험 점검 → 사용자 책임 인수 + "진짜를 원해" → A안 채택. 결과는 2.45 영구 이력 참조.

### 3.-13.1. 작업 범위 (1건, 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S15 | 별자리 12종 + 4원소 + 5오행 학설 기반 재작성 + 면책 톤 / docs SSOT / 코드 / 주석 일괄 갱신 | 큼 | **완료** |

### 3.-13.2. 자율 결정 사항

- 별자리 = Sun Sign # + Ruler #. Ruler는 전통 통치자.
- 4원소 = 별자리 ruler 합집합 (Aquarius는 Uranus#4, Pisces는 Jupiter#3 채택 - 현대/전통 혼합 자비스 권장).
- 5오행 = 河圖數 끝자리 확장 (가장 출처 명확).
- 면책 카피 "전통 ○○ 출처 · 학설 자체는 과학 검증 없음 · 추첨 결과 보장 없음" 3 위치 통일.

### 3.-13.3. 비범위

- 별자리 ruler의 점성가별 미세 차이(예: Aquarius 통치자 = Saturn vs Uranus) 사용자 선호 반영 → 후속 결정 시 변경.
- 학설 출처별 보조 lucky 추가 (Linda Goodman 등) → 단순성 위해 ruler / Sun sign 단일 출처로 한정.
- numerology 단일수 환원(theosophical reduction) 외 다른 reduce 방식 (Pythagorean / Chaldean) → 채택 안 함.

## 3.-12. Sprint 023 (완료, 2026-05-02 - 행운 쌓기 한 줄 바 / 사행성 라벨 차단)

사용자 지시 + 자비스 정책 게이트(라벨 위반 차단) + 사용자 권장안 채택. 결과는 2.44 영구 이력 참조.

### 3.-12.1. 작업 범위 (1건, 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S14 | 한 줄 바 + 8 아이콘 진척도 + 모달 재구성 (제목 + 동일 정보 + 빈 애니 영역 + 그리드) | 큼 | **완료** |

### 3.-12.2. 자율 결정 사항

- 라벨 "행운 쌓기" (B안). "당첨 확률 올리기"는 정책 위반으로 거부.
- 게이지 바 폐기, 8 아이콘 진척도. 백엔드 상수 그대로.
- 행위 클릭 burst를 빈 영역 anchor로. 만땅 burst도 동일 anchor (모달 가림 회피).
- 모달 내 동일 정보 재표시는 aria-hidden + cursor:default.

### 3.-12.3. 비범위

- 모바일 좁은 화면 검증(360px) → Sprint 025 후보.
- 게이지 % 표기 부활 → 사용자 피드백 시.

## 3.-11. Sprint 022 (완료, 2026-05-02 - 캐릭터 슬롯+카드 세트 배치)

사용자 지시(스크린샷). 결과는 2.43 영구 이력 참조.

### 3.-11.1. 작업 범위 (1건, 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S13 | 홈 탭 렌더 순서 변경 (슬롯이 카드 위로) | 작 | **완료** |

### 3.-11.2. 자율 결정 사항

- 단순 인접 배치 (wrapper 미사용).
- 의식 위젯 위치 자연 승격 (히어로 직하).
- CSS 변경 0건.

### 3.-11.3. 비범위

- wrapper section 시각 묶음 (border / padding 통일) → 피드백 시 후속.
- 슬롯/카드 사이 spacing 미세 조정 → 현재 기본 spacing 유지.

## 3.-10. Sprint 021 (완료, 2026-05-02 - 줄 순서 변경 + 라벨 직관화)

사용자 발화 2건. 결과는 2.42 영구 이력 참조.

### 3.-10.1. 작업 범위 (2건, 모두 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S11 | 줄 순서 통계→운세→랜덤 → 운세→랜덤→통계 | 작 | **완료** |
| S12 | 전략 라벨 직관화 ("별자리 4원소"→"원소 행운", "일주 오행"→"사주 행운") | 작~중 | **완료** |

### 3.-10.2. 자율 결정 사항

- 표/UI 줄 순서 동시 변경 (SSOT 일관).
- "○○ 행운" 톤 통일.
- 행운 토글 tabLabel은 chip 길이 제약으로 그대로.
- 도메인 정의 표(1.14 / 1.18) 라벨은 매핑 출처라 그대로.

### 3.-10.3. 비범위

- "별자리 행운" / "원소 행운" 라벨 차별화 강화 (사용자 피드백 시 후속).
- 캐릭터 카드 행운 토글 라벨 통일 (현재 chip 길이라 미변경).

## 3.-9. Sprint 020 (완료, 2026-05-02 - 운세/사주 카테고리 통합)

사용자 의문 → A안 + 라벨 "운세" 채택. 결과는 2.41 영구 이력 참조.

### 3.-9.1. 작업 범위 (1건, 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S10-T1 | 운세 매핑 + 사주 → 운세 카테고리 통합 (코드 5건 + docs 2건 + CSS 1건) | 중 | **완료** |

### 3.-9.2. 자율 결정 사항

- 라벨 한글명 = "운세" (사용자 추가 지시 채택). 영문 ID = 'mapping' 통일.
- 캐릭터 카드 행운 토글 색은 카테고리와 별개 차원으로 분리, 유지.
- 면책 카피의 "점성술·명리학" 분야명은 정직성 차원이라 그대로.

### 3.-9.3. 비범위

- 카테고리 한글 라벨 SSOT 일원화 (CATEGORY_ROW_ORDER → numbers.js) → Sprint 023 후보.
- localStorage 강제 마이그레이션 → 불필요 (전략 ID 그대로).

## 3.-8. Sprint 019 (완료, 2026-05-02 - 카테고리 그룹화 + 번호공 회귀)

사용자 발화 2건. 결과는 2.40 영구 이력 참조.

### 3.-8.1. 작업 범위 (2건, 모두 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S9-T1 | 번호공 시각 회귀(`.num-cell` 폭 보정 1~2줄) | 작 | **완료** |
| S9-T2 | 전략 탭 카테고리 그룹화 (가로 스크롤 폐기 + wrap 4줄 + 라벨 chip) | 중 | **완료** |

### 3.-8.2. 자율 결정 사항

- 줄 순서 = 통계 / 운세 매핑 / 사주 / 랜덤 (docs/02_data.md 1.5.2 표 순서 = 멤버 수 내림차순).
- 라벨 chip은 한글 카테고리명 그대로. 클릭 불가 (aria-hidden).
- 가로 스크롤 정책 4.7.2~4.7.6 일체 폐기. wrap만으로 충분(한 줄당 5개 이하).

### 3.-8.3. 비범위

- 카테고리 한글 라벨 SSOT 일원화 (CATEGORY_ROW_ORDER → numbers.js로 이동) → Sprint 020 후보.
- jsdom render/ 테스트 (위험 잔존, 별개 sprint).

## 3.-7. Sprint 018 (완료, 2026-05-02 - Cleanup: MBTI 폐지)

사용자 결정 = B안. 결과는 2.39 영구 이력 참조.

### 3.-7.1. 작업 범위 (4건, 모두 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S8-T1 | 코드 - 8개 파일 정리 | 큼 | **완료** |
| S8-T2 | docs SSOT + README | 중 | **완료** |
| S8-T3 | 테스트 정리 | 중 | **완료** |
| S8-T4 | 마이그레이션 fallback | 작 | **완료** |

### 3.-7.2. 자율 결정 사항

- 기존 `character.mbti` 필드는 localStorage 잔존 안전. 강제 마이그레이션 없음.
- `lastUsedStrategy === 'mbti'`는 `STRATEGY_DEFAULT`로 fallback.
- `lastUsedStrategies` 배열 내 `'mbti'`는 필터링 + 빈 배열 시 default 보완.
- 코드 내 'mbti' 잔존은 **마이그레이션 가드 + 주석만** (실 사용 0).

### 3.-7.3. 비범위

- localStorage 필드 강제 삭제 (load 시 미사용으로 충분)
- Character 스키마 `mbti` 필드 완전 제거 (deprecated 표기로 충분)

## 3.-6. Sprint 017 (완료, 2026-05-02 - Safety Net: 자동 회귀)

리뷰에서 가장 큰 위험으로 식별된 "render/ 미테스트 + 자동 회귀 부재" 중 후자 보강. 결과는 2.38 영구 이력 참조.

### 3.-6.1. 작업 범위 (3건, 모두 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S7-T1 | Node CLI 테스트 진입점 (`tests/run-node.js` + core.js 환경 가드) | 중 | **완료** |
| S7-T2 | GitHub Actions 워크플로우 (`test-lotto.yml`) | 작 | **완료** |
| S7-T3 | 문서화 (lotto CLAUDE 7/8장 + hub CLAUDE 4장) | 작 | **완료** |

### 3.-6.2. 자율 결정 사항

- 0 의존성 우선. jsdom/Playwright 미사용 (core/data만 검증).
- localStorage는 MemoryStorage polyfill (data/storage.js + storage.test.js 동작 보장).
- 진입점 분리: 브라우저(`tests/test.html`) / Node(`tests/run-node.js`). core.js는 양쪽 호환 (`typeof document` 가드).
- workflow는 lotto 전용 (sudoku/tetris 표준 적용은 별개 sprint).
- 도입 즉시 발견된 결손 3건은 **본 sprint에서 정정** (CI 가치 = 결손 발견 + 정정).

### 3.-6.3. 비범위

- jsdom 기반 render/ 테스트 (Sprint 018 후보)
- sudoku/tetris CI (별개 sprint)
- coverage 리포트 (현재 PASS/FAIL만)

## 3.-5. Sprint 016 (완료, 2026-05-02 - Honesty: #10 A안)

사용자 결정 = A안. 결과는 2.37 영구 이력 참조. #10 명망 로직 종결.

### 3.-5.1. 작업 범위 (2건, 모두 완료)

| ID | 작업 | 양 | 상태 |
|---|---|---|---|
| S6-T1 | 매핑 카테고리 라벨 강화 (UI 3곳) | 작 | **완료** |
| S6-T2 | docs SSOT 출처 명시 (02 1.5.2.5 + 1.13/1.14/1.18 + 01 5.9.6) | 작 | **완료** |

### 3.-5.2. 자율 결정 사항

- 톤 통일: `임의 매핑 · {분야} 학설과 무관 · 추첨 확률 영향 없음`.
- 노출 위치: 캐릭터 카드 캡션 / 전략 탭 mapping-note / 추천 reasons 접미. 3곳 모두 강제.
- "행운" 단어는 유지 (캐릭터 정체성). 면책 카피로 오해만 차단.
- 통계 / 랜덤 카테고리는 변경 없음 (매핑 아님).

### 3.-5.3. 비범위

- 면책 모달 신설 (현재 첫 진입 면책으로 충분)
- 행운 번호 표시 폐지 (D안 - 작업 회수 비용)
- 사용자 정의 행운 번호 (C안 - 의미 중복)

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
