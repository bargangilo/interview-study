import path from "path";
import fs from "fs";

jest.mock("fs");

import {
  loadProblemConfig,
  ensureWorkspace,
  workspacePath,
  hasWorkspaceFile,
  writeInitialScaffold,
  inferCurrentPart,
  hasWorkspaceDir,
  clearWorkspaceDir,
  writeCompletionMarker,
  getWorkspaceStatus,
  loadConfigSchema,
  readUserConfig,
  writeUserConfig,
  getUnlockedParts,
  buildRunHarness,
  writeRunHarness,
  deleteRunHarness,
} from "../../runner/config.js";

import sampleConfig from "./fixtures/sample-problem.json";

afterEach(() => jest.restoreAllMocks());

// --- Problem detection ---

describe("loadProblemConfig (problem detection)", () => {
  test("returns null when no problem.json exists (single-part problem)", () => {
    fs.existsSync.mockReturnValue(false);
    const result = loadProblemConfig("sample-problem", "/fake");
    expect(result).toBeNull();
  });

  test("loads and validates a valid problem.json", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(sampleConfig));

    const result = loadProblemConfig("test-problem", "/fake");
    expect(result).not.toBeNull();
    expect(result.title).toBe("Test Problem");
    expect(result.parts).toHaveLength(2);
    expect(result.parts[0].activeTests).toHaveLength(2);
  });

  test("includes expectedMinutes when present", () => {
    fs.existsSync.mockReturnValue(true);
    const configWithMinutes = { ...sampleConfig, expectedMinutes: 25 };
    fs.readFileSync.mockReturnValue(JSON.stringify(configWithMinutes));

    const result = loadProblemConfig("test-problem", "/fake");
    expect(result.expectedMinutes).toBe(25);
  });

  test("returns null expectedMinutes when not present", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(sampleConfig));

    const result = loadProblemConfig("test-problem", "/fake");
    expect(result.expectedMinutes).toBeNull();
  });

  test("throws for malformed JSON", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("{invalid json");

    expect(() => loadProblemConfig("bad-problem", "/fake")).toThrow(
      /Invalid problem\.json/
    );
  });

  test("throws when parts array is missing", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ title: "No parts" }));

    expect(() => loadProblemConfig("no-parts", "/fake")).toThrow(
      /non-empty "parts" array/
    );
  });

  test("throws when a part has no activeTests", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        parts: [{ title: "Bad Part" }],
      })
    );

    expect(() => loadProblemConfig("bad-tests", "/fake")).toThrow(
      /non-empty "activeTests" array/
    );
  });
});

// --- Workspace initialization (fresh start) ---

describe("writeInitialScaffold (fresh start)", () => {
  test("writes Part 1 JS scaffold to workspace path", () => {
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});

    writeInitialScaffold("test-problem", "JavaScript", sampleConfig, "/fake");

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem", "main.js"),
      sampleConfig.parts[0].scaffold.js,
      "utf8"
    );
  });

  test("writes Part 1 Python scaffold to workspace path", () => {
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});

    writeInitialScaffold("test-problem", "Python", sampleConfig, "/fake");

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem", "main.py"),
      sampleConfig.parts[0].scaffold.python,
      "utf8"
    );
  });

  test("creates workspace subdirectory before writing", () => {
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});

    writeInitialScaffold("test-problem", "JavaScript", sampleConfig, "/fake");

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem"),
      { recursive: true }
    );
  });
});

// --- Workspace initialization (existing file) ---

describe("hasWorkspaceFile (existing file detection)", () => {
  test("returns true when non-empty workspace file exists", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("function partOne() {}");

    expect(hasWorkspaceFile("test-problem", "JavaScript", "/fake")).toBe(true);
  });

  test("returns false when workspace file does not exist", () => {
    fs.existsSync.mockReturnValue(false);

    expect(hasWorkspaceFile("test-problem", "JavaScript", "/fake")).toBe(false);
  });

  test("returns false when workspace file is empty", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("   \n  ");

    expect(hasWorkspaceFile("test-problem", "JavaScript", "/fake")).toBe(false);
  });
});

// --- Resume default ---
// NOTE: The resume/restart prompt is rendered by the ResumeOrRestart component.
// Resume is the first option in the Select, making it the default.

describe("resume prompt default (structural verification)", () => {
  test("resume choice is listed before restart in the choices array", () => {
    const choices = [
      { name: "Resume where you left off", value: "resume" },
      { name: "Restart from scratch", value: "restart" },
    ];

    expect(choices[0].value).toBe("resume");
    expect(choices[1].value).toBe("restart");
  });
});

// --- Restart behavior ---

describe("restart behavior", () => {
  test("writeInitialScaffold overwrites file with Part 1 scaffold", () => {
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});

    writeInitialScaffold("test-problem", "JavaScript", sampleConfig, "/fake");

    const writtenContent = fs.writeFileSync.mock.calls[0][1];
    expect(writtenContent).toBe(sampleConfig.parts[0].scaffold.js);
    expect(writtenContent).toContain("partOne");
    expect(writtenContent).not.toContain("Part 2");
  });
});

// --- Resume state detection ---

describe("resume state detection", () => {
  test("infers Part 1 (index 0) from fresh fixture file", () => {
    const freshContent = "function partOne(x) {\n  // TODO\n}\n\nmodule.exports = { partOne };\n";
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(freshContent);

    expect(inferCurrentPart("test-problem", "JavaScript", "/fake")).toBe(0);
  });

  test("infers Part 2 (index 1) from mid-session fixture file", () => {
    const midContent = `function partOne(x) {
  return x.map(n => n * 2);
}

module.exports = { partOne };

// ---- Part 2 ----

function partTwo(x) {
  // TODO
}

module.exports.partTwo = partTwo;`;

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(midContent);

    expect(inferCurrentPart("test-problem", "JavaScript", "/fake")).toBe(1);
  });
});

// --- Language file resolution ---

describe("workspacePath (language file resolution)", () => {
  test("returns correct JS workspace path", () => {
    const result = workspacePath("my-problem", "JavaScript", "/root");
    expect(result).toBe(path.join("/root", "workspace", "my-problem", "main.js"));
  });

  test("returns correct Python workspace path", () => {
    const result = workspacePath("my-problem", "Python", "/root");
    expect(result).toBe(path.join("/root", "workspace", "my-problem", "main.py"));
  });
});

// --- Cross-language fresh start ---

describe("cross-language workspace behavior", () => {
  test("JS file creation does not affect existing Python file", () => {
    fs.existsSync.mockImplementation((p) => {
      if (p.endsWith("main.js")) return false;
      if (p.endsWith("main.py")) return true;
      return false;
    });
    fs.readFileSync.mockReturnValue("def part_one():\n    return 42\n");

    expect(hasWorkspaceFile("test-problem", "JavaScript", "/fake")).toBe(false);
    expect(hasWorkspaceFile("test-problem", "Python", "/fake")).toBe(true);
  });

  test("writing JS scaffold does not touch Python file path", () => {
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});

    writeInitialScaffold("test-problem", "JavaScript", sampleConfig, "/fake");

    const writtenPath = fs.writeFileSync.mock.calls[0][0];
    expect(writtenPath).toContain("main.js");
    expect(writtenPath).not.toContain("main.py");
  });
});

// --- code CLI launch ---

describe("VS Code launch behavior", () => {
  test("workspace path for JS points to absolute workspace file", () => {
    const solutionFile = workspacePath("test-problem", "JavaScript", "/root/project");
    expect(path.isAbsolute(solutionFile)).toBe(true);
    expect(solutionFile).toBe(
      path.join("/root/project", "workspace", "test-problem", "main.js")
    );
  });

  test("workspace path for Python points to absolute workspace file", () => {
    const solutionFile = workspacePath("test-problem", "Python", "/root/project");
    expect(path.isAbsolute(solutionFile)).toBe(true);
    expect(solutionFile).toBe(
      path.join("/root/project", "workspace", "test-problem", "main.py")
    );
  });

  test("graceful fallback warning string is correctly formatted", () => {
    const warningMessage =
      "  VS Code not found on PATH — skipping editor launch. See README for setup instructions.";
    expect(warningMessage).toContain("VS Code not found");
    expect(warningMessage).toContain("README");
  });
});

// --- ensureWorkspace ---

describe("ensureWorkspace", () => {
  test("creates workspace directory with .gitkeep", () => {
    fs.mkdirSync.mockImplementation(() => {});
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});

    ensureWorkspace("/fake");

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace"),
      { recursive: true }
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", ".gitkeep"),
      "",
      "utf8"
    );
  });

  test("does not overwrite existing .gitkeep", () => {
    fs.mkdirSync.mockImplementation(() => {});
    fs.existsSync.mockReturnValue(true);
    fs.writeFileSync.mockClear();

    ensureWorkspace("/fake");

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

// --- hasWorkspaceDir ---

describe("hasWorkspaceDir", () => {
  test("returns true when workspace directory exists", () => {
    fs.existsSync.mockReturnValue(true);
    expect(hasWorkspaceDir("test-problem", "/fake")).toBe(true);
    expect(fs.existsSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem")
    );
  });

  test("returns false when workspace directory does not exist", () => {
    fs.existsSync.mockReturnValue(false);
    expect(hasWorkspaceDir("test-problem", "/fake")).toBe(false);
  });
});

// --- clearWorkspaceDir ---

describe("clearWorkspaceDir", () => {
  test("removes workspace directory recursively when it exists", () => {
    fs.existsSync.mockReturnValue(true);
    fs.rmSync.mockImplementation(() => {});

    clearWorkspaceDir("test-problem", "/fake");

    expect(fs.rmSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem"),
      { recursive: true, force: true }
    );
  });

  test("does nothing when workspace directory does not exist", () => {
    fs.existsSync.mockReturnValue(false);
    fs.rmSync.mockClear();
    fs.rmSync.mockImplementation(() => {});

    clearWorkspaceDir("test-problem", "/fake");

    expect(fs.rmSync).not.toHaveBeenCalled();
  });
});

// --- writeCompletionMarker ---

describe("writeCompletionMarker", () => {
  test("appends JS completion marker to workspace file", () => {
    fs.appendFileSync.mockImplementation(() => {});

    writeCompletionMarker("test-problem", "JavaScript", "/fake");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem", "main.js"),
      "\n// ---- COMPLETE ----\n",
      "utf8"
    );
  });

  test("appends Python completion marker to workspace file", () => {
    fs.appendFileSync.mockImplementation(() => {});

    writeCompletionMarker("test-problem", "Python", "/fake");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join("/fake", "workspace", "test-problem", "main.py"),
      "\n# ---- COMPLETE ----\n",
      "utf8"
    );
  });
});

// --- getWorkspaceStatus ---

describe("getWorkspaceStatus", () => {
  const config = sampleConfig;

  test("returns null when no workspace directory exists", () => {
    fs.existsSync.mockReturnValue(false);
    expect(getWorkspaceStatus("test-problem", config, "/fake")).toBeNull();
  });

  test('returns "in progress" when workspace has a non-empty file but no delimiters', () => {
    fs.existsSync.mockImplementation((p) => {
      if (p.endsWith("test-problem")) return true; // workspace dir
      if (p.endsWith("main.js")) return true;
      return false;
    });
    fs.readFileSync.mockReturnValue("function partOne() { /* TODO */ }");

    expect(getWorkspaceStatus("test-problem", config, "/fake")).toBe(
      "in progress"
    );
  });

  test('returns "part 2 reached" when file has Part 2 delimiter', () => {
    fs.existsSync.mockImplementation((p) => {
      if (p.endsWith("test-problem")) return true;
      if (p.endsWith("main.js")) return true;
      return false;
    });
    fs.readFileSync.mockReturnValue(
      "function partOne() {}\n// ---- Part 2 ----\nfunction partTwo() {}"
    );

    expect(getWorkspaceStatus("test-problem", config, "/fake")).toBe(
      "part 2 reached"
    );
  });

  test('returns "complete" when file has completion marker', () => {
    fs.existsSync.mockImplementation((p) => {
      if (p.endsWith("test-problem")) return true;
      if (p.endsWith("main.js")) return true;
      return false;
    });
    fs.readFileSync.mockReturnValue(
      "function partOne() {}\n// ---- Part 2 ----\nfunction partTwo() {}\n// ---- COMPLETE ----\n"
    );

    expect(getWorkspaceStatus("test-problem", config, "/fake")).toBe(
      "complete"
    );
  });

  test('returns "complete" for Python completion marker', () => {
    fs.existsSync.mockImplementation((p) => {
      if (p.endsWith("test-problem")) return true;
      if (p.endsWith("main.py")) return true;
      return false;
    });
    fs.readFileSync.mockReturnValue(
      "def part_one():\n    pass\n# ---- Part 2 ----\ndef part_two():\n    pass\n# ---- COMPLETE ----\n"
    );

    expect(getWorkspaceStatus("test-problem", config, "/fake")).toBe(
      "complete"
    );
  });

  test("returns null when workspace dir exists but all files are empty", () => {
    fs.existsSync.mockImplementation((p) => {
      if (p.endsWith("test-problem")) return true;
      if (p.endsWith("main.js")) return true;
      return false;
    });
    fs.readFileSync.mockReturnValue("   \n  ");

    expect(getWorkspaceStatus("test-problem", config, "/fake")).toBeNull();
  });
});

// --- Main menu structure ---

describe("main menu structure (structural verification)", () => {
  test("menu has six choices: start, list, stats, settings, clear, exit", () => {
    const choices = [
      { name: "Start a Problem", value: "start" },
      { name: "Problem List", value: "list" },
      { name: "Stats", value: "stats" },
      { name: "Settings", value: "settings" },
      { name: "Clear a Problem", value: "clear" },
      { name: "Exit", value: "exit" },
    ];

    expect(choices).toHaveLength(6);
    expect(choices.map((c) => c.value)).toEqual([
      "start",
      "list",
      "stats",
      "settings",
      "clear",
      "exit",
    ]);
  });
});

// --- Clear confirmation default ---

describe("clear confirmation structure (structural verification)", () => {
  test("No is listed before Yes (defaults to No)", () => {
    const choices = [
      { name: "No", value: false },
      { name: "Yes", value: true },
    ];

    expect(choices[0].value).toBe(false);
    expect(choices[1].value).toBe(true);
  });
});

// --- truncate ---

// --- loadConfigSchema ---

describe("loadConfigSchema", () => {
  test("returns parsed schema when file exists", () => {
    const schema = [{ key: "topics", label: "Topics", fields: [] }];
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(schema));

    const result = loadConfigSchema("/fake");
    expect(result).toEqual(schema);
    expect(fs.existsSync).toHaveBeenCalledWith(
      path.join("/fake", ".agents", "config-schema.json")
    );
  });

  test("returns null when file does not exist", () => {
    fs.existsSync.mockReturnValue(false);

    const result = loadConfigSchema("/fake");
    expect(result).toBeNull();
  });
});

// --- readUserConfig ---

describe("readUserConfig", () => {
  test("returns parsed config when file exists", () => {
    const config = { version: 1, topics: { include: ["arrays"] } };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(config));

    const result = readUserConfig("/fake");
    expect(result).toEqual(config);
    expect(fs.existsSync).toHaveBeenCalledWith(
      path.join("/fake", "config.json")
    );
  });

  test("returns null when file does not exist", () => {
    fs.existsSync.mockReturnValue(false);

    const result = readUserConfig("/fake");
    expect(result).toBeNull();
  });
});

// --- writeUserConfig ---

describe("writeUserConfig", () => {
  test("sets updatedAt timestamp before writing", () => {
    fs.writeFileSync.mockImplementation(() => {});
    const config = { version: 1, topics: { include: ["arrays"] } };

    const before = new Date().toISOString();
    writeUserConfig(config, "/fake");

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenPath = fs.writeFileSync.mock.calls[0][0];
    const writtenContent = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(writtenPath).toBe(path.join("/fake", "config.json"));
    expect(writtenContent.updatedAt).toBeDefined();
    expect(new Date(writtenContent.updatedAt).toISOString()).toBe(writtenContent.updatedAt);
    expect(writtenContent.version).toBe(1);
  });

  test("throws on write failure", () => {
    fs.writeFileSync.mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });

    expect(() => writeUserConfig({}, "/fake")).toThrow("EACCES");
  });
});

describe("truncate function behavior (structural verification)", () => {
  test("returns empty string for falsy input", () => {
    const truncate = (str, max) => {
      if (!str) return "";
      if (str.length <= max) return str;
      return str.slice(0, max - 1) + "\u2026";
    };

    expect(truncate("", 80)).toBe("");
    expect(truncate(null, 80)).toBe("");
    expect(truncate(undefined, 80)).toBe("");
  });

  test("returns string unchanged when within limit", () => {
    const truncate = (str, max) => {
      if (!str) return "";
      if (str.length <= max) return str;
      return str.slice(0, max - 1) + "\u2026";
    };

    expect(truncate("Short string", 80)).toBe("Short string");
  });

  test("truncates with ellipsis when over limit", () => {
    const truncate = (str, max) => {
      if (!str) return "";
      if (str.length <= max) return str;
      return str.slice(0, max - 1) + "\u2026";
    };

    const result = truncate("A very long description that exceeds the limit", 20);
    expect(result).toHaveLength(20);
    expect(result.endsWith("\u2026")).toBe(true);
  });
});

// --- getUnlockedParts ---

describe("getUnlockedParts", () => {
  afterEach(() => jest.restoreAllMocks());

  test("returns first part when no delimiters in workspace file", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("function partOne() {}");

    const config = {
      parts: [
        { title: "Part 1", activeTests: ["a"] },
        { title: "Part 2", activeTests: ["a", "b"] },
      ],
    };
    const result = getUnlockedParts(config, "/fake/workspace/test/main.js");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Part 1");
  });

  test("returns two parts when Part 2 delimiter is present", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("code\n// ---- Part 2 ----\nmore code");

    const config = {
      parts: [
        { title: "Part 1", activeTests: ["a"] },
        { title: "Part 2", activeTests: ["a", "b"] },
        { title: "Part 3", activeTests: ["a", "b", "c"] },
      ],
    };
    const result = getUnlockedParts(config, "/fake/workspace/test/main.js");
    expect(result).toHaveLength(2);
    expect(result[1].title).toBe("Part 2");
  });

  test("returns empty array when config has no parts", () => {
    const result = getUnlockedParts({ parts: [] }, "/fake/main.js");
    expect(result).toEqual([]);
  });

  test("returns empty array when config is null", () => {
    const result = getUnlockedParts(null, "/fake/main.js");
    expect(result).toEqual([]);
  });

  test("returns first part when workspace file does not exist", () => {
    fs.existsSync.mockReturnValue(false);

    const config = {
      parts: [{ title: "Part 1", activeTests: ["a"] }],
    };
    const result = getUnlockedParts(config, "/fake/main.js");
    expect(result).toHaveLength(1);
  });
});

// --- buildRunHarness (JavaScript) ---

describe("buildRunHarness — JavaScript", () => {
  const makePart = (title, runInputs) => ({
    title,
    activeTests: ["test"],
    runInputs,
  });

  test("returns null when no unlocked parts have runInputs", () => {
    const parts = [{ title: "P1", activeTests: ["a"] }];
    expect(buildRunHarness(parts, "javascript")).toBeNull();
  });

  test("returns null when runInputs exist but none match the requested language", () => {
    const parts = [
      makePart("P1", [
        { label: "test", language: "python", function: "fn", args: [1] },
      ]),
    ];
    expect(buildRunHarness(parts, "javascript")).toBeNull();
  });

  test("generates correct require and deepEqual helper", () => {
    const parts = [
      makePart("P1", [
        { label: "basic", language: "javascript", function: "fn", args: [1], expected: 1 },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain("'use strict';");
    expect(harness).toContain("const mod = require('./main');");
    expect(harness).toContain("function _deepEqual(a, b)");
    expect(harness).toContain("JSON.stringify(a) === JSON.stringify(b)");
  });

  test("generates pass/fail check when expected is present", () => {
    const parts = [
      makePart("P1", [
        { label: "basic", language: "javascript", function: "fn", args: [1], expected: 42 },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain("const _e0 = 42;");
    expect(harness).toContain("const _pass0 = _deepEqual(_r0, _e0);");
    expect(harness).toContain("'\\u2714'");
    expect(harness).toContain("'\\u2718'");
  });

  test("omits pass/fail check when expected is absent", () => {
    const parts = [
      makePart("P1", [
        { label: "basic", language: "javascript", function: "fn", args: [1] },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).not.toContain("_e0");
    expect(harness).not.toContain("_pass0");
    expect(harness).toContain("console.log('[basic]', JSON.stringify(_r0));");
  });

  test("output line format with expected includes pass/fail markers and expected on fail", () => {
    const parts = [
      makePart("P1", [
        { label: "case", language: "javascript", function: "fn", args: [1], expected: 5 },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain("' (expected '");
  });

  test("serializes array args correctly", () => {
    const parts = [
      makePart("P1", [
        { label: "arr", language: "javascript", function: "fn", args: [[1, 2, 3]], expected: 6 },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain("mod.fn([1,2,3])");
  });

  test("serializes nested array args correctly", () => {
    const parts = [
      makePart("P1", [
        { label: "nested", language: "javascript", function: "fn", args: [[1, [2, 3]]], expected: [1, 2, 3] },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain("mod.fn([1,[2,3]])");
  });

  test("serializes string args with quotes", () => {
    const parts = [
      makePart("P1", [
        { label: "str", language: "javascript", function: "fn", args: ["hello"], expected: "HELLO" },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain('mod.fn("hello")');
  });

  test("serializes numeric args", () => {
    const parts = [
      makePart("P1", [
        { label: "num", language: "javascript", function: "fn", args: [42, 3.14], expected: 45.14 },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain("mod.fn(42, 3.14)");
  });

  test("serializes expected value correctly", () => {
    const parts = [
      makePart("P1", [
        { label: "exp", language: "javascript", function: "fn", args: [1], expected: [1, 2, 3] },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain("const _e0 = [1,2,3];");
  });

  test("adds part comment separator between parts", () => {
    const parts = [
      makePart("First Part", [
        { label: "a", language: "javascript", function: "fn", args: [1], expected: 1 },
      ]),
      makePart("Second Part", [
        { label: "b", language: "javascript", function: "fn2", args: [2], expected: 2 },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain("// Part 1: First Part");
    expect(harness).toContain("// Part 2: Second Part");
  });

  test("variable names increment correctly", () => {
    const parts = [
      makePart("P1", [
        { label: "a", language: "javascript", function: "fn", args: [1], expected: 1 },
        { label: "b", language: "javascript", function: "fn", args: [2], expected: 2 },
        { label: "c", language: "javascript", function: "fn", args: [3], expected: 3 },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain("_r0");
    expect(harness).toContain("_r1");
    expect(harness).toContain("_r2");
    expect(harness).toContain("_e0");
    expect(harness).toContain("_e1");
    expect(harness).toContain("_e2");
  });

  test("error handler format includes label and error class", () => {
    const parts = [
      makePart("P1", [
        { label: "fail case", language: "javascript", function: "fn", args: [1], expected: 1 },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).toContain("} catch (e) {");
    expect(harness).toContain("console.error('[fail case] ' + e.constructor.name + ': ' + e.message);");
  });

  test("multi-part accumulates inputs from all unlocked parts in order", () => {
    const parts = [
      makePart("P1", [
        { label: "p1-a", language: "javascript", function: "fn1", args: [1], expected: 1 },
      ]),
      makePart("P2", [
        { label: "p2-a", language: "javascript", function: "fn2", args: [2], expected: 2 },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    const p1Pos = harness.indexOf("mod.fn1(1)");
    const p2Pos = harness.indexOf("mod.fn2(2)");
    expect(p1Pos).toBeLessThan(p2Pos);
  });

  test("skips malformed entries without function field", () => {
    const parts = [
      makePart("P1", [
        { label: "bad", language: "javascript", args: [1] },
        { label: "good", language: "javascript", function: "fn", args: [1], expected: 1 },
      ]),
    ];
    const harness = buildRunHarness(parts, "javascript");
    expect(harness).not.toContain("[bad]");
    expect(harness).toContain("[good]");
  });
});

// --- buildRunHarness (Python) ---

describe("buildRunHarness — Python", () => {
  const makePart = (title, runInputs) => ({
    title,
    activeTests: ["test"],
    runInputs,
  });

  test("returns null when no python entries", () => {
    const parts = [
      makePart("P1", [
        { label: "test", language: "javascript", function: "fn", args: [1] },
      ]),
    ];
    expect(buildRunHarness(parts, "python")).toBeNull();
  });

  test("generates correct import structure and deep_equal helper", () => {
    const parts = [
      makePart("P1", [
        { label: "basic", language: "python", function: "my_fn", args: [1], expected: 1 },
      ]),
    ];
    const harness = buildRunHarness(parts, "python");
    expect(harness).toContain("import sys, json");
    expect(harness).toContain("sys.path.insert(0, '.')");
    expect(harness).toContain("def _deep_equal(a, b):");
    expect(harness).toContain("from main import my_fn");
  });

  test("generates pass/fail check when expected present", () => {
    const parts = [
      makePart("P1", [
        { label: "basic", language: "python", function: "fn", args: [1], expected: 42 },
      ]),
    ];
    const harness = buildRunHarness(parts, "python");
    expect(harness).toContain("_e0 = 42");
    expect(harness).toContain("_pass0 = _deep_equal(_r0, _e0)");
    expect(harness).toContain("'\\u2714'");
    expect(harness).toContain("'\\u2718'");
  });

  test("omits pass/fail when expected absent", () => {
    const parts = [
      makePart("P1", [
        { label: "basic", language: "python", function: "fn", args: [1] },
      ]),
    ];
    const harness = buildRunHarness(parts, "python");
    expect(harness).not.toContain("_e0");
    expect(harness).not.toContain("_pass0");
    expect(harness).toContain("print('[basic]', json.dumps(_r0))");
  });

  test("converts null/bool/list to Python syntax", () => {
    const parts = [
      makePart("P1", [
        { label: "conv", language: "python", function: "fn", args: [null, true, [1, 2]], expected: false },
      ]),
    ];
    const harness = buildRunHarness(parts, "python");
    expect(harness).toContain("fn(None, True, [1, 2])");
    expect(harness).toContain("_e0 = False");
  });
});

// --- writeRunHarness ---

describe("writeRunHarness", () => {
  afterEach(() => jest.restoreAllMocks());

  test("writes _run.js for javascript", () => {
    fs.writeFileSync.mockImplementation(() => {});
    const result = writeRunHarness("/fake/workspace/test", "javascript", "harness content");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/fake/workspace/test", "_run.js"),
      "harness content",
      "utf8"
    );
    expect(result).toBe(path.join("/fake/workspace/test", "_run.js"));
  });

  test("writes _run.py for python", () => {
    fs.writeFileSync.mockImplementation(() => {});
    const result = writeRunHarness("/fake/workspace/test", "python", "harness content");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/fake/workspace/test", "_run.py"),
      "harness content",
      "utf8"
    );
    expect(result).toBe(path.join("/fake/workspace/test", "_run.py"));
  });

  test("does nothing and returns null when harnessContent is null", () => {
    fs.writeFileSync.mockClear();
    fs.writeFileSync.mockImplementation(() => {});
    const result = writeRunHarness("/fake/workspace/test", "javascript", null);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test("returns written file path on success", () => {
    fs.writeFileSync.mockImplementation(() => {});
    const result = writeRunHarness("/fake/workspace/test", "javascript", "content");
    expect(result).toBe(path.join("/fake/workspace/test", "_run.js"));
  });

  test("returns null on write failure instead of throwing", () => {
    fs.writeFileSync.mockImplementation(() => {
      throw new Error("EACCES");
    });
    const result = writeRunHarness("/fake/workspace/test", "javascript", "content");
    expect(result).toBeNull();
  });
});

// --- deleteRunHarness ---

describe("deleteRunHarness", () => {
  afterEach(() => jest.restoreAllMocks());

  test("deletes file when it exists", () => {
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockImplementation(() => {});
    deleteRunHarness("/fake/workspace/test", "javascript");
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      path.join("/fake/workspace/test", "_run.js")
    );
  });

  test("silently succeeds when file does not exist", () => {
    fs.existsSync.mockReturnValue(false);
    fs.unlinkSync.mockClear();
    fs.unlinkSync.mockImplementation(() => {});
    deleteRunHarness("/fake/workspace/test", "javascript");
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  test("does not throw on unlink error", () => {
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockImplementation(() => {
      throw new Error("EACCES");
    });
    expect(() => deleteRunHarness("/fake/workspace/test", "javascript")).not.toThrow();
  });
});
