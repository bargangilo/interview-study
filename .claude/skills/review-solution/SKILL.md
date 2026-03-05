---
name: review-solution
description: Reviews a completed solution with five-tier structured analysis covering correctness, complexity, code quality, and interview readiness.
---

# Review Solution

## What This Skill Does

Reviews a completed solution in the user's workspace. Provides a structured five-tier review covering correctness, complexity, code quality, interview performance, and alternative approaches. Use this after completing a problem or when you want feedback on a partial solution.

## Before You Begin

1. Read `.agents/context/problem-authoring-guide.md` Section 1 (Information Hiding Rules) — you need to understand what the problem was intentionally obscuring so the review does not reveal design intent or test structure.

## Steps

1. **List available problems for review.**

   Read the `problems/` directory. For each problem directory that also has a corresponding `workspace/<name>/` directory, read `problem.json` and display the problem's `title`.

   If no workspace directories exist, tell the user: "No completed workspaces found. Start a problem session first." Stop.

   Ask: "Which problem would you like reviewed?" Wait for the user's selection.

2. **Determine the language to review.**

   Check `workspace/<name>/` for `main.js` and `main.py`.
   - If only one exists, use it.
   - If both exist, ask: "Both JavaScript and Python solutions exist. Which would you like reviewed?" Wait for response.

3. **Read the solution and problem context.**

   Read these files:
   - `workspace/<name>/main.js` or `main.py` — the user's solution.
   - `problems/<name>/problem.json` — the full problem definition including all parts, descriptions, and difficulty ratings.
   - `workspace/<name>/session.json` — if it exists, for timing context.

4. **Deliver the five-tier review.**

   Use exactly these section headings, in this order:

   **Correctness**

   Assess whether the solution correctly handles each part's requirements. Reference specific function names and line numbers. If edge cases are handled incorrectly, provide concrete examples of inputs that would produce wrong results: "Calling `fn([])` returns `undefined` instead of `[]`." If the solution is fully correct, say so in one sentence and move on. Do not pad this section with generic praise.

   **Complexity**

   State the time and space complexity for each function using Big O notation. If the solution is suboptimal, state the optimal complexity achievable, explain why the current solution does not achieve it, and identify the specific bottleneck (e.g. "The nested loop on lines 12-18 makes this O(n^2); a hash map lookup would reduce it to O(n)").

   **Code Quality**

   Evaluate idiomatic patterns, naming, clarity, and language-specific best practices. Note specific strengths and specific areas for improvement, referencing line numbers or function names. Focus on issues that affect readability or maintainability. Do not comment on style preferences that have no correctness or readability impact (e.g. semicolons vs no semicolons in JS, single vs double quotes).

   **Interview Lens**

   Assess how an interviewer would likely evaluate this solution. What does the solution signal about the candidate's problem-solving approach, code organization, and preparedness? What follow-up questions would it invite? Be direct — if the solution would raise concerns in an interview, state them plainly.

   **Alternative Approaches**

   Describe one or two other valid approaches. For each: name the approach in 2-3 words, explain it in 2-3 sentences, and state its tradeoffs relative to the submitted solution. Frame as tradeoffs (faster but more memory, simpler but less efficient) rather than "better" or "worse."

5. **Add timing note (if available).**

   If `session.json` exists and contains at least one completed attempt, add a brief final section:

   **Timing**

   Compare the user's solve time to `expectedMinutes` from `problem.json`. State the comparison factually ("You solved this in 18 minutes against an expected 25 minutes") and add one sentence on what the timing might suggest about the user's comfort level with the concept. Keep this to 2 sentences total.

## Constraints

1. Do not restate the problem description anywhere in the review. The user already knows the problem.
2. Do not use congratulatory language ("Great job!", "Well done!", "Impressive work"). Be factual and direct.
3. Do not hedge unnecessarily ("This might be an issue", "Perhaps you could consider"). State observations directly.
4. Each tier must be readable in under 60 seconds. No padding, no repetition across tiers, no restating what was said in a previous tier.
5. Do not reveal information about how the problem was designed, how many tests exist, what specific edge cases the tests check, or what the test suite structure looks like. The review must be based on code analysis, not test knowledge.

## Output

- A structured five-tier review displayed to the user, with an optional timing note.
- No files are written or modified.
