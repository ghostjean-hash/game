# 02. 게임 데이터 (data)

> 모든 수치 / 게임용 색상 / 퍼즐 / 저장 스키마의 SSOT. 코드의 매직 넘버는 0개여야 한다.

## 1. 상수 (`src/data/constants.js`)

| 이름 | 값 | 의미 |
|---|---|---|
| `SIZES` | `{ SMALL: 5, MEDIUM: 10, LARGE: 15 }` | 지원 격자 크기(정사각) |
| `CELL` | `{ EMPTY: 0, FILLED: 1, MARKED: 2 }` | 플레이 중 셀 상태(비움/칠함/X) |
| `STAR_THRESHOLDS` | `{ THREE: 0, TWO: 2 }` | 실수 ≤0 → 별3, ≤2 → 별2, 그 외 별1 |
| `MAX_STARS` | `3` | 별점 상한 |
| `TUTORIAL_COUNT` | `3` | 튜토리얼 판 수 |
| `LARGE_UNLOCK_CLEARS` | `6` | 15×15 해금에 필요한 중급 이하 클리어 수 |
| `MODE` | `{ FILL: 'fill', MARK: 'mark' }` | 입력 모드 |
| `CELL_FIT` | `{ MIN_PX: 18, GUTTER_PX: 8, MAX: {5:92,10:60,15:44}, DEFAULT_MAX: 60, RIGHT_MARGIN_RATIO: 1/3 }` | 격자를 화면에 맞출 때 쓰는 셀 크기(px) 한계 + 가로 방향 보드 우측 여백 비율 |

- 별점 계산: `mistakes <= STAR_THRESHOLDS.THREE ? 3 : mistakes <= STAR_THRESHOLDS.TWO ? 2 : 1`.
- 셀 크기(px)는 CSS 변수 `--cell` 한 곳에서 파생. 플레이 화면은 세로로 스크롤되지 않고 한 화면에 담기므로, `main.js`의 `fitBoard`가 남은 공간(폭·높이)을 재서 `--cell`을 정한다(폭·높이 중 작은 쪽, `CELL_FIT.MIN_PX`~크기별 `MAX` 범위, 가로 방향은 MAX 무시하되 화면 폭에서 좌·우 UI 열 폭을 뺀 가용 폭을 병목에 포함 - 창 비율이 어떻든 게임 전체가 화면 안에 들어온다, STANDARD 4.7-7). `styles/tokens.css`의 `clamp` 값은 JS 미동작 시 fallback.
- 보드 우측 여백: 세로 방향은 좌측 행 힌트 폭만큼(격자 정중앙), 가로 방향은 그 `RIGHT_MARGIN_RATIO`(1/3)만 줘 우측 UI(조작·모드 버튼)를 보드에 가깝게 붙인다(2026-07-06 사용자 결정).

## 2. 색상 (`src/data/colors.js`)

게임 데이터 색만 여기. UI 색은 tokens.css.

### 2.1. 팔레트 `PALETTE`

퍼즐 셀의 정답 색을 가리키는 인덱스 → HEX. 인덱스 0은 "빈칸"(색 없음)이라 팔레트에 없다. 픽셀 아트용 파스텔 축(민트·라벤더·크림) + 포인트 핑크.

| 인덱스 | 키 | HEX | 용도 |
|---|---|---|---|
| 1 | `ink` | `#4a4658` | 윤곽/검정 대용(눈·선) |
| 2 | `cream` | `#fff3dc` | 크림/흰 |
| 3 | `mint` | `#7fded0` | 민트(기본 축) |
| 4 | `lavender` | `#b9a6f0` | 라벤더(기본 축) |
| 5 | `pink` | `#ff9ec7` | 핑크(포인트 색, 절제 사용) |
| 6 | `butter` | `#ffd97d` | 노랑/버터 |
| 7 | `sky` | `#8fd0ff` | 하늘 |
| 8 | `coral` | `#ff9e8a` | 산호/볼터치 |
| 9 | `leaf` | `#94d98a` | 잎/초록 |
| 10 | `cocoa` | `#c99a6a` | 갈색 |

### 2.2. 플레이 중 단색 `FILL_MONO`

플레이 중 칠한 칸은 색 인덱스와 무관하게 이 단색으로 보인다(흑백 단계). 클리어 시 각 칸이 정답 색으로 변신. 값: `#5b5470`(라벤더 그레이). 실제 CSS 적용은 tokens.css `--fill-mono`와 값 동기.

### 2.3. 퍼즐별 색표 `palette` (다색 이모지 지원)

`PALETTE`(§2.1)는 손그림용 10색 공용 색표다. 이모지 유래 퍼즐은 색이 다양해 10색으로 부족하므로, 퍼즐 객체가 자기 전용 색표 `palette`(인덱스→HEX)를 가진다. 렌더(`pixel.fillPicture` / `boardView.revealColors`)는 `palette`가 있으면 그것을, 없으면 전역 `PALETTE`를 쓴다(하위호환). 색 인덱스의 의미는 퍼즐마다 독립이며, `grid[r][c]`의 0=빈칸 규칙은 동일하다.

## 3. 퍼즐 데이터 (`src/data/puzzles.js`)

### 3.1. 포맷

각 퍼즐은 색 인덱스 2차원 격자 하나로 정의한다. 힌트는 코드가 자동 생성하므로 저장하지 않는다(SSOT는 그림 격자 하나).

```js
{
  id: 'star',            // 고유 id (저장 키)
  title: '별',            // 표시명(맵 썸네일·결과 화면)
  size: 5,               // SIZES 중 하나 (grid는 size×size)
  difficulty: 'tutorial',// 'tutorial' | 'easy' | 'medium' | 'hard'
  tutorialStep: 1,       // 튜토리얼일 때만(1~TUTORIAL_COUNT), 아니면 생략
  palette: { 1:'#...', },// (선택) 퍼즐 전용 색표. 없으면 전역 PALETTE(§2.3)
  grid: [                // size개 행, 각 행 size개 색 인덱스(0=빈칸)
    [0,0,6,0,0],
    ...
  ],
}
```

- `grid[r][c]`가 0이면 빈칸(칠하지 않음), 1 이상이면 칠하는 칸이며 그 값이 클리어 시 표시할 정답 색 인덱스.
- 플레이 판정용 "칠함 여부"는 `grid[r][c] !== 0`.
- 색 인덱스는 `palette`가 있으면 그것을, 없으면 전역 `PALETTE`를 참조한다(§2.3). 손그림(튜토·초급)은 `palette` 없이, 이모지 퍼즐(중급·고급)은 자기 `palette`를 가진다.

### 3.2. 유일해 + 줄 논리 검증 (내장 조건)

퍼즐을 세트에 넣으려면 아래를 테스트가 통과해야 한다(CLAUDE.md 절대 규칙).

1. **유일해**: 힌트만으로 도출되는 칠함/빈칸 배치가 정확히 1개.
2. **줄 논리로 풀림(추측 불필요)**: 행/열 힌트 제약의 반복 전파(line solving)만으로 전 칸이 확정. 추측/백트래킹 없이 풀려야 한다.
3. **난이도 자동 태깅**: 솔버가 전 칸 확정까지 돈 전파 라운드 수를 난이도 지표로 산출(참고값).

검증은 `src/core/solver.js`가 담당하고 `tests/`가 내장 전 퍼즐에 대해 전수 실행한다.

### 3.3. 내장 세트 (310종)

튜토리얼 3(5×5) + 초급 16(5×5) + 중급 142(10×10) + 고급 149(15×15). 고급은 중급까지 `LARGE_UNLOCK_CLEARS`개 클리어 시 해금. 실제 목록은 `puzzles.js` 배열이 SSOT이며, 전부 §3.2 검증 통과분만 포함한다(테스트가 전수 확인).

두 종류로 나뉜다.

1. **튜토리얼·초급(5×5) = 자체 손그림**: 하트·별·집·고양이 등. 이름과 모양이 맞는 자체 제작이라 저작권이 깨끗하고, 전역 `PALETTE` 색 인덱스를 쓴다. 5×5는 표현력이 낮아 이모지 다운샘플로는 인식이 어려워 손그림을 유지한다.
2. **중급·고급(10×10·15×15) = 이모지 픽셀 그림**: Twemoji(CC-BY 4.0, jdecked/twemoji)의 72×72 PNG를 N×N으로 다운샘플하고 색을 소수 팔레트로 양자화해 만든다. 각 퍼즐은 자기 `palette`(§2.3)를 가진다. 이름은 그 이모지의 한글 이름(고양이·케이크·해바라기 등). 생성·검증은 `scripts/build-emoji-puzzles.mjs`(다운로드→PNG 디코딩→다운샘플→색 양자화→solver 거르기) + `scripts/gen-puzzles.mjs`(손그림과 합쳐 puzzles.js 재생성)가 담당한다. 10×10에서 인식이 어려운 복잡한 것은 제외 목록으로 걸렀다.
   - **손그림 예외**: 다운샘플로 형태가 뭉개진 이모지 퍼즐은 puzzles.js에서 손그림으로 직접 교체했다(원본 palette 유지, solver 재검증 필수). 대상: 10×10 하트 11종(2026-07-05), 10×10 강아지·태양·반짝별(2026-07-06). 주의 - gen-puzzles.mjs로 재생성하면 이 손그림 교체분이 사라지므로, 재생성 시 교체분을 다시 반영해야 한다.

라이선스: 이모지 그림은 Twemoji(CC-BY 4.0) 유래이므로 게임 내 출처 표기를 유지한다(index 화면 하단). 랜덤 무늬나 번호 이름("초급 N")은 쓰지 않는다(2026-07-03, 사용자 지시로 랜덤 생성분 전면 폐기).

## 4. 저장 스키마 (`shared/storage.js`, `createStorage("nonogram")`)

localStorage 키는 래퍼가 `gg.nonogram.<key>`로 네임스페이스한다. 저장 값은 JSON.

| key | 값 | 의미 |
|---|---|---|
| `progress` | `{ [puzzleId]: { cleared: true, stars: 1..3, bestMistakes: n } }` | 퍼즐별 클리어/별점 |
| `tutorialDone` | `boolean` | 튜토리얼 3판 완료 |
| `mode` | `'fill' \| 'mark'` | 마지막 입력 모드(편의 복원) |
| `muted` | `boolean` | 사운드 음소거 여부 |
| `inprogress` | `{ [puzzleId]: { size, cells, mistakes, mistakenKeys } }` | 풀던 판 중도 저장(완성 시 해당 항목 삭제) |

- 진행 중 판(중도 저장)은 1차 범위 제외(클리어 결과만 영속). 재진입 시 빈 격자부터.
- 스키마 변경 시 이 표가 SSOT이며 마이그레이션은 이후 필요 시 추가.
