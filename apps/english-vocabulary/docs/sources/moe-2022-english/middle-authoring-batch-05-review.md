# 중등 AUTHORING BATCH 05 검수 기록

대상: 교육부 2022 개정 영어과 교육과정 별책 14의 공식 `**` 대표형 801~1000, `promote`~`spare`.

## 산출물

- `middle-authoring-batch-05.draft.txt`: 저작 초안(압축 표기, 표제어는 적지 않고 공식 순번으로만 지목).
- `middle-authoring-batch-05.json`: 공식 원천에서 표제어·순번·ID·별표 메타를 조립한 200개 카드.
- `middle-lexical-crosscheck-batch-05.md`: 사전 2곳 교차 대조 근거 요약.

## 게이트 결과

| 관문 | 결과 | 근거 |
|---|---|---|
| 공식 원천 일치 | 통과 | `assemble-middle-batch.mjs 05`: 순번 801~1000, 카드 200개. |
| 형식 검증 | 통과 | `validate-batch.mjs 05 --middle`: error 0 / warning 0(초기 warning 1건은 아래 수정). |
| 실제 사전 2곳 교차 대조 | 통과 | `lexical-crosscheck.mjs 05 --middle --fetch --report` 실제 조회. 두 사전 모두 근거 확보 200건, 근거 없음 0건, 품사 불일치 0건. |
| 배치 간 내용 중복 | 통과 | `middle-crossbatch-check.mjs 05`: BATCH 01~04 800개와 대조해 뜻·예문·번역 중복 0건, 배치 내부 중복 0건. |
| 예문 관사·수 | 통과 | 한정사 누락 의심 후보 전수 판정 후 실제 오류 2건 수정. |
| 예문 어휘 수준 | 통과 | 예문 어휘를 초등 800 + 중등 1200 풀과 대조, 목표 단어보다 어려운 보조 어휘 2건 교체. |
| 1차 사실 검수 | 통과 | 대표 품사·뜻의 사전 정합, 예문 문법, 예문과 뜻의 일치, 번역 자연스러움을 200개 전수 재검토. |

## 수정 내역

### 1. 앞선 배치와 뜻이 겹쳐 구별한 것 (7건)

`proper` 적절한→제대로 된(BATCH 01 `appropriate`), `relate` 연관 짓다→관련이 있다(01 `associate`, 예문도 교체), `rely` 의존하다→믿고 기대다(02 `depend`), `require` 요구하다→필요로 하다(02 `demand`), `share` 나누다→함께 쓰다(02 `divide`, 예문도 교체), `sheep` 양→양(가축)(01 `amount`의 "양"과 한글 동음 충돌 회피), `shore` 해안→바닷가(02 `coast`, 예문도 교체).

### 2. 예문 문법·검증기 경고 (4건)

`sink` - 예문이 불규칙 과거형 `sank`뿐이라 목표 단어 미검출 경고. `Heavy stones sink in water.`로 원형을 살려 교체. `schedule` - `Check tomorrow schedule`은 소유격 누락이라 `Check the schedule before leaving.`으로 교체. `quarter` - `into quarter pieces`를 자연스러운 `into quarters`로 교체. `shock` - `gave me shock` → `gave me a shock`.

### 3. 예문 보조 어휘 교체 (2건)

`soldier`(saluted→guarded the gate), `solve`(riddle→problem).

## 품사 분포

noun 84 / verb 79 / adjective 30 / adverb 4 / determiner 1 / auxiliary 1 / conjunction 1. `re-` 계열 동사(receive·recover·reduce·refer·reflect·refuse·regard·register·relate·relax·release·rely·remain·remind·remove·rent·repair·repeat·replace·reply·represent·require·reserve·resist·respond)가 몰려 있어 동사 비중이 앞 배치의 두 배다. 관련형 보유 12개, 불규칙형 보유 9개(ride·rise·seek·sew·shake·shine·shoot·shut·sink).

## 예문 길이

4단어 3 / 5단어 172 / 6단어 24 / 7단어 1.
