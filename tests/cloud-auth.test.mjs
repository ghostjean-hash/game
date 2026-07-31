// 로그인 유지 검사 (설계 4.4). 외부 의존 0, 순수 node.
//
// 여기서 확인하는 것은 "언제 로그인 창이 뜨는가" 하나다.
// 구글 로그인 창 자체는 사람만 확인할 수 있으므로, 창을 띄우는 호출이 일어나는지를
// 가짜 구글 라이브러리로 가로채 센다. 실제 창의 모양·동의 화면은 5.5 체크리스트 담당.
//
// 실행: node tests/cloud-auth.test.mjs

import assert from 'node:assert/strict';

const TOKEN_KEY = 'gg.__cloud.token';
const SIGNED_KEY = 'gg.__cloud.signedin';

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
// prompt가 '' 인 호출은 창을 띄우지 않는 조용한 재발급, 그 외는 창이 뜨는 호출이다.
function makeGis({ expiresIn = 3600, grant = true } = {}) {
  const calls = [];
  const client = {
    callback: () => {},
    error_callback: () => {},
    requestAccessToken(opts = {}) {
      calls.push(opts);
      const n = calls.length;
      if (grant) client.callback({ access_token: `tok-${n}`, expires_in: expiresIn });
      else client.callback({});
    },
  };
  globalThis.google = { accounts: { oauth2: { initTokenClient: () => client } } };
  return {
    calls,
    client,
    // 창이 뜨는 호출(조용한 재발급이 아닌 것)만 센다.
    promptedCount() { return calls.filter((o) => o.prompt !== '').length; },
    silentCount() { return calls.filter((o) => o.prompt === '').length; },
  };
}

// 매 검사마다 깨끗한 환경을 만든다. 예약된 갱신 타이머도 여기서 가로챈다.
function env({ expiresIn = 3600, grant = true } = {}) {
  const local = makeStore();
  const session = makeStore();
  globalThis.localStorage = local;
  globalThis.sessionStorage = session;
  const timers = [];
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms) => {
    timers.push({ fn, ms });
    return timers.length;
  };
  globalThis.clearTimeout = () => {};
  const gis = makeGis({ expiresIn, grant });
  return {
    local,
    session,
    gis,
    timers,
    restore() {
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
      delete globalThis.google;
      delete globalThis.localStorage;
      delete globalThis.sessionStorage;
    },
  };
}

// auth.js는 불러오는 시점이 아니라 호출 시점에 저장소를 읽으므로 한 번만 import하면 된다.
const { createGoogleAuth } = await import('../shared/cloud/auth.js');
const { createDriveRemote } = await import('../shared/cloud/remote.js');

function saveToken(store, token, msLeft) {
  store.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt: Date.now() + msLeft }));
}

// --- 4.4.3 토큰 보관 위치 ---

test('4.4.3 창을 닫았다 다시 들어와도 저장된 토큰을 창 없이 쓴다', async () => {
  const e = env();
  try {
    saveToken(e.local, 'kept', 30 * 60 * 1000);
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth({ clientId: 'x', scope: 's' });
    assert.equal(await auth.getToken({ silent: true }), 'kept');
    assert.equal(e.gis.calls.length, 0); // 구글에 아무것도 묻지 않았다
  } finally {
    e.restore();
  }
});

test('4.4.3.3 이전 방식(세션 한정)에 남은 토큰을 새 위치로 옮긴다', async () => {
  const e = env();
  try {
    saveToken(e.session, 'legacy', 30 * 60 * 1000);
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth({ clientId: 'x', scope: 's' });
    assert.equal(await auth.getToken({ silent: true }), 'legacy');
    assert.equal(e.gis.calls.length, 0);
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
    const auth = createGoogleAuth({ clientId: 'x', scope: 's' });
    assert.equal(await auth.signIn(), true);
    assert.equal(JSON.parse(e.local.getItem(TOKEN_KEY)).token, 'tok-1');
    assert.equal(e.session._has(TOKEN_KEY), false);
  } finally {
    e.restore();
  }
});

test('4.4.3 만료된 저장 토큰은 쓰지 않는다', async () => {
  const e = env();
  try {
    saveToken(e.local, 'dead', -1000); // 이미 지난 것
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth({ clientId: 'x', scope: 's' });
    const t = await auth.getToken({ silent: true });
    assert.equal(t, 'tok-1');            // 조용히 새로 받았다
    assert.equal(e.gis.promptedCount(), 0); // 창은 띄우지 않았다
  } finally {
    e.restore();
  }
});

test('4.4.3.4 다른 페이지가 갱신한 토큰을 창 없이 이어 쓴다', async () => {
  const e = env();
  try {
    e.local.setItem(SIGNED_KEY, '1');
    const auth = createGoogleAuth({ clientId: 'x', scope: 's' });
    // 이 페이지는 토큰이 없는 상태. 그 사이 다른 페이지가 저장해 뒀다.
    saveToken(e.local, 'from-other-page', 30 * 60 * 1000);
    assert.equal(await auth.getToken({ silent: true }), 'from-other-page');
    assert.equal(e.gis.calls.length, 0);
  } finally {
    e.restore();
  }
});

test('4.3.6 로그아웃은 저장된 토큰만 지운다', async () => {
  const e = env();
  try {
    const auth = createGoogleAuth({ clientId: 'x', scope: 's' });
    await auth.signIn();
    auth.signOut();
    assert.equal(e.local.getItem(TOKEN_KEY), null);
    assert.equal(auth.isSignedIn(), false);
  } finally {
    e.restore();
  }
});

// --- 4.4.2 만료 전 미리 갱신 ---

test('4.4.2 토큰을 받으면 만료 5분 전 갱신이 예약된다', async () => {
  const e = env({ expiresIn: 3600 });
  try {
    const auth = createGoogleAuth({ clientId: 'x', scope: 's' });
    await auth.signIn();
    assert.equal(e.timers.length, 1);
    // 수명 3600초에서 안전여유 1분을 뺀 시점의 5분 전 = 54분.
    assert.equal(e.timers[0].ms, 54 * 60 * 1000);
  } finally {
    e.restore();
  }
});

test('4.4.2 예약된 갱신은 창을 띄우지 않는다', async () => {
  const e = env({ expiresIn: 3600 });
  try {
    const auth = createGoogleAuth({ clientId: 'x', scope: 's' });
    await auth.signIn();
    const promptedBefore = e.gis.promptedCount();
    e.timers[0].fn(); // 예약 시점이 왔다고 가정
    // 갱신은 구글 라이브러리를 거쳐 돌아오므로 대기 중인 처리를 모두 흘려보낸 뒤 센다.
    await new Promise((r) => setImmediate(r));
    assert.equal(e.gis.silentCount(), 1);
    assert.equal(e.gis.promptedCount(), promptedBefore); // 창 호출은 늘지 않았다
  } finally {
    e.restore();
  }
});

test('4.4.2 남은 시간이 5분 미만이면 즉시 갱신을 예약한다', async () => {
  const e = env();
  try {
    saveToken(e.local, 'almost', 2 * 60 * 1000); // 2분 남음
    e.local.setItem(SIGNED_KEY, '1');
    createGoogleAuth({ clientId: 'x', scope: 's' });
    assert.equal(e.timers.length, 1);
    assert.equal(e.timers[0].ms, 0);
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
