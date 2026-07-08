// 코스·지문·진행 순수 로직. DOM 미의존.
//
// 코스는 완만한 난이도 순으로 정렬된 지문 묶음이다. 개별 지문 완독은 진행률만
// 채우고, 코스의 모든 지문을 완독하면 전체 클리어다(개별 완독엔 연출을 두지 않는다).

export function createCourse(courseData) {
  if (!courseData || !Array.isArray(courseData.passages) || courseData.passages.length === 0) {
    throw new Error("createCourse: 지문이 1개 이상 필요합니다");
  }
  // level 오름차순 정렬 - 데이터 순서와 무관하게 완만한 사다리를 보장한다.
  const passages = [...courseData.passages].sort((a, b) => (a.level || 0) - (b.level || 0));
  return {
    id: courseData.id,
    title: courseData.title,
    passages,
    passageCount: passages.length,
    passageById: (id) => passages.find((p) => p.id === id) || null,
  };
}

// done: 완독한 지문 id의 배열(또는 Set). 코스 진행 상태를 계산한다.
export function courseProgress(course, done = []) {
  const doneSet = new Set(done);
  const doneCount = course.passages.filter((p) => doneSet.has(p.id)).length;
  const total = course.passageCount;
  return {
    done: doneCount,
    total,
    ratio: total ? doneCount / total : 0,
    cleared: total > 0 && doneCount === total,
  };
}

// 지문 전체 텍스트는 문장을 이어 조합한다(같은 내용을 두 곳에 두지 않는다).
export function passageText(passage) {
  return passage.sentences.map((s) => s.text).join(" ");
}
