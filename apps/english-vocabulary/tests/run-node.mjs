// english-vocabulary 순수 로직 회귀 테스트. 실행: node apps/english-vocabulary/tests/run-node.mjs
// deck.js(학습 순환·외움/모름·바퀴·undo·보관함 복습·저장 복원)와 words.json 무결성을 검증한다.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createDeck } from "../src/core/deck.js";

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
  // manifest 정합
  eq(MANIFEST.sets.length, 8, "manifest에 8세트 슬롯");
  eq(MANIFEST.setSize, 200, "세트 크기 200");
  eq(MANIFEST.totalTarget, 1600, "전체 목표 1600");
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
  eq(restored.stats().start, grown.words.length, "시작 수는 새 원본 기준");
})();

console.log(`\n[english-vocabulary] 테스트 완료: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
