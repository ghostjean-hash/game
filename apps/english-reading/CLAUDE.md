# English Reading 작업 컨텍스트

이 파일은 english-reading 앱 작업 시 자동 로드되는 컨텍스트다. 작업 지침/핵심 정보/주의점만 둔다. 진행 로그는 `PROGRESS.md`. 허브 전체 규칙은 루트 `CLAUDE.md`, 자비스 도메인 운영은 루트 `.claude/`.

# 1. 앱 정의

1.1. **한 줄**: 다독의 흐름과 정독의 깊이를 한 화면에 합친 하이브리드 리딩 도구. 평소엔 지문을 시원하게 몰입해 읽고, 막히는 문장·단어·구조에서만 손끝으로 끊어 읽기·뜻·구조 해설을 꺼내 쓴다. 타이핑과 강제 문제 풀이는 없다.
1.2. **상태**: v0.6 하이브리드 독해 코드 구현 완료(2026-07-08). 기획서 `spec/index.html` v0.6과 정합. 이전 방향(v0.2 독해 사다리·v0.3 문법 스캔)은 커밋 이력·PROGRESS에만 존재.
1.3. **학습 흐름**(v0.8 선유추 단어수집·다회독, 2026-07-09): 코스(난이도 완만 순 지문 묶음) → 지문 목록에서 고름 → 몰입 리딩 + 능동 연습(**끊기/단어 모드 스위치**로 한 번에 한 종류만 터치 반응 - 끊기·단어가 본문에서 붙어 있어 생기던 오터치를 원천 차단, 2026-07-09 사용자 지시) - 끊기 모드에서 단어 사이 틈 클릭=/ 선 긋기(토글), 문장 끝 **오른쪽**의 [해석]=채점(긋기·맞음 검정, 맞은 끊기 위 안이 빈 붉은 원(테두리만)·잘못 그은 끊기 연한 회색 / + 위 붉은 x·빼먹은 자리 붉은 / + 위 작은 붉은 삼각형(▾) - 2026-07-09 사용자 확정) + 그때서야 끊어 읽기 해석·그 문장의 모든 문법 목록·(어려운 문장은) 구조 심화 카드 공개. **뜻이 등록된 주요 단어만 클릭 = '임시 수집'**(오렌지 배경, 밑줄 없음, "임시 저장" 토스트, 뜻은 감춤 - 일반 단어까지 터치되면 끊기 틈과 오터치가 잦아 주요 단어로 제한, 2026-07-09 사용자 지시) → **해석 클릭 시** 번역 카드 바로 아래에 그 문장의 임시 수집 단어를 [단어-뜻] 리스트로 한꺼번에 공개(데이터에 뜻 있는 단어는 뜻까지, 없으면 뜻 비운 채 단어만) + 이때 '내 단어장'에 영구 저장(선유추 후확인). 다 읽으면 **'N회독 완료'** 버튼 → 같은 지문을 clean slate로 재렌더해 반복 유도(임시 하이라이트 리셋, 영구 단어장은 유지) → 코스 전체 완주 시에만 클리어 연출. 검토 후 선·단어 잠금, 해석 버튼 재클릭은 해설 접힘/펼침 토글(채점 색 유지). 노출 설정 3종 토글. 본문 배경 하이라이트 없음(재독 known 표시 제거, 사용자 결정).
1.4. **위치**: game-hub 허브의 첫 "app". `apps/_registry.json` 등록.
1.5. **현행 스펙 SSOT**: 이 파일 + `spec/index.html`(v0.6) + `src/data/passages.json` 규약(4장).

# 2. 파일 구조

```
apps/english-reading/
├── CLAUDE.md / PROGRESS.md
├── index.html            # 진입점 (reader-page: topbar / bar / stage)
├── style.css             # 라이트 테마 + 화면별 스타일
├── dist/standalone.html  # 생성물 (직접 수정 금지, tools/build-standalone.mjs로 재생성)
├── spec/index.html       # 기획서 v0.6 하이브리드 독해
├── tests/run-node.mjs    # core 유닛 + passages.json 무결성 (node로 실행)
├── tools/build-standalone.mjs
└── src/
    ├── main.js           # 화면 조립 + 클릭/이벤트 (DOM). 목록·읽기·단어장·설정·문제 출제
    ├── core/
    │   ├── tokenize.js   # 문장 토큰화 + nth 해석 (순수, DOM 미의존, 재사용)
    │   ├── course.js     # 코스·지문·진행 순수 로직 (createCourse / courseProgress)
    │   ├── chunking.js   # 끊어읽기 채점 + 끊는 기준 위반 검사(chunkViolations) + 이유 태그
    │   └── validate.js   # 지문 무결성·끊는 기준 통합 검증(validatePassage) - 출제 화면·테스트 공용
    └── data/
        └── passages.json # 코스별 지문 (기본 콘텐츠 단일 진실. 사용자 출제분은 localStorage)
```

# 3. 핵심 결정 (작업 시 반드시 준수)

3.1. **무빌드 정적 바닐라**. React/Tailwind 미사용. `<script type="module">` 직접 로드, shared/를 상대 경로로 공유.
3.2. **타이핑 0, 100% 클릭·터치**. 입력 필드·강제 문제 풀이·정답 판정 없음(흐름 우선 철학).
3.3. **라이트 테마 단독**. body 스코프에서 글로벌 다크 토큰을 라이트로 재정의. 테마 토글 없음.
3.4. **난이도 = 지문 자체(완만한 사다리)**. 지문에 level을 매겨 오름차순 정렬(한 편에 길이·구문·어휘 중 하나만 상승). 도움 노출량은 난이도가 아니라 학습자 설정. **클리어 = 코스 전체 완주**이고, 개별 지문 완독은 진행률만 채우며 연출을 두지 않는다.
3.5. **순수 로직은 core/에 격리**. tokenize·course는 DOM 미의존. main.js만 DOM을 만진다. courseProgress는 done 배열 주입으로 테스트 결정성 확보.
3.6. **상태는 기기 저장**(localStorage, `createStorage("english-reading")`): `done`(완독 지문 id), `reads`(지문별 회독수), `vocab`(단어+뜻+원문+출처), `settings`(노출 토글), `seenIntro`(첫 안내 1회), `progress`(지문별 읽기 진행 - 문장마다 그은 선·임시 단어·검토 여부. 단어장·목록을 오가거나 앱을 껐다 켜도 복원, 회독 완료 시 해당 지문분 리셋), `lastPassage`(마지막 읽던 지문 id), `customPassages`(사용자가 '문제 출제' 화면에서 검증 통과시켜 추가한 지문 배열 - 기본 지문과 합쳐 코스를 만든다). 단어장 백버튼은 읽던 지문이 있으면 그 지문으로 복귀(목록에서 왔으면 목록으로).
3.9. **문제 출제(크리에이터)**. 목록 '문제 출제' 화면에서 LLM용 출제 규칙(AUTHORING_PROMPT) 복사 → LLM이 만든 지문 JSON을 붙여넣으면 `validatePassage`로 즉시 검증(끊는 기준 위반·죽은 단어·양식) → 통과분만 `customPassages`에 추가해 목록 반영(내 문제 뱃지). '배포용 복사'로 JSON을 얻어 자비스가 passages.json에 커밋하면 전체 배포. 서버·계정 없이 로컬 저장(6.2 서버리스 유지).
3.7. **노출 설정 3종**(`chunks`/`words`/`scope`) 기본 전부 켜짐. OFF면 해당 상호작용·시각 요소를 비활성한다.
3.8. **standalone.html은 생성물**. 직접 수정 금지, 원본 수정 후 `tools/build-standalone.mjs` 재실행. 빌드는 치환 패턴(fetch 블록·SW 등록 줄) 미발견 시 즉시 실패 - 그 줄을 바꾸면 빌드 스크립트도 함께 갱신.

# 4. 데이터 규약 (passages.json)

4.1. `courses`: `[{ id, title, passages }]`. passages는 level 오름차순(createCourse가 정렬을 보장하므로 데이터 순서는 무관하나 가급적 정렬해 둔다).
4.2. `passage`: `{ id, level, title, titleKr, sentences }`. id 유일. 전체 텍스트는 sentences.text를 이어 조합(따로 저장 안 함).
4.3. `sentence`: `{ text, chunks[{en,kr}], naturalTranslation, wordOrderPoint{title,explanation}, breakRules{allowed[{boundary,reason}],discouraged[{boundary,reason}]}, words[{word,nth?,meaning}], grammar[{label,note}], insight?{formula,why,wrong,natural} }`. **신 필드(naturalTranslation·wordOrderPoint·breakRules)는 옵셔널 - 없으면 `core/normalize.js:normalizeSentence`가 fallback을 채운다(customPassages 하위호환).**
   - `chunks`: en을 공백으로 이어 붙이면 원문과 일치(구두점·대소문자 제외). kr은 어순·구조가 드러나는 직독직해로 쓰고 단순 의역 금지. **chunks의 경계가 곧 대표 추천 끊기(채점의 recommended)**(core/chunking.js가 단어 수 누적으로 계산). 경계는 '끊는 기준' 팝업 규칙과 일치해야 하며, `chunkViolations` 4규칙(be동사·조동사 뒤 금지·짧은 주어 2단어 이하 뒤 동사 앞 금지·짧은 전치사구 2단어 이하 앞 금지·전치사가 앞 덩어리 끝에 남아 목적어와 갈림 금지, 콤마 뒤·that/to절은 예외)을 어기면 테스트가 실패한다 - 잘게 찢지 말고 의미 덩어리로 크게 묶는다.
   - `breakRules`: 끊기 5등급 채점의 허용/비추천 위치. `boundary`는 **0-based 토큰 틈 번호**(b번 단어와 b+1번 단어 사이, 유효 0~토큰수-2). `allowed`=대표 경계는 아니나 끊어도 자연스러운 위치, `discouraged`=끊으면 핵심 구조가 갈려 이해를 방해하는 위치. 각 `reason` 필수(비추천은 사용자가 실제 그은 위치의 이유만 해석 카드 상단에 노출). 대표 chunks 경계를 넣거나 allowed·discouraged 중복이면 validate 실패. 억지로 채우지 말 것(없으면 빈 배열). 채점 판정 = `core/chunking.js:gradeChunks`(recommended>allowed>discouraged>neutral, missed=안 그은 추천경계).
   - `naturalTranslation`: 문장 전체의 자연스러운 한국어 완역(직독직해 조각 잇기 금지). 검토 후 직독직해와 구분된 카드로 표시. 없으면 fallback(insight.natural → chunks.kr 이어붙임).
   - `wordOrderPoint`: 그 문장 핵심 어순·패턴 1개(`title`+`explanation`). 검토 후 기본 노출(상세 문법은 접힘). 없으면 fallback(grammar[0]).
   - `words`: 걸림돌 단어 + 뜻. **words에 등록된 주요 단어만 클릭·수집 대상**이다(일반 단어는 끊기 틈과의 오터치를 막기 위해 터치 비활성, 밑줄 표시 없음 - 2026-07-09 사용자 지시). word는 text에 실재(같은 단어 여러 번이면 nth 1-based). meaning은 한국어 뜻. 클릭=임시 수집(오렌지) → 해석 시 뜻 공개 + 단어장 영구 저장(선유추 후확인).
   - `grammar`: 그 문장에 포함된 모든 문법 요소(이름표 label + 한 줄 설명 note), 1개 이상 필수. 해석 채점 후 "문법 자세히 보기" 토글로 펼치는 접힘 목록(핵심 어순은 기본 노출, 상세 문법은 접힘).
   - `insight`: 구조적으로 어려운 문장에만(지문당 0~3개 - 쉬운 지문은 0 정당, 상한 3). 4필드 필수 - 검토 후 심화 카드(공식·왜·비문, 자연 해석은 naturalTranslation이 전담)로 열림(설정 토글).
4.4. 콘텐츠 보강 후 `node apps/english-reading/tests/run-node.mjs`로 무결성 자동 검증(죽은 입력 0·청킹 재구성·끊는 기준 위반 0·grammar 1개 이상·insight 4필드·words 실재·5등급 채점·breakRules 범위·중복·built-in strict 신 필드). built-in은 strict(신 필드 필수), 출제 화면·customPassages는 관대(신 필드 없어도 통과, 있으면 형식 검증).

# 5. 작업 시 주의

5.1. 색만으로 정보 전달 금지(접근성)가 기본이나, 본문 단어는 밑줄 등 표시 없이 깨끗하게 둔다(사용자 명시 지시). 임시 수집만 오렌지 배경으로 표시, 채점은 끊기 표시 위 모양(추천=청록 채운 원/허용=회색 빈 원/비추천=주황 삼각형/놓침=청록 삼각형/다른분할=마크 없음)으로 병행 구분(색만 아님). **빨간 X 폐기**(O/X 이진 → 5등급, 2026-07-15).
5.2. 검증은 정적 확인만으로 "됐다" 금지. browser-shot + playwright로 전 분기 실경로 재생 - / 선 긋기 토글·해석 채점 5등급(추천 청록●/허용 회색○/비추천 주황△/다른분할 연회색 마크없음/놓침 청록▾)·선택한 비추천 위치 이유 카드·직독직해와 자연스러운 완역 분리 카드·핵심 어순 기본 노출·상세 문법 접기/펼치기·주요 단어만 터치·검토 후 선·단어 잠금·단어 임시 수집(오렌지 하이라이트+토스트, 뜻 감춤)·해석 시 [단어-뜻] 리스트 공개+영구 저장·N회독 버튼·회독 시 clean slate·코스 클리어 모달·단어장 카드 펼침/삭제·구스키마 customPassage fallback·노출 설정 OFF까지.
5.3. 유닛 테스트: `tests/run-node.mjs` (core 순수 로직 + 데이터 무결성). 로직·데이터 변경 시 실행이 기본.
5.4. 배포는 `/web-deploy` (도메인 루트 `.claude/deploy.json`, smoke 셀렉터 `.passage-card`). SW 캐시 버전 bump는 루트 service-worker.js 소관.
5.5. 진행/완료/다음 작업은 `PROGRESS.md` 참조.

# 6. 비스코프

6.1. 타이핑 입력 / 서술형 답안.
6.2. 서버·백엔드·계정(서버리스 단독).
6.3. 다크 테마 토글.
6.4. 강제 객관식·문제 풀이·정답 판정(v0.2/v0.3과 함께 폐기).
6.5. 자동 복습 일정 알고리즘 - 회독은 사용자가 버튼으로 직접 돌리는 수동 루프까지만.
