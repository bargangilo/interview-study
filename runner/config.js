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
 * Writes the initial scaffold (part 0) to the solution file, overwriting it.
 */
function writeInitialScaffold(problemName, language, config, rootDir) {
  const ext = language === "JavaScript" ? "js" : "py";
  const langKey = language === "JavaScript" ? "js" : "python";
  const filePath = path.join(rootDir, "problems", problemName, `main.${ext}`);
  const scaffold = config.parts[0].scaffold?.[langKey] || "";
  fs.writeFileSync(filePath, scaffold, "utf8");
}

/**
 * Appends the scaffold for a subsequent part to the solution file with a delimiter.
 */
function appendPartScaffold(problemName, language, config, partIndex, rootDir) {
  const ext = language === "JavaScript" ? "js" : "py";
  const langKey = language === "JavaScript" ? "js" : "python";
  const filePath = path.join(rootDir, "problems", problemName, `main.${ext}`);
  const partNum = partIndex + 1;
  const delimiter =
    language === "JavaScript"
      ? `\n// ---- Part ${partNum} ----\n`
      : `\n# ---- Part ${partNum} ----\n`;
  const scaffold = config.parts[partIndex].scaffold?.[langKey] || "";
  fs.appendFileSync(filePath, delimiter + scaffold, "utf8");
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
  writeInitialScaffold,
  appendPartScaffold,
  buildTestFilter,
};
