// 비교 차트 대상 시세 목록 - 이름 · 자료 기호 · 출처 · 단위 · 선 색은 여기 한 곳에만 둔다.
// kind: price = 위 칸(등락률 %), rate = 아래 칸(실제 금리 %)
// dash: true 면 점선. 가격 시세가 14개라 기준 8색을 두 번 쓰고 뒤 6개는 점선으로 가른다.
export const SERIES = [
  { id: 'nasdaq',   name: '나스닥 종합',       symbol: '^IXIC',     source: 'yahoo', unit: '지수',      kind: 'price', color: '#257de0', dash: false },
  { id: 'sox',      name: '필라델피아 반도체', symbol: '^SOX',      source: 'yahoo', unit: '지수',      kind: 'price', color: '#f47230', dash: false },
  { id: 'sp500',    name: 'S&P 500',           symbol: '^GSPC',     source: 'yahoo', unit: '지수',      kind: 'price', color: '#00b894', dash: false },
  { id: 'dow',      name: '다우존스',          symbol: '^DJI',      source: 'yahoo', unit: '지수',      kind: 'price', color: '#f2a600', dash: false },
  { id: 'nvda',     name: '엔비디아',          symbol: 'NVDA',      source: 'yahoo', unit: '달러',      kind: 'price', color: '#ee7fac', dash: false },
  { id: 'kospi',    name: '코스피',            symbol: '^KS11',     source: 'yahoo', unit: '지수',      kind: 'price', color: '#008a17', dash: false },
  { id: 'kosdaq',   name: '코스닥',            symbol: '^KQ11',     source: 'yahoo', unit: '지수',      kind: 'price', color: '#6a4ce2', dash: false },
  { id: 'twii',     name: '대만 가권',         symbol: '^TWII',     source: 'yahoo', unit: '지수',      kind: 'price', color: '#ec4647', dash: false },
  { id: 'n225',     name: '니케이 225',        symbol: '^N225',     source: 'yahoo', unit: '지수',      kind: 'price', color: '#257de0', dash: true },
  { id: 'kodexlev', name: 'KODEX 레버리지',    symbol: '122630.KS', source: 'yahoo', unit: '원',        kind: 'price', color: '#f47230', dash: true },
  { id: 'gold',     name: '금',                symbol: 'GC=F',      source: 'yahoo', unit: '달러/온스', kind: 'price', color: '#00b894', dash: true },
  { id: 'btc',      name: '비트코인',          symbol: 'BTC-USD',   source: 'yahoo', unit: '달러',      kind: 'price', color: '#f2a600', dash: true },
  { id: 'xrp',      name: '리플',              symbol: 'XRP-USD',   source: 'yahoo', unit: '달러',      kind: 'price', color: '#ee7fac', dash: true },
  { id: 'eth',      name: '이더리움',          symbol: 'ETH-USD',   source: 'yahoo', unit: '달러',      kind: 'price', color: '#6a4ce2', dash: true },
  { id: 'us2y',     name: '미국채 단기 2년',       symbol: 'DGS2',      source: 'fred',  unit: '%',         kind: 'rate',  color: '#257de0', dash: false },
  { id: 'us10y',    name: '미국채 중기 10년',      symbol: 'DGS10',     source: 'fred',  unit: '%',         kind: 'rate',  color: '#f47230', dash: false },
  { id: 'us30y',    name: '미국채 장기 30년',      symbol: 'DGS30',     source: 'fred',  unit: '%',         kind: 'rate',  color: '#00b894', dash: false },
  { id: 'kr5y',     name: '한국 국고채 5년',       symbol: '817Y002/010200001', source: 'ecos', unit: '%',  kind: 'rate',  color: '#6a4ce2', dash: false },
];
