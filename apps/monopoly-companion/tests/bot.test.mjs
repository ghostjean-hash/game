import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx=vm.createContext({structuredClone});
for(const file of ['data.js','board.js','bot.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
const B=ctx.MC_BOARD,D=ctx.MC_DATA,BOT=ctx.MC_BOT,K=D.bot;
const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const memo=()=>({asked:false,offers:{}});
const auto={opponentAuto:true,turnNo:0,memo:memo(),card:null};
const at=(b,p,index,type='buy')=>({...b,phase:'land',pending:{type,index,amount:D.board[index][2]}});

test('buying keeps the reserve, lowers it for a set-completing or blocking street, and is strict for utilities',()=>{
  const b=B.create(false,0);
  b.players[0].cash=60+K.reserve;assert.equal(BOT.decide(at(b,0,1),0,auto).kind,'buy');
  b.players[0].cash=60+K.reserve-1;assert.equal(BOT.decide(at(b,0,1),0,auto).kind,'decline');
  b.deeds[3].owner=1;b.players[0].cash=60+K.reserveKey;assert.equal(BOT.decide(at(b,0,1),0,auto).kind,'buy');
  b.players[0].cash=150+K.utilityReserve-1;assert.equal(BOT.decide(at(b,0,12),0,auto).kind,'decline');
  assert.equal(BOT.decide(at(b,0,12),0,{...auto,opponentAuto:false}).kind,'auctionHuman');
});

test('two-bot auction: higher cap wins one step above the loser, nobody under the minimum means no sale',()=>{
  const b=B.create(false,0);b.players[0].cash=100;b.players[1].cash=1500;
  assert.deepEqual({...BOT.auction(b,1,0)},{winner:1,bid:50+K.auctionStep});
  b.players[0].cash=40;b.players[1].cash=50;assert.deepEqual({...BOT.auction(b,1,0)},{winner:null,bid:null});
});

test('raising money: lone deeds are mortgaged first, then a trade request, then houses, then set streets',()=>{
  let b=B.create(true,0);b.deeds[5].owner=0;b.deeds[1].owner=0;b.players[1].cash=1500;
  b=B.build(b,0,16,null);b.players[0].cash=0;
  const due={...b,phase:'land',pending:{type:'pay',index:4,amount:300,to:null}};
  const first=BOT.decide(due,0,auto);assert.equal(first.kind,'mortgage');assert.equal(first.index,1);
  const afterLone=B.mortgage(B.mortgage(due,0,1),0,5);
  const second=BOT.decide(afterLone,0,auto);assert.equal(second.kind,'offer');assert.equal(second.type,'sell');
  assert.equal(second.amount,D.board[second.index][2]-afterLone.deeds[second.index].mortgage);
  assert.equal(BOT.decide(afterLone,0,{...auto,memo:{asked:true,offers:{}}}).kind,'offer');
  const third=BOT.decide(afterLone,0,{...auto,memo:{fundAsked:true,offers:{}}});assert.equal(third.kind,'sell');
  const noHouses=B.sell(afterLone,0,16);
  const fourth=BOT.decide(noHouses,0,{...auto,memo:{fundAsked:true,offers:{}}});assert.equal(fourth.kind,'mortgage');assert.ok(B.group(16).includes(fourth.index));
});

test('turn start releases set mortgages, builds evenly with the keep-after amount, then rolls',()=>{
  let b=B.create(true,0);b.players[0].cash=2000;b=B.mortgage(b,0,16);
  assert.equal(BOT.decide(b,0,auto).kind,'release');
  b=B.mortgage(b,0,16);const act=BOT.decide(b,0,auto);assert.equal(act.kind,'build');
  b=BOT.apply(b,0,act);const next=BOT.decide(b,0,auto);assert.equal(next.kind,'build');assert.notEqual(next.index,act.index);
  b.players[0].cash=K.keepAfterImprove;assert.equal(BOT.decide(b,0,auto).kind,'roll');
});

test('jail: pay early while many deeds are unowned, stay and roll late',()=>{
  const b=B.create(false,0);b.players[0].pos=10;b.players[0].jail=true;b.players[0].cash=10;b.players[0].cash=500;
  assert.equal(BOT.decide(b,0,auto).kind,'jailPay');
  b.players[0].cards=1;assert.equal(BOT.decide(b,0,auto).kind,'jailCard');
  for(const d of Object.values(b.deeds))d.owner=1;assert.equal(BOT.decide(b,0,auto).kind,'roll');
});

test('trade acceptance: monopoly-giving needs the higher factor, selling to a bot keeps its reserve',()=>{
  const b=B.create(false,0);b.deeds[1].owner=0;b.deeds[3].owner=1;
  const offer=amount=>({type:'buy',from:0,to:1,index:3,amount});
  assert.equal(BOT.accept(b,offer(60*K.acceptMonopolyFactor)),true);
  assert.equal(BOT.accept(b,offer(60*K.acceptMonopolyFactor-1)),false);
  b.players[1].cash=60+K.reserve-1;assert.equal(BOT.accept(b,{type:'sell',from:0,to:1,index:1,amount:60}),false);
  b.players[1].cash=1500;assert.equal(BOT.accept(b,{type:'sell',from:0,to:1,index:1,amount:61}),false);
  const done=BOT.applyOffer(b,{type:'sell',from:0,to:1,index:1,amount:60});assert.equal(done.deeds[1].owner,1);assert.equal(done.players[0].cash,1560);
});

test('card deck: one full round without repeats, reshuffles after the last card, held escape card is left out',()=>{
  const r=seeded(7);let decks={};const seen=[];
  for(let k=0;k<D.cards.chance.length;k++){const x=BOT.drawCard(decks,'chance',seen.includes('escape'),r);decks=x.decks;seen.push(x.id);}
  assert.equal(new Set(seen).size,D.cards.chance.length);
  const again=BOT.drawCard(decks,'chance',true,r);assert.equal(again.decks.chance.next,1);assert.equal(again.decks.chance.order.includes('escape'),false);
  const used={chance:{order:['jail','escape','go'],next:2}};const mid=BOT.drawCard(used,'chance',false,r);assert.deepEqual([...mid.decks.chance.order],['jail','escape','go','escape']);assert.equal(mid.id,'go');
  assert.deepEqual([...BOT.drawCard(used,'chance',true,r).decks.chance.order],['jail','escape','go']);
  const back=BOT.drawCard(again.decks,'chance',false,r);assert.equal(back.decks.chance.order.at(-1),'escape');assert.equal(back.decks.chance.order.length,D.cards.chance.length);
});

// 봇 대 봇 전체 판 모의 실행: 화면 쪽 차례 넘김을 그대로 흉내 낸다.
function simulate(seed,maxTurns=400){
  const random=seeded(seed);let b=B.create(false,0),p=0,decks={},card=null,m=memo(),turn=[0,0],steps=0;const stats={};
  const count=k=>{stats[k]=(stats[k]??0)+1;};
  while(turn[0]+turn[1]<maxTurns){
    const act=BOT.decide(b,p,{opponentAuto:true,turnNo:turn[p],memo:m,card});count(act.kind);
    if(++steps>K.maxStepsPerTurn)throw Error(`seed ${seed}: 한 차례 걸음 상한 초과 ${JSON.stringify(act)}`);
    if(act.kind==='next'){turn[p]++;p=1-p;b=B.beginTurn(b);m={asked:false,fundAsked:false,offers:m.offers};card=null;steps=0;continue;}
    if(act.kind==='bankrupt')return {stats,winner:1-act.who,turns:turn[0]+turn[1]};
    if(['wait','auctionHuman','humanFunds'].includes(act.kind))throw Error(`seed ${seed}: 두 봇 판에서 나오면 안 되는 행동 ${act.kind}`);
    if(act.kind==='draw'){const x=BOT.drawCard(decks,act.deck,b.players.some(v=>v.cards>0),random);decks=x.decks;card={deck:act.deck,id:x.id};continue;}
    if(act.kind==='offer'){m[act.type==='sell'?'fundAsked':'asked']=true;m.offers[act.index]=turn[act.from];if(BOT.accept(b,act)){b=BOT.applyOffer(b,act);count('trade');}continue;}
    b=BOT.apply(b,p,act,random);if(act.kind==='card')card=null;
    if(!B.valid(b))throw Error(`seed ${seed}: 기록 깨짐 after ${JSON.stringify(act)}`);
  }
  return {stats,winner:null,turns:maxTurns};
}

test('100 bot-vs-bot games stay valid, never stall, and actually build, mortgage, release and trade',()=>{
  const total={};let finished=0;
  for(let seed=1;seed<=100;seed++){const r=simulate(seed);if(r.winner!==null)finished++;for(const [k,v] of Object.entries(r.stats))total[k]=(total[k]??0)+v;}
  for(const k of ['build','mortgage','release','trade','buy','decline','card','pay','sell'])assert.ok(total[k]>0,k+' 0회');
  assert.ok(finished>0,'파산으로 끝난 판 0');
  console.log('# bot sim',JSON.stringify({finished,...total}));
});
