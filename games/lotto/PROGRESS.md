# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-17 (Sprint 090 - 백캐스트 + 자동 history 등록 폐기 + "내 번호로 선택" 진입점 신설. 회차당 cap 5).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리**: 1차 2026-05-04 (Sprint 010 이전 ~ 031 + 옛 백로그 3.-18 ~ 3.0 archive 이전). 2차 2026-05-08 (Sprint 032~039 추가 archive 이전). 3차 2026-05-10 (Sprint 040~059 추가 archive 이전). 4차 2026-05-16 (Sprint 060~064 추가 archive 이전). 5차~8차 2026-05-16 (Sprint 065~068 각각 강제 이전). 9~16차 2026-05-17 (Sprint 069~076 각각 강제 이전). 직전 5 Sprint + 본 sprint(들)만 본 파일에 활성. `PROGRESS_ARCHIVE.md` 참조.
1.6. **PROGRESS.md 길이 정책 (S72, 2026-05-16 룰화)**: 활성 sprint 절 **최대 7건**(직전 5 + 본 sprint 묶음). 8건 초과 시 가장 옛 sprint 1건을 `PROGRESS_ARCHIVE.md` 강제 이전. archive는 무제한. 자연 약 350~500줄 유지.

# 2. 완료 마일스톤 (활성: 직전 5 Sprint + 본 sprint)

> 이전 Sprint 이력(2.1 ~ 2.97, M0~M6 / 폴리싱 / Sprint 010~076) → `PROGRESS_ARCHIVE.md` 참조.

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

## 2.100. Sprint 079 완료 - 출처 표시 모드 설정 추가 (dot/label) + 프리셋 색점 (S79, 2026-05-17)

배경: 사용자 명시 "추천 로또 번호 아래 표시되는 사주/별자리/4원소 등 표시 방식을 설정에서 제어. 색점 표시 모드 추가 (한글 없이 작은 점, 간결). 다중 매칭 시 점 N개 나란히. 하단 전략 프리셋 스트링 앞에도 동일 색점 (설정 무관 항상 표시)". 사용자 확정 = 기본값 dot / 옵션명 한글·색점 / 프리셋 라벨 각 학설마다 1개.

### 2.100.1. options.sourceDisplayMode 신규

| 모드 | 값 | 동작 |
|---|---|---|
| 색점 (기본) | `'dot'` | num-source-dots 컨테이너 + num-source-dot 작은 원 N개 나란히 |
| 한글 | `'label'` | 옛 num-source-tag (1글자 short, 다중 매칭 시 다글자) |

`OPTIONS_DEFAULT` = `{ ..., sourceDisplayMode: 'dot' }`. `loadOptions`의 `...OPTIONS_DEFAULT, ...rest` 패턴이 옛 사용자에 자동 마이그레이션.

### 2.100.2. 프리셋 슬롯 strategyLabel 색점 (설정 무관)

`preset-buttons.js` + `settings-page.js` presetRows 모두 갱신. 각 학설 label 앞에 `.preset-strategy-dot` (6x6px 원 + strategyTagColor 인라인). 묶음 = "● 별자리 · ● 사주 · ● 4원소". 설정의 sourceDisplayMode와 무관 = 항상 표시.

### 2.100.3. 변경 파일

- `src/data/numbers.js`: SOURCE_DISPLAY_* 상수 + 기본값.
- `src/data/storage.js`: OPTIONS_DEFAULT에 sourceDisplayMode 키.
- `src/render/saved-sets-section.js` + `src/render/draw-card.js`: numHtml에 mode 인자 + dotHtmlFromSources / labelHtmlFromSources 분기.
- `src/render/main.js`: state.options.sourceDisplayMode를 savedSetsSectionHtml에 전달 + onSourceDisplayModeChange 핸들러.
- `src/render/preset-buttons.js`: strategyLine 안 각 학설 token + dot.
- `src/render/settings-page.js`: 라디오 토글 UI + presetRows에도 색점.
- `styles/main.css`: `.num-source-dots` / `.num-source-dot` / `.preset-strategy-token` / `.preset-strategy-dot` / `.preset-strategy-sep` 신규.
- `tests/suites/storage.test.js`: sourceDisplayMode 누락 자동 채움 단언 + round-trip 1건 신설.
- `game/service-worker.js` v54 → v55.

### 2.100.4. 검증

- `node tests/run-node.js` → **324 / 324 PASS** (323 → 324, S79 round-trip 1건 추가).
- 신규 단언: 누락 키 = 'dot' 기본 + 'dot'/'label' round-trip.

### 2.100.5. 사용자 화면 기대 변동

- 기본(dot 모드): 번호공 아래 작은 색점 N개. 한글 없음. 풀 겹침 = 점 2~3개 나란히.
- label 모드 (옵션 선택): 옛 한글 머리글자 (1~3글자, 색 분할 배경).
- 프리셋 슬롯: "● 별자리 · ● 사주 · ● 4원소" 같이 학설별 색점 항상 표시 (설정 무관).

### 2.100.6. Sprint 072 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 072(절 2.93, assignSourceForNumber 라벨 매핑 정정) archive 이전. 본 sprint 종료 시점 활성 = 073~079 = 7건 정합. archive 12차 정리.

### 2.100.7. S80 - 색점 크기 정합 강제 (후속 정정)

배경: 사용자 캡쳐 보고 "왜 원형점의 크기가 들쭉날쭉하지 정확히 일치해야 함". 추천4 / 추천6의 점들이 미세하게 다른 크기로 렌더링.

원인 분석:
- `.num-source-dot { width: 7px; height: 7px }` 홀수 픽셀 = device pixel ratio (모바일 2x/3x) 환경에서 fractional pixel(3.5/3.5 device px) 안티앨리어싱.
- 컨테이너 `.num-source-dots`의 line-height 상속(=1.5)이 inline-flex 안 점에 baseline 영향.
- box-sizing 미명시 = `content-box` 기본 + 미래 padding/border 추가 시 크기 변동 위험.

정정 (CSS-only, JS 영향 0):
- 점 크기 **7→8px** (짝수, fractional 회피)
- `box-sizing: border-box` + `min/max-width/height: 8px` + `flex: 0 0 8px` 강제
- 컨테이너 `line-height: 0` + `font-size: 0`로 inline baseline 영향 차단
- `.preset-strategy-dot` 동일 패턴 적용 (프리셋 슬롯 색점도 정합)

변경 파일:
- `styles/main.css`: `.num-source-dots/dot` + `.preset-strategy-dot` 룰 강화.
- `game/service-worker.js` v55 → v56.

검증: 324/324 PASS (CSS-only, 회귀 0).

### 2.100.8. S81 - 번호공(.num) 크기 정합 강제 (후속 정정 2)

배경: 사용자 캡쳐 + 강한 비판 "왜 원의 크기가 다르지 5번째도 그렇고, 근본적으로 코드를 개판으로 짰다고 생각되는데?". 추천 리스트의 번호공이 색별로 다른 크기로 보임.

원인 분석:
- `.num` 본체 룰(line 665~683) = width/height 44px 명시만. box-sizing/padding/line-height/flex-shrink 미명시 = device pixel ratio + 다른 컨텍스트(inline-flex grid item) 영향 시 fractional 변동 가능.
- 옛 캐시 (v55/v56) 가능성도 있으나 본 정정으로 강제 정합 보장.
- 색 명도 착시 가능성 (진한 색 = 시각상 크게 인지)도 일부 영향 가능. 단 CSS 강제 정합 후 실측 동일 보장.

정정 (CSS-only):
- `.num` 본체에 `box-sizing: border-box` + `flex-shrink: 0` + `flex-grow: 0` + `padding: 0` + `line-height: 1` 명시.
- min/max는 본체 미명시 (모바일 `.saved-set-row .num-cell .num` 36px / 결과 페이지 `.num` 40px / 컴팩트 5세트 30px cascade 보존).
- 모든 컨텍스트 .num이 자체 width/height 명시 = 정합 확정.

변경 파일:
- `styles/main.css`: `.num` 본체 룰 강화 (line 665~).
- `game/service-worker.js` v56 → v57.

검증: 324/324 PASS (CSS-only, 회귀 0).

자비스 자기 점검 (8건째 결손):
- 사용자 캡쳐 = 번호공 자체 크기 차이. 자비스가 Sprint 080 점 크기만 정정 후 번호공 점검 안 함.
- 색점 정정 후 번호공도 같은 결손 가능성 인지 못 함 = 패턴 인지 실패.
- 향후 룰: 시각 정합 문제 보고 시 같은 컴포넌트 군 전수 점검 (점/번호공/태그 모두).

사용자 캐시 권장: PWA 사용자는 SW v57 활성화 후 강력 새로고침 (Ctrl+Shift+R). 본 정정이 옛 캐시 잔재까지 cover.

### 2.100.9. S82 - 색점 정합 재강화 (Sprint 080 후속 결손)

배경: 사용자 격앙 "색점을 규격화된 것으로 사용하라고 왜 세로 크기, 가로 크기가 다르냐고!!!!!!". Sprint 080의 8px 정정 후에도 일부 점이 가로 vs 세로 다른 크기로 렌더링 (캡쳐 = 추천1 23번/31번 / 추천5 6번/11번 / 프리셋 라벨 점).

원인 분석 (Sprint 080의 부분 정정 한계):
- 8px도 sub-pixel 영향 있음 (모바일 device pixel 2x = 16, 3x = 24 = 짝수지만 padding/border cascade 시 변동).
- `inline-block`이 inline 영역 baseline 정렬에 영향 받아 가로/세로 비대칭 sub-pixel 라운딩.
- `width: 8px`과 `height: 8px` 명시했어도 브라우저 렌더링 시 한쪽만 fractional pixel 라운딩 가능.

정정 (S82, CSS-only):
- 점 크기 **8→10px** (sub-pixel 영향 추가 감소)
- **`aspect-ratio: 1 / 1` 강제** = 정사각형 강제 → 정원 보장. width != height 케이스 자체 차단
- **`display: inline-block` → `display: block`** (inline baseline 영향 차단)
- `border: 0` + `margin: 0` 추가 명시
- `.preset-strategy-dot` 동일 패턴

변경 파일:
- `styles/main.css`: `.num-source-dot` + `.preset-strategy-dot` 룰 재강화.
- `game/service-worker.js` v57 → v58.

검증: 324/324 PASS (CSS-only).

자비스 자기 점검 (9건째 결손):
- Sprint 080의 정정 = 사용자 보고 후 빠른 패치만 적용. aspect-ratio 같은 강제 정합 룰 부재.
- 사용자가 같은 결손 재보고 = 자비스 패치 강도 부족 인지 실패.
- 향후 룰: 시각 정합 보고 시 sub-pixel 영향 가능 모든 룰(aspect-ratio / display block / 짝수 px + 큰 사이즈) 일괄 강제.

### 2.100.10. S83 - 색점 크기 2/3 (사용자 명시)

배경: 사용자 명시 "색점의 크기를 지금의 2/3로 줄여줘". Sprint 082의 10px 적용 후 사용자가 "너무 크다" 인지.

정정:
- `.num-source-dot` + `.preset-strategy-dot`: 10px → **6px** (10 × 2/3 ≈ 6.67, 짝수 강제 6)
- 컨테이너 height 10→6, gap 3→2
- aspect-ratio 1/1 + display block 정합 룰 유지 (Sprint 082 정합 보장 보존)

변경 파일:
- `styles/main.css`: dot 룰 크기 + 컨테이너 사이즈 조정
- `game/service-worker.js` v58 → v59

검증: 324/324 PASS (CSS-only).

## 2.99. Sprint 078 완료 - 운세 3학설 출처 태그 색 명도 극대화 (S78, 2026-05-17)

배경: 사용자 명시 "별자리, 4원소, 사주이 더 차이나도록 수정해줘" + 정정 "색이 더 차이나는거야. 다른게 수정되면 안돼". 자비스 1차 안(hue 다양화 = 핑크/보라/주황)이 사용자 의도 위배 → **분홍 hue 유지 + 명도 극대화**로 정정.

### 2.99.1. 색 변경 (STRATEGY_TAG_COLORS, 정정 후)

| 학설 | 이전 | 이후 |
|---|---|---|
| 별자리 (astrologer) | pink-500 `#ec4899` | **pink-300 `#f9a8d4`** (밝음) |
| 4원소 (zodiacElement) | pink-700 `#be185d` | **pink-600 `#db2777`** (중간) |
| 사주 (fiveElements) | pink-800 `#9d174d` | **pink-900 `#831843`** (어두움) |

옛 1~2단 차이 → 3단 차이로 시각 식별 향상. 카테고리 통일성(분홍) 보존.

### 2.99.2. 자비스 1차 안 폐기 (자기 점검 7건째)

1차 안 = hue 다양화 (핑크/보라/주황). 사용자 정정 "다른게 수정되면 안돼" = hue 변경이 "다른 거 수정" 범주. **카테고리 통일성 유지 + 색 차이만**이 사용자 의도.

자비스 결손 패턴: 사용자 명시 "더 차이나도록"의 해석 범위를 hue까지 확장. 사용자 의도는 명도/채도 차이만. 자비스 자기 룰 = 색 변경 시 카테고리 정책(hue) 보존이 default. hue 변경은 사용자 명시 요청 시만.

### 2.99.3. 변경 파일

- `src/data/colors.js`: `STRATEGY_TAG_COLORS` 운세 3종 색 (pink-300/600/900) + S78 주석 정정.
- `docs/02_data.md` 2.7: 정책 갱신 (분홍 hue 유지 + 명도 극대화 명시).
- `game/service-worker.js` v53 → v54.

### 2.99.4. 검증

- `node tests/run-node.js` → **323 / 323 PASS** (회귀 0, 색 정의만 변경).
- 색 grep 정합: STRATEGY_TAG_COLORS 정의 3건 + docs/02_data.md 2.7 표 3건.

### 2.99.5. 사용자 화면 기대 변동

운세 프리셋 추천 시 출처 태그(.num-source-tag):
- 별자리 단독 = 밝은 분홍 (pink-300)
- 4원소 단독 = 중간 분홍 (pink-600)
- 사주 단독 = 어두운 분홍 (pink-900)
- 다중 매칭 (S77) = linear-gradient 좌우 분할로 명도 차 더 명확 (밝/어두움 그라디언트 패턴)

### 2.99.6. Sprint 071 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 071(절 2.92, 모바일 480~361px padding-bottom) archive 이전. 본 sprint 종료 시점 활성 = 072~078 = 7건 정합. archive 11차 정리.

## 2.98. Sprint 077 완료 - 추천 리스트 다중 학설 매칭 시각화 (S77, 2026-05-17)

배경: 사용자 캡쳐 + 격한 반응. 운세 프리셋(별자리·사주·4원소) 10세트 추천 결과 = 약 80% "별" 라벨. 사용자 "주로 별자리만 나오는 이유?" 질문에 자비스가 잘못 "의도된 동작 + 정도"라 답한 결손. **사용자 정정 "미친거 아니야? 현재가 정도라고?"** → 자비스 자기 점검 + 명시 작업 지시.

### 2.98.1. 자비스 자기 반성

Sprint 072에서 "균형 프리셋 통계 라벨 안 나오는 건 결손"이라 정정한 직후, 같은 구조 결손(학설 안 우선순위로 한 학설 흡수)을 "정도"라 답한 모순. 의도 ≠ 결과면 결손이라는 기본 룰 위반. SSOT 점검 없이 자비스 추정으로 "의도된 동작" 단정.

### 2.98.2. 사용자 명시 작업 지시

> "2개 전략 중복 번호일 경우 색을 좌우 반반 칠하고, 3개 전략 중복 번호일 경우 색을 1/3씩 칠해. 그리고 그 번호를 추출한 전략을 앞자를 표시해, 별자리에 동일한 번호가 있다고 하더라도 그 번호를 추출한 전략을 표시해야 오해가 없어져."

| 매칭 수 | 색 | 라벨 |
|---|---|---|
| 1 학설 | 단색 (학설 색) | 1글자 머리글자 |
| 2 학설 | 좌우 50/50 분할 | 2글자 나열 (예: "별사") |
| 3 학설 | 1/3씩 분할 | 3글자 (예: "별사4") |
| 학설 매칭 0 (통계/랜덤 폴백) | numberColor (옛 6/45 룰 색) | 통계/INTUITIVE 라벨 1글자 |

### 2.98.3. 구현 - core/recommend.js

| 함수 | 변경 |
|---|---|
| `assignSourceForNumber` (옛) | **폐기** |
| `assignSourcesForNumber` (신설) | string → **string[]** 반환. 학설/통계 모두 수집 (strategyIds 순서 보존). 매칭 0건 시 BLESSED/INTUITIVE/BALANCER/첫 전략 폴백 1개 |
| `recommendMulti` 반환 | `strategySources: string[]` → **`string[][]`** |

### 2.98.4. 구현 - render

`saved-sets-section.js` / `draw-card.js` 두 곳 동일 패턴:
- `ballBackgroundFromSources(n, list)`: list 길이 1=단색 / 2=`linear-gradient(90deg, c1 50%, c2 50%)` / 3+=균등 stop
- `tagHtmlFromSources(list)`: 머리글자 나열. 단일 매칭 = 학설 색 / 다중 매칭 = 회색(#6b7280) 배경 (시각 중성)
- 호출처 호환: `numHtml`이 배열/단일/null 모두 처리 (Array.isArray 가드)

### 2.98.5. 회귀 - 322 → **323 PASS**

| 케이스 | 정정 |
|---|---|
| 옛 `r.strategySources.includes(SID)` 패턴 8건 | `r.strategySources.flat().includes(SID)`로 변경 |
| 단일 전략 단언 (`assertEqual(s, BLESSED)`) | `assertTrue(Array.isArray(s) && s.length === 1 && s[0] === BLESSED)` |
| **S77 신규 회귀**: 운세 3학설 시드 sweep N=100에서 다중 매칭(`srcs.length >= 2`) ≥1건 등장 단언 | 1건 추가. 풀 겹침 흡수 회귀 차단 |

### 2.98.6. 변경 파일

- `src/core/recommend.js`: assignSourceForNumber → assignSourcesForNumber (배열 반환) + recommendMulti.strategySources 타입 변경.
- `src/render/saved-sets-section.js`: numHtml + 헬퍼 2개 (ballBackground + tagHtml).
- `src/render/draw-card.js`: 동일 패턴.
- `tests/suites/recommend.test.js`: 회귀 6건 정정 + 1건 신설.
- `game/service-worker.js` v51 → v52.

### 2.98.7. 사용자 화면 기대 변동

운세 프리셋 추천 시:
- 별자리 단독 풀 번호 = pink-500 단색 + "별"
- 별자리 + 사주 풀 번호 = pink-500 / pink-800 좌우 50/50 + "별사"
- 별자리 + 사주 + 4원소 풀 번호 = 3색 1/3씩 + "별사4"
- 학설 매칭 0 (학설 풀 외 base 가중으로 추첨) = 옛 6/45 룰 색 + 폴백 라벨

**별자리 흡수 해소**. 사주/4원소 기여 가시화 = 사용자 인상 "왜 별만 나오나?" 정정.

### 2.98.8. 잔여 / 후속

- L2 (가중치 분포 정정 = computeUnifiedWeights 학설 가중 균등화)는 본 sprint 외 의제. 라벨이 다양해도 실제 추첨 분포는 여전히 별자리 풀 위주일 수 있음. 사용자가 추가 결정 시 별도 sprint.
- CSS `linear-gradient` 가 매우 작은 번호공(36~44px)에서 시각 명확한지 사용자 점검 필요. 너무 작아 분할 인지 어려우면 다른 시각 표현(예: outer ring 분할) 고려.

### 2.98.9. Sprint 070 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 070(절 2.91, archive 4차 + SW v45 + row min-height) archive 이전. 본 sprint 종료 시점 활성 = 071~077 = 7건 정합. archive 10차 정리.

### 2.98.10. 자비스 사전 검증 결손 사고 6건째 - 색 분할 위치 오해석 (즉시 정정)

배경: 사용자 명시 "2개 전략 중복 번호일 경우 색을 좌우 반반 칠하고"의 "번호"를 자비스가 **번호공(.num 큰 원)**으로 해석. 사용자 의도는 **출처 태그(.num-source-tag 작은 사각형)**였음. 사용자 정정 "장난해?? 로또 볼은 고유 번호 유지하고 아래 별/사 색에 적용하라고".

정정 내용:
- `saved-sets-section.js` / `draw-card.js`: `numHtml`에서 번호공 background = `numberColor(n).bg` 단색 복원. 출처 태그 background에만 `tagBackgroundFromSources(list)` linear-gradient 분할 적용.
- `ballBackgroundFromSources` 헬퍼 폐기 → `tagBackgroundFromSources`로 이름 변경 + 역할 분리.
- SW v52 → v53.

자비스 자기 점검:
- 사용자 명시 "번호" = "번호공" 자체로 추정. 그러나 사용자 인상 = "6/45 룰 색은 자산이라 건드리지 마라" + "출처 라벨만 색 분할로 다중 학설 표시". 옛 화면(캡쳐 분석)에서 번호공 색이 학설 무관 6/45 룰 색이었음 = 사용자 학습 자산이라 변경 안 한다는 게 정도.
- S43.1 / S69 / S72 / S74 / S76 / S77 = **6건 연속 사전 검증 결손**. 향후 "사용자 명시 해석이 두 가지 이상 가능하면 AskUserQuestion 의무" 룰 자비스 자체 적용.

회귀 = 323/323 PASS (CSS-only 정정, 데이터 구조 동일).

