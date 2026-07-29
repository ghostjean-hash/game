// AUTHORING BATCH 검증기 (제작 배치 리치 스키마 전용)
// 앱 스키마 검증은 validate-data.mjs. 이 파일은 docs/sources/moe-2022-english/authoring-batch-NN.json 검사.
// 규칙 근거: docs/vocab-authoring-rules.md §4.2(품사 허용값) §5.1(relatedForms 최대 2) §6.2(예문 길이) §7.1(id 형식) §8(스키마)
// 사용: node apps/english-vocabulary/tools/validate-batch.mjs [배치번호]   (기본 01)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..");
const SRC = join(APP, "docs", "sources", "moe-2022-english");

const POS_ALLOWED = new Set([
  "noun", "verb", "adjective", "adverb", "pronoun", "preposition",
  "conjunction", "determiner", "interjection", "auxiliary", "number",
]);

const EXAMPLE_MIN = 4;
const EXAMPLE_MAX_WARN = 10; // 권장 상한
const EXAMPLE_MAX_ERR = 12; // 절대 상한
const MEANING_MAX = 2;
const RELATED_MAX = 2;

const middle = process.argv.includes("--middle");
const high = process.argv.includes("--high");
const TIER = high ? "high" : middle ? "middle" : "elementary";
const PREFIX = high ? "high-" : middle ? "middle-" : "";
const ID_PREFIX = high ? "ev-moe2022-h" : middle ? "ev-moe2022-m" : "ev-moe2022-e";
const MARKER = high ? "" : middle ? "**" : "*";
const POOL_FILE = high ? "high-1000-cards.json" : middle ? "middle-1200-cards.json" : "elementary-800-cards.json";
const TIER_KR = high ? "고등" : middle ? "중등" : "초등";
const batchNo = (process.argv[2] || "01").padStart(2, "0");
const batchFile = join(SRC, `${PREFIX}authoring-batch-${batchNo}.json`);

const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`[${id}] ${msg}`);
const warn = (id, msg) => warnings.push(`[${id}] ${msg}`);

// 1. 공식 카드 풀 로드 (단어·별표의 유일 근거)
const pool = JSON.parse(readFileSync(join(SRC, POOL_FILE), "utf8"));
const poolByOrder = new Map(pool.map((c, i) => [i + 1, c]));
const poolWords = new Set(pool.map((c) => c.word));

// 2. 배치 로드
let batch;
try {
  batch = JSON.parse(readFileSync(batchFile, "utf8"));
} catch (e) {
  console.error(`배치 파일을 읽을 수 없음: ${batchFile}\n${e.message}`);
  process.exit(2);
}
if (!Array.isArray(batch)) {
  console.error("배치 루트는 카드 배열이어야 함");
  process.exit(2);
}

// 예문에 목표 단어(또는 활용형)가 포함됐는지 - 휴리스틱. 불규칙 활용은 걸러지지 않아 warning 처리.
function containsTarget(example, word) {
  const tokens = example.toLowerCase().match(/[a-z']+/g) || [];
  const w = word.toLowerCase();
  if (tokens.includes(w)) return true;
  const stems = new Set([w]);
  stems.add(w + "s");
  stems.add(w + "es");
  stems.add(w + "ed");
  stems.add(w + "d");
  stems.add(w + "ing");
  stems.add(w + "er");
  stems.add(w + "est");
  stems.add(w + "ly");
  if (w.endsWith("e")) {
    const base = w.slice(0, -1);
    stems.add(base + "ed");
    stems.add(base + "ing");
    stems.add(base + "er");
    stems.add(base + "est");
  }
  if (w.endsWith("y")) {
    const base = w.slice(0, -1);
    stems.add(base + "ies");
    stems.add(base + "ied");
    stems.add(base + "ier");
    stems.add(base + "iest");
  }
  const last = w.at(-1);
  if (w.length >= 3 && !"aeiou".includes(last)) {
    stems.add(w + last + "ed");
    stems.add(w + last + "ing");
    stems.add(w + last + "er");
  }
  return tokens.some((t) => stems.has(t));
}

const seenIds = new Set();
const seenWords = new Set();
const posCount = new Map();

for (const card of batch) {
  const id = card.id || "(id 없음)";

  // id 형식·중복
  const idPrefix = ID_PREFIX;
  if (!new RegExp(`^${idPrefix}-\\d{4}$`).test(card.id || "")) err(id, `id 형식 위반 (${idPrefix}-NNNN 이어야 함)`);
  if (seenIds.has(card.id)) err(id, "id 중복");
  seenIds.add(card.id);

  // sourceOrder ↔ id 일치 + 공식 표제어 대조
  const order = card.sourceOrder;
  if (!Number.isInteger(order) || order < 1 || order > pool.length) {
    err(id, `sourceOrder 범위 오류: ${order}`);
  } else {
    const expectedId = `${idPrefix}-${String(order).padStart(4, "0")}`;
    if (card.id !== expectedId) err(id, `id와 sourceOrder 불일치 (기대 ${expectedId})`);
    const official = poolByOrder.get(order);
    if (official && official.word !== card.word) {
      err(id, `공식 표제어 불일치: 배치 "${card.word}" vs 공식(order ${order}) "${official.word}"`);
    }
  }
  if (!poolWords.has(card.word)) err(id, `공식 ${TIER_KR} 카드 풀에 없는 단어: "${card.word}"`);
  if (seenWords.has(card.word)) err(id, `단어 중복: "${card.word}"`);
  seenWords.add(card.word);

  // 고정 필드
  if (card.sourceTier !== TIER) err(id, `sourceTier는 "${TIER}" 고정`);
  if (card.sourceMarker !== MARKER) err(id, `sourceMarker는 "${MARKER}" 고정`);
  if (card.setId !== null) err(id, "setId는 이 단계에서 null 이어야 함 (학습 세트 미확정)");
  if (card.learningOrder !== null) err(id, "learningOrder는 이 단계에서 null 이어야 함");

  // 품사
  if (!Array.isArray(card.partOfSpeech) || card.partOfSpeech.length === 0) {
    err(id, "partOfSpeech 비어 있음");
  } else {
    for (const p of card.partOfSpeech) {
      if (!POS_ALLOWED.has(p)) err(id, `허용 외 품사: "${p}"`);
      posCount.set(p, (posCount.get(p) || 0) + 1);
    }
  }

  // 대표 뜻
  if (!Array.isArray(card.meaningKr) || card.meaningKr.length === 0) {
    err(id, "meaningKr 비어 있음");
  } else {
    if (card.meaningKr.length > MEANING_MAX) err(id, `meaningKr ${card.meaningKr.length}개 (최대 ${MEANING_MAX})`);
    for (const m of card.meaningKr) {
      if (typeof m !== "string" || !m.trim()) err(id, "meaningKr에 빈 값");
      else if (m !== m.trim()) err(id, `meaningKr 앞뒤 공백: "${m}"`);
      else if (m.length > 20) warn(id, `뜻이 김(사전식 설명 의심): "${m}"`);
    }
  }

  // 관련형·불규칙형
  for (const key of ["relatedForms", "irregularForms"]) {
    if (!Array.isArray(card[key])) err(id, `${key}는 배열이어야 함`);
  }
  if (Array.isArray(card.relatedForms) && card.relatedForms.length > RELATED_MAX) {
    err(id, `relatedForms ${card.relatedForms.length}개 (최대 ${RELATED_MAX})`);
  }

  // 예문
  if (typeof card.example !== "string" || !card.example.trim()) {
    err(id, "example 비어 있음");
  } else {
    const words = card.example.trim().split(/\s+/);
    if (words.length > EXAMPLE_MAX_ERR) err(id, `예문 ${words.length}단어 (절대 상한 ${EXAMPLE_MAX_ERR})`);
    else if (words.length > EXAMPLE_MAX_WARN) warn(id, `예문 ${words.length}단어 (권장 ${EXAMPLE_MAX_WARN} 초과)`);
    if (words.length < EXAMPLE_MIN) warn(id, `예문 ${words.length}단어 (권장 최소 ${EXAMPLE_MIN})`);
    if (!/[.!?]$/.test(card.example.trim())) warn(id, "예문 끝 문장부호 없음");
    if (!containsTarget(card.example, card.word)) {
      warn(id, `예문에 목표 단어 미포함(활용형 휴리스틱 미탐지, 사람 검수): "${card.example}"`);
    }
  }
  if (typeof card.exampleKr !== "string" || !card.exampleKr.trim()) {
    err(id, "exampleKr 비어 있음");
  } else if (!/[가-힣]/.test(card.exampleKr)) {
    err(id, "exampleKr에 한글 없음");
  }
}

// 3. 배치 범위 검사 (배치 01 = sourceOrder 1~200)
const expectedFrom = (Number(batchNo) - 1) * 200 + 1;
const expectedTo = Number(batchNo) * 200;
const orders = batch.map((c) => c.sourceOrder).filter(Number.isInteger).sort((a, b) => a - b);
if (batch.length !== 200) {
  err("배치", `카드 ${batch.length}개 (배치당 200 기대)`);
}
const missing = [];
for (let o = expectedFrom; o <= expectedTo; o++) if (!orders.includes(o)) missing.push(o);
if (missing.length) err("배치", `누락 sourceOrder ${missing.length}건: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? " …" : ""}`);

// 4. 출력
const posSummary = [...posCount.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(" / ");
console.log(`배치 ${batchNo}: 카드 ${batch.length}개 (sourceOrder ${orders[0]}~${orders.at(-1)})`);
console.log(`품사 분포: ${posSummary}`);
console.log(`error ${errors.length} / warning ${warnings.length}`);
if (errors.length) {
  console.log("\n--- ERROR (적용 차단) ---");
  for (const e of errors) console.log(e);
}
if (warnings.length) {
  console.log("\n--- WARNING (사람 검수 대상) ---");
  for (const w of warnings) console.log(w);
}
process.exit(errors.length ? 1 : 0);
