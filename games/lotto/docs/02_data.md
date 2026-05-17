# 02. 게임 데이터

## 1. 수치 상수

### 1.1. 6/45 룰

| 상수 | 값 | 의미 |
|---|---|---|
| `NUMBER_MIN` | 1 | 본번호 최소값 |
| `NUMBER_MAX` | 45 | 본번호 최대값 |
| `PICK_COUNT` | 6 | 본번호 추첨 개수 |
| `BONUS_COUNT` | 1 | 보너스볼 개수 |

### 1.2. ~~Luck 스탯~~ (S089, 2026-05-17 전면 폐기)

**폐기 사유**: 사용자 명시 "Luck을 게임요소로 추가하고 싶은 생각 없음" + 낮은 Luck 점수가 부정적 인상 유발 + 사행성 회피 정책(CLAUDE.md 6.3) 정합.

폐기 상수: `LUCK_MIN` / `LUCK_MAX` / `LUCK_INITIAL` / `LUCK_BONUS_HIT` / `LUCK_BONUS_DAILY` / `LUCK_BONUS_RITUAL`.

코드 영향: `core/luck.js` 모듈 전체 폐기 + 캐릭터 schema에서 `luck` 필드 제거 (옛 사용자 자동 마이그레이션) + BLESSED 전략 boost는 +0.5 고정 (Luck 비례 폐기) + ritual 만땅 보상은 잠금만 유지 (+5 폐기).

### 1.3. 통계 윈도우 (Hot/Cold 회차 수)

| 상수 | 값 | 용도 |
|---|---|---|
| `RECENT_SHORT` | 10 | 단기 |
| `RECENT_MID` | 30 | 중기 (보너스볼 기본) |
| `RECENT_LONG` | 100 | 장기 |

### 1.4. ~~비율 필터 (역대 다수 영역)~~ S43.4 (2026-05-08, Sprint 054) 폐기

**폐기 사유**: 옛 architecture의 balancer post-filter 전용. 새 architecture(S43, docs/01_spec.md 5.1.3.0)는 풀 1-45 균등 가중 추첨이라 post-filter 미사용.

폐기 상수: `SUM_RANGE_MIN` / `SUM_RANGE_MAX` / `ODD_EVEN_PREFERRED` / `AC_VALUE_MIN` / `AC_VALUE_MAX`.

이하 옛 사양 (참조용):

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
| `blessed` | 랜덤 | 캐릭터 시드 6번호에 +0.5 boost (S089 Luck 폐기 후 고정값) | **랜덤** | 균등 + 시드 분산 | 시드 |
| `statistician` | 많이 나온 수 | 역대 회차에 가장 많이 나온 번호 위주 | **통계** | 본번호 누적 빈도 가중 (`count^STATS_POWER`) | **객관** |
| `secondStar` | 보너스볼 | 역대 보너스볼로 자주 나온 번호 위주 (본번호 + 보너스 모두 적용) | **통계** | 본번호 + 보너스 모두 보너스볼 빈도 가중 (`count^STATS_POWER`) | **객관** |
| `regressionist` | 안 나온 수 | 오랫동안 안 나온 번호 위주 | **통계** | 미출현 갭 가중 (`gap^GAP_POWER`) | **객관** |
<!-- S34 (2026-05-08): pairTracker 행 폐기. 동시출현 매트릭스(cooccur) 자체는 통계 탭에서 학습 자산 유지. -->
<!-- ~~`pairTracker` | 짝꿍 번호 | ... | **객관** (S30.4)~~ - 폐기. 동행 보장 못 함 + 사용자 가치 의문. -->

| `astrologer` | 별자리 행운 | 캐릭터 별자리 12종의 행운 번호 위주 | **운세** | 별자리 행운 번호 5배 boost | 시드 |
| `trendFollower` | 최근 트렌드 | 최근 30회에 자주 나온 번호 위주 | **통계** | 최근 30회 Hot 번호 가중 (raw, recent30 0~9 자연 분포) | **객관** |
| `intuitive` | 직감 | 회차마다 다른 분포 (같은 캐릭터는 같은 결과) | **랜덤** | 매 회차 다른 무작위 가중 (시드 결정론 유지) | 시드 |
| `balancer` | 균형 조합 | 번호 합 121~160 + 홀짝 3:3 필터를 통과한 조합만 | **랜덤** | 합 121~160 + 홀짝 3:3 (최대 50회 재추첨) | **객관** |
| `zodiacElement` | 원소 행운 | 별자리 4원소(불/땅/공기/물) 그룹 행운 번호 | **운세** | 4원소 그룹별 행운 번호 5배 boost | 시드 |
| `fiveElements` | 사주 행운 | 캐릭터 일주의 천간 오행(목/화/토/금/수) 행운 번호 | **운세** | 5원소 그룹별 행운 번호 5배 boost | 시드 |

기본 전략: `blessed` (`STRATEGY_DEFAULT`).

#### 1.5.1. ~~객관 전략 vs 시드 의존 전략~~ S43.4 (2026-05-08, Sprint 054) 폐기

**폐기 사유**: 새 architecture는 모든 strategy가 samplingSeed = mix(seed, drwNo) 의존. 객관 vs 시드 의존 분기 의미 없음. 폐기 상수: `OBJECTIVE_STRATEGIES` / `OBJECTIVE_SEED_SALT`.

이하 옛 분류 (참조용):

- **객관(5개)**: `statistician` / `secondStar` / `regressionist` / `trendFollower` / `balancer`. 회차 데이터(통계)만 입력. **캐릭터 시드 무관**. 같은 회차에서 모든 캐릭터가 동일 결과. 결정론 시드: `mixSeeds(mixSeeds(drwNo, OBJECTIVE_SEED_SALT), strategyHash(strategyId))` (S21, 2026-05-03 - 전략별 시드 분산). (S089 Luck 폐기로 "Luck 무관" 조항 자연 흡수.)
- **시드 의존(5개, S34 짝꿍 폐기로 6 → 5)**: `blessed` / `astrologer` / `intuitive` / `zodiacElement` / `fiveElements`. 캐릭터 시드 + drwNo. 캐릭터별 다른 결과. 결정론 시드: `mixSeeds(seed, drwNo)`. (S089 Luck 입력 폐기.)
- 분류 위치: `src/data/numbers.js` `OBJECTIVE_STRATEGIES` Set. 분기 위치: `src/core/recommend.js`.
- 트레이드오프: 객관 전략은 사용자가 캐릭터를 바꿔도 결과 동일. 그것이 객관 통계의 본질. 캐릭터 차별화는 시드 의존 7개에서.

#### 1.5.4. ~~다중 전략 분배~~ S43 (2026-05-08) 폐기

**폐기 사유**: 새 architecture는 단일 weight 벡터 + weightedSample 1번 호출. 다중 strategy 분배(6/N개씩) 폐기. `distributeCounts` 호환 wrapper 보존(테스트 import만, 실제 호출 0건).

이하 옛 분배 룰 (참조용):

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
- 통계: trendFollower → statistician → secondStar → regressionist (S34 pairTracker 폐기로 5종 → 4종)

1.5.4.4. **출처 라벨**: 결과 객체에 `strategySources: string[]` (numbers와 동일 순서). 추천 리스트(saved-sets-section)에서 1글자 short(`strategy.short`) + 카테고리 색 배경 표시 (단일 strategy면 빈 배열 → 라벨 미표시). S22 dot → 1글자 라벨. S27 메인 카드 폐기로 노출 위치 = 누적 리스트 row 단위.
1.5.4.5. **최소 1개 보장**: 다중 모드에서 마지막 1개 토글 제거는 무시 (전략 0개 방지).
1.5.4.6. **백캐스트 영향 없음**: `backfillRecommendations`은 단일 전략으로 결정론 유지. 다중 모드여도 history는 첫 전략 기준.

1.5.4.7. **S25 풀 평균 수렴 검증**: 운세 3개(별자리/원소/사주) 결과 평균이 풀 합집합 평균(22~30 케이스 의존)에 수렴. 이전 S3-T1~S24는 평균 6~9 (작은 번호 편향). 회귀 테스트 `tests/suites/recommend.test.js` "S25 recommendMulti: 운세 3개 평균 풀 평균에 수렴".

#### 1.5.5. 5세트 동시 추천 (S4-T1 신설 / S27 추첨 탭 노출 폐기, 2026-05-03)

**S27 변경**: 추첨 탭에서 메인 카드 + 5세트 컴팩트 노출 폐기. 본 절의 시드 변형 룰은 추천 리스트의 + 5세트 버튼이 동일하게 재사용 (1.5.8 참조). `options.fiveSets`는 storage에 잔존하나 UI 영향 0.

옵션 `options.fiveSets = true` 활성 시 한 회차에 5장의 추천 세트를 동시 표시 (S27 이전 정책). 시드 변형(salt)으로 5개 다른 결정론 결과. 다중 전략 모드와 직교(병행 가능).

| 상수 | 값 | 의미 |
|---|---|---|
| `FIVE_SETS_COUNT` | 5 | 한 번에 노출할 세트 수 |
| `FIVE_SETS_SALT_BASE` | `0x5E7A` | 세트별 시드 변형 솔트 베이스 |

1.5.5.1. **시드 변형 룰**: 세트 i (0~4)의 입력 시드 = `mixSeeds(baseSeed, FIVE_SETS_SALT_BASE + i)` 단, i=0은 baseSeed 그대로(메인 = 기존 동작 호환).
1.5.5.2. **결정론 유지**: 같은 캐릭터 + 같은 회차 + 같은 전략 = 같은 5세트. 다중 모드 ON이면 각 세트 안에서 다중 분배 동일 룰 적용.
1.5.5.3. **객관 전략 처리**: 객관 전략(1.5.1)은 캐릭터 시드 무관 → 5세트가 모두 같은 결과가 되면 의미 없음. 따라서 5세트 모드의 객관 전략은 시드 변형을 `mixSeeds(drwNo, OBJECTIVE_SEED_SALT + i)`로 바꿔 회차 내부에서 5개 분기 시드를 만든다(여전히 캐릭터 무관, 회차 단위 결정론).
1.5.5.4. **이력 영향**: history 기록은 **#1(메인)에만** 적용. #2~#5는 표시 전용(서사적 "다른 시도"). 백캐스트 영향 없음. (S089 Luck 폐기로 본 절 안 "Luck 매칭" / "Luck +5" 조항 제거.)
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
| **통계** | 회차 데이터를 weight 소스로 사용 | 4 | statistician / secondStar / regressionist / trendFollower (S34 pairTracker 폐기) |

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

#### 1.5.6. 풀 컷팅 + 균등 추첨 (S18, 2026-05-02 / **S43 (2026-05-08) 폐기**)

**S43 (2026-05-08) 폐기 사유**: 사용자 통찰 "알고리즘 근본 잘못. 부분 fix 의미 없다". 풀 컷팅이 누적 결함의 한 축으로 지목됨.

- 풀 좁음 → 결정론 채택 → 풀 안 1-9 비중이 그대로 노출.
- 다중 strategy 분배와 결합 → 각 풀의 작은 인덱스 모임 → 끝자리 패턴 클러스터링.
- S43 새 architecture에서 **풀 컷팅 폐기**. 학설 = 정의가 아닌 약한 가중치(+0.3~+0.5). 1-45 전체 추첨 가능.
- `STATS_POOL_SIZE` 상수 / `poolFromWeights` 함수는 `@deprecated`. 다음 sprint 폐기.
- 새 architecture 상세는 `docs/01_spec.md` 5.1.3.0 참조.

이하 옛 풀 컷팅 사양 (참조용):

> **사용자 결정 = "어정쩡한 값 절대 금지"**. 이전 weight 비례 PRNG ("1등 자주 / 30등 가끔" 모호) → 풀 컷팅 + 균등 추첨.

##### 1.5.6.1. 메커니즘

각 시드 의존 / 통계 전략의 weight 계산 후 **상위 N등 풀로 잘라** 풀 안 = 1 (균등), 풀 밖 = 0 (절대 안 뽑힘). 시드 PRNG로 풀 안에서 K개 추첨. K는 분배 룰 (1.5.4) 또는 단일 모드 6.

##### 1.5.6.2. 전략별 풀 크기

| 전략 | 풀 | 풀 크기 |
|---|---|---|
| 많이 나온 수 | count 상위 | `STATS_POOL_SIZE` = 10 |
| 보너스볼 | 보너스 빈도 상위 | 10 |
| 안 나온 수 | gap 상위 | 10 |
| 최근 트렌드 | 최근 30회 빈도 상위 | 10 |
| 별자리 행운 | `ZODIAC_LUCKY[zodiac]` | 8~10 (별자리별) |
| 원소 행운 | `ZODIAC_ELEMENT_LUCKY[el]` | 13~14 |
| 사주 행운 | `FIVE_ELEMENTS_LUCKY[출생] ∪ [추첨일(보너스 시)]` | 9~18 (일진 변동) |
| 랜덤 | (풀 컷팅 무관) 1~45 + 시드 6번호 +0.5 boost | 45 |
| 직감 | (풀 컷팅 무관) 매 회차 random weight | 45 |
| 균형 조합 | (풀 컷팅 무관) 합/홀짝 필터 통과 조합 | 조합 단위 |

##### 1.5.6.3. 사주 일진 보너스 변경 (S16 → S18)

이전 (S16): 출생 풀 ×5 + 추첨일 풀 ×R (R=1~3, 통변성 차등). weight 차등.
S18: **풀 합집합** + 균등. boost > 1 (인성/식상/재성/비견)인 관계는 추첨일 풀 추가, boost = 1 (관성)인 관계는 출생 풀만. weight 균등.

이유: weight 차등은 "어정쩡" - "출생 lucky 자주 / 추첨일 lucky 가끔". 풀 합집합 + 균등은 명확.

##### 1.5.6.4. 풀 외 번호 = 절대 안 뽑힘 (S18 의도 + S33 실제 차단)

이전 weight PRNG에서 풀 밖 = WEIGHT_MIN_FLOOR 등 약한 값 = 가능성 0 아님. S18에서 풀 밖 = 0 = 확률 0 (의도). 추천 결정 메커니즘 명확화.

**S33 (2026-05-08) 실제 차단**: S18은 *풀 정의*에서 풀 밖 = 0이었으나, 후속 처리(`applyLuck`의 `Math.max(w, WEIGHT_MIN_FLOOR)` + `weightedSample`의 동일 floor)가 풀 밖 0을 `0.0001`로 양수화하여 시드 의존 전략(`astrologer` / `zodiacElement` / `fiveElements`)에서 풀 외 번호도 매우 낮은 확률로 추첨되던 잠재 버그 존재. S30.2가 풀 *표시*만 정정한 후 *실제 추첨* 정정이 후순위로 남아있던 사안.

S33 fix: `applyLuck` + `weightedSample`의 floor를 "원본 0 유지(풀 외) / 양수만 floor 적용(수치 안정)"로 변경. 풀 외 0 → boost ×0 = 0. weightedSample은 `total <= 0` 가드로 모든 weight=0 케이스(데이터 부재)도 안전 break.

**데이터 부재 fallback (S33)**: `zodiac` 미지정 / 빈 `cooccur`처럼 풀 자체가 비어있는 케이스에 한해 균등 추첨 fallback (`zodiacWeights` / `objectivePairWeights`가 빈 풀일 때 `uniformWeights()` 반환). 풀 외 차단의 정상 동작은 데이터가 *있을 때* 한정.

**S38 (2026-05-08) 통계 풀 컷팅 데이터 부재 fix**: `statsToWeights` / `gapWeights` / `trendWeights`가 빈 stats 입력 시 모든 weight를 같은 값(`WEIGHT_MIN_FLOOR` 또는 1)으로 채워, `poolFromWeights` 정렬이 동률이라 인덱스 0~9(=번호 1~10)가 항상 풀로 잡히는 결정론 버그. 사용자가 페치 전 / 새 캐릭터 / 신규 구좌에서 "1~9 위주 추천" 시청. 균형 프리셋(trendFollower 포함)이 본 결함을 가장 강하게 노출 (시뮬: 1-9 41.9% / top10 = 1~10).

S38 fix: `poolFromWeights`에 가드 추가. `max === min`이면 풀 컷팅 의미 없음 → 1~45 균등 반환. 정상 데이터(가중 차등 있음)는 영향 0. 시뮬 회복: 균형 1-9 41.9% → 18.4%, 모든 strategy 거의 균등.

##### 1.5.6.5. 적용 위치

`src/core/recommend.js`:
- `poolFromWeights(weights, poolSize)`: 원본 weight → 상위 N 풀 컷팅
- `poolFromIndices(indices)`: 인덱스 집합 → 풀 균등 weight
- 통계 5종 + 운세 3종 분기에 적용

`src/data/numbers.js`: `STATS_POOL_SIZE = 10` 상수.

#### 1.5.7. ~~객관 전략 시드 분산~~ S43 (2026-05-08) 폐기 (1.5.1 동반)

**문제 (1.5.6 풀 컷팅 후 발견)**: 객관 전략 5종이 모두 동일한 `mixSeeds(drwNo, OBJECTIVE_SEED_SALT)` 시드 사용 → mulberry32(seed)의 첫 6 추출 위치가 5종 모두 동일 (풀 인덱스 0,1,2,3,6,8) → 다중 전략 모드(각 전략 1개씩 채택) 시 **각 풀의 최솟값**만 모이며 작은 번호 편향.

실측: 1223회 시뮬에서 5종 풀 모두 추출 인덱스 0,1,2,3,6,8로 동일.

**해결**: 객관 전략 시드에 `strategyHash(strategyId)` 솔트 추가.

```js
const objectiveSeed = mixSeeds(mixSeeds(drwNo, OBJECTIVE_SEED_SALT), strategyHash(strategyId));
```

`strategyHash(sid)` = djb2 32bit unsigned 해시 (`recommend.js` private). 결정론 (같은 ID = 같은 해시).

#### 1.5.8. 누적 추천 세트 (S26, 2026-05-03)

조립식(strategy 조합 + 캐릭터 시드 + 회차)으로 생성된 1세트(6번호)를 사용자가 명시적으로 누적. 5세트 토글(1.5.5)과 별개의 직교 모델.

##### 1.5.8.1. 데이터 모델

캐릭터 객체 안:

```
character.savedSets = {
  drwNo: 1223,
  list: [
    {
      numbers: [3, 4, 9, 12, 19, 24],
      strategyIds: ['astrologer', 'zodiacElement', 'fiveElements'],
      strategySources: ['astrologer', 'fiveElements', 'astrologer', 'zodiacElement', 'fiveElements', 'astrologer'],
      recipeId: 'astrologer-fiveElements-zodiacElement',
      createdAt: 1714723200000,
    },
    ...
  ],
}
```

##### 1.5.8.2. 상수

| 상수 | 값 | 의미 |
|---|---|---|
| `SAVED_SETS_CAP` | 20 | 누적 list 상한 (사행성 톤 회피) |
| `SAVED_SETS_BATCH_SMALL` | 1 | "+ 1세트" 버튼 batch |
| `SAVED_SETS_BATCH_LARGE` | 5 | "+ 5세트" 버튼 batch |
| `SAVED_SETS_SALT_BASE` | `0x5A1ED` | 시드 변형 솔트 base (FIVE_SETS_SALT_BASE와 충돌 회피) |
| `SAVED_SETS_RETRY_MAX` | 50 | 풀 한계 시 dedupe 재시도 상한 (S32, 2026-05-07) |
| `SAVED_SETS_TOAST_NORMAL_MS` | 1500 | 정상 / cap 토스트 노출 시간 |
| `SAVED_SETS_TOAST_PARTIAL_MS` | 2500 | 부분 중복 토스트 노출 시간 (부연 카피 길어 1초 가산) |
| `SAVED_SETS_JUST_ADDED_MS` | 1000 | S60 (2026-05-10): 추가된 세트 카드 펄스 시간. 토스트와 시각 동시 시작, 토스트보다 먼저 종료(1.5s 토스트 < 2.5s 토스트 모두에서 자연 페이드) |

##### 1.5.8.3. 시드 변형 룰

같은 조립식으로 N장 만들 때 매번 다른 결정론 결과:

- 객관 strategy 포함: `drwNo` 변형. `mixSeeds(baseDrwNo, SAVED_SETS_SALT_BASE + offset)`.
- 그 외: `seed` 변형. `mixSeeds(baseSeed, SAVED_SETS_SALT_BASE + offset)`.
- offset = `현재 list 길이 + i`. 매 batch 호출마다 다른 시드 → 매번 다른 결과 (단 같은 시점 재호출은 결정론).

##### 1.5.8.4. 회차 격납 + 자동 비움

`ensureSavedSetsForRound(character, drwNo)`:
- savedSets 부재 시 `{ drwNo, list: [] }` 생성.
- `drwNo` 일치 시 그대로.
- `drwNo` 불일치 시 list 비움 + reset 플래그 반환.

추첨 탭 진입 / 캐릭터 전환 시마다 자동 호출 (`renderHome` 안). 다음 회차로 넘어가면 이전 누적은 자동 폐기.

##### 1.5.8.5. 중복 차단 + 풀 한계 재시도 (S32, 2026-05-07)

같은 `numbers` 조합(정렬 동일)은 추가 시 skip. `addSavedSets` 결과의 `skipped.duplicate` 카운트로 보고.

**재시도 룰 (S32 신규)**: 별자리 / 사주 행운 등 풀 좁은 전략에서 시드 변형해도 새 unique 조합이 안 나오는 한계 케이스 대응.

1.5.8.5.1. + 클릭 시 batchN개 추첨 → dedupe 미달분만큼 시드 offset 증가 + 재추첨.
1.5.8.5.2. 누적 시도 횟수가 `SAVED_SETS_RETRY_MAX` 도달 또는 batchN 채워지면 종료.
1.5.8.5.3. 결과 = `{ addedCount, requestedCount, exhausted: boolean }`. `exhausted`는 재시도 한계 도달 + addedCount < requestedCount일 때 true.
1.5.8.5.4. cap 도달은 재시도 룰과 별개. cap 우선 (cap 차서 skip 발생 시 `exhausted` false로 보고).

##### 1.5.8.6. 결과 안내 카피 (S32, 2026-05-07 신규 / S60, 2026-05-10 토스트 위치 + 펄스 강화)

| 케이스 | 트리거 | 노출 | 카피 |
|---|---|---|---|
| A. 정상 | `addedCount === requestedCount` | 화면 하단 fixed 토스트 `SAVED_SETS_TOAST_NORMAL_MS` + 추가된 카드 펄스 `SAVED_SETS_JUST_ADDED_MS` | `추천 {N}세트를 추가했습니다` |
| B. 부분 중복 | `addedCount < requestedCount && !exhausted && !cap` | 화면 하단 fixed 토스트 `SAVED_SETS_TOAST_PARTIAL_MS` + 추가된 카드 펄스 `SAVED_SETS_JUST_ADDED_MS` | `추천 {M}세트 추가 · 같은 조합 {D}개는 자동 제외` |
| C. 풀 한계 | `exhausted === true` | 누적 리스트 상단 배너 (지속). 추가된 세트가 있으면 펄스도 함께 1초 | `이 전략 조합으로 만들 수 있는 모든 추천을 가져왔습니다 (총 {totalN}세트). 다른 전략을 골라 추가할 수 있어요.` |
| D. cap 도달 | `skipped.cap > 0` 또는 list 길이 = `SAVED_SETS_CAP` | 액션바 hint + 버튼 비활성 | `최대 {SAVED_SETS_CAP}세트에 도달했습니다 · 일부 삭제 후 추가 가능` |

1.5.8.6.1. 변수 표기 : `{N}`(요청 수), `{M}`(추가된 수), `{D}`(중복 제외 수), `{totalN}`(현재 list 길이).
1.5.8.6.2. **금지 단어** (CLAUDE.md 6.3 일관) : "확률" / "필승" / "당첨 향상" / "적중" - 카피 어디에도 사용 금지. "참고용" 톤 유지.
1.5.8.6.3. **C 배너 해제 정책** : `state.poolExhaustedRecipeId`(정규화된 `recipeId`)와 현재 활성 `strategyIds`의 정규화 키가 일치할 때만 배너 노출. strategyIds 변경 시 키 불일치 → 자동 해제.
1.5.8.6.4. **D hint 해제** : 세트 1개 이상 삭제로 cap 풀리면 자동 해제 (액션바 hint는 cap 충족 시점만 표시).
1.5.8.6.5. 우선순위(동시 발생 시) : D > C > B > A. 예) cap 도달이면 풀 한계 배너 무시하고 D만 노출 (cap이 더 절대적인 차단).
1.5.8.6.6. **A 토스트 노출 위치 (S60)** : `body` 직속 lazy-init 컨테이너로 화면 하단 fixed (bottom-tabs 위 12px). z-index = `--z-toast`(50, overlay 10 < toast 50 < modal 100). 누적 리스트가 길어 액션바가 화면 밖으로 밀려도 메시지 인지 보장. 액션바 인라인 슬롯(`.saved-add-toast` data-role="saved-toast") 폐기.
1.5.8.6.7. **A/B 펄스 (S60 / S62 / S66 시각 재정정, 2026-05-10)** : `saved-set-row` 인덱스 `startIdx ~ startIdx + addedCount - 1`에 `is-just-added` 클래스 부여 + `SAVED_SETS_JUST_ADDED_MS`(1000ms) 후 제거.

**S66 (2026-05-10) 펄스 영역 재정정**: S62의 `.saved-set-row::before inset: 4px 8px` 패턴이 row 좌우 padding 0 환경에서 라벨 "추천N" 글자 일부를 가로지름. 사용자 보고 "추천1,2 스트링 중간만 하이라이트에 들어감". 펄스 영역을 row 전체 → **`.saved-set-balls`(번호공 컨테이너)** 로 좁힘. 의미적으로도 "새로 들어온 번호 6개"를 강조하는 게 정확. 라벨 / 휴지통 영역은 펄스 무관.

| 항목 | 값 |
|---|---|
| 펄스 컨테이너 | `.saved-set-row.is-just-added .saved-set-balls` (라벨 / 휴지통 외) |
| 렌더 방식 | `::before` pseudo (`position: absolute`) - layout 영향 0 |
| pseudo inset | `0` (번호공 영역 정확히 덮음) |
| 라운드 | `var(--radius-md)` |
| 배경 | `rgba(201, 160, 80, 0.18)` 시작 → `transparent` 페이드 |
| 외부 글로우 | `box-shadow: 0 0 14px rgba(201, 160, 80, 0.35)` 시작 → 0 (글로우는 컨테이너 바깥으로 부드럽게 새어나감) |
| 외곽선 (inset border) | **폐기** (시선은 외부 글로우만으로 충분) |
| pointer-events | `none` (클릭 통과) |
| z-index | pseudo 0 / 번호공 1 (글자 / 색이 펄스 위에 보임) |
| reduced-motion | pseudo 표시 + 정적 옅은 배경 (animation 미적용) |

##### 1.5.8.7. 적용 위치

- `src/core/saved-sets.js`: `ensureSavedSetsForRound` / `addSavedSets` / `removeSavedSetAt` / `clearSavedSets` / `recipeIdFor` / `hasSameNumbers` + (S32) 재시도 결과 구조 확장.
- `src/render/saved-sets-section.js`: UI (섹션 + 추가 버튼 바) + (S32) 풀 한계 배너 슬롯.
- `src/render/main.js`: `addSavedSetsBatch` 핸들러 (S32 재시도 + 토스트 분기) + 회차 ensure 호출.
- `src/data/numbers.js`: 상수.

**객관성 정의 유지**: 1.5.1 "캐릭터 시드 무관". `strategyId`는 캐릭터 속성이 아니라 사용자가 회차별로 선택하는 정책 ID → 시드 분산에 활용해도 객관성 위배 아님. 같은 회차 + 같은 전략은 모든 캐릭터에 동일 결과 (객관성 보장). (S089 Luck 폐기로 본 조항에서 Luck 항목 제거.)

**5세트 호환**: 1.5.5.3의 `mixSeeds(drwNo, OBJECTIVE_SEED_SALT + i)`는 외부에서 `drwNoVariant`로 처리되어 본 변경과 직교. 5세트 안에서 각 세트가 다른 `drwNo`를 받고, 그 위에 strategyId 솔트가 추가로 적용됨.

**테스트 영향**: 객관 전략 단일 호출 결과가 변함. `tests/suites/recommend.test.js`의 heavy 가중 검증은 시드 운에 의존하던 임계값(>=4)을 제거하고 풀 크기와 일치(heavy 10개 = STATS_POOL_SIZE)하는 결정적 검증으로 강화 (S21).

### 1.6. 운세 등급 ID

| ID | 한국어 |
|---|---|
| `great` | 대길 |
| `good` | 길 |
| `neutral` | 평 |
| `bad` | 흉 |

### 1.7. 추첨 가중치 한계 (**S43 (2026-05-08) - WEIGHT_MAX_BIAS 폐기**)

**S43 (2026-05-08) 변경**:
- `WEIGHT_MAX_BIAS = 50.0` (S0~S41) / `5.0` (S42 약화) → **새 architecture에서 직접 사용 X**.
- 새 architecture는 시드 보너스를 +0.5 수치로 직접 가산. S089 (2026-05-17) 이전에는 Luck 비례(0~0.5)였으나 Luck 폐기로 고정값 채택. 1-45 base 1.0의 1.5배 = max 1.5.
- 옛 `applyLuck` 함수는 S089에서 모듈 전체 폐기. 새 architecture는 `computeUnifiedWeights` 안에서 직접 처리.
- `WEIGHT_MIN_FLOOR = 0.0001`은 weightedSample의 안전망(weight 0 합 방지)으로 보존.

이하 옛 가중치 한계 사양 (참조용):

| 상수 | 값 | 의미 |
|---|---|---|
| `WEIGHT_MIN_FLOOR` | 0.0001 | 0 가중치 방지 (수치 안정성) |
| ~~`WEIGHT_MAX_BIAS`~~ | ~~50.0~~ | ~~Luck 100 시 시드 번호 최대 증폭~~ (S089 Luck 폐기로 옛 architecture 잔재. dead 상수, cleanup 후순위) |
| `STATS_POWER` | 1.5 | 누적 빈도 weight 증폭 지수 (statistician / secondStar) |
| `GAP_POWER` | 1.3 | 미출현 갭 weight 증폭 지수 (regressionist) |

1.7.1. **power 보정 사유**: 1221회 누적 시점에서 본번호 totalCount는 평균 ≈ 163, 실측 ±19% (133~182) 편차로 비복원 가중 추출에서 거의 균등과 구분 안 됨. weight를 `count^k`로 보정해 분포 차이를 인지 가능 수준으로 증폭.
1.7.2. **STATS_POWER=1.5 실측 (1221회 시점, 2026-05-02 simulate-stats-power.mjs)**: count 133~182 → weight 1534~2455. ratio **1.368 → 1.601**. 10000회 추출 시뮬에서 추출 빈도 ratio 1.587 (균등 1.0 대비 59% 차이). 사용자 인지 가능, "확률 향상" 톤 회피 수준.
1.7.3. **GAP_POWER=1.3 실측**: gap 0~19 → weight ratio 19 → 46 (2.42배 증폭). 적정.
1.7.4. **trendFollower는 raw 유지**: recent30 raw ratio 9 (이미 충분히 두드러짐). 1.5 보정 시 27배 증폭으로 과도하다 판단(2026-05-02 시뮬). raw 유지가 자연.
1.7.5. power 변경은 모든 캐릭터 객관 결과에 영향. 0.0~3.0 범위 내에서 조정 가능.
1.7.6. 위치: `src/data/numbers.js`. 사용처: `src/core/recommend.js` `statsToWeights` / `gapWeights`.
1.7.7. 시뮬레이션 스크립트: `scripts/simulate-stats-power.mjs` (게임 허브 루트). `node scripts/simulate-stats-power.mjs`로 재측정 가능.

### 1.16. 백캐스트 (S089 후 = 이력 부트스트랩)

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

### 1.19. 당첨 기원 (T4 / S14 / S089-후속, 2026-05-02 신설 → 라벨/시각 갱신, 정성 콘텐츠)

해석 B 채택. "당첨 확률 높이기" 메커닉 아님. (S089, 2026-05-17 ~~Luck +5 보너스 폐기~~. 만땅은 잠금만 유지 = 회차당 1회 의식 완료 인정.) SSOT: docs/01_spec.md 5.6.

S14 변경(2026-05-02): UI 라벨 "행운 의식" → "행운 쌓기". 시각 게이지 바(0~100 %) → 8 아이콘 진척도 (8 × 12.5 = 100, 1:1 매핑). 백엔드 상수(`RITUAL_GAUGE_MAX` 100 / `RITUAL_GAIN_PER_ACTION` 12.5)는 그대로.

S089-후속 변경(2026-05-17): UI 라벨 "행운 쌓기" → "당첨 기원" (사용자 명시). + bonus chip("+5 적용" / S089에서 임시 "완성"으로 정정) 폐기 - cta "완성 ✓"와 중복 인지 회피. 만땅 시각 강조는 `.is-filled` class + completionBanner로 유지.

| 상수 | 값 | 의미 |
|---|---|---|
| `RITUAL_GAUGE_MAX` | 100 | 게이지 만땅 |
| `RITUAL_GAIN_PER_ACTION` | 12.5 | 행위 1회 게이지 증가 (8 × 12.5 = 100) |
| ~~`LUCK_BONUS_RITUAL`~~ | ~~5~~ | ~~만땅 시 캐릭터 Luck 보너스~~ (S089 2026-05-17 폐기) |

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
  appliedBonus: boolean,    // 만땅 의식 완료 잠금 (회차당 1회). S089 이전 Luck +5 보상 잠금 용도였음
}
```

1.19.4. 회차 / 캐릭터 변경 시 리셋(`ensureCurrentState`). 같은 charId+drwNo면 보존.
1.19.5. 추첨 결과 / 추천 알고리즘과 **완전 무관**. 당첨 확률 영향 0. (S089 ~~"luck 보너스를 통해서만 영향"~~ 표현 삭제 - Luck 자산 폐기로 자연 무관.)
1.19.6. UI 라벨 사행성 회피 (S089-후속 2026-05-17 정정): "확률" / "필승" 강한 카피는 절대 금지. "당첨"은 "기원" 같은 정성 어휘와 결합 시 허용 (사용자 명시). 단 "당첨 확률 향상" / "당첨 보장" 같은 직접 어필 카피는 여전히 금지. 모달 하단 면책 강제. **현 라벨 (S089-후속) = "당첨 기원"** (옛 "행운 쌓기" / S14 이전 "행운 의식"). intro 본문 보호 카피 "당첨 확률에는 영향이 없습니다" 유지 의무.

1.19.7. 만땅 진입 파티클 버스트 상수 (S58, 2026-05-09 명문화). 위치: `src/data/numbers.js` (수치) + `src/data/colors.js` (색상). 사용처: `src/render/ritual-particles.js`.

| 상수 | 값 | 의미 |
|---|---|---|
| `RITUAL_PARTICLE_COUNT` | 30 | 단발 입자 수 |
| `RITUAL_PARTICLE_DURATION_MS` | 900 | 단발 지속(ms) |
| `RITUAL_PARTICLE_RADIUS_MAX` | 140 | 최대 비행 반경(px) |
| `RITUAL_PARTICLE_SIZE` | 4 | 입자 base 반지름(px) |
| `RITUAL_PARTICLE_COLORS` | `['#f6c445', '#f59e0b']` | 골드 / 앰버 2색 (입자 랜덤 선택) |

1.19.7.1. 접근성: `prefers-reduced-motion` 감지 시 즉시 종료(파티클 미생성). 추첨 결과 영향 없음.

1.19.8. 행운 의식 chip / banner / cta 색 (S059, 2026-05-09 명문화). 위치: `src/data/colors.js` `RITUAL_CHIP_COLORS`. 사용처: `.ritual-row.is-filled` / `.ritual-row-icon.is-done` / `.ritual-row-bonus` / `.ritual-row-cta` / `.ritual-complete-banner` / `.lucky-element`.

| 키 | 값 | 의미 |
|---|---|---|
| `bg` | `#fef3c7` | row / cta 배경 (yellow-50) |
| `fg` | `#92400e` | 텍스트 (amber-900) |
| `border` | `#fcd34d` | border (amber-300) |
| `accent` | `#f59e0b` | 강조 (amber-500, banner gradient stop) |
| `warm` | `#fde68a` | banner gradient mid (amber-200) |

### 1.20. 프리셋 시스템 (S36, 2026-05-08 / S63 부제 폐기, 2026-05-10)

전략 묶음을 1버튼화. 메인 = 3슬롯 고정. SSOT: docs/01_spec.md 5.1.5.

**S63 (2026-05-10) 부제 필드 폐기**: 추첨 탭 슬롯 부제(예: "최신·운세·직감 한 번에")가 사용자에게 "애매한 설명"으로 인지됨. 자비스 정직성 정책상 묶인 실제 전략을 그대로 노출하는 게 맞다. 부제 자리에는 자동 생성된 strategy label list(예: "최신 · 별자리 · 직감")를 표시.

#### 1.20.1. 상수

| 상수 | 값 | 설명 |
|---|---|---|
| `PRESET_SLOT_COUNT` | 3 | 슬롯 개수 (고정. 추가/삭제 불가) |
| `PRESET_LABEL_MAX` | 8 | 라벨 글자 cap |
| ~~`PRESET_SUBTITLE_MAX`~~ | ~~20~~ | **S63 (2026-05-10) 폐기**. 부제 필드 자체 폐기. |

#### 1.20.2. 기본 프리셋 (`DEFAULT_PRESETS`)

첫 진입 / 데이터 손상 / 사용자 reset 시 주입. **S37(2026-05-08, 사행성 책임)** 갱신. **S63(2026-05-10) `subtitle` 필드 제거.** **S75(2026-05-16, 사용자 명시 순서/라벨/묶음 재정렬).**

| id | 라벨 | 묶음 | 자동 표시 (label list) |
|---|---|---|---|
| `preset-1` | 운세 | `astrologer` + `fiveElements` + `zodiacElement` | 별자리 · 사주 · 4원소 |
| `preset-2` | 균형 | `trendFollower` + `astrologer` + `intuitive` | 최신 · 별자리 · 직감 |
| `preset-3` | 분산 | `balancer` + `fiveElements` | 균형 · 사주 |

`DEFAULT_PRESETS`는 `Object.freeze`로 immutable. 사용자 편집 시 `loadPresets`가 deep clone 후 반환.

**S75 변경 사유 (사용자 명시)**:
- 슬롯 1 운세 = 캐릭터 정체성 가장 강한 묶음을 첫 자리에 노출.
- 슬롯 2 균형 = 통계 + 학설 + 직감 = 한쪽 치우침 없는 묶음.
- 슬롯 3 분산 = `balancer` + `fiveElements` 2전략. 직감 명시 제외. "균형 패턴 + 사주 보너스".
- 옛 라벨 `-파` 어미 폐기 = 짧고 직관.
- 신규 캐릭터 진입 시 슬롯 1(운세) 자동 활성 (`character-form.js`). 옛 `[STRATEGY_DEFAULT]`(=BLESSED) 단독 진입이 어느 프리셋과도 일치 안 함 → "선택 안 됨" 상태로 추천되던 버그 정정.
- 마이그레이션 (`storage.js` `loadPresets`): 옛 디폴트 라벨 `['균형', '분산파', '운세파']` 정확 일치 + 사용자 편집 흔적 0 = 새 디폴트로 자동 reset. 편집 흔적 1건이라도 있으면 보수적 보존.

**S37 변경 사유 (사행성 책임)**:
- 폐기: `preset-2` "통계파" (`statistician` + `regressionist` + `trendFollower` + `secondStar`). 4축 모두 데이터 상위 가중 → 다수 사용자 동시 선택 → 1등 분할 위험. 역대 최다 63명 분할(회차 1052회) 패턴. 게임 정체성("선택의 서사화", CLAUDE.md 6.3) 충돌.
- 신설: `preset-2` "분산파" (`regressionist` + `intuitive` + `balancer`). "남들이 덜 고르는 조합" = 분할 회피 카피. 자비스 1탭 추천이 사용자 보호와 일치.
- `preset-1` 균형 약화: `statistician` → `trendFollower`. 최신은 30회 윈도우 슬라이딩 풀이라 회차마다 변동 → 다수 충돌 자연 감소. 균형 정체성 보존.
- 통계 신봉 사용자: 편집 모달의 체크리스트로 직접 묶음 가능 (자기 책임 영역). 자비스 1탭과 본질 다름.

#### 1.20.3. 저장 키

| 키 | 값 | 설명 |
|---|---|---|
| `lotto_presets` | `Preset[]` | 사용자 프리셋. 미존재 시 `DEFAULT_PRESETS` deep clone. |
| `lotto_char_card_collapsed` | `boolean` | 캐릭터 카드 접힘 학습. S76 (2026-05-17) 흉일 강제 펼침 폐기 - 흉일에도 동일 학습 적용. |

#### 1.20.4. Preset 스키마 (S63, 2026-05-10 부제 필드 제거)

```js
{
  id: string,            // 'preset-1' | 'preset-2' | 'preset-3' (고정)
  label: string,         // 8자 cap. 예: '균형'
  strategyIds: string[]  // 묶을 전략 id list (1개 이상 필수). UI 부제는 본 list로 자동 생성.
}
```

**마이그레이션**: 옛 storage(`lotto_presets`)에 `subtitle` 키가 있어도 `loadPresets`는 그대로 반환(jsono.parse). 렌더 단계에서 미참조라 시각 영향 0. 다음 `savePresets` 호출 시 자연 소실.

#### 1.20.5. 활성 표시 룰

현재 캐릭터의 `lastUsedStrategies` Set과 프리셋의 `strategyIds` Set을 정렬-비교. 일치 시 슬롯 카드 `is-active`.

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

### 2.3. 적중 등수 색 (라이트 톤)

| 등수 | 색상 |
|---|---|
| 1등 | `#c9a050` |
| 2등 | `#b88830` |
| 3등 | `#10b981` |
| 4등 | `#06b6d4` |
| 5등 | `#6b6b75` |
| 미적중 | `#d1d5db` |

2.3.1. 정의 위치: `src/data/colors.js` `RANK_GLOW_COLORS` (1~5등) + `RANK_MISS_COLOR` (미적중, S58 신설).
2.3.2. 사용처: 회차 카드 글로우 (`render/draw-card.js`) + 이력 도넛 차트 (`render/history-page.js`). 한 가지 시각 의미를 한 가지 색으로 통일.

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

### 2.7. 출처 태그 색 (다중 전략 모드, S23 2026-05-03 / S78 2026-05-17 운세 명도 극대화)

추천 카드 본번호 아래 1글자 short 라벨(S22)의 배경색. 모든 카테고리 hue 유지 + 명도 단계. S77 (2026-05-17) 다중 학설 매칭 시 출처 태그 background = linear-gradient 분할.

| 카테고리 | 정책 | 전략별 색 |
|---|---|---|
| 통계 | 파랑 명도 4단계 | trendFollower `#0ea5e9` / statistician `#0284c7` / secondStar `#075985` / regressionist `#0c4a6e` |
| 운세 | **분홍 명도 극대화 (S78)** | astrologer `#f9a8d4` (pink-300, 밝음) / zodiacElement `#db2777` (pink-600, 중간) / fiveElements `#831843` (pink-900, 어두움) |
| 랜덤 | 회색 명도 3단계 | blessed `#6b7280` / intuitive `#4b5563` / balancer `#374151` |

2.7.1. 정의 위치: `src/data/colors.js` `STRATEGY_TAG_COLORS` + `strategyTagColor(sid)` 헬퍼.
2.7.2. 적용 위치: `src/render/draw-card.js` / `src/render/saved-sets-section.js` `numHtml` → `tagHtmlFromSources` → `tagBackgroundFromSources` (S77 다중 매칭 시 linear-gradient 분할).
2.7.3. **S78 운세 명도 극대화**: 옛 pink-500/700/800 (1~2단 차이) 시각 구분 약함. pink-300/600/900 (3단 차이)로 변경. 사용자 명시 "색이 더 차이나는거야. 다른게 수정되면 안돼" = hue 유지 + 명도만 극대화.

### 2.8. 카테고리 chip 색 (S059, 2026-05-09 명문화)

전략 행 라벨 / 출처 태그 chip / 카테고리 chip / 운세 lucky-element의 배경+텍스트+border 톤. 2.7 출처 태그(전략별 진한 톤)보다 lighter한 chip 톤.

| 카테고리 | bg | fg | border |
|---|---|---|---|
| 통계 (`is-stats`) | `#e0f2fe` | `#0369a1` | `#bae6fd` |
| 운세 (`is-mapping`) | `#fce7f3` | `#be185d` | `#fbcfe8` |
| 랜덤 (`is-random`) | `#f3f4f6` | `#4b5563` | `#e5e7eb` |

2.8.1. 정의 위치: `src/data/colors.js` `CATEGORY_CHIP_COLORS`.
2.8.2. 적용 위치: `styles/main.css` 인라인 hex (현재). 차후 sprint에서 JS render 측 inline style 단일 소비처화 검토.
2.8.3. SSOT 정합 정책: colors.js의 hex와 main.css 인라인 hex가 동기. 한쪽 변경 시 양쪽 모두 갱신.

### 2.9. 변동성 chip 색 (S059, 2026-05-09 명문화)

`lucky-variability` / `strategy-variability` chip의 active(주간) / inactive(평생) 시각 구분.

| 상태 | bg | fg | border |
|---|---|---|---|
| active (weekly) | `#dcfce7` | `#166534` | `#86efac` |
| inactive (lifetime) | `#f3f4f6` | `#4b5563` | `#d1d5db` |

2.9.1. 정의 위치: `src/data/colors.js` `VARIABILITY_CHIP_COLORS`.
2.9.2. inactive border `#d1d5db`는 `RANK_MISS_COLOR`와 동일 hex (둘 다 비활성 시각 의미). 의도된 일치.

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
3.2.3. `lotto_options.fiveSets`: 5세트 동시 추천 모드 (S4-T1). 기본 false. ~~ON 시 추첨 탭 메인 카드 + 컴팩트 4장 노출~~ (S27 추첨 탭 노출 폐기). 옵션은 storage에 잔존하나 UI 영향 0. 별도 sprint에서 옵션 자체 폐기 검토. 1.5.5 / 1.5.8 참조.
3.2.4. `lotto_options.sourceDisplayMode`: 추천 번호 출처 표시 방식 (S79, 2026-05-17). enum 3종.
   - `'dot'` (기본): 색점 N개 (간결, 한글 없음).
   - `'label'`: 한글 머리글자 (옛 동작, 다중 매칭 시 "별사" 같이 다글자).
   - `'off'` (S088 후속, 2026-05-17 사용자 명시 "색점을 표시하지 않는 설정 옵션"): 출처 표시 안 함. 번호공만 노출.
   누락 시 'dot' 자동 채움. 프리셋 슬롯의 strategyLabel 앞 색점은 본 설정 무관 = 항상 표시.

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
  // luck 필드: S089(2026-05-17) 폐지. localStorage 잔존 시 자동 제거 (storage 마이그레이션).
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
  matchedRank: 1 | 2 | 3 | 4 | 5 | null    // 발표 후 자동 매칭
  // S089(2026-05-17) luckApplied 필드 폐기. 옛 데이터 잔존 시 storage load에서 자동 제거.
}
```

3.7.1. ~~`luckApplied` 룰~~ (S089 폐기): Luck 자산 전면 폐기로 본 필드 제거. 옛 캐릭터 데이터 load 시 자동 정리.

### 3.8. ~~등수별 Luck 보너스 (M5)~~ (S089, 2026-05-17 전면 폐기)

**폐기 사유**: 사용자 명시 "Luck을 게임요소로 추가하고 싶은 생각 없음". `RANK_LUCK_BONUS` 상수 + `applyLuckGrowth` 함수 모두 폐기. 4등 이상 적중은 전적 그리드(적중률 / 최고 등수 / 등수별 카운트)만 갱신.

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
