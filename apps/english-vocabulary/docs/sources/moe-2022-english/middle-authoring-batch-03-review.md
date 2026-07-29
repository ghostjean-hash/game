# 중등 AUTHORING BATCH 03 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 `**` 대표형 401~600, `extreme`~`livingroom`.

## 산출물

- `middle-authoring-batch-03.draft.txt`: 저작 초안(압축 표기, 표제어는 적지 않고 공식 순번으로만 지목).
- `middle-authoring-batch-03.json`: 공식 원천에서 표제어·순번·ID·별표 메타를 조립한 200개 카드.
- `middle-lexical-crosscheck-batch-03.md`: 사전 2곳 교차 대조 근거 요약.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-middle-batch.mjs 03`: 순번 401~600, 카드 200개. 조립기가 원천 `middle-1200-cards.json`의 순번↔표제어를 강제 대조하며 초안에는 표제어를 적지 않는다. |
| 형식 검증 | 통과 | `validate-batch.mjs 03 --middle`: error 0 / warning 0. |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 03 --middle --fetch --report` 실제 조회. 두 사전 모두 근거 확보 200건, 근거 없음 0건, 품사 불일치 0건. |
| 배치 간 내용 중복 | 통과 | `middle-crossbatch-check.mjs 03`(신규 도구): BATCH 01·02 400개와 대조해 뜻·예문·번역 중복 0건, 배치 내부 중복 0건. |
| 예문 관사·수 | 통과 | `middle-article-screen.mjs`: 한정사 누락 의심 후보를 사람이 전수 판정, 이 배치는 실제 오류 0건(관용·불가산 용법만 검출). |
| 예문 어휘 수준 | 통과 | 예문에 쓰인 모든 어휘를 초등 800 + 중등 1200 풀과 대조해 범위 밖 어휘를 추출, 목표 단어보다 어려운 보조 어휘 1건을 교체. |
| 1차 사실 검수 | 통과 | 대표 품사·뜻의 사전 정합, 예문 문법, 예문과 뜻의 일치, 번역 자연스러움을 200개 전수 재검토. |

## 수정 내역

### 1. 앞선 배치와 뜻이 겹쳐 구별한 것 (12건)

`faith` 믿음→신뢰(BATCH 01 `belief`), `feature` 특징→특색(01 `characteristic`), `found` 설립하다→세우다(02 `establish`), `giant` 거대한→거인(품사도 adjective→noun, 02 `enormous`), `handle` 다루다→처리하다(02 `deal`), `hire` 고용하다→채용하다(02 `employ`), `include` 포함하다→포함시키다(02 `contain`, 예문도 교체), `insist` 주장하다→고집하다(01 `claim`), `interrupt` 방해하다→말을 끊다(02 `disturb`), `joy` 기쁨→큰 기쁨(02 `delight`), `let` 허락하다→~하게 하다(01 `allow`), `list` 목록→명단(01 `catalogue`).

### 2. 예문 보조 어휘 교체 (1건)

`grant` - 예문의 `permission`이 목표 단어보다 어려워 `The teacher granted us more time.`으로 교체.

## 품사 분포

noun 112 / verb 59 / adjective 22 / adverb 6 / determiner 1. 관련형(relatedForms) 보유 14개, 불규칙형(irregularForms) 보유 12개(feed·forgive·freeze·hear·hide·hurt·lay·lead·leap·leave·lend·let).

## 예문 길이

4단어 1 / 5단어 91 / 6단어 101 / 7단어 7. 절대 상한 12단어, 권장 상한 10단어 모두 여유.
