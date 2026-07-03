# game-hub NEXT-SESSION

> 다음 세션 진입 시 우선 읽기. SessionStart hook 자동 주입 대상 (§8.3).

## 직전 작업 (2026-07-03, nonogram HUD 대개편 + 이모지 방향 확정)

긴 세션(4차 sealing, 상세 games/nonogram/PROGRESS.md). 셋: HUD 퀄리티 16항목 전체 구현(b217c29 - 퍼즐 정보 헤더·완성 줄 흐리게·틀린 칸 표시·별점 예고·손가락 튜토·되돌리기·순차 변신·칭찬·중도 저장·도움·맵 진행바 등, core lines.js 신설, 테스트 20/20), UX 개선 3건(틀린칸+드래그 직선고정 7d9f920 / 맞은 칸 잠금-틀린 칸만 지우기 20ec803 / 틀린 칸을 정상 칠색+느낌표 faea612), 퍼즐 데이터 대격변. **대격변**: "초급·중급 100개씩" 요청에 자비스가 랜덤 무늬로 개수를 채웠다가(5ed2757) 이름이 "초급7" 식이라 사용자 분노, "다 삭제 재세팅" 지시 → 실제 그림 43종 자체 재구성(63e78ae). 교훈: 개수 집착이 1차 조언(무작위=재미약함, 개수보다 품질)을 어긴 실수(buffer 기재). 이후 이미지 소스 조사 - 공개 노노그램은 저작권 재배포 금지, CC0 픽셀아트가 답. Kenney 1-bit(CC0) 실증 647/1074 solver 통과했으나 RPG풍이라, 사용자가 **귀여운 이모지** 선택. **Twemoji(CC-BY) PoC 완전 성공** - 다운로드+15×15 다운샘플+색 추출+solver 통과+컬러 인식(꽃·고양이·케이크·토끼·나비 또렷) 검증됨. **다음 행동(핵심) = 이모지 대량 통합**. 검증된 방법: Twemoji raw(raw.githubusercontent.com/jdecked/twemoji/main/assets/72x72/{codepoint}.png, CC-BY 출처표기) + pngjs 다운샘플(72→N, 블록평균 alpha>110 채움·평균RGB 색) + verifyPuzzle. 남은 3작업: (a) 귀여운 이모지 수백 개(동물·음식·꽃) 선별·다운로드·크기별 변환·solver 거르기 - 목표 5×5 50장(단 5×5는 이모지 인식 어려워 단순한 것만)/10×10·15×15 각 100장+/16×16 추가 (b) **데이터 구조 변경 필수** - grid가 10색 팔레트 인덱스라 이모지 다색을 못 담음, 퍼즐별 색표(puzzle.palette{인덱스:HEX}) + render(pixel.js·boardView revealColors)·colors.js 수정 (c) 유니코드 영문 이름→한글 매핑. 현 puzzles.js 실제그림 43종은 좋은 것만 남기고 교체 예정.

## 이전 작업 (2026-07-02, nonogram 신규 등록 + 컨셉 초안 합의)

/jarvis-init으로 노노그램을 game-hub 다섯 번째 게임으로 등록(별도 도메인 아님, 루트 CLAUDE.md 7장 절차). html-game v0.2 골격 전체 생성(docs 4종 골격 / core·render·input 분리 / 테스트 러너 / .standard) + 허브 등록부 3건(_registry.json, applications.md, 루트 CLAUDE.md 표 - rushhour 누락 행도 보정) + 도메인 루트 BOARD.md 신설(G4 누락분, nonogram 컨셉 카드 todo). 검증: browser-shot 실측 3건(게임 화면 로드 / 테스트 PASS 1/1 / 허브 카드 노출) + registry JSON.parse OK. 컨셉 초안 합의됨 - 타깃 초4 여아(귀엽고 심플, 핑크는 도배 금지·포인트만), 도감 수집형(완성 시 픽셀 그림 변신이 보상), 실패 없음 + 실수 기준 별점, 터치 우선, 자체 그림 → 힌트 자동 생성 → 솔버 유일해·무추측 전수 검증 → 난이도 자동 태깅(puzzlekit은 표준 위반이라 미도입, src/core 직접 구현), 크기 5×5/10×10/15×15 3단. 상세 games/nonogram/PROGRESS.md. **다음 행동** = 사용자 최종 확정("이 초안대로 docs/01_spec + 02_data 반영 + 구현 착수?") 답변 받기 → 확정 시 docs 채우기부터.

## 이전 작업 (2026-07-02, rushhour 발열 절전 + HUD 전면 개편)

발열 점검 요청으로 시작해 HUD 개편 3라운드까지 진행(20차 sealing, 상세 games/rushhour/PROGRESS.md). (1) 발열 절전: 무음 keep-alive·게임 타이머·표정 순환이 탭 백그라운드/시간 초과/음소거에도 영원히 돌던 것을 전부 정지·재개 구조로 처방 + progress 메모리 캐시(이동마다 JSON 재파싱 제거) + solver 정렬·중복 계산 제거. 검증: 테스트 21/21 PASS + 클리어 골드 적립 + hidden 타이머 정지 실측. (2) HUD: 사용자 선택(파스텔 라이트 통일) → 아이패드 피드백("배경 밝을 필요 없음, 난이도 표시 별로")으로 배경 저녁 플럼 + 스테이지 카드(모드 알약·번호·난이도 4칸 게이지) → 실기 스크린샷 겹침 지적으로 `.board-head` flex 한 줄(카드+타이머) 재배치, Fogleman 스테이지 22 재현 + 3화면 boundingBox 겹침 0 수치 검증. **교훈**: 가변 길이 텍스트 UI는 최장 조건으로 검증(좁은 조건만 봐서 겹침 2회 놓침, 수치 판정 도입으로 해소). 후속 1건: 설정 블록 기본값 포니→밥풀이(`DEFAULT_STYLE` a→c, 저장된 선택 유지, SW v121, `ea9aaae`). **다음 행동** = (a) 사용자 아이패드 실기 톤 최종 확인 (b) favicon.ico 404 정리 여부(선택) (c) 이전 잔여: 인접 유사 퍼즐 14쌍 / 도전 고난도 생성기.

