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

  // --- Unknown action ---

  test("unknown action returns state unchanged", () => {
    const state = reducer(initialState, { type: "UNKNOWN" });
    expect(state).toBe(initialState);
  });
});
