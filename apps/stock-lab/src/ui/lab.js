// 전략 실험실 화면(기획서 3절 · 4절 · 5.6.4).
import { alignDays } from '../core/simulate.js';
import { prepare, rangeOf } from '../core/indicators.js';
import { yearRanges, continuousRange, runMany, yearTable } from '../core/stats.js';
import { PRESETS, GROUPS, COMPARE_GROUPS, ALWAYS_SHOWN, CHIPS, PARAM_META } from '../data/strategies.js';
import { LAB_DEFAULTS, LAB_YEARS, FEE_RATE, WON_PER_MANWON, INITIAL_MIN_MANWON, INITIAL_MAX_MANWON } from '../data/numbers.js';
import { load, save, timeToStr, fmtEok, fmtPct, fmtManwon, fmtInt, signClass, CHART_BASE } from './common.js';
import { GAME, T, dayLabel, chartSkin, LINE_TYPE, merge } from './skin.js';

const LWC = window.LightweightCharts;
const BUY_COLOR = '#c62828';
const SELL_COLOR = '#1f5fbf';
const money = (won) => fmtEok(won).replace('원', T.money);
const manwon = (won) => fmtManwon(won).replace('만 원', T.manwon);
const PERIODS = [...[...LAB_YEARS].reverse().map((y) => ({ key: y, name: y })), { key: 'cont', name: '2023 ~ 지금 이어서' }, { key: 'custom', name: '직접' }];
const EXECS = [{ key: true, name: '다음 날 종가' }, { key: false, name: '같은 날 종가' }];
const SUM_COLS = [
  { key: 'name', name: '전략' },
  { key: 'final', name: '최종 금액', num: true },
  { key: 'totalReturn', name: '총수익률', num: true },
  { key: 'mdd', name: '최대 낙폭', num: true },
  { key: 'recovery', name: '회복', num: true },
  { key: 'giveBackPct', name: '고점 이후 반납', num: true },
  { key: 'unrecovered', name: '미회복', num: true },
  { key: 'tradeCount', name: '매매', num: true },
  { key: 'vs80', name: '80:20 대비', num: true },
  { key: 'vs100', name: '100% 대비', num: true },
  { key: 'check', name: '확인 주기' },
];
// 수익률끼리의 차이(소수) → %p
const fmtPpDiff = (d) => (d == null || !Number.isFinite(d) ? '-' : `${d > 0 ? '+' : ''}${(d * 100).toFixed(1)}%p`);
const CUSTOM_COLORS =['#455a64', '#6d4c41', '#5e35b1', '#00897b', '#c0ca33', '#d81b60', '#3949ab', '#f4511e'];

export function createLab(raw, rawFull) {
  const toMap = (rows) => new Map((rows || []).map((r) => [r[0], r.slice(1)]));
  const ind = prepare(alignDays(raw.kospi, raw.kodexlev), { kospi: toMap(rawFull.kospi?.ohlc), lev: toMap(rawFull.kodexlev?.ohlc) });
  const first = ind.date[0];
  const last = ind.date[ind.n - 1];

  const lab = load('lab', { ...LAB_DEFAULTS, on: {}, selected: 'user-A', params: {}, custom: [], sortKey: 'totalReturn', sortDir: -1, showMiss: false, migrated: false });
  // 옛 시뮬레이터 저장값을 처음 한 번 옮긴다(기획서 5.6.4)
  if (!lab.migrated) {
    const sim = load('sim', {});
    if (sim.initialManwon) lab.initialManwon = sim.initialManwon;
    if (sim.baseWeightPct != null) lab.params.ladder = { base: sim.baseWeightPct / 100, step: (sim.stepPct ?? 10) / 100, unit: (sim.unitPct ?? 10) / 100 };
    lab.migrated = true;
    save('lab', lab);
  }

  const byId = () => Object.fromEntries(allItems().map((it) => [it.id, it]));
  function allItems() {
    const base = PRESETS.map((p) => ({ ...p, params: { ...p.params, ...(lab.params[p.id] || {}) }, defaults: p.params }));
    const P = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
    const cus = lab.custom.filter((c) => P[c.from]).map((c, n) => ({
      ...P[c.from], id: c.id, name: c.name, group: 'custom', srcGroup: P[c.from].group, color: CUSTOM_COLORS[(c.colorIdx ?? n) % CUSTOM_COLORS.length],
      params: { ...P[c.from].params, ...c.params }, defaults: P[c.from].params, custom: true, from: c.from,
    }));
    return [...base, ...cus];
  }
  const isOn = (it) => (lab.on[it.id] != null ? lab.on[it.id] : !!it.on);
  const cmpGroup = (it) => (it.custom ? it.srcGroup : it.group);
  const inGroup = (it) => lab.group === 'all' || ALWAYS_SHOWN.includes(it.id) || cmpGroup(it) === lab.group;

  const els = {
    list: document.getElementById('lab-list'),
    period: document.getElementById('lab-period'),
    start: document.getElementById('lab-start'),
    end: document.getElementById('lab-end'),
    initial: document.getElementById('lab-initial'),
    exec: document.getElementById('lab-exec'),
    group: document.getElementById('lab-group'),
    note: document.getElementById('lab-note'),
    sumHead: document.querySelector('#lab-summary thead'),
    sumBody: document.querySelector('#lab-summary tbody'),
    yrHead: document.querySelector('#lab-years thead'),
    yrBody: document.querySelector('#lab-years tbody'),
    chart: document.getElementById('lab-chart'),
    hover: document.getElementById('lab-hover'),
    legend: document.getElementById('lab-legend'),
    detail: document.getElementById('lab-detail'),
  };
  document.getElementById('lab-initial-unit').textContent = T.inInitialUnit;
  document.getElementById('lab-initial-lb').textContent = T.inInitial;
  document.getElementById('lab-h-sum').textContent = T.labSum;
  document.getElementById('lab-h-years').textContent = T.labYears;
  document.getElementById('lab-h-detail').textContent = T.labDetail;

  let range = null;
  let runs = {};
  let yRuns = {};
  let cRuns = {};
  const label = (d) => dayLabel(d, range ? ind.date[range[0]] : null);

  // ---- 차트 ----
  const chart = LWC.createChart(els.chart, merge(merge(CHART_BASE, {
    localization: { priceFormatter: (v) => `${(v / 1e8).toFixed(2)}억` },
    rightPriceScale: { mode: LWC.PriceScaleMode.Logarithmic },
  }), chartSkin(LWC, timeToStr, label)));
  const series = new Map();
  chart.subscribeCrosshairMove((p) => renderHover(p && p.time ? timeToStr(p.time) : null));

  // ---- 위 입력 ----
  function seg(box, choices, cur, onPick) {
    box.innerHTML = '';
    for (const c of choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.name;
      b.setAttribute('aria-pressed', String(cur() === c.key));
      b.addEventListener('click', () => {
        onPick(c.key);
        for (const x of box.children) x.setAttribute('aria-pressed', String(x === b));
        commit();
      });
      box.appendChild(b);
    }
  }
  seg(els.period, PERIODS, () => lab.period, (k) => { lab.period = k; });
  seg(els.exec, EXECS, () => lab.nextDay, (k) => { lab.nextDay = k; });
  seg(els.group, COMPARE_GROUPS, () => lab.group, (k) => { lab.group = k; });

  for (const e of [els.start, els.end]) { e.min = first; e.max = last; }
  els.start.value = lab.start || `${LAB_YEARS[LAB_YEARS.length - 1]}-01-02`;
  els.end.value = lab.end || last;
  function readRange() {
    const a = els.start.value;
    const b = els.end.value;
    const good = !!a && !!b && a >= first && b <= last && a < b;
    els.start.classList.toggle('is-bad', !good);
    els.end.classList.toggle('is-bad', !good);
    if (!good) return;
    lab.start = a;
    lab.end = b === last ? '' : b;
    if (lab.period !== 'custom') {
      lab.period = 'custom';
      for (const x of els.period.children) x.setAttribute('aria-pressed', String(x.textContent === '직접'));
    }
    commit();
  }
  els.start.addEventListener('change', readRange);
  els.end.addEventListener('change', readRange);

  els.initial.min = INITIAL_MIN_MANWON;
  els.initial.max = INITIAL_MAX_MANWON;
  els.initial.value = lab.initialManwon;
  els.initial.addEventListener('input', () => {
    const v = Number(els.initial.value);
    const good = els.initial.value !== '' && Number.isFinite(v) && v >= INITIAL_MIN_MANWON && v <= INITIAL_MAX_MANWON;
    els.initial.classList.toggle('is-bad', !good);
    if (good) { lab.initialManwon = v; commit(); }
  });

  function commit() { save('lab', lab); run(); }

  // ---- 계산 ----
  function periodRange() {
    if (lab.period === 'cont') return continuousRange(ind);
    if (lab.period === 'custom') return rangeOf(ind, els.start.value, els.end.value);
    return rangeOf(ind, `${lab.period}-01-01`, `${lab.period}-12-31`);
  }
  function run() {
    const items = allItems();
    const shown = items.filter((it) => isOn(it) && inGroup(it));
    // 고른 전략은 꺼져 있거나 묶음 밖이어도 상세 칸 매매 기록을 위해 계산한다
    const need = [...new Map([...shown, ...items.filter((it) => ALWAYS_SHOWN.includes(it.id) || it.id === lab.selected)].map((it) => [it.id, it])).values()];
    const list = need.map((it) => ({ id: it.id, preset: it, params: it.params }));
    const opt = { initial: lab.initialManwon * WON_PER_MANWON, fee: FEE_RATE, nextDay: lab.nextDay };
    range = periodRange();
    // 고른 기간은 모든 전략을 돌린다 - 세로축을 모든 전략 값 범위로 잡아 켜고 꺼도 눈금이 그대로 있게(기획서 5.6.4)
    runs = runMany(ind, range, items.map((it) => ({ id: it.id, preset: it, params: it.params })), opt);
    yRuns = {};
    for (const { key, range: r } of yearRanges(ind)) yRuns[key] = runMany(ind, r, list, opt);
    cRuns = runMany(ind, continuousRange(ind), list, opt);
    renderList();
    renderNote();
    renderSummary(shown);
    renderChart(shown);
    renderYears(shown);
    renderDetail();
    renderHover(null);
  }

  // ---- 왼쪽 목록 ----
  function renderList() {
    const items = allItems();
    els.list.innerHTML = '';
    for (const g of GROUPS) {
      const its = items.filter((it) => it.group === g.key);
      if (!its.length) continue;
      const h = document.createElement('div');
      h.className = 'grp';
      h.textContent = g.name;
      els.list.appendChild(h);
      for (const it of its) {
        const row = document.createElement('div');
        row.className = 'lab-item';
        row.classList.toggle('is-sel', it.id === lab.selected);
        row.classList.toggle('is-dim', !inGroup(it));
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = isOn(it);
        box.setAttribute('aria-label', `${it.name} 켜기`);
        box.addEventListener('change', () => { lab.on[it.id] = box.checked; commit(); });
        const sw = document.createElement('span');
        sw.className = 'sw';
        sw.style.background = it.color;
        const nm = document.createElement('button');
        nm.type = 'button';
        nm.className = 'nm';
        nm.textContent = it.name;
        nm.title = it.name;
        // 꺼진 전략을 골라도 상세 칸 매매 기록이 나오게 다시 계산한다
        nm.addEventListener('click', () => { lab.selected = it.id; save('lab', lab); run(); });
        row.append(box, sw, nm);
        els.list.appendChild(row);
      }
    }
  }

  function renderNote() {
    if (!range) { els.note.textContent = '고른 기간에 자료가 없습니다'; return; }
    const exec = lab.nextDay ? '다음 날 종가 체결' : '같은 날 종가 가정(판단에 쓴 종가로 바로 거래)';
    els.note.textContent = `${label(ind.date[range[0]])} ~ ${label(ind.date[range[1]])} · ${exec} · 비용 ${(FEE_RATE * 100).toFixed(3)}% · 시작 ${money(lab.initialManwon * WON_PER_MANWON)}`;
    els.note.classList.toggle('is-assume', !lab.nextDay);
  }

  // ---- 결과 표 ----
  function cellVal(it, s) {
    const h80 = runs.hold80?.summary.totalReturn;
    const h100 = runs.hold100?.summary.totalReturn;
    return {
      name: it.name, final: s.final, totalReturn: s.totalReturn, mdd: s.mdd,
      recovery: s.recovery == null ? Infinity : s.recovery, giveBackPct: s.giveBackPct, unrecovered: s.unrecovered,
      tradeCount: s.tradeCount, vs80: s.totalReturn - h80, vs100: s.totalReturn - h100, check: it.check,
    };
  }
  function renderSummary(shown) {
    els.sumHead.innerHTML = '';
    const tr = document.createElement('tr');
    for (const c of SUM_COLS) {
      const th = document.createElement('th');
      if (c.num) th.className = 'num';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sort';
      // 화살표 자리를 늘 남겨 둬 줄 세우기를 바꿔도 칸 폭이 흔들리지 않게 한다
      b.textContent = c.name;
      const ar = document.createElement('span');
      ar.className = 'arrow';
      ar.textContent = lab.sortKey === c.key && lab.sortDir > 0 ? ' ▲' : ' ▼';
      ar.style.visibility = lab.sortKey === c.key ? 'visible' : 'hidden';
      b.appendChild(ar);
      b.addEventListener('click', () => {
        if (lab.sortKey === c.key) lab.sortDir = -lab.sortDir;
        else { lab.sortKey = c.key; lab.sortDir = c.key === 'name' || c.key === 'check' ? 1 : -1; }
        save('lab', lab);
        renderSummary(shown);
      });
      th.appendChild(b);
      tr.appendChild(th);
    }
    els.sumHead.appendChild(tr);
    els.sumBody.innerHTML = '';
    const rows = shown.filter((it) => runs[it.id]).map((it) => ({ it, v: cellVal(it, runs[it.id].summary) }));
    rows.sort((a, b) => {
      const x = a.v[lab.sortKey];
      const y = b.v[lab.sortKey];
      if (typeof x === 'string') return lab.sortDir * x.localeCompare(y, 'ko');
      return lab.sortDir * (x - y);
    });
    for (const { it, v } of rows) {
      const s = runs[it.id].summary;
      const row = document.createElement('tr');
      row.classList.toggle('is-sel', it.id === lab.selected);
      row.innerHTML = `<td><span class="sw"></span></td><td class="num"></td><td class="num ${signClass(s.totalReturn)}"></td><td class="num down"></td>`
        + `<td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num ${signClass(v.vs80)}"></td><td class="num ${signClass(v.vs100)}"></td><td></td>`;
      const td = row.children;
      td[0].querySelector('.sw').style.background = it.color;
      td[0].append(it.name);
      td[1].textContent = money(s.final);
      td[2].textContent = fmtPct(s.totalReturn);
      td[3].textContent = fmtPct(s.mdd);
      td[4].textContent = s.recovery == null ? (s.sinceTrough === 0 ? '미회복(오늘이 바닥)' : `미회복(바닥 뒤 ${s.sinceTrough}일)`) : `${s.recovery}일`;
      td[5].textContent = fmtPct(s.giveBackPct);
      td[6].textContent = `${s.unrecovered}일`;
      td[7].textContent = `${s.tradeCount}회`;
      td[8].textContent = fmtPpDiff(v.vs80);
      td[9].textContent = fmtPpDiff(v.vs100);
      td[10].textContent = it.check;
      row.addEventListener('click', () => { lab.selected = it.id; save('lab', lab); renderList(); renderSummary(shown); renderChartMarkers(); renderDetail(); });
      els.sumBody.appendChild(row);
    }
  }

  // ---- 자산 곡선 ----
  function renderChart(shown) {
    const want = new Set(shown.filter((it) => runs[it.id]).map((it) => it.id));
    for (const [id, s] of series) if (!want.has(id)) { chart.removeSeries(s); series.delete(id); }
    const items = byId();
    for (const id of want) {
      let s = series.get(id);
      if (!s) {
        s = chart.addLineSeries({ lineWidth: 2, lineType: LINE_TYPE(LWC), priceLineVisible: false, lastValueVisible: false, autoscaleInfoProvider: () => sharedScale() });
        series.set(id, s);
      }
      s.applyOptions({ color: items[id].color, lineWidth: id === lab.selected ? 3 : 1.5 });
      s.setData(runs[id].daily.map(([d, v]) => ({ time: d, value: v })));
    }
    if (GAME) chart.applyOptions(chartSkin(LWC, timeToStr, label));
    renderChartMarkers();
    chart.timeScale().fitContent();
  }
  function renderChartMarkers() {
    const items = byId();
    for (const [id, s] of series) {
      s.applyOptions({ lineWidth: id === lab.selected ? 3 : 1.5 });
      const r = runs[id];
      const marks = id === lab.selected && r ? r.trades.filter((t) => t.status === 'filled' && t.qty !== 0 && t.reason !== '시작' && !t.reason.startsWith('시작')).map((t) => ({
        time: t.date, position: t.qty > 0 ? 'belowBar' : 'aboveBar', color: t.qty > 0 ? BUY_COLOR : SELL_COLOR, shape: t.qty > 0 ? 'arrowUp' : 'arrowDown',
      })) : [];
      // 같은 날 여러 줄이면 하나만
      const seen = new Set();
      s.setMarkers(marks.filter((m) => { const k = m.time + m.shape; if (seen.has(k)) return false; seen.add(k); return true; }));
      if (items[id]) s.applyOptions({ color: items[id].color });
    }
    els.legend.innerHTML = `<span style="color:${BUY_COLOR}">▲ 매수</span><span style="color:${SELL_COLOR}">▼ 매도</span>`;
  }
  // 세로축 범위 = 보이는 구간 안 모든 전략(켜고 끈 것 · 비교 묶음과 상관없이) 자산의 최저 ~ 최고
  function sharedScale() {
    const vr = chart.timeScale().getVisibleRange();
    const a = vr ? timeToStr(vr.from) : null;
    const b = vr ? timeToStr(vr.to) : null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const r of Object.values(runs)) {
      for (const [d, v] of r.daily) {
        if ((a && d < a) || (b && d > b)) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    return Number.isFinite(lo) ? { priceRange: { minValue: lo, maxValue: hi } } : null;
  }
  function renderHover(d) {
    const sel = runs[lab.selected];
    const ref = sel || runs.hold100;
    if (!ref || !ref.daily.length) { els.hover.textContent = ''; return; }
    const at = d || ref.daily[ref.daily.length - 1][0];
    const items = byId();
    const parts = [label(at)];
    for (const id of [lab.selected, 'hold80', 'hold100']) {
      const r = runs[id];
      if (!r || (id !== lab.selected && !series.has(id))) continue;
      const row = r.daily.find((x) => x[0] === at);
      if (row) parts.push(`${items[id]?.name} ${money(row[1])}`);
    }
    els.hover.textContent = [...new Set(parts)].join(' · ');
  }

  // ---- 연도별 표 ----
  function renderYears(shown) {
    const ids = shown.map((it) => it.id).filter((id) => Object.values(yRuns).some((y) => y[id]));
    const years = Object.keys(yRuns);
    els.yrHead.innerHTML = `<tr><th>전략</th>${years.map((y) => `<th class="num">${y}</th>`).join('')}<th class="num">평균</th><th class="num">80:20 이긴 해</th><th class="num">100% 이긴 해</th><th class="num">평균 순위</th><th class="num">이어서 수익</th><th class="num">이어서 낙폭</th><th class="num">이어서 반납</th></tr>`;
    els.yrBody.innerHTML = '';
    const items = byId();
    const rows = yearTable(yRuns, cRuns, ids).sort((a, b) => (a.avgRank ?? 99) - (b.avgRank ?? 99));
    for (const r of rows) {
      const it = items[r.id];
      const tr = document.createElement('tr');
      tr.classList.toggle('is-sel', r.id === lab.selected);
      const cells = r.cells.map((c) => (c ? `<td class="num"><span class="${signClass(c.ret)}">${fmtPct(c.ret)}</span><br><span class="sub">${fmtPct(c.mdd)}</span></td>` : '<td class="num">-</td>')).join('');
      tr.innerHTML = `<td><span class="sw" style="background:${it.color}"></span></td>${cells}<td class="num ${signClass(r.avgRet)}">${fmtPct(r.avgRet)}</td>`
        + `<td class="num">${r.win80} / ${years.length}</td><td class="num">${r.win100} / ${years.length}</td><td class="num">${r.avgRank == null ? '-' : r.avgRank.toFixed(1)}</td>`
        + `<td class="num ${signClass(r.cont?.totalReturn)}">${fmtPct(r.cont?.totalReturn)}</td><td class="num down">${fmtPct(r.cont?.mdd)}</td><td class="num">${fmtPct(r.cont?.giveBackPct)}</td>`;
      tr.children[0].append(it.name);
      tr.addEventListener('click', () => { lab.selected = r.id; save('lab', lab); run(); });
      els.yrBody.appendChild(tr);
    }
  }

  // ---- 고른 전략 상세 ----
  function setParam(it, key, val) {
    if (it.custom) {
      const c = lab.custom.find((x) => x.id === it.id);
      c.params = { ...c.params, [key]: val };
    } else {
      lab.params[it.id] = { ...(lab.params[it.id] || {}), [key]: val };
    }
    commit();
  }
  function renderDetail() {
    const items = byId();
    const it = items[lab.selected] || items['user-A'];
    const d = els.detail;
    d.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'lab-dhead';
    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.background = it.color;
    head.appendChild(sw);
    if (it.custom) {
      const nm = document.createElement('input');
      nm.type = 'text';
      nm.className = 'lab-name';
      nm.value = it.name;
      nm.setAttribute('aria-label', '전략 이름');
      nm.addEventListener('change', () => { const c = lab.custom.find((x) => x.id === it.id); c.name = nm.value.trim() || c.name; commit(); });
      head.appendChild(nm);
    } else {
      const nm = document.createElement('strong');
      nm.textContent = it.name;
      head.appendChild(nm);
    }
    for (const ch of [...(it.chips || []), ...(it.custom ? ['exp'] : [])].filter((v, i, a) => a.indexOf(v) === i)) {
      const c = document.createElement('span');
      c.className = `chip ${CHIPS[ch].cls}`;
      c.textContent = CHIPS[ch].label;
      head.appendChild(c);
    }
    const btns = document.createElement('span');
    btns.className = 'lab-btns';
    const mkBtn = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = txt; b.addEventListener('click', fn); btns.appendChild(b); return b; };
    mkBtn('복제', () => {
      // 번호 · 색은 만든 순서로 한 번 정해 지워도 다른 줄이 바뀌지 않게 한다
      lab.customSeq = (lab.customSeq || lab.custom.length) + 1;
      const n = lab.customSeq;
      const id = `c${Date.now().toString(36)}`;
      lab.custom.push({ id, from: it.custom ? it.from : it.id, name: `${it.name} 복제 ${n}`, params: { ...it.params }, colorIdx: n - 1 });
      lab.on[id] = true;
      lab.selected = id;
      commit();
    });
    mkBtn('기본값으로', () => {
      if (it.custom) { const c = lab.custom.find((x) => x.id === it.id); c.params = {}; } else delete lab.params[it.id];
      commit();
    });
    if (it.custom) mkBtn('지우기', () => { lab.custom = lab.custom.filter((x) => x.id !== it.id); delete lab.on[it.id]; lab.selected = it.from; commit(); });
    head.appendChild(btns);
    d.appendChild(head);

    const desc = document.createElement('p');
    desc.className = 'lab-desc';
    desc.textContent = it.desc;
    d.appendChild(desc);
    const meta = document.createElement('div');
    meta.className = 'lab-meta';
    const lines = [['확인 주기', it.check]];
    if (it.src) lines.push(['출처', it.src.who, it.src.url]);
    if (it.orig) lines.push(['원래 대상', it.orig]);
    if (it.changed) lines.push(['이번에 바꾼 것', it.changed]);
    for (const [k, v, url] of lines) {
      const row = document.createElement('div');
      const b = document.createElement('b');
      b.textContent = k;
      row.appendChild(b);
      if (url) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = v; row.appendChild(a); }
      else row.append(v);
      meta.appendChild(row);
    }
    d.appendChild(meta);

    // 수치 칸
    const grid = document.createElement('div');
    grid.className = 'lab-params';
    for (const key of Object.keys(it.defaults)) {
      const pm = PARAM_META[key];
      if (!pm) continue;
      const f = document.createElement('label');
      f.className = 'field';
      const lb = document.createElement('span');
      lb.textContent = pm.label;
      f.appendChild(lb);
      const changed = it.params[key] !== it.defaults[key];
      if (pm.unit === 'choice') {
        const sel = document.createElement('select');
        for (const [v, name] of pm.choices) {
          const o = document.createElement('option');
          o.value = v;
          o.textContent = name;
          sel.appendChild(o);
        }
        sel.value = it.params[key];
        sel.classList.toggle('is-changed', changed);
        sel.addEventListener('change', () => setParam(it, key, sel.value));
        f.appendChild(sel);
      } else {
        const wrap = document.createElement('span');
        wrap.className = 'input-unit';
        const inp = document.createElement('input');
        inp.type = 'number';
        const scale = pm.unit === '%' ? 100 : 1;
        inp.step = String(Math.round(pm.step * scale * 1000) / 1000);
        inp.min = String(pm.min * scale);
        inp.max = String(pm.max * scale);
        inp.value = String(Math.round(it.params[key] * scale * 1000) / 1000);
        inp.classList.toggle('is-changed', changed);
        inp.addEventListener('change', () => {
          const v = Number(inp.value) / scale;
          const good = inp.value !== '' && Number.isFinite(v) && v >= pm.min - 1e-9 && v <= pm.max + 1e-9 && (!pm.int || Number.isInteger(v));
          inp.classList.toggle('is-bad', !good);
          if (good) setParam(it, key, v);
        });
        wrap.appendChild(inp);
        const u = document.createElement('span');
        u.textContent = pm.unit;
        wrap.appendChild(u);
        f.appendChild(wrap);
      }
      grid.appendChild(f);
    }
    d.appendChild(grid);

    // 매매 기록
    const r = runs[it.id];
    const bar = document.createElement('div');
    bar.className = 'lab-tbar';
    const t = document.createElement('b');
    t.textContent = r ? `매매 기록 ${r.summary.tradeCount}회` : '매매 기록 - 목록에서 켜면 계산합니다';
    bar.appendChild(t);
    const miss = document.createElement('label');
    miss.className = 'lab-miss';
    const mb = document.createElement('input');
    mb.type = 'checkbox';
    mb.checked = !!lab.showMiss;
    mb.addEventListener('change', () => { lab.showMiss = mb.checked; save('lab', lab); renderDetail(); });
    miss.append(mb, '미체결 · 알림 줄도 보기');
    bar.appendChild(miss);
    d.appendChild(bar);
    const wrap = document.createElement('div');
    wrap.className = 'trades-wrap';
    const tb = document.createElement('table');
    tb.className = 'trades';
    tb.innerHTML = '<thead><tr><th>날짜</th><th>이유</th><th class="num">코스피</th><th class="num">주식 수</th><th class="num">금액</th><th class="num">주식 비중</th><th class="num">현금</th><th class="num">총자산</th></tr></thead><tbody></tbody>';
    const body = tb.querySelector('tbody');
    if (r) {
      for (const x of r.trades) {
        if (!lab.showMiss && (x.status !== 'filled' || x.qty === 0)) continue;
        const row = document.createElement('tr');
        row.classList.toggle('is-miss', x.status !== 'filled');
        row.innerHTML = '<td></td><td></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td>';
        const td = row.children;
        td[0].textContent = label(x.date);
        td[1].textContent = x.reason;
        td[2].textContent = x.kospi.toFixed(2);
        td[3].textContent = x.qty === 0 ? '-' : `${x.qty > 0 ? '+' : ''}${fmtInt(x.qty)}`;
        td[3].className = `num ${x.qty > 0 ? 'buy' : x.qty < 0 ? 'sell' : ''}`;
        td[4].textContent = x.qty === 0 ? '-' : manwon(x.amount);
        td[5].textContent = `${Math.round(x.weight * 100)}%`;
        td[6].textContent = money(x.cash);
        td[7].textContent = money(x.total);
        body.appendChild(row);
      }
    }
    wrap.appendChild(tb);
    d.appendChild(wrap);
  }

  run();
}
