# Settings Reference

The settings system controls how the agent skills generate problems — which topics, how hard, what style, and how much information you see during generation. Settings have no effect on the CLI itself; they configure the AI-powered generation pipeline.

## Overview

Settings are stored in `config.json` at the repo root. This file is gitignored — each user has their own configuration. If the file does not exist, agent skills will prompt you to create it before proceeding.

The settings menu in the CLI is driven entirely by `.agents/config-schema.json`. The menu has no hardcoded knowledge of config fields — when a new option is added to the schema, it appears in the menu automatically.

Changes are saved immediately when you confirm an edit. There is no "save all" step.

## Accessing Settings

There are two ways to configure settings:

**CLI settings menu** — select Settings from the main menu. Best for quick single-field edits. Navigate by section, select a field, edit the value, and confirm. The menu shows current values and descriptions for every field.

![Settings menu navigation](../media/output/settings-menu.gif)

**`/handwritten-config` agent skill** — run this from any AI coding agent. Best for first-time setup or wholesale reconfiguration. The agent walks through every setting with explanations and recommendations, then writes the complete file at once. See [agent-skills.md](agent-skills.md) for invocation instructions across different agents.

## Settings Reference

### Topics

| Field | What it controls | Valid values | Default |
|---|---|---|---|
| `topics.include` | CS and programming concepts that appear in generated problems. The generator draws from this list. | Comma-separated topic names (e.g. `arrays, hash maps, trees`) | `arrays, hash maps, trees, dynamic programming, strings` |
| `topics.avoid` | Concepts excluded from generated problems. Any topic here is also removed from the include list automatically. | Comma-separated topic names | *(empty)* |

Good starting value for interview prep: `arrays, hash maps, strings, trees, graphs, dynamic programming, sorting, stacks, linked lists, recursion`

### Difficulty

Each dimension is rated 1-5 and configured as a range (min-max). The generator picks a value within each range.

| Field | What it controls | Range | Default |
|---|---|---|---|
| `difficulty.algorithmComplexity` | Complexity of the algorithm required. 1 = simple iteration, 2 = binary search, 3 = BFS/DFS or basic DP, 4 = Dijkstra's or 2D DP, 5 = network flow. | 1-5 | 1-3 |
| `difficulty.dataStructureComplexity` | Complexity of data structures involved. 1 = arrays/strings, 2 = hash maps/stacks/queues, 3 = trees/heaps/graphs, 4 = custom/augmented, 5 = tries/segment trees. | 1-5 | 1-3 |
| `difficulty.problemComplexity` | Difficulty of understanding and decomposing the problem. 1 = obvious, 2 = one insight, 3 = pattern recognition, 4 = chaining insights, 5 = reframing required. | 1-5 | 2-4 |

Good starting value: algo `1-3`, data structure `1-3`, problem `2-4` (focuses on decomposition over algorithm memorization).

### Style

| Field | What it controls | Valid values | Default |
|---|---|---|---|
| `style.preference` | How problems are framed. | `leetcode` (abstract algorithmic), `real-world` (domain context), `mixed` (both) | `mixed` |
| `style.allowedStyles` | Which styles the generator is allowed to use. Typically matches the preference. | `leetcode`, `real-world`, or both | `leetcode, real-world` |

### Language

| Field | What it controls | Valid values | Default |
|---|---|---|---|
| `language.preference` | Which language(s) get test suites generated. | `javascript`, `python`, `both` | `both` |

### Parts

| Field | What it controls | Valid values | Default |
|---|---|---|---|
| `parts.countRange` | Min and max number of parts a generated problem can have. More parts mean longer, multi-step problems. | 1-6 range | 1-3 |
| `parts.maxPartsGlobal` | Absolute ceiling on part count. Never exceeded regardless of other settings. | 1-6 integer | 3 |

### Surprise Me

| Field | What it controls | Valid values | Default |
|---|---|---|---|
| `surpriseMode.enabled` | When on, topics, style, difficulty, and part count are randomly selected from your configured ranges. When off, the agent asks interactively. | `true` / `false` | `true` |

### Hide Problem Details

| Field | What it controls | Valid values | Default |
|---|---|---|---|
| `hideProblemDetails.enabled` | Master switch. When off, all sub-flags are ignored and full generation details are shown. | `true` / `false` | `true` |
| `hideProblemDetails.hideTopics` | Prevents revealing which topics the problem covers. You discover the topic by reading the problem description. | `true` / `false` | `true` |
| `hideProblemDetails.hideStyle` | Prevents revealing whether the problem is LeetCode or real-world style. | `true` / `false` | `true` |
| `hideProblemDetails.hidePartCount` | Prevents revealing how many parts the problem has. You discover parts progressively. | `true` / `false` | `true` |
| `hideProblemDetails.hideWriteOutput` | Routes file writes through a background script so problem.json and test suite contents do not appear in the terminal. Prevents accidentally reading test cases before you start solving. | `true` / `false` | `true` |

### Time Range

| Field | What it controls | Valid values | Default |
|---|---|---|---|
| `expectedTimeRange` | Min and max expected solving time in minutes. Problems are assigned a time within this range based on difficulty. | 5-120 range | 20-45 |

## Surprise Me Mode

Surprise Me mode randomizes generation parameters so you do not know what topic, style, difficulty, or part count the next problem will have. This simulates the unpredictability of real interviews where you cannot prepare for a specific question type.

When enabled, the agent runs `.agents/scripts/randomize-params.js` to select parameters from your configured ranges. The randomization seed is logged so you can reproduce a generation with the same parameters if needed.

When disabled, the agent asks you interactively for each parameter before generating.

### How Surprise Me and Hide Problem Details Interact

These two features are independent and compose together in four meaningful combinations:

| Surprise Me | Hide Details | What you experience |
|---|---|---|
| on | on | Parameters are random and nothing is revealed. You start `yarn start`, pick the new problem, and discover everything as you solve. Maximum interview simulation. |
| off | on | You choose parameters interactively (topic, difficulty, style), but the generated problem's content is hidden. You control the category but not the specifics. |
| on | off | Parameters are random but you see everything during generation — the full concept proposal, difficulty ratings, and file contents. Good for reviewing what the generator produces. |
| off | off | You choose every parameter and see everything. Full transparency and control. Good for targeted practice on specific concepts. |

## `hideWriteOutput` Explained

This is the least obvious setting. When enabled, all file writes during problem generation go through `.agents/scripts/write-problem.js` instead of the agent's normal file write tools. The script writes files silently — their contents never appear in the terminal output.

Why this matters: without this flag, when the agent writes `problem.json` and test suite files, the full file contents scroll past in the terminal. This means you might see test cases, edge cases, or problem structure before you start solving. With the flag on, you see only a confirmation that files were written, not what they contain.

![Editing a settings field](../media/output/settings-edit.gif)

Editing the Topics field directly from the CLI.
