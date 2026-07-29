import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_DIR = resolve(ROOT, 'docs', 'sources', 'moe-2022-english');
const OUTPUT = resolve(SOURCE_DIR, 'elementary-learning-set-topic-proposal-v1.json');

const TOPICS = [
  'action_change_description', 'communication_thinking_social', 'core_function',
  'home_food_clothes', 'nature_weather_animals', 'objects_and_materials',
  'play_sport_arts', 'school_learning_media', 'self_and_people',
  'society_culture_work', 'time_numbers_measure', 'town_travel_places',
];

// A commercial-style set is a bundle of related units, not a single semantic field.
// The row totals equal each tagged topic; every column totals 200 cards.
const SETS = [
  {
    id: 'SET01', title: '나와 일상',
    focusTopics: ['self_and_people', 'home_food_clothes', 'time_numbers_measure', 'core_function', 'action_change_description', 'communication_thinking_social', 'objects_and_materials', 'school_learning_media', 'play_sport_arts', 'nature_weather_animals', 'town_travel_places'],
    quotas: [24, 8, 26, 55, 6, 12, 4, 8, 41, 0, 12, 4],
  },
  {
    id: 'SET02', title: '학교와 즐거움',
    focusTopics: ['school_learning_media', 'play_sport_arts', 'time_numbers_measure', 'core_function', 'communication_thinking_social', 'action_change_description', 'home_food_clothes', 'objects_and_materials', 'self_and_people', 'town_travel_places', 'nature_weather_animals', 'society_culture_work'],
    quotas: [15, 14, 28, 17, 4, 10, 30, 42, 10, 3, 18, 9],
  },
  {
    id: 'SET03', title: '우리 동네와 자연',
    focusTopics: ['town_travel_places', 'nature_weather_animals', 'core_function', 'action_change_description', 'objects_and_materials', 'communication_thinking_social', 'society_culture_work', 'time_numbers_measure', 'self_and_people', 'home_food_clothes', 'school_learning_media', 'play_sport_arts'],
    quotas: [18, 12, 22, 7, 42, 18, 7, 6, 8, 15, 10, 35],
  },
  {
    id: 'SET04', title: '표현과 넓은 세계',
    focusTopics: ['society_culture_work', 'objects_and_materials', 'action_change_description', 'communication_thinking_social', 'core_function', 'self_and_people', 'time_numbers_measure', 'nature_weather_animals', 'home_food_clothes', 'school_learning_media', 'play_sport_arts'],
    quotas: [32, 28, 24, 8, 9, 49, 3, 5, 12, 20, 10, 0],
  },
];

// SET01 editorial review: move sensitive, abstract, or less immediate words out
// of the opening sequence and replace them with more concrete everyday words.
// Every pair stays within one primary topic, so the published topic quotas hold.
const SET01_EDITORIAL_SWAPS = [
  ['death', 'uncle'],
  ['dead', 'ear'],
  ['human', 'cousin'],
  ['member', 'tooth'],
  ['address', 'finger'],
  ['course', 'pen'],
  ['problem', 'pencil'],
  ['wine', 'banana'],
  ['plastic', 'carrot'],
  ['space', 'dog'],
  ['star', 'cat'],
  ['part', 'blue'],
];

const LATER_EDITORIAL_SWAPS = [
  ['SET02', 'wine', 'biscuit'],
  ['SET02', 'college', 'crayon'],
  ['SET02', 'issue', 'notebook'],
  ['SET02', 'project', 'quiz'],
  ['SET02', 'software', 'textbook'],
  ['SET02', 'partner', 'aunt'],
  ['SET02', 'prince', 'grandfather'],
  ['SET02', 'god', 'hello'],
  ['SET02', 'space', 'duck'],
  ['SET03', 'death', 'nurse'],
  ['SET03', 'kill', 'wash'],
  ['SET03', 'war', 'festival'],
  ['SET03', 'case', 'wedding'],
  ['SET03', 'gas', 'cow'],
];

const [tags, frequency] = await Promise.all([
  JSON.parse(await readFile(resolve(SOURCE_DIR, 'elementary-topic-tags-v1.json'), 'utf8')),
  JSON.parse(await readFile(resolve(SOURCE_DIR, 'elementary-frequency-wordfreq-v3.1.1.json'), 'utf8')),
]);

const rankById = new Map(frequency.rows.map(({ id, frequencyRank }) => [id, frequencyRank]));
const cardsByTopic = new Map(TOPICS.map((topic) => [topic, []]));
for (const card of tags.cards) {
  if (!cardsByTopic.has(card.primaryTopic)) throw new Error(`Unknown topic: ${card.primaryTopic}`);
  const frequencyRank = rankById.get(card.id);
  if (!Number.isInteger(frequencyRank)) throw new Error(`Missing frequency rank: ${card.id}`);
  cardsByTopic.get(card.primaryTopic).push({ ...card, frequencyRank });
}
for (const cards of cardsByTopic.values()) cards.sort((a, b) => a.frequencyRank - b.frequencyRank || a.word.localeCompare(b.word));

const assignedBySet = new Map(SETS.map((set) => [set.id, []]));
for (const [topicIndex, topic] of TOPICS.entries()) {
  const cards = cardsByTopic.get(topic);
  const quotas = SETS.map((set) => set.quotas[topicIndex]);
  if (quotas.reduce((sum, value) => sum + value, 0) !== cards.length) {
    throw new Error(`Quota mismatch for ${topic}: ${cards.length}`);
  }
  let cursor = 0;
  for (let setIndex = 0; setIndex < SETS.length; setIndex += 1) {
    assignedBySet.get(SETS[setIndex].id).push(...cards.slice(cursor, cursor + quotas[setIndex]));
    cursor += quotas[setIndex];
  }
}

for (const [earlyWord, laterWord] of SET01_EDITORIAL_SWAPS) {
  const earlySet = assignedBySet.get('SET01');
  const earlyIndex = earlySet.findIndex(({ word }) => word === earlyWord);
  if (earlyIndex < 0) throw new Error(`SET01 review word not found: ${earlyWord}`);
  const laterSet = [...assignedBySet.entries()].find(([setId, cards]) => setId !== 'SET01' && cards.some(({ word }) => word === laterWord));
  if (!laterSet) throw new Error(`SET01 replacement not found: ${laterWord}`);
  const [laterSetId, laterCards] = laterSet;
  const laterIndex = laterCards.findIndex(({ word }) => word === laterWord);
  if (earlySet[earlyIndex].primaryTopic !== laterCards[laterIndex].primaryTopic) {
    throw new Error(`Topic mismatch in review swap: ${earlyWord} / ${laterWord}`);
  }
  [earlySet[earlyIndex], laterCards[laterIndex]] = [laterCards[laterIndex], earlySet[earlyIndex]];
  console.log(`SET01 review swap: ${earlyWord} <-> ${laterWord} (${laterSetId})`);
}

for (const [setId, movedOut, movedIn] of LATER_EDITORIAL_SWAPS) {
  const sourceSet = assignedBySet.get(setId);
  const sourceIndex = sourceSet.findIndex(({ word }) => word === movedOut);
  if (sourceIndex < 0) throw new Error(`${setId} review word not found: ${movedOut}`);
  const replacementSet = [...assignedBySet.entries()].find(([candidateId, cards]) => candidateId !== setId && cards.some(({ word }) => word === movedIn));
  if (!replacementSet) throw new Error(`${setId} replacement not found: ${movedIn}`);
  const [replacementSetId, replacementCards] = replacementSet;
  const replacementIndex = replacementCards.findIndex(({ word }) => word === movedIn);
  if (sourceSet[sourceIndex].primaryTopic !== replacementCards[replacementIndex].primaryTopic) {
    throw new Error(`Topic mismatch in ${setId} review swap: ${movedOut} / ${movedIn}`);
  }
  [sourceSet[sourceIndex], replacementCards[replacementIndex]] = [replacementCards[replacementIndex], sourceSet[sourceIndex]];
  console.log(`${setId} review swap: ${movedOut} <-> ${movedIn} (${replacementSetId})`);
}

const sets = SETS.map(({ id, title, focusTopics, quotas }) => {
  const cards = assignedBySet.get(id);
  cards.sort((a, b) => focusTopics.indexOf(a.primaryTopic) - focusTopics.indexOf(b.primaryTopic)
    || a.frequencyRank - b.frequencyRank || a.word.localeCompare(b.word));
  if (cards.length !== 200) throw new Error(`${id} has ${cards.length} cards`);
  return {
    id, title, focusTopics,
    topicQuotas: Object.fromEntries(TOPICS.map((topic, index) => [topic, quotas[index]])),
    cards: cards.map((card, index) => ({
      id: card.id, word: card.word, primaryTopic: card.primaryTopic,
      frequencyRank: card.frequencyRank, learningOrder: index + 1,
    })),
  };
});

const flattened = sets.flatMap((set) => set.cards);
const uniqueIds = new Set(flattened.map(({ id }) => id));
if (flattened.length !== 800 || uniqueIds.size !== 800) throw new Error('Set proposal has a duplicate or omission');

const payload = {
  schemaVersion: 1,
  status: 'editorial-draft',
  source: {
    vocabulary: 'education ministry 2022 elementary starred representative forms',
    topicTags: 'elementary-topic-tags-v1.json',
    frequency: 'elementary-frequency-wordfreq-v3.1.1.json',
    orderingRule: 'topic/context cluster first; frequency rank inside each cluster',
  },
  sets,
  validation: {
    sourceCardCount: tags.cards.length,
    assignedCardCount: flattened.length,
    uniqueIds: uniqueIds.size,
    unassignedCards: tags.cards.length - uniqueIds.size,
    setSizes: Object.fromEntries(sets.map(({ id, cards }) => [id, cards.length])),
  },
  editorialReview: {
    completedScopes: ['SET01', 'SET02', 'SET03', 'SET04'],
    adjustments: [
      ...SET01_EDITORIAL_SWAPS.map(([movedOut, movedIn]) => ({ setId: 'SET01', movedOut, movedIn })),
      ...LATER_EDITORIAL_SWAPS.map(([setId, movedOut, movedIn]) => ({ setId, movedOut, movedIn })),
    ],
  },
};
await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${OUTPUT}: ${flattened.length} cards in ${sets.length} sets.`);
