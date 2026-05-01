// 휠링 (Full Wheel + Abbreviated Wheel) 생성. SSOT: docs/01_spec.md 5.5.
// core/는 DOM 금지. 순수 함수.
//
// 휠링은 부분 당첨 보장 도구이며 1등 확률을 높이지 않습니다.
// 각 티켓의 1등 확률은 1/8,145,060로 동일하고, N장 사면 N배 비례 증가합니다.

import { NUMBER_MIN, NUMBER_MAX, PICK_COUNT } from '../data/numbers.js';
import { mulberry32 } from './random.js';

/** 풀의 모든 6 조합 (Full Wheel). */
export function fullWheel(pool) {
  const validated = validatePool(pool);
  const sortedPool = [...validated].sort((a, b) => a - b);
  const tickets = combinations(sortedPool, PICK_COUNT);
  return {
    type: 'full',
    pool: sortedPool,
    ticketCount: tickets.length,
    tickets,
    isCovering4if4: true, // Full은 자동 보장
    guarantee: {
      hit6: { rank: 1, count: 1, message: '풀에서 6개 모두 일치 시 1등 1장 보장' },
      hit5: { rank: 3, count: null, message: '풀에서 5개 일치 시 3등 다수' },
      hit4: { rank: 4, count: null, message: '풀에서 4개 일치 시 4등 다수' },
      hit3: { rank: 5, count: null, message: '풀에서 3개 일치 시 5등 다수' },
    },
  };
}

/**
 * 축약 휠. 시드 기반 결정론적 N장 선택. 4-if-4 보장은 자동 검증 (사후).
 * @param {number[]} pool
 * @param {number} ticketCount 요청 티켓 수
 * @param {number} [seed=0] 결정론 시드 (32bit unsigned)
 */
export function abbreviatedWheel(pool, ticketCount, seed = 0) {
  const validated = validatePool(pool);
  const sortedPool = [...validated].sort((a, b) => a - b);
  const allCombos = combinations(sortedPool, PICK_COUNT);
  const requested = Math.max(1, Math.min(ticketCount, allCombos.length));
  if (requested >= allCombos.length) {
    return {
      type: 'abbreviated',
      pool: sortedPool,
      ticketCount: allCombos.length,
      tickets: allCombos,
      requestedCount: requested,
      isCovering4if4: true,
    };
  }
  const rng = mulberry32(seed >>> 0);
  const shuffled = [...allCombos];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const tickets = shuffled.slice(0, requested);
  return {
    type: 'abbreviated',
    pool: sortedPool,
    ticketCount: tickets.length,
    tickets,
    requestedCount: requested,
    isCovering4if4: isCovering4if4(tickets, sortedPool),
  };
}

/**
 * 4-if-4 보장 검증.
 * 풀 내 모든 4개 조합에 대해, 어떤 티켓이든 그 4개를 모두 포함하면 통과.
 * @param {number[][]} tickets
 * @param {number[]} pool
 * @returns {boolean}
 */
export function isCovering4if4(tickets, pool) {
  const fourCombos = combinations(pool, 4);
  for (const combo of fourCombos) {
    const found = tickets.some((t) => combo.every((n) => t.includes(n)));
    if (!found) return false;
  }
  return true;
}

/** 조합 수 C(n, k). */
export function combinationCount(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let num = 1;
  let den = 1;
  for (let i = 1; i <= k; i += 1) {
    num *= (n - i + 1);
    den *= i;
  }
  return num / den;
}

function validatePool(pool) {
  if (!Array.isArray(pool)) throw new Error('pool must be array');
  const set = new Set();
  for (const n of pool) {
    if (!Number.isInteger(n) || n < NUMBER_MIN || n > NUMBER_MAX) {
      throw new Error(`invalid number: ${n}`);
    }
    if (set.has(n)) throw new Error(`duplicate: ${n}`);
    set.add(n);
  }
  if (set.size < PICK_COUNT) throw new Error(`pool too small: need >= ${PICK_COUNT}`);
  return [...set];
}

function combinations(arr, k) {
  const result = [];
  const sorted = [...arr].sort((a, b) => a - b);
  function rec(start, picked) {
    if (picked.length === k) {
      result.push([...picked]);
      return;
    }
    for (let i = start; i < sorted.length; i += 1) {
      picked.push(sorted[i]);
      rec(i + 1, picked);
      picked.pop();
    }
  }
  rec(0, []);
  return result;
}
