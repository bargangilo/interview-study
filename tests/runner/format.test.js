import {
  formatStatusBadge,
  getMilestoneWarning,
  formatTimerSegment,
  formatGlobalStats,
  formatProblemStats,
  formatRunOutput,
  parseTestFailures,
  correlateTestFailures,
  parsePytestFailures,
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

// --- parseTestFailures ---

function makeJestJson({ testResults }) {
  return JSON.stringify({ testResults, numPassedTests: 0, numFailedTests: 1 });
}

function makeFailureMessage({ expected, received, callLine }) {
  const lines = [
    "expect(received).toEqual(expected)",
    "",
    `Expected: ${expected}`,
    `Received: ${received}`,
    "",
    "   8 |   test(\"test name\", () => {",
  ];
  if (callLine) {
    lines.push(`   9 |     ${callLine}`);
    lines.push("     |     ^");
  }
  lines.push("  10 |   });");
  return lines.join("\n");
}

describe("parseTestFailures", () => {
  test("returns [] for null input", () => {
    expect(parseTestFailures(null)).toEqual([]);
  });

  test("returns [] for invalid JSON string", () => {
    expect(parseTestFailures("not valid json {{")).toEqual([]);
  });

  test("returns [] for valid Jest JSON with no failures", () => {
    const json = JSON.stringify({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "passed", title: "works", failureMessages: [] },
        ],
      }],
    });
    expect(parseTestFailures(json)).toEqual([]);
  });

  test("returns correct failure object for single failing test with all fields", () => {
    const msg = makeFailureMessage({
      expected: "[0, 1, 1]",
      received: "[0, 0, 1]",
      callLine: 'expect(assignRooms([[0,30],[5,10]], [[7,10]])).toEqual([0,1,1])',
    });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "handles many rooms", failureMessages: [msg] },
        ],
      }],
    });
    const result = parseTestFailures(json);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("handles many rooms");
    expect(result[0].expected).toBe("[0, 1, 1]");
    expect(result[0].received).toBe("[0, 0, 1]");
    expect(result[0].input).toBe("assignRooms([[0,30],[5,10]], [[7,10]])");
  });

  test("extracts name correctly from assertionResults.title", () => {
    const msg = makeFailureMessage({ expected: "1", received: "2", callLine: null });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "returns null when no room available", failureMessages: [msg] },
        ],
      }],
    });
    const result = parseTestFailures(json);
    expect(result[0].name).toBe("returns null when no room available");
  });

  test("extracts expected from Expected: line in failure message", () => {
    const msg = makeFailureMessage({ expected: '["B"]', received: '["A"]', callLine: null });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "test", failureMessages: [msg] },
        ],
      }],
    });
    expect(parseTestFailures(json)[0].expected).toBe('["B"]');
  });

  test("extracts received from Received: line in failure message", () => {
    const msg = makeFailureMessage({ expected: "true", received: "false", callLine: null });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "test", failureMessages: [msg] },
        ],
      }],
    });
    expect(parseTestFailures(json)[0].received).toBe("false");
  });

  test("extracts input from the assertion call line", () => {
    const msg = makeFailureMessage({
      expected: "[1]",
      received: "[2]",
      callLine: 'expect(mod.findRooms(rooms, bookings, requests)).toEqual([1])',
    });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "test", failureMessages: [msg] },
        ],
      }],
    });
    expect(parseTestFailures(json)[0].input).toBe("mod.findRooms(rooms, bookings, requests)");
  });

  test("returns input: null when assertion call line is not parseable", () => {
    const msg = makeFailureMessage({ expected: "1", received: "2", callLine: null });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "test", failureMessages: [msg] },
        ],
      }],
    });
    expect(parseTestFailures(json)[0].input).toBeNull();
  });

  test("handles multiple failing tests — returns one object per failure", () => {
    const msg1 = makeFailureMessage({ expected: "1", received: "2", callLine: null });
    const msg2 = makeFailureMessage({ expected: "3", received: "4", callLine: null });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "test one", failureMessages: [msg1] },
          { status: "failed", title: "test two", failureMessages: [msg2] },
        ],
      }],
    });
    const result = parseTestFailures(json);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("test one");
    expect(result[1].name).toBe("test two");
  });

  test("ignores passing tests — only failing assertions in output", () => {
    const msg = makeFailureMessage({ expected: "1", received: "2", callLine: null });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "passed", title: "passes", failureMessages: [] },
          { status: "failed", title: "fails", failureMessages: [msg] },
          { status: "passed", title: "also passes", failureMessages: [] },
        ],
      }],
    });
    const result = parseTestFailures(json);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("fails");
  });

  test("truncates input at 200 chars with ellipsis", () => {
    const longInput = "x".repeat(250);
    const msg = makeFailureMessage({
      expected: "1",
      received: "2",
      callLine: `expect(fn(${longInput})).toEqual(1)`,
    });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "test", failureMessages: [msg] },
        ],
      }],
    });
    const result = parseTestFailures(json);
    expect(result[0].input.length).toBe(201);
    expect(result[0].input.endsWith("\u2026")).toBe(true);
  });

  test("truncates expected at 200 chars with ellipsis", () => {
    const longExpected = "y".repeat(250);
    const msg = makeFailureMessage({ expected: longExpected, received: "2", callLine: null });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "test", failureMessages: [msg] },
        ],
      }],
    });
    const result = parseTestFailures(json);
    expect(result[0].expected.length).toBe(201);
    expect(result[0].expected.endsWith("\u2026")).toBe(true);
  });

  test("truncates received at 200 chars with ellipsis", () => {
    const longReceived = "z".repeat(250);
    const msg = makeFailureMessage({ expected: "1", received: longReceived, callLine: null });
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "test", failureMessages: [msg] },
        ],
      }],
    });
    const result = parseTestFailures(json);
    expect(result[0].received.length).toBe(201);
    expect(result[0].received.endsWith("\u2026")).toBe(true);
  });

  test("does not throw on malformed failure message — returns partial result", () => {
    const json = makeJestJson({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "broken test", failureMessages: ["totally unexpected format"] },
        ],
      }],
    });
    const result = parseTestFailures(json);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("broken test");
    expect(result[0].expected).toBeNull();
    expect(result[0].received).toBeNull();
    expect(result[0].input).toBeNull();
  });
});

// --- correlateTestFailures ---

describe("correlateTestFailures", () => {
  const activeTests = [
    "retrieves value for registered code",
    "returns null for unregistered code",
    "builds registry from entries",
  ];
  const runInputs = [
    {
      label: "retrieves value for registered code",
      language: "javascript",
      function: "lookupCode",
      args: [{ gh: "github.com", gl: "gitlab.com" }, "gh"],
      expected: "github.com",
    },
    {
      label: "retrieves value for registered code",
      language: "python",
      function: "lookup_code",
      args: [{ gh: "github.com", gl: "gitlab.com" }, "gh"],
      expected: "github.com",
    },
    {
      label: "returns null for unregistered code",
      language: "javascript",
      function: "lookupCode",
      args: [{ gh: "github.com" }, "xyz"],
      expected: null,
    },
  ];

  test("returns matched entry with formatted function call string", () => {
    const result = correlateTestFailures(
      ["retrieves value for registered code"],
      runInputs,
      activeTests,
      "javascript"
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("retrieves value for registered code");
    expect(result[0].input).toBe('lookupCode({"gh":"github.com","gl":"gitlab.com"}, "gh")');
    expect(result[0].expected).toBe('"github.com"');
    expect(result[0].runInputsMatched).toBe(true);
  });

  test("formats multi-argument function call correctly", () => {
    const result = correlateTestFailures(
      ["returns null for unregistered code"],
      runInputs,
      activeTests,
      "javascript"
    );
    expect(result[0].input).toBe('lookupCode({"gh":"github.com"}, "xyz")');
    expect(result[0].expected).toBe("null");
    expect(result[0].runInputsMatched).toBe(true);
  });

  test("formats object argument correctly via JSON.stringify", () => {
    const ri = [{
      label: "test",
      language: "javascript",
      function: "fn",
      args: [{ a: 1, b: [2, 3] }],
      expected: true,
    }];
    const result = correlateTestFailures(["test"], ri, ["test"], "javascript");
    expect(result[0].input).toBe('fn({"a":1,"b":[2,3]})');
    expect(result[0].expected).toBe("true");
  });

  test("filters runInputs by language — javascript entry not matched for python", () => {
    const result = correlateTestFailures(
      ["returns null for unregistered code"],
      runInputs,
      activeTests,
      "python"
    );
    // "returns null for unregistered code" has no python runInput
    expect(result[0].runInputsMatched).toBe(false);
    expect(result[0].input).toBeNull();
  });

  test("returns runInputsMatched false for test name not in activeTests", () => {
    const result = correlateTestFailures(
      ["unknown test name"],
      runInputs,
      activeTests,
      "javascript"
    );
    expect(result[0].runInputsMatched).toBe(false);
    expect(result[0].input).toBeNull();
    expect(result[0].expected).toBeNull();
  });

  test("returns runInputsMatched false for test name in activeTests but no matching runInputs label", () => {
    const result = correlateTestFailures(
      ["builds registry from entries"],
      runInputs,
      activeTests,
      "javascript"
    );
    expect(result[0].runInputsMatched).toBe(false);
  });

  test("truncates input at 200 chars with ellipsis", () => {
    const longArg = "x".repeat(250);
    const ri = [{
      label: "test",
      language: "javascript",
      function: "fn",
      args: [longArg],
      expected: 1,
    }];
    const result = correlateTestFailures(["test"], ri, ["test"], "javascript");
    expect(result[0].input.length).toBe(201);
    expect(result[0].input.endsWith("\u2026")).toBe(true);
  });

  test("truncates expected at 200 chars with ellipsis", () => {
    const longExpected = "y".repeat(250);
    const ri = [{
      label: "test",
      language: "javascript",
      function: "fn",
      args: [1],
      expected: longExpected,
    }];
    const result = correlateTestFailures(["test"], ri, ["test"], "javascript");
    expect(result[0].expected.length).toBe(201);
    expect(result[0].expected.endsWith("\u2026")).toBe(true);
  });

  test("handles empty failedTestNames — returns []", () => {
    expect(correlateTestFailures([], runInputs, activeTests, "javascript")).toEqual([]);
  });

  test("handles null runInputs — returns entries with runInputsMatched false", () => {
    const result = correlateTestFailures(
      ["retrieves value for registered code"],
      null,
      activeTests,
      "javascript"
    );
    expect(result[0].runInputsMatched).toBe(false);
  });

  test("handles null activeTests — returns entries with runInputsMatched false", () => {
    const result = correlateTestFailures(
      ["retrieves value for registered code"],
      runInputs,
      null,
      "javascript"
    );
    expect(result[0].runInputsMatched).toBe(false);
  });

  test("does not throw for any null/undefined input", () => {
    expect(() => correlateTestFailures(null, null, null, "javascript")).not.toThrow();
    expect(() => correlateTestFailures(undefined, undefined, undefined, undefined)).not.toThrow();
    expect(correlateTestFailures(null, null, null, "javascript")).toEqual([]);
  });
});

// --- parsePytestFailures ---

describe("parsePytestFailures", () => {
  test("returns [] for null input", () => {
    expect(parsePytestFailures(null)).toEqual([]);
  });

  test("returns [] for empty string", () => {
    expect(parsePytestFailures("")).toEqual([]);
  });

  test("extracts test name and values from AssertionError line", () => {
    const stdout = [
      "__________________ test_builds_registry __________________",
      "suite.test.py:13: in test_builds_registry",
      '    assert result == {"gh": "github.com"}',
      "E   AssertionError: assert None == {'gh': 'github.com'}",
    ].join("\n");
    const result = parsePytestFailures(stdout);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("builds registry");
    expect(result[0].received).toBe("None");
    expect(result[0].expected).toBe("{'gh': 'github.com'}");
  });

  test("extracts from assert line without AssertionError prefix", () => {
    const stdout = [
      "__________________ test_returns_empty __________________",
      "suite.test.py:18: in test_returns_empty",
      "    assert build_registry([]) == {}",
      "E   assert None == {}",
    ].join("\n");
    const result = parsePytestFailures(stdout);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("returns empty");
    expect(result[0].received).toBe("None");
    expect(result[0].expected).toBe("{}");
  });

  test("strips test_ prefix and replaces underscores with spaces in name", () => {
    const stdout = [
      "__________________ test_first_occurrence_wins __________________",
      "suite.test.py:24: in test_first_occurrence_wins",
      "    assert result == expected",
      "E   AssertionError: assert None == {'api': 'primary'}",
    ].join("\n");
    const result = parsePytestFailures(stdout);
    expect(result[0].name).toBe("first occurrence wins");
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
    const result = parsePytestFailures(stdout);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("case one");
    expect(result[1].name).toBe("case two");
  });

  test("falls back to FAILED summary lines when no headers found", () => {
    const stdout = [
      "FAILED suite.test.py::test_builds_registry_from_entries",
      "FAILED suite.test.py::test_returns_null",
    ].join("\n");
    const result = parsePytestFailures(stdout);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("builds registry from entries");
    expect(result[1].name).toBe("returns null");
    expect(result[0].received).toBeNull();
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
