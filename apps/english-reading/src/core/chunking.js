// 끊어 읽기 긋기 채점. DOM 미의존 순수 로직.
//
// 틈(gap) 번호 = g번 토큰과 g+1번 토큰 사이(0-based). 문장에 토큰이 n개면 틈은 0..n-2.
// 정답 경계는 청킹 데이터(chunks.en)의 단어 수 누적 위치다 - 데이터가 곧 정답지라
// 별도 정답 입력이 필요 없다.

export function chunkBoundaries(tokens, chunks) {
  const bounds = new Set();
  let acc = 0;
  for (let i = 0; i < chunks.length - 1; i++) {
    acc += String(chunks[i].en).split(/\s+/).filter(Boolean).length;
    const gap = acc - 1; // 누적 c번째 단어 뒤의 틈 = c-1
    if (gap >= 0 && gap < tokens.length - 1) bounds.add(gap);
  }
  return bounds;
}

// slashes: 사용자가 그은 틈 번호 목록. 정답 경계와 대조해 세 갈래로 나눈다.
// correct = 그었고 정답 / wrong = 그었지만 정답 아님 / missed = 정답인데 안 그음.
export function gradeSlashes(boundaries, slashes) {
  const drawn = new Set(slashes);
  const correct = [];
  const wrong = [];
  const missed = [];
  drawn.forEach((g) => (boundaries.has(g) ? correct : wrong).push(g));
  boundaries.forEach((g) => { if (!drawn.has(g)) missed.push(g); });
  return { correct, wrong, missed };
}
