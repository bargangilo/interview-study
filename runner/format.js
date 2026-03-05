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
