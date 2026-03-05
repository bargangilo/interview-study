---
name: setup-config
description: Creates or updates config.json through a guided conversation covering topics, difficulty, style, and timing.
---

# Setup Config

## What This Skill Does

Creates or updates the user's `config.json` file through a guided conversation. This file controls how problems are generated — topics, difficulty ranges, style preferences, part counts, timing, and Surprise Me mode. The skill walks the user through each setting, explains what it controls, and writes the final config only after explicit confirmation.

## Before You Begin

1. Read `.agents/templates/config-template.json` — this is the structural base for the output file.
2. Read `.agents/context/difficulty-guide.md` Section 1 (Dimension Definitions) — you will reference these definitions when explaining difficulty settings to the user.

## Steps

1. **Check for existing config.** Look for `config.json` at the repo root.
   - If it exists: read it, display a human-readable summary of all current settings in plain English (not raw JSON), and ask: "Would you like to update specific settings or start from scratch?" Wait for the user's response before proceeding. If they want to update specific settings, skip directly to the relevant section(s) in step 2.
   - If it does not exist: greet the user and explain: "This skill will create your config.json, which controls how problems are generated for you — topics, difficulty, style, timing, and more. I'll walk you through each setting." Proceed to step 2.

2. **Walk through each configuration section in order.** For each section, explain what it controls and how it affects problem generation before asking for the user's preference. Parse their natural language response into the correct config value — do not ask them to type JSON.

   a. **Topics**
   Explain: "Topics control which CS and programming concepts appear in generated problems."
   Ask what topics they want to practice. Accept a comma-separated list, a sentence, or any natural format. Then ask if there are topics they want to explicitly avoid.
   Validate that every provided topic is a real, meaningful CS or programming concept. If something seems unclear, misspelled, or too vague (e.g. "hard stuff"), confirm with the user before accepting it: "Did you mean [X]? Or could you be more specific?"

   b. **Difficulty**
   Explain: "Difficulty has three independent dimensions, each rated 1-5. You set a range for each."
   For each dimension, explain it using the concrete level definitions from `difficulty-guide.md` Section 1:
   - **Algorithm complexity** — "Level 1 is simple iteration. Level 2 is binary search or hash map lookup. Level 3 is BFS/DFS or basic DP. Level 4 is Dijkstra's or 2D DP. Level 5 is advanced algorithms like network flow."
   - **Data structure complexity** — "Level 1 is arrays and strings only. Level 2 adds hash maps, stacks, queues. Level 3 adds trees, heaps, graphs. Level 4 requires custom or augmented structures. Level 5 is tries, segment trees, or similar."
   - **Problem complexity** — "Level 1 is obvious what to do. Level 2 needs one insight. Level 3 needs pattern recognition. Level 4 needs chaining multiple insights. Level 5 requires reframing the problem entirely."
   Ask what range they want for each dimension (e.g. "1-3" or "2-4"). If the user expresses a goal instead of numbers ("I want medium difficulty"), translate it into appropriate ranges, state them, and confirm.

   c. **Style**
   Explain: "LeetCode style presents problems as abstract function-signature tasks with numerical constraints. Real-world style frames problems in a meaningful domain context — scheduling systems, inventory management, etc."
   Ask their preference: LeetCode only, real-world only, or mixed. If mixed, confirm they are comfortable with either style appearing.

   d. **Language**
   Ask: "Should generated problems include test suites for JavaScript, Python, or both?"

   e. **Parts**
   Explain: "Problems can have multiple parts that build on each other. You set a range for how many parts generated problems should have, plus a hard ceiling (maxPartsGlobal) that is never exceeded."
   Ask for their preferred range (e.g. "1-3"). Then ask them to confirm a maxPartsGlobal value. Recommend 3 for most interview prep. If they want more, accept up to 6 but not higher.

   f. **Surprise Me Mode**
   Explain: "Surprise Me mode lets the system pick topics, style, and part count randomly based on your configured preferences, so you don't know exactly what's coming when you start a problem."
   Ask if they want this enabled. If yes, ask about each reveal flag separately:
   - "When you start a problem, should the topic be shown?" (`revealTopicOnStart`)
   - "Should the style (LeetCode vs real-world) be shown?" (`revealStyleOnStart`)
   - "Should the number of parts be shown?" (`revealPartCountOnStart`)
   Explain what each flag controls concretely before asking.

   g. **Time Range**
   Ask: "What range of expected problem-solving times do you want to practice with? For example, 20-45 minutes." Accept a range in minutes.

3. **Display full summary.** After all sections are collected, display a complete human-readable summary of the full configuration in plain English. Example format:
   ```
   Topics: arrays, hash maps, trees, dynamic programming, strings
   Avoid: graphs
   Algorithm complexity: 1-3
   Data structure complexity: 1-3
   Problem complexity: 2-4
   Style: mixed (LeetCode and real-world)
   Languages: JavaScript and Python
   Parts: 1-3 (max 3)
   Surprise Me: enabled (topic hidden, style hidden, part count hidden)
   Time range: 20-45 minutes
   ```
   Ask: "Does this look right? Type yes to save, or describe what you'd like to change."

4. **Handle change requests.** If the user requests changes, return to only the relevant section(s) in step 2 and repeat. Do not restart the entire conversation. After changes, display the updated summary again and re-confirm.

5. **Write the file.** Once the user explicitly confirms, write `config.json` to the repo root. Use `.agents/templates/config-template.json` as the structural base. Set `createdAt` to the current ISO 8601 timestamp if this is a new file. Set `updatedAt` to the current ISO 8601 timestamp always.

6. **Confirm to the user:** "config.json has been saved. You can re-run /setup-config at any time to update your preferences. Run /generate-problem to create your first problem."

## Constraints

1. Never write `config.json` without explicit user confirmation of the full configuration summary.
2. Never set `maxPartsGlobal` above 6. If the user requests higher, explain: "The maximum supported value is 6. Problems with more than 6 parts tend to be too long for timed practice sessions."
3. `parts.countRange[1]` must never exceed `maxPartsGlobal`. If the user sets a range upper bound higher than their maxPartsGlobal, silently cap it and inform them.
4. Topics must be real CS/programming concepts. Do not accept arbitrary strings without confirming with the user.
5. Always set `createdAt` (on new file creation only) and `updatedAt` as ISO 8601 timestamps.
6. Parse all user input as natural language. Never ask the user to type JSON, arrays, or config syntax.

## Output

- One file written: `config.json` at the repo root.
- Confirmation message shown to the user after writing.
