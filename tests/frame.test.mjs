// 시작 흐름 공용 프레임 회귀 테스트.
//
// 여기서 확인하는 것
//   - 되돌아가기 계단이 규격대로 한 칸씩만 움직이는가(Ⅰ권 4.2)
//   - 시작 화면에서 되돌아가면 허브로 나가는 신호가 나오는가. 게임을 닫는 지점이 거기 하나인가
//   - 겹치는 층(멈춤·결과)에서 되돌아가면 덮고 있던 화면으로 내려가는가
//   - 화면 문구가 한 곳에 고정돼 있고 쓰지 않기로 한 표현과 겹치지 않는가(Ⅰ권 5.3)
//   - 진행 저장이 localStorage를 직접 만지지 않고 공용 저장을 거치는가(클라우드 동기화 유지)
//   - 새 공용 파일이 서비스 워커 미리 담기 목록에 등록됐는가(오프라인 첫 진입)
//
// 여기서 잡히지 않는 것
//   - 실제 화면 모습과 겹침. 그것은 browser-shot으로 shared/frame/demo.html을 열어 확인한다.
//   - 브라우저 뒤로가기 연결(history). node에는 window가 없어 stack.js 순수 로직만 본다.
//
// 실행: node tests/frame.test.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const results = [];
function test(name, fn) {
  try { fn(); results.push([true, name]); }
  catch (e) { results.push([false, `${name} — ${e.message}`]); }
}
async function testAsync(name, fn) {
  try { await fn(); results.push([true, name]); }
  catch (e) { results.push([false, `${name} — ${e.message}`]); }
}

const { createStack } = await import('../shared/frame/stack.js');
const { SCREEN, TEXT, BANNED_TEXT } = await import('../shared/frame/text.js');

// ── 되돌아가기 계단 ──────────────────────────────────────

test('시작 화면이 첫 화면이다', () => {
  const s = createStack();
  assert.equal(s.current(), SCREEN.TITLE);
});

test('판 고르는 화면이 없는 게임은 시작 화면 다음이 곧 플레이다', () => {
  const s = createStack({ hasSelect: false });
  assert.deepEqual(s.order(), [SCREEN.TITLE, SCREEN.PLAY]);
  assert.equal(s.depth(SCREEN.PLAY), 2);
});

test('판 고르는 화면이 있으면 계단이 한 칸 늘어난다', () => {
  const s = createStack({ hasSelect: true });
  assert.deepEqual(s.order(), [SCREEN.TITLE, SCREEN.SELECT, SCREEN.PLAY]);
  assert.equal(s.depth(SCREEN.PLAY), 3);
});

test('플레이에서 되돌아가면 시작 화면으로 간다', () => {
  const s = createStack();
  s.go(SCREEN.PLAY);
  assert.equal(s.back(), SCREEN.TITLE);
});

test('판 고르는 화면을 쓰면 플레이에서 되돌아갈 때 그 화면으로 간다', () => {
  const s = createStack({ hasSelect: true });
  s.go(SCREEN.SELECT);
  s.go(SCREEN.PLAY);
  assert.equal(s.back(), SCREEN.SELECT);
  assert.equal(s.back(), SCREEN.TITLE);
});

test('시작 화면에서 되돌아가면 허브로 나간다(null)', () => {
  const s = createStack();
  assert.equal(s.peekBack(), null);
  assert.equal(s.back(), null);
  assert.equal(s.current(), SCREEN.TITLE, '나가지 못했을 때 화면이 흔들리면 안 된다');
});

test('플레이에서 허브로 곧장 나가는 길이 없다', () => {
  const s = createStack();
  s.go(SCREEN.PLAY);
  // 한 번에 null(허브)이 나오면 진행을 잃는 사고가 생긴다. 반드시 시작 화면을 거쳐야 한다.
  assert.notEqual(s.peekBack(), null);
});

test('잠깐 멈춤은 덮고 있던 화면을 기억한다', () => {
  const s = createStack();
  s.go(SCREEN.PLAY);
  s.go(SCREEN.PAUSE);
  assert.equal(s.covered(), SCREEN.PLAY);
  assert.equal(s.back(), SCREEN.PLAY);
  assert.equal(s.covered(), null);
});

test('결과에서 되돌아가는 것은 그만하기와 같아 시작 화면으로 간다', () => {
  const s = createStack();
  s.go(SCREEN.PLAY);
  s.go(SCREEN.RESULT);
  assert.equal(s.back(), SCREEN.TITLE);
});

test('알 수 없는 화면 이름은 거부한다', () => {
  const s = createStack();
  assert.throws(() => s.go('없는화면'));
});

// ── 화면 문구 ────────────────────────────────────────────

test('고정 문구가 모두 채워져 있다', () => {
  ['start', 'resume', 'continue', 'retry', 'quit', 'settings'].forEach((k) => {
    assert.ok(TEXT[k] && TEXT[k].length > 0, `${k} 문구가 비어 있다`);
  });
});

test('고정 문구가 쓰지 않기로 한 표현과 겹치지 않는다', () => {
  Object.entries(BANNED_TEXT).forEach(([k, banned]) => {
    assert.ok(!banned.includes(TEXT[k]), `${k}에 쓰지 않기로 한 표현이 들어갔다: ${TEXT[k]}`);
  });
});

test('기획서 5.3 표에 적힌 문구와 코드가 같다', () => {
  const doc = read('standards/html-game/plans/doc/screen-frame.html');
  // 표의 <strong> 칸이 곧 고정 문구다. 문서를 고치고 코드를 안 고치는 것을 막는다.
  ['start', 'resume', 'continue', 'retry', 'quit', 'settings'].forEach((k) => {
    assert.ok(doc.includes(`<strong>${TEXT[k]}</strong>`), `기획서 5.3에 "${TEXT[k]}"가 없다`);
  });
});

// ── 진행 저장 ────────────────────────────────────────────

// localStorage가 없는 node에서 저장 계층을 시험하기 위한 최소 스텁.
function installStorageStub() {
  const map = new Map();
  globalThis.localStorage = {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
  return map;
}

await testAsync('진행 저장이 공용 저장(gg.<게임>.) 경로를 그대로 쓴다', async () => {
  const map = installStorageStub();
  const { createSave } = await import('../shared/frame/save.js');
  const save = createSave('frametest');
  save.saveResume({ stage: 3 }, '3구역');
  const keys = [...map.keys()].filter((k) => k.startsWith('gg.frametest.'));
  assert.ok(keys.includes('gg.frametest.resume'), '이어서 하기가 공용 네임스페이스에 저장되지 않았다');
});

await testAsync('이어서 하기는 저장하면 생기고 지우면 사라진다', async () => {
  installStorageStub();
  const { createSave } = await import('../shared/frame/save.js');
  const save = createSave('frametest2');
  assert.equal(save.hasResume(), false);
  save.saveResume({ stage: 1 }, '1구역');
  assert.equal(save.hasResume(), true);
  assert.equal(save.readResume().detail, '1구역');
  save.clearResume();
  assert.equal(save.hasResume(), false);
});

await testAsync('기록은 클수록 좋은 것과 작을수록 좋은 것을 나눠 판정한다', async () => {
  installStorageStub();
  const { createSave } = await import('../shared/frame/save.js');
  const save = createSave('frametest3');
  assert.equal(save.saveBest('marathon', 100), true, '첫 기록은 항상 새 기록이다');
  assert.equal(save.saveBest('marathon', 90), false);
  assert.equal(save.saveBest('marathon', 120), true);
  assert.equal(save.readBest('marathon'), 120);
  // 시간처럼 작을수록 좋은 기록
  assert.equal(save.saveBest('sprint', 120, { higherIsBetter: false }), true);
  assert.equal(save.saveBest('sprint', 90, { higherIsBetter: false }), true);
  assert.equal(save.saveBest('sprint', 130, { higherIsBetter: false }), false);
  assert.equal(save.readBest('sprint'), 90);
});

await testAsync('음소거는 진행과 섞이지 않고 따로 저장된다', async () => {
  installStorageStub();
  const { createSave, RESUME_KEY, MUTED_KEY } = await import('../shared/frame/save.js');
  assert.notEqual(RESUME_KEY, MUTED_KEY);
  const save = createSave('frametest4');
  save.saveMuted(true);
  assert.equal(save.readMuted(), true);
  assert.equal(save.hasResume(), false, '음소거를 켰다고 이어서 할 진행이 생기면 안 된다');
});

// ── 정적 규칙 ────────────────────────────────────────────

test('공용 부품 파일이 모두 있다', () => {
  ['text.js', 'stack.js', 'screens.js', 'topbar.js', 'titlescreen.js', 'cards.js', 'audio.js', 'save.js', 'index.js', 'frame.css']
    .forEach((f) => assert.ok(read(`shared/frame/${f}`).length > 0, `shared/frame/${f} 없음`));
});

test('저장 부품이 localStorage를 직접 만지지 않는다', () => {
  const src = read('shared/frame/save.js');
  assert.ok(src.includes("from '../storage.js'"), '공용 저장을 거치지 않으면 클라우드 동기화가 끊긴다');
  assert.ok(!/localStorage\s*\./.test(src), 'localStorage를 직접 쓰고 있다');
});

test('화면 골격이 숨김 토글이 아니라 화면 이름으로 표시를 가른다', () => {
  const src = read('shared/frame/screens.js');
  assert.ok(src.includes("setAttribute('data-screen'"), '현재 화면 이름을 한 곳에 적지 않는다');
  assert.ok(!/\.hidden\s*=\s*(true|false)/.test(src), '숨김 속성을 켜고 끄면 두 화면이 겹쳐 보이는 사고가 되살아난다');
});

test('상단 띠 버튼 순서가 규격 순서로 고정돼 있다', () => {
  const src = read('shared/frame/topbar.js');
  const m = src.match(/const ORDER = \[([^\]]+)\]/);
  assert.ok(m, '버튼 순서표가 없다');
  const order = m[1].split(',').map((s) => s.trim().replace(/['"]/g, ''));
  assert.deepEqual(order, ['settings', 'sound', 'pause']);
});

test('시작 화면 조작단의 아래 여백을 공용 자산이 관리한다', () => {
  const css = read('shared/frame/frame.css');
  assert.ok(/\.gg-dock\s*\{[^}]*env\(safe-area-inset-bottom/s.test(css),
    '맨 아래 버튼과 화면 끝 사이 여백 규칙이 없다(Ⅰ권 5.5)');
  assert.ok(/\.gg-frame\s*\{[^}]*overflow:\s*hidden/s.test(css),
    '세로 스크롤을 막지 않으면 규격 위반이다');
});

test('새 공용 파일이 서비스 워커 미리 담기 목록에 있다', () => {
  const sw = read('service-worker.js');
  ['shared/frame/index.js', 'shared/frame/frame.css', 'shared/frame/stack.js', 'shared/frame/screens.js',
   'shared/frame/topbar.js', 'shared/frame/titlescreen.js', 'shared/frame/cards.js',
   'shared/frame/audio.js', 'shared/frame/save.js', 'shared/frame/text.js']
    .forEach((f) => assert.ok(sw.includes(f), `${f}가 PRECACHE에 없다(오프라인 첫 진입 실패)`));
});

// ── 3단계(나머지 넷 적용)에서 드러난 규격 항목 ───────────

test('같은 이름으로 화면을 다시 등록하면 앞의 빈 자리 이름표를 뗀다', () => {
  const src = read('shared/frame/screens.js');
  assert.ok(/querySelectorAll\(`\[\$\{ATTR_SCREEN\}="\$\{name\}"\]`\)/.test(src),
    '프레임이 미리 만든 빈 자리가 남으면 게임 화면과 높이를 반씩 나눠 갖는다(비행 슈팅 실측 사고)');
});

test('켜고 끄는 줄(toggles)이 고르는 줄(options)과 따로 있다', () => {
  const src = read('shared/frame/titlescreen.js');
  assert.ok(/toggles\s*=\s*\[\]/.test(src), '켜고 끄는 줄이 없다(규격 4.8-16)');
  assert.ok(/data-gg-toggle/.test(src), '켜고 끄는 버튼 표식이 없다');
  assert.ok(/gg-seg-item/.test(src), '고르는 줄이 사라졌다 - 둘은 서로 다른 자리다');
  const css = read('shared/frame/frame.css');
  assert.ok(/\.gg-btn-ghost\.is-on/.test(css), '켜진 상태를 눈으로 알 수 있는 규칙이 없다');
});

test('공용 프레임이 다섯 게임 모두에 연결돼 있다', () => {
  const entries = {
    tetris: 'games/tetris/game.js',
    sudoku: 'games/sudoku/game.js',
    nonogram: 'games/nonogram/src/main.js',
    rushhour: 'games/rushhour/src/main.js',
    flightshooting: 'games/flightshooting/src/main.js',
  };
  for (const [id, file] of Object.entries(entries)) {
    const src = read(file);
    assert.ok(/createGameFrame/.test(src), `${id}가 공용 프레임을 쓰지 않는다(규격 4.8-10 3단계)`);
    assert.ok(/shared\/frame\/index\.js/.test(src), `${id}의 공용 프레임 경로가 없다`);
  }
});

test('다섯 게임이 각자 소리 그릇을 다시 만들지 않는다', () => {
  // 그릇(오디오 열기·음소거·절전·재생)은 공용 하나뿐이어야 한다(규격 4.8-9).
  ['games/tetris/sound.js', 'games/nonogram/src/audio/sound.js',
   'games/rushhour/src/audio/sound.js', 'games/flightshooting/src/audio/sound.js']
    .forEach((f) => {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');
      assert.ok(!/export function play\b/.test(src), `${f}에 자기 재생 함수가 남아 있다`);
      assert.ok(!/export function setMuted\b/.test(src), `${f}에 자기 음소거 함수가 남아 있다`);
      assert.ok(/export const SOUNDS/.test(src), `${f}가 음색표를 내보내지 않는다`);
    });
});

test('공용 프레임이 모든 게임 화면의 허브 이동 버튼을 만든다', () => {
  const frame = read('shared/frame/index.js');
  assert.match(frame, /className = 'gg-hub-exit'/, '공용 허브 버튼 클래스가 없다');
  assert.match(frame, /hubExit\.href = hubHref/, '공용 허브 버튼의 이동 경로가 없다');
});

// ── 결과 ─────────────────────────────────────────────────

let pass = 0;
results.forEach(([ok, name]) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (ok) pass++;
});
const fail = results.length - pass;
console.log(fail === 0 ? `\nPASS — 통과 ${pass} / 실패 0` : `\nFAIL — 통과 ${pass} / 실패 ${fail}`);
process.exit(fail === 0 ? 0 : 1);
