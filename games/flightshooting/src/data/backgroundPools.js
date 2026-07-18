// 세계 여행 스테이지 공용 배경 풀(16종) + 국가별 오버레이 매핑.
// 설계 원칙: 56개국을 국가별 완성 배경으로 만들지 않는다. 공용 기반 배경 16종(BG-01~16, 대륙·기후·지형 계열)
//   위에 국가별 오버레이(대표 랜드마크 실루엣 + 자연지형 + 식생/생활문화 + 포인트색)를 얹어 조합한다.
//   -> 실제 이미지 생성 시 풀 16장 + 오버레이 요소만 만들면 되어 제작량이 56장 완성본보다 급감한다.
// 배경 공통 규칙(프롬프트도 동일): 종스크롤 무한 반복(seamless vertical loop), 플레이 가독성 우선,
//   저채도/저대비, 랜드마크는 정면 사실묘사가 아니라 실루엣 중심 상징, 전경보다 원경, 강한 명암대비 금지.
//   국가 차이는 (1)랜드마크 실루엣 (2)자연지형/식생 (3)포인트컬러 3가지로만 준다.
// 이미지 생성 프롬프트 본문은 docs/13_background-prompts.md. 이 파일은 데이터 구조·분류·명명 규칙만 담는다.
// asset 명명 규칙:
//   풀     = bg_pool_<id>_<promptKey>            (예: bg_pool_BG-01_eastasia_city_mountain)
//   오버레이 = overlay_<국가영문>_<요소>          (예: overlay_korea_palace_roof, overlay_egypt_pyramid)
// 나라 식별은 countries.js의 ko를 키로 이어 붙인다(COUNTRY_BG). 풀 배정 근거는 아래 각 풀 주석 참조.

// ── 공용 배경 풀 16종 ──
// palette = 저채도 3색(위=우주/상단 하늘 → 중간 → 아래=지평선). 강한 흰/검/네온은 배제한 톤.
// variants 주석 = 같은 풀에 여러 나라가 몰릴 때 시각 단조로움을 줄이려 열어둔 변형 개념(구현 시 선택).
export const BG_POOLS = [
  {
    id: 'BG-01', nameKo: '동아시아 도시·산맥', promptKey: 'eastasia',
    asset: 'bg_pool_BG-01_eastasia',
    visualTheme: '겹겹이 물러나는 산 능선 위로 낮게 깔린 동아시아 도시의 원경 스카이라인. 새벽/이른 밤의 차분한 하늘.',
    terrain: '완만한 산맥 능선이 여러 겹으로 원경에 겹침, 강줄기가 도시를 가로지름',
    vegetation: '소나무·대나무 실루엣, 도시 저층부의 흐린 불빛 점',
    architecture: '기와지붕·전통 누각·저층 도시 실루엣(원경, 디테일 억제)',
    palette: ['#101d38', '#22335c', '#42597f'],
    loopGuidelines: '상단 하늘색과 하단 하늘색 톤을 근접시켜 위아래 이음매가 드러나지 않게. 산 능선은 화면 하단 1/4에만 두고 상단은 하늘로 비워 반복 시 튐 없음.',
    readabilityGuidelines: '중앙 전투 영역(세로 중앙 60%)은 산·건물 실루엣을 걷어 하늘만. 실루엣은 화면 최하단에.',
    // variants: 도시(한국)·대륙 성곽/장성(중국) 두 결이 있으니 원경 실루엣만 오버레이로 교체.
  },
  {
    id: 'BG-02', nameKo: '동아시아 화산·섬', promptKey: 'eastasia_volcano_island',
    asset: 'bg_pool_BG-02_eastasia_volcano_island',
    visualTheme: '대칭 원뿔형 화산과 바다 위에 뜬 섬 실루엣. 옅은 안개층이 산자락을 감싼 절제된 하늘.',
    terrain: '원뿔 화산 봉우리, 바다·해안선, 낮은 섬들이 원경에 점점이',
    vegetation: '벚꽃·상록수 실루엣, 산 능선의 옅은 눈선',
    architecture: '도리이·탑 등 상징 실루엣(원경, 최소화)',
    palette: ['#141d33', '#2a3352', '#4d5b76'],
    loopGuidelines: '바다 수평선을 하단에 고정하되 화산 봉우리는 좌우 어느 한쪽에 낮게. 상단은 안개 하늘로 비워 세로 반복 자연스럽게.',
    readabilityGuidelines: '화산은 화면 가장자리·최하단으로. 중앙은 안개 하늘로 비워 탄환 대비 확보.',
  },
  {
    id: 'BG-03', nameKo: '동남아 열대·사원', promptKey: 'seasia_tropical_temple',
    asset: 'bg_pool_BG-03_seasia_tropical_temple',
    visualTheme: '야자·정글 캐노피 위로 솟은 사원 첨탑 실루엣. 습기 어린 열대의 부드러운 하늘.',
    terrain: '낮은 정글 언덕, 강·논의 반사면이 원경에',
    vegetation: '야자수·바나나잎·연꽃 실루엣',
    architecture: '사원 첨탑·초고층 트윈타워 등 상징 실루엣(원경)',
    palette: ['#122a2a', '#204a42', '#3d6b57'],
    loopGuidelines: '캐노피 라인을 하단에 낮게 깔고 상단은 습한 하늘로 비움. 첨탑은 하단 실루엣 위로만 조금 솟게 해 반복 이음매 회피.',
    readabilityGuidelines: '정글 캐노피·첨탑은 최하단에만. 중앙은 저채도 초록빛 하늘.',
    // variants: 사원 첨탑(태국)·트윈타워(말레이시아)·논 계단 결을 오버레이로 분기.
  },
  {
    id: 'BG-04', nameKo: '동남아 군도·해안', promptKey: 'seasia_archipelago_coast',
    asset: 'bg_pool_BG-04_seasia_archipelago_coast',
    visualTheme: '얕은 바다 위 흩어진 섬과 항구 도시의 원경. 잔잔한 해안 하늘.',
    terrain: '군도(섬 여러 개)·석회암 기둥·해안선, 잔잔한 수면',
    vegetation: '야자수·맹그로브 실루엣',
    architecture: '항만·해안 도시·해변 사원문 상징 실루엣(원경)',
    palette: ['#0f2436', '#1e405a', '#3b6580'],
    loopGuidelines: '수평선과 섬 실루엣을 하단 1/5에 두고 상단은 하늘로. 섬은 좌우 비대칭으로 흩어 반복 티 안 나게.',
    readabilityGuidelines: '섬·항구는 최하단. 중앙 바다 상공은 저채도 청록 하늘로 비움.',
    // variants: 카르스트 만(하롱형)·항만 도시(싱가포르형)·화산섬(필리핀형)·해변 사원(발리형) 오버레이 분기.
  },
  {
    id: 'BG-05', nameKo: '남아시아 강·문명', promptKey: 'southasia_river_civilization',
    asset: 'bg_pool_BG-05_southasia_river_civilization',
    visualTheme: '넓은 강 유역과 흙빛 평원 위로 돔·궁전 실루엣. 열기 어린 뿌연 하늘.',
    terrain: '큰 강·삼각주 평원, 멀리 흐릿한 언덕',
    vegetation: '야자수·연꽃·황마밭 실루엣',
    architecture: '대리석 돔 궁전·모스크 첨탑 상징 실루엣(원경)',
    palette: ['#1c2136', '#3a3a54', '#6a6172'],
    loopGuidelines: '강 반사면을 하단에 넓게, 돔 실루엣은 그 위 낮게. 상단은 흐린 하늘로 비워 세로 반복 무이음.',
    readabilityGuidelines: '궁전·강변은 최하단. 중앙은 뿌연 담색 하늘.',
  },
  {
    id: 'BG-06', nameKo: '히말라야·고산', promptKey: 'himalaya_highland',
    asset: 'bg_pool_BG-06_himalaya_highland',
    visualTheme: '눈 덮인 고봉이 겹겹이 물러나는 고산 지대. 희박하고 맑은 고지대 하늘.',
    terrain: '설산 연봉, 빙하 계곡, 고산 능선',
    vegetation: '침엽수 선·기도 깃발(룽다) 실루엣',
    architecture: '스투파·고산 사원 상징 실루엣(원경, 작게)',
    palette: ['#1a2740', '#3a4d6e', '#6b7d94'],
    loopGuidelines: '설산 능선을 하단 1/4에 두되 뾰족한 봉은 좌우로 분산. 상단은 옅은 고지대 하늘로 비워 반복 안정.',
    readabilityGuidelines: '설산 흰 면적을 절제(저대비 회청색조)해 탄환·기체 가독성 유지. 봉우리는 최하단으로.',
  },
  {
    id: 'BG-07', nameKo: '중앙아시아 초원·실크로드', promptKey: 'centralasia_steppe_silkroad',
    asset: 'bg_pool_BG-07_centralasia_steppe_silkroad',
    visualTheme: '끝없는 초원과 낮은 언덕, 실크로드 오아시스 도시의 돔 실루엣. 건조하고 광활한 하늘.',
    terrain: '평평한 스텝 초원·완만한 언덕, 멀리 사막 경계',
    vegetation: '마른 초원·게르(유목 천막) 실루엣',
    architecture: '청록 돔·미나렛·현대 타워 상징 실루엣(원경)',
    palette: ['#1a2338', '#39405c', '#6a6e7e'],
    loopGuidelines: '지평선을 하단에 낮고 평탄하게, 상단은 넓은 하늘로 비움. 평탄 지형이라 세로 반복이 가장 자연스러운 계열.',
    readabilityGuidelines: '지형이 낮아 중앙 전투 영역이 넓게 확보됨. 돔·게르는 최하단 점 실루엣으로.',
  },
  {
    id: 'BG-08', nameKo: '서아시아 사막·석조도시', promptKey: 'westasia_desert_stonecity',
    asset: 'bg_pool_BG-08_westasia_desert_stonecity',
    visualTheme: '사막 고원과 석조 유적·모스크 돔·현대 스카이라인 실루엣. 열기 어린 담황색 하늘.',
    terrain: '사막 언덕·메사(탁상지)·오아시스, 마른 협곡',
    vegetation: '대추야자·드문 관목 실루엣',
    architecture: '석조 기둥 유적·돔·미나렛·초고층 스카이라인 상징 실루엣(원경)',
    palette: ['#20223a', '#454059', '#7a6d6a'],
    loopGuidelines: '사막 지평선을 하단에 완만히, 유적/스카이라인은 그 위 낮게. 상단은 담황 하늘로 비워 무이음.',
    readabilityGuidelines: '모래·석조의 명도를 낮춰 저대비 유지. 유적·타워는 최하단.',
    // variants: 고대 석조 유적(이란/이라크/이스라엘)·현대 초고층(UAE)·아나톨리아 바위(튀르키예) 오버레이 분기.
  },
  {
    id: 'BG-09', nameKo: '아프리카 사바나·고원', promptKey: 'africa_savanna_plateau',
    asset: 'bg_pool_BG-09_africa_savanna_plateau',
    visualTheme: '아카시아 나무가 점점이 선 사바나 평원과 멀리 탁상형 고원·설산. 노을빛 절제된 하늘.',
    terrain: '평탄한 사바나·고원 대지·멀리 대칭 설산',
    vegetation: '우산형 아카시아·마른 풀 실루엣',
    architecture: '고원 암굴 교회 등 최소 상징 실루엣(원경)',
    palette: ['#1e2236', '#453f52', '#75655c'],
    loopGuidelines: '평탄 지평선 + 나무 점 실루엣을 하단에. 상단은 노을 하늘로 비워 세로 반복 안정.',
    readabilityGuidelines: '노을색 채도를 낮춰 중앙을 비움. 나무·고원은 최하단 실루엣.',
  },
  {
    id: 'BG-10', nameKo: '아프리카 열대우림', promptKey: 'africa_rainforest',
    asset: 'bg_pool_BG-10_africa_rainforest',
    visualTheme: '겹겹의 우림 캐노피와 굽이치는 큰 강, 옅은 안개층. 습한 초록 하늘.',
    terrain: '평평한 우림 캐노피·사행천(굽은 강)',
    vegetation: '빽빽한 활엽 캐노피·거대 고목 실루엣',
    architecture: '거대 자연 바위(예: 주마록) 등 자연 상징 실루엣(원경)',
    palette: ['#132824', '#22463a', '#3f6650'],
    loopGuidelines: '캐노피 라인을 하단에 균질하게, 안개층으로 상하 경계를 흐려 반복 이음매 은폐.',
    readabilityGuidelines: '캐노피 초록을 저채도로. 중앙은 안개 낀 초록 하늘로 비움.',
  },
  {
    id: 'BG-11', nameKo: '북아프리카 사막문명', promptKey: 'northafrica_desert_civilization',
    asset: 'bg_pool_BG-11_northafrica_desert_civilization',
    visualTheme: '광활한 사막 사구와 나일/카스바 유적 실루엣. 건조한 황금빛 하늘.',
    terrain: '거대 사구·평탄 사막·오아시스 강',
    vegetation: '대추야자·파피루스 실루엣',
    architecture: '피라미드·카스바·미나렛 상징 실루엣(원경)',
    palette: ['#241f34', '#4c3f4d', '#846a5c'],
    loopGuidelines: '사구 곡선을 하단에 완만하게, 상단은 황금빛 하늘로. 사구는 좌우 비대칭 저곡선으로 반복 은폐.',
    readabilityGuidelines: '모래 명도를 낮춰 저대비. 피라미드·카스바는 최하단.',
  },
  {
    id: 'BG-12', nameKo: '유럽 고도·강변도시', promptKey: 'europe_oldtown_riverside',
    asset: 'bg_pool_BG-12_europe_oldtown_riverside',
    visualTheme: '강을 낀 유럽 구시가지의 첨탑·돔·궁전 지붕 원경 스카이라인. 부드러운 흐린 하늘.',
    terrain: '완만한 강변·언덕, 멀리 낮은 산',
    vegetation: '가로수·사이프러스·플라타너스 실루엣',
    architecture: '고딕 첨탑·돔·탑·양파돔·풍차 등 상징 실루엣(원경)',
    palette: ['#1a2138', '#3a3f5a', '#666a7e'],
    loopGuidelines: '강변 도시 실루엣을 하단에 낮게, 상단은 흐린 하늘로. 첨탑은 낮게 솟게 해 반복 이음매 회피.',
    readabilityGuidelines: '도시 실루엣은 최하단으로. 중앙은 저채도 흐린 하늘.',
    // variants: 지중해 고대(그리스/이탈리아)·서유럽 랜드마크(에펠/빅벤)·저지대 운하 풍차(네덜란드)·양파돔(러시아) 오버레이 분기.
  },
  {
    id: 'BG-13', nameKo: '북유럽 숲·피오르드', promptKey: 'nordic_forest_fjord',
    asset: 'bg_pool_BG-13_nordic_forest_fjord',
    visualTheme: '침엽수림과 깊은 피오르드 절벽, 잔잔한 호수. 서늘한 옅은 하늘(옵션: 은은한 오로라 띠).',
    terrain: '피오르드 절벽·빙하 계곡·호수·침엽수 능선',
    vegetation: '가문비/전나무·자작나무 실루엣',
    architecture: '자연 지형 위주, 목조 상징 최소(원경)',
    palette: ['#14203a', '#2c4258', '#4d6a72'],
    loopGuidelines: '절벽·수면을 하단에, 상단은 서늘한 하늘로. 오로라 띠를 쓰면 저채도 얇은 곡선으로만.',
    readabilityGuidelines: '오로라·물빛 채도를 억제해 중앙 가독성 유지. 절벽은 최하단.',
  },
  {
    id: 'BG-14', nameKo: '북미 도시·대자연', promptKey: 'northamerica_city_wilderness',
    asset: 'bg_pool_BG-14_northamerica_city_wilderness',
    visualTheme: '침엽수 산맥·대협곡 원경과 낮게 깔린 대도시 스카이라인. 넓고 담백한 하늘.',
    terrain: '로키산·대협곡·호수, 멀리 도시 실루엣',
    vegetation: '침엽수·단풍나무 실루엣',
    architecture: '마천루 스카이라인·자유의 여신상·타워 상징 실루엣(원경)',
    palette: ['#161f38', '#333c5a', '#5f6a7e'],
    loopGuidelines: '산맥/도시 실루엣을 하단에, 상단은 담백한 하늘로. 스카이라인은 낮게.',
    readabilityGuidelines: '도시·산은 최하단. 중앙은 저채도 하늘.',
  },
  {
    id: 'BG-15', nameKo: '중남미 열대·안데스', promptKey: 'latinamerica_tropical_andes',
    asset: 'bg_pool_BG-15_latinamerica_tropical_andes',
    visualTheme: '안데스 계단식 산과 열대 정글·해안 산봉우리. 습기 어린 부드러운 하늘.',
    terrain: '안데스 능선·계단식 산비탈·정글 캐노피·해안 산',
    vegetation: '정글 활엽·선인장·커피 언덕 실루엣',
    architecture: '마야/잉카 석조 피라미드·계단 유적·예수상·운하 갑문 상징 실루엣(원경)',
    palette: ['#152436', '#2f4750', '#57685c'],
    loopGuidelines: '안데스 능선/캐노피를 하단에, 상단은 습한 하늘로. 봉우리는 좌우 분산.',
    readabilityGuidelines: '정글 초록·산 채도를 낮춰 중앙 비움. 유적·봉우리는 최하단.',
    // variants: 잉카/마야 석조 유적(페루/멕시코)·해안 산 예수상(브라질)·안데스 설봉(칠레/아르헨티나)·운하(파나마) 오버레이 분기.
  },
  {
    id: 'BG-16', nameKo: '오세아니아·태평양 섬', promptKey: 'oceania_pacific_island',
    asset: 'bg_pool_BG-16_oceania_pacific_island',
    visualTheme: '태평양 위 화산섬·산호 해안과 아웃백 붉은 대지. 탁 트인 온화한 하늘.',
    terrain: '화산섬·산호초 석호·붉은 사막(아웃백)·산봉우리',
    vegetation: '야자수·유칼립투스·양치 실루엣',
    architecture: '자연 지형(거대 바위 울루루 등) 위주, 상징 최소(원경)',
    palette: ['#122536', '#284650', '#4e6a6a'],
    loopGuidelines: '해안선/대지를 하단에 낮게, 상단은 온화한 하늘로. 섬·바위는 좌우 분산해 반복 은폐.',
    readabilityGuidelines: '바다·붉은 대지 채도를 낮춰 중앙 비움. 섬·바위는 최하단.',
    // variants: 화산섬(하와이)·정글 산악(파푸아뉴기니)·설봉/피오르드(뉴질랜드)·붉은 아웃백 바위(호주) 오버레이 분기.
  },
];

// ── 56개 스테이지 → 풀 + 오버레이 매핑(countries.js의 ko가 키) ──
// overlay.landmark  = 대표 랜드마크 실루엣 1개(정면 사실묘사 아닌 상징 실루엣)
// overlay.terrain   = 대표 자연지형 1개
// overlay.vegetation= 식생/생활문화 1~2개
// overlay.pointColor= 국가 포인트색(저채도 accent, 배경 위 점·선·림라이트로만 소량 사용)
// overlay.asset     = 오버레이 이미지 파일명(overlay_<국가영문>_<요소>)
export const COUNTRY_BG = {
  // ── BG-01 동아시아 도시·산맥 ──
  '한국': { pool: 'BG-01', overlay: { landmark: '경복궁 기와지붕 처마 능선 + N서울타워', terrain: '한강 물줄기 + 남산 능선', vegetation: '소나무', pointColor: '#e84c5a', asset: 'overlay_korea_palace_roof' } },
  '중국': { pool: 'BG-01', overlay: { landmark: '만리장성 능선 + 전통 탑(파고다)', terrain: '겹산 능선', vegetation: '대나무', pointColor: '#c8352e', asset: 'overlay_china_greatwall' } },
  // ── BG-02 동아시아 화산·섬 ──
  '일본': { pool: 'BG-02', overlay: { landmark: '후지산 원뿔 + 도리이', terrain: '화산 봉우리 + 바다', vegetation: '벚꽃', pointColor: '#e05a70', asset: 'overlay_japan_fuji_torii' } },
  '대만': { pool: 'BG-02', overlay: { landmark: '타이베이101 타워', terrain: '산악 섬 + 온천 김', vegetation: '아열대 상록수', pointColor: '#3aa66a', asset: 'overlay_taiwan_taipei101' } },
  // ── BG-03 동남아 열대·사원 ──
  '베트남': { pool: 'BG-03', overlay: { landmark: '하롱베이 석회암 기둥', terrain: '카르스트 만', vegetation: '논 + 삿갓(농라)', pointColor: '#2f9e6b', asset: 'overlay_vietnam_halong_karst' } },
  '태국': { pool: 'BG-03', overlay: { landmark: '왓(사원) 첨탑', terrain: '강 유역', vegetation: '야자수 + 연꽃', pointColor: '#e0a021', asset: 'overlay_thailand_temple_spire' } },
  '말레이시아': { pool: 'BG-03', overlay: { landmark: '페트로나스 트윈타워', terrain: '열대 언덕', vegetation: '야자수', pointColor: '#2f8f5a', asset: 'overlay_malaysia_petronas' } },
  // ── BG-04 동남아 군도·해안 ──
  '필리핀': { pool: 'BG-04', overlay: { landmark: '마욘 화산 원뿔', terrain: '섬 + 해안선', vegetation: '야자수', pointColor: '#f0a63c', asset: 'overlay_philippines_mayon_volcano' } },
  '싱가포르': { pool: 'BG-04', overlay: { landmark: '마리나베이 스카이라인 + 멀라이언', terrain: '항구 + 잔잔한 만', vegetation: '도시 정원 수목', pointColor: '#3ba0c4', asset: 'overlay_singapore_marina' } },
  '인도네시아': { pool: 'BG-04', overlay: { landmark: '보로부두르 스투파 층단', terrain: '화산섬', vegetation: '계단식 논', pointColor: '#d9843c', asset: 'overlay_indonesia_borobudur' } },
  '발리': { pool: 'BG-04', overlay: { landmark: '힌두 사원문(찬디 벤타르)', terrain: '해안 + 계단식 논', vegetation: '야자수 + 논', pointColor: '#2f9e6b', asset: 'overlay_bali_temple_gate' } },
  // ── BG-05 남아시아 강·문명 ──
  '인도': { pool: 'BG-05', overlay: { landmark: '타지마할 돔', terrain: '갠지스 강 유역', vegetation: '야자수', pointColor: '#d97b3c', asset: 'overlay_india_tajmahal' } },
  '파키스탄': { pool: 'BG-05', overlay: { landmark: '바드샤히 모스크 돔·미나렛', terrain: '인더스 강 + 마른 언덕', vegetation: '건조 관목', pointColor: '#2f7a5a', asset: 'overlay_pakistan_badshahi_mosque' } },
  '방글라데시': { pool: 'BG-05', overlay: { landmark: '강 삼각주 보트 + 모스크', terrain: '삼각주 습지', vegetation: '논 + 황마밭', pointColor: '#3a9e7a', asset: 'overlay_bangladesh_river_mosque' } },
  // ── BG-06 히말라야·고산 ──
  '네팔': { pool: 'BG-06', overlay: { landmark: '히말라야 고봉 + 스투파(눈 세워진 부처 눈)', terrain: '설산 연봉', vegetation: '기도 깃발(룽다)', pointColor: '#d1503f', asset: 'overlay_nepal_himalaya_stupa' } },
  // ── BG-07 중앙아시아 초원·실크로드 ──
  '몽골': { pool: 'BG-07', overlay: { landmark: '게르(유목 천막) 군집', terrain: '광활한 초원 언덕', vegetation: '마른 초원 + 말', pointColor: '#4a90c2', asset: 'overlay_mongolia_ger' } },
  '카자흐스탄': { pool: 'BG-07', overlay: { landmark: '바이테렉 타워', terrain: '스텝 초원', vegetation: '초원', pointColor: '#3a8fc4', asset: 'overlay_kazakhstan_baiterek' } },
  '우즈베키스탄': { pool: 'BG-07', overlay: { landmark: '사마르칸트 레기스탄 청록 돔', terrain: '오아시스 + 사막 경계', vegetation: '오아시스 수목', pointColor: '#2f8fb0', asset: 'overlay_uzbekistan_registan_dome' } },
  // ── BG-08 서아시아 사막·석조도시 ──
  '이란': { pool: 'BG-08', overlay: { landmark: '페르세폴리스 석주 + 청록 돔', terrain: '사막 고원', vegetation: '건조 관목', pointColor: '#3a9098', asset: 'overlay_iran_persepolis' } },
  '이라크': { pool: 'BG-08', overlay: { landmark: '지구라트 층단 + 아치', terrain: '사막 + 티그리스/유프라테스', vegetation: '대추야자', pointColor: '#c99a3c', asset: 'overlay_iraq_ziggurat' } },
  '이스라엘': { pool: 'BG-08', overlay: { landmark: '바위돔(황금 돔) + 옛 성벽', terrain: '석조 언덕', vegetation: '올리브나무', pointColor: '#d1b23c', asset: 'overlay_israel_dome_rock' } },
  '아랍에미리트': { pool: 'BG-08', overlay: { landmark: '부르즈 할리파 초고층 스카이라인', terrain: '사막 사구', vegetation: '대추야자', pointColor: '#d9a441', asset: 'overlay_uae_burj_skyline' } },
  '사우디아라비아': { pool: 'BG-08', overlay: { landmark: '모스크 미나렛 + 사막 궁전', terrain: '사막', vegetation: '대추야자', pointColor: '#2f8f5a', asset: 'overlay_saudi_minaret' } },
  '튀르키예': { pool: 'BG-08', overlay: { landmark: '하기아소피아식 돔 + 미나렛', terrain: '아나톨리아 기암(카파도키아)', vegetation: '건조 관목', pointColor: '#c8352e', asset: 'overlay_turkiye_mosque_domes' } },
  // ── BG-09 아프리카 사바나·고원 ──
  '케냐': { pool: 'BG-09', overlay: { landmark: '우산형 아카시아 실루엣', terrain: '사바나 평원', vegetation: '아카시아 + 마른 풀', pointColor: '#d97b2c', asset: 'overlay_kenya_acacia_savanna' } },
  '탄자니아': { pool: 'BG-09', overlay: { landmark: '킬리만자로 설봉', terrain: '사바나 + 설산', vegetation: '아카시아', pointColor: '#d9843c', asset: 'overlay_tanzania_kilimanjaro' } },
  '에티오피아': { pool: 'BG-09', overlay: { landmark: '랄리벨라 암굴 교회', terrain: '고원 대지', vegetation: '건조 초원', pointColor: '#c8352e', asset: 'overlay_ethiopia_highland_church' } },
  '남아프리카공화국': { pool: 'BG-09', overlay: { landmark: '테이블마운틴 평정봉', terrain: '고원 + 해안', vegetation: '사바나 + 핀보스', pointColor: '#d9a441', asset: 'overlay_southafrica_table_mountain' } },
  // ── BG-10 아프리카 열대우림 ──
  '나이지리아': { pool: 'BG-10', overlay: { landmark: '주마 록(거대 바위)', terrain: '열대우림 + 강', vegetation: '우림 캐노피 + 야자수', pointColor: '#2f8f5a', asset: 'overlay_nigeria_zuma_rock' } },
  '콩고민주공화국': { pool: 'BG-10', overlay: { landmark: '우림 캐노피 위 거대 고목', terrain: '콩고 강 사행천', vegetation: '빽빽한 정글', pointColor: '#2f7a4a', asset: 'overlay_congo_rainforest_river' } },
  // ── BG-11 북아프리카 사막문명 ──
  '이집트': { pool: 'BG-11', overlay: { landmark: '기자 피라미드 + 스핑크스', terrain: '사막 + 나일강', vegetation: '야자수 + 파피루스', pointColor: '#d9a441', asset: 'overlay_egypt_pyramid' } },
  '모로코': { pool: 'BG-11', overlay: { landmark: '카스바 요새 + 미나렛', terrain: '사구 + 아틀라스 산', vegetation: '야자수', pointColor: '#c85a3c', asset: 'overlay_morocco_kasbah' } },
  // ── BG-12 유럽 고도·강변도시 ──
  '그리스': { pool: 'BG-12', overlay: { landmark: '파르테논 열주', terrain: '지중해 언덕 + 바다', vegetation: '올리브나무', pointColor: '#3a7fc4', asset: 'overlay_greece_parthenon' } },
  '이탈리아': { pool: 'BG-12', overlay: { landmark: '콜로세움 아치 벽', terrain: '언덕 + 강', vegetation: '사이프러스', pointColor: '#b5502f', asset: 'overlay_italy_colosseum' } },
  '독일': { pool: 'BG-12', overlay: { landmark: '고성/대성당 첨탑', terrain: '숲 + 강', vegetation: '침엽수', pointColor: '#4a5a8a', asset: 'overlay_germany_castle_spire' } },
  '프랑스': { pool: 'BG-12', overlay: { landmark: '에펠탑', terrain: '센강 강변', vegetation: '플라타너스 가로수', pointColor: '#3a5f9e', asset: 'overlay_france_eiffel' } },
  '스페인': { pool: 'BG-12', overlay: { landmark: '사그라다 파밀리아 첨탑', terrain: '지중해 평원', vegetation: '올리브 + 오렌지나무', pointColor: '#d9843c', asset: 'overlay_spain_sagrada' } },
  '영국': { pool: 'BG-12', overlay: { landmark: '빅벤 시계탑', terrain: '템즈강 강변', vegetation: '안개 낀 녹지', pointColor: '#4a6a8a', asset: 'overlay_uk_bigben' } },
  '네덜란드': { pool: 'BG-12', overlay: { landmark: '전통 풍차', terrain: '운하 + 저지대 평원', vegetation: '튤립밭', pointColor: '#d9843c', asset: 'overlay_netherlands_windmill' } },
  '벨기에': { pool: 'BG-12', overlay: { landmark: '그랑플라스 길드하우스 첨탑', terrain: '강 + 평지', vegetation: '가로수 녹지', pointColor: '#c8952f', asset: 'overlay_belgium_guildhall' } },
  '러시아': { pool: 'BG-12', overlay: { landmark: '성 바실리 성당 양파돔', terrain: '강 + 눈 덮인 평원', vegetation: '자작나무 + 침엽수', pointColor: '#c8352e', asset: 'overlay_russia_stbasil_domes' } },
  // ── BG-13 북유럽 숲·피오르드 ──
  '노르웨이': { pool: 'BG-13', overlay: { landmark: '피오르드 절벽', terrain: '피오르드 협만', vegetation: '침엽수', pointColor: '#3a7f9e', asset: 'overlay_norway_fjord' } },
  '핀란드': { pool: 'BG-13', overlay: { landmark: '침엽수림 + 오로라 띠', terrain: '호수 + 숲', vegetation: '자작나무 + 가문비', pointColor: '#3a8f9e', asset: 'overlay_finland_pine_forest' } },
  // ── BG-14 북미 도시·대자연 ──
  '캐나다': { pool: 'BG-14', overlay: { landmark: '로키산 침엽수 능선', terrain: '로키산 + 호수', vegetation: '단풍나무 + 침엽수', pointColor: '#d1503f', asset: 'overlay_canada_rockies_pine' } },
  '미국': { pool: 'BG-14', overlay: { landmark: '자유의 여신상 + 마천루 스카이라인', terrain: '도시 + 대협곡', vegetation: '혼합 수목', pointColor: '#3a5f9e', asset: 'overlay_usa_liberty_skyline' } },
  // ── BG-15 중남미 열대·안데스 ──
  '멕시코': { pool: 'BG-15', overlay: { landmark: '마야 피라미드(엘 카스티요)', terrain: '정글 + 고원', vegetation: '선인장 + 정글', pointColor: '#2f8f5a', asset: 'overlay_mexico_pyramid' } },
  '파나마': { pool: 'BG-15', overlay: { landmark: '파나마 운하 갑문', terrain: '운하 + 열대 언덕', vegetation: '정글', pointColor: '#3a9e7a', asset: 'overlay_panama_canal_gate' } },
  '브라질': { pool: 'BG-15', overlay: { landmark: '코르코바도 예수상', terrain: '해안 산봉우리 + 아마존', vegetation: '정글 캐노피', pointColor: '#2f9e5a', asset: 'overlay_brazil_christ_statue' } },
  '아르헨티나': { pool: 'BG-15', overlay: { landmark: '부에노스아이레스 오벨리스크', terrain: '팜파스 초원 + 안데스', vegetation: '초원', pointColor: '#4a9ec4', asset: 'overlay_argentina_obelisk' } },
  '칠레': { pool: 'BG-15', overlay: { landmark: '모아이 석상 + 안데스 봉우리', terrain: '안데스 + 좁은 해안', vegetation: '건조 관목', pointColor: '#c8352e', asset: 'overlay_chile_moai_andes' } },
  '페루': { pool: 'BG-15', overlay: { landmark: '마추픽추 계단 유적', terrain: '안데스 능선', vegetation: '고산 초원', pointColor: '#d9843c', asset: 'overlay_peru_machu_picchu' } },
  '콜롬비아': { pool: 'BG-15', overlay: { landmark: '안데스 콜로니얼 교회', terrain: '안데스 + 열대 계곡', vegetation: '커피 언덕 + 정글', pointColor: '#d9a441', asset: 'overlay_colombia_andes_church' } },
  // ── BG-16 오세아니아·태평양 섬 ──
  '하와이': { pool: 'BG-16', overlay: { landmark: '킬라우에아 화산', terrain: '화산섬 + 산호 해안', vegetation: '야자수', pointColor: '#d9552f', asset: 'overlay_hawaii_volcano' } },
  '파푸아뉴기니': { pool: 'BG-16', overlay: { landmark: '고산 부족 하우스', terrain: '정글 산악', vegetation: '우림', pointColor: '#c85a2f', asset: 'overlay_png_highland_hut' } },
  '뉴질랜드': { pool: 'BG-16', overlay: { landmark: '서던알프스 설봉', terrain: '산 + 피오르드', vegetation: '양치식물 + 초원', pointColor: '#2f8f6a', asset: 'overlay_newzealand_alps' } },
  '호주': { pool: 'BG-16', overlay: { landmark: '울루루(에어즈 록)', terrain: '아웃백 붉은 사막', vegetation: '유칼립투스', pointColor: '#c85a2f', asset: 'overlay_australia_uluru' } },
};
