// english-reading 유닛 + 데이터 검증 테스트 (node apps/english-reading/tests/run-node.mjs)
// 1) core 순수 로직(tokenize·lesson·shuffle) 2) passages.json 무결성(죽은 입력 0).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tokenize, resolveTargets } from "../src/core/tokenize.js";
import { createLesson, shuffleOptions } from "../src/core/lesson.js";

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
  const toks = tokenize("Have you ever noticed that yawning is contagious?");
  check("tokenize: 공백 분리 개수", toks.length === 8);
  check("tokenize: clean이 구두점 제거", toks[7].clean === "contagious" && toks[7].raw === "contagious?");

  const dup = tokenize("stronger and stronger.");
  const targets = resolveTargets(dup, [{ word: "stronger", nth: 2 }]);
  check("resolveTargets: nth=2 해석", targets[0].index === 2);
  const miss = resolveTargets(dup, [{ word: "absent" }]);
  check("resolveTargets: 미존재 단어 index -1", miss[0].index === -1);
}

// ── shuffleOptions ──────────────────────────────
{
  const options = ["A", "B", "C"];
  // rand를 0으로 고정하면 매 스왑이 j=0 - 결정적 순열
  const r0 = shuffleOptions(options, 1, () => 0);
  check("shuffleOptions: 순열 보존", [...r0.options].sort().join("") === "ABC");
  check("shuffleOptions: 정답 위치 재계산", r0.options[r0.answer] === "B");
  const r9 = shuffleOptions(options, 2, () => 0.99);
  check("shuffleOptions: rand 주입 결정성", r9.options[r9.answer] === "C");
  check("shuffleOptions: 원본 불변", options.join("") === "ABC");
}

// ── createLesson 단계 전이 ──────────────────────────────
{
  const passage = {
    id: "t",
    title: "t",
    sentences: [
      { text: "One two.", chunks: [], guessWords: [{ word: "one", options: ["a", "b", "c"], answer: 0, hint: "h" }] },
      { text: "Three four.", chunks: [], guessWords: [] },
    ],
    gistQ: { prompt: "p", options: ["a", "b", "c"], answer: 1 },
  };
  const lesson = createLesson(passage);
  check("lesson: 시작 stage=read", lesson.stage() === "read");
  lesson.recordGuess("one", 2, false);
  check("lesson: nextSentence 진행", lesson.nextSentence().done === false && lesson.position() === 2);
  check("lesson: 마지막 문장 후 gist", lesson.nextSentence().done === true && lesson.stage() === "gist");
  lesson.recordGist(1, true);
  check("lesson: gist 후 summary", lesson.stage() === "summary");
  const sum = lesson.summary();
  check("lesson: summary 단어 분류", sum.totalWords === 1 && sum.learnedWords[0] === "one" && sum.correctWords.length === 0);
  check("lesson: summary gist 기록", sum.gist.correct === true);
}

// ── passages.json 데이터 무결성 ──────────────────────────────
{
  const data = JSON.parse(readFileSync(join(here, "../src/data/passages.json"), "utf8"));
  const labels = new Set(data._schema.labels);
  const norm = (t) => t.toLowerCase().replace(/[^a-z]/g, "");
  const ids = new Set();

  check("data: 지문 1편 이상", data.passages.length >= 1);
  for (const p of data.passages) {
    check(`data(${p.id}): id 중복 없음`, !ids.has(p.id));
    ids.add(p.id);
    check(`data(${p.id}): gistQ 보기 3개·정답 범위`, p.gistQ.options.length === 3 && p.gistQ.answer >= 0 && p.gistQ.answer < 3);

    p.sentences.forEach((s, si) => {
      const cleans = new Set(tokenize(s.text).map((t) => t.clean));
      check(`data(${p.id} s${si + 1}): 청킹이 원문 재구성`, norm(s.chunks.map((c) => c.en).join(" ")) === norm(s.text),
        `"${s.chunks.map((c) => c.en).join(" ")}" vs "${s.text}"`);

      for (const g of s.guessWords) {
        check(`data(${p.id} s${si + 1} ${g.word}): 단어가 문장에 실재`, cleans.has(g.word.toLowerCase()));
        check(`data(${p.id} s${si + 1} ${g.word}): 보기 3개·정답 범위·힌트`,
          g.options.length === 3 && g.answer >= 0 && g.answer < 3 && !!g.hint);
      }
      if (s.structureQ) {
        const sq = s.structureQ;
        check(`data(${p.id} s${si + 1}): 구조 문항 보기·정답·이름표`,
          sq.options.length === 3 && sq.answer >= 0 && sq.answer < 3 && labels.has(sq.label));
      }
    });
  }
}

console.log(failures === 0 ? "\n모든 테스트 통과" : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
