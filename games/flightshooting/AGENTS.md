# Repository Guidelines

## Project Structure & Module Organization

This directory contains the **Bapuri's Flight** browser game. Keep gameplay code in `src/`:

- `src/core/` contains pure gameplay systems such as spawning, collisions, firing, waves, and autopilot behavior.
- `src/data/` is the source of truth for tunable values, colors, countries, and fallback scenes. Do not scatter balance numbers through rendering or loop code.
- `src/render/` owns Canvas drawing; `src/audio/` owns Web Audio synthesis; `src/main.js` connects UI, input, and the game loop.
- `assets/` stores shipped PNG artwork. Retain source sheets under each asset family's `sources/` directory.
- `docs/` records design decisions. Update the relevant document before changing behavior.
- `tests/test.html` is the browser test suite; `prototype/` is for disposable visual experiments.

## Build, Test, and Development Commands

There is no package manager or build step: this is vanilla ES modules and Canvas.

```powershell
node ..\..\scripts\dev-server.mjs 8000
```

Run that command from this directory, then open `http://127.0.0.1:8000/games/flightshooting/`. The server disables cache, which avoids service-worker confusion during local testing.

Use quick static checks after JavaScript edits:

```powershell
node --check src\core\autopilot.js
git diff --check
```

Open `http://127.0.0.1:8000/games/flightshooting/tests/test.html` to run the full in-browser core test suite.

## Coding Style & Naming Conventions

Use ES modules, two-space indentation, semicolons, and single quotes. Prefer small named functions and plain game-state objects. Use `camelCase` for variables/functions, `PascalCase` only for constructors/classes, and `kebab-case` for asset filenames (for example, `player-main-tier-4.png`). Keep rendering side effects out of `src/core/`.

## Testing Guidelines

Add a focused `test('behavior description', () => ...)` case in `tests/test.html` for each gameplay regression. Cover edge cases for collision, limits, and timing. Test changed difficulty values in-game as well as through core tests.

## Commit & Pull Request Guidelines

Use Conventional Commits with the game scope, e.g. `feat(flightshooting): add predicted bullet avoidance` or `fix(flightshooting): clamp world-map wrap`. Keep commits cohesive. Pull requests should explain player-visible changes, list validation performed, link issues when applicable, and include screenshots for UI or visual-asset changes.

## Asset and Safety Notes

Do not delete or overwrite source artwork without explicit approval. Preserve unrelated working-tree changes. Avoid committing local prototypes unless they are intentionally part of the game.
