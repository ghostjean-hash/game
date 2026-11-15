(function () {
  'use strict';
  // 오토 봇 판단(planning.html 0.19). 화면과 무관한 순수 함수만 둔다. 판 변경은 MC_BOARD 기록 함수만 쓴다.
  const D=globalThis.MC_DATA,B=globalThis.MC_BOARD,K=D.bot;
  const tileKind=i=>D.board[i][1],price=i=>D.board[i][2];
  const owned=(b,p)=>Object.keys(b.deeds).map(Number).filter(i=>b.deeds[i].owner===p);
  const ok=fn=>{try{fn();return true;}catch{return false;}};
  // p 가 i 를 가지면 그 색이 완성되는가(나머지 칸을 p 가 전부 가짐).
  const completes=(b,p,i)=>B.isStreet(i)&&B.group(i).every(j=>j===i||b.deeds[j].owner===p);
  const hasOther=(b,p,i)=>B.isStreet(i)&&B.group(i).some(j=>j!==i&&b.deeds[j].owner===p);
  const inSet=(b,p,i)=>B.isStreet(i)&&B.ownsSet(b,p,i);
  const unowned=b=>Object.values(b.deeds).filter(d=>d.owner===null).length;
  const releaseCost=(b,i)=>Math.ceil(b.deeds[i].mortgage*110/100);
  // 땅을 팔 때 받을 값: 저당 잡힌 땅은 땅값에서 저당금을 뺀 값(산 쪽이 저당을 떠안는다).
  const equity=(b,i)=>b.deeds[i].mortgaged?price(i)-b.deeds[i].mortgage:price(i);
  const byMortgage=b=>(x,y)=>b.deeds[x].mortgage-b.deeds[y].mortgage;
  const die=(random=Math.random)=>1+Math.floor(random()*6);

  function shuffle(ids,random=Math.random){const a=[...ids];for(let k=a.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[a[k],a[j]]=[a[j],a[k]];}return a;}
  // 카드 더미: 섞어 엎어 둔 순서에서 위부터 한 장. 다 뽑으면 다시 섞는다. 보유 중인 감옥 탈출 카드는 다시 섞을 때 뺀다.
  function drawCard(decks,deck,heldEscape,random=Math.random){
    const ids=D.cards[deck].map(c=>c.id),st=decks?.[deck];
    let order=st?.order,next=Number.isInteger(st?.next)?st.next:0;
    if(!Array.isArray(order)||!order.every(id=>ids.includes(id))||next<0||next>=order.length){order=shuffle(ids.filter(id=>!(heldEscape&&id==='escape')),random);next=0;}
    return {decks:{...(decks??{}),[deck]:{order,next:next+1}},id:order[next]};
  }

  function wantBuy(b,p,i){
    const key=completes(b,p,i)||completes(b,1-p,i);
    const reserve=key?K.reserveKey:tileKind(i)==='utility'?K.utilityReserve:K.reserve;
    return b.players[p].cash-price(i)>=reserve;
  }
  // 두 봇 경매: 상한이 높은 쪽이 진 쪽 상한 + 한 호가(자기 상한까지)에 낙찰. 둘 다 최소가 미만이면 유찰.
  function auction(b,i,current){
    const caps=[0,1].map(p=>{const base=price(i)*(completes(b,p,i)||completes(b,1-p,i)?K.auctionKeyFactor:1);return Math.floor(Math.min(base,b.players[p].cash-K.auctionCashKeep));});
    const winner=caps[current]>=caps[1-current]?current:1-current;
    if(caps[winner]<K.auctionMin)return {winner:null,bid:null};
    return {winner,bid:Math.max(K.auctionMin,Math.min(caps[1-winner]+K.auctionStep,caps[winner]))};
  }
  // 거래 실행: 판 쪽(seller)이 땅을 넘기고 산 쪽이 amount 를 낸다.
  function applyOffer(b,offer){
    const seller=offer.type==='sell'?offer.from:offer.to;
    return seller===0?B.trade(b,offer.index,null,0,offer.amount):B.trade(b,null,offer.index,offer.amount,0);
  }
  function accept(b,offer){
    const r=offer.to,i=offer.index;
    if(!ok(()=>applyOffer(b,offer)))return false;
    if(offer.type==='buy'){
      if(hasOther(b,r,i))return false;
      const factor=completes(b,offer.from,i)?K.acceptMonopolyFactor:K.acceptSellFactor;
      return offer.amount>=price(i)*factor;
    }
    const fee=b.deeds[i].mortgaged?Math.ceil(b.deeds[i].mortgage*10/100):0;
    return b.players[r].cash-offer.amount-fee>=K.reserve&&offer.amount<=equity(b,i);
  }
  // 돈이 모자랄 때 땅 하나를 땅값에 사 달라는 요청. 상대가 그 땅으로 색을 완성하게 되는 땅은 내놓지 않는다.
  function sellOffer(b,p,need){
    const o=1-p,short=need-b.players[p].cash;
    const list=owned(b,p).filter(i=>!inSet(b,p,i)&&!completes(b,o,i)&&equity(b,i)>0&&b.players[o].cash>=equity(b,i)).sort((x,y)=>equity(b,x)-equity(b,y));
    if(!list.length)return null;
    const index=list.find(i=>equity(b,i)>=short)??list.at(-1);
    return {kind:'offer',type:'sell',from:p,to:o,index,amount:equity(b,index)};
  }
  function raise(b,p,need,allowTrade){
    const mine=owned(b,p);
    for(const i of mine.filter(i=>!b.deeds[i].mortgaged&&!inSet(b,p,i)).sort(byMortgage(b)))if(ok(()=>B.mortgage(b,p,i)))return {kind:'mortgage',who:p,index:i};
    if(allowTrade){const t=sellOffer(b,p,need);if(t)return t;}
    const built=mine.filter(i=>b.deeds[i].buildings>0).sort((x,y)=>(b.deeds[x].houseCost-b.deeds[y].houseCost)||(B.level(b,b.deeds[y])-B.level(b,b.deeds[x])));
    for(const i of built)if(ok(()=>B.sell(b,p,i)))return {kind:'sell',who:p,index:i};
    for(const i of built)if(ok(()=>B.sell(b,p,i,true)))return {kind:'sellAll',who:p,index:i};
    for(const i of mine.filter(i=>!b.deeds[i].mortgaged).sort(byMortgage(b)))if(ok(()=>B.mortgage(b,p,i)))return {kind:'mortgage',who:p,index:i};
    return {kind:'bankrupt',who:p};
  }
  // 차례 시작: 독점 색 저당 풀기 → 건설 → 나머지 저당 풀기. 실행 뒤 여유 돈이 남는 만큼만.
  function improve(b,p){
    const cash=b.players[p].cash,keep=K.keepAfterImprove,mine=owned(b,p);
    const release=list=>list.sort((x,y)=>releaseCost(b,x)-releaseCost(b,y)).find(i=>cash-releaseCost(b,i)>=keep);
    let i=release(mine.filter(i=>b.deeds[i].mortgaged&&inSet(b,p,i)));
    if(i!==undefined)return {kind:'release',who:p,index:i};
    let best=null;
    for(const j of mine){
      const d=b.deeds[j];if(!inSet(b,p,j)||d.houseCost===null||cash-d.houseCost<keep)continue;
      let next;try{next=B.build(b,p,j);}catch{continue;}
      const gain=(B.rentInfo(next,j).amount-B.rentInfo(b,j).amount)/d.houseCost;
      if(!best||gain>best.gain)best={index:j,gain};
    }
    if(best)return {kind:'build',who:p,index:best.index};
    i=release(mine.filter(i=>b.deeds[i].mortgaged));
    return i===undefined?null:{kind:'release',who:p,index:i};
  }
  // 색 맞추기 제안: 남은 한 칸을 상대가 가진 색이면 땅값의 배수로 사겠다고 제안. 같은 땅은 쿨타임 동안 다시 제안하지 않는다.
  function setOffer(b,p,ctx){
    const o=1-p;
    for(const i of owned(b,o)){
      if(!completes(b,p,i))continue;
      const last=ctx.memo?.offers?.[i];if(last!==undefined&&ctx.turnNo-last<K.offerCooldownTurns)continue;
      const offer={kind:'offer',type:'buy',from:p,to:o,index:i,amount:Math.round(price(i)*K.setOfferFactor)};
      if(b.players[p].cash-offer.amount<K.reserve||!ok(()=>applyOffer(b,offer)))continue;
      return offer;
    }
    return null;
  }
  // 카드 지시가 돈을 요구하면 누가 얼마를 내는지.
  function cardNeed(b,p,card){
    const c=B.cardSummary(b,p,card.deck,card.id);
    if(['give','repairs','otherGive'].includes(c.action)&&c.amount>0)return {who:p,amount:c.amount};
    if(c.action==='otherReceive'&&c.amount>0)return {who:1-p,amount:c.amount};
    return null;
  }
  // 다음 행동 하나. ctx = {opponentAuto, turnNo, memo:{asked, offers}, card:{deck,id}|null}
  function decide(b,p,ctx){
    const me=b.players[p],q=b.pending;
    if(b.phase==='end')return {kind:'next'};
    if(b.phase==='roll'){
      const up=improve(b,p);if(up)return up;
      if(!ctx.memo?.asked){const offer=setOffer(b,p,ctx);if(offer)return offer;}
      if(me.jail&&unowned(b)>=K.jailEarlyUnowned){if(me.cards>0)return {kind:'jailCard'};if(me.cash>=50)return {kind:'jailPay'};}
      return {kind:'roll'};
    }
    if(!q)return {kind:'wait'};
    if(q.type==='info')return {kind:'ack'};
    if(q.type==='buy'){if(me.cash>=q.amount&&wantBuy(b,p,q.index))return {kind:'buy'};return ctx.opponentAuto?{kind:'decline'}:{kind:'auctionHuman'};}
    if(q.type==='card'){
      if(!ctx.card)return {kind:'draw',deck:tileKind(q.index)};
      const need=cardNeed(b,p,ctx.card);
      if(need&&b.players[need.who].cash<need.amount){
        if(need.who!==p&&!ctx.opponentAuto)return {kind:'humanFunds',who:need.who};
        return raise(b,need.who,need.amount,need.who===p&&!ctx.memo?.asked);
      }
      return {kind:'card',deck:ctx.card.deck,id:ctx.card.id};
    }
    if(q.type==='rent'&&q.amount===null)return q.kind==='utility'?{kind:'utilityRoll'}:{kind:'fixRent',amount:B.rentInfo(b,q.index).amount??0};
    if(['rent','pay','jailFee'].includes(q.type)){if(me.cash>=q.amount)return {kind:'pay'};return raise(b,p,q.amount,!ctx.memo?.asked);}
    return {kind:'wait'};
  }
  // 판에 행동 적용. 주사위 행동은 action.dice 가 있으면 그 눈을, 없으면 random 으로 굴린다.
  function apply(b,p,action,random=Math.random){
    const dice=action.dice??[die(random),die(random)];
    switch(action.kind){
      case 'roll':return B.roll(b,p,dice[0],dice[1]);
      case 'utilityRoll':return B.utilityRoll(b,dice[0],dice[1]);
      case 'jailCard':return B.jailExit(b,p,'card');
      case 'jailPay':return B.jailExit(b,p,'cash');
      case 'ack':return B.acknowledge(b);
      case 'buy':return B.purchase(b,p);
      case 'decline':{const r=auction(b,b.pending.index,p);return B.purchase(b,p,r.winner,r.bid);}
      case 'card':return B.printedCard(b,p,action.deck,action.id);
      case 'fixRent':return B.recordRent(b,action.amount,true);
      case 'pay':return B.pay(b,p);
      case 'mortgage':case 'release':return B.mortgage(b,action.who,action.index);
      case 'build':return B.build(b,action.who,action.index);
      case 'sell':return B.sell(b,action.who,action.index);
      case 'sellAll':return B.sell(b,action.who,action.index,true);
      case 'offer':return applyOffer(b,action);
      default:throw Error('봇 행동을 확인할 수 없습니다.');
    }
  }
  globalThis.MC_BOT=Object.freeze({decide,apply,auction,accept,applyOffer,drawCard,shuffle,die,wantBuy});
})();
