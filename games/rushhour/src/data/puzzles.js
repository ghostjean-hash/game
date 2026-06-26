// 내장 퍼즐 세트(docs/02_data.md §3).
// 격자 표기: 6줄 x 6자. '.'=빈칸, 'X'=빨간 차(가로 길이2, 출구 행), 그 외 문자=일반 차.
// 같은 문자가 한 행이면 가로, 한 열이면 세로 차다.
// 최소 이동수는 솔버(BFS)가 런타임에 계산한다(하드코딩 없음). 괄호 안 수는 설계 시 측정한 참고값.
// difficulty는 최소 수 구간 기준 분류다: ≤5 입문 / 6-12 쉬움 / 13-18 보통 / 19+ 어려움.
// 앞 두 퍼즐은 조작을 익히는 튜토리얼, 나머지는 솔버 난이도 필터로 생성·선별했다.

export const PUZZLES = [
  // --- 입문 (beginner) ---
  {
    id: 1,
    difficulty: 'beginner',
    grid: ['......', '...A..', 'XX.A..', '......', '......', '......'], // 2
  },
  {
    id: 2,
    difficulty: 'beginner',
    grid: ['......', '..C.E.', 'XXC.E.', '......', '......', '......'], // 3
  },
  {
    id: 3,
    difficulty: 'beginner',
    grid: ['..CFFF', '..C..E', 'XXC..E', '......', 'A...DD', 'A..BB.'], // 4
  },
  {
    id: 4,
    difficulty: 'beginner',
    grid: ['..GGBB', 'HHEC..', 'XXEC..', 'FA.DD.', 'FA....', '.A....'], // 4
  },
  {
    id: 5,
    difficulty: 'beginner',
    grid: ['.GGCBH', '...CBH', 'XX.C..', '....AA', 'F.DDD.', 'FEE...'], // 5
  },
  // --- 쉬움 (easy) ---
  {
    id: 6,
    difficulty: 'easy',
    grid: ['.III.J', '..DD.J', 'XX..A.', 'CFFGA.', 'CE.GAH', '.EBBBH'], // 8
  },
  {
    id: 7,
    difficulty: 'easy',
    grid: ['JBA.H.', 'JBA.HI', 'XXA..I', '..DDDI', '.CCEE.', 'FF.GGG'], // 10
  },
  {
    id: 8,
    difficulty: 'easy',
    grid: ['....A.', '.HHCA.', 'XX.CA.', 'G.EE..', 'GFBDDD', '.FB...'], // 10
  },
  // --- 보통 (medium) ---
  {
    id: 9,
    difficulty: 'medium',
    grid: ['.EHH.G', '.E.ICG', 'XXBICF', 'DDBA.F', '...A..', '......'], // 16
  },
  {
    id: 10,
    difficulty: 'medium',
    grid: ['.BBB.J', '.LL.AJ', 'XXEIA.', 'DKEIA.', 'DKFF.H', 'GGCC.H'], // 18
  },
  // --- 어려움 (hard) ---
  {
    id: 11,
    difficulty: 'hard',
    grid: ['JAAIIH', 'J.CGKH', 'XXCGKH', '...B..', 'FFFB..', 'DD..EE'], // 19
  },
  {
    id: 12,
    difficulty: 'hard',
    grid: ['..KKKD', '..AAJD', 'XX.LJ.', 'BCCLJE', 'BGFHHE', '.GFII.'], // 19
  },
  {
    id: 13,
    difficulty: 'hard',
    grid: ['BBIFFF', '..IADD', 'XX.A..', 'MECJJK', 'MECGGK', 'LLHH..'], // 19
  },
  {
    id: 14,
    difficulty: 'hard',
    grid: ['KIIGG.', 'KCCC.E', 'XXJH.E', '..JHBB', '..FFFD', '...AAD'], // 39
  },
];
