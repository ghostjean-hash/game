// 단어장 학습 덱 - 순수 로직 (DOM 미의존, 테스트 결정성 확보용 rng 주입).
//
// 핵심 규칙(요청서 2·9장):
//  - active 단어만 계속 순환한다. "외움"=learned로 빠지고, "모름"=active로 남는다.
//  - 한 바퀴(round) = 현재 active를 한 번씩 다 보는 것. 바퀴가 끝나면 남은 active를 섞어 새 바퀴.
//  - "모름" 처리한 단어는 이번 바퀴에 다시 안 나온다(즉시 재출제 방지). 다음 바퀴부터 재등장.
//  - active가 0이 되면 세트 완료.
//  - 직전 처리 1회 undo. 보관함(learned) 수동 복습에서 "모름"이면 active로 복귀.
//
// 세 번째 상태 = 아카이브(2026-08-06 사용자 지시).
// **아카이브한 단어는 이 세트에 없는 것과 같다.** 세트 크기(total)에서 통째로 빠지므로
// 200단어 중 197개를 아카이브하면 그 세트는 "3단어짜리 세트"가 된다. 남은 개수·완료율·
// 목록 어디에도 아카이브한 수가 드러나지 않는다. 아카이브 단어는 앱의 아카이브 화면에서만 본다.
//
// 아카이브는 들어온 경로에 따라 두 갈래로 나뉘고, 되살릴 때 돌아가는 곳이 다르다.
//  - KNOWN(이미 아는 단어)     : 학습 중 "이미 아는 단어로 빼기". 되살리면 active(학습)로.
//                                원칙상 되살리지 않는다(회복 경로는 직전 1회 undo).
//  - MASTERED(완전히 외운 단어): 외운 뒤 "완전히 외움". 되살리면 learned(복습 목록)로.
//
// 진도 계산 - total = 원본 - 아카이브, remaining = total - learned, percent = learned / total.
// 파일에 든 실제 개수는 sourceTotal로 따로 준다(화면에는 쓰지 않는다).
//
// 저장 호환: 상태 문자열은 예전 그대로 "buried", 갈래 필드도 `buriedTier`다.
// 이름만 아카이브로 바뀌었고 저장 데이터 형식은 그대로라 마이그레이션이 없다.

export const STATE_VERSION = 2;

// 아카이브 갈래. 저장된 progress의 buriedTier에 이 값이 들어간다.
// 화면 문구는 KNOWN="이미 아는 단어", MASTERED="완전히 외운 단어"(main.js).
export const ARCHIVE_TIER = { KNOWN: 1, MASTERED: 2 };

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

// 저장본에는 갈래 개념이 없던 시절(STATE_VERSION 1)의 buried가 섞여 있다.
// 그때의 "다시 안 보기"는 지금의 KNOWN과 뜻이 같으므로 KNOWN으로 읽는다.
// buried가 아닌 단어의 buriedTier는 남겨두지 않는다(상태와 갈래가 어긋나는 값 방지).
function normalizeTier(p) {
  if (p.status === "buried") {
    p.buriedTier = p.buriedTier === ARCHIVE_TIER.MASTERED ? ARCHIVE_TIER.MASTERED : ARCHIVE_TIER.KNOWN;
  } else {
    p.buriedTier = null;
  }
  return p;
}

export function createDeck(data, state = null, rng = Math.random) {
  const words = data.words;
  const byId = new Map(words.map((w) => [w.id, w]));
  const setId = data.setId || "set-001";
  const sourceTotal = words.length;

  const deck = {
    setId,
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

  // 직전 1회 복원용 스냅샷(학습 처리·아카이브 공용).
  function snapshot(id) {
    deck._undo = {
      id,
      queue: deck.queue.slice(),
      round: deck.round,
      progress: { ...deck.progress[id] },
      lastStudiedAt: deck.lastStudiedAt,
    };
  }

  // 그 단어가 어느 갈래로 아카이브됐는가. 아카이브가 아니면 null.
  function tierOf(id) {
    const p = deck.progress[id];
    if (!p || p.status !== "buried") return null;
    return p.buriedTier === ARCHIVE_TIER.MASTERED ? ARCHIVE_TIER.MASTERED : ARCHIVE_TIER.KNOWN;
  }

  const api = {
    setId,
    sourceTotal,

    // 현재 학습할 단어 객체. 세트 완료면 null.
    current() {
      ensureQueue();
      const id = deck.queue[0];
      return id ? byId.get(id) : null;
    },

    round() {
      return deck.round;
    },

    // 세트 크기(total)는 "아카이브를 뺀 실제 개수"다. 아카이브한 단어는 이 세트에 없는 것과 같다.
    // 파일에 든 개수는 sourceTotal로 따로 주되 화면에는 쓰지 않는다.
    stats() {
      let learned = 0;
      let archivedKnown = 0;
      let archivedMastered = 0;
      for (const w of words) {
        const p = deck.progress[w.id];
        if (p.status === "learned") learned += 1;
        else if (p.status === "buried") {
          if (p.buriedTier === ARCHIVE_TIER.MASTERED) archivedMastered += 1;
          else archivedKnown += 1;
        }
      }
      const archived = archivedKnown + archivedMastered;
      const total = sourceTotal - archived;
      const remaining = total - learned;
      return {
        setId,
        total,
        sourceTotal,
        remaining,
        learned,
        archived,
        archivedKnown,
        archivedMastered,
        percent: total ? Math.round((learned / total) * 1000) / 10 : 100,
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

    // 지금 보는 단어를 KNOWN 갈래로 아카이브한다 - 이미 아는 단어라 세트에서 통째로 뺀다.
    // 학습 처리가 아니므로 seenCount·lastStudiedAt은 건드리지 않는다. 처리한 단어 id 반환.
    archiveKnown(now = null) {
      ensureQueue();
      const id = deck.queue[0];
      if (!id) return null;
      snapshot(id);
      const p = deck.progress[id];
      p.status = "buried";
      p.buriedTier = ARCHIVE_TIER.KNOWN;
      p.buriedAt = now;
      deck.queue.shift();
      if (deck.queue.length === 0) rebuildRound(true);
      return id;
    },

    // 외운(learned) 단어를 MASTERED 갈래로 아카이브한다.
    // 목록에서 고르는 동작이라 학습 undo 대상이 아니다(아카이브 화면에서 되살린다).
    archiveLearned(id, now = null) {
      const p = deck.progress[id];
      if (!p || p.status !== "learned") return false;
      p.status = "buried";
      p.buriedTier = ARCHIVE_TIER.MASTERED;
      p.buriedAt = now;
      deck._undo = null; // 외부에서 상태를 바꿨으니 직전-처리 undo는 무효화
      return true;
    },

    // 외운 단어를 한 번에 아카이브한다. 옮긴 개수 반환.
    archiveAllLearned(now = null) {
      let n = 0;
      for (const w of words) {
        if (deck.progress[w.id].status === "learned") {
          api.archiveLearned(w.id, now);
          n += 1;
        }
      }
      return n;
    },

    // 아카이브 목록(원본 + 진행 병합). tier를 주면 그 갈래만 거른다.
    archivedWords(tier = null) {
      return words
        .filter((w) => {
          const t = tierOf(w.id);
          if (t === null) return false;
          return tier === null || t === tier;
        })
        .map((w) => ({ ...w, ...deck.progress[w.id], tier: tierOf(w.id) }));
    },

    // 아카이브에서 되살리기. KNOWN은 active로(다음 바퀴부터 재등장),
    // MASTERED는 외운 단어이므로 learned로 복귀해 복습 목록에 다시 나온다. undo 대상 아님.
    unarchive(id) {
      const tier = tierOf(id);
      if (tier === null) return false;
      const p = deck.progress[id];
      p.status = tier === ARCHIVE_TIER.MASTERED ? "learned" : "active";
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

    // 보관함: 외운(learned) 단어 목록(원본 + 진행 병합). 아카이브한 단어는 빠진다.
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
        sourceTotal,
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
