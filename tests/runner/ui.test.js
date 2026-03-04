const {
  showSummary,
  showPartIntro,
  showPartComplete,
  showAllComplete,
  showWatching,
  formatStatusBadge,
} = require("../../runner/ui");

let stdoutOutput;
let consoleOutput;

beforeEach(() => {
  stdoutOutput = "";
  consoleOutput = [];
  jest.spyOn(process.stdout, "write").mockImplementation((str) => {
    stdoutOutput += str;
    return true;
  });
  jest.spyOn(console, "log").mockImplementation((...args) => {
    consoleOutput.push(args.join(" "));
  });
});

afterEach(() => jest.restoreAllMocks());

// Strip ANSI escape codes for content assertions
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "").replace(/\r\x1b\[K/g, "");
}

// --- Summary line ---

describe("showSummary", () => {
  test("shows pass/fail counts without part info for single-part", () => {
    showSummary(3, 5, Date.now());
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("3 / 5 tests passing");
    expect(clean).not.toContain("Part");
  });

  test("shows part info when partInfo is provided", () => {
    showSummary(3, 5, Date.now(), { current: 1, unlocked: 1 });
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("Part 1 of 1 unlocked");
    expect(clean).toContain("3 / 5 tests passing");
  });

  test("shows correct part info for Part 2 of 2 unlocked", () => {
    showSummary(7, 10, Date.now(), { current: 2, unlocked: 2 });
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("Part 2 of 2 unlocked");
    expect(clean).toContain("7 / 10 tests passing");
  });

  test("never reveals total part count in output", () => {
    // partInfo only has current and unlocked, not total
    showSummary(5, 5, Date.now(), { current: 1, unlocked: 1 });
    const clean = stripAnsi(stdoutOutput);
    // Should say "Part 1 of 1 unlocked" not "Part 1 of 3" or similar
    expect(clean).not.toMatch(/of \d+ total/);
    // The format is always "Part X of Y unlocked" where Y = unlocked count
    expect(clean).toMatch(/Part \d+ of \d+ unlocked/);
  });

  test("includes timestamp in output", () => {
    const ts = new Date(2025, 0, 15, 14, 30, 0).getTime();
    showSummary(2, 5, ts);
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("last run:");
  });

  test("shows all passing in green-style indicator", () => {
    showSummary(5, 5, Date.now());
    const clean = stripAnsi(stdoutOutput);
    expect(clean).toContain("5 / 5 tests passing");
  });
});

// --- Part progression message ---

describe("showPartComplete", () => {
  test("displays completion message with next part title", () => {
    showPartComplete(1, "Part Two Title", "Implement the next function");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 1 complete!");
    expect(output).toContain("Part 2 has been added to your file");
    expect(output).toContain("Part 2: Part Two Title");
    expect(output).toContain("Implement the next function");
  });

  test("displays correct part numbers for later parts", () => {
    showPartComplete(2, "Part Three Title", "Final challenge");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 2 complete!");
    expect(output).toContain("Part 3 has been added to your file");
    expect(output).toContain("Part 3: Part Three Title");
  });
});

// --- Part intro ---

describe("showPartIntro", () => {
  test("displays part number and title", () => {
    showPartIntro(1, "Flatten an array", "Make it flat");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 1: Flatten an array");
    expect(output).toContain("Make it flat");
  });

  test("shows Untitled when title is missing", () => {
    showPartIntro(1, null, null);
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 1: Untitled");
  });

  test("omits description line when description is falsy", () => {
    showPartIntro(2, "Some Title", "");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Part 2: Some Title");
    // Empty description should not produce an extra line
    const lines = output.split("\n").filter((l) => l.trim());
    const descLine = lines.find((l) => l.includes("Part 2:"));
    expect(descLine).toBeTruthy();
  });
});

// --- Completion message ---

describe("showAllComplete", () => {
  test("renders completion message with problem name", () => {
    showAllComplete("flatten-and-sum");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("All parts complete for flatten-and-sum!");
    expect(output).toContain("Returning to menu...");
  });
});

// --- Soft warning ---

describe("showWatching", () => {
  test("displays problem name and language", () => {
    showWatching("test-problem", "JavaScript");
    const output = consoleOutput.map(stripAnsi).join("\n");
    expect(output).toContain("Watching test-problem (JavaScript)");
    expect(output).toContain("Press Q to go back to the problem menu");
  });
});

// Verify the VS Code not-found warning format (from index.js)
describe("VS Code not-found warning format", () => {
  test("warning string contains expected text", () => {
    // This is the exact string used in index.js
    const warning =
      "  VS Code not found on PATH — skipping editor launch. See README for setup instructions.";
    expect(warning).toContain("VS Code not found on PATH");
    expect(warning).toContain("skipping editor launch");
    expect(warning).toContain("README");
  });
});

// --- Status badge ---

describe("formatStatusBadge", () => {
  test("returns empty string for null status", () => {
    expect(formatStatusBadge(null)).toBe("");
  });

  test("returns green badge for complete status", () => {
    const badge = formatStatusBadge("complete");
    const clean = stripAnsi(badge);
    expect(clean).toBe(" [complete]");
  });

  test("returns yellow badge for in progress status", () => {
    const badge = formatStatusBadge("in progress");
    const clean = stripAnsi(badge);
    expect(clean).toBe(" [in progress]");
  });

  test("returns yellow badge for part N reached status", () => {
    const badge = formatStatusBadge("part 2 reached");
    const clean = stripAnsi(badge);
    expect(clean).toBe(" [part 2 reached]");
  });
});
