// 중등 배치 간 내용 중복 점검 (validate-batch는 배치 내부 형식만 본다).
// 뜻·예문·번역이 이미 만든 다른 배치와 겹치는지, 예문이 목표 단어 뜻과 어긋날 소지가 있는지 후보를 뽑는다.
// 사용: node tools/middle-crossbatch-check.mjs 03            (03을 01·02와 대조)
//       node tools/middle-crossbatch-check.mjs 03 01 02 04   (대조 대상 명시)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "docs", "sources", "moe-2022-english");
const load = (n) => {
  const f = join(SRC, `middle-authoring-batch-${n}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
};

const target = (process.argv[2] || "03").padStart(2, "0");
const others = process.argv.slice(3).length
  ? process.argv.slice(3).map((n) => n.padStart(2, "0"))
  : ["01", "02", "03", "04", "05", "06"].filter((n) => n !== target);

const cards = load(target);
if (!cards) { console.error(`배치 ${target} 없음`); process.exit(2); }

const prev = [];
for (const n of others) {
  const rows = load(n);
  if (rows) for (const c of rows) prev.push({ ...c, batch: n });
}

const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
const meaningMap = new Map();
const exampleMap = new Map();
const krMap = new Map();
for (const c of prev) {
  for (const m of c.meaningKr) {
    if (!meaningMap.has(norm(m))) meaningMap.set(norm(m), []);
    meaningMap.get(norm(m)).push(`${c.batch}:${c.word}`);
  }
  exampleMap.set(norm(c.example), `${c.batch}:${c.word}`);
  krMap.set(norm(c.exampleKr), `${c.batch}:${c.word}`);
}

const hits = [];
// 1. 다른 배치와의 뜻·예문·번역 중복
for (const c of cards) {
  for (const m of c.meaningKr) {
    const prior = meaningMap.get(norm(m));
    if (prior) hits.push(`뜻 중복  ${c.sourceOrder} ${c.word} "${m}" <- ${prior.join(", ")}`);
  }
  if (exampleMap.has(norm(c.example))) hits.push(`예문 중복 ${c.sourceOrder} ${c.word} <- ${exampleMap.get(norm(c.example))}`);
  if (krMap.has(norm(c.exampleKr))) hits.push(`번역 중복 ${c.sourceOrder} ${c.word} <- ${krMap.get(norm(c.exampleKr))}`);
}

// 2. 이 배치 내부 중복
const seenM = new Map(), seenE = new Map(), seenK = new Map();
for (const c of cards) {
  for (const m of c.meaningKr) {
    if (seenM.has(norm(m))) hits.push(`내부 뜻 중복 ${c.sourceOrder} ${c.word} "${m}" <- ${seenM.get(norm(m))}`);
    else seenM.set(norm(m), c.word);
  }
  if (seenE.has(norm(c.example))) hits.push(`내부 예문 중복 ${c.sourceOrder} ${c.word} <- ${seenE.get(norm(c.example))}`);
  else seenE.set(norm(c.example), c.word);
  if (seenK.has(norm(c.exampleKr))) hits.push(`내부 번역 중복 ${c.sourceOrder} ${c.word} <- ${seenK.get(norm(c.exampleKr))}`);
  else seenK.set(norm(c.exampleKr), c.word);
}

// 3. 번역에 뜻의 핵심 어간이 안 보이는 카드(예문과 뜻이 어긋날 후보, 사람 판정용)
const stem = (m) => m.replace(/[,·].*$/, "").replace(/(하다|되다|시키다|이다|의|한|인|적인|스러운|을|를|에|게)$/u, "").trim();
const suspect = [];
for (const c of cards) {
  const core = stem(c.meaningKr[0]);
  if (core.length >= 2 && !c.exampleKr.includes(core)) suspect.push(`${c.sourceOrder} ${c.word} 뜻 "${c.meaningKr[0]}" / 번역 "${c.exampleKr}"`);
}

console.log(`배치 ${target}: 카드 ${cards.length}개, 대조 대상 ${others.filter((n) => load(n)).join(",") || "없음"} (${prev.length}개)`);
console.log(`중복 ${hits.length}건`);
for (const h of hits) console.log("  " + h);
console.log(`뜻-번역 어간 불일치 후보 ${suspect.length}건 (사람 판정)`);
for (const s of suspect) console.log("  " + s);

const lens = cards.map((c) => c.example.trim().split(/\s+/).length);
const dist = lens.reduce((m, n) => ((m[n] = (m[n] || 0) + 1), m), {});
console.log("예문 길이 분포: " + Object.entries(dist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}단어 ${v}`).join(" / "));
process.exit(hits.length ? 1 : 0);
