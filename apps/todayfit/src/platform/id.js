// 새 항목의 식별자 (05_manage-screens.md 5.3).
//
// core/ 가 아니라 여기 두는 이유는 난수와 시각이 순수 함수가 아니기 때문이다
// (03_architecture.md 2.1). 식별자는 저장에 남아 루틴 항목과 요일 규칙이 참조하므로
// 한 번 붙으면 바뀌지 않는다.

/** 브라우저가 randomUUID 를 갖고 있으면 그것을 쓴다. 안전한 문맥(https·localhost)에서만 있다. */
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 없는 환경 대비. 시각만으로는 같은 밀리초에 둘을 만들면 겹치므로 난수를 잇는다
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${stamp}-${rand}`;
}
