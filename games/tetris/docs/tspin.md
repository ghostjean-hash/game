# T-spin 감지 + 보너스 점수 기획서

# 1. 목표

1.1. T 피스를 회전으로 좁은 슬롯에 끼워 넣었을 때 정통 Tetris Guideline 기준 보너스 점수 부여.
1.2. 마라톤/젠 모드의 점수 표현력 확장. 스프린트는 시간 단축 위주라 비대상.
1.3. 본체 SRS가 정통 가이드라인 정렬이므로 감지 룰도 표준(3-corner) 그대로 정렬.

# 2. 감지 룰 (3-corner)

2.1. **선행 조건**: T 피스 락 직전, **마지막 동작이 회전(`tryRotate`)이어야 함**. 좌우 이동 / 하드드롭 / 소프트드롭 직후 락은 T-spin 아님.

2.2. **코너 검사**: T 피스 중심 기준 4개 코너 셀의 막힘 여부 검사.
- 좌상 `(p.x, p.y)`, 우상 `(p.x+2, p.y)`, 좌하 `(p.x, p.y+2)`, 우하 `(p.x+2, p.y+2)`.
- 막혔다 = 보드 밖 / 벽 / 기존 블록.

2.3. **3-corner 룰**: 4개 코너 중 **3개 이상 막힘** → T-spin 후보.

2.4. **front / back 분류**: T 머리 방향 기준 2 코너 = front, 반대편 2 코너 = back.

| 회전 `r` | T 머리 방향 | front (머리쪽) | back (꼬리쪽) |
|---|---|---|---|
| 0 | 위 | 좌상, 우상 | 좌하, 우하 |
| 1 | 오른쪽 | 우상, 우하 | 좌상, 좌하 |
| 2 | 아래 | 좌하, 우하 | 좌상, 우상 |
| 3 | 왼쪽 | 좌상, 좌하 | 우상, 우하 |

2.5. **정식 vs Mini 분기**.

| front 막힘 | back 막힘 | 판정 |
|---|---|---|
| 2 | ≥1 | 정식 T-spin |
| 1 | 2 | Mini T-spin |
| 그 외 | - | T-spin 아님 |

2.6. **TST kick 격상**(옵션): 마지막 회전이 큰 kick(JLSTZ kick table 인덱스 4번, `(0,-2)`/`(±1,-2)` 계열)으로 진입했으면 Mini → 정식으로 격상. Tetris Guideline 표준.

# 3. 점수표 (Tetris Guideline)

3.1. T-spin 발동 시 **일반 라인 점수 대신** 아래 점수 적용. 이중 가산 안 함. 모두 × level.

| 동작 | 점수 |
|---|---|
| T-spin Mini (라인 0) | 100 |
| T-spin Mini Single | 200 |
| T-spin (라인 0) | 400 |
| T-spin Single | 800 |
| T-spin Double | 1200 |
| T-spin Triple | 1600 |

3.2. 기존 라인 점수 [100/300/500/800]은 T-spin이 아닌 일반 클리어에 그대로 적용.

# 4. B2B (Back-to-Back) - 결정 영역

4.1. T-spin Lines / Tetris 연속 시 점수 ×1.5. 일반 라인이 끼면 체인 끊김. T-spin No-Line / Mini No-Line은 라인 카운트 0이라 체인 유지.

4.2. [의견] 도입 권장. 정통 정렬 + 점수 표현력 확장.

# 5. 모드별 적용

| 모드 | 적용 | 비고 |
|---|---|---|
| 마라톤 | O | 점수 경쟁 핵심 |
| 젠 | O | 점수가 베스트 대상 |
| 스프린트 | X | 시간 측정. 점수 비대상이라 보너스 의미 없음. 라인 카운트는 동일 |

# 6. 트리거 시점 / 상태 추가

6.1. **트리거**: `lockPiece` 진입 시 T-spin 판정 → 라인 카운트와 결합해 점수 분기.

6.2. **상태 추가**.

| 상태 | 의도 |
|---|---|
| `state.lastMoveWasRotation` | T-spin 후보 가드 (마지막 동작이 회전인지) |
| `state.lastKickIndex` | TST 격상 판정용 (옵션) |
| `state.b2bChain` | B2B 적용 시 체인 유지 여부 |

6.3. **갱신 시점**.
- `tryMove` 성공 / hardDrop / 부분 소프트드롭 진행 → `lastMoveWasRotation = false`.
- `tryRotate` 성공 → `lastMoveWasRotation = true`, `lastKickIndex = 사용 인덱스`.
- `spawn` / `lockPiece` 종료 → 적절히 reset.

# 7. UI 표기

7.1. T-spin 발동 시 토스트(1.2~1.6s).

7.2. 카피 후보(톤 결정 영역).
- 한글: `T-스핀 더블!`, `미니 T-스핀!`
- 영문: `T-Spin Double!`, `Mini T-Spin!`

7.3. HUD에 별도 영구 표기 추가 안 함 (topbar 공간 보호 - CLAUDE.md tetris 5.1).

7.4. B2B 적용 시 체인 카운트 토스트 옵션: `B2B ×3 T-Spin Tetris!`.

# 8. 결정이 필요한 사항

| 항목 | 옵션 | 자비스 권장 |
|---|---|---|
| B2B 도입 | 도입 / 미도입 | **도입** (정통 정렬) |
| TST kick 격상 | 적용 / 미적용 | **적용** (가이드라인 표준) |
| 토스트 카피 톤 | 한글 / 영문 | **한글** (본체 UI 한국어) |
| 스프린트 적용 | 적용 / 미적용 | **미적용** (시간 모드) |

# 9. 작업 순서

9.1. 본 기획서 결정 사항 사용자 승인.
9.2. 상태 추가 (`lastMoveWasRotation` / `lastKickIndex` / `b2bChain`) + 갱신 시점 정확히 박기.
9.3. `tryRotate` 마지막 부분에서 사용 kick 인덱스 기록.
9.4. T-spin 감지 함수 (`detectTSpin`) 구현 - `lockPiece` 직전 호출.
9.5. 점수표 적용 분기.
9.6. 토스트 카피 + 발동 시점 연결.
9.7. (B2B 도입 시) 체인 갱신 + ×1.5 보너스.
9.8. (스프린트 미적용 시) 모드 가드.
9.9. 실기 검증.

# 10. 참고

10.1. [Tetris Wiki - T-Spin](https://tetris.wiki/T-Spin) - Guideline 표준 정의.
10.2. SRS kick table은 본 게임 코드 `KICK_JLSTZ` 그대로. T 피스도 동일 table 사용.
