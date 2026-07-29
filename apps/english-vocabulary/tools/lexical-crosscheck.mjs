// lexicalReference 실조회 교차 대조 (규칙 docs/vocab-authoring-rules.md §2·§9.1).
// 배치 카드의 품사·대표 뜻을 자유 라이선스 공개 사전 두 곳과 대조한다.
//   source A: en.wiktionary.org MediaWiki Action API (CC BY-SA / GFDL)
//   source B: api.datamuse.com (WordNet 기반 공개 정의 API)
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

const middle = process.argv.includes("--middle");
const high = process.argv.includes("--high");
const PREFIX = high ? "high-" : middle ? "middle-" : "";
const TIER_KR = high ? "고등 " : middle ? "중등 " : "";
const batchNo = (process.argv[2] || "01").padStart(2, "0");
const flags = new Set(process.argv.slice(3));
const wordFlag = process.argv.find((arg) => arg.startsWith("--words="));
const requestedWords = wordFlag ? new Set(wordFlag.slice("--words=".length).split(",").filter(Boolean)) : null;
const cards = JSON.parse(readFileSync(join(SRC, `${PREFIX}authoring-batch-${batchNo}.json`), "utf8"));
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
const cacheFile = (src) => join(CACHE_DIR, `${PREFIX}batch-${batchNo}-${src}.json`);
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
  const r = await getJson(`https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word)}&prop=wikitext&format=json&origin=*`, 2);
  if (r.status !== 200) return { status: r.status, entries: [] };
  const text = r.json?.parse?.wikitext?.["*"] || "";
  const entries = [];
  let pos = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^===\s*(Noun|Proper noun|Verb|Adjective|Adverb|Pronoun|Preposition|Conjunction|Determiner|Article|Interjection|Numeral|Number|Auxiliary verb)\s*===/i);
    if (h) { pos = h[1]; continue; }
    if (pos && /^#(?![#:*])\s*(.+)/.test(line)) {
      const def = line.replace(/^#\s*/, "").replace(/\{\{[^}]*\}\}/g, "").replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");
      const last = entries.at(-1);
      if (last?.pos === pos) last.defs.push(def); else entries.push({ pos, defs: [def] });
    }
  }
  return {
    status: 200,
    entries: entries.map((e) => ({ ...e, defs: e.defs.map(strip).filter(Boolean).slice(0, 3) })),
  };
}

// MediaWiki는 title을 최대 50개까지 한 요청으로 받을 수 있다. 40개 소묶음은
// 개별 40회보다 훨씬 낮은 부하로 같은 실제 Wiktionary 원문을 조회한다.
async function fetchABatch(words) {
  const titles = words.map(encodeURIComponent).join("|");
  const r = await getJson(`https://en.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*&titles=${titles}`, 2);
  if (r.status !== 200) return words.map((word) => ({ word, status: r.status, entries: [] }));
  const pages = Object.values(r.json?.query?.pages || {});
  return words.map((word) => {
    const page = pages.find((p) => p.title?.toLowerCase() === word.toLowerCase());
    const text = page?.revisions?.[0]?.slots?.main?.["*"] || "";
    const entries = [];
    let pos = null;
    for (const line of text.split(/\r?\n/)) {
      const h = line.match(/^={3,}\s*(Noun|Proper noun|Verb|Adjective|Adverb|Pronoun|Preposition|Conjunction|Determiner|Article|Interjection|Numeral|Number|Auxiliary verb)\s*={3,}/i);
      if (h) { pos = h[1]; continue; }
      if (pos && /^#(?![#:*])\s*(.+)/.test(line)) {
        const def = line.replace(/^#\s*/, "").replace(/\{\{[^}]*\}\}/g, "").replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");
        const last = entries.at(-1);
        if (last?.pos === pos) last.defs.push(def); else entries.push({ pos, defs: [def] });
      }
    }
    return { word, status: 200, entries: entries.map((e) => ({ ...e, defs: e.defs.map(strip).filter(Boolean).slice(0, 3) })) };
  });
}

async function collectABatches() {
  const cache = new Map(loadCache("wiktionary-action").map((r) => [r.word, r]));
  const todo = cards.map((c) => c.word).filter((w) => !(cache.get(w)?.status === 200));
  for (let i = 0; i < todo.length; i += 40) {
    const group = todo.slice(i, i + 40);
    console.log(`[wiktionary-action] ${i + 1}~${i + group.length}/${todo.length} 묶음 조회`);
    for (const row of await fetchABatch(group)) cache.set(row.word, row);
    writeFileSync(cacheFile("wiktionary-action"), JSON.stringify([...cache.values()], null, 1), "utf8");
  }
}

async function fetchB(word) {
  const r = await getJson(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d`, 2);
  if (r.status !== 200) return { status: r.status, entries: [] };
  if (!Array.isArray(r.json)) return { status: "SHAPE", entries: [] };
  const posMap = { n: "noun", v: "verb", adj: "adjective", adv: "adverb", prep: "preposition", conj: "conjunction", interj: "interjection", num: "numeral" };
  const defs = r.json.find((e) => e.word?.toLowerCase() === word.toLowerCase())?.defs || [];
  const byPos = new Map();
  for (const raw of defs) {
    const [tag, def] = raw.split("\t", 2);
    const pos = posMap[tag] || tag;
    if (!byPos.has(pos)) byPos.set(pos, []);
    if (def) byPos.get(pos).push(def.replace(/\s+/g, " ").trim());
  }
  const entries = [...byPos].map(([pos, defs]) => ({ pos, defs: defs.slice(0, 2) }));
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
  await collectABatches();
  await collect("datamuse", fetchB, 10, 80);
}

const A = new Map(loadCache("wiktionary-action").map((r) => [r.word, r]));
const B = new Map(loadCache("datamuse").map((r) => [r.word, r]));
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
  const out = join(SRC, `${PREFIX}lexical-crosscheck-batch-${batchNo}.md`);
  const lines = [
    `# 사전 교차 대조 근거 · ${TIER_KR}AUTHORING BATCH ${batchNo}`,
    "",
    "규칙 `docs/vocab-authoring-rules.md` §2의 `lexicalReference` 실조회 대조 기록. 재현: `node tools/lexical-crosscheck.mjs " + batchNo + " --fetch --report`.",
    "",
    "- source A: en.wiktionary.org MediaWiki Action API (CC BY-SA / GFDL)",
    "- source B: api.datamuse.com definitions endpoint (WordNet 기반 공개 정의 API)",
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
