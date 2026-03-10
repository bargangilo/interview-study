# Problem Schema Reference

Every problem in this tool is defined by a `problem.json` file in `problems/<name>/`. This file controls what the CLI displays in the problem picker, how the session progresses through parts, which tests run at each stage, and what starter code is injected into the workspace. Problem authors create these files manually. The CLI validates the schema on load and skips problems with malformed configs.

## Schema

### Top-Level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | No | Display name in the problem picker and problem list. Defaults to the directory name if omitted. |
| `description` | string | No | One-line summary shown below the title in the picker (truncated at 80 characters) and in full in the problem list detail view. |
| `topics` | string[] | No | Lowercase topic tags (e.g. `["arrays", "hash maps"]`). Used by agent skills for filtering and problem selection. The CLI does not read this field. |
| `difficulty` | object | No | Complexity ratings on a 1–5 scale. Used by agent skills for difficulty targeting. The CLI does not read this field. See [Difficulty Object](#difficulty-object). |
| `style` | string | No | Problem style: `"leetcode"` (algorithmic, well-defined inputs/outputs) or `"real-world"` (practical scenario, open-ended design). Used by agent skills for generation targeting. The CLI does not read this field. |
| `expectedMinutes` | integer | No | Suggested time limit in minutes. Pre-populates the countdown prompt at session start. See [stats-and-timer.md](stats-and-timer.md) for how this integrates with the timer. |
| `generatedBy` | string | No | Origin of the problem: `"manual"` for hand-authored, `"agent"` for AI-generated. The CLI does not read this field. |
| `generatedAt` | string | No | ISO 8601 timestamp of when the problem was generated. Empty string for manually authored problems. Set automatically by the handwritten-generate skill. The CLI does not read this field. |
| `parts` | array | **Yes** | Ordered list of part objects. Must contain at least one entry. |

### Difficulty Object

The `difficulty` object contains four integer fields, each rated 1–5:

| Field | Description |
|---|---|
| `algorithmComplexity` | Complexity of the algorithm required (1 = simple iteration, 5 = advanced graph/DP). |
| `dataStructureComplexity` | Complexity of data structures involved (1 = arrays, 5 = tries/segment trees). |
| `problemComplexity` | Difficulty of understanding and decomposing the problem (1 = obvious, 5 = multi-step insight). |
| `overall` | Weighted composite: `(algorithmComplexity × 0.3) + (dataStructureComplexity × 0.3) + (problemComplexity × 0.4)`, rounded to the nearest integer. |

Example: a problem requiring a hash map (algo 1, ds 2, problem 1) has overall = `(1×0.3) + (2×0.3) + (1×0.4) = 1.3`, rounded to **1**.

### Part Fields

Each entry in the `parts` array defines one stage of the problem.

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | No | Part name shown in the CLI during sessions and in the problem list detail view. |
| `description` | string | No | Explanation of what to implement. Shown when a part is introduced during a session and in the problem list. |
| `activeTests` | string[] | **Yes** | Test names to run when this part is active. Must be non-empty. See [activeTests Behavior](#activetests-behavior) for matching rules. |
| `scaffold.js` | string | No | JavaScript starter code for this part. Written to the workspace file on start (Part 1) or appended on advancement (Part 2+). |
| `scaffold.python` | string | No | Python starter code for this part. Same write/append behavior as `scaffold.js`. |
| `runInputs` | array | No | Representative function calls executed on every save and shown as Examples. See [runInputs](#runinputs). |

## `runInputs`

### Purpose and Behavior

Run inputs serve three roles. They populate the Examples section in the problem description screen before the session starts. They execute on every file save during a session to give immediate run feedback. When `expected` is provided, they give pass/fail feedback on representative cases without revealing the full test suite structure.

### Field Reference

| Field | Type | Required | Valid Values | Description |
|---|---|---|---|---|
| `label` | string | Yes | 2-5 word scenario name | Display name in the console panel and Examples section. Describes the scenario, not the expected output. |
| `language` | string | Yes | `"javascript"` or `"python"` | The CLI filters by active session language at harness generation time. |
| `function` | string | Yes | Exact exported function name | Must match the scaffold export character for character, including case. |
| `args` | array | Yes | JSON-serializable values | Arguments passed to the function in order. Each element corresponds to one parameter. |
| `expected` | any | No | JSON-serializable value | Expected return value. When present, the harness performs a deep equality check. When absent, return value is shown with no pass/fail indicator. |

### Pass/Fail Behavior

When `expected` is present, the harness performs a deep equality check between the actual return value and `expected`. The console panel shows a green checkmark for pass or a red X for fail alongside the actual return value. Deep equality uses structural comparison — `[1, 2, 3]` equals `[1, 2, 3]` regardless of reference.

When `expected` is absent, only the return value is shown with no pass/fail indicator. Run pass/fail is independent of test suite pass/fail — a run input can pass while tests still fail (if edge cases are failing) or vice versa.

### Console Output Behavior

Any `console.log` calls inside the solution function fire during the run and appear in the console panel above the labeled return value line for the call that triggered them.

### Per-Part Accumulation

`runInputs` is per-part, not top-level. When multiple parts are unlocked, the harness accumulates run inputs from all unlocked parts in order. Part 1 run inputs continue executing when Part 2 is active. Part 1 inputs should remain meaningful in the context of later parts.

If `runInputs` is absent or empty on all unlocked parts, the CLI skips run-on-save silently. Existing problems without `runInputs` work normally.

### Language Parity

For both-language problems, provide matching JS and Python entries per scenario with appropriate naming conventions (`findBestSeats` for JS, `find_best_seats` for Python). For JS-only problems, only JS entries are needed.

### The `args` and `expected` Constraint

Both `args` and `expected` must be JSON-serializable. The following are not allowed: functions, `undefined`, `NaN`, `Infinity`, circular references, class instances. Arrays, plain objects, strings, numbers, booleans, and `null` are all valid.

### Async Function Support

The harness handles async functions automatically. In JavaScript, all calls are awaited inside an async wrapper — `await syncValue === syncValue` makes this a no-op for sync functions. In Python, each return value is checked with `inspect.isawaitable()` and unwrapped via `asyncio.run()` if needed. No special configuration is required.

### Authoring Guidelines

Include 2-3 inputs per part. Inputs should be representative of the common case, not edge cases — they are visible to the user before solving. Do not use inputs identical to any test case. Keep args small (arrays of 4-6 elements). The `expected` value must be accurate — an incorrect `expected` produces a false failure on every save.

### Worked Example

A two-part problem showing `runInputs` on both parts with `expected` values:

```json
{
  "parts": [
    {
      "title": "Flatten a nested array",
      "activeTests": ["already flat array", "single level nesting", "deep nesting", "empty array", "mixed depth"],
      "scaffold": { "js": "..." },
      "runInputs": [
        {
          "label": "mixed nesting",
          "language": "javascript",
          "function": "flattenArray",
          "args": [[1, [2, 3], [4, [5]]]],
          "expected": [1, 2, 3, 4, 5]
        },
        {
          "label": "nested pairs",
          "language": "javascript",
          "function": "flattenArray",
          "args": [[[1, [2]], 3, [[4]]]],
          "expected": [1, 2, 3, 4]
        }
      ]
    },
    {
      "title": "Sum nested elements without flattening",
      "activeTests": ["already flat array", "...", "large nested structure"],
      "scaffold": { "js": "..." },
      "runInputs": [
        {
          "label": "four levels deep",
          "language": "javascript",
          "function": "sumNested",
          "args": [[1, [2, [3, [4]]]]],
          "expected": 10
        },
        {
          "label": "grouped tens",
          "language": "javascript",
          "function": "sumNested",
          "args": [[[10], [20, [30]]]],
          "expected": 60
        }
      ]
    }
  ]
}
```

Part 1's `flattenArray` run inputs continue executing when Part 2 unlocks. Part 2 adds `sumNested` run inputs. The `function` field matches the scaffold export exactly. All `args` and `expected` values are JSON-serializable. No input duplicates a test case.

## `activeTests` Behavior

### Test Name Matching

Each entry in `activeTests` is a human-readable string with spaces. The CLI translates these into test runner filter arguments:

**Jest:** All entries are joined with `|` and passed to `--testNamePattern` as a regex. Regex special characters in test names are escaped automatically. Each entry must match the string inside `test("...")` or `it("...")` in the suite file.

**pytest:** Each entry has spaces replaced with underscores, and entries are joined with ` or ` for the `-k` flag. Test function names in the suite file must be `test_` followed by the entry with spaces replaced by underscores.

Example for `"already flat array"`:
- `suite.test.js`: `test("already flat array", () => { ... })`
- `suite.test.py`: `def test_already_flat_array():`

### Accumulation Across Parts

`activeTests` is **not automatically cumulative**. The CLI runs exactly the tests listed in the current part's `activeTests`. To keep Part 1 tests running in Part 2, include them explicitly in Part 2's `activeTests` array.

This is intentional — it enables selective deactivation. If a Part 1 test should stop running in Part 2 (e.g., because Part 2 changes the function's behavior), omit it from Part 2's `activeTests`.

### Part Advancement

A part is complete when all tests in its `activeTests` pass: `passed === total && total > 0`. The CLI checks this condition after every test run.

## Scaffold Injection

### Part 1 (Problem Start)

The CLI writes `parts[0].scaffold.js` or `parts[0].scaffold.python` to `workspace/<name>/main.js` or `main.py`. If the user already has a workspace file and chooses "Restart from scratch", the file is overwritten with Part 1's scaffold. If the scaffold key is missing, an empty file is written.

### Part 2+ (Advancement)

When the user passes all tests for the current part, the next part's scaffold is appended to the existing file with a delimiter comment:

JavaScript: `// ---- Part N ----`

Python: `# ---- Part N ----`

The delimiter is how `inferCurrentPart` detects which part the user is on during a resume. The number in the delimiter is 1-indexed (Part 2's delimiter says "Part 2").

### Scaffold Authoring Guidelines

Part 1's scaffold should include the full file setup: doc comments, function stubs, and `module.exports` (JS). Part 2+ scaffolds are appended, so JS scaffolds should use additive exports (`module.exports.newFunction = newFunction`) rather than reassigning `module.exports`, which would overwrite Part 1's exports. Python scaffolds define new functions directly — they are importable from `main` automatically.

Use `// TODO` or `pass` in function bodies to make stubs obvious. If a part requires the user to modify an existing function in place (no new exports), the scaffold can be an empty string — the delimiter is still written to mark part progression.

## Suite Test File Conventions

### File Naming

All test files live inside `problems/<name>/` alongside `problem.json`:

- Multi-part problems: `suite.test.js` / `suite.test.py`
- Single-part (legacy) problems: `sample.test.js` / `test_sample.py`

The CLI selects the correct file based on whether a test filter is present (multi-part) or not (legacy).

### Jest (`suite.test.js`)

Write all tests for all parts in a single file. Import from the workspace path. Functions from future parts will be `undefined` when their tests are filtered out by `--testNamePattern`, so the test callbacks never execute.

```js
const mod = require("../../workspace/<name>/main");

describe("Part 1 Function", () => {
  test("test name matching activeTests", () => {
    expect(mod.partOneFn([1, 2])).toEqual([1, 2]);
  });
});

describe("Part 2 Function", () => {
  test("test name matching activeTests", () => {
    expect(mod.partTwoFn([1, 2])).toBe(3);
  });
});
```

### pytest (`suite.test.py`)

Use function-local imports in every test function. This prevents `ImportError` when importing functions from parts that have not been unlocked yet — the import only executes when the test is selected by `-k`.

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

A two-part problem called `flatten-and-sum`. Part 1 asks the user to flatten a nested array. Part 2 asks them to sum nested elements directly. Part 2 keeps all Part 1 tests active and adds five new ones.

### `problems/flatten-and-sum/problem.json`

```json
{
  "title": "Flatten and Sum",
  "description": "Flatten nested arrays and sum their elements",
  "topics": ["arrays", "recursion"],
  "difficulty": {
    "algorithmComplexity": 2,
    "dataStructureComplexity": 2,
    "problemComplexity": 2,
    "overall": 2
  },
  "style": "leetcode",
  "expectedMinutes": 25,
  "generatedBy": "manual",
  "generatedAt": "",
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
      },
      "runInputs": [
        {
          "label": "mixed nesting",
          "language": "javascript",
          "function": "flattenArray",
          "args": [[1, [2, 3], [4, [5]]]],
          "expected": [1, 2, 3, 4, 5]
        },
        {
          "label": "nested pairs",
          "language": "javascript",
          "function": "flattenArray",
          "args": [[[1, [2]], 3, [[4]]]],
          "expected": [1, 2, 3, 4]
        }
      ]
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
      },
      "runInputs": [
        {
          "label": "four levels deep",
          "language": "javascript",
          "function": "sumNested",
          "args": [[1, [2, [3, [4]]]]],
          "expected": 10
        },
        {
          "label": "grouped tens",
          "language": "javascript",
          "function": "sumNested",
          "args": [[[10], [20, [30]]]],
          "expected": 60
        }
      ]
    }
  ]
}
```

Key points:

- Part 2's `activeTests` includes all five Part 1 tests plus five new ones (ten total). This means the user's `flattenArray` implementation must continue passing while they write `sumNested`.
- Part 2's JS scaffold uses `module.exports.sumNested = sumNested` (additive export) rather than `module.exports = { ... }`, which would overwrite Part 1's `flattenArray` export.
- Python scaffolds define new functions directly — no export management needed.
- `expectedMinutes: 25` pre-populates the countdown prompt so the user does not have to remember a suggested time.

### Corresponding `suite.test.js`

```js
const mod = require("../../workspace/flatten-and-sum/main");

describe("flattenArray", () => {
  test("already flat array", () => { expect(mod.flattenArray([1, 2, 3])).toEqual([1, 2, 3]); });
  test("single level nesting", () => { expect(mod.flattenArray([1, [2, 3]])).toEqual([1, 2, 3]); });
  test("deep nesting", () => { expect(mod.flattenArray([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]); });
  test("empty array", () => { expect(mod.flattenArray([])).toEqual([]); });
  test("mixed depth", () => { expect(mod.flattenArray([[1], 2, [[3]]])).toEqual([1, 2, 3]); });
});

describe("sumNested", () => {
  test("single number nested deep", () => { expect(mod.sumNested([[[5]]])).toBe(5); });
  test("multiple numbers across depths", () => { expect(mod.sumNested([1, [2, [3]]])).toBe(6); });
  test("empty nested array", () => { expect(mod.sumNested([[[]]])).toBe(0); });
  test("all zeros", () => { expect(mod.sumNested([0, [0, [0]]])).toBe(0); });
  test("large nested structure", () => { expect(mod.sumNested([[1, 2], [3, [4, 5]]])).toBe(15); });
});
```

### Corresponding `suite.test.py`

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "workspace", "flatten-and-sum"))

def test_already_flat_array():
    from main import flatten_array
    assert flatten_array([1, 2, 3]) == [1, 2, 3]

# ... additional Part 1 tests with function-local imports ...

def test_single_number_nested_deep():
    from main import sum_nested  # function-local: safe during Part 1
    assert sum_nested([[[5]]]) == 5
```

## Common Mistakes

**Mismatched test names.** The string in `activeTests` must exactly match the `test("...")` string in Jest and the function name (minus `test_` prefix, with underscores for spaces) in pytest. A typo causes the test to silently not run, which means the part appears to pass with zero tests — but the CLI requires `total > 0` for advancement, so the user gets stuck.

**Forgetting to include prior tests.** `activeTests` is not cumulative. If Part 2 should still run Part 1's tests, every Part 1 test name must appear in Part 2's `activeTests` array. Omitting them means Part 1's implementation could break without the user knowing.

**Overwriting exports in JS scaffolds.** A Part 2+ scaffold that uses `module.exports = { newFn }` overwrites all Part 1 exports. Use `module.exports.newFn = newFn` for additive exports.

**Top-level imports in pytest.** Importing a function at the module level of `suite.test.py` causes an `ImportError` when that function's part has not been unlocked yet. Use function-local imports inside each test function body.

**Malformed scaffold strings.** Scaffolds are JSON strings — newlines must be `\n`, quotes must be escaped. A malformed scaffold causes the workspace file to contain literal `\n` characters or broken syntax. Validate by pasting the scaffold value into a Node REPL: `console.log("...")` should produce valid source code.

## Adding Problems

Each problem lives in its own directory under `problems/` with a `problem.json` config file. The CLI auto-detects problem directories on startup; any directory without a valid `problem.json` is skipped with a warning.

### Required Files

```
problems/<name>/
  problem.json       # title, description, expectedMinutes, parts array
  main.js            # JS stub — module.exports the main function(s)
  main.py            # Python stub
  suite.test.js      # All Jest tests for all parts in one file
  suite.test.py      # All pytest tests for all parts in one file
```

The `parts` array in `problem.json` defines each part's title, description, `activeTests` (test names to run), and `scaffold` (starter code). Test names use spaces in `activeTests`; Jest matches them directly, and pytest function names mirror them with underscores prefixed by `test_`. Test files import from `../../workspace/<name>/main`, not from `problems/`.

The `main.js` and `main.py` stub files must exist in the problem directory for the CLI to detect available languages. Their content should match `parts[0].scaffold.js` and `parts[0].scaffold.python` respectively. When generating problems through the `hideWriteOutput` code path, the write script (`.agents/scripts/write-problem.js`) auto-extracts these stubs from `problem.json` after writing the payload files.

### Pre-Commit Checklist

Before committing a new problem, verify every item:

1. **`activeTests` strings match exactly.** Every string in every part's `activeTests` must exactly match the `test("...")` string in Jest and the function name (minus `test_` prefix, underscores for spaces) in pytest. Copy-paste — do not retype.
2. **Tests import from `workspace/`, not `problems/`.** Jest: `require("../../workspace/<name>/main")`. pytest: `sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "workspace", "<name>"))`.
3. **`activeTests` accumulates correctly.** If Part 2 should still run Part 1's tests, every Part 1 test name must appear in Part 2's `activeTests`. Verify by diffing the arrays.
4. **JS scaffolds use additive exports for Part 2+.** Part 1 uses `module.exports = { fn }`. Part 2+ uses `module.exports.newFn = newFn`. Never reassign `module.exports` after Part 1.
5. **pytest uses function-local imports.** Every test function imports the function under test inside the function body, not at the module level. This prevents `ImportError` for unlocked parts.
6. **Scaffold strings are valid JSON.** Newlines are `\n`, quotes are escaped. Validate: `node -e "console.log(JSON.parse('\"<scaffold>\"'))"`.
7. **The `problem.json` has valid JSON.** Run `node -e "require('./problems/<name>/problem.json')"`.
8. **Every part has at least one test in `activeTests`.** The CLI requires `total > 0` for part advancement.
9. **Run the test suite directly.** `yarn jest problems/<name>/suite.test.js --no-coverage` should discover and run all tests.

## Agent-Generated vs. Manually Authored Problems

The `generatedBy` field distinguishes problems created by AI agent skills (`"agent"`) from those written by hand (`"manual"`). Manually authored problems may omit `topics`, `difficulty`, `style`, `generatedBy`, and `generatedAt` without affecting CLI behavior — the CLI does not read any of these fields. Agent-generated problems must always include all fields so that agent skills can filter, select, and avoid duplicating topics or difficulty levels across the problem set.

## Agent Config: `surpriseMode` and `hideProblemDetails`

Two top-level fields in `config.json` control how agent skills generate and present problems. They are independent and compose together.

### `surpriseMode`

| Field | Type | Description |
|---|---|---|
| `enabled` | boolean | When true, generation parameters (topics, style, difficulty, part count) are selected randomly via the randomization script. When false, the agent asks the user interactively for each parameter. |

### `hideProblemDetails`

| Field | Type | Description |
|---|---|---|
| `enabled` | boolean | Master switch. When false, all `hide*` sub-fields are ignored regardless of their individual values. |
| `hideTopics` | boolean | When true, topics are not revealed to the user at any point during generation. |
| `hideStyle` | boolean | When true, the style (LeetCode or real-world) is not revealed. |
| `hidePartCount` | boolean | When true, the number of parts is never mentioned during or after generation. |
| `hideWriteOutput` | boolean | When true, all file writing goes through the write script (`.agents/scripts/write-problem.js`) to prevent file contents from appearing in the terminal. |

### Behavior Matrix

| `surpriseMode.enabled` | `hideProblemDetails.enabled` | Behavior |
|---|---|---|
| true | true | Random parameters, nothing revealed during generation |
| false | true | Interactive parameter selection, generation output hidden |
| true | false | Random parameters, full generation detail shown |
| false | false | Interactive parameter selection, fully transparent output |
