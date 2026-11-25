// 주식 뷰 · 시뮬레이터 진입점. 탭 전환과 자료 읽기.
import { SERIES } from './data/series.js';
import { STALE_DAYS, LIST_MIN_PX, LIST_MAX_PX, LIST_DEFAULT_PX } from './data/numbers.js';
import { load, save, fetchSeries, fetchMeta, daysBetween, todayStr } from './ui/common.js';
import { createCompare } from './ui/compare.js';
import { createSim } from './ui/sim.js';

const ui = load('ui', { tab: 'compare', listHidden: false });

// 목록 폭 조절(경계 끌기, 저장)과 접기 · 펴기(저장)
window.initSidePanel?.({
  panel: '#series-list',
  handle: '#list-handle',
  storageKey: 'stocklab_list_w',
  cssVar: '--list-w',
  min: LIST_MIN_PX,
  max: LIST_MAX_PX,
  default: LIST_DEFAULT_PX,
  side: 'left',
});
const listToggle = document.getElementById('list-toggle');
function applyList() {
  document.getElementById('view-compare').classList.toggle('is-collapsed', ui.listHidden);
  listToggle.setAttribute('aria-pressed', String(!ui.listHidden));
  const label = ui.listHidden ? '목록 펴기' : '목록 접기';
  listToggle.setAttribute('aria-label', label);
  listToggle.title = label;
}
listToggle.addEventListener('click', () => {
  ui.listHidden = !ui.listHidden;
  save('ui', ui);
  applyList();
});
applyList();
const tabs = document.querySelectorAll('[data-tab]');
const intervalBox = document.getElementById('interval');
const views = { compare: document.getElementById('view-compare'), sim: document.getElementById('view-sim') };

// 수집 기록에 있는 시세만 부른다(아직 받지 못한 시세 파일을 불러 404 를 내지 않게). 기록이 없으면 전부 시도.
const meta = await fetchMeta();
const wanted = meta?.ok ? SERIES.filter((s) => meta.ok[s.id]) : SERIES;
const files = await Promise.all(wanted.map((s) => fetchSeries(s.id)));
const raw = {};
wanted.forEach((s, i) => { if (files[i]) raw[s.id] = files[i].rows; });

// 갱신 날짜: 받은 시세 가운데 가장 오래전에 받기에 성공한 날. 하나라도 오래되면 경고색.
let oldest = null;
for (const id of Object.keys(raw)) {
  const d = meta?.ok?.[id] || null;
  if (!d) { oldest = null; break; }
  if (!oldest || d < oldest) oldest = d;
}
const upEl = document.getElementById('updated');
if (oldest) {
  upEl.textContent = `갱신 ${oldest}`;
  upEl.classList.toggle('is-stale', daysBetween(oldest, todayStr()) > STALE_DAYS);
} else {
  upEl.textContent = Object.keys(raw).length ? '갱신 날짜 모름' : '자료 없음';
  upEl.classList.add('is-stale');
}

let compare = null;
let simReady = false;

function showTab(tab) {
  ui.tab = tab;
  save('ui', ui);
  for (const b of tabs) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  views.compare.hidden = tab !== 'compare';
  views.sim.hidden = tab !== 'sim';
  intervalBox.classList.toggle('is-off', tab !== 'compare');
  listToggle.classList.toggle('is-off', tab !== 'compare');
  if (tab === 'compare' && !compare) {
    compare = createCompare(raw);
    markInterval(compare.getInterval());
  }
  if (tab === 'sim' && !simReady && raw.kospi && raw.kodexlev) {
    createSim(raw.kospi, raw.kodexlev);
    simReady = true;
  }
}

function markInterval(iv) {
  for (const b of intervalBox.children) b.setAttribute('aria-pressed', String(b.dataset.interval === iv));
}

for (const b of tabs) b.addEventListener('click', () => showTab(b.dataset.tab));
for (const b of intervalBox.children) {
  b.addEventListener('click', () => {
    if (!compare) return;
    compare.setInterval(b.dataset.interval);
    markInterval(b.dataset.interval);
  });
}

showTab(ui.tab === 'sim' ? 'sim' : 'compare');
