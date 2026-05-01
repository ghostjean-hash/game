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
