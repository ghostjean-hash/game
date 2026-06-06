# game_ghost 진행 상황

프로젝트 전체 메타 로그. 게임별 세부는 각 게임 폴더의 `PROGRESS.md` 참조.

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

# 3. 공통 결정

3.1. **Public repo 강제**: GitHub Pages 무료는 Public만 호스팅.
3.2. **iOS 아이콘 PNG로**: SVG `apple-touch-icon`이 iOS에서 미표시 → `scripts/build_icons.py`로 PNG 생성.
3.3. **Pages 활성화는 사용자 수동**: gh CLI 미설치, PAT 노출 회피.
3.4. **main 직접 푸시는 사용자 명시 승인 시에만**: 자동 모드 기본 차단.

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
