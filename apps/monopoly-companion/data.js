globalThis.MC_DATA = Object.freeze({
  version: 1, storageKey: 'gg.monopoly-companion.session', players: ['아빠', '서우'],
  durations: [30, 45, 60], reserveMinutes: 10, minute: 60000, tick: 1000,
  startingCash: 1500, maxAmount: 9999999,
  sets: {
    orange: { name: '주황', color: '#e98a39', cost: 560, prices: '180 + 180 + 200', cities: ['창원', '울산', '부산'], house: 100 },
    red: { name: '빨강', color: '#dc4756', cost: 680, prices: '220 + 220 + 240', cities: ['제주', '여수', '광주'], house: 150 }
  },
  money: [[500,2],[100,4],[50,1],[20,1],[10,2],[5,1],[1,5]],
  rules: [
    { id:'buy', title:'주인 없는 부지' }, { id:'rent', title:'임대료' },
    { id:'card', title:'찬스 · 사회사업기금' }, { id:'tax', title:'소득세 · 사치세' },
    { id:'corner', title:'출발 · 무료 주차장' }, { id:'jail', title:'감옥 · 방문' },
    { id:'double', title:'더블' }, { id:'build', title:'주택 · 호텔' },
    { id:'trade', title:'거래' }, { id:'debt', title:'돈이 부족해요' }
  ],
  board: [
    ['출발','go',200], ['수원','brown',60], ['사회사업기금','chest'], ['용인','brown',60], ['소득세','tax',200],
    ['광주역','station',200], ['군산','lightblue',100], ['찬스','chance'], ['익산','lightblue',100], ['전주','lightblue',120],
    ['감옥 · 방문','jail'], ['경주','pink',140], ['전력회사','utility',150], ['포항','pink',140], ['대구','pink',160],
    ['부산역','station',200], ['창원','orange',180], ['사회사업기금','chest'], ['울산','orange',180], ['부산','orange',200],
    ['무료 주차장','parking'], ['제주','red',220], ['찬스','chance'], ['여수','red',220], ['광주','red',240],
    ['춘천역','station',200], ['춘천','yellow',260], ['강릉','yellow',260], ['수자원공사','utility',150], ['원주','yellow',280],
    ['감옥으로 가시오!','gotojail'], ['청주','green',300], ['천안','green',300], ['사회사업기금','chest'], ['대전','green',320],
    ['서울역','station',200], ['찬스','chance'], ['인천','blue',350], ['사치세','tax',100], ['서울','blue',400]
  ],
  stationRents: [25,50,100,200],
  sources: { classic:'https://instructions.hasbro.com/en-in/instruction/monopoly-game', short:'https://www.hasbro.com/common/instruct/monins.pdf' }
});
