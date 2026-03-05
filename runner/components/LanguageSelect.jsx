import React, { useEffect, useMemo } from "react";
import { Text } from "ink";
import { Select } from "@inkjs/ui";
import { Action } from "../state.js";

export default function LanguageSelect({ dispatch, languages, problem, rootDir }) {
  // Auto-select if only one language available
  useEffect(() => {
    if (languages.length === 1) {
      dispatch({
        type: Action.SELECT_LANGUAGE,
        language: languages[0],
        hasExistingSession: false, // app.jsx will check this before dispatching
      });
    }
  }, [languages, dispatch]);

  const options = useMemo(
    () => languages.map((l) => ({ label: l, value: l })),
    [languages]
  );

  if (languages.length === 0) {
    return <Text color="red">{"  "}No main.js or main.py found for "{problem}".</Text>;
  }

  if (languages.length === 1) {
    return <Text color="gray">{"  "}Only {languages[0]} available, auto-selected.</Text>;
  }

  return (
    <>
      <Text>{"  "}Select a language:</Text>
      <Select options={options} onChange={(value) => {
        dispatch({
          type: Action.SELECT_LANGUAGE,
          language: value,
          hasExistingSession: false, // overridden by app.jsx
        });
      }} />
    </>
  );
}
