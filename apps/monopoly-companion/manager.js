(function () {
  'use strict';
  const choice = (label, next) => ({ label, next });
  const done = choice('다 했어요', 'close');
  function flows(names) {
    return {
      buy: {
        start: { title: '이 땅을 살까요?', text: '권리증에 적힌 땅값을 보세요.', choices: [choice('살래요', 'pay'), choice('안 살래요', 'auction')] },
        pay: { title: '땅값을 은행에 내세요.', text: '그 땅의 권리증을 가져오세요.', choices: [done] },
        auction: { title: '두 사람이 경매해요.', text: '10부터 시작해요. 사고 싶은 사람이 1 이상 올려 불러요.', note: '처음에 안 산 사람도 참여할 수 있어요.', choices: [choice('더 부를 사람이 없어요', 'who')] },
        who: { title: '누가 샀나요?', text: '가장 높은 값을 마지막에 부른 사람이에요.', choices: [...names.map((n, i) => choice(n, 'winner'+i)), choice('아무도 입찰 안 했어요', 'nobody')] },
        winner0: { title: names[0]+'의 땅이에요.', text: '마지막에 부른 돈을 은행에 내고, 권리증을 가져오세요.', choices: [done] },
        winner1: { title: names[1]+'의 땅이에요.', text: '마지막에 부른 돈을 은행에 내고, 권리증을 가져오세요.', choices: [done] },
        nobody: { title: '이 땅은 은행에 두세요.', text: '이번에는 아무도 돈을 내지 않아요.', choices: [done] }
      },
      rent: {
        start: { title: '담보로 맡긴 땅인가요?', text: '상대방 권리증이 뒤집혀 있는지 확인하세요.', choices: [choice('네, 담보 땅이에요', 'mortgaged'), choice('아니에요', 'kind')] },
        mortgaged: { title: '돈을 내지 않아요.', text: '담보 땅에는 임대료가 없어요.', choices: [done] },
        kind: { title: '어떤 칸인가요?', text: '도착한 칸을 골라 주세요.', choices: [choice('색깔 있는 땅', 'houses'), choice('역', 'station'), choice('전기 · 수도', 'utility')] },
        houses: { title: '집이나 호텔이 있나요?', text: '지금 그 땅 위의 건물을 보세요.', choices: [choice('있어요', 'built'), choice('없어요', 'set')] },
        built: { title: '권리증의 그 줄을 읽으세요.', text: '집 개수나 호텔에 맞는 임대료를 상대방에게 내세요.', choices: [done] },
        set: { title: '상대방이 같은 색을 다 가졌나요?', text: '다른 땅에 집이 있어도, 지금 도착한 땅에 집이 없으면 이 기준이에요.', choices: [choice('네, 같은 색 전부예요', 'double'), choice('아직 전부는 아니에요', 'base')] },
        double: { title: '기본 임대료의 두 배를 내세요.', text: '권리증 맨 위의 기본 임대료 × 2예요.', calculator: 'street', choices: [done] },
        base: { title: '기본 임대료를 내세요.', text: '권리증 맨 위의 건물 없는 땅 임대료예요.', choices: [done] },
        station: { title: '상대방의 역 개수를 세세요.', text: '권리증에서 그 개수의 임대료를 찾아 내세요.', note: '찬스 카드로 왔다면 카드의 지시가 먼저예요.', choices: [done] },
        utility: { title: '상대방이 몇 개 가졌나요?', text: '전기 회사와 수도 회사, 두 장을 확인하세요.', choices: [choice('한 개', 'four'), choice('두 개 모두', 'ten')] },
        four: { title: '주사위 합의 4배를 내세요.', text: '이번 이동에 쓴 주사위 두 개의 합이에요.', note: '카드가 따로 지시하면 카드대로 해요.', calculator: '4', choices: [done] },
        ten: { title: '주사위 합의 10배를 내세요.', text: '이번 이동에 쓴 주사위 두 개의 합이에요.', note: '카드가 따로 지시하면 카드대로 해요.', calculator: '10', choices: [done] }
      },
      build: {
        start: { title: '같은 색을 전부 가졌나요?', text: '집을 지으려는 색의 권리증을 모아 보세요.', choices: [choice('전부 있어요', 'mortgage'), choice('아직 모으는 중이에요', 'wait')] },
        wait: { title: '같은 색을 다 모으면 지어요.', text: '땅을 더 사거나 상대방과 교환해 보세요.', choices: [done] },
        mortgage: { title: '그 색에 담보 땅이 있나요?', text: '그 색의 권리증 중 뒤집힌 것이 있는지 보세요.', choices: [choice('있어요', 'release'), choice('없어요', 'level')] },
        release: { title: '담보부터 풀어야 해요.', text: '그 색에 담보 땅이 남아 있으면 집을 못 지어요.', choices: [done] },
        level: { title: '집을 지을까요, 호텔로 바꿀까요?', text: '건물은 같은 색 땅에 골고루 지어요.', choices: [choice('집 한 채', 'house'), choice('호텔', 'hotel')] },
        house: { title: '집이 가장 적은 땅에 지으세요.', text: '권리증의 집 한 채 가격을 은행에 내고, 집 한 채를 놓으세요.', note: '그 땅에 이미 집 네 채가 있으면 호텔 규칙을 보세요. 은행에 집이 남아 있어야 해요.', choices: [done] },
        hotel: { title: '호텔 없는 땅마다 집 네 채씩 있나요?', text: '아직이라면 먼저 골고루 네 채씩 지어요.', choices: [choice('모두 네 채씩 있어요', 'hotelpay'), choice('아직이에요', 'house')] },
        hotelpay: { title: '집 네 채를 호텔로 바꾸세요.', text: '그 땅의 집 네 채를 은행에 돌려주고, 집 한 채 값을 더 내세요.', note: '은행에 호텔이 남아 있어야 해요.', choices: [done] }
      },
      double: {
        start: { title: '이번 차례의 세 번째 연속 더블인가요?', text: '주사위 두 개의 숫자가 같으면 더블이에요.', choices: [choice('세 번째예요', 'jail'), choice('첫 번째나 두 번째예요', 'move'), choice('감옥에서 탈출한 더블이에요', 'escape')] },
        jail: { title: '이동하지 말고 감옥으로 가세요.', text: '이번 차례는 끝이에요. 출발 수입은 없어요.', choices: [done] },
        move: { title: '이동하고 도착한 칸을 처리하세요.', text: '감옥으로 가지 않았다면 주사위를 한 번 더 굴려요.', note: '추가 굴림까지 전부 마친 다음 차례 완료를 눌러요.', choices: [done] },
        escape: { title: '그 숫자만큼 이동하세요.', text: '도착한 칸을 처리하고 차례를 마쳐요. 이번에는 더 굴리지 않아요.', choices: [done] }
      },
      jail: {
        start: { title: '어떻게 감옥에 왔나요?', text: '그냥 도착한 것과 감옥으로 보내진 것은 달라요.', choices: [choice('그냥 감옥 칸에 도착했어요', 'visit'), choice('지금 감옥으로 보내졌어요', 'sent'), choice('이미 갇혀 있고 내 차례예요', 'leave')] },
        visit: { title: '면회예요. 벌은 없어요.', text: '다음 차례에 평소처럼 굴리면 돼요.', choices: [done] },
        sent: { title: '말을 감옥에 놓으세요.', text: '이번 차례는 끝이에요. 출발점을 지나도 200은 받지 않아요.', choices: [done] },
        leave: { title: '어떻게 나올까요?', text: '돈을 내거나 카드를 쓰면 평소처럼 굴릴 수 있어요.', choices: [choice('은행에 50 낼래요', 'pay'), choice('탈출 카드를 쓸래요', 'card'), choice('더블을 시도할래요', 'try')] },
        pay: { title: '은행에 50을 내세요.', text: '주사위를 굴려 이동하고 도착한 칸을 처리하세요.', choices: [done] },
        card: { title: '탈출 카드를 돌려놓으세요.', text: '해당 카드 더미 맨 아래에 놓고, 주사위를 굴려 이동하세요.', choices: [done] },
        try: { title: '주사위를 굴리세요.', text: '더블이 나왔나요?', choices: [choice('더블이에요', 'escape'), choice('더블이 아니에요', 'attempt')] },
        escape: { title: '그 숫자만큼 이동하세요.', text: '도착한 칸을 처리하고 차례를 마쳐요. 한 번 더 굴리지는 않아요.', choices: [done] },
        attempt: { title: '이번이 세 번째 탈출 시도였나요?', text: '감옥에서 굴린 차례를 세어 보세요.', choices: [choice('세 번째예요', 'forced'), choice('아직 아니에요', 'stay')] },
        forced: { title: '50을 내고, 방금 숫자만큼 이동하세요.', text: '은행에 낸 뒤 도착한 칸을 처리하고 차례를 마쳐요.', choices: [done] },
        stay: { title: '이번에는 감옥에 머물러요.', text: '차례를 마치세요. 임대료는 계속 받을 수 있어요.', choices: [done] }
      },
      card: {
        start: { title: '어느 칸인가요?', text: '지금 도착한 칸을 골라 주세요.', choices: [choice('찬스 · 공동기금', 'draw'), choice('세금', 'tax'), choice('출발 · 무료 주차', 'corner')] },
        draw: { title: '맨 위 카드 한 장을 읽으세요.', text: '카드가 시키는 일을 하고, 그 더미 맨 아래에 돌려놓으세요.', note: '탈출 카드는 쓸 때까지 가지고 있어요.', choices: [done] },
        tax: { title: '보드에 적힌 세금을 내세요.', text: '상대방이 아니라 은행에 내는 돈이에요.', choices: [done] },
        corner: { title: '출발인가요, 무료 주차인가요?', text: '도착한 칸을 골라 주세요.', choices: [choice('출발이에요', 'go'), choice('무료 주차예요', 'park')] },
        go: { title: '은행에서 200을 받으세요.', text: '지나갈 때도 받아요. 감옥 직행 중에는 받지 않아요.', choices: [done] },
        park: { title: '잠깐 쉬는 칸이에요.', text: '돈을 받거나 내지 않아요.', choices: [done] }
      },
      trade: {
        start: { title: '원하는 땅을 말해 보세요.', text: '“이 땅을 줄게. 네 땅과 바꿀래?”', note: '상대방은 거절해도 괜찮아요.', choices: [choice('둘 다 동의했어요', 'agree'), choice('이번에는 안 바꿀래요', 'stop')] },
        agree: { title: '거래할 땅에 건물이나 담보가 있나요?', text: '아무것도 없으면 바로 바꿀 수 있어요.', choices: [choice('둘 다 없어요', 'exchange'), choice('건물이나 담보가 있어요', 'special')] },
        exchange: { title: '약속한 권리증과 돈을 바꾸세요.', text: '서로 받은 것을 확인하면 끝이에요.', choices: [done] },
        special: { title: '건물이 있으면 그 색의 건물부터 파세요.', text: '담보 땅을 받는 사람은 추가 은행 비용도 확인해야 해요.', note: '이 거래는 실물 설명서의 담보 양도 규칙을 같이 확인해 주세요. 개인 간 대출과 임대료 면제 약속은 하지 않아요.', choices: [choice('설명서를 확인하고 거래했어요', 'close'), choice('이번에는 거래를 안 할래요', 'close')] },
        stop: { title: '그대로 두고 계속 놀아요.', text: '거래하지 않아도 괜찮아요.', choices: [done] }
      },
      debt: {
        start: { title: '낼 돈부터 마련해요.', text: '팔 건물이 있나요?', choices: [choice('집이나 호텔이 있어요', 'sell'), choice('건물은 없어요', 'mortgage')] },
        sell: { title: '건물을 은행에 절반 가격으로 파세요.', text: '같은 색에서 골고루 줄이세요.', note: '호텔을 집으로 바꾸려면 은행에 필요한 집이 있어야 해요. 없으면 실물 설명서대로 그 색 건물을 정리해 주세요.', choices: [choice('이제 빚을 낼 수 있어요', 'pay'), choice('아직 모자라요', 'mortgage')] },
        mortgage: { title: '땅을 은행에 담보로 맡겨요.', text: '그 색의 건물을 모두 판 뒤, 권리증의 담보금액을 받으세요.', note: '권리증을 뒤집어요. 이미 담보인 땅에서는 다시 받을 수 없어요.', choices: [choice('이제 빚을 낼 수 있어요', 'pay'), choice('모두 정리해도 못 갚아요', 'bankrupt')] },
        pay: { title: '빚진 곳에 돈을 내세요.', text: '상대방에게 줄 돈인지, 은행에 줄 돈인지 확인하세요.', choices: [done] },
        bankrupt: { title: '실제로 파산한 사람을 골라 주세요.', text: '상대방의 승리로 이번 판이 끝나요.', choices: names.map((n,i)=>({label:n+' 파산',next:'bankrupt'+i})) }
      }
    };
  }
  globalThis.MC_MANAGER = Object.freeze({ flows });
})();
