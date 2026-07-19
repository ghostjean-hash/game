# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-07-19, 20편 실출제 + 25편 폐기 + 복사버튼 + lint + 배포 + Claude Code 일원화)

긴 세션 - 확정본 v3 첫 실출제부터 출제 체계 일원화까지. (1) 실출제 20편(Daily Life 1~20, Lv1 12+Lv2 8) 4배치 병렬 위임, 재사용 검증도구 tools/validate-draft.mjs 신설. (2) 3-LLM 감수(ChatGPT·Gemini·Claude) 반영 - 번역 정확성·Lv2 하한 확장·레벨 월경(수동태/to부정사)·숙어 map 이탈·굽은따옴표 정규화. (3) 기존 시험작 25편 폐기(사용자 AskUserQuestion 결정), 커리큘럼 1~20만 코스 daily-life로 재구성. (4) 문장 복사버튼 아이콘화(테두리·배경 제거+해석버튼과 높이 25px 세로중앙+복사 시 초록 체크 토글). (5) 정성 lint(core/validate.js:lintPassage) 신설 - 레벨 단어수·문장 길이 리듬·굽은따옴표·레벨 초과 문법·시작어 반복 '경고'(강제 아님), validate-draft·run-node 연결. (6) 배포 - GitHub Pages는 main push 시 자동 배포라 파일은 push 시점 배포됨, 빠진 SW 캐시만 v186→v188 bump해 PWA 갱신, 실제 URL 20편·콘솔0 확인. (7) deploy.json english-reading 조정(paths·commitMessage·images). (8) Claude Code 일원화(d1f0ef4, 사용자 "모든 작업 일원화") - 출제·감수·검증 자비스 단독, 외부 LLM 협업 폐지. docs/ChatGPT 폐지(커리큘럼·스키마→docs/authoring/, 협업문서·incoming 제거, 날짜문서→docs/archive/), 앱 '출제 패키지' 화면·buildAuthoringPackage·extractAnchors·DEFAULT_ANCHORS 제거(검증용 analyzeContent·nextCurriculumHint·compareAgainstExisting·AUTHORING_RULES·CURRICULUM 유지), CLAUDE.md 3.9 재작성. **다음 행동** = (1) 다음 배치 출제 - 자비스가 docs/authoring/CURRICULUM_REVIEW.md(200편 지도)를 직접 보고 출제(Daily Life 21~28 또는 다른 topic Relationships/Travel 등)→validate-draft(validatePassage strict+compareAgainstExisting+lintPassage)→passages.json 반영→SW bump·push 배포. 외부 LLM·앱 출제화면 없음(일원화). (2) 코스 구조 - 현재 daily-life 단일, 다음 topic 추가 시 주제별/난이도별 결정. (3) 숙어 배정 대조 lint - 커리큘럼 숙어표 데이터화 선행. 배포는 수동 push(GitHub Pages 자동, SW 캐시 bump 필요) 또는 /web-deploy(deploy.json english-reading 조정 완료). 상세: apps/english-reading/PROGRESS.md 2.45~2.46.

## 이전 작업 (2026-07-18~19, ChatGPT/Gemini 협업 출제 워크플로우 + 200편 커리큘럼 확정)

여러 LLM으로 출제하되 기준이 안 흔들리게 하는 체계를 실제 가동하고 200편 설계를 확정한 세션. (1) 읽기 UX 2건(877999c) - 회독 완료 모달 후 지문 최상단 스크롤 리셋, 각 문장/지문 하단에 원문 복사 버튼. (2) ChatGPT 출제 워크플로우 정립(a2ec9f6·45a44c2·d0052f4) - 과설계 슬림화, insight/grammar/words 규칙 보완, 출제 착수 전 현황 9항목 전달 의무, 출제 단위 5편·incoming 폴더 규칙. (3) 지문 21~25 5편 반영(6ae75cd, 20→25편). (4) T-101(084a7f8) - chunkViolations의 본동사 do/does/did 조동사 오인 수정 + reading-the-opponent 3분할 복원 + 회귀 테스트. (5) 26~35 출제 품질 비교로 사용자 결정 = 출제는 Claude Code, 감수는 ChatGPT. (6) 200편 커리큘럼 확정본 v3(docs/authoring/CURRICULUM_REVIEW.md) - 3단계 60/80/60·중학~고1·숙어 평균1, ChatGPT·Gemini·Claude 3차 감수 63건 반영, 기계검증(200편·60/80/60·소재중복0·같은 숙어 3회+0). ※ 이 세션의 ChatGPT/Gemini 협업 전제는 이후 2026-07-19에 Claude Code 일원화로 폐지됨(커리큘럼 지도 자체는 docs/authoring/에서 계속 사용). 상세: apps/english-reading/PROGRESS.md 2.44.

## 이전 작업 (2026-07-16, english-reading UI 다듬기 + 출제 패키지 시스템 + 앱 입력 폐지)

사용자 연속 UI 지시 + ChatGPT 제안 기반 출제 시스템 작업, 3커밋. (1) UI 다듬기(7d441f1) - 뒤로가기·단어장 삭제 버튼을 유니코드 문자(←/✕)에서 SVG 아이콘으로 교체(폰트 편차·박스 중앙정렬 문제 해소, "UI 버튼은 SVG만" 사용자 규칙을 CLAUDE.md 5.6 명문화). 앱 진입을 항상 홈(코스 목록)으로 고정(마지막 읽던 지문 자동 복원 폐지). '마음의 법칙'(mind-laws) 코스 통째 삭제(word-order-foundations 단일 코스로 정리). 단어장에서 뜻·예문·출처를 접지 않고 바로 표시 + 즉시 삭제. (2) 출제 패키지 시스템 PHASE B 1단계(f64b112) - 여러 LLM이 시간차로 만들어도 기준이 안 흔들리게 하는 토대. core/authoring-index.js 신설(콘텐츠 상태 분석·커리큘럼 힌트·앵커·출제 패키지 조립·기존 대조). ※ 출제 패키지 화면·조립부는 2026-07-19 Claude Code 일원화로 폐지(검증용 분석·대조 함수는 authoring-index에 유지). (3) 앱 입력 폐지(5843179) - 앱에서 JSON 직접 붙여넣어 저장하는 흐름 폐지, customPassages 인프라 제거. 상세: apps/english-reading/PROGRESS.md 2.41~2.43 + docs/archive/2026-07-16-authoring-package-plan.md.

> 2026-07-16 이전 작업(채점 마크·100문장 검수 보고서 등)부터는 3건 cap 초과로 archive/NEXT-SESSION-archive.md로 이동.
