// 제작 배치에 적용한 수정 패치를 앱 세트 데이터(src/data/set-NNN.json)에 동기화한다.
// 앱 카드는 sourceId(ev-moe2022-e-NNNN)로 원본과 연결되고 세트 배정은 학습 순서 기준이라 순번이 다르다.
// 사용: node tools/sync-fix-to-app.mjs 01 [--dry]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..");
const SRC = join(APP, "docs", "sources", "moe-2022-english");
const DATA = join(APP, "src", "data");
const fixNo = (process.argv[2] || "01").padStart(2, "0");
const dry = process.argv.includes("--dry");

const POS_KR = {
  noun: "명사", verb: "동사", adjective: "형용사", adverb: "부사", pronoun: "대명사",
  preposition: "전치사", conjunction: "접속사", determiner: "한정사", interjection: "감탄사",
  auxiliary: "조동사", number: "수사",
};

const fixes = JSON.parse(readFileSync(join(SRC, `elementary-800-fix-${fixNo}.json`), "utf8")).fixes;
// 배치 파일이 이미 수정된 상태이므로 그것을 진실로 삼아 앱에 옮긴다(패치 키 = 대상 순번).
const bySourceId = new Map();
for (const n of ["01", "02", "03", "04"]) {
  for (const c of JSON.parse(readFileSync(join(SRC, `authoring-batch-${n}.json`), "utf8"))) {
    if (fixes[String(c.sourceOrder)]) bySourceId.set(c.id, c);
  }
}
if (bySourceId.size !== Object.keys(fixes).length) {
  throw new Error(`대상 불일치: 패치 ${Object.keys(fixes).length}건 vs 배치에서 찾은 ${bySourceId.size}건`);
}

const found = new Set();
let changed = 0;
for (const n of ["001", "002", "003", "004"]) {
  const file = join(DATA, `set-${n}.json`);
  const set = JSON.parse(readFileSync(file, "utf8"));
  let touched = 0;
  for (const w of set.words) {
    const src = bySourceId.get(w.sourceId);
    if (!src) continue;
    found.add(w.sourceId);
    const next = {
      pos: POS_KR[src.partOfSpeech[0]] || w.pos,
      meaningKr: src.meaningKr,
      example: src.example,
      exampleKr: src.exampleKr,
    };
    for (const [k, v] of Object.entries(next)) {
      if (JSON.stringify(w[k]) === JSON.stringify(v)) continue;
      console.log(`${w.id} ${w.word} .${k}: ${JSON.stringify(w[k])} -> ${JSON.stringify(v)}`);
      w[k] = v;
      touched++;
    }
  }
  if (touched && !dry) writeFileSync(file, JSON.stringify(set, null, 2) + "\n", "utf8");
  console.log(`-- set-${n}: 필드 ${touched}개 변경${dry ? " (dry)" : " 저장"}`);
  changed += touched;
}
const missing = [...bySourceId.keys()].filter((id) => !found.has(id));
if (missing.length) {
  console.error(`\nERROR 앱 세트에서 못 찾은 원본 ID: ${missing.join(",")}`);
  process.exit(1);
}
console.log(`\n대상 ${bySourceId.size}개 카드 전부 확인, 필드 ${changed}개 반영${dry ? "(dry)" : ""}`);
