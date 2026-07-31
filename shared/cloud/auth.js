// 로그인 담당. SSOT: 설계 4.4 + 6.3 S2/S4/S5.
//
// 진짜 구글 로그인(createGoogleAuth)과 검증용 가짜 로그인(createMockAuth)이 같은 모양을 갖는다.
//   isSignedIn() / signIn() / signOut() / getToken({silent}) / invalidateToken() / getProfile() / onChange(cb)

const GIS_SRC = "https://accounts.google.com/gsi/client";
const TOKEN_KEY = "gg.__cloud.token";     // 창을 닫아도 남는 보관(설계 4.4.3, 2026-07-31 변경)
const SIGNED_KEY = "gg.__cloud.signedin"; // 이 기기에서 로그인한 적이 있는지
const RENEW_LEAD_MS = 5 * 60 * 1000;      // 만료 5분 전에 미리 조용히 갱신(설계 4.4.2)

function loadGis() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(!!globalThis.google?.accounts?.oauth2));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const el = document.createElement("script");
    el.src = GIS_SRC;
    el.async = true;
    el.onload = () => resolve(!!globalThis.google?.accounts?.oauth2);
    el.onerror = () => resolve(false);
    document.head.appendChild(el);
  });
}

/**
 * 진짜 구글 로그인. 브라우저 방식이라 비밀키를 쓰지 않는다.
 * 접속 토큰의 수명은 약 1시간이고 갱신 토큰은 발급되지 않으므로,
 * 만료 5분 전에 구글 세션이 살아 있는 한 창을 띄우지 않고 미리 다시 받는다(설계 4.4.2).
 * 토큰은 창을 닫아도 남는 곳에 보관한다(설계 4.4.3, 2026-07-31 변경).
 */
export function createGoogleAuth({ clientId, scope }) {
  let token = null;
  let expiresAt = 0;
  let client = null;
  let renewTimer = null;
  const listeners = new Set();

  // 보관된 토큰을 읽어 온다. 아직 살아 있으면 그대로 쓴다.
  // 이전 방식(세션 한정)으로 남은 값도 한 번 받아들여 재로그인을 면한다(설계 4.4.3.3).
  function loadSaved() {
    for (const store of [localStorage, sessionStorage]) {
      try {
        const raw = store.getItem(TOKEN_KEY);
        if (!raw) continue;
        const saved = JSON.parse(raw);
        if (saved && saved.token && saved.expiresAt > Date.now()) {
          token = saved.token;
          expiresAt = saved.expiresAt;
          return true;
        }
      } catch {}
    }
    return false;
  }

  function remember() {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
      else localStorage.removeItem(TOKEN_KEY);
      // 이전 방식으로 남은 값은 두 곳이 갈리지 않게 정리한다.
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {}
  }

  // 만료를 기다리지 않고 미리 갱신한다. 사용자가 조작하는 순간에 만료를 만나지 않게 하는 것이 목적이다.
  function scheduleRenew() {
    try { if (renewTimer !== null) clearTimeout(renewTimer); } catch {}
    renewTimer = null;
    if (!token) return;
    const delay = Math.max(0, expiresAt - RENEW_LEAD_MS - Date.now());
    try {
      renewTimer = setTimeout(() => {
        renewTimer = null;
        request(true);
      }, delay);
    } catch {}
  }

  if (loadSaved()) {
    remember();
    scheduleRenew();
  }

  function markSignedIn(v) {
    try {
      if (v) localStorage.setItem(SIGNED_KEY, "1");
      else localStorage.removeItem(SIGNED_KEY);
    } catch {}
  }

  function everSignedIn() {
    try { return localStorage.getItem(SIGNED_KEY) === "1"; } catch { return false; }
  }

  function emit(v) {
    for (const cb of listeners) {
      try { cb(v); } catch {}
    }
  }

  async function ensureClient() {
    const ok = await loadGis();
    if (!ok) return null;
    if (!client) {
      client = globalThis.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope,
        callback: () => {},
      });
    }
    return client;
  }

  function request(silent) {
    return new Promise(async (resolve) => {
      const c = await ensureClient();
      if (!c) { resolve(null); return; }
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      c.callback = (res) => {
        if (res && res.access_token) {
          token = res.access_token;
          // 만료 1분 전을 만료로 취급해 통신 도중 끊기는 상황을 피한다.
          expiresAt = Date.now() + (Number(res.expires_in) || 3600) * 1000 - 60000;
          remember();
          markSignedIn(true);
          scheduleRenew();
          finish(token);
        } else {
          finish(null);
        }
      };
      c.error_callback = () => finish(null);
      try {
        // prompt '' = 창을 띄우지 않고 조용히 시도(실패하면 null).
        // 사용자가 직접 버튼을 누른 첫 로그인은 기본값으로 두어 계정 선택 창이 뜨게 한다.
        c.requestAccessToken(silent ? { prompt: "" } : {});
      } catch {
        finish(null);
      }
    });
  }

  return {
    isSignedIn() {
      return !!token || everSignedIn();
    },

    async signIn() {
      const t = await request(false);
      emit(!!t);
      return !!t;
    },

    // 이 기기의 로그인 상태만 푼다. 저장된 게임 기록은 건드리지 않는다(설계 4.3.6).
    signOut() {
      token = null;
      expiresAt = 0;
      try { if (renewTimer !== null) clearTimeout(renewTimer); } catch {}
      renewTimer = null;
      remember();
      markSignedIn(false);
      emit(false);
    },

    // 드라이브가 거절한 토큰을 버린다. 창은 띄우지 않는다(설계 4.4.5).
    invalidateToken() {
      token = null;
      expiresAt = 0;
      remember();
    },

    async getToken({ silent = true } = {}) {
      if (token && Date.now() < expiresAt) return token;
      // 다른 페이지가 이미 갱신해 뒀을 수 있다. 창을 띄우기 전에 보관된 값을 먼저 본다(설계 4.4.3.4).
      if (loadSaved()) {
        scheduleRenew();
        return token;
      }
      if (!silent) return request(false);
      if (!everSignedIn()) return null;
      return request(true);
    },

    // 프로필은 별도 권한이 있어야 받을 수 있다. 권한을 늘리지 않기 위해 받지 않는다(설계 2.5).
    getProfile() {
      return token || everSignedIn() ? { name: "", email: "", picture: "" } : null;
    },

    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

export function createMockAuth({ signedIn = false, profile = null, tokenFails = false } = {}) {
  let isIn = signedIn;
  let failToken = tokenFails;
  const listeners = new Set();
  const me = profile || { name: "테스트 사용자", email: "test@example.com", picture: "" };

  function emit() {
    for (const cb of listeners) {
      try { cb(isIn); } catch {}
    }
  }

  return {
    isSignedIn() { return isIn; },

    async signIn() {
      isIn = true;
      emit();
      return true;
    },

    // 로그아웃은 이 기기의 로그인 상태만 푼다. 저장된 게임 기록은 건드리지 않는다(설계 4.3.6).
    signOut() {
      isIn = false;
      emit();
    },

    invalidateToken() {},

    async getToken({ silent = true } = {}) {
      if (!isIn) return null;
      if (failToken && silent) return null;
      return "mock-access-token";
    },

    getProfile() { return isIn ? me : null; },

    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    _setTokenFails(v) { failToken = v; },
  };
}
