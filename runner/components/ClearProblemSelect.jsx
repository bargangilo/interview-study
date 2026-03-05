import React, { useMemo } from "react";
import { Text, useInput } from "ink";
import { Select } from "@inkjs/ui";
import { Action } from "../state.js";

export default function ClearProblemSelect({ dispatch, problems }) {
  if (problems.length === 0) {
    return <ClearEmpty dispatch={dispatch} />;
  }

  const options = useMemo(() => {
    const items = problems.map(({ name, config, statusBadge }) => ({
      label: config.title + (statusBadge || ""),
      value: name,
    }));
    items.push({ label: "← Back", value: "__back__" });
    return items;
  }, [problems]);

  return (
    <>
      <Text>{"  "}Select a problem to clear:</Text>
      <Select
        options={options}
        onChange={(value) => {
          if (value === "__back__") {
            dispatch({ type: Action.BACK });
            return;
          }
          const p = problems.find((pr) => pr.name === value);
          dispatch({
            type: Action.SELECT_CLEAR_PROBLEM,
            problem: value,
            config: p.config,
          });
        }}
      />
    </>
  );
}

function ClearEmpty({ dispatch }) {
  useInput(() => {
    dispatch({ type: Action.BACK });
  });
  return (
    <>
      <Text color="gray">{"\n  "}No problem workspaces found. Start a problem first.{"\n"}</Text>
      <Text color="gray">{"  "}[Press any key to go back]</Text>
    </>
  );
}
