import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

// babel-jest provides __dirname in CJS mode
const REPO_ROOT = path.resolve(".");
const SCRIPT = path.join(REPO_ROOT, ".agents", "scripts", "randomize-params.js");
const FIXTURES = path.join(REPO_ROOT, "tests", "scripts", "fixtures");
const CONFIG_FULL = path.join(FIXTURES, "config-full.json");

// Helper to run the script with given args
function runScript(args = [], env = {}) {
  return spawnSync("node", [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 10000,
  });
}

// Helper to parse output safely
function parseOutput(result) {
  return JSON.parse(result.stdout);
}

// Read the config for validation
const config = JSON.parse(fs.readFileSync(CONFIG_FULL, "utf8"));

// --- Tests ---

describe("randomize-params CLI output shape", () => {
  test("output contains all required fields", () => {
    const result = runScript(["--seed", "12345", "--config", CONFIG_FULL]);
    expect(result.status).toBe(0);

    const output = parseOutput(result);
    expect(output).toHaveProperty("topics");
    expect(output).toHaveProperty("partCount");
    expect(output).toHaveProperty("style");
    expect(output).toHaveProperty("difficulty");
    expect(output).toHaveProperty("difficulty.algorithmComplexity");
    expect(output).toHaveProperty("difficulty.dataStructureComplexity");
    expect(output).toHaveProperty("difficulty.problemComplexity");
    expect(output).toHaveProperty("difficulty.overall");
    expect(output).toHaveProperty("expectedMinutes");
    expect(output).toHaveProperty("seed");
  });

  test("topics array length is between 1 and min(3, topics.include.length)", () => {
    const result = runScript(["--seed", "42", "--config", CONFIG_FULL]);
    const output = parseOutput(result);

    const maxTopics = Math.min(3, config.topics.include.length);
    expect(output.topics.length).toBeGreaterThanOrEqual(1);
    expect(output.topics.length).toBeLessThanOrEqual(maxTopics);
  });

  test("all topics in output are from config.topics.include", () => {
    const result = runScript(["--seed", "99", "--config", CONFIG_FULL]);
    const output = parseOutput(result);

    for (const topic of output.topics) {
      expect(config.topics.include).toContain(topic);
    }
  });

  test("no topic from config.topics.avoid appears in output", () => {
    const result = runScript(["--seed", "77", "--config", CONFIG_FULL]);
    const output = parseOutput(result);

    for (const topic of output.topics) {
      expect(config.topics.avoid).not.toContain(topic);
    }
  });

  test("partCount is within parts.countRange and never exceeds maxPartsGlobal", () => {
    const result = runScript(["--seed", "200", "--config", CONFIG_FULL]);
    const output = parseOutput(result);

    expect(output.partCount).toBeGreaterThanOrEqual(config.parts.countRange[0]);
    const maxParts = Math.min(config.parts.countRange[1], config.parts.maxPartsGlobal);
    expect(output.partCount).toBeLessThanOrEqual(maxParts);
  });

  test("style is one of style.allowedStyles", () => {
    const result = runScript(["--seed", "300", "--config", CONFIG_FULL]);
    const output = parseOutput(result);

    expect(config.style.allowedStyles).toContain(output.style);
  });

  test("all difficulty dimension values are within their configured ranges", () => {
    const result = runScript(["--seed", "400", "--config", CONFIG_FULL]);
    const output = parseOutput(result);

    expect(output.difficulty.algorithmComplexity).toBeGreaterThanOrEqual(
      config.difficulty.algorithmComplexity[0]
    );
    expect(output.difficulty.algorithmComplexity).toBeLessThanOrEqual(
      config.difficulty.algorithmComplexity[1]
    );
    expect(output.difficulty.dataStructureComplexity).toBeGreaterThanOrEqual(
      config.difficulty.dataStructureComplexity[0]
    );
    expect(output.difficulty.dataStructureComplexity).toBeLessThanOrEqual(
      config.difficulty.dataStructureComplexity[1]
    );
    expect(output.difficulty.problemComplexity).toBeGreaterThanOrEqual(
      config.difficulty.problemComplexity[0]
    );
    expect(output.difficulty.problemComplexity).toBeLessThanOrEqual(
      config.difficulty.problemComplexity[1]
    );
  });

  test("overall equals round((algo * 0.3) + (ds * 0.3) + (problem * 0.4))", () => {
    const result = runScript(["--seed", "500", "--config", CONFIG_FULL]);
    const output = parseOutput(result);

    const expected = Math.round(
      output.difficulty.algorithmComplexity * 0.3 +
      output.difficulty.dataStructureComplexity * 0.3 +
      output.difficulty.problemComplexity * 0.4
    );
    expect(output.difficulty.overall).toBe(expected);
  });

  test("expectedMinutes is within expectedTimeRange", () => {
    const result = runScript(["--seed", "600", "--config", CONFIG_FULL]);
    const output = parseOutput(result);

    expect(output.expectedMinutes).toBeGreaterThanOrEqual(config.expectedTimeRange[0]);
    expect(output.expectedMinutes).toBeLessThanOrEqual(config.expectedTimeRange[1]);
  });
});

describe("randomize-params reproducibility", () => {
  test("same seed produces identical output on two consecutive runs", () => {
    const result1 = runScript(["--seed", "12345", "--config", CONFIG_FULL]);
    const result2 = runScript(["--seed", "12345", "--config", CONFIG_FULL]);

    expect(result1.stdout).toBe(result2.stdout);
  });

  test("different seeds produce different output", () => {
    const outputs = new Set();
    for (let i = 0; i < 20; i++) {
      const seed = 1000 + i * 7919; // distinct seeds
      const result = runScript(["--seed", String(seed), "--config", CONFIG_FULL]);
      outputs.add(result.stdout);
    }
    // Not all 20 should be identical
    expect(outputs.size).toBeGreaterThan(1);
  });
});

describe("randomize-params error handling", () => {
  test("missing config.json exits with code 1 and writes error to stderr", () => {
    const result = runScript(["--config", "/nonexistent/config.json"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("config.json not found");
  });

  test("malformed config.json exits with code 1 and writes descriptive error to stderr", () => {
    // Create a temp malformed config
    const tmpConfig = path.join(FIXTURES, "config-malformed.json");
    fs.writeFileSync(tmpConfig, "{not valid json!!!", "utf8");

    try {
      const result = runScript(["--config", tmpConfig]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("invalid JSON");
    } finally {
      fs.unlinkSync(tmpConfig);
    }
  });

  test("--config flag correctly resolves alternative config path", () => {
    const result = runScript(["--seed", "42", "--config", CONFIG_FULL]);
    expect(result.status).toBe(0);

    const output = parseOutput(result);
    expect(output.seed).toBe(42);
  });
});
