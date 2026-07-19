// 출제 draft(passage 객체 배열 JSON)를 공식 검증 규칙으로 검사한다.
// 사용: node tools/validate-draft.mjs <draft.json 경로>
// validatePassage(strict) + compareAgainstExisting(vs 현재 passages.json 전체) + draft 내부 id/title/문장 중복.
// passages.json은 변경하지 않는다(WORKFLOW 2장: 반영 전 검증).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { validatePassage, lintPassage } from "../src/core/validate.js";
import { compareAgainstExisting } from "../src/core/authoring-index.js";

const here = dirname(fileURLToPath(import.meta.url));
const draftPath = process.argv[2];
if (!draftPath) { console.error("사용: node tools/validate-draft.mjs <draft.json>"); process.exit(2); }

const data = JSON.parse(readFileSync(join(here, "../src/data/passages.json"), "utf8"));
const existing = data.courses.flatMap((c) => c.passages);

const raw = JSON.parse(readFileSync(resolve(draftPath), "utf8"));
const drafts = Array.isArray(raw) ? raw : [raw];

let total = 0;
let bad = 0;
const seenId = new Set();
const seenTitle = new Set();

drafts.forEach((p, i) => {
  const head = `[${i + 1}/${drafts.length}] ${p && p.id ? p.id : "(id 없음)"} (lv${p && p.level}, ${p && p.topic})`;
  const res = validatePassage(p, { strict: true });
  const cmp = compareAgainstExisting(p, existing);
  const errs = [...res.errors.map((e) => `형식: ${e.where} - ${e.msg}`)];
  cmp.notes.filter((n) => n.kind === "dup").forEach((n) => errs.push(`중복: ${n.msg}`));
  // draft 내부 중복
  if (p && p.id) { if (seenId.has(p.id)) errs.push(`중복: draft 내 id "${p.id}" 재사용`); seenId.add(p.id); }
  if (p && p.title) { if (seenTitle.has(p.title)) errs.push(`중복: draft 내 title "${p.title}" 재사용`); seenTitle.add(p.title); }
  const warns = cmp.notes.filter((n) => n.kind !== "dup").map((n) => `${n.kind}: ${n.msg}`);
  lintPassage(p).warnings.forEach((wn) => warns.push(`규칙: ${wn.where} - ${wn.msg}`));

  total += 1;
  if (errs.length) {
    bad += 1;
    console.error(`FAIL ${head}`);
    errs.forEach((e) => console.error(`   ✗ ${e}`));
  } else {
    console.log(`ok   ${head}`);
  }
  if (warns.length) warns.forEach((wn) => console.log(`   · ${wn}`));
});

console.log(`\n검증 ${total}편 중 통과 ${total - bad} / 실패 ${bad}`);
process.exit(bad ? 1 : 0);
