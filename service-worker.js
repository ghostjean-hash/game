// Cache version. 배포마다 bump해서 stale 캐시 무효화.
// v9~v39 (2026-05-03 ~ 2026-05-09): service-worker-history.md archive 이전 (S73 / F4, 2026-05-16).
// v40 (2026-05-10): lotto S60 - 누적 추천 토스트를 액션바 인라인 → 화면 하단 fixed 팝업으로 이동 + 추가된 세트 카드 1초 펄스("어디에" 시각 연결). 누적 리스트가 길어 액션바 밀려도 메시지 인지 보장. SSOT: docs/01_spec.md 5.2.5.4 / docs/02_data.md 1.5.8.6.6~7. 신규 토큰 --z-toast / 신규 상수 SAVED_SETS_JUST_ADDED_MS.
// v41 (2026-05-10): lotto S61 - 프리셋 편집 진입점을 추첨 탭 "편집" 텍스트 링크 → 설정 탭 "프리셋 관리" 섹션으로 이동. 추첨 탭 정리(편집은 정착 후 자주 발생 X). 설정 탭 슬롯 행 클릭 = 기존 모달 재활용. 기본값 복원 버튼 설정 탭에도 노출. dead CSS(.preset-edit-row / .preset-edit-link) 폐기.
// v42 (2026-05-10): lotto S62 - is-just-added 펄스 시각 정정. inset 외곽선 + radius-sm → ::before pseudo + radius-md + 외부 글로우 + 좌우 8px inset. row 좌우 padding 0이라 외곽선이 "추천N" 라벨에 붙어 답답하던 사용자 보고 fix. row layout 영향 0(pseudo absolute). SSOT: docs/02_data.md 1.5.8.6.7.
// v43 (2026-05-10): lotto S63 - 프리셋 슬롯 부제 폐기 + 묶인 전략 label list 자동 표시. 사용자 보고 "애매한 설명보다 실제 선택된 전략 표시" 반영. PRESET_SUBTITLE_MAX 상수 / DEFAULT_PRESETS subtitle 필드 / 편집 모달 부제 입력 / .preset-subtitle / .preset-manage-subtitle 모두 폐기. 추첨 탭 .preset-strategy-line + 설정 탭 .preset-manage-strategies(strategyLabel 통일) 자동 생성. SSOT: docs/01_spec.md 5.1.5 / docs/02_data.md 1.20.
// v44 (2026-05-10): lotto S66 - is-just-added 펄스 영역 재정정 + 추천 리스트 좌측 padding 130%. 사용자 보고 "추천1,2 스트링 중간만 하이라이트". 펄스 영역을 row 전체 → .saved-set-balls(번호공 컨테이너)로 좁힘. 라벨/휴지통 영역 펄스 무관. 좌측 padding 1.5배 → 1.5*1.3배 (18px → 23.4px). SSOT: docs/02_data.md 1.5.8.6.7.
// v45 (2026-05-16): lotto S68 + S69 + S70 일괄 cache busting. S68 모바일 풀스코프(:hover 26룰 (hover:hover) 가드 + --touch-min 토큰 + tap-highlight transparent) / S69 하단 탭 토큰화(--bottom-tab-h / --bottom-tab-h-sm + #app padding-bottom 88px+safe) / S70 목록 행 min-height 토큰화(--list-row-min-h). S68 / S69는 CSS만 변경하고 SW bump 누락했던 결손을 본 sprint에서 일괄 회수. PWA 옛 v44 캐시(sticky hover / 옛 탭 높이) 일괄 폐기. SSOT: PROGRESS.md 2.91.
// v46 (2026-05-16): lotto S71 - 모바일 480~361px 구간 #app padding-bottom 12+safe → 88+safe(--bottom-tab-h + --space-6 + safe). Sprint 069가 데스크톱(line 1199)과 360px↓(line 2711)만 토큰화하고 480~360 구간을 누락한 결손 정정. 사용자 보고 "모바일 페이지 하단이 아래 탭에 가려서 안 보임" 직접 대응. SSOT: PROGRESS.md 2.92.
// v47 (2026-05-16): lotto S72 - assignSourceForNumber 통계 카테고리 라벨 매핑 결손 정정. 사용자 보고 "균형 프리셋 선택했는데 6개 중 5개가 직, 1개만 별. 최 라벨이 0개". Sprint 043 architecture 재구축 시 통계 전략(trendFollower/statistician/regressionist/secondStar)의 라벨 매칭 로직 누락 → INTUITIVE catch가 통계 도달 전 가로채는 구조. 통계 top K 분기 신설 + 우선순위 재정렬(학설 → 통계 → BLESSED → INTUITIVE → BALANCER → 첫). 회귀 테스트 305 → 307. SSOT: PROGRESS.md 2.93.
// v48 (2026-05-16): lotto S73 - F1~F5 일괄 cleanup. F1 STAT_LABEL_TOP_K → src/data/numbers.js 이전(매직 넘버 0). F2 docs/01_spec.md 5.1.3.0에 라벨 우선순위 표 명시(SSOT). F3 statistician/regressionist/secondStar 분기별 회귀 3건(307→310). F4 v9~v39 SW 헤더 service-worker-history.md archive. F5 .next-draw-num 매직 64/56/50 → --countdown-num/-sm/-xs 토큰화. SSOT: PROGRESS.md 2.94.
// v49 (2026-05-16): lotto S74 - strategyShort 매핑 6건을 label[0]로 통일. 사용자 보고 "균형 프리셋 캡쳐에서 최신→추 / 별자리→점 / 보너스→별 / 적게→안 / 랜덤→축 불일치 = 라벨이 전략과 다름". S21/S22 옛 약자 매핑이 S34/S35 label 변경 후 누락된 결손. STRATEGIES short 필드 6건(축→랜/추→최/별→보/안→적/점→별/원→4) 정정 + tests/suites/strategy-picker.test.js 회귀 11건 신설 + docs/01_spec.md SSOT 갱신. 회귀 310→321 PASS. SSOT: PROGRESS.md 2.95.
// v50 (2026-05-16): lotto S75 - DEFAULT_PRESETS 순서/라벨/묶음 재정렬 + 프리셋 미선택 시 + 버튼 차단. 사용자 명시 "1.운세 / 2.균형 / 3.분산(균형+사주)" + "전략 프리셋이 선택되지 않을 경우 세트 추천 차단". 신규 캐릭터 lastUsedStrategies = DEFAULT_PRESETS[0] 자동 활성(옛 [STRATEGY_DEFAULT]=BLESSED 단독이 어느 프리셋과도 불일치 → 추천되던 버그). savedSetsAddBarHtml(presetSelected) 인자 + isAnyPresetActive 가드(UI 우회 click 차단). DEFAULT_PRESETS 회귀 1건 + 옛 사용자 마이그레이션 폐기(보수적 보존). 회귀 321 PASS. SSOT: PROGRESS.md 2.96.
// v51 (2026-05-17): lotto S76 - 캐릭터 카드 흉일 시각/동작 결손 정정. 사용자 보고 "고스트(흉) 유저만 접기/펼치기 오류". (1) 흉 글리프 ▼ → ✕ (caret ▼/▲와 시각 충돌 정정. character-summary.js + character-card.js). (2) 흉일 강제 펼침 정책 폐기 (main.js line 562. 사용자 ▲ 클릭으로 접기 의도 존중. 보호 카피는 첫 진입 default 펼침으로 자연 노출). docs/01_spec.md 5.1.6 + docs/02_data.md 1.20.3 SSOT 갱신. SSOT: PROGRESS.md 2.97.
// v52 (2026-05-17): lotto S77 - 추천 리스트 다중 학설 매칭 시각화. 사용자 명시 "2전략 중복=좌우반반, 3전략=1/3씩, 별자리 동일 번호도 추출 전략 머리글자 표시". 옛 assignSourceForNumber 단일 우선순위가 별자리에 다른 학설 흡수 → 운세 프리셋이 "별만 보임" 인상. assignSourcesForNumber(배열 반환) + recommendMulti.strategySources = string[][] + 번호공 background = linear-gradient 분할(학설별 색) + 라벨 = 매칭 학설 머리글자 나열. 단일 매칭 시 옛 동작 동일. 회귀 322→323 PASS. SSOT: PROGRESS.md 2.98.
// v53 (2026-05-17): lotto S77 정정 - 색 분할 위치를 번호공(.num) → 출처 태그(.num-source-tag)로 이전. 사용자 명시 정정 "로또 볼 고유 번호 유지, 아래 별/사 색에만 적용". 번호공은 6/45 룰 numberColor 단색 복원. 출처 태그만 학설 색 분할. SSOT: PROGRESS.md 2.98.10.
// v54 (2026-05-17): lotto S78 - 운세 3 학설 출처 태그 색 명도 극대화. 사용자 명시 "별자리/4원소/사주 더 차이나도록" + 정정 "색만 차이, 다른 거 수정 X". 옛 pink-500/700/800 (1~2단 차이) → pink-300/600/900 (3단 차이). hue 유지 + 명도 극대화. STRATEGY_TAG_COLORS 정의만 변경. SSOT: PROGRESS.md 2.99.
// v55 (2026-05-17): lotto S79 - 출처 표시 모드 설정 추가 (dot/label) + 프리셋 색점. 사용자 명시 "추천 번호 아래 표시 방식을 설정에서 제어 / 색점만 표시하는 모드 추가 (간결) / 다중 매칭 시 점 N개 나란히 / 하단 프리셋 라벨 앞에도 색점 (설정 무관 항상)". options.sourceDisplayMode 신규 ('dot' 기본) + numHtml mode 분기(.num-source-dots vs .num-source-tag) + preset-buttons / settings-page presetRows .preset-strategy-token + dot. settings-page 라디오 토글. SSOT: PROGRESS.md 2.100.
// v56 (2026-05-17): lotto S80 - 색점 크기 정합 강제. 사용자 보고 "원형점 크기가 들쭉날쭉. 정확히 일치해야 함". 7→8px 짝수 + line-height: 0 + box-sizing border-box + min/max 강제 (다른 셀렉터 우선순위 차단). 컨테이너 line-height: 0 + font-size: 0으로 inline baseline 영향 차단. num-source-dot + preset-strategy-dot 동일 패턴. SSOT: PROGRESS.md 2.100.7.
// v57 (2026-05-17): lotto S81 - 번호공(.num) 크기 정합 강제. 사용자 보고 "원의 크기가 다르다". 본체 .num 룰에 box-sizing border-box + flex-shrink/grow 0 + padding 0 + line-height 1 명시. min/max는 본체 미명시 (모바일 .saved-set-row .num-cell .num 36px / 결과 페이지 .num 40px cascade 보존). SSOT: PROGRESS.md 2.100.8.
// v58 (2026-05-17): lotto S82 - 색점 정합 재강화. 사용자 보고 "왜 세로 크기, 가로 크기가 다르냐". aspect-ratio 1/1 추가(정사각=정원 강제) + display: block (inline-block sub-pixel 차단) + 크기 8→10px (sub-pixel 영향 감소). num-source-dot + preset-strategy-dot 동일 패턴. SSOT: PROGRESS.md 2.100.9.
// v59 (2026-05-17): lotto S83 - 사용자 명시 "색점 크기 2/3로 줄여줘". 10 → 6 (10 × 2/3 ≈ 6.67, 짝수 강제 6). aspect-ratio + display block 정합 유지. num-source-dot + preset-strategy-dot + 컨테이너 height/gap 조정. SSOT: PROGRESS.md 2.100.10.
// v60 (2026-05-17): lotto S84 - 캐릭터 편집 기능 신설. 사용자 보고 "캐릭터 관리에서 캐릭터 정보를 수정할 수 가 없네". renderCharacterEditForm(이름 + 생년월일 편집, seed 보존, zodiac/animalSign/dayPillar 재계산) + settings-page char-row에 ✏️ 편집 버튼(.char-row-edit) + main.js openEditCharacterModal + icons.js pencil SVG. 행 클릭 = 활성 유지 / 편집 = 별도 아이콘. SSOT: PROGRESS.md 2.101.
// v61 (2026-05-17): lotto S85 - 캐릭터 편집 모달 birth prefill. 사용자 보고 "기존 생년월일 그대로 표시되어야 함". character schema에 birth 필드 추가(신규 캐릭터 = 보존). 편집 모달 = 옛 birth 있으면 prefill + 별자리 즉시 미리보기. 옛 S85 이전 캐릭터 = birth 부재 → 빈 입력 + 안내 카피. SSOT: PROGRESS.md 2.101.8.
// v62 (2026-05-17): lotto S86 - 활성 배지 폐기. 사용자 보고 "활성 표시는 뭐지?" + 캡쳐에 배지가 편집 아이콘 위에 겹침. .char-row.is-active 외곽선/배경과 중복 + Sprint 084 편집 버튼 신설 후 right: 56px 위치 충돌. settings-page.js의 char-row-active-badge HTML 출력 폐기 (CSS 룰은 dead 잔존, 다음 cleanup). SSOT: PROGRESS.md 2.101.9.
// v63 (2026-05-17): lotto S87 - 프리셋 기본값 복원 confirm 텍스트 동적화. 사용자 보고 "예전 데이터로 돌아가는 거지?". 옛 하드코딩 "균형/분산파/운세파"가 Sprint 075 갱신(운세/균형/분산) 후 잔재. DEFAULT_PRESETS.map(p=>p.label) 동적 산출로 정정. 실제 reset 동작은 새 DEFAULT_PRESETS로 정상 작동, confirm 텍스트만 옛 라벨이었음. SSOT: PROGRESS.md 2.101.10.
// v64 (2026-05-17): lotto S088 - (1) "전체 비우기" → "전체 삭제" 라벨 변경 (saved-sets 액션바 + 휠링 페이지 + docs/01_spec SSOT). (2) 크롬 모바일 하단 메뉴 슬라이딩과 .bottom-tabs 위치 정확 동기 - viewport-sync.js 신설 (visualViewport API resize/scroll → translateY 보정) + CSS will-change/translateZ로 GPU layer 분리. 사용자 명시 "항상 보임" = visual viewport visible bottom에 강제 부착. SSOT: PROGRESS.md 2.102.
// v65 (2026-05-17): lotto S088 후속 - sourceDisplayMode에 'off' 모드 추가 (사용자 명시 "색점을 표시하지 않는 설정 옵션"). numHtml(saved-sets / draw-card 양쪽) mode === 'off' 분기 + settings-page 라디오 3번째 옵션("표시 안 함") + numbers.js SOURCE_DISPLAY_OFF 상수 + storage.test off round-trip 1건 추가. SSOT: PROGRESS.md 2.102.11.
// v66 (2026-05-17): lotto S089 - Luck 자산 전면 폐기 (사용자 명시 "Luck을 게임요소로 추가하고 싶은 생각 없음" + 낮은 점수 부정적 인상). core/luck.js 모듈 삭제 + recommend.js BLESSED boost 고정 +0.5(luck 비례 폐기) + history.js luckApplied 필드 제거 + ritual.js 만땅 보상 +5 폐기(잠금만 유지) + numbers.js LUCK_* 상수 6건 폐기 + storage.js 캐릭터 load 마이그레이션 + UI Luck 바/통계 셀/카피 정정 + tests/suites/luck.test.js 폐기 + runner 등록 해제. 회귀 315/315 PASS. SSOT: PROGRESS.md 2.103.
// v67 (2026-05-17): lotto S089-후속 - (1) ritual 라벨 "행운 쌓기" → "당첨 기원" 사용자 명시 변경. (2) "완성" chip + cta "완성 ✓" 중복 인지 회피 - bonus chip 폐기. ritual-widget.js RITUAL_LABEL + 추첨 탭 바 + 모달 헤더 row + docs 5.6 + docs 1.19 정합. 라벨 정직성 룰 정정 ("당첨" 단어는 "기원" 같은 정성 어휘와 결합 시 허용 / "확률"·"필승" 강한 카피만 절대 금지). SSOT: PROGRESS.md 2.103.12.
// v68 (2026-05-17): lotto S090 - "진짜를 돌리고 싶다" 사용자 명시. (1) 백캐스트(backfillRecommendations) 전면 폐기. (2) + 1세트 / + 5세트 자동 history 등록 폐기 (saved-sets만 적재). (3) saved-sets-row "내 번호로 선택" 버튼 신설 = history 등록 토글 진입점. (4) 회차당 등록 cap 5 (HISTORY_REGISTER_CAP_PER_ROUND, 한국 1구좌 모방). (5) history 항목 source: 'user' 필드 신설. (6) storage load 마이그레이션 - 옛 백캐스트 추정 항목(createdAt === character.createdAt) 자동 제거. core/history.js toggleSavedSetRegistration + countRegisteredForRound + isRegistered + recordRecommendation 중복 차단 강화. docs 01_spec 5.2.5.9 + 7.5 + 02_data 1.16/1.16-A/3.7 + 03_architecture 정합. 회귀 315/315 PASS. SSOT: PROGRESS.md 2.104.
// v69 (2026-05-17): lotto S090-후속 - 사용자 캡쳐 "UX가 개판이네" + "내 번호로 선택 → 확정". (1) 라벨 단축: "내 번호로 선택" → "확정" / "선택 해제" → "취소". (2) row grid 3열 → 4열 (라벨/balls/확정/휴지통). 옛 3열에 버튼 추가로 wrap되며 번호공 튀어나가던 결손 정정. (3) "등록" 배지 폐기 - row outline + 버튼 색으로 시각 충분 + 폭 점유 해소. (4) 버튼 min-width 56px + padding 6/12 정합. docs 01_spec 5.2.5.9 + 02_data 1.16-A 어휘 정정. SSOT: PROGRESS.md 2.104.11.
// v70 (2026-05-17): lotto S090-후속 2 - 사용자 보고 "전적 쓰레기 아직도 있네" + "이번회차 선택된것들은 실시간으로 등록되었으면". (1) 설정 탭 "활성 캐릭터 전적 초기화" 버튼 신설 - 옛 백캐스트 잔재 강제 정리 (S090 자동 마이그레이션 한계 보완). (2) 전적 탭 상단에 "현재 회차 NNNN회 · 발표 대기 N건" 섹션 신설 - 사용자 "확정" 직후 실시간 노출. accent 외곽선 강조. (3) 옛 이력 섹션 = 현재 회차 외 항목만 (역할 분리). docs 01_spec 5.8.1-A 신설. SSOT: PROGRESS.md 2.104.12.
// v71 (2026-05-17): lotto S090-후속 3 - 사용자 명시 "전적에서 모든 번호에 회차를 적지말고 회차는 상단에 한번만 표시". 발표 대기 섹션 = 모든 항목이 같은 회차라 항목 헤더의 "NNNN회차" 라벨 중복. historyItemHtml에 showRound 인자 신설 = false 호출 시 회차 라벨 폐기, rank 라벨만 우측 정렬. 옛 이력 섹션은 회차 다양하므로 showRound=true 유지. CSS .history-header-no-round 룰 추가. SSOT: PROGRESS.md 2.104.13.
// v72 (2026-05-17): lotto S090-후속 4 - 사용자 명시 3건: "UI 보기 좋게 정렬" + "과거 쓰레기 데이터 삭제 해" + "캐릭터 생성할 때마다 추가되는 옛 회차 쓰레기도 모두 삭제". (1) 발표 대기 항목 = rank 라벨도 폐기 (showRank=false 호출). showRound=false + showRank=false = 헤더 자체 폐기, 번호공만 노출. (2) `.history-numbers` justify-content: center로 가운데 정렬 + gap space-2. (3) storage.js loadCharacters 1회 강제 클린업 (lotto_s090_cleared flag) - 모든 character.history = [] 초기화, flag 저장으로 1회만 실행. 사용자 명시 일괄 정리. (4) 빈 상태 카피 갱신. 회귀 316/316 PASS (storage 단언 정정 + 신규 클린업 단언 1건). SSOT: PROGRESS.md 2.104.14.
// v73 (2026-05-18): lotto S090-후속 5 - 사용자 캡쳐 "추천 리스트 확정 했을 때 ui가 좀 어색한데". 옛 .saved-set-row.is-registered = outline 1px + outline-offset -1px → row 안쪽 그림이 "취소" 버튼과 닿음 + 4개 연속 outline 박스 분리 인상 + 점선 border-bottom과 겹침. 새 = box-shadow inset 4px 좌측 accent 바 + padding-left + background tint 유지. outline 폐기. 모바일 폭 점유 0, 버튼 영역 침범 0. docs 01_spec 5.2.5.9 정합. SSOT: PROGRESS.md 2.104.15.
// v74 (2026-05-18): lotto S090-후속 6 - 사용자 캡쳐 "아웃라인이 추천 텍스트에 닿아 있는게 지저분 + 삭제 버튼도 외곽라인에 붙어 있어서 별로 + 확정/미확정 정렬 위치 틀어짐". 직전 정정(좌측 바 + padding-left 추가)이 정렬 깨뜨림 결손. (1) .saved-set-row 기본 padding 좌우 var(--space-3)(12px) 추가 = 모든 row 균일 호흡. (2) .saved-set-row.is-registered의 padding-left 추가 폐기 = 확정/미확정 row 정렬 100% 일치. 좌측 4px 바는 row 기본 padding 안에서 표시 = 라벨까지 8px 호흡, 휴지통 우측 12px 호흡. SSOT: PROGRESS.md 2.104.16.
// v75 (2026-05-18): lotto S090-후속 7 - 사용자 명시 6건. (1) 좌측 4px accent 바 폐기 (box-shadow inset 제거). (2) row padding 좌우 var(--space-3) → calc(var(--space-3) / 2) = 6px 절반. (3) 확정 background tint 0.08 → 0.22 강화. (4) 휴지통 클릭 시 = saved-sets 제거 + 같은 numbers history(현재 회차) 결합 제거 ("확정한 채 삭제하면 확정 취소"). (5) 회차당 cap 5 폐기 - HISTORY_REGISTER_CAP_PER_ROUND dead, toggleSavedSetRegistration cap 분기 폐기, savedSetsSectionHtml capReached/hint 폐기. (6) 카운터 "등록 N/5" → "확정 N건". docs 01_spec 5.2.5.9 정합 + tests cap 5 단언 → cap 폐기 검증으로 정정. SSOT: PROGRESS.md 2.104.17.
// v76 (2026-05-18): lotto S091 - 사용자 명시 하단 탭 순서 + 라벨 정정. 옛 = 추첨/통계/역추첨/전적/설정. 새 = **추천/기록/통계/게임/설정**. bottom-tabs.js TABS 배열 순서 + label/short 정정. id는 옛 유지(home/history/stats/reverse/settings = state 호환). history-page.js h1 "전적" → "기록" + 빈 상태 카피 "전적이 비어있습니다" → "기록이 비어있습니다" + "추첨 탭" → "추천 탭". reverse-page.js h1 "역추첨" → "게임". docs 01_spec 4장 5탭 모델 정합. SSOT: PROGRESS.md 2.105.
// v77 (2026-05-18): lotto S091-후속 - 사용자 명시 "확정된 배경 앞쪽 마진 절반". section padding-left(≈23.4px)이 옛 확정 배경 좌측 마진. 확정 row만 margin-left: calc(var(--space-3) * -1) + padding-left 보상으로 background이 section padding-left의 절반만큼 좌측 확장. row 콘텐츠 정렬 무영향. 미확정 row 변동 0. SSOT: PROGRESS.md 2.105.7.
// v78 (2026-05-18): lotto S092 - 기록 탭 옛 회차 이력 회차별 그룹핑 (4건 진화). 그룹 헤더 (당첨번호 + 보너스 ball 점선 외곽선) / row 한 줄 layout (번호공 좌 + 등수 라벨 우, space-between) / 일치 ball 골드 외곽선 강조 + 미일치 dim 항상 적용 (룰 일관성) / 라벨 세분화(1등~5등 / 1개 적중 / 2개 적중 / 미적중 / 미발표) / 당첨 ball 크기 통일(.history-num 32px) + 골드 톤 배경. SSOT: PROGRESS.md 2.106.
// v79 (2026-05-18): lotto S093 - cleanup 묶음. (1) `BACKFILL_RECENT_COUNT` dead 상수 폐기 (src/data/numbers.js 호출 0건 확인, docs SSOT 정합). (2) 코드/주석 옛 탭명 sweep ("추첨/전적/역추첨" → "추천/기록/게임"). icons.js + PROGRESS / PROGRESS_ARCHIVE는 역사 흔적 보존 예외. (3) CSS/JS 주석 "전체 비우기" → "전체 삭제" sweep (S088 라벨 정정 정합). (4) Sprint 078 + 079 archive 이전(룰 1.6 활성 9 → 7 cap 정합). SSOT: PROGRESS.md 2.107.
// v80 (2026-05-18): lotto S093-후속 - docs SSOT 옛 탭명 sweep. docs/01_spec.md 18건("추첨 탭"/"전적 탭" → "추천 탭"/"기록 탭", line 27 id mapping 정의는 옛 이름 보존) + docs/02_data.md 4건("추첨 탭" → "추천 탭"). S091 라벨 정정 후 docs SSOT 정합 완전 회복. 사용자 노출 영역 무변동(docs 본문은 협업자 reference). SSOT: PROGRESS.md 2.107.8.
// v81 (2026-05-18): lotto S094 - 추천 row 라벨 시각 단축 "추천N" → "N" (영역 확보 목적). aria-label은 의미 보존 "추천N" 그대로 (스크린리더 호환). row grid 라벨 영역 데스크톱 44 → 28px / 480px↓ 40 → var(--space-5)(20px) / 360px↓ var(--space-6) → var(--space-5). 부수로 모바일 break point 3열 잔재(S090-후속 1 데스크톱만 4열 갱신, 모바일 누락) 4열 정합 회복. swipe-to-delete(S095)는 별도 sprint. SSOT: PROGRESS.md 2.108.
// v82 (2026-05-19): lotto S094-후속 F+B+ - [확정][🗑] 인접 페어 오터치 방지. 사용자 캡쳐 "삭제 버튼이 여전히 확정 버튼과 나란히". S094 영역 확보(좌측 라벨 회수)만으로는 우측 페어 위치 분리 안 됨. (1) 휴지통 opacity 0.45 default → focus/hover 시 1.0 (시각 약화). (2) margin-left var(--space-3)(12px) (gap 확장). (3) hit area 24x24 보존 (접근성). swipe-to-delete(C 옵션) 진행 여부는 본 옵션 효과 확인 후 결정. SSOT: PROGRESS.md 2.108.8.
// v83 (2026-05-19): lotto S095 본질 정정 - 사용자 비판 "공간이 없는데 왜 계속 낑겨 넣을려고 해?". F+B+/F++/swipe 모두 "한 row에 액션 2개 frame" 안 변형 = 본질 회피. 사용자 결정 "휴지통 삭제 + 확정 토글 아이콘". (1) row 단위 휴지통 완전 폐기 (단일 삭제 동선 자체 폐기, 전체 삭제/재시도로 흡수). (2) "확정"/"취소" 텍스트 버튼 → 토글 아이콘(빈 원 ◯ / 채워진 원 + ✓). (3) row grid 4열 → 3열 (라벨/balls/토글). (4) 모바일 break point도 3열 정합. (5) main.js remove-saved-set 핸들러 폐기. icons.js circleOutline / circleCheck 신설. SSOT: PROGRESS.md 2.109.
// v84 (2026-05-19): lotto S095-후속 - 사용자 명시 "체크박스 다른 디자인 + 좌우 마진 동일 + 카운터 노출 시에도 title 가운데". (1) 옛 원 (○/●) → 라운딩 사각 체크박스 (□/☑) (icons.js checkboxOutline/checkboxChecked 신설). (2) row grid 좌우 마진 동일 - 라벨 28 / 토글 24 비대칭 → var(--space-6) 1fr var(--space-6) 24/24 대칭. 모바일 break point도 var(--space-6) 통일 (토글 hit area 보장). (3) 헤더 flex → grid 3열 (spacer/title/counter) - 카운터 노출 시에도 title 가운데 유지 (옛 결손: 카운터 margin-left auto가 title을 좌측으로 밀던 문제). SSOT: PROGRESS.md 2.109.11.
// v85 (2026-05-19): lotto S095-후속 2 - 사용자 결손 보고 "체크 후 '전체 삭제' 누르면 체크박스가 삭제될 것 같은 잘못된 UX". 체크박스 + "전체 삭제" 페어가 멀티 셀렉트 list 멘탈 모델 = "선택 삭제" 오인 본질. 정정 묶음 A+B+C: (A) 라벨 "전체 삭제" → "모두 비우기" 어휘 명확화. (B) 위치 액션바 → 헤더 우측 (시각 그룹 분리 = 액션바 = 추가 액션만 / 헤더 = 리스트 정리 단독). 작은 ghost 버튼 (opacity 0.7, border 없음). (C) confirm 카피 강화 - 확정 N개 포함 명시 + 확정 항목 history 함께 제거 (사용자 명시 일관). 액션바 grid 3열 → flex column 단순화. SSOT: PROGRESS.md 2.109.12.
// v86 (2026-05-19): lotto S096 - 기록 탭 "등수별 분포" 섹션 폐기. 사용자 결정 + 본질 진단: (1) 6/45 확률 (1등 1/8.1M / 5등 1/45) → 누적 N회로 분포 의미 형성 어려움. (2) summary "적중 N건 + 최고 등수" 중복. (3) 사행성 회피 룰 (CLAUDE.md 6.3) - 등수 분포 강조가 캐릭터 선택 사행성 자극. (4) 데이터 부족 시 빈 막대 노이즈. history-page.js rankChartHtml + horizontalBarsHtml/RANK_MISS_COLOR import 폐기 (stats-page.js에서는 잔존). 잔존 = summary + timeline + 옛 회차 그룹. SSOT: PROGRESS.md 2.110.
// v87 (2026-05-19): lotto S097 - 기록 탭 reveal 게임화. 사용자 명시 4건: (1) 발표 대기에 당첨번호 row "?" 7개 추가. (2) 발표 후 사용자 row ball 반투명 + 숫자 숨김 + 우측 체크 버튼. (3) 체크 클릭 시 좌측부터 ball 순차 reveal (0.32초 간격). (4) 일치 ball 확대 바운스 + 하이라이트. 데이터 모델 = history[].revealed (신규 false, 옛 true 자동 마이그레이션). 핵심 파일: core/history.js revealRecommendation 신설 / storage.js 마이그레이션 / history-page.js pendingBallHtml + revealed 분기 / main.js setTimeout 체인 reveal / styles/main.css keyframes (history-ball-reveal + history-ball-match-bounce). SSOT: PROGRESS.md 2.111.
// v88 (2026-05-19): lotto S097-후속 - 사용자 명시 3건 묶음. (1) "? ball 구슬과 동일한 형태, 물음표 중앙에 숫자보다 살짝 크게" → pendingBallHtml에 'num' 클래스 추가(.num 본체 원형/box-sizing 상속) + .is-pending font-size md(숫자 sm보다 큼) + border-radius 50% 자연 + 점선 dashed 유지. 보너스 ball 별도 외곽선 폐기(가려진 상태에선 본/보너스 시각 구분 무의미). (2) "미발표 구슬 반투명 적용 안함" → row hasDraw=false 시 `.is-unsettled` 클래스 추가 + CSS opacity/filter 룰 폐기. 자기 번호는 또렷이 노출. (3) "추첨 후 1주일간 가려진 채 유지, 1주일 지나면 자동 오픈" → historyGroupRowHtml에 7일 윈도우 판정(draw.drwDate + 7일). 윈도우 안만 마스킹, 이후 자동 옛 동작. SSOT: PROGRESS.md 2.111.10.
// v89 (2026-05-19): lotto S097-후속 2 - 사용자 명시 "지난주차 것 모두 확인 안한 상태로 만들어 줘. 직접 열어볼거야". storage.js에 1회 자동 unreveal reset 마이그레이션 추가. flag(lotto_s097_unreveal_reset_v1) 부재 시 모든 character.history[].revealed = false 일괄 갱신 + flag 저장. 본 sprint 배포 후 첫 진입 시 자동 1회 발동. 7일 윈도우 판정(추첨일 + 7일)은 history-page.js에서 자동 적용 = 옛 항목은 노출, 윈도우 안 항목은 마스킹 + 체크 버튼. SSOT: PROGRESS.md 2.111.11.
// v90 (2026-05-19): lotto S097-후속 3 - 사용자 캡쳐 + 명시 "모양은 구슬과 완전히 똑같고, 색도 자기 색이어야 하며, 숫자 영역이 물음표로 표시. 확인을 누르면 숫자가 보이면서 연출 효과". 옛 마스킹 ball이 사각형 + opacity 0.5 + grayscale 0.6 = 사용자 의도 위반. 정정: (1) history-page.js 마스킹 분기 클래스에 `num` 추가 = .num 본체 원형 32x32 + box-sizing border-box 상속. (2) CSS .history-group-row.is-masked .history-num.is-masked = opacity 1 + color #fff + font-weight 700 + font-size md + filter none. 자기 색(numberColor.bg) 그대로 노출, 숫자 자리만 ?로 표기. 다른 ball과 시각 완전 동일. 옛 reveal keyframe(history-ball-reveal scale 0.85→1.05→1) 유지 = 텍스트 ? → 숫자 변환 + pop 연출 효과. SSOT: PROGRESS.md 2.111.12.
// v91 (2026-05-19): lotto S097-후속 4 - 사용자 명시 "번호가 틀린 것은 확인되는 순간 즉시 반투명, 맞은 것은 즉시 하이라이트". 옛 .is-masked opacity 1 룰이 옛 .num:not(.is-matched) dim 룰을 specificity로 override → 불일치 ball reveal 후에도 자기 색 유지. 정정: CSS `.history-num.is-masked.is-revealed:not(.is-matched)` 룰 신설 (opacity 0.35 + grayscale 0.7). reveal 시점 JS가 .is-revealed 클래스 + 일치면 .is-matched 추가 → CSS 분기 즉시 적용. 일치 ball은 옛 .is-matched highlight + .is-bounced keyframe 그대로. SSOT: PROGRESS.md 2.111.13.
// v92 (2026-05-19): lotto S097-후속 5 - 사용자 명시 "전적 5칸을 한줄로 만들 수 있나?". .summary-grid 데스크톱 3열 / 480px↓ 2열 → 5열 통일. 모바일 폭에서 셀 폭 ~64px = 라벨 wrap 자연 발생. 폰트(라벨 11→10px / 값 18→15px) + padding(--space-2 → --space-2 var(--space-1)) + gap(--space-2 → --space-1) 압축. min-width 481px 데스크톱에서는 옛 폰트/padding 복귀(여유). SSOT: PROGRESS.md 2.111.14.
// v78 (2026-05-18): lotto S092 (정정 통합) - 사용자 명시 13건 진화. 핵심 결과만 기록 (상세 진화 SSOT: PROGRESS.md 2.106). 최종: 옛 회차 이력 = 회차별 그룹 카드. 그룹 헤더 = NNNN회 · YYYY-MM-DD + 당첨번호 row(번호공 32x32 가운데 + 보너스 ball + "당첨" 우측, 골드 톤 배경). 본문 = 한 줄 row(번호공 가운데 + 등수 라벨 우측). 라벨 세분화: 0=미적중, 1/2=N개 적중, 3+=등수, draws 없음=미발표. 일치 ball 강조 = 흰색 inner + 골드 outer 2층 외곽선 + 14px glow. 미일치 ball = row 종류 무관 항상 dim(opacity 0.35 + grayscale 0.7) - 룰 일관성. renderHistoryPage(container, character, currentDrwNo, draws) 시그니처 확장. docs 01_spec 5.8.1-A + 5.8.4 정합.
// v93 (2026-06-29): rushhour 산리오풍 업그레이드 일괄 cache busting - 블록 크기별 동물(고양이/강아지/병아리/펭귄/토끼) + 표정·색·액세서리 다양화 + 출구 길·화살표 게이트 + 클리어 연출(토끼 퇴장 + 별·하트 파티클 + 오버레이 팝) + 드래그 조작감(되감기 제거 + 탭). rushhour 변경들이 v92 stale 캐시에 옛 버전으로 섞여 동물이 표시되지 않던 결손 회수. 게임 자산 변경 시 본 버전 bump 필수(미bump = stale 캐시 미갱신).
// v94 (2026-06-29): rushhour 마지막 퍼즐 클리어 처리 - "다음 퍼즐"이 무반응이던 것을 완주 축하 + "처음부터 다시"(첫 퍼즐로 순환)로 정정.
// v95 (2026-06-29): rushhour 퍼즐 14개 → 200개 확장(무작위 생성 + 솔버 검증, 최소 1~8수 쉬움 곡선).
// v96 (2026-06-29): rushhour 제한시간(넉넉) + 토끼 표정(무표정→어두움→울상, 클리어 시 웃음) + 골드·별 보상.
// v97 (2026-06-29): rushhour 상점 1차 - 골드로 토끼 색 스킨 구매·장착.
// v98 (2026-06-29): rushhour 난이도 밸런스 재설계 - 최소수+얽힘 2축, 역BFS 생성 200개(최대 18수, 후반 1차원 자명 배제).
// v99 (2026-06-29): rushhour 난이도 멀티소스 BFS로 정확 재측정 181개(입문20/쉬움60/보통70/도전30, 최대 16수). v98 opt 오측정 정정.
// v100 (2026-06-29): rushhour 중간 난이도(보통) 보강 - 보통 70→89, 총 186개(입문20/쉬움60/보통89/도전16).
// v101 (2026-06-29): rushhour 힌트 버튼 - 골드 5로 솔버의 최적 다음 한 수(차+방향) 강조. solveStep 추가.
// v102 (2026-06-29): rushhour 진행 맵 - 상단 🗺로 난이도별 186퍼즐 별 현황 + 임의 퍼즐 점프.
// v103 (2026-06-29): rushhour 효과음(Web Audio 합성) - 이동/클리어/힌트/구매/거부 + 🔊 음소거 토글(저장).
// v104 (2026-06-29): rushhour 모바일 레이아웃 정비 - 보드 폭 76vw(출구 포함 화면 안) + 상단/하단바 좁은 폭 압축.
// v105 (2026-06-29): rushhour 상점 2차 - 보드 테마 5종(바닥/격자선/출구 색 세트) 구매·장착, --rh-* 즉시 반영.
// v106 (2026-06-29): rushhour 상점 3차 - 토끼 머리 장식 5종(리본/꽃/왕관/나비넥타이) 구매·장착, 토끼 얼굴 즉시 반영.
// v107 (2026-06-29): rushhour 연속 콤보 - 시간 내 연달아 클리어 시 콤보+보너스 골드, 시간초과 시 콤보 끊김.
// v108 (2026-06-30): rushhour iPad 드래그 손 뗌 시 블록 좌우 흔들림 수정 - 정착을 left/top+transform 동시 트랜지션에서 transform 단일 속성(FLIP)으로 변경.
// v109 (2026-06-30): rushhour iOS 효과음 무음 수정 - 첫 사용자 제스처(pointerdown/touchend)에서 AudioContext unlock(무음 버퍼 1회 재생) 보강.
// v110 (2026-06-30): rushhour 남은 시간을 상단바에서 보드 위 중앙으로 이동 + 큰 글씨 표시(.board-timer).
// v111 (2026-06-30): rushhour 블록 이동음이 짧고 낮아 묻히던 것 보강 - 주파수 500→760·길이 0.11s·게인 0.18로 또렷하게.
// v112 (2026-06-30): rushhour 이동음 게인 0.18→0.35·길이 0.13s로 추가 증폭(여전히 작다는 피드백).
// v113 (2026-06-30): rushhour 순수 보드판을 화면 가로 정중앙 정렬(출구 화살표 정렬 제외, board-wrap padding-right 제거 + 보드폭 76→72vw). 타이머도 보드 중앙 위.
// v114 (2026-06-30): rushhour 효과음 체감 지연 감소 - 어택 0.012→0.003s 단축 + AudioContext latencyHint:interactive.
// v115 (2026-06-30): rushhour 첫 블록 이동 무음 수정 - start(currentTime) 첫 콜백 경계 씹힘을 15ms lookahead(SCHEDULE_AHEAD)로 해소.
// v116 (2026-06-30): rushhour 첫 이동음 누락 추가 보강 - unlock 시 무음 톤 0.1s 파이프 워밍업 + play를 resume 완료 후 실행.
// v117 (2026-06-30): rushhour 워밍업 무음 0.1→0.4s 연장(출력 장치 절전 깨우기 강화).
// v118 (2026-06-30): rushhour 블루투스 첫 소리 씹힘/페이드인 해결 - 무음 keep-alive 상시 재생으로 출력 장치 절전 차단.
// v119 (2026-06-30): rushhour 퍼즐 난이도 재정렬 - 각 난이도 구간 내부를 체감점수(최소수+막는차+되돌림) 오름차순 정렬, 갑자기 쉬워지는 지점 33→1곳.
// v120 (2026-07-02): rushhour 발열 절전(백그라운드 타이머·오디오·표정 정지) + HUD 전면 개편(저녁 플럼·스테이지 카드·난이도 게이지·캔디 버튼).
// v121 (2026-07-02): rushhour 설정 블록 기본 스타일 포니→밥풀이(저장된 선택은 유지).
// v135 (2026-07-07): english-reading 독해 사다리 전면 개선(지문 3편·지문 고르기·단어장 저장·보기 셔플) + apps 레지스트리/지문 데이터 network-first 등재.
// v140 (2026-07-08): web-deploy 파이프라인 도입 - 아이콘·rushhour 포니 PNG 최적화 반영.
// v141 (2026-07-08): SW 등록 경로 결함 수정(shared/ui.js) - 하위 페이지(games/·apps/)에서 페이지 기준 상대 경로로 등록해 404, 루트 기준 해석으로 교정.
// v142 (2026-07-08): english-reading 전면 전환 - 독해 사다리 폐기, 세션 기반 문법 스캔+청킹 앱으로 재작성(사용자 지시).
// v143 (2026-07-08): english-reading 해석·작문 업그레이드 - 카테고리 인트로 + 구조 해부 카드 + 직독직해 청킹 재작업.
// v144 (2026-07-08): english-reading v0.6 하이브리드 독해 전면 재구성 - 몰입 리딩 + 문장 끊어읽기 + 단어 수집 + 🔬 구조해설 + 완만한 난이도 코스/전체 클리어 + 노출 설정.
// v145 (2026-07-08): english-reading 끊어 읽기 직접 긋기·/ 검토 채점 전환 + 문장별 문법 목록.
// v146 (2026-07-08): flightshooting 진화 탄 형태 확대 - 색만 바뀌고 모양 체감 안 되던 문제로 tier별 크기·형태를 확 키움(원→타원→긴형→링) + 레이저 흰-보라 빔 + 자동이동 떨림 제거. PWA 옛 캐시(형태 미반영) 무효화.
// v147 (2026-07-09): flightshooting 무기 역할 교체 - 메인 총알(내 비행기)은 직진, 사이드 총알(사이드 비행기)은 양쪽 대각선 확산. 명칭 정리(메인/사이드/유도탄). PWA 옛 캐시 무효화.
// v148 (2026-07-09): flightshooting 회복(H) 파워업을 육각형 안 하트 → 하트 모양 자체로 변경. PWA 옛 캐시 무효화.
// v149 (2026-07-09): english-reading 단어 말풍선 중앙 고정 등장 + 2초 자동 닫힘.
// v150 (2026-07-09): flightshooting 버그 2건 - 구역 인트로 중 적 스폰만 멈추고 아이템 이동·획득·발사는 진행 / 피격 무적(깜박) 중에도 아이템 획득 허용. PWA 옛 캐시 무효화.
// v151 (2026-07-09): english-reading 채점 색 체계 변경(검정/회색 점선/빨강) + 단어 배경 하이라이트 제거.
// v152 (2026-07-09): flightshooting 사이드 총알을 부채로 확산(안쪽 살짝~바깥 크게, slot별 각도). PWA 옛 캐시 무효화.
// v153 (2026-07-09): english-reading 틀린 문장 예문의 취소선 제거(가독성).
// v154 (2026-07-09): english-reading 끊는 기준 카드 + 덩어리별 끊는 이유 자동 태그.
// v155 (2026-07-09): flightshooting 강화 형태 교환 - 메인 총알은 레이저식(길고 굵어짐), 사이드 총알은 부채 확산 + 진화(원→타원→빔→링) 이관. PWA 옛 캐시 무효화.
// v156 (2026-07-09): english-reading 끊는 기준 카드를 매 지문 본문 상단 반복 버튼에서 상단바 상시 버튼(오버레이)으로 이관 - 본문 반복 노출 제거.
// v157 (2026-07-09): english-reading 대개편 - 해석 버튼 우측 이관 + 채점 표시(맞음 빨간 원/틀림 빨간 x/빼먹음 빨간 /) + 끊는 기준 위반 검사기 4규칙 + 데이터 재청킹 + 선유추 후확인 단어 수집(임시 flag→해석 시 공개+영구저장) + 다회독 clean slate 루프. PWA 옛 캐시 무효화.
// v158 (2026-07-09): flightshooting 후속2 - 메인 총알 발별 진화 재전환(각진 세트 다이아→화살→십자→별)+1강화 다이아 크기 절반, 존 펄스파 전환(닿을 때만 피해·5단계), 유도탄 쿨타임 3배+외형 메인과 통일, HUD 아이템 배지(P·S·E·T), 하트 대칭 곡선. PWA 옛 캐시 무효화.
// v159 (2026-07-09): english-reading - 본문 모든 단어 클릭·수집(특정 단어 제한 폐지) + 단어 밑줄 표시 전면 제거 + 뜻 미등록 단어는 뜻 비운 채 수집(사용자 지시). PWA 옛 캐시 무효화.
// v160 (2026-07-09): english-reading 읽기 진행 저장·복원 - 그은 선·임시 단어·검토 여부를 지문별 기기 저장, 단어장/목록 왕복·앱 재시작에도 복원(단어장 백버튼은 읽던 지문으로 복귀), 회독 완료 시 해당 지문분 리셋. PWA 옛 캐시 무효화.
// v161 (2026-07-09): english-reading 맞은 끊기 표시를 채워진 붉은 점 → 안이 빈 붉은 원(테두리만)으로 변경(사용자 지시). PWA 옛 캐시 무효화.
// v162 (2026-07-09): english-reading 문제 출제 화면 - LLM 출제 규칙 제공 + 붙여넣은 지문 JSON을 validatePassage로 즉시 검증(끊는 기준 위반·죽은 단어·양식) + 통과분 localStorage customPassages로 추가·목록 반영·배포용 복사. PWA 옛 캐시 무효화.
// v163 (2026-07-09): english-reading 출제 규칙·검증 안내 개선 - words의 word는 원문 활용형 그대로(원형 변환 금지) 프롬프트 명시 + 죽은 단어 에러에 형태 힌트 추가(제미나이가 trigger로 원형 넣어 걸린 사례). PWA 옛 캐시 무효화.
// v164 (2026-07-09): english-reading 끊는 기준 검사기 오탐 수정 - 문장 맨 끝 짧은 부사구(over time·at all 등)는 독립적으로 끊어 읽는 게 정상이므로 short-prep 예외(마지막 덩어리). 절 중간 짧은 전치사구 분리는 계속 차단. 샘플 14종 자체 점검 + 유닛 상설화. PWA 옛 캐시 무효화.
// v165 (2026-07-09): flightshooting 대규모 - 30 스테이지 확장 + 이질 기계 적 4종(turret/prism/mine/warper) + 기계 중보스, autopilot 사람화(조작 주기 제한 + 인간 실측 기반 실력 4티어), 환경설정 화면 + 치트 박스(속도/무적/드랍). PWA 옛 캐시 무효화.
// v166 (2026-07-09): english-reading 앱 소스(src/**/*.js)를 network-first로 전환 - 검사기 등 로직이 자주 바뀌는데 cache-first라 배포해도 옛 검사기가 브라우저 캐시로 남아 '고친 규칙이 실서비스에 반영 안 됨'이 반복되던 근본 원인 제거(사용자 명상 지문이 옛 검사기로 계속 걸린 사례). 이후 배포는 새로고침 즉시 반영. PWA 옛 캐시 무효화.
// v167 (2026-07-09): english-reading 터치·채점 개선 - 뜻 등록된 주요 단어만 터치(일반 단어는 끊기 틈과 오터치 방지로 무반응) + 틀린 끊기 더 연한 회색 + 빼먹은 끊기 위 작은 삼각형(▾) 표시. PWA 옛 캐시 무효화.
// v168 (2026-07-09): english-reading 끊기/단어 모드 스위치 - 끊기(좁은 틈)와 단어 터치가 본문에서 붙어 오터치가 잦던 근본 문제를, 상단 '끊기/단어' 전환으로 한 모드에서 한 종류만 반응하게 해 원천 차단(사용자 지시). PWA 옛 캐시 무효화.
// v169 (2026-07-10): flightshooting 무기 외형 개편 - 메인 총알을 각진 도형 → 레이저 빔 강화(티어↑ 길이·굵기·흰 코어 마디 + V자 대형으로 격자 뭉침 해소), 유도탄을 십자 → 로켓 실루엣 + 크기 축소. 시작 화면 어린이/일반 모드 분리(어린이는 적·보스 발사 간격 2.2배로 총알 덜 쏨). PWA 옛 캐시 무효화.
// v170 (2026-07-10): flightshooting 강화 표현·편의 - 메인 총알 티어별 색(시안→민트→파랑→보라→자홍)+무늬(실선/마디/○/✕/◆) 다양화, HUD 강화단계 로마숫자+서브스텝(★III·1), 어린이 모드 시작 보너스(총알2·꼬리1), 치트 세부설정 저장, 보스 좌우 이동 감속. PWA 옛 캐시 무효화.
// v171 (2026-07-10): english-reading 끊기/단어를 상단바 독립 토글(SVG 가위·T 아이콘, 단어장 왼쪽)로 - 모드 스위치 폐기, 각각 on/off로 오터치 조절. 끊는 기준은 홈 목록 하단 버튼으로 이관. PWA 옛 캐시 무효화.
// v172 (2026-07-10): flightshooting 문서 "20→30" 정정 + 어린이 모드 적 조준 연발(3발)을 정중앙 단발로 + 적 출현 가로 영역을 화면폭 무관 중앙 고정폭으로 제한 + 2차 이질 적 coil(전격 코일 아크 쌍)·serpent(기계 뱀, 머리 약점 체인) 신설. PWA 옛 캐시 무효화.
// v173 (2026-07-10): flightshooting 보스 부위 파괴형 전면 개편 - 코어 + 부위(포탑/방어구) 구조, 스타일 4종(1~10 함선/11~20 생체/21~29 위성/30 파수꾼). 방어구 부수면 코어 노출("보호 중" 표시), 포탑 부수면 그 탄막 정지, 최종보스 광폭화. 적 출현 폭 2배 확대. PWA 옛 캐시 무효화.
// v174 (2026-07-10): flightshooting 봄(B)으로 죽은 보너스 기체도 파워업 확정 드롭(전멸 시 드롭 경로를 건너뛰어 보너스 아이템을 놓치던 것 수정, 잡몹은 드롭 없음 유지). PWA 옛 캐시 무효화.
// v175 (2026-07-10): flightshooting 무기 강화 체계 재설계 - 발별 순차 진화 → 8발 일괄 진화 10단계(사용자 확정). 메인=빔 형태 자체가 패턴(실선→마디→구슬→마름모→물결→톱니→이중→나선→화살→플라즈마), 사이드=둥근 진화(원→구슬→링→별→태양), 유도탄=형태 진화(점→삼각→화살→로켓→미사일)+몸체 3색 순환. 모든 총알 속도 3단계마다 증가(초기 느림). PWA 옛 캐시 무효화.
// v176 (2026-07-10): flightshooting 무기 강화를 발별 순차 진화로 복원(사용자 지시 - 총알 하나씩). v175에서 8발 일괄로 바꿨던 것을 되돌림. 메인/사이드는 가운데(안쪽)부터 한 발씩, 유도탄은 낮은 것부터 순차로 10단계 진화. 형태 패턴·10단계·속도 3단계 증가는 유지. PWA 옛 캐시 무효화.
const CACHE_VERSION = "v176";
const CACHE_NAME = `game-ghost-${CACHE_VERSION}`;

// 항상 network-first로 응답할 경로. 게임 목록 / 게임 메타 / 회차 정적 데이터.
const NETWORK_FIRST_PATHS = [
  "/games/_registry.json",
  "/games/lotto/src/data/draws.json",
  "/apps/_registry.json",
  "/apps/english-reading/src/data/passages.json",
];

// 셸(런처 + 공통 모듈) 사전 캐시. 게임은 첫 방문 시 lazy 캐시.
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable.png",
  "./shared/tokens.css",
  "./shared/base.css",
  "./shared/input.js",
  "./shared/storage.js",
  "./shared/loop.js",
  "./shared/ui.js",
  "./games/_registry.json",
  "./games/tetris/index.html",
  "./games/tetris/style.css",
  "./games/tetris/game.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate: 캐시 즉시 응답 + 백그라운드에서 갱신.
// 단, navigate 요청은 network-first(새 버전 빠르게 반영).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // _registry.json 등 + english-reading 앱 소스(JS)는 항상 network-first.
  // english-reading은 출제 검사기 등 로직이 자주 바뀌므로 JS를 cache-first로 두면 배포해도 옛 로직이 캐시로 남는다 → 항상 최신 fetch.
  const ER_JS = /\/apps\/english-reading\/src\/.*\.js$/.test(url.pathname);
  if (ER_JS || NETWORK_FIRST_PATHS.some((p) => url.pathname.endsWith(p))) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
