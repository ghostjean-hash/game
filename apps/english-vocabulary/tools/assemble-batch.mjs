// 압축 AUTHORING 초안을 공식 원천 기반 리치 카드 JSON으로 조립한다.
// 사용: node tools/assemble-batch.mjs 02
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..");
const SRC = join(APP, "docs", "sources", "moe-2022-english");
const batchNo = (process.argv[2] || "").padStart(2, "0");
if (!/^\d{2}$/.test(batchNo) || batchNo === "00") throw new Error("배치번호를 지정하세요. 예: 02");

const from = (Number(batchNo) - 1) * 200 + 1;
const to = Number(batchNo) * 200;
const pool = JSON.parse(readFileSync(join(SRC, "elementary-800-cards.json"), "utf8"));
const draftPath = join(SRC, `authoring-batch-${batchNo}.draft.txt`);
const lines = readFileSync(draftPath, "utf8").split(/\r?\n/)
  .map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
const seen = new Set();
const cards = lines.map((line, index) => {
  const [rawOrder, rawPos, rawMeaning, example, exampleKr, rawExtra = ""] = line.split("|");
  if ([rawOrder, rawPos, rawMeaning, example, exampleKr].some((value) => value === undefined)) {
    throw new Error(`초안 ${index + 1}행 형식 오류: ${line}`);
  }
  const sourceOrder = Number(rawOrder);
  if (!Number.isInteger(sourceOrder) || sourceOrder < from || sourceOrder > to || seen.has(sourceOrder)) {
    throw new Error(`초안 ${index + 1}행 순번 오류/중복: ${rawOrder}`);
  }
  seen.add(sourceOrder);
  const official = pool[sourceOrder - 1];
  if (!official) throw new Error(`공식 원천에 없는 순번: ${sourceOrder}`);
  const extra = Object.fromEntries(rawExtra.split(";").filter(Boolean).map((item) => item.split(":")));
  const list = (value) => value ? value.split(",").filter(Boolean) : [];
  return {
    id: `ev-moe2022-e-${String(sourceOrder).padStart(4, "0")}`,
    sourceTier: "elementary",
    sourceMarker: "*",
    word: official.word,
    partOfSpeech: rawPos.split(",").filter(Boolean),
    meaningKr: rawMeaning.split(" / ").filter(Boolean),
    relatedForms: list(extra.rel),
    irregularForms: list(extra.irr),
    example,
    exampleKr,
    sourceOrder,
    setId: null,
    learningOrder: null,
  };
});
if (cards.length !== 200 || seen.size !== 200) throw new Error(`배치 ${batchNo}은 정확히 200개여야 함 (현재 ${cards.length})`);
for (let order = from; order <= to; order++) if (!seen.has(order)) throw new Error(`공식 순번 누락: ${order}`);
writeFileSync(join(SRC, `authoring-batch-${batchNo}.json`), JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`배치 ${batchNo} 조립 완료: 공식 순번 ${from}~${to}, ${cards.length}개`);
