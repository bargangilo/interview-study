import React, { useState } from "react";
import { Text } from "ink";
import { Select, TextInput, MultiSelect } from "@inkjs/ui";
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

function setConfigValue(configValues, fieldKey, newValue) {
  const result = { ...configValues };
  const parts = fieldKey.split(".");
  if (parts.length === 1) {
    result[parts[0]] = newValue;
    return result;
  }
  // Deep clone and set nested value
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    current[parts[i]] = { ...current[parts[i]] };
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = newValue;
  return result;
}

function formatCurrentValue(value, field) {
  if (value === undefined || value === null) return "not set";
  switch (field.type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "range":
    case "minute-range":
      return Array.isArray(value) ? `${value[0]}-${value[1]}` : String(value);
    case "single-select": {
      const opt = field.options?.find((o) => o.value === value);
      return opt ? opt.label : String(value);
    }
    case "multi-select":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "integer":
      return String(value);
    case "topic-list":
    case "topic-avoid-list":
      return Array.isArray(value) ? value.join(", ") : String(value);
    default:
      return String(value);
  }
}

function deduplicateTopics(configValues) {
  const include = configValues.topics?.include || [];
  const avoid = configValues.topics?.avoid || [];
  if (avoid.length === 0) return configValues;
  const avoidSet = new Set(avoid.map((t) => t.toLowerCase()));
  const filtered = include.filter((t) => !avoidSet.has(t.toLowerCase()));
  return {
    ...configValues,
    topics: { ...configValues.topics, include: filtered },
  };
}

export default function SettingsEditField({ configSchema, configValues, selectedSection, selectedField, dispatch }) {
  const section = configSchema.find((s) => s.key === selectedSection);
  const field = section?.fields.find((f) => f.key === selectedField);

  if (!field) {
    dispatch({ type: Action.SETTINGS_BACK });
    return null;
  }

  const config = configValues || {};
  const currentValue = getConfigValue(config, field.key);

  function save(newValue) {
    let updated = setConfigValue(config, field.key, newValue);
    if (field.type === "topic-avoid-list") {
      updated = deduplicateTopics(updated);
    }
    dispatch({ type: Action.SETTINGS_FIELD_SAVED, configValues: updated });
  }

  return (
    <>
      <Header title={field.label} />
      <Text color="gray">{"\n  "}{field.description}{"\n"}</Text>
      <Text>{"  "}Current value: {formatCurrentValue(currentValue, field)}{"\n"}</Text>
      <FieldEditor field={field} currentValue={currentValue} onSave={save} dispatch={dispatch} />
    </>
  );
}

function FieldEditor({ field, currentValue, onSave, dispatch }) {
  switch (field.type) {
    case "single-select":
      return <SingleSelectEditor field={field} currentValue={currentValue} onSave={onSave} dispatch={dispatch} />;
    case "boolean":
      return <BooleanEditor field={field} currentValue={currentValue} onSave={onSave} dispatch={dispatch} />;
    case "multi-select":
      return <MultiSelectEditor field={field} currentValue={currentValue} onSave={onSave} dispatch={dispatch} />;
    case "range":
    case "minute-range":
      return <RangeEditor field={field} currentValue={currentValue} onSave={onSave} dispatch={dispatch} />;
    case "integer":
      return <IntegerEditor field={field} currentValue={currentValue} onSave={onSave} dispatch={dispatch} />;
    case "topic-list":
    case "topic-avoid-list":
      return <TopicEditor field={field} currentValue={currentValue} onSave={onSave} dispatch={dispatch} />;
    default:
      return <Text color="red">{"  "}Unknown field type: {field.type}</Text>;
  }
}

function SingleSelectEditor({ field, currentValue, onSave, dispatch }) {
  const options = field.options.map((opt) => {
    let label = opt.label;
    if (opt.value === currentValue) label += " (current)";
    else if (field.recommended === opt.value) label += " (recommended)";
    return { label, value: opt.value };
  });
  options.push({ label: "← Cancel", value: "__cancel__" });

  return (
    <Select
      options={options}
      onChange={(value) => {
        if (value === "__cancel__") {
          dispatch({ type: Action.SETTINGS_BACK });
          return;
        }
        onSave(value);
      }}
    />
  );
}

function BooleanEditor({ field, currentValue, onSave, dispatch }) {
  const recTrue = field.recommended === "true" || field.recommended === true;
  const options = [
    {
      label: "Yes" + (currentValue === true ? " (current)" : recTrue ? " (recommended)" : ""),
      value: true,
    },
    {
      label: "No" + (currentValue === false ? " (current)" : !recTrue ? " (recommended)" : ""),
      value: false,
    },
    { label: "← Cancel", value: "__cancel__" },
  ];

  return (
    <Select
      options={options}
      onChange={(value) => {
        if (value === "__cancel__") {
          dispatch({ type: Action.SETTINGS_BACK });
          return;
        }
        onSave(value);
      }}
    />
  );
}

function MultiSelectEditor({ field, currentValue, onSave, dispatch }) {
  const currentArr = Array.isArray(currentValue) ? currentValue : [];
  const options = field.options.map((opt) => ({
    label: opt.label,
    value: opt.value,
  }));

  return (
    <>
      <MultiSelect
        options={options}
        defaultValue={currentArr}
        onSubmit={(values) => {
          if (values.length === 0) return;
          onSave(values);
        }}
      />
      <Text color="gray">{"  "}Use space to toggle, enter to confirm. Press Escape to cancel.</Text>
    </>
  );
}

function RangeEditor({ field, currentValue, onSave, dispatch }) {
  const [error, setError] = useState("");
  const defaultVal = Array.isArray(currentValue)
    ? `${currentValue[0]}-${currentValue[1]}`
    : "";

  return (
    <>
      <Text>{"  "}Enter range ({field.min}–{field.max}), e.g. "{field.min}-{field.max}":</Text>
      <TextInput
        defaultValue={defaultVal}
        onSubmit={(input) => {
          const trimmed = input.trim();
          if (trimmed === "") {
            dispatch({ type: Action.SETTINGS_BACK });
            return;
          }
          const match = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)$/);
          if (!match) {
            setError("Enter two numbers separated by a hyphen, e.g. \"1-3\"");
            return;
          }
          const low = parseInt(match[1], 10);
          const high = parseInt(match[2], 10);
          if (low < field.min || high > field.max) {
            setError(`Values must be between ${field.min} and ${field.max}`);
            return;
          }
          if (low > high) {
            setError("First number must be less than or equal to the second");
            return;
          }
          onSave([low, high]);
        }}
      />
      {error ? <Text color="red">{"  "}{error}</Text> : null}
      <Text color="gray">{"\n  "}Leave blank and press enter to cancel.</Text>
    </>
  );
}

function IntegerEditor({ field, currentValue, onSave, dispatch }) {
  const [error, setError] = useState("");
  const defaultVal = currentValue != null ? String(currentValue) : "";
  const recStr = field.recommended ? ` (recommended: ${field.recommended})` : "";

  return (
    <>
      <Text>{"  "}Enter a number ({field.min}–{field.max}){recStr}:</Text>
      <TextInput
        defaultValue={defaultVal}
        onSubmit={(input) => {
          const trimmed = input.trim();
          if (trimmed === "") {
            dispatch({ type: Action.SETTINGS_BACK });
            return;
          }
          const num = parseInt(trimmed, 10);
          if (isNaN(num)) {
            setError("Enter a valid number");
            return;
          }
          if (num < field.min || num > field.max) {
            setError(`Must be between ${field.min} and ${field.max}`);
            return;
          }
          onSave(num);
        }}
      />
      {error ? <Text color="red">{"  "}{error}</Text> : null}
      <Text color="gray">{"\n  "}Leave blank and press enter to cancel.</Text>
    </>
  );
}

function TopicEditor({ field, currentValue, onSave, dispatch }) {
  const currentArr = Array.isArray(currentValue) ? currentValue : [];
  const defaultVal = currentArr.join(", ");

  return (
    <>
      <Text>{"  "}Enter topics separated by commas:</Text>
      <TextInput
        defaultValue={defaultVal}
        onSubmit={(input) => {
          const trimmed = input.trim();
          if (trimmed === "") {
            if (field.type === "topic-avoid-list") {
              onSave([]);
              return;
            }
            dispatch({ type: Action.SETTINGS_BACK });
            return;
          }
          const topics = trimmed
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
          onSave(topics);
        }}
      />
      <Text color="gray">{"\n  "}Leave blank and press enter to {field.type === "topic-avoid-list" ? "clear the list" : "cancel"}.</Text>
    </>
  );
}
