import path from "path";
import fs from "fs";

const CONFIG_SCHEMA_PATH = ".agents/config-schema.json";
const USER_CONFIG_PATH = "config.json";
const RUNNER_CONFIG_PATH = "runner.config.json";
const RUNNER_CONFIG_DEFAULTS = { testTimeoutSeconds: 20 };

const COMPLETION_MARKER_JS = "\n// ---- COMPLETE ----\n";
const COMPLETION_MARKER_PY = "\n# ---- COMPLETE ----\n";

/**
 * Loads and validates problem.json for a given problem.
 * Returns null if no problem.json exists (legacy single-part problem).
 * Throws a descriptive error if problem.json exists but is malformed.
 */
export function loadProblemConfig(problemName, rootDir) {
  const configPath = path.join(rootDir, "problems", problemName, "problem.json");
  if (!fs.existsSync(configPath)) {
    return null;
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    throw new Error(
      `Invalid problem.json for "${problemName}": ${err.message}\n` +
        `  See docs/problem-schema.md for the expected format.`
    );
  }

  if (!raw.parts || !Array.isArray(raw.parts) || raw.parts.length === 0) {
    throw new Error(
      `problem.json for "${problemName}" must have a non-empty "parts" array.\n` +
        `  See docs/problem-schema.md for the expected format.`
    );
  }

  for (let i = 0; i < raw.parts.length; i++) {
    const part = raw.parts[i];
    if (
      !part.activeTests ||
      !Array.isArray(part.activeTests) ||
      part.activeTests.length === 0
    ) {
      throw new Error(
        `Part ${i + 1} in problem.json for "${problemName}" must have a non-empty "activeTests" array.\n` +
          `  See docs/problem-schema.md for the expected format.`
      );
    }
  }

  return {
    title: raw.title || problemName,
    description: raw.description || "",
    expectedMinutes: raw.expectedMinutes || null,
    parts: raw.parts,
  };
}

/**
 * Ensures the workspace/ directory exists with a .gitkeep file.
 * Recreates it gracefully if missing.
 */
export function ensureWorkspace(rootDir) {
  const workspaceDir = path.join(rootDir, "workspace");
  fs.mkdirSync(workspaceDir, { recursive: true });
  const gitkeep = path.join(workspaceDir, ".gitkeep");
  if (!fs.existsSync(gitkeep)) {
    fs.writeFileSync(gitkeep, "", "utf8");
  }
}

/**
 * Returns the path to the working file in workspace/.
 */
export function workspacePath(problemName, language, rootDir) {
  const ext = language === "JavaScript" ? "js" : "py";
  return path.join(rootDir, "workspace", problemName, `main.${ext}`);
}

/**
 * Checks if a non-empty workspace file exists for the given problem and language.
 */
export function hasWorkspaceFile(problemName, language, rootDir) {
  const filePath = workspacePath(problemName, language, rootDir);
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  return content.trim().length > 0;
}

/**
 * Writes the initial scaffold (part 0) to the workspace file, overwriting it.
 */
export function writeInitialScaffold(problemName, language, config, rootDir) {
  const langKey = language === "JavaScript" ? "js" : "python";
  const filePath = workspacePath(problemName, language, rootDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const scaffold = config.parts[0].scaffold?.[langKey] || "";
  fs.writeFileSync(filePath, scaffold, "utf8");
}

/**
 * Appends the scaffold for a subsequent part to the workspace file with a delimiter.
 */
export function appendPartScaffold(problemName, language, config, partIndex, rootDir) {
  const filePath = workspacePath(problemName, language, rootDir);
  const langKey = language === "JavaScript" ? "js" : "python";
  const partNum = partIndex + 1;
  const delimiter =
    language === "JavaScript"
      ? `\n// ---- Part ${partNum} ----\n`
      : `\n# ---- Part ${partNum} ----\n`;
  const scaffold = config.parts[partIndex].scaffold?.[langKey] || "";
  fs.appendFileSync(filePath, delimiter + scaffold, "utf8");
}

/**
 * Infers the current part index by scanning the workspace file for part delimiter comments.
 * Returns 0 if no delimiters found (Part 1), otherwise the highest part index found.
 */
export function inferCurrentPart(problemName, language, rootDir) {
  const filePath = workspacePath(problemName, language, rootDir);
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, "utf8");
  const pattern =
    language === "JavaScript"
      ? /\/\/ ---- Part (\d+) ----/g
      : /# ---- Part (\d+) ----/g;
  let maxPart = 0;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const partNum = parseInt(match[1], 10);
    if (partNum > maxPart) maxPart = partNum;
  }
  // Part delimiters are 1-indexed (Part 2, Part 3, etc.) and mark the start of that part.
  // So if we found "Part 2", the user is on part index 1 (0-indexed).
  return maxPart > 0 ? maxPart - 1 : 0;
}

/**
 * Builds the test name filter string for the given active tests.
 * JS: regex pattern for --testNamePattern
 * Python: keyword expression for -k
 */
export function buildTestFilter(activeTests, language) {
  if (language === "JavaScript") {
    const escaped = activeTests.map((t) =>
      t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    return escaped.join("|");
  } else {
    const pyTests = activeTests.map((t) => t.replace(/ /g, "_"));
    return pyTests.join(" or ");
  }
}

/**
 * Checks if a workspace directory exists for the given problem.
 */
export function hasWorkspaceDir(problemName, rootDir) {
  const dir = path.join(rootDir, "workspace", problemName);
  return fs.existsSync(dir);
}

/**
 * Deletes the workspace directory for the given problem.
 */
export function clearWorkspaceDir(problemName, rootDir) {
  const dir = path.join(rootDir, "workspace", problemName);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Appends a completion marker to the workspace file.
 */
export function writeCompletionMarker(problemName, language, rootDir) {
  const filePath = workspacePath(problemName, language, rootDir);
  const marker =
    language === "JavaScript" ? COMPLETION_MARKER_JS : COMPLETION_MARKER_PY;
  fs.appendFileSync(filePath, marker, "utf8");
}

/**
 * Reads .agents/config-schema.json from repo root.
 * Returns parsed schema array, or null if file does not exist.
 */
export function loadConfigSchema(rootDir) {
  const schemaPath = path.join(rootDir, CONFIG_SCHEMA_PATH);
  if (!fs.existsSync(schemaPath)) return null;
  return JSON.parse(fs.readFileSync(schemaPath, "utf8"));
}

/**
 * Reads config.json from repo root.
 * Returns parsed config object, or null if file does not exist.
 */
export function readUserConfig(rootDir) {
  const configPath = path.join(rootDir, USER_CONFIG_PATH);
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

/**
 * Writes config.json to repo root.
 * Sets updatedAt to current ISO timestamp before writing.
 */
export function writeUserConfig(configObject, rootDir) {
  const configPath = path.join(rootDir, USER_CONFIG_PATH);
  const updated = { ...configObject, updatedAt: new Date().toISOString() };
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2) + "\n", "utf8");
}

/**
 * Reads runner.config.json from the repo root.
 * Returns the parsed config object.
 * Returns defaults if the file does not exist or is malformed.
 * Never throws.
 */
export function loadRunnerConfig(rootDir) {
  try {
    const configPath = path.join(rootDir, RUNNER_CONFIG_PATH);
    if (!fs.existsSync(configPath)) return { ...RUNNER_CONFIG_DEFAULTS };
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return { testTimeoutSeconds: raw.testTimeoutSeconds ?? RUNNER_CONFIG_DEFAULTS.testTimeoutSeconds };
  } catch {
    return { ...RUNNER_CONFIG_DEFAULTS };
  }
}

/**
 * Returns the unlocked parts from a problem config based on workspace file state.
 * Reads delimiter count from the workspace file to determine the current part index.
 * Returns parts[0..currentPart] inclusive.
 */
export function getUnlockedParts(problemConfig, workspaceMainPath) {
  if (!problemConfig || !problemConfig.parts || problemConfig.parts.length === 0) {
    return [];
  }
  let currentPart = 0;
  try {
    if (fs.existsSync(workspaceMainPath)) {
      const content = fs.readFileSync(workspaceMainPath, "utf8");
      const jsPattern = /\/\/ ---- Part (\d+) ----/g;
      const pyPattern = /# ---- Part (\d+) ----/g;
      let maxPart = 0;
      let match;
      while ((match = jsPattern.exec(content)) !== null) {
        const num = parseInt(match[1], 10);
        if (num > maxPart) maxPart = num;
      }
      while ((match = pyPattern.exec(content)) !== null) {
        const num = parseInt(match[1], 10);
        if (num > maxPart) maxPart = num;
      }
      if (maxPart > 0) currentPart = maxPart - 1;
    }
  } catch {
    // Fall back to part 0
  }
  return problemConfig.parts.slice(0, currentPart + 1);
}

/**
 * Builds a run harness file for executing runInputs on save.
 * Pure function — no I/O, no side effects.
 *
 * @param {object[]} unlockedParts - Part objects from problem.json (only unlocked parts)
 * @param {string} language - 'javascript' or 'python'
 * @returns {string|null} Complete harness file content, or null if no runInputs for the language
 */
export function buildRunHarness(unlockedParts, language) {
  if (!unlockedParts || unlockedParts.length === 0) return null;

  const langKey = language === "javascript" ? "javascript" : "python";
  const entries = [];

  for (let pi = 0; pi < unlockedParts.length; pi++) {
    const part = unlockedParts[pi];
    if (!part.runInputs || !Array.isArray(part.runInputs)) continue;
    for (const input of part.runInputs) {
      if (!input || input.language !== langKey) continue;
      if (!input.function || !input.label || !Array.isArray(input.args)) continue;
      entries.push({ ...input, partIndex: pi, partTitle: part.title || `Part ${pi + 1}` });
    }
  }

  if (entries.length === 0) return null;

  if (language === "javascript") {
    return buildJsHarness(entries);
  } else {
    return buildPyHarness(entries);
  }
}

function buildJsHarness(entries) {
  const lines = [
    "'use strict';",
    "const mod = require('./main');",
    "",
    "function _deepEqual(a, b) {",
    "  return JSON.stringify(a) === JSON.stringify(b);",
    "}",
  ];

  let lastPartIndex = -1;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.partIndex !== lastPartIndex) {
      lines.push("");
      lines.push(`// Part ${e.partIndex + 1}: ${e.partTitle}`);
      lastPartIndex = e.partIndex;
    }
    const argsStr = e.args.map((a) => JSON.stringify(a)).join(", ");
    const hasExpected = Object.prototype.hasOwnProperty.call(e, "expected");
    lines.push("try {");
    lines.push(`  const _r${i} = mod.${e.function}(${argsStr});`);
    if (hasExpected) {
      lines.push(`  const _e${i} = ${JSON.stringify(e.expected)};`);
      lines.push(`  const _pass${i} = _deepEqual(_r${i}, _e${i});`);
      lines.push(`  console.log('[${e.label}]', _pass${i} ? '\\u2714' : '\\u2718', JSON.stringify(_r${i}) + (`);
      lines.push(`    _pass${i} ? '' : ' (expected ' + JSON.stringify(_e${i}) + ')'`);
      lines.push(`  ));`);
    } else {
      lines.push(`  console.log('[${e.label}]', JSON.stringify(_r${i}));`);
    }
    lines.push("} catch (e) {");
    lines.push(`  console.error('[${e.label}] ' + e.constructor.name + ': ' + e.message);`);
    lines.push("}");
  }

  return lines.join("\n") + "\n";
}

function buildPyHarness(entries) {
  const lines = [
    "import sys, json",
    "sys.path.insert(0, '.')",
    "",
    "def _deep_equal(a, b):",
    "    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)",
  ];

  // Collect unique function names for imports
  const funcNames = [...new Set(entries.map((e) => e.function))];
  lines.push("");
  lines.push(`from main import ${funcNames.join(", ")}`);

  let lastPartIndex = -1;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.partIndex !== lastPartIndex) {
      lines.push("");
      lines.push(`# Part ${e.partIndex + 1}: ${e.partTitle}`);
      lastPartIndex = e.partIndex;
    }
    const argsStr = e.args.map((a) => jsonToPython(a)).join(", ");
    const hasExpected = Object.prototype.hasOwnProperty.call(e, "expected");
    lines.push("try:");
    lines.push(`    _r${i} = ${e.function}(${argsStr})`);
    if (hasExpected) {
      lines.push(`    _e${i} = ${jsonToPython(e.expected)}`);
      lines.push(`    _pass${i} = _deep_equal(_r${i}, _e${i})`);
      lines.push(`    _suffix${i} = '' if _pass${i} else ' (expected ' + json.dumps(_e${i}) + ')'`);
      lines.push(`    print('[${e.label}]', '\\u2714' if _pass${i} else '\\u2718', json.dumps(_r${i}) + _suffix${i})`);
    } else {
      lines.push(`    print('[${e.label}]', json.dumps(_r${i}))`);
    }
    lines.push("except Exception as e:");
    lines.push(`    print('[${e.label}] ' + type(e).__name__ + ': ' + str(e))`);
  }

  return lines.join("\n") + "\n";
}

function jsonToPython(value) {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => jsonToPython(v)).join(", ") + "]";
  }
  if (typeof value === "object") {
    const pairs = Object.entries(value).map(
      ([k, v]) => JSON.stringify(k) + ": " + jsonToPython(v)
    );
    return "{" + pairs.join(", ") + "}";
  }
  return JSON.stringify(value);
}

/**
 * Writes a run harness file to the workspace directory.
 * Returns the absolute path written, or null if harnessContent was null.
 * Never throws.
 */
export function writeRunHarness(workspacePath, language, harnessContent) {
  if (harnessContent == null) return null;
  try {
    const filename = language === "javascript" ? "_run.js" : "_run.py";
    const filePath = path.join(workspacePath, filename);
    fs.writeFileSync(filePath, harnessContent, "utf8");
    return filePath;
  } catch {
    return null;
  }
}

/**
 * Deletes the run harness file from the workspace directory.
 * Silently succeeds if the file does not exist.
 * Never throws.
 */
export function deleteRunHarness(workspacePath, language) {
  try {
    const filename = language === "javascript" ? "_run.js" : "_run.py";
    const filePath = path.join(workspacePath, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Silently ignore
  }
}

/**
 * Returns workspace status for a problem: null, "in progress", "part N reached", or "complete".
 * Scans all workspace files (JS and Python) for the highest progress.
 */
export function getWorkspaceStatus(problemName, config, rootDir) {
  if (!hasWorkspaceDir(problemName, rootDir)) return null;

  let maxPartNum = 0;
  let complete = false;

  for (const lang of ["JavaScript", "Python"]) {
    const filePath = workspacePath(problemName, lang, rootDir);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    if (content.trim().length === 0) continue;

    // Check for completion marker
    if (
      content.includes("// ---- COMPLETE ----") ||
      content.includes("# ---- COMPLETE ----")
    ) {
      complete = true;
    }

    // Scan for part delimiters
    const jsPattern = /\/\/ ---- Part (\d+) ----/g;
    const pyPattern = /# ---- Part (\d+) ----/g;
    let match;
    while ((match = jsPattern.exec(content)) !== null) {
      const num = parseInt(match[1], 10);
      if (num > maxPartNum) maxPartNum = num;
    }
    while ((match = pyPattern.exec(content)) !== null) {
      const num = parseInt(match[1], 10);
      if (num > maxPartNum) maxPartNum = num;
    }
  }

  if (complete) return "complete";
  if (maxPartNum > 0) return `part ${maxPartNum} reached`;

  // Check if any non-empty workspace file exists
  for (const lang of ["JavaScript", "Python"]) {
    if (hasWorkspaceFile(problemName, lang, rootDir)) return "in progress";
  }

  return null;
}
