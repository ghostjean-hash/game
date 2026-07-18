# flightshooting 배경 에셋

세계 여행 스테이지 배경 이미지를 넣는 곳. 설계 원칙·프롬프트는 `docs/13_background-prompts.md`, 국가별 풀·오버레이 매핑은 `src/data/backgroundPools.js` 참조.

## 폴더

```
assets/
├── backgrounds/   # 공용 배경(하늘·대기·원경 루프 전용). 불투명.
└── overlays/      # 국가별 오버레이(지형·랜드마크·식생 실루엣). 투명 PNG.
```

## 명명 규칙

- 공용 배경: `bg_pool_<풀ID>_<promptKey>.jpg` (예: `bg_pool_BG-01_eastasia.jpg`, `bg_pool_BG-08A_desert_oasis.jpg`)
- 오버레이: `overlay_<국가영문>_<요소>.png` (예: `overlay_korea_palace_roof.png`, `overlay_egypt_pyramid.png`)
- 풀 ID·promptKey는 `backgroundPools.js`의 값과 정확히 일치시킨다(연결 시 코드가 이 이름으로 찾음).

## 규격

- **방향**: 세로 9:16 (권장 1080 x 1920px). 세로 무한 스크롤 타일.
- **공용 배경**: 위·아래 경계가 이어지는 seamless vertical loop. 불투명. 용량 위해 JPG(또는 WebP) 권장. 하늘·대기만(지형·랜드마크·수평선 금지 - docs/13 G 참조).
- **오버레이**: 투명 배경 PNG. 화면 최하단 지평선 위에 얹히는 원경 실루엣. 4레이어(Far/Mid/Near/Accent)로 나눌 수 있음(docs/13 C).

## 배포 메모

이미지를 추가하면 `.claude/deploy.json`의 `images.dirs`에 `games/flightshooting/assets`를 넣어 배포 시 자동 최적화(quality 80) 대상에 포함시킨다. (현재 web-deploy 파이프라인은 보류 중 - 이미지 준비 후 연결 단계에서 등록)
