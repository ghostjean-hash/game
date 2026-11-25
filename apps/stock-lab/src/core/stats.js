// 전략 실험실 통계(기획서 3.9 · 5.6.4). 화면과 분리한 순수 함수.
import { rangeOf } from './indicators.js';
import { runStrategy } from './engine.js';
import { LAB_YEARS, LAB_CONT_FROM } from '../data/numbers.js';

export function yearRanges(ind) {
  return LAB_YEARS.map((y) => ({ key: y, range: rangeOf(ind, `${y}-01-01`, `${y}-12-31`) })).filter((r) => r.range);
}
export function continuousRange(ind) {
  return rangeOf(ind, LAB_CONT_FROM, null);
}

// items: [{ id, preset, params }] → { [id]: run }
export function runMany(ind, range, items, opt) {
  const out = {};
  if (!range) return out;
  for (const it of items) out[it.id] = runStrategy(ind, range[0], range[1], it.preset, it.params, opt);
  return out;
}

// 순위: 총수익률 높은 순 1부터. ids 안에서만 매긴다.
export function ranks(runs, ids) {
  const sorted = ids.filter((id) => runs[id]).sort((a, b) => runs[b].summary.totalReturn - runs[a].summary.totalReturn);
  const r = {};
  sorted.forEach((id, n) => { r[id] = n + 1; });
  return r;
}

// byYear: { 연도: { id: run } }, cont: { id: run }, ids: 순위를 매길 전략(고른 묶음 + 기준)
export function yearTable(byYear, cont, ids, holdIds = { h100: 'hold100', h80: 'hold80' }) {
  const years = Object.keys(byYear);
  const rankBy = {};
  for (const y of years) rankBy[y] = ranks(byYear[y], ids);
  return ids.map((id) => {
    const cells = years.map((y) => {
      const s = byYear[y][id]?.summary;
      return s ? { ret: s.totalReturn, mdd: s.mdd } : null;
    });
    const have = cells.filter(Boolean);
    const avgRet = have.length ? have.reduce((a, c) => a + c.ret, 0) / have.length : null;
    const avgMdd = have.length ? have.reduce((a, c) => a + c.mdd, 0) / have.length : null;
    let win80 = 0;
    let win100 = 0;
    for (const y of years) {
      const s = byYear[y][id]?.summary;
      if (!s) continue;
      if (s.totalReturn > (byYear[y][holdIds.h80]?.summary.totalReturn ?? Infinity)) win80++;
      if (s.totalReturn > (byYear[y][holdIds.h100]?.summary.totalReturn ?? Infinity)) win100++;
    }
    const rk = years.map((y) => rankBy[y][id]).filter((v) => v != null);
    const avgRank = rk.length ? rk.reduce((a, b) => a + b, 0) / rk.length : null;
    const cs = cont[id]?.summary || null;
    return { id, years, cells, avgRet, avgMdd, win80, win100, avgRank, cont: cs };
  });
}
