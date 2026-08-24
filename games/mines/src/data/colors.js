// 게임 데이터로서의 색. docs/02_data.md 4장이 SSOT다.
// UI 색(배경·글자·버튼)은 여기가 아니라 styles/tokens.css가 가진다.

// 인접 지뢰 수마다 색이 다르다. 고전 팔레트의 색 순서(파랑 → 초록 → 빨강 → …)를
// 계승하되, 라이트 배경에서도 읽히도록 대비를 맞췄다.
export const NUMBER_COLOR = {
  1: '#2563eb',
  2: '#15803d',
  3: '#dc2626',
  4: '#6d4cc7',
  5: '#b45309',
  6: '#0e7490',
  7: '#334155',
  8: '#be185d',
};

// 칸 상태 색(02_data.md 4.2). 닫힌 칸이 열린 칸보다 밝다 - 어디까지 열었는지가
// 한눈에 보여야 하기 때문이다(02_data.md 4.3). 닫힌 칸의 위쪽 흰 결도 같은 목적이다.
export const CELL_COLOR = {
  closed: '#D9E2EE',
  closedAlt: '#E4EAF3',   // 체크무늬 교차. 차이를 아주 작게 두어 좌표 감각만 준다
  open: '#F8FAFD',
  flag: '#f5a524',
  mineHit: '#e5484d',
  mineShown: '#AAB6C6',
  flagWrong: '#F4C7C9',
  pressing: '#B7C5D8',
};

// 허브 등록부에 쓰는 이 게임의 강조색. 깃발 색과 같고, 기존 다섯 게임과 겹치지 않는다.
export const ACCENT = '#f5a524';
