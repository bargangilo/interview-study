import { Screen, Action, initialState, reducer } from "../../runner/state.js";

describe("initialState", () => {
  test("starts on MAIN_MENU", () => {
    expect(initialState.screen).toBe(Screen.MAIN_MENU);
  });

  test("has null context fields", () => {
    expect(initialState.selectedProblem).toBeNull();
    expect(initialState.selectedLanguage).toBeNull();
    expect(initialState.countdownSeconds).toBeNull();
  });

  test("has run result fields initialized", () => {
    expect(initialState.rawRunStdout).toBe("");
    expect(initialState.rawRunStderr).toBe("");
    expect(initialState.lastRunAt).toBeNull();
    expect(initialState.runTimedOut).toBe(false);
    expect(initialState.runCrashed).toBe(false);
    expect(initialState.runSkipped).toBe(false);
    expect(initialState.runOutput).toEqual([]);
    expect(initialState.testFailures).toEqual([]);
  });
});

describe("reducer", () => {
  // --- Main menu navigation ---

  test("GO_START transitions to PROBLEM_SELECT", () => {
    const state = reducer(initialState, { type: Action.GO_START });
    expect(state.screen).toBe(Screen.PROBLEM_SELECT);
  });

  test("GO_LIST transitions to PROBLEM_LIST", () => {
    const state = reducer(initialState, { type: Action.GO_LIST });
    expect(state.screen).toBe(Screen.PROBLEM_LIST);
  });

  test("GO_STATS transitions to STATS_OVERVIEW", () => {
    const state = reducer(initialState, { type: Action.GO_STATS });
    expect(state.screen).toBe(Screen.STATS_OVERVIEW);
  });

  test("GO_CLEAR transitions to CLEAR_PROBLEM_SELECT", () => {
    const state = reducer(initialState, { type: Action.GO_CLEAR });
    expect(state.screen).toBe(Screen.CLEAR_PROBLEM_SELECT);
  });

  test("GO_EXPORT_SKILLS transitions to EXPORT_SKILLS", () => {
    const state = reducer(initialState, { type: Action.GO_EXPORT_SKILLS });
    expect(state.screen).toBe(Screen.EXPORT_SKILLS);
  });

  // --- Problem flow ---

  test("SELECT_PROBLEM stores problem data and goes to LANGUAGE_SELECT", () => {
    const state = reducer(initialState, {
      type: Action.SELECT_PROBLEM,
      problem: "two-sum",
      config: { parts: [] },
      languages: ["JavaScript", "Python"],
    });
    expect(state.screen).toBe(Screen.LANGUAGE_SELECT);
    expect(state.selectedProblem).toBe("two-sum");
    expect(state.problemConfig).toEqual({ parts: [] });
    expect(state.availableLanguages).toEqual(["JavaScript", "Python"]);
  });

  test("SELECT_LANGUAGE goes to COUNTDOWN_PROMPT when no existing session", () => {
    const prev = { ...initialState, screen: Screen.LANGUAGE_SELECT };
    const state = reducer(prev, {
      type: Action.SELECT_LANGUAGE,
      language: "JavaScript",
      hasExistingSession: false,
    });
    expect(state.screen).toBe(Screen.COUNTDOWN_PROMPT);
    expect(state.selectedLanguage).toBe("JavaScript");
  });

  test("SELECT_LANGUAGE goes to RESUME_OR_RESTART when existing session", () => {
    const prev = { ...initialState, screen: Screen.LANGUAGE_SELECT };
    const state = reducer(prev, {
      type: Action.SELECT_LANGUAGE,
      language: "JavaScript",
      hasExistingSession: true,
    });
    expect(state.screen).toBe(Screen.RESUME_OR_RESTART);
  });

  test("SELECT_RESUME_RESTART stores startPart and goes to COUNTDOWN_PROMPT", () => {
    const prev = { ...initialState, screen: Screen.RESUME_OR_RESTART };
    const state = reducer(prev, {
      type: Action.SELECT_RESUME_RESTART,
      startPart: 2,
      resumeData: { timer: {} },
    });
    expect(state.screen).toBe(Screen.COUNTDOWN_PROMPT);
    expect(state.startPart).toBe(2);
    expect(state.resumeData).toEqual({ timer: {} });
  });

  test("SET_COUNTDOWN stores seconds and goes to SESSION_ACTIVE", () => {
    const prev = { ...initialState, screen: Screen.COUNTDOWN_PROMPT };
    const state = reducer(prev, {
      type: Action.SET_COUNTDOWN,
      countdownSeconds: 1800,
    });
    expect(state.screen).toBe(Screen.SESSION_ACTIVE);
    expect(state.countdownSeconds).toBe(1800);
  });

  test("SESSION_END resets to initial state", () => {
    const prev = {
      ...initialState,
      screen: Screen.SESSION_ACTIVE,
      selectedProblem: "two-sum",
      selectedLanguage: "JavaScript",
      countdownSeconds: 1800,
    };
    const state = reducer(prev, { type: Action.SESSION_END });
    expect(state.screen).toBe(Screen.MAIN_MENU);
    expect(state.selectedProblem).toBeNull();
    expect(state.selectedLanguage).toBeNull();
    expect(state.countdownSeconds).toBeNull();
  });

  // --- Problem list ---

  test("VIEW_PROBLEM_DETAIL stores detail and goes to PROBLEM_LIST_DETAIL", () => {
    const prev = { ...initialState, screen: Screen.PROBLEM_LIST };
    const state = reducer(prev, {
      type: Action.VIEW_PROBLEM_DETAIL,
      problem: "two-sum",
      config: { title: "Two Sum" },
    });
    expect(state.screen).toBe(Screen.PROBLEM_LIST_DETAIL);
    expect(state.detailProblem).toBe("two-sum");
    expect(state.detailConfig).toEqual({ title: "Two Sum" });
  });

  // --- Stats ---

  test("SELECT_STATS_PROBLEM stores stats and goes to STATS_DETAIL", () => {
    const prev = { ...initialState, screen: Screen.STATS_OVERVIEW };
    const state = reducer(prev, {
      type: Action.SELECT_STATS_PROBLEM,
      problemName: "Two Sum",
      session: { attempts: 3 },
    });
    expect(state.screen).toBe(Screen.STATS_DETAIL);
    expect(state.statsProblem).toBe("Two Sum");
  });

  // --- Clear ---

  test("SELECT_CLEAR_PROBLEM stores clear data and goes to CLEAR_CONFIRM", () => {
    const prev = { ...initialState, screen: Screen.CLEAR_PROBLEM_SELECT };
    const state = reducer(prev, {
      type: Action.SELECT_CLEAR_PROBLEM,
      problem: "two-sum",
      config: { title: "Two Sum" },
    });
    expect(state.screen).toBe(Screen.CLEAR_CONFIRM);
    expect(state.clearProblem).toBe("two-sum");
  });

  test("CONFIRM_CLEAR clears data and returns to CLEAR_PROBLEM_SELECT", () => {
    const prev = {
      ...initialState,
      screen: Screen.CLEAR_CONFIRM,
      clearProblem: "two-sum",
      clearConfig: { title: "Two Sum" },
    };
    const state = reducer(prev, { type: Action.CONFIRM_CLEAR });
    expect(state.screen).toBe(Screen.CLEAR_PROBLEM_SELECT);
    expect(state.clearProblem).toBeNull();
    expect(state.clearConfig).toBeNull();
  });

  // --- Back navigation ---

  test("BACK from PROBLEM_SELECT goes to MAIN_MENU", () => {
    const prev = { ...initialState, screen: Screen.PROBLEM_SELECT };
    const state = reducer(prev, { type: Action.BACK });
    expect(state.screen).toBe(Screen.MAIN_MENU);
  });

  test("BACK from LANGUAGE_SELECT goes to PROBLEM_SELECT", () => {
    const prev = { ...initialState, screen: Screen.LANGUAGE_SELECT };
    const state = reducer(prev, { type: Action.BACK });
    expect(state.screen).toBe(Screen.PROBLEM_SELECT);
  });

  test("BACK from COUNTDOWN_PROMPT goes to MAIN_MENU", () => {
    const prev = { ...initialState, screen: Screen.COUNTDOWN_PROMPT };
    const state = reducer(prev, { type: Action.BACK });
    expect(state.screen).toBe(Screen.MAIN_MENU);
  });

  test("BACK from STATS_DETAIL goes to STATS_OVERVIEW", () => {
    const prev = { ...initialState, screen: Screen.STATS_DETAIL };
    const state = reducer(prev, { type: Action.BACK });
    expect(state.screen).toBe(Screen.STATS_OVERVIEW);
  });

  test("BACK from CLEAR_CONFIRM goes to CLEAR_PROBLEM_SELECT", () => {
    const prev = { ...initialState, screen: Screen.CLEAR_CONFIRM };
    const state = reducer(prev, { type: Action.BACK });
    expect(state.screen).toBe(Screen.CLEAR_PROBLEM_SELECT);
  });

  test("BACK from EXPORT_SKILLS goes to MAIN_MENU", () => {
    const prev = { ...initialState, screen: Screen.EXPORT_SKILLS };
    const state = reducer(prev, { type: Action.BACK });
    expect(state.screen).toBe(Screen.MAIN_MENU);
  });

  test("BACK from MAIN_MENU stays on MAIN_MENU", () => {
    const state = reducer(initialState, { type: Action.BACK });
    expect(state.screen).toBe(Screen.MAIN_MENU);
  });

  // --- Settings ---

  test("OPEN_SETTINGS transitions to SETTINGS_MENU with schema and config", () => {
    const schema = [{ key: "topics" }];
    const config = { version: 1 };
    const state = reducer(initialState, {
      type: Action.OPEN_SETTINGS,
      configSchema: schema,
      configValues: config,
    });
    expect(state.screen).toBe(Screen.SETTINGS_MENU);
    expect(state.configSchema).toEqual(schema);
    expect(state.configValues).toEqual(config);
    expect(state.selectedSection).toBeNull();
    expect(state.selectedField).toBeNull();
  });

  test("SELECT_SETTINGS_SECTION transitions to SETTINGS_SECTION with section key", () => {
    const prev = {
      ...initialState,
      screen: Screen.SETTINGS_MENU,
      configSchema: [],
      configValues: {},
    };
    const state = reducer(prev, {
      type: Action.SELECT_SETTINGS_SECTION,
      sectionKey: "difficulty",
    });
    expect(state.screen).toBe(Screen.SETTINGS_SECTION);
    expect(state.selectedSection).toBe("difficulty");
    expect(state.selectedField).toBeNull();
  });

  test("SELECT_SETTINGS_FIELD transitions to SETTINGS_EDIT_FIELD with field key", () => {
    const prev = {
      ...initialState,
      screen: Screen.SETTINGS_SECTION,
      selectedSection: "difficulty",
    };
    const state = reducer(prev, {
      type: Action.SELECT_SETTINGS_FIELD,
      fieldKey: "difficulty.algorithmComplexity",
    });
    expect(state.screen).toBe(Screen.SETTINGS_EDIT_FIELD);
    expect(state.selectedField).toBe("difficulty.algorithmComplexity");
  });

  test("SETTINGS_FIELD_SAVED returns to SETTINGS_SECTION and updates configValues", () => {
    const prev = {
      ...initialState,
      screen: Screen.SETTINGS_EDIT_FIELD,
      selectedSection: "difficulty",
      selectedField: "difficulty.algorithmComplexity",
      configValues: { difficulty: { algorithmComplexity: [1, 3] } },
    };
    const newConfig = { difficulty: { algorithmComplexity: [2, 4] } };
    const state = reducer(prev, {
      type: Action.SETTINGS_FIELD_SAVED,
      configValues: newConfig,
    });
    expect(state.screen).toBe(Screen.SETTINGS_SECTION);
    expect(state.configValues).toEqual(newConfig);
    expect(state.selectedField).toBeNull();
  });

  test("SETTINGS_BACK from SETTINGS_EDIT_FIELD returns to SETTINGS_SECTION", () => {
    const prev = {
      ...initialState,
      screen: Screen.SETTINGS_EDIT_FIELD,
      selectedSection: "difficulty",
      selectedField: "difficulty.algorithmComplexity",
    };
    const state = reducer(prev, { type: Action.SETTINGS_BACK });
    expect(state.screen).toBe(Screen.SETTINGS_SECTION);
    expect(state.selectedField).toBeNull();
  });

  test("SETTINGS_BACK from SETTINGS_SECTION returns to SETTINGS_MENU", () => {
    const prev = {
      ...initialState,
      screen: Screen.SETTINGS_SECTION,
      selectedSection: "difficulty",
    };
    const state = reducer(prev, { type: Action.SETTINGS_BACK });
    expect(state.screen).toBe(Screen.SETTINGS_MENU);
    expect(state.selectedSection).toBeNull();
  });

  test("SETTINGS_BACK from SETTINGS_MENU returns to MAIN_MENU", () => {
    const prev = {
      ...initialState,
      screen: Screen.SETTINGS_MENU,
      configSchema: [],
      configValues: {},
    };
    const state = reducer(prev, { type: Action.SETTINGS_BACK });
    expect(state.screen).toBe(Screen.MAIN_MENU);
    expect(state.configSchema).toBeNull();
    expect(state.configValues).toBeNull();
  });

  // --- Run result ---

  test("RUN_RESULT_RECEIVED sets runOutput to parsed array", () => {
    const prev = { ...initialState };
    const state = reducer(prev, {
      type: Action.RUN_RESULT_RECEIVED,
      stdout: "[test] \u2714 42\n",
      stderr: "",
      ranAt: "2026-03-05T00:00:00.000Z",
    });
    expect(state.rawRunStdout).toBe("[test] \u2714 42\n");
    expect(state.rawRunStderr).toBe("");
    expect(state.runOutput).toEqual([
      { type: "result", label: "test", passed: true, actual: "42" },
    ]);
  });

  test("RUN_RESULT_RECEIVED timeout produces [{ type: timeout }]", () => {
    const prev = { ...initialState };
    const state = reducer(prev, {
      type: Action.RUN_RESULT_RECEIVED,
      timedOut: true,
      crashed: false,
      skipped: false,
      ranAt: "2026-03-05T12:00:00.000Z",
    });
    expect(state.lastRunAt).toBe("2026-03-05T12:00:00.000Z");
    expect(state.runTimedOut).toBe(true);
    expect(state.runOutput).toEqual([{ type: "timeout" }]);
  });

  test("RUN_RESULT_RECEIVED crashed produces [{ type: crashed }] plus parsed", () => {
    const prev = { ...initialState };
    const state = reducer(prev, {
      type: Action.RUN_RESULT_RECEIVED,
      crashed: true,
      stdout: "[test] \u2714 42\n",
      stderr: "fatal error\n",
      ranAt: "2026-03-05T12:00:00.000Z",
    });
    expect(state.runCrashed).toBe(true);
    expect(state.runOutput[0]).toEqual({ type: "crashed" });
    expect(state.runOutput.length).toBeGreaterThan(1);
  });

  test("RUN_RESULT_RECEIVED skipped produces [{ type: skipped }]", () => {
    const prev = { ...initialState };
    const state = reducer(prev, {
      type: Action.RUN_RESULT_RECEIVED,
      skipped: true,
      ranAt: "2026-03-05T12:00:00.000Z",
    });
    expect(state.runSkipped).toBe(true);
    expect(state.runOutput).toEqual([{ type: "skipped" }]);
  });

  test("RUN_RESULT_RECEIVED clears watcherError", () => {
    const prev = { ...initialState, watcherError: "old error" };
    const state = reducer(prev, {
      type: Action.RUN_RESULT_RECEIVED,
      stdout: "",
      stderr: "",
    });
    expect(state.watcherError).toBeNull();
  });

  // --- Test result ---

  test("TEST_RESULT_RECEIVED clears watcherError", () => {
    const prev = { ...initialState, watcherError: "old error" };
    const state = reducer(prev, { type: Action.TEST_RESULT_RECEIVED });
    expect(state.watcherError).toBeNull();
  });

  test("TEST_RESULT_RECEIVED does not modify runOutput", () => {
    const existingOutput = [{ type: "result", label: "test", passed: true, actual: "42" }];
    const prev = { ...initialState, runOutput: existingOutput };
    const state = reducer(prev, { type: Action.TEST_RESULT_RECEIVED });
    expect(state.runOutput).toBe(existingOutput);
  });

  test("TEST_RESULT_RECEIVED populates testFailures from jestJson", () => {
    const jestJson = JSON.stringify({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          {
            status: "failed",
            title: "handles edge case",
            failureMessages: ["expect(received).toEqual(expected)\n\nExpected: [1]\nReceived: [2]"],
          },
        ],
      }],
    });
    const prev = { ...initialState };
    const state = reducer(prev, { type: Action.TEST_RESULT_RECEIVED, jestJson });
    expect(state.testFailures).toHaveLength(1);
    expect(state.testFailures[0].name).toBe("handles edge case");
    expect(state.testFailures[0].expected).toBe("[1]");
    expect(state.testFailures[0].received).toBe("[2]");
  });

  test("TEST_RESULT_RECEIVED testFailures is [] when all tests pass", () => {
    const jestJson = JSON.stringify({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "passed", title: "works", failureMessages: [] },
        ],
      }],
    });
    const prev = { ...initialState, testFailures: [{ name: "old" }] };
    const state = reducer(prev, { type: Action.TEST_RESULT_RECEIVED, jestJson });
    expect(state.testFailures).toEqual([]);
  });

  test("TEST_RESULT_RECEIVED testFailures is [] when jestJson is null", () => {
    const prev = { ...initialState, testFailures: [{ name: "old" }] };
    const state = reducer(prev, { type: Action.TEST_RESULT_RECEIVED, jestJson: null });
    expect(state.testFailures).toEqual([]);
  });

  test("TEST_RESULT_RECEIVED replaces testFailures entirely — not appended", () => {
    const jestJson1 = JSON.stringify({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "fail A", failureMessages: ["error A"] },
        ],
      }],
    });
    const jestJson2 = JSON.stringify({
      testResults: [{
        testFilePath: "/test.js",
        assertionResults: [
          { status: "failed", title: "fail B", failureMessages: ["error B"] },
        ],
      }],
    });
    const state1 = reducer(initialState, { type: Action.TEST_RESULT_RECEIVED, jestJson: jestJson1 });
    expect(state1.testFailures).toHaveLength(1);
    expect(state1.testFailures[0].name).toBe("fail A");

    const state2 = reducer(state1, { type: Action.TEST_RESULT_RECEIVED, jestJson: jestJson2 });
    expect(state2.testFailures).toHaveLength(1);
    expect(state2.testFailures[0].name).toBe("fail B");
  });

  test("RUN_RESULT_RECEIVED does not modify testFailures", () => {
    const existingFailures = [{ name: "existing" }];
    const prev = { ...initialState, testFailures: existingFailures };
    const state = reducer(prev, {
      type: Action.RUN_RESULT_RECEIVED,
      stdout: "",
      stderr: "",
    });
    expect(state.testFailures).toBe(existingFailures);
  });

  // --- RUN_TESTS ---

  test("RUN_TESTS does not change state", () => {
    const prev = { ...initialState };
    const state = reducer(prev, { type: Action.RUN_TESTS });
    expect(state).toBe(prev);
  });

  // --- Console output and logs ---

  test("TOGGLE_LOGS toggles showLogs from false to true", () => {
    const prev = { ...initialState, showLogs: false };
    const state = reducer(prev, { type: Action.TOGGLE_LOGS });
    expect(state.showLogs).toBe(true);
  });

  test("TOGGLE_LOGS toggles showLogs from true to false", () => {
    const prev = { ...initialState, showLogs: true };
    const state = reducer(prev, { type: Action.TOGGLE_LOGS });
    expect(state.showLogs).toBe(false);
  });

  // --- Unknown action ---

  test("unknown action returns state unchanged", () => {
    const state = reducer(initialState, { type: "UNKNOWN" });
    expect(state).toBe(initialState);
  });
});
