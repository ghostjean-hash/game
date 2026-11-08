(function () {
  'use strict';
  const D=globalThis.MC_DATA;
  const streets=D.board.map((t,i)=>[t,i]).filter(([t])=>!['go','chest','tax','station','chance','jail','utility','parking','gotojail'].includes(t[1])).map(([,i])=>i);
  const isStreet=i=>streets.includes(i), clone=s=>structuredClone(s);
  const fail=message=>{throw Error(message);};
  function integer(n,min=0,max=D.maxAmount){if(!Number.isSafeInteger(n)||n<min||n>max)fail('숫자를 확인해 주세요.');return n;}
  const group=i=>streets.filter(j=>D.board[j][1]===D.board[i][1]);
  const ownsSet=(s,p,i)=>group(i).every(j=>s.deeds[j].owner===p);
  const cash=(s,p,amount)=>{integer(p,0,1);integer(Math.abs(amount));if(s.players[p].cash+amount<0)fail(D.players[p]+'의 현금이 부족해요. 주택 판매·저당·거래로 돈을 마련하세요.');s.players[p].cash+=amount;};
  const transact=(state,fn)=>{const s=clone(state);fn(s);return s;};
  function create(quick,first,chosenSet='orange'){
    const s={version:1,players:D.players.map(()=>({cash:D.startingCash,pos:0,jail:false,attempts:0,cards:0})),deeds:{},phase:'roll',pending:null,doubles:0,extra:false,dice:null};
    D.board.forEach((t,i)=>{if(isStreet(i)||['station','utility'].includes(t[1]))s.deeds[i]={owner:null,mortgaged:false,mortgage:t[2]/2,buildings:0,houseCost:D.printedDeeds[i]?.house??null,rents:D.printedDeeds[i]?Object.fromEntries(D.printedDeeds[i].rents.map((v,n)=>[n,v])):{}};});
    if(quick)for(const [p,color] of [[first,chosenSet],[1-first,chosenSet==='orange'?'red':'orange']])for(const i of streets.filter(i=>D.board[i][1]===color)){s.deeds[i].owner=p;cash(s,p,-D.board[i][2]);}
    return s;
  }
  function beginTurn(state){return {...clone(state),phase:'roll',pending:null,doubles:0,extra:false,dice:null};}
  function hydrate(state){
    const s=clone(state);
    for(const [i,printed] of Object.entries(D.printedDeeds)){const d=s.deeds[i];d.houseCost=printed.house;d.rents=Object.fromEntries(printed.rents.map((v,n)=>[n,v]));}
    const q=s.pending;if(q?.type==='rent'&&q.kind==='street'){const d=s.deeds[q.index];q.factor=d.buildings===0&&ownsSet(s,d.owner,q.index)?2:1;q.key=String(d.buildings);q.amount=d.rents[q.key]*q.factor;}
    return s;
  }
  function resolve(s){s.pending=null;s.phase=s.extra?'roll':'end';}
  function land(s,p){
    const index=s.players[p].pos,t=D.board[index],deed=s.deeds[index];s.phase='land';
    if(deed){
      if(deed.owner===null){s.pending={type:'buy',index,amount:t[2]};return;}
      if(deed.owner===p){s.pending={type:'info',index,text:'내 부지입니다.'};return;}
      if(deed.mortgaged){s.pending={type:'info',index,text:'저당 부지라 임대료가 없습니다.'};return;}
      let amount=null,kind='fixed',factor=1,key=String(deed.buildings);
      if(t[1]==='station')amount=D.stationRents[Object.entries(s.deeds).filter(([i,d])=>d.owner===deed.owner&&D.board[i][1]==='station').length-1];
      else if(t[1]==='utility'){factor=Object.entries(s.deeds).filter(([i,d])=>D.board[i][1]==='utility'&&d.owner===deed.owner).length===2?10:4;amount=s.dice?((s.dice[0]+s.dice[1])*factor):null;kind='utility';}
      else{kind='street';factor=deed.buildings===0&&ownsSet(s,deed.owner,index)?2:1;if(deed.rents[key]!==undefined)amount=deed.rents[key]*factor;}
      s.pending={type:'rent',index,from:p,to:deed.owner,amount,kind,factor,key};return;
    }
    if(t[1]==='gotojail'){s.players[p].pos=10;s.players[p].jail=true;s.players[p].attempts=0;s.extra=false;s.pending={type:'info',index:10,text:'감옥으로 이동합니다. 이번 차례는 끝입니다.'};return;}
    if(t[1]==='tax'){s.pending={type:'pay',index,amount:t[2],to:null};return;}
    if(['chance','chest'].includes(t[1])){s.pending={type:'card',index};return;}
    s.pending={type:'info',index,text:t[1]==='parking'?'무료 주차장입니다. 돈은 오가지 않습니다.':t[1]==='jail'?'방문입니다. 감옥에 갇힌 것이 아닙니다.':'출발에 도착했습니다.'};
  }
  function move(s,p,steps){const old=s.players[p].pos;if(old+steps>=40)cash(s,p,200);s.players[p].pos=(old+steps+40)%40;land(s,p);}
  function roll(state,p,a,b){return transact(state,s=>{
    integer(a,1,6);integer(b,1,6);if(s.phase!=='roll')fail('도착한 칸부터 처리하세요.');
    s.dice=[a,b];const doubles=a===b;s.extra=false;
    if(s.players[p].jail){s.players[p].attempts++;if(doubles){s.players[p].jail=false;s.players[p].attempts=0;move(s,p,a+b);}else if(s.players[p].attempts>=3){s.phase='land';s.pending={type:'jailFee',amount:50,to:null,index:10,steps:a+b};}else{s.phase='land';s.pending={type:'info',index:10,text:'더블이 아닙니다. 감옥에 머물고 차례를 마칩니다.'};}return;}
    s.doubles=doubles?s.doubles+1:0;
    if(s.doubles===3){s.players[p].pos=10;s.players[p].jail=true;s.players[p].attempts=0;s.phase='land';s.pending={type:'info',index:10,text:'세 번 연속 더블입니다. 이동하지 말고 감옥으로 가세요.'};return;}
    s.extra=doubles;move(s,p,a+b);
  });}
  function jailExit(state,p,method){return transact(state,s=>{if(!s.players[p].jail||s.phase!=='roll')fail('지금은 탈출할 수 없습니다.');if(method==='card'){if(s.players[p].cards<1)fail('탈출 카드가 없습니다.');s.players[p].cards--;}else cash(s,p,-50);s.players[p].jail=false;s.players[p].attempts=0;});}
  function acknowledge(state){return transact(state,s=>{if(s.pending?.type!=='info')fail('먼저 칸을 처리하세요.');resolve(s);});}
  function purchase(state,p,winner=p,bid=null){return transact(state,s=>{if(s.pending?.type!=='buy')fail('살 수 있는 부지가 아닙니다.');if(winner===null){resolve(s);return;}integer(winner,0,1);const index=s.pending.index,price=bid===null?s.pending.amount:integer(bid,10);cash(s,winner,-price);s.deeds[index].owner=winner;resolve(s);});}
  function recordRent(state,amount,override=false){return transact(state,s=>{if(s.pending?.type!=='rent')fail('임대료를 낼 상황이 아닙니다.');integer(amount);const q=s.pending;if(!override&&q.kind==='street'){s.deeds[q.index].rents[q.key]=amount;q.amount=amount*q.factor;}else q.amount=amount;});}
  function pay(state,p){return transact(state,s=>{const q=s.pending;if(!q||!['rent','pay','jailFee'].includes(q.type)||q.amount===null)fail('금액부터 확인하세요.');cash(s,p,-integer(q.amount));if(q.to!==null)cash(s,q.to,q.amount);if(q.type==='jailFee'){s.players[p].jail=false;s.players[p].attempts=0;move(s,p,q.steps);}else resolve(s);});}
  function card(state,p,action,value){return transact(state,s=>{
    if(s.pending?.type!=='card')fail('카드 칸이 아닙니다.');
    if(action==='move'||action==='back'){
      integer(value,0,39);const old=s.players[p].pos;if(action==='move'&&value<old&&value!==30)cash(s,p,200);s.players[p].pos=value;land(s,p);if(s.pending?.type==='rent'){s.pending.amount=null;s.pending.kind='card';s.pending.factor=1;}return;
    }
    if(action==='jail'){s.players[p].pos=10;s.players[p].jail=true;s.players[p].attempts=0;s.extra=false;resolve(s);return;}
    if(action==='escape'){s.players[p].cards++;resolve(s);return;}
    integer(value);
    if(action==='receive')cash(s,p,value);
    else if(action==='give')cash(s,p,-value);
    else if(action==='otherGive'){cash(s,p,-value);cash(s,1-p,value);}
    else if(action==='otherReceive'){cash(s,1-p,-value);cash(s,p,value);}
    else fail('카드 지시를 선택하세요.');resolve(s);
  });}
  function cardSummary(state,p,deck,id){
    const c=D.cards[deck]?.find(c=>c.id===id);if(!c)fail('카드를 확인하세요.');
    const amount=c.action==='repairs'?Object.values(state.deeds).filter(d=>d.owner===p).reduce((n,d)=>n+(d.buildings===5?c.hotel:d.buildings*c.house),0):c.value;
    return {...c,amount};
  }
  function printedCard(state,p,deck,id){return transact(state,s=>{
    if(s.pending?.type!=='card'||D.board[s.pending.index][1]!==deck)fail('지금 뽑은 카드 종류를 확인하세요.');
    const c=cardSummary(s,p,deck,id),old=s.players[p].pos;
    if(c.action==='nearestStation'||c.action==='nearestUtility'){
      const type=c.action==='nearestStation'?'station':'utility';
      const target=Array.from({length:40},(_,n)=>(old+n+1)%40).find(i=>D.board[i][1]===type);
      const moved=card(s,p,'move',target);Object.assign(s,moved);
      if(s.pending?.type==='rent'){
        const d=s.deeds[target];
        if(type==='station'){s.pending.kind='fixed';s.pending.amount=D.stationRents[Object.entries(s.deeds).filter(([i,x])=>x.owner===d.owner&&D.board[i][1]==='station').length-1]*2;}
        else{s.pending.kind='utility';s.pending.factor=10;s.pending.amount=null;}
      }
      return;
    }
    if(c.action==='repairs'){cash(s,p,-c.amount);resolve(s);return;}
    const action=c.action==='backThree'?'back':c.action,value=c.action==='backThree'?(old+37)%40:c.value??0;
    Object.assign(s,card(s,p,action,value));
    if(c.action==='move'||c.action==='backThree'){
      // 일반 이동 카드에는 도착 부지 권리증의 임대료를 적용한다.
      if(s.pending?.type==='rent'){
        const q=s.pending,d=s.deeds[value],type=D.board[value][1];
        if(isStreet(value)){q.kind='street';q.key=String(d.buildings);q.factor=d.buildings===0&&ownsSet(s,d.owner,value)?2:1;q.amount=d.rents[q.key]*q.factor;}
        else if(type==='station'){q.kind='fixed';q.amount=D.stationRents[Object.entries(s.deeds).filter(([i,x])=>x.owner===d.owner&&D.board[i][1]==='station').length-1];}
      }
      if(value===0&&old===0)cash(s,p,200);
    }
  });}
  function utilityRoll(state,a,b){return transact(state,s=>{integer(a,1,6);integer(b,1,6);if(s.pending?.type!=='rent'||s.pending.kind!=='utility'||s.pending.amount!==null)fail('주사위를 새로 굴릴 상황이 아닙니다.');s.pending.amount=(a+b)*s.pending.factor;});}
  function supplies(s){let houses=0,hotels=0;for(const d of Object.values(s.deeds)){if(d.buildings===5)hotels++;else houses+=d.buildings;}return {houses:32-houses,hotels:12-hotels};}
  function build(state,p,index,cost){return transact(state,s=>{
    const d=s.deeds[index];if(!d||d.owner!==p||!isStreet(index)||!ownsSet(s,p,index))fail('같은 색 도시를 전부 가져야 합니다.');
    const same=group(index).map(i=>s.deeds[i]);if(same.some(d=>d.mortgaged))fail('이 색의 저당부터 해제하세요.');if(d.buildings>=5)fail('이미 호텔이 있습니다.');
    if(same.some(x=>x.buildings<d.buildings))fail('주택이 가장 적은 도시에 지으세요.');
    const price=d.houseCost??integer(cost,1);if(d.buildings===4){if(supplies(s).hotels<1)fail('은행에 호텔이 없습니다.');}else if(supplies(s).houses<1)fail('은행에 주택이 없습니다.');
    cash(s,p,-price);for(const i of group(index))s.deeds[i].houseCost=price;d.buildings++;
  });}
  function sell(state,p,index,all=false,cost=null){return transact(state,s=>{
    const d=s.deeds[index];if(!d||d.owner!==p||!d.buildings)fail('팔 건물이 없습니다.');const same=group(index);if(!d.houseCost){const price=integer(cost,1);for(const i of same)s.deeds[i].houseCost=price;}
    if(all){let value=0;for(const i of same){value+=s.deeds[i].buildings*d.houseCost/2;s.deeds[i].buildings=0;}cash(s,p,value);return;}
    if(same.some(i=>s.deeds[i].buildings>d.buildings))fail('건물이 가장 많은 도시에서 먼저 파세요.');
    if(d.buildings===5&&supplies(s).houses<4)fail('은행 주택이 부족합니다. 이 색의 건물을 모두 팔 수 있습니다.');
    d.buildings--;cash(s,p,d.houseCost/2);
  });}
  function mortgage(state,p,index,value=null){return transact(state,s=>{const d=s.deeds[index];if(!d||d.owner!==p)fail('내 부지가 아닙니다.');if(d.mortgaged){cash(s,p,-Math.ceil(d.mortgage*110/100));d.mortgaged=false;return;}if(isStreet(index)&&group(index).some(i=>s.deeds[i].buildings))fail('이 색의 건물을 모두 먼저 파세요.');if(value!==null)d.mortgage=integer(value,1);cash(s,p,d.mortgage);d.mortgaged=true;});}
  function trade(state,fromIndex,toIndex,fromCash,toCash,release0=false,release1=false){return transact(state,s=>{
    integer(fromCash);integer(toCash);
    if(s.pending?.type==='rent'&&[fromIndex,toIndex].includes(s.pending.index))fail('이 부지의 현재 임대료를 먼저 처리하세요.');
    for(const [p,index] of [[0,fromIndex],[1,toIndex]]){if(index===null)continue;const d=s.deeds[index];if(!d||d.owner!==p)fail('선택한 부지의 주인을 확인하세요.');if(isStreet(index)&&group(index).some(i=>s.deeds[i].buildings))fail('거래할 색의 건물을 모두 먼저 파세요.');}
    const net=fromCash-toCash;
    const incoming=[toIndex,fromIndex];const costs=[0,0];
    incoming.forEach((index,p)=>{if(index!==null&&s.deeds[index].mortgaged)costs[p]=Math.ceil(s.deeds[index].mortgage*([release0,release1][p]?110:10)/100);});
    if(s.players[0].cash-net-costs[0]<0||s.players[1].cash+net-costs[1]<0)fail('거래 금액과 저당 인수 비용을 낼 현금이 부족합니다.');
    s.players[0].cash-=net+costs[0];s.players[1].cash+=net-costs[1];
    incoming.forEach((index,p)=>{if(index!==null){s.deeds[index].owner=p;if([release0,release1][p])s.deeds[index].mortgaged=false;}});
  });}
  function correct(state,p,pos,balance){return transact(state,s=>{integer(pos,0,39);integer(balance);s.players[p].pos=pos;s.players[p].cash=balance;});}
  function rentInfo(s,index){
    const d=s.deeds[index],type=D.board[index][1];if(!d||d.owner===null||d.mortgaged)return {amount:0};
    if(isStreet(index))return {amount:d.rents[d.buildings]*(d.buildings===0&&ownsSet(s,d.owner,index)?2:1)};
    const count=Object.entries(s.deeds).filter(([i,x])=>x.owner===d.owner&&D.board[i][1]===type).length;
    return type==='station'?{amount:D.stationRents[count-1]}:{factor:count===2?10:4};
  }
  function tradeReason(s,index){const d=s.deeds[index];if(!d||d.owner===null)return '내 부지가 아닙니다.';if(s.pending?.type==='rent'&&s.pending.index===index)return '이 부지의 임대료부터 처리하세요.';return isStreet(index)&&group(index).some(i=>s.deeds[i].buildings)?'이 색의 건물을 모두 먼저 파세요.':'';}
  function assetOptions(state,p){
    integer(p,0,1);
    const preview=(index,fn)=>{try{const next=fn();return {allowed:true,change:next.players[p].cash-state.players[p].cash,rent:rentInfo(next,index)};}catch(e){return {allowed:false,reason:e.message};}};
    return Object.entries(state.deeds).filter(([,d])=>d.owner===p).map(([key,d])=>{const index=Number(key);return {index,monopoly:isStreet(index)&&ownsSet(state,p,index),rent:rentInfo(state,index),tradeReason:tradeReason(state,index),
      build:isStreet(index)?preview(index,()=>build(state,p,index,d.houseCost)):null,
      sell:d.buildings?preview(index,()=>sell(state,p,index)):null,
      sellAll:d.buildings?preview(index,()=>sell(state,p,index,true)):null,
      mortgage:d.mortgaged?null:preview(index,()=>mortgage(state,p,index)),
      release:d.mortgaged?preview(index,()=>mortgage(state,p,index)):null};});
  }
  function valid(s){
    if(!s||s.version!==1||!Array.isArray(s.players)||s.players.length!==2||!['roll','land','end'].includes(s.phase)||!s.deeds)return false;
    if(!s.players.every(p=>Number.isSafeInteger(p.cash)&&p.cash>=0&&p.cash<=D.maxAmount&&Number.isInteger(p.pos)&&p.pos>=0&&p.pos<40&&typeof p.jail==='boolean'&&(!p.jail||p.pos===10)&&Number.isInteger(p.attempts)&&p.attempts>=0&&p.attempts<=3&&Number.isInteger(p.cards)&&p.cards>=0))return false;
    if(s.dice!==null&&(!Array.isArray(s.dice)||s.dice.length!==2||!s.dice.every(n=>Number.isInteger(n)&&n>=1&&n<=6)))return false;
    const q=s.pending;
    if((s.phase==='land')!==(q!==null))return false;
    if(q&&(typeof q!=='object'||!['buy','info','rent','pay','card','jailFee'].includes(q.type)||!Number.isInteger(q.index)||q.index<0||q.index>39))return false;
    if(q&&['buy','rent','pay','jailFee'].includes(q.type)&&(q.amount!==null&&(!Number.isSafeInteger(q.amount)||q.amount<0||q.amount>D.maxAmount)))return false;
    if(q&&['buy','pay','jailFee'].includes(q.type)&&!Number.isSafeInteger(q.amount))return false;
    if(q?.type==='rent'&&(![0,1].includes(q.from)||![0,1].includes(q.to)||q.from===q.to||!['street','fixed','utility','card'].includes(q.kind)))return false;
    if(q?.type==='jailFee'&&(!Number.isInteger(q.steps)||q.steps<2||q.steps>12))return false;
    const keys=Object.keys(create(false,0).deeds);if(Object.keys(s.deeds).length!==keys.length)return false;
    if(keys.some(i=>s.deeds[i]?.buildings>0&&group(Number(i)).some(j=>!s.deeds[j]||s.deeds[j].owner!==s.deeds[i].owner||s.deeds[j].mortgaged)))return false;
    if(streets.some(i=>{const values=group(i).map(j=>s.deeds[j]?.buildings??0);return Math.max(...values)-Math.min(...values)>1;}))return false;
    return keys.every(i=>{const d=s.deeds[i];return d&&[null,0,1].includes(d.owner)&&typeof d.mortgaged==='boolean'&&Number.isInteger(d.buildings)&&d.buildings>=0&&d.buildings<=(isStreet(Number(i))?5:0)&&(d.owner!==null||!d.buildings&&!d.mortgaged)&&!(d.mortgaged&&d.buildings)&&Number.isSafeInteger(d.mortgage)&&d.mortgage>0&&(d.houseCost===null||Number.isSafeInteger(d.houseCost)&&d.houseCost>0)&&d.rents&&Object.entries(d.rents).every(([k,v])=>/^[0-5]$/.test(k)&&Number.isSafeInteger(v)&&v>=0);})&&Number.isInteger(s.doubles)&&s.doubles>=0&&s.doubles<=3&&typeof s.extra==='boolean'&&supplies(s).houses>=0&&supplies(s).hotels>=0;
  }
  globalThis.MC_BOARD=Object.freeze({create,hydrate,beginTurn,roll,jailExit,acknowledge,purchase,recordRent,pay,card,printedCard,cardSummary,utilityRoll,build,sell,mortgage,trade,correct,supplies,valid,isStreet,group,ownsSet,rentInfo,tradeReason,assetOptions});
})();
