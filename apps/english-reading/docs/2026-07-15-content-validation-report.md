# English Reading 콘텐츠 검수 보고서

- 작성일: 2026-07-15
- 대상: `word-order-foundations` 코스 (원본 `english_reading_100_sentences.json` → `src/data/passages.json`로 병합됨)
- 규모: 20지문 100문장
- 검수 기준: 사용자 제시 검수 규칙 1~16장
- 방식: 자동 검증(코드) + 문장별 내용 검수(LLM 5-way 병렬) + 반복 패턴 코드 전수 재검증
- 원칙: **원본 미수정.** 이 문서는 보고서만. 데이터 수정은 하지 않았다.

> 대상 파일 주의: 사용자가 지목한 `english_reading_100_sentences.json`은 이미 이전 세션에서 `src/data/passages.json`의 `word-order-foundations` 코스로 병합되었고(그 과정에서 chunks 경계 6건이 수정됨), 원본 json은 제거되었다(git 복구 가능). 따라서 이 보고서는 **현재 앱에 실제 반영된 라이브 버전**을 검수 대상으로 삼는다. 검수 목적이 배포 품질 확인이므로 라이브 버전이 옳은 대상이다.

---

## 1. 전체 결과 요약

100문장 전부가 자동 검증(문장 수·청킹 결합·boundary 범위·문법/단어 실재·id·제목)을 통과했다. 영어 원문·문법 설명·직독직해·자연 완역의 **내용 품질도 전반적으로 우수**하다. 원어민이 실제로 쓰는 자연스러운 문장이고, 문법 설명에 틀린 것이 없으며(critical 0), 20지문 모두 5문장이 하나의 주제로 자연스럽게 이어진다.

핵심 문제는 딱 하나, **`breakRules.allowed`의 계통적 오류**다. 이 코스에 등록된 allowed 항목 21개가 전부 그 문장의 대표 추천 경계(recommended)와 같은 위치를 가리킨다. 채점 로직(`gradeChunks`)은 그 자리를 항상 recommended로 먼저 분류하므로, 이 allowed 항목들은 화면에서 절대 발동하지 않는 **죽은 데이터**다. 살아있는(진짜 대안 분할) allowed는 0개다. 콘텐츠를 만들 때 "관계절·부정사·that/which/what절이 시작되는 경계"를 기계적으로 allowed에 넣은 흔적으로, 15개 지문에 걸쳐 있다.

학습자 화면 동작에는 해가 없다(죽은 데이터라 오답 처리 등은 발생하지 않음). 다만 이 앱의 데이터 규약(`CLAUDE.md` 4.3: "대표 chunks 경계를 allowed에 넣으면 validate 실패")을 명백히 위반하며, 원래대로면 검증에서 막혔어야 한다. 검증기(`validate.js`)가 discouraged의 대표경계 중복만 검사하고 allowed는 검사하지 않는 구현 누락 때문에 통과했다.

그 외 번역 뉘앙스·단어 선정·시제 일관성 관련 사소한 지적 9건이 있으나 모두 minor다.

---

## 2. severity 개수

| severity | 건수 | 내용 |
|---|---|---|
| critical | 0 | 없음 |
| major | 21 | `allowed`에 대표 경계 중복(죽은 데이터) - 전량 동일 유형 |
| minor | 9 | 번역 뉘앙스 5, 단어 선정 2, 시제 일관성 1, 지시어 1 |
| 자동검증 warn | 33 | 문장 단어 수 권장 범위 이탈(사람 검토 대상, 실패 아님) |

> severity 판정 주석: `allowed` 대표경계 중복을 major로 분류했다. 근거는 (a) 규칙 14장이 "allowed/discouraged 판정 오류"를 major로 규정, (b) 앱 규약(CLAUDE.md 4.3)이 이를 validate 실패 대상으로 명시. 단 **학습자 실사용에는 무해**(죽은 데이터)하다. 검수 에이전트 5개 중 1개는 이 항목을 major로, 4개는 minor로 봤는데, 규약 위반의 명시성을 존중해 major로 통일했다. "실사용 무해 + 규약 위반"이라는 이중 성격을 감안해 우선순위는 정하되 서두를 필요는 없다(7장 참조).

---

## 3. 규칙 준수 지문 목록 (위반 0건)

완전 클린. 수정 불필요.

1. `helping-neighbor` (L1) - Helping a Neighbor
2. `game-night-plan` (L1) - Game Night
3. `weather-change` (L1) - A Sudden Weather Change
4. `remembering-names` (L2) - Remembering Names
5. `notifications-and-focus` (L2) - Notifications and Focus

이 5지문은 공통적으로 `breakRules.allowed`에 대표경계 중복이 없다(allowed가 비어 있거나 진짜 대안 위치만 담김).

---

## 4. 규칙위반 지문 목록

### 4.1. 규칙위반 - 사용 금지 (critical 1개 이상)

없음.

### 4.2. 규칙위반 - 수정 후 사용 (major 1개 이상) - 15지문

전부 `allowed` 대표경계 중복(major)이 원인. 괄호 안은 추가로 발견된 minor.

1. `slow-morning-start` (L1)
2. `lost-umbrella` (L1) - (+minor: sofa 단어 선정)
3. `first-bus-ride` (L1) - (+minor: naturalTranslation '버스' 추가)
4. `better-study-breaks` (L1)
5. `quiet-cafe` (L2) - (+minor: '오후에도' 원문에 없는 함의)
6. `asking-for-directions` (L2) - (+minor: understood 시제 일관성)
7. `small-kindness` (L2)
8. `sleep-and-screens` (L2) - (+minor: give→'된다' 구조 이탈)
9. `learning-from-mistakes` (L2) - (+minor: 'the new idea' 지시, 'Progress grows' 단언 약화)
10. `different-viewpoints` (L2) - (+minor: Emotion 단어 선정)
11. `why-habits-stick` (L3)
12. `urban-trees` (L3) - (+minor: supports/wildlife 완역 뉘앙스)
13. `how-recommendations-work` (L3)
14. `understanding-fast-speech` (L3)
15. `choosing-good-information` (L3)

### 4.3. 사용 가능 - 개선 권장 (minor만)

없음(모든 내용 minor는 major가 함께 있는 지문 안에 분포).

---

## 5. 문장별 상세 위반

### 5.1. major - `allowed` 대표경계 중복 (21건, 코드 전수 검증 확정)

각 항목: `지문 s문장번호` / allowed에 등록된 boundary / 그것과 겹친 대표경계. 조치는 전부 동일 - **해당 allowed 항목 삭제**(진짜 대안 분할이 없으면 allowed를 빈 배열로).

| # | 위치 | allowed boundary | 대표경계 | 겹치는 구조 |
|---|---|---|---|---|
| 1 | slow-morning-start s0 | 3 | 3 | after절 시작 |
| 2 | lost-umbrella s2 | 2 | 2 | seeing(동명사) 시작 |
| 3 | lost-umbrella s4 | 1 | 1 | because절 시작 |
| 4 | first-bus-ride s2 | 3 | 3 | where to절 시작 |
| 5 | better-study-breaks s1 | 6 | 6 | to부정사 시작 |
| 6 | quiet-cafe s0 | 3 | 3 | that 관계절 시작 |
| 7 | quiet-cafe s4 | 5 | 5 | to think 시작 |
| 8 | asking-for-directions s0 | 3 | 3 | how to절 시작 |
| 9 | small-kindness s0 | 2 | 2 | that절 시작 |
| 10 | sleep-and-screens s1 | 5 | 5 | that 관계절 시작 |
| 11 | learning-from-mistakes s1 | 5 | 5 | what절 시작 |
| 12 | different-viewpoints s1 | 2 | 2 | that 관계절 시작 |
| 13 | different-viewpoints s2 | 2 | 2 | which절 시작 |
| 14 | why-habits-stick s1 | 3 | 3 (문장 대표경계 3,6) | what절 시작 |
| 15 | urban-trees s2 | 4 | 4 | that 관계절 시작 |
| 16 | how-recommendations-work s0 | 5 | 5 | that 관계절 시작 |
| 17 | how-recommendations-work s2 | 3 | 3 | which절 시작 |
| 18 | how-recommendations-work s4 | 5 | 5 | that 관계절 시작 |
| 19 | understanding-fast-speech s3 | 7 | 7 (문장 대표경계 3,7) | needed(과거분사) 시작 |
| 20 | choosing-good-information s1 | 5 | 5 | that절 시작 |
| 21 | choosing-good-information s2 | 2 | 2 (문장 대표경계 2,6) | who절 시작 |

### 5.2. minor - 내용 지적 (9건, LLM 언어 판단)

| # | 위치 | 규칙 | 지적 | 수정안 |
|---|---|---|---|---|
| 1 | lost-umbrella s2 (Her brother remembers seeing it near the sofa.) | R10 words | 'sofa(소파)'는 한국어와 같은 기초 외래어라 걸림돌 단어로 보기 어렵다 | words에서 sofa 제거, remembers만 남기거나 다른 걸림돌로 교체 |
| 2 | first-bus-ride s1 (He checks the route on his phone twice.) | R6 naturalTranslation | 완역 '버스 경로'의 '버스'는 원문 'the route'에 없는 정보 추가 | '경로' 또는 '가는 길'로 |
| 3 | quiet-cafe s0 (...that stays quiet in the afternoon.) | R5 chunks.kr / R6 | '오후에도'의 '도(even/also)'가 원문에 없는 함의를 더함(chunks.kr·naturalTranslation 동일) | '오후에 조용한'으로 |
| 4 | asking-for-directions s4 (She repeats the directions to make sure she understood.) | R3 시제 | 지문 전체가 현재 서술인데 이 종속절만 과거 understood로 어긋남(방어는 가능) | 'to make sure she understands' 등 |
| 5 | sleep-and-screens s2 (Reading on paper gives the eyes a calmer task.) | R6 naturalTranslation | 'gives ... a task'(준다)를 '~이 된다'로 옮겨 give→become 구조 이탈 | '눈에 더 편안한 일거리가 된다' 등 give 뉘앙스 유지 |
| 6 | learning-from-mistakes s3 (Trying again soon helps the new idea stay fresh.) | R3 지시어 | 'the new idea'의 지시 대상이 앞 문장에서 확립 안 됨(앞은 mistake·lesson·cause만 언급) | 'the new lesson' 또는 'what you learned'로 |
| 7 | learning-from-mistakes s4 (Progress grows when we use failure as information.) | R6 naturalTranslation | 원문은 현재형 단언인데 완역 '발전할 수 있다'가 가능(can) 뉘앙스를 덧붙임 | '실패를 정보로 활용하면 발전이 커진다' 등 단언 유지 |
| 8 | different-viewpoints s2 (Emotion also changes which parts feel strongest later.) | R10 words | 등록 단어 'Emotion(감정)'은 L2에 지나치게 기본 | 걸림돌은 'strongest' 쪽이 적합 |
| 9 | urban-trees s4 (Planting trees supports both human comfort and urban wildlife.) | R6 naturalTranslation | supports→'지킬 수 있다'(보호), urban wildlife→'도시 생태계'로 뜻이 넓어짐 | '...도시 야생동물 모두에 도움이 된다'로 원문 범위 유지 |

---

## 6. 반복적으로 발견된 문제

### 6.1. (최우선) `allowed`에 대표 경계를 그대로 등록한 계통적 오류

- **규모**: allowed 항목 21개 전부. 살아있는 대안 분할 allowed는 0개. 15개 지문 분포.
- **패턴**: 전부 절/구가 시작되는 경계(that/which/what/who/how to/to부정사/동명사/과거분사)를 allowed에 넣었는데, 이 경계들은 이미 대표 청킹(recommended)으로 잡혀 있다.
- **왜 통과했나**: `validate.js`는 discouraged가 대표경계와 겹치는지만 검사(line 111)하고, allowed는 그 검사가 없다. 반면 앱 규약(`CLAUDE.md` 4.3)과 사용자 규칙 7장은 "대표 경계를 allowed에 넣으면 안 된다"고 명시. **규약과 구현이 불일치**한 상태다.
- **영향**: 채점(`gradeChunks`)이 recommended를 먼저 분류하므로 실사용 무해. 단 데이터가 규약을 위반하고, 유지보수 시 "대안이 있다"는 착시를 준다.

### 6.2. 번역 뉘앙스의 미세한 확대/축소 (minor 5건)

원문에 없는 말(버스, '도', 보호/생태계)을 더하거나, 동사 구조(give→된다)·서법(단언→가능)을 살짝 바꾼 사례. 개별로는 사소하나 "원문 범위 엄수"(규칙 5·6)의 일관 적용 여지가 있다.

### 6.3. 걸림돌 단어 선정 (minor 2건)

sofa·Emotion처럼 학습자가 이미 아는 기초 단어를 words에 넣은 사례. 해당 문장의 진짜 걸림돌(strongest 등)로 교체 여지.

---

## 7. 수정 우선순위

1. **1순위 (일괄, 기계적): allowed 죽은 항목 21개 정리.** 15개 지문에 걸쳐 있으나 조치는 전부 "삭제"로 동일해 위험이 낮다. 함께 `validate.js`에 allowed-대표경계 중복 검사를 추가(discouraged와 동일 로직)하면 재발을 기계로 막는다 - 이게 근본 처방. 근거: 규약 위반이 명시적이고 건수가 가장 많으며 수정이 안전하다.
2. **2순위: 번역 뉘앙스 5건 + 지시어 1건(learning-from-mistakes s3).** 원문 범위·지시 명확성 관련. 언어 판단이라 사람 확인 후 반영.
3. **3순위: 걸림돌 단어 2건 + 시제 1건.** 교육 효과 미세 개선. 급하지 않음.
4. **참고(실패 아님): 단어 수 warn 33건.** 특히 L3 지문 다수가 권장 하한(12단어)에 못 미친다(9~11단어). 구조 난이도는 L3에 맞으나 길이가 짧은 편 - 난이도 사다리 관점에서 사람 검토 대상이지 위반은 아니다.

---

## 8. 수정 권장안 (요약)

- **allowed 정리**: 5.1 표의 21개 항목을 삭제. 대안 분할이 실제로 있는 문장만 그 위치로 재등록(현재는 0개라 대부분 빈 배열이 된다).
- **검증기 보강**: `src/core/validate.js`의 breakRules 검사에 `allowedBs.forEach(b => { if (boundaries.has(b)) push(...) })`를 추가(현재 discouraged만 검사하는 line 111 옆). 이러면 built-in strict 테스트가 21건을 즉시 잡아낸다.
- **번역·단어**: 5.2 표의 수정안대로. 전부 원문 의미 범위로 되돌리는 방향이라 난이도·주제는 불변.
- 모든 수정은 반영 후 `node tests/run-node.mjs` 재검증 필요.

---

## 9. 자동 검증 결과 (코드)

`validatePassage(strict) + 문장수/level/id/단어수` 전수 실행 결과.

- 문장 수: 20지문 전부 정확히 5문장. **통과**
- chunks.en 결합 = 원문: 100문장 전부 일치. **통과**
- naturalTranslation·wordOrderPoint(title/explanation)·grammar(1+): 전부 존재. **통과**
- words 원문 실재(활용형 포함): 전부 일치. **통과**
- boundary 범위·배열 내 중복·allowed∩discouraged·discouraged∩recommended: 위반 0. **통과**
- id 중복: 없음. 영어/한글 제목: 전부 존재. level: 전부 1~3. **통과**
- **단어 수 권장 범위**: 33건 이탈(경고). L2에서 8단어(권장 9~14) 다수, L3에서 9~11단어(권장 12~18) 다수. 즉시 실패로 막지 않고 경고 처리(규칙 12장 지시대로).

> 자동 검증만으로는 잡히지 않은 것: allowed의 대표경계 중복(21건). 현행 `validate.js`에 해당 검사가 없어 통과했다(6.1·8 참조). 이 보고서는 별도 스크립트로 전수 검출했다.

## 10. 수동 검수 결과 (LLM 5-way 병렬 + 코드 교차검증)

- 방식: 20지문을 5묶음으로 나눠 독립 검수 후 취합. `allowed` 중복은 결정적 항목이라 `chunkBoundaries` 기반 코드로 21건 전수 재검증(LLM 판정과 100% 일치).
- 영어 원문(규칙 3): 20지문 모두 자연스럽고 문법 정확. 번역투 없음. 대명사 지시 대체로 명확(예외 1건: learning-from-mistakes s3의 'the new idea'). critical 0.
- 청킹(규칙 4): 대표 chunks 분할은 전부 교육적으로 타당. 조동사+본동사·전치사+목적어·구동사 등을 가르는 부적절 분할 없음(병합 시 6건 수정된 효과). 위반 0.
- 직독직해·완역(규칙 5·6): 어순 유지 양호. 미세한 뉘앙스 확대 5건(minor).
- breakRules discouraged(규칙 7): reason이 전부 해당 표현(be+보어, 조동사+본동사, 구동사, 전치사구 등)을 직접 언급. 공허한 reason 없음. **discouraged는 전부 적절.** 문제는 allowed에만 있다.
- wordOrderPoint·grammar(규칙 8·9): 핵심 어순 포착 적절, 문법 라벨·설명 정확. 틀린 문법 설명 0.
- words(규칙 10): 대체로 적절. 기초 단어 오등록 2건(minor).
- 지문 흐름(규칙 11): 20지문 전부 제목-내용 일치, 5문장 주제 연결·시제 안정 양호. 단조로움·사실 오류 없음.

---

## 부록. 판정 표 (20지문)

| # | id | Level | 판정 | major | minor |
|---|---|---|---|---|---|
| 1 | slow-morning-start | 1 | 규칙위반 - 수정 후 사용 | 1 | 0 |
| 2 | lost-umbrella | 1 | 규칙위반 - 수정 후 사용 | 2 | 1 |
| 3 | helping-neighbor | 1 | 규칙 준수 | 0 | 0 |
| 4 | first-bus-ride | 1 | 규칙위반 - 수정 후 사용 | 1 | 1 |
| 5 | game-night-plan | 1 | 규칙 준수 | 0 | 0 |
| 6 | better-study-breaks | 1 | 규칙위반 - 수정 후 사용 | 1 | 0 |
| 7 | weather-change | 1 | 규칙 준수 | 0 | 0 |
| 8 | remembering-names | 2 | 규칙 준수 | 0 | 0 |
| 9 | quiet-cafe | 2 | 규칙위반 - 수정 후 사용 | 2 | 1 |
| 10 | asking-for-directions | 2 | 규칙위반 - 수정 후 사용 | 1 | 1 |
| 11 | small-kindness | 2 | 규칙위반 - 수정 후 사용 | 1 | 0 |
| 12 | sleep-and-screens | 2 | 규칙위반 - 수정 후 사용 | 1 | 1 |
| 13 | learning-from-mistakes | 2 | 규칙위반 - 수정 후 사용 | 1 | 2 |
| 14 | notifications-and-focus | 2 | 규칙 준수 | 0 | 0 |
| 15 | different-viewpoints | 2 | 규칙위반 - 수정 후 사용 | 2 | 1 |
| 16 | why-habits-stick | 3 | 규칙위반 - 수정 후 사용 | 1 | 0 |
| 17 | urban-trees | 3 | 규칙위반 - 수정 후 사용 | 1 | 1 |
| 18 | how-recommendations-work | 3 | 규칙위반 - 수정 후 사용 | 3 | 0 |
| 19 | understanding-fast-speech | 3 | 규칙위반 - 수정 후 사용 | 1 | 0 |
| 20 | choosing-good-information | 3 | 규칙위반 - 수정 후 사용 | 2 | 0 |

합계: 규칙 준수 5 / 규칙위반 - 수정 후 사용 15 / 사용 금지 0. major 21, minor 9, critical 0.
