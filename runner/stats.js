/**
 * Stats module — session read/write and stats computation.
 * Pure functions (except write helpers). No UI concerns.
 */

const path = require("path");
const fs = require("fs");

let _writePending = false;

/**
 * Returns the path to session.json for a problem.
 */
function sessionPath(problemName, rootDir) {
  return path.join(rootDir, "workspace", problemName, "session.json");
}

/**
 * Reads a single session.json. Returns null if missing or malformed.
 */
function loadSession(problemName, rootDir) {
  const p = sessionPath(problemName, rootDir);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Reads all session.json files from workspace subdirectories.
 * Returns array of { problemName, session } objects.
 */
function readAllSessions(rootDir) {
  const workspaceDir = path.join(rootDir, "workspace");
  if (!fs.existsSync(workspaceDir)) return [];

  const results = [];
  const entries = fs.readdirSync(workspaceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const session = loadSession(entry.name, rootDir);
    if (session) {
      results.push({ problemName: entry.name, session });
    }
  }
  return results;
}

/**
 * Computes aggregate stats across all sessions.
 */
function computeGlobalStats(sessions) {
  let totalPracticeSeconds = 0;
  const problemsAttempted = sessions.length;
  let problemsCompleted = 0;
  const completedTimes = [];
  let bestSolveSeconds = null;
  let bestSolveProblemName = null;

  for (const { problemName, session } of sessions) {
    const attempts = session.attempts || [];
    for (const attempt of attempts) {
      totalPracticeSeconds += attempt.totalSeconds || 0;
      if (attempt.completed) {
        completedTimes.push(attempt.totalSeconds || 0);
        if (bestSolveSeconds === null || attempt.totalSeconds < bestSolveSeconds) {
          bestSolveSeconds = attempt.totalSeconds;
          bestSolveProblemName = problemName;
        }
      }
    }
    if (attempts.some((a) => a.completed)) {
      problemsCompleted++;
    }
  }

  const averageSolveSeconds =
    completedTimes.length > 0
      ? Math.round(
          completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length
        )
      : null;

  const currentStreakDays = computeStreak(sessions);

  return {
    totalPracticeSeconds,
    problemsAttempted,
    problemsCompleted,
    averageSolveSeconds,
    bestSolveSeconds,
    bestSolveProblemName,
    currentStreakDays,
  };
}

/**
 * Computes per-problem stats from a session object.
 */
function computeProblemStats(problemName, session) {
  const attempts = session.attempts || [];
  const completions = attempts.filter((a) => a.completed).length;
  const completedAttempts = attempts.filter((a) => a.completed);

  const completedTimes = completedAttempts.map((a) => a.totalSeconds || 0);
  const bestTimeSeconds =
    completedTimes.length > 0 ? Math.min(...completedTimes) : null;
  const averageTimeSeconds =
    completedTimes.length > 0
      ? Math.round(completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length)
      : null;

  const lastAttemptedDate =
    attempts.length > 0 ? attempts[attempts.length - 1].date : null;

  const attemptHistory = attempts.map((a) => ({
    date: a.date,
    totalSeconds: a.totalSeconds || 0,
    completed: !!a.completed,
    wasCountdown: !!a.wasCountdown,
    countdownSeconds: a.countdownSeconds || null,
  }));

  // Best splits from the fastest completed attempt
  let bestSplits = null;
  if (bestTimeSeconds !== null) {
    const bestAttempt = completedAttempts.find(
      (a) => (a.totalSeconds || 0) === bestTimeSeconds
    );
    if (bestAttempt && bestAttempt.splits && bestAttempt.splits.length > 0) {
      bestSplits = bestAttempt.splits;
    }
  }

  return {
    attempts: attempts.length,
    completions,
    bestTimeSeconds,
    averageTimeSeconds,
    lastAttemptedDate,
    attemptHistory,
    bestSplits,
  };
}

/**
 * Computes consecutive calendar days streak ending today or yesterday.
 */
function computeStreak(sessions) {
  const daySet = new Set();

  for (const { session } of sessions) {
    const attempts = session.attempts || [];
    for (const attempt of attempts) {
      if (attempt.date) {
        const d = new Date(attempt.date);
        // Local date string YYYY-MM-DD
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        daySet.add(key);
      }
    }
  }

  if (daySet.size === 0) return 0;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Start from today or yesterday
  let current = new Date(today);
  if (!daySet.has(todayKey)) {
    current.setDate(current.getDate() - 1);
    const yesterdayKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    if (!daySet.has(yesterdayKey)) return 0;
  }

  let streak = 0;
  while (true) {
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    if (daySet.has(key)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Formats raw seconds as "MM:SS" (under an hour) or "H:MM:SS" (over).
 */
function formatSeconds(seconds) {
  if (seconds == null) return "--:--";
  const s = Math.abs(Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const sign = seconds < 0 ? "-" : "";
  if (hrs > 0) {
    return `${sign}${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${sign}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Formats seconds as verbose "Xh Ym" for stats display.
 */
function formatSecondsVerbose(seconds) {
  if (seconds == null) return "--";
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${s}s`;
}

/**
 * Writes session data to workspace/<name>/session.json asynchronously.
 * Skips if a write is already pending to avoid queuing.
 */
function writeSession(problemName, sessionData, rootDir) {
  if (_writePending) return Promise.resolve();
  _writePending = true;
  const p = sessionPath(problemName, rootDir);
  return fs.promises
    .writeFile(p, JSON.stringify(sessionData, null, 2), "utf8")
    .finally(() => {
      _writePending = false;
    });
}

/**
 * Writes session data synchronously (for exit/SIGINT handlers).
 */
function writeSessionSync(problemName, sessionData, rootDir) {
  const p = sessionPath(problemName, rootDir);
  fs.writeFileSync(p, JSON.stringify(sessionData, null, 2), "utf8");
}

/**
 * Resets the write-pending flag. For testing only.
 */
function _resetWriteState() {
  _writePending = false;
}

module.exports = {
  sessionPath,
  loadSession,
  readAllSessions,
  computeGlobalStats,
  computeProblemStats,
  formatSeconds,
  formatSecondsVerbose,
  writeSession,
  writeSessionSync,
  _resetWriteState,
};
