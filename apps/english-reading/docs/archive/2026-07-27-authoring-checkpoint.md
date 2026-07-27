# 81–120 Authoring Checkpoint

Date: 2026-07-27

- Created eight reviewed draft batches in `docs/authoring/draft-081-085.json` through `draft-116-120.json` (40 passages).
- Each batch passed strict `tools/validate-draft.mjs` validation after iterative fixes. A small number of advisory sentence-length rhythm notes remain.
- `tests/run-node.mjs` passes for the existing published 80 passages.
- Completed canonical merge: `tools/merge-drafts.mjs --apply` added all 40 drafts to `src/data/passages.json`, raising the published data total from 80 to 120. The temporary main.js runtime draft loader was removed.
- `node tests/run-node.mjs` passes with the 120-passage data set. `node tools/build-standalone.mjs` regenerated `dist/standalone.html` (909KB).
- Remaining release steps from `CLAUDE.md`: bump the root service-worker cache version, visually verify real interaction paths, then deploy through `/web-deploy`.
