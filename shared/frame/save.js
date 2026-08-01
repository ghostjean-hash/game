// 시작 흐름 공용 프레임 - 진행 저장(기획서 Ⅰ권 8장 마지막 문단 / 10장).
//
// 왜 감싸나: 저장은 이미 shared/storage.js가 하고 있고, 그 set()이 곧 클라우드 동기화 신호다.
// 그래서 여기서 localStorage를 직접 만지면 기록이 기기에만 남고 클라우드에 안 올라간다.
// 이 파일은 createStorage 위에 "언제 저장하고 언제 지우는가"만 규격대로 얹는다.
//
// 규격이 정한 저장 시점은 둘이다 - 플레이에서 잠깐 멈춤으로 갈 때, 그리고 판이 끝날 때.
// 저장이 있으면 다음 방문의 시작 화면에서 이어서 하기가 눌리는 상태가 된다.
// 되돌리기: 게임이 createStorage를 직접 쓰던 방식으로 돌아가도 저장 키는 그대로 호환된다.
// SSOT: standards/html-game/plans/doc/screen-frame.html 8장 / 10장.

import { createStorage } from '../storage.js';

// 이어서 하기용 진행이 담기는 키. 게임마다 이름이 달라 이어서 하기를 못 살리던 것을 하나로 고정한다.
export const RESUME_KEY = 'resume';
// 갈래별 기록이 담기는 키 접두. best.<갈래id> 형태로 남는다.
export const BEST_PREFIX = 'best.';
// 기기 상태(음소거 등)는 기기마다 달라야 하므로 진행과 섞지 않는다.
export const MUTED_KEY = 'muted';

export function createSave(gameId) {
  const store = createStorage(gameId);

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

    // 게임이 자기 값을 더 담고 싶을 때. 네임스페이스와 클라우드 신호는 그대로 유지된다.
    get(key, fallback = null) { return store.get(key, fallback); },
    set(key, value) { store.set(key, value); },
    remove(key) { store.remove(key); },
  };
}
