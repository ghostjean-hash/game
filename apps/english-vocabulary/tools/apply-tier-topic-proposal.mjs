// 중등·고등 주제 기반 학습 세트 제안을 앱 데이터(set-NNN.json + manifest)로 변환한다.
// 사용: node tools/apply-tier-topic-proposal.mjs <middle|high>
// 초등 apply-elementary-topic-proposal.mjs와 동일 규칙(POS 한국어 매핑, id 재발급, 전수 검증).
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_DIR = resolve(ROOT, 'docs', 'sources', 'moe-2022-english');
const DATA_DIR = resolve(ROOT, 'src', 'data');
const MANIFEST_PATH = resolve(DATA_DIR, 'manifest.json');

const TIERS = {
  middle: {
    proposal: 'middle-learning-set-topic-proposal-v1.json',
    batches: [1, 2, 3, 4, 5, 6].map((n) => `middle-authoring-batch-0${n}.json`),
    orders: [5, 6, 7, 8, 9, 10],
    level: 'middle',
    total: 1200,
    source: '교육부 2022 개정 별책 14 ** 대표형(중등 범위)',
  },
  high: {
    proposal: 'high-learning-set-topic-proposal-v1.json',
    batches: [1, 2, 3, 4, 5].map((n) => `high-authoring-batch-0${n}.json`),
    orders: [11, 12, 13, 14, 15],
    level: 'high',
    total: 1000,
    source: '교육부 2022 개정 별책 14 무표시 대표형(고등 범위)',
  },
};

const POS_KR = {
  noun: '명사', verb: '동사', adjective: '형용사', adverb: '부사',
  preposition: '전치사', conjunction: '접속사', pronoun: '대명사',
  interjection: '감탄사', determiner: '한정사', auxiliary: '조동사', number: '수사',
};

const tierKey = process.argv[2];
const tier = TIERS[tierKey];
if (!tier) throw new Error('usage: node tools/apply-tier-topic-proposal.mjs <middle|high>');

const proposal = JSON.parse(await readFile(resolve(SOURCE_DIR, tier.proposal), 'utf8'));
if (proposal.status !== 'editorial-draft') throw new Error(`Unexpected proposal status: ${proposal.status}`);
if (!Array.isArray(proposal.sets) || proposal.sets.length !== tier.orders.length) {
  throw new Error(`Expected ${tier.orders.length} ${tierKey} sets`);
}

const batches = await Promise.all(tier.batches.map(async (file) => (
  JSON.parse(await readFile(resolve(SOURCE_DIR, file), 'utf8'))
)));
const sourceById = new Map(batches.flat().map((card) => [card.id, card]));

const outputSets = proposal.sets.map((set, setIndex) => {
  const order = tier.orders[setIndex];
  const setId = `ev-set-${String(order).padStart(3, '0')}`;
  if (set.cards.length !== 200) throw new Error(`${set.id} must have 200 cards`);
  const words = set.cards.map((assignment, index) => {
    const source = sourceById.get(assignment.id);
    if (!source) throw new Error(`Missing source card: ${assignment.id}`);
    const partOfSpeech = source.partOfSpeech?.[0];
    const pos = POS_KR[partOfSpeech];
    if (!pos) throw new Error(`Unsupported part of speech: ${partOfSpeech} (${source.word})`);
    if (source.word !== assignment.word) throw new Error(`Proposal/source word mismatch: ${assignment.id}`);
    return {
      id: `ev-s${String(order).padStart(2, '0')}-${String(index + 1).padStart(4, '0')}`,
      sourceId: source.id,
      setId,
      level: tier.level,
      word: source.word,
      pos,
      meaningKr: source.meaningKr,
      example: source.example,
      exampleKr: source.exampleKr,
    };
  });
  return { setId, order, title: set.title, level: tier.level, source: tier.source, words };
});

const allWords = outputSets.flatMap((set) => set.words);
if (allWords.length !== tier.total
  || new Set(allWords.map((word) => word.sourceId)).size !== tier.total
  || new Set(allWords.map((word) => word.word.toLowerCase())).size !== tier.total) {
  throw new Error('Output has a source ID or word duplicate/omission');
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
for (const set of outputSets) {
  const entry = manifest.sets.find((candidate) => candidate.order === set.order);
  if (!entry) throw new Error(`Manifest entry missing for SET${set.order}`);
  entry.title = set.title;
  entry.level = tier.level;
  entry.file = `set-${String(set.order).padStart(3, '0')}.json`;
  entry.count = set.words.length;
  entry.available = true;
}
if (manifest.sets.every((entry) => entry.available)) {
  manifest.note = 'SET01~15는 교육부 2022 개정 별책 14 대표형 3,000개(초등 * 800 / 중등 ** 1,200 / 고등 무표시 1,000)를 주제·상황 기반으로 배정한 데이터다.';
  manifest.dataVersion = 'moe-2022-full-v1';
}

for (const set of outputSets) {
  await writeFile(resolve(DATA_DIR, `set-${String(set.order).padStart(3, '0')}.json`), `${JSON.stringify(set, null, 2)}\n`, 'utf8');
}
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Applied ${allWords.length} official cards to ${outputSets.length} ${tierKey} sets.`);
