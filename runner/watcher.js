import path from "path";
import { spawn } from "child_process";
import chokidar from "chokidar";
import { getMilestoneWarning, parseConsoleOutput, parsePytestConsoleOutput } from "./format.js";
import {
  appendPartScaffold,
  buildTestFilter,
  loadRunnerConfig,
  writeCompletionMarker,
} from "./config.js";

function parseJestOutput(stdout) {
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
  const passMatch = stdout.match(/(\d+) passed/);
  const failMatch = stdout.match(/(\d+) failed/);
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
  return { passed, total: passed + failed };
}

function runTests(problem, language, rootDir, testFilter, runnerConfig) {
  return new Promise((resolve) => {
    let cmd, args, parser;

    if (language === "JavaScript") {
      cmd = "yarn";
      const testFile = testFilter
        ? path.join(rootDir, "problems", problem, "suite.test.js")
        : path.join(rootDir, "problems", problem, "sample.test.js");
      args = ["jest", testFile, "--no-coverage", "--testPathIgnorePatterns=[]"];
      if (testFilter) {
        args.push("--testNamePattern", testFilter);
      }
      parser = parseJestOutput;
    } else {
      const testFile = testFilter
        ? path.join(rootDir, "problems", problem, "suite.test.py")
        : path.join(rootDir, "problems", problem, "test_sample.py");
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
    let timedOut = false;

    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => (output += d.toString()));

    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, runnerConfig.testTimeoutSeconds * 1000);

    proc.on("close", (code, signal) => {
      clearTimeout(timeout);

      if (timedOut) {
        resolve({
          passed: 0,
          total: 0,
          timedOut: true,
          timeoutSeconds: runnerConfig.testTimeoutSeconds,
          consoleOutput: [],
        });
        return;
      }

      if (signal) {
        resolve({
          passed: 0,
          total: 0,
          crashed: true,
          exitCode: null,
          signal,
          consoleOutput: [],
        });
        return;
      }

      if (code >= 2) {
        resolve({
          passed: 0,
          total: 0,
          crashed: true,
          exitCode: code,
          consoleOutput: [],
        });
        return;
      }

      // Exit code 0 (all pass) or 1 (some fail) — parse results
      const consoleOutput = language === "JavaScript"
        ? parseConsoleOutput(output)
        : parsePytestConsoleOutput(output);
      const result = parser(output);
      if (result) {
        resolve({ ...result, consoleOutput });
      } else {
        resolve({ passed: 0, total: 0, consoleOutput });
      }
    });

    proc.on("error", () => {
      clearTimeout(timeout);
      resolve({ passed: 0, total: 0, consoleOutput: [] });
    });
  });
}

/**
 * Starts watching a solution file and running tests on save.
 *
 * @param {string} problem
 * @param {string} language
 * @param {string} rootDir
 * @param {object|null} config - Problem config with parts array, or null for single-part
 * @param {number} startPart - 0-indexed part to start from
 * @param {object|null} timerController
 * @param {object} callbacks - UI callbacks (all optional):
 *   onTestStart()
 *   onTestResult({ passed, total, timestamp, partInfo, consoleOutput, timedOut?, timeoutSeconds?, crashed?, exitCode? })
 *   onPartAdvanced({ completedPart, nextTitle, nextDescription, splitSeconds })
 *   onAllComplete({ problem })
 *   onMilestone({ warning })
 *   onOvertime()
 *   onTimerTick({ timerDisplay, passed, total, timestamp, partInfo })
 *   onError(err)
 */
export function startWatching(problem, language, rootDir, config, startPart, timerController, callbacks = {}) {
  const runnerConfig = loadRunnerConfig(rootDir);
  const ext = language === "JavaScript" ? "js" : "py";
  const filePath = path.join(rootDir, "workspace", problem, `main.${ext}`);

  // Track last test results for timer tick redraws
  let lastPassed = 0;
  let lastTotal = 0;
  let lastTimestamp = Date.now();
  let lastPartInfo = null;

  // Milestone dedup tracking
  const firedMilestones = new Set();
  let overtimeNotified = false;

  function checkMilestones(state) {
    if (state.isPaused) return;
    const warning = getMilestoneWarning(state.totalElapsedSeconds, state.mode, state.countdownSeconds);
    if (warning && !firedMilestones.has(warning)) {
      firedMilestones.add(warning);
      if (callbacks.onMilestone) callbacks.onMilestone({ warning });
    }
    if (state.isOvertime && !overtimeNotified) {
      overtimeNotified = true;
      if (callbacks.onOvertime) callbacks.onOvertime();
    }
  }

  function handleError(err) {
    if (callbacks.onError) {
      callbacks.onError(err);
    } else {
      console.error("Watcher error:", err);
    }
  }

  // --- Legacy path (no config / single-part) ---
  if (!config) {
    let running = false;

    const run = async () => {
      if (running) return;
      running = true;
      try {
        if (callbacks.onTestStart) callbacks.onTestStart();
        const result = await runTests(problem, language, rootDir, null, runnerConfig);
        lastPassed = result.passed;
        lastTotal = result.total;
        lastTimestamp = Date.now();
        if (callbacks.onTestResult) {
          callbacks.onTestResult({ ...result, timestamp: lastTimestamp, partInfo: null });
        }
      } catch (err) {
        handleError(err);
      } finally {
        running = false;
      }
    };

    // Register timer tick callback
    if (timerController) {
      timerController.onTick((state) => {
        if (running) return;
        checkMilestones(state);
        if (callbacks.onTimerTick) {
          callbacks.onTimerTick({
            timerDisplay: state,
            passed: lastPassed,
            total: lastTotal,
            timestamp: lastTimestamp,
            partInfo: null,
          });
        }
      });
    }

    run();

    const watcher = chokidar.watch(filePath, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    watcher.on("change", run);

    return {
      close: () => {
        if (timerController) timerController.stop();
        return watcher.close();
      },
      completionPromise: new Promise(() => {}),
      timerController,
    };
  }

  // --- Multi-part path ---
  let currentPart = startPart || 0;
  let running = false;
  let ignoreNextChange = false;
  let _resolveCompletion;
  const completionPromise = new Promise((resolve) => {
    _resolveCompletion = resolve;
  });

  const run = async () => {
    if (running) return;
    running = true;

    try {
      let advancing = true;
      while (advancing) {
        advancing = false;
        if (callbacks.onTestStart) callbacks.onTestStart();

        const testFilter = buildTestFilter(
          config.parts[currentPart].activeTests,
          language
        );
        const result = await runTests(
          problem,
          language,
          rootDir,
          testFilter,
          runnerConfig
        );
        lastPassed = result.passed;
        lastTotal = result.total;
        lastTimestamp = Date.now();
        lastPartInfo = {
          current: currentPart + 1,
          unlocked: currentPart + 1,
        };
        if (callbacks.onTestResult) {
          callbacks.onTestResult({ ...result, timestamp: lastTimestamp, partInfo: lastPartInfo });
        }

        if (result.passed === result.total && result.total > 0) {
          const nextPart = currentPart + 1;
          if (nextPart >= config.parts.length) {
            // All parts complete
            ignoreNextChange = true;
            writeCompletionMarker(problem, language, rootDir);
            if (timerController) timerController.stop();
            if (callbacks.onAllComplete) callbacks.onAllComplete({ problem });
            _resolveCompletion();
          } else {
            // Advance to next part
            ignoreNextChange = true;
            appendPartScaffold(problem, language, config, nextPart, rootDir);
            const splitSeconds = timerController ? timerController.splitPart() : null;
            currentPart = nextPart;
            if (callbacks.onPartAdvanced) {
              callbacks.onPartAdvanced({
                completedPart: currentPart, // 1-indexed (currentPart was just incremented)
                nextTitle: config.parts[currentPart].title,
                nextDescription: config.parts[currentPart].description,
                splitSeconds,
              });
            }
            advancing = true; // re-run with new filter
          }
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      running = false;
    }
  };

  // Register timer tick callback
  if (timerController) {
    timerController.onTick((state) => {
      if (running) return;
      checkMilestones(state);
      if (callbacks.onTimerTick) {
        callbacks.onTimerTick({
          timerDisplay: state,
          passed: lastPassed,
          total: lastTotal,
          timestamp: lastTimestamp,
          partInfo: lastPartInfo,
        });
      }
    });
  }

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
    close: () => {
      if (timerController) timerController.stop();
      return watcher.close();
    },
    completionPromise,
    timerController,
  };
}
