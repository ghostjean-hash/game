// english-reading(하이브리드 독해) 유닛 + 데이터 검증 (node apps/english-reading/tests/run-node.mjs)
// 1) core 순수 로직(tokenize·course) 2) passages.json 무결성(죽은 단어 0·청킹 재구성·insight 4필드).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tokenize, resolveTargets } from "../src/core/tokenize.js";
import { createCourse, courseProgress, passageText } from "../src/core/course.js";
import { chunkBoundaries, gradeSlashes, boundaryReason, chunkReasons, chunkViolations } from "../src/core/chunking.js";
import { validatePassage } from "../src/core/validate.js";

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

// ── chunkBoundaries / gradeSlashes (끊어 읽기 채점) ──────────────────────────────
{
  // "All day long, you feel that everyone is staring at the stain." = 12토큰
  // 청킹 3+6+3 → 정답 틈 = 2, 8
  const toks = tokenize("All day long, you feel that everyone is staring at the stain.");
  const chunks = [
    { en: "All day long," }, { en: "you feel that everyone is staring" }, { en: "at the stain." },
  ];
  const b = chunkBoundaries(toks, chunks);
  check("chunking: 경계 = 청킹 단어 수 누적", b.size === 2 && b.has(2) && b.has(8));

  const g1 = gradeSlashes(b, [2, 5]);
  check("chunking: 채점 - 맞음/틀림/빼먹음 분리",
    g1.correct.join() === "2" && g1.wrong.join() === "5" && g1.missed.join() === "8");
  const g2 = gradeSlashes(b, []);
  check("chunking: 아무것도 안 긋면 전부 빼먹음", g2.correct.length === 0 && g2.wrong.length === 0 && g2.missed.length === 2);
  const g3 = gradeSlashes(b, [2, 8]);
  check("chunking: 전부 맞으면 wrong·missed 0", g3.correct.length === 2 && g3.wrong.length === 0 && g3.missed.length === 0);

  const single = chunkBoundaries(tokenize("Hello world."), [{ en: "Hello world." }]);
  check("chunking: 청킹 1개면 경계 0개", single.size === 0);
}

// ── boundaryReason (끊는 이유 자동 판별) ──────────────────────────────
{
  check("reason: 콤마 뒤", boundaryReason("All day long,", "you feel that") === "콤마 뒤");
  check("reason: that절 앞", boundaryReason("you feel", "that everyone is staring") === "that절 앞");
  check("reason: 관계대명사 앞", boundaryReason("the people", "who are watching") === "관계대명사 앞");
  check("reason: 전치사구 앞", boundaryReason("is staring", "at the stain.") === "전치사구 앞");
  check("reason: to부정사 앞", boundaryReason("a chance", "to prove their worth") === "to부정사 앞");
  check("reason: 접속사 앞(even though)", boundaryReason("saw ten", "even though the wheel") === "접속사 앞");
  check("reason: 비교 than 앞", boundaryReason("larger figures", "than those who saw ten") === "비교 than 앞");
  check("reason: 동사 앞(긴 주어 뒤)", boundaryReason("The people who know the least", "are often") === "동사 앞(긴 주어 뒤)");
  check("reason: 분사구 앞(ed+by)", boundaryReason("on a crowded street", "surrounded by strangers") === "분사구 앞");
  check("reason: 애매하면 의미 덩어리", boundaryReason("guessed", "far larger figures") === "의미 덩어리");

  // 원문 토큰의 콤마로 판별(덩어리 문자열이 콤마를 생략해도 정확)
  const toks = tokenize("All day long, you feel that everyone is staring at the stain.");
  const rs = chunkReasons(toks, [
    { en: "All day long" }, { en: "you feel that everyone is staring" }, { en: "at the stain." },
  ]);
  check("chunkReasons: 첫 덩어리 null + 원문 콤마 판별 + 전치사구",
    rs[0] === null && rs[1] === "콤마 뒤" && rs[2] === "전치사구 앞", rs.join("|"));
}

// ── chunkViolations (가이드 규칙 위반 검사) ──────────────────────────────
{
  const V = (text, ens) => chunkViolations(tokenize(text), ens.map((en) => ({ en })));
  // A. be/조동사 뒤 명사보어를 떼면 위반
  check("violation: be동사 뒤 명사보어 분리",
    V("Confirmation bias is the habit.", ["Confirmation bias is", "the habit."]).some((v) => v.kind === "aux-tail"));
  // be동사 뒤라도 that절 보어는 정당(예외)
  check("violation: be동사 뒤 that절은 정당",
    V("The truth is that no one notices.", ["The truth is", "that no one notices."]).length === 0);
  // B. 짧은 주어(2단어 이하) 뒤 조동사 앞은 위반
  check("violation: 짧은 주어 뒤 조동사 앞 분리",
    V("A placebo is a fake pill.", ["A placebo", "is a fake pill."]).some((v) => v.kind === "aux-head"));
  // 긴 주어(3단어 이상) 뒤 동사 앞은 정당(가이드 규칙4)
  check("violation: 긴 주어 뒤 동사 앞은 정당",
    V("Knowing this trap will not help.", ["Knowing this trap", "will not help."]).length === 0);
  // C. 절 중간의 짧은 전치사구(2단어 이하) 앞은 위반, 긴 전치사구는 정당
  check("violation: 절 중간 짧은 전치사구 앞 분리",
    V("the habit of noticing only what we believe.", ["the habit", "of noticing", "only what we believe."]).some((v) => v.kind === "short-prep"));
  check("violation: 긴 전치사구 앞은 정당",
    V("you feel at the stain now.", ["you feel", "at the stain now."]).length === 0);
  // 문장 맨 끝의 짧은 부사구는 정당(over time·at all 등 - 독립적으로 끊어 읽음)
  check("violation: 문장 끝 짧은 부사구는 정당",
    V("a big fortune over time.", ["a big fortune", "over time."]).length === 0);
  check("violation: 문장 끝 at all 정당",
    V("no real medicine at all.", ["no real medicine", "at all."]).length === 0);
  // 콤마 뒤는 짧은 전치사구라도 정당(글쓴이가 끊은 자리)
  check("violation: 콤마 뒤는 정당",
    V("Above all, of course it helps.", ["Above all,", "of course it helps."]).length === 0);
  // D. 전치사가 앞 덩어리 끝에 남아 목적어와 갈리면 위반
  check("violation: 전치사 꼬리 분리",
    V("our mind searches for facts.", ["our mind searches for", "facts."]).some((v) => v.kind === "prep-tail"));
}

// ── validatePassage (출제 화면 검증) ──────────────────────────────
{
  const good = {
    id: "test-good", level: 1, title: "T", titleKr: "가",
    sentences: [{
      text: "Confirmation bias is the habit of noticing only what we already believe.",
      chunks: [
        { en: "Confirmation bias is the habit", kr: "확증 편향은 습관이다" },
        { en: "of noticing only what we already believe.", kr: "우리가 이미 믿는 것만 알아채는" },
      ],
      grammar: [{ label: "of+동명사", note: "설명" }],
      words: [{ word: "bias", meaning: "편향" }],
    }],
  };
  check("validate: 규칙 지킨 지문 통과", validatePassage(good).ok);

  const badId = { ...good, id: "Bad ID!" };
  check("validate: 잘못된 id 검출", !validatePassage(badId).ok);

  const badChunk = { ...good, sentences: [{ ...good.sentences[0],
    chunks: [{ en: "Confirmation bias is", kr: "확증 편향은" }, { en: "the habit of noticing only what we already believe.", kr: "습관" }] }] };
  check("validate: 끊는 기준 위반(be동사 뒤) 검출", !validatePassage(badChunk).ok);

  const badRecon = { ...good, sentences: [{ ...good.sentences[0],
    chunks: [{ en: "Totally different text", kr: "다름" }] }] };
  check("validate: 청킹이 원문과 어긋나면 검출", !validatePassage(badRecon).ok);

  const badWord = { ...good, sentences: [{ ...good.sentences[0], words: [{ word: "absent", meaning: "없음" }] }] };
  check("validate: 원문에 없는 단어 검출", !validatePassage(badWord).ok);

  const noGrammar = { ...good, sentences: [{ ...good.sentences[0], grammar: [] }] };
  check("validate: grammar 없으면 검출", !validatePassage(noGrammar).ok);

  check("validate: 문장 없으면 검출", !validatePassage({ id: "x", level: 1, title: "T", titleKr: "가", sentences: [] }).ok);
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
        // 끊는 기준 팝업 규칙 위반 0 (be/조동사 뒤·짧은 주어 뒤 동사 앞·짧은 전치사구 앞 분리 금지)
        const viol = chunkViolations(tokens, s.chunks);
        check(`data(${label}): 끊는 기준 위반 0`, viol.length === 0, viol.map((v) => v.detail).join(" / "));

        // 주요 단어: 0~3개, 각 단어는 원문에 실재(nth 해석), 뜻 존재
        check(`data(${label}): 주요 단어 0~3개`, Array.isArray(s.words) && s.words.length <= 3);
        const resolved = resolveTargets(tokens, s.words || []);
        resolved.forEach((w) => {
          check(`data(${label} '${w.word}'): 단어가 문장에 실재(죽은 입력 0)`, w.index >= 0);
          check(`data(${label} '${w.word}'): 뜻 존재`, !!w.meaning);
        });

        // 문법 목록: 문장마다 1개 이상, 각 항목은 이름표+설명 필수 (/ 검토 후 전부 표시)
        check(`data(${label}): grammar 1개 이상`, Array.isArray(s.grammar) && s.grammar.length >= 1);
        (s.grammar || []).forEach((g, gi) => {
          check(`data(${label} g${gi + 1}): 이름표·설명 존재`, !!g.label && !!g.note);
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
