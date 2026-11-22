// 모노폴리 화면 측정 도구 (기획서 0.22.2 · 0.22.5)
// 사용: node apps/monopoly-companion/tests/screen-audit.mjs audit [결과폴더] [크기목록]
//       node apps/monopoly-companion/tests/screen-audit.mjs stable - [크기목록]  (전환 단추 흔들림 · 아이콘 가운데, 0.24)
//       node apps/monopoly-companion/tests/screen-audit.mjs styles <결과.json> [크기목록]
// 전제: 개발 서버(node scripts/dev-server.mjs 8010), 시스템 Chrome, 자비스 공용 playwright-core.
// 브라우저 임시 저장소만 쓰므로 사용자 판 기록에 닿지 않는다. 일반 자동 검사(*.test.mjs)와 따로 돈다.
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(os.homedir(), '.claude', 'node_modules', '/'));
const { chromium } = require('playwright-core');

const [mode = 'audit', outArg, sizeArg] = process.argv.slice(2);
const BASE = process.env.SCREEN_URL || 'http://127.0.0.1:8010/apps/monopoly-companion/';
const KEY = 'gg.monopoly-companion.session';
const AUDIT_SIZES = '1366x950,1366x1024';
const STYLE_SIZES = '1366x950,1366x1024,1194x834,1024x768,1024x680,1024x1366,390x844';
const SIZES = (sizeArg || (mode === 'styles' ? STYLE_SIZES : mode === 'stable' ? STYLE_SIZES.split(',').slice(0,6).join(',') : AUDIT_SIZES)).split(',').map(s => s.split('x').map(Number));
const TOUCH_MIN = 48;
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', 'screen-session.json'), 'utf8'));

// 저장 상태 심기: 오토 끔, 시계 멈춤
function seed(edit) {
  const s = structuredClone(fixture);
  s.auto = [false, false]; s.runningSince = null; s.botCard = null;
  if (edit) edit(s);
  return s;
}
const firstUnowned = s => Number(Object.keys(s.board.deeds).find(i => s.board.deeds[i].owner == null && [1, 3, 6, 8, 9, 11, 13, 14, 16, 18, 19, 21, 23, 24, 26, 27, 29, 31, 32, 34, 37, 39].includes(Number(i))) ?? 39);
const ownedBy = (s, p) => Object.keys(s.board.deeds).map(Number).filter(i => s.board.deeds[i].owner === p);
const cur = s => (s.turns[0] === s.turns[1] ? s.first : 1 - s.first);
const land = pending => s => { const p = cur(s); s.board.phase = 'land'; s.board.pending = pending(s, p); s.board.players[p].pos = s.board.pending.index; };

// 장면: [이름, 심을 상태(없으면 첫 화면), 조작 목록]
const SCENES = [
  ['준비 스탠다드', null, [['click', '[data-preset="standard"]']]],
  ['준비 공식 단축 30분', null, [['click', '[data-preset="short30"]']]],
  ['준비 공식 단축 60분', null, [['click', '[data-preset="short60"]']]],
  ['준비 보너스 창', null, [['click', '[data-bonus-open="0"]']]],
  ['시작 권리증 창', null, [['click', '[data-preset="short30"]'], ['click', '[data-action="start"]']]],
  ['진행 화면', seed(), []],
  ['메뉴', seed(), [['click', '[data-action="menu"]']]],
  ['규칙 목록', seed(), [['click', '[data-action="menu"]'], ['click', '[data-action="rules"]']]],
  ['규칙 하나', seed(), [['click', '[data-action="menu"]'], ['click', '[data-action="rules"]'], ['click', '[data-rule]']]],
  ['실물과 기록 맞추기', seed(), [['click', '[data-action="menu"]'], ['click', '[data-action="correct"]']]],
  ['게임 마무리 확인', seed(), [['click', '[data-action="menu"]'], ['click', '[data-action="end"]']]],
  ['돈 마련 · 부지 관리', seed(), [['click', '[data-action="properties"]']]],
  ['부지·돈 거래', seed(), [['click', '[data-action="trade"]']]],
  ['거래 부지 많음', seed(s => { for (const i of Object.keys(s.board.deeds)) if (s.board.deeds[i].owner != null) Object.assign(s.board.deeds[i], { owner: Number(i) % 2, buildings: 0 }); }), [['click', '[data-action="trade"]']]],
  ['집 짓기 목록', seed(s => { s.turns=[0,0];s.first=0;for (const i of [1, 3, 6, 8, 9]) Object.assign(s.board.deeds[i], { owner: 0, mortgaged: false }); }), [['click', '[data-action="build"]']]],
  ['집 짓기 칸', seed(s => { s.turns=[0,0];s.first=0;for (const i of [1, 3]) Object.assign(s.board.deeds[i], { owner: 0, mortgaged: false }); s.board.players[0].cash = 2000; }), [['click', '[data-action="build"]'], ['click', '[data-build-player="0"]'], ['click', '[data-build-plan="1"]']]],
  ['파산', seed(), [['click', '[data-action="bankrupt"]']]],
  ['파산 확인', seed(), [['click', '[data-action="bankrupt"]'], ['click', '[data-bankrupt="0"]']]],
  ['파산 결과 되돌리기', seed(), [['click', '[data-action="bankrupt"]'], ['click', '[data-bankrupt="0"]'], ['click', '[data-bankrupt-confirm="0"]']]],
  ['파산 되돌린 진행', seed(), [['click', '[data-action="bankrupt"]'], ['click', '[data-bankrupt="0"]'], ['click', '[data-bankrupt-confirm="0"]'], ['click', '.result-actions [data-action="undo"]']]],
  ['돈 마련 건물 막힌 줄', seed(s => { for (const i of [1, 3]) Object.assign(s.board.deeds[i], { owner: 0, buildings: Number(i) === 1 ? 1 : 0, mortgaged: false }); }), [['click', '[data-action="properties"]'], ['click', '[data-portfolio="0"]']]],
  ['기록 맞추기 보드 선택', seed(), [['click', '[data-action="menu"]'], ['click', '[data-action="correct"]'], ['click', '[data-correct-player="1"]'], ['click', '.board-viewport [data-tile="10"]']]],
  ['보너스 선택', null, [['click', '[data-bonus-open="0"]'], ['click', '[data-bonus-set="200"]']]],
  ['감옥 칸 그림', seed(s => { s.board.players[0].pos = 10; }), []],
  ['칸 정보 도시', seed(), [['click', '[data-tile="1"]']]],
  ['칸 정보 역', seed(), [['click', '[data-tile="5"]']]],
  ['칸 정보 공공 기관', seed(), [['click', '[data-tile="12"]']]],
  ['칸 정보 출발', seed(), [['click', '[data-tile="0"]']]],
  ['칸 정보 찬스', seed(), [['click', '[data-tile="7"]']]],
  ['칸 정보 감옥', seed(), [['click', '[data-tile="10"]']]],
  ['구입 처리', seed(land((s) => { const i = firstUnowned(s); return { type: 'buy', index: i, amount: 100 }; })), []],
  ['구입 중 돈 마련', seed(land((s, p) => { const i = firstUnowned(s); s.board.players[p].cash = 10; return { type: 'buy', index: i, amount: 100 }; })), [['click', '[data-action="properties"]']]],
  ['구입 자금 마련 완료', seed(land((s, p) => { const i = firstUnowned(s); s.board.players[p].cash = 1000; return { type: 'buy', index: i, amount: 100 }; })), [['click', '[data-action="properties"]']]],
  ['빈 거래', seed(), [['click', '[data-action="trade"]'], ['click', '[data-trade-dir="1"]'], ['click', '[data-amount-key="C"]']]],
  ['경매', seed(land((s) => { const i = firstUnowned(s); return { type: 'buy', index: i, amount: 100 }; })), [['click', '[data-action="auction"]']]],
  ['임대료 처리', seed(land((s, p) => { const i = ownedBy(s, 1 - p)[0]; return { type: 'rent', index: i, from: p, to: 1 - p, amount: 50, kind: 'street', factor: 1, key: 0 }; })), []],
  // 임대료 수정 창은 여는 단추가 화면에 없어(app.js rent-adjust 동작만 남음) 장면에서 뺀다
  //['임대료 수정', seed(land((s, p) => { const i = ownedBy(s, 1 - p)[0]; return { type: 'rent', index: i, from: p, to: 1 - p, amount: 50, kind: 'street', factor: 1, key: 0 }; })), [['click', '[data-action="rent-adjust"]']]],
  ['세금 처리', seed(land(() => ({ type: 'pay', index: 4, amount: 200, to: null }))), []],
  ['카드 차례', seed(land(() => ({ type: 'card', index: 7 }))), []],
  ['카드 고르기', seed(land(() => ({ type: 'card', index: 7 }))), [['click', '[data-action="card-pick"]']]],
  ['카드 하나', seed(land(() => ({ type: 'card', index: 7 }))), [['click', '[data-action="card-pick"]'], ['click', '[data-card-id]']]],
  ['감옥 차례', seed(s => { const p = cur(s); Object.assign(s.board.players[p], { jail: true, pos: 10, attempts: 0 }); }), []],
  ['돈 부족 처리', seed(land((s, p) => { s.board.players[p].cash = 10; return { type: 'pay', index: 38, amount: 100, to: null }; })), []],
  ['결과', seed(s => { s.screen = 'result'; s.winner = 0; s.finishReason = 'bankruptcy'; }), []],
];

const measureFn = (touchMin) => {
  const vw = innerWidth, vh = innerHeight, issues = [];
  const name = el => (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') || el.tagName;
  const vis = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0; };
  const doc = document.documentElement;
  if (doc.scrollHeight > vh + 1) issues.push(`페이지 세로 넘침 ${doc.scrollHeight - vh}px`);
  if (doc.scrollWidth > vw + 1) issues.push(`페이지 가로 넘침 ${doc.scrollWidth - vw}px`);
  const dlg = [...document.querySelectorAll('dialog[open]')];
  const scope = dlg.length ? dlg[dlg.length - 1] : document.body;
  let title = '';
  if (dlg.length) {
    const d = scope, r = d.getBoundingClientRect();
    title = (d.querySelector('h2')?.textContent || '').trim();
    if (r.bottom > vh + 1 || r.top < -1) issues.push(`창이 화면 밖 위${Math.round(-r.top)} 아래${Math.round(r.bottom - vh)}px`);
    if (d.scrollHeight > d.clientHeight + 1) issues.push(`창 전체 스크롤 ${d.scrollHeight - d.clientHeight}px`);
    if (d.scrollWidth > d.clientWidth + 1) issues.push(`창 가로 넘침 ${d.scrollWidth - d.clientWidth}px`);
    const btns = [...d.querySelectorAll('button')].filter(vis);
    if (btns.length && !btns.some(b => !b.hasAttribute('data-close'))) issues.push('X 말고 누를 단추 없음');
  }
  for (const el of scope.querySelectorAll('*')) {
    if (!vis(el) || el.closest('.board-viewport')) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (r.width < 4) continue;
    const clips = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.textOverflow === 'ellipsis';
    if (clips && el.scrollWidth > el.clientWidth + 2 && el.textContent.trim() && el.children.length < 3) issues.push(`글자 잘림 ${name(el)} "${el.textContent.trim().slice(0, 18)}"`);
    // 조상 상자 오른쪽 밖으로 삐져나와 가려지는 요소
    const box = el.parentElement?.closest('dialog, .finance-list, .asset-list, section');
    if (box && el.tagName === 'BUTTON') { const b = box.getBoundingClientRect(); if (r.right > b.right + 1 || r.left < b.left - 1) issues.push(`단추가 상자 밖 ${name(el)} "${el.textContent.trim().slice(0, 15)}"`); }
    if (el.tagName === 'BUTTON' && (r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1)) {
      const sc = el.closest('.dialog-body, .asset-list'); // 목록 칸 안 스크롤은 허용
      if (!sc) issues.push(`단추가 화면 밖 ${name(el)} "${el.textContent.trim().slice(0, 15)}"`);
    }
  }
  // 금색 판매 단추가 이유를 대신하는 줄은 남은 글자도 한 줄 안에 들어가야 한다.
  for (const row of scope.querySelectorAll('.asset-row:has([data-manage="sellAll"])')) {
    if (row.querySelector('.blocked-reason')) issues.push('건물 전부 팔기 이유 중복');
    for (const el of row.querySelectorAll('button, small')) {
      const r = el.getBoundingClientRect(), bounds = row.getBoundingClientRect(), range = document.createRange();
      range.selectNodeContents(el);
      const text = range.getBoundingClientRect(), line = parseFloat(getComputedStyle(el).lineHeight);
      if (text.height > line + 1) issues.push('건물 전부 팔기 줄바꿈 ' + el.textContent.trim());
      if (text.left < r.left - 1 || text.right > r.right + 1 || r.left < bounds.left || r.right > bounds.right) issues.push('건물 전부 팔기 글자 잘림 ' + el.textContent.trim());
    }
  }
  const small = [...scope.querySelectorAll('button, select, input')].filter(vis).filter(b => { if (b.closest('.board-viewport')) return false; if (b.type === 'checkbox' || b.type === 'radio') return false; const r = b.getBoundingClientRect(); return r.height < touchMin - 0.5 || r.width < touchMin - 0.5; });
  for (const b of small.slice(0, 6)) { const r = b.getBoundingClientRect(); issues.push(`작은 단추 ${name(b)} "${(b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 10)}" ${Math.round(r.width)}x${Math.round(r.height)}`); }
  if (small.length > 6) issues.push(`작은 단추 외 ${small.length - 6}개`);
  return { title, issues: [...new Set(issues)] };
};

// 모든 요소의 적용 스타일 지문 (재작성 전후 대조용)
const styleFn = () => {
  const h = str => { let x = 2166136261; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); };
  const out = [];
  const walk = (el, p) => {
    // 속성 나열 순서는 매번 섞일 수 있어(사용자 정의 값) 이름순으로 정렬해 지문을 만든다
    const dump = c => [...c].sort().map(n => n + ':' + c.getPropertyValue(n)).join(';');
    let s = dump(getComputedStyle(el));
    for (const pseudo of ['::before', '::after']) { const c = getComputedStyle(el, pseudo); if (c.content && c.content !== 'none') s += pseudo + dump(c); }
    const r = el.getBoundingClientRect();
    out.push([p, el.tagName + '.' + (typeof el.className === 'string' ? el.className : ''), globalThis.__dumpFull && p.length < 12 ? s : h(s), [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10].join(',')]);
    [...el.children].forEach((c, i) => walk(c, p + '/' + i));
  };
  walk(document.body, 'b');
  return out;
};

const freeze = () => {
  const T = 1795264144317; const D = Date;
  // 시계·난수 고정: 앞뒤 판이 같은 화면을 그리게 한다
  globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } };
  let x = 123456789; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
};

async function runScene(browser, [w, h], [label, state, steps]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  await ctx.addInitScript(freeze);
  if (process.env.DUMP_FULL) await ctx.addInitScript(() => { globalThis.__dumpFull = true; });
  if (state) await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [KEY, JSON.stringify(state)]);
  const page = await ctx.newPage();
  const errors = [], misses = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  await page.goto(BASE); await page.waitForTimeout(500);
  const all = state ? [['click', '[data-action="resume"]'], ...steps] : steps;
  for (const [kind, sel] of all) {
    const l = page.locator(sel);
    if (!(await l.count())) { misses.push(sel); continue; }
    await l.first().click({ timeout: 2000 }).catch(e => misses.push(sel + ' ' + String(e).slice(0, 60)));
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(250);
  // 0.23: 한 번만 재생되는 열림 움직임(창 떠오름 · 주사위 면 튀김)은 끝난 상태로 잰다. 반복 글로우는 그대로 멈춰 둔다
  await page.evaluate(() => { for (const a of document.getAnimations()) if (['dialog-in', 'backdrop-in', 'die-pick'].includes(a.animationName)) a.finish(); });
  return { ctx, page, errors, misses };
}

const browser = await chromium.launch({ channel: 'chrome' });
let bad = 0;
if (mode === 'audit') {
  const out = path.resolve(outArg || path.join(os.tmpdir(), 'monopoly-audit'));
  fs.mkdirSync(out, { recursive: true });
  const report = [];
  for (const size of SIZES) for (const [k, scene] of SCENES.entries()) {
    const { ctx, page, errors, misses } = await runScene(browser, size, scene);
    const m = await page.evaluate(measureFn, TOUCH_MIN);
    const file = path.join(out, `${size.join('x')}-${String(k).padStart(2, '0')}.png`);
    await page.screenshot({ path: file });
    const issues = [...m.issues, ...misses.map(s => '못 봄: ' + s), ...errors.map(e => '오류: ' + e)];
    if (issues.length) bad++;
    report.push({ size: size.join('x'), scene: scene[0], title: m.title, issues, file });
    console.log(`[${size.join('x')}] ${scene[0]}: ${issues.length ? issues.join(' | ') : '통과'}`);
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  console.log(`끝 - 장면 ${report.length}개 중 문제 ${bad}개`);
} else if (mode === 'stable') {
  // 0.24: 전환·선택 단추를 하나씩 눌러도 다른 상자의 위치·크기가 그대로인지, 아이콘만 있는 단추의 그림이 한가운데인지 잰다
  const TOGGLES = '[aria-pressed], [role="radio"], [data-amount-key], [data-amount-add]';
  const rects = () => {
    const dlg = [...document.querySelectorAll('dialog[open]')].pop();
    const scope = dlg || document.body, out = {};
    const walk = (el, p) => {
      if (el.closest && el.closest('.board-viewport')) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width > 2 && r.height > 2) out[p] = [el.tagName + '.' + String(el.className || '').split(' ')[0] + ' "' + (el.textContent || '').trim().slice(0, 12) + '" ^' + (el.parentElement?.closest('p, li, label, button, h2, h3, small') || el.parentElement)?.textContent.trim().slice(0, 40) + ' @' + (el.closest('.asset-list > *, .finance-list > *')?.textContent.trim().slice(0, 20) || ''), Math.round(r.x * 2) / 2, Math.round(r.y * 2) / 2, Math.round(r.width * 2) / 2, Math.round(r.height * 2) / 2];
      [...el.children].forEach((c, i) => walk(c, p + '/' + c.tagName + i));
    };
    walk(scope, 's');
    return out;
  };
  const iconsOff = () => {
    const dlg = [...document.querySelectorAll('dialog[open]')].pop();
    return [...(dlg || document.body).querySelectorAll('button')].filter(b => !b.closest('.board-viewport') && b.querySelector('svg') && !b.textContent.trim() && b.getClientRects().length).map(b => {
      const a = b.getBoundingClientRect(), s = b.querySelector('svg').getBoundingClientRect();
      return [b.getAttribute('aria-label') || b.className, Math.round((s.x + s.width / 2 - a.x - a.width / 2) * 10) / 10, Math.round((s.y + s.height / 2 - a.y - a.height / 2) * 10) / 10];
    }).filter(([, dx, dy]) => Math.abs(dx) > 0.6 || Math.abs(dy) > 0.6);
  };
  const seen = new Set();
  for (const size of SIZES) for (const scene of SCENES) {
    const { ctx, page } = await runScene(browser, size, scene);
    const issues = [];
    for (const [n, dx, dy] of await page.evaluate(iconsOff)) issues.push(`아이콘 치우침 "${n}" 가로${dx} 세로${dy}`);
    const count = await page.evaluate(sel => { const dlg = [...document.querySelectorAll('dialog[open]')].pop(); return [...(dlg || document.body).querySelectorAll(sel)].filter(b => !b.closest('.board-viewport') && !b.closest('[inert]') && getComputedStyle(b).visibility !== 'hidden' && !b.disabled && b.getClientRects().length).length; }, TOGGLES);
    for (let i = 0; i < Math.min(count, 14); i++) {
      const before = await page.evaluate(rects);
      const label = await page.evaluate(([sel, i]) => { const dlg = [...document.querySelectorAll('dialog[open]')].pop(); const b = [...(dlg || document.body).querySelectorAll(sel)].filter(b => !b.closest('.board-viewport') && !b.closest('[inert]') && getComputedStyle(b).visibility !== 'hidden' && !b.disabled && b.getClientRects().length)[i]; if (!b) return null; b.click(); return (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 14); }, [TOGGLES, i]);
      if (label === null) break;
      await page.waitForTimeout(250);
      await page.evaluate(() => { for (const a of document.getAnimations()) if (['dialog-in', 'backdrop-in', 'die-pick'].includes(a.animationName)) a.finish(); });
      const after = await page.evaluate(rects);
      const moved = Object.keys(before).filter(k => after[k] && before[k][0] === after[k][0] && before[k].slice(1).join() !== after[k].slice(1).join());
      for (const k of moved) before[k][0] = before[k][0].split(' ^')[0];
      if (moved.length) issues.push(`"${label}" 누르면 ${moved.length}개 움직임: ` + moved.slice(0, 4).map(k => before[k][0] + ' ' + before[k].slice(1).join(',') + '→' + after[k].slice(1).join(',')).join(' ; '));
    }
    const key = scene[0] + issues.join('|');
    if (issues.length) bad++;
    console.log(`[${size.join('x')}] ${scene[0]}: ${issues.length ? issues.join(' || ') : '통과'}`);
    await ctx.close();
  }
  console.log(`끝 - 문제 장면 ${bad}개`);
} else if (mode === 'styles') {
  const all = {};
  for (const size of SIZES) for (const scene of SCENES) {
    const { ctx, page, misses } = await runScene(browser, size, scene);
    all[`${size.join('x')} ${scene[0]}`] = { misses, els: await page.evaluate(styleFn) };
    await ctx.close();
    process.stdout.write('.');
  }
  fs.writeFileSync(outArg, JSON.stringify(all));
  console.log(`\n끝 - ${Object.keys(all).length}개 장면 기록 ${outArg}`);
}
await browser.close();
process.exitCode = bad ? 1 : 0;
