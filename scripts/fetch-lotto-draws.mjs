#!/usr/bin/env node
// 로또 회차 데이터 페치 → games/lotto/src/data/draws.json.
//
// 데이터 출처: smok95/lotto GitHub Pages 미러 (https://github.com/smok95/lotto).
//   동행복권 직접 페치 차단(2026-05 이후 외부 접근 불가)으로 미러 사용.
//   미러는 GitHub Actions로 매주 토 추첨 후 자동 갱신.
//
// 사용:
//   node scripts/fetch-lotto-draws.mjs              # 자동: all.json 한 방으로 전수 동기화
//   node scripts/fetch-lotto-draws.mjs 1100         # drwNo 1100 한 건만 (단건 endpoint)
//   node scripts/fetch-lotto-draws.mjs 1100 1110    # 1100 ~ 1110 (단건 endpoint × N)
//   node scripts/fetch-lotto-draws.mjs --full       # 자동과 동일 (호환용)
//
// 시간:
//   - 자동 / --full: all.json 단일 GET, 1초 미만.
//   - 범위 지정: 단건 endpoint × N, 1초당 ~3건.
//
// SSOT: games/lotto/docs/02_data.md 4장.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(REPO_ROOT, 'games', 'lotto', 'src', 'data', 'draws.json');

const ENDPOINT = 'https://smok95.github.io/lotto/results';
const PACE_MS = 300;

const FETCH_HEADERS = {
  'User-Agent': 'blessed-lotto-fetcher/2.1 (+https://github.com/ghostjean-hash/game)',
  'Accept': 'application/json',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mapRecord(src) {
  if (!src || typeof src.draw_no !== 'number') return null;
  if (!Array.isArray(src.numbers) || src.numbers.length !== 6) return null;
  if (typeof src.bonus_no !== 'number') return null;
  const drwDate = typeof src.date === 'string' ? src.date.slice(0, 10) : '';
  const div0 = Array.isArray(src.divisions) && src.divisions.length > 0 ? src.divisions[0] : {};
  return {
    drwNo: src.draw_no,
    drwDate,
    numbers: src.numbers.slice(),
    bonus: src.bonus_no,
    firstWinners: typeof div0?.winners === 'number' ? div0.winners : 0,
    firstPrize: typeof div0?.prize === 'number' ? div0.prize : 0,
    totalSales: typeof src.total_sales_amount === 'number' ? src.total_sales_amount : 0,
  };
}

async function fetchJson(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal });
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
  clearTimeout(timeoutId);
  if (!res.ok) return null;
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchAll() {
  const data = await fetchJson(`${ENDPOINT}/all.json`, 30000);
  if (!Array.isArray(data)) return null;
  const mapped = data.map(mapRecord).filter(Boolean);
  return mapped;
}

async function fetchDraw(no) {
  const data = await fetchJson(`${ENDPOINT}/${no}.json`, 10000);
  return mapRecord(data);
}

async function loadExisting() {
  try {
    const text = await fs.readFile(OUT_PATH, 'utf-8');
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeMerged(existing, newDraws) {
  const map = new Map(existing.map((d) => [d.drwNo, d]));
  for (const d of newDraws) map.set(d.drwNo, d);
  const merged = [...map.values()].sort((a, b) => a.drwNo - b.drwNo);
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

async function runBundleSync() {
  const existing = await loadExisting();
  const lastExisting = existing.length > 0 ? Math.max(...existing.map((d) => d.drwNo)) : 0;
  console.log(`Existing: ${existing.length} draws (last drwNo: ${lastExisting})`);
  console.log(`Fetching all.json bundle from ${ENDPOINT}/all.json ...`);

  const t0 = Date.now();
  const all = await fetchAll();
  const dt = ((Date.now() - t0) / 1000).toFixed(2);

  if (!all) {
    console.error('Failed to fetch all.json. Network or mirror issue.');
    process.exit(1);
  }
  console.log(`Got ${all.length} records in ${dt}s.`);

  const merged = await writeMerged(existing, all);
  const added = Math.max(0, merged.length - existing.length);
  const lastNew = merged.length > 0 ? merged[merged.length - 1].drwNo : 0;
  console.log(`Saved ${merged.length} total (added ${added}, last drwNo: ${lastNew}) to ${OUT_PATH}`);
}

async function runRangeSync(from, to) {
  const existing = await loadExisting();
  const total = to - from + 1;
  console.log(`Range mode: fetching ${from} ~ ${to} (${total} draws) via per-round endpoint`);
  console.log('-'.repeat(60));

  const startTime = Date.now();
  const newDraws = [];
  let consecutiveFailures = 0;

  for (let n = from; n <= to; n += 1) {
    let d = null;
    try {
      d = await fetchDraw(n);
    } catch (err) {
      console.log(`drwNo ${n.toString().padStart(4)}  ERROR  ${err.message}`);
    }

    const elapsedSec = (Date.now() - startTime) / 1000;
    const done = n - from + 1;
    const progress = ((done / total) * 100).toFixed(1).padStart(5);
    const etaSec = elapsedSec > 0 ? Math.round((elapsedSec / done) * (total - done)) : 0;
    const etaMin = Math.floor(etaSec / 60);
    const etaSecRem = etaSec % 60;

    if (d) {
      newDraws.push(d);
      consecutiveFailures = 0;
      console.log(
        `drwNo ${n.toString().padStart(4)}  ok    [${progress}%]  saved ${newDraws.length.toString().padStart(4)}  ETA ${etaMin}m${etaSecRem.toString().padStart(2, '0')}s`
      );
    } else {
      consecutiveFailures += 1;
      console.log(
        `drwNo ${n.toString().padStart(4)}  miss  [${progress}%]  fails ${consecutiveFailures}`
      );
      if (consecutiveFailures >= 20) {
        console.log('-'.repeat(60));
        console.log('Aborting: 20 consecutive failures.');
        break;
      }
    }

    await sleep(PACE_MS);
  }
  console.log('-'.repeat(60));

  const merged = await writeMerged(existing, newDraws);
  console.log(`Saved ${merged.length} total (added ${newDraws.length}) to ${OUT_PATH}`);
}

async function main() {
  const args = process.argv.slice(2);
  const numericArgs = args.filter((a) => !a.startsWith('--')).map((a) => parseInt(a, 10)).filter(Number.isInteger);

  // 자동 / --full: all.json 한 방.
  // 인자 없거나 --full만 있으면 bundle 모드.
  if (numericArgs.length === 0) {
    await runBundleSync();
    return;
  }

  // 단건 / 범위: 단건 endpoint × N.
  let from;
  let to;
  if (numericArgs.length === 1) {
    from = numericArgs[0];
    to = numericArgs[0];
  } else {
    from = numericArgs[0];
    to = numericArgs[1];
  }
  await runRangeSync(from, to);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
