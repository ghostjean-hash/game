# Lotto 진행 로그

# 1. 현재 상태

1.1. **마일스톤**: M0~M6 + 폴리싱 + 사주 + 휠링 + 11전략 모두 완료. 페치 적재 + 사용자 시안 검증 단계.
1.2. **시작**: 2026-05-01.
1.3. **마지막 갱신**: 2026-05-01 (데이터 출처 dhlottery → smok95 미러 전환).
1.4. **적용 표준**: html-game v0.2.

# 2. 완료 마일스톤

## 2.1. M0 (기획 골격 + 표준 적용)

- 폴더 환경 + html-game v0.2 표준 적용 + docs 4종.

## 2.2. M1 (MVP)

- 1단계: 시드(FNV-1a) + 데이터 골격 + 페치 스크립트.
- 2단계: random / luck / stats / recommend / fortune 코어 + 테스트 58개.
- 3단계-A: storage + colors + 면책 모달 + bootstrap.
- 3단계-B: 캐릭터 생성 폼 + 캐릭터 카드 + 추천 카드 + 메인 화면 wire-up.
- 부수: 개발환경 SW 차단(`shared/ui.js`), 정적 dev 서버(`scripts/dev-server.mjs`), `_registry.json` network-first.

## 2.3. M2 1단계 (캐릭터 슬롯)

- `src/render/character-slots.js` 신규 (슬롯 목록 + 추가 / 삭제 버튼).
- `src/render/main.js` 갱신 (슬롯 영역 + 캐릭터 전환 / 추가 모달 / 삭제).
- `src/render/modal.js` 갱신 (showModal이 close 함수 반환).
- `styles/main.css` 슬롯 스타일 추가.
- `docs/01_spec.md` 4장 화면 흐름 갱신 (슬롯 / 모달 / 다중 캐릭터).
- `docs/03_architecture.md` 폴더 트리에 character-slots.js 반영.

## 2.4. M3 (통계 시각화)

- `src/render/charts.js` 신규 (가로 막대 차트 헬퍼, 외부 lib 없음).
- `src/render/stats-page.js` 신규 (본번호 빈도 / 보너스 분리 / 동시출현 top 20 / Cold top 10).
- `src/render/main.js` 갱신 (`통계 보기` 버튼 + 진입 핸들러).
- `styles/main.css` 갱신 (통계 섹션 / empty-state / 막대 차트).
- `docs/03_architecture.md` 폴더 트리에 charts.js / stats-page.js 반영.
- 데이터 없을 때(`draws.json` 비어 있음) empty-state로 페치 명령 안내.

## 2.20. 통계 페이지 갱신 흐름 (날짜 기준 자동/명시)

- `src/data/storage.js` `syncDrawsIfNewer()` 신규.
  - 미러 `latest.json` 한 방 peek → cached max drwNo와 비교.
  - 새 회차 있을 때만 정적 `draws.json` 다시 fetch + `saveDraws()`.
  - 결과 객체 `{ updated, reason, draws, latestDrwNo, latestDrwDate }` 반환.
- `src/render/stats-page.js` 갱신 UI:
  - 헤더 우측에 "↻ 갱신" 버튼.
  - 헤더 아래 메타 라인 "{N}회까지 반영 · 최근 추첨 YYYY-MM-DD".
  - 페이지 진입 시 자동 sync (조용히, 새 회차 있을 때만 토스트).
  - 갱신 버튼 클릭 시 모든 결과 토스트로 통보 (이미 최신 / 미러 실패 / CI 지연).
- `styles/main.css`: `.btn-refresh` / `.stats-meta` / `.stats-toast` + `.stats-header` grid 3컬럼.
- `docs/01_spec.md` 5.3.1 신규.
- `docs/02_data.md` 4.3 클라이언트 동기화 두 갈래(boot syncDraws / 통계 syncDrawsIfNewer) 명시.
- 사용자 결정(2026-05-01): "날짜 기준 새 정보 있을 때만". 새 회차 없으면 무동작 + 화면 깜빡임 없음.

## 2.19. 페치 사용성 개선 (.bat + 메시지 톤 + 데이터 배너)

- `scripts/fetch-lotto-draws.bat` 신규 (Windows 더블클릭. ASCII 영문만, cp949 인코딩 충돌 회피).
- `src/render/stats-page.js` empty-state 톤 부드럽게 + .bat 안내 우선.
- `src/render/main.js` 데이터 없을 때 메인 상단 `.data-banner` 자동 노출.
- `styles/main.css` `.data-banner` (옅은 골드 배너).
- `src/render/main.js` `DEFAULT_DRWNO` 1100 → 1222 (사용자 확인: 2026-05-02 토 추첨).
- `README.md` 충실히 채움 (메커닉 / 11전략 / 운세 / 휠링 / 실행 / 페치 / 테스트 / 윤리 / 표준).

## 2.18. MBTI + 별자리 원소 전략 추가 (11종)

- `src/data/numbers.js`:
  - `STRATEGY_MBTI` / `STRATEGY_ZODIAC_ELEMENT` 추가.
  - `MBTI_TYPES` (16종) + `MBTI_LUCKY` 매핑 (각 7개 번호).
  - `ZODIAC_ELEMENTS` (fire/earth/air/water) + `ZODIAC_ELEMENT_LUCKY` 매핑.
- `src/core/recommend.js`:
  - `mbtiWeights` / `zodiacElementWeights` / `zodiacElementOf` 헬퍼.
  - 2개 전략 분기 추가. ctx에 `mbti` 필드 받음.
- `src/render/character-form.js`:
  - MBTI select 필드 (선택, 미지정 가능).
  - Character에 `mbti` 보관.
- `src/render/character-card.js`:
  - 카드 메타에 MBTI 라벨 (녹색 톤 + 모노스페이스).
- `src/render/strategy-picker.js`: 11개 STRATEGIES.
- `src/render/main.js`: recommend ctx에 `mbti` 전달.
- `styles/main.css`: `.char-mbti` 스타일.
- `tests/suites/recommend.test.js`: 5 케이스 추가 (mbti / zodiacElement / 그룹 매핑 검증).
- `docs/02_data.md` 1.5 11종 표 + 1.13 MBTI + 1.14 별자리 원소 + 3.6 Character.mbti.
- `docs/01_spec.md` 5.1 11종 명시.

## 2.17. 축약휠 (Abbreviated Wheel) + 4-if-4 보장 검증

- `src/core/wheeling.js` 갱신:
  - `abbreviatedWheel(pool, ticketCount, seed)`: mulberry32 기반 결정론적 N장 셔플 + 선택.
  - `isCovering4if4(tickets, pool)`: 풀의 모든 4개 조합에 대해 어떤 티켓이든 4개 모두 포함 여부 확인.
  - `validatePool` / `combinations` 모듈 내 헬퍼로 정리.
- `src/render/wheeling-page.js` 갱신:
  - 휠 타입 토글(Full / Abbreviated).
  - Abbreviated 선택 시 티켓 수 입력 (기본 = Full / 4).
  - 4-if-4 보장 검증 결과 배너 표시 (통과 = 골드 / 미통과 = 빨강).
- `styles/main.css` `.wheel-type-list` 추가.
- `tests/suites/wheeling.test.js` 11 케이스 추가 (abbreviatedWheel + isCovering4if4 검증).
- `docs/01_spec.md` 5.5.4 휠 종류 갱신.
- 정직성: 4-if-4 보장 미통과 시 명확히 표시. Full Wheel만 자동 보장 명시.

## 2.16. 전략 라인업 확장 (9종)

- `src/data/numbers.js` `STRATEGY_TREND_FOLLOWER` / `STRATEGY_INTUITIVE` / `STRATEGY_BALANCER` 추가.
- `src/core/recommend.js` 3개 전략 분기 + `trendWeights` / `intuitiveWeights` / `passesBalanceFilters` / `balancedSample` 함수 추가.
- `src/render/strategy-picker.js` 9개 STRATEGIES (추/직/균 약자).
- `tests/suites/recommend.test.js` 5 케이스 추가 (각 전략 동작 + intuitive 결정론 + balancer 필터 통과율).
- `docs/02_data.md` 1.5 9종 표.
- `docs/01_spec.md` 5.1 전략 9종 명시.
- 균형주의자: 합 121~160 + 홀짝 3:3 필터. 최대 50회 시드 변형 재추첨, 못 찾으면 fallback (균등 결과).
- 직감주의자: 매 회차 mulberry32로 0.5~2.0 분포. 같은 시드+회차 = 같은 분포 (결정론).
- 추세추종자: 최근 30회 빈도(`recent30`) 가중.

## 2.15. 휠링 시스템 (다구좌 모드 옵션)

- `src/core/wheeling.js` 신규 (`fullWheel(pool)` + `combinationCount(n,k)` + 풀 검증).
- `src/render/wheeling-page.js` 신규 (풀 입력 / 추가 / 제거 / 전체비우기 + Full Wheel 결과 + 비용 + 1등 보장 조건).
- `src/data/storage.js` 옵션에 `advancedMode` 추가 + 누락 키 마이그레이션.
- `src/render/main.js` "다구좌 모드 ON/OFF" 토글 + ON 시 "휠링 보기" 버튼 노출 + 첫 ON 시 윤리 안내 모달 강제.
- `styles/main.css` 휠링 페이지 스타일 (.pool-display / .pool-input / .wheel-tickets / .wheel-ticket).
- `tests/suites/wheeling.test.js` 신규 (20 케이스: combinationCount / fullWheel 검증).
- `docs/02_data.md` 3.2 옵션 키 명시 + advancedMode.
- `docs/01_spec.md` 5.5 휠링 절 신규 (목적 / 노출 정책 / 휠 종류 / 윤리).
- `docs/03_architecture.md` wheeling.js / wheeling-page.js.
- 기본값 OFF (라이트 사용자 비노출). 첫 ON 시 윤리 안내 강제. "확률 향상" 표현 절대 금지.

- `src/core/saju.js` 신규 (천간 10 / 지지 12 / 오행 5 / 상생·상극 / `dateToDayPillar` / `dayPillarLabel` / `pillarElement` / `elementRelation`).
- `src/core/fortune.js` 갱신: 띠 분포 + 오행 관계 6종 보정 가산 후 정규화. 회차 drwDate 있을 때만 활성. (`fortuneFor` 시그니처에 `charPillar` 추가.)
- `src/render/character-form.js` 캐릭터 생성 시 `dateToDayPillar(birth)` → `dayPillar` 보관.
- `src/render/character-card.js` 카드 메타에 일주 라벨 (`갑자일` 형태) 표시 + 모노스페이스 미세 강조.
- `src/render/main.js` `fortuneFor` 호출에 `active.dayPillar` 전달.
- `styles/main.css` `.char-pillar` 스타일 (모노스페이스 + 옅은 골드 배경).
- `tests/suites/saju.test.js` 신규 (22 케이스: 일주 / 라벨 / 오행 / 관계 / 한글).
- `tests/runner.js` saju.test.js 등록.
- `docs/02_data.md` 1.12 신규 (천간 / 지지 / 오행 / 관계 / 보정값) + 3.6 Character 스키마에 `dayPillar`.
- `docs/01_spec.md` 5.1 / 5.1.4 신규 (사주 보정 명시).
- `docs/03_architecture.md` 폴더 트리에 saju.js.
- 보정 강도 ±0.07 이내 (분포 자체 뒤집히진 않음). 확률 영향 없음.

## 2.13. 캐릭터-전략 분리 + 명명 변경

- **개념 분리**: 캐릭터(정체성) + 전략(추첨 도구). 같은 캐릭터로 6 전략 모두 시도 가능.
- **명명 변경**: `className` → `strategyId` / `CLASS_*` → `STRATEGY_*` / "클래스" → "전략" 일괄 rename.
- `src/data/numbers.js` `STRATEGY_*` + `STRATEGY_DEFAULT` (`blessed`).
- `src/core/recommend.js` ctx 인자 `strategyId`로 변경.
- `src/render/character-form.js` 클래스 선택 UI 제거 + 캐릭터에 `lastUsedStrategy` 기본값 저장.
- `src/render/character-card.js` 클래스 라벨 자리 → 별자리 라벨 추가 (띠 + 별자리 함께 표시).
- `src/render/character-slots.js` `CLASS_SHORT` 제거 → 캐릭터 이름 첫 글자.
- `src/render/strategy-picker.js` 신규 (메인 화면 상단, 6개 전략 버튼 + 활성 강조).
- `src/render/main.js` 전략 picker 통합. 활성 캐릭터의 `lastUsedStrategy` 사용 + 클릭 시 갱신 / 저장.
- `styles/main.css` `.strategy-picker` / `.strategy` / `.char-zodiac` 스타일 추가.
- `tests/suites/recommend.test.js` strategyId로 일괄 변경 + 전략 분리 케이스 추가.
- `docs/02_data.md` 1.5 / 3.6 갱신 (전략은 캐릭터 속성 아님 명시).
- `docs/01_spec.md` 5.1 / 5.1.3 캐릭터-전략 분리 명시.
- `docs/03_architecture.md` 폴더 트리에 strategy-picker.js.
- 기존 캐릭터 자동 마이그레이션 (`lastUsedStrategy` 누락 시 `STRATEGY_DEFAULT`).

## 2.12. 캐릭터 확장 (3종 추가)

- `src/data/numbers.js` 새 클래스 ID (`CLASS_REGRESSIONIST` / `CLASS_PAIR_TRACKER` / `CLASS_ASTROLOGER`) + `ZODIAC_LUCKY` 매핑.
- `src/core/recommend.js` 3종 추첨 가중치 정책:
  - 회귀주의자: `gapWeights` (currentGap 가중).
  - 짝궁추적자: 시드 → keyNumber + 동시출현 페어 가중.
  - 점성술사: 별자리 → 행운 번호 5배 boost.
- `src/render/character-form.js` 클래스 6종 옵션 + Character에 `zodiac` 보관.
- `src/render/character-card.js` `CLASS_LABELS` 6종.
- `src/render/character-slots.js` `CLASS_SHORT` 6종 (회/짝/점).
- `src/render/main.js` recommend ctx에 `cooccur` / `zodiac` 전달 + `state.cooccur` 캐시.
- `tests/suites/recommend.test.js` 4 케이스 추가.
- `docs/02_data.md` 1.5 / 3.6 / 1.11 ZODIAC_LUCKY.
- `docs/01_spec.md` 5.1 클래스 6종 명시.

## 2.11. 폴리싱 2단계 (라이트 테마 전환)

- `styles/tokens.css` UI 토큰 라이트 톤으로 전환 (배경 #f7f7f9 / surface #ffffff / text #1a1a1f / accent #c9a050).
- `src/data/colors.js` 게임 색상 라이트 톤 (FORTUNE / NUMBER_CARD / RANK_GLOW).
- `styles/main.css` 인라인 hex 라이트 보정 (.num / .bonus-num / .modal-confirm) + 카드 미세 box-shadow 추가.
- `src/render/history-page.js` / `src/render/stats-page.js` 인라인 색상 라이트 톤.
- `docs/02_data.md` 2.1~2.3 색상 표 갱신.
- 페이지 스코프 라이트(다른 게임은 다크 유지). sudoku와 같은 분리 패턴.

## 2.10. 폴리싱 1단계 (접근성)

- `styles/main.css` `prefers-reduced-motion` + `:focus-visible` + `.sr-only` 추가.
- `src/render/modal.js` ESC/Enter 키 / `tabindex` / 포커스 자동 이동.
- `src/render/character-slots.js` `aria-pressed` / `aria-label` / `role="group"`.
- `src/render/character-card.js` `role="progressbar"` (Luck 바) / 카드/운세 aria-label.
- `src/render/draw-card.js` 본번호 `role="list"` + 각 번호 `role="listitem"` + aria-label.
- `index.html` `<meta description / theme-color>` + 스킵 링크 + `aria-live="polite"`.
- `docs/04_conventions.md` 4장 접근성 절 추가 (5/6/7장으로 번호 재정렬).

## 2.9. M6 (갱신 자동화)

- `scripts/fetch-lotto-draws.mjs` 증분 모드 추가:
  - 인자 없으면 기존 `draws.json` 로드 → 마지막 drwNo + 1 ~ 최신만 페치.
  - `--full` 플래그로 강제 전수.
  - 기존 + 신규 병합 (drwNo 기준 dedupe).
- `src/data/storage.js`에 `syncDraws()` 추가 (페이지 진입 시 정적 JSON → localStorage 동기화).
- `src/main.js` boot에서 `await syncDraws()`.
- `service-worker.js` `NETWORK_FIRST_PATHS`에 `draws.json` 추가.
- `.github/workflows/fetch-lotto.yml` 신규 (매주 일요일 03:00 KST 자동 페치 + commit & push).
- `docs/02_data.md` 4.3 / 4.4 갱신 (자동화 / 증분 / 클라이언트 동기화 / SW 정책).
- `docs/03_architecture.md` storage.js 책임 갱신.

## 2.8. M5 3단계 (일진 정밀화 + 길일 UI)

- `src/core/zodiac.js`에 `dateToAnimalSign(dateStr)` + `drawToAnimalSign(drawOrDrwNo)` 추가.
- 60갑자 기준일 1984-02-02 (갑자일 = rat). 일자 차이 mod 12로 정밀 일진.
- `src/core/fortune.js` 갱신: draw 객체 인자 받아 정밀 일진 활용. drwDate 없으면 drwNo mod 12 fallback.
- `src/render/main.js` 갱신: `state.draws`에서 현재 drwNo의 draw 찾아 fortune 계산에 전달.
- `src/render/character-card.js` 갱신: 운세 등급에 따라 `is-bad` / `is-great` 클래스.
- `src/render/draw-card.js` 갱신: 운세 인자 + 흉일 / 대길 배너 표시.
- `styles/main.css` 갱신: 카드 외곽 톤 + 배너 스타일.
- `tests/suites/zodiac.test.js` 9 케이스 추가 (date / draw 헬퍼).
- `docs/02_data.md` 1.10.2 정밀화 명시.
- `docs/01_spec.md` 5.1.1.2 갱신 + 5.1.2 길일 UI 절 추가.

## 2.7. M5 2단계 (Luck 성장 룰)

- `src/core/luck.js`에 `applyLuckGrowth(character)` + `rankLuckBonus(rank)` 추가.
- 등수별 보너스: 1등 +20 / 2등 +15 / 3등 +10 / 4등 +5 / 5등 +2.
- `src/core/history.js`의 `recordRecommendation` 갱신 (luckApplied: false 기본, 같은 drwNo 재기록 시 기존 luckApplied 보존).
- `src/render/main.js`에서 추천 표시 시 `applyLuckGrowth` 호출 → 매칭된 항목 1회 적용 보장.
- `tests/suites/luck.test.js`에 9 케이스 추가 (보너스 / 잠금 / 재호출 / 누적 / cap).
- `docs/02_data.md` 3.7 Recommendation 스키마에 luckApplied + 3.8 등수 보너스 표.
- `docs/01_spec.md` 7.2 갱신.

## 2.6. M5 1단계 (12간지 + 운세 정밀화)

- `src/core/zodiac.js` 신규 (yearToAnimalSign / drwNoToAnimalSign / zodiacRelation).
- `src/data/numbers.js` 1.10 ANIMAL_SIGNS 추가.
- `src/render/character-form.js` 생성 시 birthYMD 연도 → animalSign 자동 저장.
- `src/core/fortune.js` 갱신 (띠 관계별 분포 - same / sahap / chung / normal).
- `src/render/character-card.js` 띠 라벨 표시 (`쥐띠`, `용띠` 등).
- `src/render/main.js` fortuneFor 호출에 animalSign 전달.
- `styles/main.css` char-meta / char-animal 스타일.
- `tests/suites/zodiac.test.js` 신규 (16 케이스).
- `tests/suites/fortune.test.js` 갱신 (관계 분포 검증).
- `docs/02_data.md` 1.10 12간지 + Character 스키마에 animalSign.
- `docs/01_spec.md` 5.1 / 5.1.1 운세 분포 표 추가.
- `docs/03_architecture.md` 폴더 트리에 zodiac.js.

## 2.5. M4 (이력 / 적중)

- `src/core/match.js` 신규 (1~5등 + null 매칭, 한국 6/45 룰 정확 적용).
- `src/core/history.js` 신규 (recordRecommendation / matchHistory / characterStats).
- `src/render/history-page.js` 신규 (전적 요약 + 등수 카운트 + 이력 카드 목록).
- `src/render/main.js` 갱신 (추천 표시 시 자동 기록 + 매칭 + saveCharacters, `전적 보기` 버튼).
- `tests/suites/match.test.js` 신규 (8 케이스, 등수 경계 / 보너스 룰).
- `tests/runner.js` 등록.
- `styles/main.css` 전적 / 이력 카드 스타일.
- `docs/03_architecture.md` 폴더 트리.

# 3. 다음 액션

## 3.1. 페치 (사용자 액션 대기)

- `scripts/fetch-lotto-draws.bat` 더블클릭 (또는 `node scripts/fetch-lotto-draws.mjs`).
- 데이터 출처: smok95/lotto GitHub Pages 미러 (`all.json` bundle, 1회~1221회 단일 GET).
- **1초 미만** 페치 후 통계 / 전적 / 일진 정밀화 / 데이터 의존 4전략(통계학자 / 2등의 별 / 회귀주의자 / 추세추종자) 모두 실데이터 동작.

## 3.2. 보류 / 후순위 옵션

- i18n 영문 메시지 테이블.
- 모바일 가로 모드 미세 조정 (현재 max-width 640px로 동작).
- sudoku / tetris의 html-game v0.2 표준 적용 (작업량 큼).
- 결제 시스템 (캐릭터 슬롯 / 스킨, 별도 윤리 가이드 통과 필요).
- 명당 판매점 데이터 (외부 정합성 검증 비용).

# 4. 결정 이력 (마일스톤별)

4.1. **M0 확정**: html-game 표준 위치 / 진화 룰 / 캐릭터 라인업 / 본번호·보너스 분리 / 매직넘버 0개.
4.2. **M1 1단계 확정**: 적재 범위 1회차 전수 / 시드 FNV-1a / 갱신 정적 JSON.
4.3. **M2 1단계 확정**:
- 캐릭터 슬롯은 메인 화면 상단에 인라인 배치 (별도 사이드바 / 탭 안 함).
- 추가 캐릭터는 모달 안 폼 (첫 캐릭터는 직접 폼).
- 마지막 1명 삭제 금지 (UX 보호).
- 클래스 약자 표시: 축 / 통 / 별.
4.4. **개발환경 처리 결정**:
- localhost / 127.0.0.1에서는 SW 자동 차단 + 캐시 클리어 + 1회 자동 reload.
- `scripts/dev-server.mjs` 정적 서버를 표준 dev 환경으로 권장 (Live Server 대체).
4.5. 살아있는 룰의 단일 소스는 `CLAUDE.md` + `standards/html-game/STANDARD.md`.
4.6. **데이터 출처 변경 (2026-05-01)**: 동행복권 `common.do` API + 결과 페이지 외부 직접 접근 영구 차단 확인. smok95/lotto GitHub Pages 미러로 전환. 미러는 매주 토 GitHub Actions 자동 갱신. 미러 갱신 끊김 시 사용자 수동 입력 fallback (`docs/02_data.md` 4.6).

# 5. 미해결 / 개선 여지

5.0. **2026-05-01 시점 정보 (사용자 확인)**: 1221회까지 발표 / 1222회 = 2026-05-02 토 추첨 예정 / 1등 예상 당첨금 약 183.7억. `DEFAULT_DRWNO` = 1222로 설정.
5.1. accent 컬러(`#d4a657`) 임시값, 시안 단계 재결정.
5.2. 운세 산출 로직: 현재 시드 + 회차 단순 mix + 가중 분포. 사주 십이지 적용은 M5에서 정밀화.
5.3. 휠링 시스템 비스코프 (윤리 검토 후 재논의).
5.4. sudoku / tetris의 html-game 표준 적용 여부 (사용자 결정 - 나중).
5.5. core/ 모든 모듈 테스트 작성 완료. render/ 모듈 테스트는 선택 (현재 미작성).
5.6. 페치 스크립트 첫 실행 (사용자 액션 대기). smok95 미러 채택 후 표본 검증 끝(1/500/1100/1221회 200 OK, 평균 240ms).
5.7. 표준 위반 작은 이슈: render/main.js가 직접 이벤트 리스너 등록 (input/ 책임 일부 흡수). MVP 단순성 우선. M2 마무리 단계에서 input/ 분리 검토.

# 6. 커밋 히스토리

| 커밋 | 내용 |
|---|---|
| (예정) | M0 + M1 일괄: html-game v0.2 표준 + lotto 적용 + 코어 + UI MVP |
| (예정) | M2 1단계: 캐릭터 슬롯 / 추가 모달 / 전환 / 삭제 |
| (예정) | dev 환경: SW 차단 + dev-server.mjs 정적 서버 |
