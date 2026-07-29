// 게임·앱마다 다른 저장 기준. SSOT: 설계 9.4.
//
// 기준은 두 층이다.
//   1) 항목(저장 키) 단위 - 무엇을 계정에 올리고 무엇을 이 기기에만 둘지
//   2) 게임 단위 - 얼마나 빨리 올릴지
//
// 이 파일에는 브라우저 API가 등장하지 않는다(순수 데이터 + 순수 함수).

// --- 1) 계정에 올리지 않는 항목 ---------------------------------------------
//
// 판단 기준: 그 값이 "이 기기의 상태"인가, "내 기록"인가.
// 기기 상태(소리·스크롤·화면 크기)와 다시 만들 수 있는 캐시, 그리고 1회성 데이터 정리
// 표식은 올리지 않는다. 특히 정리 표식을 공유하면 새 기기에서 정리가 건너뛰어져
// 데이터가 고쳐지지 않는 사고가 난다.
export const EXCLUDED_KEYS = {
  "gg.tetris": [
    /^muted$/,     // 소리는 기기마다 다르다
    /^lastMode$/,  // 마지막으로 고른 모드는 그 기기의 화면 상태
  ],
  "gg.nonogram": [
    /^muted$/,
    /^mode$/,
  ],
  "gg.flightshooting": [
    /^cheat$/,     // 개발용
    /^cheatCfg$/,
  ],
  "gg.english-reading": [
    /^listScroll$/, // 목록 스크롤 위치. 폰의 위치가 PC로 넘어오면 오히려 방해된다
  ],
  lotto: [
    /^draws$/,      // 회차 캐시. 언제든 다시 받는다
    /^stats_/,      // draws에서 다시 계산되는 파생값
    /^s\d{3}_/,     // s090_cleared 같은 1회성 데이터 정리 표식
  ],
};

export function isExcludedKey(slotId, key) {
  const patterns = EXCLUDED_KEYS[slotId];
  if (!patterns) return false;
  return patterns.some((re) => re.test(key));
}

// --- 1-2) 덮어쓰지 않고 합쳐야 하는 항목 -------------------------------------
//
// 최고 기록은 하나만 남으면 되지만, 모아나가는 것(단어장·저장한 문장·완독 목록·캐릭터)은
// 나중에 저장한 쪽이 통째로 이기면 다른 기기에서 모은 것이 사라진다.
// 아래 항목은 양쪽을 합친다.
//
//   list    : 배열. idKey로 같은 것을 하나로 본다
//   set     : 값 배열. 중복 없이 합친다
//   map-max : { 키: 숫자 }. 같은 키는 큰 값을 남긴다
//
// 여기 없는 항목은 종전대로 최신 것을 쓴다. 읽던 자리(progress)나 학습 큐(deck)처럼
// 통째로 일관돼야 하는 값은 합치면 오히려 깨지므로 일부러 넣지 않았다.
export const MERGE_RULES = {
  "gg.english-reading": {
    vocab: { type: "list", idKey: "wordKey" },        // 단어장
    savedSentences: { type: "list", idKey: "key" },   // 저장한 문장
    done: { type: "set" },                            // 완독한 지문 id 목록
    reads: { type: "map-max" },                       // 지문별 회독수
  },
  lotto: {
    characters: { type: "list", idKey: "id" },        // 사용자가 만든 캐릭터
  },
};

// --- 1-2b) 항목 안쪽까지 합치는 규칙 -----------------------------------------
//
// 단어장 앱의 학습 상태는 한 덩어리(deck:...)로 저장되는데, 그 안의 단어별 진행은
// 두 기기에서 각각 쌓일 수 있다. 사용자 결정(2026-07-29): 더 많이 진행된 쪽을 남긴다.
// 남은 카드 순서·회차 같은 나머지 값은 최신 쪽을 그대로 쓴다(섞으면 앞뒤가 안 맞는다).
// 큐에 남은 카드 중 이미 외운 것은 앱이 복원할 때 스스로 걸러낸다(core/deck.js).
export const NESTED_MERGE_RULES = {
  "gg.english-vocabulary": [{ keyPattern: /^deck:/, field: "progress", type: "progress-max" }],
};

// --- 1-3) 이긴 쪽에 없어도 지우지 않는 항목 ----------------------------------
//
// 슬롯(게임) 하나가 통째로 최신 쪽을 따르기 때문에, 이긴 기기에 없는 항목은 사라진다.
// 단어장 앱은 학습 세트마다 키가 따로 있어서(deck:1:set-a, deck:1:set-b) 이 규칙에 걸린다.
// PC에서 A세트를, 폰에서 B세트를 공부하면 한쪽 세트가 통째로 없어진다.
// 아래 패턴에 맞는 키는 이긴 쪽에 없으면 진 쪽 것을 그대로 살린다.
export const KEEP_UNMATCHED_KEYS = {
  "gg.english-vocabulary": [/^deck:/],
};

export function shouldKeepUnmatched(slotId, key) {
  const patterns = KEEP_UNMATCHED_KEYS[slotId];
  if (!patterns) return false;
  return patterns.some((re) => re.test(key));
}

// --- 2) 게임마다 다른 업로드 대기 시간 ---------------------------------------
//
// wait  : 마지막 저장 뒤 이만큼 조용하면 올린다
// maxWait: 저장이 쉬지 않고 이어져도 첫 변경으로부터 이 시간 안에는 반드시 올린다
// stamp : 변경 시각을 남기는 최소 간격(저장이 초당 수십 번인 화면 보호)
//
// 짧게 잡은 곳은 다른 기기에서 곧바로 이어받는 것이 중요한 게임,
// 길게 잡은 곳은 저장이 잦아 통신을 모아야 하는 앱이다.
export const DEFAULT_TIMING = { wait: 2500, maxWait: 20000, stamp: 1000 };

export const SLOT_TIMING = {
  // 구역을 넘길 때마다 이어하기 지점이 갱신된다. 폰으로 바로 넘어갈 수 있어야 한다.
  "gg.flightshooting": { wait: 1200, maxWait: 15000, stamp: 500 },
  // 퍼즐 한 판을 끝낼 때만 저장한다. 곧바로 올려도 부담이 없다.
  "gg.rushhour": { wait: 1200, maxWait: 15000, stamp: 500 },
  "gg.nonogram": { wait: 1500, maxWait: 15000, stamp: 500 },
  "gg.sudoku": { wait: 1200, maxWait: 15000, stamp: 500 },
  "gg.tetris": { wait: 1200, maxWait: 15000, stamp: 500 },
  // 캐릭터·프리셋 편집은 사용자가 손으로 만지는 작업이라 조금 모았다가 올린다.
  lotto: { wait: 2500, maxWait: 20000, stamp: 1000 },
  // 카드를 넘길 때마다 저장된다. 한 묶음으로 모은다.
  "gg.english-vocabulary": { wait: 4000, maxWait: 25000, stamp: 1500 },
  // 목록 스크롤이 초당 수십 번 저장을 부른다. 가장 길게 모은다.
  "gg.english-reading": { wait: 6000, maxWait: 30000, stamp: 3000 },
};

export function timingOf(slotId) {
  return SLOT_TIMING[slotId] || DEFAULT_TIMING;
}
