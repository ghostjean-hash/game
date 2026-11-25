# stock-lab - 주식 뷰 · 시뮬레이터

18개 시세 비교 차트 + 코스피 낙폭 단계로 KODEX 레버리지 비중을 바꾸는 10년 모의 계산. 게임 아닌 도구 앱(부록 A 미적용, 밝은 바탕).

## 1. 기준 문서

1.1. 기획 · 설계: `docs/planning-stock-lab.html` - 사양이 바뀌면 이 문서부터 고친다.
1.2. 진행 기록: `PROGRESS.md`.

## 2. 구조

2.1. 자료: `scripts/fetch-market.mjs`(저장소 루트)가 매번 최근 10년치를 받아 내용이 바뀐 `data/<id>.json`만 다시 쓰고, 시세마다 마지막 성공 날짜를 `data/_meta.json`에 남긴다. GitHub Actions `.github/workflows/fetch-market.yml`이 매일 07:30 KST에 돌린다.
2.2. 한국 국고채 5년은 저장소 비밀값 `ECOS_API_KEY`(한국은행 ECOS 인증키)가 있을 때만 받는다. 파일이 없으면 화면 목록에서 숨는다.
2.3. 시세 목록 · 색: `src/data/series.js`. 수치: `src/data/numbers.js`. 다른 곳에 수치를 적지 않는다.
2.4. 계산은 `src/core/`(순수 함수), 화면은 `src/ui/`. 차트는 `vendor/lightweight-charts.standalone.production.js` 4.2.3 고정 사본(Apache-2.0, `vendor/LICENSE`).
2.5. 저장: localStorage `stocklab_` 접두(compare · sim · ui). 이 기기 브라우저에만 저장된다.

## 3. 시험

3.1. `node apps/stock-lab/tests/run-node.js` - 시뮬레이터 손 계산 사례 · 주월 묶기 · 쉬는 날 채우기 · 시세 목록.

## 4. 금지

4.1. 매매 권유 · 수익 보장 표현 금지. 결과는 과거 자료 모의 계산이다.
4.2. 브라우저에서 외부 시세 서버를 직접 부르지 않는다.
4.3. 라이브러리를 CDN 최신판으로 걸지 않는다.
