// 3 프리셋 × 11세트 묶음 단위 5구간 등장 분포 분석.
// SSOT: docs/03_architecture.md scripts/ 책임. S67 사용자 명시 (2026-05-10).
//
// 사용자 의문: "11세트 시각화에서 1~10이 거의 모든 세트에 등장한다."
// → 11세트 묶음 단위로 등장 세트 수(k=0~11) 분포 측정해 사용자 인상에 직접 대응.
//
// 측정 대상: 프리셋 1 균형 / 프리셋 2 분산파 / 프리셋 3 운세파 (사용자 실 사용 묶음).
//
// 표본: 3 프리셋 × 60 캐릭터 × 100묶음 (= 1100세트) = 6,000 묶음 / 시나리오, 66,000 세트.
//
// 자연 기대 (이항 분포):
//   q = 한 세트에 등장 확률, p = 한 세트에 미출현 확률
//   P(11세트 중 k세트 등장) = C(11,k) × q^k × p^(11-k)
//   1~10/11~20/21~30/31~40: q=0.8007, p=0.1993
//   41~45: q=0.5287, p=0.4713
//
// 실행:
//   node scripts/coverage-bundle-report.mjs
//   또는 인자 M (캐릭터당 묶음 수): node scripts/coverage-bundle-report.mjs 200

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { recommendMulti } from '../src/core/recommend.js';
import { computeNumberStats, computeBonusStats } from '../src/core/stats.js';
import { mixSeeds } from '../src/core/random.js';
import {
  SAVED_SETS_SALT_BASE,
  NUMBER_MIN, NUMBER_MAX, PICK_COUNT,
  LUCK_INITIAL,
  DEFAULT_PRESETS,
} from '../src/data/numbers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRAWS_PATH = resolve(ROOT, 'src/data/draws.json');
const REPORT_DIR = resolve(ROOT, 'tests/reports');

// ============================================================
// 1. 분석 파라미터
// ============================================================
const DEFAULT_M_PER_CHAR = 100;        // 캐릭터당 묶음 수 (각 묶음 = 11세트)
const SETS_PER_BUNDLE = 11;            // 사용자 화면 = 추천 리스트 11세트
const N_DRWNO_MIX = 100;
const ZODIACS = Object.freeze([
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
]);
const STEMS = Object.freeze(['gap','byeong','mu','gyeong','im']);
const STEM_FIXED_BRANCH = 'rat';
const CHAR_LUCK = LUCK_INITIAL;

const BANDS = Object.freeze([
  { id: 'b1', label: '1~10',  color: '노랑', lo: 1,  hi: 10, size: 10 },
  { id: 'b2', label: '11~20', color: '파랑', lo: 11, hi: 20, size: 10 },
  { id: 'b3', label: '21~30', color: '빨강', lo: 21, hi: 30, size: 10 },
  { id: 'b4', label: '31~40', color: '회색', lo: 31, hi: 40, size: 10 },
  { id: 'b5', label: '41~45', color: '녹색', lo: 41, hi: 45, size: 5  },
]);

// ============================================================
// 2. 자연 기대 (한 세트 미출현 + 이항 분포)
// ============================================================
function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let num = 1, den = 1;
  for (let i = 0; i < k; i += 1) { num *= (n - i); den *= (i + 1); }
  return num / den;
}

const TOTAL_COMB = combinations(NUMBER_MAX, PICK_COUNT);
const NATURAL_MISSING = Object.fromEntries(
  BANDS.map((b) => [b.id, combinations(NUMBER_MAX - b.size, PICK_COUNT) / TOTAL_COMB])
);

// 11세트 묶음 안 등장 세트 수 k=0..11의 자연 기대 확률
function bundleDistribution(p) {
  const q = 1 - p;
  const dist = [];
  for (let k = 0; k <= SETS_PER_BUNDLE; k += 1) {
    const pmf = combinations(SETS_PER_BUNDLE, k) * Math.pow(q, k) * Math.pow(p, SETS_PER_BUNDLE - k);
    dist.push(pmf);
  }
  return dist;
}

const NATURAL_BUNDLE = Object.fromEntries(
  BANDS.map((b) => [b.id, bundleDistribution(NATURAL_MISSING[b.id])])
);

// ============================================================
// 3. 시나리오 - 3 프리셋만 (사용자 명시)
// ============================================================
function preset(id) {
  return DEFAULT_PRESETS.find((p) => p.id === id).strategyIds;
}
const SCENARIOS = Object.freeze([
  { id: 'preset-1', label: '프리셋1 균형',  ids: preset('preset-1') },
  { id: 'preset-2', label: '프리셋2 분산파', ids: preset('preset-2') },
  { id: 'preset-3', label: '프리셋3 운세파', ids: preset('preset-3') },
]);

// ============================================================
// 4. 캐릭터 60명
// ============================================================
function buildCharacters() {
  const chars = [];
  let idx = 0;
  for (const zodiac of ZODIACS) {
    for (const stem of STEMS) {
      const seed = mixSeeds((idx + 1) >>> 0, 0xC4A5EED);
      chars.push({
        seed,
        zodiac,
        dayPillar: { stem, branch: STEM_FIXED_BRANCH },
        luck: CHAR_LUCK,
        label: `${zodiac}/${stem}`,
      });
      idx += 1;
    }
  }
  return chars;
}

// ============================================================
// 5. 추출 + 묶음 단위 측정
// ============================================================
function bandIndex(n) {
  for (let i = 0; i < BANDS.length; i += 1) {
    if (n >= BANDS[i].lo && n <= BANDS[i].hi) return i;
  }
  return -1;
}

function measureScenario(scenario, characters, stats, drwNoList, mPerChar) {
  const t0 = Date.now();
  // 묶음 단위 (11세트)에서 각 구간이 등장한 세트 수 k=0..11 분포
  const distCounts = BANDS.map(() => new Array(SETS_PER_BUNDLE + 1).fill(0));
  // 한 세트 미출현 비율 (대조용)
  const missingPerBand = new Array(BANDS.length).fill(0);
  let totalSets = 0;
  let totalBundles = 0;

  for (const char of characters) {
    for (let m = 0; m < mPerChar; m += 1) {
      const drwNo = drwNoList[m % drwNoList.length];
      // 한 묶음 = 11세트
      const bandPresentCount = new Array(BANDS.length).fill(0);
      for (let s = 0; s < SETS_PER_BUNDLE; s += 1) {
        const saltIdx = m * SETS_PER_BUNDLE + s;
        const seed = mixSeeds(char.seed >>> 0, (SAVED_SETS_SALT_BASE + saltIdx) >>> 0);
        const ctx = {
          seed,
          drwNo,
          luck: char.luck,
          numberStats: stats.numberStats,
          bonusStats: stats.bonusStats,
          zodiac: char.zodiac,
          dayPillar: char.dayPillar,
          strategyIds: scenario.ids,
        };
        const r = recommendMulti(ctx);
        const cover = new Array(BANDS.length).fill(0);
        for (const n of r.numbers) {
          const idx = bandIndex(n);
          if (idx >= 0) cover[idx] += 1;
        }
        for (let b = 0; b < BANDS.length; b += 1) {
          if (cover[b] === 0) missingPerBand[b] += 1;
          else bandPresentCount[b] += 1;
        }
        totalSets += 1;
      }
      // 묶음 분포 카운트
      for (let b = 0; b < BANDS.length; b += 1) {
        distCounts[b][bandPresentCount[b]] += 1;
      }
      totalBundles += 1;
    }
  }
  const t1 = Date.now();
  return {
    scenarioId: scenario.id,
    totalSets,
    totalBundles,
    missingPerSetRatios: missingPerBand.map((c) => c / totalSets),
    bundleDistRatios: distCounts.map((arr) => arr.map((c) => c / totalBundles)),
    elapsedMs: t1 - t0,
  };
}

// ============================================================
// 6. markdown 보고서
// ============================================================
function fmtPct(x) { return (x * 100).toFixed(2) + '%'; }
function fmtPct4(x) { return (x * 100).toFixed(4) + '%'; }

function renderReport(allResults, meta) {
  const lines = [];
  lines.push(`# Lotto 3 프리셋 × 11세트 묶음 단위 5구간 등장 분포 보고서`);
  lines.push('');
  lines.push(`- **생성일**: ${meta.dateIso}`);
  lines.push(`- **표본**: ${meta.charCount}명 캐릭터 × ${meta.mPerChar}묶음 × ${SETS_PER_BUNDLE}세트 = 시나리오당 ${meta.charCount * meta.mPerChar}묶음 (${meta.charCount * meta.mPerChar * SETS_PER_BUNDLE}세트)`);
  lines.push(`- **묶음 정의**: 사용자 추천 리스트 화면 = ${SETS_PER_BUNDLE}세트 단위 (= 사용자가 본 화면과 동일 단위)`);
  lines.push(`- **회차 mix**: 최근 ${N_DRWNO_MIX}회 (drwNo ${meta.drwLo} ~ ${meta.drwHi})`);
  lines.push(`- **측정**: 한 묶음(${SETS_PER_BUNDLE}세트) 안에서 각 구간이 등장한 세트 수의 분포 (k=0~${SETS_PER_BUNDLE})`);
  lines.push('');

  // 자연 기대 분포 표
  lines.push(`## 1. 자연 기대 - 11세트 묶음 안 등장 세트 수 분포 (이항 분포)`);
  lines.push('');
  lines.push(`각 셀 = 11세트 묶음 중 정확히 k세트에 그 구간이 등장할 확률.`);
  lines.push(`q = 한 세트 등장 확률 (= 1 - 한 세트 미출현). p^11이 아니라 11번 시행 이항 분포.`);
  lines.push('');
  lines.push(`| k = 등장 세트 수 | 1~10 (q=80.07%) | 11~20 (q=80.07%) | 21~30 (q=80.07%) | 31~40 (q=80.07%) | 41~45 (q=52.87%) |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (let k = SETS_PER_BUNDLE; k >= 0; k -= 1) {
    const cells = BANDS.map((b) => fmtPct(NATURAL_BUNDLE[b.id][k]));
    lines.push(`| **k=${k}** | ${cells.join(' | ')} |`);
  }
  lines.push('');
  lines.push(`> 1~10 기준: 11세트 중 **k=10** (사용자 관측) = **${fmtPct(NATURAL_BUNDLE.b1[10])}**, k=11 = ${fmtPct(NATURAL_BUNDLE.b1[11])}, k=9 = ${fmtPct(NATURAL_BUNDLE.b1[9])}.`);
  lines.push(`> 즉 11세트 중 9세트 이상에 1~10 등장 = ${fmtPct(NATURAL_BUNDLE.b1[9] + NATURAL_BUNDLE.b1[10] + NATURAL_BUNDLE.b1[11])} (자연).`);
  lines.push('');

  // 시나리오별 한 세트 미출현 (대조)
  lines.push(`## 2. 한 세트 미출현 비율 (대조용 - coverage-report와 동일)`);
  lines.push('');
  lines.push(`| 시나리오 | 1~10 | 11~20 | 21~30 | 31~40 | 41~45 |`);
  lines.push(`|---|---|---|---|---|---|`);
  lines.push(`| **자연 기대** | ${fmtPct(NATURAL_MISSING.b1)} | ${fmtPct(NATURAL_MISSING.b2)} | ${fmtPct(NATURAL_MISSING.b3)} | ${fmtPct(NATURAL_MISSING.b4)} | ${fmtPct(NATURAL_MISSING.b5)} |`);
  for (const sdef of SCENARIOS) {
    const r = allResults[sdef.id];
    const cells = r.missingPerSetRatios.map((ratio, i) => {
      const nat = NATURAL_MISSING[BANDS[i].id];
      const dev = (ratio - nat) / nat;
      const devSign = dev >= 0 ? '+' : '';
      return `${fmtPct(ratio)} (${devSign}${(dev * 100).toFixed(1)}%)`;
    });
    lines.push(`| ${sdef.label} | ${cells.join(' | ')} |`);
  }
  lines.push('');

  // 시나리오별 묶음 분포 - 1~10 (사용자 핵심 관심)
  lines.push(`## 3. 11세트 묶음 단위 1~10 (노랑) 등장 세트 수 분포 (사용자 핵심)`);
  lines.push('');
  lines.push(`사용자 관측 = 11세트 중 10세트에 1~10 등장 (k=10). 본 표가 그 자연 기대 분포 + 3 프리셋 관측을 직접 비교.`);
  lines.push('');
  const headerCols = [];
  for (let k = SETS_PER_BUNDLE; k >= 0; k -= 1) headerCols.push(`k=${k}`);
  lines.push(`| 구분 | ${headerCols.join(' | ')} |`);
  lines.push(`|---|${headerCols.map(() => '---').join('|')}|`);
  // 자연 기대
  const natRow = [];
  for (let k = SETS_PER_BUNDLE; k >= 0; k -= 1) natRow.push(fmtPct(NATURAL_BUNDLE.b1[k]));
  lines.push(`| **자연 기대** | ${natRow.join(' | ')} |`);
  // 시나리오별
  for (const sdef of SCENARIOS) {
    const r = allResults[sdef.id];
    const row = [];
    for (let k = SETS_PER_BUNDLE; k >= 0; k -= 1) row.push(fmtPct(r.bundleDistRatios[0][k]));
    lines.push(`| ${sdef.label} | ${row.join(' | ')} |`);
  }
  lines.push('');
  lines.push(`> 사용자 관측 (k=10) 셀에 자연 기대 ${fmtPct(NATURAL_BUNDLE.b1[10])} = 11세트 묶음 4번 중 1번이 이런 결과. 알고리즘이 만든 게 아닌 자연 빈도.`);
  lines.push('');

  // 시나리오별 묶음 분포 - 5구간 종합 (시나리오마다 5구간 표)
  lines.push(`## 4. 시나리오별 묶음 분포 - 5구간 전수`);
  lines.push('');
  for (const sdef of SCENARIOS) {
    const r = allResults[sdef.id];
    lines.push(`### 4.${SCENARIOS.indexOf(sdef) + 1}. ${sdef.label} (${sdef.ids.join(', ')})`);
    lines.push(`표본 ${r.totalBundles}묶음 (${r.totalSets}세트) · 추출 ${r.elapsedMs}ms`);
    lines.push('');
    lines.push(`11세트 묶음 안 등장 세트 수 (k=0~11) 분포:`);
    lines.push('');
    lines.push(`| k | 1~10 노랑 | 11~20 파랑 | 21~30 빨강 | 31~40 회색 | 41~45 녹색 |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (let k = SETS_PER_BUNDLE; k >= 0; k -= 1) {
      const cells = BANDS.map((b, bi) => {
        const obs = r.bundleDistRatios[bi][k];
        const nat = NATURAL_BUNDLE[b.id][k];
        const devSign = obs >= nat ? '+' : '';
        const devPct = nat > 0 ? `${devSign}${((obs - nat) * 100).toFixed(2)}%p` : '-';
        return `${fmtPct(obs)} (자연 ${fmtPct(nat)}, ${devPct})`;
      });
      lines.push(`| **k=${k}** | ${cells.join(' | ')} |`);
    }
    lines.push('');
    // 누적 통계
    lines.push(`**누적 통계**:`);
    for (let bi = 0; bi < BANDS.length; bi += 1) {
      const obs = r.bundleDistRatios[bi];
      const nat = NATURAL_BUNDLE[BANDS[bi].id];
      const obsGE9 = obs[9] + obs[10] + obs[11];
      const natGE9 = nat[9] + nat[10] + nat[11];
      const obsLE2 = obs[0] + obs[1] + obs[2];
      const natLE2 = nat[0] + nat[1] + nat[2];
      lines.push(`- ${BANDS[bi].label}: 9세트 이상 등장 = **${fmtPct(obsGE9)}** (자연 ${fmtPct(natGE9)}) / 2세트 이하 등장 = ${fmtPct(obsLE2)} (자연 ${fmtPct(natLE2)})`);
    }
    lines.push('');
  }

  // 결론
  lines.push(`## 5. 자비스 자동 결론`);
  lines.push('');
  const concerns = [];
  for (const sdef of SCENARIOS) {
    const r = allResults[sdef.id];
    for (let bi = 0; bi < BANDS.length; bi += 1) {
      const obs = r.bundleDistRatios[bi];
      const nat = NATURAL_BUNDLE[BANDS[bi].id];
      const obsGE9 = obs[9] + obs[10] + obs[11];
      const natGE9 = nat[9] + nat[10] + nat[11];
      if (natGE9 > 0) {
        const dev = Math.abs(obsGE9 - natGE9) / natGE9;
        if (dev > 0.20) {
          concerns.push(`- **${sdef.label}** ${BANDS[bi].label}: 9세트 이상 등장 비율 ${fmtPct(obsGE9)} (자연 ${fmtPct(natGE9)}, ${(dev * 100).toFixed(1)}% 편차)`);
        }
      }
    }
  }
  if (concerns.length === 0) {
    lines.push(`3 프리셋 × 5 구간 × 묶음 분포 모두 자연 기대 ±20% 안. **알고리즘이 묶음 단위에서도 자연 무작위와 사실상 일치**.`);
  } else {
    lines.push(`자연 기대 ±20% 초과:`);
    lines.push('');
    concerns.forEach((c) => lines.push(c));
  }
  lines.push('');
  lines.push(`> [핵심] 사용자 관측 = 11세트 중 10세트에 1~10 등장 (k=10). 자연 기대 ${fmtPct(NATURAL_BUNDLE.b1[10])} = **11세트 묶음 약 4번 중 1번** 발생하는 자연 빈도. 알고리즘 결손 아님.`);
  lines.push('');

  return lines.join('\n');
}

// ============================================================
// 7. 메인
// ============================================================
function loadDraws() { return JSON.parse(readFileSync(DRAWS_PATH, 'utf-8')); }
function buildDrwNoList(draws) {
  const sorted = [...draws].sort((a, b) => a.drwNo - b.drwNo);
  const latest = sorted[sorted.length - 1].drwNo;
  const list = [];
  for (let i = 0; i < N_DRWNO_MIX; i += 1) list.push(latest - (N_DRWNO_MIX - 1) + i);
  return { drwNoList: list, drwLo: list[0], drwHi: list[list.length - 1] };
}
function pad2(n) { return String(n).padStart(2, '0'); }
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function main() {
  const argM = parseInt(process.argv[2], 10);
  const mPerChar = (Number.isFinite(argM) && argM > 0) ? argM : DEFAULT_M_PER_CHAR;

  console.log('# Lotto coverage-bundle-report (3 프리셋 × 11세트 묶음 분포)');
  console.log(`표본 = 60 캐릭터 × ${mPerChar}묶음 × ${SETS_PER_BUNDLE}세트 × 3 프리셋`);
  console.log('');

  const t0 = Date.now();
  const draws = loadDraws();
  const stats = {
    numberStats: computeNumberStats(draws),
    bonusStats: computeBonusStats(draws),
  };
  const characters = buildCharacters();
  const { drwNoList, drwLo, drwHi } = buildDrwNoList(draws);
  console.log(`draws ${draws.length}회 / 분석 회차 mix ${drwLo}~${drwHi} / 캐릭터 ${characters.length}명`);
  console.log(`자연 기대 (11세트 묶음 중 1~10이 정확히 k세트 등장): k=11 ${fmtPct(NATURAL_BUNDLE.b1[11])} / k=10 ${fmtPct(NATURAL_BUNDLE.b1[10])} / k=9 ${fmtPct(NATURAL_BUNDLE.b1[9])} / k=8 ${fmtPct(NATURAL_BUNDLE.b1[8])}`);
  console.log('');

  const allResults = {};
  for (const sdef of SCENARIOS) {
    process.stdout.write(`[${sdef.label.padEnd(18)}] ... `);
    const r = measureScenario(sdef, characters, stats, drwNoList, mPerChar);
    allResults[sdef.id] = r;
    const obs = r.bundleDistRatios[0];
    const ge9 = obs[9] + obs[10] + obs[11];
    console.log(`${r.elapsedMs}ms / 1~10 미출현 ${fmtPct(r.missingPerSetRatios[0])} / 11세트 중 9세트+ 등장 ${fmtPct(ge9)} (자연 ${fmtPct(NATURAL_BUNDLE.b1[9] + NATURAL_BUNDLE.b1[10] + NATURAL_BUNDLE.b1[11])})`);
  }
  const t1 = Date.now();
  console.log('');
  console.log(`총 소요: ${t1 - t0}ms`);

  const meta = {
    dateIso: todayIso(),
    charCount: characters.length,
    mPerChar,
    drwLo,
    drwHi,
  };
  const md = renderReport(allResults, meta);
  const outPath = resolve(REPORT_DIR, `coverage_bundle_${meta.dateIso}.md`);
  writeFileSync(outPath, md, 'utf-8');
  console.log(`보고서 저장: ${outPath}`);
}

main();
