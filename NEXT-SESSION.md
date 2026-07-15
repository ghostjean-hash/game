# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-07-15, english-reading 두 번째 코스 100문장 + 코스 고르기 화면)

사용자가 앱 루트에 넣은 english_reading_100_sentences.json(1코스 Word Order Foundations, 20지문 100문장)을 앱에 통합했다. 검증 중 두 문제를 수정 전 보고 - (1) 앱이 코스 하나만 화면에 렌더(코스 선택 UI 없음)라 새 코스를 그냥 추가하면 안 보임 (2) 100문장 중 6문장의 끊기 경계가 끊는 기준 규칙 위반. 통합 방식은 사용자가 '코스 고르기 화면 추가'(두 코스 병존)를 선택. 처리 - 위반 6건 chunks 경계 수정(짧은 주어+조동사는 동사까지 묶고, 구동사·복합전치사 꼬리는 목적어와 병합) 후 strict 전수 통과, passages.json에 두 번째 코스로 병합(원본 json은 병합 후 제거, git 복구 가능). 앱은 단일 코스에서 다중 코스로 확장 - renderCourseList 신설(진입 → 코스 목록 → 코스 선택 → 지문 목록), rebuildCourse가 전 코스를 createCourse하고 customPassages는 첫 코스에만, 뒤로가기·단어장·출제·설정·클리어 경로 정합(전역 액션은 코스 목록으로 이동). insight 하한을 1→0으로 완화(쉬운 코스는 어려운 문장이 없어 insight 0이 정당, 상한 3 유지). 검증 - node 테스트 전량 통과, browser-shot 2회(코스 목록 2코스 / 새 코스 진입 5등급 채점·해석 분리·문법 접힘) 콘솔 0, standalone 재빌드(285KB)·SW v186. 커밋 7207b97. **다음 행동** = 배포(/web-deploy) 사용자 지시 대기(로컬 커밋까지). 후보(사양 비스코프) - 오디오·TTS·구간 재생, listeningSenseGroups(듣기), 말하기 변형. 상세: apps/english-reading/PROGRESS.md 2.36.

## 이전 작업 (2026-07-15, english-reading 1차 개편 - 5등급 채점 + 해석 분리 + 문법 계층화)

확정 사양대로 english-reading 1차 개편을 착수·구현·배포까지 완주했다. (1) O/X 이진 채점을 추천/허용/비추천/다른분할(neutral)/놓침(missed) 5등급으로 전환(core/chunking.js gradeChunks 신설, 기존 gradeSlashes 보존 + 데이터 breakRules{allowed[],discouraged[]}). 빨간 X 폐기·색+모양 병행(추천 청록●/허용 회색○/비추천 주황△/놓침 청록▾). (2) 직독직해와 자연스러운 완역(naturalTranslation)을 별도 카드로 분리. (3) 핵심 어순(wordOrderPoint) 기본 노출 + 상세 문법 "문법 자세히 보기" 접기. 신 필드 3종은 전부 옵셔널이고 core/normalize.js normalizeSentence가 fallback을 채워 기존 customPassages 하위호환(localStorage 강제 초기화 없음). validate.js는 built-in strict/custom 관대 이중 모드 + breakRules 범위·중복·추천경계 충돌 검증. 30문장은 서브에이전트 6개 병렬 생성 후 boundary를 전량 재검산해 마이그레이션(28 정확·1건 reason만 교정). 전 문장 한 화면·문장별 해석 버튼 구조 유지(사양 제약). 문법 접힘 버그(`.grammar-list{display:flex}`가 [hidden] 덮어씀) 수정. 검증 - node 테스트 전량 통과, browser-shot 5등급 판정·문법 접힘(visible=false)→펼침(true) 콘솔 0, standalone 재빌드(150KB)·SW v185. 커밋 b24794f, /web-deploy 배포 완료(smoke 2 URL 200 + 콘솔 0 + `.passage-card` 가시). **다음 행동** = 특정 대기 없음. 후보(사양 비스코프) - 오디오·TTS·전체 음성 구간 재생, listeningSenseGroups(듣기 리듬), 말하기용 문장 변형, 신규 100문장 콘텐츠. 상세: apps/english-reading/PROGRESS.md 2.35 + docs/2026-07-15-phase1-refactor-plan.md.

## 이전 작업 (2026-07-14, flightshooting 어린이 모드 친구 비행기)

flightshooting 어린이 모드 전용 친구 비행기 신설 + 실플레이 다듬기(하네스 루프 플랜→기획→구현→테스트 후 피드백 5건 반영). 친구는 왼쪽에서 말풍선("안녕!"→"난 친구야"→"같이 게임하자!")으로 등장해 **플레이어와 완전 독립으로**(자기 세로 밴드 = 플레이어보다 위 줄에서 가까운 적을 스스로 추적) 함께 싸우고, 플레이 중 가끔 잡담("잘한다!" 등)한다. 메인 총알만 보유하고 강화 10단계(아이템 공유로 성장)로 발 수가 늘되 좁은 부채(만렙 ≈25°)로 앞으로 모아 쏜다. 총알은 어둡고 차분한 웜톤 작은 별(플레이어 냉색 빔·적 빨간 탄과 구분). 아이템·점수 공유, HP 하트 5개는 플레이어와 별개 풀(피해 각자·회복 H 공유·기절 후 H로 부활). 초기 구현은 플레이어 옆 추종이었으나 사용자 지시로 완전 독립·다크 총알·좁은 부채·최소 크기·잡담으로 다듬음. core/friend.js(순수)·world·view·numbers/colors, kind 'fmain', 일반 모드 무영향. **다음 행동** = 배포(SW 캐시 갱신 + GitHub Pages, web-deploy) 사용자 지시 대기 + 친구 밸런스·총알 명도 실플레이 조정 여지. 상세: games/flightshooting/PROGRESS.md 2026-07-14 친구 2개 절 + docs/09_friend.md.

> 2026-07-09 이전 작업(english-reading 끊는 기준 카드·v0.7·v0.6)은 3건 cap 초과로 archive/NEXT-SESSION-archive.md로 이동.
