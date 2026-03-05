import path from "path";
import fs from "fs";

jest.mock("fs");
jest.mock("child_process");
jest.mock("chokidar");

import { spawn } from "child_process";
import chokidar from "chokidar";

import {
  buildTestFilter,
  inferCurrentPart,
  appendPartScaffold,
  writeCompletionMarker,
  loadRunnerConfig,
} from "../../runner/config.js";
import { startWatching } from "../../runner/watcher.js";

import sampleConfig from "./fixtures/sample-problem.json";

// --- Helper: create a controllable mock child process ---

function createMockProcess() {
  const listeners = {};
  const stdoutListeners = {};
  const stderrListeners = {};

  return {
    stdout: {
      on: jest.fn((event, handler) => {
        stdoutListeners[event] = stdoutListeners[event] || [];
        stdoutListeners[event].push(handler);
      }),
    },
    stderr: {
      on: jest.fn((event, handler) => {
        stderrListeners[event] = stderrListeners[event] || [];
        stderrListeners[event].push(handler);
      }),
    },
    on: jest.fn((event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    }),
    kill: jest.fn(),
    emit(event, ...args) {
      (listeners[event] || []).forEach((h) => h(...args));
    },
    emitStdout(data) {
      (stdoutListeners["data"] || []).forEach((h) => h(Buffer.from(data)));
    },
    emitStderr(data) {
      (stderrListeners["data"] || []).forEach((h) => h(Buffer.from(data)));
    },
  };
}

function createMockWatcher() {
  return { on: jest.fn().mockReturnThis(), close: jest.fn() };
}

function setupRunnerConfigMock(config = { testTimeoutSeconds: 5 }) {
  fs.existsSync.mockImplementation((p) => {
    if (typeof p === "string" && p.includes("runner.config.json")) return true;
    // Default: harness exists (so run path doesn't skip)
    if (typeof p === "string" && (p.includes("_run.js") || p.includes("_run.py"))) return true;
    return false;
  });
  fs.readFileSync.mockImplementation((p, enc) => {
    if (typeof p === "string" && p.includes("runner.config.json")) return JSON.stringify(config);
    return "";
  });
}

function setupRunnerConfigMockNoHarness(config = { testTimeoutSeconds: 5 }) {
  fs.existsSync.mockImplementation((p) => {
    if (typeof p === "string" && p.includes("runner.config.json")) return true;
    if (typeof p === "string" && (p.includes("_run.js") || p.includes("_run.py"))) return false;
    return false;
  });
  fs.readFileSync.mockImplementation((p, enc) => {
    if (typeof p === "string" && p.includes("runner.config.json")) return JSON.stringify(config);
    return "";
  });
}

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

// --- Part state inference ---

describe("inferCurrentPart", () => {
  afterEach(() => jest.restoreAllMocks());

  test("returns 0 when file has no delimiter markers", () => {
    const freshContent = "function partOne(x) {\n  // TODO\n}\n\nmodule.exports = { partOne };\n";
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(freshContent);

    const result = inferCurrentPart("test-problem", "JavaScript", "/fake");
    expect(result).toBe(0);
  });

  test("returns 1 when file has a Part 2 delimiter (JS)", () => {
    const content = `function partOne(x) { return x; }
module.exports = { partOne };

// ---- Part 2 ----

function partTwo(x) { /* TODO */ }
module.exports.partTwo = partTwo;`;

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(content);

    const result = inferCurrentPart("test-problem", "JavaScript", "/fake");
    expect(result).toBe(1);
  });

  test("returns 2 when file has Part 2 and Part 3 delimiters (JS)", () => {
    const content = `// code
// ---- Part 2 ----
// more code
// ---- Part 3 ----
// even more code`;

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(content);

    const result = inferCurrentPart("test-problem", "JavaScript", "/fake");
    expect(result).toBe(2);
  });

  test("returns 1 when file has a Part 2 delimiter (Python)", () => {
    const content = `def part_one(x):
    return x

# ---- Part 2 ----

def part_two(x):
    pass`;

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(content);

    const result = inferCurrentPart("test-problem", "Python", "/fake");
    expect(result).toBe(1);
  });

  test("returns 0 when file does not exist", () => {
    fs.existsSync.mockReturnValue(false);

    const result = inferCurrentPart("test-problem", "JavaScript", "/fake");
    expect(result).toBe(0);
  });
});

// --- Test name pattern assembly ---

describe("buildTestFilter", () => {
  test("joins JS test names with pipe for --testNamePattern", () => {
    const activeTests = ["handles basic input", "handles empty input"];
    const filter = buildTestFilter(activeTests, "JavaScript");
    expect(filter).toBe("handles basic input|handles empty input");
  });

  test("escapes regex special characters in JS filter", () => {
    const activeTests = ["test (with parens)", "test.with.dots"];
    const filter = buildTestFilter(activeTests, "JavaScript");
    expect(filter).toBe("test \\(with parens\\)|test\\.with\\.dots");
  });

  test("joins Python test names with ' or ' for -k, replacing spaces with underscores", () => {
    const activeTests = ["handles basic input", "handles empty input"];
    const filter = buildTestFilter(activeTests, "Python");
    expect(filter).toBe("handles_basic_input or handles_empty_input");
  });

  test("produces correct filter from fixture Part 1 activeTests", () => {
    const part1Tests = sampleConfig.parts[0].activeTests;
    const jsFilter = buildTestFilter(part1Tests, "JavaScript");
    expect(jsFilter).toBe("handles basic input|handles empty input");

    const pyFilter = buildTestFilter(part1Tests, "Python");
    expect(pyFilter).toBe("handles_basic_input or handles_empty_input");
  });

  test("produces correct filter from fixture Part 2 activeTests (cumulative)", () => {
    const part2Tests = sampleConfig.parts[1].activeTests;
    const jsFilter = buildTestFilter(part2Tests, "JavaScript");
    expect(jsFilter).toBe(
      "handles basic input|handles empty input|computes sum correctly|returns zero for empty"
    );
  });
});

// --- Part progression trigger ---

describe("part progression logic", () => {
  test("progression triggers when passed === total and total > 0", () => {
    const shouldAdvance = (passed, total) => passed === total && total > 0;

    expect(shouldAdvance(5, 5)).toBe(true);
    expect(shouldAdvance(3, 5)).toBe(false);
    expect(shouldAdvance(0, 0)).toBe(false);
    expect(shouldAdvance(0, 5)).toBe(false);
  });

  test("advancement stops at final part", () => {
    const config = sampleConfig;
    const currentPart = config.parts.length - 1; // last part
    const nextPart = currentPart + 1;
    expect(nextPart >= config.parts.length).toBe(true);
  });
});

// --- Scaffold append behavior ---

describe("appendPartScaffold", () => {
  afterEach(() => jest.restoreAllMocks());

  test("prepends JS delimiter comment before scaffold", () => {
    fs.appendFileSync.mockImplementation(() => {});

    const config = {
      parts: [
        { scaffold: { js: "// part 1" } },
        { scaffold: { js: "function partTwo() {}\n" } },
      ],
    };
    appendPartScaffold("test-problem", "JavaScript", config, 1, "/fake");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem", "main.js"),
      "\n// ---- Part 2 ----\nfunction partTwo() {}\n",
      "utf8"
    );
  });

  test("prepends Python delimiter comment before scaffold", () => {
    fs.appendFileSync.mockImplementation(() => {});

    const config = {
      parts: [
        { scaffold: { python: "# part 1" } },
        { scaffold: { python: "def part_two():\n    pass\n" } },
      ],
    };
    appendPartScaffold("test-problem", "Python", config, 1, "/fake");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem", "main.py"),
      "\n# ---- Part 2 ----\ndef part_two():\n    pass\n",
      "utf8"
    );
  });

  test("uses empty string when scaffold key is missing", () => {
    fs.appendFileSync.mockImplementation(() => {});

    const config = {
      parts: [{}, { scaffold: {} }],
    };
    appendPartScaffold("test-problem", "JavaScript", config, 1, "/fake");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      "\n// ---- Part 2 ----\n",
      "utf8"
    );
  });
});

// --- Cumulative test accumulation ---

describe("cumulative test accumulation", () => {
  test("Part 2 activeTests includes all Part 1 tests", () => {
    const part1Tests = sampleConfig.parts[0].activeTests;
    const part2Tests = sampleConfig.parts[1].activeTests;

    for (const t of part1Tests) {
      expect(part2Tests).toContain(t);
    }
  });

  test("Part 2 has additional tests beyond Part 1", () => {
    const part1Tests = new Set(sampleConfig.parts[0].activeTests);
    const part2Tests = sampleConfig.parts[1].activeTests;

    const newTests = part2Tests.filter((t) => !part1Tests.has(t));
    expect(newTests.length).toBeGreaterThan(0);
    expect(newTests).toEqual(["computes sum correctly", "returns zero for empty"]);
  });

  test("a test omitted from Part 2 activeTests is not included", () => {
    const hypotheticalConfig = {
      parts: [
        { activeTests: ["test a", "test b", "test c"] },
        { activeTests: ["test a", "test c", "test d"] },
      ],
    };

    const part2Filter = buildTestFilter(
      hypotheticalConfig.parts[1].activeTests,
      "JavaScript"
    );
    expect(part2Filter).not.toContain("test b");
    expect(part2Filter).toContain("test a");
    expect(part2Filter).toContain("test c");
    expect(part2Filter).toContain("test d");
  });
});

// --- Completion marker ---

describe("writeCompletionMarker", () => {
  afterEach(() => jest.restoreAllMocks());

  test("appends JS completion marker on final part completion", () => {
    fs.appendFileSync.mockImplementation(() => {});

    writeCompletionMarker("test-problem", "JavaScript", "/fake");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem", "main.js"),
      "\n// ---- COMPLETE ----\n",
      "utf8"
    );
  });

  test("appends Python completion marker on final part completion", () => {
    fs.appendFileSync.mockImplementation(() => {});

    writeCompletionMarker("test-problem", "Python", "/fake");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem", "main.py"),
      "\n# ---- COMPLETE ----\n",
      "utf8"
    );
  });

  test("completion marker is written to workspace path, not problems path", () => {
    fs.appendFileSync.mockImplementation(() => {});

    writeCompletionMarker("test-problem", "JavaScript", "/fake");

    const writtenPath = fs.appendFileSync.mock.calls[0][0];
    expect(writtenPath).toContain("workspace");
    expect(writtenPath).not.toMatch(/\/problems\//);
  });
});

// --- loadRunnerConfig ---

describe("loadRunnerConfig", () => {
  afterEach(() => jest.restoreAllMocks());

  test("returns defaults when file does not exist", () => {
    fs.existsSync.mockReturnValue(false);
    const config = loadRunnerConfig("/fake");
    expect(config).toEqual({ testTimeoutSeconds: 20 });
  });

  test("returns defaults when file is malformed JSON", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("not valid json {{{");
    const config = loadRunnerConfig("/fake");
    expect(config).toEqual({ testTimeoutSeconds: 20 });
  });

  test("returns parsed values when file is valid", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ testTimeoutSeconds: 30 }));
    const config = loadRunnerConfig("/fake");
    expect(config).toEqual({ testTimeoutSeconds: 30 });
  });
});

// --- Watcher run path (on save — spawns harness) ---

describe("watcher run path (on save)", () => {
  let mockProc;
  let mockWatcherObj;

  beforeEach(() => {
    mockProc = createMockProcess();
    mockWatcherObj = createMockWatcher();
    spawn.mockReturnValue(mockProc);
    chokidar.watch.mockReturnValue(mockWatcherObj);
    setupRunnerConfigMock({ testTimeoutSeconds: 5 });
  });

  afterEach(() => jest.restoreAllMocks());

  test("file save spawns harness process, not Jest", async () => {
    const onRunResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
    });

    // Initial spawn is the harness (node _run.js), not yarn jest
    expect(spawn).toHaveBeenCalledWith(
      "node",
      [path.join("/fake", "workspace", "test-problem", "_run.js")],
      expect.objectContaining({ cwd: path.join("/fake", "workspace", "test-problem") })
    );
  });

  test("onRunResult called with stdout and stderr on normal exit", async () => {
    const onRunResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
    });

    mockProc.emitStdout("[twoSum(1,5)] ✔ [0,3]\n");
    mockProc.emitStderr("some warning\n");
    mockProc.emit("close", 0, null);
    await flush();

    expect(onRunResult).toHaveBeenCalledWith(
      expect.objectContaining({
        skipped: false,
        stdout: "[twoSum(1,5)] ✔ [0,3]\n",
        stderr: "some warning\n",
        timedOut: false,
        crashed: false,
      })
    );
    expect(onRunResult.mock.calls[0][0].ranAt).toBeDefined();
  });

  test("onRunResult with skipped: true when no harness file exists", async () => {
    setupRunnerConfigMockNoHarness({ testTimeoutSeconds: 5 });
    spawn.mockClear();

    const onRunResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
    });
    await flush();

    expect(onRunResult).toHaveBeenCalledWith(
      expect.objectContaining({ skipped: true })
    );
    // spawn should NOT have been called
    expect(spawn).not.toHaveBeenCalled();
  });

  test("onRunResult with timedOut: true after timeout", async () => {
    jest.useFakeTimers();
    const onRunResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
    });

    jest.advanceTimersByTime(5000);
    expect(mockProc.kill).toHaveBeenCalledWith("SIGKILL");

    mockProc.emit("close", null, "SIGKILL");
    await jest.advanceTimersByTimeAsync(0);

    expect(onRunResult).toHaveBeenCalledWith(
      expect.objectContaining({ timedOut: true, skipped: false })
    );

    jest.useRealTimers();
  });

  test("onRunResult with crashed: true on non-zero exit", async () => {
    const onRunResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
    });

    mockProc.emitStdout("partial output\n");
    mockProc.emit("close", 1, null);
    await flush();

    expect(onRunResult).toHaveBeenCalledWith(
      expect.objectContaining({
        crashed: true,
        stdout: "partial output\n",
        skipped: false,
      })
    );
  });

  test("includes partial stdout on crash", async () => {
    const onRunResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
    });

    mockProc.emitStdout("line 1\nline 2\n");
    mockProc.emitStderr("error details\n");
    mockProc.emit("close", 1, null);
    await flush();

    const result = onRunResult.mock.calls[0][0];
    expect(result.stdout).toBe("line 1\nline 2\n");
    expect(result.stderr).toBe("error details\n");
  });

  test("timeout cleared on normal exit", async () => {
    jest.useFakeTimers();
    const onRunResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
    });

    mockProc.emitStdout("output\n");
    mockProc.emit("close", 0, null);
    await jest.advanceTimersByTimeAsync(0);

    // Advance past timeout — kill should NOT fire
    jest.advanceTimersByTime(10000);
    expect(mockProc.kill).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});

// --- runTests() imperative method ---

describe("runTests() imperative method", () => {
  let mockProc;
  let mockWatcherObj;

  beforeEach(() => {
    mockProc = createMockProcess();
    mockWatcherObj = createMockWatcher();
    spawn.mockReturnValue(mockProc);
    chokidar.watch.mockReturnValue(mockWatcherObj);
    setupRunnerConfigMock({ testTimeoutSeconds: 5 });
  });

  afterEach(() => jest.restoreAllMocks());

  test("spawns Jest, not node harness", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    // Complete the initial harness run first
    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    mockProc.emitStdout("harness output\n");
    mockProc.emit("close", 0, null);
    await flush();

    // Reset and prepare a new mock process for the test run
    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);

    watcher.runTests();

    expect(spawn).toHaveBeenLastCalledWith(
      "yarn",
      expect.arrayContaining(["jest"]),
      expect.objectContaining({ cwd: "/fake" })
    );
  });

  test("onTestResult called with pass/fail counts from JSON", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    // Complete initial harness run
    mockProc.emit("close", 0, null);
    await flush();

    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);
    watcher.runTests();

    const jestJson = JSON.stringify({ numPassedTests: 3, numFailedTests: 0, testResults: [] });
    testProc.emitStdout(jestJson);
    testProc.emit("close", 0, null);
    await flush();

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ passed: 3, total: 3 })
    );
  });

  test("debounce: second call while in-progress is ignored", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    // Complete initial harness run
    mockProc.emit("close", 0, null);
    await flush();

    spawn.mockClear();
    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);

    watcher.runTests();
    watcher.runTests(); // should be ignored

    // spawn called once for the test run only
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  test("onTestResult shape has no consoleOutput", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    // Complete initial harness run
    mockProc.emit("close", 0, null);
    await flush();

    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);
    watcher.runTests();

    const jestJson = JSON.stringify({ numPassedTests: 1, numFailedTests: 0, testResults: [] });
    testProc.emitStdout(jestJson);
    testProc.emit("close", 0, null);
    await flush();

    const result = onTestResult.mock.calls[0][0];
    expect(result).not.toHaveProperty("consoleOutput");
  });
});

// --- Separation of run and test paths ---

describe("separation of run and test paths", () => {
  let mockProc;
  let mockWatcherObj;

  beforeEach(() => {
    mockProc = createMockProcess();
    mockWatcherObj = createMockWatcher();
    spawn.mockReturnValue(mockProc);
    chokidar.watch.mockReturnValue(mockWatcherObj);
    setupRunnerConfigMock({ testTimeoutSeconds: 5 });
  });

  afterEach(() => jest.restoreAllMocks());

  test("file save does not trigger onTestResult", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    mockProc.emitStdout("harness output\n");
    mockProc.emit("close", 0, null);
    await flush();

    expect(onRunResult).toHaveBeenCalled();
    expect(onTestResult).not.toHaveBeenCalled();
  });

  test("runTests() does not trigger onRunResult", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    // Complete initial harness run
    mockProc.emit("close", 0, null);
    await flush();
    onRunResult.mockClear();

    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);
    watcher.runTests();

    const jestJson = JSON.stringify({ numPassedTests: 1, numFailedTests: 0, testResults: [] });
    testProc.emitStdout(jestJson);
    testProc.emit("close", 0, null);
    await flush();

    expect(onTestResult).toHaveBeenCalled();
    expect(onRunResult).not.toHaveBeenCalled();
  });

  test("part progression triggered by onTestResult only", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();
    const onPartAdvanced = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", sampleConfig, 0, null, {
      onRunResult,
      onTestResult,
      onPartAdvanced,
    });

    // Complete initial harness run — should NOT trigger part advancement
    mockProc.emit("close", 0, null);
    await flush();
    expect(onPartAdvanced).not.toHaveBeenCalled();

    // Now run tests which pass all — triggers part advancement
    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);
    watcher.runTests();

    const jestJson = JSON.stringify({ numPassedTests: 2, numFailedTests: 0, testResults: [] });
    testProc.emitStdout(jestJson);
    testProc.emit("close", 0, null);
    await flush();

    expect(onPartAdvanced).toHaveBeenCalled();
  });
});

// --- Jest JSON mode ---

describe("Jest JSON output mode", () => {
  let mockProc;
  let mockWatcherObj;

  beforeEach(() => {
    mockProc = createMockProcess();
    mockWatcherObj = createMockWatcher();
    spawn.mockReturnValue(mockProc);
    chokidar.watch.mockReturnValue(mockWatcherObj);
    setupRunnerConfigMock({ testTimeoutSeconds: 5 });
  });

  afterEach(() => jest.restoreAllMocks());

  test("runTests() passes --json flag to Jest", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    mockProc.emit("close", 0, null);
    await flush();

    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);
    watcher.runTests();

    const jestArgs = spawn.mock.calls[spawn.mock.calls.length - 1][1];
    expect(jestArgs).toContain("--json");
  });

  test("onTestResult payload includes jestJson field as string", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    mockProc.emit("close", 0, null);
    await flush();

    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);
    watcher.runTests();

    const jestJson = JSON.stringify({ numPassedTests: 2, numFailedTests: 1, testResults: [] });
    testProc.emitStdout(jestJson);
    testProc.emit("close", 0, null);
    await flush();

    const result = onTestResult.mock.calls[0][0];
    expect(result.jestJson).toBe(jestJson);
    expect(typeof result.jestJson).toBe("string");
  });

  test("onTestResult payload has jestJson: null on timeout", async () => {
    jest.useFakeTimers();
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    // Complete initial harness run
    mockProc.emit("close", 0, null);
    await jest.advanceTimersByTimeAsync(0);

    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);
    watcher.runTests();

    // Advance past timeout
    jest.advanceTimersByTime(5000);
    expect(testProc.kill).toHaveBeenCalledWith("SIGKILL");

    testProc.emit("close", null, "SIGKILL");
    await jest.advanceTimersByTimeAsync(0);

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ jestJson: null, timedOut: true })
    );

    jest.useRealTimers();
  });

  test("onTestResult payload has jestJson: null on crash", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    mockProc.emit("close", 0, null);
    await flush();

    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);
    watcher.runTests();

    testProc.emit("close", 2, null);
    await flush();

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ jestJson: null, crashed: true })
    );
  });

  test("pass/fail counts read from parsed JSON", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    mockProc.emit("close", 0, null);
    await flush();

    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);
    watcher.runTests();

    const jestJson = JSON.stringify({ numPassedTests: 5, numFailedTests: 2, testResults: [] });
    testProc.emitStdout(jestJson);
    testProc.emit("close", 1, null);
    await flush();

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ passed: 5, total: 7 })
    );
  });

  test("falls back to crashed: true when stdout is not valid JSON", async () => {
    const onRunResult = jest.fn();
    const onTestResult = jest.fn();

    const watcher = startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onRunResult,
      onTestResult,
    });

    mockProc.emit("close", 0, null);
    await flush();

    const testProc = createMockProcess();
    spawn.mockReturnValue(testProc);
    watcher.runTests();

    testProc.emitStdout("not valid json at all");
    testProc.emit("close", 0, null);
    await flush();

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ crashed: true, jestJson: null })
    );
  });
});

// --- Error handling ---

describe("watcher error handling", () => {
  let mockProc;
  let mockWatcherObj;

  beforeEach(() => {
    mockProc = createMockProcess();
    mockWatcherObj = createMockWatcher();
    spawn.mockReturnValue(mockProc);
    chokidar.watch.mockReturnValue(mockWatcherObj);
    setupRunnerConfigMock({ testTimeoutSeconds: 5 });
  });

  afterEach(() => jest.restoreAllMocks());

  test("unhandled error in file-change handler calls onError callback", async () => {
    const onError = jest.fn();

    // First spawn works (initial run), second spawn throws (triggered by file change)
    let callCount = 0;
    spawn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockProc;
      throw new Error("spawn failed");
    });

    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onError,
    });

    // Complete the initial run so _runInProgress=false
    mockProc.emitStdout("output\n");
    mockProc.emit("close", 0, null);
    await flush();

    // Trigger file change — this calls onSave() again, which spawns and throws
    const changeHandler = mockWatcherObj.on.mock.calls.find(([e]) => e === "change")[1];
    changeHandler();
    await flush();

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0][0].message).toBe("spawn failed");
  });
});
