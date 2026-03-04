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
3. Edit the solution file — tests re-run automatically on every save
4. A summary line shows pass/fail counts (no raw output to avoid spoilers)
5. Press **Q** to return to the problem menu

## Project Structure

```
problems/
  <problem-name>/
    main.js          # JavaScript solution file
    main.py          # Python solution file
tests/
  <problem-name>/
    sample.test.js   # Jest tests
    test_sample.py   # pytest tests
```

## Adding a New Problem

1. Create `problems/<name>/main.js` and/or `main.py` with a stub function
2. Create `tests/<name>/sample.test.js` and/or `test_sample.py` with test cases
3. The CLI auto-detects new problems on each run

### Conventions

- JS solution files should `module.exports` the main function
- Python test files import from `problems/<name>/main.py` via `sys.path`
- Jest tests live at `tests/<name>/sample.test.js`
- pytest tests live at `tests/<name>/test_sample.py`

## Requirements

- **Node.js** (for the CLI and Jest)
- **Python 3 + pytest** (for Python problems): `pip install pytest`
