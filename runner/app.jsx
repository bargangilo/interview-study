import React, { useReducer, useMemo, useCallback, Profiler } from "react";
import { Box } from "ink";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { Screen, Action, initialState, reducer } from "./state.js";
import {
  loadProblemConfig,
  getWorkspaceStatus,
  hasWorkspaceDir,
  hasWorkspaceFile,
  inferCurrentPart,
  loadConfigSchema,
  readUserConfig,
  writeUserConfig,
} from "./config.js";
import { formatStatusBadge } from "./format.js";
import { readAllSessions, loadSession } from "./stats.js";

import MainMenu from "./components/MainMenu.jsx";
import ProblemSelect from "./components/ProblemSelect.jsx";
import LanguageSelect from "./components/LanguageSelect.jsx";
import CountdownPrompt from "./components/CountdownPrompt.jsx";
import ResumeOrRestart from "./components/ResumeOrRestart.jsx";
import SessionActive from "./components/SessionActive.jsx";
import ProblemList from "./components/ProblemList.jsx";
import ProblemListDetail from "./components/ProblemListDetail.jsx";
import StatsOverview from "./components/StatsOverview.jsx";
import StatsDetail from "./components/StatsDetail.jsx";
import ClearProblemSelect from "./components/ClearProblemSelect.jsx";
import ClearConfirm from "./components/ClearConfirm.jsx";
import ExportSkills from "./components/ExportSkills.jsx";
import SettingsMenu from "./components/SettingsMenu.jsx";
import SettingsSection from "./components/SettingsSection.jsx";
import SettingsEditField from "./components/SettingsEditField.jsx";

const _debugModule = process.env.HANDWRITTEN_DEBUG === "1"
  ? await import("./debug.js")
  : null;

const activeReducer = _debugModule
  ? (state, action) => { _debugModule.logDispatch(action); return reducer(state, action); }
  : reducer;

function detectProblems(rootDir) {
  const problemsDir = path.join(rootDir, "problems");
  if (!fs.existsSync(problemsDir)) return [];
  return fs
    .readdirSync(problemsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function problemHasLanguage(problem, language, rootDir) {
  const ext = language === "JavaScript" ? "js" : "py";
  return fs.existsSync(
    path.join(rootDir, "problems", problem, `main.${ext}`)
  );
}

function loadAllProblems(rootDir) {
  const names = detectProblems(rootDir);
  const problems = [];
  for (const name of names) {
    try {
      const config = loadProblemConfig(name, rootDir);
      if (!config) continue;
      const status = getWorkspaceStatus(name, config, rootDir);
      const statusBadge = formatStatusBadge(status);
      const languages = [];
      if (problemHasLanguage(name, "JavaScript", rootDir)) languages.push("JavaScript");
      if (problemHasLanguage(name, "Python", rootDir)) languages.push("Python");
      problems.push({ name, config, status, statusBadge, languages });
    } catch {
      // Skip malformed problems
    }
  }
  return problems;
}

export default function App({ rootDir }) {
  const [state, dispatch] = useReducer(activeReducer, initialState);

  // Wrap dispatch to intercept certain actions for side-effect enrichment
  const enrichedDispatch = useCallback((action) => {
    if (action.type === Action.SELECT_LANGUAGE) {
      const hasExisting = hasWorkspaceFile(state.selectedProblem, action.language, rootDir);
      dispatch({ ...action, hasExistingSession: hasExisting });
      return;
    }
    if (action.type === Action.OPEN_SETTINGS) {
      const configSchema = loadConfigSchema(rootDir);
      const configValues = readUserConfig(rootDir);
      dispatch({ ...action, configSchema, configValues });
      return;
    }
    if (action.type === Action.SETTINGS_FIELD_SAVED) {
      writeUserConfig(action.configValues, rootDir);
      const freshConfig = readUserConfig(rootDir);
      dispatch({ ...action, configValues: freshConfig });
      return;
    }
    dispatch(action);
  }, [state.selectedProblem, rootDir]);

  // Load problems fresh on each render for screens that need them
  const problems = useMemo(() => {
    if ([Screen.PROBLEM_SELECT, Screen.PROBLEM_LIST, Screen.PROBLEM_LIST_DETAIL,
         Screen.STATS_OVERVIEW, Screen.STATS_DETAIL,
         Screen.CLEAR_PROBLEM_SELECT, Screen.CLEAR_CONFIRM].includes(state.screen)) {
      return loadAllProblems(rootDir);
    }
    return [];
  }, [state.screen, rootDir]);

  // Load sessions for stats screens
  const sessions = useMemo(() => {
    if ([Screen.STATS_OVERVIEW, Screen.STATS_DETAIL].includes(state.screen)) {
      return readAllSessions(rootDir);
    }
    return [];
  }, [state.screen, rootDir]);

  // Filter problems with workspaces for clear screen
  const clearableProblems = useMemo(() => {
    if ([Screen.CLEAR_PROBLEM_SELECT, Screen.CLEAR_CONFIRM].includes(state.screen)) {
      return problems.filter(({ name }) => hasWorkspaceDir(name, rootDir));
    }
    return [];
  }, [state.screen, problems, rootDir]);

  let screen;
  switch (state.screen) {
    case Screen.MAIN_MENU:
      screen = <MainMenu dispatch={enrichedDispatch} />;
      break;

    case Screen.PROBLEM_SELECT:
      screen = <ProblemSelect dispatch={enrichedDispatch} problems={problems} />;
      break;

    case Screen.LANGUAGE_SELECT:
      screen = (
        <LanguageSelect
          dispatch={enrichedDispatch}
          languages={state.availableLanguages}
          problem={state.selectedProblem}
          rootDir={rootDir}
        />
      );
      break;

    case Screen.COUNTDOWN_PROMPT:
      screen = (
        <CountdownPrompt
          dispatch={enrichedDispatch}
          expectedMinutes={state.problemConfig?.expectedMinutes || null}
          isCompletedResume={!!state.resumeData?.completed}
        />
      );
      break;

    case Screen.RESUME_OR_RESTART:
      screen = (
        <ResumeOrRestart
          dispatch={enrichedDispatch}
          problem={state.selectedProblem}
          language={state.selectedLanguage}
          rootDir={rootDir}
          inferCurrentPart={inferCurrentPart}
          loadSession={loadSession}
        />
      );
      break;

    case Screen.SESSION_ACTIVE:
      screen = (
        <SessionActive
          dispatch={enrichedDispatch}
          problem={state.selectedProblem}
          config={state.problemConfig}
          language={state.selectedLanguage}
          countdownSeconds={state.countdownSeconds}
          timerMode={state.timerMode}
          startPart={state.startPart}
          resumeData={state.resumeData}
          runOutput={state.runOutput}
          lastRunAt={state.lastRunAt}
          showLogs={state.showLogs}
          testFailures={state.testFailures}
          testConsoleLogs={state.testConsoleLogs}
          rootDir={rootDir}
        />
      );
      break;

    case Screen.PROBLEM_LIST:
      screen = <ProblemList dispatch={enrichedDispatch} problems={problems} />;
      break;

    case Screen.PROBLEM_LIST_DETAIL:
      screen = (
        <ProblemListDetail
          dispatch={enrichedDispatch}
          problem={state.detailProblem}
          config={state.detailConfig}
          status={problems.find((p) => p.name === state.detailProblem)?.status || null}
        />
      );
      break;

    case Screen.STATS_OVERVIEW:
      screen = (
        <StatsOverview
          dispatch={enrichedDispatch}
          sessions={sessions}
          problems={problems}
        />
      );
      break;

    case Screen.STATS_DETAIL:
      screen = (
        <StatsDetail
          dispatch={enrichedDispatch}
          problemName={state.statsProblem}
          session={state.statsSession}
          problems={problems}
        />
      );
      break;

    case Screen.CLEAR_PROBLEM_SELECT:
      screen = (
        <ClearProblemSelect
          dispatch={enrichedDispatch}
          problems={clearableProblems}
        />
      );
      break;

    case Screen.CLEAR_CONFIRM:
      screen = (
        <ClearConfirm
          dispatch={enrichedDispatch}
          problem={state.clearProblem}
          config={state.clearConfig}
          rootDir={rootDir}
        />
      );
      break;

    case Screen.EXPORT_SKILLS:
      screen = <ExportSkills dispatch={enrichedDispatch} rootDir={rootDir} />;
      break;

    case Screen.SETTINGS_MENU:
      screen = (
        <SettingsMenu
          configSchema={state.configSchema}
          configValues={state.configValues}
          dispatch={enrichedDispatch}
        />
      );
      break;

    case Screen.SETTINGS_SECTION:
      screen = (
        <SettingsSection
          configSchema={state.configSchema}
          configValues={state.configValues}
          selectedSection={state.selectedSection}
          dispatch={enrichedDispatch}
        />
      );
      break;

    case Screen.SETTINGS_EDIT_FIELD:
      screen = (
        <SettingsEditField
          configSchema={state.configSchema}
          configValues={state.configValues}
          selectedSection={state.selectedSection}
          selectedField={state.selectedField}
          dispatch={enrichedDispatch}
        />
      );
      break;

    default:
      screen = <MainMenu dispatch={enrichedDispatch} />;
  }

  const content = <Box flexDirection="column" minHeight={15}>{screen}</Box>;
  return _debugModule
    ? <Profiler id="App" onRender={_debugModule.onRender}>{content}</Profiler>
    : content;
}
