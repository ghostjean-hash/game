# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-07-16, english-reading 읽기 화면 버그 4건 + 완료 흐름·상단바 UX 전면 개편)

사용자 "한 문제 풀면 다음 못 넘어감, 전체 버그 확인"으로 시작. 핵심 버그 - 지문 읽기 화면에서 뒤로가기(←) 누르면 목록이 빈 화면 + 페이지 에러였다. 원인은 setTop이 `el.back.onclick = onBack`으로 renderList를 직접 연결해 뒤로가기 클릭의 MouseEvent가 renderList(c)의 c로 새어 course를 덮어쓴 것. `() => onBack()`으로 차단. 병렬 에이전트로 부수 3건 수정 - chunks OFF+words ON 단어 소실(reviewBtn "단어 뜻 보기"로도 생성) / 죽은 이어읽기(bootScreen 신설) / 하이픈·공백 토큰 수 어긋나도 통과하던 validate(토큰 clean 대조 추가). 이어 UI 연속 개편 - 직독직해+자연스러운 해석을 한 카드에 구분선으로 통합, 놓침 화살표(▾) 크게+붉은색. 완료 흐름 재설계(사용자 "나도 모르게 완료 누름"→"해석 안 봐도 되나" 상의→승인): 하단 버튼을 "전체 해석"(안 본 문장 펼침)↔"완료"(누르면 다음 지문/한 번 더/목록 선택 팝업)로, 팝업은 X 닫기+책 픽토그램+제목만+SVG 버튼 3개. 상단바 끊기/단어 토글 제거하고 홈 "환경설정"(구 노출 설정)에 "터치 대상"으로 이동. 커밋 4f4b38e(버그+카드 통합+1차 재설계) 이후 UI 다듬기 별도 커밋 예정. 검증 browser-shot 전 경로 콘솔 0, 유닛 통과, standalone 292KB. **다음 행동** = (1) 배포(/web-deploy)는 deploy.json이 flightshooting 가리켜 회피, 사용자 지시 대기 (2) flightshooting 11개 파일 미커밋(타 세션분) 사용자 처리 대기 (3) 2.37 검수 잔여. 상세: apps/english-reading/PROGRESS.md 2.38+2.39.

## 이전 작업 (2026-07-16, english-reading 100문장 콘텐츠 검수 보고서)

사용자가 영어 독해 작성·검수 규칙(16장)을 제시하고 word-order-foundations 코스 20지문 100문장을 이 규칙으로 전수 검수하라고 지시(원본 미수정·보고서만·데이터 수정 금지). 지목한 json은 이미 passages.json에 병합된 상태라 현행 라이브를 검수. 방식 = 자동 검증(코드) + 내용 검수(에이전트 5개 병렬) + 반복 패턴 코드 전수 교차검증. 결과 - 자동 검증 통과(critical 0·major 0·단어수 warn 33), 내용 검수 critical 0·major 21·minor 9, 판정은 규칙 준수 5지문 / 수정 후 사용 15지문 / 사용 금지 0. **핵심 발견** = breakRules.allowed 항목이 코스 전체 21개인데 전부 대표 청킹 경계와 겹쳐 채점 시 발동 안 하는 죽은 데이터(살아있는 대안 분할 0개). 원인은 validate.js가 discouraged 대표경계 중복만 검사하고 allowed는 미검사 = 규약(CLAUDE.md 4.3)-구현 불일치. 학습자 실사용엔 무해. 배포 - deploy.json이 이전 flightshooting 설정이라 web-deploy 회피, 보고서만 직접 push(ab999da). **다음 행동** = 사용자 결정 대기 - (a) 데이터에 반영할지(major 21 죽은 allowed 삭제 + validate.js 검사 추가가 근본 처방, 위험 낮음) (b) minor 9 반영 여부 (c) 검수 규칙을 앱 AUTHORING_PROMPT/CLAUDE.md에 영구 반영할지. 상세: apps/english-reading/PROGRESS.md 2.37 + docs/2026-07-15-content-validation-report.md.

## 이전 작업 (2026-07-15, english-reading 두 번째 코스 100문장 + 코스 고르기 화면)

사용자가 앱 루트에 넣은 english_reading_100_sentences.json(1코스 Word Order Foundations, 20지문 100문장)을 앱에 통합했다. 검증 중 두 문제를 수정 전 보고 - (1) 앱이 코스 하나만 화면에 렌더(코스 선택 UI 없음)라 새 코스를 그냥 추가하면 안 보임 (2) 100문장 중 6문장의 끊기 경계가 끊는 기준 규칙 위반. 통합 방식은 사용자가 '코스 고르기 화면 추가'(두 코스 병존)를 선택. 처리 - 위반 6건 chunks 경계 수정(짧은 주어+조동사는 동사까지 묶고, 구동사·복합전치사 꼬리는 목적어와 병합) 후 strict 전수 통과, passages.json에 두 번째 코스로 병합(원본 json은 병합 후 제거, git 복구 가능). 앱은 단일 코스에서 다중 코스로 확장 - renderCourseList 신설(진입 → 코스 목록 → 코스 선택 → 지문 목록), rebuildCourse가 전 코스를 createCourse하고 customPassages는 첫 코스에만, 뒤로가기·단어장·출제·설정·클리어 경로 정합(전역 액션은 코스 목록으로 이동). insight 하한을 1→0으로 완화(쉬운 코스는 어려운 문장이 없어 insight 0이 정당, 상한 3 유지). 검증 - node 테스트 전량 통과, browser-shot 2회(코스 목록 2코스 / 새 코스 진입 5등급 채점·해석 분리·문법 접힘) 콘솔 0, standalone 재빌드(285KB)·SW v186. 커밋 7207b97. **다음 행동** = 배포(/web-deploy) 사용자 지시 대기(로컬 커밋까지). 후보(사양 비스코프) - 오디오·TTS·구간 재생, listeningSenseGroups(듣기), 말하기 변형. 상세: apps/english-reading/PROGRESS.md 2.36.

> 2026-07-15 이전 작업(english-reading 1차 개편)부터는 3건 cap 초과로 archive/NEXT-SESSION-archive.md로 이동.
