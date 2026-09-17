// 외부 라이브러리 없는 테스트 하네스. 브라우저와 node 양쪽에서 같게 돈다.

let current = '(suite 없음)';
const failures = [];
let passed = 0;

const log = (line) => {
  if (typeof document !== 'undefined') {
    const el = document.getElementById('out');
    if (el) { el.textContent += `${line}\n`; return; }
  }
  console.log(line);
};

export function suite(name) {
  current = name;
  log(`\n■ ${name}`);
}

export function test(name, fn) {
  try {
    fn();
    passed += 1;
    log(`  ok   ${name}`);
  } catch (err) {
    failures.push({ suite: current, name, message: err && err.message ? err.message : String(err) });
    log(`  FAIL ${name}`);
    log(`       ${err && err.message ? err.message : err}`);
  }
}

function show(v) {
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

export function assert(cond, message) {
  if (!cond) throw new Error(message || '참이어야 하는데 거짓');
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message ? message + ' - ' : ''}${show(expected)} 를 기대했는데 ${show(actual)}`);
  }
}

export function assertDeep(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message ? message + ' - ' : ''}${b} 를 기대했는데 ${a}`);
}

export function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message ? message + ' - ' : ''}${expected} ± ${tolerance} 를 기대했는데 ${actual}`);
  }
}

export function assertNull(actual, message) {
  if (actual !== null) throw new Error(`${message ? message + ' - ' : ''}null 을 기대했는데 ${show(actual)}`);
}

/** 모든 suite 를 돌린 뒤 부른다. 실패가 있으면 false. */
export function done() {
  log('');
  log('─'.repeat(52));
  if (failures.length === 0) {
    log(`통과 ${passed}건. 실패 없음.`);
    return true;
  }
  log(`통과 ${passed}건, 실패 ${failures.length}건`);
  for (const f of failures) log(`  · [${f.suite}] ${f.name} - ${f.message}`);
  return false;
}
