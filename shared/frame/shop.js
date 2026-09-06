// 시작 흐름 공용 프레임 - 상점 (기획서 Ⅲ권 4.6 · 4.7, 설계 docs/plans/design-2026-09-06-platform-wallet-shop.md 3장).
//
// 게임이 품목 목록과 종류만 넘기면 사고 쓰는 규칙과 저장이 전부 따라온다.
// 화면은 여기 없다 - shopcard.js가 그린다. 진행 부품과 진행 맵을 나눈 것과 같은 이유로,
// 규칙은 화면 없이 시험할 수 있어야 한다(tests/shop.test.mjs).
//
// **경계선** - 플랫폼은 무엇을 쓰기로 했는지까지만 안다. 그것이 보드 색을 바꾸는지 머리에
// 얹히는지는 모르고, 게임이 onEquip에서 자기 그리기로 읽어 간다(기획서 4.6 마지막 줄).
//
// 값이 없는 상점이 곧 꾸미기다(기획서 4.7). 같은 부품을 쓰되 가격이 없어 사는 절차 없이
// 고르기만 한다 - 따로 만들지 않는다.
//
// 저장은 걸음 A가 세운 owned·equipped 칸에 담긴다.
//   owned    { <종류>: [품목 이름표, …] }
//   equipped { <종류>: 품목 이름표 }

function asObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
}

// 값이 없는 품목은 처음부터 가진 것이다(기획서 4.6 - 가격이 0이면 처음부터 갖고 있는 것).
function isFree(item) {
  return !item || !item.price || item.price <= 0;
}

export function createShop({
  save,
  wallet = null,
  id = '',
  title = '',
  currency = null,
  kinds = [],
  onEquip = null,
} = {}) {
  if (!save) throw new Error('createShop: save required');
  if (!id) throw new Error('createShop: id required');
  if (!Array.isArray(kinds) || kinds.length === 0) throw new Error('createShop: kinds required');
  // 살 수 없는 상점이 조용히 서는 것보다 만들 때 죽는 편이 낫다(설계 5.2).
  if (currency && !wallet) throw new Error(`createShop(${id}): currency needs a wallet`);
  // 이름이 지갑에 없으면 지갑이 기본 재화로 되돌린다 - 값이 엉뚱한 재화에서 빠지는데
  // 화면은 꾸미기처럼 보여 아무도 모른다. 만들 때 막는다(1회차 검사 4번).
  if (currency && !wallet.currencies.some((c) => c.id === currency)) {
    throw new Error(`createShop(${id}): unknown currency '${currency}'`);
  }

  for (const k of kinds) {
    if (!k || !k.id) throw new Error(`createShop(${id}): kind id required`);
    if (!Array.isArray(k.items) || k.items.length === 0) {
      throw new Error(`createShop(${id}.${k.id}): items required`);
    }
    // 여러 개를 함께 쓰는 종류와 안 쓴 상태를 허용하는 종류는 아직 만들지 않았다(설계 3.3).
    // 쓰는 게임이 나올 때 규격을 늘린다(기획서 7.3). 그때까지는 조용히 다르게 돌지 않게 막는다.
    if (k.mode && k.mode !== 'single') {
      throw new Error(`createShop(${id}.${k.id}): only 'single' kind is supported yet`);
    }
  }

  const listeners = new Set();

  function kindDef(kindId) { return kinds.find((k) => k.id === kindId) || null; }
  function itemsOf(kindId) { const k = kindDef(kindId); return k ? k.items : []; }
  function itemOf(kindId, itemId) { return itemsOf(kindId).find((i) => i.id === itemId) || null; }

  // **저장을 캐시하지 않는다.** 진행 부품은 캐시를 갖지만 그것은 게임당 하나뿐이고,
  // 상점은 여럿이 설 수 있는데 owned·equipped 칸은 게임 전체가 나눠 쓰는 한 칸이다.
  // 인스턴스마다 캐시를 두면 (1) 한쪽이 쓴 것을 다른 쪽이 못 보고, 나중에 쓰는 쪽이 자기
  // 스냅샷을 통째로 내려써 상대의 선택을 옛 값으로 되돌리고, (2) 한 번도 안 읽은 캐시를
  // 내려쓰면 그 칸이 통째로 비어 산 물건이 사라진다. 1회차 검사가 둘 다 재현했다.
  // 카드를 열 때만 그리므로 매번 읽어도 사람이 느낄 비용이 아니다.
  //
  // 쓸 때도 **자기가 손댄 종류 하나만 갈아 끼운다.** 칸을 통째로 갈아치우면 다른 상점의
  // 종류와, 이 부품이 모르는 옛 종류가 저장 한 번에 사라진다.
  function ownedRaw(kindId) {
    const v = (asObject(save.readOwned()) || {})[kindId];
    return Array.isArray(v) ? v : [];
  }

  function equippedRaw() {
    return asObject(save.readEquipped()) || {};
  }

  function writeOwnedOf(kindId, list) {
    save.writeOwned({ ...(asObject(save.readOwned()) || {}), [kindId]: list });
  }

  function writeEquippedOf(kindId, itemId) {
    save.writeEquipped({ ...(asObject(save.readEquipped()) || {}), [kindId]: itemId });
  }

  // 쓰는 중인 것. 저장이 비었거나 **없어진 품목을 가리키면** 기본 품목으로 돌아간다.
  // 기본 품목은 종류가 defaultItem으로 정하고, 안 정했으면 첫 값 없는 품목이다 -
  // 목록 순서가 곧 기본값이 되면 화면에 보이는 차례를 바꿀 때 기본값이 함께 바뀐다.
  function equipped(kindId) {
    const saved = equippedRaw()[kindId];
    if (saved && itemOf(kindId, saved)) return saved;
    const k = kindDef(kindId);
    const fallback = (k && k.defaultItem && itemOf(kindId, k.defaultItem))
      || itemsOf(kindId).find((i) => isFree(i))
      || itemsOf(kindId)[0];
    return fallback ? fallback.id : null;
  }

  function isOwned(kindId, itemId) {
    const item = itemOf(kindId, itemId);
    if (!item) return false;
    // 값 없는 상점(꾸미기)에서는 모든 품목이 처음부터 가진 것이다.
    if (!currency || isFree(item)) return true;
    return ownedRaw(kindId).includes(itemId);
  }

  function announce(kindId, item, bought) {
    for (const fn of listeners) {
      try { fn(kindId, item, { bought }); }
      catch { /* 듣는 쪽이 실패해도 상점은 계속 돈다 */ }
    }
  }

  const api = {
    id,
    title,
    currency,
    get kinds() { return kinds; },
    items: itemsOf,
    itemOf,
    isOwned,
    equipped,
    equippedItem(kindId) { return itemOf(kindId, equipped(kindId)); },

    // 살 수 있는가. 이미 가진 것은 언제나 참이다(살 필요가 없다).
    canBuy(kindId, itemId) {
      const item = itemOf(kindId, itemId);
      if (!item) return false;
      if (isOwned(kindId, itemId)) return true;
      return !!wallet && wallet.canAfford(item.price, currency);
    },

    // 사거나 쓰거나. 사람이 누르는 것은 품목 하나이고, 아직 없으면 사고 있으면 쓰는 것이
    // 그 한 번의 뜻이다. 저장은 칸마다 따로 나가므로 **물건을 먼저 남기고 값을 뒤에 뺀다**
    // (아래 설명).
    select(kindId, itemId, { deny = null } = {}) {
      const item = itemOf(kindId, itemId);
      if (!item) return { ok: false, bought: false, item: null };

      let bought = false;
      if (!isOwned(kindId, itemId)) {
        // 여기 오는 것은 값이 있는 상점의 아직 안 산 품목뿐이다.
        // 낼 수 있는지 먼저 보고, **물건을 먼저 남긴 뒤에 값을 뺀다.** 저장은 칸마다
        // 따로 나가므로 중간에 한 번이 실패할 수 있는데(저장 공간이 꽉 찬 순간 등),
        // 이 순서면 최악이 '값이 안 빠졌는데 물건이 남는 것'이라 사용자가 잃지 않는다.
        // 반대로 두면 골드만 빠지고 물건이 안 남아 되돌릴 길이 없다.
        if (!wallet.canAfford(item.price, currency)) {
          wallet.refuse(currency, deny);   // 거절 쪽지·소리·흔들기는 지갑 몫
          return { ok: false, bought: false, item };
        }
        writeOwnedOf(kindId, ownedRaw(kindId).concat(itemId));
        // 바로 위에서 낼 수 있는 것을 확인했으므로 여기서 실패할 길은 없다. 그래도 언젠가
        // 갈린다면 물건만 남고 값이 안 빠진 상태가 되는데, 그쪽이 사용자가 잃지 않는 쪽이다.
        wallet.spend(item.price, { cur: currency, deny });
        bought = true;
      }

      writeEquippedOf(kindId, itemId);

      if (onEquip) {
        try { onEquip(kindId, item); }
        catch { /* 게임 쪽 반영이 실패해도 저장은 이미 끝났다 */ }
      }
      announce(kindId, item, bought);
      return { ok: true, bought, item };
    },

    // 보유·장착이 바뀔 때 알림. 끊는 함수를 돌려준다.
    onChange(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    destroy() { listeners.clear(); },
  };

  return api;
}
