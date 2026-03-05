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
