import {
  formatStatusBadge,
  getMilestoneWarning,
  formatTimerSegment,
  formatGlobalStats,
  formatProblemStats,
  formatRunOutput,
  extractJestResults,
  extractPytestResults,
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

  test("returns null for disabled mode", () => {
    const result = formatTimerSegment({
      totalElapsedSeconds: 100,
      currentPartElapsedSeconds: 100,
      remaining: null,
      isOvertime: false,
      isPaused: false,
      mode: "disabled",
    });
    expect(result).toBeNull();
  });

  test("returns null for null input", () => {
    expect(formatTimerSegment(null)).toBeNull();
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

// --- formatRunOutput ---

describe("formatRunOutput", () => {
  test("returns [] for empty stdout and stderr", () => {
    expect(formatRunOutput("", "")).toEqual([]);
  });

  test("parses passed result line", () => {
    const stdout = "[basic case] \u2714 [30, 60, -1]\n";
    const result = formatRunOutput(stdout, "");
    expect(result).toEqual([
      { type: "result", label: "basic case", passed: true, actual: "[30, 60, -1]" },
    ]);
  });

  test("parses failed result line with expected", () => {
    const stdout = "[basic case] \u2718 [-1, -1, 20] (expected [-1, -1])\n";
    const result = formatRunOutput(stdout, "");
    expect(result).toEqual([
      { type: "result", label: "basic case", passed: false, actual: "[-1, -1, 20]", expected: "[-1, -1]" },
    ]);
  });

  test("parses unlabeled line as log", () => {
    const stdout = "hello from inside\n";
    const result = formatRunOutput(stdout, "");
    expect(result).toEqual([
      { type: "log", label: null, content: "hello from inside" },
    ]);
  });

  test("parses result with no checkmark or X as passed: null", () => {
    const stdout = "[no expected] [30, 60, -1]\n";
    const result = formatRunOutput(stdout, "");
    expect(result).toEqual([
      { type: "result", label: "no expected", passed: null, actual: "[30, 60, -1]" },
    ]);
  });

  test("identifies error lines by ErrorClass pattern", () => {
    const stdout = "[basic case] TypeError: mod.fn is not a function\n";
    const result = formatRunOutput(stdout, "");
    expect(result).toEqual([
      { type: "error", label: "basic case", content: "TypeError: mod.fn is not a function" },
    ]);
  });

  test("parses stderr lines as type stderr", () => {
    const result = formatRunOutput("", "SyntaxError: Unexpected token\n");
    expect(result).toEqual([
      { type: "stderr", label: null, content: "SyntaxError: Unexpected token" },
    ]);
  });

  test("handles interleaved user logs and labeled results in order", () => {
    const stdout = "debug info\n[case 1] \u2714 42\nmore debug\n[case 2] \u2718 0 (expected 1)\n";
    const result = formatRunOutput(stdout, "");
    expect(result).toEqual([
      { type: "log", label: null, content: "debug info" },
      { type: "result", label: "case 1", passed: true, actual: "42" },
      { type: "log", label: null, content: "more debug" },
      { type: "result", label: "case 2", passed: false, actual: "0", expected: "1" },
    ]);
  });

  test("truncates actual at 200 chars with ellipsis", () => {
    const longValue = "x".repeat(250);
    const stdout = `[test] \u2714 ${longValue}\n`;
    const result = formatRunOutput(stdout, "");
    expect(result[0].actual).toHaveLength(201);
    expect(result[0].actual.endsWith("\u2026")).toBe(true);
  });

  test("truncates content at 200 chars with ellipsis", () => {
    const longContent = "y".repeat(250);
    const stdout = `${longContent}\n`;
    const result = formatRunOutput(stdout, "");
    expect(result[0].content).toHaveLength(201);
    expect(result[0].content.endsWith("\u2026")).toBe(true);
  });

  test("does not truncate strings under 200 chars", () => {
    const value = "z".repeat(100);
    const stdout = `[test] \u2714 ${value}\n`;
    const result = formatRunOutput(stdout, "");
    expect(result[0].actual).toBe(value);
  });

  test("multi-line stderr becomes separate entries", () => {
    const result = formatRunOutput("", "line one\nline two\nline three\n");
    expect(result).toEqual([
      { type: "stderr", label: null, content: "line one" },
      { type: "stderr", label: null, content: "line two" },
      { type: "stderr", label: null, content: "line three" },
    ]);
  });

  test("empty stderr produces no stderr entries", () => {
    const result = formatRunOutput("[test] \u2714 ok\n", "");
    expect(result.filter((e) => e.type === "stderr")).toHaveLength(0);
  });
});

// --- extractJestResults ---

function makeJestJson(overrides = {}) {
  return JSON.stringify({ testResults: [], ...overrides });
}

describe("extractJestResults", () => {
  test("returns empty result for null input", () => {
    expect(extractJestResults(null)).toEqual({ failures: [], consoleLogs: [], passCount: 0 });
  });

  test("returns empty result for invalid JSON", () => {
    expect(extractJestResults("not valid json {{")).toEqual({ failures: [], consoleLogs: [], passCount: 0 });
  });

  test("extracts name from title for failed assertions", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "handles edge case", failureMessages: ["Expected: 1\nReceived: 2"] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].name).toBe("handles edge case");
  });

  test("extracts expected and received from standard Expected:/Received: lines", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "test", failureMessages: ["Expected: [1, 2]\nReceived: [3, 4]"] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures[0].expected).toBe("[1, 2]");
    expect(result.failures[0].received).toBe("[3, 4]");
  });

  test("extracts expected from Expected length: variant", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "test", failureMessages: ["  Expected length: 3\n  Received length: 5"] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures[0].expected).toBe("3");
    expect(result.failures[0].received).toBe("5");
  });

  test("sets expected to null when no Expected line present", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "test", failureMessages: ["some error without expected/received"] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures[0].expected).toBeNull();
  });

  test("sets received to null when no Received line present", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "test", failureMessages: ["Expected: 1\nno received line here"] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures[0].received).toBeNull();
  });

  test("increments passCount for each passed assertion", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "passed", title: "test one", failureMessages: [] },
          { status: "passed", title: "test two", failureMessages: [] },
          { status: "failed", title: "test three", failureMessages: ["Expected: 1\nReceived: 2"] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.passCount).toBe(2);
    expect(result.failures).toHaveLength(1);
  });

  test("extracts console log messages into consoleLogs array", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "passed", title: "test", failureMessages: [] },
        ],
        console: [
          { message: "debug info", type: "log" },
          { message: "more debug", type: "log" },
          { message: "warning!", type: "warn" },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.consoleLogs).toEqual(["debug info", "more debug"]);
  });

  test("returns consoleLogs [] when no console output present", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "passed", title: "test", failureMessages: [] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.consoleLogs).toEqual([]);
  });

  test("truncates expected at 200 chars", () => {
    const longExpected = "y".repeat(250);
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "test", failureMessages: [`Expected: ${longExpected}\nReceived: 2`] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures[0].expected.length).toBe(201);
    expect(result.failures[0].expected.endsWith("\u2026")).toBe(true);
  });

  test("truncates received at 200 chars", () => {
    const longReceived = "z".repeat(250);
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "test", failureMessages: [`Expected: 1\nReceived: ${longReceived}`] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures[0].received.length).toBe(201);
    expect(result.failures[0].received.endsWith("\u2026")).toBe(true);
  });

  test("truncates console log messages at 200 chars", () => {
    const longMsg = "a".repeat(250);
    const json = makeJestJson({
      testResults: [{
        assertionResults: [],
        console: [{ message: longMsg, type: "log" }],
      }],
    });
    const result = extractJestResults(json);
    expect(result.consoleLogs[0].length).toBe(201);
    expect(result.consoleLogs[0].endsWith("\u2026")).toBe(true);
  });

  test("extracts error from thrown TypeError when no Expected/Received lines", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "handles missing data", failureMessages: ["TypeError: Cannot read properties of undefined (reading 'Symbol(Symbol.iterator)')\n    at crawl (/path/main.js:39:28)\n    at Object.<anonymous> (/path/suite.test.js:75:22)"] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures[0].error).toBe("TypeError: Cannot read properties of undefined (reading 'Symbol(Symbol.iterator)')");
    expect(result.failures[0].expected).toBeNull();
    expect(result.failures[0].received).toBeNull();
  });

  test("extracts error from thrown ReferenceError", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "test", failureMessages: ["ReferenceError: foo is not defined\n    at Object.<anonymous> (/path/test.js:5:5)"] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures[0].error).toBe("ReferenceError: foo is not defined");
  });

  test("does not set error when Expected/Received are present", () => {
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "test", failureMessages: ["Expected: [1, 2]\nReceived: [3, 4]"] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures[0].expected).toBe("[1, 2]");
    expect(result.failures[0].received).toBe("[3, 4]");
    expect(result.failures[0].error).toBeNull();
  });

  test("truncates error at 200 chars", () => {
    const longError = "TypeError: " + "x".repeat(250);
    const json = makeJestJson({
      testResults: [{
        assertionResults: [
          { status: "failed", title: "test", failureMessages: [longError + "\n    at foo (/bar.js:1:1)"] },
        ],
      }],
    });
    const result = extractJestResults(json);
    expect(result.failures[0].error.length).toBe(201);
    expect(result.failures[0].error.endsWith("\u2026")).toBe(true);
  });

  test("does not throw for malformed input", () => {
    expect(() => extractJestResults("{}")).not.toThrow();
    expect(() => extractJestResults('{"testResults": "not an array"}')).not.toThrow();
    expect(() => extractJestResults('{"testResults": [{"assertionResults": "bad"}]}')).not.toThrow();
  });
});

// --- extractPytestResults ---

describe("extractPytestResults", () => {
  test("returns empty result for null input", () => {
    expect(extractPytestResults(null)).toEqual({ failures: [], consoleLogs: [], passCount: 0 });
  });

  test("returns empty result for empty string", () => {
    expect(extractPytestResults("")).toEqual({ failures: [], consoleLogs: [], passCount: 0 });
  });

  test("extracts test name from FAILED line, strips test_ prefix, replaces _ with spaces", () => {
    const stdout = [
      "__________________ test_builds_registry_from_entries __________________",
      "suite.test.py:13: in test_builds_registry_from_entries",
      "    assert result == expected",
      "E   AssertionError: assert None == {'gh': 'github.com'}",
    ].join("\n");
    const result = extractPytestResults(stdout);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].name).toBe("builds registry from entries");
  });

  test("increments passCount for PASSED lines", () => {
    const stdout = [
      "suite.test.py::test_case_one PASSED",
      "suite.test.py::test_case_two PASSED",
      "suite.test.py::test_case_three PASSED",
    ].join("\n");
    const result = extractPytestResults(stdout);
    expect(result.passCount).toBe(3);
    expect(result.failures).toHaveLength(0);
  });

  test("extracts expected and received from E AssertionError: assert X == Y line", () => {
    const stdout = [
      "__________________ test_returns_value __________________",
      "suite.test.py:13: in test_returns_value",
      "    assert result == 'github.com'",
      "E   AssertionError: assert None == 'github.com'",
    ].join("\n");
    const result = extractPytestResults(stdout);
    expect(result.failures[0].received).toBe("None");
    expect(result.failures[0].expected).toBe("'github.com'");
  });

  test("sets both to null when no == in assertion line", () => {
    const stdout = [
      "__________________ test_raises_error __________________",
      "suite.test.py:20: in test_raises_error",
      "    assert result",
      "E   AssertionError",
    ].join("\n");
    const result = extractPytestResults(stdout);
    expect(result.failures[0].received).toBeNull();
    expect(result.failures[0].expected).toBeNull();
  });

  test("falls back to FAILED summary lines when no block headers present", () => {
    const stdout = [
      "FAILED suite.test.py::test_builds_registry_from_entries",
      "FAILED suite.test.py::test_returns_null",
    ].join("\n");
    const result = extractPytestResults(stdout);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0].name).toBe("builds registry from entries");
    expect(result.failures[1].name).toBe("returns null");
    expect(result.failures[0].received).toBeNull();
  });

  test("handles multiple failures", () => {
    const stdout = [
      "__________________ test_case_one __________________",
      "file.py:1: in test_case_one",
      "    assert fn() == 1",
      "E   assert None == 1",
      "__________________ test_case_two __________________",
      "file.py:5: in test_case_two",
      "    assert fn() == 2",
      "E   AssertionError: assert 0 == 2",
    ].join("\n");
    const result = extractPytestResults(stdout);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0].name).toBe("case one");
    expect(result.failures[1].name).toBe("case two");
  });

  test("extracts error from thrown TypeError", () => {
    const stdout = [
      "__________________ test_handles_missing_data __________________",
      "suite.test.py:10: in test_handles_missing_data",
      "    result = crawl(start, site_map)",
      "E   TypeError: 'NoneType' object is not iterable",
    ].join("\n");
    const result = extractPytestResults(stdout);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].name).toBe("handles missing data");
    expect(result.failures[0].error).toBe("TypeError: 'NoneType' object is not iterable");
    expect(result.failures[0].expected).toBeNull();
    expect(result.failures[0].received).toBeNull();
  });

  test("extracts error from thrown ValueError", () => {
    const stdout = [
      "__________________ test_parses_input __________________",
      "suite.test.py:20: in test_parses_input",
      "    result = parse(data)",
      "E   ValueError: invalid literal for int() with base 10: 'abc'",
    ].join("\n");
    const result = extractPytestResults(stdout);
    expect(result.failures[0].error).toBe("ValueError: invalid literal for int() with base 10: 'abc'");
  });

  test("does not throw for malformed input", () => {
    expect(() => extractPytestResults("random garbage output")).not.toThrow();
    expect(() => extractPytestResults("E   something weird")).not.toThrow();
  });

  test("always returns empty consoleLogs", () => {
    const stdout = "suite.test.py::test_case PASSED\n";
    const result = extractPytestResults(stdout);
    expect(result.consoleLogs).toEqual([]);
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
