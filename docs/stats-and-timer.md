# Timer & Stats System

Reference for the timer, session persistence, and stats features in `interview-study`.

## Timer Modes

### Stopwatch Mode

The default mode. Counts up from zero with no limit. The timer displays elapsed time in the summary line:

```
  Part 1 of 1 unlocked   ✔ 3 / 5 tests passing   [last run: 2:14:03 PM]  ⏱ 12:34 elapsed
```

### Countdown Mode

Set at session start by entering a number of minutes. If the problem has `expectedMinutes` in `problem.json`, that value pre-populates the prompt. The timer counts down and changes color as time runs low:

- **Green** — more than 50% remaining
- **Yellow** — 25–50% remaining
- **Red** — below 25% remaining

```
  Part 1 of 1 unlocked   ✔ 3 / 5 tests passing   [last run: 2:14:03 PM]  ⏱ 18:22 remaining
```

When the countdown expires, the timer continues in overtime:

```
  ⏱ Time's up — keep going or press Q to return to the menu
  Part 1 of 1 unlocked   ✔ 3 / 5 tests passing   [last run: 2:14:03 PM]  ⏱ +02:14 overtime
```

## Pause Behavior

Press **P** during a session to pause the timer. Press **P** again to resume.

- Paused time is tracked separately and excluded from all elapsed calculations
- The summary line shows `[paused]` while paused
- File saves still trigger test runs while paused — only the timer stops
- `totalPausedSeconds` is persisted in `session.json` and restored on resume

## Session Persistence

### `session.json` Schema

Written to `workspace/<name>/session.json`.

```json
{
  "lastStarted": "2026-03-04T14:22:00.000Z",
  "totalElapsedSeconds": 847,
  "currentPartElapsedSeconds": 312,
  "isPaused": false,
  "pausedAt": null,
  "totalPausedSeconds": 0,
  "mode": "countdown",
  "countdownSeconds": 1500,
  "completed": false,
  "currentPart": 1,
  "splits": [
    {
      "part": 1,
      "elapsedSeconds": 535,
      "completedAt": "2026-03-04T14:30:55.000Z"
    }
  ],
  "attempts": [
    {
      "date": "2026-03-04T14:22:00.000Z",
      "totalSeconds": 847,
      "splits": [{"part": 1, "elapsedSeconds": 535, "completedAt": "2026-03-04T14:30:55.000Z"}],
      "completed": false,
      "wasCountdown": true,
      "countdownSeconds": 1500
    }
  ]
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `lastStarted` | ISO string | When the current/most recent session started |
| `totalElapsedSeconds` | number | Cumulative elapsed time excluding paused time |
| `currentPartElapsedSeconds` | number | Elapsed since current part began |
| `isPaused` | boolean | Whether the timer is currently paused |
| `pausedAt` | ISO string or null | When the current pause began |
| `totalPausedSeconds` | number | Cumulative paused time |
| `mode` | string | `"stopwatch"` or `"countdown"` |
| `countdownSeconds` | number or null | Total countdown budget in seconds |
| `completed` | boolean | Whether all parts were completed |
| `currentPart` | number | 0-indexed current part |
| `splits` | array | Per-part completion records |
| `attempts` | array | Historical attempt records |

### Write Strategy

- **Every timer tick (1s):** Async write updating timer fields only (`totalElapsedSeconds`, `currentPartElapsedSeconds`, `totalPausedSeconds`, `isPaused`, `pausedAt`). Non-blocking — skipped if a write is already pending.
- **Part progression:** Updates `currentPart` and appends to `splits`.
- **Session end (Q, completion, or SIGINT):** Sync write appending the current attempt to `attempts` and finalizing all fields.

### Resume Behavior

On "Resume where you left off", the CLI reads `session.json` and restores:
- Timer elapsed time (`totalElapsedSeconds`, `currentPartElapsedSeconds`, `totalPausedSeconds`)
- Timer mode and countdown budget
- Current part (inferred from file delimiters, not from session.json)

## Stats Computation

### Global Stats

Computed by `computeGlobalStats()` in `runner/stats.js`:

- **Total practice time** — sum of `totalSeconds` across all attempts in all sessions
- **Problems attempted** — count of problems with any session.json
- **Problems completed** — count of problems with at least one completed attempt
- **Average solve time** — mean of `totalSeconds` for completed attempts only; null if none
- **Best solve time** — minimum `totalSeconds` among completed attempts; null if none
- **Current streak** — consecutive calendar days (local time) ending today or yesterday with any attempt

### Per-Problem Stats

Computed by `computeProblemStats()`:

- **Attempts** — total count in the attempts array
- **Completions** — count of attempts with `completed: true`
- **Best time** — shortest completed attempt
- **Average time** — mean of completed attempt times
- **Last attempted** — date of most recent attempt
- **Attempt history** — chronological list with date, time, completion status, and countdown info
- **Best splits** — per-part split times from the fastest completed attempt

### Streak Calculation

A streak is the number of consecutive calendar days (local time) ending today or yesterday that have at least one attempt across any problem. A day with only abandoned sessions still counts. If neither today nor yesterday has an attempt, the streak is 0.

## Milestone Warnings

Printed as a separate line below the summary when triggered:

### Stopwatch Mode

Fires at exactly 15, 30, and 45 minutes elapsed. Each fires once per session.

### Countdown Mode

Fires when 50% and 25% of time remain. Each fires once per session.

The overtime notice (`⏱ Time's up — keep going or press Q to return to the menu`) fires once when the countdown reaches zero.

## `expectedMinutes` Field

An optional field in `problem.json` that pre-populates the countdown prompt:

```json
{
  "title": "Flatten and Sum",
  "expectedMinutes": 25,
  "parts": [...]
}
```

When present, the countdown prompt shows the suggested time and defaults to it. The user can accept, modify, or clear the value for stopwatch mode. This field is informational only — it does not enforce a time limit.

Problem authors should set `expectedMinutes` to a reasonable total time across all parts for a first successful attempt.
