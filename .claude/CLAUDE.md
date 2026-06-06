---
domain: game-hub
---

# game-hub 자비스 도메인

게임 허브(PWA 미니게임 모음)의 자비스 운영 도메인. 게임 개발 컨텍스트는 루트 `CLAUDE.md` + 각 게임 `games/<id>/CLAUDE.md` 참조. 이 파일은 자비스 도메인 식별 + 골격 인덱스 전용.

## 1. 도메인 식별

- domain: game-hub
- 작업 디렉토리: `D:\claude_code\game` (public repo, GitHub Pages 배포)
- remote: github.com/ghostjean-hash/game (G1 머신 공유 위치 통과)
- 스택: html-game (domain-map 정식 등록 전까지 fallback sequential)
- 워크플로우 패턴: sequential

## 2. 골격 자산 인덱스

| 자산 | 위치 | 역할 |
|---|---|---|
| `ROADMAP.md` | 도메인 루트 | 중장기 마일스톤 + 우선순위 (사용자 명시 영역) |
| `TASKS.md` | 도메인 루트 | 현재 cycle 진입 후보 + 진행/완료 추적 |
| `NEXT-SESSION.md` | 도메인 루트 | 다음 세션 진입 컨텍스트 (SessionStart 자동 주입) |
| `PROGRESS.md` | 도메인 루트 | self-critique memory (게임 허브 메타 로그 겸용, 기존 자산 보존) |
| `.claude/workflows/` | 도메인 | handoff JSON 인스턴스 저장 (unversioned) |
| `.jarvis-handoff.jsonl` | 도메인 루트 | 글로벌 ledger 인계 대기 buffer (§3.5.4.2) |

## 3. 운영 상태 (글로벌 단일, 이 도메인에 미생성)

`ACTIVE.md` / `JOURNAL.jsonl` / `JARVIS-STATE.md` / `ledger/`는 자비스 본체(`~/.claude`) 글로벌 단일 자산(사양 §6.1.6). 이 도메인에 별도 생성하지 않는다. 도메인 작업 중 발견한 글로벌 룰 후보는 `.jarvis-handoff.jsonl` buffer 경유 수동 인계(§4.2 거버넌스).

## 4. 게임 도메인 룰 위임

게임 등록 / html-game 표준 / 커밋 컨벤션 / 사행성 표현 금지 등 게임 개발 룰은 루트 `CLAUDE.md`에 위임. 이 파일은 중복 기재하지 않는다.
