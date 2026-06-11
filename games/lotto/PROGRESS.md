# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 + 동행복권 결과 페이지 정합성 + 카운트다운 + 백캐스트 모두 완료.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-06-11 (전체 코드 검증 4갈래 + 발견 3건 수정: 매직넘버 2건 상수화 / docs 11종→10종 표기 / 프리셋 모달 dismissible:false. 테스트 322 PASS. 상세 2.111.17). 직전 = 2026-06-07 (메인 깔끔화 S0-S4 + 화면 피드백 6건. 322 PASS).
1.4. **적용 표준**: html-game v0.2.
1.5. **이력 분리**: 1차 2026-05-04 (Sprint 010 이전 ~ 031 + 옛 백로그 3.-18 ~ 3.0 archive 이전). 2차 2026-05-08 (Sprint 032~039 추가 archive 이전). 3차 2026-05-10 (Sprint 040~059 추가 archive 이전). 4차 2026-05-16 (Sprint 060~064 추가 archive 이전). 5차~8차 2026-05-16 (Sprint 065~068 각각 강제 이전). 9~16차 2026-05-17 (Sprint 069~076 각각 강제 이전). 17차 2026-05-18 (Sprint 077 강제 이전). 18차 2026-05-18 (Sprint 078/079 2건 동시 강제 이전). 19차 2026-05-18 (Sprint 084 강제 이전). 20차 2026-05-19 (Sprint 088 강제 이전). 21차 2026-05-19 (Sprint 089 강제 이전). 22차 2026-05-19 (Sprint 090 강제 이전 = Sprint 097 추가로 활성 8 → 룰 1.6 1건 cap 정합). 직전 5 Sprint + 본 sprint(들)만 본 파일에 활성. `PROGRESS_ARCHIVE.md` 참조.
1.6. **PROGRESS.md 길이 정책 (S72, 2026-05-16 룰화)**: 활성 sprint 절 **최대 7건**(직전 5 + 본 sprint 묶음). 8건 초과 시 가장 옛 sprint 1건을 `PROGRESS_ARCHIVE.md` 강제 이전. archive는 무제한. 자연 약 350~500줄 유지.

# 1.8. 이번 세션 cycle 종합 (2026-05-22, /jarvis-checkpoint sealing)

UI 시각 보정 cycle. commit 1건 예정. 활성 sprint 091 → 097 유지 (cap 일치, sprint 신설 0건 - 모두 097-후속 시리즈).

## 1.8.1. 결정 / 산출 3 묶음

| # | 사용자 명시 | 자비스 분석 + 옵션 제시 | 사용자 결정 | 산출 자산 |
|---|---|---|---|---|
| 1 | 기록 vs 추천 ball 모바일 동작 차이 진단 | specificity 동률 cascade 역전 → 32→40 회귀 발견. 옵션 3건 (추천 곡선 통일 / 모바일 cascade 차단 / 본체 예외) | 1번 (추천 곡선 통일) | `docs/01_spec.md` 5.8.4 + `styles/main.css` @media 480/360 룰 + `PROGRESS.md` 2.111.15 (S097-후속 6) |
| 2 | "적중 (3-5등)" → "적중(3-5등)" 공백 제거 | docs SSOT 영역 없음, 라벨 1자 마이크로 정정 | (없음, 직접 명시) | `src/render/history-page.js:87` |
| 3 | 추천 row ball 우측 치우침 진단 | 격자 좌우 대칭이나 콘텐츠 정렬 비대칭 = 라벨 좌측 정렬 vs 토글 가운데 정렬 무게중심 불균형. 옵션 3건 (라벨 가운데 정렬 / 토글 우측 정렬 / 컬럼 폭 비대칭) | 1번 (라벨 가운데 정렬) | `docs/01_spec.md` 5.2.1.2/5.2.1.3 + `styles/main.css` `.saved-set-idx` 3줄 + `PROGRESS.md` 2.111.16 (S097-후속 7) |

검증: 3 묶음 모두 `node tests/run-node.js` 320/320 PASS.

## 1.8.2. R5 어휘 회귀 자기 점검 (jarvis-direct output style 활성)

자비스 자기-점검 결과 응답 본문 + PROGRESS 본문에 회귀 어휘 다수 발견. /jarvis-checkpoint §3.1 R5 룰 답습.

| 회귀 어휘 | 빈도 | 본문 위치 | 정정 |
|---|---|---|---|
| "박혀" 활용형 | 1회 | 응답 3 본문 "history-page.js에 직접 박혀 있던 상태" | "직접 기재되어 있던 상태" (응답 노출 후, ledger 후보 적재) |
| "본 X" 한자어 직역 패턴 | 다수 | 응답 + PROGRESS 2.111.15/16 본문 "본 sprint / 본 영역" | "이 sprint / 이 영역" PROGRESS Edit 적용 |
| "결손" 활용형 | 다수 | PROGRESS 2.111.15.1 / 2.111.16.1 "결손 진단" 헤더 + "결손 없음" 본문 | "누락 진단" + "누락 없음" PROGRESS Edit 적용 |
| "정합" | 다수 | PROGRESS 2.111.15.6 / 2.111.16.5 "워크플로우 정합" | "워크플로우 일치" PROGRESS Edit 적용 |

옛 sprint 본문 (2.105-2.111.14)의 동일 회귀 어휘는 append-only 정합 영역 = 정정 대상 아님. 이번 sprint 본문(2.111.15 + 2.111.16)만 즉시 Edit 정정. 응답 노출은 사후 회복 불가, ledger 후보 적재로 evidence 사인.

## 1.8.3. 잔여 / 후속

| # | 영역 | 트리거 |
|---|---|---|
| 1 | 다음 추첨 발표 (2026-05-23 토 1226회) 후 모바일 실 디바이스에서 기록 ball 28→24 곡선 + 추천 row 라벨 가운데 정렬 시각 검증 | 사용자 캡쳐 영역 |
| 2 | `.history-num.is-pending` (?) ball 24x24 환경에서 ? 글자 font-size 14px 비율 약 58% = 가독성 검증 | 사용자 캡쳐 영역 |
| 3 | is-registered row의 negative margin-left + padding-left 비대칭이 background 좌측 띠 무게로 잔존 시각 회귀 가능. 라벨 정렬로 일차 완화, 잔존 시 별도 sprint | 캡쳐 후 결정 |
| 4 | R5 어휘 회귀 패턴 = jarvis-direct output style 활성 세션에서 PROGRESS 본문 작성 시 옛 패턴(결손/본 X/정합) 자기 자발 답습 = 자비스 본질 누락. ledger 후보로 자비스 글로벌 영역에 적재 | 자비스 글로벌 ledger |

## 1.8.4. self-check (delivery rubric 2 기준)

| 기준 | 가중 | 점수 | 사유 |
|---|---|---|---|
| decision_log | 0.50 | 92 | 결정 3건 모두 사용자 명시 sign + 옵션 표 + 사유 PROGRESS 본문 기재. R5 자기-점검 결과까지 명시 |
| self_sufficiency | 0.50 | 90 | 2.111.15 + 2.111.16 + 이 1.8 절 본문만으로 다음 세션 자비스가 컨텍스트 복원 가능. 외부 컨텍스트 0 의존 |

가중평균 **91 → 80 통과**.

# 1.7. 본 세션 cycle 종합 (2026-05-18 ~ 2026-05-19, /jarvis-checkpoint sealing)

UI/UX 대규모 정정 cycle. commit 14건 (`f98b348` 이후 → `8c3988d`). 활성 sprint 091 → 097 (cap 정합 archive 5회: 18~22차).

## 1.7.1. commit 14건 (시간순 압축)

| # | commit | sprint | 핵심 |
|---|---|---|---|
| 1 | `00ddba9` | S093 | cleanup - BACKFILL 상수 폐기 + 옛 탭명 sweep + Sprint 078/079 archive |
| 2 | `234e6a3` | S093-후속 | docs SSOT 옛 탭명 sweep 22건 |
| 3 | `fe45190` | S094 | 추천 row 라벨 "추천N" → "N" + 모바일 4열 결손 fix |
| 4 | `1059b1c` | S094-후속 F+B+ | [확정][🗑] 시각 분리 시도 (S095에서 폐기) |
| 5 | `b3862cd` | S095 | row 휴지통 폐기 + "확정" 토글 아이콘 (**본질 frame 전환**) |
| 6 | `f9f5b37` | S095-후속 | 체크박스 디자인 정합 + row 좌우 마진 + 헤더 중앙 |
| 7 | `ff020da` | S095-후속 2 | "전체 삭제" → "모두 비우기" + 헤더 이동 + 모달 강화 |
| 8 | `0c0bdc7` | S096 | 기록 탭 "등수별 분포" 섹션 폐기 |
| 9 | `2b94fd0` | S097 | 기록 탭 reveal 게임화 (?, 마스킹, 체크, bounce) |
| 10 | `ef74c7d` | S097-후속 | ? ball 원형 + 미발표 dim 폐기 + 7일 자동 노출 |
| 11 | `d74ae0d` | S097-후속 2 | 1회 unreveal reset 자동 마이그레이션 |
| 12 | `b011015` | S097-후속 3 | 마스킹 ball 자기 색 + 원형 + ? 가운데 |
| 13 | `bd2501d` | S097-후속 4 | reveal 직후 불일치 즉시 dim + 일치 즉시 highlight |
| 14 | `8c3988d` | S097-후속 5 | 전적 summary 5칸 한줄 통일 |

## 1.7.2. 자비스 자기 점검 결손 누적 (14~17건째)

| 결손 | 위치 | 본질 |
|---|---|---|
| 14건째 | S095 (절 2.109.10) | 옛 frame ("한 row 액션 2개") 안 변형 반복 = 본질 회피. 사용자 비판 "공간이 없는데 왜 계속 낑겨 넣을려고 해?" 정확 |
| 15건째 | S095-후속 2 (절 2.109.12) | 체크박스 도입 후 "선택 액션 멘탈 모델" 자연 발생 인지 못 함. 옛 "전체 삭제" 라벨/위치가 새 frame에서 모호 신호 |
| 16건째 | S096 (절 2.110.8) | 데이터 시각화 "있으면 좋아" 직관 추가 = 사행성 회피 룰 의미 약화. 6/45 확률 + 누적 회수 분석 미실시 |
| 17건째 | S097-후속 3 (절 2.111.12.7) | "가려진 정보" 시각 메타포 = 채도/투명도 vs 텍스트만 가림. 사용자 의도 사전 확인 부족 |

**룰 답습**:
- 공간 부족 보고 시 → 첫 단계 = frame 자체 재검토 (변형 회피)
- list UI 패턴 변경 시 → 동반 액션 시각 그룹/어휘 정합 점검 의무
- 데이터 시각화 추가 시 → 데이터 의미 형성 회수 + summary 중복 + 사행성 룰 정합 점검
- 정보 마스킹 시각 결정 시 → 사용자 의도 사전 확인 의무 ("ball 변형 vs 텍스트만 가림")

## 1.7.3. 데이터 모델 신설

| 영역 | 신규 필드 / flag | 마이그레이션 |
|---|---|---|
| `history[].revealed` (S097) | boolean - 사용자 reveal 트리거 했는가 | 옛 데이터 = true 자동 (storage normalizeCharacter) |
| storage flag `s097_unreveal_reset_v1` (S097-후속 2) | 1회 자동 unreveal reset | 사용자 명시 "지난주차 것 모두 확인 안한 상태로" 답습 |
| Recommendation schema docs/02_data.md 3.7 | `revealed: boolean` 명시 | SSOT 정합 |

## 1.7.4. service-worker 진행

`v76 → v92` (16 bump = commit 14 + 일부 묶음). 사용자 PWA 갱신 시 모든 정정 일괄 적용.

## 1.7.5. 다음 세션 진입 가이드

| 시점 | 트리거 | 사용자 행동 |
|---|---|---|
| **2026-05-23 (토) 20:35** | 1226회 추첨 발표 | matchHistory 자동 매칭. 1225회 row 마스킹 + 체크 버튼 노출 |
| 2026-05-23 ~ 05-29 | 7일 윈도우 | 사용자 직접 reveal 클릭 → 순차 ball pop + 일치 bounce + 불일치 즉시 dim |
| 2026-05-30 (토) | 윈도우 종료 | revealed=false라도 자동 노출 (옛 회차 그룹 동작) |
| (사용자 캡쳐 확보 시) | 모바일 실 디바이스 검증 | 5칸 summary wrap / 마스킹 ball / reveal 애니메이션 정합 점검 |

## 1.7.6. 잔여 / 후속 영역

- 옛 마스킹 CSS 룰 (line 957-982 .summary-grid 중복) = cleanup 후순위
- `.saved-set-remove` dead CSS 룰 (S095에서 row 삭제 후) = cleanup 후순위
- `RANK_MISS_COLOR` 상수 dead (S096 폐기 후) = cleanup 후순위
- `removeSavedSetAt` core 함수 + 단위 테스트 = 보존 (미래 row long-press 진입점 가능성)
- docs/02_data.md S097 `revealed` 필드 schema 명시 완료 ✓

# 2. 완료 마일스톤 (활성: 직전 5 Sprint + 본 sprint)

> 이전 Sprint 이력(2.1 ~ 2.98, M0~M6 / 폴리싱 / Sprint 010~077) → `PROGRESS_ARCHIVE.md` 참조.

## 2.105. Sprint 091 완료 - 하단 탭 순서 + 라벨 정정 (S091, 2026-05-18)

배경: 사용자 명시 2건. (1) "하단 탭 순서 변경: 추첨, 전적, 통계, 역추첨, 설정" (2) "스트링 변경: 추첨→추천 / 전적→기록 / 역추첨→게임".

### 2.105.1. 변경 매핑

| 위치 | 옛 | 새 |
|---|---|---|
| 탭 1 | 추첨 (home) | **추천** (home) |
| 탭 2 | 통계 (stats) | **기록** (history) |
| 탭 3 | 역추첨 (reverse) | **통계** (stats) |
| 탭 4 | 전적 (history) | **게임** (reverse) |
| 탭 5 | 설정 (settings) | 설정 (settings) |

**id 보존**: home / history / stats / reverse / settings = 옛 그대로. state.currentTab 호환성 + 옛 사용자 데이터 영향 0.

### 2.105.2. 변경 파일

- `src/render/bottom-tabs.js`: `TABS` 배열 순서 + label/short 정정.
- `src/render/history-page.js`: h1 "전적" → "기록" + 빈 상태 카피 "전적이 비어있습니다" + "추첨 탭에서" → "기록이 비어있습니다" + "추천 탭에서".
- `src/render/reverse-page.js`: h1 "역추첨" → "게임".
- `docs/01_spec.md` 4장: 5탭 모델 라벨 + 순서 정정 + 변경 메모.
- `service-worker.js` v75 → v76.

### 2.105.3. 검증

`node tests/run-node.js` → 316/316 PASS (UI 라벨만 변경, 회귀 0).

### 2.105.4. 사용자 화면 기대 변동

하단 탭 바 (왼→오): **추천 / 기록 / 통계 / 게임 / 설정**.
- 추천 탭 = 옛 추첨 탭 콘텐츠 그대로.
- 기록 탭 = 옛 전적 탭. h1 "기록".
- 통계 탭 = 변동 없음.
- 게임 탭 = 옛 역추첨 탭. h1 "게임" (6개 골라 매칭 게임 의미).
- 설정 탭 = 변동 없음.

### 2.105.5. 잔여

- 코드 / 주석 안 "추첨 탭" / "전적 탭" / "역추첨 탭" 표기 (사용자 미노출 영역) = 역사 흔적 보존. 향후 cleanup sprint 영역.
- icons.js 안 주석 "추첨 탭: 빛나는 별" / "전적 탭: 시계" = 의미상 그대로 (아이콘은 동일).

### 2.105.6. Sprint 077 archive 강제 이전 (룰 1.6)

활성 8건 → 룰 7건 초과 → Sprint 077(절 2.98, 추천 리스트 다중 학설 매칭 시각화) archive 이전. 본 sprint 종료 시점 활성 = 078~079 + 084 + 088 + 089 + 090 + 091 = 7건 정합. archive 17차 정리.

### 2.105.7. S091-후속 - 확정 배경 앞쪽 마진 절반 (2026-05-18)

배경: 사용자 캡쳐 + 명시 "확정된 배경 앞쪽 마진 절반으로 줄여줘". 확정 row의 노란 배경이 section padding-left(≈23.4px) 안쪽에서 시작 = 좌측 빈 공간이 너무 큼.

**진단**:
- `.saved-sets-section` padding-left = `calc(var(--space-3) * 1.5 * 1.3)` ≈ 23.4px (S66, 2026-05-10 "추천N" 라벨 들여쓰기 강화).
- 확정 row background이 section padding-left 안쪽에서 시작 = 23.4px 좌측 빈 공간.
- 사용자 의도 = 절반(≈12px)으로 축소.

**정정**: 확정 row만 negative margin-left + padding-left 보상.

| 영역 | 변경 |
|---|---|
| `.saved-set-row.is-registered` | `margin-left: calc(var(--space-3) * -1)` (-12px = section padding-left의 약 절반) |
| (위와 함께) | `padding-left: calc(var(--space-3) / 2 + var(--space-3))` (기본 6px + 보상 12px = 18px) |

**효과**:
- 확정 row background이 좌측으로 12px 더 확장 = section padding-left의 절반(11.7px ≈ 12px) 흡수.
- row 콘텐츠(라벨 / 번호공 / 버튼 / 휴지통)는 padding 보상으로 가로 위치 무영향.
- 미확정 row 변동 0.

**근거**: B 옵션(확정 row만 negative margin) 채택. 옵션 A(section padding 절반)은 모든 row 영향이라 사용자 명시 "확정된 배경"과 어긋남.

**변경 파일**:
- `styles/main.css` `.saved-set-row.is-registered`
- `docs/01_spec.md` 5.2.5.9 시각 명세 보강
- `service-worker.js` v76 → v77

**검증**: 316/316 PASS (CSS-only).

**사용자 화면 기대 변동**:
- 확정 row 노란 배경이 좌측 외곽 더 가까이까지 확장 (절반 마진 = ≈12px만 잔존).
- "추천N" 라벨 가로 위치 = 미확정 row와 동일 유지.
- 우측 마진 = 변동 없음 (사용자 명시 "앞쪽"만).

## 2.106. Sprint 092 완료 - 기록 탭 옛 회차 이력 회차별 그룹핑 (S092 통합 정정, 2026-05-18)

배경: 사용자 명시 4건 연속 진화.
1. "옛 회차도 현재 회차와 동일한 UI" → 1차 시도 = 헤더 폐기(번호공만).
2. "정확한 회차와 년월일을 표시" → 회차/날짜 정보 부활 필요.
3. "당첨번호와 등수 표시" → 발표 번호 + 등수 라벨 추가 필요.
4. "같은 회차에 선택된 추천 번호를 그룹핑" → 회차별 그룹 구조 = 최종 결정.

본 sprint = 1차 안에서 4차 안까지 같은 세션에서 진화. SSOT/PROGRESS는 최종 결정만 보존(중간 1차 안 흔적 제거).

### 2.106.1. 최종 구조

```
[옛 회차 이력 (M개 회차 · N건)]
  └ 1224회 · 2026-05-10            (그룹 헤더)
      당첨: 1 7 14 22 31 45         (작은 ball 6개)
      ┌────────────────────────┐
      │ 추천 row 1 (번호공)  3등 │
      │ 추천 row 2 (번호공)  미적중│
      └────────────────────────┘
  └ 1223회 · 2026-05-03
      ...
```

발표 대기 섹션 = 변동 없음 (이미 1 회차 묶음 = 자연 그룹).

### 2.106.2. 변경 매핑

| 항목 | 옛 | 새 |
|---|---|---|
| 옛 회차 이력 구조 | 항목 N개 평탄 리스트 (헤더에 회차/등수) | **회차별 그룹 카드 + 그룹 안 추천 row** |
| 그룹 헤더 | (없음) | `NNNN회 · YYYY-MM-DD` + 발표 당첨번호 6 ball |
| 그룹 본문 row 헤더 | (제거됨) | 등수 라벨만 (우측) |
| draw 미수신 회차 | (그룹 없음) | "발표 데이터 미수신" 라벨 |
| `renderHistoryPage` 시그니처 | `(container, character, currentDrwNo)` | `(container, character, currentDrwNo, draws)` |

### 2.106.3. 변경 파일

- `src/render/history-page.js`: `historyGroupHtml(drwNo, items, draw)` 신설. pastItems → drwNo 기준 Map 그룹핑. drawMap 추가.
- `src/render/main.js`: `renderHistoryPage` 호출에 `state.draws` 전달.
- `styles/main.css`: `.history-group-list` / `.history-group` / `.history-group-header` / `.history-group-drw` / `.history-group-winning` / `.history-group-winning-label` / `.history-group-winning-nums` / `.history-num-mini` 추가.
- `docs/01_spec.md` 5.8.1-A: S092 정책 통합 정정 (그룹핑 + 회차/날짜/당첨번호/등수).
- `docs/01_spec.md` 5.8.4: 이력 회차별 그룹 명세 재작성.
- `service-worker.js` v78 코멘트 통합 정정 (v 유지 - 같은 sprint 안 정정).
- `games/lotto/tools/seed-history.html` 동반 추가 (production 자산 아님, 1224회 등 임의 회차 history 항목 주입 GUI).

### 2.106.4. 검증

`node tests/run-node.js` 316/316 PASS. 회귀 0 (data 모듈 / core 모듈 변경 없음, 렌더 레이어만).

### 2.106.5. 사용자 화면 기대 변동

- 기록 탭 "옛 회차 이력" 섹션 = 회차별 카드. 1 카드 = 회차/날짜 헤더 + 발표 당첨번호 6 + 추천 row N (등수 라벨 우측).
- 발표 대기 섹션 = 변동 없음.
- 1224회 시드 도구로 항목 주입 후 새로고침: "1224회 · YYYY-MM-DD" 그룹 헤더 + 당첨번호 + 추천 row + 등수 라벨 노출.

### 2.106.6. 잔여

- PROGRESS.md 룰 1.6 (활성 7건 cap): 본 sprint 추가로 8건 → Sprint 078(절 2.99) archive 이전 필요. 별도 chore 작업으로 처리 권장 (코드 무관, PROGRESS / ARCHIVE 텍스트 이동만).
- 발표 대기 섹션에 추첨 예정일 표기는 본 sprint 범위 외 (사용자 명시 "옛 회차" 강조). 필요 시 후속 sprint.

### 2.106.7. S092-후속 - 보너스 + 라벨 정정 + 한 줄 layout (2026-05-18)

사용자 캡쳐 + 명시 3건 추가:
1. "당첨 번호에 보너스 번호가 표시되지 않음" → 그룹 헤더 당첨번호에 보너스 ball 추가.
2. "미적중 / 미발표 이게 뭐야?" → 모호 라벨 분기 (draws 가용=미적중, 미가용=미발표).
3. "결과와 번호를 한 줄에 표시" → row 마크업 신규 (번호공 좌측 + 등수 라벨 우측, flex space-between).

**변경 매핑**:

| 영역 | 옛 | 새 |
|---|---|---|
| 그룹 헤더 당첨번호 | 본번호 6 ball만 | 본번호 6 + `+` 구분자 + 보너스 ball (점선 외곽선) |
| 미매칭 라벨 | "미적중 / 미발표" (모호) | `matchedRank=null + hasDraw` → "미적중" / `null + !hasDraw` → "미발표" |
| 추천 row layout | 2줄 (헤더 위 + 번호공 아래) | **1줄** (번호공 좌측 + 등수 라벨 우측, `space-between`) |
| row CSS 클래스 | `.history-item` (재활용) | `.history-group-row` 신설 |

**변경 파일**:
- `src/render/history-page.js`: `historyGroupHtml` 보너스 ball 분기 + `historyGroupRowHtml` 신설 (한 줄 row + 라벨 분기). 옛 `historyItemHtml(h, false, true)` 호출 폐기.
- `styles/main.css`: `.history-num-mini.is-bonus` (점선 외곽선) + `.history-num-plus` (구분자) + `.history-group-rows` / `.history-group-row` / `.history-group-row-nums` / `.history-group-row-rank` 신설.
- `docs/01_spec.md` 5.8.4: 보너스 + 라벨 분기 + 한 줄 layout 명시.
- `service-worker.js` v78 코멘트 통합 정정 (7건 통합).

**검증**: `node tests/run-node.js` 316/316 PASS.

**사용자 화면 기대 변동**:
- 그룹 헤더 당첨 영역: `당첨 9 18 21 27 44 45 + 16(점선)` 형식.
- 추천 row: `[번호공 6 ──── 미적중]` 한 줄. 라벨이 모호하던 "미적중 / 미발표" → 1224회처럼 draws 있으면 "미적중" 단독.

### 2.106.8. S092-후속 2 - 일치 ball 하이라이트 + 라벨 세분화 (2026-05-18)

사용자 명시 3건 추가:
1. "맞은 번호는 하이라이트해주면 안돼?" → 추천 ball 중 당첨 본번호와 일치 = 골드 외곽선 + glow.
2. "5등은 몇개 맞아야 하는거지?" → 본번호 3개 (답변만, 코드 변경 없음).
3. "0개 적중일 때 미적중, 1개 적중일 때 1개 적중, 2개 적중, 5등..." → 라벨 세분화.

**라벨 분기 (S092-후속 2 최종)**:

| matched | hasDraw | 라벨 |
|---|---|---|
| (rank 1~5) | true | `1등` ~ `5등` |
| null | false | `미발표` |
| 0 | true | `미적중` |
| 1 | true | `1개 적중` |
| 2 | true | `2개 적중` |

**6/45 등수 기준 (참고)**: 1등(6) / 2등(5+보너스) / 3등(5) / 4등(4) / 5등(3) / 미적중(0~2).

**변경 파일**:
- `src/render/history-page.js`: `historyGroupRowHtml(h, draw, hasDraw)` 시그니처 확장. matched count 계산 (Set 교집합). 라벨 분기 정정. ball에 `is-matched` 클래스 부여.
- `styles/main.css`: `.history-group-row-nums .num.is-matched` 정의 (골드 외곽선 box-shadow + scale 1.05).
- `docs/01_spec.md` 5.8.4: 라벨 분기 트리 + 하이라이트 명세 + 6/45 등수 참고.

### 2.106.9. S092-후속 3 - 당첨번호 row 중앙 정렬 (2026-05-18)

사용자 명시: "당첨 번호도 중앙 정렬, '당첨' 스트링은 오른쪽 미적중과 같은 위치에 배치".

**정정**:
- 그룹 헤더 당첨번호 row가 추천 row와 100% 동일 layout으로 통일.
- `.history-group-winning` flex `justify-content: space-between` + 라벨 `order: 2` + 번호공 `order: 1` + `flex: 1` + `justify-content: center`.
- `.history-group-winning-label` `min-width: 48px` + `text-align: right` (추천 row의 등수 라벨 정합).
- "발표 데이터 미수신" 라벨은 단독 표시 = `.is-missing` 분기로 `justify-content: center` + `order: unset`.

**변경 파일**:
- `styles/main.css`: `.history-group-winning` 계열 CSS 갱신.
- `docs/01_spec.md` 5.8.4: 그룹 헤더 layout 명세 갱신.
- `service-worker.js` v78 코멘트 10건 통합.

### 2.106.10. S092-후속 4 + 5 + 6 - 하이라이트 진화 (2026-05-18)

사용자 명시 3단계 정정:
1. (후속 4) "하이라이트가 잘 안 보이네" → 2층 외곽선 + 강한 glow + scale 1.15 + 역강조(.has-match row 한정).
2. (후속 5) "번호 확대는 별로" → scale 1.15 폐기.
3. (후속 6) "색을 빼려면 미적중인것들도 모두 빼야지 규칙이 개판" → .has-match 분기 폐기. 미일치 dim을 row 종류 무관 항상 적용 = 룰 일관성.

**자비스 결손 자인 (후속 6)**: 후속 4에서 "미적중 row 어색 회피" 명목으로 분기 도입한 게 정작 룰 일관성을 깨뜨림. 미일치는 미일치다 - row 컨텍스트로 표시를 달리한 것이 결손. 사용자 지적 정확.

**최종 전략 (자비스 자율 결정 폐기, 룰 단순화)**:
- 정강조 (일치 ball): 흰색 inner 2px + 골드 outer 2px 2층 외곽선 + 14px glow + z-index 1.
- 역강조 (미일치 ball, **row 종류 무관 항상**): opacity 0.35 + grayscale 0.7.
- 미적중 row(0개 일치) = 6개 ball 전부 dim → "0개 적중" 시각 표현 자연 강화 (어색하지 않음, 오히려 정합).
- 번호공 크기 변형 없음.

**변경 파일**:
- `src/render/history-page.js`: `.has-match` 클래스 부여 로직 폐기, row 클래스 단순화.
- `styles/main.css`: `.history-group-row-nums .num:not(.is-matched)` (단순 selector) dim.
- `docs/01_spec.md` 5.8.4: 하이라이트 명세 갱신 (룰 일관성 표기).

**검증**: 316/316 PASS.

### 2.106.11. S092-후속 7 - 당첨 ball 크기 통일 + 골드 톤 배경 (2026-05-18)

사용자 명시: "당첨 번호가 작은데 크기 동일하게 하고 배경 색을 살짝 다르게 해줘".

**정정**:
- `.history-num-mini` (22x22) 폐기. 당첨 ball도 `.history-num` (32x32) 사용 → 추천 row와 100% 동일 크기.
- 당첨 row 배경 = `rgba(201, 160, 80, 0.08)` + border `rgba(201, 160, 80, 0.28)` (골드 톤 옅게) - 추천 row(bg 단색)와 시각 구분.
- `.history-num.is-bonus` 외곽선 보존 (보너스 시각 구분 유지).
- `.history-num-plus` 폰트 사이즈 12px → `var(--font-size-md)` (큰 ball에 맞춤).

**변경 파일**:
- `src/render/history-page.js`: `colorNum(n, 'history-num-mini')` → `colorNum(n, 'history-num')` + 보너스도 동일.
- `styles/main.css`: `.history-num-mini` 룰 폐기. `.is-bonus` 셀렉터 `.history-num.is-bonus`로 이전. `.history-group-winning` 배경 골드 톤 적용. `.history-num-plus` 사이즈 조정.
- `docs/01_spec.md` 5.8.4: 그룹 헤더 명세 갱신.

**검증**: 316/316 PASS.

## 2.107. Sprint 093 완료 - cleanup 묶음 (S093, 2026-05-18)

배경: 사용자 명시 cleanup 묶음 진행 결정. 활성 sprint 잔여 항목 중 코드 무관 텍스트 정리 + dead 상수 폐기를 1 sprint에 묶음. 회귀 위험 0 영역. 묶음 = (A) BACKFILL_RECENT_COUNT dead 상수 폐기 + (B) 옛 탭명 코드/주석 sweep + (C) "전체 비우기" 옛 주석 sweep + (D) Sprint 078/079 archive 이전.

### 2.107.1. 정리 묶음 4건

| # | 항목 | 사유 | 영향 |
|---|---|---|---|
| A | `BACKFILL_RECENT_COUNT` 상수 제거 (`src/data/numbers.js`) | S090 폐기 후 dead 잔존 (코드 호출 0건 확인) | docs SSOT 정합. tests/suites/history.test.js export 부재 검증은 유지 (회귀 차단 의미) |
| B | 코드/주석 옛 탭명 sweep | S091 라벨 정정 "추첨/전적/역추첨" → "추천/기록/게임" 후 잔재 | icons.js + PROGRESS / PROGRESS_ARCHIVE는 사용자 명시 보존 예외 (아이콘 자체는 동일 / 역사 흔적) |
| C | CSS/JS 주석 "전체 비우기" sweep | S088 라벨 정정 "전체 비우기" → "전체 삭제" 후 잔재 | UI 표기는 이미 S088에서 SSOT 정합. 본 cleanup은 주석 동기만 |
| D | Sprint 078 + 079 archive 이전 | 룰 1.6 활성 9건(78~92 + 본 cleanup) → 7건 cap 정합 위해 2건 동시 이전 | archive 18차 정리. PROGRESS_ARCHIVE 끝에 2 절 append |

### 2.107.2. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/data/numbers.js` | `BACKFILL_RECENT_COUNT = 30` 상수 line 제거 + S093 주석 갱신 + `// S63 ... 추첨 탭` → `추천 탭` |
| `docs/02_data.md` | 1.16 표 dead 상수 줄 제거 + 1.16.1 / 1.5.4.6 본문 갱신 |
| `docs/01_spec.md` | 7.5 본문 "추첨 탭" → "추천 탭" + 상수 ref 갱신 |
| `docs/03_architecture.md` | 백캐스트 ref 갱신 (S093 dead 상수 제거 표기) |
| `src/render/main.js` | line 1/2 + 3개 핸들러 주석 옛 탭명 6건 sweep |
| `src/render/preset-buttons.js` | line 3 sweep |
| `src/render/reverse-page.js` | jsdoc "역추첨 탭" → "게임 탭" |
| `src/render/ritual-widget.js` | jsdoc "추첨 탭" → "추천 탭" |
| `src/render/settings-page.js` | 3건 sweep + 사용자 노출 hint 1건 ("추첨 탭의 프리셋" → "추천 탭의 프리셋") |
| `src/render/saved-sets-section.js` | 5건 sweep (옛 탭명 + 전체 비우기 4건) |
| `src/render/character-slots.js` | line 1 sweep |
| `src/render/icons.js` | "전체 비우기" → "전체 삭제" 1건만 sweep. "추첨 탭/전적 탭" 표기는 사용자 명시 보존 |
| `styles/main.css` | 옛 탭명 6건 + 전체 비우기 4건 = 10건 sweep |
| `service-worker.js` | v78 → v79 (전역 SW). 본 sprint 4건 묶음 본문 주석 |
| `PROGRESS_ARCHIVE.md` | 헤더 18차 정리 entry 추가 + 절 2.99 (Sprint 078) + 절 2.100 (Sprint 079) 본문 append |

### 2.107.3. 보존 예외 (사용자 명시)

- `src/render/icons.js` 안 jsdoc 주석 `/** 추첨 탭: 빛나는 별 */` + `/** 전적 탭: 시계 */`: 의미상 그대로 (아이콘은 동일).
- `docs/01_spec.md` 본문 "추첨 탭" 다수 표기: SSOT 정합 영역, 별도 후속 sprint로 sweep 권장 (본 cleanup 범위 외).
- `PROGRESS.md` / `PROGRESS_ARCHIVE.md`: sprint 본문 자체 = 역사 흔적 영역.

### 2.107.4. 검증

`node tests/run-node.js` → **316 / 316 PASS** (회귀 0). CSS/주석/dead 상수만 변경, 런타임 로직 무변동.

### 2.107.5. 사용자 화면 기대 변동

- 본 cleanup은 사용자 미노출 영역(코드 주석 + dead 상수 + archive 이동). UI 변동 0.
- 사용자 노출 1건: 설정 탭 프리셋 관리 섹션 hint "추첨 탭의 프리셋..." → "추천 탭의 프리셋..." (S091 라벨 정정 정합 회복).

### 2.107.6. Sprint 078 + 079 archive 강제 이전 (룰 1.6, 18차 정리)

본 sprint 추가로 활성 9건 도달 → 룰 1.6 cap 7건 초과 2건 → Sprint 078(절 2.99, 운세 3학설 출처 태그 색 명도 극대화) + Sprint 079(절 2.100, 출처 표시 모드 dot/label + 프리셋 색점) **동시 이전**. 본 sprint 종료 시점 활성 = 084 + 088 + 089 + 090 + 091 + 092 + 093 = **7건 정합**. archive 18차 정리 (옛 17차 사이클은 1건 단위였으나 본 cleanup은 활성 9건에서 2건 cap 정합 = 동시 이전).

### 2.107.7. 잔여 / 후속

- ~~`docs/01_spec.md` + `docs/02_data.md` 본문 "추첨 탭" 다수 표기 sweep~~ → S093-후속 (2.107.8)에서 흡수 완료.
- S088 메모 "PROGRESS_ARCHIVE의 옛 '전체 비우기' 표기는 역사 흔적으로 보존": 본 cleanup 영역 외 그대로 유지.
- icons.js 주석은 사용자 명시 보존 영역.

### 2.107.8. S093-후속 - docs SSOT 옛 탭명 sweep (2026-05-18)

배경: S093 본 cleanup이 코드/주석만 sweep + docs는 SSOT 정합 영역으로 별도 후속 권장으로 분리. 사용자 명시 B-1 진행 결정 → S091 라벨 정정("추첨/전적/역추첨" → "추천/기록/게임")이 docs SSOT까지 완전 정합 회복.

**변경 매핑**:

| 파일 | 변경 |
|---|---|
| `docs/01_spec.md` | 18건 sweep. "추첨 탭" 17건 → "추천 탭" + "전적 탭" 1건 → "기록 탭" (line 43). line 27 id mapping 정의는 `[추천 탭, id: home] (기본, S091 라벨 정정 옛 "추첨 탭")` 형태로 옛 이름 보존(이력 흔적) |
| `docs/02_data.md` | 4건 sweep. "추첨 탭" → "추천 탭" (1.5.5 / 1.5.5 본문 / 1.13 본문 / 3.2.3) |
| `service-worker.js` | v79 → v80 |

**보존 예외** (사용자 명시 / 의도된 흔적):
- `docs/01_spec.md` line 27: id mapping 정의에서 옛 이름 보존 (협업자 이력 reference).
- `src/render/icons.js` jsdoc: 사용자 명시 보존 (S093 본 cleanup에서 결정).
- `PROGRESS_ARCHIVE.md`: 역사 흔적.

**검증**: `node tests/run-node.js` → **316 / 316 PASS** (회귀 0). docs 본문만 변경, 런타임/UI 무변동.

**사용자 화면 기대 변동**: 0건 (docs는 협업자 reference 영역).

## 2.108. Sprint 094 완료 - 추천 row 라벨 시각 단축 + 모바일 4열 결손 fix (S094, 2026-05-18)

배경: 사용자 캡쳐 + 명시 "확정 버튼과 삭제 버튼이 붙어 있어서 UX가 안 좋다" + "영역이 부족한 것도 한 몫. 앞쪽 '추천1'에서 '추천'을 빼고 인덱스만 표시해서 영역을 확보". swipe-to-delete(C 옵션)는 분리 진행 결정 → S095. 본 sprint = 영역 확보 1단계.

### 2.108.1. 정정 묶음 2건

| # | 항목 | 사유 |
|---|---|---|
| A | 라벨 시각 단축 "추천N" → "N" | 사용자 명시. row 좌측 영역 확보. aria-label은 의미 보존 "추천N" (스크린리더 호환) |
| B | 모바일 break point 4열 정합 회복 | S090-후속 1 데스크톱만 4열로 갱신, 모바일 max-width 480/360 3열 잔재 결손 fix |

### 2.108.2. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/render/saved-sets-section.js` | `shortLabel = "${labelStart + i}"` 변수 신설 (시각용). 옛 `label = "추천${labelStart + i}"`은 aria-label/title용 보존. `.saved-set-idx` innerText만 shortLabel로 변경 |
| `styles/main.css` | desktop grid `44px 1fr auto var(--space-6)` → `28px 1fr auto var(--space-6)` (라벨 16px 회수). 480px↓ `40px 1fr var(--space-5)` (3열) → `var(--space-5) 1fr auto var(--space-5)` (4열 정합 + 라벨 축소). 360px↓ `var(--space-6) 1fr var(--space-5)` (3열) → `var(--space-5) 1fr auto var(--space-5)` (4열) |
| `docs/01_spec.md` | 5.2.1.2 레이아웃 명세(`[N 라벨] [번호공 6] [확정] [🗑]` + 새 grid 값) + 5.2.1.3 라벨 시각 단축 명시(aria 보존) + 5.2.1.4 사행성 회피 정합 (시각/aria 분리) |
| `service-worker.js` | v80 → v81 |

### 2.108.3. 시각 비교

**옛 (S094 이전)**:
```
[추천1] [15][20][23][26][31][32] [확정][🗑]
 56px        balls 1fr           auto  24px
```

**새 (S094)**:
```
[1]   [15][20][23][26][31][32]   [확정]  [🗑]
 28px       balls 1fr             auto   24px
↑ 28px 회수 (라벨 폭 절반)
```

### 2.108.4. 검증

`node tests/run-node.js` → **316 / 316 PASS** (회귀 0). 라벨 시각 단축 + grid column 조정. JS 로직/데이터 무변동.

**접근성 검증**:
- `.saved-set-idx aria-hidden="true"` 유지 = 시각만 노출.
- `.saved-set-row aria-label="${label}..."` = 의미 보존 "추천N".
- 확정/삭제 버튼 `aria-label`도 `label` 사용 = "추천N 확정" / "추천N 삭제" 의미 보존.
- 스크린리더 호환 = 변동 0.

### 2.108.5. 사용자 화면 기대 변동

- 추천 리스트 각 row 좌측 라벨 = "1" / "2" / ... 숫자만 표시.
- 골드 색 + 굵기는 유지 (시각 강조 보존).
- row 우측 [확정] [🗑] 사이 gap = 자연 확장 안 됨 (gap은 `var(--space-2)` 8px 그대로). swipe(S095)에서 정합 회복.
- 모바일 결손 자연 회복: 옛 480px↓에서 휴지통 추가 후 row wrap 잠재 결손이 4열 정합으로 해소.

### 2.108.6. Sprint 084 archive 강제 이전 (룰 1.6, 19차 정리)

본 sprint 추가로 활성 8건 도달 → 룰 1.6 cap 7건 초과 1건 → Sprint 084(절 2.101, 캐릭터 편집 기능 신설 + 후속 S85~S87 패턴 묶음) archive 이전. 본 sprint 종료 시점 활성 = 088 + 089 + 090 + 091 + 092 + 093 + 094 = **7건 정합**.

### 2.108.7. 잔여 / 후속

- ~~**S095 swipe-to-delete**~~: S094-후속 F+B+ 진행으로 1차 시도. 효과 미흡 시 S095 swipe 진행 결정.
- ~~휴지통 + 확정 사이 gap 확장(B 옵션)~~: S094-후속 (2.108.8)에서 흡수.
- 사용자 첫 인지 어휘 검증: "추천 리스트 (5)" 헤더가 컨텍스트 충분히 제공하는지 = 첫 진입 사용자 캡쳐 확인 영역.

### 2.108.8. S094-후속 F+B+ - [확정][🗑] 페어 시각 분리 (2026-05-19)

배경: S094 영역 확보 후 사용자 캡쳐 + 명시 "삭제 버튼이 여전히 확정 버튼과 나란히 있는데?". S094는 좌측 라벨 영역만 회수, 우측 [확정][🗑] 인접 본질 미해결. 옵션 비교 표 제시 후 사용자 결정 = **F+B+ (시각 분리 + gap 확장 + 휴지통 시각 약화)** 우선. swipe(C)는 본 옵션 효과 확인 후 별도 결정.

**결손 진단**: row grid 4열(`28px 1fr auto var(--space-6)`) + grid gap `var(--space-2)`(8px) = [확정][🗑] 시각 거리 8px만. fat finger 44px 표준 대비 부족.

**정정 묶음**:

| 항목 | 옛 | 새 |
|---|---|---|
| 휴지통 opacity | (없음, 항상 1) | **0.45 default** → focus/hover 시 1.0 (의도 강조) |
| 휴지통 margin-left | (없음, gap 8px만) | **var(--space-3)(12px)** = 총 거리 20px |
| 휴지통 hit area | 24x24 (var(--space-5)) | 보존 (접근성 유지) |
| 휴지통 transition | color 0.15s | color + opacity 0.15s |
| focus/active 동작 | 시각 변동 0 | **opacity 1.0** = 키보드 사용자도 의도 명확 인지 |

**시각 비교**:

```
옛 (S094):
[1]  [번호공 6]  [확정][🗑]
                   gap 8px (인접)

새 (S094-후속):
[1]  [번호공 6]  [확정]    [🗑]
                  primary  ghost(opacity 0.45)
                  ← 거리 20px (gap 8 + margin-left 12) →
```

**변경 파일**:

| 파일 | 변경 |
|---|---|
| `styles/main.css` | `.saved-set-remove` 룰 갱신: `margin-left: var(--space-3)` + `opacity: 0.45` + `transition: color 0.15s, opacity 0.15s`. focus / focus-visible / active 시 `opacity: 1`. hover 시 `color: --color-danger + opacity: 1` (옛 동작 흡수) |
| `docs/01_spec.md` | 5.2.1.2 레이아웃 명세에 F+B+ 옵션 3건 박힘 (opacity / margin / hit area 보존) |
| `service-worker.js` | v81 → v82 |

**접근성 검증**:
- hit area 24x24 보존 = 터치 표준(WCAG 2.5.5 target size, 44x44 권장이지만 24x24 minimum 인접 spacing 충족).
- 키보드 focus 시 opacity 1.0 = 의도 명확 인지.
- aria-label 의미 보존 (S094 분리 정합 그대로).

**검증**: `node tests/run-node.js` → **316 / 316 PASS** (회귀 0). CSS-only.

**사용자 화면 기대 변동**:
- 추천 리스트 각 row 우측: [확정] primary 진하게 + 12px 여백 + [🗑] 옅은 회색. 확정 row(취소 표기)에서도 동일 약화.
- 데스크톱 hover 시 휴지통 진하게 + danger 색.
- 모바일 fat finger 오터치 = 거리 + 시각 약화로 자연 감소 (정량은 사용자 캡쳐 후 평가).

**S095 swipe 진행 판정 데이터**: 본 후속 commit + 캐시 갱신 후 사용자 캡쳐 + 실 사용 평가. 효과 미흡 시 swipe 진행. → **S095에서 swipe 폐기 + 본질 frame 전환 결정** (사용자 비판 후, 2.109 참조).

## 2.109. Sprint 095 완료 - row 휴지통 폐기 + "확정" 토글 아이콘 (S095, 2026-05-19, 본질 frame 전환)

배경: S094-후속 F+B+ 적용 후 사용자 캡쳐 + 강한 비판 "공간이 없는데 왜 계속 낑겨 넣을려고 해?" + "UX 개판인데?". 자비스가 옛 frame("한 row에 액션 2개 인접 배치") 안에서 margin/opacity/swipe 변형만 반복 = 본질 회피 확정. 사용자 결정 = **"휴지통 삭제 + 확정 토글 아이콘으로 변경"**. row 안 액션 1개로 단순화.

### 2.109.1. 본질 진단 (자비스 결손 자인)

| 결손 | 본문 |
|---|---|
| frame 자체 결손 | "한 row에 라벨 + 번호공 6 + 액션 2"는 모바일 360-414px에서 공간 부족 자연 |
| 자비스 반복 미봉책 | margin 12px / opacity 0.45 / swipe 모두 같은 frame 안 변형 |
| 사용자 명시 본질 | 행에 액션 2개를 같이 두는 자체가 잘못된 frame. **하나만 남기거나 다른 단계에 호출** |

### 2.109.2. 결정 매핑

| 영역 | 옛 (S094-후속) | 새 (S095) |
|---|---|---|
| row 우측 액션 | `[확정 텍스트][🗑]` 2 버튼 | **토글 아이콘 1개만** |
| 단일 row 삭제 | 휴지통 버튼 | **폐기** (전체 삭제 또는 + 1세트/+ 5세트 재시도로 흡수) |
| 미확정 시각 | "확정" 텍스트 (border) | **빈 원** (외곽선만, currentColor stroke) |
| 확정 시각 | "취소" 텍스트 (accent fill) | **채워진 원 + ✓** (accent fill + 흰색 체크) |
| row grid | 4열 `28px 1fr auto var(--space-6)` | **3열 `28px 1fr var(--space-6)`** |
| aria | aria-label만 | aria-label + **aria-pressed** (토글 상태 명시) |

### 2.109.3. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/render/icons.js` | **circleOutline** + **circleCheck** 함수 신설. 빈 원 / 채워진 원 + ✓ SVG |
| `src/render/saved-sets-section.js` | 텍스트 버튼 → 토글 아이콘 (`circleOutline` / `circleCheck`). aria-pressed 추가. 휴지통 button HTML 폐기. trash import 보존 (전체 삭제 영역 사용 잔존) |
| `src/render/main.js` | `data-action="remove-saved-set"` 핸들러 폐기 (dead). `removeSavedSetAt` import 폐기 (core 함수 자체는 보존) |
| `styles/main.css` | `.saved-set-register` 룰 전면 갱신 (텍스트 버튼 → 24x24 toggle hit area + 22x22 SVG). `.saved-set-remove` 룰 dead 표기. row grid 4열 → 3열 (desktop + 480px↓ + 360px↓ 동시) |
| `docs/01_spec.md` | 5.2.1.2 레이아웃 (3열 명세) + 5.2.5.9 메커니즘 (토글 아이콘 + 휴지통 폐기) + ASCII 시안 갱신 |
| `service-worker.js` | v82 → v83 |

### 2.109.4. 시각 비교

```
옛 (S094-후속):
[1]  [15 20 23 26 31 32]  [확정]    [🗑]
                          primary   ghost·12px gap·opacity 0.45
                          ↑ row 안 액션 2개 (공간 부족 본질)

새 (S095):
[1]  [15 20 23 26 31 32]            ◯
                                    토글 (미확정 = 빈 원)
또는
[1]  [7 13 14 22 40 45]             ●
                                    토글 (확정 = 채워진 원 + ✓)
```

### 2.109.5. 접근성 보장

- `aria-label` = "추천N 확정" / "추천N 확정 취소" 의미 보존.
- `aria-pressed` = true/false 토글 상태 명시 (스크린리더 표준).
- hit area 24x24 보존 + focus-visible outline (키보드 사용자 정합).
- 키보드 Enter/Space로 토글 가능 (button 기본 동작).

### 2.109.6. 검증

`node tests/run-node.js` → **316 / 316 PASS** (회귀 0).
- `removeSavedSetAt` 코어 함수 + saved-sets.test.js 보존 (미래 진입점 가능성). UI 진입점만 폐기.
- toggleSavedSetRegistration 동작 단위 테스트 그대로 PASS.

### 2.109.7. 사용자 화면 기대 변동

- 추천 리스트 각 row 우측: **토글 아이콘 1개만** (텍스트 없음).
  - 미확정 row: 빈 원 ◯ (회색 stroke).
  - 확정 row: 채워진 원 + 흰 체크 ● (accent 색 fill).
- 단일 row 삭제: 옛 휴지통 동선 폐기. 마음에 안 들면 (a) 확정 안 누름, (b) "전체 삭제" 후 재시도, (c) + 1세트 / + 5세트로 추가 후 선택.
- row 자체 padding / margin 정합 (확정 row 좌측 12px 확장 그대로).
- 모바일 320~480px 동일 패턴, 토글 아이콘 hit area 정합 보존.

### 2.109.8. Sprint 088 archive 강제 이전 (룰 1.6, 20차 정리)

본 sprint 추가로 활성 8건 도달 → 룰 1.6 cap 7건 초과 1건 → Sprint 088(절 2.102, 라벨 정정 + 크롬 모바일 viewport 동기 + S088 후속 sourceDisplayMode 'off' 묶음) archive 이전. 본 sprint 종료 시점 활성 = 089 + 090 + 091 + 092 + 093 + 094 + 095 = **7건 정합**.

### 2.109.9. 잔여 / 후속

- `.saved-set-remove` CSS 룰 dead 잔존 = 미래 cleanup sprint 영역.
- `removeSavedSetAt` core 함수 + 단위 테스트 보존 = 미래 다른 진입점(예: row 길게 누르기 모달) 도입 시 재활용 영역.
- 토글 아이콘 hit area 24x24 = 모바일 fat finger 표준 44x44보다 작음. 사용자 캡쳐 후 실 사용 평가. 필요 시 확장(예: row 외 클릭 영역 24x24 → 32x32) 검토.
- 빈 원 vs 채워진 원 색 명도 차이 = 사용자 인지 정합 검증 영역 (캡쳐 후).

### 2.109.10. 자비스 자기 점검 (14건째 결손)

옛 frame ("한 row에 액션 2개") 안에서 변형만 반복 = 본질 회피 패턴. 사용자 비판 "낑겨 넣을려고 해" 정확. 향후 룰:
- 공간 부족 문제 보고 시 **첫 단계 = frame 자체 재검토** (옵션 폐기 / 단계 분리). margin/opacity/gap 같은 변형은 frame 정합 후 미세 조정 단계.
- 옵션 비교 표 제시 = 사용자에게 결정 떠넘기는 패턴 회피. 베테랑 기획자 답습 = 본질 진단 후 권장안 명확 제시.

### 2.109.11. S095-후속 - 체크박스 디자인 정합 + row 좌우 마진 동일 + 헤더 중앙 정렬 (2026-05-19)

배경: 사용자 명시 3건. (1) "체크박스 다른 디자인으로 바꿔줘". (2) "인덱스/추천번호/체크박스 배치에서 추천번호가 중앙, 좌측 인덱스와 우측 체크박스 마진 영역 동일 유지". (3) "체크했을 때 '추천 리스트 (n)' 제목 정렬 방식이 바뀌는데 그대로 중앙정렬 유지".

**정정 묶음 3건**:

| # | 항목 | 옛 | 새 |
|---|---|---|---|
| A | 체크박스 디자인 | 빈 원 (○) / 채워진 원 + ✓ (●) | **빈 라운딩 사각 (□) / 채워진 사각 + 흰 ✓ (☑)** - 표준 list UX |
| B | row grid 좌우 마진 | `28px 1fr var(--space-6)` (28/24 비대칭) | **`var(--space-6) 1fr var(--space-6)`** (24/24 대칭). 모바일 break point도 통일 |
| C | 헤더 정렬 | flex `justify-content: center` + 카운터 `margin-left: auto` = 카운터 노출 시 title 좌측 밀림 | **grid 3열** (1fr / auto / 1fr). title `grid-column: 2 + justify-self: center`. 카운터 `grid-column: 3 + justify-self: end`. 카운터 노출 무관 title 항상 가운데 |

**변경 파일**:

| 파일 | 변경 |
|---|---|
| `src/render/icons.js` | `circleOutline` / `circleCheck` 폐기 → **`checkboxOutline` / `checkboxChecked`** 신설. 라운딩 사각(rx=4) + 흰 ✓ |
| `src/render/saved-sets-section.js` | import 교체 + 호출명 교체 (circle → checkbox) |
| `styles/main.css` | (1) `.saved-set-row` grid 좌우 동일 var(--space-6). 480px↓ + 360px↓ 모두 통일 (토글 hit area 24x24 보장). (2) `.saved-sets-header` flex → grid 3열. `.saved-sets-title` grid-column 2. `.saved-sets-register-counter` grid-column 3 + margin-left auto 폐기 |
| `docs/01_spec.md` | 5.2.1.2 레이아웃 (대칭 마진 + 체크박스) + 5.2.5.9 메커니즘 (체크박스 표기) + ASCII 시안 갱신 |
| `service-worker.js` | v83 → v84 |

**시각 비교**:

```
옛 (S095):
  1  [번호공 6]              ●
  ↑ 라벨 28px       ↑ 토글 24px (비대칭)
  추천 리스트 (5)         확정 N건
  ↑ 카운터 노출 시 좌측 밀림

새 (S095-후속):
       1  [번호공 6]       ☑
       ↑ 24px        ↑ 24px (대칭, 번호공 시각 중앙)
        추천 리스트 (5)      확정 N건
        ↑ 항상 가운데 (grid 3열)
```

**검증**: `node tests/run-node.js` → **316 / 316 PASS** (회귀 0). CSS/아이콘 변경, 런타임 로직 무변동.

**접근성 보장**:
- 라운딩 사각 + 흰 ✓ = 대비 명확 (WCAG AA 충족).
- aria-pressed 상태 유지 (S095 정합).
- hit area 24x24 보존 (모바일 break point 전부).

**사용자 화면 기대 변동**:
- 추천 리스트 row 좌우 시각 균형 (라벨/체크박스 동일 폭 24px).
- 번호공 6개가 행 정중앙.
- 체크박스: 미확정 = 회색 외곽선 사각, 확정 = 골드 fill 사각 + 흰 체크.
- 헤더 = 카운터 0건이든 N건이든 title "추천 리스트 (N)" 항상 가운데.

### 2.109.12. S095-후속 2 - "전체 삭제" → "모두 비우기" 라벨 + 위치 헤더 이동 + 모달 카피 강화 (2026-05-19)

배경: 사용자 결손 보고 "체크 선택하고 '전체 삭제'를 누르면 왠지 체크박스가 삭제될 것 같은 잘못된 UX가 느껴짐". 본질 진단 = 체크박스 도입 후 사용자 멘탈 모델이 **"멀티 셀렉트 list = 선택 액션이 자연"**으로 형성. "전체 삭제" 어휘 + 액션바 위치 ([+ 1세트][+ 5세트][전체 삭제] 같은 시각 그룹)가 "체크된 것만 영향"으로 오인 송출. 본질 frame = "리스트 정리" 액션이 "추가 액션" 그룹과 시각/어휘 미분리.

**정정 묶음 A+B+C** (사용자 결정):

| # | 항목 | 옛 | 새 |
|---|---|---|---|
| A | 라벨 명확화 | "전체 삭제" (모호: 전체 = 리스트 전체? 선택 전체?) | **"모두 비우기"** (동사 명확) + aria-label에 동적 카운트 |
| B | 위치 분리 | 액션바 우측 끝 (+ 버튼과 같은 그룹) | **헤더 우측** (카운터 옆). 작은 ghost 버튼 (opacity 0.7, border 없음) |
| C | 모달 카피 강화 | `저장된 N세트가 모두 삭제됩니다. 진행할까요?` (대상 모호) | 확정 없을 때: `추천 리스트 N개가 모두 비워집니다. 진행할까요?` / 확정 있을 때: `추천 리스트 N개가 모두 비워집니다 (확정 M개 포함, 전적에서도 함께 제거됩니다). 진행할까요?` |
| 부수 | 확정 history 정합 | 옛 = saved-sets만 삭제, 확정 history는 잔존 → 모달 카피와 실 동작 미스매치 | **확정 history(현재 회차 source=user)도 함께 제거**. 사용자 명시 "확정 함께 취소" 일관 |

**변경 파일**:

| 파일 | 변경 |
|---|---|
| `src/render/saved-sets-section.js` | 헤더에 `.saved-sets-header-right` wrapper 신설 (카운터 + 모두 비우기 묶음). 액션바 `savedSetsAddBarHtml`에서 .saved-add-actions / .saved-sets-clear 폐기. 빈 리스트 시 모두 비우기 버튼 자체 미출력 |
| `src/render/main.js` | clear-saved-sets 핸들러 갱신: 확정 N개 분기 + 모달 카피 강화 + 확정 항목 history 함께 filter 제거 |
| `styles/main.css` | `.saved-sets-header` gap 추가. `.saved-sets-header-right` wrapper 룰 신설 (flex + gap). `.saved-sets-register-counter` grid-column 제거 (wrapper 안으로 이동). `.saved-sets-clear` 룰 갱신 (작은 ghost: padding 작게, font 0.78rem, opacity 0.7, border 없음, hover/focus 시 danger 톤 + 배경 옅게). `.saved-sets-clear .icon` 14x14. `.saved-add-bar` grid 3열 → flex column. 모바일 `.saved-add-actions` grid-column 룰 폐기 |
| `docs/01_spec.md` | 5.2.5.2 UI 다이어그램 갱신 (헤더 우측 표기 + 액션바 단순화) + 시각 설명 갱신 |
| `service-worker.js` | v84 → v85 |

**시각 비교**:

```
옛 (S095-후속):
┌────────────────────────────────┐
│  추천 리스트 (N)    확정 N건    │
├────────────────────────────────┤
│  ... row 5개 ...                │
├────────────────────────────────┤
│  [+1세트] [+5세트]  [🗑 전체 삭제]│  ← 3 액션 시각 그룹 = 선택 액션 오인
└────────────────────────────────┘

새 (S095-후속 2):
┌────────────────────────────────┐
│  추천 리스트 (N)  확정 N건 🗑모두│  ← 정리 액션 = 헤더 (작은 ghost)
├────────────────────────────────┤
│  ... row 5개 ...                │
├────────────────────────────────┤
│        [+1세트] [+5세트]         │  ← 추가 액션만 그룹
└────────────────────────────────┘
```

**confirm 카피 분기**:
- 확정 0개: `추천 리스트 5개가 모두 비워집니다. 진행할까요?`
- 확정 N개: `추천 리스트 5개가 모두 비워집니다 (확정 2개 포함, 전적에서도 함께 제거됩니다). 진행할까요?`

**검증**: `node tests/run-node.js` → **316 / 316 PASS** (회귀 0). UI/카피/history filter 변경, core 함수 무변동.

**사용자 화면 기대 변동**:
- 액션바: [+ 1세트] [+ 5세트] 2 버튼만 가운데. 시각 단순화.
- 헤더 우측: 카운터 옆에 작은 "🗑 모두 비우기" 버튼 (회색 옅게).
- 확정 후 "모두 비우기" 클릭 시 모달 = 확정 N개 포함 명시 + 진행 시 전적도 정리.
- 빈 리스트 = 모두 비우기 버튼 자체 미노출.

**자비스 자기 점검 (15건째 결손)**:
- 체크박스(S095) 도입 시 "선택 액션 멘탈 모델" 자연 발생 인지 못 함. 옛 "전체 삭제" 라벨/위치가 새 frame에서 모호 신호 송출.
- 향후 룰: list UI 패턴 변경 시 동반 액션의 시각 그룹 / 어휘 정합 점검 의무. 체크박스 = "선택" 메타포 → "선택 액션 vs 전체 액션" 분리 자명.

## 2.110. Sprint 096 완료 - 기록 탭 "등수별 분포" 섹션 폐기 (S096, 2026-05-19)

배경: 사용자 질문 "기록에서 등수별 분포는 뭐지?" → 본질 진단 후 사용자 결정 = 폐기 (A 옵션).

### 2.110.1. 폐기 사유

| 측면 | 진단 |
|---|---|
| 데이터 의미 | 6/45 확률 (1등 1/8.1M / 5등 1/45) → 사용자 N회 누적으로 분포 형성 어려움. 1년 260게임 = 5등 평균 5.8회 / 1등 0회 근접 |
| summary 중복 | 상단 summary "적중 (3-5등) N건" + "최고 등수"가 이미 같은 정보 노출. 막대 차트는 시각 중복 |
| 사행성 회피 | CLAUDE.md 6.3 - 등수 분포 강조가 "내 캐릭터 N등 자주 나옴" 인지 = 캐릭터 선택 사행성 자극 가능. 면책 카피("미래 적중률 보장 X")로 보완하나 시각 막대 자체가 강한 신호 |
| 노이즈 | 데이터 부족 시 모두 0 = 빈 막대 5개 시각 노이즈 |

### 2.110.2. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/render/history-page.js` | rankChartHtml 정의 + 호출 폐기. RANK_MISS_COLOR import 폐기 (colors.js 상수 자체는 dead 잔존). horizontalBarsHtml import 폐기 (stats-page.js에서는 잔존 사용). rankItems 산출 로직 폐기 |
| `docs/01_spec.md` | 5.8.2 "등수별 분포 차트" 절을 폐기 표기로 갱신. 폐기 사유 4건 박힘 |
| `service-worker.js` | v85 → v86 |

### 2.110.3. 잔존 정보 (기록 탭 유지 영역)

- **누적 요약 그리드 (5.8.1)**: 총 추천 / 발표 완료 / 적중 / 적중률 / 최고 등수.
- **현재 회차 발표 대기 섹션 (5.8.1-A)**: 사용자 확정 직후 실시간 노출.
- **최근 30회 타임라인 (5.8.3)**: 도트 30개 + 범례. 시간 흐름 인지.
- **옛 회차 그룹 이력 (5.8.4)**: 회차별 그룹 + 추천 row + 등수 라벨.

폐기 후 정보 손실 0 (모두 다른 위치에 표시됨).

### 2.110.4. 검증

`node tests/run-node.js` → **316 / 316 PASS** (회귀 0). UI 섹션만 폐기, 로직/데이터 무변동.

### 2.110.5. 사용자 화면 기대 변동

- 기록 탭 진입 시 "등수별 분포" 섹션 + 막대 5개 + 면책 카피 사라짐.
- summary → 발표 대기 → 타임라인 → 옛 회차 그룹 순으로 자연 흐름.
- 빈 막대 노이즈 0.

### 2.110.6. Sprint 089 archive 강제 이전 (룰 1.6, 21차 정리)

본 sprint 추가로 활성 8건 도달 → 룰 1.6 cap 7건 초과 1건 → Sprint 089(절 2.103, Luck 자산 전면 폐기 + 후속 S089 라벨 변경) archive 이전. 본 sprint 종료 시점 활성 = 090 + 091 + 092 + 093 + 094 + 095 + 096 = **7건 정합**.

### 2.110.7. 잔여 / 후속

- `src/data/colors.js` `RANK_MISS_COLOR` 상수 = dead 잔존. cleanup 후순위.
- `src/render/charts.js` `horizontalBarsHtml` = stats-page.js에서 잔존 사용 (번호 빈도 / 보너스 빈도 / Top pair / Cold). 폐기 X.
- 옛 면책 카피 "참고용. 매 회차 독립 시행이므로 누적 분포가 미래 적중률을 보장하지 않습니다." = 본 sprint에서 함께 폐기. 사행성 회피 룰은 캐릭터 카드 intro + 첫 진입 모달 + 설정 탭 면책으로 일원화 (옛부터 정합).

### 2.110.8. 자비스 자기 점검 (16건째 결손)

옛 S3-T2(2026-05-01 초기)에 등수별 분포 차트 도입 시 = 6/45 확률 + 사용자 누적 회수 분석 미실시. **"있으면 좋은 정보"라는 직관으로 추가 = 사행성 회피 룰의 의미 약화**. 향후 룰:
- 데이터 시각화 추가 시 = 데이터 의미 형성 회수 점검 (확률 분포 + 예상 누적 N회) + summary 중복 점검 + 사행성 회피 룰 정합 점검.
- "있으면 좋아" 직관 추가 회피. 본질 = 사용자 결정에 도움되는 정보만 노출.

## 2.111. Sprint 097 완료 - 기록 탭 reveal 게임화 (S097, 2026-05-19)

배경: 사용자 명시 4건 묶음:
1. "기록 현재 회차에도 당첨번호 영역 표시하고 7개 구슬을 모두 물음 표 처리".
2. "발표가 나오면 당첨 번호를 표시하고 내가 구매한 번호는 색을 반투명하게 변경하고, 숫자를 하이드".
3. "오른쪽에 체크 버튼을 표시하고 체크 버튼을 누르면 왼쪽 구슬부터 하나씩 맞춰나가".
4. "맞았으면 확대 바운스 이펙트와 함께 하이라이트 표시".

### 2.111.1. 본질 - reveal 게임화

옛 흐름 = 발표 → 자동 매칭 → 즉시 등수 표시 (수동성). 새 흐름 = 발표 후에도 row가 마스킹 상태 유지 + 사용자가 체크 클릭 → 순차 reveal → 일치 ball 바운스 (능동성 + 재미). 결과 확인 자체를 미니 게임화. 사행성 회피 룰 정합 (확률 향상/필승 X, 결과 확인 UX만 강화).

### 2.111.2. 데이터 모델

| 필드 | 의미 | 기본값 / 마이그레이션 |
|---|---|---|
| `history[].revealed` (신규) | 사용자가 reveal 트리거 했는가 | 신규 등록 = false. 옛 데이터 (S097 이전) = storage load 시 true 자동 마이그레이션 (이미 매칭/노출된 상태로 간주) |

### 2.111.3. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/core/history.js` | **`revealRecommendation(character, drwNo, key)`** 신설 (idempotent, 동일 객체 반환 분기). `toggleSavedSetRegistration` 신규 entry에 `revealed: false` 필드 추가 |
| `src/data/storage.js` | `normalizeCharacter` history 마이그레이션 - `revealed` 부재 항목은 true 자동 (옛 데이터 = 이미 reveal 완료로 간주) |
| `src/render/history-page.js` | `pendingBallHtml()` 신설 (? 7개 ball). pendingHtml에 당첨번호 row 추가. `historyGroupRowHtml`에 revealed 분기 - hasDraw && revealed=false 시 ball 마스킹(`.is-masked`) + 우측 체크 버튼 노출. 옛 동작은 그대로 (revealed=true 또는 발표 대기). 발표 대기 row는 발표 대기용으로 그룹 헤더 + 본문 통합 패턴 채택 |
| `src/render/main.js` | `revealRecommendation` import. 기록 탭 렌더 후크에 `data-action="reveal-row"` 핸들러 - 좌측부터 ball 0.32s 간격 setTimeout chain reveal. 일치 ball은 `.is-bounced + .is-matched` 클래스 추가. 마지막 ball + 0.7s 후 `revealRecommendation` 호출 + renderApp |
| `styles/main.css` | `.history-num.is-pending` 룰 신설 (점선 외곽선 + ? 노출). `.history-group-row.is-masked .history-num.is-masked` (opacity 0.5 + color transparent + grayscale). reveal 후 `.is-revealed` 클래스 → `@keyframes history-ball-reveal` (scale 0.85→1.05→1). `.is-matched.is-bounced` → `@keyframes history-ball-match-bounce` (scale 0.85→1.35→0.95→1.15→1.05) + 골드 box-shadow. `.history-row-reveal` ghost 버튼 (accent border, hover 시 fill) |
| `docs/01_spec.md` | 5.8.1-A에 S097 명세 추가 (당첨 row ? 7개 + 옛 회차 reveal 게임화) |
| `docs/02_data.md` | 3.7 Recommendation schema + 본문에 `revealed: boolean` 필드 명시 |
| `tests/suites/history.test.js` | revealRecommendation 4건 신설 (entry 기본 false / true 갱신 / idempotent / 미매칭 무변동) |
| `service-worker.js` | v86 → v87 |

### 2.111.4. 사용자 흐름 (시뮬레이션)

1. **확정 직후 (현재 회차)**:
   - 기록 탭 진입 → "현재 회차 1225회 · 발표 대기 N건" 섹션.
   - 그룹 헤더 = `?` 7개 (본 6 + 보너스 1 = is-pending) + "당첨" 라벨.
   - 본문 = 사용자 확정 row들 (번호 노출, 라벨 "미발표").

2. **추첨 발표 후 (자동 매칭 완료, 사용자가 기록 탭 처음 진입)**:
   - 옛 회차 그룹 헤더 = 당첨번호 6+1 노출.
   - 본문 row들 = 모두 마스킹 상태 (반투명 + ? 노출 + 우측 "확인" 버튼).

3. **체크 클릭**:
   - row에 `.is-revealing` 클래스 + 버튼 disabled.
   - 좌측부터 ball 0.32s 간격 reveal (각 ball에 숫자 + 색 복귀 + pop 애니메이션).
   - 일치 ball은 reveal 시점에 동시에 bounce (확대 1.35 → 1.05) + 골드 box-shadow.

4. **모든 ball reveal 완료 (약 1.9 + 0.7 = 2.6초 후)**:
   - `revealRecommendation` 호출 → `history[].revealed = true` 저장.
   - renderApp 자연 호출 → 옛 동작 회귀 (등수 라벨 / dim / highlight).

### 2.111.5. 검증

`node tests/run-node.js` → **320 / 320 PASS** (316 → 320, revealRecommendation 4건 추가).

신규 단언:
- toggleSavedSetRegistration entry는 revealed: false 자동.
- revealRecommendation: 매칭 항목 true 갱신 + 새 객체 반환.
- idempotent: 이미 true면 동일 객체 (no-op).
- 미매칭 key는 동일 객체.

### 2.111.6. 사용자 화면 기대 변동

- **발표 대기**: "당첨" row에 ? 7개 (본 6 + 점선 보너스 1). 옛 추천 row는 그대로 (번호 노출).
- **발표 직후 옛 회차 그룹**: 추천 row가 마스킹 (반투명 + ? + "확인" 버튼).
- **체크 클릭 ~ 2.6초**: 좌측부터 ball 순차 reveal. 일치 ball은 강한 bounce + 골드 하이라이트.
- **reveal 완료 후**: 옛 동작 (등수 라벨 / 미일치 dim / 일치 highlight). 다음 진입부터 즉시 표시.
- **옛 데이터 (S097 이전 등록)**: storage 마이그레이션으로 자동 revealed=true → 옛 동작 유지 (영향 0).

### 2.111.7. Sprint 090 archive 강제 이전 (룰 1.6, 22차 정리)

본 sprint 추가로 활성 8건 도달 → 룰 1.6 cap 7건 초과 1건 → Sprint 090(절 2.104, 백캐스트 + 자동 history 등록 폐기 + "내 번호로 선택" 진입점 + 후속 12건) archive 이전. 본문 토큰 부담으로 archive에서 압축 표기 (큰 sprint). 본 sprint 종료 시점 활성 = 091 + 092 + 093 + 094 + 095 + 096 + 097 = **7건 정합**.

### 2.111.8. 잔여 / 후속

- 다음 추첨 발표 (2026-05-23 토 1226회) 시 본 sprint 효과 실 검증. 옛 사용자 데이터는 revealed=true 자동이라 변동 0. 사용자 현재 회차(1225회) 확정 5건이 발표 후 모두 마스킹 상태로 전환 → 사용자 체크 트리거 가능.
- reveal 시간 = 0.32s × 6 + 0.7s = 약 2.6초. 사용자 캡쳐 후 속도 조정 가능 (REVEAL_STEP_MS 상수).
- 모달 confirm 강화 - reveal 직전 확인 모달은 불요 판단 (체크 버튼 자체가 충분한 의도 표명).

### 2.111.9. 자비스 자기 점검 (17건째 결손 없음, 본 sprint = 사용자 명시 4건 정직 답습)

본 sprint = 사용자 명시 흐름을 frame 변경 없이 그대로 구현. 자비스 자율 결정 영역 = 데이터 모델 (`revealed` 필드 자연 도출) + reveal step interval (0.32s) + bounce keyframe (5단 scale) + 마이그레이션 (옛 데이터 true 자동). 모두 사용자 의도 답습 + 정합 패턴. 14건째/15건째/16건째 결손 룰 답습 정합.

### 2.111.10. S097-후속 - ? ball 원형 정합 + 미발표 dim 폐기 + 7일 자동 노출 윈도우 (2026-05-19)

배경: 사용자 캡쳐 + 명시 3건 묶음.
1. "가려진 당첨 번호가 구슬과 동일한 형태, 물음표도 중앙에 숫자보다 살짝 크게".
2. "미발표의 구슬은 반투명 적용 안함".
3. "복권 추첨하고 일주일간 가려진 채로 유지, 일주일이 지나면 현재의 옛 회차 이력과 동일하게 오픈".

### 2.111.10.1. 결손 진단

| # | 결손 | 원인 |
|---|---|---|
| 1 | ? ball이 사각형 점선 박스 | pendingBallHtml 클래스에 `num` 누락 → .num 본체 룰(원형 50% radius / flex 가운데) 미적용. .history-num만 적용되어 변태 형태 |
| 2 | 미발표 row가 6 ball 전부 반투명 | `.history-group-row-nums .num:not(.is-matched)` dim 룰이 모든 row에 일괄 적용. 미발표 row는 매칭 데이터 자체 없으므로 dim 의미 0 |
| 3 | 마스킹 무한 지속 | isMasked = hasDraw && !revealed만 판정. 시간 윈도우 부재 = 사용자가 reveal 안 하면 영구 가려짐 |

### 2.111.10.2. 정정 묶음 3건

| # | 영역 | 변경 |
|---|---|---|
| 1 | `src/render/history-page.js` `pendingBallHtml` | 클래스 `history-num is-pending` → **`num history-num is-pending`** (.num 본체 룰 자연 상속) |
| 1 | `styles/main.css` `.history-num.is-pending` | background transparent / font-size var(--font-size-md) (숫자 sm보다 살짝 큼) / font-weight 700 / border 1px dashed / **box-sizing border-box** (32x32 유지). border-radius는 .num에서 50% 상속 |
| 1 | `.is-pending.is-bonus` | 별도 outline 폐기 (가려진 상태에선 본/보너스 시각 구분 무의미) |
| 2 | `src/render/history-page.js` `historyGroupRowHtml` | hasDraw=false row에 `.is-unsettled` 클래스 추가 |
| 2 | `styles/main.css` | `.history-group-row.is-unsettled .num` = opacity 1 + filter none (dim 룰 override) |
| 3 | `src/render/history-page.js` `historyGroupRowHtml` | 7일 윈도우 판정 추가. `isWithinSettleWindow = Date.now() - new Date(draw.drwDate).getTime() < 7d`. isMasked 조건에 결합 |

### 2.111.10.3. 7일 윈도우 흐름

```
추첨일 (2026-05-23 토) ──── 7일 ──── 다음 추첨일 (2026-05-30 토)
   ↑                                       ↑
hasDraw=true 시작            윈도우 종료, 자동 노출
revealed=false면 마스킹       isMasked = false 자동
체크 버튼 노출                옛 동작 회귀 (등수 라벨)
```

사용자가 1주일 동안 reveal 안 해도 다음 추첨 시점에 자연 정리. 일관된 옛 회차 이력 화면으로 회귀.

### 2.111.10.4. 검증

`node tests/run-node.js` → **320 / 320 PASS** (회귀 0). UI/CSS/시간 판정 변경, 데이터 모델 무변동.

[의견] 시간 판정 단위 테스트는 본 sprint 범위 외 - Date.now() mock 필요. 미래 cleanup 영역. 7일 윈도우는 실 사용자 시점 검증 영역 (2026-05-23 추첨 후 캡쳐).

### 2.111.10.5. 사용자 화면 기대 변동

- **? ball (현재 회차 발표 대기)**: 원형 32x32 + 점선 dashed + ? 가운데 (숫자 14 → ? 16, 살짝 큼). 다른 구슬과 동일 형태.
- **미발표 row** (현재 회차 + 일주일 지난 draws 부재 옛 회차): 자기 번호 또렷이 노출 (반투명 X).
- **2026-05-23 ~ 2026-05-30 1225회 row**: 마스킹 + 체크 버튼.
- **2026-05-30 이후 1225회 row**: 자동 노출 (체크 트리거 무관).

### 2.111.11. S097-후속 2 - 1회 unreveal reset 자동 마이그레이션 (2026-05-19)

배경: 사용자 명시 "지난주차 것 모두 확인 안한 상태로 만들어 줄 수 있어? 직접 열어볼거야. 아직 일주일이 안지났으니 내가 직접 열지 않았으면 가려진채로 유지되어야 해. 일주일이 지나면 자동으로 오픈되겠지".

### 2.111.11.1. 결손 진단

S097 본 sprint storage.js 마이그레이션 = `revealed` 부재 항목을 true 자동 (옛 데이터는 이미 노출 상태로 간주). 결과 = 사용자 입장에서 모든 옛 항목이 옛 동작 (등수 즉시 노출). reveal 게임화 효과가 신규 등록 이후 항목에만 적용.

사용자 의도 = 일주일 윈도우 안 옛 항목들도 마스킹 상태로 되돌려 직접 reveal 트리거하고 싶음. 1회 자동 reset 진입점 필요.

### 2.111.11.2. 정정

| 영역 | 변경 |
|---|---|
| `src/data/storage.js` | flag `s097_unreveal_reset_v1` 신규. `loadCharacters`에 flag 부재 분기 추가 - 모든 character.history[].revealed = false 일괄 갱신 + flag 저장 + 갱신본 storage write. 옛 S090 클린업 flag 패턴 답습 |
| `service-worker.js` | v88 → v89 (배포 후 사용자 첫 진입 시 자동 1회 발동) |

### 2.111.11.3. 흐름

1. 본 sprint commit + push + 사용자 PWA 갱신 (Ctrl+Shift+R 또는 자연 SW activate).
2. 사용자 첫 진입 시 `loadCharacters` 호출 → flag 부재 확인 → 모든 history 항목 revealed=false 일괄 + flag 저장.
3. 기록 탭 진입 시 history-page.js의 7일 윈도우 판정 자연 적용:
   - 추첨일 + 7일 안: 마스킹 + 체크 버튼 노출.
   - 추첨일 + 7일 이상: 자동 옛 동작 (revealed=false여도 isMasked=false).
4. 사용자가 윈도우 안 row 체크 클릭 → 옛 sprint 흐름 (순차 reveal + 바운스) → revealed=true 저장.

### 2.111.11.4. 검증

`node tests/run-node.js` → **320 / 320 PASS** (회귀 0). storage 마이그레이션 추가, 옛 단언 무영향.

[의견] flag 기반 1회 자동 reset = 옛 S090 클린업 패턴 답습 정합. 미래 또 reset 원할 경우 = 사용자 명시 결정 후 다른 flag 또는 설정 버튼 신설. 본 sprint는 1회 일괄.

### 2.111.11.5. 사용자 화면 기대 변동

- 본 sprint 배포 후 PWA 갱신 시점 = 사용자 캐릭터의 모든 옛 history 항목 revealed=false.
- 기록 탭 진입 시:
  - 옛 회차(추첨일 + 7일 이상) = 옛 동작 (등수 라벨 + 일치 highlight) = 변동 0.
  - 추첨일 + 7일 안 회차 (있다면) = 마스킹 + "확인" 버튼.
- 사용자 의도 = 일주일 안 row를 직접 reveal 클릭하여 게임화 효과 체험.

### 2.111.11.6. 잔여 / 후속

- flag `s097_unreveal_reset_v1`는 영구 잔존. 다음 cleanup sprint에서 정리 가능.
- v1 suffix = 미래 다시 reset 필요 시 새 flag(예: `_v2`) 패턴 답습.

### 2.111.12. S097-후속 3 - 마스킹 ball 시각 본질 정정 (자기 색 + 원형 + ?) (2026-05-19)

배경: 사용자 캡쳐 + 명시 "모양은 구슬모양과 완전히 똑같고, 색도 자기 색이어야 하며, 숫자 영역이 물음표로 표시되어야 함. 확인을 누르면 숫자가 보이면서 연출 효과가 발생함".

### 2.111.12.1. 결손 진단

옛 S097 마스킹 룰:

```css
.history-group-row.is-masked .history-num.is-masked {
  opacity: 0.5;
  color: transparent;
  filter: grayscale(0.6);
}
```

문제 3건:
| # | 결손 | 원인 |
|---|---|---|
| 1 | ball 사각형 형태 | history-page.js 마스킹 분기 클래스에 `num` 누락 → .num 본체 원형 룰(50% radius) 미적용. 옛 pendingBallHtml 결손과 동일 패턴 |
| 2 | 색 채도 떨어짐 (회색빛) | opacity 0.5 + grayscale 0.6 = "가려진 상태"를 흐릿함으로 표현. 사용자 의도는 "자기 색 그대로" |
| 3 | 숫자 자리 빈칸 | color transparent = ? 글자조차 숨김. 사용자 의도는 "숫자 자리에 ?" |

### 2.111.12.2. 정정

| 영역 | 변경 |
|---|---|
| `src/render/history-page.js` 마스킹 분기 | 클래스 `history-num is-masked` → **`num history-num is-masked`** (.num 본체 원형 32x32 + box-sizing 상속). pendingBallHtml과 동일 패턴 |
| `styles/main.css` .is-masked | opacity 1 + color #fff + font-weight 700 + font-size var(--font-size-md) + filter none. 자기 색(numberColor.bg) 그대로 + 흰 ? 가운데 |
| reveal keyframe | 옛 `@keyframes history-ball-reveal` (scale 0.85 → 1.05 → 1) 유지 = JS가 textContent ? → 숫자 변환하는 동안 pop 연출 효과 자연 작동 |

### 2.111.12.3. 시각 비교

```
옛 (S097):
  ▢ ▢ ▢ ▢ ▢ ▢  ← 사각형 + 회색빛 (opacity 0.5 + grayscale)
  (숫자 자리 빈칸)

새 (S097-후속 3):
  ● ● ● ● ● ●  ← 원형 + 자기 색 (다른 ball과 완전 동일)
  ? ? ? ? ? ?  ← 흰 ? (숫자 자리)
                ← 우측 [확인] 버튼이 "가려진 상태" 시각 단서
```

### 2.111.12.4. 연출 효과 (확인 클릭 후)

JS setTimeout chain (옛 S097):
1. `b.classList.add('is-revealed')` → `@keyframes history-ball-reveal` 발동 (scale pop).
2. `b.textContent = n` = ? → 숫자 텍스트 변환 (pop 중간 시점).
3. 일치 ball = `b.classList.add('is-matched', 'is-bounced')` → `@keyframes history-ball-match-bounce` 추가 (강한 확대 + 골드 외곽).

옛 keyframe `opacity 0.5 → 1` 변동은 새 .is-masked가 이미 opacity 1이라 무영향. scale pop만 시각 효과.

### 2.111.12.5. 검증

`node tests/run-node.js` → **320 / 320 PASS** (회귀 0). HTML 클래스 + CSS 룰만 변경.

### 2.111.12.6. 사용자 화면 기대 변동

- 마스킹 row의 6 ball = 다른 ball과 완전 동일 외형 (numberColor 자기 색 + 원형 32x32).
- 각 ball 가운데 = 흰색 ? (숫자 자리).
- 우측 = "확인" 버튼.
- 사용자가 어떤 번호를 골랐는지 = 색 패턴으로 시각 식별 가능 (자기 색 보존).
- 클릭 시 좌측부터 ball 순차 reveal → ? 텍스트가 숫자로 변환 + scale pop. 일치 ball은 추가 bounce + 골드 외곽.

### 2.111.12.7. 자비스 자기 점검 (17건째 결손)

옛 S097 마스킹 룰 = "가려진 상태"를 채도/투명도로 표현 = 사용자 멘탈 모델("구슬은 구슬 그대로, 숫자 자리만 ?")과 어긋남. 사용자 캡쳐 + 명시 후 정정. 향후 룰:
- "가려진 정보"의 시각 메타포 결정 시 = 사용자 의도 사전 확인 의무. 채도 떨어뜨리기 vs 숫자만 가리기는 다른 frame.
- 사용자가 "ball 모양 + 자기 색"이라고 명시한 경우 = 시각 변형 금지. 정보 마스킹은 텍스트 자리에만 적용.

### 2.111.13. S097-후속 4 - reveal 직후 불일치 즉시 dim + 일치 즉시 highlight (2026-05-19)

배경: 사용자 명시 "번호가 틀린 것은 확인되는 순간 즉시 반투명으로 바뀌어야 하고, 맞은 것은 즉시 하이라이트가 표시되어야 해".

### 2.111.13.1. 결손 진단

옛 S097-후속 3 정정 후 흐름:
- reveal 시점 = `b.classList.add('is-revealed')` + 일치면 `is-matched is-bounced` 추가.
- CSS `.history-num.is-matched` = highlight (옛 룰) - 일치 ball 정상 작동.
- 불일치 ball = .is-revealed만 → **dim 안 됨**.

원인: 옛 `.history-group-row-nums .num:not(.is-matched)` dim 룰이 `.history-group-row.is-masked .history-num.is-masked` (opacity 1) specificity로 override 당함. reveal 후에도 자기 색 그대로 유지.

### 2.111.13.2. 정정

`styles/main.css` 룰 신설:

```css
.history-num.is-masked.is-revealed:not(.is-matched) {
  opacity: 0.35;
  filter: grayscale(0.7);
}
```

- specificity = 클래스 3건(.history-num + .is-masked + .is-revealed) + 부정(:not) = `.is-masked` 단독보다 강함.
- reveal 시점에 .is-revealed 클래스 추가 → CSS 분기 즉시 적용 → 불일치 ball만 dim.
- 일치 ball = .is-matched 추가 → :not 분기 제외 → 옛 highlight + bounce 그대로.

### 2.111.13.3. 사용자 화면 기대 변동

reveal 흐름 (확인 클릭 후 좌측부터 0.32초 간격):
- ball 1: ? → 숫자 + pop. 일치 = 골드 highlight + bounce. 불일치 = 즉시 반투명 + grayscale.
- ball 2~6: 동일 패턴 순차.

reveal 완료 (마지막 ball + 0.7초) 후 `revealRecommendation` 호출 → renderApp → 옛 동작 회귀:
- 옛 .num:not(.is-matched) dim 룰이 그대로 적용 = 불일치 dim 유지.
- 일치 ball highlight 유지.

### 2.111.13.4. 검증

`node tests/run-node.js` → **320 / 320 PASS** (회귀 0). CSS 룰 1건만 추가.

### 2.111.14. S097-후속 5 - 전적 summary 5칸 한줄 통일 (2026-05-19)

배경: 사용자 캡쳐 + 명시 "전적 5칸을 한줄로 만들 수 있나?". 옛 .summary-grid = 데스크톱 3열 + 480px↓ 2열 → 모바일에서 3+2 줄 wrap.

### 2.111.14.1. 정정

`styles/main.css` .summary-grid 룰 갱신:

| 영역 | 옛 | 새 |
|---|---|---|
| grid-template-columns | desktop `repeat(3, 1fr)` / mobile `repeat(2, 1fr)` | **`repeat(5, 1fr)` 통일** |
| gap | var(--space-2) | mobile var(--space-1) / desktop var(--space-2) |
| li padding | var(--space-2) | mobile var(--space-2) var(--space-1) / desktop var(--space-2) |
| 라벨 font-size | 11px | mobile **10px** / desktop 11px |
| 값 font-size | 18px | mobile **15px** / desktop 18px |
| 라벨 letter-spacing | 0.05em | 0.03em (압축) |
| 라벨 line-height | (auto) | 1.25 + word-break keep-all |
| 값 line-height | (auto) | 1.2 |

`@media (min-width: 481px)` 분기로 데스크톱 = 옛 폰트/padding 복귀, 모바일만 압축 적용.

### 2.111.14.2. 폭 계산

- 모바일 360px (캐릭터 width 약 340 - section padding) ÷ 5 셀 - gap = 약 60-64px / 셀.
- 라벨 "적중 (3-5등)" = 8자 + 괄호 = 자연 2줄 wrap. line-height 1.25로 자연 표시.
- 값 = 1-3 자리 숫자 (총 추천 N / 발표 완료 N / 적중 N / 적중률 X.X% / 최고 등수 N등). 15px font + tabular-nums로 정렬.

### 2.111.14.3. 검증

`node tests/run-node.js` → **320 / 320 PASS** (회귀 0). CSS 룰 통합 갱신.

### 2.111.14.4. 사용자 화면 기대 변동

- 모바일: 전적 summary = 5칸 한 줄. 라벨 작아짐 + 일부 라벨 2줄 wrap("적중 (3-5등)").
- 데스크톱: 5칸 한 줄 + 폰트/padding 옛 사이즈 유지.
- 시각 압축으로 발표 대기 섹션이 더 빨리 보임 (scroll 위치 상승).

### 2.111.14.5. 잔여 / 후속

- 옛 잔재 .summary-grid 룰 (line 957-982 line 1569 중복) = cleanup 영역. 본 sprint는 line 1569만 정정 (cascade 우선).
- 라벨 wrap 2줄 = 모바일 320px 이하 환경에서는 더 좁아질 가능성. 최소폭 검증은 실 디바이스 영역.

### 2.111.15. S097-후속 6 - 기록 ball 모바일 곡선 + cascade 역전 차단 (2026-05-22)

배경: 사용자 보고 "기록탭에 사용되는 구슬과, 추천탭에 사용되는 구슬의 디자인 토큰이 서로 다른가? 폰에서 추천탭은 핸드폰 사이즈에 맞게 크기가 살짝 작아지는데, 기록 탭은 전혀그렇게 동작하지 않아".

#### 2.111.15.1. 누락 진단

- 추천 탭 ball (`.saved-set-row .num-cell .num`, specificity (0,3,0)) = 44 → 480px 36 → 360px 24 곡선 정상.
- 기록 탭 ball (`.history-num`, specificity (0,1,0)) = 데스크톱 32 명시, 모바일 룰 누락.
- 본체 `.num` (specificity (0,1,0))에는 480px 40 / 360px 36 모바일 룰 명시. cascade 동률 시 source order 후행 우선.
- 결과: 모바일 진입 시 `.history-num` 32 → 본체 `.num` 40 으로 **오히려 ball이 커지는** 회귀. 사용자가 본 "안 작아진다" 호소의 정확한 원인.

#### 2.111.15.2. 결정

[의견] 옵션 3건 (추천 곡선 통일 / 모바일 cascade만 차단 / 본체 룰에 예외 지정) 중 **1번(추천 탭과 동일 곡선)** 채택. 사용자 권장 그대로. 데스크톱 32는 옛 SSOT 보존 + 모바일 곡선만 신규 명시.

| 폭 | 추천 ball | 기록 ball (신규) |
|---|---|---|
| 데스크톱 | 44 | 32 |
| 480px↓ | 36 | 28 |
| 360px↓ | 24 | 24 (시각 통일) |

font는 `var(--font-size-sm)` 12px 단일 유지 (가독성 OK, 24x24에서 비율 50%).

#### 2.111.15.3. 변경 파일

| 파일 | 변경 |
|---|---|
| `docs/01_spec.md` 5.8.4 | line 529에 ball 사이즈 곡선 SSOT 명시 추가 + 회귀 원인 메모 |
| `styles/main.css` @media 480px↓ (line 3078) | `.history-num { width: 28px; height: 28px; font-size: var(--font-size-sm); }` 추가. 본체 `.num` 40px 뒤에 위치하여 cascade 동률 후행 우선으로 자연 차단 |
| `styles/main.css` @media 360px↓ (line 3104) | `.history-num { width: var(--space-5); height: var(--space-5); font-size: var(--font-size-sm); }` 추가. 24px = `--space-5` 토큰화 |

#### 2.111.15.4. 검증

`node tests/run-node.js` → **320 / 320 PASS** (회귀 0). CSS만 변경, 데이터 / 로직 무변동.

#### 2.111.15.5. 사용자 화면 기대 변동

- 데스크톱: 변동 없음 (32 유지).
- 480px↓ (일반 폰): 기록 ball 28x28, 추천 ball 36x36. 그룹 헤더 당첨 row + 본문 추천 row 동일 사이즈 28. `?` ball / 마스킹 ball / `+` 구분자 / dim / glow 룰 자연 cascade.
- 360px↓ (좁은 폰): 기록 ball 24x24 = 추천 ball 24x24 시각 통일.

#### 2.111.15.6. 잔여 / 후속

- 28px 영역 / 36px 영역은 토큰 부재. ball 사이즈 토큰화는 이 영역 외 cleanup 후속 (옛 본체 `.num` 40 / 36 / 32도 매직값 유지 중).
- `.history-num.is-pending` (?) ball font-size = `var(--font-size-md)` 14px. 24x24 ball에서 비율 약 58% = ? 글자가 ball을 거의 채움. 사용자 캡쳐 후 가독성 영역 별도 검증 가능.
- 자비스 자기 점검: 이 sprint = 18건째 누락 없음. 사용자 진단 영역 → 자비스 옵션 3건 제시 → 사용자 1번 선택 → docs 우선 갱신 → CSS 변경 → 회귀 0. 직답 워크플로우 일치.

### 2.111.16. S097-후속 7 - 추천 row 라벨 가운데 정렬 (콘텐츠 무게중심 대칭) (2026-05-22)

배경: 사용자 보고 "추천 숫자가 중앙에 있지 않고 살짝 오른쪽으로 치우쳐 있는 것 같아".

#### 2.111.16.1. 누락 진단

격자 자체 (`.saved-set-row` grid-template-columns: `var(--space-6) 1fr var(--space-6)`)는 좌우 24px 동일 = 격자 대칭. 그러나 컬럼 안 콘텐츠 정렬이 비대칭:

| 영역 | 옛 정렬 | 무게중심 |
|---|---|---|
| `.saved-set-idx` (라벨 "N") | text default = 좌측 정렬 | 좌측 컬럼 좌측 끝 (= row 가장 왼쪽) |
| `.saved-set-register` (체크박스) | `inline-flex; justify-content: center; width var(--space-6)` | 우측 컬럼 정중앙 |

좌측 무게가 row 좌측 가장자리에 모이고 우측 무게가 컬럼 안쪽에 있어, 사람 눈이 콘텐츠 무게중심을 기준으로 좌우 균형을 잡으면서 ball이 우측 치우쳐 보이는 시각 회귀.

S091-후속 `.saved-set-row.is-registered` 의 negative margin-left + padding-left 보상 패턴도 등록 row 좌측 background 띠로 시각 무게를 더 좌측으로 끌어 같은 영역의 회귀를 강화. 이 sprint는 라벨 정렬만 정정 (background 룰 무변동).

#### 2.111.16.2. 정정

| 파일 | 변경 |
|---|---|
| `docs/01_spec.md` 5.2.1.2 | 격자는 옛부터 대칭이고 이 sprint는 콘텐츠 정렬만 좌우 일치라는 본질 명시 추가 (S097-후속 7) |
| `docs/01_spec.md` 5.2.1.3 | "좌측 인접" → "좌측 컬럼 안 가운데 정렬"로 SSOT 정정 |
| `styles/main.css` `.saved-set-idx` | `display: flex; align-items: center; justify-content: center` 3줄 추가. 옛 font-size / font-weight / color 보존 |

#### 2.111.16.3. 검증

`node tests/run-node.js` → **320 / 320 PASS** (회귀 0). CSS 1 룰 정렬 추가, 데이터 / 로직 / 격자 폭 무변동.

#### 2.111.16.4. 사용자 화면 기대 변동

- 라벨 "N" 글자가 좌측 컬럼 안에서 옛 좌측 끝 → 컬럼 정중앙으로 이동 (시각 약 8~10px 우측 이동, 컬럼 폭 24px의 절반 영역 안).
- ball 6개 영역 = 격자 1fr 컬럼 = row 정중앙 (옛부터 같은 위치). 사용자 시각상 좌우 콘텐츠 무게중심 균형이 맞아 ball이 중앙으로 인지.
- 토글 정렬 무변동. is-registered row background 좌측 12px 확장 룰도 무변동.

#### 2.111.16.5. 잔여 / 후속

- is-registered row의 negative margin-left + padding-left 비대칭이 격자 시작점 자체는 보존하지만 background 좌측 띠 무게로 ball을 우측 치우쳐 보이게 만들 잔존 가능. 이 sprint 라벨 가운데 정렬로 일차 완화되었으나 캡쳐 후 잔존 시 별도 sprint에서 좌우 background 균형 영역 검토 가능.
- 자비스 자기 점검: 이 sprint = 19건째 누락 없음. 사용자 시각 보고 → 격자 vs 콘텐츠 정렬 영역 분리 진단 → 옵션 3건 제시 → 사용자 권장 선택 → docs SSOT 갱신 → CSS 1 룰 추가 → 회귀 0. 직답 워크플로우 일치.

### 2.111.17. 전체 코드 검증 + 발견 3건 수정 (2026-06-11)

배경: 사용자 "lotto 프로그램 전체 코드 검증해줘". 4갈래 병렬 검증(core 로직 / render·UI / data·사행성 카피 / docs-코드 일치) 후 사용자 "모두 수정해줘"로 발견 3건 일괄 수정.

#### 2.111.17.1. 검증 결과 종합

회귀 322 PASS. 아키텍처 절대 규칙 위반 0 - core의 DOM/localStorage 참조 0건, 렌더-로직 분리 준수, 사용자 입력 XSS escape 전 지점 확인, 사행성 카피(확률 향상/필승/당첨 보장) 0건 + 면책 카피 존재 확인. 한 서브에이전트가 clearAll의 잠긴 기록 삭제를 심각으로 올렸으나, 직접 대조 결과 버그 아님(기록 잠금 S3은 추천 체크해제·모두비우기 보호 범위, 전체 초기화는 명시 confirm 받는 별개 기능)으로 판정.

#### 2.111.17.2. 수정 3건

| 파일 | 변경 | 등급 |
|---|---|---|
| `src/core/recommend.js` `seedSixNumbers` | `1~45`·`6` 하드코딩 → `NUMBER_MIN`/`NUMBER_MAX`/`PICK_COUNT` 상수 | 주의(매직넘버, 절대규칙 위반) |
| `src/core/reverse.js` `validateUserNumbers` | `1~45`·`6` 하드코딩 → 상수 import + 템플릿 메시지 | 주의(매직넘버) |
| `docs/01_spec.md` 화면트리·4.7.1 | "11개/11종/통계(5)" → "10종(S34 짝꿍 폐기 후)/통계(4)" | 참고(옛 표기 잔재) |
| `src/render/preset-editor.js` + `01_spec.md` 5.1.5.2 | 편집 모달 `dismissible:false` (backdrop·Esc 닫기 차단) + 사양 닫기 정책 1줄 신설 | 참고(편집 중 실수 이탈 방지) |

#### 2.111.17.3. 검증

`node tests/run-node.js` → **322 / 322 PASS** (회귀 0). 매직넘버 치환은 상수값 동일이라 추첨 결과·결정론 무변동. docs 표기는 strategy-picker 테스트의 실제 10종과 참조 일치.

#### 2.111.17.4. 잔여 / 후속

- `01_spec.md` 57행 "전략 시트" 줄은 4.7에서 "시트 모달 폐기" 명시된 옛 기능 잔재. 화면 트리에서 줄 자체 삭제가 정합이나 문서 구조 결정이라 이번 미수행(개수 표기만 정정). 차기 docs 정리 cycle 후보.

