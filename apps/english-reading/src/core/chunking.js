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

// 가이드 규칙 위반 검사 - chunks 데이터가 "끊는 기준" 팝업 규칙을 지키는지 자동 판정한다.
// 데이터가 곧 정답지이므로, 잘못 쪼갠 경계를 테스트가 잡아내 가이드-데이터 100% 일치를 강제한다.
//
// 규칙(위반 = 끊으면 안 되는 자리에서 끊음):
//  A. be동사·조동사 뒤는 못 끊는다 - "is / staring"처럼 보어·본동사를 떼면 위반(긴 주어 뒤 규칙은 '동사 앞'만 허용).
//  B. 짧은 주어(3단어 이하) 뒤 be·조동사 앞은 못 끊는다 - "A placebo / is a fake pill"은 위반. 동사 앞 끊기는 긴 주어일 때만.
//  C. 절 중간의 짧은 전치사구(전치사+목적어 2단어 이하) 앞은 못 끊는다 - "of noticing", "for facts"는 앞 덩어리에 붙인다.
//     예외: 콤마가 이미 끊어 준 자리 / 문장 맨 끝의 짧은 부사구(over time, at all 등 - 독립적으로 끊어 읽는 게 정상).
//  D. 전치사가 앞 덩어리 끝에 남으면 못 끊는다 - "searches for / facts"처럼 전치사와 목적어를 갈라놓으면 위반.
const AUX_TAIL = new Set([
  "is", "are", "was", "were", "am", "be", "been", "being",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  "do", "does", "did", "have", "has", "had",
]);
// 절·부정사를 여는 낱말 - be동사 뒤라도 이 앞에서는 끊어 읽는 게 정당(that절 보어, be+to 용법 등).
const CLAUSE_LEAD = new Set([
  "that", "who", "whom", "whose", "which", "when", "where", "why", "how", "whether", "to",
]);

export function chunkViolations(tokens, chunks) {
  const out = [];
  let acc = 0;
  const clean = (w) => String(w).toLowerCase().replace(/[^a-z']/g, "");
  for (let i = 1; i < chunks.length; i++) {
    acc += String(chunks[i - 1].en).split(/\s+/).filter(Boolean).length;
    const prevTok = tokens[acc - 1];
    const afterComma = prevTok && /,$/.test(prevTok.raw); // 콤마 뒤는 정당한 끊기
    const prevWords = String(chunks[i - 1].en).split(/\s+/).filter(Boolean);
    const nextWords = String(chunks[i].en).split(/\s+/).filter(Boolean);
    const prevEnd = clean(prevWords[prevWords.length - 1]);
    const nextStart = clean(nextWords[0]);

    if (PREP.has(prevEnd)) {
      out.push({ index: i, kind: "prep-tail", detail: `전치사 "${prevEnd}"가 목적어와 갈림 - "${chunks[i - 1].en}" / "${chunks[i].en}"` });
    } else if (AUX_TAIL.has(prevEnd) && !CLAUSE_LEAD.has(nextStart)) {
      out.push({ index: i, kind: "aux-tail", detail: `"${chunks[i - 1].en}" 끝 be/조동사 뒤에서 끊음` });
    } else if (!afterComma && AUX_TAIL.has(nextStart) && prevWords.length <= 2) {
      out.push({ index: i, kind: "aux-head", detail: `짧은 주어 "${chunks[i - 1].en}" 뒤 be/조동사 "${nextStart}" 앞에서 끊음` });
    } else if (!afterComma && PREP.has(nextStart) && nextWords.length <= 2 && i < chunks.length - 1) {
      // i < chunks.length-1 : 마지막 덩어리(문장 끝 부사구)는 독립적으로 끊어 읽어도 정상이라 예외
      out.push({ index: i, kind: "short-prep", detail: `짧은 전치사구 "${chunks[i].en}" 앞에서 끊음` });
    }
  }
  return out;
}

// slashes: 사용자가 그은 틈 번호 목록. 정답 경계와 대조해 세 갈래로 나눈다.
// correct = 그었고 정답 / wrong = 그었지만 정답 아님 / missed = 정답인데 안 그음.
// (구 이진 판정 - 내부 재사용·기존 회귀 테스트용으로 보존. 화면 채점은 gradeChunks가 대체.)
export function gradeSlashes(boundaries, slashes) {
  const drawn = new Set(slashes);
  const correct = [];
  const wrong = [];
  const missed = [];
  drawn.forEach((g) => (boundaries.has(g) ? correct : wrong).push(g));
  boundaries.forEach((g) => { if (!drawn.has(g)) missed.push(g); });
  return { correct, wrong, missed };
}

// 끊기 5등급 판정 - O/X 이진을 대체한다. 사용자가 그은 선을 대표 추천 경계와
// 허용(allowed)·비추천(discouraged) 목록에 대조해 나눈다.
//   recommended = 그었고 대표 추천 경계와 일치
//   allowed     = 대표 경계는 아니지만 breakRules.allowed에 등록된 위치
//   discouraged = breakRules.discouraged에 등록된 위치
//   neutral     = 그었지만 어느 목록에도 없는 위치(단일 정답 강제 금지 - 다른 분할로 인정)
//   missed      = 대표 추천 경계인데 긋지 않음
// 우선순위 recommended > allowed > discouraged > neutral (한 선은 한 분류에만).
export function gradeChunks(boundaries, allowedSet, discouragedSet, slashes) {
  const drawn = new Set(slashes);
  const allowed0 = allowedSet instanceof Set ? allowedSet : new Set(allowedSet || []);
  const discouraged0 = discouragedSet instanceof Set ? discouragedSet : new Set(discouragedSet || []);
  const recommended = [];
  const allowed = [];
  const discouraged = [];
  const neutral = [];
  const missed = [];
  drawn.forEach((g) => {
    if (boundaries.has(g)) recommended.push(g);
    else if (allowed0.has(g)) allowed.push(g);
    else if (discouraged0.has(g)) discouraged.push(g);
    else neutral.push(g);
  });
  boundaries.forEach((g) => { if (!drawn.has(g)) missed.push(g); });
  return { recommended, allowed, discouraged, neutral, missed };
}
