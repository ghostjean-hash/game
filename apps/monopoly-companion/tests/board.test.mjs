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
test('printed city rent is automatic and doubled for complete color; explicit adjustments remain possible',()=>{
  let s=fresh();s.deeds[1].owner=1;s.deeds[3].owner=1;s=B.roll(s,0,1,2);assert.equal(s.pending.amount,8);assert.equal(s.pending.factor,2);
  s=B.pay(s,0);assert.equal(s.players[0].cash,1492);
  s=B.beginTurn(s);s.players[0].pos=0;s=B.roll(s,0,1,2);assert.equal(s.pending.amount,8);
  s=B.recordRent(s,12,true);assert.equal(s.pending.amount,12);
});

test('all 22 photographed deeds charge the printed rents at every building level',()=>{
  const rows=[
    [1,50,2,10,30,90,160,250],[3,50,4,20,60,180,320,450],
    [6,50,6,30,90,270,400,550],[8,50,6,30,90,270,400,550],[9,50,8,40,100,300,450,600],
    [11,100,10,50,150,450,625,750],[13,100,10,50,150,450,625,750],[14,100,12,60,180,500,700,900],
    [16,100,14,70,200,550,750,950],[18,100,14,70,200,550,750,950],[19,100,16,80,220,600,800,1000],
    [21,150,18,90,250,700,875,1050],[23,150,18,90,250,700,875,1050],[24,150,20,100,300,750,925,1100],
    [26,150,22,110,330,800,975,1150],[27,150,22,110,330,800,975,1150],[29,150,24,120,360,850,1025,1200],
    [31,200,26,130,390,900,1100,1275],[32,200,26,130,390,900,1100,1275],[34,200,28,150,450,1000,1200,1400],
    [37,200,35,175,500,1100,1300,1500],[39,200,50,200,600,1400,1700,2000]
  ];
  assert.equal(Object.keys(D.printedDeeds).length,rows.length);
  for(const [i,cost,...rents] of rows)for(let n=0;n<=5;n++){
    let s=fresh();for(const j of B.group(i)){s.deeds[j].owner=1;s.deeds[j].buildings=n;}
    assert.equal(s.deeds[i].houseCost,cost);s.players[0].pos=(i+37)%40;s=B.roll(s,0,1,2);
    assert.equal(s.pending.amount,rents[n]*(n===0?2:1),`${D.board[i][0]} ${n}`);
    if(n===0){s=fresh();s.deeds[i].owner=1;s.players[0].pos=(i+37)%40;s=B.roll(s,0,1,2);assert.equal(s.pending.amount,rents[0]);}
  }
});

test('old saves gain printed values and pending rent without losing positions, cash, deeds or turns',()=>{
  let s=fresh();s.deeds[3].owner=1;s.players[0].pos=0;s=B.roll(s,0,1,2);
  for(const d of Object.values(s.deeds)){d.rents={};d.houseCost=null;}s.pending.amount=null;
  const before=snapshot(s);const next=B.hydrate(s);assert.equal(next.pending.amount,4);assert.equal(next.deeds[3].houseCost,50);
  assert.equal(snapshot(next.players),snapshot(s.players));assert.equal(next.phase,s.phase);assert.equal(next.deeds[3].owner,1);assert.equal(snapshot(s),before);assert.equal(B.valid(next),true);
});

const onCard=(deck='chance',pos=7)=>{const s=fresh();s.players[0].pos=pos;s.phase='land';s.pending={type:'card',index:pos};return s;};
test('photo cards stay separated; a card from the other deck cannot be applied',()=>{
  assert.equal(D.cards.chest.length,13);assert.equal(D.cards.chance.length,15);
  assert.equal(D.cards.chest.find(c=>c.id==='repairs').house,40);assert.equal(D.cards.chance.find(c=>c.id==='repairs').hotel,100);
  const s=onCard(),before=snapshot(s);assert.throws(()=>B.printedCard(s,0,'chest','stock'),/종류/);assert.equal(snapshot(s),before);
  for(const deck of ['chest','chance'])for(const c of D.cards[deck]){const s=onCard(deck,deck==='chest'?2:7);assert.equal(B.valid(B.printedCard(s,0,deck,c.id)),true,deck+' '+c.id);}
});
test('birthday, chairman and card fees transfer to the right recipient atomically',()=>{
  let s=B.printedCard(onCard('chest',2),0,'chest','birthday');assert.equal(s.players[0].cash,1510);assert.equal(s.players[1].cash,1490);
  s=B.printedCard(onCard(),0,'chance','chairman');assert.equal(s.players[0].cash,1450);assert.equal(s.players[1].cash,1550);
  s=onCard();s.players[0].cash=10;const before=snapshot(s);assert.throws(()=>B.printedCard(s,0,'chance','chairman'),/부족/);assert.equal(snapshot(s),before);
});
test('repairs count only own houses and hotels, treating a hotel as one hotel',()=>{
  for(const [deck,pos,expected] of [['chest',2,275],['chance',7,200]]){
    const s=onCard(deck,pos);s.deeds[1].owner=0;s.deeds[1].buildings=4;s.deeds[3].owner=0;s.deeds[3].buildings=5;
    s.deeds[6].owner=1;s.deeds[6].buildings=4;const n=B.printedCard(s,0,deck,'repairs');assert.equal(n.players[0].cash,1500-expected);
  }
});
test('nearest station doubles rent and awards GO once; named station uses normal rent',()=>{
  let s=onCard('chance',36);s.deeds[5].owner=1;s.deeds[15].owner=1;s=B.printedCard(s,0,'chance','nearest-station');assert.equal(s.players[0].pos,5);assert.equal(s.players[0].cash,1700);assert.equal(s.pending.amount,100);
  s=onCard('chance',36);s.deeds[5].owner=1;s=B.printedCard(s,0,'chance','gwangju-station');assert.equal(s.pending.amount,25);assert.equal(s.players[0].cash,1700);
});
test('nearest utility requires fresh physical dice and charges ten times, even for a single utility',()=>{
  let s=onCard();s.dice=[1,6];s.deeds[12].owner=1;s=B.printedCard(s,0,'chance','nearest-utility');assert.equal(s.players[0].pos,12);assert.equal(s.pending.amount,null);assert.equal(s.pending.factor,10);
  s=B.utilityRoll(s,3,4);assert.equal(s.pending.amount,70);s=B.pay(s,0);assert.equal(s.players[1].cash,1570);
  s=onCard('chance',36);s.deeds[12].owner=1;s.deeds[12].mortgaged=true;s=B.printedCard(s,0,'chance','nearest-utility');assert.equal(s.players[0].cash,1700);assert.equal(s.pending.type,'info');
});
test('printed movement resolves city rents, backwards chest chains, GO and jail correctly',()=>{
  let s=onCard();s.deeds[39].owner=1;s=B.printedCard(s,0,'chance','seoul');assert.equal(s.pending.amount,50);
  s=onCard('chance',36);s=B.printedCard(s,0,'chance','back-three');assert.equal(s.pending.type,'card');assert.equal(s.pending.index,33);s=B.printedCard(s,0,'chest','stock');assert.equal(s.players[0].cash,1550);
  s=onCard();s=B.printedCard(s,0,'chance','go');assert.equal(s.players[0].pos,0);assert.equal(s.players[0].cash,1700);
  s=onCard();s.extra=true;s=B.printedCard(s,0,'chance','jail');assert.equal(s.players[0].jail,true);assert.equal(s.extra,false);assert.equal(s.players[0].cash,1500);
});
test('station and utility mortgage and redemption match the supplied backs',()=>{
  for(const [i,loan,release] of [[5,100,110],[15,100,110],[25,100,110],[35,100,110],[12,75,83],[28,75,83]]){
    let s=fresh();s.deeds[i].owner=0;s=B.mortgage(s,0,i);assert.equal(s.players[0].cash,1500+loan);s=B.mortgage(s,0,i);assert.equal(s.players[0].cash,1500+loan-release);
  }
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
