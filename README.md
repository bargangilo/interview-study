# Interview Study

A hot-reload coding study environment for practicing interview problems.

## Getting Started

```bash
yarn install
./start.sh
# or: yarn start
```

## How It Works

1. Select a problem from the interactive menu
2. Choose JavaScript or Python
3. If a previous session exists, choose to **resume** or **restart from scratch**
4. Edit the solution file — tests re-run automatically on every save
5. A summary line shows pass/fail counts (no raw output to avoid spoilers)
6. Press **Q** to return to the problem menu

## Project Structure

```
problems/                          ← read-only source of truth (never modified at runtime)
  <problem-name>/
    problem.json                   # Multi-part config (optional)
    main.js                        # JavaScript stub (used for problem detection)
    main.py                        # Python stub (used for problem detection)
workspace/                         ← gitignored working area (user edits happen here)
  .gitkeep                         # Ensures folder is committed
  <problem-name>/                  # Created by CLI on problem start
    main.js                        # Active JS solution file
    main.py                        # Active Python solution file
tests/
  <problem-name>/
    sample.test.js                 # Jest tests (single-part problems)
    test_sample.py                 # pytest tests (single-part problems)
    suite.test.js                  # Jest tests (multi-part problems)
    suite.test.py                  # pytest tests (multi-part problems)
docs/
  problem-schema.md                # Authoring reference for multi-part problems
```

### Workspace Directory

The `workspace/` folder is committed to the repo (via `.gitkeep`) but its contents are gitignored. This means:

- **User progress is local only** — it will not be pushed to a shared repo
- The repo stays cleanly clonable — `git clone` gives everyone a fresh start
- Selecting a problem copies the starting scaffold into `workspace/<problem-name>/` automatically
- Your work persists between sessions until you explicitly choose "Restart from scratch"

## Adding a New Problem

1. Create `problems/<name>/main.js` and/or `main.py` with a stub function
2. Create `tests/<name>/sample.test.js` and/or `test_sample.py` with test cases
3. The CLI auto-detects new problems on each run

### Conventions

- JS solution files should `module.exports` the main function
- Test files import from `workspace/<name>/main` (not `problems/`)
- Jest tests live at `tests/<name>/sample.test.js`
- pytest tests live at `tests/<name>/test_sample.py`

## Multi-Part Problems

Problems can be split into progressive parts using a `problem.json` file. When you select a multi-part problem, the CLI:

1. Writes starter code (scaffold) to the workspace file
2. Runs only the tests for the current part
3. When all tests pass, appends the next part's scaffold to the same file
4. Shows progress: `Part X of Y unlocked`
5. After all parts complete, returns to the problem menu

You never switch files — the single `main.js` or `main.py` accumulates content as you progress. The total number of parts is intentionally hidden during a session; only the unlocked count is shown.

### Resume / Restart

When you re-select a problem that has an existing workspace file, the CLI prompts:

```
A previous session was found for this problem.
❯ Resume where you left off
  Restart from scratch
```

**Resume** (default) reads the existing file and infers your current part from the delimiter comments in the file. **Restart** overwrites the file with the Part 1 scaffold.

See [docs/problem-schema.md](docs/problem-schema.md) for the full authoring reference.

## Requirements

- **Node.js** (for the CLI and Jest)
- **Yarn 4** (package manager; uses Plug'n'Play — no `node_modules/`): `corepack enable`
- **Python 3 + pytest** (for Python problems): `pip install pytest`
- **VS Code** with the `code` shell command installed (for automatic editor launch): [setup instructions](https://code.visualstudio.com/docs/configure/command-line)

## VS Code Behavior

When you select a problem, the CLI automatically opens VS Code via `interview-study.code-workspace` and jumps directly to the workspace solution file (e.g. `workspace/flatten-and-sum/main.js`). The workspace file disables AI-powered completions (GitHub Copilot, Tabnine, Codeium, etc.) and hides UI chrome for a distraction-free editor. These settings only apply when VS Code is opened through the CLI — opening the folder manually in VS Code uses your normal settings.

## Troubleshooting

- **VS Code doesn't open automatically:** The `code` CLI is not on your `$PATH`. Follow the [VS Code command line setup instructions](https://code.visualstudio.com/docs/configure/command-line) to install it (Cmd+Shift+P → "Shell Command: Install 'code' command in PATH").
