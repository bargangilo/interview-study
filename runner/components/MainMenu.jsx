import React from "react";
import { Text } from "ink";
import { Select } from "@inkjs/ui";
import { Action } from "../state.js";

export default function MainMenu({ dispatch }) {
  const options = [
    { label: "Start a Problem", value: "start" },
    { label: "Problem List", value: "list" },
    { label: "Stats", value: "stats" },
    { label: "Settings", value: "settings" },
    { label: "Clear a Problem", value: "clear" },
    { label: "Export Skills", value: "export_skills" },
    { label: "Exit", value: "exit" },
  ];

  return (
    <>
      <Text bold>{"\n  "}Handwritten</Text>
      <Text color="gray">{"  "}{"─".repeat(15)}</Text>
      <Select
        options={options}
        onChange={(value) => {
          switch (value) {
            case "start":
              dispatch({ type: Action.GO_START });
              break;
            case "list":
              dispatch({ type: Action.GO_LIST });
              break;
            case "stats":
              dispatch({ type: Action.GO_STATS });
              break;
            case "settings":
              dispatch({ type: Action.OPEN_SETTINGS });
              break;
            case "clear":
              dispatch({ type: Action.GO_CLEAR });
              break;
            case "export_skills":
              dispatch({ type: Action.GO_EXPORT_SKILLS });
              break;
            case "exit":
              process.exit(0);
          }
        }}
      />
    </>
  );
}
