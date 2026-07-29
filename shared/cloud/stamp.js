// 슬롯별 "언제 시작됐고 언제 마지막으로 바뀌었나"를 남기는 최소 단위. SSOT: 설계 9.2 / 9.3.
//
// 왜 따로 떼어놨나: 기록이 실제로 바뀌는 곳은 게임 화면이다. 여기서 시각이 남지 않으면
// 새로 세운 기록이 오래된 클라우드 기록에 덮인다. 그래서 이 파일만은 모든 게임이 불러온다.
// 무게를 최소로 유지하고 다른 모듈에 의존하지 않는다.
//
// 기록 줄기(lineage): 이 기기에서 그 게임 기록이 처음 생길 때 붙는 표식.
// 클라우드에서 기록을 받아오면 그쪽 표식을 물려받는다. 표식이 서로 다르면
// 이어지는 기록이 아니라 무관한 두 기록이므로 자동으로 덮지 않는다.

import { timingOf } from "./policy.js";

export const META_KEY = "gg.__cloud.meta";

/** 게임이 쓰는 네임스페이스 -> 슬롯 id. */
export function slotIdOf(namespace) {
  return namespace === "lotto" ? "lotto" : `gg.${namespace}`;
}

export function newLineage() {
  return `ln-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function readRaw(storage) {
  try {
    const raw = storage.getItem(META_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// 옛 형식은 슬롯당 숫자 하나(마지막 저장 시각)였다. 그대로 읽어들인다.
function normalize(entry) {
  if (typeof entry === "number" && Number.isFinite(entry)) {
    return { updatedAt: entry, createdAt: null, lineage: null };
  }
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    return {
      updatedAt: Number(entry.updatedAt) || 0,
      createdAt: Number.isFinite(Number(entry.createdAt)) && entry.createdAt !== null ? Number(entry.createdAt) : null,
      lineage: typeof entry.lineage === "string" && entry.lineage ? entry.lineage : null,
    };
  }
  return { updatedAt: 0, createdAt: null, lineage: null };
}

/** 슬롯 메타 전체를 { slotId: {updatedAt, createdAt, lineage} } 로 읽는다. */
export function readSlotMeta({ storage = globalThis.localStorage } = {}) {
  if (!storage) return {};
  const raw = readRaw(storage);
  const out = {};
  for (const slotId of Object.keys(raw)) out[slotId] = normalize(raw[slotId]);
  return out;
}

/** 한 슬롯의 메타를 통째로 기록한다(클라우드에서 받아온 기록을 반영할 때). */
export function writeSlotMeta(slotId, entry, { storage = globalThis.localStorage } = {}) {
  try {
    if (!storage) return;
    const raw = readRaw(storage);
    const prev = normalize(raw[slotId]);
    raw[slotId] = {
      updatedAt: Number(entry.updatedAt) || 0,
      createdAt: Number.isFinite(Number(entry.createdAt)) ? Number(entry.createdAt) : prev.createdAt,
      lineage: entry.lineage || prev.lineage || null,
    };
    storage.setItem(META_KEY, JSON.stringify(raw));
  } catch {}
}

// 같은 슬롯에 짧은 간격으로 들어오는 반복 기록은 건너뛴다. 간격은 게임마다 다르다(policy.js).
// 목록 스크롤처럼 초당 수십 번 저장하는 화면이 있어서(english-reading), 그때마다
// 메타를 읽고 쓰면 저장 부담이 두 배가 된다. 시각이 조금 낡아도 동기화 판정에는 영향이 없다.
const lastWriteByStorage = new WeakMap(); // 저장소별로 따로 센다

function lastWriteMap(storage) {
  let m = lastWriteByStorage.get(storage);
  if (!m) {
    m = new Map();
    lastWriteByStorage.set(storage, m);
  }
  return m;
}

/**
 * 게임이 저장할 때마다 호출된다. 처음 생기는 기록이면 생성 시각과 줄기 표식을 함께 붙인다.
 */
export function stampSlot(slotId, { storage = globalThis.localStorage, now = Date.now(), minIntervalMs = timingOf(slotId).stamp } = {}) {
  try {
    if (!storage) return;
    const recent = lastWriteMap(storage);
    const lastAt = recent.get(slotId);
    if (lastAt !== undefined && now - lastAt < minIntervalMs && now >= lastAt) return;
    recent.set(slotId, now);
    const raw = readRaw(storage);
    const prev = normalize(raw[slotId]);
    raw[slotId] = {
      updatedAt: now,
      createdAt: prev.createdAt === null ? now : prev.createdAt,
      lineage: prev.lineage || newLineage(),
    };
    storage.setItem(META_KEY, JSON.stringify(raw));
  } catch {
    // 저장 실패는 동기화 정확도만 떨어뜨릴 뿐 게임 진행을 막지 않는다.
  }
}
