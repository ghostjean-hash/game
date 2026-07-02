// 보드게임(ThinkFun Rush Hour) 모드 퍼즐.
//
// ⚠️ 임시 데이터: 지금은 "2모드 구조"를 먼저 검증하기 위한 자체 배치 6개다(solver로 풀림 확인,
//    runner.js가 매번 재검증). 실제 ThinkFun 40개 카드 배치가 확정되면 이 배열을 그대로 교체한다.
//    형식·유효성 규칙은 puzzles.js와 완전히 동일: { id(1부터 연속), difficulty, grid }.
//    grid는 6x6 문자열 6줄, 빈칸 '.', 빨간 차 'X'(EXIT_ROW=2 행 · 가로 · 길이 2), 나머지 차는 알파벳.
//
// 끝 주석 = solver 최소 이동수(opt).

export const BOARDGAME_PUZZLES = [
  { id: 1, difficulty: 'beginner', grid: ["......", "......", ".XX...", "...A..", "...A..", "..BB.."] }, // 1
  { id: 2, difficulty: 'beginner', grid: ["......", "...B.C", ".XXB.C", "...B.C", "AAA...", ".DD..."] }, // 3
  { id: 3, difficulty: 'easy', grid: ["...B..", "...B.C", "XX.B.C", ".....C", "AAA...", "...DD."] }, // 4
  { id: 4, difficulty: 'easy', grid: ["......", ".....A", "..XX.A", ".....A", "..BCCC", "DDB..."] }, // 5
  { id: 5, difficulty: 'medium', grid: [".....A", ".....A", ".XX..A", "....BB", "....DD", "...CCC"] }, // 5
  { id: 6, difficulty: 'medium', grid: ["......", "...DFF", "XXCDEB", "..CDEB", "..C..B", "...AA."] }, // 6
];
