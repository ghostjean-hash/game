// 수정본 자체 검증기 - 기존 passages.json과 대조하지 않는다(같은 id를 교체하는 작업이라
// validate-draft.mjs를 쓰면 자기 자신과 id 중복이 나 항상 FAIL한다. 앱 CLAUDE.md 4.6).
// 사용: node check-fix.mjs <수정한 json 경로>
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validatePassage, lintPassage } from "../src/core/validate.js";
import { chunkViolations } from "../src/core/chunking.js";
import { tokenize } from "../src/core/tokenize.js";

const path = process.argv[2];
if (!path) { console.error("사용: node check-fix.mjs <파일경로>"); process.exit(2); }
const list = JSON.parse(readFileSync(resolve(path), "utf8"));

let bad = 0, warn = 0;
for (const p of list) {
  const errs = validatePassage(p, { strict: true }).errors || [];
  const warns = lintPassage(p).warnings || [];
  // 끊는 기준 위반은 문장별로 따로 확인
  const viol = [];
  p.sentences.forEach((s, i) => {
    const v = chunkViolations(tokenize(s.text), s.chunks) || [];
    if (v.length) viol.push(`S${i + 1}: ${v.map((x) => x.reason || x).join(" / ")}`);
  });
  if (errs.length || viol.length) {
    bad++;
    console.log(`FAIL ${p.id} (lv${p.level})`);
    errs.forEach((e) => console.log("   오류:", e));
    viol.forEach((v) => console.log("   끊기위반:", v));
  } else {
    console.log(`ok   ${p.id} (lv${p.level})`);
  }
  warns.forEach((w) => { warn++; console.log("   · 규칙:", w); });

  // 원문 재구성 대조(chunks.en을 이으면 text와 같아야 한다)
  p.sentences.forEach((s, i) => {
    const joined = s.chunks.map((c) => c.en.trim()).join(" ").replace(/\s+/g, " ").trim();
    const norm = (x) => x.replace(/[^A-Za-z0-9' ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    if (norm(joined) !== norm(s.text)) {
      bad++;
      console.log(`   FAIL ${p.id} S${i + 1}: chunks를 이어도 원문과 다르다`);
      console.log(`      원문: ${s.text}`);
      console.log(`      조각: ${joined}`);
    }
  });

  // breakRules boundary 범위 + 대표 경계 중복 + allowed/discouraged 중복
  p.sentences.forEach((s, i) => {
    const toks = s.text.split(/\s+/);
    const maxB = toks.length - 2;
    const rec = [];
    let n = 0;
    for (let k = 0; k < s.chunks.length - 1; k++) { n += s.chunks[k].en.trim().split(/\s+/).length; rec.push(n - 1); }
    const a = (s.breakRules?.allowed || []).map((x) => x.boundary);
    const d = (s.breakRules?.discouraged || []).map((x) => x.boundary);
    [...a, ...d].forEach((b) => {
      if (b < 0 || b > maxB) { bad++; console.log(`   FAIL ${p.id} S${i + 1}: boundary ${b} 범위 밖(0~${maxB})`); }
      if (rec.includes(b)) { bad++; console.log(`   FAIL ${p.id} S${i + 1}: boundary ${b}는 대표 끊기 경계라 넣을 수 없다`); }
    });
    a.forEach((b) => { if (d.includes(b)) { bad++; console.log(`   FAIL ${p.id} S${i + 1}: boundary ${b}가 allowed·discouraged 양쪽에 있다`); } });
    if (a.length + d.length === 0) { warn++; console.log(`   · 규칙: ${p.id} S${i + 1} breakRules가 비었다`); }
  });
}
console.log(`\n${list.length}편 / FAIL ${bad}건 / 경고 ${warn}건`);
process.exit(bad ? 1 : 0);
