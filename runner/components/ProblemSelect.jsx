import React, { useMemo } from "react";
import { Text } from "ink";
import { Select } from "@inkjs/ui";
import { Action } from "../state.js";

export default function ProblemSelect({ dispatch, problems }) {
  const options = useMemo(() => {
    const items = problems.map(({ name, config, statusBadge }) => ({
      label: config.title + (statusBadge || ""),
      value: name,
    }));
    items.unshift({ label: "← Back", value: "__back__" });
    return items;
  }, [problems]);

  if (problems.length === 0) {
    return <Text color="red">{"  "}No problems found in problems/ directory.</Text>;
  }

  return (
    <>
      <Text>{"  "}Select a problem:{options.length > 10 ? <Text dimColor> (scroll for more)</Text> : ""}</Text>
      <Select
        options={options}
        visibleOptionCount={10}
        onChange={(value) => {
          if (value === "__back__") {
            dispatch({ type: Action.BACK });
            return;
          }
          const p = problems.find((pr) => pr.name === value);
          dispatch({
            type: Action.SELECT_PROBLEM,
            problem: value,
            config: p.config,
            languages: p.languages,
          });
        }}
      />
    </>
  );
}
