# 출제 패키지 시스템 PHASE B 1단계 계획 (2026-07-16)

## 0. 배경·확정

ChatGPT 제안 + Claude Code PHASE A 분석 + 사용자 확정(2026-07-16)의 산출 계획. 원 대화가 단일 진실 source이나 휘발 방지를 위해 이 문서로 고정한다.

최종 목표: 200지문 x 5문장 = 1,000문장을 여러 LLM(ChatGPT/Gemini/Claude 등)이 시간차로 나눠 만들어도 난이도·청킹·직독직해·문법·어휘 기준이 흔들리지 않게 한다. 이번(1단계)은 그 토대인 "어느 모델에 줘도 같은 규칙 + 같은 현재 상태 + 같은 앵커"를 전달하는 출제 패키지 생성까지.

## 1. 확정 결정 (사용자)

1.1. 범위: A안 1단계만 - 현재 콘텐츠 상태 런타임 분석 + 다음 배치 힌트 + 레벨 앵커 + 공통 출제 패키지 복사 + 생성물 기존 콘텐츠 대조. 보류: LLM 검수/수정 패키지, severity 3단계, 의미 유사도 NLP, 200슬롯 상세 UI, 대용량 분할, 앵커 자동선정.

1.2. 규칙 권위 (이원, 복사 금지):
- 자동 검증 규칙 권위 = `src/core/validate.js` (코드로 판정 가능: chunks 결합·필수필드·boundary·중복·words 실재·id/형식).
- 정성 출제 규칙 권위 = 출제 규칙 문서(영어 자연스러움·레벨 난이도·청킹 원칙·직독직해·번역/문법/지문 품질). 코드로 판정 불가.
- 출제 패키지 = 위 둘 + 현재 상태를 조립한 파생물(사람이 따로 편집하는 원본으로 만들지 않음).
- 금지: 같은 규칙을 main.js와 문서에 수작업 복사 / 출제화면과 standalone이 다른 규칙 사용 / validate.js가 정성규칙까지 검사한다고 주장 / 프롬프트가 판정 코드와 충돌.

## 2. 실제 데이터 근거 (2026-07-16 측정)

- 코스 1개(word-order-foundations), 지문 20, 문장 100, level 1~3.
- passage 스키마 키: id, level, **topic**, title, titleKr, sentences. (topic 필드 실재 - 12종)
- level 분포 {1:7, 2:8, 3:5}. 문장 길이 평균 level1 7.7 / level2 9.0 / level3 10.6 단어(오름 정렬 양호).
- topic 12종: Daily Life3 / Relationships3 / Travel2 / Science2 / Psychology2 / Technology2 / Games1 / Study1 / Health1 / Self Development1 / Language1 / Critical Thinking1.
- grammar label 67종(최다 "주격 관계대명사 that" 5회). words 117개(across·clearer만 2회, 사실상 유일).
- 제목 완전중복 0, 문장 완전중복 0(현재).

## 3. 아키텍처 (Claude Code 결정)

3.1. 신설 파일 1개: `src/core/authoring-index.js` (DOM 미의존 순수 로직). 정성 규칙 상수(AUTHORING_RULES)를 main.js에서 이리로 이관해 "정성 규칙 단일 권위 위치"를 코드 한 곳으로 못박는다. validate.js와 나란히 core에 두어 build-standalone이 이미 인라인.

3.2. 순수 함수:
- `analyzeContent(passages)` -> 인덱스 객체(아래 4장).
- `nextCurriculumHint(passages, index)` -> 다음 배치 힌트.
- `extractAnchors(passages, anchorIds)` -> 지정 id의 앵커(없으면 안전 생략).
- `buildAuthoringPackage(passages, opts)` -> 최종 패키지 문자열(규칙+양식+예시+상태+힌트+앵커+스키마+버전).
- `compareAgainstExisting(newPassage, passages)` -> 기존 대조 결과(id/제목/문장 완전중복, 정규화 제목중복, level/topic 힌트 불일치).

3.3. main.js는 위 모듈을 import해 출제 화면(renderAuthor)에서 (a)현재 상태 요약 표시 (b)"출제 패키지 복사" 버튼 (c)붙여넣기 검증 시 validatePassage + compareAgainstExisting 병행 표시. 기존 학습 화면 무변경.

3.4. build-standalone.mjs 인라인 목록에 authoring-index.js 추가(누락 시 standalone 미정의). AUTHORING_PROMPT 상수를 main.js에서 옮기므로 관련 참조 갱신.

## 4. authoring-index 출력 (analyzeContent)

```
{ totalPassages, totalSentences,
  levelDistribution:{1:7,...}, topicDistribution:{...}, grammarDistribution:{label:n},
  wordFrequency:{word:n}, titleDuplicates:[], exactSentenceDuplicates:[],
  normalizedTitleDuplicates:[], openingPhraseFrequency:{word:n},
  recentPassages:[마지막 N id/제목], overusedStructures:[임계 이상 grammar label] }
```

- underusedStructures: 목표 구조 리스트가 없으면 신뢰 계산 불가. 1단계는 빈 배열 + "목표 구조 도입(2단계) 후 지원"으로 명시(과장 금지). 대체로 topic 균형 힌트(적게 쓰인 topic) 제공.
- 의미 유사도: 미지원. 정규화 문자열 기반 완전동일/제목만. UI·문서에 한계 명시.
- customPassages: 기본 콘텐츠와 분리 집계(공식 진행률에 자동 합산 금지).

## 5. 커리큘럼 힌트 (파일 없이 상수+계산)

- 목표 200지문/1000문장은 authoring-index 내 CURRICULUM 상수(매직넘버 회피). 밴드는 목표값(강제 아님).
- 다음 지문 번호 = 공식 지문수 + 1(계산). id는 slug라 "번호 범위"가 아니라 "기존 id 목록(중복 금지)"을 전달.
- 권장 level: 분포에서 가장 적은 level 또는 최대 level 근방(초급 사다리 유지). 권장 topic: 가장 적게 쓰인 topic. 모두 목표값.

## 6. 앵커 (자동선정 안 함, 임시 최소 기본값)

- level별 lower/standard/upper 지원 구조. 기본은 level별 standard 1개로 시작(패키지 길이 관리).
- 임시 기본 앵커 id(근거: 각 level 대표성, 사용자 조정 가능):
  - level 1: `slow-morning-start` (가장 쉬운 기준점)
  - level 2: `quiet-cafe` (level 2 중간, Daily Life)
  - level 3: `choosing-good-information` (상한 기준점, 마지막 지문)
- 앵커 없으면 생략. 패키지 초과 시 축소 순서: upper/lower 생략 -> standard 1개.

## 7. 대조 검증 (compareAgainstExisting, validatePassage와 분리)

- validatePassage: 문장 자체 형식·스키마·자동규칙(유지, 회귀 금지).
- compareAgainstExisting: 기존 공식 콘텐츠와의 id중복/제목 완전중복/문장 완전동일/정규화 제목중복/권장 level·topic 불일치.
- 1단계는 severity 미도입. 기존 ok/errors 유지하되 출제화면 표시를 [형식 오류]/[기존 중복]/[커리큘럼 참고]로 구획.

## 8. 검증·산출 (사용자 요구 20항목 반영)

node 유닛(tests/run-node.mjs 확장): 집계·분포·중복검출·다음번호·패키지 필수블록·버전 포함·validatePassage 회귀·구스키마 customPassages 회귀·신규JSON id/문장 중복검출. browser-shot: 출제화면 상태요약·패키지 복사·붙여넣기 검증+대조·모바일폭·콘솔0·standalone 신규모듈 동작.

## 9. 진행 순서

기존 UI 변경 선행 커밋(완료, 7d441f1) -> 이 문서 -> authoring-index 구현 -> 유닛 -> 패키지 조립 -> 대조 -> 출제 UI -> browser 검증 -> standalone 재빌드/SW -> 문서화(권위 분리·한계) -> 신기능 커밋.

## 10. 알려진 한계·2단계 후보

- underusedStructures·의미 유사도는 1단계 미지원(명시).
- 2단계 후보: LLM 검수 패키지, 수정 패키지, severity, 목표 구조 리스트 기반 underused, level 밴드 확장(4+), customPassages->passages 병합 도구화.
