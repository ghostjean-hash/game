// 전략 실험실 계좌와 실행(기획서 5.6.2). 화면과 분리한 순수 함수.
import { FRAMES } from './frames.js';
import { DAYS_PER_YEAR } from '../data/numbers.js';

export const ST = { FILLED: 'filled', SAME: 'same', NOCASH: 'nocash', NOSHARES: 'noshares', NOLIMIT: 'nolimit' };
const MISS_LABEL = { nocash: '미체결(현금 부족)', noshares: '미체결(팔 주식 없음)', nolimit: '미체결(지정가 안 닿음)' };

// preset: { frame, ... }  params: 수치 묶음  opt: { initial, fee, nextDay }
export function runStrategy(ind, from, to, preset, params, opt) {
  const frame = FRAMES[preset.frame];
  if (!frame) throw new Error(`틀 없음: ${preset.frame}`);
  const fee = opt.fee;
  const sameDay = frame.sameDayOnly ? frame.sameDayOnly(params) : false;
  const nextDay = !!opt.nextDay && !sameDay;
  const acct = { cash: opt.initial, shares: 0, lots: [] };
  const mem = {};
  const trades = [];
  const daily = [];
  let pending = [];
  let i = from;
  let poolStart = null;

  const priceAt = (j) => ind.p[j];
  const total = (j) => acct.cash + acct.shares * priceAt(j);
  const weight = (j) => { const t = total(j); return t > 0 ? (acct.shares * priceAt(j)) / t : 0; };

  function addLot(tag, qty, price, j) {
    acct.lots.push({ tag, qty, price, k: ind.k[j], date: ind.date[j] });
  }
  // 최근 산 묶음부터 줄인다(filter 가 있으면 그 꼬리표만)
  function removeQty(qty, filter) {
    let left = qty;
    for (let x = acct.lots.length - 1; x >= 0 && left > 0; x--) {
      const lot = acct.lots[x];
      if (filter && !filter(lot)) continue;
      const take = Math.min(lot.qty, left);
      lot.qty -= take;
      left -= take;
    }
    acct.lots = acct.lots.filter((l) => l.qty > 0);
  }
  const tagQty = (tag) => acct.lots.filter((l) => l.tag === tag).reduce((a, l) => a + l.qty, 0);

  function record(j, reason, qty, price, status) {
    const t = total(j);
    trades.push({
      date: ind.date[j], reason: MISS_LABEL[status] ? `${reason} - ${MISS_LABEL[status]}` : reason,
      kospi: ind.k[j], qty, price, amount: qty * price, weight: t > 0 ? (acct.shares * priceAt(j)) / t : 0,
      cash: acct.cash, total: t, status,
    });
  }

  // 주문 하나 체결. 반환 { order, qty, price, status }
  function execOne(o, j) {
    const price = o.price != null ? o.price : priceAt(j);
    if (o.limit && !o.limit(j)) {
      record(j, o.reason, 0, price, ST.NOLIMIT);
      return { order: o, qty: 0, price, status: ST.NOLIMIT };
    }
    let side = o.side;
    let qty = 0;
    if (o.type === 'weight') {
      const t = acct.cash + acct.shares * price;
      const targetVal = t * o.w;
      const stockVal = acct.shares * price;
      if (targetVal > stockVal) {
        side = 'buy';
        qty = Math.floor((targetVal - stockVal) / (price * (1 + fee)));
        qty = Math.min(qty, Math.floor(acct.cash / (price * (1 + fee))));
      } else if (targetVal < stockVal) {
        side = 'sell';
        qty = Math.floor((stockVal - targetVal) / price);
      }
      if (qty <= 0) return { order: o, qty: 0, price, status: ST.SAME };
    } else if (o.type === 'won') {
      qty = Math.floor(Math.min(o.won, acct.cash) / (price * (1 + fee)));
      if (qty <= 0) { record(j, o.reason, 0, price, ST.NOCASH); return { order: o, qty: 0, price, status: ST.NOCASH }; }
    } else if (o.type === 'qty') {
      qty = Math.min(Math.floor(o.qty), o.onlyTag ? tagQty(o.onlyTag) : acct.shares);
      if (qty <= 0) { record(j, o.reason, 0, price, ST.NOSHARES); return { order: o, qty: 0, price, status: ST.NOSHARES }; }
    } else if (o.type === 'tag') {
      qty = Math.min(o.frac != null ? Math.floor(tagQty(o.tag) * o.frac) : tagQty(o.tag), acct.shares);
      if (qty <= 0) { record(j, o.reason, 0, price, ST.NOSHARES); return { order: o, qty: 0, price, status: ST.NOSHARES }; }
    } else if (o.type === 'sellWon') {
      qty = Math.min(Math.floor(o.won / price), acct.shares);
      if (qty <= 0) { record(j, o.reason, 0, price, ST.NOSHARES); return { order: o, qty: 0, price, status: ST.NOSHARES }; }
    }
    if (side === 'buy') {
      const cost = qty * price;
      acct.cash -= cost + cost * fee;
      acct.shares += qty;
      addLot(o.tag || 'main', qty, price, j);
      record(j, o.reason, qty, price, ST.FILLED);
      return { order: o, qty, price, status: ST.FILLED };
    }
    const got = qty * price;
    acct.cash += got - got * fee;
    acct.shares -= qty;
    if (o.type === 'tag') removeQty(qty, (l) => l.tag === o.tag);
    else if (o.onlyTag) removeQty(qty, (l) => l.tag === o.onlyTag);
    else removeQty(qty, null);
    record(j, o.reason, -qty, price, ST.FILLED);
    return { order: o, qty: -qty, price, status: ST.FILLED };
  }

  // 매도 먼저, 매수 나중. weight 주문은 체결 때 방향이 정해지므로 현재 비중으로 미리 가른다.
  function execAll(orders, j) {
    const isSell = (o) => o.side === 'sell' || (o.type === 'weight' && weight(j) > o.w);
    const sells = orders.filter(isSell);
    const buys = orders.filter((o) => !isSell(o));
    const results = [];
    for (const o of [...sells, ...buys]) results.push(execOne(o, j));
    return results;
  }

  const ctx = {
    ind, mem, acct, params,
    get i() { return i; },
    get k() { return ind.k[i]; },
    get p() { return ind.p[i]; },
    get cash() { return acct.cash; },
    get shares() { return acct.shares; },
    get poolStart() { return poolStart; },
    total: () => total(i),
    weight: () => weight(i),
    tagQty,
    lots: () => acct.lots,
    orders: [],
    buyWon(won, reason, tag, extra = {}) { ctx.orders.push({ type: 'won', side: 'buy', won, reason, tag, ...extra }); },
    sellQty(qty, reason, extra = {}) { ctx.orders.push({ type: 'qty', side: 'sell', qty, reason, ...extra }); },
    sellTag(tag, reason, extra = {}) { ctx.orders.push({ type: 'tag', side: 'sell', tag, reason, ...extra }); },
    sellWon(won, reason, extra = {}) { ctx.orders.push({ type: 'sellWon', side: 'sell', won, reason, ...extra }); },
    setWeight(w, reason, extra = {}) { ctx.orders.push({ type: 'weight', w, reason, ...extra }); },
    // 매매 없는 알림 줄(30 down 시작 · 건너뜀 등). 매매 횟수에 넣지 않는다.
    note(reason) { record(i, reason, 0, ind.p[i], 'note'); },
  };

  function deliver(results) {
    if (frame.fill) for (const r of results) frame.fill(ctx, params, r);
  }

  // 첫날: 출발 상태라 늘 같은 날 체결(기획서 5.6.3)
  ctx.orders = [];
  frame.start(ctx, params);
  deliver(execAll(ctx.orders, i));
  poolStart = acct.cash;
  daily.push([ind.date[i], total(i), weight(i)]);

  for (i = from + 1; i <= to; i++) {
    if (pending.length) { deliver(execAll(pending, i)); pending = []; }
    ctx.orders = [];
    frame.day(ctx, params);
    if (ctx.orders.length) {
      if (nextDay) pending = ctx.orders;
      else deliver(execAll(ctx.orders, i));
    }
    daily.push([ind.date[i], total(i), weight(i)]);
  }
  return { daily, trades, summary: summarizeRun(daily, trades, opt.initial) };
}

export function summarizeRun(daily, trades, initial) {
  if (!daily.length) return { final: initial, totalReturn: 0, cagr: 0, mdd: 0, recovery: null, unrecovered: 0, giveBack: 0, giveBackPct: 0, tradeCount: 0, start: null, end: null };
  const final = daily[daily.length - 1][1];
  const years = (Date.parse(daily[daily.length - 1][0]) - Date.parse(daily[0][0])) / (DAYS_PER_YEAR * 86400000);
  let hi = -Infinity;
  let hiAt = 0;
  let mdd = 0;
  let mddPeakVal = daily[0][1];
  let trough = 0;
  for (let j = 0; j < daily.length; j++) {
    const v = daily[j][1];
    if (v > hi) { hi = v; hiAt = j; }
    const dd = v / hi - 1;
    if (dd < mdd) { mdd = dd; trough = j; mddPeakVal = hi; }
  }
  // 회복 기간: 최대 낙폭 바닥에서 그 전 고점을 다시 넘을 때까지 거래일 수
  let recovery = null;
  if (mdd < 0) {
    for (let j = trough + 1; j < daily.length; j++) {
      if (daily[j][1] >= mddPeakVal) { recovery = j - trough; break; }
    }
  } else recovery = 0;
  const unrecovered = final < hi ? daily.length - 1 - hiAt : 0;
  return {
    final,
    totalReturn: final / initial - 1,
    cagr: years > 0 ? Math.pow(final / initial, 1 / years) - 1 : 0,
    mdd,
    recovery,
    unrecovered,
    giveBack: hi - final,
    giveBackPct: final / hi - 1,
    tradeCount: trades.filter((t) => t.status === ST.FILLED && t.qty !== 0).length,
    start: daily[0][0],
    end: daily[daily.length - 1][0],
  };
}
