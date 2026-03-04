const path = require("path");
const { spawn } = require("child_process");
const chokidar = require("chokidar");
const {
  showSummary,
  showWatching,
  showRunning,
  showPartComplete,
  showAllComplete,
} = require("./ui");
const { appendPartScaffold, buildTestFilter } = require("./config");

function parseJestOutput(stdout) {
  // Extract the Tests summary line, then parse passed/failed independently.
  // This handles all Jest formats including skipped tests from --testNamePattern.
  const testsLine = stdout.match(/Tests:.*$/m);
  if (!testsLine) return null;

  const line = testsLine[0];
  const passMatch = line.match(/(\d+) passed/);
  const failMatch = line.match(/(\d+) failed/);

  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;

  if (passed === 0 && failed === 0) return null;

  return { passed, total: passed + failed };
}

function parsePytestOutput(stdout) {
  // pytest summary: "X passed" or "X failed, Y passed" or "X failed"
  const passMatch = stdout.match(/(\d+) passed/);
  const failMatch = stdout.match(/(\d+) failed/);
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
  return { passed, total: passed + failed };
}

function runTests(problem, language, rootDir, testFilter) {
  return new Promise((resolve) => {
    let cmd, args, parser;

    if (language === "JavaScript") {
      cmd = "yarn";
      const testFile = testFilter
        ? path.join(rootDir, "tests", problem, "suite.test.js")
        : path.join(rootDir, "tests", problem, "sample.test.js");
      args = ["jest", testFile, "--no-coverage"];
      if (testFilter) {
        args.push("--testNamePattern", testFilter);
      }
      parser = parseJestOutput;
    } else {
      const testFile = testFilter
        ? path.join(rootDir, "tests", problem, "suite.test.py")
        : path.join(rootDir, "tests", problem, "test_sample.py");
      cmd = "pytest";
      args = [testFile, "-v"];
      if (testFilter) {
        args.push("-k", testFilter, "--import-mode=importlib");
      }
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

function startWatching(problem, language, rootDir, config) {
  const ext = language === "JavaScript" ? "js" : "py";
  const filePath = path.join(rootDir, "problems", problem, `main.${ext}`);

  // --- Legacy path (no config / single-part) ---
  if (!config) {
    showWatching(problem, language);

    let running = false;

    const run = async () => {
      if (running) return;
      running = true;
      showRunning();
      const { passed, total } = await runTests(problem, language, rootDir, null);
      showSummary(passed, total, Date.now());
      running = false;
    };

    run();

    const watcher = chokidar.watch(filePath, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    watcher.on("change", run);

    return {
      close: () => watcher.close(),
      completionPromise: new Promise(() => {}),
    };
  }

  // --- Multi-part path ---
  showWatching(problem, language);

  let currentPart = 0;
  let running = false;
  let ignoreNextChange = false;
  let _resolveCompletion;
  const completionPromise = new Promise((resolve) => {
    _resolveCompletion = resolve;
  });

  const run = async () => {
    if (running) return;
    running = true;

    let advancing = true;
    while (advancing) {
      advancing = false;
      showRunning();

      const testFilter = buildTestFilter(
        config.parts[currentPart].activeTests,
        language
      );
      const { passed, total } = await runTests(
        problem,
        language,
        rootDir,
        testFilter
      );
      showSummary(passed, total, Date.now(), {
        current: currentPart + 1,
        unlocked: currentPart + 1,
      });

      if (passed === total && total > 0) {
        const nextPart = currentPart + 1;
        if (nextPart >= config.parts.length) {
          // All parts complete
          showAllComplete(problem);
          _resolveCompletion();
        } else {
          // Advance to next part
          ignoreNextChange = true;
          appendPartScaffold(problem, language, config, nextPart, rootDir);
          currentPart = nextPart;
          showPartComplete(
            currentPart, // display as 1-indexed (currentPart was just incremented)
            config.parts[currentPart].title,
            config.parts[currentPart].description
          );
          advancing = true; // re-run with new filter
        }
      }
    }

    running = false;
  };

  // Run tests once immediately
  run();

  const watcher = chokidar.watch(filePath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher.on("change", () => {
    if (ignoreNextChange) {
      ignoreNextChange = false;
      return;
    }
    run();
  });

  return {
    close: () => watcher.close(),
    completionPromise,
  };
}

module.exports = { startWatching };
