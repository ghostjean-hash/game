// english-reading(하이브리드 독해) 유닛 + 데이터 검증 (node apps/english-reading/tests/run-node.mjs)
// 1) core 순수 로직(tokenize·course) 2) passages.json 무결성(죽은 단어 0·청킹 재구성·insight 4필드).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tokenize, resolveTargets } from "../src/core/tokenize.js";
import { createCourse, courseProgress, passageText } from "../src/core/course.js";

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
  const toks = tokenize("You spilled some coffee on your shirt.");
  check("tokenize: 공백 분리 개수", toks.length === 7);
  check("tokenize: clean이 구두점 제거", toks[6].clean === "shirt" && toks[6].raw === "shirt.");

  const dup = tokenize("to learn is to grow.");
  const t2 = resolveTargets(dup, [{ word: "to", nth: 2 }]);
  check("resolveTargets: nth=2 해석", t2[0].index === 3);
  const miss = resolveTargets(dup, [{ word: "absent" }]);
  check("resolveTargets: 미존재 단어 index -1", miss[0].index === -1);
}

// ── createCourse / courseProgress ──────────────────────────────
{
  const data = {
    id: "c",
    title: "C",
    passages: [
      { id: "p3", level: 3, title: "T3", titleKr: "가", sentences: [{ text: "x" }] },
      { id: "p1", level: 1, title: "T1", titleKr: "나", sentences: [{ text: "y" }] },
      { id: "p2", level: 2, title: "T2", titleKr: "다", sentences: [{ text: "z" }] },
    ],
  };
  const course = createCourse(data);
  check("course: level 오름차순 정렬", course.passages.map((p) => p.id).join(",") === "p1,p2,p3");
  check("course: passageById", course.passageById("p2").level === 2);
  check("course: 없는 id는 null", course.passageById("zzz") === null);

  const p0 = courseProgress(course, []);
  check("progress: 시작 0%", p0.done === 0 && p0.ratio === 0 && p0.cleared === false);
  const p1 = courseProgress(course, ["p1"]);
  check("progress: 1/3", p1.done === 1 && Math.abs(p1.ratio - 1 / 3) < 1e-9 && !p1.cleared);
  const pAll = courseProgress(course, ["p1", "p2", "p3"]);
  check("progress: 전체 완독 시 cleared", pAll.done === 3 && pAll.ratio === 1 && pAll.cleared === true);
  const pDup = courseProgress(course, ["p1", "p1", "zzz"]);
  check("progress: 중복·미존재 id 무시", pDup.done === 1);

  check("passageText: 문장 이어붙임", passageText({ sentences: [{ text: "A B." }, { text: "C D." }] }) === "A B. C D.");
}

// ── passages.json 데이터 무결성 ──────────────────────────────
{
  const data = JSON.parse(readFileSync(join(here, "../src/data/passages.json"), "utf8"));
  const norm = (t) => t.toLowerCase().replace(/[^a-z]/g, "");

  check("data: 코스 1개 이상", Array.isArray(data.courses) && data.courses.length >= 1);

  for (const course of data.courses) {
    check(`data(${course.id}): 코스 제목`, !!course.title);
    check(`data(${course.id}): 지문 3편 이상`, course.passages.length >= 3, `${course.passages.length}편`);

    const pids = new Set();
    let prevLevel = 0;
    for (const p of course.passages) {
      check(`data(${course.id}/${p.id}): id 중복 없음`, !pids.has(p.id));
      pids.add(p.id);
      check(`data(${course.id}/${p.id}): level 숫자`, typeof p.level === "number");
      check(`data(${course.id}/${p.id}): 제목(en/kr) 존재`, !!p.title && !!p.titleKr);
      check(`data(${course.id}/${p.id}): 문장 3개 이상`, p.sentences.length >= 3, `${p.sentences.length}개`);

      p.sentences.forEach((s, si) => {
        const label = `${course.id}/${p.id} s${si + 1}`;
        const tokens = tokenize(s.text);
        // 청킹 재구성: en을 이어 붙이면 원문과 일치(구두점·대소문자 무관)
        check(`data(${label}): 청킹이 원문 재구성`,
          norm(s.chunks.map((c) => c.en).join(" ")) === norm(s.text),
          `"${s.chunks.map((c) => c.en).join(" ")}" vs "${s.text}"`);
        check(`data(${label}): 청킹 한글 해석 전부 존재`, s.chunks.every((c) => !!c.kr));

        // 주요 단어: 0~3개, 각 단어는 원문에 실재(nth 해석), 뜻 존재
        check(`data(${label}): 주요 단어 0~3개`, Array.isArray(s.words) && s.words.length <= 3);
        const resolved = resolveTargets(tokens, s.words || []);
        resolved.forEach((w) => {
          check(`data(${label} '${w.word}'): 단어가 문장에 실재(죽은 입력 0)`, w.index >= 0);
          check(`data(${label} '${w.word}'): 뜻 존재`, !!w.meaning);
        });

        // insight는 선택이지만 있으면 4필드 모두
        if (s.insight) {
          check(`data(${label}): insight 4필드(공식·왜·비문·자연) 완비`,
            !!(s.insight.formula && s.insight.why && s.insight.wrong && s.insight.natural));
        }
      });

      // 지문당 insight 1~3개(구조 어려운 문장에만)
      const insightCount = p.sentences.filter((s) => s.insight).length;
      check(`data(${course.id}/${p.id}): insight 1~3개`, insightCount >= 1 && insightCount <= 3, `${insightCount}개`);

      prevLevel = p.level;
    }
  }
}

console.log(failures === 0 ? "\n모든 테스트 통과" : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
