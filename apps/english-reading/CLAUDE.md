# English Reading 작업 컨텍스트

이 파일은 english-reading 앱 작업 시 자동 로드되는 컨텍스트다. 작업 지침/핵심 정보/주의점만 둔다. 진행 로그는 `PROGRESS.md`. 허브 전체 규칙은 루트 `CLAUDE.md`, 자비스 도메인 운영은 루트 `.claude/`.

# 1. 앱 정의

1.1. **한 줄**: 다독의 흐름과 정독의 깊이를 한 화면에 합친 하이브리드 리딩 도구. 평소엔 지문을 시원하게 몰입해 읽고, 막히는 문장·단어·구조에서만 손끝으로 끊어 읽기·뜻·구조 해설을 꺼내 쓴다. 타이핑과 강제 문제 풀이는 없다.
1.2. **상태**: v0.6 하이브리드 독해 코드 구현 완료(2026-07-08). 기획서 `spec/index.html` v0.6과 정합. 이전 방향(v0.2 독해 사다리·v0.3 문법 스캔)은 커밋 이력·PROGRESS에만 존재.
1.3. **학습 흐름**(v0.7 긋기·검토 전환, 2026-07-08): 코스(난이도 완만 순 지문 묶음) → 지문 목록에서 고름 → 몰입 리딩 + 능동 연습 - 단어 사이 틈 클릭=/ 선 긋기(토글), 문장 끝 [/ 검토]=채점(맞음 파랑 유지·틀림 빨강 취소선·빼먹음 초록 점선) + 그때서야 끊어 읽기 해석·그 문장의 모든 문법 목록·(어려운 문장은) 구조 심화 카드 공개, 주요 단어 클릭=뜻 말풍선+단어장 자동 수집 → 읽기 완료(코스 진행률 +1) → 코스 전체 완주 시에만 클리어 연출. 검토 후 선은 잠금, 검토 버튼 재클릭은 해설 접힘/펼침 토글(채점 색 유지). 노출 설정 3종(긋기·검토 / 단어 / 심화 해설) 토글. 재독 시 수집 단어 옅게 표시.
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
    ├── main.js           # 화면 조립 + 클릭/이벤트 (DOM). 목록·읽기·단어장·설정
    ├── core/
    │   ├── tokenize.js   # 문장 토큰화 + nth 해석 (순수, DOM 미의존, 재사용)
    │   └── course.js     # 코스·지문·진행 순수 로직 (createCourse / courseProgress)
    └── data/
        └── passages.json # 코스별 지문 (콘텐츠 단일 진실)
```

# 3. 핵심 결정 (작업 시 반드시 준수)

3.1. **무빌드 정적 바닐라**. React/Tailwind 미사용. `<script type="module">` 직접 로드, shared/를 상대 경로로 공유.
3.2. **타이핑 0, 100% 클릭·터치**. 입력 필드·강제 문제 풀이·정답 판정 없음(흐름 우선 철학).
3.3. **라이트 테마 단독**. body 스코프에서 글로벌 다크 토큰을 라이트로 재정의. 테마 토글 없음.
3.4. **난이도 = 지문 자체(완만한 사다리)**. 지문에 level을 매겨 오름차순 정렬(한 편에 길이·구문·어휘 중 하나만 상승). 도움 노출량은 난이도가 아니라 학습자 설정. **클리어 = 코스 전체 완주**이고, 개별 지문 완독은 진행률만 채우며 연출을 두지 않는다.
3.5. **순수 로직은 core/에 격리**. tokenize·course는 DOM 미의존. main.js만 DOM을 만진다. courseProgress는 done 배열 주입으로 테스트 결정성 확보.
3.6. **상태는 기기 저장**(localStorage, `createStorage("english-reading")`): `done`(완독 지문 id), `reads`(지문별 회독수), `vocab`(단어+뜻+원문+출처), `settings`(노출 토글), `seenIntro`(첫 안내 1회).
3.7. **노출 설정 3종**(`chunks`/`words`/`scope`) 기본 전부 켜짐. OFF면 해당 상호작용·시각 요소를 비활성한다.
3.8. **standalone.html은 생성물**. 직접 수정 금지, 원본 수정 후 `tools/build-standalone.mjs` 재실행. 빌드는 치환 패턴(fetch 블록·SW 등록 줄) 미발견 시 즉시 실패 - 그 줄을 바꾸면 빌드 스크립트도 함께 갱신.

# 4. 데이터 규약 (passages.json)

4.1. `courses`: `[{ id, title, passages }]`. passages는 level 오름차순(createCourse가 정렬을 보장하므로 데이터 순서는 무관하나 가급적 정렬해 둔다).
4.2. `passage`: `{ id, level, title, titleKr, sentences }`. id 유일. 전체 텍스트는 sentences.text를 이어 조합(따로 저장 안 함).
4.3. `sentence`: `{ text, chunks[{en,kr}], words[{word,nth?,meaning}], grammar[{label,note}], insight?{formula,why,wrong,natural} }`.
   - `chunks`: en을 공백으로 이어 붙이면 원문과 일치(구두점·대소문자 제외). kr은 어순·구조가 드러나는 직독직해로 쓰고 단순 의역 금지. **chunks의 경계가 곧 / 검토 채점의 정답**(core/chunking.js가 단어 수 누적으로 계산).
   - `words`: 걸림돌 단어만 0~3개. word는 text에 실재(같은 단어 여러 번이면 nth 1-based). meaning은 한국어 뜻. 단어를 누르면 뜻 말풍선 + 단어장 자동 수집.
   - `grammar`: 그 문장에 포함된 모든 문법 요소(이름표 label + 한 줄 설명 note), 1개 이상 필수. / 검토 후 해석 아래에 전부 표시.
   - `insight`: 구조적으로 어려운 문장에만(지문당 1~3개). 4필드 필수 - 검토 후 문법 목록 아래에 심화 카드로 열림(설정 토글).
4.4. 콘텐츠 보강 후 `node apps/english-reading/tests/run-node.mjs`로 무결성 자동 검증(죽은 입력 0·청킹 재구성·grammar 1개 이상·insight 4필드·words 실재·채점 로직).

# 5. 작업 시 주의

5.1. 색만으로 정보 전달 금지(접근성). 주요 단어는 점선, 수집 단어는 배경 등 병행.
5.2. 검증은 정적 확인만으로 "됐다" 금지. browser-shot + playwright로 전 분기 실경로 재생 - / 선 긋기 토글·검토 채점 3색(맞음/틀림/빼먹음)·검토 후 잠금·검토 후에야 해석+문법 목록+심화 카드 공개·단어 뜻·자동 수집·말풍선 닫힘·읽기 완료 진행률·코스 클리어 모달·단어장 펼침/삭제·노출 설정 OFF·재독 known 표시까지.
5.3. 유닛 테스트: `tests/run-node.mjs` (core 순수 로직 + 데이터 무결성). 로직·데이터 변경 시 실행이 기본.
5.4. 배포는 `/web-deploy` (도메인 루트 `.claude/deploy.json`, smoke 셀렉터 `.passage-card`). SW 캐시 버전 bump는 루트 service-worker.js 소관.
5.5. 진행/완료/다음 작업은 `PROGRESS.md` 참조.

# 6. 비스코프

6.1. 타이핑 입력 / 서술형 답안.
6.2. 서버·백엔드·계정(서버리스 단독).
6.3. 다크 테마 토글.
6.4. 강제 객관식·문제 풀이·정답 판정(v0.2/v0.3과 함께 폐기).
6.5. 자동 복습 일정 알고리즘 - 회독은 사용자가 버튼으로 직접 돌리는 수동 루프까지만.
