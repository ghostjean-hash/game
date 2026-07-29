# 고등 AUTHORING BATCH 05 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 무표시 대표형 801~1000, sack~zone.

## 산출물

- `high-authoring-batch-05.draft.txt`: 저작 초안(압축 표기, 표제어는 적지 않고 공식 순번으로만 지목).
- `high-authoring-batch-05.json`: 공식 원천에서 표제어·순번·ID·학교급 메타를 조립한 200개 카드.
- `high-lexical-crosscheck-batch-05.md`: 사전 2곳 교차 대조 근거 요약.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-high-batch.mjs 05`: 순번·표제어를 원천 `high-1000-cards.json`과 강제 대조. |
| 형식 검증 | 통과 | `validate-batch.mjs 05 --high`: error 0 / warning 0. |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 05 --high --fetch --report` 실조회. 두 사전 근거 200건, 근거 없음 0, 품사 불일치 0. |
| 고등 배치 간 내용 중복 | 통과 | `crossbatch-check.mjs --high 05`: 뜻·예문·번역 중복 0. |
| 학교급 사이 중복 | 통과 | `tier-cross-check.mjs high`: 초등 800·중등 1,200과 대조해 단어·예문·번역 중복 0. |
| 예문 관사·수 | 통과 | `article-screen.mjs --high` 후보 전수 사람 판정. |
| 예문 어휘 수준 | 통과 | 예문 어휘를 3,000 풀과 대조해 목표 단어보다 어려운 보조 어휘 교체. |
| 사전 정의 대조 | 통과 | 사전 첫 정의와 한국어 뜻을 200개 전수 사람 대조. |

## 수정 내역

1. 배치 내부 뜻 중복 2건 - stimulate 자극하다→활발하게 하다(provoke), terror 공포심→극심한 두려움(horror)
2. 앞선 층과 뜻이 겹쳐 구별 7건 - scope 범위→다루는 범위, span 기간→걸치는 기간, tender 다정한→상냥한, terminate 끝내다→종료시키다, tribe 부족→부족 집단(중등 lack과 동음), tube 관→속이 빈 관, zone 구역→구역 지대
3. 불규칙 활용만 쓴 예문 4건 - swear, undergo, undertake, withdraw
4. 예문 관사 2건 - thrill, vacuum
5. 예문 보조 어휘 교체 2건 - split(axe→two pieces), symbol(dove→white bird)
6. 사전 대조에서 나온 용법 오류 1건 - sophisticate(사물 목적어 → 사람 목적어, 뜻도 세련되게 만들다로)

## 품사 분포

noun 103 / verb 56 / adjective 37 / preposition 2 / adverb 1 / conjunction 1. 관련형 보유 12개, 불규칙형 보유 8개(spit·split·swear·undergo·underlie·undertake·weave·withdraw).

## 예문 길이

4단어 27 / 5단어 138 / 6단어 34 / 7단어 1. 절대 상한 12단어, 권장 상한 10단어 모두 여유.
