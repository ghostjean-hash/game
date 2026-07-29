# 고등 AUTHORING BATCH 03 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 무표시 대표형 401~600, fraction~moist.

## 산출물

- `high-authoring-batch-03.draft.txt`: 저작 초안(압축 표기, 표제어는 적지 않고 공식 순번으로만 지목).
- `high-authoring-batch-03.json`: 공식 원천에서 표제어·순번·ID·학교급 메타를 조립한 200개 카드.
- `high-lexical-crosscheck-batch-03.md`: 사전 2곳 교차 대조 근거 요약.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-high-batch.mjs 03`: 순번·표제어를 원천 `high-1000-cards.json`과 강제 대조. |
| 형식 검증 | 통과 | `validate-batch.mjs 03 --high`: error 0 / warning 0. |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 03 --high --fetch --report` 실조회. 두 사전 근거 200건, 근거 없음 0, 품사 불일치 0. |
| 고등 배치 간 내용 중복 | 통과 | `crossbatch-check.mjs --high 03`: 뜻·예문·번역 중복 0. |
| 학교급 사이 중복 | 통과 | `tier-cross-check.mjs high`: 초등 800·중등 1,200과 대조해 단어·예문·번역 중복 0. |
| 예문 관사·수 | 통과 | `article-screen.mjs --high` 후보 전수 사람 판정. |
| 예문 어휘 수준 | 통과 | 예문 어휘를 3,000 풀과 대조해 목표 단어보다 어려운 보조 어휘 교체. |
| 사전 정의 대조 | 통과 | 사전 첫 정의와 한국어 뜻을 200개 전수 사람 대조. |

## 수정 내역

1. 배치 내부 뜻 중복 2건 - fraction 분수→일부분(fountain), gang 무리→패거리(cluster)
2. 앞선 층과 뜻이 겹쳐 구별 17건 - framework 틀→체계 틀, fury 분노→격노, gaze 응시하다→가만히 바라보다, gender 성→사회적 성, globe 지구→지구본, gulf 만→큰 만, hence 그러므로→그런 까닭에, horror 공포→공포심, impact 충격→충돌 충격, irritate 짜증 나게 하다→거슬리게 하다, jar 병→단지, knight 기사→중세 기사, liberal 자유로운→개방적인, mayor 시장→시장(단체장), merit 장점→훌륭한 점, mild 온화한→포근한, mode 방식→작동 방식
3. 예문 보조 어휘 교체 1건 - merchant(silk→cloth)

## 품사 분포

noun 102 / verb 54 / adjective 39 / adverb 4 / number 1. 관련형 보유 18개, 불규칙형 보유 0개.

## 예문 길이

4단어 34 / 5단어 124 / 6단어 42. 절대 상한 12단어, 권장 상한 10단어 모두 여유.
