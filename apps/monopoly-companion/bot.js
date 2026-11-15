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
    // 쓴 탈출 카드는 더미 맨 아래로 돌아간다.
    else if(ids.includes('escape')&&!heldEscape&&!order.slice(next).includes('escape'))order=[...order,'escape'];
    return {decks:{...(decks??{}),[deck]:{order,next:next+1}},id:order[next]};
  }

  // 상대 색 완성을 막는 땅: 남길 돈 없이 사고, 모자라면 혼자 땅을 저당 잡아서라도 산다(planning.html 0.19.3 1항).
  const blocks=(b,p,i)=>completes(b,1-p,i);
  const loneMortgage=(b,p)=>owned(b,p).filter(i=>!b.deeds[i].mortgaged&&!mono(b,p,i)).sort(byMortgage(b));
  function wantBuy(b,p,i){
    const reserve=blocks(b,p,i)?K.reserveBlock:completes(b,p,i)?K.reserveKey:tileKind(i)==='utility'?K.utilityReserve:K.reserve;
    return b.players[p].cash-price(i)>=reserve;
  }
  // 막기 땅을 사려고 저당 잡을 땅 하나. 혼자 땅을 다 저당 잡아도 모자라면 null(저당 없이 경매로).
  function blockFunds(b,p,i){
    const list=loneMortgage(b,p).filter(j=>j!==i&&ok(()=>B.mortgage(b,p,j)));
    if(b.players[p].cash+list.reduce((t,j)=>t+b.deeds[j].mortgage,0)<price(i))return null;
    return list.length?{kind:'mortgage',who:p,index:list[0]}:null;
  }
  // 두 봇 경매: 상한이 높은 쪽이 진 쪽 상한 + 한 호가(자기 상한까지)에 낙찰. 둘 다 최소가 미만이면 유찰.
  function auction(b,i,current){
    const caps=[0,1].map(p=>{const base=price(i)*(completes(b,p,i)||completes(b,1-p,i)?K.auctionKeyFactor:1);return Math.floor(Math.min(base,b.players[p].cash-(blocks(b,p,i)?K.auctionBlockKeep:K.auctionCashKeep)));});
    const winner=caps[current]>=caps[1-current]?current:1-current;
    if(caps[winner]<K.auctionMin)return {winner:null,bid:null};
    return {winner,bid:Math.max(K.auctionMin,Math.min(caps[1-winner]+K.auctionStep,caps[winner]))};
  }
  // 거래 실행: 판 쪽(seller)이 땅을 넘기고 산 쪽이 amount 를 낸다.
  function applyOffer(b,offer){
    // 맞교환: from 이 give 를, to 가 take 를 내준다. amount 는 from 이 to 에게 내는 돈(음수면 to 가 낸다).
    if(offer.type==='swap'){const pay=Math.max(offer.amount,0),get=Math.max(-offer.amount,0);
      return offer.from===0?B.trade(b,offer.give,offer.take,pay,get):B.trade(b,offer.take,offer.give,get,pay);}
    const seller=offer.type==='sell'?offer.from:offer.to;
    return seller===0?B.trade(b,offer.index,null,0,offer.amount):B.trade(b,null,offer.index,offer.amount,0);
  }
  // 독점 묶음: 같은 색 도시 전부 · 역 전부 · 공공 기관 전부(planning.html 0.19.3 3항).
  const family=i=>B.isStreet(i)?B.group(i):D.board.map((t,j)=>j).filter(j=>tileKind(j)===tileKind(i));
  // p 가 i 를 가지면 그 묶음을 전부 갖게 되는가.
  const fills=(b,p,i)=>family(i).length>1&&family(i).every(j=>j===i||b.deeds[j]?.owner===p);
  // p 가 i 가 속한 묶음을 이미 전부 가졌는가(내 독점 - 도시 · 역 · 공공 기관).
  const mono=(b,p,i)=>family(i).length>1&&family(i).every(j=>b.deeds[j]?.owner===p);
  const fee=(b,i)=>b.deeds[i].mortgaged?Math.ceil(b.deeds[i].mortgage*10/100):0;
  // 독점을 넘겨주는 값: 땅값의 배수에서 저당금을 뺀 값.
  const monopolyValue=(b,i)=>Math.round(price(i)*K.acceptMonopolyFactor)-(b.deeds[i].mortgaged?b.deeds[i].mortgage:0);
  // 맞교환(0.19.3 8항): 묶음 가치는 그 묶음 땅값 합계, 더 비싼 묶음을 받는 쪽이 차이 × swapBalance 를 낸다.
  const setValue=i=>family(i).reduce((t,j)=>t+price(j),0);
  const swapCash=(give,take)=>Math.round((setValue(take)-setValue(give))*K.swapBalance);
  const swapKey=(give,take)=>'s'+give+'-'+take;
  function swapOffer(b,p,ctx){
    const o=1-p;let best=null;
    for(const give of owned(b,p).filter(i=>fills(b,o,i)))for(const take of owned(b,o).filter(i=>fills(b,p,i)&&!family(i).includes(give))){
      const last=ctx.memo?.offers?.[swapKey(give,take)];if(last!==undefined&&ctx.turnNo-last<K.offerCooldownTurns)continue;
      const offer={kind:'offer',type:'swap',from:p,to:o,give,take,index:give,amount:swapCash(give,take)};
      let next;try{next=applyOffer(b,offer);}catch{continue;}
      if(next.players[p].cash<K.reserve||next.players[o].cash<K.reserve)continue;
      if(!best||setValue(take)>setValue(best.take))best=offer;
    }
    return best;
  }
  function accept(b,offer){
    const r=offer.to,i=offer.index;
    if(!ok(()=>applyOffer(b,offer)))return false;
    if(offer.type==='swap'){
      if(!fills(b,r,offer.give)||!fills(b,offer.from,offer.take))return false;
      return offer.amount>=swapCash(offer.give,offer.take)&&applyOffer(b,offer).players[r].cash>=K.reserve;
    }
    if(offer.type==='buy'){
      // 상대 독점을 만들어 주는 제안은 늘 거절한다. 독점을 넘기는 것은 내가 돈 마련 마지막 단계에서 요청할 때뿐이다.
      if(fills(b,offer.from,i)||hasOther(b,r,i))return false;
      return offer.amount>=price(i)*K.acceptSellFactor;
    }
    const limit=fills(b,r,i)?monopolyValue(b,i):equity(b,i);
    return b.players[r].cash-offer.amount-fee(b,i)>=K.reserve&&offer.amount<=limit;
  }
  // 돈 마련 거래 요청. stage 'safe' = 상대에게 득이 없는 땅을 땅값에, 'last' = 상대 독점을 만드는 땅(배수 값) → 내 독점을 깨는 땅.
  function sellOffer(b,p,need,memo,stage){
    const o=1-p,short=need-b.players[p].cash,oc=b.players[o].cash;
    const asked=i=>memo?.fundAsked===true||(Array.isArray(memo?.fundAsked)&&memo.fundAsked.includes(i));
    const offer=(i,amount)=>({kind:'offer',type:'sell',from:p,to:o,index:i,amount});
    const affordable=(i,amount)=>amount>0&&oc-amount-fee(b,i)>=K.reserve&&ok(()=>applyOffer(b,offer(i,amount)));
    const mine=owned(b,p).filter(i=>!asked(i));
    if(stage==='safe'){
      const list=mine.filter(i=>!mono(b,p,i)&&!fills(b,o,i)&&affordable(i,equity(b,i))).sort((x,y)=>equity(b,x)-equity(b,y));
      if(!list.length)return null;
      const i=list.find(i=>equity(b,i)>=short)??list.at(-1);
      return offer(i,equity(b,i));
    }
    for(const i of mine.filter(i=>fills(b,o,i)).sort((x,y)=>monopolyValue(b,y)-monopolyValue(b,x))){
      const amount=Math.min(monopolyValue(b,i),oc-fee(b,i)-K.reserve);
      if(affordable(i,amount))return offer(i,amount);
    }
    const breaking=mine.filter(i=>mono(b,p,i)&&b.deeds[i].buildings===0&&affordable(i,equity(b,i))).sort((x,y)=>equity(b,x)-equity(b,y));
    if(!breaking.length)return null;
    const i=breaking.find(i=>equity(b,i)>=short)??breaking.at(-1);
    return offer(i,equity(b,i));
  }
  // 돈 마련: 손해가 작은 것부터. memo 가 null 이면 거래 요청 없이(상대 대신 돈을 마련할 때).
  function raise(b,p,need,memo){
    const mine=owned(b,p),trade=memo!==null;
    for(const i of mine.filter(i=>!b.deeds[i].mortgaged&&!mono(b,p,i)).sort(byMortgage(b)))if(ok(()=>B.mortgage(b,p,i)))return {kind:'mortgage',who:p,index:i};
    if(trade){const t=sellOffer(b,p,need,memo,'safe');if(t)return t;}
    const built=mine.filter(i=>b.deeds[i].buildings>0).sort((x,y)=>(b.deeds[x].houseCost-b.deeds[y].houseCost)||(B.level(b,b.deeds[y])-B.level(b,b.deeds[x])));
    for(const i of built)if(ok(()=>B.sell(b,p,i)))return {kind:'sell',who:p,index:i};
    for(const i of built)if(ok(()=>B.sell(b,p,i,true)))return {kind:'sellAll',who:p,index:i};
    for(const i of mine.filter(i=>!b.deeds[i].mortgaged).sort(byMortgage(b)))if(ok(()=>B.mortgage(b,p,i)))return {kind:'mortgage',who:p,index:i};
    if(trade){const t=sellOffer(b,p,need,memo,'last');if(t)return t;}
    return {kind:'bankrupt',who:p};
  }
  // 차례 시작: 독점 색 저당 풀기 → 건설 → 나머지 저당 풀기. 실행 뒤 여유 돈이 남는 만큼만.
  function improve(b,p){
    const cash=b.players[p].cash,keep=K.keepAfterImprove,mine=owned(b,p);
    const release=list=>list.sort((x,y)=>releaseCost(b,x)-releaseCost(b,y)).find(i=>cash-releaseCost(b,i)>=keep);
    let i=release(mine.filter(i=>b.deeds[i].mortgaged&&mono(b,p,i)));
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
  // 다음 행동 하나. ctx = {opponentAuto, turnNo, memo:{asked(색 맞추기 제안), swapAsked(맞교환 제안), fundAsked(이번 차례 돈 마련 거래를 요청한 땅 번호 목록), offers}, card:{deck,id}|null}
  function decide(b,p,ctx){
    const me=b.players[p],q=b.pending;
    if(b.phase==='end')return {kind:'next'};
    if(b.phase==='roll'){
      const up=improve(b,p);if(up)return up;
      if(!ctx.memo?.swapAsked){const swap=swapOffer(b,p,ctx);if(swap)return swap;}
      // 색 맞추기 제안은 상대가 사람일 때만 한다. 상대 봇은 독점을 넘겨주는 제안을 늘 거절한다(0.19.3 5 · 6항).
      if(!ctx.opponentAuto&&!ctx.memo?.asked){const offer=setOffer(b,p,ctx);if(offer)return offer;}
      if(me.jail&&unowned(b)>=K.jailEarlyUnowned){if(me.cards>0)return {kind:'jailCard'};if(me.cash>=50)return {kind:'jailPay'};}
      return {kind:'roll'};
    }
    if(!q)return {kind:'wait'};
    if(q.type==='info')return {kind:'ack'};
    if(q.type==='buy'){if(me.cash>=q.amount&&wantBuy(b,p,q.index))return {kind:'buy'};
      if(blocks(b,p,q.index)){const m=blockFunds(b,p,q.index);if(m)return m;}
      return ctx.opponentAuto?{kind:'decline'}:{kind:'auctionHuman'};}
    if(q.type==='card'){
      if(!ctx.card)return {kind:'draw',deck:tileKind(q.index)};
      const need=cardNeed(b,p,ctx.card);
      if(need&&b.players[need.who].cash<need.amount){
        if(need.who!==p&&!ctx.opponentAuto)return {kind:'humanFunds',who:need.who};
        return raise(b,need.who,need.amount,need.who===p?ctx.memo??{}:null);
      }
      return {kind:'card',deck:ctx.card.deck,id:ctx.card.id};
    }
    if(q.type==='rent'&&q.amount===null)return q.kind==='utility'?{kind:'utilityRoll'}:{kind:'fixRent',amount:B.rentInfo(b,q.index).amount??0};
    if(['rent','pay','jailFee'].includes(q.type)){if(me.cash>=q.amount)return {kind:'pay'};return raise(b,p,q.amount,ctx.memo??{});}
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
  globalThis.MC_BOT=Object.freeze({decide,apply,auction,accept,applyOffer,drawCard,shuffle,die,wantBuy,swapKey});
})();
