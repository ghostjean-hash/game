# 02 데이터 (Rush Hour)

매직 넘버는 코드에 0개다. 모든 수치 / 색상 / 퍼즐은 아래 정의 파일에서만 가져온다.

## 1. 상수 - `src/data/constants.js`

| 이름 | 값 | 의미 |
|---|---|---|
| `BOARD_SIZE` | 6 | 보드 한 변의 칸 수 |
| `EXIT_ROW` | 2 | 빨간 차가 탈출하는 행(0부터) |
| `TARGET_ID` | `"X"` | 빨간 차(target) 식별자 |
| `CAR_MIN_LEN` | 2 | 승용차 길이 |
| `CAR_MAX_LEN` | 3 | 트럭 길이 |
| `ORIENT` | `{H:"h", V:"v"}` | 방향 enum |
| `STORAGE_NS` | `"rushhour"` | localStorage 네임스페이스(shared/storage.js) |
| `DRAG_SNAP_RATIO` | 0.5 | 드래그 스냅 임계(셀 절반 넘으면 다음 칸) |

## 2. 색상 - `src/data/colors.js`

게임 플레이의 일부인 차 색상. UI 색(배경 / 바 / 텍스트)은 `shared/tokens.css` 토큰을 쓴다.

| 이름 | 의미 |
|---|---|
| `TARGET_COLOR` | 빨간 차 색(고정, 강조) |
| `CAR_PALETTE` | 일반 차 색 배열(id 순서로 순환 배정) |

출구 표시 색은 게임 데이터가 아닌 UI 표시라 `shared/tokens.css`의 `--danger`를 쓴다(style.css).

## 3. 퍼즐 - `src/data/puzzles.js`

### 3.1. 차 표기

차 하나 = `{ id, row, col, len, orient }`.
- `id`: 문자열 식별자. 빨간 차는 `"X"`(= `TARGET_ID`), 나머지는 임의 고유 문자.
- `row`, `col`: 차의 좌상단(가장 위 / 가장 왼쪽) 칸 좌표.
- `len`: 2 또는 3.
- `orient`: `"h"`(가로) 또는 `"v"`(세로).

### 3.2. 퍼즐 표기

퍼즐 하나 = `{ id, difficulty, cars }`.
- `id`: 퍼즐 번호(1부터).
- `difficulty`: `"beginner" | "easy" | "medium" | "hard"`.
- `cars`: 차 배열. 정확히 하나의 `"X"` 차를 포함, 그 차는 `row == EXIT_ROW`, `orient == "h"`.

### 3.3. 최소 이동수

퍼즐 데이터에 최소 이동수를 하드코딩하지 않는다. `src/core/solver.js`의 BFS 솔버가 런타임에 계산하고, 테스트(`tests/`)가 모든 퍼즐이 풀 수 있는지 + 최소 수를 검증한다.

### 3.4. 유효성 규칙(테스트가 강제)

- 모든 차는 보드 안에 있다(좌표 + 길이가 6 이내).
- 차끼리 겹치지 않는다.
- 정확히 하나의 `"X"` 차가 있고 출구 행 / 가로 / 길이 2다.
- 모든 퍼즐은 솔버로 풀 수 있다(해가 존재한다).

## 4. 저장 스키마 - localStorage

`shared/storage.js`의 `createStorage("rushhour")`를 쓴다. 실제 키는 `gg.rushhour.<키>`로 자동 네임스페이싱된다.

| 키 | 값 | 의미 |
|---|---|---|
| `progress` | `{ cleared: number[], best: {[puzzleId]: number} }` | 클리어한 퍼즐 id 목록 + 퍼즐별 최고(최소 사용 수) |
| `current` | `number` | 마지막으로 보던 퍼즐 id |
