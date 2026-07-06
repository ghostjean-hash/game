# game_ghost 진행 상황

**이 파일 = 게임 허브 전체 메타 로그 + 자비스 도메인 self-critique 겸용.** 특정 게임 하나의 진행은 각 게임 폴더의 `games/<id>/PROGRESS.md`에 따로 있다 (역할 구분). 헷갈리면 루트 `CLAUDE.md` 0장 문서 지도 참조.

- 시작: 2026-04-30
- repo: https://github.com/ghostjean-hash/game
- 배포: https://ghostjean-hash.github.io/game/

# 1. 스택 / 구조

1.1. Vanilla HTML/Canvas/JS, 빌드 도구 없음.
1.2. 단일 repo, 게임당 폴더, PWA, GitHub Pages 자동 배포.
1.3. 폴더: `shared/` 공통 모듈 6종, `games/<id>/` 게임, `icons/` PWA 아이콘, `scripts/` 빌드 헬퍼.

# 2. 게임 목록

| 게임 | 상태 | 진행 로그 |
|---|---|---|
| tetris | playable, 모바일 검증 통과 | `games/tetris/PROGRESS.md` |
| sudoku | wip, M1+ 완료 / M2 대기 | `games/sudoku/PROGRESS.md` |
| rushhour | playable, 산리오풍 캐릭터 + 골드/별/제한시간 + 상점(토끼색·보드테마·머리장식) + 힌트·진행맵·효과음·연속콤보 + 186퍼즐 + 모바일 대응 | `games/rushhour/PROGRESS.md` |

# 3. 공통 결정

3.1. **Public repo 강제**: GitHub Pages 무료는 Public만 호스팅.
3.2. **iOS 아이콘 PNG로**: SVG `apple-touch-icon`이 iOS에서 미표시 → `scripts/build_icons.py`로 PNG 생성.
3.3. **Pages 활성화는 사용자 수동**: gh CLI 미설치, PAT 노출 회피.
3.4. **작업 완료 시 커밋·푸시를 세트로 자동**(사용자 2026-06-29 지시): 매번 승인 질문 없이 자비스가 커밋 + 푸시까지 일괄 수행. 위험하거나 대규모인 변경은 사전 안내 후 진행.
3.5. **게임 자산(js/css/html) 변경 배포 시 `service-worker.js`의 `CACHE_VERSION` bump 필수**: SW가 stale-while-revalidate라 버전을 안 올리면 사용자 기기에 옛 파일이 남아 새 파일과 섞인다(2026-06-29 rushhour 동물 미표시 사고). 커밋·푸시 세트에 SW bump를 포함한다.

# 4. 공통 미해결 / 개선 여지

4.1. 사운드: rushhour는 Web Audio 합성 효과음 + 음소거 토글 보유(2026-06-29). tetris도 Web Audio 합성 효과음 + 음소거 토글 보유(2026-07-06, 14장). 나머지 게임(sudoku/lotto)·햅틱은 아직 없음.
4.2. iOS PWA 첫 진입 "홈 화면에 추가" 안내 오버레이 없음.
4.3. 공통 게임 종료/일시정지 패턴 추출(보일러플레이트 감소).

# 5. 환경 메모

5.1. gh CLI 인증 완료(`ghostjean-hash` keyring, https).
5.2. git config: 로컬 저장소 한정 `user.name=ghostjean-hash`, `user.email=ghostjean@naver.com`.
5.3. Pillow 10.1.0(아이콘 생성), Python 3.12, Node 25.6.1.
5.4. LF/CRLF 경고: Windows 정상. `.gitattributes` 미정의.

# 6. 자비스 도메인 도입 (2026-06-06)

6.1. game 허브를 자비스 정식 도메인 `game-hub`로 등록 (사용자 명시 "게임 허브 도메인 열어서 진행"). 범위 결정 = lotto 단일 대신 허브 전체. 근거: 게임별 PROGRESS 이름 충돌 회피 + 미래 다게임 통합 + cycle은 작업 단위.
6.2. 배경: lotto 작업이 자비스 정식 골격 없이 진행되어 운영 의례(checkpoint/cycle/ledger 참조)가 게임 PROGRESS.md에 얹혀 운영됨. 전수검사로 미처리 글로벌 ledger 후보 식별 (lotto PROGRESS:46 메모만 남고 인계 안 됨).
6.3. 산출 골격: `.claude/CLAUDE.md`(domain키) + `.claude/workflows/` + `ROADMAP.md` + `TASKS.md` + `NEXT-SESSION.md` 신설. `PROGRESS.md`/`README.md`는 기존 보존(self-critique 겸용). 운영 상태(ACTIVE/JOURNAL/ledger)는 글로벌 단일이라 미생성(§6.1.6).
6.4. 받아들인 항목: `.jarvis-handoff.jsonl` buffer 2건 (어휘 회귀 패턴 P1 + lotto UX 실수 4건 P2). public repo 노출 차단 위해 gitignore 격리.
6.5. 미처리(글로벌 영역, §4.2 도메인에서 불가): search_roots 등록 / domain-map 등록 / buffer 인계 / lotto 옛 경로(f:/game_ghost) 정정. TASKS T-002~005 + NEXT-SESSION 기재.
6.6. R5 어휘 점검: 이 세션 중 회귀 4건(stop hook 검출) → 시인 + buffer evidence 기록. 이후 산출물 회귀 회피.

# 7. 적용 전수 검사 + handoff 위치 정정 (2026-06-06 후속)

7.1. 도메인 적용 상태 전수 검사: 골격 파일 9종 존재/JSON 유효/gitignore 격리 정상 확인. 글로벌 연결 4건 전부 merged 확인 - domain-map `game-hub`(sequential/html-game) / search_roots 2곳(handoff_buffer + wip_monitor) / 글로벌 ledger 인계 #176(어휘 회귀)+#177(lotto UX) / lotto settings 옛 경로 `game_ghost` 잔재 0건.
7.2. 위치 불일치 1건 발견 + 정정: `research-handoff.json`이 자산 인덱스(.claude/CLAUDE.md §2)가 지정한 `.claude/workflows/` 대신 도메인 루트에 있었음 → `.claude/workflows/`로 이동. gitignore line 30(`**/*-handoff*.json`)이 위치 무관 격리하므로 노출 위험은 없었으나 자산 인덱스 단일 진실 일치 차원 정정.
7.3. hook 위치 모순 진단(글로벌 미해결): SessionStart hook은 "활성 handoff 없음"(.claude/workflows/ 탐색), UserPromptSubmit hook은 "active handoff: research"(루트 탐색)로 두 hook이 서로 다른 위치를 봄. 어느 위치가 표준인지는 글로벌 hook 코드 확인 영역(도메인 cwd 수정 불가) → buffer 기록.
7.4. R5 어휘 회귀: 이 세션 답변 본문에서 "해소" 2건 검출(불일치 해소 / 모순 해소) → "처리"가 정답. 시인 + buffer evidence 기록.

# 8. 상태판 봉합 + lotto 현황 파악 (2026-06-07, /jarvis-checkpoint sealing)

8.1. /jarvis-next 진단 cycle. git clean + 활성 cycle 없음 확인 후 후보 표 + 추천 1건 제시. 도메인 cwd라 ledger 글로벌 후보는 작업 source에서 제외(#187 원칙: 도메인 작업은 ROADMAP/TASKS만, ledger는 글로벌 세션 영역).

8.2. 추천 A 채택(사용자 명시 "권장 진행"): M-1/M-2 봉합 + 상태판 정정. 첫 cycle(jarvis-init-game-hub-2026-06-06) 골격 도입과 글로벌 인계가 실제로는 완료(buffer GT-1~4 merged, sealing df913a6/469311a)였으나 TASKS/ROADMAP 상태판만 in-progress/pending stale로 남아 /jarvis-next가 90%로 오안내(#191 패턴 직접 사례). TASKS T-001~005 completed 이동 + ROADMAP M-1/M-2 완료 마일스톤 이동. commit 3aef26d(사용자 명시 "commit 후").

8.3. lotto 현황 파악: 기능적 완성 단계 확인. M0~M6 + 폴리싱 + 사주/휠링/11전략/결과 페이지/카운트다운/백캐스트 전부 완료(PROGRESS 1.1). 마지막 갱신(2026-05-22) 이후 잔여 4건(PROGRESS 1.8.3)이 전부 사용자 화면 캡쳐 검증 대기 또는 글로벌 인계 완료 항목. 자비스 단독 진입 작업 없음 - 사용자 화면 피드백 또는 새 방향 제시가 다음 sprint 진입 trigger. 임의 sprint 시작 회피, 사용자 결정 대기.

8.4. R5 어휘 회귀 자기 점검: 이 세션 답변 본문에서 "정합" 1건 검출(lotto 현황 답변 "결과 페이지 정합", PROGRESS 1.1 원문 인용이나 인용 변환 의무상 "일치"로 변환 필요). vocab-trend hook 누적 1위 어휘 재현. 시인 + buffer evidence 기록. 사용자 명시 결정 2건("권장 진행" / "commit 후") 전수 매핑 누락 0 확인(#194).

# 9. CLAUDE.md / PROGRESS.md 이름 겹침 정리 (2026-06-07, /jarvis-checkpoint sealing)

9.1. 사용자 본질 지적("규칙이 지멋대로 / 겹쳐서 헷갈려"). 한 저장소에 `CLAUDE.md`가 글로벌(home의 .claude) + 루트(게임개발) + .claude(도메인표식) + games/<id>(게임별) 4층 산재. Claude Code가 위치별 자동 로드하는 도구 표준이라 이름 겹침 자체는 못 바꿈. 1차 처리: 루트 CLAUDE.md 0장에 "CLAUDE.md 파일 지도" 표 추가(commit 86bad7c). 근본 해결(도메인 표식 파일명 분리)은 글로벌 사양 영역이라 buffer 후보 기록.

9.2. "또 같은 문제 있을 수 있어 파일 전체 검수"(사용자 명시). git ls-files 파일명 분포 검사로 동일 유형 1건 발견 - `PROGRESS.md` 4층(루트 도메인 메타+self-critique 겸용 / games/<id> 게임별)이 CLAUDE.md와 판박이. index.html/game.js/main.js 등 게임별 중복은 위치로 명확해 정상, README/settings 비대칭은 혼란 낮아 방치 판정.

9.3. "권장 진행"(사용자 명시) → 0장을 "주요 문서 지도"로 확장(0.1 CLAUDE.md / 0.2 PROGRESS.md / 0.3 골격 문서) + 루트 PROGRESS.md 상단에 "허브 메타 + self-critique 겸용" 역할 1줄 명시(commit fce6bc1). 이름 겹침 혼란을 단일 참조점(0장)으로 통합.

9.4. lotto 업그레이드 전수 검사(UX 약점 + 미사용 기능)는 다음 세션 위임 결정(사용자 명시 "lotto를 도메인으로 다시 세션 열게"). 자비스 판단: lotto는 docs(spec/data/architecture) 충실해 `/jarvis-init` 정식 도메인화 불필요(중복 부담 + game-hub 중첩), "lotto 작업 이어서 + 검수" 프롬프트로 바로 진입 권장. 진입 프롬프트 NEXT-SESSION 게임 컨텍스트에 기재.

# 10. lotto 다음 버전 "메인 깔끔화" 4갈래 전수 검사 + S0-S4 구현 (2026-06-07, /jarvis-checkpoint sealing)

10.1. lotto 4갈래 전수 검사(사용자 순차 명시 요청): (1) 기능/코드 - 작동 안 하는 옵션 applyFilters(설정 토글 O / 추첨 반영 X)·fiveSets(spec 폐기 선언 / 코드 잔존) + dead code 식별 (2) UX 디자이너 - 디자인 시스템 A-(토큰 체계 / 번호공 WCAG 대비 / safe-area 견고), 최대 약점 "확정" 멘탈 모델 불명 + 추천 탭 정보 과부하 (3) 프로그래머 - 절대규칙 100%(core 순수성 / 모듈 단방향) / XSS 안전 / 결정론 보장, 매직넘버 룰 위반 2건(TIMELINE_RECENT / SEVEN_DAYS_MS) + 통계 중복 계산 (4) PD - 최대 리스크 "정직함이 매력을 죽이는 긴장"(사행성 제거로 로또 본질 동기 제거) + 데일리 리텐션 공백. 결과 전부 `games/lotto/BACKLOG.md` 신설 기재(다음 버전 단일 진실 문서).

10.2. 사용자 의견 7건 + AskUserQuestion 결정 2건(메인엔 활성 전략 이름 표시 / 정체성 정보는 펼치면 노출)으로 다음 버전 "메인 깔끔화" 설계 확정. 사용자 전권 위임("중간 관여 안 함, 다 완료 후 보고").

10.3. S0-S4 전부 구현 완료(테스트 314/314 PASS 일관, 브라우저 실제 로드 JS 에러 0):
- S0 청소: applyFilters/fiveSets 옵션 제거(storage / state / settings UI / 핸들러 / loadOptions 폐기키 drop) + 연쇄 dead(recommendFiveSets + 테스트 7개 / draw-card.js stub) + 매직넘버 numbers.js 이전. advancedMode(휠링 게이트)는 보존.
- S1 메인 비우기: 추천 탭 제목 제거(설정 안내로) + 프리셋 선택 설정 탭 "추천 전략 선택" 섹션 이전(onPresetPick 배선) + 메인은 활성 프리셋 이름 한 줄(activePresetLineHtml).
- S2 캐릭터 카드: 접힘 row = 이름 + 이번 회차 운세(별자리·띠·일주 카피 제거), 펼침 카드 이름 h2 제거(중복), 정체성·행운번호는 펼치면 노출.
- S3 당첨 기원: 추천 탭 → 기록 탭 현재 회차(발표 대기) 아래 이전(ensureCurrentState + 클릭 핸들러 기록 탭 렌더부로 이동).
- S4 카운트다운: 일/시/분/초 단위를 원 밖 라벨 → 원 안 숫자 하단(digit + unit 세로).

10.4. 미커밋 + 잔여: docs SSOT 일치 미반영(spec 4장 / 5.1.3 / 5.1.5 / 5.1.6 / 5.2.2 / 5.3 / 5.2.5.7 / 5.6 / 5.8 + 02_data 매직넘버·옵션 폐기) - 화면 검토 + 수정 방향 확정 후 일괄 권장(미리 확정하면 재작업). draw-card.js rm 권한 차단으로 빈 stub(수동 삭제 권장). GitHub Pages 확인은 push 필요(사용자 직전 질문, push 대기).

10.5. 자비스 자기 점검: (a) /jarvis-next 실수 1건 - 도메인 cwd에서 글로벌 한정 source(ledger·buffer)를 후보로 노출(#187 위반), 사용자 2연속 지적. buffer 기록 + 사용자 "실수 묻지 말고 buffer 자동 기록" 지시 → CLAUDE.md §2.3 글로벌 갱신(글로벌 세션 #216 merged). (b) R5 어휘 회귀 "정합" 다수 - 답변 본문 + Stop hook 재작성 1회, vocab-trend 누적 9회 1위 지속, hook 강제에도 재현. 시인 + buffer evidence. (c) 사용자 요청 전수 매핑(#194): 7의견 + 2결정 + 전권위임 + 4갈래 검사 전부 S0-S4/BACKLOG 반영 확인, 누락 0.

# 11. lotto S0-S4 후속 - 사용자 화면 피드백 6건 (2026-06-07, /jc sealing)

11.1. 사용자가 GitHub Pages / dev 화면 검토하며 피드백 6건 순차 제시. 자비스 즉시 수정 + 매 묶음 commit/push(사용자 모바일 확인 흐름). commit 4건: `18fd086` / `0336fda` / `a861666` / `4e39474`. 테스트 최종 322/322 PASS.

11.2. 시각/카피 수정 (`18fd086`, `0336fda`): 캐릭터 카드 접힘 row "유저명 + 운세 등급" → 유저명 제거(캐릭터 슬롯 중복) + 운세 평가 카피("제목 아니라 운세 평 내용" 사용자 명시) / 카운트다운 숫자-단위 간격 5px / 추천 번호공 grid 1fr 균등분배 → repeat(6,auto)+가운데 정렬로 간격 축소 / 운세 등급 한자(대길/길/평/흉) → 일상어(아주 좋음/좋음/보통/주의).

11.3. 기록 잠금 신설 (`a861666`, 사용자 본질 지적 "확정이 너무 쉽게 풀림"): history 항목 locked 필드 + toggleHistoryLock + 기록 탭 현재 회차 자물쇠 토글. 잠긴 항목 = 추천 체크 해제(unregister) 차단(action 'locked' + 토스트) + 모두 비우기 보존. UX-A "확정 멘탈 모델"(BACKLOG 2.2)을 사용자가 직접 해법(잠금) 제시. 테스트 5개.

11.4. 운세 풍부화 + 휠링 설명 (`4e39474`, AskUserQuestion 결정 2건): (운세) "회차마다 문구 변화" → 등급별 문구 풀 3개씩 numbers.js FORTUNE_COPY_POOL + pickFortuneCopy(등급+시드+회차 결정론), card/summary 중복 카피 SSOT 이전, 사행성 표현 금지 유지, 테스트 3개. (휠링) "설명 카피 추가" → 설정 다구좌 모드에 쉬운 설명(부분 당첨 보장 도구 + 예시 + 1등 확률 향상 아님).

11.5. 미커밋 0(전부 push). docs SSOT 일치는 여전히 미반영(10.4 대상 절 + 본 cycle 변경 누적: 5.1.6 접힘 운세 / 5.1.2 운세 카피 풀 / 5.2.2 카운트다운 / 5.8 기록 잠금 / 5.5 휠링 카피) - 화면 검토 일단락 후 일괄 권장. draw-card.js stub 수동 삭제 잔존.

11.6. 자비스 자기 점검: R5 어휘 "정합" 회귀 지속(누적 10회 1위). Stop hook 재작성 + 직전 sealing buffer occurrence 추가했음에도 다음 답변 재발 = hook 강제·자기-시인 반복에도 안 줄어드는 자기-규율 한계 명확. buffer occurrence 누적 + 글로벌 강제력 강화 방안 검토 후보. 사용자 요청 6건 전수 매핑 누락 0.

# 12. 웹게임 공용 모바일 골격 분리 + 4.7 전 게임 적용 (2026-07-06, /jc sealing)

12.1. 발단: 사용자가 "웹 게임 공용 규칙 추출"을 물었다. 모바일 규칙 7종(STANDARD 4.7)은 이미 문서화돼 있었고, 실제 코드는 shared/base.css(다크 테마 한 덩어리)에만 있어 파스텔 게임 노노그램이 뷰포트 골격을 복사해 쓰던 상태였다. 색과 무관한 골격을 재사용 가능하게 떼는 게 핵심이었다.

12.2. mobile-shell 분리(커밋 ba51161): shared/mobile-shell.css 신설(색·폰트 없는 뷰포트 고정·safe-area·터치·리셋). base.css는 이 파일을 @import해 기존 링크 게임(tetris/sudoku/rushhour/허브)은 손대지 않고, 노노그램은 직접 링크로 바꿔 복붙을 없앴다. STANDARD v0.3.1. 4개 게임 browser-shot 재검증(페이지 스크롤 0·pageerror 0·배경색)으로 회귀 0 확인.

12.3. 정적 스모크 신설(tests/smoke.mjs): shared 골격 회귀를 커밋 전 잡는 외부 의존 0(순수 node) 검사. 각 게임 index.html의 골격 링크·viewport·mobile-shell 핵심 규칙 보존을 확인한다. npm 설치 금지(STANDARD 4.2) 제약상 playwright 대신 정적 검사로 두고, 런타임 화면은 browser-shot(자비스 글로벌 도구)이 담당하는 역할 분리. 결과 PASS(6통과/lotto경고/0실패).

12.4. 4.7 전 게임 적용: rushhour는 가로 방향 레이아웃이 없어 신설(@media landscape로 controls를 보드 왼쪽 세로열, 출구가 보드 오른쪽 바깥으로 나가는 구조라 겹침 회피) + 확대 잠금 + 전체화면 버튼 + 보드 크기 방향별(가로 60vh). v0.2 → v0.3.1. tetris/sudoku는 가로 레이아웃이 이미 있어 확대 잠금 + 전체화면 버튼만 추가. lotto는 추천기라 대상 외.

12.5. 검증: rushhour 3방향(세로·아이패드 가로·폰 가로) 페이지 스크롤 0·출구 여유 + 자체 테스트 21/21. tetris/sudoku 각 세로·가로 browser-shot 스크롤 0·pageerror 0 + 가로 레이아웃 스크린샷 육안 확인. 매 단계 정적 스모크 PASS.

12.6. 미해결: tetris/sudoku는 .standard 없는 표준 미적용 게임이라 4.7만 부분 적용했다(정식 표준 적용은 사용자 결정 영역). 노노그램 10x10 하트 손그림 교체(이번 세션 전반부, 통짜 형태 해소 + 두하트 색 분리)는 games/nonogram/PROGRESS.md에 별도로 기재했다.

# 13. nonogram 퍼즐 전수 점검 + 창 비율 무관 전체 fit (2026-07-06, /jarvis-checkpoint sealing)

13.1. 발단: 하트 교체(11차) 직후 사용자가 "15x15 등 다른 모양도 이상한 게 있는지" 전수 점검을 지시했다. 전 퍼즐 344종을 ASCII 렌더 + 동일 채움 패턴 자동 대조로 점검했다.

13.2. 퍼즐: 형태 불량 4종(편지 5x5 통짜 정사각·태양/강아지/반짝별 10x10 다운샘플 뭉개짐)을 손그림으로 교체하고, 채움 패턴이 완전히 같아 힌트·정답이 동일 문제였던 5x5 두 쌍(유령=문어, 튜토하트=하트열매)을 분리했다. 공/달 5종·곰=판다·말=얼룩말 동일 쌍은 사용자 결정으로 유지. 15x15 하트 8종은 정상 확인. 교체 전 verifyPuzzle 사전 검증 전부 통과, 테스트 20/20 PASS.

13.3. 레이아웃: 가로 방향 우측 UI를 보드에 밀착(우측 여백 = 좌 힌트 폭의 1/3, 사용자 지시) + 가로 창(1077x858 사용자 재현)에서 좌우 UI가 잘리던 문제를 fitBoard 가용 폭에 좌우 UI 열 폭 포함(scrollWidth 병용 - offsetWidth는 눌린 트랙 폭이 나오는 순환 측정) + 모드 버튼 white-space:nowrap(한글 줄바꿈이 그리드 열 최소폭을 실제 렌더 폭보다 작게 만드는 함정)으로 해소했다. 3종 창(가로 2종 + 세로 회귀) 잘림 0, pageerror 0.

13.4. 표준: 사용자 "웹게임 공용 규칙" 지시로 STANDARD 4.7-7을 "창 비율 무관 전체 fit"(가용 폭에 보드 옆 UI 열 포함, 한 축을 병목에서 제외 금지)으로 강화해 v0.3.2. nonogram 적용 버전 동기(.standard·applications.md·CHANGELOG). tetris/sudoku/rushhour 마이그레이션 여부는 사용자 결정 대기.

13.5. 상세: games/nonogram/PROGRESS.md 12차.

# 14. tetris 배움 모드(초등 수학) + 전 모드 사운드 (2026-07-06, /jarvis-checkpoint sealing)

14.1. 발단: 사용자가 테트리스를 처음 하는 초4 여아를 위해 "수학적 사고력을 길러주는 초등학생 모드"를 요청했다. 자비스는 세 방향(안 A 쉬움 기반 + 절제된 수학 힌트 / 안 B 순수 쉬움 / 안 C 풀 학습)을 순위 매겨 제시하고 안 A를 추천했으며, 사용자가 안 A를 선택했다. 근거: 처음 하는 아이는 성공 경험(쉬움)이 먼저 붙어야 지속하고, 수학 요소는 부담 안 되게 하나만 얹는 게 오래간다.

14.2. 배움 모드 신설(커밋 832e383): 기존 모드 시스템(MODES 객체)에 항목 하나를 얹는 방식이라 기존 게임 로직은 건드리지 않았다(변경 영향 범위 낮음). 아주 느린 낙하(2초에 한 칸, 젠의 4배)와 가속·레벨업 없음으로 여유를 주고, 수학 장치로 "한 줄이 완성까지 1~3칸 남으면 그 빈 칸을 노란 테두리로 강조 + 첫 빈칸에 남은 칸 수(10의 보수) 숫자 배지"를 보드에 그렸다(고정 블록 기준, 낙하 피스 제외). 라인 성공마다 격려 토스트, 게임오버 시 격려 문구 + "다시 하기" 기본 버튼으로 좌절 없이 재도전. best.kids 점수 분리, T-spin 미적용.

14.3. 사운드 + 카드 순서(커밋 6484264): 사용자 지시로 배움 카드를 메뉴 최상단으로 옮기고, 전 모드에 Web Audio 합성 효과음을 적용했다(음원 파일 0, nonogram의 sound.js 패턴 차용, tetris/sound.js 신설). 이동·회전·하드드롭·고정·라인클리어(4줄은 더 화려한 팡파레)·홀드·레벨업·게임오버에 짧은 합성음을 연결하고, topbar에 🔊 음소거 토글(localStorage 저장) + 첫 제스처 오디오 unlock·유휴 4초 절전·백그라운드 탭 suspend를 넣었다.

14.4. 검증: browser-shot로 메뉴 카드 순서(배움 최상단)·게임 진입·수학 힌트 실제 렌더(빈칸 3 배지)·게임오버 격려 모달·음소거 버튼 가시성을 화면으로 확인하고, playwright로 게임을 전 과정 구동해 사운드 호출 포함 콘솔 에러 0을 확인했다. 소리 자체는 무음 검증 환경이라 미청취, 재생 호출 무결성만 확인 - 실제 톤은 사용자 실기 영역.

14.5. 미해결: 배포 후 딸 실기 확인이 다음 진입 trigger(사용자 영역). 실기 반응에 따라 낙하 속도(현 2초/칸)·힌트 노출 조건(현 빈칸 3 이하)·사운드 톤·음량 조정 여지. 상세: games/tetris/PROGRESS.md 2.13/2.14.

# 15. Sky Raider - 횡스크롤 비행 슈팅 신규 게임 (2026-07-06, /jarvis-checkpoint sealing)

15.1. 발단: 사용자가 "횡스크롤 비행 슈팅 게임을 만들고 싶다"며 /jarvis-init을 호출했다. 자비스는 이 자리가 새 자비스 도메인 등록이 아니라 기존 game-hub 허브의 6번째 게임 추가임을 판단해(cwd가 games/flightshooting), jarvis-init의 도메인 골격 생성 대신 루트 CLAUDE.md §7 새 게임 추가 절차를 따랐다. 게임 뼈대 4축을 AskUserQuestion으로 확정 - 성격=캐주얼 아케이드, 진행=스테이지 클리어+보스, 조작=드래그 이동+자동발사, 성장=파워업 아이템. 사용자가 명시한 "횡스크롤"을 존중해 모바일 세로 스크롤이 아닌 좌→우 전진(그라디우스형)으로 구현했다.

15.2. 구현: 바닐라 JS + Canvas 단일 game.js. 공유 자산(loop.js·storage.js·ui.js·tokens.css·base.css) 위에 얹었다. 드래그는 잡은 지점 대비 상대 이동(손가락 가림 방지)이라 기존 input.js의 누적 pan 대신 canvas에 pointer를 직접 붙였다. 적 3종(직진 drone·사인파 weaver·조준사격 gunner), 화력 1~5단계(발사 각도 배열 분기), 파워업 3종(P 화력/H 회복/B 봄), 3개 구역 웨이브 스포너 + 보스(상하 유영 + 부채산탄·조준 3연발 2패턴), 목숨 3개+무적, 점수+localStorage 베스트. 효과음은 tetris/sound.js 패턴 차용한 Web Audio 합성(음원 파일 0). 파일 신설 - index.html·game.js·style.css·sound.js·CLAUDE.md·PROGRESS.md·README.md·.nojekyll + games/_registry.json 등록(accent #22d3ee, status playable).

15.3. 검증: browser-shot로 메뉴 화면·전투(기체·총알·엔진불꽃·적 접근)·파워업 획득(화력 1→2)·게임오버 모달·보스 등장(체력바)·허브 홈 6번째 카드를 화면으로 확인했다. 보스전은 자동 회피 스크립트로 보스 등장까지 도달, 격파→구역 전환은 로직만 확인(실플레이 권장).

15.4. 실화면 검증 중 결손 2건 발견·수정: (1) .menu-screen/.game-screen의 display:flex가 브라우저 기본 [hidden]{display:none}을 명시도로 덮어 메뉴와 게임 화면이 동시 표시되고 canvas 세로가 420px로 축소됐다. [hidden]{display:none !important}로 정정해 canvas 761px 정상 확보(#190 유형 재발 - CSS가 hidden 덮음). (2) 공유 CSS에 sr-only 미정의로 접근성 제목이 화면에 노출돼 style.css에 직접 정의(tetris도 동일 패턴).

15.5. 미해결: 보스 격파→다음 구역 전환 실플레이 확인(사용자 영역), 구역별 보스 패턴 차별화(현 HP만 증가), 모바일 실기기 터치 감도. 상세: games/flightshooting/PROGRESS.md.

# 16. Sky Raider - 세로(종) 스크롤 전환 + 화력 20단계 (2026-07-06, /jarvis-checkpoint sealing)

16.1. 발단: 15장 첫 playable(좌→우 횡스크롤) 직후 사용자가 "종(세로) 스크롤로 바꿔줘 + 총알 업그레이드는 20단계로 늘려줘"를 지시했다. 두 변경 모두 사용자 명시 지시라 대안 검토 없이 그대로 반영했다.

16.2. 세로 전환: game.js 좌표계를 회전했다. 전진 방향을 +x(오른쪽)에서 위쪽(-y)으로 바꿔, 플레이어는 화면 하단(yRatio 0.82)에 두고 적은 위(-r)에서 등장해 아래로 낙하하며 아군 탄은 위로, 적탄은 아래로 나간다. 웨이브 스폰의 가로 분산(xr), weaver 좌우 사인 흔들림, gunner 플레이어 x 추적, 보스 상단 자리+좌우 유영+아래 방향 부채, 별 배경 세로 스크롤, 파워업 낙하, 렌더(기체 위 향한 삼각형+아래 엔진불꽃, 드론 아래 향함, 총알 세로 캡슐)까지 전부 세로 기준으로 정리했다. 드래그는 상대 이동이라 방향 무관하게 그대로 동작한다.

16.3. 화력 20단계: 기존 1~5단계 고정 각도 배열을 genFireAngles 함수 생성(1~20)으로 확장하고 maxPower를 20으로 올렸다. 레벨이 오를수록 정면 부채가 촘촘해지고 확산각이 넓어지며(최대 11발), 8단계부터 측면 2발, 12단계부터 후측면 2발, 16단계부터 후방 3발이 순차 추가돼 만렙은 전방위 탄막이 된다. 파워업 P 획득당 +1, 피격 시 -1(최소 1)은 유지.

16.4. 검증: browser-shot로 세로 전투(하단 기체·위로 나가는 총알·아래로 내려오는 드론·P 파워업·별 세로 스크롤)를 화면으로 확인했다. 고화력 발사 패턴은 시작 화력을 임시 20으로 올려 캡처(정면 아치형 탄막 + 측면 + 후방 전방위 확산, HUD 화력 20 표시) 후 시작 화력을 1로 원복했다. registry subtitle·루트 CLAUDE.md 표·README·게임 CLAUDE.md(전진 방향/화력/보스 설명)를 세로·20단계 기준으로 정합화했다.

16.5. 미해결: 15장과 동일(보스 격파→구역 전환 실플레이, 구역별 보스 패턴 차별화, 모바일 실기기 감도). 20단계까지 도달하는 파워업 획득 속도(현 P당 +1)가 캐주얼 한 판에 적절한지 실플레이 밸런스 확인 여지.

# 17. Sky Raider - 10구역/중보스 + 화력 재설계 + 사운드 + 표준 풀 적용 + 발열 최적화 (2026-07-06, /jarvis-checkpoint sealing)

17.1. 발단: 사용자가 실플레이 후 여러 개선을 순차 지시했다. (1) 스테이지 10개 + 파워업 유지 (2) 2·3구역이 웨이브 없이 바로 보스로 넘어가는 버그 (3) 1~9구역은 중보스가 다른 비행체(호위)와 함께 나오고 최종보스는 10구역만 (4) "P를 하나 더 먹어도 총알이 그대로다 - 뭐가 달라진 거냐"는 화력 결함 지적. 이어 사운드 현대화, 표준 미적용 지적, 발열 규격 질문까지 다섯 갈래를 처리했다.

17.2. 화력 20단계 재설계(사용자 선택 "탄 수 + 위력 교대"): 기존 shots=1+floor(L/2) 공식은 짝수 레벨에서만 탄이 늘어 홀수 레벨(3·5·7…)이 직전과 완전히 동일했다(P를 먹어도 변화 0). fireSpec을 홀수=탄 갈래 추가(최대 10발), 짝수=데미지+탄 굵기 상승으로 바꿔 매 단계 반드시 체감되게 했다. 위력은 탄 굵기(r=3+dmg*0.9)에 연동해 눈에도 보인다. L≥12 측면탄, L≥17 후방 3발 대칭.

17.3. 10구역 + 중보스/최종보스 + 전환 버그: stageCount 10, buildWaves 난이도 상한(과밀 방지). 1~9구역은 중보스(작은 기체, 좌우 유영 + 조준 발사 + 호위 비행체 주기 소환), 10구역만 최종보스(2패턴). 2·3구역 바로 보스 버그의 원인은 보스 격파 후 다음 웨이브가 깔리기 전 진행 판정이 "웨이브 끝+적 없음"으로 즉시 다음 보스를 소환한 것 - transitioning 플래그로 전환 대기 중 판정을 멈춰 해소했다. 화력·목숨은 구역이 넘어가도 유지됨을 확인(초기화는 재시작만). browser-shot으로 중보스+호위 등장과 2구역 정상 진입 확인.

17.4. 사운드 현대화(사용자 "8비트 같다, 요즘 것으로"): 단일 오실레이터 + 딱딱한 엔벨로프였던 것을 유니즌 디튠(3겹) + lowpass 필터 스윕 + 합성 리버브(convolver) + 서브베이스 임팩트로 재작성. 발사는 부드러운 pew, 폭발·보스격파·봄은 묵직한 서브베이스, 파워업·클리어는 메이저 코드 아르페지오. 톤 자체는 무음 검증이라 재생 호출 무결성(pageerror 0)만 확인, 실제 소리는 사용자 실청 영역.

17.5. html-game 표준 풀 적용(사용자 "왜 미적용?" 지적 → "풀 적용" 선택): flightshooting은 참고를 표준 미적용 게임 tetris로 골라 표준(§7 절차)을 건너뛴 자비스 절차 누락이었다. game.js 단일 파일을 표준 구조로 재편 - src/data(numbers·colors)/core(fire·waves·stars·spawn·world)/render/input/audio + docs 4종 + tests + styles/main.css. core는 DOM/Canvas/오디오 미의존 순수 로직으로 분리하고, 사운드·화면전환은 game.sfx/game.events로 넘겨 main이 소비한다. 화면 전환 지연도 setTimeout→dt 기반 타이머로 바꿔 일시정지에 안전하다. .standard(v0.3.2)·applications.md·CLAUDE.md 표준 인덱스 등록, 전체화면 버튼(4.7-6) 추가. core 순수함수 테스트 13/13 PASS(테스트가 후방탄 비대칭 결함 1건을 잡아 정정). 모듈 분리 후 전 모듈 로드+전투 동작 회귀 없음 확인. 구 파일(game.js·style.css·sound.js) 삭제.

17.6. 발열 최적화(사용자 "발열도 표준에 포함?" → 없음 확인 → A안 "게임 최적화 먼저, 실측 후 표준 반영"): 화면에 수십 개씩 그려지는 요소(적·총알·적탄)의 매 프레임 글로우(shadowBlur)가 발열 핵심 요인이라, 글로우를 단일·소수 요소(플레이어·보스·파워업)에만 남기고 다수 요소는 밝은 색 채움으로 바꿨다. 오브젝트 상한(총알 160·적탄 140·파티클 240, 초과 시 오래된 것부터 제거)도 추가. 스크린샷상 시각 품질 유지.

17.7. 미해결: (a) 실기 발열 개선 체감 확인 후 표준에 "성능·발열" 항목 신설(탭 백그라운드 정지/오디오 유휴 절전/dpr 상한/글로우·파티클 남발 금지) - 전 게임 공통이라 허브 표준이 구현 위치 (b) 보스 격파→구역 전환·10구역 완주 실플레이 (c) 파워업 획득 속도 밸런스 (d) 구역별 보스 패턴 차별화. 상세: games/flightshooting/PROGRESS.md.

# 18. Sky Raider - 3계통 파워 파츠 + 적 체력 구역 스케일 (2026-07-07, /jarvis-checkpoint sealing)

18.1. 발단: 세션 시작 시 다른 머신에서 이미 커밋된 flightshooting을 git pull로 이 로컬에 반영했다(로컬 nonogram 배지 대비 개선 미커밋분은 stash 경유로 보존 후 별도 커밋 a61f92f). 이어 사용자가 단일 화력(1~20)을 여러 파츠로 나누자고 지시했다 - (1) 앞쪽 부채탄 최대 8발 (2) 좌우에 붙는 부속 비행기 최대 8대(좌4·우4), 안쪽 2슬롯 레이저·바깥 2슬롯 유도미사일 (3) 플레이어 주변 에너지존(점점 커지고 0.5초마다 존 내 적 피해). 성장·피격 페널티는 AskUserQuestion으로 확정 - 파츠별 전용 아이템(P/S/E) + 피격 시 마지막 얻은 파츠 1개 손실(역순).

18.2. 3계통 구현: core/parts.js 신설(순수). 전방 화력은 fire.js의 fireSpec을 frontSpec으로 바꿔 정면 부채만 1~8발로 축소(측면·후방 지원탄은 옵션기로 이관). 옵션기는 S 획득당 좌우 번갈아 1대, 슬롯 0·1 레이저(빠른 직진탄)·2·3 유도 미사일(가까운 적 선회 추적·가속), 플레이어를 부드럽게 추종. 에너지존은 레벨 0~5 반경 성장, 0.5초 tick마다 존 내 적·보스에 레벨만큼 피해(적 사망 처리는 parts에서, 보스는 hp만 깎고 world가 총알 외 피해까지 일괄 격파 판정). 획득 순서를 partHistory 스택에 담아 피격 시 역순 손실. 드롭 5종(P/S/E/H/B) 가중치 재배분. HUD는 단일 화력→구역/앞/옵션/존 4칸(파츠별 색). 렌더에 존 오라(radial gradient)·옵션기·레이저·회전 미사일 추가. 사운드 missile·zone 추가.

18.3. 적 체력 구역 스케일(사용자 후속 지시): 적 hp가 구역 무관 고정이라 후반이 쉬워지는 문제를, spawnEnemy에서 `ceil(base×(1+(stage-1)×enemyHpScale))`(0.28) 적용으로 해소. 10구역 기준 drone 1→4·weaver 2→8·gunner 3→11로 3계통 화력 성장과 균형.

18.4. 검증: core 순수함수 24/24 PASS(frontSpec 8단계·옵션 슬롯 배치·파츠 상한·역순 손실·적 체력 단조 증가). browser-shot로 기본 로드 pageerror 0 + HUD 3계통 표시 확인, 임시 만렙 주입 캡처로 옵션기 8대(좌우 대칭)·레이저·유도미사일·존 오라 시각 확인 후 주입 원복. 겸사 시작화면 "3개 구역"→"10개 구역" 오정보 정정. docs/05_power-parts.md 설계 SSOT 신설 + 01/02/03/04·게임 CLAUDE·README 정합.

18.5. 미해결: (a) 파츠 밸런스 실플레이 조정(레이저/미사일 연사·존 반경/tick·드롭 가중치·획득 속도) (b) 적 체력 스케일 후반 체감 조정 (c) 옵션기 다수 시 발열 체감 (d) 루트 index.html·apps/의 허브 앱섹션 작업은 이 세션과 무관한 별도 미커밋 변경으로 남음(다른 작업 흔적, 봉합 제외). 상세: games/flightshooting/PROGRESS.md.
