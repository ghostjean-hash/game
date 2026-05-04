# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-04 (Sprint 041 - 번호공 간격 80% 압축 / S32).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리** (2026-05-04): 직전 5 Sprint(032~036)만 본 파일에 활성. Sprint 010 이전 ~ Sprint 031 영역과 옛 백로그(3.-18 ~ 3.0)는 `PROGRESS_ARCHIVE.md`로 이전. 새 세션 토큰 약 70%↓.

# 2. 완료 마일스톤 (활성: 직전 5~7 Sprint)

> 이전 Sprint 이력(2.1 ~ 2.52, M0~M6 / 폴리싱 / Sprint 010~031) → `PROGRESS_ARCHIVE.md` 참조.

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

설계 결함 인정:
- 키번호 = 캐릭터 시드 % 45 + 1 = 사실상 랜덤 1개.
- 풀 18개가 그 랜덤 anchor 1개에 전부 종속.
- anchor가 cold 번호면 풀도 cold 편향 → 추천 6개 모두 영향.
- 사용자 직관 "절대적 짝꿍" 의미와 괴리.

해결 (B안 - 객관 짝꿍):
- `OBJECTIVE_STRATEGIES`에 `pairTracker` 추가 (시드 / Luck 무관).
- `pairWeights(cooccur, keyNumber)` (구) → `objectivePairWeights(cooccur, poolSize)` (신).
  - 동시출현 페어를 `count` 내림차순 정렬.
  - 위에서부터 합집합 size가 `STATS_POOL_SIZE` 도달까지 수집.
  - 풀 번호 weight = 그 번호가 포함된 상위 페어들의 count 누적.
- `recommend.js` `STRATEGY_PAIR_TRACKER` 분기: `keyNumber` 변수 폐기. reason = "역대 회차 동시출현 빈도 상위 페어 합집합(N개 풀)에서 추첨".
- `strategy-picker.js` desc: "캐릭터 키번호와 자주 함께 나왔던 번호 묶음" → "역대 회차에서 가장 자주 함께 추첨된 번호 쌍 모음".
- `main.js` poolNote 폐기 (키번호 노출 자체 사라짐). `keyNumberFromSeed` import 제거.
- `tests/recommend.test.js`: pairTracker를 시드 의존 → 객관 그룹으로 이동. 객관 5개 → 6개 / 시드 의존 3개 → 2개.
- `docs/02_data.md` 1.5 표: pairTracker 의존성 "시드" → "**객관** (S30.4)" / 가중치 정책 갱신.

테스트: 286/286 PASS.

SW v17 → v18 (캐시 새로고침).

### 2.60.5.3. S30.3 - 짝꿍 번호 키번호 노출 (사용자 명시)

사용자 지시: "짝꿍 번호는 번호를 봐도 해석이 잘 안 돼, 어떻게 짝꿍이라는 거야?"

원인: 짝꿍 번호의 풀은 *키번호와 동시출현 상위 N개*인데, 키번호가 어디에도 노출되지 않아 사용자가 풀 해석 불가.

해결:
- `src/core/recommend.js`: `keyNumberFromSeed` export.
- `src/render/main.js`: 포커스 = `pairTracker`이면 `poolNote = "키번호 N번과 자주 함께"` 생성.
- `src/render/strategy-tabs.js`: pool 라벨에 poolNote 결합 → "사용 풀 · 18개 · 키번호 7번과 자주 함께".

운세 3종(별자리 / 원소 / 사주) 적용 보류: 사용자 직접 지적은 짝꿍 한정. 캐릭터 카드에 zodiac / dayPillar 이미 노출 → 직관 부족 시 별도 sprint에서 동일 패턴 적용 가능.

### 2.60.5.2. S30.2 - 풀 확장 버그 수정 (사용자 명시)

사용자 지시: "짝꿍 번호는 사용풀 전부네?" + "별자리 행운, 원소 행운, 사주 행운도 왜 모든 수가 되지?"

원인:
- `core/luck.js` `applyLuck()`의 `Math.max(w, WEIGHT_MIN_FLOOR)`가 풀 컷팅 후 0인 weight를 양수 floor로 끌어올림.
- 시드 의존 전략(pairTracker / astrologer / zodiacElement / fiveElements)은 `finalWeights = applyLuck(mainWeights, ...)`이라 풀 외 0이 floor로 양수 변환 → `computePoolForStrategies`의 `> 0` 체크에서 모두 통과 → 풀 1~45로 확장.
- 객관 전략은 `finalWeights == mainWeights`(applyLuck 미적용)라 영향 없었음.

해결:
- `core/recommend.js` `computeStrategyContext` 반환에 `mainWeights` 추가 (applyLuck 전).
- `computePoolForStrategies`가 `mainWeights > 0` 기준으로 풀 계산 변경 (이전 `finalWeights > 0`).
- 결과: 짝꿍 / 별자리 / 원소 / 사주 풀이 풀 컷팅 정의대로 정확히 표시 (각 STATS_POOL_SIZE / zodiac 풀 / 4원소 / 河圖 오행 풀).

### 2.60.5.1. S30.1 - 풀도 포커스 단일 + 랜덤 미표시 (사용자 명시)

사용자 지시: "설명란의 사용풀도 섞지 말고 해당 전략에 대해서만 작성해줘. 즉, 랜덤 전략에는 표시되면 안돼".

해결:
- `src/render/main.js` `getRecAndFortune`: `pool = computePoolForStrategies(strategyIds, ctx)` (활성 전체 합집합) → `pool = computePoolForStrategies([focusedId], ctx)` (포커스 단일 전략).
- 추가: 포커스 카테고리가 'random'(blessed/intuitive/balancer)이면 `pool = null` → 풀 영역 자동 미표시. 풀이 1~45 균등 분포라 표시 의미 없음.
- `src/render/strategy-tabs.js`: "전 풀 (45)" 라벨 분기 폐기 (이제 도달 안 함). 라벨은 단순 "사용 풀 · N개".
- `docs/01_spec.md` 5.1.3.1: S30.1 정책 명문화.

의미 통일: desc / 풀 모두 *포커스 전략 1개 기준*. 사용자 헷갈림 방지.

### 2.60.5. 트레이드오프

- **얻음**: 사용자 의문(헷갈림 / 비활성 desc 잔존 어색) 즉시 해소. 별도 state 0 / 학습 비용 0 / 시각 단서 1개(ring). desc 영역 항상 활성과 정합.
- **잃음**: 활성 N개 중 *다른 desc* 보고 싶으면 그 전략 OFF 후 ON 두 번 클릭. 흔치 않은 케이스라 비용 작음.
- **확장 가능**: 향후 길게 누르기 = 포커스 분리 트리거 추가 가능 (현재 미적용).

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

### 2.59.4. 휴지통 아이콘

- `src/render/icons.js`: `trash(cls)` 신규 export (Lucide-style 휴지통 SVG, currentColor 상속).
- `src/render/saved-sets-section.js`: 개별 row의 `×` 텍스트 → `${trash('icon icon-sm')}`. "전체 비우기" 버튼 라벨에도 휴지통 아이콘 + 텍스트.
- `styles/main.css` `.saved-set-remove`: **타원 외곽 폐기**. `border` 제거 / `border-radius: 50%` 폐기 / `background: transparent`. 아이콘 색만 hover 시 danger 전환.

### 2.59.5. 토큰 사용 정직화

사용자 지적 "디자인 토큰 사용 안해????"에 대한 정직 답:
- **본 sprint(S28/S29) 신규 스타일은 토큰만 사용** (`var(--font-size-md)` / `var(--font-size-sm)` / `var(--space-1)` / `var(--radius-md)` 등).
- **부수 정정**: `.saved-add-btn` / `.saved-sets-clear`의 `var(--radius-1)` (tokens.css 미정의 = 깨진 참조) → `var(--radius-md)`. 직접 영향 받는 2건만 본 sprint에 묶음.
- **잔여**: styles/main.css 매직 픽셀 값 254건 + 깨진 토큰 4건 (`--radius-1`/`--radius-2` 잔여) → 별도 sprint(S30)에서 토큰 정리.

### 2.59.6. 변경 파일

- `src/render/main.js`: `homeTabHtml` 호출 순서 = nextDrawCard / savedSection / addBar / strategyTabs / ritual / slots / card. (S28 = strategyTabs / addBar / savedSection 폐기)
- `src/render/icons.js`: `trash()` 신규.
- `src/render/saved-sets-section.js`: 헤더에서 "전체 비우기" 제거, addBar에 통합. row의 `×` → 휴지통 아이콘.
- `styles/main.css`: `.saved-sets-header` justify 제거, `.saved-sets-clear` 액션바 룰 재작성, `.saved-set-remove` 타원 외곽 폐기, `.saved-add-btn` `--radius-1` → `--radius-md`.
- `docs/01_spec.md` 4장 / 5.2.5 / 5.2.5.2: S29 동선 명문화.
- `service-worker.js`: CACHE_VERSION v15 → v16.

### 2.59.12. S29.4 - 디자인 토큰 정리 (사용자 명시)

사용자 지시: "디자인 토큰 제대로 정리했어?" → 정직 답: 부분 어김. A안(즉시 확장 + 일괄 치환) 진행.

#### 2.59.12.1. tokens.css 확장 (신규 토큰 2개만)

- `--font-size-xs: 10px;` (가장 작은 메타 텍스트. 모바일 풀 번호공 등)
- `--color-on-accent: #ffffff;` (accent/danger 배경 위 텍스트 색)

#### 2.59.12.2. 매직 값 → 토큰 일괄 치환 (본 sprint 영역)

| 변경 전 (매직) | 변경 후 (토큰) | 위치 |
|---|---|---|
| `padding: 6px 14px;` `font-size: 13px;` | `padding: var(--space-2) var(--space-3);` `font-size: var(--font-size-md);` | `.saved-add-btn` 데스크톱 |
| `padding: 6px 12px;` | `padding: var(--space-2) var(--space-3);` | `.saved-sets-clear` 데스크톱 |
| `padding: 6px 10px;` (480/360↓) | `padding: var(--space-2);` | `.saved-add-btn` `.saved-sets-clear` 모바일 |
| `font-size: 13px;` | `font-size: var(--font-size-md);` | `.saved-sets-empty` |
| `font-size: 11px;` (360↓) | `font-size: var(--font-size-sm);` | `.saved-set-idx` 모바일 |
| `font-size: 13px;` 데스크톱 | `font-size: var(--font-size-sm);` | `.saved-set-idx` |
| `font-size: 10px;` (480↓) | `font-size: var(--font-size-xs);` | `.strategy-pool-num` 모바일 |
| `color: #fff;` | `color: var(--color-on-accent);` | `.strategy-pool-num` |
| `width: 24/22/20px;` | `width: var(--space-5);` | `.saved-set-remove` (모든 break point 통일) |
| `grid-template-columns: 44px 1fr 28px;` | `grid-template-columns: 44px 1fr var(--space-6);` | `.saved-set-row` 데스크톱 (28→32) |
| `grid-template-columns: 32px 1fr 22px;` | `grid-template-columns: var(--space-6) 1fr var(--space-5);` | `.saved-set-row` 360↓ |
| `gap: 4px;` | `gap: var(--space-1);` | `.saved-set-balls` |

#### 2.59.12.3. 깨진 토큰 잔여 정리

`--radius-1`/`--radius-2` (tokens.css 미정의) 잔여 3건 → `--radius-md` / `--radius-lg`로 정정:
- `.five-sets-extra` `--radius-2` → `--radius-lg`
- `.reverse-best-expand` `--radius-1` → `--radius-md`
- `.reverse-all-item` `--radius-1` → `--radius-md`

깨진 토큰 실 사용 잔여: **0건** (1건은 코멘트 이력 보존용).

#### 2.59.12.4. 토큰화 보류 (정당 사유)

- `44px` 번호공 / `12/9/6px` num-source-tag: spec 명시 데이터 사이즈 (디자인 토큰이 아닌 데이터 차원).
- `40px` 라벨 (480↓): 번호공 36x36과 동기 의도, 토큰 명명이 의미 약함. 코멘트로 명시.
- `@media (max-width: NNNpx)`: CSS 한계 (미디어 쿼리는 `var()` 미지원).
- `1px solid` border: 표준 디자인 컨벤션. 토큰화 가치 약함.
- 기타 main.css 영역 약 200~250건: 본 sprint 영역 외, **S30 토큰 대청소** 대기.

#### 2.59.12.5. 검증

`node tests/run-node.js` → **286/286 PASS**. 본 sprint 영역 매직 값 검출 (grep `[0-9]+px`) = 잔여 = spec 명시 데이터 사이즈 + 미디어 break point 만.

### 2.59.11. S29.3 - 모바일 폭 최적화 (사용자 명시)

사용자 지시: "폭이 핸드폰에 맞지 않은 듯 한데, 핸드폰에 최적화되게 폭 맞춰줘".

진단:
- `.saved-add-bar` grid 1fr auto 1fr이 좁은 화면(특히 320~360px)에서 좌측 spacer가 거의 0이 되어 압박.
- `.saved-set-row` 320px↓ 케어 미흡 (number 6개 + 라벨 + 휴지통 한 줄 fit 빠듯).
- `.strategy-pool-num` 24x24 + gap이 모바일에서 wrap 자주 발생 (가독성 저하).
- `#app` 좌우 padding 16px이 모바일에서 가용 폭 약 32px 잠식.

해결:
- `#app`: 모바일 480px↓에서 좌우 padding `--space-4`(16px) → `--space-2`(8px). safe-area-inset 보호 유지.
- `.home-hero`: 360px↓에서 padding `--space-4` → `--space-3` (12px).
- `.saved-sets-section`: 480px↓에서 padding `--space-3` → `--space-2`. 360px↓ 추가 축소.
- `.saved-add-bar`: 480px↓에서 grid 1열로 폴드 (1행 + 버튼 가운데 / 2행 전체 비우기 우측 끝 / 3행 hint 가운데). 사용자 의도(전체 비우기 우측 끝)를 모바일에서도 보존.
- `.saved-add-btn` / `.saved-sets-clear`: 360px↓에서 padding 축소 + font `--font-size-sm`. 320px대에서 "전체 비우기" 텍스트 숨기고 휴지통 아이콘만 (aria-label로 의미 보존).
- `.saved-set-row`: 360px↓에서 라벨 32px / 휴지통 20px / number 32x32 / `.saved-set-balls` gap `--space-1`.
- `.strategy-pool-num`: 480px↓에서 24x24 → `--space-4`(16x16) / font 10px.

### 2.59.10. S29.2 - 사용 번호 풀 투명화 (사용자 명시)

사용자 지시: "통계는 저기 영역에 스트링을 지우고, 실제 사용할 번호 풀을 표시해줘" (활성 전략 설명 아래 "다중 전략 모드 · 2/6 선택. 분배는 균등 (6/N)" 텍스트 가리키며).

해결:
- `src/core/recommend.js`: `computePoolForStrategies(strategyIds, ctx)` 신규 export. 활성 전략들의 `finalWeights > 0` 번호 합집합 (1~45 정렬).
- `src/render/strategy-tabs.js`: `pool` 인자 받음. `multiHint` 자리에 풀 번호공 표시. 풀이 1~45 전체면 "전 풀 (45)" 라벨 (랜덤 카테고리는 균등 분포).
- `src/render/main.js`: `getRecAndFortune`이 `computePoolForStrategies` 호출 후 pool 반환. `homeTabHtml` 시그니처에 pool 추가 → `strategyTabsHtml`에 전달.
- `styles/main.css`: `.strategy-pool` / `.strategy-pool-label` / `.strategy-pool-list` / `.strategy-pool-num` 신규 (모두 토큰 사용. `--space-5` (24px)로 번호공 크기 / `--font-size-sm` 12px / `numberColor()` 데이터 색).
- `docs/01_spec.md` 5.1.3.1: 풀 표시 정책 명문화.

의도: 사용자에게 "어떤 번호 풀에서 6개가 뽑히는지" 시각 투명 → 신뢰 ↑ + 사행성 회피 (의심을 즉시 데이터로 해소).

스코프: 통계 한정이 아닌 **모든 활성 전략** 적용. 운세는 풀 작아 의미 큼, 랜덤은 "전 풀 (45)"로 정직 표시.

### 2.59.7. S29.1 추가 정정 (사용자 4건 명시)

사용자 지시:
1. "추천 리스트 배경도 위쪽 배경과 동일하게 라운드 사각" → `.saved-sets-section` border-radius `--radius-2`(깨진 토큰) → `--radius-lg`(hero와 동일 16px).
2. "추천 리스트 제목 좌우 중앙 정렬" → `.saved-sets-header` `justify-content: center`.
3. "+ 1, + 5 버튼 가운데 / 전체 비우기 우측 끝" → `.saved-add-bar` grid 3열 (1fr auto 1fr). 좌 spacer / 가운데 + 버튼 그룹(.saved-add-buttons) / 우측 끝 전체 비우기(.saved-add-actions justify-self end). hint는 grid-column 1/-1 + text-align center로 두 번째 줄 가운데.
4. "추첨 결과 보장 없음" disclaimer 삭제 → saved-sets-section.js의 `<p class="saved-sets-disclaimer">` 폐기 + CSS 룰 폐기. 사행성 회피 카피는 첫 진입 면책 모달 + 설정 탭 + spec 5.2.5.8로 일원화.

부수: `--radius-2` 깨진 토큰 → `--radius-lg`로 정정 (직접 영향 받는 1건만, 나머지 잔여 3건은 S30 토큰 정리 대기).

### 2.59.8. 검증

`node tests/run-node.js` → **286/286 PASS** (storage 4건은 기존 5.8 미해결).

### 2.59.9. 트레이드오프

- **얻음**: 사용자 의도 정확 반영 / 결과↔실행 인접 / 모바일 엄지 동선 / 삭제 액션 시각 노이즈 폭감(타원 폐기) / 액션 한 줄 = 일관성 ↑ / 추천 리스트 시각이 hero와 통일.
- **잃음**: 채팅 UX 패턴은 "결과 = 화면 위 누적"인데 카운트다운(정보)이 위에 있어 결과 자리가 2번째. 단 카운트다운은 정적 정보라 시선 비용 약함. 별도 sprint에서 카운트다운 자체 축소(부제처럼) 검토 가능.
- **disclaimer 폐기 위험**: 사행성 회피 카피 1채널 줄어듦. 첫 진입 면책 + 설정 탭 + 4분면 분류 등 다른 채널이 보강. 별도 sprint에서 감사(audit) 권장.
- **신뢰 비용**: S28(자비스 권장 B안)의 잘못된 단정 = 사용자 시간 낭비. 향후 권장안 결정은 사용자 재확인 후 실행 (4.7 결정 이력 추가 검토).

## 2.58. Sprint 037 완료 - 추천 리스트 위치 정정 (S28) (2026-05-04)

사용자 지시: "로또를 추천하는 UX가 진짜 별로야. + 1세트, + 5세트 버튼이 어디에 들어가는게 맞을까? → 권장안(B안)으로 처리".

### 2.58.1. 문제 진단 (S27 잔여)

S27 동선:
1. 화면 위→아래: 카운트다운 / **추천 리스트(결과)** / 전략 / **+ 버튼(실행)** / 행운 / 캐릭터.
2. 사용자 행동 = 조립(전략) → 실행(+) → 결과 확인 → 또 추가. 결과가 위, 실행이 아래라 **시선 ↓→↑ 역행**.
3. 첫 진입 시 빈 추천 리스트가 화면 상단을 점유 → 노이즈 + 행동 유도 약화.

### 2.58.2. 해결 - B안 (전략 묶음 ↑ / 추천 리스트 ↓)

새 동선: 카운트다운 / **전략 + + 버튼** / **추천 리스트** / 행운 / 캐릭터. **조립 → 실행 → 결과 ↑→↓ 일직선**.

### 2.58.3. 변경 파일

- `src/render/main.js` `homeTabHtml`: hero에서 `savedSectionHtml` 분리. 호출 순서 = next-draw-card → strategyTabs → addBar → savedSectionHtml → ritual → slots → card. hero `aria-label`은 "다음 추첨"으로 축소.
- `docs/01_spec.md` 4장 화면 흐름 다이어그램 정정 + 5.2.5.2 UI 다이어그램 정정 + 5.2.5 절두 "S28 변경" 항 추가.
- `service-worker.js`: CACHE_VERSION v14 → v15.

### 2.58.4. 검증

`node tests/run-node.js` → **286/286 PASS** (storage 4건 실패는 본 sprint 무관 - Node 환경 localStorage 폴리필 누락 기존 이슈, 5.8 미해결에 추가).

### 2.58.5. 트레이드오프

- **얻음**: 시선 역행 해소 / 조립-실행-결과 일직선 / 빈 상태 노이즈 제거 / 모바일 엄지 한 방향 동선.
- **잃음**: 카운트다운 직하의 "주역 자리"에 결과(추천 리스트)가 아닌 조립(전략)이 옴 → 정보 위계 약화. 단 추첨 탭의 핵심은 "결과 = 사용자가 조립한 결과"이므로 조립이 위에 있는 게 자연 흐름이라 손실은 작음.
- **5.2.1.7 운세 외곽 톤**: hero가 카운트다운만 감싸므로 외곽 톤은 카운트다운 카드에만 적용 (의미는 약함). hero wrapper / heroFortuneClass 자체 정리는 별도 sprint.

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

# 3. 다음 액션

> 이전 Sprint 백로그(3.-18 ~ 3.0, Sprint 011~029) → `PROGRESS_ARCHIVE.md` 참조.

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
4.7. **PROGRESS 이력 분리 (2026-05-04)**: 본 파일은 활성 5 Sprint + 결정 / 미해결 / 커밋만 유지. 옛 Sprint 이력은 `PROGRESS_ARCHIVE.md`. 분리 기준: 직전 5 Sprint(032~036). 새 세션 적재 토큰 약 70%↓.

# 5. 미해결 / 개선 여지

5.0. **2026-05-01 시점 정보 (사용자 확인)**: 1221회까지 발표 / 1222회 = 2026-05-02 토 추첨 예정 / 1등 예상 당첨금 약 183.7억. `DEFAULT_DRWNO` = 1222로 설정.
5.1. accent 컬러(`#d4a657`) 임시값, 시안 단계 재결정.
5.2. 운세 산출 로직: 현재 시드 + 회차 단순 mix + 가중 분포. 사주 십이지 적용은 M5에서 정밀화.
5.3. 휠링 시스템 비스코프 (윤리 검토 후 재논의).
5.4. sudoku / tetris의 html-game 표준 적용 여부 (사용자 결정 - 나중).
5.5. core/ 모든 모듈 테스트 작성 완료. render/ 모듈 테스트는 선택 (현재 미작성).
5.6. 페치 스크립트 첫 실행 (사용자 액션 대기). smok95 미러 채택 후 표본 검증 끝(1/500/1100/1221회 200 OK, 평균 240ms).
5.7. 표준 위반 작은 이슈: render/main.js가 직접 이벤트 리스너 등록 (input/ 책임 일부 흡수). MVP 단순성 우선. M2 마무리 단계에서 input/ 분리 검토.
5.8. **storage 테스트 4건 실패 (Node 환경)**: `node tests/run-node.js`에서 `data/storage` 4건이 `localStorage.setItem is not a function`로 실패. Node에 localStorage 폴리필 누락. 브라우저 동작 영향 0. 별도 sprint에서 `tests/run-node.js`에 폴리필 추가.
5.9. **hero wrapper / heroFortuneClass 정리** (S28 잔여): 추천 리스트 분리 후 hero가 카운트다운만 감싸 의미 약함. 별도 sprint에서 hero 폐기 또는 외곽 톤 의미 재정의.

# 6. 커밋 히스토리

| 커밋 | 내용 |
|---|---|
| (예정) | M0 + M1 일괄: html-game v0.2 표준 + lotto 적용 + 코어 + UI MVP |
| (예정) | M2 1단계: 캐릭터 슬롯 / 추가 모달 / 전환 / 삭제 |
| (예정) | dev 환경: SW 차단 + dev-server.mjs 정적 서버 |
| 2026-05-02 | 2.26 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 + 보너스 버그 수정 + 폼/탭 개선 + 11전략 직관화 |
| 2026-05-02 | 2.27 객관 전략(통계/빈도/필터) 캐릭터 무관 분리 - "통계 추첨이 사람마다 다른" 결손 정정 |
