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
| `statistician` | 통계 추첨 | 역대 회차에 가장 많이 나온 번호 위주 | **통계** | 본번호 누적 빈도 가중 (`count^STATS_POWER`) | **객관** |
| `secondStar` | 보너스볼 사냥 | 역대 보너스볼로 자주 나온 번호 위주 (본번호 + 보너스 모두 적용) | **통계** | 본번호 + 보너스 모두 보너스볼 빈도 가중 (`count^STATS_POWER`) | **객관** |
| `regressionist` | 미출현 회귀 | 오랫동안 안 나온 번호 위주 | **통계** | 미출현 갭 가중 (`gap^GAP_POWER`) | **객관** |
| `pairTracker` | 짝꿍 번호 | 캐릭터 키번호와 자주 함께 나왔던 번호 묶음 | **통계** | 시드 키번호와 동시출현 페어 가중 | 시드 |
| `astrologer` | 별자리 행운 | 캐릭터 별자리 12종의 행운 번호 위주 | **운세 매핑(서양)** | 별자리 행운 번호 5배 boost | 시드 |
| `trendFollower` | 최근 트렌드 | 최근 30회에 자주 나온 번호 위주 | **통계** | 최근 30회 Hot 번호 가중 (raw, recent30 0~9 자연 분포) | **객관** |
| `intuitive` | 직감 | 회차마다 다른 분포 (같은 캐릭터는 같은 결과) | **랜덤** | 매 회차 다른 무작위 가중 (시드 결정론 유지) | 시드 |
| `balancer` | 균형 조합 | 번호 합 121~160 + 홀짝 3:3 필터를 통과한 조합만 | **랜덤** | 합 121~160 + 홀짝 3:3 (최대 50회 재추첨) | **객관** |
| `zodiacElement` | 별자리 4원소 | 별자리 4원소(불/땅/공기/물) 그룹 행운 번호 | **운세 매핑(서양)** | 4원소 그룹별 행운 번호 5배 boost | 시드 |
| `fiveElements` | 일주 오행 | 캐릭터 일주의 천간 오행(목/화/토/금/수) 행운 번호 | **사주(동양)** | 5원소 그룹별 행운 번호 5배 boost | 시드 |

기본 전략: `blessed` (`STRATEGY_DEFAULT`).

#### 1.5.1. 객관 전략 vs 시드 의존 전략 (결정론 차원)

- **객관(5개)**: `statistician` / `secondStar` / `regressionist` / `trendFollower` / `balancer`. 회차 데이터(통계)만 입력. **캐릭터 시드와 Luck 모두 무관**. 같은 회차에서 모든 캐릭터가 동일 결과. 결정론 시드: `mixSeeds(drwNo, OBJECTIVE_SEED_SALT)`.
- **시드 의존(6개)**: `blessed` / `pairTracker` / `astrologer` / `intuitive` / `zodiacElement` / `fiveElements`. 캐릭터 시드 + drwNo + Luck. 캐릭터별 다른 결과. 결정론 시드: `mixSeeds(seed, drwNo)`.
- 분류 위치: `src/data/numbers.js` `OBJECTIVE_STRATEGIES` Set. 분기 위치: `src/core/recommend.js`.
- 트레이드오프: 객관 전략은 사용자가 캐릭터를 바꿔도 결과 동일. 그것이 객관 통계의 본질. 캐릭터 차별화는 시드 의존 7개에서.

#### 1.5.4. 다중 전략 분배 (S3-T1, 2026-05-02 신설)

다중 전략 모드(`options.multiStrategy = true`) 활성 시 전략 탭이 토글로 동작해 1~6개 선택. 각 전략별로 본번호를 균등 분배 후 카드에 카테고리 색 dot으로 출처 표시.

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

1.5.4.2. **알고리즘**: `core/recommend.js` `recommendMulti(ctx)`. 각 전략 순회 → recommend 호출 → 분배 카운트만큼 중복 제외 후 채택. 부족분은 blessed 균등 fallback. 보너스는 첫 전략 채택, 본번호와 겹치면 균등 재추출.
1.5.4.3. **출처 라벨**: 결과 객체에 `strategySources: string[]` (numbers와 동일 순서). draw-card에서 카테고리 색 dot 표시 (단일 모드는 빈 배열 → dot 미표시).
1.5.4.4. **최소 1개 보장**: 다중 모드에서 마지막 1개 토글 제거는 무시 (전략 0개 방지).
1.5.4.5. **백캐스트 영향 없음**: `backfillRecommendations`은 단일 전략으로 결정론 유지. 다중 모드여도 history는 첫 전략 기준.

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
1.5.5.5. **다중 모드 + 5세트 호환**: ON+ON 시 각 세트가 strategySources 라벨을 별도 보유. 5장 모두 색 dot 표시.
1.5.5.6. **알고리즘**: `core/recommend.js` `recommendFiveSets(ctx)` → `RecommendationSet[]` 길이 `FIVE_SETS_COUNT`. 단일/다중 분기는 내부에서.
1.5.5.7. **사행성 회피**: 라벨에 "확률" / "필승" / "당첨 보장" 사용 금지. 5세트는 "5번의 다른 시도", "한 회차의 다양한 가능성"으로만 표현. 비용 권장 표기 금지(실제 5장 구매 권유 아님).
1.5.5.8. **기본 OFF**. 라이트 사용자 비노출(설정 탭 토글로만 진입). 다중 모드와 동일한 노출 정책.

#### 1.5.2. 카테고리 (콘텐츠 차원)

11전략을 가중치 소스 본질로 분류. 결정론 차원(1.5.1)과 직교하는 별도 차원.

| 카테고리 | 본질 | 전략 수 | 멤버 |
|---|---|---|---|
| **통계** | 회차 데이터를 weight 소스로 사용 | 5 | statistician / secondStar / regressionist / trendFollower / pairTracker |
| **운세 매핑(서양)** | 서양 점성술 → 행운 번호 임의 매핑 | 2 | astrologer / zodiacElement |
| **사주(동양)** | 사주 일주 / 천간 오행 → 행운 번호 임의 매핑 | 1 | fiveElements |
| **랜덤** | 통계 / 매핑 모두 무관. 균등 + 시드 또는 필터 | 3 | blessed / intuitive / balancer |

1.5.2.1. **통계** 카테고리는 객관(데이터 신뢰)이 본질. 캐릭터 영향 여부는 1.5.1 결정론 차원에서 별도 결정.
1.5.2.2. **운세 매핑** / **사주** 카테고리는 임의 매핑이라 통계 신뢰는 없음. 콘텐츠 / 캐릭터 정체성 / 서사화 목적. 추첨 확률 영향 없음.
1.5.2.3. **랜덤** 카테고리는 의도된 무작위. blessed는 캐릭터 시드 정체성 표식, intuitive는 시드 무작위, balancer는 균등+필터.
1.5.2.4. UI 톤 가이드: 라벨은 직관적, 설명은 "어떻게 뽑는지"를 한 줄로. UI 줄에 라벨 + 설명이 동시 노출되므로 설명에서 라벨 단어 반복 금지. 카테고리 자체는 라벨에 직접 표기하지 않으며, 사용자가 전략별 desc로 본질을 추정 (또는 향후 그룹 표시 UI 추가).
1.5.2.5. **운세 매핑 / 사주 카테고리 정직성 (S6-T1, 2026-05-02)**: 본 두 카테고리(별자리 / 별자리 4원소 / 일주 오행 3종)의 행운 번호는 **게임 디자이너가 임의로 배정한 콘텐츠**이며, 점성술·명리학 등 외부 학설과 무관하다. UI 노출 위치 3곳 모두 면책 카피 강제:
- 캐릭터 카드 3종 행운 토글 패널: "임의 매핑 · {분야} 학설과 무관 · 추첨 확률 영향 없음" 캡션 (`render/character-card.js`). (S8: MBTI 폐지로 4종 → 3종)
- 전략 탭 활성 desc 아래: 카테고리가 운세 매핑 / 사주일 때 한 줄 면책 (`render/strategy-tabs.js .strategy-mapping-note`).
- 추천 결과 reasons: 3종 전략(astrologer / zodiacElement / fiveElements)의 reasons에 "(임의 매핑, 추첨 확률 영향 없음)" 접미 강제 (`core/recommend.js`).

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

### 1.13. ~~MBTI 16종~~ (S8, 2026-05-02 폐지)

S8 결정으로 MBTI 매핑 / 전략 / 입력 모두 폐지. 사유:
- **데이터 출처 이질성**: 사주/별자리는 생년월일 자동 산출 / MBTI는 사용자 직접 입력. 캐릭터 정체성의 견고함 약화.
- **컨셉 부정합**: 사주/별자리는 운명론 전통이지만 MBTI는 심리유형 분류라 "행운"과 결이 다름.
- **IP 회색 지대**: "MBTI"는 The Myers-Briggs Company 등록 상표. 게임 도메인에서 광범위하게 사용되지만 굳이 위험 떠안을 이유 없음.

마이그레이션: 기존 캐릭터의 `mbti` 필드는 localStorage에 잔존하나 미사용 처리 (load 시 무시). `lastUsedStrategy === 'mbti'` 캐릭터는 `STRATEGY_DEFAULT`로 fallback (`render/main.js`).

### 1.19. 행운 의식 (T4, 2026-05-02 신설, 정성 콘텐츠)

해석 B 채택. "당첨 확률 높이기" 메커닉 아님. 만땅 시 Luck +5 1회 보너스. SSOT: docs/01_spec.md 5.6.

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
1.19.6. UI 라벨에 "확률" / "필승" / "당첨" 단어 사용 금지. 모달 하단 면책 강제.

### 1.18. 천간 오행 5원소 + 원소별 행운 번호 (사주 전략용, 임의 매핑)

> **출처 명시 (S6-T1, 2026-05-02)**: 본 표의 행운 번호는 게임 디자이너가 임의로 배정한 콘텐츠이며, 명리학·사주 학설과 무관합니다. 캐릭터 정체성 강화 / 동양 콘텐츠 병렬(서양 4원소 1.14와 짝) 목적이며, 추첨 확률에는 일체 영향이 없습니다.

캐릭터 일주의 천간 오행(목/화/토/금/수) → 행운 번호 임의 매핑. 4원소(서양, 1.14)와 병렬 짝.

| 원소 | 한국어 | 천간 (1.12.1) | 행운 번호 |
|---|---|---|---|
| wood (목) | 목 | gap / eul (갑/을) | 1, 8, 14, 21, 28, 35, 42 |
| fire (화) | 화 | byeong / jeong (병/정) | 3, 9, 16, 22, 29, 36, 43 |
| earth (토) | 토 | mu / gi (무/기) | 5, 10, 17, 24, 30, 37, 44 |
| metal (금) | 금 | gyeong / sin (경/신) | 7, 13, 20, 26, 33, 39, 45 |
| water (수) | 수 | im / gye (임/계) | 2, 6, 12, 18, 25, 31, 38 |

1.18.1. 위치: `src/data/numbers.js` `FIVE_ELEMENTS_LUCKY`.
1.18.2. 캐릭터 dayPillar.stem → 1.12.1 매핑으로 오행 → 본 표 행운 번호.
1.18.3. **임의 매핑**, 추첨 확률 영향 없음. 사주 콘텐츠 / 캐릭터 정체성 강화 목적.
1.18.4. 4원소(서양, 1.14) vs 5원소(동양, 1.18) 의도적 병렬: 서양 점성술과 동양 사주를 동급 콘텐츠로.
1.18.5. 행운 번호 7개 × 5원소 = 35분산 (다른 운세 매핑 전략과 동일 스케일).

### 1.14. 별자리 4원소 분류 + 원소별 행운 번호 (임의 매핑)

> **출처 명시 (S6-T1, 2026-05-02)**: 본 표의 행운 번호는 게임 디자이너가 임의로 배정한 콘텐츠이며, 점성술 학설과 무관합니다. 캐릭터 정체성 강화 목적이며, 추첨 확률에는 일체 영향이 없습니다.

| 원소 | 별자리 | 행운 번호 |
|---|---|---|
| fire (불) | aries / leo / sagittarius | 1, 9, 19, 27, 33, 41, 45 |
| earth (땅) | taurus / virgo / capricorn | 2, 6, 14, 22, 28, 36, 44 |
| air (공기) | gemini / libra / aquarius | 5, 11, 17, 23, 29, 35, 39 |
| water (물) | cancer / scorpio / pisces | 4, 12, 16, 22, 30, 38, 43 |

1.14.1. 별자리 행운(`astrologer`)은 12별자리 개별 매핑, 별자리 4원소(`zodiacElement`)는 4원소 그룹 매핑. 분리.

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
| `lotto_options` | `{ applyFilters, advancedMode, multiStrategy, fiveSets, ... }` | 사용자 토글 변경 |
| `lotto_seen_help` | `boolean` | 첫 진입 안내 표시 |
| `lotto_rituals` | `RitualState` (1.19.3) | 행위 수행 시 / 회차 변경 시 자동 리셋 |

3.2.1. `lotto_options.advancedMode`: 다구좌 모드(휠링) 활성화 여부. 기본 false. 첫 활성화 시 윤리 안내 모달 강제.
3.2.2. `lotto_options.multiStrategy`: 다중 전략 모드 (S3-T1). 기본 false (라이트 사용자 비노출). 설정 탭 토글로 변경. ON 시 전략 탭이 토글 동작 + 추천 카드에 출처 dot 표시.
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
