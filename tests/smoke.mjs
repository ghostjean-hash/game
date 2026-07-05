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

// --- 2. 게임별 골격 링크 + viewport 규칙 ---
const reg = JSON.parse(read('games/_registry.json'));
for (const g of reg.games) {
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
