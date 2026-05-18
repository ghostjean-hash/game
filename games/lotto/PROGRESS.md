# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-18 (Sprint 093 cleanup - BACKFILL_RECENT_COUNT dead 상수 폐기 + 옛 탭명 코드/주석 sweep + "전체 비우기" 주석 sweep + Sprint 078/079 archive 이전).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리**: 1차 2026-05-04 (Sprint 010 이전 ~ 031 + 옛 백로그 3.-18 ~ 3.0 archive 이전). 2차 2026-05-08 (Sprint 032~039 추가 archive 이전). 3차 2026-05-10 (Sprint 040~059 추가 archive 이전). 4차 2026-05-16 (Sprint 060~064 추가 archive 이전). 5차~8차 2026-05-16 (Sprint 065~068 각각 강제 이전). 9~16차 2026-05-17 (Sprint 069~076 각각 강제 이전). 17차 2026-05-18 (Sprint 077 강제 이전). 18차 2026-05-18 (Sprint 078/079 2건 동시 강제 이전 = cleanup 묶음 Sprint 093 추가로 활성 9 → 룰 1.6 2건 cap 정합). 직전 5 Sprint + 본 sprint(들)만 본 파일에 활성. `PROGRESS_ARCHIVE.md` 참조.
1.6. **PROGRESS.md 길이 정책 (S72, 2026-05-16 룰화)**: 활성 sprint 절 **최대 7건**(직전 5 + 본 sprint 묶음). 8건 초과 시 가장 옛 sprint 1건을 `PROGRESS_ARCHIVE.md` 강제 이전. archive는 무제한. 자연 약 350~500줄 유지.

# 2. 완료 마일스톤 (활성: 직전 5 Sprint + 본 sprint)

> 이전 Sprint 이력(2.1 ~ 2.98, M0~M6 / 폴리싱 / Sprint 010~077) → `PROGRESS_ARCHIVE.md` 참조.

## 2.104. Sprint 090 완료 - 백캐스트 + 자동 history 등록 폐기, "내 번호로 선택" 진입점 (S090, 2026-05-17)

배경: 사용자 명시 3건 연속.
1. "전적이 테스트용이야? 실제 동작하는게 아니야?" → 백캐스트(가짜 30회 채움) 정직성 의문 제기.
2. "진짜를 돌리고 싶어. 어떻게 해야 해?" → 진짜 사용자 행동만 누적 의향.
3. "추천했다고 무조건 등록되면 안 되고, 내가 추천 번호를 직접 선택해야 한다" → 자동 등록 폐기 + 명시 선택 메커니즘.

### 2.104.1. 핵심 결정

| 결정 | 값 | 사유 |
|---|---|---|
| 백캐스트 | **전면 폐기** | S089 Luck 부트스트랩 목적 폐기 후 명분 약함 + 정직성 |
| 자동 history 등록 | **폐기** | + 1세트 / + 5세트는 saved-sets만 |
| 진입점 | **saved-sets-row "내 번호로 선택" 버튼** | 사용자 명시 선택 |
| 회차당 cap | **5게임** | 한국 동행복권 1구좌 모방 |
| Cap 도달 시 | **미등록 disabled + hint** | 옛 saved-sets cap 패턴 답습. 등록 해제는 cap 무관 |
| 옛 데이터 | **자동 마이그레이션** | storage load 시 백캐스트 추정 항목(createdAt === character.createdAt) 자동 제거 |
| 어휘 | **"내 번호로 선택" / "선택 해제"** | 사용자 의도 직접 표현 |

### 2.104.2. core 변경

| 파일 | 변경 |
|---|---|
| `src/core/history.js` | `backfillRecommendations` 함수 **전면 폐기** + `recordRecommendation` 중복 차단 강화(같은 drwNo + 같은 numbers) + **`toggleSavedSetRegistration(character, savedSet, drwNo)` 신설** (action: 'registered' / 'unregistered' / 'cap_reached') + **`countRegisteredForRound` / `isRegistered` 헬퍼 신설** + 모든 등록 항목에 `source: 'user'` 필드 |

### 2.104.3. data 변경

| 파일 | 변경 |
|---|---|
| `src/data/numbers.js` | **`HISTORY_REGISTER_CAP_PER_ROUND = 5`** 신설 + `BACKFILL_RECENT_COUNT` dead 표기 (호환 잔존) |
| `src/data/storage.js` | `loadCharacters` S090 마이그레이션 - 백캐스트 추정 항목(`history[].createdAt === character.createdAt`) 자동 제거 + 잔존 항목 `source: 'user'` 보수적 자동 채움 |

### 2.104.4. render 변경

| 파일 | 변경 |
|---|---|
| `src/render/main.js` | import 정정 + `backfillRecommendations` / `recordRecommendation` 자동 호출 제거 → 매칭만(`matchHistory`) + savedSetsSectionHtml 호출에 `registeredKeys` / `registerCount` / cap 전달 + **"내 번호로 선택" 토글 핸들러 신설** (cap 도달 시 toast 안내) |
| `src/render/saved-sets-section.js` | `savedSetsSectionHtml` 6번째~8번째 인자(registeredKeys / registerCount / registerCap) 추가 + 각 row에 "내 번호로 선택" 버튼 + 등록 시 시각 강조 + 헤더에 카운터 "등록 N/5" + cap 도달 시 hint |
| `styles/main.css` | `.saved-set-register` / `.saved-set-register.is-registered` / `.saved-set-row.is-registered` / `.saved-set-reg-badge` / `.saved-sets-register-counter` / `.saved-sets-cap-hint` 신규 룰 |

### 2.104.5. tests 변경

| 파일 | 변경 |
|---|---|
| `tests/suites/history.test.js` | backfillRecommendations 단언 6건 폐기 → toggleSavedSetRegistration 4건 / 중복 차단 1건 / backfill export 부재 단언 신설 |
| `tests/suites/storage.test.js` | S089 단언 확장(createdAt 분리 + source 자동 채움) + S090 백캐스트 추정 자동 제거 단언 신설 |

### 2.104.6. docs SSOT 변경

| 파일 | 변경 |
|---|---|
| `docs/01_spec.md` | 5.2.5.9 "내 번호로 선택" 메커니즘 신설 + 7.5 백캐스트 폐기 명시 |
| `docs/02_data.md` | 1.16 백캐스트 폐기 + 1.16-A history 등록 cap 신설 + 3.7 Recommendation schema에 `source: 'user'` 필드 추가 |
| `docs/03_architecture.md` | 데이터 흐름 안 백캐스트 호출 라인 폐기 표기 |

### 2.104.7. 사용자 화면 기대 변동

| 영역 | 동작 |
|---|---|
| 신규 캐릭터 진입 | 전적 탭 **빈 상태** ("추첨 카드를 + 버튼으로 등록하면 자동 기록"). 옛 가짜 30회 사라짐 |
| 옛 캐릭터 진입 | storage load 시 백캐스트 추정 항목 자동 제거. 사용자가 실제 누른 추천만 잔존 |
| + 1세트 / + 5세트 | saved-sets에만 추가. history 영향 0 |
| saved-sets-row | "내 번호로 선택" 버튼 노출. 클릭 시 history 등록 + 카드 외곽선 강조 + "등록" 배지 |
| 헤더 | "추천 리스트 (N)" + "등록 M/5" 카운터 |
| Cap 도달 (5게임 등록) | 미등록 카드 버튼 disabled + hint "이번 회차 5게임 등록 완료" |
| 매주 토요일 발표 후 | 등록된 5게임 자동 매칭 → 진짜 적중률 / 등수 분포 누적 |

### 2.104.8. 검증

`node tests/run-node.js` → **315 / 315 PASS** (회귀 0).

신규 단언:
- `recordRecommendation`: source=user 자동 + 같은 drwNo+numbers 중복 차단.
- `toggleSavedSetRegistration`: register/unregister 토글 + cap 5 차단 + 다른 회차 cap 무관 + `isRegistered` 동작.
- backfillRecommendations export 부재 (S090 폐기).
- storage 마이그레이션: 백캐스트 추정 항목 자동 제거 + source 자동 채움.

### 2.104.9. 잔여 / 후속

- `BACKFILL_RECENT_COUNT` 상수는 dead로 잔존. 다음 cleanup sprint에서 폐기.
- "내 번호로 선택" 버튼 모바일 반응형 폭 점검 = 사용자 캡쳐 확인 후 정정 가능 영역.
- 한 회차 등록 후 strategyIds 변경 시 saved-sets는 휘발이지만 history 등록은 영구. 사용자 인지 명확.
- 진짜 데이터 누적 시작점 = 본 sprint commit 이후 매주 토요일 추첨.

### 2.104.10. Sprint 076 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 076(절 2.97, 캐릭터 카드 흉일 시각/동작 결손) archive 이전. 본 sprint 종료 시점 활성 = 077~079 + 084 + 088 + 089 + 090 = 7건 정합. archive 16차 정리.

### 2.104.11. S090-후속 - 라벨 단축 + row layout 결손 정정

배경: 사용자 캡쳐 2건 + 명시 "UX가 개판이네" + "내 번호로 선택 → 확정으로 스트링 변경".

**결손 진단**:

| # | 결손 | 원인 |
|---|---|---|
| 1 | 등록 후 row layout 무너짐 (번호공 잘림 + 버튼 wrap) | `.saved-set-row` grid 3열 (`44px 1fr var(--space-6)`)에 register 버튼 추가 = 4번째 자식이 grid track 부족으로 wrap |
| 2 | "등록" 배지 폭 점유 | `.saved-set-reg-badge` span이 row 자식으로 grid 5번째 점유 + balls/버튼 영역 압축 |
| 3 | 라벨 길어 모바일 폭 부족 | "내 번호로 선택" 9자 + "선택 해제" 5자 |

**정정 3건**:

| 영역 | 변경 |
|---|---|
| 라벨 단축 (사용자 명시) | "내 번호로 선택" → **"확정"** / "선택 해제" → **"취소"** |
| Row grid 4열 | `44px 1fr var(--space-6)` → **`44px 1fr auto var(--space-6)`** (라벨 / balls / 확정 버튼 / 휴지통) |
| 등록 배지 폐기 | `.saved-set-reg-badge` HTML + CSS 룰 모두 폐기. 시각 강조는 row outline + 버튼 accent 배경으로 충분 |

**버튼 width 정합**: `min-width: 56px` + `padding: 6px 12px` 명시 = "확정"/"취소" 둘 다 동일 폭. row layout 안정.

**변경 파일**:
- `src/render/saved-sets-section.js`: 라벨 변경 + regBadge HTML 제거 + aria/title 정합
- `styles/main.css`: `.saved-set-row` grid 4열 + `.saved-set-register` min-width / padding + `.saved-set-reg-badge` 룰 폐기
- `docs/01_spec.md` 5.2.5.9 + 02_data 1.16-A: "확정" 어휘 정합
- `service-worker.js` v68 → v69

**검증**: `node tests/run-node.js` → **315 / 315 PASS** (UI/CSS만 변경, 회귀 0).

**사용자 화면 기대 변동**:
- 미등록 row: `[추천N] [번호공 6개] [확정] [🗑]` 4열 정합.
- 등록 row: 외곽선 accent + 버튼 "취소" accent 배경. 배지 없음.
- Cap 도달: 미등록 row 버튼 disabled.
- 라벨 짧아 모바일 폭 여유 + row wrap 0.

### 2.104.12. S090-후속 2 - 전적 초기화 버튼 + 현재 회차 발표 대기 섹션

배경: 사용자 보고 2건. (1) "전적 쓰레기가 아직도 있네?" - S090 자동 마이그레이션이 일부 옛 데이터 못 잡음. (2) "이번회차에 선택된것들은 실시간으로 등록되었으면 좋겠는데??" - 확정 직후 실시간 인지 보장 필요.

**정정 1 - 설정 탭 "활성 캐릭터 전적 초기화" 버튼 신설**:

| 영역 | 변경 |
|---|---|
| `src/render/settings-page.js` | "데이터 초기화" 섹션 안 2 버튼 (전적만 / 전체). hint 카피 갱신 |
| `src/render/main.js` | `onResetActiveHistory` 핸들러 - confirm 후 `active.history = []` + saveCharacters + renderApp |

S090 자동 마이그레이션(`createdAt === character.createdAt`)이 못 잡는 옛 데이터 = 사용자 명시 클릭으로 강제 정리. confirm 카피 "N건 모두 삭제됩니다. 앞으로 '확정'한 추천만 다시 누적됩니다."

**정정 2 - 전적 탭 "현재 회차 발표 대기" 섹션 신설**:

| 영역 | 변경 |
|---|---|
| `src/render/history-page.js` | `currentDrwNo` 인자 추가. pendingItems = 현재 회차 + matchedRank null. 별도 섹션으로 노출 |
| `src/render/main.js` | `renderHistoryPage(content, active, state.drwNo)` 호출 갱신 |
| `styles/main.css` | `.history-pending-section` 룰 - accent 외곽선 + 배경 tint + title accent 색 |
| 옛 이력 섹션 | 라벨 "이력" → "옛 회차 이력". 본 회차 제외 |

사용자 "확정" 클릭 직후 본 섹션에 즉시 등장 (renderApp 패턴) → 실시간 인지. 발표 후 matchedRank 채워지면 자연히 옛 이력 섹션으로 이동.

**docs**: 01_spec 5.8.1-A 신설.

**검증**: 315/315 PASS (UI 추가만, 회귀 0).

**사용자 화면 기대**:
- 설정 탭 → 데이터 초기화 → "활성 캐릭터 전적 초기화" 클릭 → confirm → 전적 빈 상태.
- 추첨 탭 → "확정" 클릭 → 전적 탭 진입 → 상단 "현재 회차 NNNN회 · 발표 대기 N건" accent 섹션 즉시 노출.
- 매주 토요일 발표 후 → 자동 매칭 → 옛 이력 섹션으로 자연 이동.

### 2.104.13. S090-후속 3 - 발표 대기 섹션 회차 라벨 중복 폐기

배경: 사용자 캡쳐 + 명시 "전적에서 모든 번호에 회차를 적지말고 회차는 상단에 한번만 표시하고 하위에는 표시하지 말아줘". 발표 대기 섹션의 모든 항목이 같은 회차(예: 1225회)인데 각 항목 헤더에 "1225회차" 라벨 5회 중복.

**정정**:

| 영역 | 변경 |
|---|---|
| `src/render/history-page.js` | `historyItemHtml(h, showRound = true)` 인자 신설 + pendingItems 호출 시 `showRound=false` |
| 발표 대기 항목 헤더 | "NNNN회차" 라벨 폐기. rank 라벨만 우측 정렬 |
| 옛 이력 항목 헤더 | 회차 다양하므로 라벨 유지 (showRound=true 기본값) |
| `styles/main.css` | `.history-header-no-round` 룰 신설 (`justify-content: flex-end`) |
| `docs/01_spec.md` 5.8.1-A | 보강 메모 |

**검증**: 315/315 PASS (UI/CSS만, 회귀 0).

**사용자 화면 기대**:
- 발표 대기 섹션 헤더: "현재 회차 1225회 · 발표 대기 5건" (회차 1회 표기)
- 각 항목 헤더: "미적중 / 미발표" rank 라벨만 (회차 중복 폐기)
- 옛 이력 섹션 = 변동 없음 (회차 라벨 유지)

### 2.104.14. S090-후속 4 - UI 정렬 + 과거 쓰레기 일괄 삭제

배경: 사용자 보고 3건. (1) "UI 보기 좋게 정렬해줘" - 발표 대기 카드 좌측 몰림 + rank 라벨 우상단 비대칭. (2) "과거 쓰레기 데이터 삭제 해". (3) "캐릭터 생성할 때마다 추가되는 옛 회차 쓰레기도 모두 삭제".

**정정 1 - 발표 대기 카드 정렬**:

| 영역 | 변경 |
|---|---|
| `historyItemHtml(h, showRound, showRank)` | `showRank` 인자 신설 |
| 발표 대기 호출 | `historyItemHtml(h, false, false)` = 회차 + rank 모두 폐기 = 헤더 자체 폐기, 번호공만 노출 |
| 옛 이력 호출 | 기본값 (true/true) 유지 |
| `.history-numbers` | `justify-content: center` + `gap: var(--space-2)` (좌측 몰림 → 가운데 정렬) |

근거: 발표 대기 = 정의상 모든 항목이 "미적중/미발표" 동일 = 라벨 정보 0. 5회 중복으로 시각 노이즈만 증가 + 부정적 인상 ("미적중"). 카드 = 번호공만 노출이 가장 정직.

**정정 2 - 1회 강제 클린업 (사용자 명시 일괄 정리)**:

| 영역 | 변경 |
|---|---|
| `storage.js` `loadCharacters` | `lotto_s090_cleared` flag 확인 → 부재 시 모든 character.history = [] + flag 저장 |
| flag 저장 후 | 두 번째 load부터는 자동 마이그레이션만 적용 (강제 클린업 skip) |
| 신규 캐릭터 | character-form.js 기본 `history: []`로 빈 시작 (변동 없음) |

근거: S090 자동 마이그레이션(`createdAt 일치`) 한계로 일부 옛 데이터 잔존. 사용자 명시 "과거 쓰레기 모두 삭제"로 일괄 강제 정리. 옛 사용자 행동 데이터까지 삭제는 사용자 명시 결정 답습. 1회만 실행 = 이후 등록한 진짜 데이터는 보존.

**변경 파일**:
- `src/render/history-page.js`: showRank 인자 + 발표 대기 호출 `(h, false, false)` + 빈 상태 카피 갱신
- `src/data/storage.js`: 1회 강제 클린업 + `normalizeCharacter` 함수 분리
- `styles/main.css`: `.history-numbers` 가운데 정렬 + `.history-header-no-rank` 룰
- `tests/suites/storage.test.js`: 옛 단언 2건에 flag 미리 설정 + S090-후속 4 강제 클린업 단언 1건 신설
- `docs/01_spec.md` 5.8.1-A 보강
- `service-worker.js` v71 → v72

**검증**: `node tests/run-node.js` → **316 / 316 PASS** (315 → 316, S090-후속 4 클린업 단언 1건 추가).

**사용자 화면 기대**:
- 다음 진입 시 1회 클린업 자동 발동 → 모든 캐릭터 전적 빈 상태.
- 발표 대기 카드: 헤더 없음 + 번호공 6개 가운데 정렬. 깔끔 시각.
- 옛 이력 = 회차/rank 라벨 유지 (역할 분리 유지).
- 신규 캐릭터 = 빈 history 시작. 옛 회차 자동 추가 없음.
- 빈 상태 카피: "전적이 비어있습니다. 추첨 탭에서 추천을 받고 '확정'을 누르면 본 회차에 등록됩니다. 매주 토요일 발표 후 자동 매칭됩니다."

**잔여**:
- 1회 클린업 = 옛 사용자 행동 데이터도 함께 삭제. 사용자 명시 결정 영역.
- flag (`lotto_s090_cleared`)는 영구 잔존. 다음 cleanup sprint에서 제거 가능.

### 2.104.15. S090-후속 5 - 확정 row 시각 정정 (2026-05-18)

배경: 사용자 캡쳐 + 명시 "추천 리스트 확정 했을 때 ui가 좀 어색한데". 확정 row 4개 연속에서 각 box outline이 분리된 인상 + "취소" 버튼이 outline에 닿음 + 점선 border-bottom과 outline 시각 충돌.

**정정**:

| 옛 | 새 |
|---|---|
| `outline: 1px solid var(--color-accent)` + `outline-offset: -1px` (row 안쪽) | **`box-shadow: inset 4px 0 0 0 var(--color-accent)`** (좌측 4px 바) |
| `border-radius: var(--radius-sm)` | 폐기 (border-bottom dashed가 row 균일 시각 처리) |
| outline이 row 내부 점유로 버튼 침범 | `padding-left: var(--space-2)` (좌측 바와 라벨 사이 호흡) |

**근거**: 좌측 바 = "확정됨" 시각 인지 + 모바일 폭 점유 0 + 버튼 영역 침범 0. 4개 연속 row도 4개 좌측 바가 시각적으로 통합된 라인처럼 보임.

**변경 파일**:
- `styles/main.css` `.saved-set-row.is-registered` 룰 정정
- `docs/01_spec.md` 5.2.5.9 시각 명세 갱신
- `service-worker.js` v72 → v73

**검증**: 316/316 PASS (CSS-only, 회귀 0).

**사용자 화면 기대 변동**:
- 확정 row = 좌측 4px accent 바 + 옅은 accent 배경 tint + 버튼 "취소" accent 배경.
- 4개 연속 row가 좌측 바 라인으로 시각 통합.
- "취소" 버튼 / 휴지통 = outline 침범 0, 명확 클릭 가능.
- 미확정 row = 변동 없음.

### 2.104.16. S090-후속 6 - row padding 정합 + 정렬 일치 (2026-05-18)

배경: 사용자 강한 비판 "누가 디자인을 바꾸래??? 아웃라인이 추천 텍스트에 닿아 있는게 지저분해 보이고, 삭제 버튼도 외곽라인에 붙어 있어서 디자인이 완전 별로야. 확정된것과 확정 안된것이 정렬 위치까지 틀어져 있어서 더 별로네"

**진단 - 직전 S090-후속 5 정정이 만든 결손**:

| # | 결손 | 원인 |
|---|---|---|
| 1 | 좌측 4px 바가 "추천N" 라벨에 닿음 | row 자체 좌우 padding 0 (옛 `padding: var(--space-2) 0`) |
| 2 | 휴지통이 row 우측 외곽에 붙음 | row 자체 padding-right 0 |
| 3 | 확정/미확정 row 정렬 어긋남 | `.saved-set-row.is-registered`에만 `padding-left: var(--space-2)` 추가 = inset 다름 |

**정정**:

| 영역 | 변경 |
|---|---|
| `.saved-set-row` 기본 | `padding: var(--space-2) 0` → **`padding: var(--space-2) var(--space-3)`** (좌우 12px 호흡 추가) |
| `.saved-set-row.is-registered` | `padding-left: var(--space-2)` 추가 폐기. background + box-shadow inset 4px 좌측 바만 유지 |
| 결과 | 모든 row 좌우 inset 100% 일치. 좌측 바 ↔ 라벨 = 8px (12px padding 안 4px 바 표시 후) 호흡. 휴지통 우측 12px 호흡 |

**변경 파일**:
- `styles/main.css` `.saved-set-row` + `.saved-set-row.is-registered`
- `docs/01_spec.md` 5.2.5.9 보강
- `service-worker.js` v73 → v74

**검증**: 316/316 PASS (CSS-only, 회귀 0).

**사용자 화면 기대 변동**:
- 모든 row 좌우 가장자리에서 12px 호흡 = 시각 정돈.
- 확정 row 좌측 바 = 라벨과 8px 호흡 (텍스트 침범 0).
- 휴지통 = row 우측 가장자리에서 12px 호흡 (외곽 충돌 0).
- 확정 / 미확정 row의 라벨 / 번호공 / 버튼 / 휴지통 모두 동일 가로 위치 = 정렬 일치.

**자비스 자기 점검 (14건째 결손)**:
직전 정정(S090-후속 5)에서 `.saved-set-row.is-registered`에만 padding-left 추가했음 = 정렬 깨뜨림. 시각 강조 위해 한쪽 클래스에만 padding 추가하면 다른 클래스와 정렬 어긋남이 필연. 향후 룰: **확정/미충정 같은 toggle 상태 시각 강조는 background / box-shadow / outline 같은 layout 무영향 속성만 사용. padding/margin 변경 금지**.

### 2.104.17. S090-후속 7 - UX 종합 정정 6건 (2026-05-18)

배경: 사용자 명시 6건 묶음.
1. 앞쪽 세로 띠(두꺼운 선) 제거
2. 뒤쪽 여백을 지금의 절반으로 줄여
3. 확정 시 배경 색이 칠해지는데 앞쪽 여백과 뒤쪽 여백이 동일하도록 조정
4. 배경 칠해진 색을 조금 더 강하게
5. 확정한 채 삭제하면 확정 자체가 취소되게
6. 선택은 왜 5개까지만이야? 5개 제한 없애줘

**정정 매핑**:

| # | 영역 | 변경 |
|---|---|---|
| 1 | `.saved-set-row.is-registered` | `box-shadow: inset 4px 0 0 0 var(--color-accent)` 폐기 (좌측 4px 바 제거) |
| 2 | `.saved-set-row` padding | `var(--space-2) var(--space-3)` → `var(--space-2) calc(var(--space-3) / 2)` (좌우 6px = 절반) |
| 3 | (위 2번과 같이) | 좌우 동일 6px = 배경 칠 정합 |
| 4 | `.saved-set-row.is-registered` background | `rgba(212, 166, 87, 0.08)` → `rgba(212, 166, 87, 0.22)` (3배 강화) |
| 5 | `render/main.js` remove-saved-set 핸들러 | saved-set 삭제 시 같은 numbers history(현재 회차) 결합 제거 |
| 6 | `core/history.js` `toggleSavedSetRegistration` | cap 분기 폐기. action 종류: 'registered' / 'unregistered' / 'noop'. cap_reached 폐기 |

**부수 정리**:
- `data/numbers.js`: `HISTORY_REGISTER_CAP_PER_ROUND` dead (호환 잔존, 코드 호출 0).
- `render/saved-sets-section.js`: registerCap 인자 폐기. capReached / cap hint 폐기. 카운터 "등록 N/5" → "확정 N건" (0건이면 숨김).
- `render/main.js`: 토글 핸들러 cap_reached 분기 폐기 + savedSetsSectionHtml 호출에서 cap 인자 제거.
- `tests/history.test`: cap 5 도달 차단 단언 → cap 폐기(7건 모두 등록) 검증으로 정정.
- `docs/01_spec.md` 5.2.5.9: 시각 명세 + cap 폐기 + 휴지통 동작 갱신.

**변경 파일**:
- `core/history.js` (cap 분기 폐기)
- `data/numbers.js` (상수 dead 표기)
- `render/saved-sets-section.js` (cap UI 폐기 + 카운터 단순화)
- `render/main.js` (휴지통 결합 제거 + cap 토스트 폐기)
- `styles/main.css` (좌측 바 폐기 + padding 절반 + background 강화)
- `tests/suites/history.test.js` (cap 단언 정정)
- `docs/01_spec.md` 5.2.5.9
- `service-worker.js` v74 → v75

**검증**: 316/316 PASS (cap 단언 정정 후도 동일 카운트).

**사용자 화면 기대 변동**:
- 좌측 4px 바 사라짐 = "추천N" 라벨에 침범 0.
- 좌우 padding 6px (절반) = 더 컴팩트, 양쪽 호흡 동일.
- 확정 배경 = 옅은 노랑 (0.08) → 진한 노랑 (0.22) = 한눈에 식별.
- 확정한 row의 휴지통 클릭 = saved-sets에서 사라짐 + history(확정)도 같이 사라짐 = 일관된 동작.
- 무제한 등록 = 사용자가 회차당 원하는 만큼 확정 가능 (saved-sets cap 20이 자연 상한).



## 2.103. Sprint 089 완료 - Luck 자산 전면 폐기 (S089, 2026-05-17)

배경: 사용자 명시 2건. (1) "Lotto 번호 추천해서 Luck을 게임요소로 추가하고 싶은 생각은 없어". (2) "Luck 바가 100점 만점에 10점대나 기분이 아주 나쁨". 본 sprint = FM 표준 절차 답습 (docs SSOT → core → data → render → tests → SW → PROGRESS).

### 2.103.1. 폐기 사유

| 측면 | 진단 |
|---|---|
| 사용자 의도 | Luck을 게임요소로 추가 안 함 (명시 발화) |
| 사용자 경험 | 100점 만점 바 = "능력치" 인지 = 낮은 점수 부정적 감정 |
| 사행성 회피 | CLAUDE.md 6.3 / docs/01_spec 정합 - 추첨 영향 능력치 인상 자체가 회피 대상 |
| 메커니즘 영향 | BLESSED 전략 1개 boost + ritual 만땅 +5만 실작동. cleanup 범위 한정 |

### 2.103.2. core 변경

| 파일 | 변경 |
|---|---|
| `src/core/luck.js` | **모듈 전체 폐기** (applyLuckGrowth / rankLuckBonus / RANK_LUCK_BONUS 모두 제거) |
| `src/core/recommend.js` | `ctx.luck` 인자 제거 + BLESSED boost = `ratio * 0.5` (luck 비례) → **고정 +0.5** |
| `src/core/history.js` | `luckApplied` 필드 제거 + 매칭 시 잠금 로직 폐기 + backfill 호출에서 luck 인자 제거 |
| `src/core/ritual.js` | `applyRitualBonus`에서 `character.luck += 5` 폐기 → **잠금만 유지** (character 불변) |

### 2.103.3. data 변경

| 파일 | 변경 |
|---|---|
| `src/data/numbers.js` | `LUCK_MIN` / `LUCK_MAX` / `LUCK_INITIAL` / `LUCK_BONUS_HIT` / `LUCK_BONUS_DAILY` / `LUCK_BONUS_RITUAL` 6 상수 폐기 |
| `src/data/storage.js` | `loadCharacters` 마이그레이션 - 옛 데이터의 `character.luck` 필드 + `history[].luckApplied` 자동 제거 |

### 2.103.4. render 변경

| 파일 | 변경 |
|---|---|
| `src/render/character-card.js` | `.char-luck` progressbar 블록 제거 (char-lucky 행운 번호 영역은 유지) |
| `src/render/character-form.js` | 신규 캐릭터 `luck: LUCK_INITIAL` 필드 제거 + LUCK_INITIAL import 제거 |
| `src/render/history-page.js` | 누적 요약 그리드 Luck 셀 제거 (6셀 → 5셀) |
| `src/render/main.js` | `applyLuckGrowth` import 제거 + 호출 제거 + ctx luck 인자 2건 제거 + ritual 만땅 보너스 갱신 폐기 |
| `src/render/ritual-widget.js` | 만땅 chip "+5 적용" → "완성" / 완성 배너 카피 정정 / intro 카피 정정 |
| `src/render/settings-page.js` | hint 카피 "Luck 매칭" 정정 |
| `src/render/strategy-picker.js` | BLESSED desc 정정 - "키운 Luck만큼 시드 6번호 보너스" → "캐릭터 시드 기반 6번호에 +0.5 boost" |

### 2.103.5. tests 변경

| 파일 | 변경 |
|---|---|
| `tests/suites/luck.test.js` | **파일 전체 폐기** |
| `tests/runner.js` | luck.test 등록 해제 |
| `tests/suites/history.test.js` | LUCK_INITIAL 사용 제거 + luckApplied 단언 부재 단언으로 정정 |
| `tests/suites/recommend.test.js` | baseCtx luck 인자 제거 + `luck: 50,` 11건 일괄 제거 + "luck 달라도 같은 결과" 테스트 카피 정정 |
| `tests/suites/ritual.test.js` | LUCK_BONUS_RITUAL import 제거 + Luck +5 단언 폐기 → character 불변 단언으로 정정 + cap 100 테스트 폐기 |
| `tests/suites/saved-sets.test.js` | luck: 50 인자 제거 |
| `tests/suites/storage.test.js` | characters round-trip 단언 확장 - 옛 luck 필드 + history.luckApplied가 load 시 자동 제거되는지 검증 |

### 2.103.6. docs SSOT 변경

| 파일 | 변경 |
|---|---|
| `docs/01_spec.md` | 5.1 캐릭터 정체성 / 5.1.3.0 architecture / 5.6 ritual / 5.8.1 요약 그리드 / 6.1 성공 이벤트 / 7.2 Luck 성장 / 7.5 백캐스트 (14 절 정정) |
| `docs/02_data.md` | 1.2 Luck 스탯 / 1.5.5.4 5세트 영향 / 1.16 백캐스트 / 1.19.5 ritual 추첨 무관 / 1.19 상수 표 / 3.6 캐릭터 schema / 3.7 Recommendation schema / 3.8 등수별 보너스 (8 절 정정) |
| `docs/03_architecture.md` | 폴더 구조에서 `luck.js` + `luck.test.js` 제거 + 데이터 흐름 안 applyLuck/applyLuckGrowth 호출 라인 제거 + core 책임 표에서 luck 제거 |

### 2.103.7. BLESSED 전략 후속 영향

**옛**: `boost = (luck/100) * 0.5` → 시드 6번호에 0~0.5 가산 (luck 비례).
**새**: `boost = 0.5 고정` → 시드 6번호에 항상 +0.5 가산.

- 결과 분포 변동 = 모든 캐릭터가 BLESSED 전략에서 시드 6번호 쏠림이 동일 (옛에는 luck 낮은 캐릭터는 거의 균등, 높은 캐릭터만 쏠림).
- 결정론 = seed가 같으면 같은 결과 (luck 인자 폐기로 결정론 더 단순).
- 캐릭터 시드 차별성 보존 = BLESSED 전략 선택 시 캐릭터마다 다른 결과.

### 2.103.8. 검증

`node tests/run-node.js` → **315 / 315 PASS** (325 → 315, luck.test 10건 폐기 + history/storage 단언 정정 + ritual cap 100 테스트 폐기).

### 2.103.9. 사용자 화면 기대 변동

- **캐릭터 카드**: Luck 100점 만점 바 사라짐. 띠/별자리/일주/운세/행운 번호만 유지.
- **전적 그리드**: 6셀 → 5셀 (총 추천 / 발표 완료 / 적중 / 적중률 / 최고 등수).
- **행운 의식 모달**: 만땅 chip "+5 적용" → "완성". 완성 배너 "Luck +5 부여됨" → "의식 완성". intro 카피 "만땅 시 Luck +5 1회 적용" 폐기.
- **추첨 결과**: 객관 전략(통계 5종) + 학설 전략(별자리/4원소/사주) + 직감/균형 = 변동 0. BLESSED(랜덤) 전략 = 시드 6번호 쏠림이 luck 무관 일정 (옛 luck 낮은 캐릭터에게는 시드 쏠림이 약했음).
- **옛 캐릭터 데이터**: `character.luck` + `history[].luckApplied` 잔존은 storage load 시 자동 제거.

### 2.103.10. 잔여 / 후속

- `WEIGHT_MAX_BIAS` 옛 상수(docs/02_data.md 1.6 표) = 옛 architecture 잔재. 본 sprint에서 dead 상수로 표기. cleanup 후순위.
- 옛 PROGRESS_ARCHIVE의 "Luck" 표기는 역사 흔적으로 보존. 일관성 sweep 필요 시 별도 cleanup sprint.
- 사용자 옛 캐릭터의 luck=50 같은 값은 load 시 사라지지만, 새 캐릭터는 처음부터 필드 자체 부재. 모든 사용자에게 일관된 schema.

### 2.103.11. Sprint 075 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 075(절 2.96, DEFAULT_PRESETS 순서/라벨/묶음 재정렬) archive 이전. 본 sprint 종료 시점 활성 = 076~079 + 084 + 088 + 089 = 7건 정합. archive 15차 정리.

### 2.103.12. S089-후속 - "행운 쌓기" → "당첨 기원" 라벨 변경 + 완성 chip 중복 폐기

배경: 사용자 보고 캡쳐 2건. (1) "행운 쌓기 → 당첨 기원으로 스트링 변경". (2) "완성이 두 개나 중복으로 표시되네, 하나 삭제".

**변경 1 - 라벨 정정**:

| 영역 | 변경 |
|---|---|
| `src/render/ritual-widget.js` | `RITUAL_LABEL = '행운 쌓기'` → **`'당첨 기원'`** |
| `docs/01_spec.md` 5.6 + 5.6.1 + 본문 4건 | 표기 정정 |
| `docs/02_data.md` 1.19 + 1.19.6 | 표기 정정 |

**변경 2 - 완성 chip 폐기**:

옛 구조: `[라벨] [8 아이콘] [bonus chip "완성"] [cta "완성 ✓"]` = "완성" 단어 2회 표시.
새 구조: `[라벨] [8 아이콘] [cta "완성 ✓"]` = "완성" 단어 1회.

bonus chip은 S089 이전 "+5 적용" Luck 보상 노출 영역 → S089에서 임시 "완성"으로 정정 → 본 후속에서 cta와 중복 인지 발견 후 폐기. 만땅 시각 강조는 `.is-filled` class + completion banner로 충분.

| 영역 | 변경 |
|---|---|
| 추첨 탭 한 줄 바 | bonus chip HTML 제거 |
| 모달 헤더 row | bonus chip HTML 제거 |
| `docs/01_spec.md` 5.6.2 구조 명세 | "+5 적용 chip" 항목 폐기 표시 |

**라벨 정직성 룰 정정** (docs/01_spec.md 5.6.1 + docs/02_data.md 1.19.6):

| 카피 | 옛 룰 | 새 룰 (S089-후속) |
|---|---|---|
| "확률" / "필승" | 금지 | **여전히 절대 금지** |
| "당첨" 단독 / "당첨 확률 향상" / "당첨 보장" | 금지 | 직접 어필은 **여전히 금지** |
| "당첨 기원" / "당첨 + 정성 어휘" | 금지 | **허용** (사용자 명시) |

[의견] 베테랑 진단: "당첨" 단어가 행동 자극 영역이긴 하지만 "기원"이 정성/소망/의식 메타포로 톤 완화. 사용자 명시 결정 + intro 본문 보호 카피("당첨 확률에는 영향이 없습니다") 유지로 균형. CLAUDE.md 6.3 사행성 회피 룰의 핵심("확률 향상" / "필승") 보호 유지.

**변경 파일**:

- `src/render/ritual-widget.js`: RITUAL_LABEL + bonus chip 2건 제거 + 주석 정정
- `docs/01_spec.md` 5.6 / 5.6.1 / 5.6 본문 4건
- `docs/02_data.md` 1.19 / 1.19.6 + S089-후속 변경 메모 신설
- `service-worker.js` v66 → v67

**검증**: `node tests/run-node.js` → **315 / 315 PASS** (UI 라벨 / DOM 구조만 변경, 회귀 0).

**사용자 화면 기대 변동**:
- 추첨 탭 행운 쌓기 한 줄 바 라벨: "행운 쌓기" → **"당첨 기원"**.
- 모달 헤더 라벨: 동일 변경.
- 만땅 시: 옛 노란 "완성" chip 사라짐. cta 흰 "완성 ✓" 버튼만 유지.
- 만땅 모달 진입: 완성 banner "의식 완성." 유지.



## 2.102. Sprint 088 완료 - 라벨 정정 "전체 비우기"→"전체 삭제" + 크롬 모바일 하단 메뉴와 하단 탭 위치 정확 동기 (S088, 2026-05-17)

배경: 사용자 보고 2건. (1) "전체 비우기 버튼 → 전체 삭제 버튼으로 이름 변경". (2) "크롬 모바일 웹에서 하단 크롬 메뉴와 하단 탭 보이기/숨기기가 정확하게 싱크가 맞지 않아서 허접해 보임".

### 2.102.1. 사용자 확정 (AskUserQuestion)

| 질문 | 답변 |
|---|---|
| 동기 방식 | **옵션 C** - CSS GPU layer 분리 + visualViewport API JS 동기 동시 |
| 하단 탭 가시성 | **항상 보임** - 크롬 메뉴 슬라이드와 무관하게 visual viewport visible bottom에 강제 부착 |

### 2.102.2. 라벨 정정 - "전체 비우기" → "전체 삭제"

| 영역 | 위치 | 변경 |
|---|---|---|
| UI 라벨 1 | `src/render/saved-sets-section.js:146` | `title` + `<span class="saved-clear-text">` |
| UI 라벨 2 | `src/render/wheeling-page.js:91` | 버튼 텍스트 |
| docs SSOT | `docs/01_spec.md` 4건 (액션바 다이어그램 / 정책 / 삭제 설명 / 모달 카피) | 본문 텍스트 |
| aria-label | `src/render/saved-sets-section.js` | "추천 리스트 모두 삭제" 유지 (옛부터 정합) |
| 코드 / CSS 주석 안 옛 표기 | 다수 | 역사 흔적으로 보존 (cleanup sprint 영역) |

### 2.102.3. 크롬 모바일 하단 메뉴 슬라이딩 동기 - 원인 분석

| 항목 | 현황 |
|---|---|
| `.bottom-tabs` 포지셔닝 | `position: fixed; bottom: 0; padding-bottom: env(safe-area-inset-bottom)` |
| 크롬 모바일 동작 | 스크롤 방향에 따라 상단 주소창 + 하단 메뉴 슬라이딩 = visualViewport.height + offsetTop 동적 변화 |
| layout vs visual viewport 갭 | `bottom: 0`은 layout viewport 기준. 크롬 자체 fixed-bottom 자동 추적은 한 박자 lag |
| GPU layer | 분리 안 됨 (`will-change` / `transform` 미적용) → 크롬 바 슬라이드 프레임과 합성 lag |

### 2.102.4. 정정 - 두 정책 동시 적용

**CSS GPU layer 분리** (`styles/main.css` `.bottom-tabs`):
- `will-change: transform`
- `transform: translateZ(0)` (GPU composite layer 강제 분리)

**JS visualViewport API 동기** (`src/render/viewport-sync.js` 신설):
- `visualViewport.resize` + `visualViewport.scroll` + `window.resize` 후크.
- 보정량 = `window.innerHeight - (vv.offsetTop + vv.height)`.
- `requestAnimationFrame` 1회 묶어 프레임 정합.
- 결과: 크롬 바 슬라이드 중에도 하단 탭이 visual viewport visible bottom에 정확 부착.

### 2.102.5. 변경 파일

- `src/render/saved-sets-section.js`: title + span 라벨 정정.
- `src/render/wheeling-page.js`: 휠링 페이지 풀 입력 영역 버튼 텍스트 정정.
- `src/render/viewport-sync.js` **신설**: `startBottomTabsViewportSync()` export.
- `src/render/main.js`: viewport-sync import + `initRender` 끝에서 1회 호출.
- `styles/main.css`: `.bottom-tabs`에 will-change + translateZ + S088 주석.
- `docs/01_spec.md`: "전체 비우기" → "전체 삭제" SSOT 4건 정정.
- `docs/03_architecture.md`: 폴더 구조에 `viewport-sync.js` + `render/` 책임 표 갱신.
- `docs/04_conventions.md`: §4.8.7 신설 ("fixed bottom 요소는 visualViewport 동기 + GPU layer 분리 의무"). 옛 §4.8.7 → §4.8.8.
- `service-worker.js` v63 → v64.

### 2.102.6. 검증

- `node tests/run-node.js` → **324 / 324 PASS** (회귀 0). viewport-sync는 DOM/visualViewport API 의존 = 단위 테스트 한계, 모듈 export만 정적 확인.
- 라벨 grep: "전체 비우기"는 PROGRESS_ARCHIVE / 코드 주석 / CSS 주석 등 역사 영역만 잔존 (의도).
- 사용자 UX 검증은 실 디바이스(크롬 모바일 안드로이드) 영역. PWA 사용자는 SW v64 활성화 후 강력 새로고침(Ctrl+Shift+R) 또는 PWA 앱 재시작 권장.

### 2.102.7. 사용자 화면 기대 변동

- 추천 리스트 액션바 우측 버튼 라벨: "전체 비우기" → **"전체 삭제"**.
- 휠링 페이지 풀 입력 영역 우측 버튼 라벨: "전체 비우기" → **"전체 삭제"**.
- 크롬 모바일에서 스크롤 시 하단 메뉴 슬라이딩과 하단 탭이 동일 타이밍에 함께 visual viewport visible bottom에 항상 부착 (lag / jerky 해소).
- 데스크톱 / iOS Safari / 비-크롬 모바일에서는 visual viewport 변동 거의 없어 시각 변화 0 (기존 동작 유지).

### 2.102.8. 잔여 / 후속

- CSS 주석 / JS 주석 / PROGRESS_ARCHIVE의 옛 "전체 비우기" 표기는 역사 흔적으로 보존. 일관성 sweep 필요 시 별도 cleanup sprint.
- visualViewport API 미지원 브라우저(매우 옛 데스크톱)는 본 모듈 no-op. 향후 폴백 룰(window.innerHeight 변화 감지 등) 필요 시 viewport-sync.js 확장 영역.
- 본 sprint는 시각 lag 해소 영역. 실 디바이스 테스트에서 여전히 jerky하면 추가 정정(예: pointer-events: none 잠깐 차단 / opacity transition 보강) 검토.

### 2.102.9. Sprint 074 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 074(절 2.95, strategyShort 매핑 6건 label[0] 통일) archive 이전. 본 sprint 종료 시점 활성 = 075~079 + 084 + 088 = 7건 정합. archive 14차 정리.

### 2.102.10. 자비스 자기 점검 (13건째 결손)

자비스 자체 결손은 아닌 영역(크롬 모바일 자체 합성 동작). 단 사전 fixed-bottom 요소 도입 시 visualViewport 동기 의무가 docs/04_conventions.md에 없었음 = 룰 부재 결손. §4.8.7로 명문화. 향후 fixed bottom 요소(토스트 / 액션 시트 / 휠링 푸터 등) 추가 시 본 패턴 자동 답습.

### 2.102.11. S088 후속 - sourceDisplayMode 'off' 모드 추가 (색점 미표시 설정)

배경: 사용자 명시 "색점을 표시 하지 않는 설정 옵션도 추가해줘". 옛 enum = `'dot'` / `'label'` 2종(S79). 셋째 옵션 신설.

| 모드 | 값 | 동작 |
|---|---|---|
| 색점 (기본) | `'dot'` | 작은 원 N개 나란히 (S79 옛 동작) |
| 한글 | `'label'` | 머리글자 텍스트 태그 (S79 옛 동작) |
| **표시 안 함 (신규)** | **`'off'`** | 번호공만 노출. 출처 영역 자체 출력 X |

**변경 파일**:
- `src/data/numbers.js`: `SOURCE_DISPLAY_OFF = 'off'` 상수 + `SOURCE_DISPLAY_MODES` 3종 freeze.
- `src/render/draw-card.js` + `src/render/saved-sets-section.js`: `numHtml` 분기 if/else로 재구성. `mode === 'off'` → `tagHtml = ''`.
- `src/render/settings-page.js`: 라디오 3번째 옵션("표시 안 함") + hint 카피 보강.
- `tests/suites/storage.test.js`: 'off' round-trip 1건 추가.
- `docs/02_data.md` 3.2.4: `lotto_options.sourceDisplayMode` enum 3종 설명 신설.
- `service-worker.js` v64 → v65.

**검증**: `node tests/run-node.js` → **325 / 325 PASS** (324 → 325). off round-trip 회귀 차단.

**사용자 화면 기대**: 설정 탭 "표시 안 함" 선택 시 번호공 아래 색점/한글 모두 사라짐. 번호공 6개 + 보너스 1개 단색 외 시각 노이즈 0. 옛 'dot' / 'label' 선택은 그대로 동작.

**잔여**: 기본값은 `'dot'` 유지 (사용자 명시 "훨씬 간결" 답습). 사용자가 명시 변경 시만 'off' 활성. 옛 사용자 자동 마이그레이션 = `loadOptions`의 `...OPTIONS_DEFAULT` spread 패턴으로 누락 키 자동 채움 = 변동 없음.

## 2.101. Sprint 084 완료 - 캐릭터 편집 기능 신설 (S84, 2026-05-17)

배경: 사용자 보고 "캐릭터 관리에서 캐릭터 정보를 수정할 수가 없네?". 설정 탭의 캐릭터 행이 활성 변경/삭제만 지원, 편집 기능 부재 확인.

### 2.101.1. 사용자 확정 (AskUserQuestion)

| 질문 | 답변 |
|---|---|
| 편집 필드 | **이름 + 생년월일** (Luck 직접 수정 X, luckyWord X) |
| 진입 메커니즘 | **편집 아이콘 추가** (행 클릭 = 활성 유지) |

### 2.101.2. 데이터 결정

| 필드 | 처리 |
|---|---|
| name | 사용자 입력 → 단순 보존 |
| birth | 사용자 입력 → zodiac/animalSign/dayPillar **자동 재계산** |
| seed | **보존** (캐릭터 정체성 + 옛 history / 추천 결과 결정론 일관성) |
| id / createdAt / history / savedSets / lastUsedStrategies / luck | 보존 |
| luckyWord | 편집 불가 (seed 입력에 사용, 보존 의미상 lock) |

### 2.101.3. 변경 파일

- `src/render/character-form.js`: `renderCharacterEditForm(container, character, onUpdated, onCancel)` 신설.
- `src/render/icons.js`: `pencil()` SVG 아이콘 신규.
- `src/render/settings-page.js`: `char-row`에 `.char-row-edit` 버튼 + `data-char-edit-id` 핸들러 + `pencil` import.
- `src/render/main.js`: `openEditCharacterModal(id)` 함수 + `onEditCharacter` 핸들러 등록 + `renderCharacterEditForm` import.
- `styles/main.css`: `.char-row-edit` 룰 + `.character-form .form-actions` (저장 / 취소 버튼 묶음).
- `game/service-worker.js` v59 → v60.

### 2.101.4. UX 흐름

1. 설정 탭 → 캐릭터 관리 행 옆 **✏️ 아이콘** 클릭.
2. 모달 진입 = 이름(prefill) + 생년월일(빈) 입력.
3. 생년월일 입력 → 별자리 자동 미리보기.
4. 저장 = `state.characters` 갱신 + `saveCharacters` + 모달 닫기 + 재렌더.
5. 취소 = 모달 닫기, 변경 없음.

### 2.101.5. 검증

- `node tests/run-node.js` → **324 / 324 PASS** (JS 함수 신설, 회귀 0).
- 모달 패턴 = `openAddCharacterModal`와 동일 (`showModal` + `renderCharacterForm` 패턴 재사용).
- 편집 후 seed 동일 = 추첨 결정론 보존.

### 2.101.6. 잔여 / 후속

- 편집 모달의 birth 필드는 prefill 안 함 (옛 birth를 캐릭터에서 직접 못 구함, seed 입력만 사용됨). 사용자가 다시 입력 = 의도와 다르면 모달 진입 시 옛 zodiac/dayPillar 표시 후 입력 강제 패턴 검토.
- luckyWord 편집 = 별도 의제 (seed 재계산 흐름 필요. 사용자 결정 영역).
- Luck 직접 수정 = 별도 의제 (치트 성격 또는 보수 조정 도구).

### 2.101.7. Sprint 073 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 073(절 2.94, F1~F5 cleanup) archive 이전. 본 sprint 종료 시점 활성 = 074~084 = 7건 정합 (074~083은 단일 sprint들 안 후속 정정 패턴이라 본 sprint 084까지 활성 7건). archive 13차 정리.

### 2.101.8. S85 - 편집 모달 birth prefill (후속 정정)

배경: 사용자 보고 "편집창을 띄우면 기존에 입력되었던 생년월일이 그대로 표시되어야 함". Sprint 084의 편집 모달 = birth 입력 빈값. 캐릭터 schema에 birth 필드 자체 부재가 원인.

원인:
- Sprint 084 이전 character schema = name/seed/zodiac/animalSign/dayPillar 보존, **birth는 seed 입력으로만 사용 후 폐기**.
- 편집 모달이 character.birth로 prefill 시도 = undefined.

정정 (S85, S84의 데이터 모델 결손 정정):
- `renderCharacterForm` (신규 생성): character 객체에 **`birth: birth`** 필드 추가 → 미래 편집 prefill 보장.
- `renderCharacterEditForm`:
  - `character.birth` 있으면 prefill + 별자리 즉시 미리보기
  - 없으면 (S85 이전 생성 캐릭터) 빈 입력 + 안내 카피 "옛 캐릭터는 생년월일 저장 데이터가 없어 다시 입력해주세요"
  - 저장 시 birth 갱신 → 다음 편집 prefill 보장

마이그레이션:
- 옛 캐릭터 = 자동 마이그레이션 불가 (dayPillar는 60갑자 주기라 정확한 생년월일 역산 불가).
- 사용자가 편집 모달에서 한 번 다시 입력 = 이후 모든 편집 prefill 정합.

변경 파일:
- `src/render/character-form.js`: `renderCharacterForm` birth 보존 + `renderCharacterEditForm` prefill + 안내 카피.
- `game/service-worker.js` v60 → v61.

검증: 324/324 PASS (CSS-only + JS 단순 필드 추가, 회귀 0).

자비스 자기 점검 (10건째 결손):
- Sprint 084 진행 시 character schema에 birth 부재를 확인 못 함 = 편집 모달의 prefill 책임 인지 실패.
- 향후 룰: 데이터 편집 기능 신설 시 schema 점검 + 옛 데이터 마이그레이션 경로 명시 의무.

### 2.101.9. S86 - "활성" 배지 폐기 (후속 정정)

배경: 사용자 보고 "활성 표시는 뭐지?" + 캡쳐의 활성 배지가 편집 아이콘 위에 겹침.

원인:
- `.char-row.is-active` 룰 = 외곽선 accent + 배경 옅은 accent. 이미 충분한 시각 강조.
- `.char-row-active-badge` = "활성" 텍스트 배지 추가 표시 = **중복 정보**.
- Sprint 084 편집 버튼 신설(우측 44px) + 옛 휴지통(44px) + 배지 `right: 56px` = 편집 버튼 영역 겹침.

정정:
- `settings-page.js`: `char-row-active-badge` HTML 출력 폐기.
- CSS 룰은 dead 잔존 (다음 cleanup sprint에서 폐기 검토).

변경 파일:
- `src/render/settings-page.js`: charRows 안 배지 출력 제거.
- `styles/main.css`: 배지 룰에 dead 메모 주석.
- `game/service-worker.js` v61 → v62.

검증: 324/324 PASS (회귀 0).

자비스 자기 점검 (11건째 결손):
- Sprint 084 편집 버튼 신설 시 기존 우측 영역(휴지통 + 배지) 충돌 점검 안 함.
- 향후 룰: 행/카드 우측 액션 영역 추가 시 기존 absolute 포지셔닝 요소 전수 grep 의무.

### 2.101.10. S87 - 프리셋 기본값 복원 confirm 텍스트 동적화

배경: 사용자 보고 "프리셋 관리에서 기본값 복원을 눌렀는데 왜 예전 데이터로 돌아가는 거지?". 캡쳐의 confirm "기본 3종 (균형 / 분산파 / 운세파)으로 되돌릴까요?".

원인:
- settings-page.js line 249의 confirm 텍스트가 **하드코딩** "균형 / 분산파 / 운세파" (옛 디폴트).
- Sprint 075에서 DEFAULT_PRESETS 갱신(운세/균형/분산)했으나 본 confirm 텍스트 갱신 누락.
- **실제 reset 동작은 정상** (savePresets에 새 DEFAULT_PRESETS 전달). confirm 텍스트만 옛 라벨.

정정:
- confirm 텍스트를 `DEFAULT_PRESETS.map(p => p.label).join(' / ')` 동적 산출로.
- 미래 DEFAULT_PRESETS 변경 시 자동 정합.

변경 파일:
- `src/render/settings-page.js`: reset-presets 핸들러 confirm 텍스트 동적화.
- `game/service-worker.js` v62 → v63.

검증: 324/324 PASS (회귀 0).

자비스 자기 점검 (12건째 결손):
- Sprint 075 DEFAULT_PRESETS 갱신 시 라벨 사용처 grep 미실시.
- 향후 룰: 데이터 상수 라벨/값 변경 시 하드코딩 라벨 사용처 전수 grep 의무.

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

- `docs/01_spec.md` + `docs/02_data.md` 본문 "추첨 탭" 다수 표기 sweep = SSOT 정합 영역. 별도 후속 sprint (docs sweep) 권장.
- S088 메모 "PROGRESS_ARCHIVE의 옛 '전체 비우기' 표기는 역사 흔적으로 보존": 본 cleanup 영역 외 그대로 유지.
- icons.js 주석은 사용자 명시 보존 영역.


