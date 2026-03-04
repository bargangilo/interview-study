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
- `runner/index.js` — Main loop: detects problems in `problems/`, presents interactive menu via `@inquirer/prompts`, loads problem config, initializes workspace, handles resume/restart prompt, launches watcher, listens for Q to quit
- `runner/watcher.js` — Uses `chokidar` to watch the workspace solution file; spawns `yarn jest` or `pytest` on change; parses pass/fail counts from test runner output; manages multi-part state and progression
- `runner/ui.js` — Terminal output helpers (summary line, status indicators, part progress)
- `runner/config.js` — Loads/validates `problem.json`, manages workspace paths, writes scaffolds, builds test filters, infers resume state from part delimiters

### Key Path Convention

- **Problem config, detection & test suites:** `problems/<name>/` (read-only, never written at runtime)
- **Working files:** `workspace/<name>/main.js` or `main.py` (created/written by CLI)
- **Runner unit tests:** `tests/runner/` (test the CLI itself, run via `yarn test`)

Problem test suites (`suite.test.js`, `sample.test.js`, etc.) live inside `problems/<name>/` alongside the problem config. They are excluded from `yarn test` via `testPathIgnorePatterns` in `package.json` and only invoked directly by the CLI watcher.

## Adding a New Problem

1. Create `problems/<name>/main.js` with a stub function exported via `module.exports`
2. Create `problems/<name>/main.py` with a stub function
3. Create `problems/<name>/sample.test.js` (Jest) importing from `../../workspace/<name>/main`
4. Create `problems/<name>/test_sample.py` (pytest) with `sys.path` pointing to `../../workspace/<name>`

The CLI auto-detects problem directories — no registration needed.

### Multi-Part Problems

1. Create `problems/<name>/problem.json` following the schema in `docs/problem-schema.md`
2. Create stub `main.js` / `main.py` files (needed for detection, never modified at runtime)
3. Create `problems/<name>/suite.test.js` and `problems/<name>/suite.test.py` with all tests for all parts
4. Test names in `activeTests` use spaces (Jest-style); Python function names mirror with underscores prefixed by `test_`
5. Multi-part test files are named `suite.test.*`, not `sample.test.*`

## Conventions

- JS solutions use CommonJS (`module.exports` / `require`)
- Python test files manually add the workspace problem directory to `sys.path` for imports
- Test output is parsed for pass/fail counts only — raw output is hidden from the user during interactive mode
- The `problems/` directory is never modified during a session — all writes go to `workspace/`
- The `workspace/` folder is committed (via `.gitkeep`) but contents are gitignored
- Problem test suites are co-located with problems in `problems/<name>/`, not in a separate `tests/` folder
