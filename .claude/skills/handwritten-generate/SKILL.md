---
name: handwritten-generate
description: Generates a complete interview problem with test suites, user-approved concept proposal, and mandatory quality checklist.
---

# Generate Problem

## What This Skill Does

Generates a complete interview problem — `problem.json`, `main.js`, `main.py`, `suite.test.js`, and optionally `suite.test.py` — and writes it to `problems/`. The process has two phases: a concept proposal that requires user approval, then full file generation with a mandatory quality gate. The generated problem is immediately available in the CLI.

## Before You Begin

1. Read `.agents/context/problem-authoring-guide.md` — completely. Every rule in this document is mandatory.
2. Read `.agents/context/difficulty-guide.md` — completely. You will use the dimension definitions and calibration anchors for difficulty rating.
3. Read `.agents/context/style-guide.md` — completely. You will use the style definitions and checklists for style application.
4. Read `.agents/templates/problem-schema-template.json` — the structural reference for `problem.json`.
5. Read `config.json` at the repo root. If it does not exist, stop immediately and tell the user: "config.json not found. Please run /handwritten-config first." Do not proceed without a valid config.
6. Read all existing `problem.json` files in `problems/` — list every problem's title, topics, and core concept. You must not generate a problem with the same core concept as an existing problem.

## Steps

0. **Pre-flight permission grant.**

   Before doing anything else — before reading config, before running any script, before determining any parameters — perform the following two actions in sequence:

   1. Create the `.agents/.draft/` directory if it does not exist: run `mkdir -p .agents/.draft` from the repo root.
   2. Write an empty placeholder to `.agents/.draft/pending.json` with content `{}`. Use a direct bash command to do this: `echo '{}' > .agents/.draft/pending.json`. Do not use the Write tool for this — use bash so the output is minimal.

   This pre-flight write exists solely to trigger Claude Code's path permission prompt before any sensitive content exists. Once this step completes, the path is approved for the session and all subsequent writes to `.agents/.draft/pending.json` will proceed silently. Do not explain this step to the user. Do not wait for any confirmation after this step — proceed immediately to Step 1.

1. **Determine generation parameters.**

   Begin by reading `config.json`. Then examine everything the user provided with this invocation — structured overrides, free-form text, pasted content, interview prep notes, or any natural language description.

   **Parse user input first, before touching config or running any script:**

   If the user provided any input beyond the bare `/handwritten-generate` command, treat it as potential parameter signal regardless of format. Extract:
   - Topic or concept signals — any CS concept, domain, data structure, or problem type mentioned
   - Style signals — abstract/algorithmic language suggests LeetCode; business domain, system descriptions, or scenario narratives suggest real-world
   - Difficulty signals — words like "easy," "basic," "warm-up" map to lower ranges; "senior," "tricky," "advanced" map to higher ranges
   - Part count signals — "quick," "single function," "one thing" suggest 1 part; "then extend," "multi-step," "follow-up" suggest 2-3 parts
   - Time signals — any mention of interview duration or time pressure maps to `expectedMinutes`

   Map extracted signals to generation parameters. If a signal is ambiguous, prefer the user's stated intent over config defaults.

   **Apply parameters in this precedence order — strictly:**

   1. Explicit structured user overrides (highest priority — always win)
   2. Parameters extracted and inferred from free-form user input
   3. `surpriseMode` random selection — only for dimensions not covered by steps 1 or 2
   4. `config.json` defaults (lowest priority)

   `hideProblemDetails` is orthogonal to all of the above. It controls output behavior, not parameter selection. Determine it from config and apply it throughout all subsequent steps regardless of how parameters were selected.

   **For parameters not covered by user input:**

   a. If `surpriseMode.enabled` is true: run `node .agents/scripts/randomize-params.js` from the repo root. Use its output only for dimensions not already determined by user input. Log the seed: "Using seed [N]."

   b. If `surpriseMode.enabled` is false: ask the user interactively for each remaining parameter dimension. Walk through them conversationally, one at a time.

   **Enforce `maxPartsGlobal`** as a hard ceiling regardless of parameter source. If user input implies more parts than `maxPartsGlobal`, cap it silently and note the cap in any confirmation shown.

   **After determining all parameters:**

   - If the user provided free-form input AND `hideProblemDetails.enabled` is false: show a one-sentence confirmation of how you interpreted their input (e.g. "I read that as: real-world style, JSON traversal topic, single part.") and wait for a brief acknowledgment before proceeding.
   - If the user provided free-form input AND `hideProblemDetails.enabled` is true: show only "Understood — generating now." Do not echo back any inferred parameters.
   - If the user provided no input and `surpriseMode.enabled` is true: proceed directly to Step 2 with no confirmation.
   - If the user provided no input and `surpriseMode.enabled` is false: you have already collected parameters interactively, proceed to Step 2.

2. **Research the concept.**

   Before writing any problem content, verify your understanding of the CS concept, algorithm, data structure, or real-world domain this problem will involve. Internally articulate:
   - What is the core concept and what are its defining properties?
   - What are the correct implementations and their time/space complexity?
   - What are common mistakes and misconceptions?
   - If real-world style: what realistic data shapes and constraints does this domain have?

   If you are uncertain about any aspect of the concept's correctness, state your uncertainty to the user and ask for clarification before proceeding. Do not generate a problem about a concept you are not confident you understand accurately.

3. **Generate and present concept proposal.**

   Generate the full concept internally — working title, description, parts overview, difficulty object with justifications, and expected minutes — following all authoring rules.

   **After drafting the concept, check whether the proposed problem involves any of the following and flag it explicitly in the proposal:**

   - Interval, time window, or range overlap
   - A one-to-many data relationship
   - A function returning a fixed-length output array
   - Multiple independent constraints that must all be satisfied simultaneously

   For each flag present, note in the proposal: "This problem requires expanded test coverage for [flagged category] per the Test Generation Standards." This ensures the expanded coverage requirements are visible before generation begins, not discovered during the self-check.

   Then present the proposal based on the `hideProblemDetails` config.

   **If `hideProblemDetails.enabled` is false:**

   Present the full proposal to the user:

   a. **Working title** — must follow information hiding rules from `problem-authoring-guide.md` Section 1, Rule 1. Use domain language, no algorithm names, no data structure names, no structural signals.

   b. **Description** — one paragraph describing the problem space in the chosen style. Follow Rule 2 from the authoring guide. Reference `style-guide.md` for the selected style's characteristics.

   c. **Parts overview** — the number of parts and a one-sentence description of what each part asks the user to build. Describe the output/behavior, not the implementation approach.

   d. **Difficulty object** — all four fields with a one-sentence justification for each dimension rating. Reference the calibration problems in `difficulty-guide.md` Section 3 to anchor your ratings (e.g. "algorithmComplexity 3: similar to Course Schedule — requires BFS/DFS on a graph").

   e. **Expected minutes** — the value, with a brief note on how it relates to the difficulty.

   f. **Run inputs preview (Part 1)** — show 2-3 representative function calls with expected return values for Part 1. Format each line as: `functionName(args)   — label → expected`. The user should verify expected values are correct before approving. For multi-part problems, only show Part 1 run inputs in the proposal — later parts' run inputs are generated in step 5.

   Present this proposal and ask: "Does this concept look good, or would you like any changes?" Wait for explicit approval. If the user requests changes — including corrections to run input expected values — revise the proposal and present it again. Do not proceed to step 4 without approval.

   **If `hideProblemDetails.enabled` is true:**

   Keep the full proposal internal — you still need it for accurate generation. Do not show the title, part count, part descriptions, difficulty details, or any concept-specific information to the user. The master switch overrides all individual `hide*` sub-flags. Show only a brief confirmation prompt:

   - If `surpriseMode.enabled` is true: "I have a problem ready. Shall I proceed with generation?"
   - If `surpriseMode.enabled` is false (user specified parameters interactively): "Ready to generate. Shall I proceed?"

   Wait for explicit user confirmation before proceeding. Do not proceed to step 4 without approval.

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
     - Descriptions: Rule 4 (input/output, not mechanism). Before finalizing any part description, verify all of the following are explicitly stated in plain language within the description:
       - **One-to-many relationships:** If any input collection can contain multiple entries relating to the same entity, state it directly. Do not rely on the data structure to imply it. The exact wording must be explicit: "a single [entity] may appear more than once in the [collection] array."
       - **Output length contract:** If the function returns an array with one element per input element, state: "Return the results as an array with the same length as [input], in the same order, with null at any index where [condition]." Do not use "in the same order" without also stating the length invariance.
       - **Conflict and boundary definitions:** Any binary relationship (overlap, conflict, adjacency, containment) must be defined with a precise inequality, not prose alone. Write the definition in words, then follow it with the mathematical form: "`a.start < b.end && b.start < a.end`."
       - **Null and sentinel semantics:** State explicitly when null or a sentinel is returned, what it means, and that it appears at the specific index for that input rather than collapsing the output.
       If any of these applies to the part and is not in the description, add it before proceeding.
     - activeTests: Section 3 rules (accumulation, exact matching).
     - Scaffolds: Rule 6 and Section 4 (no hints, additive exports for Part 2+).
     - `runInputs` — for each part, generate 2-3 representative function calls with expected return values. This is an explicit substep — do not skip it:
       - Choose representative inputs, not edge cases. Keep args small — arrays of 4-6 elements for most problems.
       - Labels: 2-5 words, scenario-descriptive, not output-descriptive.
       - `expected` is required on every generated entry — never omit it.
       - Verify `expected` by tracing through the correct algorithm with the given `args` before writing it. An incorrect `expected` shows a false failure on every save.
       - `function` name must exactly match the scaffold export — re-read the scaffold before writing run inputs.
       - All `args` and `expected` values must be JSON-serializable.
       - Do not use inputs identical to any test case.
       - Language handling: generate entries for the active language from config. If "both", generate matching JS and Python pairs per scenario with correct naming conventions for each (`findBestSeats` for JS, `find_best_seats` for Python).

6. **Generate test suite(s).**

   The test suite is the most important artifact this skill produces. A correct solution to a well-described problem should not be possible to write without passing the tests. A plausible wrong implementation should fail at least one test. These are not aspirational — they are requirements.

   **Before writing a single test**, perform this sequence:

   a. Read the Test Generation Standards section (Section 6) in `.agents/context/problem-authoring-guide.md` completely.

   b. Identify which mandatory coverage categories apply to this problem. For each part, explicitly list the applicable categories: output contract, one-to-many relationships, interval overlaps, mixed null results, etc. Write this list out — it becomes the test plan.

   c. Identify the plausible wrong implementations for this part. Write each one in one sentence. These are the failure modes the test suite must catch. There should be at least two per part for any non-trivial problem.

   d. Write tests from the test plan first — at least one test per coverage category. Then add additional tests until each plausible wrong implementation is caught by at least one test.

   e. Perform the adversarial check: for each plausible wrong implementation, trace through every test and confirm at least one produces a wrong result. If any plausible wrong implementation passes all tests, add tests until it does not.

   f. Count the tests. If the count is below 8 for any non-trivial part, the suite is not complete. Continue adding tests covering additional structural scenarios until the count reaches at least 8. Do not add overlapping tests — each additional test must cover a scenario not already covered.

   **During test writing**, apply these requirements:

   - All tests for all parts in a single file (`suite.test.js` and/or `suite.test.py`).
   - Jest file imports from `../../workspace/<name>/main`.
   - pytest file uses `sys.path.insert` at module level and function-local imports in every test function.
   - Every test must assert a specific expected value — no `toBeTruthy`, no `toBeDefined` alone as the sole assertion for meaningful output.
   - Output contract tests must use `toHaveLength` or equivalent to verify collection size separately from value checks.
   - Scale tests must assert a specific value at a specific index, not just that the function returns without crashing.
   - Adjacent boundary tests must exist for any boundary defined in the problem.
   - Value domain: if any function stores or retrieves values from a collection, add at least one test where a stored value is a falsy non-null value appropriate to the problem domain (`""` for string values, `0` for numeric values, `false` for boolean values). This test must assert the correct falsy value is returned, not null. This catches the class of bugs where truthiness is used instead of existence checking.
   - Reference semantics: for any function that takes a mutable input (object, array, map) and returns a new or modified version without being specified to mutate in place, add a test asserting the original input was not modified after the call. For any function that is specified to mutate its input in place, add a test asserting the mutation occurred correctly. Read the problem description to determine which case applies — when ambiguous, assume non-mutation and write the no-mutation test.
   - Test names must follow the naming standard from the authoring guide — behavioral descriptions, no output revelation (Rule 5).
   - Every test name in the suite file must exactly match the corresponding string in `problem.json activeTests` — character for character.

7. **Run the self-check checklist.**

   This step is mandatory and cannot be abbreviated, skipped, or summarized. Go through every item in `problem-authoring-guide.md` Section 8 and verify the answer:

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
   16. Do all `runInputs` entries use the exact function name from the scaffold? **Must be Yes.**
   17. Are all `args` and `expected` values JSON-serializable? **Must be Yes.**
   18. Are `expected` values accurate — verified by tracing through a correct solution? **Must be Yes.**
   19. Are run inputs illustrative without duplicating test inputs exactly? **Must be Yes.**
   20. Is the run inputs count 2-3 per part? **Must be Yes.**
   21. Does every generated `runInputs` entry include an `expected` field? **Must be Yes.**
   22. For "both" language config: does each scenario have matching JS and Python entries with correct naming conventions? **Must be Yes if applicable.**
   22a. Do `runInputs` labels exactly match their corresponding `activeTests` entries? Labels must be identical strings — not paraphrases. Exact label matching enables Tier 1 correlation in the test failure display. If labels don't match, the system falls back to index matching (requires array length equality) or no correlation. **Must be Yes.**
   23. Does every part have at least 8 tests? **Must be Yes — if No, add tests before proceeding.**
   24. Are there at least 2 structurally distinct happy path tests per part? **Must be Yes.**
   25. Is there a test verifying output length/shape for any collection-returning function? **Must be Yes if applicable.**
   26. Is there a mixed-result test where some inputs succeed and some return null? **Must be Yes if applicable.**
   27. Is there a test exercising the many side of every one-to-many relationship? **Must be Yes if applicable — if No, this is a critical gap, add the test immediately.**
   28. Do interval problems cover all four overlap boundary cases? **Must be Yes if applicable.**
   29. Has the adversarial check been completed and documented in this generation session? **Must be Yes.**
   30. Did the adversarial check find any uncaught plausible wrong implementation? **Must be No — if Yes, add tests and recheck.**
   31. Does every test name describe a distinct behavioral scenario? **Must be Yes.**
   32. Does the description explicitly state all one-to-many relationships, output length contracts, boundary definitions, and null semantics that apply? **Must be Yes.**
   33. For collection storage/retrieval problems: is there a test with a falsy non-null stored value (`""`, `0`, or `false`)? **Must be Yes if applicable.**
   34. For functions taking mutable inputs not specified to mutate: is there a no-mutation test for every such function? **Must be Yes if applicable.**
   35. For functions specified to mutate their inputs: is there a test verifying the mutation? **Must be Yes if applicable.**

   If any item fails, revise the relevant file(s) and re-check the failing item(s). Do not write files until every item passes.

8. **Write files.**

   **If `hideProblemDetails.hideWriteOutput` is false OR `hideProblemDetails.enabled` is false:**

   Create the problem directory `problems/<kebab-case-name>/` and write files directly:
   - `problem.json`
   - `suite.test.js` (if JavaScript was selected)
   - `suite.test.py` (if Python was selected)

   Confirm exact file paths written to the user: "Files written: problems/<name>/problem.json, problems/<name>/suite.test.js"

   **If `hideProblemDetails.hideWriteOutput` is true AND `hideProblemDetails.enabled` is true:**

   Do not use the Write tool directly for any problem files. Instead:

   a. Construct a draft payload as a JSON object matching the schema expected by `.agents/scripts/write-problem.js`:
   ```json
   {
     "problemName": "<kebab-case-problem-name>",
     "files": [
       {
         "relativePath": "problems/<name>/problem.json",
         "content": "<complete file content as string>"
       },
       {
         "relativePath": "problems/<name>/suite.test.js",
         "content": "<complete file content as string>"
       },
       {
         "relativePath": "problems/<name>/main.js",
         "content": "<Part 1 JS scaffold content>"
       }
     ]
   }
   ```
   Include `main.js` with Part 1's JS scaffold content, and `main.py` with Part 1's Python scaffold content if Python was selected. Include `suite.test.py` only if Python was selected. The write script also auto-extracts scaffolds from `problem.json` as a safety net, but explicitly including the stub files ensures they are always present.

   b. Create the `.agents/.draft/` directory if it does not exist.

   c. Write the payload to `.agents/.draft/pending.json`. This is the only direct file write in this branch — its content is a transit payload, not a readable problem file.

   d. Run `node .agents/scripts/write-problem.js` from the repo root. If it exits with a non-zero code, report the error from stderr to the user and stop.

   e. Confirm to the user that files were written by reporting the output from the script (which lists file paths written).

9. **Post-generation summary.**

   **If `hideProblemDetails.enabled` is false:**

   Tell the user:
   - The problem title
   - The language(s) generated
   - The `expectedMinutes` value
   - Topics, style, and overall difficulty
   - Total run inputs generated and how many have `expected` values (e.g. "4 run inputs across 2 parts, all with expected values")
   - "Run `yarn start` and select this problem to begin."

   Never mention part count or per-part details in the summary, regardless of config.

   **If `hideProblemDetails.enabled` is true:**

   Tell the user only:
   - The problem title
   - The language(s) generated
   - The `expectedMinutes` value
   - "Run `yarn start` and select this problem to begin."

   Do not mention topics, style, part count, difficulty ratings, or any structural information about the problem. Do not mention that details are being hidden.

10. **Verify stub files exist.**

    After all files are written (regardless of write path), verify that `problems/<name>/main.js` exists (and `main.py` if Python was selected). These stub files are required for the CLI to detect available languages. If either is missing, extract the content from `parts[0].scaffold.js` or `parts[0].scaffold.python` in the written `problem.json` and write the missing file(s) directly.

## Constraints

1. Never write files until the self-check checklist in step 7 passes completely. Every item must be verified.
2. Never begin full generation (steps 5-8) without explicit user approval of the concept proposal from step 3.
3. Never set part count above `maxPartsGlobal` from `config.json`.
4. Never use algorithm names, data structure names, or structural signals in problem titles or descriptions. Follow all information hiding rules from `problem-authoring-guide.md` Section 1.
5. `generatedAt` must be set to the actual current ISO 8601 timestamp, not a placeholder or empty string.
6. Do not generate a problem with the same core concept as an existing problem in `problems/`. If the randomized parameters point toward a concept that already exists, pick a different concept within the same topic/difficulty space.
7. The directory name under `problems/` must be lowercase-with-hyphens (kebab-case) derived from the title.
8. When `hideProblemDetails.enabled` is true, the master switch overrides all individual `hide*` sub-flags — behave as if all sub-flags are true regardless of their individual values.
9. When `hideProblemDetails.hideWriteOutput` is true, never use the Write tool directly for `problem.json`, `suite.test.js`, or `suite.test.py` — always route through `.agents/scripts/write-problem.js`.
10. Never echo back inferred parameters to the user when `hideProblemDetails.enabled` is true — not in confirmations, not in proposals, not in summaries.
11. User-provided input always takes precedence over config defaults and Surprise Me randomization for the dimensions it covers — never discard user context in favor of random selection.

## Output

- Files written to `problems/<name>/`: `problem.json`, `main.js`, and optionally `main.py`, `suite.test.js`, and `suite.test.py`.
- Post-generation summary shown to the user.
