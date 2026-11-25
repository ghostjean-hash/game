// 시뮬레이터 화면(기획서 3절).
import { simulate, alignDays } from '../core/simulate.js';
import {
  SIM_DEFAULTS, STEP_CHOICES, UNIT_CHOICES, FEE_RATE, WON_PER_MANWON,
  INITIAL_MIN_MANWON, INITIAL_MAX_MANWON, BASE_WEIGHT_MIN, BASE_WEIGHT_MAX,
} from '../data/numbers.js';
import { load, save, timeToStr, fmtEok, fmtPct, fmtManwon, fmtInt, signClass, CHART_BASE } from './common.js';

const LWC = window.LightweightCharts;
const WAYS = [
  { key: 'rule', name: '이 규칙', color: '#257de0' },
  { key: 'hold80', name: '기본 비중 들고 있기', color: '#f47230' },
  { key: 'hold100', name: '100% 들고 있기', color: '#00b894' },
];
const BUY_COLOR = '#c62828';
const SELL_COLOR = '#1f5fbf';

export function createSim(kospiRows, levRows) {
  const state = load('sim', SIM_DEFAULTS);
  const days = alignDays(kospiRows, levRows);
  const els = {
    initial: document.getElementById('in-initial'),
    base: document.getElementById('in-base'),
    step: document.getElementById('in-step'),
    unit: document.getElementById('in-unit'),
    period: document.getElementById('sim-period'),
    summary: document.querySelector('#sim-summary tbody'),
    trades: document.querySelector('#sim-trades tbody'),
    chart: document.getElementById('chart-equity'),
    hover: document.getElementById('sim-hover'),
    legend: document.getElementById('sim-legend'),
  };

  const chart = LWC.createChart(els.chart, {
    ...CHART_BASE,
    localization: { ...CHART_BASE.localization, priceFormatter: (v) => `${(v / 1e8).toFixed(2)}억` },
    // 10년 동안 몇 배로 불어나는 자산이라 로그 눈금으로 그려야 앞쪽 해의 오르내림도 보인다.
    rightPriceScale: { ...CHART_BASE.rightPriceScale, mode: LWC.PriceScaleMode.Logarithmic },
  });
  const series = {};
  for (const w of WAYS) {
    series[w.key] = chart.addLineSeries({ color: w.color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  }

  let results = null;

  function segButtons(box, choices, key) {
    box.innerHTML = '';
    for (const c of choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${c}%`;
      b.setAttribute('aria-pressed', String(state[key] === c));
      b.addEventListener('click', () => {
        state[key] = c;
        for (const x of box.children) x.setAttribute('aria-pressed', String(x === b));
        commit();
      });
      box.appendChild(b);
    }
  }

  function readNumber(input, min, max) {
    const v = Number(input.value);
    const okv = input.value !== '' && Number.isFinite(v) && v >= min && v <= max;
    input.classList.toggle('is-bad', !okv);
    return okv ? v : null;
  }

  els.initial.min = INITIAL_MIN_MANWON;
  els.initial.max = INITIAL_MAX_MANWON;
  els.base.min = BASE_WEIGHT_MIN;
  els.base.max = BASE_WEIGHT_MAX;
  els.initial.value = state.initialManwon;
  els.base.value = state.baseWeightPct;
  els.initial.title = `${fmtInt(INITIAL_MIN_MANWON)} ~ ${fmtInt(INITIAL_MAX_MANWON)}만 원`;
  els.base.title = `${BASE_WEIGHT_MIN} ~ ${BASE_WEIGHT_MAX}%`;
  els.initial.addEventListener('input', () => {
    const v = readNumber(els.initial, INITIAL_MIN_MANWON, INITIAL_MAX_MANWON);
    if (v != null) { state.initialManwon = v; commit(); }
  });
  els.base.addEventListener('input', () => {
    const v = readNumber(els.base, BASE_WEIGHT_MIN, BASE_WEIGHT_MAX);
    if (v != null) { state.baseWeightPct = v; commit(); }
  });
  segButtons(els.step, STEP_CHOICES, 'stepPct');
  segButtons(els.unit, UNIT_CHOICES, 'unitPct');

  function commit() {
    save('sim', state);
    run();
  }

  function run() {
    const initial = state.initialManwon * WON_PER_MANWON;
    const common = { initial, step: state.stepPct / 100, unit: state.unitPct / 100, fee: FEE_RATE };
    results = {
      rule: simulate(days, { ...common, baseWeight: state.baseWeightPct / 100 }),
      hold80: simulate(days, { ...common, baseWeight: state.baseWeightPct / 100, ladder: false }),
      hold100: simulate(days, { ...common, baseWeight: 1, ladder: false }),
    };
    WAYS[1].name = `${state.baseWeightPct}% 들고 있기`;
    renderSummary();
    renderChart();
    renderTrades();
    renderHover(null);
  }

  function renderSummary() {
    const s0 = results.rule.summary;
    els.period.textContent = s0.start ? `${s0.start} ~ ${s0.end} · 매매는 KODEX 레버리지 종가 · 비용 ${(FEE_RATE * 100).toFixed(3)}%` : '자료 없음';
    els.legend.innerHTML = `<span style="color:${BUY_COLOR}">▲ 매수</span><span style="color:${SELL_COLOR}">▼ 매도</span>`;
    els.summary.innerHTML = '';
    for (const w of WAYS) {
      const s = results[w.key].summary;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="sw" style="background:${w.color}"></span></td>`
        + `<td class="num"></td><td class="num ${signClass(s.totalReturn)}"></td><td class="num ${signClass(s.cagr)}"></td><td class="num down"></td><td class="num"></td>`;
      const td = tr.children;
      td[0].append(w.name);
      td[1].textContent = fmtEok(s.final);
      td[2].textContent = fmtPct(s.totalReturn);
      td[3].textContent = fmtPct(s.cagr);
      td[4].textContent = fmtPct(s.mdd);
      td[5].textContent = `${s.tradeCount}회`;
      els.summary.appendChild(tr);
    }
  }

  function renderChart() {
    for (const w of WAYS) {
      series[w.key].setData(results[w.key].daily.map(([d, v]) => ({ time: d, value: v })));
    }
    const markers = results.rule.trades.filter((t) => t.qty !== 0 && t.label !== '시작').map((t) => ({
      time: t.date,
      position: t.qty > 0 ? 'belowBar' : 'aboveBar',
      color: t.qty > 0 ? BUY_COLOR : SELL_COLOR,
      shape: t.qty > 0 ? 'arrowUp' : 'arrowDown',
    }));
    series.rule.setMarkers(markers);
    chart.timeScale().fitContent();
  }

  function renderTrades() {
    els.trades.innerHTML = '';
    for (const t of results.rule.trades) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td></td><td></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td>';
      const td = tr.children;
      td[0].textContent = t.date;
      td[1].textContent = t.label;
      td[2].textContent = t.kospi.toFixed(2);
      td[3].textContent = fmtPct(t.drawdown);
      td[4].textContent = t.qty === 0 ? '-' : fmtManwon(t.amount);
      td[4].className = 'num ' + (t.qty > 0 ? 'buy' : t.qty < 0 ? 'sell' : '');
      td[5].textContent = `${Math.round(t.weight * 100)}%`;
      td[6].textContent = fmtEok(t.total);
      els.trades.appendChild(tr);
    }
  }

  function renderHover(d) {
    const daily = results.rule.daily;
    if (!daily.length) { els.hover.textContent = ''; return; }
    const at = d || daily[daily.length - 1][0];
    const parts = [at];
    for (const w of WAYS) {
      const row = results[w.key].daily.find((x) => x[0] === at);
      if (row) parts.push(`${w.name} ${fmtEok(row[1])}`);
    }
    els.hover.textContent = parts.join(' · ');
  }
  chart.subscribeCrosshairMove((p) => renderHover(p && p.time ? timeToStr(p.time) : null));

  run();
}
