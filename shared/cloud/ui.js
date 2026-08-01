// 허브에 붙는 클라우드 저장 UI. SSOT: 설계 4.7.
//
// 게임 화면에는 아무것도 그리지 않는다(사용자 결정 2026-07-29, 설계 7.4).
// 모달·토스트는 새로 만들지 않고 shared/ui.js의 것을 쓴다.

import { showModal, showToast } from "../ui.js";
import { STATUS } from "./sync.js";

const LABELS = {
  [STATUS.SIGNED_OUT]: "저장",
  [STATUS.SYNCING]: "올리는 중",
  [STATUS.SYNCED]: "동기화됨",
  [STATUS.OFFLINE]: "오프라인",
  [STATUS.ERROR]: "저장 실패",
  [STATUS.CONFLICT]: "선택 필요",
  [STATUS.DISABLED]: "다시 로그인",
};

const ERROR_REASONS = {
  "too-large": "저장할 내용이 너무 큽니다.",
  "remote-unreadable": "클라우드 기록을 읽을 수 없습니다. 최신 버전에서 저장된 기록일 수 있습니다.",
  "save-failed": "클라우드에 올리지 못했습니다.",
  "load-failed": "클라우드에서 내려받지 못했습니다.",
  "token-unavailable": "로그인 유효기간이 끝났습니다. 다시 로그인해 주세요.",
};

// 게임별 요약 문구(설계 4.7.3.2).
// 무엇을 버리게 되는지 사람이 알아볼 수 있어야 한다. 시각만 보여주면 고를 수 없다.
// field는 그 게임이 실제로 저장하는 키다(각 게임 소스에서 확인한 값).
const SUMMARY_SPEC = {
  "gg.tetris": { field: "best.marathon", label: "최고 점수" },
  "gg.flightshooting": { field: "best", label: "최고 점수" },
  "gg.rushhour": { field: "progress", label: "푼 문제" },
  "gg.nonogram": { field: "progress", label: "푼 퍼즐" },
  "gg.sudoku": { field: null, label: "최고 기록" },
  "gg.english-reading": { field: "done", label: "읽은 지문" },
  "gg.english-vocabulary": { field: null, label: "학습 기록" },
  lotto: { field: "characters", label: "캐릭터" },
};

const SUMMARIZERS = {};

export function registerSummarizer(slotId, fn) {
  SUMMARIZERS[slotId] = fn;
}

function countOf(v) {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === "object") return Object.keys(v).length;
  return null;
}

function formatField(label, value) {
  if (typeof value === "number" && Number.isFinite(value)) return `${label} ${value.toLocaleString()}`;
  const n = countOf(value);
  if (n !== null) return `${label} ${n}개`;
  return null;
}

function absTime(ts) {
  if (!ts) return "기록 없음";
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1);
  const dd = String(d.getDate());
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

function relativeTime(ts, now = Date.now()) {
  if (!ts) return "";
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
}

function summarize(slotId, slot) {
  const fn = SUMMARIZERS[slotId];
  if (fn) {
    try {
      const text = fn(slot.data);
      if (text) return text;
    } catch {}
  }
  const data = slot.data && typeof slot.data === "object" ? slot.data : {};
  const spec = SUMMARY_SPEC[slotId];
  if (spec && spec.field && Object.prototype.hasOwnProperty.call(data, spec.field)) {
    const text = formatField(spec.label, data[spec.field]);
    if (text) return text;
  }
  const label = spec ? spec.label : "저장 항목";
  return `${label} ${Object.keys(data).length}개`;
}

/**
 * 허브 헤더에 상태 버튼을 붙인다.
 * @returns {{ setStatus, showConflicts, el }}
 */
export function mountCloudUI({ container, auth, sync, local, titles = {} }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cloud-btn";
  btn.setAttribute("aria-live", "polite");
  btn.innerHTML = `<span class="cloud-btn-dot" aria-hidden="true"></span><span class="cloud-btn-label"></span>`;
  const labelEl = btn.querySelector(".cloud-btn-label");
  const dotEl = btn.querySelector(".cloud-btn-dot");
  container.appendChild(btn);

  let last = { state: STATUS.SIGNED_OUT, reason: null, lastSyncAt: 0, profile: null };

  function paint() {
    const { state, lastSyncAt, profile } = last;
    btn.dataset.state = state;

    let text = LABELS[state] || "저장";
    if (state === STATUS.SYNCED && lastSyncAt) {
      const rel = relativeTime(lastSyncAt);
      text = rel === "방금" ? "동기화됨" : `${rel} 저장됨`;
    }
    labelEl.textContent = text;

    // 로그인 후에는 계정 사진을, 그전에는 구름 표시를 둔다.
    if (profile && profile.picture) {
      dotEl.style.backgroundImage = `url("${profile.picture}")`;
      dotEl.textContent = "";
      dotEl.dataset.kind = "photo";
    } else if (profile) {
      // 이름을 받으려면 권한을 더 요구해야 해서 받지 않는다(설계 2.5).
      // 이름이 없을 때 물음표를 띄우면 오류처럼 보이므로 로그인 표시를 쓴다.
      dotEl.style.backgroundImage = "";
      const initial = (profile.name || "").trim().charAt(0);
      dotEl.textContent = initial || "✓";
      dotEl.dataset.kind = initial ? "initial" : "signed";
    } else {
      dotEl.style.backgroundImage = "";
      dotEl.textContent = "☁";
      dotEl.dataset.kind = "cloud";
    }

    btn.title =
      state === STATUS.ERROR || state === STATUS.OFFLINE || state === STATUS.DISABLED
        ? ERROR_REASONS[last.reason] || "동기화에 문제가 있습니다."
        : "구글 계정에 게임 기록 저장";
  }

  // 상대 시각 표시를 주기적으로 갱신한다.
  setInterval(() => {
    if (last.state === STATUS.SYNCED) paint();
  }, 30000);

  async function openMenu() {
    const profile = auth.getProfile ? auth.getProfile() : null;
    const choice = await showModal({
      title: profile ? profile.name || "계정" : "계정",
      stack: true,
      closeX: true,
      actions: [
        { label: "저장하기 (구글 드라이브)", value: "push", primary: true },
        { label: "불러오기 (구글 드라이브)", value: "pull" },
        { label: "내보내기 (JSON 파일)", value: "export" },
        { label: "처음 상태로 되돌리기", value: "restore" },
        { label: "로그아웃", value: "signout" },
      ],
    });

    if (choice === "push") {
      await sync.flushNow();
      showToast(sync.getStatus().state === STATUS.SYNCED ? "저장했습니다" : "저장하지 못했습니다");
    } else if (choice === "pull") {
      await sync.pullNow();
      showToast(sync.getStatus().state === STATUS.SYNCED ? "불러왔습니다" : "불러오지 못했습니다");
    } else if (choice === "export") {
      exportToFile();
    } else if (choice === "restore") {
      const snap = local.readSnapshot();
      if (!snap) {
        showToast("되돌릴 기록이 없습니다");
      } else {
        const yes = await showModal({
          title: `${absTime(snap.at)} 상태로 되돌립니다`,
          stack: true,
          actions: [
            { label: "되돌리기", value: "go", primary: true },
            { label: "취소", value: "no" },
          ],
        });
        if (yes === "go") {
          const n = local.restoreSnapshot();
          showToast(n ? `${n}개 항목을 되돌렸습니다. 새로고침하세요` : "되돌리지 못했습니다");
        }
      }
    } else if (choice === "signout") {
      auth.signOut();
      showToast("로그아웃했습니다. 기기 기록은 그대로입니다");
    }
  }

  function exportToFile() {
    try {
      const blob = new Blob([JSON.stringify(local.readAllSlots(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "game-ghost-save.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("내보내기에 실패했습니다");
    }
  }

  /** 충돌 선택 대화상자(설계 4.7.3). 게임마다 따로 고른다. */
  async function showConflicts(conflicts) {
    if (!conflicts || !conflicts.length) return;

    const wrap = document.createElement("div");
    wrap.className = "cloud-conflict";
    const now = Date.now();

    for (const c of conflicts) {
      const group = document.createElement("div");
      group.className = "cloud-conflict-group";
      const name = titles[c.slot] || c.slot;
      const head = document.createElement("div");
      head.className = "cloud-conflict-name";
      head.textContent = name;
      group.appendChild(head);

      for (const side of ["local", "remote"]) {
        const id = `cf-${c.slot}-${side}`.replace(/[^a-zA-Z0-9-]/g, "_");
        const row = document.createElement("label");
        row.className = "cloud-conflict-row";
        row.htmlFor = id;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `cf-${c.slot}`;
        input.id = id;
        input.value = side;
        if (side === "local") input.checked = true;

        const text = document.createElement("span");
        const head = document.createElement("b");
        head.textContent = `${side === "local" ? "이 기기" : "클라우드"}  ${summarize(c.slot, c[side])}`;
        const when = document.createElement("small");
        when.className = "cloud-conflict-when";
        // 언제 시작된 기록이고 언제 마지막으로 저장됐는지 둘 다 보여준다.
        const rel = relativeTime(c[side].updatedAt, now);
        const parts = [`시작 ${absTime(c[side].createdAt)}`, `최종 저장 ${absTime(c[side].updatedAt)}${rel ? ` (${rel})` : ""}`];
        when.textContent = parts.join(" · ");
        text.appendChild(head);
        text.appendChild(when);

        row.appendChild(input);
        row.appendChild(text);
        group.appendChild(row);
      }
      wrap.appendChild(group);
    }

    // 무엇 때문에 묻는지 제목으로 구분한다.
    const reasons = new Set(conflicts.map((c) => c.reason));
    let title = "기록이 서로 다릅니다";
    if (reasons.size === 1) {
      if (reasons.has("different-lineage")) title = "서로 다른 기록입니다";
      else if (reasons.has("big-loss")) title = "한쪽 기록이 훨씬 많습니다";
      else if (reasons.has("unknown-time")) title = "어느 쪽이 최신인지 알 수 없습니다";
    }
    const decision = await showModal({
      title,
      bodyEl: wrap,
      actions: [
        { label: "선택대로 진행", value: "apply", primary: true },
        { label: "취소", value: "cancel" },
      ],
    });
    if (decision !== "apply") return;

    const choices = {};
    for (const c of conflicts) {
      const picked = wrap.querySelector(`input[name="cf-${CSS.escape(c.slot)}"]:checked`);
      choices[c.slot] = picked ? picked.value : "local";
    }
    await sync.resolveConflicts(choices);
    showToast("기록을 정리했습니다");
  }

  btn.addEventListener("click", async () => {
    if (last.state === STATUS.CONFLICT) {
      showConflicts(sync.getPendingConflicts());
      return;
    }
    if (!auth.isSignedIn()) {
      await auth.signIn();
      return;
    }
    // 유효기간이 끝나 동기화가 멈춘 상태다. 버튼에 "다시 로그인"이라고 적혀 있으니
    // 눌렀을 때 메뉴가 아니라 로그인 창이 떠야 한다. 사용자가 직접 누른 순간이라
    // 창을 띄워도 팝업 차단에 막히지 않는다(설계 4.4.6.3).
    if (last.state === STATUS.DISABLED) {
      const ok = await auth.signIn();
      if (ok) await sync.pullNow();
      else showToast("다시 로그인하지 못했습니다");
      return;
    }
    openMenu();
  });

  paint();

  return {
    el: btn,
    setStatus(next) {
      last = { ...last, ...next };
      paint();
    },
    showConflicts,
  };
}
