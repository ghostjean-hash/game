# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-07-07, Sky Raider 밸런스 조정 5종)

허브 PROGRESS 20장 sealing. 3계통 파츠(18장) 직후 사용자가 밸런스 5종을 지시했다 - (1) P(전방 화력) 아이템 절반 확률 (2) 적 더 많이 (3) 일반 구간 더 길게 (4) 보스 강화 (5) 구역 전환 시 다음 구역 표시 + 그 기간 적 미출현. 구현: drop.weights P 0.34→0.17(줄인 몫을 S 0.38·E 0.23에 배분해 옵션기·존이 상대적으로 더 자주), buildWaves 웨이브 7→최대 10개·마리 수 상향(1구역 8웨이브 30마리, 후반 10웨이브 79마리)로 구간 연장, 중보스 baseHp 55→90·구역당 22→32·최종보스 420→980, CFG.stageIntro 2.2초 신설(startStage introTimer + 배너 dur 동기화, stepWorld가 intro 중 적 스폰·웨이브 진행 정지). SW 캐시 v121→v122(직전 파츠 봉합의 bump 누락분까지 포함해 배포 무효화). 검증 - core 26/26 PASS + browser-shot로 '구역 1' 배너 표시 중 적 0 확인, pageerror 0. 커밋 e029d79 push 완료. **다음 행동** = 5종 전부 실플레이 체감 조정 대상(P 희소성·적 밀도·구간 길이·보스 hp·인트로 길이). apps/english-reading 미커밋(타 세션)은 이 세션 무관. 상세: games/flightshooting/PROGRESS.md.

## 이전 작업 (2026-07-07, app 묶음 신설 + 영어 청킹 훈련 앱)

허브 PROGRESS 19장 sealing. 사용자가 게임 외 "app 묶음" 신설을 지시해 홈(index.html)을 게임/앱 두 구역으로 개편하고 apps/_registry.json을 신설했다(loadSection 공통화, 게임과 동일 등록 방식). 첫 앱은 처음 수능형 객관식으로 4축 기획했다가 사용자가 폐기하고 "인터랙티브 청킹(직독직해) 훈련 앱"으로 전환했다 - 타이핑 0의 100% 클릭, 문장 속 문법 덫(it·to·into) 클릭해 찾기 + 청킹 직독직해 딸깍 확인 + 한 패턴 문장 소진 시 다음 패턴 자동 전환. 스택은 React+Tailwind 대신 허브 무빌드 정적에 맞는 바닐라를 트레이드오프 제시 후 추천·채택했고(사용자 "서버리스 단독" 방향), 세션은 40 고정이 아닌 "있는 문장 수만큼"으로 정했다. apps/english-reading에 sentences.json(패턴 3종×14=42문장, 직독직해 청킹 + nth 위치 기반 문법 타겟 + 힌트) + core/tokenize·session(DOM 미의존 순수) + main(클릭 판정·청킹 슬라이드·패턴 모달, shared/ui.js showModal 재활용)을 구현했다. 문장은 자비스가 제작하고 사용자가 추후 보강한다. 검증 - browser-shot로 홈 두 구역·앱 화면 확인, playwright 클릭 재생으로 타겟 하이라이트·툴팁·오답 흔들림·청킹 슬라이드·14문장 소진→패턴 전환 모달까지 전수 확인. 이후 사용자 지시로 이 앱만 라이트 테마로 전환(홈·게임은 다크 유지, body 범위에서 다크 토큰을 라이트 값으로 재정의)하고 playwright로 라이트 배경 적용·3패턴 완전 순환을 재검증했다. **다음 행동** = (a) 문장 콘텐츠 보강(사용자) (b) 루트 CLAUDE.md §1 등록표에 app 카테고리 반영 (c) apps/english-reading 전용 PROGRESS/CLAUDE 골격 (d) service-worker.js PRECACHE에 apps 등록 (e) core/session·tokenize 유닛 테스트 (f) 실기기 터치 감도. 상세: PROGRESS.md 19장.

## 이전 작업 (2026-07-07, Sky Raider 3계통 파워 파츠 시스템)

허브 PROGRESS 18장 sealing. 세션 시작 시 다른 머신에서 커밋된 flightshooting을 git pull로 이 로컬에 반영(nonogram 배지 대비 개선 미커밋분은 stash 경유 보존 후 별도 커밋 a61f92f). 이어 사용자가 단일 화력(1~20)을 세 갈래 파워 파츠로 분리 지시 - (1) 전방 화력: 앞쪽 부채탄 최대 8발 (2) 옵션기: 좌우에 붙는 부속 비행기 최대 8대(좌4·우4), 안쪽 2슬롯 레이저·바깥 2슬롯 유도미사일 (3) 에너지존: 플레이어 주변 오라, 레벨↑ 반경↑, 0.5초마다 존 내 적 피해. 성장 방식·피격 페널티는 AskUserQuestion으로 확정 - 파츠별 전용 아이템(P/S/E) + 피격 시 마지막 얻은 파츠 1개 손실(역순 스택). core/parts.js 신설(옵션 배치·발사·미사일 유도·존 tick·파츠 획득/손실, 순수 유지), fire.js fireSpec→frontSpec(정면 1~8발로 축소, 측면·후방은 옵션기로 이관), world/spawn/view/main/index/sound/numbers/colors 연결, HUD 단일 화력→구역/앞/옵션/존 4칸(색 구분). 겸사 시작화면 "3개 구역"→"10개 구역" 오정보 정정. 이어 사용자 후속 지시로 **적 체력 구역 스케일** 추가 - spawnEnemy가 `ceil(base×(1+(stage-1)×enemyHpScale))`(0.28) 적용, 10구역 기준 drone 1→4·weaver 2→8·gunner 3→11로 3계통 화력 성장과 균형. 검증 - core 24/24 PASS + browser-shot로 기본 로드 pageerror 0·HUD 3계통 표시 + 임시 만렙 주입 캡처로 옵션기 8대(좌우 대칭)·레이저·유도미사일·존 오라 시각 확인 후 원복. docs/05_power-parts.md 설계 SSOT + 01/02/03/04·CLAUDE·README 정합. **다음 행동** = (a) 파츠 밸런스 실플레이 조정(레이저/미사일 연사·존 반경/tick·드롭 가중치·획득 속도) (b) 적 체력 스케일 후반 체감 조정 (c) 옵션기 다수 시 발열 체감 (d) 10구역 완주·구역 전환 실플레이. 상세: games/flightshooting/PROGRESS.md.

