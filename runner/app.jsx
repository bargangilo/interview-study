import React, { useReducer, useMemo, useCallback } from "react";
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
  const [state, dispatch] = useReducer(reducer, initialState);

  // Wrap dispatch to intercept certain actions for side-effect enrichment
  const enrichedDispatch = useCallback((action) => {
    if (action.type === Action.SELECT_LANGUAGE) {
      // Check if there's an existing session to determine resume/restart flow
      const hasExisting = hasWorkspaceFile(state.selectedProblem, action.language, rootDir);
      dispatch({ ...action, hasExistingSession: hasExisting });
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

  switch (state.screen) {
    case Screen.MAIN_MENU:
      return <MainMenu dispatch={enrichedDispatch} />;

    case Screen.PROBLEM_SELECT:
      return <ProblemSelect dispatch={enrichedDispatch} problems={problems} />;

    case Screen.LANGUAGE_SELECT:
      return (
        <LanguageSelect
          dispatch={enrichedDispatch}
          languages={state.availableLanguages}
          problem={state.selectedProblem}
          rootDir={rootDir}
        />
      );

    case Screen.COUNTDOWN_PROMPT:
      return (
        <CountdownPrompt
          dispatch={enrichedDispatch}
          expectedMinutes={state.problemConfig?.expectedMinutes || null}
        />
      );

    case Screen.RESUME_OR_RESTART:
      return (
        <ResumeOrRestart
          dispatch={enrichedDispatch}
          problem={state.selectedProblem}
          language={state.selectedLanguage}
          rootDir={rootDir}
          inferCurrentPart={inferCurrentPart}
          loadSession={loadSession}
        />
      );

    case Screen.SESSION_ACTIVE:
      return (
        <SessionActive
          dispatch={enrichedDispatch}
          problem={state.selectedProblem}
          config={state.problemConfig}
          language={state.selectedLanguage}
          countdownSeconds={state.countdownSeconds}
          startPart={state.startPart}
          resumeData={state.resumeData}
          rootDir={rootDir}
        />
      );

    case Screen.PROBLEM_LIST:
      return <ProblemList dispatch={enrichedDispatch} problems={problems} />;

    case Screen.PROBLEM_LIST_DETAIL:
      return (
        <ProblemListDetail
          dispatch={enrichedDispatch}
          problem={state.detailProblem}
          config={state.detailConfig}
          status={problems.find((p) => p.name === state.detailProblem)?.status || null}
        />
      );

    case Screen.STATS_OVERVIEW:
      return (
        <StatsOverview
          dispatch={enrichedDispatch}
          sessions={sessions}
          problems={problems}
        />
      );

    case Screen.STATS_DETAIL:
      return (
        <StatsDetail
          dispatch={enrichedDispatch}
          problemName={state.statsProblem}
          session={state.statsSession}
          problems={problems}
        />
      );

    case Screen.CLEAR_PROBLEM_SELECT:
      return (
        <ClearProblemSelect
          dispatch={enrichedDispatch}
          problems={clearableProblems}
        />
      );

    case Screen.CLEAR_CONFIRM:
      return (
        <ClearConfirm
          dispatch={enrichedDispatch}
          problem={state.clearProblem}
          config={state.clearConfig}
          rootDir={rootDir}
        />
      );

    case Screen.EXPORT_SKILLS:
      return <ExportSkills dispatch={enrichedDispatch} rootDir={rootDir} />;

    default:
      return <MainMenu dispatch={enrichedDispatch} />;
  }
}
