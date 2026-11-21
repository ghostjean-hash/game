(function () {
  'use strict';
  const D=MC_DATA,C=MC,B=MC_BOARD,BOT=MC_BOT,root=document.getElementById('app'),dialog=document.getElementById('rule-dialog'),confirmDialog=document.getElementById('confirm-dialog');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iconPaths={cash:'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M6.5 10v4M17.5 10v4',house:'M4 11.5 12 4.5l8 7M6.5 9.8V19.5h11V9.8M10 19.5v-5h4v5',trade:'M4 8.5h14l-3.5-3.5M20 15.5H6l3.5 3.5',flag:'M6 21V4M6 4.5h11l-2.5 4 2.5 4H6',menu:'M4 7h16M4 12h16M4 17h16',pause:'M9 5.5v13M15 5.5v13',play:'M8 5.5v13l10.5-6.5Z',minus:'M6 12h12',plus:'M12 6v12M6 12h12',fit:'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',arrow:'M4 12h16m-6-6 6 6-6 6',close:'m6 6 12 12M18 6 6 18',star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',chevron:'m9 5 7 7-7 7'};
  const iconArt={
    gift:'<rect class="tone" x="3.5" y="9" width="17" height="11.5" rx="1.6"/><rect class="paper" x="2.6" y="6.4" width="18.8" height="4" rx="1.2"/><path d="M12 6.4v14.1"/><path d="M12 6.2c-1.2-2.6-5.2-3.2-5.2-.8 0 1.2 2.4 1.1 5.2.8Zm0 0c1.2-2.6 5.2-3.2 5.2-.8 0 1.2-2.4 1.1-5.2.8Z"/>',
    cash:'<rect class="tone" x="6.2" y="3.6" width="15" height="9.2" rx="1.8"/><rect class="paper" x="2.8" y="7.2" width="15" height="9.4" rx="1.8"/><circle cx="10.3" cy="11.9" r="2.2"/><path d="M5.6 10.2v3.4M15 10.2v3.4"/><circle class="solid" cx="17.6" cy="17.4" r="3.9"/><path class="cut" d="M16.2 17.4h2.8M17.6 16v2.8"/>',
    house:'<path class="tone" d="M5.2 9.8V19a1.2 1.2 0 0 0 1.2 1.2h11.2a1.2 1.2 0 0 0 1.2-1.2V9.8"/><path class="tone" d="M15.8 6.6V4.2h2.6v4.6"/><path d="M2.8 11.2 12 3.8l9.2 7.4"/><path class="paper" d="M10 20.2v-4.6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4.6"/><rect class="paper" x="7.4" y="10.6" width="2.8" height="2.8" rx=".5"/><rect class="paper" x="13.8" y="10.6" width="2.8" height="2.8" rx=".5"/>',
    trade:'<circle class="tone" cx="12" cy="12" r="9.6"/><path d="M6.4 9.4h10.4"/><path d="m14 6.4 3 3-3 3"/><path d="M17.6 14.6H7.2"/><path d="m10 11.6-3 3 3 3"/>',
    bankrupt:'<circle class="tone" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.6" stroke-dasharray="2 2.4"/><path class="crack" d="m12.8 3-1.9 4.6 2.5 2.5-2.2 3.4 1.9 2.7-1 4.8"/>'
  };
  const icon=name=>`<svg class="ui-icon icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconArt[name]??`<path d="${iconPaths[name]}"/>`}</svg>`;
  const moneyText=n=>'M'+Number(n).toLocaleString('ko-KR');
  const money=n=>`<span class="money"><svg class="currency-symbol" viewBox="0 0 24 24" role="img" aria-label="M" focusable="false"><path d="M3 21 7 3l5 11 8-11-4 18"/><path class="currency-bars" d="M3 10h18M2 14h18"/></svg><span class="money-digits">${Number(n).toLocaleString('ko-KR')}</span></span>`;
  const richText=text=>esc(text).replace(/M\s?(\d[\d,]*)/g,(_,digits)=>money(Number(digits.replaceAll(',',''))));
  const pips=[[],[5],[1,9],[1,5,9],[1,3,7,9],[1,3,5,7,9],[1,3,4,6,7,9]];
  const dieFace=(index,value)=>`<button type="button" role="radio" aria-checked="${diceSelection[index]===value}" aria-label="${index===0?'첫 번째':'두 번째'} 주사위 ${value}" class="die-face ${diceSelection[index]===value?'selected':''}" data-die="${index}" data-value="${value}"><span class="pip-grid" aria-hidden="true">${pips[value].map(pos=>`<i style="grid-area:${Math.floor((pos-1)/3)+1} / ${(pos-1)%3+1}"></i>`).join('')}</span></button>`;

  const buildingPiece=hotel=>`<svg class="building-piece ${hotel?'hotel':'house'}" viewBox="0 0 ${hotel?36:20} 20" aria-hidden="true"><path d="${hotel?'M1 8 8 2h20l7 6v11H1Z':'M1 9 10 1l9 8v10H1Z'}" fill="currentColor" stroke="${hotel?'#9c3d39':'#28603d'}" stroke-width="1.2"/><path d="${hotel?'M9 19v-7h5v7m8-7h5v4h-5Z':'M8 19v-7h4v7'}" fill="#fff9"/></svg>`;
  function buildingYard(i,d){if(!B.isStreet(i)||!d.buildings)return '';let hotel=buildingPiece(true);if(i>10&&i<20||i>30)hotel=hotel.replace('viewBox="0 0 36 20"','viewBox="0 0 20 36"').replace('<path','<g transform="translate(20 0) rotate(90)"><path').replace('</svg>','</g></svg>');return `<span class="building-yard ${d.buildings===5?'has-hotel':''}" aria-label="${d.buildings===5?'호텔 1채':`주택 ${d.buildings}채`}">${d.buildings===5?`<span class="hotel-slot">${hotel}</span><span class="building-slot empty-slot"></span>`:[0,1,2].map(slot=>`<span class="building-slot ${d.buildings===4&&slot===0?'stacked':''}">${slot<Math.min(d.buildings,3)?buildingPiece(false):''}${d.buildings===4&&slot===0?buildingPiece(false):''}</span>`).join('')}</span>`;}
  const diceSummary=()=>diceSelection.every(n=>n!==null)?`${diceSelection[0]} + ${diceSelection[1]} = ${diceSelection[0]+diceSelection[1]}`:'';
  function dicePicker(formId='dice-form'){return `<form id="${formId}" class="dice-form">${[0,1].map(index=>`<fieldset class="dice-picker"><legend>${index===0?'첫 번째':'두 번째'}</legend><div role="radiogroup" aria-label="${index===0?'첫 번째':'두 번째'} 주사위 면" class="dice-faces">${[1,2,3,4,5,6].map(value=>dieFace(index,value)).join('')}</div></fieldset>`).join('')}<output class="dice-summary" aria-live="polite">${diceSummary()}</output><button class="primary dice-submit" type="submit" ${diceSelection.some(n=>n===null)?'disabled':''}>${formId==='dice-form'?'이동':'임대료 계산'}</button></form>`;}
  function artwork(index){const type=D.board[index][1];return ({go:'go',parking:'parking',chest:'chest',station:'station',utility:index===12?'electric':'water',tax:index===4?'income-tax':'luxury',jail:'prison',gotojail:'police',chance:index===7?'chance':index===22?'chance-blue':'chance-orange'})[type]??null;}
  const incomeTaxIcon='<svg class="space-icon icon-income-tax" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 2 46 24 24 46 2 24Z" fill="#a0aaa0" stroke="#667465" stroke-width="1.5"/><path d="m24 2 7 15 15 7-15 7-7 15-7-15L2 24l15-7Z" fill="#d4dad0"/><path d="M14 32 18 15l6 11 8-11-4 17M13 22h23M12 27h23" fill="none" stroke="#566550" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const tileName=i=>D.board[i][0];
  // 공식 단축 판은 주택 3채 다음 단계가 호텔(5)이다.
  const stepTarget=(t,dir)=>{const at=B.hotelAt(s.board);if(at!==4&&dir>0&&t===at)return 5;if(at!==4&&dir<0&&t===5)return at;return t+dir;};
  const tileOption=i=>['chest','chance'].includes(D.board[i][1])?tileName(i)+' ('+tileName((i+39)%40)+' 다음)':tileName(i);
  const button=(text,attr='',kind='secondary')=>`<button type="button" class="${kind}" ${attr}>${text}</button>`;
  const field=(label,id,value='',extra='')=>`<label for="${id}">${label}</label><input id="${id}" type="number" min="0" max="${D.maxAmount}" step="1" inputmode="numeric" value="${value}" ${extra}>`;
  const tileOptions=(selected=0)=>D.board.map((t,i)=>`<option value="${i}" ${i===selected?'selected':''}>${tileOption(i)}</option>`).join('');
  let s=load(),home=true,undo=null,draft=makeDraft(s),managerId=null,path=[],pendingNew=false,diceSelection=[null,null],diceContext=null,auctionMode=false;
  function makeDraft(session){const d=C.createPreset(D.players,session?.mode==='short'?(session.minutes===60?'short60':'short30'):'standard',session?.first??0);d.playerColors=[...(session?.playerColors??D.defaultPlayerColors)];d.bonuses=bonusesOf(session);return d;}
  function bonusesOf(x){return Array.isArray(x?.bonuses)?[...x.bonuses]:[0,x?.bonus??0];}
  function applyColors(ids){(ids??D.defaultPlayerColors).forEach((id,p)=>{const c=D.playerPalette[id],name=p===0?'dad':'seowoo';for(const target of [root,dialog]){target.style.setProperty('--'+name,c.hex);target.style.setProperty('--player-'+p+'-soft',c.soft);target.style.setProperty('--player-'+p+'-rgb',c.rgb);}});}
  function palette(player){const selected=draft.playerColors[player];return `<fieldset class="player-colors" aria-label="말 색"><div class="color-options">${Object.entries(D.playerPalette).map(([id,c])=>button(`<span class="palette-dot" style="--swatch:${c.hex}">${selected===id?'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 10 3 3 7-7"/></svg>':''}</span>`,`data-player-color="${id}" data-player="${player}" aria-label="${D.players[player]} ${c.name}" title="${c.name}" aria-pressed="${selected===id}"`,'color-option')).join('')}</div></fieldset>`;}
  function load(){try{const v=JSON.parse(localStorage.getItem(D.storageKey));if(!C.valid(v)||v.board&&!B.valid(v.board))return null;if(v.board)v.board=B.hydrate(v.board);botFields(v);if(v.names[0]==='나'&&v.names[1]==='딸')v.names=[...D.players];return v;}catch{return null;}}
  function botFields(v){v.auto=Array.isArray(v.auto)&&v.auto.length===2&&v.auto.every(x=>typeof x==='boolean')?v.auto:[false,false];v.speed=D.bot.speeds.includes(v.speed)?v.speed:1;if(!v.decks||typeof v.decks!=='object')v.decks={};if(!v.botMemo||typeof v.botMemo!=='object'||typeof v.botMemo.offers!=='object'||v.botMemo.offers===null)v.botMemo={turn:null,asked:false,steps:0,offers:{}};const who=x=>x===0||x===1,cost=x=>Number.isInteger(x)&&x>=0,logOk=e=>e&&typeof e==='object'&&!!D.board[e.index]&&(e.kind==='buy'?who(e.who)&&cost(e.amount):e.kind==='auction'?e.winner===null&&e.amount===null||who(e.winner)&&cost(e.amount):e.kind==='trade'?who(e.from)&&who(e.to)&&cost(e.amount):e.kind==='swap'?!!D.board[e.give]&&!!D.board[e.take]&&who(e.from)&&who(e.to)&&Number.isInteger(e.amount):e.kind==='reject');v.botLog=Array.isArray(v.botLog)?v.botLog.filter(logOk).slice(0,D.bot.logLines):[];return v;}
  function save(){try{const json=JSON.stringify(s);localStorage.setItem(D.storageKey,json);document.getElementById('save-warning').hidden=localStorage.getItem(D.storageKey)===json;}catch{document.getElementById('save-warning').hidden=false;}}
  function render(){root.className='';if(home||s?.screen==='setup'){stopWalk();preparation();}else ({play:play,finish:finish,score:score,result:result}[s.screen])();syncActivity();}
  function set(next){s=next;save();render();}
  function heading(title,back=true){return `<div class="screen-head"><h1 tabindex="-1">${title}</h1>${back?button('준비','data-action="home"'):''}</div>`;}
  function error(message){const el=document.getElementById(dialog.open?'dialog-error':'action-error');if(el){el.textContent=message;el.hidden=false;el.focus();}}
  function open(title,body,wide=false,foot=''){dialog.className=wide?'wide-dialog':'';const content=document.getElementById('rule-content');content.innerHTML=`<div class="dialog-head"><h2 id="rule-title" tabindex="-1">${richText(title)}</h2>${button(icon('close'),'data-close aria-label="닫기"','icon-button')}</div><div class="dialog-body">${body}<p id="dialog-error" class="error" role="alert" tabindex="-1" hidden></p></div>${foot?`<div class="dialog-foot">${foot}</div>`:''}`;if(!foot&&!content.querySelector('.dialog-body button'))content.insertAdjacentHTML('beforeend',`<div class="dialog-foot">${button('확인','data-close-ok','primary')}</div>`);if(!dialog.open)dialog.showModal();else document.getElementById('rule-title').focus({preventScroll:true});dialog.scrollTop=0;syncActivity();}
  function preparation(){
    const d=draft,short=d.mode==='short';
    root.className='is-preparing'+(d.minutes===null?' classic-mode':'');applyColors(d.playerColors);
    root.innerHTML=`<div class="prep-heading"><h1>게임 준비</h1>${s&&s.screen!=='setup'?button(s.screen==='result'?'결과 보기':'이어서 하기','data-action="resume"'):''}</div><div class="prep-layout"><section class="prep-config"><fieldset><legend>플레이</legend><div class="segmented mode-options">${D.presets.map(mode=>button(mode.label,`data-preset="${mode.id}" aria-pressed="${mode.minutes===d.minutes}"`,mode.minutes===d.minutes?'primary':'secondary')).join('')}</div></fieldset><fieldset><legend>선공 · 주사위 큰 수부터</legend><div class="segmented">${D.players.map((n,i)=>button(n,`data-first="${i}" aria-pressed="${d.first===i}"`,d.first===i?'primary':'secondary')).join('')}</div></fieldset><div class="prep-duration">${d.minutes===null?'<strong class="classic-duration">시간 제한 없음</strong>':`<strong>${d.minutes-D.reserveMinutes}<span>분 플레이</span></strong><p>준비·결산 약 10분</p>`}</div></section><div class="prep-table">
    <section class="money-prep"><h2>각자 ${money(D.startingCash)} 받기</h2><div class="banknotes">${D.money.map(([v,n])=>`<div class="note-${v}"><strong>${money(v)}</strong><span>${n}장</span></div>`).join('')}</div></section>
    <div class="prep-players">${D.players.map((n,p)=>{return `<section class="prep-player player-${p}"><div class="prep-player-head"><span class="person-mark">${n.slice(0,1)}</span><h2>${n}</h2></div>${palette(p)}<div class="prep-allocation">${short?`<p class="cities">권리증 ${D.shortDeedsEach}장 무작위</p><p class="purchase-cost" aria-hidden="true"></p>`:''}</div><div class="cash-left"><span>${short?'받는 현금':'남길 현금'}</span>${button(icon('gift')+(d.bonuses[p]?`<b>+${d.bonuses[p]}</b>`:''),`data-bonus-open="${p}" aria-label="${n} 보너스" title="${n} 보너스"`,'bonus-button'+(d.bonuses[p]?' has-bonus':''))}<strong>${money(D.startingCash+d.bonuses[p])}</strong></div></section>`;}).join('')}</div>
    <div class="placement"><p><strong>말</strong><span>출발에 놓기</span></p><p><strong>카드</strong><span>찬스·사회사업기금 각각 섞기</span></p><p><strong>은행</strong><span>${short?'남은 돈·주택·호텔<br>나눠 준 뒤 남은 권리증':'남은 돈·주택·호텔<br>도시·역·공공 기관의 권리증 전부'}</span></p></div>
    </div></div><div class="prep-bottom">${button('<span>게임 시작</span>'+icon('arrow'),'data-action="start"','primary')}</div>`;
  }
  function start(){seenPos=null;home=false;undo=null;diceContext=null;const next=C.createSession(D.players,draft.minutes,false,draft.first,draft.mode);next.playerColors=[...draft.playerColors];next.screen='play';next.runningSince=Date.now();next.board=B.create(false,next.first,next.chosenSet,next.mode==='short'?'short':null);next.bonuses=[...draft.bonuses];next.bonuses.forEach((v,i)=>{next.board.players[i].cash+=v;});botFields(next);set(next);if(next.mode==='short')dealtDeeds();}
  function dealtDeeds(){const b=s.board;open('시작 권리증',`<div class="dealt-grid">${s.names.map((n,p)=>{const own=Object.keys(b.deeds).map(Number).filter(i=>b.deeds[i].owner===p);return `<section class="dealt-card"><h3>${esc(n)}</h3>${own.map(i=>`<p class="dealt-row"><span>${tileName(i)}</span><strong>${money(D.board[i][2])}</strong></p>`).join('')}<p class="dealt-row dealt-cash"><span>남은 현금</span><strong>${money(b.players[p].cash)}</strong></p></section>`;}).join('')}</div>`,false,button('<span>게임 시작</span>'+icon('arrow'),'data-close-ok','primary dealt-start'));}
  let menuOpen=false;
  function menuPanel(){return `<div class="menu-pop" role="menu" aria-label="메뉴"><div class="zoom-controls" role="group" aria-label="보드 확대">${button(icon('minus'),'data-zoom="out" aria-label="축소" title="축소"','icon-button')}${button(icon('fit'),'data-zoom="fit" aria-label="전체 보기" title="전체 보기"','icon-button')}${button(icon('plus'),'data-zoom="in" aria-label="확대" title="확대"','icon-button')}</div><div class="menu-session">${sessionButtons()}</div><div class="menu-auto" role="group" aria-label="오토">${s.names.map((n,i)=>{const on=!!s.auto?.[i];return button(`${esc(n)} Auto <small>${on?'On':'Off'}</small>`,`data-auto="${i}" aria-pressed="${on}"`,on?'auto-on':'secondary');}).join('')}</div>${button('실물과 기록 맞추기','data-action="correct"')}${button('마지막 작업 되돌리기','data-action="undo" '+(undo?'':'disabled'))}${button('규칙','data-action="rules"')}${button('준비 화면','data-action="home"')}</div>`;}
  // 오토가 켜져 있으면 시계 옆에 일시정지 · 배속(planning.html 0.19.2 2항). 일시정지는 판 일시정지와 같은 상태다.
  function autoControls(){if(!s.auto?.some(Boolean))return s.runningSince===null?'<span class="paused-pill">일시정지</span>':'';const paused=s.runningSince===null;return `<div class="auto-controls" role="group" aria-label="오토 진행">${button(icon(paused?'play':'pause'),`data-action="pause" aria-label="${paused?'계속':'일시정지'}" title="${paused?'계속':'일시정지'}"`,'icon-button auto-pause'+(paused?' is-paused':''))}<div class="speed-options">${D.bot.speeds.map(v=>button('x'+v,`data-speed="${v}" aria-pressed="${s.speed===v}"`,s.speed===v?'primary':'secondary')).join('')}</div></div>`;}
  function sessionButtons(){return `${button(s.runningSince===null?'계속':'일시정지','data-action="pause"')}${s.ending?(C.remaining(s,Date.now())>0?button('마무리 취소','data-action="end-cancel"','ending-on'):button('마무리 중','disabled','ending-on')):button('마무리','data-action="end"')}`;}
  function timerHeader(){return `<div class="session-dock"><span id="timer" role="timer" aria-label="남은 시간"></span><div class="session-controls">${sessionButtons()}${button('준비','data-action="home"')}</div></div>`;}
  function tileGrid(i){return i<=10?[11,11-i]:i<=20?[21-i,1]:i<=30?[1,i-19]:[i-29,11];}
  function pawnEdge(i){return ({0:'corner-go',10:'corner-jail',20:'corner-parking',30:'corner-police'})[i]??(i<10?'bottom':i<20?'left':i<30?'top':'right');}
  function pawnMarkup(p){return `<span class="board-pawn pawn-${p}" data-pawn="${p}" role="img"><span>${esc(s.names[p])}</span></span>`;}
  function paintPawns(){
    if(!s?.board)return;
    const positions=s.board.players.map((x,p)=>walk?.p===p?walk.path[walk.i]:x.pos),current=C.current(s);
    for(const [p,index] of positions.entries()){
      const el=root.querySelector(`[data-pawn="${p}"]`);if(!el)continue;
      const [row,col]=tileGrid(index);el.style.gridRow=row;el.style.gridColumn=col;
      el.className=`board-pawn pawn-${p} pawn-${pawnEdge(index)}${p===current?' is-current':''}`;
      el.style.setProperty('--pawn-stack',positions[0]===positions[1]&&p!==current?'1':'0');
      el.setAttribute('aria-label',`${s.names[p]} 말 · ${tileName(index)}${s.board.players[p].jail?' · 수감':''}`);
    }
  }
  function play(){
    const p=C.current(s);
    root.className='is-playing';applyColors(s.playerColors);const nextContext=s.board?[...s.turns,p,s.board.phase,...(s.board.dice??[])].join('|'):null;if(diceContext!==nextContext){diceSelection=[null,null];diceContext=nextContext;}
    if(!s.board){root.innerHTML=timerHeader()+`<section class="legacy"><h2>${esc(s.names[p])} 차례</h2><p>이 판에는 말·현금 기록이 없습니다.</p>${button('현재 판 입력','data-action="import"','primary')}<div class="guide-list">${D.rules.map(r=>button(r.title,`data-rule="${r.id}"`)).join('')}</div>${button('차례 마침','data-action="legacy-next"')}<p id="action-error" class="error" role="alert" hidden></p></section>`;updateTimer();return;}
    const b=s.board;
    root.innerHTML=`<div class="game-shell"><div class="board-stage"><div class="board-viewport" id="board-viewport"><div class="board-map" aria-label="실제 게임판과 같은 40칸">${D.board.map((t,i)=>{const [row,col]=tileGrid(i);const deed=b.deeds[i],owner=deed?.owner,owned=owner!==undefined&&owner!==null,art=artwork(i),monopoly=owned&&B.holdingInfo(b,i).complete;const edge=i<10?'bottom':i<20?'left':i<30?'top':'right';return `<button type="button" class="board-tile ${art?'special':'city'} edge-${edge} ${monopoly?'monopoly':''} ${owned?'owned owner-'+owner:''} ${b.players[p].pos===i?'active-tile active-player-'+p:''}" style="grid-row:${row};grid-column:${col}" data-tile="${i}" aria-label="${tileOption(i)}${owned?' · '+esc(s.names[owner])+' 소유':''}${monopoly?' · 독점':''}${deed?.buildings?' · '+(deed.buildings===5?'호텔':'주택 '+deed.buildings+'채'):''}"><span class="tile-content">${art==='income-tax'?incomeTaxIcon:art?`<img class="space-icon icon-${art}" src="assets/board/${art}.png" alt="" draggable="false">`:''}<span class="tile-name">${t[0]}</span>${owned?`<span class="deed-owner">${esc(s.names[owner])}</span>`:''}</span>${monopoly?'<span class="monopoly-mark" aria-label="독점">독점</span>':''}${deed?buildingYard(i,deed):''}${owned&&deed.mortgaged?'<span class="mortgage-mark">저당</span>':''}</button>`;}).join('')}${b.players.map((_,p)=>pawnMarkup(p)).join('')}</div></div></div>
    <aside class="game-tools"><div class="panel-top"><span id="timer" role="timer" aria-label="남은 시간"></span>${autoControls()}${button(icon('menu'),`data-action="menu" aria-label="메뉴" aria-expanded="${menuOpen}" title="메뉴"`,'icon-button menu-button')}</div>${menuOpen?menuPanel():''}<section class="board-center play-panel"><header class="turn-status" aria-label="현재 차례 정보"><span class="turn-avatar player-${p}" aria-hidden="true">${esc(s.names[p].slice(0,1))}</span><div class="turn-identity"><h2>${esc(s.names[p])} 차례</h2><p class="current-place">${tileName(b.players[p].pos)}${b.players[p].jail?' · 수감':''}</p></div><div class="turn-cash">${money(b.players[p].cash)}</div></header><div class="turn-strip">${s.ending?`<p class="ending">${endingText()}</p>`:''}</div><div class="turn-content">${s.note?`<p class="transaction-note" role="status">${richText(s.note)}</p>`:''}${logView()}<div class="current-task">${task()}</div><p id="action-error" class="error" role="alert" tabindex="-1" hidden></p></div></section><div class="tool-menu tool-icons" role="group" aria-label="관리">${[['cash','돈 마련 · 부지 관리','properties'],['house','집 짓기','build'],['trade','거래','trade'],['bankrupt','파산','bankrupt']].map(([ic,label,act])=>button(icon(ic),`data-action="${act}" aria-label="${label}" title="${label}"`,act==='bankrupt'?'icon-tool danger':'icon-tool')).join('')}</div></aside></div>`;
    fitPanel();trackMove(b);restoreView(b.players[p].pos,p);paintPawns();
    updateTimer();syncActivity();
  }
  function task(){
    const b=s.board,p=C.current(s),person=b.players[p],q=b.pending;
    if(b.phase==='roll')return `${person.jail?`<section class="jail-options" aria-label="감옥 탈출 방법"><h3>감옥 탈출</h3><div class="button-row">${person.cash>=50?button(money(50)+' 내고 탈출','data-board="jail-pay"','primary'):button('탈출 비용 '+money(50)+' 마련','data-action="properties"','primary')}${person.cards?button('탈출 카드 사용','data-board="jail-card"'):''}</div></section>`:''}${person.jail||b.extra?`<p class="dice-instruction">${person.jail?'또는 주사위로 더블에 도전':'더블 · 한 번 더 굴리세요.'}</p>`:''}${dicePicker()}`;
    if(b.phase==='end')return `${button('차례 마침','data-board="next" '+(s.runningSince===null?'disabled':''),'primary')}`;
    if(!q)return '';
    if(q.type==='info')return `<p>${esc(q.text)}</p>${button('확인','data-board="ack"','primary')}`;
    if(q.type!=='buy')auctionMode=false;
    if(q.type==='buy'&&auctionMode)return auctionView();
    if(q.type==='buy')return `<p class="task-question">땅을 구입하시겠습니까?</p><strong class="task-amount">${money(q.amount)}</strong>${person.cash<q.amount?`<p class="amount-status is-short">현금 ${money(q.amount-person.cash)} 부족</p>`:''}<div class="button-row task-actions">${person.cash>=q.amount?button('부지 구입','data-board="buy"','primary'):button('돈 마련','data-action="properties"','primary')}${button('안 사고 경매','data-action="auction"')}</div>`;
    if(q.type==='rent'){
      if(q.amount===null&&q.kind==='utility')return `<p class="dice-instruction">실물 주사위를 새로 굴리세요. · ${q.factor}배</p>${dicePicker('utility-dice-form')}`;
      if(q.amount===null)return `<p>${esc(s.names[q.to])} 소유</p><form id="rent-form">${field(q.kind==='street'?(b.deeds[q.index].buildings===0?'권리증의 기본 임대료':b.deeds[q.index].buildings===5?'호텔 임대료':'주택 '+b.deeds[q.index].buildings+'채 임대료'):q.kind==='card'?'카드가 지정한 임대료':'카드의 주사위를 굴려 계산한 임대료','rent-input','','required')} ${q.kind==='street'&&q.factor===2?'<p>색 세트: 입력한 기본 임대료의 두 배 적용</p>':''}<button class="primary" type="submit">금액 확인</button></form>`;
      return `<p>${esc(s.names[q.to])}에게 <strong>${money(q.amount)}</strong> 내세요.</p>${payButton(person.cash,q.amount)}`;
    }
    if(q.type==='pay'||q.type==='jailFee')return `<p>${q.type==='jailFee'?'세 번째 탈출 실패 · ':''}은행에 <strong>${money(q.amount)}</strong> 내세요.</p>${payButton(person.cash,q.amount)}`;
    if(q.type==='card')return `<p>${tileName(q.index)} 카드를 뽑으세요.</p><div class="card-actions">${button('뽑은 카드 선택','data-action="card-pick"','primary')}</div>`;
    return '';
  }
  // 낼 돈이 현금보다 많으면 지불 버튼 대신 부족액과 돈 마련 버튼(구입 표시와 같은 모양).
  function payButton(cash,amount){return cash>=amount?button('돈을 냈어요','data-board="pay"','primary'):`<p class="amount-status is-short">현금 ${money(amount-cash)} 부족</p>${button('돈 마련','data-action="properties"','primary')}`;}
  function endingText(x=s){const last=esc(x.names[1-x.first]),both=x.turns[x.first]<x.targetTurns;return both?`두 사람 한 차례씩 더 · ${last} 차례 뒤 결산`:`${last} 차례까지 · 그 뒤 결산`;}
  // 보드 확대·드래그·카메라(planning.html 0.12.2). 보드 그림은 transform 으로만 움직이고 칸 배치는 그대로 둔다.
  const ZOOM={min:1,max:3,step:1.5,drag:8};
  let view={z:1,x:0,y:0},followKey=null;
  const viewport=()=>document.getElementById('board-viewport');
  function applyView(animate=false){const vp=viewport(),map=vp?.querySelector('.board-map');if(!map)return;const w=vp.clientWidth,h=vp.clientHeight;view.z=Math.min(ZOOM.max,Math.max(ZOOM.min,view.z));view.x=Math.min(0,Math.max(w-w*view.z,view.x));view.y=Math.min(0,Math.max(h-h*view.z,view.y));map.classList.toggle('view-animate',animate);map.style.transform=view.z===1?'':`translate(${view.x}px,${view.y}px) scale(${view.z})`;vp.classList.toggle('is-zoomed',view.z>1);}
  function zoomAt(z,cx,cy,animate=false){const k=Math.min(ZOOM.max,Math.max(ZOOM.min,z))/view.z;view.x=cx-(cx-view.x)*k;view.y=cy-(cy-view.y)*k;view.z*=k;applyView(animate);}
  function centerOn(index,animate=true){const vp=viewport(),tile=vp?.querySelector(`[data-tile="${index}"]`);if(!tile)return;view.x=vp.clientWidth/2-(tile.offsetLeft+tile.offsetWidth/2)*view.z;view.y=vp.clientHeight/2-(tile.offsetTop+tile.offsetHeight/2)*view.z;applyView(animate);}
  function zoomButton(kind){const vp=viewport();if(!vp)return;if(kind==='fit'){view={z:1,x:0,y:0};applyView(true);return;}const p=C.current(s);view.z=Math.min(ZOOM.max,Math.max(ZOOM.min,kind==='in'?view.z*ZOOM.step:view.z/ZOOM.step));centerOn(s.board.players[p].pos,true);}
  function restoreView(pos,p){applyView(false);const key=p+':'+pos;if(followKey!==key){followKey=key;if(view.z>1&&!walk)requestAnimationFrame(()=>centerOn(pos,true));}if(walk)paintWalk();}
  // 말 이동 연출: 강조 테두리가 지나는 칸을 한 칸씩 밟는다. 기록은 이미 도착 칸이다.
  const WALK_MS=70;let seenPos=null,walk=null;
  function trackMove(b){const now=b.players.map(x=>x.pos),before=seenPos;seenPos=now;if(!before||document.hidden)return;const mover=[0,1].find(i=>before[i]!==now[i]);if(mover===undefined)return;
    const from=before[mover],to=now[mover];if(b.players[mover].jail&&to===10)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const fwd=(to-from+40)%40,back=(from-to+40)%40,dir=back===3?-1:1,steps=dir>0?fwd:back;
    stopWalk();walk={p:mover,to,i:0,path:Array.from({length:steps},(_,k)=>(from+dir*(k+1)+40)%40)};walk.timer=setInterval(()=>{if(!walk)return;walk.i++;if(walk.i>=walk.path.length){stopWalk();return;}paintWalk();},WALK_MS/speedNow());}
  function paintWalk(){document.querySelectorAll('.walk-focus').forEach(e=>e.classList.remove('walk-focus','walk-p0','walk-p1'));if(!walk)return;document.querySelector(`[data-tile="${walk.to}"]`)?.classList.add('walk-hold');const index=walk.path[walk.i];document.querySelector(`[data-tile="${index}"]`)?.classList.add('walk-focus','walk-p'+walk.p);if(view.z>1)centerOn(index,false);paintPawns();}
  function stopWalk(){if(walk?.timer)clearInterval(walk.timer);walk=null;document.querySelectorAll('.walk-focus,.walk-hold').forEach(e=>e.classList.remove('walk-focus','walk-p0','walk-p1','walk-hold'));paintPawns();syncActivity();}
  const touches=new Map();let gesture=null,dragged=false;
  root.addEventListener('pointerdown',e=>{const vp=e.target.closest('#board-viewport');if(!vp)return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});dragged=false;const pts=[...touches.values()],r=vp.getBoundingClientRect();gesture=pts.length>=2?{type:'pinch',dist:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),z:view.z,mx:(pts[0].x+pts[1].x)/2-r.left,my:(pts[0].y+pts[1].y)/2-r.top}:{type:'pan',sx:e.clientX,sy:e.clientY,x:view.x,y:view.y};});
  root.addEventListener('pointermove',e=>{if(!touches.has(e.pointerId)||!gesture)return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});const vp=viewport();if(!vp)return;
    if(gesture.type==='pinch'&&touches.size>=2){const pts=[...touches.values()],d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);dragged=true;zoomAt(gesture.z*d/gesture.dist,gesture.mx,gesture.my);return;}
    if(gesture.type==='pan'&&view.z>1){const dx=e.clientX-gesture.sx,dy=e.clientY-gesture.sy;if(!dragged&&Math.hypot(dx,dy)<ZOOM.drag)return;e.preventDefault();if(!dragged){dragged=true;vp.setPointerCapture?.(e.pointerId);window.getSelection?.().removeAllRanges();}view.x=gesture.x+dx;view.y=gesture.y+dy;applyView(false);}});
  const endTouch=e=>{touches.delete(e.pointerId);if(touches.size===0)gesture=null;else if(gesture?.type==='pinch'){const [pt]=[...touches.values()];gesture={type:'pan',sx:pt.x,sy:pt.y,x:view.x,y:view.y};}};
  root.addEventListener('pointerup',endTouch);root.addEventListener('pointercancel',endTouch);
  root.addEventListener('click',e=>{if(dragged&&e.target.closest('#board-viewport')){e.stopPropagation();e.preventDefault();dragged=false;}},true);
  root.addEventListener('wheel',e=>{const vp=e.target.closest('#board-viewport');if(!vp)return;e.preventDefault();const r=vp.getBoundingClientRect();zoomAt(view.z*(e.deltaY<0?1.15:1/1.15),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  window.addEventListener('resize',()=>{fitPanel();applyView(false);fitResult();});
  // 보드와 오른쪽 칸을 같은 높이로, 가용 폭·높이에 함께 맞춘다(planning.html 0.20).
  const PANEL_H=992,PANEL_W=492;
  function fitPanel(){
    const on=matchMedia('(orientation: landscape) and (min-width: 761px)').matches;
    if(!on||!root.classList.contains('is-playing'))return;
    const css=getComputedStyle(root),gap=parseFloat(getComputedStyle(root.querySelector('.game-shell')??root).columnGap)||16;
    const w=root.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight)-gap;
    const h=root.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);
    const size=Math.max(0,Math.min(h,w/(1+PANEL_W/PANEL_H)));
    root.style.setProperty('--game-size',size+'px');root.style.setProperty('--pz',String(size/PANEL_H));
  }
  function run(fn,note='',close=false,log=null){try{const before=structuredClone(s),wasEnd=s.board.phase==='end',board=fn(s.board);if(!B.valid(board))throw Error('기록을 확인할 수 없습니다.');undo=before;auctionMode=false;s={...s,board,note:'',scores:[null,null]};
    // 최근 기록(planning.html 0.19.4 5항): 오토가 켜진 판의 구입 · 경매 · 거래만 앞뒤 판을 비교해 남긴다.
    if(log&&s.auto?.some(Boolean))s.botLog=[log(before.board,board),...(s.botLog||[])].slice(0,D.bot.logLines);
    // 할 일이 끝나면(차례 마침 단계) 바로 다음 차례로 넘긴다. 되돌리기는 마지막 행동 전 상태를 그대로 쓴다(planning.html 0.11.2).
    if(!wasEnd&&board.phase==='end'&&s.runningSince!==null){const next=C.advance(s,Date.now());s=next.screen==='play'?{...next,board:B.beginTurn(next.board)}:next;save();if(close)dialog.close();render();return true;}
    save();if(close)dialog.close();play();return true;}catch(e){error(e.message);return false;}}
  function updateTimer(){if(home||s?.screen!=='play')return;const rem=C.remaining(s,Date.now());if(rem===0&&!s.ending){s=C.requestFinish(s);save();play();return;}const el=document.getElementById('timer');if(el){const sec=s.minutes===null?Math.floor(C.elapsed(s,Date.now())/1000):Math.ceil(rem/1000);el.setAttribute('aria-label',s.minutes===null?'플레이 시간':'남은 시간');el.classList.toggle('elapsed-clock',s.minutes===null);const text=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');if(el.textContent!==text)el.textContent=text;}}
  function cardDetail(c){return c.action==='repairs'?`주택 ${money(c.house)} · 호텔 ${money(c.hotel)}`:['receive','give','otherGive','otherReceive'].includes(c.action)?`${c.action==='receive'?'은행에서 받기':c.action==='give'?'은행에 내기':c.action==='otherGive'?'상대에게 내기':'상대에게 받기'} ${money(c.value)}`:c.action==='nearestStation'?'상대 소유면 임대료 두 배':c.action==='nearestUtility'?'새 주사위 합의 10배':c.action==='escape'?'사용할 때까지 보관':'';}
  function touchAmount(label,id,value=0){label=esc(label);return `<div class="touch-amount"><div class="amount-readout"><label id="${id}-label">${label}</label><input type="hidden" id="${id}" value="${value}" data-replace="true"><output id="${id}-display" aria-labelledby="${id}-label" aria-live="polite">${money(value)}</output><div class="amount-add">${[10,50,100].map(n=>button('+'+n,`data-amount-add="${n}" data-amount-id="${id}" aria-label="${label} ${n} 더하기"`)).join('')}</div></div><div class="number-pad" role="group" aria-label="${label} 숫자패드">${[1,2,3,4,5,6,7,8,9,'C',0,'back'].map(n=>button(n==='C'?'초기화':n==='back'?'삭제':n,`data-amount-key="${n}" data-amount-id="${id}" aria-label="${label} ${n==='C'?'초기화':n==='back'?'한 자리 삭제':'숫자 '+n}"`)).join('')}</div></div>`;}
  function setTouchAmount(id,key,add=false){const input=document.getElementById(id);if(!input)return;const old=input.value;let value=add?String(Number(old)+Number(key)):key==='C'?'0':key==='back'?old.slice(0,-1)||'0':(old==='0'?'':old)+key;if(!add&&!['C','back'].includes(key)&&input.dataset.replace==='true')value=String(key);const amount=C.amount(value);if(amount===null)return error('금액이 너무 큽니다.');input.value=String(amount);input.dataset.replace='false';document.getElementById(id+'-display').innerHTML=money(amount);if(id==='auction-amount')refreshAuction();else tradeFees();}
  const rentText=r=>r.factor?'주사위 합 × '+r.factor:money(r.amount??0);
  let portfolioTab='money',cardDue=null,portfolioView='',tradeFrom=null;
  const liveCardDue=()=>{const q=s?.board?.pending;return !!cardDue&&q?.type==='card'&&q.index===cardDue.index&&s.turns.join()===cardDue.turn;};
  function portfolio(p){const tab='money';
    const sameView=dialog.open&&dialog.classList.contains('finance-dialog')&&portfolioView===p+':'+tab,keepScroll=sameView?document.querySelector('#rule-dialog .asset-list')?.scrollTop??0:0;portfolioView=p+':'+tab;
    portfolioTab=tab;const b=s.board,q=b.pending,forCard=liveCardDue()&&cardDue.payer===p,due=forCard?cardDue.amount:C.current(s)===p&&['rent','pay','jailFee'].includes(q?.type)?q.amount??0:0,cash=b.players[p].cash,short=Math.max(0,due-cash);
    const assets=B.assetOptions(b,p).sort((a,c)=>Number(a.monopoly)-Number(c.monopoly)||Number(!!b.deeds[a.index].buildings)-Number(!!b.deeds[c.index].buildings)||a.index-c.index);
    function action(a,key,label){const v=a[key];if(!v)return '';return `<div class="asset-action">${button(label+(v.allowed?' '+money(Math.abs(v.change)):''),`data-manage="${key}" data-index="${a.index}" data-owner="${p}" ${v.allowed?'':'disabled'}`,key==='build'?'primary':'secondary')}${v.allowed?`<small>${v.change>=0?'현금 받기':'은행에 내기'} · 이후 임대료 ${rentText(v.rent)}</small>`:`<small class="blocked-reason">${esc(v.reason)}</small>`}</div>`;}
    const rows=assets.filter(a=>tab==='build'?B.isStreet(a.index):tab==='release'?b.deeds[a.index].mortgaged:true).map(a=>{const d=b.deeds[a.index];return `<section class="asset-row"><div class="asset-summary">${button(tileName(a.index),`data-tile="${a.index}"`)}<span>${a.monopoly?'독점 · ':''}${d.mortgaged?'저당 중':d.buildings===5?'호텔 1채':d.buildings?'주택 '+d.buildings+'채':'건물 없음'}</span><small>현재 임대료 ${rentText(a.rent)}</small></div><div class="asset-actions">${tab==='build'?button('여러 채 짓기',`data-build-plan="${a.index}" data-owner="${p}" ${a.monopoly?'':'disabled'}`,'primary')+(!a.monopoly?'<small>같은 색 도시를 전부 모아 주세요.</small>':''):tab==='release'?action(a,'release','저당 풀기'):d.mortgaged?action(a,'release','저당 풀기'):action(a,'sell','건물 한 채 팔기')+action(a,'mortgage','부지 저당 받기')+(a.sell&&!a.sell.allowed&&a.sellAll?.allowed?action(a,'sellAll','이 색 건물 모두 팔기'):'')}</div></section>`;}).join('');
    open('돈 마련 · 부지 관리',`<div class="portfolio-head"><div class="segmented">${s.names.map((n,i)=>button(esc(n),`data-portfolio="${i}" aria-pressed="${i===p}"`,i===p?'primary':'secondary')).join('')}</div><strong>현금 ${money(cash)}</strong></div>${due?`<div class="debt-status ${short?'is-short':''}"><span>낼 돈 ${money(due)}</span><strong>${short?'부족 '+money(short):'낼 수 있어요'}</strong></div>`:''}<div class="asset-list">${rows||'<p>해당 부지가 없습니다.</p>'}</div><div class="finance-footer">${tab==='money'?button('상대와 부지·돈 거래','data-action="trade"'):''}${forCard&&!short?button('카드로 돌아가기','data-action="card-return"','primary'):button(due&&!short?'닫고 지불하기':'게임으로 돌아가기','data-close','primary')}</div>`,true);dialog.classList.add('finance-dialog');dialog.classList.toggle('has-debt',due>0);if(keepScroll){const list=document.querySelector('#rule-dialog .asset-list');if(list)list.scrollTop=keepScroll;}
  }
  let construction=null;
  const buildingLabel=n=>n===5?'호텔 1채':n?'주택 '+n+'채':'건물 없음';
  function constructionPicker(p){
    const seen=new Set(),groups=Object.entries(s.board.deeds).filter(([i,d])=>d.owner===p&&B.isStreet(Number(i))).flatMap(([i])=>{const cities=B.group(Number(i)),key=cities[0];if(seen.has(key))return [];seen.add(key);return [cities];});
    open('집 짓기',`<div class="portfolio-head"><div class="segmented">${s.names.map((n,i)=>button(esc(n),`data-build-player="${i}" aria-pressed="${i===p}"`,i===p?'primary':'secondary')).join('')}</div><strong>현금 ${money(s.board.players[p].cash)}</strong></div><div class="construction-groups">${groups.map(cities=>{const complete=B.ownsSet(s.board,p,cities[0]);return button('<strong>'+cities.map(tileName).join(' · ')+'</strong><span>'+(complete?'도시별 수량 선택':'아직 모을 도시: '+cities.filter(i=>s.board.deeds[i].owner!==p).map(tileName).join(' · '))+'</span>',`data-build-plan="${cities[0]}" data-owner="${p}" ${complete?'':'disabled'}`);}).join('')||'<p>보유한 도시가 없어요. 같은 색 도시를 전부 모으면 지을 수 있어요.</p>'}</div>`);
  }
  function constructionPlan(p,index,reset=true){
    if(reset)construction={p,index,targets:B.group(index).map(i=>s.board.deeds[i].buildings)};
    const cities=B.group(index),targets=construction.targets,added=targets.reduce((n,t,k)=>n+t-s.board.deeds[cities[k]].buildings,0);let next=null,reason='';
    try{next=B.buildPlan(s.board,p,index,targets);}catch(e){reason=e.message;}
    const cost=next?s.board.players[p].cash-next.players[p].cash:targets.reduce((sum,t,k)=>{const d=s.board.deeds[cities[k]];return sum+(B.level(s.board,{buildings:t})-B.level(s.board,d))*d.houseCost;},0);
    open('여러 채 짓기',`<p class="construction-owner"><span>${esc(s.names[p])} · 현금 ${money(s.board.players[p].cash)}</span><small>건설 후 목표 수량</small></p><div class="construction-presets" role="group" aria-label="모든 도시 건설 후 목표">${(B.hotelAt(s.board)===4?[1,2,3,4,5]:[1,2,3,5]).map(n=>button(n===5?'모두 호텔':'모두 '+n+'채',`data-build-level="${n}" aria-pressed="${targets.every(t=>t===n)}" ${cities.some(i=>s.board.deeds[i].buildings>n)?'disabled':''}`)).join('')}</div><div class="construction-cities">${cities.map((i,k)=>`<section class="construction-city"><div><h3>${tileName(i)}</h3><p>현재 ${buildingLabel(s.board.deeds[i].buildings)}</p></div><div class="building-stepper">${button('−',`data-build-step="-1" data-city-key="${k}" aria-label="${tileName(i)} 계획 한 채 빼기" ${targets[k]<=s.board.deeds[i].buildings?'disabled':''}`)}<strong>${buildingLabel(targets[k])}</strong>${button('+',`data-build-step="1" data-city-key="${k}" aria-label="${tileName(i)} 계획 한 채 추가" ${targets[k]>=5?'disabled':''}`)}</div><small>건설 후 임대료 ${next?rentText(B.rentInfo(next,i)):'계획 조정 후 표시'}</small></section>`).join('')}</div><div class="construction-total" aria-live="polite"><span>총 건축비 <strong>${money(cost)}</strong></span><span>건설 후 현금 <strong>${money(s.board.players[p].cash-cost)}</strong></span></div><p class="construction-help ${reason?'is-short':''}" role="status">${esc(reason||'도시별 건물 수 차이는 한 채까지예요. 수량을 고르고 확정하세요.')}</p><div class="construction-footer">${button('다른 색 선택',`data-build-player="${p}"`)}${button('이대로 건설 '+money(cost),'data-build-confirm '+(!next||!added?'disabled':''),'primary')}</div>`);dialog.classList.add('construction-dialog');
  }
  // 부지 정보창: 소유자·임대료 표·건물 수와 금액 버튼만 둔다(planning.html 0.10). 행동이 없는 칸은 이름과 한 줄 설명만.
  function property(index){
    const d=s.board.deeds[index],t=D.board[index];
    if(!d){open(t[0],`<p class="tile-fact">${t[1]==='tax'?money(t[2])+' 내기':t[1]==='go'?'지나가면 '+money(t[2]):esc(D.tileFacts[t[1]]??'')}</p>`);return;}
    const info=B.deedInfo(s.board,index),p=d.owner,street=B.isStreet(index),group=info.indices,complete=info.complete,owned=info.count;
    const options=p===null?null:B.assetOptions(s.board,p).find(a=>a.index===index),sellAll=group.reduce((total,i)=>total+B.buildingValue(s.board,s.board.deeds[i])/2,0);
    const actions=p===null?'':`<div class="property-actions">${street?`${d.houseCost===null?field('권리증의 주택 한 채 가격','house-cost','','required'):''}${button(complete?'집 짓기':`집 짓기 <small>(같은 색 ${owned}/${group.length})</small>`,`data-build-plan="${index}" data-owner="${p}" ${complete?'':'disabled'}`,'primary')}${d.buildings?button('건물 한 채 팔기 '+money(d.houseCost/2),`data-property="sell" data-index="${index}" ${options.sell?.allowed?'':'disabled'}`)+button('이 색 건물 모두 팔기 '+money(sellAll),`data-property="sell-all" data-index="${index}"`):''}`:''}${d.mortgaged?button('저당 해제 '+money(Math.ceil(d.mortgage*110/100)),`data-property="mortgage" data-index="${index}"`):button('저당 받기 '+money(d.mortgage),`data-property="mortgage" data-index="${index}" ${options.mortgage?.allowed?'':'disabled'}`)}</div>`;
    const levels=street?(B.hotelAt(s.board)===4?[0,1,2,3,4,5]:[0,1,2,3,5]):[];
    const note=street?'같은 색 전부 보유 · 빈 땅 임대료 2배 · 주택·호텔 건설 가능':t[1]==='station'?'역 보유 수에 따라 임대료 상승 · 4곳이면 독점':'1곳은 이동 주사위 합 4배 · 두 곳 모두 보유하면 10배';
    const facts=`<dl class="deed-facts"><div><dt>소유:</dt><dd>${p===null?'은행':esc(s.names[p])}</dd></div><div><dt>가격:</dt><dd>${money(t[2])}</dd></div>${p!==null?`<div><dt>현재 임대료:</dt><dd>${rentText(B.rentInfo(s.board,index))}${d.mortgaged?' <small>저당</small>':''}</dd></div>`:''}</dl>`;
    const rents=`<section class="deed-rents"><h3>임대료</h3><div class="rent-schedule">${info.rents.map(row=>`<span class="${row.current?'current-rent':''}"><small>${row.label}</small>${row.factor?'주사위 합 × '+row.factor:money(row.amount)}</span>`).join('')}</div></section>`;
    const monopoly=`<section class="deed-monopoly"><div class="deed-set-heading"><h3>독점</h3><strong>${complete?esc(s.names[p])+' 독점':p===null?'전체 '+group.length+'곳':esc(s.names[p])+' '+owned+'/'+group.length+'곳'}</strong></div><div class="deed-set">${group.map(i=>{const owner=s.board.deeds[i].owner;return button(`<span>${tileName(i)}</span><small>${owner===null?'은행':esc(s.names[owner])}${s.board.deeds[i].mortgaged?' · 저당':''}</small>`,`data-tile="${i}" ${i===index?'aria-current="true"':''}`,owner===null?'secondary':'set-owner-'+owner);}).join('')}</div><p>${note}</p><small>${street?'같은 색에 저당이 있으면 건설 불가.':'주택·호텔 건설 불가.'} 저당 부지는 임대료 없음.${street?'':' 카드 지시 우선.'}</small></section>`;
    open(t[0],`${facts}${rents}${street?`<p class="building-price">주택·호텔 한 채 가격: <strong>${money(d.houseCost)}</strong></p>`:''}${d.buildings?`<p class="property-buildings">건물: ${d.buildings===5?'호텔':'주택 '+d.buildings+'채'}</p>`:''}${monopoly}${actions}<details><summary>실물 권리증과 기록 맞추기</summary><form id="deed-correct" data-index="${index}"><label for="deed-owner">주인</label><select id="deed-owner"><option value="" ${p===null?'selected':''}>은행</option>${s.names.map((n,i)=>`<option value="${i}" ${p===i?'selected':''}>${esc(n)}</option>`).join('')}</select>${street?`<label for="deed-buildings">건물</label><select id="deed-buildings">${levels.map(n=>`<option value="${n}" ${d.buildings===n?'selected':''}>${n===5?'호텔':n+'채'}</option>`).join('')}</select>`:''}<label class="check"><input id="deed-mortgaged" type="checkbox" ${d.mortgaged?'checked':''}>저당</label><button class="primary">기록 수정</button></form></details>`);
    dialog.classList.add('deed-dialog');
  }
  // 경매는 대화상자 없이 진행 칸 안에서 구입 표시를 대신한다(planning.html 0.10).
  function auction(){auctionMode=true;play();refreshAuction();}
  function auctionView(){const p=C.current(s);return `<form id="auction-form" class="auction-inline"><input type="hidden" id="auction-winner" value="${p}"><div class="auction-players">${s.names.map((n,i)=>button(esc(n)+`<small>${money(s.board.players[i].cash)}</small>`,`data-auction-player="${i}" aria-pressed="${i===p}"`,i===p?'primary':'secondary')).join('')}</div>${touchAmount('낙찰가','auction-amount',10)}<p id="auction-status" class="amount-status" aria-live="polite"></p><div class="button-row task-actions"><button class="primary two-line" id="auction-confirm">낙찰<small>돈을 내고 권리증 받기</small></button>${button('유찰<small>아무도 입찰 안 함</small>','data-board="no-bid"','secondary two-line')}${button('돌아가기','data-action="auction-cancel"','secondary auction-back')}</div></form>`;}
  function refreshAuction(){const amount=C.amount(document.getElementById('auction-amount').value),p=Number(document.getElementById('auction-winner').value),available=s.board.players[p].cash,status=document.getElementById('auction-status');const valid=amount!==null&&amount>=10&&amount<=available;document.getElementById('auction-confirm').disabled=!valid;status.innerHTML=amount===null||amount<10?'최소 '+money(10):amount>available?`현금 ${money(amount-available)} 부족`:'';status.classList.toggle('is-short',!valid);}
  function cardList(){const deck=D.board[s.board.pending.index][1];open(tileName(s.board.pending.index),`<div class="card-catalog">${D.cards[deck].map(c=>button('<strong>'+esc(c.title)+'</strong><span>'+cardDetail(c)+'</span>',`data-card-id="${c.id}"`)).join('')}</div>`,true);}
  function cardPreview(id){const p=C.current(s),deck=D.board[s.board.pending.index][1],c=B.cardSummary(s.board,p,deck,id);let instruction;
    if(c.action==='receive')instruction=`은행에서 ${money(c.amount)} 받으세요.`;
    else if(c.action==='give'||c.action==='repairs')instruction=`은행에 ${money(c.amount)} 내세요.`;
    else if(c.action==='otherGive')instruction=`${esc(s.names[1-p])}에게 ${money(c.amount)} 내세요.`;
    else if(c.action==='otherReceive')instruction=`${esc(s.names[1-p])}에게 ${money(c.amount)} 받으세요.`;
    else if(c.action==='jail')instruction='감옥으로 이동하세요.';
    else if(c.action==='escape')instruction='이 카드는 보관하세요.';
    else if(c.action==='backThree')instruction='세 칸 뒤로 이동하세요.';
    else if(c.action==='nearestStation')instruction='앞으로 가장 가까운 역으로 가세요. 상대 소유라면 임대료 두 배입니다.';
    else if(c.action==='nearestUtility')instruction='앞으로 가장 가까운 공공 기관으로 가세요. 상대 소유라면 주사위를 새로 굴려 10배를 내세요.';
    else instruction=`${tileName(c.value)}${c.value===0?'로':' 칸으로'} 이동하세요.${c.value===0?' 은행에서 '+money(200)+' 받으세요.':''}`;
    const payer=['give','repairs','otherGive'].includes(c.action)?p:c.action==='otherReceive'?1-p:null,short=payer===null?0:Math.max(0,c.amount-s.board.players[payer].cash);
    cardDue=short?{payer,amount:c.amount,id,index:s.board.pending.index,turn:s.turns.join()}:null;
    open(tileName(s.board.pending.index)+' · '+c.title,`<p class="instruction">${instruction}</p>${c.action==='repairs'?`<p>주택 한 채 ${money(c.house)} · 호텔 한 채 ${money(c.hotel)}</p>`:''}${short?`<p class="amount-status is-short">${payer!==p?esc(s.names[payer])+' ':''}현금 ${money(short)} 부족</p>`:''}<div class="button-row">${short?button('돈 마련',`data-action="card-funds"`,'primary'):button('처리하기',`data-apply-card="${c.id}"`,'primary')}${button('다시 선택','data-action="card-pick"')}</div>`);
  }
  function trading(){
    open('부지·돈 거래',`<form id="trade-form"><div class="trade-grid touch-trade">${s.names.map((n,p)=>`<section><h3>${esc(n)}가 줄 것 <small>현금 ${money(s.board.players[p].cash)}</small></h3><label>부지 한 곳 선택</label><input type="hidden" id="trade-deed-${p}" value=""><div class="trade-deeds">${button('부지 없음',`data-trade-deed="" data-player="${p}" aria-pressed="true"`,'primary')}${Object.entries(s.board.deeds).filter(([,d])=>d.owner===p).map(([i,d])=>{const reason=B.tradeReason(s.board,Number(i));return button(esc(tileName(Number(i)))+`<small>${reason||('인쇄 가격 '+money(D.board[i][2])+(d.mortgaged?' · 저당 중':''))}</small>`,`data-trade-deed="${i}" data-player="${p}" aria-pressed="false" ${reason?'disabled':''}`);}).join('')}</div>${touchAmount(n+'가 줄 현금','trade-cash-'+p,0)}<label class="check" id="release-label-${p}" hidden><input type="checkbox" id="release-${p}">받는 저당을 즉시 해제</label></section>`).join('')}</div><div class="trade-preview" id="trade-preview" aria-live="polite"></div><p id="trade-fees"></p><div class="trade-footer">${tradeFrom!==null?button('돈 마련으로','data-action="trade-back"'):''}<button class="primary" id="trade-confirm">둘 다 동의 · 이대로 거래</button></div></form>`,true);tradeFees();
  }
  function tradeFees(){
    const picked=[0,1].map(p=>document.getElementById('trade-deed-'+p).value),incoming=[picked[1],picked[0]],amounts=[0,1].map(p=>C.amount(document.getElementById('trade-cash-'+p).value));
    incoming.forEach((v,p)=>{const applicable=v!==''&&s.board.deeds[v].mortgaged;document.getElementById('release-label-'+p).hidden=!applicable;if(!applicable)document.getElementById('release-'+p).checked=false;});
    const parts=incoming.flatMap((v,p)=>v!==''&&s.board.deeds[v].mortgaged?[s.names[p]+' 은행 비용 '+moneyText(Math.ceil(s.board.deeds[v].mortgage*(document.getElementById('release-'+p).checked?110:10)/100))]:[]);document.getElementById('trade-fees').innerHTML=richText(parts.join(' · '));
    const preview=document.getElementById('trade-preview'),confirm=document.getElementById('trade-confirm'),empty=picked.every(v=>v==='')&&amounts.every(n=>n===0);confirm.disabled=true;preview.classList.remove('is-short');
    if(empty){preview.textContent='서로 줄 부지와 돈을 먼저 골라 주세요.';return;}
    try{const next=B.trade(s.board,...picked.map(v=>v===''?null:Number(v)),...amounts,document.getElementById('release-0').checked,document.getElementById('release-1').checked);preview.innerHTML=s.names.map((n,p)=>`<p><strong>${esc(n)}가 줄 것</strong> ${picked[p]===''?'부지 없음':tileName(Number(picked[p]))} · ${money(amounts[p])}<small>거래 후 현금 ${money(next.players[p].cash)}</small></p>`).join('');confirm.disabled=false;}catch(e){preview.textContent=e.message;preview.classList.add('is-short');}
  }
  function correction(importing=false){
    const b=s.board??B.create(false,0);
    open(importing?'현재 판 입력':'실물과 기록 맞추기',`<form id="correct-form" data-import="${importing}"><div class="trade-grid">${s.names.map((n,p)=>`<section><h3>${esc(n)}</h3>${field('실제 현금','correct-cash-'+p,importing?'':b.players[p].cash,'required')}<label for="correct-pos-${p}">말 위치</label><select id="correct-pos-${p}">${tileOptions(b.players[p].pos)}</select><label class="check"><input type="checkbox" id="correct-jail-${p}" ${b.players[p].jail?'checked':''}>감옥에 수감 중</label></section>`).join('')}</div>${importing?`<h3>권리증 주인</h3><div class="import-deeds">${Object.keys(b.deeds).map(i=>`<label>${tileName(Number(i))}<select data-import-owner="${i}"><option value="">은행</option>${s.names.map((n,p)=>`<option value="${p}">${esc(n)}</option>`).join('')}</select></label>`).join('')}</div><label class="check"><input type="checkbox" required>말·현금·모든 권리증을 대조했습니다.</label><p>건물·저당은 입력 후 해당 부지를 눌러 맞추세요.</p>`:'<p>말 위치를 바꾸면 다음 주사위 입력부터 진행합니다.</p>'}<button class="primary">기록 맞추기</button></form>`,importing);
  }
  function showRule(id){managerId=id;path=['start'];renderGuide();}
  function renderGuide(){const flow=MC_MANAGER.flows(s?.names??D.players,s?.board?B.hotelAt(s.board):4)[managerId],n=flow?.[path.at(-1)];if(!n)return;open(n.title,`<p class="instruction">${richText(n.text)}</p>${n.note?`<p>${richText(n.note)}</p>`:''}<div class="guide-choices">${n.choices.map((c,i)=>button(richText(c.label),`data-guide="${c.next}"`,i===0?'primary':'secondary')).join('')}</div>${path.length>1?button('이전','data-action="guide-back"'):''}`);}
  function bankrupt(){open('파산',`<p>건물 판매·저당으로도 빚을 못 갚는 사람</p><div class="button-row">${s.names.map((n,i)=>button(esc(n),`data-bankrupt="${i}"`,'danger')).join('')}</div>`);}
  function finish(){
    root.innerHTML=heading('결산')+`<p>두 사람 모두 ${s.turns[0]}차례를 마쳤습니다.</p><p>현금 + 부지 + 건물 구매금액으로 비교합니다. 저당 부지는 저당 가격입니다.</p><div class="button-row">${button('재산 확인','data-action="score"','primary')}${button('마지막 차례로 돌아가기','data-action="return-play"')}</div>`;
  }
  function score(){
    const b=s.board,fields=['현금','저당 아닌 부지값 합계','저당 부지의 저당값 합계','건물 구매금액 합계'];
    if(b&&s.scores.every(x=>x===null)){s.scores=b.players.map((person,p)=>{const deeds=Object.entries(b.deeds).filter(([,d])=>d.owner===p),unknown=deeds.some(([,d])=>d.buildings&&d.houseCost===null);return [String(person.cash),String(deeds.filter(([,d])=>!d.mortgaged).reduce((a,[i])=>a+D.board[i][2],0)),String(deeds.filter(([,d])=>d.mortgaged).reduce((a,[,d])=>a+d.mortgage,0)),unknown?'':String(deeds.reduce((a,[,d])=>a+B.buildingValue(b,d),0))];});save();}
    root.innerHTML=heading('재산 확인')+`<form id="score-form"><div class="score-grid">${s.names.map((n,p)=>`<section><h2>${esc(n)}</h2>${fields.map((label,i)=>field(label,`score-${p}-${i}`,esc(s.scores[p]?.[i]??''),'data-score required')).join('')}<p>총자산 <strong id="total-${p}"></strong></p></section>`).join('')}</div><div class="button-row">${button('이전','data-action="finish"')}<button class="primary">결과</button></div></form><p id="action-error" class="error" hidden></p>`;refreshTotals();
  }
  function captureScores(){s.scores=[0,1].map(p=>[0,1,2,3].map(i=>document.getElementById(`score-${p}-${i}`).value));save();}
  function refreshTotals(){[0,1].forEach(p=>{const n=C.total([0,1,2,3].map(i=>document.getElementById(`score-${p}-${i}`).value));document.getElementById('total-'+p).innerHTML=n===null?'입력 필요':money(n);});}
  function result(){
    if(s.board){play();stopWalk();root.classList.add('is-finished');}else{root.className='';root.innerHTML='';}
    const title=s.winner==='tie'?'공동 승리':s.names[s.winner]+' 승리';
    open(title,`${s.finishReason==='bankruptcy'?`<p class="result-reason">${esc(s.names[1-s.winner])} 파산</p>`:`<div class="result-scores">${s.names.map((n,p)=>`<section><h3>${esc(n)}</h3><strong>${money(C.total(s.scores[p]))}</strong></section>`).join('')}</div>`}<div class="result-actions">${s.finishReason==='time'?button('결산 수정','data-action="result-score"'):''}${button('새 판 준비','data-action="home"','primary')}</div>`);
    dialog.classList.add('result-dialog');dialog.querySelector('[data-close]').remove();fitResult();document.getElementById('rule-title').focus({preventScroll:true});
  }
  function fitResult(){
    if(!dialog.classList.contains('result-dialog'))return;
    const vp=viewport();const anchor=vp&&matchMedia('(orientation:landscape) and (min-width:761px)').matches;
    dialog.classList.toggle('on-board',!!anchor);
    if(anchor){const r=vp.getBoundingClientRect();dialog.style.setProperty('--result-x',(r.left+r.width/2)+'px');dialog.style.setProperty('--result-y',(r.top+r.height/2)+'px');dialog.style.setProperty('--result-width',Math.min(r.width-32,560)+'px');}
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-close],[data-close-ok]')){e.target.closest('dialog').close();return;}
    if(menuOpen&&!e.target.closest('.menu-pop,[data-action="menu"]')){menuOpen=false;document.querySelector('.menu-pop')?.remove();}
    const el=e.target.closest('button');if(!el)return;
    if(menuOpen&&el.closest('.menu-pop')&&!el.dataset.zoom){menuOpen=false;document.querySelector('.menu-pop')?.remove();}
    if(el.dataset.zoom)return zoomButton(el.dataset.zoom);
    if(el.dataset.amountKey!==undefined)return setTouchAmount(el.dataset.amountId,el.dataset.amountKey);
    if(el.dataset.amountAdd!==undefined)return setTouchAmount(el.dataset.amountId,el.dataset.amountAdd,true);
    if(el.dataset.auctionPlayer!==undefined){document.getElementById('auction-winner').value=el.dataset.auctionPlayer;for(const b of document.querySelectorAll('[data-auction-player]')){const selected=b===el;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('primary',selected);b.classList.toggle('secondary',!selected);}return refreshAuction();}
    if(el.dataset.tradeDeed!==undefined){document.getElementById('trade-deed-'+el.dataset.player).value=el.dataset.tradeDeed;for(const b of document.querySelectorAll(`[data-trade-deed][data-player="${el.dataset.player}"]`)){const selected=b===el;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('primary',selected);b.classList.toggle('secondary',!selected);}return tradeFees();}
    if(el.dataset.buildPlayer!==undefined)return constructionPicker(Number(el.dataset.buildPlayer));
    if(el.dataset.buildPlan!==undefined)return constructionPlan(Number(el.dataset.owner),Number(el.dataset.buildPlan));
    if(el.dataset.buildLevel!==undefined){construction.targets=B.group(construction.index).map(i=>Math.max(s.board.deeds[i].buildings,Number(el.dataset.buildLevel)));return constructionPlan(construction.p,construction.index,false);}
    if(el.dataset.buildStep!==undefined){const k=Number(el.dataset.cityKey),i=B.group(construction.index)[k];construction.targets[k]=Math.max(s.board.deeds[i].buildings,Math.min(5,stepTarget(construction.targets[k],Number(el.dataset.buildStep))));constructionPlan(construction.p,construction.index,false);document.querySelector('[data-build-step="'+el.dataset.buildStep+'"][data-city-key="'+k+'"]')?.focus({preventScroll:true});return;}
    if(el.hasAttribute('data-build-confirm'))return run(b=>B.buildPlan(b,construction.p,construction.index,construction.targets),'실물'+' 주택·호텔도 계획한 수로 맞추세요.',true);
    if(el.dataset.financeTab)return portfolio(Number(el.dataset.owner));
    if(el.dataset.manage){const p=Number(el.dataset.owner),i=Number(el.dataset.index),action=el.dataset.manage;const fn=b=>action==='build'?B.build(b,p,i):action==='sell'?B.sell(b,p,i):action==='sellAll'?B.sell(b,p,i,true):B.mortgage(b,p,i);if(run(fn,'실물 돈·건물·권리증도 같은 상태로 맞추세요.'))portfolio(p);return;}
    if(el.dataset.die!==undefined){const index=Number(el.dataset.die),value=Number(el.dataset.value);diceSelection[index]=value;for(const face of document.querySelectorAll(`[data-die="${index}"]`)){const checked=Number(face.dataset.value)===value;face.setAttribute('aria-checked',String(checked));face.classList.toggle('selected',checked);}const submit=document.querySelector('.dice-submit');if(submit)submit.disabled=diceSelection.some(n=>n===null);const summary=document.querySelector('.dice-summary');if(summary)summary.textContent=diceSummary();return;}
    if(el.dataset.preset){const colors=[...draft.playerColors],first=draft.first;const bonuses=[...draft.bonuses];draft=C.createPreset(D.players,el.dataset.preset,first);draft.playerColors=colors;draft.bonuses=bonuses;return preparation();}
    if(el.dataset.playerColor){draft.playerColors=C.chooseColor(draft.playerColors,Number(el.dataset.player),el.dataset.playerColor);return preparation();}
    if(el.dataset.bonusOpen!==undefined){const p=Number(el.dataset.bonusOpen),cur=draft.bonuses[p];return open(D.players[p]+' 보너스',`<div class="bonus-choices">${D.bonusOptions.map(v=>button('+'+money(v),`data-bonus-set="${v}" data-player="${p}" aria-pressed="${cur===v}"`,cur===v?'primary':'secondary')).join('')}</div><div class="button-row">${button('초기화',`data-bonus-set="0" data-player="${p}" ${cur?'':'disabled'}`)}</div>`);}
    if(el.dataset.bonusSet!==undefined){draft.bonuses[Number(el.dataset.player)]=Number(el.dataset.bonusSet);dialog.close();return preparation();}
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
    if(el.dataset.auto!==undefined){if(botDice){botDice=null;diceSelection=[null,null];}const auto=[...(s.auto??[false,false])];auto[Number(el.dataset.auto)]=!auto[Number(el.dataset.auto)];s={...s,auto};save();return play();}
    if(el.dataset.speed!==undefined){s={...s,speed:Number(el.dataset.speed)};save();return play();}
    if(el.dataset.botOffer!==undefined){const offer=botOffer;botOffer=null;dialog.close();if(!offer)return;if(el.dataset.botOffer==='yes')run(b=>BOT.applyOffer(b,offer),'',false,tradeLog(offer));else{addLog({kind:'reject',index:offer.index});save();play();}return;}
    const a=el.dataset.action;
    if(a==='menu'){menuOpen=!menuOpen;return play();}
    if(a==='rules')return open('규칙',`<div class="menu-list">${D.rules.map(r=>button(r.title,`data-rule="${r.id}"`)).join('')}</div>`);
    if((a==='home'||a==='undo')&&dialog.open)dialog.close();
    if(a==='result-score'){dialog.close();return set({...s,screen:'score'});}
    if(a==='home'){home=true;auctionMode=false;if(s?.screen==='setup')draft=makeDraft(s);render();return;}
    if(a==='resume'){home=false;render();return;}
    if(a==='start'){if(s){pendingNew=true;confirmDialog.showModal();}else start();return;}
    if(a==='pause'){s=s.runningSince===null?{...s,runningSince:Date.now()}:C.pause(s,Date.now());save();render();return;}
    if(a==='end')return open('게임 마무리',`<p class="instruction">${endingText(C.requestFinish(s))}</p><div class="button-row">${button('마무리 시작','data-action="end-confirm"','primary')}${button('취소','data-close')}</div>`);
    if(a==='end-confirm'){dialog.close();s=C.requestFinish(s);save();render();return;}
    if(a==='end-cancel'){s={...s,ending:false,targetTurns:null};save();render();return;}
    if(a==='undo'&&undo){seenPos=null;stopWalk();auctionMode=false;const time=C.elapsed(s,Date.now()),running=s.runningSince!==null,old=undo;undo=null;s={...old,elapsed:time,runningSince:running?Date.now():null,note:''};save();render();return;}
    if(a==='card-pick'){cardDue=null;return cardList();}if(a==='card-funds'&&liveCardDue())return portfolio(cardDue.payer,'money');if(a==='card-return'&&liveCardDue())return cardPreview(cardDue.id);if(a==='auction')return auction();if(a==='auction-cancel'){auctionMode=false;return play();}if(a==='trade'){tradeFrom=el.closest('.finance-footer')?Number(portfolioView.split(':')[0]):null;return trading();}
    if(a==='trade-back'&&tradeFrom!==null)return portfolio(tradeFrom,'money');
    if(a==='correct'||a==='import')return correction(a==='import');
    if(a==='properties')return portfolio(p,'money');
    if(a==='build')return constructionPicker(p);
    if(a==='bankrupt')return bankrupt();
    if(a==='guide-back'){path.pop();return renderGuide();}
    if(a==='rent-adjust')return open('이번 임대료 수정',`<form id="rent-adjust-form">${field('실물 권리증·카드의 최종 금액','rent-adjust',s.board.pending.amount,'required')}<button class="primary">금액 수정</button></form>`);
    if(a==='finish')return set({...s,screen:'finish'});if(a==='score')return set({...s,screen:'score'});
    if(a==='return-play'){const turns=[...s.turns];turns[1-s.first]--;const board=s.board?{...s.board,phase:'end',pending:null}:undefined;return set({...s,board,screen:'play',turns,runningSince:Date.now()});}
    if(a==='legacy-next'){undo=structuredClone(s);return set(C.advance(s,Date.now()));}
    const op=el.dataset.board;if(!op)return;
    if(op==='ack')run(b=>B.acknowledge(b));
    if(op==='buy')run(b=>B.purchase(b,p),'부지값을 은행에 내고 권리증을 받으세요.');
    if(op==='no-bid')run(b=>B.purchase(b,p,null),'부지는 은행에 둡니다.',true,auctionLog(s.board.pending?.index));
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
    if(id==='auction-form')return run(b=>B.purchase(b,p,Number(document.getElementById('auction-winner').value),C.amount(document.getElementById('auction-amount').value)),'낙찰금을 은행에 내고 권리증을 받으세요.',true,auctionLog(s.board.pending?.index));
    if(id==='trade-form'){const v=[0,1].map(i=>document.getElementById('trade-deed-'+i).value);const back=tradeFrom,done=run(b=>B.trade(b,v[0]===''?null:Number(v[0]),v[1]===''?null:Number(v[1]),C.amount(document.getElementById('trade-cash-0').value),C.amount(document.getElementById('trade-cash-1').value),document.getElementById('release-0').checked,document.getElementById('release-1').checked),'권리증·돈을 교환하고 저당 인수 비용은 은행에 내세요.',back===null);if(done&&back!==null)portfolio(back,'money');return;}
    if(id==='deed-correct'){const index=Number(f.dataset.index);return run(b=>{const next=structuredClone(b),d=next.deeds[index],v=document.getElementById('deed-owner').value;d.owner=v===''?null:Number(v);d.buildings=Number(document.getElementById('deed-buildings')?.value??0);d.mortgaged=document.getElementById('deed-mortgaged').checked;if(d.owner===null&&(d.buildings||d.mortgaged))throw Error('은행 부지에는 건물·저당을 넣을 수 없습니다.');if(d.mortgaged&&d.buildings)throw Error('건물이 있는 부지를 저당 잡을 수 없습니다.');return next;},'실물 권리증 기준으로 맞췄습니다.',true);}
    if(id==='correct-form'){seenPos=null;
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
  // 오토 돌리개(planning.html 0.19.4 3항): 조건이 맞는 동안 걸음 간격 ÷ 배속마다 봇 행동 하나를 기존 run() 으로 실행한다.
  let botOffer=null,botDice=null,botTimer=null,clockTimer=null;
  function speedNow(){return s?.auto?.some(Boolean)?(s.speed||1):1;}
  function botReady(){return !document.hidden&&!home&&s?.screen==='play'&&!!s.board&&!!s.auto?.[C.current(s)]&&s.runningSince!==null&&!dialog.open&&!confirmDialog.open&&!menuOpen&&!walk&&!gesture&&!auctionMode;}
  function liveBotCard(){const c=s.botCard,q=s.board.pending;return c&&q?.type==='card'&&q.index===c.index&&c.turn===s.turns.join()&&D.cards[c.deck]?.some(x=>x.id===c.id)?{deck:c.deck,id:c.id}:null;}
  function offerView(o){if(o.type==='swap'){const row=(i,a,c)=>`<p class="dealt-row"><span>${tileName(i)}${s.board.deeds[i].mortgaged?' <small>저당</small>':''}</span><strong>${esc(s.names[a])} → ${esc(s.names[c])}</strong></p>`,payer=o.amount>0?o.from:o.to;return `<div class="bot-offer">${row(o.give,o.from,o.to)}${row(o.take,o.to,o.from)}${o.amount?`<p class="dealt-row"><span>${money(Math.abs(o.amount))}</span><strong>${esc(s.names[payer])} → ${esc(s.names[1-payer])}</strong></p>`:''}</div><div class="button-row">${button('수락','data-bot-offer="yes"','primary')}${button('거절','data-bot-offer="no"')}</div>`;}const seller=o.type==='sell'?o.from:o.to,buyer=1-seller,mortgaged=s.board.deeds[o.index].mortgaged;return `<div class="bot-offer"><p class="dealt-row"><span>${tileName(o.index)}${mortgaged?' <small>저당</small>':''}</span><strong>${esc(s.names[seller])} → ${esc(s.names[buyer])}</strong></p><p class="dealt-row"><span>${money(o.amount)}</span><strong>${esc(s.names[buyer])} → ${esc(s.names[seller])}</strong></p></div><div class="button-row">${button('수락','data-bot-offer="yes"','primary')}${button('거절','data-bot-offer="no"')}</div>`;}
  const buyLog=(p,i)=>(o,n)=>({kind:'buy',who:p,index:i,amount:o.players[p].cash-n.players[p].cash});
  const auctionLog=i=>(o,n)=>{const w=n.deeds[i].owner;return w===null||w===undefined?{kind:'auction',index:i,winner:null,amount:null}:{kind:'auction',index:i,winner:w,amount:o.players[w].cash-n.players[w].cash};};
  const tradeLog=o=>{if(o.type==='swap')return ()=>({kind:'swap',index:o.give,give:o.give,take:o.take,from:o.from,to:o.to,amount:o.amount});const seller=o.type==='sell'?o.from:o.to;return ()=>({kind:'trade',index:o.index,from:seller,to:1-seller,amount:o.amount});};
  function addLog(e){if(s.auto?.some(Boolean))s.botLog=[e,...(s.botLog||[])].slice(0,D.bot.logLines);}
  function logText(e){const t=esc(tileName(e.index));if(e.kind==='buy')return `${esc(s.names[e.who])} 구입 · ${t} ${money(e.amount)}`;if(e.kind==='auction')return e.winner===null?`경매 · ${t} · 유찰`:`경매 · ${t} · ${esc(s.names[e.winner])} ${money(e.amount)} 낙찰`;if(e.kind==='trade')return `거래 · ${t} · ${esc(s.names[e.from])} → ${esc(s.names[e.to])} ${money(e.amount)}`;if(e.kind==='swap')return `맞교환 · ${esc(tileName(e.give))} ↔ ${esc(tileName(e.take))}${e.amount?` · ${esc(s.names[e.amount>0?e.from:e.to])} ${money(Math.abs(e.amount))}`:''}`;return `거래 거절 · ${t}`;}
  function logView(){return s.auto?.some(Boolean)&&s.botLog?.length?`<ol class="bot-log" aria-label="최근 기록">${s.botLog.map(e=>`<li class="log-${e.kind}">${logText(e)}</li>`).join('')}</ol>`:'';}
  function botStep(){
    const p=C.current(s),b=s.board,turnKey=s.turns.join();
    if(s.botMemo.turn!==turnKey)s.botMemo={...s.botMemo,turn:turnKey,asked:false,swapAsked:false,fundAsked:[],steps:0};
    // 걸음 상한: 판을 멈추고 걸음 수를 비워, 계속을 누르면 다시 상한만큼 진행한다.
    if(++s.botMemo.steps>D.bot.maxStepsPerTurn){s.botMemo.steps=0;s=C.pause(s,Date.now());save();render();return;}
    const act=BOT.decide(b,p,{opponentAuto:!!s.auto[1-p],turnNo:s.turns[p],memo:s.botMemo,card:liveBotCard()});
    if(act.kind==='roll'||act.kind==='utilityRoll'){const key=turnKey+'|'+b.phase+'|'+act.kind+'|'+(b.dice??[]).join();if(botDice?.key!==key){botDice={key,dice:[BOT.die(),BOT.die()]};diceSelection=[...botDice.dice];save();play();return;}const dice=botDice.dice;botDice=null;diceSelection=[null,null];run(x=>BOT.apply(x,p,{...act,dice}));return;}
    if(act.kind==='next'){if(b.phase!=='end')return;undo=structuredClone(s);let next=C.advance(s,Date.now());if(next.screen==='play')next={...next,board:B.beginTurn(next.board),note:''};set(next);return;}
    if(act.kind==='draw'){const r=BOT.drawCard(s.decks,act.deck,b.players.some(x=>x.cards>0));const c=D.cards[act.deck].find(x=>x.id===r.id);s={...s,decks:r.decks,botCard:{deck:act.deck,id:r.id,index:b.pending.index,turn:turnKey},note:tileName(b.pending.index)+' · '+c.title};save();play();return;}
    if(act.kind==='card'){if(run(x=>BOT.apply(x,p,act))){s.botCard=null;save();}return;}
    if(act.kind==='auctionHuman')return auction();
    if(act.kind==='humanFunds')return portfolio(act.who,'money');
    if(act.kind==='bankrupt'){undo=structuredClone(s);set({...C.pause(s,Date.now()),screen:'result',winner:1-act.who,finishReason:'bankruptcy'});return;}
    if(act.kind==='offer'){if(act.type==='sell')s.botMemo.fundAsked=[...(Array.isArray(s.botMemo.fundAsked)?s.botMemo.fundAsked:[]),act.index];else if(act.type==='swap'){s.botMemo.swapAsked=true;s.botMemo.offers={...s.botMemo.offers,[BOT.swapKey(act.give,act.take)]:s.turns[act.from]};}else{s.botMemo.asked=true;s.botMemo.offers={...s.botMemo.offers,[act.index]:s.turns[act.from]};}save();
      if(s.auto[act.to]){if(BOT.accept(b,act))run(x=>BOT.applyOffer(x,act),'',false,tradeLog(act));else{addLog({kind:'reject',index:act.index});save();play();}return;}
      botOffer=act;return open(act.type==='swap'?'맞교환 요청':'거래 요청',offerView(act));}
    if(act.kind==='wait')return;
    const log=act.kind==='buy'?buyLog(p,b.pending.index):act.kind==='decline'?auctionLog(b.pending.index):null;
    run(x=>BOT.apply(x,p,act),'',false,log);
  }
  // 대기 중에는 반복 확인하지 않고, 실제 진행할 행동·시계만 예약한다.
  function syncClock(){
    const live=!document.hidden&&!home&&s?.screen==='play'&&s.runningSince!==null;
    if(!live){clearTimeout(clockTimer);clockTimer=null;return;}
    if(clockTimer===null)clockTimer=setTimeout(()=>{clockTimer=null;updateTimer();syncClock();},D.tick);
  }
  function syncActivity(){
    clearTimeout(botTimer);botTimer=null;syncClock();
    if(botReady())botTimer=setTimeout(()=>{botTimer=null;if(botReady())botStep();syncActivity();},D.bot.stepMs/speedNow());
  }
  const afterInteraction=()=>queueMicrotask(syncActivity);
  for(const name of ['click','submit','pointerdown','pointerup','pointercancel'])document.addEventListener(name,afterInteraction);
  dialog.addEventListener('cancel',e=>{if(dialog.classList.contains('result-dialog'))e.preventDefault();});
  dialog.addEventListener('close',afterInteraction);confirmDialog.addEventListener('close',afterInteraction);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopWalk();touches.clear();gesture=null;}else if(!home&&s?.screen==='play')updateTimer();syncActivity();});
  window.addEventListener('pagehide',()=>{stopWalk();clearTimeout(botTimer);clearTimeout(clockTimer);botTimer=clockTimer=null;});
  window.addEventListener('pageshow',()=>{if(!home&&s?.screen==='play')updateTimer();syncActivity();});
  render();
})();
