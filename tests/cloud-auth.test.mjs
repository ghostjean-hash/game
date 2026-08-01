// 로그인 유지 검사 (설계 4.4). 외부 의존 0, 순수 node.
//
// 여기서 확인하는 것은 "언제 로그인 창이 뜨는가" 하나다.
// 구글 로그인 창 자체는 사람만 확인할 수 있으므로, 창을 띄우는 호출이 일어나는지를
// 가짜 구글 라이브러리로 가로채 센다. 실제 창의 모양·동의 화면은 5.5 체크리스트 담당.
//
// 2026-08-01 개정(설계 4.4.6). 그전 검사는 구글 부품의 prompt 빈 요청을
// "창이 뜨지 않는 조용한 재발급"으로 가정했는데, 실제로는 그 요청도 팝업 창을 연다.
// 그 잘못된 가정이 팝업 차단 사용자에게 1시간마다 로그인이 풀리는 사고의 뿌리였다.
// 이제 검사 기준은 하나로 단순해졌다 - 조용한 경로는 구글 창 호출을 단 한 번도 하지 않는다.
//
// 실행: node tests/cloud-auth.test.mjs

import assert from 'node:assert/strict';

const TOKEN_KEY = 'gg.__cloud.token';
const SIGNED_KEY = 'gg.__cloud.signedin';
const FAIL_KEY = 'gg.__cloud.renewfail';
const TRY_KEY = 'gg.__cloud.renewtry';
const STATE_KEY = 'gg.__cloud.renewstate';

const HUB = 'https://ghostjean-hash.github.io/game/';

const results = [];
function test(name, fn) {
  results.push({ name, fn });
}

// --- 브라우저 스텁 ---
function makeStore() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    _has(k) { return map.has(k); },
  };
}

// 가짜 구글 로그인 라이브러리. requestAccessToken 호출을 전부 기록한다.
// 이 부품의 요청은 종류를 가리지 않고 팝업 창을 연다 - 그래서 호출 수가 곧 창 개수다.
function makeGis({ expiresIn = 3600, grant = true, defer = false } = {}) {
  const calls = [];
  const client = {
    callback: () => {},
    error_callback: () => {},
    requestAccessToken(opts = {}) {
      calls.push(opts);
      const n = calls.length;
      const answer = () => {
        if (grant) client.callback({ access_token: `tok-${n}`, expires_in: expiresIn });
        else client.callback({});
      };
      // defer면 응답을 미뤄 "요청이 아직 진행 중"인 상태를 만든다(중복 방지 검사용).
      if (defer) client._answer = answer;
      else answer();
    },
  };
  globalThis.google = { accounts: { oauth2: { initTokenClient: () => client } } };
  return {
    calls,
    client,
    windowCount() { return calls.length; },
  };
}

// 주소 이동을 가로채는 가짜 주소창.
function makeLocation(href) {
  const u = new URL(href);
  const moves = [];
  return {
    get origin() { return u.origin; },
    get pathname() { return u.pathname; },
    get search() { return u.search; },
    get hash() { return u.hash; },
    replace(next) { moves.push(next); },
    _moves: moves,
  };
}

// 매 검사마다 깨끗한 환경을 만든다.
function env({ expiresIn = 3600, grant = true, defer = false, href = HUB, standalone = false } = {}) {
  const local = makeStore();
  const session = makeStore();
  globalThis.localStorage = local;
  globalThis.sessionStorage = session;
  const loc = makeLocation(href);
  globalThis.location = loc;
  globalThis.history = { replaceState: () => {} };
  // node는 navigator를 읽기 전용으로 이미 갖고 있어 그냥 덮어쓸 수 없다.
  const realNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { standalone },
    configurable: true,
    writable: true,
  });
  const gis = makeGis({ expiresIn, grant, defer });
  return {
    local,
    session,
    gis,
    loc,
    restore() {
      delete globalThis.google;
      delete globalThis.localStorage;
      delete globalThis.sessionStorage;
      delete globalThis.location;
      delete globalThis.history;
      if (realNavigator) Object.defineProperty(globalThis, 'navigator', realNavigator);
      else delete globalThis.navigator;
    },
  };
}

// auth.js는 불러오는 시점이 아니라 호출 시점에 저장소를 읽으므로 한 번만 import하면 된다.
const { createGoogleAuth, absorbRedirectResult, startRedirectRenew } = await import('../shared/cloud/auth.js');
const { createDriveRemote } = await import('../shared/cloud/remote.js');

function saveToken(store, token, msLeft) {
  store.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt: Date.now() + msLeft }));
}

function hub(extra = {}) {
  return { clientId: 'x', scope: 's', redirectRenew: true, redirectUri: HUB, ...extra };
}

// --- 4.4.3 토큰 보관 위치 ---

test('4.4.3 창을 닫았다 다시 들어와도 저장된 토큰을 창 없이 쓴다', async () => {
  const e = env();
  try {
    saveToken(e.local, 'kept', 30 * 60 * 1000);
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth(hub());
    assert.equal(await auth.getToken({ silent: true }), 'kept');
    assert.equal(e.gis.windowCount(), 0); // 구글에 아무것도 묻지 않았다
  } finally {
    e.restore();
  }
});

test('4.4.3.3 이전 방식(세션 한정)에 남은 토큰을 새 위치로 옮긴다', async () => {
  const e = env();
  try {
    saveToken(e.session, 'legacy', 30 * 60 * 1000);
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth(hub());
    assert.equal(await auth.getToken({ silent: true }), 'legacy');
    assert.equal(e.gis.windowCount(), 0);
    // 새 위치로 옮겨졌고 옛 위치는 비었다(두 곳이 갈리지 않게).
    assert.equal(JSON.parse(e.local.getItem(TOKEN_KEY)).token, 'legacy');
    assert.equal(e.session.getItem(TOKEN_KEY), null);
  } finally {
    e.restore();
  }
});

test('4.4.3 새로 받은 토큰은 창을 닫아도 남는 곳에 저장된다', async () => {
  const e = env();
  try {
    const auth = createGoogleAuth(hub());
    assert.equal(await auth.signIn(), true);
    assert.equal(JSON.parse(e.local.getItem(TOKEN_KEY)).token, 'tok-1');
    assert.equal(e.session._has(TOKEN_KEY), false);
  } finally {
    e.restore();
  }
});

test('4.4.3.4 다른 페이지가 갱신한 토큰을 창 없이 이어 쓴다', async () => {
  const e = env();
  try {
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth(hub());
    // 이 페이지는 토큰이 없는 상태. 그 사이 다른 페이지가 저장해 뒀다.
    saveToken(e.local, 'from-other-page', 30 * 60 * 1000);
    assert.equal(await auth.getToken({ silent: true }), 'from-other-page');
    assert.equal(e.gis.windowCount(), 0);
  } finally {
    e.restore();
  }
});

test('4.3.6 로그아웃은 저장된 토큰만 지운다', async () => {
  const e = env();
  try {
    const auth = createGoogleAuth(hub());
    await auth.signIn();
    auth.signOut();
    assert.equal(e.local.getItem(TOKEN_KEY), null);
    assert.equal(auth.isSignedIn(), false);
  } finally {
    e.restore();
  }
});

// --- 4.4.6.3 조용한 경로는 창을 열지 않는다 ---

test('4.4.6.3 만료된 토큰이라도 조용한 경로에서는 창을 열지 않는다', async () => {
  const e = env();
  try {
    saveToken(e.local, 'dead', -1000); // 이미 지난 것
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth(hub({ redirectRenew: false }));
    assert.equal(await auth.getToken({ silent: true }), null);
    assert.equal(e.gis.windowCount(), 0);
  } finally {
    e.restore();
  }
});

test('4.4.6.3 로그인한 적 없으면 조용한 경로에서 아무것도 하지 않는다', async () => {
  const e = env();
  try {
    const auth = createGoogleAuth(hub());
    assert.equal(await auth.getToken({ silent: true }), null);
    assert.equal(e.gis.windowCount(), 0);
    assert.equal(e.loc._moves.length, 0);
  } finally {
    e.restore();
  }
});

test('4.4.6.3 사용자가 직접 누른 로그인은 창을 딱 한 번 띄운다', async () => {
  const e = env();
  try {
    const auth = createGoogleAuth(hub());
    assert.equal(await auth.signIn(), true);
    assert.equal(e.gis.windowCount(), 1);
  } finally {
    e.restore();
  }
});

test('4.4.6.4 같은 순간에 두 곳이 요청해도 창은 하나만 열린다', async () => {
  const e = env({ defer: true });
  try {
    const auth = createGoogleAuth(hub());
    const a = auth.getToken({ silent: false });
    const b = auth.getToken({ silent: false });
    // 구글 부품을 불러오는 과정이 한 박자 뒤에 끝나므로 대기 중인 처리를 흘려보낸다.
    await new Promise((r) => setImmediate(r));
    assert.equal(e.gis.windowCount(), 1); // 이 시점에 이미 창은 하나만 열렸다
    e.gis.client._answer(); // 미뤄 둔 구글 응답을 이제 돌려준다
    assert.equal(await a, 'tok-1');
    assert.equal(await b, 'tok-1');
    assert.equal(e.gis.windowCount(), 1); // 창은 하나였다
  } finally {
    e.restore();
  }
});

test('4.4.6.4 앞 요청이 끝난 뒤에는 새 요청이 다시 창을 띄운다', async () => {
  const e = env({ grant: false });
  try {
    const auth = createGoogleAuth(hub());
    assert.equal(await auth.signIn(), false);
    assert.equal(await auth.signIn(), false);
    assert.equal(e.gis.windowCount(), 2); // 중복 방지가 요청을 영구 잠그지는 않는다
  } finally {
    e.restore();
  }
});

// --- 4.4.6.1 주소 이동 갱신 발동 조건 ---

test('4.4.6.1 만료된 로그인은 허브에서 구글에 다녀오는 이동을 시작한다', async () => {
  const e = env();
  try {
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth(hub());
    assert.equal(await auth.getToken({ silent: true }), null);
    assert.equal(e.gis.windowCount(), 0); // 팝업은 열지 않았다
    assert.equal(e.loc._moves.length, 1);
    const url = new URL(e.loc._moves[0]);
    assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(url.searchParams.get('prompt'), 'none'); // 화면을 띄우지 말라는 요청
    assert.equal(url.searchParams.get('response_type'), 'token');
    assert.equal(url.searchParams.get('redirect_uri'), HUB);
    // 돌아왔을 때 대조할 값을 남겨 뒀다.
    assert.equal(url.searchParams.get('state'), e.session.getItem(STATE_KEY));
  } finally {
    e.restore();
  }
});

test('4.4.6.1 스위치가 꺼져 있으면 이동하지 않는다', async () => {
  const e = env();
  try {
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth(hub({ redirectRenew: false }));
    await auth.getToken({ silent: true });
    assert.equal(e.loc._moves.length, 0);
  } finally {
    e.restore();
  }
});

test('4.4.6.1 등록된 주소가 아닌 화면(게임 페이지)에서는 이동하지 않는다', async () => {
  const e = env({ href: 'https://ghostjean-hash.github.io/game/games/tetris/' });
  try {
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth(hub());
    await auth.getToken({ silent: true });
    assert.equal(e.loc._moves.length, 0); // 놀이 중인 판을 날리지 않는다
  } finally {
    e.restore();
  }
});

test('4.4.6.1 개발 서버(주소 불일치)에서는 이동하지 않는다', async () => {
  const e = env({ href: 'http://127.0.0.1:8000/' });
  try {
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth(hub());
    await auth.getToken({ silent: true });
    assert.equal(e.loc._moves.length, 0);
  } finally {
    e.restore();
  }
});

test('4.4.6.1 홈 화면에 추가한 앱에서는 이동하지 않는다', async () => {
  const e = env({ standalone: true });
  try {
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth(hub());
    await auth.getToken({ silent: true });
    assert.equal(e.loc._moves.length, 0); // 밖으로 나가면 돌아오지 못할 수 있다
  } finally {
    e.restore();
  }
});

test('4.4.6.1 한 번 다녀온 세션에서 다시 이동하지 않는다', async () => {
  const e = env();
  try {
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth(hub());
    await auth.getToken({ silent: true });
    await auth.getToken({ silent: true });
    await auth.getToken({ silent: true });
    assert.equal(e.loc._moves.length, 1); // 되돌이가 생기지 않는다
  } finally {
    e.restore();
  }
});

test('4.4.6.1 최근에 실패했으면 한동안 다시 이동하지 않는다', async () => {
  const e = env();
  try {
    e.local.setItem(SIGNED_KEY, '1');
    e.local.setItem(FAIL_KEY, String(Date.now() - 60 * 1000)); // 1분 전 실패
    const auth = createGoogleAuth(hub());
    await auth.getToken({ silent: true });
    assert.equal(e.loc._moves.length, 0);
  } finally {
    e.restore();
  }
});

test('4.4.6.1 실패 억제 시간이 지나면 다시 이동한다', async () => {
  const e = env();
  try {
    e.local.setItem(SIGNED_KEY, '1');
    e.local.setItem(FAIL_KEY, String(Date.now() - 45 * 60 * 1000)); // 45분 전 실패
    const auth = createGoogleAuth(hub());
    await auth.getToken({ silent: true });
    assert.equal(e.loc._moves.length, 1);
  } finally {
    e.restore();
  }
});

// --- 4.4.6.2 돌아온 결과 받기 ---

test('4.4.6.2 구글이 돌려준 출입증을 보관소로 옮긴다', async () => {
  const e = env({ href: `${HUB}#access_token=fresh&expires_in=3600&state=abc` });
  try {
    e.session.setItem(STATE_KEY, 'abc');
    assert.equal(absorbRedirectResult(), 'granted');
    const saved = JSON.parse(e.local.getItem(TOKEN_KEY));
    assert.equal(saved.token, 'fresh');
    assert.ok(saved.expiresAt > Date.now() + 50 * 60 * 1000);
    assert.equal(e.local.getItem(SIGNED_KEY), '1');
    // 대조값은 한 번 쓰고 버린다.
    assert.equal(e.session.getItem(STATE_KEY), null);
  } finally {
    e.restore();
  }
});

test('4.4.6.2 받은 출입증은 곧바로 창 없이 쓰인다', async () => {
  const e = env({ href: `${HUB}#access_token=fresh&expires_in=3600&state=abc` });
  try {
    e.session.setItem(STATE_KEY, 'abc');
    absorbRedirectResult();
    const auth = createGoogleAuth(hub());
    assert.equal(await auth.getToken({ silent: true }), 'fresh');
    assert.equal(e.gis.windowCount(), 0);
    assert.equal(e.loc._moves.length, 0);
  } finally {
    e.restore();
  }
});

test('4.4.6.2 대조값이 다르면 손대지 않는다', async () => {
  const e = env({ href: `${HUB}#access_token=evil&expires_in=3600&state=zzz` });
  try {
    e.session.setItem(STATE_KEY, 'abc');
    assert.equal(absorbRedirectResult(), null);
    assert.equal(e.local.getItem(TOKEN_KEY), null);
    assert.equal(e.session.getItem(STATE_KEY), 'abc'); // 우리 요청은 아직 살아 있다
  } finally {
    e.restore();
  }
});

test('4.4.6.2 되살리기 실패는 억제 기록을 남긴다', async () => {
  const e = env({ href: `${HUB}?error=login_required&state=abc` });
  try {
    e.session.setItem(STATE_KEY, 'abc');
    assert.equal(absorbRedirectResult(), 'denied');
    assert.equal(e.local.getItem(TOKEN_KEY), null);
    assert.ok(Number(e.local.getItem(FAIL_KEY)) > 0);
  } finally {
    e.restore();
  }
});

test('4.4.6.2 성공하면 억제 기록과 세션 표시를 지운다', async () => {
  const e = env({ href: `${HUB}#access_token=fresh&expires_in=3600&state=abc` });
  try {
    e.local.setItem(FAIL_KEY, String(Date.now()));
    e.session.setItem(TRY_KEY, '1');
    e.session.setItem(STATE_KEY, 'abc');
    absorbRedirectResult();
    assert.equal(e.local.getItem(FAIL_KEY), null);
    assert.equal(e.session.getItem(TRY_KEY), null); // 다음 만료 때 다시 다녀올 수 있다
  } finally {
    e.restore();
  }
});

test('4.4.6.2 우리 것이 아닌 주소는 그냥 지나간다', async () => {
  const e = env({ href: `${HUB}#section-3` });
  try {
    assert.equal(absorbRedirectResult(), null);
  } finally {
    e.restore();
  }
});

test('4.4.6.1 로그아웃하면 억제 기록도 함께 사라진다', async () => {
  const e = env();
  try {
    const auth = createGoogleAuth(hub());
    await auth.signIn();
    e.local.setItem(FAIL_KEY, String(Date.now()));
    e.session.setItem(TRY_KEY, '1');
    auth.signOut();
    assert.equal(e.local.getItem(FAIL_KEY), null);
    assert.equal(e.session.getItem(TRY_KEY), null);
  } finally {
    e.restore();
  }
});

test('4.4.6.1 이동 조건을 직접 확인한다 - 스위치·주소가 맞으면 시작한다', () => {
  const e = env();
  try {
    assert.equal(startRedirectRenew({ clientId: 'x', scope: 's', enabled: true, redirectUri: HUB }), true);
    assert.equal(e.loc._moves.length, 1);
  } finally {
    e.restore();
  }
});

// --- 4.4.5 드라이브가 거절해도 창을 띄우지 않는다 ---

function makeRemoteEnv({ tokens = ['a', 'b'], statuses = [401, 200] } = {}) {
  const asked = [];
  let tokenIdx = 0;
  let callIdx = 0;
  const invalidated = [];
  const remote = createDriveRemote({
    getToken: async (opts = {}) => {
      asked.push(opts);
      const t = tokens[Math.min(tokenIdx, tokens.length - 1)];
      return t;
    },
    invalidateToken: () => {
      invalidated.push(true);
      tokenIdx += 1;
    },
    fetchImpl: async () => {
      const status = statuses[Math.min(callIdx, statuses.length - 1)];
      callIdx += 1;
      return {
        status,
        ok: status >= 200 && status < 300,
        async json() { return { files: [] }; },
      };
    },
  });
  return { remote, asked, invalidated, promptedCount: () => asked.filter((o) => o.silent === false).length };
}

test('4.4.5 유효기간 거절을 받아도 로그인 창을 띄우는 호출을 하지 않는다', async () => {
  const r = makeRemoteEnv({ statuses: [401, 200] });
  await r.remote.load();
  assert.equal(r.promptedCount(), 0);
});

test('4.4.5 거절당한 토큰을 버리고 조용히 다시 받아 재시도한다', async () => {
  const r = makeRemoteEnv({ tokens: ['dead', 'fresh'], statuses: [401, 200] });
  await r.remote.load();
  assert.equal(r.invalidated.length, 1);       // 죽은 토큰을 버렸다
  assert.equal(r.asked.length, 3);             // 최초 + 재발급 + 재시도
  assert.ok(r.asked.every((o) => o.silent === true));
});

test('4.4.5 재발급이 실패하면 창을 띄우지 않고 통신을 포기한다', async () => {
  const asked = [];
  const remote = createDriveRemote({
    getToken: async (opts = {}) => {
      asked.push(opts);
      return asked.length === 1 ? 'dead' : null; // 재발급 실패
    },
    invalidateToken: () => {},
    fetchImpl: async () => ({ status: 401, ok: false, async json() { return {}; } }),
  });
  await assert.rejects(() => remote.load(), /no-token/);
  assert.equal(asked.filter((o) => o.silent === false).length, 0);
});

test('4.4.5 거절이 두 번 이어지면 무한 재시도하지 않는다', async () => {
  let calls = 0;
  const remote = createDriveRemote({
    getToken: async () => 'tok',
    invalidateToken: () => {},
    fetchImpl: async () => {
      calls += 1;
      return { status: 401, ok: false, async json() { return {}; } };
    },
  });
  await assert.rejects(() => remote.load(), /drive-401/);
  assert.equal(calls, 2); // 최초 + 재시도 1회로 끝
});

// --- 실행 ---
const line = '─'.repeat(60);
let failed = 0;
console.log(line);
for (const t of results) {
  try {
    await t.fn();
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    failed += 1;
    console.log(`  ✗ ${t.name}\n      ${String(err.message).split('\n')[0]}`);
  }
}
console.log(line);
if (failed) {
  console.log(`FAIL — ${failed}건 실패 / 통과 ${results.length - failed}`);
  process.exit(1);
} else {
  console.log(`PASS — 통과 ${results.length} / 실패 0`);
  process.exit(0);
}
