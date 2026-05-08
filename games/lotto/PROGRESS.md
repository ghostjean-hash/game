# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-08 (Sprint 044 - 짝꿍 페어 폐기 + 랜덤 카테고리 카피 정체성 강화 / S34).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리**: 1차 2026-05-04 (Sprint 010 이전 ~ 031 + 옛 백로그 3.-18 ~ 3.0 archive 이전). 2차 2026-05-08 (Sprint 032~039 추가 archive 이전). 직전 5 Sprint(040~044)만 본 파일에 활성. `PROGRESS_ARCHIVE.md` 참조.

# 2. 완료 마일스톤 (활성: 직전 5 Sprint)

> 이전 Sprint 이력(2.1 ~ 2.60, M0~M6 / 폴리싱 / Sprint 010~039) → `PROGRESS_ARCHIVE.md` 참조.

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

