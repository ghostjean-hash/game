// 지문 한 편의 데이터 무결성 + 끊는 기준 검증. DOM 미의존 순수 로직.
// 출제 관리 화면(붙여넣기 검증)과 tests/run-node.mjs가 같은 규칙을 공유한다.
import { tokenize, resolveTargets } from "./tokenize.js";
import { chunkViolations } from "./chunking.js";

const norm = (t) => String(t).toLowerCase().replace(/[^a-z]/g, "");

// 반환: { ok, errors: [{ where, msg }] } - where는 사람이 읽는 위치("2번째 문장" 등)
export function validatePassage(p) {
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
    if (norm(s.chunks.map((c) => c.en).join(" ")) !== norm(s.text)) {
      push(w, "chunks의 en을 공백으로 이으면 원문과 정확히 같아야 합니다(현재 어긋남).");
    }
    if (!s.chunks.every((c) => c && c.en && c.kr)) push(w, "각 덩어리에 en(영어)과 kr(직독직해 한글)이 모두 필요합니다.");

    chunkViolations(tokens, s.chunks).forEach((v) => push(w, `끊는 기준 위반 - ${v.detail}`));

    if (!Array.isArray(s.grammar) || s.grammar.length < 1) push(w, "문법(grammar)이 최소 1개 필요합니다.");
    (s.grammar || []).forEach((g, gi) => {
      if (!g || !g.label || !g.note) push(w, `문법 ${gi + 1}번에 이름표(label)와 설명(note)이 필요합니다.`);
    });

    (s.words || []).forEach((wd) => {
      const r = resolveTargets(tokens, [wd])[0];
      if (!r || r.index < 0) push(w, `단어 "${wd && wd.word}"가 원문에 실제로 없습니다.`);
      if (!wd || !wd.meaning) push(w, `단어 "${wd && wd.word}"의 뜻(meaning)이 필요합니다.`);
    });

    if (s.insight) {
      const full = s.insight.formula && s.insight.why && s.insight.wrong && s.insight.natural;
      if (!full) push(w, "insight를 넣으면 공식(formula)·왜(why)·비문(wrong)·자연(natural) 4필드를 모두 채워야 합니다.");
    }
  });

  return { ok: errors.length === 0, errors };
}
