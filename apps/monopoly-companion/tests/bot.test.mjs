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

test('blocking the opponent set: buys with no reserve, mortgages lone deeds to afford it, auctions only when even that is short',()=>{
  let b=B.create(false,0);b.deeds[3].owner=1;b.deeds[5].owner=0;b.deeds[15].owner=0;
  b.players[0].cash=60;assert.equal(BOT.decide(at(b,0,1),0,auto).kind,'buy');
  b.players[0].cash=10;const m=BOT.decide(at(b,0,1),0,auto);assert.equal(m.kind,'mortgage');assert.ok([5,15].includes(m.index));
  const after=BOT.apply(at(b,0,1),0,m);assert.equal(B.valid(after),true);
  const next=BOT.decide(after,0,auto);assert.equal(next.kind,'buy');
  b.deeds[5].owner=null;b.deeds[15].owner=null;b.players[0].cash=0;
  assert.equal(BOT.decide(at(b,0,1),0,auto).kind,'decline');
  assert.equal(BOT.decide(at(b,0,1),0,{...auto,opponentAuto:false}).kind,'auctionHuman');
  const cheap=B.create(false,0);cheap.deeds[3].owner=1;cheap.deeds[5].owner=0;cheap.deeds[12].owner=0;cheap.players[0].cash=10;
  const first=BOT.decide(at(cheap,0,1),0,auto);assert.equal(first.kind,'mortgage');assert.equal(first.index,cheap.deeds[5].mortgage<cheap.deeds[12].mortgage?5:12);
  const big=B.create(false,0),top=Math.max(...Object.keys(big.deeds).map(Number).filter(B.isStreet));for(const j of B.group(top))if(j!==top)big.deeds[j].owner=1;
  big.deeds[12].owner=0;big.players[0].cash=D.board[top][2]-big.deeds[12].mortgage-1;
  assert.equal(BOT.decide(at(big,0,top),0,auto).kind,'decline');
  const own=B.create(false,0);own.deeds[3].owner=0;own.players[0].cash=60+K.reserveKey-1;
  assert.equal(BOT.decide(at(own,0,1),0,auto).kind,'decline');
});

test('auction: the blocking bot bids its whole cash, the completing bot keeps its auction cash',()=>{
  const b=B.create(false,0);b.deeds[3].owner=1;b.players[0].cash=70;b.players[1].cash=1500;
  const cap0=Math.min(Math.floor(60*K.auctionKeyFactor),70-K.auctionBlockKeep);
  assert.deepEqual({...BOT.auction(b,1,0)},{winner:1,bid:Math.min(cap0+K.auctionStep,Math.floor(60*K.auctionKeyFactor))});
  b.players[0].cash=1500;assert.deepEqual({...BOT.auction(b,1,0)},{winner:0,bid:Math.floor(60*K.auctionKeyFactor)});
  b.players[1].cash=100;assert.deepEqual({...BOT.auction(b,1,0)},{winner:0,bid:100-K.auctionCashKeep+K.auctionStep});
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

test('raising money: a deed that completes the opponent set is offered only after every other step, at the monopoly value',()=>{
  let b=B.create(false,0);b.deeds[1].owner=0;b.deeds[3].owner=1;b.deeds[5].owner=0;b.players[0].cash=0;b.players[1].cash=1500;
  const due=x=>({...x,phase:'land',pending:{type:'pay',index:4,amount:300,to:null}});
  const m=fundAsked=>({...auto,memo:{asked:false,fundAsked,offers:{}}});
  let act=BOT.decide(due(b),0,m([]));assert.equal(act.kind,'mortgage');b=BOT.apply(due(b),0,act);
  act=BOT.decide(due(b),0,m([]));assert.equal(act.kind,'mortgage');b=BOT.apply(due(b),0,act);
  act=BOT.decide(due(b),0,m([]));assert.equal(act.kind,'offer');assert.equal(act.index,5);
  act=BOT.decide(due(b),0,m([5]));assert.equal(act.kind,'offer');assert.equal(act.index,1);
  assert.equal(act.amount,Math.round(60*K.acceptMonopolyFactor)-b.deeds[1].mortgage);assert.equal(BOT.accept(due(b),act),true);
  assert.equal(BOT.decide(due(b),0,m([5,1])).kind,'bankrupt');
  const poor=B.create(false,0);poor.deeds[1].owner=0;poor.deeds[3].owner=1;poor.players[0].cash=0;poor.players[1].cash=200;
  const cut=BOT.decide(B.mortgage(due(poor),0,1),0,m([]));assert.equal(cut.kind,'offer');assert.equal(cut.index,1);
  assert.equal(cut.amount,200-Math.ceil(poor.deeds[1].mortgage*10/100)-K.reserve);
  const big=x=>({...x,phase:'land',pending:{type:'pay',index:4,amount:1000,to:null}});
  const rail=B.create(false,0);for(const j of [5,15,25,35])rail.deeds[j].owner=0;rail.deeds[12].owner=0;rail.players[0].cash=0;rail.players[1].cash=1500;
  const r1=BOT.decide(big(rail),0,m([]));assert.equal(r1.kind,'mortgage');assert.equal(r1.index,12);
  let rb=BOT.apply(big(rail),0,r1);const r2=BOT.decide(rb,0,m([]));assert.equal(r2.kind,'offer');assert.equal(r2.index,12);
  const r3=BOT.decide(rb,0,m([12]));assert.equal(r3.kind,'mortgage');assert.ok([5,15,25,35].includes(r3.index));
  for(const j of [5,15,25,35])rb=B.mortgage(rb,0,j);const r4=BOT.decide(rb,0,m([12]));assert.equal(r4.kind,'offer');assert.ok([5,15,25,35].includes(r4.index));
  const gift=B.create(false,0);gift.deeds[12].owner=1;gift.deeds[12].mortgaged=true;gift.players[1].cash=0;const party={...gift,phase:'land',pending:{type:'card',index:2}};const owe=BOT.decide(party,0,{...auto,card:{deck:'chest',id:'birthday'}});assert.equal(owe.kind,'bankrupt');assert.equal(owe.who,1);
  const station=B.create(false,0);for(const j of [5,15,25])station.deeds[j].owner=1;station.deeds[35].owner=0;
  assert.equal(BOT.accept(station,{type:'buy',from:1,to:0,index:35,amount:2000}),false);
});

test('swap: trades a deed completing the opponent set for one completing mine, the richer set pays half the value gap',()=>{
  const b=B.create(false,0),blue=B.group(6),take=blue[0];b.deeds[1].owner=0;b.deeds[3].owner=1;b.deeds[take].owner=1;for(const j of blue.slice(1))b.deeds[j].owner=0;
  const gap=blue.reduce((t,j)=>t+D.board[j][2],0)-B.group(1).reduce((t,j)=>t+D.board[j][2],0),pay=Math.round(gap*K.swapBalance);
  const act=BOT.decide(b,0,auto);assert.equal(act.kind,'offer');assert.equal(act.type,'swap');
  assert.deepEqual([act.give,act.take,act.amount],[1,take,pay]);
  assert.equal(BOT.decide(b,0,{...auto,opponentAuto:false}).type,'swap');
  assert.equal(BOT.accept(b,act),true);assert.equal(BOT.accept(b,{...act,amount:pay-1}),false);
  const done=BOT.applyOffer(b,act);assert.equal(done.deeds[1].owner,1);assert.equal(done.deeds[take].owner,0);assert.equal(done.players[0].cash,1500-pay);assert.equal(done.players[1].cash,1500+pay);
  const flip=BOT.applyOffer(b,{...act,from:1,to:0,give:take,take:1,amount:-pay});assert.equal(flip.deeds[1].owner,1);assert.equal(flip.players[0].cash,1500-pay);
  assert.notEqual(BOT.decide(b,0,{...auto,memo:{asked:false,offers:{[BOT.swapKey(1,take)]:0}}}).type,'swap');
  assert.notEqual(BOT.decide(b,0,{...auto,memo:{swapAsked:true,offers:{}}}).type,'swap');
  const poor=structuredClone(b);poor.players[0].cash=pay+K.reserve-1;assert.notEqual(BOT.decide(poor,0,auto).type,'swap');
  assert.equal(BOT.accept(b,{...act,from:1,to:0,give:take,take:1,amount:-pay}),true);assert.equal(BOT.accept(b,{...act,from:1,to:0,give:take,take:1,amount:-pay-1}),false);
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

test('trade acceptance: never hands over a monopoly by choice, pays up to the monopoly value only to complete its own set',()=>{
  const b=B.create(false,0);b.deeds[1].owner=0;b.deeds[3].owner=1;
  const offer=amount=>({type:'buy',from:0,to:1,index:3,amount});
  assert.equal(BOT.accept(b,offer(60*K.acceptMonopolyFactor)),false);
  assert.equal(BOT.accept(b,offer(60*K.acceptMonopolyFactor*10)),false);
  const lone=B.create(false,0),j=B.group(6).at(-1),pj=D.board[j][2];lone.deeds[j].owner=1;
  assert.equal(BOT.accept(lone,{type:'buy',from:0,to:1,index:j,amount:Math.ceil(pj*K.acceptSellFactor)}),true);
  assert.equal(BOT.accept(lone,{type:'buy',from:0,to:1,index:j,amount:Math.ceil(pj*K.acceptSellFactor)-1}),false);
  const sell=amount=>({type:'sell',from:0,to:1,index:1,amount});
  assert.equal(BOT.accept(b,sell(60*K.acceptMonopolyFactor)),true);
  assert.equal(BOT.accept(b,sell(60*K.acceptMonopolyFactor+1)),false);
  b.players[1].cash=60+K.reserve-1;assert.equal(BOT.accept(b,sell(60)),false);
  const plain=B.create(false,0);plain.deeds[j].owner=0;
  assert.equal(BOT.accept(plain,{type:'sell',from:0,to:1,index:j,amount:pj}),true);
  assert.equal(BOT.accept(plain,{type:'sell',from:0,to:1,index:j,amount:pj+1}),false);
  b.players[1].cash=1500;const done=BOT.applyOffer(b,sell(60));assert.equal(done.deeds[1].owner,1);assert.equal(done.players[0].cash,1560);
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
    if(act.kind==='next'){turn[p]++;p=1-p;b=B.beginTurn(b);m={asked:false,swapAsked:false,fundAsked:[],offers:m.offers};card=null;steps=0;continue;}
    if(act.kind==='bankrupt')return {stats,winner:1-act.who,turns:turn[0]+turn[1]};
    if(['wait','auctionHuman','humanFunds'].includes(act.kind))throw Error(`seed ${seed}: 두 봇 판에서 나오면 안 되는 행동 ${act.kind}`);
    if(act.kind==='draw'){const x=BOT.drawCard(decks,act.deck,b.players.some(v=>v.cards>0),random);decks=x.decks;card={deck:act.deck,id:x.id};continue;}
    if(act.kind==='offer'){if(act.type==='sell')m.fundAsked=[...m.fundAsked,act.index];else if(act.type==='swap'){m.swapAsked=true;m.offers[BOT.swapKey(act.give,act.take)]=turn[act.from];}else{m.asked=true;m.offers[act.index]=turn[act.from];}if(BOT.accept(b,act)){b=BOT.applyOffer(b,act);count(act.type==='swap'?'swap':'trade');}continue;}
    b=BOT.apply(b,p,act,random);if(act.kind==='card')card=null;
    if(!B.valid(b))throw Error(`seed ${seed}: 기록 깨짐 after ${JSON.stringify(act)}`);
  }
  return {stats,winner:null,turns:maxTurns};
}

test('100 bot-vs-bot games stay valid, never stall, and actually build, mortgage, release and trade',()=>{
  const total={};let finished=0;
  for(let seed=1;seed<=100;seed++){const r=simulate(seed);if(r.winner!==null)finished++;for(const [k,v] of Object.entries(r.stats))total[k]=(total[k]??0)+v;}
  for(const k of ['build','mortgage','release','trade','swap','buy','decline','card','pay','sell'])assert.ok(total[k]>0,k+' 0회');
  assert.ok(finished>0,'파산으로 끝난 판 0');
  console.log('# bot sim',JSON.stringify({finished,...total}));
});
