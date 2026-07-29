// 학교급(층) 사이 중복 점검. 같은 층 안은 crossbatch-check.mjs가 본다.
// 초등 800 / 중등 1,200 / 고등 1,000은 서로 다른 세트로 학습되므로 같은 단어·예문·번역이 있으면 안 되고,
// 한글 뜻이 같은 경우는 동의어(정상)와 동음이의(뜻이 안 통함)를 사람이 갈라야 한다.
// 사용: node tools/tier-cross-check.mjs high        (고등을 초등·중등과 대조)
//       node tools/tier-cross-check.mjs middle
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "docs", "sources", "moe-2022-english");

const TIERS = {
  elementary: { prefix: "", batches: ["01", "02", "03", "04"] },
  middle: { prefix: "middle-", batches: ["01", "02", "03", "04", "05", "06"] },
  high: { prefix: "high-", batches: ["01", "02", "03", "04", "05"] },
};

const loadTier = (tier) => {
  const { prefix, batches } = TIERS[tier];
  const rows = [];
  for (const n of batches) {
    const f = join(SRC, `${prefix}authoring-batch-${n}.json`);
    if (existsSync(f)) for (const c of JSON.parse(readFileSync(f, "utf8"))) rows.push({ ...c, tier, batch: n });
  }
  return rows;
};

const target = process.argv[2] || "high";
if (!TIERS[target]) { console.error("층은 elementary / middle / high 중 하나"); process.exit(2); }
const mine = loadTier(target);
const others = Object.keys(TIERS).filter((t) => t !== target).flatMap(loadTier);

const norm = (s) => String(s).replace(/\s+/g, " ").trim().toLowerCase();
const idx = (rows, key) => {
  const m = new Map();
  for (const c of rows) m.set(norm(c[key]), c);
  return m;
};
const oWord = idx(others, "word"), oEx = idx(others, "example"), oKr = idx(others, "exampleKr");
const oMean = new Map();
for (const c of others) for (const m of c.meaningKr) if (!oMean.has(m)) oMean.set(m, c);

const hard = [], soft = [];
for (const c of mine) {
  const w = oWord.get(norm(c.word));
  if (w) hard.push(`단어 중복 ${c.word} (${c.tier} ↔ ${w.tier})`);
  const e = oEx.get(norm(c.example));
  if (e) hard.push(`예문 중복 ${c.word} "${c.example}" ↔ ${e.tier} ${e.word}`);
  const k = oKr.get(norm(c.exampleKr));
  if (k) hard.push(`번역 중복 ${c.word} "${c.exampleKr}" ↔ ${k.tier} ${k.word}`);
  for (const m of c.meaningKr) {
    const o = oMean.get(m);
    if (o) soft.push(`"${m}" : ${target} ${c.word} ↔ ${o.tier} ${o.word}`);
  }
}

console.log(`${target} 카드 ${mine.length}개 / 다른 층 ${others.length}개와 대조`);
console.log(`■ 반드시 고쳐야 하는 중복(단어·예문·번역): ${hard.length}건`);
for (const h of hard) console.log("   " + h);
console.log(`■ 뜻 문자열이 같은 것: ${soft.length}건 (동의어면 정상, 뜻이 안 통하면 수정 - 사람 판정)`);
for (const s of soft) console.log("   " + s);
process.exit(hard.length ? 1 : 0);
