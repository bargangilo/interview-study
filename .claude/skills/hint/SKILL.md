---
name: hint
description: Provides a scoped, tiered hint for the current part of an active problem without revealing future parts or test structure.
---

# Hint

## What This Skill Does

Provides a scoped, tiered hint for the current part of an active problem. The user chooses how much help they want — from a gentle nudge to near-solution pseudocode. The hint is strictly scoped to the current part and never reveals information about future parts, test structure, or total part count.

## Before You Begin

1. Read `.agents/context/problem-authoring-guide.md` Section 1 (Information Hiding Rules) — you must understand these rules because the hint must not violate them. The problem was designed to hide certain information from the user, and the hint must respect that design.

## Steps

1. **List available problems.**

   Read the `problems/` directory. For each problem directory, check if a corresponding workspace file exists (`workspace/<name>/main.js` or `workspace/<name>/main.py`). Display the `title` (from `problem.json`) of every problem that has a workspace file.

   If no workspace files exist, tell the user: "No active workspaces found. Start a problem session first." Stop.

   Ask: "Which problem do you want a hint for?" Wait for the user's selection.

2. **Determine the language.**

   Check `workspace/<name>/` for `main.js` and `main.py`.
   - If only one exists, use it.
   - If both exist, ask which language's solution they want a hint for. Wait for response.

3. **Determine the current part.**

   Read the workspace file (`workspace/<name>/main.js` or `main.py`). Scan for delimiter markers:
   - JavaScript: `// ---- Part N ----`
   - Python: `# ---- Part N ----`

   The current part index is the count of delimiters found. If no delimiters exist, the current part is Part 1 (index 0). If one `Part 2` delimiter exists, the current part is Part 2 (index 1). And so on.

4. **Read only the current part's context.**

   From `problems/<name>/problem.json`, read only `parts[currentPartIndex].title` and `parts[currentPartIndex].description`. Do not read any other part's title, description, activeTests, or scaffold. Do not count the total number of parts. Do not access parts beyond the current index.

5. **Read the user's current code.**

   Read the full workspace file. Understand what the user has already written — whether they have a viable approach started, whether they are stuck at the beginning, or whether they are headed in an unproductive direction. Use this understanding to make the hint relevant to their actual state, not generic.

6. **Present tier options.**

   Display exactly this prompt:

   ```
   Which level of hint would you like for Part [N]?

   1. Nudge — confirms whether you're on the right track, or redirects
      you without implementation detail
   2. Structural — describes a valid approach in plain English, no code
   3. Near-solution — pseudocode or a step-by-step algorithmic description
   ```

   Replace `[N]` with the current part number (1-indexed). Wait for the user's explicit selection.

7. **Deliver the chosen hint tier.**

   **Tier 1 — Nudge**

   Examine what the user has written.
   - If they have a viable approach started: confirm it in one sentence without naming the algorithm or data structure. Example: "Your current direction will work — focus on handling the boundary conditions."
   - If they are headed in an unproductive direction: redirect them in one sentence without naming the correct algorithm. Example: "Consider whether you need to visit every element, or if there's a way to skip elements you've already ruled out."
   - If they have written nothing meaningful: give one sentence pointing toward the right type of thinking. Example: "Start by thinking about what information you need to track as you move through the input."

   Maximum: 3 sentences. No code. No pseudocode. No algorithm names.

   **Tier 2 — Structural**

   Describe a valid approach for the current part in plain English. One paragraph, maximum 5 sentences. Describe the steps in terms of what to do with the data, not in terms of named algorithms or data structures. Do not write code. Do not write pseudocode.

   Example: "Process the input from left to right. At each position, check whether you've seen a complementary value before. If you have, you've found your answer. If not, record the current value and move on. The key insight is that you only need to look at each element once."

   **Tier 3 — Near-solution**

   Write either pseudocode or a numbered step-by-step algorithmic description. Maximum 8 steps. Be precise enough that the user can translate each step directly into working code without inferring anything. You may name the algorithm at this tier if naming it is necessary for the pseudocode to be unambiguous.

   Example:
   ```
   1. Create an empty lookup table mapping values to their indices.
   2. For each element at index i in the input array:
      a. Compute complement = target - element.
      b. If complement exists in the lookup table, return [lookup[complement], i].
      c. Otherwise, add element -> i to the lookup table.
   3. If no pair found after processing all elements, return empty.
   ```

## Constraints

These constraints are non-negotiable. Violating any of them defeats the purpose of the progressive revelation system.

1. **Never mention how many parts the problem has total.** Do not say "this is a 3-part problem" or "there are more parts after this" or "this is the last part." If the user asks directly how many parts there are, respond exactly: "I can't share that — would you like a hint for the current part instead?"
2. **Never hint toward or reference any future part.** Do not say "this will be useful later" or "keep your implementation flexible for what comes next" or "you'll need to extend this." The hint must be entirely self-contained within the current part.
3. **Never reveal what edge cases the tests cover.** Do not say "make sure to handle empty arrays" unless the part description itself mentions empty arrays. The hint is based on the problem description and the user's code, not on test cases.
4. **Never reveal how many tests exist.** Do not say "there are 5 tests to pass" or "you're failing 2 tests."
5. **Never write actual code in Tier 1 or Tier 2.** No code snippets, no function calls, no variable declarations. Plain English only.
6. **Tier 1 must be 1-3 sentences maximum.** If you cannot express the nudge in 3 sentences, you are giving too much information.
7. **Tier 2 must be one paragraph maximum (5 sentences).** If you need more, you are giving too much structural detail.
8. **Tier 3 must be 8 steps maximum.** If you need more, break the steps into higher-level abstractions.

## Output

- A single hint at the requested tier, displayed to the user.
- No files are written or modified.
