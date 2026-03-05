import React from "react";
import { Text } from "ink";
import { Select } from "@inkjs/ui";
import { Action } from "../state.js";

export default function ResumeOrRestart({ dispatch, problem, language, rootDir, inferCurrentPart, loadSession }) {
  const options = [
    { label: "Resume where you left off", value: "resume" },
    { label: "Restart from scratch", value: "restart" },
  ];

  return (
    <>
      <Text>{"  "}A previous session was found for this problem.</Text>
      <Select
        options={options}
        onChange={(value) => {
          if (value === "resume") {
            const startPart = inferCurrentPart(problem, language, rootDir);
            const resumeData = loadSession(problem, rootDir);
            dispatch({
              type: Action.SELECT_RESUME_RESTART,
              startPart,
              resumeData,
            });
          } else {
            dispatch({
              type: Action.SELECT_RESUME_RESTART,
              startPart: 0,
              resumeData: null,
            });
          }
        }}
      />
    </>
  );
}
