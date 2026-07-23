# English Vocabulary 진행 로그

append-only. 최신이 위.

## 2026-07-23 · v0.2 8세트 확장 구조 + 검증 게이트 준비

- **배경**: 사용자 요청(ChatGPT 후속 지시서) → 실제 콘텐츠(중학 8세트 × 200 = 1,600단어)가 들어올 때 구조적으로 막히지 않도록 준비만. **실제 단어는 임의 생성 금지**(검증 가능한 자료로 별도 제작·검수 후 적용). 단일 세트 앱은 크게 수정하지 않음.
- **커밋 분리**: `80c666c`(v0.1 샘플 앱 보존) → `[v0.2 해시]`(구조·검증 준비).
- **한 것**:
  - 데이터 구조 판단 = `manifest.json` + `set-NNN.json`(요청서 8장 권장안). 세트 고정 8개·세트별 독립 검수·필요 세트만 로드가 근거. 현재 set-001(샘플 20)만 available, set-002~008은 available:false 자리만.
  - ID 규칙 반영: 단어 `ev-sNN-NNNN`, 세트 `ev-set-NNN`, `level` 필드 추가. 기존 샘플 id(`ev-0001`)를 `ev-s01-0001`로 이관.
  - 앱 부팅부만 최소 수정: `words.json` 직접 fetch → manifest에서 첫 available 세트 파일 로드. deck 로직·UI·화면 무변경.
  - 검증기 `tools/validate-data.mjs` 신규(요청서 9장): 필드 누락·빈 값·id/setId 형식·중복(id·단어·대소문자·세트간)·공백·예문 목표단어 포함·활용형 의심·(strict) 세트당 200·총 1600. error/warning 분리, error 시 exit 1로 적용 차단.
  - 테스트 갱신: manifest 로드 경로 + id/setId 형식 + manifest 정합(8세트·200·1600) 검증 추가.
  - `words.json` 제거(set-001.json으로 대체). 문서(CLAUDE.md 2·4장) 갱신.
- **검증**: 유닛 63 PASS / 0 FAIL. `validate-data.mjs` sample 통과(오류 0), `--strict`는 20/1600으로 의도대로 실패(게이트 작동 확인). browser-shot 새 구조 로드 정상(콘솔 에러 0).
- **실제 1,600단어는 생성하지 않음**(요청서 준수). 다음 콘텐츠 작업 입력 = 검증 가능한 중학 어휘 자료 + 세트별 단어·뜻·예문·해석 목록(사람 검수 포함).
- **다음**: 실데이터 세트 채우기(자료 제공 후) → `--strict` 검증 → available 전환. 8세트 UI(세트 선택·잠금·진행률)는 데이터 준비되면 추가.

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
