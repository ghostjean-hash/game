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
  autoSpeak: false,      // 카드가 바뀔 때 자동 발음 (기본 OFF)
  showExample: true,     // 예문 표시 (기본 ON)
  showExampleKr: false,  // 예문 해석 표시 (기본 OFF)
  shuffle: false,        // 한 바퀴 끝나면 순서 섞기 (기본 OFF)
  fontScale: "normal",   // small | normal | large
  levels: { elementary: true, middle: true, high: true }, // 메뉴에서 층별 목록 표시 on/off
  hideCompleted: false,  // 다 외운(100%) 세트 자동 숨김
  showRemaining: false,  // "못 외운 단어 모음"(층 off와 무관하게 안 외운 단어 통합) 표시
};
const _stored = store.get("settings") || {};
let settings = { ...DEFAULT_SETTINGS, ..._stored };
// 중첩 객체(levels)는 얕은 병합이 통째로 덮어쓰므로 따로 병합해 기본 키를 보존한다.
settings.levels = { ...DEFAULT_SETTINGS.levels, ...(_stored.levels || {}) };

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
let MANIFEST = null;     // 세트 목록·메타(메뉴 렌더용)
let deck = null;         // 현재 선택된 세트의 학습 덱
let DATA = null;         // 현재 선택된 세트의 단어 데이터
let currentSetId = null; // 현재 선택된 세트 id
let bundleMode = false;  // "못 외운 단어 모음" 학습 중인가(여러 세트 통합, 별도 저장 없음)
let bundleLastKnown = null; // 모음에서 직전에 "알았음"으로 원본에 반영한 단어(undo 되돌림용)
let view = "menu";       // 첫 화면은 세트 선택 메뉴
const REMAINING_ID = "__remaining__";
// 학습·복습 카드의 표시 단계(question=단어만 / answer=뜻 공개). 단어가 바뀔 때마다 question으로 초기화.
// 새로고침 복원 시에도 기본값 question이라 정답 공개 상태는 이어지지 않는다(편법 방지).
let cardView = initialCardView();

// 진도는 세트마다 따로 저장한다(deck:<setId>). 한 세트를 하다 다른 세트를 가도 각각 유지.
const deckKey = (setId) => `deck:${setId}`;
function buildDeck() {
  deck = createDeck(DATA, store.get(deckKey(currentSetId)), settings.shuffle ? Math.random : null);
}
function saveDeck() {
  store.set(deckKey(currentSetId), deck.serialize());
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
  if (view === "menu") renderMenu();
  else if (view === "home") renderHome();
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

// --- 세트 선택 메뉴 (초등/중등/고등 2단) ---
const LEVEL_ORDER = ["elementary", "middle", "high"];
const LEVEL_LABEL = { elementary: "초등", middle: "중등", high: "고등" };
const DATA_DIR = "./src/data/";

// 세트별 진도를 저장된 덱 상태에서 가볍게 계산(덱을 새로 만들지 않고 요약만).
function setProgress(setId, count) {
  const st = store.get(deckKey(setId));
  if (!st || !st.progress) return { learned: 0, percent: 0 };
  let learned = 0;
  for (const id in st.progress) if (st.progress[id].status === "learned") learned++;
  return { learned, percent: count ? Math.round((learned / count) * 100) : 0 };
}

// 아직 못 외운(learned 아님) 단어 수 합계 - 모든 available 세트 기준(층 표시 on/off와 무관).
function remainingCount() {
  const sets = (MANIFEST && MANIFEST.sets) || [];
  let n = 0;
  for (const s of sets) {
    if (!s.available) continue;
    const p = setProgress(s.setId, s.count);
    n += (s.count || 0) - p.learned;
  }
  return n;
}

function renderMenu() {
  setTopbar("영어 단어장", true, () => { window.location.href = "../../"; });
  const screen = el("div", "screen menu");

  // 못 외운 단어 모음 카드(층을 꺼도 남은 단어를 한데 묶어 학습) - 설정 on일 때만.
  if (settings.showRemaining) {
    const rc = remainingCount();
    const card = el("button", "menu-set menu-remaining");
    const main = el("div", "menu-set-main");
    main.appendChild(el("div", "menu-set-title", "못 외운 단어 모음"));
    main.appendChild(el("div", "menu-set-meta", `아직 못 외운 단어 ${rc}개를 한데 모아 학습`));
    card.appendChild(main);
    card.appendChild(el("div", "menu-set-pct", `${rc}`));
    if (rc === 0) { card.disabled = true; card.classList.add("menu-set-done"); }
    else card.onclick = openRemaining;
    screen.appendChild(card);
  }

  const sets = (MANIFEST && MANIFEST.sets) || [];
  let shownAny = false;
  for (const level of LEVEL_ORDER) {
    if (!settings.levels[level]) continue; // 층 표시 off면 통째 숨김
    const group = sets.filter((s) => s.level === level);
    if (group.length === 0) continue;
    let avail = group.filter((s) => s.available);
    // 다 외운(100%) 세트 자동 숨김 옵션
    if (settings.hideCompleted) avail = avail.filter((s) => setProgress(s.setId, s.count).percent < 100);
    const totalWords = avail.reduce((n, s) => n + (s.count || 0), 0);

    const head = el("div", "menu-group-head");
    head.appendChild(el("div", "menu-group-title", LEVEL_LABEL[level]));
    head.appendChild(el("div", "menu-group-sub", avail.length
      ? `${totalWords}단어 · ${avail.length}세트`
      : "준비 중"));
    screen.appendChild(head);
    shownAny = true;

    if (avail.length === 0) {
      screen.appendChild(el("div", "menu-empty", settings.hideCompleted ? "표시할 세트가 없습니다." : "아직 준비 중입니다."));
      continue;
    }

    for (const s of avail) {
      const num = s.setId.replace(/\D/g, "");
      const p = setProgress(s.setId, s.count);
      const card = el("button", "menu-set");
      const main = el("div", "menu-set-main");
      main.appendChild(el("div", "menu-set-title", `SET ${num} · ${s.title}`));
      main.appendChild(el("div", "menu-set-meta", `${s.count}단어 · ${p.learned}개 외움`));
      const bar = el("div", "menu-set-bar");
      bar.appendChild(el("div", "menu-set-bar-fill")).style.width = `${p.percent}%`;
      main.appendChild(bar);
      card.appendChild(main);
      card.appendChild(el("div", "menu-set-pct", `${p.percent}%`));
      card.onclick = () => openSet(s);
      screen.appendChild(card);
    }
  }

  // 모든 층을 껐고 모음도 꺼져 화면이 비면 안내.
  if (!shownAny && !settings.showRemaining) {
    screen.appendChild(el("div", "menu-empty", "설정에서 표시할 목록을 켜세요."));
  }

  stage.appendChild(screen);
}

// 세트를 열어 학습 화면으로. 세트 데이터는 이때 불러온다(메뉴는 manifest만으로 그린다).
async function openSet(entry) {
  try {
    const data = await fetch(DATA_DIR + entry.file, { cache: "no-cache" }).then((r) => r.json());
    DATA = data;
    currentSetId = data.setId;
    bundleMode = false;
    buildDeck();
    saveDeck();
    cardView = VIEW.QUESTION;
    go("home");
  } catch {
    showToast("세트를 불러오지 못했습니다");
  }
}

// "못 외운 단어 모음" 열기 - 모든 available 세트에서 아직 learned가 아닌 단어를 통합해 한 덱으로.
// 별도 저장 없이 열 때마다 원본 진도로 새로 구성한다(원본이 곧 진실).
async function openRemaining() {
  try {
    const avail = (MANIFEST.sets || []).filter((s) => s.available);
    const combined = [];
    for (const s of avail) {
      const data = await fetch(DATA_DIR + s.file, { cache: "no-cache" }).then((r) => r.json());
      const st = store.get(deckKey(s.setId));
      const prog = (st && st.progress) || {};
      for (const w of data.words) {
        if (!prog[w.id] || prog[w.id].status !== "learned") combined.push(w);
      }
    }
    if (combined.length === 0) { showToast("못 외운 단어가 없습니다"); return; }
    DATA = { setId: REMAINING_ID, title: "못 외운 단어 모음", words: combined };
    currentSetId = REMAINING_ID;
    bundleMode = true;
    bundleLastKnown = null;
    deck = createDeck(DATA, null, settings.shuffle ? Math.random : null);
    cardView = VIEW.QUESTION;
    go("home");
  } catch {
    showToast("단어를 불러오지 못했습니다");
  }
}

// 모음에서 "알았음" 시 원본 세트 진도에도 learned로 반영(단일 진도 유지). 저장 상태 JSON 직접 갱신.
function markLearnedInSource(word, nowIso) {
  const key = deckKey(word.setId);
  const st = store.get(key) || { version: 1, setId: word.setId, round: 1, queue: [], progress: {}, lastStudiedAt: null, undo: null };
  if (!st.progress) st.progress = {};
  const p = st.progress[word.id] || { status: "active", seenCount: 0, unknownCount: 0, learnedAt: null, lastReviewedAt: null };
  p.status = "learned";
  p.learnedAt = nowIso;
  p.seenCount = (p.seenCount || 0) + 1;
  st.progress[word.id] = p;
  if (Array.isArray(st.queue)) st.queue = st.queue.filter((id) => id !== word.id);
  st.undo = null; // 외부에서 상태를 바꿨으니 그 세트의 직전-처리 undo는 무효화
  store.set(key, st);
}
// 모음 undo 시 원본 반영 되돌리기(learned → active).
function revertLearnedInSource(word) {
  const key = deckKey(word.setId);
  const st = store.get(key);
  if (!st || !st.progress || !st.progress[word.id]) return;
  st.progress[word.id].status = "active";
  st.progress[word.id].learnedAt = null;
  store.set(key, st);
}

// --- 홈 (선택된 세트의 진행 화면) ---
function renderHome() {
  // 세트 홈에서는 뒤로 버튼이 세트 선택 메뉴로 간다.
  setTopbar(DATA.title || "영어 단어장", true, () => go("menu"));
  const s = deck.stats();

  const home = el("div", "screen home");

  const hero = el("div", "hero");
  hero.appendChild(el("div", "hero-set", bundleMode
    ? "못 외운 단어 모음"
    : `SET ${s.setId.replace(/\D/g, "") || "01"} · ${DATA.title || ""}`));
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
    // 모음은 별도 보관함·재시작이 없다(원본 세트가 진도의 주인). 메뉴로만.
    const done = el("div", "done-note", bundleMode ? "🎉 못 외운 단어를 모두 외웠습니다." : "🎉 이 세트의 단어를 모두 외웠습니다.");
    home.appendChild(done);
    if (bundleMode) {
      const back = el("button", "btn-xl btn-accent", "메뉴로");
      back.onclick = () => go("menu");
      actions.appendChild(back);
    } else {
      const rb = el("button", "btn-xl btn-accent", "외운 단어 복습");
      rb.onclick = () => go("vault");
      actions.appendChild(rb);
      const restart = el("button", "btn-xl btn-ghost", "처음부터 다시");
      restart.onclick = confirmReset;
      actions.appendChild(restart);
    }
  } else {
    const cont = el("button", "btn-xl btn-accent", s.learned === 0 && s.round === 1 ? "학습 시작" : "이어서 학습");
    cont.onclick = enterStudy;
    actions.appendChild(cont);
    // 보관함(수동 복습)은 세트 진도 기반이라 모음에서는 숨긴다(세션 임시 값 혼동 방지).
    if (!bundleMode && s.learned > 0) {
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
      if (bundleMode) { if (bundleLastKnown) revertLearnedInSource(bundleLastKnown); bundleLastKnown = null; }
      else saveDeck();
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
  const word = deck.current(); // 처리 직전 단어(모음의 원본 반영·undo 추적용)
  deck.mark(type, now());
  if (bundleMode) {
    // 모음은 별도 저장 없음. "알았음"만 원본 세트에 learned로 반영(단일 진도).
    if (type === "known" && word) { markLearnedInSource(word, now()); bundleLastKnown = word; }
    else bundleLastKnown = null;
  } else {
    saveDeck();
  }
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
      if (bundleMode) { if (bundleLastKnown) revertLearnedInSource(bundleLastKnown); bundleLastKnown = null; }
      else saveDeck();
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
  // 설정은 메뉴/세트 홈 어디서든 들어올 수 있으니, 돌아갈 곳을 상황에 맞게 정한다.
  setTopbar("설정", true, () => go(DATA ? "home" : "menu"));
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
      if (key === "shuffle" && DATA && !bundleMode) buildDeck(); // 섞기 설정은 현재 세트 덱 재생성에 반영(세트 선택된 경우만, 모음 제외)
      render();
    };
    return row;
  };

  // 층(초/중/고) 표시 토글 - 중첩 settings.levels[lv]을 켜고 끈다.
  const levelToggle = (label, lv) => {
    const row = el("label", "set-row");
    const txt = el("div", "set-text");
    txt.appendChild(el("div", "set-label", label));
    row.appendChild(txt);
    const sw = el("span", "switch" + (settings.levels[lv] ? " on" : ""));
    sw.appendChild(el("span", "knob"));
    row.appendChild(sw);
    row.onclick = (e) => {
      e.preventDefault();
      settings.levels[lv] = !settings.levels[lv];
      saveSettings();
      render();
    };
    return row;
  };

  screen.appendChild(el("div", "set-group-title", "학습"));
  screen.appendChild(toggle("발음 자동 재생", "카드가 바뀔 때 자동으로 읽어줍니다", "autoSpeak"));
  screen.appendChild(toggle("예문 표시", "단어 아래 짧은 예문을 보여줍니다", "showExample"));
  screen.appendChild(toggle("예문 해석 표시", "예문의 한국어 해석을 함께 보여줍니다", "showExampleKr"));
  screen.appendChild(toggle("단어 순서 섞기", "한 바퀴가 끝나면 순서를 섞습니다", "shuffle"));

  screen.appendChild(el("div", "set-group-title", "단어 목록"));
  screen.appendChild(levelToggle("초등 표시", "elementary"));
  screen.appendChild(levelToggle("중등 표시", "middle"));
  screen.appendChild(levelToggle("고등 표시", "high"));
  screen.appendChild(toggle("다 외운 세트 숨기기", "100% 외운 세트를 목록에서 감춥니다", "hideCompleted"));
  screen.appendChild(toggle("못 외운 단어 모음", "층을 꺼도 아직 못 외운 단어를 한데 묶어 학습합니다", "showRemaining"));

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
  if (bundleMode) {
    showToast("모음은 초기화 대상이 아닙니다(각 세트에서 초기화)");
    return;
  }
  if (!currentSetId || !DATA) {
    showToast("세트를 먼저 선택하세요");
    return;
  }
  const r = await showModal({
    title: "데이터 초기화",
    body: `이 세트(${DATA.title || currentSetId})의 외운 단어와 진행 상태가 모두 사라집니다. 계속할까요?`,
    actions: [
      { label: "취소", value: "cancel" },
      { label: "초기화", value: "ok", primary: true },
    ],
  });
  if (r !== "ok") return;
  store.remove(deckKey(currentSetId));
  buildDeck();
  saveDeck();
  showToast("이 세트를 초기화했습니다");
  go("home");
}

// --- 부팅 ---
// manifest만 먼저 불러 세트 선택 메뉴(초/중/고 2단)를 그린다.
// 세트 데이터(set-NNN.json)는 사용자가 세트를 고를 때 openSet에서 불러온다.
applyFontScale();
fetch(DATA_DIR + "manifest.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then((manifest) => {
    MANIFEST = manifest;
    go("menu");
  })
  .catch(() => {
    stage.innerHTML = '<div class="empty-note">세트 목록을 불러오지 못했습니다.</div>';
  });
