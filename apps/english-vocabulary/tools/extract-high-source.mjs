// 공식 대표형 목록에서 고등 출제 입력(무표시 1,000개)을 고정한다.
// `*`=초등 800, `**`=중등 1,200, 무표시=고등 1,000 (docs/vocab-master-plan.md 6장).
// 사용: node tools/extract-high-source.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "docs", "sources", "moe-2022-english");
const input = readFileSync(join(SRC, "vocab-3000-repforms.txt"), "utf8")
  .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

// 표제어는 괄호 앞부분이다. 별표 판정은 표제어 쪽만 본다(괄호 안 파생어 표기와 섞이지 않게).
const cards = input
  .map((line) => ({ line, head: line.split("(")[0].trim() }))
  .filter(({ head }) => !head.includes("*"))
  .map(({ line, head }) => ({
    // 고등 원천에는 미국식/영국식 병기 표제어가 있다(analyze / analyse). 앞 형태를 표제어로 삼고 나머지는 변이형으로 분리한다.
    word: head.split("/")[0].trim(),
    variants: head.split("/").slice(1).map((v) => v.trim()).filter(Boolean),
    derivatives: (line.match(/\((.*?)\)/)?.[1] || "")
      .split(/\s*[,/]\s*/).map((v) => v.trim()).filter(Boolean),
  }));

if (cards.length !== 1000) throw new Error(`고등 대표형 ${cards.length}개 (1000 기대)`);
const words = new Set(cards.map((card) => card.word));
if (words.size !== cards.length) throw new Error(`고등 대표형 중복 ${cards.length - words.size}개`);

writeFileSync(join(SRC, "high-1000-cards.json"), JSON.stringify(cards, null, 2) + "\n", "utf8");
console.log(`고등 공식 대표형 고정 완료: ${cards.length}개 (${cards[0].word} ~ ${cards.at(-1).word})`);
