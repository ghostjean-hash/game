# English Reading 작업 컨텍스트

이 파일은 english-reading 앱 작업 시 자동 로드되는 컨텍스트다. 작업 지침/핵심 정보/주의점만 둔다. 진행 로그는 `PROGRESS.md`. 허브 전체 규칙은 루트 `CLAUDE.md`, 자비스 도메인 운영은 루트 `.claude/`.

# 1. 앱 정의

1.1. **한 줄**: 세션 기반 문법 스캔 + 청킹 직독직해 훈련 앱. 한 문법 카테고리(가목적어 it, To부정사 형용사적 용법 등)를 40문제 단위로 뺑뺑이 집중 훈련하고, 문장 속 문법 핵심 단어를 클릭으로 찾아내면 설명 메시지로 즉시 확인한다.
1.2. **상태**: v0.3 (2026-07-08 사용자 지시로 전면 전환). 이전 "독해 사다리"(객관식 추측·지문·요지, v0.2)는 폐기 - spec/index.html 상단 v0.3 공지 참조. 이전 코드·데이터는 커밋 이력에만 존재.
1.3. **학습 흐름**: 화면 중앙 큰 문장 → 문법 핵심 단어 클릭(정답=초록 하이라이트+상단 설명 배너, 오답=흔들림) → 화면 터치 또는 '해석 보기'로 청킹(영-한 쌍) 슬라이드 공개 → 다음 문장. 40문제 도달 시 축하 모달과 함께 다음 카테고리로 강제 전환(마지막 뒤엔 처음으로 순환).
1.4. **위치**: game-hub 허브의 첫 "app"(게임 아님). `apps/_registry.json` 등록, 홈 앱 구역에서 진입.
1.5. **현행 스펙의 단일 진실 source**: 이 파일 + `src/data/grammar-bank.json` 규약(4장). spec/index.html은 이전 방향(v0.2)의 기록.

# 2. 파일 구조

```
apps/english-reading/
├── CLAUDE.md          # 이 파일
├── PROGRESS.md        # 진행 로그
├── index.html         # 진입점
├── dist/
│   └── standalone.html  # 단일 파일 버전 (생성물 - 직접 수정 금지, tools/build-standalone.mjs로 재생성)
├── style.css          # 앱 스코프 스타일 (라이트 테마 오버라이드 포함)
├── spec/
│   └── index.html     # 기획서 (v0.2 독해 사다리 기록 + v0.3 방향 전환 공지)
├── tests/
│   └── run-node.mjs   # core 유닛 + grammar-bank.json 무결성 테스트 (node로 실행)
├── tools/
│   └── build-standalone.mjs  # 원본에서 단일 HTML 재조립 (문장·코드 변경 시 재실행)
└── src/
    ├── main.js        # 화면 조립 + 클릭/이벤트 (DOM 의존). 상단 MAX_SESSION_COUNT=40
    ├── core/
    │   ├── tokenize.js  # 문장 토큰화 + 트랩 nth 해석 (순수, DOM 미의존)
    │   └── session.js   # 카테고리 순환·카운트·전환 상태 전이 (순수, maxCount 주입 가능)
    └── data/
        └── grammar-bank.json  # 카테고리별 문장 은행 (콘텐츠 소스, 단일 진실)
```

# 3. 핵심 결정 (작업 시 반드시 준수)

3.1. **무빌드 정적 바닐라**. 허브 방침(서버리스 단독) 따라 React/Tailwind 미사용. `<script type="module">` 직접 로드. shared/(tokens·base·ui)를 상대 경로로 공유.
3.2. **타이핑 0, 100% 클릭**. 입력 필드 없음. 단어 클릭으로 문법 스캔 판정, 화면 터치/버튼으로 해석 공개. 객관식 3지선다 없음(v0.2 잔재 금지).
3.3. **라이트 테마 단독**. 홈·게임은 다크 유지. 이 앱만 body 스코프에서 글로벌 다크 토큰을 라이트 값으로 재정의. 테마 토글 없음.
3.4. **세션 = 카테고리당 MAX_SESSION_COUNT(40)문제**. 상수는 main.js 상단(테스트 시 이 값만 조절). 카테고리 내 문장은 순환 반복, 도달 시 카운트 리셋 + 다음 카테고리 강제 전환 + 축하 모달. 저장 없음(새로고침 시 처음부터).
3.5. **순수 로직은 core/에 격리**. tokenize·session은 DOM에 의존하지 않는다. main.js만 DOM을 만진다. session은 maxCount 주입으로 테스트 결정성 확보.
3.6. **트랩 위치는 nth로 지정**. 같은 단어(to 등)가 여러 번 나오면 `traps.nth`(1-based)로 몇 번째인지 데이터가 정한다. 해석 실패 시 index -1로 방어(죽은 트랩 무시).
3.7. **standalone.html은 생성물**. 직접 수정 금지, 원본 수정 후 tools/build-standalone.mjs 재실행. 빌드 스크립트는 치환 패턴 미발견 시 즉시 실패한다 - main.js의 fetch 블록·SW 등록 줄을 바꾸면 빌드 스크립트도 함께 갱신.

# 4. 데이터 규약 (grammar-bank.json)

4.1. `categories`: `[{ id, title, sentences }]`. **배열 순서 = 카테고리 전환 순서**. id는 유일.
4.2. `sentences`: `[{ text, chunks, traps }]`. 카테고리당 최소 3문장.
   - `chunks`: `[{ en, kr }]` - 끊어읽기 해석. **en을 이어 붙이면 원문과 일치해야 한다**(구두점·대소문자 제외).
   - `traps`: `[{ word, nth?, type, message }]` - 찾아야 할 문법 핵심 단어. word는 실제 text에 존재(죽은 트랩 0), type은 소속 category id와 일치, message는 정답 시 상단 배너에 그대로 노출되는 문법 설명.
4.3. 문장은 자비스가 제작하고 사용자가 추후 보강한다. 보강 후 `node apps/english-reading/tests/run-node.mjs`로 무결성(4.1~4.2 전부) 자동 검증.

# 5. 작업 시 주의

5.1. 색만으로 정보 전달 금지(접근성). 정답 초록 하이라이트에 밑줄 병행, 오답은 흔들림 애니메이션.
5.2. 검증은 정적 확인만으로 "됐다" 금지. browser-shot + playwright 클릭 재생으로 오답 흔들림·정답 배너·터치 해석·40문제 완주·전환 모달까지 실경로 전수 확인.
5.3. 유닛 테스트: `tests/run-node.mjs` (core 순수 로직 + 데이터 무결성). 로직·데이터 변경 시 실행이 기본.
5.4. 배포는 `/web-deploy` (도메인 루트 `.claude/deploy.json`, smoke 셀렉터 `.sentence .word`). SW 캐시 버전 bump는 루트 service-worker.js 소관.
5.5. 진행/완료/다음 작업은 `PROGRESS.md` 참조.

# 6. 비스코프

6.1. 타이핑 입력 / 서술형 답안.
6.2. 서버·백엔드·계정(서버리스 단독).
6.3. 다크 테마 토글.
6.4. 객관식 문항(단어 뜻 3지선다 포함 - v0.2 독해 사다리와 함께 폐기).
6.5. 진행 저장·단어장(localStorage) - v0.2에서 폐기. 필요해지면 사용자 결정으로 재도입.
