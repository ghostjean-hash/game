// 화면 공용 - 저장, 자료 읽기, 숫자 표기, 차트 날짜 변환.
const PREFIX = 'stocklab_';

export function load(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v ? { ...fallback, ...JSON.parse(v) } : { ...fallback };
  } catch { return { ...fallback }; }
}
export function save(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* 저장 못 해도 화면은 돈다 */ }
}

// 시세 파일 하나. 없으면(아직 받지 못한 시세) null.
export async function fetchSeries(id) {
  try {
    const res = await fetch(`./data/${id}.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const j = await res.json();
    return Array.isArray(j.rows) && j.rows.length ? j : null;
  } catch { return null; }
}

// 수집 기록(시세마다 마지막으로 받기에 성공한 날)
export async function fetchMeta() {
  try {
    const res = await fetch('./data/_meta.json', { cache: 'no-cache' });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

// 차트가 돌려주는 시간(문자열 · 날짜 객체 · 초)을 'YYYY-MM-DD' 로
export function timeToStr(t) {
  if (t == null) return null;
  if (typeof t === 'string') return t;
  if (typeof t === 'number') return Number.isFinite(t) ? new Date(t * 1000).toISOString().slice(0, 10) : null;
  const p = (n) => String(n).padStart(2, '0');
  return `${t.year}-${p(t.month)}-${p(t.day)}`;
}

const nf0 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf4 = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

// 시세 값 표기. 금리는 % 둘째 자리, 1 아래 값(리플 등)은 넷째 자리.
export function fmtValue(v, unit) {
  if (v == null || !Number.isFinite(v)) return '-';
  if (unit === '%') return `${nf2.format(v)}%`;
  if (Math.abs(v) < 10) return nf4.format(v);
  if (Math.abs(v) < 1000) return nf2.format(v);
  return nf0.format(v);
}
export function fmtPct(r, digits = 1) {
  if (r == null || !Number.isFinite(r)) return '-';
  const s = (r * 100).toFixed(digits);
  return `${r > 0 ? '+' : ''}${s}%`;
}
export function fmtPp(d) {
  if (d == null || !Number.isFinite(d)) return '-';
  return `${d > 0 ? '+' : ''}${d.toFixed(2)}%p`;
}
export function fmtEok(won) {
  return `${nf2.format(won / 1e8)}억 원`;
}
export function fmtManwon(won) {
  const m = Math.round(won / 1e4);
  return `${m > 0 ? '+' : ''}${nf0.format(m)}만 원`;
}
export function fmtInt(v) { return nf0.format(v); }
export function signClass(r) { return r > 0 ? 'up' : r < 0 ? 'down' : ''; }

export function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
export function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const CHART_BASE = {
  autoSize: true,
  layout: { background: { color: '#ffffff' }, textColor: '#4a5263', fontSize: 12, fontFamily: 'ui-sans-serif, system-ui, "Noto Sans KR", "Malgun Gothic", sans-serif' },
  grid: { vertLines: { color: '#eef0f4' }, horzLines: { color: '#eef0f4' } },
  rightPriceScale: { borderColor: '#dfe3ea', minimumWidth: 72 },
  // 10년 일간(약 3,600 날짜)을 폰 폭에서도 한 화면에 담을 수 있게 점 간격 하한을 낮춘다.
  // 자료 밖 빈 구간으로 밀리지 않게 양 끝을 고정한다.
  timeScale: { borderColor: '#dfe3ea', minBarSpacing: 0.01, fixLeftEdge: true, fixRightEdge: true },
  localization: { locale: 'ko-KR', dateFormat: 'yyyy-MM-dd' },
  crosshair: { mode: 0 },
};
