# English Reading 작업 컨텍스트

이 파일은 english-reading 앱 작업 시 자동 로드되는 컨텍스트다. 작업 지침/핵심 정보/주의점만 둔다. 진행 로그는 `PROGRESS.md`. 허브 전체 규칙은 루트 `CLAUDE.md`, 자비스 도메인 운영은 루트 `.claude/`.

# 1. 앱 정의

1.1. **한 줄**: 공부를 정말 못하는 사람이 영어 지문 한 편을 스스로 읽어내게 하는 "독해 사다리". 문맥으로 단어 뜻을 먼저 추측하고 나중에 확인하는 유추→확인→복습 3단계 훈련.
1.2. **상태**: 기획 v0.2 구현 완료(2026-07-07 전체 개선). 지문 3편 + 지문 고르기 + 3단계 흐름(추측→요지→정리) + 내 단어장·완료 기록(localStorage).
1.3. **타깃**: 영어 독해 중학생 수준, 단어·긴 문장·글 요지 세 곳 다 막히는 학습자. 좌절 없이 매일 한 편. 타이핑 없이 딸깍만으로 진행.
1.4. **위치**: game-hub 허브의 첫 "app"(게임 아님). `apps/_registry.json` 등록, 홈 앱 구역에서 진입.
1.5. **기획서**: `spec/index.html` (planning-deliverable 표준 준수 HTML). 앱 정의·타겟·전략·3단계 학습·MVP 범위의 단일 진실 source. 방향 변경 시 이 기획서를 먼저 갱신.

# 2. 파일 구조

```
apps/english-reading/
├── CLAUDE.md          # 이 파일
├── PROGRESS.md        # 진행 로그
├── index.html         # 진입점
├── style.css          # 앱 스코프 스타일 (라이트 테마 오버라이드 포함)
├── spec/
│   └── index.html     # 기획서 (HTML, planning-deliverable 표준 준수, 단일 진실 source)
├── tests/
│   └── run-node.mjs   # core 유닛 + passages.json 무결성 테스트 (node로 실행)
└── src/
    ├── main.js        # 화면 조립 + 클릭/이벤트 (DOM 의존): 지문 고르기 → 3단계 흐름
    ├── core/
    │   ├── tokenize.js  # 문장 토큰화 + 타겟 해석 (순수, DOM 미의존)
    │   └── lesson.js    # 학습 단계 전이(read→gist→summary)·결과 수집·보기 셔플 (순수)
    └── data/
        └── passages.json  # 지문 데이터 (콘텐츠 소스, 단일 진실)
```

# 3. 핵심 결정 (작업 시 반드시 준수)

3.1. **무빌드 정적 바닐라**. 허브 방침(서버리스 단독) 따라 React/Tailwind 미사용. 빌드 스텝 없이 `<script type="module">` 직접 로드. shared/(tokens·base·ui)를 상대 경로로 공유.
3.2. **타이핑 0, 100% 클릭**. 입력 필드 없음. 단어 클릭으로 문법 덫 판정, 문장/버튼 탭으로 해석 공개, 버튼으로 다음 문장.
3.3. **라이트 테마 단독**. 홈·게임은 다크 유지. 이 앱만 body 스코프에서 글로벌 다크 토큰을 라이트 값으로 재정의. 테마 토글 없음.
3.4. **학습 단위 = 지문 한 편**. 지문 고르기에서 시작해 문장별 추측(+구조 문항) → 요지 → 오늘의 정리로 끝난다. 완료 기록·새로 알게 된 단어는 localStorage(shared/storage.js, 네임스페이스 `english-reading`)에 저장 - "단어장에 담겼어요" 같은 화면 문구는 실제 저장과 일치해야 한다(유령 출력 0).
3.5. **순수 로직은 core/에 격리**. tokenize·lesson은 DOM에 의존하지 않는다(테스트·재사용 위해). main.js만 DOM을 만진다. 난수는 주입 가능(`rand` 인자)해 테스트 결정성 확보.
3.6. **보기 순서는 화면에 나갈 때마다 셔플**(`shuffleOptions`). 데이터의 answer 위치가 어디든 위치 암기·찍기가 안 통한다. 정오 표시는 색 + ✓/✗ 보조 신호 병행(접근성).

# 4. 데이터 규약 (passages.json)

4.1. `passages`: `[{ id, title, level, sentences, gistQ }]`. 지문 id는 유일해야 한다(완료 기록 키).
4.2. `sentences`: `[{ text, chunks, guessWords, structureQ? }]`.
   - `chunks`: `[{ en, kr }]` - 끊어읽기 해석. **en을 이어 붙이면 원문과 일치해야 한다**(구두점·대소문자 제외).
   - `guessWords`: `[{ word, options[3], answer, hint }]` - 추측 단어. word는 실제 text에 존재해야 한다(죽은 입력 0).
   - `structureQ`(어려운 문장만): `{ prompt, options[3], answer, label }`. label은 `_schema.labels`의 문법 이름표 6종 중 하나.
4.3. `gistQ`: `{ prompt, options[3], answer }` - 지문 요지 문항.
4.4. 지문은 자비스가 제작하고 사용자가 추후 보강한다. 보강 후 `node apps/english-reading/tests/run-node.mjs`로 무결성(4.1~4.3 전부) 자동 검증.

# 5. 작업 시 주의

5.1. 색만으로 정보 전달 금지(접근성). found/shake는 색 외 보조 신호(애니메이션 등) 병행.
5.2. 검증은 정적 확인만으로 "됐다" 금지. browser-shot + playwright 클릭 재생으로 타겟 하이라이트·툴팁·오답 흔들림·청킹 슬라이드·패턴 소진→전환 모달까지 실경로 전수 확인(html-game 검증 규율).
5.3. 유닛 테스트: `tests/run-node.mjs` (core 순수 로직 + 데이터 무결성). 로직·데이터 변경 시 실행이 기본.
5.4. SW PRECACHE에 apps 자산 등재는 루트 service-worker.js 소관. 파일 추가·경로 변경 시 캐시 버전 bump 필요(누락 시 배포 무효화 안 됨).
5.5. 진행/완료/다음 작업은 `PROGRESS.md` 참조.

# 6. 비스코프

6.1. 타이핑 입력 / 서술형 답안.
6.2. 서버·백엔드·계정(서버리스 단독).
6.3. 다크 테마 토글.
6.4. 수능형 객관식(초기 기획 폐기됨 - 청킹 훈련으로 전환).
