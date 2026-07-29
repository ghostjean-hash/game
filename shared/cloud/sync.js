// 로그인·원격 저장소·기기 저장·병합 로직을 엮는 조립부. SSOT: 설계 4.3 + 6.3 S2.
//
// 원칙: 게임은 언제나 기기에 먼저 저장한다. 이 파일이 하는 일은 그 뒤를 따라가는 것뿐이며,
// 어떤 실패도 게임 진행을 막지 않는다.

import { buildDocument, mergeDocuments, checkUploadable } from "./merge.js";
import { slotIdOf } from "./local.js";
import { timingOf } from "./policy.js";

export const STATUS = {
  SIGNED_OUT: "signed-out", // 로그인 전
  SYNCING: "syncing",       // 올리는 중
  SYNCED: "synced",         // 동기화됨
  OFFLINE: "offline",       // 통신 실패, 자동 재시도 예정
  ERROR: "error",           // 저장 실패(사유 있음)
  CONFLICT: "conflict",     // 사용자 선택 대기
  DISABLED: "disabled",     // 로그인 유효기간 만료 등으로 동기화만 중지
};

export function createSync({
  auth,
  remote,
  local,
  device = "",
  onStatus = () => {},
  onConflicts = () => {},
  now = () => Date.now(),
  debounceMs = 4000,
  // 저장이 쉬지 않고 이어지면 대기가 계속 뒤로 밀린다. 첫 변경으로부터 이 시간이 지나면 무조건 올린다.
  maxWaitMs = 20000,
  scheduler = { setTimeout: globalThis.setTimeout.bind(globalThis), clearTimeout: globalThis.clearTimeout.bind(globalThis) },
}) {
  let state = STATUS.SIGNED_OUT;
  let reason = null;
  let lastSyncAt = 0;
  let timer = null;
  let pendingSince = 0; // 올리지 못한 변경이 처음 생긴 시각
  let pendingWait = null; // 이번 묶음에 적용할 대기 시간(게임별로 다르다)
  let pendingMax = null;
  let inFlight = false;
  let queued = false;
  let pending = null; // 사용자 선택 대기 중인 병합 결과
  let unsubscribe = null;

  function setStatus(next, why = null) {
    state = next;
    reason = why;
    try {
      onStatus({ state, reason, lastSyncAt, profile: auth.getProfile ? auth.getProfile() : null });
    } catch {}
  }

  function cancelTimer() {
    if (timer !== null) {
      scheduler.clearTimeout(timer);
      timer = null;
    }
  }

  // 여러 게임이 동시에 바뀌었으면 가장 급한 쪽 기준으로 올린다.
  function scheduleFlush(slotId = null) {
    const t = now();
    if (!pendingSince) {
      pendingSince = t;
      pendingWait = null;
      pendingMax = null;
    }
    if (slotId) {
      const timing = timingOf(slotId);
      pendingWait = pendingWait === null ? timing.wait : Math.min(pendingWait, timing.wait);
      pendingMax = pendingMax === null ? timing.maxWait : Math.min(pendingMax, timing.maxWait);
    }
    // 어느 게임인지 모르는 호출(수동 저장 등)만 이 조립부의 기본값을 쓴다.
    const wait = pendingWait === null ? debounceMs : pendingWait;
    const max = pendingMax === null ? maxWaitMs : pendingMax;
    cancelTimer();
    // 저장이 이어지는 동안은 계속 미루되, 첫 변경으로부터 상한을 넘기지는 않는다.
    const delay = Math.max(0, Math.min(wait, max - (t - pendingSince)));
    // 콜백이 동기화 완료를 돌려준다. 브라우저 타이머는 반환값을 무시하지만,
    // 예약된 동기화가 끝났는지 기다려야 하는 쪽(테스트·수동 저장)이 이 값을 쓴다.
    timer = scheduler.setTimeout(() => {
      timer = null;
      pendingSince = 0;
      return syncOnce("debounce");
    }, delay);
  }

  async function syncOnce(why = "manual") {
    if (!auth.isSignedIn()) {
      setStatus(STATUS.SIGNED_OUT);
      return { skipped: "signed-out" };
    }

    // 로그인 유효기간이 끝났는데 조용히 되살릴 수 없으면 동기화만 끈다.
    // 게임 도중 로그인 창을 띄우지 않는다(설계 4.4.4).
    const token = await auth.getToken({ silent: true });
    if (!token) {
      setStatus(STATUS.DISABLED, "token-unavailable");
      return { skipped: "no-token" };
    }

    if (inFlight) {
      queued = true;
      return { skipped: "in-flight" };
    }
    inFlight = true;
    setStatus(STATUS.SYNCING);

    // 이 기기가 처음 동기화하기 직전 상태를 한 번 남긴다. 무언가 잘못 덮였을 때의 마지막 수단.
    try { local.snapshotOnce(now()); } catch {}

    try {
      let remoteDoc = null;
      try {
        remoteDoc = await remote.load();
      } catch {
        setStatus(STATUS.OFFLINE, "load-failed");
        return { error: "load" };
      }

      const t = now();
      const localDoc = buildDocument(local.readAllSlots(), { now: t, device });
      const result = mergeDocuments(localDoc, remoteDoc, { now: t, device });

      for (const item of result.apply.toLocal) {
        // 기록 줄기와 생성 시각까지 물려받아야 다음 병합에서 같은 줄기로 인식된다.
        local.writeSlot(item.slot, item.data, item.updatedAt, {
          createdAt: item.createdAt,
          lineage: item.lineage,
        });
      }

      if (result.conflicts.length) {
        pending = result;
        setStatus(STATUS.CONFLICT, "needs-choice");
        try { onConflicts(result.conflicts); } catch {}
        return { conflicts: result.conflicts.length };
      }

      if (result.remoteStatus === "invalid") {
        // 해석할 수 없는 문서. 덮어쓰면 남의 기록을 지울 수 있으므로 올리지 않는다.
        setStatus(STATUS.ERROR, "remote-unreadable");
        return { error: "remote-unreadable" };
      }

      if (!result.apply.toRemote.length) {
        lastSyncAt = t;
        setStatus(STATUS.SYNCED);
        return { uploaded: false, pulled: result.apply.toLocal.length };
      }

      const check = checkUploadable(result.merged);
      if (!check.ok) {
        setStatus(STATUS.ERROR, check.reason);
        return { error: check.reason };
      }

      try {
        await remote.save(result.merged);
      } catch {
        setStatus(STATUS.OFFLINE, "save-failed");
        return { error: "save" };
      }

      lastSyncAt = t;
      setStatus(STATUS.SYNCED);
      return { uploaded: true, pulled: result.apply.toLocal.length };
    } finally {
      inFlight = false;
      if (queued) {
        queued = false;
        scheduleFlush();
      }
    }
  }

  return {
    /** 게임 저장 알림을 받기 시작한다. */
    start() {
      globalThis.__ggCloudNotify = (namespace) => this.notifyChange(namespace);
      if (auth.onChange) {
        unsubscribe = auth.onChange((signedIn) => {
          if (signedIn) syncOnce("sign-in");
          else setStatus(STATUS.SIGNED_OUT);
        });
      }
      if (auth.isSignedIn()) return syncOnce("start");
      setStatus(STATUS.SIGNED_OUT);
      return Promise.resolve({ skipped: "signed-out" });
    },

    stop() {
      cancelTimer();
      if (globalThis.__ggCloudNotify) delete globalThis.__ggCloudNotify;
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    },

    /** 게임이 저장할 때마다 호출된다(shared/storage.js 및 lotto 저장 모듈). */
    notifyChange(namespace) {
      const slot = slotIdOf(namespace);
      local.touch(slot, now());
      if (!auth.isSignedIn()) return; // 미로그인 사용자는 업로드 시도 0
      scheduleFlush(slot);
    },

    flushNow() {
      cancelTimer();
      pendingSince = 0;
      return syncOnce("manual");
    },

    pullNow() {
      cancelTimer();
      pendingSince = 0;
      return syncOnce("pull");
    },

    /**
     * 충돌 선택 반영. choices = { [slotId]: 'local' | 'remote' }.
     * 'local'을 고르면 그 기록의 시각을 지금으로 올려 다음 병합에서 이기게 한다
     * (기기 시계 오류로 생긴 충돌도 이 시점에 정상화된다).
     */
    resolveConflicts(choices = {}) {
      if (!pending) return Promise.resolve({ skipped: "no-pending" });
      const conflicts = pending.conflicts;
      pending = null;
      for (const c of conflicts) {
        const choice = choices[c.slot] === "remote" ? "remote" : "local";
        if (choice === "remote") {
          // 클라우드 기록을 택했으면 그쪽 줄기를 물려받는다.
          local.writeSlot(c.slot, c.remote.data, c.remote.updatedAt, {
            createdAt: c.remote.createdAt,
            lineage: c.remote.lineage,
          });
        } else {
          // 이 기기 기록을 택했으면 지금 시각으로 올려 다음 병합에서 이기게 한다.
          // 업로드가 끝나면 클라우드도 이 줄기가 되므로 같은 충돌이 반복되지 않는다.
          local.touch(c.slot, now());
        }
      }
      return syncOnce("resolve");
    },

    getPendingConflicts() {
      return pending ? pending.conflicts : [];
    },

    getStatus() {
      return { state, reason, lastSyncAt };
    },
  };
}
