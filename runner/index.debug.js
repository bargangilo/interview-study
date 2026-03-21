/**
 * Debug mode entry point.
 * Initializes logging and crash hooks before loading the app.
 * Use via: yarn start:debug
 */

process.env.HANDWRITTEN_DEBUG = "1";

import path from "path";
import { fileURLToPath } from "url";
import { initLog, initCrashHook } from "./debug.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

initLog(rootDir);
initCrashHook(rootDir);

// Now load the app — crash hook is active, log is open
await import("./index.js");
