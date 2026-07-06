// 학습 세션 상태. DOM 미의존 순수 로직.
//
// 규칙(사용자 확정):
//  - 한 번에 한 패턴의 문장만 연달아 출현.
//  - 문장을 넘길 때마다 카운트 +1.
//  - 그 패턴 문장을 "있는 수만큼" 다 풀면 다음 패턴으로 자동 전환
//    (40 고정 아님 - 문장이 쌓이면 세션이 자연히 길어진다).
//  - 패턴 순서는 patterns 배열 순서를 따르고, 마지막 뒤엔 처음으로 순환.

// Fisher-Yates 셔플. shuffleFn 주입 가능(테스트 결정성 확보).
export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// patterns: [{ id, label, desc }, ...]  (순서 = 전환 순서)
// sentences: [{ id, category, ... }, ...]
// rand: 셔플용 난수 함수(선택)
export function createSession(patterns, sentences, rand = Math.random) {
  const groups = patterns
    .map((p) => ({
      pattern: p,
      items: sentences.filter((s) => s.category === p.id),
    }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    throw new Error("createSession: 출제할 문장이 없습니다");
  }

  let gi = 0; // 현재 패턴 그룹 index
  let order = shuffle(groups[gi].items, rand);
  let pos = 0; // order 내 현재 위치
  let solved = 0; // 현재 패턴에서 넘긴 문항 수

  return {
    current() {
      return order[pos];
    },
    pattern() {
      return groups[gi].pattern;
    },
    total() {
      return groups[gi].items.length;
    },
    solved() {
      return solved;
    },
    // 현재 위치(1-based)
    position() {
      return pos + 1;
    },
    // 다음 문장으로. 패턴을 다 풀었으면 전환 정보를 반환한다.
    // 반환: { patternCleared, cleared?, clearedCount?, nextPattern? }
    next() {
      solved += 1;
      pos += 1;
      if (pos >= order.length) {
        const cleared = groups[gi].pattern;
        const clearedCount = solved;
        gi = (gi + 1) % groups.length;
        order = shuffle(groups[gi].items, rand);
        pos = 0;
        solved = 0;
        return {
          patternCleared: true,
          cleared,
          clearedCount,
          nextPattern: groups[gi].pattern,
        };
      }
      return { patternCleared: false };
    },
  };
}
