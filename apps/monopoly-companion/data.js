globalThis.MC_DATA = Object.freeze({
  version: 1, storageKey: 'gg.monopoly-companion.session', players: ['아빠', '서우'],
  durations: [30, 45, 60], reserveMinutes: 10, minute: 60000, tick: 1000,
  presets: [{id:'classic',label:'기본',minutes:null,quick:false},{id:'30',label:'30분',minutes:30,quick:true},{id:'60',label:'60분',minutes:60,quick:true}],
  defaultPlayerColors: ['blue','rose'],
  playerPalette: {
    blue:{name:'파랑',hex:'#315b85',rgb:'49,91,133',soft:'#e0edf8'},
    rose:{name:'분홍',hex:'#a95c78',rgb:'169,92,120',soft:'#f5e3eb'},
    teal:{name:'초록',hex:'#287466',rgb:'40,116,102',soft:'#dcefe7'},
    amber:{name:'주황',hex:'#a86620',rgb:'168,102,32',soft:'#f7e9d3'},
    violet:{name:'보라',hex:'#76569a',rgb:'118,86,154',soft:'#eae2f5'},
    slate:{name:'회색',hex:'#58646f',rgb:'88,100,111',soft:'#e4e9ed'}
  },
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
  // 사용자 제공 한국판 권리증 22장: 기본, 주택 1~4채, 호텔 순서.
  printedDeeds: {
    1:{rents:[2,10,30,90,160,250],house:50},3:{rents:[4,20,60,180,320,450],house:50},
    6:{rents:[6,30,90,270,400,550],house:50},8:{rents:[6,30,90,270,400,550],house:50},9:{rents:[8,40,100,300,450,600],house:50},
    11:{rents:[10,50,150,450,625,750],house:100},13:{rents:[10,50,150,450,625,750],house:100},14:{rents:[12,60,180,500,700,900],house:100},
    16:{rents:[14,70,200,550,750,950],house:100},18:{rents:[14,70,200,550,750,950],house:100},19:{rents:[16,80,220,600,800,1000],house:100},
    21:{rents:[18,90,250,700,875,1050],house:150},23:{rents:[18,90,250,700,875,1050],house:150},24:{rents:[20,100,300,750,925,1100],house:150},
    26:{rents:[22,110,330,800,975,1150],house:150},27:{rents:[22,110,330,800,975,1150],house:150},29:{rents:[24,120,360,850,1025,1200],house:150},
    31:{rents:[26,130,390,900,1100,1275],house:200},32:{rents:[26,130,390,900,1100,1275],house:200},34:{rents:[28,150,450,1000,1200,1400],house:200},
    37:{rents:[35,175,500,1100,1300,1500],house:200},39:{rents:[50,200,600,1400,1700,2000],house:200}
  },
  cards: {
    chest: [
      {id:'stock',title:'주식 거래로 시세 차익 발생',action:'receive',value:50},
      {id:'inherit',title:'유산 상속',action:'receive',value:100},
      {id:'birthday',title:'생일 파티',action:'otherReceive',value:10},
      {id:'consult',title:'투자 상담비 수수',action:'receive',value:25},
      {id:'hospital',title:'병원 진료비 청구서',action:'give',value:100},
      {id:'investment',title:'투자한 펀드에서 수익 발생',action:'receive',value:100},
      {id:'doctor',title:'병원 검진 청구서',action:'give',value:50},
      {id:'refund',title:'소득세 환급',action:'receive',value:20},
      {id:'school',title:'수업료 납부 고지서',action:'give',value:50},
      {id:'insurance',title:'생명 보험 만기 환급',action:'receive',value:100},
      {id:'lecture',title:'기업 초청 강연회',action:'receive',value:200},
      {id:'repairs',title:'건물 보수',action:'repairs',house:40,hotel:115},
      {id:'quiz',title:'퀴즈쇼에서 우승',action:'receive',value:10}
    ],
    chance: [
      {id:'jail',title:'감옥으로 이동',action:'jail'},
      {id:'escape',title:'감옥 탈출',action:'escape'},
      {id:'go',title:'출발 칸으로 이동',action:'move',value:0},
      {id:'bonus',title:'연말 보너스',action:'receive',value:150},
      {id:'gwangju-station',title:'광주역으로 이동',action:'move',value:5},
      {id:'seoul',title:'서울로 이동',action:'move',value:39},
      {id:'repairs',title:'건물 보수',action:'repairs',house:25,hotel:100},
      {id:'nearest-utility',title:'가장 가까운 공공 기관 칸으로 이동',action:'nearestUtility'},
      {id:'gwangju',title:'광주로 이동',action:'move',value:24},
      {id:'nearest-station',title:'가장 가까운 역 칸으로 이동',action:'nearestStation'},
      {id:'dividend',title:'배당 수익',action:'receive',value:50},
      {id:'speeding',title:'속도 위반 벌칙금',action:'give',value:15},
      {id:'back-three',title:'3칸 뒤로 이동',action:'backThree'},
      {id:'chairman',title:'이사회에서 회장으로 선출',action:'otherGive',value:50},
      {id:'gyeongju',title:'경주로 이동',action:'move',value:11}
    ]
  },
  sources: { classic:'https://instructions.hasbro.com/en-in/instruction/monopoly-game', short:'https://www.hasbro.com/common/instruct/monins.pdf' }
});
