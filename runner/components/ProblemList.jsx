import React, { useMemo } from "react";
import { Text } from "ink";
import { Select } from "@inkjs/ui";
import { Action } from "../state.js";

function truncate(str, max) {
  if (!str) return "";
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

export default function ProblemList({ dispatch, problems }) {
  const options = useMemo(() => {
    const items = problems.map(({ name, config, statusBadge }) => {
      const parts = config.parts ? `${config.parts.length} parts` : "1 part";
      return {
        label: config.title + (statusBadge || ""),
        value: name,
      };
    });
    items.push({ label: "← Back", value: "__back__" });
    return items;
  }, [problems]);

  if (problems.length === 0) {
    return <Text color="red">{"  "}No problems found in problems/ directory.</Text>;
  }

  return (
    <>
      <Text>{"  "}Browse problems:</Text>
      <Select
        options={options}
        onChange={(value) => {
          if (value === "__back__") {
            dispatch({ type: Action.BACK });
            return;
          }
          const p = problems.find((pr) => pr.name === value);
          dispatch({
            type: Action.VIEW_PROBLEM_DETAIL,
            problem: value,
            config: p.config,
          });
        }}
      />
    </>
  );
}
