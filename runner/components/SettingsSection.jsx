import React, { useMemo } from "react";
import { Text } from "ink";
import { Select } from "@inkjs/ui";
import { Action } from "../state.js";
import Header from "./Header.jsx";

function getConfigValue(configValues, fieldKey) {
  const parts = fieldKey.split(".");
  let val = configValues;
  for (const p of parts) {
    if (val == null) return undefined;
    val = val[p];
  }
  return val;
}

function isDependencySatisfied(configValues, dependsOn) {
  if (!dependsOn) return true;
  // Format: "fieldKey: value"
  const [depKey, depVal] = dependsOn.split(":").map((s) => s.trim());
  const actual = getConfigValue(configValues, depKey);
  if (depVal === "true") return actual === true;
  if (depVal === "false") return actual === false;
  return String(actual) === depVal;
}

function formatFieldValue(value, field) {
  if (value === undefined || value === null) return "not set";

  switch (field.type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "range":
    case "minute-range":
      if (Array.isArray(value)) return `${value[0]}–${value[1]}`;
      return String(value);
    case "single-select": {
      const opt = field.options?.find((o) => o.value === value);
      return opt ? opt.label : String(value);
    }
    case "multi-select": {
      if (!Array.isArray(value)) return String(value);
      const labels = value.map((v) => {
        const opt = field.options?.find((o) => o.value === v);
        return opt ? opt.label : v;
      });
      return truncate(labels.join(", "), 60);
    }
    case "integer":
      return String(value);
    case "topic-list":
    case "topic-avoid-list": {
      if (!Array.isArray(value)) return String(value);
      if (value.length === 0) return "none";
      return truncate(value.join(", "), 60);
    }
    default:
      return String(value);
  }
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

export default function SettingsSection({ configSchema, configValues, selectedSection, dispatch }) {
  const section = configSchema.find((s) => s.key === selectedSection);
  if (!section) {
    dispatch({ type: Action.SETTINGS_BACK });
    return null;
  }

  const config = configValues || {};

  const options = useMemo(() => {
    const items = [];
    for (const field of section.fields) {
      if (!isDependencySatisfied(config, field.dependsOn)) continue;
      const value = getConfigValue(config, field.key);
      const formatted = formatFieldValue(value, field);
      items.push({
        label: `${field.label}: ${formatted}`,
        value: field.key,
      });
    }
    items.push({ label: "← Back", value: "__back__" });
    return items;
  }, [section, config]);

  return (
    <>
      <Header title={section.label} />
      <Text color="gray">{"\n  "}{section.description}{"\n"}</Text>
      <Select
        options={options}
        onChange={(value) => {
          if (value === "__back__") {
            dispatch({ type: Action.SETTINGS_BACK });
            return;
          }
          dispatch({ type: Action.SELECT_SETTINGS_FIELD, fieldKey: value });
        }}
      />
    </>
  );
}
