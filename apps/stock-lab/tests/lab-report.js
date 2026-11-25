// 실제 자료로 모든 전략을 네 해 · 이어서 · 2026 기간에 돌려 결과 표를 tests/lab-report.md 로 쓴다(기획서 5.3).
// 실행: node apps/stock-lab/tests/lab-report.js [--same]   (--same = 같은 날 종가 가정)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { alignDays } from '../src/core/simulate.js';
import { prepare } from '../src/core/indicators.js';
import { yearRanges, continuousRange, runMany, yearTable, ranks } from '../src/core/stats.js';
import { PRESETS, GROUPS } from '../src/data/strategies.js';
import { FEE_RATE } from '../src/data/numbers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, '..', 'data');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
const kospi = readJson('kospi.json');
const lev = readJson('kodexlev.json');
const toMap = (rows) => new Map((rows || []).map((r) => [r[0], r.slice(1)]));
const ind = prepare(alignDays(kospi.rows, lev.rows), { kospi: toMap(kospi.ohlc), lev: toMap(lev.ohlc) });

const nextDay = !process.argv.includes('--same');
const opt = { initial: 1e8, fee: FEE_RATE, nextDay };
const items = PRESETS.map((p) => ({ id: p.id, preset: p, params: p.params }));
const name = Object.fromEntries(PRESETS.map((p) => [p.id, p.name]));
const grp = Object.fromEntries(PRESETS.map((p) => [p.id, GROUPS.find((g) => g.key === p.group).name]));

const pct = (v) => (v == null ? '-' : `${(v * 100).toFixed(1)}%`);
const eok = (v) => `${(v / 1e8).toFixed(3)}억`;

const byYear = {};
for (const { key, range } of yearRanges(ind)) {
  console.log(`${key} 돌리는 중 (${ind.date[range[0]]} ~ ${ind.date[range[1]]})`);
  byYear[key] = runMany(ind, range, items, opt);
}
const cr = continuousRange(ind);
console.log(`이어서 돌리는 중 (${ind.date[cr[0]]} ~ ${ind.date[cr[1]]})`);
const cont = runMany(ind, cr, items, opt);

const ids = PRESETS.map((p) => p.id);
const out = [];
out.push(`# 전략 실험실 점검표`, '', `자료 마지막 날 ${ind.date[ind.n - 1]} · 체결 ${nextDay ? '다음 날 종가' : '같은 날 종가 가정'} · 비용 ${(FEE_RATE * 100).toFixed(3)}% · 시작 1억`, '');
out.push('## 2026년', '', '| 전략 | 묶음 | 최종 | 총수익률 | 최대 낙폭 | 회복 | 고점 이후 반납 | 미회복 일수 | 매매 | 80:20 대비 |', '|---|---|---|---|---|---|---|---|---|---|');
const y26 = byYear['2026'];
const r26 = ranks(y26, ids);
for (const id of [...ids].sort((a, b) => r26[a] - r26[b])) {
  const s = y26[id].summary;
  out.push(`| ${name[id]} | ${grp[id]} | ${eok(s.final)} | ${pct(s.totalReturn)} | ${pct(s.mdd)} | ${s.recovery == null ? '미회복' : `${s.recovery}일`} | ${pct(s.giveBackPct)} | ${s.unrecovered}일 | ${s.tradeCount} | ${pct(s.totalReturn - y26.hold80.summary.totalReturn)} |`);
}
out.push('', '## 연도별(해마다 1억으로 새로 시작) + 2023 ~ 지금 이어서', '');
const years = Object.keys(byYear);
out.push(`| 전략 | ${years.map((y) => `${y} 수익 / 낙폭`).join(' | ')} | 평균 수익 | 80:20 이긴 해 | 100% 이긴 해 | 평균 순위 | 이어서 수익 | 이어서 낙폭 | 이어서 반납 |`);
out.push(`|---|${years.map(() => '---').join('|')}|---|---|---|---|---|---|---|`);
const yt = yearTable(byYear, cont, ids).sort((a, b) => a.avgRank - b.avgRank);
for (const row of yt) {
  out.push(`| ${name[row.id]} | ${row.cells.map((c) => (c ? `${pct(c.ret)} / ${pct(c.mdd)}` : '-')).join(' | ')} | ${pct(row.avgRet)} | ${row.win80} | ${row.win100} | ${row.avgRank?.toFixed(1)} | ${pct(row.cont?.totalReturn)} | ${pct(row.cont?.mdd)} | ${pct(row.cont?.giveBackPct)} |`);
}
const file = path.join(here, 'lab-report.md');
fs.writeFileSync(file, out.join('\n') + '\n');
console.log(`완료 - ${file}`);
