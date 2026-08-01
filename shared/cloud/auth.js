// 로그인 담당. SSOT: 설계 4.4 + 6.3 S2/S4/S5.
//
// 진짜 구글 로그인(createGoogleAuth)과 검증용 가짜 로그인(createMockAuth)이 같은 모양을 갖는다.
//   isSignedIn() / signIn() / signOut() / getToken({silent}) / invalidateToken() / getProfile() / onChange(cb)
//
// 2026-08-01 변경(설계 4.4.6). 그전에는 만료 5분 전에 구글 부품의 "조용한 재발급"을 불렀는데,
// 그 부품은 요청에 prompt를 비워도 실제로는 팝업 창을 열고 즉시 닫는다. 그래서
//   - 팝업 차단을 켠 사용자에게는 갱신이 통째로 실패했고(1시간마다 로그인이 풀리는 원인),
//   - 차단하지 않은 사용자에게는 창이 번쩍였으며,
//   - 같은 순간에 두 곳이 토큰을 달라고 하면 창이 두 개 열렸다(중복 방지가 없었다).
// 지금은 셋을 이렇게 바꿨다.
//   1. 조용한 경로에서는 어떤 경우에도 창을 열지 않는다. 창은 사용자가 버튼을 누를 때만 뜬다.
//   2. 만료된 로그인은 허브에 들어올 때 같은 창을 구글에 다녀오게 해서(주소 이동) 되살린다.
//      팝업이 아니므로 차단 설정과 무관하고, 구글 로그인 세션이 살아 있으면 화면이 한 번 깜빡이고 돌아온다.
//   3. 그래도 되살리지 못하면 동기화만 멈춘다. 기기 저장은 평소대로 계속되고 다음에 합쳐진다.

const GIS_SRC = "https://accounts.google.com/gsi/client";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

const TOKEN_KEY = "gg.__cloud.token";     // 창을 닫아도 남는 보관(설계 4.4.3, 2026-07-31 변경)
const SIGNED_KEY = "gg.__cloud.signedin"; // 이 기기에서 로그인한 적이 있는지
const FAIL_KEY = "gg.__cloud.renewfail";  // 주소 이동 갱신이 실패한 시각
const TRY_KEY = "gg.__cloud.renewtry";    // 이번 브라우저 세션에서 이미 다녀왔는지
const STATE_KEY = "gg.__cloud.renewstate";// 돌아왔을 때 우리 요청인지 대조할 임의값

// 통신 도중에 끊기지 않도록 만료 1분 전을 만료로 취급한다.
const SAFETY_MS = 60 * 1000;
// 주소 이동 갱신이 실패하면 이 시간 동안 다시 시도하지 않는다.
// 구글 세션이 아예 없는 사용자를 매 방문마다 이동시키지 않기 위한 것이다.
const FAIL_QUIET_MS = 30 * 60 * 1000;

function store(kind) {
  try {
    return kind === "session" ? globalThis.sessionStorage : globalThis.localStorage;
  } catch {
    return null;
  }
}

// 보관된 토큰을 읽는다. 아직 살아 있는 것만 돌려준다.
// 이전 방식(세션 한정)으로 남은 값도 한 번 받아들여 재로그인을 면한다(설계 4.4.3.3).
function readToken() {
  for (const kind of ["local", "session"]) {
    const s = store(kind);
    if (!s) continue;
    try {
      const raw = s.getItem(TOKEN_KEY);
      if (!raw) continue;
      const saved = JSON.parse(raw);
      if (saved && saved.token && saved.expiresAt > Date.now()) {
        return { token: saved.token, expiresAt: saved.expiresAt };
      }
    } catch {}
  }
  return null;
}

function writeToken(token, expiresAt) {
  const local = store("local");
  const session = store("session");
  try {
    if (token) local && local.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
    else local && local.removeItem(TOKEN_KEY);
    // 이전 방식으로 남은 값은 두 곳이 갈리지 않게 정리한다.
    session && session.removeItem(TOKEN_KEY);
  } catch {}
}

function markSignedIn(v) {
  const s = store("local");
  if (!s) return;
  try {
    if (v) s.setItem(SIGNED_KEY, "1");
    else s.removeItem(SIGNED_KEY);
  } catch {}
}

function everSignedIn() {
  const s = store("local");
  if (!s) return false;
  try { return s.getItem(SIGNED_KEY) === "1"; } catch { return false; }
}

function nonce() {
  try {
    const a = new Uint8Array(16);
    globalThis.crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `s${Date.now()}`;
  }
}

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
 * 주소 이동 갱신에서 돌아온 결과를 받는다(설계 4.4.6.2).
 * 구글은 새 출입증을 주소의 # 뒤에 붙여 되돌려 보낸다. 그 값을 보관소로 옮기고 주소를 정리한다.
 * 우리가 보낸 요청이 아니면(대조값 불일치) 아무것도 건드리지 않는다.
 * @returns {'granted'|'denied'|null} 처리 결과. 우리 것이 아니면 null.
 */
export function absorbRedirectResult() {
  if (typeof globalThis.location === "undefined") return null;
  const loc = globalThis.location;
  const frag = new URLSearchParams(String(loc.hash || "").replace(/^#/, ""));
  const qs = new URLSearchParams(String(loc.search || "").replace(/^\?/, ""));

  const hasToken = frag.has("access_token");
  const hasError = frag.has("error") || qs.has("error");
  if (!hasToken && !hasError) return null;

  const session = store("session");
  const expected = session ? session.getItem(STATE_KEY) : null;
  const got = frag.get("state") || qs.get("state");
  // 대조값이 없거나 다르면 우리가 보낸 요청이 아니다. 남의 주소를 지우지 않는다.
  if (!expected || !got || expected !== got) return null;
  try { session.removeItem(STATE_KEY); } catch {}

  const local = store("local");
  let result;
  if (hasToken) {
    const seconds = Number(frag.get("expires_in")) || 3600;
    writeToken(frag.get("access_token"), Date.now() + seconds * 1000 - SAFETY_MS);
    markSignedIn(true);
    // 성공했으니 억제를 풀어 다음 만료 때 다시 다녀올 수 있게 한다.
    try {
      local && local.removeItem(FAIL_KEY);
      session && session.removeItem(TRY_KEY);
    } catch {}
    result = "granted";
  } else {
    // 구글 세션이 없거나 동의가 풀린 경우다. 한동안 다시 시도하지 않는다.
    try { local && local.setItem(FAIL_KEY, String(Date.now())); } catch {}
    result = "denied";
  }

  // 주소창에서 우리가 붙인 값만 걷어낸다(?cloudmock=1 같은 다른 값은 남긴다).
  try {
    qs.delete("error");
    qs.delete("state");
    const q = qs.toString();
    globalThis.history.replaceState(null, "", `${loc.pathname}${q ? `?${q}` : ""}`);
  } catch {}

  return result;
}

/**
 * 만료된 로그인을 살리러 같은 창을 구글에 다녀오게 한다(설계 4.4.6.1).
 * 성공하면 이 함수는 돌아오지 않는다(페이지가 이동한다).
 * 조건이 하나라도 어긋나면 아무 일도 하지 않고 false를 돌려준다.
 * @returns {boolean} 이동을 시작했는지
 */
export function startRedirectRenew({ clientId, scope, enabled = false, redirectUri = "" } = {}) {
  if (!enabled || !clientId || !redirectUri) return false;
  if (typeof globalThis.location === "undefined") return false;
  const loc = globalThis.location;

  // 홈 화면에 추가한 앱(아이폰)에서 바깥 주소로 나가면 다른 브라우저로 열려 돌아오지 못할 수 있다.
  if (globalThis.navigator && globalThis.navigator.standalone === true) return false;
  // 창 안의 창에서는 하지 않는다.
  try { if (globalThis.top && globalThis.top !== globalThis) return false; } catch { return false; }

  // 구글에 등록한 주소와 지금 주소가 글자 하나까지 같을 때만 보낸다.
  // 다르면 사용자가 구글의 400 오류 화면에 갇힌다(2026-08-01 실측 확인).
  if (`${loc.origin}${loc.pathname}` !== redirectUri) return false;

  const session = store("session");
  const local = store("local");
  if (!session) return false;
  // 한 번 다녀온 세션에서 또 보내면 되돌이가 된다.
  try { if (session.getItem(TRY_KEY)) return false; } catch { return false; }
  try {
    const failedAt = Number(local && local.getItem(FAIL_KEY)) || 0;
    if (failedAt && Date.now() - failedAt < FAIL_QUIET_MS) return false;
  } catch {}

  const state = nonce();
  try {
    session.setItem(TRY_KEY, "1");
    session.setItem(STATE_KEY, state);
  } catch {
    return false;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope,
    // 화면을 띄우지 말고, 이미 로그인·동의한 상태면 그대로 새 출입증만 달라는 뜻.
    prompt: "none",
    state,
    include_granted_scopes: "true",
  });
  try {
    loc.replace(`${AUTH_ENDPOINT}?${params}`);
  } catch {
    return false;
  }
  return true;
}

// 이 파일을 불러오는 것만으로 돌아온 결과를 먼저 받아 둔다.
// 아래 createGoogleAuth가 보관소를 읽기 전에 끝나야 새 출입증이 바로 쓰인다.
try { absorbRedirectResult(); } catch {}

/**
 * 진짜 구글 로그인. 브라우저 방식이라 비밀키를 쓰지 않는다.
 * 출입증의 수명은 약 1시간이고 갱신용 열쇠는 발급되지 않는다(서버가 없으면 받을 수 없다).
 * 그래서 만료된 뒤의 되살리기는 위 startRedirectRenew(주소 이동)가 담당하고,
 * 이 안에서는 사용자가 버튼을 누른 경우에만 창을 띄운다(설계 4.4.6).
 */
export function createGoogleAuth({ clientId, scope, redirectRenew = false, redirectUri = "" }) {
  let token = null;
  let expiresAt = 0;
  let client = null;
  let inFlight = null;
  const listeners = new Set();

  const saved = readToken();
  if (saved) {
    token = saved.token;
    expiresAt = saved.expiresAt;
    // 이전 방식으로 세션 저장소에 남아 있던 값을 새 위치로 옮긴다(설계 4.4.3.3).
    writeToken(token, expiresAt);
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

  /**
   * 창을 띄워 새 출입증을 받는다. 사용자가 버튼을 누른 경우에만 불린다.
   * 같은 순간에 여러 곳이 부르면 창이 여럿 열리므로 진행 중인 요청을 함께 쓴다.
   */
  function request() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const c = await ensureClient();
      if (!c) return null;
      return new Promise((resolve) => {
        let done = false;
        const finish = (v) => { if (!done) { done = true; resolve(v); } };
        c.callback = (res) => {
          if (res && res.access_token) {
            token = res.access_token;
            expiresAt = Date.now() + (Number(res.expires_in) || 3600) * 1000 - SAFETY_MS;
            writeToken(token, expiresAt);
            markSignedIn(true);
            finish(token);
          } else {
            finish(null);
          }
        };
        c.error_callback = () => finish(null);
        try {
          c.requestAccessToken({});
        } catch {
          finish(null);
        }
      });
    })().finally(() => { inFlight = null; });
    return inFlight;
  }

  return {
    isSignedIn() {
      return !!token || everSignedIn();
    },

    async signIn() {
      const t = await request();
      emit(!!t);
      return !!t;
    },

    // 이 기기의 로그인 상태만 푼다. 저장된 게임 기록은 건드리지 않는다(설계 4.3.6).
    signOut() {
      token = null;
      expiresAt = 0;
      writeToken(null, 0);
      markSignedIn(false);
      // 되살리기 억제 기록도 함께 지운다. 다시 로그인하면 처음 상태여야 한다.
      try {
        const local = store("local");
        const session = store("session");
        local && local.removeItem(FAIL_KEY);
        session && session.removeItem(TRY_KEY);
        session && session.removeItem(STATE_KEY);
      } catch {}
      emit(false);
    },

    // 드라이브가 거절한 토큰을 버린다. 창은 띄우지 않는다(설계 4.4.5).
    invalidateToken() {
      token = null;
      expiresAt = 0;
      writeToken(null, 0);
    },

    async getToken({ silent = true } = {}) {
      if (token && Date.now() < expiresAt) return token;
      // 다른 페이지가 이미 갱신해 뒀을 수 있다(설계 4.4.3.4).
      const fresh = readToken();
      if (fresh) {
        token = fresh.token;
        expiresAt = fresh.expiresAt;
        return token;
      }
      // 사용자가 버튼을 누른 경우에만 창을 띄운다.
      if (!silent) return request();
      if (!everSignedIn()) return null;
      // 조용한 경로에서는 창을 열지 않는다. 조건이 맞으면 이 페이지가 구글에 다녀온다.
      startRedirectRenew({ clientId, scope, enabled: redirectRenew, redirectUri });
      return null;
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
