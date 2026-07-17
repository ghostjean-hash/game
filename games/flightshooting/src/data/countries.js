// 세계 여행 스테이지: 56개 나라(여행 목적지 후보 풀).
// 각 구역 보스를 격파하면 세계지도가 뜨고, 현재 나라의 next(이웃) 중 아직 안 간 곳을 골라 이동한다(docs/10).
// 게임 한 판은 CFG.stageCount(40) 구역에서 끝난다. 나라는 56개라 40구역 여정에 충분하다(이웃 없으면 showMap이 자동 진행).
//   next 규칙 = [i+1..i+4]: 매 구역 최대 4개 이웃 중 선택. 한 칸씩 천천히 가면 앞쪽 나라 위주,
//   여러 칸 건너뛰면 뒤쪽 대륙(아메리카·오세아니아)까지 도달한다(갈림길 리플레이성).
// 전체 배열은 한국(서울)에서 출발해 대체로 서쪽으로 지구를 한 바퀴 돈다(아시아→중동·아프리카→유럽→아메리카→오세아니아).
// 좌표(lon/lat)는 worldmap.js의 lonToX/latToY로 지도 SVG 좌표(1000x500)로 변환해 핀 위치가 된다.
// next는 이 배열의 인덱스(0-based). 교육 목적상 수도는 아이가 헷갈리기 쉬운 정답을 일부러 포함(호주=캔버라 등).
// cont = 소속 대륙(worldmap.js WORLD_PATHS의 대륙명과 일치). 선택 시 그 대륙을 하이라이트하는 데 쓴다.
// labelDir = 지도 라벨 방향('right'/'left', 없으면 위). 붙어 있는 싱가포르·말레이시아 겹침 방지용.
// 발리·하와이는 나라가 아니라 관광지라 cap 자리에 소속 나라를 표기한다(사용자 지시).
export const COUNTRIES = [
  { ko: '한국',           cap: '서울',             lon: 126.98, lat: 37.57,  cont: 'Asia',          next: [1, 2, 3, 4] },     // 0 출발
  { ko: '일본',           cap: '도쿄',             lon: 139.69, lat: 35.69,  cont: 'Asia',          next: [2, 3, 4, 5] },     // 1
  { ko: '중국',           cap: '베이징',           lon: 116.40, lat: 39.90,  cont: 'Asia',          next: [3, 4, 5, 6] },     // 2
  { ko: '몽골',           cap: '울란바토르',       lon: 106.90, lat: 47.90,  cont: 'Asia',          next: [4, 5, 6, 7] },     // 3
  { ko: '대만',           cap: '타이베이',         lon: 121.56, lat: 25.03,  cont: 'Asia',          next: [5, 6, 7, 8] },     // 4
  { ko: '필리핀',         cap: '마닐라',           lon: 120.98, lat: 14.60,  cont: 'Asia',          next: [6, 7, 8, 9] },     // 5
  { ko: '베트남',         cap: '하노이',           lon: 105.85, lat: 21.03,  cont: 'Asia',          next: [7, 8, 9, 10] },    // 6
  { ko: '태국',           cap: '방콕',             lon: 100.50, lat: 13.75,  cont: 'Asia',          next: [8, 9, 10, 11] },   // 7
  { ko: '캄보디아',       cap: '프놈펜',           lon: 104.92, lat: 11.56,  cont: 'Asia',          next: [9, 10, 11, 12] },  // 8
  { ko: '말레이시아',     cap: '쿠알라룸푸르',     lon: 101.69, lat: 3.14,   cont: 'Asia',          next: [10, 11, 12, 13], labelDir: 'left' },  // 9
  { ko: '싱가포르',       cap: '싱가포르',         lon: 103.82, lat: 1.35,   cont: 'Asia',          next: [11, 12, 13, 14], labelDir: 'right' }, // 10
  { ko: '인도네시아',     cap: '자카르타',         lon: 106.85, lat: -6.21,  cont: 'Asia',          next: [12, 13, 14, 15] }, // 11
  { ko: '발리',           cap: '인도네시아',       lon: 115.22, lat: -8.67,  cont: 'Asia',          next: [13, 14, 15, 16] }, // 12 (관광지)
  { ko: '인도',           cap: '뉴델리',           lon: 77.21,  lat: 28.61,  cont: 'Asia',          next: [14, 15, 16, 17] }, // 13
  { ko: '네팔',           cap: '카트만두',         lon: 85.32,  lat: 27.71,  cont: 'Asia',          next: [15, 16, 17, 18] }, // 14
  { ko: '파키스탄',       cap: '이슬라마바드',     lon: 73.05,  lat: 33.69,  cont: 'Asia',          next: [16, 17, 18, 19] }, // 15
  { ko: '카자흐스탄',     cap: '아스타나',         lon: 71.43,  lat: 51.13,  cont: 'Asia',          next: [17, 18, 19, 20] }, // 16
  { ko: '이란',           cap: '테헤란',           lon: 51.39,  lat: 35.69,  cont: 'Asia',          next: [18, 19, 20, 21] }, // 17
  { ko: '아랍에미리트',   cap: '아부다비',         lon: 54.37,  lat: 24.45,  cont: 'Asia',          next: [19, 20, 21, 22] }, // 18
  { ko: '사우디아라비아', cap: '리야드',           lon: 46.72,  lat: 24.63,  cont: 'Asia',          next: [20, 21, 22, 23] }, // 19
  { ko: '튀르키예',       cap: '앙카라',           lon: 32.85,  lat: 39.93,  cont: 'Asia',          next: [21, 22, 23, 24] }, // 20
  { ko: '이집트',         cap: '카이로',           lon: 31.24,  lat: 30.04,  cont: 'Africa',        next: [22, 23, 24, 25] }, // 21
  { ko: '케냐',           cap: '나이로비',         lon: 36.82,  lat: -1.29,  cont: 'Africa',        next: [23, 24, 25, 26] }, // 22
  { ko: '탄자니아',       cap: '도도마',           lon: 35.75,  lat: -6.17,  cont: 'Africa',        next: [24, 25, 26, 27] }, // 23
  { ko: '에티오피아',     cap: '아디스아바바',     lon: 38.75,  lat: 9.03,   cont: 'Africa',        next: [25, 26, 27, 28] }, // 24
  { ko: '남아프리카공화국', cap: '프리토리아',     lon: 28.19,  lat: -25.75, cont: 'Africa',        next: [26, 27, 28, 29] }, // 25
  { ko: '나이지리아',     cap: '아부자',           lon: 7.49,   lat: 9.06,   cont: 'Africa',        next: [27, 28, 29, 30] }, // 26
  { ko: '가나',           cap: '아크라',           lon: -0.19,  lat: 5.56,   cont: 'Africa',        next: [28, 29, 30, 31] }, // 27
  { ko: '세네갈',         cap: '다카르',           lon: -17.44, lat: 14.69,  cont: 'Africa',        next: [29, 30, 31, 32] }, // 28
  { ko: '알제리',         cap: '알제',             lon: 3.06,   lat: 36.75,  cont: 'Africa',        next: [30, 31, 32, 33] }, // 29
  { ko: '모로코',         cap: '라바트',           lon: -6.83,  lat: 34.02,  cont: 'Africa',        next: [31, 32, 33, 34] }, // 30
  { ko: '그리스',         cap: '아테네',           lon: 23.73,  lat: 37.98,  cont: 'Europe',        next: [32, 33, 34, 35] }, // 31
  { ko: '이탈리아',       cap: '로마',             lon: 12.50,  lat: 41.90,  cont: 'Europe',        next: [33, 34, 35, 36] }, // 32
  { ko: '스위스',         cap: '베른',             lon: 7.44,   lat: 46.95,  cont: 'Europe',        next: [34, 35, 36, 37] }, // 33
  { ko: '오스트리아',     cap: '빈',               lon: 16.37,  lat: 48.21,  cont: 'Europe',        next: [35, 36, 37, 38] }, // 34
  { ko: '독일',           cap: '베를린',           lon: 13.40,  lat: 52.52,  cont: 'Europe',        next: [36, 37, 38, 39] }, // 35
  { ko: '프랑스',         cap: '파리',             lon: 2.35,   lat: 48.85,  cont: 'Europe',        next: [37, 38, 39, 40] }, // 36
  { ko: '스페인',         cap: '마드리드',         lon: -3.70,  lat: 40.42,  cont: 'Europe',        next: [38, 39, 40, 41] }, // 37
  { ko: '포르투갈',       cap: '리스본',           lon: -9.14,  lat: 38.72,  cont: 'Europe',        next: [39, 40, 41, 42] }, // 38
  { ko: '영국',           cap: '런던',             lon: -0.13,  lat: 51.50,  cont: 'Europe',        next: [40, 41, 42, 43] }, // 39
  { ko: '네덜란드',       cap: '암스테르담',       lon: 4.90,   lat: 52.37,  cont: 'Europe',        next: [41, 42, 43, 44] }, // 40
  { ko: '스웨덴',         cap: '스톡홀름',         lon: 18.07,  lat: 59.33,  cont: 'Europe',        next: [42, 43, 44, 45] }, // 41
  { ko: '노르웨이',       cap: '오슬로',           lon: 10.75,  lat: 59.91,  cont: 'Europe',        next: [43, 44, 45, 46] }, // 42
  { ko: '폴란드',         cap: '바르샤바',         lon: 21.01,  lat: 52.23,  cont: 'Europe',        next: [44, 45, 46, 47] }, // 43
  { ko: '러시아',         cap: '모스크바',         lon: 37.62,  lat: 55.75,  cont: 'Asia',          next: [45, 46, 47, 48] }, // 44
  { ko: '캐나다',         cap: '오타와',           lon: -75.70, lat: 45.42,  cont: 'North America', next: [46, 47, 48, 49] }, // 45
  { ko: '미국',           cap: '워싱턴',           lon: -77.04, lat: 38.90,  cont: 'North America', next: [47, 48, 49, 50] }, // 46
  { ko: '멕시코',         cap: '멕시코시티',       lon: -99.13, lat: 19.43,  cont: 'North America', next: [48, 49, 50, 51] }, // 47
  { ko: '쿠바',           cap: '아바나',           lon: -82.38, lat: 23.13,  cont: 'North America', next: [49, 50, 51, 52] }, // 48
  { ko: '브라질',         cap: '브라질리아',       lon: -47.93, lat: -15.78, cont: 'South America', next: [50, 51, 52, 53] }, // 49
  { ko: '아르헨티나',     cap: '부에노스아이레스', lon: -58.38, lat: -34.60, cont: 'South America', next: [51, 52, 53, 54] }, // 50
  { ko: '칠레',           cap: '산티아고',         lon: -70.65, lat: -33.46, cont: 'South America', next: [52, 53, 54, 55] }, // 51
  { ko: '페루',           cap: '리마',             lon: -77.04, lat: -12.05, cont: 'South America', next: [53, 54, 55] },     // 52
  { ko: '하와이',         cap: '미국',             lon: -157.86, lat: 21.31, cont: 'North America', next: [54, 55] },         // 53 (관광지, 태평양 섬 - 미국령이라 대륙은 북미로)
  { ko: '뉴질랜드',       cap: '웰링턴',           lon: 174.78, lat: -41.29, cont: 'Oceania',       next: [55] },            // 54
  { ko: '호주',           cap: '캔버라',           lon: 149.13, lat: -35.28, cont: 'Oceania',       next: [] },              // 55 종착
];

export const START_COUNTRY = 0; // 한국(서울)에서 출발
