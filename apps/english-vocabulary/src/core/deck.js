// 단어장 학습 덱 - 순수 로직 (DOM 미의존, 테스트 결정성 확보용 rng 주입).
//
// 핵심 규칙(요청서 2·9장):
//  - active 단어만 계속 순환한다. "외움"=learned로 빠지고, "모름"=active로 남는다.
//  - 한 바퀴(round) = 현재 active를 한 번씩 다 보는 것. 바퀴가 끝나면 남은 active를 섞어 새 바퀴.
//  - "모름" 처리한 단어는 이번 바퀴에 다시 안 나온다(즉시 재출제 방지). 다음 바퀴부터 재등장.
//  - active가 0이 되면 세트 완료.
//  - 직전 처리 1회 undo. 보관함(learned) 수동 복습에서 "모름"이면 active로 복귀.
//
// 세 번째 상태 buried = "다시 안 보기". 단계가 둘이고 의미가 서로 다르다(2026-08-06 사용자 지시).
//  - 1차 KNOWN    : banana처럼 애초에 배울 필요가 없는 단어. 학습 대상 자체에서 뺀다.
//                   진도 분모(start)에서 빠져 "제외하고 남은 실질 개수"가 기준이 된다.
//                   원칙상 학습으로 되돌리지 않는다(회복 경로는 직전 1회 undo).
//  - 2차 MASTERED : 외운(learned) 뒤 복습까지 졸업시킨 단어. 이미 외운 것이라
//                   진도 분자(done)에는 그대로 남고 복습 목록에서만 빠진다.
//                   되살리면 learned로 복귀해 복습 목록에 다시 나온다.
//
// 진도 계산 - start = 원본 - 1차, done = learned + 2차, remaining = start - done.
// 그래서 외운 단어를 2차로 정리해도 완료율이 뒤로 가지 않는다.
//
// 상태(serialize 결과)는 그대로 localStorage에 저장한다.

export const STATE_VERSION = 2;

// 다시 안 보기 단계. 저장된 progress의 buriedTier에 이 값이 들어간다.
export const BURY_TIER = { KNOWN: 1, MASTERED: 2 };

// 배열을 rng로 섞은 새 배열 반환(Fisher-Yates). 원본 불변.
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function freshProgress() {
  return {
    status: "active",
    seenCount: 0,
    unknownCount: 0,
    learnedAt: null,
    lastReviewedAt: null,
    buriedAt: null,
    buriedTier: null,
  };
}

// 저장본에는 단계 개념이 없던 시절(STATE_VERSION 1)의 buried가 섞여 있다.
// 그때의 "다시 안 보기"는 지금의 1차와 뜻이 같으므로 KNOWN으로 읽는다.
// buried가 아닌 단어의 buriedTier는 남겨두지 않는다(상태와 단계가 어긋나는 값 방지).
function normalizeTier(p) {
  if (p.status === "buried") {
    p.buriedTier = p.buriedTier === BURY_TIER.MASTERED ? BURY_TIER.MASTERED : BURY_TIER.KNOWN;
  } else {
    p.buriedTier = null;
  }
  return p;
}

export function createDeck(data, state = null, rng = Math.random) {
  const words = data.words;
  const byId = new Map(words.map((w) => [w.id, w]));
  const setId = data.setId || "set-001";
  const startCount = words.length;

  const deck = {
    setId,
    startCount,
    round: 1,
    queue: [],
    progress: {},
    lastStudiedAt: null,
    _undo: null,
    _rng: rng,
  };

  // 진행 데이터 초기화 - 원본 단어가 바뀌어도(추가/삭제) 기존 진행을 최대한 보존한다.
  // 저장된 progress 중 현재 원본에 존재하는 id만 이어받고, 새 단어는 active로 채운다.
  if (state && state.progress) {
    for (const w of words) {
      deck.progress[w.id] = normalizeTier(
        state.progress[w.id]
          ? { ...freshProgress(), ...state.progress[w.id] }
          : freshProgress()
      );
    }
    deck.round = state.round || 1;
    deck.lastStudiedAt = state.lastStudiedAt || null;
    deck._undo = state.undo || null;
    // 저장된 큐에서 더 이상 active가 아니거나 사라진 단어는 제거.
    deck.queue = (state.queue || []).filter(
      (id) => byId.has(id) && deck.progress[id].status === "active"
    );
  } else {
    for (const w of words) deck.progress[w.id] = freshProgress();
  }

  function activeIds() {
    return words.filter((w) => deck.progress[w.id].status === "active").map((w) => w.id);
  }

  // 새 바퀴 구성 - 남은 active를 섞어 큐로. active가 없으면 빈 큐(완료).
  // rng가 null이면(순서 섞기 OFF 설정) 원본 순서를 그대로 유지한다.
  function rebuildRound(bump = true) {
    const ids = activeIds();
    deck.queue = ids.length ? (deck._rng ? shuffle(ids, deck._rng) : ids.slice()) : [];
    if (bump && ids.length) deck.round += 1;
  }

  // 큐가 비어 있는데 아직 active가 남아 있으면(초기 진입/복습 복귀) 새 바퀴를 연다.
  function ensureQueue() {
    if (deck.queue.length === 0 && activeIds().length > 0) rebuildRound(false);
  }

  // 직전 1회 복원용 스냅샷(학습 처리·묻기 공용).
  function snapshot(id) {
    deck._undo = {
      id,
      queue: deck.queue.slice(),
      round: deck.round,
      progress: { ...deck.progress[id] },
      lastStudiedAt: deck.lastStudiedAt,
    };
  }

  // 그 단어가 어느 단계에 묻혀 있는가. 묻히지 않았으면 null.
  function tierOf(id) {
    const p = deck.progress[id];
    if (!p || p.status !== "buried") return null;
    return p.buriedTier === BURY_TIER.MASTERED ? BURY_TIER.MASTERED : BURY_TIER.KNOWN;
  }

  const api = {
    setId,
    startCount,

    // 현재 학습할 단어 객체. 세트 완료면 null.
    current() {
      ensureQueue();
      const id = deck.queue[0];
      return id ? byId.get(id) : null;
    },

    round() {
      return deck.round;
    },

    // 진도 기준은 "1차로 제외한 단어를 뺀 실질 개수"(start). 원본 개수는 total로 따로 준다.
    // 분자는 done = learned(복습 대상) + mastered(2차로 정리한 외운 단어)다.
    stats() {
      let learned = 0;
      let mastered = 0;
      let buried = 0;
      for (const w of words) {
        const p = deck.progress[w.id];
        if (p.status === "learned") learned += 1;
        else if (p.status === "buried") {
          if (p.buriedTier === BURY_TIER.MASTERED) mastered += 1;
          else buried += 1;
        }
      }
      const start = startCount - buried;
      const done = learned + mastered;
      const remaining = start - done;
      return {
        setId,
        start,
        total: startCount,
        remaining,
        learned,
        mastered,
        done,
        buried,
        percent: start ? Math.round((done / start) * 1000) / 10 : 100,
        round: deck.round,
        completed: remaining === 0,
        lastStudiedAt: deck.lastStudiedAt,
      };
    },

    // 학습 처리. type: "known" | "unknown". now: ISO 문자열(시각 주입).
    mark(type, now = null) {
      ensureQueue();
      const id = deck.queue[0];
      if (!id) return; // 볼 단어 없음
      snapshot(id); // undo용 - 이 처리 직전 상태만 저장(직전 1회 복원)
      const p = deck.progress[id];
      p.seenCount += 1;
      deck.lastStudiedAt = now;
      deck.queue.shift(); // 이번 바퀴에서 뺀다(모름도 이번 바퀴 재출제 안 함).
      if (type === "known") {
        p.status = "learned";
        p.learnedAt = now;
      } else {
        p.unknownCount += 1;
      }
      if (deck.queue.length === 0) rebuildRound(true); // 바퀴 종료 → 남은 active 섞어 새 바퀴
    },

    // 지금 보는 단어를 1차로 제외한다 - 이미 아는 쉬운 단어를 학습 대상에서 아예 뺀다.
    // 학습 처리가 아니므로 seenCount·lastStudiedAt은 건드리지 않는다. 처리한 단어 id 반환.
    bury(now = null) {
      ensureQueue();
      const id = deck.queue[0];
      if (!id) return null;
      snapshot(id);
      const p = deck.progress[id];
      p.status = "buried";
      p.buriedTier = BURY_TIER.KNOWN;
      p.buriedAt = now;
      deck.queue.shift();
      if (deck.queue.length === 0) rebuildRound(true);
      return id;
    },

    // 외운(learned) 단어를 2차로 정리한다 - 복습 목록에서만 빼고 진도는 외움으로 유지.
    // 목록에서 고르는 동작이라 학습 undo 대상이 아니다(되살리기로 복구).
    buryLearned(id, now = null) {
      const p = deck.progress[id];
      if (!p || p.status !== "learned") return false;
      p.status = "buried";
      p.buriedTier = BURY_TIER.MASTERED;
      p.buriedAt = now;
      deck._undo = null; // 외부에서 상태를 바꿨으니 직전-처리 undo는 무효화
      return true;
    },

    // 외운 단어를 한 번에 2차로 정리. 정리한 개수 반환.
    buryAllLearned(now = null) {
      let n = 0;
      for (const w of words) {
        if (deck.progress[w.id].status === "learned") {
          api.buryLearned(w.id, now);
          n += 1;
        }
      }
      return n;
    },

    // 묻은 단어 목록(원본 + 진행 병합). tier를 주면 그 단계만 거른다.
    buriedWords(tier = null) {
      return words
        .filter((w) => {
          const t = tierOf(w.id);
          if (t === null) return false;
          return tier === null || t === tier;
        })
        .map((w) => ({ ...w, ...deck.progress[w.id] }));
    },

    // 묻은 단어 되살리기. 1차는 active로(다음 바퀴부터 재등장),
    // 2차는 외운 단어이므로 learned로 복귀해 복습 목록에 다시 나온다. undo 대상 아님.
    unbury(id) {
      const tier = tierOf(id);
      if (tier === null) return false;
      const p = deck.progress[id];
      p.status = tier === BURY_TIER.MASTERED ? "learned" : "active";
      p.buriedAt = null;
      p.buriedTier = null;
      deck._undo = null; // 외부에서 상태를 바꿨으니 직전-처리 undo는 무효화
      return true;
    },

    canUndo() {
      return deck._undo !== null;
    },

    // 직전 mark 1회 되돌리기.
    undo() {
      const u = deck._undo;
      if (!u) return false;
      deck.progress[u.id] = { ...u.progress };
      deck.queue = u.queue.slice();
      deck.round = u.round;
      deck.lastStudiedAt = u.lastStudiedAt;
      deck._undo = null;
      return true;
    },

    // 보관함: 외운(learned) 단어 목록(원본 + 진행 병합). 2차로 정리한 단어는 빠진다.
    learnedWords() {
      return words
        .filter((w) => deck.progress[w.id].status === "learned")
        .map((w) => ({ ...w, ...deck.progress[w.id] }));
    },

    // 보관함 수동 복습 처리. remembered=true면 learned 유지(복습 시각 갱신),
    // false면 active로 복귀시켜 다음 학습 바퀴에 다시 등장하게 한다. undo 대상 아님.
    reviewMark(id, remembered, now = null) {
      const p = deck.progress[id];
      if (!p || p.status !== "learned") return;
      p.lastReviewedAt = now;
      if (!remembered) {
        p.status = "active";
        p.learnedAt = null;
        deck._undo = null; // 복습으로 상태가 바뀌면 학습 undo는 무효화
      }
    },

    // localStorage에 저장할 직렬화 상태.
    serialize() {
      return {
        version: STATE_VERSION,
        setId,
        startCount,
        round: deck.round,
        queue: deck.queue.slice(),
        progress: JSON.parse(JSON.stringify(deck.progress)),
        lastStudiedAt: deck.lastStudiedAt,
        undo: deck._undo,
      };
    },
  };

  return api;
}
