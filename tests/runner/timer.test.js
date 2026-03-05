import { createTimer } from "../../runner/timer.js";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("createTimer", () => {
  test("returns expected controller shape", () => {
    const timer = createTimer({ mode: "stopwatch" });
    expect(typeof timer.start).toBe("function");
    expect(typeof timer.pause).toBe("function");
    expect(typeof timer.resume).toBe("function");
    expect(typeof timer.stop).toBe("function");
    expect(typeof timer.tick).toBe("function");
    expect(typeof timer.splitPart).toBe("function");
    expect(typeof timer.onTick).toBe("function");
    expect(typeof timer.getState).toBe("function");
    expect(typeof timer.getDisplayState).toBe("function");
    expect(typeof timer.isPaused).toBe("function");
  });

  test("initial state before start", () => {
    const timer = createTimer({ mode: "stopwatch" });
    const state = timer.getDisplayState();
    expect(state.totalElapsedSeconds).toBe(0);
    expect(state.currentPartElapsedSeconds).toBe(0);
    expect(state.remaining).toBeNull();
    expect(state.isOvertime).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.mode).toBe("stopwatch");
  });
});

describe("stopwatch mode", () => {
  test("elapsed increments each second", () => {
    const timer = createTimer({ mode: "stopwatch" });
    const ticks = [];
    timer.onTick((state) => ticks.push(state));
    timer.start();

    jest.advanceTimersByTime(3000);

    expect(ticks.length).toBe(3);
    expect(ticks[2].totalElapsedSeconds).toBe(3);
  });

  test("remaining is null in stopwatch mode", () => {
    const timer = createTimer({ mode: "stopwatch" });
    timer.start();
    jest.advanceTimersByTime(5000);
    expect(timer.getDisplayState().remaining).toBeNull();
  });

  test("isOvertime is false in stopwatch mode", () => {
    const timer = createTimer({ mode: "stopwatch" });
    timer.start();
    jest.advanceTimersByTime(60000);
    expect(timer.getDisplayState().isOvertime).toBe(false);
  });
});

describe("countdown mode", () => {
  test("remaining decrements correctly", () => {
    const timer = createTimer({ mode: "countdown", countdownSeconds: 300 });
    timer.start();
    jest.advanceTimersByTime(10000);
    expect(timer.getDisplayState().remaining).toBe(290);
  });

  test("overtime detected when elapsed exceeds countdown", () => {
    const timer = createTimer({ mode: "countdown", countdownSeconds: 5 });
    timer.start();
    jest.advanceTimersByTime(6000);
    expect(timer.getDisplayState().isOvertime).toBe(true);
  });

  test("not overtime before countdown expires", () => {
    const timer = createTimer({ mode: "countdown", countdownSeconds: 60 });
    timer.start();
    jest.advanceTimersByTime(30000);
    expect(timer.getDisplayState().isOvertime).toBe(false);
  });
});

describe("pause and resume", () => {
  test("pause stops elapsed accumulation", () => {
    const timer = createTimer({ mode: "stopwatch" });
    timer.start();
    jest.advanceTimersByTime(5000);
    timer.pause();
    const elapsedAtPause = timer.getDisplayState().totalElapsedSeconds;
    jest.advanceTimersByTime(10000);
    expect(timer.getDisplayState().totalElapsedSeconds).toBe(elapsedAtPause);
  });

  test("resume continues elapsed accumulation", () => {
    const timer = createTimer({ mode: "stopwatch" });
    timer.start();
    jest.advanceTimersByTime(5000);
    timer.pause();
    jest.advanceTimersByTime(3000);
    timer.resume();
    jest.advanceTimersByTime(2000);
    // 5 + 2 = 7 seconds elapsed (3 paused excluded)
    expect(timer.getDisplayState().totalElapsedSeconds).toBe(7);
  });

  test("multiple pause/resume cycles accumulate correctly", () => {
    const timer = createTimer({ mode: "stopwatch" });
    timer.start();
    jest.advanceTimersByTime(3000); // 3s elapsed
    timer.pause();
    jest.advanceTimersByTime(2000); // 2s paused
    timer.resume();
    jest.advanceTimersByTime(4000); // 4s elapsed
    timer.pause();
    jest.advanceTimersByTime(5000); // 5s paused
    timer.resume();
    jest.advanceTimersByTime(1000); // 1s elapsed
    // Total: 3 + 4 + 1 = 8s elapsed, 2 + 5 = 7s paused
    expect(timer.getDisplayState().totalElapsedSeconds).toBe(8);
    expect(timer.getState().totalPausedSeconds).toBe(7);
  });

  test("isPaused returns correct state", () => {
    const timer = createTimer({ mode: "stopwatch" });
    expect(timer.isPaused()).toBe(false);
    timer.start();
    expect(timer.isPaused()).toBe(false);
    timer.pause();
    expect(timer.isPaused()).toBe(true);
    timer.resume();
    expect(timer.isPaused()).toBe(false);
  });

  test("pause is no-op when already paused", () => {
    const timer = createTimer({ mode: "stopwatch" });
    timer.start();
    jest.advanceTimersByTime(3000);
    timer.pause();
    timer.pause(); // no-op
    expect(timer.isPaused()).toBe(true);
  });

  test("resume is no-op when not paused", () => {
    const timer = createTimer({ mode: "stopwatch" });
    timer.start();
    timer.resume(); // no-op
    jest.advanceTimersByTime(3000);
    expect(timer.getDisplayState().totalElapsedSeconds).toBe(3);
  });
});

describe("splitPart", () => {
  test("returns current part elapsed and resets", () => {
    const timer = createTimer({ mode: "stopwatch" });
    timer.start();
    jest.advanceTimersByTime(10000);
    const split = timer.splitPart();
    expect(split).toBe(10);
    // After split, current part elapsed resets
    expect(timer.getDisplayState().currentPartElapsedSeconds).toBe(0);
  });

  test("multiple splits track correctly", () => {
    const timer = createTimer({ mode: "stopwatch" });
    timer.start();
    jest.advanceTimersByTime(5000);
    const split1 = timer.splitPart();
    jest.advanceTimersByTime(8000);
    const split2 = timer.splitPart();
    expect(split1).toBe(5);
    expect(split2).toBe(8);
    // Total elapsed should still be 13
    expect(timer.getDisplayState().totalElapsedSeconds).toBe(13);
  });
});

describe("milestone tracking", () => {
  test("stopwatch milestones fire at 15, 30, 45 minutes", () => {
    const timer = createTimer({ mode: "stopwatch" });
    const milestones = [];
    timer.onTick((state) => {
      if (state.newMilestone) milestones.push(state.newMilestone);
    });
    timer.start();

    jest.advanceTimersByTime(14 * 60 * 1000);
    expect(milestones).toEqual([]);

    jest.advanceTimersByTime(60 * 1000);
    expect(milestones).toContain(15 * 60);

    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(milestones).toContain(30 * 60);

    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(milestones).toContain(45 * 60);

    expect(milestones).toHaveLength(3);
  });

  test("milestones fire exactly once", () => {
    const timer = createTimer({ mode: "stopwatch" });
    const milestones = [];
    timer.onTick((state) => {
      if (state.newMilestone) milestones.push(state.newMilestone);
    });
    timer.start();

    jest.advanceTimersByTime(20 * 60 * 1000);

    const fifteenMinMilestones = milestones.filter((m) => m === 15 * 60);
    expect(fifteenMinMilestones).toHaveLength(1);
  });

  test("countdown milestones fire at 50% and 75% elapsed", () => {
    const timer = createTimer({ mode: "countdown", countdownSeconds: 100 });
    const milestones = [];
    timer.onTick((state) => {
      if (state.newMilestone) milestones.push(state.newMilestone);
    });
    timer.start();

    jest.advanceTimersByTime(50 * 1000);
    expect(milestones).toContain(50);

    jest.advanceTimersByTime(25 * 1000);
    expect(milestones).toContain(75);

    jest.advanceTimersByTime(25 * 1000);
    expect(milestones).toContain(100);
  });
});

describe("serialization", () => {
  test("getState returns all needed fields", () => {
    const timer = createTimer({ mode: "countdown", countdownSeconds: 300 });
    timer.start();
    jest.advanceTimersByTime(10000);
    const state = timer.getState();
    expect(state.mode).toBe("countdown");
    expect(state.countdownSeconds).toBe(300);
    expect(state.totalElapsedSeconds).toBe(10);
    expect(state.totalPausedSeconds).toBe(0);
    expect(state.isPaused).toBe(false);
    expect(state.pausedAt).toBeNull();
  });

  test("restore from saved state", () => {
    const timer = createTimer({
      mode: "stopwatch",
      totalElapsedSeconds: 120,
      currentPartElapsedSeconds: 30,
      totalPausedSeconds: 15,
    });
    timer.start();
    jest.advanceTimersByTime(5000);
    expect(timer.getDisplayState().totalElapsedSeconds).toBe(125);
  });
});

describe("stop", () => {
  test("stop finalizes elapsed and clears interval", () => {
    const timer = createTimer({ mode: "stopwatch" });
    const ticks = [];
    timer.onTick((state) => ticks.push(state));
    timer.start();
    jest.advanceTimersByTime(3000);
    timer.stop();
    const tickCount = ticks.length;
    jest.advanceTimersByTime(5000);
    expect(ticks.length).toBe(tickCount);
    expect(timer.getDisplayState().totalElapsedSeconds).toBe(3);
  });
});

describe("multiple tick listeners", () => {
  test("onTick supports multiple callbacks", () => {
    const timer = createTimer({ mode: "stopwatch" });
    const results1 = [];
    const results2 = [];
    timer.onTick((state) => results1.push(state.totalElapsedSeconds));
    timer.onTick((state) => results2.push(state.totalElapsedSeconds));
    timer.start();
    jest.advanceTimersByTime(2000);
    expect(results1).toEqual([1, 2]);
    expect(results2).toEqual([1, 2]);
  });
});
