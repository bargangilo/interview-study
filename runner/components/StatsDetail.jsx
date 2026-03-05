import React, { useMemo } from "react";
import { Text, useInput } from "ink";
import { Action } from "../state.js";
import { formatProblemStats } from "../format.js";
import { computeProblemStats } from "../stats.js";

export default function StatsDetail({ dispatch, problemName, session, problems }) {
  useInput(() => {
    dispatch({ type: Action.BACK });
  });

  const statsText = useMemo(() => {
    const prob = problems.find((p) => p.name === problemName);
    const title = prob ? prob.config.title : problemName;
    const stats = computeProblemStats(problemName, session);
    return formatProblemStats(title, stats);
  }, [problemName, session, problems]);

  return (
    <>
      <Text>{"\n"}{statsText}</Text>
      <Text color="gray">{"  "}[Press any key to go back]</Text>
    </>
  );
}
