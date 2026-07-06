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
