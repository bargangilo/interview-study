# Interview Study

A hot-reload practice environment for coding interview problems. Select a problem, pick JavaScript or Python, and start coding — tests re-run automatically on every save. Problems reveal themselves progressively: you only see the next part after passing the current one. A built-in timer tracks your session, and stats persist across attempts so you can measure improvement over time. VS Code launches automatically with AI completions disabled for distraction-free practice.

## Quick Start

```bash
corepack enable                  # activates Yarn 4 (one-time setup)
git clone <repo-url> && cd interview-study
yarn install                     # installs dependencies via Plug'n'Play (no node_modules/)
yarn start                       # launches the CLI
```

On first run, pick a problem, choose a language, and start editing the workspace file. Tests run on save.

## Prerequisites

| Requirement | Verify | Notes |
|---|---|---|
| **Node.js** (>=18) | `node --version` | Required for the CLI and Jest |
| **Corepack** | `corepack --version` | Ships with Node 18+. Run `corepack enable` once to activate Yarn 4 |
| **Yarn 4** | `yarn --version` | Managed via Corepack — do not install globally. The repo pins `yarn@4.13.0` in `package.json` |
| **Python 3** | `python3 --version` | Required only for Python problems |
| **pytest** | `pytest --version` | `pip install pytest`. Required only for Python problems |
| **VS Code** + `code` CLI | `which code` | The CLI launches VS Code automatically. Install the shell command: Cmd+Shift+P → "Shell Command: Install 'code' command in PATH" |

## How It Works

The repo separates read-only problem definitions from your working code. Problem configs, stubs, and test suites live in `problems/` and are never modified at runtime. When you start a problem, the CLI copies the starter scaffold into `workspace/<name>/`, which is gitignored — your progress stays local and the repo remains cleanly clonable.

Multi-part problems use progressive revelation. You start with Part 1's scaffold and tests. When all tests pass, the CLI appends the next part's scaffold to the same file and activates its tests. You never switch files — the solution accumulates as you advance. The total number of parts is hidden during a session; you only see how many you have unlocked.

Every session is timed. You choose between stopwatch mode (count up) and countdown mode (set a time limit). The timer runs in the summary line, pauses on demand, and persists to `session.json` so you can resume where you left off. On session end, the attempt is recorded with per-part split times for later review.

VS Code opens via a workspace file that disables GitHub Copilot, Tabnine, Codeium, and other AI completion extensions. A sandboxed user-data directory (`--user-data-dir .vscode-data`) ensures these settings only apply during practice sessions — your normal VS Code configuration is untouched.

## Features

### Main Menu

The CLI presents five options: **Start a Problem**, **Problem List**, **Stats**, **Clear a Problem**, and **Exit**.

### Starting a Problem

The problem picker shows each problem's title, description, and a status badge indicating prior progress: `[in progress]`, `[part N reached]`, or `[complete]`. After selecting a problem and language, you set a time limit (countdown mode) or press Enter for stopwatch mode. If the problem defines `expectedMinutes` in its config, that value pre-populates the countdown prompt.

Existing sessions prompt you to **resume** (restore your file and timer state) or **restart from scratch** (overwrite with the Part 1 scaffold). During a session, press **P** to pause/resume the timer and **Q** to save and return to the menu. Ctrl+C also saves the session before exiting.

### Problem List

A read-only browser for all available problems. Select any problem to see its full details — part titles, descriptions, and your current status. No session is started.

### Stats

Aggregate practice statistics: total time, problems attempted and completed, average and best solve times, and your current streak (consecutive calendar days with at least one attempt). Select a problem to see per-problem details including attempt history with timestamps, completion status, countdown info, and per-part split times from your fastest run. See [docs/stats-and-timer.md](docs/stats-and-timer.md) for computation details.

### Timer

Two modes: **stopwatch** counts up with no limit; **countdown** counts down from a set duration with color-coded urgency (green → yellow → red). Countdown mode continues into overtime rather than stopping. Milestone warnings print at 15/30/45 minutes (stopwatch) or 50%/25% remaining (countdown). The timer persists every second to `session.json` and restores on resume. See [docs/stats-and-timer.md](docs/stats-and-timer.md) for the full reference.

### Clear a Problem

Removes your workspace directory for a problem, deleting the solution file and session data. Only problems with existing workspaces appear. A confirmation prompt (defaulting to No) prevents accidental clears.

## Project Structure

```
config.json                            # User-specific settings (gitignored) — copy from config.example.json
.agents/                               # Agent skills system (no runtime dependency)
  skills/                              # Agent skill instruction files
  scripts/                             # Randomization and utility scripts
  templates/                           # Schema and config templates
  context/                             # Domain knowledge documents for agent skills
problems/                              # Read-only problem definitions (never modified at runtime)
  <name>/
    problem.json                   # Problem config — title, parts, tests, scaffolds
    main.js                        # JS stub (used for language detection)
    main.py                        # Python stub (used for language detection)
    suite.test.js                  # Jest tests for multi-part problems
    suite.test.py                  # pytest tests for multi-part problems
    sample.test.js                 # Jest tests for single-part (legacy) problems
    test_sample.py                 # pytest tests for single-part (legacy) problems
workspace/                         # Gitignored working area
  .gitkeep                         # Ensures the directory is committed
  <name>/                          # Created by CLI on problem start
    main.js                        # Active JS solution file
    main.py                        # Active Python solution file
    session.json                   # Timer state and attempt history
runner/                            # CLI application source (ESM, React/Ink)
  index.js                         # Entry point — renders <App /> via Ink
  app.jsx                          # Root component, useReducer state machine
  state.js                         # Screen/Action constants, pure reducer
  format.js                        # Pure string formatters (badges, timer, stats)
  watcher.js                       # File watcher, test runner, part progression
  config.js                        # Problem config loading, workspace management
  timer.js                         # Timer state machine
  stats.js                         # Session persistence, stats computation
  components/                      # Ink screen components
    MainMenu.jsx                   # Main menu with 5 options
    ProblemSelect.jsx              # Problem picker with status badges
    LanguageSelect.jsx             # Language picker (auto-selects if one)
    CountdownPrompt.jsx            # Timer mode input
    ResumeOrRestart.jsx            # Resume/restart prompt
    SessionActive.jsx              # Active session — watcher, timer, VS Code
    ProblemList.jsx                # Read-only problem browser
    ProblemListDetail.jsx          # Problem detail view
    StatsOverview.jsx              # Global stats + problem drill-down
    StatsDetail.jsx                # Per-problem stats
    ClearProblemSelect.jsx         # Problem picker for clearing
    ClearConfirm.jsx               # Clear confirmation (defaults to No)
    SummaryLine.jsx                # Test results + timer display
    Header.jsx                     # Reusable title + separator
tests/
  runner/                          # Unit tests for the CLI (run via yarn test)
    index.test.js                  # Config loading, workspace management tests
    watcher.test.js                # Test filter building, part progression tests
    format.test.js                 # Pure formatter tests
    state.test.js                  # State machine transition tests
    timer.test.js                  # Timer math and state tests
    stats.test.js                  # Stats computation and session I/O tests
    fixtures/                      # Test fixture files
docs/
  problem-schema.md                # problem.json authoring reference
  stats-and-timer.md               # Timer, session persistence, and stats reference
```

## Adding Problems

Each problem lives in its own directory under `problems/` with a `problem.json` config file. The CLI auto-detects problem directories on startup; any directory without a valid `problem.json` is skipped with a warning.

Required files for a multi-part problem:

```
problems/<name>/
  problem.json       # title, description, expectedMinutes, parts array
  main.js            # JS stub — module.exports the main function(s)
  main.py            # Python stub
  suite.test.js      # All Jest tests for all parts in one file
  suite.test.py      # All pytest tests for all parts in one file
```

The `parts` array in `problem.json` defines each part's title, description, `activeTests` (test names to run), and `scaffold` (starter code). Test names use spaces in `activeTests`; Jest matches them directly, and pytest function names mirror them with underscores prefixed by `test_`. Test files import from `../../workspace/<name>/main`, not from `problems/`.

See [docs/problem-schema.md](docs/problem-schema.md) for the full schema reference, worked examples, and common mistakes.

## Agent Skills

The repo includes agent skills for problem generation, hints, and solution review. These skills are invokable from any AI coding agent with file access — they read `config.json` and problem definitions from the filesystem and write new `problem.json` files and test suites directly into `problems/`. The CLI has zero dependency on the agent skills system; it does not require an API key and never invokes an agent at runtime.

Full documentation for each skill, its inputs, and its behavior is in `docs/agent-skills.md` (available after skill implementation is complete).

## Troubleshooting

**VS Code does not open.** The `code` CLI is not on your `$PATH`. In VS Code: Cmd+Shift+P → "Shell Command: Install 'code' command in PATH". The CLI prints a warning and continues if `code` is not found.

**Problem not showing in the menu.** The problem directory is missing a `problem.json` file, or the file contains invalid JSON. Check the CLI's startup warnings for details.

**pytest not found.** Python problems require `pytest` on the system PATH. Install it with `pip install pytest` and verify with `pytest --version`.

**Jest not discovering tests.** Problem suite files (`suite.test.js`, `sample.test.js`) are excluded from `yarn test` via `testPathIgnorePatterns` in `package.json`. This is intentional — those tests run only during interactive sessions via the CLI watcher. Runner unit tests in `tests/runner/` are the ones discovered by `yarn test`.

**Malformed `session.json`.** If a session file becomes corrupted, the CLI logs a warning and treats the problem as having no session data. Delete the file (or use "Clear a Problem") to reset.

**Node version issues.** The CLI requires Node 18 or later. Yarn 4 with Plug'n'Play requires Corepack, which ships with Node 18+. Run `corepack enable` if Yarn is not recognized.

## Contributing

Run the runner unit tests with `yarn test`. The test suite covers config loading, workspace management, UI output, file watching logic, timer math, and stats computation — all via mocked filesystem and process calls. No real I/O occurs during tests.

Problem suite files (`problems/*/suite.test.*` and `problems/*/sample.test.*`) are not part of the test suite. They test user solutions during interactive sessions and are explicitly excluded from Jest discovery.

Documentation standards are codified in [CLAUDE.md](CLAUDE.md). Any change to the runner, schemas, or user-facing behavior must include corresponding documentation updates.
