// 비교 차트 화면(기획서 2절). 가격 시세는 위 칸에 보이는 구간 첫날 대비 등락률로, 금리는 아래 칸에 실제 % 로 그린다.
import { SERIES } from '../data/series.js';
import { COMPARE_INITIAL_YEARS, END_SNAP_BARS } from '../data/numbers.js';
import { resample, unionDates, fillForward, indexAtOrBefore, baseValue } from '../core/resample.js';
import { load, save, timeToStr, fmtValue, fmtPct, fmtPp, signClass, CHART_BASE } from './common.js';

const LWC = window.LightweightCharts;
const STATE_DEFAULT = { interval: 'day', off: {} };
const INITIAL_YEARS = COMPARE_INITIAL_YEARS;

export function createCompare(raw) {
  // raw: { id: rows } 받은 시세만
  const state = load('compare', STATE_DEFAULT);
  const list = SERIES.filter((s) => raw[s.id]);
  const priceList = list.filter((s) => s.kind === 'price');
  const rateList = list.filter((s) => s.kind === 'rate');
  const els = {
    list: document.getElementById('series-list'),
    price: document.getElementById('chart-price'),
    rate: document.getElementById('chart-rate'),
    hover: document.getElementById('hover-date'),
  };

  const priceChart = LWC.createChart(els.price, {
    ...CHART_BASE,
    rightPriceScale: { ...CHART_BASE.rightPriceScale, mode: LWC.PriceScaleMode.Percentage },
  });
  const rateChart = LWC.createChart(els.rate, {
    ...CHART_BASE,
    localization: { ...CHART_BASE.localization, priceFormatter: (v) => `${v.toFixed(2)}%` },
  });

  // 두 칸이 같은 날짜 칸을 쓰도록 모든 시세 날짜를 빈 점으로 깔아 둔다.
  const padPrice = priceChart.addLineSeries({ visible: false, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
  const padRate = rateChart.addLineSeries({ visible: false, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });

  const lines = {};
  for (const s of list) {
    const chart = s.kind === 'price' ? priceChart : rateChart;
    lines[s.id] = chart.addLineSeries({
      color: s.color,
      lineWidth: 2,
      lineStyle: s.dash ? LWC.LineStyle.Dashed : LWC.LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerRadius: 3,
      visible: !state.off[s.id],
      title: '',
    });
  }

  let data = {};
  let dates = [];

  function setInterval(interval, keepRange) {
    const prev = keepRange ? priceChart.timeScale().getVisibleRange() : null;
    const prevLr = keepRange ? priceChart.timeScale().getVisibleLogicalRange() : null;
    const prevAtEnd = !prevLr || prevLr.to >= dates.length - END_SNAP_BARS;
    const sampled = {};
    for (const s of list) sampled[s.id] = resample(raw[s.id], interval);
    dates = unionDates(Object.values(sampled));
    data = {};
    for (const s of list) data[s.id] = fillForward(sampled[s.id], dates);
    const pad = dates.map((d) => ({ time: d }));
    padPrice.setData(pad);
    padRate.setData(pad);
    for (const s of list) lines[s.id].setData(data[s.id].map(([d, v]) => ({ time: d, value: v })));
    // 구간은 날짜 칸 번호로 건다(날짜로 걸면 끝 막대가 빠질 때가 있다).
    // 바꾼 단위에 없는 날짜(주간 월요일 · 월간 1일)는 그 날짜나 그 앞의 실제 날짜 칸으로 붙인다.
    const lastIdx = dates.length - 1;
    const idxOf = (d) => Math.max(0, indexAtOrBefore(dates.map((x) => [x]), d));
    let fromIdx;
    let toIdx = lastIdx;
    if (prev) {
      fromIdx = idxOf(timeToStr(prev.from));
      // 맨 끝을 보고 있었으면 바꾼 뒤에도 맨 끝(최신 날짜)까지 보인다.
      if (!prevAtEnd) toIdx = idxOf(timeToStr(prev.to));
      if (toIdx <= fromIdx) toIdx = lastIdx;
    } else {
      const from = new Date(dates[lastIdx] + 'T00:00:00Z');
      from.setUTCFullYear(from.getUTCFullYear() - INITIAL_YEARS);
      fromIdx = idxOf(from.toISOString().slice(0, 10));
    }
    // 두 칸에 같은 구간을 함께 건다. 한 칸에만 걸면 다른 칸의 옛 구간이 맞물림으로 되돌아와 덮는다.
    const lr = { from: fromIdx, to: toIdx };
    priceChart.timeScale().setVisibleLogicalRange(lr);
    rateChart.timeScale().setVisibleLogicalRange(lr);
    renderValues(null);
  }

  // 위아래 칸 시간축 맞물리기
  let syncing = false;
  const link = (a, b) => a.timeScale().subscribeVisibleLogicalRangeChange((r) => {
    if (syncing || !r) return;
    syncing = true;
    b.timeScale().setVisibleLogicalRange(r);
    syncing = false;
    renderValues(hoverDate);
  });
  link(priceChart, rateChart);
  link(rateChart, priceChart);

  let hoverDate = null;
  const onMove = (src, other, otherPad) => (param) => {
    const d = param && param.time ? timeToStr(param.time) : null;
    hoverDate = d;
    if (d) other.setCrosshairPosition(0, d, otherPad); else other.clearCrosshairPosition();
    renderValues(d);
  };
  priceChart.subscribeCrosshairMove(onMove(priceChart, rateChart, padRate));
  rateChart.subscribeCrosshairMove(onMove(rateChart, priceChart, padPrice));

  // 목록
  const rows = {};
  function buildList() {
    els.list.innerHTML = '';
    const addGroup = (title, arr) => {
      if (!arr.length) return;
      const g = document.createElement('div');
      g.className = 'grp';
      g.textContent = title;
      els.list.appendChild(g);
      for (const s of arr) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'si';
        b.setAttribute('aria-pressed', String(!state.off[s.id]));
        const dash = s.dash ? ' stroke-dasharray="5 3"' : '';
        b.innerHTML = `<svg class="sw" viewBox="0 0 22 10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" stroke="${s.color}" stroke-width="3"${dash}/></svg>`
          + `<span class="nm"></span><span class="val"></span><span class="pct"></span>`;
        b.querySelector('.nm').textContent = s.name;
        b.title = `${s.name} (${s.unit})`;
        b.addEventListener('click', () => toggle(s));
        els.list.appendChild(b);
        rows[s.id] = b;
      }
    };
    addGroup('지수 · 종목 · 원자재 · 코인', priceList);
    addGroup('금리', rateList);
  }

  function toggle(s) {
    const on = !!state.off[s.id];
    if (on) delete state.off[s.id]; else state.off[s.id] = true;
    save('compare', state);
    lines[s.id].applyOptions({ visible: on });
    rows[s.id].setAttribute('aria-pressed', String(on));
    updateRatePanel();
    renderValues(hoverDate);
  }

  function updateRatePanel() {
    const anyRate = rateList.some((s) => !state.off[s.id]);
    els.rate.hidden = !anyRate;
  }

  // 목록 숫자: 가리킨 날짜(없으면 마지막 날) 값과 보이는 구간 첫날 대비 변화
  function renderValues(d) {
    if (!dates.length) return;
    const range = priceChart.timeScale().getVisibleRange();
    const from = range ? timeToStr(range.from) : dates[0];
    // 가리키지 않을 때는 보이는 구간 끝 값. 맨 끝까지 보고 있으면 최신 날짜(끝 막대가 반만 보여도 포함).
    const lr = priceChart.timeScale().getVisibleLogicalRange();
    const atEnd = !range || (lr && lr.to >= dates.length - END_SNAP_BARS);
    const at = d || (atEnd ? dates[dates.length - 1] : timeToStr(range.to));
    els.hover.textContent = `${from} 대비 · ${at}`;
    for (const s of list) {
      const r = data[s.id];
      const i = indexAtOrBefore(r, at);
      const v = i >= 0 ? r[i][1] : null;
      const base = baseValue(r, from);
      const row = rows[s.id];
      row.querySelector('.val').textContent = fmtValue(v, s.unit);
      const pct = row.querySelector('.pct');
      if (v == null || base == null) { pct.textContent = '-'; pct.className = 'pct'; continue; }
      if (s.kind === 'rate') {
        pct.textContent = fmtPp(v - base);
        pct.className = 'pct ' + signClass(v - base);
      } else {
        const ch = v / base - 1;
        pct.textContent = fmtPct(ch);
        pct.className = 'pct ' + signClass(ch);
      }
    }
  }

  buildList();
  updateRatePanel();
  setInterval(state.interval, false);

  return {
    getInterval: () => state.interval,
    setInterval: (iv) => {
      if (iv === state.interval) return;
      state.interval = iv;
      save('compare', state);
      setInterval(iv, true);
    },
  };
}
