// 영어 문법 스캔 - 세션 기반 문법 스캔 + 청킹 직독직해 훈련 조립.
// 순수 로직은 core/(tokenize·session)에 위임하고, 여기서 DOM만 만진다.
import { tokenize, resolveTargets } from "./core/tokenize.js";
import { createSession } from "./core/session.js";
import { registerServiceWorker } from "../../../shared/ui.js";

registerServiceWorker("/service-worker.js");

// 한 카테고리를 몇 문제 풀면 다음 카테고리로 전환할지. 테스트 시 이 값만 조절.
const MAX_SESSION_COUNT = 40;

const el = {
  title: document.getElementById("lesson-title"),
  progress: document.getElementById("lesson-progress"),
  barFill: document.getElementById("bar-fill"),
  stage: document.getElementById("stage"),
  controls: document.getElementById("controls"),
};

let session = null;

fetch("./src/data/grammar-bank.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then((data) => {
    session = createSession(data.categories, { maxCount: MAX_SESSION_COUNT });
    renderIntro();
  })
  .catch(() => {
    el.title.textContent = "오류";
    el.stage.textContent = "문장을 불러오지 못했습니다.";
  });

function setBar(ratio) {
  el.barFill.style.width = `${Math.round(ratio * 100)}%`;
}

// 카테고리 인트로 - 훈련 시작 전에 "이 패턴을 왜 쓰는가"(작문 관점)를 먼저 보여준다.
function renderIntro() {
  const cat = session.category();
  el.title.textContent = cat.title;
  el.progress.textContent = "패턴 이해";
  setBar(0);
  el.stage.innerHTML = "";
  el.controls.innerHTML = "";

  const card = document.createElement("div");
  card.className = "intro-card";

  const head = document.createElement("div");
  head.className = "intro-head";
  head.textContent = cat.title;
  card.appendChild(head);

  card.appendChild(labeledBlock("왜 이렇게 쓰나", cat.intro.why));
  const formula = labeledBlock("공식", cat.intro.formula);
  formula.querySelector(".block-body").classList.add("formula");
  card.appendChild(formula);
  card.appendChild(labeledBlock("작문 팁", cat.intro.tip));

  el.stage.appendChild(card);

  const startBtn = document.createElement("button");
  startBtn.className = "btn btn-primary";
  startBtn.type = "button";
  startBtn.textContent = "훈련 시작 →";
  startBtn.addEventListener("click", renderSentence);
  el.controls.appendChild(startBtn);
}

function labeledBlock(label, text) {
  const wrap = document.createElement("div");
  wrap.className = "block";
  const l = document.createElement("div");
  l.className = "block-label";
  l.textContent = label;
  const b = document.createElement("div");
  b.className = "block-body";
  b.textContent = text;
  wrap.append(l, b);
  return wrap;
}

function renderSentence() {
  const cat = session.category();
  const s = session.sentence();
  el.title.textContent = cat.title;
  el.progress.textContent = `문제 ${session.count() + 1} / ${session.maxCount}`;
  setBar(session.count() / session.maxCount);
  el.stage.innerHTML = "";
  el.controls.innerHTML = "";

  // 정답 메시지 배너 - 문법 단어를 맞히면 상단에 나타난다.
  const banner = document.createElement("div");
  banner.className = "msg-banner";
  banner.hidden = true;
  el.stage.appendChild(banner);

  const instruction = document.createElement("div");
  instruction.className = "instruction";
  instruction.textContent = "문장에서 훈련 중인 문법 핵심 단어를 찾아 클릭하세요";
  el.stage.appendChild(instruction);

  // 문장 - 트랩 위치는 nth까지 해석해 토큰 인덱스로 잠근다(같은 단어 중복 대비).
  const tokens = tokenize(s.text);
  const traps = resolveTargets(tokens, s.traps);
  const trapByIndex = new Map(traps.filter((t) => t.index >= 0).map((t) => [t.index, t]));
  const pending = new Set(trapByIndex.keys());

  const sentEl = document.createElement("div");
  sentEl.className = "sentence";
  tokens.forEach((tok) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = tok.raw;
    span.addEventListener("click", (e) => {
      e.stopPropagation(); // 단어 클릭이 화면 터치(해석 공개)로 번지지 않게
      onWordClick(tok.index, span);
    });
    sentEl.appendChild(span);
    sentEl.appendChild(document.createTextNode(" "));
  });
  el.stage.appendChild(sentEl);

  // 청킹 해석 - '해석 보기' 버튼 또는 화면 아무 곳 터치로 공개(1회).
  const chunkBtn = document.createElement("button");
  chunkBtn.className = "btn chunk-btn";
  chunkBtn.type = "button";
  chunkBtn.textContent = "해석 보기";
  const chunkHost = document.createElement("div");
  chunkHost.className = "chunks";
  chunkHost.hidden = true;
  let revealed = false;
  function revealChunks() {
    if (revealed) return;
    revealed = true;
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
  }
  chunkBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    revealChunks();
  });
  el.stage.addEventListener("click", revealChunks);
  el.stage.append(chunkBtn, chunkHost);

  function onWordClick(index, span) {
    if (trapByIndex.has(index) && pending.has(index)) {
      // 정답 - 초록 하이라이트 + 상단 메시지
      pending.delete(index);
      span.classList.add("found");
      banner.textContent = trapByIndex.get(index).message;
      banner.hidden = false;
      banner.classList.remove("pop");
      void banner.offsetWidth; // 애니메이션 재발동
      banner.classList.add("pop");
      if (pending.size === 0) {
        showInsight();
        showNextButton();
      }
    } else if (!span.classList.contains("found")) {
      // 오답 - 흔들림 (색 외 보조 신호)
      span.classList.remove("shake");
      void span.offsetWidth;
      span.classList.add("shake");
    }
  }

  // 구조 해부 카드 - 찾기가 끝나면 "왜 이 구조인가"를 작문 관점까지 해부해 보여준다.
  function showInsight() {
    if (!s.insight) return;
    const card = document.createElement("div");
    card.className = "insight-card";
    const f = labeledBlock("공식", s.insight.formula);
    f.querySelector(".block-body").classList.add("formula");
    card.appendChild(f);
    card.appendChild(labeledBlock("왜 이 구조인가", s.insight.why));
    const w = labeledBlock("이렇게 쓰면 비문", s.insight.wrong);
    w.querySelector(".block-body").classList.add("wrong-example");
    card.appendChild(w);
    card.appendChild(labeledBlock("자연스러운 해석", s.insight.natural));
    sentEl.insertAdjacentElement("afterend", card);
  }

  function showNextButton() {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.type = "button";
    btn.textContent = "다음 문장 →";
    btn.addEventListener("click", () => {
      const r = session.solve();
      if (r.switched) showSwitchModal(r.category);
      else renderSentence();
    });
    el.controls.appendChild(btn);
  }
}

// 카테고리 전환 모달 - MAX_SESSION_COUNT 완주 축하 + 다음 패턴 안내.
function showSwitchModal(nextCat) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "switch-modal";

  const msg = document.createElement("div");
  msg.className = "modal-msg";
  msg.textContent = `축하합니다! 해당 패턴 ${MAX_SESSION_COUNT}문장 집중 훈련을 완료했습니다. 다음 문법 패턴으로 뇌를 전환합니다.`;

  const next = document.createElement("div");
  next.className = "modal-next";
  next.textContent = `다음 훈련 - ${nextCat.title}`;

  const ok = document.createElement("button");
  ok.className = "btn btn-primary";
  ok.type = "button";
  ok.textContent = "계속하기";
  ok.addEventListener("click", () => {
    backdrop.remove();
    renderIntro(); // 새 카테고리도 패턴 이해부터
  });

  modal.append(msg, next, ok);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}
