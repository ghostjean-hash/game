import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const ctx=vm.createContext({});
for(const f of ['data.js','core.js','manager.js']) vm.runInContext(readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx);
const flows=ctx.MC_MANAGER.flows(['아빠','서우']);

test('all registered manager flows have reachable choices and no dead ends',()=>{
  assert.deepEqual(Object.keys(flows).sort(),Array.from(ctx.MC_DATA.rules,r=>r.id).sort());
  for(const [id,nodes] of Object.entries(flows)){
    const visited=new Set();
    const walk=(key)=>{if(visited.has(key))return;const node=nodes[key];assert.ok(node,`${id}: missing ${key}`);visited.add(key);assert.ok(node.title&&node.text);assert.ok(node.choices.length>=1&&node.choices.length<=3);for(const c of node.choices){assert.ok(c.label);if(!['close','bankrupt0','bankrupt1'].includes(c.next))walk(c.next);}};
    walk('start');
    assert.equal(visited.size,Object.keys(nodes).length,`${id}: unreachable screens`);
  }
});
test('unowned property starts with two clear decisions and only shows the selected task',()=>{
  const nodes=flows.buy;
  assert.equal(nodes.start.choices.length,2);
  assert.equal(nodes.start.choices[0].next,'pay');
  assert.equal(nodes.start.choices[1].next,'auction');
  assert.ok(!nodes.start.text.includes('경매'));
  assert.ok(nodes.pay.title.includes('은행'));
  assert.equal(nodes.pay.choices[0].next,'close');
});
test('auction identifies either family member or no bid without assuming a purchase',()=>{
  const nodes=flows.buy;
  assert.deepEqual(Array.from(nodes.who.choices,c=>c.label),['아빠','서우','아무도 입찰 안 했어요']);
  assert.ok(nodes.winner0.title.includes('아빠'));
  assert.ok(nodes.winner1.title.includes('서우'));
  assert.ok(nodes.nobody.text.includes('돈을 내지'));
});
test('rent excludes mortgaged property before asking for payment and uses applicable multiplier',()=>{
  assert.equal(flows.rent.start.choices[0].next,'mortgaged');
  assert.equal(flows.rent.mortgaged.choices[0].next,'close');
  assert.equal(flows.rent.four.calculator,'4');
  assert.equal(flows.rent.ten.calculator,'10');
  assert.equal(flows.rent.double.calculator,'street');
});
test('empty player names use the requested family defaults',()=>{
  assert.deepEqual(Array.from(ctx.MC.createSession(['',' '],45,true).names),['아빠','서우']);
});

test('build guide says three houses before a hotel in the official short game',()=>{
  const short=ctx.MC_MANAGER.flows(['아빠','서우'],3).build,standard=ctx.MC_MANAGER.flows(['아빠','서우']).build;
  assert.match(short.hotel.title,/세 채/);assert.match(short.hotelpay.text,/세 채/);assert.doesNotMatch(JSON.stringify(short),/네 채/);
  assert.match(standard.hotel.title,/네 채/);
});

test('monopoly guide separates city, station and utility effects',()=>{
  const nodes=flows.monopoly;
  assert.equal(nodes.start.choices.length,3);
  assert.match(nodes.street.text,/2배/);assert.match(nodes.street.note,/저당/);
  assert.match(nodes.station.text,/1곳 M25.*2곳 M50.*3곳 M100.*4곳 M200/);
  assert.match(nodes.utility.text,/4배.*10배/);
  assert.match(nodes.station.note,/짓지/);assert.match(nodes.utility.note,/짓지/);
});
