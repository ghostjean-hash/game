# 04. 컨벤션

## 1. 네이밍

| 항목 | 규칙 | 예 |
|---|---|---|
| 변수 / 함수 | camelCase | `drawNumber`, `calculateLuck` |
| 상수 | SCREAMING_SNAKE | `NUMBER_MIN`, `PICK_COUNT` |
| 클래스 | PascalCase | `CharacterCard` |
| 파일 | kebab-case | `recommend-engine.js` |
| 디렉토리 | kebab-case 또는 단일 단어 | `core/`, `render/` |
| CSS 변수 | kebab-case 전체 소문자 | `--color-bg` |
| CSS 클래스 | kebab-case | `.card-container` |
| localStorage 키 | snake_case + 게임명 prefix | `lotto_draws` |

1.1. 캐릭터 클래스 ID 등 게임 데이터 식별자는 camelCase (`blessed`, `secondStar`). 02_data.md 1.5 참조.

## 2. 주석

2.1. 한국어 주석. 영어 식별자 + 한국어 주석 혼용 OK.
2.2. 짧게. 한 줄 권장. 2줄 초과 시 docs로 이동.
2.3. 함수 본문 안에 단계별 주석 금지. 코드가 명확하면 주석 불필요.
2.4. 함수 헤더 주석은 비자명한 동작 / 부작용 / 결정론성 등 컨텍스트만.
2.5. `TODO` / `FIXME` 사용 시 PROGRESS.md 5장 미해결 항목에 한 줄 추가.
2.6. `// SSOT: docs/02_data.md 1.2` 형태로 docs 참조 표기 권장.

## 3. 테스트

3.1. `tests/test.html`을 열면 모든 테스트 자동 실행.
3.2. `core/` 모든 모듈은 테스트 작성 필수. `render/` `input/` `data/`는 선택.
3.3. 테스트 파일 위치: `tests/suites/<module-name>.test.js`.
3.4. 등록: `tests/runner.js` 하단의 `// register suites here` 영역에 `import './suites/<module-name>.test.js';` 추가.
3.5. 핵심 로직 변경(시드 해시, 추첨 절차, 매칭 룰 등) 시 테스트 코드를 같은 변경 단위에서 갱신 (CLAUDE.md 2장 워크플로우).
3.6. 테스트는 결정론적이어야 함. `Math.random()` 직접 사용 금지. 시드 기반 PRNG는 `core/`에 정의.

## 4. 접근성 (M6 폴리싱)

4.1. 색만으로 정보 전달 금지. 운세 / 등수 / 적중 표시는 아이콘 / 텍스트 보조.
4.2. 인터랙티브 요소는 키보드 조작 가능. 포커스 가시성 유지(`:focus-visible`).
4.3. 모달은 `role="dialog" aria-modal="true"`. ESC로 닫기, Enter로 확인.
4.4. 아이콘만 있는 버튼은 `aria-label` 필수.
4.5. 동적 영역은 `aria-live="polite"` (메인 #app 등).
4.6. 모션은 `prefers-reduced-motion: reduce` 미디어쿼리 시 0.01ms로 제거.
4.7. 스킵 링크 (본문으로 건너뛰기) 제공.

### 4.8. 모바일 표준 (S068, 2026-05-10)

4.8.1. **터치 hit area 최소 44x44** - `--touch-min` 토큰. `button` / `[role="button"]` / `.strategy` / `.slot` 글로벌 base에 `min-height: var(--touch-min)` 적용. 컴포넌트별 더 큰 값(`.tab-item` 52, `.preset-slot` 64)은 base 위 override.
4.8.2. **`:hover` 룰은 모두 `@media (hover: hover) and (pointer: fine)` 가드 안에 둘 것**. 모바일 sticky hover(탭 후 hover 잔존)로 인한 시각 혼동 차단.
4.8.3. **`touch-action: manipulation`** - 인터랙티브 요소(`button` / `[data-action]` 등) 글로벌 base. 모바일 더블탭 줌 차단 + 즉시 click 발화 (300ms 지연 제거).
4.8.4. **`-webkit-tap-highlight-color: transparent`** - `html, body` 글로벌. 모바일 크롬 회색 깜빡임 차단.
4.8.5. **`viewport-fit=cover` + `env(safe-area-inset-*)`** - notch / 둥근 모서리 영역 대응. `#app` / `.bottom-tabs` / 모달에 적용 (이미 적용됨).
4.8.6. **`font-display: swap`** - Google Fonts URL에 명시 (이미 적용됨). 첫 진입 글자 변동 차단.
4.8.7. **`position: fixed; bottom: 0` 요소는 visualViewport API 동기 + GPU layer 분리 의무** (S088, 2026-05-17). 크롬 모바일 하단 메뉴 슬라이딩과 layout viewport 갭으로 jerky / 한 박자 lag 발생. 두 정책 동시 적용:
   - JS: `src/render/viewport-sync.js`의 visualViewport resize/scroll 후크 → `translateY` 보정.
   - CSS: 대상 요소에 `will-change: transform; transform: translateZ(0)`.
   - 신규 fixed bottom 요소(예: 토스트 / 액션 시트 / 휠링 푸터) 추가 시 동일 패턴 답습.
4.8.8. 새 인터랙티브 요소 추가 시 본 8.x 룰 자동 적용 검증. `:hover` 룰 추가하면 반드시 `@media (hover: hover)` 가드 동반.

## 5. 디자인 토큰 사용 규칙

4.1. **UI 영역**(메뉴 / HUD / 배경 / 폰트 / 간격 / radius / z-index): `styles/tokens.css` CSS 변수만 사용.
4.2. **게임 데이터 영역**(운세 등급 / 카드 / 적중 등수): `src/data/colors.js` 상수만 사용.
4.3. 두 영역 혼용 금지. UI 변경이 게임 데이터를 건드리면 안 됨. 그 반대도 마찬가지.
4.4. 인라인 매직 값 금지. 예시:

```css
/* 금지 */
.card { color: #fff; padding: 16px; }

/* 권장 */
.card { color: var(--color-text); padding: var(--space-4); }
```

```js
// 금지
const limit = 100;

// 권장 (docs/02_data.md 1.2에서 export)
import { LUCK_MAX } from '../data/numbers.js';
const limit = LUCK_MAX;
```

4.5. 새 토큰 / 상수가 필요하면 정의 위치(`tokens.css` 또는 `02_data.md`)에 먼저 추가 후 사용.

## 6. import 규칙

5.1. 상대 경로 + `.js` 확장자 명시.

```js
// 권장
import { recommend } from './core/recommend.js';

// 금지 (확장자 누락)
import { recommend } from './core/recommend';
```

5.2. 외부 라이브러리는 esm.sh / jsdelivr CDN의 ESM 빌드만. URL 그대로.

```js
import { foo } from 'https://esm.sh/some-lib@1.0.0';
```

5.3. `core/`는 다음을 import 금지:
- DOM 객체 (`document`, `window`, `navigator`, ...)
- Canvas API
- DOM 이벤트
- `localStorage` (반드시 `data/`를 경유)

5.4. `main.js`만 모든 모듈을 import해 wire-up.

5.5. 순환 의존 금지. 같은 레이어 내 import도 최소화 (`core/` 안에서 다른 `core/` 모듈 import는 OK, 단방향 보장).

## 7. 커밋 메시지

6.1. 형식: `<type>(<scope>): <subject>`. 다른 게임(sudoku / tetris)과 동일.
- 예: `feat(lotto): 캐릭터 시드 해시 구현`
- 예: `docs(lotto): 02_data 비율 필터 수치 정정`
- 예: `chore(lotto): .gitkeep 추가`

6.2. type: `feat` / `fix` / `docs` / `chore` / `refactor` / `test`.
6.3. PROGRESS.md 6장 커밋 히스토리 표에 한 줄 추가.

## 8. 아이콘 / 글리프

8.1. **텍스트 글리프 금지.** UI에서 `>`, `<`, `+`, `×`, `↻`, `▾`, `‹`, `›` 등 아이콘 의도의 텍스트 문자 사용 금지. 키보드/이모지 한자도 동일.
8.2. 모든 UI 아이콘은 `src/render/icons.js`의 SVG 헬퍼로만 출력.
8.3. 색은 SVG 내부에 하드코딩하지 않고 `currentColor`로 위임. 부모 요소의 `color`로 제어.
8.4. 크기는 호출처 클래스(`.icon` / `.icon-sm` / `.icon-lg`)로 결정. SVG 자체에 width/height 인라인 금지.
8.5. 의미 있는 아이콘 단독 버튼은 `aria-label` 필수, 장식용 아이콘은 `aria-hidden="true"` (헬퍼가 자동 부여).
8.6. 새 아이콘이 필요하면 `icons.js`에 export 함수로 추가 후 사용.
8.7. 적용 대상: 회차 nav (이전 / 다음), 캐릭터 슬롯 (추가 / 삭제), 통계 갱신, 전략 caret, 본번호-보너스 분리자(+) 등.

## 9. 자비스 작업 룰 (Sprint 077~087 결손 패턴 룰화, 2026-05-17)

본 세션에서 12건 결손 누적 → 룰화. 같은 패턴 회귀 차단.

### 9.1. 시각 정합 (점/원/도형)

9.1.1. 작은 원형 요소(`.num-source-dot` / `.preset-strategy-dot` 등)는 다음 강제 룰 일괄:
- `display: block` (inline-block sub-pixel 차단)
- `box-sizing: border-box`
- `aspect-ratio: 1 / 1` (정사각 → 정원 보장)
- 짝수 px 크기 (`8px` / `10px`, 홀수 회피로 device pixel 라운딩 차단)
- `min/max-width/height` + `flex: 0 0 N` 강제
- 부모 컨테이너 `line-height: 0` + `font-size: 0` (inline baseline 영향 차단)

9.1.2. 사용자 "크기가 다르다" 보고 시 = sub-pixel 영향 우선 의심. CSS 자체 width/height만으로는 부족.

### 9.2. 데이터 상수 변경

9.2.1. `STRATEGIES.label` / `DEFAULT_PRESETS.label` 등 사용자 노출 상수 변경 시 **하드코딩 사용처 전수 grep 의무**.
- 예: confirm 텍스트 / docs / SSOT 문서 / 다른 UI 컴포넌트

9.2.2. `STRATEGIES.short` 같은 시각 라벨은 `label[0]` 정합 단언 회귀 테스트 작성 (Sprint 074 패턴).

### 9.3. 행/카드 우측 액션 영역

9.3.1. 행에 새 버튼/아이콘 추가 시 기존 `absolute` 포지셔닝 요소 전수 grep 의무.
- 예: `.char-row` 우측 = 휴지통(44) + 편집(44) + 활성 배지(right: 56) 충돌 → 배지 폐기

9.3.2. flex 행 우측 액션 영역은 absolute 폐기, 행 자체 flex item으로 처리 권장.

### 9.4. 데이터 편집 기능

9.4.1. 편집 기능 신설 시 데이터 schema 점검 의무. 편집 필드가 모두 character/preset 객체에 보존되어야 prefill 가능.

9.4.2. 옛 데이터 마이그레이션 경로 명시 의무:
- 신규부터 보존 (옛 데이터는 빈값 + 안내 카피)
- 또는 자동 마이그레이션 함수
- 또는 사용자 1회 재입력으로 이후 정합

### 9.5. 사용자 명시 해석

9.5.1. 사용자 명시 해석이 두 가지 이상 가능하면 **AskUserQuestion 의무**. 자비스 단독 추정 패턴 = 결손 누적 원인 1위.

9.5.2. AskUserQuestion 질문 패턴:
- 자비스 추정 답을 첫 옵션으로 제시
- "Other" 옵션은 자동 부여라 명시 안 함
- 4건 이하 옵션

### 9.6. 라벨/카테고리 분포 단언

9.6.1. 라벨 매핑 / 카테고리 분포 관련 변경 시 회귀 테스트 = **"각 카테고리 라벨이 N회 시뮬 중 최소 1건 이상 등장" 단언 의무** (Sprint 072/073 패턴).

9.6.2. 옛 패턴(`assertTrue(sids.includes(src))`) = "묶음 안 ID이기만 하면 OK" = 분포 결손 못 잡음.

### 9.7. 시각 매핑 상수 변경

9.7.1. `FORTUNE_GLYPH` / `STRATEGY_TAG_COLORS` 등 시각 매핑 상수 변경 시 다른 시각 요소(caret / icon / glyph)와 충돌 점검 의무.
- 예: 흉 글리프 ▼ vs caret ▼/▲ = 같은 모양 충돌 → 흉 ✕ 변경

9.7.2. 색 변경 시 카테고리 hue 보존 default. hue 변경은 사용자 명시 요청 시만.

### 9.8. CSS cascade 미디어 쿼리

9.8.1. `#app` / `.bottom-tabs` / `.tab-item` 등 글로벌 레이아웃 토큰 변경 시 미디어 쿼리 boundary 전수 grep + **각 구간 계산값 표 산출 의무** (Sprint 069/071 패턴).

9.8.2. 단위 테스트(node tests/run-node.js)는 CSS cascade 회귀 못 잡음. CSS-only 변경은 수동 시각 점검 추가.
