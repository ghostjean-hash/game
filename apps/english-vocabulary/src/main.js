// 영어 단어장 - 화면 조립 + 이벤트(DOM). 순수 학습 로직은 core/deck.js.
// 저장은 shared/storage.js(localStorage, gg.english-vocabulary.*).

import { createStorage } from "../../../shared/storage.js";
import { showModal, showToast, registerServiceWorker } from "../../../shared/ui.js";
import { createDeck, ARCHIVE_TIER } from "./core/deck.js";
import { VIEW, initialCardView, resolveKey } from "./core/viewstate.js";

registerServiceWorker("/service-worker.js");

const store = createStorage("english-vocabulary");
const stage = document.getElementById("stage");
const backBtn = document.getElementById("nav-back");
const settingsBtn = document.getElementById("nav-settings");
const vaultBtn = document.getElementById("nav-vault");
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
let bundleLastApplied = null; // 모음에서 직전에 원본 세트로 반영한 단어(알았음·다시 안 보기 공용, undo 되돌림용)
let view = "menu";       // 첫 화면은 세트 선택 메뉴(= 앱 홈). 세트를 누르면 곧바로 학습이다.
let ARCHIVE = [];        // 아카이브 화면이 쓸 전 세트 통합 목록(열 때 채운다)
let settingsFrom = "menu"; // 설정에서 뒤로 갈 때 돌아갈 화면
const REMAINING_ID = "__remaining__";
// 학습·복습 카드의 표시 단계(question=단어만 / answer=뜻 공개). 단어가 바뀔 때마다 question으로 초기화.
// 새로고침 복원 시에도 기본값 question이라 정답 공개 상태는 이어지지 않는다(편법 방지).
let cardView = initialCardView();

// 2022 공식 초등 800 데이터는 이전 임시 세트와 단어 ID·순서가 달라 진도를 분리한다.
// 기존 `deck:<setId>` 값은 보존하고, 새 공식 데이터만 이 버전 키를 사용한다.
const DATA_PROGRESS_VERSION = "moe2022-v1";
const deckKey = (setId) => `deck:${DATA_PROGRESS_VERSION}:${setId}`;
function buildDeck() {
  deck = createDeck(DATA, store.get(deckKey(currentSetId)), settings.shuffle ? Math.random : null);
}
function saveDeck() {
  store.set(deckKey(currentSetId), deck.serialize());
}

// "이미 아는 단어" 목록에서 되살리기 버튼을 펼쳤는가(기본 접힘 - 원칙은 되돌리지 않는 것). 화면을 벗어나면 접는다.
let knownRecover = false;

// --- 라우팅 ---
function go(next) {
  if (next !== "archive") knownRecover = false;
  view = next;
  render();
}
// 뒤로 버튼은 화면마다 동작이 다르다(앱 홈에서는 허브로 나가고, 하위 화면에서는 앱 홈으로).
let backHandler = () => go("menu");
function setTopbar(title, showBack, onBack) {
  titleEl.textContent = title;
  backBtn.hidden = !showBack;
  backHandler = onBack || (() => go("menu"));
}
backBtn.addEventListener("click", () => backHandler());
settingsBtn.addEventListener("click", () => { settingsFrom = view === "settings" ? settingsFrom : view; go("settings"); });
vaultBtn.addEventListener("click", () => go("vault"));

function render() {
  stage.innerHTML = "";
  document.onkeydown = null;
  vaultBtn.hidden = true; // 복습 진입은 학습 화면에서만 (renderStudy가 다시 켠다)
  if (view === "menu") renderMenu();
  else if (view === "study") renderStudy();
  else if (view === "vault") renderVault();
  else if (view === "archive") renderArchive();
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
// deck.stats()와 같은 기준 - total = 파일 개수 - 아카이브. 아카이브한 단어는 이 세트에 없는 것과 같다.
function setProgress(setId, count) {
  const source = count || 0;
  const st = store.get(deckKey(setId));
  if (!st || !st.progress) return { learned: 0, archived: 0, total: source, percent: 0 };
  let learned = 0;
  let archived = 0;
  for (const id in st.progress) {
    const p = st.progress[id];
    if (p.status === "learned") learned++;
    else if (p.status === "buried") archived++; // 갈래(buriedTier)와 무관하게 세트에서 빠진다
  }
  const total = Math.max(0, source - archived);
  return { learned, archived, total, percent: total ? Math.round((learned / total) * 100) : 100 };
}

// 아직 못 외운 단어 수 합계 - 모든 available 세트 기준(층 표시 on/off와 무관). 아카이브는 빠진다.
function remainingCount() {
  const sets = (MANIFEST && MANIFEST.sets) || [];
  let n = 0;
  for (const s of sets) {
    if (!s.available) continue;
    const p = setProgress(s.setId, s.count);
    n += p.total - p.learned;
  }
  return n;
}

// 전 세트 아카이브 단어 수 - 홈 아카이브 카드의 숫자. 저장본만 훑어 파일은 읽지 않는다.
function archivedCount() {
  let n = 0;
  for (const s of ((MANIFEST && MANIFEST.sets) || [])) {
    if (!s.available) continue;
    const st = store.get(deckKey(s.setId));
    if (!st || !st.progress) continue;
    for (const id in st.progress) if (st.progress[id].status === "buried") n++;
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

  // 아카이브 카드 - 학습에서 뺀 단어는 세트 어디에도 안 보이므로 여기서만 들어간다.
  const ac = archivedCount();
  if (ac > 0) {
    const card = el("button", "menu-set menu-archive");
    const main = el("div", "menu-set-main");
    main.appendChild(el("div", "menu-set-title", "아카이브"));
    main.appendChild(el("div", "menu-set-meta", "학습에서 뺀 단어를 모아 둡니다"));
    card.appendChild(main);
    card.appendChild(el("div", "menu-set-pct", `${ac}`));
    card.onclick = openArchive;
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
    const totalWords = avail.reduce((n, s) => n + setProgress(s.setId, s.count).total, 0);

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
      main.appendChild(el("div", "menu-set-meta", `${p.total}단어 · ${p.learned}개 외움`));
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
    go("study"); // 중간 화면 없이 바로 학습(2026-08-06 사용자 지시)
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
        // 이미 외운 단어와 묻은 단어(다시 안 보기)는 모음에서도 빼야 한다.
        const st2 = prog[w.id];
        if (!st2 || (st2.status !== "learned" && st2.status !== "buried")) combined.push(w);
      }
    }
    if (combined.length === 0) { showToast("못 외운 단어가 없습니다"); return; }
    DATA = { setId: REMAINING_ID, title: "못 외운 단어 모음", words: combined };
    currentSetId = REMAINING_ID;
    bundleMode = true;
    bundleLastApplied = null;
    deck = createDeck(DATA, null, settings.shuffle ? Math.random : null);
    cardView = VIEW.QUESTION;
    go("study");
  } catch {
    showToast("단어를 불러오지 못했습니다");
  }
}

// 모음에서 처리한 결과를 원본 세트 진도에 반영(단일 진도 유지). 저장 상태 JSON 직접 갱신.
// status: "learned"(알았음) | "buried"(모음에서는 "이미 아는 단어"만 처리한다).
function applyStatusInSource(word, status, nowIso) {
  const key = deckKey(word.setId);
  const st = store.get(key) || { version: 2, setId: word.setId, round: 1, queue: [], progress: {}, lastStudiedAt: null, undo: null };
  if (!st.progress) st.progress = {};
  const p = st.progress[word.id] || { status: "active", seenCount: 0, unknownCount: 0, learnedAt: null, lastReviewedAt: null, buriedAt: null, buriedTier: null, statusChangedAt: null };
  p.status = status;
  p.statusChangedAt = nowIso;
  if (status === "learned") {
    p.learnedAt = nowIso;
    p.seenCount = (p.seenCount || 0) + 1; // 묻기는 학습 처리가 아니라 본 횟수를 올리지 않는다
    p.buriedTier = null;
  } else {
    p.buriedAt = nowIso;
    p.buriedTier = ARCHIVE_TIER.KNOWN;
  }
  st.progress[word.id] = p;
  if (Array.isArray(st.queue)) st.queue = st.queue.filter((id) => id !== word.id);
  st.undo = null; // 외부에서 상태를 바꿨으니 그 세트의 직전-처리 undo는 무효화
  store.set(key, st);
}
// 모음 undo 시 원본 반영 되돌리기(learned·buried → active).
function revertToActiveInSource(word) {
  const key = deckKey(word.setId);
  const st = store.get(key);
  if (!st || !st.progress || !st.progress[word.id]) return;
  st.progress[word.id].status = "active";
  st.progress[word.id].learnedAt = null;
  st.progress[word.id].buriedAt = null;
  st.progress[word.id].buriedTier = null;
  st.progress[word.id].statusChangedAt = now();
  store.set(key, st);
}

// --- 학습 ---
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
  setTopbar(bundleMode ? "못 외운 단어 모음" : `SET ${s.setId.replace(/\D/g, "") || "01"}`, true, () => go("menu"));
  // 중간 화면을 없앴으므로 복습 진입은 상단바가 맡는다(외운 단어가 있고 모음이 아닐 때만).
  vaultBtn.hidden = bundleMode || s.learned === 0;
  const word = deck.current();
  if (!word) {
    go("complete");
    return;
  }
  const revealed = cardView === VIEW.ANSWER;

  const screen = el("div", "screen study");

  // 진행 정보(QUESTION·ANSWER 공통)
  const info = el("div", "study-info");
  info.appendChild(el("div", "study-count", `${s.remaining} / ${s.total} 남음`));
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
      if (bundleMode) { if (bundleLastApplied) revertToActiveInSource(bundleLastApplied); bundleLastApplied = null; }
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
    // "이미 아는 단어로 빼기"는 큰 판정 버튼과 크기·위치를 달리해 오탭을 막는다. 키보드 단축키도 일부러 두지 않는다.
    const bury = el("button", "bury-btn", "이미 아는 단어로 빼기");
    bury.onclick = handleBury;
    foot.appendChild(bury);
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
    if (type === "known" && word) { applyStatusInSource(word, "learned", now()); bundleLastApplied = word; }
    else bundleLastApplied = null;
  } else {
    saveDeck();
  }
  cardView = VIEW.QUESTION; // 다음 단어는 다시 단어만 보이는 상태로
  if (deck.stats().completed) go("complete");
  else render();
}

// "이미 아는 단어로 빼기" - 세트에서 통째로 빼 아카이브로 보낸다. 실수했을 때의 회복은 직전 되돌리기다.
function handleBury() {
  const word = deck.current();
  if (!word) return;
  deck.archiveKnown(now());
  if (bundleMode) { applyStatusInSource(word, "buried", now()); bundleLastApplied = word; }
  else saveDeck();
  showToast(`“${word.word}”를 아카이브로 보냈습니다`);
  cardView = VIEW.QUESTION;
  if (deck.stats().completed) go("complete");
  else render();
}

// --- 보관함 ---
function renderVault() {
  setTopbar("외운 단어", true, () => go(deck && deck.stats().completed ? "complete" : "study"));
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

  screen.appendChild(el("div", "set-note", "확실히 외운 단어는 완전히 외움으로 옮기면 아카이브로 가서 이 세트에서 빠집니다. 홈의 아카이브에서 되살릴 수 있습니다."));

  const bulk = el("button", "btn-sm btn-ghost vault-bulk", "전부 완전히 외움");
  bulk.onclick = confirmMasterAll;
  screen.appendChild(bulk);

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
    const grad = el("button", "btn-sm btn-ghost", "완전히 외움");
    grad.onclick = () => {
      deck.archiveLearned(w.id, now());
      saveDeck();
      showToast(`“${w.word}”를 아카이브로 보냈습니다`);
      render();
    };
    item.appendChild(grad);
    list.appendChild(item);
  }
  screen.appendChild(list);
  stage.appendChild(screen);
}

// 외운 단어를 한 번에 옮긴다 - 되돌리려면 목록에서 하나씩이라 확인을 받는다.
async function confirmMasterAll() {
  const n = deck.learnedWords().length;
  if (n === 0) return;
  const r = await showModal({
    title: "전부 완전히 외움",
    body: `외운 단어 ${n}개를 아카이브로 보냅니다. 이 세트에서 빠지고, 홈의 아카이브에서 되살릴 수 있습니다. 계속할까요?`,
    actions: [
      { label: "취소", value: "cancel" },
      { label: "정리", value: "ok", primary: true },
    ],
  });
  if (r !== "ok") return;
  const done = deck.archiveAllLearned(now());
  saveDeck();
  showToast(`${done}개를 아카이브로 보냈습니다`);
  render();
}

// --- 아카이브 (전 세트 통합) ---
// 아카이브한 단어는 세트에서 빠져 있어 세트 화면 어디에도 안 나온다. 홈의 아카이브 카드로만 들어온다.
// 열 때 아카이브가 있는 세트만 파일을 읽는다(없는 세트는 내려받지 않는다).
async function openArchive() {
  try {
    const items = [];
    for (const s of ((MANIFEST && MANIFEST.sets) || [])) {
      if (!s.available) continue;
      const st = store.get(deckKey(s.setId));
      const prog = (st && st.progress) || {};
      if (!Object.keys(prog).some((id) => prog[id].status === "buried")) continue;
      const data = await fetch(DATA_DIR + s.file, { cache: "no-cache" }).then((r) => r.json());
      for (const w of data.words) {
        const p = prog[w.id];
        if (!p || p.status !== "buried") continue;
        items.push({
          ...w,
          setTitle: s.title,
          setNum: s.setId.replace(/\D/g, ""),
          tier: p.buriedTier === ARCHIVE_TIER.MASTERED ? ARCHIVE_TIER.MASTERED : ARCHIVE_TIER.KNOWN,
        });
      }
    }
    ARCHIVE = items;
    go("archive");
  } catch {
    showToast("아카이브를 불러오지 못했습니다");
  }
}

// 아카이브에서 되살리기 - 원본 세트의 저장 상태를 직접 고친다(아카이브는 세트를 고르기 전 화면이라
// 덱이 없을 수 있다). 마침 그 세트를 열어 둔 상태면 덱도 다시 만들어 화면 수치를 맞춘다.
function unarchiveInSource(word) {
  const key = deckKey(word.setId);
  const st = store.get(key);
  if (!st || !st.progress || !st.progress[word.id]) return false;
  const p = st.progress[word.id];
  if (p.status !== "buried") return false;
  const mastered = p.buriedTier === ARCHIVE_TIER.MASTERED;
  p.status = mastered ? "learned" : "active"; // 외운 단어는 복습 목록으로, 그 밖은 학습으로
  p.buriedAt = null;
  p.buriedTier = null;
  p.statusChangedAt = now();
  st.undo = null; // 외부에서 상태를 바꿨으니 그 세트의 직전-처리 undo는 무효화
  store.set(key, st);
  if (!bundleMode && currentSetId === word.setId && DATA) buildDeck();
  ARCHIVE = ARCHIVE.filter((x) => x.id !== word.id);
  return true;
}

// "이미 아는 단어"는 되살리기를 기본으로 내놓지 않는다(원칙상 학습에 다시 넣지 않는다).
// 다만 잘못 넣은 단어까지 갇히지는 않도록, 안내를 눌러 펼쳤을 때만 되살리기가 나타난다.
function renderArchive() {
  setTopbar("아카이브", true, () => go("menu"));
  const known = ARCHIVE.filter((w) => w.tier === ARCHIVE_TIER.KNOWN);
  const mastered = ARCHIVE.filter((w) => w.tier === ARCHIVE_TIER.MASTERED);
  const screen = el("div", "screen vault");

  if (ARCHIVE.length === 0) {
    screen.appendChild(el("div", "empty-note", "아카이브가 비어 있습니다.\n학습에서 “이미 아는 단어로 빼기”를,\n외운 단어 목록에서 “완전히 외움”을 누르면 여기 모입니다."));
    stage.appendChild(screen);
    return;
  }

  screen.appendChild(el("div", "set-note", "아카이브한 단어는 세트에서 빠져 학습·복습·개수 어디에도 나오지 않습니다. 되살리면 그 세트로 돌아갑니다."));

  // 한 단어 행(어느 세트에서 왔는지 + 발음 + 선택적 되살리기).
  const itemOf = (w, onRestore, restoreLabel) => {
    const item = el("div", "vault-item");
    const left = el("div", "vault-item-main");
    left.appendChild(el("div", "vault-word", w.word));
    left.appendChild(el("div", "vault-mean", w.meaningKr.join(", ")));
    left.appendChild(el("div", "vault-src", `SET ${w.setNum} · ${w.setTitle}`));
    item.appendChild(left);
    if (speechSupported()) {
      const spk = el("button", "speak-btn small", ICON.speaker);
      spk.setAttribute("aria-label", "발음 듣기");
      spk.onclick = () => speak(w.word);
      item.appendChild(spk);
    }
    if (onRestore) {
      const back = el("button", "btn-sm btn-ghost", restoreLabel);
      back.onclick = onRestore;
      item.appendChild(back);
    }
    return item;
  };

  // 이미 아는 단어 - 되살리면 학습으로 돌아간다.
  const kHead = el("div", "vault-head");
  kHead.appendChild(el("div", "vault-title", `이미 아는 단어 ${known.length}개`));
  screen.appendChild(kHead);
  if (known.length === 0) {
    screen.appendChild(el("div", "vault-none", "아직 없습니다."));
  } else {
    const list = el("div", "vault-list");
    for (const w of known) {
      list.appendChild(itemOf(w, knownRecover ? () => {
        if (unarchiveInSource(w)) showToast(`“${w.word}”를 학습으로 되돌렸습니다`);
        render();
      } : null, "학습으로 되돌리기"));
    }
    screen.appendChild(list);
    const toggle = el("button", "vault-linkbtn", knownRecover ? "되살리기 감추기" : "잘못 넣은 단어가 있나요?");
    toggle.onclick = () => { knownRecover = !knownRecover; render(); };
    screen.appendChild(toggle);
  }

  // 완전히 외운 단어 - 되살리면 그 세트의 복습 목록으로 돌아간다.
  const mHead = el("div", "vault-head vault-head-gap");
  mHead.appendChild(el("div", "vault-title", `완전히 외운 단어 ${mastered.length}개`));
  screen.appendChild(mHead);
  if (mastered.length === 0) {
    screen.appendChild(el("div", "vault-none", "아직 없습니다."));
  } else {
    const list = el("div", "vault-list");
    for (const w of mastered) {
      list.appendChild(itemOf(w, () => {
        if (unarchiveInSource(w)) showToast(`“${w.word}”를 복습 목록으로 되돌렸습니다`);
        render();
      }, "복습으로 되돌리기"));
    }
    screen.appendChild(list);
  }

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
  setTopbar("세트 완료", true, () => go("menu"));
  const s = deck.stats();
  const screen = el("div", "screen complete");
  screen.appendChild(el("div", "complete-badge", "✓"));
  screen.appendChild(el("div", "complete-title", `SET ${s.setId.replace(/\D/g, "") || "01"} 완료`));
  screen.appendChild(el("div", "complete-sub", s.total === 0
    ? "이 세트의 단어를 모두 아카이브로 보냈습니다"
    : `${s.total}개 학습 완료 · 외운 단어 ${s.learned}개`));

  // 마지막 단어를 실수로 처리해 완료됐을 때를 위한 되돌리기(안전장치 - 학습 화면과 동일).
  if (deck.canUndo()) {
    const undo = el("button", "undo-btn", `${ICON.undo}<span>방금 처리 되돌리기</span>`);
    undo.onclick = () => {
      deck.undo();
      if (bundleMode) { if (bundleLastApplied) revertToActiveInSource(bundleLastApplied); bundleLastApplied = null; }
      else saveDeck();
      cardView = VIEW.ANSWER; // 되돌린 마지막 단어를 다시 판정할 수 있게 공개 상태로
      go("study");
    };
    screen.appendChild(undo);
  }

  const actions = el("div", "home-actions");
  if (s.learned > 0) {
    const rb = el("button", "btn-xl btn-accent", `외운 단어 복습 (${s.learned})`);
    rb.onclick = () => go("vault");
    actions.appendChild(rb);
  }
  const restart = el("button", "btn-xl btn-ghost", "처음부터 다시");
  restart.onclick = confirmReset;
  actions.appendChild(restart);
  const back = el("button", "btn-xl btn-ghost", "세트 목록으로");
  back.onclick = () => go("menu");
  actions.appendChild(back);
  screen.appendChild(actions);

  stage.appendChild(screen);
}

// --- 설정 ---
function renderSettings() {
  // 설정은 어느 화면에서든 들어올 수 있으니, 들어오기 직전 화면으로 돌아간다.
  setTopbar("설정", true, () => go(settingsFrom === "settings" ? "menu" : settingsFrom));
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
  go("study");
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
