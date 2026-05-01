// minimal test runner core. no external deps.
// suite 파일들이 본 모듈을 import. tests/runner.js는 entrypoint (등록 + done() 호출).
// SSOT: docs/04_conventions.md 3장.

let resultsEl = null;
let passed = 0;
let failed = 0;

function getResults() {
  if (resultsEl === null) resultsEl = document.getElementById('results');
  return resultsEl;
}

function append(html) {
  const r = getResults();
  if (!r) return;
  r.insertAdjacentHTML('beforeend', html);
}

function escape(text) {
  return String(text).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
}

export function suite(name, fn) {
  append(`<div class="suite">${escape(name)}</div>`);
  fn();
}

export function test(name, fn) {
  try {
    fn();
    passed += 1;
    append(`<div class="case pass">PASS - ${escape(name)}</div>`);
  } catch (err) {
    failed += 1;
    append(`<div class="case fail">FAIL - ${escape(name)}: ${escape(err.message)}</div>`);
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
  append(`<div class="summary">총 ${passed + failed}개 / 통과 ${passed} / 실패 ${failed}</div>`);
}
