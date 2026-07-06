// 영어 청킹 훈련 - 화면 조립 + 이벤트. 순수 로직은 core/에 위임한다.
import { tokenize, resolveTargets } from "./core/tokenize.js";
import { createSession } from "./core/session.js";
import { registerServiceWorker, showModal } from "../../../shared/ui.js";

registerServiceWorker("/service-worker.js");

const el = {
  patternLabel: document.getElementById("pattern-label"),
  patternProgress: document.getElementById("pattern-progress"),
  instruction: document.getElementById("instruction"),
  sentence: document.getElementById("sentence"),
  tooltip: document.getElementById("tooltip"),
  chunks: document.getElementById("chunks"),
  train: document.getElementById("train"),
  btnReveal: document.getElementById("btn-reveal"),
  btnNext: document.getElementById("btn-next"),
};

let session = null;
let targets = []; // 현재 문장의 해석된 타겟 { index, type, hint, ... }
let found = 0;
let revealed = false;

fetch("./src/data/sentences.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then((data) => {
    session = createSession(data.patterns, data.sentences);
    renderCurrent();
  })
  .catch(() => {
    el.patternLabel.textContent = "오류";
    el.sentence.textContent = "문장 데이터를 불러오지 못했습니다.";
  });

function renderCurrent() {
  const s = session.current();
  const tokens = tokenize(s.text);
  targets = resolveTargets(tokens, s.targetWords).filter((t) => t.index >= 0);
  const targetIndexes = new Set(targets.map((t) => t.index));
  found = 0;
  revealed = false;

  el.patternLabel.textContent = session.pattern().label;
  el.patternProgress.textContent = `${session.position()} / ${session.total()}`;
  el.instruction.textContent = "문법 덫을 찾아 단어를 클릭해 보세요";
  el.instruction.classList.remove("done");
  el.tooltip.hidden = true;
  el.chunks.hidden = true;
  el.chunks.innerHTML = "";
  el.btnReveal.classList.remove("pulse");

  el.sentence.innerHTML = "";
  tokens.forEach((tok) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = tok.raw;
    span.addEventListener("click", (e) => {
      e.stopPropagation(); // 문장 영역 탭(=해석 보기)과 분리
      onWordClick(tok.index, span, targetIndexes);
    });
    el.sentence.appendChild(span);
    el.sentence.appendChild(document.createTextNode(" "));
  });
}

function onWordClick(index, span, targetIndexes) {
  if (span.classList.contains("found")) return;
  if (targetIndexes.has(index)) {
    span.classList.add("found");
    found += 1;
    showTooltip(targets.find((t) => t.index === index));
    if (found >= targets.length) {
      el.instruction.textContent = "다 찾았어요! 이제 해석을 확인해 보세요";
      el.instruction.classList.add("done");
      el.btnReveal.classList.add("pulse");
    }
  } else {
    span.classList.remove("shake");
    void span.offsetWidth; // reflow 강제 → 애니메이션 재시작
    span.classList.add("shake");
  }
}

function showTooltip(target) {
  if (!target) return;
  el.tooltip.hidden = false;
  el.tooltip.innerHTML = "";
  const type = document.createElement("span");
  type.className = "tt-type";
  type.textContent = target.type;
  const hint = document.createElement("span");
  hint.className = "tt-hint";
  hint.textContent = target.hint;
  el.tooltip.append(type, hint);
}

function revealChunks() {
  if (revealed || !session) return;
  revealed = true;
  el.btnReveal.classList.remove("pulse");
  const s = session.current();
  el.chunks.hidden = false;
  el.chunks.innerHTML = "";
  s.chunks.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "chunk";
    row.style.animationDelay = `${i * 0.18}s`;
    const en = document.createElement("div");
    en.className = "chunk-en";
    en.textContent = c.en;
    const kr = document.createElement("div");
    kr.className = "chunk-kr";
    kr.textContent = c.kr;
    row.append(en, kr);
    el.chunks.appendChild(row);
  });
}

// '해석 보기' 버튼 + 문장 영역 아무 곳 탭 = 해석 노출
el.btnReveal.addEventListener("click", revealChunks);
el.train.addEventListener("click", revealChunks);

el.btnNext.addEventListener("click", () => {
  if (!session) return;
  const result = session.next();
  if (result.patternCleared) {
    showModal({
      title: "패턴 완료!",
      body: `'${result.cleared.label}' 패턴 ${result.clearedCount}문제를 마쳤어요. 다음은 '${result.nextPattern.label}' 패턴입니다.`,
      actions: [{ label: "다음 패턴 시작", primary: true }],
    }).then(renderCurrent);
  } else {
    renderCurrent();
  }
});
