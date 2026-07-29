# 고등 AUTHORING BATCH 04 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 무표시 대표형 601~800, molecule~rural.

## 산출물

- `high-authoring-batch-04.draft.txt`: 저작 초안(압축 표기, 표제어는 적지 않고 공식 순번으로만 지목).
- `high-authoring-batch-04.json`: 공식 원천에서 표제어·순번·ID·학교급 메타를 조립한 200개 카드.
- `high-lexical-crosscheck-batch-04.md`: 사전 2곳 교차 대조 근거 요약.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-high-batch.mjs 04`: 순번·표제어를 원천 `high-1000-cards.json`과 강제 대조. |
| 형식 검증 | 통과 | `validate-batch.mjs 04 --high`: error 0 / warning 0. |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 04 --high --fetch --report` 실조회. 두 사전 근거 200건, 근거 없음 0, 품사 불일치 0. |
| 고등 배치 간 내용 중복 | 통과 | `crossbatch-check.mjs --high 04`: 뜻·예문·번역 중복 0. |
| 학교급 사이 중복 | 통과 | `tier-cross-check.mjs high`: 초등 800·중등 1,200과 대조해 단어·예문·번역 중복 0. |
| 예문 관사·수 | 통과 | `article-screen.mjs --high` 후보 전수 사람 판정. |
| 예문 어휘 수준 | 통과 | 예문 어휘를 3,000 풀과 대조해 목표 단어보다 어려운 보조 어휘 교체. |
| 사전 정의 대조 | 통과 | 사전 첫 정의와 한국어 뜻을 200개 전수 사람 대조. |

## 수정 내역

1. 배치 내부 뜻 중복 5건 - novel 소설→장편 소설, prohibit 금지하다→법으로 금하다, reside 거주하다→머물러 살다, reverse 뒤집다→거꾸로 하다, rid 없애다→치워 버리다
2. 앞선 층과 뜻이 겹쳐 구별 9건 - pace 속도→걸음 속도, perceive 알아차리다→감지하다, persuade 설득하다→설득해 움직이다, presume 추정하다→미루어 짐작하다, prompt 즉각적인→지체 없는, proof 증거→입증 자료, proportion 비율→비례 몫, province 주→지방 행정 구역(초등 week와 동음), roast 굽다→구워 익히다
3. 불규칙 활용만 쓴 예문 1건 - overcome
4. 예문 관사 2건 - prospect, routine

## 품사 분포

noun 90 / verb 75 / adjective 31 / adverb 4. 관련형 보유 19개, 불규칙형 보유 1개(overcome).

## 예문 길이

4단어 45 / 5단어 126 / 6단어 29. 절대 상한 12단어, 권장 상한 10단어 모두 여유.
