# 허브(모노레포) 구조 표준 설계안 (ledger #275 처리)

- 작성: 2026-07-06, game-hub 도메인 세션 (역방향 안내 통로 #289 경유)
- 대상: `~/.claude/standards/project-structure-standard.md` v1.0.4 → v1.0.5 개정 제안
- 근거 실측: `F:\claude_code\game_ghost` (게임 5종 허브, GitHub Pages 배포)
- 상태: 설계 완료. 글로벌 반영은 글로벌 세션에서 (도메인 cwd는 글로벌 자산 쓰기 불가, §4.2)

## 1. 문제 정의

1.1. 현행 표준은 "한 프로젝트 = 모드 1 × 유형 1" 단일 프로젝트 전제다. game_ghost처럼 하위 프로젝트 여러 개(games/&lt;id&gt; 5종)를 한 repo에 담은 허브는 매니페스트가 없다.
1.2. 실제 결손: tetris cwd에서 `/jarvis-structure-sync` 발동 시 적용 단위(루트 전체 vs 하위 게임 1개)를 정하지 못해 적용 보류됨 (2026-06-26, ledger #275 등록 경위).

## 2. 제안 골자: layout 축 신설

2.1. 기존 2축(모드 × 유형)에 **layout 축**을 추가한다: `single`(기본, 현행 그대로) / `hub`(모노레포 허브).
2.2. hub = 한 도메인(repo) 안에 독립 실행 단위인 하위 프로젝트 여러 개를 컨테이너 폴더 아래 담은 구조. 도메인 운영 단위는 루트 1개, 제작 단위는 하위 N개.
2.3. 판별 메타: `.claude/structure-sync.json`에 기록.

```json
{
  "standard_version": "1.0.5",
  "layout": "hub",
  "hub": {
    "container": "games/",
    "registry": "games/_registry.json",
    "children_profile": "lite"
  }
}
```

## 3. 허브 루트 골격 (도메인 운영 단위)

3.1. FM 4종(ROADMAP / TASKS / NEXT-SESSION / PROGRESS) + CLAUDE.md + `.claude/`는 **루트에만 1벌**. 하위 프로젝트에 FM을 중복 생성하지 않는다.
3.2. 예외 2종은 루트·하위 양쪽 허용: CLAUDE.md(하위 = 그 프로젝트 세부 규칙, Claude Code 자동 로드 표준)와 PROGRESS.md(하위 = 그 프로젝트 진행 로그, 루트 = 허브 메타 로그). 도메인 식별 키(`domain:`)는 루트 `.claude/CLAUDE.md`에만 둔다.
3.3. 허브 고유 공유층 폴더를 표준 등재한다.
   - `shared/` : 하위 프로젝트가 공동 사용하는 런타임 코드·스타일 (실측: base.css / ui.js / mobile-shell.css 등 7종).
   - `<container>/` : 하위 프로젝트 컨테이너. 이름은 도메인 성격 따라 자유(games/, apps/ 등), 등록부 파일(`_registry.json` 류) 권장.
   - `standards/` (옵션): 허브 로컬 표준(예: html-game STANDARD.md). 글로벌 `~/.claude/standards/`와 별개 계층.
3.4. 공통 골격 중 루트 적용: `tests/`(허브 공통 스모크), `tools/` 또는 `scripts/`(동의어 허용, 하나만), `docs/plans/`·`docs/reference/`·`docs/feedback/`, `assets/`, `temp/`, `_legacy/`.
3.5. 배포 면제: GitHub Pages류 정적 호스팅으로 **루트 자체가 배포물**인 허브는 `dist/` 면제(index.html·manifest·service-worker 루트 직접 배치 허용).

## 4. 하위 프로젝트 골격 (children_profile: lite)

4.1. 필수 3종: `CLAUDE.md`(세부 규칙) + `PROGRESS.md`(진행 로그) + 진입점(index.html 등).
4.2. 권장: `docs/` (기획서·계획 통합 허용. lite에서는 gdd/·spec/ 분리를 강제하지 않고 docs/ 단일 통합 허용 - 소형 하위 프로젝트에 폴더 6종 강제는 비용 > 효익. 하위가 커지면 gdd/ 분리 옵트인).
4.3. 코드 형태 자유: 소형은 flat(game.js + style.css, 실측 tetris·sudoku), 성장하면 `src/`(+ styles/ tests/ scripts/, 실측 lotto·nonogram·rushhour). sync는 flat을 위반으로 보지 않는다.
4.4. FM 4종·`.claude/`·`temp/`·`_legacy/`는 하위에 만들지 않는다(루트 소관).

## 5. structure-sync 적용 단위 규약

5.1. **cwd가 허브 루트**: 루트를 §3 허브 골격으로 진단. 하위 전수 진단(§4 lite 기준, 등록부 순회)은 사용자 선택 옵션으로 제시.
5.2. **cwd가 하위 프로젝트**(컨테이너 하위 + 자신에게 `domain:` 키 없음 + 상위에 layout:hub 메타 존재): 그 하위 1건만 §4 lite 기준으로 진단. 루트 골격은 건드리지 않는다.
5.3. 판별 순서: cwd의 `.claude/structure-sync.json` → 없으면 상위 탐색으로 hub 메타 확인 → 그것도 없으면 현행대로 single 취급 후 사용자에게 layout 질문(초회 1회, 답을 메타에 기록).

## 6. game_ghost 실측 대조 (설계 검증)

| 항목 | 실측 | 설계안 판정 |
|---|---|---|
| 루트 FM 4종 + CLAUDE.md + .claude/ | 전부 존재 | §3.1 일치 |
| 하위 5종 CLAUDE.md + PROGRESS.md + 진입점 | 전부 존재 | §4.1 일치 (필수 3종 충족률 5/5) |
| 하위 flat(tetris·sudoku) vs src(lotto·nonogram·rushhour) 혼재 | 존재 | §4.3 허용 - 위반 아님 |
| shared/ 공유층 | 존재 (7파일) | §3.3 등재로 수용 |
| 루트 직접 배포(index.html·SW·manifest) | 존재 | §3.5 면제로 수용 |
| BOARD.md 루트 잔존 | 존재 | **위반** (v1.0.4 폐지) - sync 시 _legacy 이동 제안 대상 |
| docs/plans 부재였음 | 본 설계안으로 신설 | §3.4 충족 시작 |
| scripts/ (tools/ 아님) | 존재 | §3.4 동의어 허용으로 수용 |
| .claude/structure-sync.json 부재 | 부재 | 글로벌 반영 후 sync 재발동 시 생성 |

6.1. 결론: 설계안 기준으로 game_ghost는 "BOARD.md 잔존 + sync 메타 부재" 2건 외 전 항목 적합. 표준이 실구조를 뒤틀지 않고 수용하면서 폐기 자산(BOARD)만 정확히 짚어냄 - 설계 목적(적용 단위 결정 불능 해소) 달성.

## 7. 글로벌 반영 절차 (글로벌 세션 작업)

7.1. `standards/project-structure-standard.md`에 §신설(허브 layout, 본 문서 §2-§5 이식) + version 1.0.5 bump + 개정 이력 기재.
7.2. `/jarvis-structure-sync` 명령 정의에 §5 적용 단위 규약 반영.
7.3. ledger #275 resolved 처리 (resolution_ref = 본 설계 문서 경로 + 반영 commit).
7.4. 반영 후 game-hub 도메인에서 sync 재발동 → structure-sync.json 생성 + BOARD.md 처분(사용자 승인 게이트).
