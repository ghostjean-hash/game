// 시작 흐름 공용 프레임 - 상점 화면 (기획서 Ⅲ권 4.6, 설계 docs/plans/design-2026-09-06-platform-wallet-shop.md 4장).
//
// 상점 부품(shop.js)이 가진 상태를 공용 덮는 카드 위에 그린다. **게임이 자기 팝업 껍데기를
// 만들지 않는다**(표준 규칙 19) - 실측에서 같은 뜻의 껍데기가 네 벌이었다.
//
// 공용이 그리는 것 - 카드 제목 · 잔액 줄 · 종류별 칸 · 칸 위 한 줄 · 품목 격자 ·
// 품목 하나(미리 보기 · 이름 · 가격 또는 쓰는 중 표시) · 게임 조각 자리.
// 게임이 그리는 것 - 미리 보기 조각 하나와, 규격에 맞지 않는 자기 조작(extraEl).
//
// 값이 없는 상점(꾸미기)에서는 잔액 줄도 가격도 그리지 않는다. 나머지는 같다.

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function mountShopCard({
  shop,
  wallet = null,
  overlay,
  audio = null,
  extraEl = null,
} = {}) {
  if (!shop) throw new Error('mountShopCard: shop required');
  if (!overlay) throw new Error('mountShopCard: overlay required');

  let card = null;
  let balanceView = null;
  // 거절할 때 흔들 자리. 잔액 줄이 있으면 거기가 제자리다(무엇이 모자란지 가리킨다).
  let denyEl = null;
  const grids = new Map();

  function currencyDef() {
    if (!wallet || !shop.currency) return null;
    return wallet.currencies.find((c) => c.id === shop.currency) || null;
  }

  function drawItem(kind, item) {
    const owned = shop.isOwned(kind.id, item.id);
    const isOn = shop.equipped(kind.id) === item.id;
    const affordable = shop.canBuy(kind.id, item.id);

    const b = el('button', 'gg-shop-item');
    b.type = 'button';
    b.dataset.ggKind = kind.id;
    b.dataset.ggItem = item.id;
    if (isOn) b.classList.add('is-on');
    // 살 수 없는 것은 흐리게. 누르는 것은 막지 않는다 - 눌렀을 때 왜 안 되는지
    // 알려 주는 편이 아무 반응도 없는 것보다 낫다(거절 쪽지가 뜬다).
    if (!owned && !affordable) b.classList.add('is-short');

    const prev = el('span', 'gg-shop-preview');
    if (typeof item.preview === 'function') {
      const node = item.preview(item);
      if (node instanceof Node) prev.appendChild(node);
      else if (node != null) prev.textContent = String(node);
    } else if (item.preview != null) {
      prev.textContent = String(item.preview);
    }
    b.appendChild(prev);
    b.appendChild(el('span', 'gg-shop-name', item.name || item.id));

    // 상태 글자 - 쓰는 중이면 그 표시, 아직 안 샀으면 값, 그 밖이면 고를 수 있다는 표시.
    // 값 없는 상점은 값이 안 뜨므로 pickLabel이 없으면 칸이 비어 누를 수 있다는 신호가
    // 하나도 남지 않는다(1회차 검사 11번).
    const cur = currencyDef();
    let state = '';
    if (isOn) state = kind.equipLabel || '쓰는 중';
    else if (!owned && cur) state = `${item.price} ${cur.icon || ''}`.trim();
    else state = kind.pickLabel || '';
    b.appendChild(el('span', 'gg-shop-state', state));

    b.addEventListener('click', () => {
      const r = shop.select(kind.id, item.id, { deny: denyEl });
      if (!r.ok) return;              // 거절 쪽지와 흔들기는 지갑이 이미 했다
      if (audio) audio.play('buy');
      refresh();
    });
    return b;
  }

  function drawKind(kind) {
    const box = el('div', 'gg-shop-kind');
    if (kind.hint) box.appendChild(el('p', 'gg-shop-hint', kind.hint));
    const grid = el('div', 'gg-shop-grid');
    box.appendChild(grid);
    grids.set(kind.id, grid);
    return box;
  }

  function paintGrids() {
    for (const kind of shop.kinds) {
      const grid = grids.get(kind.id);
      if (!grid) continue;
      grid.replaceChildren();
      for (const item of kind.items) grid.appendChild(drawItem(kind, item));
    }
  }

  function buildBody() {
    grids.clear();
    const box = el('div', 'gg-shop');

    const cur = currencyDef();
    if (cur) {
      // "내 골드 0 🪙" - 숫자는 지갑의 잔액 표시 부품이 갖는다. 여기서 사면 이 자리가 바로 줄어든다.
      const line = el('p', 'gg-shop-balance');
      line.appendChild(document.createTextNode(`내 ${cur.label} `));
      balanceView = wallet.mount(line, { cur: cur.id, showIcon: false });
      if (cur.icon) line.appendChild(document.createTextNode(` ${cur.icon}`));
      box.appendChild(line);
      denyEl = line;
    } else {
      denyEl = null;
    }

    const body = el('div', 'gg-shop-body');
    for (const kind of shop.kinds) body.appendChild(drawKind(kind));

    // 게임 조각. 상점 규격에 맞지 않는 게임 고유 조작이 여기 온다(설계 4.5).
    const extra = typeof extraEl === 'function' ? extraEl() : extraEl;
    if (extra instanceof Node) {
      const wrap = el('div', 'gg-shop-extra');
      wrap.appendChild(extra);
      body.appendChild(wrap);
    }

    box.appendChild(body);
    paintGrids();
    return box;
  }

  function refresh() {
    if (!card) return;
    paintGrids();
  }

  return {
    open() {
      if (card) return card;
      card = overlay.openCard({
        title: shop.title,
        bodyEl: buildBody(),
        kind: 'shop',
        onClose: () => {
          if (balanceView) { balanceView.destroy(); balanceView = null; }
          denyEl = null;
          grids.clear();
          card = null;
        },
      });
      return card;
    },
    close() { if (card) card.close(); },
    isOpen() { return card !== null; },
    refresh,
  };
}
