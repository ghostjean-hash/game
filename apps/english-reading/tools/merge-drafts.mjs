import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const draftFiles = [
  "drafts/batch-01.json", "drafts/batch-02.json", "drafts/batch-03.json",
  "drafts/batch-04.json", "drafts/batch-05.json", "drafts/batch-06.json",
  "drafts/batch-07.json", "drafts/batch-08.json", "drafts/batch-09.json",
  "drafts/batch-10.json",
];
const target = resolve("src/data/passages.json");
const data = JSON.parse(readFileSync(target, "utf8"));
const drafts = draftFiles.flatMap((file) => JSON.parse(readFileSync(resolve(file), "utf8")));
const existing = new Set(data.courses.flatMap((c) => c.passages).map((p) => p.id));
const duplicates = drafts.filter((p) => existing.has(p.id)).map((p) => p.id);
if (duplicates.length) throw new Error(`Duplicate IDs: ${duplicates.join(", ")}`);

const byTopic = new Map();
drafts.forEach((p) => {
  if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
  byTopic.get(p.topic).push(p);
});
byTopic.forEach((passages, topic) => {
  let course = data.courses.find((c) => c.title === topic);
  if (!course) {
    course = { id: topic.toLowerCase().replace(/\s+/g, "-"), title: topic, passages: [] };
    data.courses.push(course);
  }
  course.passages.push(...passages);
  course.passages.sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));
});

if (process.argv.includes("--apply")) {
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Merged ${drafts.length} passages; total ${data.courses.flatMap((c) => c.passages).length}.`);
} else {
  console.log(`Ready to merge ${drafts.length} passages; run with --apply.`);
}
