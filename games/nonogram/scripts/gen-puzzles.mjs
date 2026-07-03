// 이모지 변환 결과(build-emoji-puzzles 출력 JSON)를 기존 손그림 5×5와 합쳐
// src/data/puzzles.js를 재생성한다. 빌드 타임 전용.
//
// 손그림: 튜토리얼 3 + 초급 50 (5×5, scripts/handmade-puzzles.mjs가 SSOT).
// 이모지: 중급(10×10) + 고급(15×15). 각 퍼즐은 자기 palette를 가진다.
//
// 실행: node scripts/gen-puzzles.mjs <emoji_out.json 경로>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HANDMADE } from './handmade-puzzles.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const emojiPath = process.argv[2];
if (!emojiPath) { console.error('사용: node gen-puzzles.mjs <emoji_out.json>'); process.exit(1); }
const emoji = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));

// 10×10에서 다운샘플 인식이 어려운 것 제외(15×15는 전량 유지).
const EXCLUDE = new Set([
  'em1f986s10', // 오리
  'em1f993s10', // 얼룩말
  'em1f680s10', // 로켓
  'em1f9a5s10', // 나무늘보
  'em1f98fs10', // 코뿔소
  'em1f412s10', // 갈색원숭이
  'em1f954s10', // 감자
  'em1f330s10', // 밤
]);

const hand = HANDMADE;
const emo = emoji.ok
  .filter((p) => !EXCLUDE.has(p.id))
  .sort((a, b) => (a.size - b.size) || a.title.localeCompare(b.title, 'ko'));

const gridStr = (grid) =>
  grid.map((row) => `      [${row.join(',')}],`).join('\n');

const palStr = (pal) =>
  '{ ' + Object.entries(pal).map(([k, v]) => `${k}: '${v}'`).join(', ') + ' }';

function fmtHand(p) {
  const step = p.tutorialStep ? ` tutorialStep: ${p.tutorialStep},` : '';
  return `  {
    id: '${p.id}', title: '${p.title}', size: ${p.size}, difficulty: '${p.difficulty}',${step}
    grid: [
${gridStr(p.grid)}
    ],
  },`;
}

function fmtEmoji(p) {
  return `  {
    id: '${p.id}', title: '${p.title}', size: ${p.size}, difficulty: '${p.difficulty}',
    palette: ${palStr(p.palette)},
    grid: [
${gridStr(p.grid)}
    ],
  },`;
}

const header = `// 내장 퍼즐 세트의 SSOT. 각 퍼즐은 색 인덱스 격자 하나(0=빈칸, 1~=색).
// 힌트는 hints.js가 자동 생성한다. 모든 퍼즐은 solver.verifyPuzzle 통과분만 포함
// (줄 논리로 추측 없이 풀림 + 유일해). tests/가 전수 검증한다. docs/02_data.md 3장.
//
// 튜토리얼·초급(5×5)은 자체 손그림(전역 PALETTE 색 인덱스).
// 중급(10×10)·고급(15×15)은 Twemoji(CC-BY 4.0, jdecked/twemoji)를 다운샘플한
// 픽셀 그림이며, 각자 자기 palette(인덱스→HEX)를 가진다. 생성: scripts/build-emoji-puzzles.mjs.

export const PUZZLES = [
${hand.map(fmtHand).join('\n')}
${emo.map(fmtEmoji).join('\n')}
];
`;

const outPath = path.join(here, '..', 'src', 'data', 'puzzles.js');
fs.writeFileSync(outPath, header);

const by = {};
for (const p of [...hand, ...emo]) by[p.difficulty] = (by[p.difficulty] || 0) + 1;
console.error(`생성 완료: ${outPath}`);
console.error(`총 ${hand.length + emo.length}종`, by);
