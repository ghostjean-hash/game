# 중등 AUTHORING BATCH 06 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 `**` 대표형 1001~1200, `species`~`zero`. 중등 1,200 마지막 배치.

## 산출물

- `middle-authoring-batch-06.draft.txt`: 저작 초안(압축 표기, 표제어는 적지 않고 공식 순번으로만 지목).
- `middle-authoring-batch-06.json`: 공식 원천에서 표제어·순번·ID·별표 메타를 조립한 200개 카드.
- `middle-lexical-crosscheck-batch-06.md`: 사전 2곳 교차 대조 근거 요약.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-middle-batch.mjs 06`: 순번 1001~1200, 카드 200개. |
| 형식 검증 | 통과 | `validate-batch.mjs 06 --middle`: error 0 / warning 0(초기 warning 1건은 아래 수정). |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 06 --middle --fetch --report` 실제 조회. 두 사전 근거 확보 199건, 영어 위키낱말사전만 1건(`upon` - 다른 사전 API에 정의 없음, 위키낱말사전에 preposition으로 존재), 근거 없음 0건, 품사 불일치 0건. |
| 배치 간 내용 중복 | 통과 | `middle-crossbatch-check.mjs 06`: BATCH 01~05 1,000개와 대조해 뜻·예문·번역 중복 0건, 배치 내부 중복 0건. |
| 예문 관사·수 | 통과 | 한정사 누락 의심 후보 전수 판정 후 실제 오류 6건 수정. |
| 예문 어휘 수준 | 통과 | 예문 어휘를 초등 800 + 중등 1200 풀과 대조, 목표 단어보다 어려운 보조 어휘 5건 교체. |
| 1차 사실 검수 | 통과 | 대표 품사·뜻의 사전 정합, 예문 문법, 예문과 뜻의 일치, 번역 자연스러움을 200개 전수 재검토. |

## 수정 내역

### 1. 앞선 배치와 뜻이 겹쳐 구별한 것 (10건)

`surprise` 놀라게 하다→깜짝 놀라게 하다(BATCH 01 `amaze`), `suspect` 의심하다→혐의를 두다(02 `doubt`), `target` 목표→표적(01 `aim`, 예문도 교체), `technology` 기술→과학 기술(05 `skill`), `though` 비록 ~이지만→~이긴 하지만(01 `although`), `throw` 던지다→던져 보내다(01 `cast`), `tie` 묶다→끈으로 매다(01 `bind`), `tip` 조언→요령(01 `advice`), `whole` 전체의→온(02 `entire`), `wide` 넓은→폭이 넓은(01 `broad`).

### 2. 예문 문법·검증기 경고 (7건)

`strike` - 예문이 불규칙 과거형 `struck`뿐이라 목표 단어 미검출 경고. `Do not strike the glass.`로 원형을 살려 교체. 관사 누락 6건 - `state`(in a poor state), `stir`(for a few minutes), `structure`(a simple structure), `technique`(an old technique), `towel`(with a towel), `wage`(The daily wage rose).

### 3. 예문 보조 어휘 교체 (5건)

`sweater`(knitted→bought), `swallow`(pill→medicine), `trunk`(moss→birds), `tune`(hummed→sang), `vision`(surgery→glasses).

## 품사 분포

noun 109 / verb 45 / adjective 25 / preposition 7 / adverb 5 / conjunction 4 / determiner 2 / number 2 / auxiliary 1. 알파벳 뒷부분이라 기능어(`though`·`through`·`thus`·`till`·`toward`·`unless`·`until`·`upon`·`whether`·`which`·`while`·`within`·`without`·`would`·`yet`)가 몰려 있다. 관련형 보유 8개, 불규칙형 보유 8개(spend·spin·spread·steal·strike·sweep·swing·throw).

## 예문 길이

4단어 6 / 5단어 168 / 6단어 24 / 7단어 2.

## 중등 1,200 전체 마감 점검

BATCH 01~06 1,200개를 한꺼번에 재점검한 결과 - 공식 표제어 불일치 0, 단어 중복 0, 뜻 중복 0, 예문 중복 0. 전체 품사 분포는 noun 620 / verb 358 / adjective 157 / adverb 29 / preposition 14 / determiner 8 / conjunction 7 / number 3 / auxiliary 3 / pronoun 1이고, 예문 길이는 최소 4단어 최대 7단어 평균 5.2단어다. 관련형 보유 69개, 불규칙형 보유 33개.
