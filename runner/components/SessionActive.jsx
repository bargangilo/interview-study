import React, { useState, useEffect, useRef } from "react";
import { Text, Static, useInput } from "ink";
import path from "path";
import fs from "fs";
import { execFileSync, spawn as spawnProc } from "child_process";
import { Action } from "../state.js";
import { formatSeconds } from "../format.js";
import { startWatching } from "../watcher.js";
import { createTimer } from "../timer.js";
import {
  ensureWorkspace,
  hasWorkspaceFile,
  writeInitialScaffold,
  workspacePath,
  getUnlockedParts,
  buildRunHarness,
  writeRunHarness,
  deleteRunHarness,
} from "../config.js";
import {
  loadSession,
  writeSession,
  writeSessionSync,
} from "../stats.js";
import SummaryLine from "./SummaryLine.jsx";
import ConsoleOutput from "./ConsoleOutput.jsx";

const VSCODE_USER_SETTINGS = {
  "github.copilot.editor.enableAutoCompletions": false,
  "github.copilot.enable": { "*": false },
  "github.copilot.editor.enableCodeActions": false,
  "chat.commandCenter.enabled": false,
  "files.autoSave": "off",
  "editor.inlineSuggest.enabled": false,
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
  "editor.quickSuggestions": { other: "on", comments: "off", strings: "off" },
  "editor.suggestOnTriggerCharacters": true,
  "editor.parameterHints.enabled": true,
  "editor.wordBasedSuggestions": "matchingDocuments",
  "editor.scrollbar.vertical": "auto",
  "editor.scrollbar.horizontal": "auto",
};

function launchVSCode(rootDir, problem, language) {
  const VSCODE_DATA_DIR = path.join(rootDir, ".vscode-data");
  execFileSync("which", ["code"], { stdio: "ignore" });
  const userDir = path.join(VSCODE_DATA_DIR, "User");
  fs.mkdirSync(userDir, { recursive: true });
  fs.writeFileSync(
    path.join(userDir, "settings.json"),
    JSON.stringify(VSCODE_USER_SETTINGS, null, 2)
  );
  const solutionFile = workspacePath(problem, language, rootDir);
  const vsWorkspace = path.join(rootDir, "handwritten.code-workspace");
  const child = spawnProc(
    "code",
    ["--user-data-dir", VSCODE_DATA_DIR, vsWorkspace, "-g", solutionFile],
    { cwd: rootDir, stdio: "ignore", detached: true }
  );
  child.unref();
}

export default function SessionActive({
  dispatch,
  problem,
  config,
  language,
  countdownSeconds,
  startPart,
  resumeData,
  rootDir,
}) {
  const [testState, setTestState] = useState({
    passed: 0, total: 0, timestamp: Date.now(), running: false,
    timedOut: false, crashed: false, timeoutSeconds: null, exitCode: null,
  });
  const [partInfo, setPartInfo] = useState(null);
  const [timerDisplay, setTimerDisplay] = useState(null);
  const [messages, setMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const timerRef = useRef(null);
  const watcherRef = useRef(null);
  const sessionRef = useRef(null);
  const sigintRef = useRef(null);
  const endedRef = useRef(false);

  useEffect(() => {
    // Ensure workspace exists
    ensureWorkspace(rootDir);

    // Write scaffold if not resuming
    if (!resumeData) {
      writeInitialScaffold(problem, language, config, rootDir);
    }

    // Generate run harness from current unlocked state
    const langKey = language === "JavaScript" ? "javascript" : "python";
    const mainFilePath = workspacePath(problem, language, rootDir);
    const wsPath = path.dirname(mainFilePath);
    const unlockedParts = getUnlockedParts(config, mainFilePath);
    const harnessContent = buildRunHarness(unlockedParts, langKey);
    writeRunHarness(wsPath, langKey, harnessContent);

    // Create timer
    const timerOptions = {
      mode: countdownSeconds ? "countdown" : "stopwatch",
      countdownSeconds,
      totalElapsedSeconds: 0,
      currentPartElapsedSeconds: 0,
      totalPausedSeconds: 0,
    };

    // Restore timer state on resume
    if (resumeData) {
      timerOptions.totalElapsedSeconds = resumeData.totalElapsedSeconds || 0;
      timerOptions.currentPartElapsedSeconds = resumeData.currentPartElapsedSeconds || 0;
      timerOptions.totalPausedSeconds = resumeData.totalPausedSeconds || 0;
      if (resumeData.mode) timerOptions.mode = resumeData.mode;
      if (resumeData.countdownSeconds) timerOptions.countdownSeconds = resumeData.countdownSeconds;
    }

    const timer = createTimer(timerOptions);
    timerRef.current = timer;

    // Build session data
    let sessionData = resumeData ? { ...resumeData } : {
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
    sessionRef.current = sessionData;

    // Register session persistence on each timer tick
    timer.onTick(() => {
      const timerState = timer.getState();
      sessionData.totalElapsedSeconds = timerState.totalElapsedSeconds;
      sessionData.currentPartElapsedSeconds = timerState.currentPartElapsedSeconds;
      sessionData.totalPausedSeconds = timerState.totalPausedSeconds;
      sessionData.isPaused = timerState.isPaused;
      sessionData.pausedAt = timerState.pausedAt;
      writeSession(problem, sessionData, rootDir);
    });

    // SIGINT handler
    const sigintHandler = () => {
      timer.stop();
      const timerState = timer.getState();
      sessionData.totalElapsedSeconds = timerState.totalElapsedSeconds;
      sessionData.currentPartElapsedSeconds = timerState.currentPartElapsedSeconds;
      sessionData.totalPausedSeconds = timerState.totalPausedSeconds;
      sessionData.isPaused = false;
      sessionData.pausedAt = null;
      sessionData.attempts.push({
        date: sessionData.lastStarted,
        totalSeconds: timerState.totalElapsedSeconds,
        splits: [...(sessionData.splits || [])],
        completed: sessionData.completed,
        wasCountdown: timerOptions.mode === "countdown",
        countdownSeconds: timerOptions.countdownSeconds,
      });
      try {
        writeSessionSync(problem, sessionData, rootDir);
      } catch {
        // Best effort
      }
      process.exit(0);
    };
    process.on("SIGINT", sigintHandler);
    sigintRef.current = sigintHandler;

    // Show initial part intro message
    const part = config.parts[startPart];
    setMessages([
      { id: 0, type: "title", text: `${config.title}${config.description ? " — " + config.description : ""}` },
      { id: 1, type: "intro", text: `Part ${startPart + 1}: ${part.title || "Untitled"}`, description: part.description },
    ]);

    // Launch VS Code
    try {
      launchVSCode(rootDir, problem, language);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: prev.length, type: "warning", text: "VS Code not found on PATH — skipping editor launch. See README for setup instructions." },
      ]);
    }

    // Start timer and watcher
    timer.start();

    let msgCounter = 10;
    const watcher = startWatching(problem, language, rootDir, config, startPart, timer, {
      onTestStart: () => {
        setTestState((prev) => ({ ...prev, running: true }));
      },
      onTestResult: (result) => {
        setTestState({
          passed: result.passed,
          total: result.total,
          timestamp: result.timestamp,
          running: false,
          timedOut: !!result.timedOut,
          crashed: !!result.crashed,
          timeoutSeconds: result.timeoutSeconds || null,
          exitCode: result.exitCode || null,
        });
        if (result.partInfo) setPartInfo(result.partInfo);
        setConsoleOutput(result.consoleOutput || []);
        setErrorMessage(null);
      },
      onPartAdvanced: ({ completedPart, nextTitle, nextDescription, splitSeconds }) => {
        const splitStr = splitSeconds != null ? ` [Part ${completedPart} time: ${formatSeconds(splitSeconds)}]` : "";
        setMessages((prev) => [
          ...prev,
          { id: msgCounter++, type: "partComplete", text: `✔ Part ${completedPart} complete!${splitStr}  Part ${completedPart + 1} has been added to your file.` },
          { id: msgCounter++, type: "intro", text: `Part ${completedPart + 1}: ${nextTitle || "Untitled"}`, description: nextDescription },
        ]);
        if (sessionRef.current) {
          sessionRef.current.currentPart = completedPart;
          if (splitSeconds != null) {
            sessionRef.current.splits = sessionRef.current.splits || [];
            sessionRef.current.splits.push({ part: completedPart, elapsedSeconds: splitSeconds });
          }
        }
      },
      onAllComplete: () => {
        setMessages((prev) => [
          ...prev,
          { id: msgCounter++, type: "complete", text: `✔ All parts complete for ${problem}!` },
        ]);
        if (sessionRef.current) {
          sessionRef.current.completed = true;
        }
        endSession(true);
      },
      onMilestone: ({ warning }) => {
        setMessages((prev) => [...prev, { id: msgCounter++, type: "milestone", text: warning }]);
      },
      onOvertime: () => {
        setMessages((prev) => [
          ...prev,
          { id: msgCounter++, type: "overtime", text: "⏱ Time's up — keep going or press Q to return to the menu" },
        ]);
      },
      onTimerTick: ({ timerDisplay: td }) => {
        setTimerDisplay(td);
      },
      onError: (err) => {
        setErrorMessage(err.message || String(err));
      },
    });
    watcherRef.current = watcher;

    return () => {
      process.removeListener("SIGINT", sigintHandler);
      if (watcherRef.current) watcherRef.current.close();
    };
  }, []);

  function endSession(completed) {
    if (endedRef.current) return;
    endedRef.current = true;

    const timer = timerRef.current;
    const sessionData = sessionRef.current;
    if (!timer || !sessionData) return;

    timer.stop();
    const finalState = timer.getState();
    sessionData.totalElapsedSeconds = finalState.totalElapsedSeconds;
    sessionData.currentPartElapsedSeconds = finalState.currentPartElapsedSeconds;
    sessionData.totalPausedSeconds = finalState.totalPausedSeconds;
    sessionData.isPaused = false;
    sessionData.pausedAt = null;
    sessionData.completed = completed;
    sessionData.attempts.push({
      date: sessionData.lastStarted,
      totalSeconds: finalState.totalElapsedSeconds,
      splits: [...(sessionData.splits || [])],
      completed: sessionData.completed,
      wasCountdown: finalState.mode === "countdown",
      countdownSeconds: finalState.countdownSeconds,
    });
    writeSessionSync(problem, sessionData, rootDir);

    if (sigintRef.current) {
      process.removeListener("SIGINT", sigintRef.current);
    }
    if (watcherRef.current) {
      watcherRef.current.close();
      watcherRef.current = null;
    }

    process.stdout.write("\x1b[2J\x1b[H");
    dispatch({ type: Action.SESSION_END });
  }

  useInput((input) => {
    if (input === "q" || input === "Q") {
      endSession(false);
    } else if (input === "p" || input === "P") {
      const timer = timerRef.current;
      if (timer) {
        if (timer.isPaused()) {
          timer.resume();
        } else {
          timer.pause();
        }
      }
    } else if (input === "l" || input === "L") {
      setShowLogs((prev) => !prev);
    }
  });

  return (
    <>
      <Text color="cyan">{"\n  "}Watching {problem} ({language})</Text>
      <Text dimColor>{"  "}Save in VS Code to run tests ({"\u2318"}S / Ctrl+S)  {"·"}  P pause  {"·"}  Q quit  {"·"}  L logs{"\n"}</Text>

      <Static items={messages}>
        {(msg) => {
          switch (msg.type) {
            case "title":
              return (
                <Text key={msg.id}>
                  <Text color="cyan">{"\n  "}{msg.text}</Text>
                </Text>
              );
            case "intro":
              return (
                <Text key={msg.id}>
                  <Text color="gray">{"  "}{"─".repeat(45)}</Text>
                  {"\n"}
                  <Text bold>{"  "}Part {msg.text.split(":")[0].includes("Part") ? msg.text : msg.text}</Text>
                  {msg.description ? "\n" + "  " + msg.description : ""}
                  {"\n"}
                  <Text color="gray">{"  "}{"─".repeat(45)}</Text>
                </Text>
              );
            case "partComplete":
              return <Text key={msg.id} color="green" bold>{"\n  "}{msg.text}</Text>;
            case "complete":
              return (
                <Text key={msg.id}>
                  <Text color="green" bold>{"\n  "}{msg.text}</Text>
                  {"\n"}
                  <Text color="gray">{"  "}Returning to menu...</Text>
                </Text>
              );
            case "milestone":
              return <Text key={msg.id}>{"\n"}{msg.text}</Text>;
            case "overtime":
              return <Text key={msg.id} color="red">{"\n  "}{msg.text}</Text>;
            case "warning":
              return <Text key={msg.id} color="yellow">{"  "}{msg.text}</Text>;
            default:
              return <Text key={msg.id}>{msg.text}</Text>;
          }
        }}
      </Static>

      {testState.running ? (
        <Text color="gray">{"  "}{"\u27F3"} Running tests...</Text>
      ) : testState.timedOut ? (
        <Text color="yellow">{"  "}{"\u23F8"} Test run timed out after {testState.timeoutSeconds}s {"\u2014"} check for infinite loops or hanging code</Text>
      ) : testState.crashed ? (
        <Text color="red">{"  "}{"\u2716"} Test runner crashed (exit code {testState.exitCode}) {"\u2014"} check for syntax errors or runtime exceptions</Text>
      ) : (
        <SummaryLine
          passed={testState.passed}
          total={testState.total}
          timestamp={testState.timestamp}
          partInfo={partInfo}
          timerDisplay={timerDisplay}
        />
      )}
      <ConsoleOutput lines={consoleOutput} visible={showLogs} />
      {errorMessage ? (
        <Text color="red">{"  "}Runner error: {errorMessage} {"\u2014"} save again to retry</Text>
      ) : null}
    </>
  );
}
