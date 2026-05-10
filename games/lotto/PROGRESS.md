# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-10 (Sprint 068 - 모바일 풀스코프 최적화 - sticky hover 가드 26개 / touch-action / tap-highlight / --touch-min 토큰).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리**: 1차 2026-05-04 (Sprint 010 이전 ~ 031 + 옛 백로그 3.-18 ~ 3.0 archive 이전). 2차 2026-05-08 (Sprint 032~039 추가 archive 이전). 3차 2026-05-10 (Sprint 040~059 추가 archive 이전). 직전 5 Sprint(060~064)만 본 파일에 활성. `PROGRESS_ARCHIVE.md` 참조.

# 2. 완료 마일스톤 (활성: 직전 5 Sprint)

> 이전 Sprint 이력(2.1 ~ 2.60, M0~M6 / 폴리싱 / Sprint 010~039) → `PROGRESS_ARCHIVE.md` 참조.

## 2.89. Sprint 068 완료 - 모바일 풀스코프 최적화 (S68, 2026-05-10)

배경: 사용자 보고 "핸드폰 크롬으로 테스트할 때 화면 일부가 다르게 나오던데 테스트해줘. github.io에서 테스트하는중" + "캐릭터 접기/펼치기가 모바일에서 잘 안되는것 같아". 사용자 명시 "모두 진행하길 원해, 모바일에 최적화 되어야 해".

### 2.89.1. 진단 (코드 차원 풀스코프)

| # | 모바일 이슈 | 점검 결과 | 영향 |
|---|---|---|---|
| H1 | **Sticky hover** (`:hover` 26 룰, 가드 0건) | `.char-toggle:hover` 등 모든 hover 룰이 모바일에서 sticky hover | **캐릭터 토글 시각 혼동 → 사용자 보고 핵심 원인** |
| H2 | **touch-action 미설정** | 인터랙티브 요소 전수 누락 | 더블탭 줌 / 일부 lazy click |
| H3 | **-webkit-tap-highlight-color 미설정** | 글로벌 누락 | 회색 박스 깜빡임 |
| H4 | 모바일 hit area | `button` base에 `min-height: 44px` 이미 cover. .char-toggle 등 button 요소라 OK | 영향 적음 |
| H5 | viewport / safe-area | `viewport-fit=cover` + `env(safe-area-inset-*)` 잘 적용됨 | OK |
| H6 | font-display | Google Fonts URL `&display=swap` 이미 적용 | OK |
| H7 | iOS 자동 zoom 방지 | `input { font-size: 16px; }` 이미 적용 | OK |

H1, H2, H3가 핵심 결손 = 정도 수정 대상.

### 2.89.2. 수정안 (땜방 금지 = 풀스코프)

| 영역 | 변경 |
|---|---|
| `styles/tokens.css` | `--touch-min: 44px` 신규 토큰 (iOS HIG / Material 권장) |
| `styles/main.css` 글로벌 base | `html, body`에 `-webkit-tap-highlight-color: transparent` / 인터랙티브 base에 `touch-action: manipulation` + `min-height: var(--touch-min)` (매직값 → 토큰) / `[data-action]`에도 `touch-action: manipulation` |
| `styles/main.css` :hover 26 룰 | **모두 `@media (hover: hover) and (pointer: fine)` 가드 안으로** (Node 스크립트 일괄 처리, 외곽 토큰 단위 안전 변환). 모바일 sticky hover 차단. |
| `docs/04_conventions.md` 4.8 | 모바일 표준 룰 7항목 신설. 향후 인터랙티브 요소 추가 시 룰 자동 적용 검증 |

### 2.89.3. 변경 통계

- :hover 룰 가드 적용: **26개 / 26개** (1:1 일치 검증)
- 신규 토큰: 1개 (`--touch-min`)
- 글로벌 base 추가: 3건 (tap-highlight / touch-action button base / touch-action data-action)
- docs 신설: 4.8.1 ~ 4.8.7 (7 룰)
- SW (`game/service-worker.js`): 본 sprint 범위 외 (게임 허브 자산. lotto 전용 아니므로 별도 의제).

### 2.89.4. 검증

- `node tests/run-node.js` → **305/305 PASS** (CSS-only, 회귀 0).
- dev-server 응답: main.css 200 / tokens.css 200 / `@media (hover: hover) and (pointer: fine)` 26회 매치 / `--touch-min` 토큰 1회 매치.
- 매직 44px 잔존: 컴포넌트별 명시 데이터 사이즈(번호공 / 라벨)만. 글로벌 base는 토큰 일원화.

### 2.89.5. 사용자 인상 직접 대응

캐릭터 접기/펼치기 모바일 미작동 인상의 가장 강한 후보 = **H1 (sticky hover)**. 모바일에서 첫 탭 시 `.char-toggle:hover`의 `border-color: var(--color-accent)` 적용 후 잔존 → 두 번째 탭은 시각 변화 없어 "안 눌린 듯" 인상. 본 sprint로 해당 hover 룰이 `@media (hover: hover) and (pointer: fine)` 가드 안에 들어가 모바일에서 발화하지 않음. 시각 일관성 회복.

`touch-action: manipulation`로 모바일 크롬의 300ms 더블탭 zoom 지연도 제거 → 즉시 click 반응.

### 2.89.6. 후속 / 미적용

- SW cache busting (사용자 폰이 옛 v44 캐시 보고 있을 수 있음). `game/service-worker.js`는 게임 허브 자산이라 lotto sprint 범위 외. 별도 의제.
- 사용자 폰에서 강력 새로고침 또는 시크릿 모드 권장 (PWA 설치 상태면 해제 후 재설치).

## 2.88. Sprint 067 완료 - 추천 번호 작위성 정량 검증 (S67, 2026-05-10)

배경: 사용자 보고 "아직도 번호가 작위적인 느낌이 강해. 너무 강해". "전략에 따른 추천 번호가 적정한지 제대로 검토하고 싶어. 전략 하나하나를 수백번 추출한 다음 숫자가 정말 랜덤인지, 한쪽으로 편향된건 아닌지 체크하고 싶어." 권장안 일괄(7차원 측정 / K3 판정 / N=1000 60명 다회차 mix / F3 단계적 / FM 절차)로 진행.

### 2.88.1. 작업 단위 결정

| 항목 | 결정 | 비고 |
|---|---|---|
| P1(render/ 11모듈 테스트) | **보류** | 사용자 명시. bias 검증 우선. |
| 측정 차원 | 7개 전수 (구간 / 1~45 빈도 / 짝홀 / 합계 / 인접 / 끝자리 / 자카드) | 정도(正道) - 땜방 금지 메모리 적용 |
| 편향 기준 | K3 = K1(±20%) + K2(카이제곱 p<0.05) | 직관 + 통계 둘 다 |
| 표본 | 60 캐릭터(12 zodiac × 5 stem) × 1000 추출 × 11 전략 = 660,000 sets | |
| 회차 mix | 최근 100회 (1124~1223) 균등 분포 | 직감 / 통계 전략의 회차 의존성 cover |
| 산출물 | F3 - 1회성 보고서 우선, 영구 회귀(F2)는 임계 결정 후 별도 sprint | |

### 2.88.2. docs / 인프라 영향

- `docs/03_architecture.md`: scripts/ 디렉토리 추가 (lotto 내). import 규칙 표 + 절대 규칙 2.3.4 + 책임 표 한 줄. 산출물 위치 = `tests/reports/<date>_<topic>.md`.
- `scripts/bias-report.mjs` (S67-A): 1차 분석 도구. 660,000 추출 / 7차원 / K3 판정 / 카이제곱 임계 테이블 lookup.
- `scripts/bias-report-n5.mjs` (S67-B): 2차 분석 도구 (N1 가설). 5세트 묶음 단위 = 사용자 "+5세트" 버튼 패턴 직접 정량화. 자연 baseline은 균등 6/45 5000묶음 시뮬로 산출.
- `tests/reports/`: 디렉토리 신설. 일회성 분석 보고서 archive.

### 2.88.3. 1차 보고서 결과 (`tests/reports/bias_2026-05-10.md`)

| 카테고리 | 종합 판정 |
|---|---|
| 랜덤 (랜덤(축복) / 직감 / 균형) | **3종 모두 정상** - 자연 기대 균등 카테고리 그린 |
| 통계 (최신 / 많이 / 보너스 / 적게) | 의도된 편향 caution. 적게 전략의 1~45 빈도 1건 strong (12번 2.67% vs 자연 2.22%, 가장 안 나온 번호 위주의 자연 결과) |
| 운세 (별자리 / 4원소 / 사주) | 별자리 / 4원소 caution (학설 풀 좁음 의도된 편향). 사주는 정상 (5 stem cover로 균등 수렴) |

랜덤 카테고리 핵심 수치: 합 평균 138.10 vs 자연 138.00 / 자카드 0.0765~0.0769 vs 자연 0.0755 / 인접 페어 53.14~53.17% vs 자연 52.87%. **자연 기대치와 사실상 일치**.

### 2.88.4. 2차 보고서 결과 (`tests/reports/bias_n5_2026-05-10.md`, N1 가설)

5세트 묶음 단위 (사용자 "+5세트" 버튼 = 30번호) 7차원 측정. 자연 baseline 5000묶음 시뮬 + 12,000묶음 관측 비교.

| 차원 | 자연 평균 | 사용자 직관 |
|---|---|---|
| 한 구간 최대 쏠림 | 29.27% | 5세트 묶음에서 한 구간이 약 30% 차지가 자연 |
| 한 끝자리 최대 쏠림 | 19.13% | 한 끝자리가 약 19% 차지가 자연 |
| 5세트 평균 자카드 | 0.0764 | 페어와이즈 약 7.6% 겹침이 자연 |
| 30번호 unique | 23.03개 | 30번호 중 7개 중복이 자연 |
| **사용자 정의 "1~10 50% 이상"** | **0.02%** | **5000묶음 중 1건 수준 (매우 드문 케이스)** |

종합: 모든 전략 = 주의 (K2 z-test가 12,000 표본에서 매우 민감해 작은 편차도 잡음). **K1(±20%) 위반은 1~10 50% 차원에서만 0.02 → 0.03% 미세 편차** (절대값 차이 0.01%p, 12,000 묶음 중 추가 1~2건). **strong 0건**.

### 2.88.5. 자비스 자동 결론

- 알고리즘 차원 결손 없음 (1차 + 2차 양 보고서 동의).
- 사용자 인상 "작위적"의 알고리즘 근거는 본 측정 범위(N=12,000 묶음 / 660,000 추출)에서 발견되지 않음.
- 가능 가설:
  - N=1~5 표본의 통계적 변동 (사용자가 본 바로 그 묶음이 우연히 쏠림)
  - 시각 인지 (번호공 색 매핑이 "묶임" 인상 강화)
  - 캐릭터별 특정 시드의 두드러진 패턴 (본 도구는 60명 평균 - 캐릭터별 분리 분석 미실시)

### 2.88.6. 1차 결과 후 사용자 도전 - 자비스 자기점검

사용자: "너는 전혀 문제없다고 판단한거야?"
자비스 정정: **"문제없다"가 아니라 "검증된 영역에서 깨끗"**. 미검증 영역 8건 자기점검 (60명 평균 / Luck=10 고정 / 단일 전략만 / 회차 1124~1223 / 자카드 평균만 / 시드 해시 분포 / 시각 인지 / N=1~5 변동).

권장안 진행 C 채택: **5.1 다중 전략 합성** + **5.2 max 자카드 / max 겹침** 도구 확장.

### 2.88.7. 5.1 / 5.2 도구 확장

- `scripts/bias-report.mjs` 시나리오 19개로 확장 (단일 10 + 다중 9).
- `scripts/bias-report-n5.mjs` 9차원 + 시나리오 19개로 확장 (max 자카드 / max 겹침 추가).
- 다중 9 시나리오: DEFAULT_PRESETS 3종 (사용자 첫 진입 기본) + 카테고리 내 mix 3종 + 카테고리 cross 페어 3종.

### 2.88.8. 확장 보고서 결과

| 영역 | 1차 (개별 본번호) | 2차 (5세트 묶음 9차원) |
|---|---|---|
| 단일 전략 10종 strong | 1건 (적게의 12번 = 의도된 편향) | 0건 |
| 다중 전략 9종 strong | 0건 | 0건 |
| 랜덤 카테고리 (단일 + 묶음) | 모두 정상 | 모든 차원 K1 OK |
| max 자카드 / max 겹침 (사용자 "추천1과 2 비슷" 직접 대응) | - | strong 0건. 자연 0.2159 vs 관측 0.2167~0.2223 (편차 0.3~3%) |

**자연 baseline 통찰**: 5세트 묶음에서 가장 비슷한 두 추천의 평균 자카드 = 0.2159, 평균 겹침 = 2.09개. **자연 무작위에서도 5세트 안에 2개 번호 겹치는 페어가 평균적으로 존재**. 사용자 "추천N이 비슷해" 인상의 일부는 자연 무작위 특성.

### 2.88.9. 자비스 최종 결론 (정정 후)

- 알고리즘 자체에 결손 없음 = 9차원 × 19 시나리오에서 K3 strong **합 1건만** (적게 단일 전략의 12번호 = 의도된 편향).
- 사용자 인상의 출처로 가장 가능성 높은 것: **자연 무작위 자체의 특성** (5세트 안 평균 2개 겹침, 한 구간 30% 점유, 30번호 중 7개 중복은 모두 자연).
- 또는 본 도구가 cover 못한 영역: 사용자 본인 캐릭터 시드 / 시각 인지 (번호공 색) / 시드 해시 분포 자체.

### 2.88.10. 후속 (사용자 결정 영역)

- N3 (캐릭터별 60명 분리 분석)
- N4 (사용자가 "작위적"이라 느낀 구체 사례 청취 후 좁혀 검증) - **권장**
- N5 (본 결과로 결론 → P1(render/ 테스트) 재개)
- 5.4 (시드 해시 입력→출력 분포 검증) / 5.5 (번호공 색 매핑 시각 인지 검증) - 별도 의제

### 2.88.11. 검증

- `node tests/run-node.js` → **305/305 PASS** (회귀 0).
- `node --check` 두 도구 모두 OK.
- 실행: 1차 19.8초 / 2차 17.4초 (Node 25 환경, 표본 5배 증가에도 시간 2배 미만).
- 재현성: 캐릭터 시드 / 자연 baseline 시드 모두 결정론 고정.
- 산출물: `tests/reports/bias_2026-05-10.md` / `bias_n5_2026-05-10.md` (재실행으로 갱신).

### 2.88.12. 사용자 1차 데이터 (11세트 스크린샷) + coverage-report 도구

사용자 보고: "1세트 제외하고 모든 세트에 10번 이하 번호가 들어가지? 그 뒤로 계속해도 거의 대부분 세트에 10번 이하 뽑히던데? 이게 정상이라고??????"
출처 태그 분석 결과: 사용자 화면 = 프리셋 1 "균형" (TREND_FOLLOWER + ASTROLOGER + INTUITIVE).

11세트 즉시 측정: 1~10 출현 10/11 = 90.9% / 1~9 출현 9/11 = 81.8% / 본번호 비율 22.73%.

자연 기대 (6/45 균등): 한 세트에 1~10 1개 이상 = 80.07%, 11세트 중 9세트 이상 등장 = 61.5%, 정확히 10세트 = 23.58%.
**관측 = 자연 기대의 가장 흔한 결과 영역 (직관과 통계가 가장 크게 어긋나는 지점)**.

확정 검증을 위해 신규 도구 `scripts/coverage-report.mjs` 작성. 19 시나리오 × 60 캐릭터 × 1000회 = 시나리오당 60,000세트, 5구간 × 19 = 95 셀 측정.

| 시나리오 (대표) | 1~10 미출현 | 11~20 미출현 | 21~30 미출현 | 31~40 미출현 | 41~45 미출현 |
|---|---|---|---|---|---|
| 자연 기대 | **19.93%** | 19.93% | 19.93% | 19.93% | **47.13%** |
| 랜덤(축복) | 19.75% | 20.08% | 20.18% | 19.83% | 47.12% |
| 직감 | 19.74% | 20.01% | 20.25% | 19.84% | 47.10% |
| 균형 (단일) | 19.75% | 20.05% | 20.18% | 19.82% | 47.16% |
| **프리셋1 균형 (사용자 본 화면)** | **19.88%** | 20.64% | 19.85% | 19.30% | 47.35% |

95 셀 모두 자연 기대 ±5% 안. K1 ±20% 위반 0건. **알고리즘 모든 색깔에서 자연 무작위와 사실상 일치**.

사용자 인상의 통계 근거 = 1~10 출현률 자연 80.07% (= 미출현 19.93%의 보집합). 본 도구 모든 시나리오에서 1~10 출현 80% 전후 = 자연. 실행 14.7초.

### 2.88.13. coverage-bundle-report 신규 도구 - 사용자 화면 11세트 단위 직접 대응

사용자 명시: "균형, 분산파, 운세파로 묶여 있는것들에 대해 안 나올 확률 다시 테스트". 사용자 화면 = 11세트 단위라 11세트 묶음 안 등장 세트 수 분포 측정이 사용자 인상에 직접 대응.

`scripts/coverage-bundle-report.mjs` 신규. 3 프리셋 × 60 캐릭터 × 100묶음 × 11세트 = 시나리오당 6,000묶음 (66,000세트). 한 묶음 안 등장 세트 수 k=0~11 분포 측정 + 이항 분포 자연 기대 비교.

자연 기대 (1~10 기준, q=80.07%):
- k=11 모두 등장: 8.68%
- k=10 (사용자 관측): **23.75%** ← 11세트 묶음 약 4번 중 1번 빈도
- k=9: 29.55%
- k=8: 22.07%
- k=9 이상: 61.98%

3 프리셋 관측 (1~10):
| 프리셋 | 한 세트 미출현 | k=10 비율 | 9세트+ 등장 비율 |
|---|---|---|---|
| 자연 기대 | 19.93% | 23.75% | 61.98% |
| 균형 | 20.29% | 23.52% | 60.50% |
| 분산파 | 19.78% | 24.53% | 62.27% |
| 운세파 | 20.06% | 24.12% | 61.63% |

**3 프리셋 × 5 구간 × k=0~11 = 198 셀 모두 자연 기대 ±2%p 안**. K1 ±20% 위반 0건. 알고리즘이 묶음 단위에서도 자연 무작위와 사실상 일치.

실행 3.6초. 산출물 `tests/reports/coverage_bundle_2026-05-10.md`.

### 2.88.14. 후속 (사용자 결정 영역, 변경 없음)

- N4 사용자 본인 시드 데이터 청취 → 1000회 분포 정밀 검증 (변동 vs 시드 특이성 구분).
- 5.5 시각 인지 가설 (번호공 색 묶음).
- N5 본 의제 종결 후 P1(render/ 테스트) 재개.

## 2.87. Sprint 066 완료 - is-just-added 펄스 영역 재정정 + 추천 리스트 좌측 들여쓰기 130% (S66, 2026-05-10)

배경: 사용자 보고 2건. (1) S62의 row 전체 펄스(`.saved-set-row::before inset: 4px 8px`)가 row 좌우 padding 0 환경에서 라벨 "추천N" 글자 일부를 가로지름. "추천1,2 스트링 중간만 하이라이트에 들어감". (2) "추천1,2 스트링이 좀 더 들여쓰기 되도록 130% 마진".

### 2.87.1. 펄스 영역 재정정

| 측면 | 이전 (S62) | 이후 (S66) |
|---|---|---|
| 셀렉터 | `.saved-set-row.is-just-added::before` | `.saved-set-row.is-just-added .saved-set-balls::before` |
| pseudo inset | `4px 8px` (좌우 8px가 라벨에 닿음) | `0` (번호공 컨테이너 정확히 덮음) |
| 강조 의미 | row 전체 | "새로 들어온 번호 6개" |
| 라벨 / 휴지통 | 펄스 영역에 포함되어 글자 가로지름 | 펄스 영역 외 |
| 외부 글로우 | 외곽선 폐기, box-shadow 14px accent | 동일 (글로우는 컨테이너 바깥으로 부드럽게 새어나감) |

### 2.87.2. 좌측 들여쓰기 130%

- `.saved-sets-section` `padding-left`: `calc(var(--space-3) * 1.5)` → `calc(var(--space-3) * 1.5 * 1.3)` (18 → 23.4px).
- 토큰 베이스 비율 유지(매직 픽셀 0). 사용자 명시 130%.

### 2.87.3. 변경 파일

- `docs/02_data.md` 1.5.8.6.7 명세 표 갱신 (펄스 컨테이너 / inset 0 / z-index 분리 명시).
- `styles/main.css`: 펄스 룰 재장소 + reduced-motion 폴백 동시 갱신 / `.saved-sets-section` padding-left 130%.
- `service-worker.js` v43 → v44.

### 2.87.4. 검증

- `node tests/run-node.js` → **305 / 305 PASS** (CSS-only, 회귀 0).
- dev-server 응답: main.css `.saved-set-balls::before` / `1.5 * 1.3` / SW v44 모두 200 + 컨텐츠 정상.

## 2.86. Sprint 065 완료 - syncDraws / syncDrawsIfNewer fetch mock 회귀 (S64.1, 2026-05-10)

배경: Sprint 064 잔여 백로그 = `syncDraws` / `syncDrawsIfNewer` 2 export 미커버. 본 sprint로 닫음. test framework가 sync only이라 비동기 진입점(`asyncSuite` / `asyncTest`) 신규 도입 + 별도 suite 파일로 격리해 기존 296 테스트 회귀 위험 0.

### 2.86.1. test framework 비동기 확장

- `tests/core.js`: `asyncSuite(name, asyncFn)` + `asyncTest(name, asyncFn)` 신규 export. 기존 `suite` / `test`는 그대로(sync). 호출부 패턴 = `await asyncSuite('...', async () => { await asyncTest('...', async () => {}); });`. ESM top-level await로 import 평가가 모든 asyncTest 끝까지 기다림 → done() 시점 카운트 보장.

### 2.86.2. tests/suites/storage-async.test.js 신설 (9건)

| 분기 | 카운트 | 핵심 |
|---|---|---|
| `new-rounds` | 1 | 미러 latest > cached + 정적 번들 갱신 → saveDraws + updated=true |
| `already-latest` | 1 | 미러 latest === cached → cached 보존 |
| `mirror-unreachable` | 2 | 미러 fetch throw / ok=false 두 케이스 모두 동일 분기 |
| `sync-failed` | 2 | 정적 draws.json 비어있음 / fetchedMax <= cachedMax (CI 지연) |
| syncDraws 단독 | 3 | 새 fetched save / fetched 비면 cached / fetchedMax === cachedMax 등호 포함 |

fetch mock 패턴: `globalThis.fetch`를 일시 교체 후 `finally`로 원복. URL 식별 = `'latest'` / `'draws.json'` includes.

### 2.86.3. 검증

- `node tests/run-node.js` → 296 → **305 / 305 PASS** (9건 신규 모두 통과).
- 기존 296 sync 테스트 회귀 0 (asyncSuite/asyncTest는 별도 export로 분리).
- Node 25 polyfill 가드 + globalThis.fetch 호환 확인.

### 2.86.4. 결과

- storage 25 export 중 **25 / 25 모두 커버** (전건 회귀 보장).
- S64.1 백로그 항목 = 닫힘.
- 잔여 후속: 2.85.4의 S59.4 라인은 본 sprint와 함께 정리 (이번 PROGRESS 갱신에서 처리).

## 2.85. Sprint 064 완료 - storage 테스트 커버리지 보강 + 마이그레이션 회귀 (S64 / S59.4 백로그 1번 소화, 2026-05-10)

배경: PROGRESS 2.80.4의 잔여 항목 "S59.4 storage 테스트 커버리지 16/25 보강". 옵션 B 권장안 진행 - 동기 export 14건 round-trip + 마이그레이션 + clearAll/options 보너스. sync* 2건은 fetch mock 도입 필요라 별도 sprint(미래 S64.1)로 분리.

### 2.85.1. 추가 회귀 22건

| 그룹 | 건수 | 핵심 |
|---|---|---|
| 통계 캐시 round-trip | 6건 | numberStats / bonusStats / cooccur 기본 null + round-trip |
| 활성 캐릭터 ID | 2건 | 기본 null + round-trip |
| 프리셋 round-trip + 마이그레이션 | 5건 | 기본값 deep clone / round-trip / S43.7 직감-단독 자동 reset / 사용자 편집 흔적 보존 / S63 subtitle 잔존 throw 없이 반환 |
| charCardCollapsed | 4건 | 기본 false / true round-trip / false round-trip / 비-bool 정규화 |
| ritualState | 2건 | 기본 null + round-trip |
| options 마이그레이션 + clearAll PREFIX | 3건 | 누락 키 자동 채움 / S19 multiStrategy 폐기 키 무시 / clearAll이 lotto_ 외부 키 보존 |

### 2.85.2. 변경 파일

- `tests/suites/storage.test.js`: 64줄 → 약 230줄. 6 suite 신설. import에 누락된 14 export + DEFAULT_PRESETS 추가.

### 2.85.3. 검증

- `node tests/run-node.js` → 274 → **296 / 296 PASS** (22건 신규 모두 통과).
- 미커버 export 잔여: `syncDraws` / `syncDrawsIfNewer` 2건. fetch mock 패턴 도입과 함께 별도 sprint(S64.1).
- Node 25 polyfill 가드(S58 fix)에서도 정상 동작 확인.

### 2.85.4. 잔여 / 후속

- ~~S64.1 (대기)~~ **닫힘 - Sprint 065 (2026-05-10)에서 fetch mock 4분기 회귀 9건 추가. 305/305 PASS. storage 25/25 커버.**
- S59.4 백로그 항목 = 본 sprint로 닫힘. PROGRESS 2.80.4의 S59.4 라인은 다음 정리에서 제거.

## 2.84. Sprint 063 완료 - 프리셋 부제 폐기 + 묶인 전략 label list 자동 표시 (S63, 2026-05-10)

배경: 사용자 보고 "전략 버튼 안 서브 문자열에 애매한 설명보다, 실제 선택된 전략을 표시해줘". 사용자 입력 부제(예 "최신·운세·직감 한 번에")가 자비스 정직성 정책과 맞지 않아 "묶인 전략"을 그대로 노출하기로 결정.

### 2.84.1. 부제 필드 자체 폐기 (옵션 1 권장안 진행)

| 영역 | 이전 | 이후 |
|---|---|---|
| 추첨 탭 슬롯 두 번째 행 | 사용자 입력 부제 | `.preset-strategy-line` - `strategyLabel` list 자동 (예: "최신 · 별자리 · 직감") |
| 설정 탭 - 프리셋 관리 | 라벨 / 부제 / `strategyShort`(1자) 3행 | 라벨 / `strategyLabel` 2행 (label 통일) |
| 편집 모달 | 라벨 / 부제 / 전략 체크 | 라벨 / 전략 체크 |
| 데이터 | `subtitle: string` | 필드 제거 |
| 상수 | `PRESET_SUBTITLE_MAX = 20` | 폐기 |

### 2.84.2. 변경 파일

- `docs/01_spec.md` 5.1.5.1 / 5.1.5.2 갱신.
- `docs/02_data.md` 1.20 표 / 스키마 / 마이그레이션 노트 신설.
- `src/data/numbers.js`: `PRESET_SUBTITLE_MAX` 폐기, `DEFAULT_PRESETS` `subtitle` 필드 제거.
- `src/render/preset-editor.js`: 부제 입력 필드 / 핸들러 / 저장 cleaning / 빈 슬롯 채움 / `PRESET_SUBTITLE_MAX` import 모두 제거.
- `src/render/preset-buttons.js`: `strategyLabel` import 추가, `subtitle` 표시 → 자동 list.
- `src/render/settings-page.js`: `strategyShort` → `strategyLabel` 통일, `.preset-manage-subtitle` 행 제거.
- `styles/main.css`: `.preset-subtitle` / `.preset-manage-subtitle` 룰 폐기, `.preset-strategy-line` 신규.
- `service-worker.js` v42 → v43.

### 2.84.3. 마이그레이션

옛 storage(`lotto_presets`)에 `subtitle` 키가 있어도 `loadPresets`는 그대로 반환. 렌더 단계에서 미참조라 시각 영향 0. 다음 `savePresets` 호출 시 자연 소실.

### 2.84.4. 검증

- `node tests/run-node.js` → 274/274 PASS.
- `node --check` 4파일 OK.
- 옛 subtitle 참조 grep → 폐기 사유 주석만, 실 코드 0건.

## 2.83. Sprint 062 완료 - is-just-added 펄스 시각 정정 (S62, 2026-05-10)

배경: 사용자 보고 "노티 표시가 '추천1'에 너무 딱 붙어서 네모로 표시되니까 ui가 너무 허접". 초기안(inset 외곽선 + radius-sm)이 row 좌우 padding 0 환경에서 라벨에 외곽선이 닿아 답답함.

### 2.83.1. 옵션 D 채택 (외곽선 폐기 + 외부 글로우 + 라운드 + inset)

| 항목 | 이전 (S60) | 이후 (S62) |
|---|---|---|
| 렌더 방식 | row 자체에 inset border + bg | row의 `::before` pseudo (absolute) |
| 외곽선 | inset 2px gold | **폐기** (시선은 외부 글로우만으로 충분) |
| 라운드 | `--radius-sm` | `--radius-md` |
| 좌우 마진 | 0 (라벨에 붙음) | inset 8px (라벨과 시각 거리) |
| 글로우 | 없음 | 외부 box-shadow `0 0 14px` accent |
| layout 영향 | 약간 (border-radius) | 0 (pseudo absolute) |

### 2.83.2. 변경 파일

- `docs/02_data.md` 1.5.8.6.7 명세 표 갱신.
- `styles/main.css`: 펄스 룰 교체. `@keyframes saved-set-pulse` 갱신, reduced-motion 폴백 갱신.
- `service-worker.js` v41 → v42.

### 2.83.3. 검증

- `node tests/run-node.js` → 274/274 PASS (CSS-only 변경, 회귀 위험 0).
- 룰 중복 검사: `.saved-set-row` `position: relative`를 기본 룰에 통합.

## 2.82. Sprint 061 완료 - 프리셋 편집 진입을 추첨 탭 → 설정 탭으로 이동 (S61, 2026-05-10)

배경: 사용자 질문 "전략 편집을 설정으로 옮길 수 있을까?". 편집은 정착 후 자주 발생하지 않는 액션이라 추첨 탭에 영구 노출 가치 낮음. 권장안 (B + 모달 재활용) 진행.

### 2.82.1. 진입점 이동

| 항목 | 이전 | 이후 |
|---|---|---|
| 추첨 탭 진입 | 프리셋 슬롯 아래 "편집" 텍스트 링크 | **폐기** (시각 노이즈 1줄 회수) |
| 설정 탭 진입 | 없음 | "프리셋 관리" 섹션 신설 (캐릭터 관리 다음) |
| 편집 동작 | 모달 | 모달 그대로 재활용 (행 클릭 → 모달) |
| 기본값 복원 | 모달 안만 | 설정 탭 섹션에도 노출 (모달 안과 동일 동작) |

### 2.82.2. 변경 파일

- `docs/01_spec.md` 4장 설정 탭 한 줄 / 5.1.5.2 진입점 갱신.
- `docs/03_architecture.md` settings-page 의존성 주석.
- `src/render/preset-buttons.js`: `.preset-edit-row` / `.preset-edit-link` 영역 폐기.
- `src/render/settings-page.js`: 프리셋 관리 섹션 + 슬롯 행 + 기본값 복원 + `onPresetsChanged` 핸들러.
- `src/render/main.js`: `openPresetEditor` import 폐기 / 추첨 탭 핸들러 폐기 / `onPresetsChanged: state.presets reload`.
- `styles/main.css`: dead `.preset-edit-row` / `.preset-edit-link` 룰 폐기, `.preset-manage-*` 신규.
- `service-worker.js` v40 → v41.

### 2.82.3. 검증

- `node tests/run-node.js` → 274/274 PASS.
- dead 셀렉터 잔존 grep → 주석 안 변경 사유만, 실 코드 0건.

## 2.81. Sprint 060 완료 - 누적 추천 토스트 위치 + 카드 펄스 도입 (S60, 2026-05-10)

배경: 사용자 보고 "추가 1세트를 추가했습니다 메시지를 왜 팝업으로 안띄우고 메인창에 띄우지?". 액션바 인라인 토스트는 누적 리스트가 길어지면 함께 화면 밖으로 밀려 메시지 인지 불가. 권장안 A+C (화면 하단 fixed 팝업 + 추가된 카드 펄스) 진행.

### 2.81.1. 화면 하단 fixed 팝업 + 카드 펄스

| 영역 | 변경 |
|---|---|
| 위치 | 액션바 인라인 → body 직속 lazy-init `.saved-toast-root` (화면 하단 fixed, bottom-tabs 위 12px) |
| z-index | 신규 `--z-toast: 50` (overlay 10 < toast 50 < modal 100) |
| 펄스 | `saved-set-row` 인덱스 `startIdx ~ startIdx + addedCount - 1` 1초 펄스 (accent 외곽 글로우 + 배경 fade) |
| 펄스 시간 | `SAVED_SETS_JUST_ADDED_MS = 1000` |
| 역할 분리 | 토스트 = "몇 세트", 펄스 = "어디에" |
| reduced-motion | 폴백 (animation off + 정적 강조) |

### 2.81.2. 변경 파일

- `docs/01_spec.md` 5.2.5.4 표 갱신 + 5.2.5.4.8 / 5.2.5.4.9 신설.
- `docs/02_data.md` 1.5.8.2 `SAVED_SETS_JUST_ADDED_MS` 추가, 1.5.8.6 표 + 1.5.8.6.6 / 1.5.8.6.7 신설.
- `src/data/numbers.js`: `SAVED_SETS_JUST_ADDED_MS = 1000`.
- `styles/tokens.css`: `--z-toast: 50` 신규.
- `src/render/saved-sets-section.js`: 액션바 토스트 슬롯 폐기.
- `src/render/main.js`: `flashSavedSetsToast` body 직속 fixed 패턴 + `markSavedSetsJustAdded` 신설.
- `styles/main.css`: `.saved-toast-root` fixed 팝업 + `@keyframes saved-set-pulse` (S62에서 시각 정정).
- `tests/suites/saved-sets.test.js`: `SAVED_SETS_JUST_ADDED_MS` 회귀 단언.
- `service-worker.js` v39 → v40.

### 2.81.3. 검증

- `node tests/run-node.js` → 274/274 PASS (Node 25 환경에서도 풀 그린).

