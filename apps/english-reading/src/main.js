// 하이브리드 독해 - 몰입 리딩 + 선택적 끊어읽기/뜻/구조해설 + 코스 진행·전체 클리어.
// 순수 로직은 core(tokenize·course)에 위임하고, 여기서 DOM만 만진다.
import { tokenize, resolveTargets } from "./core/tokenize.js";
import { createCourse, courseProgress } from "./core/course.js";
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
    hint.textContent = "막히는 문장이나 단어를 눌러 보세요. 끊어 읽기·뜻·구조 해설이 열립니다.";
    stage.appendChild(hint);
    store.set("seenIntro", true);
  }

  // 재독이면 이미 수집한 단어를 본문에 옅게 표시(지난번 막혔던 단어 알아보기)
  const known = isRevisit ? new Set(getVocab().map((v) => v.wordKey)) : null;

  const article = document.createElement("div");
  article.className = "article";
  p.sentences.forEach((s) => article.appendChild(renderSentence(s, p, settings, known)));
  stage.appendChild(article);

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

  tokens.forEach((tok) => {
    const span = document.createElement("span");
    span.textContent = tok.raw;
    if (targetByIndex.has(tok.index)) {
      span.className = "w key";
      const target = targetByIndex.get(tok.index);
      span.onclick = (e) => {
        e.stopPropagation(); // 단어 클릭이 문장(끊어읽기)으로 번지지 않게
        removeHint();
        openWordPopover(span, target, s, passage);
      };
    } else {
      span.className = "w";
    }
    // 재독 시 이미 수집한 단어는 점선 단어든 일반 단어든 옅게 표시(지난번 막혔던 단어 알아보기)
    if (known && known.has(tok.clean)) span.classList.add("known");
    line.appendChild(span);
    line.appendChild(document.createTextNode(" "));
  });

  // 문장 끝 🔬 - 구조 해설(어려운 문장 + 설정 ON일 때만)
  if (s.insight && settings.scope) {
    const scope = document.createElement("button");
    scope.type = "button";
    scope.className = "scope-btn";
    scope.textContent = "🔬";
    scope.setAttribute("aria-label", "구조 해설 보기");
    scope.onclick = (e) => {
      e.stopPropagation();
      removeHint();
      toggleScope(block, s);
    };
    line.appendChild(scope);
  }

  block.appendChild(line);

  // 문장(단어 외 영역) 클릭 → 끊어 읽기 토글(설정 ON일 때만)
  if (settings.chunks) {
    line.classList.add("clickable");
    line.addEventListener("click", () => {
      // 뜻 말풍선이 떠 있으면 이 클릭은 닫기에만 쓰고 끊어읽기는 열지 않는다(기획 5.2 충돌 해소)
      if (popover) { closePopover(); return; }
      removeHint();
      toggleChunks(block, s);
    });
  }

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

function toggleChunks(block, s) {
  const exist = block.querySelector(".chunks");
  if (exist) { exist.remove(); return; }
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
  block.appendChild(host);
}

function toggleScope(block, s) {
  const exist = block.querySelector(".scope-card");
  if (exist) { exist.remove(); return; }
  const card = document.createElement("div");
  card.className = "scope-card";
  card.appendChild(labeledBlock("공식", s.insight.formula, "formula"));
  card.appendChild(labeledBlock("왜 이 구조인가", s.insight.why));
  card.appendChild(labeledBlock("이렇게 쓰면 비문", s.insight.wrong, "wrong-example"));
  card.appendChild(labeledBlock("자연스러운 해석", s.insight.natural));
  block.appendChild(card);
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
    ["chunks", "문장 클릭 끊어 읽기"],
    ["words", "단어 뜻 보기 · 수집"],
    ["scope", "🔬 구조 해설"],
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
