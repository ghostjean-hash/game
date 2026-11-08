import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx=vm.createContext({structuredClone});
for(const file of ['data.js','board.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
const B=ctx.MC_BOARD,D=ctx.MC_DATA;
const fresh=()=>B.create(false,0),snapshot=s=>JSON.stringify(s);
const ready=s=>({...s,phase:'roll',pending:null});

test('photographed Korean board and banknote breakdown match all 40 positions',()=>{
  assert.equal(D.board.length,40);assert.equal(Object.keys(fresh().deeds).length,28);
  assert.deepEqual(Array.from(D.money,([v,n])=>[v,n]),[[500,2],[100,4],[50,1],[20,1],[10,2],[5,1],[1,5]]);
  for(const [index,name,price] of [[4,'소득세',200],[12,'전력회사',150],[17,'사회사업기금',undefined],[25,'춘천역',200],[28,'수자원공사',150],[38,'사치세',100],[39,'서울',400]]){assert.equal(D.board[index][0],name);assert.equal(D.board[index][2],price);}
});
test('quick setup spends printed prices and assigns the exact photographed cities',()=>{
  const s=B.create(true,1);assert.equal(s.players[1].cash,940);assert.equal(s.players[0].cash,820);
  assert.equal(s.deeds[16].owner,1);assert.equal(s.deeds[18].owner,1);assert.equal(s.deeds[19].owner,1);
  assert.equal(s.deeds[21].owner,0);assert.equal(B.valid(s),true);
});
test('move, buy, acknowledge and next-turn transition retain cash and ownership',()=>{
  let s=B.roll(fresh(),0,1,2);assert.equal(s.players[0].pos,3);assert.equal(s.pending.type,'buy');
  s=B.purchase(s,0);assert.equal(s.players[0].cash,1440);assert.equal(s.deeds[3].owner,0);assert.equal(s.phase,'end');
  s=B.beginTurn(s);assert.equal(s.phase,'roll');assert.equal(s.doubles,0);assert.equal(B.valid(s),true);
});
test('GO pays once when wrapping and tax payment is a separate confirmed action',()=>{
  let s=fresh();s.players[0].pos=38;s=B.roll(s,0,2,4);assert.equal(s.players[0].pos,4);assert.equal(s.players[0].cash,1700);assert.equal(s.pending.amount,200);
  s=B.pay(s,0);assert.equal(s.players[0].cash,1500);assert.equal(s.phase,'end');
});
test('station counts and utility ownership determine rent without invented city rents',()=>{
  let s=fresh();s.deeds[5].owner=1;s.deeds[15].owner=1;s=B.roll(s,0,2,3);assert.equal(s.pending.amount,50);
  s=B.pay(s,0);assert.equal(s.players[0].cash,1450);assert.equal(s.players[1].cash,1550);
  s=fresh();s.players[0].pos=5;s.deeds[12].owner=1;s.deeds[28].owner=1;s=B.roll(s,0,3,4);assert.equal(s.pending.amount,70);
});
test('city rent is requested once, cached by building row and doubled for complete color',()=>{
  let s=fresh();s.deeds[1].owner=1;s.deeds[3].owner=1;s=B.roll(s,0,1,2);assert.equal(s.pending.amount,null);assert.equal(s.pending.factor,2);
  s=B.recordRent(s,4);assert.equal(s.pending.amount,8);s=B.pay(s,0);assert.equal(s.players[0].cash,1492);
  s=B.beginTurn(s);s.players[0].pos=0;s=B.roll(s,0,1,2);assert.equal(s.pending.amount,8);
});
test('mortgaged property never charges rent',()=>{
  let s=fresh();s.deeds[3].owner=1;s.deeds[3].mortgaged=true;s=B.roll(s,0,1,2);assert.equal(s.pending.type,'info');s=B.acknowledge(s);assert.equal(s.players[0].cash,1500);
});
test('three doubles send player to jail before third movement and do not pay GO',()=>{
  let s=fresh();s=B.roll(s,0,1,1);s=B.card(s,0,'receive',0);assert.equal(s.phase,'roll');
  s=B.roll(s,0,1,1);s=B.pay(s,0);assert.equal(s.phase,'roll');
  const before=s.players[0].cash;s=B.roll(s,0,6,6);assert.equal(s.players[0].pos,10);assert.equal(s.players[0].jail,true);assert.equal(s.players[0].cash,before);assert.equal(s.extra,false);
});
test('jail doubles escape does not grant extra roll; third failed attempt charges 50 then moves',()=>{
  let s=fresh();s.players[0].pos=10;s.players[0].jail=true;s=B.roll(s,0,2,2);assert.equal(s.players[0].pos,14);assert.equal(s.extra,false);assert.equal(s.players[0].jail,false);
  s=fresh();s.players[0].pos=10;s.players[0].jail=true;s.players[0].attempts=2;s=B.roll(s,0,2,3);assert.equal(s.pending.type,'jailFee');assert.equal(s.players[0].pos,10);
  s=B.pay(s,0);assert.equal(s.players[0].cash,1450);assert.equal(s.players[0].pos,15);assert.equal(s.pending.type,'buy');
});
test('failed payment and invalid dice leave both players and pending action unchanged',()=>{
  let s=fresh();s.players[0].cash=10;s=B.roll(s,0,1,3);const before=snapshot(s);assert.throws(()=>B.pay(s,0),/현금/);assert.equal(snapshot(s),before);
  const r=fresh(),copy=snapshot(r);for(const [a,b] of [[0,1],[7,1],[1.5,2],[NaN,4]])assert.throws(()=>B.roll(r,0,a,b));assert.equal(snapshot(r),copy);
});
test('construction is even, finite, and blocks mortgage until every building is sold',()=>{
  let s=B.create(true,0);s=B.build(s,0,16,100);assert.equal(s.deeds[16].buildings,1);assert.equal(s.players[0].cash,840);
  const before=snapshot(s);assert.throws(()=>B.build(s,0,16,100),/가장 적은/);assert.equal(snapshot(s),before);assert.throws(()=>B.mortgage(s,0,18),/건물/);
  s=B.sell(s,0,16);assert.equal(s.players[0].cash,890);s=B.mortgage(s,0,18);assert.equal(s.players[0].cash,980);assert.equal(s.deeds[18].mortgaged,true);
  s=B.mortgage(s,0,18);assert.equal(s.players[0].cash,881);assert.equal(B.valid(s),true);
});
test('mortgaged trade charges ten percent to new owner while preserving every unrelated deed',()=>{
  let s=fresh();s.deeds[1].owner=0;s.deeds[1].mortgaged=true;s.deeds[3].owner=1;const before=snapshot(s.deeds[5]);
  s=B.trade(s,1,3,0,100);assert.equal(s.deeds[1].owner,1);assert.equal(s.deeds[3].owner,0);assert.equal(s.players[0].cash,1600);assert.equal(s.players[1].cash,1397);assert.equal(snapshot(s.deeds[5]),before);
});
test('card movement does not assume a special rent and backwards movement does not collect GO',()=>{
  let s=fresh();s.players[0].pos=34;s=B.roll(s,0,1,2);s=B.purchase(s,0); // prepare another card state without invented cash
  s={...s,phase:'land',pending:{type:'card',index:36}};s.players[0].pos=36;s.deeds[5].owner=1;
  s=B.card(s,0,'move',5);assert.equal(s.players[0].cash,1350);assert.equal(s.pending.type,'rent');assert.equal(s.pending.amount,null);assert.equal(s.pending.kind,'card');
  s=fresh();s.players[0].pos=2;s.phase='land';s.pending={type:'card',index:2};s=B.card(s,0,'back',39);assert.equal(s.players[0].cash,1500);
});
test('malformed saves and impossible ownership are rejected',()=>{
  assert.equal(B.valid(fresh()),true);const s=fresh();s.players[0].cash=-1;assert.equal(B.valid(s),false);
  const b=fresh();b.deeds[1].buildings=1;assert.equal(B.valid(b),false);
  const q=fresh();q.phase='land';q.pending={type:'rent',index:99,from:0,to:1};assert.equal(B.valid(q),false);
});
test('the finite bank supply blocks the 33rd house and a hotel returns four houses',()=>{
  let s=fresh();for(const d of Object.values(s.deeds))d.owner=0;
  for(const i of [1,3,6,8,9,11,13,14]){s.deeds[i].buildings=4;s.deeds[i].houseCost=100;}
  assert.equal(B.valid(s),true);assert.equal(B.supplies(s).houses,0);
  const before=snapshot(s);assert.throws(()=>B.build(s,0,16,100),/주택이 없/);assert.equal(snapshot(s),before);
  s=B.build(s,0,1,100);assert.equal(s.deeds[1].buildings,5);assert.equal(B.supplies(s).houses,4);assert.equal(B.supplies(s).hotels,11);
});
test('the thirteenth hotel is blocked and all-building sale works without spare houses',()=>{
  let s=fresh();for(const d of Object.values(s.deeds))d.owner=0;
  for(const i of [1,3,6,8,9,11,13,14,16,18,19,21]){s.deeds[i].buildings=5;s.deeds[i].houseCost=100;}
  for(const i of [23,24]){s.deeds[i].buildings=4;s.deeds[i].houseCost=100;}
  assert.equal(B.valid(s),true);assert.equal(B.supplies(s).hotels,0);assert.throws(()=>B.build(s,0,23,100),/호텔이 없/);
  s=B.sell(s,0,21,true);assert.equal(s.players[0].cash,2150);assert.equal(s.deeds[23].buildings,0);assert.equal(s.deeds[24].buildings,0);
});
test('auction cannot start below the printed M10 minimum and a non-current player can win',()=>{
  let s=B.roll(fresh(),0,1,2),before=snapshot(s);assert.throws(()=>B.purchase(s,0,1,5));assert.equal(snapshot(s),before);
  s=B.purchase(s,0,1,10);assert.equal(s.players[1].cash,1490);assert.equal(s.deeds[3].owner,1);assert.equal(s.phase,'end');
});
