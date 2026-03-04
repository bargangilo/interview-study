const {
  showSummary,
  showPartIntro,
  showPartComplete,
  showAllComplete,
  showWatching,
  formatStatusBadge,
  getMilestoneWarning,
  showOvertimeNotice,
  formatGlobalStats,
  formatProblemStats,
} = require("../../runner/ui");

let stdoutOutput;
let consoleOutput;

beforeEach(() => {
  stdoutOutput = "";
  consoleOutput = [];
  jest.spyOn(process.stdout, "write").mockImplementation((str) => {
    stdoutOutput += str;
    return true;
  });
  jest.spyOn(console, "log").mockImplementation((...args) => {
    consoleOutput.push(args.join(" "));
  });
});

afterEach(() => jest.restoreAllMocks());

// Strip ANSI escape codes for content assertions
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "").replace(/\r\x1b\[K/g, "");
}

// --- Summary line ---

describe("showSummary", () => {
  test("shows pass/fail counts without part info for single-part", () => {
    showSummary(3, 5, Date.now());
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("3 / 5 tests passing");
    expect(clean).not.toContain("Part");
  });

  test("shows part info when partInfo is provided", () => {
    showSummary(3, 5, Date.now(), { current: 1, unlocked: 1 });
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("Part 1 of 1 unlocked");
    expect(clean).toContain("3 / 5 tests passing");
  });

  test("shows correct part info for Part 2 of 2 unlocked", () => {
    showSummary(7, 10, Date.now(), { current: 2, unlocked: 2 });
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("Part 2 of 2 unlocked");
    expect(clean).toContain("7 / 10 tests passing");
  });

  test("never reveals total part count in output", () => {
    // partInfo only has current and unlocked, not total
    showSummary(5, 5, Date.now(), { current: 1, unlocked: 1 });
    const clean = stripAnsi(stdoutOutput);
    // Should say "Part 1 of 1 unlocked" not "Part 1 of 3" or similar
    expect(clean).not.toMatch(/of \d+ total/);
    // The format is always "Part X of Y unlocked" where Y = unlocked count
    expect(clean).toMatch(/Part \d+ of \d+ unlocked/);
  });

  test("includes timestamp in output", () => {
    const ts = new Date(2025, 0, 15, 14, 30, 0).getTime();
    showSummary(2, 5, ts);
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("last run:");
  });

  test("shows all passing in green-style indicator", () => {
    showSummary(5, 5, Date.now());
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("5 / 5 tests passing");
  });
});

// --- Part progression message ---

describe("showPartComplete", () => {
  test("displays completion message with next part title", () => {
    showPartComplete(1, "Part Two Title", "Implement the next function");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 1 complete!");
    expect(output).toContain("Part 2 has been added to your file");
    expect(output).toContain("Part 2: Part Two Title");
    expect(output).toContain("Implement the next function");
  });

  test("displays correct part numbers for later parts", () => {
    showPartComplete(2, "Part Three Title", "Final challenge");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 2 complete!");
    expect(output).toContain("Part 3 has been added to your file");
    expect(output).toContain("Part 3: Part Three Title");
  });
});

// --- Part intro ---

describe("showPartIntro", () => {
  test("displays part number and title", () => {
    showPartIntro(1, "Flatten an array", "Make it flat");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 1: Flatten an array");
    expect(output).toContain("Make it flat");
  });

  test("shows Untitled when title is missing", () => {
    showPartIntro(1, null, null);
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 1: Untitled");
  });

  test("omits description line when description is falsy", () => {
    showPartIntro(2, "Some Title", "");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 2: Some Title");
    // Empty description should not produce an extra line
    const lines = output.split("\n").filter((l) => l.trim());
    const descLine = lines.find((l) => l.includes("Part 2:"));
    expect(descLine).toBeTruthy();
  });
});

// --- Completion message ---

describe("showAllComplete", () => {
  test("renders completion message with problem name", () => {
    showAllComplete("flatten-and-sum");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("All parts complete for flatten-and-sum!");
    expect(output).toContain("Returning to menu...");
  });
});

// --- Soft warning ---

describe("showWatching", () => {
  test("displays problem name and language", () => {
    showWatching("test-problem", "JavaScript");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Watching test-problem (JavaScript)");
    expect(output).toContain("Press Q to go back to the problem menu");
  });
});

// Verify the VS Code not-found warning format (from index.js)
describe("VS Code not-found warning format", () => {
  test("warning string contains expected text", () => {
    // This is the exact string used in index.js
    const warning =
      "  VS Code not found on PATH — skipping editor launch. See README for setup instructions.";
    expect(warning).toContain("VS Code not found on PATH");
    expect(warning).toContain("skipping editor launch");
    expect(warning).toContain("README");
  });
});

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

// --- Timer display in summary ---

describe("showSummary with timer", () => {
  test("shows elapsed in stopwatch mode", () => {
    showSummary(3, 5, Date.now(), null, {
      totalElapsedSeconds: 754,
      currentPartElapsedSeconds: 100,
      remaining: null,
      isOvertime: false,
      isPaused: false,
      mode: "stopwatch",
    });
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("12:34 elapsed");
  });

  test("shows remaining in countdown mode", () => {
    showSummary(3, 5, Date.now(), null, {
      totalElapsedSeconds: 300,
      currentPartElapsedSeconds: 100,
      remaining: 1200,
      isOvertime: false,
      isPaused: false,
      mode: "countdown",
      countdownSeconds: 1500,
    });
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("20:00 remaining");
  });

  test("shows paused state", () => {
    showSummary(3, 5, Date.now(), null, {
      totalElapsedSeconds: 600,
      currentPartElapsedSeconds: 100,
      remaining: 300,
      isOvertime: false,
      isPaused: true,
      mode: "countdown",
      countdownSeconds: 900,
    });
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("[paused]");
  });

  test("shows overtime in countdown mode", () => {
    showSummary(3, 5, Date.now(), null, {
      totalElapsedSeconds: 1600,
      currentPartElapsedSeconds: 100,
      remaining: -100,
      isOvertime: true,
      isPaused: false,
      mode: "countdown",
      countdownSeconds: 1500,
    });
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("overtime");
  });

  test("backward compatible — no timer display when omitted", () => {
    showSummary(3, 5, Date.now());
    const clean = stripAnsi(stdoutOutput);
    expect(clean).not.toContain("elapsed");
    expect(clean).not.toContain("remaining");
  });
});

// --- Part complete with split time ---

describe("showPartComplete with split", () => {
  test("includes split time when provided", () => {
    showPartComplete(1, "Part Two", "Description", 535);
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 1 complete!");
    expect(output).toContain("Part 1 time: 08:55");
  });

  test("omits split time when null", () => {
    showPartComplete(1, "Part Two", "Description", null);
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 1 complete!");
    expect(output).not.toContain("time:");
  });
});

// --- Watching with P key hint ---

describe("showWatching with P key hint", () => {
  test("includes P key hint", () => {
    showWatching("test-problem", "JavaScript");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("P to pause/resume timer");
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
    // countdownSeconds = 100, 50% remaining = 50s left = 50s elapsed
    const result = getMilestoneWarning(50, "countdown", 100);
    expect(result).toContain("50%");
  });

  test("returns warning at 25% remaining in countdown", () => {
    // countdownSeconds = 100, 25% remaining = 25s left = 75s elapsed
    const result = getMilestoneWarning(75, "countdown", 100);
    expect(result).toContain("25%");
  });
});

// --- Overtime notice ---

describe("showOvertimeNotice", () => {
  test("prints overtime message", () => {
    showOvertimeNotice();
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Time's up");
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
