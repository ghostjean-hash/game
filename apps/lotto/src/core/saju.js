// 사주 일주(日柱) + 오행. SSOT: docs/02_data.md 1.12.
// core/는 DOM 금지. 순수 함수.
//
// 일주 = 그날의 60갑자 (천간 1 + 지지 1).
// 천간 10: 갑(甲)·을(乙)·병(丙)·정(丁)·무(戊)·기(己)·경(庚)·신(辛)·임(壬)·계(癸)
// 지지 12: 12간지와 동일 (rat/ox/...).
// 오행 5: 목(wood)·화(fire)·토(earth)·금(metal)·수(water)
// 상생: 목→화→토→금→수→목
// 상극: 목→토, 토→수, 수→화, 화→금, 금→목
//
// 기준일: 1984-02-02 = 갑자일.

const HEAVENLY_STEMS = ['gap', 'eul', 'byeong', 'jeong', 'mu', 'gi', 'gyeong', 'sin', 'im', 'gye'];
const STEM_LABELS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const ANIMAL_SIGN_IDS = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];
const BRANCH_LABELS = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

const STEM_TO_ELEMENT = {
  gap: 'wood', eul: 'wood',
  byeong: 'fire', jeong: 'fire',
  mu: 'earth', gi: 'earth',
  gyeong: 'metal', sin: 'metal',
  im: 'water', gye: 'water',
};

const BRANCH_TO_ELEMENT = {
  rat: 'water', ox: 'earth', tiger: 'wood', rabbit: 'wood',
  dragon: 'earth', snake: 'fire', horse: 'fire', goat: 'earth',
  monkey: 'metal', rooster: 'metal', dog: 'earth', pig: 'water',
};

const ELEMENT_LABELS = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };

// 상생 (a → b: a가 b를 생한다)
const GENERATION = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
// 상극 (a → b: a가 b를 극한다)
const OVERCOMING = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

const BASE_DATE_MS = Date.UTC(1984, 1, 2); // 갑자일
const DAY_MS = 86400000;

/**
 * 날짜 → 일주 (천간 + 지지).
 * @param {string} dateStr YYYY-MM-DD
 * @returns {{ stem: string, branch: string } | null}
 */
export function dateToDayPillar(dateStr) {
  if (typeof dateStr !== 'string') return null;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((t - BASE_DATE_MS) / DAY_MS);
  const stemIdx = ((days % 10) + 10) % 10;
  const branchIdx = ((days % 12) + 12) % 12;
  return {
    stem: HEAVENLY_STEMS[stemIdx],
    branch: ANIMAL_SIGN_IDS[branchIdx],
  };
}

/** 일주 → 한국어 라벨 (예: '갑자', '을축'). */
export function dayPillarLabel(pillar) {
  if (!pillar) return '';
  const stemIdx = HEAVENLY_STEMS.indexOf(pillar.stem);
  const branchIdx = ANIMAL_SIGN_IDS.indexOf(pillar.branch);
  if (stemIdx < 0 || branchIdx < 0) return '';
  return STEM_LABELS[stemIdx] + BRANCH_LABELS[branchIdx];
}

/** 일주 → 천간 오행. */
export function pillarElement(pillar) {
  if (!pillar) return null;
  return STEM_TO_ELEMENT[pillar.stem] || null;
}

/** 일주 → 지지 오행. */
export function pillarBranchElement(pillar) {
  if (!pillar) return null;
  return BRANCH_TO_ELEMENT[pillar.branch] || null;
}

/**
 * 두 일주의 천간 오행 관계.
 * @returns {'self' | 'generate' | 'beGenerated' | 'overcome' | 'beOvercome' | 'normal'}
 *   self: 같은 오행 (비견)
 *   generate: 캐릭터가 회차를 생함 (식상)
 *   beGenerated: 회차가 캐릭터를 생함 (인성)
 *   overcome: 캐릭터가 회차를 극함 (재성)
 *   beOvercome: 회차가 캐릭터를 극함 (관성)
 *   normal: 무관계 (없음)
 */
export function elementRelation(charPillar, drawPillar) {
  const c = pillarElement(charPillar);
  const d = pillarElement(drawPillar);
  if (!c || !d) return 'normal';
  if (c === d) return 'self';
  if (GENERATION[c] === d) return 'generate';
  if (GENERATION[d] === c) return 'beGenerated';
  if (OVERCOMING[c] === d) return 'overcome';
  if (OVERCOMING[d] === c) return 'beOvercome';
  return 'normal';
}

export function elementLabel(element) {
  return ELEMENT_LABELS[element] || '';
}

export const SAJU_INTERNAL = Object.freeze({
  HEAVENLY_STEMS,
  STEM_LABELS,
  ANIMAL_SIGN_IDS,
  BRANCH_LABELS,
  STEM_TO_ELEMENT,
  BRANCH_TO_ELEMENT,
  GENERATION,
  OVERCOMING,
});
