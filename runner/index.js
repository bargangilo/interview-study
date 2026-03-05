import React from "react";
import { render } from "ink";
import { fileURLToPath } from "url";
import path from "path";
import App from "./app.jsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const { waitUntilExit } = render(React.createElement(App, { rootDir: ROOT_DIR }));
await waitUntilExit();
process.exit(0);
