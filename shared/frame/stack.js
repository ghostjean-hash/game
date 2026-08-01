// 되돌아가기 계단 - 순수 로직(기획서 Ⅰ권 4.2).
//
// 왜 DOM과 떼어 두나: 되돌아가기가 게임마다 다른 곳으로 가던 사고(Ⅰ권 2.3)를 막으려면
// "어느 화면에서 되돌아가면 어디로 가는가"가 한 곳에 있고 테스트로 고정돼야 하기 때문이다.
// 이 파일은 document·window를 쓰지 않는다. 실제 표시와 브라우저 뒤로가기 연결은 screens.js가 맡는다.
// SSOT: standards/html-game/plans/doc/screen-frame.html 4.2 / 8장.

import { SCREEN, OVERLAY_SCREENS } from './text.js';

// 화면 깊이. 숫자가 클수록 안쪽이며, 되돌아가기는 항상 한 칸만 바깥으로 나간다.
// select를 쓰지 않는 게임은 play가 곧 2단이 된다(createStack이 자리를 메운다).
const BASE_DEPTH = {
  [SCREEN.INTRO]: 0,
  [SCREEN.TITLE]: 1,
  [SCREEN.SELECT]: 2,
  [SCREEN.PLAY]: 3,
  [SCREEN.PAUSE]: 4,
  [SCREEN.RESULT]: 4,
};

// 계단을 만든다.
//   hasSelect: 판 고르는 화면을 쓰는 게임인가(골라 들어가는 형). 안 쓰면 play가 한 칸 당겨진다.
//   hasIntro:  인트로를 쓰는 게임인가. 2026-08-01 결정으로 지금 다섯 게임은 모두 쓰지 않는다.
// 반환값의 back()은 "다음에 보일 화면 이름"을 돌려주고, 더 나갈 곳이 없으면 null을 준다.
// null은 곧 허브로 나간다는 뜻이며, 게임을 닫는 지점은 시작 화면 하나뿐이다(Ⅰ권 4.3).
export function createStack({ hasSelect = false, hasIntro = false, start = SCREEN.TITLE } = {}) {
  const order = [SCREEN.TITLE];
  if (hasSelect) order.push(SCREEN.SELECT);
  order.push(SCREEN.PLAY);

  let current = hasIntro && start === SCREEN.INTRO ? SCREEN.INTRO : start;

  // 겹쳐 뜬 층이 무엇을 덮고 있는지. 멈춤·결과에서 되돌아가면 이 화면으로 내려간다.
  let covered = null;

  function depthOf(name) {
    const d = BASE_DEPTH[name];
    if (d === undefined) return null;
    // select가 없으면 play 이하가 한 칸씩 당겨진다.
    if (!hasSelect && d >= BASE_DEPTH[SCREEN.PLAY]) return d - 1;
    return d;
  }

  // 되돌아갈 자리. 겹친 층이면 덮고 있던 화면, 아니면 순서표에서 한 칸 앞.
  function backTargetOf(name) {
    if (OVERLAY_SCREENS.includes(name)) {
      // 결과에서 되돌아가는 것은 그만하기와 같은 뜻이라 시작 화면으로 간다(Ⅰ권 4.2).
      if (name === SCREEN.RESULT) return SCREEN.TITLE;
      return covered || SCREEN.PLAY;
    }
    if (name === SCREEN.INTRO) return null;
    const i = order.indexOf(name);
    if (i <= 0) return null;   // 시작 화면에서 되돌아가면 허브(null)
    return order[i - 1];
  }

  return {
    // 지금 보이는 화면 이름.
    current() { return current; },
    // 겹친 층이 덮고 있는 화면 이름(없으면 null).
    covered() { return covered; },
    // 이 게임이 실제로 쓰는 화면 순서(겹친 층 제외).
    order() { return order.slice(); },
    depth(name = current) { return depthOf(name); },
    // 되돌아갔을 때 갈 자리를 미리 물어본다(실제로 옮기지는 않는다).
    peekBack(name = current) { return backTargetOf(name); },

    // 화면을 옮긴다. 겹친 층으로 갈 때는 지금 화면을 덮인 화면으로 기억해 둔다.
    go(name) {
      if (depthOf(name) === null) throw new Error(`알 수 없는 화면: ${name}`);
      if (name === current) return current;
      if (OVERLAY_SCREENS.includes(name)) {
        if (!OVERLAY_SCREENS.includes(current)) covered = current;
      } else {
        covered = null;
      }
      current = name;
      return current;
    },

    // 한 칸 바깥으로. 더 나갈 곳이 없으면 null을 돌려주고 화면은 그대로 둔다(허브 이탈은 부르는 쪽이 판단).
    back() {
      const target = backTargetOf(current);
      if (target === null) return null;
      covered = OVERLAY_SCREENS.includes(target) ? covered : null;
      current = target;
      return current;
    },
  };
}
