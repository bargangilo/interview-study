const chalk = require("chalk");
const { formatSeconds, formatSecondsVerbose } = require("./stats");

function clearLine() {
  process.stdout.write("\r\x1b[K");
}

function showSummary(passed, total, timestamp, partInfo, timerDisplay) {
  clearLine();
  const time = new Date(timestamp).toLocaleTimeString();
  let line = "";
  if (partInfo) {
    line +=
      chalk.bold(`  Part ${partInfo.current} of ${partInfo.unlocked} unlocked`) +
      "   ";
  } else {
    line += "  ";
  }
  if (passed === total && total > 0) {
    line += chalk.green(`✔ ${passed} / ${total} tests passing`);
  } else {
    line += chalk.yellow(`✔ ${passed} / ${total} tests passing`);
  }
  line += chalk.gray(`   [last run: ${time}]`);

  if (timerDisplay) {
    line += "  " + formatTimerSegment(timerDisplay);
  }

  process.stdout.write(line);
}

function formatTimerSegment(timerDisplay) {
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

function showWatching(problem, language) {
  console.log(
    chalk.cyan(`\n  Watching ${problem} (${language})`) +
      chalk.gray(" — save the file to run tests")
  );
  console.log(chalk.gray("  Press Q to go back to the problem menu | P to pause/resume timer\n"));
}

function showRunning() {
  clearLine();
  process.stdout.write(chalk.gray("  ⟳ Running tests..."));
}

function showPartIntro(partNumber, title, description) {
  const separator = chalk.gray("  " + "─".repeat(45));
  console.log(separator);
  console.log(chalk.bold(`  Part ${partNumber}: ${title || "Untitled"}`));
  if (description) {
    console.log(chalk.white(`  ${description}`));
  }
  console.log(separator);
  console.log();
}

function showPartComplete(completedPart, nextTitle, nextDescription, splitSeconds) {
  clearLine();
  const splitStr = splitSeconds != null ? chalk.gray(`  [Part ${completedPart} time: ${formatSeconds(splitSeconds)}]`) : "";
  console.log(
    chalk.green.bold(
      `\n  ✔ Part ${completedPart} complete!`
    ) +
      splitStr +
      chalk.white(`  Part ${completedPart + 1} has been added to your file.`)
  );
  showPartIntro(completedPart + 1, nextTitle, nextDescription);
}

function showAllComplete(problemName) {
  clearLine();
  console.log(
    chalk.green.bold(`\n  ✔ All parts complete for ${problemName}!`)
  );
  console.log(chalk.gray("  Returning to menu...\n"));
}

/**
 * Formats a workspace status string as a colored badge.
 * Returns empty string if status is null.
 */
function formatStatusBadge(status) {
  if (!status) return "";
  if (status === "complete") return chalk.green(" [complete]");
  return chalk.yellow(` [${status}]`);
}

/**
 * Returns a milestone warning string, or null if no milestone hit.
 * Caller must track which milestones have fired (pass firedSet).
 */
function getMilestoneWarning(totalElapsedSeconds, mode, countdownSeconds) {
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

function showOvertimeNotice() {
  console.log(
    chalk.red("\n  ⏱ Time's up — keep going or press Q to return to the menu")
  );
}

/**
 * Formats global stats as a display string.
 */
function formatGlobalStats(stats) {
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
function formatProblemStats(problemName, stats) {
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

module.exports = {
  clearLine,
  showSummary,
  formatTimerSegment,
  showWatching,
  showRunning,
  showPartIntro,
  showPartComplete,
  showAllComplete,
  formatStatusBadge,
  getMilestoneWarning,
  showOvertimeNotice,
  formatGlobalStats,
  formatProblemStats,
};
