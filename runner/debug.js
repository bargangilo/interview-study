/**
 * Debug instrumentation module.
 * Only loaded when HANDWRITTEN_DEBUG=1 is set.
 * All output goes to .debug/ — never writes to stdout or stderr.
 */

import fs from "fs";
import path from "path";

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const TRUNCATE_LIMIT = 200;
const OMIT_KEYS = new Set(["jestJson", "pytestStdout"]);

let logStream = null;
let debugDir = null;

/**
 * Initializes the debug log system.
 * Creates .debug/ if needed, handles log rotation, opens the write stream.
 */
export function initLog(rootDir) {
  debugDir = path.join(rootDir, ".debug");
  fs.mkdirSync(debugDir, { recursive: true });

  const logPath = path.join(debugDir, "session.log");

  // Rotate if log exceeds size limit
  try {
    const stat = fs.statSync(logPath);
    if (stat.size > MAX_LOG_SIZE) {
      fs.renameSync(logPath, logPath + ".bak");
    }
  } catch {
    // File doesn't exist yet — no rotation needed
  }

  logStream = fs.createWriteStream(logPath, { flags: "a" });

  logLine(`=== DEBUG SESSION START: ${new Date().toISOString()} === Node: ${process.version}`);
}

/**
 * Appends a line to the session log.
 */
export function logLine(str) {
  if (logStream) {
    logStream.write(str + "\n");
  }
}

/**
 * Summarizes an action's payload for logging.
 * Omits large fields (jestJson, pytestStdout) and truncates long strings.
 */
function summarizePayload(action) {
  const summary = {};
  for (const [key, value] of Object.entries(action)) {
    if (key === "type") continue;
    if (OMIT_KEYS.has(key)) {
      summary[key] = "[omitted]";
    } else if (typeof value === "string" && value.length > TRUNCATE_LIMIT) {
      summary[key] = value.slice(0, TRUNCATE_LIMIT) + "\u2026";
    } else if (value !== null && typeof value === "object") {
      // Shallow summarize nested objects — omit large fields within payload too
      const nested = {};
      for (const [k, v] of Object.entries(value)) {
        if (OMIT_KEYS.has(k)) {
          nested[k] = "[omitted]";
        } else if (typeof v === "string" && v.length > TRUNCATE_LIMIT) {
          nested[k] = v.slice(0, TRUNCATE_LIMIT) + "\u2026";
        } else {
          nested[k] = v;
        }
      }
      summary[key] = nested;
    } else {
      summary[key] = value;
    }
  }
  return summary;
}

/**
 * Logs a dispatch action with timestamp and summarized payload.
 */
export function logDispatch(action) {
  logLine(JSON.stringify({
    t: new Date().toISOString(),
    type: action.type,
    ...summarizePayload(action),
  }));
}

/**
 * React.Profiler onRender callback.
 * Logs every commit-phase render with duration.
 */
export function onRender(id, phase, actualDuration) {
  logLine(JSON.stringify({
    t: new Date().toISOString(),
    type: "RENDER",
    phase,
    ms: Math.round(actualDuration * 100) / 100,
  }));
}

/**
 * Registers process-level crash handlers.
 * Uses synchronous I/O — async writes may not complete during a stack overflow.
 */
export function initCrashHook(rootDir) {
  const dir = rootDir ? path.join(rootDir, ".debug") : debugDir;

  function writeCrash(label, error) {
    const timestamp = new Date().toISOString();
    const stack = error?.stack || String(error);
    const crashContent = `=== ${label}: ${timestamp} ===\n${stack}\n\n`;

    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "crash.log"), crashContent);
    } catch {
      // Last resort — nothing we can do
    }

    // Also append to session.log via sync write (stream may not flush)
    try {
      fs.appendFileSync(
        path.join(dir, "session.log"),
        `\n{"t":"${timestamp}","type":"CRASH","label":"${label}","error":${JSON.stringify(stack)}}\n`
      );
    } catch {
      // Best effort
    }
  }

  process.on("uncaughtException", (error) => {
    writeCrash("UNCAUGHT_EXCEPTION", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    writeCrash("UNHANDLED_REJECTION", reason);
    process.exit(1);
  });
}
