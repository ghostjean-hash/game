# 중등 1,200·고등 1,000 학습 세트 설계

## 목적

중등 AUTHORING BATCH 01~06(1,200장)과 고등 BATCH 01~05(1,000장)을 앱의 학습 세트 SET05~10(중등)·SET11~15(고등)으로 배치한다. 제작 배치는 알파벳 순 검수 단위이므로 학습 순서로 쓰지 않는다. 초등 SET01~04에 적용한 주제·상황 기반 방식을 그대로 계승한다.

근거 문서: `elementary-learning-set-design.md`(초등 확정 방식), `vocab-master-plan.md`(제작·검증 SSOT).

## 변하지 않는 입력

- 카드 원본: `middle-authoring-batch-01~06.json`(1,200), `high-authoring-batch-01~05.json`(1,000)
- 안정 ID: `ev-moe2022-m-0001`~`1200`, `ev-moe2022-h-0001`~`1000` 유지
- 학습 세트 수: 중등 6개 × 200, 고등 5개 × 200
- 카드의 단어·품사·뜻·예문은 이 단계에서 변경하지 않는다

## 주제 분류

초등과 동일한 12개 주제를 쓴다. 카드에 채택된 한국어 뜻과 예문을 기준으로 카드마다 `primaryTopic` 하나를 부여했다. 단어의 사전적 다의성이 아니라 그 카드가 가르치는 의미가 기준이다.

`core_function`, `self_and_people`, `home_food_clothes`, `school_learning_media`, `play_sport_arts`, `town_travel_places`, `nature_weather_animals`, `time_numbers_measure`, `communication_thinking_social`, `action_change_description`, `society_culture_work`, `objects_and_materials`.

산출물: `middle-topic-tags-v1.json`, `high-topic-tags-v1.json`. 원본 카드와 ID·표제어 전수 대조를 통과했다(누락·중복·불일치 0).

## 세트 배정 규칙 (재현 가능)

초등은 주제별 쿼터를 사람이 손으로 정했다. 중·고는 층 규모가 크고 추상 어휘 비중이 높아, 같은 결과를 재현할 수 있는 규칙으로 고정한다.

1. 각 세트에 대표 주제(anchor)를 정하고, 그 주제의 카드를 빈도 순위 오름차순으로 먼저 채운다.
2. 대표 주제만으로 200개가 되지 않으면 공용 풀에서 보충한다. 공용 풀은 어느 세트의 대표 주제도 아닌 일반 주제들(`core_function`, `action_change_description`, `communication_thinking_social`, `time_numbers_measure`)이다.
3. 공용 풀은 빈도 순으로 순회 배분한다. 남은 자리가 많은 세트를 먼저 채워, 특정 세트만 고빈도(쉬운) 또는 저빈도(어려운) 단어로 쏠리지 않게 한다.
4. 세트 내부 순서는 대표 주제 먼저, 각 묶음 안에서 빈도 순위 오름차순이다.
5. 동률·잔여 배정은 세트 번호 낮은 쪽 우선으로 고정해 재현성을 보장한다.

빈도는 세트 경계를 결정하지 않고 묶음 안 순서만 정한다. 초등과 동일한 원칙이다.

구현: `tools/create-tier-topic-learning-set-proposal.mjs <middle|high>`. 앱 변환은 `tools/apply-tier-topic-proposal.mjs <middle|high>`.

## 빈도 근거

`wordfreq` 3.1.1의 영어 zipf 빈도를 쓴다. 패키지 Apache-2.0, 포함 데이터 CC BY-SA 4.0. 추출 도구는 `tools/rank-tier-frequency.py`, 산출물은 `middle-frequency-wordfreq-v3.1.1.json`·`high-frequency-wordfreq-v3.1.1.json`.

한계는 초등과 같다. 일반 영어 사용 빈도이지 한국 교과서 출현 빈도가 아니므로 묶음 안 우선순위 보조 근거로만 쓴다. 고등 `illude` 1건은 빈도 데이터가 없어 zipf 0으로 최하위에 놓인다.

## 세트 구성

### 중등 SET05~10

| 세트 | 제목 | 대표 주제 | 대표 주제 카드 | 공용 보충 |
|---|---|---|---|---|
| SET05 | 나와 사람들 | self_and_people | 142 | 58 |
| SET06 | 집과 먹고 입기 | home_food_clothes, objects_and_materials | 169 | 31 |
| SET07 | 학교와 배움 | school_learning_media, play_sport_arts | 86 | 114 |
| SET08 | 동네와 이동 | town_travel_places | 66 | 134 |
| SET09 | 자연과 환경 | nature_weather_animals | 66 | 134 |
| SET10 | 사회와 일 | society_culture_work | 128 | 72 |

### 고등 SET11~15

| 세트 | 제목 | 대표 주제 | 대표 주제 카드 | 공용 보충 |
|---|---|---|---|---|
| SET11 | 사람과 마음 | self_and_people | 109 | 91 |
| SET12 | 생활과 사물 | home_food_clothes, objects_and_materials | 99 | 101 |
| SET13 | 학문과 표현 | school_learning_media, play_sport_arts | 94 | 106 |
| SET14 | 자연과 세계 | nature_weather_animals, town_travel_places | 112 | 88 |
| SET15 | 사회와 사고 | society_culture_work | 158 | 42 |

중·고 층은 추상 어휘(일반 동사·사고·판단) 비중이 커서 공용 보충분이 초등보다 많다. 이는 원천 어휘 구성에서 오는 것이며, 주제 응집성은 각 세트의 앞부분(대표 주제 묶음)에서 확보한다.

## 완료 게이트

- 카드 전수에 주제 태그 1개씩, 원본 ID·표제어 대조 통과
- 세트마다 정확히 200개, 층 안 중복·누락 0
- `validate-data.mjs --strict` 통과(세트당 200, 총 3,000)
- `tests/run-node.mjs` 통과
- browser-shot으로 세트 선택·학습 실경로 확인
