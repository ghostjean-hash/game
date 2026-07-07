# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-07-07, english-reading 앱 전용 lite 골격 신설)

허브 PROGRESS 21장 sealing. 사용자가 apps/english-reading 폴더에서 `/jarvis-init`을 인자 없이 호출했다 - 원래 독립 도메인 등록 절차지만 이 위치는 이미 game-hub 도메인 안의 하위 앱이라 그대로 태울 수 없는 상황(19.7(c) 미해결 항목이기도 함). 세 갈래(하위 앱 경량 골격 / 무작업 / 독립 도메인 등록)를 제시하고, 독립 도메인(별도 repo·FM 4종)은 모노레포 허브에 과하다는 근거로 비추천했다. 사용자 "전용 만들어"로 허브 하위 앱 lite 골격(CLAUDE.md + PROGRESS.md)을 채택 - 허브 구조 표준 설계안(#275 §4 children_profile:lite)과 정합. CLAUDE.md는 기존 게임 하위 CLAUDE(sudoku) 형태로 앱 정의·파일구조·핵심결정 6항·데이터규약(sentences.json)·주의·비스코프를 담되, 실제 코드(main/session/tokenize)를 읽고 무빌드 바닐라·라이트 테마 단독·"문장 수만큼" 세션·nth 문법덫·core 순수격리를 규칙화했다. PROGRESS.md는 19장 이력을 앱 관점으로 이관. 검증 - 순수 문서라 동작 검증 불가, 실제 코드·데이터와 상호 참조 일치만 확인. **다음 행동** = (a) 문장 콘텐츠 보강(사용자) (b) 루트 CLAUDE.md §1 등록표 app 카테고리·english-reading 반영 (c) service-worker.js PRECACHE apps 등재 + 캐시 bump (d) core/session·tokenize 유닛 테스트 (e) 실기기 터치 감도. 상세: apps/english-reading/PROGRESS.md.

## 이전 작업 (2026-07-07, Sky Raider 밸런스 조정 5종)

허브 PROGRESS 20장 sealing. 3계통 파츠(18장) 직후 사용자가 밸런스 5종을 지시했다 - (1) P(전방 화력) 아이템 절반 확률 (2) 적 더 많이 (3) 일반 구간 더 길게 (4) 보스 강화 (5) 구역 전환 시 다음 구역 표시 + 그 기간 적 미출현. 구현: drop.weights P 0.34→0.17(줄인 몫을 S 0.38·E 0.23에 배분해 옵션기·존이 상대적으로 더 자주), buildWaves 웨이브 7→최대 10개·마리 수 상향(1구역 8웨이브 30마리, 후반 10웨이브 79마리)로 구간 연장, 중보스 baseHp 55→90·구역당 22→32·최종보스 420→980, CFG.stageIntro 2.2초 신설(startStage introTimer + 배너 dur 동기화, stepWorld가 intro 중 적 스폰·웨이브 진행 정지). SW 캐시 v121→v122(직전 파츠 봉합의 bump 누락분까지 포함해 배포 무효화). 검증 - core 26/26 PASS + browser-shot로 '구역 1' 배너 표시 중 적 0 확인, pageerror 0. 커밋 e029d79 push 완료. **다음 행동** = 5종 전부 실플레이 체감 조정 대상(P 희소성·적 밀도·구간 길이·보스 hp·인트로 길이). apps/english-reading 미커밋(타 세션)은 이 세션 무관. 상세: games/flightshooting/PROGRESS.md.

## 이전 작업 (2026-07-07, app 묶음 신설 + 영어 청킹 훈련 앱)

허브 PROGRESS 19장 sealing. 사용자가 게임 외 "app 묶음" 신설을 지시해 홈(index.html)을 게임/앱 두 구역으로 개편하고 apps/_registry.json을 신설했다(loadSection 공통화, 게임과 동일 등록 방식). 첫 앱은 처음 수능형 객관식으로 4축 기획했다가 사용자가 폐기하고 "인터랙티브 청킹(직독직해) 훈련 앱"으로 전환했다 - 타이핑 0의 100% 클릭, 문장 속 문법 덫(it·to·into) 클릭해 찾기 + 청킹 직독직해 딸깍 확인 + 한 패턴 문장 소진 시 다음 패턴 자동 전환. 스택은 React+Tailwind 대신 허브 무빌드 정적에 맞는 바닐라를 트레이드오프 제시 후 추천·채택했고(사용자 "서버리스 단독" 방향), 세션은 40 고정이 아닌 "있는 문장 수만큼"으로 정했다. apps/english-reading에 sentences.json(패턴 3종×14=42문장, 직독직해 청킹 + nth 위치 기반 문법 타겟 + 힌트) + core/tokenize·session(DOM 미의존 순수) + main(클릭 판정·청킹 슬라이드·패턴 모달, shared/ui.js showModal 재활용)을 구현했다. 문장은 자비스가 제작하고 사용자가 추후 보강한다. 검증 - browser-shot로 홈 두 구역·앱 화면 확인, playwright 클릭 재생으로 타겟 하이라이트·툴팁·오답 흔들림·청킹 슬라이드·14문장 소진→패턴 전환 모달까지 전수 확인. 이후 사용자 지시로 이 앱만 라이트 테마로 전환(홈·게임은 다크 유지, body 범위에서 다크 토큰을 라이트 값으로 재정의)하고 playwright로 라이트 배경 적용·3패턴 완전 순환을 재검증했다. **다음 행동** = (a) 문장 콘텐츠 보강(사용자) (b) 루트 CLAUDE.md §1 등록표에 app 카테고리 반영 (c) apps/english-reading 전용 PROGRESS/CLAUDE 골격 (d) service-worker.js PRECACHE에 apps 등록 (e) core/session·tokenize 유닛 테스트 (f) 실기기 터치 감도. 상세: PROGRESS.md 19장.


