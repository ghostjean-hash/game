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
export function registerServiceWorker(swPath = "/service-worker.js") {
  if (!("serviceWorker" in navigator)) return;
  // 상대 경로로 처리(GitHub Pages 서브패스 대응)
  window.addEventListener("load", () => {
    const path = swPath.startsWith("/") ? "." + swPath : swPath;
    navigator.serviceWorker.register(path).catch(() => {});
  });
}
