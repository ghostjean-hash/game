// 학습 카드 표시 단계(QUESTION/ANSWER)와 키 입력 매핑 - 순수 로직(DOM 미의존, 테스트 가능).
//
// 핵심(요청서 2·4·5·14장): 정답을 보기 전에 반드시 한 번 기억에서 뜻을 꺼내게 한다.
//  - QUESTION: 단어만 보여준다. 뜻·예문·판정 버튼은 숨긴다. "뜻 확인"으로만 다음 단계.
//  - ANSWER: 뜻·예문을 공개하고, 이때만 "몰랐음/알았음" 판정을 받는다.
//  - 단어가 바뀔 때마다 항상 QUESTION으로 초기화한다(새로고침 복원 시에도 정답 공개 상태는 초기화).

export const VIEW = { QUESTION: "question", ANSWER: "answer" };

// 새 단어 진입 시 항상 QUESTION.
export function initialCardView() {
  return VIEW.QUESTION;
}

// 키 입력 → 학습 의도. 카드 상태에 따라 다르게 해석한다.
// 반환: "reveal"(뜻 확인) | "known"(알았음) | "unknown"(몰랐음) | null(무시)
//  - QUESTION: 스페이스·Enter만 뜻 확인. 그 외(1·2 등 판정 키)는 무시해 오판정을 막는다.
//  - ANSWER: ←/1=몰랐음, →/2=알았음. 스페이스·Enter는 무시(다음 단어로 자동 연결 방지).
export function resolveKey(view, key) {
  if (view === VIEW.QUESTION) {
    if (key === " " || key === "Enter") return "reveal";
    return null;
  }
  if (key === "ArrowLeft" || key === "1") return "unknown";
  if (key === "ArrowRight" || key === "2") return "known";
  return null;
}
