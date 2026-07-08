// 하이브리드 독해 - 몰입 리딩 + 끊어 읽기 직접 긋기·채점 + 코스 진행·전체 클리어.
// 순수 로직은 core(tokenize·course·chunking)에 위임하고, 여기서 DOM만 만진다.
import { tokenize, resolveTargets } from "./core/tokenize.js";
import { createCourse, courseProgress } from "./core/course.js";
import { chunkBoundaries, gradeSlashes } from "./core/chunking.js";
import { createStorage } from "../../../shared/storage.js";
import { registerServiceWorker } from "../../../shared/ui.js";

registerServiceWorker("/service-worker.js");

const store = createStorage("english-reading");

const el = {
  back: document.getElementById("nav-back"),
  title: document.getElementById("topbar-title"),
  vocab: document.getElementById("nav-vocab"),
  bar: document.getElementById("bar-fill"),
  stage: document.getElementById("stage"),
};

let course = null;
let popover = null; // 현재 열린 단어 뜻 말풍선(한 번에 하나)

// ── 상태 저장(기기 저장소) ──
const getDone = () => store.get("done", []); // 완독한 지문 id 배열
const getReads = () => store.get("reads", {}); // { passageId: 회독수 }
const getVocab = () => store.get("vocab", []); // [{ wordKey, word, meaning, sentence, passageId, passageTitle }]
const getSettings = () => ({ chunks: true, words: true, scope: true, ...(store.get("settings", {}) || {}) });

fetch("./src/data/passages.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then((data) => {
    course = createCourse(data.courses[0]);
    renderList();
  })
  .catch(() => {
    el.title.textContent = "오류";
    el.stage.innerHTML = '<p class="empty">지문을 불러오지 못했습니다.</p>';
  });

function setBar(ratio) { el.bar.style.width = `${Math.round(ratio * 100)}%`; }
function closePopover() { if (popover) { popover.remove(); popover = null; } }
function removeHint() { const h = document.getElementById("first-hint"); if (h) h.remove(); }

function setTop({ title, onBack, showVocab }) {
  el.title.textContent = title;
  el.back.onclick = onBack;
  el.vocab.style.display = showVocab ? "" : "none";
  el.vocab.onclick = renderVocab;
}

function labeledBlock(label, text, mod) {
  const wrap = document.createElement("div"); wrap.className = "block";
  const l = document.createElement("div"); l.className = "block-label"; l.textContent = label;
  const b = document.createElement("div"); b.className = "block-body"; b.textContent = text;
  if (mod) b.classList.add(mod);
  wrap.append(l, b);
  return wrap;
}

// ── 지문 목록 ──
function renderList() {
  closePopover();
  const done = getDone();
  const reads = getReads();
  const prog = courseProgress(course, done);
  setBar(prog.ratio);
  setTop({ title: course.title, onBack: () => (window.location.href = "../../"), showVocab: true });

  const stage = el.stage;
  stage.className = "stage list-stage";
  stage.innerHTML = "";

  // 코스 전체 클리어 상태면 상단 배너(개별 완독엔 연출 없음)
  if (prog.cleared) {
    const clr = document.createElement("div");
    clr.className = "clear-banner";
    clr.innerHTML = `<div class="clear-title">🎉 코스 클리어</div><div class="clear-sub">${course.title} 전체 완독을 마쳤습니다.</div>`;
    stage.appendChild(clr);
  }

  const summary = document.createElement("div");
  summary.className = "list-summary";
  summary.innerHTML = `<b>${prog.done} / ${prog.total}편</b> 완독 · 수집 단어 ${getVocab().length}개`;
  stage.appendChild(summary);

  const list = document.createElement("div");
  list.className = "passage-list";
  course.passages.forEach((p) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "passage-card";
    const r = reads[p.id] || 0;
    const isDone = done.includes(p.id);
    const status = isDone ? `완독 ✓${r > 1 ? ` · ${r}회독` : ""}` : (r > 0 ? "읽는 중" : "아직 안 읽음");
    card.innerHTML =
      `<span class="lv">Lv ${p.level}</span>` +
      `<span class="pc-body"><span class="pc-title">${p.titleKr}</span><span class="pc-en">${p.title}</span></span>` +
      `<span class="pc-status${isDone ? " done" : ""}">${status}</span>`;
    card.onclick = () => renderReading(p);
    list.appendChild(card);
  });
  stage.appendChild(list);

  const setBtn = document.createElement("button");
  setBtn.type = "button";
  setBtn.className = "text-btn settings-open";
  setBtn.textContent = "노출 설정";
  setBtn.onclick = openSettings;
  stage.appendChild(setBtn);
}

// ── 읽기 화면 ──
function renderReading(p) {
  closePopover();
  const reads = getReads();
  const isRevisit = (reads[p.id] || 0) >= 1;
  const settings = getSettings();
  setBar(courseProgress(course, getDone()).ratio);
  setTop({ title: p.titleKr, onBack: renderList, showVocab: true });

  const stage = el.stage;
  stage.className = "stage reading-stage";
  stage.innerHTML = "";

  // 첫 진입 1회 안내 - 첫 상호작용 시 사라지고 다시 나타나지 않음
  if (!store.get("seenIntro", false)) {
    const hint = document.createElement("div");
    hint.className = "first-hint";
    hint.id = "first-hint";
    hint.textContent = "단어 사이 틈을 눌러 끊어 읽기 선(/)을 긋고, 문장 끝 [해석]으로 채점해 보세요. 모르는 단어는 단어를 누르면 뜻이 열립니다.";
    stage.appendChild(hint);
    store.set("seenIntro", true);
  }

  // 재독이면 이미 수집한 단어를 본문에 옅게 표시(지난번 막혔던 단어 알아보기)
  const known = isRevisit ? new Set(getVocab().map((v) => v.wordKey)) : null;

  const article = document.createElement("div");
  article.className = "article";
  p.sentences.forEach((s) => article.appendChild(renderSentence(s, p, settings, known)));
  stage.appendChild(article);
  // 본문 빈 곳 클릭 → 열린 뜻 말풍선 닫기(단어·틈 클릭은 전파를 끊는다)
  stage.addEventListener("click", closePopover);

  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.className = "btn btn-primary read-done";
  doneBtn.textContent = "읽기 완료";
  doneBtn.onclick = () => markRead(p);
  stage.appendChild(doneBtn);
}

function renderSentence(s, passage, settings, known) {
  const block = document.createElement("div");
  block.className = "sentence-block";

  const line = document.createElement("div");
  line.className = "sentence-line";

  const tokens = tokenize(s.text);
  const targets = resolveTargets(tokens, settings.words ? (s.words || []) : []);
  const targetByIndex = new Map(targets.filter((t) => t.index >= 0).map((t) => [t.index, t]));

  // 끊어 읽기 긋기 상태 - 검토 전까지 자유 토글, 검토 후 잠금
  const slashes = new Set();
  let reviewed = false;
  const gapEls = new Map(); // 틈 번호 → 요소

  tokens.forEach((tok, i) => {
    const span = document.createElement("span");
    span.textContent = tok.raw;
    if (targetByIndex.has(tok.index)) {
      span.className = "w key";
      const target = targetByIndex.get(tok.index);
      span.onclick = (e) => {
        e.stopPropagation(); // 단어 클릭이 다른 동작으로 번지지 않게
        removeHint();
        openWordPopover(span, target, s, passage);
      };
    } else {
      span.className = "w";
    }
    // 재독 시 이미 수집한 단어는 옅게 표시(지난번 막혔던 단어 알아보기)
    if (known && known.has(tok.clean)) span.classList.add("known");
    line.appendChild(span);

    // 단어 사이 틈 - 누르면 / 선 토글(마지막 단어 뒤는 제외)
    if (i < tokens.length - 1) {
      if (settings.chunks) {
        const gap = document.createElement("button");
        gap.type = "button";
        gap.className = "gap";
        gap.setAttribute("aria-label", "끊어 읽기 선 긋기");
        gap.onclick = (e) => {
          e.stopPropagation();
          if (reviewed) return;
          removeHint();
          closePopover();
          if (slashes.has(i)) { slashes.delete(i); gap.classList.remove("slashed"); }
          else { slashes.add(i); gap.classList.add("slashed"); }
        };
        gapEls.set(i, gap);
        line.appendChild(gap);
      } else {
        line.appendChild(document.createTextNode(" "));
      }
    }
  });

  // 문장 끝 "/ 검토" - 첫 클릭은 채점 + 해설 공개, 이후 클릭마다 해설 접힘/펼침 토글.
  // 채점 결과(선 색)와 잠금은 유지된다 - 접어도 채점이 무르지 않는다.
  if (settings.chunks) {
    const reviewBtn = document.createElement("button");
    reviewBtn.type = "button";
    reviewBtn.className = "review-btn";
    reviewBtn.textContent = "해석";
    let detail = null;
    reviewBtn.onclick = (e) => {
      e.stopPropagation();
      removeHint();
      closePopover();
      if (reviewed) {
        if (detail) detail.hidden = !detail.hidden;
        return;
      }
      reviewed = true;

      const grade = gradeSlashes(chunkBoundaries(tokens, s.chunks), slashes);
      grade.correct.forEach((g) => gapEls.get(g) && gapEls.get(g).classList.add("g-correct"));
      grade.wrong.forEach((g) => gapEls.get(g) && gapEls.get(g).classList.add("g-wrong"));
      grade.missed.forEach((g) => gapEls.get(g) && gapEls.get(g).classList.add("slashed", "g-missed"));

      detail = document.createElement("div");
      detail.className = "review-detail";
      detail.appendChild(buildChunks(s));
      if (s.grammar && s.grammar.length) detail.appendChild(buildGrammar(s));
      if (s.insight && settings.scope) detail.appendChild(buildScopeCard(s));
      block.appendChild(detail);
    };
    line.appendChild(reviewBtn);
  }

  block.appendChild(line);
  return block;
}

function openWordPopover(span, target, s, passage) {
  closePopover();
  const pop = document.createElement("span");
  pop.className = "word-pop";
  pop.textContent = target.meaning;
  span.appendChild(pop);
  popover = pop;
  collectWord(target, s, passage);
}

// 단어 + 뜻 + 방금 읽던 원문 문장 + 출처를 묶어 단어장에 자동 저장(중복은 쌓지 않음)
function collectWord(target, s, passage) {
  const vocab = getVocab();
  const key = String(target.word).toLowerCase().replace(/[^a-z']/g, "");
  if (vocab.some((v) => v.wordKey === key)) return;
  vocab.push({
    wordKey: key,
    word: target.word,
    meaning: target.meaning,
    sentence: s.text,
    passageId: passage.id,
    passageTitle: passage.titleKr,
  });
  store.set("vocab", vocab);
}

// 검토 후 공개되는 끊어 읽기 해석 (영-한 쌍, 위→아래 슬라이드)
function buildChunks(s) {
  const host = document.createElement("div");
  host.className = "chunks";
  s.chunks.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "chunk";
    row.style.animationDelay = `${i * 0.08}s`;
    const en = document.createElement("div"); en.className = "chunk-en"; en.textContent = c.en;
    const kr = document.createElement("div"); kr.className = "chunk-kr"; kr.textContent = c.kr;
    row.append(en, kr);
    host.appendChild(row);
  });
  return host;
}

// 검토 후 공개되는 문법 목록 - 이 문장에 포함된 모든 문법 요소(이름표 + 한 줄 설명)
function buildGrammar(s) {
  const host = document.createElement("div");
  host.className = "grammar-list";
  s.grammar.forEach((g) => {
    const row = document.createElement("div");
    row.className = "grammar-row";
    const tag = document.createElement("span"); tag.className = "grammar-tag"; tag.textContent = g.label;
    const note = document.createElement("span"); note.className = "grammar-note"; note.textContent = g.note;
    row.append(tag, note);
    host.appendChild(row);
  });
  return host;
}

// 구조가 특히 어려운 문장의 심화 해설 카드(설정 ON일 때 검토 후 함께 공개)
function buildScopeCard(s) {
  const card = document.createElement("div");
  card.className = "scope-card";
  card.appendChild(labeledBlock("공식", s.insight.formula, "formula"));
  card.appendChild(labeledBlock("왜 이 구조인가", s.insight.why));
  card.appendChild(labeledBlock("이렇게 쓰면 비문", s.insight.wrong, "wrong-example"));
  card.appendChild(labeledBlock("자연스러운 해석", s.insight.natural));
  return card;
}

// 읽기 완료 - 개별 완독은 조용히 진행률만 채우고, 코스 전체 완주에서만 클리어 연출
function markRead(p) {
  const done = getDone();
  const wasCleared = courseProgress(course, done).cleared;
  const reads = getReads();
  reads[p.id] = (reads[p.id] || 0) + 1;
  store.set("reads", reads);
  if (!done.includes(p.id)) { done.push(p.id); store.set("done", done); }
  const prog = courseProgress(course, done);
  if (prog.cleared && !wasCleared) showClearModal();
  else renderList();
}

function showClearModal() {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "app-modal";
  modal.innerHTML =
    `<div class="modal-badge">🎉</div>` +
    `<div class="modal-msg">코스 클리어</div>` +
    `<div class="modal-sub">${course.title}의 모든 지문을 완독했습니다. 이제 노출 설정에서 도움을 끄고 다시 읽으며 스스로 읽어내는 데 도전해 보세요.</div>`;
  const ok = document.createElement("button");
  ok.type = "button"; ok.className = "btn btn-primary"; ok.textContent = "확인";
  ok.onclick = () => { backdrop.remove(); renderList(); };
  modal.appendChild(ok);
  backdrop.appendChild(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) { backdrop.remove(); renderList(); } });
  document.body.appendChild(backdrop);
}

// ── 내 단어장 ──
function renderVocab() {
  closePopover();
  setTop({ title: "내 단어장", onBack: renderList, showVocab: false });
  const stage = el.stage;
  stage.className = "stage vocab-stage";
  stage.innerHTML = "";

  const vocab = getVocab();
  if (vocab.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "아직 수집한 단어가 없습니다. 지문을 읽다가 모르는 단어를 누르면 여기에 쌓입니다.";
    stage.appendChild(empty);
    return;
  }

  const head = document.createElement("div");
  head.className = "list-summary";
  head.innerHTML = `<b>${vocab.length}개</b> 수집 · 단어를 눌러 뜻과 예문 확인`;
  stage.appendChild(head);

  const listEl = document.createElement("div");
  listEl.className = "vocab-list";
  vocab.forEach((v) => {
    const item = document.createElement("div");
    item.className = "vocab-item";

    const row = document.createElement("div");
    row.className = "vocab-row";
    const word = document.createElement("button");
    word.type = "button"; word.className = "vocab-word"; word.textContent = v.word;
    const del = document.createElement("button");
    del.type = "button"; del.className = "vocab-del"; del.textContent = "✕"; del.setAttribute("aria-label", "단어 삭제");
    row.append(word, del);

    const detail = document.createElement("div");
    detail.className = "vocab-detail"; detail.hidden = true;
    detail.innerHTML =
      `<div class="vd-mean">${v.meaning}</div>` +
      `<div class="vd-ex">${v.sentence}</div>` +
      `<div class="vd-src">${v.passageTitle}</div>`;

    word.onclick = () => { detail.hidden = !detail.hidden; }; // 뜻 먼저 떠올려 보고 확인
    del.onclick = () => {
      store.set("vocab", getVocab().filter((x) => x.wordKey !== v.wordKey));
      renderVocab();
    };

    item.append(row, detail);
    listEl.appendChild(item);
  });
  stage.appendChild(listEl);
}

// ── 노출 설정 ──
function openSettings() {
  const s = getSettings();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "app-modal settings-modal";

  const title = document.createElement("div");
  title.className = "modal-msg"; title.textContent = "노출 설정";
  const desc = document.createElement("div");
  desc.className = "modal-sub";
  desc.textContent = "도움을 얼마나 드러낼지 직접 정합니다. 익숙해지면 하나씩 꺼 스스로 읽어 보세요.";
  modal.append(title, desc);

  const opts = [
    ["chunks", "끊어 읽기 긋기 · 해석 채점"],
    ["words", "단어 뜻 보기 · 수집"],
    ["scope", "검토 후 구조 심화 해설"],
  ];
  const toggles = {};
  opts.forEach(([key, label]) => {
    const rowL = document.createElement("label");
    rowL.className = "toggle-row";
    const span = document.createElement("span"); span.textContent = label;
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = !!s[key];
    toggles[key] = cb;
    rowL.append(span, cb);
    modal.appendChild(rowL);
  });

  const ok = document.createElement("button");
  ok.type = "button"; ok.className = "btn btn-primary"; ok.textContent = "저장";
  ok.onclick = () => {
    store.set("settings", {
      chunks: toggles.chunks.checked,
      words: toggles.words.checked,
      scope: toggles.scope.checked,
    });
    backdrop.remove();
    renderList();
  };
  modal.appendChild(ok);
  backdrop.appendChild(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);
}
