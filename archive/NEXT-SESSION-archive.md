# game-hub NEXT-SESSION 아카이브

> NEXT-SESSION.md 체인 3건 cap(§6.6) 초과분을 무수정 이동 보관(§3.4.4). 위가 최신.

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
