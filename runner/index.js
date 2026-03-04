const path = require("path");
const fs = require("fs");
const { execFileSync, spawn } = require("child_process");
const { select, input } = require("@inquirer/prompts");
const chalk = require("chalk");
const { startWatching } = require("./watcher");
const {
  loadProblemConfig,
  ensureWorkspace,
  workspacePath,
  hasWorkspaceFile,
  writeInitialScaffold,
  inferCurrentPart,
  hasWorkspaceDir,
  clearWorkspaceDir,
  getWorkspaceStatus,
} = require("./config");
const {
  showPartIntro,
  formatStatusBadge,
  formatGlobalStats,
  formatProblemStats,
} = require("./ui");
const { createTimer } = require("./timer");
const {
  loadSession,
  readAllSessions,
  computeGlobalStats,
  computeProblemStats,
  writeSession,
  writeSessionSync,
} = require("./stats");

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

/**
 * Loads configs for all detected problems. Skips problems with missing or
 * malformed problem.json and prints a soft warning.
 * Returns array of { name, config } objects.
 */
function loadAllProblems() {
  const names = detectProblems();
  const problems = [];
  for (const name of names) {
    try {
      const config = loadProblemConfig(name, ROOT_DIR);
      if (!config) {
        console.log(
          chalk.yellow(`  Warning: Skipping "${name}" — no problem.json found`)
        );
        continue;
      }
      problems.push({ name, config });
    } catch (err) {
      console.log(
        chalk.yellow(`  Warning: Skipping "${name}" — ${err.message}`)
      );
    }
  }
  return problems;
}

function truncate(str, max) {
  if (!str) return "";
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "\u2026";
}

function problemHasLanguage(problem, language) {
  const ext = language === "JavaScript" ? "js" : "py";
  return fs.existsSync(
    path.join(ROOT_DIR, "problems", problem, `main.${ext}`)
  );
}

async function waitForQuit(timerController) {
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
      } else if ((key === "p" || key === "P") && timerController) {
        if (timerController.isPaused()) {
          timerController.resume();
        } else {
          timerController.pause();
        }
      }
    };

    process.stdin.on("data", onData);
  });
}

async function waitForEnter() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (key) => {
      process.stdin.removeListener("data", onData);
      process.stdin.pause();
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      resolve();
    };

    process.stdin.on("data", onData);
  });
}

// ---- Main Menu ----

async function showMainMenu() {
  console.log(chalk.bold("\n  Interview Study"));
  console.log(chalk.gray("  " + "\u2500".repeat(15)));

  return select({
    message: "",
    choices: [
      { name: "Start a Problem", value: "start" },
      { name: "Problem List", value: "list" },
      { name: "Stats", value: "stats" },
      { name: "Clear a Problem", value: "clear" },
      { name: chalk.red("Exit"), value: "exit" },
    ],
  });
}

// ---- Option 1: Start a Problem ----

async function startProblem() {
  const problems = loadAllProblems();
  if (problems.length === 0) {
    console.log(chalk.red("  No problems found in problems/ directory."));
    return;
  }

  const choices = problems.map(({ name, config }) => {
    const status = getWorkspaceStatus(name, config, ROOT_DIR);
    const badge = formatStatusBadge(status);
    return {
      name: config.title + badge,
      value: name,
      description: truncate(config.description, 80),
    };
  });
  choices.push({
    name: chalk.gray("\u2190 Back"),
    value: "__back__",
  });

  const problem = await select({
    message: "Select a problem:",
    choices,
  });

  if (problem === "__back__") return;

  // Load config for selected problem
  const config = problems.find((p) => p.name === problem).config;

  // Determine available languages
  const languages = [];
  if (problemHasLanguage(problem, "JavaScript")) languages.push("JavaScript");
  if (problemHasLanguage(problem, "Python")) languages.push("Python");

  if (languages.length === 0) {
    console.log(
      chalk.red(`  No main.js or main.py found for "${problem}".`)
    );
    return;
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

  // Countdown prompt
  let countdownSeconds = null;
  const expectedMinutes = config.expectedMinutes || null;
  const hint = expectedMinutes
    ? chalk.gray(`  Expected time for this problem: ${expectedMinutes} minutes`)
    : "";
  if (hint) console.log(hint);

  const countdownInput = await input({
    message: "Set a time limit in minutes (leave blank for stopwatch mode):",
    default: expectedMinutes ? String(expectedMinutes) : "",
  });

  const trimmed = countdownInput.trim();
  if (trimmed !== "") {
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed > 0) {
      countdownSeconds = parsed * 60;
    }
  }

  // Ensure workspace/ directory exists
  ensureWorkspace(ROOT_DIR);

  // Workspace initialization — handle resume vs restart
  let startPart = 0;
  let resumeChoice = "restart";
  if (hasWorkspaceFile(problem, language, ROOT_DIR)) {
    resumeChoice = await select({
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

  // Create timer
  const timerOptions = {
    mode: countdownSeconds ? "countdown" : "stopwatch",
    countdownSeconds,
    totalElapsedSeconds: 0,
    currentPartElapsedSeconds: 0,
    totalPausedSeconds: 0,
  };

  // Restore timer state on resume
  if (resumeChoice === "resume") {
    const existingSession = loadSession(problem, ROOT_DIR);
    if (existingSession) {
      timerOptions.totalElapsedSeconds = existingSession.totalElapsedSeconds || 0;
      timerOptions.currentPartElapsedSeconds = existingSession.currentPartElapsedSeconds || 0;
      timerOptions.totalPausedSeconds = existingSession.totalPausedSeconds || 0;
      if (existingSession.mode) timerOptions.mode = existingSession.mode;
      if (existingSession.countdownSeconds) timerOptions.countdownSeconds = existingSession.countdownSeconds;
    }
  }

  const timer = createTimer(timerOptions);

  // Build initial session data
  let sessionData = loadSession(problem, ROOT_DIR) || {
    lastStarted: new Date().toISOString(),
    totalElapsedSeconds: 0,
    currentPartElapsedSeconds: 0,
    isPaused: false,
    pausedAt: null,
    totalPausedSeconds: 0,
    mode: timerOptions.mode,
    countdownSeconds: timerOptions.countdownSeconds,
    completed: false,
    currentPart: startPart,
    splits: [],
    attempts: [],
  };
  sessionData.lastStarted = new Date().toISOString();

  // Register session persistence on each timer tick
  timer.onTick(() => {
    const timerState = timer.getState();
    sessionData.totalElapsedSeconds = timerState.totalElapsedSeconds;
    sessionData.currentPartElapsedSeconds = timerState.currentPartElapsedSeconds;
    sessionData.totalPausedSeconds = timerState.totalPausedSeconds;
    sessionData.isPaused = timerState.isPaused;
    sessionData.pausedAt = timerState.pausedAt;
    writeSession(problem, sessionData, ROOT_DIR);
  });

  // SIGINT handler
  let sigintFired = false;
  const sigintHandler = () => {
    if (sigintFired) return;
    sigintFired = true;
    timer.stop();
    const timerState = timer.getState();
    sessionData.totalElapsedSeconds = timerState.totalElapsedSeconds;
    sessionData.currentPartElapsedSeconds = timerState.currentPartElapsedSeconds;
    sessionData.totalPausedSeconds = timerState.totalPausedSeconds;
    sessionData.isPaused = false;
    sessionData.pausedAt = null;
    // Append current attempt
    sessionData.attempts.push({
      date: sessionData.lastStarted,
      totalSeconds: timerState.totalElapsedSeconds,
      splits: [...sessionData.splits],
      completed: sessionData.completed,
      wasCountdown: timerOptions.mode === "countdown",
      countdownSeconds: timerOptions.countdownSeconds,
    });
    try {
      writeSessionSync(problem, sessionData, ROOT_DIR);
    } catch {
      // Best effort
    }
    console.log(chalk.gray("\n  Session saved. Goodbye.\n"));
    process.exit(0);
  };
  process.on("SIGINT", sigintHandler);

  console.log(
    chalk.cyan(`\n  ${config.title}`) +
      (config.description ? chalk.gray(` \u2014 ${config.description}`) : "")
  );
  showPartIntro(
    startPart + 1,
    config.parts[startPart].title,
    config.parts[startPart].description
  );

  // Launch VS Code if available, with isolated user-data-dir for clean UI
  try {
    execFileSync("which", ["code"], { stdio: "ignore" });
    ensureVscodeDataDir();
    const solutionFile = workspacePath(problem, language, ROOT_DIR);
    const vsWorkspace = path.join(ROOT_DIR, "interview-study.code-workspace");
    const child = spawn(
      "code",
      ["--user-data-dir", VSCODE_DATA_DIR, vsWorkspace, "-g", solutionFile],
      {
        cwd: ROOT_DIR,
        stdio: "ignore",
        detached: true,
      }
    );
    child.unref();
  } catch {
    console.log(
      chalk.yellow(
        "  VS Code not found on PATH \u2014 skipping editor launch. See README for setup instructions."
      )
    );
  }

  // Start timer and watcher
  timer.start();

  const controller = startWatching(
    problem,
    language,
    ROOT_DIR,
    config,
    startPart,
    timer
  );

  let completed = false;
  const completionWrapper = controller.completionPromise.then(() => {
    completed = true;
  });
  await Promise.race([waitForQuit(timer), completionWrapper]);

  // Session end — finalize
  timer.stop();
  const finalState = timer.getState();
  sessionData.totalElapsedSeconds = finalState.totalElapsedSeconds;
  sessionData.currentPartElapsedSeconds = finalState.currentPartElapsedSeconds;
  sessionData.totalPausedSeconds = finalState.totalPausedSeconds;
  sessionData.isPaused = false;
  sessionData.pausedAt = null;
  sessionData.completed = completed;
  // Append attempt
  sessionData.attempts.push({
    date: sessionData.lastStarted,
    totalSeconds: finalState.totalElapsedSeconds,
    splits: [...sessionData.splits],
    completed: sessionData.completed,
    wasCountdown: timerOptions.mode === "countdown",
    countdownSeconds: timerOptions.countdownSeconds,
  });
  writeSessionSync(problem, sessionData, ROOT_DIR);

  process.removeListener("SIGINT", sigintHandler);
  await controller.close();
  console.log("\n");
}

// ---- Option 2: Problem List ----

async function problemList() {
  while (true) {
    const problems = loadAllProblems();
    if (problems.length === 0) {
      console.log(chalk.red("  No problems found in problems/ directory."));
      return;
    }

    const choices = problems.map(({ name, config }) => {
      const status = getWorkspaceStatus(name, config, ROOT_DIR);
      const badge = formatStatusBadge(status);
      const parts = config.parts ? `${config.parts.length} parts` : "1 part";
      return {
        name: config.title + badge,
        value: name,
        description: `${parts} \u2014 ${truncate(config.description, 70)}`,
      };
    });
    choices.push({
      name: chalk.gray("\u2190 Back"),
      value: "__back__",
    });

    const selected = await select({
      message: "Browse problems:",
      choices,
    });

    if (selected === "__back__") return;

    // Show detail view for selected problem
    const { config } = problems.find((p) => p.name === selected);
    const status = getWorkspaceStatus(selected, config, ROOT_DIR);
    const parts = config.parts ? config.parts.length : 1;

    console.log();
    console.log(chalk.bold(`  ${config.title}`));
    console.log(chalk.gray("  " + "\u2500".repeat(config.title.length)));
    console.log(chalk.white(`  ${parts} parts`));
    if (status) {
      console.log(
        chalk.white("  Status: ") +
          (status === "complete"
            ? chalk.green(status)
            : chalk.yellow(status))
      );
    }
    if (config.description) {
      console.log(chalk.gray(`\n  ${config.description}`));
    }

    if (config.parts) {
      console.log();
      for (let i = 0; i < config.parts.length; i++) {
        const part = config.parts[i];
        console.log(
          chalk.bold(`  Part ${i + 1}: ${part.title || "Untitled"}`)
        );
        if (part.description) {
          console.log(chalk.white(`    ${part.description}`));
        }
        console.log();
      }
    }

    console.log(chalk.gray("  [Press any key to go back]"));
    await waitForEnter();
  }
}

// ---- Option 3: Stats ----

async function showStats() {
  const sessions = readAllSessions(ROOT_DIR);
  const problems = loadAllProblems();

  if (sessions.length === 0) {
    console.log(
      chalk.gray(
        "\n  No stats yet — start a problem to begin tracking your progress.\n"
      )
    );
    console.log(chalk.gray("  [Press any key to go back]"));
    await waitForEnter();
    return;
  }

  const globalStats = computeGlobalStats(sessions);
  console.log("\n" + formatGlobalStats(globalStats));

  while (true) {
    const problemChoices = sessions.map(({ problemName }) => {
      const prob = problems.find((p) => p.name === problemName);
      const title = prob ? prob.config.title : problemName;
      return { name: title, value: problemName };
    });
    problemChoices.push({
      name: chalk.gray("\u2190 Back"),
      value: "__back__",
    });

    const selected = await select({
      message: "View problem stats:",
      choices: problemChoices,
    });

    if (selected === "__back__") return;

    const { session } = sessions.find((s) => s.problemName === selected);
    const prob = problems.find((p) => p.name === selected);
    const title = prob ? prob.config.title : selected;
    const stats = computeProblemStats(selected, session);
    console.log("\n" + formatProblemStats(title, stats));

    console.log(chalk.gray("  [Press any key to go back]"));
    await waitForEnter();
  }
}

// ---- Option 4: Clear a Problem ----

async function clearProblem() {
  while (true) {
    const problems = loadAllProblems();
    const withWorkspace = problems.filter(({ name }) =>
      hasWorkspaceDir(name, ROOT_DIR)
    );

    if (withWorkspace.length === 0) {
      console.log(
        chalk.gray(
          "\n  No problem workspaces found. Start a problem first.\n"
        )
      );
      console.log(chalk.gray("  [Press any key to go back]"));
      await waitForEnter();
      return;
    }

    const choices = withWorkspace.map(({ name, config }) => {
      const status = getWorkspaceStatus(name, config, ROOT_DIR);
      const badge = formatStatusBadge(status);
      return {
        name: config.title + badge,
        value: name,
      };
    });
    choices.push({
      name: chalk.gray("\u2190 Back"),
      value: "__back__",
    });

    const selected = await select({
      message: "Select a problem to clear:",
      choices,
    });

    if (selected === "__back__") return;

    const { config } = withWorkspace.find((p) => p.name === selected);

    // Confirmation prompt — default to No
    const confirm = await select({
      message: `Clear workspace for "${config.title}"? This cannot be undone.`,
      choices: [
        { name: "No", value: false },
        { name: "Yes", value: true },
      ],
    });

    if (confirm) {
      clearWorkspaceDir(selected, ROOT_DIR);
      console.log(
        chalk.green(`  \u2714 Workspace cleared for ${config.title}`)
      );
    }
  }
}

// ---- Main Loop ----

async function main() {
  while (true) {
    const action = await showMainMenu();

    switch (action) {
      case "start":
        await startProblem();
        break;
      case "list":
        await problemList();
        break;
      case "stats":
        await showStats();
        break;
      case "clear":
        await clearProblem();
        break;
      case "exit":
        console.log(chalk.gray("  Goodbye!\n"));
        process.exit(0);
    }
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
