// 하이브리드 독해 - 몰입 리딩 + 끊어 읽기 직접 긋기·채점 + 코스 진행·전체 클리어.
// 순수 로직은 core(tokenize·course·chunking)에 위임하고, 여기서 DOM만 만진다.
import { tokenize, matchWordTargets } from "./core/tokenize.js";
import { createLevelCourses, courseProgress } from "./core/course.js";
import { chunkBoundaries, gradeChunks, chunkReasons } from "./core/chunking.js";
import { normalizeSentence, boundarySet, reasonByBoundary } from "./core/normalize.js";
import { createStorage } from "../../../shared/storage.js";
import { registerServiceWorker } from "../../../shared/ui.js";

registerServiceWorker("/service-worker.js");

const store = createStorage("english-reading");

const el = {
  back: document.getElementById("nav-back"),
  title: document.getElementById("topbar-title"),
  vocab: document.getElementById("nav-vocab"),
  savedSentences: document.getElementById("nav-saved-sentences"),
  bar: document.getElementById("bar-fill"),
  stage: document.getElementById("stage"),
};

// 팝업·버튼용 인라인 SVG 아이콘(Feather 계열, 외부 의존 0).
const SVG_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICON = {
  back: `<svg ${SVG_ATTR}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  close: `<svg ${SVG_ATTR}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  book: `<svg ${SVG_ATTR}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  next: `<svg ${SVG_ATTR}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  repeat: `<svg ${SVG_ATTR}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  list: `<svg ${SVG_ATTR}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  more: `<svg ${SVG_ATTR}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  copy: `<svg ${SVG_ATTR}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg ${SVG_ATTR}><polyline points="20 6 9 17 4 12"/></svg>`,
};

let course = null; // 현재 선택된 코스
let courses = []; // 전체 코스 목록(코스 고르기 화면용)
let baseData = null; // passages.json 원본(기본 지문)
let currentPassage = null; // 지금 읽는 지문 - 단어장 등에서 돌아올 대상
// 끊기/단어 터치 토글(각각 독립 on/off) - 둘이 본문에서 붙어 생기던 오터치를 사용자가 직접 조절.
let touchChunk = true;   // 켜짐: 단어 사이 틈을 눌러 끊기 / 꺼짐: 틈 터치 무시
let touchWord = false;   // 켜짐: 주요 단어를 눌러 수집 / 꺼짐: 단어 터치 무시
{ const t = store.get("touch", {}) || {}; touchChunk = t.chunk !== false; touchWord = !!t.word; }
const saveTouch = () => store.set("touch", { chunk: touchChunk, word: touchWord });
// 끊기/단어 터치 대상은 환경설정에서 정한다(상단바 토글 폐지). 본문에 no-chunk/no-word로 pointer-events만 반영.
function applyTouch() {
  const art = el.stage.querySelector(".article");
  if (art) {
    art.classList.toggle("no-chunk", !touchChunk);
    art.classList.toggle("no-word", !touchWord);
  }
}
let toastTimer = null; // 토스트 자동 닫힘 타이머
let openSentenceMenu = null;
let titleTranslationTimer = null;
const TOAST_MS = 1600; // 토스트가 스스로 사라지기까지
const TITLE_TRANSLATION_MS = 3000;

// ── 상태 저장(기기 저장소) ──
const getDone = () => store.get("done", []); // 완독한 지문 id 배열
const getReads = () => store.get("reads", {}); // { passageId: 회독수 }
const getVocab = () => store.get("vocab", []); // [{ wordKey, word, meaning, sentence, passageId, passageTitle }]
const getSavedSentences = () => store.get("savedSentences", []); // [{ key, text, passageId, passageTitle, level, topic, sentenceIndex }]
const getSettings = () => ({ chunks: true, words: true, scope: true, ...(store.get("settings", {}) || {}) });

// 모든 지문은 passages.json 단일 소스(앱에서 직접 입력·저장하는 기능은 폐지, 2026-07-16 사용자 결정).
// 새 문제는 JSON을 자비스에게 주면 자비스가 passages.json에 커밋해 전체 배포한다.
// 난이도 우선(2026-07-21): 주제별로 저장된 코스를 난이도(Level)별로 재편해 보여준다.
const LEVEL_LABELS = { 1: "Level 1 · 입문", 2: "Level 2 · 기초", 3: "Level 3 · 중급" };
function rebuildCourse() {
  courses = createLevelCourses(baseData.courses, LEVEL_LABELS);
  // 재빌드 후 현재 코스 참조 갱신(사라졌으면 해제)
  if (course) course = courses.find((c) => c.id === course.id) || null;
}

// 앱 첫 화면은 항상 홈(코스 목록). 예전엔 마지막 읽던 지문으로 바로 복원했으나,
// 사용자 지시(2026-07-16)로 진입은 언제나 홈화면으로 고정한다(읽던 자리 표시는 지문 재진입 시 progress로 복원).
function bootScreen() {
  renderCourseList();
}

// ── 읽기 진행 저장(기기 저장소) ── 지문별 문장 상태(그은 선·임시 단어·검토 여부)를 담아,
// 단어장을 갔다 오거나 앱을 껐다 켜도 읽던 자리와 표시가 그대로 복원되게 한다.
const getProgress = () => store.get("progress", {});
// 완독 표시 구분용 - { pid: { chunkOk, hadWords } }. 끊기를 다 맞췄는지 + 모르는 단어를 담았는지.
const getDoneMeta = () => store.get("doneMeta", {});
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
    bootScreen();
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
function copyText(text, okMsg, onOk) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => { showToast(okMsg); if (onOk) onOk(); }).catch(() => showToast("복사가 안 됩니다. 칸을 눌러 직접 선택·복사하세요."));
  } else {
    showToast("복사가 안 됩니다. 칸을 눌러 직접 선택·복사하세요.");
  }
}

function setTop({ title, titleTranslation, onBack, showVocab, showSavedSentences }) {
  if (titleTranslationTimer) { clearTimeout(titleTranslationTimer); titleTranslationTimer = null; }
  el.title.textContent = title;
  el.title.classList.toggle("is-toggle", !!titleTranslation);
  el.title.onclick = titleTranslation ? () => {
    if (titleTranslationTimer) clearTimeout(titleTranslationTimer);
    el.title.textContent = titleTranslation;
    titleTranslationTimer = setTimeout(() => {
      el.title.textContent = title;
      titleTranslationTimer = null;
    }, TITLE_TRANSLATION_MS);
  } : null;
  if (titleTranslation) el.title.setAttribute("aria-label", "한글 제목을 3초간 보기");
  else el.title.removeAttribute("aria-label");
  el.back.innerHTML = ICON.back; // 유니코드 문자 대신 SVG 아이콘(글자 baseline 어긋남·폰트 편차 제거)
  // 화살표로 감싸 클릭 이벤트 객체가 onBack의 첫 인자로 새지 않게 한다.
  // (renderList(c)처럼 인자를 받는 함수를 직접 연결하면 MouseEvent가 c로 들어가 course를 덮어썼다.)
  el.back.onclick = () => onBack();
  el.vocab.style.display = showVocab ? "" : "none";
  el.vocab.onclick = renderVocab;
  el.savedSentences.style.display = showSavedSentences ? "" : "none";
  el.savedSentences.onclick = renderSavedSentences;
}

document.addEventListener("click", () => {
  if (openSentenceMenu) {
    openSentenceMenu.classList.remove("open");
    openSentenceMenu = null;
  }
});

function labeledBlock(label, text, mod) {
  const wrap = document.createElement("div"); wrap.className = "block";
  const l = document.createElement("div"); l.className = "block-label"; l.textContent = label;
  const b = document.createElement("div"); b.className = "block-body"; b.textContent = text;
  if (mod) b.classList.add(mod);
  wrap.append(l, b);
  return wrap;
}

// ── 코스 고르기 (최상위 화면) ──
// 지문 묶음(코스)이 여럿이라 먼저 코스를 고른 뒤 그 코스의 지문 목록으로 들어간다.
function renderCourseList() {
  currentPassage = null;
  course = null;
  const done = getDone();
  setBar(0);
  setTop({ title: "영어 독해", onBack: () => (window.location.href = "../../"), showVocab: true, showSavedSentences: true });

  const stage = el.stage;
  stage.className = "stage list-stage";
  stage.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "list-summary";
  summary.innerHTML = `<b>난이도 ${courses.length}단계</b> · 수집 단어 ${getVocab().length}개`;
  stage.appendChild(summary);

  const list = document.createElement("div");
  list.className = "passage-list";
  courses.forEach((c) => {
    const prog = courseProgress(c, done);
    // 이 레벨에 어떤 주제들이 섞여 있는지 부제로 보여준다(난이도 우선 - 한 레벨에 여러 주제).
    const topics = [...new Set(c.passages.map((p) => p.topic).filter(Boolean))];
    const sub = `${c.passageCount}개 지문${topics.length ? " · " + topics.join(" · ") : ""}`;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "passage-card course-card";
    card.innerHTML =
      `<span class="pc-body"><span class="pc-title">${c.title}${prog.cleared ? ' <span class="mine-badge">완주 ✓</span>' : ""}</span>` +
      `<span class="pc-en">${sub}</span></span>` +
      `<span class="pc-status${prog.cleared ? " done" : ""}">${prog.done} / ${prog.total}편</span>`;
    card.onclick = () => renderList(c);
    list.appendChild(card);
  });
  stage.appendChild(list);

  // 전역 액션(코스 무관) - 출제·노출 설정·끊는 기준은 최상위에 둔다.
  const actions = document.createElement("div");
  actions.className = "list-actions";
  const setBtn = document.createElement("button");
  setBtn.type = "button"; setBtn.className = "text-btn settings-open"; setBtn.textContent = "환경설정"; setBtn.onclick = openSettings;
  const guideBtn = document.createElement("button");
  guideBtn.type = "button"; guideBtn.className = "text-btn"; guideBtn.textContent = "끊는 기준"; guideBtn.onclick = openGuide;
  actions.append(guideBtn, setBtn);
  stage.appendChild(actions);
}

// ── 지문 목록 (선택한 코스 안) ──
function renderList(c) {
  if (c) course = c;
  if (!course) return renderCourseList();
  currentPassage = null; // 목록으로 나오면 '읽던 지문' 해제(단어장 백은 이 목록으로)
  const done = getDone();
  const reads = getReads();
  const prog = courseProgress(course, done);
  setBar(prog.ratio);
  setTop({ title: course.title, onBack: renderCourseList, showVocab: true, showSavedSentences: true });

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
  const doneMeta = getDoneMeta();
  const list = document.createElement("div");
  list.className = "passage-list";
  course.passages.forEach((p) => {
    const card = document.createElement("button");
    card.type = "button";
    const r = reads[p.id] || 0;
    const isDone = done.includes(p.id);
    const inProgress = !!progress[p.id]; // 저장된 진행이 있으면 첫 회독 중이어도 '읽는 중'
    const meta = doneMeta[p.id];
    // 완독 표시 3종: 완벽(끊기 다 맞고 모르는 단어 없음)=카드 딤드 / 끊기 틀림=끊기 태그 / 단어 담음=단어 태그
    let status, perfect = false;
    if (isDone) {
      const tags = [];
      if (meta && !meta.chunkOk) tags.push("끊기");
      if (meta && meta.hadWords) tags.push("단어");
      perfect = meta ? (meta.chunkOk && !meta.hadWords) : false;
      status = `${tags.length ? tags.join(" · ") + " · " : ""}완독 ✓${r > 1 ? ` · ${r}회독` : ""}`;
    } else {
      status = (r > 0 || inProgress) ? "읽는 중" : "아직 안 읽음";
    }
    card.className = "passage-card" + (perfect ? " done-perfect" : "");
    // 같은 레벨 안이라 Lv 배지 대신 주제(topic) 배지를 보여준다(난이도 우선).
    card.innerHTML =
      `<span class="lv topic">${p.topic || ""}</span>` +
      `<span class="pc-body"><span class="pc-title">${p.title}</span></span>` +
      `<span class="pc-status${isDone ? " done" : ""}">${status}</span>`;
    card.onclick = () => renderReading(p);
    list.appendChild(card);
  });
  stage.appendChild(list);
}

// ── 읽기 화면 ──
function renderReading(p) {
  currentPassage = p; // 단어장에서 이 지문으로 돌아온다
  const settings = getSettings();
  setBar(courseProgress(course, getDone()).ratio);
  setTop({ title: p.title, titleTranslation: p.titleKr, onBack: renderList, showVocab: true, showSavedSentences: true });

  const stage = el.stage;
  stage.className = "stage reading-stage";
  stage.innerHTML = "";

  // 첫 진입 1회 안내 - 첫 상호작용 시 사라지고 다시 나타나지 않음
  if (!store.get("seenIntro", false)) {
    const hint = document.createElement("div");
    hint.className = "first-hint";
    hint.id = "first-hint";
    hint.textContent = "단어 사이 틈을 눌러 선(/)을 긋고, 주요 단어를 눌러 담아 보세요. 문장 끝 [해석]으로 채점하고, 맨 아래 [전체 해석]으로 한꺼번에 펼칠 수 있습니다. 끊기·단어 터치를 켜고 끄는 건 홈의 환경설정에 있습니다.";
    stage.appendChild(hint);
    store.set("seenIntro", true);
  }

  let refreshDone = () => {};
  const article = document.createElement("div");
  article.className = "article";
  // 각 문장 해석이 끝날 때마다 하단 버튼 상태를 다시 계산한다(onReviewed 콜백).
  p.sentences.forEach((s, i) => article.appendChild(renderSentence(s, i, p, settings, () => refreshDone())));
  stage.appendChild(article);
  applyTouch(); // 토글 상태를 버튼·본문(no-chunk/no-word)에 반영

  // 하단 버튼 하나로 통합 - 아직 안 본 문장이 있으면 "전체 해석"(한꺼번에 펼쳐 채점),
  // 모든 문장을 해석하면 "완료"로 바뀌고 누르면 다음 행동 선택 창을 띄운다.
  // 끊어 읽기 채점을 끈(chunks OFF) 경우엔 해석 개념이 없어 바로 "완료"로 둔다.
  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.className = "btn btn-primary read-done";
  const allReviewed = () => !settings.chunks ||
    [...article.querySelectorAll(".sentence-block")].every((blk) => blk.querySelector(".review-detail"));
  refreshDone = () => {
    const done = allReviewed();
    doneBtn.dataset.mode = done ? "done" : "interpret";
    doneBtn.textContent = done ? "완료" : "전체 해석";
  };
  doneBtn.onclick = () => {
    if (doneBtn.dataset.mode === "done") { finishRound(p); return; }
    // 전체 해석 - 아직 안 본 문장을 모두 펼쳐 채점한 뒤 버튼을 "완료"로 전환
    article.querySelectorAll(".sentence-block").forEach((blk) => {
      if (!blk.querySelector(".review-detail")) {
        const rb = blk.querySelector(".review-btn");
        if (rb) rb.click();
      }
    });
    refreshDone();
  };
  refreshDone();

  // 하단 액션 줄 - 왼쪽 복사 버튼(지문 원문 전체) + 오른쪽 "전체 해석/완료" 버튼.
  // 원문은 문장 text만 공백으로 이어 붙인다(끊기·해설 제외, LLM에 통째로 물어볼 때 쓰도록).
  const actions = document.createElement("div");
  actions.className = "read-actions";
  const docCopyBtn = document.createElement("button");
  docCopyBtn.type = "button";
  docCopyBtn.className = "doc-copy-btn";
  docCopyBtn.innerHTML = ICON.copy;
  docCopyBtn.title = "지문 원문 전체 복사";
  docCopyBtn.setAttribute("aria-label", "지문 원문 전체 복사");
  docCopyBtn.onclick = () => {
    const full = p.sentences.map((raw) => normalizeSentence(raw).text).join(" ");
    copyText(full, "지문 원문을 복사했습니다.");
  };
  actions.appendChild(docCopyBtn);
  actions.appendChild(doneBtn);
  stage.appendChild(actions);

  // 지문 진입 시 항상 최상단부터 - 회독 완료 모달(다음 지문/한 번 더 읽기)을 하단에서 눌러도
  // 스크롤 컨테이너(.stage)의 이전 위치가 남지 않도록 리셋한다.
  stage.scrollTop = 0;
}

function renderSentence(rawS, sIndex, passage, settings, onReviewed) {
  // 신·구 스키마를 같은 모양으로 - 신규 필드 기본값·fallback을 한 지점에서 채운다(customPassages 하위호환).
  const s = normalizeSentence(rawS);
  const block = document.createElement("div");
  block.className = "sentence-block";
  block.dataset.sentenceIndex = String(sIndex);

  const line = document.createElement("div");
  line.className = "sentence-line";

  const tokens = tokenize(s.text);
  // 단어/숙어 타겟 - words 각 항목을 원문 토큰에 매칭(단일 낱말=1토큰, 숙어 "takes a bus"=연속 N토큰).
  // 뜻이 등록된 것만 터치 대상이라, 학습자는 낱말이든 표현이든 눌러 임시 수집한다.
  const targets = settings.words ? matchWordTargets(tokens, s.words || []) : [];
  const tokenToTarget = new Map(); // 토큰 인덱스 → 그 토큰이 속한 타겟(단어/숙어)
  targets.forEach((t) => t.indices.forEach((idx) => tokenToTarget.set(idx, t)));
  const spanByIndex = new Map(); // 토큰 인덱스 → span(숙어 그룹을 함께 하이라이트하려면 필요)
  // 단어장(영구)에 이미 담긴 단어 - 회독 때 '이미 아는 단어'로 은은히 표시(중앙 하단 점).
  const vocabKeys = settings.words ? new Set(getVocab().map((v) => v.wordKey)) : new Set();
  // 이 문장에 눌러 담을 수 있는 단어/숙어가 있는지 - 끊어읽기(chunks)를 꺼도 단어 공개·저장 버튼을 띄우기 위한 판정.
  const hasClickableWords = targets.length > 0;

  // 저장된 진행 복원 - 그은 선·임시 단어·검토 여부를 기기 저장소에서 되살린다.
  const saved = loadSentenceState(passage.id, sIndex) || {};
  const slashes = new Set(saved.slashes || []);
  // 임시 수집(flagged): 타겟 첫 토큰 인덱스 → {word, meaning, indices}. 저장된 첫 인덱스로 현재 타겟과 다시 잇는다(단일 낱말 하위호환).
  const flagged = new Map();
  (saved.flags || []).forEach(([fi, word, meaning]) => {
    const t = targets.find((x) => x.indices[0] === fi);
    if (t) flagged.set(fi, { word, meaning, indices: t.indices });
  });
  let reviewed = !!saved.reviewed;
  const gapEls = new Map(); // 틈 번호 → 요소

  const persist = () => saveSentenceState(passage.id, sIndex, {
    slashes: [...slashes],
    flags: [...flagged].map(([fi, v]) => [fi, v.word, v.meaning]),
    reviewed,
  });

  // 타겟(단어/숙어) 임시 수집 토글 - 숙어는 속한 토큰 전부를 함께 켜고 끈다.
  const toggleTarget = (t) => {
    const fi = t.indices[0];
    const paint = (on) => t.indices.forEach((idx) => {
      const sp = spanByIndex.get(idx); if (sp) sp.classList.toggle("flagged", on);
    });
    if (flagged.has(fi)) { flagged.delete(fi); paint(false); }
    else {
      flagged.set(fi, { word: t.word, meaning: t.meaning || "", indices: t.indices });
      paint(true);
      showToast("단어장에 임시 저장되었습니다.");
    }
    persist();
  };

  // 대표 추천 경계 + 허용/비추천 위치(0-based 토큰 틈 번호). 없으면 빈 Set(구스키마 = 추천/놓침만).
  const boundaries = chunkBoundaries(tokens, s.chunks);
  const allowedSet = boundarySet(s.breakRules, "allowed", tokens.length);
  const discouragedSet = boundarySet(s.breakRules, "discouraged", tokens.length);
  const gradeNow = () => gradeChunks(boundaries, allowedSet, discouragedSet, slashes);

  // 채점 표시 - 그은 선을 추천/허용/비추천/다른분할(neutral)/놓침(missed)으로 나눠 색+모양 병행.
  const applyGrade = () => {
    const g = gradeNow();
    g.recommended.forEach((b) => gapEls.get(b) && gapEls.get(b).classList.add("g-recommended"));
    g.allowed.forEach((b) => gapEls.get(b) && gapEls.get(b).classList.add("g-allowed"));
    g.discouraged.forEach((b) => gapEls.get(b) && gapEls.get(b).classList.add("g-discouraged"));
    g.neutral.forEach((b) => gapEls.get(b) && gapEls.get(b).classList.add("g-neutral"));
    g.missed.forEach((b) => gapEls.get(b) && gapEls.get(b).classList.add("slashed", "g-missed"));
  };
  const buildDetail = () => {
    const d = document.createElement("div");
    d.className = "review-detail";
    // 끊어읽기(chunks) ON일 때만 채점 이유·직독직해·자연해석·어순·문법·심화를 공개한다.
    if (settings.chunks) {
      // 사용자가 실제로 그은 비추천 위치의 이유만 카드 상단에 간결히(안 그은 비추천은 노출 안 함)
      const disc = buildDiscouragedReasons(gradeNow(), s);
      if (disc) d.appendChild(disc);
      const interp = buildChunks(s); // ① 직독직해(대표 추천 청킹 en 덩어리 + 이유 태그)
      interp.appendChild(buildNatural(s)); // ② 자연스러운 전체 해석을 같은 카드 안에 구분선으로 이어 붙인다
      d.appendChild(interp);
    }
    // 후(後) 확인: 이 문장에서 임시 수집한 단어들의 뜻을 공개 + 영구 저장(중복은 무시).
    // 끊어읽기를 꺼도 이 경로로 단어를 공개·저장해야 담은 단어가 소실되지 않는다.
    if (flagged.size) d.appendChild(buildCollectedWords([...flagged.values()], s, passage));
    if (settings.chunks) {
      if (s.wordOrderPoint) d.appendChild(buildWordOrder(s)); // ③ 핵심 어순/패턴(기본 노출)
      if (s.grammar && s.grammar.length) d.appendChild(buildGrammar(s)); // ④ 상세 문법(기본 접힘)
      if (s.insight && settings.scope) d.appendChild(buildScopeCard(s)); // ⑤ 심화 카드(scope ON)
    }
    // 끊어읽기가 꺼져 해설이 없고 담은 단어도 없으면 빈 카드 대신 안내.
    if (!settings.chunks && !flagged.size) {
      const note = document.createElement("div");
      note.className = "cw-row cw-empty";
      note.textContent = "이 문장에서 담은 단어가 없습니다. 모르는 단어를 눌러 담아 보세요.";
      d.appendChild(note);
    }
    return d;
  };

  tokens.forEach((tok, i) => {
    const span = document.createElement("span");
    span.textContent = tok.raw;
    span.className = "w";
    spanByIndex.set(i, span);
    if (tok.clean && vocabKeys.has(tok.clean)) span.classList.add("saved");
    // 뜻이 등록된 단어/숙어만 터치 대상 - 일반 단어까지 터치되면 끊기 틈과 오터치가 잦아 제한(사용자 지시).
    // 숙어는 속한 토큰 아무 곳이나 눌러도 그 표현 전체가 함께 켜진다(낱말 몸통만 반응해 끊기 틈은 침범 안 함).
    const target = tokenToTarget.get(i);
    if (target) {
      span.classList.add("word");
      if (flagged.has(target.indices[0])) span.classList.add("flagged"); // 복원
      // 선(先) 유추: 터치해도 뜻을 바로 열지 않고 '임시 수집'으로만 표시한다.
      span.onclick = (e) => {
        e.stopPropagation();
        removeHint();
        if (reviewed) return; // 해석 후엔 뜻이 이미 공개돼 표시가 의미 없다
        toggleTarget(target);
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
        // 좌우 인접 단어의 한 글자 위까지 덮는 투명 터치 확장(레이아웃 밖 absolute라 공백은 그대로)
        const hit = document.createElement("span");
        hit.className = "gap-hit";
        hit.setAttribute("aria-hidden", "true");
        gap.appendChild(hit);
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

  // 문장 끝 버튼 - 첫 클릭은 채점 + 해설 공개, 이후 클릭마다 해설 접힘/펼침 토글.
  // 채점 결과(선 색)와 잠금은 유지된다 - 접어도 채점이 무르지 않는다.
  // 끊어읽기가 꺼져도 담을 주요 단어가 있으면 버튼을 띄워 단어 뜻 공개·저장 경로를 남긴다.
  const hasReviewBtn = settings.chunks || hasClickableWords;
  let detail = null;
  if (hasReviewBtn) {
    const reviewBtn = document.createElement("button");
    reviewBtn.type = "button";
    reviewBtn.className = "review-btn";
    reviewBtn.textContent = settings.chunks ? "해석" : "단어 뜻 보기";
    reviewBtn.onclick = (e) => {
      e.stopPropagation();
      removeHint();
      if (reviewed) {
        if (detail) detail.hidden = !detail.hidden;
        return;
      }
      reviewed = true;
      if (settings.chunks) applyGrade();
      detail = buildDetail();
      block.appendChild(detail);
      persist();
      if (onReviewed) onReviewed(); // 하단 버튼(전체 해석 ↔ 완료) 상태 갱신
    };
    line.appendChild(reviewBtn);

    // "해석" 왼쪽 메뉴 - 같은 위치에서 복사와 어려운 문장 저장을 고른다.
    const tools = document.createElement("div");
    tools.className = "sentence-tools";
    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "sentence-menu-btn";
    menuBtn.innerHTML = ICON.more;
    menuBtn.title = "문장 메뉴";
    menuBtn.setAttribute("aria-label", "문장 메뉴");
    menuBtn.setAttribute("aria-expanded", "false");

    const menu = document.createElement("div");
    menu.className = "sentence-menu-list";
    menu.setAttribute("role", "menu");
    const copyItem = document.createElement("button");
    copyItem.type = "button";
    copyItem.textContent = "복사";
    copyItem.setAttribute("role", "menuitem");

    const savedKey = `${passage.id}:${sIndex}`;
    const saveItem = document.createElement("button");
    saveItem.type = "button";
    saveItem.setAttribute("role", "menuitem");
    const syncSaveLabel = () => {
      const saved = getSavedSentences().some((item) => item.key === savedKey);
      saveItem.textContent = saved ? "문장 저장 해제" : "어려운 문장 저장";
    };
    syncSaveLabel();

    const closeMenu = () => {
      tools.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
      if (openSentenceMenu === tools) openSentenceMenu = null;
    };
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      const opening = !tools.classList.contains("open");
      if (openSentenceMenu && openSentenceMenu !== tools) openSentenceMenu.classList.remove("open");
      if (opening) {
        const rect = menuBtn.getBoundingClientRect();
        const openBelow = rect.top < 150;
        menu.classList.toggle("below", openBelow);
        menu.style.left = `${Math.max(8, rect.right - 154)}px`;
        if (openBelow) {
          menu.style.top = `${rect.bottom + 4}px`;
          menu.style.bottom = "auto";
        } else {
          menu.style.top = "auto";
          menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        }
      }
      tools.classList.toggle("open", opening);
      menuBtn.setAttribute("aria-expanded", String(opening));
      openSentenceMenu = opening ? tools : null;
    };
    copyItem.onclick = (e) => {
      e.stopPropagation();
      copyText(s.text, "문장을 복사했습니다.");
      closeMenu();
    };
    saveItem.onclick = (e) => {
      e.stopPropagation();
      const saved = getSavedSentences();
      if (saved.some((item) => item.key === savedKey)) {
        store.set("savedSentences", saved.filter((item) => item.key !== savedKey));
        showToast("어려운 문장에서 뺐습니다.");
      } else {
        saved.push({
          key: savedKey,
          text: s.text,
          passageId: passage.id,
          passageTitle: passage.titleKr,
          level: passage.level,
          topic: passage.topic || "",
          sentenceIndex: sIndex,
          translation: s.naturalTranslation,
        });
        store.set("savedSentences", saved);
        showToast("어려운 문장에 저장했습니다.");
      }
      syncSaveLabel();
      closeMenu();
    };
    menu.append(copyItem, saveItem);
    tools.append(menuBtn, menu);
    line.appendChild(tools);
  }

  block.appendChild(line);

  // 이미 검토를 마친 문장이면(복원) 채점 색과 해설을 펼친 상태로 되살린다.
  if (reviewed && hasReviewBtn) {
    if (settings.chunks) applyGrade();
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
    translation: s.naturalTranslation,
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

// 사용자가 실제로 그은 비추천 위치의 개선 이유(경고가 아니라 가이드). 선택한 위치만 보여준다.
function buildDiscouragedReasons(grade, s) {
  if (!grade.discouraged.length) return null;
  const map = reasonByBoundary(s.breakRules, "discouraged");
  const host = document.createElement("div");
  host.className = "disc-reasons";
  grade.discouraged.forEach((b) => {
    const r = map.get(b);
    if (!r) return;
    const row = document.createElement("div");
    row.className = "disc-row";
    row.textContent = r;
    host.appendChild(row);
  });
  return host.children.length ? host : null;
}

// 자연스러운 전체 해석 - 직독직해(조각)와 달리 한 문장으로 매끄럽게 읽히는 완역.
function buildNatural(s) {
  const host = document.createElement("div");
  host.className = "natural-trans";
  const label = document.createElement("div"); label.className = "nt-label"; label.textContent = "자연스러운 해석";
  const body = document.createElement("div"); body.className = "nt-body"; body.textContent = s.naturalTranslation;
  host.append(label, body);
  return host;
}

// 핵심 어순/패턴 - 문장당 1개만 기본 노출(상세 문법은 접어 둔다).
function buildWordOrder(s) {
  const host = document.createElement("div");
  host.className = "word-order";
  const t = document.createElement("div"); t.className = "wo-title"; t.textContent = s.wordOrderPoint.title;
  const e = document.createElement("div"); e.className = "wo-exp"; e.textContent = s.wordOrderPoint.explanation;
  host.append(t, e);
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

// 검토 후 공개되는 상세 문법 - 기본 접힘. "문법 자세히 보기"로 펼친다(핵심 어순만 기본 노출).
// 해석 버튼의 review-detail 전체 접기와 별개로, 이 블록 안에서만 목록을 여닫는다.
function buildGrammar(s) {
  const host = document.createElement("div");
  host.className = "grammar-block";

  const list = document.createElement("div");
  list.className = "grammar-list";
  list.hidden = true;
  s.grammar.forEach((g) => {
    const row = document.createElement("div");
    row.className = "grammar-row";
    const tag = document.createElement("span"); tag.className = "grammar-tag"; tag.textContent = g.label;
    const note = document.createElement("span"); note.className = "grammar-note"; note.textContent = g.note;
    row.append(tag, note);
    list.appendChild(row);
  });

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "grammar-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = `문법 자세히 보기 (${s.grammar.length})`;
  toggle.onclick = (e) => {
    e.stopPropagation();
    const open = list.hidden; // 지금 열리는지
    list.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.textContent = open ? "문법 접기" : `문법 자세히 보기 (${s.grammar.length})`;
  };

  host.append(toggle, list);
  return host;
}

// 구조가 특히 어려운 문장의 심화 해설 카드(설정 ON일 때 검토 후 함께 공개).
// 자연스러운 해석은 위 buildNatural이 전담하므로 여기서는 공식·왜·비문만 보여준다(중복 제거).
function buildScopeCard(s) {
  const card = document.createElement("div");
  card.className = "scope-card";
  card.appendChild(labeledBlock("공식", s.insight.formula, "formula"));
  card.appendChild(labeledBlock("왜 이 구조인가", s.insight.why));
  card.appendChild(labeledBlock("이렇게 쓰면 비문", s.insight.wrong, "wrong-example"));
  return card;
}

// 버튼 요소 생성 헬퍼(라벨·클래스·클릭).
function mkBtn(label, cls, onClick) {
  const b = document.createElement("button");
  b.type = "button"; b.className = cls; b.textContent = label; b.onclick = onClick;
  return b;
}

// 같은 코스에서 지금 지문 바로 다음(level 정렬 순) 지문. 마지막이면 null.
function nextPassageInCourse(p) {
  if (!course) return null;
  const idx = course.passages.findIndex((x) => x.id === p.id);
  return idx >= 0 ? (course.passages[idx + 1] || null) : null;
}

// 이 지문에서 모르는 단어(수집)를 담았는지 - 완독 표시 구분용.
function passageHasVocab(pid) {
  return getVocab().some((v) => v.passageId === pid);
}
// 완독 시점 끊기 정확도 - 모든 문장에서 추천 경계를 정확히 긋고(놓침 0) 잘못 그은 곳(비추천·다른 분할)이 없으면 true.
// 끊기 기능을 끈(chunks OFF) 경우엔 끊기 이슈 없음으로 본다.
function computeChunkOk(p) {
  if (!getSettings().chunks) return true;
  const sents = (getProgress()[p.id] || {}).sentences || [];
  for (let i = 0; i < p.sentences.length; i++) {
    const s = normalizeSentence(p.sentences[i]);
    const tokens = tokenize(s.text);
    const boundaries = chunkBoundaries(tokens, s.chunks);
    const allowedSet = boundarySet(s.breakRules, "allowed", tokens.length);
    const discouragedSet = boundarySet(s.breakRules, "discouraged", tokens.length);
    const slashes = (sents[i] && sents[i].slashes) || [];
    const g = gradeChunks(boundaries, allowedSet, discouragedSet, slashes);
    if (g.missed.length || g.neutral.length || g.discouraged.length) return false;
  }
  return true;
}

// 지문 완독 처리 - 회독수·완독 기록을 올리고 이 지문의 임시 진행(그은 선·임시 단어)을 비운다(영구 단어장은 유지).
// 해석을 안 봐도 자유롭게 완독할 수 있다(흐름 우선). 다음에 뭘 할지는 완료 후 선택 창에서 사용자가 고른다.
function finishRound(p) {
  const reads = getReads();
  const round = (reads[p.id] || 0) + 1;
  const done = getDone();
  const wasCleared = courseProgress(course, done).cleared;
  reads[p.id] = round;
  store.set("reads", reads);
  if (!done.includes(p.id)) { done.push(p.id); store.set("done", done); }
  // 완독 품질 기록(진행 리셋 전) - 끊기를 다 맞췄는지 + 모르는 단어를 담았는지로 목록 표시를 나눈다.
  const meta = getDoneMeta();
  meta[p.id] = { chunkOk: computeChunkOk(p), hadWords: passageHasVocab(p.id) };
  store.set("doneMeta", meta);
  clearPassageProgress(p.id);
  const prog = courseProgress(course, done);
  if (prog.cleared && !wasCleared) { showClearModal(); return; } // 코스 전체를 처음 완주하면 클리어 연출 우선
  showNextActionModal(p);
}

// 완독 후 - 다음에 뭘 할지 한 자리에서 고르게 한다(다음 지문/재독/목록).
// 부연 문구 없이 픽토그램 + 지문 제목만, 우상단 X로 닫기, 세 버튼은 동일 스타일 + 앞에 SVG 아이콘.
function showNextActionModal(p) {
  const next = nextPassageInCourse(p);
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "app-modal next-action-modal";
  const close = () => backdrop.remove();

  const x = document.createElement("button");
  x.type = "button"; x.className = "modal-close"; x.setAttribute("aria-label", "닫기");
  x.innerHTML = ICON.close;
  x.onclick = close;

  const head = document.createElement("div");
  head.className = "na-head";
  head.innerHTML = `<div class="na-icon">${ICON.book}</div><div class="na-title">${p.titleKr}</div>`;

  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const item = (icon, label, on) => {
    const b = mkBtn("", "btn na-item", on);
    b.innerHTML = `${icon}<span>${label}</span>`;
    return b;
  };
  if (next) actions.appendChild(item(ICON.next, "다음 지문", () => { close(); renderReading(next); }));
  actions.appendChild(item(ICON.repeat, "한 번 더 읽기", () => { close(); renderReading(p); }));
  actions.appendChild(item(ICON.list, "지문 목록으로", () => { close(); renderList(course); }));

  modal.append(x, head, actions);
  backdrop.appendChild(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.body.appendChild(backdrop);
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
  ok.onclick = () => { backdrop.remove(); renderCourseList(); };
  modal.appendChild(ok);
  backdrop.appendChild(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) { backdrop.remove(); renderCourseList(); } });
  document.body.appendChild(backdrop);
}

// ── 내 단어장 ──
function renderVocab() {
  // 읽던 지문에서 왔으면 그 지문으로 복귀(진행 유지), 목록에서 왔으면 목록으로
  const back = currentPassage ? () => renderReading(currentPassage) : () => (course ? renderList(course) : renderCourseList());
  setTop({ title: "내 단어장", onBack: back, showVocab: false, showSavedSentences: false });
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
  head.innerHTML = `<b>${vocab.length}개</b> 수집 · 뜻과 해석을 눌러 확인하세요`;
  stage.appendChild(head);

  const listEl = document.createElement("div");
  listEl.className = "vocab-list";
  vocab.forEach((v) => {
    const item = document.createElement("div");
    item.className = "vocab-item";

    const row = document.createElement("div");
    row.className = "vocab-row";
    const word = document.createElement("div");
    word.className = "vocab-word"; word.textContent = v.word;
    const del = document.createElement("button");
    del.type = "button"; del.className = "vocab-del"; del.innerHTML = ICON.close; del.setAttribute("aria-label", "단어 삭제");
    row.append(word, del);

    // 뜻·해석은 먼저 감춘다. 원문 문장은 뜻과 해석을 잇는 기준점으로 항상 보인다.
    const detail = document.createElement("div");
    detail.className = "vocab-detail vocab-study-detail";
    const translation = vocabTranslation(v);
    detail.append(
      buildInlineToggle("뜻 보기", v.meaning || "뜻 미등록 - 직접 채워 보세요", !v.meaning),
      (() => {
        const sentence = document.createElement("div");
        sentence.className = "vd-ex";
        sentence.textContent = v.sentence;
        return sentence;
      })(),
      buildInlineToggle("해석 보기", translation || "해석을 찾을 수 없습니다.", !translation),
    );

    del.onclick = () => {
      store.set("vocab", getVocab().filter((x) => x.wordKey !== v.wordKey));
      renderVocab();
    };

    item.append(row, detail);
    listEl.appendChild(item);
  });
  stage.appendChild(listEl);
}

// 저장 당시의 해석을 우선 사용하고, 이전 버전의 저장 항목은 원본 지문에서 안전하게 찾아 보완한다.
function savedSentenceTranslation(item) {
  if (item.translation) return item.translation;
  const passage = (baseData?.courses || []).flatMap((courseData) => courseData.passages || [])
    .find((candidate) => candidate.id === item.passageId);
  const sentence = (passage?.sentences || []).find((candidate) => normalizeSentence(candidate).text === item.sentence || normalizeSentence(candidate).text === item.text);
  return sentence ? normalizeSentence(sentence).naturalTranslation : "";
}

function vocabTranslation(vocab) { return savedSentenceTranslation(vocab); }

// 뜻·해석을 아래에 펼치지 않고, 보기 바 자체의 글자로 교체한다.
function buildInlineToggle(label, value, isEmpty) {
  const host = document.createElement("div");
  host.className = "vocab-reveal";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "vocab-reveal-toggle";
  const labelText = document.createElement("span");
  labelText.className = "vocab-toggle-label";
  labelText.textContent = label;
  const valueText = document.createElement("span");
  valueText.className = "vocab-toggle-value";
  valueText.textContent = value;
  let revealed = false;
  const paint = () => {
    toggle.classList.toggle("is-revealed", revealed);
    toggle.classList.toggle("vd-empty", revealed && isEmpty);
    toggle.setAttribute("aria-expanded", String(revealed));
    toggle.setAttribute("aria-label", revealed ? value : label);
  };
  toggle.onclick = () => {
    revealed = !revealed;
    paint();
  };
  paint();
  toggle.append(labelText, valueText);
  host.append(toggle);
  return host;
}

// ── 어려운 문장 ──
function renderSavedSentences() {
  // 단어장과 동일하게, 읽던 지문이 있으면 그 자리로 돌아간다.
  const back = currentPassage ? () => renderReading(currentPassage) : () => (course ? renderList(course) : renderCourseList());
  setTop({ title: "어려운 문장", onBack: back, showVocab: false, showSavedSentences: false });
  const stage = el.stage;
  stage.className = "stage vocab-stage";
  stage.innerHTML = "";

  const saved = getSavedSentences();
  if (saved.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "아직 저장한 문장이 없습니다. 문장 끝 메뉴에서 어려운 문장을 저장해 보세요.";
    stage.appendChild(empty);
    return;
  }

  const head = document.createElement("div");
  head.className = "list-summary";
  head.innerHTML = `<b>${saved.length}개</b> 저장 · 문장을 누르면 원래 지문에서 다시 읽습니다`;
  stage.appendChild(head);

  const listEl = document.createElement("div");
  listEl.className = "vocab-list";
  saved.forEach((item) => {
    const card = document.createElement("div");
    card.className = "vocab-item";
    const row = document.createElement("div");
    row.className = "vocab-row";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "saved-sentence-open";
    open.textContent = item.text;
    open.setAttribute("aria-label", "원래 지문에서 이 문장 다시 읽기");
    const del = document.createElement("button");
    del.type = "button";
    del.className = "vocab-del";
    del.innerHTML = ICON.close;
    del.setAttribute("aria-label", "어려운 문장 삭제");

    const detail = document.createElement("div");
    detail.className = "vocab-detail vocab-study-detail";
    const translation = savedSentenceTranslation(item);
    detail.append(buildInlineToggle("해석 보기", translation || "해석을 찾을 수 없습니다.", !translation));

    open.onclick = () => openSavedSentence(item);
    del.onclick = () => {
      store.set("savedSentences", getSavedSentences().filter((savedItem) => savedItem.key !== item.key));
      renderSavedSentences();
    };
    row.append(open, del);
    card.append(row, detail);
    listEl.appendChild(card);
  });
  stage.appendChild(listEl);
}

function openSavedSentence(item) {
  const passage = (baseData?.courses || []).flatMap((dataCourse) => dataCourse.passages || [])
    .find((candidate) => candidate.id === item.passageId);
  if (!passage) {
    showToast("원래 지문을 찾을 수 없습니다.");
    return;
  }
  course = courses.find((candidate) => candidate.passageById(item.passageId)) || null;
  renderReading(passage);
  requestAnimationFrame(() => {
    const target = el.stage.querySelector(`.sentence-block[data-sentence-index="${item.sentenceIndex}"]`);
    if (target) target.scrollIntoView({ block: "center" });
  });
}

// ── 노출 설정 ──
function openSettings() {
  const s = getSettings();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "app-modal settings-modal";

  const title = document.createElement("div");
  title.className = "modal-msg"; title.textContent = "환경설정";
  const desc = document.createElement("div");
  desc.className = "modal-sub";
  desc.textContent = "도움 노출과 터치 대상을 직접 정합니다. 익숙해지면 하나씩 꺼 스스로 읽어 보세요.";
  modal.append(title, desc);

  // 토글 한 줄을 만드는 헬퍼(라벨 + 체크박스).
  const addToggle = (bag, key, label, checked) => {
    const rowL = document.createElement("label");
    rowL.className = "toggle-row";
    const span = document.createElement("span"); span.textContent = label;
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = !!checked;
    bag[key] = cb;
    rowL.append(span, cb);
    modal.appendChild(rowL);
  };
  const addSubHead = (text) => {
    const h = document.createElement("div");
    h.className = "settings-sub-head"; h.textContent = text;
    modal.appendChild(h);
  };

  // 1) 도움 노출 설정
  const toggles = {};
  addToggle(toggles, "chunks", "끊어 읽기 긋기 · 해석 채점", s.chunks);
  addToggle(toggles, "words", "단어 뜻 보기 · 수집", s.words);
  addToggle(toggles, "scope", "검토 후 구조 심화 해설", s.scope);

  // 2) 터치 대상 - 예전 상단바 토글을 이리로 옮김(끊기 틈과 단어가 붙어 생기는 오터치를 미리 조절).
  addSubHead("터치 대상");
  const touchToggles = {};
  addToggle(touchToggles, "chunk", "끊기 틈 터치", touchChunk);
  addToggle(touchToggles, "word", "단어 터치", touchWord);

  const ok = document.createElement("button");
  ok.type = "button"; ok.className = "btn btn-primary"; ok.textContent = "저장";
  ok.onclick = () => {
    store.set("settings", {
      chunks: toggles.chunks.checked,
      words: toggles.words.checked,
      scope: toggles.scope.checked,
    });
    touchChunk = touchToggles.chunk.checked;
    touchWord = touchToggles.word.checked;
    saveTouch();
    backdrop.remove();
    course ? renderList(course) : renderCourseList();
  };
  modal.appendChild(ok);
  backdrop.appendChild(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);
}
