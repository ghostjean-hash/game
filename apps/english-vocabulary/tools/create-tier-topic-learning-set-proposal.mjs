// 중등·고등 주제 기반 학습 세트 제안을 만든다.
// 사용: node tools/create-tier-topic-learning-set-proposal.mjs <middle|high>
//
// 배정 규칙(재현 가능, 초등 방식 계승):
//   1. 각 세트에 대표 주제(anchorTopics)를 정하고, 그 주제 카드를 빈도 순위 오름차순으로 먼저 채운다.
//   2. 대표 주제만으로 200개가 안 되면 공용 풀(모든 세트가 공유하는 일반 주제)에서 보충한다.
//      공용 풀은 빈도 순으로 세트를 돌아가며 나눠, 특정 세트만 어려운 단어로 채워지지 않게 한다.
//   3. 대표 주제가 200개를 넘으면 남은 카드는 공용 풀로 흘려보내 뒤 세트에서 소비한다.
//   4. 세트 내부 순서는 대표 주제 먼저, 그 안에서 빈도 순위 오름차순.
// 카드의 단어·뜻·예문은 변경하지 않는다.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_DIR = resolve(ROOT, 'docs', 'sources', 'moe-2022-english');

const GENERAL_TOPICS = ['core_function', 'action_change_description', 'communication_thinking_social', 'time_numbers_measure'];

const TIERS = {
  middle: {
    tags: 'middle-topic-tags-v1.json',
    frequency: 'middle-frequency-wordfreq-v3.1.1.json',
    output: 'middle-learning-set-topic-proposal-v1.json',
    total: 1200,
    vocabulary: 'education ministry 2022 double-starred representative forms (middle scope)',
    sets: [
      { id: 'SET05', title: '나와 사람들', anchorTopics: ['self_and_people'] },
      { id: 'SET06', title: '집과 먹고 입기', anchorTopics: ['home_food_clothes', 'objects_and_materials'] },
      { id: 'SET07', title: '학교와 배움', anchorTopics: ['school_learning_media', 'play_sport_arts'] },
      { id: 'SET08', title: '동네와 이동', anchorTopics: ['town_travel_places'] },
      { id: 'SET09', title: '자연과 환경', anchorTopics: ['nature_weather_animals'] },
      { id: 'SET10', title: '사회와 일', anchorTopics: ['society_culture_work'] },
    ],
  },
  high: {
    tags: 'high-topic-tags-v1.json',
    frequency: 'high-frequency-wordfreq-v3.1.1.json',
    output: 'high-learning-set-topic-proposal-v1.json',
    total: 1000,
    vocabulary: 'education ministry 2022 unmarked representative forms (high scope)',
    sets: [
      { id: 'SET11', title: '사람과 마음', anchorTopics: ['self_and_people'] },
      { id: 'SET12', title: '생활과 사물', anchorTopics: ['home_food_clothes', 'objects_and_materials'] },
      { id: 'SET13', title: '학문과 표현', anchorTopics: ['school_learning_media', 'play_sport_arts'] },
      { id: 'SET14', title: '자연과 세계', anchorTopics: ['nature_weather_animals', 'town_travel_places'] },
      { id: 'SET15', title: '사회와 사고', anchorTopics: ['society_culture_work'] },
    ],
  },
};

const tierKey = process.argv[2];
const tier = TIERS[tierKey];
if (!tier) throw new Error('usage: node tools/create-tier-topic-learning-set-proposal.mjs <middle|high>');

const [tags, frequency] = await Promise.all([
  readFile(resolve(SOURCE_DIR, tier.tags), 'utf8').then(JSON.parse),
  readFile(resolve(SOURCE_DIR, tier.frequency), 'utf8').then(JSON.parse),
]);

const rankById = new Map(frequency.rows.map(({ id, frequencyRank }) => [id, frequencyRank]));
const cards = tags.cards.map((card) => {
  const frequencyRank = rankById.get(card.id);
  if (!Number.isInteger(frequencyRank)) throw new Error(`Missing frequency rank: ${card.id}`);
  return { ...card, frequencyRank };
});
if (cards.length !== tier.total) throw new Error(`Expected ${tier.total} tagged cards, got ${cards.length}`);

const byFrequency = (a, b) => a.frequencyRank - b.frequencyRank || a.word.localeCompare(b.word);
const pools = new Map();
for (const card of cards) {
  if (!pools.has(card.primaryTopic)) pools.set(card.primaryTopic, []);
  pools.get(card.primaryTopic).push(card);
}
for (const pool of pools.values()) pool.sort(byFrequency);

// 공용 풀: 일반 주제 + 어떤 세트의 대표 주제도 아닌 주제
const anchored = new Set(tier.sets.flatMap((set) => set.anchorTopics));
const shared = [];
for (const [topic, pool] of pools) {
  if (GENERAL_TOPICS.includes(topic) || !anchored.has(topic)) shared.push(...pool.splice(0));
}
shared.sort(byFrequency);

const SET_SIZE = 200;
const assigned = tier.sets.map((set) => {
  const picked = [];
  for (const topic of set.anchorTopics) {
    const pool = pools.get(topic) ?? [];
    picked.push(...pool.splice(0, Math.max(0, SET_SIZE - picked.length)));
  }
  return { set, picked };
});
// 대표 주제 잔여분은 공용 풀로 넘겨 뒤 세트에서 소비한다.
for (const pool of pools.values()) if (pool.length) shared.push(...pool.splice(0));
shared.sort(byFrequency);

// 공용 풀은 빈도 순으로 세트를 돌아가며 배분한다. 남은 자리가 많은 세트를 먼저 채워
// 어느 세트도 고빈도·저빈도에 쏠리지 않게 한다.
for (const card of shared) {
  const target = assigned
    .filter((entry) => entry.picked.length < SET_SIZE)
    .sort((a, b) => (SET_SIZE - b.picked.length) - (SET_SIZE - a.picked.length)
      || tier.sets.indexOf(a.set) - tier.sets.indexOf(b.set))[0];
  if (!target) throw new Error('No set has a remaining slot');
  target.picked.push(card);
}
shared.length = 0;
for (const entry of assigned) {
  if (entry.picked.length !== SET_SIZE) throw new Error(`${entry.set.id} has ${entry.picked.length} cards`);
}

const sets = assigned.map(({ set, picked }) => {
  const anchorIndex = (card) => {
    const index = set.anchorTopics.indexOf(card.primaryTopic);
    return index < 0 ? set.anchorTopics.length : index;
  };
  picked.sort((a, b) => anchorIndex(a) - anchorIndex(b) || byFrequency(a, b));
  const topicCounts = {};
  for (const card of picked) topicCounts[card.primaryTopic] = (topicCounts[card.primaryTopic] ?? 0) + 1;
  return {
    id: set.id,
    title: set.title,
    anchorTopics: set.anchorTopics,
    topicCounts,
    cards: picked.map((card, index) => ({
      id: card.id, word: card.word, primaryTopic: card.primaryTopic,
      frequencyRank: card.frequencyRank, learningOrder: index + 1,
    })),
  };
});

const flattened = sets.flatMap((set) => set.cards);
const uniqueIds = new Set(flattened.map(({ id }) => id));
if (flattened.length !== tier.total || uniqueIds.size !== tier.total) {
  throw new Error('Set proposal has a duplicate or omission');
}

const payload = {
  schemaVersion: 1,
  status: 'editorial-draft',
  source: {
    vocabulary: tier.vocabulary,
    topicTags: tier.tags,
    frequency: tier.frequency,
    orderingRule: 'anchor topic cluster first; frequency rank inside each cluster; shared general topics fill remaining slots by frequency',
  },
  sets,
  validation: {
    sourceCardCount: cards.length,
    assignedCardCount: flattened.length,
    uniqueIds: uniqueIds.size,
    setSizes: Object.fromEntries(sets.map(({ id, cards: setCards }) => [id, setCards.length])),
  },
};
await writeFile(resolve(SOURCE_DIR, tier.output), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${tier.output}: ${flattened.length} cards in ${sets.length} sets.`);
for (const set of sets) {
  console.log(`  ${set.id} ${set.title}: ${Object.entries(set.topicCounts).map(([t, c]) => `${t}=${c}`).join(' ')}`);
}
