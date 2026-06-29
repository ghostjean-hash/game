// 내장 퍼즐 세트(docs/02_data.md §3).
// 격자 표기: 6줄 x 6자. '.'=빈칸, 'X'=주인공 토끼(가로 길이2, 출구 행), 그 외 문자=친구 동물 차.
// 같은 문자가 한 행이면 가로, 한 열이면 세로 차다.
// 최소 이동수는 솔버(BFS)가 런타임에 계산한다(하드코딩 없음). 괄호 안 수는 설계 시 측정한 참고값.
// 초등 저학년 대상이라 쉬움 위주로 천천히 오르는 곡선(최소 1~8수). difficulty는 최소 수 구간 분류:
//   1-3 입문(beginner) / 4-6 쉬움(easy) / 7-8 보통(medium). 어려운 퍼즐은 넣지 않는다.
// 1번은 길이 막는 친구가 없는 튜토리얼(토끼만 밀면 끝)이라 조작부터 익힌다.

export const PUZZLES = [
  // --- 입문 (beginner) ---
  {
    id: 1,
    difficulty: 'beginner',
    grid: ['......', '......', 'XX....', '......', '......', '......'], // 1
  },
  {
    id: 2,
    difficulty: 'beginner',
    grid: ['BB....', '......', 'XX...A', '.....A', '.....A', '......'], // 2
  },
  {
    id: 3,
    difficulty: 'beginner',
    grid: ['...BB.', '..A...', 'XXA...', '..A...', '...CCC', '......'], // 2
  },
  {
    id: 4,
    difficulty: 'beginner',
    grid: ['ABB...', 'A..C..', 'AXXC..', '...C..', '......', '......'], // 2
  },
  {
    id: 5,
    difficulty: 'beginner',
    grid: ['......', '.B..CA', '.BXXCA', '....CA', '......', '......'], // 3
  },
  {
    id: 6,
    difficulty: 'beginner',
    grid: ['...DDD', '......', '.XXCB.', '...CB.', 'AA.C..', '......'], // 3
  },
  // --- 쉬움 (easy) ---
  {
    id: 7,
    difficulty: 'easy',
    grid: ['..BBB.', '...D..', 'XX.DC.', '...DC.', '......', '...AAA'], // 4
  },
  {
    id: 8,
    difficulty: 'easy',
    grid: ['...DDD', '..EB..', 'XXEB..', '.AAA..', '....CF', '....CF'], // 4
  },
  {
    id: 9,
    difficulty: 'easy',
    grid: ['......', '...C..', 'XX.C.A', '...C.A', 'B....A', 'B..DDD'], // 5
  },
  {
    id: 10,
    difficulty: 'easy',
    grid: ['AA.D..', '...D..', '.XXD..', '.BBB..', '...EE.', '...CC.'], // 5
  },
  {
    id: 11,
    difficulty: 'easy',
    grid: ['..C...', '..C...', 'XXC...', '...AAA', 'DDD..B', '.....B'], // 6
  },
  {
    id: 12,
    difficulty: 'easy',
    grid: ['.BBB..', '..CCAF', 'XX..AF', '.E..A.', '.E.DDD', '.E....'], // 6
  },
  // --- 보통 (medium) ---
  {
    id: 13,
    difficulty: 'medium',
    grid: ['..D.AA', '..D...', 'XXD..C', '.....C', '.....C', 'BBB...'], // 7
  },
  {
    id: 14,
    difficulty: 'medium',
    grid: ['.III.J', '..DD.J', 'XX..A.', 'CFFGA.', 'CE.GAH', '.EBBBH'], // 8
  },
];
