import React from "react";
import { Text } from "ink";

const MAX_LINES = 10;

function colorForLabel(line) {
  if (line.startsWith("[error]") || line.startsWith("[warn]")) return "yellow";
  return undefined;
}

export default function ConsoleOutput({ lines, visible }) {
  if (!visible) return null;

  const border = "\u2500".repeat(55);
  const header = `\u2500\u2500\u2500 Console Output ${"─".repeat(39)}`;

  let displayLines = lines || [];
  let truncated = false;
  if (displayLines.length > MAX_LINES) {
    truncated = true;
    displayLines = displayLines.slice(-MAX_LINES);
  }

  return (
    <>
      <Text dimColor>{"  "}{header}</Text>
      {truncated ? (
        <Text dimColor>{"  "}[showing last {MAX_LINES} of {lines.length} lines]</Text>
      ) : null}
      {displayLines.length === 0 ? (
        <Text dimColor>{"  "}no console output</Text>
      ) : (
        displayLines.map((line, i) => (
          <Text key={i} color={colorForLabel(line)}>{"  "}{line}</Text>
        ))
      )}
      <Text dimColor>{"  "}{border}</Text>
    </>
  );
}
