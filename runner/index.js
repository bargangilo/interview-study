const path = require("path");
const fs = require("fs");
const { select } = require("@inquirer/prompts");
const chalk = require("chalk");
const { startWatching } = require("./watcher");

const ROOT_DIR = path.resolve(__dirname, "..");

function detectProblems() {
  const problemsDir = path.join(ROOT_DIR, "problems");
  if (!fs.existsSync(problemsDir)) return [];
  return fs
    .readdirSync(problemsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function problemHasLanguage(problem, language) {
  const ext = language === "JavaScript" ? "js" : "py";
  return fs.existsSync(
    path.join(ROOT_DIR, "problems", problem, `main.${ext}`)
  );
}

async function waitForQuit() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (key) => {
      if (key === "q" || key === "Q" || key === "\u0003") {
        process.stdin.removeListener("data", onData);
        process.stdin.pause();
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        resolve();
      }
    };

    process.stdin.on("data", onData);
  });
}

async function main() {
  console.log(chalk.bold("\n  Interview Study Runner\n"));

  while (true) {
    const problems = detectProblems();
    if (problems.length === 0) {
      console.log(chalk.red("  No problems found in problems/ directory."));
      process.exit(1);
    }

    const choices = [
      ...problems.map((p) => ({ name: p, value: p })),
      { name: chalk.red("Exit"), value: "__exit__" },
    ];

    const problem = await select({
      message: "Select a problem:",
      choices,
    });

    if (problem === "__exit__") {
      console.log(chalk.gray("  Goodbye!\n"));
      process.exit(0);
    }

    // Determine available languages
    const languages = [];
    if (problemHasLanguage(problem, "JavaScript")) languages.push("JavaScript");
    if (problemHasLanguage(problem, "Python")) languages.push("Python");

    if (languages.length === 0) {
      console.log(
        chalk.red(`  No main.js or main.py found for "${problem}".`)
      );
      continue;
    }

    let language;
    if (languages.length === 1) {
      language = languages[0];
      console.log(chalk.gray(`  Only ${language} available, auto-selected.`));
    } else {
      language = await select({
        message: "Select a language:",
        choices: languages.map((l) => ({ name: l, value: l })),
      });
    }

    // Start watching
    const watcher = startWatching(problem, language, ROOT_DIR);

    await waitForQuit();

    await watcher.close();
    console.log("\n");
  }
}

main().catch((err) => {
  // Graceful exit on Ctrl+C during prompts
  if (err.name === "ExitPromptError") {
    console.log(chalk.gray("\n  Goodbye!\n"));
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
