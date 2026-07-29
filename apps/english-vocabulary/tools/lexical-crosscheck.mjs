// lexicalReference 실조회 교차 대조 (규칙 docs/vocab-authoring-rules.md §2·§9.1).
// 배치 카드의 품사·대표 뜻을 자유 라이선스 공개 사전 두 곳과 대조한다.
//   source A: en.wiktionary.org REST definition API   (CC BY-SA / GFDL)
//   source B: api.dictionaryapi.dev (Free Dictionary API, Wiktionary 파생)
//
// 사용:
//   node tools/lexical-crosscheck.mjs 01 --fetch     수집(캐시 채움, 속도 제한 대응 재시도 포함)
//   node tools/lexical-crosscheck.mjs 01             대조 결과 요약 출력
//   node tools/lexical-crosscheck.mjs 01 --report    근거 요약 md를 docs/sources/... 에 기록
//   node tools/lexical-crosscheck.mjs 01 --all       카드별 내 뜻 vs 사전 정의 전수 출력(사람 판정용)
//
// 자동 판정 범위는 "내가 적은 품사가 사전에 존재하는가"까지다. 대표 뜻이 초등 단계에 적절한지는
// 사전 정의를 사람이 읽고 판정한다(규칙 §2 - 공개 사전 대조했다는 이유만으로 자동 통과 금지).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..");
const SRC = join(APP, "docs", "sources", "moe-2022-english");
const CACHE_DIR = join(tmpdir(), "jarvis-vocab-lexical-cache");
const UA = { "User-Agent": "jarvis-vocab-crosscheck/1.0 (educational vocabulary verification)" };
const REQUEST_TIMEOUT_MS = 8_000;
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
// 위키 정의에는 태그 제거 후에도 파서 스타일 텍스트(.mw-parser-output …)가 꼬리로 남는다.
const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/\.mw-parser-output[\s\S]*$/, "").replace(/\s+/g, " ").trim();
const clean = (s) => s.replace(/\.mw-parser-output[\s\S]*$/, "").replace(/\s+/g, " ").trim();

const batchNo = (process.argv[2] || "01").padStart(2, "0");
const flags = new Set(process.argv.slice(3));
const wordFlag = process.argv.find((arg) => arg.startsWith("--words="));
const requestedWords = wordFlag ? new Set(wordFlag.slice("--words=".length).split(",").filter(Boolean)) : null;
const cards = JSON.parse(readFileSync(join(SRC, `authoring-batch-${batchNo}.json`), "utf8"));
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
const cacheFile = (src) => join(CACHE_DIR, `batch-${batchNo}-${src}.json`);
const loadCache = (src) => (existsSync(cacheFile(src)) ? JSON.parse(readFileSync(cacheFile(src), "utf8")) : []);

// 내 표기 -> 사전 표기(소문자). 조동사는 사전이 verb로, 한정사는 article/determiner/pronoun로 적는다.
const POS_MAP = {
  noun: ["noun", "proper noun"],
  verb: ["verb"],
  adjective: ["adjective"],
  adverb: ["adverb"],
  pronoun: ["pronoun"],
  preposition: ["preposition"],
  conjunction: ["conjunction"],
  determiner: ["determiner", "article", "pronoun", "adjective"],
  interjection: ["interjection", "exclamation"],
  auxiliary: ["verb", "auxiliary verb", "auxiliary"],
  number: ["numeral", "number"],
};

async function getJson(url, tries) {
  for (let i = 0; i < tries; i++) {
    try {
      const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const r = await fetch(url, { headers: UA, signal });
      if (r.status === 404) return { status: 404 };
      if (r.status === 429 || r.status >= 500) { await sleep(1500 * 2 ** i); continue; }
      if (!r.ok) return { status: r.status };
      return { status: 200, json: await r.json() };
    } catch (e) {
      if (i === tries - 1) return { status: "ERR", error: e.message };
      await sleep(1000 * (i + 1));
    }
  }
  return { status: "RATE_LIMITED" };
}

async function fetchA(word) {
  const r = await getJson(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, 2);
  if (r.status !== 200) return { status: r.status, entries: [] };
  return {
    status: 200,
    entries: (r.json.en || []).map((e) => ({
      pos: e.partOfSpeech,
      defs: (e.definitions || []).map((d) => strip(d.definition || "")).filter(Boolean).slice(0, 3),
    })),
  };
}

async function fetchB(word) {
  const r = await getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, 2);
  if (r.status !== 200) return { status: r.status, entries: [] };
  if (!Array.isArray(r.json)) return { status: "SHAPE", entries: [] };
  const entries = [];
  for (const e of r.json) {
    for (const m of e.meanings || []) {
      entries.push({
        pos: m.partOfSpeech,
        defs: (m.definitions || []).map((d) => (d.definition || "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 2),
      });
    }
  }
  return { status: 200, entries };
}

// 속도 제한이 호스트별로 다르므로 동시성·간격을 소스별로 따로 둔다.
async function collect(src, fetcher, conc, gap) {
  const cache = new Map(loadCache(src).map((r) => [r.word, r]));
  const todo = cards.map((c) => c.word).filter((w) => {
    if (requestedWords && !requestedWords.has(w)) return false;
    const p = cache.get(w);
    return !(p && (p.status === 200 || p.status === 404));
  });
  if (!todo.length) return cache;
  console.log(`[${src}] 조회 ${todo.length}건`);
  const queue = [...todo];
  let done = 0;
  const worker = async (id) => {
    await sleep(id * 200);
    while (queue.length) {
      const word = queue.shift();
      cache.set(word, { word, ...(await fetcher(word)) });
      writeFileSync(cacheFile(src), JSON.stringify([...cache.values()], null, 1), "utf8");
      if (++done % 25 === 0) {
        process.stderr.write(`[${src}] ${done}/${todo.length}\n`);
      }
      await sleep(gap);
    }
  };
  await Promise.all(Array.from({ length: conc }, (_, i) => worker(i)));
  writeFileSync(cacheFile(src), JSON.stringify([...cache.values()], null, 1), "utf8");
  const ok = [...cache.values()].filter((r) => r.status === 200 && r.entries?.length);
  console.log(`[${src}] 확보 ${ok.length}/${cards.length}`);
  return cache;
}

if (flags.has("--fetch")) {
  await collect("wiktionary", fetchA, 6, 250);
  await collect("dictionaryapi", fetchB, 6, 150);
}

const A = new Map(loadCache("wiktionary").map((r) => [r.word, r]));
const B = new Map(loadCache("dictionaryapi").map((r) => [r.word, r]));
if (!A.size && !B.size) {
  console.error("캐시가 비어 있음. 먼저 --fetch 로 수집할 것.");
  process.exit(2);
}

const posOf = (r) => (r?.status === 200 && r.entries?.length ? [...new Set(r.entries.map((e) => e.pos.toLowerCase()))] : null);
const defsOf = (r, want) => {
  if (r?.status !== 200 || !r.entries?.length) return [];
  const hit = r.entries.filter((e) => want.has(e.pos.toLowerCase()));
  return (hit.length ? hit : r.entries).slice(0, 2).map((e) => `${e.pos}: ${clean(e.defs[0] || "").slice(0, 110)}`);
};

const rows = cards.map((c) => {
  const a = posOf(A.get(c.word));
  const b = posOf(B.get(c.word));
  const want = new Set(c.partOfSpeech.flatMap((p) => POS_MAP[p] || []));
  const union = [...new Set([...(a || []), ...(b || [])])];
  return {
    c, a, b,
    miss: c.partOfSpeech.filter((p) => !(POS_MAP[p] || []).some((d) => union.includes(d))),
    coverage: a && b ? "AB" : a ? "A" : b ? "B" : "none",
    defsA: defsOf(A.get(c.word), want),
    defsB: defsOf(B.get(c.word), want),
  };
});

const cov = rows.reduce((m, r) => ((m[r.coverage] = (m[r.coverage] || 0) + 1), m), {});
const bad = rows.filter((r) => r.miss.length || r.coverage === "none");
console.log(`배치 ${batchNo}: 카드 ${cards.length}개`);
console.log(`대조 근거 - 두 사전 ${cov.AB || 0} / 영어 위키낱말사전만 ${cov.A || 0} / 다른 사전만 ${cov.B || 0} / 없음 ${cov.none || 0}`);
console.log(`품사 불일치 또는 근거 없음: ${bad.length}건`);
for (const r of bad) {
  console.log(`  ${String(r.c.sourceOrder).padStart(3, "0")} ${r.c.word} - 내 표기 [${r.c.partOfSpeech.join("/")}] / A [${r.a?.join(", ") || "-"}] / B [${r.b?.join(", ") || "-"}]`);
  [...r.defsA, ...r.defsB].slice(0, 3).forEach((d) => console.log(`       ${d}`));
}

if (flags.has("--all")) {
  console.log("\n=== 카드별 내 뜻 vs 사전 정의 (사람 판정용) ===");
  for (const r of rows) {
    console.log(`${String(r.c.sourceOrder).padStart(3, "0")} ${r.c.word} [${r.c.partOfSpeech.join("/")}] "${r.c.meaningKr.join(" / ")}" <${r.coverage}>`);
    (r.defsA.length ? r.defsA : r.defsB).forEach((d) => console.log(`     ${d}`));
  }
}

if (flags.has("--report")) {
  const out = join(SRC, `lexical-crosscheck-batch-${batchNo}.md`);
  const lines = [
    `# 사전 교차 대조 근거 · AUTHORING BATCH ${batchNo}`,
    "",
    "규칙 `docs/vocab-authoring-rules.md` §2의 `lexicalReference` 실조회 대조 기록. 재현: `node tools/lexical-crosscheck.mjs " + batchNo + " --fetch --report`.",
    "",
    "- source A: en.wiktionary.org REST definition API (CC BY-SA / GFDL)",
    "- source B: api.dictionaryapi.dev (Free Dictionary API, Wiktionary 파생 - 계보가 A와 겹치므로 완전 독립 검증은 아니다)",
    "- 정의 문장은 사실 확인 근거로만 쓰고 카드에 복사하지 않는다(규칙 §2 저작권).",
    "",
    `대조 근거: 두 사전 ${cov.AB || 0}건 / 영어 위키낱말사전만 ${cov.A || 0}건 / 다른 사전만 ${cov.B || 0}건 / 없음 ${cov.none || 0}건. 품사 불일치 ${bad.length}건.`,
    "",
    "| # | 단어 | 내 품사 | 사전 품사(A ∪ B) | 내 대표 뜻 | 대조 근거 정의(발췌) |",
    "|---|---|---|---|---|---|",
  ];
  for (const r of rows) {
    const union = [...new Set([...(r.a || []), ...(r.b || [])])].join(", ") || "-";
    const def = (r.defsA[0] || r.defsB[0] || "").replace(/\|/g, "/").slice(0, 100);
    lines.push(`| ${String(r.c.sourceOrder).padStart(3, "0")} | ${r.c.word} | ${r.c.partOfSpeech.join("/")} | ${union} | ${r.c.meaningKr.join(" / ")} | ${def} |`);
  }
  writeFileSync(out, lines.join("\n") + "\n", "utf8");
  console.log(`근거 요약 기록: ${out}`);
}

process.exit(bad.length ? 1 : 0);
