import { runFarmHarness } from './farmHarness.js';
const results = document.querySelector('#results'); let failed = 0;
function test(name, fn) { const line = document.createElement('p'); try { fn(); line.className = 'pass'; line.textContent = 'PASS · ' + name; } catch (error) { failed += 1; line.className = 'fail'; line.textContent = 'FAIL · ' + name + ' — ' + error.message; } results.appendChild(line); }
function ok(value, message = '조건이 거짓입니다') { if (!value) throw new Error(message); }
runFarmHarness(test, ok); document.title = failed ? 'FAIL (' + failed + ')' : 'PASS';
