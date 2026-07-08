// english-reading(문법 스캔) 유닛 + 데이터 검증 테스트 (node apps/english-reading/tests/run-node.mjs)
// 1) core 순수 로직(tokenize·session) 2) grammar-bank.json 무결성(죽은 트랩 0).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tokenize, resolveTargets } from "../src/core/tokenize.js";
import { createSession } from "../src/core/session.js";

const here = dirname(fileURLToPath(import.meta.url));
let failures = 0;

function check(name, cond, detail = "") {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL - ${name}${detail ? ` :: ${detail}` : ""}`);
  }
}

// ── tokenize ──────────────────────────────
{
  const toks = tokenize("Many people find it natural to worry.");
  check("tokenize: 공백 분리 개수", toks.length === 7);
  check("tokenize: clean이 구두점 제거", toks[6].clean === "worry" && toks[6].raw === "worry.");

  const dup = tokenize("to learn is to grow.");
  const t2 = resolveTargets(dup, [{ word: "to", nth: 2 }]);
  check("resolveTargets: nth=2 해석", t2[0].index === 3);
  const miss = resolveTargets(dup, [{ word: "absent" }]);
  check("resolveTargets: 미존재 단어 index -1", miss[0].index === -1);
}

// ── createSession 세션 제어 ──────────────────────────────
{
  const cats = [
    { id: "a", title: "A", sentences: [{ text: "s1" }, { text: "s2" }] },
    { id: "b", title: "B", sentences: [{ text: "t1" }] },
  ];
  const s = createSession(cats, { maxCount: 3 });
  check("session: 시작 상태", s.category().id === "a" && s.count() === 0 && s.sentence().text === "s1");

  let r = s.solve();
  check("session: 문장 순환(뺑뺑이)", !r.switched && s.sentence().text === "s2" && s.count() === 1);
  r = s.solve();
  check("session: 순환 되감기", !r.switched && s.sentence().text === "s1" && s.count() === 2);
  r = s.solve();
  check("session: maxCount 도달 시 전환", r.switched === true && r.category.id === "b");
  check("session: 전환 후 카운트 리셋 + 첫 문장", s.count() === 0 && s.category().id === "b" && s.sentence().text === "t1");

  s.solve(); s.solve(); const wrap = s.solve();
  check("session: 마지막 카테고리 뒤 처음으로 순환", wrap.switched === true && wrap.category.id === "a");

  const def = createSession(cats);
  check("session: 기본 maxCount 40", def.maxCount === 40);
}

// ── grammar-bank.json 데이터 무결성 ──────────────────────────────
{
  const data = JSON.parse(readFileSync(join(here, "../src/data/grammar-bank.json"), "utf8"));
  const norm = (t) => t.toLowerCase().replace(/[^a-z]/g, "");
  const ids = new Set();

  check("data: 카테고리 2개 이상", data.categories.length >= 2);
  for (const cat of data.categories) {
    check(`data(${cat.id}): id 중복 없음`, !ids.has(cat.id));
    ids.add(cat.id);
    check(`data(${cat.id}): 제목 존재`, !!cat.title);
    check(`data(${cat.id}): 인트로(왜·공식·작문 팁) 완비`,
      !!(cat.intro && cat.intro.why && cat.intro.formula && cat.intro.tip));
    check(`data(${cat.id}): 문장 3개 이상`, cat.sentences.length >= 3, `${cat.sentences.length}개`);

    cat.sentences.forEach((s, si) => {
      const tokens = tokenize(s.text);
      check(`data(${cat.id} s${si + 1}): 청킹이 원문 재구성`,
        norm(s.chunks.map((c) => c.en).join(" ")) === norm(s.text),
        `"${s.chunks.map((c) => c.en).join(" ")}" vs "${s.text}"`);
      check(`data(${cat.id} s${si + 1}): 청킹 한글 해석 전부 존재`, s.chunks.every((c) => !!c.kr));
      check(`data(${cat.id} s${si + 1}): 트랩 1개 이상`, Array.isArray(s.traps) && s.traps.length >= 1);
      check(`data(${cat.id} s${si + 1}): 구조 해부(공식·왜·비문·자연 해석) 완비`,
        !!(s.insight && s.insight.formula && s.insight.why && s.insight.wrong && s.insight.natural));

      const resolved = resolveTargets(tokens, s.traps);
      resolved.forEach((t) => {
        check(`data(${cat.id} s${si + 1} '${t.word}'): 트랩 단어가 문장에 실재`, t.index >= 0);
        check(`data(${cat.id} s${si + 1} '${t.word}'): type이 카테고리와 일치 + 메시지 존재`,
          t.type === cat.id && !!t.message);
      });
    });
  }
}

console.log(failures === 0 ? "\n모든 테스트 통과" : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
