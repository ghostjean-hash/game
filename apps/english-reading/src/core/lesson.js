// 한 지문의 학습 진행 상태. DOM 미의존 순수 로직.
//
// 단계(stage): 'read' → 'gist' → 'summary'
//  - read: 문장을 하나씩 넘기며 추측 단어·구조 문항을 푼다.
//  - gist: 지문 전문을 보고 요지 문항을 푼다.
//  - summary: 오늘 만난 단어를 맞힘/새로 알게 됨으로 나눠 정리한다.

export function createLesson(passage) {
  if (!passage || !Array.isArray(passage.sentences) || passage.sentences.length === 0) {
    throw new Error("createLesson: 유효한 지문이 필요합니다");
  }

  const results = { guesses: [], structures: [], gist: null };
  let si = 0;
  let stage = "read";

  return {
    passage,
    stage: () => stage,
    sentenceIndex: () => si,
    currentSentence: () => passage.sentences[si],
    totalSentences: () => passage.sentences.length,
    position: () => si + 1,

    // 추측 단어 결과 기록. correct = 고른 답이 정답이었는지.
    recordGuess(word, chosen, correct) {
      results.guesses.push({ word, chosen, correct });
    },
    // 구조 확인 문항 결과 기록.
    recordStructure(label, correct) {
      results.structures.push({ label, correct });
    },

    // 다음 문장으로. 마지막 문장이었으면 stage를 'gist'로 넘긴다.
    nextSentence() {
      si += 1;
      if (si >= passage.sentences.length) {
        stage = "gist";
        return { done: true };
      }
      return { done: false };
    },

    // 요지 문항 결과 기록 후 정리 단계로.
    recordGist(chosen, correct) {
      results.gist = { chosen, correct };
      stage = "summary";
    },

    // 정리 화면용 요약. 맞힌 단어와 새로 알게 된 단어(틀렸거나 애매)를 나눈다.
    summary() {
      return {
        totalWords: results.guesses.length,
        correctWords: results.guesses.filter((g) => g.correct).map((g) => g.word),
        learnedWords: results.guesses.filter((g) => !g.correct).map((g) => g.word),
        structures: results.structures.slice(),
        gist: results.gist,
      };
    },

    results: () => results,
  };
}
