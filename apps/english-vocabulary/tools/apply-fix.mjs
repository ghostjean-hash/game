// 검토 지적사항 패치 적용기. 패치 파일(elementary-800-fix-NN.json)의 fixes를 배치 파일에 반영.
// 사용: node tools/apply-fix.mjs 01 [--dry]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "docs", "sources", "moe-2022-english");
const fixNo = (process.argv[2] || "01").padStart(2, "0");
const dry = process.argv.includes("--dry");

const patch = JSON.parse(readFileSync(join(SRC, `elementary-800-fix-${fixNo}.json`), "utf8")).fixes;
const remaining = new Set(Object.keys(patch));
let applied = 0;

for (const n of ["01", "02", "03", "04"]) {
  const file = join(SRC, `authoring-batch-${n}.json`);
  const cards = JSON.parse(readFileSync(file, "utf8"));
  let touched = 0;
  for (const c of cards) {
    const p = patch[String(c.sourceOrder)];
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) {
      if (k === "note") continue; // 패치 파일 안 설명 필드는 카드에 반영하지 않음
      if (JSON.stringify(c[k]) === JSON.stringify(v)) continue;
      console.log(`${c.sourceOrder} ${c.word} .${k}: ${JSON.stringify(c[k])} -> ${JSON.stringify(v)}`);
      c[k] = v;
      touched++;
    }
    remaining.delete(String(c.sourceOrder));
    applied++;
  }
  if (touched && !dry) writeFileSync(file, JSON.stringify(cards, null, 2) + "\n", "utf8");
  console.log(`-- batch ${n}: 카드 ${applied}건 중 필드 ${touched}개 변경${dry ? " (dry)" : " 저장"}`);
}
if (remaining.size) {
  console.error(`\nERROR 미적용 순번(배치에 없음): ${[...remaining].join(",")}`);
  process.exit(1);
}
console.log(`\n패치 대상 ${Object.keys(patch).length}개 카드 전부 적용${dry ? " 가능(dry)" : " 완료"}`);
