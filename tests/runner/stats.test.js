const path = require("path");
const fs = require("fs");

jest.mock("fs");

const {
  loadSession,
  readAllSessions,
  computeGlobalStats,
  computeProblemStats,
  formatSeconds,
  formatSecondsVerbose,
  writeSession,
  writeSessionSync,
  _resetWriteState,
} = require("../../runner/stats");

const completedSession = require("./fixtures/one-attempt-completed.json");
const mixedSession = require("./fixtures/multiple-attempts-mixed.json");
const emptySession = require("./fixtures/empty-attempts.json");

afterEach(() => {
  jest.restoreAllMocks();
  _resetWriteState();
});

// --- formatSeconds ---

describe("formatSeconds", () => {
  test("formats zero", () => {
    expect(formatSeconds(0)).toBe("00:00");
  });

  test("formats under one hour", () => {
    expect(formatSeconds(754)).toBe("12:34");
  });

  test("formats exactly one hour", () => {
    expect(formatSeconds(3600)).toBe("1:00:00");
  });

  test("formats over one hour", () => {
    expect(formatSeconds(3661)).toBe("1:01:01");
  });

  test("returns --:-- for null", () => {
    expect(formatSeconds(null)).toBe("--:--");
  });

  test("formats 59 seconds", () => {
    expect(formatSeconds(59)).toBe("00:59");
  });

  test("formats 60 seconds as one minute", () => {
    expect(formatSeconds(60)).toBe("01:00");
  });
});

// --- formatSecondsVerbose ---

describe("formatSecondsVerbose", () => {
  test("formats hours and minutes", () => {
    expect(formatSecondsVerbose(3661)).toBe("1h 1m");
  });

  test("formats minutes only", () => {
    expect(formatSecondsVerbose(300)).toBe("5m");
  });

  test("formats under one minute", () => {
    expect(formatSecondsVerbose(45)).toBe("45s");
  });

  test("returns -- for null", () => {
    expect(formatSecondsVerbose(null)).toBe("--");
  });

  test("formats zero as 0s", () => {
    expect(formatSecondsVerbose(0)).toBe("0s");
  });
});

// --- loadSession ---

describe("loadSession", () => {
  test("returns null when no session file exists", () => {
    fs.existsSync.mockReturnValue(false);
    expect(loadSession("test-problem", "/fake")).toBeNull();
  });

  test("returns parsed session when file exists", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(completedSession));
    const result = loadSession("test-problem", "/fake");
    expect(result).not.toBeNull();
    expect(result.completed).toBe(true);
    expect(result.attempts).toHaveLength(1);
  });

  test("returns null for malformed JSON", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("{bad json");
    expect(loadSession("test-problem", "/fake")).toBeNull();
  });
});

// --- readAllSessions ---

describe("readAllSessions", () => {
  test("returns empty array when workspace does not exist", () => {
    fs.existsSync.mockReturnValue(false);
    expect(readAllSessions("/fake")).toEqual([]);
  });

  test("reads session files from workspace subdirectories", () => {
    fs.existsSync.mockImplementation((p) => {
      if (p.endsWith("workspace")) return true;
      if (p.includes("session.json")) return true;
      return false;
    });
    fs.readdirSync.mockReturnValue([
      { name: "problem-a", isDirectory: () => true },
      { name: "problem-b", isDirectory: () => true },
      { name: ".gitkeep", isDirectory: () => false },
    ]);
    fs.readFileSync.mockReturnValue(JSON.stringify(completedSession));

    const result = readAllSessions("/fake");
    expect(result).toHaveLength(2);
    expect(result[0].problemName).toBe("problem-a");
    expect(result[1].problemName).toBe("problem-b");
  });
});

// --- computeGlobalStats ---

describe("computeGlobalStats", () => {
  test("computes totals from completed sessions", () => {
    const sessions = [
      { problemName: "prob-a", session: completedSession },
      { problemName: "prob-b", session: mixedSession },
    ];
    const stats = computeGlobalStats(sessions);
    expect(stats.problemsAttempted).toBe(2);
    expect(stats.problemsCompleted).toBe(2);
    // completedSession: 900s, mixedSession: 500 + 1400 + 1200 = 3100s
    expect(stats.totalPracticeSeconds).toBe(900 + 500 + 1400 + 1200);
    expect(stats.bestSolveSeconds).toBe(900); // lowest completed attempt
    expect(stats.bestSolveProblemName).toBe("prob-a");
  });

  test("returns null for averages when no completions", () => {
    const sessions = [{ problemName: "prob-a", session: emptySession }];
    const stats = computeGlobalStats(sessions);
    expect(stats.averageSolveSeconds).toBeNull();
    expect(stats.bestSolveSeconds).toBeNull();
    expect(stats.bestSolveProblemName).toBeNull();
    expect(stats.problemsCompleted).toBe(0);
  });

  test("computes average of completed attempts", () => {
    const sessions = [{ problemName: "prob-a", session: mixedSession }];
    const stats = computeGlobalStats(sessions);
    // Two completed: 1400 and 1200, avg = 1300
    expect(stats.averageSolveSeconds).toBe(1300);
  });
});

// --- computeProblemStats ---

describe("computeProblemStats", () => {
  test("computes all fields for problem with multiple attempts", () => {
    const stats = computeProblemStats("test-problem", mixedSession);
    expect(stats.attempts).toBe(3);
    expect(stats.completions).toBe(2);
    expect(stats.bestTimeSeconds).toBe(1200);
    expect(stats.averageTimeSeconds).toBe(1300);
    expect(stats.lastAttemptedDate).toBe("2026-03-04T16:00:00.000Z");
    expect(stats.attemptHistory).toHaveLength(3);
  });

  test("returns null for times when no completions", () => {
    const stats = computeProblemStats("test-problem", emptySession);
    expect(stats.completions).toBe(0);
    expect(stats.bestTimeSeconds).toBeNull();
    expect(stats.averageTimeSeconds).toBeNull();
    expect(stats.bestSplits).toBeNull();
  });

  test("includes best splits from fastest completed attempt", () => {
    const stats = computeProblemStats("test-problem", mixedSession);
    // Best (1200s) has splits with part 1 = 600, part 2 = 600
    expect(stats.bestSplits).not.toBeNull();
    expect(stats.bestSplits).toHaveLength(2);
    expect(stats.bestSplits[0].elapsedSeconds).toBe(600);
  });

  test("attempt history includes countdown info", () => {
    const stats = computeProblemStats("test-problem", mixedSession);
    expect(stats.attemptHistory[1].wasCountdown).toBe(true);
    expect(stats.attemptHistory[1].countdownSeconds).toBe(1800);
    expect(stats.attemptHistory[0].wasCountdown).toBe(false);
  });
});

// --- streak calculation ---

describe("streak calculation", () => {
  test("returns 0 for empty sessions", () => {
    const stats = computeGlobalStats([]);
    expect(stats.currentStreakDays).toBe(0);
  });

  test("returns 0 when no attempts exist", () => {
    const stats = computeGlobalStats([
      { problemName: "test", session: emptySession },
    ]);
    expect(stats.currentStreakDays).toBe(0);
  });

  test("counts today as a streak day", () => {
    const today = new Date().toISOString();
    const session = {
      attempts: [{ date: today, totalSeconds: 100, completed: false }],
    };
    const stats = computeGlobalStats([{ problemName: "test", session }]);
    expect(stats.currentStreakDays).toBe(1);
  });

  test("counts consecutive days", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    const session = {
      attempts: [
        { date: dayBefore.toISOString(), totalSeconds: 100, completed: false },
        { date: yesterday.toISOString(), totalSeconds: 100, completed: false },
        { date: today.toISOString(), totalSeconds: 100, completed: false },
      ],
    };
    const stats = computeGlobalStats([{ problemName: "test", session }]);
    expect(stats.currentStreakDays).toBe(3);
  });

  test("gap breaks streak", () => {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const session = {
      attempts: [
        { date: threeDaysAgo.toISOString(), totalSeconds: 100, completed: false },
        { date: today.toISOString(), totalSeconds: 100, completed: false },
      ],
    };
    const stats = computeGlobalStats([{ problemName: "test", session }]);
    // Only today counts — 3 days ago is not consecutive
    expect(stats.currentStreakDays).toBe(1);
  });
});

// --- writeSession ---

describe("writeSession", () => {
  test("writes JSON to correct path", async () => {
    fs.promises = { writeFile: jest.fn().mockResolvedValue(undefined) };
    const data = { completed: true };
    await writeSession("test-problem", data, "/fake");
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem", "session.json"),
      JSON.stringify(data, null, 2),
      "utf8"
    );
  });

  test("skips write when one is pending", async () => {
    let resolveWrite;
    fs.promises = {
      writeFile: jest.fn().mockImplementation(
        () => new Promise((resolve) => { resolveWrite = resolve; })
      ),
    };
    const data = { completed: true };
    // First write starts
    const p1 = writeSession("test-problem", data, "/fake");
    // Second write should be skipped
    const p2 = writeSession("test-problem", data, "/fake");
    expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    resolveWrite();
    await p1;
  });
});

// --- writeSessionSync ---

describe("writeSessionSync", () => {
  test("writes JSON synchronously to correct path", () => {
    fs.writeFileSync.mockImplementation(() => {});
    const data = { completed: false };
    writeSessionSync("test-problem", data, "/fake");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem", "session.json"),
      JSON.stringify(data, null, 2),
      "utf8"
    );
  });
});
