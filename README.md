```
 ___       _                 _                 ____  _             _
|_ _|_ __ | |_ ___ _ ____  _(_) _____      __ / ___|| |_ _   _  __| |_   _
 | || '_ \| __/ _ \ '__\ \/ / |/ _ \ \ /\ / / \___ \| __| | | |/ _` | | | |
 | || | | | ||  __/ |   \  /| |  __/\ V  V /   ___) | |_| |_| | (_| | |_| |
|___|_| |_|\__\___|_|   /_/ |_|\___| \_/\_/   |____/ \__|\__,_|\__,_|\__, |
                                                                      |___/
```

**A hot-reload practice environment for coding interview problems.**

![node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen) ![yarn 4.13.0](https://img.shields.io/badge/yarn-4.13.0-blue) ![ESM](https://img.shields.io/badge/module-ESM-yellow)

Select a problem, pick JavaScript or Python, and start coding — tests re-run automatically on every save. Problems reveal themselves progressively: you only see the next part after passing the current one. A built-in timer tracks your session, and stats persist across attempts so you can measure improvement over time. VS Code launches automatically with AI completions disabled for distraction-free practice.

The repo also includes an agent skills system — point any AI coding agent at the repo and it can generate new problems, provide tiered hints mid-session, and review your completed solutions. The CLI itself has no AI dependency; the skills interact through the filesystem only.

---

## Quick Start

```bash
corepack enable                  # activates Yarn 4 (one-time setup)
git clone <repo-url> && cd interview-study
yarn install                     # installs dependencies via Plug'n'Play (no node_modules/)
yarn start                       # launches the CLI
```

On first run, pick a problem, choose a language, and start editing the workspace file. Tests run on save.

![Main menu](docs/media/main-menu.png)

## Prerequisites

| Requirement | Verify | Notes |
|---|---|---|
| **Node.js** (>=18) | `node --version` | Required for the CLI and Jest |
| **Corepack** | `corepack --version` | Ships with Node 18+. Run `corepack enable` once to activate Yarn 4 |
| **Yarn 4** | `yarn --version` | Managed via Corepack — do not install globally. The repo pins `yarn@4.13.0` in `package.json` |
| **Python 3** | `python3 --version` | Required only for Python problems |
| **pytest** | `pytest --version` | `pip install pytest`. Required only for Python problems |
| **VS Code** + `code` CLI | `which code` | The CLI launches VS Code automatically. Install the shell command: Cmd+Shift+P > "Shell Command: Install 'code' command in PATH" |
| **AI coding agent** | — | For agent skills only. Any agent with file access to the repo (Claude Code, Cursor, GitHub Copilot, Aider, or similar). The CLI itself has no AI dependency |

---

## How It Works

The repo separates read-only problem definitions from your working code. Problem configs, stubs, and test suites live in `problems/` and are never modified at runtime. When you start a problem, the CLI copies the starter scaffold into `workspace/<name>/`, which is gitignored — your progress stays local and the repo remains cleanly clonable.

Multi-part problems use progressive revelation. You start with Part 1's scaffold and tests. When all tests pass, the CLI appends the next part's scaffold to the same file and activates its tests. You never switch files — the solution accumulates as you advance. The total number of parts is hidden during a session; you only see how many you have unlocked.

Every session is timed. You choose between stopwatch mode (count up) and countdown mode (set a time limit). The timer runs in the summary line, pauses on demand, and persists to `session.json` so you can resume where you left off. On session end, the attempt is recorded with per-part split times for later review.

VS Code opens via a workspace file that disables GitHub Copilot, Tabnine, Codeium, and other AI completion extensions. A sandboxed user-data directory (`--user-data-dir .vscode-data`) ensures these settings only apply during practice sessions — your normal VS Code configuration is untouched.

---

## Features

### :computer: Starting a Problem

The problem picker shows each problem's title, description, and a status badge indicating prior progress: `[in progress]`, `[part N reached]`, or `[complete]`. After selecting a problem and language, you set a time limit (countdown mode) or press Enter for stopwatch mode. If the problem defines `expectedMinutes` in its config, that value pre-populates the countdown prompt.

Existing sessions prompt you to **resume** (restore your file and timer state) or **restart from scratch** (overwrite with the Part 1 scaffold). During a session, press **P** to pause/resume the timer and **Q** to save and return to the menu. Ctrl+C also saves the session before exiting.

<!-- TODO: GIF — record a ~15-second session showing: select a problem, pick JS, press
     Enter for stopwatch mode, then make a save that triggers test output. Capture at
     80x24 in a dark theme. The GIF should show the summary line updating with pass/fail
     counts and the timer ticking. Use a tool like vhs or asciinema. -->
<!-- ![Session in action](docs/media/session-active.gif) -->

### :bar_chart: Stats

Aggregate practice statistics: total time, problems attempted and completed, average and best solve times, and your current streak (consecutive calendar days with at least one attempt). Select a problem to see per-problem details including attempt history with timestamps, completion status, countdown info, and per-part split times from your fastest run. See [docs/stats-and-timer.md](docs/stats-and-timer.md) for computation details.

### :stopwatch: Timer

Two modes: **stopwatch** counts up with no limit; **countdown** counts down from a set duration with color-coded urgency (green > yellow > red). Countdown mode continues into overtime rather than stopping. Milestone warnings print at 15/30/45 minutes (stopwatch) or 50%/25% remaining (countdown). The timer persists every second to `session.json` and restores on resume. See [docs/stats-and-timer.md](docs/stats-and-timer.md) for the full reference.

### :books: Problem List

A read-only browser for all available problems. Select any problem to see its full details — part titles, descriptions, and your current status. No session is started.

### :wastebasket: Clear a Problem

Removes your workspace directory for a problem, deleting the solution file and session data. Only problems with existing workspaces appear. A confirmation prompt (defaulting to No) prevents accidental clears.

### :outbox_tray: Export Skills

Exports agent skill files from `.claude/skills/` to `.agents/skills/` for use with non-Claude-Code agents (Cursor, GitHub Copilot, Aider, etc.). Strips Claude Code's YAML frontmatter so the exported files are plain markdown. Also available as a standalone script: `node .agents/scripts/init-skills.js`.

---

## Project Structure

```
.claude/skills/              # Native Claude Code skill files (slash commands)
.agents/                     # Agent skills system (no runtime dependency)
  scripts/                   #   Randomization and utility scripts (with tests in tests/scripts/)
  templates/                 #   Schema and config templates
  context/                   #   Domain knowledge documents
  skills/                    #   Generated exports for non-Claude-Code agents (gitignored)
problems/                    # Read-only problem definitions (never modified at runtime)
  <name>/                    #   problem.json, stubs (main.js/py), test suites
workspace/                   # Gitignored working area — solutions, sessions
runner/                      # CLI source (Node.js ESM, React/Ink)
  components/                #   Screen components (one per menu/view)
tests/                       # Unit tests (yarn test)
  runner/                    #   CLI logic tests
  scripts/                   #   Agent script tests
docs/                        # Reference documentation
config.json                  # User-specific settings (gitignored) — copy from config.example.json
```

---

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

---

## Agent Skills

The repo includes an agent skills system for AI-powered problem generation, progressive hints, and solution review. Skills are instruction documents that any AI coding agent can execute — they read configuration and problem data from the filesystem, generate new problems and test suites, and provide feedback on solutions. The CLI has zero dependency on the agent skills system; it does not require an API key and never invokes an agent at runtime.

Four skills are available: `/setup-config` creates your personal `config.json`, `/generate-problem` produces complete problem definitions with test suites, `/hint` provides tiered hints during a session, and `/review-solution` delivers structured feedback on completed solutions.

<!-- TODO: Screenshot — capture the terminal after running /generate-problem showing the
     concept proposal phase (title, description, parts overview, difficulty). Use a real
     generated problem, not a mock. Dark terminal theme, ~100x30 to fit the full proposal. -->
<!-- ![Problem generation](docs/media/generate-problem.png) -->

See [docs/agent-skills.md](docs/agent-skills.md) for the full reference — prerequisites, agent-specific invocation instructions (Claude Code, Cursor, GitHub Copilot, Aider), Surprise Me mode, and troubleshooting.

---

## Troubleshooting

**VS Code does not open.** The `code` CLI is not on your `$PATH`. In VS Code: Cmd+Shift+P > "Shell Command: Install 'code' command in PATH". The CLI prints a warning and continues if `code` is not found.

**Problem not showing in the menu.** The problem directory is missing a `problem.json` file, or the file contains invalid JSON. Check the CLI's startup warnings for details.

**pytest not found.** Python problems require `pytest` on the system PATH. Install it with `pip install pytest` and verify with `pytest --version`.

**Jest not discovering tests.** Problem suite files (`suite.test.js`, `sample.test.js`) are excluded from `yarn test` via `testPathIgnorePatterns` in `package.json`. This is intentional — those tests run only during interactive sessions via the CLI watcher. Runner unit tests in `tests/runner/` are the ones discovered by `yarn test`.

**Malformed `session.json`.** If a session file becomes corrupted, the CLI logs a warning and treats the problem as having no session data. Delete the file (or use "Clear a Problem") to reset.

**Node version issues.** The CLI requires Node 18 or later. Yarn 4 with Plug'n'Play requires Corepack, which ships with Node 18+. Run `corepack enable` if Yarn is not recognized.

## Contributing

Run the runner unit tests with `yarn test`. The test suite covers config loading, workspace management, UI output, file watching logic, timer math, and stats computation — all via mocked filesystem and process calls. No real I/O occurs during tests.

Problem suite files (`problems/*/suite.test.*` and `problems/*/sample.test.*`) are not part of the test suite. They test user solutions during interactive sessions and are explicitly excluded from Jest discovery.

Documentation standards are codified in [CLAUDE.md](CLAUDE.md). Any change to the runner, schemas, or user-facing behavior must include corresponding documentation updates.
