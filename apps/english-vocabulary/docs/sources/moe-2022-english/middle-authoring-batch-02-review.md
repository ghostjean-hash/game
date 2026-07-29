# 중등 AUTHORING BATCH 02 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 `**` 대표형 201~400, `clerk`~`extra`.

## 산출물

- `middle-authoring-batch-02.draft.txt`: 다섯 소묶음(201~240 / 241~280 / 281~320 / 321~360 / 361~400)별 저작 초안(압축 표기).
- `middle-authoring-batch-02.json`: 공식 원천에서 표제어·순번·ID·별표 메타를 조립한 200개 카드.
- `middle-lexical-crosscheck-batch-02.md`: 사전 2곳 교차 대조 근거 요약.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-middle-batch.mjs 02`: 순번 201~400, 카드 200개. 조립기가 원천 `middle-1200-cards.json`의 순번↔표제어를 강제 대조하며 초안에는 표제어를 적지 않는다. |
| 형식 검증 | 통과 | `validate-batch.mjs 02 --middle`: error 0 / warning 0. ID·별표·학교급·순번·중복·품사·뜻 수·예문 길이·학습세트 미지정을 전수 검사. |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 02 --middle --fetch --report`로 Wiktionary MediaWiki Action API와 Datamuse definitions API 실제 조회. 두 사전 모두 근거 확보 200건, 근거 없음 0건, 품사 불일치 0건. |
| 1차 사실 검수 | 통과 | 대표 품사·뜻의 사전 정합, 예문 문법, 예문과 뜻의 일치, 번역 자연스러움을 200개 전수 재검토. |
| 2차 품질 검수 | 통과 | 기계 분석 요약으로 갈음(아래 수정 내역 참조). 예문 길이 5단어 178 / 6단어 22, 예문·번역 완전 중복 0, 배치 내부 뜻 중복 0, BATCH 01 대비 단어·예문·뜻 중복 0. |

## 2차 검수 수정 내역 (4건)

1. `dentist` - 예문 `both teeth`가 번역과 어긋나 `my teeth`로 교체, 번역도 함께 수정.
2. `depress` - 뜻 "낙담시키다"를 실제 쓰임에 맞는 "우울하게 하다"로 교정, 번역 동기화.
3. `empty` - BATCH 01의 `blank`("빈")와 뜻이 겹쳐 "텅 빈"으로 구별.
4. `entertain` - BATCH 01의 `amuse`("즐겁게 하다")와 겹쳐 "즐겁게 해 주다, 접대하다"로 구별.

## 품사 분포

noun 92 / verb 77 / adjective 24 / adverb 3 / preposition 2 / determiner 2. 관련형(relatedForms) 보유 21개, 불규칙형(irregularForms) 보유 2개(`deal`→dealt, `dig`→dug).

## 비용 절감 방식 적용 (docs/NEXT-authoring-batch-01.md 사용자 결정 2026-07-28)

- 카드당 압축 한 줄(`순번|품사|뜻|예문|번역|extra`)로만 작성하고 정식 JSON은 조립기가 생성했다. 표제어·ID·별표·학교급은 손으로 적지 않았다.
- 검수 전수 목록 출력은 1회, 2차 검수는 기계 분석 요약만 사용했다.
- 사전 정의 원문 통독은 하지 않고, 품사 자동 대조 200건 + 대조 불일치·뜻 겹침 후보만 사람이 판단했다.

## 저작 원칙 확인

- 각 카드는 대표 품사 1개, 핵심 한국어 뜻(쉼표 병기 포함), 4~10단어 새 예문, 자연스러운 한국어 번역으로 작성했다.
- 두 사전은 사실 확인 근거로만 사용했고 정의 문장을 복사하지 않았다. 예문·번역은 자체 작성이다.
- 앱 자산 미변경: `src/`, `manifest.json`, `set-001~004.json`, 사용자 진도를 수정하지 않았다. 제작 배치는 학습 세트가 아니며 `setId`·`learningOrder`는 전부 null이다.

## 남은 문제

- `especial`은 현대 영어에서 사용 빈도가 낮아 예문(`This case needs especial care.`)이 다소 격식적이다. 공식 원천의 `**` 대표형이라 제외할 수 없어 유지했고, 실제 빈출형 `especially`를 관련형으로 넣었다.
- 화면 적합성(browser-shot 표본) 검수는 앱 적용 금지 단계라 수행하지 않았다. 대신 뜻 길이(최대 11자)·예문 길이(최대 6단어)를 기계로 확인해 카드 표시 폭 위험을 대신 점검했다.
