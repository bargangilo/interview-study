# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Hot-reload coding study environment for practicing interview problems. Users select a problem and language (JS or Python), then edit solution files while tests re-run automatically on save. User edits happen in `workspace/` (gitignored); `problems/` is read-only source of truth.

## Commands

- **Start the CLI:** `yarn start` or `./start.sh`
- **Run runner unit tests:** `yarn test`
- **Run JS problem tests (single-part):** `yarn jest problems/<problem-name>/sample.test.js --no-coverage`
- **Run JS problem tests (multi-part):** `yarn jest problems/<problem-name>/suite.test.js --no-coverage`
- **Run Python problem tests (single-part):** `pytest problems/<problem-name>/test_sample.py -v`
- **Run Python problem tests (multi-part):** `pytest problems/<problem-name>/suite.test.py -v`
- **Install dependencies:** `yarn install` (uses Yarn 4 with PnP — no `node_modules/`)

## Architecture

The CLI (`runner/`) is a Node.js app with four modules:
- `runner/index.js` — Main menu (Start a Problem, Problem List, Clear a Problem, Exit), problem picker with descriptions and status badges, workspace init, resume/restart prompt, VS Code launch, session lifecycle
- `runner/watcher.js` — Uses `chokidar` to watch the workspace solution file; spawns `yarn jest` or `pytest` on change; parses pass/fail counts from test runner output; manages multi-part state and progression
- `runner/ui.js` — Terminal output helpers (summary line, status indicators, part progress, status badge formatting)
- `runner/config.js` — Loads/validates `problem.json`, manages workspace paths, writes scaffolds, builds test filters, infers resume state from part delimiters, workspace status detection, completion markers

### Key Path Convention

- **Problem config, detection & test suites:** `problems/<name>/` (read-only, never written at runtime)
- **Working files:** `workspace/<name>/main.js` or `main.py` (created/written by CLI)
- **Runner unit tests:** `tests/runner/` (test the CLI itself, run via `yarn test`)

Problem test suites (`suite.test.js`, `sample.test.js`, etc.) live inside `problems/<name>/` alongside the problem config. They are excluded from `yarn test` via `testPathIgnorePatterns` in `package.json` and only invoked directly by the CLI watcher.

## Adding a New Problem

1. Create `problems/<name>/problem.json` with `title`, `description`, and `parts` array (see `docs/problem-schema.md`)
2. Create `problems/<name>/main.js` with a stub function exported via `module.exports`
3. Create `problems/<name>/main.py` with a stub function
4. Create test files in `problems/<name>/` importing from `../../workspace/<name>/main`

The CLI auto-detects problem directories. Problems without a `problem.json` are skipped with a warning.

### Multi-Part Problems

1. Create `problems/<name>/problem.json` following the schema in `docs/problem-schema.md`
2. Create stub `main.js` / `main.py` files (needed for detection, never modified at runtime)
3. Create `problems/<name>/suite.test.js` and `problems/<name>/suite.test.py` with all tests for all parts
4. Test names in `activeTests` use spaces (Jest-style); Python function names mirror with underscores prefixed by `test_`
5. Multi-part test files are named `suite.test.*`, not `sample.test.*`

## Testing

Runner unit tests live in `tests/runner/` and cover config loading, workspace management, UI output, and watcher logic. Always add or update tests when making changes to the runner:

- **New features:** Add tests covering the new behavior in the appropriate test file (`index.test.js`, `watcher.test.js`, or `ui.test.js`)
- **Bug fixes:** Add a regression test that would have caught the bug
- **Refactors:** Ensure existing tests still pass; update assertions if behavior intentionally changed
- Run `yarn test` to verify all tests pass before considering work complete

Test files mock `fs`, `child_process`, and `chokidar` — no real filesystem or process calls. Use the existing test patterns (mock setup in `beforeEach`/per-test, `stripAnsi` helper for UI tests, fixture files in `tests/runner/fixtures/`).

## Conventions

- JS solutions use CommonJS (`module.exports` / `require`)
- Python test files manually add the workspace problem directory to `sys.path` for imports
- Test output is parsed for pass/fail counts only — raw output is hidden from the user during interactive mode
- The `problems/` directory is never modified during a session — all writes go to `workspace/`
- The `workspace/` folder is committed (via `.gitkeep`) but contents are gitignored
- Problem test suites are co-located with problems in `problems/<name>/`, not in a separate `tests/` folder
