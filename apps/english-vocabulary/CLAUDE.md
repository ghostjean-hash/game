# English Vocabulary 작업 컨텍스트

이 파일은 english-vocabulary 앱 작업 시 자동 로드되는 컨텍스트다. 작업 지침/핵심 정보/주의점만 둔다. 진행 로그는 `PROGRESS.md`. 허브 전체 규칙은 루트 `CLAUDE.md`, 자비스 도메인 운영은 루트 `.claude/`.

# 1. 앱 정의

1.1. **한 줄**: 200개에서 시작해 외운 단어를 하나씩 지워가며, 남은 단어만 계속 반복해 결국 0개로 만드는 반복 암기 단어장. 시험·타이핑 없이 "모름/외움" 두 버튼으로만 굴린다. 직장인·중장년 포함 대상이라 큰 글자·큰 버튼·라이트 테마.
1.2. **상태**: v0.1 1차 필수 구현 완료(2026-07-23). 샘플 20단어(`set-001`)로 전 기능 검증. 실제 200단어 데이터는 words.json 교체로 반영(4장).
1.3. **위치**: game-hub 허브의 두 번째 "app"(english-reading 형제). `apps/_registry.json` 등록, 별도 자비스 도메인 아님.
1.4. **현행 스펙 SSOT**: 이 파일 + `src/core/deck.js`(학습 규칙 권위) + `src/data/manifest.json`(세트 구성) + `src/data/set-NNN.json`(콘텐츠).
1.5. **전체 목표(콘텐츠)**: 중학 핵심 8세트 × 200단어 = 1,600단어. 난이도 흐름 SET01~02 초등 고학년+중1 연결(`middle-bridge`) → 03~05 중1~2 → 06~08 중2~3. **실제 단어는 검증 가능한 자료 기반으로 별도 제작·검수 후 적용하며, 임의 생성 금지**(요청서 2·5장). 현재는 기능 검증용 샘플 20단어(set-001)만 존재.

# 2. 파일 구조

```
apps/english-vocabulary/
├── CLAUDE.md / PROGRESS.md
├── index.html            # 진입점 (topbar / stage 1개, 화면은 JS가 교체 렌더)
├── style.css             # 라이트 테마 + 큰 글자(글자크기 3단계 --fs 배율)
├── src/
│   ├── main.js           # 화면 조립 + 이벤트(DOM). home/study/vault/review/complete/settings
│   ├── core/
│   │   └── deck.js       # 학습 순환 순수 로직 (DOM 미의존, rng 주입)
│   └── data/
│       ├── manifest.json # 8세트 목록·메타(available=true인 세트만 로드/검증)
│       └── set-001.json  # 세트 단어 원본 (샘플 20단어). set-002~008은 실데이터 준비 후 추가
├── tests/run-node.mjs    # deck 순수 로직 + manifest/세트 무결성 (node 실행)
└── tools/validate-data.mjs # 실데이터 적용 전 검증 게이트(요청서 9장). --strict로 200·1600 강제
```

# 3. 핵심 결정 (작업 시 반드시 준수)

3.1. **무빌드 정적 바닐라**. React/TypeScript/프레임워크 미사용. `<script type="module">` 직접 로드, `shared/`를 상대 경로(`../../../shared/`)로 공유. english-reading과 동일 스택.
3.2. **타이핑 0, 100% 클릭·터치**. 철자 입력·객관식 강제·정답 판정 없음. 처리는 "모름/외움" 두 버튼 + 키보드(←/1=모름, →/2=외움, 스페이스=발음).
3.3. **라이트 테마 단독**. `body` 스코프에서 허브 다크 토큰을 라이트로 재정의(english-reading 방식). 테마 토글 없음. 대신 글자 크기 3단계(작게/보통/크게, `body[data-fs]` → `--fs` 배율).
3.4. **학습 규칙은 deck.js가 권위**(요청서 2·9장). active 단어만 순환, "외움"=learned로 빠짐(영구삭제 아님), "모름"=active 유지. 한 바퀴(round)=현재 active를 한 번씩 다 봄 → 바퀴 끝나면 남은 active 셔플해 새 바퀴. "모름" 단어는 이번 바퀴 재출제 안 함(다음 바퀴부터). active 0=세트 완료. 순수 로직이라 rng 주입으로 테스트 결정성 확보(순서섞기 OFF면 rng=null → 원본 순서).
3.5. **안전장치 1차 포함**(요청서 핵심 수정). (a) 직전 처리 1회 Undo(mark 직전 스냅샷 복원, 연속 불가). (b) 외운 단어 보관함 + 수동 복습: "기억남"=learned 유지·복습시각 갱신, "모름"=active 복귀(다음 바퀴 재등장). 복습은 Undo 대상 아님.
3.6. **저장은 기기 저장**(localStorage, `createStorage("english-vocabulary")` → `gg.english-vocabulary.*`): `deck`(serialize 상태 - progress·queue·round·undo·lastStudiedAt), `settings`(토글·글자크기). 원본 단어(words.json)와 진행(progress) 분리 - 원본이 바뀌어도(단어 추가/삭제) 기존 id 진행은 보존, 새 단어는 active로 합류(deck.js 초기화 로직).
3.7. **발음은 SpeechSynthesis**(요청서 13장). 단어 클릭·스페이스로 재생, `lang=en-US`. 자동 재생 기본 OFF. 미지원·실패해도 try/catch로 학습 흐름 안 막음(발음 버튼은 지원 시에만 노출).
3.8. **버튼 아이콘은 인라인 SVG**(발음 스피커·Undo·뒤로·설정). 이모지·유니코드 문자를 버튼 아이콘으로 쓰지 않음(english-reading 5.6 규칙 준용). 완료 badge(✓)·토스트는 버튼 아님이라 예외.

# 4. 데이터 규약 (manifest + set-NNN.json)

4.1. **manifest.json**: `{ app, totalTarget:1600, setSize:200, sets:[...] }`. `sets[]`: `{ setId, order, title, level, file, count, available }`. 앱·검증기는 `available:true`인 세트만 로드·검증하고, `false`(준비 중) 세트는 건너뛴다. `count`는 그 세트 파일의 기대 단어 수(샘플 20, 실데이터 200).
4.2. **set-NNN.json**: `{ setId, order, title, level, words:[...] }`. `word`: `{ id, setId, level, word, pos, meaningKr[], example, exampleKr }`(요청서 7장). `pos`=품사(한국어 라벨, 허용: 명사/동사/형용사/부사/전치사/접속사/대명사/감탄사/한정사), ANSWER 카드에서 뜻 앞 배지로 표시.
4.3. **ID 규칙**(요청서 7장, 충돌 방지): 단어 id `ev-sNN-NNNN`(예 `ev-s01-0001`, s뒤 2자리=세트 order, 뒤 4자리=일련), 세트 id `ev-set-NNN`(예 `ev-set-001`). english-reading 단어장(`vocab`)과도 프리픽스가 달라 향후 연동 시 충돌 없음(요청서 10장).
4.4. `meaningKr`은 핵심 뜻 1~2개(요청서 6장 - 뜻 5개 이상·긴 문법·어원 금지). `example`은 짧은 예문 1개(14단어 이하 권장) + `exampleKr` 해석. **IPA 발음기호는 제외**(손 오타 위험, 발음은 SpeechSynthesis 담당). 넣으려면 `pronunciation` 필드 + 카드 표시 추가.
4.5. **실데이터 적용 절차**(요청서 2·10장, 임의 생성 금지): 검증 가능한 자료로 세트별 단어·뜻·예문을 별도 제작·검수 → `set-NNN.json` 채우고 manifest에서 그 세트 `count`=200·`available`=true 전환 → **`node apps/english-vocabulary/tools/validate-data.mjs --strict`로 검증 통과 후 적용**. 로직·UI 변경 불요(deck는 세트 데이터 스키마만 의존, 세트 크기는 데이터 길이가 곧 `startCount`).
4.6. **검증기(tools/validate-data.mjs)**: manifest의 available 세트를 검사. error(적용 차단) = 필드 누락(pos 포함)·빈 값·허용 외 품사·id/setId 형식·id·단어 중복(세트 내/간)·대소문자 중복·앞뒤 공백·meaningKr 비배열·(strict) 세트당 200·총 1600. warning(사람 검수 대상, 차단 아님) = 활용형 의심 중복·예문에 목표 단어(활용형) 미포함·예문 과길이. 품사 균형(요청서 6장, 세트별 품사 분포)은 후속 과제.

# 5. 작업 시 주의

5.1. 검증은 정적 확인만으로 "됐다" 금지. `tests/run-node.mjs`(순수 로직) + browser-shot으로 실경로 재생 - 외움/모름 처리·바퀴 전환·Undo·보관함 복습 복귀·세트 완료·설정 토글·글자크기·초기화·발음 실패 무해까지.
5.2. 유닛 테스트: `node apps/english-vocabulary/tests/run-node.mjs`. deck 로직·데이터 변경 시 실행이 기본.
5.3. 색만으로 정보 전달 지양(접근성). 모름=주황 계열, 외움=초록 계열 배경 + 텍스트 라벨 병행.
5.4. 배포는 향후 `/web-deploy` 연동 시 도메인 `.claude/deploy.json`에 smoke 셀렉터(`.hero`) 추가. SW 캐시는 루트 service-worker.js 소관.

# 6. 비스코프 (1차)

6.1. 타이핑 입력 / 철자 시험 / 객관식.
6.2. 서버·백엔드·계정(서버리스 단독, localStorage).
6.3. 다크 테마 토글.
6.4. 7일 후 자동 재확인 일정(2·3차). 1차는 수동 복습까지만.
6.5. 여러 세트 동시 관리 / CSV·JSON 가져오기 / 독해 앱 직접 연동(3차 - 구조상 막지 않되 미구현).
