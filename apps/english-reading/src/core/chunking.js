// 끊어 읽기 긋기 채점. DOM 미의존 순수 로직.
//
// 틈(gap) 번호 = g번 토큰과 g+1번 토큰 사이(0-based). 문장에 토큰이 n개면 틈은 0..n-2.
// 정답 경계는 청킹 데이터(chunks.en)의 단어 수 누적 위치다 - 데이터가 곧 정답지라
// 별도 정답 입력이 필요 없다.

export function chunkBoundaries(tokens, chunks) {
  const bounds = new Set();
  let acc = 0;
  for (let i = 0; i < chunks.length - 1; i++) {
    acc += String(chunks[i].en).split(/\s+/).filter(Boolean).length;
    const gap = acc - 1; // 누적 c번째 단어 뒤의 틈 = c-1
    if (gap >= 0 && gap < tokens.length - 1) bounds.add(gap);
  }
  return bounds;
}

// 경계 이유 자동 판별 - "왜 여기서 끊는가"를 다음 덩어리의 시작 단어로 분류한다.
// 데이터에 이유를 손으로 심지 않고 파생시키며, 판별이 애매하면 "의미 덩어리"로 둔다.
const CONJ = new Set(["because", "when", "once", "after", "before", "if", "although", "though", "while", "unless", "and", "but", "or", "so", "as"]);
const PREP = new Set(["on", "at", "in", "from", "with", "by", "about", "of", "for", "under", "during", "without", "into", "onto", "over", "near", "between", "through", "against", "toward", "towards"]);
const REL = new Set(["who", "whose", "whom", "which"]);
const WH = new Set(["how", "what", "why", "where", "whether"]);
const VERB_HEAD = new Set(["is", "are", "was", "were", "will", "would", "can", "could", "may", "might", "must"]);

export function boundaryReason(prevEn, nextEn) {
  const prev = String(prevEn).trim();
  const words = String(nextEn).toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
  const w0 = words[0] || "";
  const w1 = words[1] || "";
  if (prev.endsWith(",")) return "콤마 뒤";
  if (w0 === "even" && w1 === "though") return "접속사 앞";
  if (w0 === "that") return "that절 앞";
  if (REL.has(w0)) return "관계대명사 앞";
  if (WH.has(w0)) return "의문사·whether절 앞";
  if (w0 === "to") return "to부정사 앞";
  if (w0 === "than") return "비교 than 앞";
  if (CONJ.has(w0)) return "접속사 앞";
  if (PREP.has(w0)) return "전치사구 앞";
  if (VERB_HEAD.has(w0)) return "동사 앞(긴 주어 뒤)";
  if (w0.endsWith("ed") && w1 === "by") return "분사구 앞";
  return "의미 덩어리";
}

// 덩어리별 끊는 이유 목록 - 첫 덩어리는 null, 이후는 경계 이유.
// 콤마는 덩어리 문자열이 아니라 원문 토큰에서 판별한다(데이터가 콤마를 생략해도 정확).
export function chunkReasons(tokens, chunks) {
  const reasons = [null];
  let acc = 0;
  for (let i = 1; i < chunks.length; i++) {
    acc += String(chunks[i - 1].en).split(/\s+/).filter(Boolean).length;
    const prevTok = tokens[acc - 1];
    reasons.push(
      prevTok && /,$/.test(prevTok.raw)
        ? "콤마 뒤"
        : boundaryReason(chunks[i - 1].en, chunks[i].en)
    );
  }
  return reasons;
}

// slashes: 사용자가 그은 틈 번호 목록. 정답 경계와 대조해 세 갈래로 나눈다.
// correct = 그었고 정답 / wrong = 그었지만 정답 아님 / missed = 정답인데 안 그음.
export function gradeSlashes(boundaries, slashes) {
  const drawn = new Set(slashes);
  const correct = [];
  const wrong = [];
  const missed = [];
  drawn.forEach((g) => (boundaries.has(g) ? correct : wrong).push(g));
  boundaries.forEach((g) => { if (!drawn.has(g)) missed.push(g); });
  return { correct, wrong, missed };
}
