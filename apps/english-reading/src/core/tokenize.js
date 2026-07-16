// 문장을 클릭 가능한 단어 토큰으로 쪼갠다. DOM 미의존 순수 함수.
//
// 각 토큰:
//   { index, raw, clean }
//   - raw:   화면 표시용 원본 (구두점 포함, 예: "it,")
//   - clean: 타겟 매칭용 정제형 (소문자 + 알파벳·아포스트로피만, 예: "it")

export function tokenize(text) {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((raw, index) => ({
      index,
      raw,
      clean: raw.toLowerCase().replace(/[^a-z']/g, ""),
    }));
}

// words의 각 항목을 원문 토큰 시퀀스에 매칭한다. 단일 낱말은 토큰 1개, 숙어("takes a bus")는 연속 N개.
// word를 공백으로 쪼갠 각 조각의 clean이 원문 토큰의 clean과 순서대로 일치하는 시작 위치를 찾는다.
// nth(1-based)로 같은 표현이 여러 번 나올 때 위치를 고른다. 반환: [{ ...원항목, indices:[토큰인덱스...] }] (매칭 실패·토큰 겹침 항목은 제외).
export function matchWordTargets(tokens, words = []) {
  const cleanTokens = tokens.map((t) => t.clean);
  const used = new Array(tokens.length).fill(false);
  const out = [];
  for (const w of words) {
    const parts = String(w.word).toLowerCase().split(/\s+/).map((p) => p.replace(/[^a-z']/g, "")).filter(Boolean);
    if (!parts.length) continue;
    const nth = w.nth || 1;
    let seen = 0;
    let start = -1;
    for (let i = 0; i + parts.length <= cleanTokens.length; i++) {
      let ok = true;
      for (let j = 0; j < parts.length; j++) {
        if (cleanTokens[i + j] !== parts[j]) { ok = false; break; }
      }
      if (ok) { seen += 1; if (seen === nth) { start = i; break; } }
    }
    if (start < 0) continue;
    const indices = parts.map((_, j) => start + j);
    if (indices.some((idx) => used[idx])) continue; // 다른 표현과 토큰이 겹치면 건너뛴다
    indices.forEach((idx) => { used[idx] = true; });
    out.push({ ...w, indices });
  }
  return out;
}

// targetWords(데이터의 { word, nth, ... })를 실제 토큰 인덱스로 해석한다.
// 같은 단어가 여러 번 나올 때 nth(1-based)로 몇 번째를 가리키는지 정한다.
// 해석 실패 시 index: -1 (데이터 오류 방어).
export function resolveTargets(tokens, targetWords = []) {
  return targetWords.map((t) => {
    const want = String(t.word).toLowerCase();
    const nth = t.nth || 1;
    let seen = 0;
    let index = -1;
    for (const tok of tokens) {
      if (tok.clean === want) {
        seen += 1;
        if (seen === nth) {
          index = tok.index;
          break;
        }
      }
    }
    return { ...t, index };
  });
}
