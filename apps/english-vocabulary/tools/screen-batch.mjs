// 제작 배치 내용 스크리닝 (기계로 잡히는 것만 전수, 사람 판정 대상 좁히기 목적)
// validate-batch.mjs = 스키마·형식 게이트. 이 파일 = 내용 품질 의심 후보 추출.
// 근거: docs/NEXT-authoring-batch-01.md "다음 배치 비용 절감 방식" 3·4항(기계 분석 요약 우선).
// 사용: node tools/screen-batch.mjs            (01~04 전체)
//       node tools/screen-batch.mjs 02         (한 배치)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "docs", "sources", "moe-2022-english");

const only = process.argv[2] ? process.argv[2].padStart(2, "0") : null;
const batchNos = only ? [only] : ["01", "02", "03", "04"];

const cards = [];
for (const n of batchNos) {
  const rows = JSON.parse(readFileSync(join(SRC, `authoring-batch-${n}.json`), "utf8"));
  for (const c of rows) cards.push({ ...c, batch: n });
}

// 공식 800 풀 = 예문에 쓸 수 있는 어휘 기준(이 밖의 단어는 초등 적합성 사람 판정 대상)
const pool = JSON.parse(readFileSync(join(SRC, "elementary-800-cards.json"), "utf8"));
const known = new Set();
const addForms = (w) => {
  const b = w.toLowerCase();
  known.add(b);
  known.add(b + "s"); known.add(b + "es"); known.add(b + "ed"); known.add(b + "d");
  known.add(b + "ing"); known.add(b + "er"); known.add(b + "est"); known.add(b + "ly");
  known.add(b + "'s"); known.add(b + "n't");
  if (/[^aeiou]y$/.test(b)) { known.add(b.slice(0, -1) + "ies"); known.add(b.slice(0, -1) + "ied"); known.add(b.slice(0, -1) + "ier"); known.add(b.slice(0, -1) + "iest"); }
  if (/e$/.test(b)) { known.add(b.slice(0, -1) + "ing"); known.add(b.slice(0, -1) + "ed"); }
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(b)) { known.add(b + b.slice(-1) + "ing"); known.add(b + b.slice(-1) + "ed"); known.add(b + b.slice(-1) + "er"); }
};
for (const c of pool) addForms(c.word);
for (const c of cards) {
  addForms(c.word);
  for (const f of c.relatedForms || []) addForms(f);
  for (const f of c.irregularForms || []) addForms(f);
}
// 초등 예문에 불가피한 기능어·축약형(공식 풀 밖이지만 정상)
for (const w of ["am", "is", "are", "was", "were", "be", "been", "being", "do", "does", "did", "done",
  "have", "has", "had", "will", "would", "can", "could", "should", "may", "might", "must",
  "i", "im", "me", "my", "mine", "you", "your", "yours", "he", "him", "his", "she", "her", "hers",
  "it", "its", "we", "us", "our", "ours", "they", "them", "their", "theirs", "this", "that", "these", "those",
  "a", "an", "the", "not", "no", "yes", "and", "or", "but", "so", "if", "than", "then", "there", "here",
  "to", "of", "in", "on", "at", "for", "with", "from", "by", "up", "down", "out", "very", "too", "also",
  "what", "who", "where", "when", "why", "how", "which", "some", "any", "all", "let", "lets",
  "dont", "doesnt", "didnt", "isnt", "arent", "wasnt", "cant", "wont", "ill", "im", "ive", "id",
  "hes", "shes", "its", "theyre", "youre", "were", "well", "thats", "whats", "lets"]) known.add(w);

const tokens = (s) => s.toLowerCase().replace(/[^a-z' -]/g, " ").split(/[\s-]+/).filter(Boolean).map((t) => t.replace(/^'+|'+$/g, ""));

const out = { oov: [], transMismatch: [], dupMeaning: [], template: [], oddForm: [], dupExample: [] };

// 1. 예문 어휘가 공식 풀 밖(초등 난이도 이탈 후보)
for (const c of cards) {
  const bad = tokens(c.example).filter((t) => t && !known.has(t));
  if (bad.length) out.oov.push({ o: c.sourceOrder, w: c.word, ex: c.example, bad });
}

// 2. 뜻이 예문 번역에 안 보임(뜻↔예문 불일치 후보). 한국어 어간 2자 대조.
const stems = (m) => {
  const s = m.replace(/\(.*?\)/g, "").replace(/[~\/]/g, " ").trim();
  return s.split(/\s+/).filter((x) => x.length >= 2).map((x) => x.replace(/(하다|되다|이다|시키다|하는|한|의|을|를|에|로)$/, "")).filter((x) => x.length >= 2);
};
for (const c of cards) {
  const kr = c.exampleKr || "";
  const hit = (c.meaningKr || []).some((m) => {
    const st = stems(m);
    return st.length === 0 || st.some((x) => kr.includes(x.slice(0, 2)));
  });
  if (!hit) out.transMismatch.push({ o: c.sourceOrder, w: c.word, m: c.meaningKr, kr });
}

// 3. 서로 다른 단어가 완전히 같은 뜻(학습 시 구별 불가 후보)
const byMeaning = new Map();
for (const c of cards) {
  const key = (c.meaningKr || []).join("/");
  if (!byMeaning.has(key)) byMeaning.set(key, []);
  byMeaning.get(key).push(c);
}
for (const [k, list] of byMeaning) {
  if (list.length > 1) out.dupMeaning.push({ m: k, words: list.map((c) => `${c.sourceOrder}:${c.word}`) });
}

// 4. 예문 골격 반복(목표 단어를 지운 문형 빈도)
const skel = new Map();
for (const c of cards) {
  const s = c.example.toLowerCase().replace(new RegExp(`\\b${c.word.toLowerCase()}\\w*\\b`, "g"), "_").replace(/[.!?]/g, "").trim();
  if (!skel.has(s)) skel.set(s, []);
  skel.get(s).push(c.sourceOrder);
}
for (const [s, list] of skel) if (list.length >= 3) out.template.push({ s, n: list.length, orders: list });

// 5. 예문 중복(완전 동일)
const byEx = new Map();
for (const c of cards) {
  const k = c.example.toLowerCase();
  if (!byEx.has(k)) byEx.set(k, []);
  byEx.get(k).push(c.sourceOrder);
}
for (const [k, list] of byEx) if (list.length > 1) out.dupExample.push({ ex: k, orders: list });

// 6. 표기 이상(대문자 시작·종결부호·뜻 서식·번역 종결)
for (const c of cards) {
  const p = [];
  if (!/^[A-Z"]/.test(c.example)) p.push("예문 대문자 시작 아님");
  if (!/[.!?"]$/.test(c.example)) p.push("예문 종결부호 없음");
  if (!/[.!?"]$/.test(c.exampleKr || "")) p.push("번역 종결부호 없음");
  if (/[a-zA-Z]{3,}/.test((c.exampleKr || "").replace(/[A-Z][a-z]+/g, ""))) p.push("번역에 영어 잔존");
  for (const m of c.meaningKr || []) {
    if (/[.,;]$/.test(m)) p.push(`뜻 종결부호: ${m}`);
    if (m.length > 12) p.push(`뜻 과길이: ${m}`);
  }
  if ((c.relatedForms || []).some((f) => f === c.word)) p.push("relatedForms에 표제어 자신");
  if (p.length) out.oddForm.push({ o: c.sourceOrder, w: c.word, p });
}

const cap = (arr, n) => arr.slice(0, n);
console.log(`검사 카드 ${cards.length}개 (배치 ${batchNos.join(",")})`);
console.log(`\n[1] 예문에 공식 풀 밖 단어 사용: ${out.oov.length}건`);
const oovFreq = new Map();
for (const r of out.oov) for (const b of r.bad) oovFreq.set(b, (oovFreq.get(b) || 0) + 1);
console.log("   빈도순 어휘:", [...oovFreq.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}(${n})`).join(" "));
for (const r of cap(out.oov, 60)) console.log(`   ${r.o} ${r.w} | ${r.ex} | 밖: ${r.bad.join(",")}`);
if (out.oov.length > 60) console.log(`   ... 외 ${out.oov.length - 60}건`);

console.log(`\n[2] 뜻이 예문 번역에 안 보임: ${out.transMismatch.length}건`);
for (const r of cap(out.transMismatch, 60)) console.log(`   ${r.o} ${r.w} [${r.m.join("/")}] | ${r.kr}`);
if (out.transMismatch.length > 60) console.log(`   ... 외 ${out.transMismatch.length - 60}건`);

console.log(`\n[3] 뜻 완전 중복 그룹: ${out.dupMeaning.length}건`);
for (const r of cap(out.dupMeaning, 40)) console.log(`   [${r.m}] ${r.words.join(" ")}`);
if (out.dupMeaning.length > 40) console.log(`   ... 외 ${out.dupMeaning.length - 40}건`);

console.log(`\n[4] 예문 문형 3회 이상 반복: ${out.template.length}건`);
for (const r of cap(out.template.sort((a, b) => b.n - a.n), 25)) console.log(`   x${r.n} "${r.s}" (${r.orders.slice(0, 8).join(",")}${r.orders.length > 8 ? "..." : ""})`);
if (out.template.length > 25) console.log(`   ... 외 ${out.template.length - 25}건`);

console.log(`\n[5] 예문 완전 중복: ${out.dupExample.length}건`);
for (const r of cap(out.dupExample, 20)) console.log(`   ${r.orders.join(",")} | ${r.ex}`);

console.log(`\n[6] 표기 이상: ${out.oddForm.length}건`);
for (const r of cap(out.oddForm, 40)) console.log(`   ${r.o} ${r.w} | ${r.p.join(" / ")}`);
if (out.oddForm.length > 40) console.log(`   ... 외 ${out.oddForm.length - 40}건`);

// 길이 분포(요약만)
const lens = cards.map((c) => tokens(c.example).length);
const dist = {};
for (const l of lens) dist[l] = (dist[l] || 0) + 1;
console.log(`\n[7] 예문 길이 분포:`, Object.entries(dist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}단어:${v}`).join(" "));
