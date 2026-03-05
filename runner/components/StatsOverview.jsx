import React, { useMemo } from "react";
import { Text, useInput } from "ink";
import { Select } from "@inkjs/ui";
import { Action } from "../state.js";
import { formatGlobalStats } from "../format.js";
import { computeGlobalStats } from "../stats.js";

export default function StatsOverview({ dispatch, sessions, problems }) {
  if (sessions.length === 0) {
    return <StatsEmpty dispatch={dispatch} />;
  }

  const globalStatsText = useMemo(
    () => formatGlobalStats(computeGlobalStats(sessions)),
    [sessions]
  );

  const options = useMemo(() => {
    const items = sessions.map(({ problemName }) => {
      const prob = problems.find((p) => p.name === problemName);
      const title = prob ? prob.config.title : problemName;
      return { label: title, value: problemName };
    });
    items.push({ label: "← Back", value: "__back__" });
    return items;
  }, [sessions, problems]);

  return (
    <>
      <Text>{"\n"}{globalStatsText}</Text>
      <Text>{"  "}View problem stats:</Text>
      <Select
        options={options}
        onChange={(value) => {
          if (value === "__back__") {
            dispatch({ type: Action.BACK });
            return;
          }
          const { session } = sessions.find((s) => s.problemName === value);
          dispatch({
            type: Action.SELECT_STATS_PROBLEM,
            problemName: value,
            session,
          });
        }}
      />
    </>
  );
}

function StatsEmpty({ dispatch }) {
  useInput(() => {
    dispatch({ type: Action.BACK });
  });
  return (
    <>
      <Text color="gray">{"\n  "}No stats yet — start a problem to begin tracking your progress.{"\n"}</Text>
      <Text color="gray">{"  "}[Press any key to go back]</Text>
    </>
  );
}
