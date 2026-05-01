# game_ghost - 게임 허브

PWA 미니 게임 모음 (GitHub Pages 호스팅). 게임별 세부 컨텍스트는 각 게임의 `CLAUDE.md` / `PROGRESS.md` / `docs/` 참조.

# 1. 등록 게임

| ID | 상태 | 설명 |
|---|---|---|
| `tetris` | playable | 라인을 지워라 |
| `sudoku` | wip | 스마트 힌트로 배우는 스도쿠 (라이트 톤) |
| `lotto` | wip | Blessed Lotto - 캐릭터 시드 기반 11전략 추천 |

1.1. 게임 등록부: `games/_registry.json`. 카드 클릭으로 진입.
1.2. 새 세션이 특정 게임 작업 시 `games/<id>/CLAUDE.md` 자동 로드.

# 2. 표준 (html-game)

| 자산 | 경로 |
|---|---|
| 표준 본체 | `standards/html-game/STANDARD.md` (현재 v0.2) |
| 변경 이력 | `standards/html-game/CHANGELOG.md` |
| 적용 프로젝트 | `standards/html-game/applications.md` |

2.1. 적용 게임: **lotto만** (v0.2). sudoku / tetris는 후순위.
2.2. 글로벌(`~/.claude/rules/html-game/`) 미승격. 데이터 수집 단계 (v0.x).
2.3. v1.0 승격 조건은 STANDARD.md 9.4 참조.

# 3. 개발 환경

## 3.1. 권장: 정적 dev 서버

```
node scripts/dev-server.mjs 8000
```

브라우저: `http://127.0.0.1:8000/`. Cache-Control no-store, SW 무관.

## 3.2. Live Server (VS Code)

포트 5500에서 동작하지만 SW / 캐시 충돌 가능. 개발 환경(localhost / 127.0.0.1)에서 SW는 `shared/ui.js`가 자동 unregister + 캐시 클리어 + 1회 자동 reload 처리.

# 4. 자동화 (GitHub Actions)

| 워크플로우 | 일정 | 작업 |
|---|---|---|
| `.github/workflows/fetch-lotto.yml` | 매주 일요일 03:00 KST | lotto 회차 증분 페치 + commit/push |

# 5. 커밋 컨벤션

Conventional Commits. `<type>(<scope>): <subject>`.

5.1. type: `feat` / `fix` / `chore` / `docs` / `refactor` / `test`.
5.2. scope: `lotto` / `sudoku` / `tetris` / `hub` / `scripts`.
5.3. 예시:
- `feat(lotto): Blessed Lotto - 캐릭터 시드 기반 11전략 추천 게임`
- `fix(hub): _registry.json network-first + 개발환경 SW 차단`
- `chore(scripts): fetch-lotto-draws + dev-server + GitHub Actions`

# 6. 작업 우선순위

6.1. **docs SSOT 우선**. 코드 변경 전 영향받는 docs 식별 → 수정 → 코드 → 테스트 순서. 충돌 시 docs가 진실.
6.2. **매직 넘버 0개** (html-game 표준 적용 게임). 모든 수치는 정의 파일(`src/data/numbers.js` 등)에서.
6.3. **사행성 / 도박성 표현 금지** (lotto 한정). "확률 향상" / "필승" 절대 금지. 추천은 "참고용".
6.4. **개발자 짓 안 시키기**. 사용자에게 콘솔 명령 / dev tools 작업 시키지 말 것. 자비스가 직접 처리하거나 GUI / 더블클릭 방식 제공.
6.5. **결제 가능 항목**(향후): 캐릭터 슬롯 / 스킨 / 이력 자산. **금지**: 추천 횟수 / 적중률 향상 옵션.

# 7. 새 게임 추가 절차

7.1. `standards/html-game/STANDARD.md` 6장 순서대로 폴더 셋업.
7.2. `games/<id>/.standard`에 `html-game v<x.y>` 한 줄.
7.3. `games/<id>/CLAUDE.md` 작성 (sudoku 패턴 참고).
7.4. `games/_registry.json`에 게임 등록 (id / title / subtitle / path / status / accent).
7.5. `standards/html-game/applications.md`에 행 추가.
7.6. 첫 진입 면책 / 윤리 카피 검토 (lotto 같은 사행성 도메인은 6.3 강제).

# 8. 새 세션 안내

8.1. 게임 루트(`D:\claude_code\game`)에서 시작 시 본 파일 자동 로드.
8.2. 특정 게임 작업 이어서 할 때: `games/<id>의 작업 이어서. PROGRESS.md / docs 읽고 현재 상태 파악`.
8.3. 본 파일은 200줄 이내 유지. 게임별 세부는 각 게임 CLAUDE.md / docs로 위임.
