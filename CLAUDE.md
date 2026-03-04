# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Hot-reload coding study environment for practicing interview problems. Users select a problem and language (JS or Python), then edit solution files while tests re-run automatically on save.

## Commands

- **Start the CLI:** `yarn start` or `./start.sh`
- **Run JS tests (single-part):** `yarn jest tests/<problem-name>/sample.test.js --no-coverage`
- **Run JS tests (multi-part):** `yarn jest tests/<problem-name>/suite.test.js --no-coverage`
- **Run Python tests (single-part):** `pytest tests/<problem-name>/test_sample.py -v`
- **Run Python tests (multi-part):** `pytest tests/<problem-name>/suite.test.py -v`
- **Install dependencies:** `yarn install` (uses Yarn 4 with PnP — no `node_modules/`)

## Architecture

The CLI (`runner/`) is a Node.js app with four modules:
- `runner/index.js` — Main loop: detects problems in `problems/`, presents interactive menu via `@inquirer/prompts`, loads problem config, launches watcher, listens for Q to quit
- `runner/watcher.js` — Uses `chokidar` to watch the solution file; spawns `yarn jest` or `pytest` on change; parses pass/fail counts from test runner output; manages multi-part state and progression
- `runner/ui.js` — Terminal output helpers (summary line, status indicators, part progress)
- `runner/config.js` — Loads/validates `problem.json`, writes scaffolds, builds test filters

## Adding a New Problem

1. Create `problems/<name>/main.js` with a stub function exported via `module.exports`
2. Create `problems/<name>/main.py` with a stub function
3. Create `tests/<name>/sample.test.js` (Jest) importing from `../../problems/<name>/main`
4. Create `tests/<name>/test_sample.py` (pytest) importing via `sys.path` manipulation

The CLI auto-detects problem directories — no registration needed.

### Multi-Part Problems

1. Create `problems/<name>/problem.json` following the schema in `docs/problem-schema.md`
2. Create stub `main.js` / `main.py` files (overwritten by CLI, but needed for detection)
3. Create `tests/<name>/suite.test.js` and `tests/<name>/suite.test.py` with all tests for all parts
4. Test names in `activeTests` use spaces (Jest-style); Python function names mirror with underscores prefixed by `test_`
5. Multi-part test files are named `suite.test.*`, not `sample.test.*`

## Conventions

- JS solutions use CommonJS (`module.exports` / `require`)
- Python test files manually add the problem directory to `sys.path` for imports
- Test output is parsed for pass/fail counts only — raw output is hidden from the user during interactive mode
