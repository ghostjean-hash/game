# 13. 배경 이미지 생성 프롬프트 (공용 배경 풀)

세계 여행 스테이지(54개 국가 + 2개 여행지 = 56 스테이지)의 배경은 국가별 완성본 56장으로 만들지 않는다.
**공용 기반 배경(하늘·대기·원경 루프) + 국가별 오버레이(지형·랜드마크·식생·포인트컬러)** 조합으로 간다.
이 문서는 공용 배경 풀 프롬프트와 오버레이 분리 규칙의 SSOT다. 국가별 풀 배정·에셋 명명은 `src/data/backgroundPools.js`(데이터)와 짝을 이룬다(variant·오버레이 레이어의 데이터 반영은 이미지 규격 확정 이후 단계).

---

## A. 제작 원칙

A.1. 공용 배경은 **완성된 국가 풍경이 아니다.** 아래만 담는다.
- 국가 분위기를 받쳐 주는 대기층(하늘·안개·구름·먼 대기)
- 위아래로 무한 반복 가능한 하늘·구름 패턴
- 저채도 원경 질감
- 전투 가독성을 해치지 않는 시각적 기반

A.2. **국가 정체성(랜드마크·지형·식생·건축)은 공용 배경이 아니라 오버레이가 담당한다.** 공용 배경 안에는 특정 나라를 알아볼 수 있는 고정 오브젝트를 넣지 않는다.

A.3. 인게임 렌더 역할 분리를 유지한다 - `drawBackground`(하늘·대기 = 공용 배경) / `drawScenery`(하단 지형·랜드마크 = 오버레이). 공용 배경 이미지 안에 하단 고정 지형이나 랜드마크를 직접 넣지 않는다.

---

## B. 공용 배경 루프 규칙 (프롬프트에 반드시 포함)

- **seamless vertical loop**: 위쪽 경계와 아래쪽 경계의 색상·밝기·구름 밀도·대기 패턴이 자연스럽게 이어져 무한 반복 가능.
- 하늘·안개·얇은 구름·먼 대기층·매우 희미한 원경 질감만 사용.
- 화면 전체가 반복 가능한 **비주기적(non-repeating처럼 보이는) 패턴**이어야 한다.
- **뚜렷한 수평선 금지.** 위=하늘/아래=지형 같은 단방향 상하 구도 금지(위아래가 서로 다른 구조를 만들지 않는다).
- **큰 산봉우리·도시 스카이라인·랜드마크·건축물 금지. 한 번만 등장하는 고유 오브젝트 금지.**
- **저채도·저대비.** 화면 중앙 60%는 저디테일·저대비 유지. 강한 흰/검/네온 면적 금지.
- 국가별 오버레이를 얹을 시각적 여백 확보.

공통 영문 스니펫(각 영어 프롬프트 끝에 그대로 붙인다):

```
Format: vertical portrait 9:16 mobile game background, SEAMLESS VERTICAL LOOP — top and bottom edges must match in color, brightness, cloud density and atmospheric pattern for endless scrolling. Sky, haze, thin clouds, distant atmosphere and very faint aerial texture ONLY. No distinct horizon line, no up/down directional layout. Non-repeating-looking, tileable pattern across the whole frame. Low saturation, low contrast, muted tones; keep the central 60% low-detail and low-contrast for gameplay readability; no pure white / pure black / neon areas. Leave visual headroom for country overlays. Absolutely NO large mountains, city skylines, landmarks, buildings, one-off objects, text, letters, flags, people, aircraft, enemies, bullets or UI. Painterly, soft, atmospheric.
```

---

## C. 오버레이 분리 규칙

국가별 다음 요소는 공용 배경이 아니라 **별도 오버레이**로 처리한다: 랜드마크 / 산맥·화산·사막·피오르드·밀림 실루엣 / 도시 스카이라인 / 사원·성당·궁전·피라미드·유적 / 야자수·침엽수·아카시아·선인장 등 식생 / 운하·항만·강·해안선 / 국가별 대표 생활문화 소품.

오버레이 레이어 권장 구조(각 레이어는 배경과 독립적으로 반복·간헐 배치 가능):

| 레이어 | 역할 |
|---|---|
| `overlayFar` | 매우 먼 산맥·도시 윤곽 |
| `overlayMid` | 대표 랜드마크·숲·유적 |
| `overlayNear` | 나무·바위·지붕·해안 소품 |
| `overlayAccent` | 국가별 포인트 색상·미세한 빛 효과 |

- 오버레이는 투명 배경(PNG) 실루엣 레이어. 파일명 `overlay_<국가영문>_<요소>`(예: `overlay_egypt_pyramid`, `overlay_bali_temple_gate`).
- 정면 사실 묘사가 아니라 윤곽 실루엣 + 상단 모서리 림라이트(포인트컬러) 정도로만. 포인트컬러는 점·선·림라이트로 소량만(면적 금지).
- 국가 구분은 (1) 랜드마크 실루엣 (2) 자연지형·식생 (3) 포인트컬러 3요소로만.

---

## D. 공용 배경 풀 · variant 목록

공용 배경은 "지역별 대기·색조·기후 분위기"로만 구분한다(지형·랜드마크는 오버레이). 총 **18개 기본 풀**이며, 국가가 몰린 3개 풀(BG-08·12·15)은 제작 시 2~3개 variant를 허용한다.

| 풀 | 대기 성격 | 오버레이로 붙는 대표 국가 |
|---|---|---|
| BG-01 | 동아시아 새벽·청람 대기 | 한국·중국 |
| BG-02 | 동아시아 해무·화산재 대기 | 일본·대만 |
| BG-03 | 동남아 습윤 열대 대기 | 베트남·태국·말레이시아 |
| BG-04 | 동남아 해안·해무 대기 | 필리핀·싱가포르·인도네시아·발리 |
| BG-05 | 남아시아 열기·먼지 대기 | 인도·파키스탄·방글라데시 |
| BG-06 | 히말라야 희박·청명 고산 대기 | 네팔 |
| BG-07 | 중앙아시아 건조 초원 대기 | 몽골·카자흐스탄·우즈베키스탄 |
| BG-08 | 서아시아 사막 열기 대기 (variant A 사막·오아시스 / B 석조도시·고원) | 이란·이라크·이스라엘·아랍에미리트·사우디·튀르키예 |
| BG-09 | 아프리카 사바나 노을 대기 | 케냐·탄자니아·에티오피아·남아공 |
| BG-10 | 아프리카 우림 습윤 안개 대기 | 나이지리아·콩고민주공화국 |
| BG-11 | 북아프리카 건조 황금 대기 | 이집트·모로코 |
| BG-12 | 유럽 온난 대기 (variant A 서유럽 강변 흐림 / B 지중해 건조 맑음 / C 중부유럽 숲·구릉 안개 옵션) | 그리스·이탈리아·독일·프랑스·스페인·영국·네덜란드·벨기에·러시아 |
| BG-13 | 북유럽 서늘 대기 (오로라 옵션) | 노르웨이·핀란드 |
| BG-14 | 북미 넓은 담백 대기 | 캐나다·미국 |
| BG-15 | 중남미 대기 (variant A 열대우림·대하천 습윤 / B 안데스·고산 / C 건조고원·사막) | 멕시코·파나마·브라질·아르헨티나·칠레·페루·콜롬비아 |
| BG-16A | 태평양 열대섬 해양 대기 | 하와이·파푸아뉴기니 (발리 공유 가능) |
| BG-16B | 호주 아웃백 건조 대기 | 호주 |
| BG-16C | 오세아니아 초원·피오르드 서늘 대기 | 뉴질랜드 |

메모(BG-02): 일본은 대칭형 화산 실루엣 오버레이를 쓸 수 있으나, **대만은 대칭 원뿔 화산을 공용 특징으로 쓰지 않는다** - 대만은 급경사 산지·섬 도시 실루엣 오버레이로 구분한다.
메모(BG-16C): 뉴질랜드는 자연 성격이 강해 BG-13(북유럽) 온난 variant 대신 BG-16C 신규 variant로 둔다.

---

## E. 각 풀 한국어 프롬프트 (대기 전용)

- **BG-01**: 동틀 무렵 동아시아의 차분한 남색-청람 하늘. 아주 옅은 새벽 안개층이 위아래로 은은히 흐르고, 얇은 권운이 낮게 번진다. 뚜렷한 지형·수평선 없이 대기의 미세한 농담만. 저채도·저대비.
- **BG-02**: 바다 위 옅은 해무와 화산재 먼지가 뒤섞인 회청색 대기. 습기 어린 안개가 위아래로 균질하게 이어진다. 은은한 상록·연분홍 색조 기미만. 수평선·섬 없이 대기감만.
- **BG-03**: 습한 열대의 부드러운 초록빛 하늘. 물기 어린 낮은 안개와 흩어진 적운이 위아래로 반복 가능하게 번진다. 저채도, 무거운 습도감.
- **BG-04**: 잔잔한 해안의 옅은 청록 해무. 바다 반사가 만드는 미세한 빛 산란만 대기에 녹아 있고, 수평선은 안개로 지운다. 온화·저채도.
- **BG-05**: 열기와 먼지로 뿌옇게 흐린 담색(모래빛) 하늘. 대기 전체가 열 아지랑이처럼 미세하게 흔들리는 질감. 낮은 대비, 지형 없음.
- **BG-06**: 고지대의 맑고 희박한 청백 하늘. 아주 얇고 빠른 권운과 미세한 눈보라 기미. 눈·봉우리 없이, 차갑고 투명한 대기의 농담만. 순백 금지, 저대비 회청.
- **BG-07**: 광활하고 건조한 초원 위 하늘이 화면 대부분. 마른 먼지 기운이 낮게 깔리고 옅은 층운이 넓게 퍼진다. 마른 풀빛 기미만, 지평선은 흐림.
- **BG-08**: 사막의 담황색 열기 대기. 모래 먼지가 대기에 섞여 뿌옇고, 열 아지랑이가 화면 전체에 미세하게 인다. (variant A: 오아시스 습기 어린 옅은 청황 / variant B: 고원 석조 지대의 서늘한 담회황). 저대비.
- **BG-09**: 사바나의 마른 노을 대기. 채도를 낮춘 은은한 주황-담황 노을이 위아래로 부드럽게 이어지고, 마른 풀 먼지 기운이 낮게 번진다. 강한 대비 없음.
- **BG-10**: 우림의 습윤한 초록 안개. 무거운 수증기층이 위아래 경계를 흐리며 균질하게 반복된다. 저채도 짙은 초록, 지형 없이 안개만.
- **BG-11**: 북아프리카 건조 사막의 황금빛 대기. 미세한 모래 먼지가 황금-담황 하늘에 녹아 있고 열기 아지랑이가 인다. 명도 낮춰 저대비.
- **BG-12**: 유럽의 부드럽게 흐린 온난 대기. 옅은 층운이 낮게 덮인 저채도 회백-담청 하늘. (variant A: 서유럽 강변의 습한 흐림 / variant B: 지중해의 건조하고 맑은 담청 / variant C: 중부유럽 숲·구릉의 옅은 안개, 옵션). 뚜렷한 구조 없음.
- **BG-13**: 북유럽의 서늘하고 맑은 청회색 하늘. 상단에 저채도 얇은 오로라 곡선(옵션)이 은은히 흐르고, 대기는 차갑고 투명하다. 물빛·오로라 채도 억제로 중앙 가독성 유지.
- **BG-14**: 북미의 넓고 담백한 저채도 하늘이 화면 대부분. 높은 권운이 넓게 퍼지고 대기는 맑고 건조하다. 지형·스카이라인 없음.
- **BG-15**: 중남미 대기. (variant A: 열대우림·대하천의 습윤한 초록 안개 / variant B: 안데스 고산의 희박한 청백 / variant C: 건조고원·사막의 담황 건조). 각 variant 모두 저채도, 지형 없이 대기감만.
- **BG-16A**: 태평양 열대섬의 온화한 해양 대기. 습기 어린 옅은 청록-담청 하늘, 바다 반사 빛이 대기에 부드럽게 녹아든다. 수평선·섬 없이 해무감만.
- **BG-16B**: 호주 아웃백의 건조한 대기. 붉은 흙먼지가 담황-적갈 하늘에 옅게 섞이고 열기가 인다. 채도 억제, 지형 없음.
- **BG-16C**: 오세아니아의 서늘하고 청명한 대기. 넓은 초원·피오르드 위의 맑은 담청-회청 하늘, 옅고 빠른 구름. 저채도, 수평선 흐림.

---

## F. 각 풀 영어 프롬프트 (대기 전용)

각 영문 프롬프트 끝에는 B의 공통 스니펫을 이어 붙인다.

- **BG-01**: Calm East-Asian dawn sky in deep indigo-to-slate blue, very faint dawn mist drifting evenly top-to-bottom, thin low cirrus. Only subtle atmospheric gradients, no terrain.
- **BG-02**: Grey-blue maritime air mixing light sea-haze and faint volcanic dust, humid mist continuous top-to-bottom, faint evergreen / pale-pink tint. Atmosphere only, no horizon or islands.
- **BG-03**: Soft humid tropical green-tinted sky, moist low haze and scattered cumulus wrapping evenly and tileably, low saturation, heavy humidity feel.
- **BG-04**: Pale teal coastal sea-haze, subtle light scatter from water dissolved into the air, horizon erased by mist. Mild, low saturation.
- **BG-05**: Dusty pale sandy sky hazed by heat and dust, whole atmosphere shimmering faintly like heat-haze, low contrast, no terrain.
- **BG-06**: Clear thin high-altitude pale blue-white sky, very thin fast cirrus and faint snow-drift hints, cold transparent atmospheric gradients only, no peaks; no pure white, low-contrast grey-blue.
- **BG-07**: Vast dry steppe sky filling most of the frame, low dry-dust haze, broad thin stratus, faint dry-grass tint, horizon blurred.
- **BG-08**: Amber desert heat-haze air, sand dust suspended making it milky, faint heat shimmer across the frame (variant A: oasis-humid pale cyan-amber / variant B: cool pale grey-amber of a stone highland). Low contrast.
- **BG-09**: Dry savanna dusk air, desaturated soft orange-amber glow easing top-to-bottom, low dry-grass dust haze, no strong contrast.
- **BG-10**: Humid rainforest green mist, heavy vapor layer blurring top/bottom boundary evenly and tileably, desaturated deep green, mist only, no terrain.
- **BG-11**: Dry North-African golden desert air, fine sand dust dissolved into a golden-amber sky with heat shimmer, kept low-value and low-contrast.
- **BG-12**: Soft overcast temperate European air, thin low stratus over a desaturated grey-white to pale-blue sky (variant A: humid west-European riverside overcast / variant B: dry clear Mediterranean pale blue / variant C: faint central-European forest-hill haze, optional). No distinct structure.
- **BG-13**: Cool clear Nordic blue-grey sky, an optional faint low-saturation aurora curve drifting in the upper area, cold transparent air; aurora and water kept desaturated for central readability.
- **BG-14**: Wide plain desaturated North-American sky filling most of the frame, high broad cirrus, clear dry air, no terrain or skyline.
- **BG-15**: Latin-American air (variant A: humid rainforest / great-river green mist / variant B: thin pale blue-white of the high Andes / variant C: dry amber of an arid highland). All variants low saturation, atmosphere only, no terrain.
- **BG-16A**: Mild Pacific island maritime air, humid pale teal-to-blue sky with soft sea-reflected light dissolved in, only sea-haze, no horizon or islands.
- **BG-16B**: Dry Australian outback air, red earth dust lightly mixed into an amber-red-brown sky with heat, desaturated, no terrain.
- **BG-16C**: Cool clear Oceanian air over grassland/fjord country, clean pale-blue to grey-blue sky with thin fast clouds, low saturation, blurred horizon.

---

## G. 금지 요소 (공용 배경)

큰 산봉우리 / 도시 스카이라인 / 랜드마크·건축물 / 사원·유적 / 뚜렷한 수평선 / 한 번만 등장하는 구름 덩어리·고유 오브젝트 / 식생 실루엣(나무·야자·선인장 등) / 텍스트·글자·국기 / 사람·비행기·적·탄환·UI / 강한 흰·검·네온 면적 / 위=하늘·아래=지형 단방향 구도.

이 요소들은 전부 오버레이(C) 또는 인게임 `drawScenery`가 담당한다.

---

## H. 게임 적용 · 검수 체크리스트

이미지 생성 후 인게임 적용 전 다음을 확인한다.

1. 위아래 연결부(상단 경계 ↔ 하단 경계)에서 이음매가 보이지 않는가.
2. 뚜렷한 수평선이 없는가.
3. 한 번만 등장하는 구름 덩어리·구조물이 없는가.
4. 중앙 전투 영역(세로 60%)이 충분히 비어 있는가(저디테일·저대비).
5. 오버레이를 얹었을 때도 기체·탄환 가독성이 유지되는가.
6. 같은 배경을 3회 이상 세로로 반복했을 때 패턴이 지나치게 눈에 띄지 않는가.
7. 강한 흰/검/네온 면적이 없는가.
8. 국가 정체성이 공용 배경이 아니라 오버레이로만 드러나는가.
