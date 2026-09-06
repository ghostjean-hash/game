// 시작 흐름 공용 프레임 - 진행 저장(기획서 Ⅰ권 8장 마지막 문단 / 10장, Ⅲ권 4.1).
//
// 왜 감싸나: 저장은 이미 shared/storage.js가 하고 있고, 그 set()이 곧 클라우드 동기화 신호다.
// 그래서 여기서 localStorage를 직접 만지면 기록이 기기에만 남고 클라우드에 안 올라간다.
// 이 파일은 createStorage 위에 "언제 저장하고 언제 지우는가"만 규격대로 얹는다.
//
// 규격이 정한 저장 시점은 둘이다 - 플레이에서 잠깐 멈춤으로 갈 때, 그리고 판이 끝날 때.
// 저장이 있으면 다음 방문의 시작 화면에서 이어서 하기가 눌리는 상태가 된다.
// 되돌리기: 게임이 createStorage를 직접 쓰던 방식으로 돌아가도 저장 키는 그대로 호환된다.
// SSOT: standards/html-game/plans/doc/screen-frame.html 8장 / 10장.
//
// --- 저장 칸 여덟 (기획서 Ⅲ권 4.1, 설계 docs/plans/design-2026-09-06-platform-store.md) ---
//
// 게임마다 저장 형식이 달라 진행·재화·상점을 공용으로 만들 수 없던 것을 푸는 자리다.
// 칸 하나가 키 하나이고, 아래 여덟(+판 번호) 말고 다른 칸을 늘리지 않는다.
//
//   progress   { active, modes: { <갈래>: { best, current, extra, stages: { <판id>: {…} } } } }
//   wallet     { <재화>: 숫자 }
//   owned      { <종류>: [품목id, …] }
//   equipped   { <종류>: 품목id }
//   resume     { at, detail, data }
//   muted      true | false
//   prefs      { <항목>: 값 }
//   game       게임 자유. 플랫폼은 안을 보지 않는다
//
// 기존 함수(saveResume·saveBest·saveMuted 등)는 이름도 동작도 그대로 둔다. 새 칸은
// schema를 넘긴 게임에만 생긴다 - 넘기지 않으면 아무 일도 일어나지 않는다(기획서 2.2).

import { createStorage } from '../storage.js';

// 이어서 하기용 진행이 담기는 키. 게임마다 이름이 달라 이어서 하기를 못 살리던 것을 하나로 고정한다.
export const RESUME_KEY = 'resume';
// 갈래별 기록이 담기는 키 접두. best.<갈래id> 형태로 남는다.
export const BEST_PREFIX = 'best.';
// 기기 상태(음소거 등)는 기기마다 달라야 하므로 진행과 섞지 않는다.
export const MUTED_KEY = 'muted';

// 저장 칸 이름(Ⅲ권 4.1).
export const PROGRESS_KEY = 'progress';
export const WALLET_KEY = 'wallet';
export const OWNED_KEY = 'owned';
export const EQUIPPED_KEY = 'equipped';
export const PREFS_KEY = 'prefs';
export const GAME_KEY = 'game';
// 지금 저장이 몇 판인지. 이 값 하나가 옮기기를 두 번 돌지 않게 막는다.
export const SCHEMA_KEY = 'schema';
// 옮기기 전 원본을 통째로 담아 두는 칸. 되돌릴 유일한 길이라 지우거나 덮어쓰지 않는다.
// 계정으로 올리지 않는다(shared/cloud/policy.js에서 제외).
export const BACKUP_KEY = '__backup';

// 옮기기가 돌아도 손대지 않는 칸. 백업 자신과 판 번호는 옛 값이 아니다.
const NOT_OLD_DATA = new Set([BACKUP_KEY, SCHEMA_KEY]);
// migrate가 돌려준 것 중 실제로 저장하는 칸. 그 밖의 이름은 무시한다.
const WRITABLE_CELLS = [
  PROGRESS_KEY, WALLET_KEY, OWNED_KEY, EQUIPPED_KEY, PREFS_KEY, GAME_KEY, RESUME_KEY, MUTED_KEY,
];

// 저장이 사람 손이나 옛 버전 때문에 이상한 모양일 수 있다. 그때 게임이 죽는 것보다
// 빈 값으로 시작하는 편이 낫다. 원본은 지우지 않으므로 백업에서 되살릴 수 있다.
function asObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
}

function emptyProgress() {
  return { active: null, modes: {} };
}

export function createSave(gameId, { schema = 0, migrate = null, verify = null } = {}) {
  const store = createStorage(gameId);

  // --- 저장 판 옮기기 ---
  // 판정 순서다. schema를 안 넘겼으면 아무 일도 없고, 판 번호가 맞고 모양도 지금 것이면
  // 넘어가고, 저장이 비었으면 판 번호만 적고, 그 밖이면 백업 후 옮긴다.
  function runMigration() {
    if (!schema || typeof migrate !== 'function') return;

    const old = {};
    for (const k of store.keys()) {
      if (NOT_OLD_DATA.has(k)) continue;
      old[k] = store.get(k, null);
    }

    // 판 번호가 맞아도 저장 모양이 옛것일 수 있다. 계정 저장은 기기 사이를 오가므로,
    // 다른 기기의 옛 빌드가 올린 저장이 내려오면 번호는 그대로인데 내용만 옛 모양이 된다.
    // verify를 넘긴 게임은 그 경우를 잡아 다시 옮긴다. 안 넘긴 게임은 번호만 본다.
    const sameSchema = store.get(SCHEMA_KEY, 0) === schema;
    if (sameSchema && (typeof verify !== 'function' || verify(old) === true)) return;

    if (Object.keys(old).length === 0) { store.set(SCHEMA_KEY, schema); return; }

    // 옮기기 전 원본을 남긴다. 이미 있으면 덮지 않는다 - 먼저 남긴 것이 더 원본이다.
    if (store.get(BACKUP_KEY, null) === null) {
      store.set(BACKUP_KEY, { at: Date.now(), schema: store.get(SCHEMA_KEY, 0), data: old });
    }

    // migrate는 순수 함수다. 저장을 직접 만지지 않아 화면 없이 검사할 수 있다.
    // 첫 옮기기인지 다시 옮기기인지 알려 준다 - 둘은 어느 값이 이기는지가 반대다.
    const out = asObject(migrate(old, { remigrate: sameSchema })) || {};
    for (const cell of WRITABLE_CELLS) {
      if (out[cell] !== undefined) store.set(cell, out[cell]);
    }
    // 여기까지 와야 판 번호를 올린다. 중간에 실패하면 다음에 다시 시도한다.
    store.set(SCHEMA_KEY, schema);
  }

  runMigration();

  return {
    store,

    // --- 이어서 하기 ---
    // payload에 게임이 원하는 것을 그대로 담는다. 프레임은 내용을 해석하지 않는다.
    // detail은 시작 화면 이어서 하기 칸에 그대로 보일 한 줄이다(예: '12구역 도쿄').
    saveResume(payload, detail = '') {
      store.set(RESUME_KEY, { at: Date.now(), detail, data: payload });
    },
    readResume() {
      const v = store.get(RESUME_KEY, null);
      if (!v || typeof v !== 'object' || !('data' in v)) return null;
      return v;
    },
    hasResume() { return this.readResume() !== null; },
    // 판이 끝나면 이어서 할 것이 없어진다. 지우지 않으면 끝난 판으로 다시 들어간다.
    clearResume() { store.remove(RESUME_KEY); },

    // --- 갈래별 기록 ---
    // higherIsBetter=false면 시간처럼 작을수록 좋은 기록으로 다룬다(테트리스 스프린트, 스도쿠).
    // 새 기록이면 true를 돌려준다. 결과 카드가 이 값으로 '새 기록'을 띄운다.
    saveBest(choiceId, value, { higherIsBetter = true } = {}) {
      const key = BEST_PREFIX + (choiceId || 'default');
      const prev = store.get(key, null);
      const prevValue = prev && typeof prev === 'object' ? prev.value : prev;
      const isFirst = prevValue === null || prevValue === undefined;
      const better = isFirst || (higherIsBetter ? value > prevValue : value < prevValue);
      if (better) store.set(key, { value, at: Date.now() });
      return better;
    },
    readBest(choiceId) {
      const v = store.get(BEST_PREFIX + (choiceId || 'default'), null);
      if (v === null || v === undefined) return null;
      return typeof v === 'object' ? v.value : v;
    },

    // --- 기기 상태 ---
    readMuted() { return !!store.get(MUTED_KEY, false); },
    saveMuted(m) { store.set(MUTED_KEY, !!m); },

    // --- 저장 칸 여덟 (Ⅲ권 4.1) ---
    // 읽을 때 모양이 깨져 있으면 빈 뼈대를 돌려준다. 원본은 지우지 않는다.
    readProgress() {
      const p = asObject(store.get(PROGRESS_KEY, null));
      if (!p) return emptyProgress();
      return {
        active: typeof p.active === 'string' ? p.active : null,
        modes: asObject(p.modes) || {},
      };
    },
    writeProgress(p) { store.set(PROGRESS_KEY, asObject(p) || emptyProgress()); },

    readWallet() { return asObject(store.get(WALLET_KEY, null)) || {}; },
    writeWallet(w) { store.set(WALLET_KEY, asObject(w) || {}); },

    readOwned() { return asObject(store.get(OWNED_KEY, null)) || {}; },
    writeOwned(o) { store.set(OWNED_KEY, asObject(o) || {}); },

    readEquipped() { return asObject(store.get(EQUIPPED_KEY, null)) || {}; },
    writeEquipped(e) { store.set(EQUIPPED_KEY, asObject(e) || {}); },

    readPrefs() { return asObject(store.get(PREFS_KEY, null)) || {}; },
    writePrefs(p) { store.set(PREFS_KEY, asObject(p) || {}); },

    readGame() { return asObject(store.get(GAME_KEY, null)) || {}; },
    writeGame(g) { store.set(GAME_KEY, asObject(g) || {}); },

    readSchema() { return store.get(SCHEMA_KEY, 0); },

    // 게임이 자기 값을 더 담고 싶을 때. 네임스페이스와 클라우드 신호는 그대로 유지된다.
    get(key, fallback = null) { return store.get(key, fallback); },
    set(key, value) { store.set(key, value); },
    remove(key) { store.remove(key); },
  };
}
