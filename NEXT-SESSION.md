# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-06-06)

자비스 정식 도메인 골격 사후 도입. 기존 게임 허브(`D:\claude_code\game`)를 자비스 도메인 `game-hub`로 등록. 범위 결정 = 사용자 명시("게임 허브 도메인 열어서 진행").

## 현재 상태

- 도메인 골격 생성 완료: `.claude/CLAUDE.md`(domain키) + `.claude/workflows/` + `ROADMAP.md` + `TASKS.md` + `NEXT-SESSION.md`
- 기존 자산 보존: `PROGRESS.md`(게임 메타 로그 → self-critique 겸용) + `README.md`
- 운영 상태(ACTIVE/JOURNAL/ledger)는 글로벌 단일(`~/.claude`) 사용 - 도메인 미생성이 정석(§6.1.6)
- 받아들일 항목: `.jarvis-handoff.jsonl`에 글로벌 ledger 인계 대기 2건 (회귀 패턴 1 + lotto 작업 실수 묶음 1)
- **도메인 워크플로우 진입 완료 (2026-06-06)**: `research-handoff.json` = jarvis-init 절차 5-7(Initializer 호출 + handoff instance) 사후 실행. 2026-06-06 후속 전수 검사에서 이 파일이 자산 인덱스 지정 위치 대신 루트에 있던 위치 불일치 발견 → `.claude/workflows/research-handoff.json`로 이동 완료. unversioned 격리 확인(`.gitignore` line 30 `**/*-handoff*.json`).
- **글로벌 연결 4건 전부 완료 확인 (2026-06-06 후속)**: 아래 "다음 행동"이 전수 검사로 모두 merged 확인됨 (이전 스냅샷은 미처리 표기였으나 실제 처리 완료).

## 다음 행동

### 완료 확인 (2026-06-06 후속 전수 검사, 글로벌 4건 전부 merged)

1. ~~search_roots 등록~~ → 완료. handoff_buffer + wip_monitor 두 곳 모두 `D:\claude_code\game` 등록 확인.
2. ~~domain-map 등록~~ → 완료. `game-hub` 정식 등록(workflow_pattern=sequential / stacks=html-game, 사용자 결정 2026-06-06).
3. ~~buffer 인계~~ → 완료. 글로벌 ledger #176(어휘 회귀)+#177(lotto UX) 인계, buffer 해당 항목 status=merged.
4. ~~lotto 옛 경로 정정~~ → 완료. `games/lotto/.claude/settings.json` `game_ghost` 잔재 0건.

### 남은 행동 (글로벌 세션에서 처리)

1. **hook handoff 탐색 위치 표준 확정**: SessionStart hook("활성 handoff 없음", .claude/workflows/ 탐색)과 UserPromptSubmit hook("active handoff: research", 루트 탐색)이 서로 다른 위치를 봄. 글로벌 hook 코드 확인 후 단일 위치로 통일. 도메인 cwd 수정 불가라 buffer 기록(`.jarvis-handoff.jsonl`).

## 게임 작업 컨텍스트

게임별 진행은 각 `games/<id>/PROGRESS.md` 참조. 현재 활성 작업은 lotto(11전략 추천, html-game v0.2 적용). sudoku/tetris는 표준 미적용 후순위.
