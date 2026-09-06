// 시작 흐름 공용 프레임 - 지갑과 재화 (기획서 Ⅲ권 4.5, 설계 docs/plans/design-2026-09-06-platform-wallet-shop.md 2장).
//
// 게임이 재화 이름을 넘기면 이 부품이 잔액을 갖는다 - 보관·저장·벌기·쓰기·모자랄 때 거절과
// 알림까지. 게임에 남는 것은 "한 판을 깼을 때 얼마를 주는가"의 계산식 하나뿐이다.
//
// 실측(2026-09-06)에서 러시아워의 골드와 과일 농장의 코인이 지갑 자리·버는 규칙·해금 방식·
// 저장 위치가 전부 달라 공유하는 코드가 한 줄도 없었다. 그것을 하나로 접는 자리다.
//
// **재화를 선언하지 않으면 지갑이 생기지 않는다**(기획서 2.2 - 기본값은 항상 없음 쪽).
//
// 저장은 걸음 A가 세운 wallet 칸 하나에 담긴다(shared/frame/save.js).
//   { <재화 이름표>: 숫자 }
// 게임이 저장을 직접 만지면 계정 저장에 변경 신호가 가지 않는다. 그래서 여기를 지난다.
//
// 화면을 그리는 함수(mount)를 갖지만 부를 때만 화면을 만진다 - 화면 없는 곳에서도
// 불러올 수 있어야 규칙을 시험으로 지킬 수 있다(tests/wallet.test.mjs).

// 재화 이름 뒤에 붙는 조사를 받침으로 고른다(골드가 / 코인이).
// 재화 이름은 게임이 정하므로 모자랄 때 문구를 게임마다 다시 적게 두지 않는다.
function subject(word) {
  const w = String(word || '').trim();
  if (!w) return '재화가';
  const code = w.charCodeAt(w.length - 1);
  // 한글 음절 영역 밖(숫자·영문)은 받침을 셀 수 없다. 그때는 '가'로 둔다.
  if (code < 0xac00 || code > 0xd7a3) return `${w}가`;
  return (code - 0xac00) % 28 !== 0 ? `${w}이` : `${w}가`;
}

function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }

// 움직임을 줄이도록 설정한 기기에서는 숫자를 세어 올리지 않는다(기획서 4.8 마지막 줄).
function reducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch { return false; }
}

// 숫자가 올라가는 시간. 결과 카드가 떠 있는 동안 끝나야 해서 짧게 둔다.
const COUNT_MS = 500;

export function createWallet({
  save,
  currencies = [],
  overlay = null,
  audio = null,
} = {}) {
  if (!save) throw new Error('createWallet: save required');
  if (!Array.isArray(currencies) || currencies.length === 0) {
    throw new Error('createWallet: currencies required');
  }

  const defs = currencies.map((c) => ({ id: c.id, label: c.label || c.id, icon: c.icon || '' }));
  const ids = defs.map((c) => c.id);
  const defaultId = ids[0];

  // 저장을 매 호출마다 다시 읽지 않는다. 바꾼 것은 flush()가 한 번에 내려쓴다.
  let cache = null;
  // 붙어 있는 잔액 표시들. 잔액이 바뀌면 전부 스스로 갱신된다.
  const views = new Set();
  const listeners = new Set();

  function data() {
    if (!cache) {
      const raw = save.readWallet();
      cache = {};
      for (const id of ids) cache[id] = isNum(raw[id]) ? raw[id] : 0;
    }
    return cache;
  }
  function flush() { save.writeWallet({ ...data() }); }

  function pick(cur) {
    const id = cur || defaultId;
    return ids.includes(id) ? id : defaultId;
  }
  function defOf(cur) { return defs.find((d) => d.id === pick(cur)) || defs[0]; }

  function announce(cur, delta) {
    for (const v of views) if (v.cur === pick(cur)) v.paint(delta);
    for (const fn of listeners) {
      try { fn(pick(cur), data()[pick(cur)], delta); }
      catch { /* 듣는 쪽이 실패해도 지갑은 계속 돈다 */ }
    }
  }

  // 모자랄 때. 막고 알리는 것까지 플랫폼이 한다(기획서 4.5).
  // 흔들 자리를 정하는 것은 게임 몫이라 요소를 받아서만 흔든다(부품은 공용, 자리는 게임).
  function refuse(cur, deny) {
    if (overlay) overlay.toast(`${subject(defOf(cur).label)} 모자라요`);
    if (audio) audio.play('deny');
    if (deny && deny.classList) {
      deny.classList.remove('gg-shake');
      void deny.offsetWidth; // 연달아 눌러도 다시 흔들리게 한다
      deny.classList.add('gg-shake');
    }
  }

  const api = {
    get currencies() { return defs; },

    balance(cur) { return data()[pick(cur)] || 0; },

    canAfford(amount, cur) {
      return isNum(amount) && amount >= 0 && api.balance(cur) >= amount;
    },

    // 벌기. 붙어 있는 잔액 표시가 세어 올라간다.
    earn(amount, { cur } = {}) {
      const id = pick(cur);
      if (!isNum(amount) || amount <= 0) return data()[id] || 0;
      data()[id] = (data()[id] || 0) + amount;
      flush();
      announce(id, amount);
      return data()[id];
    },

    // 쓰기. **모자라면 한 푼도 빼지 않고** false를 돌려준다.
    // 부분 차감이 있으면 잔액만 줄고 산 것은 안 남는 중간 상태가 생긴다.
    spend(amount, { cur, deny = null } = {}) {
      const id = pick(cur);
      if (!isNum(amount) || amount < 0) return false;
      if ((data()[id] || 0) < amount) {
        refuse(id, deny);
        return false;
      }
      data()[id] -= amount;
      flush();
      announce(id, -amount);
      return true;
    },

    // 모자란다고 알리기만 한다(쪽지·소리·흔들기). 값이 모자란 것을 이미 알고 있어
    // 빼기를 시도할 이유가 없는 자리에서 쓴다 - 상점이 살 수 없는 품목을 거절할 때다.
    refuse(cur, deny) { refuse(pick(cur), deny); },

    // 잔액 표시 부품. **어디에 놓을지는 게임이 정한다** - 플레이 화면이든 상점이든 시작 화면이든
    // 같은 부품을 붙이고, 잔액이 바뀌면 붙어 있는 것이 전부 스스로 갱신된다.
    mount(parent, { cur, showIcon = true } = {}) {
      if (!parent) throw new Error('wallet.mount: parent required');
      const id = pick(cur);
      const def = defOf(id);

      const box = document.createElement('span');
      box.className = 'gg-wallet';
      if (showIcon && def.icon) {
        const ic = document.createElement('span');
        ic.className = 'gg-wallet-icon';
        ic.textContent = def.icon;
        box.appendChild(ic);
      }
      const num = document.createElement('span');
      num.className = 'gg-wallet-value';
      box.appendChild(num);
      parent.appendChild(box);

      let shown = api.balance(id);
      let raf = 0;

      function write(v) { num.textContent = Math.round(v).toLocaleString(); }

      // 늘어날 때만 세어 올린다. 줄어들 때 곧바로 바꾸는 것은 방금 무엇을 썼는지가
      // 분명해야 하기 때문이다(설계 2.7).
      function paint(delta) {
        const target = api.balance(id);
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if (!(delta > 0) || reducedMotion()) { shown = target; write(shown); return; }
        const from = shown;
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / COUNT_MS);
          shown = from + (target - from) * k;
          write(shown);
          if (k < 1) raf = requestAnimationFrame(step);
          else { raf = 0; shown = target; write(shown); }
        };
        raf = requestAnimationFrame(step);
      }

      write(shown);
      const view = { cur: id, el: box, paint };
      views.add(view);
      return {
        el: box,
        destroy() {
          if (raf) cancelAnimationFrame(raf);
          views.delete(view);
          box.remove();
        },
      };
    },

    // 잔액이 바뀔 때 알림. 끊는 함수를 돌려준다.
    onChange(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    destroy() {
      views.clear();
      listeners.clear();
    },
  };

  return api;
}
