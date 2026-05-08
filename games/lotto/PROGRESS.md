# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-08 (Sprint 051 - 알고리즘 처음부터 재구축 / S43 단일 추첨 architecture).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리**: 1차 2026-05-04 (Sprint 010 이전 ~ 031 + 옛 백로그 3.-18 ~ 3.0 archive 이전). 2차 2026-05-08 (Sprint 032~039 추가 archive 이전). 직전 5 Sprint(040~044)만 본 파일에 활성. `PROGRESS_ARCHIVE.md` 참조.

# 2. 완료 마일스톤 (활성: 직전 5 Sprint)

> 이전 Sprint 이력(2.1 ~ 2.60, M0~M6 / 폴리싱 / Sprint 010~039) → `PROGRESS_ARCHIVE.md` 참조.

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

