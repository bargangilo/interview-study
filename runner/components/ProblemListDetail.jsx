import React from "react";
import { Text, useInput } from "ink";
import { Action } from "../state.js";

export default function ProblemListDetail({ dispatch, problem, config, status }) {
  useInput(() => {
    dispatch({ type: Action.BACK });
  });

  const parts = config.parts ? config.parts.length : 1;

  return (
    <>
      <Text bold>{"\n  "}{config.title}</Text>
      <Text color="gray">{"  "}{"─".repeat(config.title.length)}</Text>
      <Text>{"  "}{parts} parts</Text>
      {status ? (
        <Text>
          {"  "}Status: {status === "complete" ? (
            <Text color="green">{status}</Text>
          ) : (
            <Text color="yellow">{status}</Text>
          )}
        </Text>
      ) : null}
      {config.description ? (
        <Text color="gray">{"\n  "}{config.description}</Text>
      ) : null}

      {config.parts ? (
        <>
          <Text>{""}</Text>
          {config.parts.map((part, i) => (
            <React.Fragment key={i}>
              <Text bold>{"  "}Part {i + 1}: {part.title || "Untitled"}</Text>
              {part.description ? <Text>{"    "}{part.description}</Text> : null}
              <Text>{""}</Text>
            </React.Fragment>
          ))}
        </>
      ) : null}

      <Text color="gray">{"  "}[Press any key to go back]</Text>
    </>
  );
}
