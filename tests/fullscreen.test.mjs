// 전체화면 유지 검사 (shared/fullscreen.js). 외부 의존 0, 순수 node.
//
// 여기서 확인하는 것은 "브라우저가 조작 중 전체화면을 임의로 끝냈을 때 되돌아오는가" 하나다.
// 실제 아이패드의 전체화면 해제 제스처는 사람만 만들 수 있으므로, 가짜 document/window로
// 해제 사건을 흉내 내고 전체화면 재요청이 일어나는지를 센다. 실기기 체감은 사람 확인 몫.
//
// 실행: node tests/fullscreen.test.mjs

import assert from 'node:assert/strict';

const results = [];
function test(name, fn) {
  results.push({ name, fn });
}

const IPHONE_SAFARI_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';

// --- 브라우저 스텁 ---
// 안내 띠가 실제로 화면에 붙는지 보려면 최소한의 DOM이 필요하다(붙였다·지웠다만 추적).
function makeElement(tag) {
  const el = {
    tagName: tag, id: '', className: '', type: '', textContent: '',
    _children: [], _listeners: {}, attrs: {}, parent: null,
    appendChild(c) { c.parent = el; el._children.push(c); return c; },
    removeChild(c) { const i = el._children.indexOf(c); if (i >= 0) el._children.splice(i, 1); },
    remove() { el.parent?.removeChild(el); el.parent = null; },
    setAttribute(k, v) { el.attrs[k] = v; },
    getAttribute(k) { return k in el.attrs ? el.attrs[k] : null; },
    addEventListener(t, fn) { (el._listeners[t] = el._listeners[t] || []).push(fn); },
    removeEventListener(t, fn) {
      const a = el._listeners[t] || [];
      const i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    },
    click() { for (const fn of [...(el._listeners.click || [])]) fn({}); },
  };
  return el;
}

function findById(node, id) {
  for (const c of node._children) {
    if (c.id === id) return c;
    const hit = findById(c, id);
    if (hit) return hit;
  }
  return null;
}

// 전체화면 상태·이벤트 배선을 손으로 조작할 수 있는 최소 document/window.
function makeEnv({ standalone = false, supported = true, grant = true, userAgent = 'node-test' } = {}) {
  const listeners = new Map();
  const add = (target, type, fn) => {
    const key = `${target}:${type}`;
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
  };
  const remove = (target, type, fn) => listeners.get(`${target}:${type}`)?.delete(fn);
  const fire = (target, type, ev = {}) => {
    for (const fn of [...(listeners.get(`${target}:${type}`) || [])]) fn(ev);
  };

  const state = { active: false, requests: 0, exits: 0 };

  const root = {
    requestFullscreen: supported
      ? () => {
          state.requests += 1;
          if (!grant) return Promise.reject(new Error('denied'));
          state.active = true;
          // 브라우저는 전환이 끝난 뒤 사건을 알린다.
          fire('document', 'fullscreenchange');
          return Promise.resolve();
        }
      : undefined,
  };

  const body = makeElement('body');
  const head = makeElement('head');

  const document = {
    documentElement: root,
    body,
    head,
    get fullscreenElement() { return state.active ? root : null; },
    exitFullscreen() {
      state.exits += 1;
      state.active = false;
      fire('document', 'fullscreenchange');
      return Promise.resolve();
    },
    createElement: (tag) => makeElement(tag),
    createTextNode: (t) => ({ tagName: '#text', textContent: t, _children: [] }),
    getElementById: (id) => findById(head, id) || findById(body, id),
    addEventListener: (t, fn) => add('document', t, fn),
    removeEventListener: (t, fn) => remove('document', t, fn),
  };

  const storage = new Map();
  const window = {
    document,
    navigator: { standalone, userAgent, maxTouchPoints: /iPhone|iPad/.test(userAgent) ? 5 : 0 },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
    matchMedia: (q) => ({ matches: standalone && /display-mode/.test(q) && /fullscreen|standalone/.test(q) }),
    addEventListener: (t, fn) => add('window', t, fn),
    removeEventListener: (t, fn) => remove('window', t, fn),
  };

  // node의 globalThis.navigator는 덮어쓸 수 없다. 모듈은 window.navigator만 보므로 그대로 둔다.
  globalThis.window = window;
  globalThis.document = document;

  return {
    state,
    fire,
    body,
    /** 안내 띠의 닫기 버튼을 누른다. */
    closeHint() {
      const box = body._children[0];
      const close = box?._children.find((c) => c.tagName === 'button');
      close?.click();
    },
    /** 브라우저가 사용자 의사와 무관하게 전체화면을 끝낸 상황(아이패드 스와이프 등). */
    forceExit() {
      state.active = false;
      fire('document', 'fullscreenchange');
    },
    /** 사용자가 화면에서 손을 뗀 순간. */
    pointerUp() { fire('window', 'pointerup'); },
    keyDown(key) { fire('window', 'keydown', { key }); },
  };
}

function makeButton() {
  const handlers = new Set();
  return {
    hidden: true,
    attrs: {},
    addEventListener: (t, fn) => { if (t === 'click') handlers.add(fn); },
    removeEventListener: (t, fn) => { if (t === 'click') handlers.delete(fn); },
    setAttribute(k, v) { this.attrs[k] = v; },
    click() { for (const fn of [...handlers]) fn(); },
  };
}

// 모듈이 불러오는 시점에 document를 잡으므로, 환경을 세운 뒤 매번 새로 import 한다.
let importSeq = 0;
async function loadModule() {
  importSeq += 1;
  return import(`../shared/fullscreen.js?t=${importSeq}`);
}

// 재요청은 Promise 체인을 타므로 마이크로태스크를 한 번 비운다.
const settle = () => new Promise((r) => setTimeout(r, 0));

// --- 검사 ---

test('버튼을 누르면 전체화면으로 들어간다', async () => {
  const env = makeEnv();
  const { setupFullscreen } = await loadModule();
  const btn = makeButton();
  setupFullscreen({ button: btn });
  assert.equal(btn.hidden, false);
  btn.click();
  await settle();
  assert.equal(env.state.active, true);
  assert.equal(env.state.requests, 1);
});

test('브라우저가 임의로 끝내면 다음 조작에 되돌아온다', async () => {
  const env = makeEnv();
  const { setupFullscreen } = await loadModule();
  const btn = makeButton();
  setupFullscreen({ button: btn });
  btn.click();
  await settle();

  env.forceExit(); // 아이패드 스와이프 등으로 풀린 상황
  assert.equal(env.state.active, false);

  env.pointerUp(); // 사용자가 다음 조작에서 손을 뗌
  await settle();
  assert.equal(env.state.active, true, '전체화면으로 되돌아와야 한다');
  assert.equal(env.state.requests, 2);
});

test('사용자가 버튼으로 끈 것은 되돌리지 않는다', async () => {
  const env = makeEnv();
  const { setupFullscreen } = await loadModule();
  const btn = makeButton();
  setupFullscreen({ button: btn });
  btn.click();
  await settle();
  btn.click(); // 사용자가 직접 끔
  await settle();
  assert.equal(env.state.active, false);

  env.pointerUp();
  await settle();
  assert.equal(env.state.active, false, '사용자 의사를 뒤집으면 안 된다');
  assert.equal(env.state.requests, 1);
});

test('ESC로 끈 것도 되돌리지 않는다', async () => {
  const env = makeEnv();
  const { setupFullscreen } = await loadModule();
  const btn = makeButton();
  setupFullscreen({ button: btn });
  btn.click();
  await settle();

  env.keyDown('Escape'); // 데스크톱에서 사용자가 직접 나가는 경로
  env.forceExit();       // 브라우저가 뒤이어 해제를 통보
  env.pointerUp();
  await settle();
  assert.equal(env.state.active, false);
  assert.equal(env.state.requests, 1);
});

test('복귀가 계속 거절당하면 3회에서 멈춘다', async () => {
  // 첫 진입만 허용하고 그 뒤 거절하는 브라우저를 흉내 낸다.
  const env = makeEnv();
  const { setupFullscreen } = await loadModule();
  const btn = makeButton();
  setupFullscreen({ button: btn });
  btn.click();
  await settle();

  const root = globalThis.document.documentElement;
  root.requestFullscreen = () => { env.state.requests += 1; return Promise.reject(new Error('denied')); };

  env.forceExit();
  for (let i = 0; i < 10; i++) { env.pointerUp(); await settle(); }
  assert.equal(env.state.requests, 1 + 3, '재시도는 3회로 끝나야 조작을 방해하지 않는다');
});

test('한 번 성공하면 재시도 예산이 되돌아온다', async () => {
  const env = makeEnv();
  const { setupFullscreen } = await loadModule();
  const btn = makeButton();
  setupFullscreen({ button: btn });
  btn.click();
  await settle();

  // 풀림 → 복귀를 네 번 반복해도 매번 되돌아와야 한다(예산 3회에 걸리면 안 된다).
  for (let i = 0; i < 4; i++) {
    env.forceExit();
    env.pointerUp();
    await settle();
    assert.equal(env.state.active, true, `${i + 1}번째 복귀 실패`);
  }
  assert.equal(env.state.requests, 5);
});

test('홈 화면 앱으로 실행 중이면 버튼을 감춘다', async () => {
  makeEnv({ standalone: true });
  const { setupFullscreen, isStandaloneDisplay } = await loadModule();
  const btn = makeButton();
  setupFullscreen({ button: btn });
  assert.equal(isStandaloneDisplay(), true);
  assert.equal(btn.hidden, true, '껍데기가 없는 실행에서는 버튼이 의미 없다');
});

test('전체화면이 막힌 기기(아이폰)에서는 버튼을 감추지 않고 안내로 연결한다', async () => {
  makeEnv({ supported: false, userAgent: IPHONE_SAFARI_UA });
  const { setupFullscreen, isFullscreenSupported } = await loadModule();
  const btn = makeButton();
  setupFullscreen({ button: btn });
  assert.equal(isFullscreenSupported(), false);
  // 버튼을 감추면 사용자는 이유를 모른 채 끝난다 - 남겨서 안내로 잇는다.
  assert.equal(btn.hidden, false);
  assert.equal(btn.attrs['aria-label'], '전체화면으로 놀기');
  assert.equal(globalThis.document.body._children.length, 0, '누르기 전에는 안내가 뜨지 않는다');
  btn.click();
  assert.equal(globalThis.document.body._children.length, 1, '누르면 안내가 뜬다');
});

test('안내 문구는 기기·브라우저에 맞게 갈린다', async () => {
  makeEnv({ supported: false, userAgent: IPHONE_SAFARI_UA });
  const iphoneSafari = (await loadModule()).homeScreenHintText();
  assert.match(iphoneSafari.body, /아이폰/);
  assert.match(iphoneSafari.body, /공유 버튼/);

  makeEnv({ supported: false, userAgent: IPHONE_CHROME_UA });
  const iphoneChrome = (await loadModule()).homeScreenHintText();
  assert.match(iphoneChrome.body, /메뉴/);
  assert.match(iphoneChrome.body, /사파리/, '아이폰 크롬에는 더 확실한 경로를 함께 알린다');

  makeEnv({ supported: false, userAgent: 'Mozilla/5.0 (Windows NT 10.0) OldBrowser/1' });
  const other = (await loadModule()).homeScreenHintText();
  assert.match(other.body, /앱 설치|홈 화면에 추가/);
});

test('안내는 첫 방문 1회만 자동으로 뜬다', async () => {
  const env = makeEnv({ supported: false, userAgent: IPHONE_SAFARI_UA });
  const { showHomeScreenHint } = await loadModule();
  assert.equal(showHomeScreenHint({ once: true }), true);
  env.closeHint();
  assert.equal(showHomeScreenHint({ once: true }), false, '이미 본 사용자에게 반복 노출하지 않는다');
  // 버튼으로 직접 부르면 다시 볼 수 있다.
  assert.equal(showHomeScreenHint(), true);
});

test('안내가 이미 떠 있으면 겹쳐 쌓지 않는다', async () => {
  makeEnv({ supported: false, userAgent: IPHONE_SAFARI_UA });
  const { showHomeScreenHint } = await loadModule();
  showHomeScreenHint();
  assert.equal(showHomeScreenHint(), false);
  assert.equal(globalThis.document.body._children.length, 1);
});

test('홈 화면 앱으로 실행 중이면 안내하지 않는다', async () => {
  makeEnv({ standalone: true, supported: false, userAgent: IPHONE_SAFARI_UA });
  const { setupFullscreen } = await loadModule();
  const btn = makeButton();
  setupFullscreen({ button: btn });
  assert.equal(btn.hidden, true, '이미 껍데기 없이 실행 중이다');
  assert.equal(globalThis.document.body._children.length, 0);
});

test('구형 접두 API(webkit)만 있는 브라우저에서도 동작한다', async () => {
  const env = makeEnv({ supported: false });
  const root = globalThis.document.documentElement;
  // 아이패드 구형 Safari 계열: 접두사 붙은 이름만 존재하고 Promise도 돌려주지 않는다.
  root.webkitRequestFullscreen = () => {
    env.state.requests += 1;
    env.state.active = true;
    env.fire('document', 'webkitfullscreenchange');
  };
  Object.defineProperty(globalThis.document, 'webkitFullscreenElement', {
    get() { return env.state.active ? root : null; },
    configurable: true,
  });

  const { setupFullscreen } = await loadModule();
  const btn = makeButton();
  setupFullscreen({ button: btn });
  assert.equal(btn.hidden, false);
  btn.click();
  await settle();
  assert.equal(env.state.active, true);

  env.state.active = false;
  env.fire('document', 'webkitfullscreenchange');
  env.pointerUp();
  await settle();
  assert.equal(env.state.active, true, '접두 API 환경에서도 되돌아와야 한다');
});

test('전체화면에 들어가지 않은 상태에서는 조작마다 요청하지 않는다', async () => {
  const env = makeEnv();
  const { setupFullscreen } = await loadModule();
  setupFullscreen({ button: makeButton() });
  for (let i = 0; i < 5; i++) { env.pointerUp(); await settle(); }
  assert.equal(env.state.requests, 0, '켜지도 않았는데 멋대로 전체화면이 되면 안 된다');
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
