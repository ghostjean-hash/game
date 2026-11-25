// 코스피 낙폭 단계로 KODEX 레버리지 비중을 바꾸는 모의 계산(기획서 3.2). 화면과 분리된 순수 함수.
// 판정은 코스피 종가, 체결은 같은 날 레버리지 종가. 주식은 1주 단위로 사고판다.
import { DOWN_ACTIONS, UP_STEPS, FEE_RATE, DAYS_PER_YEAR } from '../data/numbers.js';

// 두 시세에서 같은 날짜만 골라 [날짜, 코스피, 레버리지] 로 맞춘다.
export function alignDays(kospiRows, levRows) {
  const lev = new Map(levRows);
  const out = [];
  for (const [d, k] of kospiRows) {
    const p = lev.get(d);
    if (p !== undefined && k > 0 && p > 0) out.push([d, k, p]);
  }
  return out;
}

function rebalance(state, price, targetWeight, fee) {
  const stockVal = state.shares * price;
  const total = state.cash + stockVal;
  const targetVal = total * targetWeight;
  let qty = 0;
  if (targetVal > stockVal) {
    qty = Math.floor((targetVal - stockVal) / (price * (1 + fee)));
    if (qty > 0) {
      const cost = qty * price;
      state.cash -= cost + cost * fee;
      state.shares += qty;
    }
  } else if (targetVal < stockVal) {
    qty = -Math.floor((stockVal - targetVal) / price);
    if (qty < 0) {
      const got = -qty * price;
      state.cash += got - got * fee;
      state.shares += qty;
    }
  }
  return qty;
}

// days: alignDays 결과. opt: { initial, baseWeight(0~1), step(0~1), unit(0~1), fee, ladder(false면 매매 없이 들고 있기) }
export function simulate(days, opt) {
  const fee = opt.fee ?? FEE_RATE;
  const base = opt.baseWeight;
  const state = { cash: opt.initial, shares: 0 };
  const daily = [];
  const trades = [];
  if (!days.length) return { daily, trades, summary: summarize(daily, trades, opt.initial) };

  const record = (d, k, p, label, qty, ddv, target) => {
    const total = state.cash + state.shares * p;
    trades.push({ date: d, label, kospi: k, drawdown: ddv, qty, amount: qty * p, weight: (state.shares * p) / total, target, total });
  };

  const [d0, k0, p0] = days[0];
  let target = base;
  let peak = k0;
  let trough = k0;
  let downDone = 0;
  let upDone = 0;
  const q0 = rebalance(state, p0, target, fee);
  record(d0, k0, p0, '시작', q0, 0, target);

  for (let i = 0; i < days.length; i++) {
    const [d, k, p] = days[i];
    if (i > 0 && opt.ladder !== false) {
      const labels = [];
      let newTarget = target;
      if (k > peak) {
        const touched = downDone > 0 || upDone > 0 || target !== base;
        peak = k;
        trough = k;
        downDone = 0;
        upDone = 0;
        if (touched && target !== base) {
          newTarget = base;
          labels.push('새 고점');
        }
      } else {
        if (k < trough) trough = k;
        const ddv = k / peak - 1;
        while (downDone < DOWN_ACTIONS.length && ddv <= -(downDone + 1) * opt.step + 1e-12) {
          newTarget = clamp(newTarget + DOWN_ACTIONS[downDone] * opt.unit);
          downDone++;
          labels.push(`급락 ${downDone}`);
        }
        const up = k / trough - 1;
        while (upDone < UP_STEPS && up >= (upDone + 1) * opt.step - 1e-12) {
          upDone++;
          const t = Math.max(base, newTarget - opt.unit);
          if (t !== newTarget) labels.push(`급등 ${upDone}`);
          newTarget = t;
        }
      }
      if (labels.length && !near(newTarget, target)) {
        target = newTarget;
        const qty = rebalance(state, p, target, fee);
        record(d, k, p, labels.join(' · '), qty, k / peak - 1, target);
      } else if (labels.length) {
        target = newTarget;
      }
    }
    const total = state.cash + state.shares * p;
    daily.push([d, total, (state.shares * p) / total]);
  }
  return { daily, trades, summary: summarize(daily, trades, opt.initial) };
}

function clamp(w) { return Math.min(1, Math.max(0, Math.round(w * 1e9) / 1e9)); }
function near(a, b) { return Math.abs(a - b) < 1e-9; }

export function summarize(daily, trades, initial) {
  if (!daily.length) return { final: initial, totalReturn: 0, cagr: 0, mdd: 0, tradeCount: 0, start: null, end: null };
  const final = daily[daily.length - 1][1];
  const t0 = Date.parse(daily[0][0]);
  const t1 = Date.parse(daily[daily.length - 1][0]);
  const years = (t1 - t0) / (DAYS_PER_YEAR * 86400000);
  let hi = -Infinity;
  let mdd = 0;
  for (const [, v] of daily) {
    if (v > hi) hi = v;
    const dd = v / hi - 1;
    if (dd < mdd) mdd = dd;
  }
  return {
    final,
    totalReturn: final / initial - 1,
    cagr: years > 0 ? Math.pow(final / initial, 1 / years) - 1 : 0,
    mdd,
    tradeCount: trades.filter((t) => t.qty !== 0).length,
    start: daily[0][0],
    end: daily[daily.length - 1][0],
  };
}
