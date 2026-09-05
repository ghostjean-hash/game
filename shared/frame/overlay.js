// 시작 흐름 공용 프레임 - 덮는 카드와 알림 쪽지(기획서 Ⅰ권 11.2).
//
// 왜 만드나: 같은 뜻의 부품이 게임마다 다시 만들어져 있었다. 화면을 덮는 카드가 여섯 벌,
// 잠깐 떴다 사라지는 쪽지가 다섯 벌이었고, 공용에 이미 있던 것을 그대로 쓴 곳은 열 곳 중 둘뿐이었다.
// 다르게 만들면 같은 허브 안에서 게임을 옮길 때마다 조작감이 바뀌고, 한 곳을 고쳐도 나머지가 안 따라온다.
//
// cards.js(잠깐 멈춤·결과)와 다른 점은 화면 이름에 묶이지 않는다는 것이다. 저 둘은 자기 화면이
// 켜졌을 때만 보이는 층이고, 이 부품은 어느 화면에서든 열리는 층이다.
//
// 되돌아가기 처리 - 카드를 열 때 되돌아갈 자리를 하나 쌓고, 닫을 때 그 자리를 소모한다.
// 자리를 안 쌓고 "소모된 자리를 되채우는" 방식으로 만들었더니 시작 화면에서 깨졌다.
// 그 화면은 이 문서의 되돌아갈 자리가 하나뿐이라, 뒤로가기가 문서를 아예 떠나 버려
// 카드가 닫히는 대신 게임에서 나가졌다(1회차 검사에서 적발).
// 여기서 뒤로가기를 직접 받고 화면 골격보다 먼저 처리한다 - 먼저 등록된 쪽이 먼저 받는다.
//
// 닫기는 **먼저 떼고 자리는 뒤에 소모한다.** 반대로 만들었더니(뒤로가기를 걸어 두고 실제 제거는
// 그것이 도착할 때) 예약과 도착 사이에 자리가 하나 더 쌓이면 엉뚱한 카드가 떼어지고 닫으려던
// 카드가 영영 안 닫혔다(3회차 검사에서 적발). 지금은 뗀 다음 내가 부른 뒤로가기 한 번을
// 세어 두었다가 도착하면 삼킨다 - 그것이 화면 골격으로 흘러가면 화면이 한 칸 물러난다.
// 되돌리기: 게임이 자기 모달을 쓰던 상태로 가려면 이 부품 호출만 지우면 된다.
// SSOT: standards/html-game/plans/doc/screen-frame.html 11.2.

import { LABEL } from './text.js';

const TOAST_MS = 1800;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

// 덮는 카드와 쪽지를 담는 그릇. 게임마다 하나만 만든다.
// **화면 골격(createScreens)보다 먼저 만들어야 한다** - 뒤로가기를 먼저 받아야 하기 때문이다.
//   parent: 층이 들어갈 요소(프레임 뿌리)
export function createOverlayHost({ parent } = {}) {
  if (!parent) throw new Error('createOverlayHost: parent required');

  // 열려 있는 카드들. 스택으로 두고 되돌아가기는 맨 위 하나만 닫는다.
  // 지금 이 그릇을 쓰는 곳은 카드를 하나씩만 연다. 겹쳐 연 상태에서 아래 카드를 직접 닫으면
  // 그 카드가 쌓아 둔 자리가 맨 위가 아닌 자리라 뒤로가기 짝이 한 칸 어긋난다
  // - 겹쳐 열기를 실제로 쓰는 게임이 나올 때 함께 푼다(설계서 5.8).
  const open = [];
  let toastEl = null;
  let toastTimer = null;
  let destroyed = false;
  // 내가 부른 뒤로가기 중 아직 도착하지 않은 수. 도착하면 삼키고 화면 골격에 넘기지 않는다.
  let pendingBack = 0;

  // 실제로 화면에서 뗀다. 되돌아갈 자리는 이 함수를 부르는 쪽이 이미 처리했다고 본다.
  function detach(handle) {
    const i = open.indexOf(handle);
    if (i < 0) return false;
    open.splice(i, 1);
    handle.layer.remove();
    if (handle.onClose) { try { handle.onClose(); } catch { /* 닫기 실패가 화면을 막지 않는다 */ } }
    return true;
  }

  // 닫아 달라는 요청. 먼저 떼고 그 카드가 쌓아 둔 자리를 뒤에 소모한다.
  // 두 번 눌러도 두 번째는 목록에 없어 걸러지므로 뒤로가기가 두 번 나가지 않는다.
  function requestClose(handle) {
    if (!detach(handle)) return false;
    if (handle.pushed) {
      pendingBack += 1;
      try { history.back(); } catch { pendingBack -= 1; /* 기록을 못 쓰는 환경 */ }
    }
    return true;
  }

  // 뒤로가기를 화면 골격보다 먼저 받는다.
  function onPopState(e) {
    if (destroyed) return;
    // (1) 내가 방금 부른 뒤로가기가 도착했다. 카드는 이미 떼었으므로 삼키기만 한다.
    if (pendingBack > 0) {
      pendingBack -= 1;
      e.stopImmediatePropagation();
      return;
    }
    // (2) 사용자가 누른 뒤로가기다. 카드가 쌓아 둔 자리가 맨 위에 있을 때만 카드를 닫는다.
    //     자리를 안 쌓은 카드까지 여기서 닫으면 화면 것인 자리를 대신 먹어 계단이 어긋난다.
    const top = open[open.length - 1];
    if (!top || !top.pushed) return;
    detach(top);
    e.stopImmediatePropagation();
  }
  window.addEventListener('popstate', onPopState);

  // 카드 하나를 띄운다.
  //   bodyEl을 주면 그 요소를 그대로 담는다. 줄 목록이 아닌 내용(설정 항목 등)이 오기 때문이다.
  //   actions는 아래쪽 버튼 줄. 비우면 버튼 없이 × 하나로만 닫는다.
  function openCard({ title = '', bodyEl = null, actions = [], onClose = null, kind = '' } = {}) {
    const layer = el('div', 'gg-layer gg-layer-free' + (kind ? ` gg-layer-${kind}` : ''));
    const panel = el('div', 'gg-card-panel');

    const head = el('div', 'gg-card-head');
    head.appendChild(el('h2', 'gg-card-title', title));
    const closeBtn = el('button', 'gg-ic gg-card-close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', LABEL.close);
    closeBtn.textContent = '×';
    head.appendChild(closeBtn);
    panel.appendChild(head);

    if (bodyEl) {
      const wrap = el('div', 'gg-card-body');
      wrap.appendChild(bodyEl);
      panel.appendChild(wrap);
    }

    if (actions.length) {
      const row = el('div', 'gg-card-actions');
      actions.forEach((a) => {
        const b = el('button', 'gg-btn' + (a.primary ? ' gg-btn-primary' : ''), a.label);
        b.type = 'button';
        b.addEventListener('click', () => {
          if (a.close !== false) requestClose(handle);
          if (a.onClick) a.onClick();
        });
        row.appendChild(b);
      });
      panel.appendChild(row);
    }

    layer.appendChild(panel);
    // 바깥을 눌러도 닫는다. 카드 안쪽 클릭이 바깥으로 새지 않게 대상을 층 자신으로 한정한다.
    layer.addEventListener('click', (ev) => { if (ev.target === layer) requestClose(handle); });
    closeBtn.addEventListener('click', () => requestClose(handle));
    parent.appendChild(layer);

    // 되돌아갈 자리를 하나 쌓는다. 이 자리를 소모하는 것이 곧 이 카드를 닫는 것이다.
    let pushed = false;
    try { history.pushState({ ggOverlay: true }, ''); pushed = true; } catch { /* 파일로 열었을 때 등 */ }

    const handle = { layer, onClose, pushed, close: () => requestClose(handle) };
    open.push(handle);
    return handle;
  }

  // 잠깐 떴다 사라지는 쪽지. 겹쳐 부르면 앞엣것을 대체한다(쌓이면 화면을 가린다).
  function toast(text, ms = TOAST_MS) {
    if (!text) return;
    if (!toastEl) {
      toastEl = el('div', 'gg-toast');
      toastEl.setAttribute('role', 'status');
      parent.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { if (toastEl) toastEl.classList.remove('is-on'); }, ms);
  }

  return {
    openCard,
    // 화면 골격이 되돌아가기를 넘겨줄 때 부른다(게임 버튼으로 누른 경우).
    // 카드를 닫는 공개 통로는 이것과 handle.close() 둘뿐이다 - 둘 다 자리를 함께 소모한다.
    requestCloseTop() {
      const top = open[open.length - 1];
      return top ? requestClose(top) : false;
    },
    hasOpen() { return open.length > 0; },
    toast,
    destroy() {
      destroyed = true;
      window.removeEventListener('popstate', onPopState);
      // 남은 카드가 쌓아 둔 자리는 소모하지 않는다 - 여기서 뒤로가기를 여러 번 부르면
      // 자리가 모자랄 때 페이지를 떠난다. 지금 이 함수를 부르는 게임이 없어 실害가 없고,
      // 겹쳐 열기와 함께 다음 걸음에서 푼다(설계서 5.8).
      while (open.length) detach(open[open.length - 1]);
      clearTimeout(toastTimer);
      if (toastEl) { toastEl.remove(); toastEl = null; }
    },
  };
}
