# game_ghost 진행 상황

- 시작: 2026-04-30
- repo: https://github.com/ghostjean-hash/game
- 배포: https://ghostjean-hash.github.io/game/
- 마지막 커밋: `541c694` 이후 sudoku M1+ 폴리싱 (PLAN.md 추가, 푸시 시점에 갱신)

## 1. 스택 / 구조

- Vanilla HTML/Canvas/JS, 빌드 도구 없음.
- 단일 repo, 게임당 폴더, PWA, GitHub Pages 자동 배포.
- 폴더: `shared/` 공통 모듈 6종, `games/<id>/` 게임, `icons/` PWA 아이콘, `scripts/` 빌드 헬퍼.

## 2. 활성 게임

### 2.1. tetris (playable, 모바일 검증 통과)
- SRS 회전 + 월킥(JLSTZ/I), 7-bag, 락 딜레이 0.5s, 고스트, 홀드.
- 점수 [100/300/500/800] × 레벨, 10라인마다 레벨업.
- 입력: 키보드(←→↓↑/Space/Shift/P) + 터치(좌우 드래그 추적/탭 회전/위 스와이프 홀드/아래 스와이프 하드드롭/길게누름 홀드).
- 입력 영역을 `.page` 전체로 확장(button/a 가드).
- topbar에 NEXT/HOLD 미니 슬롯 + 중앙 큰 점수.
- localStorage 베스트 점수.

### 2.2. sudoku (wip, M1+ 진행 중)
- 9x9 보드, 셀 선택, 키보드/패드 입력, 룰 검증(빨강), 같은 숫자/관련 영역 강조.
- 타이머/일시정지/undo/지우기, 클리어 모달, 베스트 시간 저장(classic).
- **라이트 톤 페이지** (스도쿠 페이지에 한정해 토큰 오버라이드. 모달도 라이트).
- 가로 모드/태블릿 **사이드 패드**(3x3 키패드, vmin 기반 버튼 크기 clamp 상한 80px).
- **행/열/박스 완성 웨이브 이펙트**(파랑/보라 톤 차별), **마지막 입력 셀 기준 확산 이펙트**.
- L1 데모 퍼즐 1개 하드코딩. M3에서 풀 확장 예정.
- 기획서: `games/sudoku/PLAN.md` (v0.2).

## 3. 주요 결정

- 3.1. **Public repo 강제**: GitHub Pages 무료는 Public만 호스팅.
- 3.2. **iOS 아이콘 PNG로**: SVG `apple-touch-icon`이 iOS에서 미표시 → `scripts/build_icons.py`로 PNG 생성.
- 3.3. **HUD topbar 인라인 흡수**: 별도 행 시 보드 셀 축소 → topbar 인라인.
- 3.4. **Pages 활성화는 사용자 수동**: gh CLI 미설치, PAT 노출 회피.
- 3.5. **테트리스 입력 영역을 페이지 전체로**: 보드 외 잉여 영역에서도 제스처 가능. button/a는 input.js의 가드로 회피.
- 3.6. **테트리스 좌우 드래그 추적**: 한 칸 스와이프 → 손가락 따라가는 pan.
- 3.7. **스도쿠 라이트 톤 단일 운영**: 글로벌 토큰은 다크 유지, 페이지 스코프 오버라이드. 글로벌 테마 토글은 비스코프.
- 3.8. **스도쿠 가로 모드 사이드 패드**: 보드 정사각 최대화 + 우측 3x3 키패드.
- 3.9. **스도쿠 클리어 확산 기준 = 마지막 입력 셀**: `state.lastChanged`. 진입 시 라인/박스 펄스 즉시 정리해 시작점 시각적으로 명확.

## 4. 해결한 주요 버그

- 4.1. 인접 다중 라인 클리어 시 한 줄 안 사라짐(테트리스, `applyClear` 내림차순 splice).
- 4.2. 게임 오버 후 빈 화면(테트리스, `tickHud`가 매 프레임 `gameOver` 호출 → `overHandled` 플래그).
- 4.3. 모바일 HUD가 보드 가림(테트리스, 오버레이 → grid 분리 → topbar 인라인).

## 5. 미해결 / 개선 여지

- 5.1. 테트리스 T-spin 감지 없음.
- 5.2. 사운드/햅틱 없음(전 게임).
- 5.3. iOS PWA 첫 진입 "홈 화면에 추가" 안내 오버레이 없음.
- 5.4. 가로(landscape) 모드 실기 검증 미완료(테트리스).
- 5.5. 4줄 동시 클리어(테트리스) 실기 검증 미완료.
- 5.6. 스도쿠 M1+ 실기기 검증 진행 중.

## 6. 다음 단계 후보

- 6.1. **스도쿠 M2**: 메모, auto-notes, 자동 메모 정리, redo, 실수 카운트, 일시정지 가이드 갱신.
- 6.2. **스도쿠 M3**: 사전 퍼즐 풀(난이도별 30~50), 난이도 4단계 UI, 진행 저장/이어하기.
- 6.3. **스도쿠 M4**: 스마트 힌트(6 기법, 3단계 점진 공개).
- 6.4. **스도쿠 M5**: 일일 퍼즐 + 스트릭, 실시간 생성기.
- 6.5. 공통 게임 종료/일시정지 패턴 추출(보일러플레이트 감소).
- 6.6. iOS 첫 진입 안내 오버레이.

## 7. 환경 메모

- gh CLI 인증 완료(`ghostjean-hash` keyring, https).
- git config: 로컬 저장소 한정 `user.name=ghostjean-hash`, `user.email=ghostjean@naver.com`.
- Pillow 10.1.0(아이콘 생성), Python 3.12, Node 25.6.1.
- LF/CRLF 경고: Windows 정상. `.gitattributes` 미정의.
- main 직접 푸시는 사용자 명시 승인 시에만(자동 모드 기본 차단).

## 8. 커밋 히스토리 (최근)

| 커밋 | 내용 |
|---|---|
| `6a30e73` | initial scaffold |
| `3f35c36` | SVG → PNG 아이콘 |
| `5af5c1c` | HUD grid 분리 (1차) |
| `57bb6bb` | HUD topbar 인라인 흡수 |
| `e32ea4a` | 다중 라인 클리어 인덱스 버그 |
| `8ae9750` | 게임 오버 모달 중복 생성 |
| `775925e` | PROGRESS.md 추가 |
| `7ccb725` | tetris 입력/HUD 개편 (페이지 전체 입력, 드래그 추적, NEXT/HOLD, 점수 강조) |
| `541c694` | sudoku M1 스캐폴딩 |
| `(이번)` | sudoku M1+ 폴리싱 (라이트 톤, 사이드 패드, 완성/클리어 이펙트) + PLAN.md |
