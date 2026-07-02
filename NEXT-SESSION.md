# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-07-02, nonogram 1차 구현 완료 + 사운드)

컨셉 초안대로 노노그램을 플레이 가능한 수준까지 구현(2차 sealing, 상세 games/nonogram/PROGRESS.md). 사용자 흐름: /jn 추천 → "확정 및 구현" → "쭉 끝까지" → "사운드 적용". docs 4종 확정 + 전체 구현(core: hints/solver/board/stars, data: constants/colors/puzzles 20종, render 4뷰, input, audio: sound, main). 퍼즐 20종(튜토3·초급6·중급6·고급5 15×15)은 solver로 유일해·무추측 전수 검증한 모양만 채택, 색은 자유 배치. 사운드는 WebAudio 합성(rushhour 패턴, 음원 파일 0) + 음소거 토글 + 백그라운드 절전. registry playable 승격. 검증: 테스트 16/16 PASS + 플레이 플로우 browser-shot(맵→풀이→컬러 변신→별3→도감 + 15×15 반응형) + 사운드 pageerror 0. 커밋 65baa3e(구현) + 4ced041(사운드). **다음 행동** = (a) 사용자가 직접 플레이 후 GitHub Pages 배포(push) 여부 결정 - 현재 로컬 커밋만, 미push (b) 사운드 볼륨·종류 조정 여부 (c) 맵 썸네일 예고 방식 유지 여부(현재 미클리어도 실루엣 노출).

## 이전 작업 (2026-07-02, nonogram 신규 등록 + 컨셉 초안 합의)

/jarvis-init으로 노노그램을 game-hub 다섯 번째 게임으로 등록(별도 도메인 아님, 루트 CLAUDE.md 7장 절차). html-game v0.2 골격 전체 생성(docs 4종 골격 / core·render·input 분리 / 테스트 러너 / .standard) + 허브 등록부 3건(_registry.json, applications.md, 루트 CLAUDE.md 표 - rushhour 누락 행도 보정) + 도메인 루트 BOARD.md 신설(G4 누락분, nonogram 컨셉 카드 todo). 검증: browser-shot 실측 3건(게임 화면 로드 / 테스트 PASS 1/1 / 허브 카드 노출) + registry JSON.parse OK. 컨셉 초안 합의됨 - 타깃 초4 여아(귀엽고 심플, 핑크는 도배 금지·포인트만), 도감 수집형(완성 시 픽셀 그림 변신이 보상), 실패 없음 + 실수 기준 별점, 터치 우선, 자체 그림 → 힌트 자동 생성 → 솔버 유일해·무추측 전수 검증 → 난이도 자동 태깅(puzzlekit은 표준 위반이라 미도입, src/core 직접 구현), 크기 5×5/10×10/15×15 3단. 상세 games/nonogram/PROGRESS.md. **다음 행동** = 사용자 최종 확정("이 초안대로 docs/01_spec + 02_data 반영 + 구현 착수?") 답변 받기 → 확정 시 docs 채우기부터.

## 이전 작업 (2026-07-02, rushhour 발열 절전 + HUD 전면 개편)

발열 점검 요청으로 시작해 HUD 개편 3라운드까지 진행(20차 sealing, 상세 games/rushhour/PROGRESS.md). (1) 발열 절전: 무음 keep-alive·게임 타이머·표정 순환이 탭 백그라운드/시간 초과/음소거에도 영원히 돌던 것을 전부 정지·재개 구조로 처방 + progress 메모리 캐시(이동마다 JSON 재파싱 제거) + solver 정렬·중복 계산 제거. 검증: 테스트 21/21 PASS + 클리어 골드 적립 + hidden 타이머 정지 실측. (2) HUD: 사용자 선택(파스텔 라이트 통일) → 아이패드 피드백("배경 밝을 필요 없음, 난이도 표시 별로")으로 배경 저녁 플럼 + 스테이지 카드(모드 알약·번호·난이도 4칸 게이지) → 실기 스크린샷 겹침 지적으로 `.board-head` flex 한 줄(카드+타이머) 재배치, Fogleman 스테이지 22 재현 + 3화면 boundingBox 겹침 0 수치 검증. **교훈**: 가변 길이 텍스트 UI는 최장 조건으로 검증(좁은 조건만 봐서 겹침 2회 놓침, 수치 판정 도입으로 해소). 후속 1건: 설정 블록 기본값 포니→밥풀이(`DEFAULT_STYLE` a→c, 저장된 선택 유지, SW v121, `ea9aaae`). **다음 행동** = (a) 사용자 아이패드 실기 톤 최종 확인 (b) favicon.ico 404 정리 여부(선택) (c) 이전 잔여: 인접 유사 퍼즐 14쌍 / 도전 고난도 생성기.

