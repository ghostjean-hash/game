# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-06-06)

자비스 정식 도메인 골격 사후 도입. 기존 게임 허브(`D:\claude_code\game`)를 자비스 도메인 `game-hub`로 등록. 범위 결정 = 사용자 명시("게임 허브 도메인 열어서 진행").

## 현재 상태

- 도메인 골격 생성 완료: `.claude/CLAUDE.md`(domain키) + `.claude/workflows/` + `ROADMAP.md` + `TASKS.md` + `NEXT-SESSION.md`
- 기존 자산 보존: `PROGRESS.md`(게임 메타 로그 → self-critique 겸용) + `README.md`
- 운영 상태(ACTIVE/JOURNAL/ledger)는 글로벌 단일(`~/.claude`) 사용 - 도메인 미생성이 정석(§6.1.6)
- 받아들일 항목: `.jarvis-handoff.jsonl`에 글로벌 ledger 인계 대기 2건 (회귀 패턴 1 + lotto 작업 실수 묶음 1)

## 다음 행동 (글로벌 세션에서 처리, TASKS T-002~T-005)

이 항목들은 글로벌 설정 수정이라 도메인 세션에서 불가(§4.2 + cross-domain-guard). `~/.claude` 글로벌 세션에서:

1. **search_roots 등록**: `settings.json` `jarvis.handoff_buffer.search_roots`에 `"D:\\claude_code\\game"` 추가 → buffer 자동 감지 활성화 (현재 `[]`라 no-op)
2. **domain-map 등록**: `agents/initializer/domain-map.json`에 `game-hub` 정식 등록 (현재 fallback sequential 임시)
3. **buffer 인계**: `.jarvis-handoff.jsonl` pending 2건을 글로벌 ledger로 수동 인계 (§2.3 승인 큐)
4. **옛 경로 정정**: `games/lotto/.claude/settings.json`의 옛 경로 `f:\claude_code\game_ghost` → 현재 `D:\claude_code\game` (P2)

## 게임 작업 컨텍스트

게임별 진행은 각 `games/<id>/PROGRESS.md` 참조. 현재 활성 작업은 lotto(11전략 추천, html-game v0.2 적용). sudoku/tetris는 표준 미적용 후순위.
