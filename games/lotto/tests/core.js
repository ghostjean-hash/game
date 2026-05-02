// minimal test runner core. no external deps.
// suite 파일들이 본 모듈을 import. tests/runner.js는 entrypoint (등록 + done() 호출).
// SSOT: docs/04_conventions.md 3장.
// S7-T1: Node CLI 호환. typeof document로 환경 감지 → 브라우저는 DOM, Node는 console.

const IS_BROWSER = typeof document !== 'undefined';
let resultsEl = null;
let passed = 0;
let failed = 0;
let currentSuite = '';

function getResults() {
  if (resultsEl === null && IS_BROWSER) resultsEl = document.getElementById('results');
  return resultsEl;
}

function appendDom(html) {
  const r = getResults();
  if (!r) return;
  r.insertAdjacentHTML('beforeend', html);
}

function escape(text) {
  return String(text).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
}

export function suite(name, fn) {
  currentSuite = name;
  if (IS_BROWSER) {
    appendDom(`<div class="suite">${escape(name)}</div>`);
  } else {
    console.log(`\n  [${name}]`);
  }
  fn();
}

export function test(name, fn) {
  try {
    fn();
    passed += 1;
    if (IS_BROWSER) {
      appendDom(`<div class="case pass">PASS - ${escape(name)}</div>`);
    } else {
      console.log(`    PASS  ${name}`);
    }
  } catch (err) {
    failed += 1;
    if (IS_BROWSER) {
      appendDom(`<div class="case fail">FAIL - ${escape(name)}: ${escape(err.message)}</div>`);
    } else {
      console.log(`    FAIL  ${name}\n          ${err.message}`);
    }
  }
}

export function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertDeepEqual(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${message} expected ${b}, got ${a}`);
  }
}

export function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(`${message} expected truthy, got ${JSON.stringify(value)}`);
  }
}

export function done() {
  if (IS_BROWSER) {
    appendDom(`<div class="summary">총 ${passed + failed}개 / 통과 ${passed} / 실패 ${failed}</div>`);
  } else {
    console.log(`\n  TOTAL ${passed + failed} / PASS ${passed} / FAIL ${failed}`);
    if (failed > 0) {
      console.log('\n  ❌ Tests failed.');
      // Node 환경에서만 exit code 설정. 브라우저는 영향 없음.
      if (typeof process !== 'undefined' && process.exit) process.exit(1);
    } else {
      console.log('\n  ✅ All tests passed.');
    }
  }
}
