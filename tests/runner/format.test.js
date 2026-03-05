import {
  formatStatusBadge,
  getMilestoneWarning,
  formatTimerSegment,
  formatGlobalStats,
  formatProblemStats,
  parseConsoleOutput,
  parsePytestConsoleOutput,
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

// --- Console output parsing (Jest) ---

describe("parseConsoleOutput", () => {
  test("returns [] for empty string input", () => {
    expect(parseConsoleOutput("")).toEqual([]);
  });

  test("returns [] for null/undefined input", () => {
    expect(parseConsoleOutput(null)).toEqual([]);
    expect(parseConsoleOutput(undefined)).toEqual([]);
  });

  test("returns [] for Jest output with no console blocks", () => {
    const stdout = "PASS problems/test/suite.test.js\nTests: 3 passed, 3 total\n";
    expect(parseConsoleOutput(stdout)).toEqual([]);
  });

  test("parses a single console.log line correctly", () => {
    const stdout = [
      "  console.log",
      "    the value is 42",
      "      at Object.<anonymous> (workspace/test-problem/main.js:5:9)",
      "",
      "Tests: 1 passed, 1 total",
    ].join("\n");
    expect(parseConsoleOutput(stdout)).toEqual(["[log] the value is 42"]);
  });

  test("parses multiple console.log calls correctly", () => {
    const stdout = [
      "  console.log",
      "    first line",
      "      at Object.<anonymous> (workspace/test-problem/main.js:5:9)",
      "",
      "  console.log",
      "    second line",
      "      at Object.<anonymous> (workspace/test-problem/main.js:8:9)",
      "",
      "Tests: 1 passed, 1 total",
    ].join("\n");
    expect(parseConsoleOutput(stdout)).toEqual([
      "[log] first line",
      "[log] second line",
    ]);
  });

  test("prefixes [error] for console.error blocks", () => {
    const stdout = [
      "  console.error",
      "    something broke",
      "      at Object.<anonymous> (workspace/test-problem/main.js:3:9)",
      "",
      "Tests: 1 passed, 1 total",
    ].join("\n");
    expect(parseConsoleOutput(stdout)).toEqual(["[error] something broke"]);
  });

  test("prefixes [warn] for console.warn blocks", () => {
    const stdout = [
      "  console.warn",
      "    be careful",
      "      at Object.<anonymous> (workspace/test-problem/main.js:3:9)",
      "",
      "Tests: 1 passed, 1 total",
    ].join("\n");
    expect(parseConsoleOutput(stdout)).toEqual(["[warn] be careful"]);
  });

  test("handles multi-line console output", () => {
    const stdout = [
      "  console.log",
      "    { a: 1,",
      "      b: 2 }",
      "      at Object.<anonymous> (workspace/test-problem/main.js:5:9)",
      "",
      "Tests: 1 passed, 1 total",
    ].join("\n");
    const result = parseConsoleOutput(stdout);
    expect(result).toEqual(["[log] { a: 1,", "[log]   b: 2 }"]);
  });

  test("strips leading whitespace from message lines", () => {
    const stdout = [
      "  console.log",
      "    hello world",
      "      at Object.<anonymous> (workspace/test-problem/main.js:5:9)",
      "",
      "Tests: 1 passed, 1 total",
    ].join("\n");
    expect(parseConsoleOutput(stdout)).toEqual(["[log] hello world"]);
  });

  test("does not include at Object lines in output", () => {
    const stdout = [
      "  console.log",
      "    test output",
      "      at Object.<anonymous> (workspace/test-problem/main.js:5:9)",
      "",
      "Tests: 1 passed, 1 total",
    ].join("\n");
    const result = parseConsoleOutput(stdout);
    expect(result.some((l) => l.includes("at Object"))).toBe(false);
  });

  test("handles mixed console methods in one stdout string", () => {
    const stdout = [
      "  console.log",
      "    log line",
      "      at Object.<anonymous> (workspace/test-problem/main.js:2:9)",
      "",
      "  console.error",
      "    error line",
      "      at Object.<anonymous> (workspace/test-problem/main.js:3:9)",
      "",
      "  console.warn",
      "    warn line",
      "      at Object.<anonymous> (workspace/test-problem/main.js:4:9)",
      "",
      "  console.info",
      "    info line",
      "      at Object.<anonymous> (workspace/test-problem/main.js:5:9)",
      "",
      "Tests: 1 passed, 1 total",
    ].join("\n");
    expect(parseConsoleOutput(stdout)).toEqual([
      "[log] log line",
      "[error] error line",
      "[warn] warn line",
      "[info] info line",
    ]);
  });

  test("ignores console blocks from non-workspace paths", () => {
    const stdout = [
      "  console.log",
      "    internal jest message",
      "      at Object.<anonymous> (node_modules/jest-runner/lib/index.js:5:9)",
      "",
      "  console.log",
      "    user output",
      "      at Object.<anonymous> (workspace/test-problem/main.js:5:9)",
      "",
      "Tests: 1 passed, 1 total",
    ].join("\n");
    expect(parseConsoleOutput(stdout)).toEqual(["[log] user output"]);
  });
});

// --- Console output parsing (pytest) ---

describe("parsePytestConsoleOutput", () => {
  test("returns [] for empty string", () => {
    expect(parsePytestConsoleOutput("")).toEqual([]);
  });

  test("returns [] for null/undefined input", () => {
    expect(parsePytestConsoleOutput(null)).toEqual([]);
    expect(parsePytestConsoleOutput(undefined)).toEqual([]);
  });

  test("returns [] for pytest output with no captured stdout section", () => {
    const stdout = "PASSED test_sample.py::test_basic\n1 passed in 0.5s\n";
    expect(parsePytestConsoleOutput(stdout)).toEqual([]);
  });

  test("extracts lines from Captured stdout call section", () => {
    const stdout = [
      "FAILED test_sample.py::test_basic",
      "--- Captured stdout call ---",
      "hello from print",
      "another line",
      "--- Captured stderr call ---",
      "1 failed in 0.5s",
    ].join("\n");
    expect(parsePytestConsoleOutput(stdout)).toEqual([
      "hello from print",
      "another line",
    ]);
  });

  test("handles multiple captured sections", () => {
    const stdout = [
      "FAILED test_sample.py::test_one",
      "--- Captured stdout call ---",
      "output from test one",
      "=== FAILURES ===",
      "FAILED test_sample.py::test_two",
      "--- Captured stdout call ---",
      "output from test two",
      "=== short test summary ===",
    ].join("\n");
    expect(parsePytestConsoleOutput(stdout)).toEqual([
      "output from test one",
      "output from test two",
    ]);
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
