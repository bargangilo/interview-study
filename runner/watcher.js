const path = require("path");
const { spawn } = require("child_process");
const chokidar = require("chokidar");
const { showSummary, showWatching, showRunning } = require("./ui");

function parseJestOutput(stdout) {
  // Jest summary line: Tests: X passed, Y total  or  Tests: X failed, Y passed, Z total
  const match = stdout.match(
    /Tests:\s+(?:(\d+) failed,\s+)?(\d+) passed,\s+(\d+) total/
  );
  if (match) {
    const passed = parseInt(match[2], 10);
    const total = parseInt(match[3], 10);
    return { passed, total };
  }
  // All failed: Tests: X failed, Y total
  const failMatch = stdout.match(/Tests:\s+(\d+) failed,\s+(\d+) total/);
  if (failMatch) {
    return { passed: 0, total: parseInt(failMatch[2], 10) };
  }
  return null;
}

function parsePytestOutput(stdout) {
  // pytest summary: "X passed" or "X failed, Y passed" or "X failed"
  const passMatch = stdout.match(/(\d+) passed/);
  const failMatch = stdout.match(/(\d+) failed/);
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
  return { passed, total: passed + failed };
}

function runTests(problem, language, rootDir) {
  return new Promise((resolve) => {
    let cmd, args, parser;

    if (language === "JavaScript") {
      cmd = "yarn";
      args = [
        "jest",
        path.join(rootDir, "tests", problem, "sample.test.js"),
        "--no-coverage",
      ];
      parser = parseJestOutput;
    } else {
      cmd = "pytest";
      args = [path.join(rootDir, "tests", problem, "test_sample.py"), "-v"];
      parser = parsePytestOutput;
    }

    const proc = spawn(cmd, args, {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    let output = "";
    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => (output += d.toString()));

    proc.on("close", () => {
      const result = parser(output);
      if (result) {
        resolve(result);
      } else {
        resolve({ passed: 0, total: 0 });
      }
    });

    proc.on("error", () => {
      resolve({ passed: 0, total: 0 });
    });
  });
}

function startWatching(problem, language, rootDir) {
  const ext = language === "JavaScript" ? "js" : "py";
  const filePath = path.join(rootDir, "problems", problem, `main.${ext}`);

  showWatching(problem, language);

  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    showRunning();
    const { passed, total } = await runTests(problem, language, rootDir);
    showSummary(passed, total, Date.now());
    running = false;
  };

  // Run tests once immediately
  run();

  const watcher = chokidar.watch(filePath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher.on("change", run);

  return watcher;
}

module.exports = { startWatching };
