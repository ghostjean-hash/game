# English Reading 1차 개편 실행 계획 (2026-07-15)

> 확정 사양(사용자 지시서)을 실제 파일·함수에 매핑한 실행 계획. 사양 본문은 재작성하지 않는다.
> 기준 문서: `docs/2026-07-15-current-state-analysis.md`(커밋 `ba3bddc`).
> 범위: O/X→추천/허용/비추천 3등급화 + 직독직해/자연해석 분리 + 핵심어순/상세문법 계층화 + 30문장 마이그레이션.
> 비스코프: 오디오·TTS·녹음·말하기·듣기그룹·문장 네비게이션·신규 100문장.
> 영향 범위(§3.7): **M** - core 로직 + 데이터 + UI + 빌드 동시 변경이나, 신규 필드를 옵셔널+fallback으로 설계해 기존 데이터·customPassages 보호.

## 1. 확정 설계 결정 (사양에서 내가 확정한 구현 방식)

1.1. **normalize는 core 신규 파일**: `src/core/normalize.js`에 `normalizeSentence(sentence)` 순수 함수 신설. 렌더(main.js)·검증(validate.js)·빌드(standalone)·테스트가 공용. DOM 미의존. customPassages 구스키마를 **영구 변환하지 않고** 렌더/채점 진입 시점에 이 함수로 안전 처리(사양 4번 우선안).

1.2. **채점 판정은 신 함수 추가, 기존 함수 보존**: `chunking.js`에 `gradeChunks(boundaries, allowedSet, discouragedSet, slashes)` 신설. 기존 `gradeSlashes`는 삭제하지 않고 유지(내부 재사용 + 기존 테스트 회귀 방지). 신 판정 반환 = `{ recommended[], allowed[], discouraged[], neutral[], missed[] }`.
   - recommended = 그은 선 ∩ 추천경계
   - allowed = 그은 선 ∩ allowedSet (추천경계 제외)
   - discouraged = 그은 선 ∩ discouragedSet
   - neutral = 그은 선 - (추천 ∪ allowed ∪ discouraged)
   - missed = 추천경계 - 그은 선
   - 우선순위 recommended > allowed > discouraged > neutral (한 선은 한 분류에만).

1.3. **boundary = 0-based 토큰 gap index** (기존 slashes 체계와 동일, 문자 인덱스 아님). 추천경계는 기존 `chunkBoundaries(tokens, chunks)`가 그대로 산출.

1.4. **UI 표시 순서**(buildDetail 재구성, 사양 8번):
   1. 직독직해(buildChunks) + **사용자 선택 vs 추천 비교** + 선택한 discouraged 위치의 이유
   2. 자연스러운 전체 해석(신 카드, 직독직해와 시각 구분)
   3. 이 문장에서 담은 단어(기존 buildCollectedWords)
   4. 핵심 어순(wordOrderPoint, 기본 노출)
   5. 상세 문법(buildGrammar, 기본 접힘 + "문법 자세히 보기" 토글)
   6. insight 심화 카드(buildScopeCard, settings.scope ON)

1.5. **판정 CSS 클래스**(사양 6번, 빨간 X 폐기·색+모양 병행):
   - `g-recommended`: 청록(--er-accent) + 추천 마크
   - `g-allowed`: 회색 + "가능" 마크
   - `g-discouraged`: 주황 + 개선 가이드 마크(경고 아님, X 금지)
   - `g-neutral`: 선 유지, 평가 마크 없음(약한 표시)
   - `g-missed`: 놓친 추천 위치 점선 오버레이 + 마크
   - 기존 `g-correct/g-wrong/g-missed`는 최종 렌더에서 미사용(CSS 정의는 즉시 삭제 안 해도 되나 신 클래스로 대체).

1.6. **validate 이중 모드**: `validatePassage(p, { strict })`. `strict:false`(기본, 출제화면·customPassages) = 신규 필드가 **있으면** 형식 검증, 없으면 통과(하위호환). `strict:true`(tests의 built-in 30문장) = 신규 필드 필수. boundary 범위·중복 검증은 신규 필드 존재 시 항상 적용.

## 2. 신규 스키마 (sentence, 전부 옵셔널)

```
{
  "text", "chunks":[{en,kr}], "words":[...], "grammar":[{label,note}], "insight":{...},   // 기존 유지
  "naturalTranslation": "자연스러운 전체 해석",                                             // 신규
  "wordOrderPoint": { "title": "핵심 어순/패턴", "explanation": "기본 한 줄 설명" },         // 신규
  "breakRules": {                                                                          // 신규
    "allowed":     [{ "boundary": 0, "reason": "허용 이유" }],
    "discouraged": [{ "boundary": 0, "reason": "비추천 이유" }]
  }
}
```
- `chunks`는 **개명하지 않고** 대표 추천 청킹으로 유지(customPassages 호환 비용 최소화).
- 향후 예약(이번엔 UI·로직 미구현): 듣기·말하기 필드는 스키마 문서에 옵셔널로만 언급, 코드 미참조.

## 3. fallback 규칙 (normalizeSentence 단일 지점)

| 신규 필드 | 없을 때 fallback |
|---|---|
| breakRules | `{ allowed:[], discouraged:[] }` |
| naturalTranslation | `insight.natural` → 둘 다 없으면 `chunks.kr` 이어붙인 임시 완역 |
| wordOrderPoint | `grammar[0]` → `{ title: grammar[0].label, explanation: grammar[0].note }` |
| grammar | `[]` |
| insight | 미표시(기존과 동일) |

customPassages·progress·vocab 등 localStorage 데이터는 **강제 삭제·초기화 안 함**.

## 4. 파일별 변경 매핑

1. **`src/core/normalize.js`** (신규): `normalizeSentence` + boundary Set 헬퍼(allowedBoundaries/discouragedBoundaries).
2. **`src/core/chunking.js`**: `gradeChunks` 신설(§1.2). 기존 함수 보존. breakRules 검증 헬퍼(범위·중복)는 validate에서 쓰도록 여기 또는 validate에 배치.
3. **`src/core/validate.js`**: 신규 필드 검증 + strict 모드(§1.6). naturalTranslation string / wordOrderPoint.title·explanation / breakRules 배열·reason 필수 / boundary 0~tokens.length-2 / allowed·discouraged 중복 금지 / 추천경계·discouraged 중복 금지 / 배열 내 중복 금지.
4. **`tests/run-node.mjs`**: 사양 13번 A~L 테스트 추가. 기존 테스트 유지, gradeChunks·normalize·built-in strict 무결성·구스키마 fallback 추가.
5. **`src/main.js`**:
   - `applyGrade`: gradeChunks + 신 클래스 매핑.
   - `buildChunks`: 추천 vs 사용자 선택 비교 표시 + 선택한 discouraged 이유(해석 카드 상단 또는 해당 위치 근처).
   - `buildNatural`(신규): 자연 완역 카드.
   - `buildWordOrder`(신규): 핵심 어순 기본 노출.
   - `buildGrammar`: 접기/펼치기(aria-expanded·키보드 접근, review-detail 전체 접기와 비충돌).
   - `buildDetail`: §1.4 순서로 재조립. 모든 sentence 접근 지점에 `normalizeSentence` 적용.
   - `AUTHORING_PROMPT`: 신 스키마 규칙 + 예시 1개 갱신(사양 11번).
6. **`style.css`**: g-recommended/allowed/discouraged/neutral/missed(§1.5) + 자연해석 카드 + 핵심어순 블록 + 문법 아코디언.
7. **`src/data/passages.json`**: 30문장 마이그레이션(§5).
8. **`tools/build-standalone.mjs`**: `normalize.js` read/stripExports 한 줄 추가(핵심 순서: storage→tokenize→course→chunking→normalize→validate→main). mustReplace 패턴 불변이라 나머지 무변경.
9. **`dist/standalone.html`**: 재생성(직접 수정 금지).
10. **`service-worker.js`**(루트): 캐시 버전 bump.
11. **`CLAUDE.md`(4장 데이터 규약)·`PROGRESS.md`**: 신 스키마·fallback·판정 등급 반영.

## 5. 30문장 마이그레이션 규칙 (사양 10번)

- 전 문장에 `naturalTranslation`·`wordOrderPoint` 추가. `breakRules.allowed`/`discouraged`는 **실제로 의미 있는 위치만**(억지 채움 금지, 없으면 빈 배열).
- naturalTranslation: insight 보유 16문장은 `insight.natural`에서 복사(insight.natural 삭제 안 함), 나머지 14문장은 실제 자연스러운 한국어 완역 신규 작성(직독직해 단순 연결 금지).
- 영어 원문·기존 chunks.en·words·grammar·insight **불변**. chunks.en 이어붙임 원문 일치 규칙 유지.
- wordOrderPoint 1개/문장. discouraged는 핵심 구조를 가르는 위치만.

## 6. 구현 순서 (사양 16번)

1. 분석 문서 커밋 확인(완료 - `ba3bddc`, english-reading 워킹트리 clean).
2. normalize.js + fallback 설계·작성.
3. chunking.js gradeChunks 확장.
4. validate.js 확장(strict 모드).
5. tests 선행 작성 후 통과.
6. main.js 표시 로직 개편.
7. style.css 신 상태 추가.
8. passages.json 30문장 마이그레이션.
9. AUTHORING_PROMPT 갱신.
10. browser-shot 전 분기 실행 검증(사양 15번 20 시나리오).
11. standalone 재빌드.
12. service-worker 버전 bump.
13. node 테스트 + browser-shot 최종 회귀.
14. CLAUDE.md·PROGRESS 갱신.
15. 커밋(english-reading 경로 한정).

중간 승인 없이 진행. 단, 기존 데이터 손실·구조 변경이 필요한 예상 밖 문제 발견 시 수정 전 보고.

## 7. 회귀 게이트 (완료 조건)

전 문장 한 화면 흐름 유지 / 문장별 해석 버튼 유지 / 추천·허용·비추천·neutral·missed 판정 정상 / 빨간 X 제거 / 비추천 이유 표시 / 직독직해·자연해석 분리 / 핵심어순 기본 표시 / 상세문법 접기·펼치기 / customPassages 하위호환 / 단어장·진행·회독 정상 / 30문장 마이그레이션 완료 / node 테스트 통과 / 콘솔 0 / standalone 재생성 / SW bump / 워킹트리 clean.
