#!/usr/bin/env node
// 동행복권 회차 데이터 페치 → games/lotto/src/data/draws.json.
//
// 사용:
//   node scripts/fetch-lotto-draws.mjs              # 자동: 기존 draws.json 마지막 회차 + 1 ~ 최신 (증분)
//   node scripts/fetch-lotto-draws.mjs 1100         # drwNo 1100 한 건만
//   node scripts/fetch-lotto-draws.mjs 1100 1110    # 1100회차 ~ 1110회차
//   node scripts/fetch-lotto-draws.mjs --full       # 강제 전수 (1회차부터)
//
// 페이싱: 1초당 ~1.5건. 첫 전수 적재 약 12분, 증분은 보통 1건.
// SSOT: games/lotto/docs/02_data.md 4장.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(REPO_ROOT, 'games', 'lotto', 'src', 'data', 'draws.json');

const ENDPOINT = 'https://www.dhlottery.co.kr/common.do';
const PACE_MS = 700;

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json,text/plain,*/*',
  'Accept-Language': 'ko,en;q=0.9',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchDraw(no) {
  const url = `${ENDPOINT}?method=getLottoNumber&drwNo=${no}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId);
    return null;
  }
  clearTimeout(timeoutId);
  if (!res.ok) return null;
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (data.returnValue !== 'success') return null;
  return {
    drwNo: data.drwNo,
    drwDate: data.drwNoDate,
    numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6],
    bonus: data.bnusNo,
    firstWinners: data.firstPrzwnerCo,
    firstPrize: data.firstWinamnt,
    totalSales: data.totSellamnt,
  };
}

async function findLatestDrwNo(seed = 1230) {
  console.log('Detecting latest drwNo (network probe)...');

  // 1단계: seed가 존재하는지 확인. 없으면 -50씩 후퇴.
  let upper = seed;
  while (upper > 0) {
    console.log(`  probe drwNo ${upper.toString().padStart(4)} ...`);
    const draw = await fetchDraw(upper);
    await sleep(PACE_MS);
    if (draw) {
      console.log(`  probe drwNo ${upper.toString().padStart(4)} EXISTS`);
      break;
    }
    console.log(`  probe drwNo ${upper.toString().padStart(4)} miss, retrying lower`);
    upper -= 50;
  }
  if (upper <= 0) return 1;

  // 2단계: upper에서 +50씩 늘려가며 미존재 만날 때까지.
  while (true) {
    const next = upper + 50;
    console.log(`  probe drwNo ${next.toString().padStart(4)} ...`);
    const draw = await fetchDraw(next);
    await sleep(PACE_MS);
    if (!draw) {
      console.log(`  probe drwNo ${next.toString().padStart(4)} miss (upper bound found)`);
      break;
    }
    console.log(`  probe drwNo ${next.toString().padStart(4)} EXISTS`);
    upper = next;
  }

  // 3단계: upper ~ upper+50 사이 선형 탐색.
  let latest = upper;
  console.log(`  narrowing between ${upper + 1} and ${upper + 50} ...`);
  for (let n = upper + 1; n <= upper + 50; n += 1) {
    const draw = await fetchDraw(n);
    await sleep(PACE_MS);
    if (!draw) break;
    latest = n;
  }
  return latest;
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

async function main() {
  const args = process.argv.slice(2);
  const isFull = args.includes('--full');
  const numericArgs = args.filter((a) => !a.startsWith('--')).map((a) => parseInt(a, 10)).filter(Number.isInteger);

  let existing = isFull ? [] : await loadExisting();
  let from;
  let to;

  if (numericArgs.length === 2) {
    from = numericArgs[0];
    to = numericArgs[1];
  } else if (numericArgs.length === 1) {
    from = numericArgs[0];
    to = numericArgs[0];
  } else {
    const lastExisting = existing.length > 0 ? Math.max(...existing.map((d) => d.drwNo)) : 0;
    console.log(`Existing: ${existing.length} draws (last drwNo: ${lastExisting})`);
    console.log('Detecting latest drwNo...');
    to = await findLatestDrwNo(Math.max(lastExisting, 1100));
    console.log(`Latest drwNo: ${to}`);
    from = lastExisting > 0 ? lastExisting + 1 : 1;
    if (from > to) {
      console.log('Already up to date. Nothing to fetch.');
      return;
    }
  }

  const total = to - from + 1;
  console.log(`Fetching ${from} ~ ${to} (${total} draws)`);
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
        console.log(`Aborting: 20 consecutive failures.`);
        console.log(`Likely cause: Korean IP required, or anti-bot block.`);
        console.log(`Saved ${newDraws.length} draws so far.`);
        break;
      }
    }

    await sleep(PACE_MS);
  }
  console.log('-'.repeat(60));

  // 기존 + 신규 병합 (drwNo 기준 dedupe, 신규가 우선)
  const map = new Map(existing.map((d) => [d.drwNo, d]));
  for (const d of newDraws) map.set(d.drwNo, d);
  const merged = [...map.values()].sort((a, b) => a.drwNo - b.drwNo);

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(merged, null, 2));
  console.log(`Saved ${merged.length} total (added ${newDraws.length}) to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
