# game_ghost 진행 상황

- 시작: 2026-04-30
- repo: https://github.com/ghostjean-hash/game
- 배포: https://ghostjean-hash.github.io/game/
- 마지막 커밋: `8ae9750` (push 완료, working tree clean)

## 1. 스택 / 구조

- Vanilla HTML/Canvas/JS, 빌드 도구 없음
- 단일 repo, 게임당 폴더, PWA, GitHub Pages 자동 배포
- 폴더: `shared/` 공통 모듈 6종, `games/<id>/` 게임, `icons/` PWA 아이콘, `scripts/` 빌드 헬퍼

## 2. 활성 게임

### 2.1. tetris (playable, 모바일 검증 통과)
- SRS 회전 + 월킥(JLSTZ/I 별도), 7-bag, 락 딜레이 0.5s, 고스트, 홀드
- 점수 [100/300/500/800] × 레벨, 10라인마다 레벨업
- 입력: 키보드(←→↓↑/Space/Shift/P) + 터치(스와이프/탭/길게)
- localStorage 베스트 점수

## 3. 주요 결정

- 3.1. **Public repo 강제**: GitHub Pages 무료는 Public만 호스팅
- 3.2. **iOS 아이콘 PNG로**: SVG `apple-touch-icon`이 iOS에서 미표시 → `scripts/build_icons.py`로 180/192/512/maskable PNG 생성
- 3.3. **HUD topbar 인라인 흡수**: 별도 행으로 두면 보드 셀 크기가 줄어드는 트레이드오프 → topbar에 `SCR · LV · L · ★` 한 줄, stage padding 4px
- 3.4. **Pages 활성화는 사용자 수동**: gh CLI 미설치, PAT 노출 회피

## 4. 해결한 주요 버그

- 4.1. 인접 다중 라인 클리어 시 한 줄 안 사라짐 (`applyClear` 오름차순 splice → 내림차순)
- 4.2. 게임 오버 후 빈 화면 (`tickHud`가 매 프레임 `gameOver` 호출 → `overHandled` 플래그)
- 4.3. 모바일 HUD가 보드 가림 (오버레이 → grid 분리 → topbar 인라인, 두 단계)

## 5. 미해결 / 개선 여지

- 5.1. Next/Hold 피스 시각화 없음
- 5.2. T-spin 감지 없음
- 5.3. 사운드/햅틱 없음
- 5.4. iOS PWA 첫 진입 시 "홈 화면에 추가" 안내 오버레이 없음
- 5.5. 가로(landscape) 모드 실기 검증 미완료
- 5.6. 4줄 동시 클리어(테트리스) 실기 검증 미완료

## 6. 다음 단계 후보

- 6.1. 두 번째 게임 추가 (스도쿠 등)
- 6.2. 테트리스 폴리싱 (Next/Hold 시각화, 햅틱, 사운드)
- 6.3. 공통 게임 종료/일시정지 패턴 추출 (게임 추가 시 보일러플레이트 줄이기)
- 6.4. iOS 첫 진입 안내 오버레이

## 7. 환경 메모

- gh CLI 미설치 (Pages 자동화 시 필요)
- Pillow 10.1.0 (아이콘 생성)
- Python 3.12, Node 25.6.1
- LF/CRLF 경고: Windows 정상. `.gitattributes` 미정의 상태

## 8. 커밋 히스토리

| 커밋 | 내용 |
|---|---|
| `6a30e73` | initial scaffold |
| `3f35c36` | SVG → PNG 아이콘 |
| `5af5c1c` | HUD grid 분리 (1차 시도, 셀 크기 줄어듦) |
| `57bb6bb` | HUD topbar 인라인 흡수 (최종) |
| `e32ea4a` | 다중 라인 클리어 인덱스 버그 |
| `8ae9750` | 게임 오버 모달 중복 생성 |
