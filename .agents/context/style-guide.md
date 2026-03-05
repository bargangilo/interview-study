# Style Guide

This document defines the two problem styles — LeetCode and real-world — and provides the criteria for writing authentically in each. Use it when generating problems to ensure the chosen style is applied consistently and meaningfully.

## Section 1: LeetCode Style — Definition and Characteristics

LeetCode style presents problems as abstract computational tasks. The problem statement centers on a function signature, inputs are described as data types, constraints are numerical, and there is no narrative framing. The solver reads the problem and immediately thinks about algorithms and data structures — there is no domain to translate from.

### Defining Characteristics Checklist

Verify all of the following before marking a problem as `"style": "leetcode"`:

- [ ] **No narrative framing.** The problem does not tell a story or describe a real-world scenario. It begins with "Given an array..." or "Implement a function that..." or a direct description of the operation.
- [ ] **Abstract variable names.** Parameters use conventional names: `nums`, `arr`, `s`, `target`, `k`, `n`, `root`, `head`, `matrix`, `grid`. Not domain-specific names like `prices`, `schedule`, `employees`.
- [ ] **Function-signature-centric statement.** The problem is defined in terms of what the function receives and returns. The first sentence typically names the function and its parameters.
- [ ] **Numerical constraints.** Constraints are stated as raw bounds: "where 1 ≤ nums.length ≤ 10⁴" or "0 ≤ target ≤ 10⁹". Not as domain implications like "the store has at most 10,000 products."
- [ ] **Raw-value examples.** Examples use plain arrays, numbers, and strings: `Input: nums = [2, 7, 11, 15], target = 9`. Not domain objects like `Input: products = [{name: "Widget", price: 7}, ...]`.
- [ ] **Consistent abstract style across all parts.** Every part uses the same abstract framing. No part introduces a narrative.

---

## Section 2: Real-World Style — Definition and Characteristics

Real-world style presents problems within a domain context. The key principle: **the domain context must be meaningful to the problem shape**, not merely decorative.

A meaningful domain context means:

- The problem's constraints arise naturally from the domain. An inventory system naturally has quantity limits and stock levels. A session manager naturally has expiry times and concurrent user caps. These constraints are not imposed artificially — they are inherent to the domain.
- Domain-appropriate naming is used throughout — function names, parameter names, variable names in scaffolds, and test descriptions all use the domain's vocabulary.
- The examples use realistic domain values. A scheduling problem uses realistic time ranges, not arbitrary integers.
- Understanding the domain helps the solver understand the problem. A solver who has worked with caches will more quickly grasp a cache eviction problem than one presented abstractly.

A **non-meaningful** domain context — one where the domain could be swapped for any other without changing the problem — is LeetCode with a costume. Wrapping "find two numbers that sum to target" in a story about a shopkeeper does not make it real-world style; the shopping narrative adds no structural insight.

### Defining Characteristics Checklist

Verify all of the following before marking a problem as `"style": "real-world"`:

- [ ] **Narrative framing that motivates the problem.** The problem describes a scenario where the computation is needed. The framing explains why someone would want this function.
- [ ] **Domain-appropriate function and variable names.** Functions are named after what they do in the domain: `checkAvailability`, `processOrder`, `calculateShippingCost`. Not `solve`, `process`, `compute`.
- [ ] **Constraints that arise naturally from the domain.** Limits feel like real system constraints: "a warehouse holds at most 10,000 SKUs" rather than "the array has at most 10,000 elements."
- [ ] **Examples that use realistic domain values.** Test inputs use plausible data: product names, timestamps in reasonable ranges, realistic quantities.
- [ ] **Domain swapping would change the problem.** If you replace the domain with a completely different one, at least some constraints, naming, or structural decisions would need to change. If everything transfers unchanged, the domain is decorative.
- [ ] **Consistent real-world style across all parts.** Every part maintains the domain framing. No part drops into abstract LeetCode vocabulary.

---

## Section 3: Side-by-Side Examples

### Underlying Problem

Given a list of time intervals, merge all overlapping intervals and return the resulting non-overlapping intervals sorted by start time.

### LeetCode Version

**Title:** `"Merge Intervals"`

**Description:** `"Merge overlapping intervals in a sorted list"`

**Part 1 description:** `"Implement mergeIntervals(intervals) / merge_intervals(intervals) that takes an array of [start, end] pairs and returns a new array where all overlapping intervals have been merged. Two intervals overlap if one starts before or when the other ends."`

**Part 1 JS scaffold:**

```js
/**
 * Merge overlapping intervals.
 *
 * @param {number[][]} intervals - Array of [start, end] pairs
 * @returns {number[][]} Merged non-overlapping intervals, sorted by start
 */
function mergeIntervals(intervals) {
  // TODO: implement
}

module.exports = { mergeIntervals };
```

**Part 1 Python scaffold:**

```python
"""
Merge overlapping intervals.
"""


def merge_intervals(intervals: list[list[int]]) -> list[list[int]]:
    pass
```

**Annotations:**
- Title names the operation directly — no narrative (`"Merge Intervals"`, not `"Conference Room Booking"`)
- Parameters use abstract names: `intervals`, not `meetings` or `bookings`
- Description uses data type vocabulary: "array of [start, end] pairs"
- No motivation for why someone would want to merge intervals

### Real-World Version

**Title:** `"Booking Consolidation"`

**Description:** `"Merge overlapping room bookings into consolidated time blocks"`

**Part 1 description:** `"A co-working space tracks room bookings as [startHour, endHour] pairs using 24-hour time. When bookings overlap or are adjacent, they should be consolidated into a single block for the daily schedule display. Implement consolidateBookings(bookings) / consolidate_bookings(bookings) that takes a list of booking pairs and returns the consolidated schedule sorted by start time."`

**Part 1 JS scaffold:**

```js
/**
 * Consolidate overlapping room bookings into continuous time blocks.
 *
 * @param {number[][]} bookings - Array of [startHour, endHour] pairs (24-hour time)
 * @returns {number[][]} Consolidated non-overlapping booking blocks, sorted by start
 */
function consolidateBookings(bookings) {
  // TODO: implement
}

module.exports = { consolidateBookings };
```

**Part 1 Python scaffold:**

```python
"""
Consolidate overlapping room bookings into continuous time blocks.

Bookings are [start_hour, end_hour] pairs using 24-hour time.
"""


def consolidate_bookings(bookings: list[list[int]]) -> list[list[int]]:
    pass
```

**Annotations:**
- Title uses domain language: `"Booking Consolidation"` instead of `"Merge Intervals"`
- Function named `consolidateBookings` — domain action, not abstract operation
- Parameters named `bookings`, not `intervals`
- Description explains the motivation: "for the daily schedule display"
- The "adjacent bookings should merge" constraint arises naturally from scheduling — back-to-back bookings look like one block on a display
- Constraints are implicit in the domain: 24-hour time means values are 0–24, which is a natural bound the solver understands without being told "where 0 ≤ start < end ≤ 24"

### Comparison

The real-world version is genuinely real-world because:

1. **The domain constrains the data.** 24-hour time limits the value range naturally. Bookings being time-ordered by convention motivates sorting.
2. **The "adjacent" merge rule feels natural.** In a booking system, a 9-10 block followed by a 10-11 block should display as 9-11. In the abstract version, whether `[1,2]` and `[2,3]` merge requires an explicit rule.
3. **The domain context aids understanding.** A developer who has built scheduling UIs will immediately grasp what "consolidation" means and why it matters.
4. **Swapping the domain would change decisions.** If this were inventory batches instead of bookings, the "adjacent" rule would not apply — two batches at quantities 5 and 5 are not "adjacent" in a meaningful way. The domain is structural, not decorative.

---

## Section 4: Mixed Style Guidance

### Natural Style Affinities

Some problem concepts have a natural affinity for one style. Forcing the unnatural style adds friction without benefit.

**Naturally LeetCode:**
- Purely mathematical transformations: sorting algorithms, number theory, combinatorics
- Abstract sequence operations: longest subsequence, subarray sums, string matching
- Problems defined entirely by numerical constraints: "find k elements that minimize X"

**Naturally real-world:**
- Stateful systems: caches, session managers, rate limiters, queues with priority
- Resource management: scheduling, allocation, load balancing, inventory
- Data pipeline operations: log parsing, event stream processing, aggregation

**Either style works:**
- Graph traversal — abstract ("find shortest path in a graph") or real-world ("find shortest delivery route between warehouses")
- Tree operations — abstract ("find lowest common ancestor") or real-world ("find the most specific shared category for two products")
- String processing — abstract ("find longest palindromic substring") or real-world ("detect the longest mirrored section in a DNA sequence")

### Handling Style Mismatch

When `style.preference` in `config.json` is `"mixed"`, the problem generation process may sample a style that does not fit the problem concept. In this case:

1. Attempt the sampled style first. Determine whether a meaningful domain context exists (for real-world) or whether the problem can be cleanly abstracted (for LeetCode).
2. If the sampled style genuinely does not fit — the domain would be decorative, or the abstraction would lose important structural meaning — override the sampled style.
3. Document the override in the generation output: state the sampled style, the chosen style, and a one-sentence justification.

The goal is authentic problems, not random style assignment. An unconvincing real-world problem is worse than an honest LeetCode problem.

---

## Section 5: Common Mistakes

### Mistake 1: The Thin Narrative

**Error:** Adding a single story sentence while keeping all variable names abstract.

Example: `"You are a shopkeeper. Given an array of prices nums and an integer budget target, return the indices of two items that cost exactly budget."` — This is LeetCode with a costume. The parameter is still `nums`, the operation is still Two Sum, and the shopkeeper adds nothing.

**Correction:** If using real-world style, commit to it throughout: function names, parameter names, test names, and examples must all use domain vocabulary. `findItemPair(catalog, budget)` with test names like `"two items totaling budget"` and examples using product data.

### Mistake 2: The Irrelevant Domain

**Error:** Choosing a domain that has no structural bearing on the problem.

Example: A graph shortest-path problem framed as "a librarian organizing books by genre." Libraries do not have shortest-path structures — the domain is decorative noise. The solver must ignore the narrative to understand the actual problem.

**Correction:** Choose a domain where the graph structure is inherent. Delivery routes, social networks, dependency chains — these have natural graph semantics that aid understanding.

### Mistake 3: The Jargon Overload

**Error:** Using so much domain-specific vocabulary that the computational task is obscured.

Example: `"Implement a FIFO-based multi-tenant SLA-compliant request queue with configurable TTL and priority-weighted fair scheduling across ingress shards."` — The solver spends more time parsing the description than thinking about the algorithm.

**Correction:** Use enough domain language to set context, then describe the computational task clearly. Domain terms should clarify, not obscure. If a term is not commonly known, define it in the description.

### Mistake 4: The Forced LeetCode

**Error:** Writing a genuinely stateful systems problem in abstract function-signature style, losing the naturalness of the domain.

Example: A cache eviction problem written as `"Given an array of access events and an integer capacity, return the state of the cache after processing all events."` — This strips away the statefulness and makes the problem harder to understand, not easier.

**Correction:** Stateful systems are naturally real-world. Let the solver build an object or closure that maintains state across calls. `createCache(capacity)` returning a `get`/`put` interface is more natural and more instructive than a single function processing an event array.

### Mistake 5: Style Inconsistency Across Parts

**Error:** Part 1 uses real-world framing with domain names, but Part 2 drops into abstract vocabulary: `"Optimize the function to handle arrays up to 10⁶ elements."` This breaks the immersion and confuses the solver about whether they should use domain thinking or abstract thinking.

**Correction:** Maintain consistent style across all parts. Part 2 in real-world style: `"The warehouse now stocks up to 1 million SKUs. Ensure your lookup handles this volume efficiently."` The constraint is the same, but it is expressed in domain terms.
