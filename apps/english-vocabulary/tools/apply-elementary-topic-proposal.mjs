import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_DIR = resolve(ROOT, 'docs', 'sources', 'moe-2022-english');
const DATA_DIR = resolve(ROOT, 'src', 'data');
const PROPOSAL_PATH = resolve(SOURCE_DIR, 'elementary-learning-set-topic-proposal-v1.json');
const MANIFEST_PATH = resolve(DATA_DIR, 'manifest.json');

const POS_KR = {
  noun: '명사', verb: '동사', adjective: '형용사', adverb: '부사',
  preposition: '전치사', conjunction: '접속사', pronoun: '대명사',
  interjection: '감탄사', determiner: '한정사', auxiliary: '조동사', number: '수사',
};

const proposal = JSON.parse(await readFile(PROPOSAL_PATH, 'utf8'));
if (proposal.status !== 'editorial-draft') throw new Error(`Unexpected proposal status: ${proposal.status}`);
if (!Array.isArray(proposal.sets) || proposal.sets.length !== 4) throw new Error('Expected four elementary sets');

const batches = await Promise.all([1, 2, 3, 4].map(async (batch) => (
  JSON.parse(await readFile(resolve(SOURCE_DIR, `authoring-batch-0${batch}.json`), 'utf8'))
)));
const sourceById = new Map(batches.flat().map((card) => [card.id, card]));

const outputSets = proposal.sets.map((set, setIndex) => {
  const order = setIndex + 1;
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
      level: 'elementary',
      word: source.word,
      pos,
      meaningKr: source.meaningKr,
      example: source.example,
      exampleKr: source.exampleKr,
    };
  });
  return { setId, order, title: set.title, level: 'elementary', source: '교육부 2022 개정 별책 14 초등 * 대표형', words };
});

const allWords = outputSets.flatMap((set) => set.words);
if (allWords.length !== 800 || new Set(allWords.map((word) => word.sourceId)).size !== 800 || new Set(allWords.map((word) => word.word.toLowerCase())).size !== 800) {
  throw new Error('Output has a source ID or word duplicate/omission');
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
manifest.note = '초등 SET01~04는 교육부 2022 개정 별책 14의 초등 * 대표형 800개를 주제·상황 기반으로 배정한 데이터다. 중등·고등 세트는 준비 중이며, available=true 세트만 앱이 로드한다.';
manifest.dataVersion = 'moe-2022-elementary-v1';
for (const set of outputSets) {
  const entry = manifest.sets.find((candidate) => candidate.order === set.order);
  if (!entry) throw new Error(`Manifest entry missing for SET${set.order}`);
  entry.title = set.title;
  entry.level = 'elementary';
  entry.file = `set-${String(set.order).padStart(3, '0')}.json`;
  entry.count = set.words.length;
  entry.available = true;
}

for (const set of outputSets) {
  await writeFile(resolve(DATA_DIR, `set-${String(set.order).padStart(3, '0')}.json`), `${JSON.stringify(set, null, 2)}\n`, 'utf8');
}
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Applied ${allWords.length} official cards to ${outputSets.length} elementary sets.`);
