# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-04 (Sprint 037 - 추천 리스트 위치 정정 / S28).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리** (2026-05-04): 직전 5 Sprint(032~036)만 본 파일에 활성. Sprint 010 이전 ~ Sprint 031 영역과 옛 백로그(3.-18 ~ 3.0)는 `PROGRESS_ARCHIVE.md`로 이전. 새 세션 토큰 약 70%↓.

# 2. 완료 마일스톤 (활성: 직전 5~6 Sprint)

> 이전 Sprint 이력(2.1 ~ 2.52, M0~M6 / 폴리싱 / Sprint 010~031) → `PROGRESS_ARCHIVE.md` 참조.

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
