import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import chokidar from "chokidar";
import { getMilestoneWarning } from "./format.js";
import {
  appendPartScaffold,
  buildTestFilter,
  loadRunnerConfig,
  writeCompletionMarker,
  getUnlockedParts,
  buildRunHarness,
  writeRunHarness,
} from "./config.js";

function parseJestJson(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    const passed = parsed.numPassedTests || 0;
    const failed = parsed.numFailedTests || 0;
    if (passed === 0 && failed === 0) return null;
    return { passed, total: passed + failed, jestJson: stdout };
  } catch {
    return null;
  }
}

function parsePytestOutput(stdout) {
  const passMatch = stdout.match(/(\d+) passed/);
  const failMatch = stdout.match(/(\d+) failed/);
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
  return { passed, total: passed + failed };
}

/**
 * Spawns a process with a timeout and collects stdout/stderr.
 * Returns a promise that resolves with { stdout, stderr, timedOut, crashed, exitCode }.
 */
function spawnWithTimeout(cmd, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, options);

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, timeoutMs);

    proc.on("close", (code, signal) => {
      clearTimeout(timeout);

      if (timedOut) {
        resolve({ stdout, stderr, timedOut: true, crashed: false, exitCode: null });
        return;
      }

      if (signal) {
        resolve({ stdout, stderr, timedOut: false, crashed: true, exitCode: null, signal });
        return;
      }

      resolve({ stdout, stderr, timedOut: false, crashed: code >= 2, exitCode: code });
    });

    proc.on("error", () => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, timedOut: false, crashed: true, exitCode: null });
    });
  });
}

/**
 * Runs the test suite (Jest or pytest) for a problem.
 * Returns { passed, total, timedOut, crashed, exitCode, timeoutSeconds }.
 */
async function runTestSuite(problem, language, rootDir, testFilter, runnerConfig) {
  let cmd, args, parser;

  if (language === "JavaScript") {
    cmd = "yarn";
    const testFile = testFilter
      ? path.join(rootDir, "problems", problem, "suite.test.js")
      : path.join(rootDir, "problems", problem, "sample.test.js");
    args = ["jest", testFile, "--no-coverage", "--testPathIgnorePatterns=[]", "--json"];
    if (testFilter) {
      args.push("--testNamePattern", testFilter);
    }
    parser = parseJestJson;
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

  const result = await spawnWithTimeout(cmd, args, {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  }, runnerConfig.testTimeoutSeconds * 1000);

  if (result.timedOut) {
    return {
      passed: 0,
      total: 0,
      timedOut: true,
      timeoutSeconds: runnerConfig.testTimeoutSeconds,
      jestJson: null,
    };
  }

  if (result.crashed) {
    return {
      passed: 0,
      total: 0,
      crashed: true,
      exitCode: result.exitCode,
      jestJson: null,
    };
  }

  const parsed = parser(language === "JavaScript" ? result.stdout : result.stdout + result.stderr);
  if (parsed) {
    return { ...parsed };
  }

  // For JS: if parser returned null, stdout was not valid JSON — treat as crash
  if (language === "JavaScript") {
    return { passed: 0, total: 0, crashed: true, exitCode: result.exitCode, jestJson: null };
  }
  return { passed: 0, total: 0, jestJson: null };
}

/**
 * Runs the harness file (_run.js or _run.py) for a problem.
 * Returns { skipped, stdout, stderr, timedOut, crashed, exitCode, ranAt }.
 */
async function runHarness(problem, language, rootDir, runnerConfig) {
  const ext = language === "JavaScript" ? "js" : "py";
  const harnessPath = path.join(rootDir, "workspace", problem, `_run.${ext}`);

  if (!fs.existsSync(harnessPath)) {
    return { skipped: true, stdout: "", stderr: "", timedOut: false, crashed: false, exitCode: null, ranAt: new Date().toISOString() };
  }

  const cmd = language === "JavaScript" ? "node" : "python3";
  const result = await spawnWithTimeout(cmd, [harnessPath], {
    cwd: path.join(rootDir, "workspace", problem),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  }, runnerConfig.testTimeoutSeconds * 1000);

  const ranAt = new Date().toISOString();

  if (result.timedOut) {
    return { skipped: false, stdout: "", stderr: "", timedOut: true, crashed: false, exitCode: null, ranAt };
  }

  if (result.crashed || (result.exitCode !== null && result.exitCode !== 0)) {
    return { skipped: false, stdout: result.stdout, stderr: result.stderr, timedOut: false, crashed: true, exitCode: result.exitCode, ranAt };
  }

  return { skipped: false, stdout: result.stdout, stderr: result.stderr, timedOut: false, crashed: false, exitCode: result.exitCode, ranAt };
}

/**
 * Starts watching a solution file and running the harness on save.
 *
 * @param {string} problem
 * @param {string} language
 * @param {string} rootDir
 * @param {object|null} config - Problem config with parts array, or null for single-part
 * @param {number} startPart - 0-indexed part to start from
 * @param {object|null} timerController
 * @param {object} callbacks - UI callbacks (all optional):
 *   onRunResult({ skipped, stdout, stderr, timedOut, crashed, exitCode, ranAt })
 *   onTestStart()
 *   onTestResult({ passed, total, timestamp, partInfo, timedOut?, timeoutSeconds?, crashed?, exitCode?, jestJson? })
 *   onPartAdvanced({ completedPart, nextTitle, nextDescription, splitSeconds })
 *   onAllComplete({ problem })
 *   onMilestone({ warning })
 *   onOvertime()
 *   onTimerTick({ timerDisplay, passed, total, timestamp, partInfo })
 *   onError(err)
 *
 * @returns {{ close, completionPromise, timerController, runTests }}
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

  // Debounce flags
  let _runInProgress = false;
  let _testRunInProgress = false;

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
    const onSave = async () => {
      if (_runInProgress) return;
      _runInProgress = true;
      try {
        const result = await runHarness(problem, language, rootDir, runnerConfig);
        if (callbacks.onRunResult) callbacks.onRunResult(result);
      } catch (err) {
        handleError(err);
      } finally {
        _runInProgress = false;
      }
    };

    const imperativeRunTests = async () => {
      if (_testRunInProgress) return;
      _testRunInProgress = true;
      try {
        if (callbacks.onTestStart) callbacks.onTestStart();
        const result = await runTestSuite(problem, language, rootDir, null, runnerConfig);
        lastPassed = result.passed;
        lastTotal = result.total;
        lastTimestamp = Date.now();
        if (callbacks.onTestResult) {
          callbacks.onTestResult({ ...result, timestamp: lastTimestamp, partInfo: null });
        }
      } catch (err) {
        handleError(err);
      } finally {
        _testRunInProgress = false;
      }
    };

    // Register timer tick callback
    if (timerController) {
      timerController.onTick((state) => {
        if (_runInProgress || _testRunInProgress) return;
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

    onSave();

    const watcher = chokidar.watch(filePath, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    watcher.on("change", onSave);

    return {
      close: () => {
        if (timerController) timerController.stop();
        return watcher.close();
      },
      completionPromise: new Promise(() => {}),
      timerController,
      runTests: imperativeRunTests,
    };
  }

  // --- Multi-part path ---
  let currentPart = startPart || 0;
  let ignoreNextChange = false;
  let _resolveCompletion;
  const completionPromise = new Promise((resolve) => {
    _resolveCompletion = resolve;
  });

  const onSave = async () => {
    if (_runInProgress) return;
    _runInProgress = true;
    try {
      const result = await runHarness(problem, language, rootDir, runnerConfig);
      if (callbacks.onRunResult) callbacks.onRunResult(result);
    } catch (err) {
      handleError(err);
    } finally {
      _runInProgress = false;
    }
  };

  const imperativeRunTests = async () => {
    if (_testRunInProgress) return;
    _testRunInProgress = true;

    try {
      let advancing = true;
      while (advancing) {
        advancing = false;
        if (callbacks.onTestStart) callbacks.onTestStart();

        const testFilter = buildTestFilter(
          config.parts[currentPart].activeTests,
          language
        );
        const result = await runTestSuite(
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

            // Regenerate run harness with new part's inputs
            const langKey = language === "JavaScript" ? "javascript" : "python";
            const updatedParts = getUnlockedParts(config, filePath);
            const updatedHarness = buildRunHarness(updatedParts, langKey);
            writeRunHarness(path.dirname(filePath), langKey, updatedHarness);

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
      _testRunInProgress = false;
    }
  };

  // Register timer tick callback
  if (timerController) {
    timerController.onTick((state) => {
      if (_runInProgress || _testRunInProgress) return;
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

  // Run harness once immediately
  onSave();

  const watcher = chokidar.watch(filePath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher.on("change", () => {
    if (ignoreNextChange) {
      ignoreNextChange = false;
      return;
    }
    onSave();
  });

  return {
    close: () => {
      if (timerController) timerController.stop();
      return watcher.close();
    },
    completionPromise,
    timerController,
    runTests: imperativeRunTests,
  };
}
