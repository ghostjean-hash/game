# 02. 게임 데이터

## 1. 수치 상수

### 1.1. 6/45 룰

| 상수 | 값 | 의미 |
|---|---|---|
| `NUMBER_MIN` | 1 | 본번호 최소값 |
| `NUMBER_MAX` | 45 | 본번호 최대값 |
| `PICK_COUNT` | 6 | 본번호 추첨 개수 |
| `BONUS_COUNT` | 1 | 보너스볼 개수 |

### 1.2. Luck 스탯

| 상수 | 값 | 의미 |
|---|---|---|
| `LUCK_MIN` | 0 | 균등 분포 |
| `LUCK_MAX` | 100 | 시드 6개로 극도 쏠림 |
| `LUCK_INITIAL` | 10 | 신규 캐릭터 초기값 |
| `LUCK_BONUS_HIT` | +5 | 적중(4등 이상) 시 보너스 |
| `LUCK_BONUS_DAILY` | +1 | 출석 보너스 |

### 1.3. 통계 윈도우 (Hot/Cold 회차 수)

| 상수 | 값 | 용도 |
|---|---|---|
| `RECENT_SHORT` | 10 | 단기 |
| `RECENT_MID` | 30 | 중기 (보너스볼 기본) |
| `RECENT_LONG` | 100 | 장기 |

### 1.4. 비율 필터 (역대 다수 영역)

| 상수 | 값 | 의미 |
|---|---|---|
| `SUM_RANGE_MIN` | 121 | 번호합 다수 영역 하한 |
| `SUM_RANGE_MAX` | 160 | 번호합 다수 영역 상한 |
| `AC_VALUE_MIN` | 6 | AC값 다수 영역 하한 |
| `AC_VALUE_MAX` | 10 | AC값 다수 영역 상한 |
| `ODD_EVEN_PREFERRED` | `[3, 3]` | 홀짝 우세 비율 |

### 1.5. 추첨 전략 ID

캐릭터 속성이 아니라 **추첨 시 사용자가 선택**하는 가중치 정책입니다. 같은 캐릭터로 11가지 전략 모두 시도 가능. (S8, 2026-05-02 MBTI 폐지 - 데이터 출처 이질성 + IP 회색 지대 + 컨셉 부정합 사유.)

| ID | UI 라벨 | UI 설명 | 카테고리 | 가중치 정책 | 의존성 |
|---|---|---|---|---|---|
| `blessed` | 축복받은 자 | 모든 번호에서 균등 추출, Luck이 시드 번호 가중치를 강화 | **랜덤** | 균등 + Luck 분산 | 시드+Luck |
| `statistician` | 많이 나온 수 | 역대 회차에 가장 많이 나온 번호 위주 | **통계** | 본번호 누적 빈도 가중 (`count^STATS_POWER`) | **객관** |
| `secondStar` | 보너스볼 | 역대 보너스볼로 자주 나온 번호 위주 (본번호 + 보너스 모두 적용) | **통계** | 본번호 + 보너스 모두 보너스볼 빈도 가중 (`count^STATS_POWER`) | **객관** |
| `regressionist` | 안 나온 수 | 오랫동안 안 나온 번호 위주 | **통계** | 미출현 갭 가중 (`gap^GAP_POWER`) | **객관** |
| `pairTracker` | 짝꿍 번호 | 캐릭터 키번호와 자주 함께 나왔던 번호 묶음 | **통계** | 시드 키번호와 동시출현 페어 가중 | 시드 |
| `astrologer` | 별자리 행운 | 캐릭터 별자리 12종의 행운 번호 위주 | **운세** | 별자리 행운 번호 5배 boost | 시드 |
| `trendFollower` | 최근 트렌드 | 최근 30회에 자주 나온 번호 위주 | **통계** | 최근 30회 Hot 번호 가중 (raw, recent30 0~9 자연 분포) | **객관** |
| `intuitive` | 직감 | 회차마다 다른 분포 (같은 캐릭터는 같은 결과) | **랜덤** | 매 회차 다른 무작위 가중 (시드 결정론 유지) | 시드 |
| `balancer` | 균형 조합 | 번호 합 121~160 + 홀짝 3:3 필터를 통과한 조합만 | **랜덤** | 합 121~160 + 홀짝 3:3 (최대 50회 재추첨) | **객관** |
| `zodiacElement` | 원소 행운 | 별자리 4원소(불/땅/공기/물) 그룹 행운 번호 | **운세** | 4원소 그룹별 행운 번호 5배 boost | 시드 |
| `fiveElements` | 사주 행운 | 캐릭터 일주의 천간 오행(목/화/토/금/수) 행운 번호 | **운세** | 5원소 그룹별 행운 번호 5배 boost | 시드 |

기본 전략: `blessed` (`STRATEGY_DEFAULT`).

#### 1.5.1. 객관 전략 vs 시드 의존 전략 (결정론 차원)

- **객관(5개)**: `statistician` / `secondStar` / `regressionist` / `trendFollower` / `balancer`. 회차 데이터(통계)만 입력. **캐릭터 시드와 Luck 모두 무관**. 같은 회차에서 모든 캐릭터가 동일 결과. 결정론 시드: `mixSeeds(mixSeeds(drwNo, OBJECTIVE_SEED_SALT), strategyHash(strategyId))` (S21, 2026-05-03 - 전략별 시드 분산).
- **시드 의존(6개)**: `blessed` / `pairTracker` / `astrologer` / `intuitive` / `zodiacElement` / `fiveElements`. 캐릭터 시드 + drwNo + Luck. 캐릭터별 다른 결과. 결정론 시드: `mixSeeds(seed, drwNo)`.
- 분류 위치: `src/data/numbers.js` `OBJECTIVE_STRATEGIES` Set. 분기 위치: `src/core/recommend.js`.
- 트레이드오프: 객관 전략은 사용자가 캐릭터를 바꿔도 결과 동일. 그것이 객관 통계의 본질. 캐릭터 차별화는 시드 의존 7개에서.

#### 1.5.4. 다중 전략 분배 (S3-T1, 2026-05-02 신설)

**S19 (2026-05-02)**: `options.multiStrategy` 폐기, 항상 다중 모드. 전략 탭은 토글로 동작 (1~6개 선택). 각 전략별로 본번호를 균등 분배 후 카드에 1글자 short 라벨(카테고리 색 배경)로 출처 표시. 단일 전략 = 1개 토글. (S22, 2026-05-03 dot → 1글자 라벨로 교체.)

| 상수 | 값 | 의미 |
|---|---|---|
| `MULTI_STRATEGY_MAX` | 6 | 다중 모드 최대 선택 수 (분배 1+1+1+1+1+1) |

1.5.4.1. **분배 룰 (A안 균등)**: `distributeCounts(n)` = base 6/n + 나머지를 첫 N에 +1.

| N | 분배 |
|---|---|
| 1 | 6 |
| 2 | 3 + 3 |
| 3 | 2 + 2 + 2 |
| 4 | 2 + 2 + 1 + 1 |
| 5 | 2 + 1 + 1 + 1 + 1 |
| 6 | 1 + 1 + 1 + 1 + 1 + 1 |
| 7+ | 비활성 (선택 불가, 만선 시 비활성 탭) |

1.5.4.2. **알고리즘 (S25, 2026-05-03 재작성 / C+E안)**: `core/recommend.js` `recommendMulti(ctx)`.
- **C안 - 풀에서 직접 count 추출**: 각 strategy의 weight를 `computeStrategyContext`로 계산 후, `weightedSample(weights, targetCount, seed, exclude=collected)`로 풀 안에서 직접 targetCount개 추출. 누적 collected를 exclude로 풀에서 사전 제외해 중복 0. **이전(S3-T1~S24): sub recommend 6개 추출 → 정렬 후 앞쪽 N개 채택 (잘라쓰기 휴리스틱)** → 작은 번호 편향. S25에서 폐기.
- **E안 - strategyIds 정규화**: 진입 직후 `STRATEGY_ORDER` 기준 sort. 사용자 클릭 순서 무관 → 같은 strategy 조합은 항상 같은 결과 + 같은 source 매핑.
- 부족분(풀 작은 strategy + 누적 exclude로 풀 비는 케이스): blessed 균등 fallback.
- 보너스: 정규화 후 첫 strategy의 보너스 풀에서 추출. 본번호와 겹치면 균등 재추출.
- balancer 다중 모드: 균형 필터(합 121~160 + 홀짝 3:3) 미적용. count<6이라 검증 불가.

1.5.4.3. **정규화 순서 (S25)**: `STRATEGY_ORDER` (`src/data/numbers.js`).
운세 3 → 랜덤 3 → 통계 5 (UI 노출 순서와 일치).
- 운세: astrologer → zodiacElement → fiveElements
- 랜덤: blessed → intuitive → balancer
- 통계: trendFollower → statistician → pairTracker → secondStar → regressionist

1.5.4.4. **출처 라벨**: 결과 객체에 `strategySources: string[]` (numbers와 동일 순서). draw-card에서 1글자 short(`strategy.short`) + 카테고리 색 배경 표시 (단일 모드는 빈 배열 → 라벨 미표시). S22 (2026-05-03) 이전엔 카테고리 색 dot이었으나 같은 카테고리 안 여러 전략 식별 불가 → short 1글자로 교체.
1.5.4.5. **최소 1개 보장**: 다중 모드에서 마지막 1개 토글 제거는 무시 (전략 0개 방지).
1.5.4.6. **백캐스트 영향 없음**: `backfillRecommendations`은 단일 전략으로 결정론 유지. 다중 모드여도 history는 첫 전략 기준.

1.5.4.7. **S25 풀 평균 수렴 검증**: 운세 3개(별자리/원소/사주) 결과 평균이 풀 합집합 평균(22~30 케이스 의존)에 수렴. 이전 S3-T1~S24는 평균 6~9 (작은 번호 편향). 회귀 테스트 `tests/suites/recommend.test.js` "S25 recommendMulti: 운세 3개 평균 풀 평균에 수렴".

#### 1.5.5. 5세트 동시 추천 (S4-T1, 2026-05-02 신설)

옵션 `options.fiveSets = true` 활성 시 한 회차에 5장의 추천 세트를 동시 표시. 시드 변형(salt)으로 5개 다른 결정론 결과. 다중 전략 모드와 직교(병행 가능).

| 상수 | 값 | 의미 |
|---|---|---|
| `FIVE_SETS_COUNT` | 5 | 한 번에 노출할 세트 수 |
| `FIVE_SETS_SALT_BASE` | `0x5E7A` | 세트별 시드 변형 솔트 베이스 |

1.5.5.1. **시드 변형 룰**: 세트 i (0~4)의 입력 시드 = `mixSeeds(baseSeed, FIVE_SETS_SALT_BASE + i)` 단, i=0은 baseSeed 그대로(메인 = 기존 동작 호환).
1.5.5.2. **결정론 유지**: 같은 캐릭터 + 같은 회차 + 같은 전략 = 같은 5세트. 다중 모드 ON이면 각 세트 안에서 다중 분배 동일 룰 적용.
1.5.5.3. **객관 전략 처리**: 객관 전략(1.5.1)은 캐릭터 시드 무관 → 5세트가 모두 같은 결과가 되면 의미 없음. 따라서 5세트 모드의 객관 전략은 시드 변형을 `mixSeeds(drwNo, OBJECTIVE_SEED_SALT + i)`로 바꿔 회차 내부에서 5개 분기 시드를 만든다(여전히 캐릭터 무관, 회차 단위 결정론).
1.5.5.4. **이력 / Luck 영향**: history 기록 + Luck 매칭은 **#1(메인)에만** 적용. #2~#5는 표시 전용(서사적 "다른 시도"). 백캐스트 영향 없음. 의식 만땅 보너스(Luck +5)는 #1에만 작용(추천 알고리즘 영향 없음 원칙 유지).
1.5.5.5. **다중 모드 + 5세트 호환**: ON+ON 시 각 세트가 strategySources 라벨을 별도 보유. 5장 모두 1글자 short 라벨 표시 (5세트 컴팩트 카드는 더 작은 폰트, S22).
1.5.5.6. **알고리즘**: `core/recommend.js` `recommendFiveSets(ctx)` → `RecommendationSet[]` 길이 `FIVE_SETS_COUNT`. 단일/다중 분기는 내부에서.
1.5.5.7. **사행성 회피**: 라벨에 "확률" / "필승" / "당첨 보장" 사용 금지. 5세트는 "5번의 다른 시도", "한 회차의 다양한 가능성"으로만 표현. 비용 권장 표기 금지(실제 5장 구매 권유 아님).
1.5.5.8. **기본 OFF**. 라이트 사용자 비노출(설정 탭 토글로만 진입). 다중 모드와 동일한 노출 정책.

#### 1.5.2. 카테고리 (콘텐츠 차원)

11전략을 가중치 소스 본질로 분류. 결정론 차원(1.5.1)과 직교하는 별도 차원.

| 카테고리 | 본질 | 전략 수 | 멤버 |
|---|---|---|---|
| **운세** | 생년월일 기반(별자리 / 사주) → 행운 번호 임의 매핑 | 3 | astrologer / zodiacElement / fiveElements |
| **랜덤** | 통계 / 매핑 모두 무관. 균등 + 시드 또는 필터 | 3 | blessed / intuitive / balancer |
| **통계** | 회차 데이터를 weight 소스로 사용 | 5 | statistician / secondStar / regressionist / trendFollower / pairTracker |

표 / UI 줄 순서는 **운세 → 랜덤 → 통계** (S11, 2026-05-02). 캐릭터 정체성/콘텐츠 우선, 객관 통계는 후순위 노출.

1.5.2.1. **통계** 카테고리는 객관(데이터 신뢰)이 본질. 캐릭터 영향 여부는 1.5.1 결정론 차원에서 별도 결정.
1.5.2.2. **운세** 카테고리는 임의 매핑이라 통계 신뢰는 없음. 콘텐츠 / 캐릭터 정체성 / 서사화 목적. 추첨 확률 영향 없음. 서양 점성술(별자리 / 별자리 4원소)과 동양 사주(일주 오행)를 동급 콘텐츠로 묶음 - 본질이 동일(생년월일 → 임의 매핑 lookup)이라 별도 카테고리 불필요.
1.5.2.3. **랜덤** 카테고리는 의도된 무작위. blessed는 캐릭터 시드 정체성 표식, intuitive는 시드 무작위, balancer는 균등+필터.
1.5.2.4. UI 톤 가이드: 라벨은 직관적, 설명은 "어떻게 뽑는지"를 한 줄로. UI 줄에 라벨 + 설명이 동시 노출되므로 설명에서 라벨 단어 반복 금지. **카테고리 그룹 표시 (S9, 2026-05-02)**: 전략 탭은 카테고리별로 줄 분할 + 줄 앞 카테고리 라벨 chip 노출. SSOT는 docs/01_spec.md 4.7.1~4.7.5.
1.5.2.5. **운세 카테고리 정직성 (S6-T1 / S10 통합 / S15 학설 기반 재작성, 2026-05-02)**: 본 카테고리 3종(별자리 / 별자리 4원소 / 일주 오행)의 행운 번호는 **전통 학설 출처** (별자리 = 점성술 Sun Sign + Ruler Planet, 4원소 = 점성술 4원소 합집합, 오행 = 河圖數 / 易經). **학설 자체는 과학적 검증이 없으며, 추첨 결과는 보장되지 않는다.** UI 노출 위치 3곳 모두 면책 카피 강제:
- 캐릭터 카드 3종 행운 토글 패널: "전통 ○○ 출처 · 학설 자체는 과학 검증 없음 · 추첨 결과 보장 없음" 캡션 (`render/character-card.js`). (S8: MBTI 폐지로 4종 → 3종)
- 전략 탭 활성 desc 아래: 카테고리가 운세일 때 한 줄 면책 (`render/strategy-tabs.js .strategy-mapping-note`).
- 추천 결과 reasons: 3종 전략(astrologer / zodiacElement / fiveElements)의 reasons에 출처 + "추첨 결과 보장 없음" 접미 강제 (`core/recommend.js`).
1.5.2.6. **사주 카테고리 통합 결정 (S10, 2026-05-02)**: 이전 분리(운세 매핑 2 / 사주 1)에서 운세 단일(3)로 통합. 사유: (1) 본질 동일(생년월일 → 임의 매핑), (2) 사주 카테고리 멤버 1개라 분류 효력 약함, (3) 동/서양 학설 차이는 전략명("사주 행운" / "별자리 행운")에서 이미 구분, (4) "사주" 정체성은 캐릭터 카드 행운 토글의 사주 패널과 면책 카피의 "명리학" 분야 명시로 보존.

1.5.2.7. **전략 라벨 직관화 (S12, 2026-05-02)**: "별자리 4원소" → **"원소 행운"** / "일주 오행" → **"사주 행운"** 변경. 사유: 평범 로또 구매자에게 "4원소"·"일주"·"오행"은 점성술/명리학 도메인 단어라 진입 장벽. "○○ 행운" 통일 톤이 카테고리(운세) 의도와 짝맞춰져 즉시 전달. 도메인 단어는 desc로 학습 노출. 라벨 변경 영향: `recommend.js` reasons 카피 / 테스트 단언 / 본 표 동기화. 캐릭터 카드 행운 토글의 tabLabel("사주" / "별자리" / "4원소")은 chip 길이 제약으로 변경 없이 유지.

1.5.2.8. **학설 기반 재작성 (S15, 2026-05-02)**: 사용자 결정 = "진짜를 원해". 이전 임의 매핑(S6-T1) → **전통 학설 출처 인용**으로 재작성. 사용자 본인이 면책 책임 / 개인 사용 / 향후 상용화 시 "보장 없음" 명기 약속.
- **별자리 12종**: Sun Sign Number + Ruler Planet Number (Sephariel / Cheiro numerological astrology) 합집합 + 끝자리 1~45 확장. SSOT: 1.11.
- **4원소**: 각 원소 3별자리의 Ruler Number 합집합 + 끝자리 확장. SSOT: 1.14.
- **5오행**: 河圖數 (易經, BC 약 2000년, public domain). 끝자리 확장. SSOT: 1.18.
- 면책 톤: "임의 매핑·학설과 무관·추첨 확률 영향 없음" → **"전통 ○○ 출처·학설 자체는 과학 검증 없음·추첨 결과 보장 없음"**. CLAUDE.md 6.3 정책(확률 향상 금지) 유지 - 학설을 인용하되 결과 보장은 차단.
- 트레이드오프: 잃은 것 = "임의 매핑" 정직성 카피의 단순성. 얻은 것 = 출처 진정성 / 캐릭터 정체성 강화 / 河圖數 같은 전통 콘텐츠의 깊이.

#### 1.5.6. 풀 컷팅 + 균등 추첨 (S18, 2026-05-02)

> **사용자 결정 = "어정쩡한 값 절대 금지"**. 이전 weight 비례 PRNG ("1등 자주 / 30등 가끔" 모호) → 풀 컷팅 + 균등 추첨.

##### 1.5.6.1. 메커니즘

각 시드 의존 / 통계 전략의 weight 계산 후 **상위 N등 풀로 잘라** 풀 안 = 1 (균등), 풀 밖 = 0 (절대 안 뽑힘). 시드 PRNG로 풀 안에서 K개 추첨. K는 분배 룰 (1.5.4) 또는 단일 모드 6.

##### 1.5.6.2. 전략별 풀 크기

| 전략 | 풀 | 풀 크기 |
|---|---|---|
| 많이 나온 수 | count 상위 | `STATS_POOL_SIZE` = 10 |
| 보너스볼 | 보너스 빈도 상위 | 10 |
| 안 나온 수 | gap 상위 | 10 |
| 짝꿍 번호 | 키번호 동시출현 상위 | 10 |
| 최근 트렌드 | 최근 30회 빈도 상위 | 10 |
| 별자리 행운 | `ZODIAC_LUCKY[zodiac]` | 8~10 (별자리별) |
| 원소 행운 | `ZODIAC_ELEMENT_LUCKY[el]` | 13~14 |
| 사주 행운 | `FIVE_ELEMENTS_LUCKY[출생] ∪ [추첨일(보너스 시)]` | 9~18 (일진 변동) |
| 축복받은 자 | (풀 컷팅 무관) 1~45 + Luck | 45 |
| 직감 | (풀 컷팅 무관) 매 회차 random weight | 45 |
| 균형 조합 | (풀 컷팅 무관) 합/홀짝 필터 통과 조합 | 조합 단위 |

##### 1.5.6.3. 사주 일진 보너스 변경 (S16 → S18)

이전 (S16): 출생 풀 ×5 + 추첨일 풀 ×R (R=1~3, 통변성 차등). weight 차등.
S18: **풀 합집합** + 균등. boost > 1 (인성/식상/재성/비견)인 관계는 추첨일 풀 추가, boost = 1 (관성)인 관계는 출생 풀만. weight 균등.

이유: weight 차등은 "어정쩡" - "출생 lucky 자주 / 추첨일 lucky 가끔". 풀 합집합 + 균등은 명확.

##### 1.5.6.4. 풀 외 번호 = 절대 안 뽑힘

이전 weight PRNG에서 풀 밖 = WEIGHT_MIN_FLOOR 등 약한 값 = 가능성 0 아님. S18에서 풀 밖 = 0 = 확률 0. 추천 결정 메커니즘 명확화.

##### 1.5.6.5. 적용 위치

`src/core/recommend.js`:
- `poolFromWeights(weights, poolSize)`: 원본 weight → 상위 N 풀 컷팅
- `poolFromIndices(indices)`: 인덱스 집합 → 풀 균등 weight
- 통계 5종 + 운세 3종 분기에 적용

`src/data/numbers.js`: `STATS_POOL_SIZE = 10` 상수.

#### 1.5.7. 객관 전략 시드 분산 (S21, 2026-05-03)

**문제 (1.5.6 풀 컷팅 후 발견)**: 객관 전략 5종이 모두 동일한 `mixSeeds(drwNo, OBJECTIVE_SEED_SALT)` 시드 사용 → mulberry32(seed)의 첫 6 추출 위치가 5종 모두 동일 (풀 인덱스 0,1,2,3,6,8) → 다중 전략 모드(각 전략 1개씩 채택) 시 **각 풀의 최솟값**만 모이며 작은 번호 편향.

실측: 1223회 시뮬에서 5종 풀 모두 추출 인덱스 0,1,2,3,6,8로 동일.

**해결**: 객관 전략 시드에 `strategyHash(strategyId)` 솔트 추가.

```js
const objectiveSeed = mixSeeds(mixSeeds(drwNo, OBJECTIVE_SEED_SALT), strategyHash(strategyId));
```

`strategyHash(sid)` = djb2 32bit unsigned 해시 (`recommend.js` private). 결정론 (같은 ID = 같은 해시).

**객관성 정의 유지**: 1.5.1 "캐릭터 시드와 Luck 모두 무관". `strategyId`는 캐릭터 속성이 아니라 사용자가 회차별로 선택하는 정책 ID → 시드 분산에 활용해도 객관성 위배 아님. 같은 회차 + 같은 전략은 모든 캐릭터에 동일 결과 (객관성 보장).

**5세트 호환**: 1.5.5.3의 `mixSeeds(drwNo, OBJECTIVE_SEED_SALT + i)`는 외부에서 `drwNoVariant`로 처리되어 본 변경과 직교. 5세트 안에서 각 세트가 다른 `drwNo`를 받고, 그 위에 strategyId 솔트가 추가로 적용됨.

**테스트 영향**: 객관 전략 단일 호출 결과가 변함. `tests/suites/recommend.test.js`의 heavy 가중 검증은 시드 운에 의존하던 임계값(>=4)을 제거하고 풀 크기와 일치(heavy 10개 = STATS_POOL_SIZE)하는 결정적 검증으로 강화 (S21).

### 1.6. 운세 등급 ID

| ID | 한국어 |
|---|---|
| `great` | 대길 |
| `good` | 길 |
| `neutral` | 평 |
| `bad` | 흉 |

### 1.7. 추첨 가중치 한계

| 상수 | 값 | 의미 |
|---|---|---|
| `WEIGHT_MIN_FLOOR` | 0.0001 | 0 가중치 방지 (수치 안정성) |
| `WEIGHT_MAX_BIAS` | 50.0 | Luck 100 시 시드 번호 최대 증폭 |
| `STATS_POWER` | 1.5 | 누적 빈도 weight 증폭 지수 (statistician / secondStar) |
| `GAP_POWER` | 1.3 | 미출현 갭 weight 증폭 지수 (regressionist) |

1.7.1. **power 보정 사유**: 1221회 누적 시점에서 본번호 totalCount는 평균 ≈ 163, 실측 ±19% (133~182) 편차로 비복원 가중 추출에서 거의 균등과 구분 안 됨. weight를 `count^k`로 보정해 분포 차이를 인지 가능 수준으로 증폭.
1.7.2. **STATS_POWER=1.5 실측 (1221회 시점, 2026-05-02 simulate-stats-power.mjs)**: count 133~182 → weight 1534~2455. ratio **1.368 → 1.601**. 10000회 추출 시뮬에서 추출 빈도 ratio 1.587 (균등 1.0 대비 59% 차이). 사용자 인지 가능, "확률 향상" 톤 회피 수준.
1.7.3. **GAP_POWER=1.3 실측**: gap 0~19 → weight ratio 19 → 46 (2.42배 증폭). 적정.
1.7.4. **trendFollower는 raw 유지**: recent30 raw ratio 9 (이미 충분히 두드러짐). 1.5 보정 시 27배 증폭으로 과도하다 판단(2026-05-02 시뮬). raw 유지가 자연.
1.7.5. power 변경은 모든 캐릭터 객관 결과에 영향. 0.0~3.0 범위 내에서 조정 가능.
1.7.6. 위치: `src/data/numbers.js`. 사용처: `src/core/recommend.js` `statsToWeights` / `gapWeights`.
1.7.7. 시뮬레이션 스크립트: `scripts/simulate-stats-power.mjs` (게임 허브 루트). `node scripts/simulate-stats-power.mjs`로 재측정 가능.

### 1.16. 백캐스트 (Luck 부트스트랩)

| 상수 | 값 | 의미 |
|---|---|---|
| `BACKFILL_RECENT_COUNT` | 30 | 캐릭터 첫 추첨 탭 진입 시 최근 N회를 history에 백필 |

1.16.1. 위치: `src/data/numbers.js`. 함수는 `src/core/history.js` `backfillRecommendations`.
1.16.2. 동작: spec 7.5 참조. 결정론, idempotent.
1.16.3. 비용: 30회 × `recommend()` ≈ 1초 미만. 첫 진입에만 발생.

### 1.15. 추첨 일정 (한국 동행복권 6/45)

| 상수 | 값 | 의미 |
|---|---|---|
| `DRAW_DAY_OF_WEEK` | 6 | 토요일 (`Date.getDay` 기준 일=0..토=6) |
| `DRAW_HOUR_KST` | 20 | 카운트다운 타깃 시 (판매 마감) |
| `DRAW_MIN_KST` | 0 | 카운트다운 타깃 분 (판매 마감) |
| `DRAW_TZ_OFFSET_MIN` | 540 | KST = UTC+9 (9*60) |
| `COUNTDOWN_TICK_MS` | 1000 | 카운트다운 갱신 주기 |

1.15.1. 위치: `src/data/numbers.js`. 계산 로직은 `src/core/schedule.js` (DOM 미사용, 결정론).
1.15.2. **카운트다운 타깃 시각**: 동행복권 사이트의 카운트다운은 **판매 마감 시각 = 토 20:00 KST** 기준이다. 실제 추첨 방송은 20:35지만 사이트의 카운트다운은 20:00에 0이 된다. 본 게임은 동행복권 사이트와 동일한 기준(20:00)을 채택.
1.15.3. 다음 추첨 회차 산출 = 가장 최근 캐시된 `drwNo + 1`. 캐시 빈 경우 회차 번호는 null, 시각만 다음 토요일 20:00 KST 폴백.
1.15.4. 카운트다운이 0이 되면 다음 토요일로 자동 진행. 회차 번호 갱신은 미러 페치(통계 탭 진입 시 자동 sync) 경로로 별도.
1.15.5. 호환을 위해 토큰명에 `DRAW_*` 접두를 유지하지만 의미상 "카운트다운 타깃"이다. 실제 추첨 시각(20:35)이 따로 필요한 컨텍스트가 생기면 별도 상수로 분리.

### 1.17. 회차 fallback (draws 캐시 비어있을 때)

| 상수 | 값 | 의미 |
|---|---|---|
| `DEFAULT_DRWNO_FALLBACK` | 1222 | draws.json이 비어있는 첫 진입 시 임시 회차 번호 |

1.17.1. 위치: `src/data/numbers.js`. 사용처: `src/render/main.js` `state.drwNo` 초기값.
1.17.2. 페치 1회 후 자동 무력화: `initRender`에서 `state.draws`가 있으면 `latest + 1`로 즉시 덮어씀. 메인 화면 진입 시 `nextDraw(state.draws)`가 다시 산출.
1.17.3. 시점 결정: 2026-05-02 = 1222회 (PROGRESS.md 5.0). spec 시점 갱신 시 본 값을 함께 조정하거나, 사용자가 1회 페치하면 자연 무력화.
1.17.4. 룰: 매직 넘버 0개 원칙 (CLAUDE.md 4장). 코드에서 직접 정의하지 않고 본 상수만 import.

### 1.8. 시드 해시 알고리즘

| 항목 | 값 |
|---|---|
| 알고리즘 | FNV-1a 32bit |
| 입력 직렬화 | `birthYMD|name|zodiac|luckyWord` (파이프 구분) |
| 출력 | unsigned 32bit integer |
| 결정성 | 동일 입력 = 동일 출력 보장 |
| 위치 | `src/core/seed.js` |

### 1.9. PRNG (의사난수 생성기)

| 항목 | 값 |
|---|---|
| 알고리즘 | Mulberry32 |
| 입력 | 32bit unsigned 시드 |
| 출력 | `[0, 1)` float 시퀀스 |
| 결정성 | 동일 시드 = 동일 시퀀스 |
| 위치 | `src/core/random.js` |

1.9.1. 시드 해시(1.8)는 입력 → 시드. PRNG(1.9)는 시드 → 시퀀스. 역할이 다르며 분리합니다.

### 1.11. 별자리 12종 + 행운 번호 (점성술 학설 기반)

> **출처 명시 (S15, 2026-05-02 학설 기반 재작성)**: 본 표의 행운 번호는 **점성술 numerology 전통** 출처. 각 별자리별 (Sun Sign Number + Ruler Planet Number) 합집합 + 끝자리 동일 1~45 확장. **학설 자체는 과학적 검증이 없으며 추첨 결과는 보장되지 않습니다.**

#### 1.11.1. Sun Sign Number

12궁 순서 그대로 (1~12). 11(Aquarius), 12(Pisces)는 numerology theosophical reduction으로 한 자리수 환원: 11→1+1=2, 12→1+2=3.

#### 1.11.2. Ruler Planet Number

Sephariel / Cheiro 등 numerological astrology 전통 매핑.

| 행성 | Number |
|---|---|
| Sun | 1 |
| Moon | 2 |
| Jupiter | 3 |
| Uranus | 4 (현대) |
| Mercury | 5 |
| Venus | 6 |
| Neptune | 7 (현대) |
| Saturn | 8 |
| Mars | 9 |

전통 통치자(traditional ruler) 채택. 현대 Pluto/Uranus/Neptune은 보조 위치.

#### 1.11.3. 별자리 12종 매핑

| 별자리 | 한국어 | Sun # | Ruler | Ruler # | 1~45 행운 번호 (끝자리 확장) |
|---|---|---|---|---|---|
| aries | 양자리 | 1 | Mars | 9 | 1, 9, 11, 19, 21, 29, 31, 39, 41 (9) |
| taurus | 황소자리 | 2 | Venus | 6 | 2, 6, 12, 16, 22, 26, 32, 36, 42 (9) |
| gemini | 쌍둥이자리 | 3 | Mercury | 5 | 3, 5, 13, 15, 23, 25, 33, 35, 43, 45 (10) |
| cancer | 게자리 | 4 | Moon | 2 | 2, 4, 12, 14, 22, 24, 32, 34, 42, 44 (10) |
| leo | 사자자리 | 5 | Sun | 1 | 1, 5, 11, 15, 21, 25, 31, 35, 41, 45 (10) |
| virgo | 처녀자리 | 6 | Mercury | 5 | 5, 6, 15, 16, 25, 26, 35, 36, 45 (9) |
| libra | 천칭자리 | 7 | Venus | 6 | 6, 7, 16, 17, 26, 27, 36, 37 (8) |
| scorpio | 전갈자리 | 8 | Mars (전통) | 9 | 8, 9, 18, 19, 28, 29, 38, 39 (8) |
| sagittarius | 사수자리 | 9 | Jupiter | 3 | 3, 9, 13, 19, 23, 29, 33, 39, 43 (9) |
| capricorn | 염소자리 | 10 → 1 | Saturn | 8 | 8, 10, 18, 20, 28, 30, 38, 40 (8) |
| aquarius | 물병자리 | 11 → 2 | Uranus (현대) | 4 | 1, 4, 11, 14, 21, 24, 31, 34, 41, 44 (10) |
| pisces | 물고기자리 | 12 → 3 | Jupiter (전통) | 3 | 2, 3, 12, 13, 22, 23, 32, 33, 42, 43 (10) |

1.11.4. 위치: `src/data/numbers.js` `ZODIAC_LUCKY`.
1.11.5. 캐릭터 zodiac → 본 표 행운 번호 lookup → recommend.js에서 5배 boost weight 적용.
1.11.6. 학설 자체는 과학적 검증 없음. 추첨 확률 영향 없음. 결과 보장 없음.

### 1.13. ~~MBTI 16종~~ (S8, 2026-05-02 폐지)

S8 결정으로 MBTI 매핑 / 전략 / 입력 모두 폐지. 사유:
- **데이터 출처 이질성**: 사주/별자리는 생년월일 자동 산출 / MBTI는 사용자 직접 입력. 캐릭터 정체성의 견고함 약화.
- **컨셉 부정합**: 사주/별자리는 운명론 전통이지만 MBTI는 심리유형 분류라 "행운"과 결이 다름.
- **IP 회색 지대**: "MBTI"는 The Myers-Briggs Company 등록 상표. 게임 도메인에서 광범위하게 사용되지만 굳이 위험 떠안을 이유 없음.

마이그레이션: 기존 캐릭터의 `mbti` 필드는 localStorage에 잔존하나 미사용 처리 (load 시 무시). `lastUsedStrategy === 'mbti'` 캐릭터는 `STRATEGY_DEFAULT`로 fallback (`render/main.js`).

### 1.19. 행운 쌓기 (T4 / S14, 2026-05-02 신설 → 라벨/시각 갱신, 정성 콘텐츠)

해석 B 채택. "당첨 확률 높이기" 메커닉 아님. 만땅 시 Luck +5 1회 보너스. SSOT: docs/01_spec.md 5.6.

S14 변경(2026-05-02): UI 라벨 "행운 의식" → "행운 쌓기". 시각 게이지 바(0~100 %) → 8 아이콘 진척도 (8 × 12.5 = 100, 1:1 매핑). 백엔드 상수(`RITUAL_GAUGE_MAX` 100 / `RITUAL_GAIN_PER_ACTION` 12.5)는 그대로.

| 상수 | 값 | 의미 |
|---|---|---|
| `RITUAL_GAUGE_MAX` | 100 | 게이지 만땅 |
| `RITUAL_GAIN_PER_ACTION` | 12.5 | 행위 1회 게이지 증가 (8 × 12.5 = 100) |
| `LUCK_BONUS_RITUAL` | 5 | 만땅 시 캐릭터 Luck 보너스 |

1.19.1. 위치: `src/data/numbers.js`. 핵심 로직: `src/core/ritual.js`. UI: `src/render/ritual-widget.js`.
1.19.2. 행위 8종 라인업 (`RITUAL_LIST`): 종교 / IP 회피 톤으로 큐레이션.

| ID | 라벨 | 설명 |
|---|---|---|
| `meditate` | 명상하기 | 마음을 가라앉히고 호흡을 정돈한다 |
| `training` | 수련하기 | 108배 동작으로 몸과 정신을 단련한다 |
| `water` | 정화수 의식 | 새벽 정화수를 떠놓고 정성을 기울인다 |
| `qi` | 기 모으기 | 하늘의 기를 두 손에 모은다 |
| `ancestor` | 가문 의식 | 가문의 인연에 감사를 전한다 |
| `talisman` | 부적 그리기 | 한 획 한 획 정성껏 부적을 완성한다 |
| `coin` | 행운 동전 | 동전 한 닢을 던져 길흉을 점친다 |
| `starlight` | 별빛 의식 | 밤하늘의 별 운행에 마음을 맞춘다 |

1.19.3. **데이터 스키마 (`lotto_rituals`)**: 단일 객체.

```js
{
  charId: string,           // 캐릭터별 격리
  drwNo: number,            // 회차별 격리 (변경 시 리셋)
  performed: string[],      // 수행된 ritual id 배열
  gauge: number,            // 0~100
  appliedBonus: boolean,    // 만땅 시 Luck 보너스 적용 잠금
}
```

1.19.4. 회차 / 캐릭터 변경 시 리셋(`ensureCurrentState`). 같은 charId+drwNo면 보존.
1.19.5. 추첨 결과 / 추천 알고리즘과 **완전 무관**. 캐릭터 luck 보너스를 통해서만 영향(시드 분산도). 당첨 확률 영향 0.
1.19.6. UI 라벨에 "확률" / "필승" / "당첨" 단어 사용 금지. 모달 하단 면책 강제. **현 라벨 (S14) = "행운 쌓기"**.

### 1.18. 천간 오행 5원소 + 원소별 행운 번호 (사주 전략용, 河圖數 학설 기반)

> **출처 명시 (S15, 2026-05-02 학설 기반 재작성)**: 본 표의 행운 번호는 **河圖** 출처 (易經 / 河圖洛書, BC 약 2000년, public domain). 1차 河圖數에 끝자리 동일 1~45 확장. **학설 자체는 과학적 검증이 없으며 추첨 결과는 보장되지 않습니다.**

캐릭터 일주의 천간 오행(목/화/토/금/수) → 河圖 출처 행운 번호.

| 원소 | 한국어 | 천간 (1.12.1) | 河圖數 인용 | 1~45 행운 번호 (끝자리 확장) |
|---|---|---|---|---|
| water (수) | 수 | im / gye (임/계) | 天一生水, 地六成之 → 1, 6 | 1, 6, 11, 16, 21, 26, 31, 36, 41 (9개) |
| fire (화) | 화 | byeong / jeong (병/정) | 地二生火, 天七成之 → 2, 7 | 2, 7, 12, 17, 22, 27, 32, 37, 42 (9개) |
| wood (목) | 목 | gap / eul (갑/을) | 天三生木, 地八成之 → 3, 8 | 3, 8, 13, 18, 23, 28, 33, 38, 43 (9개) |
| metal (금) | 금 | gyeong / sin (경/신) | 地四生金, 天九成之 → 4, 9 | 4, 9, 14, 19, 24, 29, 34, 39, 44 (9개) |
| earth (토) | 토 | mu / gi (무/기) | 天五生土, 地十成之 → 5, 10 | 5, 10, 15, 20, 25, 30, 35, 40, 45 (9개) |

1.18.1. 위치: `src/data/numbers.js` `FIVE_ELEMENTS_LUCKY`.
1.18.2. 캐릭터 dayPillar.stem → 1.12.1 매핑으로 오행 → 본 표 행운 번호.
1.18.3. **출처 = 河圖 (易經)**. Public domain. 음양오행 우주관의 상징수.
1.18.4. 4원소(서양, 1.14) vs 5오행(동양, 1.18) 의도적 병렬: 서양 점성술과 동양 河圖數를 동급 콘텐츠로.
1.18.5. 5원소 × 9개 = **45 균등 분포**. 모든 1~45 번호가 정확히 한 오행에 배정.
1.18.6. 학설 자체는 과학적 검증 없음. 추첨 확률 영향 없음. 결과 보장 없음.

#### 1.18.7. 사주 행운 추첨일 일진 보너스 (S16, 2026-05-02)

사주 행운 전략은 평생 고정 lucky(출생 일주) + **추첨일 일진 변동 보너스**의 두 축. 매주 다른 추첨일 일주 오행이 캐릭터 출생 오행과 통변성 관계를 형성 → 추가 boost.

| 관계 (코드) | 통변성 | 의미 | 추가 boost |
|---|---|---|---|
| `self` | 비견 | 같은 오행 / 자기 강화 | ×1.5 |
| `generate` | 식상 | 캐릭터가 회차를 생함 / 표현 | ×2.0 |
| `beGenerated` | 인성 | 회차가 캐릭터를 생함 / 도움 받음 | **×3.0 (가장 유리)** |
| `overcome` | 재성 | 캐릭터가 회차를 극함 / 재물 추구 | ×1.5 |
| `beOvercome` | 관성 | 회차가 캐릭터를 극함 / 압박 | ×1.0 (보너스 없음) |

1.18.7.1. 출처: 명리학 통변성(通變星), BC 음양가 → 한대 정착.
1.18.7.2. 적용 위치: `src/core/recommend.js` `fiveElementsWeights(dayPillar, drawDate)`.
1.18.7.3. 보너스는 추첨일 일주 오행의 河圖 lucky 9개에 곱연산. 출생 일주 lucky의 ×5와 별도 누적.
1.18.7.4. 결과: 캐릭터별로 다름 (출생 오행 다름) + 매주 다름 (추첨일 오행 매주 변동) - 사용자 요구 매칭 ("캐릭터별 + 주간 변경").
1.18.7.5. UI 표시: 사주 행운 = "주간 변경" chip (`.lucky-variability-weekly`). 별자리 행운 / 원소 행운 = "평생 동일" chip (`.lucky-variability-lifetime`).
1.18.7.6. 학설 자체는 과학 검증 없음. 추첨 결과 보장 없음. 면책 카피에 추첨일 일진 보너스 명시.

### 1.14. 별자리 4원소 분류 + 원소별 행운 번호 (점성술 학설 기반)

> **출처 명시 (S15, 2026-05-02 학설 기반 재작성)**: 본 표의 행운 번호는 **점성술 4원소 + Ruler Planet Number** 출처. 각 원소에 속한 3별자리의 Ruler Planet Number 합집합 + 끝자리 동일 1~45 확장. **학설 자체는 과학적 검증이 없으며 추첨 결과는 보장되지 않습니다.**

| 원소 | 별자리 | Ruler Number | 1~45 행운 번호 (끝자리 합집합) |
|---|---|---|---|
| fire (불) | aries / leo / sagittarius | Mars#9 / Sun#1 / Jupiter#3 → 1, 3, 9 | 1, 3, 9, 11, 13, 19, 21, 23, 29, 31, 33, 39, 41, 43 (14개) |
| earth (땅) | taurus / virgo / capricorn | Venus#6 / Mercury#5 / Saturn#8 → 5, 6, 8 | 5, 6, 8, 15, 16, 18, 25, 26, 28, 35, 36, 38, 45 (13개) |
| air (공기) | gemini / libra / aquarius | Mercury#5 / Venus#6 / Uranus#4 → 4, 5, 6 | 4, 5, 6, 14, 15, 16, 24, 25, 26, 34, 35, 36, 44, 45 (14개) |
| water (물) | cancer / scorpio / pisces | Moon#2 / Mars#9(전통) / Jupiter#3(전통) → 2, 3, 9 | 2, 3, 9, 12, 13, 19, 22, 23, 29, 32, 33, 39, 42, 43 (14개) |

1.14.1. 별자리 행운(`astrologer`)은 12별자리 개별 매핑(1.11), 별자리 4원소(`zodiacElement`)는 4원소 그룹 매핑(본 1.14). 분리.
1.14.2. Ruler Planet Number 출처: Sephariel / Cheiro 등 numerological astrology 전통 (Sun=1, Moon=2, Jupiter=3, Uranus=4, Mercury=5, Venus=6, Neptune=7, Saturn=8, Mars=9). 전통 통치자 채택.
1.14.3. 4원소(서양, 1.14) vs 5오행(동양, 1.18) 의도적 병렬.
1.14.4. 학설 자체는 과학적 검증 없음. 추첨 확률 영향 없음. 결과 보장 없음.

### 1.12. 사주 일주 + 오행 (M5 사주 정밀화)

생년월일 → 일주(천간 + 지지) 자동 계산. 시드 입력의 일부지만 운세 산출용으로 character에 별도 보관.

#### 1.12.1. 천간 10

| ID | 한국어 | 오행 |
|---|---|---|
| `gap` | 갑 | 목 (wood) |
| `eul` | 을 | 목 |
| `byeong` | 병 | 화 (fire) |
| `jeong` | 정 | 화 |
| `mu` | 무 | 토 (earth) |
| `gi` | 기 | 토 |
| `gyeong` | 경 | 금 (metal) |
| `sin` | 신 | 금 |
| `im` | 임 | 수 (water) |
| `gye` | 계 | 수 |

#### 1.12.2. 지지 12 (12간지와 동일 ID)

지지의 주 오행: 자/해 = 수, 인/묘 = 목, 진/미/술/축 = 토, 사/오 = 화, 신/유 = 금.

#### 1.12.3. 오행 관계

- **상생**: 목 → 화 → 토 → 금 → 수 → 목 (생함)
- **상극**: 목 → 토, 토 → 수, 수 → 화, 화 → 금, 금 → 목 (극함)

#### 1.12.4. 일주 천간 오행 관계 (캐릭터 vs 회차)

| ID | 의미 | 운세 보정 (대길/길/평/흉) |
|---|---|---|
| `self` | 같은 오행 (비견) | +0.05 / +0.05 / -0.05 / -0.05 |
| `beGenerated` | 회차가 캐릭터를 생함 (인성) | +0.05 / +0.05 / -0.05 / -0.05 |
| `generate` | 캐릭터가 회차를 생함 (식상) | -0.02 / +0.05 / +0.02 / -0.05 |
| `overcome` | 캐릭터가 회차를 극함 (재성) | -0.03 / -0.03 / +0.03 / +0.03 |
| `beOvercome` | 회차가 캐릭터를 극함 (관성) | -0.05 / -0.05 / +0.03 / +0.07 |
| `normal` | 무관계 | 0 / 0 / 0 / 0 |

#### 1.12.5. 적용

띠 관계로 결정된 분포에 오행 보정 가산 후 정규화. 양쪽 일주가 모두 있을 때만 적용 (회차 `drwDate` 있어야).

### 1.10. 12간지 (M5)

| ID | 한국어 |
|---|---|
| `rat` | 쥐 |
| `ox` | 소 |
| `tiger` | 호랑이 |
| `rabbit` | 토끼 |
| `dragon` | 용 |
| `snake` | 뱀 |
| `horse` | 말 |
| `goat` | 양 |
| `monkey` | 원숭이 |
| `rooster` | 닭 |
| `dog` | 개 |
| `pig` | 돼지 |

1.10.1. 연도 → 12간지: `(year - 4) mod 12`. 1900년 = `rat`, 2024년 = `dragon`.
1.10.2. 회차 → 회차 일진:
- 정밀: 발표일(`drwDate`)이 있으면 1984-02-02 = 갑자일 기준 일자 차이 mod 12 (`dateToAnimalSign`).
- Fallback: `drwDate` 없으면 `drwNo mod 12` (`drwNoToAnimalSign`).
- 통합 헬퍼: `drawToAnimalSign(draw | drwNo)`.
1.10.3. 관계: `same` (동일) / `sahap` (4 또는 8 떨어짐, 삼합) / `chung` (6 떨어짐, 충) / `normal`.
1.10.4. 운세 분포는 관계에 따라 달라집니다 (docs/01_spec.md 5.1.1 참조).
1.10.5. 위치: `src/core/zodiac.js`.

## 2. 색상 (게임 데이터)

### 2.1. 운세 등급 (라이트 톤)

| 등급 | 색상 |
|---|---|
| 대길 (`great`) | `#c9a050` |
| 길 (`good`) | `#10b981` |
| 평 (`neutral`) | `#6b6b75` |
| 흉 (`bad`) | `#ef4444` |

### 2.2. 번호 카드 (라이트 톤)

| 항목 | 색상 |
|---|---|
| 본번호 카드 배경 | `#ffffff` |
| 본번호 텍스트 | `#1a1a1f` |
| 보너스볼 카드 배경 | `#fff3d9` |
| 보너스볼 텍스트 | `#b88830` |

### 2.3. 적중 등수 글로우 (라이트 톤)

| 등수 | 색상 |
|---|---|
| 1등 | `#c9a050` |
| 2등 | `#b88830` |
| 3등 | `#10b981` |
| 4등 | `#06b6d4` |
| 5등 | `#6b6b75` |

### 2.4. 번호공 5색 (한국 6/45, 결과 페이지 변종)

번호공은 추첨 영상 표준색이 아닌 **동행복권 결과 페이지 변종**(진한 채도, 완전 평면 단색)을 채택. 결과 페이지의 시각 통일성을 위함.

| 구간 | 색상 | 톤 |
|---|---|---|
| 1-10 | `#f5a200` | 진황금 |
| 11-20 | `#1c41a1` | 진청 (navy) |
| 21-30 | `#c4253a` | 진홍 (carmine) |
| 31-40 | `#8a8a8a` | 짙은 회색 |
| 41-45 | `#80b438` | 진연두 |

2.4.1. 텍스트는 모두 흰색. 그라디언트 / 그림자 / 입체감 일체 사용 안 함 (완전 평면).
2.4.2. 본번호와 보너스볼 동일 색상 시스템 적용. 시각적 차이는 위치(+ 기호 뒤)와 라벨로만.
2.4.3. 정의 위치: `src/data/colors.js` `NUMBER_RANGE_COLORS`.
2.4.4. 추첨 영상 표준색이 필요한 향후 컨텍스트(예: 추첨 시뮬레이션)가 생기면 별도 상수로 분리.

2.5. UI 색상(메뉴 / HUD / 배경 등)은 본 문서가 아니라 `styles/tokens.css` 변수입니다. 본 문서는 게임 데이터(운세 / 카드 / 적중 등수 / 번호공)만.

2.5.1. 참고: `--color-lotto-red` (`#ee2738`)는 동행복권 결과 페이지의 강조 빨강(추첨 예정일 / 카운트다운 숫자 색)입니다. `--color-danger` (`#ef4444`, 흉일 / 삭제 버튼)와는 다른 톤이므로 혼용 금지. 카운트다운 / 추첨 일정 영역에서만 사용.

### 2.6. 서양 12별자리 경계일 (양력)

| ID | 한국어 | 시작 | 끝 |
|---|---|---|---|
| `aries` | 양자리 | 3/21 | 4/19 |
| `taurus` | 황소자리 | 4/20 | 5/20 |
| `gemini` | 쌍둥이자리 | 5/21 | 6/20 |
| `cancer` | 게자리 | 6/21 | 7/22 |
| `leo` | 사자자리 | 7/23 | 8/22 |
| `virgo` | 처녀자리 | 8/23 | 9/22 |
| `libra` | 천칭자리 | 9/23 | 10/22 |
| `scorpio` | 전갈자리 | 10/23 | 11/21 |
| `sagittarius` | 궁수자리 | 11/22 | 12/21 |
| `capricorn` | 염소자리 | 12/22 | 1/19 |
| `aquarius` | 물병자리 | 1/20 | 2/18 |
| `pisces` | 물고기자리 | 2/19 | 3/20 |

2.6.1. 위치: `src/core/zodiac.js` `zodiacFromBirthDate(YYYY-MM-DD)`. 입력은 양력 기준.
2.6.2. 캐릭터 생성 폼은 별자리를 사용자에게 묻지 않고 생년월일에서 자동 계산. 일주(사주)도 동일 생년월일을 출처로 함 → 단일 source-of-truth.
2.6.3. 음력 입력은 호출자가 양력으로 변환 후 전달.

### 2.7. 출처 태그 색 (다중 전략 모드, S23, 2026-05-03)

추천 카드 본번호 아래 1글자 short 라벨(S22)의 배경색. **카테고리 hue 유지 + 명도 단계로 같은 카테고리 안 전략 식별**. 사용자 결정: "같은 운세라도 색 계열은 같지만 색은 다르게".

| 카테고리 | hue | 전략별 색 (밝음 → 어두움) |
|---|---|---|
| 통계 | 파랑 (sky) | trendFollower `#0ea5e9` / statistician `#0284c7` / pairTracker `#0369a1` / secondStar `#075985` / regressionist `#0c4a6e` |
| 운세 | 분홍 (pink) | astrologer `#ec4899` / zodiacElement `#be185d` / fiveElements `#9d174d` |
| 랜덤 | 회색 (gray) | blessed `#6b7280` / intuitive `#4b5563` / balancer `#374151` |

2.7.1. 정의 위치: `src/data/colors.js` `STRATEGY_TAG_COLORS` + `strategyTagColor(sid)` 헬퍼.
2.7.2. 적용 위치: `src/render/draw-card.js` `numHtml`. inline `style="background-color:..."` 우선, `.num-source-tag.is-{stats|mapping|random}` 클래스 fallback (CSS-only 환경 대비).
2.7.3. 명도 차이 정도: 1단 차이(예: sky-500 → sky-600)는 12x12 라벨에서 "같은 계열" 인지 가능하면서 식별 가능 수준. font 9px이라 채도/배경 대비가 정보를 운반. 텍스트는 모두 #ffffff.

## 3. localStorage 스키마

### 3.1. 키 prefix

`lotto_`

### 3.2. 키 정의

| 키 | 값 | 갱신 시점 |
|---|---|---|
| `lotto_draws` | `Draw[]` (전 회차) | 매주 토요일 추첨 후 |
| `lotto_stats_numbers` | `NumberStat[]` (45개) | draws 갱신 후 자동 |
| `lotto_stats_bonus` | `BonusStat[]` (45개) | draws 갱신 후 자동 |
| `lotto_stats_cooccur` | `Cooccur[]` (페어 빈도) | draws 갱신 후 자동 |
| `lotto_characters` | `Character[]` | 캐릭터 생성 / 삭제 / 이력 갱신 |
| `lotto_active_character` | `string` (id) | 캐릭터 전환 |
| `lotto_options` | `{ applyFilters, advancedMode, fiveSets, ... }` | 사용자 토글 변경 (S19: multiStrategy 폐기) |
| `lotto_seen_help` | `boolean` | 첫 진입 안내 표시 |
| `lotto_rituals` | `RitualState` (1.19.3) | 행위 수행 시 / 회차 변경 시 자동 리셋 |

3.2.1. `lotto_options.advancedMode`: 다구좌 모드(휠링) 활성화 여부. 기본 false. 첫 활성화 시 윤리 안내 모달 강제.
3.2.2. ~~`lotto_options.multiStrategy`~~ (S19, 2026-05-02 폐기). 항상 다중 모드. 기존 localStorage 잔존 값은 `loadOptions()`에서 자동 제거.
3.2.3. `lotto_options.fiveSets`: 5세트 동시 추천 모드 (S4-T1). 기본 false. 설정 탭 토글로 변경. ON 시 추첨 탭에 메인 카드 1장 + 컴팩트 4장(#2~#5) 세로 스택. 1.5.5 참조.

### 3.3. Draw 스키마

```js
{
  drwNo: number,                            // 회차
  drwDate: 'YYYY-MM-DD',                    // 추첨일
  numbers: [number, number, number, number, number, number],  // 본번호 6개 (정렬)
  bonus: number,                            // 보너스볼
  firstWinners: number,                     // 1등 당첨자 수
  firstPrize: number,                       // 1등 1인당 당첨금
  totalSales: number                        // 총 판매액
}
```

### 3.4. NumberStat / BonusStat 스키마

```js
// NumberStat (본번호용)
{
  number: number,             // 1~45
  totalCount: number,
  recent10: number,
  recent30: number,
  recent100: number,
  lastSeenDrw: number,
  currentGap: number          // 마지막 출현 이후 미출현 회차 수
}

// BonusStat (보너스볼용, 본번호와 분리)
{
  number: number,             // 1~45
  totalCount: number,
  recent30: number,
  lastSeenDrw: number
}
```

### 3.5. Cooccur 스키마

```js
{
  a: number,                  // a < b
  b: number,
  count: number               // 동시 출현 회차 수
}
```

### 3.6. Character 스키마

```js
{
  id: string,
  seed: number,
  name: string,                             // 캐릭터 표시명
  animalSign: 'rat' | 'ox' | ... | 'pig',   // 생년 → 12간지 (운세 산출용)
  zodiac: 'aries' | 'taurus' | ... | 'pisces',  // 서양 12별자리 (별자리 행운 / 별자리 4원소 전략용)
  dayPillar: { stem: 'gap' | ..., branch: 'rat' | ... },  // 생년월일 → 일주 (운세 사주 보정용 + 일주 오행 전략용)
  // mbti 필드: S8(2026-05-02) 폐지. localStorage에 잔존할 수 있으나 미사용. load 시 무시.
  luck: number,                             // 0~100
  lastUsedStrategy: 'blessed' | 'statistician' | ... | 'fiveElements',
  lastUsedStrategies: string[],   // 다중 전략 모드 (S3-T1). 단일 모드 시 [lastUsedStrategy] 1개 배열.
  createdAt: 'YYYY-MM-DDTHH:mm:ss',
  history: Recommendation[]
}
```

3.6.1. **캐릭터에 전략(`className`) 속성 없음.** 전략은 추첨 시 매번 사용자가 선택, `lastUsedStrategy`로 마지막 선택만 캐싱.
3.6.2. 시드 입력의 birthYMD / luckyWord는 시드 해시 후 폐기. zodiac은 별자리 행운 전략용으로 별도 보관.
3.6.3. `name`과 `animalSign`은 표시 / 운세 산출 목적상 별도 보관. `animalSign`은 생년에서 자동 계산.
3.6.4. **마이그레이션**: 기존 캐릭터의 `className`은 무시 (lastUsedStrategy 누락 시 `STRATEGY_DEFAULT`로 fallback). `lastUsedStrategies` 누락 시 `[lastUsedStrategy || STRATEGY_DEFAULT]`로 자동 변환 (S3-T1, render/main.js `activeStrategyIds`).

### 3.6.5. Recommendation 결과 스키마 (다중 전략 + 5세트 추가 필드)

`recommendMulti` 호출 시 `strategySources: string[]` 필드가 추가됨. 단일 모드 (`recommend`)는 미반환.

```js
{
  numbers: [number, number, number, number, number, number],
  bonus: number,
  reasons: string[],
  strategySources: string[],   // numbers와 동일 순서. 다중 모드에서만 채워짐. 카테고리 dot용.
}
```

`recommendFiveSets` 호출 시 위 객체의 배열(길이 `FIVE_SETS_COUNT` = 5) 반환. `[0]`이 메인(이력 기록 대상), `[1]~[4]`는 서사 표시용.

```js
[
  { numbers, bonus, reasons, strategySources },  // setIndex 0 = 메인
  { numbers, bonus, reasons, strategySources },  // setIndex 1
  { numbers, bonus, reasons, strategySources },  // setIndex 2
  { numbers, bonus, reasons, strategySources },  // setIndex 3
  { numbers, bonus, reasons, strategySources },  // setIndex 4
]
```

### 3.7. Recommendation 스키마

```js
{
  drwNo: number,
  numbers: [number, number, number, number, number, number],
  bonus: number,
  reasons: string[],                        // 번호별 근거 메시지
  createdAt: 'YYYY-MM-DDTHH:mm:ss',
  matchedRank: 1 | 2 | 3 | 4 | 5 | null,    // 발표 후 자동 매칭
  luckApplied: boolean                      // Luck 보너스 적용 여부 (M5)
}
```

3.7.1. `luckApplied` 룰: 등수 매칭이 처음 결정될 때 보너스 1회 부여 후 true 잠금. 같은 회차 재추천이나 매칭 갱신에도 보너스 중복 부여 안 함.

### 3.8. 등수별 Luck 보너스 (M5)

| 등수 | 보너스 |
|---|---|
| 1등 | +20 |
| 2등 | +15 |
| 3등 | +10 |
| 4등 | +5 |
| 5등 | +2 |
| 미적중 / 미발표 | 0 |

## 4. 외부 데이터 출처

### 4.1. 회차 엔드포인트 - smok95/lotto 미러

- **전수 묶음**: `https://smok95.github.io/lotto/results/all.json` (1회~최신 단일 배열, ~400KB).
- 단건: `https://smok95.github.io/lotto/results/{회차}.json`
- 최신: `https://smok95.github.io/lotto/results/latest.json`
- 출처 저장소: https://github.com/smok95/lotto (MIT, 매주 토 GitHub Actions 자동 갱신).
- 인증 불필요, JSON 응답.
- 응답 매핑: 3.3 Draw 스키마 참조 (필드 매핑은 4.5 참조).

### 4.1.1. 출처 변경 사유 (2026-05-01)

- 동행복권 `common.do?method=getLottoNumber` API 외부 직접 호출 차단(영구 추정).
- 결과 페이지 `gameResult.do?method=byWin / allWin`도 사용자 PC에서 errorPage 리다이렉트.
- 정상 사용자도 결과 페이지 직접 도달 불가 상태에서, 봇 차단 우회 없는 정공 채널이 부재.
- smok95/lotto는 GitHub Pages 정적 파일 호스팅이라 dhlottery 차단과 무관.
- 미러도 결국 dhlottery 백엔드 의존이므로, 미러 갱신 끊기면 4.6 fallback으로 전환.

### 4.2. 적재 범위

- **1회차 전수**. 1회차부터 최신 회차까지.
- 결과는 `src/data/draws.json` 정적 파일.
- 첫 적재 비용: **1초 미만** (`all.json` bundle 단일 GET).

### 4.3. 갱신 정책

- **자동화**: `.github/workflows/fetch-lotto.yml`이 매주 일요일 03:00 KST에 페치 → 변경 시 commit & push.
- **증분 모드**: 페치 스크립트가 기존 `draws.json` 마지막 drwNo 이후만 자동 fetch.
- **수동 실행**: 사용자 PC에서 `node scripts/fetch-lotto-draws.mjs` 또는 `scripts/fetch-lotto-draws.bat`.
- **클라이언트 동기화**:
  - **boot 시점**: `data/storage.js` `syncDraws()`가 정적 JSON → localStorage (전체 갱신).
  - **통계 페이지 진입 / 갱신 버튼**: `syncDrawsIfNewer()`가 미러 `latest.json` peek → cached max drwNo와 비교 → **새 회차 있을 때만** 정적 JSON 재fetch + saveDraws (날짜 기준 갱신).
- **SW 정책**: `_registry.json`과 `draws.json` 모두 `NETWORK_FIRST_PATHS`. 캐시 stale 없음.

### 4.4. 페치 스크립트

- 위치: `D:\claude_code\game\scripts\fetch-lotto-draws.mjs` (게임 허브 공용).
- 실행:
  - `node scripts/fetch-lotto-draws.mjs` - 자동 (`all.json` bundle 한 방, 1초 미만)
  - `node scripts/fetch-lotto-draws.mjs 1100 1110` - 범위 지정 (단건 endpoint × N)
  - `node scripts/fetch-lotto-draws.mjs --full` - 자동과 동일 (호환용)
- 출력: `games/lotto/src/data/draws.json`.
- 기본 모드는 항상 bundle 동기화. 미러는 매주 토 GitHub Actions로 갱신되므로 전수 재적재가 안전.

### 4.5. 미러 응답 → Draw 스키마 매핑

| 우리 필드 (3.3) | 미러 필드 | 변환 |
|---|---|---|
| `drwNo` | `draw_no` | 그대로 |
| `drwDate` | `date` | ISO datetime → `YYYY-MM-DD` (앞 10글자) |
| `numbers` | `numbers` | 그대로 (6원소 배열) |
| `bonus` | `bonus_no` | 그대로 |
| `firstWinners` | `divisions[0].winners` | 빈 객체면 0 (예: 1회차 1등 미당첨) |
| `firstPrize` | `divisions[0].prize` | 빈 객체면 0 |
| `totalSales` | `total_sales_amount` | 그대로 |

### 4.6. Fallback (미러 갱신 끊김 시)

- 미러 latest.json이 1주 이상 갱신 안 되면 미러 의존 중단.
- 신규 회차는 사용자가 동행복권 정상 채널(앱/모바일)로 확인 후 자비스에 수동 입력.
- 입력 양식: `drwNo / YYYY-MM-DD / 본번호 6 / 보너스`. 자비스가 `draws.json`에 1건 추가.
