// 전략 실험실 지표(기획서 5.6.1). 화면과 분리한 순수 함수.
// days: alignDays 결과 [[날짜, 코스피, 레버리지]] (10년 전체). ohlc: { kospi: Map(날짜→[시,고,저,종]), lev: Map }
import { TRADING_DAYS_PER_YEAR, HIGH_2Y_DAYS, SIGNAL_STD_DAYS, RSI_PERIOD } from '../data/numbers.js';

function stdev(arr) {
  const n = arr.length;
  if (n < 2) return null;
  const m = arr.reduce((a, b) => a + b, 0) / n;
  const v = arr.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1);
  return Math.sqrt(v);
}

export function prepare(days, ohlc = {}) {
  const n = days.length;
  const date = days.map((d) => d[0]);
  const k = days.map((d) => d[1]);
  const p = days.map((d) => d[2]);
  const ym = date.map((d) => d.slice(0, 7));
  const yr = date.map((d) => d.slice(0, 4));
  const qt = date.map((d) => `${d.slice(0, 4)}Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3)}`);

  // n일 전 대비 코스피 등락
  const ret = (i, m) => (i - m >= 0 ? k[i] / k[i - m] - 1 : null);
  const lret = (i) => (i >= 1 ? p[i] / p[i - 1] - 1 : null);

  // 단순 평균(길이마다 한 번)
  const smaCache = new Map();
  function sma(len) {
    if (!smaCache.has(len)) {
      const out = new Array(n).fill(null);
      let s = 0;
      for (let i = 0; i < n; i++) {
        s += k[i];
        if (i >= len) s -= k[i - len];
        if (i >= len - 1) out[i] = s / len;
      }
      smaCache.set(len, out);
    }
    return smaCache.get(len);
  }

  // 2일 RSI: 오른 폭 · 내린 폭 평균은 Wilder 방식(직전 평균 × (N-1)/N + 오늘 값 × 1/N)
  const rsi = new Array(n).fill(null);
  {
    let ag = null;
    let al = null;
    for (let i = 1; i < n; i++) {
      const c = k[i] - k[i - 1];
      const g = Math.max(c, 0);
      const l = Math.max(-c, 0);
      if (ag === null) { ag = g; al = l; continue; }
      ag = (ag * (RSI_PERIOD - 1) + g) / RSI_PERIOD;
      al = (al * (RSI_PERIOD - 1) + l) / RSI_PERIOD;
      rsi[i] = ag + al === 0 ? 50 : (100 * ag) / (ag + al);
    }
  }

  // 표준편차(오늘 포함 최근 len 개 하루 등락)
  const stdCache = new Map();
  function kStd(len) {
    const key = `k${len}`;
    if (!stdCache.has(key)) {
      const out = new Array(n).fill(null);
      for (let i = len; i < n; i++) {
        const a = [];
        for (let j = i - len + 1; j <= i; j++) a.push(ret(j, 1));
        out[i] = stdev(a);
      }
      stdCache.set(key, out);
    }
    return stdCache.get(key);
  }
  function levVol(len) {
    const key = `l${len}`;
    if (!stdCache.has(key)) {
      const out = new Array(n).fill(null);
      for (let i = len; i < n; i++) {
        const a = [];
        for (let j = i - len + 1; j <= i; j++) a.push(lret(j));
        const s = stdev(a);
        out[i] = s === null ? null : s * Math.sqrt(TRADING_DAYS_PER_YEAR);
      }
      stdCache.set(key, out);
    }
    return stdCache.get(key);
  }

  // 월 · 분기 · 해 마지막 · 첫 거래일. 자료 마지막 날은 끝인지 모르므로 마지막 표시를 달지 않는다.
  const monthEnd = date.map((_, i) => i < n - 1 && ym[i + 1] !== ym[i]);
  const quarterEnd = date.map((_, i) => i < n - 1 && qt[i + 1] !== qt[i]);
  const monthFirst = date.map((_, i) => i > 0 && ym[i - 1] !== ym[i]);
  const yearFirst = date.map((_, i) => i > 0 && yr[i - 1] !== yr[i]);

  // 월말 순번 목록과, 날짜마다 그날 이하 가장 가까운 월말 순번
  const meIdx = [];
  const meOrd = new Array(n).fill(-1); // 그날 이하 마지막 월말이 meIdx 의 몇 번째인지
  for (let i = 0; i < n; i++) {
    if (monthEnd[i]) meIdx.push(i);
    meOrd[i] = meIdx.length - 1;
  }
  // 월말 m 개 평균(그 월말 포함)
  function meAvg(ord, m) {
    if (ord < m - 1) return null;
    let s = 0;
    for (let j = ord - m + 1; j <= ord; j++) s += k[meIdx[j]];
    return s / m;
  }
  // 월말 기준 m 개월 수익률
  function meRet(ord, m) {
    if (ord < m) return null;
    return k[meIdx[ord]] / k[meIdx[ord - m]] - 1;
  }
  // 분기 말 순번
  const qeIdx = [];
  const qeOrd = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (quarterEnd[i]) qeIdx.push(i);
    qeOrd[i] = qeIdx.length - 1;
  }

  // 최근 len 일 최저 · 최고 종가(오늘 포함)
  const minK = (i, len) => (i - len + 1 < 0 ? null : Math.min(...k.slice(i - len + 1, i + 1)));
  const maxK = (i, len) => (i - len + 1 < 0 ? null : Math.max(...k.slice(i - len + 1, i + 1)));
  const high2y = k.map((_, i) => Math.max(...k.slice(Math.max(0, i - HIGH_2Y_DAYS + 1), i + 1)));

  const kOhlc = ohlc.kospi || new Map();
  const lOhlc = ohlc.lev || new Map();
  const bar = (i, which) => (which === 'lev' ? lOhlc : kOhlc).get(date[i]) || null;

  return {
    n, date, k, p, ret, lret, sma, rsi, kStd, levVol, signalStd: kStd(SIGNAL_STD_DAYS),
    monthEnd, quarterEnd, monthFirst, yearFirst, meIdx, meOrd, meAvg, meRet, qeIdx, qeOrd,
    minK, maxK, high2y, bar,
    indexOf: (d) => date.indexOf(d),
  };
}

// 날짜 구간 → 순번(from 이상 첫 거래일 ~ to 이하 마지막 거래일). 없으면 null.
export function rangeOf(ind, from, to) {
  let a = -1;
  let b = -1;
  for (let i = 0; i < ind.n; i++) {
    if (a < 0 && (!from || ind.date[i] >= from)) a = i;
    if (!to || ind.date[i] <= to) b = i;
  }
  return a >= 0 && b >= a ? [a, b] : null;
}
