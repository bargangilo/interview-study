import path from "path";
import fs from "fs";

jest.mock("fs");
jest.mock("child_process");
jest.mock("chokidar");

import {
  buildTestFilter,
  inferCurrentPart,
  appendPartScaffold,
  writeCompletionMarker,
} from "../../runner/config.js";

import sampleConfig from "./fixtures/sample-problem.json";

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
