# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-10 (Sprint 060~065 - 토스트 위치 / 펄스 시각 정정 / 프리셋 편집 진입 이동 / 부제 폐기 + 자동 list / storage 테스트 보강 / sync* fetch mock 회귀).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리**: 1차 2026-05-04 (Sprint 010 이전 ~ 031 + 옛 백로그 3.-18 ~ 3.0 archive 이전). 2차 2026-05-08 (Sprint 032~039 추가 archive 이전). 3차 2026-05-10 (Sprint 040~059 추가 archive 이전). 직전 5 Sprint(060~064)만 본 파일에 활성. `PROGRESS_ARCHIVE.md` 참조.

# 2. 완료 마일스톤 (활성: 직전 5 Sprint)

> 이전 Sprint 이력(2.1 ~ 2.60, M0~M6 / 폴리싱 / Sprint 010~039) → `PROGRESS_ARCHIVE.md` 참조.

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

