// 세이브 동기화의 순수 로직. SSOT: docs/plans/design-2026-07-29-cloud-save-google-drive.md 4.2~4.3.
//
// 이 파일에는 window / document / fetch / localStorage 가 등장하지 않는다.
// 데이터가 깨지는 사고는 거의 전부 이 층에서 나므로, 위험을 자동 검증 100% 영역에 몰아넣는다.
// 검증: node tests/cloud-merge.test.mjs (설계 5.2)

// 2: 슬롯마다 기록 줄기(lineage)와 생성 시각(createdAt)을 갖는다.
//    줄기가 다르면 서로 무관한 기록이므로 자동 판정하지 않고 사용자에게 묻는다.
//    줄기 정보가 없는 옛 문서(1)는 같은 줄기로 관대하게 취급한다(기존 사용자 보호).
export const SCHEMA = 2;

// 문서 총량 상한. 넘으면 업로드를 거부하고 알린다(조용한 실패 금지, 설계 4.2.3).
export const MAX_BYTES = 1_000_000;

// 기본 시계 오차 허용치. 이보다 크게 미래인 저장 시각은 믿지 않는다(설계 4.3.4).
export const DEFAULT_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

// 동기화 제외 목록은 게임마다 다르다. 단일 출처는 policy.js(설계 9.4).
import { isExcludedKey, MERGE_RULES, NESTED_MERGE_RULES, shouldKeepUnmatched } from "./policy.js";
export { EXCLUDED_KEYS, isExcludedKey } from "./policy.js";

// --- 내부 유틸 -------------------------------------------------------------

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

// 저장 데이터는 이미 JSON 왕복을 거치는 값이라 JSON 복제로 충분하다.
// 입력 객체를 절대 변형하지 않기 위해 경계에서 항상 복제한다(설계 5.2.13).
function clone(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === "object") {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}


// 제외 키를 걷어낸 사본을 만든다.
function stripExcluded(slotId, data) {
  if (!isPlainObject(data)) return clone(data);
  const out = {};
  for (const k of Object.keys(data)) {
    if (isExcludedKey(slotId, k)) continue;
    out[k] = clone(data[k]);
  }
  return out;
}

// 같은 줄기의 두 기록 중 하나를 채택할 때, 생성 시각은 더 이른 쪽을 남긴다.
// 줄기 정보가 한쪽에만 있으면(옛 문서와 새 문서가 만나는 경우) 있는 쪽을 물려받는다.
function adopt(winner, other) {
  const out = clone(winner);
  const a = isFiniteNumber(winner.createdAt) ? winner.createdAt : null;
  const b = other && isFiniteNumber(other.createdAt) ? other.createdAt : null;
  const earliest = a !== null && b !== null ? Math.min(a, b) : a !== null ? a : b;
  if (earliest !== null) out.createdAt = earliest;
  if (!out.lineage && other && other.lineage) out.lineage = other.lineage;
  return out;
}

// 모아나가는 항목을 합친다. 승자 쪽을 앞에 두고, 진 쪽에만 있는 것을 뒤에 붙인다.
function combineValues(rule, winnerValue, loserValue) {
  if (rule.type === "list" || rule.type === "set") {
    const out = [];
    const seen = new Set();
    for (const arr of [winnerValue, loserValue]) {
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        let id;
        if (rule.type === "list" && isPlainObject(item) && item[rule.idKey] !== undefined) {
          id = `k:${String(item[rule.idKey])}`;
        } else {
          id = `v:${JSON.stringify(item)}`;
        }
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(clone(item));
      }
    }
    return out;
  }

  if (rule.type === "map-max") {
    const out = {};
    for (const obj of [winnerValue, loserValue]) {
      if (!isPlainObject(obj)) continue;
      for (const k of Object.keys(obj)) {
        const v = Number(obj[k]);
        const cur = Number(out[k]);
        if (Number.isFinite(v)) out[k] = Number.isFinite(cur) ? Math.max(cur, v) : v;
        else if (!(k in out)) out[k] = clone(obj[k]);
      }
    }
    return out;
  }

  return undefined;
}

// 값 하나가 담고 있는 항목 수. 크기 비교로 "많이 잃는 병합"을 감지하는 데 쓴다.
// 한 겹 안쪽까지 세어야 한다 - 학습 상태처럼 겉은 항목 하나여도 그 안에 수십 개가 들어 있다.
function bulkOf(v, depth = 0) {
  if (Array.isArray(v)) return v.length;
  if (isPlainObject(v)) {
    const keys = Object.keys(v);
    if (depth >= 2) return keys.length;
    return keys.reduce((n, k) => n + Math.max(1, bulkOf(v[k], depth + 1)), 0);
  }
  return v === undefined || v === null ? 0 : 1;
}

// 진 쪽이 이긴 쪽보다 눈에 띄게 많은 내용을 담고 있으면 자동으로 덮지 않는다.
// 사용자 기대: "핸드폰 데이터가 훨씬 큰데 당연히 물어볼 줄 알았다"(2026-07-29).
// 같은 항목의 값이 절반 이하로 줄어드는 경우를 손실 후보로 본다.
const LOSS_RATIO = 0.5;

function hasBigLoss(winnerData, loserData) {
  if (!isPlainObject(winnerData) || !isPlainObject(loserData)) return false;
  for (const key of Object.keys(loserData)) {
    if (!(key in winnerData)) continue; // 한쪽에만 있는 항목은 위에서 살린다
    const lose = bulkOf(loserData[key]);
    if (lose < 2) continue; // 값 하나짜리는 크기 비교 대상이 아니다
    const keep = bulkOf(winnerData[key]);
    if (keep <= lose * LOSS_RATIO) return true;
  }
  return false;
}

// 겹치는 항목의 값이 전부 같고, 한쪽에만 더 있는 항목이 있을 뿐인가.
// 이 경우 사람이 고를 것이 없다. 합치면 어느 쪽도 잃지 않는다.
function onlyExtraKeys(a, b) {
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  for (const key of Object.keys(a)) {
    if (!(key in b)) continue;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

function maxTs(a, b) {
  const x = isFiniteNumber(a) ? a : null;
  const y = isFiniteNumber(b) ? b : null;
  if (x === null) return y;
  if (y === null) return x;
  return Math.max(x, y);
}

// status가 "얼마나 진행됐는지"의 순서. 시각을 모를 때만 순서 판정으로 물러난다.
const STATUS_RANK = { active: 0, learned: 1, buried: 2 };

// 시각 값을 비교 가능한 숫자로. 이 앱들의 학습 진행은 ISO 문자열(now().toISOString())로
// 찍히므로 문자열도 Date.parse로 받아들인다 - 못 읽으면 시각을 모르는 것으로 취급.
function statusTs(v) {
  if (isFiniteNumber(v)) return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

// 단어 하나의 학습 진행을 합친다.
// status는 "더 많이 진행된 쪽"이 아니라 "더 최근에 상태가 바뀐 쪽"을 남긴다(statusChangedAt 기준).
// 아카이브(buried)처럼 되돌아가지 않는 상태도 있고, 복습에서 학습→활성으로 되돌리는
// 경우도 있어서 진행 순서만으로는 방금 한 처리가 오래된 기록에 덮이는 사고가 난다
// (2026-08-12 신고: 방금 아카이브한 단어가 재실행하면 아카이브가 풀려 있음).
// 양쪽 다 시각을 모르는 옛 기록만 예전처럼 진행 순서로 판정한다(하위 호환).
function mergeProgressEntry(a, b) {
  if (!isPlainObject(a)) return clone(b);
  if (!isPlainObject(b)) return clone(a);
  const out = clone(a);
  for (const k of Object.keys(b)) if (!(k in out)) out[k] = clone(b[k]);

  const aStatus = a.status in STATUS_RANK ? a.status : "active";
  const bStatus = b.status in STATUS_RANK ? b.status : "active";
  const aAt = statusTs(a.statusChangedAt);
  const bAt = statusTs(b.statusChangedAt);

  let winner;
  if (aStatus === bStatus) winner = "a";
  else if (aAt !== null && bAt !== null) winner = aAt >= bAt ? "a" : "b";
  else if (aAt !== null || bAt !== null) winner = aAt !== null ? "a" : "b";
  else winner = STATUS_RANK[aStatus] >= STATUS_RANK[bStatus] ? "a" : "b";

  const src = winner === "a" ? a : b;
  out.status = winner === "a" ? aStatus : bStatus;
  out.statusChangedAt = winner === "a" ? (a.statusChangedAt ?? null) : (b.statusChangedAt ?? null);
  out.buriedTier = out.status === "buried" ? (src.buriedTier ?? null) : null;
  out.buriedAt = out.status === "buried" ? (src.buriedAt ?? null) : null;

  out.seenCount = Math.max(Number(a.seenCount) || 0, Number(b.seenCount) || 0);
  out.unknownCount = Math.max(Number(a.unknownCount) || 0, Number(b.unknownCount) || 0);
  const learnedAt = maxTs(a.learnedAt, b.learnedAt);
  const lastReviewedAt = maxTs(a.lastReviewedAt, b.lastReviewedAt);
  if (learnedAt !== null) out.learnedAt = learnedAt;
  if (lastReviewedAt !== null) out.lastReviewedAt = lastReviewedAt;
  return out;
}

// 한 덩어리 안의 특정 필드만 합친다(단어장 학습 상태의 단어별 진행).
function combineNested(slotId, winnerData, loserData) {
  const specs = NESTED_MERGE_RULES[slotId];
  if (!specs) return false;
  let changed = false;
  for (const spec of specs) {
    for (const key of Object.keys(winnerData)) {
      if (!spec.keyPattern.test(key)) continue;
      const w = winnerData[key];
      const l = loserData[key];
      if (!isPlainObject(w) || !isPlainObject(l)) continue;
      const wf = w[spec.field];
      const lf = l[spec.field];
      if (!isPlainObject(wf) || !isPlainObject(lf)) continue;

      const out = {};
      for (const id of new Set([...Object.keys(wf), ...Object.keys(lf)])) {
        out[id] = spec.type === "progress-max" ? mergeProgressEntry(wf[id], lf[id]) : clone(wf[id] ?? lf[id]);
      }
      if (!deepEqual(out, wf)) {
        w[spec.field] = out;
        changed = true;
      }
    }
  }
  return changed;
}

// 승자 슬롯 위에 합친 결과를 얹는다. changed면 양쪽 모두에 반영해야 한다.
function combineSlot(slotId, winner, loser) {
  const rules = MERGE_RULES[slotId];
  if (!isPlainObject(winner.data) || !loser || !isPlainObject(loser.data)) {
    return { slot: winner, changed: false };
  }
  const out = clone(winner);
  let changed = false;

  // 진 쪽에만 있는 항목은 무조건 살린다(2026-07-29 데이터 유실 사고 이후 원칙).
  // 이긴 쪽에 없다는 이유로 버리면 그 기기·계정에만 있던 기록이 사라진다.
  // 동기화는 더하는 방향만 자동으로 한다. 지우는 방향은 사람이 정한다.
  for (const key of Object.keys(loser.data)) {
    if (key in winner.data) continue;
    out.data[key] = clone(loser.data[key]);
    changed = true;
  }

  // 한 덩어리 안쪽 필드 합치기(단어장 단어별 진행)
  if (combineNested(slotId, out.data, loser.data)) changed = true;

  if (!rules) return { slot: out, changed };

  for (const key of Object.keys(rules)) {
    const wv = winner.data[key];
    const lv = loser.data[key];
    if (wv === undefined && lv === undefined) continue;
    const combined = combineValues(rules[key], wv, lv);
    if (combined === undefined) continue;
    if (!deepEqual(combined, wv)) {
      out.data[key] = combined;
      changed = true;
    }
  }
  return { slot: out, changed };
}

function emptyDocument(now = 0, device = "") {
  return { schema: SCHEMA, updatedAt: now, device, slots: {} };
}

// --- 공개 함수 -------------------------------------------------------------

/**
 * 업로드용 문서를 만든다.
 * @param {Object} slots  { [slotId]: { updatedAt, data } }
 * @param {Object} opts   { now, device }
 */
export function buildDocument(slots, { now = 0, device = "" } = {}) {
  const out = emptyDocument(now, device);
  if (!isPlainObject(slots)) return out;

  let latest = 0;
  for (const slotId of Object.keys(slots)) {
    const slot = slots[slotId];
    if (!isPlainObject(slot)) continue;
    const updatedAt = isFiniteNumber(slot.updatedAt) ? slot.updatedAt : 0;
    const entry = { updatedAt, data: stripExcluded(slotId, slot.data) };
    if (isFiniteNumber(slot.createdAt)) entry.createdAt = slot.createdAt;
    if (typeof slot.lineage === "string" && slot.lineage) entry.lineage = slot.lineage;
    // 어느 기기가 올렸는지 남긴다. 내가 올린 기록을 나에게 되묻지 않기 위해서다.
    if (device) entry.device = device;
    out.slots[slotId] = entry;
    if (updatedAt > latest) latest = updatedAt;
  }
  // 문서 전체 갱신 시각은 슬롯 중 가장 최신값. 슬롯이 없으면 now.
  out.updatedAt = latest || now;
  return out;
}

/**
 * 문서 형식 검사. 해석해도 되는 문서인지만 판정한다.
 * @returns {{ ok: boolean, reason: string|null }}
 */
export function validateDocument(doc) {
  if (!isPlainObject(doc)) return { ok: false, reason: "not-an-object" };
  if (!Number.isInteger(doc.schema)) return { ok: false, reason: "schema-missing" };
  // 미래 형식은 해석을 시도하지 않는다. 새 버전이 쓴 문서를 옛 코드가 망가뜨리는 사고 방지.
  if (doc.schema > SCHEMA) return { ok: false, reason: "schema-future" };
  if (!isPlainObject(doc.slots)) return { ok: false, reason: "slots-missing" };

  for (const slotId of Object.keys(doc.slots)) {
    const slot = doc.slots[slotId];
    if (!isPlainObject(slot)) return { ok: false, reason: `slot-not-an-object:${slotId}` };
    if (!isFiniteNumber(slot.updatedAt)) return { ok: false, reason: `slot-updatedAt-invalid:${slotId}` };
  }
  return { ok: true, reason: null };
}

/** 문서를 올렸을 때의 바이트 수. */
export function estimateSize(doc) {
  let text;
  try {
    text = JSON.stringify(doc);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
  if (typeof text !== "string") return Number.POSITIVE_INFINITY;
  if (typeof TextEncoder === "function") return new TextEncoder().encode(text).length;
  // TextEncoder가 없는 환경 대비 보수적 근사(멀티바이트를 과소평가하지 않도록 3배).
  return text.length * 3;
}

/**
 * 올려도 되는 문서인지 판정. 거부 사유를 반드시 돌려준다(조용한 실패 금지).
 * @returns {{ ok: boolean, reason: string|null, bytes: number }}
 */
export function checkUploadable(doc) {
  const valid = validateDocument(doc);
  if (!valid.ok) return { ok: false, reason: valid.reason, bytes: 0 };
  const bytes = estimateSize(doc);
  if (bytes > MAX_BYTES) return { ok: false, reason: "too-large", bytes };
  return { ok: true, reason: null, bytes };
}

/**
 * 기기 기록과 클라우드 기록을 슬롯 단위로 병합한다.
 *
 * 반환:
 *   merged       병합 결과 문서
 *   apply.toLocal   기기에 써야 할 슬롯 [{ slot, updatedAt, data }]
 *   apply.toRemote  클라우드에 올려야 할 슬롯 id 목록 (비면 업로드 불필요)
 *   conflicts    자동 판정 불가 [{ slot, reason, local, remote }]
 *   remoteStatus 'ok' | 'empty' | 'invalid'
 *   blockUpload  true면 어떤 경우에도 올리지 않는다
 *
 * 입력 객체는 변형하지 않는다.
 */
export function mergeDocuments(localDoc, remoteDoc, { now = 0, skewToleranceMs = DEFAULT_SKEW_TOLERANCE_MS, device = "" } = {}) {
  const local = isPlainObject(localDoc) ? localDoc : emptyDocument(now);
  const localSlots = isPlainObject(local.slots) ? local.slots : {};

  const merged = {
    schema: SCHEMA,
    updatedAt: isFiniteNumber(local.updatedAt) ? local.updatedAt : now,
    device: typeof local.device === "string" ? local.device : "",
    slots: {},
  };
  const toLocal = [];
  const toRemote = [];
  const conflicts = [];

  // 클라우드 문서 상태 판정. 해석 불가면 기기 기록을 그대로 두고 업로드도 멈춘다(설계 5.2.10).
  let remoteStatus = "empty";
  let remoteSlots = {};
  if (remoteDoc !== null && remoteDoc !== undefined) {
    const valid = validateDocument(remoteDoc);
    if (valid.ok) {
      remoteStatus = "ok";
      remoteSlots = remoteDoc.slots;
    } else {
      remoteStatus = "invalid";
    }
  }

  if (remoteStatus === "invalid") {
    for (const slotId of Object.keys(localSlots)) {
      const slot = localSlots[slotId];
      if (!isPlainObject(slot)) continue;
      merged.slots[slotId] = clone(slot);
    }
    return { merged, apply: { toLocal: [], toRemote: [] }, conflicts: [], remoteStatus, blockUpload: true };
  }

  const skewLimit = now + skewToleranceMs;
  const slotIds = new Set([...Object.keys(localSlots), ...Object.keys(remoteSlots)]);

  for (const slotId of slotIds) {
    const l = isPlainObject(localSlots[slotId]) ? localSlots[slotId] : null;
    const r = isPlainObject(remoteSlots[slotId]) ? remoteSlots[slotId] : null;

    // 한쪽에만 있으면 있는 쪽을 쓴다.
    if (l && !r) {
      merged.slots[slotId] = clone(l);
      toRemote.push(slotId);
      continue;
    }
    if (!l && r) {
      merged.slots[slotId] = clone(r);
      toLocal.push({ slot: slotId, updatedAt: r.updatedAt, createdAt: r.createdAt, lineage: r.lineage, data: clone(r.data) });
      continue;
    }
    if (!l && !r) continue;

    const lt = isFiniteNumber(l.updatedAt) ? l.updatedAt : 0;
    const rt = isFiniteNumber(r.updatedAt) ? r.updatedAt : 0;

    // 클라우드에 있는 그 기록을 올린 게 바로 이 기기라면, 남의 기록이 아니라 내 기록이다.
    // 내가 올린 것을 나에게 되물을 이유가 없다. 이 기기 것을 그대로 쓴다.
    const myOwnUpload = device && r.device && r.device === device;
    if (myOwnUpload) {
      const { slot: won, changed } = combineSlot(slotId, adopt(l, r), r);
      merged.slots[slotId] = won;
      if (!deepEqual(won.data, r.data)) toRemote.push(slotId);
      if (changed) {
        toLocal.push({ slot: slotId, updatedAt: won.updatedAt, createdAt: won.createdAt, lineage: won.lineage, data: clone(won.data) });
      }
      continue;
    }

    // 양쪽 다 저장 시각을 모르는 옛 기록이다. 묻지 않고 이 기기 것을 기준으로 삼되,
    // 항목은 합쳐서 어느 쪽도 잃지 않는다.
    if (lt === 0 && rt === 0) {
      const { slot: won } = combineSlot(slotId, adopt(l, r), r);
      merged.slots[slotId] = won;
      if (!deepEqual(won.data, r.data)) toRemote.push(slotId);
      continue;
    }

    // 한쪽만 저장 시각을 모른다. 클라우드 저장을 붙이기 전부터 있던 기록이 이 경우다.
    // 시각이 0이라는 이유로 자동으로 지게 두면 그 기기의 기록이 통째로 밀린다
    // (2026-07-29 모바일 데이터 유실의 직접 원인). 내용이 있으면 사람에게 묻는다.
    if ((lt === 0) !== (rt === 0)) {
      const olderSide = lt === 0 ? l : r;
      if (bulkOf(olderSide.data) > 0 && !deepEqual(l.data, r.data)) {
        merged.slots[slotId] = adopt(l, r);
        conflicts.push({ slot: slotId, reason: "unknown-time", local: clone(l), remote: clone(r) });
        continue;
      }
    }

    // 저장 시각이 현재보다 크게 미래면 그 시각을 믿을 수 없다. 어느 쪽도 자동 채택하지 않는다.
    if (lt > skewLimit || rt > skewLimit) {
      merged.slots[slotId] = clone(l);
      conflicts.push({ slot: slotId, reason: "clock-skew", local: clone(l), remote: clone(r) });
      continue;
    }

    // 기록 줄기가 서로 다르면 이어지는 기록이 아니라 무관한 두 기록이다.
    // 시각이 최신이라는 이유로 남의 기록을 덮으면 안 되므로 사용자에게 묻는다.
    if (l.lineage && r.lineage && l.lineage !== r.lineage) {
      merged.slots[slotId] = clone(l);
      conflicts.push({ slot: slotId, reason: "different-lineage", local: clone(l), remote: clone(r) });
      continue;
    }

    if (lt === rt) {
      if (deepEqual(l.data, r.data)) {
        // 완전히 같다. 아무것도 하지 않는다(불필요한 업로드 0).
        merged.slots[slotId] = adopt(l, r);
      } else if (onlyExtraKeys(l.data, r.data)) {
        // 겹치는 항목의 값은 전부 같고 한쪽에만 더 있는 항목이 있을 뿐이다.
        // 화면에 보이는 기록이 양쪽 똑같은데도 물어보는 원인이 이 경우였다
        // (2026-08-01 신고: 같은 선택 창이 계속 다시 뜬다). 묻지 않고 합친다.
        const { slot: won, changed } = combineSlot(slotId, adopt(l, r), r);
        merged.slots[slotId] = won;
        if (!deepEqual(won.data, r.data)) toRemote.push(slotId);
        if (changed) {
          toLocal.push({ slot: slotId, updatedAt: won.updatedAt, createdAt: won.createdAt, lineage: won.lineage, data: clone(won.data) });
        }
      } else {
        // 시각이 같은데 내용이 다르다. 어느 쪽이 최신인지 기계가 정할 수 없다.
        merged.slots[slotId] = adopt(l, r);
        conflicts.push({ slot: slotId, reason: "same-time-diff-content", local: clone(l), remote: clone(r) });
      }
      continue;
    }

    // 시각으로는 이길 쪽이 정해져도, 지는 쪽이 훨씬 많은 내용을 담고 있으면 묻는다.
    const loserSide = lt > rt ? r : l;
    const winnerSide = lt > rt ? l : r;
    if (hasBigLoss(winnerSide.data, loserSide.data)) {
      merged.slots[slotId] = adopt(l, r);
      conflicts.push({ slot: slotId, reason: "big-loss", local: clone(l), remote: clone(r) });
      continue;
    }

    if (lt > rt) {
      const { slot: won, changed } = combineSlot(slotId, adopt(l, r), r);
      merged.slots[slotId] = won;
      toRemote.push(slotId);
      // 합쳐서 값이 달라졌으면 이 기기에도 그 결과를 되돌려 써야 한다.
      if (changed) {
        toLocal.push({ slot: slotId, updatedAt: won.updatedAt, createdAt: won.createdAt, lineage: won.lineage, data: clone(won.data) });
      }
    } else {
      const { slot: won, changed } = combineSlot(slotId, adopt(r, l), l);
      merged.slots[slotId] = won;
      toLocal.push({ slot: slotId, updatedAt: won.updatedAt, createdAt: won.createdAt, lineage: won.lineage, data: clone(won.data) });
      // 합친 결과에는 이 기기에만 있던 것도 들어 있으므로 클라우드에도 올린다.
      if (changed && !toRemote.includes(slotId)) toRemote.push(slotId);
    }
  }

  // 병합 결과의 문서 갱신 시각은 슬롯 중 가장 최신값.
  let latest = 0;
  for (const slotId of Object.keys(merged.slots)) {
    const t = merged.slots[slotId].updatedAt;
    if (isFiniteNumber(t) && t > latest) latest = t;
  }
  if (latest) merged.updatedAt = latest;

  // 미해결 충돌이 남아 있으면 올리지 않는다. 사용자가 고른 뒤에 올린다.
  const blockUpload = conflicts.length > 0;

  return {
    merged,
    apply: { toLocal, toRemote: blockUpload ? [] : toRemote },
    conflicts,
    remoteStatus,
    blockUpload,
  };
}
