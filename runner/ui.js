const chalk = require("chalk");

function clearLine() {
  process.stdout.write("\r\x1b[K");
}

function showSummary(passed, total, timestamp) {
  clearLine();
  const time = new Date(timestamp).toLocaleTimeString();
  if (passed === total) {
    process.stdout.write(
      chalk.green(`  ✔ ${passed} / ${total} tests passing`) +
        chalk.gray(`   [last run: ${time}]`)
    );
  } else {
    process.stdout.write(
      chalk.yellow(`  ✔ ${passed} / ${total} tests passing`) +
        chalk.gray(`   [last run: ${time}]`)
    );
  }
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

module.exports = { clearLine, showSummary, showWatching, showRunning };
