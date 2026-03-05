import fs from "fs";

jest.mock("fs");

import { computeTopicWeights } from "../../.agents/scripts/topic-weights.js";

import problemArrays from "./fixtures/problem-arrays.json";
import problemHashmaps from "./fixtures/problem-hashmaps.json";
import sessionCompleted from "./fixtures/session-completed.json";
import sessionFailed from "./fixtures/session-failed.json";
import sessionOldCompleted from "./fixtures/session-old-completed.json";

// Fix Date.now() to 2026-03-04T12:00:00.000Z so 7-day window is deterministic
const FIXED_NOW = new Date("2026-03-04T12:00:00.000Z").getTime();

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
});

afterEach(() => jest.restoreAllMocks());

// --- Helper to set up mock filesystem ---

function mockProblemsDir(problems) {
  // problems: [{ name, config, session }]
  fs.existsSync.mockImplementation((p) => {
    if (p.endsWith("problems")) return problems.length > 0;
    for (const prob of problems) {
      if (p.endsWith(`problems/${prob.name}/problem.json`)) return true;
      if (p.endsWith(`workspace/${prob.name}/session.json`)) return !!prob.session;
    }
    return false;
  });

  fs.readdirSync.mockImplementation((dir) => {
    if (typeof dir === "string" && dir.endsWith("problems")) {
      return problems.map((p) => ({
        name: p.name,
        isDirectory: () => true,
      }));
    }
    return [];
  });

  fs.readFileSync.mockImplementation((p) => {
    for (const prob of problems) {
      if (typeof p === "string" && p.includes(`problems/${prob.name}/problem.json`)) {
        return JSON.stringify(prob.config);
      }
      if (typeof p === "string" && p.includes(`workspace/${prob.name}/session.json`)) {
        if (prob.session) return JSON.stringify(prob.session);
      }
    }
    throw new Error("ENOENT");
  });
}

// --- Tests ---

describe("computeTopicWeights", () => {
  test("equal weights returned when no problem files exist", () => {
    fs.existsSync.mockReturnValue(false);

    const weights = computeTopicWeights(
      ["arrays", "trees", "strings"],
      [],
      "/fake/problems",
      "/fake/workspace"
    );

    const values = Object.values(weights);
    expect(values.length).toBe(3);
    // All should be equal (each gets +0.30 novelty bump, same base)
    const first = values[0];
    for (const v of values) {
      expect(v).toBeCloseTo(first, 5);
    }
    // Should sum to 1.0
    expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 3);
  });

  test("topic in avoid list gets weight 0 regardless of history", () => {
    mockProblemsDir([]);

    const weights = computeTopicWeights(
      ["arrays", "hash maps", "trees"],
      ["arrays"],
      "/fake/problems",
      "/fake/workspace"
    );

    expect(weights["arrays"]).toBeUndefined(); // excluded from output
    expect(weights["hash maps"]).toBeDefined();
    expect(weights["trees"]).toBeDefined();
  });

  test("topic with recent completion gets lower weight than topic with no history", () => {
    mockProblemsDir([
      { name: "array-prob", config: problemArrays, session: sessionCompleted },
    ]);

    const weights = computeTopicWeights(
      ["arrays", "trees"],
      [],
      "/fake/problems",
      "/fake/workspace"
    );

    // "trees" has no problems — gets novelty bump
    // "arrays" has a recent completed attempt — gets penalty
    expect(weights["trees"]).toBeGreaterThan(weights["arrays"]);
  });

  test("topic with failed attempts gets higher weight than topic with no history", () => {
    mockProblemsDir([
      { name: "hashmap-prob", config: problemHashmaps, session: sessionFailed },
    ]);

    const weights = computeTopicWeights(
      ["hash maps", "trees"],
      [],
      "/fake/problems",
      "/fake/workspace"
    );

    // "hash maps" has 2 failed attempts: base 1.0 + 0.20 + 0.20 = 1.40
    // "trees" has no problems: base 1.0 + 0.30 = 1.30
    expect(weights["hash maps"]).toBeGreaterThan(weights["trees"]);
  });

  test("completed attempt older than 7 days does not apply recency penalty", () => {
    mockProblemsDir([
      { name: "array-prob", config: problemArrays, session: sessionOldCompleted },
    ]);

    const weights = computeTopicWeights(
      ["arrays", "trees"],
      [],
      "/fake/problems",
      "/fake/workspace"
    );

    // Old completed attempt should not penalize — "arrays" base stays at 1.0
    // "trees" gets novelty bump 1.0 + 0.30 = 1.30
    // "arrays" should be close to 1.0 / (1.0 + 1.30) since no penalty applied
    // Just verify arrays isn't penalized below what it would be with a recent completion
    const arraysRawWeight = 1.0; // no penalty for old completion
    const treesRawWeight = 1.3; // novelty bump
    const expectedArraysNorm = arraysRawWeight / (arraysRawWeight + treesRawWeight);
    expect(weights["arrays"]).toBeCloseTo(expectedArraysNorm, 3);
  });

  test("all weights sum to 1.0", () => {
    mockProblemsDir([
      { name: "array-prob", config: problemArrays, session: sessionCompleted },
      { name: "hashmap-prob", config: problemHashmaps, session: sessionFailed },
    ]);

    const weights = computeTopicWeights(
      ["arrays", "hash maps", "trees", "strings", "dynamic programming"],
      [],
      "/fake/problems",
      "/fake/workspace"
    );

    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });

  test("topic with both failures and recent completions: net weight computed correctly", () => {
    // Create a session with both completed and failed attempts
    const mixedSession = {
      attempts: [
        { date: "2026-03-01T10:00:00.000Z", totalSeconds: 500, completed: false },
        { date: "2026-03-02T10:00:00.000Z", totalSeconds: 900, completed: true },
        { date: "2026-03-03T10:00:00.000Z", totalSeconds: 600, completed: false },
      ],
    };

    mockProblemsDir([
      { name: "array-prob", config: problemArrays, session: mixedSession },
    ]);

    const weights = computeTopicWeights(
      ["arrays", "trees"],
      [],
      "/fake/problems",
      "/fake/workspace"
    );

    // "arrays": base 1.0 + (-0.15 for recent completion) + (0.20 for fail) + (0.20 for fail) = 1.25
    // "trees": base 1.0 + 0.30 (novelty) = 1.30
    const expectedArraysRaw = 1.25;
    const expectedTreesRaw = 1.30;
    const total = expectedArraysRaw + expectedTreesRaw;
    expect(weights["arrays"]).toBeCloseTo(expectedArraysRaw / total, 3);
    expect(weights["trees"]).toBeCloseTo(expectedTreesRaw / total, 3);
  });

  test("empty topics array returns empty object", () => {
    const weights = computeTopicWeights([], [], "/fake/problems", "/fake/workspace");
    expect(weights).toEqual({});
  });

  test("malformed session.json is skipped silently", () => {
    fs.existsSync.mockImplementation((p) => {
      if (typeof p === "string" && p.endsWith("problems")) return true;
      if (typeof p === "string" && p.includes("problem.json")) return true;
      if (typeof p === "string" && p.includes("session.json")) return true;
      return false;
    });

    fs.readdirSync.mockReturnValue([
      { name: "array-prob", isDirectory: () => true },
    ]);

    fs.readFileSync.mockImplementation((p) => {
      if (typeof p === "string" && p.includes("problem.json")) {
        return JSON.stringify(problemArrays);
      }
      if (typeof p === "string" && p.includes("session.json")) {
        return "{invalid json!!!";
      }
      throw new Error("ENOENT");
    });

    expect(() => {
      computeTopicWeights(["arrays"], [], "/fake/problems", "/fake/workspace");
    }).not.toThrow();

    const weights = computeTopicWeights(["arrays"], [], "/fake/problems", "/fake/workspace");
    expect(weights["arrays"]).toBeDefined();
  });

  test("malformed problem.json is skipped silently", () => {
    fs.existsSync.mockImplementation((p) => {
      if (typeof p === "string" && p.endsWith("problems")) return true;
      return false;
    });

    fs.readdirSync.mockReturnValue([
      { name: "bad-prob", isDirectory: () => true },
    ]);

    fs.readFileSync.mockImplementation(() => {
      return "not valid json {{{";
    });

    expect(() => {
      computeTopicWeights(["arrays"], [], "/fake/problems", "/fake/workspace");
    }).not.toThrow();

    const weights = computeTopicWeights(["arrays"], [], "/fake/problems", "/fake/workspace");
    // "arrays" has no valid problem files — gets novelty bump
    expect(weights["arrays"]).toBeCloseTo(1.0, 3);
  });
});
