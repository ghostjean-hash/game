# 121~200번 80편 출제 배치 계획

작성 2026-07-30. 남은 80편(커리큘럼 121~200번)을 병렬 배치로 나눈 실행 계획이다. 공용 지시는 `AUTHOR_BRIEF_121-200.md`, 배정 소재 원본은 `CURRICULUM_REVIEW.md` 5장의 해당 번호 행.

## 1. 남은 분량 확인 (2026-07-30 실측)

현재 `passages.json`은 120편 600문장이고 커리큘럼 1~120번에 해당한다. 남은 80편의 레벨 구성이 목표 분포(Lv1 60 / Lv2 80 / Lv3 60)의 부족분과 정확히 일치한다.

| 구분 | Lv1 | Lv2 | Lv3 | 계 |
|---|---:|---:|---:|---:|
| 제작 완료(1~120번) | 43 | 50 | 27 | 120 |
| 남은 분량(121~200번) | 17 | 30 | 33 | 80 |
| 합계 = 목표 | 60 | 80 | 60 | 200 |

주제로는 Language가 8/16이라 8편 부족하고, Technology 16편·Psychology 16편·Games 14편·Science 16편·Critical Thinking 10편은 아직 한 편도 없다. 이 다섯 주제는 `passages.json`에 코스를 새로 만들어야 한다(코스 id는 `technology` / `psychology` / `games` / `science` / `critical-thinking`, title은 각각 Technology / Psychology / Games / Science / Critical Thinking).

## 2. 배치 분할 (10배치, 편당 draft 파일 1개)

배치는 주제 경계를 넘지 않게 잘랐다. 2026-07-28 반성(5편씩 16배치로 쪼개 규칙 파일 재독 고정비를 16번 물었다)을 반영해 배치 크기를 7~10편으로 키웠다.

| 배치 | 커리큘럼 번호 | topic | 편수 | 레벨 구성 | draft 파일명 |
|---|---|---|---:|---|---|
| 01 | 121~128 | Language | 8 | Lv2 3 / Lv3 5 | batch-01.json |
| 02 | 129~136 | Technology | 8 | Lv1 3 / Lv2 5 | batch-02.json |
| 03 | 137~144 | Technology | 8 | Lv2 1 / Lv3 7 | batch-03.json |
| 04 | 145~152 | Psychology | 8 | Lv1 3 / Lv2 5 | batch-04.json |
| 05 | 153~160 | Psychology | 8 | Lv2 1 / Lv3 7 | batch-05.json |
| 06 | 161~167 | Games | 7 | Lv1 6 / Lv2 1 | batch-06.json |
| 07 | 168~174 | Games | 7 | Lv2 4 / Lv3 3 | batch-07.json |
| 08 | 175~182 | Science | 8 | Lv1 3 / Lv2 5 | batch-08.json |
| 09 | 183~190 | Science | 8 | Lv2 2 / Lv3 6 | batch-09.json |
| 10 | 191~200 | Critical Thinking | 10 | Lv1 2 / Lv2 3 / Lv3 5 | batch-10.json |

## 3. 실행 방식

1. draft-only 병렬. 각 배치 에이전트는 자기 draft 파일만 Write하고 `passages.json`은 아무도 건드리지 않는다(동시 조작 차단, 2026-07-28과 같은 방식).
2. 에이전트 프롬프트 = `AUTHOR_BRIEF_121-200.md`를 읽으라는 지시 + 그 배치의 커리큘럼 행(번호·Lv·소재·영어 핵심어·숙어)을 표로 붙여 준다. 배정 레벨·topic은 바꾸지 못하게 못박는다.
3. 각 에이전트가 `tools/validate-draft.mjs`로 자체 검증해 전 편 `ok` + 규칙 경고 0을 만든 뒤 보고한다.
4. 자비스가 10개 draft를 취합해 (a) 배치 간 id·title·문장 중복 (b) 배정표 대조(80편 전수·레벨·topic 일치) (c) 숙어 반영 여부를 대조하고 `passages.json`에 병합한다.
5. `node tests/run-node.mjs` strict 200편 전량 통과 확인 → `tools/build-standalone.mjs` 재빌드 → playwright 실경로 표본 검증 → `/web-deploy`.

병합 시 주의: `createLevelCourses`가 표시용으로 레벨별 재그룹핑하므로 데이터는 주제별 코스 구조를 유지한다(앱 CLAUDE.md 3.4).

## 4. 이 계획을 세운 뒤 남은 판단

- 출제 1패스로 끝내고 품질 보강은 나중에 몰아서 하는 방식이 사용자 결정이다(2026-07-30). 그래서 감수 단계를 따로 두지 않고 브리프의 품질선 + 자체 검증만으로 1패스를 돌린다.
- 41~80번 40편 품질 보강은 이 작업과 별개로 여전히 미완이다(2026-07-28 중단분).
