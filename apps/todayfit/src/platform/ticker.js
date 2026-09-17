// 지금 시각과 화면 갱신 주기 (03_architecture.md 2.5 / 04_conventions.md 3.1~3.2).
//
// 지금 시각을 읽는 자리는 이 파일 하나다. core/ 는 시각을 인자로 받는다 -
// 그래야 자정 넘김·긴 초과·앱 중단 복구를 테스트로 재현할 수 있다.
//
// 경과 시간은 언제나 시각 차이로 구한다. 틱을 세어 더하면 화면이 숨어 틱이 늘어질 때
// 값이 어긋난다.

import { TICK_MS } from '../data/constants.js';

export function now() {
  return Date.now();
}

/**
 * 화면 갱신 주기마다 부르는 시계.
 * setInterval 이지 틱 누적이 아니다 - onTick 은 매번 now() 를 새로 받는다.
 */
export function createTicker(onTick, intervalMs = TICK_MS) {
  let id = null;
  return {
    start() {
      if (id !== null) return;
      id = setInterval(() => onTick(now()), intervalMs);
    },
    stop() {
      if (id === null) return;
      clearInterval(id);
      id = null;
    },
    running() { return id !== null; },
  };
}
