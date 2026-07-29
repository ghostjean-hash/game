import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_DIR = resolve(ROOT, 'docs', 'sources', 'moe-2022-english');
const OUTPUT = resolve(SOURCE_DIR, 'elementary-topic-tags-v1.json');

// Each assignment is editorially based on the reviewed Korean gloss and example,
// not on spelling, source order, or a frequency rank.
const BATCH_01_TOPICS = {
  core_function: [
    'a', 'about', 'above', 'across', 'after', 'again', 'against', 'ago', 'ahead', 'all', 'almost', 'along', 'already', 'also', 'always', 'and', 'another', 'any', 'around', 'as', 'at', 'away', 'back', 'because', 'before', 'behind', 'below', 'beside', 'between', 'both', 'but', 'by', 'can', 'could', 'certain', 'close', 'down', 'during', 'east', 'enough', 'every', 'for', 'from', 'front', 'he', 'here', 'how', 'however', 'hundred', 'I', 'if', 'in', 'inside', 'into', 'it', 'just', 'may', 'might', 'much', 'must', 'never', 'no', 'not', 'nothing', 'of', 'off', 'often', 'on', 'only', 'or', 'out', 'over', 'please', 'she', 'should', 'so', 'some', 'than', 'that', 'the', 'there', 'they', 'this', 'to', 'too', 'together', 'under', 'up', 'very', 'we', 'well', 'what', 'when', 'where', 'who', 'why', 'will', 'with', 'yes', 'you',
  ],
  self_and_people: [
    'address', 'adult', 'afraid', 'age', 'alone', 'arm', 'aunt', 'baby', 'birth', 'blood', 'body', 'bone', 'boy', 'brave', 'brother', 'child', 'clever', 'couple', 'cousin', 'daughter', 'dead', 'death', 'doctor', 'ear', 'eye', 'face', 'family', 'father', 'finger', 'fool', 'foot', 'friend', 'gentleman', 'girl', 'grandfather', 'guy', 'hair', 'hand', 'head', 'heart', 'hero', 'honest', 'human', 'husband', 'kid', 'kind', 'lady', 'leg', 'lip', 'mad', 'man', 'member', 'mother', 'mouth', 'neck', 'nose', 'nurse', 'parent', 'partner', 'people', 'prince', 'sad', 'shy', 'sister', 'skin', 'son', 'tooth', 'uncle', 'wife', 'woman', 'young',
  ],
  home_food_clothes: [
    'apartment', 'apple', 'bag', 'bake', 'banana', 'bath', 'bed', 'beef', 'bell', 'belt', 'biscuit', 'bottle', 'box', 'bread', 'breakfast', 'brush', 'butter', 'button', 'cake', 'candy', 'cap', 'carrot', 'chair', 'cheese', 'chicken', 'chocolate', 'clothes', 'coat', 'coffee', 'cook', 'cookie', 'cream', 'cup', 'curtain', 'dinner', 'doll', 'doughnut', 'door', 'dress', 'drink', 'fan', 'floor', 'food', 'fork', 'fruit', 'glass', 'grape', 'gum', 'hamburger', 'hat', 'home', 'house', 'ice', 'jacket', 'jam', 'juice', 'key', 'kitchen', 'knife', 'lunch', 'meat', 'milk', 'oil', 'pants', 'pizza', 'plastic', 'potato', 'salad', 'salt', 'sandwich', 'scissors', 'shirt', 'shoe', 'skirt', 'sock', 'soup', 'spaghetti', 'spoon', 'steak', 'sugar', 'table', 'taste', 'tomato', 'watermelon', 'wine',
  ],
  school_learning_media: [
    'album', 'art', 'board', 'book', 'camera', 'card', 'class', 'college', 'comic', 'compute', 'course', 'crayon', 'desk', 'dialogue', 'draw', 'example', 'file', 'film', 'form', 'homework', 'image', 'internet', 'issue', 'lesson', 'letter', 'library', 'line', 'map', 'mathematics', 'model', 'newspaper', 'note', 'notebook', 'page', 'paint', 'paper', 'pen', 'pencil', 'picture', 'print', 'problem', 'project', 'question', 'quiz', 'read', 'robot', 'science', 'school', 'software', 'study', 'teach', 'telephone', 'television', 'test', 'textbook', 'type', 'video', 'website', 'word', 'write',
  ],
  play_sport_arts: [
    'badminton', 'ball', 'baseball', 'basket', 'basketball', 'bat', 'camp', 'club', 'court', 'dance', 'drum', 'exercise', 'football', 'fun', 'game', 'goal', 'guitar', 'helmet', 'hike', 'hiking', 'hobby', 'holiday', 'marathon', 'medal', 'movie', 'music', 'party', 'piano', 'radio', 'race', 'recreation', 'rest_and_play', 'sing', 'ski', 'skate', 'soccer', 'song', 'sound', 'sport', 'swim', 'tent', 'track', 'team', 'tennis', 'violin',
  ],
  town_travel_places: [
    'airplane', 'area', 'bank', 'bike', 'boat', 'bridge', 'bus', 'car', 'center', 'city', 'corner', 'country', 'customer', 'drive', 'enter', 'go', 'hospital', 'land', 'mail', 'market', 'near', 'north', 'office', 'park', 'pilot', 'place', 'police', 'restroom', 'restaurant', 'road', 'room', 'ship', 'shop', 'side', 'south', 'store', 'street', 'subway', 'taxi', 'ticket', 'town', 'train', 'travel', 'trip', 'truck', 'village', 'visit', 'west',
  ],
  nature_weather_animals: [
    'air', 'animal', 'autumn', 'beach', 'bear', 'bee', 'bird', 'cat', 'cloud', 'cow', 'dog', 'duck', 'earth', 'egg', 'elephant', 'farm', 'field', 'fire', 'fish', 'flower', 'forest', 'fox', 'gas', 'garden', 'grass', 'ground', 'heat', 'hill', 'horse', 'hunt', 'lake', 'lion', 'monkey', 'moon', 'mountain', 'mouse', 'nature', 'pig', 'puppy', 'rabbit', 'rain', 'river', 'rock', 'rose', 'sand', 'sea', 'sky', 'snow', 'star', 'stone', 'sun', 'tail', 'tiger', 'tree', 'water', 'weather', 'wind', 'winter', 'wood', 'zoo',
  ],
  time_numbers_measure: [
    'afternoon', 'busy', 'clock', 'date', 'day', 'early', 'eight', 'eleven', 'evening', 'first', 'five', 'four', 'future', 'hour', 'last', 'late', 'month', 'morning', 'next', 'night', 'nine', 'now', 'number', 'one', 'second', 'season', 'seven', 'six', 'spring', 'summer', 'ten', 'thirteen', 'thirty', 'third', 'three', 'time', 'today', 'tomorrow', 'tonight', 'twelve', 'twenty', 'twenty-first', 'twenty-second', 'twenty-third', 'twice', 'two', 'week', 'weekend', 'year', 'yesterday',
  ],
  communication_thinking_social: [
    'agree', 'answer', 'ask', 'believe', 'call', 'care', 'celebrate', 'change', 'check', 'choose', 'congratulate', 'control', 'culture', 'decide', 'discuss', 'dream', 'explain', 'favorite', 'feel', 'fine', 'focus', 'forget', 'glad', 'goodbye', 'god', 'guess', 'happy', 'hate', 'hello', 'help', 'hope', 'idea', 'introduce', 'invite', 'join', 'know', 'learn', 'like', 'listen', 'love', 'luck', 'mean', 'meet', 'memory', 'mind', 'miss', 'name', 'need', 'remember', 'say', 'see', 'show', 'sorry', 'speak', 'story', 'talk', 'tell', 'thank', 'think', 'understand', 'voice', 'wait', 'welcome', 'wish', 'worry',
  ],
  action_change_description: [
    'act', 'add', 'arrive', 'be', 'become', 'begin', 'borrow', 'break', 'bring', 'build', 'burn', 'buy', 'carry', 'catch', 'clean', 'climb', 'collect', 'come', 'cost', 'cover', 'cross', 'cry', 'cut', 'die', 'do', 'drop', 'eat', 'end', 'fall', 'fail', 'fight', 'fill', 'find', 'finish', 'fix', 'fly', 'get', 'give', 'grow', 'hang', 'have', 'hit', 'hold', 'hurry', 'jump', 'keep', 'kick', 'kill', 'kiss', 'lie', 'live', 'look', 'make', 'marry', 'move', 'open', 'pass', 'pay', 'pick', 'play', 'push', 'put', 'return', 'run', 'save', 'sell', 'send', 'set', 'sit', 'sleep', 'smell', 'smile', 'stand', 'start', 'stay', 'stop', 'take', 'touch', 'try', 'turn', 'use', 'wake', 'walk', 'want', 'watch', 'wash', 'wear', 'win', 'work',
  ],
  society_culture_work: [
    'base', 'beauty', 'bill', 'business', 'campaign', 'case', 'chance', 'church', 'circle', 'company', 'condition', 'danger', 'design', 'energy', 'fact', 'festival', 'freedom', 'gold', 'group', 'habit', 'history', 'job', 'king', 'law', 'life', 'marriage', 'money', 'nation', 'news', 'plan', 'power', 'present', 'program', 'queen', 'sale', 'service', 'staff', 'style', 'war', 'wedding', 'world',
  ],
  objects_and_materials: [
    'alright', 'bad', 'big', 'black', 'blue', 'bottom', 'bright', 'brown', 'cash', 'cheap', 'clear', 'cold', 'color', 'cool', 'dark', 'deep', 'delicious', 'different', 'difficult', 'double', 'dry', 'far', 'fast', 'fat', 'free', 'fresh', 'full', 'good', 'great', 'gray', 'green', 'hard', 'heavy', 'high', 'hot', 'large', 'laser', 'lazy', 'left', 'light', 'little', 'long', 'low', 'many', 'middle', 'new', 'nice', 'okay', 'old', 'orange', 'part', 'pink', 'point', 'poor', 'pretty', 'quick', 'quiet', 'ready', 'red', 'ribbon', 'rich', 'ring', 'right', 'safe', 'same', 'short', 'sick', 'size', 'slow', 'small', 'soft', 'speed', 'strong', 'sure', 'tall', 'thing', 'thirst', 'tire', 'top', 'true', 'ugly', 'umbrella', 'warm', 'wall', 'weight', 'wet', 'white', 'window', 'wrong', 'yellow',
  ],
};

BATCH_01_TOPICS.home_food_clothes.push('toy', 'vegetable');
BATCH_01_TOPICS.school_learning_media.push('tape');
BATCH_01_TOPICS.play_sport_arts.push('score');
BATCH_01_TOPICS.town_travel_places.push('way');
BATCH_01_TOPICS.nature_weather_animals.push('space');

const topicByWord = new Map();
for (const [topic, words] of Object.entries(BATCH_01_TOPICS)) {
  for (const word of words) {
    if (topicByWord.has(word)) throw new Error(`Duplicate topic assignment: ${word}`);
    topicByWord.set(word, topic);
  }
}

const cards = (await Promise.all(
  [1, 2, 3, 4].map(async (batch) => JSON.parse(await readFile(resolve(SOURCE_DIR, `authoring-batch-0${batch}.json`), 'utf8'))),
)).flat();
const sourceWords = new Set(cards.map(({ word }) => word));
const missing = cards.filter(({ word }) => !topicByWord.has(word)).map(({ word }) => word);
if (missing.length) {
  throw new Error(`Topic map mismatch. missing=${missing.join(', ')}`);
}

const payload = {
  schemaVersion: 1,
  status: 'in_progress',
  source: {
    cardSource: 'authoring-batch-01.json~authoring-batch-04.json',
    classificationBasis: 'reviewed Korean gloss and example sentence',
    orderingBasis: 'commercial ELT topic/context organization; not alphabetic, POS balance, or frequency alone',
  },
  topics: Object.keys(BATCH_01_TOPICS),
  cards: cards.map(({ id, word }) => ({ id, word, primaryTopic: topicByWord.get(word), reviewStatus: 'editorial-draft' })),
  validation: {
    sourceCardCount: cards.length,
    taggedCardCount: cards.length,
    duplicateIds: 0,
    untaggedCards: 0,
  },
};

await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${OUTPUT}: ${payload.cards.length} tagged cards.`);
