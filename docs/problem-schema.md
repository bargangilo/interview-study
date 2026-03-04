# Multi-Part Problem Schema

Canonical reference for authoring multi-part problems in `interview-study`.

## Folder Structure

```
problems/<name>/
  problem.json     # Problem configuration (required for multi-part)
  main.js          # JS stub (read-only, used for problem detection)
  main.py          # Python stub (read-only, used for problem detection)
  suite.test.js    # Jest tests — all parts in one file
  suite.test.py    # pytest tests — all parts in one file
workspace/<name>/
  main.js          # Active JS solution file (written by CLI, edited by user)
  main.py          # Active Python solution file (written by CLI, edited by user)
```

Test suite files live alongside the problem config inside `problems/<name>/`. The `problems/` directory is never modified at runtime — scaffolds are written to `workspace/`. Single-part (legacy) problems omit `problem.json` and use `sample.test.js` / `test_sample.py` instead.

## `problem.json` Schema

```json
{
  "title": "Human-readable problem title",
  "description": "Brief description of the overall problem",
  "parts": [
    {
      "title": "Part title shown in the CLI",
      "description": "What the user needs to implement",
      "activeTests": ["test name exactly as in the suite file"],
      "scaffold": {
        "js": "// JavaScript starter code",
        "python": "# Python starter code"
      }
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | No | Display name shown in the problem picker and problem list. Defaults to directory name. Keep it concise. |
| `description` | string | No | Brief description shown below the title in the problem picker (truncated at 80 chars) and in the full problem list view. Should be a meaningful one-liner. |
| `parts` | array | **Yes** | Ordered list of parts. Must have at least one entry. |
| `parts[].title` | string | No | Display name for the part, shown in the CLI during sessions and in the problem list detail view. |
| `parts[].description` | string | No | Explanation of what to implement, shown during sessions and in the problem list detail view. |
| `parts[].activeTests` | string[] | **Yes** | Test names to run when this part is active. Must be non-empty. |
| `parts[].scaffold.js` | string | No | JavaScript starter code for this part. |
| `parts[].scaffold.python` | string | No | Python starter code for this part. |

## How `activeTests` Works

### Test Name Matching

- **Jest**: Each entry in `activeTests` is joined with `|` and passed to `--testNamePattern` as a regex. The value must match the string inside `test("...")` or `it("...")`.
- **pytest**: Each entry has spaces replaced with underscores, then joined with ` or ` for the `-k` flag. Test function names should mirror the `activeTests` name with underscores, prefixed by `test_`.

**Convention**: Write `activeTests` names with spaces (human-readable). Name Python test functions as `test_` + the name with spaces replaced by underscores.

Example:
- `activeTests`: `"already flat array"`
- Jest test: `test("already flat array", () => { ... })`
- pytest function: `def test_already_flat_array():`

### Cumulative Behavior

`activeTests` is **not automatically cumulative**. The CLI runs exactly the tests listed in the current part's `activeTests`. If you want Part 2 to continue running Part 1 tests, you must explicitly include them in Part 2's `activeTests` array.

This is by design — it allows **selective deactivation**: if a Part 1 test should stop running in Part 2, simply omit it from Part 2's `activeTests`.

### Part Advancement

A part is considered complete when **all tests in the current part's `activeTests`** pass. The CLI checks `passed === total` after each test run.

## Scaffold Injection

### On Problem Start (Part 1)

The CLI writes `parts[0].scaffold.js` / `parts[0].scaffold.python` to `workspace/<name>/main.js` / `main.py`. If a previous session exists, the user is prompted to resume or restart from scratch.

### On Part Progression (Part 2+)

When the user passes all tests for the current part, the next part's scaffold is **appended** to the file with a delimiter comment:

**JavaScript:**
```
// ---- Part 2 ----
```

**Python:**
```
# ---- Part 2 ----
```

### Scaffold Tips

- Part 1 scaffold should include the full file setup: doc comments, function stubs, and `module.exports` (JS).
- Part 2+ scaffolds are appended, so use additive exports in JS: `module.exports.newFunction = newFunction` instead of `module.exports = { ... }` which would overwrite Part 1's exports.
- Python scaffolds just define new functions — they're importable from `main` automatically.
- Include `// TODO` or `pass` in function bodies to make the stub obvious.

## Test File Conventions

### File Naming and Location

All test files live inside `problems/<name>/` alongside the problem config:

- Multi-part problems: `problems/<name>/suite.test.js` / `suite.test.py`
- Legacy single-part problems: `problems/<name>/sample.test.js` / `test_sample.py`

### Jest (`suite.test.js`)

Write all tests for all parts in the file. Use `const mod = require(...)` at the top, importing from `workspace/`. Functions that don't exist yet (from future parts) will be `undefined`, but their test callbacks are filtered out by `--testNamePattern` and never execute.

```js
const mod = require("../../workspace/<name>/main");

describe("Part 1 Function", () => {
  test("test name matching activeTests", () => {
    expect(mod.part1Fn([1, 2])).toEqual([1, 2]);
  });
});

describe("Part 2 Function", () => {
  test("test name matching activeTests", () => {
    expect(mod.part2Fn([1, 2])).toBe(3);
  });
});
```

### pytest (`suite.test.py`)

Use **function-local imports** for each test. This prevents `ImportError` when importing functions from parts that haven't been unlocked yet.

```python
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "workspace", "<name>"))

def test_already_flat_array():
    from main import flatten_array  # import inside function body
    assert flatten_array([1, 2, 3]) == [1, 2, 3]

def test_single_number_nested_deep():
    from main import sum_nested  # safe: only runs when this test is active
    assert sum_nested([[[5]]]) == 5
```

## Worked Example

A two-part problem called `flatten-and-sum`:

### `problems/flatten-and-sum/problem.json`

```json
{
  "title": "Flatten and Sum",
  "description": "Flatten nested arrays and sum their elements",
  "parts": [
    {
      "title": "Flatten a nested array",
      "description": "Implement flattenArray(arr) that takes a deeply nested array and returns a flat version.",
      "activeTests": [
        "already flat array",
        "single level nesting",
        "deep nesting",
        "empty array",
        "mixed depth"
      ],
      "scaffold": {
        "js": "function flattenArray(arr) {\n  // TODO: implement\n}\n\nmodule.exports = { flattenArray };\n",
        "python": "def flatten_array(arr: list) -> list:\n    pass\n"
      }
    },
    {
      "title": "Sum nested elements without flattening",
      "description": "Implement sumNested(arr) that sums all numbers without flattening first.",
      "activeTests": [
        "already flat array",
        "single level nesting",
        "deep nesting",
        "empty array",
        "mixed depth",
        "single number nested deep",
        "multiple numbers across depths",
        "empty nested array",
        "all zeros",
        "large nested structure"
      ],
      "scaffold": {
        "js": "\nfunction sumNested(arr) {\n  // TODO: implement\n}\n\nmodule.exports.sumNested = sumNested;\n",
        "python": "\ndef sum_nested(arr: list) -> int:\n    pass\n"
      }
    }
  ]
}
```

**Key points in this example:**
- Part 2's `activeTests` includes all 5 Part 1 tests plus 5 new tests (10 total)
- Part 2's JS scaffold uses `module.exports.sumNested = sumNested` (additive)
- Python tests use function-local imports to avoid importing `sum_nested` during Part 1

### Test Output During Part 1

```
  Part 1 of 1 unlocked   ✔ 3 / 5 tests passing   [last run: 2:14:03 PM]
```

### After Part 1 Completion

```
  ✔ Part 1 complete! Part 2 has been added to your file.
  ─────────────────────────────────────────────
  Part 2: Sum nested elements without flattening
  Implement sumNested(arr) that sums all numbers without flattening first.
  ─────────────────────────────────────────────────
```

### Test Output During Part 2

```
  Part 2 of 2 unlocked   ✔ 7 / 10 tests passing   [last run: 2:15:12 PM]
```

## Error Handling

If `problem.json` exists but is malformed (invalid JSON, missing `parts` array, or a part with no `activeTests`), the CLI shows an error message and returns to the problem menu. The error message points to this document for reference.
