/**
 * Timer module — owns all timer state and math.
 * Supports stopwatch and countdown modes with pause/resume.
 * Uses wall-clock math (never increments a counter).
 */

/**
 * Creates a new timer instance.
 * @param {Object} options
 * @param {"stopwatch"|"countdown"} options.mode
 * @param {number|null} options.countdownSeconds - total seconds for countdown (null in stopwatch)
 * @param {number} options.totalElapsedSeconds - restored elapsed (for resume)
 * @param {number} options.currentPartElapsedSeconds - restored part elapsed (for resume)
 * @param {number} options.totalPausedSeconds - restored paused time (for resume)
 * @returns {Object} timer controller
 */
function createTimer(options = {}) {
  const mode = options.mode || "stopwatch";
  const countdownSeconds = options.countdownSeconds || null;

  // Restored state (for resume)
  let restoredElapsedMs = (options.totalElapsedSeconds || 0) * 1000;
  let restoredPartElapsedMs = (options.currentPartElapsedSeconds || 0) * 1000;
  let totalPausedMs = (options.totalPausedSeconds || 0) * 1000;

  // Running state
  let startedAt = null; // Date.now() when current running segment began
  let pausedAt = null;
  let paused = false;
  let stopped = false;
  let intervalId = null;
  const tickCallbacks = [];

  // Milestone tracking
  const firedMilestones = new Set();

  // Part splits
  let partStartMs = 0; // ms into session when current part began

  function elapsedMs() {
    if (!startedAt) return restoredElapsedMs;
    const running = paused ? 0 : Date.now() - startedAt;
    return restoredElapsedMs + running;
  }

  function currentPartElapsedMs() {
    return elapsedMs() - partStartMs;
  }

  function totalElapsedSeconds() {
    return Math.floor(elapsedMs() / 1000);
  }

  function currentPartElapsedSeconds() {
    return Math.floor(currentPartElapsedMs() / 1000);
  }

  function totalPausedSeconds() {
    return Math.floor(totalPausedMs / 1000);
  }

  function remainingSeconds() {
    if (mode !== "countdown" || countdownSeconds == null) return null;
    return countdownSeconds - totalElapsedSeconds();
  }

  function isOvertime() {
    if (mode !== "countdown" || countdownSeconds == null) return false;
    return totalElapsedSeconds() > countdownSeconds;
  }

  function getDisplayState() {
    return {
      totalElapsedSeconds: totalElapsedSeconds(),
      currentPartElapsedSeconds: currentPartElapsedSeconds(),
      remaining: remainingSeconds(),
      isOvertime: isOvertime(),
      isPaused: paused,
      mode,
    };
  }

  function getState() {
    return {
      mode,
      countdownSeconds,
      totalElapsedSeconds: totalElapsedSeconds(),
      currentPartElapsedSeconds: currentPartElapsedSeconds(),
      totalPausedSeconds: totalPausedSeconds(),
      isPaused: paused,
      pausedAt: paused && pausedAt ? new Date(pausedAt).toISOString() : null,
    };
  }

  function checkMilestones() {
    const elapsed = totalElapsedSeconds();
    let newMilestone = null;

    if (mode === "stopwatch") {
      // Fire at 15, 30, 45 minutes
      const thresholds = [15 * 60, 30 * 60, 45 * 60];
      for (const t of thresholds) {
        if (elapsed >= t && !firedMilestones.has(t)) {
          firedMilestones.add(t);
          newMilestone = t;
        }
      }
    } else if (mode === "countdown" && countdownSeconds) {
      // Fire at 50% and 25% remaining
      const half = Math.floor(countdownSeconds * 0.5);
      const quarter = Math.floor(countdownSeconds * 0.75);
      const full = countdownSeconds;

      if (elapsed >= half && !firedMilestones.has(half)) {
        firedMilestones.add(half);
        newMilestone = half;
      }
      if (elapsed >= quarter && !firedMilestones.has(quarter)) {
        firedMilestones.add(quarter);
        newMilestone = quarter;
      }
      if (elapsed >= full && !firedMilestones.has(full)) {
        firedMilestones.add(full);
        newMilestone = full;
      }
    }

    return newMilestone;
  }

  function tick() {
    if (stopped || paused) return;
    const milestone = checkMilestones();
    const state = { ...getDisplayState(), newMilestone: milestone };
    for (const cb of tickCallbacks) {
      cb(state);
    }
  }

  function start() {
    if (startedAt) return; // already started
    startedAt = Date.now();
    partStartMs = restoredPartElapsedMs > 0
      ? restoredElapsedMs - restoredPartElapsedMs
      : 0;
    intervalId = setInterval(tick, 1000);
  }

  function pause() {
    if (paused || stopped || !startedAt) return;
    paused = true;
    pausedAt = Date.now();
    // Accumulate elapsed into restored so we don't lose it
    restoredElapsedMs += Date.now() - startedAt;
    startedAt = null;
    clearInterval(intervalId);
    intervalId = null;
    // Notify callbacks of paused state
    const state = { ...getDisplayState(), newMilestone: null };
    for (const cb of tickCallbacks) {
      cb(state);
    }
  }

  function resume() {
    if (!paused || stopped) return;
    const pauseDuration = Date.now() - pausedAt;
    totalPausedMs += pauseDuration;
    paused = false;
    pausedAt = null;
    startedAt = Date.now();
    intervalId = setInterval(tick, 1000);
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    if (!paused && startedAt) {
      restoredElapsedMs += Date.now() - startedAt;
      startedAt = null;
    }
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function splitPart() {
    const partElapsed = currentPartElapsedSeconds();
    partStartMs = elapsedMs();
    return partElapsed;
  }

  function onTick(callback) {
    tickCallbacks.push(callback);
  }

  function isPausedFn() {
    return paused;
  }

  return {
    start,
    pause,
    resume,
    stop,
    tick,
    splitPart,
    onTick,
    getState,
    getDisplayState,
    isPaused: isPausedFn,
  };
}

module.exports = { createTimer };
