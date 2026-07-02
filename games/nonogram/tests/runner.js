// 외부 라이브러리 없는 미니 테스트 러너 + 케이스.
// tests/test.html에서 로드하면 전체 자동 실행, 결과를 화면과 콘솔에 출력한다.
// core 모듈이 생기면 여기 케이스를 함께 추가한다 (핵심 로직 테스트 필수).

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || ''} expected=${b} got=${a}`); }

// --- 셋업 스모크 ---

test('러너가 동작한다', () => {
  assert(true);
  eq(1 + 1, 2);
});

// --- 실행 ---

export function runAll() {
  const results = [];
  for (const t of tests) {
    try { t.fn(); results.push({ name: t.name, ok: true }); }
    catch (e) { results.push({ name: t.name, ok: false, error: e.message }); }
  }
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  const root = document.getElementById('out');
  if (root) {
    root.innerHTML = `<h2 id="summary" class="${failed ? 'fail' : 'pass'}">${failed ? 'FAIL' : 'PASS'} — ${passed}/${results.length}</h2>` +
      results.map((r) =>
        `<div class="row ${r.ok ? 'pass' : 'fail'}">${r.ok ? '✓' : '✗'} ${r.name}${r.error ? ` — ${r.error}` : ''}</div>`,
      ).join('');
  }
  for (const r of results) {
    if (!r.ok) console.error(`FAIL: ${r.name} — ${r.error}`);
  }
  console.log(`[nonogram tests] ${failed ? 'FAIL' : 'PASS'} ${passed}/${results.length}`);
  return { passed, failed, total: results.length };
}
