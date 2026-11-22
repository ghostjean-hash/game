import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(path.join(os.homedir(), '.claude/node_modules/'));
const { chromium } = require('playwright-core');
const dir = fileURLToPath(new URL('../', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('fixtures/screen-session.json', import.meta.url)));
const key = 'gg.monopoly-companion.session';
let server, browser, base;
before(async () => {
  server = createServer((req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
      const file = path.resolve(dir, name);
      if (!file.startsWith(dir)) throw Error('path');
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
      res.end(readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ channel: 'chrome' });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });

async function scene(t, edit, preparing = false) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 950 }, reducedMotion: 'reduce' });
  t.after(() => ctx.close());
  const state = structuredClone(fixture);
  state.runningSince = null; state.auto = [false, false]; state.turns = [0, 0]; state.first = 0;
  if (edit) edit(state);
  if (!preparing) await ctx.addInitScript(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [key, state]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  await page.goto(base);
  if (!preparing) await page.click('[data-action="resume"]');
  return page;
}
const saved = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
const onlyBrown = s => {
  for (const [i, d] of Object.entries(s.board.deeds)) Object.assign(d, { owner: [1, 3].includes(Number(i)) ? 0 : null, buildings: 0, mortgaged: false });
};
const buy = s => { s.board.phase = 'land'; s.board.pending = { type: 'buy', index: 39, amount: 400 }; s.board.deeds[39].owner = null; s.board.players[0].cash = 350; };

test('0.30 파산 선택은 판을 유지하고 확인 뒤 되돌리면 직전 상태를 복원한다', async t => {
  const p = await scene(t);
  const old = await saved(p);
  await p.click('[data-action="bankrupt"]'); await p.click('[data-bankrupt="0"]');
  assert.equal((await saved(p)).screen, 'play');
  assert.match(await p.locator('[data-bankrupt-confirm]').innerText(), /아빠 파산 · 판 끝내기/);
  await p.click('[data-bankrupt-confirm="0"]');
  assert.equal((await saved(p)).screen, 'result');
  await p.click('.result-actions [data-action="undo"]');
  const next = await saved(p);
  assert.equal(next.screen, 'play'); assert.deepEqual(next.board, old.board); assert.deepEqual(next.turns, old.turns);
  assert.equal(next.runningSince, null);
});
test('0.30 진행 중 파산을 되돌리면 시계도 재개한다', async t => {
  const p = await scene(t, s => { s.runningSince = Date.now(); });
  await p.click('[data-action="bankrupt"]'); await p.click('[data-bankrupt="1"]'); await p.click('[data-bankrupt-confirm="1"]');
  await p.click('.result-actions [data-action="undo"]');
  assert.equal(typeof (await saved(p)).runningSince, 'number');
});
test('0.30 경매는 권리증과 사람 칸 선택을 쓰고 고른 사람에게 기록한다', async t => {
  const p = await scene(t, buy);
  await p.click('[data-action="auction"]');
  assert.equal(await p.locator('.auction-deed .deed-sheet').count(), 1);
  await p.click('[data-auction-player="1"]');
  await p.click('[data-amount-key="5"]'); await p.click('[data-amount-key="0"]');
  assert.match(await p.locator('#auction-confirm').innerText(), /사기\s*50/);
  assert.equal(await p.locator('#auction-form small').count(), 0);
  await p.click('#auction-confirm'); assert.equal((await saved(p)).board.deeds[39].owner, 1);
});
test('0.30 보너스 선택과 초기화는 창 안에서 즉시 반영되고 확인으로 닫힌다', async t => {
  const p = await scene(t, null, true);
  await p.click('[data-bonus-open="0"]'); await p.click('[data-bonus-set="200"]');
  assert.match(await p.locator('.bonus-total').innerText(), /1,700/);
  assert.equal(await p.locator('#rule-dialog').evaluate(d => d.open), true);
  assert.equal(await p.locator('[data-bonus-set="0"]').getAttribute('class'), 'secondary');
  await p.click('[data-bonus-set="0"]'); assert.match(await p.locator('.bonus-total').innerText(), /1,500/);
  await p.click('[data-close-ok]'); assert.equal(await p.locator('#rule-dialog').evaluate(d => d.open), false);
});
test('0.30 건설 칸은 균등 규칙과 현금으로 막고 계획한 칸은 뺄 수 있다', async t => {
  const p = await scene(t, s => { onlyBrown(s); s.board.players[0].cash = 50; });
  await p.click('[data-action="build"]');
  assert.equal(await p.locator('[data-build-set="2"][data-city-key="0"]').isDisabled(), true);
  await p.click('[data-build-set="1"][data-city-key="0"]');
  assert.equal(await p.locator('[data-build-set="1"][data-city-key="1"]').isDisabled(), true);
  assert.equal(await p.locator('[data-build-set="1"][data-city-key="0"]').isDisabled(), false);
  assert.equal(await p.locator('.construction-help').count(), 0);
  await p.click('[data-build-set="1"][data-city-key="0"]');
  assert.equal(await p.locator('[data-build-set="1"][data-city-key="1"]').isDisabled(), false);
});
test('0.30 은행 주택 재고가 없으면 건설 칸이 막힌다', async t => {
  const p = await scene(t, s => {
    onlyBrown(s); s.board.players[0].cash = 10000;
    for (const i of [6,8,9,11,13,14,16,18]) Object.assign(s.board.deeds[i], { owner: 1, buildings: 4 });
    Object.assign(s.board.deeds[19], { owner: 1, buildings: 5 });
  });
  await p.click('[data-action="build"]');
  assert.equal(await p.locator('[data-build-set="1"][data-city-key="0"]').isDisabled(), true);
});
test('0.30 막힌 저당 줄은 네 크기에서 이유 중복과 글자 잘림 없이 같은 색 건물을 판다', async t => {
  for (const [width, height] of [[1366, 950], [1366, 1024], [1194, 834], [1024, 768]]) {
    const p = await scene(t, s => { onlyBrown(s); s.board.deeds[1].buildings = 1; });
    await p.setViewportSize({ width, height });
    const old = await saved(p); await p.click('[data-action="properties"]');
    const rows = p.locator('.asset-row').filter({ has: p.locator('[data-manage="sellAll"]') });
    assert.equal(await rows.count(), 2);
    assert.equal(await rows.locator('.blocked-reason').count(), 0);
    const issues = await rows.evaluateAll(rows => rows.flatMap(row => {
      const bounds = row.getBoundingClientRect();
      return [...row.querySelectorAll('button, small')].flatMap(el => {
        const r = el.getBoundingClientRect(), range = document.createRange();
        range.selectNodeContents(el);
        const text = range.getBoundingClientRect(), line = parseFloat(getComputedStyle(el).lineHeight);
        return text.height > line + 1 || text.left < r.left - 1 || text.right > r.right + 1 ||
          r.left < bounds.left || r.right > bounds.right ? [el.textContent.trim()] : [];
      });
    }));
    assert.deepEqual(issues, [], width + 'x' + height);
    const row = p.locator('.asset-row').filter({ has: p.locator('[data-tile="3"]') });
    const sell = row.locator('[data-manage="sellAll"]');
    assert.match(await sell.innerText(), /이 색 건물 팔기 \+\s*25/); await sell.click();
    const next = await saved(p); assert.equal(next.board.deeds[1].buildings, 0);
    assert.equal(next.board.players[0].cash, old.board.players[0].cash + 25);
  }
});
test('0.30 집 짓기 목록과 도시별 창의 제목, 사람 줄, 폭이 같다', async t => {
  const p = await scene(t, s => { onlyBrown(s); for (const i of [6,8,9]) s.board.deeds[i].owner = 0; });
  await p.click('[data-action="build"]');
  const before = await p.locator('#rule-dialog').boundingBox();
  assert.equal(await p.locator('#rule-title').innerText(), '집 짓기');
  assert.equal(await p.locator('.dialog-foot button').innerText(), '돌아가기');
  await p.click('[data-build-plan="1"]');
  assert.equal(await p.locator('#rule-title').innerText(), '집 짓기');
  assert.deepEqual(await p.locator('#rule-dialog').boundingBox(), before);
  assert.equal(await p.locator('.construction-head button').count(), 2);
  await p.click('[data-build-player="1"]');
  assert.deepEqual(await p.locator('#rule-dialog').boundingBox(), before);
  assert.equal(await p.locator('.construction-picker').count(), 1);
});
test('0.30 기록 맞추기는 숫자판과 보드 선택을 사람별로 보존해 확정한다', async t => {
  const p = await scene(t);
  await p.click('[data-action="menu"]'); await p.click('[data-action="correct"]');
  assert.equal(await p.locator('#correct-form select, #correct-form input[type="number"]').count(), 0);
  await p.click('[data-amount-key="9"]'); await p.click('.board-viewport [data-tile="0"]');
  await p.click('[data-correct-player="1"]'); await p.click('.board-viewport [data-tile="10"]');
  await p.click('[data-amount-key="8"]'); await p.click('#correct-jail');
  await p.click('[data-correct-player="0"]'); assert.match(await p.locator('#correct-place').innerText(), /출발/);
  assert.match(await p.locator('#correct-cash-display').innerText(), /9/);
  await p.click('[form="correct-form"]');
  const next = await saved(p); assert.equal(next.board.players[0].pos, 0); assert.equal(next.board.players[0].cash, 9);
  assert.equal(next.board.players[1].pos, 10); assert.equal(next.board.players[1].cash, 8); assert.equal(next.board.players[1].jail, true);
});
test('0.30 메뉴 자동 표기와 돌아가기 이름을 통일하고 진짜 취소는 유지한다', async t => {
  const p = await scene(t); await p.click('[data-action="menu"]');
  assert.match(await p.locator('.menu-auto').innerText(), /자동 꺼짐/);
  assert.doesNotMatch(await p.locator('.menu-auto').innerText(), /Auto|Off/);
  await p.click('[data-action="end"]'); assert.equal(await p.locator('#rule-dialog [data-close]').last().innerText(), '취소');
  await p.locator('#rule-dialog [data-close]').last().click(); await p.click('[data-action="properties"]');
  assert.equal(await p.locator('.finance-footer [data-close]').innerText(), '돌아가기');
});
test('0.30 구입 자금을 모은 주 단추는 창을 닫고 실제 구입까지 처리한다', async t => {
  const p = await scene(t, buy); await p.click('[data-action="properties"]');
  await p.locator('[data-manage="mortgage"]').first().click();
  const cash = (await saved(p)).board.players[0].cash;
  assert.match(await p.locator('[data-funds-pay]').innerText(), /구입\s*400/);
  await p.click('[data-funds-pay]'); const next = await saved(p);
  assert.equal(next.board.deeds[39].owner, 0); assert.equal(next.board.players[0].cash, cash - 400);
  assert.equal(await p.locator('#rule-dialog').evaluate(d => d.open), false);
});
for (const type of ['pay', 'rent']) test(`0.30 ${type} 돈 마련 주 단추는 내기로 지불까지 처리한다`, async t => {
  const p = await scene(t, s => { s.board.players[0].cash = 500; s.board.phase = 'land'; s.board.pending = type === 'pay' ? { type, index: 4, amount: 200, to: null } : { type, index: 5, from: 0, to: 1, amount: 200, kind: 'fixed', factor: 1 }; });
  await p.click('[data-action="properties"]'); assert.match(await p.locator('[data-funds-pay]').innerText(), /내기\s*200/);
  await p.click('[data-funds-pay]'); assert.equal((await saved(p)).board.players[0].cash, 300);
});
test('0.30 감옥 그림의 회전된 경계가 이름 줄과 겹치지 않는다', async t => {
  const p = await scene(t);
  const gap = await p.evaluate(() => { const tile = document.querySelector('[data-tile="10"]'); return tile.querySelector('.tile-name').getBoundingClientRect().top - tile.querySelector('.icon-prison').getBoundingClientRect().bottom; });
  assert.ok(gap >= 0, `gap ${gap}`);
});
test('0.30 빈 거래는 방향, 숫자 초기화, 부지 선택 취소 뒤에도 비활성이다', async t => {
  const p = await scene(t); await p.click('[data-action="trade"]');
  const confirm = p.locator('#trade-confirm'); assert.equal(await confirm.isDisabled(), true);
  await p.click('[data-trade-dir="1"]'); assert.equal(await confirm.isDisabled(), true);
  await p.click('[data-amount-key="1"]'); assert.equal(await confirm.isDisabled(), false);
  await p.click('[data-amount-key="C"]'); assert.equal(await confirm.isDisabled(), true);
  await p.click('[data-trade-deed="1"]'); assert.equal(await confirm.isDisabled(), false);
  await p.click('[data-trade-deed=""][data-player="0"]'); assert.equal(await confirm.isDisabled(), true);
});
test('0.30 세로 화면에서 자동을 켜도 시계와 메뉴 자리가 유지된다', async t => {
  const p = await scene(t);
  await p.setViewportSize({ width: 1024, height: 1366 });
  const rects = () => p.evaluate(() => ['#timer', '.menu-button'].map(sel => {
    const { x, y, width, height } = document.querySelector(sel).getBoundingClientRect();
    return [x, y, width, height];
  }));
  const before = await rects();
  await p.click('[data-action="menu"]'); await p.click('[data-auto="0"]');
  assert.deepEqual(await rects(), before);
  assert.ok((await p.locator('.menu-button').boundingBox()).x + 48 <= 1024);
});
