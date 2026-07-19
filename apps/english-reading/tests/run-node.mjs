// english-reading(하이브리드 독해) 유닛 + 데이터 검증 (node apps/english-reading/tests/run-node.mjs)
// 1) core 순수 로직(tokenize·course) 2) passages.json 무결성(죽은 단어 0·청킹 재구성·insight 4필드).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tokenize, resolveTargets, matchWordTargets } from "../src/core/tokenize.js";
import { createCourse, courseProgress, passageText } from "../src/core/course.js";
import { chunkBoundaries, gradeSlashes, gradeChunks, boundaryReason, chunkReasons, chunkViolations } from "../src/core/chunking.js";
import { validatePassage, normalizeSmartQuotes, lintPassage } from "../src/core/validate.js";
import { analyzeContent, nextCurriculumHint, buildAuthoringPackage, compareAgainstExisting, RULES_VERSION } from "../src/core/authoring-index.js";
import { normalizeSentence, boundarySet, reasonByBoundary } from "../src/core/normalize.js";

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

  const phraseToks = tokenize("Joon takes a bus to the museum alone.");
  const ph = matchWordTargets(phraseToks, [{ word: "takes a bus", meaning: "버스를 타다" }]);
  check("matchWordTargets: 숙어 연속 매칭", ph.length === 1 && ph[0].indices.join(",") === "1,2,3");
  const phMiss = matchWordTargets(phraseToks, [{ word: "takes a train", meaning: "x" }]);
  check("matchWordTargets: 불연속 미매칭", phMiss.length === 0);
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

// ── gradeChunks (추천/허용/비추천/neutral/missed 5등급 판정) ──────────────────────────────
{
  // "All day long, you feel that everyone is staring at the stain." = 12토큰, 추천경계 {2,8}
  const boundaries = new Set([2, 8]);
  const allowedSet = new Set([5]);   // 다른 자연스러운 분할
  const discSet = new Set([4]);      // 핵심 구조를 가르는 비추천 위치
  const g = gradeChunks(boundaries, allowedSet, discSet, [2, 4, 5, 7]);
  check("gradeChunks: recommended = 그은 선 ∩ 추천경계", g.recommended.join() === "2");            // B
  check("gradeChunks: allowed = allowed 목록 위치", g.allowed.join() === "5");                     // C
  check("gradeChunks: discouraged = discouraged 목록 위치", g.discouraged.join() === "4");         // D
  check("gradeChunks: neutral = 어느 목록에도 없는 위치", g.neutral.join() === "7");                // E
  check("gradeChunks: missed = 안 그은 추천경계", g.missed.join() === "8");                         // F
  // 우선순위: 추천경계이면서 allowed에도 있으면 recommended 우선
  const g2 = gradeChunks(new Set([2]), new Set([2]), new Set(), [2]);
  check("gradeChunks: recommended가 allowed보다 우선", g2.recommended.join() === "2" && g2.allowed.length === 0);
  // 추천경계 계산이 gradeChunks 입력과 이어짐 (A: 청킹 단어 수 누적)
  const toks = tokenize("All day long, you feel that everyone is staring at the stain.");
  const b = chunkBoundaries(toks, [{ en: "All day long," }, { en: "you feel that everyone is staring" }, { en: "at the stain." }]);
  check("gradeChunks: 추천경계는 chunkBoundaries 그대로", b.has(2) && b.has(8) && b.size === 2);   // A
}

// ── normalizeSentence / boundarySet (하위호환 fallback) ──────────────────────────────
{
  // I. 신규 필드 없는 구스키마 → 기본값·fallback
  const old = {
    text: "Confirmation bias is the habit.",
    chunks: [{ en: "Confirmation bias is the habit.", kr: "확증 편향은 습관이다" }],
    grammar: [{ label: "be동사", note: "A is B - A는 B다." }],
    insight: { formula: "f", why: "y", wrong: "x", natural: "확증 편향은 하나의 습관이다." },
  };
  const n = normalizeSentence(old);
  check("normalize: breakRules 없으면 빈 allowed/discouraged", n.breakRules.allowed.length === 0 && n.breakRules.discouraged.length === 0); // I
  check("normalize: naturalTranslation 없으면 insight.natural 사용", n.naturalTranslation === "확증 편향은 하나의 습관이다."); // J-1
  check("normalize: wordOrderPoint 없으면 grammar[0]로 fallback", n.wordOrderPoint && n.wordOrderPoint.title === "be동사" && n.wordOrderPoint.fromGrammar === true);

  // J-2. naturalTranslation·insight 둘 다 없으면 직독직해 chunks.kr 이어붙임
  const noNat = { text: "A B.", chunks: [{ en: "A", kr: "가" }, { en: "B.", kr: "나" }], grammar: [{ label: "x", note: "y" }] };
  check("normalize: 자연해석·insight 둘 다 없으면 chunks.kr 이어붙임", normalizeSentence(noNat).naturalTranslation === "가 나");

  // 신 필드가 있으면 그대로 우선
  const neu = {
    text: "A B C.", chunks: [{ en: "A B C.", kr: "가나다" }],
    naturalTranslation: "완역", wordOrderPoint: { title: "T", explanation: "E" },
    breakRules: { allowed: [{ boundary: 1, reason: "이유" }], discouraged: [] },
  };
  const nn = normalizeSentence(neu);
  check("normalize: 신 필드 있으면 그대로 사용", nn.naturalTranslation === "완역" && nn.wordOrderPoint.title === "T" && !nn.wordOrderPoint.fromGrammar);
  const toks3 = tokenize("A B C.");
  check("boundarySet: allowed → boundary Set", boundarySet(nn.breakRules, "allowed", toks3.length).has(1));
  check("reasonByBoundary: boundary → reason 맵", reasonByBoundary(nn.breakRules, "allowed").get(1) === "이유");
  // 범위 밖 boundary는 boundarySet에서 조용히 제외(방어)
  const bad = { allowed: [{ boundary: 99, reason: "r" }] };
  check("boundarySet: 범위 밖 boundary 제외", boundarySet(bad, "allowed", toks3.length).size === 0);
}

// ── validate 신규 필드 검증 (breakRules 범위·중복, strict 모드) ──────────────────────────────
{
  const base = {
    id: "v-new", level: 1, title: "T", titleKr: "가",
    sentences: [{
      text: "Confirmation bias is the habit of noticing only what we already believe.",
      chunks: [
        { en: "Confirmation bias is the habit", kr: "확증 편향은 습관이다" },
        { en: "of noticing only what we already believe.", kr: "우리가 이미 믿는 것만 알아채는" },
      ],
      grammar: [{ label: "of+동명사", note: "설명" }],
      words: [{ word: "bias", meaning: "편향" }],
      naturalTranslation: "확증 편향은 우리가 이미 믿는 것만 알아채는 습관이다.",
      wordOrderPoint: { title: "be + 명사", explanation: "A is B 구조." },
      breakRules: { allowed: [{ boundary: 2, reason: "명사구 뒤 끊어도 됨" }], discouraged: [] },
    }],
  };
  check("validate(new): 신 필드 갖춘 지문 통과(관대 모드)", validatePassage(base).ok);
  check("validate(new): strict 모드에서도 통과", validatePassage(base, { strict: true }).ok);

  // G. allowed/discouraged 중복
  const dup = JSON.parse(JSON.stringify(base));
  dup.sentences[0].breakRules = { allowed: [{ boundary: 2, reason: "a" }], discouraged: [{ boundary: 2, reason: "b" }] };
  check("validate(new): allowed·discouraged 중복 검출", !validatePassage(dup).ok); // G

  // H. 범위 밖 boundary (12토큰 아님, 이 문장 토큰 수-2 초과)
  const oob = JSON.parse(JSON.stringify(base));
  oob.sentences[0].breakRules = { allowed: [{ boundary: 999, reason: "a" }], discouraged: [] };
  check("validate(new): 범위 밖 boundary 검출", !validatePassage(oob).ok); // H

  // 추천 경계(chunks 경계=4)를 discouraged에 넣으면 검출
  const recDisc = JSON.parse(JSON.stringify(base));
  const recB = [...chunkBoundaries(tokenize(base.sentences[0].text), base.sentences[0].chunks)][0];
  recDisc.sentences[0].breakRules = { allowed: [], discouraged: [{ boundary: recB, reason: "x" }] };
  check("validate(new): 추천경계를 discouraged에 넣으면 검출", !validatePassage(recDisc).ok);

  // reason 누락
  const noReason = JSON.parse(JSON.stringify(base));
  noReason.sentences[0].breakRules = { allowed: [{ boundary: 2 }], discouraged: [] };
  check("validate(new): breakRules reason 누락 검출", !validatePassage(noReason).ok);

  // strict에서 naturalTranslation·wordOrderPoint 누락은 실패, 관대 모드는 통과(하위호환)
  const legacy = {
    id: "v-old", level: 1, title: "T", titleKr: "가",
    sentences: [{
      text: "Confirmation bias is the habit of noticing only what we already believe.",
      chunks: base.sentences[0].chunks,
      grammar: [{ label: "of+동명사", note: "설명" }],
    }],
  };
  check("validate(old): 구스키마 관대 모드 통과(하위호환)", validatePassage(legacy).ok); // I(검증측)
  check("validate(old): strict 모드에서는 신 필드 누락 실패", !validatePassage(legacy, { strict: true }).ok);
  check("validate(old): naturalTranslation 문자열 아니면 검출", !validatePassage({ ...legacy, sentences: [{ ...legacy.sentences[0], naturalTranslation: 123 }] }).ok);
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
  // T-101: 절 안의 본동사 does는 조동사가 아니므로 그 뒤 끊기는 정당
  check("violation: 절 안 본동사 does 뒤 끊기는 정당",
    V("Experienced players study what an opponent does before making a risky move.",
      ["Experienced players study", "what an opponent does", "before making a risky move."]).length === 0);
  // T-101: 대동사 did 뒤 비교절도 정당
  check("violation: 대동사 did 뒤 끊기는 정당",
    V("She studies harder than he did last year.", ["She studies harder", "than he did", "last year."]).length === 0);
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

  // 모바일(아이폰) 곡선 따옴표 정규화 - 붙여넣기 시 "가 곡선으로 바뀌어 JSON.parse가 깨지던 것
  const smart = '{ “id”: “test”, “level”: 1 }';
  check("normalizeSmartQuotes: 곡선 따옴표 → 직선 후 파싱 성공", (() => {
    try { const o = JSON.parse(normalizeSmartQuotes(smart)); return o.id === "test" && o.level === 1; }
    catch { return false; }
  })());
  check("normalizeSmartQuotes: 직선 따옴표는 그대로", normalizeSmartQuotes('{"a":1}') === '{"a":1}');
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
        (s.words || []).forEach((wd) => {
          const m = matchWordTargets(tokens, [wd]);
          check(`data(${label} '${wd.word}'): 단어가 문장에 실재(죽은 입력 0)`, m.length > 0);
          check(`data(${label} '${wd.word}'): 뜻 존재`, !!wd.meaning);
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

      // 지문당 insight 0~3개(구조 어려운 문장에만 - 쉬운 지문은 0 정당, 상한만 강제)
      const insightCount = p.sentences.filter((s) => s.insight).length;
      check(`data(${course.id}/${p.id}): insight 0~3개`, insightCount <= 3, `${insightCount}개`);

      // K. built-in 지문은 신 스키마 strict 검증 통과(naturalTranslation·wordOrderPoint 필수 + breakRules 범위·중복·추천경계 충돌 0)
      const strictRes = validatePassage(p, { strict: true });
      check(`data(${course.id}/${p.id}): 신 스키마 strict 통과`, strictRes.ok, strictRes.errors.map((e) => `${e.where}:${e.msg}`).join(" / "));
      // 각 문장 신 필드 개별 확인
      p.sentences.forEach((s, si) => {
        const label = `${course.id}/${p.id} s${si + 1}`;
        check(`data(${label}): naturalTranslation 존재`, typeof s.naturalTranslation === "string" && s.naturalTranslation.length > 0);
        check(`data(${label}): wordOrderPoint 완비`, !!(s.wordOrderPoint && s.wordOrderPoint.title && s.wordOrderPoint.explanation));
        check(`data(${label}): breakRules 형태`, s.breakRules && Array.isArray(s.breakRules.allowed) && Array.isArray(s.breakRules.discouraged));
      });

      prevLevel = p.level;
    }
  }
}

// ── authoring-index (출제 관리 순수 로직) ──────────────────
{
  const data = JSON.parse(readFileSync(join(here, "../src/data/passages.json"), "utf8"));
  const passages = data.courses.flatMap((c) => c.passages);
  const idx = analyzeContent(passages);
  check("authoring: 지문 수 집계", idx.totalPassages === passages.length, `${idx.totalPassages}`);
  check("authoring: 문장 수 집계", idx.totalSentences === passages.reduce((n, p) => n + p.sentences.length, 0));
  check("authoring: level 분포 합 = 지문 수", Object.values(idx.levelDistribution).reduce((a, b) => a + b, 0) === passages.length);
  check("authoring: topic 분포 존재", Object.keys(idx.topicDistribution).length >= 1);
  check("authoring: 제목 완전중복 0(현재 데이터)", idx.titleDuplicates.length === 0, idx.titleDuplicates.join(","));
  check("authoring: 문장 완전중복 0(현재 데이터)", idx.exactSentenceDuplicates.length === 0, `${idx.exactSentenceDuplicates.length}건`);

  const hint = nextCurriculumHint(passages, idx);
  check("authoring: 다음 지문 번호 = 지문수+1", hint.nextPassageNumber === passages.length + 1);
  check("authoring: 기존 id 목록 전달", hint.existingIds.length === passages.length);

  const pkg = buildAuthoringPackage(passages, { batchSize: 1 });
  check("authoring: 패키지에 규칙/스키마 버전 포함", pkg.includes(`rulesVersion=${RULES_VERSION}`));
  check("authoring: 패키지에 작성 규칙·양식 포함", pkg.includes("[작성 규칙]") && pkg.includes("[양식]"));
  check("authoring: 패키지에 현재 상태 포함", pkg.includes("현재 공식 콘텐츠 상태") && pkg.includes(`${idx.totalPassages}편`));
  check("authoring: 패키지에 앵커 포함", pkg.includes("[레벨 앵커]"));

  const first = passages[0];
  const idDup = compareAgainstExisting({ id: first.id, title: "X", titleKr: "임시제목", level: hint.recommendedLevel, topic: "T", sentences: [] }, passages);
  check("authoring: 기존 id 중복 검출", idDup.notes.some((n) => n.kind === "dup" && /id/.test(n.msg)));
  const sentDup = compareAgainstExisting({ id: "brand-new-xyz", title: "Y", titleKr: "새 제목 특수", level: hint.recommendedLevel, topic: "T", sentences: [{ text: first.sentences[0].text }] }, passages);
  check("authoring: 기존 문장 완전동일 검출", sentDup.notes.some((n) => n.kind === "dup" && /문장/.test(n.msg)));
  const clean = compareAgainstExisting({ id: "totally-fresh-abc", title: "Fresh Title", titleKr: "완전히 새로운 제목 98765", level: hint.recommendedLevel, topic: "T", sentences: [{ text: "This is a brand new sentence never used before here." }] }, passages);
  check("authoring: 깨끗한 신규는 중복 note 0", clean.notes.filter((n) => n.kind === "dup").length === 0, clean.notes.map((n) => n.msg).join(" / "));
}

// ── lint(정성 자동 경고) ──────────────────────────────
{
  const short = { level: 1, sentences: [{ text: "I run home." }] };
  check("lint: Lv1 단어수 하한 경고", lintPassage(short).warnings.some((w) => /하한/.test(w.msg)));

  const rhythm = { level: 1, sentences: Array.from({ length: 5 }, () => ({ text: "I open the door now." })) };
  check("lint: 길이 리듬 경고", lintPassage(rhythm).warnings.some((w) => /단조/.test(w.msg)));

  const curly = { level: 2, sentences: [{ text: "I read the book slowly every night.", grammar: [{ label: "a", note: "‘읽다’라는 뜻" }] }] };
  check("lint: 굽은 따옴표 경고", lintPassage(curly).warnings.some((w) => /따옴표/.test(w.msg)));

  const passive = { level: 2, sentences: [{ text: "The old package was delivered here just before noon." }] };
  check("lint: 수동태 경고", lintPassage(passive).warnings.some((w) => /수동태/.test(w.msg)));

  const lead = { level: 1, sentences: [{ text: "I go to school." }, { text: "I eat my lunch." }, { text: "I read a book." }, { text: "I walk back home." }, { text: "We play together." }] };
  check("lint: 시작어 반복 경고", lintPassage(lead).warnings.some((w) => /시작/.test(w.msg)));

  const clean = { level: 2, sentences: [{ text: "The quiet cafe near my house stays open until late evening." }] };
  check("lint: 정상 문장은 단어수 경고 없음", !lintPassage(clean).warnings.some((w) => /하한|초과/.test(w.msg)));

  // 현 데이터 lint 실측(정보 출력, 실패 아님 - 경고는 참고용)
  const data = JSON.parse(readFileSync(join(here, "../src/data/passages.json"), "utf8"));
  const all = data.courses.flatMap((c) => c.passages);
  let total = 0;
  const flagged = [];
  for (const p of all) {
    const wn = lintPassage(p).warnings;
    total += wn.length;
    if (wn.length) flagged.push(`${p.id}(${wn.length})`);
  }
  console.log(`\ni - lint 경고 실측: 현 ${all.length}편 중 ${total}건` + (flagged.length ? ` :: ${flagged.join(", ")}` : " :: 경고 0"));
}

console.log(failures === 0 ? "\n모든 테스트 통과" : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
