// 전략 실험실 규칙 틀(기획서 3.4 · 3.6 ~ 3.8 · 3.11 · 5.6.3). 틀 하나 = { start, day, fill?, sameDayOnly? }.
// 틀은 주문만 내고, 상태는 fill 에서 체결을 확인한 뒤에만 바꾼다.
import { DOWN_ACTIONS, UP_STEPS, QUARTER_HIGH_COUNT, SIGNAL_SPAN, INF_SELL_FRAC } from '../data/numbers.js';

const EPS = 1e-12;
const DONE = (r) => r.status === 'filled' || r.status === 'same';
const pctTxt = (v) => `${Math.round(v * 1000) / 10}%`;

// 급락 · 급등 판정(기획서 3.3 · 3.11). mem 에 B · C · D 의 쉬는 기간을 적는다.
const SPAN = SIGNAL_SPAN;
export function signal(ind, i, p, mem) {
  const out = { down: false, up: false };
  if (i < 1) return out;
  const w = p.width;
  if (p.def === 'A') {
    const r = ind.ret(i, 1);
    out.down = r <= -w + EPS;
    out.up = r >= w - EPS;
  } else if (SPAN[p.def]) {
    const n = SPAN[p.def];
    const r = ind.ret(i, n);
    if (r === null) return out;
    if (i >= (mem.sigDown ?? -1) && r <= -w + EPS) { out.down = true; mem.sigDown = i + n + 1; }
    if (i >= (mem.sigUp ?? -1) && r >= w - EPS) { out.up = true; mem.sigUp = i + n + 1; }
  } else if (p.def === 'E') {
    const r = ind.ret(i, 1);
    const s = ind.signalStd[i];
    if (s === null) return out;
    out.down = r <= -p.mult * s + EPS;
    out.up = r >= p.mult * s - EPS;
  } else if (p.def === 'I') {
    const b = ind.bar(i, 'kospi');
    if (!b) return out;
    const prev = ind.k[i - 1];
    out.down = b[2] / prev - 1 <= -w + EPS;
    out.up = b[1] / prev - 1 >= w - EPS;
    if (out.down && out.up) { out.down = false; out.up = false; } // 같은 날 둘 다면 순서를 몰라 판정하지 않는다
  }
  return out;
}

function retag(c, from, to) {
  for (const l of c.lots()) if (from.includes(l.tag)) l.tag = to;
}

// ---- 보유 ----
const hold = {
  start(c, p) { c.setWeight(p.weight, '시작'); },
  day() {},
};

// ---- 고점 대비 낙폭 사다리(기획서 3.5, 옛 simulate.js 와 같은 계산) ----
const ladder = {
  start(c, p) {
    const m = c.mem;
    m.target = p.base; m.peak = c.k; m.trough = c.k; m.downDone = 0; m.upDone = 0;
    c.setWeight(p.base, '시작');
  },
  day(c, p) {
    const m = c.mem;
    const k = c.k;
    const labels = [];
    let nt = m.target;
    if (k > m.peak) {
      const touched = m.downDone > 0 || m.upDone > 0 || m.target !== p.base;
      m.peak = k; m.trough = k; m.downDone = 0; m.upDone = 0;
      if (touched && m.target !== p.base) { nt = p.base; labels.push('새 고점'); }
    } else {
      if (k < m.trough) m.trough = k;
      const dd = k / m.peak - 1;
      while (m.downDone < DOWN_ACTIONS.length && dd <= -(m.downDone + 1) * p.step + EPS) {
        nt = Math.min(1, Math.max(0, Math.round((nt + DOWN_ACTIONS[m.downDone] * p.unit) * 1e9) / 1e9));
        m.downDone++;
        labels.push(`급락 ${m.downDone}`);
      }
      const up = k / m.trough - 1;
      while (m.upDone < UP_STEPS && up >= (m.upDone + 1) * p.step - EPS) {
        m.upDone++;
        const t = Math.max(p.base, nt - p.unit);
        if (t !== nt) labels.push(`급등 ${m.upDone}`);
        nt = t;
      }
    }
    if (labels.length && Math.abs(nt - m.target) >= 1e-9) {
      m.target = nt;
      c.setWeight(nt, labels.join(' · '));
    } else if (labels.length) m.target = nt;
  },
};

// ---- 사용자 원안(기획서 3.6) ----
function userSellAdd(c, p, m, key) {
  if (p.resell === 'won') c.sellWon(m.addWon, '급등 - 추가로 넣은 금액만큼 매도', { key });
  else c.sellTag('add', '급등 - 추가로 산 만큼 매도', { key });
}
function userCum(c, p, m) {
  const base = p.cumBase === 'stateHigh' ? m.hiK : m.refK;
  return base != null && c.k <= base * (1 - p.cumDrop) + EPS;
}
const user = {
  sameDayOnly: (p) => p.def === 'I',
  start(c, p) {
    const m = c.mem;
    m.state = 'N'; m.addWon = 0; m.refK = null; m.hiK = null;
    c.setWeight(p.base, '시작');
  },
  day(c, p) {
    const m = c.mem;
    const s = signal(c.ind, c.i, p, m);
    if (m.hiK != null) m.hiK = Math.max(m.hiK, c.k);
    const stopQty = Math.floor(c.shares * p.stopPct);
    const cum = (m.state === 'B2' || m.state === 'R') && userCum(c, p, m);
    switch (m.state) {
      case 'N':
        if (s.down) c.buyWon(c.cash * p.buy1, '급락 매수 1', 'add', { key: 'B1' });
        else if (s.up && p.normalSurge === 'sell') c.sellQty(stopQty, '평상 급등 매도', { key: 'N' });
        break;
      case 'B1':
        if (s.up) userSellAdd(c, p, m, 'N');
        else if (s.down) c.buyWon(c.cash * p.buy2, '급락 매수 2', 'add', { key: 'B2' });
        break;
      case 'B2':
        if (s.up) userSellAdd(c, p, m, 'N');
        else if (s.down || cum) c.sellQty(stopQty, s.down ? '급락 손절' : '누적 하락 손절', { key: 'SL' });
        break;
      case 'SL':
        if (s.up) c.sellQty(stopQty, '손절 뒤 급등 - 더 매도', { key: 'N' });
        else if (s.down) c.buyWon(c.cash * p.rebuy, '손절 뒤 급락 - 재매수', 're', { key: 'R' });
        break;
      case 'R':
        if (s.up) c.sellTag('re', '재매수분 매도', { key: 'SL' });
        else if (s.down || cum) c.sellQty(stopQty, s.down ? '급락 손절' : '누적 하락 손절', { key: 'SL' });
        break;
      default: break;
    }
  },
  fill(c, p, r) {
    const o = r.order;
    if (!o.key || !DONE(r)) return;
    const m = c.mem;
    m.state = o.key;
    if (o.key === 'B1' || o.key === 'B2') { m.addWon += r.qty * r.price; m.refK = c.k; m.hiK = c.k; }
    if (o.key === 'R') { m.refK = c.k; m.hiK = c.k; }
    if (o.key === 'SL') { retag(c, ['re'], 'main'); m.refK = null; m.hiK = null; }
    if (o.key === 'N') { m.addWon = 0; m.refK = null; m.hiK = null; retag(c, ['add', 're'], 'main'); }
  },
};

// ---- 시장 상태별 비중(기획서 3.7) ----
const REG_NAME = { up: '상승장', side: '횡보장', down: '하락장', strong: '강한 하락장' };
function regimeOf(c, p) {
  const ms = c.ind.sma(p.maShort)[c.i];
  const ml = c.ind.sma(p.maLong)[c.i];
  if (ms == null || ml == null) return null;
  const k = c.k;
  if (k > ms && ms > ml) return 'up';
  if (k < ml && ms < ml) return k <= ms * (1 - p.strongGap) + EPS ? 'strong' : 'down';
  return 'side';
}
const regime = {
  start(c, p) {
    const r = regimeOf(c, p);
    c.mem.reg = null;
    if (r) c.setWeight(regW(p, r), `시작(${REG_NAME[r]})`, { key: 'reg', reg: r });
  },
  day(c, p) {
    const m = c.mem;
    const r = regimeOf(c, p);
    if (!r) return;
    const s = signal(c.ind, c.i, p, m);
    if (r !== m.reg) { c.setWeight(regW(p, r), `시장 상태 ${REG_NAME[r]} - 목표 ${pctTxt(regW(p, r))}`, { key: 'reg', reg: r }); return; }
    if (p.trade !== 'on') return;
    const f = { up: p.fUp, side: p.fSide, down: p.fDown, strong: p.fStrong }[r];
    if (s.down && f > 0) c.buyWon(c.cash * f, `${REG_NAME[r]} 급락 매수`, 'add');
    else if (s.up) {
      if (r === 'up' || r === 'side') { if (c.tagQty('add') > 0) c.sellTag('add', `${REG_NAME[r]} 급등 - 추가 매수분 매도`); }
      else c.setWeight(regW(p, r), `${REG_NAME[r]} 급등 - 목표 비중으로`);
    }
  },
  fill(c, p, r) {
    if (r.order.key === 'reg' && DONE(r)) { c.mem.reg = r.order.reg; retag(c, ['add'], 'main'); }
  },
};
function regW(p, r) { return { up: p.wUp, side: p.wSide, down: p.wDown, strong: p.wStrong }[r]; }

// ---- 반등 확인 후 매수(GPT S05) ----
const rebound = {
  start(c, p) { const m = c.mem; m.wait = false; m.buys = 0; m.lot1 = null; m.lot2 = null; c.setWeight(p.base, '시작'); },
  day(c, p) {
    const m = c.mem;
    const s = signal(c.ind, c.i, p, m);
    for (const tag of ['lot1', 'lot2']) {
      if (m[tag] == null || c.tagQty(tag) === 0) continue;
      if (c.k >= m[tag] * (1 + p.take) - EPS) { c.sellTag(tag, `${tag === 'lot1' ? '1차' : '2차'} 묶음 수익 실현`, { key: `x${tag}` }); return; }
      if (c.k <= m[tag] * (1 - p.stop) + EPS) { c.sellTag(tag, `${tag === 'lot1' ? '1차' : '2차'} 묶음 손절`, { key: `x${tag}` }); return; }
    }
    if (m.wait) {
      m.low = Math.min(m.low, c.k);
      if (m.buys === 0 && c.k >= m.low * (1 + p.rb1) - EPS) c.buyWon(c.cash * p.buy1, '급락 뒤 반등 확인 - 1차 매수', 'lot1', { key: 'lot1' });
      else if (m.buys === 1 && c.k >= m.low * (1 + p.rb2) - EPS) c.buyWon(c.cash, '급락 뒤 반등 확인 - 2차 매수', 'lot2', { key: 'lot2' });
      return;
    }
    if (s.down && m.lot1 == null && m.lot2 == null) { m.wait = true; m.low = c.k; m.buys = 0; }
  },
  fill(c, p, r) {
    const m = c.mem;
    const key = r.order.key;
    if (!key) return;
    if (key === 'lot1' || key === 'lot2') {
      if (r.status !== 'filled') { m.wait = false; return; }
      m[key] = c.k;
      m.buys = key === 'lot1' ? 1 : 2;
      if (m.buys === 2) m.wait = false;
    } else if (key.startsWith('x') && r.status === 'filled') {
      m[key.slice(1)] = null;
      if (m.lot1 == null && m.lot2 == null && !m.wait) m.buys = 0;
    }
  },
};

// ---- 이동평균 띠(Siegel · Gayed · TradingView) ----
const maBand = {
  start(c, p) {
    const ma = c.ind.sma(p.maLen)[c.i];
    c.mem.in = false;
    if (ma != null && c.k > ma * (1 + p.upBand)) c.setWeight(p.weight, '시작 - 평균 위', { key: 'in' });
  },
  day(c, p) {
    const ma = c.ind.sma(p.maLen)[c.i];
    if (ma == null) return;
    if (!c.mem.in && c.k > ma * (1 + p.upBand)) c.setWeight(p.weight, `${p.maLen}일 평균 위 - 매수`, { key: 'in' });
    else if (c.mem.in && c.k < ma * (1 - p.dnBand)) c.setWeight(0, `${p.maLen}일 평균 아래 - 매도`, { key: 'out' });
  },
  fill(c, p, r) { if (r.order.key && DONE(r)) c.mem.in = r.order.key === 'in'; },
};

// ---- 월말 판정 공용(10개월선 · 절대 모멘텀) ----
function monthly(want) {
  return {
    start(c, p) {
      c.mem.in = false;
      const ord = c.ind.meOrd[c.i];
      const w = ord >= 0 ? want(c.ind, ord, p) : null;
      if (w) c.setWeight(p.weight, '시작 - 직전 월말 판정 보유', { key: 'in' });
    },
    day(c, p) {
      if (!c.ind.monthEnd[c.i]) return;
      const w = want(c.ind, c.ind.meOrd[c.i], p);
      if (w === null) return;
      if (w && !c.mem.in) c.setWeight(p.weight, '월말 판정 - 보유', { key: 'in' });
      else if (!w && c.mem.in) c.setWeight(0, '월말 판정 - 현금', { key: 'out' });
    },
    fill(c, p, r) { if (r.order.key && DONE(r)) c.mem.in = r.order.key === 'in'; },
  };
}
const faber = monthly((ind, ord, p) => { const a = ind.meAvg(ord, p.months); return a === null ? null : ind.k[ind.meIdx[ord]] > a; });
const absmom = monthly((ind, ord, p) => { const r = ind.meRet(ord, p.lookback); return r === null ? null : r > 0; });

// ---- 변동성 맞추기 ----
const voltarget = {
  start(c, p) { volSet(c, p, '시작'); },
  day(c, p) { if (c.ind.monthFirst[c.i]) volSet(c, p, '월초'); },
};
function volSet(c, p, why) {
  const v = c.ind.levVol(p.volDays)[c.i];
  if (v == null || v <= 0) return;
  const w = Math.min(p.targetVol / v, p.cap);
  c.setWeight(w, `${why} 비중 ${pctTxt(w)} (변동성 ${pctTxt(v)})`);
}

// ---- 고정 비율 리밸런싱 ----
const rebalance = {
  start(c, p) { c.setWeight(p.target, '시작'); },
  day(c, p) {
    if (p.mode === 'yearly' && !c.ind.yearFirst[c.i]) return;
    if (Math.abs(c.weight() - p.target) > p.band + EPS) c.setWeight(p.target, `비중 ${pctTxt(c.weight())} - ${pctTxt(p.target)}로 맞춤`);
  },
};

// ---- 트레일링 스톱 ----
const trailing = {
  start(c, p) { c.mem.in = true; c.mem.hi = c.k; c.setWeight(p.weight, '시작'); },
  day(c, p) {
    const m = c.mem;
    if (m.in) {
      m.hi = Math.max(m.hi, c.k);
      if (c.k <= m.hi * (1 - p.drop) + EPS) c.setWeight(0, '고점 대비 하락 - 매도', { key: 'out' });
    } else {
      m.lo = Math.min(m.lo, c.k);
      if (c.k >= m.lo * (1 + p.rebound) - EPS) c.setWeight(p.weight, '저점 대비 반등 - 재매수', { key: 'in' });
    }
  },
  fill(c, p, r) {
    const key = r.order.key;
    if (!key || !DONE(r)) return;
    c.mem.in = key === 'in';
    if (key === 'in') c.mem.hi = c.k; else c.mem.lo = c.k;
  },
};

// ---- 6Sig · 3Sig ----
const kelly = {
  start(c, p) { const m = c.mem; m.signal = null; m.crash = false; m.skipLeft = 0; m.crashOrd = null; m.lastPeak = null; c.setWeight(p.base, '시작', { key: 'base' }); },
  day(c, p) {
    const ind = c.ind;
    if (!ind.quarterEnd[c.i]) return;
    const m = c.mem;
    const ord = ind.qeOrd[c.i];
    // 30 down: 분기 말 코스피가 최근 2년(분기 말 8개) 최고보다 crash 이상 낮으면 매도 skipMax 번 건너뜀
    if (m.crash && (m.skipLeft <= 0 || ord - m.crashOrd >= QUARTER_HIGH_COUNT)) { m.crash = false; c.note('30 down 풀림'); }
    const prev = ind.qeIdx.slice(Math.max(0, ord - QUARTER_HIGH_COUNT), ord).map((j) => ind.k[j]);
    const peak = prev.length ? Math.max(...prev) : null;
    if (!m.crash && peak !== null && peak !== m.lastPeak && p.skipMax > 0 && c.k <= peak * (1 - p.crash) + EPS) {
      m.crash = true; m.skipLeft = p.skipMax; m.crashOrd = ord; m.lastPeak = peak;
      c.note(`30 down 시작 - 2년 분기 말 최고보다 ${pctTxt(1 - c.k / peak)} 낮음`);
    }
    const stockVal = c.shares * c.p;
    if (p.cashCap > 0 && c.cash / c.total() >= p.cashCap - EPS) { c.setWeight(p.base, `현금 ${pctTxt(c.cash / c.total())} - ${pctTxt(p.base)} 로 되돌림`, { key: 'base' }); return; }
    if (m.signal == null) m.signal = stockVal;
    const target = m.signal * (1 + p.growth);
    if (stockVal > target + EPS) {
      if (m.crash && m.skipLeft > 0) { m.skipLeft--; m.signal = stockVal; c.note(`30 down - 매도 신호 건너뜀(남은 ${m.skipLeft}번)`); return; }
      c.sellWon(stockVal - target, '분기 신호선 초과 - 매도', { key: 'q' });
    } else if (stockVal < target - EPS) {
      c.buyWon(target - stockVal, '분기 신호선 미달 - 매수', 'main', { key: 'q' });
    } else m.signal = stockVal;
  },
  fill(c, p, r) {
    const key = r.order.key;
    if (key === 'q' || key === 'base') c.mem.signal = c.shares * r.price;
  },
};

// ---- 20% 몫 공용: 첫날 기본 비중을 core 로 산다 ----
const poolStart = (c, p) => c.setWeight(p.base, `시작 - 기본 ${pctTxt(p.base)}`, { tag: 'core' });

const rsi2 = {
  start: poolStart,
  day(c, p) {
    const ind = c.ind;
    const held = c.tagQty('pool') > 0;
    const ma = ind.sma(p.maLen)[c.i];
    const r = ind.rsi[c.i];
    if (!held) {
      if (ma != null && r != null && c.k > ma && r <= p.rsiBuy + EPS) c.buyWon(c.cash, `RSI(2) ${r.toFixed(1)} - 20% 몫 매수`, 'pool');
    } else {
      const ex = ind.sma(p.smaExit)[c.i];
      if (ex != null && c.k > ex) c.sellTag('pool', `${p.smaExit}일 평균 위 - 매도`);
    }
  },
};

const double7 = {
  start: poolStart,
  day(c, p) {
    const ind = c.ind;
    const held = c.tagQty('pool') > 0;
    if (!held) {
      const ma = ind.sma(p.maLen)[c.i];
      const lo = ind.minK(c.i, p.window);
      if (ma != null && lo != null && c.k > ma && c.k <= lo + EPS) c.buyWon(c.cash, `${p.window}일 최저 종가 - 20% 몫 매수`, 'pool');
    } else {
      const hi = ind.maxK(c.i, p.window);
      if (hi != null && c.k >= hi - EPS) c.sellTag('pool', `${p.window}일 최고 종가 - 매도`);
    }
  },
};

const r3 = {
  start: poolStart,
  day(c, p) {
    const ind = c.ind;
    const i = c.i;
    const r = ind.rsi;
    const held = c.tagQty('pool') > 0;
    if (!held) {
      if (i < 3 || [r[i], r[i - 1], r[i - 2], r[i - 3]].some((v) => v == null)) return;
      const ma = ind.sma(p.maLen)[i];
      const fall3 = r[i] < r[i - 1] && r[i - 1] < r[i - 2] && r[i - 2] < r[i - 3];
      if (ma != null && c.k > ma && fall3 && r[i - 3] < p.rsiStart && r[i] < p.rsiLow) c.buyWon(c.cash, 'R3 - 20% 몫 매수', 'pool');
    } else if (r[i] != null && r[i] > p.rsiExit) c.sellTag('pool', `RSI(2) ${r[i].toFixed(1)} - 매도`);
  },
};

const grid = {
  start(c, p) { poolStart(c, p); c.mem.ref = c.k; c.mem.held = {}; },
  day(c, p) {
    const m = c.mem;
    const unit = c.poolStart / p.levels;
    const anyHeld = Object.values(m.held).some(Boolean);
    if (!anyHeld && c.k >= m.ref * (1 + p.gridStep) - EPS) { m.ref = c.k; return; }
    for (let j = 1; j <= p.levels; j++) {
      const L = m.ref * Math.pow(1 - p.gridStep, j);
      if (m.held[j] && c.k >= L * (1 + p.gridStep) - EPS) { const lv = L * (1 + p.gridStep); c.sellTag(`g${j}`, `그리드 ${j}칸 매도`, { key: 's', j, limit: (x) => c.ind.k[x] >= lv - EPS }); }
      else if (!m.held[j] && c.k <= L + EPS) c.buyWon(unit, `그리드 ${j}칸 매수`, `g${j}`, { key: 'b', j, limit: (x) => c.ind.k[x] <= L + EPS });
    }
  },
  fill(c, p, r) {
    const o = r.order;
    if (r.status !== 'filled') return;
    if (o.key === 'b') c.mem.held[o.j] = true;
    if (o.key === 's') c.mem.held[o.j] = false;
  },
};

// ---- 무한매수법 V2.2(기획서 3.8 · 3.8.1). 주문 가격은 전날까지의 보유 기록으로만 정한다 ----
const infinite = {
  sameDayOnly: () => true,
  start(c, p) {
    poolStart(c, p);
    const m = c.mem;
    m.invested = 0; m.cost = 0; m.mode = 'normal'; m.qCount = 0; m.qUnit = 0;
    m.unit = Math.round(((c.total() * (1 - p.base)) / p.splits) * 1e6) / 1e6; // 1 - 0.8 같은 소수 오차로 1주 덜 사지 않게
    c.buyWon(m.unit, '무한매수 1회분(새로 시작)', 'inf', { key: 'buy' });
  },
  day(c, p) {
    const m = c.mem;
    const ind = c.ind;
    const unit = m.unit;
    const q = c.tagQty('inf');
    if (q === 0) { c.buyWon(unit, '무한매수 1회분(새로 시작)', 'inf', { key: 'buy' }); return; }
    const avg = m.cost / q;
    const T = m.invested / unit;
    const star = (p.starBase - p.starSlope * T) / 100;
    if (m.mode === 'normal') {
      if (T > p.splits - 1) { c.sellQty(Math.floor(q * INF_SELL_FRAC), `T ${T.toFixed(1)} - 쿼터손절 1/4 매도`, { onlyTag: 'inf', key: 'qsell' }); return; }
      const s1 = avg * (1 + star);
      const s2 = avg * (1 + p.profit);
      const q1 = Math.floor(q * INF_SELL_FRAC);
      if (q1 > 0) c.sellQty(q1, `별% 지정가 1/4 매도(평단 ${pctTxt(star)} 위)`, { onlyTag: 'inf', key: 'sell', limit: (j) => ind.p[j] >= s1 - EPS });
      c.sellQty(q - q1, `+${pctTxt(p.profit)} 지정가 3/4 매도`, { onlyTag: 'inf', key: 'sell', limit: (j) => ind.p[j] >= s2 - EPS });
      if (T <= Math.floor((p.splits - 1) / 2)) {
        c.buyWon(unit / 2, '평단 장 마감 지정가 매수', 'inf', { key: 'buy', limit: (j) => ind.p[j] <= avg + EPS });
        c.buyWon(unit / 2, '별% 장 마감 지정가 매수', 'inf', { key: 'buy', limit: (j) => ind.p[j] <= s1 + EPS });
      } else {
        c.buyWon(unit, '별% 장 마감 지정가 매수(후반전)', 'inf', { key: 'buy', limit: (j) => ind.p[j] <= s1 + EPS });
      }
      return;
    }
    // 쿼터손절 중
    if (m.qCount >= p.qSplits) { c.sellQty(Math.floor(q * INF_SELL_FRAC), '쿼터손절 10회 뒤 1/4 매도', { onlyTag: 'inf', key: 'qsell2', avgAt: avg }); return; }
    const lim = avg * (1 - p.qLoss);
    c.buyWon(m.qUnit, '쿼터손절 장 마감 지정가 매수', 'inf', { key: 'qbuy', limit: (j) => ind.p[j] <= lim + EPS });
  },
  fill(c, p, r) {
    const m = c.mem;
    const o = r.order;
    if (o.tag !== 'inf' && o.onlyTag !== 'inf') return; // 첫날 80% 시작 매수는 회차에 넣지 않는다
    if (o.key === 'qbuy') m.qCount++;
    if (r.status !== 'filled') return;
    if (r.qty > 0) { m.invested += r.qty * r.price; m.cost += r.qty * r.price; return; }
    // 매도: 판 비율만큼 누적 매수 금액 · 원가를 줄인다(실험용 설정)
    const after = c.tagQty('inf');
    const before = after - r.qty;
    const ratio = before > 0 ? after / before : 0;
    m.invested *= ratio; m.cost *= ratio;
    if (after === 0) { m.invested = 0; m.cost = 0; m.mode = 'normal'; m.qCount = 0; return; }
    if (o.key === 'qsell') { m.mode = 'quarter'; m.qUnit = c.cash / p.qSplits; m.qCount = 0; }
    if (o.key === 'qsell2') {
      if (r.price > o.avgAt * (1 - p.qLoss)) m.mode = 'normal';
      else { m.qUnit = c.cash / p.qSplits; m.qCount = 0; }
    }
  },
};

// ---- 변동성 돌파(기획서 3.11) ----
const breakout = {
  sameDayOnly: () => true,
  start: poolStart,
  day(c, p) {
    const ind = c.ind;
    const i = c.i;
    const lb = ind.bar(i, 'lev');
    if (lb && c.tagQty('pool') > 0) c.sellTag('pool', '다음 날 시가 매도', { price: lb[0] });
    const kb = ind.bar(i, 'kospi');
    const kb0 = ind.bar(i - 1, 'kospi');
    const lb0 = ind.bar(i - 1, 'lev');
    if (!kb || !kb0 || !lb || !lb0) return;
    const trig = kb[0] + p.k * (kb0[1] - kb0[2]);
    if (kb[1] >= trig) {
      // 레버리지 돌파 가격에 그날 고가가 못 닿으면 미체결(다른 가격으로 바꿔 사지 않는다)
      const price = lb[0] + p.k * (lb0[1] - lb0[2]);
      c.buyWon(Infinity, '변동성 돌파 - 20% 몫 매수', 'pool', { price, limit: () => lb[1] >= price - EPS });
    }
  },
};

export const FRAMES = { hold, ladder, user, regime, rebound, maBand, faber, absmom, voltarget, rebalance, trailing, kelly, rsi2, double7, r3, grid, infinite, breakout };
