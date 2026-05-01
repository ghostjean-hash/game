// 공통 UI 헬퍼. 모달/토스트 같은 작은 부분을 일관되게.

export function showModal({ title, body, actions = [{ label: "확인", primary: true }] }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <h2></h2>
      <p></p>
      <div class="modal-actions"></div>
    `;
    modal.querySelector("h2").textContent = title || "";
    modal.querySelector("p").textContent = body || "";

    const actionsEl = modal.querySelector(".modal-actions");
    actions.forEach((a, i) => {
      const btn = document.createElement("button");
      btn.className = "btn" + (a.primary ? " btn-primary" : "");
      btn.textContent = a.label;
      btn.addEventListener("click", () => {
        document.body.removeChild(backdrop);
        resolve(a.value ?? i);
      });
      actionsEl.appendChild(btn);
    });

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
  });
}

export function showToast(message, duration = 1600) {
  const el = document.createElement("div");
  el.textContent = message;
  Object.assign(el.style, {
    position: "fixed",
    bottom: "calc(env(safe-area-inset-bottom) + 24px)",
    left: "50%",
    transform: "translateX(-50%) translateY(20px)",
    background: "var(--bg-elev-2)",
    color: "var(--fg)",
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1px solid var(--line)",
    fontSize: "14px",
    fontWeight: "600",
    boxShadow: "var(--shadow-2)",
    zIndex: "200",
    opacity: "0",
    transition: "opacity 200ms, transform 200ms",
    pointerEvents: "none",
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateX(-50%) translateY(0)";
  });
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => el.remove(), 220);
  }, duration);
}

// service worker 등록 (각 페이지에서 호출). 루트 스코프.
//
// 개발 환경(localhost / 127.0.0.1)에서는 SW 자체를 차단합니다.
// SW가 살아 있으면 캐시 동기화가 매번 골치 아프기 때문입니다.
// 운영 환경(GitHub Pages 등)에서만 SW를 register 합니다.
export function registerServiceWorker(swPath = "/service-worker.js") {
  if (!("serviceWorker" in navigator)) return;

  const host = location.hostname;
  const isDev = host === "localhost" || host === "127.0.0.1";

  if (isDev) {
    // 기존 SW 모두 unregister + 모든 캐시 삭제. 첫 진입 시 1회 자동 reload.
    Promise.all([
      navigator.serviceWorker.getRegistrations().then((rs) =>
        Promise.all(rs.map((r) => r.unregister())).then(() => rs.length)
      ),
      caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))),
    ])
      .then(([unregisteredCount]) => {
        if (unregisteredCount > 0 && !sessionStorage.getItem("__sw_purged")) {
          sessionStorage.setItem("__sw_purged", "1");
          location.reload();
        }
      })
      .catch(() => {});
    return;
  }

  // 프로덕션: 등록 + 새 SW activate 시 1회 자동 reload.
  window.addEventListener("load", () => {
    const path = swPath.startsWith("/") ? "." + swPath : swPath;
    navigator.serviceWorker
      .register(path)
      .then((reg) => {
        try { reg.update(); } catch {}
      })
      .catch(() => {});
  });

  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}
