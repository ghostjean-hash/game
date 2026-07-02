# 03. 아키텍처 (architecture)

> 폴더 / 모듈 구조, 의존성 방향, 데이터 흐름의 SSOT.

## 1. 폴더 구조

```
nonogram/
├── index.html
├── styles/          # tokens.css(디자인 토큰) + main.css
├── src/
│   ├── main.js      # 진입점
│   ├── core/        # 순수 게임 로직 (DOM 금지)
│   ├── render/      # 화면 그리기
│   ├── input/       # 입력 처리
│   └── data/        # 상수 / 색상 / 퍼즐
└── tests/           # test.html + runner.js
```

## 2. 의존성 방향

(미정 - 원칙: core는 아무것도 import하지 않는 최하층, render/input이 core를 사용)

## 3. 데이터 흐름

(미정)
