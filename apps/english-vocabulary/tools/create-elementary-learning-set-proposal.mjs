// 대표 품사별 빈도 순서를 유지하며 초등 800개를 4세트×200으로 균형 배치한다.
// 앱용 변환 전 설계 데이터만 만든다.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(APP, "docs", "sources", "moe-2022-english");
const baseline = JSON.parse(readFileSync(join(SRC, "elementary-learning-baseline-wordfreq-v3.1.1.json"), "utf8"));
const cards = [1, 2, 3, 4].flatMap((n) => JSON.parse(readFileSync(join(SRC, `authoring-batch-${String(n).padStart(2, "0")}.json`), "utf8")));
const cardById = new Map(cards.map((card) => [card.id, card]));
const groups = new Map();
for (const row of baseline.rows) {
  const pos = cardById.get(row.id).partOfSpeech[0];
  if (!groups.has(pos)) groups.set(pos, []);
  groups.get(pos).push(row);
}
for (const rows of groups.values()) rows.sort((a, b) => a.frequencyRank - b.frequencyRank || a.word.localeCompare(b.word));

const totals = [0, 0, 0, 0];
const allocation = new Map();
for (const [pos, rows] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const counts = Array(4).fill(Math.floor(rows.length / 4));
  counts.forEach((n, i) => { totals[i] += n; });
  for (let remain = rows.length % 4; remain > 0; remain--) {
    const target = totals.reduce((best, n, i) => n < totals[best] ? i : best, 0);
    counts[target]++; totals[target]++;
  }
  allocation.set(pos, counts);
}
if (!totals.every((n) => n === 200)) throw new Error(`세트 크기 불일치: ${totals.join(", ")}`);

const sets = Array.from({ length: 4 }, () => []);
for (const [pos, rows] of groups) {
  let offset = 0;
  for (let set = 0; set < 4; set++) {
    for (const row of rows.slice(offset, offset + allocation.get(pos)[set])) {
      sets[set].push({ ...row, partOfSpeech: pos, allocationReason: "pos-frequency-stratified" });
    }
    offset += allocation.get(pos)[set];
  }
}
for (let i = 0; i < 4; i++) {
  sets[i].sort((a, b) => a.frequencyRank - b.frequencyRank || a.word.localeCompare(b.word));
  sets[i].forEach((row, index) => { row.setId = `ev-set-${String(i + 1).padStart(3, "0")}`; row.learningOrder = index + 1; });
}
const rows = sets.flat();
const output = {
  status: "proposal; requires user approval before app conversion",
  input: "800 audited authoring cards + wordfreq v3.1.1 baseline",
  rule: "representative POS stratification; frequency ascending within each POS; four equal 200-card sets",
  sets: sets.map((rows, i) => ({ setId: `ev-set-${String(i + 1).padStart(3, "0")}`, count: rows.length })),
  rows,
};
writeFileSync(join(SRC, "elementary-learning-set-proposal-v1.json"), JSON.stringify(output, null, 2) + "\n");
console.log(`wrote ${rows.length} cards; set totals ${sets.map((s) => s.length).join(", ")}`);
