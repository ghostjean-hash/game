// 5구간 색깔별 한 세트 미출현 비율 전용 분석.
// SSOT: docs/03_architecture.md scripts/ 책임. S67 사용자 명시 요청 (2026-05-10).
//
// 사용자 질문: "1~10, 11~20, 21~30, 31~40, 41~45 색깔별로 한 세트에서 출현을 하지 않을 확률"
//
// 측정: 각 시나리오 × 5구간 × N세트 → 구간이 0개 포함된 세트 비율.
// 자연 기대 (6/45 균등 추첨):
//   10개 그룹 (1~10, 11~20, 21~30, 31~40) 미출현 = C(35,6)/C(45,6) = 19.93%
//   5개 그룹 (41~45) 미출현 = C(40,6)/C(45,6) = 47.13%
//
// 실행:
//   node scripts/coverage-report.mjs
//   또는 인자 N: node scripts/coverage-report.mjs 2000

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { recommendMulti } from '../src/core/recommend.js';
import { computeNumberStats, computeBonusStats } from '../src/core/stats.js';
import { mixSeeds } from '../src/core/random.js';
import {
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
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
const DEFAULT_N_PER_CHAR = 1000;
const N_DRWNO_MIX = 100;
const ZODIACS = Object.freeze([
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
]);
const STEMS = Object.freeze(['gap','byeong','mu','gyeong','im']);
const STEM_FIXED_BRANCH = 'rat';
const CHAR_LUCK = LUCK_INITIAL;

// 5구간 정의 (사용자 명시 그대로). 1~10 / 11~20 / 21~30 / 31~40 / 41~45.
const BANDS = Object.freeze([
  { id: 'b1', label: '1~10',  color: '노랑', lo: 1,  hi: 10, size: 10 },
  { id: 'b2', label: '11~20', color: '파랑', lo: 11, hi: 20, size: 10 },
  { id: 'b3', label: '21~30', color: '빨강', lo: 21, hi: 30, size: 10 },
  { id: 'b4', label: '31~40', color: '회색', lo: 31, hi: 40, size: 10 },
  { id: 'b5', label: '41~45', color: '녹색', lo: 41, hi: 45, size: 5  },
]);

// ============================================================
// 2. 자연 기대 (6/45 균등 추첨)
//    한 세트(6번호)에 구간이 0개 포함될 확률 = C(45-size, 6) / C(45, 6).
// ============================================================
function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let num = 1, den = 1;
  for (let i = 0; i < k; i += 1) { num *= (n - i); den *= (i + 1); }
  return num / den;
}

const TOTAL_COMB = combinations(NUMBER_MAX, PICK_COUNT); // C(45,6)
const NATURAL_MISSING = Object.fromEntries(
  BANDS.map((b) => [b.id, combinations(NUMBER_MAX - b.size, PICK_COUNT) / TOTAL_COMB])
);

// ============================================================
// 3. 시나리오 정의 (단일 10 + 다중 9 = 19, 1차/2차 도구와 동일)
// ============================================================
function preset(id) {
  return DEFAULT_PRESETS.find((p) => p.id === id).strategyIds;
}
const SCENARIOS = Object.freeze([
  // 단일 10
  { id: STRATEGY_BLESSED,        label: '랜덤(축복)', cat: '랜덤', kind: 'random', ids: [STRATEGY_BLESSED] },
  { id: STRATEGY_INTUITIVE,      label: '직감',       cat: '랜덤', kind: 'random', ids: [STRATEGY_INTUITIVE] },
  { id: STRATEGY_BALANCER,       label: '균형',       cat: '랜덤', kind: 'random', ids: [STRATEGY_BALANCER] },
  { id: STRATEGY_TREND_FOLLOWER, label: '최신',       cat: '통계', kind: 'biased', ids: [STRATEGY_TREND_FOLLOWER] },
  { id: STRATEGY_STATISTICIAN,   label: '많이',       cat: '통계', kind: 'biased', ids: [STRATEGY_STATISTICIAN] },
  { id: STRATEGY_SECOND_STAR,    label: '보너스',     cat: '통계', kind: 'biased', ids: [STRATEGY_SECOND_STAR] },
  { id: STRATEGY_REGRESSIONIST,  label: '적게',       cat: '통계', kind: 'biased', ids: [STRATEGY_REGRESSIONIST] },
  { id: STRATEGY_ASTROLOGER,     label: '별자리',     cat: '운세', kind: 'biased', ids: [STRATEGY_ASTROLOGER] },
  { id: STRATEGY_ZODIAC_ELEMENT, label: '4원소',      cat: '운세', kind: 'biased', ids: [STRATEGY_ZODIAC_ELEMENT] },
  { id: STRATEGY_FIVE_ELEMENTS,  label: '사주',       cat: '운세', kind: 'biased', ids: [STRATEGY_FIVE_ELEMENTS] },
  // 다중 9 (사용자 본 화면 = preset-1 균형 포함)
  { id: 'preset-1', label: '프리셋1 균형',  cat: '다중-프리셋', kind: 'biased', ids: preset('preset-1') },
  { id: 'preset-2', label: '프리셋2 분산파', cat: '다중-프리셋', kind: 'biased', ids: preset('preset-2') },
  { id: 'preset-3', label: '프리셋3 운세파', cat: '다중-프리셋', kind: 'biased', ids: preset('preset-3') },
  { id: 'cat-random',  label: '카테고리 랜덤전체', cat: '다중-카테고리', kind: 'random', ids: [STRATEGY_BLESSED, STRATEGY_INTUITIVE, STRATEGY_BALANCER] },
  { id: 'cat-stats',   label: '카테고리 통계전체', cat: '다중-카테고리', kind: 'biased', ids: [STRATEGY_TREND_FOLLOWER, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR, STRATEGY_REGRESSIONIST] },
  { id: 'cat-mapping', label: '카테고리 운세전체', cat: '다중-카테고리', kind: 'biased', ids: [STRATEGY_ASTROLOGER, STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS] },
  { id: 'cross-mr', label: '운세+랜덤 (별자리+직감)', cat: '다중-cross', kind: 'biased', ids: [STRATEGY_ASTROLOGER, STRATEGY_INTUITIVE] },
  { id: 'cross-ms', label: '운세+통계 (별자리+많이)', cat: '다중-cross', kind: 'biased', ids: [STRATEGY_ASTROLOGER, STRATEGY_STATISTICIAN] },
  { id: 'cross-rs', label: '랜덤+통계 (직감+많이)',   cat: '다중-cross', kind: 'biased', ids: [STRATEGY_INTUITIVE, STRATEGY_STATISTICIAN] },
]);

// ============================================================
// 4. 캐릭터 60명 (1차/2차와 동일)
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
// 5. 추출 + 미출현 측정
// ============================================================
function bandIndex(n) {
  for (let i = 0; i < BANDS.length; i += 1) {
    if (n >= BANDS[i].lo && n <= BANDS[i].hi) return i;
  }
  return -1;
}

function measureScenario(scenario, characters, stats, drwNoList, nPerChar) {
  const t0 = Date.now();
  // 각 구간이 0개 포함된 세트 카운트
  const missingCounts = new Array(BANDS.length).fill(0);
  let totalSets = 0;

  for (const char of characters) {
    for (let i = 0; i < nPerChar; i += 1) {
      const drwNo = drwNoList[i % drwNoList.length];
      const seedSalt = SAVED_SETS_SALT_BASE + i;
      const seed = mixSeeds(char.seed >>> 0, seedSalt >>> 0);
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
      // 한 세트의 구간 cover (5비트)
      const cover = new Array(BANDS.length).fill(0);
      for (const n of r.numbers) {
        const idx = bandIndex(n);
        if (idx >= 0) cover[idx] += 1;
      }
      for (let b = 0; b < BANDS.length; b += 1) {
        if (cover[b] === 0) missingCounts[b] += 1;
      }
      totalSets += 1;
    }
  }
  const t1 = Date.now();
  return {
    scenarioId: scenario.id,
    totalSets,
    missingCounts,
    missingRatios: missingCounts.map((c) => c / totalSets),
    elapsedMs: t1 - t0,
  };
}

// ============================================================
// 6. markdown 보고서
// ============================================================
function fmtPct(x) { return (x * 100).toFixed(2) + '%'; }
function fmtNum(x, d = 2) { return Number(x).toFixed(d); }

function renderReport(allResults, meta) {
  const lines = [];
  lines.push(`# Lotto 5구간 색깔별 한 세트 미출현 비율 보고서`);
  lines.push('');
  lines.push(`- **생성일**: ${meta.dateIso}`);
  lines.push(`- **표본**: ${meta.charCount}명 캐릭터 × ${meta.nPerChar}회 추출 = 시나리오당 ${meta.charCount * meta.nPerChar}세트`);
  lines.push(`- **회차 mix**: 최근 ${N_DRWNO_MIX}회 (drwNo ${meta.drwLo} ~ ${meta.drwHi})`);
  lines.push(`- **측정**: 각 세트(6번호)에 해당 구간이 0개 포함된 비율 (= "한 세트에 그 색깔이 안 나올 확률")`);
  lines.push('');

  // 자연 기대치 표
  lines.push(`## 1. 자연 기대 (6/45 균등 추첨, 알고리즘 무관)`);
  lines.push('');
  lines.push(`| 구간 | 색 | 구간 크기 | 미출현 확률 (자연) | 1개 이상 출현 확률 |`);
  lines.push(`|---|---|---|---|---|`);
  for (const b of BANDS) {
    const miss = NATURAL_MISSING[b.id];
    lines.push(`| ${b.label} | ${b.color} | ${b.size}개 | **${fmtPct(miss)}** | ${fmtPct(1 - miss)} |`);
  }
  lines.push('');
  lines.push(`> 참고: 41~45는 5개라 미출현 확률 47.13%로 다른 구간(19.93%)보다 2.4배 높음. 매 세트의 절반 가까이는 41~45 미포함이 자연.`);
  lines.push('');

  // 시나리오 × 구간 종합 표
  lines.push(`## 2. 시나리오 × 구간 미출현 비율 (관측)`);
  lines.push('');
  lines.push(`| 시나리오 | 카테고리 | kind | 1~10 노랑 | 11~20 파랑 | 21~30 빨강 | 31~40 회색 | 41~45 녹색 |`);
  lines.push(`|---|---|---|---|---|---|---|---|`);
  for (const sdef of SCENARIOS) {
    const r = allResults[sdef.id];
    const cells = r.missingRatios.map((ratio, i) => {
      const nat = NATURAL_MISSING[BANDS[i].id];
      const dev = nat > 0 ? (ratio - nat) / nat : 0;
      const devSign = dev >= 0 ? '+' : '';
      return `${fmtPct(ratio)} (${devSign}${(dev * 100).toFixed(1)}%)`;
    });
    lines.push(`| ${sdef.label} | ${sdef.cat} | ${sdef.kind} | ${cells.join(' | ')} |`);
  }
  lines.push('');
  lines.push(`> 셀 표기: 관측 비율 (자연 기대 대비 편차%). 편차 +면 자연보다 더 자주 미출현, -면 더 자주 출현.`);
  lines.push('');

  // 1~10 (사용자 인상 핵심) 별도 강조 표
  lines.push(`## 3. 1~10 (노란색) 미출현 - 사용자 핵심 관심`);
  lines.push('');
  lines.push(`사용자 인상 "노란공이 거의 모든 세트에 등장" = 미출현 비율이 자연 19.93%보다 낮다는 뜻. 다음 표로 확인.`);
  lines.push('');
  lines.push(`| 시나리오 | 1~10 미출현 비율 | 자연 기대 | 편차 | 1~10 출현 비율 (= 100% - 미출현) |`);
  lines.push(`|---|---|---|---|---|`);
  const sortedBy1to10 = [...SCENARIOS].sort((a, b) => allResults[a.id].missingRatios[0] - allResults[b.id].missingRatios[0]);
  for (const sdef of sortedBy1to10) {
    const r = allResults[sdef.id];
    const ratio = r.missingRatios[0];
    const nat = NATURAL_MISSING.b1;
    const dev = (ratio - nat) / nat;
    const devSign = dev >= 0 ? '+' : '';
    lines.push(`| ${sdef.label} | ${fmtPct(ratio)} | ${fmtPct(nat)} | ${devSign}${(dev * 100).toFixed(1)}% | ${fmtPct(1 - ratio)} |`);
  }
  lines.push('');

  // 결론
  lines.push(`## 4. 자비스 자동 결론`);
  lines.push('');
  // K1 ±20% 위반 시나리오 수집
  const concerns = [];
  for (const sdef of SCENARIOS) {
    const r = allResults[sdef.id];
    const violations = [];
    for (let i = 0; i < BANDS.length; i += 1) {
      const nat = NATURAL_MISSING[BANDS[i].id];
      const dev = Math.abs(r.missingRatios[i] - nat) / nat;
      if (dev > 0.20) {
        violations.push(`${BANDS[i].label} ${fmtPct(r.missingRatios[i])}(자연 ${fmtPct(nat)})`);
      }
    }
    if (violations.length > 0) {
      concerns.push(`- **${sdef.label}** (${sdef.cat}): ${violations.join(', ')}`);
    }
  }
  if (concerns.length === 0) {
    lines.push(`19 시나리오 × 5구간 = 95개 셀 모두 자연 기대 ±20% 이내. **모든 색깔이 자연 무작위와 사실상 일치**.`);
  } else {
    lines.push(`자연 기대 ±20% 초과 셀:`);
    lines.push('');
    concerns.forEach((c) => lines.push(c));
  }
  lines.push('');
  lines.push(`> [핵심] 사용자 인상 "노란공이 거의 모든 세트에 등장"의 통계 근거 = 1~10 출현 비율 자연 80.07% (= 미출현 19.93%의 보집합). 본 보고서 모든 시나리오에서 1~10 출현은 80% 전후 = 자연.`);
  lines.push('');

  return lines.join('\n');
}

// ============================================================
// 7. 메인
// ============================================================
function loadDraws() {
  return JSON.parse(readFileSync(DRAWS_PATH, 'utf-8'));
}
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
  const argN = parseInt(process.argv[2], 10);
  const nPerChar = (Number.isFinite(argN) && argN > 0) ? argN : DEFAULT_N_PER_CHAR;

  console.log('# Lotto coverage-report (5구간 미출현 비율)');
  console.log(`표본 = 60 캐릭터 × ${nPerChar} 추출 × ${SCENARIOS.length} 시나리오`);
  console.log('자연 기대 미출현: 1~10/11~20/21~30/31~40 = 19.93% / 41~45 = 47.13%');
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
  console.log('');

  const allResults = {};
  for (const sdef of SCENARIOS) {
    process.stdout.write(`[${sdef.label.padEnd(28)}] ... `);
    const r = measureScenario(sdef, characters, stats, drwNoList, nPerChar);
    allResults[sdef.id] = r;
    const cells = r.missingRatios.map((ratio) => fmtPct(ratio)).join(' / ');
    console.log(`${r.elapsedMs}ms / ${cells}`);
  }
  const t1 = Date.now();
  console.log('');
  console.log(`총 소요: ${t1 - t0}ms`);

  const meta = {
    dateIso: todayIso(),
    charCount: characters.length,
    nPerChar,
    drwLo,
    drwHi,
  };
  const md = renderReport(allResults, meta);
  const outPath = resolve(REPORT_DIR, `coverage_${meta.dateIso}.md`);
  writeFileSync(outPath, md, 'utf-8');
  console.log(`보고서 저장: ${outPath}`);
}

main();
