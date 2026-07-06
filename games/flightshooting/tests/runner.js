// 외부 라이브러리 없는 최소 테스트 러너. tests/test.html이 로드해 core 순수 함수를 검증한다.
const results = [];

export function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, msg: e.message }); }
}

export function eq(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

export function ok(cond, msg) {
  if (!cond) throw new Error(msg || 'expected truthy');
}

export function report() {
  const pass = results.filter((r) => r.ok).length;
  const total = results.length;
  const lines = results.map((r) => (r.ok ? `PASS  ${r.name}` : `FAIL  ${r.name}\n      ${r.msg}`));
  const summary = `${pass}/${total} PASS` + (pass === total ? '' : `  (${total - pass} FAIL)`);
  const out = document.getElementById('out');
  if (out) out.textContent = [summary, '', ...lines].join('\n');
  if (typeof console !== 'undefined') console.log(summary);
  return { pass, total };
}
