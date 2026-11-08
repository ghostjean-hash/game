(function () {
  'use strict';
  const D = globalThis.MC_DATA, C = globalThis.MC;
  const root = document.getElementById('app');
  const ruleDialog = document.getElementById('rule-dialog');
  const newDialog = document.getElementById('confirm-dialog');
  const money = n => Number(n).toLocaleString('ko-KR');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let session = load(), home = true, duration = 45, undo = null, managerId = null, managerPath = [];
  function load() { try { const s = JSON.parse(localStorage.getItem(D.storageKey)); if(!C.valid(s))return null; if(s.names[0]==='나'&&s.names[1]==='딸')s.names=[...D.players]; return s; } catch { return null; } }
  function save() { try { localStorage.setItem(D.storageKey, JSON.stringify(session)); document.getElementById('save-warning').hidden = localStorage.getItem(D.storageKey) === JSON.stringify(session); } catch { document.getElementById('save-warning').hidden = false; } }
  function set(next, keepScroll = false) { session = next; save(); render(); if (!keepScroll) { window.scrollTo({ top: 0 }); root.querySelector('h1,h2')?.focus({ preventScroll: true }); } }
  function heading(eyebrow, title) { return `<div class="screen-head"><div><span class="eyebrow">${eyebrow}</span><h1 tabindex="-1">${title}</h1></div><button class="text-button" data-action="home">테이블 처음으로</button></div>`; }
  function artwork() { return `<div class="hero-art" aria-hidden="true"><div class="halo"></div><div class="mini-board"><div class="board-tiles">${['#dbb251','#d88054','#cf6265','#7c9c82','#84a7b2','#d0ad71','#89a39a'].map(c => `<i style="--tile:${c}"></i>`).join('')}</div><span class="board-word">our little<br>property club<small>JUST THE TWO OF US</small></span><div class="board-tiles bottom">${['#93a9ba','#6d9586','#dbb251','#cf6265','#d88054','#89a39a','#94a0b5'].map(c => `<i style="--tile:${c}"></i>`).join('')}</div></div><div class="house"></div><div class="house two"></div><div class="dice"><i></i><i></i><i></i><i></i></div><span class="art-note">a little less rules, a little more us.</span></div>`; }
  function renderHome() {
    root.innerHTML = `${session ? `<section class="resume"><p><strong>${esc(session.names.join(' & '))}</strong>의 테이블이 남아 있어요.<br><small>${session.screen === 'result' ? '지난 결과 보기' : session.screen === 'setup' ? '준비하던 곳부터 이어갈 수 있어요.' : '기록된 차례와 시간을 이어갈 수 있어요.'}</small></p><div class="button-row"><button class="primary" data-action="resume">${session.screen === 'result' ? '결과 보기' : '이어하기'} ↗</button><button class="text-button" data-action="new">새 판</button></div></section>` : ''}
    <section class="hero"><div class="hero-copy"><span class="eyebrow">LESS READING, MORE PLAYING</span><h1>우리 둘의 모노폴리,<br><em>한 시간이면 충분하게.</em></h1><p>긴 설명서 대신, 지금 필요한 도움만.<br>땅을 모으고 집을 짓는 재미까지 함께 가요.</p></div>${artwork()}</section>
    <form id="new-form"><div class="setup-grid"><section class="panel"><div class="section-label"><span class="number">01</span> 오늘은 얼마나 놀까요?</div><div class="duration-options" role="group" aria-label="목표 시간">${D.durations.map(n => `<button type="button" class="duration-button ${n === duration ? 'selected' : ''}" data-duration="${n}" aria-pressed="${n === duration}">${n === 45 ? '<span class="recommended">첫 판 추천</span>' : ''}<strong>${n}<span>분</span></strong><small>${({30:'가볍게 한 판',45:'집 짓기까지 도전',60:'거래도 여유롭게'})[n]}</small></button>`).join('')}</div><p class="duration-detail" id="duration-detail">준비 약 5분 + 플레이 ${duration - D.reserveMinutes}분 + 결산 약 5분</p></section>
    <section class="panel"><div class="section-label"><span class="number">02</span> 오늘의 플레이어</div><div class="players">${D.players.map((n,i)=>`<div class="player-profile"><span class="player-avatar" aria-hidden="true">${n.slice(0,1)}</span><strong>${n}</strong><small>선택됨 ✓</small><input type="hidden" name="player${i}" value="${n}"></div>`).join('')}</div><label class="mode-check"><input name="quick" type="checkbox" checked><span>색 세트를 받고 빠르게 시작하기<small>우리 집 규칙 · 각자 땅 한 세트를 사고 시작해요.</small></span></label></section></div>
    <div class="start-strip"><p><strong>실물 클래식 보드와 주사위를 준비해 주세요.</strong><br>도시 이름을 입력하거나, 매번 돈을 기록할 필요는 없어요.</p><button class="primary" type="submit">우리 테이블 준비하기 <span class="arrow">↗</span></button></div></form>
    <div class="trust-row"><span>설치 없이 바로</span><span>상황별 짧은 규칙</span><span>시간이 끝나면 함께 결산</span></div><p class="muted" style="text-align:center;font-size:10px;margin-top:17px">단축 모드는 제안한 우리 집 규칙이에요. 준비·결산 속도와 마지막 차례에 따라 목표 시간을 조금 넘길 수 있어요.</p>`;
    document.getElementById('new-form').addEventListener('submit', e => {
      e.preventDefault();
      const form = new FormData(e.target);
      if (session) { newDialog.dataset.pending = 'form'; newDialog.showModal(); return; }
      startNew(form);
    });
  }
  function startNew(form) { const first = Math.random() < .5 ? 0 : 1; home = false; undo = null; set(C.createSession([form.get('player0'), form.get('player1')], duration, form.has('quick'), first)); }
  function setup() {
    const s = session, firstName = esc(s.names[s.first]);
    let content = '';
    if (s.step === 0) {
      const sets = [s.chosenSet, s.chosenSet === 'orange' ? 'red' : 'orange'];
      content = `<span class="house-badge">${s.quick ? '우리 집 규칙 · 빠른 시작' : '기본 준비 · 시간제 종료는 우리 집 규칙'}</span><h2>돈과 땅을 나눠 가져요.</h2><p>오늘의 선공은 무작위로 뽑힌 <strong>${firstName}</strong>님이에요.${s.quick ? ' 먼저 원하는 색 세트를 골라 주세요.' : ' 각자 1,500을 받고 모든 땅은 은행에 두세요.'}</p>
      ${s.quick ? `<div class="set-selector">${Object.entries(D.sets).map(([k, v]) => `<button class="set-option ${s.chosenSet === k ? 'selected' : ''}" data-set="${k}" aria-pressed="${s.chosenSet === k}"><span class="color-dot" style="--swatch:${v.color}"></span>${v.name} 세트<small class="muted" style="display:block;margin-top:6px">인쇄 가격 ${v.prices}</small></button>`).join('')}</div><div class="deal-grid">${[s.first,1-s.first].map((p, i) => { const k = sets[i], v = D.sets[k]; return `<section class="deal-card" style="--swatch:${v.color}"><h3>${esc(s.names[p])}</h3><p>${v.name} 권리증 3장 + 남는 현금</p><strong>${money(D.startingCash-s.costs[k])}</strong><p>1,500에서 땅값을 빼요.</p><label class="field-label">이 판의 세트 가격 합계<input type="number" min="0" max="1500" step="1" value="${s.costs[k]}" data-cost="${k}" aria-label="${v.name} 세트 가격 합계"></label></section>`; }).join('')}</div><p class="muted" style="font-size:12px">권리증을 색깔로 찾으면 도시 이름이 달라도 괜찮아요. 땅값이 다르면 위 합계를 고쳐 주세요. 두 사람 모두 땅값을 뺀 현금만 받아요.</p><div class="note">받은 세트로 첫 차례부터 집을 지을 수 있어요. 시작 총자산은 같지만 색깔별 유불리는 달라요. 다음 판에는 색을 바꿔 보세요.</div>` : `<div class="money-grid">${D.money.map(([v,n]) => `<span class="money-note">${v} × ${n}장</span>`).join('')}</div><p class="muted" style="margin-top:15px;font-size:12px">합계 1,500이면 지폐 구성은 달라도 괜찮아요. 위 구성은 나눠 받기 예시예요.</p>`}<p id="cost-error" class="error" role="alert" hidden>세트 합계를 0~1,500의 정수로 입력해 주세요.</p>`;
    } else if (s.step === 1) {
      content = `<h2>테이블을 준비해요.</h2><p>웹은 옆에서 도와줄게요. 실제 말과 돈을 움직이며 놀아요.</p><div class="checklist">${['두 사람이 고른 말을 출발점에 놓았어요.','찬스와 공동기금 카드를 따로 섞어 뒤집었어요.','은행 돈은 내 돈과 따로, 집·호텔은 은행 옆에 놓았어요.'].map(t => `<label><input type="checkbox" data-ready>${t}</label>`).join('')}</div><div class="note">시작 전 규칙서를 다 읽지 않아도 돼요. 도착한 칸이나 궁금한 상황을 누르면 필요한 설명이 나와요.</div>`;
    } else {
      content = `<span class="house-badge">시작 전에 함께 읽는 우리 집 약속</span><h2>우리의 작은 약속, 세 가지.</h2><div class="walkthrough"><div><strong>01. 서로 설명해 주기</strong><p>사고 싶은 이유, 바꾸고 싶은 이유를 이야기해요. 거래는 거절해도 괜찮아요.</p></div><div><strong>02. 플레이 ${s.minutes-D.reserveMinutes}분</strong><p>시간이 되면 지금 차례를 마치고 두 사람의 차례 수를 맞춰요. 준비·결산은 각 5분 정도예요.</p></div><div><strong>03. 마지막엔 재산 세기</strong><p>현금 + 땅 + 건물로 결산해요. 상대방이 파산하면 먼저 끝낼 수도 있어요.</p></div></div><details><summary>결산 약속을 자세히 볼래요</summary><p>현금 + 담보 아닌 땅의 인쇄 가격 + 담보 땅의 담보금액 + 건물 구매금액 전액이에요. 호텔은 집 다섯 채 값이에요. 건물 판매가인 절반과 달라요. 동점은 공동 승리예요.</p></details><p class="setup-lead"><strong>${firstName}</strong>님부터 시작해요. 실물 주사위 두 개를 굴려 주세요!</p><p class="muted" style="font-size:12px">무료 주차 보너스와 개인 간 대출은 없어요. 나머지는 클래식 기본 규칙으로 해요.</p>`;
    }
    root.innerHTML = `<div class="content-width">${heading('SET THE TABLE · '+(s.step+1)+' / 3','작은 준비, 큰 재미.')}<div class="steps">${[0,1,2].map(i=>`<span class="${i<=s.step?'active':''}"></span>`).join('')}</div><section class="panel">${content}<div class="button-row" style="margin-top:25px">${s.step>0?'<button class="secondary" data-action="setup-back">이전</button>':''}<button class="primary" data-action="setup-next">${s.step===2?'타이머 켜고 시작하기 ↗':'준비했어요, 다음 ↗'}</button></div></section></div>`;
  }
  function play() {
    const s = session, p = C.current(s);
    root.innerHTML = `${heading('OUR LITTLE PROPERTY CLUB','오늘의 테이블.')}<div class="play-grid"><aside class="table-panel"><span class="eyebrow">JUST THE TWO OF US</span><div class="timer-label">플레이 남은 시간</div><div class="timer" id="timer" role="timer" aria-label="플레이 남은 시간"></div><div class="paused" id="paused"></div><div class="timer-track"><span id="timer-bar"></span></div><div class="timer-actions"><button class="text-button" data-action="pause">${s.runningSince===null?'▶ 계속하기':'Ⅱ 잠깐 쉬기'}</button><button class="text-button" data-action="end" ${s.ending?'disabled':''}>이 라운드로 마무리</button></div><div class="turn-block"><span class="timer-label">지금은</span><h2>${esc(s.names[p])} 차례예요.</h2><p>주사위 두 개를 굴려 이동하세요.<br>도착한 칸은 오른쪽에서 골라 주세요.</p><button class="primary" data-action="next-turn" ${s.runningSince===null?'disabled':''}>칸 처리와 추가 굴림까지 끝났어요 <span>→</span></button><div class="turn-counts">${s.names.map((n,i)=>`<span>${esc(n)} ${s.turns[i]}차례 완료</span>`).join('')}</div>${undo?'<button class="text-button" data-action="undo">방금 차례 되돌리기</button>':''}</div></aside><section><div id="ending-alert" class="ending-alert" role="status" ${s.ending?'':'hidden'}>${endingMessage()}</div><div class="play-top"><span class="eyebrow">A LITTLE HELP, RIGHT ON TIME</span><h2 tabindex="-1">어느 칸에 도착했나요?</h2><p class="muted" style="font-size:12px">상황을 고르면 매니저가 하나씩 알려드려요.</p></div><div class="rules-grid">${D.rules.map(r=>`<button class="rule-card" data-rule="${r.id}" aria-haspopup="dialog"><span class="rule-icon" aria-hidden="true">${r.icon}</span><span><strong>${r.title}</strong><small>${r.tag}</small></span><span class="chevron">›</span></button>`).join('')}</div><div class="mini-tip"><span class="eyebrow">TODAY'S LITTLE CHALLENGE</span><p>“이 땅이 왜 갖고 싶어?” 서로 한 번 물어보세요.<br>이유를 말하는 순간, 거래도 놀이가 돼요.</p></div><button class="text-button" data-action="bankrupt">실제로 파산한 사람이 있어요</button></section></div>`;
    updateTimer();
  }
  function endingMessage() { return `마지막 라운드예요. <strong>${esc(session.names[C.current(session)])}</strong>님의 현재 차례를 마쳐 주세요. 두 사람 모두 ${session.targetTurns ?? Math.max(...session.turns)+1}차례를 마치면 결산해요.`; }
  function updateTimer() {
    if (home || session?.screen !== 'play') return;
    const now = Date.now(), rem = C.remaining(session, now);
    if (rem === 0 && !session.ending) { session = C.requestFinish(session); save(); play(); return; }
    const seconds = Math.ceil(rem/1000), el = document.getElementById('timer');
    if(el) el.textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    const bar = document.getElementById('timer-bar'); if(bar) bar.style.width = `${rem/C.budget(session)*100}%`;
    const paused = document.getElementById('paused'); if(paused) paused.textContent = session.runningSince===null ? '잠깐 쉬는 중 · 시간도 멈췄어요' : session.ending ? (rem===0?'시간 종료 · 마지막 라운드 진행 중':'마무리 요청 · 마지막 라운드 진행 중') : '실물 보드를 보며 천천히 놀아요';
  }
  function finish() {
    root.innerHTML = `<div class="content-width">${heading('EVERY GOOD GAME HAS AN ENDING','함께 마무리할 시간.')}<section class="panel"><h2>이제 재산을 세어 볼까요?</h2><p>두 사람 모두 <strong>${session.turns[0]}차례</strong>를 마쳤어요. 이제 주사위와 거래는 멈추고, 각자 현금과 권리증을 모아 주세요.</p><div class="note">우리 집 결산: 현금 + 담보 아닌 땅의 인쇄 가격 + 담보 땅의 담보금액 + 건물 구매금액 전액. 호텔은 집 다섯 채 값이에요.</div><div class="button-row"><button class="primary" data-action="score">재산 계산하기 →</button><button class="secondary" data-action="return-play">방금 차례로 돌아가기</button></div></section></div>`;
  }
  function score() {
    const labels = [['가지고 있는 현금','지금 손에 있는 지폐의 합계'],['담보 아닌 땅의 가격 합계','권리증의 구매 가격 · 현재 임대료가 아니에요'],['담보 땅의 담보금액 합계','담보 땅은 위 항목과 중복해서 넣지 않아요'],['건물 구매금액 합계','현재 집 수 × 건축비 · 호텔은 집 다섯 채 값']];
    root.innerHTML = `<div class="content-width">${heading('COUNT THE LITTLE THINGS','누구의 마을이 자랐을까요?')}<p class="muted">거래 기록을 되짚을 필요 없어요. 지금 가진 것만 세어 주세요.<br>없는 항목도 <strong>0</strong>을 입력해 주세요.</p><form id="score-form"><div class="score-grid">${session.names.map((n,p)=>`<section class="score-card"><h3>${esc(n)}의 재산</h3>${labels.map(([label,hint],i)=>`<label for="score-${p}-${i}">${label}<small>${hint}</small></label><input id="score-${p}-${i}" name="score-${p}-${i}" data-score="${p},${i}" type="number" min="0" max="${D.maxAmount}" step="1" inputmode="numeric" required placeholder="0" value="${esc(session.scores[p]?.[i]??'')}">`).join('')}<div class="score-total"><span>총자산</span><strong id="total-${p}">입력 중</strong></div></section>`).join('')}</div><p id="score-error" class="error" role="alert" hidden>네 항목을 모두 0 이상의 정수로 입력해 주세요.</p><div class="note">건물은 팔지 마세요. 이번 판에서는 구매금액 전액으로 평가해요. 실제 건물 판매가는 절반이지만, 여기서는 사용하지 않아요.</div><div class="button-row"><button class="secondary" type="button" data-action="finish">이전</button><button class="primary" type="submit">우리의 결과 보기 ↗</button></div></form></div>`;
    refreshTotals();
    document.getElementById('score-form').addEventListener('submit', e=>{e.preventDefault(); captureScores(); const totals=session.scores.map(C.total); if(totals.some(n=>n===null)){document.getElementById('score-error').hidden=false;return;} set({...session,screen:'result',winner:C.winner(totals),finishReason:'time'});});
  }
  function captureScores() { session.scores=[0,1].map(p=>[0,1,2,3].map(i=>document.getElementById(`score-${p}-${i}`).value)); save(); }
  function refreshTotals() { [0,1].forEach(p=>{const values=[0,1,2,3].map(i=>document.getElementById(`score-${p}-${i}`).value), t=C.total(values); document.getElementById(`total-${p}`).textContent=t===null?'입력 중':money(t);}); }
  function result() {
    const s=session, tie=s.winner==='tie';
    root.innerHTML=`<div class="content-width result"><span class="eyebrow">A SMALL GAME, A GOOD MEMORY</span><div class="result-icon" aria-hidden="true">⌂</div><h1 tabindex="-1">${tie?'오늘은 나란히, 공동 승리!':`${esc(s.names[s.winner])}님의 마을이<br>더 크게 자랐어요!`}</h1><p class="muted">${s.finishReason==='bankruptcy'?'상대방의 파산으로 이번 판이 끝났어요.':'약속한 마지막 라운드까지, 두 사람 모두 수고했어요.'}</p>${s.finishReason==='time'?`<div class="deal-grid">${s.names.map((n,i)=>`<section class="deal-card"><p>${esc(n)}</p><strong>${money(C.total(s.scores[i]))}</strong><p>총자산</p></section>`).join('')}</div>`:''}<div class="mini-tip" style="text-align:left;margin:25px auto"><span class="eyebrow">ONE LAST QUESTION</span><p>“오늘 가장 잘했다고 생각하는 선택은 뭐야?”<br>승부 이야기 다음에는, 서로의 선택도 들어 주세요.</p></div><div class="button-row">${s.finishReason==='time'?'<button class="secondary" data-action="score">결산 입력 고치기</button>':''}<button class="primary" data-action="new">다음에 또 만나요 · 새 판 준비</button></div></div>`;
  }
  function showRule(id) {
    if(!D.rules.some(r=>r.id===id))return;
    managerId=id;managerPath=['start'];ruleDialog.classList.add('manager-dialog');renderManager();ruleDialog.showModal();
  }
  function renderManager() {
    const rule=D.rules.find(r=>r.id===managerId), node=globalThis.MC_MANAGER.flows(session.names)[managerId][managerPath.at(-1)];
    document.getElementById('rule-content').innerHTML=`<div class="dialog-head"><span class="manager-label" aria-hidden="true">m</span><span class="manager-context">테이블 매니저 <small>${esc(session.names[C.current(session)])} 차례 · ${rule.title}</small></span><button type="button" class="icon-button" data-close aria-label="안내 닫기">×</button></div><div class="manager-body"><span class="eyebrow">지금 할 일</span><h2 id="rule-title" tabindex="-1">${esc(node.title)}</h2><p class="manager-instruction">${esc(node.text)}</p>${node.note?`<p class="manager-note">${esc(node.note)}</p>`:''}${node.calculator?`<div class="manager-calculator"><label for="manager-base">${node.calculator==='street'?'기본 임대료를 넣으면 계산해 드려요':'주사위 두 개의 합을 넣으세요'}</label><input id="manager-base" type="number" min="${node.calculator==='street'?0:2}" max="${node.calculator==='street'?D.maxAmount:12}" step="1" inputmode="numeric" data-multiplier="${node.calculator==='street'?2:node.calculator}" placeholder="${node.calculator==='street'?'권리증의 기본 임대료':'2~12'}"><output id="manager-result" aria-live="polite"></output></div>`:''}<div class="manager-choices">${node.choices.map((c,i)=>`<button type="button" class="${i===0?'primary':'secondary'}" data-manager-next="${c.next}">${esc(c.label)}<span aria-hidden="true">${c.next==='close'?'✓':'→'}</span></button>`).join('')}</div></div><div class="manager-footer"><button type="button" class="text-button" data-manager-back>${managerPath.length>1?'← 이전 안내':'← 보드로 돌아가기'}</button><button type="button" class="text-button" data-manager-pause>${session.runningSince===null?'▶ 시간 다시 흐르게':'Ⅱ 설명 읽는 동안 시간 멈추기'}</button></div><details class="manager-details"><summary>자세한 규칙 · 출처</summary><p>${rule.body}</p><ol class="rule-steps">${rule.steps.map(t=>`<li>${t}</li>`).join('')}</ol><p>실물 카드와 설명서가 우선이에요. 이전 안내는 웹 화면만 되돌려요. 실제 돈과 말은 되돌리지 않아요.</p><a href="${D.sources.classic}" target="_blank" rel="noopener noreferrer">Hasbro 클래식 설명서 ↗</a></details>`;
    if(ruleDialog.open)document.getElementById('rule-title').focus({preventScroll:true});
    ruleDialog.scrollTop=0;
  }
  function render() { if(home){renderHome();return;} ({setup,play,finish,score,result}[session.screen])(); }
  function confirmBankrupt() {
    ruleDialog.classList.remove('manager-dialog');
    document.getElementById('rule-content').innerHTML=`<div class="dialog-head"><span class="eyebrow">BANKRUPTCY · 파산 확인</span><button class="icon-button" data-close aria-label="닫기">×</button></div><h2 id="rule-title">실제로 파산했나요?</h2><p>건물 판매와 담보로 마련해도 빚을 다 갚지 못할 때 파산이에요. 잠깐 현금이 모자라는 경우라면 먼저 해결해 보세요.</p><p>파산한 사람을 누르면 상대방의 승리로 끝나요.</p><div class="button-row">${session.names.map((n,i)=>`<button class="danger" data-bankrupt="${i}">${esc(n)} 파산</button>`).join('')}</div><button class="text-button" data-close>아직 아니에요, 계속할게요</button>`;
    ruleDialog.showModal();
  }
  document.addEventListener('click',e=>{
    const close=e.target.closest('[data-close]'); if(close){close.closest('dialog')?.close();return;}
    const managerNext=e.target.closest('[data-manager-next]');
    if(managerNext){const next=managerNext.dataset.managerNext;if(next==='close'){ruleDialog.close();return;}if(/^bankrupt[01]$/.test(next)){ruleDialog.close();undo=null;set({...C.pause(session,Date.now()),screen:'result',winner:1-Number(next.at(-1)),finishReason:'bankruptcy'});return;}managerPath.push(next);renderManager();return;}
    if(e.target.closest('[data-manager-back]')){if(managerPath.length>1){managerPath.pop();renderManager();}else ruleDialog.close();return;}
    const managerPause=e.target.closest('[data-manager-pause]');if(managerPause){session=session.runningSince===null?{...session,runningSince:Date.now()}:C.pause(session,Date.now());save();play();managerPause.textContent=session.runningSince===null?'▶ 시간 다시 흐르게':'Ⅱ 설명 읽는 동안 시간 멈추기';return;}
    const dur=e.target.closest('[data-duration]'); if(dur){duration=Number(dur.dataset.duration);root.querySelectorAll('[data-duration]').forEach(b=>{const active=Number(b.dataset.duration)===duration;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});document.getElementById('duration-detail').textContent=`준비 약 5분 + 플레이 ${duration-D.reserveMinutes}분 + 결산 약 5분`;return;}
    const color=e.target.closest('[data-set]'); if(color){set({...session,chosenSet:color.dataset.set},true);return;}
    const rule=e.target.closest('[data-rule]'); if(rule){showRule(rule.dataset.rule);return;}
    const bankrupt=e.target.closest('[data-bankrupt]');if(bankrupt){ruleDialog.close();undo=null;set({...C.pause(session,Date.now()),screen:'result',winner:1-Number(bankrupt.dataset.bankrupt),finishReason:'bankruptcy'});return;}
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(!action)return;
    if(action==='home'){home=true;render();window.scrollTo({top:0});}
    if(action==='resume'){home=false;render();}
    if(action==='new'){newDialog.dataset.pending='reset';newDialog.showModal();}
    if(action==='setup-back')set({...session,step:session.step-1});
    if(action==='setup-next'){
      if(session.step===0 && session.quick){const values={}; for(const inp of root.querySelectorAll('[data-cost]'))values[inp.dataset.cost]=C.amount(inp.value); if(Object.values(values).some(v=>v===null||v>D.startingCash)){document.getElementById('cost-error').hidden=false;return;} session.costs=values;}
      if(session.step===1 && [...root.querySelectorAll('[data-ready]')].some(i=>!i.checked)){root.querySelector('[data-ready]:not(:checked)').focus();return;}
      set(session.step===2?{...session,screen:'play',runningSince:Date.now()}:{...session,step:session.step+1});
    }
    if(action==='pause')set(session.runningSince===null?{...session,runningSince:Date.now()}:C.pause(session,Date.now()),true);
    if(action==='next-turn' && session.runningSince!==null){undo=structuredClone(session);set(C.advance(session,Date.now()));}
    if(action==='undo' && undo){const old={...undo,elapsed:C.elapsed(session,Date.now()),runningSince:session.runningSince===null?null:Date.now(),ending:session.ending,targetTurns:session.targetTurns};undo=null;set(old);}
    if(action==='end')set(C.requestFinish(session),true);
    if(action==='bankrupt')confirmBankrupt();
    if(action==='score')set({...session,screen:'score'});
    if(action==='finish')set({...session,screen:'finish'});
    if(action==='return-play'){
      const turns=[...session.turns];turns[1-session.first]--;
      undo=null;set({...session,screen:'play',turns,runningSince:Date.now()});
    }
  });
  document.getElementById('confirm-new').addEventListener('click',()=>{
    const pending=newDialog.dataset.pending;newDialog.close();
    if(pending==='form'){startNew(new FormData(document.getElementById('new-form')));return;}
    session=null;undo=null;try{localStorage.removeItem(D.storageKey);}catch{}home=true;render();window.scrollTo({top:0});
  });
  document.addEventListener('input',e=>{
    if(e.target.matches('[data-cost]')){
      const v=C.amount(e.target.value), k=e.target.dataset.cost;
      if(v!==null&&v<=D.startingCash){session.costs[k]=v;save();e.target.closest('.deal-card').querySelector('strong').textContent=money(D.startingCash-v);}
    }
    if(e.target.matches('[data-score]')){captureScores();refreshTotals();}
    if(e.target.id==='manager-base'){
      const v=C.amount(e.target.value), multiplier=Number(e.target.dataset.multiplier);
      document.getElementById('manager-result').textContent=v===null?'숫자를 넣어 주세요.':(multiplier!==2&&(v<2||v>12))?'주사위 합은 2~12예요.':`낼 돈은 ${money(v*multiplier)}이에요.`;
    }
  });
  document.addEventListener('visibilitychange',()=>{if(!home&&session?.screen==='play')updateTimer();});
  setInterval(updateTimer,D.tick);
  render();
})();
