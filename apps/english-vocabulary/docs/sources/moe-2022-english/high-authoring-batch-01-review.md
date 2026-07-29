# 고등 AUTHORING BATCH 01 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 무표시 대표형 1~200, abandon~coordinate.

## 산출물

- `high-authoring-batch-01.draft.txt`: 저작 초안(압축 표기, 표제어는 적지 않고 공식 순번으로만 지목).
- `high-authoring-batch-01.json`: 공식 원천에서 표제어·순번·ID·학교급 메타를 조립한 200개 카드.
- `high-lexical-crosscheck-batch-01.md`: 사전 2곳 교차 대조 근거 요약.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-high-batch.mjs 01`: 순번·표제어를 원천 `high-1000-cards.json`과 강제 대조. |
| 형식 검증 | 통과 | `validate-batch.mjs 01 --high`: error 0 / warning 0. |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 01 --high --fetch --report` 실조회. 두 사전 근거 200건, 근거 없음 0, 품사 불일치 0. |
| 고등 배치 간 내용 중복 | 통과 | `crossbatch-check.mjs --high 01`: 뜻·예문·번역 중복 0. |
| 학교급 사이 중복 | 통과 | `tier-cross-check.mjs high`: 초등 800·중등 1,200과 대조해 단어·예문·번역 중복 0. |
| 예문 관사·수 | 통과 | `article-screen.mjs --high` 후보 전수 사람 판정. |
| 예문 어휘 수준 | 통과 | 예문 어휘를 3,000 풀과 대조해 목표 단어보다 어려운 보조 어휘 교체. |
| 사전 정의 대조 | 통과 | 사전 첫 정의와 한국어 뜻을 200개 전수 사람 대조. |

## 수정 내역

1. 앞선 층과 뜻이 겹쳐 구별 8건 - abandon 버리다→포기하고 떠나다(중등 dump), acid 산→산성 물질(초등 mountain과 한글 동음), adequate 충분한→적당한(초등 enough), alongside ~옆에→~와 나란히(초등 beside), apology 사과→사과의 말(초등 apple과 동음), behave 행동하다→처신하다(초등 act), celebrate 축하하다→기념하다(초등 congratulate), commodity 상품→거래 물품(중등 prize)
2. 예문 보조 어휘 교체 3건 - alongside(pier→ship), beast(roamed→lived), cattle(grazed→ate grass)
3. 불규칙 활용만 쓴 예문 1건 - cling

## 품사 분포

noun 91 / verb 84 / adjective 22 / adverb 2 / preposition 1. 관련형 보유 21개, 불규칙형 보유 4개(arise·breed·broadcast·cling).

## 예문 길이

4단어 9 / 5단어 134 / 6단어 49 / 7단어 8. 절대 상한 12단어, 권장 상한 10단어 모두 여유.
