const path = require("path");
const fs = require("fs");

/**
 * Loads and validates problem.json for a given problem.
 * Returns null if no problem.json exists (legacy single-part problem).
 * Throws a descriptive error if problem.json exists but is malformed.
 */
function loadProblemConfig(problemName, rootDir) {
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
    parts: raw.parts,
  };
}

/**
 * Ensures the workspace/ directory exists with a .gitkeep file.
 * Recreates it gracefully if missing.
 */
function ensureWorkspace(rootDir) {
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
function workspacePath(problemName, language, rootDir) {
  const ext = language === "JavaScript" ? "js" : "py";
  return path.join(rootDir, "workspace", problemName, `main.${ext}`);
}

/**
 * Checks if a non-empty workspace file exists for the given problem and language.
 */
function hasWorkspaceFile(problemName, language, rootDir) {
  const filePath = workspacePath(problemName, language, rootDir);
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  return content.trim().length > 0;
}

/**
 * Writes the initial scaffold (part 0) to the workspace file, overwriting it.
 */
function writeInitialScaffold(problemName, language, config, rootDir) {
  const langKey = language === "JavaScript" ? "js" : "python";
  const filePath = workspacePath(problemName, language, rootDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const scaffold = config.parts[0].scaffold?.[langKey] || "";
  fs.writeFileSync(filePath, scaffold, "utf8");
}

/**
 * Appends the scaffold for a subsequent part to the workspace file with a delimiter.
 */
function appendPartScaffold(problemName, language, config, partIndex, rootDir) {
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
function inferCurrentPart(problemName, language, rootDir) {
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
function buildTestFilter(activeTests, language) {
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

module.exports = {
  loadProblemConfig,
  ensureWorkspace,
  workspacePath,
  hasWorkspaceFile,
  writeInitialScaffold,
  appendPartScaffold,
  buildTestFilter,
  inferCurrentPart,
};
