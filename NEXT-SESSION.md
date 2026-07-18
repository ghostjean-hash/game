# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-07-18~19, ChatGPT/Gemini 협업 출제 워크플로우 + 200편 커리큘럼 확정)

여러 LLM으로 출제하되 기준이 안 흔들리게 하는 체계를 실제 가동하고 200편 설계를 확정한 세션. (1) 읽기 UX 2건(877999c) - 회독 완료 모달 후 지문 최상단 스크롤 리셋, 각 문장/지문 하단에 원문 복사 버튼. (2) ChatGPT 출제 워크플로우 정립(a2ec9f6·45a44c2·d0052f4) - 과설계 슬림화, insight/grammar/words 규칙 보완, 출제 착수 전 현황 9항목 전달 의무, 출제 단위 5편·incoming 폴더 규칙. (3) 지문 21~25 5편 반영(6ae75cd, 20→25편). (4) T-101(084a7f8) - chunkViolations의 본동사 do/does/did 조동사 오인 수정 + reading-the-opponent 3분할 복원 + 회귀 테스트. (5) 26~35 출제 품질 비교로 사용자 결정 = 출제는 Claude Code, 감수는 ChatGPT. (6) 200편 커리큘럼 확정본 v3(docs/ChatGPT/CURRICULUM_REVIEW.md) - 3단계 60/80/60·중학~고1·숙어 평균1, ChatGPT·Gemini·Claude 3차 감수 63건 반영, 기계검증(200편·60/80/60·소재중복0·같은 숙어 3회+0). **다음 행동** = 확정본 v3의 200편 주제 지도를 기준으로 실제 5문장 지문 원문을 배치(5~10편, 예 Daily Life Lv1 1~5)로 출제 → 자비스 validatePassage+compareAgainstExisting 검증 → passages.json 반영. 원문 배치 규칙(시간대 분산·문장 길이 리듬·대명사 설계)은 CURRICULUM_REVIEW.md §6. 배포(/web-deploy) 미실행 승계 - deploy.json이 flightshooting 가리켜 회피, 배포 시 SW 캐시 bump 필요. 상세: apps/english-reading/PROGRESS.md 2.44.

## 이전 작업 (2026-07-16, english-reading UI 다듬기 + 출제 패키지 시스템 + 앱 입력 폐지)

사용자 연속 UI 지시 + ChatGPT 제안 기반 출제 시스템 작업, 3커밋. (1) UI 다듬기(7d441f1) - 뒤로가기·단어장 삭제 버튼을 유니코드 문자(←/✕)에서 SVG 아이콘으로 교체(폰트 편차·박스 중앙정렬 문제 해소, "UI 버튼은 SVG만" 사용자 규칙을 CLAUDE.md 5.6 명문화). 앱 진입을 항상 홈(코스 목록)으로 고정(마지막 읽던 지문 자동 복원 폐지). '마음의 법칙'(mind-laws) 코스 통째 삭제(word-order-foundations 단일 코스로 정리). 단어장에서 뜻·예문·출처를 접지 않고 바로 표시 + 즉시 삭제. (2) 출제 패키지 시스템 PHASE B 1단계(f64b112) - 여러 LLM이 시간차로 만들어도 기준이 안 흔들리게 하는 토대(최종 200지문·1000문장). ChatGPT 풀 파이프라인은 현 규모 과설계로 판단, 사용자와 A안 1단계 확정. core/authoring-index.js 신설(콘텐츠 상태 분석·커리큘럼 힌트·앵커·출제 패키지 조립·기존 대조). 규칙 권위 이원(자동검증=validate.js / 정성규칙=authoring-index.js:AUTHORING_RULES). (3) 앱 입력 폐지(5843179) - 사용자가 앱에서 JSON을 직접 붙여넣어 저장하는 흐름이 혼란스럽다고 판단, 출제 화면을 '현재 상태 요약 + 출제 패키지 복사'만 남기고 축소, customPassages 인프라 제거. 새 문제는 챗봇 결과 JSON을 자비스에게 주면 passages.json에 커밋하는 방식으로 일원화. 검증 browser-shot 전 경로 콘솔 0, node 테스트 전량 통과(authoring 유닛 16건 신설), standalone 231KB. **다음 행동** = (1) 배포(/web-deploy) 미실행 - deploy.json이 flightshooting 가리켜 회피, 사용자 "배포해" 대기(배포 시 SW 캐시 bump 필요) (2) 새 문제 만들기 - 출제 패키지 복사→챗봇→결과 JSON을 자비스에게, 또는 자비스에게 직접 지시 (3) PHASE B 2단계 후보 - LLM 검수/수정 패키지·severity·목표구조 underused·level 밴드 확장 (4) flightshooting 미커밋분 타 세션 유지. 상세: apps/english-reading/PROGRESS.md 2.41~2.43 + docs/2026-07-16-authoring-package-plan.md.

## 이전 작업 (2026-07-16, english-reading 채점 마크 정비 + 완독 표시 3종 + 숙어 등록)

사용자가 채점 표시·완독·어휘 3건을 연속 지시. (1) 채점 마크 - 다른 분할(그었지만 추천도 허용도 아닌 위치)에 붉은 작은 x를 새로 넣고, 놓침 화살표(▾)를 붉게, 추천 원(●)·허용 원(○)·비추천 삼각형(△)·다른분할 x(✕)·놓침 화살표(▾)의 시각 크기를 통일(browser-shot 확대로 눈맞춤). CLAUDE.md 5.1의 "빨간 X 폐기"를 "다른분할·놓침에 붉은 마크 사용"으로 갱신. (2) 완독 표시 3종 - 완독 시 끊기 정확도·단어 수집 여부를 doneMeta{chunkOk,hadWords}에 기록해, 완벽(끊기 다 맞고 모르는 단어 없음)은 카드 딤드, 끊기 틀림은 "끊기·완독", 단어 담음은 "단어·완독"으로 목록에서 구분. (3) 숙어 등록 - words에 "takes a bus"처럼 여러 낱말 표현 허용(core/tokenize.js matchWordTargets가 연속 토큰 매칭), 표현 속 아무 낱말이나 누르면 그 표현 전체가 묶여 오렌지로 수집·공개, 낱말 몸통만 반응해 끊기 틈은 침범 안 함, 본문 표시는 지금대로 깨끗하게 유지(사용자 "지금대로 두고 숙어만"). 예시 takes a bus·where to get off. 검증 browser-shot(마크 확대·완독 태그와 딤드·숙어 묶음 수집) 콘솔 0, 유닛 통과, standalone 295KB. 커밋 a223ec8·547597f. 상세: apps/english-reading/PROGRESS.md 2.40.

> 2026-07-16 이전 작업(읽기 버그 4건·100문장 검수 보고서 등)부터는 3건 cap 초과로 archive/NEXT-SESSION-archive.md로 이동.
