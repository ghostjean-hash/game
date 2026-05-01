# game_ghost 진행 상황

프로젝트 전체 메타 로그. 게임별 세부는 각 게임 폴더의 `PROGRESS.md` 참조.

- 시작: 2026-04-30
- repo: https://github.com/ghostjean-hash/game
- 배포: https://ghostjean-hash.github.io/game/

# 1. 스택 / 구조

1.1. Vanilla HTML/Canvas/JS, 빌드 도구 없음.
1.2. 단일 repo, 게임당 폴더, PWA, GitHub Pages 자동 배포.
1.3. 폴더: `shared/` 공통 모듈 6종, `games/<id>/` 게임, `icons/` PWA 아이콘, `scripts/` 빌드 헬퍼.

# 2. 게임 목록

| 게임 | 상태 | 진행 로그 |
|---|---|---|
| tetris | playable, 모바일 검증 통과 | `games/tetris/PROGRESS.md` |
| sudoku | wip, M1+ 완료 / M2 대기 | `games/sudoku/PROGRESS.md` |

# 3. 공통 결정

3.1. **Public repo 강제**: GitHub Pages 무료는 Public만 호스팅.
3.2. **iOS 아이콘 PNG로**: SVG `apple-touch-icon`이 iOS에서 미표시 → `scripts/build_icons.py`로 PNG 생성.
3.3. **Pages 활성화는 사용자 수동**: gh CLI 미설치, PAT 노출 회피.
3.4. **main 직접 푸시는 사용자 명시 승인 시에만**: 자동 모드 기본 차단.

# 4. 공통 미해결 / 개선 여지

4.1. 사운드/햅틱 없음(전 게임).
4.2. iOS PWA 첫 진입 "홈 화면에 추가" 안내 오버레이 없음.
4.3. 공통 게임 종료/일시정지 패턴 추출(보일러플레이트 감소).

# 5. 환경 메모

5.1. gh CLI 인증 완료(`ghostjean-hash` keyring, https).
5.2. git config: 로컬 저장소 한정 `user.name=ghostjean-hash`, `user.email=ghostjean@naver.com`.
5.3. Pillow 10.1.0(아이콘 생성), Python 3.12, Node 25.6.1.
5.4. LF/CRLF 경고: Windows 정상. `.gitattributes` 미정의.
