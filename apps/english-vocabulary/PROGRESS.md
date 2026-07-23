# English Vocabulary 진행 로그

append-only. 최신이 위.

## 2026-07-23 · v0.1 1차 필수 구현

- **배경**: 사용자 요청(ChatGPT 작성 요청서 검토·승인) → game-hub 허브의 두 번째 앱으로 신규 구현. "200개에서 시작해 외운 단어가 하나씩 사라져 0개가 되는 경험"이 핵심. 별도 자비스 도메인 아님(english-reading 형제).
- **착수 전 4개 결정(사용자 승인, 모두 추천안)**: (1) 허브 표준(무빌드 바닐라 + localStorage)으로 구현 (2) 1차 필수 기능만 (3) IPA 발음기호 제외·SpeechSynthesis 음성만 (4) Undo + 보관함 수동 복습을 1차에 포함.
- **구현**:
  - `src/core/deck.js` - 학습 순환 순수 로직. active/learned, 모름/외움, 바퀴(round) 전환, 순서 셔플(rng 주입), Undo(직전 1회 스냅샷), 보관함 복습(reviewMark), serialize/복원, 원본 변경 시 진행 보존.
  - `src/data/words.json` - 샘플 20단어(`ev-0001`~`ev-0020`, 중고교 기초·독해 빈출). 200단어는 배열 교체로 반영.
  - `src/main.js` - 6화면(home/study/vault/review/complete/settings) + 발음 + 키보드 + 설정 + 초기화.
  - `index.html` / `style.css` - 라이트 테마, 큰 글자(3단계 --fs), 큰 버튼.
  - `apps/_registry.json` - 허브 홈 카드 등록(accent #2563eb).
  - `tests/run-node.mjs` - 순수 로직 8묶음.
- **검증**: `run-node.mjs` 57 PASS / 0 FAIL. browser-shot으로 홈·학습·Undo 등장·설정 화면 실경로 재생(콘솔 에러 0, 전 화면 가시성 확인). 외움 처리 시 남은 수 감소·진행바·Undo 버튼 등장 확인.
- **1차 스코프 확인(요청서 20장 테스트 기준)**: 외움→목록 제거·모름→유지·한 바퀴 후 남은 것만 반복·저장 복원·Undo 복원·복습 모름→active 복귀·active 0 완료·초기화·발음 실패 무해 전부 테스트로 커버.
- **보류(2·3차)**: 7일 자동 재확인 일정, 좌우 스와이프(오작동 위험 회피, 버튼+키보드로 충분), 여러 세트, CSV/JSON 가져오기, 독해 앱 직접 연동(구조는 열어둠 - ev- id 프리픽스·원본/진행 분리).
- **다음 후보**: (a) 실제 200단어 데이터 작성·교체 (b) 배포(`/web-deploy` deploy.json + smoke 셀렉터) (c) 좌우 스와이프 (d) 자동 재확인 일정.
