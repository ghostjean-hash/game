// 운세 산출. SSOT: docs/01_spec.md 5.1, docs/02_data.md 1.6 / 1.10 / 1.12.
// core/는 DOM 금지. 순수 함수.
//
// 1단계 (띠 관계): 캐릭터 띠(생년) + 회차 일진 띠 → 4가지 관계 → 분포
//   same   (동일 띠)        - 길조 우세 (대길 30 / 길 40 / 평 25 / 흉 5)
//   sahap  (삼합, ±4 / ±8)  - 길조 약간 (대길 20 / 길 40 / 평 30 / 흉 10)
//   chung  (충, ±6)         - 흉조 우세 (대길 5  / 길 25 / 평 30 / 흉 40)
//   normal (그 외)          - 평이     (대길 10 / 길 35 / 평 40 / 흉 15)
//
// 2단계 (사주 보정, M5 사주 정밀화): 캐릭터 일주 + 회차 일주 천간 오행 관계로 ±보정.

import { mixSeeds, mulberry32 } from './random.js';
import { drwNoToAnimalSign, drawToAnimalSign, zodiacRelation } from './zodiac.js';
import { dateToDayPillar, elementRelation } from './saju.js';
import {
  FORTUNE_GREAT, FORTUNE_GOOD, FORTUNE_NEUTRAL, FORTUNE_BAD,
} from '../data/numbers.js';

const ORDER = [FORTUNE_GREAT, FORTUNE_GOOD, FORTUNE_NEUTRAL, FORTUNE_BAD];

const RELATION_WEIGHTS = Object.freeze({
  same:   [0.30, 0.40, 0.25, 0.05],
  sahap:  [0.20, 0.40, 0.30, 0.10],
  chung:  [0.05, 0.25, 0.30, 0.40],
  normal: [0.10, 0.35, 0.40, 0.15],
});

// 오행 관계별 보정. [대길, 길, 평, 흉]에 가산.
const ELEMENT_BIAS = Object.freeze({
  self:        [+0.05, +0.05, -0.05, -0.05],  // 같은 오행 (비견) → 길조
  beGenerated: [+0.05, +0.05, -0.05, -0.05],  // 회차가 나를 생함 (인성) → 길조
  generate:    [-0.02, +0.05, +0.02, -0.05],  // 내가 회차를 생함 (식상) → 약간 길
  overcome:    [-0.03, -0.03, +0.03, +0.03],  // 내가 회차를 극함 (재성) → 약간 부정
  beOvercome:  [-0.05, -0.05, +0.03, +0.07],  // 회차가 나를 극함 (관성) → 흉
  normal:      [0, 0, 0, 0],
});

function clampNonNegative(v) { return v < 0.01 ? 0.01 : v; }

/**
 * 캐릭터 시드 + 회차 + 캐릭터 띠 + 캐릭터 일주 → 운세 등급. 결정론.
 *
 * @param {number} seed
 * @param {number} drwNo
 * @param {string} [animalSign] 캐릭터 12간지
 * @param {{ drwNo: number, drwDate?: string }} [draw] 회차 데이터
 * @param {{ stem: string, branch: string }} [charPillar] 캐릭터 일주 (사주 보정용)
 * @returns {string} 'great' | 'good' | 'neutral' | 'bad'
 */
export function fortuneFor(seed, drwNo, animalSign, draw, charPillar) {
  const drawSign = draw ? drawToAnimalSign(draw) : drwNoToAnimalSign(drwNo);
  const rel = animalSign ? zodiacRelation(animalSign, drawSign) : 'normal';
  const baseWeights = RELATION_WEIGHTS[rel];

  // 사주 오행 보정 (양쪽 일주가 모두 있을 때만)
  let weights = baseWeights;
  if (charPillar && draw && draw.drwDate) {
    const drawPillar = dateToDayPillar(draw.drwDate);
    if (drawPillar) {
      const elemRel = elementRelation(charPillar, drawPillar);
      const bias = ELEMENT_BIAS[elemRel];
      const adjusted = baseWeights.map((w, i) => clampNonNegative(w + bias[i]));
      const sum = adjusted.reduce((s, w) => s + w, 0);
      weights = adjusted.map((w) => w / sum);
    }
  }

  const mixed = mixSeeds(seed, drwNo);
  const rng = mulberry32(mixed);
  const r = rng();
  let acc = 0;
  for (let i = 0; i < ORDER.length; i += 1) {
    acc += weights[i];
    if (r < acc) return ORDER[i];
  }
  return ORDER[ORDER.length - 1];
}

/**
 * 캐릭터 띠와 회차 일진의 관계.
 */
export function fortuneRelation(animalSign, drwNoOrDraw) {
  if (!animalSign) return 'normal';
  const drawSign = typeof drwNoOrDraw === 'number'
    ? drwNoToAnimalSign(drwNoOrDraw)
    : drawToAnimalSign(drwNoOrDraw);
  return zodiacRelation(animalSign, drawSign);
}

/**
 * 캐릭터 일주와 회차 일주의 오행 관계.
 * @returns {string} 'self' | 'generate' | 'beGenerated' | 'overcome' | 'beOvercome' | 'normal'
 */
export function fortuneElementRelation(charPillar, draw) {
  if (!charPillar || !draw || !draw.drwDate) return 'normal';
  const drawPillar = dateToDayPillar(draw.drwDate);
  if (!drawPillar) return 'normal';
  return elementRelation(charPillar, drawPillar);
}
