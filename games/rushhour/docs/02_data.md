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
| `COMBO_GOLD_STEP` | 5 | 연속 콤보 보너스 1단계 골드(§6.7) |
| `COMBO_MAX` | 5 | 콤보 보너스 상한(이 이상은 같은 보너스) |

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

골드로 구매(해금)하고 장착한다. 토끼 스킨 보유/장착은 `progress.ownedSkins` / `progress.equippedSkin`, 보드 테마는 `progress.ownedThemes` / `progress.equippedTheme`, 토끼 액세서리는 `progress.ownedAccessories` / `progress.equippedAccessory`에 저장(§4). 주인공은 단일 PNG(`target.png`)라 반영 방식이 다음과 같이 나뉜다: 스킨 색은 `render.setTargetColor`가 기본 핑크(`TARGET_COLOR`) 대비 CSS `filter`(색조 회전 + 채도/밝기)로 이미지 자체를 물들이고(색상별 이미지 자산 없이 동작), 보드 테마 색은 `.rushhour` 스코프 `--rh-*` 변수(04 §3.2)를 main이 인라인으로 덮어써 적용하며, 액세서리는 `render.setTargetAccessory`가 주인공 블록 정수리에 `acc`→이모지 오버레이(`.pony-acc`)를 올린다. 시간 경과·클리어 표정(`render.updateTargetFace`)도 몸통 애니(`.face-worried`/`.face-cry`/`.face-happy`, 울상은 눈물 이모지 `.pony-tear`)로 표현하며 스킨 색 filter와 CSS 속성이 달라 공존한다.

### 2.4. 블록 이미지 스타일 - `src/data/styles.js`

차 블록을 어떤 그림으로 그릴지 정하는 스타일 세트(`PONY_STYLES`). 설정 화면에서 전환하고, 선택값은 `progress.ponyStyle`에 저장한다(없으면 `DEFAULT_STYLE='a'`). 이미지는 `assets/ponies/`에 둔다.

스타일마다 블록을 그리는 방식이 `tiled` 값으로 나뉜다.

| 방식 | 스타일 | 의미 |
|---|---|---|
| `tiled: false` (통 블록) | 포니(`a`) | 크기별 단일 이미지(`a_h2` / `a_v3` 등)를 블록에 꽉 채운다. 한 마리가 블록 크기대로 늘어난 모양 |
| `tiled: true` (1칸 조립) | 밥풀이(`c`) | 1칸 정사각 캐릭터를 블록 길이만큼 반복 배치한다. 2칸=2마리, 3칸=3마리. 표정 그리드 방식(`faceSheet`)으로 그린다(아래) |

조립용 스프라이트가 없으면 통 블록 이미지(`${스타일}_${방향}${길이}` → 그마저 없으면 `a_...`)로 폴백해 화면이 깨지지 않는다. 주인공(target)은 방식과 무관하게 항상 통(`target.png`) - 유일한 개체라 반복하지 않는다. 렌더는 `render.js`의 `fillCar`가 담당하고, 반복 배치는 `.car`를 flex로 두어 가로 블록은 가로로, 세로 블록은 세로로 셀을 나열한다(style.css `.pony-cell`).

조립 스타일은 표정 그리드 방식(`faceSheet`)으로 그린다(밥풀이 `c`). `faceSheet`(`_a`) 한 장에 표정들을 `faceGrid`×`faceGrid` 칸으로 담고(총 `faceCount`개), 셀마다 표정 하나를 위치 기반으로 골라 **단일 이미지로 그린다(몸 애니 없음)**. 각 칸의 발밑(최하단 불투명 픽셀)과 좌우 폭 중심을 canvas로 측정해, 발밑은 공통 기준선에·좌우는 칸 중앙에 맞춰 캐릭터가 흔들리지 않게 정렬한다(`render.js` `measureFeet`, style.css `.pony-frame`의 `--fx`/`--fy` 보정). 표정 타이머(`render.js` `startFaceCycle`, 간격 `faceCycleMs` 기본 700ms)에서 **표정(어떤 컷인지)은 블록(차) 단위로 통일**하고(같은 차의 칸은 늘 같은 표정, 표정 변경도 그 차 전체가 함께), **눈 깜빡이는 타이밍만 셀마다 독립**이다(`blinkFace` 눈감은 컷을 셀별로 잠깐 보였다 제 표정으로 복귀). **몸은 가만히 있고 표정만 살아 움직인다**(보드를 다시 그릴 때 이전 타이머 정리). 클리어 순간에는 `setBoardMood('happy')`로 모든 셀이 `happyFaces` 컷(웃음·윙크 등), 시간이 임박하면(주인공 울상 단계) `setBoardMood('sad')`로 `sadFaces` 컷(울음·찡그림·화남)으로 전환되고, 감정이 걸린 동안은 순환·깜빡을 멈춰 표정을 또렷이 유지한다. 렌더는 `appendFaceCell`, 표정 크롭·보정은 `.pony-frame`(시트를 `faceGrid`배로 키워 표정 칸만 창에 보이게 이동). 눌림 자세 시트(`_b`)와 움찔은 산만하다는 판단으로 제거했다.

## 3. 퍼즐 - `src/data/puzzles.js` (+ 모드)

게임은 두 모드로 나뉜다(`main.js` `MODES`). **오리지널**(`src/data/puzzles.js`, 자체 제작 186개)과 **보드게임**(`src/data/puzzles-boardgame.js`, ThinkFun Rush Hour 세트). 퍼즐 데이터 형식·유효성 규칙(§3.1~3.4)은 완전히 동일하다. 진행(클리어/최고 수/별/현재 퍼즐/콤보)은 모드별로 각각 저장하고(§4), 골드·스킨·테마·장식·설정은 두 모드가 공유한다.

현재 모드는 보드 좌상단 배지(`#stage-mode`)로 화면에 늘 표시된다. 모드는 **진행 맵(🗺) 안의 탭**으로 고른다(상단바에서 즉시 전환하지 않는다). 맵을 열면 현재 모드 탭이 선택돼 있고, 다른 모드 탭을 누르면 그 모드의 진행을 미리 볼 수 있다(`mapViewMode`). 실제 전환은 그 모드의 퍼즐을 고를 때 확정된다(`mapViewMode` → `activeMode`). 모든 팝업(상점/맵/설정/결과)은 라이트 테마다(style.css `.rushhour .modal`에서 색 토큰을 밝은 값으로 재정의 → 내부 요소가 상속).

> 보드게임 세트는 현재 **임시 6개**다(2모드 구조 검증용, solver로 풀림 확인). 실제 ThinkFun 40개 카드 배치가 확정되면 `puzzles-boardgame.js` 배열을 교체한다(형식 동일).

### 3.0. 오리지널 세트 (`puzzles.js`)

내장 퍼즐 186개. 난이도를 두 축(최소 수 + 얽힘=최적해에서 움직이는 서로 다른 차 수)으로 잰다. 한 배치의 도달 가능한 모든 상태를 모으고 "풀린 상태 전부"에서 멀티소스 BFS로 각 상태의 정확한 최소 수를 구한다(풀림 = 토끼만 출구, 다른 차 위치 무관이라 풀린 상태가 여럿). 곡선: 입문 1~21(1~4수) / 쉬움 22~81(5~8) / 보통 82~170(9~12) / 도전 171~186(13~16). 보통(중간 난이도)을 두텁게 89개로 두고, 후반은 "막는 차 2대 이상 + 서로 다른 차 4대 이상 움직임"을 강제해 "차 하나만 비키면 끝"인 1차원 자명 퍼즐을 배제한다. 1번은 막는 차 없는 튜토리얼. (6x6에서 13수 이상은 희귀해 도전은 16개.) 각 난이도 구간 내부는 솔버로 측정한 체감점수(최소 수 + 막는 차 수 + 되돌림=빨강 외 이동 횟수) 오름차순으로 정렬해, 같은 난이도 안에서 직전보다 갑자기 쉬워지는 지점을 없앤다(2026-06-30 재정렬: 하락 지점 33→1곳). 진행 순서는 배열 순서 그대로라, 인접 퍼즐이 서로 너무 비슷하면 "같은 게 연달아 나온다"는 인상을 준다. 그래서 형태 유사도(각 칸을 빈칸/주인공/가로차/세로차로 정규화한 뒤 같은 위치 같은 종류 비율)가 0.86 이상인 인접 쌍은 배제한다. 초기 세트에 28쌍이 있어, 각 쌍의 뒤쪽을 솔버로 새로 생성·검증한 퍼즐(같은 난이도 구간 + 기존 어떤 퍼즐과도 유사도 0.80 미만)로 교체했다(2026-07-01, 총 186개 유지, 인접 유사 0쌍).

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
| `progress` | `{ gold, ownedSkins, equippedSkin, ownedThemes, equippedTheme, ownedAccessories, equippedAccessory, ponyStyle, blockOpts, muted, activeMode, modes }` | **공유 필드**(골드·보유/장착 스킨·테마·장식·캐릭터 스타일·배경테두리 옵션·음소거) + 활성 모드(`activeMode`) + 모드별 진행(`modes`) |
| `progress.modes[모드]` | `{ cleared, best, stars, current, combo, bestCombo }` | 모드(`original`/`boardgame`)별 진행: 클리어 퍼즐 + 퍼즐별 최고 수 + 퍼즐별 최고 별 + 마지막 본 퍼즐 + 현재 연속 콤보 + 최고 콤보 |
| `current` (레거시) | `number` | 옛 단일 구조의 "마지막 본 퍼즐" 키. 지금은 안 쓰고, 옛 저장 데이터를 `modes.original.current`로 이관할 때만 읽는다(`migrateProgress`). |

옛 단일 구조(최상위 `cleared`/`best`/`stars`)로 저장된 데이터는 `main.js`의 `migrateProgress`가 읽는 즉시 현재 스키마로 정규화하고, 옛 진행을 `modes.original`로 이관한다(기존 사용자 진행 보존).
