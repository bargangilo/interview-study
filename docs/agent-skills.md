# Agent Skills Reference

## Overview

The agent skills system extends the interview study tool with AI-powered problem generation, hints, and solution review. Skills are instruction documents that any AI coding agent can execute — they read configuration and problem data from the filesystem, generate new problems and test suites, and provide feedback on solutions. The skills system is completely separate from the CLI: the CLI reads problem files that skills write, but it never calls an API, requires a key, or invokes an agent at runtime.

To use skills, you need an AI coding agent with read/write access to this repository's files. Any agent that can read markdown, write JSON, and execute shell commands will work — Claude Code, Cursor, GitHub Copilot Chat, Aider, or similar tools. The skills are agent-agnostic by design: each skill file contains complete, step-by-step instructions that any capable agent can follow.

## Prerequisites

Before using any skill:

- **`config.json` must exist** at the repo root. Create it by running `/setup-config`. This file is gitignored — each user has their own.
- **An AI coding agent** with file access to the repo (read and write). The agent must be able to read files from `.agents/context/`, `.agents/templates/`, `problems/`, and `workspace/`.
- **Node.js** available in the environment (required for the randomization scripts in `.agents/scripts/`).
- Verify your agent can access `.agents/context/` files before running skills — some agents restrict file access to certain directories.

## Agent-Agnostic Invocation

### Claude Code

Skills are registered as native Claude Code slash commands. Invoke any skill by typing:

```
/generate-problem
/setup-config
/review-solution
/hint
```

Claude Code reads skills from `.claude/skills/<name>/SKILL.md` automatically. No additional setup or path reference is needed — the slash commands are available as soon as you open the repo as your working directory.

### Cursor

In Cursor's chat interface, reference the skill file explicitly:

```
@.claude/skills/generate-problem/SKILL.md Please execute this skill.
```

Cursor indexes the repo for file access. If the agent does not pick up the skill file automatically, paste the file path and ask it to read and follow the instructions. Cursor's Composer mode works well for multi-step skills like `/generate-problem` where files need to be written.

### GitHub Copilot Chat

Copilot Chat does not natively support slash command skill files. Reference the skill file in your message:

```
Read the file .claude/skills/generate-problem/SKILL.md and execute the instructions in it.
```

If Copilot cannot access the file directly, open the skill file in your editor first so it appears in the context window, then ask Copilot to follow the instructions.

### Aider

Pass the skill file as context when starting Aider, or add it during a session:

```bash
aider --read .claude/skills/generate-problem/SKILL.md
```

Or during a session:

```
/read .claude/skills/generate-problem/SKILL.md
```

Then ask: "Execute the skill described in generate-problem.md." Aider has full file access to the repo by default.

### Generic Fallback

For any agent not listed above:

1. Open `.claude/skills/<skill-name>/SKILL.md` and copy its full contents.
2. Paste the contents into the agent's context window or chat.
3. Tell the agent: "Follow these instructions step by step. The working directory is the root of this repository."
4. Ensure the agent has file read/write access to the repo. If it cannot read `.agents/context/` files, paste the relevant context documents into the conversation as well.

## Initial Setup

1. **Clone the repo and install dependencies:**
   ```bash
   corepack enable
   git clone <repo-url> && cd interview-study
   yarn install
   ```

2. **Verify the CLI works:**
   ```bash
   yarn start
   ```
   Navigate through the menu to confirm it launches correctly. Exit with Q or Ctrl+C.

3. **Export skills for non-Claude-Code agents (optional):**
   ```bash
   node .agents/scripts/init-skills.js
   ```
   This generates `.agents/skills/<name>.md` files from the canonical `.claude/skills/` source. You can also run this from the CLI's main menu via **Export Skills**. Claude Code users can skip this step — skills are available as native slash commands without it.

4. **Create your config:**
   Run `/setup-config` in your AI agent. This walks you through creating `config.json` — your personal preferences for topic focus, difficulty ranges, style, part counts, and timing. The file is gitignored; it stays local to your machine.

5. **Generate your first problem:**
   Run `/generate-problem`. The skill will propose a concept, ask for your approval, then generate the full problem with test suites.

## Skills Reference

### `/setup-config`

Creates or updates `config.json` through a guided conversation. Walks through each setting — topics, difficulty ranges, style preference, language, part counts, Surprise Me mode, and timing — and explains what each controls before asking for your preference. Writes the file only after you explicitly confirm the full configuration.

Use this when you first clone the repo, when you want to change your practice focus, or when you want to adjust difficulty or topic preferences.

### `/generate-problem`

Generates a complete interview problem in two phases. First, it proposes a concept — title, description, parts overview, difficulty rating, and expected time — and waits for your approval. After approval, it generates the full `problem.json` and test suites, runs a mandatory 15-item quality checklist, and writes the files to `problems/`.

If Surprise Me mode is enabled in your config, the skill uses randomized parameters (topics, style, difficulty, part count) so you do not know what to expect. The randomization seed is logged so you can reproduce a generation with the same parameters.

The generated problem is immediately available in the CLI — run `yarn start` and select it from the problem list.

### `/review-solution`

Reviews a completed or in-progress solution from your workspace. Delivers a structured five-tier analysis: correctness (with concrete failing inputs if applicable), time/space complexity, code quality, how the solution would be received in an interview, and alternative approaches with tradeoffs. If timing data is available from `session.json`, includes a comparison to the expected time.

Use this after completing a problem to get feedback, or mid-session if you want a checkpoint review.

### `/hint`

Provides a scoped hint for the current part of an active problem. You choose from three tiers:

1. **Nudge** — confirms your direction or redirects you, 1-3 sentences, no code.
2. **Structural** — describes a valid approach in plain English, one paragraph, no code.
3. **Near-solution** — pseudocode or step-by-step algorithm, maximum 8 steps.

The hint is strictly scoped to the current part. It will never reveal how many parts the problem has, what future parts contain, how many tests exist, or what edge cases are tested. This preserves the progressive revelation design of the problem system.

## Surprise Me Mode

Surprise Me mode randomizes generation parameters so you do not know the exact topic, style, or part count of a problem before you start solving it. This simulates the unpredictability of real interviews.

### Enabling Surprise Me

Run `/setup-config` and enable Surprise Me when prompted. You can also control what information is revealed when a problem session starts:

- **`revealTopicOnStart`** — if true, the topic is shown when the problem is generated. If false, you discover the topic by reading the problem description.
- **`revealStyleOnStart`** — if true, you are told whether the problem is LeetCode or real-world style. If false, you discover the style from the problem framing.
- **`revealPartCountOnStart`** — if true, you are told how many parts the problem has. If false, you discover parts progressively as you solve.

### Reproducibility

The randomization script (`node .agents/scripts/randomize-params.js`) uses a seeded PRNG. Every generation logs the seed. To reproduce the same parameters:

```bash
node .agents/scripts/randomize-params.js --seed 847291
```

You can also run the script manually to preview what parameters would be generated without actually creating a problem:

```bash
node .agents/scripts/randomize-params.js --config ./config.json
```

The output is a JSON object with `topics`, `partCount`, `style`, `difficulty`, `expectedMinutes`, and `seed`.

## Understanding Difficulty

Problems are rated on three independent dimensions, each 1-5:

- **Algorithm complexity** — how complex the algorithm is. Level 1 is simple iteration; level 3 is BFS/DFS or basic DP; level 5 is advanced algorithms like network flow.
- **Data structure complexity** — what data structures are needed. Level 1 is arrays only; level 3 adds trees and heaps; level 5 requires tries or segment trees.
- **Problem complexity** — how hard it is to understand and decompose the problem. Level 1 is obvious; level 3 requires recognizing a known pattern; level 5 requires reframing the problem entirely.

The **overall** score is a weighted composite: `round((algo × 0.3) + (ds × 0.3) + (problem × 0.4))`. Problem complexity carries the most weight because it best predicts interview performance independent of algorithm memorization.

When configuring difficulty ranges in `/setup-config`, set each dimension independently. For example, you might set algorithm complexity to 1-2 (you want to focus on problem decomposition, not algorithm recall) while setting problem complexity to 3-4.

See `.agents/context/difficulty-guide.md` for the full dimension definitions, calibration anchors, and rating guidance.

## Troubleshooting

**`config.json` not found.** Run `/setup-config` to create it. The file is gitignored and personal to each user — it is not included in the repo.

**`randomize-params.js` exits with an error.** Verify that Node.js is available (`node --version`) and that `config.json` contains valid JSON with all required fields. The error message printed to stderr describes the specific issue.

**Agent cannot access context files.** Verify that your agent has file access to the repo root and specifically to `.agents/context/`. Some agents restrict access to certain directories — check your agent's file access configuration.

**Generated problem has wrong difficulty or style.** The generation parameters come from `config.json` (or from `randomize-params.js` in Surprise Me mode). Run `/setup-config` to review and update your configuration. If using Surprise Me mode, the randomization is bounded by your configured ranges — adjust the ranges to narrow the output.

**Test names in `activeTests` do not match suite file.** This causes tests to silently not run, blocking part advancement. Every string in `activeTests` must exactly match the `test("...")` string in Jest or the function name (minus `test_` prefix, underscores for spaces) in pytest. See `.agents/context/problem-authoring-guide.md` Section 3 for the verification procedure.

**Problem not appearing in CLI after generation.** The problem directory must contain a valid `problem.json` with a non-empty `parts` array. Check that the file is valid JSON and that each part has a non-empty `activeTests` array. The CLI logs a warning on startup for directories with malformed configs.
