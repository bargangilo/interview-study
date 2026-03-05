/**
 * Application state machine for the CLI.
 * Pure state transitions — no side effects, no I/O.
 */
import { formatRunOutput, parseTestFailures } from "./format.js";

export const Screen = {
  MAIN_MENU: "MAIN_MENU",
  PROBLEM_SELECT: "PROBLEM_SELECT",
  LANGUAGE_SELECT: "LANGUAGE_SELECT",
  COUNTDOWN_PROMPT: "COUNTDOWN_PROMPT",
  RESUME_OR_RESTART: "RESUME_OR_RESTART",
  SESSION_ACTIVE: "SESSION_ACTIVE",
  PROBLEM_LIST: "PROBLEM_LIST",
  PROBLEM_LIST_DETAIL: "PROBLEM_LIST_DETAIL",
  STATS_OVERVIEW: "STATS_OVERVIEW",
  STATS_DETAIL: "STATS_DETAIL",
  CLEAR_PROBLEM_SELECT: "CLEAR_PROBLEM_SELECT",
  CLEAR_CONFIRM: "CLEAR_CONFIRM",
  EXPORT_SKILLS: "EXPORT_SKILLS",
  SETTINGS_MENU: "SETTINGS_MENU",
  SETTINGS_SECTION: "SETTINGS_SECTION",
  SETTINGS_EDIT_FIELD: "SETTINGS_EDIT_FIELD",
};

export const Action = {
  // Main menu
  GO_START: "GO_START",
  GO_LIST: "GO_LIST",
  GO_STATS: "GO_STATS",
  GO_CLEAR: "GO_CLEAR",
  GO_EXPORT_SKILLS: "GO_EXPORT_SKILLS",

  // Problem flow
  SELECT_PROBLEM: "SELECT_PROBLEM",
  SELECT_LANGUAGE: "SELECT_LANGUAGE",
  SET_COUNTDOWN: "SET_COUNTDOWN",
  SELECT_RESUME_RESTART: "SELECT_RESUME_RESTART",
  SESSION_END: "SESSION_END",

  // Problem list
  VIEW_PROBLEM_DETAIL: "VIEW_PROBLEM_DETAIL",

  // Stats
  SELECT_STATS_PROBLEM: "SELECT_STATS_PROBLEM",

  // Clear
  SELECT_CLEAR_PROBLEM: "SELECT_CLEAR_PROBLEM",
  CONFIRM_CLEAR: "CONFIRM_CLEAR",

  // Settings
  OPEN_SETTINGS: "OPEN_SETTINGS",
  SELECT_SETTINGS_SECTION: "SELECT_SETTINGS_SECTION",
  SELECT_SETTINGS_FIELD: "SELECT_SETTINGS_FIELD",
  SETTINGS_FIELD_SAVED: "SETTINGS_FIELD_SAVED",
  SETTINGS_BACK: "SETTINGS_BACK",

  // Session
  RUN_RESULT_RECEIVED: "RUN_RESULT_RECEIVED",
  TEST_RESULT_RECEIVED: "TEST_RESULT_RECEIVED",
  RUN_TESTS: "RUN_TESTS",
  WATCHER_ERROR: "WATCHER_ERROR",
  TOGGLE_LOGS: "TOGGLE_LOGS",

  // Navigation
  BACK: "BACK",
};

export const initialState = {
  screen: Screen.MAIN_MENU,
  // Accumulated context through the problem-start flow
  selectedProblem: null,
  problemConfig: null,
  availableLanguages: null,
  selectedLanguage: null,
  countdownSeconds: null,
  startPart: 0,
  resumeData: null,
  // Problem list / stats / clear context
  detailProblem: null,
  detailConfig: null,
  statsProblem: null,
  statsSession: null,
  clearProblem: null,
  clearConfig: null,
  // Session result context
  rawRunStdout: "",
  rawRunStderr: "",
  lastRunAt: null,
  runTimedOut: false,
  runCrashed: false,
  runSkipped: false,
  runOutput: [],
  testFailures: [],
  showLogs: false,
  watcherError: null,
  // Settings context
  configSchema: null,
  configValues: null,
  selectedSection: null,
  selectedField: null,
};

export function reducer(state, action) {
  switch (action.type) {
    // --- Main menu ---
    case Action.GO_START:
      return { ...state, screen: Screen.PROBLEM_SELECT };
    case Action.GO_LIST:
      return { ...state, screen: Screen.PROBLEM_LIST };
    case Action.GO_STATS:
      return { ...state, screen: Screen.STATS_OVERVIEW };
    case Action.GO_CLEAR:
      return { ...state, screen: Screen.CLEAR_PROBLEM_SELECT };
    case Action.GO_EXPORT_SKILLS:
      return { ...state, screen: Screen.EXPORT_SKILLS };
    case Action.OPEN_SETTINGS:
      return {
        ...state,
        screen: Screen.SETTINGS_MENU,
        configSchema: action.configSchema,
        configValues: action.configValues,
        selectedSection: null,
        selectedField: null,
      };

    // --- Start problem flow ---
    case Action.SELECT_PROBLEM:
      return {
        ...state,
        screen: Screen.LANGUAGE_SELECT,
        selectedProblem: action.problem,
        problemConfig: action.config,
        availableLanguages: action.languages,
      };
    case Action.SELECT_LANGUAGE:
      return {
        ...state,
        screen: action.hasExistingSession
          ? Screen.RESUME_OR_RESTART
          : Screen.COUNTDOWN_PROMPT,
        selectedLanguage: action.language,
      };
    case Action.SELECT_RESUME_RESTART:
      return {
        ...state,
        screen: Screen.COUNTDOWN_PROMPT,
        startPart: action.startPart,
        resumeData: action.resumeData,
      };
    case Action.SET_COUNTDOWN:
      return {
        ...state,
        screen: Screen.SESSION_ACTIVE,
        countdownSeconds: action.countdownSeconds,
      };
    case Action.SESSION_END:
      return {
        ...initialState,
        screen: Screen.MAIN_MENU,
      };

    // --- Problem list ---
    case Action.VIEW_PROBLEM_DETAIL:
      return {
        ...state,
        screen: Screen.PROBLEM_LIST_DETAIL,
        detailProblem: action.problem,
        detailConfig: action.config,
      };

    // --- Stats ---
    case Action.SELECT_STATS_PROBLEM:
      return {
        ...state,
        screen: Screen.STATS_DETAIL,
        statsProblem: action.problemName,
        statsSession: action.session,
      };

    // --- Clear ---
    case Action.SELECT_CLEAR_PROBLEM:
      return {
        ...state,
        screen: Screen.CLEAR_CONFIRM,
        clearProblem: action.problem,
        clearConfig: action.config,
      };
    case Action.CONFIRM_CLEAR:
      return {
        ...state,
        screen: Screen.CLEAR_PROBLEM_SELECT,
        clearProblem: null,
        clearConfig: null,
      };

    // --- Settings ---
    case Action.SELECT_SETTINGS_SECTION:
      return {
        ...state,
        screen: Screen.SETTINGS_SECTION,
        selectedSection: action.sectionKey,
        selectedField: null,
      };
    case Action.SELECT_SETTINGS_FIELD:
      return {
        ...state,
        screen: Screen.SETTINGS_EDIT_FIELD,
        selectedField: action.fieldKey,
      };
    case Action.SETTINGS_FIELD_SAVED:
      return {
        ...state,
        screen: Screen.SETTINGS_SECTION,
        configValues: action.configValues,
        selectedField: null,
      };
    case Action.SETTINGS_BACK: {
      if (state.screen === Screen.SETTINGS_EDIT_FIELD) {
        return { ...state, screen: Screen.SETTINGS_SECTION, selectedField: null };
      }
      if (state.screen === Screen.SETTINGS_SECTION) {
        return { ...state, screen: Screen.SETTINGS_MENU, selectedSection: null };
      }
      return { ...state, screen: Screen.MAIN_MENU, configSchema: null, configValues: null };
    }

    // --- Session ---
    case Action.RUN_RESULT_RECEIVED: {
      let runOutput;
      if (action.skipped) {
        runOutput = [{ type: "skipped" }];
      } else if (action.timedOut) {
        runOutput = [{ type: "timeout" }];
      } else if (action.crashed) {
        const parsed = formatRunOutput(action.stdout || "", action.stderr || "");
        runOutput = [{ type: "crashed" }, ...parsed];
      } else {
        runOutput = formatRunOutput(action.stdout || "", action.stderr || "");
      }
      return {
        ...state,
        rawRunStdout: action.stdout || "",
        rawRunStderr: action.stderr || "",
        lastRunAt: action.ranAt || null,
        runTimedOut: !!action.timedOut,
        runCrashed: !!action.crashed,
        runSkipped: !!action.skipped,
        runOutput,
        watcherError: null,
      };
    }
    case Action.TEST_RESULT_RECEIVED:
      return {
        ...state,
        testFailures: parseTestFailures(action.jestJson || null),
        watcherError: null,
      };
    case Action.RUN_TESTS:
      return state;
    case Action.WATCHER_ERROR:
      return { ...state, watcherError: action.message };
    case Action.TOGGLE_LOGS:
      return { ...state, showLogs: !state.showLogs };

    // --- Navigation ---
    case Action.BACK: {
      const backMap = {
        [Screen.PROBLEM_SELECT]: Screen.MAIN_MENU,
        [Screen.LANGUAGE_SELECT]: Screen.PROBLEM_SELECT,
        [Screen.COUNTDOWN_PROMPT]: Screen.MAIN_MENU,
        [Screen.RESUME_OR_RESTART]: Screen.MAIN_MENU,
        [Screen.PROBLEM_LIST]: Screen.MAIN_MENU,
        [Screen.PROBLEM_LIST_DETAIL]: Screen.PROBLEM_LIST,
        [Screen.STATS_OVERVIEW]: Screen.MAIN_MENU,
        [Screen.STATS_DETAIL]: Screen.STATS_OVERVIEW,
        [Screen.CLEAR_PROBLEM_SELECT]: Screen.MAIN_MENU,
        [Screen.CLEAR_CONFIRM]: Screen.CLEAR_PROBLEM_SELECT,
        [Screen.EXPORT_SKILLS]: Screen.MAIN_MENU,
        [Screen.SETTINGS_MENU]: Screen.MAIN_MENU,
        [Screen.SETTINGS_SECTION]: Screen.SETTINGS_MENU,
        [Screen.SETTINGS_EDIT_FIELD]: Screen.SETTINGS_SECTION,
      };
      const target = backMap[state.screen] || Screen.MAIN_MENU;
      return { ...state, screen: target };
    }

    default:
      return state;
  }
}
