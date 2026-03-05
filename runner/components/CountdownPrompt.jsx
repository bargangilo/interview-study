import React, { useState } from "react";
import { Text } from "ink";
import { TextInput } from "@inkjs/ui";
import { Action } from "../state.js";

export default function CountdownPrompt({ dispatch, expectedMinutes }) {
  const [value, setValue] = useState(
    expectedMinutes ? String(expectedMinutes) : ""
  );

  return (
    <>
      {expectedMinutes ? (
        <Text color="gray">{"  "}Expected time for this problem: {expectedMinutes} minutes</Text>
      ) : null}
      <Text>{"  "}Set a time limit in minutes (leave blank for stopwatch mode):</Text>
      <TextInput
        defaultValue={value}
        onSubmit={(input) => {
          const trimmed = input.trim();
          let countdownSeconds = null;
          if (trimmed !== "") {
            const parsed = parseInt(trimmed, 10);
            if (!isNaN(parsed) && parsed > 0) {
              countdownSeconds = parsed * 60;
            }
          }
          dispatch({
            type: Action.SET_COUNTDOWN,
            countdownSeconds,
          });
        }}
      />
    </>
  );
}
