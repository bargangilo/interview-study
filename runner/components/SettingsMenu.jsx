import React from "react";
import { Text } from "ink";
import { Select } from "@inkjs/ui";
import { Action } from "../state.js";
import Header from "./Header.jsx";

export default function SettingsMenu({ configSchema, configValues, dispatch }) {
  if (!configSchema) {
    return (
      <>
        <Header title="Settings" />
        <Text color="yellow">{"\n  "}Config schema not found. Agent skills may not be set up yet.</Text>
        <Text color="gray">{"\n  "}Press any key to return.</Text>
      </>
    );
  }

  const options = configSchema.map((section) => ({
    label: section.label,
    value: section.key,
  }));
  options.push({ label: "← Back", value: "__back__" });

  return (
    <>
      <Header title="Settings" />
      <Text color="gray">{"\n  "}Changes are saved immediately when you confirm a field.{"\n"}</Text>
      <Select
        options={options}
        onChange={(value) => {
          if (value === "__back__") {
            dispatch({ type: Action.SETTINGS_BACK });
            return;
          }
          dispatch({ type: Action.SELECT_SETTINGS_SECTION, sectionKey: value });
        }}
      />
    </>
  );
}
