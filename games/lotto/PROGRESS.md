# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-19 (Sprint 097-후속 - ? ball 원형 정합 + 미발표 dim 폐기 + 7일 자동 노출 윈도우).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리**: 1차 2026-05-04 (Sprint 010 이전 ~ 031 + 옛 백로그 3.-18 ~ 3.0 archive 이전). 2차 2026-05-08 (Sprint 032~039 추가 archive 이전). 3차 2026-05-10 (Sprint 040~059 추가 archive 이전). 4차 2026-05-16 (Sprint 060~064 추가 archive 이전). 5차~8차 2026-05-16 (Sprint 065~068 각각 강제 이전). 9~16차 2026-05-17 (Sprint 069~076 각각 강제 이전). 17차 2026-05-18 (Sprint 077 강제 이전). 18차 2026-05-18 (Sprint 078/079 2건 동시 강제 이전). 19차 2026-05-18 (Sprint 084 강제 이전). 20차 2026-05-19 (Sprint 088 강제 이전). 21차 2026-05-19 (Sprint 089 강제 이전). 22차 2026-05-19 (Sprint 090 강제 이전 = Sprint 097 추가로 활성 8 → 룰 1.6 1건 cap 정합). 직전 5 Sprint + 본 sprint(들)만 본 파일에 활성. `PROGRESS_ARCHIVE.md` 참조.
1.6. **PROGRESS.md 길이 정책 (S72, 2026-05-16 룰화)**: 활성 sprint 절 **최대 7건**(직전 5 + 본 sprint 묶음). 8건 초과 시 가장 옛 sprint 1건을 `PROGRESS_ARCHIVE.md` 강제 이전. archive는 무제한. 자연 약 350~500줄 유지.

# 2. 완료 마일스톤 (활성: 직전 5 Sprint + 본 sprint)

> 이전 Sprint 이력(2.1 ~ 2.98, M0~M6 / 폴리싱 / Sprint 010~077) → `PROGRESS_ARCHIVE.md` 참조.

## 2.105. Sprint 091 완료 - 하단 탭 순서 + 라벨 정정 (S091, 2026-05-18)

배경: 사용자 명시 2건. (1) "하단 탭 순서 변경: 추첨, 전적, 통계, 역추첨, 설정" (2) "스트링 변경: 추첨→추천 / 전적→기록 / 역추첨→게임".

### 2.105.1. 변경 매핑

| 위치 | 옛 | 새 |
|---|---|---|
| 탭 1 | 추첨 (home) | **추천** (home) |
| 탭 2 | 통계 (stats) | **기록** (history) |
| 탭 3 | 역추첨 (reverse) | **통계** (stats) |
| 탭 4 | 전적 (history) | **게임** (reverse) |
| 탭 5 | 설정 (settings) | 설정 (settings) |

**id 보존**: home / history / stats / reverse / settings = 옛 그대로. state.currentTab 호환성 + 옛 사용자 데이터 영향 0.

### 2.105.2. 변경 파일

- `src/render/bottom-tabs.js`: `TABS` 배열 순서 + label/short 정정.
- `src/render/history-page.js`: h1 "전적" → "기록" + 빈 상태 카피 "전적이 비어있습니다" + "추첨 탭에서" → "기록이 비어있습니다" + "추천 탭에서".
- `src/render/reverse-page.js`: h1 "역추첨" → "게임".
- `docs/01_spec.md` 4장: 5탭 모델 라벨 + 순서 정정 + 변경 메모.
- `service-worker.js` v75 → v76.

### 2.105.3. 검증

`node tests/run-node.js` → 316/316 PASS (UI 라벨만 변경, 회귀 0).

### 2.105.4. 사용자 화면 기대 변동

하단 탭 바 (왼→오): **추천 / 기록 / 통계 / 게임 / 설정**.
- 추천 탭 = 옛 추첨 탭 콘텐츠 그대로.
- 기록 탭 = 옛 전적 탭. h1 "기록".
- 통계 탭 = 변동 없음.
- 게임 탭 = 옛 역추첨 탭. h1 "게임" (6개 골라 매칭 게임 의미).
- 설정 탭 = 변동 없음.

### 2.105.5. 잔여

- 코드 / 주석 안 "추첨 탭" / "전적 탭" / "역추첨 탭" 표기 (사용자 미노출 영역) = 역사 흔적 보존. 향후 cleanup sprint 영역.
- icons.js 안 주석 "추첨 탭: 빛나는 별" / "전적 탭: 시계" = 의미상 그대로 (아이콘은 동일).

### 2.105.6. Sprint 077 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 077(절 2.98, 추천 리스트 다중 학설 매칭 시각화) archive 이전. 본 sprint 종료 시점 활성 = 078~079 + 084 + 088 + 089 + 090 + 091 = 7건 정합. archive 17차 정리.

### 2.105.7. S091-후속 - 확정 배경 앞쪽 마진 절반 (2026-05-18)

배경: 사용자 캡쳐 + 명시 "확정된 배경 앞쪽 마진 절반으로 줄여줘". 확정 row의 노란 배경이 section padding-left(≈23.4px) 안쪽에서 시작 = 좌측 빈 공간이 너무 큼.

**진단**:
- `.saved-sets-section` padding-left = `calc(var(--space-3) * 1.5 * 1.3)` ≈ 23.4px (S66, 2026-05-10 "추천N" 라벨 들여쓰기 강화).
- 확정 row background이 section padding-left 안쪽에서 시작 = 23.4px 좌측 빈 공간.
- 사용자 의도 = 절반(≈12px)으로 축소.

**정정**: 확정 row만 negative margin-left + padding-left 보상.

| 영역 | 변경 |
|---|---|
| `.saved-set-row.is-registered` | `margin-left: calc(var(--space-3) * -1)` (-12px = section padding-left의 약 절반) |
| (위와 함께) | `padding-left: calc(var(--space-3) / 2 + var(--space-3))` (기본 6px + 보상 12px = 18px) |

**효과**:
- 확정 row background이 좌측으로 12px 더 확장 = section padding-left의 절반(11.7px ≈ 12px) 흡수.
- row 콘텐츠(라벨 / 번호공 / 버튼 / 휴지통)는 padding 보상으로 가로 위치 무영향.
- 미확정 row 변동 0.

**근거**: B 옵션(확정 row만 negative margin) 채택. 옵션 A(section padding 절반)은 모든 row 영향이라 사용자 명시 "확정된 배경"과 어긋남.

**변경 파일**:
- `styles/main.css` `.saved-set-row.is-registered`
- `docs/01_spec.md` 5.2.5.9 시각 명세 보강
- `service-worker.js` v76 → v77

**검증**: 316/316 PASS (CSS-only).

**사용자 화면 기대 변동**:
- 확정 row 노란 배경이 좌측 외곽 더 가까이까지 확장 (절반 마진 = ≈12px만 잔존).
- "추천N" 라벨 가로 위치 = 미확정 row와 동일 유지.
- 우측 마진 = 변동 없음 (사용자 명시 "앞쪽"만).

## 2.106. Sprint 092 완료 - 기록 탭 옛 회차 이력 회차별 그룹핑 (S092 통합 정정, 2026-05-18)

배경: 사용자 명시 4건 연속 진화.
1. "옛 회차도 현재 회차와 동일한 UI" → 1차 시도 = 헤더 폐기(번호공만).
2. "정확한 회차와 년월일을 표시" → 회차/날짜 정보 부활 필요.
3. "당첨번호와 등수 표시" → 발표 번호 + 등수 라벨 추가 필요.
4. "같은 회차에 선택된 추천 번호를 그룹핑" → 회차별 그룹 구조 = 최종 결정.

본 sprint = 1차 안에서 4차 안까지 같은 세션에서 진화. SSOT/PROGRESS는 최종 결정만 보존(중간 1차 안 흔적 제거).

### 2.106.1. 최종 구조

```
[옛 회차 이력 (M개 회차 · N건)]
  └ 1224회 · 2026-05-10            (그룹 헤더)
      당첨: 1 7 14 22 31 45         (작은 ball 6개)
      ┌────────────────────────┐
      │ 추천 row 1 (번호공)  3등 │
      │ 추천 row 2 (번호공)  미적중│
      └────────────────────────┘
  └ 1223회 · 2026-05-03
      ...
```

발표 대기 섹션 = 변동 없음 (이미 1 회차 묶음 = 자연 그룹).

### 2.106.2. 변경 매핑

| 항목 | 옛 | 새 |
|---|---|---|
| 옛 회차 이력 구조 | 항목 N개 평탄 리스트 (헤더에 회차/등수) | **회차별 그룹 카드 + 그룹 안 추천 row** |
| 그룹 헤더 | (없음) | `NNNN회 · YYYY-MM-DD` + 발표 당첨번호 6 ball |
| 그룹 본문 row 헤더 | (제거됨) | 등수 라벨만 (우측) |
| draw 미수신 회차 | (그룹 없음) | "발표 데이터 미수신" 라벨 |
| `renderHistoryPage` 시그니처 | `(container, character, currentDrwNo)` | `(container, character, currentDrwNo, draws)` |

### 2.106.3. 변경 파일

- `src/render/history-page.js`: `historyGroupHtml(drwNo, items, draw)` 신설. pastItems → drwNo 기준 Map 그룹핑. drawMap 추가.
- `src/render/main.js`: `renderHistoryPage` 호출에 `state.draws` 전달.
- `styles/main.css`: `.history-group-list` / `.history-group` / `.history-group-header` / `.history-group-drw` / `.history-group-winning` / `.history-group-winning-label` / `.history-group-winning-nums` / `.history-num-mini` 추가.
- `docs/01_spec.md` 5.8.1-A: S092 정책 통합 정정 (그룹핑 + 회차/날짜/당첨번호/등수).
- `docs/01_spec.md` 5.8.4: 이력 회차별 그룹 명세 재작성.
- `service-worker.js` v78 코멘트 통합 정정 (v 유지 - 같은 sprint 안 정정).
- `games/lotto/tools/seed-history.html` 동반 추가 (production 자산 아님, 1224회 등 임의 회차 history 항목 주입 GUI).

### 2.106.4. 검증

`node tests/run-node.js` 316/316 PASS. 회귀 0 (data 모듈 / core 모듈 변경 없음, 렌더 레이어만).

### 2.106.5. 사용자 화면 기대 변동

- 기록 탭 "옛 회차 이력" 섹션 = 회차별 카드. 1 카드 = 회차/날짜 헤더 + 발표 당첨번호 6 + 추천 row N (등수 라벨 우측).
- 발표 대기 섹션 = 변동 없음.
- 1224회 시드 도구로 항목 주입 후 새로고침: "1224회 · YYYY-MM-DD" 그룹 헤더 + 당첨번호 + 추천 row + 등수 라벨 노출.

### 2.106.6. 잔여

- PROGRESS.md 룰 1.6 (활성 7건 cap): 본 sprint 추가로 8건 → Sprint 078(절 2.99) archive 이전 필요. 별도 chore 작업으로 처리 권장 (코드 무관, PROGRESS / ARCHIVE 텍스트 이동만).
- 발표 대기 섹션에 추첨 예정일 표기는 본 sprint 범위 외 (사용자 명시 "옛 회차" 강조). 필요 시 후속 sprint.

### 2.106.7. S092-후속 - 보너스 + 라벨 정정 + 한 줄 layout (2026-05-18)

사용자 캡쳐 + 명시 3건 추가:
1. "당첨 번호에 보너스 번호가 표시되지 않음" → 그룹 헤더 당첨번호에 보너스 ball 추가.
2. "미적중 / 미발표 이게 뭐야?" → 모호 라벨 분기 (draws 가용=미적중, 미가용=미발표).
3. "결과와 번호를 한 줄에 표시" → row 마크업 신규 (번호공 좌측 + 등수 라벨 우측, flex space-between).

**변경 매핑**:

| 영역 | 옛 | 새 |
|---|---|---|
| 그룹 헤더 당첨번호 | 본번호 6 ball만 | 본번호 6 + `+` 구분자 + 보너스 ball (점선 외곽선) |
| 미매칭 라벨 | "미적중 / 미발표" (모호) | `matchedRank=null + hasDraw` → "미적중" / `null + !hasDraw` → "미발표" |
| 추천 row layout | 2줄 (헤더 위 + 번호공 아래) | **1줄** (번호공 좌측 + 등수 라벨 우측, `space-between`) |
| row CSS 클래스 | `.history-item` (재활용) | `.history-group-row` 신설 |

**변경 파일**:
- `src/render/history-page.js`: `historyGroupHtml` 보너스 ball 분기 + `historyGroupRowHtml` 신설 (한 줄 row + 라벨 분기). 옛 `historyItemHtml(h, false, true)` 호출 폐기.
- `styles/main.css`: `.history-num-mini.is-bonus` (점선 외곽선) + `.history-num-plus` (구분자) + `.history-group-rows` / `.history-group-row` / `.history-group-row-nums` / `.history-group-row-rank` 신설.
- `docs/01_spec.md` 5.8.4: 보너스 + 라벨 분기 + 한 줄 layout 명시.
- `service-worker.js` v78 코멘트 통합 정정 (7건 통합).

**검증**: `node tests/run-node.js` 316/316 PASS.

**사용자 화면 기대 변동**:
- 그룹 헤더 당첨 영역: `당첨 9 18 21 27 44 45 + 16(점선)` 형식.
- 추천 row: `[번호공 6 ──── 미적중]` 한 줄. 라벨이 모호하던 "미적중 / 미발표" → 1224회처럼 draws 있으면 "미적중" 단독.

### 2.106.8. S092-후속 2 - 일치 ball 하이라이트 + 라벨 세분화 (2026-05-18)

사용자 명시 3건 추가:
1. "맞은 번호는 하이라이트해주면 안돼?" → 추천 ball 중 당첨 본번호와 일치 = 골드 외곽선 + glow.
2. "5등은 몇개 맞아야 하는거지?" → 본번호 3개 (답변만, 코드 변경 없음).
3. "0개 적중일 때 미적중, 1개 적중일 때 1개 적중, 2개 적중, 5등..." → 라벨 세분화.

**라벨 분기 (S092-후속 2 최종)**:

| matched | hasDraw | 라벨 |
|---|---|---|
| (rank 1~5) | true | `1등` ~ `5등` |
| null | false | `미발표` |
| 0 | true | `미적중` |
| 1 | true | `1개 적중` |
| 2 | true | `2개 적중` |

**6/45 등수 기준 (참고)**: 1등(6) / 2등(5+보너스) / 3등(5) / 4등(4) / 5등(3) / 미적중(0~2).

**변경 파일**:
- `src/render/history-page.js`: `historyGroupRowHtml(h, draw, hasDraw)` 시그니처 확장. matched count 계산 (Set 교집합). 라벨 분기 정정. ball에 `is-matched` 클래스 부여.
- `styles/main.css`: `.history-group-row-nums .num.is-matched` 정의 (골드 외곽선 box-shadow + scale 1.05).
- `docs/01_spec.md` 5.8.4: 라벨 분기 트리 + 하이라이트 명세 + 6/45 등수 참고.

### 2.106.9. S092-후속 3 - 당첨번호 row 중앙 정렬 (2026-05-18)

사용자 명시: "당첨 번호도 중앙 정렬, '당첨' 스트링은 오른쪽 미적중과 같은 위치에 배치".

**정정**:
- 그룹 헤더 당첨번호 row가 추천 row와 100% 동일 layout으로 통일.
- `.history-group-winning` flex `justify-content: space-between` + 라벨 `order: 2` + 번호공 `order: 1` + `flex: 1` + `justify-content: center`.
- `.history-group-winning-label` `min-width: 48px` + `text-align: right` (추천 row의 등수 라벨 정합).
- "발표 데이터 미수신" 라벨은 단독 표시 = `.is-missing` 분기로 `justify-content: center` + `order: unset`.

**변경 파일**:
- `styles/main.css`: `.history-group-winning` 계열 CSS 갱신.
- `docs/01_spec.md` 5.8.4: 그룹 헤더 layout 명세 갱신.
- `service-worker.js` v78 코멘트 10건 통합.

### 2.106.10. S092-후속 4 + 5 + 6 - 하이라이트 진화 (2026-05-18)

사용자 명시 3단계 정정:
1. (후속 4) "하이라이트가 잘 안 보이네" → 2층 외곽선 + 강한 glow + scale 1.15 + 역강조(.has-match row 한정).
2. (후속 5) "번호 확대는 별로" → scale 1.15 폐기.
3. (후속 6) "색을 빼려면 미적중인것들도 모두 빼야지 규칙이 개판" → .has-match 분기 폐기. 미일치 dim을 row 종류 무관 항상 적용 = 룰 일관성.

**자비스 결손 자인 (후속 6)**: 후속 4에서 "미적중 row 어색 회피" 명목으로 분기 도입한 게 정작 룰 일관성을 깨뜨림. 미일치는 미일치다 - row 컨텍스트로 표시를 달리한 것이 결손. 사용자 지적 정확.

**최종 전략 (자비스 자율 결정 폐기, 룰 단순화)**:
- 정강조 (일치 ball): 흰색 inner 2px + 골드 outer 2px 2층 외곽선 + 14px glow + z-index 1.
- 역강조 (미일치 ball, **row 종류 무관 항상**): opacity 0.35 + grayscale 0.7.
- 미적중 row(0개 일치) = 6개 ball 전부 dim → "0개 적중" 시각 표현 자연 강화 (어색하지 않음, 오히려 정합).
- 번호공 크기 변형 없음.

**변경 파일**:
- `src/render/history-page.js`: `.has-match` 클래스 부여 로직 폐기, row 클래스 단순화.
- `styles/main.css`: `.history-group-row-nums .num:not(.is-matched)` (단순 selector) dim.
- `docs/01_spec.md` 5.8.4: 하이라이트 명세 갱신 (룰 일관성 표기).

**검증**: 316/316 PASS.

### 2.106.11. S092-후속 7 - 당첨 ball 크기 통일 + 골드 톤 배경 (2026-05-18)

사용자 명시: "당첨 번호가 작은데 크기 동일하게 하고 배경 색을 살짝 다르게 해줘".

**정정**:
- `.history-num-mini` (22x22) 폐기. 당첨 ball도 `.history-num` (32x32) 사용 → 추천 row와 100% 동일 크기.
- 당첨 row 배경 = `rgba(201, 160, 80, 0.08)` + border `rgba(201, 160, 80, 0.28)` (골드 톤 옅게) - 추천 row(bg 단색)와 시각 구분.
- `.history-num.is-bonus` 외곽선 보존 (보너스 시각 구분 유지).
- `.history-num-plus` 폰트 사이즈 12px → `var(--font-size-md)` (큰 ball에 맞춤).

**변경 파일**:
- `src/render/history-page.js`: `colorNum(n, 'history-num-mini')` → `colorNum(n, 'history-num')` + 보너스도 동일.
- `styles/main.css`: `.history-num-mini` 룰 폐기. `.is-bonus` 셀렉터 `.history-num.is-bonus`로 이전. `.history-group-winning` 배경 골드 톤 적용. `.history-num-plus` 사이즈 조정.
- `docs/01_spec.md` 5.8.4: 그룹 헤더 명세 갱신.

**검증**: 316/316 PASS.

## 2.107. Sprint 093 완료 - cleanup 묶음 (S093, 2026-05-18)

배경: 사용자 명시 cleanup 묶음 진행 결정. 활성 sprint 잔여 항목 중 코드 무관 텍스트 정리 + dead 상수 폐기를 1 sprint에 묶음. 회귀 위험 0 영역. 묶음 = (A) BACKFILL_RECENT_COUNT dead 상수 폐기 + (B) 옛 탭명 코드/주석 sweep + (C) "전체 비우기" 옛 주석 sweep + (D) Sprint 078/079 archive 이전.

### 2.107.1. 정리 묶음 4건

| # | 항목 | 사유 | 영향 |
|---|---|---|---|
| A | `BACKFILL_RECENT_COUNT` 상수 제거 (`src/data/numbers.js`) | S090 폐기 후 dead 잔존 (코드 호출 0건 확인) | docs SSOT 정합. tests/suites/history.test.js export 부재 검증은 유지 (회귀 차단 의미) |
| B | 코드/주석 옛 탭명 sweep | S091 라벨 정정 "추첨/전적/역추첨" → "추천/기록/게임" 후 잔재 | icons.js + PROGRESS / PROGRESS_ARCHIVE는 사용자 명시 보존 예외 (아이콘 자체는 동일 / 역사 흔적) |
| C | CSS/JS 주석 "전체 비우기" sweep | S088 라벨 정정 "전체 비우기" → "전체 삭제" 후 잔재 | UI 표기는 이미 S088에서 SSOT 정합. 본 cleanup은 주석 동기만 |
| D | Sprint 078 + 079 archive 이전 | 룰 1.6 활성 9건(78~92 + 본 cleanup) → 7건 cap 정합 위해 2건 동시 이전 | archive 18차 정리. PROGRESS_ARCHIVE 끝에 2 절 append |

### 2.107.2. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/data/numbers.js` | `BACKFILL_RECENT_COUNT = 30` 상수 line 제거 + S093 주석 갱신 + `// S63 ... 추첨 탭` → `추천 탭` |
| `docs/02_data.md` | 1.16 표 dead 상수 줄 제거 + 1.16.1 / 1.5.4.6 본문 갱신 |
| `docs/01_spec.md` | 7.5 본문 "추첨 탭" → "추천 탭" + 상수 ref 갱신 |
| `docs/03_architecture.md` | 백캐스트 ref 갱신 (S093 dead 상수 제거 표기) |
| `src/render/main.js` | line 1/2 + 3개 핸들러 주석 옛 탭명 6건 sweep |
| `src/render/preset-buttons.js` | line 3 sweep |
| `src/render/reverse-page.js` | jsdoc "역추첨 탭" → "게임 탭" |
| `src/render/ritual-widget.js` | jsdoc "추첨 탭" → "추천 탭" |
| `src/render/settings-page.js` | 3건 sweep + 사용자 노출 hint 1건 ("추첨 탭의 프리셋" → "추천 탭의 프리셋") |
| `src/render/saved-sets-section.js` | 5건 sweep (옛 탭명 + 전체 비우기 4건) |
| `src/render/character-slots.js` | line 1 sweep |
| `src/render/icons.js` | "전체 비우기" → "전체 삭제" 1건만 sweep. "추첨 탭/전적 탭" 표기는 사용자 명시 보존 |
| `styles/main.css` | 옛 탭명 6건 + 전체 비우기 4건 = 10건 sweep |
| `service-worker.js` | v78 → v79 (전역 SW). 본 sprint 4건 묶음 본문 주석 |
| `PROGRESS_ARCHIVE.md` | 헤더 18차 정리 entry 추가 + 절 2.99 (Sprint 078) + 절 2.100 (Sprint 079) 본문 append |

### 2.107.3. 보존 예외 (사용자 명시)

- `src/render/icons.js` 안 jsdoc 주석 `/** 추첨 탭: 빛나는 별 */` + `/** 전적 탭: 시계 */`: 의미상 그대로 (아이콘은 동일).
- `docs/01_spec.md` 본문 "추첨 탭" 다수 표기: SSOT 정합 영역, 별도 후속 sprint로 sweep 권장 (본 cleanup 범위 외).
- `PROGRESS.md` / `PROGRESS_ARCHIVE.md`: sprint 본문 자체 = 역사 흔적 영역.

### 2.107.4. 검증

`node tests/run-node.js` → **316 / 316 PASS** (회귀 0). CSS/주석/dead 상수만 변경, 런타임 로직 무변동.

### 2.107.5. 사용자 화면 기대 변동

- 본 cleanup은 사용자 미노출 영역(코드 주석 + dead 상수 + archive 이동). UI 변동 0.
- 사용자 노출 1건: 설정 탭 프리셋 관리 섹션 hint "추첨 탭의 프리셋..." → "추천 탭의 프리셋..." (S091 라벨 정정 정합 회복).

### 2.107.6. Sprint 078 + 079 archive 강제 이전 (룰 1.6, 18차 정리)

본 sprint 추가로 활성 9건 도달 → 룰 1.6 cap 7건 초과 2건 → Sprint 078(절 2.99, 운세 3학설 출처 태그 색 명도 극대화) + Sprint 079(절 2.100, 출처 표시 모드 dot/label + 프리셋 색점) **동시 이전**. 본 sprint 종료 시점 활성 = 084 + 088 + 089 + 090 + 091 + 092 + 093 = **7건 정합**. archive 18차 정리 (옛 17차 사이클은 1건 단위였으나 본 cleanup은 활성 9건에서 2건 cap 정합 = 동시 이전).

### 2.107.7. 잔여 / 후속

- ~~`docs/01_spec.md` + `docs/02_data.md` 본문 "추첨 탭" 다수 표기 sweep~~ → S093-후속 (2.107.8)에서 흡수 완료.
- S088 메모 "PROGRESS_ARCHIVE의 옛 '전체 비우기' 표기는 역사 흔적으로 보존": 본 cleanup 영역 외 그대로 유지.
- icons.js 주석은 사용자 명시 보존 영역.

### 2.107.8. S093-후속 - docs SSOT 옛 탭명 sweep (2026-05-18)

배경: S093 본 cleanup이 코드/주석만 sweep + docs는 SSOT 정합 영역으로 별도 후속 권장으로 분리. 사용자 명시 B-1 진행 결정 → S091 라벨 정정("추첨/전적/역추첨" → "추천/기록/게임")이 docs SSOT까지 완전 정합 회복.

**변경 매핑**:

| 파일 | 변경 |
|---|---|
| `docs/01_spec.md` | 18건 sweep. "추첨 탭" 17건 → "추천 탭" + "전적 탭" 1건 → "기록 탭" (line 43). line 27 id mapping 정의는 `[추천 탭, id: home] (기본, S091 라벨 정정 옛 "추첨 탭")` 형태로 옛 이름 보존(이력 흔적) |
| `docs/02_data.md` | 4건 sweep. "추첨 탭" → "추천 탭" (1.5.5 / 1.5.5 본문 / 1.13 본문 / 3.2.3) |
| `service-worker.js` | v79 → v80 |

**보존 예외** (사용자 명시 / 의도된 흔적):
- `docs/01_spec.md` line 27: id mapping 정의에서 옛 이름 보존 (협업자 이력 reference).
- `src/render/icons.js` jsdoc: 사용자 명시 보존 (S093 본 cleanup에서 결정).
- `PROGRESS_ARCHIVE.md`: 역사 흔적.

**검증**: `node tests/run-node.js` → **316 / 316 PASS** (회귀 0). docs 본문만 변경, 런타임/UI 무변동.

**사용자 화면 기대 변동**: 0건 (docs는 협업자 reference 영역).

## 2.108. Sprint 094 완료 - 추천 row 라벨 시각 단축 + 모바일 4열 결손 fix (S094, 2026-05-18)

배경: 사용자 캡쳐 + 명시 "확정 버튼과 삭제 버튼이 붙어 있어서 UX가 안 좋다" + "영역이 부족한 것도 한 몫. 앞쪽 '추천1'에서 '추천'을 빼고 인덱스만 표시해서 영역을 확보". swipe-to-delete(C 옵션)는 분리 진행 결정 → S095. 본 sprint = 영역 확보 1단계.

### 2.108.1. 정정 묶음 2건

| # | 항목 | 사유 |
|---|---|---|
| A | 라벨 시각 단축 "추천N" → "N" | 사용자 명시. row 좌측 영역 확보. aria-label은 의미 보존 "추천N" (스크린리더 호환) |
| B | 모바일 break point 4열 정합 회복 | S090-후속 1 데스크톱만 4열로 갱신, 모바일 max-width 480/360 3열 잔재 결손 fix |

### 2.108.2. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/render/saved-sets-section.js` | `shortLabel = "${labelStart + i}"` 변수 신설 (시각용). 옛 `label = "추천${labelStart + i}"`은 aria-label/title용 보존. `.saved-set-idx` innerText만 shortLabel로 변경 |
| `styles/main.css` | desktop grid `44px 1fr auto var(--space-6)` → `28px 1fr auto var(--space-6)` (라벨 16px 회수). 480px↓ `40px 1fr var(--space-5)` (3열) → `var(--space-5) 1fr auto var(--space-5)` (4열 정합 + 라벨 축소). 360px↓ `var(--space-6) 1fr var(--space-5)` (3열) → `var(--space-5) 1fr auto var(--space-5)` (4열) |
| `docs/01_spec.md` | 5.2.1.2 레이아웃 명세(`[N 라벨] [번호공 6] [확정] [🗑]` + 새 grid 값) + 5.2.1.3 라벨 시각 단축 명시(aria 보존) + 5.2.1.4 사행성 회피 정합 (시각/aria 분리) |
| `service-worker.js` | v80 → v81 |

### 2.108.3. 시각 비교

**옛 (S094 이전)**:
```
[추천1] [15][20][23][26][31][32] [확정][🗑]
 56px        balls 1fr           auto  24px
```

**새 (S094)**:
```
[1]   [15][20][23][26][31][32]   [확정]  [🗑]
 28px       balls 1fr             auto   24px
↑ 28px 회수 (라벨 폭 절반)
```

### 2.108.4. 검증

`node tests/run-node.js` → **316 / 316 PASS** (회귀 0). 라벨 시각 단축 + grid column 조정. JS 로직/데이터 무변동.

**접근성 검증**:
- `.saved-set-idx aria-hidden="true"` 유지 = 시각만 노출.
- `.saved-set-row aria-label="${label}..."` = 의미 보존 "추천N".
- 확정/삭제 버튼 `aria-label`도 `label` 사용 = "추천N 확정" / "추천N 삭제" 의미 보존.
- 스크린리더 호환 = 변동 0.

### 2.108.5. 사용자 화면 기대 변동

- 추천 리스트 각 row 좌측 라벨 = "1" / "2" / ... 숫자만 표시.
- 골드 색 + 굵기는 유지 (시각 강조 보존).
- row 우측 [확정] [🗑] 사이 gap = 자연 확장 안 됨 (gap은 `var(--space-2)` 8px 그대로). swipe(S095)에서 정합 회복.
- 모바일 결손 자연 회복: 옛 480px↓에서 휴지통 추가 후 row wrap 잠재 결손이 4열 정합으로 해소.

### 2.108.6. Sprint 084 archive 강제 이전 (룰 1.6, 19차 정리)

본 sprint 추가로 활성 8건 도달 → 룰 1.6 cap 7건 초과 1건 → Sprint 084(절 2.101, 캐릭터 편집 기능 신설 + 후속 S85~S87 패턴 묶음) archive 이전. 본 sprint 종료 시점 활성 = 088 + 089 + 090 + 091 + 092 + 093 + 094 = **7건 정합**.

### 2.108.7. 잔여 / 후속

- ~~**S095 swipe-to-delete**~~: S094-후속 F+B+ 진행으로 1차 시도. 효과 미흡 시 S095 swipe 진행 결정.
- ~~휴지통 + 확정 사이 gap 확장(B 옵션)~~: S094-후속 (2.108.8)에서 흡수.
- 사용자 첫 인지 어휘 검증: "추천 리스트 (5)" 헤더가 컨텍스트 충분히 제공하는지 = 첫 진입 사용자 캡쳐 확인 영역.

### 2.108.8. S094-후속 F+B+ - [확정][🗑] 페어 시각 분리 (2026-05-19)

배경: S094 영역 확보 후 사용자 캡쳐 + 명시 "삭제 버튼이 여전히 확정 버튼과 나란히 있는데?". S094는 좌측 라벨 영역만 회수, 우측 [확정][🗑] 인접 본질 미해결. 옵션 비교 표 제시 후 사용자 결정 = **F+B+ (시각 분리 + gap 확장 + 휴지통 시각 약화)** 우선. swipe(C)는 본 옵션 효과 확인 후 별도 결정.

**결손 진단**: row grid 4열(`28px 1fr auto var(--space-6)`) + grid gap `var(--space-2)`(8px) = [확정][🗑] 시각 거리 8px만. fat finger 44px 표준 대비 부족.

**정정 묶음**:

| 항목 | 옛 | 새 |
|---|---|---|
| 휴지통 opacity | (없음, 항상 1) | **0.45 default** → focus/hover 시 1.0 (의도 강조) |
| 휴지통 margin-left | (없음, gap 8px만) | **var(--space-3)(12px)** = 총 거리 20px |
| 휴지통 hit area | 24x24 (var(--space-5)) | 보존 (접근성 유지) |
| 휴지통 transition | color 0.15s | color + opacity 0.15s |
| focus/active 동작 | 시각 변동 0 | **opacity 1.0** = 키보드 사용자도 의도 명확 인지 |

**시각 비교**:

```
옛 (S094):
[1]  [번호공 6]  [확정][🗑]
                   gap 8px (인접)

새 (S094-후속):
[1]  [번호공 6]  [확정]    [🗑]
                  primary  ghost(opacity 0.45)
                  ← 거리 20px (gap 8 + margin-left 12) →
```

**변경 파일**:

| 파일 | 변경 |
|---|---|
| `styles/main.css` | `.saved-set-remove` 룰 갱신: `margin-left: var(--space-3)` + `opacity: 0.45` + `transition: color 0.15s, opacity 0.15s`. focus / focus-visible / active 시 `opacity: 1`. hover 시 `color: --color-danger + opacity: 1` (옛 동작 흡수) |
| `docs/01_spec.md` | 5.2.1.2 레이아웃 명세에 F+B+ 옵션 3건 박힘 (opacity / margin / hit area 보존) |
| `service-worker.js` | v81 → v82 |

**접근성 검증**:
- hit area 24x24 보존 = 터치 표준(WCAG 2.5.5 target size, 44x44 권장이지만 24x24 minimum 인접 spacing 충족).
- 키보드 focus 시 opacity 1.0 = 의도 명확 인지.
- aria-label 의미 보존 (S094 분리 정합 그대로).

**검증**: `node tests/run-node.js` → **316 / 316 PASS** (회귀 0). CSS-only.

**사용자 화면 기대 변동**:
- 추천 리스트 각 row 우측: [확정] primary 진하게 + 12px 여백 + [🗑] 옅은 회색. 확정 row(취소 표기)에서도 동일 약화.
- 데스크톱 hover 시 휴지통 진하게 + danger 색.
- 모바일 fat finger 오터치 = 거리 + 시각 약화로 자연 감소 (정량은 사용자 캡쳐 후 평가).

**S095 swipe 진행 판정 데이터**: 본 후속 commit + 캐시 갱신 후 사용자 캡쳐 + 실 사용 평가. 효과 미흡 시 swipe 진행. → **S095에서 swipe 폐기 + 본질 frame 전환 결정** (사용자 비판 후, 2.109 참조).

## 2.109. Sprint 095 완료 - row 휴지통 폐기 + "확정" 토글 아이콘 (S095, 2026-05-19, 본질 frame 전환)

배경: S094-후속 F+B+ 적용 후 사용자 캡쳐 + 강한 비판 "공간이 없는데 왜 계속 낑겨 넣을려고 해?" + "UX 개판인데?". 자비스가 옛 frame("한 row에 액션 2개 인접 배치") 안에서 margin/opacity/swipe 변형만 반복 = 본질 회피 확정. 사용자 결정 = **"휴지통 삭제 + 확정 토글 아이콘으로 변경"**. row 안 액션 1개로 단순화.

### 2.109.1. 본질 진단 (자비스 결손 자인)

| 결손 | 본문 |
|---|---|
| frame 자체 결손 | "한 row에 라벨 + 번호공 6 + 액션 2"는 모바일 360-414px에서 공간 부족 자연 |
| 자비스 반복 미봉책 | margin 12px / opacity 0.45 / swipe 모두 같은 frame 안 변형 |
| 사용자 명시 본질 | 행에 액션 2개를 같이 두는 자체가 잘못된 frame. **하나만 남기거나 다른 단계에 호출** |

### 2.109.2. 결정 매핑

| 영역 | 옛 (S094-후속) | 새 (S095) |
|---|---|---|
| row 우측 액션 | `[확정 텍스트][🗑]` 2 버튼 | **토글 아이콘 1개만** |
| 단일 row 삭제 | 휴지통 버튼 | **폐기** (전체 삭제 또는 + 1세트/+ 5세트 재시도로 흡수) |
| 미확정 시각 | "확정" 텍스트 (border) | **빈 원** (외곽선만, currentColor stroke) |
| 확정 시각 | "취소" 텍스트 (accent fill) | **채워진 원 + ✓** (accent fill + 흰색 체크) |
| row grid | 4열 `28px 1fr auto var(--space-6)` | **3열 `28px 1fr var(--space-6)`** |
| aria | aria-label만 | aria-label + **aria-pressed** (토글 상태 명시) |

### 2.109.3. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/render/icons.js` | **circleOutline** + **circleCheck** 함수 신설. 빈 원 / 채워진 원 + ✓ SVG |
| `src/render/saved-sets-section.js` | 텍스트 버튼 → 토글 아이콘 (`circleOutline` / `circleCheck`). aria-pressed 추가. 휴지통 button HTML 폐기. trash import 보존 (전체 삭제 영역 사용 잔존) |
| `src/render/main.js` | `data-action="remove-saved-set"` 핸들러 폐기 (dead). `removeSavedSetAt` import 폐기 (core 함수 자체는 보존) |
| `styles/main.css` | `.saved-set-register` 룰 전면 갱신 (텍스트 버튼 → 24x24 toggle hit area + 22x22 SVG). `.saved-set-remove` 룰 dead 표기. row grid 4열 → 3열 (desktop + 480px↓ + 360px↓ 동시) |
| `docs/01_spec.md` | 5.2.1.2 레이아웃 (3열 명세) + 5.2.5.9 메커니즘 (토글 아이콘 + 휴지통 폐기) + ASCII 시안 갱신 |
| `service-worker.js` | v82 → v83 |

### 2.109.4. 시각 비교

```
옛 (S094-후속):
[1]  [15 20 23 26 31 32]  [확정]    [🗑]
                          primary   ghost·12px gap·opacity 0.45
                          ↑ row 안 액션 2개 (공간 부족 본질)

새 (S095):
[1]  [15 20 23 26 31 32]            ◯
                                    토글 (미확정 = 빈 원)
또는
[1]  [7 13 14 22 40 45]             ●
                                    토글 (확정 = 채워진 원 + ✓)
```

### 2.109.5. 접근성 보장

- `aria-label` = "추천N 확정" / "추천N 확정 취소" 의미 보존.
- `aria-pressed` = true/false 토글 상태 명시 (스크린리더 표준).
- hit area 24x24 보존 + focus-visible outline (키보드 사용자 정합).
- 키보드 Enter/Space로 토글 가능 (button 기본 동작).

### 2.109.6. 검증

`node tests/run-node.js` → **316 / 316 PASS** (회귀 0).
- `removeSavedSetAt` 코어 함수 + saved-sets.test.js 보존 (미래 진입점 가능성). UI 진입점만 폐기.
- toggleSavedSetRegistration 동작 단위 테스트 그대로 PASS.

### 2.109.7. 사용자 화면 기대 변동

- 추천 리스트 각 row 우측: **토글 아이콘 1개만** (텍스트 없음).
  - 미확정 row: 빈 원 ◯ (회색 stroke).
  - 확정 row: 채워진 원 + 흰 체크 ● (accent 색 fill).
- 단일 row 삭제: 옛 휴지통 동선 폐기. 마음에 안 들면 (a) 확정 안 누름, (b) "전체 삭제" 후 재시도, (c) + 1세트 / + 5세트로 추가 후 선택.
- row 자체 padding / margin 정합 (확정 row 좌측 12px 확장 그대로).
- 모바일 320~480px 동일 패턴, 토글 아이콘 hit area 정합 보존.

### 2.109.8. Sprint 088 archive 강제 이전 (룰 1.6, 20차 정리)

본 sprint 추가로 활성 8건 도달 → 룰 1.6 cap 7건 초과 1건 → Sprint 088(절 2.102, 라벨 정정 + 크롬 모바일 viewport 동기 + S088 후속 sourceDisplayMode 'off' 묶음) archive 이전. 본 sprint 종료 시점 활성 = 089 + 090 + 091 + 092 + 093 + 094 + 095 = **7건 정합**.

### 2.109.9. 잔여 / 후속

- `.saved-set-remove` CSS 룰 dead 잔존 = 미래 cleanup sprint 영역.
- `removeSavedSetAt` core 함수 + 단위 테스트 보존 = 미래 다른 진입점(예: row 길게 누르기 모달) 도입 시 재활용 영역.
- 토글 아이콘 hit area 24x24 = 모바일 fat finger 표준 44x44보다 작음. 사용자 캡쳐 후 실 사용 평가. 필요 시 확장(예: row 외 클릭 영역 24x24 → 32x32) 검토.
- 빈 원 vs 채워진 원 색 명도 차이 = 사용자 인지 정합 검증 영역 (캡쳐 후).

### 2.109.10. 자비스 자기 점검 (14건째 결손)

옛 frame ("한 row에 액션 2개") 안에서 변형만 반복 = 본질 회피 패턴. 사용자 비판 "낑겨 넣을려고 해" 정확. 향후 룰:
- 공간 부족 문제 보고 시 **첫 단계 = frame 자체 재검토** (옵션 폐기 / 단계 분리). margin/opacity/gap 같은 변형은 frame 정합 후 미세 조정 단계.
- 옵션 비교 표 제시 = 사용자에게 결정 떠넘기는 패턴 회피. 베테랑 기획자 답습 = 본질 진단 후 권장안 명확 제시.

### 2.109.11. S095-후속 - 체크박스 디자인 정합 + row 좌우 마진 동일 + 헤더 중앙 정렬 (2026-05-19)

배경: 사용자 명시 3건. (1) "체크박스 다른 디자인으로 바꿔줘". (2) "인덱스/추천번호/체크박스 배치에서 추천번호가 중앙, 좌측 인덱스와 우측 체크박스 마진 영역 동일 유지". (3) "체크했을 때 '추천 리스트 (n)' 제목 정렬 방식이 바뀌는데 그대로 중앙정렬 유지".

**정정 묶음 3건**:

| # | 항목 | 옛 | 새 |
|---|---|---|---|
| A | 체크박스 디자인 | 빈 원 (○) / 채워진 원 + ✓ (●) | **빈 라운딩 사각 (□) / 채워진 사각 + 흰 ✓ (☑)** - 표준 list UX |
| B | row grid 좌우 마진 | `28px 1fr var(--space-6)` (28/24 비대칭) | **`var(--space-6) 1fr var(--space-6)`** (24/24 대칭). 모바일 break point도 통일 |
| C | 헤더 정렬 | flex `justify-content: center` + 카운터 `margin-left: auto` = 카운터 노출 시 title 좌측 밀림 | **grid 3열** (1fr / auto / 1fr). title `grid-column: 2 + justify-self: center`. 카운터 `grid-column: 3 + justify-self: end`. 카운터 노출 무관 title 항상 가운데 |

**변경 파일**:

| 파일 | 변경 |
|---|---|
| `src/render/icons.js` | `circleOutline` / `circleCheck` 폐기 → **`checkboxOutline` / `checkboxChecked`** 신설. 라운딩 사각(rx=4) + 흰 ✓ |
| `src/render/saved-sets-section.js` | import 교체 + 호출명 교체 (circle → checkbox) |
| `styles/main.css` | (1) `.saved-set-row` grid 좌우 동일 var(--space-6). 480px↓ + 360px↓ 모두 통일 (토글 hit area 24x24 보장). (2) `.saved-sets-header` flex → grid 3열. `.saved-sets-title` grid-column 2. `.saved-sets-register-counter` grid-column 3 + margin-left auto 폐기 |
| `docs/01_spec.md` | 5.2.1.2 레이아웃 (대칭 마진 + 체크박스) + 5.2.5.9 메커니즘 (체크박스 표기) + ASCII 시안 갱신 |
| `service-worker.js` | v83 → v84 |

**시각 비교**:

```
옛 (S095):
  1  [번호공 6]              ●
  ↑ 라벨 28px       ↑ 토글 24px (비대칭)
  추천 리스트 (5)         확정 N건
  ↑ 카운터 노출 시 좌측 밀림

새 (S095-후속):
       1  [번호공 6]       ☑
       ↑ 24px        ↑ 24px (대칭, 번호공 시각 중앙)
        추천 리스트 (5)      확정 N건
        ↑ 항상 가운데 (grid 3열)
```

**검증**: `node tests/run-node.js` → **316 / 316 PASS** (회귀 0). CSS/아이콘 변경, 런타임 로직 무변동.

**접근성 보장**:
- 라운딩 사각 + 흰 ✓ = 대비 명확 (WCAG AA 충족).
- aria-pressed 상태 유지 (S095 정합).
- hit area 24x24 보존 (모바일 break point 전부).

**사용자 화면 기대 변동**:
- 추천 리스트 row 좌우 시각 균형 (라벨/체크박스 동일 폭 24px).
- 번호공 6개가 행 정중앙.
- 체크박스: 미확정 = 회색 외곽선 사각, 확정 = 골드 fill 사각 + 흰 체크.
- 헤더 = 카운터 0건이든 N건이든 title "추천 리스트 (N)" 항상 가운데.

### 2.109.12. S095-후속 2 - "전체 삭제" → "모두 비우기" 라벨 + 위치 헤더 이동 + 모달 카피 강화 (2026-05-19)

배경: 사용자 결손 보고 "체크 선택하고 '전체 삭제'를 누르면 왠지 체크박스가 삭제될 것 같은 잘못된 UX가 느껴짐". 본질 진단 = 체크박스 도입 후 사용자 멘탈 모델이 **"멀티 셀렉트 list = 선택 액션이 자연"**으로 형성. "전체 삭제" 어휘 + 액션바 위치 ([+ 1세트][+ 5세트][전체 삭제] 같은 시각 그룹)가 "체크된 것만 영향"으로 오인 송출. 본질 frame = "리스트 정리" 액션이 "추가 액션" 그룹과 시각/어휘 미분리.

**정정 묶음 A+B+C** (사용자 결정):

| # | 항목 | 옛 | 새 |
|---|---|---|---|
| A | 라벨 명확화 | "전체 삭제" (모호: 전체 = 리스트 전체? 선택 전체?) | **"모두 비우기"** (동사 명확) + aria-label에 동적 카운트 |
| B | 위치 분리 | 액션바 우측 끝 (+ 버튼과 같은 그룹) | **헤더 우측** (카운터 옆). 작은 ghost 버튼 (opacity 0.7, border 없음) |
| C | 모달 카피 강화 | `저장된 N세트가 모두 삭제됩니다. 진행할까요?` (대상 모호) | 확정 없을 때: `추천 리스트 N개가 모두 비워집니다. 진행할까요?` / 확정 있을 때: `추천 리스트 N개가 모두 비워집니다 (확정 M개 포함, 전적에서도 함께 제거됩니다). 진행할까요?` |
| 부수 | 확정 history 정합 | 옛 = saved-sets만 삭제, 확정 history는 잔존 → 모달 카피와 실 동작 미스매치 | **확정 history(현재 회차 source=user)도 함께 제거**. 사용자 명시 "확정 함께 취소" 일관 |

**변경 파일**:

| 파일 | 변경 |
|---|---|
| `src/render/saved-sets-section.js` | 헤더에 `.saved-sets-header-right` wrapper 신설 (카운터 + 모두 비우기 묶음). 액션바 `savedSetsAddBarHtml`에서 .saved-add-actions / .saved-sets-clear 폐기. 빈 리스트 시 모두 비우기 버튼 자체 미출력 |
| `src/render/main.js` | clear-saved-sets 핸들러 갱신: 확정 N개 분기 + 모달 카피 강화 + 확정 항목 history 함께 filter 제거 |
| `styles/main.css` | `.saved-sets-header` gap 추가. `.saved-sets-header-right` wrapper 룰 신설 (flex + gap). `.saved-sets-register-counter` grid-column 제거 (wrapper 안으로 이동). `.saved-sets-clear` 룰 갱신 (작은 ghost: padding 작게, font 0.78rem, opacity 0.7, border 없음, hover/focus 시 danger 톤 + 배경 옅게). `.saved-sets-clear .icon` 14x14. `.saved-add-bar` grid 3열 → flex column. 모바일 `.saved-add-actions` grid-column 룰 폐기 |
| `docs/01_spec.md` | 5.2.5.2 UI 다이어그램 갱신 (헤더 우측 표기 + 액션바 단순화) + 시각 설명 갱신 |
| `service-worker.js` | v84 → v85 |

**시각 비교**:

```
옛 (S095-후속):
┌────────────────────────────────┐
│  추천 리스트 (N)    확정 N건    │
├────────────────────────────────┤
│  ... row 5개 ...                │
├────────────────────────────────┤
│  [+1세트] [+5세트]  [🗑 전체 삭제]│  ← 3 액션 시각 그룹 = 선택 액션 오인
└────────────────────────────────┘

새 (S095-후속 2):
┌────────────────────────────────┐
│  추천 리스트 (N)  확정 N건 🗑모두│  ← 정리 액션 = 헤더 (작은 ghost)
├────────────────────────────────┤
│  ... row 5개 ...                │
├────────────────────────────────┤
│        [+1세트] [+5세트]         │  ← 추가 액션만 그룹
└────────────────────────────────┘
```

**confirm 카피 분기**:
- 확정 0개: `추천 리스트 5개가 모두 비워집니다. 진행할까요?`
- 확정 N개: `추천 리스트 5개가 모두 비워집니다 (확정 2개 포함, 전적에서도 함께 제거됩니다). 진행할까요?`

**검증**: `node tests/run-node.js` → **316 / 316 PASS** (회귀 0). UI/카피/history filter 변경, core 함수 무변동.

**사용자 화면 기대 변동**:
- 액션바: [+ 1세트] [+ 5세트] 2 버튼만 가운데. 시각 단순화.
- 헤더 우측: 카운터 옆에 작은 "🗑 모두 비우기" 버튼 (회색 옅게).
- 확정 후 "모두 비우기" 클릭 시 모달 = 확정 N개 포함 명시 + 진행 시 전적도 정리.
- 빈 리스트 = 모두 비우기 버튼 자체 미노출.

**자비스 자기 점검 (15건째 결손)**:
- 체크박스(S095) 도입 시 "선택 액션 멘탈 모델" 자연 발생 인지 못 함. 옛 "전체 삭제" 라벨/위치가 새 frame에서 모호 신호 송출.
- 향후 룰: list UI 패턴 변경 시 동반 액션의 시각 그룹 / 어휘 정합 점검 의무. 체크박스 = "선택" 메타포 → "선택 액션 vs 전체 액션" 분리 자명.

## 2.110. Sprint 096 완료 - 기록 탭 "등수별 분포" 섹션 폐기 (S096, 2026-05-19)

배경: 사용자 질문 "기록에서 등수별 분포는 뭐지?" → 본질 진단 후 사용자 결정 = 폐기 (A 옵션).

### 2.110.1. 폐기 사유

| 측면 | 진단 |
|---|---|
| 데이터 의미 | 6/45 확률 (1등 1/8.1M / 5등 1/45) → 사용자 N회 누적으로 분포 형성 어려움. 1년 260게임 = 5등 평균 5.8회 / 1등 0회 근접 |
| summary 중복 | 상단 summary "적중 (3-5등) N건" + "최고 등수"가 이미 같은 정보 노출. 막대 차트는 시각 중복 |
| 사행성 회피 | CLAUDE.md 6.3 - 등수 분포 강조가 "내 캐릭터 N등 자주 나옴" 인지 = 캐릭터 선택 사행성 자극 가능. 면책 카피("미래 적중률 보장 X")로 보완하나 시각 막대 자체가 강한 신호 |
| 노이즈 | 데이터 부족 시 모두 0 = 빈 막대 5개 시각 노이즈 |

### 2.110.2. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/render/history-page.js` | rankChartHtml 정의 + 호출 폐기. RANK_MISS_COLOR import 폐기 (colors.js 상수 자체는 dead 잔존). horizontalBarsHtml import 폐기 (stats-page.js에서는 잔존 사용). rankItems 산출 로직 폐기 |
| `docs/01_spec.md` | 5.8.2 "등수별 분포 차트" 절을 폐기 표기로 갱신. 폐기 사유 4건 박힘 |
| `service-worker.js` | v85 → v86 |

### 2.110.3. 잔존 정보 (기록 탭 유지 영역)

- **누적 요약 그리드 (5.8.1)**: 총 추천 / 발표 완료 / 적중 / 적중률 / 최고 등수.
- **현재 회차 발표 대기 섹션 (5.8.1-A)**: 사용자 확정 직후 실시간 노출.
- **최근 30회 타임라인 (5.8.3)**: 도트 30개 + 범례. 시간 흐름 인지.
- **옛 회차 그룹 이력 (5.8.4)**: 회차별 그룹 + 추천 row + 등수 라벨.

폐기 후 정보 손실 0 (모두 다른 위치에 표시됨).

### 2.110.4. 검증

`node tests/run-node.js` → **316 / 316 PASS** (회귀 0). UI 섹션만 폐기, 로직/데이터 무변동.

### 2.110.5. 사용자 화면 기대 변동

- 기록 탭 진입 시 "등수별 분포" 섹션 + 막대 5개 + 면책 카피 사라짐.
- summary → 발표 대기 → 타임라인 → 옛 회차 그룹 순으로 자연 흐름.
- 빈 막대 노이즈 0.

### 2.110.6. Sprint 089 archive 강제 이전 (룰 1.6, 21차 정리)

본 sprint 추가로 활성 8건 도달 → 룰 1.6 cap 7건 초과 1건 → Sprint 089(절 2.103, Luck 자산 전면 폐기 + 후속 S089 라벨 변경) archive 이전. 본 sprint 종료 시점 활성 = 090 + 091 + 092 + 093 + 094 + 095 + 096 = **7건 정합**.

### 2.110.7. 잔여 / 후속

- `src/data/colors.js` `RANK_MISS_COLOR` 상수 = dead 잔존. cleanup 후순위.
- `src/render/charts.js` `horizontalBarsHtml` = stats-page.js에서 잔존 사용 (번호 빈도 / 보너스 빈도 / Top pair / Cold). 폐기 X.
- 옛 면책 카피 "참고용. 매 회차 독립 시행이므로 누적 분포가 미래 적중률을 보장하지 않습니다." = 본 sprint에서 함께 폐기. 사행성 회피 룰은 캐릭터 카드 intro + 첫 진입 모달 + 설정 탭 면책으로 일원화 (옛부터 정합).

### 2.110.8. 자비스 자기 점검 (16건째 결손)

옛 S3-T2(2026-05-01 초기)에 등수별 분포 차트 도입 시 = 6/45 확률 + 사용자 누적 회수 분석 미실시. **"있으면 좋은 정보"라는 직관으로 추가 = 사행성 회피 룰의 의미 약화**. 향후 룰:
- 데이터 시각화 추가 시 = 데이터 의미 형성 회수 점검 (확률 분포 + 예상 누적 N회) + summary 중복 점검 + 사행성 회피 룰 정합 점검.
- "있으면 좋아" 직관 추가 회피. 본질 = 사용자 결정에 도움되는 정보만 노출.

## 2.111. Sprint 097 완료 - 기록 탭 reveal 게임화 (S097, 2026-05-19)

배경: 사용자 명시 4건 묶음:
1. "기록 현재 회차에도 당첨번호 영역 표시하고 7개 구슬을 모두 물음 표 처리".
2. "발표가 나오면 당첨 번호를 표시하고 내가 구매한 번호는 색을 반투명하게 변경하고, 숫자를 하이드".
3. "오른쪽에 체크 버튼을 표시하고 체크 버튼을 누르면 왼쪽 구슬부터 하나씩 맞춰나가".
4. "맞았으면 확대 바운스 이펙트와 함께 하이라이트 표시".

### 2.111.1. 본질 - reveal 게임화

옛 흐름 = 발표 → 자동 매칭 → 즉시 등수 표시 (수동성). 새 흐름 = 발표 후에도 row가 마스킹 상태 유지 + 사용자가 체크 클릭 → 순차 reveal → 일치 ball 바운스 (능동성 + 재미). 결과 확인 자체를 미니 게임화. 사행성 회피 룰 정합 (확률 향상/필승 X, 결과 확인 UX만 강화).

### 2.111.2. 데이터 모델

| 필드 | 의미 | 기본값 / 마이그레이션 |
|---|---|---|
| `history[].revealed` (신규) | 사용자가 reveal 트리거 했는가 | 신규 등록 = false. 옛 데이터 (S097 이전) = storage load 시 true 자동 마이그레이션 (이미 매칭/노출된 상태로 간주) |

### 2.111.3. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/core/history.js` | **`revealRecommendation(character, drwNo, key)`** 신설 (idempotent, 동일 객체 반환 분기). `toggleSavedSetRegistration` 신규 entry에 `revealed: false` 필드 추가 |
| `src/data/storage.js` | `normalizeCharacter` history 마이그레이션 - `revealed` 부재 항목은 true 자동 (옛 데이터 = 이미 reveal 완료로 간주) |
| `src/render/history-page.js` | `pendingBallHtml()` 신설 (? 7개 ball). pendingHtml에 당첨번호 row 추가. `historyGroupRowHtml`에 revealed 분기 - hasDraw && revealed=false 시 ball 마스킹(`.is-masked`) + 우측 체크 버튼 노출. 옛 동작은 그대로 (revealed=true 또는 발표 대기). 발표 대기 row는 발표 대기용으로 그룹 헤더 + 본문 통합 패턴 채택 |
| `src/render/main.js` | `revealRecommendation` import. 기록 탭 렌더 후크에 `data-action="reveal-row"` 핸들러 - 좌측부터 ball 0.32s 간격 setTimeout chain reveal. 일치 ball은 `.is-bounced + .is-matched` 클래스 추가. 마지막 ball + 0.7s 후 `revealRecommendation` 호출 + renderApp |
| `styles/main.css` | `.history-num.is-pending` 룰 신설 (점선 외곽선 + ? 노출). `.history-group-row.is-masked .history-num.is-masked` (opacity 0.5 + color transparent + grayscale). reveal 후 `.is-revealed` 클래스 → `@keyframes history-ball-reveal` (scale 0.85→1.05→1). `.is-matched.is-bounced` → `@keyframes history-ball-match-bounce` (scale 0.85→1.35→0.95→1.15→1.05) + 골드 box-shadow. `.history-row-reveal` ghost 버튼 (accent border, hover 시 fill) |
| `docs/01_spec.md` | 5.8.1-A에 S097 명세 추가 (당첨 row ? 7개 + 옛 회차 reveal 게임화) |
| `docs/02_data.md` | 3.7 Recommendation schema + 본문에 `revealed: boolean` 필드 명시 |
| `tests/suites/history.test.js` | revealRecommendation 4건 신설 (entry 기본 false / true 갱신 / idempotent / 미매칭 무변동) |
| `service-worker.js` | v86 → v87 |

### 2.111.4. 사용자 흐름 (시뮬레이션)

1. **확정 직후 (현재 회차)**:
   - 기록 탭 진입 → "현재 회차 1225회 · 발표 대기 N건" 섹션.
   - 그룹 헤더 = `?` 7개 (본 6 + 보너스 1 = is-pending) + "당첨" 라벨.
   - 본문 = 사용자 확정 row들 (번호 노출, 라벨 "미발표").

2. **추첨 발표 후 (자동 매칭 완료, 사용자가 기록 탭 처음 진입)**:
   - 옛 회차 그룹 헤더 = 당첨번호 6+1 노출.
   - 본문 row들 = 모두 마스킹 상태 (반투명 + ? 노출 + 우측 "확인" 버튼).

3. **체크 클릭**:
   - row에 `.is-revealing` 클래스 + 버튼 disabled.
   - 좌측부터 ball 0.32s 간격 reveal (각 ball에 숫자 + 색 복귀 + pop 애니메이션).
   - 일치 ball은 reveal 시점에 동시에 bounce (확대 1.35 → 1.05) + 골드 box-shadow.

4. **모든 ball reveal 완료 (약 1.9 + 0.7 = 2.6초 후)**:
   - `revealRecommendation` 호출 → `history[].revealed = true` 저장.
   - renderApp 자연 호출 → 옛 동작 회귀 (등수 라벨 / dim / highlight).

### 2.111.5. 검증

`node tests/run-node.js` → **320 / 320 PASS** (316 → 320, revealRecommendation 4건 추가).

신규 단언:
- toggleSavedSetRegistration entry는 revealed: false 자동.
- revealRecommendation: 매칭 항목 true 갱신 + 새 객체 반환.
- idempotent: 이미 true면 동일 객체 (no-op).
- 미매칭 key는 동일 객체.

### 2.111.6. 사용자 화면 기대 변동

- **발표 대기**: "당첨" row에 ? 7개 (본 6 + 점선 보너스 1). 옛 추천 row는 그대로 (번호 노출).
- **발표 직후 옛 회차 그룹**: 추천 row가 마스킹 (반투명 + ? + "확인" 버튼).
- **체크 클릭 ~ 2.6초**: 좌측부터 ball 순차 reveal. 일치 ball은 강한 bounce + 골드 하이라이트.
- **reveal 완료 후**: 옛 동작 (등수 라벨 / 미일치 dim / 일치 highlight). 다음 진입부터 즉시 표시.
- **옛 데이터 (S097 이전 등록)**: storage 마이그레이션으로 자동 revealed=true → 옛 동작 유지 (영향 0).

### 2.111.7. Sprint 090 archive 강제 이전 (룰 1.6, 22차 정리)

본 sprint 추가로 활성 8건 도달 → 룰 1.6 cap 7건 초과 1건 → Sprint 090(절 2.104, 백캐스트 + 자동 history 등록 폐기 + "내 번호로 선택" 진입점 + 후속 12건) archive 이전. 본문 토큰 부담으로 archive에서 압축 표기 (큰 sprint). 본 sprint 종료 시점 활성 = 091 + 092 + 093 + 094 + 095 + 096 + 097 = **7건 정합**.

### 2.111.8. 잔여 / 후속

- 다음 추첨 발표 (2026-05-23 토 1226회) 시 본 sprint 효과 실 검증. 옛 사용자 데이터는 revealed=true 자동이라 변동 0. 사용자 현재 회차(1225회) 확정 5건이 발표 후 모두 마스킹 상태로 전환 → 사용자 체크 트리거 가능.
- reveal 시간 = 0.32s × 6 + 0.7s = 약 2.6초. 사용자 캡쳐 후 속도 조정 가능 (REVEAL_STEP_MS 상수).
- 모달 confirm 강화 - reveal 직전 확인 모달은 불요 판단 (체크 버튼 자체가 충분한 의도 표명).

### 2.111.9. 자비스 자기 점검 (17건째 결손 없음, 본 sprint = 사용자 명시 4건 정직 답습)

본 sprint = 사용자 명시 흐름을 frame 변경 없이 그대로 구현. 자비스 자율 결정 영역 = 데이터 모델 (`revealed` 필드 자연 도출) + reveal step interval (0.32s) + bounce keyframe (5단 scale) + 마이그레이션 (옛 데이터 true 자동). 모두 사용자 의도 답습 + 정합 패턴. 14건째/15건째/16건째 결손 룰 답습 정합.

### 2.111.10. S097-후속 - ? ball 원형 정합 + 미발표 dim 폐기 + 7일 자동 노출 윈도우 (2026-05-19)

배경: 사용자 캡쳐 + 명시 3건 묶음.
1. "가려진 당첨 번호가 구슬과 동일한 형태, 물음표도 중앙에 숫자보다 살짝 크게".
2. "미발표의 구슬은 반투명 적용 안함".
3. "복권 추첨하고 일주일간 가려진 채로 유지, 일주일이 지나면 현재의 옛 회차 이력과 동일하게 오픈".

### 2.111.10.1. 결손 진단

| # | 결손 | 원인 |
|---|---|---|
| 1 | ? ball이 사각형 점선 박스 | pendingBallHtml 클래스에 `num` 누락 → .num 본체 룰(원형 50% radius / flex 가운데) 미적용. .history-num만 적용되어 변태 형태 |
| 2 | 미발표 row가 6 ball 전부 반투명 | `.history-group-row-nums .num:not(.is-matched)` dim 룰이 모든 row에 일괄 적용. 미발표 row는 매칭 데이터 자체 없으므로 dim 의미 0 |
| 3 | 마스킹 무한 지속 | isMasked = hasDraw && !revealed만 판정. 시간 윈도우 부재 = 사용자가 reveal 안 하면 영구 가려짐 |

### 2.111.10.2. 정정 묶음 3건

| # | 영역 | 변경 |
|---|---|---|
| 1 | `src/render/history-page.js` `pendingBallHtml` | 클래스 `history-num is-pending` → **`num history-num is-pending`** (.num 본체 룰 자연 상속) |
| 1 | `styles/main.css` `.history-num.is-pending` | background transparent / font-size var(--font-size-md) (숫자 sm보다 살짝 큼) / font-weight 700 / border 1px dashed / **box-sizing border-box** (32x32 유지). border-radius는 .num에서 50% 상속 |
| 1 | `.is-pending.is-bonus` | 별도 outline 폐기 (가려진 상태에선 본/보너스 시각 구분 무의미) |
| 2 | `src/render/history-page.js` `historyGroupRowHtml` | hasDraw=false row에 `.is-unsettled` 클래스 추가 |
| 2 | `styles/main.css` | `.history-group-row.is-unsettled .num` = opacity 1 + filter none (dim 룰 override) |
| 3 | `src/render/history-page.js` `historyGroupRowHtml` | 7일 윈도우 판정 추가. `isWithinSettleWindow = Date.now() - new Date(draw.drwDate).getTime() < 7d`. isMasked 조건에 결합 |

### 2.111.10.3. 7일 윈도우 흐름

```
추첨일 (2026-05-23 토) ──── 7일 ──── 다음 추첨일 (2026-05-30 토)
   ↑                                       ↑
hasDraw=true 시작            윈도우 종료, 자동 노출
revealed=false면 마스킹       isMasked = false 자동
체크 버튼 노출                옛 동작 회귀 (등수 라벨)
```

사용자가 1주일 동안 reveal 안 해도 다음 추첨 시점에 자연 정리. 일관된 옛 회차 이력 화면으로 회귀.

### 2.111.10.4. 검증

`node tests/run-node.js` → **320 / 320 PASS** (회귀 0). UI/CSS/시간 판정 변경, 데이터 모델 무변동.

[의견] 시간 판정 단위 테스트는 본 sprint 범위 외 - Date.now() mock 필요. 미래 cleanup 영역. 7일 윈도우는 실 사용자 시점 검증 영역 (2026-05-23 추첨 후 캡쳐).

### 2.111.10.5. 사용자 화면 기대 변동

- **? ball (현재 회차 발표 대기)**: 원형 32x32 + 점선 dashed + ? 가운데 (숫자 14 → ? 16, 살짝 큼). 다른 구슬과 동일 형태.
- **미발표 row** (현재 회차 + 일주일 지난 draws 부재 옛 회차): 자기 번호 또렷이 노출 (반투명 X).
- **2026-05-23 ~ 2026-05-30 1225회 row**: 마스킹 + 체크 버튼.
- **2026-05-30 이후 1225회 row**: 자동 노출 (체크 트리거 무관).

