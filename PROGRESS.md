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
| rushhour | playable, 초등 저학년 산리오풍 1단계 | `games/rushhour/PROGRESS.md` |

# 3. 공통 결정

3.1. **Public repo 강제**: GitHub Pages 무료는 Public만 호스팅.
3.2. **iOS 아이콘 PNG로**: SVG `apple-touch-icon`이 iOS에서 미표시 → `scripts/build_icons.py`로 PNG 생성.
3.3. **Pages 활성화는 사용자 수동**: gh CLI 미설치, PAT 노출 회피.
3.4. **작업 완료 시 커밋·푸시를 세트로 자동**(사용자 2026-06-29 지시): 매번 승인 질문 없이 자비스가 커밋 + 푸시까지 일괄 수행. 위험하거나 대규모인 변경은 사전 안내 후 진행.
3.5. **게임 자산(js/css/html) 변경 배포 시 `service-worker.js`의 `CACHE_VERSION` bump 필수**: SW가 stale-while-revalidate라 버전을 안 올리면 사용자 기기에 옛 파일이 남아 새 파일과 섞인다(2026-06-29 rushhour 동물 미표시 사고). 커밋·푸시 세트에 SW bump를 포함한다.

# 4. 공통 미해결 / 개선 여지

4.1. 사운드/햅틱 없음(전 게임).
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
