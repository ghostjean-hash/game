// 시작 흐름 공용 프레임 - 환경설정 그릇(기획서 Ⅰ권 11.3 / html-game 표준 4.8 규칙 20).
//
// 왜 만드나: 공용 상단 띠가 폐기되면서 환경설정에 닿는 길이 게임마다 갈렸다. 실측(2026-09-05)에서
// 일곱 게임 중 둘만 시작 화면에 환경설정이 있었고, 플레이 중에 열 수 있는 게임은 하나도 없었다.
// 더 나쁜 것은 소리다 - 띠에 소리 버튼을 위임했던 게임 둘은 어느 화면에서도 소리를 끌 수 없었다.
//
// 그래서 소리 항목을 공용이 기본으로 넣는다. 게임이 아무것도 하지 않아도 환경설정을 열면
// 소리 켜고 끄기가 맨 위에 있다. 이것이 "소리 버튼은 모든 게임에 있다"를 지키는 방식이다.
// 저장은 여기서 직접 하지 않는다 - 소리 그릇의 상태가 바뀌면 조립이 save로 남긴다.
// localStorage를 직접 만지면 클라우드 동기화 신호가 끊기므로 어느 경로에서도 만지지 않는다.
// 되돌리기: 게임이 자기 설정 모달을 쓰던 상태로 가려면 이 부품 호출만 지우면 된다.
// SSOT: standards/html-game/plans/doc/screen-frame.html 11.3.

import { TEXT, LABEL } from './text.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

// 환경설정 그릇을 만든다.
//   overlay: createOverlayHost가 만든 그릇. 카드는 그 층 위에 뜬다
//   audio:   소리 그릇. 기본 항목이 이것을 켜고 끈다
// 저장을 받지 않는다 - 소리는 조립이 남기고, 게임이 더한 항목은 자기 저장을 자기가 쓴다.
// 받아만 두고 읽지 않는 입력은 다음에 읽는 사람을 헷갈리게 한다(3회차 검사 지적).
export function createSettings({ overlay, audio } = {}) {
  if (!overlay) throw new Error('createSettings: overlay required');

  // 항목 목록. 소리가 항상 맨 위이고 게임이 더한 것은 뒤에 붙는다.
  const items = [];
  let card = null;

  if (audio) {
    items.push({
      id: 'sound',
      type: 'toggle',
      label: LABEL.sound,
      // 켜짐 = 소리가 난다. 음소거와 반대이므로 여기서 한 번 뒤집는다.
      get: () => !audio.isMuted(),
      // 저장은 조립이 audio의 상태 변화에서 한 번 한다(index.js onMutedChange → save.saveMuted).
      // 여기서 또 쓰면 같은 값을 두 번 저장하고 클라우드 신호도 두 번 나간다.
      set: (on) => audio.setMuted(!on),
    });
  }

  // 항목 하나를 그린다. 종류는 둘 - 켜고 끄는 것과 하나 고르는 것.
  function renderItem(item) {
    const row = el('div', 'gg-set-row');
    row.appendChild(el('span', 'gg-set-label', item.label));

    if (item.type === 'select') {
      const seg = el('div', 'gg-seg gg-set-seg');
      (item.options || []).forEach((op) => {
        const b = el('button', 'gg-seg-item', op.label);
        b.type = 'button';
        b.dataset.ggSetOption = op.id;
        b.addEventListener('click', () => {
          item.set(op.id);
          paintSelect(seg, item);
        });
        seg.appendChild(b);
      });
      paintSelect(seg, item);
      row.appendChild(seg);
    } else {
      const b = el('button', 'gg-btn gg-btn-ghost gg-set-toggle');
      b.type = 'button';
      const paint = () => {
        const on = !!item.get();
        b.textContent = on ? '켜짐' : '꺼짐';
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      };
      b.addEventListener('click', () => { item.set(!item.get()); paint(); });
      paint();
      row.appendChild(b);
    }
    return row;
  }

  function paintSelect(seg, item) {
    const now = item.get();
    seg.querySelectorAll('[data-gg-set-option]').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.ggSetOption === now);
    });
  }

  function buildBody() {
    const box = el('div', 'gg-set-list');
    items.forEach((it) => box.appendChild(renderItem(it)));
    return box;
  }

  return {
    // 게임이 자기 항목을 더한다. 소리 항목은 언제나 맨 위에 남는다.
    //   { id, type: 'toggle' | 'select', label, get, set, options }
    addItem(item) {
      if (!item || typeof item.get !== 'function' || typeof item.set !== 'function') {
        throw new Error('createSettings.addItem: get/set required');
      }
      items.push(item);
      return this;
    },
    open() {
      if (card) return card;
      card = overlay.openCard({
        title: TEXT.settings,
        bodyEl: buildBody(),
        kind: 'settings',
        onClose: () => { card = null; },
      });
      return card;
    },
    close() { if (card) card.close(); },
    isOpen() { return card !== null; },
    items,
  };
}
