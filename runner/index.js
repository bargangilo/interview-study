const path = require("path");
const fs = require("fs");
const { execFileSync, spawn } = require("child_process");
const { select } = require("@inquirer/prompts");
const chalk = require("chalk");
const { startWatching } = require("./watcher");
const {
  loadProblemConfig,
  ensureWorkspace,
  workspacePath,
  hasWorkspaceFile,
  writeInitialScaffold,
  inferCurrentPart,
} = require("./config");
const { showPartIntro } = require("./ui");

const ROOT_DIR = path.resolve(__dirname, "..");
const VSCODE_DATA_DIR = path.join(ROOT_DIR, ".vscode-data");

const VSCODE_USER_SETTINGS = {
  // Disable AI completions
  "github.copilot.editor.enableAutoCompletions": false,
  "github.copilot.enable": { "*": false },
  "github.copilot.editor.enableCodeActions": false,
  "chat.commandCenter.enabled": false,
  "editor.inlineSuggest.enabled": false,

  // Hide all UI chrome — editor only
  "workbench.sideBar.visible": false,
  "workbench.secondarySideBar.defaultVisibility": "hidden",
  "workbench.activityBar.location": "hidden",
  "workbench.statusBar.visible": false,
  "workbench.panel.visible": false,
  "workbench.editor.showTabs": "none",
  "workbench.startupEditor": "none",
  "workbench.tips.enabled": false,
  "breadcrumbs.enabled": false,
  "editor.minimap.enabled": false,
  "window.menuBarVisibility": "hidden",
  "window.restoreWindows": "none",
  "explorer.openEditors.visible": 0,

  // Keep standard IntelliSense
  "editor.quickSuggestions": { other: "on", comments: "off", strings: "off" },
  "editor.suggestOnTriggerCharacters": true,
  "editor.parameterHints.enabled": true,
  "editor.wordBasedSuggestions": "matchingDocuments",
  "editor.scrollbar.vertical": "auto",
  "editor.scrollbar.horizontal": "auto",
};

function ensureVscodeDataDir() {
  const userDir = path.join(VSCODE_DATA_DIR, "User");
  fs.mkdirSync(userDir, { recursive: true });
  fs.writeFileSync(
    path.join(userDir, "settings.json"),
    JSON.stringify(VSCODE_USER_SETTINGS, null, 2)
  );
}

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

    // Load multi-part config (null for legacy single-part problems)
    let config = null;
    try {
      config = loadProblemConfig(problem, ROOT_DIR);
    } catch (err) {
      console.log(chalk.red(`\n  ${err.message}\n`));
      continue;
    }

    // Ensure workspace/ directory exists
    ensureWorkspace(ROOT_DIR);

    // Workspace initialization — handle resume vs restart
    let startPart = 0;
    if (config) {
      // Multi-part problem
      if (hasWorkspaceFile(problem, language, ROOT_DIR)) {
        const resumeChoice = await select({
          message: "A previous session was found for this problem.",
          choices: [
            { name: "Resume where you left off", value: "resume" },
            { name: "Restart from scratch", value: "restart" },
          ],
        });

        if (resumeChoice === "resume") {
          startPart = inferCurrentPart(problem, language, ROOT_DIR);
        } else {
          writeInitialScaffold(problem, language, config, ROOT_DIR);
        }
      } else {
        writeInitialScaffold(problem, language, config, ROOT_DIR);
      }

      console.log(
        chalk.cyan(`\n  ${config.title}`) +
          (config.description ? chalk.gray(` — ${config.description}`) : "")
      );
      showPartIntro(
        startPart + 1,
        config.parts[startPart].title,
        config.parts[startPart].description
      );
    } else {
      // Single-part problem — copy source to workspace if no workspace file exists
      const ext = language === "JavaScript" ? "js" : "py";
      const srcFile = path.join(ROOT_DIR, "problems", problem, `main.${ext}`);
      const wsFile = workspacePath(problem, language, ROOT_DIR);
      fs.mkdirSync(path.dirname(wsFile), { recursive: true });
      if (!hasWorkspaceFile(problem, language, ROOT_DIR)) {
        fs.copyFileSync(srcFile, wsFile);
      }
    }

    // Launch VS Code if available, with isolated user-data-dir for clean UI
    try {
      execFileSync("which", ["code"], { stdio: "ignore" });
      ensureVscodeDataDir();
      const solutionFile = workspacePath(problem, language, ROOT_DIR);
      const vsWorkspace = path.join(ROOT_DIR, "interview-study.code-workspace");
      const child = spawn("code", [
        "--user-data-dir", VSCODE_DATA_DIR,
        vsWorkspace,
        "-g", solutionFile,
      ], {
        cwd: ROOT_DIR,
        stdio: "ignore",
        detached: true,
      });
      child.unref();
    } catch {
      console.log(
        chalk.yellow(
          "  VS Code not found on PATH — skipping editor launch. See README for setup instructions."
        )
      );
    }

    // Start watching
    const controller = startWatching(problem, language, ROOT_DIR, config, startPart);

    await Promise.race([waitForQuit(), controller.completionPromise]);

    await controller.close();
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
