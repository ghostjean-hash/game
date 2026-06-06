---
apiVersion: jarvis/v1
kind: Roadmap
metadata:
  name: game-hub-roadmap
  owner: ghostjin
  created_at: 2026-06-06
  spec_ref: ~/.claude/jarvis-design.md §7.6 (자기-로드맵 절)
  cycle_ref: jarvis-init-game-hub-2026-06-06
spec:
  scope: domain (game-hub)
  authoritative: true
  update_owner: 사용자 (자비스는 제안만)
  schema_version: 1.0
---

# game-hub 업그레이드 로드맵 (ROADMAP)

> game-hub 도메인 자체 중장기 마일스톤 + 우선순위 + 도달 기준.
> 이 문서는 사용자 명시 영역. 자비스는 제안 + 마일스톤 진행 보고만 (CLAUDE.md §2.2 일치).
> 진행 상태 추적: `TASKS.md` (현재 cycle 진입 후보 TODO 관리).

## 진행 중 마일스톤 (in-progress)

| M | 명칭 | 도달 기준 | 우선순위 | ref |
|---|------|------|------|------|
| (없음 - M-1/M-2 완료. 다음 마일스톤은 사용자 명시 추가) | | | | |

## 다음 마일스톤 (pending, 우선순위 순)

| M | 명칭 | 도달 기준 | 우선순위 | 본질 |
|---|------|------|------|------|
| (사용자 직접 추가) | | | | |

## 완료 마일스톤 (completed, 최신순)

| M | 명칭 | 완료일 | sealing commit | ref |
|---|------|------|------|------|
| M-1 | 도메인 진입 + 첫 cycle | 2026-06-06 | df913a6 | jarvis-init-game-hub-2026-06-06 |
| M-2 | 글로벌 인계 마감 (search_roots/domain-map/buffer 인계) | 2026-06-06 | 글로벌 인계 merged + 469311a | GT-1~4 buffer merged |

## 우선순위 분류 (P0/P1/P2)

- **P0**: 사용자 직접 신호 + 누적 누락 시그널 → 즉시 진입 후보
- **P1**: 직전 cycle 완료 후 자연 진입 + 사용자 결정 영역
- **P2**: 사용자 명시 우선순위 상향 시까지 대기

## 갱신 룰

1. 마일스톤 완료 시 in-progress → completed 이동 (사용자 명시).
2. 신규 마일스톤 발견 시 사용자 명시 추가 (자비스 추천만).
3. 우선순위 재조정 시 사용자 명시 (자비스는 누적 누락 시그널만 보고).
