---
apiVersion: jarvis/v1
kind: Board
metadata:
  name: game-hub-board
  owner: ghostjin
  created_at: 2026-07-02
  spec_ref: ~/.claude/jarvis-design.md §7.6 (자기-로드맵 절)
  cycle_ref: jarvis-init-game-hub-2026-07-02
spec:
  scope: domain (game-hub)
  columns: [backlog, todo, in-progress, review, verify, done]
  wip_limit:
    in-progress: 1
  gate:
    착수: todo→in-progress
    완료: verify→done
  update_owner: 자비스 실행 추적 (착수/완료만 사용자 게이트)
  schema_version: 1
---

# game-hub 실행 칸반 보드 (BOARD)

> game-hub 도메인 실행 추적용 칸반. 카드를 칸 사이로 옮기며 진행한다.
> 착수(todo→in-progress)와 완료(verify→done) 전환은 사용자 명시 확정 후에만 (board-gate hook 강제).
> 중간 전환(in-progress→review→verify)은 자비스가 진행한다.
> in-progress 칸은 WIP=1 (동시 진행 1장 한도, 사양 §11.1.2 일치).
>
> 자산 역할 구분: ledger=실수/누락 자동 누적 / TASKS.md=사용자 직접 큐 / BOARD.md=자비스 실행 추적.

## DoD (전역 완료 정의)

모든 카드가 done이 되려면 공통으로 충족한다.
- [ ] 카드의 완료조건(AC)을 모두 만족
- [ ] 관련 테스트 통과 (검증 증거 본문 기재)
- [ ] 사용자 sign-off

## 카드 표준

각 카드는 끊겨도 이것만 보고 이어받을 수 있어야 한다.

```
### [카드 제목]
- 목표: (한 줄)
- 완료조건(AC): (체크리스트)
- 의존성: (선행 카드 / 없음)
- 관련 파일: (경로)
- 진행 메모: (지금까지 한 것, 끊긴 지점)
- 다음 행동: (한 줄, 재개 시 즉시 할 것)
```

## backlog

## todo

### [nonogram 게임 컨셉 확정 + spec/data 문서 채우기]
- 목표: STANDARD.md 8장 6문항 사용자 답변 → docs/01_spec.md + 02_data.md 확정
- 완료조건(AC): 조작 / 진행 시스템 / 성공·실패 조건 / 모바일 지원 / 퍼즐 소스 결정 기재
- 의존성: 없음 (골격 셋업 완료)
- 관련 파일: games/nonogram/docs/01_spec.md, 02_data.md
- 진행 메모: 2026-07-02 골격 셋업 + 허브 등록 + 컨셉 초안 합의(초4 여아 / 도감 수집형 / 실패 없음 / 자체 그림 + 솔버 무추측 검증 / 5·10·15 3단). 상세 games/nonogram/PROGRESS.md
- 다음 행동: 사용자 최종 확정("이 초안대로 docs 반영 + 구현 착수?") 답변 받기

## in-progress

## review

## verify

## done
