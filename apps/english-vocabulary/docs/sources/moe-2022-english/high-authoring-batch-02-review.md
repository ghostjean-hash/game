# 고등 AUTHORING BATCH 02 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 무표시 대표형 201~400, copyright~fountain.

## 산출물

- `high-authoring-batch-02.draft.txt`: 저작 초안(압축 표기, 표제어는 적지 않고 공식 순번으로만 지목).
- `high-authoring-batch-02.json`: 공식 원천에서 표제어·순번·ID·학교급 메타를 조립한 200개 카드.
- `high-lexical-crosscheck-batch-02.md`: 사전 2곳 교차 대조 근거 요약.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-high-batch.mjs 02`: 순번·표제어를 원천 `high-1000-cards.json`과 강제 대조. |
| 형식 검증 | 통과 | `validate-batch.mjs 02 --high`: error 0 / warning 0. |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 02 --high --fetch --report` 실조회. 두 사전 근거 200건, 근거 없음 0, 품사 불일치 0. |
| 고등 배치 간 내용 중복 | 통과 | `crossbatch-check.mjs --high 02`: 뜻·예문·번역 중복 0. |
| 학교급 사이 중복 | 통과 | `tier-cross-check.mjs high`: 초등 800·중등 1,200과 대조해 단어·예문·번역 중복 0. |
| 예문 관사·수 | 통과 | `article-screen.mjs --high` 후보 전수 사람 판정. |
| 예문 어휘 수준 | 통과 | 예문 어휘를 3,000 풀과 대조해 목표 단어보다 어려운 보조 어휘 교체. |
| 사전 정의 대조 | 통과 | 사전 첫 정의와 한국어 뜻을 200개 전수 사람 대조. |

## 수정 내역

1. 앞선 층과 뜻이 겹쳐 구별 15건 - cord 줄→굵은 끈, counsel 조언→충고, creep 기어가다→살금살금 기어가다, criterion 기준→판단 기준, decent 괜찮은→제법 좋은, diminish 줄이다→차츰 줄이다, dread 두려움→겁, elevate 들어 올리다→높이 올리다, embrace 껴안다→품에 안다, environ 둘러싸다→에워싸다, erect 세우다→똑바로 세우다, evaluate 평가하다→심사하다, exhibit 전시하다→선보이다, facilitate 촉진하다→수월하게 하다, flavor 맛→풍미
2. 중등과 번역이 통째로 같던 것 1건 - cord
3. 불규칙 활용만 쓴 예문 2건 - creep, flee
4. 예문 관사 2건 - drill, ethic
5. 예문 보조 어휘 교체 2건 - crush(garlic→ice), evolve(reptiles→animals)
6. 사전 대조에서 나온 문법 오류 1건 - destruct(self destructs → will destruct)

## 품사 분포

noun 89 / verb 74 / adjective 37. 관련형 보유 28개, 불규칙형 보유 3개(creep·flee·forbid).

## 예문 길이

4단어 32 / 5단어 132 / 6단어 36. 절대 상한 12단어, 권장 상한 10단어 모두 여유.
