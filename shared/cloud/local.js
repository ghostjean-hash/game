// 기기 저장(localStorage)을 슬롯 단위로 읽고 쓴다. SSOT: 설계 6.3 S2.
//
// 슬롯 = 게임 하나. 두 가지 키 규칙을 알고 있다.
//   gg.<네임스페이스>.<키>  -> 슬롯 'gg.<네임스페이스>'   (shared/storage.js 를 쓰는 게임·앱 7종)
//   lotto_<키>             -> 슬롯 'lotto'              (자체 저장 모듈을 쓰는 lotto)
//
// 기기 저장에는 시각 정보가 없으므로 슬롯별 최종 갱신 시각을 메타 키 한 곳에 따로 둔다.

import { isExcludedKey } from "./merge.js";
import { META_KEY, slotIdOf, readSlotMeta, writeSlotMeta, stampSlot } from "./stamp.js";

export { META_KEY, slotIdOf };

const GG_PREFIX = "gg.";
const LOTTO_PREFIX = "lotto_";

/** 저장 키 -> { slotId, key }. 동기화 대상이 아니면 null. */
export function parseStorageKey(storageKey) {
  if (typeof storageKey !== "string") return null;
  if (storageKey === META_KEY) return null;

  if (storageKey.startsWith(GG_PREFIX)) {
    const rest = storageKey.slice(GG_PREFIX.length);
    const dot = rest.indexOf(".");
    if (dot <= 0 || dot === rest.length - 1) return null;
    const ns = rest.slice(0, dot);
    if (ns.startsWith("__")) return null; // 내부 예약 네임스페이스
    return { slotId: `${GG_PREFIX}${ns}`, key: rest.slice(dot + 1) };
  }

  if (storageKey.startsWith(LOTTO_PREFIX)) {
    const key = storageKey.slice(LOTTO_PREFIX.length);
    if (!key) return null;
    return { slotId: "lotto", key };
  }

  return null;
}

/** { slotId, key } -> 저장 키. */
export function toStorageKey(slotId, key) {
  if (slotId === "lotto") return `${LOTTO_PREFIX}${key}`;
  return `${slotId}.${key}`;
}

const DEVICE_KEY = "gg.__cloud.device";

// 이 기기가 처음 동기화하기 직전의 저장 상태. 한 번만 만들고 이후 덮지 않는다.
// 동기화가 무언가를 잘못 덮었을 때 되돌릴 마지막 수단이다(2026-07-29 유실 사고 이후 신설).
export const BACKUP_KEY = "gg.__cloud.backup";

/** 이 기기를 가리키는 짧은 표식(디버깅용). 없으면 만들어 둔다. */
export function deviceId({ storage = globalThis.localStorage } = {}) {
  try {
    if (!storage) return "unknown";
    let id = storage.getItem(DEVICE_KEY);
    if (!id) {
      id = `dev-${Math.random().toString(36).slice(2, 8)}`;
      storage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

export function createLocal({ storage = globalThis.localStorage } = {}) {
  function allKeys() {
    const out = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (typeof k === "string") out.push(k);
    }
    return out;
  }

  function readMeta() {
    return readSlotMeta({ storage });
  }

  return {
    /** 기기의 모든 슬롯을 { slotId: { updatedAt, createdAt, lineage, data } } 로 읽는다. */
    readAllSlots() {
      const meta = readMeta();
      const slots = {};
      for (const storageKey of allKeys()) {
        const parsed = parseStorageKey(storageKey);
        if (!parsed) continue;
        let value;
        try {
          const raw = storage.getItem(storageKey);
          if (raw === null) continue;
          value = JSON.parse(raw);
        } catch {
          // 해석할 수 없는 값은 동기화에서 제외한다. 기기의 원본은 건드리지 않는다.
          continue;
        }
        if (!slots[parsed.slotId]) {
          const m = meta[parsed.slotId] || { updatedAt: 0, createdAt: null, lineage: null };
          const entry = { updatedAt: m.updatedAt || 0, data: {} };
          if (m.createdAt !== null && m.createdAt !== undefined) entry.createdAt = m.createdAt;
          if (m.lineage) entry.lineage = m.lineage;
          slots[parsed.slotId] = entry;
        }
        slots[parsed.slotId].data[parsed.key] = value;
      }
      return slots;
    },

    /**
     * 클라우드에서 내려온 데이터를 기기에 쓴다.
     *
     * **기기에 있는 항목을 지우지 않는다(2026-07-29 데이터 유실 사고 이후 원칙).**
     * 클라우드에 없다는 이유로 기기 저장을 지우면, 클라우드에 아직 올라가지 않은
     * 그 기기만의 기록이 통째로 사라진다. 실제로 모바일 데이터가 이렇게 사라졌다.
     * 동기화는 더하는 방향만 자동으로 하고, 지우는 방향은 자동으로 하지 않는다.
     */
    writeSlot(slotId, data, updatedAt, meta = {}) {
      const incoming = data && typeof data === "object" && !Array.isArray(data) ? data : {};

      for (const key of Object.keys(incoming)) {
        if (isExcludedKey(slotId, key)) continue;
        try {
          storage.setItem(toStorageKey(slotId, key), JSON.stringify(incoming[key]));
        } catch {}
      }

      writeSlotMeta(
        slotId,
        { updatedAt, createdAt: meta.createdAt, lineage: meta.lineage },
        { storage },
      );
    },

    /** 슬롯의 최종 갱신 시각을 기록한다(게임이 저장할 때마다 호출). */
    touch(slotId, now) {
      stampSlot(slotId, { storage, now }); // 기록 간격은 게임별 정책을 따른다(policy.js)
    },

    readMeta,

    /** 첫 동기화 직전 상태를 한 번만 저장한다. 이미 있으면 건드리지 않는다. */
    snapshotOnce(now = Date.now()) {
      try {
        if (storage.getItem(BACKUP_KEY) !== null) return false;
        const slots = this.readAllSlots();
        if (!Object.keys(slots).length) return false; // 저장할 것이 없으면 만들지 않는다
        storage.setItem(BACKUP_KEY, JSON.stringify({ at: now, slots }));
        return true;
      } catch {
        return false; // 용량 초과 등은 동기화를 막지 않는다
      }
    },

    readSnapshot() {
      try {
        const raw = storage.getItem(BACKUP_KEY);
        if (raw === null) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && parsed.slots ? parsed : null;
      } catch {
        return null;
      }
    },

    /** 저장해 둔 처음 상태를 기기에 되돌린다. 지금 있는 항목은 지우지 않고 합친다. */
    restoreSnapshot() {
      const snap = this.readSnapshot();
      if (!snap) return 0;
      let n = 0;
      for (const slotId of Object.keys(snap.slots)) {
        const s = snap.slots[slotId];
        if (!s || typeof s !== "object") continue;
        this.writeSlot(slotId, s.data, s.updatedAt, { createdAt: s.createdAt, lineage: s.lineage });
        n += 1;
      }
      return n;
    },
  };
}
