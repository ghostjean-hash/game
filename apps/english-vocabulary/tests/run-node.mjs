// english-vocabulary 순수 로직 회귀 테스트. 실행: node apps/english-vocabulary/tests/run-node.mjs
// deck.js(학습 순환·외움/모름·바퀴·undo·보관함 복습·저장 복원)와 words.json 무결성을 검증한다.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createDeck, ARCHIVE_TIER } from "../src/core/deck.js";
import { VIEW, initialCardView, resolveKey } from "../src/core/viewstate.js";

const here = dirname(fileURLToPath(import.meta.url));
// manifest에서 첫 available 세트를 로드(앱 부팅부와 동일 경로).
const MANIFEST = JSON.parse(readFileSync(join(here, "../src/data/manifest.json"), "utf8"));
const ACTIVE = MANIFEST.sets.find((s) => s.available);
const DATA = JSON.parse(readFileSync(join(here, "../src/data/", ACTIVE.file), "utf8"));

let pass = 0;
let fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; console.error("  ✗ FAIL:", msg); }
}
function eq(a, b, msg) { ok(a === b, `${msg} (기대 ${b}, 실제 ${a})`); }

// 결정적 rng - 셔플을 고정해 테스트 재현성 확보.
function seededRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// 현재 단어를 계속 처리하며 모두 외우는 헬퍼(무한루프 방지 상한).
function markAll(deck, type, now = "2026-07-23T00:00:00Z") {
  let guard = 0;
  while (deck.current() && guard++ < 10000) deck.mark(type, now);
}

// --- 1. 세트 데이터 + manifest 무결성 ---
(() => {
  const ids = DATA.words.map((w) => w.id);
  ok(DATA.words.length >= 20, "샘플 단어 20개 이상");
  ok(new Set(ids).size === ids.length, "단어 id 유일");
  ok(ids.every((id) => /^ev-s\d{2}-\d{4}$/.test(id)), "id는 ev-sNN-NNNN 형식(독해 앱과 충돌 방지)");
  ok(/^ev-set-\d{3}$/.test(DATA.setId), "setId는 ev-set-NNN 형식");
  ok(DATA.words.every((w) => w.setId === DATA.setId), "단어 setId가 세트 setId와 일치");
  ok(DATA.words.every((w) => w.word && Array.isArray(w.meaningKr) && w.meaningKr.length >= 1), "word·meaningKr 필수");
  ok(DATA.words.every((w) => w.example && w.exampleKr), "예문·예문해석 필수");
  const POS_OK = new Set(["명사", "동사", "형용사", "부사", "전치사", "접속사", "대명사", "감탄사", "한정사", "조동사", "수사"]);
  ok(DATA.words.every((w) => typeof w.pos === "string" && POS_OK.has(w.pos)), "모든 단어에 허용 품사(pos) 존재");
  // manifest 정합 (초중고 3000 = 15세트 × 200, docs/vocab-master-plan.md)
  eq(MANIFEST.sets.length, 15, "manifest에 15세트 슬롯");
  eq(MANIFEST.setSize, 200, "세트 크기 200");
  eq(MANIFEST.totalTarget, 3000, "전체 목표 3000");
  ok(ACTIVE && ACTIVE.count === DATA.words.length, "manifest count가 실제 세트 단어 수와 일치");
})();

// --- 2. 외움/모름 기본 동작 ---
(() => {
  const deck = createDeck(DATA, null, seededRng(1));
  const first = deck.current();
  ok(first !== null, "초기 현재 단어 존재");
  deck.mark("known", "t1");
  eq(deck.stats().learned, 1, "외움 처리 시 learned +1");
  eq(deck.stats().remaining, DATA.words.length - 1, "외움 시 남은 수 -1");
  ok(deck.serialize().progress[first.id].status === "learned", "외운 단어는 learned 상태로 보관(영구삭제 아님)");

  const deck2 = createDeck(DATA, null, seededRng(1));
  const f2 = deck2.current();
  deck2.mark("unknown", "t1");
  eq(deck2.stats().learned, 0, "모름 처리 시 learned 그대로");
  eq(deck2.serialize().progress[f2.id].status, "active", "모름 단어는 active 유지");
  eq(deck2.serialize().progress[f2.id].unknownCount, 1, "모름 카운트 증가");
})();

// --- 3. 모름 단어는 이번 바퀴에 즉시 재출제되지 않는다 ---
(() => {
  const deck = createDeck(DATA, null, seededRng(7));
  const f = deck.current();
  deck.mark("unknown", "t1");
  ok(deck.current().id !== f.id, "모름 직후 같은 단어가 즉시 다시 나오지 않음");
})();

// --- 4. 한 바퀴 후 남은 단어만 반복 + 전부 외우면 세트 완료 ---
(() => {
  const deck = createDeck(DATA, null, seededRng(3));
  // 첫 바퀴: 절반만 외우고 절반은 모름
  const n = DATA.words.length;
  for (let i = 0; i < n; i++) {
    ok(deck.current() !== null, `첫 바퀴 ${i + 1}번째 단어 존재`);
    deck.mark(i % 2 === 0 ? "known" : "unknown", "t");
  }
  eq(deck.stats().learned, n / 2, "첫 바퀴에 절반 외움");
  eq(deck.stats().remaining, n / 2, "남은 active는 절반");
  ok(deck.round() >= 2, "한 바퀴 끝나면 다음 바퀴로 넘어감");

  // 나머지 전부 외우기 → 완료
  markAll(deck, "known", "t");
  eq(deck.stats().remaining, 0, "전부 외우면 남은 수 0");
  ok(deck.stats().completed, "active 0이면 세트 완료");
  ok(deck.current() === null, "완료 후 현재 단어 없음");
})();

// --- 5. 저장/복원(새로고침·재실행) ---
(() => {
  const deck = createDeck(DATA, null, seededRng(5));
  deck.mark("known", "t1");
  deck.mark("unknown", "t2");
  const saved = JSON.parse(JSON.stringify(deck.serialize())); // localStorage 왕복 모사
  const restored = createDeck(DATA, saved, seededRng(5));
  eq(restored.stats().learned, deck.stats().learned, "복원 후 외운 수 동일");
  eq(restored.stats().remaining, deck.stats().remaining, "복원 후 남은 수 동일");
  eq(restored.round(), deck.round(), "복원 후 바퀴 번호 동일");
})();

// --- 6. undo 정확 복원 ---
(() => {
  const deck = createDeck(DATA, null, seededRng(9));
  const before = deck.stats().learned;
  const f = deck.current();
  deck.mark("known", "t1");
  ok(deck.canUndo(), "처리 후 undo 가능");
  eq(deck.stats().learned, before + 1, "외움으로 learned 증가");
  deck.undo();
  eq(deck.stats().learned, before, "undo 후 learned 원복");
  eq(deck.serialize().progress[f.id].status, "active", "undo로 단어 active 원복");
  eq(deck.current().id, f.id, "undo 후 현재 단어가 처리 직전 단어로 복원");
  ok(!deck.canUndo(), "undo는 1회만(연속 불가)");
})();

// --- 7. 보관함 수동 복습: 모름이면 active 복귀, 기억남이면 유지 ---
(() => {
  const deck = createDeck(DATA, null, seededRng(11));
  deck.mark("known", "t1");
  deck.mark("known", "t2");
  const learned = deck.learnedWords();
  eq(learned.length, 2, "보관함에 외운 단어 2개");

  const back = learned[0].id;
  deck.reviewMark(back, false, "r1"); // 모름 → 복귀
  eq(deck.serialize().progress[back].status, "active", "복습에서 모름이면 active 복귀");
  eq(deck.stats().learned, 1, "복귀로 learned -1");
  ok(deck.serialize().progress[back].lastReviewedAt === "r1", "복습 시각 기록");

  const keep = deck.learnedWords()[0].id;
  deck.reviewMark(keep, true, "r2"); // 기억남 → 유지
  eq(deck.serialize().progress[keep].status, "learned", "복습에서 기억남이면 learned 유지");

  // 복귀한 단어는 다시 학습 대상(active)에 포함되어야 한다.
  const activeNow = DATA.words.filter((w) => deck.serialize().progress[w.id].status === "active");
  ok(activeNow.some((w) => w.id === back), "복귀 단어가 다시 학습 대상에 포함");
})();

// --- 8. 원본 단어가 바뀌어도 진행 보존 ---
(() => {
  const deck = createDeck(DATA, null, seededRng(13));
  deck.mark("known", "t1");
  const saved = deck.serialize();
  const learnedId = deck.learnedWords()[0].id;
  // 원본에 새 단어 추가된 상황 모사
  const grown = { ...DATA, words: [...DATA.words, { id: "ev-s01-9999", setId: DATA.setId, word: "extra", meaningKr: ["추가"], example: "An extra word.", exampleKr: "추가 단어." }] };
  const restored = createDeck(grown, saved, seededRng(13));
  eq(restored.serialize().progress[learnedId].status, "learned", "기존 외운 단어 진행 유지");
  eq(restored.serialize().progress["ev-s01-9999"].status, "active", "새 단어는 active로 합류");
  eq(restored.stats().total, grown.words.length, "세트 크기는 새 원본 기준");
})();

// --- 9. 카드 표시 단계(QUESTION/ANSWER) + 키 매핑: 회상 강제 규칙 ---
(() => {
  // 새 단어 진입 시 항상 QUESTION(단어만 보이는 상태).
  eq(initialCardView(), VIEW.QUESTION, "새 단어 진입은 QUESTION 상태");

  // QUESTION: 스페이스·Enter만 뜻 확인. 판정 키(1·2·←·→)는 무시되어 정답 공개 전 판정 불가.
  eq(resolveKey(VIEW.QUESTION, " "), "reveal", "QUESTION에서 스페이스=뜻 확인");
  eq(resolveKey(VIEW.QUESTION, "Enter"), "reveal", "QUESTION에서 Enter=뜻 확인");
  eq(resolveKey(VIEW.QUESTION, "1"), null, "QUESTION에서 1은 판정 안 됨");
  eq(resolveKey(VIEW.QUESTION, "2"), null, "QUESTION에서 2는 판정 안 됨");
  eq(resolveKey(VIEW.QUESTION, "ArrowLeft"), null, "QUESTION에서 ←는 판정 안 됨");
  eq(resolveKey(VIEW.QUESTION, "ArrowRight"), null, "QUESTION에서 →는 판정 안 됨");

  // ANSWER: ←/1=몰랐음(unknown), →/2=알았음(known). 스페이스·Enter는 무시(자동 진행 방지).
  eq(resolveKey(VIEW.ANSWER, "ArrowLeft"), "unknown", "ANSWER에서 ←=몰랐음");
  eq(resolveKey(VIEW.ANSWER, "1"), "unknown", "ANSWER에서 1=몰랐음");
  eq(resolveKey(VIEW.ANSWER, "ArrowRight"), "known", "ANSWER에서 →=알았음");
  eq(resolveKey(VIEW.ANSWER, "2"), "known", "ANSWER에서 2=알았음");
  eq(resolveKey(VIEW.ANSWER, " "), null, "ANSWER에서 스페이스는 자동 진행 안 함");
  eq(resolveKey(VIEW.ANSWER, "Enter"), null, "ANSWER에서 Enter는 자동 진행 안 함");
})();

// --- 10. 판정 의미(회상 흐름이 의존): 알았음=learned, 몰랐음=active 유지 + Undo 복원 ---
(() => {
  const deck = createDeck(DATA, null, seededRng(21));
  const f = deck.current();
  // "알았음"(known) → learned로 이동, learnedAt 기록
  deck.mark("known", "k1");
  eq(deck.serialize().progress[f.id].status, "learned", "알았음 처리 시 learned로 이동");
  ok(deck.serialize().progress[f.id].learnedAt === "k1", "알았음 처리 시 learnedAt 기록");

  const g = deck.current();
  // "몰랐음"(unknown) → active 유지, unknownCount 증가
  deck.mark("unknown", "u1");
  eq(deck.serialize().progress[g.id].status, "active", "몰랐음 처리 후에도 active 유지");
  eq(deck.serialize().progress[g.id].unknownCount, 1, "몰랐음 처리 시 unknownCount 증가");

  // Undo → 직전(몰랐음) 단어를 현재로 복원(공개 상태로 다시 판정 가능)
  ok(deck.canUndo(), "판정 후 Undo 가능");
  deck.undo();
  eq(deck.current().id, g.id, "Undo 후 현재 단어가 직전 판정 단어로 복원");
  eq(deck.serialize().progress[g.id].unknownCount, 0, "Undo로 unknownCount 원복");
})();

// --- 11. 아카이브 KNOWN(이미 아는 단어): 세트 크기에서 통째 제외 + 되살리기 ---
(() => {
  const deck = createDeck(DATA, null, seededRng(31));
  const n = DATA.words.length;
  const f = deck.current();

  const buriedId = deck.archiveKnown("b1");
  eq(buriedId, f.id, "bury는 지금 보는 단어를 처리");
  eq(deck.serialize().progress[f.id].status, "buried", "묻은 단어는 buried 상태");
  ok(deck.serialize().progress[f.id].buriedAt === "b1", "묻은 시각 기록");
  ok(deck.current() && deck.current().id !== f.id, "묻은 단어는 즉시 학습 순환에서 빠짐");
  eq(deck.serialize().progress[f.id].seenCount, 0, "묻기는 학습 처리가 아니라 본 횟수를 올리지 않음");

  const s = deck.stats();
  eq(s.archivedKnown, 1, "stats.archivedKnown 집계");
  eq(s.total, n - 1, "아카이브한 단어는 세트 크기(total)에서 통째로 빠짐");
  eq(s.sourceTotal, n, "파일에 든 개수(sourceTotal)는 그대로");
  eq(s.remaining, n - 1, "남은 단어도 아카이브한 만큼 줄어듦");
  ok(!deck.learnedWords().some((w) => w.id === f.id), "아카이브한 단어는 보관함(복습 대상)에 없음");
  eq(deck.archivedWords().length, 1, "묻은 단어 목록에 1개");
  eq(deck.archivedWords()[0].id, f.id, "묻은 단어 목록에 그 단어 존재");

  // 되돌리기(직전 1회) - 실수로 눌렀을 때의 첫 회복 경로
  ok(deck.canUndo(), "묻기 직후 되돌리기 가능");
  deck.undo();
  eq(deck.serialize().progress[f.id].status, "active", "되돌리기로 active 복귀");
  eq(deck.stats().archivedKnown, 0, "되돌리기로 아카이브 수 0");
  eq(deck.current().id, f.id, "되돌린 단어가 현재 단어로 복원");

  // 되살리기(목록에서) - 두 번째 회복 경로
  deck.archiveKnown("b2");
  const saved = JSON.parse(JSON.stringify(deck.serialize())); // localStorage 왕복 모사
  const restored = createDeck(DATA, saved, seededRng(31));
  eq(restored.stats().archivedKnown, 1, "저장·복원 후에도 아카이브 유지");
  eq(restored.stats().total, n - 1, "복원 후 세트 크기도 동일");
  ok(restored.unarchive(f.id), "묻은 단어 되살리기 성공");
  eq(restored.serialize().progress[f.id].status, "active", "되살리면 active 복귀");
  eq(restored.stats().total, n, "되살리면 세트 크기 원복");
  ok(!restored.canUndo(), "되살리기는 학습 되돌리기 대상이 아님(undo 무효화)");
  // 되살린 단어는 다시 학습 대상에 등장해야 한다.
  markAll(restored, "unknown", "t");
  ok(restored.archivedWords().length === 0, "되살린 뒤 묻은 목록 비어 있음");

  ok(!restored.unarchive("ev-s01-0000-none"), "없는 id 되살리기는 무해하게 false");
})();

// --- 12. 남은 단어를 전부 묻으면 세트 완료(회복 경로 유지) ---
(() => {
  const deck = createDeck(DATA, null, seededRng(37));
  let guard = 0;
  while (deck.current() && guard++ < 10000) deck.archiveKnown("b");
  const s = deck.stats();
  eq(s.archivedKnown, DATA.words.length, "전부 아카이브하면 archivedKnown = 파일 개수");
  eq(s.total, 0, "세트 크기 0");
  eq(s.remaining, 0, "남은 단어 0");
  ok(s.completed, "학습 대상이 없으면 세트 완료로 처리");
  eq(s.percent, 100, "분모 0에서 완료율은 100(0 나눗셈 방지)");
  eq(deck.archivedWords().length, DATA.words.length, "묻은 목록에서 전부 되살릴 수 있음");
})();

// --- 13. 아카이브 MASTERED(완전히 외운 단어): 세트에서 제외 + 되살리면 복습 목록으로 ---
(() => {
  const deck = createDeck(DATA, null, seededRng(41));
  const n = DATA.words.length;
  deck.mark("known", "t1");
  deck.mark("known", "t2");
  eq(deck.stats().learned, 2, "복습 대상은 2개");
  eq(deck.stats().total, n, "아직 아카이브가 없으니 세트 크기는 파일 개수");

  const target = deck.learnedWords()[0].id;
  ok(deck.archiveLearned(target, "m1"), "외운 단어를 아카이브로 보냄");
  eq(deck.serialize().progress[target].status, "buried", "아카이브 상태는 buried(저장 호환)");
  eq(deck.serialize().progress[target].buriedTier, ARCHIVE_TIER.MASTERED, "MASTERED 갈래 기록");
  ok(deck.serialize().progress[target].buriedAt === "m1", "아카이브 시각 기록");

  const s = deck.stats();
  eq(s.archivedMastered, 1, "stats.archivedMastered 집계");
  eq(s.archivedKnown, 0, "MASTERED는 KNOWN 집계에 들어가지 않음");
  eq(s.archived, 1, "아카이브 합계");
  eq(s.learned, 1, "복습 대상에서 빠짐");
  eq(s.total, n - 1, "아카이브한 만큼 세트 크기가 줄어든다(KNOWN과 같은 규칙)");
  eq(s.sourceTotal, n, "파일 개수는 그대로");
  ok(!deck.learnedWords().some((w) => w.id === target), "아카이브한 단어는 복습 목록에 없음");

  // 갈래별 목록 분리
  deck.archiveKnown("b1"); // 지금 보는 active 단어를 KNOWN으로
  eq(deck.archivedWords(ARCHIVE_TIER.KNOWN).length, 1, "KNOWN 목록 1개");
  eq(deck.archivedWords(ARCHIVE_TIER.MASTERED).length, 1, "MASTERED 목록 1개");
  eq(deck.archivedWords().length, 2, "갈래 미지정이면 전체");
  eq(deck.archivedWords(ARCHIVE_TIER.MASTERED)[0].tier, ARCHIVE_TIER.MASTERED, "목록 항목에 갈래가 실려 온다");
  eq(deck.stats().total, n - 2, "두 갈래 모두 세트 크기를 줄인다");

  // 되살리기 - MASTERED는 복습 목록(learned)으로, KNOWN은 학습(active)으로
  ok(deck.unarchive(target), "아카이브에서 되살리기 성공");
  eq(deck.serialize().progress[target].status, "learned", "MASTERED를 되살리면 복습 목록으로 복귀");
  eq(deck.serialize().progress[target].buriedTier, null, "되살리면 갈래 값 비움");
  eq(deck.stats().learned, 2, "복습 대상 원복");
  eq(deck.stats().total, n - 1, "되살린 만큼 세트 크기 복구");

  // 저장·복원 왕복에도 갈래가 유지된다.
  deck.archiveLearned(target, "m2");
  const saved = JSON.parse(JSON.stringify(deck.serialize()));
  const restored = createDeck(DATA, saved, seededRng(41));
  eq(restored.stats().archivedMastered, 1, "복원 후에도 MASTERED 유지");
  eq(restored.stats().archivedKnown, 1, "복원 후에도 KNOWN 유지");
  eq(restored.stats().total, n - 2, "복원 후 세트 크기 동일");

  ok(!deck.archiveLearned("ev-s01-0000-none", "m3"), "없는 id는 무해하게 false");
})();

// --- 14. 갈래가 없던 저장본(v1) 호환: 옛 buried는 KNOWN으로 읽는다 ---
(() => {
  const deck = createDeck(DATA, null, seededRng(43));
  const f = deck.current();
  deck.archiveKnown("b1");
  // v1 저장본 모사 - buriedTier 키 자체가 없던 시절
  const saved = JSON.parse(JSON.stringify(deck.serialize()));
  saved.version = 1;
  delete saved.progress[f.id].buriedTier;

  const restored = createDeck(DATA, saved, seededRng(43));
  eq(restored.serialize().progress[f.id].buriedTier, ARCHIVE_TIER.KNOWN, "옛 buried는 KNOWN으로 승격");
  eq(restored.stats().archivedKnown, 1, "KNOWN 집계에 포함");
  eq(restored.stats().archivedMastered, 0, "MASTERED로 새지 않음");
  eq(restored.stats().total, DATA.words.length - 1, "옛 저장본도 세트 크기에서 빠진다");
})();

// --- 15. 외운 단어를 한 번에 완전히 외움으로(일괄) ---
(() => {
  const deck = createDeck(DATA, null, seededRng(47));
  markAll(deck, "known", "t");
  ok(deck.stats().completed, "전부 외우면 완료");
  const n = deck.archiveAllLearned("m");
  eq(n, DATA.words.length, "외운 단어 전부가 아카이브 대상");
  const s = deck.stats();
  eq(s.learned, 0, "복습 목록 비움");
  eq(s.archivedMastered, DATA.words.length, "전부 MASTERED");
  eq(s.total, 0, "세트가 통째로 비어 크기 0");
  eq(s.sourceTotal, DATA.words.length, "파일 개수는 그대로");
  eq(s.percent, 100, "크기 0에서 완료율은 100(0 나눗셈 방지)");
  ok(s.completed, "완료 상태 유지");
})();

console.log(`\n[english-vocabulary] 테스트 완료: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
