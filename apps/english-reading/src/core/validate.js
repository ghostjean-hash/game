// 지문 한 편의 데이터 무결성 + 끊는 기준 검증. DOM 미의존 순수 로직.
// 출제 관리 화면(붙여넣기 검증)과 tests/run-node.mjs가 같은 규칙을 공유한다.
import { tokenize, matchWordTargets } from "./tokenize.js";
import { chunkViolations, chunkBoundaries } from "./chunking.js";

const norm = (t) => String(t).toLowerCase().replace(/[^a-z]/g, "");

// 아이폰 등 모바일 키보드는 붙여넣을 때 직선 따옴표(" ')를 곡선(" " ' ')으로 바꾼다.
// JSON은 직선 큰따옴표만 허용하므로 곡선을 직선으로 되돌려 JSON.parse가 깨지지 않게 한다.
// 값 안에 일부러 넣은 곡선 따옴표도 직선이 되지만 뜻·구조에는 영향이 없다.
export function normalizeSmartQuotes(s) {
  return String(s)
    .replace(/[“”„‟″‶]/g, '"')
    .replace(/[‘’‚‛′‵]/g, "'");
}

// 반환: { ok, errors: [{ where, msg }] } - where는 사람이 읽는 위치("2번째 문장" 등)
// opts.strict=true(built-in 콘텐츠 회귀)면 신규 필드(naturalTranslation·wordOrderPoint)를 필수화.
// 기본(false, 출제 화면·customPassages)은 신규 필드가 있으면 형식만 검증하고 없어도 통과(하위호환).
export function validatePassage(p, opts = {}) {
  const strict = !!opts.strict;
  const errors = [];
  const push = (where, msg) => errors.push({ where, msg });

  if (!p || typeof p !== "object" || Array.isArray(p)) {
    push("전체", "지문은 하나의 객체여야 합니다.");
    return { ok: false, errors };
  }
  if (!p.id || !/^[a-z0-9-]+$/.test(String(p.id))) push("id", "id는 영문 소문자·숫자·하이픈으로 된 고유 이름이어야 합니다.");
  if (typeof p.level !== "number") push("level", "level은 숫자여야 합니다(난이도, 1이 가장 쉬움).");
  if (!p.title) push("title", "영어 제목(title)이 필요합니다.");
  if (!p.titleKr) push("titleKr", "한글 제목(titleKr)이 필요합니다.");
  if (!Array.isArray(p.sentences) || p.sentences.length < 1) {
    push("sentences", "문장(sentences)이 최소 1개 필요합니다.");
    return { ok: false, errors };
  }

  p.sentences.forEach((s, i) => {
    const w = `${i + 1}번째 문장`;
    if (!s || !s.text) { push(w, "원문 text가 필요합니다."); return; }
    const tokens = tokenize(s.text);

    if (!Array.isArray(s.chunks) || s.chunks.length < 1) { push(w, "끊어읽기 덩어리(chunks)가 필요합니다."); return; }
    const chunkEnJoined = s.chunks.map((c) => c.en).join(" ");
    if (norm(chunkEnJoined) !== norm(s.text)) {
      push(w, "chunks의 en을 공백으로 이으면 원문과 정확히 같아야 합니다(현재 어긋남).");
    } else {
      // 글자는 같아도 단어(토큰) 경계가 어긋나면 채점 위치가 밀린다(하이픈·공백 차이 등).
      // chunkBoundaries가 공백 분할 단어 수로 경계를 잡으므로 토큰 단위로 재확인한다.
      const chunkToks = tokenize(chunkEnJoined).map((t) => t.clean);
      const textToks = tokens.map((t) => t.clean);
      if (chunkToks.length !== textToks.length || chunkToks.some((c, k) => c !== textToks[k])) {
        push(w, "chunks의 단어 나눔이 원문과 어긋납니다 - 하이픈·공백 때문에 단어 수가 달라 채점 위치가 밀립니다.");
      }
    }
    if (!s.chunks.every((c) => c && c.en && c.kr)) push(w, "각 덩어리에 en(영어)과 kr(직독직해 한글)이 모두 필요합니다.");

    chunkViolations(tokens, s.chunks).forEach((v) => push(w, `끊는 기준 위반 - ${v.detail}`));

    if (!Array.isArray(s.grammar) || s.grammar.length < 1) push(w, "문법(grammar)이 최소 1개 필요합니다.");
    (s.grammar || []).forEach((g, gi) => {
      if (!g || !g.label || !g.note) push(w, `문법 ${gi + 1}번에 이름표(label)와 설명(note)이 필요합니다.`);
    });

    (s.words || []).forEach((wd) => {
      const m = matchWordTargets(tokens, [wd]);
      if (!m.length) push(w, `단어/표현 "${wd && wd.word}"가 원문에 연속으로 없습니다 - 원문에 나온 형태 그대로 적으세요(활용형 유지, 숙어는 띄어쓰기 포함해 연속으로).`);
      if (!wd || !wd.meaning) push(w, `단어 "${wd && wd.word}"의 뜻(meaning)이 필요합니다.`);
    });

    if (s.insight) {
      const full = s.insight.formula && s.insight.why && s.insight.wrong && s.insight.natural;
      if (!full) push(w, "insight를 넣으면 공식(formula)·왜(why)·비문(wrong)·자연(natural) 4필드를 모두 채워야 합니다.");
    }

    // ── 신규 필드(옵셔널+fallback) 검증 ──
    // 자연스러운 전체 해석
    if (s.naturalTranslation != null && typeof s.naturalTranslation !== "string") {
      push(w, "naturalTranslation(자연스러운 전체 해석)은 문자열이어야 합니다.");
    } else if (strict && !s.naturalTranslation) {
      push(w, "naturalTranslation(자연스러운 전체 해석)이 필요합니다.");
    }

    // 핵심 어순/패턴
    if (s.wordOrderPoint != null) {
      if (typeof s.wordOrderPoint !== "object" || Array.isArray(s.wordOrderPoint) || !s.wordOrderPoint.title || !s.wordOrderPoint.explanation) {
        push(w, "wordOrderPoint에 title(핵심 어순·패턴)과 explanation(설명)이 모두 필요합니다.");
      }
    } else if (strict) {
      push(w, "wordOrderPoint(핵심 어순·패턴)가 필요합니다.");
    }

    // 끊기 등급 규칙(breakRules) - 있으면 형식·범위·중복 검증(없어도 통과, strict도 필수화하지 않음)
    if (s.breakRules != null) {
      const br = s.breakRules;
      if (typeof br !== "object" || Array.isArray(br)) {
        push(w, "breakRules는 { allowed, discouraged } 객체여야 합니다.");
      } else {
        const tokenLen = tokens.length;
        const boundaries = chunkBoundaries(tokens, s.chunks);
        const checkList = (key) => {
          if (br[key] == null) return [];
          if (!Array.isArray(br[key])) { push(w, `breakRules.${key}는 배열이어야 합니다.`); return []; }
          const seen = new Set();
          const bs = [];
          br[key].forEach((r, ri) => {
            if (!r || typeof r !== "object") { push(w, `breakRules.${key} ${ri + 1}번은 { boundary, reason } 객체여야 합니다.`); return; }
            if (!Number.isInteger(r.boundary)) { push(w, `breakRules.${key} ${ri + 1}번의 boundary는 정수(토큰 틈 번호)여야 합니다.`); return; }
            if (r.boundary < 0 || r.boundary > tokenLen - 2) { push(w, `breakRules.${key}의 boundary ${r.boundary}가 범위(0~${tokenLen - 2})를 벗어납니다.`); return; }
            if (seen.has(r.boundary)) { push(w, `breakRules.${key}에 boundary ${r.boundary}가 중복됩니다.`); return; }
            if (!r.reason) push(w, `breakRules.${key}의 boundary ${r.boundary}에 이유(reason)가 필요합니다.`);
            seen.add(r.boundary);
            bs.push(r.boundary);
          });
          return bs;
        };
        const allowedBs = checkList("allowed");
        const discBs = checkList("discouraged");
        allowedBs.forEach((b) => { if (discBs.includes(b)) push(w, `boundary ${b}가 allowed와 discouraged에 동시에 등록됐습니다.`); });
        discBs.forEach((b) => { if (boundaries.has(b)) push(w, `boundary ${b}는 대표 추천 경계이므로 discouraged에 넣을 수 없습니다.`); });
      }
    }
  });

  return { ok: errors.length === 0, errors };
}

// ── 정성 규칙 자동 경고(lint) ────────────────────────────────
// 3개 LLM 감수가 반복 지적한 것 중 코드로 셀 수 있는 항목을 출제 때마다 자동으로 잡는다.
// error(형식 실패)가 아니라 warning - 출제 규칙상 단어 수 등은 강제가 아니므로(AUTHORING_RULES 2장),
// 걸려도 자비스가 판단해 넘길 수 있게 '실패'로 막지 않는다. 뜻·자연스러움 같은 의미 판단은
// 코드가 못 잡으므로 lint 대상이 아니다(LLM 감수 유지).
const WORD_RANGE = { 1: [7, 11], 2: [8, 14], 3: [9, 18] }; // 레벨별 권장 단어 수(AUTHORING_RULES 2장)
const CURLY_QUOTE = /[“”‘’„‟″‶′‵❛❜❝❞]/;
const BE_FORMS = new Set(["is", "are", "was", "were", "am", "be", "been", "being"]);
// 흔한 불규칙 과거분사(수동태·과거완료 감지용, 대표만)
const IRREGULAR_PP = new Set([
  "brought", "taken", "given", "made", "done", "seen", "known", "shown", "found", "kept",
  "left", "held", "told", "sold", "built", "sent", "spent", "lost", "won", "met", "paid",
  "grown", "drawn", "thrown", "worn", "broken", "chosen", "spoken", "stolen", "frozen",
  "driven", "written", "eaten", "beaten", "hidden", "forgotten", "bitten", "fallen", "gotten",
]);
// -ed로 끝나지만 형용사로 흔히 쓰여 수동태로 오인하기 쉬운 낱말(과탐 방지)
const ED_ADJECTIVE = new Set([
  "tired", "bored", "excited", "interested", "pleased", "surprised", "scared", "worried",
  "confused", "relaxed", "amazed", "annoyed", "embarrassed", "satisfied", "crowded", "used",
]);
const NOUN_LEAD_TO = /^(something|anything|nothing|someone|anyone|everyone|way|place|time|thing|things|reason|chance)$/;

function isPastParticiple(cleanWord) {
  const c = String(cleanWord);
  if (ED_ADJECTIVE.has(c)) return false;
  return IRREGULAR_PP.has(c) || /ed$/.test(c);
}

// 반환: { warnings: [{ where, msg }] } - 형식 검증과 별개(passes/fails 아님, 참고 경고).
export function lintPassage(p) {
  const warnings = [];
  const push = (where, msg) => warnings.push({ where, msg });
  if (!p || !Array.isArray(p.sentences)) return { warnings };
  const lv = p.level;
  const range = WORD_RANGE[lv];
  const lengths = [];
  const firstWords = [];

  p.sentences.forEach((s, i) => {
    if (!s || !s.text) return;
    const w = `${i + 1}번째 문장`;
    const toks = tokenize(s.text);
    const n = toks.length;
    lengths.push(n);
    firstWords.push(toks[0] ? toks[0].clean : "");

    // 1. 레벨별 단어 수 이탈
    if (range) {
      if (n < range[0]) push(w, `단어 ${n}개 - Lv${lv} 권장 하한 ${range[0]} 미만(너무 짧음).`);
      else if (n > range[1]) push(w, `단어 ${n}개 - Lv${lv} 권장 상한 ${range[1]} 초과(너무 김).`);
    }

    // 2. 굽은 따옴표 잔존(문장 데이터 전체 문자열 기준)
    if (CURLY_QUOTE.test(JSON.stringify(s))) push(w, `굽은 따옴표가 있습니다 - 곧은 따옴표(' ")로 바꾸세요.`);

    // 3. 레벨 초과 문법(휴리스틱 - 경고이므로 과탐 감수)
    const cl = toks.map((t) => t.clean);
    for (let k = 0; k < cl.length - 1; k++) {
      const cur = cl[k], nxt = cl[k + 1];
      if (lv < 3 && cur === "had" && isPastParticiple(nxt)) {
        push(w, `과거완료(had ${nxt})는 Lv3 성격 - Lv${lv}엔 최소화(1회 이내) 권장.`);
      } else if (lv < 3 && BE_FORMS.has(cur) && isPastParticiple(nxt)) {
        push(w, `수동태 가능성(${cur} ${nxt}) - Lv3 성격이니 Lv${lv}에 맞는지 확인.`);
      }
      if (lv === 1 && nxt === "to" && k >= 0 && NOUN_LEAD_TO.test(cur) && cl[k + 2]) {
        push(w, `to부정사 후치수식(${cur} to ...)은 Lv2 성격 - Lv1이면 순수 명사구 권장.`);
      }
    }
  });

  // 4. 문장 길이 리듬 - 길이 종류가 2개 이하로 단조로울 때만(7~9처럼 이미 변화가 있으면 통과).
  if (lengths.length >= 4) {
    const kinds = new Set(lengths).size;
    if (kinds <= 2) {
      const mx = Math.max(...lengths), mn = Math.min(...lengths);
      push("전체", `문장 길이가 ${mn}~${mx}단어(종류 ${kinds}개)로 단조롭습니다 - 길이에 리듬을 주세요.`);
    }
  }

  // 5. 같은 단어로 시작하는 문장 과다(5문장 중 4개 이상 - 3개는 1인칭 지문에 흔해 제외).
  const leadCount = {};
  firstWords.forEach((f) => { if (f) leadCount[f] = (leadCount[f] || 0) + 1; });
  Object.entries(leadCount).forEach(([lead, c]) => {
    if (c >= 4) push("전체", `${c}개 문장이 "${lead}"로 시작합니다 - 시작 단어를 다양하게.`);
  });

  return { warnings };
}
