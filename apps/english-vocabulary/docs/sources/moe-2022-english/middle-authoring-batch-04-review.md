# 중등 AUTHORING BATCH 04 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 `**` 대표형 601~800, `load`~`promise`.

## 산출물

- `middle-authoring-batch-04.draft.txt`: 저작 초안(압축 표기, 표제어는 적지 않고 공식 순번으로만 지목).
- `middle-authoring-batch-04.json`: 공식 원천에서 표제어·순번·ID·별표 메타를 조립한 200개 카드.
- `middle-lexical-crosscheck-batch-04.md`: 사전 2곳 교차 대조 근거 요약.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-middle-batch.mjs 04`: 순번 601~800, 카드 200개. |
| 형식 검증 | 통과 | `validate-batch.mjs 04 --middle`: error 0 / warning 0. |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 04 --middle --fetch --report` 실제 조회. 두 사전 모두 근거 확보 200건, 근거 없음 0건, 품사 불일치 0건. |
| 배치 간 내용 중복 | 통과 | `middle-crossbatch-check.mjs 04`: BATCH 01~03 600개와 대조해 뜻·예문·번역 중복 0건, 배치 내부 중복 0건. |
| 예문 관사·수 | 통과 | 한정사 누락 의심 후보 전수 판정 후 실제 오류 3건 수정. |
| 예문 어휘 수준 | 통과 | 예문 어휘를 초등 800 + 중등 1200 풀과 대조, 목표 단어보다 어려운 보조 어휘 5건 교체. |
| 1차 사실 검수 | 통과 | 대표 품사·뜻의 사전 정합, 예문 문법, 예문과 뜻의 일치, 번역 자연스러움을 200개 전수 재검토. |

## 수정 내역

### 1. 앞선 배치와 뜻이 겹쳐 구별한 것 (5건) + 배치 내부 중복 (1건)

`moment` 순간→잠깐(BATCH 03 `instant`), `piece` 조각→한 조각(01 `chip`, 예문도 교체), `pitch` 던지다→공을 던지다(01 `cast`), `prize` 상→상품(01 `award`, 예문도 교체), `profit` 이익→수익(01 `benefit`). 배치 내부에서는 `possess`를 소유하다→지니다로 바꿔 같은 배치의 `own`(소유하다)과 구별.

### 2. 예문 문법 (3건)

`mushroom` - `We picked mushroom` → `mushrooms`(가산 복수). `occasion` - `on special occasion` → `on special occasions`. `profit` - `made small profit` → `made a small profit`.

### 3. 예문 보조 어휘 교체 (5건)

`loose`(screw→rope), `male`(pulse→patient), `mass`(clay→snow), `operate`(crane→machine), `patient`(surgery→in bed). 모두 목표 단어보다 어려운 보조 어휘를 쉬운 어휘로 교체.

## 품사 분포

noun 118 / verb 35 / adjective 33 / adverb 7 / determiner 2 / preposition 2 / pronoun 1 / conjunction 1 / auxiliary 1. 관련형 보유 14개, 불규칙형 보유 2개(lose→lost, mean→meant). 이 구간에는 기능어(`neither`·`nor`·`none`·`ought`·`per`·`plus`·`otherwise`)가 몰려 있어 품사가 앞 배치보다 다양하다.

## 예문 길이

4단어 10 / 5단어 118 / 6단어 69 / 7단어 3.
