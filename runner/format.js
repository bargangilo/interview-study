/**
 * Pure string-returning formatters — no side effects, no I/O.
 * Extracted from ui.js during the Ink migration.
 */
import chalk from "chalk";
import { formatSeconds, formatSecondsVerbose } from "./stats.js";

export { formatSeconds, formatSecondsVerbose };

/**
 * Formats a workspace status string as a colored badge.
 * Returns empty string if status is null.
 */
export function formatStatusBadge(status) {
  if (!status) return "";
  if (status === "complete") return chalk.green(" [complete]");
  return chalk.yellow(` [${status}]`);
}

/**
 * Returns a milestone warning string, or null if no milestone hit.
 * Caller must track which milestones have fired (pass firedSet).
 */
export function getMilestoneWarning(totalElapsedSeconds, mode, countdownSeconds) {
  if (mode === "stopwatch") {
    if (totalElapsedSeconds === 15 * 60) return "⚠ 15 minutes elapsed";
    if (totalElapsedSeconds === 30 * 60) return "⚠ 30 minutes elapsed";
    if (totalElapsedSeconds === 45 * 60) return "⚠ 45 minutes elapsed";
  } else if (mode === "countdown" && countdownSeconds) {
    const remaining = countdownSeconds - totalElapsedSeconds;
    const half = Math.floor(countdownSeconds / 2);
    const quarter = Math.floor(countdownSeconds / 4);
    if (remaining === half) return `⚠ 50% of time remaining (${formatSeconds(remaining)})`;
    if (remaining === quarter) return `⚠ 25% of time remaining (${formatSeconds(remaining)})`;
  }
  return null;
}

export function formatTimerSegment(timerDisplay) {
  if (!timerDisplay || timerDisplay.mode === "disabled") return null;
  const { totalElapsedSeconds: elapsed, remaining, isOvertime, isPaused, mode } = timerDisplay;
  const timeStr = formatSeconds(mode === "countdown" && !isOvertime ? remaining : elapsed);

  if (isPaused) {
    return chalk.yellow(`⏱ ${formatSeconds(elapsed)} [paused]`);
  }
  if (isOvertime) {
    const overtimeSeconds = elapsed - (timerDisplay.countdownSeconds || 0);
    return chalk.red(`⏱ +${formatSeconds(overtimeSeconds)} overtime`);
  }
  if (mode === "countdown" && remaining != null) {
    const countdownSeconds = timerDisplay.countdownSeconds || remaining + elapsed;
    const fraction = remaining / countdownSeconds;
    const colorFn = fraction > 0.5 ? chalk.green : fraction > 0.25 ? chalk.yellow : chalk.red;
    return colorFn(`⏱ ${timeStr} remaining`);
  }
  return chalk.white(`⏱ ${timeStr} elapsed`);
}

/**
 * Formats global stats as a display string.
 */
export function formatGlobalStats(stats) {
  const sep = chalk.gray("  " + "─".repeat(41));
  const lines = [
    sep,
    chalk.bold("  Practice Stats"),
    sep,
    `  Total practice time          ${chalk.white(formatSecondsVerbose(stats.totalPracticeSeconds))}`,
    `  Problems attempted           ${chalk.white(String(stats.problemsAttempted).padStart(5))}`,
    `  Problems completed           ${chalk.white(String(stats.problemsCompleted).padStart(5))}`,
    `  Average solve time           ${chalk.white(formatSeconds(stats.averageSolveSeconds).padStart(5))}`,
  ];
  if (stats.bestSolveSeconds != null) {
    lines.push(
      `  Best solve time              ${chalk.green(formatSeconds(stats.bestSolveSeconds).padStart(5))}` +
        chalk.gray(`  (${stats.bestSolveProblemName})`)
    );
  }
  lines.push(`  Current streak               ${chalk.white(stats.currentStreakDays + " days")}`);
  lines.push(sep);
  return lines.join("\n");
}

const TRUNCATE_LIMIT = 200;
const ERROR_CLASS_PATTERN = /^[A-Z][A-Za-z]*(?:Error|Exception|Warning|Fault): /;

function truncate(str) {
  if (str && str.length > TRUNCATE_LIMIT) return str.slice(0, TRUNCATE_LIMIT) + "\u2026";
  return str;
}

/**
 * Extracts test results from Jest --json output.
 * Returns: { failures: [{ name, expected, received, error }], consoleLogs: string[], passCount: number }
 * Returns: { failures: [], consoleLogs: [], passCount: 0 } for null or unparseable input.
 * Never throws.
 */
export function extractJestResults(jestJsonString) {
  if (!jestJsonString) return { failures: [], consoleLogs: [], passCount: 0 };

  let parsed;
  try {
    parsed = JSON.parse(jestJsonString);
  } catch {
    return { failures: [], consoleLogs: [], passCount: 0 };
  }

  const failures = [];
  let passCount = 0;
  const consoleLogs = [];

  try {
    const testResults = parsed.testResults;
    if (!Array.isArray(testResults)) return { failures: [], consoleLogs: [], passCount: 0 };

    for (const suite of testResults) {
      const assertions = suite.assertionResults;
      if (Array.isArray(assertions)) {
        for (const assertion of assertions) {
          if (assertion.status === "passed") {
            passCount++;
            continue;
          }
          if (assertion.status !== "failed") continue;

          const name = assertion.title || "unknown test";
          let expected = null;
          let received = null;
          let error = null;

          const messages = assertion.failureMessages;
          if (Array.isArray(messages) && messages.length > 0) {
            const msg = messages[0];
            const expectedMatch = msg.match(/^\s*Expected(?:[^:]*)?:\s*(.+)$/m);
            const receivedMatch = msg.match(/^\s*Received(?:[^:]*)?:\s*(.+)$/m);
            if (expectedMatch) expected = truncate(expectedMatch[1]);
            if (receivedMatch) received = truncate(receivedMatch[1]);

            if (!expected && !received) {
              const firstLine = msg.split("\n")[0].trim();
              if (firstLine) error = truncate(firstLine);
            }
          }

          failures.push({ name, expected, received, error });
        }
      }

      if (Array.isArray(suite.console)) {
        for (const entry of suite.console) {
          if (entry.type === "log") {
            consoleLogs.push(truncate(entry.message));
          }
        }
      }
    }
  } catch {
    // Partial results are fine
  }

  return { failures, consoleLogs, passCount };
}

/**
 * Parses raw harness stdout/stderr into structured output objects.
 * Never throws — unexpected formats return whatever is parseable.
 *
 * @param {string} stdout - raw stdout from harness
 * @param {string} stderr - raw stderr from harness
 * @returns {Array} array of output objects
 */
export function formatRunOutput(stdout, stderr) {
  const results = [];

  if (stdout) {
    const lines = stdout.split("\n");
    for (const line of lines) {
      if (line.length === 0) continue;

      // Check if line is labeled: starts with [ and has ] followed by space
      const labelMatch = line.match(/^\[([^\]]+)\] (.*)$/);
      if (labelMatch) {
        const label = labelMatch[1];
        const remainder = labelMatch[2];

        if (remainder.startsWith("\u2714 ")) {
          // Passed result
          results.push({ type: "result", label, passed: true, actual: truncate(remainder.slice(2)) });
        } else if (remainder.startsWith("\u2718 ")) {
          // Failed result or error
          const content = remainder.slice(2);
          // Check if it's an error line
          if (ERROR_CLASS_PATTERN.test(content)) {
            results.push({ type: "error", label, content: truncate(content) });
          } else {
            // Parse actual (expected expected) format
            const expectedMatch = content.match(/^(.*) \(expected (.*)\)$/);
            if (expectedMatch) {
              results.push({ type: "result", label, passed: false, actual: truncate(expectedMatch[1]), expected: truncate(expectedMatch[2]) });
            } else {
              results.push({ type: "result", label, passed: false, actual: truncate(content) });
            }
          }
        } else if (ERROR_CLASS_PATTERN.test(remainder)) {
          // Error without ✔/✗ prefix
          results.push({ type: "error", label, content: truncate(remainder) });
        } else {
          // Result with no expected (no ✔/✗)
          results.push({ type: "result", label, passed: null, actual: truncate(remainder) });
        }
      } else {
        // Unlabeled line — user console.log
        results.push({ type: "log", label: null, content: truncate(line) });
      }
    }
  }

  if (stderr) {
    const stderrLines = stderr.split("\n");
    for (const line of stderrLines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      results.push({ type: "stderr", label: null, content: truncate(trimmed) });
    }
  }

  return results;
}

/**
 * Extracts test results from pytest --tb=short stdout.
 * Pytest --tb=short output format:
 *   test_file.py::test_name PASSED
 *   test_file.py::test_name FAILED
 *   ___ test_name ___
 *   file.py:N: in test_name
 *       assert result == expected
 *   E   AssertionError: assert None == {'key': 'value'}
 *
 * Returns: { failures: [{ name, expected, received, error }], consoleLogs: string[], passCount: number }
 * Returns: { failures: [], consoleLogs: [], passCount: 0 } for null or empty input.
 * Never throws.
 */
export function extractPytestResults(pytestStdout) {
  if (!pytestStdout) return { failures: [], consoleLogs: [], passCount: 0 };

  const lines = pytestStdout.split("\n");
  const failures = [];
  let passCount = 0;
  let currentTestName = null;

  for (const line of lines) {
    if (/\sPASSED/.test(line)) {
      passCount++;
      continue;
    }

    // Test failure header: "_______ test_name _______"
    const headerMatch = line.match(/^_{3,}\s+(\S+)\s+_{3,}$/);
    if (headerMatch) {
      currentTestName = headerMatch[1];
      continue;
    }

    if (currentTestName) {
      // Match "E   AssertionError: assert X == Y" or "E   assert X == Y"
      const assertMatch = line.match(
        /^E\s+(?:AssertionError:\s*)?assert\s+(.+?)\s+==\s+(.+)$/
      );
      if (assertMatch) {
        const name = currentTestName.replace(/^test_/, "").replace(/_/g, " ");
        failures.push({
          name,
          received: truncate(assertMatch[1].trim()),
          expected: truncate(assertMatch[2].trim()),
        });
        currentTestName = null;
        continue;
      }

      // Simple AssertionError with no == comparison
      if (/^E\s+AssertionError/.test(line)) {
        const name = currentTestName.replace(/^test_/, "").replace(/_/g, " ");
        failures.push({ name, received: null, expected: null, error: null });
        currentTestName = null;
        continue;
      }

      // Other thrown errors (TypeError, ValueError, etc.)
      const errorMatch = line.match(/^E\s+(\w+(?:Error|Exception):.+)$/);
      if (errorMatch) {
        const name = currentTestName.replace(/^test_/, "").replace(/_/g, " ");
        failures.push({ name, expected: null, received: null, error: truncate(errorMatch[1].trim()) });
        currentTestName = null;
        continue;
      }
    }
  }

  // Fallback: if no failures parsed from headers, try FAILED summary lines
  if (failures.length === 0) {
    for (const line of lines) {
      const failedMatch = line.match(/^FAILED\s+\S+::(\S+)/);
      if (failedMatch) {
        const name = failedMatch[1].replace(/^test_/, "").replace(/_/g, " ");
        failures.push({ name, received: null, expected: null });
      }
    }
  }

  return { failures, consoleLogs: [], passCount };
}

/**
 * Formats per-problem stats as a display string.
 */
export function formatProblemStats(problemName, stats) {
  const sep = chalk.gray("  " + "─".repeat(41));
  const subSep = chalk.gray("  " + "─".repeat(35));
  const lines = [
    sep,
    chalk.bold(`  ${problemName}`),
    sep,
    `  Attempts                     ${chalk.white(String(stats.attempts).padStart(5))}`,
    `  Completions                  ${chalk.white(String(stats.completions).padStart(5))}`,
    `  Best time                    ${chalk.white(formatSeconds(stats.bestTimeSeconds).padStart(5))}`,
    `  Average time                 ${chalk.white(formatSeconds(stats.averageTimeSeconds).padStart(5))}`,
  ];
  if (stats.lastAttemptedDate) {
    const d = new Date(stats.lastAttemptedDate);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    lines.push(`  Last attempted               ${chalk.white(dateStr)}`);
  }

  if (stats.attemptHistory && stats.attemptHistory.length > 0) {
    lines.push("");
    lines.push(chalk.bold("  Attempt History"));
    lines.push(subSep);
    for (const a of stats.attemptHistory) {
      const d = new Date(a.date);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const timeStr = a.completed ? formatSeconds(a.totalSeconds) : "--:--";
      const status = a.completed ? chalk.green("✔") : chalk.red("✗");
      const countdown = a.wasCountdown ? chalk.gray(`  [countdown ${Math.round(a.countdownSeconds / 60)}m]`) : "";
      lines.push(`  ${dateStr}  ${timeStr}  ${status}${countdown}`);
    }
  }

  if (stats.bestSplits && stats.bestSplits.length > 0) {
    lines.push("");
    lines.push(chalk.bold("  Best Part Splits") + chalk.gray("  (fastest completion)"));
    lines.push(subSep);
    for (const s of stats.bestSplits) {
      lines.push(`  Part ${s.part}                        ${chalk.white(formatSeconds(s.elapsedSeconds).padStart(5))}`);
    }
  }

  lines.push(sep);
  return lines.join("\n");
}
