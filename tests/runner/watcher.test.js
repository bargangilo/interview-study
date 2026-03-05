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
  };
}

function createMockWatcher() {
  return { on: jest.fn().mockReturnThis(), close: jest.fn() };
}

function setupRunnerConfigMock(config = { testTimeoutSeconds: 5 }) {
  fs.existsSync.mockImplementation((p) => {
    if (typeof p === "string" && p.includes("runner.config.json")) return true;
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

// --- Watcher process behavior ---

describe("watcher process behavior", () => {
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

  test("exit code 0 produces normal result with consoleOutput", async () => {
    const onTestResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onTestResult,
    });

    mockProc.emitStdout("Tests: 3 passed, 3 total\n");
    mockProc.emit("close", 0, null);
    await flush();

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ passed: 3, total: 3, consoleOutput: [] })
    );
  });

  test("exit code 1 produces normal failure result with consoleOutput", async () => {
    const onTestResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onTestResult,
    });

    mockProc.emitStdout("Tests: 1 failed, 2 passed, 3 total\n");
    mockProc.emit("close", 1, null);
    await flush();

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ passed: 2, total: 3, consoleOutput: [] })
    );
  });

  test("exit code 2 produces crashed result", async () => {
    const onTestResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onTestResult,
    });

    mockProc.emit("close", 2, null);
    await flush();

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ passed: 0, total: 0, crashed: true, exitCode: 2, consoleOutput: [] })
    );
  });

  test("timeout fires after configured seconds and calls onTestResult with timedOut", async () => {
    jest.useFakeTimers();
    const onTestResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onTestResult,
    });

    jest.advanceTimersByTime(5000);
    expect(mockProc.kill).toHaveBeenCalledWith("SIGKILL");

    mockProc.emit("close", null, "SIGKILL");
    await jest.advanceTimersByTimeAsync(0);

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ timedOut: true, timeoutSeconds: 5, consoleOutput: [] })
    );

    jest.useRealTimers();
  });

  test("timeout is cleared when process exits normally before timeout", async () => {
    jest.useFakeTimers();
    const onTestResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onTestResult,
    });

    mockProc.emitStdout("Tests: 1 passed, 1 total\n");
    mockProc.emit("close", 0, null);
    await jest.advanceTimersByTimeAsync(0);

    // Advance past timeout — kill should NOT fire
    jest.advanceTimersByTime(10000);
    expect(mockProc.kill).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  test("timedOut in close handler skips normal result processing", async () => {
    jest.useFakeTimers();
    const onTestResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onTestResult,
    });

    // Send normal output that would parse as passed tests
    mockProc.emitStdout("Tests: 5 passed, 5 total\n");

    // Fire timeout before close
    jest.advanceTimersByTime(5000);
    mockProc.emit("close", null, "SIGKILL");
    await jest.advanceTimersByTimeAsync(0);

    // Should get timeout result, not the parsed 5/5
    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ timedOut: true, passed: 0, total: 0 })
    );

    jest.useRealTimers();
  });

  test("onTestResult receives populated consoleOutput when Jest stdout contains console blocks", async () => {
    const onTestResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onTestResult,
    });

    const stdout = [
      "  console.log",
      "    debug value: 42",
      "      at Object.<anonymous> (workspace/test-problem/main.js:5:9)",
      "",
      "Tests: 1 passed, 1 total",
    ].join("\n");
    mockProc.emitStdout(stdout);
    mockProc.emit("close", 0, null);
    await flush();

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({
        consoleOutput: ["[log] debug value: 42"],
      })
    );
  });

  test("onTestResult receives [] for consoleOutput when no console output present", async () => {
    const onTestResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onTestResult,
    });

    mockProc.emitStdout("Tests: 3 passed, 3 total\n");
    mockProc.emit("close", 0, null);
    await flush();

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ consoleOutput: [] })
    );
  });

  test("onTestResult receives [] for consoleOutput on timeout", async () => {
    jest.useFakeTimers();
    const onTestResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onTestResult,
    });

    jest.advanceTimersByTime(5000);
    mockProc.emit("close", null, "SIGKILL");
    await jest.advanceTimersByTimeAsync(0);

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ timedOut: true, consoleOutput: [] })
    );
    jest.useRealTimers();
  });

  test("onTestResult receives [] for consoleOutput on crash", async () => {
    const onTestResult = jest.fn();
    startWatching("test-problem", "JavaScript", "/fake", null, 0, null, {
      onTestResult,
    });

    mockProc.emit("close", 2, null);
    await flush();

    expect(onTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ crashed: true, consoleOutput: [] })
    );
  });

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

    // Complete the initial run so running=false
    mockProc.emitStdout("Tests: 1 passed, 1 total\n");
    mockProc.emit("close", 0, null);
    await flush();

    // Trigger file change — this calls run() again, which spawns and throws
    const changeHandler = mockWatcherObj.on.mock.calls.find(([e]) => e === "change")[1];
    changeHandler();
    await flush();

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0][0].message).toBe("spawn failed");
  });
});
