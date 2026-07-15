// 문장 스키마 정규화 - 신규 필드(naturalTranslation·wordOrderPoint·breakRules)의
// 기본값과 하위호환 fallback을 한 곳에서 제공한다. DOM 미의존 순수 함수.
//
// 목적: customPassages(localStorage에 구스키마로 저장된 사용자 지문)를 영구 변환하지 않고,
// 렌더·채점 진입 시점에 이 함수 하나만 통과시켜 신·구 스키마를 같은 모양으로 다룬다.
// 원본 객체는 변형하지 않고 얕은 사본에 신 필드를 채워 반환한다.

// breakRules.allowed / discouraged → boundary 번호 Set (0-based 토큰 gap 인덱스).
// 잘못된/범위 밖 항목은 조용히 버린다(렌더는 방어적, 엄격 검증은 validate.js 소관).
export function boundarySet(rules, key, tokenLen) {
  const set = new Set();
  const list = rules && Array.isArray(rules[key]) ? rules[key] : [];
  for (const r of list) {
    const b = r && Number.isInteger(r.boundary) ? r.boundary : null;
    if (b !== null && b >= 0 && b <= tokenLen - 2) set.add(b);
  }
  return set;
}

// breakRules 항목에서 boundary → reason 맵(선택한 비추천 위치의 이유 표시용).
export function reasonByBoundary(rules, key) {
  const map = new Map();
  const list = rules && Array.isArray(rules[key]) ? rules[key] : [];
  for (const r of list) {
    if (r && Number.isInteger(r.boundary) && r.reason) map.set(r.boundary, String(r.reason));
  }
  return map;
}

// 직독직해 조각을 임시로 이어 붙인 완역 fallback - naturalTranslation·insight.natural이 둘 다 없을 때만.
function joinChunkKr(chunks) {
  return (Array.isArray(chunks) ? chunks : [])
    .map((c) => (c && c.kr ? String(c.kr).trim() : ""))
    .filter(Boolean)
    .join(" ");
}

export function normalizeSentence(s) {
  const src = s && typeof s === "object" ? s : {};
  const chunks = Array.isArray(src.chunks) ? src.chunks : [];
  const grammar = Array.isArray(src.grammar) ? src.grammar : [];

  // 자연스러운 전체 해석: 신 필드 → insight.natural → 직독직해 이어붙임(임시)
  let naturalTranslation = "";
  if (src.naturalTranslation) naturalTranslation = String(src.naturalTranslation);
  else if (src.insight && src.insight.natural) naturalTranslation = String(src.insight.natural);
  else naturalTranslation = joinChunkKr(chunks);

  // 핵심 어순/패턴: 신 필드 → grammar[0](이름표=제목, 설명=explanation)
  let wordOrderPoint = null;
  if (src.wordOrderPoint && src.wordOrderPoint.title && src.wordOrderPoint.explanation) {
    wordOrderPoint = { title: String(src.wordOrderPoint.title), explanation: String(src.wordOrderPoint.explanation) };
  } else if (grammar[0] && grammar[0].label && grammar[0].note) {
    wordOrderPoint = { title: String(grammar[0].label), explanation: String(grammar[0].note), fromGrammar: true };
  }

  // 끊기 등급 규칙: 없으면 빈 배열(기존 이진 정답만 있는 구스키마와 동일하게 추천/놓침만 판정)
  const br = src.breakRules && typeof src.breakRules === "object" ? src.breakRules : {};
  const breakRules = {
    allowed: Array.isArray(br.allowed) ? br.allowed : [],
    discouraged: Array.isArray(br.discouraged) ? br.discouraged : [],
  };

  return { ...src, chunks, grammar, naturalTranslation, wordOrderPoint, breakRules };
}
