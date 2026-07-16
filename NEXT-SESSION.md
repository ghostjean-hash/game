# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-07-16, english-reading UI 다듬기 + 출제 패키지 시스템 + 앱 입력 폐지)

사용자 연속 UI 지시 + ChatGPT 제안 기반 출제 시스템 작업, 3커밋. (1) UI 다듬기(7d441f1) - 뒤로가기·단어장 삭제 버튼을 유니코드 문자(←/✕)에서 SVG 아이콘으로 교체(폰트 편차·박스 중앙정렬 문제 해소, "UI 버튼은 SVG만" 사용자 규칙을 CLAUDE.md 5.6 명문화). 앱 진입을 항상 홈(코스 목록)으로 고정(마지막 읽던 지문 자동 복원 폐지). '마음의 법칙'(mind-laws) 코스 통째 삭제(word-order-foundations 단일 코스로 정리). 단어장에서 뜻·예문·출처를 접지 않고 바로 표시 + 즉시 삭제. (2) 출제 패키지 시스템 PHASE B 1단계(f64b112) - 여러 LLM이 시간차로 만들어도 기준이 안 흔들리게 하는 토대(최종 200지문·1000문장). ChatGPT 풀 파이프라인은 현 규모 과설계로 판단, 사용자와 A안 1단계 확정. core/authoring-index.js 신설(콘텐츠 상태 분석·커리큘럼 힌트·앵커·출제 패키지 조립·기존 대조). 규칙 권위 이원(자동검증=validate.js / 정성규칙=authoring-index.js:AUTHORING_RULES). (3) 앱 입력 폐지(5843179) - 사용자가 앱에서 JSON을 직접 붙여넣어 저장하는 흐름이 혼란스럽다고 판단, 출제 화면을 '현재 상태 요약 + 출제 패키지 복사'만 남기고 축소, customPassages 인프라 제거. 새 문제는 챗봇 결과 JSON을 자비스에게 주면 passages.json에 커밋하는 방식으로 일원화. 검증 browser-shot 전 경로 콘솔 0, node 테스트 전량 통과(authoring 유닛 16건 신설), standalone 231KB. **다음 행동** = (1) 배포(/web-deploy) 미실행 - deploy.json이 flightshooting 가리켜 회피, 사용자 "배포해" 대기(배포 시 SW 캐시 bump 필요) (2) 새 문제 만들기 - 출제 패키지 복사→챗봇→결과 JSON을 자비스에게, 또는 자비스에게 직접 지시 (3) PHASE B 2단계 후보 - LLM 검수/수정 패키지·severity·목표구조 underused·level 밴드 확장 (4) flightshooting 미커밋분 타 세션 유지. 상세: apps/english-reading/PROGRESS.md 2.41~2.43 + docs/2026-07-16-authoring-package-plan.md.

## 이전 작업 (2026-07-16, english-reading 채점 마크 정비 + 완독 표시 3종 + 숙어 등록)

사용자가 채점 표시·완독·어휘 3건을 연속 지시. (1) 채점 마크 - 다른 분할(그었지만 추천도 허용도 아닌 위치)에 붉은 작은 x를 새로 넣고, 놓침 화살표(▾)를 붉게, 추천 원(●)·허용 원(○)·비추천 삼각형(△)·다른분할 x(✕)·놓침 화살표(▾)의 시각 크기를 통일(browser-shot 확대로 눈맞춤). CLAUDE.md 5.1의 "빨간 X 폐기"를 "다른분할·놓침에 붉은 마크 사용"으로 갱신. (2) 완독 표시 3종 - 완독 시 끊기 정확도·단어 수집 여부를 doneMeta{chunkOk,hadWords}에 기록해, 완벽(끊기 다 맞고 모르는 단어 없음)은 카드 딤드, 끊기 틀림은 "끊기·완독", 단어 담음은 "단어·완독"으로 목록에서 구분. (3) 숙어 등록 - words에 "takes a bus"처럼 여러 낱말 표현 허용(core/tokenize.js matchWordTargets가 연속 토큰 매칭), 표현 속 아무 낱말이나 누르면 그 표현 전체가 묶여 오렌지로 수집·공개, 낱말 몸통만 반응해 끊기 틈은 침범 안 함, 본문 표시는 지금대로 깨끗하게 유지(사용자 "지금대로 두고 숙어만"). 예시 takes a bus·where to get off. 검증 browser-shot(마크 확대·완독 태그와 딤드·숙어 묶음 수집) 콘솔 0, 유닛 통과, standalone 295KB. 커밋 a223ec8·547597f. 상세: apps/english-reading/PROGRESS.md 2.40.

## 이전 작업 (2026-07-16, english-reading 읽기 화면 버그 4건 + 완료 흐름·상단바 UX 전면 개편)

사용자 "한 문제 풀면 다음 못 넘어감, 전체 버그 확인"으로 시작. 핵심 버그 - 지문 읽기 화면에서 뒤로가기(←) 누르면 목록이 빈 화면 + 페이지 에러였다. 원인은 setTop이 `el.back.onclick = onBack`으로 renderList를 직접 연결해 뒤로가기 클릭의 MouseEvent가 renderList(c)의 c로 새어 course를 덮어쓴 것. `() => onBack()`으로 차단. 병렬 에이전트로 부수 3건 수정 - chunks OFF+words ON 단어 소실(reviewBtn "단어 뜻 보기"로도 생성) / 죽은 이어읽기(bootScreen 신설) / 하이픈·공백 토큰 수 어긋나도 통과하던 validate(토큰 clean 대조 추가). 이어 UI 연속 개편 - 직독직해+자연스러운 해석을 한 카드에 구분선으로 통합, 놓침 화살표(▾) 크게+붉은색. 완료 흐름 재설계(사용자 "나도 모르게 완료 누름"→"해석 안 봐도 되나" 상의→승인): 하단 버튼을 "전체 해석"(안 본 문장 펼침)↔"완료"(누르면 다음 지문/한 번 더/목록 선택 팝업)로, 팝업은 X 닫기+책 픽토그램+제목만+SVG 버튼 3개. 상단바 끊기/단어 토글 제거하고 홈 "환경설정"(구 노출 설정)에 "터치 대상"으로 이동. 커밋 4f4b38e(버그+카드 통합+1차 재설계). 검증 browser-shot 전 경로 콘솔 0, 유닛 통과, standalone 292KB. 상세: apps/english-reading/PROGRESS.md 2.38+2.39.

> 2026-07-16 이전 작업(english-reading 100문장 검수 보고서)부터는 3건 cap 초과로 archive/NEXT-SESSION-archive.md로 이동.
