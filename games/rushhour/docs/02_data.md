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
| `DRAG_TAP_RATIO` | 0.2 | 탭 판정 임계(포인터 이동이 셀의 이 비율 미만이면 탭=누른 쪽 한 칸) |
| `CLEAR_EXIT_MS` | 700 | 클리어 시 토끼가 출구 길로 빠져나가는 애니메이션 길이(ms) |
| `CONFETTI_COUNT` | 16 | 클리어 축하 파티클(별·하트) 개수 |
| `TIME_BASE_S` | 60 | 제한시간 기본(초) |
| `TIME_PER_OPTIMAL_S` | 20 | 제한시간 = 최소 수 × 이 값 + 기본(초) |
| `FACE_WORRIED_RATIO` | 0.5 | 경과/제한 비율 이 이상이면 토끼 어두운 표정 |
| `FACE_CRY_RATIO` | 0.85 | 경과/제한 비율 이 이상이면 토끼 울상 |
| `STAR2_MARGIN` | 3 | 최소 수 + 이 값 이내면 별 2개 |
| `GOLD_BASE` | 10 | 클리어 기본 골드 |
| `GOLD_STAR3` / `GOLD_STAR2` | 20 / 10 | 별 3개 / 2개 골드 보너스 |
| `GOLD_TIME_BONUS` | 10 | 제한시간 내 클리어 골드 보너스 |
| `HINT_COST` | 5 | 힌트 1회 골드 비용(§7.6 힌트) |

## 2. 색상 / 캐릭터

차의 시각 표현은 색(`src/data/colors.js`)과 동물 종류·표정(`src/data/characters.js`)으로 나뉜다. 둘을 `render.js`가 블록 크기·위치로 조합해 캐릭터를 그린다. UI 색(배경 / 바 / 텍스트)은 `shared/tokens.css` 토큰을 쓴다.

### 2.1. 색 - `src/data/colors.js`

| 이름 | 의미 |
|---|---|
| `TARGET_COLOR` | 주인공 토끼 색(파스텔 핑크, 고정) |
| `KIND_COLORS` | 동물 종류별 파스텔 색 후보 배열(`{cat:[...], dog:[...], chick:[...], penguin:[...]}`). 같은 종류라도 블록 위치에 따라 다른 색을 고른다 |

### 2.2. 캐릭터 종류·표정 - `src/data/characters.js`

차를 동물 친구로 그리기 위한 정의. 색은 갖지 않는다(`data/`끼리 import하지 않는 규칙).

| 이름 | 의미 |
|---|---|
| `TARGET_KIND` | 주인공 동물 종류(`"rabbit"`, 고정) |
| `KIND_BY_SHAPE` | 블록 크기 → 동물. 키는 방향+길이(`{h2:"cat", h3:"dog", v2:"chick", v3:"penguin"}`) |
| `FACES` | 표정 종류 배열(`"normal"`, `"happy"`, `"wink"`, `"surprised"`) |
| `ACCESSORIES` | 액세서리 종류 배열(`"none"` 다수 + `"ribbon"`, `"bowtie"`, `"flower"`). 일부 블록만 부착 |

블록 크기 키는 `${orient}${len}`(예: 가로 길이2 = `h2`). 같은 동물이 여럿 나와도 색·표정·액세서리를 블록 위치(row·col) 기반으로 정해 다양하게 보인다. 얼굴·귀·표정·액세서리 그리기 좌표는 `render.js`의 SVG 마크업에 둔다(viewBox 0~100 정규화 디자인 상수, docs/04 §3.4).

출구 표시(토끼의 집)는 게임 데이터가 아닌 UI 표시라 `shared/tokens.css` 토큰을 쓴다(style.css).

### 2.3. 상점 품목 - `src/data/shop.js`

| 이름 | 의미 |
|---|---|
| `RABBIT_SKINS` | 주인공 토끼 색 스킨 배열(`{id, name, color, price}`). 첫 항목 price 0 = 기본 |
| `DEFAULT_SKIN` | 기본 스킨 id(`"pink"`). 처음부터 보유·장착 |
| `BOARD_THEMES` | 보드 테마 배열(`{id, name, price, board, line, exit}`). 바닥/격자선/출구 길 색 세트. 첫 항목 price 0 = 기본 |
| `DEFAULT_THEME` | 기본 테마 id(`"cream"`). 처음부터 보유·장착 |
| `ACCESSORY_ITEMS` | 토끼 액세서리 배열(`{id, name, price, acc, emoji}`). `acc`는 render가 그리는 장식 키, `emoji`는 상점 미리보기. 첫 항목(`acc:"none"`) price 0 = 기본(없음) |
| `DEFAULT_ACCESSORY` | 기본 액세서리 id(`"none"`). 처음부터 보유·장착 |

골드로 구매(해금)하고 장착한다. 토끼 스킨 보유/장착은 `progress.ownedSkins` / `progress.equippedSkin`, 보드 테마는 `progress.ownedThemes` / `progress.equippedTheme`, 토끼 액세서리는 `progress.ownedAccessories` / `progress.equippedAccessory`에 저장(§4). 보드 테마 색은 `.rushhour` 스코프 `--rh-*` 변수(04 §3.2)를 main이 인라인으로 덮어써 적용하고, 액세서리는 render가 토끼 얼굴 SVG에 그린다.

## 3. 퍼즐 - `src/data/puzzles.js`

내장 퍼즐 186개. 난이도를 두 축(최소 수 + 얽힘=최적해에서 움직이는 서로 다른 차 수)으로 잰다. 한 배치의 도달 가능한 모든 상태를 모으고 "풀린 상태 전부"에서 멀티소스 BFS로 각 상태의 정확한 최소 수를 구한다(풀림 = 토끼만 출구, 다른 차 위치 무관이라 풀린 상태가 여럿). 곡선: 입문 1~21(1~4수) / 쉬움 22~81(5~8) / 보통 82~170(9~12) / 도전 171~186(13~16). 보통(중간 난이도)을 두텁게 89개로 두고, 후반은 "막는 차 2대 이상 + 서로 다른 차 4대 이상 움직임"을 강제해 "차 하나만 비키면 끝"인 1차원 자명 퍼즐을 배제한다. 1번은 막는 차 없는 튜토리얼. (6x6에서 13수 이상은 희귀해 도전은 16개.)

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

퍼즐 데이터에 최소 이동수를 하드코딩하지 않는다. `src/core/solver.js`의 BFS 솔버가 런타임에 계산하고, 테스트(`tests/`)가 모든 퍼즐이 풀 수 있는지 + 최소 수를 검증한다. 같은 솔버가 힌트용 "최적의 다음 한 수"(`solveStep`)도 제공한다(§7.6 힌트).

### 3.4. 유효성 규칙(테스트가 강제)

- 모든 차는 보드 안에 있다(좌표 + 길이가 6 이내).
- 차끼리 겹치지 않는다.
- 정확히 하나의 `"X"` 차가 있고 출구 행 / 가로 / 길이 2다.
- 모든 퍼즐은 솔버로 풀 수 있다(해가 존재한다).

## 4. 저장 스키마 - localStorage

`shared/storage.js`의 `createStorage("rushhour")`를 쓴다. 실제 키는 `gg.rushhour.<키>`로 자동 네임스페이싱된다.

| 키 | 값 | 의미 |
|---|---|---|
| `progress` | `{ cleared, best, gold, stars, ownedSkins, equippedSkin, ownedThemes, equippedTheme, ownedAccessories, equippedAccessory, muted }` | 클리어 퍼즐 + 퍼즐별 최고 수 + 누적 골드 + 퍼즐별 최고 별 + 보유/장착 스킨 + 보유/장착 보드 테마 + 보유/장착 액세서리 + 음소거 여부 |
| `current` | `number` | 마지막으로 보던 퍼즐 id |
