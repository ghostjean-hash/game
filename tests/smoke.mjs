// 게임 허브 정적 스모크 - shared 공용 골격 회귀 방지 (외부 의존 0, 순수 node).
//
// 목적: shared/mobile-shell.css·base.css를 바꿀 때 어떤 게임이 조용히 깨지는지 커밋 전에 잡는다.
// 방식: 각 게임 index.html이 공용 골격을 올바로 링크하는지, viewport 규칙을 지키는지,
//       공용 골격 파일 자체가 핵심 모바일 규칙을 보존하는지 정적으로 검사한다.
// 한계: 런타임 화면(픽셀·레이아웃)은 보지 않는다. 그건 shared 변경 시 browser-shot으로 별도 확인.
// 실행: node tests/smoke.mjs   (통과 시 exit 0, 실패 시 exit 1)

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abs = (p) => path.join(ROOT, p);
const read = (p) => readFileSync(abs(p), 'utf8');
const has = (p) => existsSync(abs(p));

const fails = [];
const warns = [];
const oks = [];

// --- 1. 공용 골격 파일 무결성 ---
if (!has('shared/mobile-shell.css')) {
  fails.push('shared/mobile-shell.css 없음 (무테마 골격 파일 소실)');
} else {
  const shell = read('shared/mobile-shell.css');
  const rules = [
    ['페이지 고정(overflow:hidden)', /overflow:\s*hidden/],
    ['safe-area 패딩', /env\(safe-area-inset/],
    ['터치 제어(touch-action)', /touch-action/],
    ['동적 뷰포트(100dvh)', /100dvh/],
  ];
  for (const [name, re] of rules) {
    if (!re.test(shell)) fails.push(`mobile-shell.css에 ${name} 규칙이 없음`);
  }
  oks.push('shared/mobile-shell.css 핵심 모바일 규칙 4종 보존');
}

if (!has('shared/base.css')) {
  fails.push('shared/base.css 없음');
} else {
  const base = read('shared/base.css');
  if (!/@import\s+['"]\.\/mobile-shell\.css['"]/.test(base)) {
    fails.push('base.css가 mobile-shell.css를 @import 하지 않음 → base.css 링크 게임들이 골격을 잃음');
  } else {
    oks.push('base.css → mobile-shell.css @import 연결 유지');
  }
}

// --- 2. 게임·앱별 골격 링크 + viewport 규칙 ---
// lotto가 apps/로 옮겨간 뒤(2026-07-29) 검사에서 빠지지 않도록 두 등록부를 모두 순회한다.
const entries = [
  ...JSON.parse(read('games/_registry.json')).games,
  ...JSON.parse(read('apps/_registry.json')).apps,
];
for (const g of entries) {
  const idx = `${g.path}index.html`;
  if (!has(idx)) { fails.push(`${g.id}: index.html 없음`); continue; }
  const html = read(idx);
  const linksBase = /shared\/base\.css/.test(html);
  const linksShell = /shared\/mobile-shell\.css/.test(html);
  const hasViewport = /<meta[^>]+name=["']viewport["']/.test(html);

  if (linksBase || linksShell) {
    const via = linksShell ? 'mobile-shell 직접' : 'base.css(@import)';
    if (!hasViewport) {
      fails.push(`${g.id}: 공용 골격(${via})을 링크하지만 viewport meta가 없음`);
    } else {
      oks.push(`${g.id}: 골격 링크 OK (${via}) + viewport meta`);
    }
  } else {
    warns.push(`${g.id}: base.css/mobile-shell.css 링크 없음 (자체 스타일 게임이면 정상, 추천기 lotto 등)`);
  }
}

// --- 3. 클라우드 저장 규약 (설계 5.3.8 / 5.3.9 / 4.1) ---
if (!has('service-worker.js')) {
  fails.push('service-worker.js 없음');
} else {
  const sw = read('service-worker.js');
  // 이 분기가 사라지면 서비스워커가 구글 로그인·드라이브 통신까지 가로채 로그인이 깨진다.
  if (!/url\.origin\s*!==\s*self\.location\.origin/.test(sw)) {
    fails.push('service-worker.js가 외부 출처 요청을 통과시키지 않음 → 구글 로그인이 깨진다');
  } else {
    oks.push('service-worker.js 외부 출처 통과 분기 유지 (구글 로그인 보호)');
  }
}

if (has('shared/cloud/config.js')) {
  // 권한을 넓히면 구글 심사 등급이 restricted로 올라가 매년 외부 보안 감사가 붙는다(설계 2.5).
  const cloudFiles = ['config.js', 'merge.js', 'local.js', 'remote.js', 'auth.js', 'sync.js', 'ui.js', 'boot.js']
    .map((f) => `shared/cloud/${f}`)
    .filter(has);
  const scopeRe = /auth\/drive[a-z.]*/g;
  const found = new Set();
  for (const f of cloudFiles) {
    for (const m of read(f).match(scopeRe) || []) found.add(m);
  }
  const allowed = 'auth/drive.appdata';
  const extra = [...found].filter((s) => s !== allowed);
  if (extra.length) {
    fails.push(`허용되지 않은 드라이브 권한 발견: ${extra.join(', ')} (설계 2.5 위반, drive.appdata만 허용)`);
  } else {
    oks.push(`클라우드 권한 범위 ${found.size ? '= drive.appdata 하나' : '미선언'}`);
  }

  // 순수 로직 층에는 브라우저·통신 API가 등장하지 않아야 자동 검증 100%가 유지된다(설계 4.1).
  if (has('shared/cloud/merge.js')) {
    // 주석은 검사 대상이 아니다(규율을 설명하는 문장 자체가 걸리면 안 된다).
    const merge = read('shared/cloud/merge.js')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '');
    const banned = ['window', 'document', 'fetch(', 'localStorage'].filter((t) => merge.includes(t));
    if (banned.length) {
      fails.push(`merge.js에 브라우저 의존이 섞임: ${banned.join(', ')} (순수 로직 층 규율 위반)`);
    } else {
      oks.push('merge.js 순수 로직 유지 (브라우저·통신 의존 0)');
    }
  }

  // 게임 화면에서도 도는 통로에는 로그인 창을 띄우는 재발급이 없어야 한다(설계 4.4.5).
  // 이 규정이 무너지면 자동 저장이 돌다가 게임 도중에 창이 뜬다(2026-07-31 수정 회귀 방지).
  for (const f of ['shared/cloud/remote.js', 'shared/cloud/auto.js'].filter(has)) {
    const src = read(f)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '');
    if (/silent\s*:\s*false/.test(src)) {
      fails.push(`${f}에 로그인 창을 띄우는 재발급이 섞임 (설계 4.4.5 위반)`);
    } else {
      oks.push(`${f.replace('shared/cloud/', '')} 로그인 창 호출 0 (게임 중 묻지 않음)`);
    }
  }
}

// --- 4. 전체화면 유지 규약 (2026-07-31) ---
// 아이패드에서 조작 중 전체화면이 풀리던 문제의 처방 둘을 코드로 고정한다.
if (!has('shared/fullscreen.js')) {
  fails.push('shared/fullscreen.js 없음 → 전체화면 자동 복귀가 사라진다');
} else {
  const fs = read('shared/fullscreen.js');
  const rules = [
    ['홈 화면 앱 판별(display-mode)', /display-mode/],
    ['iOS 홈 화면 앱 판별(navigator.standalone)', /navigator\.standalone/],
    ['구형 접두 API 대응(webkitRequestFullscreen)', /webkitRequestFullscreen/],
    ['해제 감지(fullscreenchange)', /fullscreenchange/],
    ['조작 순간 복귀(pointerup)', /pointerup/],
    // 아이폰은 전체화면 자체가 막혀 있다 - 버튼을 조용히 감추면 사용자가 이유를 알 수 없다.
    ['막힌 기기용 홈 화면 추가 안내(showHomeScreenHint)', /export function showHomeScreenHint/],
    ['기기별 안내 문구(homeScreenHintText)', /export function homeScreenHintText/],
  ];
  for (const [name, re] of rules) {
    if (!re.test(fs)) fails.push(`shared/fullscreen.js에 ${name} 처리가 없음`);
  }
  if (!fails.some((f) => f.startsWith('shared/fullscreen.js'))) {
    oks.push('shared/fullscreen.js 전체화면 유지 규칙 5종 보존');
  }
}

// 게임이 옛 인라인 구현으로 되돌아가면 자동 복귀가 조용히 사라진다 - 공용 모듈 사용을 강제한다.
const fsGames = [
  ['tetris', 'games/tetris/game.js'],
  ['sudoku', 'games/sudoku/game.js'],
  ['rushhour', 'games/rushhour/src/main.js'],
  ['nonogram', 'games/nonogram/src/main.js'],
  ['flightshooting', 'games/flightshooting/src/main.js'],
];
for (const [id, file] of fsGames) {
  if (!has(file)) { fails.push(`${id}: ${file} 없음`); continue; }
  const src = read(file);
  if (!/from ['"][^'"]*shared\/fullscreen\.js['"]/.test(src)) {
    fails.push(`${id}: shared/fullscreen.js를 쓰지 않음 (전체화면이 풀려도 복귀하지 않는다)`);
  } else if (/documentElement\.requestFullscreen/.test(src)) {
    fails.push(`${id}: 옛 인라인 전체화면 구현이 남아 있음 (공용 모듈과 이중 배선)`);
  } else {
    oks.push(`${id}: 전체화면 공용 모듈 사용`);
  }
}

// 허브 첫 화면이 안내를 배선하지 않으면 아이폰 사용자는 방법을 모른 채 끝난다.
if (has('index.html')) {
  const hub = read('index.html');
  if (!/showHomeScreenHint/.test(hub)) {
    fails.push('index.html이 홈 화면 추가 안내를 배선하지 않음 (아이폰에서 전체화면 방법을 알 길이 없다)');
  } else {
    oks.push('허브 첫 화면: 전체화면 막힌 기기에 홈 화면 추가 안내 배선');
  }
}

// 홈 화면 앱 설정. 이게 빠지면 게임 화면에서 홈 화면에 추가해도 브라우저 껍데기가 붙어 열린다.
for (const g of entries) {
  const idx = `${g.path}index.html`;
  const mf = `${g.path}app.webmanifest`;
  if (!has(idx)) continue;
  const html = read(idx);
  if (!/<link[^>]+rel=["']manifest["']/.test(html)) {
    fails.push(`${g.id}: index.html에 홈 화면 앱 설정(manifest) 링크가 없음`);
    continue;
  }
  if (!/apple-mobile-web-app-capable/.test(html)) {
    fails.push(`${g.id}: apple-mobile-web-app-capable 없음 (아이패드에서 껍데기 붙은 채 열린다)`);
    continue;
  }
  if (!has(mf)) { fails.push(`${g.id}: ${mf} 파일 없음`); continue; }
  let manifest;
  try {
    manifest = JSON.parse(read(mf));
  } catch (err) {
    fails.push(`${g.id}: app.webmanifest 파싱 실패 - ${err.message}`);
    continue;
  }
  if (manifest.display !== 'fullscreen') {
    fails.push(`${g.id}: app.webmanifest display가 fullscreen이 아님(${manifest.display})`);
  } else if (manifest.start_url !== './') {
    fails.push(`${g.id}: app.webmanifest start_url이 './'가 아님 - 홈 화면 아이콘이 이 화면으로 열리지 않는다`);
  } else {
    oks.push(`${g.id}: 홈 화면 앱 설정 OK (전체화면 실행 + 이 화면으로 시작)`);
  }
}

// --- 출력 ---
const line = '─'.repeat(60);
console.log(line);
for (const o of oks) console.log(`  ✓ ${o}`);
for (const w of warns) console.log(`  ! ${w}`);
for (const f of fails) console.log(`  ✗ ${f}`);
console.log(line);
if (fails.length) {
  console.log(`FAIL — ${fails.length}건 (통과 ${oks.length} / 경고 ${warns.length})`);
  process.exit(1);
} else {
  console.log(`PASS — 통과 ${oks.length} / 경고 ${warns.length} / 실패 0`);
  process.exit(0);
}
