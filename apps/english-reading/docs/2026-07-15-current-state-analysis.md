# English Reading 현행 구현 정밀 분석 (2026-07-15)

> 목적: O/X→추천/허용/비추천 전환, 독해/듣기 분리, 직독직해/자연해석 분리, 문법 계층화, 독해→듣기→말하기 연결 개편이 가능한 구조인지 판정.
> 이 문서는 분석 전용이며 코드·UI·데이터를 변경하지 않는다. 근거는 실제 파일·함수·실행 검증(browser-shot).
> 분석 시점 커밋: `c22e274` 이후 워킹트리 clean. 로컬 실행 검증 완료(콘솔 에러 0).

---

## 1. 프로젝트 개요

- **프레임워크**: 무빌드 정적 바닐라 JS. React/Tailwind/번들러 없음. `index.html`이 `<script type="module" src="./src/main.js">`로 ES module을 직접 로드. shared/는 상대 경로(`../../../shared/`)로 공유.
- **실행 방식**: 정적 서버(`node scripts/dev-server.mjs 8000`, 루트 기준) 또는 GitHub Pages. SW(`service-worker.js`, 루트)로 PWA 캐시. `src/**/*.js`는 network-first(v166).
- **진입 파일**: `index.html`(30줄) - `topbar`(뒤로/제목/끊기토글 `#nav-chunk`/단어토글 `#nav-word`/단어장 `#nav-vocab`) + `bar`(진행률 `#bar-fill`) + `stage`(빈 `<main>`) 골격만 정적. 나머지는 `main.js`가 전부 동적 렌더.
- **디렉터리**:
  - `src/main.js`(829줄) - DOM 조립·이벤트 전부. 유일한 DOM 접점.
  - `src/core/` - 순수 로직 4종(DOM 미의존): `tokenize.js`(39), `course.js`(37), `chunking.js`(118), `validate.js`(66).
  - `src/data/passages.json`(1467줄) - 콘텐츠 단일 진실.
  - `shared/storage.js` - localStorage 네임스페이스 래퍼.
  - `dist/standalone.html` - 생성물(직접 수정 금지, `tools/build-standalone.mjs` 재생성).
  - `tests/run-node.mjs` - core 유닛 + 데이터 무결성.
- **상태 관리**: 전역 변수(`course`/`baseData`/`currentPassage`/`touchChunk`/`touchWord`) + localStorage. 프레임워크 상태관리 없음. 화면 전환 = `stage.innerHTML=""` 후 `renderXxx()` 재그림.
- **데이터 로딩**: `fetch("./src/data/passages.json", {cache:"no-cache"})` → `baseData` 저장 → `rebuildCourse()`(기본 지문 + localStorage `customPassages` 합침) → `renderList()`.

## 2. 실제 학습 흐름 (실행 검증 완료)

**요청서의 가정("문장 제출 → 판정 → 다음 문장 이동")과 실제 구조가 다르다.** 실제는 지문의 모든 문장이 한 화면에 세로로 렌더되고, 문장마다 개별 "해석" 버튼으로 그 문장만 채점한다. 문장 단위 네비게이션(next)이 없다.

1. **지문 선택**: `renderList()` - 코스 진행률 바 + `.passage-card` 목록(Lv·제목·상태[아직 안 읽음/읽는 중/완독]). 클릭 → `renderReading(p)`.
2. **읽기 화면**: `renderReading(p)` - `currentPassage`·`lastPassage` 저장. 첫 진입 1회 안내(`seenIntro`). `p.sentences.forEach`로 전 문장을 `renderSentence()`로 렌더. 맨 아래 "N회독 완료" 버튼.
3. **문장 표시**: `renderSentence(s, i, p, settings)` - `tokenize(s.text)`로 단어 span(`.w`), 단어 사이 틈 버튼(`.gap` + `.gap-hit` 오버레이), 문장 끝 "해석" 버튼(`.review-btn`).
4. **끊어읽기 입력**: `.gap` 클릭 → `slashes` Set 토글 + `.slashed` 클래스 + `persist()`(localStorage `progress`).
5. **단어 입력**: 뜻 등록된 주요 단어(`.w.word`) 클릭 → `flagged` Map에 임시 수집(오렌지 `.flagged`) + 토스트. (일반 단어는 터치 비활성 - 오터치 방지.)
6. **제출·판정**: "해석" 버튼 첫 클릭 → `reviewed=true`, `applyGrade()` 채점 + `buildDetail()`(해석+수집단어+문법+심화) 삽입. 이후 클릭 = `detail.hidden` 토글(전체 접기/펼치기). 채점 후 선·단어 잠금(`if(reviewed)return`).
7. **해석 표시**: `buildChunks(s)` - 청크별 en + 이유 태그(`chunk-why`) + kr(직독직해).
8. **문법 표시**: `buildGrammar(s)` - 문법 전부 기본 노출. `buildScopeCard(s)` - insight 4필드(settings.scope ON일 때만).
9. **다음 이동**: 문장별 이동 없음. 세로 스크롤로 다음 문장. 지문 완료 = "N회독 완료" 버튼(`finishRound`).
10. **완료 저장**: `finishRound(p)` - `reads[p.id]++`, `done`에 추가, `clearPassageProgress`(그은 선·임시단어 리셋=clean slate), 코스 전체 완주 첫 달성 시 `showClearModal()`, 아니면 같은 지문 재렌더(다회독).

## 3. 끊어읽기 입력 및 판정 구조

- **입력 방식**: 단어 사이 틈(`.gap` 버튼) 클릭으로 `/` 선 토글. 틈 번호 = i번 토큰과 i+1번 토큰 사이(**0-based 토큰 인덱스**). `slashes`는 그은 틈 번호의 Set.
- **boundary 식별**: `core/tokenize.js`의 `tokenize()`가 공백 분리로 `{index, raw, clean}` 토큰 생성. 틈은 0..n-2. 즉 **토큰(단어) 인덱스** 기반이며 문자열 인덱스가 아니다.
- **정답 데이터 형태**: 별도 정답 필드 없음. `chunks[].en`의 **단어 수 누적**이 곧 정답 경계. `core/chunking.js:chunkBoundaries(tokens, chunks)`가 `chunks[i].en`의 단어 수를 누적해 gap 번호 Set을 만든다. "데이터가 곧 정답지".
- **판정 로직 위치**: `core/chunking.js:gradeSlashes(boundaries, slashes)` - 순수 함수. `main.js:applyGrade()`(275줄)가 호출.
- **판정 결과**: **3분류지만 본질은 이진(정답/오답)**. `correct`(그었고 정답)/`wrong`(그었지만 오답)/`missed`(정답인데 안 그음). 추천도·허용 개념 없음.
- **표시 로직**: `applyGrade()`가 gap 요소에 `g-correct`/`g-wrong`/`g-missed` 클래스 부여. CSS `::before`로 색+도형 병행: 맞음=빈 붉은 원(테두리), 틀림=✕, 빠뜨림=▾ 삼각형(세 마크 모두 `#dc2626`, 색은 동일하고 모양으로 구분 - 접근성).
- **입력≠정답 처리**: `wrong`(오답 위치)은 연회색 ✕, `missed`(놓친 정답)은 `.slashed`도 추가돼 붉은 `/`+▾ 표시. 무르지 않고 잠금.
- **복수 정답 지원**: **없음.** `chunks`는 문장당 단일 세트. 대안·허용·비추천 위치를 담는 필드가 데이터·로직 어디에도 없다.
- **인덱스 종류**: **토큰(단어) 인덱스** 단일 사용. 문자열 인덱스·문자 오프셋 미사용.

## 4. 현재 데이터 스키마

- **위치·개수**: `src/data/passages.json` 1개 파일. 1코스(`mind-laws`), 6지문(level 1~6), **30문장**(지문당 5). insight 보유 16/30. grammar 총 90(문장당 평균 3.0, 1~4). words는 문장당 1~3, **nth 실사용 0건**(스키마에만 정의).
- **최상위**: `{ _schema, courses }`. `_schema`는 자기 문서화 블록(규약 명시). `courses[]` = `{id, title, passages}`.
- **passage**: `{id, level, title, titleKr, sentences}`. 전체 텍스트 필드 없음(sentences.text 조합).
- **sentence 필드 전수**(5종):

| 필드 | 필수 | 구조 | 사용처(main.js) |
|---|---|---|---|
| `text` | 30/30 | string | `tokenize()`, 화면 표시 |
| `chunks` | 30/30 | `[{en,kr}]` | `chunkBoundaries`(정답), `buildChunks`(해석), `chunkReasons`(이유) |
| `words` | 30/30 | `[{word,nth?,meaning}]` | 주요 단어 터치·수집, `meaningByClean` |
| `grammar` | 30/30 | `[{label,note}]` | `buildGrammar`(전부 노출) |
| `insight` | 16/30 | `{formula,why,wrong,natural}` | `buildScopeCard`(scope ON) |

- **chunks**: `en` 이으면 원문 일치(구두점 제외, 실측 확인). `kr`은 직독직해(의역 금지 규약). en에 구두점 포함 여부는 조각마다 혼재(`"on a crowded street,"` vs `"You spilled some coffee"`).
- **자연스러운 해석(의역)**: **독립 필드 없음.** `insight.natural`에만 문장 전체 완역이 담기고, insight 없는 **14문장은 자연 완역이 아예 부재**(직독직해 조각만).
- **미사용/UI 의존**:
  - `nth`: 스키마 정의됐으나 데이터 0건(향후 반복 단어 지문의 첫 사용처).
  - `--known`(#fef3c7) CSS 토큰: style.css에서 소비처 없음(관찰).
  - grammar/chunks/insight 모두 특정 render 함수와 1:1 강결합(아래 5·9 참조).
- **하드코딩 데이터**: `main.js:AUTHORING_PROMPT`(555줄~)에 출제 규칙+양식 예시가 현 스키마 그대로 문자열 하드코딩. 스키마 변경 시 동기 수정 필수.
- **사용자 생성 데이터**: `customPassages`(localStorage)가 동일 스키마로 저장됨 → 스키마 변경 시 기존 사용자 데이터 하위호환 필요(위험).

## 5. 해석·문법 UI 구조

- **직독직해 vs 자연해석 분리 여부**: 부분적. 직독직해는 `chunk-kr`(청크별), 자연해석은 `insight.natural`(문장 전체, 16문장만). **모든 문장에 대한 자연해석 표시는 불가**(데이터 부재).
- **문법 노출**: 기본 전량 노출. `buildGrammar(s)`가 `s.grammar` 전체를 `.grammar-row`(태그+노트)로 렌더. **접기/펼치기 없음.**
- **문장당 문법 개수**: 1~4개(평균 3.0).
- **반례·상세 구조**: `insight`(`buildScopeCard`)에 `formula`(공식)/`why`(왜)/`wrong`(비문 예, `.wrong-example` 붉은 배경)/`natural`(자연 해석) 4블록. settings.scope ON일 때만.
- **렌더 위치**: "해석" 버튼 첫 클릭 시 `buildDetail()`이 순서대로 삽입 - ①`buildChunks`(직독직해) ②`buildCollectedWords`(임시수집 단어 뜻) ③`buildGrammar`(문법 전량) ④`buildScopeCard`(insight, scope ON). 네 카드가 한 덩어리(`.review-detail`).
- **접기 메커니즘**: 아코디언 CSS 없음(`details`/`aria-expanded`/`max-height` 전이 전무). "해석" 버튼 재클릭이 `.review-detail` 전체를 `hidden` 토글할 뿐. **개별 카드(문법만/해석만) 접기 불가.** 카드 등장은 `er-pop`/`er-slide` 키프레임.

## 6. 오디오·말하기 구현 상태

- **전무.** `src/` 전체 grep 결과 `Audio`/`speak`/`SpeechSynthesis`/`TTS`/`MediaRecorder`/`getUserMedia`/`listening`/`senseGroup`/녹음/발음/따라 코드 **0건**.
- 데이터에도 `audio`/`audioUrl`/`senseGroups`/`phonetic`/`ipa` 필드 **0건**.
- TTS·오디오 파일·구간 재생·녹음·따라읽기·발음평가·문장 변형(speaking variation) 전부 미구현. 듣기/말하기는 완전 신규 영역.

## 7. 상태 저장 구조

- **저장소**: localStorage, `createStorage("english-reading")` → 키 접두 `gg.english-reading.`. 서버·계정 없음(서버리스 단독).
- **키 목록**(main.js 실측):

| 키 | 내용 | 갱신처 |
|---|---|---|
| `done` | 완독 지문 id 배열 | `finishRound` |
| `reads` | `{pid: 회독수}` | `finishRound` |
| `vocab` | `[{wordKey,word,meaning,sentence,passageId,passageTitle}]` | `collectWord` |
| `settings` | `{chunks,words,scope}` 노출 토글 | `openSettings` |
| `seenIntro` | 첫 안내 1회 | `renderReading` |
| `customPassages` | 사용자 출제 지문 배열 | `renderAuthor` |
| `progress` | `{pid:{sentences:[{slashes,flags,reviewed}]}}` | `saveSentenceState` |
| `lastPassage` | 마지막 읽던 지문 id | `renderReading` |
| `touch` | `{chunk,word}` 터치 토글 | `saveTouch` |

- **문장 진행도**: `progress[pid].sentences[si]`에 `slashes`(그은 틈)/`flags`(임시 수집 단어)/`reviewed`(해석 확인) 저장·복원.
- **정답 여부**: **저장 안 함.** 매 렌더 시 `chunkBoundaries`로 재계산.
- **사용자 청킹**: `slashes`로 저장.
- **해석 확인 여부**: `reviewed` 저장.
- **복습 기록**: `reads`(회독수)만. 자동 복습 일정 없음(수동 루프, 비스코프).

## 8. 주요 파일 목록과 역할

| 파일 | 역할 | 개편 시 핵심 |
|---|---|---|
| `index.html` | topbar/bar/stage 골격 정적 | 새 토글·버튼 추가 지점 |
| `src/main.js` | DOM 조립·이벤트 전부(유일 DOM 접점) | 거의 모든 개편이 여기 통과 |
| `src/core/tokenize.js` | 토큰화 + nth 해석 | 인덱스 체계 근간 |
| `src/core/chunking.js` | 경계 계산·채점·이유·위반검사 | O/X→3단계, 복수정답의 핵심 |
| `src/core/course.js` | 코스 정렬·진행률 | 개편 영향 적음 |
| `src/core/validate.js` | 출제 검증 + 스마트따옴표 정규화 | 스키마 변경 시 동기 |
| `src/data/passages.json` | 콘텐츠(1코스 6지문 30문장) | 마이그레이션 대상 |
| `shared/storage.js` | localStorage 래퍼 | 변경 불요 |
| `dist/standalone.html` | 생성물 | 원본 수정 후 재빌드 |
| `tools/build-standalone.mjs` | standalone 빌드(치환 패턴) | 구조 변경 시 갱신 |
| `tests/run-node.mjs` | core 유닛 + 데이터 무결성 | 판정/스키마 변경 시 회귀 |
| `service-worker.js`(루트) | PWA 캐시 버전 | 배포 시 bump |

## 9. 예정 개편별 영향도

### 9-1. O/X → 추천/허용/비추천
- **충돌**: `gradeSlashes`가 boundaries(단일 Set) 대조 이진 판정. 3등급 개념 없음.
- **수정 대상**: `core/chunking.js`(gradeSlashes 3등급화 + 신 판정 함수), `main.js:applyGrade`(클래스 매핑), `style.css`(.gap 판정 클래스·마크 확장), 데이터(허용/비추천 위치).
- **난이도**: 중. **기존 데이터 호환**: 부분(현 chunks=추천 경계로 재활용 가능, 허용/비추천은 신규). **회귀 위험**: `tests`의 gradeSlashes/채점 케이스, `chunkViolations`. **선행**: 데이터 스키마 설계(9-2와 묶어야 함).

### 9-2. 단일 chunks → 대표 청킹 + 허용 대안 + 비추천
- **충돌**: `chunkBoundaries`가 chunks 단일 배열만 소비. 대안 표현 불가.
- **수정 대상**: 데이터 스키마(예: `chunks`=대표 유지 + `allowBoundaries`/`avoidBoundaries` 토큰 인덱스 배열 신설), `chunkBoundaries`(대표), 신 판정 함수(허용/비추천 대조), `validate.js`, `AUTHORING_PROMPT`.
- **난이도**: 중~상. **호환**: 대표=기존 chunks로 자동 호환, 대안 필드 없으면 빈 배열 fallback. **회귀**: 채점·검증 테스트. **선행**: 9-1과 동일 설계로 통합.

### 9-3. 직독직해 vs 자연스러운 해석 분리
- **충돌**: 자연 완역이 insight.natural(16문장)에만 존재. 14문장 부재.
- **수정 대상**: 데이터(sentence에 `natural`/`freeTranslation` 필드 신설 + 30문장 채움), `main.js:buildChunks`/신 카드, `validate.js`(필수화 여부), `AUTHORING_PROMPT`.
- **난이도**: 중(로직 작음, **콘텐츠 작업량 큼** - 14문장 신규 번역). **호환**: insight.natural에서 이관 가능(16문장), 14문장 신규. **회귀**: 데이터 무결성 테스트. **선행**: 스키마 확정.

### 9-4. 핵심 어순 기본 노출 + 상세 문법 접기
- **충돌**: 현재 grammar 전량 무조건 노출, 접기 UI·CSS 전무.
- **수정 대상**: 데이터(grammar를 핵심/상세 구분 - 신 필드 또는 첫 항목=핵심 규약), `main.js:buildGrammar`(계층 렌더 + 토글), `style.css`(아코디언 신설).
- **난이도**: 중. **호환**: 규약으로 흡수 가능(첫 grammar=핵심)하면 데이터 무변경도 가능. **회귀**: 낮음(표시층). **선행**: 핵심/상세 구분 기준 결정.

### 9-5. readingChunks vs listeningSenseGroups 분리
- **충돌**: 현 chunks가 독해 채점 겸용. 듣기 리듬 그룹 없음.
- **수정 대상**: 데이터(`listeningSenseGroups` 신설 or chunks에서 파생), `chunkBoundaries`는 readingChunks 참조로 명시, 듣기 UI 신규.
- **난이도**: 상(데이터 대량 + 신 개념). **호환**: readingChunks=기존 chunks로 호환, 듣기 그룹 신규. **회귀**: 채점 로직 명칭·참조. **선행**: 6(오디오)과 함께, 스키마 확정.

### 9-6. 전체 자연 음성의 구간 재생
- **충돌**: 오디오 전무.
- **수정 대상**: TTS(SpeechSynthesis) 또는 오디오 파일 + 구간 타임스탬프 데이터, `main.js` 재생 컨트롤 UI, (파일 방식이면)에셋·SW 캐시.
- **난이도**: 상(완전 신규). **호환**: 무관(신규). **회귀**: 낮음(독립 기능). **선행**: TTS vs 파일 결정, 9-5(구간=senseGroups) 연동.

### 9-7. 말하기용 문장 변형 데이터
- **충돌**: 없음(신규 영역).
- **수정 대상**: 데이터(`speaking`/변형 필드), `main.js` 말하기 UI, (선택)녹음·평가.
- **난이도**: 상(완전 신규, 특히 평가). **호환**: 무관. **회귀**: 낮음. **선행**: 6·5 이후.

### 9-8. 기존 콘텐츠 데이터 마이그레이션
- **충돌**: 스키마 변경 시 30문장 + `customPassages`(localStorage 사용자 데이터) 동시 대상.
- **수정 대상**: `passages.json` 30문장 변환, `validate.js`·`tests` 갱신, `AUTHORING_PROMPT` 갱신, `customPassages` 로드 시 하위호환(신 필드 없을 때 기본값) 또는 1회 마이그레이션 로직.
- **난이도**: 중~상. **호환**: 신 필드를 옵셔널+fallback으로 설계하면 무중단. **회귀**: 전체 데이터 테스트. **선행**: 모든 스키마 확정 후 마지막.

## 10. 유지해야 할 기존 기능

- 무빌드 정적 바닐라 + 라이트 테마 단독 + 타이핑 0(클릭·터치).
- 토큰 인덱스 기반 끊어읽기 입력(`.gap`/`.gap-hit` 오버레이 오터치 대책 포함).
- 끊기/단어 독립 토글, 노출 설정 3종(chunks/words/scope).
- 선유추 후확인 단어 수집(임시 flag → 해석 시 뜻 공개+영구 저장), 단어장.
- 다회독 clean slate 루프, 코스 전체 완주 클리어.
- 진행 저장·복원(progress), 문제 출제(customPassages)+검증(validatePassage)+스마트따옴표 정규화.
- 접근성(색+모양 병행), 진행률 바.

## 11. 제거 또는 교체가 필요한 기능

- **교체**: `gradeSlashes` 이진 판정 → 추천/허용/비추천 3등급(단, 하위호환 위해 확장이 안전).
- **교체**: `.gap` 판정 CSS 3클래스 → 등급 표현 확장.
- **재검토**: `buildGrammar` 전량 노출 → 계층화. `buildChunks`의 chunk-kr 단독 → 직독직해/자연해석 병렬.
- **제거 대상 없음(순수)**: 현 기능 중 완전 삭제가 강제되는 것은 없음. 대부분 확장·병렬 추가로 흡수 가능.
- **주의**: `AUTHORING_PROMPT` 하드코딩 문자열은 스키마 변경 시 반드시 동기 수정(제거가 아니라 갱신).

## 12. 기술적 위험 요소

1. **customPassages 하위호환**: 사용자 localStorage에 구스키마 지문 저장됨. 스키마 변경 시 렌더·검증이 신 필드 부재를 방어하지 못하면 기존 사용자 데이터가 깨진다. → 신 필드는 옵셔널+fallback 필수.
2. **AUTHORING_PROMPT·validate·build-standalone 3중 동기**: 스키마가 세 곳(데이터/출제규칙 문자열/검증/빌드 치환)에 흩어져 있어 한 곳만 바꾸면 불일치.
3. **채점 로직 연쇄**: `chunkBoundaries`/`gradeSlashes`/`chunkViolations`/`chunkReasons`가 chunks 단일 정답을 공유 가정. 3등급·복수정답 시 4함수+테스트 연쇄 수정.
4. **자연해석 데이터 공백**: 14문장 완역 부재 - "모든 문장 자연해석" 기능은 콘텐츠 작업이 선행 필수(기능만으론 빈 화면).
5. **전 문장 한 화면 렌더**: 문장별 오디오/말하기 컨트롤 추가 시 DOM·이벤트 부담 증가(현재도 지문 전체를 한 번에 그림).
6. **생성물·캐시**: standalone 재빌드 + SW 버전 bump 누락 시 배포 미반영(기존 반복 사고).

## 13. 권장 구현 순서

1. **스키마 통합 설계**(9-1·9-2·9-3·9-4·9-5·9-8을 아우르는 확장 스키마 1회 설계) - 모든 신 필드를 옵셔널+fallback으로. customPassages 하위호환 규약 포함.
2. **데이터 계층: 직독직해/자연해석 분리(9-3) + 문법 계층화(9-4)** - 표시층 위주, 회귀 낮음. 먼저 손에 잡히는 학습 가치.
3. **채점 3등급화(9-1·9-2)** - core/chunking + 테스트. 데이터 대안 필드 채움.
4. **독해/듣기 리듬 분리(9-5)** - readingChunks 명시 + listeningSenseGroups 데이터.
5. **오디오 구간 재생(9-6)** - TTS vs 파일 결정 후.
6. **말하기 변형(9-7)** - 마지막.
7. **콘텐츠 마이그레이션(9-8)** - 각 단계마다 점진 적용, 최종 일괄 검증.

## 14. 분석 중 확인하지 못한 항목

- **실기기 아이폰 검증**: 로컬(127.0.0.1)·데스크톱 크롬만 실행. 실제 아이폰 동작은 미검증(직전 스마트따옴표 수정도 코드·데스크톱 검증까지).
- **customPassages 마이그레이션 실동작**: 구스키마 사용자 데이터가 실제 존재하는 기기에서의 거동 미확인(로컬 store 비어 있음 기준).
- **--known 토큰 소비처**: style.css에 정의만, 소비 셀렉터 없음. main.js 인라인 사용 여부 추가 확인 필요(현재 grep상 재독 known 표시는 제거됨).
- **다회독 시 유령 상태**: finishRound의 clearPassageProgress가 모든 엣지(중간 이탈·재진입)에서 깨끗한지 전수 미검증.

## 15. 다음 구현 지시서에 반드시 포함해야 할 사항

1. **확장 스키마 확정본**: 신 필드명(허용/비추천 경계, 자연해석, 문법 핵심/상세, 듣기 그룹, 오디오/말하기)과 각 필드의 옵셔널 여부·fallback 규칙. 토큰 인덱스 기준(0-based, 틈=i번과 i+1번 사이) 명시.
2. **customPassages·AUTHORING_PROMPT·validate·build-standalone 동기 갱신을 한 작업 단위로 묶을 것**(스키마 흩어짐 위험 2).
3. **채점 등급 정의**: 추천/허용/비추천의 판정 규칙과 시각 표현(색+모양 병행 유지, `#dc2626` 단색 관행 재검토).
4. **자연해석 14문장 콘텐츠 작업 포함**(기능만으론 공백).
5. **문법 핵심/상세 구분 기준**(첫 항목=핵심 규약 vs 신 필드).
6. **오디오 방식 결정**(TTS SpeechSynthesis vs 오디오 파일+타임스탬프)과 구간 재생이 listeningSenseGroups와 연동되는지.
7. **회귀 게이트**: `tests/run-node.mjs` 확장(신 스키마 무결성 + 3등급 채점) + browser-shot 전 분기 재생 + SW bump + standalone 재빌드.
8. **"기존 UI 유지" 범위 확정**: 전 문장 한 화면·문장별 해석 버튼 구조를 유지할지, 문장 단위 네비게이션으로 바꿀지(요청서 가정과 실제가 다름 - 명시 필요).
