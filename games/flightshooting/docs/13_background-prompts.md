# 13. 배경 이미지 생성 프롬프트 (공용 배경 풀 16종)

세계 여행 스테이지(56개 스테이지)의 배경을 국가별 완성본 56장으로 만들지 않는다.
공용 기반 배경 16종(BG-01~16) + 국가별 오버레이(랜드마크 실루엣·자연지형·포인트컬러) 조합으로 간다.
이 문서는 16개 풀 각각을 이미지 생성 AI(ChatGPT 등)에 바로 넣는 구조화 프롬프트 모음이다.
데이터 구조·풀 배정·명명 규칙은 `src/data/backgroundPools.js`가 SSOT. 이 문서는 그 프롬프트 본문.

## 0. 완성 이미지 규격 (view.js 실측 기준)

- **화면 방향**: 세로(종) 스크롤 모바일 세로 화면. 플레이어 기체는 하단, 적/배경은 위 -> 아래로 흐른다.
- **캔버스**: `main.js resize()`가 부모 컨테이너 rect에 맞춰 동적 리사이즈(고정 픽셀 아님), DPR은 최대 2로 캡. 즉 세로가 긴 가변 세로 비율이다.
- **권장 생성 규격**: **세로 종횡비 9:16(예: 1080 x 1920px) 세로 이미지**. 위아래로 무한 반복되는 타일이므로 세로로 더 긴 편이 이음매 관리에 유리(9:19.5까지 허용).
- **배경 렌더 방식(현재 코드)**: `drawBackground`가 위(어두운 우주)->아래(지평선 나라색) 세로 그라데이션 하늘 + 성운 방사 그라데이션을 깔고, 그 위에 스크롤하는 별, 그 위에 화면 최하단 지평선 실루엣(`drawScenery`)을 얹는다. 게임 요소(기체·적·탄환)는 모두 그 앞에 그려진다.
  - -> 생성 이미지는 **이 "하늘 + 원경 지형" 레이어를 대체/보강**하는 용도. 화면 세로 중앙(전투가 벌어지는 60% 영역)은 반드시 비워 두고, 지형·랜드마크는 이미지 하단(및 상단 가장자리)에만 둔다.

## 1. 모든 프롬프트 공통 규칙 (반드시 포함)

아래 조건은 16개 프롬프트 전부에 이미 반영돼 있다. 새 프롬프트를 만들 때도 이 블록을 그대로 붙인다.

- 세로 종스크롤 슈팅 게임 배경용 / **seamless vertical loop**(위쪽 경계와 아래쪽 경계가 자연스럽게 이어져 무한 반복 가능).
- **저채도·저대비** 배경. 화면 **중앙 전투 영역은 디테일 억제**(비어 있고 단순하게).
- 강한 **흰색·검은색·네온 면적 금지**. 플레이어 기체·탄환 **가독성 최우선**.
- **원경·중경 중심**(전경 클로즈업 금지). 국가별 오버레이를 얹을 **여백 확보**.
- **텍스트·글자·국기·사람·비행기·적·탄환·UI 생성 금지.**
- 세로가 긴 모바일 세로 화면(9:16) 기준.

공통 영문 스니펫(각 프롬프트 끝에 붙는 고정 블록):

```
Format: vertical portrait 9:16 mobile game background, seamless vertical loop (top and bottom edges tile perfectly for endless scrolling). Low saturation, low contrast, muted tones. Keep the central vertical band (middle 60%) empty and simple for gameplay readability. No pure white / pure black / neon areas. Distant / mid-ground only, no foreground close-ups. Leave headroom for country overlays. Absolutely NO text, letters, flags, people, aircraft, enemies, bullets, or UI. Painterly soft silhouettes, atmospheric perspective.
```

---

## 2. 풀별 프롬프트

각 풀: (설명) + (한글 프롬프트) + (English prompt). 영문 프롬프트 끝에는 위 공통 스니펫을 이어 붙여 사용한다.
asset 파일명은 `bg_pool_<id>_<promptKey>`.

### BG-01 동아시아 도시·산맥 (`bg_pool_BG-01_eastasia_city_mountain`)
설명: 겹산 능선 위 낮은 동아시아 도시 스카이라인, 새벽/이른 밤의 차분한 하늘. (한국·중국)

한글 프롬프트: 여러 겹으로 물러나는 완만한 산 능선이 화면 하단에 낮게 깔리고, 그 사이로 강줄기와 저층 도시의 흐린 불빛이 원경에 점점이 보이는 동아시아 산악 도시 배경. 차분한 남색-청색 새벽 하늘. 소나무 실루엣. 상단은 하늘로 비우고 중앙은 단순하게.

English: Distant East-Asian mountain-and-city skyline at quiet dawn/dusk. Layered rolling mountain ridges low at the bottom, a thin river and faint low-rise city lights far away, pine tree silhouettes. Deep indigo-to-blue calm sky filling the top. Muted, atmospheric.

### BG-02 동아시아 화산·섬 (`bg_pool_BG-02_eastasia_volcano_island`)
설명: 대칭 원뿔 화산과 바다 위 섬 실루엣, 안개층. (일본·대만)

한글 프롬프트: 좌우 한쪽에 낮게 자리한 대칭 원뿔형 화산과, 바다 수평선 위에 떠 있는 낮은 섬들의 실루엣. 산자락을 감싼 옅은 안개층. 상록수·벚꽃의 은은한 색조. 차분한 회청색 하늘, 저대비.

English: Symmetrical conical volcano set low to one side, calm sea horizon with small distant islands silhouetted, soft mist wrapping the mountain base, faint evergreen and cherry-blossom tint. Muted grey-blue sky, gentle atmosphere.

### BG-03 동남아 열대·사원 (`bg_pool_BG-03_seasia_tropical_temple`)
설명: 정글 캐노피 위 사원 첨탑 실루엣, 습한 하늘. (베트남·태국·말레이시아)

한글 프롬프트: 화면 하단에 낮게 깔린 야자·정글 캐노피와, 그 위로 살짝 솟은 사원 첨탑(또는 초고층 타워)의 원경 실루엣. 강·논의 은은한 반사면. 습기 어린 부드러운 초록빛 하늘. 저채도.

English: Low tropical jungle canopy along the bottom with a distant temple spire (or slim tower) rising just above it, faint reflective river/paddy far away, palm-leaf silhouettes. Humid soft green-tinted sky, low saturation.

### BG-04 동남아 군도·해안 (`bg_pool_BG-04_seasia_archipelago_coast`)
설명: 얕은 바다 위 흩어진 섬·항구 원경, 잔잔한 해안 하늘. (필리핀·싱가포르·인도네시아·발리)

한글 프롬프트: 잔잔한 얕은 바다 수평선 위에 비대칭으로 흩어진 낮은 섬들과 먼 항구 도시의 원경 실루엣. 석회암 기둥/해안선. 야자·맹그로브. 저채도 청록 하늘, 상단은 하늘로 비움.

English: Calm shallow-sea horizon with scattered low islands and a faint distant harbor-city silhouette, limestone stacks and coastline, palm/mangrove hints. Muted teal sky, empty top, tranquil.

### BG-05 남아시아 강·문명 (`bg_pool_BG-05_southasia_river_civilization`)
설명: 넓은 강 유역·흙빛 평원 위 돔 궁전 실루엣, 열기 어린 뿌연 하늘. (인도·파키스탄·방글라데시)

한글 프롬프트: 화면 하단에 넓게 펼쳐진 큰 강의 반사면과 흙빛 평원, 그 위 낮게 솟은 대리석 돔 궁전·모스크 첨탑의 원경 실루엣. 야자수·연꽃. 열기로 뿌옇게 흐린 담색 하늘. 저대비.

English: Wide hazy river-valley plain, a broad reflective river low at the bottom, distant marble-dome palace and minaret silhouettes rising gently, palm and lotus hints. Warm dusty pale sky, heat-hazed, low contrast.

### BG-06 히말라야·고산 (`bg_pool_BG-06_himalaya_highland`)
설명: 눈 덮인 고봉이 겹겹이 물러나는 고산 지대, 희박한 하늘. (네팔)

한글 프롬프트: 여러 겹으로 물러나는 눈 덮인 히말라야 고봉 능선(뾰족한 봉우리는 좌우로 분산)과 빙하 계곡. 침엽수 선, 기도 깃발의 은은한 색점. 눈은 순백이 아닌 저대비 회청색조. 맑고 희박한 고지대 하늘.

English: Layered snow-capped Himalayan peaks receding into distance (sharp summits spread to the sides), glacier valleys, thin conifer line, faint prayer-flag color specks. Snow rendered as low-contrast grey-blue, not pure white. Clear thin high-altitude sky.

### BG-07 중앙아시아 초원·실크로드 (`bg_pool_BG-07_centralasia_steppe_silkroad`)
설명: 끝없는 초원·낮은 언덕, 실크로드 오아시스 돔 실루엣, 광활한 하늘. (몽골·카자흐스탄·우즈베키스탄)

한글 프롬프트: 낮고 평탄한 스텝 초원 지평선과 완만한 언덕, 멀리 청록 돔·유목 천막(게르)의 작은 원경 실루엣. 마른 초원 색조. 광활하고 건조한 하늘이 화면 대부분을 차지. 저채도.

English: Vast flat steppe grassland horizon with gentle low hills, tiny distant turquoise-dome and nomadic-tent silhouettes, dry-grass tones. Expansive dry sky filling most of the frame. Muted, wide, calm.

### BG-08 서아시아 사막·석조도시 (`bg_pool_BG-08_westasia_desert_stonecity`)
설명: 사막 고원·석조 유적·돔·현대 스카이라인 실루엣, 담황색 하늘. (이란·이라크·이스라엘·아랍에미리트·사우디·튀르키예)

한글 프롬프트: 완만한 사막 지평선과 메사(탁상지) 위로 낮게 솟은 석조 기둥 유적·돔·미나렛(또는 초고층 스카이라인)의 원경 실루엣. 대추야자 점 실루엣. 모래·석조는 명도 낮춰 저대비. 열기 어린 담황색 하늘.

English: Gentle desert-plateau horizon with low mesas, distant stone-column ruins, domes, minarets (or a slim high-rise skyline) silhouetted, sparse date-palm specks. Sand and stone kept low-value, low-contrast. Warm dusty amber sky.

### BG-09 아프리카 사바나·고원 (`bg_pool_BG-09_africa_savanna_plateau`)
설명: 아카시아 점점이 선 사바나 평원·탁상 고원·설산, 노을빛 하늘. (케냐·탄자니아·에티오피아·남아공)

한글 프롬프트: 평탄한 사바나 지평선에 우산형 아카시아 나무가 점점이 선 원경, 멀리 탁상형 고원과 대칭 설산의 실루엣. 마른 풀 색조. 노을빛은 채도를 낮춰 은은하게. 상단은 하늘로 비움.

English: Flat savanna horizon dotted with umbrella-acacia silhouettes, distant flat-topped plateau and a symmetrical snow peak far away, dry-grass tones. Sunset colors kept desaturated and soft, empty sky top.

### BG-10 아프리카 열대우림 (`bg_pool_BG-10_africa_rainforest`)
설명: 겹겹의 우림 캐노피·굽이치는 강·안개층, 습한 초록 하늘. (나이지리아·콩고민주공화국)

한글 프롬프트: 화면 하단에 균질하게 깔린 겹겹의 우림 캐노피와 굽이치는 큰 강, 그 위를 덮은 옅은 안개층으로 상하 경계가 흐려짐. 거대 고목·큰 자연 바위의 원경 실루엣. 저채도 초록 하늘.

English: Layered rainforest canopy spread evenly along the bottom, a meandering wide river, a soft mist layer blurring the top/bottom boundary, distant giant-tree and large natural-rock silhouettes. Desaturated green misty sky.

### BG-11 북아프리카 사막문명 (`bg_pool_BG-11_northafrica_desert_civilization`)
설명: 거대 사구·나일/카스바 유적 실루엣, 황금빛 건조 하늘. (이집트·모로코)

한글 프롬프트: 완만한 곡선의 거대 사구가 화면 하단에 비대칭으로 깔리고, 멀리 피라미드·카스바 요새·미나렛의 원경 실루엣. 오아시스 강과 대추야자. 모래 명도를 낮춘 저대비. 건조한 황금빛 하늘.

English: Great gently-curved sand dunes across the bottom (asymmetric), distant pyramid, kasbah-fortress and minaret silhouettes, an oasis river with date palms. Sand kept low-value, low-contrast. Dry golden sky.

### BG-12 유럽 고도·강변도시 (`bg_pool_BG-12_europe_oldtown_riverside`)
설명: 강 낀 유럽 구시가지 첨탑·돔·궁전 지붕 스카이라인, 흐린 하늘. (그리스·이탈리아·독일·프랑스·스페인·영국·네덜란드·벨기에·러시아)

한글 프롬프트: 강변을 낀 유럽 구시가지의 낮은 원경 스카이라인 - 고딕 첨탑·돔·시계탑·양파돔·풍차가 낮게 솟은 실루엣. 완만한 언덕과 가로수. 부드럽게 흐린 저채도 하늘. 상단은 하늘로 비움.

English: Low distant European old-town riverside skyline - gothic spires, domes, a clock tower, onion domes, a windmill silhouetted low, gentle hills and tree-lined streets. Soft overcast desaturated sky, empty top.

### BG-13 북유럽 숲·피오르드 (`bg_pool_BG-13_nordic_forest_fjord`)
설명: 침엽수림·깊은 피오르드 절벽·호수, 서늘한 하늘(옵션 오로라). (노르웨이·핀란드)

한글 프롬프트: 깊은 피오르드 절벽과 잔잔한 호수, 침엽수 능선이 화면 하단에 자리한 서늘한 북유럽 풍경. 상단 하늘에 은은한 오로라 띠(저채도 얇은 곡선, 선택적). 물빛·오로라는 채도를 억제해 중앙 가독성 유지.

English: Cool Nordic scene - deep fjord cliffs, a calm lake, conifer ridges low at the bottom, an optional faint aurora band as a thin low-saturation curve in the upper sky. Water and aurora kept desaturated for central readability.

### BG-14 북미 도시·대자연 (`bg_pool_BG-14_northamerica_city_wilderness`)
설명: 침엽수 산맥·대협곡 원경 + 낮은 대도시 스카이라인, 넓은 하늘. (캐나다·미국)

한글 프롬프트: 침엽수 덮인 로키산 능선과 대협곡의 원경, 그 사이 낮게 깔린 대도시 마천루 스카이라인의 실루엣. 호수·단풍나무. 넓고 담백한 저채도 하늘이 화면 대부분. 상단은 하늘로 비움.

English: Distant conifer-covered mountain range and canyon, a low big-city skyscraper skyline silhouetted between them, a lake and maple hints. Wide plain desaturated sky filling most of the frame, empty top.

### BG-15 중남미 열대·안데스 (`bg_pool_BG-15_latinamerica_tropical_andes`)
설명: 안데스 계단식 산·열대 정글·해안 산봉우리, 습한 하늘. (멕시코·파나마·브라질·아르헨티나·칠레·페루·콜롬비아)

한글 프롬프트: 계단식 안데스 산비탈과 정글 캐노피, 해안 산봉우리(좌우 분산)의 원경. 멀리 잉카/마야 석조 계단 유적·예수상의 낮은 실루엣. 정글 초록·산 채도를 낮춰 중앙 비움. 습기 어린 부드러운 하늘.

English: Terraced Andes slopes, jungle canopy and coastal peaks (spread to the sides) in the distance, low silhouettes of Inca/Maya stone-step ruins and a hilltop statue far away. Jungle green and mountains kept desaturated, empty center. Humid soft sky.

### BG-16 오세아니아·태평양 섬 (`bg_pool_BG-16_oceania_pacific_island`)
설명: 태평양 화산섬·산호 해안·붉은 아웃백 대지, 온화한 하늘. (하와이·파푸아뉴기니·뉴질랜드·호주)

한글 프롬프트: 태평양 위 화산섬과 산호초 석호의 해안선, 또는 붉은 아웃백 대지와 거대 바위의 원경 실루엣(좌우 분산). 야자수·유칼립투스. 바다·붉은 대지 채도를 낮춘 온화한 하늘. 상단은 하늘로 비움.

English: Pacific volcanic islands and coral-lagoon coastline, or a red outback plain with a large natural rock silhouetted in the distance (spread to the sides), palm and eucalyptus hints. Sea and red earth kept desaturated, mild open sky, empty top.

---

## 3. 오버레이 제작 메모

- 오버레이는 배경 위에 얹는 **투명 배경(PNG) 실루엣 레이어**. 파일명 `overlay_<국가영문>_<요소>` (예: `overlay_egypt_pyramid`, `overlay_panama_canal_gate`, `overlay_bali_temple_gate`, `overlay_hawaii_volcano`).
- 요소는 **화면 최하단 지평선 라인 위에 얹히는 원경 실루엣 1개** 기준. 정면 사실묘사가 아니라 **윤곽 실루엣 + 상단 모서리 림라이트(포인트컬러)** 정도로만.
- 포인트컬러는 `backgroundPools.js`의 `overlay.pointColor`. 배경 위에서 **점·선·림라이트로 소량**만 쓴다(면적 금지).
- 국가 구분은 (1)랜드마크 실루엣 (2)자연지형/식생 (3)포인트컬러 3요소로만. 같은 풀 안에서 이 3요소만 갈아끼우면 나라가 달라 보이게 설계했다.
