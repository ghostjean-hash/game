# Rush Hour 진행 로그

## 2026-06-26 초기 셋업 (html-game v0.2)

- 게임 컨셉 확정: 표준 러시아워(6x6 슬라이딩 블록 퍼즐), 표준 기능 + 내장 고정 퍼즐 세트.
- docs 4종 작성(spec / data / architecture / conventions). 문서 우선 워크플로우.
- core 분리: `board.js`(순수 로직, 이동 범위 / 이동 / 클리어 / 격자 / 격자 파서), `solver.js`(BFS 최단 해).
- 렌더는 DOM 기반(`render.js`), 입력은 Pointer Events 드래그(`drag.js`). 칸 좌표 → CSS 변수 배치.
- 퍼즐 세트: 무작위 생성 + BFS 솔버 난이도(최소 수) 필터로 곡선 설계. 최소 수는 하드코딩하지 않고 런타임 계산.
- 테스트(`tests/`): core 로직 + 모든 내장 퍼즐 유효성 / 풀이 가능 / 최소 수 ≥ 1 전수 검증.
- 허브 일관성: shared/tokens.css·base.css·storage.js 재사용, `_registry.json` 등록.

### 결정 메모
- 출구 표시 색은 게임 데이터가 아닌 UI라 토큰 `--danger` 사용(colors.js에는 차 색만).
- 1수 = 차 한 대를 한 방향으로 한 번 미는 것(칸 수 무관). 러시아워 표준 카운팅.
- 입문 앞부분에 2~3수짜리 단순 퍼즐을 두어 조작을 익히게 함.
