// 공식 대표형 목록에서 중등 출제 입력(`**` 1,200개)을 고정한다.
// 사용: node tools/extract-middle-source.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "docs", "sources", "moe-2022-english");
const input = readFileSync(join(SRC, "vocab-3000-repforms.txt"), "utf8")
  .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

const cards = input.filter((line) => line.includes("**")).map((line) => {
  const match = line.match(/^(.+?)\*\*/);
  if (!match) throw new Error(`중등 표기 없는 행: ${line}`);
  const derivatives = (line.match(/\((.*?)\)/)?.[1] || "")
    .split(/\s*[,/]\s*/).map((v) => v.trim()).filter(Boolean);
  return {
    word: match[1].trim(),
    variants: [],
    derivatives,
  };
});

if (cards.length !== 1200) throw new Error(`중등 대표형 ${cards.length}개 (1200 기대)`);
const words = new Set(cards.map((card) => card.word));
if (words.size !== cards.length) throw new Error(`중등 대표형 중복 ${cards.length - words.size}개`);

writeFileSync(join(SRC, "middle-1200-cards.json"), JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`중등 공식 대표형 고정 완료: ${cards.length}개`);
