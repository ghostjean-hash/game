// 사용: node tools/record-elementary-audit.mjs 1 40
// 지정 범위를 사람이 검토한 뒤에만 reviewed로 기록한다.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(APP, "docs", "sources", "moe-2022-english", "elementary-800-audit-ledger.json");
const [from, to] = process.argv.slice(2).map(Number);
if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 800 || from > to) throw new Error("범위: 1~800 정수 두 개");
const ledger = JSON.parse(readFileSync(FILE, "utf8"));
for (const row of ledger.rows) {
  if (row.sourceOrder >= from && row.sourceOrder <= to) {
    if (row.status !== "pending") throw new Error(`${row.sourceOrder}은 이미 ${row.status}`);
    row.status = "reviewed";
    row.reviewedAt = new Date().toISOString().slice(0, 10);
  }
}
writeFileSync(FILE, JSON.stringify(ledger, null, 2) + "\n");
console.log(`marked ${from}~${to} reviewed`);
