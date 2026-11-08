(function () {
  'use strict';
  const D=MC_DATA,C=MC,B=MC_BOARD,root=document.getElementById('app'),dialog=document.getElementById('rule-dialog'),confirmDialog=document.getElementById('confirm-dialog');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const moneyText=n=>'M'+Number(n).toLocaleString('ko-KR');
  const money=n=>`<span class="money"><span class="currency-symbol">M</span><span class="money-digits">${Number(n).toLocaleString('ko-KR')}</span></span>`;
  const richText=text=>esc(text).replace(/M\s?(\d[\d,]*)/g,(_,digits)=>money(Number(digits.replaceAll(',',''))));
  const pips=[[],[5],[1,9],[1,5,9],[1,3,7,9],[1,3,5,7,9],[1,3,4,6,7,9]];
  const dieFace=(index,value)=>`<button type="button" role="radio" aria-checked="${diceSelection[index]===value}" aria-label="${index===0?'첫 번째':'두 번째'} 주사위 ${value}" class="die-face ${diceSelection[index]===value?'selected':''}" data-die="${index}" data-value="${value}"><span class="pip-grid" aria-hidden="true">${pips[value].map(pos=>`<i style="grid-area:${Math.floor((pos-1)/3)+1} / ${(pos-1)%3+1}"></i>`).join('')}</span></button>`;

  const buildingPiece=hotel=>`<svg class="building-piece ${hotel?'hotel':'house'}" viewBox="0 0 ${hotel?36:20} 20" aria-hidden="true"><path d="${hotel?'M1 8 8 2h20l7 6v11H1Z':'M1 9 10 1l9 8v10H1Z'}" fill="currentColor" stroke="${hotel?'#9c3d39':'#28603d'}" stroke-width="1.2"/><path d="${hotel?'M9 19v-7h5v7m8-7h5v4h-5Z':'M8 19v-7h4v7'}" fill="#fff9"/></svg>`;
  function buildingYard(i,d){if(!B.isStreet(i))return '';let hotel=buildingPiece(true);if(i>10&&i<20||i>30)hotel=hotel.replace('viewBox="0 0 36 20"','viewBox="0 0 20 36"').replace('<path','<g transform="translate(20 0) rotate(90)"><path').replace('</svg>','</g></svg>');return `<span class="building-yard" aria-label="${d.buildings===5?'호텔 1채':`주택 ${d.buildings}채`}">${d.buildings===5?hotel:Array.from({length:d.buildings},()=>buildingPiece(false)).join('')}</span>`;}
  function dicePicker(formId='dice-form'){return `<form id="${formId}" class="dice-form">${[0,1].map(index=>`<fieldset class="dice-picker"><legend>${index===0?'첫 번째':'두 번째'}</legend><div role="radiogroup" aria-label="${index===0?'첫 번째':'두 번째'} 주사위 면" class="dice-faces">${[1,2,3,4,5,6].map(value=>dieFace(index,value)).join('')}</div></fieldset>`).join('')}<button class="primary dice-submit" type="submit" ${diceSelection.some(n=>n===null)?'disabled':''}>${formId==='dice-form'?'이동':'임대료 계산'}</button></form>`;}
  function artwork(index){const type=D.board[index][1];return ({go:'go',parking:'parking',chest:'chest',station:'station',utility:index===12?'electric':'water',tax:index===4?'income-tax':'luxury',jail:'prison',gotojail:'police',chance:index===7?'chance':index===22?'chance-blue':'chance-orange'})[type]??null;}
  const tileName=i=>D.board[i][0];
  const tileOption=i=>['chest','chance'].includes(D.board[i][1])?tileName(i)+' ('+tileName((i+39)%40)+' 다음)':tileName(i);
  const button=(text,attr='',kind='secondary')=>`<button type="button" class="${kind}" ${attr}>${text}</button>`;
  const field=(label,id,value='',extra='')=>`<label for="${id}">${label}</label><input id="${id}" type="number" min="0" max="${D.maxAmount}" step="1" inputmode="numeric" value="${value}" ${extra}>`;
  const tileOptions=(selected=0)=>D.board.map((t,i)=>`<option value="${i}" ${i===selected?'selected':''}>${tileOption(i)}</option>`).join('');
  let s=load(),home=true,undo=null,draft=s?.screen==='setup'?structuredClone(s):C.createSession(D.players,45,true,0),managerId=null,path=[],pendingNew=false,diceSelection=[null,null],diceContext=null;
  function load(){try{const v=JSON.parse(localStorage.getItem(D.storageKey));if(!C.valid(v)||v.board&&!B.valid(v.board))return null;if(v.board)v.board=B.hydrate(v.board);if(v.names[0]==='나'&&v.names[1]==='딸')v.names=[...D.players];return v;}catch{return null;}}
  function save(){try{localStorage.setItem(D.storageKey,JSON.stringify(s));document.getElementById('save-warning').hidden=localStorage.getItem(D.storageKey)===JSON.stringify(s);}catch{document.getElementById('save-warning').hidden=false;}}
  function render(){root.className='';if(home||s?.screen==='setup')return preparation();({play:play,finish:finish,score:score,result:result}[s.screen])();}
  function set(next){s=next;save();render();}
  function heading(title,back=true){return `<div class="screen-head"><h1 tabindex="-1">${title}</h1>${back?button('준비','data-action="home"'):''}</div>`;}
  function error(message){const el=document.getElementById(dialog.open?'dialog-error':'action-error');if(el){el.textContent=message;el.hidden=false;el.focus();}}
  function open(title,body,wide=false){dialog.className=wide?'wide-dialog':'';document.getElementById('rule-content').innerHTML=`<div class="dialog-head"><h2 id="rule-title" tabindex="-1">${richText(title)}</h2>${button('×','data-close aria-label="닫기"','icon-button')}</div>${body}<p id="dialog-error" class="error" role="alert" tabindex="-1" hidden></p>`;if(!dialog.open)dialog.showModal();else document.getElementById('rule-title').focus({preventScroll:true});dialog.scrollTop=0;}
  function preparation(){
    const d=draft,colors=[d.chosenSet,d.chosenSet==='orange'?'red':'orange'];
    root.className='is-preparing';
    root.innerHTML=`<div class="prep-heading"><h1>게임 준비</h1>${s&&s.screen!=='setup'?button(s.screen==='result'?'결과 보기':'이어서 하기','data-action="resume"'):''}</div><div class="prep-layout"><section class="prep-config"><fieldset><legend>시간</legend><div class="segmented">${D.durations.map(n=>button(n+'분',`data-duration="${n}" aria-pressed="${n===d.minutes}"`,n===d.minutes?'primary':'secondary')).join('')}</div></fieldset><fieldset><legend>준비 방식</legend><div class="segmented">${button('단축','data-quick="true" aria-pressed="'+d.quick+'"',d.quick?'primary':'secondary')}${button('기본','data-quick="false" aria-pressed="'+!d.quick+'"',!d.quick?'primary':'secondary')}</div></fieldset><fieldset><legend>선공 · 주사위 큰 수부터</legend><div class="segmented">${D.players.map((n,i)=>button(n,`data-first="${i}" aria-pressed="${d.first===i}"`,d.first===i?'primary':'secondary')).join('')}</div></fieldset><div class="prep-duration"><strong>${d.minutes-D.reserveMinutes}<span>분 플레이</span></strong><p>준비·결산 약 10분</p></div></section><div class="prep-table">
    <section class="money-prep"><h2>각자 ${money(D.startingCash)} 받기</h2><div class="banknotes">${D.money.map(([v,n])=>`<div class="note-${v}"><strong>${money(v)}</strong><span>${n}장</span></div>`).join('')}</div></section>
    <div class="prep-players">${D.players.map((n,p)=>{const color=colors[p===d.first?0:1],v=D.sets[color];return `<section class="prep-player player-${p}"><div class="prep-player-head"><span class="person-mark">${n.slice(0,1)}</span><h2>${n}</h2>${d.quick?`<span class="set-tag">${v.name}</span>`:''}</div><div class="prep-allocation">${d.quick?`<p class="cities">${v.cities.join(' · ')}</p><p class="purchase-cost">부지값 ${money(v.cost)} 내기</p>`:'<p class="cities">권리증은 은행에 두기</p>'}</div><div class="cash-left"><span>남길 현금</span><strong>${money(D.startingCash-(d.quick?v.cost:0))}</strong></div></section>`;}).join('')}</div>
    <div class="placement"><p><strong>말</strong><span>출발에 놓기</span></p><p><strong>카드</strong><span>찬스·사회사업기금 각각 섞기</span></p><p><strong>은행</strong><span>남은 돈·권리증·건물 모아두기</span></p></div>
    </div></div><div class="prep-bottom"><p>${d.quick?'단축 규칙: 색 세트 미리 구입 · ':''}시간제 결산</p>${button('게임 시작 <span aria-hidden="true">→</span>','data-action="start"','primary')}</div>`;
  }
  function start(){home=false;undo=null;diceContext=null;const next=C.createSession(D.players,draft.minutes,draft.quick,draft.first);next.chosenSet=draft.chosenSet;next.screen='play';next.runningSince=Date.now();next.board=B.create(next.quick,next.first,next.chosenSet);set(next);}
  function timerHeader(){return `<div class="session-dock"><span id="timer" role="timer" aria-label="남은 시간"></span><div class="session-controls">${button(s.runningSince===null?'계속':'일시정지','data-action="pause"')}${button('마무리','data-action="end"')}${button('준비','data-action="home"')}</div></div>`;}
  function play(){
    const p=C.current(s);
    root.className='is-playing';const nextContext=s.board?[...s.turns,p,s.board.phase,...(s.board.dice??[])].join('|'):null;if(diceContext!==nextContext){diceSelection=[null,null];diceContext=nextContext;}
    if(!s.board){root.innerHTML=timerHeader()+`<section class="legacy"><h2>${esc(s.names[p])} 차례</h2><p>이 판에는 말·현금 기록이 없습니다.</p>${button('현재 판 입력','data-action="import"','primary')}<div class="guide-list">${D.rules.map(r=>button(r.title,`data-rule="${r.id}"`)).join('')}</div>${button('차례 마침','data-action="legacy-next"')}<p id="action-error" class="error" role="alert" hidden></p></section>`;updateTimer();return;}
    const b=s.board;
    root.innerHTML=`<div class="game-shell"><div class="board-stage"><div class="board-map" aria-label="실제 게임판과 같은 40칸">${D.board.map((t,i)=>{let row,col;if(i<=10){row=11;col=11-i;}else if(i<=20){row=21-i;col=1;}else if(i<=30){row=1;col=i-19;}else{row=i-29;col=11;}const deed=b.deeds[i],owner=deed?.owner,owned=owner!==undefined&&owner!==null,art=artwork(i),monopoly=owned&&B.isStreet(i)&&B.ownsSet(b,owner,i);const edge=i<10?'bottom':i<20?'left':i<30?'top':'right';return `<button type="button" class="board-tile ${art?'special':'city'} edge-${edge} ${monopoly?'monopoly':''} ${owned?'owned owner-'+owner:''} ${b.players[p].pos===i?'active-tile':''}" style="grid-row:${row};grid-column:${col}" data-tile="${i}" aria-label="${tileOption(i)}${owned?' · '+esc(s.names[owner])+' 소유':''}${monopoly?' · 독점':''}${deed?.buildings?' · '+(deed.buildings===5?'호텔':'주택 '+deed.buildings+'채'):''}"><span class="tile-content">${art?`<img class="space-icon icon-${art}" src="assets/board/${art}.png" alt="" draggable="false">`:''}<span class="tile-name">${t[0]}</span>${owned?`<span class="deed-owner">${esc(s.names[owner])}</span>`:''}</span>${monopoly?'<span class="monopoly-mark" aria-label="독점">독점</span>':''}${deed?buildingYard(i,deed):''}<span class="pawn-lane">${b.players.map((x,j)=>x.pos===i?`<b class="token token-${j}" aria-label="${esc(s.names[j])} 말">${esc(s.names[j].slice(0,1))}</b>`:'').join('')}</span>${owned&&deed.mortgaged?'<span class="mortgage-mark">저당</span>':''}</button>`;}).join('')}<section class="board-center"><header class="turn-status" aria-label="현재 차례 정보"><span class="turn-avatar player-${p}" aria-hidden="true">${esc(s.names[p].slice(0,1))}</span><div class="turn-identity"><h2>${esc(s.names[p])} 차례</h2><p class="current-place">${tileName(b.players[p].pos)}${b.players[p].jail?' · 수감':''}</p></div><div class="turn-cash">${money(b.players[p].cash)}</div></header><div class="turn-content">${s.ending?`<p class="ending">마지막 라운드 · ${s.targetTurns}차례씩 마치면 결산</p>`:''}${s.note?`<p class="transaction-note" role="status">${richText(s.note)}</p>`:''}<div class="current-task">${task()}</div><p id="action-error" class="error" role="alert" tabindex="-1" hidden></p></div></section></div></div>
    <aside class="game-tools"><div class="tool-menu">${button('보유 부지 · 건물 · 저당','data-action="properties"')}${button('거래','data-action="trade"')}${button('실물과 기록 맞추기','data-action="correct"')}${undo?button('마지막 작업 되돌리기','data-action="undo"'):''}<details><summary>규칙</summary><div class="guide-list">${D.rules.map(r=>button(r.title,`data-rule="${r.id}"`)).join('')}</div></details>${button('파산','data-action="bankrupt"','danger')}</div>${timerHeader()}</aside></div>`;
    updateTimer();
  }
  function task(){
    const b=s.board,p=C.current(s),person=b.players[p],q=b.pending;
    if(b.phase==='roll')return `${person.jail?`<p>감옥 탈출</p><div class="button-row">${button(money(50)+' 내기','data-board="jail-pay"')}${person.cards?button('탈출 카드 사용','data-board="jail-card"'):''}</div>`:''}<p class="dice-instruction">${person.jail?'더블 시도':b.extra?'더블 · 한 번 더 굴리세요.':'실물 주사위의 면을 고르세요.'}</p>${dicePicker()}`;
    if(b.phase==='end')return `${button('차례 마침','data-board="next" '+(s.runningSince===null?'disabled':''),'primary')}`;
    if(!q)return '';
    if(q.type==='info')return `<p>${esc(q.text)}</p>${button('확인','data-board="ack"','primary')}`;
    if(q.type==='buy')return `<p>주인 없는 부지 · ${money(q.amount)}</p><div class="button-row">${button('구입','data-board="buy"','primary')}${button('경매','data-action="auction"')}</div>`;
    if(q.type==='rent'){
      if(q.amount===null&&q.kind==='utility')return `<p class="dice-instruction">실물 주사위를 새로 굴리세요. · ${q.factor}배</p>${dicePicker('utility-dice-form')}`;
      if(q.amount===null)return `<p>${esc(s.names[q.to])} 소유</p><form id="rent-form">${field(q.kind==='street'?(b.deeds[q.index].buildings===0?'권리증의 기본 임대료':b.deeds[q.index].buildings===5?'호텔 임대료':'주택 '+b.deeds[q.index].buildings+'채 임대료'):q.kind==='card'?'카드가 지정한 임대료':'카드의 주사위를 굴려 계산한 임대료','rent-input','','required')} ${q.kind==='street'&&q.factor===2?'<p>색 세트: 입력한 기본 임대료의 두 배 적용</p>':''}<button class="primary" type="submit">금액 확인</button></form>`;
      return `<p>${esc(s.names[q.to])}에게 <strong>${money(q.amount)}</strong> 내세요.</p>${button('돈을 냈어요','data-board="pay"','primary')}${button('금액 수정','data-action="rent-adjust"')}`;
    }
    if(q.type==='pay'||q.type==='jailFee')return `<p>${q.type==='jailFee'?'세 번째 탈출 실패 · ':''}은행에 <strong>${money(q.amount)}</strong> 내세요.</p>${button('돈을 냈어요','data-board="pay"','primary')}`;
    if(q.type==='card')return `<p>${tileName(q.index)} 카드를 뽑으세요.</p><div class="card-actions">${button('뽑은 카드 선택','data-action="card-pick"','primary')}${button('직접 입력','data-action="card-other"')}</div>`;
    return '';
  }
  function run(fn,note='',close=false){try{const before=structuredClone(s),board=fn(s.board);if(!B.valid(board))throw Error('기록을 확인할 수 없습니다.');undo=before;s={...s,board,note,scores:[null,null]};save();if(close)dialog.close();play();return true;}catch(e){error(e.message);return false;}}
  function updateTimer(){if(home||s?.screen!=='play')return;const rem=C.remaining(s,Date.now());if(rem===0&&!s.ending){s=C.requestFinish(s);save();play();return;}const el=document.getElementById('timer');if(el){const sec=Math.ceil(rem/1000);el.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}}
  function portfolio(p){const b=s.board;open('보유 부지 · 건물 · 저당',`<div class="portfolio-head"><div class="segmented">${s.names.map((n,i)=>button(esc(n),`data-portfolio="${i}" aria-pressed="${i===p}"`,i===p?'primary':'secondary')).join('')}</div><strong>${money(b.players[p].cash)}</strong></div><div class="portfolio-list">${Object.entries(b.deeds).filter(([,d])=>d.owner===p).map(([i,d])=>button(tileName(Number(i))+(d.mortgaged?' · 저당':d.buildings===5?' · 호텔':d.buildings?' · 주택 '+d.buildings+'채':''),`data-tile="${i}"`)).join('')||'<p>없음</p>'}</div>`);}
  function property(index){
    const d=s.board.deeds[index],t=D.board[index];if(!d){showRule(t[1]==='tax'?'tax':['chance','chest'].includes(t[1])?'card':['jail','gotojail'].includes(t[1])?'jail':'corner');return;}
    const p=d.owner;
    open(t[0],`<p>${p===null?'은행 소유':esc(s.names[p])+' 소유'} · 부지값 ${money(t[2])}</p>${p!==null&&B.isStreet(index)&&B.ownsSet(s.board,p,index)?'<p class="monopoly-description">★ 독점 · 건물 없이 임대료 두 배</p>':''}${D.printedDeeds[index]?`<div class="rent-schedule">${D.printedDeeds[index].rents.map((v,n)=>`<span class="${d.buildings===n?'current-rent':''}"><small>${n===0?'기본':n===5?'호텔':'주택 '+n}</small>${money(v)}</span>`).join('')}</div><p>주택·호텔 한 채 ${money(d.houseCost)}</p>`:''}${d.buildings?`<p>${d.buildings===5?'호텔':'주택 '+d.buildings+'채'}</p>`:''}${p!==null?`<div class="property-actions">${B.isStreet(index)?`${d.houseCost===null?field('권리증의 주택 한 채 가격','house-cost','','required'):''}${button('주택/호텔 한 채 건설',`data-property="build" data-index="${index}"`)}${d.buildings?button('건물 한 채 판매',`data-property="sell" data-index="${index}"`)+button('이 색 건물 모두 판매',`data-property="sell-all" data-index="${index}"`):''}`:''}${d.mortgaged?button('저당 해제 '+money(Math.ceil(d.mortgage*110/100)),`data-property="mortgage" data-index="${index}"`):button('저당 잡히기 '+money(d.mortgage),`data-property="mortgage" data-index="${index}"`)}</div>`:''}<details><summary>실물 권리증과 기록 맞추기</summary><form id="deed-correct" data-index="${index}"><label for="deed-owner">주인</label><select id="deed-owner"><option value="" ${p===null?'selected':''}>은행</option>${s.names.map((n,i)=>`<option value="${i}" ${p===i?'selected':''}>${esc(n)}</option>`).join('')}</select>${B.isStreet(index)?`<label for="deed-buildings">건물</label><select id="deed-buildings">${[0,1,2,3,4,5].map(n=>`<option value="${n}" ${d.buildings===n?'selected':''}>${n===5?'호텔':n+'채'}</option>`).join('')}</select>`:''}<label class="check"><input id="deed-mortgaged" type="checkbox" ${d.mortgaged?'checked':''}>저당</label><button class="primary">기록 수정</button></form></details>`);
  }
  function auction(){open(tileName(s.board.pending.index)+' 경매',`<p>${money(10)}부터, ${money(1)} 이상 올려 부르세요.</p><form id="auction-form"><label for="auction-winner">낙찰자</label><select id="auction-winner">${s.names.map((n,i)=>`<option value="${i}">${esc(n)}</option>`).join('')}</select>${field('마지막에 부른 금액','auction-amount','','min="1" required')}<button class="primary">돈을 내고 권리증 받기</button></form>${button('아무도 입찰 안 함','data-board="no-bid"')}`);}
  function cardList(){const deck=D.board[s.board.pending.index][1];open(tileName(s.board.pending.index),`<div class="card-catalog">${D.cards[deck].map(c=>button(esc(c.title),`data-card-id="${c.id}"`)).join('')}</div>${button('사진에 없는 카드 · 직접 입력','data-action="card-other"')}`,true);}
  function cardPreview(id){const p=C.current(s),deck=D.board[s.board.pending.index][1],c=B.cardSummary(s.board,p,deck,id);let instruction;
    if(c.action==='receive')instruction=`은행에서 ${money(c.amount)} 받으세요.`;
    else if(c.action==='give'||c.action==='repairs')instruction=`은행에 ${money(c.amount)} 내세요.`;
    else if(c.action==='otherGive')instruction=`${esc(s.names[1-p])}에게 ${money(c.amount)} 내세요.`;
    else if(c.action==='otherReceive')instruction=`${esc(s.names[1-p])}에게 ${money(c.amount)} 받으세요.`;
    else if(c.action==='jail')instruction='감옥으로 이동하세요. 출발 수입은 없습니다.';
    else if(c.action==='escape')instruction='이 카드는 보관하세요.';
    else if(c.action==='backThree')instruction='세 칸 뒤로 이동하세요.';
    else if(c.action==='nearestStation')instruction='앞으로 가장 가까운 역으로 가세요. 상대 소유라면 임대료 두 배입니다.';
    else if(c.action==='nearestUtility')instruction='앞으로 가장 가까운 공공 기관으로 가세요. 상대 소유라면 주사위를 새로 굴려 10배를 내세요.';
    else instruction=`${tileName(c.value)}${c.value===0?'로':' 칸으로'} 이동하세요.${c.value===0?' 은행에서 '+money(200)+' 받으세요.':' 출발 통과 수입은 자동 반영합니다.'}`;
    open(c.title,`<p class="instruction">${instruction}</p>${c.action==='repairs'?`<p>주택 한 채 ${money(c.house)} · 호텔 한 채 ${money(c.hotel)}</p>`:''}<div class="button-row">${button('처리하기',`data-apply-card="${c.id}"`,'primary')}${button('다른 카드','data-action="card-pick"')}</div>`);
  }
  function cardOther(){open('카드 직접 입력',`<div class="card-actions">${button('돈 주고받기','data-action="card-money"')}${button('이동','data-action="card-move"')}${button('감옥으로','data-board="card-jail"')}${button('탈출 카드 받기','data-board="card-escape"')}</div>`);}
  function cardMoney(){open('카드의 돈 지시',`<form id="card-money-form"><label for="card-direction">지시</label><select id="card-direction"><option value="receive">은행에서 받기</option><option value="give">은행에 내기</option><option value="otherGive">상대방에게 내기</option><option value="otherReceive">상대방에게 받기</option></select>${field('카드의 금액','card-amount','','required')}<button class="primary">처리했어요</button></form>`);}
  function cardMove(){open('카드의 이동 지시',`<form id="card-move-form"><label for="card-destination">도착 칸</label><select id="card-destination">${tileOptions()}</select><label for="card-direction">방향</label><select id="card-direction"><option value="move">앞으로</option><option value="back">뒤로</option></select><button class="primary">이동했어요</button></form>${button('세 칸 뒤로','data-board="back-three"')}`);}
  function trading(){
    open('거래',`<form id="trade-form"><div class="trade-grid">${s.names.map((n,p)=>`<section><h3>${esc(n)}가 줄 것</h3><label for="trade-deed-${p}">권리증</label><select id="trade-deed-${p}"><option value="">없음</option>${Object.entries(s.board.deeds).filter(([,d])=>d.owner===p).map(([i,d])=>`<option value="${i}">${tileName(Number(i))}${d.mortgaged?' · 저당':''}</option>`).join('')}</select>${field('현금','trade-cash-'+p,0)}<label class="check" id="release-label-${p}" hidden><input type="checkbox" id="release-${p}">받는 저당을 즉시 해제</label></section>`).join('')}</div><p id="trade-fees"></p><button class="primary">둘 다 동의 · 거래했어요</button></form>`);tradeFees();
  }
  function tradeFees(){const incoming=[document.getElementById('trade-deed-1').value,document.getElementById('trade-deed-0').value];incoming.forEach((v,p)=>{const applicable=v!==''&&s.board.deeds[v].mortgaged;document.getElementById('release-label-'+p).hidden=!applicable;if(!applicable)document.getElementById('release-'+p).checked=false;});const parts=incoming.flatMap((v,p)=>v!==''&&s.board.deeds[v].mortgaged?[s.names[p]+' 은행 비용 '+moneyText(Math.ceil(s.board.deeds[v].mortgage*(document.getElementById('release-'+p).checked?110:10)/100))]:[]);document.getElementById('trade-fees').innerHTML=richText(parts.join(' · '));}
  function correction(importing=false){
    const b=s.board??B.create(false,0);
    open(importing?'현재 판 입력':'실물과 기록 맞추기',`<form id="correct-form" data-import="${importing}"><div class="trade-grid">${s.names.map((n,p)=>`<section><h3>${esc(n)}</h3>${field('실제 현금','correct-cash-'+p,importing?'':b.players[p].cash,'required')}<label for="correct-pos-${p}">말 위치</label><select id="correct-pos-${p}">${tileOptions(b.players[p].pos)}</select><label class="check"><input type="checkbox" id="correct-jail-${p}" ${b.players[p].jail?'checked':''}>감옥에 수감 중</label></section>`).join('')}</div>${importing?`<h3>권리증 주인</h3><div class="import-deeds">${Object.keys(b.deeds).map(i=>`<label>${tileName(Number(i))}<select data-import-owner="${i}"><option value="">은행</option>${s.names.map((n,p)=>`<option value="${p}">${esc(n)}</option>`).join('')}</select></label>`).join('')}</div><label class="check"><input type="checkbox" required>말·현금·모든 권리증을 대조했습니다.</label><p>건물·저당은 입력 후 해당 부지를 눌러 맞추세요.</p>`:'<p>말 위치를 바꾸면 다음 주사위 입력부터 진행합니다.</p>'}<button class="primary">기록 맞추기</button></form>`,importing);
  }
  function showRule(id){managerId=id;path=['start'];renderGuide();}
  function renderGuide(){const flow=MC_MANAGER.flows(s?.names??D.players)[managerId],n=flow?.[path.at(-1)];if(!n)return;open(n.title,`<p class="instruction">${richText(n.text)}</p>${n.note?`<p>${richText(n.note)}</p>`:''}<div class="guide-choices">${n.choices.map((c,i)=>button(richText(c.label),`data-guide="${c.next}"`,i===0?'primary':'secondary')).join('')}</div>${path.length>1?button('이전','data-action="guide-back"'):''}`);}
  function bankrupt(){open('파산',`<p>건물 판매·저당으로도 빚을 못 갚는 사람</p><div class="button-row">${s.names.map((n,i)=>button(esc(n),`data-bankrupt="${i}"`,'danger')).join('')}</div>`);}
  function finish(){
    root.innerHTML=heading('결산')+`<p>두 사람 모두 ${s.turns[0]}차례를 마쳤습니다.</p><p>현금 + 부지 + 건물 구매금액으로 비교합니다. 저당 부지는 저당 가격입니다.</p><div class="button-row">${button('재산 확인','data-action="score"','primary')}${button('마지막 차례로 돌아가기','data-action="return-play"')}</div>`;
  }
  function score(){
    const b=s.board,fields=['현금','저당 아닌 부지값 합계','저당 부지의 저당값 합계','건물 구매금액 합계'];
    if(b&&s.scores.every(x=>x===null)){s.scores=b.players.map((person,p)=>{const deeds=Object.entries(b.deeds).filter(([,d])=>d.owner===p),unknown=deeds.some(([,d])=>d.buildings&&d.houseCost===null);return [String(person.cash),String(deeds.filter(([,d])=>!d.mortgaged).reduce((a,[i])=>a+D.board[i][2],0)),String(deeds.filter(([,d])=>d.mortgaged).reduce((a,[,d])=>a+d.mortgage,0)),unknown?'':String(deeds.reduce((a,[,d])=>a+d.buildings*(d.houseCost??0),0))];});save();}
    root.innerHTML=heading('재산 확인')+`<form id="score-form"><div class="score-grid">${s.names.map((n,p)=>`<section><h2>${esc(n)}</h2>${fields.map((label,i)=>field(label,`score-${p}-${i}`,esc(s.scores[p]?.[i]??''),'data-score required')).join('')}<p>총자산 <strong id="total-${p}"></strong></p></section>`).join('')}</div><div class="button-row">${button('이전','data-action="finish"')}<button class="primary">결과</button></div></form><p id="action-error" class="error" hidden></p>`;refreshTotals();
  }
  function captureScores(){s.scores=[0,1].map(p=>[0,1,2,3].map(i=>document.getElementById(`score-${p}-${i}`).value));save();}
  function refreshTotals(){[0,1].forEach(p=>{const n=C.total([0,1,2,3].map(i=>document.getElementById(`score-${p}-${i}`).value));document.getElementById('total-'+p).innerHTML=n===null?'입력 필요':money(n);});}
  function result(){root.innerHTML=heading(s.winner==='tie'?'공동 승리':esc(s.names[s.winner])+' 승리',false)+(s.finishReason==='bankruptcy'?'<p>상대방 파산</p>':`<div class="score-grid">${s.names.map((n,p)=>`<section><h2>${esc(n)}</h2><p class="result-amount">${money(C.total(s.scores[p]))}</p></section>`).join('')}</div>`)+`<div class="button-row">${s.finishReason==='time'?button('결산 수정','data-action="score"'):''}${button('새 판 준비','data-action="home"','primary')}</div>`;}
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-close]')){e.target.closest('dialog').close();return;}
    const el=e.target.closest('button');if(!el)return;
    if(el.dataset.die!==undefined){const index=Number(el.dataset.die),value=Number(el.dataset.value);diceSelection[index]=value;for(const face of document.querySelectorAll(`[data-die="${index}"]`)){const checked=Number(face.dataset.value)===value;face.setAttribute('aria-checked',String(checked));face.classList.toggle('selected',checked);}const submit=document.querySelector('.dice-submit');if(submit)submit.disabled=diceSelection.some(n=>n===null);return;}
    if(el.dataset.duration){draft.minutes=Number(el.dataset.duration);return preparation();}
    if(el.dataset.quick){draft.quick=el.dataset.quick==='true';return preparation();}
    if(el.dataset.first){draft.first=Number(el.dataset.first);return preparation();}
    if(el.dataset.rule)return showRule(el.dataset.rule);
    if(el.dataset.guide){const n=el.dataset.guide;if(n==='close')dialog.close();else if(n.startsWith('bankrupt'))bankrupt();else{path.push(n);renderGuide();}return;}
    if(el.dataset.cardId)return cardPreview(el.dataset.cardId);
    if(el.dataset.applyCard){const deck=D.board[s.board.pending.index][1],id=el.dataset.applyCard;diceSelection=[null,null];return run(b=>B.printedCard(b,C.current(s),deck,id),'실물 카드 지시도 함께 처리하세요.',true);}
    if(el.dataset.portfolio)return portfolio(Number(el.dataset.portfolio));
    if(el.dataset.tile)return property(Number(el.dataset.tile));
    const p=s?C.current(s):0;
    if(el.dataset.property){const index=Number(el.dataset.index),d=s.board.deeds[index],owner=d.owner,cost=C.amount(document.getElementById('house-cost')?.value);const action=el.dataset.property;if(action==='build')run(b=>B.build(b,owner,index,cost),'실물 건물도 같은 수로 맞추세요.',true);else if(action==='sell'||action==='sell-all')run(b=>B.sell(b,owner,index,action==='sell-all',cost),'건물을 은행에 돌려주고 돈을 받으세요.',true);else run(b=>B.mortgage(b,owner,index,d.mortgaged?null:C.amount(document.getElementById('mortgage-value')?.value)),d.mortgaged?'저당 해제 금액을 은행에 내세요.':'저당금을 받고 권리증을 뒤집으세요.',true);return;}
    if(el.dataset.bankrupt){dialog.close();undo=structuredClone(s);return set({...C.pause(s,Date.now()),screen:'result',winner:1-Number(el.dataset.bankrupt),finishReason:'bankruptcy'});}
    const a=el.dataset.action;
    if(a==='home'){home=true;if(s?.screen==='setup')draft=structuredClone(s);render();return;}
    if(a==='resume'){home=false;render();return;}
    if(a==='start'){if(s){pendingNew=true;confirmDialog.showModal();}else start();return;}
    if(a==='pause'){s=s.runningSince===null?{...s,runningSince:Date.now()}:C.pause(s,Date.now());save();render();return;}
    if(a==='end'){s=C.requestFinish(s);save();render();return;}
    if(a==='undo'&&undo){const time=C.elapsed(s,Date.now()),running=s.runningSince!==null,old=undo;undo=null;s={...old,elapsed:time,runningSince:running?Date.now():null,note:'웹과 실물을 함께 되돌리세요.'};save();render();return;}
    if(a==='card-pick')return cardList();if(a==='card-other')return cardOther();if(a==='auction')return auction();if(a==='card-money')return cardMoney();if(a==='card-move')return cardMove();if(a==='trade')return trading();
    if(a==='correct'||a==='import')return correction(a==='import');
    if(a==='properties')return portfolio(p);
    if(a==='bankrupt')return bankrupt();
    if(a==='guide-back'){path.pop();return renderGuide();}
    if(a==='rent-adjust')return open('이번 임대료 수정',`<form id="rent-adjust-form">${field('실물 권리증·카드의 최종 금액','rent-adjust',s.board.pending.amount,'required')}<button class="primary">금액 수정</button></form>`);
    if(a==='finish')return set({...s,screen:'finish'});if(a==='score')return set({...s,screen:'score'});
    if(a==='return-play'){const turns=[...s.turns];turns[1-s.first]--;const board=s.board?{...s.board,phase:'end',pending:null}:undefined;return set({...s,board,screen:'play',turns,runningSince:Date.now()});}
    if(a==='legacy-next'){undo=structuredClone(s);return set(C.advance(s,Date.now()));}
    const op=el.dataset.board;if(!op)return;
    if(op==='ack')run(b=>B.acknowledge(b));
    if(op==='buy')run(b=>B.purchase(b,p),'부지값을 은행에 내고 권리증을 받으세요.');
    if(op==='no-bid')run(b=>B.purchase(b,p,null),'부지는 은행에 둡니다.',true);
    if(op==='pay')run(b=>B.pay(b,p));
    if(op==='card-jail')run(b=>B.card(b,p,'jail',0),'감옥으로 이동하세요.',true);
    if(op==='card-escape')run(b=>B.card(b,p,'escape',0),'탈출 카드를 보관하세요.',true);
    if(op==='back-three')run(b=>B.card(b,p,'back',(b.players[p].pos+37)%40),'말을 세 칸 뒤로 옮기세요.',true);
    if(op==='jail-pay'||op==='jail-card')run(b=>B.jailExit(b,p,op==='jail-card'?'card':'cash'),op==='jail-card'?'탈출 카드를 더미 맨 아래에 돌려놓으세요.':'은행에 M50을 내세요.');
    if(op==='next'&&s.board.phase==='end'&&s.runningSince!==null){undo=structuredClone(s);let next=C.advance(s,Date.now());if(next.screen==='play')next={...next,board:B.beginTurn(next.board),note:''};set(next);}
  });
  function rollDice(a,b){const p=C.current(s),old=s.board.players[p].cash;try{const next=B.roll(s.board,p,a,b),gain=next.players[p].cash-old;run(()=>next,`${a} + ${b} = ${a+b}${gain===200?' · 출발 통과: 은행에서 M200을 받으세요.':''}`);}catch(e){error(e.message);}}
  document.addEventListener('submit',e=>{
    e.preventDefault();const p=s?C.current(s):0,f=e.target,id=f.id;
    if(id==='utility-dice-form'){if(diceSelection.some(n=>n===null))return error('두 주사위의 면을 모두 골라 주세요.');return run(b=>B.utilityRoll(b,...diceSelection));}
    if(id==='dice-form'){if(diceSelection.some(n=>n===null))return error('두 주사위의 면을 모두 골라 주세요.');return rollDice(diceSelection[0],diceSelection[1]);}
    if(id==='rent-form')return run(b=>B.recordRent(b,C.amount(document.getElementById('rent-input').value)));
    if(id==='rent-adjust-form')return run(b=>B.recordRent(b,C.amount(document.getElementById('rent-adjust').value),true),'',true);
    if(id==='auction-form')return run(b=>B.purchase(b,p,Number(document.getElementById('auction-winner').value),C.amount(document.getElementById('auction-amount').value)),'낙찰금을 은행에 내고 권리증을 받으세요.',true);
    if(id==='card-money-form')return run(b=>B.card(b,p,document.getElementById('card-direction').value,C.amount(document.getElementById('card-amount').value)),'카드의 금액을 반영했습니다.',true);
    if(id==='card-move-form')return run(b=>B.card(b,p,document.getElementById('card-direction').value,Number(document.getElementById('card-destination').value)),'실물 말도 같은 칸으로 옮기세요.',true);
    if(id==='trade-form'){const v=[0,1].map(i=>document.getElementById('trade-deed-'+i).value);return run(b=>B.trade(b,v[0]===''?null:Number(v[0]),v[1]===''?null:Number(v[1]),C.amount(document.getElementById('trade-cash-0').value),C.amount(document.getElementById('trade-cash-1').value),document.getElementById('release-0').checked,document.getElementById('release-1').checked),'권리증·돈을 교환하고 저당 인수 비용은 은행에 내세요.',true);}
    if(id==='deed-correct'){const index=Number(f.dataset.index);return run(b=>{const next=structuredClone(b),d=next.deeds[index],v=document.getElementById('deed-owner').value;d.owner=v===''?null:Number(v);d.buildings=Number(document.getElementById('deed-buildings')?.value??0);d.mortgaged=document.getElementById('deed-mortgaged').checked;if(d.owner===null&&(d.buildings||d.mortgaged))throw Error('은행 부지에는 건물·저당을 넣을 수 없습니다.');if(d.mortgaged&&d.buildings)throw Error('건물이 있는 부지를 저당 잡을 수 없습니다.');return next;},'실물 권리증 기준으로 맞췄습니다.',true);}
    if(id==='correct-form'){
      const importing=f.dataset.import==='true';
      const fn=original=>{let b=importing?B.create(false,0):structuredClone(original);for(let i=0;i<2;i++){const pos=Number(document.getElementById('correct-pos-'+i).value),jail=document.getElementById('correct-jail-'+i).checked;if(jail&&pos!==10)throw Error('수감 중인 말은 감옥에 있어야 합니다.');b=B.correct(b,i,pos,C.amount(document.getElementById('correct-cash-'+i).value));b.players[i].jail=jail;if(!jail)b.players[i].attempts=0;}if(importing)for(const el of document.querySelectorAll('[data-import-owner]'))b.deeds[el.dataset.importOwner].owner=el.value===''?null:Number(el.value);return {...b,phase:'roll',pending:null,extra:false,doubles:0};};
      if(importing){try{const b=fn(null);if(!B.valid(b))throw Error('기록을 확인하세요.');undo=structuredClone(s);s={...s,board:b};save();dialog.close();play();}catch(e){error(e.message);}return;}
      return run(fn,'실물 기준으로 기록을 맞췄습니다.',true);
    }
    if(id==='score-form'){captureScores();const totals=s.scores.map(C.total);if(totals.some(v=>v===null))return error('모든 항목에 0 이상의 정수를 입력하세요.');set({...s,screen:'result',winner:C.winner(totals),finishReason:'time'});}
  });
  document.addEventListener('input',e=>{if(e.target.hasAttribute('data-score')){captureScores();refreshTotals();}});
  document.addEventListener('change',e=>{if(e.target.id.startsWith('trade-')||e.target.id.startsWith('release-'))tradeFees();});
  document.getElementById('confirm-new').addEventListener('click',()=>{confirmDialog.close();if(pendingNew){pendingNew=false;start();}});
  setInterval(updateTimer,D.tick);document.addEventListener('visibilitychange',()=>{if(!home&&s?.screen==='play')updateTimer();});render();
})();
