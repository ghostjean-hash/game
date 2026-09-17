# 02. 데이터 (data)

모든 수치·코드값·저장 구조의 SSOT. 코드에 숫자를 직접 적지 않고 여기 정의한 상수를 부른다.

규칙과 화면 흐름은 `01_spec.md`, 결정과 그 근거는 기획서 `planning-todayfit.html`이 SSOT다. 이 문서는 값만 갖는다.

## 1. 앱 설정 기본값

사용자가 설정 화면에서 바꾸는 값. 아래는 최초 설치 시의 초기값이다.

| 이름 | 상수 | 초기값 | 단위 |
|---|---|---|---|
| 시작 전 준비시간 | `PREP_SECONDS` | 5 | 초 |
| 세트당 권장 수행시간 기본값 | `DEFAULT_WORK_SECONDS` | 45 | 초 |
| 세트 간 휴식시간 기본값 | `DEFAULT_REST_SECONDS` | 60 | 초 |
| 운동 간 전환시간 | `TRANSITION_SECONDS` | 30 | 초 |
| 음성 안내 사용 | `DEFAULT_VOICE_ON` | `true` | - |
| 비프음 사용 | `DEFAULT_BEEP_ON` | `true` | - |

1.1. 준비시간과 전환시간은 날짜별 계획에 저장하지 않고 운동 시작 시점의 설정값을 읽는다(기획서 6.10).

1.2. 권장 수행시간과 휴식시간 기본값은 월간 계획 생성 시점에 날짜별 계획으로 복사되어 확정값이 된다. 이후 이 값을 바꿔도 이미 생성된 계획은 바뀌지 않는다.

1.3. 입력 허용 범위. 범위 밖 값은 저장하지 않고 입력 칸에서 막는다.

| 이름 | 최소 | 최대 |
|---|---|---|
| 시작 전 준비시간 | 0 | 60 |
| 세트당 권장 수행시간 | 5 | 600 |
| 세트 간 휴식시간 | 5 | 600 |
| 운동 간 전환시간 | 0 | 600 |
| 세트 수 | 1 | 20 |
| 반복 횟수 | 1 | 200 |

## 2. 실행 판정 값

| 이름 | 상수 | 값 | 단위 | 쓰는 자리 |
|---|---|---|---|---|
| 길게 누름 판정 시간 | `LONG_PRESS_MS` | 600 | ms | 다음 버튼 길게 누름 = 운동 건너뛰기 |
| 되돌리기 노출 시간 | `UNDO_WINDOW_SECONDS` | 3 | 초 | 건너뛰기 직후 되돌리기 |
| 카운트다운 시작 지점 | `COUNTDOWN_FROM` | 3 | 초 | 준비·휴식·전환 구간 종료 직전 |
| 초과 재안내 지점 | `OVERRUN_NOTICE_SECONDS` | 30 | 초 | 권장 수행시간 경과 후 재안내 1회 |
| 화면 갱신 주기 | `TICK_MS` | 250 | ms | 남은 시간·초과 시간 표시 갱신 |

2.0. 아래 넷은 세상이 정한 환산값이라 사용자가 바꾸지 않는다. 그래도 여기 자리를 두는 이유는 코드 어디에도 숫자를 적지 않기 위해서다(04_conventions.md 2.1) - 자리가 없으면 파일마다 자기 사본을 만든다.

| 이름 | 상수 | 값 | 단위 | 쓰는 자리 |
|---|---|---|---|---|
| 1초의 밀리초 | `MS_PER_SECOND` | 1000 | ms | 시각 차이를 초로 바꿀 때 |
| 1분의 초 | `SECONDS_PER_MINUTE` | 60 | 초 | 분·초 표기 |
| 1시간의 분 | `MINUTES_PER_HOUR` | 60 | 분 | 한 시간을 넘는 시계 표기 |
| 한 주의 날 수 | `DAYS_IN_WEEK` | 7 | 일 | 요일 규칙 7행, 주 경계 |

2.1. 운동 구간에는 상한이 없다. 권장 수행시간이 지나도 자동 종료·자동 일시정지를 하지 않고 초과 시간을 계속 센다.

2.2. 초과 안내는 두 번으로 끝난다. 권장 수행시간 도달 시 1회, `OVERRUN_NOTICE_SECONDS`가 더 지난 시점에 1회. 이후에는 다음 버튼을 누를 때까지 소리를 내지 않는다.

2.3. `TICK_MS`는 화면 갱신 주기이고 시간 계산의 기준이 아니다. 경과 시간은 항상 시각 차이로 구한다(틱 누적 금지 - 백그라운드에서 틱이 늘어져도 값이 어긋나지 않게 한다).

## 3. 코드값

3.1. 구간 `Phase`

| 값 | 뜻 | 종료 방식 |
|---|---|---|
| `prep` | 준비 | 시간 만료 자동 |
| `work` | 운동 | 다음 버튼만 |
| `rest` | 세트 간 휴식 | 시간 만료 자동 |
| `transition` | 운동 간 전환 | 시간 만료 자동 |

3.2. 세션 상태 `SessionState` - `running` / `paused` / `ended`

3.3. 날짜 상태 `DayStatus` - `none`(계획 없음) / `planned`(예정) / `partial`(부분 완료) / `complete`(완료) / `missed`(미실시)

`none` · `planned` · `missed` 셋은 저장하지 않고 조회 시점에 계산한다(기획서 8.1).

3.4. 운동 결과 `ExerciseResult` - `complete`(완료) / `incomplete`(미완료) / `skipped`(건너뜀)

3.5. 요일 - 월요일 1부터 일요일 7까지. 주는 월요일에 시작해 일요일에 끝난다(`WEEK_START = 1`).

## 4. 날짜와 시각

4.1. 하루 경계는 로컬 시각 00:00~23:59이다. 별도 경계를 두지 않는다.

4.2. 날짜 키는 `YYYY-MM-DD` 문자열이다. 시간대 변환을 거치지 않고 로컬 달력 날짜를 그대로 쓴다.

4.3. 시각 기록은 밀리초 단위 정수(epoch)로 저장하고, 화면 표기만 로컬 시각으로 변환한다.

## 5. 저장 스키마

저장은 `shared/storage.js`의 `createStorage("todayfit")` 경유다. localStorage에 직접 손대지 않는다(클라우드 동기화 신호가 끊긴다 - `03_architecture.md` 3장).

실제 localStorage 키는 공용 규칙대로 `gg.todayfit.<키>`가 되고, 값은 JSON 직렬화된다. 아래는 앱이 부르는 키 이름이다.

| 키 | 내용 | 개수 |
|---|---|---|
| `schema` | 스키마 판 번호 | 1 |
| `settings` | 앱 설정 | 1 |
| `exercises` | 운동 템플릿 목록 | 0..n |
| `routines` | 루틴 목록 | 0..n |
| `weekly` | 요일 규칙 7행 | 1 |
| `plans` | 날짜별 계획. 날짜 키를 키로 하는 맵 | 0..n |
| `sessions` | 수행 기록. 날짜 키를 키로 하는 맵 | 0..n |
| `active` | 진행 중 세션 | 0..1 |

5.1. 운동 템플릿 `Exercise`

| 필드 | 형 | 빈 값 |
|---|---|---|
| `id` | 문자열 | 불가 |
| `name` | 문자열 | 불가 |
| `reps` | 정수 | 불가 |
| `sets` | 정수 | 불가 |
| `workSeconds` | 정수 또는 `null` | 허용. `null`이면 앱 기본값 |
| `restSeconds` | 정수 또는 `null` | 허용. `null`이면 앱 기본값 |

5.2. 루틴 `Routine`

| 필드 | 형 | 빈 값 |
|---|---|---|
| `id` | 문자열 | 불가 |
| `name` | 문자열 | 불가 |
| `items` | `RoutineItem` 배열 (순서 = 수행 순서) | 빈 배열 허용 |

`RoutineItem` - `{ exerciseId, sets, reps, workSeconds, restSeconds }`. 뒤 네 필드가 루틴 지정값이며 `null`이면 운동 템플릿 기본값을 쓴다.

5.3. 요일 규칙 `WeeklyRule` - 길이 7 배열. 각 원소 `{ weekday, enabled, time, routineId }`. `time`은 `"HH:MM"` 문자열이다.

5.4. 날짜별 계획 `DayPlan`

| 필드 | 형 |
|---|---|
| `date` | 날짜 키 |
| `time` | `"HH:MM"` |
| `routineName` | 문자열 (표시용 사본. 참조 아님) |
| `createdAt` | epoch ms |
| `exercises` | `PlanExercise` 배열 |

`PlanExercise` - `{ order, name, reps, sets, workSeconds, restSeconds }`. 네 수치는 전부 확정값이며 `null`이 없다.

5.5. 수행 기록 `Session`

| 필드 | 형 |
|---|---|
| `date` | 날짜 키 (귀속 날짜) |
| `plan` | `DayPlan` 전체 복사본 (스냅샷) |
| `startedAt` | epoch ms. 그날 첫 시작 시각 |
| `endedAt` | epoch ms. 마지막 종료 시각 |
| `activeSeconds` | 정수. 진행한 구간 시간의 합 |
| `status` | `complete` 또는 `partial` |
| `results` | `ExerciseRun` 배열 |

`ExerciseRun` - `{ name, plannedReps, plannedSets, doneSets, result }`. `result`는 3.4의 값이다.

5.6. 진행 중 세션 `ActiveSession` - `Session`의 필드 전부에 아래를 더한다.

| 필드 | 형 |
|---|---|
| `prepSeconds` | 정수 초. 시작 시점의 앱 설정값 사본 |
| `transitionSeconds` | 정수 초. 시작 시점의 앱 설정값 사본 |
| `exerciseIndex` | 정수. 현재 운동의 순서 번호 |
| `setNumber` | 정수. 현재 운동 안의 세트 번호 |
| `phase` | 3.1의 값 |
| `phaseStartedAt` | epoch ms. 현재 구간 진입 시각. 멈춰 있으면 `null` |
| `phaseElapsedBefore` | 초. 멈추기 전까지의 구간 누적 |
| `paused` | 참거짓 |
| `resumed` | 참거짓. 같은 날 재개로 연 세션이면 참 |
| `undo` | `null` 또는 `{ phase, phaseElapsedBefore, exerciseIndex, setNumber, doneSets, result, activeSeconds, expiresAt }` |
| `cueFlags` | 이 구간에서 이미 울린 알림. 구간이 바뀌면 비운다 |
| `aliveElapsed` | 초. 마지막으로 살아 있던 시점의 구간 경과. 복구만 읽는다(`01_spec.md` 4.5.5) |
| `savedAt` | epoch ms. **저장한 그 시각**이다. 세션을 시작한 시각도 마지막으로 화면이 숨은 시각도 아니다 |

`prepSeconds`와 `transitionSeconds`를 세션이 갖는 이유는 1.1대로 그 둘이 실행 시점 설정값이기 때문이다. 운동 도중 설정을 바꿔도 그 판은 시작할 때의 값으로 끝난다.

5.7. `activeSeconds`는 구간이 끝날 때마다 그 구간의 진행분을 더해 누적한다. 일시정지 시간, 앱이 닫혀 있던 시간, 세션과 세션 사이의 중단 기간은 더하지 않는다.

5.8. 스키마 판 번호는 1에서 시작한다. 저장 구조를 바꾸면 번호를 올리고 올림 처리를 둔다.

## 6. 소리

| 이름 | 상수 | 값 |
|---|---|---|
| 비프 주파수 | `BEEP_HZ` | 880 |
| 비프 길이 | `BEEP_MS` | 120 |
| 긴 비프 길이 | `BEEP_LONG_MS` | 500 |
| 비프 음량 | `BEEP_GAIN` | 0.2 |
| 음성 언어 | `VOICE_LANG` | `ko-KR` |
| 음성 속도 | `VOICE_RATE` | 1.0 |

6.1. 음성 문구는 `src/data/phrases.js`가 갖는다. 코드에 문장을 직접 적지 않는다.

6.2. 소리 시점과 문구의 짝은 `01_spec.md`가 정한다. 이 문서는 음색 값만 갖는다.

## 7. 색

7.1. 화면 색은 토큰 변수만 쓴다. 인라인 색값 금지.

7.2. **밝은 바탕이다.** `styles/tokens.css`가 `shared/tokens.css`의 값을 `:root`에서 덮어쓴다. 토큰 이름은 그대로 두고 값만 바꾼다(`03_architecture.md` 3.7).

| 토큰 | 값 | 쓰는 자리 |
|---|---|---|
| `--bg` | `#ffffff` | 화면 바탕 |
| `--bg-elev` | `#ffffff` | 카드 |
| `--bg-elev-2` | `#f2f4f7` | 눌린 칸·보조 바탕 |
| `--fg` | `#15181d` | 본문 글자 |
| `--fg-dim` | `#4b5563` | 보조 글자 |
| `--fg-mute` | `#8a93a3` | 흐린 글자 |
| `--line` | `#dde1e7` | 경계선 |
| `--accent` | `#0f7b5a` | 강조 버튼 바탕 |
| `--accent-strong` | `#0b6449` | 강조 버튼 눌림 |
| `--accent-fg` | `#ffffff` | 강조 버튼 위 글자 |
| `--warn` | `#b4770a` | 초과 시간 표시 |
| `--danger` | `#c0392b` | 미실시·되돌릴 수 없는 조작 |

7.3. 날짜 상태 넷의 표시.

| 상태 | 토큰 | 값 | 모양 |
|---|---|---|---|
| 예정 | `--day-planned` | `#8a93a3` | 테두리만 |
| 완료 | `--day-complete` | `#0f7b5a` | 꽉 채움 |
| 부분 완료 | `--day-partial` | `#b4770a` | 반만 채움 |
| 미실시 | `--day-missed` | `#c0392b` | 빗금 |

7.4. 상태를 색으로만 구분하지 않는다. 위 표의 모양을 함께 준다.

7.5. 화면 위쪽 띠 색(`theme-color`)은 `#ffffff`, iOS 상태 막대는 `default`다. 어두운 바탕을 전제한 값(`black-translucent`)을 쓰지 않는다.
