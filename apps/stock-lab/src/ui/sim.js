// 시뮬레이터 화면(기획서 3절).
import { simulate, alignDays, sliceDays } from '../core/simulate.js';
import {
  SIM_DEFAULTS, STEP_CHOICES, UNIT_CHOICES, FEE_RATE, WON_PER_MANWON,
  INITIAL_MIN_MANWON, INITIAL_MAX_MANWON, BASE_WEIGHT_MIN, BASE_WEIGHT_MAX,
} from '../data/numbers.js';
import { load, save, timeToStr, fmtEok, fmtPct, fmtManwon, fmtInt, signClass, CHART_BASE } from './common.js';
import { GAME, T, dayLabel, chartSkin, LINE_TYPE, merge, toIndex } from './skin.js';

const LWC = window.LightweightCharts;
const WAYS = [
  { key: 'rule', name: T.wayRule, color: '#257de0' },
  { key: 'hold80', name: '', color: '#f47230' },
  { key: 'hold100', name: T.wayHold100, color: '#00b894' },
];
// 금액 표기: 게임 모드는 원 대신 골드
const money = (won) => fmtEok(won).replace('원', T.money);
const manwon = (won) => fmtManwon(won).replace('만 원', T.manwon);
const BUY_COLOR = '#c62828';
const SELL_COLOR = '#1f5fbf';

export function createSim(kospiRows, levRows) {
  const state = load('sim', SIM_DEFAULTS);
  const allDays = alignDays(kospiRows, levRows);
  const first = allDays.length ? allDays[0][0] : '';
  const last = allDays.length ? allDays[allDays.length - 1][0] : '';
  state.ways = { ...SIM_DEFAULTS.ways, ...(state.ways || {}) };
  let days = [];
  // 게임 모드 D+n 은 기간 시작일을 D+0 으로 센다.
  const simLabel = (d) => dayLabel(d, days.length ? days[0][0] : null);
  const els = {
    initial: document.getElementById('in-initial'),
    base: document.getElementById('in-base'),
    step: document.getElementById('in-step'),
    unit: document.getElementById('in-unit'),
    start: document.getElementById('in-start'),
    end: document.getElementById('in-end'),
    period: document.getElementById('sim-period'),
    summary: document.querySelector('#sim-summary tbody'),
    trades: document.querySelector('#sim-trades tbody'),
    chart: document.getElementById('chart-equity'),
    hover: document.getElementById('sim-hover'),
    legend: document.getElementById('sim-legend'),
  };

  const chart = LWC.createChart(els.chart, merge(merge(CHART_BASE, {
    localization: { priceFormatter: (v) => `${(v / 1e8).toFixed(2)}억` },
    // 10년 동안 몇 배로 불어나는 자산이라 로그 눈금으로 그려야 앞쪽 해의 오르내림도 보인다.
    rightPriceScale: { mode: LWC.PriceScaleMode.Logarithmic },
  }), chartSkin(LWC, timeToStr, simLabel)));
  const series = {};
  for (const w of WAYS) {
    series[w.key] = chart.addLineSeries({
      color: w.color, lineWidth: 2, lineType: LINE_TYPE(LWC), priceLineVisible: false, lastValueVisible: false,
      autoscaleInfoProvider: () => sharedScale(),
    });
  }

  // 낱말 · 절 제목
  const setText = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  setText('lb-initial', T.inInitial); setText('lb-initial-unit', T.inInitialUnit);
  setText('lb-base', T.inBase); setText('lb-step', T.inStep); setText('lb-unit', T.inUnit); setText('lb-range', T.inRange);
  setText('sec-summary', T.secSummary); setText('sec-chart', T.secChart); setText('sec-trades', T.secTrades);
  document.querySelectorAll('#sim-summary thead th').forEach((th, i) => { th.textContent = T.sumHead[i]; });
  document.querySelectorAll('#sim-trades thead th').forEach((th, i) => { th.textContent = T.tradeHead[i]; });
  let k0 = 1;

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
  els.initial.title = `${fmtInt(INITIAL_MIN_MANWON)} ~ ${fmtInt(INITIAL_MAX_MANWON)}${T.manwon}`;
  els.base.title = `${BASE_WEIGHT_MIN} ~ ${BASE_WEIGHT_MAX}%`;
  els.initial.addEventListener('input', () => {
    const v = readNumber(els.initial, INITIAL_MIN_MANWON, INITIAL_MAX_MANWON);
    if (v != null) { state.initialManwon = v; commit(); }
  });
  els.base.addEventListener('input', () => {
    const v = readNumber(els.base, BASE_WEIGHT_MIN, BASE_WEIGHT_MAX);
    if (v != null) { state.baseWeightPct = v; commit(); }
  });
  // 기간: 받은 자료 안에서만, 시작이 끝보다 앞이어야 한다. 끝 빈 값 = 자료 마지막 날.
  for (const e of [els.start, els.end]) { e.min = first; e.max = last; }
  els.start.value = state.startDate || first;
  els.end.value = state.endDate || last;
  function readRange() {
    const a = els.start.value;
    const b = els.end.value;
    const okAB = !!a && !!b && a >= first && b <= last && a < b;
    els.start.classList.toggle('is-bad', !okAB);
    els.end.classList.toggle('is-bad', !okAB);
    if (!okAB) return;
    state.startDate = a;
    state.endDate = b === last ? '' : b;
    commit();
  }
  els.start.addEventListener('change', readRange);
  els.end.addEventListener('change', readRange);

  segButtons(els.step, STEP_CHOICES, 'stepPct');
  segButtons(els.unit, UNIT_CHOICES, 'unitPct');

  function commit() {
    save('sim', state);
    run();
  }

  function run() {
    days = sliceDays(allDays, state.startDate, state.endDate);
    k0 = days.length ? days[0][1] : 1;
    const initial = state.initialManwon * WON_PER_MANWON;
    const common = { initial, step: state.stepPct / 100, unit: state.unitPct / 100, fee: FEE_RATE };
    results = {
      rule: simulate(days, { ...common, baseWeight: state.baseWeightPct / 100 }),
      hold80: simulate(days, { ...common, baseWeight: state.baseWeightPct / 100, ladder: false }),
      hold100: simulate(days, { ...common, baseWeight: 1, ladder: false }),
    };
    WAYS[1].name = T.wayHold(state.baseWeightPct);
    renderSummary();
    renderChart();
    renderTrades();
    renderHover(null);
  }

  function renderSummary() {
    const s0 = results.rule.summary;
    els.period.textContent = s0.start ? T.period(simLabel(s0.start), simLabel(s0.end), (FEE_RATE * 100).toFixed(3)) : '자료 없음';
    els.legend.innerHTML = `<span style="color:${BUY_COLOR}">▲ ${T.buy}</span><span style="color:${SELL_COLOR}">▼ ${T.sell}</span>`;
    els.summary.innerHTML = '';
    for (const w of WAYS) {
      const s = results[w.key].summary;
      const tr = document.createElement('tr');
      const on = state.ways[w.key] !== false;
      tr.classList.toggle('is-off', !on);
      tr.innerHTML = `<td><input type="checkbox" class="way-on"><span class="sw" style="background:${w.color}"></span></td>`
        + `<td class="num"></td><td class="num ${signClass(s.totalReturn)}"></td><td class="num ${signClass(s.cagr)}"></td><td class="num down"></td><td class="num"></td>`;
      const td = tr.children;
      const box = td[0].querySelector('input');
      box.checked = on;
      box.setAttribute('aria-label', w.name);
      box.addEventListener('change', () => {
        state.ways[w.key] = box.checked;
        save('sim', state);
        tr.classList.toggle('is-off', !box.checked);
        applyWays();
        renderHover(null);
      });
      td[0].append(w.name);
      td[1].textContent = money(s.final);
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
    markers = results.rule.trades.filter((t) => t.qty !== 0 && t.label !== '시작').map((t) => ({
      time: t.date,
      position: t.qty > 0 ? 'belowBar' : 'aboveBar',
      color: t.qty > 0 ? BUY_COLOR : SELL_COLOR,
      shape: t.qty > 0 ? 'arrowUp' : 'arrowDown',
    }));
    // 게임 모드 눈금(D+n)은 기간 시작일 기준이라, 기간이 바뀌면 차트가 기억한 옛 눈금 글자를 새로 만들게 한다.
    if (GAME) chart.applyOptions(chartSkin(LWC, timeToStr, simLabel));
    applyWays();
    chart.timeScale().fitContent();
  }

  // 끈 방식은 선을 투명하게만 감춘다. 선을 빼면(visible: false) 세로축 범위 계산에서도 빠져 눈금이 바뀌므로,
  // 셋 모두 늘 세로축 계산에 남겨 켜고 꺼도 세로축이 그대로 있게 한다.
  let markers = [];
  // 세로축 범위 = 보이는 구간 안 세 방식 값 전체의 최저 ~ 최고. 켜고 끄기와 상관없이 같은 범위.
  function sharedScale() {
    if (!results) return null;
    const vr = chart.timeScale().getVisibleRange();
    const a = vr ? timeToStr(vr.from) : null;
    const b = vr ? timeToStr(vr.to) : null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const w of WAYS) {
      for (const [d, v] of results[w.key].daily) {
        if ((a && d < a) || (b && d > b)) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    return Number.isFinite(lo) ? { priceRange: { minValue: lo, maxValue: hi } } : null;
  }
  function applyWays() {
    for (const w of WAYS) {
      const on = state.ways[w.key] !== false;
      series[w.key].applyOptions({ color: on ? w.color : 'transparent', crosshairMarkerVisible: on });
    }
    series.rule.setMarkers(state.ways.rule !== false ? markers : []);
  }

  function renderTrades() {
    els.trades.innerHTML = '';
    for (const t of results.rule.trades) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td></td><td></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td>';
      const td = tr.children;
      td[0].textContent = simLabel(t.date);
      td[1].textContent = T.stepLabel(t.label);
      // 게임 모드는 실제 코스피 값 대신 첫날=100 지수
      td[2].textContent = GAME ? toIndex(t.kospi, k0).toFixed(1) : t.kospi.toFixed(2);
      td[3].textContent = fmtPct(t.drawdown);
      td[4].textContent = t.qty === 0 ? '-' : manwon(t.amount);
      td[4].className = 'num ' + (t.qty > 0 ? 'buy' : t.qty < 0 ? 'sell' : '');
      td[5].textContent = `${Math.round(t.weight * 100)}%`;
      td[6].textContent = money(t.total);
      els.trades.appendChild(tr);
    }
  }

  function renderHover(d) {
    const daily = results.rule.daily;
    if (!daily.length) { els.hover.textContent = ''; return; }
    const at = d || daily[daily.length - 1][0];
    const parts = [simLabel(at)];
    for (const w of WAYS) {
      if (state.ways[w.key] === false) continue;
      const row = results[w.key].daily.find((x) => x[0] === at);
      if (row) parts.push(`${w.name} ${money(row[1])}`);
    }
    els.hover.textContent = parts.join(' · ');
  }
  chart.subscribeCrosshairMove((p) => renderHover(p && p.time ? timeToStr(p.time) : null));

  run();
}
