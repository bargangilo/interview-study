---
name: generate-problem
description: Generates a complete interview problem with test suites, user-approved concept proposal, and mandatory quality checklist.
---

# Generate Problem

## What This Skill Does

Generates a complete interview problem — `problem.json`, `suite.test.js`, and optionally `suite.test.py` — and writes it to `problems/`. The process has two phases: a concept proposal that requires user approval, then full file generation with a mandatory quality gate. The generated problem is immediately available in the CLI.

## Before You Begin

1. Read `.agents/context/problem-authoring-guide.md` — completely. Every rule in this document is mandatory.
2. Read `.agents/context/difficulty-guide.md` — completely. You will use the dimension definitions and calibration anchors for difficulty rating.
3. Read `.agents/context/style-guide.md` — completely. You will use the style definitions and checklists for style application.
4. Read `.agents/templates/problem-schema-template.json` — the structural reference for `problem.json`.
5. Read `config.json` at the repo root. If it does not exist, stop immediately and tell the user: "config.json not found. Please run /setup-config first." Do not proceed without a valid config.
6. Read all existing `problem.json` files in `problems/` — list every problem's title, topics, and core concept. You must not generate a problem with the same core concept as an existing problem.

## Steps

1. **Determine generation parameters.**

   Check whether the user has provided any explicit parameters with this invocation (e.g. "generate a problem about trees", "difficulty 3", "real-world style", "2 parts"). Accept any provided overrides — these take priority over randomized or default parameters.

   For parameters not explicitly provided by the user:

   a. If `config.json` has `surpriseMode.enabled: true`: run `node .agents/scripts/randomize-params.js` from the repo root. Parse the JSON output. These are the generation parameters for any dimension the user did not override. Tell the user: "Using seed [N] for this generation. Keep this if you want to regenerate with the same parameters." What you reveal about the parameters is controlled by the `surpriseMode.reveal*` flags:
      - If `revealTopicOnStart` is false: do not tell the user the selected topics.
      - If `revealStyleOnStart` is false: do not tell the user the selected style.
      - If `revealPartCountOnStart` is false: do not tell the user the part count.

   b. If `surpriseMode.enabled` is false: use config defaults as the baseline. For any parameter not fully determined by config defaults (e.g. specific topics from the include list, exact difficulty values within ranges), ask the user interactively.

   Enforce `maxPartsGlobal` from `config.json` as a hard ceiling on part count regardless of parameter source. If any source specifies a part count above this ceiling, cap it silently and note the cap to the user: "Part count capped to [N] per your config.json maxPartsGlobal setting."

2. **Research the concept.**

   Before writing any problem content, verify your understanding of the CS concept, algorithm, data structure, or real-world domain this problem will involve. Internally articulate:
   - What is the core concept and what are its defining properties?
   - What are the correct implementations and their time/space complexity?
   - What are common mistakes and misconceptions?
   - If real-world style: what realistic data shapes and constraints does this domain have?

   If you are uncertain about any aspect of the concept's correctness, state your uncertainty to the user and ask for clarification before proceeding. Do not generate a problem about a concept you are not confident you understand accurately.

3. **Generate and present concept proposal.**

   Write and present to the user:

   a. **Working title** — must follow information hiding rules from `problem-authoring-guide.md` Section 1, Rule 1. Use domain language, no algorithm names, no data structure names, no structural signals.

   b. **Description** — one paragraph describing the problem space in the chosen style. Follow Rule 2 from the authoring guide. Reference `style-guide.md` for the selected style's characteristics.

   c. **Parts overview** — the number of parts and a one-sentence description of what each part asks the user to build. Describe the output/behavior, not the implementation approach.

   d. **Difficulty object** — all four fields with a one-sentence justification for each dimension rating. Reference the calibration problems in `difficulty-guide.md` Section 3 to anchor your ratings (e.g. "algorithmComplexity 3: similar to Course Schedule — requires BFS/DFS on a graph").

   e. **Expected minutes** — the value, with a brief note on how it relates to the difficulty.

   Present this proposal and ask: "Does this concept look good, or would you like any changes?" Wait for explicit approval. If the user requests changes, revise the proposal and present it again. Do not proceed to step 4 without approval.

4. **Confirm language.**

   Ask: "Generate test suite for JavaScript, Python, or both?" Default to `config.json language.preference` if the user does not specify. Wait for response.

5. **Generate complete `problem.json`.**

   Build the full `problem.json` using `.agents/templates/problem-schema-template.json` as the structural reference. Ensure every field is present:
   - `title`, `description` — from the approved proposal.
   - `topics` — the selected topics as a lowercase string array.
   - `difficulty` — from the approved proposal. `overall` must be computed from the formula, never set manually.
   - `style` — `"leetcode"` or `"real-world"`.
   - `expectedMinutes` — from the approved proposal.
   - `generatedBy` — `"agent"`.
   - `generatedAt` — current ISO 8601 timestamp. Use the actual current time, not a placeholder.
   - `parts` — each part with `title`, `description`, `activeTests`, and `scaffold` (js and/or python). Follow all authoring rules:
     - Titles: Rule 3 (what to build, not how).
     - Descriptions: Rule 4 (input/output, not mechanism).
     - activeTests: Section 3 rules (accumulation, exact matching).
     - Scaffolds: Rule 6 and Section 4 (no hints, additive exports for Part 2+).

6. **Generate test suite(s).**

   For each selected language, write a complete suite file following `problem-authoring-guide.md` Section 5:
   - All tests for all parts in a single file (`suite.test.js` and/or `suite.test.py`).
   - Jest file imports from `../../workspace/<name>/main`.
   - pytest file uses `sys.path.insert` at module level and function-local imports in every test function.
   - Test names describe observable behavior, not implementation (Rule 5).
   - Minimum coverage per part: one basic case, one empty/null/boundary input, two edge cases, one performance-adjacent case.
   - Every test name in the suite file must exactly match the corresponding string in `problem.json activeTests` — character for character.

7. **Run the self-check checklist.**

   This step is mandatory and cannot be abbreviated, skipped, or summarized. Go through every item in `problem-authoring-guide.md` Section 6 and verify the answer:

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
   11. Does every test function in the suite file appear in at least one part's `activeTests`? **Must be Yes.**
   12. Does the Part 1 JS scaffold use `module.exports = { fn }` and do Part 2+ JS scaffolds use `module.exports.fn = fn`? **Must be Yes.**
   13. Do all pytest test functions use function-local imports (not module-level)? **Must be Yes.**
   14. Is `overall` computed from the formula, not estimated manually? **Must be Yes.**
   15. Does the problem directory name use lowercase-with-hyphens and match what the test files import from `workspace/<name>/main`? **Must be Yes.**

   If any item fails, revise the relevant file(s) and re-check the failing item(s). Do not write files until every item passes.

8. **Write files.**

   Create the problem directory `problems/<kebab-case-name>/` and write:
   - `problem.json`
   - `suite.test.js` (if JavaScript was selected)
   - `suite.test.py` (if Python was selected)

   Confirm exact file paths written to the user: "Files written: problems/<name>/problem.json, problems/<name>/suite.test.js"

9. **Post-generation summary.**

   Tell the user:
   - The problem title
   - The language(s) generated
   - The `expectedMinutes` value
   - The overall difficulty rating
   - If Surprise Me was used: now reveal topics and style (subject to `surpriseMode.reveal*` flags — only reveal what the flags permit)
   - "Run `yarn start` and select this problem to begin."

   Do not mention part count or per-part details in the summary.

## Constraints

1. Never write files until the self-check checklist in step 7 passes completely. Every item must be verified.
2. Never begin full generation (steps 5-8) without explicit user approval of the concept proposal from step 3.
3. Never set part count above `maxPartsGlobal` from `config.json`.
4. Never use algorithm names, data structure names, or structural signals in problem titles or descriptions. Follow all information hiding rules from `problem-authoring-guide.md` Section 1.
5. `generatedAt` must be set to the actual current ISO 8601 timestamp, not a placeholder or empty string.
6. Do not generate a problem with the same core concept as an existing problem in `problems/`. If the randomized parameters point toward a concept that already exists, pick a different concept within the same topic/difficulty space.
7. The directory name under `problems/` must be lowercase-with-hyphens (kebab-case) derived from the title.

## Output

- Files written to `problems/<name>/`: `problem.json`, and optionally `suite.test.js` and `suite.test.py`.
- Post-generation summary shown to the user.
