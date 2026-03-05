import React from "react";
import { Text } from "ink";
import { formatTimerSegment } from "../format.js";

export default function SummaryLine({ passed, total, timestamp, partInfo, timerDisplay }) {
  const time = new Date(timestamp).toLocaleTimeString();
  const allPassing = passed === total && total > 0;

  return (
    <Text>
      {partInfo ? (
        <Text bold>{"  "}Part {partInfo.current} of {partInfo.unlocked} unlocked{"   "}</Text>
      ) : (
        <Text>{"  "}</Text>
      )}
      <Text color={allPassing ? "green" : "yellow"}>✔ {passed} / {total} tests passing</Text>
      <Text color="gray">{"   "}[last run: {time}]</Text>
      {timerDisplay ? <Text>{"  "}{formatTimerSegment(timerDisplay)}</Text> : null}
    </Text>
  );
}
