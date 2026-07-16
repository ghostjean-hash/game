// 출제 관리(authoring) 순수 로직 - 콘텐츠 상태 분석 · 커리큘럼 힌트 · 앵커 추출 · 출제 패키지 조립 · 기존 대조.
// DOM 미의존. 정성 출제 규칙(AUTHORING_RULES)의 단일 권위 위치다.
// 역할 분리: 자동 검증 규칙의 권위는 core/validate.js(코드로 판정), 정성 규칙(자연스러움·난이도·청킹 원칙 등)의
// 권위는 이 파일의 AUTHORING_RULES(코드로 판정 불가). 출제 패키지는 이 둘 + 현재 상태를 조립한 파생물이다.

// 규칙/스키마 버전 - 규칙 문구나 JSON 스키마가 바뀌면 올린다(패키지·산출물 추적용).
export const RULES_VERSION = "1.0.0";
export const SCHEMA_VERSION = "1.0.0";

// 최종 커리큘럼 목표(강제 아님, 목표값). 매직넘버를 한 곳에 모은다.
export const CURRICULUM = {
  targetPassages: 200,
  sentencesPerPassage: 5,
  get targetSentences() { return this.targetPassages * this.sentencesPerPassage; },
};

const OVERUSE_THRESHOLD = 3; // grammar label이 이 횟수 이상이면 '과다 사용' 힌트로 표시
const RECENT_COUNT = 5;      // '최근 지문'으로 보여줄 개수(데이터 배열 말미 기준)

// level별 기본 앵커(자동 선정하지 않음, 사람이 조정 가능한 임시 최소값).
// 근거: 각 level의 대표 지문 - level1 가장 쉬운 기준점 / level3 상한 기준점(마지막 지문).
export const DEFAULT_ANCHORS = [
  { level: 1, role: "standard", id: "slow-morning-start" },
  { level: 2, role: "standard", id: "quiet-cafe" },
  { level: 3, role: "standard", id: "choosing-good-information" },
];

// 정성 출제 규칙 = 이 상수가 단일 권위. main.js와 출제 패키지는 이걸 참조만 하고 따로 복사하지 않는다.
// (역할 + 양식 + 규칙 + 올바른 예시. 실제 '무엇을 만들지'의 배치 지시는 buildAuthoringPackage가 현재 상태로 생성한다.)
export const AUTHORING_RULES = `너는 영어 독해 학습 앱의 문제 출제자다. 아래 [양식]과 [규칙]을 정확히 지켜, 지문 한 편을 JSON 하나로만 출력해라(설명·코드블록 없이 JSON만).

[양식]
{
  "id": "고유한-영문소문자-하이픈-이름",
  "level": 1,
  "topic": "주제 분류(영어, 예: Daily Life)",
  "title": "영어 제목",
  "titleKr": "한글 제목",
  "sentences": [
    {
      "text": "영어 원문 문장.",
      "chunks": [
        { "en": "대표 추천 끊어읽기 덩어리(영어)", "kr": "그 덩어리의 직독직해(한글)" }
      ],
      "naturalTranslation": "문장 전체의 자연스러운 한국어 완역",
      "wordOrderPoint": { "title": "핵심 어순·패턴 이름", "explanation": "한 줄 설명" },
      "breakRules": {
        "allowed": [ { "boundary": 0, "reason": "여기서도 자연스럽게 끊을 수 있는 이유" } ],
        "discouraged": [ { "boundary": 0, "reason": "여기서 끊으면 핵심 구조가 갈려 이해를 방해하는 이유" } ]
      },
      "grammar": [ { "label": "문법 이름표", "note": "상세 설명" } ],
      "words": [ { "word": "어려운 단어", "meaning": "한글 뜻" } ]
    }
  ]
}

[규칙]
1. chunks는 대표(가장 권장하는) 끊어읽기다. en을 공백으로 이어 붙이면 원문 text와 정확히 같아야 한다(구두점·대소문자만 예외).
2. 끊어읽기(chunks)는 잘게 쪼개지 말고 '의미 덩어리'로 크게 묶어라. 다음 자리는 절대 끊지 마라:
   - be동사·조동사 뒤 (예: "is the habit"은 한 덩어리. 단 뒤가 that절·to부정사면 끊어도 됨)
   - 짧은 주어(2단어 이하) 뒤에서 동사 앞
   - 짧은 전치사구(2단어 이하) 앞 (of noticing, at all 등)
   - 전치사와 그 목적어 사이 ("searches for | facts"처럼 끊지 마라)
   끊어도 되는 자리: 접속사·관계사·that·to 앞 / 콤마 뒤 / 긴 주어(3단어 이상) 뒤 동사 앞 / 긴 전치사구 앞.
3. kr은 의역이 아니라 어순·구조가 드러나는 직독직해로 써라. naturalTranslation은 반대로 조각을 잇지 말고 한 문장으로 매끄럽게 읽히는 완역으로 써라(필수).
4. wordOrderPoint는 그 문장의 가장 중요한 어순·패턴 1개만(필수). title(패턴 이름)+explanation(한 줄 설명). grammar와 겹치지 않게 핵심만.
5. breakRules의 boundary는 0부터 세는 '단어 사이 틈 번호'다 - 0번 단어와 1번 단어 사이가 0, 1번과 2번 사이가 1. 예: 단어가 ["We","believe","that","others"]면 believe와 that 사이는 boundary 1.
   - allowed: 대표 chunks 경계는 아니지만 거기서 끊어도 자연스러운 다른 위치.
   - discouraged: 거기서 끊으면 핵심 구조(동사구·전치사구 등)가 갈려 이해를 방해하는 위치.
   - 모든 틈을 억지로 채우지 마라. 정말 의미 있는 위치만 넣고, 없으면 빈 배열([])로 둬라. 대표 chunks 경계는 discouraged에 넣지 마라.
6. grammar는 그 문장에 든 문법 요소를 1개 이상, 이름표(label)+상세 설명(note)으로.
7. words는 어려운 단어만 넣어라(없으면 []). word는 반드시 원문 text에 나온 형태 그대로 적어라 - 활용형(-s·-ed·-ing 등)을 원형으로 바꾸지 마라(원문이 "triggers"면 "trigger"가 아니라 "triggers", 원문이 "noticing"이면 "notice"가 아니라 "noticing"). meaning(뜻)에는 원형 뜻을 써도 된다. 낱말 하나가 쉬워도 뜻이 안 통하는 숙어·표현("takes a bus", "where to get off" 등)은 word에 띄어쓰기 포함해 원문 그대로 연속으로 적어라 - 원문에 그 낱말들이 이어져 나와야 하며, 앱이 그 표현 전체를 하나의 묶음으로 눌러 담게 한다. meaning엔 표현 전체 뜻을 쓴다.
8. insight는 구조가 특히 어려운 문장에만 넣어라(빼도 됨). 넣으면 formula·why·wrong·natural 4필드를 모두 채워라.
9. level은 난이도 숫자(1이 가장 쉬움). id는 다른 지문과 겹치지 않는 영문 이름. topic은 지문 주제 분류(영어).
10. 신규 필드(naturalTranslation·wordOrderPoint·breakRules)를 넣지 않은 예전 형식도 앱에서 열리기는 하지만, 새로 만들 때는 위 필드를 모두 채워라.

[규칙을 지킨 올바른 예시]
{
  "id": "example-mind",
  "level": 1,
  "topic": "Psychology",
  "title": "A Small Example",
  "titleKr": "작은 예시",
  "sentences": [
    {
      "text": "Confirmation bias is the habit of noticing only what we already believe.",
      "chunks": [
        { "en": "Confirmation bias is the habit", "kr": "확증 편향은 습관이다" },
        { "en": "of noticing only what we already believe.", "kr": "우리가 이미 믿는 것만 알아채는" }
      ],
      "naturalTranslation": "확증 편향은 우리가 이미 믿는 것만 알아채려는 습관이다.",
      "wordOrderPoint": { "title": "be동사 + 명사 보어", "explanation": "'A is B' 구조 - is 뒤의 the habit이 주어를 설명하는 보어라 붙여 읽는다." },
      "breakRules": {
        "allowed": [],
        "discouraged": [ { "boundary": 2, "reason": "is 뒤에서 끊으면 보어 the habit이 떨어져 나갑니다. is the habit을 한 덩어리로 붙여 읽으세요." } ]
      },
      "grammar": [
        { "label": "of + 동명사", "note": "the habit of noticing - '알아채는 습관'. of 뒤 동사는 -ing." }
      ],
      "words": [ { "word": "bias", "meaning": "편향, 치우침" } ]
    }
  ]
}`;

// ── 문자열 정규화 ──
// 문장(영어)용: 소문자 + 영문/숫자/공백만 남겨 완전동일 비교.
const normText = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
// 제목(한글 포함)용: 문자는 살리고 대소문자·기호·공백만 정리.
const normLoose = (s) => String(s == null ? "" : s).toLowerCase().replace(/[.,!?;:"'()\-]/g, "").replace(/\s+/g, " ").trim();

// 배열을 { 키: 개수 } 빈도표로.
function tally(arr) {
  const m = {};
  arr.forEach((k) => { m[k] = (m[k] || 0) + 1; });
  return m;
}

// 현재 공식 콘텐츠(기본 passages 배열)의 상태를 계산한다. passages는 코스가 아니라 지문 배열.
export function analyzeContent(passages) {
  const list = Array.isArray(passages) ? passages : [];
  let totalSentences = 0;
  const levels = [];
  const topics = [];
  const grammarLabels = [];
  const words = [];
  const openings = [];
  const rawTitles = [];       // 완전중복 판정용(title|titleKr 원문)
  const looseTitles = [];     // 정규화 제목 중복 판정용
  const rawSentences = [];    // 문장 완전동일 판정용

  list.forEach((p) => {
    levels.push(p.level);
    if (p.topic) topics.push(p.topic);
    if (p.title) rawTitles.push(p.title);
    if (p.titleKr) rawTitles.push(p.titleKr);
    looseTitles.push(normLoose(p.titleKr || p.title || ""));
    (p.sentences || []).forEach((s) => {
      totalSentences += 1;
      rawSentences.push(s.text);
      const first = String(s.text || "").trim().split(/\s+/)[0] || "";
      openings.push(first.toLowerCase().replace(/[^a-z]/g, ""));
      (s.grammar || []).forEach((g) => { if (g && g.label) grammarLabels.push(g.label); });
      (s.words || []).forEach((w) => { if (w && w.word) words.push(w.word); });
    });
  });

  const grammarDistribution = tally(grammarLabels);
  const dupOf = (arr) => {
    const c = tally(arr);
    return Object.keys(c).filter((k) => k && c[k] > 1);
  };

  return {
    totalPassages: list.length,
    totalSentences,
    levelDistribution: tally(levels),
    topicDistribution: tally(topics),
    grammarDistribution,
    wordFrequency: tally(words),
    openingPhraseFrequency: tally(openings),
    titleDuplicates: dupOf(rawTitles),
    normalizedTitleDuplicates: dupOf(looseTitles),
    exactSentenceDuplicates: dupOf(rawSentences),
    recentPassages: list.slice(-RECENT_COUNT).map((p) => ({ id: p.id, titleKr: p.titleKr, level: p.level, topic: p.topic })),
    overusedStructures: Object.keys(grammarDistribution).filter((k) => grammarDistribution[k] >= OVERUSE_THRESHOLD).sort((a, b) => grammarDistribution[b] - grammarDistribution[a]),
    // 목표 구조 리스트가 없으면 '부족 구조'는 신뢰 계산 불가 - 2단계(목표 구조 도입)에서 지원.
    underusedStructures: [],
  };
}

// 다음 배치 출제 힌트(모두 목표값, 강제 아님).
export function nextCurriculumHint(passages, index) {
  const list = Array.isArray(passages) ? passages : [];
  const idx = index || analyzeContent(list);
  const levelNums = Object.keys(idx.levelDistribution).map(Number);
  const maxLevel = levelNums.length ? Math.max(...levelNums) : 1;
  // 가장 적게 만든 level(균형 유지). 동률이면 낮은 level.
  let recommendedLevel = 1;
  let min = Infinity;
  for (let l = 1; l <= maxLevel; l += 1) {
    const c = idx.levelDistribution[l] || 0;
    if (c < min) { min = c; recommendedLevel = l; }
  }
  // 가장 적게 쓰인 topic 몇 개.
  const recommendedTopics = Object.entries(idx.topicDistribution)
    .sort((a, b) => a[1] - b[1]).slice(0, 3).map((t) => t[0]);
  return {
    nextPassageNumber: idx.totalPassages + 1,
    targetPassages: CURRICULUM.targetPassages,
    targetSentences: CURRICULUM.targetSentences,
    recommendedLevel,
    maxLevel,
    recommendedTopics,
    overusedStructures: idx.overusedStructures,
    existingIds: list.map((p) => p.id),
    recommendedBatchSize: 1,
  };
}

// 지정한 id의 지문을 앵커로 추출(없으면 그 항목은 안전하게 생략).
export function extractAnchors(passages, specs) {
  const byId = {};
  (Array.isArray(passages) ? passages : []).forEach((p) => { byId[p.id] = p; });
  return (specs || DEFAULT_ANCHORS)
    .map((a) => (byId[a.id] ? { level: a.level, role: a.role, passage: byId[a.id] } : null))
    .filter(Boolean);
}

// 어느 LLM에 줘도 동일한 출제 패키지 문자열을 만든다(규칙+양식+예시 + 현재상태 + 힌트 + 앵커 + 스키마버전 + 출력요구).
export function buildAuthoringPackage(passages, opts = {}) {
  const list = Array.isArray(passages) ? passages : [];
  const index = analyzeContent(list);
  const hint = nextCurriculumHint(list, index);
  const anchors = extractAnchors(list, opts.anchorSpecs);
  const batchSize = opts.batchSize || hint.recommendedBatchSize || 1;

  const dist = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" / ") || "(없음)";
  const anchorBlock = anchors.length
    ? anchors.map((a) => `- level ${a.level} (${a.role}) 앵커: ${a.passage.id}\n${JSON.stringify(a.passage, null, 2)}`).join("\n\n")
    : "(앵커 없음)";

  return [
    `[역할]`,
    `영어 독해 학습 앱의 문제 출제자.`,
    ``,
    `[중요 원칙]`,
    `어떤 LLM(ChatGPT/Gemini/Claude 등)으로 만들든 아래 규칙·스키마·출력 형식을 동일하게 따른다. 학습자가 제작 모델이 바뀐 걸 느끼면 안 된다.`,
    `rulesVersion=${RULES_VERSION} / schemaVersion=${SCHEMA_VERSION}`,
    ``,
    `[현재 공식 콘텐츠 상태]`,
    `- 공식 지문 ${index.totalPassages}편 / 문장 ${index.totalSentences}개 (최종 목표 ${CURRICULUM.targetPassages}편 · ${CURRICULUM.targetSentences}문장)`,
    `- level 분포: ${dist(index.levelDistribution)}`,
    `- topic 분포: ${dist(index.topicDistribution)}`,
    `- 자주 쓰인 문법(과다 주의): ${index.overusedStructures.join(" / ") || "(없음)"}`,
    `- 최근 지문: ${index.recentPassages.map((p) => `${p.titleKr}(Lv${p.level})`).join(", ") || "(없음)"}`,
    `- 제목/문장 중복 현황: 제목중복 ${index.titleDuplicates.length}건 · 문장 완전동일 ${index.exactSentenceDuplicates.length}건`,
    ``,
    `[다음 출제 힌트] (모두 목표값 - 영어 자연스러움과 지문 흐름이 우선, 억지로 맞추지 말 것)`,
    `- 이번에 만들 지문 수: ${batchSize}편 (지문당 정확히 ${CURRICULUM.sentencesPerPassage}문장)`,
    `- 권장 level: ${hint.recommendedLevel} (현재 최고 level ${hint.maxLevel}, 새 난이도가 필요하면 ${hint.maxLevel + 1}도 가능)`,
    `- 권장 topic(부족한 쪽): ${hint.recommendedTopics.join(", ") || "(자유)"}`,
    `- 피해야 할 과다 구조: ${hint.overusedStructures.join(" / ") || "(없음)"}`,
    `- id는 아래 기존 id와 겹치지 않는 새 영문 slug로: ${hint.existingIds.join(", ")}`,
    ``,
    `[레벨 앵커] (이 레벨이 실제로 어느 정도인지 보여주는 기존 검수 지문 - 난이도·청킹의 기준으로 삼아라)`,
    anchorBlock,
    ``,
    `[작성 규칙]`,
    AUTHORING_RULES,
    ``,
    `[출력 요구]`,
    `- 위 규칙과 양식을 지켜 지문 ${batchSize}편을 JSON으로만 출력한다(${batchSize > 1 ? "JSON 배열" : "JSON 객체 1개"}).`,
    `- 설명·코드블록 없이 JSON만. 지문당 정확히 ${CURRICULUM.sentencesPerPassage}문장.`,
    `- id는 기존과 중복 금지. topic도 채운다.`,
  ].join("\n");
}

// 생성된 지문을 기존 공식 콘텐츠와 대조한다(validatePassage와 별개 - 형식이 아니라 '기존과의 관계').
// 반환: { notes: [{ kind: 'dup'|'curriculum'|'info', msg }] }. dup=중복(고쳐야 함), curriculum=힌트 불일치(참고), info=참고.
export function compareAgainstExisting(newPassage, passages) {
  const list = Array.isArray(passages) ? passages : [];
  const notes = [];
  if (!newPassage || typeof newPassage !== "object") return { notes };

  if (newPassage.id && list.some((p) => p.id === newPassage.id)) {
    notes.push({ kind: "dup", msg: `id "${newPassage.id}"가 기존 지문과 중복됩니다. id를 바꾸세요.` });
  }
  if (newPassage.title && list.some((p) => p.title === newPassage.title)) {
    notes.push({ kind: "dup", msg: `영어 제목 "${newPassage.title}"이 기존 지문과 완전히 같습니다.` });
  }
  if (newPassage.titleKr && list.some((p) => p.titleKr === newPassage.titleKr)) {
    notes.push({ kind: "dup", msg: `한글 제목 "${newPassage.titleKr}"이 기존 지문과 완전히 같습니다.` });
  } else if (newPassage.titleKr) {
    const nt = normLoose(newPassage.titleKr);
    if (list.some((p) => normLoose(p.titleKr || "") === nt)) {
      notes.push({ kind: "curriculum", msg: `한글 제목이 기존 지문과 거의 같습니다(띄어쓰기·기호 차이만). 다른 제목을 권합니다.` });
    }
  }
  const existing = new Set();
  list.forEach((p) => (p.sentences || []).forEach((s) => existing.add(normText(s.text))));
  (newPassage.sentences || []).forEach((s, i) => {
    if (s && s.text && existing.has(normText(s.text))) {
      notes.push({ kind: "dup", msg: `${i + 1}번째 문장이 기존 지문의 문장과 완전히 같습니다.` });
    }
  });

  const hint = nextCurriculumHint(list);
  if (typeof newPassage.level === "number" && newPassage.level !== hint.recommendedLevel) {
    notes.push({ kind: "curriculum", msg: `level ${newPassage.level}입니다. 이번 권장 level은 ${hint.recommendedLevel}이지만 강제는 아닙니다(참고).` });
  }
  if (!newPassage.topic) {
    notes.push({ kind: "info", msg: `topic이 비어 있습니다. 주제 분류를 채우면 분포 관리에 도움이 됩니다.` });
  }
  return { notes };
}
