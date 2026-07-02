// 격자 → 행/열 숫자 힌트 생성 (순수 함수).
// 힌트는 그림 격자에서 자동 유도한다(SSOT는 격자 하나). docs/03_architecture.md 3장.

// 셀이 "칠하는 칸"인가: 색 인덱스 0=빈칸, 1 이상=칠함.
export function isFilled(v) {
  return v !== 0;
}

// 색 인덱스 격자를 채움 여부(boolean) 격자로. board/solver 판정용.
export function toMask(grid) {
  return grid.map((row) => row.map(isFilled));
}

// 한 줄(값 배열) → 연속 채움 묶음 길이 배열. 전부 빈칸이면 [0].
export function lineClue(line) {
  const clue = [];
  let run = 0;
  for (const v of line) {
    if (isFilled(v)) {
      run += 1;
    } else if (run > 0) {
      clue.push(run);
      run = 0;
    }
  }
  if (run > 0) clue.push(run);
  return clue.length ? clue : [0];
}

// 격자 → 행 힌트 배열(위→아래). 각 원소는 그 행의 clue.
export function rowClues(grid) {
  return grid.map((row) => lineClue(row));
}

// 격자 → 열 힌트 배열(왼→오). 각 원소는 그 열의 clue.
export function colClues(grid) {
  const size = grid.length;
  const width = size ? grid[0].length : 0;
  const clues = [];
  for (let c = 0; c < width; c++) {
    const col = grid.map((row) => row[c]);
    clues.push(lineClue(col));
  }
  return clues;
}

// 격자 → { rowClues, colClues } 한 번에.
export function makeClues(grid) {
  return { rowClues: rowClues(grid), colClues: colClues(grid) };
}
