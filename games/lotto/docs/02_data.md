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

캐릭터 속성이 아니라 **추첨 시 사용자가 선택**하는 가중치 정책입니다. 같은 캐릭터로 11가지 전략 모두 시도 가능.

| ID | UI 라벨 | UI 설명 (한 줄, 라벨 단어 반복 금지) | 가중치 정책 |
|---|---|---|---|
| `blessed` | 축복받은 자 | 모든 번호에서 균등 추출, Luck이 시드 번호 가중치를 강화 | 균등 + Luck 분산 |
| `statistician` | 통계 추첨 | 역대 회차에 가장 많이 나온 번호 위주 | 본번호 누적 빈도 가중 |
| `secondStar` | 보너스볼 사냥 | 역대 보너스볼로 자주 나온 번호 위주 | 보너스볼 빈도 가중 |
| `regressionist` | 미출현 회귀 | 오랫동안 안 나온 번호 위주 | 미출현 갭 가중 |
| `pairTracker` | 짝꿍 번호 | 캐릭터 키번호와 자주 함께 나왔던 번호 묶음 | 시드 키번호와 동시출현 페어 가중 |
| `astrologer` | 별자리 행운 | 캐릭터 별자리 12종의 행운 번호 위주 | 별자리 행운 번호 5배 boost |
| `trendFollower` | 최근 트렌드 | 최근 30회에 자주 나온 번호 위주 | 최근 30회 Hot 번호 가중 |
| `intuitive` | 직감 | 회차마다 다른 분포 (같은 캐릭터는 같은 결과) | 매 회차 다른 무작위 가중 (시드 결정론 유지) |
| `balancer` | 균형 조합 | 번호 합 121~160 + 홀짝 3:3 필터를 통과한 조합만 | 합 121~160 + 홀짝 3:3 (최대 50회 재추첨) |
| `mbti` | MBTI 행운 | 캐릭터 MBTI 16종의 행운 번호 위주 | MBTI 행운 번호 5배 boost |
| `zodiacElement` | 별자리 4원소 | 별자리 4원소(불/땅/공기/물) 그룹 행운 번호 | 4원소 그룹별 행운 번호 5배 boost |

기본 전략: `blessed` (`STRATEGY_DEFAULT`). UI 톤 가이드: 라벨은 직관적, 설명은 "어떻게 뽑는지"를 한 줄로. UI 줄에 라벨 + 설명이 동시 노출되므로 설명에서 라벨 단어 반복 금지.

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

### 1.13. MBTI 16종 + 행운 번호 (MBTI 전략용)

| MBTI | 행운 번호 |
|---|---|
| INTJ | 3, 11, 17, 24, 32, 38, 44 |
| INTP | 4, 9, 16, 23, 29, 35, 41 |
| ENTJ | 1, 8, 15, 22, 29, 36, 43 |
| ENTP | 2, 7, 13, 21, 27, 33, 39 |
| INFJ | 5, 12, 19, 26, 33, 40, 45 |
| INFP | 6, 14, 20, 28, 31, 37, 42 |
| ENFJ | 3, 10, 18, 25, 31, 38, 44 |
| ENFP | 7, 13, 19, 27, 34, 40, 45 |
| ISTJ | 4, 11, 17, 24, 30, 36, 41 |
| ISFJ | 2, 9, 15, 22, 28, 35, 42 |
| ESTJ | 1, 8, 14, 21, 27, 34, 40 |
| ESFJ | 6, 13, 20, 26, 32, 38, 45 |
| ISTP | 5, 12, 18, 25, 31, 37, 43 |
| ISFP | 3, 10, 16, 23, 29, 36, 42 |
| ESTP | 7, 14, 21, 28, 35, 41, 44 |
| ESFP | 4, 11, 17, 24, 30, 37, 43 |

1.13.1. 임의 매핑. 추첨 확률에는 영향 없음.

### 1.14. 별자리 4원소 분류 + 원소별 행운 번호

| 원소 | 별자리 | 행운 번호 |
|---|---|---|
| fire (불) | aries / leo / sagittarius | 1, 9, 19, 27, 33, 41, 45 |
| earth (땅) | taurus / virgo / capricorn | 2, 6, 14, 22, 28, 36, 44 |
| air (공기) | gemini / libra / aquarius | 5, 11, 17, 23, 29, 35, 39 |
| water (물) | cancer / scorpio / pisces | 4, 12, 16, 22, 30, 38, 43 |

1.14.1. 점성술사(`astrologer`)는 12별자리 개별 매핑, 별자리 원소(`zodiacElement`)는 4원소 그룹 매핑. 분리.

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
| `lotto_options` | `{ applyFilters, advancedMode, ... }` | 사용자 토글 변경 |
| `lotto_seen_help` | `boolean` | 첫 진입 안내 표시 |

3.2.1. `lotto_options.advancedMode`: 다구좌 모드(휠링) 활성화 여부. 기본 false. 첫 활성화 시 윤리 안내 모달 강제.

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
  zodiac: 'aries' | 'taurus' | ... | 'pisces',  // 서양 12별자리 (점성술사 / 별자리 원소 전략용)
  dayPillar: { stem: 'gap' | ..., branch: 'rat' | ... },  // 생년월일 → 일주 (사주 정밀화 운세 보정용)
  mbti: 'INTJ' | 'INTP' | ... | 'ESFP' | null,   // 16 MBTI 또는 미지정 (MBTI 전략용)
  luck: number,                             // 0~100
  lastUsedStrategy: 'blessed' | 'statistician' | ... | 'astrologer',
  createdAt: 'YYYY-MM-DDTHH:mm:ss',
  history: Recommendation[]
}
```

3.6.1. **캐릭터에 전략(`className`) 속성 없음.** 전략은 추첨 시 매번 사용자가 선택, `lastUsedStrategy`로 마지막 선택만 캐싱.
3.6.2. 시드 입력의 birthYMD / luckyWord는 시드 해시 후 폐기. zodiac은 점성술사 전략용으로 별도 보관.
3.6.3. `name`과 `animalSign`은 표시 / 운세 산출 목적상 별도 보관. `animalSign`은 생년에서 자동 계산.
3.6.4. **마이그레이션**: 기존 캐릭터의 `className`은 무시 (lastUsedStrategy 누락 시 `STRATEGY_DEFAULT`로 fallback).

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
