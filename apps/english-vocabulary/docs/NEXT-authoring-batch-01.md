# 다음 착수: AUTHORING BATCH 01 (새 세션 진입점)

이 문서 하나만 읽고 바로 착수할 수 있게 정리한 것이다. 이전 대화 컨텍스트가 없어도 된다.

## 지금 상태 (2026-07-24 기준)

초등 어휘를 교육부 공식 2022 개정 기준으로 다시 만드는 중이다. 준비(원천 확보·검증·규칙 확정)는 끝났고, **콘텐츠 제작(BATCH 01)만 남았다**. 토큰 사정으로 착수를 미뤘다.

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
