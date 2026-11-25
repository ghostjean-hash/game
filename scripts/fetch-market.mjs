// 주식 뷰 · 시뮬레이터(apps/stock-lab) 시세 수집.
// 매번 최근 10년치를 통째로 다시 받아 덮어쓴다. 수정 종가는 배당 · 분할 때 과거 값까지 바뀌므로 덧붙이기를 하지 않는다.
// 하나가 실패해도 나머지는 저장하고, 끝에 실패 목록을 출력한다.
// 사용: node scripts/fetch-market.mjs   (ECOS_API_KEY 환경변수가 있으면 국고채 5년도 받는다)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'apps/stock-lab/data');
const { SERIES } = await import(pathToFileURL(path.join(ROOT, 'apps/stock-lab/src/data/series.js')).href);

const YEARS_BACK = 10;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const ymd = (d) => d.toISOString().slice(0, 10);
const round = (v) => Math.round(v * 1e6) / 1e6;

async function fetchYahoo(symbol, from) {
  const p1 = Math.floor(new Date(from + 'T00:00:00Z').getTime() / 1000);
  const p2 = Math.floor(Date.now() / 1000) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error('결과 없음 ' + JSON.stringify(j?.chart?.error || {}));
  const ts = r.timestamp || [];
  const gmtoff = r.meta?.gmtoffset || 0;
  const adj = r.indicators?.adjclose?.[0]?.adjclose;
  const q = r.indicators?.quote?.[0] || {};
  const close = q.close || [];
  const vals = adj && adj.length === ts.length ? adj : close;
  const rows = [];
  // 시가 · 고가 · 저가 · 종가(수정 전 원래 가격). 네 값이 다 있는 날만.
  const ohlc = [];
  const fin = (v) => v !== null && v !== undefined && Number.isFinite(v);
  for (let i = 0; i < ts.length; i++) {
    const d = ymd(new Date((ts[i] + gmtoff) * 1000));
    const v = vals[i];
    if (fin(v)) rows.push([d, round(v)]);
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = close[i];
    if (fin(o) && fin(h) && fin(l) && fin(c)) ohlc.push([d, round(o), round(h), round(l), round(c)]);
  }
  // 장이 아직 열려 있으면 오늘 줄은 종가가 아니므로 뺀다(코인은 하루가 끝나지 않은 줄).
  const end = r.meta?.currentTradingPeriod?.regular?.end;
  if (end && Date.now() / 1000 < end) {
    const endDay = ymd(new Date((end + gmtoff) * 1000));
    if (rows.length && rows[rows.length - 1][0] >= endDay) rows.pop();
    if (ohlc.length && ohlc[ohlc.length - 1][0] >= endDay) ohlc.pop();
  }
  return { rows, ohlc };
}

// 시가 · 고가 · 저가 · 종가를 함께 저장하는 시세(전략 실험실 장중 자료, 기획서 3.11)
const OHLC_IDS = ['kospi', 'kodexlev'];

async function fetchFred(id, from) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${from}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const rows = [];
  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    const [d, v] = line.split(',');
    const n = Number(v);
    if (!d || v === '.' || v === '' || !Number.isFinite(n)) continue;
    if (d >= from) rows.push([d, n]);
  }
  return rows;
}

async function fetchEcos(code, from) {
  const key = process.env.ECOS_API_KEY;
  if (!key) return null; // 키가 없으면 건너뛴다
  const [stat, item] = code.split('/');
  const a = from.replaceAll('-', '');
  const b = ymd(new Date()).replaceAll('-', '');
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${key}/json/kr/1/100000/${stat}/D/${a}/${b}/${item}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  const list = j?.StatisticSearch?.row;
  if (!list) throw new Error('결과 없음 ' + JSON.stringify(j?.RESULT || {}));
  return list.map((r) => [`${r.TIME.slice(0, 4)}-${r.TIME.slice(4, 6)}-${r.TIME.slice(6, 8)}`, Number(r.DATA_VALUE)])
    .filter((r) => Number.isFinite(r[1]));
}

function clean(rows) {
  const m = new Map(rows.map((r) => [r[0], r[1]]));
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const start = new Date();
start.setUTCFullYear(start.getUTCFullYear() - YEARS_BACK);
const fullFrom = ymd(start);
const failed = [];
const skipped = [];
// 시세마다 마지막으로 받기에 성공한 날. 앱이 오래된 자료 경고에 쓴다(시세 파일은 내용이 바뀔 때만 다시 쓴다).
const META_FILE = path.join(DATA_DIR, '_meta.json');
let meta = { ok: {} };
try { meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch { /* 처음 */ }
meta.ok = meta.ok || {};
const today = ymd(new Date());

for (const s of SERIES) {
  const file = path.join(DATA_DIR, `${s.id}.json`);
  const from = fullFrom;
  try {
    let rows;
    let ohlc = null;
    if (s.source === 'yahoo') ({ rows, ohlc } = await fetchYahoo(s.symbol, from));
    else if (s.source === 'fred') rows = await fetchFred(s.symbol, from);
    else if (s.source === 'ecos') rows = await fetchEcos(s.symbol, from);
    if (rows === null) { skipped.push(s.id); console.log(`건너뜀 ${s.id} (인증키 없음)`); continue; }
    if (!rows.length) throw new Error('받은 줄 0');
    const merged = clean(rows).filter((r) => r[0] >= fullFrom);
    const body = { id: s.id, name: s.name, unit: s.unit, source: s.source, symbol: s.symbol, rows: merged };
    if (OHLC_IDS.includes(s.id) && ohlc) {
      const seen = new Map(ohlc.map((r) => [r[0], r]));
      body.ohlc = [...seen.values()].filter((r) => r[0] >= fullFrom).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    }
    const text = JSON.stringify(body) + '\n';
    let old = null;
    try { old = fs.readFileSync(file, 'utf8'); } catch { /* 새 파일 */ }
    if (old !== text) fs.writeFileSync(file, text);
    meta.ok[s.id] = today;
    console.log(`완료 ${s.id} ${merged[0][0]} ~ ${merged[merged.length - 1][0]} ${merged.length}줄${body.ohlc ? ` · 시고저종 ${body.ohlc.length}줄` : ''}${old === text ? ' (바뀐 것 없음)' : ''}`);
  } catch (e) {
    failed.push(`${s.id}: ${e.message}`);
    console.log(`실패 ${s.id} ${e.message}`);
  }
}

meta.run = today;
fs.writeFileSync(META_FILE, JSON.stringify(meta) + '\n');
console.log(`끝 - 실패 ${failed.length}건, 건너뜀 ${skipped.length}건`);
if (failed.length) console.log(failed.join('\n'));
if (failed.length === SERIES.length) process.exit(1);
