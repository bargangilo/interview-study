# Difficulty Guide

This document defines the difficulty rating system for interview problems. Use it as a lookup reference when assigning difficulty values to `problem.json`. Every generated problem must have its difficulty object verified against the dimension definitions and calibration anchors in this document.

## Section 1: Dimension Definitions

### `algorithmComplexity`

Rates the inherent complexity of the algorithm required for a correct solution.

| Level | Definition | Example | Boundary with Level Below |
|---|---|---|---|
| 1 | Solution requires only sequential iteration, basic conditionals, or simple accumulation. No named algorithm pattern. | Sum all elements in an array. | N/A (lowest level). |
| 2 | Solution requires a single well-known technique applied in a straightforward way: sorting, binary search on a sorted array, basic hash map lookup, two-pointer scan. | Find if a sorted array contains a target value (binary search). | Level 1 uses no named technique; level 2 uses exactly one, applied directly. |
| 3 | Solution requires combining two techniques, or applying one technique in a non-obvious way. Includes: BFS/DFS on explicit graphs, basic dynamic programming with a 1D table, merge/partition strategies. | Find the shortest path in an unweighted graph (BFS). | Level 2 applies a technique directly to the input; level 3 requires constructing an intermediate representation or combining steps. |
| 4 | Solution requires a specialized algorithm with non-trivial correctness reasoning: topological sort, Dijkstra's algorithm, 2D dynamic programming, divide-and-conquer with complex merge, backtracking with pruning. | Find the minimum cost path in a weighted grid (2D DP). | Level 3 applies standard graph/DP; level 4 requires careful state definition or correctness argument. |
| 5 | Solution requires an advanced algorithm that most developers cannot derive from scratch: network flow, suffix arrays, advanced graph algorithms (Tarjan's, Edmonds-Karp), DP with bitmask states, computational geometry. | Find all strongly connected components (Tarjan's algorithm). | Level 4 uses complex but derivable algorithms; level 5 requires knowledge of specific named algorithms that are rarely reinvented. |

### `dataStructureComplexity`

Rates the complexity of the data structures the solution must use or build.

| Level | Definition | Example | Boundary with Level Below |
|---|---|---|---|
| 1 | Solution uses only arrays, strings, or primitive variables. No auxiliary data structures. | Reverse a string in place. | N/A (lowest level). |
| 2 | Solution uses one standard auxiliary data structure: hash map/set, stack, queue, or fixed-size array as a lookup table. | Check for balanced parentheses (stack). | Level 1 uses no auxiliary structures; level 2 uses one standard library structure. |
| 3 | Solution uses trees, heaps, linked lists, or graphs represented as adjacency lists. Alternatively, uses two or more level-2 structures in coordination. | Find the kth largest element (min-heap). | Level 2 uses one simple structure; level 3 uses a hierarchical or multi-structure approach. |
| 4 | Solution requires building a custom data structure, or uses an advanced standard structure: balanced BST with augmentation, union-find with path compression, monotonic stack/deque with specific invariants. | Detect cycles in a directed graph using union-find with rank. | Level 3 uses standard library structures; level 4 requires custom construction or augmentation. |
| 5 | Solution requires a specialized data structure that is not commonly available in standard libraries: trie, segment tree, Fenwick tree, suffix array, persistent data structure, LRU cache with O(1) operations. | Implement an autocomplete system (trie with frequency ranking). | Level 4 augments standard structures; level 5 requires building a structure from scratch that has non-trivial invariants. |

### `problemComplexity`

Rates how difficult it is to understand what the problem is asking and decompose it into solvable steps. This dimension is independent of algorithm and data structure knowledge.

| Level | Definition | Example | Boundary with Level Below |
|---|---|---|---|
| 1 | The problem statement directly specifies the operation. No decomposition needed. The mapping from problem to code is obvious. | "Return the sum of all elements in the array." | N/A (lowest level). |
| 2 | The problem requires one non-trivial insight or decomposition step, but once identified, the implementation path is clear. | "Find two numbers that add to a target" — insight: iterate and check complement. | Level 1 requires no insight; level 2 requires one conceptual step. |
| 3 | The problem requires understanding a constraint that restricts the solution space in a non-obvious way, or requires recognizing that the problem maps to a known problem class. | "Find the longest substring without repeating characters" — must recognize the sliding window framing. | Level 2 requires one insight; level 3 requires recognizing a structural pattern. |
| 4 | The problem requires multi-step decomposition where the steps are not independent — each step's approach depends on decisions made in earlier steps. Or the problem has subtle correctness traps that are easy to miss. | "Given a set of intervals, find the minimum number of meeting rooms required" — must decompose into event sorting, then realize this maps to a sweep-line problem. | Level 3 requires one structural recognition; level 4 requires chaining multiple dependent insights. |
| 5 | The problem requires a fundamental reframing — the solution involves modeling the problem in a way that is not suggested by the problem statement. Multiple valid but incorrect approaches exist that seem plausible. | "Given a grid where each cell has a cost, find the minimum cost to change cells so there is a path from top-left to bottom-right" — must reframe as a shortest-path problem on an implicit graph. | Level 4 chains dependent insights; level 5 requires abandoning the obvious model entirely. |

---

## Section 2: Overall Score Computation

### Formula

```
overall = round((algorithmComplexity × 0.3) + (dataStructureComplexity × 0.3) + (problemComplexity × 0.4))
```

Standard rounding: 0.5 rounds up.

### Weight Rationale

`problemComplexity` carries the highest weight (0.4) because it most directly predicts interview performance independent of algorithm memorization. A candidate who understands the problem deeply but uses a suboptimal algorithm will generally outperform a candidate who memorizes algorithms but cannot decompose the problem. `algorithmComplexity` and `dataStructureComplexity` are weighted equally (0.3 each) because they represent independent dimensions of implementation skill.

### Worked Examples

**Example 1: Two Sum (easy)**

| Dimension | Value | Reasoning |
|---|---|---|
| `algorithmComplexity` | 1 | Brute force: nested iteration. Optimized: single-pass hash lookup. Neither is a named algorithm. |
| `dataStructureComplexity` | 2 | Optimal solution uses a hash map. |
| `problemComplexity` | 1 | Problem statement directly specifies the operation. |
| **overall** | **round((1×0.3) + (2×0.3) + (1×0.4)) = round(1.3) = 1** | |

**Example 2: Longest Substring Without Repeating Characters (medium)**

| Dimension | Value | Reasoning |
|---|---|---|
| `algorithmComplexity` | 3 | Sliding window with dynamic boundaries — a non-trivial application of a known technique. |
| `dataStructureComplexity` | 2 | Uses a hash set or hash map. |
| `problemComplexity` | 3 | Requires recognizing the sliding window framing from the constraint "without repeating." |
| **overall** | **round((3×0.3) + (2×0.3) + (3×0.4)) = round(2.7) = 3** | |

**Example 3: Minimum Window Substring (hard)**

| Dimension | Value | Reasoning |
|---|---|---|
| `algorithmComplexity` | 4 | Sliding window with two-pointer and character frequency tracking — requires careful shrink logic. |
| `dataStructureComplexity` | 2 | Uses hash maps for frequency counting. |
| `problemComplexity` | 4 | Must chain: identify sliding window applicability, define the "valid" condition, design the shrink step, handle the "minimum" tracking. |
| **overall** | **round((4×0.3) + (2×0.3) + (4×0.4)) = round(3.4) = 3** | |

---

## Section 3: Calibration Problems

These five problems serve as difficulty anchors. When rating a new problem, compare it against the most similar anchor to ensure consistency.

### Anchor 1: Reverse a String (Overall 1)

```json
{
  "algorithmComplexity": 1,
  "dataStructureComplexity": 1,
  "problemComplexity": 1,
  "overall": 1
}
```

`algorithmComplexity` 1 — the solution is a single forward or backward pass; no named technique. `dataStructureComplexity` 1 — uses only the input string/array; no auxiliary structures needed (in-place swap or simple concatenation). `problemComplexity` 1 — the problem statement is the algorithm; there is nothing to decompose.

### Anchor 2: Valid Parentheses (Overall 2)

```json
{
  "algorithmComplexity": 1,
  "dataStructureComplexity": 2,
  "problemComplexity": 2,
  "overall": 2
}
```

`algorithmComplexity` 1 — single linear pass through the string. `dataStructureComplexity` 2 — requires a stack to track unmatched opening brackets. `problemComplexity` 2 — requires the insight that matching works LIFO, which motivates the stack choice; once that insight lands, the implementation is direct.

### Anchor 3: Course Schedule / Topological Sort (Overall 3)

```json
{
  "algorithmComplexity": 3,
  "dataStructureComplexity": 3,
  "problemComplexity": 3,
  "overall": 3
}
```

`algorithmComplexity` 3 — BFS/DFS on a directed graph to detect cycles and produce an ordering. `dataStructureComplexity` 3 — requires an adjacency list representation, in-degree tracking, and a queue or recursion stack. `problemComplexity` 3 — requires recognizing that course prerequisites form a directed graph and that the question reduces to topological sort / cycle detection.

### Anchor 4: Word Ladder (Overall 4)

```json
{
  "algorithmComplexity": 4,
  "dataStructureComplexity": 3,
  "problemComplexity": 4,
  "overall": 4
}
```

`algorithmComplexity` 4 — BFS through an implicit graph where edges are single-character transformations; requires efficient neighbor generation to avoid TLE. `dataStructureComplexity` 3 — uses a queue, hash set for visited words, and the word list as an implicit adjacency structure. `problemComplexity` 4 — requires reframing string transformation as graph traversal, defining the implicit graph's edges, and handling the "shortest" constraint (BFS guarantees this, but recognizing that BFS applies is the insight).

### Anchor 5: Longest Increasing Subsequence with Binary Search (Overall 4)

```json
{
  "algorithmComplexity": 4,
  "dataStructureComplexity": 2,
  "problemComplexity": 5,
  "overall": 4
}
```

`algorithmComplexity` 4 — the O(n log n) solution uses patience sorting / binary search on a tails array, which is a specialized technique. `dataStructureComplexity` 2 — only uses an auxiliary array (the tails array); no complex structures. `problemComplexity` 5 — the DP formulation is approachable but the optimization to O(n log n) requires the non-obvious insight that maintaining a tails array and using binary search preserves the LIS invariant. Multiple incorrect greedy approaches seem plausible.

---

## Section 4: Style and Difficulty Interaction

### Real-World Translation Cost

Real-world style problems require the solver to translate a domain narrative into a computational model before applying an algorithm. This translation step adds genuine cognitive load that is not captured by `algorithmComplexity` or `dataStructureComplexity`.

Guidance: when generating a real-world style problem, evaluate `problemComplexity` as if the problem were presented in LeetCode style, then consider adding 1 to `problemComplexity` if the domain translation is non-trivial. The translation is non-trivial when the domain concepts do not have an obvious one-to-one mapping to data structures — for example, "delivery routes" mapping to "weighted graph shortest path" requires more translation than "find the two items that add to a budget" mapping to Two Sum.

### Example: Same Problem, Two Styles

**Underlying problem:** Given a list of events with start and end times, find the maximum number of overlapping events at any point.

**LeetCode framing:** `"Given an array of intervals [[start, end], ...], return the maximum number of overlapping intervals."` — `problemComplexity` 3 (requires recognizing the sweep-line pattern).

**Real-world framing:** `"A conference center has one main hall. Given a list of talks with their scheduled start and end times, determine the minimum number of overflow rooms needed so no two talks in the same room overlap."` — `problemComplexity` 4 (same sweep-line pattern, but the solver must first translate "minimum overflow rooms" to "maximum concurrent overlap minus one," which is an additional decomposition step).

### `expectedMinutes` by Difficulty

Use this table as a starting point. Real-world style problems and high `problemComplexity` warrant the upper end of the range.

| `overall` | `expectedMinutes` Range | Notes |
|---|---|---|
| 1 | 10–20 | Single-function, straightforward. |
| 2 | 15–25 | One key insight or technique. |
| 3 | 25–40 | Multiple techniques or non-obvious decomposition. |
| 4 | 35–50 | Complex chaining, real interview-level difficulty. |
| 5 | 45–60 | Expert-level; may not be solvable within time limit. |

Multi-part problems should use the upper end of the range for their `overall` difficulty because part transitions add context-switching overhead.

---

## Section 5: Common Calibration Mistakes

### Mistake 1: Overrating `algorithmComplexity` for Non-Obvious Applications

**Error:** Rating `algorithmComplexity` 4 because the problem uses BFS in a surprising context (e.g., finding shortest transformation sequence between words).

**Correction:** BFS itself is a level 3 algorithm. The surprise of applying it to strings is `problemComplexity`, not `algorithmComplexity`. Rate `algorithmComplexity` based on the algorithm's inherent complexity, and `problemComplexity` based on the difficulty of recognizing which algorithm applies.

### Mistake 2: Conflating Implementation Length with Difficulty

**Error:** Rating a problem highly because the correct solution is 50+ lines of code.

**Correction:** A verbose but mechanical implementation (e.g., handling many input format cases) is not high difficulty — it is high tedium. Difficulty measures the cognitive challenge of figuring out what to do, not how long it takes to type it. A 10-line solution requiring a key insight is harder than a 50-line solution that is obvious once the problem is read.

### Mistake 3: Rating `dataStructureComplexity` on Optimal Solution

**Error:** Rating `dataStructureComplexity` 3 because the optimal solution uses a heap, even though a sorted array solution with worse time complexity is fully acceptable.

**Correction:** Rate `dataStructureComplexity` based on what the problem implicitly requires — the simplest data structure that produces a correct solution within reasonable time limits. If a hash map works and a heap is merely optimal, rate on the hash map (level 2). If the problem's constraints make the heap necessary (e.g., the input is a stream and you cannot sort it), then rate on the heap (level 3).

### Mistake 4: Underrating Multi-Part Interdependence

**Error:** Rating `problemComplexity` 2 for a two-part problem where each part individually is simple.

**Correction:** If Part 2 requires restructuring Part 1's implementation — not just adding a new function — the interdependence adds decomposition difficulty. The user must think ahead (or refactor) when Part 2 reveals that Part 1's approach was a dead end. Rate `problemComplexity` based on the overall problem arc, not each part in isolation.

### Mistake 5: Setting `overall` Manually

**Error:** Eyeballing the `overall` score as "feels like a 3" without computing it.

**Correction:** Always compute `overall` from the formula. If the computed result feels wrong, re-examine the individual dimensions — one of them is likely misrated. Adjusting `overall` directly masks the error and makes future calibration harder. The formula exists to enforce consistency; bypassing it defeats the purpose.
