// 게임 데이터 색상(완성 그림 팔레트 + 플레이 중 단색)의 SSOT.
// UI 색은 styles/tokens.css 변수. 정의 근거는 docs/02_data.md 2장.

// 색 인덱스 → HEX. 인덱스 0은 "빈칸"(색 없음)이라 팔레트에 없다.
// 파스텔 축(민트·라벤더·크림) + 포인트 핑크. 픽셀 아트용.
export const PALETTE = {
  1: '#4a4658', // ink   윤곽/검정 대용
  2: '#fff3dc', // cream 크림/흰
  3: '#7fded0', // mint  민트(기본 축)
  4: '#b9a6f0', // lavender 라벤더(기본 축)
  5: '#ff9ec7', // pink  핑크(포인트, 절제)
  6: '#ffd97d', // butter 노랑
  7: '#8fd0ff', // sky   하늘
  8: '#ff9e8a', // coral 산호/볼터치
  9: '#94d98a', // leaf  잎/초록
  10: '#c99a6a', // cocoa 갈색
};

// 팔레트 이름(디버그/도감 대체 텍스트용).
export const PALETTE_NAMES = {
  1: 'ink', 2: 'cream', 3: 'mint', 4: 'lavender', 5: 'pink',
  6: 'butter', 7: 'sky', 8: 'coral', 9: 'leaf', 10: 'cocoa',
};

// 플레이 중 칠한 칸의 단색(흑백 단계). 클리어 시 PALETTE 색으로 변신.
// styles/tokens.css --fill-mono와 값 동기.
export const FILL_MONO = '#5b5470';
