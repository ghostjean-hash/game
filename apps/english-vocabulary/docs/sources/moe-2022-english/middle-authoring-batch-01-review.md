# 중등 AUTHORING BATCH 01 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 `**` 대표형 001~200, `able`~`claim`.

## 산출물

- `middle-1200-cards.json`: 공식 입력 원천(1,200개)에서 앞 200개를 사용했다.
- `middle-authoring-batch-01.draft.txt`: 다섯 소묶음(001~040 / 041~080 / 081~120 / 121~160 / 161~200)별 저작 초안.
- `middle-authoring-batch-01.json`: 공식 원천에서 표제어·순번·ID·별표 메타를 조립한 200개 카드.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-middle-batch.mjs 01`: 순번 001~200, 카드 200개. 조립기는 원천 `middle-1200-cards.json` 외 표제어를 허용하지 않는다. |
| 형식 검증 | 통과 | `validate-batch.mjs 01 --middle`: error 0, warning 0. ID·별표·학교급·순번·중복·품사·뜻 수·예문·학습세트 미지정 상태를 전수 검사했다. |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 01 --middle --fetch --report`로 Wiktionary MediaWiki Action API와 Datamuse definitions API를 실제 조회했다. 두 근거 154건, Wiktionary 단독 1건, Datamuse 단독 45건, 근거 없음 0건, 품사 불일치 0건이다. 상세은 `middle-lexical-crosscheck-batch-01.md`에 기록했다. |
| 1차 사실 검수 | 통과 | 공식 원천 순번·표제어·`**` 표기 200개, 대표 품사·뜻, 예문 문법·뜻 일치, 번역 자연스러움을 전수 재검토했다. 형식 검증은 error 0 / warning 0이다. |
| 2차 품질 검수 | 통과 | 예문 길이 4~7단어(200개), 예문 완전 중복 0, 뜻 완전 중복 후보 3그룹을 재작성했다. `able/capable`, `accuse/blame`, `breast/chest`의 뜻을 구별해 학습 혼동을 낮췄다. |

## 저작 원칙 확인

- 각 카드는 대표 품사 1개, 핵심 한국어 뜻 1~2개, 4~10단어 중심의 새 예문, 자연스러운 한국어 번역으로 작성했다.
- 기존 앱 세트, `src/`, `manifest.json`, 저장된 사용자 진도는 수정하지 않았다.
- 두 사전의 원문·정의는 사실 확인에만 사용했고, 카드의 한국어 뜻·예문·번역은 새로 작성했다.
