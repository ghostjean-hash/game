// 코스·지문·진행 순수 로직. DOM 미의존.
//
// 난이도 우선(2026-07-21 사용자 지시): 학습자는 먼저 난이도(Level)를 고르고, 그 안에서
// 여러 주제의 같은 난이도 글을 읽는다. 코스 = 하나의 난이도 레벨이고, 그 레벨의 모든
// 지문을 완독하면 클리어다(개별 완독엔 연출을 두지 않는다).
// 데이터(passages.json)는 주제별 저장(courses)을 유지하고(출제·힌트용), 아래
// createLevelCourses가 표시용으로만 level별로 재그룹핑한다.

// 주제별로 저장된 코스 배열을 난이도(level)별 "레벨 코스"로 재편한다.
// labels: { level(number): 표시 제목 } (없으면 "Level N").
export function createLevelCourses(courseList, labels = {}) {
  if (!Array.isArray(courseList) || courseList.length === 0) {
    throw new Error("createLevelCourses: 코스 배열이 필요합니다");
  }
  // 주제 등장 순서를 기록(레벨 안에서 주제별로 묶어 보여주기 위함).
  const topicOrder = [];
  const all = [];
  courseList.forEach((c) => {
    (c.passages || []).forEach((p) => {
      const topic = p.topic || c.title || "";
      if (!topicOrder.includes(topic)) topicOrder.push(topic);
      all.push({ ...p, topic });
    });
  });
  // level → 지문 목록
  const byLevel = new Map();
  all.forEach((p) => {
    const lv = p.level || 0;
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv).push(p);
  });
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  return levels.map((lv) => {
    // 레벨 안은 주제 등장 순서로 묶는다(같은 주제는 원래 순서 유지 - 안정 정렬).
    const passages = byLevel.get(lv)
      .map((p, i) => ({ p, i }))
      .sort((a, b) => (topicOrder.indexOf(a.p.topic) - topicOrder.indexOf(b.p.topic)) || (a.i - b.i))
      .map((x) => x.p);
    return {
      id: `level-${lv}`,
      level: lv,
      title: labels[lv] || `Level ${lv}`,
      passages,
      passageCount: passages.length,
      passageById: (id) => passages.find((p) => p.id === id) || null,
    };
  });
}

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
