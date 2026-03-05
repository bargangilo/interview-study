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
