// 빈도 순위만 적용한 학습 세트 설계 기준선. 앱 반영·최종 배치용이 아니다.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(APP, "docs", "sources", "moe-2022-english");
const frequency = JSON.parse(readFileSync(join(SRC, "elementary-frequency-wordfreq-v3.1.1.json"), "utf8"));
const rows = [...frequency.rows].sort((a, b) => a.frequencyRank - b.frequencyRank).map((row, index) => ({
  ...row,
  proposedSetId: `ev-set-${String(Math.floor(index / 200) + 1).padStart(3, "0")}`,
  proposedLearningOrder: index + 1,
}));
const out = {
  status: "baseline-only; requires human balance review and user approval",
  source: frequency.source,
  rule: "frequency rank ascending, split into four contiguous groups of 200",
  rows,
};
writeFileSync(join(SRC, "elementary-learning-baseline-wordfreq-v3.1.1.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${rows.length} rows`);
