// 영어 독해 사다리 - 지문 고르기 → 3단계 흐름(읽으며 추측 → 요지 확인 → 오늘의 정리) 조립.
// 순수 로직은 core/(tokenize·lesson)에 위임하고, 여기서 DOM만 만진다.
import { tokenize } from "./core/tokenize.js";
import { createLesson, shuffleOptions } from "./core/lesson.js";
import { createStorage } from "../../../shared/storage.js";
import { registerServiceWorker } from "../../../shared/ui.js";

registerServiceWorker("/service-worker.js");

const store = createStorage("english-reading");

const el = {
  title: document.getElementById("lesson-title"),
  progress: document.getElementById("lesson-progress"),
  barFill: document.getElementById("bar-fill"),
  stage: document.getElementById("stage"),
  controls: document.getElementById("controls"),
};

let passages = [];
let lesson = null;

fetch("./src/data/passages.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then((data) => {
    passages = data.passages;
    renderPicker();
  })
  .catch(() => {
    el.title.textContent = "오류";
    el.stage.textContent = "지문을 불러오지 못했습니다.";
  });

function setBar(ratio) {
  el.barFill.style.width = `${Math.round(ratio * 100)}%`;
}

// ── 지문 고르기 ──────────────────────────────
function renderPicker() {
  lesson = null;
  el.title.textContent = "영어 독해 사다리";
  el.progress.textContent = "오늘 읽을 지문 고르기";
  setBar(0);
  el.stage.innerHTML = "";
  el.controls.innerHTML = "";

  const instruction = document.createElement("div");
  instruction.className = "instruction";
  instruction.textContent = "하루 한 편, 문맥으로 추측하며 읽어 보세요";
  el.stage.appendChild(instruction);

  const completed = store.get("completed", {});
  const list = document.createElement("div");
  list.className = "passage-list";
  passages.forEach((p) => {
    const wordCount = p.sentences.reduce((n, s) => n + s.guessWords.length, 0);
    const card = document.createElement("button");
    card.className = "passage-card";
    card.type = "button";

    const head = document.createElement("div");
    head.className = "p-head";
    const t = document.createElement("div");
    t.className = "p-title";
    t.textContent = p.title;
    head.appendChild(t);
    const done = completed[p.id];
    if (done) {
      const badge = document.createElement("span");
      badge.className = "badge-done";
      badge.textContent = `읽음 ✓ 단어 ${done.correctWords}/${done.totalWords}`;
      head.appendChild(badge);
    }
    card.appendChild(head);

    const meta = document.createElement("div");
    meta.className = "p-meta";
    meta.textContent = `문장 ${p.sentences.length}개 · 추측 단어 ${wordCount}개`;
    card.appendChild(meta);

    card.addEventListener("click", () => startLesson(p));
    list.appendChild(card);
  });
  el.stage.appendChild(list);

  renderWordbook();
}

// 지문 고르기 화면 아래의 "내 단어장" - 새로 알게 된 단어들이 쌓인다.
// 칩을 누르면 뜻을 보여줘 복습 도구로 쓰인다.
function renderWordbook() {
  const wordbook = store.get("wordbook", []);
  if (!wordbook.length) return;

  const g = document.createElement("div");
  g.className = "word-group wordbook";
  const h = document.createElement("div");
  h.className = "word-group-label";
  h.textContent = `내 단어장 ${wordbook.length}개 · 눌러서 뜻 확인`;
  g.appendChild(h);

  const chips = document.createElement("div");
  chips.className = "chips";
  wordbook.forEach((w) => {
    const c = document.createElement("button");
    c.className = "chip chip-learned wb-chip";
    c.type = "button";
    c.textContent = w.word;
    let shown = false;
    c.addEventListener("click", () => {
      shown = !shown;
      c.textContent = shown ? `${w.word} - ${w.meaning}` : w.word;
    });
    chips.appendChild(c);
  });
  g.appendChild(chips);
  el.stage.appendChild(g);
}

function startLesson(passage) {
  lesson = createLesson(passage);
  el.title.textContent = passage.title;
  renderStage();
}

function renderStage() {
  const stage = lesson.stage();
  if (stage === "read") renderRead();
  else if (stage === "gist") renderGist();
  else renderSummary();
}

// 공통: 보기 버튼 묶음. 보기 순서는 매번 셔플해 위치 암기·찍기를 막는다.
// 고르면 정답/오답을 잠가 표시하고, 색 외 보조 신호(✓/✗)를 함께 붙인다.
// onChoose에는 원본 데이터 기준 인덱스(chosenOriginal)와 정오를 넘긴다.
// column=true면 보기를 세로로 쌓는다(요지처럼 보기가 긴 경우).
function buildOptions(optionTexts, answerIndex, onChoose, column) {
  const shuffled = shuffleOptions(optionTexts, answerIndex);
  const opts = document.createElement("div");
  opts.className = "options" + (column ? " options-col" : "");
  shuffled.options.forEach((text, i) => {
    const b = document.createElement("button");
    b.className = "option";
    b.type = "button";
    b.textContent = text;
    b.addEventListener("click", () => {
      const correct = i === shuffled.answer;
      [...opts.children].forEach((bb, j) => {
        bb.disabled = true;
        if (j === shuffled.answer) {
          bb.classList.add("correct");
          bb.textContent += " ✓";
        } else if (j === i) {
          bb.classList.add("wrong");
          bb.textContent += " ✗";
        }
      });
      onChoose(optionTexts.indexOf(shuffled.options[i]), correct);
    });
    opts.appendChild(b);
  });
  return opts;
}

// ── 1단계: 읽으며 추측 ──────────────────────────────
function renderRead() {
  const s = lesson.currentSentence();
  const last = lesson.position() >= lesson.totalSentences();
  el.progress.textContent = `문장 ${lesson.position()} / ${lesson.totalSentences()}`;
  setBar((lesson.position() - 1) / (lesson.totalSentences() + 1));
  el.stage.innerHTML = "";
  el.controls.innerHTML = "";

  const guessByWord = new Map();
  s.guessWords.forEach((g) => guessByWord.set(g.word.toLowerCase(), g));
  const pending = new Set(guessByWord.keys());
  const spansByWord = new Map(); // 같은 단어가 여러 번 나와도 전부 함께 풀림 처리
  let structureDone = !s.structureQ;

  const instruction = document.createElement("div");
  instruction.className = "instruction";
  instruction.textContent = s.guessWords.length
    ? "밑줄 친 단어의 뜻을 문맥으로 추측해 눌러 보세요"
    : "문장을 읽어 보세요";
  el.stage.appendChild(instruction);

  const sentEl = document.createElement("div");
  sentEl.className = "sentence";
  tokenize(s.text).forEach((tok) => {
    const span = document.createElement("span");
    span.textContent = tok.raw;
    if (guessByWord.has(tok.clean)) {
      span.className = "word guess";
      span.setAttribute("role", "button");
      span.addEventListener("click", () => onGuessWord(tok.clean));
      if (!spansByWord.has(tok.clean)) spansByWord.set(tok.clean, []);
      spansByWord.get(tok.clean).push(span);
    } else {
      span.className = "word plain";
    }
    sentEl.appendChild(span);
    sentEl.appendChild(document.createTextNode(" "));
  });
  el.stage.appendChild(sentEl);

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.hidden = true;
  el.stage.appendChild(panel);

  const structureHost = document.createElement("div");
  structureHost.className = "structure-host";
  el.stage.appendChild(structureHost);

  // 끊어읽기 해석 보기
  const chunkBtn = document.createElement("button");
  chunkBtn.className = "btn chunk-btn";
  chunkBtn.type = "button";
  chunkBtn.textContent = "끊어읽기 해석 보기";
  const chunkHost = document.createElement("div");
  chunkHost.className = "chunks";
  chunkHost.hidden = true;
  chunkBtn.addEventListener("click", () => {
    chunkBtn.hidden = true;
    chunkHost.hidden = false;
    s.chunks.forEach((c, i) => {
      const row = document.createElement("div");
      row.className = "chunk";
      row.style.animationDelay = `${i * 0.12}s`;
      const en = document.createElement("div");
      en.className = "chunk-en";
      en.textContent = c.en;
      const kr = document.createElement("div");
      kr.className = "chunk-kr";
      kr.textContent = c.kr;
      row.append(en, kr);
      chunkHost.appendChild(row);
    });
  });
  el.stage.append(chunkBtn, chunkHost);

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn btn-primary";
  nextBtn.type = "button";
  nextBtn.textContent = last ? "요지 확인 →" : "다음 문장 →";
  nextBtn.addEventListener("click", () => {
    lesson.nextSentence();
    renderStage();
  });
  el.controls.appendChild(nextBtn);
  maybeStructure(); // 추측 단어가 없는 문장도 구조 문항이 바로 뜨도록
  updateNextState();

  function updateNextState() {
    nextBtn.disabled = !(pending.size === 0 && structureDone);
  }

  function onGuessWord(clean) {
    if (!pending.has(clean)) return;
    const g = guessByWord.get(clean);
    panel.hidden = false;
    panel.innerHTML = "";

    const q = document.createElement("div");
    q.className = "panel-q";
    q.textContent = `"${g.word}" 의 뜻은?`;
    panel.appendChild(q);

    panel.appendChild(
      buildOptions(g.options, g.answer, (chosen, correct) => {
        lesson.recordGuess(g.word, chosen, correct);
        (spansByWord.get(clean) || []).forEach((sp) =>
          sp.classList.add(correct ? "solved-correct" : "solved-learned")
        );
        pending.delete(clean);
        const fb = document.createElement("div");
        fb.className = "feedback " + (correct ? "ok" : "learn");
        fb.textContent = correct ? "맞았어요!" : `이 뜻이에요 - ${g.options[g.answer]}`;
        panel.appendChild(fb);
        maybeStructure();
        updateNextState();
      })
    );

    const hintBtn = document.createElement("button");
    hintBtn.className = "btn hint-btn";
    hintBtn.type = "button";
    hintBtn.textContent = "힌트";
    hintBtn.addEventListener("click", () => {
      const h = document.createElement("div");
      h.className = "hint";
      h.textContent = g.hint;
      panel.appendChild(h);
      hintBtn.hidden = true;
    });
    panel.appendChild(hintBtn);
  }

  function maybeStructure() {
    if (pending.size > 0 || structureDone || !s.structureQ) return;
    const sq = s.structureQ;
    const box = document.createElement("div");
    box.className = "panel structure";

    const q = document.createElement("div");
    q.className = "panel-q";
    q.textContent = sq.prompt;
    const tag = document.createElement("span");
    tag.className = "label-tag";
    tag.textContent = sq.label;
    q.appendChild(tag);
    box.appendChild(q);

    box.appendChild(
      buildOptions(sq.options, sq.answer, (chosen, correct) => {
        lesson.recordStructure(sq.label, correct);
        const fb = document.createElement("div");
        fb.className = "feedback " + (correct ? "ok" : "learn");
        fb.textContent = correct ? "맞았어요!" : `정답은 '${sq.options[sq.answer]}' 이에요`;
        box.appendChild(fb);
        structureDone = true;
        updateNextState();
      })
    );
    structureHost.appendChild(box);
  }
}

// ── 2단계: 요지 확인 ──────────────────────────────
function renderGist() {
  const p = lesson.passage;
  el.progress.textContent = "요지 확인";
  setBar(lesson.totalSentences() / (lesson.totalSentences() + 1));
  el.stage.innerHTML = "";
  el.controls.innerHTML = "";

  const instruction = document.createElement("div");
  instruction.className = "instruction";
  instruction.textContent = "지문 전체를 읽고 무슨 내용인지 골라 보세요";
  el.stage.appendChild(instruction);

  const full = document.createElement("div");
  full.className = "full-text";
  full.textContent = p.sentences.map((s) => s.text).join(" ");
  el.stage.appendChild(full);

  const box = document.createElement("div");
  box.className = "panel";
  const q = document.createElement("div");
  q.className = "panel-q";
  q.textContent = p.gistQ.prompt;
  box.appendChild(q);

  box.appendChild(
    buildOptions(p.gistQ.options, p.gistQ.answer, (chosen, correct) => {
      lesson.recordGist(chosen, correct);
      const fb = document.createElement("div");
      fb.className = "feedback " + (correct ? "ok" : "learn");
      fb.textContent = correct ? "맞았어요!" : "요지는 초록색 ✓ 보기예요. 한 번 더 읽어 보세요";
      box.appendChild(fb);
      const nextBtn = document.createElement("button");
      nextBtn.className = "btn btn-primary";
      nextBtn.type = "button";
      nextBtn.textContent = "오늘의 정리 →";
      nextBtn.addEventListener("click", renderStage);
      el.controls.appendChild(nextBtn);
    }, true)
  );
  el.stage.appendChild(box);
}

// ── 3단계: 오늘의 정리 ──────────────────────────────
function renderSummary() {
  const sum = lesson.summary();
  saveResults(sum);
  el.progress.textContent = "오늘의 정리";
  setBar(1);
  el.stage.innerHTML = "";
  el.controls.innerHTML = "";

  const title = document.createElement("div");
  title.className = "summary-title";
  title.textContent = "한 편을 다 읽었어요!";
  el.stage.appendChild(title);

  const stat = document.createElement("div");
  stat.className = "summary-stat";
  stat.textContent = `단어 ${sum.totalWords}개 중 ${sum.correctWords.length}개를 스스로 맞혔어요`;
  el.stage.appendChild(stat);

  if (sum.correctWords.length) {
    el.stage.appendChild(wordGroup("스스로 맞힌 단어", sum.correctWords, "correct"));
  }
  if (sum.learnedWords.length) {
    el.stage.appendChild(wordGroup("새로 알게 된 단어 · 단어장에 담겼어요", sum.learnedWords, "learned"));
  }

  const gist = document.createElement("div");
  gist.className = "summary-line";
  gist.textContent = sum.gist && sum.gist.correct ? "글의 요지도 맞혔어요" : "요지는 다음에 다시 도전해요";
  el.stage.appendChild(gist);

  const againBtn = document.createElement("button");
  againBtn.className = "btn";
  againBtn.type = "button";
  againBtn.textContent = "다른 지문 읽기";
  againBtn.addEventListener("click", renderPicker);
  const homeBtn = document.createElement("a");
  homeBtn.className = "btn btn-primary";
  homeBtn.href = "../../";
  homeBtn.textContent = "홈으로";
  el.controls.append(againBtn, homeBtn);
}

// 정리 화면 진입 시 결과를 저장한다.
// - 단어장: 새로 알게 된(틀린) 단어를 뜻과 함께 누적, 단어 기준 중복 없음.
// - 완료 기록: 지문별 마지막 결과(지문 고르기 화면의 "읽음 ✓" 근거).
function saveResults(sum) {
  const p = lesson.passage;
  const meaningOf = new Map();
  p.sentences.forEach((s) =>
    s.guessWords.forEach((g) => meaningOf.set(g.word, g.options[g.answer]))
  );

  const wordbook = store.get("wordbook", []);
  const known = new Set(wordbook.map((w) => w.word));
  sum.learnedWords.forEach((word) => {
    if (known.has(word)) return;
    known.add(word);
    wordbook.push({ word, meaning: meaningOf.get(word) || "", passage: p.id });
  });
  store.set("wordbook", wordbook);

  const completed = store.get("completed", {});
  completed[p.id] = {
    correctWords: sum.correctWords.length,
    totalWords: sum.totalWords,
    gistCorrect: !!(sum.gist && sum.gist.correct),
  };
  store.set("completed", completed);
}

function wordGroup(label, words, kind) {
  const g = document.createElement("div");
  g.className = "word-group";
  const h = document.createElement("div");
  h.className = "word-group-label";
  h.textContent = label;
  g.appendChild(h);
  const chips = document.createElement("div");
  chips.className = "chips";
  words.forEach((w) => {
    const c = document.createElement("span");
    c.className = `chip chip-${kind}`;
    c.textContent = w;
    chips.appendChild(c);
  });
  g.appendChild(chips);
  return g;
}
