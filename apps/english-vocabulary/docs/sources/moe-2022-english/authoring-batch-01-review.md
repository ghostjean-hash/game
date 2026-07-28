# AUTHORING BATCH 01 제작·검수 기록 (2026-07-28)

대상: 공식 2022 개정 초등 권장(`*`) 대표형 800 중 알파벳 1~200번(`a` ~ `date`).
산출: `authoring-batch-01.json` (200 카드). 규칙 근거: `../../vocab-authoring-rules.md` v1 + 2.1항(기존 데이터 재사용 금지, 사용자 결정 2026-07-28).

## 1. 작성 결과

- 카드 200개, `sourceOrder` 1~200 빠짐 없음. id `ev-moe2022-e-0001`~`0200`.
- 공식 대조: 200개 전부 `elementary-800-cards.json`의 같은 순번 표제어와 문자열 일치(검증기 자동 확인). 표제어·별표는 공식 원천 그대로, 변경 0.
- `setId`/`learningOrder`는 전부 null. 제작 배치이므로 학습 세트 순서는 미확정(규칙 §0).
- 품사 분포: 명사 112 / 동사 39 / 형용사 18 / 전치사 15 / 부사 10 / 한정사 5 / 접속사 3 / 조동사 2 (다품사 카드 4개라 합계 204). 알파벳 a~d 구간이라 명사 비중이 높은 것은 구간 특성이며, 전체 800 완성 후 층 배분 시 재점검 대상.
- 관련형(relatedForms) 4건만 부여: a→an, beauty→beautiful, compute→computer, cover→discover. 규칙 §5.1 "기본 0개"에 따라 대표형에서 형태를 유추하기 어렵고 초등 빈출인 것만 남겼다(공식 괄호 파생형 중 actual/interact/embody/classify/clarify/disclose 등 중·고 수준은 제외).
- 불규칙형(irregularForms) 12건: be, become, begin, break, bring, build, buy, catch, child, choose, come, cost, cut.

## 2. 출처 계층

| 계층 | 이 배치에서 무엇을 가져왔나 |
|---|---|
| officialSource | 표제어 200개 + 별표 `*`(초등 권장). 교육부 2022 개정 별책14. 변경·추가 0. |
| lexicalReference | 품사·대표 의미 판단. **한계 있음 - 3장 참조.** |
| authoredContent | 대표 뜻 한국어 표현, 예문 200개, 예문 번역 200개. 전부 자체 작성(기계번역 사용 0). |

기존 앱 데이터(`set-001~004.json`, playland/2015)는 표제어가 겹치는 단어도 뜻·예문을 참고하지 않았다(규칙 §2.1).

## 3. 사전 실조회 교차 대조 (사용자 결정 2026-07-28로 수행 완료)

최초 작성 시에는 품사·뜻을 표준 사전 지식에 근거해 적었을 뿐 외부 자료를 실제로 조회하지 않았다. 사용자 결정에 따라 **200개 전량을 공개 사전 두 곳에서 실제 조회해 대조**했고, 그 절차를 규칙 §2.2로 명문화했다(다음 배치부터 의무).

- 도구: `tools/lexical-crosscheck.mjs`(신설). 재현 명령 `node tools/lexical-crosscheck.mjs 01 --fetch --report`.
- source A: en.wiktionary.org REST definition API / source B: api.dictionaryapi.dev.
- 근거 확보: **두 사전 모두 199건 / 영어 위키낱말사전 단독 1건(`be` - source B에 표제어 없음) / 근거 없음 0건.**
- **품사 불일치 0건**: 200개 카드에 적은 품사가 모두 사전 품사 목록에 존재. 조동사(`can`/`could`)는 사전이 verb로, 한정사(`a`/`all`/`any`/`another`/`both`)는 article·determiner·pronoun로 표기하므로 그 대응을 도구에 매핑해 판정했다.
- **뜻 수정 0건**: 카드별 사전 정의를 전수로 읽고 대표 뜻의 초등 적합성을 판정했으며 고칠 항목은 없었다.
- 근거 기록: `lexical-crosscheck-batch-01.md`(단어별 내 품사·사전 품사·내 뜻·대조 정의 발췌 200행). 정의 문장은 사실 확인 근거로만 쓰고 카드에 복사하지 않았다.

**사전 첫 정의와 다른 뜻을 대표로 택한 항목**(규칙 §2.2가 사유 기록을 요구): `area`(사전 첫 뜻 "면적" → 초등 활용도가 높은 "지역"), `board`("판자" → 교실 맥락 "칠판"), `care`("근심" → `take care of`의 "돌봄"), `club`("곤봉" → "동아리"), `court`("안뜰" → "경기장"), `date`("대추야자" → "날짜"), `comic`("코미디언" → 복수형 용법의 "만화"), `cow`(엄밀히 "암소" → 초등 표기 "소"), `couple`("한 쌍" → 예문과 맞춘 "두 사람"). 모두 사전에 해당 뜻이 실재하며, 초등 단계 활용도를 기준으로 택했다.

**남은 한계**: source B는 Wiktionary 파생이라 두 소스의 데이터 계보가 겹친다. 완전히 독립된 사전(상용 사전 등)과의 대조는 라이선스상 넣지 않았다.

## 4. 자동검증 (`tools/validate-batch.mjs`)

신설한 배치 전용 검증기로 확인(앱용 `validate-data.mjs`는 앱 스키마 전용이라 이 배치에 맞지 않음).

- error 0 / warning 1.
- 검사 항목: id 형식·중복, id↔sourceOrder 일치, 공식 표제어 대조, 단어 중복, 고정 필드(sourceTier/sourceMarker/setId/learningOrder), 품사 허용값, 뜻 개수·공백, relatedForms 상한 2, 예문 길이(권장 10·절대 12)·문장부호·목표 단어 포함, 번역 한글 포함, 배치 200개·누락 순번.
- 유일한 warning: `be` 카드의 예문 `Dogs are friendly animals.` - 활용형 판정 휴리스틱이 `are`를 잡지 못한 오탐. 목표 단어는 실제로 포함되어 있어 수정 불요로 판정.

## 5. 1차 검수 (사실·형식) - 19건 수정

전수 대조 결과 표제어 불일치·문법 오류·품사 오류는 없었고, 아래 세 부류를 고쳤다.

**(1) 뜻과 예문·번역이 어긋난 것**
- `by` - 뜻을 "~에 의해" 단독에서 "~로 / ~에 의해"로 넓히고 예문을 수동태(`written by my sister`)에서 초등 최빈 용법 `We go to school by bus.`로 교체.
- `cold` - 예문이 바람(차가운)이라 뜻 "추운"과 어긋나 `The winter morning was very cold.`로 교체.
- `comic` - 예문의 `comic books`는 명사 수식 용법이라 품사(명사)와 어긋나 `She reads comics after school.`로 교체.
- `case` - 뜻 "케이스"는 영어를 한글로 옮긴 것뿐이라 학습 정보가 없어 "통 / 경우"로 교체.

**(2) 초등 난이도를 넘거나 뜻이 모호한 것**
- `could` - `at four`가 "네 살"인지 "4시"인지 모호해 `He could swim when he was five.`로 교체.
- `culture` - `its own`을 `a different culture`로 완화.
- `chicken` - 불규칙 과거 `laid`를 피해 `The chicken is in the yard.`로 교체.
- `congratulate` - `on the win`이 부자연스러워 `on her birthday`로 교체.

**(3) 예문 패턴 반복**
- `May I ~?` 3회 → 2회(`another`, `borrow` 교체), `Please ~` 7회 → 3회(`bottle`, `chair`, `come` 교체), `play ~ after school` 2회 → 1회(`basketball` 교체), `Put ~ in the ~` 2회 → 1회(`clothes` 교체), `on the paper` 3회 → 1회(`address`, `circle` 교체), 기타 `blue`·`dark`·`address` 표현 중복 해소.

## 6. 2차 검수 (품질·일관성·편중) - 12건 수정

1차 수정 후 전체를 다시 기계 분석했다.

- **예문 시작 패턴**: 3회 이상 반복 0건(1차 수정으로 해소). 첫 단어 분포 The 45 / I 17 / We 17 / She 15 / My 14 / He 13 - 성별·인칭 균형 양호.
- **뜻 표기 일관성**: 동사 39개 전부 "~다", 형용사는 "~ㄴ", 전치사 15개 전부 "~" 접두로 통일. 다품사 카드(answer/back/brush/clean)만 두 어미가 섞이는데 이는 품사가 둘이라 정상.
- **뜻 표기 중복**: `ago`와 `before`가 둘 다 "~전에"였다. `before`를 "~하기 전에"로 바꿔 구분(번역도 "저녁 먹기 전에"로 맞춤). 최종 중복 0건.
- **어려운 어휘 혼입 11건 제거**: 예문에 쓴 단어 중 공식 초등 목록 밖이면서 초등 학습자에게 부담이 되는 것을 교체했다. `fasten`(belt), `campfire`(around), `swung`(bat), `rowed`(boat), `buried`(bone), `sank`(bottom), `spread`/`toast`(butter), `garage`(car), `folded`/`neatly`(clothes), `pot`/`lid`(cover), `warns`(danger).
- **예문 길이**: 4단어 17 / 5단어 100 / 6단어 76 / 7단어 7. 규칙 §6.2(4~10, 최대 12) 충족.
- **판정 보류 1건**: `case`("통 / 경우")는 예문이 "통" 쪽만 보여준다. `answer`·`back`·`brush`·`clean`·`class`·`call`·`bat`·`aunt` 등 다뜻 카드와 같은 패턴(예문 1개는 한 뜻만 예시)이라 허용으로 판정.

## 7. 화면 적합성 (browser-shot 표본)

앱 CSS(`style.css` + `shared/tokens.css` + `shared/base.css`)를 그대로 링크한 표본 미리보기를 만들어 확인했다(앱 파일은 변경 0, 미리보기는 세션 임시 폴더에 생성).

- 표본 10개: `be`(불규칙형 6개), `by`·`case`·`aunt`(뜻 2개), `back`·`brush`(다품사), `beauty`(관련형), `church`·`condition`·`could`(예문 7단어).
- 결과: 카드 안에서 단어·품사·뜻·보조 정보·예문·번역이 전부 잘림 없이 표시. 콘솔 에러 0. 불규칙형 6개도 한 줄에 들어간다.

## 8. 앱 미변경 확인 (규칙 §10)

`set-001~004.json` 삭제·교체 0, `manifest.json` 변경 0, `src/` 코드 변경 0, 진도 초기화 0, 배포 0. 이 배치는 `docs/sources/moe-2022-english/` 안에만 존재한다.

## 9. 다음 배치

규칙 §11에 따라 BATCH 02(`daughter` ~ 400번)는 **사용자 승인 후** 착수한다. 자동 진행하지 않는다.
