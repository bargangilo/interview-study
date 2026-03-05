# CLAUDE.md

Standing instructions for Claude Code when working on this repository. Follow these exactly.

## Project Overview

Interview Study is a hot-reload CLI tool for practicing coding interview problems. A solo developer selects a problem, picks JavaScript or Python, and edits a solution file while tests re-run automatically on save. Problems reveal parts progressively — the user only sees the next part after passing the current one. Sessions are timed and persisted, with stats tracking across attempts.

The tool is feature-complete. The primary ongoing work is adding new problems and maintaining the runner.

## Environment and Tooling

**Package manager:** Yarn 4 with Plug'n'Play. There is no `node_modules/` directory. The repo pins `yarn@4.13.0` via the `packageManager` field in `package.json`.

```bash
yarn install          # install dependencies
yarn start            # launch the CLI (or: ./start.sh)
yarn test             # run runner unit tests
```

To run problem test suites directly (outside the CLI):

```bash
yarn jest problems/<name>/suite.test.js --no-coverage        # JS multi-part
yarn jest problems/<name>/sample.test.js --no-coverage       # JS single-part
pytest problems/<name>/suite.test.py -v                      # Python multi-part
pytest problems/<name>/test_sample.py -v                     # Python single-part
```

**Node.js:** Requires Node 18 or later. Verify with `node --version`.

**Python:** Required only for Python problems. Needs `python3` and `pytest` on PATH.

**VS Code:** The CLI launches VS Code with `code`. Not required for the CLI to function — a warning prints if `code` is not found.

## Architecture

The CLI (`runner/`) is a Node.js ESM app using React and Ink for terminal UI. It uses `tsx` as the runtime for JSX support.

### Core Modules

- `runner/index.js` — Minimal entry point. Renders `<App />` via Ink's `render()` and waits for exit.
- `runner/app.jsx` — Root React component. Uses `useReducer` with the state machine from `state.js`. Switches on `state.screen` to render the appropriate screen component. Loads problem data and passes it as props.
- `runner/state.js` — Application state machine. Exports `Screen` constants (12 screens), `Action` constants, `initialState`, and a pure `reducer(state, action)` function. No side effects.
- `runner/format.js` — Pure string-returning formatters. Status badges, timer segment, milestone warnings, global/problem stats formatting. No I/O.
- `runner/watcher.js` — File watcher (`chokidar`). Spawns `yarn jest` or `pytest` on save, parses pass/fail counts, manages multi-part state and part advancement. Uses a `callbacks` parameter for UI updates — no direct console output.
- `runner/config.js` — Problem config loading and validation. Workspace path management, scaffold writes, test filter building, resume state inference from file delimiters, workspace status detection, completion markers.
- `runner/timer.js` — Timer state machine. Stopwatch and countdown modes, pause/resume, wall-clock-based elapsed math (never increments a counter), milestone tracking, serialization for session persistence.
- `runner/stats.js` — Session I/O (`session.json`). Global and per-problem stats computation, streak calculation, time formatting utilities.

### Components

Screen components live in `runner/components/`. Each maps to a `Screen` constant and receives `dispatch` plus relevant state slices as props:

- `MainMenu.jsx`, `ProblemSelect.jsx`, `LanguageSelect.jsx`, `CountdownPrompt.jsx`, `ResumeOrRestart.jsx`, `SessionActive.jsx`, `ProblemList.jsx`, `ProblemListDetail.jsx`, `StatsOverview.jsx`, `StatsDetail.jsx`, `ClearProblemSelect.jsx`, `ClearConfirm.jsx`
- `SummaryLine.jsx` — Test results + timer display line
- `Header.jsx` — Reusable title + separator

Interactive components use `Select` and `TextInput` from `@inkjs/ui`. Key handlers use Ink's `useInput`. Append-only messages (part completions, milestones) use Ink's `<Static>`.

### Key Paths

| Path | Purpose | Written at Runtime |
|---|---|---|
| `problems/<name>/` | Problem config, stubs, test suites | Never |
| `workspace/<name>/main.js`, `main.py` | Active solution file | Yes (scaffold, part appends, completion marker) |
| `workspace/<name>/session.json` | Timer state, attempt history | Yes (every tick + session end) |
| `tests/runner/` | Runner unit tests | Never |

Problem test suites (`suite.test.js`, `sample.test.js`, etc.) live inside `problems/<name>/`. They are excluded from `yarn test` via `testPathIgnorePatterns` in `package.json`.

## Documentation Standards

### Documentation is Part of Done

A task is not complete until all affected documentation is updated. Before starting implementation, identify every file in `README.md`, `docs/`, and this file that will be affected. Updating them is a required deliverable, not optional cleanup.

### What Triggers a Documentation Update

- Any change to main menu options or session flow → update README Features and How It Works sections
- Any change to `problem.json` or `session.json` schema → update the relevant `docs/` file and README Adding Problems section atomically with the code change
- Any new, renamed, or moved folder or file → update the README Project Structure diagram and grep all markdown files for stale path references
- Any new CLI keypress, flag, or user-facing behavior → update README Features
- Any change to environment requirements or install steps → update README Prerequisites and this file's Environment section
- Any new `docs/` file → link it from the README on creation

### Voice and Quality

Write in active voice. Be technical and direct. Write for competent developers reading for the first time. Do not use marketing language, filler phrases, or excessive hedging. Do not add bullet points where a short paragraph reads better. Do not use scaffolding language ("TBD", "coming soon", "this will be added later").

Read existing docs before writing new content and match the established register. The quality test: a developer cloning this repo with zero context should be able to understand what it does, run it, and add a new problem using only the docs.

### Schema Docs are Contracts

`problem.json` and `session.json` each have a corresponding doc file that serves as an API reference. If the schema changes in code, the doc changes in the same task. There is no acceptable lag between implementation and documentation for schema changes.

### Cross-Reference Integrity

When renaming anything — a file, a folder, a concept — grep all markdown files for references to the old name and update them. Stale cross-references are bugs.

### New Features and New Docs

If a feature is complex enough to affect the tool's mental model, it warrants a `docs/` file. Use the existing docs as calibration for what level of complexity earns its own file. New `docs/` files must be linked from the README on creation.

## Testing

Runner unit tests live in `tests/runner/` and cover config loading, workspace management, UI output, watcher logic, timer math, and stats computation.

### Test Files

| File | Covers |
|---|---|
| `index.test.js` | Config loading, workspace management, menu structure |
| `watcher.test.js` | Test filter building, part progression, scaffold appending |
| `format.test.js` | Pure formatters: status badges, timer segment, milestone warnings, stats formatting |
| `state.test.js` | State machine: screen transitions, back navigation, action handling |
| `timer.test.js` | Timer math, pause/resume, milestones, serialization |
| `stats.test.js` | Stats computation, session I/O, streak, time formatting |

### Patterns

All test files mock `fs`, `child_process`, and `chokidar` — no real filesystem or process calls. Timer tests use `jest.useFakeTimers()` to control `setInterval` and mock `Date.now()`. Format tests use a `stripAnsi` helper. Fixture files live in `tests/runner/fixtures/`. Jest uses `babel-jest` with `@babel/preset-env` and `@babel/preset-react` to transform ESM and JSX.

### Expectations

- New features: add tests covering the new behavior in the appropriate test file
- Bug fixes: add a regression test that would have caught the bug
- Refactors: ensure existing tests pass; update assertions if behavior intentionally changed
- Run `yarn test` and verify all tests pass before considering work complete

Never configure Jest to discover problem suite files (`problems/*/suite.test.*`, `problems/*/sample.test.*`). Those test user solutions during interactive sessions. Never modify runner logic solely to make tests pass — if something is genuinely untestable, note it in a comment.

## Adding Problems

1. Create `problems/<name>/problem.json` with `title`, `description`, and `parts` array
2. Create `problems/<name>/main.js` with a stub function exported via `module.exports`
3. Create `problems/<name>/main.py` with a stub function
4. Create `problems/<name>/suite.test.js` and `suite.test.py` with all tests for all parts

Test names in `activeTests` use spaces. Jest matches them directly. Python function names mirror them: `test_` prefix, underscores for spaces. Test files import from `../../workspace/<name>/main`. Multi-part test files are named `suite.test.*`, not `sample.test.*`.

See [docs/problem-schema.md](docs/problem-schema.md) for the full schema reference.

## Conventions

- All JS uses ESM (`import` / `export`). The `"type": "module"` field is set in `package.json`.
- JSX files use the `.jsx` extension and are transpiled by `tsx` at runtime and `babel-jest` in tests.
- Python test files add the workspace problem directory to `sys.path` for imports
- The `problems/` directory is never modified at runtime — all writes go to `workspace/`
- The `workspace/` folder is committed (via `.gitkeep`) but contents are gitignored
- Problem test suites are co-located with problems in `problems/<name>/`

## Things to Never Do

- Use a package manager other than Yarn (`npm install`, `npx`, `pnpm`)
- Add a dependency without noting it in the task summary and updating README Prerequisites
- Leave a `TODO` or placeholder in documentation
- Describe a feature in docs that has not been implemented
- Leave the README Project Structure diagram out of sync with the actual filesystem
- Guess at environment requirements — read `package.json` and lockfiles
- Configure Jest to discover problem suite files in `problems/`
- Modify `problems/` at runtime
