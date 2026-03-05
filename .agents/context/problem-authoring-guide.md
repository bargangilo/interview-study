# Problem Authoring Guide

This document is the authoritative reference for generating interview problems in this system. Read it completely before writing any problem files. Every rule is mandatory unless explicitly marked as guidance.

## Section 1: Information Hiding Rules

The progressive revelation model requires that the user discovers the problem's depth through solving, not through reading. Every artifact — title, description, part titles, test names, scaffolds — must be written from the perspective of someone who does not yet know the solution approach.

### Rule 1: Title Rules

The top-level `title` must describe the problem domain or task using natural language. It must not contain:

- Algorithm names (e.g. "BFS", "binary search", "dynamic programming", "sliding window")
- Data structure names that reveal the approach (e.g. "trie", "heap", "stack-based")
- Part count signals (e.g. "Three-Part", "with Extension", "and Optimization")
- Difficulty signals (e.g. "Easy", "Advanced", "Challenge")

| Non-Compliant Title | Problem | Compliant Rewrite |
|---|---|---|
| `"BFS Shortest Path"` | Reveals the algorithm | `"Shortest Route Between Cities"` |
| `"Trie-Based Autocomplete"` | Reveals the data structure | `"Search Suggestions"` |
| `"Matrix DP — Three Parts"` | Reveals algorithm and part count | `"Grid Traversal Costs"` |

### Rule 2: Description Rules

The top-level `description` introduces the problem domain and context. It must not use algorithmic vocabulary that hints at the solution approach.

| Forbidden Phrasing | Acceptable Alternative |
|---|---|
| "use a sliding window" | "process ranges of elements efficiently" |
| "apply memoization" | "avoid redundant computation" |
| "implement a binary search" | "find values quickly in sorted data" |
| "build a graph and traverse it" | "explore connections between items" |
| "use a stack to track state" | "process items in the right order" |
| "sort and use two pointers" | "find pairs that satisfy a condition" |

### Rule 3: Part Title Rules

Each part's `title` describes what to build from a functional perspective, not how to build it. Part titles must not reference earlier parts' implementations by algorithmic name.

- Compliant: `"Find the shortest delivery route"` → `"Handle multiple delivery trucks"`
- Non-compliant: `"Implement BFS"` → `"Optimize BFS with A*"`

If a later part requires optimizing an earlier part's solution, describe the optimization goal, not the technique: `"Handle inputs up to 1 million entries"` instead of `"Rewrite using a hash map"`.

### Rule 4: Part Description Rules

The part `description` elaborates on what the function should do from an input/output perspective. It must not describe the internal mechanism.

- Compliant: `"Given a list of routes and their distances, return the shortest total distance from start to finish."`
- Non-compliant: `"Use Dijkstra's algorithm to find the shortest path in the weighted graph."`

The description may state performance expectations (e.g. "must handle 100,000 entries within the time limit") because this constrains the solution space without naming the approach.

### Rule 5: Test Name Rules

Test names describe observable behavior — what the function does with specific inputs — not how the function works internally.

| Non-Compliant Test Name | Problem | Compliant Rewrite |
|---|---|---|
| `"uses hash map for O(1) lookup"` | Describes implementation | `"handles large input efficiently"` |
| `"recursion base case"` | Describes mechanism | `"single element input"` |
| `"correctly applies BFS"` | Names the algorithm | `"finds shortest path in unweighted graph"` |
| `"memoization cache hit"` | Describes optimization | `"repeated subproblems return same result"` |

### Rule 6: Scaffold Rules

Scaffolds provide function signatures and empty bodies only. They must not contain:

- Hints in variable names (e.g. `let memo = {}`, `const visited = new Set()`)
- Suggestive comments (e.g. `// hint: think about what data structure allows O(1) lookup`)
- Pre-imported libraries that telegraph the approach (e.g. `from collections import deque`)
- Partially filled logic or pseudocode

The only acceptable body content is `// TODO: implement` (JS) or `pass` (Python). Doc comments may describe the function's purpose, parameters, and return type — never the approach.

---

## Section 2: Complete `problem.json` Schema Reference

### Top-Level Fields

| Field | Type | Required | Valid Values / Constraints | Description | Example |
|---|---|---|---|---|---|
| `title` | string | No | Any string. Defaults to directory name if omitted. Must comply with Rule 1. | Display name in CLI. | `"Grid Traversal Costs"` |
| `description` | string | No | Any string. Truncated at 80 chars in picker. Must comply with Rule 2. | One-line problem summary. | `"Find optimal paths through weighted grids"` |
| `topics` | string[] | Required for agent-generated | Lowercase tags from the topic vocabulary. | Topic tags for filtering. CLI does not read this. | `["arrays", "dynamic programming"]` |
| `difficulty` | object | Required for agent-generated | See Difficulty Object below. | Complexity ratings. CLI does not read this. | See below. |
| `style` | string | Required for agent-generated | `"leetcode"` or `"real-world"` | Problem framing style. CLI does not read this. | `"real-world"` |
| `expectedMinutes` | integer | No | Positive integer. Should fall within `expectedTimeRange` in `config.json`. | Pre-populates countdown prompt. | `30` |
| `generatedBy` | string | Required for agent-generated | `"manual"` or `"agent"` | Origin of the problem. CLI does not read this. | `"agent"` |
| `generatedAt` | string | Required for agent-generated | ISO 8601 timestamp or empty string. | Generation timestamp. CLI does not read this. | `"2026-03-04T14:30:00.000Z"` |
| `parts` | array | **Yes** | Non-empty array of Part objects. Respect `maxPartsGlobal` from `config.json`. | Ordered problem stages. | See below. |

### Difficulty Object

| Field | Type | Valid Values | Description |
|---|---|---|---|
| `algorithmComplexity` | integer | 1–5 | Complexity of the algorithm required. See `difficulty-guide.md`. |
| `dataStructureComplexity` | integer | 1–5 | Complexity of data structures involved. See `difficulty-guide.md`. |
| `problemComplexity` | integer | 1–5 | Difficulty of understanding and decomposing the problem. See `difficulty-guide.md`. |
| `overall` | integer | 1–5 | Computed: `round((algo × 0.3) + (ds × 0.3) + (problem × 0.4))`. Never set manually. |

### Part Object

| Field | Type | Required | Valid Values / Constraints | Description | Example |
|---|---|---|---|---|---|
| `title` | string | No | Must comply with Rule 3. | Part name shown in CLI. | `"Find shortest delivery route"` |
| `description` | string | No | Must comply with Rule 4. | What to implement. Shown on part introduction. | `"Return the minimum total distance..."` |
| `activeTests` | string[] | **Yes** | Non-empty. Each entry must exactly match a test name. See Section 3. | Test names to run for this part. | `["basic case", "empty input"]` |
| `scaffold.js` | string | No | Valid JS source. Must comply with Rule 6. Part 2+ uses additive exports. | JS starter code. | `"function fn(x) {\n  // TODO: implement\n}\n\nmodule.exports = { fn };\n"` |
| `scaffold.python` | string | No | Valid Python source. Must comply with Rule 6. | Python starter code. | `"def fn(x):\n    pass\n"` |

---

## Section 3: `activeTests` Rules

### Exact String Matching

Every entry in `activeTests` must be a character-for-character match — including capitalization, punctuation, and spacing — with the corresponding test definition:

- **Jest:** The string inside `test("...")` or `it("...")` in `suite.test.js`.
- **pytest:** The function name minus the `test_` prefix, with underscores replaced by spaces. The function `def test_empty_input():` corresponds to the `activeTests` entry `"empty input"`.

A mismatch causes the test to silently not run. Because the CLI requires `passed > 0 && passed === total` for advancement, a completely unmatched `activeTests` array produces `total === 0`, which blocks the user permanently on that part.

### Constructing the Jest `--testNamePattern`

The CLI joins all `activeTests` entries with `|` and escapes regex special characters. For `["basic case", "handles (parentheses)"]`, the resulting pattern is:

```
basic case|handles \(parentheses\)
```

Avoid regex special characters in test names when possible. If a test name must contain them, verify that the escaped pattern still matches correctly.

### Constructing the pytest `-k` Expression

The CLI replaces spaces with underscores in each entry, then joins with ` or `. For `["basic case", "empty input"]`, the resulting expression is:

```
test_basic_case or test_empty_input
```

### Accumulation Rule

Part N's `activeTests` must include all test names from Parts 1 through N-1 **unless intentionally deactivating a specific test**. This is a manual process — the CLI does not accumulate tests automatically.

Rationale: when a user advances to Part 2, their Part 1 implementation must continue passing. Omitting Part 1 tests from Part 2's `activeTests` would allow Part 1 regressions to go undetected.

### Intentional Deactivation

Omitting a test from a later part's `activeTests` stops that test from running. This is appropriate in exactly one scenario: a Part 1 test validates behavior that Part 2 intentionally changes.

Example: Part 1 tests a naive implementation that returns results in arbitrary order. Part 2 requires sorted output. The Part 1 test `"returns results in any order"` should be replaced in Part 2 by `"returns results in sorted order"` — not carried forward, because it would now fail.

Document any intentional deactivation with a comment in the `problem.json` or in the generation summary.

### Verification Procedure

Before writing `problem.json`, verify every `activeTests` entry against the suite file:

1. For each entry in `activeTests`, search `suite.test.js` for `test("ENTRY"` or `it("ENTRY"` — the string must appear verbatim.
2. For each entry in `activeTests`, confirm that `suite.test.py` contains a function named `test_` followed by the entry with spaces replaced by underscores.
3. Confirm that every test function in the suite file is referenced by at least one part's `activeTests` (no orphaned tests).

---

## Section 4: Scaffold Authoring

### What a Scaffold Contains

A scaffold provides:

- A function signature with parameter names and type annotations
- An empty body: `// TODO: implement` (JS) or `pass` (Python)
- For JS Part 1: a `module.exports` statement exporting the function
- For Python Part 1: just the function definition (auto-importable from `main`)
- Optional: a doc comment describing the function's purpose, parameters, and return type

A scaffold must not contain hints, pre-imported libraries, suggestive variable names, or partial logic (Rule 6).

### Part 1 Scaffold Behavior

The CLI writes the Part 1 scaffold as the complete contents of `workspace/<name>/main.js` or `main.py`. If the scaffold is missing or empty, the CLI writes an empty file.

The Part 1 scaffold should include everything the user needs to start: doc comments, function stubs, and exports. It seeds the file.

### Part 2+ Scaffold Behavior

When the user completes a part, the CLI appends the next part's scaffold to the existing file, preceded by a delimiter:

- JavaScript: `// ---- Part N ----`
- Python: `# ---- Part N ----`

The delimiter is 1-indexed (Part 2's delimiter says "Part 2"). The CLI uses these delimiters to detect which part the user is on during a resume.

Because Part 2+ scaffolds are appended:

- **JS:** Use additive exports: `module.exports.newFn = newFn`. Do not reassign `module.exports = { ... }` — this overwrites all Part 1 exports.
- **Python:** Define new functions directly. They are importable from `main` automatically.

### Empty Scaffolds

If a part requires the user to modify an existing function in place (no new exports), set the scaffold to an empty string (`""`). The delimiter comment is still written to mark part progression.

### Forward References

If Part 2 introduces a helper function that Part 1's solution could theoretically use, do not include a stub for it in Part 1's scaffold. Each part's scaffold should contain only what that part requires. Adding forward references reveals problem structure.

### Working File Ownership

During a session, the CLI owns `main.js`/`main.py`. The agent writes `problem.json` and test files into `problems/<name>/`. The agent must never instruct users to edit workspace files directly — the CLI manages scaffold injection and part advancement.

---

## Section 5: Test Authoring Rules

### Single Suite File Convention

All tests for all parts of a problem live in one file per language:

- `suite.test.js` — Jest tests, co-located in `problems/<name>/`
- `suite.test.py` — pytest tests, co-located in `problems/<name>/`

Do not create separate test files per part. The CLI expects exactly these filenames for multi-part problems.

### Import Conventions

**Jest (`suite.test.js`):** Import from the workspace path at the top of the file:

```js
const mod = require("../../workspace/<name>/main");
```

Functions from future parts will be `undefined` when their tests are filtered out by `--testNamePattern`, so the test callbacks never execute — no `TypeError` occurs.

**pytest (`suite.test.py`):** Add the workspace path to `sys.path` at module level. Use function-local imports inside every test function body:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "workspace", "<name>"))

def test_basic_case():
    from main import my_function  # function-local import
    assert my_function([1, 2]) == 3
```

Function-local imports prevent `ImportError` when a function from a future part does not yet exist in the workspace file. The import only executes when pytest selects that specific test via `-k`.

### Minimum Test Coverage

Each part must have at minimum:

1. **One basic case** — the simplest valid input demonstrating the core behavior.
2. **One empty/null/boundary input** — empty array, zero-length string, single element, etc.
3. **Two edge cases** — inputs that probe boundaries: negative numbers, very large values, duplicates, all-same elements, maximum nesting depth, etc.
4. **One performance-adjacent case** — an input large enough that a naive O(n²) or O(2ⁿ) solution would still produce the correct result but that a well-written test runner timeout would catch. The test name must not telegraph this (Rule 5); name it by the input characteristic, not the expected performance.

Total: at least five tests per part (some may be carried forward from earlier parts).

### Behavioral Test Design

Tests must validate observable input/output behavior, not implementation details:

- Assert on return values, not on internal state.
- Do not assert on the number of function calls, cache hits, or specific variable values.
- If testing that an optimization works, use a large input and assert the correct answer — the time limit enforces performance. Do not assert execution time in the test itself.

### Test Organization

Group tests by the function they exercise using `describe` blocks in Jest. Use comments in pytest to visually separate parts. Place Part 1 tests first, then Part 2 tests, and so on.

```js
// suite.test.js
describe("partOneFunction", () => {
  test("basic case", () => { /* ... */ });
  test("empty input", () => { /* ... */ });
});

describe("partTwoFunction", () => {
  test("basic case for part two", () => { /* ... */ });
});
```

### No Orphaned Tests

Every test in the suite file must be referenced by at least one part's `activeTests`. A test that exists in the file but never appears in any `activeTests` array is dead code and a source of confusion.

---

## Section 6: Self-Check Checklist

Run through this checklist before writing any files. Every answer must match the expected value.

1. Does the title contain any algorithm or data structure names? **Must be No.**
2. Does the title or description reveal the number of parts? **Must be No.**
3. Do any test names describe implementation rather than behavior? **Must be No.**
4. Does any scaffold contain a hint toward the solution approach? **Must be No.**
5. Does each part's `activeTests` include all prior parts' tests (unless intentionally deactivating one with documented reason)? **Must be Yes.**
6. Does every string in `activeTests` exactly match a test name in the suite file — verified character by character? **Must be Yes.**
7. Do all difficulty values fall within the configured ranges from `config.json`? **Must be Yes.**
8. Is `expectedMinutes` within the `expectedTimeRange` from `config.json`? **Must be Yes.**
9. Has the CS concept been verified for accuracy before encoding it in the problem? **Must be Yes.**
10. Is `maxPartsGlobal` from `config.json` respected? **Must be Yes.**
11. Does every test function in the suite file appear in at least one part's `activeTests`? **Must be Yes.** (No orphaned tests.)
12. Does the Part 1 JS scaffold use `module.exports = { fn }` and do Part 2+ JS scaffolds use `module.exports.fn = fn`? **Must be Yes.**
13. Do all pytest test functions use function-local imports (not module-level)? **Must be Yes.**
14. Is `overall` computed from the formula, not estimated manually? **Must be Yes.**
15. Does the problem directory name use lowercase-with-hyphens and match what the test files import from `workspace/<name>/main`? **Must be Yes.**

---

## Section 7: Worked Example

A two-part problem in real-world style. Part 1 asks the user to implement a rate limiter that tracks request counts per time window. Part 2 extends it to support multiple clients with independent limits.

### `problems/request-throttle/problem.json`

```json
{
  "title": "Request Throttle",
  "description": "Build a request rate limiter that enforces per-window request caps",
  "topics": ["hash maps", "design"],
  "difficulty": {
    "algorithmComplexity": 2,
    "dataStructureComplexity": 2,
    "problemComplexity": 3,
    "overall": 2
  },
  "style": "real-world",
  "expectedMinutes": 30,
  "generatedBy": "agent",
  "generatedAt": "2026-03-04T12:00:00.000Z",
  "parts": [
    {
      "title": "Single-client rate limiter",
      "description": "Implement createLimiter(maxRequests, windowMs) / create_limiter(max_requests, window_ms) that returns a function. Calling that function with a timestamp returns true if the request is allowed (under the limit for the current window) or false if it should be rejected.",
      "activeTests": [
        "allows requests under limit",
        "rejects request at limit",
        "resets after window expires",
        "boundary request at window edge",
        "zero max requests rejects all"
      ],
      "scaffold": {
        "js": "/**\n * Create a rate limiter.\n *\n * @param {number} maxRequests - Maximum requests allowed per window\n * @param {number} windowMs - Window duration in milliseconds\n * @returns {function(number): boolean} A function that takes a timestamp (ms)\n *   and returns true if the request is allowed, false if rejected.\n */\nfunction createLimiter(maxRequests, windowMs) {\n  // TODO: implement\n}\n\nmodule.exports = { createLimiter };\n",
        "python": "\"\"\"\nCreate a rate limiter.\n\nArgs:\n    max_requests: Maximum requests allowed per window.\n    window_ms: Window duration in milliseconds.\n\nReturns:\n    A function that takes a timestamp (ms) and returns True if the\n    request is allowed, False if rejected.\n\"\"\"\n\n\ndef create_limiter(max_requests: int, window_ms: int):\n    pass\n"
      }
    },
    {
      "title": "Multi-client rate limiter",
      "description": "Implement createMultiLimiter(maxRequests, windowMs) / create_multi_limiter(max_requests, window_ms) that returns a function. Calling that function with a client ID and a timestamp returns true or false. Each client has an independent request count and window. All Part 1 tests remain active.",
      "activeTests": [
        "allows requests under limit",
        "rejects request at limit",
        "resets after window expires",
        "boundary request at window edge",
        "zero max requests rejects all",
        "independent limits per client",
        "one client rejected does not affect another",
        "many clients tracked simultaneously",
        "client window resets independently"
      ],
      "scaffold": {
        "js": "\n/**\n * Create a multi-client rate limiter.\n *\n * @param {number} maxRequests - Maximum requests allowed per window per client\n * @param {number} windowMs - Window duration in milliseconds\n * @returns {function(string, number): boolean} A function that takes a client ID\n *   and a timestamp (ms), returns true if allowed, false if rejected.\n */\nfunction createMultiLimiter(maxRequests, windowMs) {\n  // TODO: implement\n}\n\nmodule.exports.createMultiLimiter = createMultiLimiter;\n",
        "python": "\n\ndef create_multi_limiter(max_requests: int, window_ms: int):\n    \"\"\"Create a multi-client rate limiter.\n\n    Args:\n        max_requests: Maximum requests allowed per window per client.\n        window_ms: Window duration in milliseconds.\n\n    Returns:\n        A function that takes a client_id (str) and timestamp (ms),\n        returns True if allowed, False if rejected.\n    \"\"\"\n    pass\n"
      }
    }
  ]
}
```

Annotations:

- **Title** — `"Request Throttle"` uses domain language, not algorithm names (Rule 1). It does not reveal part count or difficulty.
- **Description** — describes the functional goal without naming data structures or algorithms (Rule 2).
- **Part 1 title** — `"Single-client rate limiter"` describes what to build, not how (Rule 3).
- **Part 2 title** — `"Multi-client rate limiter"` describes the extension, does not reference Part 1's internals (Rule 3).
- **Part descriptions** — specify input/output behavior, not mechanism (Rule 4).
- **Test names** — all describe observable behavior: `"allows requests under limit"`, not `"hash map stores timestamps"` (Rule 5).
- **Scaffolds** — contain only function signatures, doc comments, and `// TODO` / `pass` bodies. No hints (Rule 6).
- **Part 2 `activeTests`** — includes all five Part 1 tests (accumulation rule, Section 3).
- **Part 2 JS scaffold** — uses `module.exports.createMultiLimiter` (additive export).
- **Difficulty** — `overall` = round((2 × 0.3) + (2 × 0.3) + (3 × 0.4)) = round(2.4) = 2. Computed, not estimated (Checklist item 14).

### `problems/request-throttle/suite.test.js`

```js
const mod = require("../../workspace/request-throttle/main");

// ---- Part 1: createLimiter ----

describe("createLimiter", () => {
  test("allows requests under limit", () => {
    // Rule 5: test name describes observable behavior
    const limiter = mod.createLimiter(3, 1000);
    expect(limiter(100)).toBe(true);
    expect(limiter(200)).toBe(true);
    expect(limiter(300)).toBe(true);
  });

  test("rejects request at limit", () => {
    const limiter = mod.createLimiter(2, 1000);
    expect(limiter(100)).toBe(true);
    expect(limiter(200)).toBe(true);
    expect(limiter(300)).toBe(false);  // 3rd request within window
  });

  test("resets after window expires", () => {
    const limiter = mod.createLimiter(1, 1000);
    expect(limiter(100)).toBe(true);
    expect(limiter(500)).toBe(false);  // same window
    expect(limiter(1200)).toBe(true);  // new window
  });

  test("boundary request at window edge", () => {
    const limiter = mod.createLimiter(1, 1000);
    expect(limiter(0)).toBe(true);
    expect(limiter(999)).toBe(false);  // still in first window
    expect(limiter(1000)).toBe(true);  // new window starts
  });

  test("zero max requests rejects all", () => {
    const limiter = mod.createLimiter(0, 1000);
    expect(limiter(100)).toBe(false);
    expect(limiter(2000)).toBe(false);
  });
});

// ---- Part 2: createMultiLimiter ----

describe("createMultiLimiter", () => {
  test("independent limits per client", () => {
    const limiter = mod.createMultiLimiter(1, 1000);
    expect(limiter("alice", 100)).toBe(true);
    expect(limiter("bob", 100)).toBe(true);  // different client, independent
  });

  test("one client rejected does not affect another", () => {
    const limiter = mod.createMultiLimiter(1, 1000);
    expect(limiter("alice", 100)).toBe(true);
    expect(limiter("alice", 200)).toBe(false);  // alice exhausted
    expect(limiter("bob", 200)).toBe(true);     // bob unaffected
  });

  test("many clients tracked simultaneously", () => {
    const limiter = mod.createMultiLimiter(2, 1000);
    const clients = ["a", "b", "c", "d", "e"];
    for (const id of clients) {
      expect(limiter(id, 100)).toBe(true);
      expect(limiter(id, 200)).toBe(true);
      expect(limiter(id, 300)).toBe(false);
    }
  });

  test("client window resets independently", () => {
    const limiter = mod.createMultiLimiter(1, 1000);
    expect(limiter("alice", 100)).toBe(true);
    expect(limiter("bob", 500)).toBe(true);
    expect(limiter("alice", 1200)).toBe(true);  // alice's window reset
    expect(limiter("bob", 1200)).toBe(false);   // bob's window has not reset
  });
});
```

### `problems/request-throttle/suite.test.py`

```python
import sys
import os

# Add workspace path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "workspace", "request-throttle"))


# ---- Part 1: create_limiter ----

def test_allows_requests_under_limit():
    from main import create_limiter
    limiter = create_limiter(3, 1000)
    assert limiter(100) is True
    assert limiter(200) is True
    assert limiter(300) is True


def test_rejects_request_at_limit():
    from main import create_limiter
    limiter = create_limiter(2, 1000)
    assert limiter(100) is True
    assert limiter(200) is True
    assert limiter(300) is False


def test_resets_after_window_expires():
    from main import create_limiter
    limiter = create_limiter(1, 1000)
    assert limiter(100) is True
    assert limiter(500) is False
    assert limiter(1200) is True


def test_boundary_request_at_window_edge():
    from main import create_limiter
    limiter = create_limiter(1, 1000)
    assert limiter(0) is True
    assert limiter(999) is False
    assert limiter(1000) is True


def test_zero_max_requests_rejects_all():
    from main import create_limiter
    limiter = create_limiter(0, 1000)
    assert limiter(100) is False
    assert limiter(2000) is False


# ---- Part 2: create_multi_limiter ----

def test_independent_limits_per_client():
    from main import create_multi_limiter
    limiter = create_multi_limiter(1, 1000)
    assert limiter("alice", 100) is True
    assert limiter("bob", 100) is True


def test_one_client_rejected_does_not_affect_another():
    from main import create_multi_limiter
    limiter = create_multi_limiter(1, 1000)
    assert limiter("alice", 100) is True
    assert limiter("alice", 200) is False
    assert limiter("bob", 200) is True


def test_many_clients_tracked_simultaneously():
    from main import create_multi_limiter
    limiter = create_multi_limiter(2, 1000)
    for client_id in ["a", "b", "c", "d", "e"]:
        assert limiter(client_id, 100) is True
        assert limiter(client_id, 200) is True
        assert limiter(client_id, 300) is False


def test_client_window_resets_independently():
    from main import create_multi_limiter
    limiter = create_multi_limiter(1, 1000)
    assert limiter("alice", 100) is True
    assert limiter("bob", 500) is True
    assert limiter("alice", 1200) is True
    assert limiter("bob", 1200) is False
```
