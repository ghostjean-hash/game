// 영어 단어장 - 화면 조립 + 이벤트(DOM). 순수 학습 로직은 core/deck.js.
// 저장은 shared/storage.js(localStorage, gg.english-vocabulary.*).

import { createStorage } from "../../../shared/storage.js";
import { showModal, showToast, registerServiceWorker } from "../../../shared/ui.js";
import { createDeck } from "./core/deck.js";
import { VIEW, initialCardView, resolveKey } from "./core/viewstate.js";

registerServiceWorker("/service-worker.js");

const store = createStorage("english-vocabulary");
const stage = document.getElementById("stage");
const backBtn = document.getElementById("nav-back");
const settingsBtn = document.getElementById("nav-settings");
const titleEl = document.getElementById("topbar-title");

const now = () => new Date().toISOString();

// --- 설정 ---
const DEFAULT_SETTINGS = {
  autoSpeak: false,     // 카드가 바뀔 때 자동 발음 (기본 OFF)
  showExample: true,    // 예문 표시
  showExampleKr: true,  // 예문 해석 표시
  shuffle: true,        // 한 바퀴 끝나면 순서 섞기
  fontScale: "normal",  // small | normal | large
};
let settings = { ...DEFAULT_SETTINGS, ...(store.get("settings") || {}) };

function saveSettings() {
  store.set("settings", settings);
  applyFontScale();
}
function applyFontScale() {
  document.body.dataset.fs = settings.fontScale;
}

// --- 발음 (SpeechSynthesis, 실패해도 학습은 계속) ---
function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
function speak(text) {
  if (!speechSupported() || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch {
    /* 음성 실패는 무시 - 학습 흐름을 막지 않는다 */
  }
}

// --- 아이콘 (버튼 아이콘은 인라인 SVG) ---
const SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICON = {
  speaker: `<svg ${SVG}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>`,
  undo: `<svg ${SVG}><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>`,
};

// --- 상태 ---
let deck = null;
let DATA = null;
let view = "home";
// 학습·복습 카드의 표시 단계(question=단어만 / answer=뜻 공개). 단어가 바뀔 때마다 question으로 초기화.
// 새로고침 복원 시에도 기본값 question이라 정답 공개 상태는 이어지지 않는다(편법 방지).
let cardView = initialCardView();

function buildDeck() {
  deck = createDeck(DATA, store.get("deck"), settings.shuffle ? Math.random : null);
}
function saveDeck() {
  store.set("deck", deck.serialize());
}

// --- 라우팅 ---
function go(next) {
  view = next;
  render();
}
// 뒤로 버튼은 화면마다 동작이 다르다(앱 홈에서는 허브로 나가고, 하위 화면에서는 앱 홈으로).
let backHandler = () => go("home");
function setTopbar(title, showBack, onBack) {
  titleEl.textContent = title;
  backBtn.hidden = !showBack;
  backHandler = onBack || (() => go("home"));
}
backBtn.addEventListener("click", () => backHandler());
settingsBtn.addEventListener("click", () => go("settings"));

function render() {
  stage.innerHTML = "";
  document.onkeydown = null;
  if (view === "home") renderHome();
  else if (view === "study") renderStudy();
  else if (view === "vault") renderVault();
  else if (view === "review") renderReview();
  else if (view === "complete") renderComplete();
  else if (view === "settings") renderSettings();
}

function fmtDate(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  } catch {
    return "-";
  }
}

function el(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html != null) e.innerHTML = html;
  return e;
}

// --- 홈 ---
function renderHome() {
  // 앱 홈에서는 뒤로 버튼이 허브(게임/앱 목록)로 나간다.
  setTopbar("영어 단어장", true, () => { window.location.href = "../../"; });
  const s = deck.stats();

  const home = el("div", "screen home");

  const hero = el("div", "hero");
  hero.appendChild(el("div", "hero-set", `SET ${s.setId.replace(/\D/g, "") || "01"} · ${DATA.title || ""}`));
  hero.appendChild(el("div", "hero-big", `${s.remaining}<span class="hero-unit">개 남음</span>`));
  const barWrap = el("div", "home-bar");
  barWrap.appendChild(el("div", "home-bar-fill")).style.width = `${s.percent}%`;
  hero.appendChild(barWrap);
  hero.appendChild(el("div", "hero-sub", `${s.start}개 중 ${s.learned}개 외움 · 완료율 ${s.percent}%`));
  home.appendChild(hero);

  const grid = el("div", "stat-grid");
  const stat = (label, val) => {
    const c = el("div", "stat-cell");
    c.appendChild(el("div", "stat-val", String(val)));
    c.appendChild(el("div", "stat-label", label));
    return c;
  };
  grid.appendChild(stat("시작 단어", s.start));
  grid.appendChild(stat("남은 단어", s.remaining));
  grid.appendChild(stat("외운 단어", s.learned));
  grid.appendChild(stat("마지막 학습", fmtDate(s.lastStudiedAt)));
  home.appendChild(grid);

  const actions = el("div", "home-actions");
  if (s.completed) {
    const done = el("div", "done-note", "🎉 이 세트의 단어를 모두 외웠습니다.");
    home.appendChild(done);
    const rb = el("button", "btn-xl btn-accent", "외운 단어 복습");
    rb.onclick = () => go("vault");
    actions.appendChild(rb);
    const restart = el("button", "btn-xl btn-ghost", "처음부터 다시");
    restart.onclick = confirmReset;
    actions.appendChild(restart);
  } else {
    const cont = el("button", "btn-xl btn-accent", s.learned === 0 && s.round === 1 ? "학습 시작" : "이어서 학습");
    cont.onclick = enterStudy;
    actions.appendChild(cont);
    if (s.learned > 0) {
      const vb = el("button", "btn-xl btn-ghost", `외운 단어 복습 (${s.learned})`);
      vb.onclick = () => go("vault");
      actions.appendChild(vb);
    }
  }
  home.appendChild(actions);

  stage.appendChild(home);
}

// --- 학습 ---
// 학습 진입 - 카드는 항상 단어만 보이는 상태(QUESTION)로 시작.
function enterStudy() {
  cardView = VIEW.QUESTION;
  go("study");
}

// 정답 공개 - 같은 카드 안에서 QUESTION → ANSWER로 전환.
function revealAnswer() {
  cardView = VIEW.ANSWER;
  render();
}

// 카드에 뜻·예문을 그린다(ANSWER 상태에서만 호출). QUESTION에서는 아예 DOM에 넣지 않아
// 정답이 시각적으로도, 스크린리더로도 미리 노출되지 않게 한다.
function appendAnswerBody(card, word) {
  const mean = el("div", "word-kr reveal-in");
  if (word.pos) mean.appendChild(el("span", "word-pos", word.pos));
  mean.appendChild(document.createTextNode(word.meaningKr.join(", ")));
  card.appendChild(mean);
  if (settings.showExample && word.example) {
    const ex = el("div", "word-example reveal-in");
    ex.appendChild(el("div", "ex-en", word.example));
    if (settings.showExampleKr && word.exampleKr) {
      ex.appendChild(el("div", "ex-kr", word.exampleKr));
    }
    card.appendChild(ex);
  }
}

// 단어 + 발음 버튼 행(학습·복습 공용).
function buildWordRow(word) {
  const wordRow = el("div", "word-row");
  wordRow.appendChild(el("div", "word-en", word.word));
  if (speechSupported()) {
    const spk = el("button", "speak-btn", ICON.speaker);
    spk.setAttribute("aria-label", "발음 듣기");
    spk.onclick = () => speak(word.word);
    wordRow.appendChild(spk);
  }
  return wordRow;
}

function renderStudy() {
  const s = deck.stats();
  if (s.completed) {
    go("complete");
    return;
  }
  setTopbar(`SET ${s.setId.replace(/\D/g, "") || "01"}`, true);
  const word = deck.current();
  if (!word) {
    go("complete");
    return;
  }
  const revealed = cardView === VIEW.ANSWER;

  const screen = el("div", "screen study");

  // 진행 정보(QUESTION·ANSWER 공통)
  const info = el("div", "study-info");
  info.appendChild(el("div", "study-count", `${s.remaining} / ${s.start} 남음`));
  const bar = el("div", "study-bar");
  bar.appendChild(el("div", "study-bar-fill")).style.width = `${s.percent}%`;
  info.appendChild(bar);
  screen.appendChild(info);

  // 카드 - QUESTION은 단어만, ANSWER는 뜻·예문 공개
  const card = el("div", "word-card" + (revealed ? " revealed" : ""));
  card.appendChild(buildWordRow(word));
  if (revealed) appendAnswerBody(card, word);
  screen.appendChild(card);

  // 하단 고정 영역(되돌리기 + 주 동작 + 안내)
  const foot = el("div", "study-foot");
  if (deck.canUndo()) {
    const undo = el("button", "undo-btn", `${ICON.undo}<span>방금 처리 되돌리기</span>`);
    undo.onclick = () => {
      deck.undo();
      saveDeck();
      cardView = VIEW.ANSWER; // 되돌린 단어는 다시 판정할 수 있게 공개 상태로 복원
      render();
    };
    foot.appendChild(undo);
  }

  if (!revealed) {
    const reveal = el("button", "btn-xl btn-accent reveal-btn", "뜻 확인");
    reveal.onclick = revealAnswer;
    foot.appendChild(reveal);
    foot.appendChild(el("div", "study-hint", "스페이스 또는 Enter: 뜻 확인"));
  } else {
    const btns = el("div", "study-actions");
    const unknown = el("button", "choice-btn choice-unknown", "몰랐음");
    const known = el("button", "choice-btn choice-known", "알았음");
    unknown.onclick = () => handleMark("unknown");
    known.onclick = () => handleMark("known");
    btns.appendChild(unknown);
    btns.appendChild(known);
    foot.appendChild(btns);
    foot.appendChild(el("div", "study-hint", "← 또는 1: 몰랐음 · → 또는 2: 알았음"));
  }
  screen.appendChild(foot);

  stage.appendChild(screen);

  if (!revealed && settings.autoSpeak) speak(word.word);

  document.onkeydown = (e) => {
    const action = resolveKey(cardView, e.key);
    if (!action) return;
    e.preventDefault();
    if (action === "reveal") revealAnswer();
    else handleMark(action);
  };
}

function handleMark(type) {
  deck.mark(type, now());
  saveDeck();
  cardView = VIEW.QUESTION; // 다음 단어는 다시 단어만 보이는 상태로
  if (deck.stats().completed) go("complete");
  else render();
}

// --- 보관함 ---
function renderVault() {
  setTopbar("외운 단어", true);
  const learned = deck.learnedWords();
  const screen = el("div", "screen vault");

  if (learned.length === 0) {
    screen.appendChild(el("div", "empty-note", "아직 외운 단어가 없습니다.\n학습에서 “알았음”을 누르면 여기 모입니다."));
    stage.appendChild(screen);
    return;
  }

  const head = el("div", "vault-head");
  head.appendChild(el("div", "vault-title", `외운 단어 ${learned.length}개`));
  const rev = el("button", "btn-md btn-accent", "복습 시작");
  rev.onclick = startReview;
  head.appendChild(rev);
  screen.appendChild(head);

  const list = el("div", "vault-list");
  for (const w of learned) {
    const item = el("div", "vault-item");
    const left = el("div", "vault-item-main");
    left.appendChild(el("div", "vault-word", w.word));
    left.appendChild(el("div", "vault-mean", w.meaningKr.join(", ")));
    item.appendChild(left);
    if (speechSupported()) {
      const spk = el("button", "speak-btn small", ICON.speaker);
      spk.setAttribute("aria-label", "발음 듣기");
      spk.onclick = () => speak(w.word);
      item.appendChild(spk);
    }
    list.appendChild(item);
  }
  screen.appendChild(list);
  stage.appendChild(screen);
}

// --- 보관함 복습 ---
let reviewQueue = [];
function startReview() {
  reviewQueue = deck.learnedWords().map((w) => w.id);
  if (settings.shuffle) {
    for (let i = reviewQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reviewQueue[i], reviewQueue[j]] = [reviewQueue[j], reviewQueue[i]];
    }
  }
  cardView = VIEW.QUESTION; // 복습도 단어만 보이는 회상형으로 시작
  go("review");
}
function renderReview() {
  setTopbar("복습", true);
  const screen = el("div", "screen review");
  const id = reviewQueue[0];
  const word = id ? DATA.words.find((w) => w.id === id) : null;

  if (!word) {
    screen.appendChild(el("div", "empty-note", "복습을 마쳤습니다."));
    const back = el("button", "btn-xl btn-accent", "보관함으로");
    back.onclick = () => go("vault");
    screen.appendChild(back);
    stage.appendChild(screen);
    return;
  }
  const revealed = cardView === VIEW.ANSWER;

  screen.appendChild(el("div", "review-progress", `남은 복습 ${reviewQueue.length}개`));

  const card = el("div", "word-card" + (revealed ? " revealed" : ""));
  card.appendChild(buildWordRow(word));
  if (revealed) appendAnswerBody(card, word);
  screen.appendChild(card);

  const foot = el("div", "study-foot");
  if (!revealed) {
    const reveal = el("button", "btn-xl btn-accent reveal-btn", "뜻 확인");
    reveal.onclick = revealAnswer;
    foot.appendChild(reveal);
    foot.appendChild(el("div", "study-hint", "스페이스 또는 Enter: 뜻 확인"));
  } else {
    const btns = el("div", "study-actions");
    const forgot = el("button", "choice-btn choice-unknown", "몰랐음");
    const remember = el("button", "choice-btn choice-known", "알았음");
    forgot.onclick = () => reviewNext(word.id, false);
    remember.onclick = () => reviewNext(word.id, true);
    btns.appendChild(forgot);
    btns.appendChild(remember);
    foot.appendChild(btns);
    foot.appendChild(el("div", "study-hint", "← 또는 1: 몰랐음(학습 목록으로 복귀) · → 또는 2: 알았음"));
  }
  screen.appendChild(foot);

  stage.appendChild(screen);

  if (!revealed && settings.autoSpeak) speak(word.word);
  document.onkeydown = (e) => {
    const action = resolveKey(cardView, e.key);
    if (!action) return;
    e.preventDefault();
    if (action === "reveal") revealAnswer();
    else reviewNext(word.id, action === "known");
  };
}
function reviewNext(id, remembered) {
  deck.reviewMark(id, remembered, now());
  saveDeck();
  if (!remembered) showToast("학습 목록으로 되돌렸습니다");
  reviewQueue.shift();
  cardView = VIEW.QUESTION; // 다음 복습 단어도 단어만 보이는 상태로
  render();
}

// --- 세트 완료 ---
function renderComplete() {
  setTopbar("세트 완료", true);
  const s = deck.stats();
  const screen = el("div", "screen complete");
  screen.appendChild(el("div", "complete-badge", "✓"));
  screen.appendChild(el("div", "complete-title", `SET ${s.setId.replace(/\D/g, "") || "01"} 완료`));
  screen.appendChild(el("div", "complete-sub", `${s.start}개 학습 완료 · 외운 단어 ${s.learned}개`));

  // 마지막 단어를 실수로 처리해 완료됐을 때를 위한 되돌리기(안전장치 - 학습 화면과 동일).
  if (deck.canUndo()) {
    const undo = el("button", "undo-btn", `${ICON.undo}<span>방금 처리 되돌리기</span>`);
    undo.onclick = () => {
      deck.undo();
      saveDeck();
      cardView = VIEW.ANSWER; // 되돌린 마지막 단어를 다시 판정할 수 있게 공개 상태로
      go("study");
    };
    screen.appendChild(undo);
  }

  const actions = el("div", "home-actions");
  const rb = el("button", "btn-xl btn-accent", "외운 단어 복습");
  rb.onclick = () => go("vault");
  actions.appendChild(rb);
  const restart = el("button", "btn-xl btn-ghost", "처음부터 다시");
  restart.onclick = confirmReset;
  actions.appendChild(restart);
  screen.appendChild(actions);

  stage.appendChild(screen);
}

// --- 설정 ---
function renderSettings() {
  setTopbar("설정", true);
  const screen = el("div", "screen settings");

  const toggle = (label, desc, key) => {
    const row = el("label", "set-row");
    const txt = el("div", "set-text");
    txt.appendChild(el("div", "set-label", label));
    if (desc) txt.appendChild(el("div", "set-desc", desc));
    row.appendChild(txt);
    const sw = el("span", "switch" + (settings[key] ? " on" : ""));
    sw.appendChild(el("span", "knob"));
    row.appendChild(sw);
    row.onclick = (e) => {
      e.preventDefault();
      settings[key] = !settings[key];
      saveSettings();
      if (key === "shuffle") buildDeck(); // 섞기 설정은 덱 재생성에 반영
      render();
    };
    return row;
  };

  screen.appendChild(el("div", "set-group-title", "학습"));
  screen.appendChild(toggle("발음 자동 재생", "카드가 바뀔 때 자동으로 읽어줍니다", "autoSpeak"));
  screen.appendChild(toggle("예문 표시", "단어 아래 짧은 예문을 보여줍니다", "showExample"));
  screen.appendChild(toggle("예문 해석 표시", "예문의 한국어 해석을 함께 보여줍니다", "showExampleKr"));
  screen.appendChild(toggle("단어 순서 섞기", "한 바퀴가 끝나면 순서를 섞습니다", "shuffle"));

  screen.appendChild(el("div", "set-group-title", "화면"));
  const fsRow = el("div", "set-row");
  const fsTxt = el("div", "set-text");
  fsTxt.appendChild(el("div", "set-label", "글자 크기"));
  fsRow.appendChild(fsTxt);
  const seg = el("div", "seg");
  [["small", "작게"], ["normal", "보통"], ["large", "크게"]].forEach(([val, lbl]) => {
    const b = el("button", "seg-btn" + (settings.fontScale === val ? " active" : ""), lbl);
    b.onclick = () => { settings.fontScale = val; saveSettings(); render(); };
    seg.appendChild(b);
  });
  fsRow.appendChild(seg);
  screen.appendChild(fsRow);

  screen.appendChild(el("div", "set-group-title", "데이터"));
  const resetRow = el("button", "set-danger", "데이터 초기화");
  resetRow.onclick = confirmReset;
  screen.appendChild(resetRow);
  screen.appendChild(el("div", "set-note", "발음이 안 들리면 기기·브라우저의 음성 지원 여부에 따라 다릅니다. 음성이 없어도 학습은 정상 동작합니다."));

  stage.appendChild(screen);
}

async function confirmReset() {
  const r = await showModal({
    title: "데이터 초기화",
    body: "외운 단어와 진행 상태가 모두 사라집니다. 계속할까요?",
    actions: [
      { label: "취소", value: "cancel" },
      { label: "초기화", value: "ok", primary: true },
    ],
  });
  if (r !== "ok") return;
  store.remove("deck");
  buildDeck();
  saveDeck();
  showToast("초기화했습니다");
  go("home");
}

// --- 부팅 ---
// manifest에서 학습 가능한(available) 세트를 찾아 그 세트 파일을 로드한다.
// 1차는 단일 세트(set-001)만 available. 8세트 확장 시 여기서 세트 선택 UI를 얹으면 되고,
// 세트 데이터 스키마·deck 로직은 그대로다(로드 대상 파일만 달라진다).
const DATA_DIR = "./src/data/";
applyFontScale();
fetch(DATA_DIR + "manifest.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then((manifest) => {
    const active = (manifest.sets || []).find((s) => s.available);
    if (!active) throw new Error("no available set");
    return fetch(DATA_DIR + active.file, { cache: "no-cache" }).then((r) => r.json());
  })
  .then((data) => {
    DATA = data;
    buildDeck();
    saveDeck();
    render();
  })
  .catch(() => {
    stage.innerHTML = '<div class="empty-note">단어 데이터를 불러오지 못했습니다.</div>';
  });
