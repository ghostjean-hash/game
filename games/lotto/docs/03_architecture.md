# 03. 아키텍처

## 1. 폴더 구조

```
games/lotto/
├── CLAUDE.md            # 작업 컨텍스트 / 절대 규칙
├── PROGRESS.md          # 진행 로그
├── README.md            # 사람용 안내
├── index.html           # 진입 HTML
├── .nojekyll            # GitHub Pages
├── .standard            # html-game v0.2
├── docs/                # 본 문서들
├── src/
│   ├── main.js          # 진입점. 모든 모듈 wire-up
│   ├── core/            # 순수 로직 (DOM 금지)
│   │   ├── seed.js      # FNV-1a + characterSeed
│   │   ├── random.js    # Mulberry32 PRNG
│   │   ├── luck.js      # Luck 분산도 적용
│   │   ├── stats.js     # 통계 캐시 계산
│   │   ├── recommend.js # 추천 엔진
│   │   ├── fortune.js   # 운세 산출 (대길/길/평/흉)
│   │   ├── match.js     # 추천 vs 발표 매칭 (등수)
│   │   ├── history.js   # 이력 기록 / 매칭 / 캐릭터 통계
│   │   ├── zodiac.js    # 12간지 + 관계 (운세 정밀화)
│   │   ├── saju.js      # 사주 일주 + 오행 (운세 추가 보정)
│   │   └── wheeling.js  # Full Wheel 생성 (다구좌 모드 옵션)
│   ├── render/          # DOM 렌더
│   │   ├── modal.js            # 모달 / 면책 안내
│   │   ├── character-form.js   # 캐릭터 생성 폼
│   │   ├── character-card.js   # 캐릭터 카드 HTML
│   │   ├── character-slots.js  # 캐릭터 슬롯 (목록 / 추가 / 삭제)
│   │   ├── strategy-picker.js  # 추첨 전략 선택 UI (캐릭터와 분리)
│   │   ├── draw-card.js        # 추천 카드 HTML
│   │   ├── charts.js           # 막대 차트 헬퍼
│   │   ├── stats-page.js       # 통계 시각화 페이지
│   │   ├── history-page.js     # 캐릭터 전적 / 이력 페이지
│   │   ├── wheeling-page.js    # 휠링 페이지 (다구좌 모드)
│   │   └── main.js             # 메인 화면 wire-up
│   ├── input/           # 키보드 / 터치 이벤트 (M2 예정)
│   └── data/
│       ├── colors.js    # 게임 색상 상수
│       ├── numbers.js   # 02_data 1장 수치 상수
│       ├── storage.js   # localStorage 입출력 + syncDraws()
│       └── draws.json   # 회차 정적 JSON (페치 결과)
├── styles/
│   ├── tokens.css       # UI 디자인 토큰
│   └── main.css         # 레이아웃
└── tests/
    ├── test.html        # 테스트 진입
    ├── runner.js        # entrypoint (suite 등록 + done() 호출)
    ├── core.js          # 러너 코어 (suite/test/assert)
    └── suites/          # 테스트 파일
        ├── seed.test.js
        ├── random.test.js
        ├── luck.test.js
        ├── stats.test.js
        └── recommend.test.js
```

## 2. 모듈 의존성 방향

### 2.1. 단방향 그래프

```
        data/  ←──── localStorage / 외부 API
          ↑
        core/  ←──── 순수 로직
        ↗   ↖
   render/   input/   ←──── DOM
        ↑
      main.js
```

### 2.2. 모듈별 import 규칙

| 모듈 | import 가능 | import 금지 |
|---|---|---|
| `data/` | 없음 (순수 상수) 또는 표준 fetch | 다른 src/ 모듈 |
| `core/` | `data/` 만 | DOM, Canvas, window, document, localStorage |
| `render/` | `core/`, `data/` | `input/` 직접 |
| `input/` | `core/`, `data/` | `render/` 직접 |
| `main.js` | 모두 | (없음) |

### 2.3. 절대 규칙

2.3.1. `core/`는 어떤 브라우저 API도 import 금지. 순수 함수만.
2.3.2. `render/`와 `input/`은 서로 직접 import 금지. main.js에서 wire-up으로 연결.
2.3.3. localStorage 입출력은 반드시 `data/`를 통해서만.

## 3. 데이터 흐름

### 3.1. 시작

```
사용자 진입
  → main.js
  → data/storage.js (localStorage 로드)
  → data/draws.js (정적 JSON 또는 캐시 로드)
  → core/stats.js (통계 캐시 계산)
  → render/main.js (메인 렌더)
  → input/main.js (이벤트 리스너 등록)
```

### 3.2. 추천 1회

```
사용자 "다시 뽑기"
  → input/main.js (클릭 이벤트)
  → core/recommend.js (시드 + 클래스 + Luck + 토글 → 본번호 6 + 보너스 1 + 근거)
  → data/storage.js (이력 저장)
  → render/card.js (카드 갱신)
```

### 3.3. 회차 발표 후 매칭

```
draws 갱신 감지 (data/draws.js)
  → core/match.js (이력 vs 발표 번호 매칭, 등수 라벨)
  → data/storage.js (이력 갱신)
  → core/luck.js (Luck 보너스 계산)
  → render/history.js (이력 페이지 갱신)
```

## 4. core / render / input / data 책임 경계

| 모듈 | 책임 | 예시 파일 (예정) |
|---|---|---|
| `core/` | 추첨 알고리즘, 통계 계산, 시드 해시, 가중치 계산, 매칭 | recommend.js / stats.js / seed.js / luck.js / match.js / fortune.js |
| `render/` | DOM 갱신, 카드 / 차트 / 모달 / 이펙트 | main.js / card.js / stats.js / modal.js / history.js |
| `input/` | 키보드 / 터치 이벤트 → core 호출 | main.js / keyboard.js / touch.js |
| `data/` | 게임 상수, 외부 API, localStorage 입출력 | colors.js / storage.js / draws.js / numbers.js |

### 4.1. 책임 충돌 시

4.1.1. "추첨 후 카드를 빛나게"는 `render/`. `core/`가 글로우를 호출하지 않는다. core는 결과 객체만 반환.
4.1.2. "사용자 입력 검증"은 `core/`(순수). `input/`은 검증 결과 받아 UI 반응만.
4.1.3. "외부 API 응답 파싱"은 `data/`. `core/`는 정제된 객체만 받는다.
