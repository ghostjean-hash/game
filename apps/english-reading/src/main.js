// 영어 독해 사다리 - 3단계 흐름(읽으며 추측 → 요지 확인 → 오늘의 정리) 조립.
// 순수 로직은 core/(tokenize·lesson)에 위임하고, 여기서 DOM만 만진다.
import { tokenize } from "./core/tokenize.js";
import { createLesson } from "./core/lesson.js";
import { registerServiceWorker } from "../../../shared/ui.js";

registerServiceWorker("/service-worker.js");

const el = {
  title: document.getElementById("lesson-title"),
  progress: document.getElementById("lesson-progress"),
  stage: document.getElementById("stage"),
  controls: document.getElementById("controls"),
};

let lesson = null;

fetch("./src/data/passages.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then((data) => {
    const passage = data.passages[0]; // MVP: 첫 지문
    lesson = createLesson(passage);
    el.title.textContent = passage.title;
    renderStage();
  })
  .catch(() => {
    el.title.textContent = "오류";
    el.stage.textContent = "지문을 불러오지 못했습니다.";
  });

function renderStage() {
  const stage = lesson.stage();
  if (stage === "read") renderRead();
  else if (stage === "gist") renderGist();
  else renderSummary();
}

// 공통: 보기 버튼 묶음을 만들고, 고르면 정답/오답을 잠가 표시한다.
// column=true면 보기를 세로로 쌓는다(요지처럼 보기가 긴 경우).
function buildOptions(optionTexts, answerIndex, onChoose, column) {
  const opts = document.createElement("div");
  opts.className = "options" + (column ? " options-col" : "");
  optionTexts.forEach((text, i) => {
    const b = document.createElement("button");
    b.className = "option";
    b.type = "button";
    b.textContent = text;
    b.addEventListener("click", () => {
      [...opts.children].forEach((bb, j) => {
        bb.disabled = true;
        if (j === answerIndex) bb.classList.add("correct");
        else if (j === i) bb.classList.add("wrong");
      });
      onChoose(i, i === answerIndex);
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
  el.stage.innerHTML = "";
  el.controls.innerHTML = "";

  const guessByWord = new Map();
  s.guessWords.forEach((g) => guessByWord.set(g.word.toLowerCase(), g));
  const pending = new Set(guessByWord.keys());
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
      span.addEventListener("click", () => onGuessWord(tok.clean, span));
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
  updateNextState();

  function updateNextState() {
    nextBtn.disabled = !(pending.size === 0 && structureDone);
  }

  function onGuessWord(clean, span) {
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
        span.classList.add(correct ? "solved-correct" : "solved-learned");
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
        fb.textContent = correct ? "맞았어요!" : "정답을 확인하세요";
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
      fb.textContent = correct ? "맞았어요!" : "정답을 확인하세요";
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
  el.progress.textContent = "오늘의 정리";
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

  const homeBtn = document.createElement("a");
  homeBtn.className = "btn btn-primary";
  homeBtn.href = "../../";
  homeBtn.textContent = "홈으로";
  el.controls.appendChild(homeBtn);
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
