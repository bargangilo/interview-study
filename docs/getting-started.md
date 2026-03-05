# Getting Started

Everything you need to go from cloning the repo to completing your first practice session.

## Prerequisites

| Requirement | Verify | Notes |
|---|---|---|
| **Node.js** (>=18) | `node --version` | Required for the CLI and Jest |
| **Corepack** | `corepack --version` | Ships with Node 18+. Run `corepack enable` once to activate Yarn 4 |
| **Yarn 4** | `yarn --version` | Managed via Corepack — do not install globally. The repo pins `yarn@4.13.0` in `package.json` |
| **Python 3** | `python3 --version` | Required only for Python problems |
| **pytest** | `pytest --version` | `pip install pytest`. Required only for Python problems |
| **VS Code** + `code` CLI | `which code` | Optional. The CLI launches VS Code automatically if available. Install the shell command: Cmd+Shift+P > "Shell Command: Install 'code' command in PATH" |
| **AI coding agent** | — | For agent skills only. Any agent with file access to the repo (Claude Code, Cursor, GitHub Copilot, Aider, or similar). The CLI itself has no AI dependency |

Check everything at once:

```bash
node --version && corepack --version && yarn --version && python3 --version && pytest --version && which code
```

If VS Code is not installed or the `code` CLI is not on your PATH, the CLI still works — it prints a warning and continues. You can edit your solution file in any editor; the file watcher triggers on any save regardless of where the edit comes from.

## Install

```bash
corepack enable                  # activates Yarn 4 (one-time setup)
git clone <repo-url> && cd handwritten
yarn install                     # installs dependencies via Plug'n'Play (no node_modules/)
```

## How It Works

### Problems and Workspaces

The repo separates read-only problem definitions from your working code. Problem configs, stubs, and test suites live in `problems/` and are never modified at runtime. When you start a problem, the CLI copies the starter scaffold into `workspace/<name>/`, which is gitignored. Your progress stays local and the repo remains cleanly clonable.

This separation means you can `git pull` to get new problems without affecting any in-progress work. It also means your solutions are never accidentally committed to the repo.

### Progressive Revelation

Multi-part problems use progressive revelation. You start with Part 1's scaffold and tests. When all tests pass, the CLI appends the next part's scaffold to the same file and activates its tests. You never switch files — your solution accumulates as you advance.

The total number of parts is hidden during a session. You only see how many you have unlocked, not how many remain. This mirrors real interviews where follow-up questions are unknown until you finish the current one.

### Timer and Sessions

Every session is timed. When you start a problem, you choose between stopwatch mode (counts up with no limit) or countdown mode (set a time limit in minutes). If the problem defines an expected time, that value pre-populates the countdown prompt.

The timer runs in the summary line at the bottom of the screen. Countdown mode changes color as time runs low — green above 50%, yellow at 25-50%, red below 25%. When the countdown hits zero, the session continues in overtime rather than stopping.

Press **P** to pause or resume the timer at any time. Timer state persists to `session.json` every second, so you can quit and resume later without losing progress. See [stats-and-timer.md](stats-and-timer.md) for the full reference.

### VS Code Sandboxing

When you start a session, the CLI launches VS Code via a workspace file that disables GitHub Copilot, Tabnine, Codeium, and other AI completion extensions. A sandboxed user-data directory (`--user-data-dir .vscode-data`) ensures these settings only apply during practice sessions — your normal VS Code configuration is untouched.

This matters because the point of handwritten practice is writing code without AI assistance. The sandbox ensures your muscle memory is genuine.

## First Run Walkthrough

### 1. Launch the CLI

```bash
yarn start
```

The main menu appears with six options: Start a Problem, Stats, Problem List, Settings, Clear a Problem, and Export Skills.

### 2. Select a Problem

Choose **Start a Problem**. The problem picker shows each problem's title, description, and a status badge: `[new]` for problems you haven't tried, `[in progress]` for active sessions, `[part N reached]` for partially completed problems, and `[complete]` for problems you've finished.

Pick any problem to start.

### 3. Choose a Language

Select JavaScript or Python. The CLI creates a workspace file (`workspace/<name>/main.js` or `main.py`) with Part 1's starter scaffold.

### 4. Set a Timer

The countdown prompt appears. If the problem has a suggested time, it pre-populates the field. Enter a number of minutes for countdown mode, or press Enter with no value for stopwatch mode.

### 5. Start Coding

VS Code opens (if available) with your solution file. The CLI shows the session screen with:
- The current part title and description
- A summary line with test results, last run time, and timer

Open the workspace file in your editor and start implementing the function. When you save the file, the CLI detects the change and runs the test suite automatically. Results appear in the summary line within a few seconds.

### 6. Pass Tests and Advance

When all tests for the current part pass, the CLI prints a completion message and appends the next part's scaffold to your file. The test suite expands to include the new part's tests alongside the previous ones. Keep coding in the same file.

### 7. Quit and Resume

Press **Q** at any time to save your session and return to the main menu. Press **P** to pause or resume the timer. Press **Ctrl+C** to save and exit the CLI entirely.

When you come back, select the same problem and choose **Resume where you left off**. The CLI restores your file, timer state, and current part. No time is counted while the CLI is not running.

### 8. Review Your Stats

From the main menu, select **Stats** to see aggregate practice statistics: total time, problems attempted and completed, average and best solve times, and your current streak (consecutive days with at least one attempt). Select a specific problem to see per-problem details including attempt history and per-part split times.

## Troubleshooting

**VS Code does not open.** The `code` CLI is not on your `$PATH`. In VS Code: Cmd+Shift+P > "Shell Command: Install 'code' command in PATH". The CLI prints a warning and continues if `code` is not found.

**Problem not showing in the menu.** The problem directory is missing a `problem.json` file, or the file contains invalid JSON. Check the CLI's startup warnings for details.

**pytest not found.** Python problems require `pytest` on the system PATH. Install it with `pip install pytest` and verify with `pytest --version`.

**Jest not discovering tests.** Problem suite files (`suite.test.js`, `sample.test.js`) are excluded from `yarn test` via `testPathIgnorePatterns` in `package.json`. This is intentional — those tests run only during interactive sessions via the CLI watcher. Runner unit tests in `tests/runner/` are the ones discovered by `yarn test`.

**Malformed `session.json`.** If a session file becomes corrupted, the CLI logs a warning and treats the problem as having no session data. Delete the file (or use "Clear a Problem") to reset.

**Node version issues.** The CLI requires Node 18 or later. Yarn 4 with Plug'n'Play requires Corepack, which ships with Node 18+. Run `corepack enable` if Yarn is not recognized.

**Settings menu shows "Config schema not found".** The file `.agents/config-schema.json` is missing or has been moved. This file drives the settings menu at runtime. If it was accidentally deleted, restore it from git: `git checkout -- .agents/config-schema.json`.

**Generated problem not passing tests after generation.** The `activeTests` strings in `problem.json` must exactly match the test names in the suite file — character for character. A single typo causes the test to silently not run. See [problem-schema.md](problem-schema.md) for the matching rules and the common mistakes checklist.

## Contributing

Run the runner unit tests with `yarn test`. The test suite covers config loading, workspace management, UI output, file watching logic, timer math, and stats computation — all via mocked filesystem and process calls. No real I/O occurs during tests.

Problem suite files (`problems/*/suite.test.*` and `problems/*/sample.test.*`) are not part of the test suite. They test user solutions during interactive sessions and are explicitly excluded from Jest discovery.

Documentation standards are codified in [../CLAUDE.md](../CLAUDE.md). Any change to the runner, schemas, or user-facing behavior must include corresponding documentation updates.
