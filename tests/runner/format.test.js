import {
  formatStatusBadge,
  getMilestoneWarning,
  formatTimerSegment,
  formatGlobalStats,
  formatProblemStats,
} from "../../runner/format.js";

// Strip ANSI escape codes for content assertions
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "").replace(/\r\x1b\[K/g, "");
}

// --- Status badge ---

describe("formatStatusBadge", () => {
  test("returns empty string for null status", () => {
    expect(formatStatusBadge(null)).toBe("");
  });

  test("returns green badge for complete status", () => {
    const badge = formatStatusBadge("complete");
    const clean = stripAnsi(badge);
    expect(clean).toBe(" [complete]");
  });

  test("returns yellow badge for in progress status", () => {
    const badge = formatStatusBadge("in progress");
    const clean = stripAnsi(badge);
    expect(clean).toBe(" [in progress]");
  });

  test("returns yellow badge for part N reached status", () => {
    const badge = formatStatusBadge("part 2 reached");
    const clean = stripAnsi(badge);
    expect(clean).toBe(" [part 2 reached]");
  });
});

// --- Timer segment formatting ---

describe("formatTimerSegment", () => {
  test("shows elapsed in stopwatch mode", () => {
    const result = stripAnsi(formatTimerSegment({
      totalElapsedSeconds: 754,
      currentPartElapsedSeconds: 100,
      remaining: null,
      isOvertime: false,
      isPaused: false,
      mode: "stopwatch",
    }));
    expect(result).toContain("12:34 elapsed");
  });

  test("shows remaining in countdown mode", () => {
    const result = stripAnsi(formatTimerSegment({
      totalElapsedSeconds: 300,
      currentPartElapsedSeconds: 100,
      remaining: 1200,
      isOvertime: false,
      isPaused: false,
      mode: "countdown",
      countdownSeconds: 1500,
    }));
    expect(result).toContain("20:00 remaining");
  });

  test("shows paused state", () => {
    const result = stripAnsi(formatTimerSegment({
      totalElapsedSeconds: 600,
      currentPartElapsedSeconds: 100,
      remaining: 300,
      isOvertime: false,
      isPaused: true,
      mode: "countdown",
      countdownSeconds: 900,
    }));
    expect(result).toContain("[paused]");
  });

  test("shows overtime in countdown mode", () => {
    const result = stripAnsi(formatTimerSegment({
      totalElapsedSeconds: 1600,
      currentPartElapsedSeconds: 100,
      remaining: -100,
      isOvertime: true,
      isPaused: false,
      mode: "countdown",
      countdownSeconds: 1500,
    }));
    expect(result).toContain("overtime");
  });
});

// --- Milestone warnings ---

describe("getMilestoneWarning", () => {
  test("returns warning at 15 minutes in stopwatch mode", () => {
    const result = getMilestoneWarning(15 * 60, "stopwatch", null);
    expect(result).toContain("15 minutes");
  });

  test("returns warning at 30 minutes in stopwatch mode", () => {
    const result = getMilestoneWarning(30 * 60, "stopwatch", null);
    expect(result).toContain("30 minutes");
  });

  test("returns null before threshold", () => {
    expect(getMilestoneWarning(14 * 60, "stopwatch", null)).toBeNull();
  });

  test("returns null between thresholds", () => {
    expect(getMilestoneWarning(20 * 60, "stopwatch", null)).toBeNull();
  });

  test("returns warning at 50% remaining in countdown", () => {
    const result = getMilestoneWarning(50, "countdown", 100);
    expect(result).toContain("50%");
  });

  test("returns warning at 25% remaining in countdown", () => {
    const result = getMilestoneWarning(75, "countdown", 100);
    expect(result).toContain("25%");
  });
});

// --- Stats formatting ---

describe("formatGlobalStats", () => {
  test("formats all global stat fields", () => {
    const stats = {
      totalPracticeSeconds: 15720,
      problemsAttempted: 6,
      problemsCompleted: 4,
      averageSolveSeconds: 1694,
      bestSolveSeconds: 892,
      bestSolveProblemName: "Flatten and Sum",
      currentStreakDays: 3,
    };
    const output = stripAnsi(formatGlobalStats(stats));
    expect(output).toContain("Practice Stats");
    expect(output).toContain("6");
    expect(output).toContain("4");
    expect(output).toContain("3 days");
    expect(output).toContain("Flatten and Sum");
  });
});

describe("formatProblemStats", () => {
  test("formats per-problem stats", () => {
    const stats = {
      attempts: 3,
      completions: 2,
      bestTimeSeconds: 1114,
      averageTimeSeconds: 1391,
      lastAttemptedDate: "2026-03-04T16:00:00.000Z",
      attemptHistory: [
        { date: "2026-03-04T14:00:00.000Z", totalSeconds: 1400, completed: true, wasCountdown: true, countdownSeconds: 1800 },
        { date: "2026-03-04T16:00:00.000Z", totalSeconds: 1200, completed: true, wasCountdown: false, countdownSeconds: null },
      ],
      bestSplits: [
        { part: 1, elapsedSeconds: 600 },
        { part: 2, elapsedSeconds: 600 },
      ],
    };
    const output = stripAnsi(formatProblemStats("Flatten and Sum", stats));
    expect(output).toContain("Flatten and Sum");
    expect(output).toContain("3");
    expect(output).toContain("2");
    expect(output).toContain("Attempt History");
    expect(output).toContain("Best Part Splits");
    expect(output).toContain("Part 1");
    expect(output).toContain("Part 2");
  });
});

// --- VS Code warning format (structural) ---

describe("VS Code not-found warning format", () => {
  test("warning string contains expected text", () => {
    const warning =
      "  VS Code not found on PATH — skipping editor launch. See README for setup instructions.";
    expect(warning).toContain("VS Code not found on PATH");
    expect(warning).toContain("skipping editor launch");
    expect(warning).toContain("README");
  });
});
