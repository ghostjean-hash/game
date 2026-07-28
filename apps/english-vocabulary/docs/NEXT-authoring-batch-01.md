# 다음 착수: AUTHORING BATCH 01 (새 세션 진입점)

> **BATCH 01 완료 (2026-07-28)**. 산출 `docs/sources/moe-2022-english/authoring-batch-01.json`(200 카드), 검수 기록 `authoring-batch-01-review.md`. 다음은 사용자 승인 후 BATCH 02(201~400번, `daughter`~). 아래 절차·규칙은 BATCH 02~04에도 그대로 적용한다(입력 범위와 산출 파일명만 바뀜).

이 문서 하나만 읽고 바로 착수할 수 있게 정리한 것이다. 이전 대화 컨텍스트가 없어도 된다.

## 지금 상태 (2026-07-24 기준)

초등 어휘를 교육부 공식 2022 개정 기준으로 다시 만드는 중이다. 준비(원천 확보·검증·규칙 확정)는 끝났고, **콘텐츠 제작(BATCH 01)만 남았다**. 토큰 사정으로 착수를 미뤘다.

## 다음 배치 비용 절감 방식 (사용자 결정 2026-07-28, 아직 미구현 - 착수 시 이것부터)

BATCH 01에서 토큰 소비가 커 사용자가 부담을 지적했다. 원인은 단어를 만드는 판단이 아니라 그 주변 반복이었다 - (a) 카드마다 13개 필드를 전부 손으로 적었는데 그중 자비스가 실제로 판단할 것은 품사·뜻·예문·번역 4개뿐이고 나머지(id·sourceTier·sourceMarker·word·setId·learningOrder)는 공식 원천 파일에서 유도 가능 (b) 검수용 200개 전수 목록을 여러 번 다시 출력 (c) 사전 정의를 200개 전량 읽었으나 수정 0건(뜻이 하나뿐인 구체명사는 읽어도 얻는 게 없었고 실제 판단이 필요한 건 다의어 40~50개).

**다음 배치는 이렇게 한다(품질 게이트는 불변).**

1. **압축 표기로 작성**: 카드당 한 줄 `순번|품사|뜻(1~2개, ` / `로 구분)|예문|예문번역` + 필요한 카드만 뒤에 `rel:computer` / `irr:went,gone` 칸 추가. 정식 JSON을 손으로 쓰지 않는다.
2. **조립 스크립트 선행 신설**(예: `tools/assemble-batch.mjs`, 아직 없음): 압축 줄을 읽어 `elementary-800-cards.json`의 같은 순번에서 `word`를 가져오고 `id`(=`ev-moe2022-e-` + 4자리)·`sourceTier`·`sourceMarker`·`setId`(null)·`learningOrder`(null)를 자동 채워 `authoring-batch-NN.json`을 만든다. 순번↔표제어 대조는 조립 시점에 강제(불일치면 중단).
3. **검수 전수 출력은 1회만**: 1차 검수용 목록을 한 번 뽑고, 2차는 기계 분석 요약(패턴 반복·어미 일관성·뜻 중복·길이 분포)만 본다.
4. **사전 대조 범위 선별**: 품사 자동 대조는 200개 전량 그대로. 사람이 정의를 읽는 대상만 (a) 자동 대조 불일치 (b) 뜻 2개 이상 카드 (c) 추상어·다의어로 한정하고, 뜻이 하나인 구체명사는 자동 통과로 기록한다.
5. **바뀌지 않는 것**: 2회 검수(§9), `validate-batch.mjs` error 0, `lexical-crosscheck.mjs` 품사 불일치 0, 40개씩 소묶음 순차 작성(§10 일괄 대량 생성 금지), 앱 적용 금지(§10), 배치 간 사용자 승인(§11).

## 먼저 읽을 것 (권위 순서)

1. `docs/vocab-authoring-rules.md` - 작성 규칙 확정본 v1. **이대로 만든다.**
2. `docs/vocab-master-plan.md` - 전체 계획(3000 목표, 층 구조).
3. `docs/sources/moe-2022-english/README.md` - 공식 원천·별표 범례(확정).

## 할 일: AUTHORING BATCH 01

- **입력**: `docs/sources/moe-2022-english/elementary-800-cards.json` 의 앞 200개(알파벳 `a` ~ `date`). 각 항목 `{word, variants[], derivatives[]}` (공식 `*` 대표형 = 초등 사용권장).
- **작업**: 각 대표형에 품사·대표 뜻(1~2)·예문·예문번역을 규칙대로 작성. 관련형(relatedForms)은 공식 괄호 파생형 중 초등 빈출만 0~2개, 불규칙형(irregularForms) 필요 시.
- **출처 규칙 요약**: 단어·별표 = 공식(불변). 품사·의미 = 위키낱말사전/Wiktionary 등 자유 라이선스 복수 대조(문장 복사 금지, 사실확인 근거로만). 예문·번역 = 자체 작성. 출처 3계층(official/lexicalReference/authored) 구분 인지.
- **산출 파일**: `docs/sources/moe-2022-english/authoring-batch-01.json` (규칙 §8 스키마: id `ev-moe2022-e-0001`~`0200`, sourceOrder=알파벳순, setId/learningOrder=null). **이건 제작 배치 데이터이지 앱 데이터(set-NNN.json)가 아니다.**

## 중요 개념 (혼동 금지)

- **제작 배치(AUTHORING BATCH) ≠ 학습 세트(LEARNING SET).** 알파벳순은 제작·검수용일 뿐. 실제 학습 순서(SET 01~04)는 800개 전부 만든 뒤 빈도·활용도로 별도 설계한다. BATCH 01을 LEARNING SET 01이라 부르거나 앱에 넣지 않는다.

## 검수 (2회, 규칙 §9)

- **자동 검증**(1차 일부): word가 카드 풀의 공식 표제어와 일치 / partOfSpeech 허용값 / meaningKr 1~2개 비어있지 않음 / example이 목표 단어(또는 활용형) 포함·12단어 이하 / 중복 id 0. (앱용 `tools/validate-data.mjs`는 앱 스키마 전용이라 이 배치엔 안 맞음 → 작은 배치 검증 스크립트를 새로 작성해 쓴다.)
- **1차 검수(사실·형식)** → 수정 → **2차 검수(품질·일관성·편중·화면 적합성, browser-shot 표본)**. 검수 결과·수정 이력 기록.

## 금지 (규칙 §10)

- 200개 일괄 자동 생성 후 자동검사만 하고 완료 처리. 병렬 생성 후 표본만 보고 승인.
- **앱 적용 일절 금지**: 기존 초등 785(set-001~004.json) 삭제·교체, manifest·메뉴·코드 변경, 진도 초기화, 실배포. 콘텐츠 제작과 앱 적용은 별도 단계다.
- BATCH 01 완료 → 결과 보고 → **사용자 승인 후** BATCH 02. 자동 진행 금지.

## 완료 보고 (규칙·ChatGPT 지시서 §21 요약)

작성 수, 공식 대조 결과, 사용 공개자료·라이선스, 품사/뜻/관련형/예문 기준, 자동검증 결과, 1차·2차 검수 결과와 수정 내역, 대표 카드 10개, 남은 문제, 앱 미변경 확인, 다음 배치 가능 여부, 커밋 해시.

## 착수 한 줄 명령 (새 세션에서)

"apps/english-vocabulary의 AUTHORING BATCH 01 착수. docs/NEXT-authoring-batch-01.md와 docs/vocab-authoring-rules.md대로 elementary-800-cards.json 앞 200개(a~date)를 제작하고 2회 검수 후 중단·보고."
