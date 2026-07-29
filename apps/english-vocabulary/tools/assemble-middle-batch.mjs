// 중등 `**` 공식 대표형을 AUTHORING BATCH 카드로 조립한다.
// 사용: node tools/assemble-middle-batch.mjs 01
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "docs", "sources", "moe-2022-english");
const batch = String(Number(process.argv[2] || 0)).padStart(2, "0");
if (!/^0[1-6]$/.test(batch)) throw new Error("중등 배치번호는 01~06이어야 함");
const from = (Number(batch) - 1) * 200 + 1;
const to = Number(batch) * 200;
const pool = JSON.parse(readFileSync(join(SRC, "middle-1200-cards.json"), "utf8"));
const draft = readFileSync(join(SRC, `middle-authoring-batch-${batch}.draft.txt`), "utf8")
  .split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
const seen = new Set();
const cards = draft.map((line, index) => {
  const [rawOrder, rawPos, rawMeaning, example, exampleKr, rawExtra = ""] = line.split("|");
  if ([rawOrder, rawPos, rawMeaning, example, exampleKr].some((v) => v === undefined)) throw new Error(`초안 ${index + 1}행 형식 오류`);
  const sourceOrder = Number(rawOrder);
  if (!Number.isInteger(sourceOrder) || sourceOrder < from || sourceOrder > to || seen.has(sourceOrder)) throw new Error(`초안 ${index + 1}행 순번 오류/중복`);
  seen.add(sourceOrder);
  const official = pool[sourceOrder - 1];
  if (!official) throw new Error(`공식 원천에 없는 순번: ${sourceOrder}`);
  const extra = Object.fromEntries(rawExtra.split(";").filter(Boolean).map((item) => item.split(":")));
  const list = (value) => value ? value.split(",").filter(Boolean) : [];
  return { id: `ev-moe2022-m-${String(sourceOrder).padStart(4, "0")}`, sourceTier: "middle", sourceMarker: "**", word: official.word, partOfSpeech: rawPos.split(",").filter(Boolean), meaningKr: rawMeaning.split(" / ").filter(Boolean), relatedForms: list(extra.rel), irregularForms: list(extra.irr), example, exampleKr, sourceOrder, setId: null, learningOrder: null };
});
if (cards.length !== 200 || seen.size !== 200) throw new Error(`배치 ${batch}은 정확히 200개여야 함 (현재 ${cards.length})`);
for (let order = from; order <= to; order += 1) if (!seen.has(order)) throw new Error(`공식 순번 누락: ${order}`);
writeFileSync(join(SRC, `middle-authoring-batch-${batch}.json`), JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`중등 배치 ${batch} 조립 완료: 공식 순번 ${from}~${to}`);
