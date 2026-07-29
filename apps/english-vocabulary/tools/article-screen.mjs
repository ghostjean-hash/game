// 예문 관사·수 누락 후보 추출 (기계로 좁히고 사람이 판정).
// 목표 단어가 단수 명사인데 앞쪽에 한정사가 안 보이면 "a/an/the 누락" 의심 후보로 올린다.
// 불가산 명사(water, advice …)와 복수는 정상이라 오탐이 섞인다 - 목록은 사람 확인용이다.
// 사용: node tools/article-screen.mjs --middle 03 04 05 06   /   node tools/article-screen.mjs --high 01
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "docs", "sources", "moe-2022-english");

const DET = new Set([
  "a", "an", "the", "this", "that", "these", "those", "my", "your", "his", "her", "its", "our", "their",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "some", "any", "no",
  "every", "each", "many", "few", "several", "most", "another", "both", "all", "much", "little", "other",
  "which", "what", "whose", "half", "twenty", "fifty", "hundred", "thousand",
]);
// 셀 수 없는 뜻으로 쓰이는 것이 자연스러운 표제어(오탐 억제)
const UNCOUNTABLE = new Set([
  "finance", "furniture", "fur", "grocery", "health", "heaven", "hell", "honey", "humor", "hunger",
  "income", "industry", "influence", "iron", "justice", "knowledge", "labor", "language", "law", "glory",
  "grace", "guilt", "fog", "flow", "harm", "help", "joy", "life", "love", "luck", "milk", "money",
  "music", "noise", "peace", "pepper", "politics", "pork", "powder", "practice", "pride", "privacy",
  "progress", "quality", "rice", "sex", "shame", "silver", "smoke", "soil", "steam", "steel", "stock",
  "stress", "stuff", "sugar", "sunlight", "technology", "time", "tin", "trade", "traffic", "trust",
  "truth", "water", "weather", "wool", "work", "research", "relief", "respect", "rest", "safety",
  "self", "sight", "space", "speech", "spirit", "structure", "success", "technique", "tea", "toast",
  "tradition", "transport", "value", "vision", "wage", "half", "sort", "past", "text", "total", "sum",
]);

const high = process.argv.includes("--high");
const PREFIX = high ? "high-" : "middle-";
const argv = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const batches = argv.length ? argv : (high ? ["01","02","03","04","05"] : ["01","02","03","04","05","06"]);
const rows = [];
for (const n of batches) {
  const f = join(SRC, `${PREFIX}authoring-batch-${n.padStart(2, "0")}.json`);
  if (!existsSync(f)) continue;
  for (const c of JSON.parse(readFileSync(f, "utf8"))) rows.push({ ...c, batch: n });
}

const hits = [];
for (const c of rows) {
  if (!c.partOfSpeech.includes("noun")) continue;
  if (UNCOUNTABLE.has(c.word)) continue;
  const tokens = c.example.replace(/[.,!?]/g, "").split(/\s+/);
  const lower = tokens.map((t) => t.toLowerCase());
  const at = lower.indexOf(c.word.toLowerCase());
  if (at < 0) continue; // 복수형 등으로 원형이 없으면 통과 처리(별도 검사 대상 아님)
  const before = lower.slice(Math.max(0, at - 3), at);
  if (before.some((t) => DET.has(t))) continue;
  hits.push(`${c.batch} ${String(c.sourceOrder).padStart(4, "0")} ${c.word} : ${c.example}`);
}

console.log(`검사 ${rows.length}개 중 한정사 누락 의심 ${hits.length}건`);
for (const h of hits) console.log("  " + h);
