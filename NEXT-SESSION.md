# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-07-07, english-reading 앱 골격 신설 + "독해 사다리" 재기획)

허브 PROGRESS 21·22장 sealing. 두 갈래 작업이다. (1) 골격 신설(21장): `/jarvis-init`을 허브 하위 앱 폴더에서 인자 없이 호출한 상황을 진단해, 독립 도메인 등록 대신 허브 하위 앱 lite 골격(CLAUDE.md + PROGRESS.md, #275 §4 children_profile:lite)을 채택·생성했다. (2) 재기획(22장): 사용자가 앱 타깃을 "공부를 정말 못하는 사람(중학 수준)"으로, 목표를 "독해 수준을 제대로 끌어올리기"로 명시하면서 기존 청킹 훈련 앱을 "영어 독해 사다리"로 재정의했다. AskUserQuestion으로 영어 독해 + 세 곳(단어·긴 문장·글 요지) 다 막힘을 확정 → 독해력 3층(어휘·끊어읽기·의미통합)을 순서로 밟는 설계. 핵심 학습법은 사용자 요청("단어를 뒤로, 문맥 유추 후 확인")을 GitHub·어휘습득 연구(문맥 유추는 중학생 대상 효과, 단 확인·인출 결합 필요 - LingQ/Readlang/WordPecker 참고)로 검증해 "유추 → 확인 → 복습" 3단계 루프로 확정. 기획서는 §1.3(사람이 보는 기획서=HTML)을 세 번 어기며(MD 작성 → PLAN 금지어·docs/ 오위치 → 최종) 매번 사용자 지적으로 시정, 최종 `apps/english-reading/spec/index.html`로 planning-deliverable 표준 전면 준수(음슴체·괄호제거·목차 사이드바·디자인 토큰·개발정보 부록 분리). 재발 방지 hook 후보를 buffer 기록. browser-shot 렌더 2회 검증(console 0). **다음 행동** = (a) 약점 진단 리포트 기획서 추가 여부 결정(문법 이름표 + 자주 틀리는 단어 + 추이 리포트 제안함, 문법 6종 초안) (b) 기획서 본문 확정 + MVP 착수 전 개발 세부 결정 (c) 앱 코드를 기획(3단계 루프)에 맞춰 재구성 (d) **21장 amend(e737537) force push 미완 - 원격 분기(ahead1/behind1) 해소 필요**. 상세: PROGRESS 21·22장 + apps/english-reading/PROGRESS.md.

## 이전 작업 (2026-07-07, Sky Raider 밸런스 조정 5종)

허브 PROGRESS 20장 sealing. 3계통 파츠(18장) 직후 사용자가 밸런스 5종을 지시했다 - (1) P(전방 화력) 아이템 절반 확률 (2) 적 더 많이 (3) 일반 구간 더 길게 (4) 보스 강화 (5) 구역 전환 시 다음 구역 표시 + 그 기간 적 미출현. 구현: drop.weights P 0.34→0.17(줄인 몫을 S 0.38·E 0.23에 배분해 옵션기·존이 상대적으로 더 자주), buildWaves 웨이브 7→최대 10개·마리 수 상향(1구역 8웨이브 30마리, 후반 10웨이브 79마리)로 구간 연장, 중보스 baseHp 55→90·구역당 22→32·최종보스 420→980, CFG.stageIntro 2.2초 신설(startStage introTimer + 배너 dur 동기화, stepWorld가 intro 중 적 스폰·웨이브 진행 정지). SW 캐시 v121→v122(직전 파츠 봉합의 bump 누락분까지 포함해 배포 무효화). 검증 - core 26/26 PASS + browser-shot로 '구역 1' 배너 표시 중 적 0 확인, pageerror 0. 커밋 e029d79 push 완료. **다음 행동** = 5종 전부 실플레이 체감 조정 대상(P 희소성·적 밀도·구간 길이·보스 hp·인트로 길이). apps/english-reading 미커밋(타 세션)은 이 세션 무관. 상세: games/flightshooting/PROGRESS.md.

## 이전 작업 (2026-07-07, app 묶음 신설 + 영어 청킹 훈련 앱)

허브 PROGRESS 19장 sealing. 사용자가 게임 외 "app 묶음" 신설을 지시해 홈(index.html)을 게임/앱 두 구역으로 개편하고 apps/_registry.json을 신설했다(loadSection 공통화, 게임과 동일 등록 방식). 첫 앱은 처음 수능형 객관식으로 4축 기획했다가 사용자가 폐기하고 "인터랙티브 청킹(직독직해) 훈련 앱"으로 전환했다 - 타이핑 0의 100% 클릭, 문장 속 문법 덫(it·to·into) 클릭해 찾기 + 청킹 직독직해 딸깍 확인 + 한 패턴 문장 소진 시 다음 패턴 자동 전환. 스택은 React+Tailwind 대신 허브 무빌드 정적에 맞는 바닐라를 트레이드오프 제시 후 추천·채택했고(사용자 "서버리스 단독" 방향), 세션은 40 고정이 아닌 "있는 문장 수만큼"으로 정했다. apps/english-reading에 sentences.json(패턴 3종×14=42문장, 직독직해 청킹 + nth 위치 기반 문법 타겟 + 힌트) + core/tokenize·session(DOM 미의존 순수) + main(클릭 판정·청킹 슬라이드·패턴 모달, shared/ui.js showModal 재활용)을 구현했다. 문장은 자비스가 제작하고 사용자가 추후 보강한다. 검증 - browser-shot로 홈 두 구역·앱 화면 확인, playwright 클릭 재생으로 타겟 하이라이트·툴팁·오답 흔들림·청킹 슬라이드·14문장 소진→패턴 전환 모달까지 전수 확인. 이후 사용자 지시로 이 앱만 라이트 테마로 전환(홈·게임은 다크 유지, body 범위에서 다크 토큰을 라이트 값으로 재정의)하고 playwright로 라이트 배경 적용·3패턴 완전 순환을 재검증했다. **다음 행동** = (a) 문장 콘텐츠 보강(사용자) (b) 루트 CLAUDE.md §1 등록표에 app 카테고리 반영 (c) apps/english-reading 전용 PROGRESS/CLAUDE 골격 (d) service-worker.js PRECACHE에 apps 등록 (e) core/session·tokenize 유닛 테스트 (f) 실기기 터치 감도. 상세: PROGRESS.md 19장.


