# game-hub NEXT-SESSION 아카이브


<!-- 2026-07-29 봉합 시 NEXT-SESSION chain 3건 cap 초과분 이동 (내용 무수정) -->
## 직전 작업 (2026-07-29, english-vocabulary 초등 800 전수 재검토 → 결함 68건 수정)

사용자가 codex로 만든 초등 800개를 "내용 검토, 다만 토큰 소모가 크면 안돼"로 맡겼고 결과 보고 후 "모두 고쳐"로 이어졌다. 감사 원장이 800개 전부 검토완료·지적 0으로 기록돼 있었지만 그 기록을 근거로 통과시키지 않고 독립 재검사했다(그 결과 68개 카드 결함 - 검수 기록이 검수를 증명하지 못한 사례). (1) 검사 - 기계 검사(validate-batch error 0, 사전 품사 불일치 0)를 먼저 돌리고 내용 스크리닝 도구 tools/screen-batch.mjs를 신설해 뜻 중복·예문 중복·문형 반복·어휘 이탈을 전수 추출한 뒤, 800개 압축 목록을 1회만 출력해 전량 읽었다(토큰 절감 방식은 docs/NEXT-authoring-batch-01.md 기록대로). (2) 수정 - 패치 파일 elementary-800-fix-01.json(68개 카드) + tools/apply-fix.mjs로 일괄 반영. 품사 오류(서수·방위·case), 시점 부사에 단순현재를 붙인 예문 8건, 예문 완전 중복 4쌍→0, 뜻↔번역 끊김 4건, 한국어 동형이의 27그룹(뜻 중복 36→9그룹, 남은 9그룹은 영어 자체 동의어라 유지), 어려운 예문 어휘 5건, however 세미콜론·hate 억지 문장. no를 감탄사로 바꾸려던 것은 사전 근거 부재로 철회했다. (3) 앱 동기화 - codex가 이미 앱 set-001~004.json에 800개를 넣어둔 상태라 tools/sync-fix-to-app.mjs로 sourceId 기준 121필드를 반영했다. 검증은 validate-data 오류 0·run-node 264 PASS/0 FAIL·패치 멱등성·스키마 오염 0. **다음 행동** = (1) **브라우저 화면 검증이 두 세션 연속 미완이다** - 수정된 카드가 학습 화면에 제대로 나오는지 실경로 확인이 남았다. (2) 세트 설계·다음 콘텐츠(중학)는 앱 CLAUDE.md 1.2의 사용자 경고대로 **사용자 명시 지시 전까지 착수 금지**(질문·추천도 금지). (3) 앱 CLAUDE.md 4.6 참고 - 검증기 통과는 형식 보장일 뿐 내용 품질을 보장하지 않는다(이번에 원장 reviewed 800건에서 68건이 나온 것이 그 증거). 상세: apps/english-vocabulary/PROGRESS.md 2026-07-29, 허브 PROGRESS.md 34.

<!-- 2026-07-29 봉합(세션 80adee40) 시 NEXT-SESSION chain 3건 cap 초과분 이동 (내용 무수정) -->

## 직전 작업 (2026-07-28, 기존 지문 1~80번 검사 → 1~40편 보강, 41~80편 중단)

32번 봉합 직후 사용자가 "1~80번도 검사해줘"로 기존 지문까지 범위를 넓혔고, "고칠게 있으면 수정해줘" → "나머지 배치 끝나면 병합하고 배포까지"로 이어졌다. 작업 중 사용자가 토큰 과소비를 지적해("토큰 소모가 너무 커, 종료해줘") 41~80편 8배치를 중단하고 완료된 1~40편만 반영·배포했다(커밋 bd849be, SW v194). (1) 검사 - 80편을 5편씩 16배치로 갈라 감수 8배치(1~40편)를 돌렸고 그중 2배치는 API 타임아웃 실패. 41~80편은 감수 없이 기계 진단 파일만 만들어 보강에 넘겼는데 이 1단계가 더 효율적이었다. 커리큘럼 숙어 44개는 전부 반영돼 있었고, 끊기 규칙 지문당 5.5항목(50문장 공백)·심화 카드 Lv3 각 1개·264문장 2덩어리 고정·카드 중복 74문장이라는 격차가 드러났다. (2) 코드 2건 - 끊는 이유가 that+시간명사를 "that절 앞"으로 오표시하던 것 수정, 검증기가 allowed를 대표 경계와 대조하지 않아 죽은 데이터가 통과하던 구멍 차단(기존 2건 교정). (3) 보강 1~40편 - 끊기 규칙 710항목(200문장 100%)·심화 카드 26개·조각 평균 2.62덩어리·카드 중복 0, 정성 경고 120편 12→0건. run-node 전량 통과 + 숙어 62개 전수 반영 + 화면 재생 2편 콘솔 0. **다음 행동** = (1) **41~80편 40편 보강이 미완이다** - 재개 시 감수 단계 없이 보강 1단계로, 배치를 10편 단위로 묶어 에이전트 수를 절반으로 줄일 것(이번 토큰 과소비의 주 원인이 2단계 분리 + 16배치 고정비 중복). 배치 진단 파일 만드는 스크립트 패턴은 PROGRESS 33.2 참고. (2) 커리큘럼 121번 이후 신규 출제(현재 120/200편) - 착수 전 앱 CLAUDE.md 4.6(검증 통과 ≠ 품질 보장) 필독. (3) 보고 시 "검증 통과"의 범위를 명시할 것(형식 검증인지 화면 실경로인지). 상세: apps/english-reading/PROGRESS.md 2.51~2.52, 허브 PROGRESS.md 33.

<!-- 2026-07-29 봉합 시 NEXT-SESSION chain 3건 cap 초과분 이동 (내용 무수정) -->

## 직전 작업 (2026-07-28, english-vocabulary 초등 어휘 BATCH 01 제작 + 사전 실조회 대조 도입)

`/jn` 추천에서 시작해 공식 초등 어휘 첫 200개를 실제로 만든 세션. 사용자 결정 3건 - (1) BATCH 01 착수 (2) 기존 785단어와 겹치는 단어도 그 뜻·예문을 초안으로 참고하지 않고 처음부터 작성 (3) 사전 대조를 실제 조회로 넣고 이미 만든 200개도 소급 확인. 착수 전 "기존 단어는 폐기냐" 질문에 비교 문서 근거로 답 - 785개 중 615개는 공식 목록과 겹쳐 살아남고 실제로 목록에서 빠지는 건 23개뿐, 147개는 공식 기준 중·고 수준이라 중급 세트에서 다시 쓸 단어. (1) 제작 - 공식 2022 개정 초등 권장(`*`) 대표형 1~200번(`a`~`date`)을 40개씩 5묶음 순차 작성(규칙 §10이 일괄 대량 생성·병렬 작성 금지). 표제어·별표는 공식 원천 그대로 두고 품사·대표 뜻·예문·번역만 자작. 관련형은 형태 유추가 어려운 4건만(a→an, beauty→beautiful, compute→computer, cover→discover), 불규칙 활용 12건. setId·learningOrder는 null(학습 세트는 800개 완성 후 빈도·활용도로 별도 설계). (2) 검증기 신설 - `tools/validate-batch.mjs`(배치 리치 스키마 전용, 앱용 validate-data.mjs와 역할 분리). 공식 표제어 대조·id↔순번 일치·품사 허용값·예문 길이·목표 단어 포함·누락 순번까지 검사. (3) 2회 검수 - 1차(사실·형식) 19건 수정: 뜻과 예문 불일치(by/cold/comic/case), 초등 난이도 초과·모호(could/culture/chicken/congratulate), 예문 문형 반복(`May I~` 3→2회, `Please~` 7→3회 등). 2차(품질·일관성) 12건 수정: 예문에 섞인 어려운 어휘 11건 제거(fasten·swung·rowed·buried·sank 등), ago/before가 둘 다 "~전에"였던 중복 해소. 최종 뜻 중복 0·예문 시작 패턴 3회 이상 반복 0. (4) 화면 적합성 - 앱 CSS를 링크한 표본 미리보기(임시 폴더, 앱 파일 무변경)로 browser-shot 확인, 표본 10개 잘림 0·콘솔 0. (5) 사전 실조회 대조 - `tools/lexical-crosscheck.mjs` 신설(두 공개 사전 수집 캐시 + 품사 자동 대조 + 근거 md 기록, 호스트별 속도 제한 대응 내장). 200개 전량 조회해 근거 확보 두 사전 199건·위키낱말사전 단독 1건(`be`), **품사 불일치 0건·뜻 수정 0건**. 사전 첫 정의와 다른 뜻을 택한 9건(area·board·care·club·court·date·comic·cow·couple)은 사전에 실재하는 뜻이며 초등 활용도 기준 선택으로 사유를 기록. 규칙 §2.2 신설로 다음 배치부터 의무화. 커밋 2건(20df2e6, 7240201). **다음 행동** = (1) BATCH 02(201~400번, `daughter`~) - 규칙 §11에 따라 **사용자 승인 후에만** 착수, 자동 진행 금지. 절차·규칙은 `apps/english-vocabulary/docs/NEXT-authoring-batch-01.md`가 그대로 적용된다(입력 범위와 산출 파일명만 교체). (2) 앱 적용은 초등 800 전량 제작 후 별도 단계 - 이번 배치는 앱 데이터·코드·진도를 일절 건드리지 않았다(규칙 §10). (3) 두 사전이 같은 뿌리(Free Dictionary API가 위키낱말사전 파생)라 완전 독립 검증은 아님 - 상용 사전은 라이선스상 제외. 상세: apps/english-vocabulary/PROGRESS.md 2026-07-28.

> 2026-07-19 이전 작업(지문 20편 추가·ChatGPT/Gemini 협업 출제·200편 커리큘럼 확정)부터는 3건 cap 초과로 archive/NEXT-SESSION-archive.md로 이동.
> NEXT-SESSION.md 체인 3건 cap(§6.6) 초과분을 무수정 이동 보관(§3.4.4). 위가 최신.

## [이동 2026-07-29 · 34번 봉합 시 3건 cap 초과] 이전 작업 (2026-07-28, english-reading 지문 81~120번 전수 검사 → 40편 전면 보강)

## 이전 작업 (2026-07-28, english-reading 지문 81~120번 전수 검사 → 40편 전면 보강)

사용자가 외부 도구(Codex)로 만들어 f7c016f로 커밋해 둔 40편을 전수 검사하고, 드러난 결함을 전면 재작업으로 메운 세션. 지시는 2단계였다 - 먼저 "이상이 없는지 전수 검사", 결과 보고 후 "모두 수정해. 문제의 수준이 떨어지는 부분이 있으면 다 교체해도 되니 보강해줘". (1) 검사 - 40편 200문장을 5편씩 8배치로 갈라 에이전트 8개 병렬 감수(13개 항목)하고, 감수 주장은 원본 대조로 재확인 + 기계로 셀 수 있는 항목은 기존 80편과 수치 대조해 "기존 대비 퇴행인가"를 객관 기준으로 삼았다. (2) 밝혀진 결함 - breakRules가 200문장 전부 빈 배열(기존 87.5% 충전)이라 5등급 채점 중 허용·비추천 두 등급과 이유 카드가 미발동, insight 0편(기존 14편), chunks 199/200이 2덩어리 고정이라 동사-목적어를 가르는 끊기가 대표 정답으로 등록, 커리큘럼 지정 숙어 9편이 제목에만 존재, 틀린 문법 설명 2건(목적격을 주격이라 함·When절과 주절 역할 뒤집음), 소재 어긋남 5편, 시제 혼재 1편. 코드에서는 목록 스크롤 리스너가 화면 전환 시 해제되지 않아 콘솔 에러 + 위치 유실. (3) 보강 - 8배치 병렬 재작업(draft-only, id·level·topic 불변으로 학습 기록 보호). breakRules 678항목(200/200 문장)·insight 37문장·chunks 평균 2.76·숙어 18/18 반영, lint 경고 16→12건. 코드 3건은 자비스 직접 수정(setTop에서 리스너 해제 + 복원 다중 프레임 재시도 + 죽은 코드 제거). (4) 검증 - run-node 120편 strict 통과, playwright 실경로 2종(스크롤 왕복 4경로 정확 복원·콘솔 0 / 보강 지문에서 5등급 채점 5종 동시 발동 + 이유 카드·심화 카드 표시). SW v192→v193, standalone 재빌드(1091KB). **다음 행동** = (1) 커리큘럼 121번 이후 지문 출제 - 이때 앱 CLAUDE.md 4.6(검증 통과 ≠ 품질 보장, 3종 사각지대)을 반드시 먼저 읽을 것. (2) 기존 80편에도 같은 계열 결함(끊기 2등분·어휘를 문법 라벨로)이 있는지는 이번 검사 범위 밖이라 미확인 - 점검 여부는 사용자 결정. (3) 숙어 배정 대조 lint는 여전히 미구현(커리큘럼 숙어표 데이터화 선행), 이번에도 일회용 스크립트로 대조했다. 상세: apps/english-reading/PROGRESS.md 2.51.

## 이동 2026-07-28 (1~40편 보강 세션 봉합 시 3건 cap 초과분)

## 이전 작업 (2026-07-23, english-vocabulary 신규 앱 - 반복 암기 단어장)

ChatGPT 작성 요청서로 "영어 단어장 html앱"을 신규 요청받아 game-hub의 두 번째 앱(apps/english-vocabulary, english-reading 형제)으로 구현한 세션. /jarvis-init로 진입했으나 이 위치가 이미 game-hub 도메인이라 새 도메인 골격이 아니라 앱 추가로 판단. 핵심 경험 = 200개에서 시작해 외운 단어를 지워 0개로 만드는 반복 암기(시험·타이핑 없음, 큰 글자·큰 버튼·라이트 테마로 직장인·중장년 배려). 착수 전 4개 결정 모두 사용자 승인 추천안 - 허브 표준 무빌드 바닐라+localStorage / 1차 필수만 / IPA 제외·SpeechSynthesis 음성만 / Undo·보관함 복습을 1차 포함. (1) v0.1(80c666c) - deck.js 순수 학습 로직(active·learned/모름·외움/바퀴 셔플/Undo/보관함 복습/serialize) + 6화면(홈·학습·보관함·복습·완료·설정) + 발음·키보드·글자크기 3단계. 샘플 20단어. (2) v0.2 8세트 확장 구조(43678e9) - 실제 중학 8세트×200=1600 대비 manifest.json+set-NNN.json 구조, ID 규칙 ev-sNN-NNNN·ev-set-NNN+level, 검증기 tools/validate-data.mjs 신설(필드·중복·형식·strict 200/1600, error 시 적용 차단). 실데이터는 임의 생성 금지(검증 자료 기반 별도 제작·검수 후 적용). (3) 자기 리뷰 후 완료화면 되돌리기 보완(b5bd8c5). 검증 - 유닛 63 PASS, validate sample 통과·strict 의도대로 실패, browser-shot 5화면 콘솔0. **다음 행동** = (1) 실제 1600단어 - 검증 가능한 중학 어휘 자료 + 세트별 단어·뜻·예문·해석 목록을 입력받아 채우기(자비스 임의 생성 금지) → node apps/english-vocabulary/tools/validate-data.mjs --strict 검증 → manifest에서 그 세트 available:true·count:200 전환. (2) 8세트 UI(세트 선택·잠금·진행률)는 데이터 준비 후 추가(현재는 단일 세트). (3) 배포 - 이번 /jc로 3커밋 push(GitHub Pages 자동, 허브 홈에 wip 카드 노출). 상세: apps/english-vocabulary/PROGRESS.md v0.1~v0.2.

## 이동 2026-07-28 (english-vocabulary BATCH 01 제작 세션 봉합 시 3건 cap 초과분)

## 이전 작업 (2026-07-19, 지문 20편 추가 - Daily Life 28편 완성 + Relationships 코스 신설)

Claude Code 일원화 출제 흐름(2.46 확립)을 처음 그대로 밟아 커리큘럼 21~40번 20편을 만든 세션. 사용자가 먼저 "20문제 추가 프로세스"를 설명 요청(제작 없이)하고, "5편씩 쪼개나 한 번에 하나" 질문에 4배치 병렬 답변 뒤, "Daily Life 28편까지 채우고 Relationships 12편, 20편 만들어줘" 지시로 실제 제작. (1) 코스 구조(사용자 결정) - Daily Life 정원 28편 채우고(21~28) Relationships 코스 신설(id "relationships", 29~40 12편). daily-life 20→28편. (2) 4배치 병렬 출제 - A) DL 21~24 Lv2 B) DL 25~28 Lv3(insight 4문장) C) Rel 29~34 Lv1(숙어없음) D) Rel 35~40 Lv2. 각 에이전트가 passages.json 무수정·scratchpad draft만 Write + 자체 validate-draft 통과(2.45 공유파일 동시조작 사고를 draft-only로 차단). (3) 취합·최종검증 자비스 직접 - 합본 20편 validate-draft 20/0(배치간 중복 포함), run-node strict 전체 통과·새 20편 lint 경고 0, standalone 재빌드(358KB), browser-shot 3종(홈 코스2개·Rel Lv1 채점·DL Lv3 채점, 콘솔0). (4) 배포 - 사용자 "배포할까요?"에 /jc(봉합=push)로 응답=push 승인, SW v188→v189 bump 동반(main push=GitHub Pages 자동배포). **다음 행동** = (1) 다음 배치 출제 - CURRICULUM_REVIEW.md 통번호 41번(Travel) 이후 또는 미완 topic. 흐름은 동일(직접 출제→validate-draft→passages.json→SW bump·push). (2) 코스 구조 - 현재 Daily Life·Relationships 2개, 다음 topic 추가 시 코스 신설/편성 결정. (3) 숙어 배정 대조 lint - 커리큘럼 숙어표 데이터화 선행(미구현). 상세: apps/english-reading/PROGRESS.md 2.47.

## 이동 2026-07-28 (지문 81~120번 전면 보강 세션 봉합 시 3건 cap 초과분)

## 이전 작업 (2026-07-19, 20편 실출제 + 25편 폐기 + 복사버튼 + lint + 배포 + Claude Code 일원화)

긴 세션 - 확정본 v3 첫 실출제부터 출제 체계 일원화까지. (1) 실출제 20편(Daily Life 1~20, Lv1 12+Lv2 8) 4배치 병렬 위임, 재사용 검증도구 tools/validate-draft.mjs 신설. (2) 3-LLM 감수(ChatGPT·Gemini·Claude) 반영 - 번역 정확성·Lv2 하한 확장·레벨 월경(수동태/to부정사)·숙어 map 이탈·굽은따옴표 정규화. (3) 기존 시험작 25편 폐기(사용자 AskUserQuestion 결정), 커리큘럼 1~20만 코스 daily-life로 재구성. (4) 문장 복사버튼 아이콘화(테두리·배경 제거+해석버튼과 높이 25px 세로중앙+복사 시 초록 체크 토글). (5) 정성 lint(core/validate.js:lintPassage) 신설 - 레벨 단어수·문장 길이 리듬·굽은따옴표·레벨 초과 문법·시작어 반복 '경고'(강제 아님), validate-draft·run-node 연결. (6) 배포 - GitHub Pages는 main push 시 자동 배포라 파일은 push 시점 배포됨, 빠진 SW 캐시만 v186→v188 bump해 PWA 갱신, 실제 URL 20편·콘솔0 확인. (7) deploy.json english-reading 조정(paths·commitMessage·images). (8) Claude Code 일원화(d1f0ef4, 사용자 "모든 작업 일원화") - 출제·감수·검증 자비스 단독, 외부 LLM 협업 폐지. docs/ChatGPT 폐지(커리큘럼·스키마→docs/authoring/, 협업문서·incoming 제거, 날짜문서→docs/archive/), 앱 '출제 패키지' 화면·buildAuthoringPackage·extractAnchors·DEFAULT_ANCHORS 제거(검증용 analyzeContent·nextCurriculumHint·compareAgainstExisting·AUTHORING_RULES·CURRICULUM 유지), CLAUDE.md 3.9 재작성. **다음 행동** = (1) 다음 배치 출제 - 자비스가 docs/authoring/CURRICULUM_REVIEW.md(200편 지도)를 직접 보고 출제→validate-draft→passages.json 반영→SW bump·push 배포. (2) 코스 구조 - 다음 topic 추가 시 주제별/난이도별 결정. (3) 숙어 배정 대조 lint - 커리큘럼 숙어표 데이터화 선행. 상세: apps/english-reading/PROGRESS.md 2.45~2.46.

## 이동 2026-07-23 (english-vocabulary 신규 앱 세션 봉합 시 3건 cap 초과분)

## 이전 작업 (2026-07-18~19, ChatGPT/Gemini 협업 출제 워크플로우 + 200편 커리큘럼 확정)

여러 LLM으로 출제하되 기준이 안 흔들리게 하는 체계를 실제 가동하고 200편 설계를 확정한 세션. (1) 읽기 UX 2건(877999c) - 회독 완료 모달 후 지문 최상단 스크롤 리셋, 각 문장/지문 하단에 원문 복사 버튼. (2) ChatGPT 출제 워크플로우 정립(a2ec9f6·45a44c2·d0052f4) - 과설계 슬림화, insight/grammar/words 규칙 보완, 출제 착수 전 현황 9항목 전달 의무, 출제 단위 5편·incoming 폴더 규칙. (3) 지문 21~25 5편 반영(6ae75cd, 20→25편). (4) T-101(084a7f8) - chunkViolations의 본동사 do/does/did 조동사 오인 수정 + reading-the-opponent 3분할 복원 + 회귀 테스트. (5) 26~35 출제 품질 비교로 사용자 결정 = 출제는 Claude Code, 감수는 ChatGPT. (6) 200편 커리큘럼 확정본 v3(docs/authoring/CURRICULUM_REVIEW.md) - 3단계 60/80/60·중학~고1·숙어 평균1, ChatGPT·Gemini·Claude 3차 감수 63건 반영, 기계검증(200편·60/80/60·소재중복0·같은 숙어 3회+0). ※ 이 세션의 ChatGPT/Gemini 협업 전제는 이후 2026-07-19에 Claude Code 일원화로 폐지됨(커리큘럼 지도 자체는 docs/authoring/에서 계속 사용). 상세: apps/english-reading/PROGRESS.md 2.44.

## 이동 2026-07-19 (지문 20편 추가 세션 봉합 시 3건 cap 초과분)

## 이전 작업 (2026-07-16, english-reading UI 다듬기 + 출제 패키지 시스템 + 앱 입력 폐지)

사용자 연속 UI 지시 + ChatGPT 제안 기반 출제 시스템 작업, 3커밋. (1) UI 다듬기(7d441f1) - 뒤로가기·단어장 삭제 버튼을 유니코드 문자(←/✕)에서 SVG 아이콘으로 교체(폰트 편차·박스 중앙정렬 문제 해소, "UI 버튼은 SVG만" 사용자 규칙을 CLAUDE.md 5.6 명문화). 앱 진입을 항상 홈(코스 목록)으로 고정(마지막 읽던 지문 자동 복원 폐지). '마음의 법칙'(mind-laws) 코스 통째 삭제(word-order-foundations 단일 코스로 정리). 단어장에서 뜻·예문·출처를 접지 않고 바로 표시 + 즉시 삭제. (2) 출제 패키지 시스템 PHASE B 1단계(f64b112) - 여러 LLM이 시간차로 만들어도 기준이 안 흔들리게 하는 토대. core/authoring-index.js 신설(콘텐츠 상태 분석·커리큘럼 힌트·앵커·출제 패키지 조립·기존 대조). ※ 출제 패키지 화면·조립부는 2026-07-19 Claude Code 일원화로 폐지(검증용 분석·대조 함수는 authoring-index에 유지). (3) 앱 입력 폐지(5843179) - 앱에서 JSON 직접 붙여넣어 저장하는 흐름 폐지, customPassages 인프라 제거. 상세: apps/english-reading/PROGRESS.md 2.41~2.43 + docs/archive/2026-07-16-authoring-package-plan.md.

## 이동 2026-07-19 (20편 실출제·기존 25편 폐기 세션 봉합 시 3건 cap 초과분)

### 이전 작업 (2026-07-16, english-reading 채점 마크 정비 + 완독 표시 3종 + 숙어 등록)

사용자가 채점 표시·완독·어휘 3건을 연속 지시. (1) 채점 마크 - 다른 분할(그었지만 추천도 허용도 아닌 위치)에 붉은 작은 x를 새로 넣고, 놓침 화살표(▾)를 붉게, 추천 원(●)·허용 원(○)·비추천 삼각형(△)·다른분할 x(✕)·놓침 화살표(▾)의 시각 크기를 통일(browser-shot 확대로 눈맞춤). CLAUDE.md 5.1의 "빨간 X 폐기"를 "다른분할·놓침에 붉은 마크 사용"으로 갱신. (2) 완독 표시 3종 - 완독 시 끊기 정확도·단어 수집 여부를 doneMeta{chunkOk,hadWords}에 기록해, 완벽(끊기 다 맞고 모르는 단어 없음)은 카드 딤드, 끊기 틀림은 "끊기·완독", 단어 담음은 "단어·완독"으로 목록에서 구분. (3) 숙어 등록 - words에 "takes a bus"처럼 여러 낱말 표현 허용(core/tokenize.js matchWordTargets가 연속 토큰 매칭), 표현 속 아무 낱말이나 누르면 그 표현 전체가 묶여 오렌지로 수집·공개, 낱말 몸통만 반응해 끊기 틈은 침범 안 함, 본문 표시는 지금대로 깨끗하게 유지(사용자 "지금대로 두고 숙어만"). 예시 takes a bus·where to get off. 검증 browser-shot(마크 확대·완독 태그와 딤드·숙어 묶음 수집) 콘솔 0, 유닛 통과, standalone 295KB. 커밋 a223ec8·547597f. 상세: apps/english-reading/PROGRESS.md 2.40.

## 이동 2026-07-16 (english-reading UI·출제패키지 세션 봉합 시 3건 cap 초과분)

### 이전 작업 (2026-07-16, english-reading 100문장 콘텐츠 검수 보고서)

사용자가 영어 독해 작성·검수 규칙(16장)을 제시하고 word-order-foundations 코스 20지문 100문장을 이 규칙으로 전수 검수하라고 지시(원본 미수정·보고서만·데이터 수정 금지). 지목한 json은 이미 passages.json에 병합된 상태라 현행 라이브를 검수. 방식 = 자동 검증(코드) + 내용 검수(에이전트 5개 병렬) + 반복 패턴 코드 전수 교차검증. 결과 - 자동 검증 통과(critical 0·major 0·단어수 warn 33), 내용 검수 critical 0·major 21·minor 9, 판정은 규칙 준수 5지문 / 수정 후 사용 15지문 / 사용 금지 0. **핵심 발견** = breakRules.allowed 항목이 코스 전체 21개인데 전부 대표 청킹 경계와 겹쳐 채점 시 발동 안 하는 죽은 데이터(살아있는 대안 분할 0개). 원인은 validate.js가 discouraged 대표경계 중복만 검사하고 allowed는 미검사 = 규약(CLAUDE.md 4.3)-구현 불일치. 학습자 실사용엔 무해. 배포 - deploy.json이 이전 flightshooting 설정이라 web-deploy 회피, 보고서만 직접 push(ab999da). **다음 행동** = 사용자 결정 대기 - (a) 데이터에 반영할지(major 21 죽은 allowed 삭제 + validate.js 검사 추가가 근본 처방, 위험 낮음) (b) minor 9 반영 여부 (c) 검수 규칙을 앱 AUTHORING_PROMPT/CLAUDE.md에 영구 반영할지. 상세: apps/english-reading/PROGRESS.md 2.37 + docs/2026-07-15-content-validation-report.md.

## 이동 2026-07-16 (english-reading 마크·완독·숙어 세션 봉합 시 3건 cap 초과분)

### 이전 작업 (2026-07-15, english-reading 두 번째 코스 100문장 + 코스 고르기 화면)

사용자가 앱 루트에 넣은 english_reading_100_sentences.json(1코스 Word Order Foundations, 20지문 100문장)을 앱에 통합했다. 검증 중 두 문제를 수정 전 보고 - (1) 앱이 코스 하나만 화면에 렌더(코스 선택 UI 없음)라 새 코스를 그냥 추가하면 안 보임 (2) 100문장 중 6문장의 끊기 경계가 끊는 기준 규칙 위반. 통합 방식은 사용자가 '코스 고르기 화면 추가'(두 코스 병존)를 선택. 처리 - 위반 6건 chunks 경계 수정(짧은 주어+조동사는 동사까지 묶고, 구동사·복합전치사 꼬리는 목적어와 병합) 후 strict 전수 통과, passages.json에 두 번째 코스로 병합(원본 json은 병합 후 제거, git 복구 가능). 앱은 단일 코스에서 다중 코스로 확장 - renderCourseList 신설(진입 → 코스 목록 → 코스 선택 → 지문 목록), rebuildCourse가 전 코스를 createCourse하고 customPassages는 첫 코스에만, 뒤로가기·단어장·출제·설정·클리어 경로 정합(전역 액션은 코스 목록으로 이동). insight 하한을 1→0으로 완화(쉬운 코스는 어려운 문장이 없어 insight 0이 정당, 상한 3 유지). 검증 - node 테스트 전량 통과, browser-shot 2회(코스 목록 2코스 / 새 코스 진입 5등급 채점·해석 분리·문법 접힘) 콘솔 0, standalone 재빌드(285KB)·SW v186. 커밋 7207b97. **다음 행동** = 배포(/web-deploy) 사용자 지시 대기(로컬 커밋까지). 후보(사양 비스코프) - 오디오·TTS·구간 재생, listeningSenseGroups(듣기), 말하기 변형. 상세: apps/english-reading/PROGRESS.md 2.36.

## 이동 2026-07-16 (english-reading 버그·UX 재설계 세션 봉합 시 3건 cap 초과분)

### 이전 작업 (2026-07-15, english-reading 1차 개편 - 5등급 채점 + 해석 분리 + 문법 계층화)

확정 사양대로 english-reading 1차 개편을 착수·구현·배포까지 완주했다. (1) O/X 이진 채점을 추천/허용/비추천/다른분할(neutral)/놓침(missed) 5등급으로 전환(core/chunking.js gradeChunks 신설, 기존 gradeSlashes 보존 + 데이터 breakRules{allowed[],discouraged[]}). 빨간 X 폐기·색+모양 병행(추천 청록●/허용 회색○/비추천 주황△/놓침 청록▾). (2) 직독직해와 자연스러운 완역(naturalTranslation)을 별도 카드로 분리. (3) 핵심 어순(wordOrderPoint) 기본 노출 + 상세 문법 "문법 자세히 보기" 접기. 신 필드 3종은 전부 옵셔널이고 core/normalize.js normalizeSentence가 fallback을 채워 기존 customPassages 하위호환(localStorage 강제 초기화 없음). validate.js는 built-in strict/custom 관대 이중 모드 + breakRules 범위·중복·추천경계 충돌 검증. 30문장은 서브에이전트 6개 병렬 생성 후 boundary를 전량 재검산해 마이그레이션(28 정확·1건 reason만 교정). 전 문장 한 화면·문장별 해석 버튼 구조 유지(사양 제약). 문법 접힘 버그(`.grammar-list{display:flex}`가 [hidden] 덮어씀) 수정. 검증 - node 테스트 전량 통과, browser-shot 5등급 판정·문법 접힘(visible=false)→펼침(true) 콘솔 0, standalone 재빌드(150KB)·SW v185. 커밋 b24794f, /web-deploy 배포 완료(smoke 2 URL 200 + 콘솔 0 + `.passage-card` 가시). **다음 행동** = 특정 대기 없음. 후보(사양 비스코프) - 오디오·TTS·전체 음성 구간 재생, listeningSenseGroups(듣기 리듬), 말하기용 문장 변형, 신규 100문장 콘텐츠. 상세: apps/english-reading/PROGRESS.md 2.35 + docs/2026-07-15-phase1-refactor-plan.md.

## 이동 2026-07-16 (english-reading 100문장 검수 세션 봉합 시 3건 cap 초과분)

### 이전 작업 (2026-07-14, flightshooting 어린이 모드 친구 비행기)

flightshooting 어린이 모드 전용 친구 비행기 신설 + 실플레이 다듬기(하네스 루프 플랜→기획→구현→테스트 후 피드백 5건 반영). 친구는 왼쪽에서 말풍선("안녕!"→"난 친구야"→"같이 게임하자!")으로 등장해 **플레이어와 완전 독립으로**(자기 세로 밴드 = 플레이어보다 위 줄에서 가까운 적을 스스로 추적) 함께 싸우고, 플레이 중 가끔 잡담("잘한다!" 등)한다. 메인 총알만 보유하고 강화 10단계(아이템 공유로 성장)로 발 수가 늘되 좁은 부채(만렙 ≈25°)로 앞으로 모아 쏜다. 총알은 어둡고 차분한 웜톤 작은 별(플레이어 냉색 빔·적 빨간 탄과 구분). 아이템·점수 공유, HP 하트 5개는 플레이어와 별개 풀(피해 각자·회복 H 공유·기절 후 H로 부활). 초기 구현은 플레이어 옆 추종이었으나 사용자 지시로 완전 독립·다크 총알·좁은 부채·최소 크기·잡담으로 다듬음. core/friend.js(순수)·world·view·numbers/colors, kind 'fmain', 일반 모드 무영향. **다음 행동** = 배포(SW 캐시 갱신 + GitHub Pages, web-deploy) 사용자 지시 대기 + 친구 밸런스·총알 명도 실플레이 조정 여지. 상세: games/flightshooting/PROGRESS.md 2026-07-14 친구 2개 절 + docs/09_friend.md.

## 이동 2026-07-15 (100문장 코스 통합 세션 봉합 시 3건 cap 초과분)

### 이전 작업 (2026-07-09, english-reading 끊는 기준 카드 노출 위치 이관)

허브 PROGRESS 30장 sealing. 사용자가 "끊어 읽기 기준을 모든 문제마다 노출하냐, 별도 메뉴/버튼으로 빼라"고 지적해, 29장(2.17)에서 읽기 화면 본문 상단에 매 지문 반복 배치하던 '끊는 기준 보기' 카드 버튼을 상단바 상시 버튼(단어장 옆)으로 이관했다. 누르면 노출 설정과 같은 오버레이 모달로 다섯 자리 원칙 카드가 열려 본문 흐름을 가리지 않는다. setTop showGuide 플래그로 읽기 화면에서만 노출(목록·단어장 숨김), chunks OFF면 버튼도 숨김. index·main(openGuide 신설)·style·spec·SW(v156)·standalone 갱신. 검증: 유닛+무결성 통과 + browser-shot 3분기(목록 숨김/읽기 노출/모달 5행) 콘솔 0. **다음 행동** = 특정 대기 작업 없음. 후보 - (a) 지문·코스 확대 (b) 단어장 복습 심화 (c) 읽기 통계. 상세: PROGRESS 30장 + apps/english-reading/PROGRESS.md 2.18.

## 이동 2026-07-15 (english-reading 1차 개편 세션 봉합 시 3건 cap 초과분)

### 이전 작업 (2026-07-09, english-reading v0.7 끊어 읽기 능동 연습 + 다듬기 6건)

허브 PROGRESS 29장 sealing. 사용자 지시로 문장 클릭 해설 열람을 폐기하고 능동 연습으로 전환했다 - 단어 사이 틈을 눌러 / 선을 긋고(토글), 문장 끝 [해석] 버튼으로 채점(맞음 검정 유지·잘못 그음 회색 점선·빼먹음 빨강), 그때서야 끊어 읽기 해석 + 그 문장의 모든 문법 목록(30문장 90항목 신규 제작) + 심화 카드가 열린다. 이어 사용자 피드백 6건을 각각 즉시 배포로 처리 - 채점 버튼 토글화, 문구 "해석"으로, 말풍선 중앙 고정+2초 자동 닫힘, 채점 색 체계 재설계+본문 하이라이트 전면 제거, 틀린 예문 취소선 제거, 그리고 "끊어 읽기 기준을 모르겠다" 처방으로 끊는 기준 카드 + 덩어리별 이유 태그 자동 부착. 상세: PROGRESS 29장 + apps/english-reading/PROGRESS.md 2.14~2.17.

## 이동 2026-07-14 (친구 비행기 세션 봉합 시 3건 cap 초과분)

### 이전 작업 (2026-07-08, english-reading v0.6 하이브리드 독해 기획 확정 → 구현 → 배포)

허브 PROGRESS 28장 sealing. v0.4 기획서를 v0.5~v0.6로 보강·확정(도움 노출량은 학습자 설정, 지문 한 편씩 완만한 사다리, 클리어는 코스 완주) 후 전면 구현 - 코스 "마음의 법칙" 6편(level 1~6), core/course.js, 목록·읽기·단어장·노출 설정·코스 클리어. playwright 19건 + 배포(7fdba8a). v0.7에서 읽기 인터랙션이 능동 연습으로 재편됨(29장). 상세: PROGRESS 28장.

<!-- 이동: 2026-07-19 봉합(2.44), 3건 cap 초과분 -->
## 이전 작업 (2026-07-16, english-reading 읽기 화면 버그 4건 + 완료 흐름·상단바 UX 전면 개편)

사용자 "한 문제 풀면 다음 못 넘어감, 전체 버그 확인"으로 시작. 핵심 버그 - 지문 읽기 화면에서 뒤로가기(←) 누르면 목록이 빈 화면 + 페이지 에러였다. 원인은 setTop이 `el.back.onclick = onBack`으로 renderList를 직접 연결해 뒤로가기 클릭의 MouseEvent가 renderList(c)의 c로 새어 course를 덮어쓴 것. `() => onBack()`으로 차단. 병렬 에이전트로 부수 3건 수정 - chunks OFF+words ON 단어 소실 / 죽은 이어읽기(bootScreen 신설) / 하이픈·공백 토큰 수 어긋나도 통과하던 validate. 완료 흐름 재설계 + 상단바 토글 이동. 커밋 4f4b38e. 상세: apps/english-reading/PROGRESS.md 2.38+2.39.
