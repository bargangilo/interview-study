const chalk = require("chalk");

function clearLine() {
  process.stdout.write("\r\x1b[K");
}

function showSummary(passed, total, timestamp, partInfo) {
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
  process.stdout.write(line);
}

function showWatching(problem, language) {
  console.log(
    chalk.cyan(`\n  Watching ${problem} (${language})`) +
      chalk.gray(" — save the file to run tests")
  );
  console.log(chalk.gray("  Press Q to go back to the problem menu\n"));
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

function showPartComplete(completedPart, nextTitle, nextDescription) {
  clearLine();
  console.log(
    chalk.green.bold(
      `\n  ✔ Part ${completedPart} complete!`
    ) +
      chalk.white(` Part ${completedPart + 1} has been added to your file.`)
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

module.exports = {
  clearLine,
  showSummary,
  showWatching,
  showRunning,
  showPartIntro,
  showPartComplete,
  showAllComplete,
  formatStatusBadge,
};
