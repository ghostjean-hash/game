// 하이브리드 독해 - 몰입 리딩 + 끊어 읽기 직접 긋기·채점 + 코스 진행·전체 클리어.
// 순수 로직은 core(tokenize·course·chunking)에 위임하고, 여기서 DOM만 만진다.
import { tokenize } from "./core/tokenize.js";
import { createCourse, courseProgress } from "./core/course.js";
import { chunkBoundaries, gradeSlashes, chunkReasons } from "./core/chunking.js";
import { validatePassage } from "./core/validate.js";
import { createStorage } from "../../../shared/storage.js";
import { registerServiceWorker } from "../../../shared/ui.js";

registerServiceWorker("/service-worker.js");

const store = createStorage("english-reading");

const el = {
  back: document.getElementById("nav-back"),
  title: document.getElementById("topbar-title"),
  guide: document.getElementById("nav-guide"),
  vocab: document.getElementById("nav-vocab"),
  bar: document.getElementById("bar-fill"),
  stage: document.getElementById("stage"),
};

let course = null;
let baseData = null; // passages.json 원본(기본 지문)
let currentPassage = null; // 지금 읽는 지문 - 단어장 등에서 돌아올 대상
let toastTimer = null; // 토스트 자동 닫힘 타이머
const TOAST_MS = 1600; // 토스트가 스스로 사라지기까지

// ── 상태 저장(기기 저장소) ──
const getDone = () => store.get("done", []); // 완독한 지문 id 배열
const getReads = () => store.get("reads", {}); // { passageId: 회독수 }
const getVocab = () => store.get("vocab", []); // [{ wordKey, word, meaning, sentence, passageId, passageTitle }]
const getSettings = () => ({ chunks: true, words: true, scope: true, ...(store.get("settings", {}) || {}) });

// ── 내가 만든 문제(기기 저장) ── LLM으로 만든 지문을 검증 후 이 목록에 담아 기본 지문과 합쳐 읽는다.
const getCustomPassages = () => store.get("customPassages", []);
function isCustom(pid) { return getCustomPassages().some((p) => p.id === pid); }
// 기본 지문 + 내가 만든 문제를 합쳐 코스를 다시 만든다(추가·삭제 후 호출).
function rebuildCourse() {
  const base = baseData.courses[0];
  course = createCourse({ ...base, passages: [...base.passages, ...getCustomPassages()] });
}

// ── 읽기 진행 저장(기기 저장소) ── 지문별 문장 상태(그은 선·임시 단어·검토 여부)를 담아,
// 단어장을 갔다 오거나 앱을 껐다 켜도 읽던 자리와 표시가 그대로 복원되게 한다.
const getProgress = () => store.get("progress", {});
function saveSentenceState(pid, si, st) {
  const prog = getProgress();
  if (!prog[pid]) prog[pid] = { sentences: [] };
  prog[pid].sentences[si] = st;
  store.set("progress", prog);
}
function loadSentenceState(pid, si) {
  const prog = getProgress();
  return (prog[pid] && prog[pid].sentences && prog[pid].sentences[si]) || null;
}
function clearPassageProgress(pid) {
  const prog = getProgress();
  if (prog[pid]) { delete prog[pid]; store.set("progress", prog); }
}

fetch("./src/data/passages.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then((data) => {
    baseData = data;
    rebuildCourse();
    renderList();
  })
  .catch(() => {
    el.title.textContent = "오류";
    el.stage.innerHTML = '<p class="empty">지문을 불러오지 못했습니다.</p>';
  });

function setBar(ratio) { el.bar.style.width = `${Math.round(ratio * 100)}%`; }
// 화면 하단에 잠깐 뜨는 안내 메시지(임시 수집·회독 완료 등)
function showToast(msg) {
  let t = document.getElementById("app-toast");
  if (!t) { t = document.createElement("div"); t.id = "app-toast"; t.className = "app-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add("show"));
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), TOAST_MS);
}
function removeHint() { const h = document.getElementById("first-hint"); if (h) h.remove(); }
// 텍스트를 클립보드로 복사(안 되는 환경이면 안내만)
function copyText(text, okMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(okMsg)).catch(() => showToast("복사가 안 됩니다. 칸을 눌러 직접 선택·복사하세요."));
  } else {
    showToast("복사가 안 됩니다. 칸을 눌러 직접 선택·복사하세요.");
  }
}

function setTop({ title, onBack, showVocab, showGuide }) {
  el.title.textContent = title;
  el.back.onclick = onBack;
  el.vocab.style.display = showVocab ? "" : "none";
  el.vocab.onclick = renderVocab;
  el.guide.style.display = showGuide ? "" : "none";
  el.guide.onclick = openGuide;
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
  currentPassage = null; // 목록으로 나오면 '읽던 지문' 해제(단어장 백은 목록으로)
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

  const progress = getProgress();
  const customIds = new Set(getCustomPassages().map((p) => p.id));
  const list = document.createElement("div");
  list.className = "passage-list";
  course.passages.forEach((p) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "passage-card";
    const r = reads[p.id] || 0;
    const isDone = done.includes(p.id);
    const inProgress = !!progress[p.id]; // 저장된 진행이 있으면 첫 회독 중이어도 '읽는 중'
    const status = isDone ? `완독 ✓${r > 1 ? ` · ${r}회독` : ""}` : ((r > 0 || inProgress) ? "읽는 중" : "아직 안 읽음");
    card.innerHTML =
      `<span class="lv">Lv ${p.level}</span>` +
      `<span class="pc-body"><span class="pc-title">${p.titleKr}${customIds.has(p.id) ? ' <span class="mine-badge">내 문제</span>' : ""}</span><span class="pc-en">${p.title}</span></span>` +
      `<span class="pc-status${isDone ? " done" : ""}">${status}</span>`;
    card.onclick = () => renderReading(p);
    list.appendChild(card);
  });
  stage.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "list-actions";
  const setBtn = document.createElement("button");
  setBtn.type = "button";
  setBtn.className = "text-btn settings-open";
  setBtn.textContent = "노출 설정";
  setBtn.onclick = openSettings;
  const authorBtn = document.createElement("button");
  authorBtn.type = "button";
  authorBtn.className = "text-btn";
  authorBtn.textContent = "문제 출제";
  authorBtn.onclick = renderAuthor;
  actions.append(setBtn, authorBtn);
  stage.appendChild(actions);
}

// ── 읽기 화면 ──
function renderReading(p) {
  currentPassage = p; // 단어장에서 이 지문으로 돌아온다
  store.set("lastPassage", p.id); // 앱 재시작 시 '이어읽기' 대상
  const settings = getSettings();
  setBar(courseProgress(course, getDone()).ratio);
  setTop({ title: p.titleKr, onBack: renderList, showVocab: true, showGuide: settings.chunks });

  const stage = el.stage;
  stage.className = "stage reading-stage";
  stage.innerHTML = "";

  // 첫 진입 1회 안내 - 첫 상호작용 시 사라지고 다시 나타나지 않음
  if (!store.get("seenIntro", false)) {
    const hint = document.createElement("div");
    hint.className = "first-hint";
    hint.id = "first-hint";
    hint.textContent = "단어 사이 틈을 눌러 끊어 읽기 선(/)을 긋고, 문장 끝 [해석]으로 채점해 보세요. 모르는 단어는 눌러 표시만 해 두면, 해석할 때 뜻을 한꺼번에 확인합니다.";
    stage.appendChild(hint);
    store.set("seenIntro", true);
  }

  const article = document.createElement("div");
  article.className = "article";
  p.sentences.forEach((s, i) => article.appendChild(renderSentence(s, i, p, settings)));
  stage.appendChild(article);

  // 다회독 루프 - 회독을 마칠 때마다 같은 지문을 새 마음으로 다시 읽도록 유도
  const nextRound = (getReads()[p.id] || 0) + 1;
  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.className = "btn btn-primary read-done";
  doneBtn.textContent = `${nextRound}회독 완료`;
  doneBtn.onclick = () => finishRound(p);
  stage.appendChild(doneBtn);
}

function renderSentence(s, sIndex, passage, settings) {
  const block = document.createElement("div");
  block.className = "sentence-block";

  const line = document.createElement("div");
  line.className = "sentence-line";

  const tokens = tokenize(s.text);
  // 뜻 힌트 맵 - 데이터에 뜻을 넣어둔 단어는 해석 시 뜻까지 보여준다(없으면 뜻은 비운 채 단어만 담는다).
  // 어떤 단어를 모르는지는 학습자가 정하므로, 특정 단어만 클릭 가능하게 제한하지 않는다.
  const meaningByClean = new Map();
  if (settings.words) (s.words || []).forEach((w) => {
    const k = String(w.word).toLowerCase().replace(/[^a-z']/g, "");
    if (k && !meaningByClean.has(k)) meaningByClean.set(k, w.meaning);
  });

  // 저장된 진행 복원 - 그은 선·임시 단어·검토 여부를 기기 저장소에서 되살린다.
  const saved = loadSentenceState(passage.id, sIndex) || {};
  const slashes = new Set(saved.slashes || []);
  const flagged = new Map((saved.flags || []).map(([i, word, meaning]) => [i, { word, meaning }]));
  let reviewed = !!saved.reviewed;
  const gapEls = new Map(); // 틈 번호 → 요소

  const persist = () => saveSentenceState(passage.id, sIndex, {
    slashes: [...slashes],
    flags: [...flagged].map(([i, v]) => [i, v.word, v.meaning]),
    reviewed,
  });

  const applyGrade = () => {
    const grade = gradeSlashes(chunkBoundaries(tokens, s.chunks), slashes);
    grade.correct.forEach((g) => gapEls.get(g) && gapEls.get(g).classList.add("g-correct"));
    grade.wrong.forEach((g) => gapEls.get(g) && gapEls.get(g).classList.add("g-wrong"));
    grade.missed.forEach((g) => gapEls.get(g) && gapEls.get(g).classList.add("slashed", "g-missed"));
  };
  const buildDetail = () => {
    const d = document.createElement("div");
    d.className = "review-detail";
    d.appendChild(buildChunks(s)); // 번역(끊어 읽기 해석)
    // 후(後) 확인: 이 문장에서 임시 수집한 단어들의 뜻을 번역 바로 아래에 공개 + 영구 저장(중복은 무시)
    if (flagged.size) d.appendChild(buildCollectedWords([...flagged.values()], s, passage));
    if (s.grammar && s.grammar.length) d.appendChild(buildGrammar(s));
    if (s.insight && settings.scope) d.appendChild(buildScopeCard(s));
    return d;
  };

  tokens.forEach((tok, i) => {
    const span = document.createElement("span");
    span.textContent = tok.raw;
    span.className = "w";
    // 뜻이 등록된 주요 단어만 터치 대상 - 일반 단어까지 터치되면 끊기 틈과 오터치가 잦아 제한(사용자 지시).
    if (settings.words && tok.clean && meaningByClean.has(tok.clean)) {
      span.classList.add("word");
      if (flagged.has(i)) span.classList.add("flagged"); // 복원
      const displayWord = tok.raw.replace(/^[^A-Za-z'-]+|[^A-Za-z'-]+$/g, "") || tok.clean;
      // 선(先) 유추: 터치해도 뜻을 바로 열지 않고 '임시 수집'으로만 표시한다.
      span.onclick = (e) => {
        e.stopPropagation();
        removeHint();
        if (reviewed) return; // 해석 후엔 뜻이 이미 공개돼 표시가 의미 없다
        if (flagged.has(i)) {
          flagged.delete(i);
          span.classList.remove("flagged");
        } else {
          flagged.set(i, { word: displayWord, meaning: meaningByClean.get(tok.clean) || "" });
          span.classList.add("flagged");
          showToast("단어장에 임시 저장되었습니다.");
        }
        persist();
      };
    }
    line.appendChild(span);

    // 단어 사이 틈 - 누르면 / 선 토글(마지막 단어 뒤는 제외)
    if (i < tokens.length - 1) {
      if (settings.chunks) {
        const gap = document.createElement("button");
        gap.type = "button";
        gap.className = "gap";
        gap.setAttribute("aria-label", "끊어 읽기 선 긋기");
        if (slashes.has(i)) gap.classList.add("slashed"); // 복원
        gap.onclick = (e) => {
          e.stopPropagation();
          if (reviewed) return;
          removeHint();
          if (slashes.has(i)) { slashes.delete(i); gap.classList.remove("slashed"); }
          else { slashes.add(i); gap.classList.add("slashed"); }
          persist();
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
  let detail = null;
  if (settings.chunks) {
    const reviewBtn = document.createElement("button");
    reviewBtn.type = "button";
    reviewBtn.className = "review-btn";
    reviewBtn.textContent = "해석";
    reviewBtn.onclick = (e) => {
      e.stopPropagation();
      removeHint();
      if (reviewed) {
        if (detail) detail.hidden = !detail.hidden;
        return;
      }
      reviewed = true;
      applyGrade();
      detail = buildDetail();
      block.appendChild(detail);
      persist();
    };
    line.appendChild(reviewBtn);
  }

  block.appendChild(line);

  // 이미 검토를 마친 문장이면(복원) 채점 색과 해설을 펼친 상태로 되살린다.
  if (reviewed && settings.chunks) {
    applyGrade();
    detail = buildDetail();
    block.appendChild(detail);
  }

  return block;
}

// 해석 시점에 열리는 "이 문장에서 담은 단어" 리스트 - 뜻을 한꺼번에 공개하고 영구 단어장에 누적한다.
function buildCollectedWords(targets, s, passage) {
  const host = document.createElement("div");
  host.className = "collected-words";
  const head = document.createElement("div");
  head.className = "cw-head";
  head.textContent = "이 문장에서 담은 단어";
  host.appendChild(head);
  targets.forEach((t) => {
    collectWord(t, s, passage); // 이 시점에 '내 단어장'으로 영구 저장
    const row = document.createElement("div");
    row.className = "cw-row";
    const w = document.createElement("span"); w.className = "cw-word"; w.textContent = t.word;
    const m = document.createElement("span"); m.className = "cw-mean";
    if (t.meaning) { m.textContent = t.meaning; }
    else { m.textContent = "뜻 미등록 - 직접 채워 보세요"; m.classList.add("cw-empty"); }
    row.append(w, m);
    host.appendChild(row);
  });
  return host;
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

// 검토 후 공개되는 끊어 읽기 해석 (영-한 쌍, 위→아래 슬라이드).
// 둘째 덩어리부터 "왜 이 앞에서 끊는가" 이유 태그를 붙인다(경계 학습의 핵심).
function buildChunks(s) {
  const host = document.createElement("div");
  host.className = "chunks";
  const reasons = chunkReasons(tokenize(s.text), s.chunks);
  s.chunks.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "chunk";
    row.style.animationDelay = `${i * 0.08}s`;
    const en = document.createElement("div"); en.className = "chunk-en"; en.textContent = c.en;
    if (i > 0 && reasons[i]) {
      const why = document.createElement("span");
      why.className = "chunk-why";
      why.textContent = reasons[i];
      en.appendChild(why);
    }
    const kr = document.createElement("div"); kr.className = "chunk-kr"; kr.textContent = c.kr;
    row.append(en, kr);
    host.appendChild(row);
  });
  return host;
}

// 끊는 기준 커닝페이퍼 - 상단바 버튼으로 언제든 오버레이로 열어 보는 공용 참고 카드
function openGuide() {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "app-modal guide-modal";
  modal.appendChild(buildGuideCard());
  const ok = document.createElement("button");
  ok.type = "button"; ok.className = "btn btn-primary"; ok.textContent = "닫기";
  ok.onclick = () => backdrop.remove();
  modal.appendChild(ok);
  backdrop.appendChild(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);
}

// 끊는 기준 카드 - 다섯 자리 원칙 + 미니 예문
function buildGuideCard() {
  const card = document.createElement("div");
  card.className = "guide-card";
  const head = document.createElement("div");
  head.className = "guide-head";
  head.textContent = "어디서 끊나 - 새 의미 덩어리가 시작되는 곳 앞";
  card.appendChild(head);
  const rules = [
    ["접속사 앞", "that·because·when·once가 나오면 새 절 시작", "you feel / that everyone is staring"],
    ["관계대명사 앞", "명사 뒤의 who·that은 꾸밈절 시작", "facts / that support it"],
    ["긴 전치사구 앞", "at·on·from 덩어리가 길면 그 앞", "you feel ~ / at the stain"],
    ["긴 주어 뒤", "주어가 길면 동사 앞에서 한 번", "Knowing this trap / will not switch it off"],
    ["콤마 뒤", "글쓴이가 이미 끊어 준 자리", "All day long, / you feel ~"],
  ];
  rules.forEach(([label, desc, ex]) => {
    const row = document.createElement("div");
    row.className = "guide-row";
    const tag = document.createElement("span"); tag.className = "grammar-tag"; tag.textContent = label;
    const body = document.createElement("span"); body.className = "guide-desc";
    body.textContent = desc;
    const exEl = document.createElement("div"); exEl.className = "guide-ex"; exEl.textContent = ex;
    const right = document.createElement("span"); right.className = "guide-body";
    right.append(body, exEl);
    row.append(tag, right);
    card.appendChild(row);
  });
  return card;
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

// 회독 완료 - 회독수를 올리고 같은 지문을 clean slate(임시 하이라이트 리셋)로 다시 열어 반복 읽기를 유도.
// 개별 완독은 조용히 진행률만 채우고, 코스 전체 완주를 처음 달성할 때만 클리어 연출.
function finishRound(p) {
  const reads = getReads();
  const round = (reads[p.id] || 0) + 1;
  const done = getDone();
  const wasCleared = courseProgress(course, done).cleared;
  reads[p.id] = round;
  store.set("reads", reads);
  if (!done.includes(p.id)) { done.push(p.id); store.set("done", done); }
  clearPassageProgress(p.id); // 회독을 마쳤으니 이 지문의 그은 선·임시 단어를 비워 clean slate로(영구 단어장은 유지)
  const prog = courseProgress(course, done);
  if (prog.cleared && !wasCleared) { showClearModal(); return; }
  showToast(`${round}회독 완료! 새 마음으로 다시 읽어 보세요.`);
  renderReading(p); // 깨끗한 상태로 다시 그린다
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

// ── 문제 출제 (LLM으로 만든 지문을 검증해 내 문제로 추가) ──
// LLM에 그대로 붙여넣을 출제 규칙 - 양식·끊는 기준·예시를 담아 규칙 준수를 유도한다.
const AUTHORING_PROMPT = `너는 영어 독해 학습 앱의 문제 출제자다. 아래 [양식]과 [규칙]을 정확히 지켜, 지문 한 편을 JSON 하나로만 출력해라(설명·코드블록 없이 JSON만).

[양식]
{
  "id": "고유한-영문소문자-하이픈-이름",
  "level": 1,
  "title": "영어 제목",
  "titleKr": "한글 제목",
  "sentences": [
    {
      "text": "영어 원문 문장.",
      "chunks": [
        { "en": "끊어읽기 덩어리(영어)", "kr": "그 덩어리의 직독직해(한글)" }
      ],
      "grammar": [ { "label": "문법 이름표", "note": "한 줄 설명" } ],
      "words": [ { "word": "어려운 단어", "meaning": "한글 뜻" } ]
    }
  ]
}

[규칙]
1. chunks의 en을 공백으로 이어 붙이면 원문 text와 정확히 같아야 한다(구두점·대소문자만 예외).
2. 끊어읽기(chunks)는 잘게 쪼개지 말고 '의미 덩어리'로 크게 묶어라. 다음 자리는 절대 끊지 마라:
   - be동사·조동사 뒤 (예: "is the habit"은 한 덩어리. 단 뒤가 that절·to부정사면 끊어도 됨)
   - 짧은 주어(2단어 이하) 뒤에서 동사 앞
   - 짧은 전치사구(2단어 이하) 앞 (of noticing, at all 등)
   - 전치사와 그 목적어 사이 ("searches for | facts"처럼 끊지 마라)
   끊어도 되는 자리: 접속사·관계사·that·to 앞 / 콤마 뒤 / 긴 주어(3단어 이상) 뒤 동사 앞 / 긴 전치사구 앞.
3. kr은 의역이 아니라 어순·구조가 드러나는 직독직해로 써라.
4. grammar는 그 문장에 든 문법 요소를 1개 이상, 이름표(label)+한 줄 설명(note)으로.
5. words는 어려운 단어만 넣어라(없으면 []). word는 반드시 원문 text에 나온 형태 그대로 적어라 - 활용형(-s·-ed·-ing 등)을 원형으로 바꾸지 마라(원문이 "triggers"면 "trigger"가 아니라 "triggers", 원문이 "noticing"이면 "notice"가 아니라 "noticing"). meaning(뜻)에는 원형 뜻을 써도 된다.
6. insight는 구조가 특히 어려운 문장에만 넣어라(빼도 됨). 넣으면 formula·why·wrong·natural 4필드를 모두 채워라.
7. level은 난이도 숫자(1이 가장 쉬움). id는 다른 지문과 겹치지 않는 영문 이름.

[규칙을 지킨 올바른 예시]
{
  "id": "example-mind",
  "level": 1,
  "title": "A Small Example",
  "titleKr": "작은 예시",
  "sentences": [
    {
      "text": "Confirmation bias is the habit of noticing only what we already believe.",
      "chunks": [
        { "en": "Confirmation bias is the habit", "kr": "확증 편향은 습관이다" },
        { "en": "of noticing only what we already believe.", "kr": "우리가 이미 믿는 것만 알아채는" }
      ],
      "grammar": [
        { "label": "of + 동명사", "note": "the habit of noticing - '알아채는 습관'. of 뒤 동사는 -ing." }
      ],
      "words": [ { "word": "bias", "meaning": "편향, 치우침" } ]
    }
  ]
}

이제 주제를 "(원하는 주제를 여기에)"로 정해, 위 규칙을 지킨 지문 한 편을 JSON으로만 출력해라.`;

function renderAuthor() {
  currentPassage = null;
  setTop({ title: "문제 출제", onBack: renderList, showVocab: false });
  const stage = el.stage;
  stage.className = "stage author-stage";
  stage.innerHTML = "";

  const intro = document.createElement("p");
  intro.className = "author-intro";
  intro.textContent = "챗봇(LLM)에 아래 '출제 규칙'을 붙여넣어 문제를 만든 뒤, 그 결과(JSON)를 붙여넣고 검증하세요. 규칙을 어기면 어디가 틀렸는지 알려 드립니다.";
  stage.appendChild(intro);

  // 1. 출제 규칙 (복사해서 챗봇에)
  const rl = document.createElement("div"); rl.className = "author-label"; rl.textContent = "1. 출제 규칙 - 챗봇에 붙여넣기";
  const ruleTa = document.createElement("textarea");
  ruleTa.className = "author-rule"; ruleTa.readOnly = true; ruleTa.rows = 5; ruleTa.value = AUTHORING_PROMPT;
  const ruleCopy = document.createElement("button");
  ruleCopy.type = "button"; ruleCopy.className = "btn btn-primary author-btn";
  ruleCopy.textContent = "출제 규칙 복사";
  ruleCopy.onclick = () => copyText(AUTHORING_PROMPT, "출제 규칙을 복사했습니다. 챗봇에 붙여넣으세요.");
  stage.append(rl, ruleTa, ruleCopy);

  // 2. 결과 붙여넣기 + 검증
  const pl = document.createElement("div"); pl.className = "author-label"; pl.textContent = "2. 만들어진 문제(JSON) 붙여넣기";
  const input = document.createElement("textarea");
  input.className = "author-input"; input.rows = 8; input.placeholder = '{ "id": "...", "level": 1, "title": "...", ... }';
  const result = document.createElement("div"); result.className = "author-result"; result.hidden = true;
  const checkBtn = document.createElement("button");
  checkBtn.type = "button"; checkBtn.className = "btn author-btn author-check"; checkBtn.textContent = "검증하기";
  const addBtn = document.createElement("button");
  addBtn.type = "button"; addBtn.className = "btn btn-primary author-btn"; addBtn.textContent = "내 문제로 추가"; addBtn.hidden = true;
  let validObj = null;

  checkBtn.onclick = () => {
    addBtn.hidden = true; validObj = null;
    let obj;
    try { obj = JSON.parse(input.value); }
    catch (e) { showAuthorResult(result, false, [{ where: "형식", msg: "JSON 형식이 아닙니다. 챗봇이 JSON만 출력했는지 확인하세요." }]); return; }
    const res = validatePassage(obj);
    if (res.ok) {
      const dupBase = baseData.courses[0].passages.some((p) => p.id === obj.id);
      const dupMine = getCustomPassages().some((p) => p.id === obj.id);
      if (dupBase || dupMine) { showAuthorResult(result, false, [{ where: "id", msg: `"${obj.id}"와 같은 id의 지문이 이미 있습니다. id를 바꾸세요.` }]); return; }
      validObj = obj; addBtn.hidden = false;
    }
    showAuthorResult(result, res.ok, res.errors);
  };
  addBtn.onclick = () => {
    if (!validObj) return;
    const list = getCustomPassages();
    list.push(validObj);
    store.set("customPassages", list);
    rebuildCourse();
    showToast(`"${validObj.titleKr}"를 내 문제로 추가했습니다.`);
    renderAuthor();
  };
  stage.append(pl, input, checkBtn, result, addBtn);

  // 3. 이미 만든 내 문제 목록
  const mine = getCustomPassages();
  if (mine.length) {
    const ml = document.createElement("div"); ml.className = "author-label"; ml.textContent = `내가 만든 문제 (${mine.length}편)`;
    stage.appendChild(ml);
    const mlist = document.createElement("div"); mlist.className = "author-mine-list";
    mine.forEach((p) => {
      const row = document.createElement("div"); row.className = "author-mine-row";
      const t = document.createElement("span"); t.className = "amr-title"; t.textContent = `${p.titleKr} · Lv ${p.level}`;
      const exp = document.createElement("button");
      exp.type = "button"; exp.className = "amr-btn"; exp.textContent = "배포용 복사";
      exp.onclick = () => copyText(JSON.stringify(p, null, 2), "배포용 JSON을 복사했습니다. 자비스에게 주면 모두에게 배포합니다.");
      const del = document.createElement("button");
      del.type = "button"; del.className = "amr-btn amr-del"; del.textContent = "삭제";
      del.onclick = () => {
        store.set("customPassages", getCustomPassages().filter((x) => x.id !== p.id));
        clearPassageProgress(p.id);
        rebuildCourse();
        renderAuthor();
      };
      row.append(t, exp, del);
      mlist.appendChild(row);
    });
    stage.appendChild(mlist);
  }
}

// 검증 결과 표시 - 통과면 초록 한 줄, 위반이면 어디가 왜 틀렸는지 목록
function showAuthorResult(host, ok, errors) {
  host.hidden = false;
  host.className = `author-result ${ok ? "ok" : "bad"}`;
  host.innerHTML = "";
  if (ok) {
    host.textContent = "✓ 규칙을 모두 지켰습니다. '내 문제로 추가'를 누르세요.";
    return;
  }
  const h = document.createElement("div"); h.className = "ar-head"; h.textContent = `고칠 곳 ${errors.length}가지:`;
  host.appendChild(h);
  errors.forEach((e) => {
    const row = document.createElement("div"); row.className = "ar-row";
    const wh = document.createElement("span"); wh.className = "ar-where"; wh.textContent = e.where;
    const ms = document.createElement("span"); ms.className = "ar-msg"; ms.textContent = e.msg;
    row.append(wh, ms);
    host.appendChild(row);
  });
}

// ── 내 단어장 ──
function renderVocab() {
  // 읽던 지문에서 왔으면 그 지문으로 복귀(진행 유지), 목록에서 왔으면 목록으로
  const back = currentPassage ? () => renderReading(currentPassage) : renderList;
  setTop({ title: "내 단어장", onBack: back, showVocab: false });
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
      `<div class="vd-mean${v.meaning ? "" : " vd-empty"}">${v.meaning || "뜻 미등록 - 직접 채워 보세요"}</div>` +
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
