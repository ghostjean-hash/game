// 단어 데이터 검증기 - 실제 세트 데이터를 앱에 넣기 전 안전 게이트(요청서 9장).
// 실행:
//   node apps/english-vocabulary/tools/validate-data.mjs            (샘플 단계 - manifest count 기준)
//   node apps/english-vocabulary/tools/validate-data.mjs --strict   (최종 - 세트당 200·총 1600 강제)
//
// manifest.json을 읽어 available=true 세트만 검증한다. available=false(준비 중) 세트는 건너뛴다.
// error가 하나라도 있으면 exit 1(적용 차단). warning은 참고용(사람 검수 대상, 차단 아님).

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, "../src/data");
const STRICT = process.argv.includes("--strict");

const errors = [];
const warnings = [];
function err(where, msg) { errors.push(`[ERROR] ${where}\n  - ${msg}`); }
function warn(where, msg) { warnings.push(`[WARN]  ${where}\n  - ${msg}`); }

const ID_RE = /^ev-s(\d{2})-(\d{4})$/;
const SETID_RE = /^ev-set-(\d{3})$/;
const EXAMPLE_MAX_WORDS = 14; // 짧은 예문 원칙(요청서 5·6장)

// 활용형 어간 매칭: 예문에 목표 단어(또는 흔한 활용형)가 들어있는지 보수적으로 확인.
// 불규칙 활용(go→went 등)은 여기서 못 잡으므로 error가 아니라 warning으로 둔다.
function exampleHasWord(word, example) {
  const w = word.toLowerCase();
  const ex = example.toLowerCase();
  if (ex.includes(w)) return true;
  // 어미 변형 시도: e 제거 후 + ing/ed, y→ie 등 대표 규칙만.
  const stems = new Set([w]);
  if (w.endsWith("e")) stems.add(w.slice(0, -1));
  if (w.endsWith("y")) stems.add(w.slice(0, -1) + "i");
  for (const st of stems) {
    if (st.length >= 3 && ex.includes(st)) return true;
  }
  return false;
}

// 활용형 의심 중복: a가 b + (s|es|ed|ing|er|est|d) 형태면 경고(원형/활용형 동시 수록 의심).
function looksInflected(a, b) {
  if (a === b) return false;
  const suffixes = ["s", "es", "ed", "ing", "er", "est", "d", "ies"];
  for (const suf of suffixes) {
    if (a === b + suf) return true;
    if (b.endsWith("y") && a === b.slice(0, -1) + "i" + suf) return true;
    if (b.endsWith("e") && a === b.slice(0, -1) + suf) return true;
  }
  return false;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// --- manifest 검증 ---
const manifestPath = join(DATA_DIR, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error("[ERROR] manifest.json 없음");
  process.exit(1);
}
const manifest = readJson(manifestPath);
const setSize = manifest.setSize || 200;

const allWords = [];   // { id, word, setId, order }
const allIds = new Map();
let availableTotal = 0;

for (const entry of manifest.sets || []) {
  const where0 = `manifest / ${entry.setId}`;
  if (!SETID_RE.test(entry.setId)) err(where0, `setId 형식 오류: ${entry.setId} (ev-set-NNN 이어야 함)`);
  if (!entry.available) continue; // 준비 중 세트는 검증 스킵

  const setPath = join(DATA_DIR, entry.file);
  if (!existsSync(setPath)) { err(where0, `available인데 파일 없음: ${entry.file}`); continue; }

  const set = readJson(setPath);
  const words = set.words || [];
  const orderNum = String(entry.order).padStart(2, "0");

  // 세트 단위 검사
  if (set.setId !== entry.setId) err(`${entry.file}`, `파일 setId(${set.setId})가 manifest(${entry.setId})와 불일치`);
  if (words.length !== entry.count) err(`${entry.file}`, `단어 수 ${words.length} ≠ manifest count ${entry.count}`);
  if (STRICT && words.length !== setSize) err(`${entry.file}`, `strict: 세트당 정확히 ${setSize}개여야 함 (실제 ${words.length})`);
  availableTotal += words.length;

  const seenWord = new Map();       // 소문자 word → 첫 id (세트 내 중복)
  const seenWordCased = new Set();  // 원형 그대로 (대소문자 중복 탐지)

  for (const w of words) {
    const where = `${entry.setId} / ${w.id || "(id없음)"}`;

    // 필수 필드
    for (const f of ["id", "setId", "word", "meaningKr", "example", "exampleKr"]) {
      if (w[f] === undefined || w[f] === null) err(where, `필수 필드 누락: ${f}`);
    }
    if (typeof w.word !== "string" || w.word.trim() === "") err(where, "빈 word");
    if (!Array.isArray(w.meaningKr)) err(where, "meaningKr는 배열이어야 함");
    else if (w.meaningKr.length === 0 || w.meaningKr.some((m) => !m || !String(m).trim())) err(where, "빈 뜻(meaningKr)");
    if (!w.example || !String(w.example).trim()) err(where, "빈 예문");
    if (!w.exampleKr || !String(w.exampleKr).trim()) err(where, "빈 예문 해석");

    // 앞뒤 공백
    for (const f of ["word", "example", "exampleKr"]) {
      if (typeof w[f] === "string" && w[f] !== w[f].trim()) err(where, `${f} 앞뒤 공백`);
    }

    // id 형식 + 세트 번호 일치
    const m = ID_RE.exec(w.id || "");
    if (!m) err(where, `id 형식 오류: ${w.id} (ev-sNN-NNNN 이어야 함)`);
    else if (m[1] !== orderNum) err(where, `id의 세트번호 s${m[1]}가 이 세트 order ${orderNum}과 불일치`);
    if (w.setId && w.setId !== entry.setId) err(where, `단어 setId(${w.setId})가 세트(${entry.setId})와 불일치`);

    // id 전역 중복
    if (w.id) {
      if (allIds.has(w.id)) err(where, `id 중복: ${w.id} (이미 ${allIds.get(w.id)})`);
      else allIds.set(w.id, entry.setId);
    }

    if (typeof w.word === "string" && w.word.trim()) {
      const lower = w.word.toLowerCase();
      // 세트 내 단어 중복
      if (seenWord.has(lower)) err(where, `세트 내 단어 중복: ${w.word} (이미 ${seenWord.get(lower)})`);
      else seenWord.set(lower, w.id);
      // 대소문자만 다른 중복
      if (seenWordCased.has(w.word)) err(where, `동일 표기 중복: ${w.word}`);
      seenWordCased.add(w.word);

      // 예문에 목표 단어(활용형) 포함 여부
      if (w.example && !exampleHasWord(w.word, w.example)) {
        warn(where, `example does not contain target word or inflected form: "${w.word}"`);
      }
      // 예문 길이
      if (w.example && w.example.trim().split(/\s+/).length > EXAMPLE_MAX_WORDS) {
        warn(where, `예문이 너무 김(${EXAMPLE_MAX_WORDS}단어 초과)`);
      }

      allWords.push({ id: w.id, word: lower, setId: entry.setId });
    }
  }
}

// --- 세트 간 중복 + 활용형 의심(전역) ---
const byWord = new Map();
for (const w of allWords) {
  if (byWord.has(w.word)) {
    const prev = byWord.get(w.word);
    if (prev.setId !== w.setId) err(`${w.setId} / ${w.id}`, `세트 간 중복 단어: ${w.word} (${prev.setId} ${prev.id})`);
  } else {
    byWord.set(w.word, w);
  }
}
const uniqueWords = [...byWord.keys()];
for (let i = 0; i < uniqueWords.length; i++) {
  for (let j = 0; j < uniqueWords.length; j++) {
    if (i === j) continue;
    if (looksInflected(uniqueWords[i], uniqueWords[j])) {
      warn("전역", `활용형 의심 중복: "${uniqueWords[i]}" ↔ "${uniqueWords[j]}"`);
    }
  }
}

// --- 총량 ---
if (STRICT) {
  if (availableTotal !== manifest.totalTarget) {
    err("전역", `strict: 총 단어 수 ${availableTotal} ≠ 목표 ${manifest.totalTarget}`);
  }
}

// --- 출력 ---
console.log(`\n[english-vocabulary] 데이터 검증 (${STRICT ? "strict" : "sample"} 모드)`);
console.log(`  available 세트 단어 합계: ${availableTotal} / 목표 ${manifest.totalTarget}`);
if (warnings.length) { console.log(`\n경고 ${warnings.length}건:`); warnings.forEach((w) => console.log(w)); }
if (errors.length) {
  console.log(`\n오류 ${errors.length}건:`);
  errors.forEach((e) => console.log(e));
  console.log(`\n검증 실패 - 이 데이터는 적용할 수 없습니다.`);
  process.exit(1);
}
console.log(`\n오류 0건 - 검증 통과.${warnings.length ? " (경고는 사람 검수 대상)" : ""}`);
process.exit(0);
