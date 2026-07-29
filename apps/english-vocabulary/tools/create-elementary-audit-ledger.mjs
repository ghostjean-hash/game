// 초등 800 카드의 재검토 대장을 만든다. 기존 검수 기록은 참고용이며 상태를 승격하지 않는다.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(APP, "docs", "sources", "moe-2022-english");
const cards = [1, 2, 3, 4].flatMap((batch) => JSON.parse(readFileSync(join(SRC, `authoring-batch-${String(batch).padStart(2, "0")}.json`), "utf8")));
const ledger = {
  purpose: "800개 카드 재검토의 단일 진행 기록. 모든 카드는 pending에서 시작한다.",
  reviewChecklist: [
    "officialWord", "partOfSpeech", "meaningExampleMatch", "translation", "elementaryFit", "relatedAndIrregularForms",
  ],
  rows: cards.map((card) => ({
    id: card.id,
    sourceOrder: card.sourceOrder,
    word: card.word,
    status: "pending",
    reviewedAt: null,
    findings: [],
  })),
};
writeFileSync(join(SRC, "elementary-800-audit-ledger.json"), JSON.stringify(ledger, null, 2) + "\n");
console.log(`wrote ${ledger.rows.length} pending audit rows`);
