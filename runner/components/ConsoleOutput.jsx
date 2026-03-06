import React from "react";
import { Text } from "ink";

function formatTime(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ConsoleOutput({ lines, visible, lastRunAt, testFailures }) {
  const hasRunOutput = visible && lines && lines.length > 0;
  const hasFailures = testFailures && testFailures.length > 0;

  if (!hasRunOutput && !hasFailures) return null;

  const timeStr = formatTime(lastRunAt);
  const headerText = timeStr
    ? `\u2500\u2500\u2500 Run Output \u2500\u2500 ran ${timeStr} `
    : "\u2500\u2500\u2500 Run Output ";
  const pad = Math.max(0, 55 - headerText.length);
  const header = headerText + "\u2500".repeat(pad);
  const border = "\u2500".repeat(55);

  return (
    <>
      {hasRunOutput ? (
        <>
          <Text dimColor>{"  "}{header}</Text>
          {lines.map((item, i) => {
            switch (item.type) {
              case "result":
                if (item.passed === true) {
                  return (
                    <Text key={i}>
                      {"  "}<Text dimColor>[{item.label}]</Text> <Text color="green">{"\u2714"}</Text>{"  "}{item.actual}
                    </Text>
                  );
                }
                if (item.passed === false) {
                  return (
                    <Text key={i}>
                      {"  "}<Text dimColor>[{item.label}]</Text> <Text color="red">{"\u2718"}</Text>{"  "}
                      <Text color="red">{item.actual}</Text>
                      {item.expected ? <Text dimColor>{"  "}expected: {item.expected}</Text> : null}
                    </Text>
                  );
                }
                // passed: null — no expected
                return (
                  <Text key={i}>
                    {"  "}<Text dimColor>[{item.label}]</Text>{"  "}{item.actual}
                  </Text>
                );

              case "log":
                return <Text key={i} dimColor>{"  "}{"\u00B7"} {item.content}</Text>;

              case "error":
                return (
                  <Text key={i} color="yellow">
                    {"  "}[{item.label}] {"\u2718"}{"  "}{item.content}
                  </Text>
                );

              case "stderr":
                return <Text key={i} color="red">{"  "}{item.content}</Text>;

              case "timeout":
                return <Text key={i} color="yellow">{"  "}{"\u23F8"}{"  "}Timed out after 20s {"\u2014"} check for infinite loops</Text>;

              case "crashed":
                return <Text key={i} color="red">{"  "}{"\u2716"}{"  "}Run process crashed {"\u2014"} check for syntax errors</Text>;

              case "skipped":
                return <Text key={i} dimColor>{"  "}No run inputs defined for this problem</Text>;

              default:
                return <Text key={i} dimColor>{"  "}{item.content || ""}</Text>;
            }
          })}
          {!hasFailures ? <Text dimColor>{"  "}{border}</Text> : null}
        </>
      ) : null}

      {hasFailures ? (
        <>
          {hasRunOutput ? (
            <Text dimColor>{"  "}{"\u00B7 ".repeat(28).trim()}</Text>
          ) : null}
          <Text dimColor>{"  "}{"\u2500\u2500\u2500 Test Failures "}{"\u2500".repeat(40)}</Text>
          {testFailures.map((failure, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <Text>{" "}</Text> : null}
              <Text>{"  "}<Text color="red">{"\u2718"}</Text>{"  "}{failure.name}</Text>
              {failure.input != null ? (
                <Text dimColor>{"     "}{failure.input}</Text>
              ) : null}
              {failure.expected != null ? (
                <Text>{"     "}<Text dimColor>expected:</Text> <Text color="green">{" "}{failure.expected}</Text></Text>
              ) : null}
              {failure.received != null ? (
                <Text>{"     "}<Text dimColor>received:</Text> <Text color="red">{" "}{failure.received}</Text></Text>
              ) : null}
            </React.Fragment>
          ))}
          <Text dimColor>{"  "}{border}</Text>
        </>
      ) : null}
    </>
  );
}
