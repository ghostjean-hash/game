# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-17 (Sprint 087 - 프리셋 기본값 복원 confirm 동적화 + docs/04_conventions.md 9장 자비스 작업 룰 신설 + commit/push).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리**: 1차 2026-05-04 (Sprint 010 이전 ~ 031 + 옛 백로그 3.-18 ~ 3.0 archive 이전). 2차 2026-05-08 (Sprint 032~039 추가 archive 이전). 3차 2026-05-10 (Sprint 040~059 추가 archive 이전). 4차 2026-05-16 (Sprint 060~064 추가 archive 이전). 5차~8차 2026-05-16 (Sprint 065~068 각각 강제 이전). 9~13차 2026-05-17 (Sprint 069~073 각각 강제 이전). 직전 5 Sprint + 본 sprint(들)만 본 파일에 활성. `PROGRESS_ARCHIVE.md` 참조.
1.6. **PROGRESS.md 길이 정책 (S72, 2026-05-16 룰화)**: 활성 sprint 절 **최대 7건**(직전 5 + 본 sprint 묶음). 8건 초과 시 가장 옛 sprint 1건을 `PROGRESS_ARCHIVE.md` 강제 이전. archive는 무제한. 자연 약 350~500줄 유지.

# 2. 완료 마일스톤 (활성: 직전 5 Sprint + 본 sprint)

> 이전 Sprint 이력(2.1 ~ 2.94, M0~M6 / 폴리싱 / Sprint 010~073) → `PROGRESS_ARCHIVE.md` 참조.

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

## 2.97. Sprint 076 완료 - 캐릭터 카드 흉일 시각/동작 결손 정정 (S76, 2026-05-17)

배경: 사용자 캡쳐 2건 (고스트 흉일 + 마녀 평일). "유저 정보 접히기 펼치기가 오류남. 다른 유저는 접히는데, 고스트 유저만 이상하게 표시됨". 자비스 분석 결과 = 흉일(FORTUNE_BAD) 한정 결손 2건.

### 2.97.1. 결손 진단 (흉일 한정)

| # | 결손 | 원인 |
|---|---|---|
| 시각 | 좌측 ▼(흉 글리프) + 우측 ▲(caret) + 카드 본체 ▼(흉 아이콘) = ▼ 3개 시각 충돌 | `character-summary.js` `FORTUNE_GLYPH[FORTUNE_BAD] = '▼'` + `character-card.js` `FORTUNE_ICON[FORTUNE_BAD] = '▼'`. caret(▼/▲)과 동일 모양 |
| 동작 | 사용자가 ▲ 클릭으로 접어도 강제 펼침 유지 | `main.js` line 562 `isExpanded = !state.charCardCollapsed \|\| fortune === 'bad'`. 흉일 보호 카피 노출 정책(S36)이 사용자 접기 의도 무시 |

다른 운세는 글리프 ★(대길) / ◆(길) / ●(평)이라 caret과 시각 명확 구분 + 강제 펼침 없음 → 마녀(평) 캐릭터는 정상 동작 = 사용자 시각 차이 확인.

### 2.97.2. 정정안 (자비스 단일 결정 + 사용자 승인)

| 영역 | 이전 | 이후 |
|---|---|---|
| 흉 글리프 (toggle row) | `▼` | **`✕`** (caret과 완전 다른 모양 + "흉=나쁨" 의미 직관) |
| 흉 아이콘 (카드 본체) | `▼` | **`✕`** (시각 일관성) |
| 흉일 강제 펼침 정책 | `isExpanded = !collapsed \|\| fortune === 'bad'` | **`isExpanded = !collapsed`** (강제 폐기. 사용자 명시 접기 의도 존중) |

흉일 보호 카피는 첫 진입 default(`charCardCollapsed = false`) 시 자연 펼침으로 노출. 사용자가 접으면 본인 책임 영역 = 학습 정상 동작.

### 2.97.3. 변경 파일

- `src/render/character-summary.js`: `FORTUNE_GLYPH[FORTUNE_BAD]` ▼ → ✕ + S76 주석.
- `src/render/character-card.js`: `FORTUNE_ICON[FORTUNE_BAD]` ▼ → ✕.
- `src/render/main.js` line 562: 강제 펼침 폐기 + 주석 갱신.
- `docs/01_spec.md` 5.1.6: 흉 글리프 ▼→✕ + 강제 펼침 폐기 정책 명시.
- `docs/02_data.md` 1.20.3: 강제 펼침 폐기 메모 (`lotto_char_card_collapsed` 행).
- `game/service-worker.js` v50 → v51.

### 2.97.4. 검증

- `node tests/run-node.js` → **322 / 322 PASS** (회귀 0, JS 매핑 + 정책 폐기, 단위 테스트 영향 없음).
- ▼ 글리프 잔존 grep (character-summary.js + character-card.js): 0건.
- 다른 운세(대길/길/평) 글리프 영향 0 = 다른 캐릭터 시각 변동 없음.

### 2.97.5. 사용자 인상 직접 대응

- 고스트(흉) 캐릭터 화면 = 좌측 ✕(빨강) + 우측 ▲(회색 caret). 더 이상 같은 모양 화살표 중복 없음.
- 카드 본체 "운세 · 흉" 옆 = ✕ (▼ 폐기).
- 사용자가 ▲ 클릭 = 정상 접힘 (강제 펼침 정책 폐기).
- 마녀(평) 캐릭터는 변동 없음 (글리프 ● 그대로, 강제 펼침 영향 0이었음).

### 2.97.6. 자비스 사전 검증 결손 사고 5건째

S43.1 / S69 / S72 / S74 / S76 = 동일 패턴 (시각 / 매핑 결손). 본 결손은 사용자 캡쳐 없이 코드만 봐서는 발견 어려운 영역. 향후 시각 매핑 상수(`FORTUNE_GLYPH`, `STRATEGIES.short` 등) 변경 / 추가 시 **"caret / icon / glyph 시각 충돌 점검" 의무**. 본 sprint = 5건째 결손이지만 사용자 캡쳐 1건으로 즉시 발견 = 사용자 시각 점검의 가치.

### 2.97.7. Sprint 069 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 069(절 2.90, 하단 탭 콘텐츠 가림) archive 이전. 본 sprint 종료 시점 활성 = 070~076 = 7건 정합. archive 9차 정리.

## 2.96. Sprint 075 완료 - DEFAULT_PRESETS 순서/라벨/묶음 재정렬 + 프리셋 미선택 차단 (S75, 2026-05-16)

배경: 사용자 명시 2건. (1) "전략 프리셋이 선택되지 않았는데 세트 추천을 하네? 프리셋 미선택일 경우 추천 차단". (2) 기본값 순서 변경: 1.운세 / 2.균형 / 3.분산(직감 X, 균형, 사주).

### 2.96.1. 사용자 답변 확정 (AskUserQuestion 좁히기)

| 질문 | 답변 |
|---|---|
| 분산 묶음 정확 구성 | **균형 + 사주 (2전략)** = `[balancer, fiveElements]` |
| 슬롯 라벨 | **"운세 / 균형 / 분산" 짧게** (옛 `-파` 어미 폐기) |
| 미선택 시 차단 방식 | **버튼 disabled + 기본값 자동 선택 (슬롯 1)** |

### 2.96.2. DEFAULT_PRESETS 재정렬

| 슬롯 | 이전 | 이후 |
|---|---|---|
| 1 | 균형 (`trendFollower`/`astrologer`/`intuitive`) | **운세** (`astrologer`/`fiveElements`/`zodiacElement`) |
| 2 | 분산파 (`regressionist`/`intuitive`/`balancer`) | **균형** (`trendFollower`/`astrologer`/`intuitive`) |
| 3 | 운세파 (`astrologer`/`fiveElements`/`zodiacElement`) | **분산** (`balancer`/`fiveElements`) |

분산 = 2전략 (다른 슬롯 3전략 대비 컴팩트). 사용자 명시 "직감(X), 균형, 사주" 그대로 해석.

### 2.96.3. 프리셋 미선택 시 추천 차단 (3계층 방어)

| 계층 | 위치 | 동작 |
|---|---|---|
| 1. 진입 차단 | `character-form.js` | 신규 캐릭터 `lastUsedStrategies = DEFAULT_PRESETS[0].strategyIds` 자동 활성 (슬롯 1 운세). 옛 `[STRATEGY_DEFAULT]=BLESSED` 단독 진입이 어느 프리셋과도 불일치 → 추천되던 버그 정정 |
| 2. UI 차단 | `saved-sets-section.js` `savedSetsAddBarHtml(presetSelected)` 인자 | false면 + 1세트 / + 5세트 `disabled` + "아래 프리셋을 선택하세요" hint |
| 3. 가드 | `main.js` `addSavedSetsBatch` | `isAnyPresetActive` 체크. UI 우회 click(키보드 ENTER 등) 차단 |

3계층 = DOM disabled 우회 / 키보드 / future 코드 진입 모두 cover.

### 2.96.4. 옛 사용자 마이그레이션 - 보수적 보존

`storage.js` `loadPresets`에 자동 마이그레이션 **폐기 결정**. 사유:
- 옛 디폴트 라벨 일치 + 묶음 편집 흔적 있는 케이스(예: subtitle 잔존)에서 사용자 편집 무시될 위험.
- 기존 사용자가 새 디폴트를 원하면 설정 탭 "기본값 복원" 버튼으로 명시 갱신 가능 (사용자 결정 영역).
- 신규 캐릭터는 character-form.js에서 슬롯 1 자동 활성으로 즉시 새 디폴트 적용 = 진입 경로 분리.

S43.7 옛 마이그레이션(모두-직감-단독 reset)은 보존 (Sprint 053 임시 단순화 잔재 정리용).

### 2.96.5. 변경 파일

- `src/data/numbers.js`: `DEFAULT_PRESETS` 갱신.
- `src/data/storage.js`: S75 자동 마이그레이션 폐기 결정 메모.
- `src/render/character-form.js`: 신규 캐릭터 `lastUsedStrategies = DEFAULT_PRESETS[0]`.
- `src/render/main.js`: `isAnyPresetActive` 헬퍼 + addSavedSetsBatch 가드 + presetSelected 인자 전달.
- `src/render/saved-sets-section.js`: `savedSetsAddBarHtml(presetSelected)` 인자 + "프리셋을 선택하세요" hint.
- `docs/02_data.md` 1.20.2: DEFAULT_PRESETS 표 갱신 + S75 변경 사유.
- `tests/suites/storage.test.js`: line 132 단언 갱신 (옛 '균형' → 동적 originalLabel).
- `tests/suites/strategy-picker.test.js`: DEFAULT_PRESETS 구성 회귀 1건 추가.
- `game/service-worker.js` v49 → v50.

### 2.96.6. 검증

- `node tests/run-node.js` → **322 / 322 PASS** (321 → 322, S75 회귀 1건 추가).
- 회귀 차단:
  - `DEFAULT_PRESETS[0].label === '운세'` / `[1].label === '균형'` / `[2].label === '분산'` 단언
  - 묶음 정확 일치 단언 (sort-join 비교)
  - 분산 슬롯 length === 2 단언 (2전략임을 명시)

### 2.96.7. 사용자 화면 기대 변동

- **신규 캐릭터**: 슬롯 1 운세 자동 활성. + 1세트 / + 5세트 즉시 사용 가능.
- **기존 캐릭터**: lastUsedStrategies가 어느 프리셋과도 일치 안 하면 + 버튼 disabled + "프리셋을 선택하세요" hint. 사용자가 슬롯 1~3 중 하나 클릭하면 즉시 활성.
- **기존 프리셋 데이터**: 보수적 보존. 새 디폴트 원하면 설정 탭 "기본값 복원".

### 2.96.8. Sprint 068 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 068(절 2.89, 모바일 풀스코프) archive 이전. 본 sprint 종료 시점 활성 = 069~075 = 7건 정합. archive 8차 정리.

## 2.95. Sprint 074 완료 - strategyShort 매핑 6건을 label[0]로 통일 (S74, 2026-05-16)

배경: 사용자 캡쳐 + 보고. 균형 프리셋(최신·별자리·직감) 5세트 추천 시 출처 라벨에 "추 / 직 / 별 / 점 / 안" 등 노출. 사용자 명시 "실제 전략의 머리글자로 모두 변경. 예시: 최신 → 추(현재)가 아니라 최(개선)".

### 2.95.1. 원인 - S21/S22 옛 약자가 S34/S35 label 변경 후 정정 누락

`src/render/strategy-picker.js` `STRATEGIES`의 `short` 필드가 S21(2026-05-03 통계 라벨 직관화) / S22(2026-05-03 dot → 1글자 라벨) 시점의 옛 약자("추세/별빛/안나옴/축복/원소/점성") 그대로. 이후:
- S34 (2026-05-08): 짝꿍 폐기 + 통계 카테고리 4종.
- S35 (2026-05-08): "축복" → "랜덤" label 변경. short는 "축" 잔존.

label 변경 시 short 동반 갱신 누락 = 결손 누적. 사용자 인상 "라벨이 전략과 다름" 직접 원인.

### 2.95.2. 매핑 6건 정정

| id | label | 이전 short | 이후 short |
|---|---|---|---|
| BLESSED | 랜덤 | 축 | **랜** |
| TREND_FOLLOWER | 최신 | 추 | **최** |
| SECOND_STAR | 보너스 | 별 | **보** |
| REGRESSIONIST | 적게 | 안 | **적** |
| ASTROLOGER | 별자리 | 점 | **별** |
| ZODIAC_ELEMENT | 4원소 | 원 | **4** |
| 그 외 (많이/사주/직감/균형) | - | label[0] 일치 | 변동 없음 |

**4원소의 short = "4"** 결정: 사용자 명시 "label 머리글자" = `label[0]`. 4원소의 [0] = "4". 시각 어색할 수 있으나 사용자 명시 정합 우선. 후속 변경 가능.

### 2.95.3. 변경 파일

- `src/render/strategy-picker.js`: `STRATEGIES` short 6건 갱신 + S74 주석.
- `docs/01_spec.md` 5.1.3.1: short 매핑 "축/추/많/짝/별/안/점/원/사/직/균" → "랜/최/많/보/적/별/4/사/직/균" + S74 정정 사유 명시.
- `tests/suites/strategy-picker.test.js` 신설: 회귀 11건 (10 매핑 직접 단언 + 1 label[0] 자동 정합 단언).
- `tests/runner.js`: 새 suite 등록.
- `game/service-worker.js` v48 → v49.

### 2.95.4. 검증

- `node tests/run-node.js` → **321 / 321 PASS** (310 → 321, 11건 신규 모두 통과).
- 회귀 차단 구조: `strategyShort(id) === strategyLabel(id)[0]` 단언 모든 10전략 cover. 향후 label 변경 시 short 미갱신 = 즉시 fail.

### 2.95.5. 사용자 화면 기대 변동

캡쳐 케이스 (균형 = trendFollower + astrologer + intuitive) 재실행 시:
- "추" → **"최"** (trendFollower / 최신 top K 안 번호)
- "점" → **"별"** (astrologer / 별자리 lucky 안 번호)
- "직" → 변동 없음 (intuitive 폴백)

분산파 프리셋 (regressionist + intuitive + balancer):
- 옛 "안" → **"적"**

운세파 프리셋 (astrologer + fiveElements + zodiacElement):
- 옛 "점" → **"별"**
- 옛 "원" → **"4"**
- "사" 변동 없음

### 2.95.6. Sprint 067 archive 강제 이전 (룰 1.6 자동 적용)

본 sprint 진입 시점 활성 = 067~073 + 074 = 8건. 룰 1.6 초과 → Sprint 067(절 2.88, 작위성 정량 검증) archive로 자동 이전. 본 sprint 종료 시점 활성 = 068~074 = 7건 정합. archive 7차 정리.

Sprint 067은 큰 sprint(절 14개)이라 archive 이전으로 PROGRESS.md 약 155줄 회수. 향후 검색 / 회귀 디버그 시 `PROGRESS_ARCHIVE.md` 2.88 참조.

### 2.95.7. 자비스 사전 검증 결손 사고 4건째

S43.1 / S69 / S72 / S74 = 동일 패턴 (label / short / 라벨 매핑 결손). 향후 `STRATEGIES` 등 매핑 자산 변경 시 **"매핑 필드별 SSOT 정합 단언" 의무**. S74의 `strategyShort === strategyLabel[0]` 자동 단언이 그 모범.

