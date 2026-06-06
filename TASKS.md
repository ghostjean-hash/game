---
apiVersion: jarvis/v1
kind: Tasks
metadata:
  name: game-hub-tasks
  owner: ghostjin
  created_at: 2026-06-06
  spec_ref: ~/.claude/jarvis-design.md §7.6 (자기-로드맵 절)
  roadmap_ref: ROADMAP.md
spec:
  scope: domain (game-hub)
  authoritative: true
  update_policy: 자비스 자동 (cycle 완료 시) + 사용자 명시 (신규 task)
  schema_version: 1.0
---

# game-hub 작업 목록 (TASKS)

> game-hub 도메인 자체 현재 cycle 진입 후보 + 진행 중 + 최근 완료 task 관리.
> 3 상태 분류: `in-progress` / `pending` / `completed`. 각 task는 ROADMAP 마일스톤 ref 보유.

## in-progress (현재 cycle)

| ID | 본질 | 마일스톤 ref | cycle ref | 진행률 |
|----|------|------|------|------|
| T-001 | 도메인 진입 + 첫 cycle | M-1 | jarvis-init-game-hub-2026-06-06 | 90% (골격 생성 완료, 글로벌 인계 대기) |

## pending (대기 중)

| ID | 본질 | 마일스톤 ref | 우선순위 | 진입 trigger |
|----|------|------|------|------|
| T-002 | 글로벌 settings.json search_roots에 game 루트 등록 | M-2 | P1 | 글로벌 세션(~/.claude) 진입 |
| T-003 | domain-map.json에 game-hub 정식 등록 (현재 fallback) | M-2 | P1 | 글로벌 세션 진입 |
| T-004 | .jarvis-handoff.jsonl pending 항목 글로벌 ledger 수동 인계 | M-2 | P1 | 글로벌 세션 진입 |
| T-005 | lotto/.claude/settings.json 옛 경로(f:/game_ghost) 정정 | M-2 | P2 | 사용자 확인 |

## completed (최근 완료, 최신 10건만 유지)

| ID | 본질 | sealing commit | 완료일 |
|----|------|------|------|
| (cycle 완료 후 자동 채움) | | | | |

## 우선순위 정책

- **P0**: 사용자 직접 신호 + 누적 누락 → 다음 cycle 진입 후보
- **P1**: 직전 cycle 완료 후 자연 진입 + 사용자 결정 영역
- **P2**: 사용자 명시 우선순위 상향 시까지 대기

## 갱신 룰

1. cycle 진입 시 자비스가 해당 task in-progress 전환 (자동).
2. cycle 완료 시 자비스가 completed 전환 + sealing commit hash 기록 (자동).
3. 신규 task 추가는 사용자 명시 (자비스 추천만).
4. completed 10건 초과 시 가장 오래된 항목 제거 (자비스 자동).
