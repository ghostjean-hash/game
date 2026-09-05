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
  ['text.js', 'stack.js', 'screens.js', 'topbar.js', 'titlescreen.js', 'cards.js', 'audio.js', 'save.js',
   'overlay.js', 'settings.js', 'index.js', 'frame.css']
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

test('공용 프레임이 숨은 상단 띠를 다시 만들지 않는다', () => {
  const src = read('shared/frame/index.js');
  assert.ok(!/mountTopbar\s*\(/.test(src), '상단 띠를 다시 조립하면 게임 HUD와 중복된다');
  assert.ok(!/buttons\s*=\s*\[/.test(src), '상단 띠 전용 버튼 옵션이 남아 있다');
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
   'shared/frame/audio.js', 'shared/frame/save.js', 'shared/frame/text.js',
   'shared/frame/overlay.js', 'shared/frame/settings.js', 'shared/hub.css']
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
    mines: 'games/mines/src/main.js',
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

test('공용 허브 복귀는 게임 홈 화면 안의 <- 하나로만 만든다', () => {
  const frame = read('shared/frame/index.js');
  const css = read('shared/frame/frame.css');
  assert.match(frame, /export function mountHubBack/, '홈 화면 허브 복귀 조립 함수가 없다');
  assert.match(frame, /element\.className = 'gg-title-back'/, '홈 화면 버튼 클래스가 없다');
  assert.match(frame, /element\.textContent = '<-'/, '허브 복귀 문구가 <-로 통일되지 않았다');
  assert.match(frame, /parent: titleScreen\.el/, '공용 허브 복귀가 게임 홈 화면에 붙지 않는다');
  assert.ok(!/gg-hub-exit/.test(frame + css), '세부 화면용 전역 허브 버튼이 남아 있다');
  assert.match(frame, /navigate: \{ back: \(\) => screens\.back\(\) \}/, '공용 API에 세부 화면 허브 나가기가 남아 있다');
});

test('등록 게임은 공용 홈 화면 복귀 외의 직접 URL 이동을 만들지 않는다', () => {
  const files = [
    'games/tetris/game.js', 'games/sudoku/game.js', 'games/nonogram/src/main.js',
    'games/rushhour/src/main.js', 'games/flightshooting/src/main.js',
    'games/mines/src/main.js', 'games/fruit-farm/src/main.js',
  ];
  files.forEach((file) => assert.ok(!/(?:window\.)?location\.(?:href|assign|replace)\s*[=(]/.test(read(file)), `${file}에 직접 허브 이동이 남아 있다`));
  assert.match(read('games/fruit-farm/src/main.js'), /mountHubBack/, '과일 농장이 공용 홈 화면 복귀 부품을 쓰지 않는다');
});

// ── 공용 부품과 배치 책임(Ⅰ권 11장 / 표준 4.8 규칙 19·20) ───

test('환경설정 그릇이 소리 항목을 기본으로 넣는다', () => {
  const src = read('shared/frame/settings.js');
  assert.match(src, /id: 'sound'/, '소리 항목이 기본으로 들어 있지 않다');
  assert.match(src, /audio\.setMuted/, '소리 항목이 공용 소리 그릇을 켜고 끄지 않는다');
  assert.ok(!/localStorage\s*[.[]/.test(src), '저장을 직접 만지면 클라우드 동기화 신호가 끊긴다');
  assert.match(read('shared/frame/index.js'), /save\.saveMuted\(m\)/, '음소거가 공용 저장으로 남지 않는다');
});

test('환경설정을 공용이 모든 게임 시작 화면에 넣는다', () => {
  const src = read('shared/frame/index.js');
  assert.match(src, /extraList\.push\(\{ id: SETTINGS_ID/, '게임이 적지 않으면 환경설정이 시작 화면에 안 뜬다');
  assert.match(src, /hasSettingsExtra/, '게임이 이미 적어 둔 환경설정과 중복될 수 있다');
});

test('덮는 카드가 열려 있으면 되돌아가기가 화면을 옮기지 않는다', () => {
  const ov = read('shared/frame/overlay.js');
  // 카드가 열릴 때 자기 자리를 쌓고 닫힐 때 그 자리를 소모한다. 자리를 안 쌓으면 시작 화면에서
  // 뒤로가기가 문서를 통째로 떠나 카드가 닫히는 대신 게임에서 나가진다(1회차 검사 적발).
  assert.match(ov, /history\.pushState\(\{ ggOverlay: true \}/, '카드가 되돌아갈 자리를 쌓지 않는다');
  assert.match(ov, /window\.addEventListener\('popstate'/, '카드가 기기 뒤로가기를 직접 받지 않는다');
  assert.match(ov, /stopImmediatePropagation/, '화면 골격이 같은 뒤로가기를 또 받아 한 칸 물러난다');
  const frame = read('shared/frame/index.js');
  // 등록 순서가 곧 처리 순서라, 카드 그릇이 화면 골격보다 먼저 만들어져야 뒤로가기를 먼저 받는다.
  assert.ok(frame.indexOf('createOverlayHost({ parent: root })') < frame.indexOf('createScreens({'),
    '덮는 카드가 화면 골격보다 늦게 만들어져 뒤로가기를 먼저 받지 못한다');
  assert.match(frame, /overlay\.hasOpen\(\) \? overlay\.requestCloseTop\(\)/, '조립이 카드 닫기를 되돌아가기에 물리지 않았다');
});

test('알림 쪽지와 덮는 카드가 공용 한 곳에 있다', () => {
  const src = read('shared/frame/overlay.js');
  assert.match(src, /export function createOverlayHost/, '덮는 카드 그릇이 없다');
  assert.match(src, /function toast\(/, '알림 쪽지가 공용에 없다');
  assert.match(read('shared/frame/frame.css'), /\.gg-toast/, '알림 쪽지 스타일이 공용에 없다');
});

test('강조 버튼 글자색이 공용 토큰에 있다', () => {
  assert.match(read('shared/tokens.css'), /--accent-fg:/, '게임마다 따로 선언하게 된다(표준 4.8 규칙 15)');
});

test('러시아워가 잃었던 소리·되돌아가기·환경설정을 공용 부품으로 되돌렸다', () => {
  const html = read('games/rushhour/index.html');
  const js = read('games/rushhour/src/main.js');
  ['btn-back', 'btn-mute', 'btn-play-settings'].forEach((id) => {
    assert.ok(html.includes(`id="${id}"`), `놀이 중 ${id}가 없다`);
  });
  assert.match(html, /class="gg-ic"/, '자기 아이콘 버튼을 새로 만들었다(공용 부품을 써야 한다)');
  assert.match(js, /frame\.audio\.setMuted/, '소리를 끌 수 없는 상태가 되돌아왔다');
  assert.match(js, /frame\.settings\.open\(\)/, '놀이 중 환경설정을 열 길이 없다');
  assert.ok(!/공용 상단 띠가 갖는다/.test(html + js), '폐기된 띠에 기능을 위임하는 서술이 남아 있다');
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
