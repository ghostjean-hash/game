// 카테고리 집중 세션 상태. DOM 미의존 순수 로직.
//
// 한 카테고리의 문장들을 순환(뺑뺑이)하며, 푼 문제 수(count)가 maxCount에 닿으면
// 카운트를 0으로 리셋하고 다음 카테고리로 강제 전환한다. 마지막 카테고리 뒤엔 처음으로.

export function createSession(categories, { maxCount = 40 } = {}) {
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("createSession: 카테고리가 1개 이상 필요합니다");
  }
  let ci = 0; // 현재 카테고리
  let si = 0; // 카테고리 내 현재 문장
  let count = 0; // 이번 카테고리에서 푼 문제 수

  return {
    maxCount,
    category: () => categories[ci],
    sentence: () => categories[ci].sentences[si],
    count: () => count,

    // 문제 1개 완료. maxCount 도달 시 다음 카테고리로 전환하며 {switched:true}를 돌려준다.
    solve() {
      count += 1;
      if (count >= maxCount) {
        count = 0;
        ci = (ci + 1) % categories.length;
        si = 0;
        return { switched: true, category: categories[ci] };
      }
      si = (si + 1) % categories[ci].sentences.length;
      return { switched: false, category: categories[ci] };
    },
  };
}
