# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Hot-reload coding study environment for practicing interview problems. Users select a problem and language (JS or Python), then edit solution files while tests re-run automatically on save.

## Commands

- **Start the CLI:** `yarn start` or `./start.sh`
- **Run JS tests for a problem:** `yarn jest tests/<problem-name>/sample.test.js --no-coverage`
- **Run Python tests for a problem:** `pytest tests/<problem-name>/test_sample.py -v`
- **Install dependencies:** `yarn install` (uses Yarn 4 with PnP — no `node_modules/`)

## Architecture

The CLI (`runner/`) is a Node.js app with three modules:
- `runner/index.js` — Main loop: detects problems in `problems/`, presents interactive menu via `@inquirer/prompts`, launches watcher, listens for Q to quit
- `runner/watcher.js` — Uses `chokidar` to watch the solution file; spawns `yarn jest` or `pytest` on change; parses pass/fail counts from test runner output
- `runner/ui.js` — Terminal output helpers (summary line, status indicators)

## Adding a New Problem

1. Create `problems/<name>/main.js` with a stub function exported via `module.exports`
2. Create `problems/<name>/main.py` with a stub function
3. Create `tests/<name>/sample.test.js` (Jest) importing from `../../problems/<name>/main`
4. Create `tests/<name>/test_sample.py` (pytest) importing via `sys.path` manipulation

The CLI auto-detects problem directories — no registration needed.

## Conventions

- JS solutions use CommonJS (`module.exports` / `require`)
- Python test files manually add the problem directory to `sys.path` for imports
- Test output is parsed for pass/fail counts only — raw output is hidden from the user during interactive mode
